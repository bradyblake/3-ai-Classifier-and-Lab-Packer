// ENVIRONMENTAL CHEMIST LAB PACK COMPATIBILITY ENGINE
// Advanced chemical compatibility analysis for lab pack planning
// Based on EPA RCRA and DOT regulations with professional environmental chemist standards

export class LabPackCompatibilityEngine {
  constructor() {
    // COMPREHENSIVE LAB PACK COMPATIBILITY MATRIX
    // Designed by Environmental Chemist Standards - EPA RCRA + DOT Compliant
    this.labPackCategories = {
      
      // GROUP 1: FLAMMABLE LIQUIDS (DOT Class 3)
      'flammable_organic': {
        name: 'Flammable Organic Liquids',
        description: 'Organic compounds with flash point <60°C',
        dot_class: '3',
        incompatible_categories: ['oxidizers', 'acids_oxidizing', 'reactive_metals', 'aerosols'],
        compatible_categories: ['toxic_organic'],
        packaging: 'Secondary containment, absorbent material, fire prevention'
      },
      
      'flammable_petroleum': {
        name: 'Petroleum Products',
        description: 'Petroleum-based flammable liquids',
        dot_class: '3',
        incompatible_categories: ['oxidizers', 'acids_oxidizing', 'reactive_metals', 'aerosols'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Vapor-tight containers, static control'
      },
      
      // GROUP 2: CORROSIVE ACIDS (DOT Class 8)
      'acids_inorganic': {
        name: 'Inorganic Acids',
        description: 'Mineral acids, pH ≤2',
        dot_class: '8',
        incompatible_categories: ['bases_inorganic', 'bases_organic', 'reactive_metals', 'cyanides', 'aerosols'],
        compatible_categories: [],
        packaging: 'Acid-resistant containers, secondary containment'
      },
      
      'acids_organic': {
        name: 'Organic Acids',
        description: 'Carbon-containing acids',
        dot_class: '8',
        incompatible_categories: ['bases_inorganic', 'bases_organic', 'reactive_metals'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Corrosion-resistant containers'
      },
      
      'acids_oxidizing': {
        name: 'Oxidizing Acids',
        description: 'Acids with strong oxidizing properties',
        dot_class: '8+5.1',
        incompatible_categories: ['ALL'], // Cannot mix with anything
        compatible_categories: [],
        packaging: 'SEPARATE PACKAGING MANDATORY - special handling required'
      },
      
      // GROUP 3: CORROSIVE BASES (DOT Class 8)
      'bases_inorganic': {
        name: 'Inorganic Bases',
        description: 'Mineral bases, pH ≥12.5, LIQUIDS ONLY',
        dot_class: '8',
        incompatible_categories: ['acids_inorganic', 'acids_organic', 'acids_oxidizing', 'reactive_metals'],
        compatible_categories: ['non_hazardous_liquids'],
        packaging: 'Base-resistant containers, vapor control'
      },
      
      'bases_organic': {
        name: 'Organic Bases',
        description: 'Nitrogen-containing basic compounds',
        dot_class: '8',
        incompatible_categories: ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Vapor-tight containers'
      },
      
      // GROUP 4: OXIDIZERS (DOT Class 5.1)
      'oxidizers': {
        name: 'Oxidizing Agents',
        description: 'Chemicals that readily give up oxygen',
        dot_class: '5.1',
        incompatible_categories: ['flammable_organic', 'flammable_petroleum', 'reactive_metals'],
        compatible_categories: ['toxic_inorganic'],
        packaging: 'Non-combustible absorbent, ventilation'
      },
      
      // GROUP 5: TOXIC MATERIALS (DOT Class 6.1)
      'toxic_inorganic': {
        name: 'Inorganic Toxic Materials',
        description: 'Heavy metals and inorganic poisons',
        dot_class: '6.1',
        incompatible_categories: ['reactive_metals', 'cyanides'],
        compatible_categories: ['oxidizers'],
        packaging: 'Leak-proof containers, double containment'
      },
      
      'toxic_organic': {
        name: 'Organic Toxic Materials',
        description: 'Carbon-containing toxic compounds',
        dot_class: '6.1',
        incompatible_categories: ['reactive_metals'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Vapor-tight, chemical-resistant containers'
      },
      
      'cyanides': {
        name: 'Cyanide Compounds',
        description: 'Cyanide-containing materials',
        dot_class: '6.1',
        incompatible_categories: ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
        compatible_categories: [],
        packaging: 'SEPARATE CONTAINER MANDATORY - special labeling required'
      },
      
      // GROUP 6: REACTIVE MATERIALS (DOT Class 4.2/4.3)
      'reactive_metals': {
        name: 'Reactive Metals',
        description: 'Water-reactive and pyrophoric metals',
        dot_class: '4.3',
        incompatible_categories: ['ALL'], // Generally incompatible with most materials
        compatible_categories: [],
        packaging: 'SEPARATE CONTAINER - inert atmosphere, moisture barrier'
      },
      
      // GROUP 7: AEROSOLS & COMPRESSED GASES (DOT Class 2.1/2.2)
      'aerosols': {
        name: 'Aerosols & Compressed Gases',
        description: 'Pressurized containers',
        dot_class: '2.1/2.2',
        incompatible_categories: ['ALL'], // Must be separate from all liquids
        compatible_categories: [], // Only other aerosols
        packaging: 'SEPARATE CONTAINER MANDATORY - pressure relief considerations'
      },
      
      // GROUP 8: NON-HAZARDOUS MATERIALS
      'non_hazardous_liquids': {
        name: 'Non-Hazardous Liquids',
        description: 'Non-RCRA aqueous solutions and oils',
        dot_class: 'none',
        incompatible_categories: [],
        compatible_categories: ['non_hazardous_solids'],
        packaging: 'Standard containers, absorbent material'
      },
      
      'non_hazardous_solids': {
        name: 'Non-Hazardous Solids',
        description: 'Solid materials not regulated under RCRA',
        dot_class: 'none',
        incompatible_categories: [],
        compatible_categories: ['non_hazardous_liquids'],
        packaging: 'Standard containers, moisture protection'
      }
    };
  }

  /**
   * ENVIRONMENTAL CHEMIST CLASSIFICATION SYSTEM
   * Determines primary category and subcategory for lab pack compatibility
   */
  classifyMaterial(materialData) {
    console.log('🧪 ENVIRONMENTAL CHEMIST ANALYSIS:', materialData.productName);
    console.log('🧪 COMPOSITION DATA:', materialData.composition || materialData.constituents);
    
    const productName = (materialData.productName || '').toLowerCase();
    const hazardClass = materialData.dotShipping?.hazardClass || materialData.hazardClass;
    const pH = materialData.pH;
    const flashPoint = materialData.flashPoint?.fahrenheit || materialData.flashPoint;
    const physicalState = (materialData.physicalState || '').toLowerCase();
    const federalCodes = materialData.rcraCharacteristic || materialData.classification?.dCodes || [];
    
    // COMPOSITION-BASED ANALYSIS: Use actual SDS composition data for accuracy
    const constituents = materialData.composition || materialData.constituents || [];
    console.log('🧪 CONSTITUENTS COUNT:', constituents.length);
    
    // Check constituents for specific hazardous chemicals
    let hasHypochlorite = false;
    let hasCyanide = false;
    let hasPeroxide = false;
    let hasNitricAcid = false;
    let hasReactiveMetals = false;
    let primaryConstituent = null;
    
    for (const constituent of constituents) {
      const constituentName = (constituent.name || '').toLowerCase();
      console.log(`🧪 ANALYZING CONSTITUENT: ${constituent.name} (${constituent.concentration}%)`);
      
      if (constituentName.includes('hypochlorite')) {
        hasHypochlorite = true;
        primaryConstituent = constituent;
      }
      if (constituentName.includes('cyanide')) {
        hasCyanide = true;
        primaryConstituent = constituent;
      }
      if (constituentName.includes('peroxide')) {
        hasPeroxide = true;
        primaryConstituent = constituent;
      }
      if (constituentName.includes('nitric') && constituentName.includes('acid')) {
        hasNitricAcid = true;
        primaryConstituent = constituent;
      }
      if (constituentName.includes('sodium metal') || constituentName.includes('potassium metal')) {
        hasReactiveMetals = true;
        primaryConstituent = constituent;
      }
      
      // Track highest concentration constituent
      if (!primaryConstituent || (constituent.concentration > primaryConstituent.concentration)) {
        primaryConstituent = constituent;
      }
    }
    
    console.log('🧪 CONSTITUENT ANALYSIS:', { hasHypochlorite, hasCyanide, hasPeroxide, hasNitricAcid, hasReactiveMetals, primaryConstituent });
    
    // ENHANCED CLASSIFICATION: Use composition data to SUPPLEMENT existing logic, not replace it
    let compositionEnhancement = null;
    
    // Only use composition data if we have high-confidence constituent matches
    if (hasHypochlorite && primaryConstituent?.concentration > 1) {
      compositionEnhancement = {
        enhancedCategory: 'oxidizers',
        enhancedSubcategory: 'hypochlorites', 
        compositionDetails: `${primaryConstituent.concentration}% ${primaryConstituent.name}`,
        compositionReasoning: 'Hypochlorite oxidizer detected in composition'
      };
    } else if (hasCyanide && primaryConstituent?.concentration > 0.1) {
      compositionEnhancement = {
        enhancedCategory: 'cyanides',
        enhancedSubcategory: 'alkali_cyanides',
        compositionDetails: `${primaryConstituent.concentration}% ${primaryConstituent.name}`,
        compositionReasoning: 'Cyanide compound detected in composition - DEADLY WITH ACIDS'
      };
    } else if (hasPeroxide && primaryConstituent?.concentration > 1) {
      compositionEnhancement = {
        enhancedCategory: 'oxidizers',
        enhancedSubcategory: 'peroxides',
        compositionDetails: `${primaryConstituent.concentration}% ${primaryConstituent.name}`,
        compositionReasoning: 'Peroxide compound detected - shock sensitive'
      };
    } else if (hasNitricAcid && primaryConstituent?.concentration > 5) {
      compositionEnhancement = {
        enhancedCategory: 'acids_oxidizing', 
        enhancedSubcategory: 'nitric_chromic_acids',
        compositionDetails: `${primaryConstituent.concentration}% ${primaryConstituent.name}`,
        compositionReasoning: 'Nitric acid detected - oxidizing acid'
      };
    }
    
    console.log('🧪 COMPOSITION ENHANCEMENT:', compositionEnhancement);
    
    // PRIORITY 1: AEROSOLS & COMPRESSED GASES (HIGHEST PRIORITY - NEVER MIX)
    if (this.isAerosol(productName, hazardClass, physicalState)) {
      return {
        primaryCategory: 'aerosols',
        subcategory: 'pressurized_containers',
        segregationLevel: 'extreme',
        specialHandling: ['SEPARATE CONTAINER REQUIRED - Cannot mix with any liquids'],
        incompatibleWith: ['ALL'],
        reasoning: 'Pressurized container - explosion hazard if mixed with liquids'
      };
    }
    
    // PRIORITY 2: OXIDIZING ACIDS (EXTREMELY DANGEROUS - SEPARATE ALWAYS)
    if (this.isOxidizingAcid(productName)) {
      return {
        primaryCategory: 'acids_oxidizing',
        subcategory: 'nitric_chromic_acids',
        segregationLevel: 'extreme',
        specialHandling: ['MANDATORY SEPARATE CONTAINER - Cannot mix with anything'],
        incompatibleWith: ['ALL'],
        reasoning: 'Oxidizing acid - violent reaction with all other chemicals'
      };
    }
    
    // PRIORITY 3: CYANIDES (DEADLY WITH ACIDS)
    if (this.isCyanide(productName)) {
      return {
        primaryCategory: 'cyanides',
        subcategory: 'alkali_cyanides',
        segregationLevel: 'extreme',
        specialHandling: ['NEVER WITH ACIDS - Generates deadly HCN gas'],
        incompatibleWith: ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
        reasoning: 'Cyanide compound - deadly gas formation with acids'
      };
    }
    
    // PRIORITY 4: REACTIVE METALS (WATER REACTIVE)
    if (this.isReactiveMetal(productName, hazardClass)) {
      return {
        primaryCategory: 'reactive_metals',
        subcategory: 'water_reactive_metals',
        segregationLevel: 'extreme',
        specialHandling: ['KEEP DRY - Violent water reaction', 'SEPARATE CONTAINER REQUIRED'],
        incompatibleWith: ['ALL'],
        reasoning: 'Water-reactive metal - fire/explosion risk'
      };
    }
    
    // PRIORITY 5: FLAMMABLE LIQUIDS (DOT CLASS 3)
    if (this.isFlammable(flashPoint, hazardClass, federalCodes, productName)) {
      const category = this.isPetroleumProduct(productName) ? 'flammable_petroleum' : 'flammable_organic';
      const subcategory = this.getFlammableSubcategory(productName);
      
      // Enhanced special handling based on subcategory
      let specialHandling = ['Fire prevention measures', 'Absorbent material required'];
      
      if (subcategory === 'ethers') {
        specialHandling.push('Check for peroxide formation', 'Date received tracking required');
      } else if (subcategory === 'halogenated_solvents') {
        specialHandling.push('Vapor control required', 'Ground/bond containers');
      } else if (subcategory === 'aromatic_hydrocarbons') {
        specialHandling.push('Vapor control essential', 'Keep cool (<25°C preferred)');
      } else if (subcategory === 'alcohols') {
        specialHandling.push('Compatible with most organic solvents', 'Moisture control');
      }
      
      const result = {
        primaryCategory: category,
        subcategory: subcategory,
        segregationLevel: 'high',
        specialHandling: specialHandling,
        incompatibleWith: ['oxidizers', 'acids_oxidizing', 'reactive_metals', 'aerosols'],
        reasoning: `Flammable ${subcategory} with ${flashPoint ? `flash point ${flashPoint}°` : 'ignitability hazard'}`
      };
      
      return this.enhanceClassificationWithComposition(result, compositionEnhancement, primaryConstituent);
    }
    
    // PRIORITY 6: CORROSIVE ACIDS (pH ≤ 2, LIQUIDS ONLY)
    if (this.isAcid(pH, physicalState)) {
      const category = this.isOrganicAcid(productName) ? 'acids_organic' : 'acids_inorganic';
      return {
        primaryCategory: category,
        subcategory: this.getAcidSubcategory(productName),
        segregationLevel: 'high',
        specialHandling: ['Secondary containment required', 'Separate from bases'],
        incompatibleWith: ['bases_inorganic', 'bases_organic', 'reactive_metals', 'cyanides'],
        reasoning: `Acid with pH ${pH} (liquid form)`
      };
    }
    
    // PRIORITY 7: CORROSIVE BASES (pH ≥ 12.5, LIQUIDS ONLY)
    if (this.isBase(pH, physicalState)) {
      return {
        primaryCategory: 'bases_inorganic',
        subcategory: 'alkali_hydroxides',
        segregationLevel: 'high',
        specialHandling: ['Secondary containment required', 'Separate from acids'],
        incompatibleWith: ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
        reasoning: `Base with pH ${pH} (liquid form)`
      };
    }
    
    // PRIORITY 8: OXIDIZERS (DOT CLASS 5.1)  
    if (this.isOxidizer(hazardClass, productName)) {
      const result = {
        primaryCategory: 'oxidizers',
        subcategory: this.getOxidizerSubcategory(productName),
        segregationLevel: 'high',
        specialHandling: ['Keep from combustibles', 'Non-combustible absorbent'],
        incompatibleWith: ['flammable_organic', 'flammable_petroleum', 'reactive_metals'],
        reasoning: 'Oxidizing agent - fire hazard with combustibles'
      };
      
      return this.enhanceClassificationWithComposition(result, compositionEnhancement, primaryConstituent);
    }
    
    // PRIORITY 9: TOXIC MATERIALS (DOT CLASS 6.1)
    if (this.isToxic(hazardClass, federalCodes, productName)) {
      const category = this.isOrganicToxic(productName) ? 'toxic_organic' : 'toxic_inorganic';
      return {
        primaryCategory: category,
        subcategory: this.getToxicSubcategory(productName),
        segregationLevel: 'moderate',
        specialHandling: ['Leak-proof containers', 'Vapor control'],
        incompatibleWith: ['reactive_metals'],
        reasoning: 'Toxic material requiring special handling'
      };
    }
    
    // PRIORITY 10: NON-HAZARDOUS MATERIALS
    // Solid caustics are non-hazardous until dissolved
    if (this.isSolidCaustic(productName, physicalState)) {
      return {
        primaryCategory: 'non_hazardous_solids',
        subcategory: 'inorganic_solids',
        segregationLevel: 'low',
        specialHandling: ['Solid caustic - non-hazardous until dissolved'],
        incompatibleWith: [],
        reasoning: 'Solid caustic material - non-hazardous in solid form'
      };
    }
    
    // Other non-hazardous materials
    let result;
    if (physicalState === 'liquid') {
      result = {
        primaryCategory: 'non_hazardous_liquids',
        subcategory: 'aqueous_solutions',
        segregationLevel: 'low',
        specialHandling: [],
        incompatibleWith: [],
        reasoning: 'Non-RCRA regulated liquid'
      };
    } else {
      result = {
        primaryCategory: 'non_hazardous_solids',
        subcategory: 'inorganic_solids',
        segregationLevel: 'low',
        specialHandling: [],
        incompatibleWith: [],
        reasoning: 'Non-RCRA regulated solid'
      };
    }

    // ENHANCE RESULT WITH COMPOSITION DATA (if available)
    return this.enhanceClassificationWithComposition(result, compositionEnhancement, primaryConstituent);
  }
  
  // Helper method to enhance classification results with composition data
  enhanceClassificationWithComposition(baseResult, compositionEnhancement, primaryConstituent) {
    if (!compositionEnhancement) {
      // No composition enhancement, but add constituent info if available
      if (primaryConstituent && primaryConstituent.concentration > 5) {
        baseResult.compositionInfo = `Primary constituent: ${primaryConstituent.name} (${primaryConstituent.concentration}%)`;
        baseResult.reasoning += ` - Contains ${primaryConstituent.name}`;
      }
      return baseResult;
    }
    
    console.log('🧪 ENHANCING CLASSIFICATION WITH COMPOSITION DATA');
    
    // If composition data suggests a different category, use that for critical safety chemicals
    if (['cyanides', 'acids_oxidizing', 'peroxides'].includes(compositionEnhancement.enhancedCategory)) {
      // Override for critical safety categories
      baseResult.primaryCategory = compositionEnhancement.enhancedCategory;
      baseResult.subcategory = compositionEnhancement.enhancedSubcategory;
      baseResult.segregationLevel = 'extreme';
      baseResult.reasoning = `${compositionEnhancement.compositionReasoning} (composition-based override)`;
      
      // Set appropriate incompatibilities for critical chemicals
      if (compositionEnhancement.enhancedCategory === 'cyanides') {
        baseResult.incompatibleWith = ['acids_inorganic', 'acids_organic', 'acids_oxidizing', 'oxidizers'];
        baseResult.specialHandling = ['NEVER WITH ACIDS - Generates deadly HCN gas', compositionEnhancement.compositionDetails];
      } else if (compositionEnhancement.enhancedCategory === 'acids_oxidizing') {
        baseResult.incompatibleWith = ['ALL'];
        baseResult.specialHandling = ['MANDATORY SEPARATE CONTAINER', compositionEnhancement.compositionDetails];
      } else if (compositionEnhancement.enhancedCategory === 'peroxides') {
        baseResult.incompatibleWith = ['ALL'];
        baseResult.specialHandling = ['SHOCK-SENSITIVE - Handle carefully', compositionEnhancement.compositionDetails];
      }
    } else {
      // For other categories, enhance but don't override
      baseResult.subcategory = compositionEnhancement.enhancedSubcategory || baseResult.subcategory;
      baseResult.compositionInfo = compositionEnhancement.compositionDetails;
      baseResult.reasoning += ` - ${compositionEnhancement.compositionReasoning}`;
      
      // Add composition-specific special handling
      if (!baseResult.specialHandling) baseResult.specialHandling = [];
      baseResult.specialHandling.push(compositionEnhancement.compositionDetails);
    }
    
    return baseResult;
  }
  
  // Helper methods for classification
  isAerosol(productName, hazardClass, physicalState) {
    const aerosolIndicators = ['aerosol', 'spray', 'wd-40', 'wd40', 'compressed', 'pressurized'];
    return aerosolIndicators.some(indicator => productName.includes(indicator)) ||
           physicalState === 'aerosol' ||
           ['2.1', '2.2'].includes(hazardClass);
  }
  
  isOxidizingAcid(productName) {
    return ['nitric acid', 'chromic acid', 'perchloric acid'].some(acid => productName.includes(acid));
  }
  
  isCyanide(productName) {
    return productName.includes('cyanide');
  }
  
  isReactiveMetal(productName, hazardClass) {
    const reactiveMetals = ['sodium metal', 'potassium metal', 'lithium metal'];
    return reactiveMetals.some(metal => productName.includes(metal)) || hazardClass === '4.3';
  }
  
  isFlammable(flashPoint, hazardClass, federalCodes, productName) {
    // SAFETY CHECK: Oxidizers are NOT flammable
    if (this.isOxidizer(hazardClass, productName)) {
      return false; // Oxidizers like sodium hypochlorite are not flammable
    }
    
    // Flash point threshold: 60°C = 140°F for D001 ignitability
    // Handle both Celsius and Fahrenheit inputs
    let flashPointF = null;
    if (flashPoint !== null) {
      // Assume input is in Fahrenheit if > 100, otherwise Celsius
      flashPointF = flashPoint > 100 ? flashPoint : (flashPoint * 9/5) + 32;
    }
    
    return (flashPointF !== null && flashPointF < 140) ||
           hazardClass === '3' ||
           (federalCodes && federalCodes.includes('D001')) ||
           this.hasFlammableTerms(productName);
  }
  
  hasFlammableTerms(productName) {
    if (!productName) return false;
    const lowerName = productName.toLowerCase();
    
    // EXCLUSION LIST: Known non-flammable materials
    const nonFlammableTerms = [
      'hypochlorite', 'bleach', 'peroxide', 'permanganate', 
      'nitric acid', 'chromic acid', 'perchloric acid',
      'sodium hydroxide', 'potassium hydroxide', 'caustic'
    ];
    
    // If it contains non-flammable terms, it's not flammable
    if (nonFlammableTerms.some(term => lowerName.includes(term))) {
      return false;
    }
    
    const flammableTerms = [
      'acetone', 'methanol', 'ethanol', 'isopropanol', 'toluene', 'xylene',
      'benzene', 'hexane', 'heptane', 'cyclohexane', 'diethyl ether',
      'flammable', 'ignitable', 'solvent', 'thinner'
    ];
    return flammableTerms.some(term => lowerName.includes(term));
  }
  
  isPetroleumProduct(productName) {
    if (!productName) return false;
    const lowerName = productName.toLowerCase();
    
    // Petroleum-based products
    const petroleumTerms = [
      'gasoline', 'diesel', 'petroleum', 'naphtha', 'mineral spirits', 
      'paint thinner', 'stoddard solvent', 'white spirit', 'kerosene',
      'fuel oil', 'crude oil', 'motor oil'
    ];
    
    // Non-petroleum organic solvents (should NOT be petroleum category)
    const nonPetroleumOrganics = [
      'acetone', 'methanol', 'ethanol', 'isopropanol', 'butanol',
      'ethyl acetate', 'methyl acetate', 'dichloromethane', 'chloroform',
      'diethyl ether', 'tetrahydrofuran', 'dimethylformamide'
    ];
    
    // If it's explicitly a non-petroleum organic, return false
    if (nonPetroleumOrganics.some(term => lowerName.includes(term))) {
      return false;
    }
    
    return petroleumTerms.some(term => lowerName.includes(term));
  }
  
  isAcid(pH, physicalState) {
    return physicalState === 'liquid' && pH !== null && pH <= 2;
  }
  
  isBase(pH, physicalState) {
    return physicalState === 'liquid' && pH !== null && pH >= 12.5;
  }
  
  isOrganicAcid(productName) {
    const organicAcids = ['acetic', 'citric', 'formic', 'oxalic'];
    return organicAcids.some(acid => productName.includes(acid));
  }
  
  isOxidizer(hazardClass, productName) {
    const lowerName = productName ? productName.toLowerCase() : '';
    // Check for explicit oxidizer indicators
    const oxidizerTerms = ['peroxide', 'hypochlorite', 'bleach', 'permanganate', 'chlorate', 'perchlorate', 'nitrate', 'chromate'];
    return hazardClass === '5.1' || oxidizerTerms.some(ox => lowerName.includes(ox));
  }
  
  isToxic(hazardClass, federalCodes, productName) {
    return hazardClass === '6.1' ||
           (federalCodes && federalCodes.some(code => code.startsWith('D'))) ||
           ['mercury', 'lead', 'cadmium', 'arsenic'].some(metal => productName.includes(metal));
  }
  
  isOrganicToxic(productName) {
    const organicToxics = ['methylene chloride', 'chloroform', 'pesticide'];
    return organicToxics.some(tox => productName.includes(tox));
  }
  
  isSolidCaustic(productName, physicalState) {
    return physicalState === 'solid' &&
           (productName.includes('sodium hydroxide') ||
            productName.includes('caustic soda') ||
            productName.includes('potassium hydroxide') ||
            productName.includes('beads') || productName.includes('pellets'));
  }
  
  // Subcategory determination methods
  getFlammableSubcategory(productName) {
    if (!productName) return 'general_organics';
    const lowerName = productName.toLowerCase();
    
    // Alcohols
    if (lowerName.includes('alcohol') || 
        ['methanol', 'ethanol', 'isopropanol', 'butanol', 'propanol'].some(term => lowerName.includes(term))) {
      return 'alcohols';
    }
    
    // Ketones
    if (lowerName.includes('ketone') || lowerName.includes('acetone') || 
        ['butanone', 'methyl ethyl ketone', 'mek'].some(term => lowerName.includes(term))) {
      return 'ketones';
    }
    
    // Aromatic hydrocarbons
    if (['benzene', 'toluene', 'xylene', 'styrene', 'cumene'].some(term => lowerName.includes(term))) {
      return 'aromatic_hydrocarbons';
    }
    
    // Aliphatic hydrocarbons
    if (['hexane', 'heptane', 'octane', 'cyclohexane', 'pentane'].some(term => lowerName.includes(term))) {
      return 'aliphatic_hydrocarbons';
    }
    
    // Esters
    if (lowerName.includes('acetate') || lowerName.includes('ester') ||
        ['ethyl acetate', 'methyl acetate', 'butyl acetate'].some(term => lowerName.includes(term))) {
      return 'esters';
    }
    
    // Ethers
    if (lowerName.includes('ether') ||
        ['diethyl ether', 'tetrahydrofuran', 'dioxane'].some(term => lowerName.includes(term))) {
      return 'ethers';
    }
    
    // Halogenated solvents
    if (['dichloromethane', 'chloroform', 'carbon tetrachloride', 'trichloroethylene'].some(term => lowerName.includes(term))) {
      return 'halogenated_solvents';
    }
    
    return 'general_organics';
  }
  
  getAcidSubcategory(productName) {
    const strongAcids = ['hydrochloric', 'sulfuric', 'nitric'];
    return strongAcids.some(acid => productName.includes(acid)) ? 'strong_acids' : 'weak_acids';
  }
  
  getOxidizerSubcategory(productName) {
    if (productName.includes('peroxide')) return 'peroxides';
    if (productName.includes('hypochlorite')) return 'hypochlorites';
    if (productName.includes('permanganate')) return 'permanganates';
    return 'general_oxidizers';
  }
  
  getToxicSubcategory(productName) {
    if (productName.includes('mercury') || productName.includes('lead')) return 'heavy_metals';
    if (productName.includes('pesticide')) return 'pesticides';
    return 'general_toxic';
  }

  /**
   * ENVIRONMENTAL CHEMIST COMPATIBILITY CHECKER
   * Determines if two materials can be safely packed together
   */
  checkCompatibility(material1, material2) {
    const classification1 = this.classifyMaterial(material1);
    const classification2 = this.classifyMaterial(material2);
    
    // console.log(`🔬 Checking compatibility: ${material1.productName} vs ${material2.productName}`);
    // console.log(`   Categories: ${classification1.primaryCategory} vs ${classification2.primaryCategory}`);
    
    // ABSOLUTE INCOMPATIBILITIES
    if (classification1.segregationLevel === 'extreme' || classification2.segregationLevel === 'extreme') {
      return {
        compatible: false,
        severity: 'EXTREME',
        reason: 'One or both materials require separate container - extreme safety hazard',
        recommendations: ['MANDATORY SEPARATE CONTAINERS']
      };
    }
    
    // Check if categories are fundamentally incompatible
    if (classification1.incompatibleWith.includes('ALL') || classification2.incompatibleWith.includes('ALL')) {
      return {
        compatible: false,
        severity: 'EXTREME',
        reason: 'Material cannot be mixed with any other chemicals',
        recommendations: ['SEPARATE CONTAINER REQUIRED']
      };
    }
    
    if (classification1.incompatibleWith.includes(classification2.primaryCategory) ||
        classification2.incompatibleWith.includes(classification1.primaryCategory)) {
      return {
        compatible: false,
        severity: 'HIGH',
        reason: this.getIncompatibilityReason(classification1.primaryCategory, classification2.primaryCategory),
        recommendations: ['Separate containers required', 'Chemical incompatibility']
      };
    }
    
    // Compatible materials
    return {
      compatible: true,
      severity: 'NONE',
      reason: 'No incompatibilities identified',
      recommendations: ['Can be packed together with proper absorbent']
    };
  }
  
  getIncompatibilityReason(cat1, cat2) {
    if (cat1 === 'aerosols' || cat2 === 'aerosols') return 'Pressurized containers cannot mix with liquids';
    if (cat1 === 'acids_oxidizing' || cat2 === 'acids_oxidizing') return 'Oxidizing acids react violently with all chemicals';
    if ((cat1.includes('acids') && cat2.includes('bases')) || (cat1.includes('bases') && cat2.includes('acids'))) {
      return 'Acids and bases create violent neutralization reactions';
    }
    if ((cat1.includes('flammable') && cat2 === 'oxidizers') || (cat1 === 'oxidizers' && cat2.includes('flammable'))) {
      return 'Flammables with oxidizers create fire/explosion hazards';
    }
    if ((cat1 === 'cyanides' && cat2.includes('acids')) || (cat2 === 'cyanides' && cat1.includes('acids'))) {
      return 'Cyanides with acids generate deadly hydrogen cyanide gas';
    }
    return 'Chemical incompatibility - potential dangerous reaction';
  }

  /**
   * Generate lab pack assignments with proper segregation
   */
  generateLabPackAssignments(materials) {
    // console.log('🧪 ENVIRONMENTAL CHEMIST LAB PACK ASSIGNMENT');
    
    const assignments = [];
    const processed = new Set();
    
    // Group materials by category first
    const categoryGroups = {};
    materials.forEach(material => {
      const classification = this.classifyMaterial(material);
      const category = classification.primaryCategory;
      
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push({
        material,
        classification
      });
    });
    
    // Process categories in safety priority order
    const priorityOrder = [
      'aerosols', 'acids_oxidizing', 'reactive_metals', 'cyanides',
      'flammable_organic', 'flammable_petroleum', 'oxidizers',
      'acids_inorganic', 'acids_organic', 'bases_inorganic', 'bases_organic',
      'toxic_inorganic', 'toxic_organic',
      'non_hazardous_liquids', 'non_hazardous_solids'
    ];
    
    priorityOrder.forEach(category => {
      if (!categoryGroups[category]) return;
      
      const categoryMaterials = categoryGroups[category];
      const categoryInfo = this.labPackCategories[category];
      
      // Check if category needs subdivision
      const subdivisions = this.subdivideIfNeeded(categoryMaterials);
      
      subdivisions.forEach((subdivision, index) => {
        const assignmentNumber = assignments.length + 1;
        const containerLabel = this.generateContainerLabel(category, subdivisions.length > 1 ? index + 1 : null);
        
        assignments.push({
          assignmentNumber,
          category,
          categoryName: categoryInfo?.name || category,
          containerLabel,
          materials: subdivision.materials.map(item => item.material),
          safetyLevel: subdivision.materials[0]?.classification.segregationLevel || 'standard',
          specialHandling: subdivision.specialHandling,
          packagingRequirements: categoryInfo?.packaging || 'Standard lab pack procedures',
          dotClass: categoryInfo?.dot_class || '9',
          estimatedVolume: this.estimateVolume(subdivision.materials.length),
          incompatibleWith: subdivision.materials[0]?.classification.incompatibleWith || [],
          reasoning: subdivision.reasoning
        });
        
        subdivision.materials.forEach(item => processed.add(item.material.id));
      });
    });
    
    // Handle any unprocessed materials
    const unprocessed = materials.filter(m => !processed.has(m.id));
    if (unprocessed.length > 0) {
      assignments.push({
        assignmentNumber: assignments.length + 1,
        category: 'unclassified',
        categoryName: 'Unclassified Materials',
        containerLabel: 'REQUIRES MANUAL REVIEW',
        materials: unprocessed,
        safetyLevel: 'extreme',
        specialHandling: ['Manual review by environmental chemist required'],
        packagingRequirements: 'DO NOT PACK - Classification required',
        dotClass: '9',
        estimatedVolume: 'Unknown',
        reasoning: 'Unable to classify - requires expert review'
      });
    }
    
    // Separate regular lab packs from unpackable materials
    const labPacks = assignments.filter(pack => pack.category !== 'unclassified');
    const unpackable = assignments.filter(pack => pack.category === 'unclassified')
      .flatMap(pack => pack.materials);
    
    return {
      labPacks,
      unpackable
    };
  }
  
  subdivideIfNeeded(categoryMaterials) {
    // For now, keep materials in same category together
    // In a more advanced version, this would check individual compatibility
    return [{
      materials: categoryMaterials,
      specialHandling: categoryMaterials[0]?.classification.specialHandling || [],
      reasoning: `${categoryMaterials.length} compatible materials in same category`
    }];
  }
  
  generateContainerLabel(category, subdivisionNumber) {
    const labels = {
      'aerosols': 'AEROSOLS - SEPARATE REQUIRED',
      'acids_oxidizing': 'OXIDIZING ACIDS - SEPARATE REQUIRED',
      'reactive_metals': 'REACTIVE METALS - SEPARATE REQUIRED',
      'cyanides': 'CYANIDES - SEPARATE REQUIRED',
      'flammable_organic': 'FLAMMABLE ORGANIC LIQUIDS',
      'flammable_petroleum': 'FLAMMABLE PETROLEUM PRODUCTS',
      'acids_inorganic': 'INORGANIC ACIDS',
      'acids_organic': 'ORGANIC ACIDS',
      'bases_inorganic': 'INORGANIC BASES',
      'oxidizers': 'OXIDIZING AGENTS',
      'toxic_inorganic': 'TOXIC INORGANIC MATERIALS',
      'toxic_organic': 'TOXIC ORGANIC MATERIALS',
      'non_hazardous_liquids': 'NON-HAZARDOUS LIQUIDS',
      'non_hazardous_solids': 'NON-HAZARDOUS SOLIDS'
    };
    
    let label = labels[category] || category.toUpperCase();
    if (subdivisionNumber) {
      label += ` - GROUP ${subdivisionNumber}`;
    }
    return label;
  }
  
  estimateVolume(materialCount) {
    if (materialCount <= 5) return 'Small (5-gal)';
    if (materialCount <= 15) return 'Medium (30-gal)';
    if (materialCount <= 30) return 'Large (55-gal)';
    return 'Multiple containers required';
  }
}