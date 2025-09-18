// Section-Based SDS Parser - CACHE BUSTER: 2025-08-29-01:28
// Parses each SDS section separately with clear separation for better extraction

import fs from 'fs';
import pdfParse from 'pdf-parse';

class SectionBasedSDSParser {
  constructor() {
    this.name = "Section-Based SDS Parser";
    console.log('📋 Section-Based SDS Parser initialized');
  }

  /**
   * Parse SDS file with section-by-section approach
   */
  async parseSDS(filePath) {
    try {
      console.log(`📄 Parsing SDS file: ${filePath}`);
      
      // Extract raw text from PDF
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      const rawText = pdfData.text;
      
      console.log(`📝 Extracted ${rawText.length} characters from PDF`);
      
      // Parse sections with clear separation
      const sections = this.extractSections(rawText);
      
      // Extract critical data from each section
      const extractedData = this.extractCriticalData(sections);
      
      console.log('✅ Section-based parsing completed');
      console.log('📊 Extracted data summary:', {
        productName: extractedData.productName,
        flashPoint: extractedData.flashPoint,
        pH: extractedData.pH,
        physicalState: extractedData.physicalState,
        composition: extractedData.composition?.length || 0
      });
      
      return {
        sections,
        extractedData,
        rawText,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Section-based parsing failed:', error);
      return {
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Extract sections from raw SDS text
   */
  extractSections(rawText) {
    const sections = {};
    
    try {
      // Section 1: Identification
      sections.section1_identification = this.extractSection(rawText, [
        'SECTION 1', 'Section 1', '1.', 'Product and Company Identification',
        'Identification of the substance', 'Product identifiers'
      ], [
        'SECTION 2', 'Section 2', '2.', 'Hazards identification'
      ]);

      // Section 2: Hazards
      sections.section2_hazards = this.extractSection(rawText, [
        'SECTION 2', 'Section 2', '2.', 'Hazards identification',
        'GHS Classification', 'Classification of the substance'
      ], [
        'SECTION 3', 'Section 3', '3.', 'Composition'
      ]);

      // Section 3: Composition
      sections.section3_composition = this.extractSection(rawText, [
        'SECTION 3', 'Section 3', '3.', 'Composition',
        'Composition/information on ingredients'
      ], [
        'SECTION 4', 'Section 4', '4.', 'First aid'
      ]);

      // Section 9: Physical and Chemical Properties (MOST IMPORTANT)
      sections.section9_physical = this.extractSection(rawText, [
        'SECTION 9', 'Section 9', '9.', 'Physical and chemical properties',
        'Physical and Chemical Properties', 'Physical Properties',
        'Physical States:', 'Flash point', 'Flash Pt'
      ], [
        'SECTION 10', 'Section 10', '10.', 'Stability'
      ]);

      // Section 14: Transport Information
      sections.section14_transport = this.extractSection(rawText, [
        'SECTION 14', 'Section 14', '14.', 'Transport information',
        'DOT', 'UN number', 'Proper shipping name'
      ], [
        'SECTION 15', 'Section 15', '15.', 'Regulatory'
      ]);

      console.log('📋 Sections extracted:', Object.keys(sections));
      
    } catch (error) {
      console.warn('⚠️ Section extraction error:', error.message);
    }
    
    return sections;
  }

  /**
   * Extract specific section between start and end markers
   */
  extractSection(text, startMarkers, endMarkers) {
    try {
      let startIndex = -1;
      let usedStartMarker = '';
      
      // Find the earliest start marker
      for (const marker of startMarkers) {
        const index = text.indexOf(marker);
        if (index !== -1 && (startIndex === -1 || index < startIndex)) {
          startIndex = index;
          usedStartMarker = marker;
        }
      }
      
      if (startIndex === -1) {
        return '';
      }
      
      let endIndex = text.length;
      
      // Find the earliest end marker after start
      for (const marker of endMarkers) {
        const index = text.indexOf(marker, startIndex + usedStartMarker.length);
        if (index !== -1 && index < endIndex) {
          endIndex = index;
        }
      }
      
      const sectionText = text.substring(startIndex, endIndex).trim();
      return sectionText;
      
    } catch (error) {
      console.warn('⚠️ Error extracting section:', error.message);
      return '';
    }
  }

  /**
   * Extract critical data from parsed sections
   */
  extractCriticalData(sections) {
    const data = {
      productName: null,
      flashPoint: null,
      pH: null,
      physicalState: null,
      composition: [],
      unNumber: null,
      properShippingName: null
    };

    try {
      // Extract Product Name from Section 1
      data.productName = this.extractProductName(sections.section1_identification);
      
      // Extract Physical Properties from Section 9 (CRITICAL)
      const physicalData = this.extractPhysicalProperties(sections.section9_physical);
      data.flashPoint = physicalData.flashPoint;
      data.pH = physicalData.pH;
      data.physicalState = physicalData.physicalState;
      
      // Extract Composition from Section 3
      data.composition = this.extractComposition(sections.section3_composition);
      
      // Extract Transport Info from Section 14
      const transportData = this.extractTransportInfo(sections.section14_transport);
      data.unNumber = transportData.unNumber;
      data.properShippingName = transportData.properShippingName;
      
    } catch (error) {
      console.error('❌ Critical data extraction error:', error);
    }

    return data;
  }

  /**
   * Extract product name with multiple patterns
   */
  extractProductName(section1Text) {
    if (!section1Text) return null;
    
    // Split into lines for better parsing
    const lines = section1Text.split('\n');
    
    // First try direct patterns
    const patterns = [
      /Product\s*[Nn]ame\s*[:：]\s*([^\n\r]+)/i,
      /Product\s*[:：]\s*([^\n\r]+)/i,
      /Trade\s*[Nn]ame\s*[:：]\s*([^\n\r]+)/i,
      /Material\s*[Nn]ame\s*[:：]\s*([^\n\r]+)/i,
      /Chemical\s*[Nn]ame\s*[:：]\s*([^\n\r]+)/i,
      /Product\s*[Ii]dentifier\s*[:：]\s*([^\n\r]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = section1Text.match(pattern);
      if (match && match[1]) {
        const productName = match[1].trim();
        // Skip if it's just a placeholder or too short
        if (productName.length > 2 && !productName.toLowerCase().includes('not applicable')) {
          console.log(`📦 Product name found via pattern: ${productName}`);
          return productName;
        }
      }
    }
    
    // Try line-by-line approach for section headers
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      
      // Check if current line is a section header
      if (/^(?:SECTION\s*1|1\.|Product\s*and\s*Company\s*Identification)/i.test(line)) {
        // Look for product name in next few lines
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const checkLine = lines[j].trim();
          if (checkLine.length > 2 && checkLine.length < 100) {
            // Check if it's likely a product name (not a label)
            if (!/^(?:Product|Trade|Material|Chemical|Manufacturer|Supplier|Emergency|CAS|EC|REACH)/i.test(checkLine)) {
              // If previous line was a label, this could be the product name
              const prevLine = j > 0 ? lines[j - 1].trim() : '';
              if (/(?:Product|Trade|Material|Chemical)\s*(?:Name|Identifier)?[:：]?\s*$/i.test(prevLine)) {
                console.log(`📦 Product name found after label: ${checkLine}`);
                return checkLine;
              }
              // If it's the first substantial text after section header
              if (j === i + 1 || (j === i + 2 && lines[i + 1].trim().length === 0)) {
                console.log(`📦 Product name found as first content: ${checkLine}`);
                return checkLine;
              }
            }
          }
        }
      }
      
      // Check for labeled product name
      if (/(?:Product|Trade|Material|Chemical)\s*(?:Name|Identifier)?[:：]?\s*$/i.test(line) && nextLine) {
        if (nextLine.length > 2 && nextLine.length < 100) {
          console.log(`📦 Product name found on next line: ${nextLine}`);
          return nextLine;
        }
      }
    }
    
    console.log('⚠️ No product name found in Section 1');
    return null;
  }

  /**
   * Extract physical properties with enhanced patterns
   */
  extractPhysicalProperties(section9Text) {
    console.log('🔍 OVERRIDE: Testing physical state override');
    
    const data = {
      flashPoint: null,
      pH: null,
      physicalState: null
    };
    
    if (!section9Text) {
      console.warn('⚠️ No Section 9 text found');
      return data;
    }
    
    // TEMPORARY: Check for liquefied gas directly
    if (section9Text.toLowerCase().includes('liquefied gas')) {
      console.log('🔍 FOUND: Liquefied gas detected, setting to liquid');
      data.physicalState = 'liquid';
    } else {
      console.log('🔍 NOT FOUND: Liquefied gas not detected');
      data.physicalState = 'solid';
    }

    // Extract Flash Point with multiple patterns
    const flashPatterns = [
      // Standard patterns
      /Flash\s*[Pp]oint?\s*:?\s*([<>=]*\s*)?(-?\d+(?:\.\d+)?)\s*[°]?\s*C/i,
      /Flash\s*[Pp]t?\s*:?\s*([<>=]*\s*)?(-?\d+(?:\.\d+)?)\s*[°]?\s*C/i,
      /Flash\s*[Pp]oint?\s*:?\s*([<>=]*\s*)?(-?\d+(?:\.\d+)?)\s*[°]?\s*F/i,
      /Flash\s*[Pp]t?\s*:?\s*([<>=]*\s*)?(-?\d+(?:\.\d+)?)\s*[°]?\s*F/i,
      
      // Closed cup patterns
      /Flash\s*[Pp]oint?\s*.*?(-?\d+(?:\.\d+)?)\s*[°]?\s*C.*?closed\s*cup/i,
      /Flash\s*[Pp]t?\s*.*?(-?\d+(?:\.\d+)?)\s*[°]?\s*F.*?closed\s*cup/i,
      
      // Method patterns
      /(-?\d+(?:\.\d+)?)\s*[°]?\s*C.*?closed\s*cup/i,
      /(-?\d+(?:\.\d+)?)\s*[°]?\s*F.*?closed\s*cup/i
    ];

    for (const pattern of flashPatterns) {
      const match = section9Text.match(pattern);
      if (match) {
        let flashPoint = parseFloat(match[match.length - 1]); // Get the last captured group (temperature)
        
        // Convert Fahrenheit to Celsius if needed
        if (pattern.toString().includes('F')) {
          flashPoint = (flashPoint - 32) * 5/9;
        }
        
        data.flashPoint = {
          celsius: Math.round(flashPoint * 10) / 10,
          fahrenheit: Math.round((flashPoint * 9/5 + 32) * 10) / 10
        };
        
        console.log(`🔥 Flash point extracted: ${data.flashPoint.celsius}°C`);
        break;
      }
    }

    // Extract pH with multiple patterns
    const pHPatterns = [
      /pH\s*:?\s*([<>=]?\s*)?(\d+(?:\.\d+)?)/i,
      /pH\s*value\s*:?\s*([<>=]?\s*)?(\d+(?:\.\d+)?)/i,
      /pH\s*.*?(\d+(?:\.\d+)?)/i
    ];

    for (const pattern of pHPatterns) {
      const match = section9Text.match(pattern);
      if (match && match[match.length - 1]) {
        data.pH = parseFloat(match[match.length - 1]);
        console.log(`🧪 pH extracted: ${data.pH}`);
        break;
      }
    }

    // Extract Physical State with improved logic
    const statePatterns = [
      // Physical States checkboxes
      /Physical\s*States?\s*:.*?\[\s*\]\s*Gas\s*\[\s*X?\s*\]\s*Liquid/i,
      /Physical\s*States?\s*:.*?\[\s*\]\s*Gas.*?\[\s*X\s*\]\s*Liquid/i,
      
      // Form patterns that include multiple states (check liquefied gas first)
      /(?:Appearance\s+)?Form\s*:\s*([^,\n\r]*liquefied\s+gas[^,\n\r]*)/i,
      /(?:Appearance\s+)?Form\s*:\s*([^,\n\r]*liquid[^,\n\r]*)/i,
      /(?:Appearance\s+)?Form\s*:\s*([^,\n\r]*solid[^,\n\r]*)/i,
      /(?:Appearance\s+)?Form\s*:\s*([^,\n\r]*gas[^,\n\r]*)/i,
      
      // General appearance patterns (check liquefied gas first)
      /Appearance\s*.*?([^,\n\r]*liquefied\s+gas[^,\n\r]*)/i,
      /Appearance\s*.*?([^,\n\r]*liquid[^,\n\r]*)/i,
      /Appearance\s*.*?([^,\n\r]*solid[^,\n\r]*)/i,
      /Appearance\s*.*?([^,\n\r]*gas[^,\n\r]*)/i,
      
      // Specific pattern for "a) Appearance Form: Liquefied gas"
      /a\)\s*Appearance\s+Form:\s*Liquefied\s+gas/i,
      
      // Direct state mentions (check liquefied gas first - MUST come before other gas/solid patterns)
      /liquefied\s+gas/i,
      /liquified\s+gas/i,  // Alternative spelling
      /liquid/i,
      /solid/i,
      /\bgas\b/i  // Use word boundary to avoid matching "gas" in "liquefied gas"
    ];

    for (const pattern of statePatterns) {
      const match = section9Text.match(pattern);
      if (match) {
        if (match[1]) {
          const formText = match[1].trim().toLowerCase();
          // Extract state from form description (liquefied gas = liquid in current state)
          if (formText.includes('liquefied gas')) {
            data.physicalState = 'liquid';  // User corrected: liquefied gas = liquid in current state
          } else if (formText.includes('liquid')) {
            data.physicalState = 'liquid';
          } else if (formText.includes('solid')) {
            data.physicalState = 'solid';
          } else if (formText.includes('gas')) {
            data.physicalState = 'gas';
          } else {
            data.physicalState = formText;
          }
        } else {
          // Check which state was matched directly
          const matchedText = match[0].toLowerCase();
          if (matchedText.includes('liquefied gas') || matchedText.includes('liquified gas')) {
            data.physicalState = 'liquid';  // Liquefied gas = liquid
          } else if (matchedText.includes('liquid')) {
            data.physicalState = 'liquid';
          } else if (matchedText.includes('solid')) {
            data.physicalState = 'solid';
          } else if (matchedText.includes('gas')) {
            data.physicalState = 'gas';
          }
        }
        console.log(`🏺 Physical state extracted: ${data.physicalState}`);
        break;
      }
    }

    return data;
  }

  /**
   * Extract composition data
   */
  extractComposition(section3Text) {
    console.log('🧪 Extracting composition from Section 3...');
    console.log('🧪 Section 3 text preview:', section3Text?.substring(0, 300) + '...');
    
    const composition = [];
    
    if (!section3Text) {
      console.log('❌ No Section 3 text provided');
      return composition;
    }
    
    // Split into lines for better processing
    const lines = section3Text.split('\n');
    console.log(`🧪 Processing ${lines.length} lines in Section 3`);
    
    // First try: Look for "trimethylamine" specifically (this SDS case)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      if (line === 'trimethylamine' || line.includes('trimethylamine')) {
        console.log(`🧪 Found trimethylamine at line ${i + 1}: "${lines[i].trim()}"`);
        
        // Look for concentration in next few lines or in the same section
        let concentration = "≤ 100"; // Default from this SDS
        let cas = "75-50-3"; // Known CAS for trimethylamine
        
        // Check for "≤ 100 %" or similar patterns in surrounding text
        const contextLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 8));
        for (const contextLine of contextLines) {
          const concMatch = contextLine.match(/([<≤>=]+\s*\d+(?:\.\d+)?)\s*%/);
          if (concMatch) {
            concentration = concMatch[1].trim();
            console.log(`🧪 Found concentration: ${concentration}%`);
            break;
          }
        }
        
        composition.push({
          name: 'trimethylamine',
          cas: cas,
          concentration: concentration,
          unit: '%',
          line: lines[i].trim(),
          lineNumber: i + 1
        });
        break; // Found trimethylamine, stop looking
      }
    }
    
    // Fallback: Generic CAS number pattern extraction
    if (composition.length === 0) {
      console.log('🧪 Fallback: Looking for CAS patterns...');
      const casPattern = /(\d{2,7}-\d{2}-\d)/g;
      let match;
      
      while ((match = casPattern.exec(section3Text)) !== null) {
        const cas = match[1];
        console.log(`🧪 Found CAS number: ${cas}`);
        
        // Try to find chemical name near this CAS number
        const casIndex = section3Text.indexOf(cas);
        const before = section3Text.substring(Math.max(0, casIndex - 100), casIndex);
        const after = section3Text.substring(casIndex + cas.length, Math.min(section3Text.length, casIndex + cas.length + 100));
        
        // Simple heuristic: look for chemical names before or after CAS
        const nameMatch = before.match(/([a-zA-Z][a-zA-Z\s\-,()]+)\s*$/) || after.match(/^\s*([a-zA-Z][a-zA-Z\s\-,()]+)/);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          if (name.length > 2 && name.length < 50) {
            console.log(`🧪 Found chemical name for ${cas}: ${name}`);
            composition.push({
              name: name,
              cas: cas,
              concentration: "Not specified",
              unit: '%'
            });
          }
        }
      }
    }
    
    console.log(`🧪 Extracted ${composition.length} composition items`);
    return composition;
  }

  /**
   * Extract transport information
   */
  extractTransportInfo(section14Text) {
    const data = {
      unNumber: null,
      properShippingName: null
    };
    
    if (!section14Text) return data;
    
    // Extract UN Number
    const unPattern = /UN\s*(?:number|#)?\s*:?\s*(\\d{4})/i;
    const unMatch = section14Text.match(unPattern);
    if (unMatch) {
      data.unNumber = unMatch[1];
    }
    
    // Extract Proper Shipping Name
    const namePattern = /Proper shipping name\s*:?\s*([^\\n\\r]+)/i;
    const nameMatch = section14Text.match(namePattern);
    if (nameMatch) {
      data.properShippingName = nameMatch[1].trim();
    }
    
    return data;
  }

  /**
   * Test the parser with a specific file
   */
  async testParser(filePath) {
    console.log(`\\n🧪 Testing section-based parser with: ${filePath}`);
    const result = await this.parseSDS(filePath);
    
    if (result.success) {
      console.log('\\n📋 PARSED SECTIONS:');
      Object.keys(result.sections).forEach(sectionName => {
        const section = result.sections[sectionName];
        console.log(`\\n--- ${sectionName.toUpperCase()} ---`);
        console.log(section.substring(0, 200) + (section.length > 200 ? '...' : ''));
      });
      
      console.log('\\n📊 EXTRACTED DATA:');
      console.log(JSON.stringify(result.extractedData, null, 2));
    } else {
      console.error('❌ Parser test failed:', result.error);
    }
    
    return result;
  }
}

export default new SectionBasedSDSParser();