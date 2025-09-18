// Bulletproof SDS Analyzer - No APIs, No AI, Just Works
// PDF → Text → Extract → Classify → Done in 2 seconds

// ✅ CLEAN PRODUCTION PIPELINE - Only fixed components
import { customSDSEngine } from './customSDSEngine.js';        // ⭐ Fixed universal extractor
// import { localClassifier } from './localClassifier.js';         // UNUSED - Basic classifier
import { enhancedClassifier } from './enhancedLocalClassifier.js'; // ⭐ Fixed enhanced classifier

// 🗂️ ARCHIVED: Removed problematic legacy extractors
// - sdsDataExtractor.js (caused aerosol misclassification) 
// - lineByLineSDSExtractor.js (outdated)
// - enhancedLineExtractor.js (superseded by customSDSEngine)  
// - adaptiveSDSExtractor.js (inconsistent results)

export class BulletproofSDSAnalyzer {
  constructor() {
    this.debug = true;
    this.learningMode = true;
    this.extractionCache = this.loadExtractionCache();
    // this.adobeQuota = this.loadAdobeQuota(); // UNUSED - Adobe services not being used
    console.log('🚀🚀🚀 BULLETPROOF SDS ANALYZER v3.1 WITH LEARNING - CACHE: ' + Object.keys(this.extractionCache).length + ' patterns 🚀🚀🚀');
  }

  /**
   * Load learned extraction patterns from localStorage
   */
  loadExtractionCache() {
    try {
      const cached = localStorage.getItem('sds_extraction_cache');
      if (cached) {
        const cache = JSON.parse(cached);
        console.log(`📚 Loaded ${Object.keys(cache).length} cached extractions`);
        return cache;
      }
    } catch (e) {
      console.error('Failed to load extraction cache:', e);
    }
    return {};
  }

  /**
   * UNUSED - Load Adobe quota tracking - Commented out since not using Adobe services
   */
  /*
  loadAdobeQuota() {
    try {
      const stored = localStorage.getItem('adobe_quota_tracker');
      if (stored) {
        const quota = JSON.parse(stored);
        // Reset if new month
        const currentMonth = new Date().getMonth();
        if (quota.month !== currentMonth) {
          return { used: 0, month: currentMonth, limit: 500 };
        }
        return quota;
      }
    } catch (e) {
      console.error('Failed to load quota:', e);
    }
    return { used: 0, month: new Date().getMonth(), limit: 500 };
  }
  */

  /**
   * Map waste codes to state form code
   */
  mapToStateForm(wasteCodes) {
    if (wasteCodes.length === 0) return 'SW';
    
    // Map based on first waste code found
    const firstCode = wasteCodes[0];
    if (firstCode.startsWith('D')) return 'HW'; // Characteristic hazardous
    if (firstCode.startsWith('F')) return 'HW'; // Listed spent solvent
    if (firstCode.startsWith('P')) return 'PW'; // Acutely hazardous
    if (firstCode.startsWith('U')) return 'HW'; // Listed hazardous
    
    return 'HW'; // Default to hazardous waste
  }

  /**
   * Save successful extraction to cache for learning
   */
  cacheExtraction(pdfHash, extractedData, classification) {
    if (!this.learningMode) return;
    
    this.extractionCache[pdfHash] = {
      data: extractedData,
      classification: classification,
      timestamp: Date.now(),
      hits: 0
    };
    
    // Keep cache size manageable (max 500 entries)
    const entries = Object.entries(this.extractionCache);
    if (entries.length > 500) {
      // Remove oldest entries
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.extractionCache = Object.fromEntries(sorted.slice(0, 500));
    }
    
    localStorage.setItem('sds_extraction_cache', JSON.stringify(this.extractionCache));
    console.log('🧠 Cached extraction for future use');
  }

  /**
   * Generate hash for PDF content
   */
  generatePDFHash(pdfText) {
    // Simple hash for caching
    let hash = 0;
    const str = pdfText.slice(0, 1000); // Use first 1000 chars
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `pdf_${Math.abs(hash)}`;
  }

  /**
   * Direct section-based analysis - optimized for pre-extracted sections
   * @param {Object} sectionData - Pre-extracted section data
   * @param {Object} userOverrides - Manual corrections from user
   * @returns {Object} Complete classification result
   */
  async analyzeSectionsDirectly(sectionData, userOverrides = {}) {
    const startTime = performance.now();
    
    console.log('🚀 DIRECT SECTION ANALYSIS STARTING...');
    console.log(`📋 Available sections: ${Object.keys(sectionData).filter(k => sectionData[k]).join(', ')}`);
    
    try {
      // Extract data directly from each section using section-specific extractors
      const extractedData = {
        productName: this.extractProductNameFromSection(sectionData.section1),
        composition: this.extractCompositionFromSection(sectionData.section3),
        flashPoint: this.extractFlashPointFromSection(sectionData.section9),
        pH: this.extractPHFromSection(sectionData.section9),
        physicalState: this.extractPhysicalStateFromSection(sectionData.section9),
        unNumber: this.extractUNNumberFromSection(sectionData.section14),
        dotShipping: this.extractDOTShippingFromSection(sectionData.section14),
        hazardStatements: [],
        casNumbers: []
      };
      
      console.log(`🔧 DIRECT EXTRACTION RESULTS:`, {
        productName: extractedData.productName,
        compositionCount: extractedData.composition?.length || 0,
        flashPoint: extractedData.flashPoint,
        pH: extractedData.pH,
        physicalState: extractedData.physicalState
      });
      
      // Use enhanced classifier for hazard classification
      console.log('📊 Step 2: Running enhanced classifier...');
      const classification = await enhancedClassifier.classify(extractedData, userOverrides);
      
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);
      
      console.log(`✅ DIRECT SECTION ANALYSIS COMPLETE in ${processingTime}ms`);
      
      return {
        ...extractedData,
        ...classification,
        processingTime: `${processingTime}ms`,
        method: 'direct-sections'
      };
      
    } catch (error) {
      console.error('❌ Direct section analysis failed:', error);
      return {
        productName: 'Analysis Failed',
        composition: [],
        flashPoint: null,
        pH: null,
        physicalState: 'unknown',
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Complete SDS analysis pipeline
   * @param {string} pdfText - Extracted PDF text
   * @param {Object} userOverrides - Manual corrections from user
   * @returns {Object} Complete classification result
   */
  async analyzeSDS(pdfText, userOverrides = {}) {
    const startTime = performance.now();
    
    // COMMENTED OUT: Excessive debug logging
    // console.error('🚨🚨🚨 BULLETPROOF ANALYZER CALLED - TIMESTAMP:', new Date().toISOString());
    // console.error('🚨🚨🚨 PDF TEXT LENGTH:', pdfText?.length || 0);
    // console.error('🚨🚨🚨 USER OVERRIDES:', JSON.stringify(userOverrides));
    // console.error('🚨🚨🚨 ADOBE QUOTA STATUS:', `${this.adobeQuota.used}/${this.adobeQuota.limit}`);
    
    // Check cache first for instant results
    const pdfHash = this.generatePDFHash(pdfText); // Use consistent hash for caching
    
    // Production-ready caching for optimal performance
    const skipCache = false; // Cache enabled for production use
    
    console.log('⚡ BULLETPROOF ANALYZER: CACHE ENABLED - Checking for existing results');
    
    if (this.extractionCache[pdfHash] && !userOverrides.forceRefresh && !skipCache) {
      console.log('⚡ CACHE HIT! Using cached extraction');
      const cached = this.extractionCache[pdfHash];
      cached.hits++;
      localStorage.setItem('sds_extraction_cache', JSON.stringify(this.extractionCache));
      
      return {
        ...cached.classification,
        processingTime: '0ms (cached)',
        method: 'cache',
        cacheHits: cached.hits
      };
    } else if (skipCache) {
      console.log('🚨 CACHE DISABLED FOR TESTING - FORCING FRESH ANALYSIS');
    }
    
    try {
      console.log('🚀 BULLETPROOF SDS ANALYSIS STARTING...');
      console.log(`📋 PDF Text Length: ${pdfText?.length || 0} characters`);
      console.log(`📋 First 200 chars: ${pdfText?.slice(0, 200) || 'NO TEXT'}`);
      
      // Step 1: Extract raw data from PDF text using enhanced line-by-line parsing
      console.log('📄 Step 1: Extracting data from SDS text using enhanced line-by-line format...');
      let extractedData;
      // ⭐ CLEAN PRODUCTION PIPELINE: Use only the fixed customSDSEngine
      console.log('🚨 USING CUSTOM ENGINE v1.1 - FIXED UNIVERSAL PATTERNS');
      try {
        extractedData = customSDSEngine.extract(pdfText);
        console.log(`🔧 CUSTOM ENGINE SUCCESS: Name="${extractedData?.productName || 'null'}", Flash=${extractedData?.flashPoint || 'null'}, pH=${extractedData?.pH || 'null'}, State="${extractedData?.physicalState || 'null'}", Components=${extractedData?.composition?.length || 0}`);
      } catch (customError) {
        console.error('❌ Custom engine failed:', customError);
        // Provide safe defaults instead of using broken fallback extractors
        extractedData = {
          productName: 'Extraction Failed',
          flashPoint: null,
          pH: null,
          physicalState: 'liquid', // Safe default
          composition: [],
          casNumbers: [],
          unNumber: null,
          error: customError.message
        };
        console.log('🛡️ Using safe defaults instead of broken legacy extractors');
      }
      console.log(`🔍 EXTRACTED PRODUCT NAME: "${extractedData?.productName || 'null'}"`);
      
      // Ensure extractedData has safe defaults
      const safeExtractedData = {
        productName: extractedData?.productName || null,
        flashPoint: extractedData?.flashPoint || null,
        pH: extractedData?.pH || null,
        physicalState: extractedData?.physicalState || null,
        unNumber: extractedData?.unNumber || null,
        casNumbers: extractedData?.casNumbers || [],
        composition: extractedData?.composition || [],
        originalLines: extractedData?.originalLines || [],
        ...extractedData
      };
      
      // Step 2: Apply user overrides (manual corrections)
      console.log('✏️  Step 2: Applying user corrections...');
      const finalData = this.applyUserOverrides(safeExtractedData, userOverrides);
      console.log(`🔍 FINAL PRODUCT NAME: "${finalData.productName}"`);
      console.log(`🔍 FINAL FLASH POINT: ${finalData.flashPoint}°C`);
      console.log(`🔍 FINAL PH: ${finalData.pH}`);
      
      // Step 3: Classify using enhanced deterministic rules with validation
      console.log('⚖️  Step 3: Applying enhanced classification rules...');
      console.log('🔍 CLASSIFICATION INPUT DATA:', {
        productName: finalData.productName,
        flashPoint: finalData.flashPoint,
        pH: finalData.pH,
        physicalState: finalData.physicalState,
        unNumber: finalData.unNumber
      });
      
      // DEBUG: Log the final data being passed to classifier
      // COMMENTED OUT: Excessive debug logging
      // console.error('🚨🚨🚨 FINAL DATA BEING SENT TO CLASSIFIER:');
      // console.error('🚨🚨🚨 finalData.flashPoint:', finalData.flashPoint, 'TYPE:', typeof finalData.flashPoint);
      // console.error('🚨🚨🚨 finalData.pH:', finalData.pH, 'TYPE:', typeof finalData.pH);
      // console.error('🚨🚨🚨 finalData.physicalState:', finalData.physicalState);
      // console.error('🚨🚨🚨 finalData.productName:', finalData.productName);
      // console.error('🚨🚨🚨 finalData.composition.length:', finalData.composition?.length || 0);
      
      // CONCISE DEBUG: Show classification input summary
      console.log(`🔍 SDS Analysis: ${finalData.productName} | Flash: ${finalData.flashPoint} | pH: ${finalData.pH} | State: ${finalData.physicalState} | Comp: ${finalData.composition?.length || 0}`);
      
      // console.error('🚨🚨🚨 ABOUT TO CALL CLASSIFIER WITH THIS DATA:', finalData);
      
      let classification;
      try {
        classification = await enhancedClassifier.classify(finalData);
        console.log('🎯 REVOLUTIONARY CLASSIFICATION RESULT:', {
          final_classification: classification.riskLevel,
          federal_codes: classification.wasteCodes,
          method: classification.method,
          confidence: classification.confidence
        });
      } catch (classError) {
        console.error('❌ REVOLUTIONARY CLASSIFICATION FAILED:', classError);
        console.error('❌ Classification input was:', finalData);
        throw classError;
      }
      
      // Step 4: Add metadata and validation
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);
      
      // Quick fix for product name extraction issue
      let productName = finalData.productName || extractedData.productName || 'Not identified';
      
      // If product name extraction failed, try to find it directly in the lines
      if (productName === 'Not identified' || productName === '' || !productName || productName === 'Unknown Product') {
        const lines = extractedData.originalLines || [];
        console.log(`🔧 DIRECT FIX: Searching ${lines.length} lines for product name...`);
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]?.toString() ?? '';
          const prevLine = i > 0 ? (lines[i - 1]?.toString() ?? '') : '';
          
          // Skip undefined or null lines
          if (!line) continue;
          
          // Pattern 1: "SECTION 1: Product name: WD-40" all on one line
          const sectionPattern = /SECTION\s+\d+\s*:\s*Product\s+name\s*:\s*(.+)$/i;
          const sectionMatch = line.match(sectionPattern);
          if (sectionMatch && sectionMatch[1]) {
            productName = sectionMatch[1].trim();
            console.log(`🔧 DIRECT FIX: SUCCESS! Found product name "${productName}" in SECTION format on line ${i + 1}`);
            break;
          }
          
          // Pattern 2: Look for lines that follow "Product name :" with flexible whitespace matching
          if (prevLine) {
            const cleanPrevLine = prevLine?.trim()?.toLowerCase()?.replace(/\s+/g, ' ') ?? '';
            if (cleanPrevLine === 'product name :' || cleanPrevLine === 'product name:') {
              console.log(`🔧 DIRECT FIX: Found "Product name :" on previous line, current line: "${line}"`);
              if (line.length > 0 && line.length < 100) {
                // Check if line is likely a product name vs metadata
                const lowerLine = line?.toLowerCase() ?? '';
                const isProductNumber = lowerLine.includes('product number') || lowerLine.includes('item number') || 
                                       lowerLine.includes('product code') || lowerLine.includes('sku');
                const isMetadata = lowerLine.includes('manufacturer') || lowerLine.includes('section') || 
                                  lowerLine.includes('hazard') || lowerLine.includes('version');
                
                // Accept if it's not obviously metadata or product number
                if (!isProductNumber && !isMetadata) {
                  productName = line.trim();
                  console.log(`🔧 DIRECT FIX: SUCCESS! Found product name "${productName}" on line ${i + 1}`);
                  break;
                } else {
                  console.log(`🔧 DIRECT FIX: Rejected line "${line}" - appears to be metadata (product number: ${isProductNumber}, metadata: ${isMetadata})`);
                }
              } else {
                console.log(`🔧 DIRECT FIX: Rejected line "${line}" - invalid length: ${line.length}`);
              }
            }
          }
          
          // Pattern 3: Direct "Product name: X" pattern
          const directPattern = /^Product\s+name\s*:\s*(.+)$/i;
          const directMatch = line.match(directPattern);
          if (directMatch && directMatch[1]) {
            productName = directMatch[1].trim();
            console.log(`🔧 DIRECT FIX: SUCCESS! Found product name "${productName}" in direct format on line ${i + 1}`);
            break;
          }
          
          // Pattern 4: Look for product identifiers as fallback when product name is missing
          const identifierPattern = /^(Product identifier|Trade name|Chemical name|Material name)\s*:\s*(.+)$/i;
          const identifierMatch = line.match(identifierPattern);
          if (identifierMatch && identifierMatch[2] && identifierMatch[2].length > 3) {
            const identifier = identifierMatch[2].trim();
            // Skip obvious product numbers/codes
            if (!/^[\d\-A-Z]{3,}$/.test(identifier)) {
              productName = identifier;
              console.log(`🔧 DIRECT FIX: SUCCESS! Found product identifier "${productName}" on line ${i + 1} (${identifierMatch[1]})`);
              break;
            }
          }
        }
        
        // Final fallback: Only use generic names if this looks like a real SDS document
        if (productName === 'Not identified' || productName === 'Unknown Product' || !productName || productName === '') {
          console.log(`🔧 FINAL FALLBACK: Checking if document appears to be a real SDS...`);
          
          // Check for SDS indicators to avoid false positives
          const fullText = lines.join(' ')?.toLowerCase() ?? '';
          const hasSDSIndicators = fullText.includes('safety data sheet') || 
                                  fullText.includes('material safety') || 
                                  fullText.includes('section 1') ||
                                  fullText.includes('section 9') ||
                                  (fullText.includes('hazard') && fullText.includes('product')) ||
                                  (fullText.includes('flash point') && fullText.includes('identification'));
          
          if (hasSDSIndicators && lines.length >= 3) {
            console.log(`🔧 FINAL FALLBACK: Document appears to be SDS, attempting to infer product name...`);
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i] || '';
              const lowerLine = line?.toLowerCase() ?? '';
              
              // Look for hazard context that might give us a clue
              if (lowerLine.includes('flammable') || lowerLine.includes('flash point')) {
                if (lowerLine.includes('liquid')) {
                  productName = 'Flammable Liquid Product';
                  console.log(`🔧 FINAL FALLBACK: Inferred "${productName}" from hazard context`);
                  break;
                } else if (lowerLine.includes('aerosol')) {
                  productName = 'Flammable Aerosol Product'; 
                  console.log(`🔧 FINAL FALLBACK: Inferred "${productName}" from hazard context`);
                  break;
                } else {
                  productName = 'Flammable Product';
                  console.log(`🔧 FINAL FALLBACK: Inferred "${productName}" from hazard context`);
                  break;
                }
              } else if (lowerLine.includes('corrosive') || (lowerLine.includes('ph') && lowerLine.includes(':'))) {
                productName = 'Chemical Product';
                console.log(`🔧 FINAL FALLBACK: Inferred "${productName}" from chemical context`);
                break;
              }
            }
            
            // If still nothing found but looks like SDS, use generic name
            if (productName === 'Not identified' || productName === 'Unknown Product' || !productName || productName === '') {
              productName = 'Chemical Product';
              console.log(`🔧 FINAL FALLBACK: Using generic name "${productName}" for apparent SDS document`);
            }
          } else {
            console.log(`🔧 FINAL FALLBACK: Document does not appear to be a valid SDS - keeping "Not identified"`);
            productName = 'Not identified';
          }
        }
        
        console.log(`🔧 DIRECT FIX: Final product name: "${productName}"`);
      }
      
      // Create final corrected data for validation
      const correctedData = {
        ...finalData,
        productName: productName
      };
      
      const result = {
        // Map revolutionary classification to legacy format
        final_classification: classification.riskLevel === 'HIGH' ? 'hazardous' : 'non-hazardous',
        federal_codes: classification.wasteCodes || [],
        state_form_code: this.mapToStateForm(classification.wasteCodes || []),
        state_classification: classification.riskLevel === 'HIGH' ? 'hazardous' : 'non-hazardous',
        hazardClass: classification.hazardClass || [],
        constituents: classification.constituents || [],
        confidence: classification.confidence || 0,
        method: classification.method || 'revolutionary-constituent-first',
        productName: productName,
        extractedData: {
          ...safeExtractedData,
          // Use formatted values from classification result
          flashPoint: classification.flashPoint || safeExtractedData.flashPoint,
          pH: classification.pH || safeExtractedData.pH
        },
        userOverrides: userOverrides,
        dataValidation: { isValid: true, errors: [] }, // Simplified validation
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
        method: 'bulletproof_local',
        // Include section data for debugging
        parsedSections: safeExtractedData.sections || null,
        // CRITICAL: Include full text for complete visibility
        fullExtractedText: safeExtractedData.fullText || pdfText,
        allOriginalLines: safeExtractedData.originalLines || [],
        totalTextLength: pdfText?.length || 0,
        // Add correction tracking
        userCorrected: Object.keys(userOverrides).length > 0,
        correctionData: Object.keys(userOverrides).length > 0 ? userOverrides : null
      };

      console.log(`✅ ANALYSIS COMPLETE in ${processingTime}ms`);
      console.log(`📊 Result: ${result.final_classification} - ${result.federal_codes.join(', ') || 'None'}`);
      console.log(`🎯 Form: ${result.state_form_code}-${result.state_classification}`);
      
      // Cache successful extraction for learning
      this.cacheExtraction(pdfHash, extractedData, result);
      
      // UNUSED - Update Adobe quota if used
      /*
      if (result.method === 'adobe_pdf_services') {
        this.adobeQuota.used++;
        localStorage.setItem('adobe_quota_tracker', JSON.stringify(this.adobeQuota));
        console.log(`📊 Adobe Quota: ${this.adobeQuota.used}/${this.adobeQuota.limit}`);
      }
      */
      
      return result;
      
    } catch (error) {
      console.error('🔴 ANALYSIS FAILED:', error);
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);
      console.error('🔴 User overrides were:', userOverrides);
      console.error('🔴 PDF text length:', pdfText?.length);
      
      // Try to identify where the error occurred
      if (error.stack) {
        const lines = error.stack.split('\n');
        const relevantLine = lines.find(line => line.includes('toLowerCase'));
        if (relevantLine) {
          console.error('🔴 toLowerCase error at:', relevantLine);
        }
      }
      
      const errorResult = this.createErrorResult(error, performance.now() - startTime);
      // Include correction data in error result
      if (Object.keys(userOverrides).length > 0) {
        errorResult.userCorrected = true;
        errorResult.correctionData = userOverrides;
      }
      return errorResult;
    }
  }

  /**
   * Apply user corrections to extracted data
   */
  applyUserOverrides(extractedData, userOverrides) {
    console.log('🔧 APPLY USER OVERRIDES DEBUG:');
    console.log('📄 Input extractedData:', extractedData);
    console.log('✏️  Input userOverrides:', userOverrides);
    
    const finalData = { ...extractedData };
    
    // Apply user overrides with validation
    if (userOverrides.productName) {
      console.log(`✏️  APPLYING PRODUCT NAME OVERRIDE: "${userOverrides.productName}"`);
      finalData.productName = userOverrides.productName;
      console.log(`✏️  Override applied: Product name → "${finalData.productName}"`);
    } else {
      console.log('⚠️  NO PRODUCT NAME OVERRIDE PROVIDED');
      console.log('   userOverrides.productName:', userOverrides.productName);
      console.log('   typeof:', typeof userOverrides.productName);
    }
    
    if (userOverrides.flashPoint !== undefined && userOverrides.flashPoint !== null) {
      const fpValue = parseFloat(userOverrides.flashPoint);
      if (!isNaN(fpValue)) {
        finalData.flashPoint = fpValue;
        // console.log(`✏️  Override: Flash point → ${finalData.flashPoint}°C`);
      } else {
        // console.log(`❌ Invalid flash point override: ${userOverrides.flashPoint}`);
      }
    }
    
    if (userOverrides.pH !== undefined && userOverrides.pH !== null) {
      const pHValue = parseFloat(userOverrides.pH);
      if (!isNaN(pHValue)) {
        finalData.pH = pHValue;
        // console.log(`✏️  Override: pH → ${finalData.pH}`);
      } else {
        // console.log(`❌ Invalid pH override: ${userOverrides.pH}`);
      }
    }
    
    if (userOverrides.physicalState) {
      finalData.physicalState = userOverrides.physicalState?.toString()?.toLowerCase() ?? userOverrides.physicalState;
      // console.log(`✏️  Override: Physical state → ${finalData.physicalState}`);
    }
    
    if (userOverrides.unNumber) {
      finalData.unNumber = userOverrides.unNumber;
      // console.log(`✏️  Override: UN number → ${finalData.unNumber}`);
    }
    
    return finalData;
  }

  /**
   * Create error result for failed analysis
   */
  createErrorResult(error, processingTime) {
    return {
      productName: 'Analysis Failed',
      flashPoint: { celsius: null, fahrenheit: null },
      pH: null,
      physicalState: 'unknown',
      federal_codes: [],
      state_form_code: 'ERROR',
      state_classification: 'ERROR',
      state_codes: ['ERROR'],
      final_classification: 'error',
      error: error.message,
      processingTime: `${Math.round(processingTime)}ms`,
      timestamp: new Date().toISOString(),
      method: 'bulletproof_local'
    };
  }

  /**
   * Batch analyze multiple SDSs
   */
  async batchAnalyze(sdsTextArray, userOverridesArray = []) {
    // console.log(`🔥 BATCH ANALYSIS: ${sdsTextArray.length} SDSs`);
    const startTime = performance.now();
    
    const results = [];
    
    for (let i = 0; i < sdsTextArray.length; i++) {
      const sdsText = sdsTextArray[i];
      const userOverrides = userOverridesArray[i] || {};
      
      // console.log(`📋 Processing SDS ${i + 1}/${sdsTextArray.length}...`);
      
      try {
        const result = await this.analyzeSDS(sdsText, userOverrides);
        results.push({
          index: i,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }
    
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    const avgTime = Math.round(totalTime / sdsTextArray.length);
    
    // console.log(`✅ BATCH COMPLETE: ${results.length} SDSs in ${totalTime}ms (avg: ${avgTime}ms each)`);
    
    return {
      results: results,
      summary: {
        total: sdsTextArray.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalTime: `${totalTime}ms`,
        averageTime: `${avgTime}ms`
      }
    };
  }

  /**
   * Test the analyzer with known samples
   */
  runTests() {
    // console.log('🧪 RUNNING BULLETPROOF ANALYZER TESTS...');
    
    // Test with synthetic SDS text samples
    const testSDSs = [
      {
        name: 'WD-40 Test',
        sdsText: `
SECTION 1: Product name: WD-40 Multi-Use Product Aerosol
SECTION 9: Physical and chemical properties
g) Flash point 50°C (122°F) - closed cup
a) Appearance Form: clear, aerosol
        `,
        expectedCodes: ['D001'],
        expectedForm: '208'
      },
      {
        name: 'Sodium Hypochlorite Test',
        sdsText: `
SECTION 1: Product name: Sodium Hypochlorite Solution 13%
SECTION 9: Physical and chemical properties  
d) pH 13
a) Appearance Form: clear, liquid
        `,
        expectedCodes: ['D002'],
        expectedForm: '106'
      }
    ];

    let passed = 0;
    
    for (const test of testSDSs) {
      try {
        const result = this.analyzeSDS(test.sdsText, {});
        
        const codesMatch = JSON.stringify(result.federal_codes.sort()) === JSON.stringify(test.expectedCodes.sort());
        const formMatch = result.state_form_code === test.expectedForm;
        
        if (codesMatch && formMatch) {
          // console.log(`✅ ${test.name}: PASSED`);
          passed++;
        } else {
          // console.log(`❌ ${test.name}: FAILED`);
          // console.log(`   Expected: ${test.expectedCodes.join(', ')}, Form ${test.expectedForm}`);
          // console.log(`   Got: ${result.federal_codes.join(', ')}, Form ${result.state_form_code}`);
        }
      } catch (error) {
        // console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      }
    }
    
    // console.log(`🎯 Test Results: ${passed}/${testSDSs.length} passed`);
    return passed === testSDSs.length;
  }

  // ===== SECTION-SPECIFIC EXTRACTORS =====
  // These work directly on pre-extracted sections

  extractProductNameFromSection(section1) {
    console.log('🔍 EXTRACTING PRODUCT NAME FROM SECTION 1');
    console.log('Section 1 data:', section1 ? `"${section1.substring(0, 500)}..."` : 'NULL');
    
    if (!section1) {
      console.log('❌ Section 1 is null/empty');
      return 'Unknown Product';
    }
    
    const lines = section1.split('\n');
    console.log(`📋 Section 1 has ${lines.length} lines`);
    
    for (const line of lines) {
      const lineLower = line.toLowerCase().trim();
      
      // Skip headers and metadata
      if (lineLower.includes('section') || lineLower.includes('identification') || 
          lineLower.includes('page') || line.length < 3) continue;
      
      // Look for product name patterns
      const productMatch = line.match(/product\s+name\s*:?\s*(.+)/i) ||
                          line.match(/trade\s+name\s*:?\s*(.+)/i) ||
                          line.match(/chemical\s+name\s*:?\s*(.+)/i);
      
      if (productMatch) {
        console.log(`✅ PRODUCT NAME FOUND: "${productMatch[1].trim()}"`);
        return productMatch[1].trim();
      }
      
      // If no explicit pattern, take first substantial line
      if (line.length > 5 && !lineLower.includes(':')) {
        console.log(`📝 Using fallback product name: "${line.trim()}"`);
        return line.trim();
      }
    }
    
    console.log('❌ No product name found, returning Unknown Product');
    return 'Unknown Product';
  }

  extractCompositionFromSection(section3) {
    if (!section3) return [];
    
    const composition = [];
    const lines = section3.split('\n');
    
    console.log(`🔧 EXTRACTING COMPOSITION FROM SECTION 3 (${lines.length} lines)`);
    
    // Try multiple patterns for different SDS formats
    let currentComponent = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 5) continue;
      
      // Skip headers and metadata
      if (line.toLowerCase().includes('section') || 
          line.toLowerCase().includes('composition') ||
          line.toLowerCase().includes('ingredient')) continue;
      
      console.log(`🔍 Processing line: "${line}"`);
      
      // Pattern 1: Single line format "Tetrachlorethylene 127-18-4 >= 90 - <= 100"
      const singleLineMatch = line.match(/^([A-Za-z][A-Za-z\s\-\(\),]+?)\s+(\d{2,7}-\d{2}-\d)\*?\s*>=?\s*([0-9.]+)\s*(?:-\s*<=?\s*([0-9.]+))?/i);
      
      if (singleLineMatch) {
        const name = singleLineMatch[1].trim();
        const cas = singleLineMatch[2];
        const minConc = parseFloat(singleLineMatch[3]);
        const maxConc = singleLineMatch[4] ? parseFloat(singleLineMatch[4]) : minConc;
        const avgConc = (minConc + maxConc) / 2;
        
        composition.push({
          name: name,
          cas: cas,
          concentration: avgConc,
          percentage: `${minConc}${maxConc !== minConc ? `-${maxConc}` : ''}%`
        });
        
        console.log(`🧪 COMPOSITION FOUND (single line): ${name} (${cas}) - ${avgConc}%`);
      }
      
      // Pattern 2: Multi-line format 
      // "Chemical Name: Petroleum distillates"
      const nameMatch = line.match(/Chemical\s+Name\s*:\s*(.+)/i) || line.match(/Component\s*:\s*(.+)/i);
      if (nameMatch) {
        currentComponent.name = nameMatch[1].trim();
        console.log(`🔍 Found chemical name: ${currentComponent.name}`);
      }
      
      // "CAS Number: 64742-47-8"
      const casMatch = line.match(/CAS\s+Number\s*:\s*(\d{2,7}-\d{2}-\d)/i) || line.match(/CAS\s*:\s*(\d{2,7}-\d{2}-\d)/i);
      if (casMatch) {
        currentComponent.cas = casMatch[1];
        console.log(`🔍 Found CAS number: ${currentComponent.cas}`);
      }
      
      // "Percentage: 45-50%" or "Concentration: 45-50%"
      const percentMatch = line.match(/(?:Percentage|Concentration)\s*:\s*([0-9.-]+)(?:\s*-\s*([0-9.]+))?%?/i);
      if (percentMatch) {
        const minConc = parseFloat(percentMatch[1]);
        const maxConc = percentMatch[2] ? parseFloat(percentMatch[2]) : minConc;
        currentComponent.minConc = minConc;
        currentComponent.maxConc = maxConc;
        console.log(`🔍 Found percentage: ${minConc}${maxConc !== minConc ? `-${maxConc}` : ''}%`);
      }
      
      // If we have complete component info, add it
      if (currentComponent.name && currentComponent.cas && currentComponent.minConc !== undefined) {
        const avgConc = (currentComponent.minConc + currentComponent.maxConc) / 2;
        
        composition.push({
          name: currentComponent.name,
          cas: currentComponent.cas,
          concentration: avgConc,
          percentage: `${currentComponent.minConc}${currentComponent.maxConc !== currentComponent.minConc ? `-${currentComponent.maxConc}` : ''}%`
        });
        
        console.log(`🧪 COMPOSITION FOUND (multi-line): ${currentComponent.name} (${currentComponent.cas}) - ${avgConc}%`);
        currentComponent = {}; // Reset for next component
      }
    }
    
    console.log(`🔧 COMPOSITION EXTRACTION COMPLETE: ${composition.length} components found`);
    return composition;
  }

  extractFlashPointFromSection(section9) {
    if (!section9) return null;
    
    const lines = section9.split('\n');
    
    for (const line of lines) {
      if (!line.toLowerCase().includes('flash')) continue;
      
      // Extract temperature with unit
      const match = line.match(/(\d+(?:\.\d+)?)\s*°?\s*([CF])/i);
      if (match) {
        let temp = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        
        // Convert to Celsius
        if (unit === 'F') {
          temp = (temp - 32) * 5 / 9;
        }
        
        if (temp >= -150 && temp <= 300) {
          console.log(`🔥 FLASH POINT FOUND: ${temp}°C`);
          return Math.round(temp);
        }
      }
    }
    
    return null;
  }

  extractPHFromSection(section9) {
    if (!section9) return null;
    
    const lines = section9.split('\n');
    
    for (const line of lines) {
      if (!line.toLowerCase().includes('ph')) continue;
      
      // Extract pH value
      const match = line.match(/ph\s*:?\s*(\d+(?:\.\d+)?)/i);
      if (match) {
        const pH = parseFloat(match[1]);
        if (pH >= 0 && pH <= 14) {
          console.log(`🧪 pH FOUND: ${pH}`);
          return pH;
        }
      }
    }
    
    return null;
  }

  extractPhysicalStateFromSection(section9) {
    console.log('🔍 EXTRACTING PHYSICAL STATE FROM SECTION 9');
    console.log('Section 9 data:', section9 ? `"${section9.substring(0, 300)}..."` : 'NULL');
    
    if (!section9) {
      console.log('❌ Section 9 is null/empty');
      return 'unknown';
    }
    
    const text = section9.toLowerCase();
    
    if (text.includes('aerosol')) {
      console.log('✅ PHYSICAL STATE: aerosol');
      return 'aerosol';
    }
    if (text.includes('gas') || text.includes('liquefied gas')) {
      console.log('✅ PHYSICAL STATE: liquefied gas');
      return 'liquefied gas';
    }
    if (text.includes('solid')) {
      console.log('✅ PHYSICAL STATE: solid');
      return 'solid';
    }
    if (text.includes('liquid')) {
      console.log('✅ PHYSICAL STATE: liquid');
      return 'liquid';
    }
    
    console.log('❌ No physical state detected, using default: liquid');
    return 'liquid'; // Default assumption
  }

  extractUNNumberFromSection(section14) {
    if (!section14) return 'Non-regulated';
    
    const lines = section14.split('\n');
    
    for (const line of lines) {
      const match = line.match(/UN\s*(\d{4})/i);
      if (match) {
        console.log(`🚚 UN NUMBER FOUND: UN${match[1]}`);
        return match[1];
      }
    }
    
    return 'Non-regulated';
  }

  extractDOTShippingFromSection(section14) {
    if (!section14) return {};
    
    const lines = section14.split('\n');
    const shipping = {};
    
    for (const line of lines) {
      // Look for hazard class
      const hazardMatch = line.match(/class\s*:?\s*(\d+(?:\.\d+)?)/i);
      if (hazardMatch) {
        shipping.hazardClass = hazardMatch[1];
      }
      
      // Look for packing group
      const packingMatch = line.match(/packing\s+group\s*:?\s*([I]{1,3})/i);
      if (packingMatch) {
        shipping.packingGroup = packingMatch[1];
      }
    }
    
    return shipping;
  }
}

// Export singleton
export const bulletproofAnalyzer = new BulletproofSDSAnalyzer();
