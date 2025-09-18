// Improved SDS Field Extractor - Properly formats data for classification engine
// Focuses on accurate extraction and normalization of critical fields

export function extractSDSFieldsImproved(rawText) {
  // console.log("🎯 Improved SDS Extraction starting...");
  
  // Normalize text for better parsing
  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' '); // Normalize multiple spaces
  
  const lines = normalizedText.split('\n').map(line => line.trim());
  
  const extracted = {
    productName: null,
    flashPoint: null,
    flashPointC: null, // Numeric value in Celsius
    pH: null,
    pHValue: null, // Numeric pH value
    physicalState: null,
    specificGravity: null,
    composition: [],
    unNumber: null,
    manufacturer: null,
    hazardStatements: [],
    signalWord: null
  };

  // Helper to extract numeric values
  const extractNumericValue = (text, unit = null) => {
    if (!text) return null;
    
    // Handle "Not applicable", "N/A", etc.
    if (/not\s+applicable|n\/a|none/i.test(text)) {
      return null;
    }
    
    // Extract number with optional comparison operators
    const patterns = [
      /([<>≤≥~]?)\s*(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)/i, // Range
      /([<>≤≥~]?)\s*(\d+(?:\.\d+)?)/i // Single value
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[3]) {
          // Range - use midpoint
          return (parseFloat(match[2]) + parseFloat(match[3])) / 2;
        } else if (match[2]) {
          // Single value
          return parseFloat(match[2]);
        }
      }
    }
    
    return null;
  };

  // Helper to convert temperature to Celsius
  const convertToC = (value, text) => {
    if (!value || !text) return null;
    
    // Check if it's Fahrenheit
    if (/°?\s*F|fahrenheit/i.test(text) && !/°?\s*C|celsius/i.test(text)) {
      return (value - 32) * 5/9;
    }
    
    return value; // Already Celsius or unitless
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

  // Extract Product Name from Section 1
  const section1Index = findSection(1, 'PRODUCT');
  if (section1Index >= 0) {
    // Look for product name in next 10 lines
    for (let i = section1Index + 1; i < Math.min(section1Index + 10, lines.length); i++) {
      const line = lines[i];
      
      // Skip section headers
      if (/^SECTION\s+\d|^\d+\./i.test(line)) break;
      
      // Product name patterns
      const patterns = [
        /^Product\s*(?:Name|Identifier)?\s*[:\s]+(.+)/i,
        /^Trade\s*Name\s*[:\s]+(.+)/i,
        /^Material\s*Name\s*[:\s]+(.+)/i,
        /^Chemical\s*Name\s*[:\s]+(.+)/i
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          extracted.productName = match[1].trim();
          // console.log("✅ Found product name:", extracted.productName);
          break;
        }
      }
      
      if (extracted.productName) break;
    }
  }

  // Extract Composition from Section 3
  const section3Index = findSection(3, 'COMPOSITION');
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
      
      if (inTable || /\d{2,7}-\d{2}-\d/.test(line)) {
        compositionLines.push(line);
      }
      
      // Stop after reasonable number of components
      if (compositionLines.length > 20) break;
    }
    
    // Parse composition lines
    for (const line of compositionLines) {
      // Pattern for CAS number
      const casPattern = /(\d{2,7}-\d{2}-\d)/;
      const casMatch = line.match(casPattern);
      
      if (casMatch) {
        const cas = casMatch[1];
        
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
          // console.log(`✅ Found component: ${name} (CAS: ${cas}) - ${percentage}`);
        }
      }
    }
  }

  // Extract Physical Properties from Section 9
  const section9Index = findSection(9, 'PHYSICAL');
  if (section9Index >= 0) {
    for (let i = section9Index + 1; i < Math.min(section9Index + 30, lines.length); i++) {
      const line = lines[i];
      
      // Stop at next section
      if (/^SECTION\s+\d|^\d+\./i.test(line) && i > section9Index + 2) break;
      
      // Flash Point
      if (/flash\s*point/i.test(line) && !extracted.flashPoint) {
        const match = line.match(/flash\s*point\s*[:\s]+(.+)/i);
        if (match) {
          extracted.flashPoint = match[1];
          const numValue = extractNumericValue(match[1]);
          extracted.flashPointC = convertToC(numValue, match[1]);
          // console.log(`✅ Flash point: ${extracted.flashPoint} (${extracted.flashPointC}°C)`);
        }
      }
      
      // pH
      if (/\bpH\b/i.test(line) && !extracted.pH) {
        const match = line.match(/pH\s*[:\s]+(.+)/i);
        if (match) {
          extracted.pH = match[1];
          extracted.pHValue = extractNumericValue(match[1]);
          // console.log(`✅ pH: ${extracted.pH} (numeric: ${extracted.pHValue})`);
        }
      }
      
      // Physical State
      if (/physical\s*state|form|appearance/i.test(line) && !extracted.physicalState) {
        const match = line.match(/(?:state|form|appearance)\s*[:\s]+(\w+)/i);
        if (match) {
          const state = match[1].toLowerCase();
          if (['solid', 'liquid', 'gas', 'aerosol', 'powder', 'gel', 'paste'].includes(state)) {
            extracted.physicalState = state;
            // console.log(`✅ Physical state: ${extracted.physicalState}`);
          }
        }
      }
      
      // Specific Gravity
      if (/specific\s*gravity|relative\s*density/i.test(line) && !extracted.specificGravity) {
        const match = line.match(/(?:gravity|density)\s*[:\s]+(.+)/i);
        if (match) {
          extracted.specificGravity = extractNumericValue(match[1]);
          // console.log(`✅ Specific gravity: ${extracted.specificGravity}`);
        }
      }
    }
  }

  // Extract Hazard Information from Section 2
  const section2Index = findSection(2, 'HAZARD');
  if (section2Index >= 0) {
    for (let i = section2Index + 1; i < Math.min(section2Index + 20, lines.length); i++) {
      const line = lines[i];
      
      // Stop at next section
      if (/^SECTION\s+\d|^\d+\./i.test(line) && i > section2Index + 2) break;
      
      // Signal Word
      if (/signal\s*word/i.test(line) && !extracted.signalWord) {
        const match = line.match(/signal\s*word\s*[:\s]+(DANGER|WARNING)/i);
        if (match) {
          extracted.signalWord = match[1].toUpperCase();
          // console.log(`✅ Signal word: ${extracted.signalWord}`);
        }
      }
      
      // Hazard Statements (H-codes)
      const hCodes = line.match(/H\d{3}[+]?/g);
      if (hCodes) {
        extracted.hazardStatements.push(...hCodes);
      }
    }
  }

  // Extract Transport Information from Section 14
  const section14Index = findSection(14, 'TRANSPORT');
  if (section14Index >= 0) {
    for (let i = section14Index + 1; i < Math.min(section14Index + 15, lines.length); i++) {
      const line = lines[i];
      
      // Stop at next section
      if (/^SECTION\s+\d|^\d+\./i.test(line) && i > section14Index + 2) break;
      
      // UN Number
      if (/UN\s*(?:Number|No)/i.test(line) && !extracted.unNumber) {
        const match = line.match(/UN\s*(\d{4})/i);
        if (match) {
          extracted.unNumber = 'UN' + match[1];
          // console.log(`✅ UN Number: ${extracted.unNumber}`);
        }
      }
    }
  }

  // Fallback: Look for key fields anywhere if not found in sections
  if (!extracted.productName) {
    for (const line of lines.slice(0, 20)) {
      if (line.length > 3 && line.length < 100 && 
          !/^(SAFETY|SDS|MSDS|Page|Section|Date)/i.test(line) &&
          /^[A-Z]/.test(line) && /[a-zA-Z]{3,}/.test(line)) {
        extracted.productName = line;
        // console.log("⚠️ Using fallback product name:", extracted.productName);
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

  // console.log("📊 Extraction complete:", {
  //   productName: extracted.productName,
  //   flashPointC: extracted.flashPointC,
  //   pHValue: extracted.pHValue,
  //   physicalState: extracted.physicalState,
  //   compositionCount: extracted.composition.length
  // });

  return extracted;
}

export default extractSDSFieldsImproved;