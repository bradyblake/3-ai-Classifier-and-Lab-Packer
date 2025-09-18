import ConstituentFirstClassifier from '../engines/ConstituentFirstClassifier.js';
import BulletproofSDSExtractor from '../engines/BulletproofSDSExtractor.js';
import PhysicalStateDetector from '../engines/PhysicalStateDetector.js';
import { comprehensiveChemicalDatabase } from '../data/chemicals/simple_chemical_database.js';

class EnhancedSDSAnalyzer {
  constructor() {
    this.classifier = new ConstituentFirstClassifier();
    this.extractor = new BulletproofSDSExtractor();
    this.physicalStateDetector = new PhysicalStateDetector();
    this.chemicalDatabase = comprehensiveChemicalDatabase;
    
    this.analysisHistory = [];
    this.successRate = 0;
    this.totalAnalyses = 0;
    this.passedAnalyses = 0;
  }

  async analyzeSDS(sdsData) {
    const startTime = Date.now();
    
    try {
      let extractedData;
      
      if (typeof sdsData === 'string') {
        extractedData = await this.extractor.extract(sdsData);
      } else if (sdsData.text) {
        extractedData = await this.extractor.extract(sdsData.text);
      } else if (sdsData.extractedData) {
        extractedData = sdsData.extractedData;
      } else {
        extractedData = sdsData;
      }

      const composition = this.normalizeComposition(extractedData.composition || extractedData.constituents || [], extractedData.flashPoint);
      
      console.log('🔬 EnhancedSDSAnalyzer - Normalized composition for classification:', composition);
      
      const classificationResult = this.classifier.classify(composition);
      
      console.log('📊 Classification result:', {
        wasteCodes: classificationResult.wasteCodes,
        reasoning: classificationResult.reasoning,
        confidence: classificationResult.confidence
      });
      
      const physicalStateResult = this.physicalStateDetector.detect(
        extractedData.physicalState || extractedData.form || 'unknown'
      );
      
      // Extract just the state string for display
      const physicalState = physicalStateResult.state || 'unknown';
      
      const enrichedData = await this.enrichWithDatabase(composition);
      
      const dotClassification = this.generateDOTClassification(
        classificationResult,
        physicalStateResult,
        extractedData
      );
      
      // Check for F-code applicability
      const fCodeResult = this.checkFCodeApplicability(enrichedData, extractedData);
      
      // Combine waste codes with F-codes
      const allWasteCodes = [...classificationResult.wasteCodes];
      if (fCodeResult.applicableCodes.length > 0) {
        allWasteCodes.push(...fCodeResult.applicableCodes);
      }

      const analysis = {
        timestamp: new Date().toISOString(),
        productName: extractedData.productName || 'Unknown Product',
        manufacturer: extractedData.manufacturer || 'Unknown',
        composition: enrichedData,
        wasteCodes: [...new Set(allWasteCodes)], // Remove duplicates
        federalCodes: allWasteCodes.filter(code => /^[DPUF]\d{3}/.test(code)),
        fCodes: fCodeResult,
        stateCodes: this.generateStateCodes(classificationResult, physicalStateResult),
        stateFormCode: this.generateStateFormCode(classificationResult, physicalStateResult, enrichedData),
        physicalState,
        dotClassification,
        reasoning: classificationResult.reasoning,
        confidence: classificationResult.confidence,
        hazardClass: this.determineHazardClass(allWasteCodes),
        packingGroup: this.determinePackingGroup(classificationResult, extractedData),
        segregationGroups: this.determineSegregationGroups(enrichedData),
        disposalMethods: this.recommendDisposalMethods(allWasteCodes),
        containerRecommendations: this.recommendContainers(physicalStateResult, enrichedData),
        performance: {
          analysisTime: Date.now() - startTime,
          extractionAccuracy: this.calculateExtractionAccuracy(extractedData),
          classificationConfidence: classificationResult.confidence
        }
      };
      
      this.updateMetrics(analysis);
      this.analysisHistory.push(analysis);
      
      return {
        success: true,
        analysis,
        passRate: this.successRate
      };
      
    } catch (error) {
      console.error('SDS Analysis Error:', error);
      this.totalAnalyses++;
      
      return {
        success: false,
        error: error.message,
        passRate: this.successRate
      };
    }
  }

  normalizeComposition(composition, flashPoint = null) {
    if (!Array.isArray(composition)) return [];
    
    return composition.map(component => {
      const normalized = {
        name: component.name || component.chemical || 'Unknown',
        cas: this.normalizeCAS(component.cas || component.casNumber || ''),
        percentage: this.normalizePercentage(component.percentage || component.concentration || ''),
        hazards: component.hazards || []
      };
      
      // Add flash point if available (for ignitability classification)
      if (flashPoint !== null) {
        normalized.flashPoint = flashPoint;
      }
      
      if (normalized.cas && this.chemicalDatabase[normalized.cas]) {
        const dbInfo = this.chemicalDatabase[normalized.cas];
        normalized.synonyms = dbInfo.synonyms || [];
        normalized.hazardStatements = dbInfo.hazardStatements || [];
        normalized.precautionaryStatements = dbInfo.precautionaryStatements || [];
      }
      
      return normalized;
    });
  }

  normalizeCAS(cas) {
    if (!cas) return '';
    return String(cas).trim().replace(/\s+/g, '');
  }

  normalizePercentage(percentage) {
    if (!percentage) return '0';
    
    const cleaned = String(percentage).replace(/[^\d.-]/g, '');
    const value = parseFloat(cleaned);
    
    if (isNaN(value)) return '0';
    if (value > 100) return '100';
    if (value < 0) return '0';
    
    return value.toFixed(2);
  }

  async enrichWithDatabase(composition) {
    return composition.map(component => {
      const cas = component.cas;
      if (!cas || !this.chemicalDatabase[cas]) return component;
      
      const dbData = this.chemicalDatabase[cas];
      return {
        ...component,
        chemicalFamily: dbData.family,
        reactivityGroup: dbData.reactivityGroup,
        incompatibilities: dbData.incompatibilities || [],
        storageClass: dbData.storageClass,
        disposalNotes: dbData.disposalNotes
      };
    });
  }

  generateStateCodes(classificationResult, physicalState) {
    const stateCodes = [];
    
    if (classificationResult.wasteCodes.includes('D001')) {
      stateCodes.push('CA-791', 'TX-H001');
    }
    
    if (classificationResult.wasteCodes.some(code => code.startsWith('P'))) {
      stateCodes.push('CA-334', 'TX-H002');
    }
    
    if (physicalState.isLiquid) {
      stateCodes.push('CA-132');
    }
    
    return [...new Set(stateCodes)];
  }

  generateStateFormCode(classificationResult, physicalState, composition) {
    // Texas Waste Classification Form Code Generator
    let formCode = '';
    
    // Determine base classification
    if (classificationResult.wasteCodes.some(code => code.startsWith('P'))) {
      formCode = 'P'; // Acutely Hazardous
    } else if (classificationResult.wasteCodes.some(code => code.startsWith('U'))) {
      formCode = 'U'; // Listed Hazardous
    } else if (classificationResult.wasteCodes.some(code => code.startsWith('D'))) {
      // Characteristic waste
      if (classificationResult.wasteCodes.includes('D001')) {
        formCode = 'IG'; // Ignitable
      } else if (classificationResult.wasteCodes.includes('D002')) {
        formCode = 'CO'; // Corrosive
      } else if (classificationResult.wasteCodes.includes('D003')) {
        formCode = 'RE'; // Reactive
      } else if (classificationResult.wasteCodes.some(code => /^D00[4-9]|^D0[1-4]\d/.test(code))) {
        formCode = 'TO'; // Toxic
      }
    }
    
    // Add physical state modifier
    if (physicalState.isLiquid || physicalState.state === 'liquid') {
      formCode += 'L';
    } else if (physicalState.isSolid || physicalState.state === 'solid') {
      formCode += 'S';
    } else if (physicalState.isGas || physicalState.state === 'gas') {
      formCode += 'G';
    } else {
      formCode += 'X'; // Unknown state
    }
    
    // Add composition modifier for organic/inorganic
    const hasOrganicComponents = composition.some(c => this.isOrganic(c));
    const hasInorganicComponents = composition.some(c => this.isInorganic(c));
    
    if (hasOrganicComponents && hasInorganicComponents) {
      formCode += 'M'; // Mixed
    } else if (hasOrganicComponents) {
      formCode += 'O'; // Organic
    } else if (hasInorganicComponents) {
      formCode += 'I'; // Inorganic
    } else {
      formCode += 'N'; // Not determined
    }
    
    // If no classification found, default to non-hazardous
    if (!formCode) {
      formCode = 'NH' + (physicalState.isLiquid ? 'L' : physicalState.isSolid ? 'S' : 'X') + 'N';
    }
    
    console.log('🏷️ Generated State Form Code:', formCode, 'for waste codes:', classificationResult.wasteCodes);
    return formCode;
  }

  generateDOTClassification(classificationResult, physicalState, extractedData) {
    let hazardClass = '';
    let unNumber = '';
    let properShippingName = '';
    let packingGroup = '';
    
    if (classificationResult.wasteCodes.includes('D001')) {
      hazardClass = '3';
      unNumber = 'UN1993';
      properShippingName = 'FLAMMABLE LIQUID, N.O.S.';
      packingGroup = this.determineFlammabilityPG(extractedData.flashPoint);
    } else if (classificationResult.wasteCodes.includes('D002')) {
      hazardClass = '8';
      unNumber = physicalState.isLiquid ? 'UN1760' : 'UN1759';
      properShippingName = physicalState.isLiquid ? 'CORROSIVE LIQUID, N.O.S.' : 'CORROSIVE SOLID, N.O.S.';
      packingGroup = this.determineCorrosivityPG(extractedData.pH);
    } else if (classificationResult.wasteCodes.some(code => code.startsWith('D004'))) {
      hazardClass = '6.1';
      unNumber = physicalState.isLiquid ? 'UN2810' : 'UN2811';
      properShippingName = physicalState.isLiquid ? 'TOXIC LIQUID, ORGANIC, N.O.S.' : 'TOXIC SOLID, ORGANIC, N.O.S.';
      packingGroup = 'II';
    } else {
      hazardClass = '9';
      unNumber = 'UN3082';
      properShippingName = 'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.';
      packingGroup = 'III';
    }
    
    return {
      hazardClass,
      unNumber,
      properShippingName,
      packingGroup,
      technicalName: extractedData.productName || 'Waste Chemical',
      hazardZone: this.determineHazardZone(classificationResult.wasteCodes)
    };
  }

  determineFlammabilityPG(flashPoint) {
    if (!flashPoint) return 'III';
    
    const temp = parseFloat(flashPoint);
    if (temp < 23) return 'II';
    if (temp < 60) return 'III';
    return 'III';
  }

  determineCorrosivityPG(pH) {
    if (!pH) return 'II';
    
    const value = parseFloat(pH);
    if (value <= 2 || value >= 11.5) return 'I';
    if (value <= 4 || value >= 10) return 'II';
    return 'III';
  }

  determineHazardClass(wasteCodes) {
    if (wasteCodes.some(code => code.startsWith('P'))) return 'Acutely Hazardous';
    if (wasteCodes.includes('D001')) return 'Ignitable';
    if (wasteCodes.includes('D002')) return 'Corrosive';
    if (wasteCodes.includes('D003')) return 'Reactive';
    if (wasteCodes.some(code => /^D00[4-9]|^D0[1-4]\d/.test(code))) return 'Toxic';
    return 'Non-Hazardous';
  }

  determinePackingGroup(classificationResult, extractedData) {
    if (classificationResult.wasteCodes.some(code => code.startsWith('P'))) return 'I';
    
    if (extractedData.flashPoint && parseFloat(extractedData.flashPoint) < 23) return 'II';
    if (extractedData.pH && (parseFloat(extractedData.pH) <= 2 || parseFloat(extractedData.pH) >= 11.5)) return 'I';
    
    return 'III';
  }

  determineSegregationGroups(composition) {
    const groups = new Set();
    
    composition.forEach(component => {
      if (component.reactivityGroup) {
        groups.add(component.reactivityGroup);
      }
      
      if (component.cas) {
        if (this.isOrganic(component)) groups.add('Organic');
        if (this.isInorganic(component)) groups.add('Inorganic');
        if (this.isAcid(component)) groups.add('Acid');
        if (this.isBase(component)) groups.add('Base');
        if (this.isOxidizer(component)) groups.add('Oxidizer');
        if (this.isReducer(component)) groups.add('Reducer');
      }
    });
    
    return Array.from(groups);
  }

  isOrganic(component) {
    return component.name && /organic|methyl|ethyl|propyl|butyl|benzene|toluene|acetone/i.test(component.name);
  }

  isInorganic(component) {
    return component.name && /sodium|potassium|calcium|chloride|sulfate|nitrate|phosphate/i.test(component.name);
  }

  isAcid(component) {
    return component.name && /acid|HCl|H2SO4|HNO3|acetic|sulfuric|nitric|hydrochloric/i.test(component.name);
  }

  isBase(component) {
    return component.name && /hydroxide|NaOH|KOH|ammonia|amine|basic/i.test(component.name);
  }

  isOxidizer(component) {
    return component.name && /peroxide|nitrate|chlorate|permanganate|dichromate/i.test(component.name);
  }

  isReducer(component) {
    return component.name && /sulfite|thiosulfate|hydrazine|formaldehyde/i.test(component.name);
  }

  recommendDisposalMethods(wasteCodes) {
    const methods = [];
    
    if (wasteCodes.includes('D001')) {
      methods.push('Fuel Blending', 'Incineration');
    }
    
    if (wasteCodes.includes('D002')) {
      methods.push('Neutralization', 'Chemical Treatment');
    }
    
    if (wasteCodes.some(code => code.startsWith('P') || code.startsWith('U'))) {
      methods.push('High Temperature Incineration', 'Chemical Destruction');
    }
    
    if (wasteCodes.some(code => /^D00[4-9]|^D0[1-4]\d/.test(code))) {
      methods.push('Stabilization', 'Secure Landfill');
    }
    
    if (methods.length === 0) {
      methods.push('Recycling', 'Recovery', 'Treatment');
    }
    
    return [...new Set(methods)];
  }

  recommendContainers(physicalState, composition) {
    const recommendations = [];
    
    const baseContainer = physicalState.isLiquid ? 
      { type: 'Poly Drum', size: '55 gallon', material: 'HDPE' } :
      { type: 'Fiber Drum', size: '55 gallon', material: 'Fiber with poly liner' };
    
    recommendations.push({
      ...baseContainer,
      fillLimit: '80%',
      packingMaterial: 'Vermiculite',
      packingPercentage: '20%'
    });
    
    if (composition.some(c => this.isAcid(c))) {
      recommendations.push({
        type: 'Poly Carboy',
        size: '5 gallon',
        material: 'HDPE',
        fillLimit: '80%',
        packingMaterial: 'Vermiculite',
        packingPercentage: '20%'
      });
    }
    
    return recommendations;
  }

  determineHazardZone(wasteCodes) {
    if (wasteCodes.some(code => code.startsWith('P'))) return 'A';
    if (wasteCodes.includes('D001') || wasteCodes.includes('D003')) return 'B';
    return 'D';
  }

  calculateExtractionAccuracy(extractedData) {
    let score = 0;
    let total = 0;
    
    const requiredFields = [
      'productName',
      'manufacturer',
      'composition',
      'physicalState',
      'flashPoint',
      'pH'
    ];
    
    requiredFields.forEach(field => {
      total++;
      if (extractedData[field] && extractedData[field] !== 'Unknown') {
        score++;
      }
    });
    
    if (extractedData.composition && Array.isArray(extractedData.composition)) {
      const validComponents = extractedData.composition.filter(c => c.cas && c.name);
      if (validComponents.length > 0) {
        score += validComponents.length / extractedData.composition.length;
        total++;
      }
    }
    
    return total > 0 ? (score / total) * 100 : 0;
  }

  updateMetrics(analysis) {
    this.totalAnalyses++;
    
    const accuracy = analysis.performance.classificationConfidence;
    if (accuracy >= 95) {
      this.passedAnalyses++;
    }
    
    this.successRate = (this.passedAnalyses / this.totalAnalyses) * 100;
  }

  getMetrics() {
    return {
      totalAnalyses: this.totalAnalyses,
      passedAnalyses: this.passedAnalyses,
      successRate: this.successRate,
      averageConfidence: this.analysisHistory.reduce((sum, a) => sum + a.confidence, 0) / (this.analysisHistory.length || 1),
      recentAnalyses: this.analysisHistory.slice(-10)
    };
  }

  reset() {
    this.analysisHistory = [];
    this.successRate = 0;
    this.totalAnalyses = 0;
    this.passedAnalyses = 0;
  }

  /**
   * Comprehensive F-code applicability checker
   * Checks all materials for F-code applicability regardless of virgin/used status
   */
  checkFCodeApplicability(composition, extractedData) {
    console.log('🔍 Checking F-code applicability for:', extractedData.productName);
    
    const fCodeResult = {
      applicableCodes: [],
      solventDetails: [],
      industryRelevance: [],
      confidence: 0,
      usedWasteNote: 'F-codes apply if this material becomes a waste when used in industrial processes'
    };

    // F-code database with industry context
    const fCodeDatabase = {
      // F001 - Halogenated solvents used in degreasing
      F001: {
        chemicals: [
          { name: 'tetrachloroethylene', cas: '127-18-4' },
          { name: 'trichloroethylene', cas: '79-01-6' },
          { name: 'methylene chloride', cas: '75-09-2' },
          { name: '1,1,1-trichloroethane', cas: '71-55-6' },
          { name: 'carbon tetrachloride', cas: '56-23-5' },
          { name: 'chlorinated fluorocarbons', cas: 'various' }
        ],
        industries: ['metal degreasing', 'dry cleaning', 'vapor degreasing', 'parts cleaning'],
        processes: ['degreasing operations', 'cleaning processes', 'solvent recovery'],
        description: 'Spent halogenated solvents used in degreasing'
      },

      // F002 - Halogenated solvents
      F002: {
        chemicals: [
          { name: 'tetrachloroethylene', cas: '127-18-4' },
          { name: 'methylene chloride', cas: '75-09-2' },
          { name: 'trichloroethylene', cas: '79-01-6' },
          { name: 'chlorobenzene', cas: '108-90-7' },
          { name: 'o-dichlorobenzene', cas: '95-50-1' }
        ],
        industries: ['chemical manufacturing', 'pharmaceutical', 'electronics', 'textile'],
        processes: ['solvent use', 'extraction', 'purification', 'cleaning'],
        description: 'Spent halogenated solvents'
      },

      // F003 - Non-halogenated solvents
      F003: {
        chemicals: [
          { name: 'xylene', cas: '1330-20-7' },
          { name: 'acetone', cas: '67-64-1' },
          { name: 'ethyl acetate', cas: '141-78-6' },
          { name: 'ethyl benzene', cas: '100-41-4' },
          { name: 'ethyl ether', cas: '60-29-7' },
          { name: 'methyl isobutyl ketone', cas: '108-10-1' },
          { name: 'n-butyl alcohol', cas: '71-36-3' }
        ],
        industries: ['paint manufacturing', 'printing', 'adhesives', 'coatings'],
        processes: ['solvent use', 'formulation', 'cleaning', 'thinning'],
        description: 'Spent non-halogenated solvents'
      },

      // F004 - Non-halogenated solvents
      F004: {
        chemicals: [
          { name: 'cresols', cas: '1319-77-3' },
          { name: 'cresylic acid', cas: '1319-77-3' },
          { name: 'nitrobenzene', cas: '98-95-3' }
        ],
        industries: ['chemical manufacturing', 'pesticide production', 'pharmaceutical'],
        processes: ['solvent use', 'extraction', 'synthesis'],
        description: 'Spent non-halogenated solvents'
      },

      // F005 - Non-halogenated solvents
      F005: {
        chemicals: [
          { name: 'toluene', cas: '108-88-3' },
          { name: 'methyl ethyl ketone', cas: '78-93-3' },
          { name: 'carbon disulfide', cas: '75-15-0' },
          { name: 'isobutanol', cas: '78-83-1' },
          { name: 'pyridine', cas: '110-86-1' },
          { name: 'benzene', cas: '71-43-2' }
        ],
        industries: ['paint manufacturing', 'pharmaceutical', 'rubber', 'plastics'],
        processes: ['solvent use', 'extraction', 'synthesis', 'cleaning'],
        description: 'Spent non-halogenated solvents'
      }
    };

    // Check each F-code category
    for (const [fCode, data] of Object.entries(fCodeDatabase)) {
      const matches = this.checkSolventMatches(composition, data.chemicals);
      
      if (matches.foundChemicals.length > 0) {
        fCodeResult.applicableCodes.push(fCode);
        fCodeResult.solventDetails.push({
          fCode: fCode,
          description: data.description,
          matchedChemicals: matches.foundChemicals,
          industries: data.industries,
          processes: data.processes,
          confidence: matches.confidence
        });
        
        fCodeResult.industryRelevance.push(...data.industries);
        fCodeResult.confidence = Math.max(fCodeResult.confidence, matches.confidence);
      }
    }

    // Remove duplicate industries
    fCodeResult.industryRelevance = [...new Set(fCodeResult.industryRelevance)];

    console.log('🔍 F-code analysis results:', fCodeResult);
    return fCodeResult;
  }

  checkSolventMatches(composition, targetChemicals) {
    const matches = {
      foundChemicals: [],
      confidence: 0
    };

    for (const component of composition) {
      const componentName = (component.name || '').toLowerCase();
      const componentCAS = component.cas || '';
      
      for (const target of targetChemicals) {
        const targetName = target.name.toLowerCase();
        const targetCAS = target.cas;
        
        // Check by name or CAS number
        if (componentName.includes(targetName) || 
            (componentCAS && targetCAS !== 'various' && componentCAS === targetCAS)) {
          
          const percentage = parseFloat(component.percentage) || 0;
          matches.foundChemicals.push({
            name: component.name,
            cas: componentCAS,
            percentage: percentage,
            matchedTarget: target.name
          });
          
          // Higher percentage = higher confidence
          matches.confidence = Math.max(matches.confidence, Math.min(percentage / 100, 0.9));
        }
      }
    }

    return matches;
  }
}

export default EnhancedSDSAnalyzer;