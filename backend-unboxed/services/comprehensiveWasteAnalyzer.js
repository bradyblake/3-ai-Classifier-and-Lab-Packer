// COMPREHENSIVE WASTE CODE ANALYZER
// Environmental chemist approach to systematically evaluate ALL EPA waste codes
// Integrates with pre-analysis questions to minimize user burden

import PreAnalysisQuestions from './preAnalysisQuestions.js';

class ComprehensiveWasteAnalyzer {
  constructor() {
    this.preAnalysisQuestions = new PreAnalysisQuestions();
    
    // Complete EPA waste code reference data
    this.wasteCodeData = {
      'D-codes': {
        description: 'RCRA Characteristic Hazardous Wastes',
        codes: {
          'D001': { criteria: 'Ignitability', test: 'Flash point <60°C (140°F) for liquids', applicability: 'liquids_only' },
          'D002': { criteria: 'Corrosivity', test: 'pH ≤2.0 or ≥12.5', applicability: 'liquids_only' },
          'D003': { criteria: 'Reactivity', test: 'Unstable, water reactive, cyanide/sulfide bearing', applicability: 'all_states' },
          'D004-D043': { criteria: 'TCLP Toxicity', test: 'Toxicity Characteristic Leaching Procedure', applicability: 'all_states' }
        }
      },
      'F-codes': {
        description: 'Source-Specific Hazardous Wastes',
        categories: {
          'F001-F005': 'Spent solvents',
          'F006-F019': 'Electroplating and metal finishing wastes',
          'F020-F023': 'Dioxin-bearing wastes',
          'F024-F025': 'Chloroform wastes',
          'F026-F028': 'Dioxin-bearing wastes from specific sources',
          'F032-F039': 'Petroleum refinery wastewaters'
        }
      },
      'K-codes': {
        description: 'Industry-Specific Source Wastes',
        industries: {
          'K001-K008': 'Wood preservation',
          'K009-K030': 'Inorganic chemicals manufacturing',
          'K031-K047': 'Pesticide manufacturing',
          'K048-K052': 'Petroleum refining',
          'K061-K062': 'Iron and steel manufacturing',
          'K069-K086': 'Primary aluminum production',
          'K087-K088': 'Secondary lead smelting',
          'K090-K091': 'Veterinary pharmaceutical manufacturing',
          'K093-K098': 'Ink formulation',
          'K099-K178': 'Coking operations and other industries'
        }
      },
      'U-codes': {
        description: 'Commercial Chemical Products - Acutely Hazardous',
        criteria: 'Sole active ingredient in unused commercial chemical product'
      },
      'P-codes': {
        description: 'Commercial Chemical Products - Toxic',
        criteria: 'Sole active ingredient in unused commercial chemical product'
      }
    };

    // Texas form codes (without hardcoded assignments)
    this.texasFormCodes = {
      '102': 'Aqueous solutions',
      '105': 'Acid solutions (pH ≤2)',
      '106': 'Alkaline solutions (pH ≥12.5)',
      '110': 'Used oil and oil-contaminated materials',
      '202': 'Petroleum liquids',
      '203': 'Non-halogenated solvents',
      '204': 'Lab chemicals and reagents',
      '208': 'Aerosol containers'
    };
  }

  /**
   * Generate comprehensive waste analysis with environmental chemist approach
   */
  async analyzeWasteComprehensively(sdsData, userContext) {
    console.log('🧪 Starting comprehensive environmental chemist analysis...');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      productName: sdsData.productName,
      userContext: userContext,
      systematicEvaluation: {},
      finalDetermination: {},
      confidenceFactors: {},
      documentation: []
    };

    // Step 1: Systematic evaluation of all waste code categories
    analysis.systematicEvaluation = await this.evaluateAllWasteCodes(sdsData, userContext);
    
    // Step 2: Environmental chemist reasoning
    analysis.environmentalChemistReasoning = this.applyEnvironmentalChemistLogic(
      sdsData, 
      userContext, 
      analysis.systematicEvaluation
    );
    
    // Step 3: Final determination with confidence levels
    analysis.finalDetermination = this.makeFinalDetermination(
      analysis.systematicEvaluation,
      analysis.environmentalChemistReasoning
    );
    
    // Step 4: Generate comprehensive documentation
    analysis.documentation = this.generateComprehensiveDocumentation(analysis);
    
    console.log('✅ Comprehensive analysis complete');
    return analysis;
  }

  /**
   * Systematically evaluate ALL EPA waste code categories
   */
  async evaluateAllWasteCodes(sdsData, userContext) {
    const evaluation = {};
    
    // D-CODES EVALUATION
    evaluation.dCodes = await this.evaluateDCodes(sdsData);
    
    // F-CODES EVALUATION  
    evaluation.fCodes = await this.evaluateFCodes(sdsData, userContext);
    
    // K-CODES EVALUATION
    evaluation.kCodes = await this.evaluateKCodes(sdsData, userContext);
    
    // U/P-CODES EVALUATION
    evaluation.upCodes = await this.evaluateUPCodes(sdsData, userContext);
    
    // N-CODES EVALUATION (State non-hazardous)
    evaluation.nCodes = await this.evaluateNCodes(sdsData);
    
    return evaluation;
  }

  /**
   * Evaluate D-codes (Characteristic Hazardous Waste)
   */
  async evaluateDCodes(sdsData) {
    const dCodeEvaluation = {
      evaluated: true,
      applicableCodes: [],
      reasoning: []
    };

    // D001 - Ignitability
    const flashPoint = sdsData.flashPoint?.celsius;
    const physicalState = sdsData.physicalState?.toLowerCase();
    
    if (physicalState === 'liquid' && flashPoint !== null && flashPoint < 60) {
      dCodeEvaluation.applicableCodes.push('D001');
      dCodeEvaluation.reasoning.push(`D001 (Ignitability): Flash point ${flashPoint}°C < 60°C for liquid`);
    } else if (physicalState === 'liquid' && flashPoint !== null && flashPoint >= 60) {
      dCodeEvaluation.reasoning.push(`D001 not applicable: Flash point ${flashPoint}°C ≥ 60°C`);
    } else if (physicalState !== 'liquid') {
      dCodeEvaluation.reasoning.push('D001 not applicable: Not a liquid material');
    } else {
      dCodeEvaluation.reasoning.push('D001 evaluation incomplete: Flash point not determined');
    }

    // D002 - Corrosivity (LIQUIDS ONLY)
    const pH = sdsData.pH;
    if (physicalState === 'liquid' && pH !== null) {
      if (pH <= 2.0 || pH >= 12.5) {
        dCodeEvaluation.applicableCodes.push('D002');
        dCodeEvaluation.reasoning.push(`D002 (Corrosivity): pH ${pH} for liquid material`);
      } else {
        dCodeEvaluation.reasoning.push(`D002 not applicable: pH ${pH} within non-corrosive range for liquid`);
      }
    } else if (physicalState === 'solid') {
      dCodeEvaluation.reasoning.push('D002 not applicable: Solid materials cannot be D002 corrosive');
    } else {
      dCodeEvaluation.reasoning.push('D002 evaluation incomplete: pH not determined for liquid material');
    }

    // D003 - Reactivity (evaluate based on composition)
    const composition = sdsData.composition || [];
    let reactivityIndicators = false;
    
    for (const component of composition) {
      const name = (component.name || '').toLowerCase();
      if (name.includes('cyanide') || name.includes('sulfide') || name.includes('peroxide')) {
        reactivityIndicators = true;
        dCodeEvaluation.reasoning.push(`D003 potential: Contains reactive component ${component.name}`);
      }
    }
    
    if (!reactivityIndicators) {
      dCodeEvaluation.reasoning.push('D003 not indicated: No obvious reactive components identified');
    }

    // D004-D043 - TCLP Toxicity (requires lab analysis)
    dCodeEvaluation.reasoning.push('D004-D043 (TCLP Toxicity): Requires laboratory analysis to determine');

    return dCodeEvaluation;
  }

  /**
   * Evaluate F-codes (Source-Specific Hazardous Waste)
   */
  async evaluateFCodes(sdsData, userContext) {
    const fCodeEvaluation = {
      evaluated: true,
      applicableCodes: [],
      reasoning: []
    };

    // Only applicable if waste context indicates spent solvent or process waste
    if (userContext.wasteContext !== 'spent_solvent' && userContext.wasteContext !== 'process_waste') {
      fCodeEvaluation.reasoning.push('F-codes not applicable: Not a spent solvent or process waste');
      return fCodeEvaluation;
    }

    // F001-F005 - Spent Solvents
    if (userContext.wasteContext === 'spent_solvent') {
      const composition = sdsData.composition || [];
      const productName = (sdsData.productName || '').toLowerCase();
      
      // F001 - Halogenated solvents used in degreasing
      const f001Solvents = ['tetrachloroethylene', 'trichloroethylene', 'methylene chloride', 'carbon tetrachloride'];
      if (userContext.solventUse?.includes('degreasing')) {
        for (const solvent of f001Solvents) {
          if (productName.includes(solvent) || composition.some(c => c.name?.toLowerCase().includes(solvent))) {
            fCodeEvaluation.applicableCodes.push('F001');
            fCodeEvaluation.reasoning.push(`F001: Contains ${solvent} used in degreasing operations`);
          }
        }
      }

      // F003 - Non-halogenated solvents
      const f003Solvents = ['acetone', 'ethyl acetate', 'ethyl benzene', 'methyl isobutyl ketone', 'n-butyl alcohol'];
      for (const solvent of f003Solvents) {
        if (productName.includes(solvent) || composition.some(c => c.name?.toLowerCase().includes(solvent))) {
          fCodeEvaluation.applicableCodes.push('F003');
          fCodeEvaluation.reasoning.push(`F003: Contains ${solvent} - non-halogenated spent solvent`);
        }
      }

      // F005 - Non-halogenated solvents  
      const f005Solvents = ['toluene', 'methyl ethyl ketone', 'carbon disulfide', 'benzene'];
      for (const solvent of f005Solvents) {
        if (productName.includes(solvent) || composition.some(c => c.name?.toLowerCase().includes(solvent))) {
          fCodeEvaluation.applicableCodes.push('F005');
          fCodeEvaluation.reasoning.push(`F005: Contains ${solvent} - non-halogenated spent solvent`);
        }
      }

      if (fCodeEvaluation.applicableCodes.length === 0) {
        fCodeEvaluation.reasoning.push('F001-F005: No listed spent solvents identified in composition');
      }
    }

    // F006-F019 - Electroplating wastes
    if (userContext.wasteContext === 'process_waste' && userContext.industrySubcategory === 'metal_finishing') {
      fCodeEvaluation.reasoning.push('F006-F019: Evaluate electroplating/metal finishing waste codes based on specific process');
    }

    return fCodeEvaluation;
  }

  /**
   * Evaluate K-codes (Industry-Specific Source Wastes)
   */
  async evaluateKCodes(sdsData, userContext) {
    const kCodeEvaluation = {
      evaluated: true,
      applicableCodes: [],
      reasoning: []
    };

    // Only applicable to manufacturing facilities
    if (userContext.industry !== 'manufacturing') {
      kCodeEvaluation.reasoning.push('K-codes not applicable: Not generated by manufacturing facility');
      return kCodeEvaluation;
    }

    // Evaluate based on industry subcategory
    const subcategory = userContext.industrySubcategory;
    
    switch (subcategory) {
      case 'wood_preservation':
        kCodeEvaluation.reasoning.push('K001-K008: Evaluate wood preservation waste codes based on specific preservative used');
        break;
      case 'organic_chemicals':
        kCodeEvaluation.reasoning.push('K009-K030: Evaluate organic chemical manufacturing waste codes');
        break;
      case 'pesticides':
        kCodeEvaluation.reasoning.push('K031-K047: Evaluate pesticide manufacturing waste codes');
        break;
      case 'petroleum_refining':
        kCodeEvaluation.reasoning.push('K048-K052: Evaluate petroleum refinery waste codes');
        break;
      case 'iron_and_steel':
        kCodeEvaluation.reasoning.push('K061-K062: Evaluate iron and steel manufacturing waste codes');
        break;
      default:
        kCodeEvaluation.reasoning.push('K-codes: No specific industry match - evaluate based on actual manufacturing process');
    }

    return kCodeEvaluation;
  }

  /**
   * Evaluate U/P-codes (Commercial Chemical Products)
   */
  async evaluateUPCodes(sdsData, userContext) {
    const upCodeEvaluation = {
      evaluated: true,
      applicableCodes: [],
      reasoning: []
    };

    // Only applicable to unused commercial products
    if (userContext.wasteContext !== 'unused_product') {
      upCodeEvaluation.reasoning.push('U/P-codes not applicable: Not an unused commercial chemical product');
      return upCodeEvaluation;
    }

    // Check if sole active ingredient requirement is met
    const composition = sdsData.composition || [];
    if (composition.length > 1) {
      const mainComponent = composition.find(c => parseFloat(c.percentage) > 90);
      if (!mainComponent) {
        upCodeEvaluation.reasoning.push('U/P-codes not applicable: Does not meet sole active ingredient requirement');
        return upCodeEvaluation;
      }
    }

    // Would need to check against EPA's U/P lists (extensive CAS number matching)
    upCodeEvaluation.reasoning.push('U/P-codes: Requires verification against EPA U-list and P-list by CAS number');
    upCodeEvaluation.reasoning.push('Note: P-codes are acutely hazardous, U-codes are toxic');

    return upCodeEvaluation;
  }

  /**
   * Evaluate N-codes (State Non-Hazardous)
   */
  async evaluateNCodes(sdsData) {
    return {
      evaluated: true,
      applicableCodes: [],
      reasoning: ['N-codes: State-specific non-hazardous designations - evaluate based on state regulations']
    };
  }

  /**
   * Apply environmental chemist reasoning logic
   */
  applyEnvironmentalChemistLogic(sdsData, userContext, systematicEvaluation) {
    const reasoning = {
      approach: 'systematic_regulatory_hierarchy',
      criticalFactors: [],
      riskAssessment: {},
      regulatoryPrecedence: []
    };

    // Critical factor analysis
    reasoning.criticalFactors.push('Physical state determines D001/D002 applicability');
    reasoning.criticalFactors.push('Waste generation context determines F/K/U/P code applicability');
    reasoning.criticalFactors.push('Composition determines specific code matches');
    reasoning.criticalFactors.push('Industry sector determines K-code relevance');

    // Risk assessment
    const dCodes = systematicEvaluation.dCodes.applicableCodes;
    const fCodes = systematicEvaluation.fCodes.applicableCodes;
    
    if (dCodes.length > 0 || fCodes.length > 0) {
      reasoning.riskAssessment.level = 'HIGH';
      reasoning.riskAssessment.basis = 'RCRA hazardous waste codes applicable';
    } else {
      reasoning.riskAssessment.level = 'LOW';
      reasoning.riskAssessment.basis = 'No obvious RCRA hazardous characteristics';
    }

    // Regulatory precedence (federal trumps state)
    reasoning.regulatoryPrecedence = [
      '1. RCRA federal codes (D, F, K, U, P) take precedence',
      '2. State codes apply only if not federally regulated',
      '3. DOT shipping requirements independent of waste classification'
    ];

    return reasoning;
  }

  /**
   * Make final determination based on all analysis
   */
  makeFinalDetermination(systematicEvaluation, reasoning) {
    const determination = {
      federalCodes: [],
      texasClassification: null,
      texasFormCode: null,
      finalClassification: 'non-hazardous',
      confidence: 'medium',
      basisForDetermination: []
    };

    // Compile all applicable federal codes
    Object.values(systematicEvaluation).forEach(evaluation => {
      if (evaluation.applicableCodes) {
        determination.federalCodes.push(...evaluation.applicableCodes);
      }
    });

    // Remove duplicates
    determination.federalCodes = [...new Set(determination.federalCodes)];

    // Determine final classification
    if (determination.federalCodes.length > 0) {
      determination.finalClassification = 'hazardous';
      determination.texasClassification = 'H';
      determination.basisForDetermination.push('Federal RCRA codes present');
    } else {
      determination.finalClassification = 'non-hazardous';
      determination.basisForDetermination.push('No federal RCRA codes identified');
    }

    // Note: Texas form codes should be determined by environmental chemist logic, not hardcoded
    determination.basisForDetermination.push('Texas form code requires environmental chemist evaluation of material properties');

    return determination;
  }

  /**
   * Generate comprehensive documentation
   */
  generateComprehensiveDocumentation(analysis) {
    const documentation = [];

    documentation.push({
      section: 'Analysis Summary',
      content: `Comprehensive waste code evaluation completed for ${analysis.productName}`
    });

    documentation.push({
      section: 'User Context',
      content: analysis.userContext.analysisGuidance.join('; ')
    });

    // Document systematic evaluation
    Object.entries(analysis.systematicEvaluation).forEach(([codeType, evaluation]) => {
      documentation.push({
        section: `${codeType.toUpperCase()} Evaluation`,
        content: evaluation.reasoning.join('; ')
      });
    });

    documentation.push({
      section: 'Environmental Chemist Reasoning',
      content: analysis.environmentalChemistReasoning.criticalFactors.join('; ')
    });

    documentation.push({
      section: 'Final Determination',
      content: analysis.finalDetermination.basisForDetermination.join('; ')
    });

    return documentation;
  }

  /**
   * Generate enhanced AI prompt with comprehensive analysis requirements
   */
  buildComprehensiveAnalysisPrompt(sdsText, userContext) {
    const contextSummary = this.preAnalysisQuestions.generateContextSummary(userContext);
    
    return `You are an environmental chemist conducting comprehensive hazardous waste analysis. 

WASTE GENERATION CONTEXT: ${contextSummary}

SDS CONTENT:
${sdsText.substring(0, 6000)}

COMPREHENSIVE ANALYSIS REQUIREMENTS:

SYSTEMATIC EVALUATION OF ALL EPA WASTE CODES:

1. D-CODES (Characteristic Hazardous Waste):
   ${userContext.analysisGuidance.filter(g => g.includes('D-code')).join('\n   ') || '• Evaluate D001 (ignitability), D002 (corrosivity), D003 (reactivity), D004-D043 (toxicity)'}

2. F-CODES (Source-Specific Hazardous Waste):
   ${userContext.analysisGuidance.filter(g => g.includes('F-code') || g.includes('solvent')).join('\n   ') || '• Not applicable - not a spent solvent or process waste'}

3. K-CODES (Industry-Specific Source Waste):
   ${userContext.analysisGuidance.filter(g => g.includes('K-code')).join('\n   ') || '• Not applicable - not from manufacturing facility'}

4. U/P-CODES (Commercial Chemical Products):
   ${userContext.analysisGuidance.filter(g => g.includes('U-code') || g.includes('P-code')).join('\n   ') || '• Not applicable - not an unused commercial product'}

CRITICAL ANALYSIS RULES:
• D002 ONLY applies to LIQUIDS with pH ≤2 or ≥12.5 - NEVER to solids
• D001 requires flash point <60°C for liquids only
• F-codes require spent solvent or process waste context
• K-codes require specific manufacturing industry
• U/P-codes require sole active ingredient in unused product

ENVIRONMENTAL CHEMIST APPROACH:
• Document systematic consideration of each code category
• Provide clear reasoning for applicable/non-applicable determinations  
• Show confidence in analysis completeness
• No hardcoded Texas form assignments - determine by material properties

Return comprehensive JSON analysis with systematic evaluation of ALL code categories.`;
  }
}

export default ComprehensiveWasteAnalyzer;