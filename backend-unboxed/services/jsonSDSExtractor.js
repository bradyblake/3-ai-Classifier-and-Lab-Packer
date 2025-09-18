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
        /trade\s*name\s*:?\s*(.+)/i
      ]);
      
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
    
    // Extract from Section 3 - Composition
    if (result.sections['section3']) {
      result.composition = this.extractComposition(result.sections['section3']);
    }
    
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
    
    // Fallback: Search entire text if section extraction failed
    if (!result.productName) {
      result.productName = this.extractField(lines, [
        /product\s*name\s*:?\s*(.+)/i,
        /material\s*name\s*:?\s*(.+)/i
      ]) || 'Unknown Product';
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
    
    // Add validation flag
    result.isValid = this.validateExtraction(result);
    
    console.log('📊 Validation result:', result.isValid);
    
    console.log('✅ JSON extraction complete:', {
      productName: result.productName,
      flashPoint: result.flashPoint,
      pH: result.pH,
      compositionCount: result.composition.length,
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
    
    for (const line of lines) {
      const sectionMatch = line.match(/section\s*(\d+)/i);
      
      if (sectionMatch) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          sections[`section${currentSection}`] = sectionContent;
        }
        
        // Start new section
        currentSection = sectionMatch[1];
        sectionContent = [line];
      } else if (currentSection) {
        sectionContent.push(line);
      }
    }
    
    // Save last section
    if (currentSection && sectionContent.length > 0) {
      sections[`section${currentSection}`] = sectionContent;
    }
    
    return sections;
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
    
    for (const line of searchLines) {
      // Look for CAS numbers as anchor points
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
   * Validate extraction results
   */
  validateExtraction(result) {
    // Must have at least product name
    if (!result.productName || result.productName === 'Unknown Product') {
      return false;
    }
    
    // Should have at least one physical property
    const hasPhysicalData = result.flashPoint || result.pH || result.boilingPoint || result.meltingPoint;
    
    // Should have some hazard data or composition
    const hasHazardData = result.hazardStatements.length > 0 || 
                         result.composition.length > 0 ||
                         result.unNumber;
    
    return hasPhysicalData || hasHazardData;
  }
}

export default new JSONSDSExtractor();