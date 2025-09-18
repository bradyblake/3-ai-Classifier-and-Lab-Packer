// BulletproofSDSExtractor.js
// Extracts chemical names, CAS numbers, and percentages from SDS Section 3 with confidence scoring.
// Core logic for advanced PDF parsing using MuPDF.js (PyMuPDF JavaScript equivalent).

import * as mupdf from 'mupdf';

class BulletproofSDSExtractor {
  constructor(options = {}) {
    this.options = options;
  }

  async extract(pdfBuffer) {
    let text = '';
    let warnings = [];
    let extractionQuality = 0;
    let sectionsFound = [];
    let composition = [];

    // 1. Extract structured data from PDF using MuPDF.js JSON output
    try {
      // Create MuPDF document from buffer
      const doc = mupdf.Document.openDocument(pdfBuffer, "application/pdf");
      
      // Extract structured text as JSON from all pages
      const pageCount = doc.countPages();
      let allText = '';
      let structuredData = [];
      
      for (let i = 0; i < pageCount; i++) {
        const page = doc.loadPage(i);
        
        // Get structured text object
        const structuredText = page.toStructuredText("preserve-whitespace");
        
        // Get plain text using correct API
        const pageText = structuredText.asText();
        allText += pageText + '\n';
        
        // Get structured JSON data for more precise extraction
        try {
          const jsonData = structuredText.asJSON();
          if (jsonData) {
            structuredData.push({
              page: i + 1,
              data: JSON.parse(jsonData)
            });
          }
        } catch (jsonErr) {
          // Fallback to plain text if JSON parsing fails
          warnings.push(`Page ${i + 1}: JSON structure extraction failed, using text fallback - ${jsonErr.message}`);
        }
      }
      
      text = allText;
      this.structuredData = structuredData; // Store for enhanced extraction
      
      // Clean up resources
      doc.destroy();
      
    } catch (err) {
      warnings.push('PDF parsing failed with MuPDF: ' + err.message);
      return { composition, extractionQuality, sectionsFound, warnings };
    }

    // 2. Detect Section 3 (and optionally Section 9 for validation)
    const section3Match = this._findSection3(text);
    if (!section3Match) {
      warnings.push('Section 3 not found');
      return { composition, extractionQuality, sectionsFound, warnings };
    }
    sectionsFound.push('Section 3');
    const sectionText = section3Match;

    // 3. Enhanced multi-pattern extraction with JSON structure analysis
    const patterns = [
      this._extractFromStructuredData, // NEW: JSON-based extraction
      this._extractTablePattern,
      this._extractListPattern,
      this._extractParagraphPattern
    ];
    let allCandidates = [];
    for (const pattern of patterns) {
      const candidates = pattern.call(this, sectionText);
      allCandidates = allCandidates.concat(candidates);
    }

    // 4. Synonym/variation handling (stub)
    // TODO: Implement synonym/variation normalization

    // 5. Validate and score candidates
    composition = allCandidates.map(c => this._scoreCandidate(c));
    if (composition.length > 0) {
      extractionQuality = composition.reduce((a, b) => a + b.confidence, 0) / composition.length;
    }

    // 6. Section 9 detection (optional, for output)
    if (/section\s*9[:.\s]/i.test(text)) {
      sectionsFound.push('Section 9');
    }

    return { composition, extractionQuality, sectionsFound, warnings };
  }

  // --- Section 3 Detection ---
  _findSection3(text) {
    // Multiple patterns for Section 3 detection in real SDS documents
    const patterns = [
      // Standard: "Section 3: Composition/ingredients"
      /section\s*3[:.\s][\s\S]*?(?=section\s*\d+[:.\s]|$)/i,
      
      // Numbered: "3. Composition" or "3 Composition"
      /(?:^|\n)\s*3[\.\s:]\s*(?:composition|ingredients?)[\s\S]*?(?=(?:^|\n)\s*\d+[\.\s:]|$)/im,
      
      // Without section number: "Composition/information on ingredients"
      /(?:composition|ingredients?)[\s\/]*(?:information|data)?[\s\/]*(?:on\s+)?(?:ingredients?|components?)[\s\S]*?(?=(?:^|\n)\s*(?:\d+[\.\s:]|section))/im,
      
      // Alternative formats: "III. Composition" 
      /(?:^|\n)\s*(?:III|3)[\.\s:]\s*(?:composition|ingredients?)[\s\S]*?(?=(?:^|\n)\s*(?:IV|\d+)[\.\s:]|$)/im,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        console.log(`🔍 Found Section 3 using pattern: ${pattern.toString().substring(0, 50)}...`);
        return match[0];
      }
    }
    
    // If no section found, try to extract any composition-related content
    const fallbackPattern = /(?:chemical\s+name|component|ingredient|substance|cas\s+number|concentration|percentage)[\s\S]{50,800}/i;
    const fallbackMatch = text.match(fallbackPattern);
    if (fallbackMatch) {
      console.log(`🔍 Using fallback composition detection`);
      return fallbackMatch[0];
    }
    
    console.log(`⚠️ No Section 3 patterns found in ${text.length} characters of text`);
    console.log(`📄 First 500 chars: ${text.substring(0, 500)}`);
    return null;
  }

  // --- NEW: JSON Structure-Based Extraction ---
  _extractFromStructuredData(sectionText) {
    const candidates = [];
    
    if (!this.structuredData || this.structuredData.length === 0) {
      return candidates;
    }
    
    try {
      // Analyze JSON structured data for table-like patterns
      for (const pageData of this.structuredData) {
        const { data } = pageData;
        
        // Look for structured blocks that might contain composition data
        if (data && data.blocks) {
          for (const block of data.blocks) {
            if (block.lines) {
              for (const line of block.lines) {
                if (line.spans) {
                  // Reconstruct line text from spans
                  const lineText = line.spans.map(span => span.text).join(' ');
                  
                  // Apply enhanced patterns to structured line data
                  const structuredCandidates = this._extractFromStructuredLine(lineText, line);
                  candidates.push(...structuredCandidates);
                }
              }
            }
          }
        }
      }
      
      // Remove duplicates based on CAS number
      const uniqueCandidates = candidates.filter((candidate, index, self) => 
        index === self.findIndex(c => c.cas === candidate.cas)
      );
      
      return uniqueCandidates;
      
    } catch (error) {
      console.warn('JSON structure analysis failed:', error.message);
      return candidates;
    }
  }
  
  // Extract from individual structured line with position/formatting context
  _extractFromStructuredLine(lineText, lineData) {
    const candidates = [];
    
    // Enhanced regex patterns that work well with structured data
    const patterns = [
      // Pattern 1: Name CAS% format (common in tables)
      /([A-Za-z0-9\-\s(),.]{3,50})\s+(\d{2,3}-\d{2}-\d)\s+([\d.\-]+%?)/g,
      
      // Pattern 2: Name (CAS) %
      /([A-Za-z0-9\-\s(),.]{3,50})\s*\((\d{2,3}-\d{2}-\d)\)\s*([\d.\-]+%?)/g,
      
      // Pattern 3: CAS: Number format
      /([A-Za-z0-9\-\s(),.]{3,50})\s*(?:CAS[:\s]*|cas[:\s]*)(\d{2,3}-\d{2}-\d)[^\d%]*([\d.\-]+%?)/gi,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(lineText)) !== null) {
        const [, name, cas, percentage] = match;
        
        // Validate the match quality
        if (this._isValidChemicalMatch(name, cas, percentage)) {
          candidates.push({
            name: name.trim(),
            cas: cas,
            percentage: percentage,
            sourceContext: 'structured_json',
            confidence: this._calculateStructuredConfidence(lineText, lineData)
          });
        }
      }
    }
    
    return candidates;
  }
  
  // Validate if extracted data looks like real chemical data
  _isValidChemicalMatch(name, cas, percentage) {
    // Name should be reasonable length and not just numbers/symbols
    if (!name || name.length < 3 || name.length > 100) return false;
    if (/^[\d\s\-.,()]+$/.test(name)) return false; // Not just numbers and punctuation
    
    // CAS should be valid format
    if (!/^\d{2,3}-\d{2}-\d$/.test(cas)) return false;
    
    // Percentage should be reasonable
    const numPercent = parseFloat(percentage);
    if (isNaN(numPercent) || numPercent < 0 || numPercent > 100) return false;
    
    return true;
  }
  
  // Calculate confidence based on structural context
  _calculateStructuredConfidence(lineText, lineData) {
    let confidence = 0.85; // Base confidence for structured data
    
    // Boost confidence if line appears to be in a table-like structure
    if (lineData && lineData.spans) {
      const spans = lineData.spans;
      
      // Check if spans are well-separated (table-like)
      if (spans.length >= 3) {
        confidence += 0.05;
      }
      
      // Check for consistent formatting (font, size)
      const fonts = spans.map(s => s.font).filter((f, i, arr) => arr.indexOf(f) === i);
      if (fonts.length <= 2) {
        confidence += 0.03;
      }
    }
    
    // Boost if line contains table-like keywords
    if (/component|ingredient|substance|chemical/i.test(lineText)) {
      confidence += 0.04;
    }
    
    return Math.min(confidence, 0.99);
  }

  // --- Pattern 1: Table Format ---
  _extractTablePattern(sectionText) {
    // Enhanced table pattern matching for various table formats
    const lines = sectionText.split(/\r?\n/);
    const candidates = [];
    
    for (const line of lines) {
      // Skip header lines
      if (/chemical\s+name|component|ingredient|substance/i.test(line) && 
          /cas|number|concentration|%/i.test(line)) {
        continue;
      }
      
      // Multiple patterns for table formats
      const patterns = [
        // Pattern 1: Name    CAS    % (spaces separated)
        /([A-Za-z][A-Za-z0-9\-\s(),.]{2,40})\s+(\d{2,3}-\d{2}-\d)\s+([\d.\-]+\s*(?:%-?\d+|%)?)(?:\s|$)/,
        
        // Pattern 2: Name | CAS | % (pipe separated) 
        /([A-Za-z0-9\-\s(),.]+)\s*[|\t]+\s*(\d{2,3}-\d{2}-\d)\s*[|\t]+\s*([\d.\-]+%?)/,
        
        // Pattern 3: Name, CAS, % (comma separated)
        /([A-Za-z0-9\-\s(),.]{3,40}),\s*(\d{2,3}-\d{2}-\d),\s*([\d.\-]+%?)/,
      ];
      
      for (const pattern of patterns) {
        const m = line.match(pattern);
        if (m) {
          const [, name, cas, percentage] = m;
          
          // Clean up the extracted values
          const cleanName = name.trim().replace(/\s+/g, ' ');
          const cleanPercentage = percentage.trim();
          
          // Validate the extraction makes sense
          if (cleanName.length >= 3 && cleanName.length <= 50) {
            candidates.push({ 
              name: cleanName, 
              cas: cas, 
              percentage: cleanPercentage,
              sourcePattern: 'table'
            });
            break; // Don't match multiple patterns on same line
          }
        }
      }
    }
    
    return candidates;
  }

  // --- Pattern 2: List Format ---
  _extractListPattern(sectionText) {
    // Enhanced list format matching
    const patterns = [
      // Bullet points with CAS
      /[•*-]\s*([A-Za-z0-9\-\s(),.]+)\s*\(?(?:CAS[:\s]*)?(\d{2,3}-\d{2}-\d)\)?[^\d%]*(\d{1,3}(?:\.\d+)?%?)/g,
      
      // Numbered lists
      /\d+\.\s*([A-Za-z0-9\-\s(),.]+)\s*\(?(?:CAS[:\s]*)?(\d{2,3}-\d{2}-\d)\)?[^\d%]*(\d{1,3}(?:\.\d+)?%?)/g,
    ];
    
    const candidates = [];
    
    for (const regex of patterns) {
      let m;
      while ((m = regex.exec(sectionText))) {
        const [, name, cas, percentage] = m;
        candidates.push({ 
          name: name.trim(), 
          cas: cas, 
          percentage: percentage,
          sourcePattern: 'list'
        });
      }
    }
    
    return candidates;
  }

  // --- Pattern 3: Paragraph Format ---
  _extractParagraphPattern(sectionText) {
    // Enhanced paragraph format matching
    const patterns = [
      // Name (CAS) percentage
      /([A-Za-z][A-Za-z0-9\-\s(),.]{2,40})\s*\(\s*(\d{2,3}-\d{2}-\d)\s*\)[^:\d]*?(\d{1,3}(?:\.\d+)?\s*(?:%-?\d+|%))/g,
      
      // Name, CAS: number, percentage
      /([A-Za-z][A-Za-z0-9\-\s(),.]{2,40}),?\s*(?:CAS[:\s]*|cas[:\s]*)(\d{2,3}-\d{2}-\d)[^:\d]*?(\d{1,3}(?:\.\d+)?\s*(?:%-?\d+|%))/gi,
      
      // General pattern with word boundaries
      /\b([A-Za-z][A-Za-z0-9\-\s(),.]{2,40})\s*[:\-]?\s*\(?(\d{2,3}-\d{2}-\d)\)?[^\w%]*?(\d{1,3}(?:\.\d+)?\s*(?:%-?\d+|%))/g,
    ];
    
    const candidates = [];
    
    for (const regex of patterns) {
      let m;
      while ((m = regex.exec(sectionText))) {
        const [, name, cas, percentage] = m;
        const cleanName = name.trim().replace(/[,.:;]+$/, ''); // Remove trailing punctuation
        
        // Validate the match quality
        if (cleanName.length >= 3 && cleanName.length <= 50 && 
            !/^\d/.test(cleanName)) { // Don't start with numbers
          candidates.push({ 
            name: cleanName, 
            cas: cas, 
            percentage: percentage.trim(),
            sourcePattern: 'paragraph'
          });
        }
      }
    }
    
    return candidates;
  }

  // --- Candidate Scoring and Validation ---
  _scoreCandidate(candidate) {
    // Validate CAS
    const casValid = /^\d{2,3}-\d{2}-\d$/.test(candidate.cas);
    // Confidence: base 0.8, +0.1 for valid CAS, +0.05 for % present
    let confidence = 0.8;
    if (casValid) confidence += 0.1;
    if (candidate.percentage) confidence += 0.05;
    confidence = Math.min(confidence, 0.99);
    return { ...candidate, confidence };
  }
}

export default BulletproofSDSExtractor;
