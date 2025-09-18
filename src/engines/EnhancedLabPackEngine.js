// Enhanced Lab Pack Compatibility Engine
// Improved compatibility rules, categorization, optimization, and compliance

import { ChemicalCompatibilityEngine } from './ChemicalCompatibilityEngine.js';

export class EnhancedLabPackEngine {
  constructor() {
    this.chemicalCompatibility = new ChemicalCompatibilityEngine();
    this.initializeCompatibilityMatrix();
    this.initializeCASDatabase();
    this.initializeOptimizationRules();
  }

  initializeCompatibilityMatrix() {
    // Enhanced compatibility matrix with more sophisticated rules
    this.compatibilityMatrix = {
      // Level 1: Severe Incompatibilities (NEVER mix)
      severe_incompatible: [
        ['acids_strong', 'bases_strong'], // Violent neutralization reaction
        ['oxidizers_strong', 'flammable_liquids'], // Fire/explosion risk
        ['water_reactive', 'aqueous_solutions'], // Hydrogen gas generation
        ['cyanides', 'acids_any'], // Hydrogen cyanide gas generation
        ['sulfides', 'acids_any'], // Hydrogen sulfide gas generation
        ['nitrites', 'acids_any'], // Nitrogen dioxide gas generation
        ['hypochlorites', 'ammonia_solutions'], // Chloramine gas generation
        ['peroxides_organic', 'heat_sources'], // Explosive decomposition
        ['azides', 'acids_any'], // Hydrazoic acid formation
        ['phosphides', 'water'], // Phosphine gas generation
      ],

      // Level 2: Moderate Incompatibilities (Separate containers required)
      moderate_incompatible: [
        ['acids_weak', 'bases_weak'], // Controlled reaction, heat generation
        ['oxidizers_weak', 'organics'], // Slow oxidation, potential ignition
        ['halogenated_solvents', 'aluminum_containers'], // Container corrosion
        ['phenolics', 'formaldehyde'], // Polymer formation
      ],

      // Level 3: Compatible with precautions
      compatible_with_precautions: [
        ['flammable_organics', 'non_flammable_organics'], // Similar chemical nature
        ['inorganic_salts', 'neutral_solutions'], // No reaction expected
        ['non_reactive_solids', 'inert_atmosphere'], // Stability maintenance
        ['general_chemicals', 'general_chemicals'], // Similar unknowns can be mixed
      ]
    };
  }

  initializeCASDatabase() {
    // Comprehensive CAS-based categorization for accurate classification
    this.casCategories = {
      // Strong Acids
      '7647-01-0': { category: 'acids_strong', name: 'Hydrochloric acid', hazards: ['corrosive', 'gas_generation'] },
      '7664-93-9': { category: 'acids_strong', name: 'Sulfuric acid', hazards: ['corrosive', 'dehydrating'] },
      '7697-37-2': { category: 'acids_strong', name: 'Nitric acid', hazards: ['corrosive', 'oxidizing'] },

      // Strong Bases  
      '1310-73-2': { category: 'bases_strong', name: 'Sodium hydroxide', hazards: ['corrosive', 'hygroscopic'] },
      '1310-58-3': { category: 'bases_strong', name: 'Potassium hydroxide', hazards: ['corrosive', 'hygroscopic'] },

      // Flammable Liquids
      '67-64-1': { category: 'flammable_organic', name: 'Acetone', flashPoint: 16 },
      '78-93-3': { category: 'flammable_organic', name: 'MEK', flashPoint: 16 },
      '108-88-3': { category: 'flammable_aromatic', name: 'Toluene', flashPoint: 40 },

      // Water Reactive
      '7440-23-5': { category: 'water_reactive', name: 'Sodium metal', hazards: ['fire', 'explosion', 'caustic'] },
      '75-05-8': { category: 'water_reactive', name: 'Acetonitrile', hazards: ['toxic', 'flammable'] },

      // Oxidizers
      '7722-84-1': { category: 'oxidizers_strong', name: 'Hydrogen peroxide', concentration_sensitive: true },
      '10022-70-5': { category: 'oxidizers_strong', name: 'Sodium hypochlorite', ph_dependent: true },

      // Cyanides
      '143-33-9': { category: 'cyanides', name: 'Sodium cyanide', hazards: ['extremely_toxic', 'gas_generation'] },
      '151-50-8': { category: 'cyanides', name: 'Potassium cyanide', hazards: ['extremely_toxic', 'gas_generation'] },

      // Petroleum products
      '68476-34-6': { category: 'flammable_petroleum', name: 'Diesel fuel', flashPoint: 125 },
      '64742-48-9': { category: 'flammable_petroleum', name: 'Petroleum distillate', flashPoint: 138 },
    };
  }

  initializeOptimizationRules() {
    this.packingRules = {
      containerSizes: [
        { size: '1 gallon', maxWeight: 30, volume: 3785 }, // ml
        { size: '5 gallon', maxWeight: 150, volume: 18925 },
        { size: '10 gallon', maxWeight: 300, volume: 37850 },
        { size: '30 gallon', maxWeight: 600, volume: 113650 },
      ],
      
      fillLimits: {
        liquids: 0.85, // 85% fill for expansion
        solids: 0.80, // 80% fill for settling
        powders: 0.75, // 75% fill for dusting
      },

      packingMaterial: {
        absorbent_required: ['acids_strong', 'bases_strong', 'flammable_liquids'],
        inert_atmosphere: ['water_reactive', 'air_sensitive'],
        cushioning_required: ['glass_containers', 'brittle_solids'],
      }
    };
  }

  /**
   * Enhanced categorization using multiple classification methods
   */
  categorizeMaterial(material) {
    const classification = {
      primary_category: null,
      subcategory: null,
      hazard_level: 'low',
      compatibility_group: null,
      packing_requirements: [],
      confidence: 0
    };

    // Method 1: CAS-based classification (highest confidence)
    if (material.composition && material.composition.length > 0) {
      const casResult = this.classifyByCAS(material.composition);
      if (casResult.confidence > 0.8) {
        classification.primary_category = casResult.category;
        classification.confidence = casResult.confidence;
        classification.packing_requirements.push(...casResult.requirements);
      }
    }

    // Method 2: Waste code classification
    if (material.wasteCodes && material.wasteCodes.length > 0) {
      const wasteCodeResult = this.classifyByWasteCodes(material.wasteCodes);
      if (wasteCodeResult.confidence > classification.confidence) {
        classification.primary_category = wasteCodeResult.category;
        classification.confidence = wasteCodeResult.confidence;
      }
    }

    // Method 3: Physical properties classification
    const physicalResult = this.classifyByPhysicalProperties(material);
    if (physicalResult.confidence > classification.confidence) {
      classification.primary_category = physicalResult.category;
      classification.confidence = physicalResult.confidence;
    }

    // Method 4: DOT hazard class classification
    if (material.dotShipping?.hazardClass) {
      const dotResult = this.classifyByDOTClass(material.dotShipping.hazardClass);
      classification.subcategory = dotResult.subcategory;
      classification.packing_requirements.push(...dotResult.requirements);
    }

    // Fallback: If no category assigned, classify as general chemicals
    if (!classification.primary_category) {
      classification.primary_category = 'general_chemicals';
      classification.confidence = 0.3; // Low confidence but allows grouping
      classification.subcategory = 'unknown';
    }

    // Determine compatibility group
    classification.compatibility_group = this.determineCompatibilityGroup(classification.primary_category);
    
    // Assess hazard level
    classification.hazard_level = this.assessHazardLevel(material);

    return classification;
  }

  classifyByCAS(composition) {
    let bestMatch = { category: null, confidence: 0, requirements: [] };
    
    for (const component of composition) {
      if (component.cas && this.casCategories[component.cas]) {
        const casData = this.casCategories[component.cas];
        const concentration = parseFloat(component.percentage) || 0;
        
        // Higher concentration = higher confidence
        const confidence = Math.min(concentration / 100, 1.0) * 0.9;
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            category: casData.category,
            confidence: confidence,
            requirements: this.getPackingRequirements(casData),
            component: component.name,
            concentration: concentration
          };
        }
      }
    }
    
    return bestMatch;
  }

  classifyByWasteCodes(wasteCodes) {
    const wasteCodeCategories = {
      'D001': { category: 'flammable_organic', confidence: 0.85 },
      'D002': { category: 'corrosive', confidence: 0.90 },
      'D003': { category: 'reactive', confidence: 0.90 },
      'D004': { category: 'toxic_metals', confidence: 0.80 },
      'D005': { category: 'toxic_metals', confidence: 0.80 },
      'D006': { category: 'toxic_metals', confidence: 0.80 },
      'D007': { category: 'toxic_metals', confidence: 0.80 },
      'D008': { category: 'toxic_metals', confidence: 0.80 },
      'D009': { category: 'toxic_metals', confidence: 0.80 },
      'P': { category: 'acutely_hazardous', confidence: 0.95 },
      'U': { category: 'toxic_organic', confidence: 0.85 }
    };

    let bestMatch = { category: null, confidence: 0 };
    
    for (const code of wasteCodes) {
      const codePrefix = code.startsWith('P') ? 'P' : code.startsWith('U') ? 'U' : code;
      if (wasteCodeCategories[codePrefix]) {
        const match = wasteCodeCategories[codePrefix];
        if (match.confidence > bestMatch.confidence) {
          bestMatch = match;
        }
      }
    }
    
    return bestMatch;
  }

  classifyByPhysicalProperties(material) {
    let category = 'unknown';
    let confidence = 0.3; // Lower confidence for property-based classification
    
    // Flash point classification
    if (material.flashPoint !== undefined) {
      if (material.flashPoint < 140) {
        category = 'flammable_organic';
        confidence = 0.7;
      }
    }
    
    // pH classification
    if (material.pH !== undefined) {
      if (material.pH <= 2) {
        category = 'acids_strong';
        confidence = 0.75;
      } else if (material.pH >= 12.5) {
        category = 'bases_strong';
        confidence = 0.75;
      }
    }
    
    return { category, confidence };
  }

  classifyByDOTClass(dotClass) {
    const dotCategories = {
      '1': { subcategory: 'explosives', requirements: ['separate_storage', 'quantity_limits'] },
      '2': { subcategory: 'gases', requirements: ['pressure_containers', 'ventilation'] },
      '3': { subcategory: 'flammable_liquids', requirements: ['fire_prevention', 'bonding_grounding'] },
      '4': { subcategory: 'flammable_solids', requirements: ['moisture_control', 'heat_protection'] },
      '5.1': { subcategory: 'oxidizers', requirements: ['segregation', 'non_combustible_packaging'] },
      '5.2': { subcategory: 'peroxides', requirements: ['temperature_control', 'separate_storage'] },
      '6.1': { subcategory: 'toxic', requirements: ['leak_prevention', 'double_containment'] },
      '8': { subcategory: 'corrosive', requirements: ['chemical_resistant_containers'] },
      '9': { subcategory: 'miscellaneous', requirements: ['standard_packaging'] }
    };
    
    return dotCategories[dotClass] || { subcategory: 'unknown', requirements: [] };
  }

  /**
   * Advanced compatibility checking with multiple rule levels
   */
  checkCompatibility(material1, material2) {
    console.log(`🔍 Checking compatibility: "${material1.productName}" vs "${material2.productName}"`);
    
    // NEW: Use the enhanced chemical compatibility engine first
    const enhancedResult = this.chemicalCompatibility.checkCompatibility(material1, material2);
    
    // If the new system finds incompatibility, return it immediately
    if (!enhancedResult.compatible) {
      console.log(`❌ INCOMPATIBLE (Enhanced): ${enhancedResult.issues.join('; ')}`);
      return {
        compatible: false,
        risk_level: enhancedResult.risk_level,
        issues: enhancedResult.issues,
        recommendations: enhancedResult.recommendations,
        confidence: 0.9 // High confidence in enhanced system
      };
    }

    // Fallback to legacy checks for additional validation
    const cat1 = this.categorizeMaterial(material1);
    const cat2 = this.categorizeMaterial(material2);
    
    const compatibility = {
      compatible: true,
      risk_level: 'low',
      issues: [],
      recommendations: [],
      confidence: Math.min(cat1.confidence, cat2.confidence)
    };

    // CRITICAL RULE #1: NEVER mix hazardous and non-hazardous materials
    const isNonHaz1 = this.isNonHazardous(material1);
    const isNonHaz2 = this.isNonHazardous(material2);
    
    if (isNonHaz1 !== isNonHaz2) {
      compatibility.compatible = false;
      compatibility.risk_level = 'severe';
      compatibility.issues.push('REGULATORY VIOLATION: Cannot mix hazardous and non-hazardous materials');
      console.log('❌ INCOMPATIBLE: Hazardous/Non-hazardous segregation required');
      return compatibility;
    }

    // Legacy checks for additional validation
    const physicalStateResult = this.checkPhysicalStateCompatibility(material1, material2, compatibility);
    if (!physicalStateResult.compatible) return physicalStateResult;

    const wasteCodeResult = this.checkWasteCodeCompatibility(material1, material2, compatibility);
    if (!wasteCodeResult.compatible) return wasteCodeResult;

    const dotResult = this.checkDOTClassCompatibility(material1, material2, compatibility);
    if (!dotResult.compatible) return dotResult;

    const constituentResult = this.checkConstituentCompatibility(material1, material2, compatibility);
    if (!constituentResult.compatible) return constituentResult;

    // PRACTICAL SEGREGATION RULES - Based on product names and chemistry
    const name1 = (material1.productName || '').toLowerCase();
    const name2 = (material2.productName || '').toLowerCase();
    
    // 1. AEROSOL SEGREGATION - Must be packed separately
    const isAerosol1 = name1.includes('aerosol') || name1.includes('wd-40') || name1.includes('spray');
    const isAerosol2 = name2.includes('aerosol') || name2.includes('wd-40') || name2.includes('spray');
    
    if (isAerosol1 !== isAerosol2) {
      compatibility.compatible = false;
      compatibility.risk_level = 'moderate';
      compatibility.issues.push('AEROSOLS must be packed separately from non-aerosols');
      console.log('❌ INCOMPATIBLE: Aerosol segregation');
      return compatibility;
    }

    // 2. CORROSIVE MATERIALS - Separate from everything else
    const isCorrosive1 = name1.includes('caustic') || name1.includes('sodium hydroxide') || 
                         name1.includes('hypochlorite') || name1.includes('bleach');
    const isCorrosive2 = name2.includes('caustic') || name2.includes('sodium hydroxide') || 
                         name2.includes('hypochlorite') || name2.includes('bleach');
    
    if (isCorrosive1 !== isCorrosive2) {
      compatibility.compatible = false;
      compatibility.risk_level = 'moderate';
      compatibility.issues.push('CORROSIVE materials must be segregated');
      console.log('❌ INCOMPATIBLE: Corrosive segregation');
      return compatibility;
    }

    // 3. FLAMMABLE LIQUIDS - Group together but separate from others
    const isFlammable1 = name1.includes('acetone') || name1.includes('alcohol') || 
                         name1.includes('ether') || name1.includes('benzene') || 
                         name1.includes('toluene') || name1.includes('xylene');
    const isFlammable2 = name2.includes('acetone') || name2.includes('alcohol') || 
                         name2.includes('ether') || name2.includes('benzene') || 
                         name2.includes('toluene') || name2.includes('xylene');
    
    // 4. PETROLEUM PRODUCTS - Separate category
    const isPetroleum1 = name1.includes('diesel') || name1.includes('fuel') || 
                        name1.includes('gasoline') || name1.includes('kerosene') ||
                        name1.includes('mineral spirits');
    const isPetroleum2 = name2.includes('diesel') || name2.includes('fuel') || 
                        name2.includes('gasoline') || name2.includes('kerosene') ||
                        name2.includes('mineral spirits');

    // 5. TOXIC/CARCINOGENIC - Special handling
    const isToxic1 = name1.includes('tetrachloroethylene') || name1.includes('trimethylamine') ||
                     name1.includes('benzidine') || name1.includes('formaldehyde');
    const isToxic2 = name2.includes('tetrachloroethylene') || name2.includes('trimethylamine') ||
                     name2.includes('benzidine') || name2.includes('formaldehyde');

    // Create material categories for grouping
    const getCategory = (name, isAerosol, isCorrosive, isFlammable, isPetroleum, isToxic) => {
      if (isAerosol) return 'aerosol';
      if (isCorrosive) return 'corrosive';
      if (isToxic) return 'toxic';
      if (isFlammable) return 'flammable';
      if (isPetroleum) return 'petroleum';
      if (name.includes('glycol') || name.includes('triethylene')) return 'glycol';
      return 'general';
    };

    const category1 = getCategory(name1, isAerosol1, isCorrosive1, isFlammable1, isPetroleum1, isToxic1);
    const category2 = getCategory(name2, isAerosol2, isCorrosive2, isFlammable2, isPetroleum2, isToxic2);

    console.log('🔍 CATEGORY SEGREGATION:', {
      material1: material1.productName,
      category1,
      material2: material2.productName,
      category2
    });

    // Different categories should be separated (with very limited exceptions)
    if (category1 !== category2) {
      // Only allow very specific compatible combinations
      const compatibleCombos = [
        // Remove dangerous combinations - flammables and petroleum should NOT mix with general
        // Only allow similar categories to be mixed
        ['flammable', 'petroleum'],  // Both are flammable organics
        ['glycol', 'general'],       // Glycols are relatively safe with general
      ];
      
      const isCompatibleCombo = compatibleCombos.some(([cat1, cat2]) => 
        (category1 === cat1 && category2 === cat2) || 
        (category1 === cat2 && category2 === cat1)
      );
      
      if (!isCompatibleCombo) {
        compatibility.compatible = false;
        compatibility.risk_level = 'moderate';
        compatibility.issues.push(`Different chemical categories: ${category1} vs ${category2}`);
        console.log('❌ INCOMPATIBLE: Category segregation');
        return compatibility;
      }
    }

    console.log('✅ COMPATIBLE: All checks passed');
    return compatibility;
  }

  /**
   * Physical state compatibility checking
   */
  checkPhysicalStateCompatibility(material1, material2, compatibility) {
    const state1 = this.getPhysicalState(material1);
    const state2 = this.getPhysicalState(material2);
    
    console.log('🔍 Physical state check:', { 
      mat1: material1.productName, state1, 
      mat2: material2.productName, state2 
    });
    
    // Generally allow mixing within same physical state, but with restrictions
    if (state1 !== state2) {
      // Some liquid/solid combinations are acceptable (e.g., absorbed liquids)
      const allowedMixtures = [
        ['liquid', 'absorbed'], // Absorbed liquids with absorbents
        ['liquid', 'paste'],    // Similar viscosity materials
        ['solid', 'powder']     // Different solid forms
      ];
      
      const isAllowed = allowedMixtures.some(([s1, s2]) => 
        (state1 === s1 && state2 === s2) || (state1 === s2 && state2 === s1)
      );
      
      if (!isAllowed) {
        compatibility.compatible = false;
        compatibility.risk_level = 'moderate';
        compatibility.issues.push(`Physical state mismatch: ${state1} vs ${state2}`);
        console.log('❌ INCOMPATIBLE: Physical state segregation');
      }
    }
    
    return compatibility;
  }

  /**
   * Waste code compatibility matrix
   */
  checkWasteCodeCompatibility(material1, material2, compatibility) {
    const codes1 = this.getAllWasteCodes(material1);
    const codes2 = this.getAllWasteCodes(material2);
    
    console.log('🔍 Waste code check:', { 
      mat1: material1.productName, codes1, 
      mat2: material2.productName, codes2 
    });
    
    // Check for incompatible waste code combinations
    const incompatibleCombinations = [
      // P-codes (acutely hazardous) should be segregated from most others
      { pattern1: /^P/, pattern2: /^[DUF]/, reason: 'P-listed wastes require special segregation' },
      
      // D001 (ignitable) incompatible with D003 (reactive) or oxidizers
      { pattern1: /^D001$/, pattern2: /^D003$/, reason: 'Ignitable and reactive wastes are incompatible' },
      
      // D002 (corrosive) acids vs bases
      { 
        condition: (c1, c2) => this.isAcidWaste(c1, material1) && this.isBaseWaste(c2, material2),
        reason: 'Acid and base wastes generate heat and gas'
      },
      
      // F-codes (spent solvents) have specific mixing restrictions
      { pattern1: /^F001|F002/, pattern2: /^F006/, reason: 'Halogenated and non-halogenated solvents separate' },
      
      // U-codes for certain chemicals that are reactive
      { 
        condition: (c1, c2) => this.hasReactiveU(c1) && this.hasIncompatibleU(c2),
        reason: 'Reactive U-listed wastes incompatible'
      }
    ];
    
    for (const combo of incompatibleCombinations) {
      if (combo.pattern1 && combo.pattern2) {
        const hasPattern1 = codes1.some(c => combo.pattern1.test(c)) || codes2.some(c => combo.pattern1.test(c));
        const hasPattern2 = codes1.some(c => combo.pattern2.test(c)) || codes2.some(c => combo.pattern2.test(c));
        
        if (hasPattern1 && hasPattern2) {
          compatibility.compatible = false;
          compatibility.risk_level = 'severe';
          compatibility.issues.push(combo.reason);
          console.log('❌ INCOMPATIBLE: Waste code incompatibility');
          return compatibility;
        }
      } else if (combo.condition && combo.condition(codes1, codes2)) {
        compatibility.compatible = false;
        compatibility.risk_level = 'severe';
        compatibility.issues.push(combo.reason);
        console.log('❌ INCOMPATIBLE: Waste code incompatibility');
        return compatibility;
      }
    }
    
    return compatibility;
  }

  /**
   * DOT hazard class compatibility
   */
  checkDOTClassCompatibility(material1, material2, compatibility) {
    const class1 = material1.dotShipping?.hazardClass || material1.dotClass || '9';
    const class2 = material2.dotShipping?.hazardClass || material2.dotClass || '9';
    
    console.log('🔍 DOT class check:', { 
      mat1: material1.productName, class1, 
      mat2: material2.productName, class2 
    });
    
    // DOT segregation table - forbidden combinations
    const forbiddenCombinations = [
      ['1', '*'],    // Explosives separate from everything
      ['2.1', '5.1'], // Flammable gas + oxidizer
      ['2.1', '8'],   // Flammable gas + corrosive
      ['2.3', '*'],   // Toxic gas separate from everything
      ['3', '5.1'],   // Flammable liquid + oxidizer (most dangerous)
      ['4.1', '5.1'], // Flammable solid + oxidizer
      ['4.2', '5.1'], // Spontaneously combustible + oxidizer
      ['4.3', '8'],   // Dangerous when wet + corrosive
      ['5.1', '6.1'], // Oxidizer + toxic (can enhance toxicity)
      ['5.2', '*'],   // Organic peroxides separate from most
    ];
    
    for (const [c1, c2] of forbiddenCombinations) {
      if ((c1 === class1 && (c2 === class2 || c2 === '*')) ||
          (c1 === class2 && (c2 === class1 || c2 === '*'))) {
        compatibility.compatible = false;
        compatibility.risk_level = 'severe';
        compatibility.issues.push(`DOT Class ${class1} and ${class2} are incompatible`);
        console.log('❌ INCOMPATIBLE: DOT class segregation');
        return compatibility;
      }
    }
    
    return compatibility;
  }

  /**
   * Constituent-based compatibility checking
   */
  checkConstituentCompatibility(material1, material2, compatibility) {
    const comp1 = material1.composition || [];
    const comp2 = material2.composition || [];
    
    console.log('🔍 Constituent check:', { 
      mat1: material1.productName, comp1: comp1.length, 
      mat2: material2.productName, comp2: comp2.length 
    });
    
    // Chemical incompatibilities based on constituents
    const chemicalIncompatibilities = [
      // Oxidizers vs organics
      {
        chemicals1: ['hydrogen peroxide', 'sodium hypochlorite', 'potassium permanganate'],
        chemicals2: ['acetone', 'ethanol', 'toluene', 'xylene', 'benzene'],
        reason: 'Oxidizers react violently with organic compounds'
      },
      
      // Acids vs bases
      {
        chemicals1: ['hydrochloric acid', 'sulfuric acid', 'nitric acid'],
        chemicals2: ['sodium hydroxide', 'potassium hydroxide', 'calcium hydroxide'],
        reason: 'Strong acids and bases neutralize violently'
      },
      
      // Acids vs cyanides (deadly gas generation)
      {
        chemicals1: ['hydrochloric acid', 'sulfuric acid'],
        chemicals2: ['sodium cyanide', 'potassium cyanide'],
        reason: 'Acids + cyanides generate deadly hydrogen cyanide gas'
      },
      
      // Water reactive chemicals vs water-based materials
      {
        chemicals1: ['sodium metal', 'potassium metal', 'calcium carbide'],
        chemicals2: ['water', 'aqueous solution'],
        reason: 'Water reactive chemicals generate flammable gases'
      },
      
      // Chlorinated solvents vs strong bases (forms toxic phosgene)
      {
        chemicals1: ['carbon tetrachloride', 'chloroform', 'methylene chloride'],
        chemicals2: ['sodium hydroxide', 'potassium hydroxide'],
        reason: 'Chlorinated solvents + strong bases can form phosgene gas'
      }
    ];
    
    for (const incompatibility of chemicalIncompatibilities) {
      const hasChemicals1 = this.hasAnyChemical(comp1, incompatibility.chemicals1) || 
                           this.hasAnyChemical(comp2, incompatibility.chemicals1);
      const hasChemicals2 = this.hasAnyChemical(comp1, incompatibility.chemicals2) || 
                           this.hasAnyChemical(comp2, incompatibility.chemicals2);
      
      if (hasChemicals1 && hasChemicals2) {
        compatibility.compatible = false;
        compatibility.risk_level = 'severe';
        compatibility.issues.push(incompatibility.reason);
        console.log('❌ INCOMPATIBLE: Chemical constituent incompatibility');
        return compatibility;
      }
    }
    
    return compatibility;
  }

  // Helper methods for material type detection
  isNonHazardous(material) {
    console.log('🔍 isNonHazardous check for:', material.productName, {
      wasteCodes: material.wasteCodes,
      federalCodes: material.federalCodes,
      dotShipping: material.dotShipping,
      hazardStatements: material.hazardStatements,
      rcraCharacteristic: material.rcraCharacteristic,
      flashPoint: material.flashPoint,
      unNumber: material.unNumber,
      casNumber: material.casNumber
    });
    
    // Check if material has RCRA codes or DOT hazard classification
    const hasRCRA = (material.wasteCodes && material.wasteCodes.length > 0) ||
                    (material.federalCodes && material.federalCodes.length > 0) ||
                    (material.rcraCharacteristic && material.rcraCharacteristic.length > 0);
    
    const hasDOTHazard = material.dotShipping && material.dotShipping.hazardClass && material.dotShipping.hazardClass !== '9';
    const hasHazardStatements = material.hazardStatements && material.hazardStatements.length > 0;
    
    // Check flash point - materials with flash point < 200°F are hazardous
    const hasLowFlashPoint = material.flashPoint !== undefined && material.flashPoint < 200;
    
    // Check if has UN number (typically indicates hazardous material)
    const hasUNNumber = material.unNumber && material.unNumber.trim() !== '';
    
    // Check if CAS number is in our hazardous database
    const isHazardousByCAS = material.casNumber && this.casCategories[material.casNumber];
    
    // Check product name for hazardous chemicals
    const hasHazardousChemicalName = this.hasHazardousChemicalInName(material.productName);
    
    const isNonHaz = !hasRCRA && !hasDOTHazard && !hasHazardStatements && !hasLowFlashPoint && !hasUNNumber && !isHazardousByCAS && !hasHazardousChemicalName;
    console.log('🔍 Result:', { 
      hasRCRA, hasDOTHazard, hasHazardStatements, hasLowFlashPoint, 
      hasUNNumber, isHazardousByCAS, hasHazardousChemicalName, isNonHaz 
    });
    
    return isNonHaz;
  }

  hasHazardousChemicalInName(productName) {
    if (!productName) return false;
    
    const hazardousChemicals = [
      'acetone', 'methanol', 'ethanol', 'toluene', 'xylene', 'benzene',
      'methyl ethyl ketone', 'mek', 'butanone', '2-butanone', '2 butanone',
      'isopropanol', 'dichloromethane', 'chloroform', 'carbon tetrachloride',
      'hydrochloric', 'sulfuric', 'nitric', 'caustic', 'sodium hydroxide',
      'bleach', 'peroxide', 'cyanide', 'formaldehyde', 'mercury',
      'hexane', 'heptane', 'pentane', 'cyclohexane', 'tetrahydrofuran'
    ];
    
    const name = productName.toLowerCase();
    return hazardousChemicals.some(chemical => name.includes(chemical));
  }

  isAerosol(material) {
    const name = (material.productName || '').toLowerCase();
    const form = (material.physicalState || material.form || '').toLowerCase();
    
    console.log('🔍 isAerosol check for:', material.productName, {
      name_lower: name,
      physicalState: material.physicalState,
      form: material.form,
      form_lower: form,
      dotShipping: material.dotShipping
    });
    
    // Enhanced aerosol detection
    const aerosolKeywords = [
      'aerosol', 'spray', 'brake cleaner', 'wd-40', 'penetrating oil',
      'degreaser spray', 'lubricant spray', 'contact cleaner', 
      'compressed air', 'dust remover'
    ];
    
    const containerKeywords = [
      'can', 'canister', 'pressurized container'
    ];
    
    // Check product name for aerosol indicators
    const hasAerosolName = aerosolKeywords.some(keyword => name.includes(keyword));
    const hasContainerType = containerKeywords.some(keyword => name.includes(keyword));
    
    // Check physical state/form
    const hasAerosolForm = form.includes('aerosol') || form.includes('spray');
    
    // DOT Class 2.1 (flammable gas) often indicates aerosols
    const isDOTAerosol = material.dotShipping?.hazardClass === '2.1';
    
    // Package type indicators
    const packageType = (material.packaging || material.containerType || '').toLowerCase();
    const hasAerosolPackaging = packageType.includes('aerosol') || packageType.includes('pressurized');
    
    const isAerosol = hasAerosolName || hasAerosolForm || isDOTAerosol || 
                     (hasContainerType && (hasAerosolName || isDOTAerosol)) ||
                     hasAerosolPackaging;
    
    console.log('🔍 Enhanced aerosol detection:', {
      hasAerosolName, hasContainerType, hasAerosolForm, 
      isDOTAerosol, hasAerosolPackaging, 
      result: isAerosol
    });
    
    return isAerosol;
  }

  isPressurizedCylinder(material) {
    const name = (material.productName || '').toLowerCase();
    const form = (material.physicalState || material.form || '').toLowerCase();
    
    // Pressurized cylinders are different from aerosols
    const cylinderKeywords = [
      'gas cylinder', 'compressed gas', 'gas tank', 'cylinder',
      'nitrogen', 'oxygen', 'argon', 'helium', 'acetylene',
      'propane', 'butane', 'co2', 'carbon dioxide'
    ];
    
    const hasCylinderName = cylinderKeywords.some(keyword => name.includes(keyword));
    
    // DOT Class 2.2 (non-flammable gas) or 2.3 (toxic gas) often indicates cylinders
    const dotClass = material.dotShipping?.hazardClass;
    const isDOTCylinder = dotClass === '2.2' || dotClass === '2.3';
    
    // Large volume indicators (cylinders typically much larger than aerosols)
    const volume = material.volume || 0;
    const isLargeVolume = volume > 5000; // > 5L suggests cylinder not aerosol
    
    const isCylinder = hasCylinderName || (isDOTCylinder && isLargeVolume);
    
    console.log('🔍 Pressurized cylinder check:', {
      material: material.productName,
      hasCylinderName, isDOTCylinder, isLargeVolume,
      volume, dotClass, result: isCylinder
    });
    
    return isCylinder;
  }

  isOilBased(material) {
    const name = (material.productName || '').toLowerCase();
    const composition = material.composition || [];
    
    // Check product name for oil-based indicators
    const oilKeywords = ['oil', 'petroleum', 'hydrocarbon', 'diesel', 'gasoline', 'kerosene', 'mineral spirits'];
    if (oilKeywords.some(keyword => name.includes(keyword))) return true;
    
    // Check composition for oil-based chemicals
    return composition.some(component => {
      const compName = (component.name || '').toLowerCase();
      return oilKeywords.some(keyword => compName.includes(keyword));
    });
  }

  isWaterBased(material) {
    const name = (material.productName || '').toLowerCase();
    const composition = material.composition || [];
    
    // Check product name for water-based indicators
    const waterKeywords = ['water', 'aqueous', 'solution', 'emulsion', 'latex'];
    if (waterKeywords.some(keyword => name.includes(keyword))) return true;
    
    // Check composition for water content
    return composition.some(component => {
      const compName = (component.name || '').toLowerCase();
      return waterKeywords.some(keyword => compName.includes(keyword)) || compName.includes('h2o');
    });
  }

  checkSpecificHazards(material1, material2, compatibility) {
    // pH compatibility
    if (material1.pH !== undefined && material2.pH !== undefined) {
      const pHDiff = Math.abs(material1.pH - material2.pH);
      if (pHDiff > 10) {
        compatibility.issues.push('Large pH difference may cause neutralization reaction');
        compatibility.recommendations.push('Monitor for heat generation during packing');
      }
    }

    // Flash point considerations
    if (material1.flashPoint < 140 || material2.flashPoint < 140) {
      compatibility.recommendations.push('Fire prevention measures required');
      compatibility.recommendations.push('Bonding and grounding recommended');
    }

    // Water reactivity check
    if (this.isWaterReactive(material1) || this.isWaterReactive(material2)) {
      compatibility.recommendations.push('Exclude moisture, use desiccants');
      compatibility.recommendations.push('Inert atmosphere recommended');
    }
  }

  /**
   * Optimization algorithm for efficient lab pack planning
   */
  optimizeLabPackConfiguration(materials) {
    const optimization = {
      recommended_packs: [],
      total_cost: 0,
      efficiency_score: 0,
      warnings: [],
      unpackable: []
    };

    // Group materials by compatibility
    const compatibilityGroups = this.groupByCompatibility(materials);
    
    // Pack each group efficiently
    for (const group of compatibilityGroups) {
      const packs = this.packGroup(group);
      optimization.recommended_packs.push(...packs);
    }

    // Calculate costs and efficiency
    optimization.total_cost = this.calculateTotalCost(optimization.recommended_packs);
    optimization.efficiency_score = this.calculateEfficiency(materials, optimization.recommended_packs);
    
    // Generate comprehensive packing list
    const packingList = this.generateComprehensivePackingList(optimization.recommended_packs);
    
    // Return format compatible with LabPackPlanner
    return {
      labPacks: optimization.recommended_packs,
      unpackable: optimization.unpackable,
      packingList: packingList,
      optimization: {
        total_cost: optimization.total_cost,
        efficiency_score: optimization.efficiency_score,
        warnings: optimization.warnings
      }
    };
  }

  groupByCompatibility(materials) {
    console.log(`🔍 Grouping ${materials.length} materials by compatibility`);
    
    // FIRST: Separate hazardous from non-hazardous
    const hazardousMaterials = materials.filter(m => !this.isNonHazardous(m));
    const nonHazardousMaterials = materials.filter(m => this.isNonHazardous(m));
    
    console.log(`📊 Material segregation: ${hazardousMaterials.length} hazardous, ${nonHazardousMaterials.length} non-hazardous`);
    
    const groups = [];
    
    // Process hazardous materials
    for (const material of hazardousMaterials) {
      let assignedToGroup = false;
      
      // Try to add to existing hazardous group
      for (let i = 0; i < groups.length; i++) {
        if (this.canAddToGroup(material, groups[i])) {
          groups[i].push(material);
          assignedToGroup = true;
          console.log(`✅ Added ${material.productName} to hazardous group ${i + 1} (now has ${groups[i].length} materials)`);
          break;
        }
      }
      
      // Create new group if not assigned
      if (!assignedToGroup) {
        groups.push([material]);
        console.log(`🆕 Created new hazardous group ${groups.length} for ${material.productName}`);
      }
    }
    
    // Process non-hazardous materials separately
    for (const material of nonHazardousMaterials) {
      let assignedToGroup = false;
      
      // Try to add to existing non-hazardous group
      for (let i = 0; i < groups.length; i++) {
        if (this.canAddToGroup(material, groups[i])) {
          groups[i].push(material);
          assignedToGroup = true;
          console.log(`✅ Added ${material.productName} to non-hazardous group ${i + 1} (now has ${groups[i].length} materials)`);
          break;
        }
      }
      
      // Create new group if not assigned
      if (!assignedToGroup) {
        groups.push([material]);
        console.log(`🆕 Created new non-hazardous group ${groups.length} for ${material.productName}`);
      }
    }
    
    console.log(`📦 Final grouping: ${groups.length} groups with materials: ${groups.map(g => g.length).join(', ')}`);
    return groups;
  }

  canAddToGroup(material, group) {
    // If group is empty, material can always be added
    if (group.length === 0) {
      return true;
    }
    
    // First check if we're mixing hazardous and non-hazardous
    const materialIsNonHaz = this.isNonHazardous(material);
    const groupIsNonHaz = this.isNonHazardous(group[0]); // Check first material in group
    
    if (materialIsNonHaz !== groupIsNonHaz) {
      console.log(`🚫 Cannot add ${material.productName} to group - hazardous/non-hazardous segregation`);
      return false;
    }
    
    // Check DOT hazard class compatibility
    const materialDOT = material.dotShipping?.hazardClass;
    const groupDOT = group[0].dotShipping?.hazardClass;
    
    if (materialDOT && groupDOT && materialDOT !== groupDOT) {
      // Only certain DOT class combinations are allowed
      const allowedDOTCombos = [
        ['3', '9'],    // Flammable with miscellaneous
        ['6.1', '9'],  // Toxic with miscellaneous
        ['8', '9'],    // Corrosive with miscellaneous
      ];
      
      const isAllowedDOT = allowedDOTCombos.some(([c1, c2]) =>
        (materialDOT === c1 && groupDOT === c2) ||
        (materialDOT === c2 && groupDOT === c1)
      );
      
      if (!isAllowedDOT) {
        console.log(`🚫 Cannot add ${material.productName} to group - DOT class incompatibility (${materialDOT} vs ${groupDOT})`);
        return false;
      }
    }
    
    // Check compatibility with each material in the group
    for (const groupMaterial of group) {
      const compatibility = this.checkCompatibility(material, groupMaterial);
      
      // Reject if ANY incompatibility (not just severe)
      if (!compatibility.compatible) {
        console.log(`🚫 Cannot add ${material.productName} to group - ${compatibility.risk_level} incompatibility with ${groupMaterial.productName}`);
        console.log(`   Issues: ${compatibility.issues.join(', ')}`);
        return false;
      }
    }
    
    console.log(`✅ Can add ${material.productName} to group of ${group.length} materials`);
    return true;
  }

  packGroup(group) {
    console.log(`📦 Packing group of ${group.length} materials`);
    const packs = [];
    let currentPack = null;
    
    // Sort by volume to improve packing efficiency
    group.sort((a, b) => (b.volume || 500) - (a.volume || 500));
    
    for (const material of group) {
      if (!currentPack || !this.canFitInPack(material, currentPack)) {
        // Start new pack
        console.log(`🆕 Creating new pack for ${material.productName}`);
        currentPack = this.createNewPack(material);
        packs.push(currentPack);
      } else {
        // Add to current pack
        console.log(`➕ Adding ${material.productName} to existing pack`);
        this.addToPack(material, currentPack);
      }
    }
    
    console.log(`📊 Group of ${group.length} materials packed into ${packs.length} containers`);
    return packs;
  }

  generateComprehensivePackingList(packs) {
    const packingList = {
      totalPacks: packs.length,
      containerRequirements: {},
      vermiculiteNeeded: 0,
      totalVolume: 0,
      totalWeight: 0,
      materialCategories: {},
      containerSpecs: [],
      packingMaterials: {
        vermiculite: 0,
        polyBags: 0,
        labels: 0,
        absorbentPads: 0
      }
    };

    packs.forEach((pack, index) => {
      const containerSize = pack.container_size || '30 gallon';
      const container = this.packingRules.containerSizes.find(c => c.size === containerSize);
      
      // Track container requirements
      if (!packingList.containerRequirements[containerSize]) {
        packingList.containerRequirements[containerSize] = 0;
      }
      packingList.containerRequirements[containerSize]++;

      // Calculate vermiculite needed (20% of container volume)
      if (container) {
        const vermiculiteVolume = container.volume * 0.20; // 20% vermiculite
        packingList.vermiculiteNeeded += vermiculiteVolume;
      }

      // Track totals
      packingList.totalVolume += pack.total_volume || 0;
      packingList.totalWeight += pack.total_weight || 0;

      // Track material categories
      const category = pack.category || 'mixed_waste';
      if (!packingList.materialCategories[category]) {
        packingList.materialCategories[category] = 0;
      }
      packingList.materialCategories[category]++;

      // Generate container specifications
      packingList.containerSpecs.push({
        packNumber: index + 1,
        containerType: container?.type || 'Poly Drum',
        containerSize: containerSize,
        containerMaterial: container?.material || 'HDPE',
        fillVolume: `${pack.total_volume}ml`,
        fillPercentage: container ? `${((pack.total_volume / container.volume) * 100).toFixed(1)}%` : 'Unknown',
        weight: `${pack.total_weight}lbs`,
        materialCount: pack.materials.length,
        category: pack.category,
        dotClass: pack.dotClass || '9',
        vermiculiteNeeded: container ? `${(container.volume * 0.20).toFixed(0)}ml` : '0ml'
      });
    });

    // Calculate total packing materials needed
    packingList.packingMaterials.vermiculite = Math.ceil(packingList.vermiculiteNeeded / 1000); // Convert to liters
    packingList.packingMaterials.polyBags = packs.length * 2; // 2 bags per container for double bagging
    packingList.packingMaterials.labels = packs.length * 4; // Multiple labels per container
    packingList.packingMaterials.absorbentPads = Math.ceil(packs.length * 1.5); // 1.5 pads average per container

    return packingList;
  }

  /**
   * Enhanced regulatory compliance checking
   */
  checkRegulatoryCompliance(labPack) {
    const compliance = {
      dot_compliant: true,
      epa_compliant: true,
      issues: [],
      required_markings: [],
      shipping_requirements: []
    };

    // DOT compliance checks
    this.checkDOTCompliance(labPack, compliance);
    
    // EPA RCRA compliance checks  
    this.checkEPACompliance(labPack, compliance);
    
    // State-specific requirements
    this.checkStateRequirements(labPack, compliance);
    
    return compliance;
  }

  checkDOTCompliance(labPack, compliance) {
    // Mixed hazard classes
    const hazardClasses = new Set();
    for (const material of labPack.materials) {
      if (material.dotShipping?.hazardClass) {
        hazardClasses.add(material.dotShipping.hazardClass);
      }
    }

    if (hazardClasses.size > 1) {
      // Check if combination is allowed
      const allowedCombinations = [
        ['3', '6.1'], // Flammable + Toxic
        ['8', '6.1'], // Corrosive + Toxic
      ];
      
      const currentCombo = Array.from(hazardClasses).sort();
      const isAllowed = allowedCombinations.some(combo => 
        combo.length === currentCombo.length && 
        combo.every(c => currentCombo.includes(c))
      );
      
      if (!isAllowed) {
        compliance.dot_compliant = false;
        compliance.issues.push(`Mixed hazard classes not allowed: ${currentCombo.join(', ')}`);
      }
    }

    // Quantity limits
    const totalVolume = labPack.materials.reduce((sum, m) => sum + (m.volume || 0), 0);
    if (totalVolume > 30000) { // 30L limit for lab packs
      compliance.dot_compliant = false;
      compliance.issues.push('Exceeds 30L volume limit for lab packs');
    }
  }

  checkEPACompliance(labPack, compliance) {
    // Incompatible waste check
    for (let i = 0; i < labPack.materials.length; i++) {
      for (let j = i + 1; j < labPack.materials.length; j++) {
        const compat = this.checkCompatibility(labPack.materials[i], labPack.materials[j]);
        if (!compat.compatible) {
          compliance.epa_compliant = false;
          compliance.issues.push(`Incompatible wastes: ${labPack.materials[i].productName} and ${labPack.materials[j].productName}`);
        }
      }
    }

    // F-listed waste restrictions
    const fListedWastes = labPack.materials.filter(m => 
      m.wasteCodes?.some(code => code.startsWith('F'))
    );
    
    if (fListedWastes.length > 0 && labPack.materials.length > fListedWastes.length) {
      compliance.epa_compliant = false;
      compliance.issues.push('F-listed wastes cannot be mixed with other waste types');
    }
  }

  // Helper methods
  determineCompatibilityGroup(category) {
    const groups = {
      'acids_strong': 'A1',
      'acids_weak': 'A2', 
      'bases_strong': 'B1',
      'bases_weak': 'B2',
      'flammable_organic': 'F1',
      'flammable_petroleum': 'F2',
      'oxidizers_strong': 'O1',
      'toxic_organic': 'T1',
      'toxic_metals': 'T2'
    };
    return groups[category] || 'U'; // Unknown
  }

  assessHazardLevel(material) {
    let score = 0;
    
    // Waste codes contribute to hazard level
    if (material.wasteCodes) {
      if (material.wasteCodes.some(code => code.startsWith('P'))) score += 50;
      if (material.wasteCodes.some(code => code.startsWith('U'))) score += 30;
      if (material.wasteCodes.some(code => code.startsWith('D'))) score += 20;
    }
    
    // Physical properties
    if (material.flashPoint < 100) score += 20;
    if (material.pH <= 2 || material.pH >= 12.5) score += 25;
    
    // DOT class
    const highRiskClasses = ['1', '2.3', '5.2', '6.1'];
    if (highRiskClasses.includes(material.dotShipping?.hazardClass)) score += 30;
    
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  getPackingRequirements(casData) {
    const requirements = ['standard_packaging'];
    
    if (casData.hazards?.includes('corrosive')) {
      requirements.push('chemical_resistant_containers');
    }
    if (casData.hazards?.includes('gas_generation')) {
      requirements.push('vented_containers', 'gas_monitoring');
    }
    if (casData.flashPoint < 140) {
      requirements.push('fire_prevention', 'bonding_grounding');
    }
    
    return requirements;
  }

  isWaterReactive(material) {
    const waterReactiveKeywords = ['sodium metal', 'potassium metal', 'lithium', 'acetyl chloride'];
    const productName = (material.productName || '').toLowerCase();
    return waterReactiveKeywords.some(keyword => productName.includes(keyword));
  }

  createNewPack(material) {
    const materialCategory = this.categorizeMaterial(material);
    const compatibilityGroup = this.determineCompatibilityGroup(materialCategory.primary_category);
    const hazardLevel = this.assessHazardLevel(material);
    
    return {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      materials: [material],
      total_volume: material.volume || 500,  // 500ml per material
      total_weight: material.weight || 5,    // 5lbs per material (much more realistic)
      container_size: '30 gallon', // Use larger container by default for better grouping
      
      // LabPackPlanner expected properties
      category: materialCategory.primary_category || 'mixed_waste',
      categoryName: this.getCategoryDisplayName(materialCategory.primary_category),
      subcategory: materialCategory.subcategory || 'general',
      segregationLevel: this.mapHazardToSegregation(hazardLevel),
      specialHandling: this.getSpecialHandling(material),
      dotClass: material.dotShipping?.hazardClass || '9',
      estimatedVolume: this.selectOptimalContainer(material.volume || 500),
      
      // New required fields
      description: this.generatePackDescription([material]),
      consolidatedWasteCodes: this.consolidateWasteCodes([material]),
      dotShippingName: this.generateDOTShippingName([material], materialCategory),
      
      // Enhanced properties
      compatibility_group: compatibilityGroup,
      hazard_level: hazardLevel,
      regulatory_compliance: this.checkRegulatoryCompliance({materials: [material]})
    };
  }

  canFitInPack(material, pack) {
    const newVolume = pack.total_volume + (material.volume || 500);
    const newWeight = pack.total_weight + (material.weight || 5);
    
    const container = this.packingRules.containerSizes.find(c => c.size === pack.container_size);
    if (!container) {
      console.log(`❌ Container not found for size: ${pack.container_size}`);
      return false;
    }
    
    const volumeLimit = container.volume * 0.85;
    const canFit = newVolume <= volumeLimit; // Remove weight constraint - vermiculite fills dead space
    
    console.log(`🔍 Can fit check: ${material.productName} in ${pack.container_size}?`);
    console.log(`   Current: ${pack.total_volume}ml, Adding: ${material.volume || 500}ml, New Total: ${newVolume}ml`);
    console.log(`   Limit: ${volumeLimit}ml, Weight: ${newWeight}/${container.maxWeight}lbs, Result: ${canFit}`);
    
    return canFit;
  }

  addToPack(material, pack) {
    pack.materials.push(material);
    pack.total_volume += (material.volume || 500);
    pack.total_weight += (material.weight || 5);
    
    // Update consolidated fields
    pack.description = this.generatePackDescription(pack.materials);
    pack.consolidatedWasteCodes = this.consolidateWasteCodes(pack.materials);
    pack.dotShippingName = this.generateDOTShippingName(pack.materials, this.categorizeMaterial(material));
  }

  selectOptimalContainer(volume) {
    for (const container of this.packingRules.containerSizes) {
      if (volume <= container.volume * 0.85) {
        return container.size;
      }
    }
    return '30 gallon'; // Largest available
  }

  calculateTotalCost(packs) {
    const containerCosts = {
      '1 gallon': 25,
      '5 gallon': 45,
      '10 gallon': 65,
      '30 gallon': 125
    };
    
    return packs.reduce((total, pack) => {
      return total + (containerCosts[pack.container_size] || 100);
    }, 0);
  }

  calculateEfficiency(materials, packs) {
    const totalMaterials = materials.length;
    const totalPacks = packs.length;
    
    // Higher materials per pack = higher efficiency
    const packingEfficiency = totalMaterials / totalPacks;
    
    // Volume utilization efficiency
    const volumeEfficiency = packs.reduce((avg, pack) => {
      const container = this.packingRules.containerSizes.find(c => c.size === pack.container_size);
      const utilization = pack.total_volume / container.volume;
      return avg + utilization;
    }, 0) / packs.length;
    
    return Math.round((packingEfficiency * 0.6 + volumeEfficiency * 0.4) * 100);
  }

  checkStateRequirements(labPack, compliance) {
    // State-specific requirements can be added here
    // For now, just basic checks
    
    const hasP002Wastes = labPack.materials.some(m => 
      m.wasteCodes?.includes('P002')
    );
    
    if (hasP002Wastes) {
      compliance.required_markings.push('ACUTE HAZARDOUS WASTE');
      compliance.shipping_requirements.push('Special manifest required');
    }
  }

  // Helper methods for LabPackPlanner integration
  getCategoryDisplayName(category) {
    const displayNames = {
      'acids_strong': 'Strong Acids',
      'acids_weak': 'Weak Acids',
      'bases_strong': 'Strong Bases',
      'bases_weak': 'Weak Bases',
      'flammable_liquids': 'Flammable Liquids',
      'flammable_solids': 'Flammable Solids',
      'oxidizers_strong': 'Strong Oxidizers',
      'oxidizers_weak': 'Weak Oxidizers',
      'toxic_organics': 'Toxic Organics',
      'toxic_inorganics': 'Toxic Inorganics',
      'solvents': 'Organic Solvents',
      'water_reactive': 'Water Reactive',
      'mixed_waste': 'Mixed Waste',
      'general_chemicals': 'General Chemicals',
      'unknown': 'Unknown Materials'
    };
    return displayNames[category] || 'General Chemicals';
  }

  mapHazardToSegregation(hazardLevel) {
    const mapping = {
      'high': 'extreme',
      'medium': 'high',
      'low': 'low'
    };
    return mapping[hazardLevel] || 'low';
  }

  getSpecialHandling(material) {
    const handling = [];
    
    if (material.pH <= 2 || material.pH >= 12.5) {
      handling.push('Corrosive - Use resistant containers');
    }
    
    if (material.flashPoint < 140) {
      handling.push('Flammable - Keep away from heat sources');
    }
    
    if (material.wasteCodes?.some(code => code.startsWith('P'))) {
      handling.push('Acutely Hazardous - Special disposal required');
    }
    
    if (this.isWaterReactive(material)) {
      handling.push('Water Reactive - Keep dry');
    }
    
    return handling;
  }

  generatePackDescription(materials) {
    if (!materials || materials.length === 0) return 'Empty pack';
    
    // Get unique categories and count materials
    const categories = {};
    materials.forEach(material => {
      const category = this.categorizeMaterial(material).primary_category || 'mixed';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    // Build description
    const categoryDescriptions = Object.entries(categories)
      .map(([cat, count]) => `${count} ${this.getCategoryDisplayName(cat)}`)
      .join(', ');
    
    const totalVolume = materials.reduce((sum, m) => sum + (m.volume || 500), 0);
    const volumeInLiters = (totalVolume / 1000).toFixed(1);
    
    return `Lab Pack containing ${materials.length} items (${categoryDescriptions}) - ${volumeInLiters}L total`;
  }

  consolidateWasteCodes(materials) {
    if (!materials || materials.length === 0) return [];
    
    // Collect all waste codes from all materials
    const allCodes = new Set();
    
    materials.forEach(material => {
      // Check various locations where waste codes might be stored
      const sources = [
        material.wasteCodes,
        material.federalCodes,
        material.rcraWasteCodes,
        material.rcraClassification?.dCodes,
        material.classification?.waste_codes
      ];
      
      sources.forEach(source => {
        if (Array.isArray(source)) {
          source.forEach(code => {
            if (code) allCodes.add(code);
          });
        }
      });
    });
    
    // Convert to array and sort (P codes first, then U, then D)
    return Array.from(allCodes).sort((a, b) => {
      const getPriority = (code) => {
        if (code.startsWith('P')) return 0;
        if (code.startsWith('U')) return 1;
        if (code.startsWith('D')) return 2;
        return 3;
      };
      
      const priorityDiff = getPriority(a) - getPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      
      return a.localeCompare(b);
    });
  }

  generateDOTShippingName(materials, materialCategory) {
    if (!materials || materials.length === 0) return 'NA1993, Waste Flammable liquids, n.o.s., 3, PG II';
    
    // Check for highest hazard class among materials
    let primaryHazardClass = '9'; // Default to Class 9
    let packingGroup = 'III'; // Default to PG III
    let technicalNames = new Set();
    
    materials.forEach(material => {
      // Get DOT info from various sources
      const dotClass = material.dotShipping?.hazardClass || 
                       material.dotClassification?.hazardClass || 
                       material.dotClass || '9';
      
      const pg = material.dotShipping?.packingGroup || 
                 material.dotClassification?.packingGroup || 
                 material.packingGroup || 'III';
      
      // Update to highest hazard
      if (this.compareDOTClasses(dotClass, primaryHazardClass) < 0) {
        primaryHazardClass = dotClass;
      }
      
      // Update to most restrictive packing group
      if (this.comparePackingGroups(pg, packingGroup) < 0) {
        packingGroup = pg;
      }
      
      // Collect technical names
      if (material.productName && material.productName !== 'Unknown') {
        technicalNames.add(material.productName);
      }
    });
    
    // Generate proper shipping name based on hazard class
    let shippingName = '';
    let unNumber = '';
    
    switch(primaryHazardClass) {
      case '3':
        unNumber = 'NA1993';
        shippingName = 'Waste Flammable liquids, n.o.s.';
        break;
      case '6.1':
        unNumber = 'NA3077';
        shippingName = 'Waste Environmentally hazardous substances, solid, n.o.s.';
        break;
      case '8':
        unNumber = 'NA1760';
        shippingName = 'Waste Corrosive liquids, n.o.s.';
        break;
      default:
        unNumber = 'NA3077';
        shippingName = 'Waste Environmentally hazardous substances, solid, n.o.s.';
    }
    
    // Add technical names (limit to first 2)
    const techNameArray = Array.from(technicalNames).slice(0, 2);
    if (techNameArray.length > 0) {
      shippingName += ` (${techNameArray.join(', ')})`;
    }
    
    return `${unNumber}, ${shippingName}, ${primaryHazardClass}, PG ${packingGroup}`;
  }

  compareDOTClasses(class1, class2) {
    const priority = {'3': 1, '6.1': 2, '8': 3, '9': 4};
    return (priority[class1] || 5) - (priority[class2] || 5);
  }

  comparePackingGroups(pg1, pg2) {
    const priority = {'I': 1, 'II': 2, 'III': 3};
    return (priority[pg1] || 4) - (priority[pg2] || 4);
  }

  // Helper methods for enhanced compatibility checking
  getPhysicalState(material) {
    // Check multiple sources for physical state information
    const state = material.physicalState || 
                  material.form || 
                  material.appearance || 
                  material.state ||
                  'unknown';
    
    const stateStr = state.toString().toLowerCase();
    
    if (stateStr.includes('liquid') || stateStr.includes('fluid')) return 'liquid';
    if (stateStr.includes('solid') || stateStr.includes('crystal')) return 'solid';
    if (stateStr.includes('powder') || stateStr.includes('granular')) return 'powder';
    if (stateStr.includes('paste') || stateStr.includes('gel')) return 'paste';
    if (stateStr.includes('gas') || stateStr.includes('vapor')) return 'gas';
    if (stateStr.includes('absorbed') || stateStr.includes('sorbed')) return 'absorbed';
    
    return 'unknown';
  }

  getAllWasteCodes(material) {
    const codes = [];
    
    // Collect from all possible sources
    if (material.wasteCodes) codes.push(...material.wasteCodes);
    if (material.federalCodes) codes.push(...material.federalCodes);
    if (material.rcraWasteCodes) codes.push(...material.rcraWasteCodes);
    if (material.rcraClassification?.dCodes) codes.push(...material.rcraClassification.dCodes);
    if (material.classification?.waste_codes) codes.push(...material.classification.waste_codes);
    
    return [...new Set(codes)]; // Remove duplicates
  }

  isAcidWaste(codes, material) {
    // Check if material has acid characteristics
    const hasAcidCode = codes.some(code => code === 'D002');
    const hasLowPH = material.pH !== undefined && material.pH <= 2;
    const hasAcidName = (material.productName || '').toLowerCase().includes('acid');
    
    return hasAcidCode || hasLowPH || hasAcidName;
  }

  isBaseWaste(codes, material) {
    // Check if material has base characteristics  
    const hasBaseCode = codes.some(code => code === 'D002');
    const hasHighPH = material.pH !== undefined && material.pH >= 12.5;
    const hasBaseName = (material.productName || '').toLowerCase().includes('hydroxide') ||
                       (material.productName || '').toLowerCase().includes('caustic');
    
    return hasBaseCode || hasHighPH || hasBaseName;
  }

  hasReactiveU(codes) {
    // U-listed codes for reactive chemicals
    const reactiveUCodes = ['U103', 'U108', 'U159', 'U185', 'U200']; // Examples
    return codes.some(code => reactiveUCodes.includes(code));
  }

  hasIncompatibleU(codes) {
    // U-listed codes that are incompatible with reactive chemicals
    const incompatibleUCodes = ['U002', 'U019', 'U067', 'U080']; // Examples  
    return codes.some(code => incompatibleUCodes.includes(code));
  }

  hasAnyChemical(composition, targetChemicals) {
    if (!composition || composition.length === 0) return false;
    
    return composition.some(component => {
      const componentName = (component.name || '').toLowerCase();
      return targetChemicals.some(chemical => 
        componentName.includes(chemical.toLowerCase())
      );
    });
  }

  /**
   * Universal Waste Classification
   */
  checkUniversalWaste(material) {
    const name = (material.productName || '').toLowerCase();
    const composition = material.composition || [];
    
    console.log('🔍 Universal waste check for:', material.productName);
    
    const universalWasteTypes = {
      aerosols: {
        condition: () => this.isAerosol(material),
        category: 'Universal Waste - Aerosol Cans',
        requirements: ['Universal waste handler requirements', 'No lab pack required', 'Separate collection'],
        exemptions: ['RCRA hazardous waste regulations (with conditions)']
      },
      
      batteries: {
        condition: () => {
          const batteryKeywords = ['battery', 'lithium', 'nickel cadmium', 'lead acid', 'alkaline'];
          return batteryKeywords.some(keyword => name.includes(keyword));
        },
        category: 'Universal Waste - Batteries',
        requirements: ['Universal waste handler requirements', 'Terminal protection'],
        exemptions: ['RCRA hazardous waste regulations']
      },
      
      lamps: {
        condition: () => {
          const lampKeywords = ['fluorescent', 'mercury vapor', 'sodium vapor', 'metal halide', 'lamp', 'bulb'];
          const hasMercury = composition.some(c => (c.name || '').toLowerCase().includes('mercury'));
          return lampKeywords.some(keyword => name.includes(keyword)) || hasMercury;
        },
        category: 'Universal Waste - Lamps',
        requirements: ['Universal waste handler requirements', 'Prevent breakage'],
        exemptions: ['RCRA hazardous waste regulations']
      },
      
      pesticides: {
        condition: () => {
          const pesticideKeywords = ['pesticide', 'herbicide', 'insecticide', 'fungicide', 'rodenticide'];
          const hasU_codes = this.getAllWasteCodes(material).some(code => code.startsWith('U') && 
            ['U129', 'U136', 'U137', 'U138', 'U140'].includes(code)); // Common pesticide U-codes
          return pesticideKeywords.some(keyword => name.includes(keyword)) || hasU_codes;
        },
        category: 'Universal Waste - Pesticides',
        requirements: ['Universal waste handler requirements', 'Recalled/banned pesticides only'],
        exemptions: ['RCRA hazardous waste regulations (for recalled pesticides)']
      }
    };
    
    for (const [type, config] of Object.entries(universalWasteTypes)) {
      if (config.condition()) {
        console.log(`✅ Universal waste detected: ${type}`);
        return {
          isUniversalWaste: true,
          type: type,
          category: config.category,
          requirements: config.requirements,
          exemptions: config.exemptions
        };
      }
    }
    
    return {
      isUniversalWaste: false,
      type: null,
      category: null,
      requirements: [],
      exemptions: []
    };
  }

  /**
   * Comprehensive Exemption Checker
   */
  checkExemptions(material) {
    const exemptions = {
      applicable: [],
      details: {},
      confidence: 0
    };
    
    console.log('🔍 Exemption check for:', material.productName);
    
    // 1. Universal Waste Exemption
    const universalWaste = this.checkUniversalWaste(material);
    if (universalWaste.isUniversalWaste) {
      exemptions.applicable.push('Universal Waste');
      exemptions.details.universalWaste = universalWaste;
      exemptions.confidence += 0.9;
    }
    
    // 2. Household Hazardous Waste Exemption
    const householdResult = this.checkHouseholdWaste(material);
    if (householdResult.isHouseholdWaste) {
      exemptions.applicable.push('Household Hazardous Waste');
      exemptions.details.householdWaste = householdResult;
      exemptions.confidence += 0.8;
    }
    
    // 3. De Minimis Exemption (very small quantities)
    const deMinimisResult = this.checkDeMinimis(material);
    if (deMinimisResult.applicable) {
      exemptions.applicable.push('De Minimis');
      exemptions.details.deMinimis = deMinimisResult;
      exemptions.confidence += 0.6;
    }
    
    // 4. Conditionally Exempt Small Quantity Generator
    const cesqgResult = this.checkCESQG(material);
    if (cesqgResult.applicable) {
      exemptions.applicable.push('CESQG');
      exemptions.details.cesqg = cesqgResult;
      exemptions.confidence += 0.7;
    }
    
    // 5. Used Oil Exemption
    const usedOilResult = this.checkUsedOil(material);
    if (usedOilResult.isUsedOil) {
      exemptions.applicable.push('Used Oil');
      exemptions.details.usedOil = usedOilResult;
      exemptions.confidence += 0.8;
    }
    
    // 6. Precious Metals Exemption
    const preciousMetalsResult = this.checkPreciousMetals(material);
    if (preciousMetalsResult.applicable) {
      exemptions.applicable.push('Precious Metals Recovery');
      exemptions.details.preciousMetals = preciousMetalsResult;
      exemptions.confidence += 0.7;
    }
    
    exemptions.confidence = Math.min(exemptions.confidence, 1.0);
    
    console.log('🔍 Exemption results:', exemptions);
    return exemptions;
  }

  checkHouseholdWaste(material) {
    const name = (material.productName || '').toLowerCase();
    
    const householdKeywords = [
      'household', 'consumer', 'retail', 'domestic use',
      'cleaning product', 'detergent', 'soap', 'shampoo',
      'paint thinner', 'nail polish', 'cosmetic'
    ];
    
    const isHouseholdWaste = householdKeywords.some(keyword => name.includes(keyword));
    
    return {
      isHouseholdWaste,
      reason: isHouseholdWaste ? 'Generated by households in normal domestic activities' : null,
      requirements: isHouseholdWaste ? ['Solid waste regulations apply', 'RCRA hazardous waste exemption'] : []
    };
  }

  checkDeMinimis(material) {
    const volume = material.volume || 0;
    const isVerySmall = volume < 100; // Less than 100ml
    
    return {
      applicable: isVerySmall,
      reason: isVerySmall ? 'Very small quantity may qualify for de minimis exemption' : null,
      requirements: ['Verify local regulations', 'Document quantities']
    };
  }

  checkCESQG(material) {
    // This would typically be based on generator status, not individual material
    // But we can flag potential applicability
    const wasteCodes = this.getAllWasteCodes(material);
    const hasAcutelyHazardous = wasteCodes.some(code => code.startsWith('P'));
    
    return {
      applicable: !hasAcutelyHazardous,
      reason: hasAcutelyHazardous ? 'Contains P-listed waste - CESQG limits may apply' : 'May qualify for CESQG exemptions',
      requirements: ['Verify generator quantities', '<100kg/month hazardous waste', '<1kg/month acutely hazardous']
    };
  }

  checkUsedOil(material) {
    const name = (material.productName || '').toLowerCase();
    const isOil = this.isOilBased(material);
    
    const usedOilKeywords = ['used oil', 'waste oil', 'spent oil', 'motor oil', 'hydraulic oil'];
    const isUsedOil = usedOilKeywords.some(keyword => name.includes(keyword)) || 
                     (isOil && name.includes('used'));
    
    return {
      isUsedOil,
      reason: isUsedOil ? 'May be regulated as used oil rather than hazardous waste' : null,
      requirements: isUsedOil ? ['Used oil management standards', 'May avoid RCRA hazardous waste regulations'] : []
    };
  }

  checkPreciousMetals(material) {
    const composition = material.composition || [];
    
    const preciousMetals = ['gold', 'silver', 'platinum', 'palladium', 'rhodium'];
    const hasPreciousMetals = composition.some(c => 
      preciousMetals.some(metal => (c.name || '').toLowerCase().includes(metal))
    );
    
    return {
      applicable: hasPreciousMetals,
      reason: hasPreciousMetals ? 'Contains precious metals - recovery exemption may apply' : null,
      requirements: ['Legitimate precious metals recovery operation', 'Proper documentation']
    };
  }
}

export default EnhancedLabPackEngine;