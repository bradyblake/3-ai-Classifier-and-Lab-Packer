/**
 * ComprehensiveWasteClassifier.js
 * Complete implementation of F and K codes evaluation logic
 * with detailed yes/no decision trees
 */

import fs from 'fs';
import path from 'path';

export class ComprehensiveWasteClassifier {

  constructor() {
    this.fCodes = [];
    this.kCodes = [];
    this.loadData();
  }

  async loadData() {
    try {
      const dataDir = path.resolve('data/regulatory');

      this.fCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'f_code_wastes.json'), 'utf8'));
      this.kCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'k_code_wastes.json'), 'utf8'));
    } catch (error) {
      console.error('Failed to load F/K code data:', error);
    }
  }

  /**
   * Evaluate F codes (Non-specific source wastes)
   * F codes depend heavily on waste source and usage history
   */
  evaluateFCodes(sdsData, wasteSource, isSpent = false) {
    const evaluation = {
      codes: [],
      reasoning: [],
      steps: []
    };

    for (const fCode of this.fCodes) {
      const codeEvaluation = this.evaluateSingleFCode(fCode, sdsData, wasteSource, isSpent);

      if (codeEvaluation.applies) {
        evaluation.codes.push({
          code: fCode.code,
          description: fCode.description,
          reason: codeEvaluation.reason
        });
      }

      evaluation.steps.push(codeEvaluation);
      evaluation.reasoning.push(codeEvaluation.summaryReason);
    }

    return evaluation;
  }

  /**
   * Evaluate individual F code
   */
  evaluateSingleFCode(fCode, sdsData, wasteSource, isSpent) {
    const evaluation = {
      code: fCode.code,
      applies: false,
      reason: '',
      summaryReason: '',
      steps: [],
      confidence: 0
    };

    // Step 1: Check if waste is spent/used (critical for most F codes)
    const isSpentRequired = fCode.applies_to.includes('spent');
    evaluation.steps.push({
      question: `Is this a spent/used material? (${fCode.code} applies to: ${fCode.applies_to})`,
      answer: isSpent,
      required: isSpentRequired,
      reasoning: isSpentRequired ?
        (isSpent ? 'Material is spent/used as required' : 'Material must be spent/used for this F code') :
        'F code does not require spent/used status'
    });

    if (isSpentRequired && !isSpent) {
      evaluation.summaryReason = `${fCode.code}: Not applicable - material is not spent/used`;
      return evaluation;
    }

    // Step 2: Check for chemical constituents
    const chemicalMatches = this.findChemicalMatches(sdsData, fCode.chemicals);
    evaluation.steps.push({
      question: `Does material contain F code chemicals?`,
      answer: chemicalMatches.found,
      data: `Looking for: ${fCode.chemicals.join(', ')}`,
      matches: chemicalMatches.matches,
      reasoning: chemicalMatches.found ?
        `Found: ${chemicalMatches.matches.join(', ')}` :
        'No matching chemicals found'
    });

    // Step 3: Check source/process match
    const sourceMatch = this.checkSourceMatch(wasteSource, fCode.source);
    evaluation.steps.push({
      question: `Does waste source match F code source?`,
      answer: sourceMatch.matches,
      data: `F code source: ${fCode.source}, Waste source: ${wasteSource}`,
      reasoning: sourceMatch.reasoning
    });

    // Step 4: Special F code specific logic
    const specialCheck = this.applyFCodeSpecificLogic(fCode, sdsData, wasteSource, isSpent);
    if (specialCheck.hasSpecialRequirements) {
      evaluation.steps.push(...specialCheck.steps);
    }

    // Final determination
    if (chemicalMatches.found && (sourceMatch.matches || specialCheck.sourceOverride)) {
      evaluation.applies = true;
      evaluation.reason = `${fCode.code}: ${chemicalMatches.matches.join(', ')} found in ${fCode.applies_to}`;
      evaluation.confidence = chemicalMatches.confidence * (sourceMatch.matches ? 1.0 : 0.7);
      evaluation.summaryReason = `${fCode.code}: Applies - ${evaluation.reason}`;
    } else {
      const missingRequirements = [];
      if (!chemicalMatches.found) missingRequirements.push('chemicals');
      if (!sourceMatch.matches && !specialCheck.sourceOverride) missingRequirements.push('source');

      evaluation.summaryReason = `${fCode.code}: Not applicable - missing: ${missingRequirements.join(', ')}`;
    }

    return evaluation;
  }

  /**
   * Apply F code specific logic for special cases
   */
  applyFCodeSpecificLogic(fCode, sdsData, wasteSource, isSpent) {
    const result = {
      hasSpecialRequirements: true,
      steps: [],
      sourceOverride: false
    };

    switch (fCode.code) {
      case 'F001':
      case 'F002':
        // Spent halogenated solvents from degreasing
        result.steps.push({
          question: 'Was material used in degreasing operations?',
          answer: this.checkDegreasing(wasteSource, sdsData),
          reasoning: 'F001/F002 specifically applies to degreasing operations'
        });
        break;

      case 'F003':
      case 'F004':
      case 'F005':
        // Spent non-halogenated solvents
        result.steps.push({
          question: 'Was material used as a solvent?',
          answer: this.checkSolventUse(wasteSource, sdsData),
          reasoning: 'F003-F005 apply to spent solvents from various operations'
        });
        break;

      case 'F020':
      case 'F021':
      case 'F022':
      case 'F023':
        // Manufacturing wastes from specific chemical production
        result.steps.push({
          question: 'Is this from manufacturing/formulating operations?',
          answer: this.checkManufacturingSource(wasteSource),
          reasoning: 'F020-F023 apply only to manufacturing/formulating wastes'
        });
        break;

      case 'F027':
        // Discarded unused formulations
        result.steps.push({
          question: 'Is this an unused commercial formulation?',
          answer: !isSpent,  // F027 specifically for unused materials
          reasoning: 'F027 applies to discarded unused formulations'
        });
        break;

      case 'F037':
      case 'F038':
        // Petroleum refinery sludges
        result.steps.push({
          question: 'Is this from petroleum refinery operations?',
          answer: this.checkPetroleumRefinery(wasteSource),
          reasoning: 'F037/F038 specific to petroleum refinery separation sludges'
        });
        break;

      default:
        result.hasSpecialRequirements = false;
        break;
    }

    return result;
  }

  /**
   * Evaluate K codes (Source-specific wastes)
   * K codes are highly specific to industrial processes and sources
   */
  evaluateKCodes(sdsData, industryType, processDescription = '') {
    const evaluation = {
      codes: [],
      reasoning: [],
      steps: []
    };

    for (const kCode of this.kCodes) {
      const codeEvaluation = this.evaluateSingleKCode(kCode, sdsData, industryType, processDescription);

      if (codeEvaluation.applies) {
        evaluation.codes.push({
          code: kCode.code,
          description: kCode.description,
          reason: codeEvaluation.reason
        });
      }

      evaluation.steps.push(codeEvaluation);
      evaluation.reasoning.push(codeEvaluation.summaryReason);
    }

    return evaluation;
  }

  /**
   * Evaluate individual K code
   */
  evaluateSingleKCode(kCode, sdsData, industryType, processDescription) {
    const evaluation = {
      code: kCode.code,
      applies: false,
      reason: '',
      summaryReason: '',
      steps: [],
      confidence: 0
    };

    // Step 1: Check industry match (critical for K codes)
    const industryMatch = this.checkIndustryMatch(industryType, kCode.industry);
    evaluation.steps.push({
      question: `Does industry type match K code industry?`,
      answer: industryMatch.matches,
      data: `K code industry: ${kCode.industry}, Declared industry: ${industryType}`,
      reasoning: industryMatch.reasoning
    });

    if (!industryMatch.matches) {
      evaluation.summaryReason = `${kCode.code}: Not applicable - wrong industry type`;
      return evaluation;
    }

    // Step 2: Check process description match
    const processMatch = this.checkProcessMatch(processDescription, kCode.source);
    evaluation.steps.push({
      question: `Does process description match K code source?`,
      answer: processMatch.matches,
      data: `K code source: ${kCode.source}, Process: ${processDescription}`,
      reasoning: processMatch.reasoning
    });

    // Step 3: Check for chemical indicators
    const chemicalIndicators = this.findChemicalMatches(sdsData, kCode.chemicals);
    evaluation.steps.push({
      question: `Does material contain K code indicator chemicals?`,
      answer: chemicalIndicators.found,
      data: `Looking for: ${kCode.chemicals.join(', ')}`,
      matches: chemicalIndicators.matches,
      reasoning: chemicalIndicators.found ?
        `Found: ${chemicalIndicators.matches.join(', ')}` :
        'No indicator chemicals found'
    });

    // Step 4: Apply K code specific requirements
    const specificCheck = this.applyKCodeSpecificLogic(kCode, sdsData, processDescription);
    if (specificCheck.hasSpecificRequirements) {
      evaluation.steps.push(...specificCheck.steps);
    }

    // Final determination for K codes requires industry match + process match
    if (industryMatch.matches && processMatch.matches) {
      evaluation.applies = true;
      evaluation.reason = `${kCode.code}: ${kCode.industry} waste from ${kCode.source}`;
      evaluation.confidence = 0.9;
      evaluation.summaryReason = `${kCode.code}: Applies - industry and process match`;
    } else {
      const missing = [];
      if (!industryMatch.matches) missing.push('industry');
      if (!processMatch.matches) missing.push('process');

      evaluation.summaryReason = `${kCode.code}: Not applicable - missing: ${missing.join(', ')}`;
    }

    return evaluation;
  }

  /**
   * Apply K code specific logic
   */
  applyKCodeSpecificLogic(kCode, sdsData, processDescription) {
    const result = {
      hasSpecificRequirements: true,
      steps: []
    };

    // Industry-specific checks
    switch (kCode.industry) {
      case 'wood_preserving':
        result.steps.push({
          question: 'Is this from wood preserving treatment operations?',
          answer: this.checkWoodPreserving(processDescription),
          reasoning: 'Must be from wood preserving operations'
        });
        break;

      case 'inorganic_pigments':
        result.steps.push({
          question: 'Is this from inorganic pigment manufacturing?',
          answer: this.checkPigmentManufacturing(processDescription),
          reasoning: 'Must be from pigment manufacturing operations'
        });
        break;

      case 'organic_chemicals':
        result.steps.push({
          question: 'Is this from organic chemical production?',
          answer: this.checkOrganicChemicalProduction(processDescription),
          reasoning: 'Must be from organic chemical manufacturing'
        });
        break;

      case 'iron_steel':
        result.steps.push({
          question: 'Is this from iron and steel production?',
          answer: this.checkIronSteelProduction(processDescription),
          reasoning: 'Must be from iron and steel manufacturing operations'
        });
        break;

      case 'aluminum_reduction':
        result.steps.push({
          question: 'Is this from primary aluminum reduction?',
          answer: this.checkAluminumReduction(processDescription),
          reasoning: 'Must be from primary aluminum smelting operations'
        });
        break;

      default:
        result.hasSpecificRequirements = false;
        break;
    }

    return result;
  }

  // Utility methods for chemical and source matching

  /**
   * Find chemical matches in SDS data
   */
  findChemicalMatches(sdsData, targetChemicals) {
    const composition = this.extractComposition(sdsData);
    const matches = [];
    let totalConfidence = 0;

    for (const target of targetChemicals) {
      const found = composition.some(component => {
        const nameMatch = component.name.toLowerCase().includes(target.toLowerCase());
        const synonymMatch = this.checkChemicalSynonyms(component.name, target);
        return nameMatch || synonymMatch;
      });

      if (found) {
        matches.push(target);
        totalConfidence += 0.8;
      }
    }

    return {
      found: matches.length > 0,
      matches,
      confidence: Math.min(totalConfidence / targetChemicals.length, 1.0)
    };
  }

  /**
   * Check if source matches F code requirements
   */
  checkSourceMatch(wasteSource, fCodeSource) {
    if (!wasteSource) {
      return { matches: false, reasoning: 'No waste source provided' };
    }

    const sourceKeywords = fCodeSource.toLowerCase().split(' ');
    const wasteSourceLower = wasteSource.toLowerCase();

    const matchCount = sourceKeywords.filter(keyword =>
      wasteSourceLower.includes(keyword)
    ).length;

    const matchRatio = matchCount / sourceKeywords.length;

    return {
      matches: matchRatio >= 0.5,
      reasoning: matchRatio >= 0.5 ?
        `Source match: ${Math.round(matchRatio * 100)}% keywords matched` :
        `Insufficient source match: only ${Math.round(matchRatio * 100)}% keywords matched`
    };
  }

  /**
   * Check industry type match for K codes
   */
  checkIndustryMatch(declaredIndustry, kCodeIndustry) {
    if (!declaredIndustry) {
      return { matches: false, reasoning: 'No industry type declared' };
    }

    const industryMap = {
      'wood_preserving': ['wood preserving', 'lumber treatment', 'timber treatment'],
      'inorganic_pigments': ['pigment', 'paint', 'colorant', 'dye'],
      'organic_chemicals': ['chemical manufacturing', 'petrochemical', 'organic synthesis'],
      'iron_steel': ['steel', 'iron', 'metallurgy', 'metal processing'],
      'aluminum_reduction': ['aluminum', 'aluminium', 'smelting'],
      'ferroalloys': ['ferroalloy', 'ferro-alloy', 'alloy production'],
      'pharmaceuticals': ['pharmaceutical', 'drug', 'medication'],
      'pesticides': ['pesticide', 'herbicide', 'insecticide', 'fungicide']
    };

    const keywords = industryMap[kCodeIndustry] || [kCodeIndustry];
    const declaredLower = declaredIndustry.toLowerCase();

    const matches = keywords.some(keyword => declaredLower.includes(keyword));

    return {
      matches,
      reasoning: matches ?
        'Industry type matches K code requirements' :
        `Industry type does not match - need: ${keywords.join(' or ')}`
    };
  }

  /**
   * Check process description match
   */
  checkProcessMatch(processDescription, kCodeSource) {
    if (!processDescription) {
      return { matches: false, reasoning: 'No process description provided' };
    }

    const processLower = processDescription.toLowerCase();
    const sourceLower = kCodeSource.toLowerCase();

    // Extract key process words
    const sourceWords = sourceLower.split(/[\s\-\/]+/);
    const matchingWords = sourceWords.filter(word =>
      word.length > 3 && processLower.includes(word)
    );

    const matchRatio = matchingWords.length / sourceWords.length;

    return {
      matches: matchRatio >= 0.3,
      reasoning: matchRatio >= 0.3 ?
        `Process matches: ${matchingWords.join(', ')}` :
        'Process description does not match K code source'
    };
  }

  // Specific checking methods

  checkDegreasing(wasteSource, sdsData) {
    const indicators = ['degreasing', 'degreaser', 'cleaning', 'solvent cleaning'];
    return this.checkIndicators(wasteSource + ' ' + (sdsData.text || ''), indicators);
  }

  checkSolventUse(wasteSource, sdsData) {
    const indicators = ['solvent', 'cleaning', 'extraction', 'dissolving'];
    return this.checkIndicators(wasteSource + ' ' + (sdsData.text || ''), indicators);
  }

  checkManufacturingSource(wasteSource) {
    const indicators = ['manufacturing', 'production', 'formulating', 'synthesis'];
    return this.checkIndicators(wasteSource, indicators);
  }

  checkPetroleumRefinery(wasteSource) {
    const indicators = ['petroleum', 'refinery', 'crude oil', 'petrochemical'];
    return this.checkIndicators(wasteSource, indicators);
  }

  checkWoodPreserving(processDescription) {
    const indicators = ['wood preserving', 'lumber treatment', 'creosote', 'pentachlorophenol'];
    return this.checkIndicators(processDescription, indicators);
  }

  checkPigmentManufacturing(processDescription) {
    const indicators = ['pigment', 'colorant', 'paint manufacturing', 'chrome yellow'];
    return this.checkIndicators(processDescription, indicators);
  }

  checkOrganicChemicalProduction(processDescription) {
    const indicators = ['chemical production', 'synthesis', 'distillation', 'organic manufacturing'];
    return this.checkIndicators(processDescription, indicators);
  }

  checkIronSteelProduction(processDescription) {
    const indicators = ['steel production', 'iron making', 'coking', 'blast furnace'];
    return this.checkIndicators(processDescription, indicators);
  }

  checkAluminumReduction(processDescription) {
    const indicators = ['aluminum reduction', 'aluminum smelting', 'electrolysis', 'potliner'];
    return this.checkIndicators(processDescription, indicators);
  }

  checkIndicators(text, indicators) {
    if (!text) return false;
    const textLower = text.toLowerCase();
    return indicators.some(indicator => textLower.includes(indicator.toLowerCase()));
  }

  // Helper methods

  extractComposition(sdsData) {
    // Implementation to extract chemical composition
    // This would parse Section 3 of the SDS
    return sdsData.composition || [];
  }

  checkChemicalSynonyms(chemicalName, targetName) {
    // Implementation to check for chemical synonyms and CAS matches
    // Would use a chemical database or synonym dictionary
    return false; // Placeholder
  }
}

export default ComprehensiveWasteClassifier;