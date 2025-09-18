// LLM-based SDS Parser Service
// Uses OpenAI or Ollama to intelligently extract structured data from SDS documents

import OpenAI from 'openai';
import AITrainingSystem from './aiTrainingSystem.js';
import casLookupService from './casLookupService.js';

class LLMSDSParser {
  constructor() {
    // LM Studio runs OpenAI-compatible API on port 1234
    this.lmstudio = new OpenAI({ 
      apiKey: 'lm-studio', // LM Studio doesn't need a real API key
      baseURL: 'http://localhost:1234/v1'
    });
    // Fallback to OpenAI if needed
    this.openai = process.env.OPENAI_API_KEY ? 
      new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    
    // Initialize training system for enhanced prompts
    this.trainingSystem = new AITrainingSystem();
  }

  async parseSDSWithLLM(rawText, options = {}) {
    console.log('🔍 parseSDSWithLLM called with text length:', rawText.length);
    const {
      provider = 'lmstudio', // 'lmstudio' or 'openai'
      model = null,
      maxTokens = 3000 // Reduced for 3B models with 2048 context
    } = options;

    // Truncate text if too long (account for prompt overhead)
    const textToAnalyze = rawText.substring(0, maxTokens);

    // Try to detect material type for better prompting
    const materialType = this.extractMaterialType(textToAnalyze);
    
    // Use enhanced prompt with examples if training system is available
    let systemPrompt, userPrompt;
    
    if (this.trainingSystem && materialType) {
      // Get enhanced prompt with relevant examples
      const enhancedPrompt = this.trainingSystem.buildEnhancedPrompt(textToAnalyze, materialType);
      systemPrompt = `You are an expert hazardous waste classifier with extensive knowledge of EPA RCRA and Texas state regulations.`;
      userPrompt = enhancedPrompt;
    } else {
      // Fallback to standard prompt
      systemPrompt = `You are an expert SDS (Safety Data Sheet) parser. Extract information and return ONLY valid JSON.
Your response must be parseable JSON with no additional text before or after.`;

      userPrompt = `CRITICAL: You are an expert hazardous waste classifier. Extract ALL available data from this SDS document. 
Look carefully in ALL sections - many critical values are in tables and specific sections.

SPECIFIC EXTRACTION INSTRUCTIONS:
- Section 1: Product name, manufacturer, CAS number (if single component)
- Section 3: Composition table - extract ALL components with CAS numbers and percentages  
- Section 9: Physical properties - pH, flash point (look for °C, °F, closed cup, open cup)
- Section 14: Transportation - UN number, hazard class, packing group

CRITICAL EXTRACTION RULES:
- Extract actual pH values from Section 9 - do not assume based on material name
- Extract actual flash point from Section 9 - do not assume based on material type
- CAS numbers follow format: ###-##-# or ####-##-#
- Only use data explicitly stated in the SDS document

SDS TEXT:
${textToAnalyze}

Return this EXACT JSON structure (extract EVERY available piece of data):
{
  "productName": "exact product name from Section 1",
  "manufacturer": "company name",
  "casNumber": "primary CAS number if single product",
  "physicalState": "solid|liquid|gas|aerosol|powder|paste|gel|sludge",
  "pH": {
    "value": numeric_value_or_null,
    "text": "original text like 'Not applicable' or '7.0-8.0'",
    "note": "CRITICAL: Look for pH, acidity, alkalinity in Section 9. If >12.5 or <2, material is D002 corrosive"
  },
  "flashPoint": {
    "celsius": numeric_value_or_null,
    "fahrenheit": numeric_value_or_null,
    "text": "original text from SDS",
    "note": "CRITICAL: Look in Section 9. Convert F to C. If <60°C, material is D001 ignitable"
  },
  "specificGravity": numeric_value_or_null,
  "boilingPoint": {
    "celsius": numeric_value_or_null,
    "text": "original text"
  },
  "composition": [
    {
      "name": "chemical name",
      "cas": "123-45-6",
      "percentage": "10-20", 
      "percentMin": 10,
      "percentMax": 20,
      "note": "CRITICAL: Extract from Section 3 composition table. Include ALL components"
    }
  ],
  "hazardCodes": {
    "hCodes": ["H225", "H319"],
    "pCodes": ["P210", "P233"],
    "signalWord": "DANGER|WARNING|null",
    "ghsPictograms": ["GHS02", "GHS07"]
  },
  "rcraCharacteristics": {
    "ignitability": "true if flash point <60°C, false otherwise",
    "corrosivity": "true if pH ≤2 or pH ≥12.5, false otherwise", 
    "reactivity": "true if explosive/water-reactive terms found, false otherwise",
    "toxicity": "true if LD50 values or toxic terms found, false otherwise"
  },
  "transportation": {
    "unNumber": "UN1234 - CRITICAL: Look in Section 14 for UN Number",
    "properShippingName": "exact shipping name from Section 14",
    "hazardClass": "hazard class number from Section 14",
    "packingGroup": "I, II, or III from Section 14"
  },
  "wasteClassification": {
    "epaCodes": ["D001", "D002"],
    "suggestedTexasCode": "202 for petroleum, 203 for solvents, etc",
    "wasteDescription": "brief description for manifest"
  }
}

IMPORTANT RULES:
1. For pH: If it says "Not applicable" or mentions non-aqueous, set value to null
2. For flashPoint: Convert to Celsius if given in Fahrenheit. Formula: C = (F-32)*5/9
3. For composition: Extract ALL components with CAS numbers from Section 3
4. For percentages: If range like "10-20%", extract both min and max
5. For ignitability: true if flash point < 60°C (140°F)
6. For corrosivity: true if pH ≤ 2 or pH ≥ 12.5
7. For Texas codes: 202=petroleum products, 203=organic solvents, 102=aqueous wastes
8. Return ONLY the JSON, no explanations

IMPORTANT REMINDERS:
- Only extract data that is explicitly stated in the SDS
- Do not make assumptions based on material names
- D001 applies if flash point < 60°C (140°F) 
- D002 applies if pH ≤ 2 or pH ≥ 12.5 for liquids
- Extract EVERY piece of data available from the document!`;
    }

    try {
      console.log('🔍 Attempting LLM parsing first...');
      // Remove forced fallback - try LLM first, fallback if needed
      
      let result;

      if (provider === 'lmstudio') {
        // Use LM Studio (local model)
        const lmModel = model || 'qwen2.5-3b-instruct';
        console.log(`🤖 Using LM Studio model: ${lmModel} for SDS parsing`);
        
        const completion = await this.lmstudio.chat.completions.create({
          model: lmModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        result = completion.choices[0].message.content;
      } else if (provider === 'openai' && this.openai) {
        // Use OpenAI as fallback
        const openaiModel = model || 'gpt-4o-mini';
        console.log(`🧠 Using OpenAI model: ${openaiModel} for SDS parsing`);
        
        const completion = await this.openai.chat.completions.create({
          model: openaiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        });
        
        result = completion.choices[0].message.content;
      } else {
        throw new Error('No LLM provider available. Please ensure LM Studio is running on port 1234.');
      }

      // Parse JSON response
      const parsed = JSON.parse(result);
      
      // Validate and clean the response
      return this.validateAndClean(parsed);

    } catch (error) {
      console.error('🚨 LLM SDS parsing failed:', error.message);
      console.log('🔄 Calling enhanced fallback parser...');
      
      // Fallback to basic extraction
      const result = this.fallbackParse(rawText);
      console.log('✅ Fallback parser result:', JSON.stringify(result, null, 2));
      return result;
    }
  }

  validateAndClean(data) {
    // Ensure all required fields exist
    const cleaned = {
      productName: data.productName || 'Unknown Product',
      manufacturer: data.manufacturer || null,
      casNumber: data.casNumber || null,
      physicalState: this.normalizePhysicalState(data.physicalState),
      pH: data.pH || { value: null, text: null },
      flashPoint: this.normalizeFlashPoint(data.flashPoint),
      specificGravity: typeof data.specificGravity === 'number' ? data.specificGravity : null,
      boilingPoint: data.boilingPoint || { celsius: null, text: null },
      composition: this.normalizeComposition(data.composition || []),
      hazardCodes: {
        hCodes: Array.isArray(data.hazardCodes?.hCodes) ? data.hazardCodes.hCodes : [],
        pCodes: Array.isArray(data.hazardCodes?.pCodes) ? data.hazardCodes.pCodes : [],
        signalWord: data.hazardCodes?.signalWord || null,
        ghsPictograms: Array.isArray(data.hazardCodes?.ghsPictograms) ? data.hazardCodes.ghsPictograms : []
      },
      rcraCharacteristics: {
        ignitability: Boolean(data.rcraCharacteristics?.ignitability),
        corrosivity: Boolean(data.rcraCharacteristics?.corrosivity),
        reactivity: Boolean(data.rcraCharacteristics?.reactivity),
        toxicity: Boolean(data.rcraCharacteristics?.toxicity)
      },
      transportation: {
        unNumber: data.transportation?.unNumber || null,
        properShippingName: data.transportation?.properShippingName || null,
        hazardClass: data.transportation?.hazardClass || null,
        packingGroup: data.transportation?.packingGroup || null
      },
      wasteClassification: {
        epaCodes: Array.isArray(data.wasteClassification?.epaCodes) ? data.wasteClassification.epaCodes : [],
        suggestedTexasCode: data.wasteClassification?.suggestedTexasCode || null,
        wasteDescription: data.wasteClassification?.wasteDescription || null
      }
    };

    // Apply business rules for characteristics if not set by LLM
    if (cleaned.flashPoint.celsius !== null && cleaned.flashPoint.celsius < 60) {
      cleaned.rcraCharacteristics.ignitability = true;
    }
    
    if (cleaned.pH.value !== null && (cleaned.pH.value <= 2 || cleaned.pH.value >= 12.5)) {
      cleaned.rcraCharacteristics.corrosivity = true;
    }

    return cleaned;
  }

  normalizePhysicalState(state) {
    if (!state) return 'liquid'; // Default assumption
    
    const normalized = state.toLowerCase();
    const validStates = ['solid', 'liquid', 'gas', 'aerosol', 'powder', 'paste', 'gel', 'sludge'];
    
    return validStates.includes(normalized) ? normalized : 'liquid';
  }

  normalizeFlashPoint(fp) {
    if (!fp) return { celsius: null, fahrenheit: null, text: null };
    
    const result = {
      celsius: fp.celsius || null,
      fahrenheit: fp.fahrenheit || null,
      text: fp.text || null
    };

    // If only Fahrenheit provided, calculate Celsius
    if (result.fahrenheit !== null && result.celsius === null) {
      result.celsius = (result.fahrenheit - 32) * 5/9;
    }
    
    // If only Celsius provided, calculate Fahrenheit
    if (result.celsius !== null && result.fahrenheit === null) {
      result.fahrenheit = (result.celsius * 9/5) + 32;
    }

    return result;
  }

  normalizeComposition(composition) {
    if (!Array.isArray(composition)) return [];
    
    return composition.map(comp => ({
      name: comp.name || 'Unknown',
      cas: comp.cas || null,
      percentage: comp.percentage || null,
      percentMin: typeof comp.percentMin === 'number' ? comp.percentMin : null,
      percentMax: typeof comp.percentMax === 'number' ? comp.percentMax : null,
      // For classification, we need a single percent value
      percent: comp.percentMax || comp.percentMin || this.extractPercent(comp.percentage) || null
    }));
  }

  extractPercent(percentText) {
    if (!percentText) return null;
    
    // Extract numeric value from percentage text
    const match = percentText.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  fallbackParse(rawText) {
    console.log('🔄 Using ENHANCED fallback parser for comprehensive extraction...');
    
    // Enhanced pattern matching with multiple variations
    const productPatterns = [
      /Product\s*(?:Name|Identifier)?\s*[:\s]+([^\n\r]{3,100})/i,
      /Trade\s*Name\s*[:\s]+([^\n\r]{3,100})/i,
      /Material\s*Name\s*[:\s]+([^\n\r]{3,100})/i,
      /Chemical\s*Name\s*[:\s]+([^\n\r]{3,100})/i
    ];
    
    const flashPatterns = [
      /Flash\s*Point\s*[:\s]+([^,\n\r]+)/i,
      /FP\s*[:\s]+([^,\n\r]+)/i,
      /flash\s*pt\.?\s*[:\s]+([^,\n\r]+)/i,
      /\bg\)\s+Flash\s+point\s+([^,\n\r]+)/i, // Match "g) Flash point" from SDS section 9
      /Flash\s+point[:\s]+([^,\n\r]+)/i
    ];
    
    const pHPatterns = [
      /pH\s*[:\s]+([0-9.]+)/i,
      /ph\s*value\s*[:\s]+([0-9.]+)/i,
      /acidity.*ph\s*[:\s]+([0-9.]+)/i,
      /alkalinity.*ph\s*[:\s]+([0-9.]+)/i
    ];
    
    const unPatterns = [
      /UN\s*(?:Number|No)?\s*[:\s]*(\d{4})/i,
      /United\s*Nations\s*Number\s*[:\s]*(\d{4})/i,
      /UN[\s-]*(\d{4})/
    ];
    
    const casPatterns = [
      /CAS\s*(?:No|Number|#)?[\s:]+(\d{2,7}-\d{2}-\d{1,2})/gi,
      /\b(\d{2,7}-\d{2}-\d{1,2})\b/g
    ];
    
    // Extract product name
    let productName = 'Unknown Product';
    for (const pattern of productPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        productName = match[1].trim().replace(/^\W+|\W+$/g, '');
        break;
      }
    }
    
    // Extract pH with enhanced logic
    let pH = { value: null, text: null };
    for (const pattern of pHPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 0 && value <= 14) {
          pH = { value: value, text: match[0] };
          break;
        }
      }
    }
    
    // Don't infer pH - must be extracted from actual data
    // pH should only come from the SDS document itself
    
    // Extract flash point - be careful not to confuse with boiling point
    let flashPoint = { celsius: null, fahrenheit: null, text: null };
    for (const pattern of flashPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const flashText = match[1].trim();
        
        // Skip if this looks like a boiling point (avoid common confusion)
        if (/boiling|initial\s+boiling/i.test(match[0])) {
          console.log(`⚠️  Skipping potential boiling point: ${match[0]}`);
          continue;
        }
        
        flashPoint.text = flashText;
        
        // Extract temperature and unit
        const tempMatch = flashText.match(/([<>≤≥]?\s*-?\d+(?:\.\d+)?)\s*°?\s*([CF])/i);
        if (tempMatch) {
          const temp = parseFloat(tempMatch[1].replace(/[<>≤≥]/g, ''));
          const unit = tempMatch[2].toUpperCase();
          
          if (unit === 'C') {
            flashPoint.celsius = temp;
            flashPoint.fahrenheit = temp * 9/5 + 32;
          } else {
            flashPoint.fahrenheit = temp;
            flashPoint.celsius = (temp - 32) * 5/9;
          }
          console.log(`🔥 Extracted flash point: ${temp}°${unit} = ${flashPoint.celsius}°C`);
        }
        break;
      }
    }
    
    // Don't infer flash point - must be extracted from actual data
    // Flash point should only come from the SDS document itself
    
    // Extract CAS numbers
    const casNumbers = [];
    for (const pattern of casPatterns) {
      const matches = [...rawText.matchAll(pattern)];
      for (const match of matches) {
        const cas = match[1];
        if (!casNumbers.includes(cas)) {
          casNumbers.push(cas);
        }
      }
    }
    
    // Extract UN number
    let unNumber = null;
    for (const pattern of unPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        unNumber = `UN${match[1]}`;
        break;
      }
    }
    
    // Don't infer UN numbers - must be extracted from actual data
    // UN numbers should only come from the SDS document itself
    
    // Extract composition from tables
    const composition = this.extractCompositionFallback(rawText);
    
    // Check for listed wastes in composition
    const listedWastes = casLookupService.checkComposition(composition);
    
    // Use CAS data to enhance hazard determination if available
    let enhancedFlashPoint = flashPoint;
    let enhancedPH = pH;
    
    // If we have a primary CAS number, check for known hazard data
    if (casNumbers[0] && (!flashPoint.celsius || !pH.value)) {
      const hazardData = casLookupService.getHazardCharacteristics(casNumbers[0]);
      if (hazardData) {
        // Only use CAS data if we didn't extract the value from the SDS
        if (!flashPoint.celsius && hazardData.flashPoint !== undefined) {
          enhancedFlashPoint = {
            celsius: hazardData.flashPoint,
            fahrenheit: hazardData.flashPoint * 9/5 + 32,
            text: "From CAS database"
          };
          console.log(`📊 Using CAS database flash point: ${hazardData.flashPoint}°C`);
        }
        
        if (!pH.value && hazardData.pH !== undefined) {
          enhancedPH = {
            value: hazardData.pH,
            text: "From CAS database"
          };
          console.log(`📊 Using CAS database pH: ${hazardData.pH}`);
        }
      }
    }
    
    // DO NOT calculate RCRA characteristics here - let the classification engine handle that
    // Parser should only extract raw data, not make classification decisions
    
    console.log(`✅ Enhanced fallback extraction complete: pH=${enhancedPH.value}, FlashPoint=${enhancedFlashPoint.celsius}°C, UN=${unNumber}`);
    
    return {
      productName,
      manufacturer: null,
      casNumber: casNumbers[0] || null,
      physicalState: 'liquid',
      pH: enhancedPH,
      flashPoint: enhancedFlashPoint,
      specificGravity: null,
      boilingPoint: { celsius: null, text: null },
      composition,
      hazardCodes: {
        hCodes: [],
        pCodes: [],
        signalWord: null,
        ghsPictograms: []
      },
      // rcraCharacteristics removed - let classification engine determine these
      transportation: {
        unNumber,
        properShippingName: null,
        hazardClass: null, // Should be extracted from Section 14, not inferred
        packingGroup: null
      },
      wasteClassification: {
        epaCodes: [...listedWastes.pCodes.map(p => p.code), ...listedWastes.uCodes.map(u => u.code)],
        suggestedTexasCode: null,
        wasteDescription: null,
        listedWastes: listedWastes
      }
    };
  }

  // Enhanced composition extraction for fallback
  extractCompositionFallback(rawText) {
    const composition = [];
    const lines = rawText.split('\n');
    
    // Look for composition tables
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern: Chemical name followed by CAS and percentage
      const compMatch = line.match(/([A-Za-z][^0-9\n]{2,40}?)\s+(\d{2,7}-\d{2}-\d{1,2})\s+([0-9.]+(?:\s*-\s*[0-9.]+)?)\s*%?/);
      if (compMatch) {
        const name = compMatch[1].trim();
        const cas = compMatch[2];
        const percentText = compMatch[3];
        
        let percentMin, percentMax;
        if (percentText.includes('-')) {
          const [min, max] = percentText.split('-').map(p => parseFloat(p.trim()));
          percentMin = min;
          percentMax = max;
        } else {
          percentMin = percentMax = parseFloat(percentText);
        }
        
        composition.push({
          name,
          cas,
          percentage: percentText,
          percentMin,
          percentMax,
          percent: percentMax // Use max for calculations
        });
        
        console.log(`🧪 Extracted composition: ${name} (${cas}) ${percentText}%`);
      }
    }
    
    return composition;
  }

  // Convert parsed data to format expected by classification engine
  toClassificationFormat(parsedData) {
    return {
      productName: parsedData.productName,
      composition: parsedData.composition.map(comp => ({
        name: comp.name,
        cas: comp.cas,
        percent: comp.percent,
        percentage: comp.percentage
      })),
      physicalState: parsedData.physicalState,
      flashPointC: parsedData.flashPoint.celsius,
      pH: parsedData.pH.value,
      density: parsedData.specificGravity,
      // Additional data for enhanced classification
      hazardCodes: parsedData.hazardCodes,
      rcraCharacteristics: parsedData.rcraCharacteristics,
      transportation: parsedData.transportation,
      suggestedCodes: parsedData.wasteClassification
    };
  }
  
  // Extract material type from SDS text for better prompting
  extractMaterialType(text) {
    const lowerText = text.toLowerCase();
    
    // Check for common material types
    if (lowerText.includes('acetone') || lowerText.includes('methanol') || 
        lowerText.includes('ethanol') || lowerText.includes('alcohol')) {
      return 'solvent';
    }
    
    if (lowerText.includes('acid') && (lowerText.includes('hydrochloric') || 
        lowerText.includes('sulfuric') || lowerText.includes('nitric') || 
        lowerText.includes('muriatic'))) {
      return 'acid';
    }
    
    if (lowerText.includes('hydroxide') || lowerText.includes('alkaline') || 
        lowerText.includes('caustic') || lowerText.includes('base')) {
      return 'base';
    }
    
    if (lowerText.includes('diesel') || lowerText.includes('gasoline') || 
        lowerText.includes('petroleum') || lowerText.includes('motor oil') || 
        lowerText.includes('lubricant')) {
      return 'petroleum';
    }
    
    if (lowerText.includes('paint') || lowerText.includes('coating') || 
        lowerText.includes('varnish')) {
      return 'paint';
    }
    
    if (lowerText.includes('battery') || lowerText.includes('lead-acid')) {
      return 'battery';
    }
    
    if (lowerText.includes('pesticide') || lowerText.includes('herbicide') || 
        lowerText.includes('insecticide')) {
      return 'pesticide';
    }
    
    // Try to extract from product name
    const productNameMatch = text.match(/product\s+name[:\s]+([^\n]+)/i);
    if (productNameMatch) {
      return productNameMatch[1].trim().toLowerCase().split(' ')[0];
    }
    
    return null;
  }
}

export default LLMSDSParser;