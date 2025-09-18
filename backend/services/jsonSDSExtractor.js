// JSON SDS Extractor - Extracts SDS data directly to structured JSON
// This replaces regex-based parsing with structured extraction

import fs from 'fs';

class JSONSDSExtractor {
  constructor() {
    console.log('📋 JSON SDS Extractor initialized - Structured extraction to JSON');
  }

  /**
   * Extract SDS data from text and return structured JSON
   * @param {string} text - Raw text from PDF
   * @returns {Object} Structured JSON with all SDS fields
   */
  extractToJSON(text) {
    console.log('🔍 Starting JSON extraction from text...');
    
    // Initialize result structure with all expected fields
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      extractionMethod: 'json-structured',
      
      // Core identification
      productName: null,
      manufacturer: null,
      productCode: null,
      revision: null,
      
      // Physical and chemical properties
      physicalState: null,
      flashPoint: null,
      boilingPoint: null,
      meltingPoint: null,
      pH: null,
      density: null,
      vaporPressure: null,
      
      // Hazard information
      hazardStatements: [],
      ghsClassifications: [],
      signalWord: null,
      
      // Composition
      composition: [],
      
      // Transport information
      unNumber: null,
      properShippingName: null,
      hazardClass: null,
      packingGroup: null,
      
      // Raw sections for reference
      sections: {}
    };

    // Split text into lines for processing
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Extract sections first
    result.sections = this.extractSections(lines);
    
    // Extract from Section 1 - Identification
    if (result.sections['section1']) {
      result.productName = this.extractField(result.sections['section1'], [
        /product\s*name\s*:?\s*(.+)/i,
        /product\s*identifier\s*:?\s*(.+)/i,
        /chemical\s*name\s*:?\s*(.+)/i,
        /trade\s*name\s*:?\s*(.+)/i,
        /material\s*name\s*:?\s*(.+)/i,
        /substance\s*name\s*:?\s*(.+)/i
      ]);
      
      // Clean and validate the extracted product name
      if (result.productName && this.isInvalidProductName(result.productName)) {
        result.productName = null;
      }
      
      result.manufacturer = this.extractField(result.sections['section1'], [
        /manufacturer\s*:?\s*(.+)/i,
        /supplier\s*:?\s*(.+)/i,
        /company\s*:?\s*(.+)/i
      ]);
      
      result.productCode = this.extractField(result.sections['section1'], [
        /product\s*(?:code|number)\s*:?\s*(.+)/i,
        /item\s*(?:code|number)\s*:?\s*(.+)/i
      ]);
    }
    
    // Extract from Section 3 - Composition with enhanced fallback
    result.composition = this.extractCompositionEnhanced(result);
    
    // Extract from Section 9 - Physical and Chemical Properties
    if (result.sections['section9']) {
      const section9 = result.sections['section9'];
      
      // Physical state
      result.physicalState = this.extractPhysicalState(section9);
      
      // Flash point with unit conversion
      result.flashPoint = this.extractTemperature(section9, 'flash point');
      
      // Boiling point
      result.boilingPoint = this.extractTemperature(section9, 'boiling point');
      
      // Melting point
      result.meltingPoint = this.extractTemperature(section9, 'melting point');
      
      // pH
      result.pH = this.extractNumericValue(section9, 'ph');
      
      // Density
      result.density = this.extractField(section9, [
        /density\s*:?\s*([\d.]+\s*[a-z\/]+)/i,
        /specific\s*gravity\s*:?\s*([\d.]+)/i
      ]);
    }
    
    // Extract from Section 14 - Transport Information
    if (result.sections['section14']) {
      const section14 = result.sections['section14'];
      
      result.unNumber = this.extractField(section14, [
        /un\s*(?:number|no\.?)\s*:?\s*(?:un)?(\d{4})/i,
        /un(\d{4})/i
      ]);
      
      result.properShippingName = this.extractField(section14, [
        /proper\s*shipping\s*name\s*:?\s*(.+)/i,
        /shipping\s*name\s*:?\s*(.+)/i
      ]);
      
      result.hazardClass = this.extractField(section14, [
        /(?:hazard\s*)?class\s*:?\s*(.+)/i,
        /transport\s*hazard\s*class\s*:?\s*(.+)/i
      ]);
      
      result.packingGroup = this.extractField(section14, [
        /packing\s*group\s*:?\s*([IVX]+)/i,
        /pg\s*:?\s*([IVX]+)/i
      ]);
    }
    
    // Extract from Section 2 - Hazards Identification
    if (result.sections['section2']) {
      const section2 = result.sections['section2'].join(' ');
      
      // Extract hazard statements (H-codes)
      const hCodes = section2.match(/H\d{3}[a-z]?/gi);
      if (hCodes) {
        result.hazardStatements = [...new Set(hCodes.map(h => h.toUpperCase()))];
      }
      
      // Extract signal word
      const signalMatch = section2.match(/signal\s*word\s*:?\s*(danger|warning)/i);
      if (signalMatch) {
        result.signalWord = signalMatch[1].toUpperCase();
      }
    }
    
    // Enhanced fallback: Search entire text with comprehensive patterns
    if (!result.productName) {
      result.productName = this.extractProductNameFallback(lines);
    }
    
    // Final fallback - try to get from composition if still unknown
    if (!result.productName || result.productName === 'Unknown Product') {
      if (result.composition && result.composition.length > 0) {
        const mainChemical = result.composition[0];
        if (mainChemical.name && mainChemical.name !== 'Unknown') {
          result.productName = mainChemical.name;
        }
      }
    }
    
    if (!result.flashPoint && !result.sections['section9']) {
      result.flashPoint = this.extractTemperature(lines, 'flash point');
    }
    
    if (!result.pH && !result.sections['section9']) {
      result.pH = this.extractNumericValue(lines, 'ph');
    }
    
    // Clean up the result
    result.productName = this.cleanValue(result.productName);
    result.manufacturer = this.cleanValue(result.manufacturer);
    
    // Add validation details
    result.validation = this.validateExtraction(result);
    result.isValid = result.validation.isValid;
    
    console.log('📊 Validation result:', result.validation);
    
    console.log('✅ JSON extraction complete:', {
      productName: result.productName,
      flashPoint: result.flashPoint,
      pH: result.pH,
      compositionCount: result.composition.length,
      composition: result.composition.length > 0 ? result.composition.map(c => `${c.name} (${c.cas})`) : ['No composition found'],
      isValid: result.isValid
    });
    
    return result;
  }
  
  /**
   * Extract sections from text
   */
  extractSections(lines) {
    const sections = {};
    let currentSection = null;
    let sectionContent = [];
    let lineIndex = 0;
    
    console.log(`🔍 Processing ${lines.length} lines for STANDARD GHS section extraction`);
    
    // Focus on standard GHS 16-section format
    for (const line of lines) {
      lineIndex++;
      let sectionMatch = null;
      const lowerLine = line.toLowerCase();
      
      // Pattern 1: Standard "Section X" format
      const sectMatch = line.match(/section\s*[\:\-\s]*(\d+)/i);
      if (sectMatch && parseInt(sectMatch[1]) <= 16) {
        sectionMatch = [line, sectMatch[1]];
        console.log(`🎯 Standard Section: ${sectMatch[1]} - "${line.substring(0, 60)}"`);
      }
      
      // Pattern 2: Number at start of line (1., 2:, etc.)
      if (!sectionMatch) {
        const numMatch = line.match(/^\s*(\d+)[\.\:\-\s]/);
        if (numMatch && parseInt(numMatch[1]) <= 16) {
          sectionMatch = [line, numMatch[1]];
          console.log(`🎯 Numbered Section: ${numMatch[1]} - "${line.substring(0, 60)}"`);
        }
      }
      
      // Pattern 3: Standard keyword detection for major sections
      if (!sectionMatch) {
        const keywordMap = [
          { keywords: ['identification', 'product name', 'product identifier'], section: '1' },
          { keywords: ['hazard identification', 'hazard classification'], section: '2' },
          { keywords: ['composition', 'ingredients'], section: '3' },
          { keywords: ['first aid'], section: '4' },
          { keywords: ['fire fighting', 'firefighting'], section: '5' },
          { keywords: ['accidental release'], section: '6' },
          { keywords: ['handling and storage'], section: '7' },
          { keywords: ['exposure control', 'personal protection'], section: '8' },
          { keywords: ['physical and chemical properties'], section: '9' },
          { keywords: ['stability and reactivity'], section: '10' },
          { keywords: ['toxicological information'], section: '11' },
          { keywords: ['ecological information'], section: '12' },
          { keywords: ['disposal considerations'], section: '13' },
          { keywords: ['transport information'], section: '14' },
          { keywords: ['regulatory information'], section: '15' },
          { keywords: ['other information'], section: '16' }
        ];
        
        for (const mapping of keywordMap) {
          for (const keyword of mapping.keywords) {
            if (lowerLine.includes(keyword)) {
              sectionMatch = [line, mapping.section];
              console.log(`🎯 Keyword match: "${keyword}" -> section ${mapping.section}`);
              break;
            }
          }
          if (sectionMatch) break;
        }
      }
      
      if (sectionMatch) {
        console.log(`📋 ✅ FOUND SECTION ${sectionMatch[1]}: "${line.substring(0, 80)}..."`);
        
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          sections[`section${currentSection}`] = sectionContent;
          console.log(`💾 Saved section${currentSection} with ${sectionContent.length} lines`);
        }
        
        // Start new section
        currentSection = sectionMatch[1];
        sectionContent = [line];
      } else if (currentSection) {
        sectionContent.push(line);
      } else {
        // If no section found yet, put content in a general section
        if (!sections['general']) sections['general'] = [];
        sections['general'].push(line);
      }
    }
    
    // Save last section
    if (currentSection && sectionContent.length > 0) {
      sections[`section${currentSection}`] = sectionContent;
      console.log(`💾 Saved final section${currentSection} with ${sectionContent.length} lines`);
    }
    
    // If we found very few sections, create artificial ones based on content
    if (Object.keys(sections).filter(k => k.startsWith('section')).length < 3) {
      console.log(`⚠️  Only found ${Object.keys(sections).length} sections. Creating artificial sections from content...`);
      
      const allContent = lines.join('\n').toLowerCase();
      
      // Create basic sections based on content detection
      const contentSections = {
        '1': this.extractContentForSection(lines, ['product', 'name', 'identification', 'manufacturer']),
        '2': this.extractContentForSection(lines, ['hazard', 'danger', 'warning', 'ghs', 'classification']),
        '3': this.extractContentForSection(lines, ['composition', 'ingredient', 'component', 'cas', '%', 'percent']),
        '9': this.extractContentForSection(lines, ['physical', 'appearance', 'color', 'odor', 'ph', 'density', 'boiling', 'melting'])
      };
      
      for (const [sectionNum, content] of Object.entries(contentSections)) {
        if (content && content.length > 0 && !sections[`section${sectionNum}`]) {
          sections[`section${sectionNum}`] = content;
          console.log(`🔧 Created artificial section${sectionNum} with ${content.length} lines`);
        }
      }
    }
    
    console.log(`🎯 ULTRA-AGGRESSIVE extraction complete: Found ${Object.keys(sections).length} sections: ${Object.keys(sections).join(', ')}`);
    return sections;
  }
  
  extractContentForSection(lines, keywords) {
    const relevantLines = [];
    let foundRelevant = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const isRelevant = keywords.some(keyword => lowerLine.includes(keyword));
      
      if (isRelevant) {
        foundRelevant = true;
        relevantLines.push(line);
      } else if (foundRelevant && relevantLines.length > 0 && line.trim() !== '') {
        // Keep adding lines until we hit another section or empty lines
        if (relevantLines.length < 20) { // Limit section size
          relevantLines.push(line);
        } else {
          break;
        }
      }
    }
    
    return relevantLines.length > 0 ? relevantLines : null;
  }
  
  /**
   * Extract a field using multiple regex patterns
   */
  extractField(lines, patterns) {
    const searchLines = Array.isArray(lines) ? lines : [lines];
    
    for (const pattern of patterns) {
      for (const line of searchLines) {
        const match = line.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract temperature with unit conversion
   */
  extractTemperature(lines, fieldName) {
    const searchLines = Array.isArray(lines) ? lines : [lines];
    const patterns = [
      new RegExp(`${fieldName}\\s*:?\\s*([\\d.-]+)\\s*°?\\s*([CF])`, 'i'),
      new RegExp(`${fieldName}\\s*:?\\s*([\\d.-]+)\\s*degrees?\\s*([CF])`, 'i')
    ];
    
    for (const pattern of patterns) {
      for (const line of searchLines) {
        const match = line.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          
          if (unit === 'F') {
            // Convert Fahrenheit to Celsius
            const celsius = (value - 32) * 5 / 9;
            return {
              celsius: Math.round(celsius * 10) / 10,
              fahrenheit: value,
              original: `${value}°F`
            };
          } else {
            return {
              celsius: value,
              fahrenheit: Math.round((value * 9/5 + 32) * 10) / 10,
              original: `${value}°C`
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract numeric value (like pH)
   */
  extractNumericValue(lines, fieldName) {
    const searchLines = Array.isArray(lines) ? lines : [lines];
    const patterns = [
      new RegExp(`${fieldName}\\s*:?\\s*([\\d.]+)`, 'i'),
      new RegExp(`${fieldName}\\s*value\\s*:?\\s*([\\d.]+)`, 'i')
    ];
    
    for (const pattern of patterns) {
      for (const line of searchLines) {
        const match = line.match(pattern);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract physical state
   */
  extractPhysicalState(lines) {
    const searchLines = Array.isArray(lines) ? lines : [lines];
    const text = searchLines.join(' ').toLowerCase();
    
    // Check for explicit physical state field
    const stateMatch = text.match(/(?:physical\s*)?state\s*:?\s*(solid|liquid|gas|aerosol)/i);
    if (stateMatch) {
      return stateMatch[1].toLowerCase();
    }
    
    // Check for form/appearance
    const formMatch = text.match(/(?:physical\s*)?form\s*:?\s*(solid|liquid|gas|aerosol)/i);
    if (formMatch) {
      return formMatch[1].toLowerCase();
    }
    
    // Infer from keywords
    if (text.includes('aerosol') || text.includes('spray')) return 'aerosol';
    if (text.includes('powder') || text.includes('crystal') || text.includes('solid')) return 'solid';
    if (text.includes('solution') || text.includes('liquid')) return 'liquid';
    if (text.includes('gas')) return 'gas';
    
    return 'liquid'; // Default
  }
  
  /**
   * Extract composition/ingredients
   */
  extractComposition(lines) {
    const composition = [];
    const searchLines = Array.isArray(lines) ? lines : [lines];
    
    // First try: Look for CAS numbers as anchor points
    for (const line of searchLines) {
      const casMatch = line.match(/(\d{2,7}-\d{2}-\d)/);
      if (casMatch) {
        const cas = casMatch[1];
        
        // Try to extract name before CAS
        const beforeCas = line.substring(0, casMatch.index).trim();
        const nameMatch = beforeCas.match(/([a-zA-Z][a-zA-Z\s,'-]+)$/);
        const name = nameMatch ? nameMatch[1].trim() : 'Unknown Component';
        
        // Try to extract percentage after CAS
        const afterCas = line.substring(casMatch.index + cas.length).trim();
        const percentMatch = afterCas.match(/([\d.]+)\s*-?\s*([\d.]+)?\s*%/);
        const percentage = percentMatch ? percentMatch[0] : null;
        
        composition.push({
          name: name,
          cas: cas,
          percentage: percentage
        });
      }
    }
    
    return composition;
  }
  
  /**
   * Enhanced composition extraction with product name fallback
   */
  extractCompositionEnhanced(result) {
    let composition = [];
    
    // Try section 3 first
    if (result.sections['section3']) {
      composition = this.extractComposition(result.sections['section3']);
    }
    
    // If no composition found and we have a product name, try to extract from it
    if (composition.length === 0 && result.productName) {
      const productComposition = this.extractFromProductName(result.productName);
      if (productComposition.length > 0) {
        composition = productComposition;
      }
    }
    
    // Look for standalone CAS numbers elsewhere in the document
    if (composition.length === 0) {
      const allText = Object.values(result.sections).flat().join(' ');
      const casNumbers = this.findCASNumbers(allText);
      for (const cas of casNumbers) {
        // Try to find the chemical name associated with this CAS
        const chemicalName = this.findChemicalNameForCAS(allText, cas) || result.productName || 'Unknown Component';
        composition.push({
          name: chemicalName,
          cas: cas,
          percentage: '100%'
        });
        console.log(`📋 Found standalone CAS: ${cas} -> ${chemicalName}`);
      }
    }
    
    return composition;
  }
  
  /**
   * Extract composition from product name using known chemical patterns
   */
  extractFromProductName(productName) {
    const composition = [];
    const name = productName.toLowerCase().trim();
    
    // Comprehensive chemical name mappings with CAS numbers
    const chemicalMappings = {
      // Ketones
      'methyl ethyl ketone': '78-93-3',
      'mek': '78-93-3',
      '2-butanone': '78-93-3',
      'butanone': '78-93-3',
      'acetone': '67-64-1',
      'methyl isobutyl ketone': '108-10-1',
      'mibk': '108-10-1',
      'cyclohexanone': '108-94-1',
      
      // Chlorinated solvents
      'tetrachloroethylene': '127-18-4',
      'perchloroethylene': '127-18-4',
      'perc': '127-18-4',
      'pce': '127-18-4',
      'trichloroethylene': '79-01-6',
      'tce': '79-01-6',
      'methylene chloride': '75-09-2',
      'dichloromethane': '75-09-2',
      'carbon tetrachloride': '56-23-5',
      'chloroform': '67-66-3',
      
      // Aromatics
      'xylene': '1330-20-7',
      'toluene': '108-88-3',
      'benzene': '71-43-2',
      'ethylbenzene': '100-41-4',
      'styrene': '100-42-5',
      
      // Alcohols
      'methanol': '67-56-1',
      'ethanol': '64-17-5',
      'isopropyl alcohol': '67-63-0',
      'ipa': '67-63-0',
      'isopropanol': '67-63-0',
      'n-butanol': '71-36-3',
      'butanol': '71-36-3',
      'ethylene glycol': '107-21-1',
      
      // Aliphatic hydrocarbons
      'n-hexane': '110-54-3',
      'hexane': '110-54-3',
      'cyclohexane': '110-82-7',
      'heptane': '142-82-5',
      'n-heptane': '142-82-5',
      'octane': '111-65-9',
      'n-octane': '111-65-9',
      
      // Petroleum products
      'diesel fuel': '68476-34-6',
      'diesel': '68476-34-6',
      'gasoline': '86290-81-5',
      'paint thinner': '64742-95-6',
      'mineral spirits': '64742-88-7',
      'stoddard solvent': '8052-41-3',
      'vm&p naphtha': '64742-89-8',
      'naphtha': '64742-89-8',
      
      // Amines
      'trimethylamine': '75-50-3',
      'diethylamine': '109-89-7',
      'triethylamine': '121-44-8',
      'methylamine': '74-89-5',
      
      // Acids and bases
      'sodium hydroxide': '1310-73-2',
      'sulfuric acid': '7664-93-9',
      'hydrochloric acid': '7647-01-0',
      'nitric acid': '7697-37-2',
      'acetic acid': '64-19-7',
      'phosphoric acid': '7664-38-2',
      
      // Esters
      'ethyl acetate': '141-78-6',
      'butyl acetate': '123-86-4',
      'methyl acetate': '79-20-9',
      
      // Ethers
      'diethyl ether': '60-29-7',
      'methyl tert-butyl ether': '1634-04-4',
      'mtbe': '1634-04-4',
      
      // Specialty chemicals
      'formaldehyde': '50-00-0',
      'phenol': '108-95-2',
      'ammonia': '7664-41-7',
      'hydrogen peroxide': '7722-84-1'
    };
    
    // Check for direct matches (longest first to catch more specific names)
    const sortedChemicals = Object.keys(chemicalMappings).sort((a, b) => b.length - a.length);
    
    for (const chemical of sortedChemicals) {
      if (name.includes(chemical)) {
        composition.push({
          name: chemical,
          cas: chemicalMappings[chemical],
          percentage: '100%'
        });
        console.log(`📋 Found chemical match in product name: ${chemical} -> ${chemicalMappings[chemical]}`);
        break; // Only add one match from product name
      }
    }
    
    return composition;
  }
  
  /**
   * Find CAS numbers in text
   */
  findCASNumbers(text) {
    const casNumbers = [];
    const casPattern = /(\d{2,7}-\d{2}-\d)/g;
    let match;
    
    while ((match = casPattern.exec(text)) !== null) {
      casNumbers.push(match[1]);
    }
    
    return [...new Set(casNumbers)]; // Remove duplicates
  }
  
  /**
   * Find chemical name associated with a CAS number in text
   */
  findChemicalNameForCAS(text, cas) {
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes(cas)) {
        // Look for chemical name before CAS
        const beforeCas = line.substring(0, line.indexOf(cas)).trim();
        const namePatterns = [
          /([A-Za-z][A-Za-z\s,-]+)\s*$/,  // Name at end of line before CAS
          /Name:\s*([A-Za-z][A-Za-z\s,-]+)/i,  // "Name: Chemical Name"
          /Chemical:\s*([A-Za-z][A-Za-z\s,-]+)/i  // "Chemical: Chemical Name"
        ];
        
        for (const pattern of namePatterns) {
          const match = beforeCas.match(pattern);
          if (match && match[1] && match[1].trim().length > 2) {
            return match[1].trim();
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Clean extracted values
   */
  cleanValue(value) {
    if (!value) return null;
    
    // Remove common noise
    value = value.replace(/[\n\r\t]/g, ' ');
    value = value.replace(/\s+/g, ' ');
    value = value.trim();
    
    // Remove trailing punctuation
    value = value.replace(/[.:;,]$/, '');
    
    return value;
  }
  
  /**
   * Enhanced product name extraction with comprehensive fallback patterns
   */
  extractProductNameFallback(lines) {
    const patterns = [
      // Standard patterns (highest priority)
      /product\s*name\s*:?\s*(.+)/i,
      /material\s*name\s*:?\s*(.+)/i,
      /chemical\s*name\s*:?\s*(.+)/i,
      /trade\s*name\s*:?\s*(.+)/i,
      
      // Header patterns
      /SAFETY\s*DATA\s*SHEET\s*[:\-]?\s*(.+)/i,
      /MATERIAL\s*SAFETY.*SHEET\s*[:\-]?\s*(.+)/i,
      /SDS\s*[:\-]?\s*(.+)/i,
      
      // Product-specific patterns (known chemicals)
      /^(Paint\s+Thinner\b.*)/i,
      /^(Diesel\s+Fuel?\b.*)/i,
      /^(Gasoline\b.*)/i,
      /^(Methanol\b.*)/i,
      /^(Ethanol\b.*)/i,
      /^(Acetone\b.*)/i,
      /^(Toluene\b.*)/i,
      /^(Xylene\b.*)/i,
      /^(MEK\b.*|Methyl\s+Ethyl\s+Ketone\b.*)/i,
      /^(Tetrachloroethylene\b.*)/i,
      /^(Perchloroethylene\b.*)/i,
      /^(Trimethylamine\b.*)/i,
      /^(Caustic\s+Soda\b.*)/i,
      /^(Brake\s+Cleaner\b.*)/i,
      
      // Chemical name patterns (more restrictive)
      /^([A-Za-z]{3,}(?:[-\s][A-Za-z]{3,}){0,3})(?:\s+\d{1,3}%?)?$/
    ];
    
    for (const pattern of patterns) {
      for (const line of lines) {
        const cleanLine = line.trim();
        
        // More restrictive length check
        if (cleanLine.length < 3 || cleanLine.length > 80) continue;
        
        const match = cleanLine.match(pattern);
        if (match && match[1]) {
          let productName = match[1].trim();
          
          // Enhanced cleaning
          productName = productName.replace(/[{}()\[\]<>]/g, '');
          productName = productName.replace(/^\d+\.?\s*/, '');
          productName = productName.replace(/\s+/g, ' ');
          productName = productName.replace(/[.:;,]$/, ''); // Remove trailing punctuation
          
          // Enhanced filtering for invalid product names
          if (this.isInvalidProductName(productName)) {
            continue;
          }
          
          console.log(`📋 Found product name candidate: "${productName}" from line: "${cleanLine}"`);
          return productName;
        }
      }
    }
    
    return 'Unknown Product';
  }

  /**
   * Check if extracted text is an invalid product name
   */
  isInvalidProductName(productName) {
    const name = productName.toLowerCase().trim();
    
    // Skip if too short or too long
    if (name.length < 3 || name.length > 60) return true;
    
    // Skip if it's just numbers, dates, or special characters
    if (/^\d+[.\-\/\s\d]*$/.test(name)) return true;
    
    // Skip common document headers/footers
    const invalidPatterns = [
      /^(section|page|date|version|revision|sds|msds)$/i,
      /^(safety|data|sheet|material)$/i,
      /^(company|manufacturer|supplier)$/i,
      /^(emergency|telephone|number|phone)$/i,
      /^(printed|issued|revised|prepared)$/i,
      /^(www\.|http|\.com|\.org)$/i,
      /^(to\s+the\s+doctor|in\s+attendance|contact\s+a|to\s+the\s+doctor\s+in\s+attendance|to\s+the\s+doctor\s+in)$/i,
      /^(call\s+|dial\s+|phone\s+)$/i,
      /^(first\s+aid|medical|treatment)$/i,
      /^(poison\s+control|emergency\s+response)$/i,
      /^(immediately|seek|medical|attention)$/i,
      /^(,\s*supplied\s+by|supplied\s+by\s+us|supplied\s+by\s+us\s+and|safety\s+data\s+sheet)$/i,
      // Additional patterns for common invalid extractions
      /^(,\s*supplied\s+by.*|.*supplied\s+by\s+us.*|.*\s+and\s*$)$/i,
      /^(contact\s+|in\s+case\s+of|if\s+inhaled|if\s+swallowed)$/i,
      /^(remove\s+|wash\s+|rinse\s+|take\s+off)$/i,
      /^(transport\s+|storage\s+|handling\s+|disposal)$/i,
      /^(precautionary\s+|warning\s+|danger\s+|caution)$/i,
      /^(statement|statements|hazard|hazards)$/i,
      /^(classification|class|category|categories)$/i,
      /^(label\s+elements|pictogram|pictograms)$/i,
      /^(signal\s+word|ghs|un\s+number|proper\s+shipping)$/i,
      /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,  // dates
      /^[\d\s\-()]+$/,  // phone numbers
      /^[a-f0-9]{8,}$/i,  // hex codes
      // Patterns for partial sentences or fragments
      /^(and\s+|or\s+|the\s+|of\s+|in\s+|at\s+|on\s+|for\s+|with\s+|by\s+)$/i,
      /^\s*[,\.\-\+\=\(\)\[\]]\s*$/,  // Just punctuation
      /^(not\s+classified|not\s+available|not\s+applicable|n\/a)$/i
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(name)) {
        console.log(`❌ Rejected product name candidate: "${productName}" (matches invalid pattern)`);
        return true;
      }
    }
    
    // Skip if it contains too many non-alphabetic characters
    const alphaRatio = (name.match(/[a-zA-Z]/g) || []).length / name.length;
    if (alphaRatio < 0.6) {
      console.log(`❌ Rejected product name candidate: "${productName}" (low alphabetic ratio: ${alphaRatio})`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Validate extraction results
   */
  validateExtraction(result) {
    // Check individual essential datapoints
    const hasProductName = result.productName && result.productName !== 'Unknown Product';
    const hasComposition = result.composition.length > 0;
    const hasPhysicalData = result.flashPoint || result.pH || result.boilingPoint || result.meltingPoint;
    const hasHazardData = result.hazardStatements.length > 0 || result.unNumber;
    const hasManufacturer = result.manufacturer && result.manufacturer !== '';
    
    // Identify missing critical datapoints
    const missingDatapoints = [];
    
    if (!hasProductName) {
      missingDatapoints.push({
        field: 'productName',
        label: 'Product Name',
        description: 'Chemical or product name (Section 1)',
        critical: true
      });
    }
    
    if (!hasComposition) {
      missingDatapoints.push({
        field: 'composition',
        label: 'Chemical Composition',
        description: 'Chemical constituents with CAS numbers (Section 3)',
        critical: true
      });
    }
    
    if (!hasPhysicalData) {
      missingDatapoints.push({
        field: 'physicalProperties',
        label: 'Physical Properties',
        description: 'Flash point, boiling point, pH, etc. (Section 9)',
        critical: false
      });
    }
    
    if (!hasHazardData) {
      missingDatapoints.push({
        field: 'hazardData',
        label: 'Hazard Information',
        description: 'Hazard statements, UN numbers (Section 2)',
        critical: false
      });
    }
    
    // Valid if we have at least product name OR composition
    const isValid = hasProductName || hasComposition;
    
    console.log(`📊 Validation: valid=${isValid}, missing=${missingDatapoints.length} datapoints`);
    
    return {
      isValid: isValid,
      missingDatapoints: missingDatapoints,
      hasProductName: hasProductName,
      hasComposition: hasComposition,
      hasPhysicalData: hasPhysicalData,
      hasHazardData: hasHazardData,
      needsManualEntry: missingDatapoints.filter(d => d.critical).length > 0
    };
  }
}

export default new JSONSDSExtractor();