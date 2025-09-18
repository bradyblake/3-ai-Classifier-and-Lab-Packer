// PRE-ANALYSIS QUESTION SYSTEM
// Streamlined questionnaire to gather minimal necessary information for comprehensive waste analysis
// Designed to minimize user burden while ensuring accurate EPA code determination

class PreAnalysisQuestions {
  constructor() {
    // Industry categories that affect K-code applicability
    this.industryCategories = {
      'manufacturing': {
        subcategories: [
          'Wood preservation',
          'Organic chemicals',
          'Inorganic chemicals', 
          'Pesticides',
          'Explosives',
          'Petroleum refining',
          'Iron and steel',
          'Primary aluminum',
          'Secondary lead',
          'Veterinary pharmaceuticals',
          'Ink formulation',
          'Coking'
        ]
      },
      'laboratory': {
        subcategories: [
          'Research & Development',
          'Quality Control',
          'Academic/Educational',
          'Medical/Clinical'
        ]
      },
      'service': {
        subcategories: [
          'Auto repair',
          'Dry cleaning',
          'Photo processing',
          'Printing',
          'Metal finishing/Plating'
        ]
      },
      'other': {
        subcategories: []
      }
    };

    // Process types that affect F-code determination
    this.processCodes = {
      'solvent_use': {
        question: 'Is this a spent solvent from degreasing, cleaning, or other use?',
        codes: ['F001', 'F002', 'F003', 'F004', 'F005']
      },
      'electroplating': {
        question: 'Is this from electroplating operations?',
        codes: ['F006', 'F007', 'F008', 'F009']
      },
      'metal_treatment': {
        question: 'Is this from metal heat treating or quenching?',
        codes: ['F010', 'F011', 'F012']
      },
      'unused_product': {
        question: 'Is this an unused commercial chemical product being discarded?',
        codes: ['U-codes', 'P-codes']
      }
    };
  }

  /**
   * Generate streamlined questions based on initial SDS data
   * Returns minimal set of questions needed for accurate classification
   */
  generateQuestions(sdsData) {
    const questions = [];
    
    // Question 1: Industry/Generator Type (Required for K-codes)
    questions.push({
      id: 'industry',
      type: 'select',
      question: 'What type of facility is generating this waste?',
      required: true,
      options: [
        { value: 'manufacturing', label: 'Manufacturing Facility' },
        { value: 'laboratory', label: 'Laboratory/Research' },
        { value: 'service', label: 'Service Industry' },
        { value: 'other', label: 'Other/Unknown' }
      ],
      followUp: 'industry_subcategory',
      helpText: 'This helps determine if industry-specific K-codes apply'
    });

    // Question 2: Waste Generation Context (Critical for F/U/P determination)
    questions.push({
      id: 'waste_context',
      type: 'select', 
      question: 'How was this material used before becoming waste?',
      required: true,
      options: [
        { value: 'spent_solvent', label: 'Used as a solvent (cleaning, degreasing, extraction)' },
        { value: 'process_waste', label: 'Byproduct from manufacturing/processing' },
        { value: 'unused_product', label: 'Unused/off-spec commercial product' },
        { value: 'lab_chemical', label: 'Laboratory chemical or reagent' },
        { value: 'maintenance', label: 'Maintenance material (oil, coolant, etc.)' },
        { value: 'unknown', label: 'Unknown/Not sure' }
      ],
      helpText: 'This determines F-codes (spent solvents) and U/P-codes (unused products)'
    });

    // Question 3: Concentration/Purity (Only if needed based on composition)
    if (this.needsConcentrationInfo(sdsData)) {
      questions.push({
        id: 'concentration',
        type: 'select',
        question: 'What is the approximate concentration of the hazardous constituents?',
        required: false,
        options: [
          { value: 'pure', label: 'Pure/Technical grade (>90%)' },
          { value: 'concentrated', label: 'Concentrated (10-90%)' },
          { value: 'dilute', label: 'Dilute (<10%)' },
          { value: 'unknown', label: 'Unknown' }
        ],
        helpText: 'Affects applicability of U/P-codes which require sole active ingredient'
      });
    }

    return questions;
  }

  /**
   * Generate follow-up questions based on initial answers
   */
  generateFollowUpQuestions(initialAnswers) {
    const followUps = [];

    // Industry subcategory (only if manufacturing selected)
    if (initialAnswers.industry === 'manufacturing') {
      followUps.push({
        id: 'industry_subcategory',
        type: 'select',
        question: 'What specific type of manufacturing?',
        required: false,
        options: this.industryCategories.manufacturing.map(sub => ({
          value: sub.toLowerCase().replace(/\s+/g, '_'),
          label: sub
        })),
        helpText: 'Specific K-codes apply to certain manufacturing sectors'
      });
    }

    // Solvent specifics (only if spent solvent selected)
    if (initialAnswers.waste_context === 'spent_solvent') {
      followUps.push({
        id: 'solvent_use',
        type: 'multiselect',
        question: 'What was the solvent used for? (select all that apply)',
        required: false,
        options: [
          { value: 'degreasing', label: 'Degreasing metal parts' },
          { value: 'cleaning', label: 'Equipment/parts cleaning' },
          { value: 'extraction', label: 'Chemical extraction' },
          { value: 'reaction_medium', label: 'Reaction medium' },
          { value: 'other', label: 'Other use' }
        ],
        helpText: 'Different F-codes apply based on solvent use'
      });
    }

    return followUps;
  }

  /**
   * Process answers to generate context for AI analysis
   */
  processAnswersForContext(answers, sdsData) {
    const context = {
      industry: answers.industry || 'unknown',
      industrySubcategory: answers.industry_subcategory || null,
      wasteContext: answers.waste_context || 'unknown',
      concentration: answers.concentration || 'unknown',
      solventUse: answers.solvent_use || [],
      
      // Derived flags for AI prompt
      checkKCodes: answers.industry === 'manufacturing',
      checkFCodes: answers.waste_context === 'spent_solvent',
      checkUPCodes: answers.waste_context === 'unused_product',
      
      // Generate specific guidance for AI
      analysisGuidance: this.generateAnalysisGuidance(answers)
    };

    return context;
  }

  /**
   * Generate specific analysis guidance based on answers
   */
  generateAnalysisGuidance(answers) {
    const guidance = [];

    // K-code guidance
    if (answers.industry === 'manufacturing' && answers.industry_subcategory) {
      const kCodeMap = {
        'wood_preservation': 'K001-K005',
        'organic_chemicals': 'K009-K051', 
        'pesticides': 'K031-K043',
        'petroleum_refining': 'K048-K052',
        'iron_and_steel': 'K061-K062'
      };
      
      const relevantKCodes = kCodeMap[answers.industry_subcategory];
      if (relevantKCodes) {
        guidance.push(`Focus on ${relevantKCodes} K-codes for ${answers.industry_subcategory} industry`);
      }
    }

    // F-code guidance
    if (answers.waste_context === 'spent_solvent') {
      if (answers.solvent_use?.includes('degreasing')) {
        guidance.push('Check F001 (halogenated solvents used in degreasing)');
      }
      guidance.push('Evaluate F002-F005 based on specific solvent constituents');
    }

    // U/P-code guidance  
    if (answers.waste_context === 'unused_product') {
      guidance.push('Check U-codes and P-codes for commercial chemical products');
      guidance.push('Verify sole active ingredient requirement for U/P listing');
    }

    return guidance;
  }

  /**
   * Determine if concentration info is needed based on SDS
   */
  needsConcentrationInfo(sdsData) {
    // Check if composition suggests mixtures or formulations
    if (sdsData.composition && sdsData.composition.length > 1) {
      return true;
    }
    
    // Check for keywords suggesting formulations
    const productName = (sdsData.productName || '').toLowerCase();
    const formulationKeywords = ['solution', 'mixture', 'blend', 'formulation', '%'];
    
    return formulationKeywords.some(keyword => productName.includes(keyword));
  }

  /**
   * Validate that minimum required questions are answered
   */
  validateAnswers(answers) {
    const required = ['industry', 'waste_context'];
    const missing = required.filter(field => !answers[field] || answers[field] === 'unknown');
    
    if (missing.length > 0) {
      return {
        valid: false,
        missing: missing,
        message: `Please answer the following required questions: ${missing.join(', ')}`
      };
    }
    
    return { valid: true };
  }

  /**
   * Generate a summary of the context for display
   */
  generateContextSummary(context) {
    const summary = [];
    
    summary.push(`Industry: ${context.industry}`);
    if (context.industrySubcategory) {
      summary.push(`Sector: ${context.industrySubcategory}`);
    }
    summary.push(`Waste Type: ${context.wasteContext.replace(/_/g, ' ')}`);
    
    if (context.solventUse.length > 0) {
      summary.push(`Solvent Use: ${context.solventUse.join(', ')}`);
    }
    
    return summary.join(' | ');
  }
}

export default PreAnalysisQuestions;