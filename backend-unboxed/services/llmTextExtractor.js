// LLM Text Extraction Service
// Uses LLM for understanding messy text, NOT for classification logic

class LLMTextExtractor {
  constructor(aiProvider) {
    this.ai = aiProvider;
  }

  // GOOD USE: Extract structured data from messy text
  async extractSDSData(messyText) {
    const prompt = `
      Extract the following information from this safety data sheet text.
      Return ONLY the values, not classifications:
      
      1. Product name
      2. CAS number (format: XX-XX-X)
      3. Flash point (with units)
      4. pH value
      5. Physical state (liquid/solid/gas)
      
      Text: ${messyText}
      
      Return as JSON with these exact keys:
      productName, casNumber, flashPoint, pH, physicalState
    `;

    try {
      const response = await this.ai.complete(prompt);
      const extracted = JSON.parse(response);
      
      // Validate and normalize the extracted data
      return {
        productName: extracted.productName || null,
        casNumber: this.validateCAS(extracted.casNumber),
        flashPoint: this.parseFlashPoint(extracted.flashPoint),
        pH: this.parsePH(extracted.pH),
        physicalState: extracted.physicalState?.toLowerCase() || null
      };
    } catch (error) {
      console.error('LLM extraction failed:', error);
      return null;
    }
  }

  // GOOD USE: Answer natural language questions
  async answerComplianceQuestion(question, context) {
    const prompt = `
      You are a hazardous waste compliance assistant.
      Use the following regulations to answer the user's question.
      Be accurate but explain in simple terms.
      
      Regulations: ${context}
      Question: ${question}
      
      Provide a clear, helpful answer:
    `;

    return await this.ai.complete(prompt);
  }

  // GOOD USE: Generate human-readable descriptions
  async generateManifestDescription(wasteData) {
    const prompt = `
      Generate a clear manifest description for this waste:
      
      Chemical: ${wasteData.chemical}
      EPA Codes: ${wasteData.epaCodes.join(', ')}
      Physical State: ${wasteData.physicalState}
      Hazards: ${wasteData.hazards.join(', ')}
      
      Write a concise description (max 100 words) for the shipping manifest:
    `;

    return await this.ai.complete(prompt);
  }

  // GOOD USE: Normalize inconsistent data
  async normalizeCompanyName(messyName) {
    const prompt = `
      Standardize this company name to a consistent format:
      Input: "${messyName}"
      
      Rules:
      - Proper capitalization
      - Expand common abbreviations (Inc, Corp, LLC)
      - Remove extra spaces and punctuation
      
      Return only the standardized name:
    `;

    return await this.ai.complete(prompt);
  }

  // Helper methods for validation
  validateCAS(cas) {
    if (!cas) return null;
    const casRegex = /^\d{2,7}-\d{2}-\d$/;
    return casRegex.test(cas) ? cas : null;
  }

  parseFlashPoint(flashPointText) {
    if (!flashPointText) return null;
    
    // Extract number and unit
    const match = flashPointText.match(/(-?\d+\.?\d*)\s*°?\s*([CF])/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      
      // Convert to Celsius if needed
      if (unit === 'F') {
        return (value - 32) * 5/9;
      }
      return value;
    }
    return null;
  }

  parsePH(phText) {
    if (!phText) return null;
    const match = phText.match(/\d+\.?\d*/);
    return match ? parseFloat(match[0]) : null;
  }
}

export default LLMTextExtractor;

// USAGE EXAMPLE:
/*
const extractor = new LLMTextExtractor(aiProvider);

// Extract data from messy SDS
const sdsText = "Product: ACETONE Lab Grade CAS No. 67-64-1 Flash pt: -17 degrees C...";
const extracted = await extractor.extractSDSData(sdsText);
// Returns: { productName: "ACETONE Lab Grade", casNumber: "67-64-1", flashPoint: -17, ... }

// Then use DETERMINISTIC logic for classification
const classification = deterministicClassifier.classify(extracted);
// Returns: { epaCodes: ["D001"], texasCode: "203", ... }

// Best of both worlds:
// - LLM handles messy text extraction
// - Hard-coded logic handles regulatory classification
*/