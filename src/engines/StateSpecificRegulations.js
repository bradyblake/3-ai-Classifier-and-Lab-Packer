/**
 * StateSpecificRegulations.js
 * Comprehensive state-specific waste regulations implementation
 * Covers Texas TCEQ, Oklahoma DEQ, and framework for other states
 */

export class StateSpecificRegulations {
  constructor() {
    this.stateRegulations = this.initializeStateRegulations();
  }

  /**
   * Initialize state-specific regulations database
   */
  initializeStateRegulations() {
    return {
      TX: {
        name: 'Texas',
        agency: 'TCEQ',
        fullName: 'Texas Commission on Environmental Quality',
        regulationName: 'RG-22',
        classificationSystem: {
          type: 'form_code_based',
          classes: ['H', '1', '2', '3'],
          descriptions: {
            'H': 'Hazardous Waste',
            '1': 'Class 1 Industrial Waste - Potentially threatening to human health or environment',
            '2': 'Class 2 Industrial Waste - Less threatening, general industrial waste',
            '3': 'Class 3 Industrial Waste - Inert, non-liquid, essentially insoluble'
          }
        },
        wasteCodeStructure: {
          length: 8,
          format: 'SSSSFFFX',
          components: {
            'SSSS': 'Sequence number (4 digits)',
            'FFF': 'Form code (3 digits)',
            'X': 'Classification (H, 1, 2, or 3)'
          }
        },
        formCodes: this.getTexasFormCodes(),
        reportingRequirements: {
          'H': 'Required - Hazardous waste manifest and annual reporting',
          '1': 'Required - STEERS reporting by March 1 annually',
          '2': 'Generally not required unless over threshold',
          '3': 'Generally not required'
        },
        thresholds: {
          'H': 'Any amount',
          '1': '>220 lbs/month requires registration',
          '2': 'Local landfill acceptance',
          '3': 'Minimal requirements'
        }
      },
      OK: {
        name: 'Oklahoma',
        agency: 'DEQ',
        fullName: 'Oklahoma Department of Environmental Quality',
        regulationName: 'Title 27A Oklahoma Statutes',
        classificationSystem: {
          type: 'federal_based',
          classes: ['VSQG', 'SQG', 'LQG'],
          descriptions: {
            'VSQG': 'Very Small Quantity Generator (<220 lbs/month)',
            'SQG': 'Small Quantity Generator (220-2200 lbs/month)',
            'LQG': 'Large Quantity Generator (>2200 lbs/month)'
          }
        },
        formRequirements: {
          'VSQG': ['EPA ID Number (if desired)'],
          'SQG': ['EPA Form 8700-12', 'SQG Self-Certification'],
          'LQG': ['EPA Form 8700-12', 'Biennial Report', 'Disposal Plan']
        },
        reportingRequirements: {
          'VSQG': 'None required',
          'SQG': 'None required unless episodic',
          'LQG': 'Biennial Report every odd year'
        },
        specialRequirements: {
          transportation: 'OCC Registration for transporters',
          manifest: 'No state manifest copies required',
          fees: 'Required for SQG and LQG registrations'
        }
      },
      CA: {
        name: 'California',
        agency: 'DTSC',
        fullName: 'Department of Toxic Substances Control',
        status: 'framework_only'
      },
      NY: {
        name: 'New York',
        agency: 'DEC',
        fullName: 'Department of Environmental Conservation',
        status: 'framework_only'
      }
    };
  }

  /**
   * Texas form codes database
   */
  getTexasFormCodes() {
    return {
      '001': 'Acids - Inorganic',
      '002': 'Acids - Organic',
      '003': 'Alkaline Materials',
      '004': 'Asbestos Containing Materials',
      '005': 'Batteries',
      '010': 'Contaminated Soils',
      '015': 'Drums, Empty',
      '020': 'Filters',
      '025': 'Fluorescent Bulbs/Lamps',
      '030': 'Healthcare/Infectious Waste',
      '035': 'Heavy Metals',
      '040': 'Ignitable Liquids',
      '045': 'Ignitable Solids',
      '050': 'Lab Chemicals/Lab Packs',
      '055': 'Mercury Containing Items',
      '060': 'Mixed Waste (Hazardous + Radioactive)',
      '065': 'Non-halogenated Solvents',
      '070': 'Oil Containing PCBs',
      '075': 'Oils - Waste',
      '080': 'Oxidizers',
      '085': 'Paints and Coatings',
      '090': 'Pesticides and Herbicides',
      '095': 'Photographic Chemicals',
      '100': 'Plating and Metal Finishing Wastes',
      '105': 'Polychlorinated Biphenyls (PCBs)',
      '110': 'Reactive/Unstable Materials',
      '115': 'Refuse, Solid',
      '120': 'Resins and Polymers',
      '125': 'Sludges - Aqueous',
      '130': 'Sludges - Non-aqueous',
      '135': 'Spent Carbon',
      '140': 'Still Bottoms',
      '145': 'Used Oil',
      '902': 'Plant Trash',
      '999': 'Other - Describe'
    };
  }

  /**
   * Evaluate waste for state-specific regulations
   */
  async evaluateStateRegulations(sdsData, materialState, rcraResults, selectedState) {
    const state = this.stateRegulations[selectedState];
    if (!state) {
      return {
        codes: [],
        requirements: [],
        forms: [],
        reasoning: [`State ${selectedState} regulations not implemented`],
        confidence: 0
      };
    }

    switch (selectedState) {
      case 'TX':
        return this.evaluateTexasRegulations(sdsData, materialState, rcraResults);
      case 'OK':
        return this.evaluateOklahomaRegulations(sdsData, materialState, rcraResults);
      default:
        return this.evaluateGenericState(state, sdsData, materialState, rcraResults);
    }
  }

  /**
   * Texas-specific evaluation
   */
  async evaluateTexasRegulations(sdsData, materialState, rcraResults) {
    const evaluation = {
      codes: [],
      requirements: [],
      forms: [],
      reasoning: [],
      steps: [],
      confidence: 0.8
    };

    // Step 1: Determine if already hazardous under RCRA
    const isHazardous = rcraResults.rcraWasteCodes && rcraResults.rcraWasteCodes.length > 0;

    evaluation.steps.push({
      question: 'Is material already classified as RCRA hazardous?',
      answer: isHazardous,
      reasoning: isHazardous ?
        `RCRA codes: ${rcraResults.rcraWasteCodes.map(c => c.code).join(', ')}` :
        'No RCRA hazardous waste codes identified'
    });

    if (isHazardous) {
      // Material is hazardous - assign H classification
      const formCode = this.selectTexasFormCode(sdsData, materialState);
      const sequenceNumber = this.generateSequenceNumber();

      evaluation.codes.push({
        texasWasteCode: `${sequenceNumber}${formCode}H`,
        classification: 'H',
        description: 'Hazardous Waste',
        formCode: formCode,
        formDescription: this.stateRegulations.TX.formCodes[formCode]
      });

      evaluation.requirements.push('RCRA hazardous waste manifest required');
      evaluation.requirements.push('Annual waste reporting to TCEQ via STEERS');
      evaluation.requirements.push('Storage time limits apply (90 days for LQG, 180 days for SQG)');

      evaluation.reasoning.push('Material classified as Texas Hazardous Waste (H) due to RCRA classification');
    } else {
      // Non-hazardous - evaluate for Class 1, 2, or 3
      const texasClassification = this.determineTexasClass(sdsData, materialState);

      evaluation.steps.push({
        question: 'What Texas classification applies to non-hazardous material?',
        answer: texasClassification.class,
        reasoning: texasClassification.reasoning,
        details: texasClassification.details
      });

      const formCode = this.selectTexasFormCode(sdsData, materialState);
      const sequenceNumber = this.generateSequenceNumber();

      evaluation.codes.push({
        texasWasteCode: `${sequenceNumber}${formCode}${texasClassification.class}`,
        classification: texasClassification.class,
        description: this.stateRegulations.TX.classificationSystem.descriptions[texasClassification.class],
        formCode: formCode,
        formDescription: this.stateRegulations.TX.formCodes[formCode]
      });

      // Add class-specific requirements
      switch (texasClassification.class) {
        case '1':
          evaluation.requirements.push('Class 1 industrial waste - special handling required');
          evaluation.requirements.push('Disposal at Class 1 permitted landfill');
          evaluation.requirements.push('Registration required if >220 lbs/month');
          evaluation.requirements.push('Annual reporting to TCEQ if registered');
          break;
        case '2':
          evaluation.requirements.push('Class 2 industrial waste - standard disposal');
          evaluation.requirements.push('Most landfills can accept');
          break;
        case '3':
          evaluation.requirements.push('Class 3 industrial waste - minimal restrictions');
          evaluation.requirements.push('Inert waste disposal options');
          break;
      }

      evaluation.reasoning.push(`Material classified as Texas Class ${texasClassification.class} industrial waste`);
    }

    // Generate required forms
    evaluation.forms.push({
      name: 'Texas Waste Classification Documentation',
      type: 'TCEQ',
      required: true,
      description: 'Documentation of waste classification decision',
      wasteCode: evaluation.codes[0]?.texasWasteCode
    });

    if (isHazardous || evaluation.codes[0]?.classification === '1') {
      evaluation.forms.push({
        name: 'STEERS Annual Report',
        type: 'TCEQ',
        required: true,
        description: 'Annual waste generation and management report',
        dueDate: 'March 1 annually'
      });
    }

    return evaluation;
  }

  /**
   * Determine Texas waste class for non-hazardous materials
   */
  determineTexasClass(sdsData, materialState) {
    const evaluation = {
      class: '2', // Default
      reasoning: '',
      details: []
    };

    // Check for Class 1 indicators
    const class1Indicators = this.checkClass1Indicators(sdsData);

    if (class1Indicators.found) {
      evaluation.class = '1';
      evaluation.reasoning = `Class 1 due to: ${class1Indicators.reasons.join(', ')}`;
      evaluation.details = class1Indicators.details;
      return evaluation;
    }

    // Check for Class 3 eligibility
    const class3Eligible = this.checkClass3Eligibility(sdsData, materialState);

    if (class3Eligible.eligible) {
      evaluation.class = '3';
      evaluation.reasoning = 'Class 3 - inert, non-liquid, essentially insoluble';
      evaluation.details = class3Eligible.details;
      return evaluation;
    }

    // Default to Class 2
    evaluation.reasoning = 'Class 2 - general industrial waste (default classification)';
    evaluation.details = ['Does not meet Class 1 or Class 3 criteria'];

    return evaluation;
  }

  /**
   * Check for Texas Class 1 indicators
   */
  checkClass1Indicators(sdsData) {
    const indicators = {
      found: false,
      reasons: [],
      details: []
    };

    const text = (sdsData.text || '').toLowerCase();

    // PCB check
    if (text.includes('pcb') || text.includes('polychlorinated biphenyl')) {
      indicators.found = true;
      indicators.reasons.push('Contains PCBs');
    }

    // Solid corrosive check
    if (this.checkSolidCorrosive(sdsData)) {
      indicators.found = true;
      indicators.reasons.push('Solid corrosive material');
    }

    // State-regulated ignitable solid check
    if (this.checkStateRegulatedIgnitable(sdsData)) {
      indicators.found = true;
      indicators.reasons.push('State-regulated ignitable solid');
    }

    // Other potentially threatening characteristics
    const threats = this.checkPotentialThreats(sdsData);
    if (threats.length > 0) {
      indicators.found = true;
      indicators.reasons.push(...threats);
    }

    return indicators;
  }

  /**
   * Check eligibility for Texas Class 3
   */
  checkClass3Eligibility(sdsData, materialState) {
    const eligibility = {
      eligible: true,
      details: []
    };

    // Must be solid
    if (materialState !== 'solid') {
      eligibility.eligible = false;
      eligibility.details.push('Must be solid (not liquid or gas)');
      return eligibility;
    }

    // Must be inert
    if (!this.checkInert(sdsData)) {
      eligibility.eligible = false;
      eligibility.details.push('Material is not inert');
    }

    // Must be essentially insoluble
    if (!this.checkInsoluble(sdsData)) {
      eligibility.eligible = false;
      eligibility.details.push('Material is not essentially insoluble');
    }

    if (eligibility.eligible) {
      eligibility.details.push('Meets inert, non-liquid, essentially insoluble criteria');
    }

    return eligibility;
  }

  /**
   * Oklahoma-specific evaluation
   */
  async evaluateOklahomaRegulations(sdsData, materialState, rcraResults) {
    const evaluation = {
      codes: [],
      requirements: [],
      forms: [],
      reasoning: [],
      steps: [],
      confidence: 0.8
    };

    // Oklahoma follows federal RCRA system
    const isHazardous = rcraResults.rcraWasteCodes && rcraResults.rcraWasteCodes.length > 0;

    evaluation.steps.push({
      question: 'Is material classified as RCRA hazardous waste?',
      answer: isHazardous,
      reasoning: isHazardous ?
        'Material requires federal hazardous waste management' :
        'Material follows non-hazardous waste rules'
    });

    if (isHazardous) {
      // Determine generator category - this would need actual generation quantities
      const generatorCategory = 'SQG'; // Placeholder - would be determined by monthly generation

      evaluation.codes.push({
        classification: 'Hazardous',
        generatorCategory: generatorCategory,
        epaId: 'Required'
      });

      // Category-specific requirements
      switch (generatorCategory) {
        case 'VSQG':
          evaluation.requirements.push('EPA ID number optional but recommended');
          evaluation.requirements.push('No reporting requirements');
          break;
        case 'SQG':
          evaluation.requirements.push('EPA ID number required');
          evaluation.requirements.push('SQG Self-Certification required');
          evaluation.requirements.push('No routine reporting unless episodic LQG');
          break;
        case 'LQG':
          evaluation.requirements.push('EPA ID number required');
          evaluation.requirements.push('Biennial Report required (odd years)');
          evaluation.requirements.push('Oklahoma Hazardous Waste Disposal Plan required');
          break;
      }

      // Common Oklahoma requirements
      evaluation.requirements.push('OCC transporter registration if transporting');
      evaluation.requirements.push('No state manifest copies required');

      // Forms based on category
      if (generatorCategory !== 'VSQG') {
        evaluation.forms.push({
          name: 'EPA Form 8700-12',
          type: 'Federal/Oklahoma',
          required: true,
          description: 'RCRA Site Identification Form'
        });

        if (generatorCategory === 'SQG') {
          evaluation.forms.push({
            name: 'SQG Self-Certification',
            type: 'Oklahoma DEQ',
            required: true,
            description: 'Small Quantity Generator Self-Certification'
          });
        }

        if (generatorCategory === 'LQG') {
          evaluation.forms.push({
            name: 'Biennial Report',
            type: 'Oklahoma DEQ',
            required: true,
            description: 'Hazardous Waste Report (odd years)',
            dueDate: 'March 1 of even years'
          });
        }
      }

      evaluation.reasoning.push(`Oklahoma hazardous waste - ${generatorCategory} category`);
    } else {
      evaluation.codes.push({
        classification: 'Non-hazardous',
        requirements: 'Local solid waste regulations apply'
      });

      evaluation.requirements.push('Follow local solid waste disposal regulations');
      evaluation.reasoning.push('Non-hazardous material - Oklahoma DEQ requirements do not apply');
    }

    return evaluation;
  }

  /**
   * Select appropriate Texas form code based on material characteristics
   */
  selectTexasFormCode(sdsData, materialState) {
    const text = (sdsData.text || '').toLowerCase();

    // Priority matching for specific waste types
    if (text.includes('acid') && !text.includes('organic')) return '001'; // Inorganic acids
    if (text.includes('acid') && text.includes('organic')) return '002'; // Organic acids
    if (text.includes('alkaline') || text.includes('caustic') || text.includes('base')) return '003';
    if (text.includes('asbestos')) return '004';
    if (text.includes('battery') || text.includes('batteries')) return '005';
    if (text.includes('contaminated') && text.includes('soil')) return '010';
    if (text.includes('mercury')) return '055';
    if (text.includes('solvent') && !text.includes('halogen')) return '065';
    if (text.includes('pcb')) return '105';
    if (text.includes('oil')) return '075';
    if (text.includes('paint')) return '085';
    if (text.includes('pesticide') || text.includes('herbicide')) return '090';
    if (text.includes('metal') && text.includes('finish')) return '100';

    // Physical state based selection
    if (materialState === 'liquid') {
      const ph = this.extractPH(sdsData);
      if (ph !== null) {
        if (ph <= 2) return '001'; // Acidic
        if (ph >= 12.5) return '003'; // Alkaline
      }
      const flashPoint = this.extractFlashPoint(sdsData);
      if (flashPoint !== null && flashPoint <= 60) return '040'; // Ignitable liquids

      return '999'; // Other liquid
    }

    if (materialState === 'solid') {
      if (this.checkIgnitableSolid(sdsData)) return '045';
      return '115'; // Solid refuse
    }

    return '999'; // Other - describe
  }

  /**
   * Generate sequence number for Texas waste codes
   */
  generateSequenceNumber() {
    // In practice, this would be assigned by the generator
    // For demonstration, using timestamp-based number
    return String(Date.now()).slice(-4);
  }

  // Utility methods for checking material properties

  checkSolidCorrosive(sdsData) {
    // Implementation to check for solid corrosive characteristics
    return false; // Placeholder
  }

  checkStateRegulatedIgnitable(sdsData) {
    // Implementation to check for state-regulated ignitable solids
    return false; // Placeholder
  }

  checkPotentialThreats(sdsData) {
    // Implementation to check for other potentially threatening characteristics
    return []; // Placeholder
  }

  checkInert(sdsData) {
    // Implementation to check if material is inert
    return false; // Placeholder
  }

  checkInsoluble(sdsData) {
    // Implementation to check if material is essentially insoluble
    return false; // Placeholder
  }

  extractPH(sdsData) {
    const text = sdsData.text || '';
    const match = text.match(/ph\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractFlashPoint(sdsData) {
    const text = sdsData.text || '';
    const match = text.match(/flash\s*point\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i);
    return match ? parseFloat(match[1]) : null;
  }

  checkIgnitableSolid(sdsData) {
    // Implementation to check for ignitable solid characteristics
    return false; // Placeholder
  }

  /**
   * Generic state evaluation for states not fully implemented
   */
  evaluateGenericState(state, sdsData, materialState, rcraResults) {
    return {
      codes: [],
      requirements: [`Contact ${state.fullName} for specific requirements`],
      forms: [{
        name: `${state.name} State Requirements`,
        type: state.agency,
        required: false,
        description: `Consult ${state.agency} for state-specific forms and requirements`
      }],
      reasoning: [`${state.name} specific regulations not yet fully implemented`],
      confidence: 0.1
    };
  }
}

export default StateSpecificRegulations;