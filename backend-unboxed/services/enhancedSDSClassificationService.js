// enhancedSDSClassificationService.js
// Enhanced SDS classification service with comprehensive Texas RG-22 and federal classification

import comprehensiveFederalClassifier from '../../src/shared/services/comprehensiveFederalClassifier.js';
import texasRG22Classifier from '../../src/shared/services/texasRG22Classifier.js';
import fs from 'fs';
import path from 'path';

export class EnhancedSDSClassificationService {
  constructor() {
    this.name = "Enhanced SDS Classification Service";
    this.datasets = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log('🔧 Initializing Enhanced SDS Classification Service...');
    
    try {
      // Load federal datasets
      this.datasets.D_CODES = await this.loadDataset('src/shared/data/regulatory/d_code_limits.json');
      this.datasets.P_CODES = await this.loadDataset('src/shared/data/regulatory/p_code_wastes.json');
      this.datasets.U_CODES = await this.loadDataset('src/shared/data/regulatory/u_code_wastes.json');
      this.datasets.F_CODES = await this.loadDataset('src/shared/data/regulatory/f_code_registry.json');
      this.datasets.K_CODES = await this.loadDataset('src/shared/data/regulatory/k_code_registry.json');
      this.datasets.CERCLA = await this.loadDataset('src/shared/data/regulatory/cercla_substances.json');
      
      // Load Texas datasets
      this.datasets.TX_RG22 = await this.loadDataset('src/shared/data/regulatory/tx_rg22_data.json');
      this.datasets.TX_RG11_APPENDIX_F = await this.loadDataset('src/shared/data/regulatory/tx_rg11_appendix_f.json');
      
      console.log('✅ Enhanced SDS Classification Service initialized');
      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced SDS Classification Service:', error);
      throw error;
    }
  }

  async loadDataset(relativePath) {
    try {
      // Try multiple possible paths
      const possiblePaths = [
        path.resolve(relativePath),
        path.resolve('..', relativePath),
        path.resolve('../src/shared/data/regulatory/tx_rg22_data.json'),
        path.resolve('../src/shared/data/regulatory/tx_rg11_appendix_f.json'),
        path.resolve('../src/shared/data/regulatory/d_code_limits.json')
      ];
      
      let fullPath = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          fullPath = testPath;
          break;
        }
      }
      
      if (!fullPath) {
        console.warn(`⚠️ Dataset not found in any location: ${relativePath}`);
        // Return sample data structure for testing
        if (relativePath.includes('tx_rg22_data')) {
          return {
            rg22_thresholds: [],
            appendix_d_constituents: []
          };
        }
        if (relativePath.includes('tx_rg11_appendix_f')) {
          return {
            form_codes: {
              "001": { name: "Lab Pack - Mixed" },
              "101": { name: "Inorganic Liquids" },
              "201": { name: "Organic Liquids" },
              "203": { name: "Non-halogenated Solvents" },
              "301": { name: "Inorganic Solids" },
              "401": { name: "Organic Solids" }
            }
          };
        }
        return [];
      }
      
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log(`✅ Dataset loaded: ${relativePath} from ${fullPath}`);
      return data;
    } catch (error) {
      console.warn(`⚠️ Failed to load dataset ${relativePath}:`, error.message);
      return [];
    }
  }

  /**
   * Comprehensive SDS classification
   * @param {Object} params - Classification parameters
   * @param {string} params.productName - Product name from SDS
   * @param {Array} params.composition - Chemical composition
   * @param {string} params.physicalState - Physical state (liquid, solid, sludge, gas)
   * @param {number} params.pH - pH value
   * @param {number} params.flashPointC - Flash point in Celsius
   * @param {number} params.flashPointF - Flash point in Fahrenheit  
   * @param {string} params.state - State for classification (default: TX)
   * @returns {Object} Complete classification results
   */
  async classify({
    productName,
    composition = [],
    physicalState,
    pH,
    flashPointC,
    flashPointF,
    state = 'TX'
  }) {
    await this.initialize();

    const audit = this.createAuditLogger();
    
    console.log('🔍 Starting enhanced SDS classification for:', productName);
    
    try {
      // Normalize flash point to Celsius
      let flashPointCelsius = flashPointC;
      if (flashPointCelsius === null && flashPointF !== null) {
        flashPointCelsius = (flashPointF - 32) * 5/9;
      }

      // Step 1: Comprehensive federal classification
      console.log('🏛️ Analyzing federal classification...');
      const federalClassification = await comprehensiveFederalClassifier.classify({
        composition,
        physicalState,
        pH,
        flashPointC: flashPointCelsius,
        datasets: this.datasets,
        audit
      });

      // Step 2: Texas RG-22 classification
      console.log('🏴󠁵󠁳󠁴󠁸󠁿 Analyzing Texas RG-22 classification...');
      let texasClassification = null;
      if (state === 'TX') {
        texasClassification = await texasRG22Classifier.classify({
          productName,
          composition,
          physicalState,
          pH,
          flashPointC: flashPointCelsius,
          federal: federalClassification,
          datasets: this.datasets,
          audit
        });
      }

      // Step 3: Build comprehensive result
      const result = this.buildComprehensiveResult({
        productName,
        composition,
        physicalState,
        pH,
        flashPointC: flashPointCelsius,
        flashPointF,
        federal: federalClassification,
        texas: texasClassification,
        auditLog: audit.getLogs(),
        state
      });

      console.log('✅ Enhanced SDS classification completed');
      return result;

    } catch (error) {
      console.error('❌ Enhanced SDS classification failed:', error);
      throw error;
    }
  }

  buildComprehensiveResult({
    productName,
    composition,
    physicalState,
    pH,
    flashPointC,
    flashPointF,
    federal,
    texas,
    auditLog,
    state
  }) {
    // Determine overall classification
    const isFederallyHazardous = federal.isFederallyHazardous;
    const finalClassification = isFederallyHazardous ? 'hazardous' : 'non-hazardous';

    // Build federal codes summary
    const federalCodes = [
      ...federal.characteristics.codes,
      ...federal.listed.P.map(p => p.code),
      ...federal.listed.U.map(u => u.code),
      ...federal.listed.F.map(f => f.code),
      ...federal.listed.K.map(k => k.code)
    ];

    // Build comprehensive result
    const result = {
      // Basic classification info
      productName,
      physicalState,
      pH,
      flashPoint: {
        celsius: flashPointC,
        fahrenheit: flashPointF || (flashPointC !== null ? (flashPointC * 9/5) + 32 : null)
      },
      
      // Overall determination
      final_classification: finalClassification,
      is_hazardous: isFederallyHazardous,
      
      // Federal classification details
      federal_classification: {
        is_hazardous: isFederallyHazardous,
        characteristics: federal.characteristics,
        listed_wastes: federal.listed,
        cercla: federal.cercla,
        tsca: federal.tsca,
        regulatory_basis: federal.regulatoryBasis
      },
      
      // Federal codes (legacy format for compatibility)
      federal_codes: federalCodes,
      hazardClass: this.determineDOTHazardClass(federal, flashPointC, pH),
      
      // Texas-specific classification
      texas_classification: texas ? {
        form_code: texas.formCode,
        waste_classification: texas.wasteClassification,
        sequence: texas.sequence,
        full_state_code: texas.fullStateCode,
        appendix_d_constituents: texas.appendixDConstituents,
        threshold_analysis: texas.thresholdAnalysis,
        regulatory_basis: texas.regulatoryBasis,
        compliance_notes: texas.complianceNotes
      } : null,
      
      // State codes (legacy format)
      state_form_code: texas?.formCode || null,
      state_classification: texas?.wasteClassification || null,
      full_state_code: texas?.fullStateCode || null,
      
      // Composition analysis
      composition_analysis: {
        total_components: composition.length,
        organic_content_percent: this.calculateOrganicContent(composition),
        hazardous_constituents: this.identifyHazardousConstituents(composition, federal),
        appendix_d_matches: texas?.appendixDConstituents || []
      },
      
      // Physical/chemical properties
      properties: {
        physical_state: physicalState,
        pH: pH,
        flash_point_c: flashPointC,
        flash_point_f: flashPointF,
        ignitability: flashPointC !== null && flashPointC < 60,
        corrosivity: pH !== null && (pH <= 2 || pH >= 12.5)
      },
      
      // Regulatory compliance summary
      compliance_summary: {
        federal_regulations: federal.regulatoryBasis,
        texas_regulations: texas?.regulatoryBasis || [],
        manifest_required: isFederallyHazardous,
        special_requirements: this.getSpecialRequirements(federal, texas)
      },
      
      // Audit trail
      audit_log: auditLog,
      classification_timestamp: new Date().toISOString(),
      classification_version: "2.0-enhanced"
    };

    return result;
  }

  calculateOrganicContent(composition) {
    if (!composition?.length) return 0;
    
    let organicPercent = 0;
    const organicKeywords = [
      'carbon', 'hydrocarbon', 'alcohol', 'ketone', 'ester', 'ether',
      'benzene', 'toluene', 'xylene', 'acetone', 'methanol', 'ethanol'
    ];
    
    for (const comp of composition) {
      const name = (comp.name || '').toLowerCase();
      if (organicKeywords.some(keyword => name.includes(keyword))) {
        organicPercent += parseFloat(comp.percent) || 0;
      }
    }
    
    return Math.min(organicPercent, 100);
  }

  identifyHazardousConstituents(composition, federal) {
    const hazardous = [];
    
    // From federal characteristics
    for (const detail of federal.characteristics.details) {
      if (detail.matches) {
        hazardous.push(...detail.matches.map(match => ({
          name: match.component.name,
          cas: match.component.cas,
          percent: match.component.percent,
          hazard_type: 'federal_characteristic',
          codes: [detail.code]
        })));
      }
    }
    
    // From listed wastes
    ['P', 'U', 'F', 'K'].forEach(listType => {
      for (const waste of federal.listed[listType]) {
        hazardous.push({
          name: waste.chemical || waste.name,
          cas: waste.cas,
          hazard_type: 'federal_listed',
          codes: [waste.code]
        });
      }
    });
    
    return hazardous;
  }

  determineDOTHazardClass(federal, flashPointC, pH) {
    // Priority order for DOT classification
    if (federal.characteristics.codes.includes('D001') || (flashPointC !== null && flashPointC < 60)) {
      return '3'; // Flammable liquid
    }
    
    if (federal.characteristics.codes.includes('D002') || (pH !== null && (pH <= 2 || pH >= 12.5))) {
      return '8'; // Corrosive
    }
    
    if (federal.characteristics.codes.includes('D003')) {
      return '4.1'; // Reactive/flammable solid
    }
    
    // Check for toxicity
    const toxicityCodes = federal.characteristics.codes.filter(code => 
      /^D0(0[4-9]|[1-3][0-9]|4[0-3])$/.test(code)
    );
    if (toxicityCodes.length > 0) {
      return '6.1'; // Toxic
    }
    
    return null; // Not regulated for shipping
  }

  getSpecialRequirements(federal, texas) {
    const requirements = [];
    
    if (federal.isFederallyHazardous) {
      requirements.push('RCRA manifest required');
      requirements.push('EPA ID number required for transportation');
    }
    
    if (texas?.wasteClassification === 'H') {
      requirements.push('Texas hazardous waste manifest');
    }
    
    if (texas?.formCode?.startsWith('00')) {
      requirements.push('Lab pack disposal per 40 CFR 264.316');
    }
    
    if (federal.characteristics.codes.includes('D001')) {
      requirements.push('Fire prevention measures required');
    }
    
    if (federal.characteristics.codes.includes('D002')) {
      requirements.push('Corrosive handling precautions');
    }
    
    if (federal.characteristics.codes.includes('D003')) {
      requirements.push('Reactive material storage requirements');
    }
    
    if (texas?.appendixDConstituents?.length > 0) {
      requirements.push('Additional characterization may be required');
    }
    
    return requirements;
  }

  createAuditLogger() {
    const logs = [];
    
    return {
      log: (entry) => {
        logs.push({
          timestamp: new Date().toISOString(),
          ...entry
        });
      },
      getLogs: () => logs
    };
  }
}

export default new EnhancedSDSClassificationService();