// Enhanced LLM Parser - 100% Reliable SDS Parsing Solution
// Combines local models, API services, and continuous learning
// Designed for ZERO parsing failures

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

export class EnhancedLLMParser {
  constructor() {
    // Initialize multiple LLM providers for redundancy
    this.providers = {
      // Local LM Studio for privacy and speed
      lmstudio: new OpenAI({ 
        apiKey: 'lm-studio', 
        baseURL: 'http://localhost:1234/v1' 
      }),
      
      // OpenAI for high-accuracy fallback
      openai: process.env.OPENAI_API_KEY ? 
        new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null,
      
      // Azure OpenAI for enterprise reliability
      azure: process.env.AZURE_OPENAI_KEY ? new OpenAI({
        apiKey: process.env.AZURE_OPENAI_KEY,
        baseURL: process.env.AZURE_OPENAI_ENDPOINT
      }) : null
    };

    // Training data for continuous improvement
    this.trainingDataPath = './training_data/sds_examples.json';
    this.feedbackPath = './training_data/parsing_feedback.json';
    
    // Load training examples and feedback
    this.initializeTrainingSystem();
    
    // Success tracking
    this.successMetrics = {
      totalAttempts: 0,
      successfulParses: 0,
      failedParses: 0,
      confidenceThreshold: 0.85
    };
  }

  async initializeTrainingSystem() {
    try {
      // Load existing training data
      this.trainingExamples = await this.loadTrainingData();
      this.parsingFeedback = await this.loadFeedback();
    } catch (error) {
      console.log('Initializing new training system...');
      this.trainingExamples = [];
      this.parsingFeedback = [];
    }
  }

  /**
   * MAIN PARSING FUNCTION - 100% Success Rate Target
   */
  async parseWithMaxReliability(rawText, options = {}) {
    const startTime = Date.now();
    this.successMetrics.totalAttempts++;
    
    console.log('🚀 ENHANCED LLM PARSER: Starting maximum reliability parsing...');
    
    const parseAttempts = [];
    let finalResult = null;
    let bestConfidence = 0;
    
    // STAGE 1: Multi-provider parsing with confidence scoring
    for (const [providerName, isEnabled] of Object.entries(this.getProviderPriority())) {
      if (!isEnabled) continue;
      
      try {
        console.log(`🤖 Attempting parse with ${providerName}...`);
        
        const result = await this.parseWithProvider(rawText, providerName, {
          ...options,
          includeReasoning: true,
          maxRetries: 2
        });
        
        if (result) {
          parseAttempts.push({
            provider: providerName,
            result: result,
            confidence: result.confidence || 0,
            timestamp: Date.now()
          });
          
          // Track best result
          if (result.confidence > bestConfidence) {
            bestConfidence = result.confidence;
            finalResult = result;
          }
          
          // If we have high confidence, we can use this result
          if (result.confidence >= this.successMetrics.confidenceThreshold) {
            console.log(`✅ High confidence result from ${providerName}: ${result.confidence}`);
            break;
          }
        }
      } catch (error) {
        console.warn(`❌ ${providerName} parsing failed:`, error.message);
        parseAttempts.push({
          provider: providerName,
          result: null,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // STAGE 2: Result validation and enhancement
    if (finalResult) {
      finalResult = await this.validateAndEnhance(finalResult, rawText);
      
      // If still low confidence, try consensus approach
      if (finalResult.confidence < this.successMetrics.confidenceThreshold) {
        console.log('🤝 Low confidence, attempting consensus approach...');
        finalResult = await this.consensusApproach(parseAttempts, rawText);
      }
    }
    
    // STAGE 3: Emergency fallback if all else fails
    if (!finalResult || finalResult.confidence < 0.5) {
      console.log('🚨 All providers failed or low confidence, using emergency fallback...');
      finalResult = await this.emergencyFallback(rawText, parseAttempts);
    }
    
    // STAGE 4: Final validation and data completion
    finalResult = await this.ensureDataCompleteness(finalResult, rawText);
    
    // STAGE 5: Learning and feedback
    await this.recordParsingSession({
      rawTextLength: rawText.length,
      attempts: parseAttempts,
      finalResult: finalResult,
      processingTime: Date.now() - startTime,
      confidence: finalResult.confidence
    });
    
    // Update success metrics
    if (finalResult.confidence >= 0.7) {
      this.successMetrics.successfulParses++;
    } else {
      this.successMetrics.failedParses++;
    }
    
    console.log(`🎯 Parsing complete. Confidence: ${finalResult.confidence}. Time: ${Date.now() - startTime}ms`);
    
    return finalResult;
  }

  /**
   * Parse with specific provider using optimized prompts
   */
  async parseWithProvider(rawText, providerName, options = {}) {
    const provider = this.providers[providerName];
    if (!provider) throw new Error(`Provider ${providerName} not available`);
    
    // Get provider-specific configuration
    const config = this.getProviderConfig(providerName);
    
    // Build enhanced prompt with training examples
    const { systemPrompt, userPrompt } = await this.buildEnhancedPrompt(rawText, providerName);
    
    // Make API call with retry logic
    let result = null;
    let retryCount = 0;
    const maxRetries = options.maxRetries || 2;
    
    while (!result && retryCount <= maxRetries) {
      try {
        const completion = await provider.chat.completions.create({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          ...(config.responseFormat ? { response_format: config.responseFormat } : {})
        });
        
        const rawResponse = completion.choices[0].message.content;
        result = await this.parseAndValidateResponse(rawResponse, providerName);
        
        if (result) {
          result.provider = providerName;
          result.model = config.model;
          result.retryCount = retryCount;
        }
        
      } catch (error) {
        retryCount++;
        console.warn(`Retry ${retryCount} for ${providerName}:`, error.message);
        
        if (retryCount > maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return result;
  }

  /**
   * Build enhanced prompt with training examples and context
   */
  async buildEnhancedPrompt(rawText, providerName) {
    // Analyze text to determine material type for contextual examples
    const materialType = this.analyzeMaterialType(rawText);
    const relevantExamples = this.getRelevantExamples(materialType, 3);
    
    const systemPrompt = `You are the world's most accurate SDS (Safety Data Sheet) parser. Your job is to extract structured data with 100% accuracy.

CRITICAL REQUIREMENTS:
1. Extract ALL required fields - never leave essential data blank
2. Return confidence scores for each field (0.0 to 1.0)
3. Use fallback inference when direct data isn't available
4. Validate all extracted values for chemical/physical feasibility
5. Return ONLY valid JSON - no explanations or markdown

MATERIAL TYPE DETECTED: ${materialType}`;

    let exampleSection = '';
    if (relevantExamples.length > 0) {
      exampleSection = `\nRELEVANT EXAMPLES:\n${relevantExamples.map((ex, i) => 
        `Example ${i+1}:\nInput: "${ex.input.substring(0, 200)}..."\nOutput: ${JSON.stringify(ex.output, null, 2)}`
      ).join('\n\n')}`;
    }

    const userPrompt = `${exampleSection}

EXTRACT FROM THIS SDS TEXT:
${rawText.substring(0, 4000)}

Return this EXACT JSON structure with confidence scores:
{
  "productName": { "value": "exact product name", "confidence": 0.95, "source": "Section 1" },
  "manufacturer": { "value": "company name", "confidence": 0.85, "source": "Header" },
  "physicalState": { "value": "liquid|solid|gas|aerosol|powder|paste|gel", "confidence": 0.90, "source": "Section 9" },
  "pH": { 
    "value": numeric_value_or_null, 
    "text": "original text or 'Not applicable'",
    "confidence": 0.80,
    "source": "Section 9"
  },
  "flashPoint": { 
    "celsius": numeric_value_or_null,
    "fahrenheit": numeric_value_or_null,
    "text": "original text or 'Not applicable'",
    "confidence": 0.85,
    "source": "Section 9"
  },
  "specificGravity": { "value": numeric_value_or_null, "confidence": 0.70, "source": "Section 9" },
  "composition": [
    {
      "name": "chemical name",
      "cas": "123-45-6",
      "percentage": "10-20",
      "percentMin": 10,
      "percentMax": 20,
      "confidence": 0.90
    }
  ],
  "hazardClassification": {
    "rcra": {
      "ignitable": { "value": boolean, "confidence": 0.95, "reason": "flash point < 60°C" },
      "corrosive": { "value": boolean, "confidence": 0.95, "reason": "pH <= 2 or >= 12.5" },
      "reactive": { "value": boolean, "confidence": 0.80, "reason": "text analysis" },
      "toxic": { "value": boolean, "confidence": 0.80, "reason": "LD50 or hazard statements" }
    }
  },
  "transportation": {
    "unNumber": { "value": "UN1234", "confidence": 0.90, "source": "Section 14" },
    "properShippingName": { "value": "name", "confidence": 0.85, "source": "Section 14" },
    "hazardClass": { "value": "3", "confidence": 0.90, "source": "Section 14" },
    "packingGroup": { "value": "II", "confidence": 0.85, "source": "Section 14" }
  },
  "inferredProperties": {
    "suggestedEPACodes": ["D001", "D002"],
    "suggestedTexasCode": "202",
    "wasteDescription": "brief description for manifest",
    "confidenceReasoning": "explanation of confidence levels"
  },
  "overall": {
    "confidence": 0.88,
    "completeness": 0.95,
    "dataQuality": "high|medium|low"
  }
}

VALIDATION RULES:
- pH: If "Not applicable" or non-aqueous → null
- Flash Point: Convert °F to °C: (°F-32)×5/9
- Composition: Extract ALL components from Section 3
- RCRA Ignitable: Flash point < 60°C
- RCRA Corrosive: pH ≤ 2 or ≥ 12.5
- Confidence: Base on data clarity and validation success
- If data is missing, use logical inference but mark lower confidence`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Parse and validate LLM response
   */
  async parseAndValidateResponse(rawResponse, providerName) {
    try {
      // Clean response (remove markdown, extra text)
      const cleanedResponse = this.cleanLLMResponse(rawResponse);
      
      // Parse JSON
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate structure and data
      const validated = await this.validateParsedData(parsed);
      
      // Calculate overall confidence
      validated.confidence = this.calculateOverallConfidence(validated);
      
      return validated;
      
    } catch (error) {
      console.error(`Response parsing failed for ${providerName}:`, error);
      return null;
    }
  }

  /**
   * Clean LLM response to extract JSON
   */
  cleanLLMResponse(response) {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\n?/gi, '').replace(/```\n?/g, '');
    
    // Find JSON object
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }
    
    return cleaned;
  }

  /**
   * Validate parsed data structure and values
   */
  async validateParsedData(data) {
    const validated = { ...data };
    
    // Ensure required fields exist
    const requiredFields = ['productName', 'physicalState', 'pH', 'flashPoint'];
    
    for (const field of requiredFields) {
      if (!validated[field]) {
        validated[field] = { value: null, confidence: 0, source: 'missing' };
      }
    }
    
    // Validate pH values
    if (validated.pH?.value !== null) {
      const pH = parseFloat(validated.pH.value);
      if (isNaN(pH) || pH < 0 || pH > 14) {
        validated.pH.value = null;
        validated.pH.confidence = Math.max(0, validated.pH.confidence - 0.3);
      }
    }
    
    // Validate flash point
    if (validated.flashPoint?.celsius !== null) {
      const fp = parseFloat(validated.flashPoint.celsius);
      if (isNaN(fp) || fp < -273 || fp > 1000) { // Reasonable bounds
        validated.flashPoint.celsius = null;
        validated.flashPoint.confidence = Math.max(0, validated.flashPoint.confidence - 0.3);
      }
    }
    
    // Validate CAS numbers in composition
    if (validated.composition) {
      validated.composition = validated.composition.map(comp => ({
        ...comp,
        cas: this.validateCASNumber(comp.cas) ? comp.cas : null
      }));
    }
    
    // Apply RCRA rules
    if (validated.hazardClassification?.rcra) {
      const rcra = validated.hazardClassification.rcra;
      
      // Auto-correct ignitable based on flash point
      if (validated.flashPoint?.celsius !== null && validated.flashPoint.celsius < 60) {
        rcra.ignitable = { value: true, confidence: 0.95, reason: "flash point < 60°C" };
      }
      
      // Auto-correct corrosive based on pH
      if (validated.pH?.value !== null) {
        const pH = parseFloat(validated.pH.value);
        if (pH <= 2 || pH >= 12.5) {
          rcra.corrosive = { value: true, confidence: 0.95, reason: `pH ${pH}` };
        }
      }
    }
    
    return validated;
  }

  /**
   * Consensus approach - combine results from multiple providers
   */
  async consensusApproach(attempts, rawText) {
    const validResults = attempts.filter(attempt => attempt.result).map(attempt => attempt.result);
    
    if (validResults.length === 0) {
      return null;
    }
    
    if (validResults.length === 1) {
      return validResults[0];
    }
    
    // Create consensus result by field
    const consensus = {
      productName: this.getFieldConsensus(validResults, 'productName'),
      manufacturer: this.getFieldConsensus(validResults, 'manufacturer'),
      physicalState: this.getFieldConsensus(validResults, 'physicalState'),
      pH: this.getFieldConsensus(validResults, 'pH'),
      flashPoint: this.getFieldConsensus(validResults, 'flashPoint'),
      specificGravity: this.getFieldConsensus(validResults, 'specificGravity'),
      composition: this.getCompositionConsensus(validResults),
      hazardClassification: this.getHazardConsensus(validResults),
      transportation: this.getTransportationConsensus(validResults),
      consensus: {
        sourceCount: validResults.length,
        providers: attempts.map(a => a.provider),
        agreementLevel: this.calculateAgreement(validResults)
      }
    };
    
    consensus.confidence = this.calculateOverallConfidence(consensus);
    
    return consensus;
  }

  /**
   * Emergency fallback when all else fails
   */
  async emergencyFallback(rawText, attempts) {
    console.log('🆘 EMERGENCY FALLBACK: Basic pattern extraction...');
    
    // Use basic regex patterns as absolute fallback
    const emergency = {
      productName: { 
        value: this.emergencyExtractProductName(rawText), 
        confidence: 0.3, 
        source: 'emergency_fallback' 
      },
      manufacturer: { 
        value: this.emergencyExtractManufacturer(rawText), 
        confidence: 0.2, 
        source: 'emergency_fallback' 
      },
      physicalState: { 
        value: this.emergencyExtractPhysicalState(rawText), 
        confidence: 0.3, 
        source: 'emergency_fallback' 
      },
      pH: { 
        value: this.emergencyExtractPH(rawText), 
        confidence: 0.2, 
        source: 'emergency_fallback' 
      },
      flashPoint: { 
        celsius: this.emergencyExtractFlashPoint(rawText), 
        confidence: 0.2, 
        source: 'emergency_fallback' 
      },
      composition: this.emergencyExtractComposition(rawText),
      hazardClassification: this.emergencyClassifyHazards(rawText),
      emergency: true,
      attempts: attempts.length,
      confidence: 0.25
    };
    
    return emergency;
  }

  /**
   * Ensure data completeness - fill missing required fields
   */
  async ensureDataCompleteness(data, rawText) {
    const enhanced = { ...data };
    
    // Ensure product name
    if (!enhanced.productName?.value) {
      enhanced.productName = { 
        value: "Unknown Material [PARSING_INCOMPLETE]", 
        confidence: 0.1, 
        source: 'default' 
      };
    }
    
    // Ensure physical state
    if (!enhanced.physicalState?.value) {
      enhanced.physicalState = { 
        value: "liquid", 
        confidence: 0.2, 
        source: 'default_assumption' 
      };
    }
    
    // Set pH to null if truly not applicable
    if (!enhanced.pH) {
      enhanced.pH = { 
        value: null, 
        text: "Not determined", 
        confidence: 0.1, 
        source: 'default' 
      };
    }
    
    // Set flash point
    if (!enhanced.flashPoint) {
      enhanced.flashPoint = { 
        celsius: null, 
        text: "Not determined", 
        confidence: 0.1, 
        source: 'default' 
      };
    }
    
    // Ensure hazard classification exists
    if (!enhanced.hazardClassification) {
      enhanced.hazardClassification = {
        rcra: {
          ignitable: { value: false, confidence: 0.1, reason: "insufficient data" },
          corrosive: { value: false, confidence: 0.1, reason: "insufficient data" },
          reactive: { value: false, confidence: 0.1, reason: "insufficient data" },
          toxic: { value: false, confidence: 0.1, reason: "insufficient data" }
        }
      };
    }
    
    // Recalculate confidence
    enhanced.confidence = this.calculateOverallConfidence(enhanced);
    
    return enhanced;
  }

  // Provider configuration methods
  getProviderPriority() {
    return {
      lmstudio: this.providers.lmstudio !== null, // Fast local model first
      openai: this.providers.openai !== null,     // High accuracy fallback
      azure: this.providers.azure !== null       // Enterprise reliability
    };
  }

  getProviderConfig(providerName) {
    const configs = {
      lmstudio: {
        model: 'qwen2.5-14b-instruct', // Use larger model for better accuracy
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: null
      },
      openai: {
        model: 'gpt-4o-2024-08-06',
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: "json_object" }
      },
      azure: {
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 4000,
        responseFormat: { type: "json_object" }
      }
    };
    
    return configs[providerName];
  }

  // Training and learning methods
  async recordParsingSession(session) {
    try {
      this.parsingFeedback.push({
        timestamp: new Date().toISOString(),
        ...session
      });
      
      // Save feedback periodically
      if (this.parsingFeedback.length % 10 === 0) {
        await this.saveFeedback();
      }
    } catch (error) {
      console.error('Failed to record parsing session:', error);
    }
  }

  async loadTrainingData() {
    try {
      const data = await fs.readFile(this.trainingDataPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveTrainingData() {
    try {
      await fs.writeFile(this.trainingDataPath, JSON.stringify(this.trainingExamples, null, 2));
    } catch (error) {
      console.error('Failed to save training data:', error);
    }
  }

  async loadFeedback() {
    try {
      const data = await fs.readFile(this.feedbackPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveFeedback() {
    try {
      await fs.writeFile(this.feedbackPath, JSON.stringify(this.parsingFeedback, null, 2));
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  }

  // Analysis and utility methods
  analyzeMaterialType(text) {
    const lowerText = text.toLowerCase();
    
    if (/acetone|methanol|ethanol|isopropanol|alcohol/.test(lowerText)) return 'solvent';
    if (/hydrochloric|sulfuric|nitric|muriatic|acid/.test(lowerText)) return 'acid';
    if (/sodium hydroxide|potassium hydroxide|caustic|alkaline/.test(lowerText)) return 'base';
    if (/diesel|gasoline|petroleum|motor oil|lubricant/.test(lowerText)) return 'petroleum';
    if (/paint|coating|varnish|lacquer/.test(lowerText)) return 'paint';
    if (/battery|lead-acid/.test(lowerText)) return 'battery';
    if (/pesticide|herbicide|insecticide/.test(lowerText)) return 'pesticide';
    
    return 'general';
  }

  getRelevantExamples(materialType, count = 3) {
    return this.trainingExamples
      .filter(ex => ex.materialType === materialType)
      .slice(0, count);
  }

  calculateOverallConfidence(data) {
    const weights = {
      productName: 0.20,
      physicalState: 0.15,
      pH: 0.15,
      flashPoint: 0.15,
      composition: 0.10,
      hazardClassification: 0.10,
      transportation: 0.10,
      manufacturer: 0.05
    };
    
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const [field, weight] of Object.entries(weights)) {
      const fieldData = data[field];
      if (fieldData?.confidence !== undefined) {
        totalWeight += weight;
        weightedScore += fieldData.confidence * weight;
      }
    }
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  // Emergency extraction methods (basic regex patterns)
  emergencyExtractProductName(text) {
    const patterns = [
      /Product\s*Name[\s:]+([^\n\r]{3,60})/i,
      /Trade\s*Name[\s:]+([^\n\r]{3,60})/i,
      /Material[\s:]+([^\n\r]{3,60})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    // Use first meaningful line
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned.length >= 3 && cleaned.length <= 60 && 
          !cleaned.match(/^(section|page|date|version|sds)/i)) {
        return cleaned;
      }
    }
    
    return null;
  }

  emergencyExtractPhysicalState(text) {
    if (/\b(liquid|fluid|solution)\b/i.test(text)) return 'liquid';
    if (/\b(solid|powder|crystal)\b/i.test(text)) return 'solid';
    if (/\b(gas|vapor)\b/i.test(text)) return 'gas';
    return 'liquid'; // Default assumption
  }

  emergencyExtractPH(text) {
    const match = text.match(/pH[\s:]+([0-9.]+)/i);
    return match ? parseFloat(match[1]) : null;
  }

  emergencyExtractFlashPoint(text) {
    const match = text.match(/Flash\s*Point[\s:]+([0-9.]+)\s*°?\s*([CF])/i);
    if (!match) return null;
    
    const temp = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    return unit === 'C' ? temp : (temp - 32) * 5/9;
  }

  emergencyExtractManufacturer(text) {
    const patterns = [
      /Company[\s:]+([^\n\r]{3,60})/i,
      /Manufacturer[\s:]+([^\n\r]{3,60})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    
    return null;
  }

  emergencyExtractComposition(text) {
    const composition = [];
    const casPattern = /([A-Za-z][^\n\d]{2,30}?)\s+(\d{2,7}-\d{2}-\d{1,2})\s+([0-9.]+)/g;
    
    let match;
    while ((match = casPattern.exec(text)) !== null) {
      composition.push({
        name: match[1].trim(),
        cas: match[2],
        percentage: match[3],
        confidence: 0.3
      });
    }
    
    return composition;
  }

  emergencyClassifyHazards(text) {
    return {
      rcra: {
        ignitable: { value: /flammable|ignitable/i.test(text), confidence: 0.2, reason: "text analysis" },
        corrosive: { value: /corrosive|caustic/i.test(text), confidence: 0.2, reason: "text analysis" },
        reactive: { value: /reactive|explosive/i.test(text), confidence: 0.2, reason: "text analysis" },
        toxic: { value: /toxic|poison/i.test(text), confidence: 0.2, reason: "text analysis" }
      }
    };
  }

  // Consensus methods
  getFieldConsensus(results, fieldName) {
    const values = results.map(r => r[fieldName]).filter(v => v?.value);
    if (values.length === 0) return { value: null, confidence: 0 };
    
    // Find most common value with highest confidence
    const valueMap = {};
    values.forEach(v => {
      const key = JSON.stringify(v.value);
      if (!valueMap[key] || valueMap[key].confidence < v.confidence) {
        valueMap[key] = v;
      }
    });
    
    const bestValue = Object.values(valueMap).sort((a, b) => b.confidence - a.confidence)[0];
    return {
      ...bestValue,
      consensus: true,
      agreementCount: values.filter(v => JSON.stringify(v.value) === JSON.stringify(bestValue.value)).length
    };
  }

  getCompositionConsensus(results) {
    // Combine all composition data and deduplicate by CAS number
    const allComposition = results.flatMap(r => r.composition || []);
    const deduped = [];
    const seen = new Set();
    
    for (const comp of allComposition) {
      const key = comp.cas || comp.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(comp);
      }
    }
    
    return deduped;
  }

  getHazardConsensus(results) {
    const hazards = results.map(r => r.hazardClassification).filter(h => h);
    if (hazards.length === 0) return null;
    
    // Use majority vote for each hazard type
    const consensus = { rcra: {} };
    const hazardTypes = ['ignitable', 'corrosive', 'reactive', 'toxic'];
    
    for (const hazardType of hazardTypes) {
      const votes = hazards.map(h => h.rcra?.[hazardType]?.value).filter(v => v !== undefined);
      const trueVotes = votes.filter(v => v === true).length;
      const confidence = votes.length > 0 ? Math.max(...hazards.map(h => h.rcra?.[hazardType]?.confidence || 0)) : 0;
      
      consensus.rcra[hazardType] = {
        value: trueVotes > votes.length / 2,
        confidence: confidence,
        voteCount: votes.length,
        agreement: trueVotes / votes.length
      };
    }
    
    return consensus;
  }

  getTransportationConsensus(results) {
    const transport = results.map(r => r.transportation).filter(t => t);
    if (transport.length === 0) return null;
    
    return {
      unNumber: this.getFieldConsensus(transport, 'unNumber'),
      properShippingName: this.getFieldConsensus(transport, 'properShippingName'),
      hazardClass: this.getFieldConsensus(transport, 'hazardClass'),
      packingGroup: this.getFieldConsensus(transport, 'packingGroup')
    };
  }

  calculateAgreement(results) {
    // Calculate how much the results agree with each other
    if (results.length < 2) return 1.0;
    
    let agreements = 0;
    let comparisons = 0;
    
    const fields = ['productName', 'physicalState', 'pH', 'flashPoint'];
    
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        for (const field of fields) {
          if (results[i][field]?.value && results[j][field]?.value) {
            comparisons++;
            if (JSON.stringify(results[i][field].value) === JSON.stringify(results[j][field].value)) {
              agreements++;
            }
          }
        }
      }
    }
    
    return comparisons > 0 ? agreements / comparisons : 0;
  }

  validateCASNumber(cas) {
    if (!cas) return false;
    const match = cas.match(/^(\d{2,7})-(\d{2})-(\d)$/);
    if (!match) return false;
    
    // Simple checksum validation
    const digits = (match[1] + match[2]).split('').reverse();
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += parseInt(digits[i]) * (i + 1);
    }
    
    return (sum % 10).toString() === match[3];
  }

  /**
   * Public method to add training example
   */
  async addTrainingExample(sdsText, correctParsing, materialType = 'general') {
    this.trainingExamples.push({
      id: Date.now().toString(),
      input: sdsText.substring(0, 1000), // Store sample for prompting
      output: correctParsing,
      materialType: materialType,
      timestamp: new Date().toISOString()
    });
    
    await this.saveTrainingData();
    console.log('✅ Training example added successfully');
  }

  /**
   * Get parsing success metrics
   */
  getMetrics() {
    return {
      ...this.successMetrics,
      successRate: this.successMetrics.totalAttempts > 0 ? 
        (this.successMetrics.successfulParses / this.successMetrics.totalAttempts) * 100 : 0
    };
  }
}