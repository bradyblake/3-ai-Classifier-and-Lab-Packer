// AI Service for Enhanced Waste Classification
// Provides structured data extraction and reasoning capabilities

import OllamaService from './ollamaService.js';
import AITrainingSystem from './aiTrainingSystem.js';

class AIService {
  constructor() {
    // Support both LM Studio and Ollama
    const aiUrl = process.env.AI_URL || 'http://localhost:1234'; // Default to LM Studio
    this.ollama = new OllamaService(aiUrl);
    this.isLMStudio = aiUrl.includes('1234');
    
    // Use appropriate model for the service
    if (this.isLMStudio) {
      this.model = process.env.AI_MODEL || 'qwen2.5-3b-instruct'; // Updated to qwen model
    } else {
      this.model = process.env.AI_MODEL || 'qwen2.5:3b'; // Qwen for Ollama
    }
    
    this.timeout = parseInt(process.env.AI_TIMEOUT) || 30000;
    this.maxRetries = 2;
    this.trainingSystem = new AITrainingSystem();
    
    console.log(`🤖 AI Service initialized: ${this.isLMStudio ? 'LM Studio' : 'Ollama'} at ${aiUrl}`);
    console.log(`📋 Using model: ${this.model}`);
  }

  async extractWasteInfo(description) {
    // Get enhanced prompt with training examples
    const enhancedPrompt = this.trainingSystem.buildEnhancedPrompt(description, 'extraction');
    
    const basePrompt = `Extract key information from this waste description and return ONLY a JSON object:
"${description}"

Return exactly this JSON format:
{
  "chemical": "primary chemical name or null",
  "flashPoint": number_in_celsius_or_null,
  "use": "what it was used for",
  "concentration": "percentage if mentioned or null",
  "contamination": "what it's contaminated with or null",
  "physicalState": "solid/liquid/gas or null",
  "hazardousProperties": ["flammable", "corrosive", "toxic", etc]
}

${enhancedPrompt}

JSON only:`;

    try {
      const response = await this.callOllamaWithRetry(basePrompt);
      return this.parseJSONResponse(response, description);
    } catch (error) {
      console.warn('AI extraction failed, using fallback:', error.message);
      return this.fallbackExtraction(description);
    }
  }

  async callOllamaWithRetry(prompt, options = {}) {
    let lastError;
    
    // First check if service is available
    try {
      const isAvailable = await this.ollama.isAvailable();
      if (!isAvailable) {
        throw new Error(`${this.isLMStudio ? 'LM Studio' : 'Ollama'} service not available at ${this.ollama.baseURL}`);
      }
    } catch (error) {
      throw new Error(`AI service check failed: ${error.message}`);
    }
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.ollama.chatCompletion(this.model, [
          { role: 'user', content: prompt }
        ], {
          temperature: 0.1, // Low for consistent regulatory answers
          top_p: 0.9,
          top_k: 40,
          ...options
        });

        if (result.success) {
          return result.message?.content || result.content || 'No response content';
        } else {
          throw new Error(result.error || 'Unknown AI error');
        }
      } catch (error) {
        lastError = error;
        console.warn(`AI call attempt ${attempt}/${this.maxRetries} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`All ${this.maxRetries} AI attempts failed. Last error: ${lastError.message}`);
  }

  parseJSONResponse(response, originalDescription) {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateExtractedData(parsed);
      }
    } catch (error) {
      console.warn('Failed to parse AI JSON response:', error.message);
    }

    // If JSON parsing fails, fall back to text analysis
    return this.fallbackExtraction(originalDescription);
  }

  validateExtractedData(data) {
    // Ensure required fields exist and have reasonable values
    return {
      chemical: typeof data.chemical === 'string' ? data.chemical : null,
      flashPoint: typeof data.flashPoint === 'number' ? data.flashPoint : null,
      use: typeof data.use === 'string' ? data.use : null,
      concentration: typeof data.concentration === 'string' ? data.concentration : null,
      contamination: typeof data.contamination === 'string' ? data.contamination : null,
      physicalState: typeof data.physicalState === 'string' ? data.physicalState : null,
      hazardousProperties: Array.isArray(data.hazardousProperties) ? data.hazardousProperties : []
    };
  }

  fallbackExtraction(description) {
    const desc = description.toLowerCase();
    
    return {
      chemical: this.extractChemical(desc),
      flashPoint: this.extractFlashPoint(desc),
      use: this.extractUse(desc),
      concentration: this.extractConcentration(desc),
      contamination: this.extractContamination(desc),
      physicalState: this.extractPhysicalState(desc),
      hazardousProperties: this.extractHazardousProperties(desc)
    };
  }

  extractChemical(desc) {
    const chemicals = [
      'acetone', 'benzene', 'methanol', 'toluene', 'xylene', 'ethanol',
      'isopropanol', 'methyl ethyl ketone', 'mek', 'dichloromethane',
      'trichloroethylene', 'perchloroethylene', 'hexane', 'heptane'
    ];
    
    return chemicals.find(chem => desc.includes(chem)) || null;
  }

  extractFlashPoint(desc) {
    // Look for flash point patterns
    const patterns = [
      /flash\s*point[:\s]*(-?\d+\.?\d*)\s*[°]?c/i,
      /fp[:\s]*(-?\d+\.?\d*)\s*[°]?c/i,
      /flash[:\s]*(-?\d+\.?\d*)\s*[°]?c/i
    ];

    for (const pattern of patterns) {
      const match = desc.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  extractUse(desc) {
    if (desc.includes('parts cleaning') || desc.includes('degreasing')) return 'parts cleaning';
    if (desc.includes('paint') || desc.includes('coating')) return 'painting';
    if (desc.includes('lab') || desc.includes('analysis') || desc.includes('laboratory')) return 'laboratory';
    if (desc.includes('solvent')) return 'solvent use';
    if (desc.includes('adhesive') || desc.includes('glue')) return 'adhesive';
    return null;
  }

  extractConcentration(desc) {
    const concMatch = desc.match(/(\d+\.?\d*)\s*%/);
    return concMatch ? `${concMatch[1]}%` : null;
  }

  extractContamination(desc) {
    if (desc.includes('contaminated with') || desc.includes('mixed with')) {
      const contMatch = desc.match(/(?:contaminated with|mixed with)\s+([^,.\n]+)/i);
      return contMatch ? contMatch[1].trim() : null;
    }
    return null;
  }

  extractPhysicalState(desc) {
    if (desc.includes('solid') || desc.includes('powder') || desc.includes('granule')) return 'solid';
    if (desc.includes('liquid') || desc.includes('solution') || desc.includes('fluid')) return 'liquid';
    if (desc.includes('gas') || desc.includes('vapor') || desc.includes('fume')) return 'gas';
    return 'liquid'; // Default assumption for most waste solvents
  }

  extractHazardousProperties(desc) {
    const properties = [];
    
    if (desc.includes('flammable') || desc.includes('flash point') || desc.includes('ignitable')) {
      properties.push('flammable');
    }
    if (desc.includes('corrosive') || desc.includes('ph') || desc.includes('acid') || desc.includes('base')) {
      properties.push('corrosive');
    }
    if (desc.includes('toxic') || desc.includes('poison') || desc.includes('hazardous')) {
      properties.push('toxic');
    }
    if (desc.includes('reactive') || desc.includes('unstable')) {
      properties.push('reactive');
    }
    
    return properties;
  }

  async explainClassification(codes, reasoning, extractedData) {
    const prompt = `Explain this hazardous waste classification in simple, clear terms for facility managers:

EPA Codes: ${codes.join(', ')}
Technical reasoning: ${reasoning}
Extracted waste data: ${JSON.stringify(extractedData, null, 2)}

Provide a brief explanation (2-3 sentences) that explains:
1. What EPA codes apply and why
2. The main hazardous properties
3. Any special handling requirements

Keep it professional but understandable for non-experts.`;

    try {
      const response = await this.callOllamaWithRetry(prompt, { temperature: 0.2 });
      return response;
    } catch (error) {
      console.warn('AI explanation failed:', error.message);
      return `Classification: ${codes.join(', ')}. ${reasoning}`;
    }
  }

  async assessConfidence(extractedData, ruleResult) {
    // AI-based confidence assessment prompt
    const prompt = `Assess the confidence of this waste classification:

Extracted Data: ${JSON.stringify(extractedData, null, 2)}
Rule Engine Result: ${JSON.stringify(ruleResult, null, 2)}

Consider these factors:
- Completeness of data (chemical name, flash point, use)
- Certainty of EPA code matches
- Presence of conflicting information
- Clarity of hazardous properties

Return ONLY a JSON object:
{
  "confidence": 0.85,
  "reasoning": "High confidence due to clear chemical identification and flash point data",
  "uncertainties": ["Missing concentration data"],
  "recommendations": ["Verify flash point measurement", "Confirm chemical purity"]
}`;

    try {
      const response = await this.callOllamaWithRetry(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1), // Clamp 0-1
          reasoning: parsed.reasoning || 'AI assessment completed',
          uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        };
      }
    } catch (error) {
      console.warn('AI confidence assessment failed:', error.message);
    }

    // Fallback confidence based on data completeness
    return this.calculateFallbackConfidence(extractedData, ruleResult);
  }

  calculateFallbackConfidence(extractedData, ruleResult) {
    // Advanced confidence scoring with weighted factors
    const factors = {
      chemicalIdentity: { weight: 0.25, score: 0 },
      physicalProperties: { weight: 0.20, score: 0 },
      hazardousProperties: { weight: 0.20, score: 0 },
      regulatoryData: { weight: 0.15, score: 0 },
      consistencyCheck: { weight: 0.10, score: 0 },
      dataCompleteness: { weight: 0.10, score: 0 }
    };
    
    const uncertainties = [];
    const recommendations = [];
    
    // 1. Chemical Identity Score
    if (extractedData.chemical) {
      const isSpecific = !['waste', 'solution', 'mixture', 'unknown'].includes(
        extractedData.chemical.toLowerCase()
      );
      factors.chemicalIdentity.score = isSpecific ? 1.0 : 0.6;
    } else {
      uncertainties.push('Chemical identity unknown');
      recommendations.push('Identify primary chemical constituent');
    }
    
    // 2. Physical Properties Score
    let propScore = 0;
    let propCount = 0;
    
    if (extractedData.flashPoint !== null) {
      propCount++;
      propScore += (extractedData.flashPoint < 40 || extractedData.flashPoint > 80) ? 1.0 : 0.5;
      if (extractedData.flashPoint >= 40 && extractedData.flashPoint <= 80) {
        uncertainties.push('Flash point near regulatory threshold');
      }
    }
    
    if (extractedData.physicalState) {
      propCount++;
      propScore += 1.0;
    } else {
      recommendations.push('Determine physical state');
    }
    
    factors.physicalProperties.score = propCount > 0 ? propScore / propCount : 0;
    
    // 3. Hazardous Properties Score
    if (extractedData.hazardousProperties && extractedData.hazardousProperties.length > 0) {
      factors.hazardousProperties.score = Math.min(1.0, 0.3 * extractedData.hazardousProperties.length);
    } else {
      uncertainties.push('No hazardous properties identified');
    }
    
    // 4. Regulatory Data Score
    if (ruleResult?.classification?.length > 0) {
      factors.regulatoryData.score = 0.7;
      if (ruleResult.confidence) {
        factors.regulatoryData.score = Math.max(factors.regulatoryData.score, ruleResult.confidence);
      }
    } else {
      uncertainties.push('No EPA codes determined');
      recommendations.push('Review classification criteria');
    }
    
    // 5. Consistency Check Score
    factors.consistencyCheck.score = 1.0;
    
    // Check for inconsistencies
    if (extractedData.physicalState === 'solid' && extractedData.flashPoint !== null) {
      factors.consistencyCheck.score -= 0.3;
      uncertainties.push('Flash point specified for solid material');
    }
    
    // 6. Data Completeness Score
    const dataPoints = [
      extractedData.chemical,
      extractedData.flashPoint !== null,
      extractedData.physicalState,
      extractedData.use,
      extractedData.hazardousProperties?.length > 0
    ];
    
    factors.dataCompleteness.score = dataPoints.filter(Boolean).length / dataPoints.length;
    
    if (factors.dataCompleteness.score < 0.5) {
      recommendations.push('Gather additional material data');
    }
    
    // Calculate weighted confidence
    let totalConfidence = 0;
    let totalWeight = 0;
    
    for (const factor of Object.values(factors)) {
      totalConfidence += factor.score * factor.weight;
      totalWeight += factor.weight;
    }
    
    const finalConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0.1;
    
    // Add confidence-based recommendations
    if (finalConfidence < 0.4) {
      recommendations.push('Manual review strongly recommended');
    } else if (finalConfidence < 0.6) {
      recommendations.push('Verify classification with additional testing');
    }
    
    return {
      confidence: Math.min(Math.max(finalConfidence, 0.1), 1.0),
      reasoning: `Confidence ${(finalConfidence * 100).toFixed(0)}% based on data quality and completeness`,
      uncertainties: [...new Set(uncertainties)],
      recommendations: [...new Set(recommendations)]
    };
  }

  // Health check method
  async healthCheck() {
    try {
      const testResult = await this.callOllamaWithRetry('Test: What is 2+2?');
      return {
        status: 'healthy',
        model: this.model,
        response: testResult.substring(0, 50)
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

export default new AIService();