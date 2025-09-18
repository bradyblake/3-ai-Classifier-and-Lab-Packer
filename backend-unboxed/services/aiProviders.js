// Unified AI Provider Service - Beta Version
// Supports: Google Gemini (free), Groq (free) - NO PAID SERVICES

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import RegulatoryHierarchy from './regulatoryHierarchy.js';
import ComprehensiveWasteAnalyzer from './comprehensiveWasteAnalyzer.js';
import basicCasLookup from './basicCasLookup.js';

class AIProviderService {
  constructor() {
    // Initialize providers based on available API keys
    this.providers = {};
    this.regulatoryHierarchy = new RegulatoryHierarchy();
    this.comprehensiveAnalyzer = new ComprehensiveWasteAnalyzer();
    
    // Multiple Gemini keys for rate limit management
    this.geminiKeys = [];
    this.currentGeminiKeyIndex = 0;
    
    // Google Gemini - FREE tier: 60 requests/minute per key
    // Support multiple keys: GEMINI_API_KEY, GEMINI_API_KEY_2, etc.
    const geminiKey1 = process.env.GEMINI_API_KEY;
    const geminiKey2 = process.env.GEMINI_API_KEY_2;
    
    if (geminiKey1) {
      this.geminiKeys.push(new GoogleGenerativeAI(geminiKey1));
    }
    if (geminiKey2) {
      this.geminiKeys.push(new GoogleGenerativeAI(geminiKey2));
    }
    
    if (this.geminiKeys.length > 0) {
      this.providers.gemini = this.geminiKeys[0]; // Start with first key
      console.log(`🔑 Loaded ${this.geminiKeys.length} Gemini API key(s)`);
    }
    
    // Groq - FREE tier: 30 requests/minute, super fast
    if (process.env.GROQ_API_KEY) {
      this.providers.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });
    }
    
    // OpenAI REMOVED for Beta - Free providers only!
    
    console.log('🤖 AI Providers initialized:', Object.keys(this.providers).join(', '));
  }

  // Method to reinitialize providers (for when API keys are added via UI)
  initializeProviders() {
    this.providers = {};
    this.geminiKeys = [];
    this.currentGeminiKeyIndex = 0;
    
    // Multiple Gemini keys for rate limit management
    const geminiKey1 = process.env.GEMINI_API_KEY;
    const geminiKey2 = process.env.GEMINI_API_KEY_2;
    
    if (geminiKey1) {
      this.geminiKeys.push(new GoogleGenerativeAI(geminiKey1));
    }
    if (geminiKey2) {
      this.geminiKeys.push(new GoogleGenerativeAI(geminiKey2));
    }
    
    if (this.geminiKeys.length > 0) {
      this.providers.gemini = this.geminiKeys[0]; // Start with first key
      console.log(`🔑 Reloaded ${this.geminiKeys.length} Gemini API key(s)`);
    }
    
    // Groq - FREE tier: 30 requests/minute, super fast
    if (process.env.GROQ_API_KEY) {
      this.providers.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });
    }
    
    console.log('🔄 AI Providers reinitialized:', Object.keys(this.providers).join(', '));
  }

  async analyzeWithGemini(text, options = {}) {
    try {
      const model = this.providers.gemini.getGenerativeModel({ 
        model: options.model || 'gemini-1.5-flash' // Free, fast, 1M context
      });

      const prompt = this.formatPromptForGemini(text);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini error:', error.message);
      throw error;
    }
  }

  async analyzeWithGroq(text, options = {}) {
    try {
      const completion = await this.providers.groq.chat.completions.create({
        model: options.model || 'llama-3.1-8b-instant', // Updated model, still free
        messages: [
          {
            role: 'system',
            content: 'You are a hazardous waste classification expert. Analyze SDS documents and provide EPA codes, DOT classifications, and state waste codes.'
          },
          {
            role: 'user',
            content: this.formatPromptForGroq(text)
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Groq error:', error.message);
      throw error;
    }
  }

  // OpenAI method removed for Beta version - Free providers only!

  async analyze(text, provider = 'gemini', options = {}) {
    // Check if provider is available
    if (!this.providers[provider]) {
      // Fallback order: gemini -> groq (Beta: no OpenAI)
      const fallbacks = ['gemini', 'groq'];
      for (const fb of fallbacks) {
        if (this.providers[fb]) {
          console.log(`Provider ${provider} not available, falling back to ${fb}`);
          provider = fb;
          break;
        }
      }
    }

    // Try the primary provider with rate limit fallback
    try {
      return await this.analyzeWithProvider(text, provider, options);
    } catch (error) {
      // Handle rate limit errors by falling back to alternative provider
      if (this.isRateLimitError(error)) {
        console.log(`🚨 Rate limit reached for ${provider}, falling back to alternative provider`);
        const fallbackProvider = provider === 'groq' ? 'gemini' : 'groq';
        if (this.providers[fallbackProvider]) {
          console.log(`🔄 Retrying with ${fallbackProvider}...`);
          return await this.analyzeWithProvider(text, fallbackProvider, options);
        }
      }
      throw error;
    }
  }

  // Helper method to detect rate limit errors
  isRateLimitError(error) {
    const errorMessage = error.message || '';
    return errorMessage.includes('rate_limit_exceeded') || 
           errorMessage.includes('Rate limit') ||
           errorMessage.includes('429') ||
           errorMessage.includes('quota') ||
           errorMessage.includes('RATE_LIMIT_EXCEEDED') ||
           error.status === 429;
  }

  // Rotate to next available Gemini key
  rotateGeminiKey() {
    if (this.geminiKeys.length <= 1) {
      console.log('🔄 Only one Gemini key available, cannot rotate');
      return false;
    }
    
    this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
    this.providers.gemini = this.geminiKeys[this.currentGeminiKeyIndex];
    console.log(`🔄 Rotated to Gemini key ${this.currentGeminiKeyIndex + 1}/${this.geminiKeys.length}`);
    return true;
  }

  // Unified provider analysis method
  async analyzeWithProvider(text, provider, options = {}) {
    console.log(`🔍 Analyzing with ${provider} using regulatory hierarchy...`);

    // Use appropriate prompt based on mode
    const state = options.state || 'TX';
    const mode = options.mode || 'standard';
    const extractedSections = options.extractedSections || null;
    
    // Add CAS enhancement information to the prompt if available
    let casEnhancementInfo = '';
    if (extractedSections && (extractedSections.casNumbers || extractedSections.chemicals)) {
      console.log('🧪 CAS Enhancement: Found extracted sections with', {
        chemicals: extractedSections.chemicals?.length || 0,
        casNumbers: extractedSections.casNumbers?.length || 0
      });
      casEnhancementInfo = this.buildCASEnhancementInfo(extractedSections);
      console.log('🔍 Adding CAS enhancement to AI prompt');
      console.log('📊 CAS enhancement length:', casEnhancementInfo.length);
    } else {
      console.log('⚠️ No extracted sections for CAS enhancement');
    }
    
    // Choose prompt based on speed requirements
    let enhancedPrompt;
    if (mode === 'lab_pack') {
      enhancedPrompt = this.regulatoryHierarchy.buildLabPackPrompt(text, state);
    } else if (mode === 'detailed') {
      enhancedPrompt = this.regulatoryHierarchy.buildEnhancedPrompt(text, state);
    } else if (mode === 'ultra_fast' || mode === 'rapid') {
      // Ultra-fast mode for speed-critical situations
      enhancedPrompt = this.regulatoryHierarchy.buildUltraFastPrompt(text, state);
    } else {
      // Default to fast prompt for good balance
      enhancedPrompt = this.regulatoryHierarchy.buildFastPrompt(text, state);
    }
    
    // Add CAS enhancement info and pre-populate JSON template
    if (casEnhancementInfo) {
      enhancedPrompt += '\n\nIMPORTANT CAS DATABASE INFORMATION:\n' + casEnhancementInfo;
      
      // Also pre-populate the JSON template with CAS-enhanced values
      const casEnhancedJson = this.buildCASEnhancedJsonTemplate(extractedSections);
      if (casEnhancedJson) {
        enhancedPrompt += '\n\n🔬 PRE-FILLED JSON WITH CAS ENHANCEMENTS:\n';
        enhancedPrompt += 'Use this as your starting template (CAS database has filled in missing values):\n';
        enhancedPrompt += casEnhancedJson;
      }
    }

    switch (provider) {
      case 'gemini':
        return await this.analyzeWithGeminiHierarchy(enhancedPrompt, options);
      case 'groq':
        return await this.analyzeWithGroqHierarchy(enhancedPrompt, options);
      // OpenAI case removed for Beta version
      default:
        throw new Error(`No AI provider available. Please configure API keys.`);
    }
  }

  // Hierarchy-aware analysis methods
  async analyzeWithGeminiHierarchy(enhancedPrompt, options = {}) {
    let attempt = 0;
    const maxAttempts = this.geminiKeys.length;
    
    while (attempt < maxAttempts) {
      try {
        const model = this.providers.gemini.getGenerativeModel({ 
          model: options.model || 'gemini-1.5-flash'
        });

        const result = await model.generateContent(enhancedPrompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error(`Gemini key ${this.currentGeminiKeyIndex + 1} error:`, error.message);
        
        // If rate limit error and we have more keys, rotate and retry
        if (this.isRateLimitError(error) && this.rotateGeminiKey()) {
          attempt++;
          console.log(`🔄 Retrying with Gemini key ${this.currentGeminiKeyIndex + 1} (attempt ${attempt + 1}/${maxAttempts})`);
          continue;
        }
        
        // If not a rate limit error or no more keys, throw
        throw error;
      }
    }
    
    throw new Error('All Gemini keys exhausted due to rate limits');
  }

  async analyzeWithGroqHierarchy(enhancedPrompt, options = {}) {
    try {
      const completion = await this.providers.groq.chat.completions.create({
        model: options.model || 'llama-3.1-8b-instant', // Fastest model available
        messages: [
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        temperature: 0.0, // Deterministic for speed
        max_tokens: 800   // Reduced for faster response
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Groq hierarchy analysis error:', error.message);
      throw error;
    }
  }

  // OpenAI hierarchy method removed for Beta version - Free providers only!

  /**
   * Comprehensive waste analysis with question-based context
   */
  async analyzeComprehensively(sdsText, userContext, provider = 'gemini', options = {}) {
    console.log('🧪 Starting comprehensive waste analysis with user context...');
    
    // Generate comprehensive analysis prompt based on user context
    const comprehensivePrompt = this.comprehensiveAnalyzer.buildComprehensiveAnalysisPrompt(sdsText, userContext);
    
    // Use appropriate provider with comprehensive prompt
    let analysisResult;
    switch (provider) {
      case 'gemini':
        analysisResult = await this.analyzeWithGeminiComprehensive(comprehensivePrompt, options);
        break;
      case 'groq':
        analysisResult = await this.analyzeWithGroqComprehensive(comprehensivePrompt, options);
        break;
      default:
        throw new Error(`Provider ${provider} not available for comprehensive analysis`);
    }

    // Parse and validate the result
    let parsedResult;
    try {
      // Try to extract JSON from response (handle cases where AI includes explanatory text)
      let jsonString = analysisResult;
      
      // Look for JSON in markdown code blocks
      const jsonMatch = analysisResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      } else {
        // Look for JSON object pattern
        const objectMatch = analysisResult.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          jsonString = objectMatch[0];
        }
      }
      
      parsedResult = JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
      console.error('Response was:', analysisResult.substring(0, 500) + '...');
      throw new Error('AI response was not valid JSON');
    }

    // Add comprehensive analysis metadata
    parsedResult.analysisMetadata = {
      userContext: userContext,
      systematicEvaluation: true,
      comprehensiveApproach: true,
      timestamp: new Date().toISOString()
    };

    return parsedResult;
  }

  /**
   * Gemini provider for comprehensive analysis
   */
  async analyzeWithGeminiComprehensive(prompt, options = {}) {
    let attempt = 0;
    const maxAttempts = this.geminiKeys.length;
    
    while (attempt < maxAttempts) {
      try {
        const model = this.providers.gemini.getGenerativeModel({ 
          model: options.model || 'gemini-1.5-flash'
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error(`Gemini comprehensive key ${this.currentGeminiKeyIndex + 1} error:`, error.message);
        
        // If rate limit error and we have more keys, rotate and retry
        if (this.isRateLimitError(error) && this.rotateGeminiKey()) {
          attempt++;
          console.log(`🔄 Retrying comprehensive analysis with Gemini key ${this.currentGeminiKeyIndex + 1} (attempt ${attempt + 1}/${maxAttempts})`);
          continue;
        }
        
        // If not a rate limit error or no more keys, throw
        throw error;
      }
    }
    
    throw new Error('All Gemini keys exhausted due to rate limits in comprehensive analysis');
  }

  /**
   * Groq provider for comprehensive analysis  
   */
  async analyzeWithGroqComprehensive(prompt, options = {}) {
    try {
      const completion = await this.providers.groq.chat.completions.create({
        model: options.model || 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an environmental chemist conducting comprehensive hazardous waste analysis. Systematically evaluate ALL EPA waste codes (D, F, K, U, P) with detailed reasoning. Return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000 // Increased for comprehensive analysis
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Groq comprehensive analysis error:', error.message);
      throw error;
    }
  }

  formatPromptForGemini(text) {
    return `You are a certified hazardous waste expert. Analyze this SDS systematically and extract precise data:

SDS Content:
${text.substring(0, 5000)}

CRITICAL ANALYSIS REQUIREMENTS:

1. FLASH POINT EXTRACTION (MANDATORY - EXTRACT FROM SDS DOCUMENT ONLY):
   - Search ALL sections for: "Flash Point", "Flash Pt", "Flashpoint", "FP", "Closed Cup", "Tag Closed Cup"
   - Check Sections 5 (Fire-fighting), 9 (Physical properties), 14 (Transport)
   - Extract EXACT values and convert: "104°F" = 40°C
   - CRITICAL: Only extract data actually present in the SDS document
   - NEVER use default values or assumptions about specific chemicals
   - If flash point not found in document, return null/N/A

2. DOT CLASSIFICATION EXTRACTION (MANDATORY):
   - Search Section 14 for: "UN" followed by 4 digits (UN1993, UN3082, etc.)
   - Extract "Proper Shipping Name" from Section 14
   - Look for "Class" or "Hazard Class" followed by number
   - Search for "Packing Group I", "Packing Group II", "Packing Group III"

3. FEDERAL CLASSIFICATION LOGIC (APPLY RIGOROUSLY):
   D001 Ignitability: Flash point <60°C (140°F) for LIQUIDS
   D002 Corrosivity: pH ≤2.0 or ≥12.5 for LIQUIDS/AQUEOUS ONLY - NEVER SOLIDS
   
   CRITICAL SOLID CAUSTIC RULE:
   - Sodium hydroxide PELLETS/BEADS = NON-HAZARDOUS (solid form)
   - Potassium hydroxide PELLETS/BEADS = NON-HAZARDOUS (solid form)  
   - Caustic soda BEADS = NON-HAZARDOUS (solid form)
   - Only LIQUID caustics with pH ≥12.5 get D002
   
   CLASSIFICATION RULES (BASED ON ACTUAL EXTRACTED DATA ONLY):
   - Flash point <60°C AND liquid state = D001 HAZARDOUS
   - pH ≤2 OR pH ≥12.5 AND liquid state = D002 HAZARDOUS
   - Solid materials generally NON-HAZARDOUS unless pH extreme
   - Aerosols may be hazardous based on flash point of contents

4. STATE CLASSIFICATION (TEMPORARILY DISABLED - FOCUS ON FEDERAL):
   // Texas form codes and state classifications deactivated
   // Focus on federal D-codes only for now

5. PHYSICAL STATE DETERMINATION (NO "unknown" ALLOWED):
   - Search for explicit state: "Physical state:", "Form:", "Appearance:"
   - AEROSOL indicators: "aerosol", "spray", "pressurized container", "propellant"
   - SOLID indicators: "solid", "pellets", "beads", "powder", "crystals", "granules"
   - SEMI-SOLID indicators: "grease", "paste", "gel", "semi-solid"
   - LIQUID indicators: "liquid", "solution", "fluid"
   - GAS indicators: "gas", "vapor", "compressed gas"
   - DEFAULT: If petroleum grease → "semi-solid", if solvent → "liquid"

Return COMPREHENSIVE JSON:
{
  "productName": "exact product name from SDS",
  "flashPoint": {"celsius": number, "fahrenheit": number},
  "pH": numeric value or null,
  "physicalState": "liquid|solid|gas|aerosol",
  "federal_codes": ["D001", "D002"],
  "dot_info": {
    "un_number": "UN####",
    "proper_shipping_name": "exact shipping name",
    "hazard_class": "class number",
    "packing_group": "I|II|III"
  },
  "final_classification": "hazardous if federal D-codes present, else non-hazardous"
}

ABSOLUTE REQUIREMENTS - VERIFY BEFORE RETURNING:
✓ Extract ONLY data actually present in the SDS document
✓ NO default values or chemical-specific assumptions
✓ NO "unknown" physical states (extract from document or infer from context)
✓ Flash points only if explicitly stated in SDS document
✓ Form codes MUST match material type (aerosol=208, solvent=203, etc.)
✓ Classifications based ONLY on extracted data per 40 CFR regulations`;
  }

  formatPromptForGroq(text) {
    return `You are a certified hazardous waste expert. CRITICAL: Extract ALL data fields - NO "N/A" or "null" allowed for flash points!

ANALYZE THIS SDS WITH EXTREME PRECISION:

${text.substring(0, 4000)}

CRITICAL ANALYSIS STEPS:

1. MATERIAL IDENTIFICATION:
   - Extract exact product name
   - Identify chemical composition with CAS numbers
   - Note physical state (liquid/solid/gas/aerosol)

2. FLASH POINT EXTRACTION (MANDATORY - EXTRACT OR CALCULATE):
   - Search ENTIRE document for: "Flash Point", "Flash Pt", "Flashpoint", "FP", "Closed Cup"
   - Look in Sections 5 (Fire), 9 (Physical), and 14 (Transport)
   - Extract EXACT values: "56°C (133°F)" → {celsius: 56, fahrenheit: 133}
   - CRITICAL: Extract ONLY values actually present in SDS document
   - NEVER use predetermined values for specific chemicals
   - If flash point not found in document, return null
   - Base classification strictly on extracted data per 40 CFR

3. DOT CLASSIFICATION EXTRACTION (MANDATORY):
   - Search Section 14 for: "UN" followed by 4 digits (UN1993, UN3082, etc.)
   - Extract "Proper Shipping Name" from Section 14
   - Look for "Class" or "Hazard Class" followed by number
   - Search for "Packing Group I", "Packing Group II", "Packing Group III"
   - Extract patterns as found in Section 14:
     * UN numbers: UN followed by 4 digits (UN1993, UN1090, etc.)
     * Proper Shipping Name: exact text from SDS document
     * Hazard Class: numerical classification (Class 3, Class 2.1, etc.)
     * Packing Group: PG I, PG II, or PG III if specified

4. FEDERAL CLASSIFICATION LOGIC (EVALUATE ALL - MULTIPLE D-CODES CAN APPLY):
   D001: Flash point <60°C (140°F) for ANY liquid - THIS IS MANDATORY
   D002: pH ≤2.0 or ≥12.5 for LIQUIDS only (NEVER for solids)
   D003: Reactive - unstable, water reactive, toxic gas generation
   D004-D043: TCLP leaching for EACH constituent (lead=D008, cadmium=D006, benzene=D018, etc.)
   F003: Spent non-halogenated solvents (acetone, ethyl acetate, ethyl ether)
   F005: Spent non-halogenated solvents (toluene, MEK, carbon disulfide)
   
   CRITICAL: CHECK FOR MULTIPLE D-CODES ON SAME WASTE:
   - Acidic solvent: D001 (flammable) + D002 (corrosive)
   - Contaminated paint thinner: D001 + D008 (lead) + D018 (benzene)
   - Metal degreaser: D001 + D002 + multiple TCLP codes
   
   CRITICAL EXAMPLES:
   - Materials with flash point <60°C AND liquid state = D001 HAZARDOUS
   - Materials with pH ≤2.0 or pH ≥12.5 AND liquid state = D002 HAZARDOUS
   - Base classification solely on extracted SDS data per 40 CFR 261

5. TEXAS FORM CODE LOGIC (FOLLOW EXACTLY):
   STEP 1 - Physical State:
   - If "aerosol", "spray", "pressurized container", "propellant" → Form 208 (AEROSOL)
   - If "solid", "pellet", "bead", "powder" → Form 204 (SOLID)
   - If "grease", "paste", "semi-solid" → Check composition:
     * With petroleum → Form 110 (used oil/grease)
     * Without petroleum → Form 102 or 204
   
   STEP 2 - Liquid Classification:
   - pH ≤2.0 → Form 105 (acid waste)
   - pH ≥12.5 → Form 106 (alkaline waste)
   - Organic solvent (acetone, MEK, toluene) → Form 203
   - Petroleum product (gasoline, diesel) → Form 202
   - Neutral aqueous → Form 102
   
   STEP 3 - Texas Class:
   - If D001/D002/F-codes → "H" (hazardous)
   - If petroleum constituents → "1" (Class 1)
   - If organics without petroleum → "2" (Class 2)
   - Otherwise → "3" (Class 3)

Return COMPREHENSIVE JSON:
{
  "productName": "exact name from SDS",
  "flashPoint": {"celsius": number, "fahrenheit": number},
  "pH": number or null,
  "physicalState": "liquid|solid|gas|aerosol",
  "federal_codes": ["D001", "D002"],
  "dot_info": {
    "un_number": "UN####",
    "proper_shipping_name": "exact shipping name",
    "hazard_class": "class number",
    "packing_group": "I|II|III"
  },
  "final_classification": "hazardous|non-hazardous"
}

CRITICAL VALIDATION CHECKLIST:
✓ ACETONE → MUST BE: D001, form 203-H, flash -18°C
✓ Paint thinner → MUST BE: D001, form 203-H or 202-H, flash ~40°C
✓ WD-40 → MUST BE: D001, form 208-H (aerosol), flash 47°C
✓ Grease with petroleum → Form 110-1 (Class 1, not 3)
✓ Caustic soda beads → Form 204-3 (solid, non-hazardous)
✓ ALL flash points must be numbers, not "N/A" or null
✓ Physical state CANNOT be "unknown" - extract or infer`;
  }

  // OpenAI prompt formatter removed for Beta version - Free providers only!

  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  hasProvider(name) {
    return !!this.providers[name];
  }

  /**
   * Classification method for reclassify endpoint
   * Wrapper around analyze method for classification-specific prompts
   */
  async classify(prompt, provider = 'groq', options = {}) {
    try {
      console.log(`🔍 Classifying with ${provider}...`);
      
      // Use the analyze method with classification-specific settings
      const result = await this.analyze(prompt, provider, {
        ...options,
        mode: 'classification',
        temperature: 0.1,
        max_tokens: 1500
      });
      
      return result;
    } catch (error) {
      console.error(`Classification error with ${provider}:`, error.message);
      throw error;
    }
  }

  /**
   * Build CAS enhancement information for AI prompts
   * Looks up hazard characteristics for each CAS number found
   */
  buildCASEnhancementInfo(extractedSections) {
    let enhancementInfo = '';
    
    if (!extractedSections) return enhancementInfo;
    
    // Process chemicals with CAS numbers
    if (extractedSections.chemicals && extractedSections.chemicals.length > 0) {
      enhancementInfo += 'CAS Number Database Enhancements:\n';
      
      extractedSections.chemicals.forEach(chemical => {
        if (chemical.casNumber) {
          const hazardData = basicCasLookup.getHazardCharacteristics(chemical.casNumber);
          if (hazardData) {
            enhancementInfo += `- ${chemical.name} (CAS ${chemical.casNumber}):\n`;
            if (hazardData.pH !== null && hazardData.pH !== undefined) {
              enhancementInfo += `  * pH: ${hazardData.pH} (${hazardData.pH <= 2 ? 'HIGHLY ACIDIC - D002 CORROSIVE' : hazardData.pH >= 12.5 ? 'HIGHLY BASIC - D002 CORROSIVE' : 'neutral range'})\n`;
            }
            if (hazardData.flashPoint !== null && hazardData.flashPoint !== undefined) {
              enhancementInfo += `  * Flash Point: ${hazardData.flashPoint}°C (${hazardData.flashPoint < 60 ? 'IGNITABLE - D001' : 'not ignitable'})\n`;
            }
            if (hazardData.federalCodes && hazardData.federalCodes.length > 0) {
              enhancementInfo += `  * Federal Codes: ${hazardData.federalCodes.join(', ')}\n`;
            }
            if (hazardData.category) {
              enhancementInfo += `  * Category: ${hazardData.category}\n`;
            }
            enhancementInfo += '\n';
          }
        }
      });
    }
    
    // Process standalone CAS numbers if no chemical data
    if ((!extractedSections.chemicals || extractedSections.chemicals.length === 0) && 
        extractedSections.casNumbers && extractedSections.casNumbers.length > 0) {
      enhancementInfo += 'CAS Number Database Enhancements:\n';
      
      extractedSections.casNumbers.forEach(casNumber => {
        const hazardData = basicCasLookup.getHazardCharacteristics(casNumber);
        if (hazardData) {
          enhancementInfo += `- CAS ${casNumber} (${hazardData.name}):\n`;
          if (hazardData.pH !== null && hazardData.pH !== undefined) {
            enhancementInfo += `  * pH: ${hazardData.pH} (${hazardData.pH <= 2 ? 'HIGHLY ACIDIC - D002 CORROSIVE' : hazardData.pH >= 12.5 ? 'HIGHLY BASIC - D002 CORROSIVE' : 'neutral range'})\n`;
          }
          if (hazardData.flashPoint !== null && hazardData.flashPoint !== undefined) {
            enhancementInfo += `  * Flash Point: ${hazardData.flashPoint}°C (${hazardData.flashPoint < 60 ? 'IGNITABLE - D001' : 'not ignitable'})\n`;
          }
          if (hazardData.federalCodes && hazardData.federalCodes.length > 0) {
            enhancementInfo += `  * Federal Codes: ${hazardData.federalCodes.join(', ')}\n`;
          }
          enhancementInfo += '\n';
        }
      });
    }
    
    if (enhancementInfo) {
      enhancementInfo += '\n🚨 CRITICAL OVERRIDE INSTRUCTIONS:\n';
      enhancementInfo += '- Even if the SDS says "pH information not available", USE the CAS pH values above for classification!\n';
      enhancementInfo += '- Even if the SDS says "flash point not available", USE the CAS flash point values above for classification!\n';
      enhancementInfo += '- CAS database values override missing SDS data - this is required by regulation!\n';
      enhancementInfo += '- For Sodium Hydroxide (CAS 1310-73-2): pH = 13.5, therefore D002 CORROSIVE, state_form_code = 106!\n';
    }
    
    return enhancementInfo;
  }

  /**
   * Build a pre-filled JSON template with CAS-enhanced values
   */
  buildCASEnhancedJsonTemplate(extractedSections) {
    if (!extractedSections || (!extractedSections.chemicals && !extractedSections.casNumbers)) {
      return null;
    }
    
    // Initialize template with default values
    const template = {
      productName: "",
      flashPoint: { celsius: null },
      pH: null,
      physicalState: "liquid",
      federal_codes: [],
      state_form_code: "102",
      state_classification: "2",
      dot_info: {
        un_number: null,
        proper_shipping_name: null,
        hazard_class: null,
        packing_group: null
      }
    };
    
    // Enhance with CAS data
    const casNumbers = [];
    if (extractedSections.chemicals) {
      extractedSections.chemicals.forEach(chemical => {
        if (chemical.casNumber) casNumbers.push(chemical.casNumber);
      });
    }
    if (extractedSections.casNumbers) {
      casNumbers.push(...extractedSections.casNumbers);
    }
    
    // Apply CAS enhancements
    for (const casNumber of casNumbers) {
      const hazardData = basicCasLookup.getHazardCharacteristics(casNumber);
      if (hazardData) {
        // Enhance pH
        if (template.pH === null && hazardData.pH !== null && hazardData.pH !== undefined) {
          template.pH = hazardData.pH;
        }
        
        // Enhance flash point
        if (template.flashPoint.celsius === null && hazardData.flashPoint !== null && hazardData.flashPoint !== undefined) {
          template.flashPoint.celsius = hazardData.flashPoint;
        }
        
        // Add federal codes
        if (hazardData.federalCodes && hazardData.federalCodes.length > 0) {
          template.federal_codes.push(...hazardData.federalCodes);
        }
        
        // Add DOT info if available
        if (hazardData.dotInfo) {
          template.dot_info.un_number = hazardData.dotInfo.unNumber;
          template.dot_info.proper_shipping_name = hazardData.dotInfo.properShippingName;
          template.dot_info.hazard_class = hazardData.dotInfo.hazardClass;
          template.dot_info.packing_group = hazardData.dotInfo.packingGroup;
        }
        
        // Determine state form code and classification
        if (hazardData.pH !== null && hazardData.pH !== undefined) {
          if (hazardData.pH <= 2) {
            template.state_form_code = "105"; // Acid liquid
            template.state_classification = "H";
          } else if (hazardData.pH >= 12.5) {
            template.state_form_code = "106"; // Alkaline liquid
            template.state_classification = "H";
          }
        }
      }
    }
    
    // Remove duplicates from federal_codes
    template.federal_codes = [...new Set(template.federal_codes)];
    
    return JSON.stringify(template, null, 2);
  }

  // JARVIS-specific query method (bypasses classification system)
  async jarvisQuery(prompt, provider = 'groq', options = {}) {
    console.log(`🤖 JARVIS query with ${provider}:`, prompt.substring(0, 100) + '...');
    
    try {
      let response;
      
      if (provider === 'groq' && this.providers.groq) {
        response = await this.jarvisQueryGroq(prompt, options);
      } else if (provider === 'gemini' && this.providers.gemini) {
        response = await this.jarvisQueryGemini(prompt, options);
      } else {
        // Fallback to available provider
        const availableProviders = Object.keys(this.providers);
        if (availableProviders.length === 0) {
          throw new Error('No AI providers available');
        }
        
        const fallbackProvider = availableProviders[0];
        console.log(`Provider ${provider} not available, using ${fallbackProvider}`);
        return this.jarvisQuery(prompt, fallbackProvider, options);
      }
      
      return response;
    } catch (error) {
      console.error(`❌ JARVIS query failed with ${provider}:`, error);
      throw error;
    }
  }

  async jarvisQueryGroq(prompt, options = {}) {
    try {
      const completion = await this.providers.groq.chat.completions.create({
        model: options.model || 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: options.temperature || 0.1,
        max_tokens: options.max_tokens || 800
      });
      
      return completion.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Groq JARVIS query error:', error);
      throw error;
    }
  }

  async jarvisQueryGemini(prompt, options = {}) {
    let attempt = 0;
    const maxAttempts = this.geminiKeys.length;
    
    while (attempt < maxAttempts) {
      try {
        const currentGemini = this.geminiKeys[this.currentGeminiKeyIndex];
        const model = currentGemini.getGenerativeModel({ 
          model: options.model || 'gemini-1.5-flash'
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error(`Gemini key ${this.currentGeminiKeyIndex} failed:`, error.message);
        
        // Rate limit or other error, try next key
        this.currentGeminiKeyIndex = (this.currentGeminiKeyIndex + 1) % this.geminiKeys.length;
        attempt++;
        
        if (attempt >= maxAttempts) {
          throw new Error(`All Gemini keys failed: ${error.message}`);
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export default AIProviderService;