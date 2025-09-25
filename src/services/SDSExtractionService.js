/**
 * SDSExtractionService.js
 * Handles SDS extraction using Groq and Gemini APIs with intelligent fallback
 */

import { SDSExtractionSchema, validateExtractedData } from '../schemas/SDSExtractionSchema.js';
import fs from 'fs';
import axios from 'axios';

export class SDSExtractionService {
  constructor(apiKeys = {}) {
    this.groqApiKey = apiKeys.groq || process.env.GROQ_API_KEY;
    this.geminiApiKey = apiKeys.gemini || process.env.GEMINI_API_KEY;
    this.defaultTimeout = 60000; // 60 seconds
    this.maxRetries = 2;
  }

  /**
   * Extract structured data from SDS text using API providers
   * @param {string} sdsText - Raw SDS text content
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Structured SDS data
   */
  async extractSDSData(sdsText, options = {}) {
    const extractionPrompt = this.buildExtractionPrompt(sdsText, options);
    let result = null;
    let errors = [];

    // Try Groq first (faster and more cost-effective)
    if (this.groqApiKey) {
      try {
        console.log('Attempting extraction with Groq...');
        result = await this.extractWithGroq(extractionPrompt, options);
        if (result && this.isValidExtraction(result)) {
          result.extractionMeta.apiProvider = 'groq';
          console.log('✅ Groq extraction successful');
          return result;
        }
      } catch (error) {
        console.warn('⚠️ Groq extraction failed:', error.message);
        if (error.response) {
          console.error('Groq API Response:', error.response.status, error.response.data);
        }
        errors.push(`Groq: ${error.message}`);
      }
    }

    // Fallback to Gemini
    if (this.geminiApiKey) {
      try {
        console.log('Attempting extraction with Gemini...');
        result = await this.extractWithGemini(extractionPrompt, options);
        if (result && this.isValidExtraction(result)) {
          result.extractionMeta.apiProvider = 'gemini';
          console.log('✅ Gemini extraction successful');
          return result;
        }
      } catch (error) {
        console.warn('⚠️ Gemini extraction failed:', error.message);
        if (error.response) {
          console.error('Gemini API Response:', error.response.status, error.response.data);
        }
        errors.push(`Gemini: ${error.message}`);
      }
    }

    // If both fail, return partial data with errors
    throw new Error(`All API providers failed: ${errors.join('; ')}`);
  }

  /**
   * Extract data using Groq API
   */
  async extractWithGroq(prompt, options = {}) {
    const startTime = Date.now();

    const requestData = {
      messages: [
        {
          role: "system",
          content: "You are a specialized AI for extracting structured data from Safety Data Sheets (SDS). Return ONLY valid JSON matching the exact schema provided. Do not include any explanatory text before or after the JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: options.groqModel || "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 4000,
      top_p: 0.9,
      stream: false
    };

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', requestData, {
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.defaultTimeout
    });

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Groq API');
    }

    // Parse JSON response
    const jsonData = this.parseJsonResponse(content);

    // Add extraction metadata
    jsonData.extractionMeta = {
      extractionDate: new Date().toISOString(),
      apiProvider: 'groq',
      model: requestData.model,
      processingTime: Date.now() - startTime,
      confidence: this.calculateConfidence(jsonData),
      warnings: [],
      missingData: this.identifyMissingData(jsonData)
    };

    return jsonData;
  }

  /**
   * Extract data using Gemini API
   */
  async extractWithGemini(prompt, options = {}) {
    const startTime = Date.now();

    const requestData = {
      contents: [{
        parts: [{
          text: `You are a specialized AI for extracting structured data from Safety Data Sheets (SDS). Return ONLY valid JSON matching the exact schema provided. Do not include any explanatory text before or after the JSON.\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.9,
        maxOutputTokens: 4000,
      }
    };

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.defaultTimeout
      }
    );

    const content = response.data.candidates[0]?.content?.parts[0]?.text;
    if (!content) {
      throw new Error('No content returned from Gemini API');
    }

    // Parse JSON response
    const jsonData = this.parseJsonResponse(content);

    // Add extraction metadata
    jsonData.extractionMeta = {
      extractionDate: new Date().toISOString(),
      apiProvider: 'gemini',
      model: 'gemini-pro',
      processingTime: Date.now() - startTime,
      confidence: this.calculateConfidence(jsonData),
      warnings: [],
      missingData: this.identifyMissingData(jsonData)
    };

    return jsonData;
  }

  /**
   * Extract only relevant SDS sections to reduce token usage
   */
  extractRelevantSections(sdsText) {
    const relevantSections = [];
    const lines = sdsText.split('\n');

    // More flexible patterns to catch various SDS formats
    const sectionPatterns = [
      { id: 1, pattern: /^\s*1[\.\s\-\:\|]*(?:identification|product\s+identification)/i },
      { id: 3, pattern: /^\s*3[\.\s\-\:\|]*(?:composition|ingredient|component)/i },
      { id: 9, pattern: /^\s*9[\.\s\-\:\|]*(?:physical|chemical\s+propert)/i },
      { id: 10, pattern: /^\s*10[\.\s\-\:\|]*(?:stability|reactivity)/i },
      { id: 14, pattern: /^\s*14[\.\s\-\:\|]*(?:transport|shipping)/i }
    ];

    let currentSection = '';
    let inRelevantSection = false;
    let currentSectionId = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if this line starts a relevant section
      const matchedSection = sectionPatterns.find(sec => sec.pattern.test(line));
      if (matchedSection) {
        if (currentSection && inRelevantSection) {
          relevantSections.push({ id: currentSectionId, content: currentSection.trim() });
        }
        currentSection = line + '\n';
        inRelevantSection = true;
        currentSectionId = matchedSection.id;
        console.log(`🎯 Found Section ${matchedSection.id}: ${line.trim().substring(0, 50)}...`);
        continue;
      }

      // Check if this line starts a different numbered section (stop current section)
      if (/^\s*(?:1[1-6]|[2-8])[\.\s\-\:\|]/.test(line) && !matchedSection) {
        if (currentSection && inRelevantSection) {
          relevantSections.push({ id: currentSectionId, content: currentSection.trim() });
        }
        currentSection = '';
        inRelevantSection = false;
        currentSectionId = null;
        continue;
      }

      // Add line to current section if we're in a relevant one
      if (inRelevantSection) {
        currentSection += line + '\n';
      }
    }

    // Add the last section if it was relevant
    if (currentSection && inRelevantSection) {
      relevantSections.push({ id: currentSectionId, content: currentSection.trim() });
    }

    // Create extraction report
    const extractedText = relevantSections.map(sec => sec.content).join('\n\n---\n\n');
    const foundSections = relevantSections.map(sec => sec.id).join(', ');
    console.log(`📄 Extracted ${extractedText.length} characters from ${relevantSections.length} relevant sections: [${foundSections}]`);

    // Better fallback - if no sections found, use smart truncation of beginning
    if (extractedText.length === 0) {
      console.log(`⚠️ No sections found, using smart fallback extraction`);
      const fallbackText = sdsText.substring(0, 8000);
      console.log(`📄 Fallback: ${fallbackText.length} characters from document start`);
      return fallbackText;
    }

    return extractedText;
  }

  /**
   * Build comprehensive extraction prompt with schema
   */
  buildExtractionPrompt(sdsText, options = {}) {
    // Extract only relevant sections to minimize token usage
    const relevantContent = this.extractRelevantSections(sdsText);

    return `
EXTRACT STRUCTURED DATA FROM SAFETY DATA SHEET

You must extract data from this SDS and return it in EXACT JSON format matching the schema below.

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no explanations, no markdown formatting, no additional text
2. Follow the exact schema structure provided
3. Use null for missing numeric values, empty arrays [] for missing lists
4. Extract ALL chemical composition data with CAS numbers in XXX-XX-X format
5. Pay special attention to physical properties (flash point, pH, boiling point, etc.)
6. Extract hazard classifications and GHS information completely
7. Look for TCLP data and regulatory information carefully

JSON SCHEMA TO FOLLOW:
${JSON.stringify(SDSExtractionSchema, null, 2)}

RELEVANT SDS SECTIONS TO PROCESS:
${relevantContent}

Return the extracted data as JSON matching the above schema exactly:`;
  }

  /**
   * Parse JSON response with error handling
   */
  parseJsonResponse(content) {
    // Clean up common JSON formatting issues
    let cleanContent = content.trim();

    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to find JSON if embedded in text
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanContent = jsonMatch[0];
    }

    try {
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('JSON Parse Error:', error.message);
      console.error('Content:', cleanContent.substring(0, 500) + '...');
      throw new Error(`Invalid JSON response: ${error.message}`);
    }
  }

  /**
   * Validate extraction quality
   */
  isValidExtraction(data) {
    const validation = validateExtractedData(data);

    // Must have basic required fields
    if (!validation.isValid) {
      console.warn('Validation errors:', validation.errors);
      return false;
    }

    // Must have some meaningful data
    const hasProductInfo = data.productInfo?.productName;
    const hasPhysicalState = data.physicalProperties?.physicalState;
    const hasComposition = data.composition && data.composition.length > 0;

    return hasProductInfo && hasPhysicalState && (hasComposition || data.rawSections);
  }

  /**
   * Calculate confidence score based on data completeness
   */
  calculateConfidence(data) {
    let score = 0;
    let maxScore = 0;

    // Product info (20 points)
    maxScore += 20;
    if (data.productInfo?.productName) score += 5;
    if (data.productInfo?.manufacturer) score += 5;
    if (data.productInfo?.casNumber) score += 5;
    if (data.productInfo?.dateOfSds) score += 5;

    // Physical properties (25 points)
    maxScore += 25;
    if (data.physicalProperties?.physicalState) score += 5;
    if (data.physicalProperties?.flashPoint?.value !== null) score += 8;
    if (data.physicalProperties?.pH !== null) score += 7;
    if (data.physicalProperties?.boilingPoint?.value !== null) score += 3;
    if (data.physicalProperties?.density?.value !== null) score += 2;

    // Composition (30 points)
    maxScore += 30;
    if (data.composition && data.composition.length > 0) {
      score += 15;
      const hasPercentages = data.composition.some(c => typeof c.percentage === 'number');
      const hasCasNumbers = data.composition.some(c => c.casNumber);
      if (hasPercentages) score += 8;
      if (hasCasNumbers) score += 7;
    }

    // Hazard data (15 points)
    maxScore += 15;
    if (data.hazardClassifications?.ghsClassifications?.length > 0) score += 8;
    if (data.hazardClassifications?.hazardStatements?.length > 0) score += 7;

    // Other data (10 points)
    maxScore += 10;
    if (data.stabilityReactivity?.chemicalStability) score += 3;
    if (data.toxicology?.acuteToxicity) score += 3;
    if (data.analyticalData?.tclpResults?.length > 0) score += 4;

    return Math.min(1.0, score / maxScore);
  }

  /**
   * Identify missing critical data fields
   */
  identifyMissingData(data) {
    const missing = [];

    if (!data.productInfo?.productName) missing.push('Product name');
    if (!data.productInfo?.manufacturer) missing.push('Manufacturer');
    if (!data.physicalProperties?.physicalState) missing.push('Physical state');
    if (!data.composition || data.composition.length === 0) missing.push('Chemical composition');
    if (!data.physicalProperties?.flashPoint?.value && data.physicalProperties?.physicalState === 'liquid') {
      missing.push('Flash point for liquid');
    }
    if (!data.physicalProperties?.pH) missing.push('pH value');
    if (!data.hazardClassifications?.ghsClassifications?.length) missing.push('GHS classifications');
    if (!data.analyticalData?.tclpResults?.length) missing.push('TCLP analytical data');

    return missing;
  }

  /**
   * Process SDS file directly
   */
  async extractFromFile(filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`SDS file not found: ${filePath}`);
    }

    const sdsText = fs.readFileSync(filePath, 'utf-8');
    return await this.extractSDSData(sdsText, options);
  }

  /**
   * Batch process multiple SDS files
   */
  async extractFromFiles(filePaths, options = {}) {
    const results = [];

    for (const filePath of filePaths) {
      try {
        console.log(`Processing: ${filePath}`);
        const result = await this.extractFromFile(filePath, options);
        results.push({
          filePath,
          success: true,
          data: result
        });
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error.message);
        results.push({
          filePath,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default SDSExtractionService;