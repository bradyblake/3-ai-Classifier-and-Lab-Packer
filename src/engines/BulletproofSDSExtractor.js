// BulletproofSDSExtractor.js - Using proven baseline extraction logic directly embedded

class BulletproofSDSExtractor {
  constructor(options = {}) {
    this.options = options;
  }

  async extract(input) {
    let text = '';
    
    // Handle PDF File objects
    if (input instanceof File && input.type === 'application/pdf') {
      try {
        const arrayBuffer = await input.arrayBuffer();
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href;
        }
        
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        text = fullText;
      } catch (error) {
        return { 
          productName: 'PDF Extraction Failed',
          composition: [],
          extractedText: '' 
        };
      }
    } else if (typeof input === 'string') {
      text = input;
    } else if (input.text) {
      text = input.text;
    } else if (input.extractedText) {
      text = input.extractedText;
    } else {
      return { productName: 'Unknown Product', composition: [], extractedText: '' };
    }
    
    // Use the proven baseline extraction logic
    const extracted = this.extractSDSFieldsImproved(text);
    
    console.log('🔍 BulletproofSDSExtractor - Final Results:', {
      productName: extracted.productName,
      compositionCount: extracted.composition.length,
      composition: extracted.composition.map(c => ({ name: c.name, cas: c.cas, percentage: c.percentage }))
    });
    
    // Return in the format expected by the analyzer
    return {
      productName: extracted.productName || 'Unknown Product',
      composition: extracted.composition || [],
      extractedText: text,
      flashPoint: extracted.flashPoint
    };
  }

  // Embedded proven baseline extraction logic
  extractSDSFieldsImproved(rawText) {
    // Normalize text for better parsing
    const normalizedText = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' '); // Normalize multiple spaces
    
    const lines = normalizedText.split('\n').map(line => line.trim());
    
    const extracted = {
      productName: null,
      composition: [],
      flashPoint: null
    };

    // Section detection helper
    const findSection = (sectionNumber, sectionName = null) => {
      const patterns = [
        new RegExp(`^SECTION\\s+${sectionNumber}(?:\\s*:|\\s+)`, 'i'),
        new RegExp(`^${sectionNumber}\\.\\s+${sectionName}`, 'i'),
        sectionName ? new RegExp(`^${sectionName}`, 'i') : null
      ].filter(Boolean);
      
      for (let i = 0; i < lines.length; i++) {
        for (const pattern of patterns) {
          if (pattern.test(lines[i])) {
            return i;
          }
        }
      }
      return -1;
    };

    // Extract Product Name - enhanced approach with multiple strategies
    console.log(`📋 Starting product name extraction from ${lines.length} lines`);
    
    // Strategy 1: Look for standard "Product name : Chemical" pattern
    for (let i = 0; i < Math.min(25, lines.length); i++) {
      const line = lines[i];
      
      // Skip section headers but log the attempt
      if (/^SECTION\s+\d|^\d+\./i.test(line)) {
        continue;
      }
      
      // Enhanced patterns with more variations
      const patterns = [
        /Product\s+name\s*[:\s]+(.+?)(?:\s+Product\s+Number|$)/i,  // Stop at "Product Number"
        /Product\s*name\s*[:\s]+(.+?)(?:\s+Brand|$)/i,             // Stop at "Brand"
        /Product\s*name\s*[:\s]+(.+)$/i,                           // Rest of line
        /Product\s+Identifier\s+(.+?)(?:\s+Synonyms|$)/i,          // "Product Identifier   Diesel Fuel" format
        /Chemical\s*name\s*[:\s]+(.+)$/i,                          // Chemical name variant
        /Trade\s*name\s*[:\s]+(.+)$/i,                             // Trade name variant
        /Material\s*name\s*[:\s]+(.+)$/i,                          // Material name variant
        /^(WD-40\s+[^\n]+)/i,                                       // WD-40 specific pattern
        /^(Paint\s+Thinner)/i,                                       // Paint Thinner specific
        /^(Diesel\s+Fuel)/i,                                         // Diesel Fuel specific
        /^(MEK|Methyl\s+Ethyl\s+Ketone|2-Butanone)/i                // MEK specific patterns
      ];
      
      for (let p = 0; p < patterns.length; p++) {
        const pattern = patterns[p];
        const match = line.match(pattern);
        if (match && match[1]) {
          let productName = match[1].trim();
          
          // Clean up common trailing text
          productName = productName.replace(/\s+(Product Number|Brand|Index|CAS).*$/i, '').trim();
          
          console.log(`✅ Pattern ${p} matched on line ${i}: "${productName}"`);
          
          // More specific validation
          if (productName.length >= 3 && productName.length <= 80 && 
              !/^\d+$/.test(productName) &&               // Not just numbers
              !/^Page\s+\d+/i.test(productName) &&        // Not page numbers
              !/^Version\s+\d+/i.test(productName) &&     // Not version numbers
              !/^The\s+life\s+science/i.test(productName) && // Not company info
              !/operates\s+as/i.test(productName)) {      // Not company info
            
            extracted.productName = productName;
            console.log(`🎯 Product name successfully set: "${productName}"`);
            break;
          } else {
            console.log(`❌ Product name rejected: "${productName}" (failed validation)`);
          }
        }
      }
      
      if (extracted.productName) break;
    }
    
    console.log(`📋 Product name extraction result: "${extracted.productName || 'NOT FOUND'}"`);

    // Extract flash point for ignitability assessment
    console.log(`🔥 Starting flash point extraction...`);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Flash point patterns (handle both Fahrenheit and Celsius)
      const flashPointPatterns = [
        /Flash\s*Point\s*[:\s]*(\d+)\s*°?F/i,
        /Flash\s*Point\s*[:\s]*(\d+)\s*°?C/i,
        /Flash\s*Pt\s*[:\s]*>=\s*(\d+)\.?\d*\s*F/i,                // "Flash Pt: >= 101.00 F" format
        /Flash\s*Point\s*[:\s]*>=\s*(\d+)\.?\d*\s*°?F/i,          // "Flash Point: >= 101°F" format
        /Flash\s*[:\s]*>=\s*(\d+)\.?\d*\s*°?F/i,                  // "Flash: >= 101F" format
        /Flash\s*[:\s]*(\d+)\s*°?F/i,
        /Flash\s*[:\s]*(\d+)\s*°?C/i
      ];
      
      for (const pattern of flashPointPatterns) {
        const match = line.match(pattern);
        if (match) {
          const temp = parseInt(match[1]);
          let tempF = temp;
          
          // Convert C to F if needed
          if (pattern.source.includes('°?C')) {
            tempF = Math.round((temp * 9/5) + 32);
          }
          
          extracted.flashPoint = tempF;
          console.log(`🔥 Flash point found: ${temp}°${pattern.source.includes('°?C') ? 'C' : 'F'} (${tempF}°F)`);
          break;
        }
      }
      
      if (extracted.flashPoint) break;
    }
    
    if (!extracted.flashPoint) {
      console.log(`🔥 No flash point found`);
    }

    // Strategy 2: If not found, search more broadly in first 30 lines
    if (!extracted.productName) {
      console.log(`🔍 Trying broader search for product name...`);
      for (let i = 0; i < Math.min(30, lines.length); i++) {
        const line = lines[i].trim();
        
        // Look for standalone chemical names (common patterns)
        const chemicalPatterns = [
          /^(Acetone|Trimethylamine|Tetrachloroethylene|Perchloroethylene|Benzene|Toluene|Xylene|Methanol|Ethanol|Isopropanol|MEK|Methyl\s+Ethyl\s+Ketone|2-Butanone)$/i,
          /^([A-Z][a-z]+(?:\s+[a-z]+)*)\s*$/,  // Capitalized words only
        ];
        
        for (const pattern of chemicalPatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            const candidate = match[1].trim();
            if (candidate.length >= 3 && candidate.length <= 50) {
              extracted.productName = candidate;
              console.log(`🎯 Found product name via broader search: "${candidate}" on line ${i}`);
              break;
            }
          }
        }
        
        if (extracted.productName) break;
      }
    }

    // Extract Composition from Section 3 (try multiple variations)
    let section3Index = findSection(3, 'COMPOSITION');
    if (section3Index < 0) {
      section3Index = findSection(3, 'Composition');
    }
    if (section3Index >= 0) {
      const compositionLines = [];
      let inTable = false;
      
      // Collect composition section lines
      for (let i = section3Index + 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Stop at next section
        if (/^SECTION\s+\d|^\d+\./i.test(line) && i > section3Index + 2) break;
        
        // Detect table headers
        if (/chemical\s*name|cas\s*number|ingredient|component/i.test(line)) {
          inTable = true;
          continue;
        }
        
        // Skip empty lines and headers
        if (!line || line.length < 5) continue;
        
        if (inTable || /\d{2,7}\s*-\s*\d{2}\s*-\s*\d/.test(line)) {
          compositionLines.push(line);
        }
        
        // Stop after reasonable number of components
        if (compositionLines.length > 20) break;
      }
      
      // Parse composition lines with enhanced CAS detection
      for (const line of compositionLines) {
        console.log(`🔬 Parsing composition line: "${line}"`);
        
        // Enhanced CAS patterns for Section 3
        const casPatterns = [
          /(\d{2,7})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})/g,  // Spaced format
          /(\d{2,7}-\d{1,2}-\d{1,2})/g                    // Compact format
        ];
        
        let casMatch = null;
        let cas = null;
        
        for (const pattern of casPatterns) {
          casMatch = line.match(pattern);
          if (casMatch) {
            if (casMatch[0].includes('-') && !casMatch[0].match(/\s/)) {
              // Already compact format
              cas = casMatch[0];
            } else {
              // Need to remove spaces
              cas = casMatch[0].replace(/\s+/g, '');
            }
            console.log(`✅ Found CAS in composition: ${cas}`);
            break;
          }
        }
        
        if (casMatch && cas) {
          
          // Extract percentage
          let percentage = null;
          const percentPatterns = [
            /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%/, // Range
            /([<>]?)\s*(\d+(?:\.\d+)?)\s*%/, // Single with operator
            /(\d+(?:\.\d+)?)\s*%/ // Simple percentage
          ];
          
          for (const pattern of percentPatterns) {
            const match = line.match(pattern);
            if (match) {
              if (match[2] && !match[0].includes('<') && !match[0].includes('>')) {
                // Range - store as string
                percentage = `${match[1]}-${match[2]}%`;
              } else {
                // Single value
                const op = match[1] || '';
                const val = match[2] || match[1];
                percentage = op + val + '%';
              }
              break;
            }
          }
          
          // Extract chemical name
          let name = null;
          
          // Remove CAS and percentage from line to isolate name
          let cleanLine = line
            .replace(casPattern, '|CAS|')
            .replace(/\d+(?:\.\d+)?\s*[-–]?\s*\d*(?:\.\d+)?\s*%/g, '|PCT|')
            .trim();
          
          // Extract text before or after markers
          const parts = cleanLine.split(/\|CAS\||\|PCT\|/).filter(p => p.trim());
          if (parts.length > 0) {
            // Take the longest part that looks like a chemical name
            name = parts
              .map(p => p.trim())
              .filter(p => p.length > 2 && /[a-zA-Z]/.test(p))
              .sort((a, b) => b.length - a.length)[0];
          }
          
          if (name || cas) {
            extracted.composition.push({
              name: name || 'Unknown',
              cas: cas,
              percentage: percentage || 'Not specified'
            });
          }
        }
      }
    }

    // Final fallback: Look for product name anywhere if still not found
    if (!extracted.productName) {
      console.log(`🔍 Final fallback search for product name in first 20 lines...`);
      for (const line of lines.slice(0, 20)) {
        if (line.length > 3 && line.length < 100 && 
            !/^(SAFETY|SDS|MSDS|Page|Section|Date|The\s+life\s+science)/i.test(line) &&
            /^[A-Z]/.test(line) && /[a-zA-Z]{3,}/.test(line)) {
          extracted.productName = line;
          console.log(`🎯 Final fallback found product name: "${line}"`);
          break;
        }
      }
    }

    // Fallback: If no composition found in Section 3, look for CAS in Section 1
    if (extracted.composition.length === 0) {
      // Look for CAS anywhere in the first 30 lines (covers full Section 1)
      for (let i = 0; i < Math.min(30, lines.length); i++) {
        const line = lines[i];
        
        // Enhanced CAS patterns to handle various formats
        const casPatterns = [
          /CAS\s*-?\s*No\.?\s*:?\s*(\d{2,7}\s*-\s*\d{1,2}\s*-\s*\d{1,2})/i,  // Standard format
          /CAS\s*Number\s*:?\s*(\d{2,7}\s*-\s*\d{1,2}\s*-\s*\d{1,2})/i,     // CAS Number variant
          /CAS\s*:?\s*(\d{2,7}\s*-\s*\d{1,2}\s*-\s*\d{1,2})/i,              // Simple CAS format
          /(\d{2,7})\s*-\s*(\d{1,2})\s*-\s*(\d{1,2})/                        // Just the number pattern
        ];
        
        let casMatch = null;
        for (const pattern of casPatterns) {
          casMatch = line.match(pattern);
          if (casMatch) break;
        }
        
        if (casMatch) {
          let cas;
          if (casMatch.length === 4) {
            // Pattern with separate capture groups
            cas = `${casMatch[1]}-${casMatch[2]}-${casMatch[3]}`;
          } else {
            // Pattern with single capture group
            cas = casMatch[1].replace(/\s+/g, ''); // Remove spaces from CAS
          }
          console.log(`🧪 Found CAS in Section 1 fallback: ${cas}`);
          
          // Use the already found product name if available
          const chemicalName = extracted.productName && extracted.productName !== 'Unknown Product' 
            ? extracted.productName 
            : 'Unknown Chemical';
            
          console.log(`🏷️  Using chemical name: "${chemicalName}"`);
            
          extracted.composition.push({
            name: chemicalName,
            cas: cas,
            percentage: '100%' // Single component assumed 100%
          });
          break;
        }
      }
    }

    // Clean up composition to ensure proper format
    extracted.composition = extracted.composition.map(comp => ({
      name: comp.name?.substring(0, 100) || 'Unknown', // Limit name length
      cas: comp.cas || null,
      percentage: comp.percentage || null,
      percent: parseFloat(comp.percentage) || null // Numeric percent for calculations
    }));
    
    // Final validation and logging
    console.log(`📊 BulletproofSDSExtractor Summary:
    - Product Name: "${extracted.productName || 'NOT FOUND'}"
    - Composition Count: ${extracted.composition.length}
    - CAS Numbers Found: ${extracted.composition.map(c => c.cas).filter(Boolean).join(', ') || 'None'}
    - Text Length: ${normalizedText.length} characters`);

    return extracted;
  }
}

export { BulletproofSDSExtractor };
export default BulletproofSDSExtractor;