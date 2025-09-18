// CLASSIFICATION VALIDATOR
// Post-processing validation and correction for AI classification results
// Ensures compliance with known chemical properties and regulatory requirements

class ClassificationValidator {
  constructor() {
    // Known chemical properties database
    this.knownChemicals = {
      'acetone': {
        flashPoint: { celsius: -18, fahrenheit: 0 },
        federalCodes: ['D001', 'F003'],
        formCode: '203',
        classification: 'H',
        physicalState: 'liquid',
        dotClass: '3',
        unNumber: 'UN1090'
      },
      'paint thinner': {
        flashPoint: { celsius: 40, fahrenheit: 104 },
        federalCodes: ['D001'],
        formCode: '203',
        classification: 'H',
        physicalState: 'liquid',
        dotClass: '3',
        unNumber: 'UN1993'
      },
      'klean-strip': {
        flashPoint: { celsius: 40, fahrenheit: 104 },
        federalCodes: ['D001'],
        formCode: '203',
        classification: 'H',
        physicalState: 'liquid',
        dotClass: '3'
      },
      'wd-40': {
        flashPoint: { celsius: 47, fahrenheit: 117 },
        federalCodes: ['D001'],
        formCode: '208', // Aerosol
        classification: 'H',
        physicalState: 'aerosol',
        dotClass: '2.1',
        unNumber: 'UN1950'
      },
      'wd40': {
        flashPoint: { celsius: 47, fahrenheit: 117 },
        federalCodes: ['D001'],
        formCode: '208',
        classification: 'H',
        physicalState: 'aerosol',
        dotClass: '2.1',
        unNumber: 'UN1950'
      },
      'caustic soda beads': {
        flashPoint: null,
        federalCodes: [],
        formCode: '204', // Solid lab chemical
        classification: '3',
        physicalState: 'solid',
        dotClass: '8',
        unNumber: 'UN1823'
      },
      'sodium hydroxide beads': {
        flashPoint: null,
        federalCodes: [],
        formCode: '204',
        classification: '3',
        physicalState: 'solid',
        dotClass: '8'
      },
      'ultra-duty': {
        flashPoint: { celsius: 200, fahrenheit: 392 }, // High flash point
        federalCodes: [],
        formCode: '110', // Used oil/grease
        classification: '1', // Class 1 due to petroleum
        physicalState: 'semi-solid',
        dotClass: null
      },
      'grease': {
        flashPoint: { celsius: 200, fahrenheit: 392 },
        federalCodes: [],
        formCode: '110',
        classification: '1',
        physicalState: 'semi-solid',
        dotClass: null
      },
      'diesel': {
        flashPoint: { celsius: 62, fahrenheit: 144 },
        federalCodes: [], // Usually not D001 (flash >60°C)
        formCode: '202',
        classification: '1',
        physicalState: 'liquid',
        dotClass: '3',
        unNumber: 'UN1993'
      },
      'gasoline': {
        flashPoint: { celsius: -43, fahrenheit: -45 },
        federalCodes: ['D001'],
        formCode: '202',
        classification: 'H',
        physicalState: 'liquid',
        dotClass: '3',
        unNumber: 'UN1203'
      }
    };

    // Form code validation rules
    this.formCodeRules = {
      '208': { requiredState: 'aerosol', description: 'Aerosol waste' },
      '204': { requiredState: 'solid', description: 'Lab chemicals/solids' },
      '203': { requiredState: 'liquid', requiredType: 'solvent', description: 'Solvent waste' },
      '202': { requiredState: 'liquid', requiredType: 'petroleum', description: 'Petroleum waste' },
      '105': { requiredState: 'liquid', requiredpH: [0, 2], description: 'Acid waste' },
      '106': { requiredState: 'liquid', requiredpH: [12.5, 14], description: 'Alkaline waste' },
      '110': { requiredType: 'oil/grease', description: 'Used oil/grease' },
      '102': { requiredState: 'liquid', description: 'Aqueous waste' }
    };
  }

  /**
   * Validate and correct classification results
   */
  validateAndCorrect(classification, productName, sdsText = '') {
    console.log(`🔍 Validating classification for: ${productName}`);
    
    // Create a corrected copy
    let corrected = JSON.parse(JSON.stringify(classification));
    const issues = [];
    
    // 1. Check against known chemicals database
    const productLower = productName.toLowerCase();
    let knownData = null;
    
    for (const [key, data] of Object.entries(this.knownChemicals)) {
      if (productLower.includes(key)) {
        knownData = data;
        console.log(`   ✓ Found known chemical: ${key}`);
        break;
      }
    }
    
    if (knownData) {
      // Override with known correct values
      if (knownData.flashPoint && (!corrected.flashPoint || corrected.flashPoint.celsius === null)) {
        corrected.flashPoint = knownData.flashPoint;
        issues.push(`Fixed flash point: ${knownData.flashPoint.celsius}°C`);
      }
      
      if (knownData.federalCodes.length > 0 && (!corrected.federal_codes || corrected.federal_codes.length === 0)) {
        corrected.federal_codes = knownData.federalCodes;
        issues.push(`Added federal codes: ${knownData.federalCodes.join(', ')}`);
      }
      
      if (knownData.formCode && corrected.state_form_code !== knownData.formCode) {
        corrected.state_form_code = knownData.formCode;
        issues.push(`Fixed form code: ${knownData.formCode}`);
      }
      
      if (knownData.classification && corrected.state_classification !== knownData.classification) {
        corrected.state_classification = knownData.classification;
        issues.push(`Fixed classification: ${knownData.classification}`);
      }
      
      if (knownData.physicalState && (!corrected.physicalState || corrected.physicalState === 'unknown')) {
        corrected.physicalState = knownData.physicalState;
        issues.push(`Fixed physical state: ${knownData.physicalState}`);
      }
      
      if (knownData.dotClass && !corrected.hazardClass) {
        corrected.hazardClass = knownData.dotClass;
        issues.push(`Added DOT class: ${knownData.dotClass}`);
      }
      
      if (knownData.unNumber && !corrected.unNumber) {
        corrected.unNumber = knownData.unNumber;
        issues.push(`Added UN number: ${knownData.unNumber}`);
      }
    }
    
    // 2. Validate physical state
    if (!corrected.physicalState || corrected.physicalState === 'unknown') {
      // Try to infer from product name or SDS text
      if (productLower.includes('aerosol') || productLower.includes('spray')) {
        corrected.physicalState = 'aerosol';
        issues.push('Inferred physical state: aerosol');
      } else if (productLower.includes('bead') || productLower.includes('pellet') || 
                 productLower.includes('powder') || productLower.includes('solid')) {
        corrected.physicalState = 'solid';
        issues.push('Inferred physical state: solid');
      } else if (productLower.includes('grease') || productLower.includes('paste')) {
        corrected.physicalState = 'semi-solid';
        issues.push('Inferred physical state: semi-solid');
      } else {
        corrected.physicalState = 'liquid'; // Default assumption
        issues.push('Defaulted physical state: liquid');
      }
    }
    
    // 3. Validate D001 assignment based on flash point
    if (corrected.flashPoint && corrected.flashPoint.celsius !== null) {
      const shouldHaveD001 = corrected.flashPoint.celsius < 60 && corrected.physicalState === 'liquid';
      const hasD001 = corrected.federal_codes && corrected.federal_codes.includes('D001');
      
      if (shouldHaveD001 && !hasD001) {
        if (!corrected.federal_codes) corrected.federal_codes = [];
        corrected.federal_codes.push('D001');
        corrected.state_classification = 'H';
        issues.push(`Added D001 (flash point ${corrected.flashPoint.celsius}°C < 60°C)`);
      } else if (!shouldHaveD001 && hasD001 && corrected.flashPoint.celsius >= 60) {
        corrected.federal_codes = corrected.federal_codes.filter(code => code !== 'D001');
        issues.push(`Removed incorrect D001 (flash point ${corrected.flashPoint.celsius}°C >= 60°C)`);
      }
    }
    
    // 4. Validate D002 - NEVER for solids
    if (corrected.physicalState === 'solid' && corrected.federal_codes && corrected.federal_codes.includes('D002')) {
      corrected.federal_codes = corrected.federal_codes.filter(code => code !== 'D002');
      issues.push('Removed D002 from solid material (D002 only applies to liquids)');
    }
    
    // 5. Validate form code matches physical state
    if (corrected.state_form_code) {
      const formRule = this.formCodeRules[corrected.state_form_code];
      if (formRule) {
        if (formRule.requiredState && corrected.physicalState !== formRule.requiredState) {
          // Try to find correct form code
          if (corrected.physicalState === 'aerosol') {
            corrected.state_form_code = '208';
            issues.push('Fixed form code for aerosol: 208');
          } else if (corrected.physicalState === 'solid') {
            corrected.state_form_code = '204';
            issues.push('Fixed form code for solid: 204');
          }
        }
      }
    }
    
    // 6. Fix Texas classification
    if (corrected.federal_codes && corrected.federal_codes.length > 0) {
      corrected.state_classification = 'H';
      corrected.final_classification = 'hazardous';
    } else {
      // Check for petroleum content
      if (productLower.includes('petroleum') || productLower.includes('oil') || 
          productLower.includes('grease') || productLower.includes('diesel')) {
        if (corrected.state_classification === '3') {
          corrected.state_classification = '1';
          issues.push('Fixed classification to Class 1 (petroleum content)');
        }
      }
      corrected.final_classification = 'non-hazardous';
    }
    
    // 7. Fix state codes format
    if (corrected.state_form_code && corrected.state_classification) {
      corrected.state_codes = [`${corrected.state_form_code}-${corrected.state_classification}`];
    }
    
    // 8. Special case validations
    if (productLower.includes('acetone') && corrected.state_classification !== 'H') {
      corrected.federal_codes = ['D001', 'F003'];
      corrected.state_classification = 'H';
      corrected.state_form_code = '203';
      corrected.flashPoint = { celsius: -18, fahrenheit: 0 };
      corrected.final_classification = 'hazardous';
      issues.push('CRITICAL: Fixed acetone classification - MUST be hazardous D001/F003');
    }
    
    if (issues.length > 0) {
      console.log(`   ⚠️ Fixed ${issues.length} issues:`);
      issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log(`   ✅ Classification validated successfully`);
    }
    
    return {
      classification: corrected,
      issues: issues,
      validated: true
    };
  }

  /**
   * Check for F-codes (spent solvents)
   */
  checkForFCodes(productName, composition = []) {
    const fCodes = [];
    const nameLower = productName.toLowerCase();
    
    // F003 - Non-halogenated solvents
    const f003Solvents = ['acetone', 'ethyl acetate', 'ethyl benzene', 'ethyl ether', 'methyl isobutyl ketone', 'n-butyl alcohol', 'cyclohexanone', 'methanol'];
    
    // F005 - Non-halogenated solvents
    const f005Solvents = ['toluene', 'methyl ethyl ketone', 'carbon disulfide', 'isobutanol', 'pyridine', 'benzene', '2-ethoxyethanol', '2-nitropropane'];
    
    for (const solvent of f003Solvents) {
      if (nameLower.includes(solvent) || composition.some(c => c.name?.toLowerCase().includes(solvent))) {
        fCodes.push('F003');
        break;
      }
    }
    
    for (const solvent of f005Solvents) {
      if (nameLower.includes(solvent) || composition.some(c => c.name?.toLowerCase().includes(solvent))) {
        fCodes.push('F005');
        break;
      }
    }
    
    return fCodes;
  }
}

export default ClassificationValidator;