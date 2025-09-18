// Custom SDS Analysis Engine for Revolutionary Classifier
// Advanced SDS parsing and analysis capabilities

export const parseSDSDocument = (sdsText) => {
  const sections = {
    productIdentification: extractProductIdentification(sdsText),
    hazardIdentification: extractHazardIdentification(sdsText),
    composition: extractComposition(sdsText),
    firstAidMeasures: extractFirstAidMeasures(sdsText),
    firefightingMeasures: extractFirefightingMeasures(sdsText),
    physicalChemicalProperties: extractPhysicalChemicalProperties(sdsText),
    stabilityReactivity: extractStabilityReactivity(sdsText),
    toxicologicalInformation: extractToxicologicalInformation(sdsText)
  };
  
  return {
    sections,
    extractionQuality: calculateExtractionQuality(sections),
    hazardClassification: classifyHazards(sections),
    regulatoryInfo: extractRegulatoryInformation(sections)
  };
};

const extractProductIdentification = (text) => {
  const patterns = {
    productName: [
      /product\s+name\s*:?\s*(.+)/i,
      /trade\s+name\s*:?\s*(.+)/i,
      /commercial\s+name\s*:?\s*(.+)/i,
      /material\s+name\s*:?\s*(.+)/i,
      /^1\.\s*product\s+identification[:\s]*(.+?)(?=\n|$)/mi,
      /section\s+1[:\s]*product\s+identification[:\s]*(.+?)(?=\n|$)/mi
    ],
    manufacturer: [
      /manufacturer\s*:?\s*(.+)/i,
      /company\s+name\s*:?\s*(.+)/i,
      /supplier\s*:?\s*(.+)/i
    ],
    casNumber: [
      /cas\s+(?:no|number)\s*:?\s*(\d{1,7}-\d{2}-\d)/i,
      /cas\s*#\s*:?\s*(\d{1,7}-\d{2}-\d)/i
    ]
  };
  
  const result = {};
  for (const [key, patternArray] of Object.entries(patterns)) {
    for (const pattern of patternArray) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        result[key] = match[1].trim().replace(/[:\s]+$/, ''); // Remove trailing colons and spaces
        break; // Use first successful match
      }
    }
  }
  
  return result;
};

const extractHazardIdentification = (text) => {
  const hazardPatterns = {
    ghs: [
      /GHS\s*(\d+)/gi,
      /globally\s+harmonized\s+system[^:\n]*:?\s*([^:\n]+)/gi
    ],
    signal: [
      /signal\s+word\s*:?\s*(danger|warning)/gi,
      /signal[^:\n]*:?\s*(danger|warning)/gi
    ],
    hazardStatements: [
      /H\d{3}(?:\s*[-:]\s*[^:\n]+)?/gi,
      /hazard\s+statement[^:\n]*:?\s*([^:\n]+)/gi,
      /h-statements?[^:\n]*:?\s*([^:\n]+)/gi
    ],
    precautionaryStatements: [
      /P\d{3}(?:\s*[-:]\s*[^:\n]+)?/gi,
      /precautionary\s+statement[^:\n]*:?\s*([^:\n]+)/gi,
      /p-statements?[^:\n]*:?\s*([^:\n]+)/gi
    ],
    hazardClass: [
      /hazard\s+class(?:ification)?[^:\n]*:?\s*([^:\n]+)/gi,
      /classification[^:\n]*:?\s*([^:\n]+)/gi
    ],
    pictograms: [
      /pictogram[s]?[^:\n]*:?\s*([^:\n]+)/gi,
      /symbol[s]?[^:\n]*:?\s*([^:\n]+)/gi
    ],
    routeOfExposure: [
      /route\s+of\s+exposure[^:\n]*:?\s*([^:\n]+)/gi,
      /exposure\s+route[^:\n]*:?\s*([^:\n]+)/gi
    ],
    healthHazards: [
      /health\s+hazard[^:\n]*:?\s*([^:\n]+)/gi,
      /acute\s+health\s+effect[^:\n]*:?\s*([^:\n]+)/gi,
      /chronic\s+health\s+effect[^:\n]*:?\s*([^:\n]+)/gi,
      /target\s+organ[^:\n]*:?\s*([^:\n]+)/gi
    ],
    physicalHazards: [
      /physical\s+hazard[^:\n]*:?\s*([^:\n]+)/gi,
      /fire\s+hazard[^:\n]*:?\s*([^:\n]+)/gi,
      /explosion\s+hazard[^:\n]*:?\s*([^:\n]+)/gi,
      /reactive\s+hazard[^:\n]*:?\s*([^:\n]+)/gi
    ]
  };
  
  const result = {};
  for (const [key, patterns] of Object.entries(hazardPatterns)) {
    const allMatches = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        allMatches.push(...matches.map(m => m.trim()));
      }
    }
    
    // Remove duplicates and clean up
    result[key] = [...new Set(allMatches)].filter(match => match && match.length > 0);
  }
  
  return result;
};

const extractComposition = (text) => {
  const components = [];
  const lines = text.split('\n');
  
  // Enhanced patterns for better ingredient/constituent detection
  const patterns = [
    // Name, CAS, percentage
    /([A-Za-z\s,\-()]+)\s+(\d{1,7}-\d{2}-\d)\s+([\d.]+(?:-[\d.]+)?)\s*%/i,
    // CAS first, then name, then percentage  
    /(\d{1,7}-\d{2}-\d)\s+([A-Za-z\s,\-()]+)\s+([\d.]+(?:-[\d.]+)?)\s*%/i,
    // Tabulated format with colons
    /([A-Za-z\s,\-()]+):\s*(\d{1,7}-\d{2}-\d)\s*[:\s]*([\d.]+(?:-[\d.]+)?)\s*%/i,
    // Ingredient/Component keyword
    /(?:ingredient|component|constituent)[:\s]*([A-Za-z\s,\-()]+)\s+(\d{1,7}-\d{2}-\d)\s+([\d.]+(?:-[\d.]+)?)\s*%/i
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Determine which captured groups are name, CAS, and percentage
        let name, casNumber, percentage;
        
        if (pattern === patterns[1]) { // CAS first pattern
          casNumber = match[1];
          name = match[2].trim();
          percentage = match[3];
        } else {
          name = match[1].trim();
          casNumber = match[2];
          percentage = match[3];
        }
        
        // Clean up name - remove common prefixes/suffixes
        name = name.replace(/^(ingredient|component|constituent|chemical)[:\s]*/i, '').trim();
        
        // Parse percentage range if needed
        const percentageValue = percentage.includes('-') 
          ? parseFloat(percentage.split('-')[1]) // Use upper bound for ranges
          : parseFloat(percentage);
        
        if (name && casNumber && !isNaN(percentageValue)) {
          components.push({
            name: name,
            casNumber: casNumber,
            percentage: percentageValue,
            originalLine: line.trim()
          });
          break; // Only use first matching pattern per line
        }
      }
    }
  }
  
  // Also look for section 3 composition data more broadly
  const section3Match = text.match(/section\s+3[:\s]*(?:composition|ingredients)[^]*?(?=section\s+[4-9]|$)/i);
  if (section3Match && components.length === 0) {
    // Try simpler CAS extraction from section 3
    const casMatches = section3Match[0].match(/(\d{1,7}-\d{2}-\d)/g);
    if (casMatches) {
      casMatches.forEach(cas => {
        // Look for chemical name near this CAS number
        const casContext = section3Match[0].split(cas);
        if (casContext.length > 1) {
          const beforeCas = casContext[0].slice(-50).trim();
          const afterCas = casContext[1].slice(0, 50).trim();
          
          // Extract likely chemical name
          const nameMatch = beforeCas.match(/([A-Za-z\s,\-()]{5,})$/i) || 
                           afterCas.match(/^([A-Za-z\s,\-()]{5,})/i);
          
          if (nameMatch) {
            components.push({
              name: nameMatch[1].trim(),
              casNumber: cas,
              percentage: null, // No percentage found
              originalLine: `${beforeCas} ${cas} ${afterCas}`.trim().slice(0, 100)
            });
          }
        }
      });
    }
  }
  
  return components;
};

const extractFirstAidMeasures = (text) => {
  const sections = ['eye contact', 'skin contact', 'inhalation', 'ingestion'];
  const result = {};
  
  sections.forEach(section => {
    const pattern = new RegExp(`${section}\\s*:?\\s*([^\\n]+(?:\\n[^\\n:]+)*)`, 'i');
    const match = text.match(pattern);
    if (match) {
      result[section.replace(' ', '_')] = match[1].trim();
    }
  });
  
  return result;
};

const extractFirefightingMeasures = (text) => {
  return {
    extinguishingMedia: extractByPattern(text, /extinguishing\s+media\s*:?\s*([^\\n]+)/i),
    specificHazards: extractByPattern(text, /specific\s+hazards\s*:?\s*([^\\n]+)/i)
  };
};

const extractPhysicalChemicalProperties = (text) => {
  // Enhanced patterns with multiple alternatives for better extraction
  const propertyPatterns = {
    physicalState: [
      /physical\s+state\s*:?\s*([^:\n]+)/i,
      /form\s*:?\s*(solid|liquid|gas|powder|granules?|pellets?|flakes?|crystals?)[^:\n]*/i,
      /appearance\s*:?\s*([^:\n]+?)(?=\s*(?:color|colour|odor|odour|ph|$))/i,
      /state\s*:?\s*(solid|liquid|gas)[^:\n]*/i
    ],
    color: [
      /colou?r\s*:?\s*([^:\n]+)/i,
      /appearance[^:\n]*colou?r[^:\n]*:?\s*([^:\n]+)/i
    ],
    odor: [
      /odou?r\s*:?\s*([^:\n]+)/i,
      /smell\s*:?\s*([^:\n]+)/i
    ],
    pH: [
      /ph\s*:?\s*([\d.]+(?:\s*-\s*[\d.]+)?)/i,
      /ph\s+value\s*:?\s*([\d.]+(?:\s*-\s*[\d.]+)?)/i,
      /ph\s*\(\s*\d+%?\s*solution\)\s*:?\s*([\d.]+(?:\s*-\s*[\d.]+)?)/i
    ],
    meltingPoint: [
      /melting\s+point\s*:?\s*([\d.\-\s°CF]+)/i,
      /m\.?p\.?\s*:?\s*([\d.\-\s°CF]+)/i,
      /freezing\s+point\s*:?\s*([\d.\-\s°CF]+)/i
    ],
    boilingPoint: [
      /boiling\s+point\s*:?\s*([\d.\-\s°CF]+)/i,
      /b\.?p\.?\s*:?\s*([\d.\-\s°CF]+)/i,
      /initial\s+boiling\s+point\s*:?\s*([\d.\-\s°CF]+)/i
    ],
    flashPoint: [
      /flash\s+point\s*:?\s*([\d.\-\s°CF]+)/i,
      /f\.?p\.?\s*:?\s*([\d.\-\s°CF]+)/i,
      /flash\s*:?\s*([\d.\-\s°CF]+)/i,
      /closed\s+cup\s*:?\s*([\d.\-\s°CF]+)/i,
      /open\s+cup\s*:?\s*([\d.\-\s°CF]+)/i
    ],
    density: [
      /density\s*:?\s*([\d.]+(?:\s*g\/ml|g\/cm³|kg\/m³)?)/i,
      /specific\s+gravity\s*:?\s*([\d.]+)/i,
      /bulk\s+density\s*:?\s*([\d.]+)/i
    ],
    solubility: [
      /solubility\s*:?\s*([^:\n]+)/i,
      /water\s+solubility\s*:?\s*([^:\n]+)/i,
      /soluble\s*:?\s*([^:\n]+)/i
    ]
  };
  
  const properties = {};
  
  // Try all patterns for each property
  for (const [property, patterns] of Object.entries(propertyPatterns)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        properties[property] = match[1].trim().replace(/[:\s]+$/, '');
        break; // Use first successful match
      }
    }
  }
  
  // Post-process specific properties
  if (properties.physicalState) {
    // Standardize common physical states
    const state = properties.physicalState.toLowerCase();
    if (state.includes('solid') || state.includes('powder') || state.includes('crystal') || 
        state.includes('granule') || state.includes('pellet') || state.includes('flake')) {
      properties.physicalState = 'Solid';
    } else if (state.includes('liquid')) {
      properties.physicalState = 'Liquid';
    } else if (state.includes('gas') || state.includes('vapor') || state.includes('vapour')) {
      properties.physicalState = 'Gas';
    }
  }
  
  // Standardize temperature units to Celsius for flash point (important for classification)
  if (properties.flashPoint) {
    const fp = properties.flashPoint;
    // Convert Fahrenheit to Celsius if needed
    const fahrenheitMatch = fp.match(/([\d.\-]+)\s*°?F/i);
    if (fahrenheitMatch) {
      const fahrenheit = parseFloat(fahrenheitMatch[1]);
      const celsius = Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10;
      properties.flashPoint = `${celsius}°C`;
    } else if (!fp.includes('°C') && /^[\d.\-]+$/.test(fp.trim())) {
      // Assume Celsius if just a number
      properties.flashPoint = `${fp.trim()}°C`;
    }
  }
  
  // Clean pH ranges to use upper bound for conservative classification
  if (properties.pH && properties.pH.includes('-')) {
    const range = properties.pH.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (range) {
      // For classification purposes, use the more extreme value
      const lower = parseFloat(range[1]);
      const upper = parseFloat(range[2]);
      // If range spans neutral, use the extreme value
      if (lower <= 7 && upper >= 7) {
        properties.pH = Math.abs(lower - 7) > Math.abs(upper - 7) ? lower.toString() : upper.toString();
      } else {
        properties.pH = upper.toString(); // Use upper bound
      }
    }
  }
  
  return properties;
};

const extractStabilityReactivity = (text) => {
  return {
    stability: extractByPattern(text, /stability\s*:?\s*([^\\n]+)/i),
    reactivity: extractByPattern(text, /reactivity\s*:?\s*([^\\n]+)/i),
    incompatibleMaterials: extractByPattern(text, /incompatible\s+materials\s*:?\s*([^\\n]+)/i)
  };
};

const extractToxicologicalInformation = (text) => {
  return {
    acuteToxicity: extractByPattern(text, /acute\s+toxicity\s*:?\s*([^\\n]+)/i),
    chronicToxicity: extractByPattern(text, /chronic\s+toxicity\s*:?\s*([^\\n]+)/i),
    carcinogenicity: extractByPattern(text, /carcinogen/i) ? 'Potential carcinogen' : 'Not classified'
  };
};

const extractByPattern = (text, pattern) => {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
};

const calculateExtractionQuality = (sections) => {
  let score = 0;
  let maxScore = 0;
  
  Object.values(sections).forEach(section => {
    if (typeof section === 'object' && section !== null) {
      const keys = Object.keys(section);
      maxScore += keys.length;
      score += keys.filter(key => section[key] && section[key] !== '').length;
    }
  });
  
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};

const classifyHazards = (sections) => {
  const hazards = [];
  
  // Check for flammability
  if (sections.physicalChemicalProperties?.flashPoint) {
    const flashPoint = parseFloat(sections.physicalChemicalProperties.flashPoint);
    if (flashPoint < 60) {
      hazards.push('D001 - Ignitable');
    }
  }
  
  // Check for corrosivity
  if (sections.physicalChemicalProperties?.pH) {
    const pH = parseFloat(sections.physicalChemicalProperties.pH);
    if (pH <= 2 || pH >= 12.5) {
      hazards.push('D002 - Corrosive');
    }
  }
  
  // Check for reactivity
  if (sections.stabilityReactivity?.reactivity?.toLowerCase().includes('reactive') ||
      sections.stabilityReactivity?.incompatibleMaterials?.toLowerCase().includes('water')) {
    hazards.push('D003 - Reactive');
  }
  
  return hazards;
};

const extractRegulatoryInformation = (sections) => {
  return {
    dotShippingName: 'To be determined based on classification',
    rcraWasteCodes: classifyHazards(sections),
    cerclaReportableQuantity: 'Check specific regulations',
    stateRegulations: 'Consult state-specific requirements'
  };
};

const customSDSEngine = {
  parseSDSDocument,
  extractProductIdentification,
  extractHazardIdentification,
  extractComposition,
  extractPhysicalChemicalProperties,
  classifyHazards,
  
  // Enhanced extract method for bulletproofSDSAnalyzer compatibility with comprehensive classification data
  extract: (sdsText) => {
    const parsed = parseSDSDocument(sdsText);
    
    return {
      // Primary identification
      productName: parsed.sections.productIdentification?.productName || 'Unknown Product',
      manufacturer: parsed.sections.productIdentification?.manufacturer || null,
      
      // Composition and ingredients with CAS numbers
      composition: parsed.sections.composition?.components || [],
      casNumbers: parsed.sections.composition?.components?.map(c => c.casNumber).filter(Boolean) || [],
      
      // Critical physical properties for classification
      physicalState: parsed.sections.physicalChemicalProperties?.physicalState || 'unknown',
      pH: parsed.sections.physicalChemicalProperties?.pH || null,
      flashPoint: parsed.sections.physicalChemicalProperties?.flashPoint || null,
      
      // Additional physical properties
      density: parsed.sections.physicalChemicalProperties?.density || null,
      boilingPoint: parsed.sections.physicalChemicalProperties?.boilingPoint || null,
      meltingPoint: parsed.sections.physicalChemicalProperties?.meltingPoint || null,
      solubility: parsed.sections.physicalChemicalProperties?.solubility || null,
      color: parsed.sections.physicalChemicalProperties?.color || null,
      
      // Hazard information for classification
      hazards: {
        signal: parsed.sections.hazardIdentification?.signal || [],
        hazardStatements: parsed.sections.hazardIdentification?.hazardStatements || [],
        precautionaryStatements: parsed.sections.hazardIdentification?.precautionaryStatements || [],
        hazardClass: parsed.sections.hazardIdentification?.hazardClass || [],
        physicalHazards: parsed.sections.hazardIdentification?.physicalHazards || [],
        healthHazards: parsed.sections.hazardIdentification?.healthHazards || [],
        pictograms: parsed.sections.hazardIdentification?.pictograms || []
      },
      
      // Classification results
      hazardClassification: parsed.hazardClassification || [],
      
      // Regulatory information
      unNumber: parsed.regulatoryInfo?.unNumber || null,
      rcraWasteCodes: parsed.regulatoryInfo?.rcraWasteCodes || [],
      dotShippingName: parsed.regulatoryInfo?.dotShippingName || null,
      
      // Quality metrics
      extractionQuality: parsed.extractionQuality || 0,
      
      // Raw data for fallback processing
      originalLines: sdsText.split('\n'),
      fullText: sdsText,
      sections: parsed.sections,
      
      // Processing metadata
      processingMethod: 'customSDSEngine',
      extractedAt: new Date().toISOString()
    };
  }
};

export { customSDSEngine };
export default customSDSEngine;