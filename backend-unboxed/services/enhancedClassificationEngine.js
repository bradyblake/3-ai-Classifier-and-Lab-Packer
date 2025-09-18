// Enhanced Classification Engine - Hybrid AI + Rule-based approach
// Combines AI data extraction with precise regulatory rule engine

import aiService from './aiService.js';
import AITrainingSystem from './aiTrainingSystem.js';
import { formatWasteCodesWithDescriptions } from './wasteCodeDescriptions.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedClassificationEngine {
  constructor() {
    this.classificationCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheExpiryMs = 30 * 60 * 1000; // 30 minutes
    this.trainingSystem = new AITrainingSystem();
    this.loadTrainingData();
  }

  loadTrainingData() {
    try {
      // Load user feedback for learned patterns
      const feedbackPath = path.join(__dirname, '../training_data/user_feedback.json');
      const examplesPath = path.join(__dirname, '../training_data/classification_examples.json');
      
      this.userFeedback = fs.existsSync(feedbackPath) 
        ? JSON.parse(fs.readFileSync(feedbackPath, 'utf8'))
        : [];
        
      this.trainingExamples = fs.existsSync(examplesPath)
        ? JSON.parse(fs.readFileSync(examplesPath, 'utf8'))
        : [];
        
      console.log(`📚 Loaded ${this.userFeedback.length} feedback entries and ${this.trainingExamples.length} training examples`);
    } catch (error) {
      console.warn('⚠️ Failed to load training data:', error.message);
      this.userFeedback = [];
      this.trainingExamples = [];
    }
  }

  async classifyWaste(description, sdsData = {}, options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(description, sdsData);

    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          console.log('🔄 Using cached classification');
          return { ...cached, fromCache: true };
        }
      }

      console.log('🤖 Starting hybrid AI+Rule classification...');

      // Step 1: AI extraction of structured data from description
      let extractedData = {};
      let aiExtractionError = null;

      if (description && description.trim()) {
        try {
          console.log('📝 Extracting data with AI...');
          
          // Add timeout to prevent hanging
          const extractionPromise = aiService.extractWasteInfo(description);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI extraction timeout')), 30000)
          );
          
          extractedData = await Promise.race([extractionPromise, timeoutPromise]);
          console.log('✅ AI extracted:', extractedData);
        } catch (error) {
          aiExtractionError = error.message;
          console.warn('⚠️ AI extraction failed, using fallback:', error.message);
          extractedData = this.basicTextExtraction(description);
        }
      }

      // Step 2: Check training data for learned patterns
      const trainingMatch = this.findTrainingMatch(description, extractedData);
      if (trainingMatch) {
        console.log('🎓 Found training match:', trainingMatch);
      }

      // Step 3: Combine AI extraction with provided SDS data
      const combinedData = this.combineDataSources(extractedData, sdsData, trainingMatch);
      console.log('📊 Combined data:', combinedData);

      // Step 4: Apply rule-based classification
      const ruleResult = await this.applyRuleEngine(combinedData);
      console.log('⚖️ Rule engine result:', ruleResult);

      // Step 4: AI confidence assessment and reasoning
      let aiAssessment = null;
      let aiExplanation = '';

      try {
        // Get AI confidence assessment
        aiAssessment = await aiService.assessConfidence(extractedData, ruleResult);
        
        // Get AI explanation if confidence is reasonable
        if (aiAssessment.confidence > 0.4) {
          aiExplanation = await aiService.explainClassification(
            ruleResult.classification || [], 
            ruleResult.reasoning || 'Rule-based classification applied',
            extractedData
          );
        }
      } catch (error) {
        console.warn('⚠️ AI assessment failed:', error.message);
        aiAssessment = this.calculateFallbackConfidence(extractedData, ruleResult);
      }

      // Step 5: Build final result
      const result = this.buildClassificationResult(
        ruleResult,
        extractedData,
        aiAssessment,
        aiExplanation,
        combinedData,
        startTime,
        aiExtractionError
      );

      // Step 6: Cache the result
      if (options.useCache !== false) {
        this.saveToCache(cacheKey, result);
      }

      console.log('✅ Classification complete:', {
        codes: result.classification,
        confidence: result.confidence,
        time: result.processingTime + 'ms'
      });

      return result;

    } catch (error) {
      console.error('💥 Enhanced classification error:', error);
      
      // Emergency fallback - basic rule engine only
      return this.emergencyFallback(sdsData, error, startTime);
    }
  }

  findTrainingMatch(description, extractedData) {
    // Enhanced training data matching with fuzzy logic and scoring
    const materialName = extractedData.chemical || this.extractMaterialFromDescription(description);
    const descLower = description.toLowerCase();
    
    // Build search context for better matching
    const searchContext = {
      material: materialName?.toLowerCase() || '',
      description: descLower,
      use: extractedData.use?.toLowerCase() || '',
      physicalState: extractedData.physicalState?.toLowerCase() || '',
      flashPoint: extractedData.flashPoint,
      ph: extractedData.ph
    };
    
    // Score-based matching for user feedback
    let bestMatch = null;
    let bestScore = 0;
    
    for (const feedback of this.userFeedback) {
      const score = this.calculateMatchScore(searchContext, feedback);
      if (score > bestScore && score >= 0.6) { // Minimum 60% match
        bestScore = score;
        bestMatch = {
          source: 'user_feedback',
          material: feedback.material,
          classification: feedback.correct_result,
          reasoning: feedback.reason,
          confidence: Math.min(0.9, 0.6 + (bestScore * 0.4)), // Scale confidence 0.6-1.0
          matchScore: bestScore
        };
      }
    }
    
    if (bestMatch) {
      console.log(`🎯 Training match found: ${bestMatch.material} (score: ${bestScore.toFixed(2)})`);
      return bestMatch;
    }
    
    // Search training examples with scoring
    for (const example of this.trainingExamples) {
      if (!example.classification) continue;
      
      const score = this.calculateExampleScore(searchContext, example);
      if (score > bestScore && score >= 0.5) { // Lower threshold for examples
        bestScore = score;
        bestMatch = {
          source: 'training_example',
          material: example.material,
          classification: example.classification,
          reasoning: example.reasoning || 'Based on training data',
          confidence: Math.min(0.7, 0.4 + (bestScore * 0.4)), // Scale confidence 0.4-0.8
          matchScore: bestScore
        };
      }
    }
    
    if (bestMatch) {
      console.log(`📚 Example match found: ${bestMatch.material} (score: ${bestScore.toFixed(2)})`);
    }
    
    return bestMatch;
  }
  
  calculateMatchScore(searchContext, feedback) {
    let score = 0;
    let factors = 0;
    
    const feedbackMaterial = feedback.material.toLowerCase();
    const searchMaterial = searchContext.material;
    
    // Material name matching (highest weight)
    if (searchMaterial) {
      if (feedbackMaterial === searchMaterial) {
        score += 1.0;
      } else if (feedbackMaterial.includes(searchMaterial) || searchMaterial.includes(feedbackMaterial)) {
        score += 0.7;
      } else {
        // Fuzzy match using common patterns
        const similarity = this.calculateStringSimilarity(feedbackMaterial, searchMaterial);
        score += similarity * 0.5;
      }
      factors += 1.0;
    }
    
    // Description matching
    if (searchContext.description && feedbackMaterial) {
      if (searchContext.description.includes(feedbackMaterial)) {
        score += 0.3;
      }
      factors += 0.3;
    }
    
    // Properties matching (if available in feedback)
    if (feedback.properties) {
      if (feedback.properties.flashPoint && searchContext.flashPoint) {
        const fpDiff = Math.abs(feedback.properties.flashPoint - searchContext.flashPoint);
        score += fpDiff < 10 ? 0.2 : (fpDiff < 30 ? 0.1 : 0);
        factors += 0.2;
      }
      
      if (feedback.properties.ph && searchContext.ph) {
        const phDiff = Math.abs(feedback.properties.ph - searchContext.ph);
        score += phDiff < 1 ? 0.2 : (phDiff < 2 ? 0.1 : 0);
        factors += 0.2;
      }
    }
    
    return factors > 0 ? score / factors : 0;
  }
  
  calculateExampleScore(searchContext, example) {
    let score = 0;
    let factors = 0;
    
    const exampleMaterial = (example.material || '').toLowerCase();
    const searchMaterial = searchContext.material;
    
    // Material matching
    if (searchMaterial && exampleMaterial) {
      if (exampleMaterial === searchMaterial) {
        score += 1.0;
      } else if (exampleMaterial.includes(searchMaterial) || searchMaterial.includes(exampleMaterial)) {
        score += 0.6;
      } else {
        const similarity = this.calculateStringSimilarity(exampleMaterial, searchMaterial);
        score += similarity * 0.4;
      }
      factors += 1.0;
    }
    
    // Pattern matching for common waste types
    if (example.wasteType && searchContext.description) {
      const wasteTypeLower = example.wasteType.toLowerCase();
      if (searchContext.description.includes(wasteTypeLower)) {
        score += 0.4;
        factors += 0.4;
      }
    }
    
    return factors > 0 ? score / factors : 0;
  }
  
  calculateStringSimilarity(str1, str2) {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  extractMaterialFromDescription(description) {
    // Comprehensive chemical and material extraction with pattern matching
    const lowerDesc = description.toLowerCase();
    
    // Chemical patterns with CAS numbers
    const casPatterns = [
      { pattern: /\b67-64-1\b/, chemical: 'acetone' },
      { pattern: /\b67-56-1\b/, chemical: 'methanol' },
      { pattern: /\b64-17-5\b/, chemical: 'ethanol' },
      { pattern: /\b67-63-0\b/, chemical: 'isopropyl alcohol' },
      { pattern: /\b108-88-3\b/, chemical: 'toluene' },
      { pattern: /\b1330-20-7\b/, chemical: 'xylene' },
      { pattern: /\b71-43-2\b/, chemical: 'benzene' },
      { pattern: /\b75-09-2\b/, chemical: 'methylene chloride' },
      { pattern: /\b79-01-6\b/, chemical: 'trichloroethylene' },
      { pattern: /\b127-18-4\b/, chemical: 'perchloroethylene' },
      { pattern: /\b7664-93-9\b/, chemical: 'sulfuric acid' },
      { pattern: /\b7697-37-2\b/, chemical: 'nitric acid' },
      { pattern: /\b7647-01-0\b/, chemical: 'hydrochloric acid' },
      { pattern: /\b1310-73-2\b/, chemical: 'sodium hydroxide' },
      { pattern: /\b107-21-1\b/, chemical: 'ethylene glycol' }
    ];
    
    // Check CAS patterns first (most specific)
    for (const { pattern, chemical } of casPatterns) {
      if (pattern.test(lowerDesc)) {
        return chemical;
      }
    }
    
    // Chemical name patterns (with common variations)
    const chemicalPatterns = [
      // Solvents
      { patterns: ['acetone', 'propanone', '2-propanone'], chemical: 'acetone' },
      { patterns: ['methanol', 'methyl alcohol', 'wood alcohol'], chemical: 'methanol' },
      { patterns: ['ethanol', 'ethyl alcohol', 'grain alcohol'], chemical: 'ethanol' },
      { patterns: ['isopropyl', 'isopropanol', 'ipa', '2-propanol'], chemical: 'isopropyl alcohol' },
      { patterns: ['toluene', 'methylbenzene', 'toluol'], chemical: 'toluene' },
      { patterns: ['xylene', 'xylol', 'dimethylbenzene'], chemical: 'xylene' },
      { patterns: ['mek', 'methyl ethyl ketone', 'butanone'], chemical: 'methyl ethyl ketone' },
      { patterns: ['mineral spirits', 'white spirits', 'stoddard solvent'], chemical: 'mineral spirits' },
      { patterns: ['methylene chloride', 'dichloromethane', 'dcm'], chemical: 'methylene chloride' },
      { patterns: ['trichloroethylene', 'tce', 'trichlor'], chemical: 'trichloroethylene' },
      { patterns: ['perchloroethylene', 'pce', 'perc', 'tetrachloroethylene'], chemical: 'perchloroethylene' },
      
      // Acids
      { patterns: ['sulfuric acid', 'oil of vitriol', 'battery acid'], chemical: 'sulfuric acid' },
      { patterns: ['hydrochloric acid', 'muriatic acid', 'hcl'], chemical: 'hydrochloric acid' },
      { patterns: ['nitric acid', 'aqua fortis', 'hno3'], chemical: 'nitric acid' },
      { patterns: ['phosphoric acid', 'orthophosphoric acid'], chemical: 'phosphoric acid' },
      { patterns: ['acetic acid', 'vinegar acid', 'ethanoic acid'], chemical: 'acetic acid' },
      { patterns: ['formic acid', 'methanoic acid'], chemical: 'formic acid' },
      { patterns: ['chromic acid', 'chromium trioxide'], chemical: 'chromic acid' },
      
      // Bases
      { patterns: ['sodium hydroxide', 'caustic soda', 'lye', 'naoh'], chemical: 'sodium hydroxide' },
      { patterns: ['potassium hydroxide', 'caustic potash', 'koh'], chemical: 'potassium hydroxide' },
      { patterns: ['ammonium hydroxide', 'ammonia solution', 'aqua ammonia'], chemical: 'ammonium hydroxide' },
      { patterns: ['calcium hydroxide', 'slaked lime', 'hydrated lime'], chemical: 'calcium hydroxide' },
      
      // Petroleum products
      { patterns: ['diesel', 'diesel fuel', '#2 fuel oil'], chemical: 'diesel fuel' },
      { patterns: ['gasoline', 'petrol', 'gas'], chemical: 'gasoline' },
      { patterns: ['kerosene', 'jet fuel', 'jp-8', '#1 fuel oil'], chemical: 'kerosene' },
      { patterns: ['motor oil', 'engine oil', 'lubricating oil'], chemical: 'motor oil' },
      { patterns: ['hydraulic fluid', 'hydraulic oil'], chemical: 'hydraulic fluid' },
      { patterns: ['waste oil', 'used oil', 'spent oil'], chemical: 'waste oil' },
      
      // Other materials
      { patterns: ['antifreeze', 'coolant', 'ethylene glycol'], chemical: 'ethylene glycol' },
      { patterns: ['paint', 'paint waste', 'paint sludge'], chemical: 'paint waste' },
      { patterns: ['batteries', 'battery', 'lead-acid', 'nicad', 'lithium'], chemical: 'batteries' },
      { patterns: ['fluorescent', 'mercury lamp', 'hid lamp'], chemical: 'fluorescent lamp' },
      { patterns: ['lab pack', 'laboratory waste', 'lab chemicals'], chemical: 'lab pack' },
      { patterns: ['asbestos', 'acm', 'friable asbestos'], chemical: 'asbestos' },
      { patterns: ['medical waste', 'biohazard', 'sharps', 'red bag'], chemical: 'medical waste' },
      { patterns: ['pcb', 'polychlorinated biphenyl', 'transformer oil'], chemical: 'pcb' }
    ];
    
    // Check chemical patterns (prioritize multi-word patterns)
    for (const { patterns, chemical } of chemicalPatterns) {
      for (const pattern of patterns) {
        if (lowerDesc.includes(pattern)) {
          return chemical;
        }
      }
    }
    
    // Generic waste type extraction
    const wasteTypes = [
      'contaminated soil', 'contaminated debris', 'wastewater', 'sludge',
      'metal shavings', 'grinding swarf', 'catalyst', 'ash', 'resin',
      'adhesive', 'ink', 'pesticide', 'pharmaceutical', 'oxidizer'
    ];
    
    for (const wasteType of wasteTypes) {
      if (lowerDesc.includes(wasteType)) {
        return wasteType;
      }
    }
    
    return null;
  }

  combineDataSources(aiExtracted, sdsProvided, trainingMatch = null) {
    const combined = {
      // Chemical identification
      chemical: sdsProvided.chemical || sdsProvided.productName || aiExtracted.chemical,
      
      // Physical properties
      flashPoint: sdsProvided.flashPoint || aiExtracted.flashPoint,
      ph: sdsProvided.ph,
      boilingPoint: sdsProvided.boilingPoint,
      meltingPoint: sdsProvided.meltingPoint,
      
      // Composition
      constituents: sdsProvided.constituents || [],
      concentration: sdsProvided.concentration || aiExtracted.concentration,
      
      // Usage and contamination
      use: aiExtracted.use,
      contamination: aiExtracted.contamination,
      physicalState: aiExtracted.physicalState,
      hazardousProperties: aiExtracted.hazardousProperties || [],
      
      // Process knowledge
      processKnowledge: sdsProvided.processKnowledge,
      wasteSource: sdsProvided.wasteSource,
      industry: sdsProvided.industry
    };
    
    // Apply training match if available
    if (trainingMatch) {
      combined.trainingMatch = trainingMatch;
      combined.suggestedClassification = trainingMatch.classification;
    }
    
    return combined;
  }

  async applyRuleEngine(combinedData) {
    try {
      // Import your existing classification engine
      const { default: classificationEngine } = await import('../../src/shared/engines/classificationEngine_v3.js');
      
      if (classificationEngine && typeof classificationEngine.classify === 'function') {
        return classificationEngine.classify(combinedData);
      } else {
        // Fallback to simple rule classification
        return this.simpleRuleClassification(combinedData);
      }
    } catch (error) {
      console.warn('Rule engine import failed, using simple rules:', error.message);
      return this.simpleRuleClassification(combinedData);
    }
  }

  simpleRuleClassification(data) {
    const classification = [];
    let reasoning = '';
    let confidence = 0.7;
    let stateFormCode = null;
    
    // Check if we have a training match to prioritize
    if (data.trainingMatch) {
      const trainedClassification = data.trainingMatch.classification;
      
      // Use federal codes from training
      if (trainedClassification.federal && Array.isArray(trainedClassification.federal)) {
        classification.push(...trainedClassification.federal);
      }
      
      // Use Texas form code from training
      if (trainedClassification.texas_form_code) {
        stateFormCode = trainedClassification.texas_form_code;
      }
      
      reasoning += `Training-based: ${data.trainingMatch.reasoning}. `;
      confidence = Math.max(confidence, data.trainingMatch.confidence);
    }

    // D001 - Ignitable (per 40 CFR 261.21 - primarily for liquids, not solids)
    if (data.flashPoint !== null && data.flashPoint < 60 && 
        data.physicalState !== 'solid') {
      classification.push('D001');
      reasoning += 'D001 (ignitable, flash point < 60°C); ';
    }

    // D002 - Corrosive (pH criteria only applies to aqueous/liquid wastes)
    if (data.ph !== null && (data.ph <= 2 || data.ph >= 12.5) && 
        data.physicalState !== 'solid') {
      classification.push('D002');
      reasoning += `D002 (corrosive, pH ${data.ph}); `;
    }

    // F003 - Spent non-halogenated solvents
    const f003Solvents = ['acetone', 'methanol', 'ethanol', 'xylene', 'toluene'];
    if (data.chemical && f003Solvents.some(solvent => 
      data.chemical.toLowerCase().includes(solvent))) {
      classification.push('F003');
      reasoning += `F003 (spent non-halogenated solvent: ${data.chemical}); `;
    }

    // F001 - Spent halogenated solvents
    const f001Solvents = ['dichloromethane', 'trichloroethylene', 'perchloroethylene'];
    if (data.chemical && f001Solvents.some(solvent => 
      data.chemical.toLowerCase().includes(solvent))) {
      classification.push('F001');
      reasoning += `F001 (spent halogenated solvent: ${data.chemical}); `;
    }

    // Adjust confidence based on data quality
    if (!data.chemical) confidence -= 0.2;
    if (data.flashPoint === null && data.ph === null) confidence -= 0.3;

    // Determine Texas form code if not already set from training
    if (!stateFormCode) {
      stateFormCode = this.determineTexasFormCode(data, classification);
    }

    return {
      classification,
      reasoning: reasoning.trim(),
      confidence: Math.max(confidence, 0.1),
      source: data.trainingMatch ? 'training-enhanced-rules' : 'simple-rules',
      stateFormCode,
      trainingSource: data.trainingMatch?.source
    };
  }

  determineTexasFormCode(data, federalClassification) {
    const chemical = data.chemical?.toLowerCase() || '';
    const physicalState = data.physicalState?.toLowerCase() || '';
    
    // Comprehensive Texas RG-22 form code mappings (all 54 codes)
    const materialMappings = {
      // Lab Pack Series (001-009) - Small quantity laboratory wastes
      'lab pack': '001',
      'laboratory waste': '001',
      'laboratory acids': '002',
      'laboratory bases': '003',
      'laboratory oxidizers': '004',
      'cyanide': '005',
      'formaldehyde': '006',
      'laboratory organics': '007',
      'laboratory mercury': '008',
      'laboratory reactives': '009',
      
      // 100 Series - Liquids (Organic)
      'organic liquid': '101',
      'aqueous solution': '102',
      'aqueous waste': '102',
      'contaminated soil': '103',
      'solid waste': '103',
      'sludge': '104',
      'muriatic acid': '105',
      'sulfuric acid': '105',
      'nitric acid': '105',
      'phosphoric acid': '105',
      'hydrochloric acid': '105',
      'chromic acid': '105',
      'acid waste': '105',
      'sodium hydroxide': '106',
      'potassium hydroxide': '106',
      'ammonium hydroxide': '106',
      'lime': '106',
      'caustic': '106',
      'alkaline': '106',
      'basic waste': '106',
      'wastewater': '107',
      'wastewater sludge': '107',
      'fluorescent lamp': '108',
      'fluorescent bulb': '108',
      'mercury lamp': '108',
      'mercury switch': '108',
      'lead acid battery': '109',
      'nicad battery': '109',
      'lithium battery': '109',
      'rechargeable battery': '109',
      'laboratory chemical': '110',
      
      // 200 Series - Petroleum Products  
      'halogenated solvent': '201',
      'methylene chloride': '201',
      'trichloroethylene': '201',
      'perchloroethylene': '201',
      'diesel': '202',
      'gasoline': '202',
      'fuel oil': '202',
      'jet fuel': '202',
      'kerosene': '202',
      'petroleum': '202',
      'petroleum naphtha': '202',
      'acetone': '203',
      'methanol': '203',
      'ethanol': '203',
      'isopropyl': '203',
      'isopropanol': '203',
      'toluene': '203',
      'xylene': '203',
      'benzene': '203',
      'organic solvent': '203',
      'non-halogenated solvent': '203',
      'mek': '203',
      'methyl ethyl ketone': '203',
      'mineral spirits': '203',
      'paint thinner': '203',
      'glycol': '204',
      'ethylene glycol': '204',
      'antifreeze': '204',
      'coolant': '204',
      'amine': '205',
      'adhesive': '206',
      'glue': '206',
      'epoxy': '206',
      'resin': '206',
      'pesticide': '207',
      'herbicide': '207',
      'insecticide': '207',
      'fungicide': '207',
      'photographic waste': '208',
      'fixer': '208',
      'developer': '208',
      'oxidizer': '209',
      'hydrogen peroxide': '209',
      'peroxide': '209',
      'organic peroxide': '210',
      'ink': '211',
      'ink waste': '211',
      'alcohol': '212',
      'pharmaceutical': '213',
      'drug waste': '213',
      'contaminated debris': '214',
      'contaminated ppe': '214',
      'contaminated rags': '214',
      'wipes': '214',
      'absorbent': '214',
      'speedy dry': '214',
      'cyanide waste': '215',
      'plating waste': '216',
      'chromate': '216',
      'waste oil': '219',
      'used oil': '219',
      'motor oil': '219',
      'lubricating oil': '219',
      'hydraulic oil': '219',
      'gear oil': '219',
      
      // 300 Series - Reactive/Specialty
      'compressed gas': '301',
      'aerosol': '301',
      'hydraulic fluid': '302',
      'brake fluid': '302',
      'latex paint': '303',
      'water-based paint': '303',
      'pcb': '304',
      'transformer oil': '304',
      'sodium hydroxide solid': '305',
      'caustic solid': '305',
      'flake caustic': '305',
      
      // 400 Series - Reactive Materials
      'reactive solid': '401',
      'water reactive': '401',
      'pyrophoric': '401',
      'air reactive': '401',
      'explosive': '402',
      'shock sensitive': '402',
      
      // 500 Series - Universal Wastes
      'universal waste': '501',
      'battery': '502',
      'batteries': '502',
      'thermostat': '503',
      'metal bearing waste': '504',
      'metal shavings': '504',
      'metal dust': '504',
      'grinding swarf': '504',
      'catalyst': '505',
      'spent catalyst': '505',
      
      // 600 Series - Non-RCRA Regulated
      'non-rcra': '601',
      'paint waste': '602',
      'paint sludge': '602',
      'paint filters': '602',
      'ash': '603',
      'ash residue': '603',
      'incinerator ash': '603',
      'mixed waste': '604',
      'radioactive': '604',
      
      // 700 Series - Gases
      'inorganic gas': '701',
      'chlorine': '701',
      'ammonia gas': '701',
      'organic gas': '702',
      'methane': '702',
      'propane': '702',
      'ethylene oxide': '703',
      'eto': '703',
      'freon': '704',
      'refrigerant': '704',
      'cfc': '704',
      'hcfc': '704',
      'halon': '705',
      
      // 800 Series - Regulated Non-RCRA
      'tsca waste': '801',
      'medical waste': '802',
      'biohazard': '802',
      'sharps': '802',
      'pathological': '802',
      'asbestos': '803',
      'friable asbestos': '803',
      'non-friable asbestos': '803',
      'acm': '803',
      'used oil filter': '804',
      'oil filter': '804',
      'polychlorinated biphenyl': '805',
      'dioxin': '806',
      'furan': '806',
      'listed waste': '807',
      'f-listed': '807',
      'k-listed': '807',
      'p-listed': '807',
      'u-listed': '807'
    };
    
    // Enhanced material matching - check multiple sources
    const searchText = `${chemical} ${data.use || ''} ${data.wasteSource || ''} ${data.contamination || ''}`.toLowerCase();
    
    // First pass: exact phrase matching for multi-word terms
    for (const [material, formCode] of Object.entries(materialMappings)) {
      if (material.includes(' ') && searchText.includes(material)) {
        console.log(`🎯 Texas form code match: "${material}" → ${formCode}`);
        return formCode;
      }
    }
    
    // Second pass: single word matching
    for (const [material, formCode] of Object.entries(materialMappings)) {
      if (!material.includes(' ') && searchText.includes(material)) {
        console.log(`🎯 Texas form code match: "${material}" → ${formCode}`);
        return formCode;
      }
    }
    
    // pH-based classification (high priority)
    if (data.ph !== null) {
      if (data.ph <= 2.0) return '105'; // Acid wastes
      if (data.ph >= 12.5) return '106'; // Alkaline/basic wastes
    }
    
    // Physical state and federal code based classification
    if (physicalState === 'solid') {
      if (federalClassification.includes('D003')) return '401'; // Reactive solids
      return '204'; // Lab chemicals (corrected from 103 to 204)
    }
    
    if (physicalState === 'gas') {
      return '701'; // Inorganic gases (default)
    }
    
    if (physicalState === 'sludge') {
      return '107'; // Sludges and slurries
    }
    
    // Liquid classification (default)
    if (federalClassification.includes('D001')) {
      // Flammable liquids - check if petroleum vs organic
      if (chemical.includes('petroleum') || chemical.includes('oil') || 
          chemical.includes('diesel') || chemical.includes('gasoline')) {
        return '202'; // Petroleum products
      }
      return '203'; // Organic solvents
    }
    
    // Default liquid classifications
    if (chemical.includes('organic') || chemical.includes('alcohol') || 
        chemical.includes('ketone')) {
      return '101'; // Organic liquids
    }
    
    return '102'; // Default to aqueous solutions
  }

  buildClassificationResult(ruleResult, extractedData, aiAssessment, aiExplanation, 
                           combinedData, startTime, aiExtractionError) {
    const processingTime = Date.now() - startTime;
    
    // Determine final confidence (weighted average of rule and AI confidence)
    const finalConfidence = ruleResult.confidence && aiAssessment.confidence ?
      (ruleResult.confidence * 0.7 + aiAssessment.confidence * 0.3) :
      (ruleResult.confidence || aiAssessment.confidence || 0.5);

    // Get waste code descriptions
    const classificationCodes = ruleResult.classification || [];
    const wasteCodeDetails = formatWasteCodesWithDescriptions(classificationCodes);
    
    const result = {
      // Core classification
      classification: classificationCodes,
      wasteCodeDescriptions: wasteCodeDetails,
      confidence: finalConfidence,
      
      // Reasoning
      reasoning: aiExplanation || ruleResult.reasoning || 'Classification completed',
      technicalReasoning: ruleResult.reasoning,
      
      // Data sources
      extractedData,
      combinedData,
      sdsProvided: Object.keys(combinedData).filter(key => 
        combinedData[key] !== null && combinedData[key] !== undefined
      ),
      
      // AI assessment
      aiAssessment,
      uncertainties: aiAssessment?.uncertainties || [],
      recommendations: aiAssessment?.recommendations || [],
      
      // Metadata
      processingTime,
      timestamp: new Date().toISOString(),
      source: this.determineSource(ruleResult, aiExtractionError),
      
      // Flags
      requiresReview: finalConfidence < 0.6,
      aiExtractionError,
      
      // Additional details
      hazardousProperties: extractedData.hazardousProperties || [],
      physicalState: extractedData.physicalState,
      wasteSource: combinedData.wasteSource
    };

    // Add uncertainty handling
    if (result.requiresReview) {
      result.reviewReasons = this.getReviewReasons(result);
    }

    return result;
  }

  determineSource(ruleResult, aiExtractionError) {
    if (aiExtractionError) return 'rules-only';
    if (ruleResult.source === 'simple-rules') return 'hybrid-simple';
    return 'hybrid-advanced';
  }

  getReviewReasons(result) {
    const reasons = [];
    
    if (result.confidence < 0.4) reasons.push('Low confidence score');
    if (!result.extractedData.chemical) reasons.push('Chemical identity unclear');
    if (result.classification.length === 0) reasons.push('No EPA codes determined');
    if (result.aiExtractionError) reasons.push('AI extraction failed');
    if (result.uncertainties.length > 0) reasons.push('Data uncertainties identified');
    
    return reasons;
  }

  emergencyFallback(sdsData, error, startTime) {
    console.error('🚨 Using emergency fallback classification');
    
    return {
      classification: [],
      confidence: 0.1,
      reasoning: `Emergency fallback: ${error.message}. Manual classification required.`,
      extractedData: {},
      combinedData: sdsData,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      source: 'emergency-fallback',
      requiresReview: true,
      reviewReasons: ['System error occurred', 'Manual classification required'],
      error: error.message
    };
  }

  basicTextExtraction(description) {
    // Simple regex-based extraction as fallback
    const desc = description.toLowerCase();
    
    return {
      chemical: this.extractChemicalBasic(desc),
      flashPoint: this.extractFlashPointBasic(desc),
      use: this.extractUseBasic(desc),
      physicalState: 'liquid', // Common assumption
      hazardousProperties: []
    };
  }

  extractChemicalBasic(desc) {
    const common = ['acetone', 'methanol', 'toluene', 'xylene', 'benzene'];
    return common.find(chem => desc.includes(chem)) || null;
  }

  extractFlashPointBasic(desc) {
    const match = desc.match(/flash\s*point[:\s]*(-?\d+\.?\d*)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractUseBasic(desc) {
    if (desc.includes('cleaning')) return 'parts cleaning';
    if (desc.includes('paint')) return 'painting';
    if (desc.includes('lab')) return 'laboratory';
    return null;
  }

  // Cache management
  generateCacheKey(description, sdsData) {
    const data = JSON.stringify({ description, sdsData });
    return Buffer.from(data).toString('base64').substring(0, 32);
  }

  getFromCache(key) {
    const cached = this.classificationCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiryMs) {
      return cached.result;
    }
    if (cached) {
      this.classificationCache.delete(key);
    }
    return null;
  }

  saveToCache(key, result) {
    // Manage cache size
    if (this.classificationCache.size >= this.cacheMaxSize) {
      const firstKey = this.classificationCache.keys().next().value;
      this.classificationCache.delete(firstKey);
    }
    
    this.classificationCache.set(key, {
      result: { ...result, fromCache: false },
      timestamp: Date.now()
    });
  }

  // Utility methods
  async healthCheck() {
    try {
      const testResult = await this.classifyWaste('test acetone flash point -18C');
      return {
        status: 'healthy',
        testClassification: testResult.classification,
        confidence: testResult.confidence,
        processingTime: testResult.processingTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  calculateFallbackConfidence(extractedData, ruleResult) {
    let baseConfidence = ruleResult?.confidence || 0.5;
    
    // Factor in data completeness
    const dataFields = ['chemical', 'flashPoint', 'use', 'physicalState', 'pH'];
    const completedFields = dataFields.filter(field => 
      extractedData[field] !== null && 
      extractedData[field] !== undefined && 
      extractedData[field] !== ''
    ).length;
    
    const completenessRatio = completedFields / dataFields.length;
    
    // Apply completeness boost/penalty
    const adjustedConfidence = baseConfidence + (completenessRatio - 0.5) * 0.3;
    
    return {
      confidence: Math.max(0.1, Math.min(0.95, adjustedConfidence)),
      reasoning: `Base confidence ${baseConfidence} adjusted by data completeness (${completedFields}/${dataFields.length} fields)`
    };
  }

  clearCache() {
    this.classificationCache.clear();
  }
}

export default new EnhancedClassificationEngine();