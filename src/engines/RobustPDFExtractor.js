// RobustPDFExtractor.js - Using pdfjs-dist for better PDF handling
// Replaces MuPDF with more reliable pdfjs-dist library

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

class RobustPDFExtractor {
  constructor(options = {}) {
    this.options = options;
  }

  async extract(pdfBuffer) {
    let text = '';
    let warnings = [];
    let extractionQuality = 0;
    let sectionsFound = [];
    let composition = [];
    let productName = 'Unknown Product';
    let physicalState = 'unknown';

    try {
      // Configure worker for pdfjs-dist - use a URL that works with Vite
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
      }
      
      // Extract text using pdfjs-dist (convert Buffer to Uint8Array)
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjs.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      
      let allText = '';
      const numPages = pdf.numPages;
      console.log(`📄 PDF has ${numPages} pages`);
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        allText += pageText + '\n';
      }
      
      text = allText;
      console.log(`📄 Extracted ${text.length} characters from PDF`);
      console.log(`📄 Sample text (first 500 chars):`, text.substring(0, 500));
      
      // Extract product name from first lines
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        // Look for product name in first 10 lines
        for (let i = 0; i < Math.min(10, lines.length); i++) {
          const line = lines[i].trim();
          // Skip common headers
          if (!/safety data sheet|sds|msds|section/i.test(line) && line.length > 3 && line.length < 100) {
            productName = line;
            break;
          }
        }
      }
      
    } catch (err) {
      warnings.push('PDF parsing failed: ' + err.message);
      console.error('💥 PDF extraction error:', err);
      return { 
        composition: [], 
        extractionQuality: 0, 
        sectionsFound: [], 
        warnings: ['PDF extraction failed - file may be corrupted or in unsupported format'],
        productName: 'Unknown Product',
        physicalState: 'unknown'
      };
    }

    // Find Section 3 (Composition)
    const section3Match = this._findSection3(text);
    if (!section3Match) {
      warnings.push('Section 3 not found - searching entire document');
      // Use entire text if no Section 3 found
      const sectionText = text;
      composition = this._extractChemicals(sectionText);
    } else {
      sectionsFound.push('Section 3');
      composition = this._extractChemicals(section3Match);
    }

    // Find physical state in Section 9
    const section9Match = this._findSection9(text);
    if (section9Match) {
      sectionsFound.push('Section 9');
      physicalState = this._extractPhysicalState(section9Match);
    }

    // Calculate extraction quality
    if (composition.length > 0) {
      extractionQuality = composition.reduce((a, b) => a + b.confidence, 0) / composition.length;
    }

    return {
      composition,
      extractionQuality,
      sectionsFound,
      warnings,
      productName,
      physicalState,
      flashPoint: this._extractFlashPoint(text),
      pH: this._extractPH(text)
    };
  }

  _findSection3(text) {
    // Multiple patterns for Section 3
    const patterns = [
      /section\s*3[:.\s]+.*?composition.*?(?=section\s*\d+[:.\s]|$)/is,
      /(?:^|\n)\s*3[\.\s:]+\s*(?:composition|ingredients?).*?(?=(?:^|\n)\s*\d+[\.\s:]|$)/ims,
      /composition.*?information.*?on.*?ingredients?.*?(?=section\s*\d+|$)/is,
      /hazardous\s+ingredients?.*?(?=section\s*\d+|$)/is,
      /chemical\s+composition.*?(?=section\s*\d+|$)/is
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        console.log(`🔍 Found Section 3 using pattern`);
        return match[0];
      }
    }
    
    // Fallback: find any section with CAS numbers
    const casPattern = /\d{2,7}-\d{2}-\d/;
    if (casPattern.test(text)) {
      console.log('⚠️ Section 3 not clearly marked, but found CAS numbers in document');
      // Return portion of text around CAS numbers
      const firstCAS = text.search(casPattern);
      const start = Math.max(0, firstCAS - 500);
      const end = Math.min(text.length, firstCAS + 2000);
      return text.substring(start, end);
    }
    
    return null;
  }

  _findSection9(text) {
    const patterns = [
      /section\s*9[:.\s]+.*?physical.*?(?=section\s*\d+[:.\s]|$)/is,
      /(?:^|\n)\s*9[\.\s:]+\s*physical.*?(?=(?:^|\n)\s*\d+[\.\s:]|$)/ims
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return null;
  }

  _extractChemicals(sectionText) {
    const chemicals = [];
    const processedCAS = new Set();
    
    // Multiple extraction patterns
    const patterns = [
      // Pattern 1: Chemical Name followed by CAS and percentage
      /([A-Za-z][A-Za-z0-9\-\s(),.]{2,60})\s+(\d{2,7}-\d{2}-\d)\s+([\d.\-]+\s*(?:-\s*[\d.]+)?\s*%?)/g,
      
      // Pattern 2: Chemical Name (CAS) percentage
      /([A-Za-z][A-Za-z0-9\-\s(),.]{2,60})\s*\((\d{2,7}-\d{2}-\d)\)\s*([\d.\-]+\s*(?:-\s*[\d.]+)?\s*%?)/g,
      
      // Pattern 3: CAS Number followed by Chemical Name and percentage
      /(\d{2,7}-\d{2}-\d)\s+([A-Za-z][A-Za-z0-9\-\s(),.]{2,60})\s+([\d.\-]+\s*(?:-\s*[\d.]+)?\s*%?)/g,
      
      // Pattern 4: Table format with tabs or multiple spaces
      /([A-Za-z][A-Za-z0-9\-\s(),.]{2,60})[\t\s]{2,}(\d{2,7}-\d{2}-\d)[\t\s]{2,}([\d.\-]+\s*(?:-\s*[\d.]+)?\s*%?)/g,
      
      // Pattern 5: Chemical name with CAS: prefix
      /([A-Za-z][A-Za-z0-9\-\s(),.]{2,60})\s*CAS:\s*(\d{2,7}-\d{2}-\d)[^\d]*([\d.\-]+\s*(?:-\s*[\d.]+)?\s*%?)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(sectionText)) !== null) {
        let name, cas, percentage;
        
        // Handle different capture group orders
        if (/^\d{2,7}-\d{2}-\d$/.test(match[1])) {
          // CAS first pattern
          cas = match[1];
          name = match[2];
          percentage = match[3];
        } else {
          // Name first pattern
          name = match[1];
          cas = match[2];
          percentage = match[3];
        }
        
        // Clean and validate
        name = name.trim().replace(/\s+/g, ' ');
        cas = cas.trim();
        percentage = percentage.trim();
        
        // Skip if already processed this CAS
        if (processedCAS.has(cas)) continue;
        
        // Validate the extraction
        if (this._isValidChemical(name, cas, percentage)) {
          chemicals.push({
            name: name,
            cas: cas,
            percentage: percentage || 'Not specified',
            sourcePattern: 'pattern',
            confidence: 0.85
          });
          processedCAS.add(cas);
        }
      }
    }
    
    // If no chemicals found, try more lenient patterns
    if (chemicals.length === 0) {
      console.log('⚠️ No chemicals found with strict patterns, trying lenient extraction');
      const lenientPattern = /(\d{2,7}-\d{2}-\d)/g;
      let match;
      while ((match = lenientPattern.exec(sectionText)) !== null) {
        const cas = match[1];
        if (processedCAS.has(cas)) continue;
        
        // Try to find chemical name near the CAS
        const context = sectionText.substring(
          Math.max(0, match.index - 100),
          Math.min(sectionText.length, match.index + 100)
        );
        
        // Extract likely chemical name
        const nameMatch = context.match(/([A-Za-z][A-Za-z0-9\-\s(),.]{2,40})\s*(?=\d{2,7}-\d{2}-\d)/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unknown Chemical';
        
        chemicals.push({
          name: name,
          cas: cas,
          percentage: 'Not specified',
          sourcePattern: 'lenient',
          confidence: 0.6
        });
        processedCAS.add(cas);
      }
    }
    
    console.log(`🧪 Extracted ${chemicals.length} chemicals`);
    return chemicals;
  }

  _isValidChemical(name, cas, percentage) {
    // Validate name
    if (!name || name.length < 2 || name.length > 100) return false;
    if (/^[\d\s\-.,()%]+$/.test(name)) return false; // Just numbers/symbols
    
    // Validate CAS format
    if (!cas || !/^\d{2,7}-\d{2}-\d$/.test(cas)) return false;
    
    // Don't reject based on percentage - it might be missing
    return true;
  }

  _extractPhysicalState(text) {
    const patterns = [
      /physical\s+state[:\s]+(\w+)/i,
      /form[:\s]+(\w+)/i,
      /appearance[:\s]+(\w+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const state = match[1].toLowerCase();
        if (['liquid', 'solid', 'gas', 'aerosol', 'powder'].includes(state)) {
          return state;
        }
      }
    }
    return 'unknown';
  }

  _extractFlashPoint(text) {
    const patterns = [
      /flash\s+point[:\s]+([\d.\-]+)\s*°?([CF])/i,
      /flammability[:\s]+flash\s+point[:\s]+([\d.\-]+)\s*°?([CF])/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        // Convert to Celsius if needed
        if (unit === 'F') {
          return (value - 32) * 5/9;
        }
        return value;
      }
    }
    return null;
  }

  _extractPH(text) {
    const patterns = [
      /pH[:\s]+([\d.]+)/i,
      /pH\s+value[:\s]+([\d.]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }
}

export default RobustPDFExtractor;