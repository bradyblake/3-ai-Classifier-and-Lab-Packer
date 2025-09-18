// Multi-Attempt SDS Parser - Tries multiple extraction methods before prompting user
// Ensures maximum data extraction accuracy through systematic fallback approaches

import AIProviderService from './aiProviders.js';

class MultiAttemptParser {
  constructor() {
    this.aiProviders = new AIProviderService();
    this.extractionAttempts = [
      'sectionBased',      // Try structured section extraction first
      'keywordSearch',     // Search for key terms throughout document  
      'aiInference',       // Use AI to infer missing values from context
      'patternMatching',   // Use regex patterns for specific data types
      'crossReference'     // Cross-reference with similar materials
    ];
  }

  /**
   * Parse SDS with multiple attempts before requesting user input
   */
  async parseWithMultipleAttempts(rawText, options = {}) {
    const results = {
      productName: null,
      physicalState: null,
      flashPoint: null,
      pH: null,
      unNumber: null,
      hazardClass: null,
      packingGroup: null,
      composition: [],
      dataGaps: [],
      parsingAttempts: [],
      confidence: 0
    };

    console.log('🔍 Starting multi-attempt parsing process...');

    // Attempt 1: Section-based extraction
    try {
      const sectionResult = await this.attemptSectionBasedExtraction(rawText);
      this.mergeResults(results, sectionResult, 'sectionBased');
    } catch (error) {
      results.parsingAttempts.push({
        method: 'sectionBased',
        status: 'failed',
        error: error.message
      });
    }

    // Attempt 2: Keyword search for missing data
    if (this.hasGaps(results)) {
      try {
        const keywordResult = await this.attemptKeywordSearch(rawText, results.dataGaps);
        this.mergeResults(results, keywordResult, 'keywordSearch');
      } catch (error) {
        results.parsingAttempts.push({
          method: 'keywordSearch',
          status: 'failed',
          error: error.message
        });
      }
    }

    // Attempt 3: AI inference for remaining gaps
    if (this.hasGaps(results)) {
      try {
        const inferenceResult = await this.attemptAIInference(rawText, results);
        this.mergeResults(results, inferenceResult, 'aiInference');
      } catch (error) {
        results.parsingAttempts.push({
          method: 'aiInference',
          status: 'failed',
          error: error.message
        });
      }
    }

    // Attempt 4: Pattern matching for specific data types
    if (this.hasGaps(results)) {
      try {
        const patternResult = await this.attemptPatternMatching(rawText, results.dataGaps);
        this.mergeResults(results, patternResult, 'patternMatching');
      } catch (error) {
        results.parsingAttempts.push({
          method: 'patternMatching',
          status: 'failed',
          error: error.message
        });
      }
    }

    // Attempt 5: Cross-reference with known materials
    if (this.hasGaps(results)) {
      try {
        const crossRefResult = await this.attemptCrossReference(results);
        this.mergeResults(results, crossRefResult, 'crossReference');
      } catch (error) {
        results.parsingAttempts.push({
          method: 'crossReference',
          status: 'failed',
          error: error.message
        });
      }
    }

    // Calculate final confidence and identify remaining gaps
    results.confidence = this.calculateConfidence(results);
    results.dataGaps = this.identifyDataGaps(results);
    results.userInputRequired = results.dataGaps.length > 0;

    console.log(`✅ Multi-attempt parsing complete. Confidence: ${results.confidence}%`);
    console.log(`📋 Data gaps: ${results.dataGaps.length > 0 ? results.dataGaps.join(', ') : 'None'}`);

    return results;
  }

  /**
   * Attempt 1: Section-based extraction from structured SDS
   */
  async attemptSectionBasedExtraction(rawText) {
    const result = {};
    
    // Extract product name from Section 1
    const productMatch = rawText.match(/(?:product\s+name|trade\s+name)[:\s]+(.+?)(?:\n|manufacturer)/i);
    if (productMatch) {
      result.productName = productMatch[1].trim();
    }

    // Extract physical state from Section 9
    const physicalStateMatch = rawText.match(/(?:physical\s+state|appearance|form)[:\s]+(.+?)(?:\n|color)/i);
    if (physicalStateMatch) {
      result.physicalState = this.normalizePhysicalState(physicalStateMatch[1]);
    }

    // Extract flash point from Section 9
    const flashPointMatches = [
      /flash\s*point[:\s]*([<>≥≤]?\s*\d+(?:\.\d+)?)(?:\s*°?[CF])/i,
      /fp[:\s]*([<>≥≤]?\s*\d+(?:\.\d+)?)(?:\s*°?[CF])/i,
      /closed\s+cup[:\s]*([<>≥≤]?\s*\d+(?:\.\d+)?)(?:\s*°?[CF])/i
    ];

    for (const pattern of flashPointMatches) {
      const match = rawText.match(pattern);
      if (match) {
        result.flashPoint = this.parseFlashPoint(match[1]);
        break;
      }
    }

    // Extract pH from Section 9
    const pHMatches = [
      /ph[:\s]*([<>≥≤]?\s*\d+(?:\.\d+)?)/i,
      /hydrogen\s+ion[:\s]*([<>≥≤]?\s*\d+(?:\.\d+)?)/i
    ];

    for (const pattern of pHMatches) {
      const match = rawText.match(pattern);
      if (match) {
        result.pH = this.parsePH(match[1]);
        break;
      }
    }

    // Extract UN number from Section 14
    const unMatch = rawText.match(/un\s*(\d{4})/i);
    if (unMatch) {
      result.unNumber = `UN${unMatch[1]}`;
    }

    return result;
  }

  /**
   * Attempt 2: Keyword search throughout document for missing data
   */
  async attemptKeywordSearch(rawText, gaps) {
    const result = {};
    
    if (gaps.includes('physicalState')) {
      // Look for physical state keywords anywhere in document
      const stateKeywords = {
        liquid: ['liquid', 'fluid', 'solution', 'aqueous'],
        solid: ['solid', 'powder', 'pellets', 'beads', 'granules', 'crystals'],
        gas: ['gas', 'gaseous', 'vapor'],
        aerosol: ['aerosol', 'spray can', 'pressurized container', 'propellant']
      };

      for (const [state, keywords] of Object.entries(stateKeywords)) {
        const found = keywords.some(keyword => 
          rawText.toLowerCase().includes(keyword.toLowerCase())
        );
        if (found) {
          result.physicalState = state;
          break;
        }
      }
    }

    if (gaps.includes('flashPoint')) {
      // More aggressive flash point search
      const flashPatterns = [
        /(\d+)\s*°?[CF].*flash/i,
        /flash.*(\d+)\s*°?[CF]/i,
        /ignition.*(\d+)\s*°?[CF]/i,
        /flammable.*(\d+)\s*°?[CF]/i
      ];

      for (const pattern of flashPatterns) {
        const match = rawText.match(pattern);
        if (match) {
          result.flashPoint = this.parseFlashPoint(match[1]);
          break;
        }
      }
    }

    return result;
  }

  /**
   * Attempt 3: AI inference for missing values based on context
   */
  async attemptAIInference(rawText, currentResults) {
    const prompt = `Based on this SDS document, please infer the missing data fields:

Current data: ${JSON.stringify(currentResults, null, 2)}

SDS Content:
${rawText.substring(0, 3000)}

Please provide your best inference for any missing fields based on:
1. Chemical composition and properties
2. Product type and intended use  
3. Industry standards for similar materials
4. Physical and chemical properties described

Return only JSON with inferred values and confidence levels.`;

    try {
      const response = await this.aiProviders.analyze(prompt, 'groq', { 
        mode: 'inference',
        temperature: 0.1 
      });
      
      // Parse AI response for inferred values
      const inferredData = this.parseAIInference(response);
      return inferredData;
    } catch (error) {
      console.warn('AI inference failed:', error.message);
      return {};
    }
  }

  /**
   * Attempt 4: Advanced pattern matching for specific data types
   */
  async attemptPatternMatching(rawText, gaps) {
    const result = {};

    if (gaps.includes('pH')) {
      // Advanced pH patterns
      const pHPatterns = [
        /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:ph|pH)/i, // pH range
        /(?:ph|pH).*?(\d+(?:\.\d+)?)/i,                        // pH followed by number
        /acid.*?(\d+(?:\.\d+)?)/i,                             // Acidic context
        /alkaline.*?(\d+(?:\.\d+)?)/i                          // Alkaline context
      ];

      for (const pattern of pHPatterns) {
        const match = rawText.match(pattern);
        if (match) {
          result.pH = parseFloat(match[1]);
          break;
        }
      }
    }

    return result;
  }

  /**
   * Attempt 5: Cross-reference with known material database
   */
  async attemptCrossReference(currentResults) {
    const result = {};
    
    // Known material defaults based on common products
    const knownMaterials = {
      'acetone': {
        physicalState: 'liquid',
        flashPoint: { celsius: -18, fahrenheit: 0 },
        unNumber: 'UN1090'
      },
      'paint thinner': {
        physicalState: 'liquid',
        flashPoint: { celsius: 40, fahrenheit: 104 },
        unNumber: 'UN1300'
      },
      'mineral spirits': {
        physicalState: 'liquid',
        flashPoint: { celsius: 38, fahrenheit: 100 },
        unNumber: 'UN1300'
      },
      'caustic soda': {
        physicalState: 'solid',
        pH: 13,
        unNumber: 'UN1823'
      }
    };

    const productName = currentResults.productName?.toLowerCase() || '';
    
    for (const [material, properties] of Object.entries(knownMaterials)) {
      if (productName.includes(material)) {
        Object.assign(result, properties);
        break;
      }
    }

    return result;
  }

  // Helper methods
  mergeResults(target, source, method) {
    let fieldsAdded = 0;
    
    for (const [key, value] of Object.entries(source)) {
      if (value !== null && value !== undefined && !target[key]) {
        target[key] = value;
        fieldsAdded++;
      }
    }

    target.parsingAttempts.push({
      method,
      status: fieldsAdded > 0 ? 'success' : 'no_new_data',
      fieldsAdded
    });
  }

  hasGaps(results) {
    const criticalFields = ['productName', 'physicalState', 'flashPoint', 'pH'];
    return criticalFields.some(field => !results[field]);
  }

  identifyDataGaps(results) {
    const gaps = [];
    const criticalFields = {
      productName: 'Product Name',
      physicalState: 'Physical State',
      flashPoint: 'Flash Point',
      pH: 'pH Value'
    };

    for (const [field, description] of Object.entries(criticalFields)) {
      if (!results[field]) {
        gaps.push(description);
      }
    }

    return gaps;
  }

  calculateConfidence(results) {
    const totalFields = 8; // productName, physicalState, flashPoint, pH, unNumber, hazardClass, packingGroup, composition
    let filledFields = 0;
    
    if (results.productName) filledFields++;
    if (results.physicalState) filledFields++;
    if (results.flashPoint) filledFields++;
    if (results.pH) filledFields++;
    if (results.unNumber) filledFields++;
    if (results.hazardClass) filledFields++;
    if (results.packingGroup) filledFields++;
    if (results.composition?.length > 0) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  }

  normalizePhysicalState(rawState) {
    const normalized = rawState.toLowerCase().trim();
    
    if (normalized.includes('liquid') || normalized.includes('fluid')) return 'liquid';
    if (normalized.includes('solid') || normalized.includes('powder') || 
        normalized.includes('pellet') || normalized.includes('bead')) return 'solid';
    if (normalized.includes('gas') || normalized.includes('vapor')) return 'gas';
    if (normalized.includes('aerosol') || normalized.includes('spray')) return 'aerosol';
    
    return normalized;
  }

  parseFlashPoint(rawValue) {
    // Handle ranges, inequalities, and unit conversion
    const cleanValue = rawValue.replace(/[<>≥≤]/, '').trim();
    const number = parseFloat(cleanValue);
    
    if (isNaN(number)) return null;
    
    // Assume Fahrenheit if no unit specified and value > 60
    const fahrenheit = number > 60 ? number : (number * 9/5) + 32;
    const celsius = number > 60 ? (number - 32) * 5/9 : number;
    
    return { celsius, fahrenheit };
  }

  parsePH(rawValue) {
    const cleanValue = rawValue.replace(/[<>≥≤]/, '').trim();
    return parseFloat(cleanValue);
  }

  parseAIInference(response) {
    try {
      // Extract JSON from AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse AI inference response:', error.message);
    }
    
    return {};
  }
}

export default MultiAttemptParser;