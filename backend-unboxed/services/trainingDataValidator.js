// Training Data Validator
// Ensures quality and consistency of training feedback

class TrainingDataValidator {
  constructor() {
    // Valid EPA codes
    this.validFederalCodes = {
      D: ['D001', 'D002', 'D003', 'D004', 'D005', 'D006', 'D007', 'D008', 'D009', 
          'D010', 'D011', 'D012', 'D013', 'D014', 'D015', 'D016', 'D017', 'D018',
          'D019', 'D020', 'D021', 'D022', 'D023', 'D024', 'D025', 'D026', 'D027',
          'D028', 'D029', 'D030', 'D031', 'D032', 'D033', 'D034', 'D035', 'D036',
          'D037', 'D038', 'D039', 'D040', 'D041', 'D042', 'D043'],
      F: ['F001', 'F002', 'F003', 'F004', 'F005', 'F006', 'F007', 'F008', 'F009',
          'F010', 'F011', 'F012', 'F019', 'F020', 'F021', 'F022', 'F023', 'F024',
          'F025', 'F026', 'F027', 'F028', 'F032', 'F034', 'F035', 'F037', 'F038', 'F039'],
      K: [], // Industry-specific codes (K001-K181)
      P: [], // Acutely hazardous (P001-P205)
      U: []  // Toxic wastes (U001-U411)
    };
    
    // Add K codes
    for (let i = 1; i <= 181; i++) {
      this.validFederalCodes.K.push(`K${String(i).padStart(3, '0')}`);
    }
    
    // Add P codes
    for (let i = 1; i <= 205; i++) {
      this.validFederalCodes.P.push(`P${String(i).padStart(3, '0')}`);
    }
    
    // Add U codes
    for (let i = 1; i <= 411; i++) {
      this.validFederalCodes.U.push(`U${String(i).padStart(3, '0')}`);
    }
    
    // Valid Texas form codes
    this.validTexasFormCodes = [
      // Lab Pack Series (001-009)
      '001', '002', '003', '004', '005', '006', '007', '008', '009',
      // 100 Series
      '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
      // 200 Series
      '201', '202', '203', '204', '205', '206', '207', '208', '209', '210',
      '211', '212', '213', '214', '215', '216', '217', '218', '219',
      // 300 Series
      '301', '302', '303', '304', '305',
      // 400 Series
      '401', '402',
      // 500 Series
      '501', '502', '503', '504', '505',
      // 600 Series
      '601', '602', '603', '604',
      // 700 Series
      '701', '702', '703', '704', '705',
      // 800 Series
      '801', '802', '803', '804', '805', '806', '807'
    ];
    
    // Valid DOT UN number patterns
    this.dotUnPattern = /^UN\d{4}$/;
    
    // Physical state rules
    this.physicalStateRules = {
      solid: {
        cannotHave: ['D002'], // Solids cannot be corrosive (pH-based)
        flashPointRule: 'ignore' // Flash point not applicable to solids
      },
      liquid: {
        canHaveAll: true
      },
      gas: {
        cannotHave: ['D001', 'D002'], // Gases can't be ignitable/corrosive by definition
        specialCodes: ['D003'] // Can be reactive
      },
      sludge: {
        canHaveAll: true,
        preferredFormCodes: ['104', '107']
      }
    };
  }
  
  validateFeedback(feedback) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!feedback.material || feedback.material.trim() === '') {
      errors.push('Material name is required');
    }
    
    if (!feedback.reason || feedback.reason.trim() === '') {
      errors.push('Reason for correction is required');
    }
    
    // Validate federal codes
    if (feedback.correct_result?.federal) {
      const invalidCodes = this.validateFederalCodes(feedback.correct_result.federal);
      if (invalidCodes.length > 0) {
        errors.push(`Invalid federal codes: ${invalidCodes.join(', ')}`);
      }
      
      // Check for logical inconsistencies
      const inconsistencies = this.checkFederalCodeLogic(
        feedback.correct_result.federal,
        feedback.properties || {}
      );
      warnings.push(...inconsistencies);
    }
    
    // Validate Texas form code
    if (feedback.correct_result?.texas_form_code) {
      if (!this.validTexasFormCodes.includes(feedback.correct_result.texas_form_code)) {
        errors.push(`Invalid Texas form code: ${feedback.correct_result.texas_form_code}`);
      }
      
      // Check form code consistency with federal codes
      const formCodeIssues = this.checkFormCodeConsistency(
        feedback.correct_result.texas_form_code,
        feedback.correct_result.federal || [],
        feedback.material
      );
      warnings.push(...formCodeIssues);
    }
    
    // Validate DOT UN number
    if (feedback.correct_result?.dot_un) {
      if (!this.dotUnPattern.test(feedback.correct_result.dot_un)) {
        errors.push(`Invalid DOT UN format: ${feedback.correct_result.dot_un} (should be UN####)`);
      }
    }
    
    // Check for duplicate or conflicting entries
    const duplicateCheck = this.checkForDuplicates(feedback);
    if (duplicateCheck) {
      warnings.push(duplicateCheck);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      severity: errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'ok')
    };
  }
  
  validateFederalCodes(codes) {
    const invalid = [];
    const allValidCodes = [
      ...this.validFederalCodes.D,
      ...this.validFederalCodes.F,
      ...this.validFederalCodes.K,
      ...this.validFederalCodes.P,
      ...this.validFederalCodes.U
    ];
    
    for (const code of codes) {
      if (!allValidCodes.includes(code)) {
        invalid.push(code);
      }
    }
    
    return invalid;
  }
  
  checkFederalCodeLogic(codes, properties) {
    const warnings = [];
    
    // D001 requires flash point < 60°C
    if (codes.includes('D001') && properties.flashPoint !== undefined) {
      if (properties.flashPoint >= 60) {
        warnings.push('D001 assigned but flash point >= 60°C');
      }
    }
    
    // D002 requires pH <= 2 or >= 12.5
    if (codes.includes('D002')) {
      if (properties.physicalState === 'solid') {
        warnings.push('D002 assigned to solid waste (solids cannot have pH hazard)');
      } else if (properties.ph !== undefined) {
        if (properties.ph > 2 && properties.ph < 12.5) {
          warnings.push(`D002 assigned but pH ${properties.ph} is not hazardous`);
        }
      }
    }
    
    // F-listed waste checks
    const fCodes = codes.filter(c => c.startsWith('F'));
    if (fCodes.length > 0) {
      // F001/F002 are halogenated solvents
      if ((fCodes.includes('F001') || fCodes.includes('F002')) && fCodes.includes('F003')) {
        warnings.push('Both halogenated (F001/F002) and non-halogenated (F003) solvent codes assigned');
      }
    }
    
    // P and U codes are for discarded commercial chemical products
    const pCodes = codes.filter(c => c.startsWith('P'));
    const uCodes = codes.filter(c => c.startsWith('U'));
    if ((pCodes.length > 0 || uCodes.length > 0) && fCodes.length > 0) {
      warnings.push('Both listed waste (F) and discarded commercial product (P/U) codes assigned');
    }
    
    return warnings;
  }
  
  checkFormCodeConsistency(formCode, federalCodes, material) {
    const warnings = [];
    const materialLower = material.toLowerCase();
    
    // Check petroleum products
    if (formCode === '202') {
      if (!materialLower.includes('diesel') && !materialLower.includes('gasoline') && 
          !materialLower.includes('fuel') && !materialLower.includes('petroleum')) {
        warnings.push('Form code 202 (petroleum) but material name doesn\'t indicate petroleum');
      }
    }
    
    // Check solvent codes
    if (formCode === '203') {
      if (federalCodes.includes('F001') || federalCodes.includes('F002')) {
        warnings.push('Form code 203 (non-halogenated) but F001/F002 (halogenated) assigned');
      }
    } else if (formCode === '201') {
      if (federalCodes.includes('F003')) {
        warnings.push('Form code 201 (halogenated) but F003 (non-halogenated) assigned');
      }
    }
    
    // Check acid/base consistency
    if (formCode === '105' && !federalCodes.includes('D002')) {
      warnings.push('Form code 105 (acids) but no D002 corrosive code');
    }
    
    if (formCode === '106' && !federalCodes.includes('D002')) {
      warnings.push('Form code 106 (bases) but no D002 corrosive code');
    }
    
    // Lab pack checks
    if (formCode.startsWith('00') && !materialLower.includes('lab')) {
      warnings.push(`Form code ${formCode} (lab pack series) but material doesn't indicate laboratory waste`);
    }
    
    return warnings;
  }
  
  checkForDuplicates(feedback) {
    // This would check against existing database
    // For now, just check for obvious material name variations
    const commonVariations = {
      'diesel fuel': ['diesel', '#2 fuel oil', 'fuel oil'],
      'sulfuric acid': ['battery acid', 'oil of vitriol'],
      'sodium hydroxide': ['caustic soda', 'lye', 'naoh'],
      'hydrochloric acid': ['muriatic acid', 'hcl']
    };
    
    for (const [primary, variations] of Object.entries(commonVariations)) {
      if (variations.includes(feedback.material.toLowerCase())) {
        return `Consider using standard name "${primary}" instead of "${feedback.material}"`;
      }
    }
    
    return null;
  }
  
  // Validate entire training dataset
  validateDataset(feedbackArray, examplesArray) {
    const report = {
      totalFeedback: feedbackArray.length,
      totalExamples: examplesArray.length,
      validFeedback: 0,
      invalidFeedback: 0,
      warnings: [],
      errors: [],
      statistics: {
        federalCodes: {},
        texasFormCodes: {},
        materials: {}
      }
    };
    
    // Validate each feedback entry
    for (const feedback of feedbackArray) {
      const validation = this.validateFeedback(feedback);
      if (validation.valid) {
        report.validFeedback++;
      } else {
        report.invalidFeedback++;
        report.errors.push({
          material: feedback.material,
          errors: validation.errors
        });
      }
      
      if (validation.warnings.length > 0) {
        report.warnings.push({
          material: feedback.material,
          warnings: validation.warnings
        });
      }
      
      // Collect statistics
      if (feedback.correct_result?.federal) {
        for (const code of feedback.correct_result.federal) {
          report.statistics.federalCodes[code] = (report.statistics.federalCodes[code] || 0) + 1;
        }
      }
      
      if (feedback.correct_result?.texas_form_code) {
        const fc = feedback.correct_result.texas_form_code;
        report.statistics.texasFormCodes[fc] = (report.statistics.texasFormCodes[fc] || 0) + 1;
      }
      
      const material = feedback.material.toLowerCase();
      report.statistics.materials[material] = (report.statistics.materials[material] || 0) + 1;
    }
    
    // Check for data quality issues
    if (report.invalidFeedback > 0) {
      report.qualityScore = (report.validFeedback / report.totalFeedback) * 100;
      report.recommendation = report.qualityScore < 80 
        ? 'Review and fix invalid entries before using for training'
        : 'Minor issues detected, consider fixing for better accuracy';
    } else {
      report.qualityScore = 100;
      report.recommendation = 'Training data is valid and ready to use';
    }
    
    return report;
  }
  
  // Auto-fix common issues
  autoFix(feedback) {
    const fixed = JSON.parse(JSON.stringify(feedback)); // Deep clone
    let changes = [];
    
    // Fix DOT UN format
    if (fixed.correct_result?.dot_un) {
      const un = fixed.correct_result.dot_un;
      if (!/^UN/.test(un) && /^\d{4}$/.test(un)) {
        fixed.correct_result.dot_un = `UN${un}`;
        changes.push(`Fixed DOT UN format: ${un} → UN${un}`);
      }
    }
    
    // Standardize material names
    const materialStandardization = {
      'diesel': 'Diesel Fuel',
      'batteries': 'Batteries',
      'battery': 'Batteries',
      'lab pack': 'Lab Pack',
      'paint': 'Paint Waste',
      'asbestos': 'Asbestos',
      'medical': 'Medical Waste'
    };
    
    const lowerMaterial = feedback.material.toLowerCase();
    for (const [key, standard] of Object.entries(materialStandardization)) {
      if (lowerMaterial === key) {
        fixed.material = standard;
        changes.push(`Standardized material name: ${feedback.material} → ${standard}`);
        break;
      }
    }
    
    // Remove invalid federal codes
    if (fixed.correct_result?.federal) {
      const validCodes = [];
      const removed = [];
      
      for (const code of fixed.correct_result.federal) {
        if (this.validateFederalCodes([code]).length === 0) {
          validCodes.push(code);
        } else {
          removed.push(code);
        }
      }
      
      if (removed.length > 0) {
        fixed.correct_result.federal = validCodes;
        changes.push(`Removed invalid codes: ${removed.join(', ')}`);
      }
    }
    
    return {
      fixed,
      changes,
      hasChanges: changes.length > 0
    };
  }
}

export default TrainingDataValidator;