// Deterministic Hazardous Waste Classifier v2.1 - LIQUEFIED GAS FIX  
// No AI - just direct rule application based on extracted data

import basicCasLookup from './basicCasLookup.js';

class DeterministicClassifier {
  constructor() {
    this.debug = true;
  }

  /**
   * Determine physical state from product name if not provided or incorrect
   */
  detectPhysicalState(productName, providedState) {
    const nameLower = productName.toLowerCase();
    
    // Check for aerosols first (highest priority)
    if (nameLower.includes('aerosol') || nameLower.includes('spray') || 
        nameLower.includes('wd-40') || nameLower.includes('wd40')) {
      return 'aerosol';
    }
    
    // Check for solids
    if (nameLower.includes('beads') || nameLower.includes('pellets') || 
        nameLower.includes('powder') || nameLower.includes('crystals') ||
        nameLower.includes('granular') || nameLower.includes('solid')) {
      return 'solid';
    }
    
    // Check for specific liquids
    if (nameLower.includes('solution') || nameLower.includes('liquid') ||
        nameLower.includes('oil') || nameLower.includes('fuel') ||
        nameLower.includes('acid') || nameLower.includes('solvent')) {
      return 'liquid';
    }
    
    // For known chemicals, determine state
    if (nameLower.includes('sodium hypochlorite') || nameLower.includes('bleach')) {
      return 'liquid'; // Sodium hypochlorite is always liquid solution
    }
    
    if (nameLower.includes('caustic soda beads') || nameLower.includes('sodium hydroxide beads')) {
      return 'solid';
    }
    
    // If provided state is 'gas' but product is not actually gas, default to liquid
    if (providedState === 'gas' && !nameLower.includes('gas') && !nameLower.includes('propane') && !nameLower.includes('butane')) {
      return 'liquid'; // Most "gas" misidentifications are actually liquids
    }
    
    // Use provided state if reasonable, otherwise default to liquid
    return providedState || 'liquid';
  }

  /**
   * Deterministic Hazardous Waste Classification
   * 
   * Performs rule-based classification without AI interpretation using exact
   * regulatory criteria for RCRA waste codes, Texas state codes, and DOT shipping.
   * 
   * Classification Rules:
   * - D001 (Ignitable): Flash point < 60°C (liquids only)
   * - D002 (Corrosive): pH ≤ 2.0 or pH ≥ 12.5 (liquids only)
   * - P/U codes: Based on CAS number lookup for listed chemicals
   * - F/K codes: Suggested for used/spent materials with warnings
   * - Texas Class 1: Any petroleum-based product (minimum classification)
   * - Texas Class 2: Non-hazardous waste with form codes
   * - Physical state detection: Corrects misidentified states
   * 
   * @param {Object} data - Extracted SDS data for classification
   * @param {string} data.productName - Product name from SDS
   * @param {Object|number|null} data.flashPoint - Flash point data
   * @param {number} [data.flashPoint.celsius] - Flash point in Celsius
   * @param {number|null} data.pH - pH value (0-14 scale)
   * @param {string} [data.physicalState='liquid'] - Physical state ('liquid'|'solid'|'aerosol')
   * @param {Array<Object>} [data.composition=[]] - Chemical composition
   * @param {string} data.composition[].name - Chemical name
   * @param {string} data.composition[].cas - CAS Registry Number
   * @param {number} data.composition[].percentage - Percentage in product
   * @param {string|null} data.unNumber - UN shipping number
   * @param {string|null} data.properShippingName - DOT proper shipping name
   * @returns {Object} Complete classification result with all applicable codes
   */
  classify(data) {
    const {
      productName = '',
      flashPoint = null, // {celsius: number} or number
      pH = null,         // number
      physicalState = 'liquid', // 'liquid' | 'solid' | 'aerosol'
      composition = [],   // array of {name, cas, percentage}
      unNumber = null,
      properShippingName = null,
      hazardStatements = null // hazard statements from SDS extraction
    } = data;
    
    // Fix physical state detection
    const correctedPhysicalState = this.detectPhysicalState(productName, physicalState);

    console.log(`🔍 DETERMINISTIC CLASSIFICATION (UPDATED VERSION 2.0): ${productName}`);
    console.log(`   Data: flashPoint=${JSON.stringify(flashPoint)}, pH=${pH}, physicalState=${physicalState}`);
    console.log(`   Shipping: unNumber=${unNumber}, properShippingName=${properShippingName}`);

    // IMPORTANT: Only use data explicitly provided in the SDS
    // Do NOT enhance or guess missing data from databases
    let enhancedFlashPoint = flashPoint;
    let enhancedPH = pH;
    
    // Log what data we actually have from the SDS
    console.log(`📋 SDS PROVIDED DATA ONLY:`);
    console.log(`   Flash Point: ${flashPoint ? JSON.stringify(flashPoint) : 'NOT PROVIDED'}`);
    console.log(`   pH: ${pH !== null ? pH : 'NOT PROVIDED'}`);
    console.log(`   Physical State: ${physicalState || 'NOT PROVIDED'}`);
    console.log(`   ⚠️ Classification based ONLY on SDS data, no database lookups`);

    const result = {
      productName: productName.trim(),
      flashPoint: this.normalizeFlashPoint(enhancedFlashPoint),
      pH: enhancedPH,
      physicalState: correctedPhysicalState.toLowerCase(),
      hazardStatements: hazardStatements?.hazardStatements || [],
      federal_codes: [],
      state_form_code: '102', // default
      state_classification: '2', // default Class 2 (Class 3 reserved for construction debris)
      state_codes: [],
      final_classification: 'non-hazardous',
      unNumber: unNumber,
      properShippingName: properShippingName,
      dataSource: 'SDS_ONLY', // Flag indicating we only use SDS data
      reasoning: ['Classification based ONLY on data explicitly provided in SDS']
    };

    // Step 1: Apply P/U-codes (Listed Wastes) - 40 CFR 261.31-261.33
    this.applyPUCodes(result, composition);

    // Step 2: Apply D001 (Ignitable) - 40 CFR 261.21
    this.applyD001(result);

    // Step 3: Apply D002 (Corrosive) - 40 CFR 261.22
    this.applyD002(result);

    // Step 4: Determine Texas Form Code (pass corrected physical state)
    this.determineTexasFormCode(result, correctedPhysicalState);

    // Step 4: Final classification
    result.final_classification = result.federal_codes.length > 0 ? 'hazardous' : 'non-hazardous';
    
    // Step 5: Determine Texas state classification with proper precedence
    if (result.federal_codes.length > 0) {
      // Federal hazardous always = H
      result.state_classification = 'H';
      console.log('   Texas: Federal hazardous → H');
    } else if (this.isCausticMaterial(result)) {
      // Caustic materials (even solids) = Class 1
      result.state_classification = '1';
      result.reasoning.push('Texas Class 1: Caustic/corrosive material');
      console.log('   Texas: Caustic material → Class 1');
    } else if (result.petroleumBased) {
      // Petroleum-based products with reportable hydrocarbon content = Minimum Class 1
      result.state_classification = '1';
      result.reasoning.push('Texas Class 1: Petroleum-based product (reportable hydrocarbon content)');
      console.log('   Texas: Petroleum-based product → Class 1');
    } else if (this.isPotentiallyHazardous(result)) {
      // Other hazardous properties = Class 1
      result.state_classification = '1';
      result.reasoning.push('Texas Class 1: Potentially hazardous material');
      console.log('   Texas: Potentially hazardous → Class 1');
    } else if (this.isIndustrialWaste(result)) {
      // Industrial wastes = Class 2
      result.state_classification = '2';
      result.reasoning.push('Texas Class 2: Industrial waste');
      console.log('   Texas: Industrial waste → Class 2');
    } else {
      // Default to Class 2 (Class 3 reserved for construction debris only)
      result.state_classification = '2';
      result.reasoning.push('Texas Class 2: Default classification (Class 3 reserved for construction debris)');
      console.log('   Texas: Default → Class 2 (field experience based)');
    }
    
    result.state_codes = [`${result.state_form_code}-${result.state_classification}`];

    // Step 8: Suggest F/K-codes for used materials
    this.suggestUsedWasteCodes(result, composition);

    console.log(`✅ RESULT: ${result.federal_codes.join(', ') || 'None'} | Form: ${result.state_form_code}-${result.state_classification}`);
    console.log(`   Reasoning: ${result.reasoning.join('; ')}`);

    return result;
  }

  normalizeFlashPoint(fp) {
    if (!fp) return { celsius: null, fahrenheit: null };
    
    if (typeof fp === 'number') {
      return {
        celsius: fp,
        fahrenheit: (fp * 9/5) + 32
      };
    }
    
    if (typeof fp === 'object' && fp.celsius !== undefined) {
      return {
        celsius: fp.celsius,
        fahrenheit: fp.fahrenheit || ((fp.celsius * 9/5) + 32)
      };
    }
    
    return { celsius: null, fahrenheit: null };
  }

  applyD001(result) {
    // D001 Ignitability - 40 CFR 261.21
    // (a)(1) Liquid with flash point < 60°C (140°F)
    // (a)(3) Compressed gas per DOT 49 CFR 173.115(b), (c), or (d)
    // (a)(4) Oxidizer per DOT 49 CFR 173.151
    
    // Aerosols: Only D001 if flammable (most commercial aerosols are, but not all)
    if (result.physicalState === 'aerosol') {
      const productName = result.productName.toLowerCase();
      
      // Check for non-flammable aerosols
      const nonFlammableKeywords = ['compressed air', 'nitrogen', 'co2', 'carbon dioxide'];
      if (nonFlammableKeywords.some(keyword => productName.includes(keyword))) {
        result.reasoning.push(`No D001: Non-flammable compressed gas/aerosol`);
        return false;
      }
      
      // Most commercial aerosols (WD-40, spray paint, etc.) are flammable
      result.federal_codes.push('D001');
      result.reasoning.push(`D001: Flammable aerosol (compressed gas per 40 CFR 261.21(a)(3))`);
      console.log(`🔧 UPDATED AEROSOL LOGIC APPLIED: ${result.productName}`);
      return true;
    }
    
    const fp = result.flashPoint;
    // Liquefied gas should be treated as liquid for D001 purposes (it's compressed into liquid form)
    const isLiquid = result.physicalState === 'liquid' || result.physicalState === 'liquefied gas' || result.physicalState === 'liquified gas';
    const isGas = result.physicalState === 'gas';
    
    console.log(`🚨 D001 LOGIC CHECK: physicalState="${result.physicalState}", isLiquid=${isLiquid}, flashPoint=${JSON.stringify(fp)}`);
    
    // Check for flammable liquids with flash point data
    if (fp.celsius !== null && isLiquid) {
      if (fp.celsius < 60) {
        result.federal_codes.push('D001');
        result.reasoning.push(`D001: Liquid with flash point ${fp.celsius}°C < 60°C`);
        return true;
      } else {
        result.reasoning.push(`No D001: Flash point ${fp.celsius}°C ≥ 60°C`);
      }
    } 
    // Check for flammable gases and liquified gases
    else if (isGas) {
      // Check for flammable gas indicators - flash point or hazard statements
      if (fp.celsius !== null && fp.celsius < 60) {
        result.federal_codes.push('D001');
        result.reasoning.push(`D001: Flammable gas/liquified gas with flash point ${fp.celsius}°C < 60°C`);
        return true;
      }
      
      // Check for H220/H221 hazard statements (extremely/highly flammable gas)
      const hazards = result.hazardStatements || [];
      if (hazards.includes('H220') || hazards.includes('H221')) {
        result.federal_codes.push('D001');
        result.reasoning.push(`D001: Flammable gas/liquified gas with H220/H221 hazard statement`);
        return true;
      }
      
      result.reasoning.push(`No D001: Gas/liquified gas without flammable indicators`);
    }
    // Liquids without flash point data
    else if (isLiquid) {
      result.reasoning.push(`No D001: No flash point data for liquid`);
    } 
    // Other physical states (solids, unknown states)
    else {
      result.reasoning.push(`No D001: Material is ${result.physicalState} (not classified as ignitable liquid, gas, or aerosol)`);
    }
    
    return false;
  }

  applyD002(result) {
    // D002 Corrosivity - 40 CFR 261.22
    // "(1) It is aqueous and has a pH less than or equal to 2 or greater than or equal to 12.5"

    const isLiquid = result.physicalState === 'liquid';
    const hasPH = result.pH !== null && result.pH !== undefined;

    if (isLiquid && hasPH) {
      // Handle pH ranges (e.g., "2.1-12.4")
      const pHData = this.parsePHRange(result.pH);

      if (pHData.isCorrosive) {
        result.federal_codes.push('D002');
        result.reasoning.push(`D002: Liquid with ${pHData.explanation}`);
        return true;
      } else {
        result.reasoning.push(`No D002: ${pHData.explanation}`);
      }
    } else if (isLiquid) {
      result.reasoning.push(`No D002: No pH data for liquid`);
    } else if (hasPH) {
      result.reasoning.push(`No D002: Material is ${result.physicalState} (solids cannot be D002)`);
    } else {
      result.reasoning.push(`No D002: Not liquid or no pH data`);
    }

    return false;
  }

  /**
   * Parse pH data which can be single value or range
   */
  parsePHRange(pHInput) {
    // Handle string ranges like "2.1-12.4"
    if (typeof pHInput === 'string' && pHInput.includes('-')) {
      const [minStr, maxStr] = pHInput.split('-').map(s => s.trim());
      const minPH = parseFloat(minStr);
      const maxPH = parseFloat(maxStr);

      if (!isNaN(minPH) && !isNaN(maxPH)) {
        // Check if range includes corrosive levels
        const isCorrosive = minPH <= 2 || maxPH >= 12.5;
        return {
          isCorrosive,
          explanation: isCorrosive
            ? `pH range ${pHInput} includes corrosive levels (≤2 or ≥12.5)`
            : `pH range ${pHInput} does not include corrosive levels`
        };
      }
    }

    // Handle single numeric values
    const pH = typeof pHInput === 'string' ? parseFloat(pHInput) : pHInput;
    if (!isNaN(pH)) {
      const isCorrosive = pH <= 2 || pH >= 12.5;
      return {
        isCorrosive,
        explanation: isCorrosive
          ? `pH ${pH} (≤2 or ≥12.5)`
          : `pH ${pH} is between 2-12.5`
      };
    }

    return {
      isCorrosive: false,
      explanation: `Invalid pH data: ${pHInput}`
    };
  }

  applyPUCodes(result, composition) {
    // Apply P/U-code Listed Wastes - 40 CFR 261.31-261.33
    // Check for hazardous CAS numbers that have been detected
    
    const hazardousCAS = {
      '127-18-4': 'U210', // Tetrachloroethylene
      '78-93-3': 'U159',  // Methyl ethyl ketone
      // Add more as needed
    };
    
    // Check if composition contains any hazardous CAS numbers
    if (composition && composition.length > 0) {
      composition.forEach(component => {
        if (component.cas && hazardousCAS[component.cas]) {
          const uCode = hazardousCAS[component.cas];
          if (!result.federal_codes.includes(uCode)) {
            result.federal_codes.push(uCode);
            result.reasoning.push(`${uCode}: Listed waste containing ${component.name || 'unknown'} (CAS ${component.cas})`);
            console.log(`   ${uCode}: Listed waste containing CAS ${component.cas}`);
          }
        }
      });
    } else {
      // Fallback: Check product name for known hazardous chemicals
      const productLower = result.productName.toLowerCase();
      
      if (productLower.includes('tetrachloroethylene') || productLower.includes('tetrachloroethene') ||
          productLower.includes('chlorinated brake') || productLower.includes('brake cleaner')) {
        if (!result.federal_codes.includes('U210')) {
          result.federal_codes.push('U210');
          result.reasoning.push('U210: Listed waste - Tetrachloroethylene (brake cleaner)');
          console.log('   U210: Listed waste - Tetrachloroethylene (brake cleaner product)');
        }
      }
      
      if (productLower.includes('methyl ethyl ketone') || productLower.includes('mek')) {
        if (!result.federal_codes.includes('U159')) {
          result.federal_codes.push('U159');
          result.reasoning.push('U159: Listed waste - Methyl ethyl ketone');
          console.log('   U159: Listed waste - Methyl ethyl ketone (from product name)');
        }
      }
    }
    
    // Flag petroleum-based products that would have reportable hydrocarbon content
    const productLower = result.productName.toLowerCase();
    if (productLower.includes('petroleum') || productLower.includes('grease') || 
        productLower.includes('oil') || productLower.includes('fuel') ||
        productLower.includes('diesel') || productLower.includes('brake') ||
        productLower.includes('solvent') || productLower.includes('thinner')) {
      result.petroleumBased = true; // Flag for petroleum-based material
    }
    
    return result.federal_codes.length > 0;
  }

  isCausticMaterial(result) {
    const name = result.productName.toLowerCase();
    
    // Check for caustic keywords
    const causticKeywords = [
      'caustic', 'sodium hydroxide', 'potassium hydroxide', 'lye',
      'alkaline', 'basic', 'corrosive', 'naoh', 'koh'
    ];
    
    if (causticKeywords.some(keyword => name.includes(keyword))) {
      return true;
    }
    
    // Check pH for corrosive levels (even for solids that would be corrosive when dissolved)
    if (result.pH !== null && (result.pH <= 2 || result.pH >= 12.5)) {
      return true;
    }
    
    return false;
  }
  
  isPotentiallyHazardous(result) {
    const name = result.productName.toLowerCase();
    
    // Check for hazardous keywords not covered by federal codes
    const hazardousKeywords = [
      'toxic', 'poison', 'flammable', 'combustible', 'reactive',
      'oxidizer', 'carcinogen', 'mutagen', 'solvent', 'thinner'
    ];
    
    return hazardousKeywords.some(keyword => name.includes(keyword));
  }
  
  isIndustrialWaste(result) {
    const name = result.productName.toLowerCase();
    
    const industrialKeywords = [
      'waste', 'spent', 'used', 'contaminated', 'residue',
      'sludge', 'filter', 'absorbent'
    ];
    
    return industrialKeywords.some(keyword => name.includes(keyword));
  }
  
  determineTexasFormCode(result, correctedPhysicalState = null) {
    const name = result.productName.toLowerCase();
    const physState = correctedPhysicalState || result.physicalState;
    
    // Priority 1: Aerosols
    if (physState === 'aerosol' || 
        name.includes('aerosol') || name.includes('spray') || 
        name.includes('wd-40') || name.includes('wd40')) {
      result.state_form_code = '208';
      result.reasoning.push(`Form 208: Aerosol product`);
      return;
    }
    
    // Priority 2: Organic solvents (higher priority than pH)
    if (name.includes('solvent') || name.includes('thinner') || 
        name.includes('acetone') || name.includes('alcohol') ||
        name.includes('methanol') || name.includes('spirits')) {
      result.state_form_code = '203';
      result.reasoning.push(`Form 203: Organic solvent`);
      return;
    }
    
    // Priority 3: Solids
    if (physState === 'solid' || 
        name.includes('beads') || name.includes('pellets') || 
        name.includes('powder') || name.includes('crystals')) {
      result.state_form_code = '204';
      result.reasoning.push(`Form 204: Solid material`);
      return;
    }
    
    // Priority 4: Acids and Bases (only for non-organic liquids)
    if (physState === 'liquid' && result.pH !== null) {
      if (result.pH <= 2) {
        result.state_form_code = '105';
        result.reasoning.push(`Form 105: Acid liquid (pH ${result.pH})`);
        return;
      } else if (result.pH >= 12.5) {
        result.state_form_code = '106';
        result.reasoning.push(`Form 106: Alkaline liquid (pH ${result.pH})`);
        return;
      }
    }
    
    // Priority 5: Petroleum products
    if (name.includes('diesel') || name.includes('fuel') || 
        name.includes('oil') || name.includes('petroleum')) {
      result.state_form_code = '202';
      result.reasoning.push(`Form 202: Petroleum product`);
      return;
    }
    
    // Default: Aqueous liquid
    result.state_form_code = '102';
    result.reasoning.push(`Form 102: Default liquid classification`);
  }

  /**
   * Suggest F-codes and K-codes for used materials
   * These are listed wastes from non-specific sources (F) or specific sources (K)
   */
  suggestUsedWasteCodes(result, composition) {
    const productName = result.productName.toLowerCase();
    
    // Initialize suggestions array
    if (!result.suggested_used_codes) {
      result.suggested_used_codes = [];
      result.used_waste_notes = [];
    }

    // F001 - Halogenated solvents used in degreasing
    const f001Solvents = [
      'tetrachloroethylene', 'trichloroethylene', 'methylene chloride', 
      '1,1,1-trichloroethane', 'carbon tetrachloride', 'chlorinated fluorocarbons'
    ];
    
    if (f001Solvents.some(solvent => productName.includes(solvent.toLowerCase())) ||
        productName.includes('degreaser') || productName.includes('brake clean')) {
      result.suggested_used_codes.push('F001');
      result.used_waste_notes.push('F001 - Consider if used for degreasing operations');
    }

    // F002 - Halogenated solvents from other operations  
    const f002Solvents = [
      'tetrachloroethylene', 'methylene chloride', 'trichloroethylene',
      'chlorobenzene', 'trichlorofluoromethane'
    ];
    
    if (f002Solvents.some(solvent => productName.includes(solvent.toLowerCase()))) {
      result.suggested_used_codes.push('F002');
      result.used_waste_notes.push('F002 - Consider if used in non-degreasing operations');
    }

    // F003 - Non-halogenated solvents
    const f003Solvents = [
      'xylene', 'acetone', 'ethyl acetate', 'ethyl benzene', 'ethyl ether',
      'methyl isobutyl ketone', 'mibk', 'n-butyl alcohol', 'cyclohexanone', 'methanol'
    ];
    
    if (f003Solvents.some(solvent => productName.includes(solvent.toLowerCase()))) {
      result.suggested_used_codes.push('F003');
      result.used_waste_notes.push('F003 - Consider if used as solvent');
    }

    // F004 - Non-halogenated solvents (cresols, nitrobenzene)
    if (productName.includes('cresol') || productName.includes('cresylic') || 
        productName.includes('nitrobenzene')) {
      result.suggested_used_codes.push('F004');
      result.used_waste_notes.push('F004 - Consider if used as solvent');
    }

    // F005 - Non-halogenated solvents (toluene, MEK, etc.)
    const f005Solvents = [
      'toluene', 'methyl ethyl ketone', 'mek', 'carbon disulfide', 
      'isobutanol', 'pyridine', 'benzene', '2-ethoxyethanol', '2-nitropropane'
    ];
    
    if (f005Solvents.some(solvent => productName.includes(solvent.toLowerCase()))) {
      result.suggested_used_codes.push('F005');
      result.used_waste_notes.push('F005 - Consider if used as solvent');
    }

    // K-codes for specific industries
    if (productName.includes('wood preserv') || productName.includes('creosote') ||
        productName.includes('pentachlorophenol')) {
      result.suggested_used_codes.push('K001');
      result.used_waste_notes.push('K001 - Consider if from wood preserving operations');
    }

    if (productName.includes('petroleum') && (productName.includes('refin') || 
        productName.includes('crude'))) {
      result.suggested_used_codes.push('K048');
      result.used_waste_notes.push('K048 - Consider if from petroleum refining');
    }

    // Add general note if any suggestions were made
    if (result.suggested_used_codes.length > 0) {
      result.used_waste_notes.unshift('⚠️ IMPORTANT: These codes only apply if the material is USED/SPENT');
      result.reasoning.push(`Suggested used waste codes: ${result.suggested_used_codes.join(', ')} (if material is spent/used)`);
      
      console.log(`🔄 USED WASTE CODE SUGGESTIONS: ${result.suggested_used_codes.join(', ')}`);
      result.suggested_used_codes.forEach(code => {
        console.log(`   ${code}: Check if material is spent/used`);
      });
    }
  }
}

export default new DeterministicClassifier();