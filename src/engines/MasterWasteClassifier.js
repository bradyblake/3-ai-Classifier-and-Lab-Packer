/**
 * MasterWasteClassifier.js
 * Master integration system that coordinates all classification components
 * with existing SDS parsing and provides AI training data
 */

import { WasteCategoryTree } from './WasteCategoryTree.js';
import { DetailedClassificationLogic } from './DetailedClassificationLogic.js';
import { ComprehensiveWasteClassifier } from './ComprehensiveWasteClassifier.js';
import { StateSpecificRegulations } from './StateSpecificRegulations.js';
import { FormGenerationSystem } from './FormGenerationSystem.js';
import { detectPhysicalState } from './PhysicalStateDetector_COMPLETED_.js';
import { SDSExtractionService } from '../services/SDSExtractionService.js';

export class MasterWasteClassifier {
  constructor(apiKeys = {}) {
    this.wasteCategoryTree = new WasteCategoryTree();
    this.detailedLogic = new DetailedClassificationLogic();
    this.comprehensiveClassifier = new ComprehensiveWasteClassifier();
    this.stateRegulations = new StateSpecificRegulations();
    this.formGenerator = new FormGenerationSystem();
    this.sdsExtractor = new SDSExtractionService(apiKeys);

    this.trainingData = [];
    this.classificationHistory = [];
  }

  /**
   * Main classification method that integrates with existing SDS parsing
   * @param {Object} sdsData - Parsed SDS data from existing extraction engines
   * @param {Object} options - Classification options
   * @returns {Object} Complete classification results with training data
   */
  async classifyWaste(sdsData, options = {}) {
    const {
      selectedState = null,
      generatorInfo = {},
      wasteSource = '',
      industryType = '',
      processDescription = '',
      isSpent = false,
      generateForms = true,
      collectTrainingData = true
    } = options;

    // Start classification process
    const classificationResults = {
      timestamp: new Date().toISOString(),
      inputs: {
        sdsData: this.sanitizeSdsForLogging(sdsData),
        options,
        selectedState
      },
      steps: [],
      results: {
        materialState: 'unknown',
        rcraWasteCodes: [],
        stateWasteCodes: [],
        classification: 'non-hazardous',
        complianceRequirements: [],
        forms: [],
        confidence: 0,
        reasoning: []
      },
      trainingMetadata: {
        decisionPoints: [],
        uncertainties: [],
        manualOverrides: []
      }
    };

    try {
      // Step 1: Determine physical state with enhanced detection
      const stateResult = await this.determinePhysicalStateEnhanced(sdsData);
      classificationResults.results.materialState = stateResult.state;
      classificationResults.results.confidence = stateResult.confidence;
      classificationResults.steps.push({
        step: 1,
        name: 'Physical State Determination',
        result: stateResult,
        timestamp: new Date().toISOString()
      });

      if (collectTrainingData) {
        this.recordDecisionPoint('physical_state', stateResult, sdsData);
      }

      // Step 2: Apply RCRA D codes with detailed logic
      const dCodeResults = await this.evaluateRCRADCodes(sdsData, stateResult.state);
      classificationResults.results.rcraWasteCodes.push(...dCodeResults.codes);
      classificationResults.results.reasoning.push(...dCodeResults.reasoning);
      classificationResults.steps.push({
        step: 2,
        name: 'RCRA D Codes Evaluation',
        result: dCodeResults,
        timestamp: new Date().toISOString()
      });

      // Step 3: Apply RCRA F codes
      const fCodeResults = await this.evaluateRCRAFCodes(sdsData, wasteSource, isSpent);
      classificationResults.results.rcraWasteCodes.push(...fCodeResults.codes);
      classificationResults.results.reasoning.push(...fCodeResults.reasoning);
      classificationResults.steps.push({
        step: 3,
        name: 'RCRA F Codes Evaluation',
        result: fCodeResults,
        timestamp: new Date().toISOString()
      });

      // Step 4: Apply RCRA P codes
      const pCodeResults = await this.evaluateRCRAPCodes(sdsData);
      classificationResults.results.rcraWasteCodes.push(...pCodeResults.codes);
      classificationResults.results.reasoning.push(...pCodeResults.reasoning);
      classificationResults.steps.push({
        step: 4,
        name: 'RCRA P Codes Evaluation',
        result: pCodeResults,
        timestamp: new Date().toISOString()
      });

      // Step 5: Apply RCRA U codes
      const uCodeResults = await this.evaluateRCRAUCodes(sdsData);
      classificationResults.results.rcraWasteCodes.push(...uCodeResults.codes);
      classificationResults.results.reasoning.push(...uCodeResults.reasoning);
      classificationResults.steps.push({
        step: 5,
        name: 'RCRA U Codes Evaluation',
        result: uCodeResults,
        timestamp: new Date().toISOString()
      });

      // Step 6: Apply RCRA K codes
      const kCodeResults = await this.evaluateRCRAKCodes(sdsData, industryType, processDescription);
      classificationResults.results.rcraWasteCodes.push(...kCodeResults.codes);
      classificationResults.results.reasoning.push(...kCodeResults.reasoning);
      classificationResults.steps.push({
        step: 6,
        name: 'RCRA K Codes Evaluation',
        result: kCodeResults,
        timestamp: new Date().toISOString()
      });

      // Step 7: Final RCRA determination
      const isHazardous = classificationResults.results.rcraWasteCodes.length > 0;
      classificationResults.results.classification = isHazardous ? 'hazardous' : 'non-hazardous';

      // Step 8: Apply state-specific regulations
      if (selectedState) {
        const stateResults = await this.stateRegulations.evaluateStateRegulations(
          sdsData,
          stateResult.state,
          classificationResults.results,
          selectedState
        );

        classificationResults.results.stateWasteCodes = stateResults.codes;
        classificationResults.results.complianceRequirements.push(...stateResults.requirements);
        classificationResults.results.reasoning.push(...stateResults.reasoning);
        classificationResults.steps.push({
          step: 8,
          name: 'State Regulations Evaluation',
          result: stateResults,
          timestamp: new Date().toISOString()
        });
      }

      // Step 9: Generate forms if requested
      if (generateForms) {
        const forms = await this.formGenerator.generateForms(
          classificationResults.results,
          generatorInfo,
          selectedState
        );
        classificationResults.results.forms = forms;
        classificationResults.steps.push({
          step: 9,
          name: 'Form Generation',
          result: { formsGenerated: forms.length, forms: forms.map(f => f.title) },
          timestamp: new Date().toISOString()
        });
      }

      // Step 10: Calculate final confidence and complete reasoning
      classificationResults.results.confidence = this.calculateOverallConfidence(classificationResults);
      classificationResults.results.reasoning = this.consolidateReasoning(classificationResults);

      // Store for training data if enabled
      if (collectTrainingData) {
        this.storeTrainingData(classificationResults);
      }

      // Add to history
      this.classificationHistory.push(classificationResults);

      return classificationResults;

    } catch (error) {
      console.error('Error in waste classification:', error);
      classificationResults.error = error.message;
      classificationResults.results.classification = 'error';
      classificationResults.results.reasoning.push(`Classification failed: ${error.message}`);

      return classificationResults;
    }
  }

  /**
   * Enhanced physical state determination with training data collection
   */
  async determinePhysicalStateEnhanced(sdsData) {
    // Use the existing enhanced detection
    const basicResult = DetailedClassificationLogic.determinePhysicalStateEnhanced(sdsData);

    // Add additional context and uncertainty tracking
    const enhancedResult = {
      ...basicResult,
      section9Present: this.checkSection9Present(sdsData),
      temperatureData: this.extractTemperatureData(sdsData),
      keywordMatches: basicResult.evidence,
      uncertaintyFactors: this.identifyUncertaintyFactors(basicResult, sdsData)
    };

    return enhancedResult;
  }

  /**
   * Evaluate RCRA D codes with detailed step tracking
   */
  async evaluateRCRADCodes(sdsData, materialState) {
    const results = { codes: [], reasoning: [], steps: [] };

    // D001 - Ignitability
    const d001Result = DetailedClassificationLogic.evaluateD001(sdsData, materialState);
    if (d001Result.applies) {
      results.codes.push({ code: 'D001', description: 'Ignitable', reason: d001Result.reason });
    }
    results.reasoning.push(d001Result.summaryReason || `D001: ${d001Result.reason || 'Not applicable'}`);
    results.steps.push(d001Result);

    // D002 - Corrosivity
    const d002Result = DetailedClassificationLogic.evaluateD002(sdsData, materialState);
    if (d002Result.applies) {
      results.codes.push({ code: 'D002', description: 'Corrosive', reason: d002Result.reason });
    }
    results.reasoning.push(d002Result.summaryReason || `D002: ${d002Result.reason || 'Not applicable'}`);
    results.steps.push(d002Result);

    // D003 - Reactivity
    const d003Result = DetailedClassificationLogic.evaluateD003(sdsData, materialState);
    if (d003Result.applies) {
      results.codes.push({ code: 'D003', description: 'Reactive', reason: d003Result.reason });
    }
    results.reasoning.push(d003Result.summaryReason || `D003: ${d003Result.reason || 'Not applicable'}`);
    results.steps.push(d003Result);

    // D004-D043 - Toxicity Characteristic
    const toxicityResults = await this.evaluateToxicityCharacteristic(sdsData);
    results.codes.push(...toxicityResults.codes);
    results.reasoning.push(...toxicityResults.reasoning);
    results.steps.push(...toxicityResults.steps);

    return results;
  }

  /**
   * Evaluate RCRA F codes
   */
  async evaluateRCRAFCodes(sdsData, wasteSource, isSpent) {
    return await this.comprehensiveClassifier.evaluateFCodes(sdsData, wasteSource, isSpent);
  }

  /**
   * Evaluate RCRA P codes
   */
  async evaluateRCRAPCodes(sdsData) {
    return await this.wasteCategoryTree.checkPCodes(sdsData);
  }

  /**
   * Evaluate RCRA U codes
   */
  async evaluateRCRAUCodes(sdsData) {
    return await this.wasteCategoryTree.checkUCodes(sdsData);
  }

  /**
   * Evaluate RCRA K codes
   */
  async evaluateRCRAKCodes(sdsData, industryType, processDescription) {
    return await this.comprehensiveClassifier.evaluateKCodes(sdsData, industryType, processDescription);
  }

  /**
   * Evaluate toxicity characteristic (D004-D043)
   */
  async evaluateToxicityCharacteristic(sdsData) {
    const results = { codes: [], reasoning: [], steps: [] };

    // Load D code limits data
    try {
      const dCodesData = await this.loadDCodeLimits();
      const composition = this.extractComposition(sdsData);

      for (const dCode of dCodesData.slice(3)) { // Skip D001-D003, start from D004
        const evaluation = {
          code: dCode.code,
          applies: false,
          reason: '',
          steps: []
        };

        // Check if constituent is present
        const constituentFound = composition.some(component =>
          component.cas === dCode.cas ||
          component.name.toLowerCase().includes(dCode.constituent.toLowerCase())
        );

        evaluation.steps.push({
          question: `Is ${dCode.constituent} present in the material?`,
          answer: constituentFound,
          reasoning: constituentFound ?
            `${dCode.constituent} found in composition` :
            `${dCode.constituent} not found in composition`
        });

        if (constituentFound) {
          // Check for TCLP data
          const tclpValue = this.extractTCLPValue(sdsData, dCode.cas);

          evaluation.steps.push({
            question: `Is TCLP data available for ${dCode.constituent}?`,
            answer: tclpValue !== null,
            data: tclpValue !== null ? `TCLP: ${tclpValue} mg/L` : 'No TCLP data available',
            reasoning: tclpValue !== null ?
              'TCLP test data found in documentation' :
              'No TCLP test results available - testing may be required'
          });

          if (tclpValue !== null && tclpValue >= dCode.threshold) {
            evaluation.applies = true;
            evaluation.reason = `TCLP value ${tclpValue} mg/L exceeds threshold ${dCode.threshold} mg/L`;

            results.codes.push({
              code: dCode.code,
              description: `Toxicity - ${dCode.constituent}`,
              reason: evaluation.reason
            });
          }
        }

        results.steps.push(evaluation);
        results.reasoning.push(
          evaluation.applies ?
            `${dCode.code}: Applies - ${evaluation.reason}` :
            `${dCode.code}: Not applicable - ${constituentFound ? 'below threshold or no TCLP data' : 'constituent not present'}`
        );
      }
    } catch (error) {
      results.reasoning.push('Error evaluating toxicity characteristic: ' + error.message);
    }

    return results;
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(classificationResults) {
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Factor in physical state confidence
    if (classificationResults.results.materialState !== 'unknown') {
      totalConfidence += classificationResults.results.confidence;
      confidenceCount++;
    }

    // Factor in RCRA code confidence
    const rcraCodeCount = classificationResults.results.rcraWasteCodes.length;
    if (rcraCodeCount > 0) {
      totalConfidence += 0.9; // High confidence if codes found
      confidenceCount++;
    } else {
      totalConfidence += 0.7; // Lower confidence for negative results
      confidenceCount++;
    }

    // Factor in state regulation confidence
    if (classificationResults.results.stateWasteCodes.length > 0) {
      totalConfidence += 0.8;
      confidenceCount++;
    }

    return confidenceCount > 0 ? totalConfidence / confidenceCount : 0.5;
  }

  /**
   * Consolidate reasoning from all steps
   */
  consolidateReasoning(classificationResults) {
    const reasoning = [];

    // Add summary
    reasoning.push(`Material classified as: ${classificationResults.results.classification}`);
    reasoning.push(`Physical state: ${classificationResults.results.materialState}`);

    // Add RCRA results
    if (classificationResults.results.rcraWasteCodes.length > 0) {
      reasoning.push(`RCRA waste codes: ${classificationResults.results.rcraWasteCodes.map(c => c.code).join(', ')}`);
    } else {
      reasoning.push('No RCRA hazardous waste codes apply');
    }

    // Add state results
    if (classificationResults.results.stateWasteCodes.length > 0) {
      reasoning.push(`State waste codes: ${classificationResults.results.stateWasteCodes.map(c => c.code || c.texasWasteCode).join(', ')}`);
    }

    // Add existing reasoning
    reasoning.push(...classificationResults.results.reasoning);

    return reasoning;
  }

  /**
   * Record decision point for AI training
   */
  recordDecisionPoint(decisionType, result, inputData) {
    const decisionPoint = {
      type: decisionType,
      timestamp: new Date().toISOString(),
      input: this.sanitizeDataForTraining(inputData),
      output: result,
      confidence: result.confidence || 0,
      uncertaintyFactors: result.uncertaintyFactors || []
    };

    this.trainingData.push(decisionPoint);
  }

  /**
   * Store complete classification for training
   */
  storeTrainingData(classificationResults) {
    const trainingRecord = {
      id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: classificationResults.timestamp,
      input: {
        sdsText: classificationResults.inputs.sdsData.text || '',
        materialProperties: this.extractMaterialProperties(classificationResults.inputs.sdsData),
        wasteSource: classificationResults.inputs.options.wasteSource || '',
        industryType: classificationResults.inputs.options.industryType || ''
      },
      output: {
        classification: classificationResults.results.classification,
        materialState: classificationResults.results.materialState,
        rcraWasteCodes: classificationResults.results.rcraWasteCodes.map(c => c.code),
        stateWasteCodes: classificationResults.results.stateWasteCodes.map(c => c.code || c.texasWasteCode),
        confidence: classificationResults.results.confidence
      },
      decisionSteps: classificationResults.steps.map(step => ({
        stepNumber: step.step,
        name: step.name,
        result: step.result,
        confidence: step.result.confidence || null
      })),
      humanFeedback: null, // To be populated by human review
      qualityScore: null // To be populated by human review
    };

    // Store in training data collection
    this.trainingData.push(trainingRecord);

    // In production, this would be sent to a training data database
    console.log('Training data recorded:', trainingRecord.id);
  }

  /**
   * Extract SDS data from file using API services
   * @param {string} sdsFilePath - Path to SDS file
   * @param {Object} options - Extraction and classification options
   * @returns {Object} Complete extraction and classification results
   */
  async extractAndClassifyFromFile(sdsFilePath, options = {}) {
    const startTime = Date.now();

    try {
      // Step 1: Extract structured data from SDS using APIs
      console.log('🔍 Extracting SDS data with AI APIs...');
      const sdsData = await this.sdsExtractor.extractFromFile(sdsFilePath, {
        ...options,
        includeRawText: true
      });

      // Step 2: Classify the extracted data
      console.log('⚖️ Classifying waste using extracted data...');
      const classificationResults = await this.classifyWaste(sdsData, options);

      // Combine extraction and classification results
      return {
        extractionMeta: sdsData.extractionMeta,
        classificationResults,
        totalProcessingTime: Date.now() - startTime,
        pipeline: 'SDS → API → JSON → Classification'
      };

    } catch (error) {
      console.error('Pipeline error:', error.message);
      throw new Error(`End-to-end processing failed: ${error.message}`);
    }
  }

  /**
   * Extract SDS data from raw text using API services
   * @param {string} sdsText - Raw SDS text content
   * @param {Object} options - Extraction and classification options
   * @returns {Object} Complete extraction and classification results
   */
  async extractAndClassifyFromText(sdsText, options = {}) {
    const startTime = Date.now();

    try {
      // Step 1: Extract structured data from SDS text using APIs
      console.log('🔍 Extracting SDS data with AI APIs...');
      const sdsData = await this.sdsExtractor.extractSDSData(sdsText, {
        ...options,
        includeRawText: true
      });

      // Step 2: Classify the extracted data
      console.log('⚖️ Classifying waste using extracted data...');
      const classificationResults = await this.classifyWaste(sdsData, options);

      // Combine extraction and classification results
      return {
        extractionMeta: sdsData.extractionMeta,
        classificationResults,
        totalProcessingTime: Date.now() - startTime,
        pipeline: 'SDS Text → API → JSON → Classification'
      };

    } catch (error) {
      console.error('Pipeline error:', error.message);
      throw new Error(`End-to-end processing failed: ${error.message}`);
    }
  }

  /**
   * Batch process multiple SDS files
   * @param {Array<string>} filePaths - Array of SDS file paths
   * @param {Object} options - Processing options
   * @returns {Array} Array of processing results
   */
  async batchProcessSDS(filePaths, options = {}) {
    console.log(`🔄 Starting batch processing of ${filePaths.length} SDS files...`);
    const results = [];

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      console.log(`Processing ${i + 1}/${filePaths.length}: ${filePath}`);

      try {
        const result = await this.extractAndClassifyFromFile(filePath, options);
        results.push({
          filePath,
          success: true,
          result
        });
        console.log(`✅ Successfully processed: ${filePath}`);
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}:`, error.message);
        results.push({
          filePath,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`🎯 Batch processing complete: ${successCount}/${filePaths.length} successful`);

    return results;
  }

  /**
   * Integration with existing SDS parsing systems
   */
  async integrateWithExistingSDS(sdsFilePath, options = {}) {
    try {
      // This would use the existing BulletproofSDSExtractor
      // Import the existing extractor
      const { BulletproofSDSExtractor } = await import('./BulletproofSDSExtractor_COMPLETED_.js');

      const extractor = new BulletproofSDSExtractor();
      const sdsData = await extractor.extractFromFile(sdsFilePath);

      // Classify the extracted data
      return await this.classifyWaste(sdsData, options);

    } catch (error) {
      console.error('Error integrating with existing SDS system:', error);
      throw new Error(`SDS Integration failed: ${error.message}`);
    }
  }

  /**
   * Export training data for AI model training
   */
  exportTrainingData(format = 'json') {
    const trainingDataset = {
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        recordCount: this.trainingData.length,
        description: 'Waste classification training dataset'
      },
      data: this.trainingData
    };

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(trainingDataset, null, 2);
      case 'csv':
        return this.convertToCSV(trainingDataset.data);
      default:
        return trainingDataset;
    }
  }

  // Utility methods

  sanitizeSdsForLogging(sdsData) {
    return {
      hasText: !!sdsData.text,
      textLength: sdsData.text?.length || 0,
      sections: Object.keys(sdsData.sections || {}),
      composition: sdsData.composition || []
    };
  }

  sanitizeDataForTraining(data) {
    // Remove sensitive information but keep classification-relevant data
    return {
      textLength: data.text?.length || 0,
      hasSection9: this.checkSection9Present(data),
      hasComposition: !!(data.composition && data.composition.length > 0),
      keywordIndicators: this.extractKeywordIndicators(data)
    };
  }

  checkSection9Present(sdsData) {
    return !!(sdsData.sections && sdsData.sections['9']);
  }

  extractTemperatureData(sdsData) {
    const text = sdsData.text || '';
    const temps = {
      flashPoint: DetailedClassificationLogic.extractFlashPoint(sdsData),
      boilingPoint: DetailedClassificationLogic.extractTemperature(sdsData, /boiling\s*point/i),
      meltingPoint: DetailedClassificationLogic.extractTemperature(sdsData, /melting\s*point/i)
    };
    return temps;
  }

  identifyUncertaintyFactors(result, sdsData) {
    const uncertainties = [];

    if (result.confidence < 0.7) uncertainties.push('Low confidence in state determination');
    if (!this.checkSection9Present(sdsData)) uncertainties.push('Missing Section 9 physical properties');
    if (!sdsData.composition?.length) uncertainties.push('No composition data available');

    return uncertainties;
  }

  extractComposition(sdsData) {
    return sdsData.composition || [];
  }

  extractTCLPValue(sdsData, cas) {
    // Extract TCLP test values if available in the SDS
    const text = sdsData.text || '';
    const tclpPattern = new RegExp(`tclp.*?${cas}.*?([0-9]+\\.?[0-9]*)\\s*mg/l`, 'i');
    const match = text.match(tclpPattern);
    return match ? parseFloat(match[1]) : null;
  }

  extractMaterialProperties(sdsData) {
    return {
      hasFlashPoint: DetailedClassificationLogic.extractFlashPoint(sdsData) !== null,
      hasPH: DetailedClassificationLogic.extractPH(sdsData) !== null,
      hasComposition: !!(sdsData.composition && sdsData.composition.length > 0),
      sectionCount: Object.keys(sdsData.sections || {}).length
    };
  }

  extractKeywordIndicators(data) {
    const text = (data.text || '').toLowerCase();
    const indicators = {
      ignitable: ['ignitable', 'flammable', 'flash point'].some(term => text.includes(term)),
      corrosive: ['corrosive', 'ph', 'acid', 'caustic'].some(term => text.includes(term)),
      reactive: ['reactive', 'unstable', 'explosive'].some(term => text.includes(term)),
      toxic: ['toxic', 'poison', 'hazardous'].some(term => text.includes(term))
    };
    return indicators;
  }

  async loadDCodeLimits() {
    // Load the D code limits data
    // In production, this would be loaded from the data file
    return []; // Placeholder - would load actual data
  }

  convertToCSV(data) {
    // Convert training data to CSV format
    const headers = ['id', 'timestamp', 'classification', 'materialState', 'rcraWasteCodes', 'confidence'];
    const csv = [headers.join(',')];

    data.forEach(record => {
      const row = [
        record.id,
        record.timestamp,
        record.output.classification,
        record.output.materialState,
        record.output.rcraWasteCodes.join(';'),
        record.output.confidence
      ];
      csv.push(row.join(','));
    });

    return csv.join('\n');
  }
}

export default MasterWasteClassifier;