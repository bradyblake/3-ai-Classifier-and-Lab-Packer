// Enhanced Chemical Compatibility Engine
// Bulletproof chemical segregation and reaction prevention system

import { AdaptiveLearningEngine } from './AdaptiveLearningEngine.js';

export class ChemicalCompatibilityEngine {
  constructor() {
    this.initializeReactivityDatabase();
    this.initializeCompatibilityMatrix();
    this.initializeProductDatabase();
    this.initializeDOTMatrix();
    this.learningEngine = new AdaptiveLearningEngine();
  }

  initializeReactivityDatabase() {
    // Comprehensive reactive chemical groups database
    this.reactiveGroups = {
      // EXTREMELY HAZARDOUS - Never mix
      'strong_acids': {
        identifiers: ['hydrochloric', 'sulfuric', 'nitric', 'phosphoric', 'hydrobromic', 'hydroiodic'],
        cas_numbers: ['7647-01-0', '7664-93-9', '7697-37-2', '7664-38-2'],
        incompatible_with: ['strong_bases', 'cyanides', 'sulfides', 'hypochlorites', 'carbonates'],
        reactions: ['violent_neutralization', 'toxic_gas_generation', 'explosion']
      },
      
      'strong_bases': {
        identifiers: ['sodium_hydroxide', 'potassium_hydroxide', 'caustic', 'lye'],
        cas_numbers: ['1310-73-2', '1310-58-3', '17194-00-2'],
        incompatible_with: ['strong_acids', 'aluminum', 'zinc', 'organic_acids'],
        reactions: ['violent_neutralization', 'hydrogen_generation', 'heat_generation']
      },
      
      'oxidizers': {
        identifiers: ['peroxide', 'hypochlorite', 'bleach', 'permanganate', 'dichromate', 'nitrate'],
        cas_numbers: ['7722-84-1', '7681-52-9', '10022-70-5'],
        incompatible_with: ['flammables', 'organics', 'reducing_agents', 'metals'],
        reactions: ['fire', 'explosion', 'rapid_oxidation']
      },
      
      'water_reactive': {
        identifiers: ['alkali_metals', 'carbides', 'hydrides', 'anhydrides', 'phosphorus'],
        cas_numbers: ['7440-23-5', '7440-09-7', '7723-14-0'],
        incompatible_with: ['water', 'aqueous_solutions', 'alcohols'],
        reactions: ['hydrogen_generation', 'fire', 'explosion', 'toxic_gas']
      },
      
      'cyanides': {
        identifiers: ['cyanide', 'ferrocyanide', 'ferricyanide'],
        cas_numbers: ['143-33-9', '151-50-8', '544-92-3'],
        incompatible_with: ['acids_any', 'oxidizers', 'heat'],
        reactions: ['hydrogen_cyanide_gas', 'death', 'explosion']
      },
      
      'sulfides': {
        identifiers: ['sulfide', 'hydrogen_sulfide'],
        cas_numbers: ['1317-82-4', '7783-06-4'],
        incompatible_with: ['acids_any', 'oxidizers'],
        reactions: ['hydrogen_sulfide_gas', 'toxic_exposure']
      },
      
      'organic_peroxides': {
        identifiers: ['peroxide', 'hydroperoxide'],
        cas_numbers: ['94-36-0', '78-18-2'],
        incompatible_with: ['heat', 'shock', 'friction', 'metals'],
        reactions: ['explosive_decomposition', 'fire', 'toxic_vapors']
      },
      
      'flammable_liquids': {
        identifiers: ['acetone', 'alcohol', 'ether', 'benzene', 'toluene', 'xylene', 'mek', 'methanol'],
        cas_numbers: ['67-64-1', '64-17-5', '71-43-2', '108-88-3'],
        incompatible_with: ['oxidizers', 'strong_acids', 'heat_sources'],
        flash_points: {'acetone': -18, 'methanol': 11, 'ethanol': 13, 'toluene': 4}
      },
      
      'aerosols': {
        identifiers: ['aerosol', 'spray', 'propellant', 'pressurized'],
        product_names: ['wd-40', 'brake_cleaner', 'contact_cleaner', 'compressed_air'],
        incompatible_with: ['heat', 'puncture', 'compression'],
        special_handling: ['pressure_sensitive', 'separate_packing', 'cushioning_required']
      },
      
      'halogenated_solvents': {
        identifiers: ['chlorinated', 'fluorinated', 'brominated'],
        cas_numbers: ['75-09-2', '127-18-4', '79-01-6'],
        incompatible_with: ['aluminum', 'magnesium', 'strong_bases'],
        reactions: ['corrosion', 'degradation']
      },
      
      'petroleum_products': {
        identifiers: ['diesel', 'gasoline', 'kerosene', 'fuel', 'mineral_spirits', 'petroleum'],
        cas_numbers: ['68476-34-6', '8006-61-9'],
        incompatible_with: ['oxidizers', 'strong_acids'],
        flash_points: {'gasoline': -45, 'diesel': 52, 'kerosene': 38}
      }
    };
  }

  initializeCompatibilityMatrix() {
    // DOT-based segregation table (49 CFR 173.12)
    this.dotSegregationTable = {
      // Class 1 - Explosives
      '1.1': { separate_from: ['*'], package_separately: true },
      '1.2': { separate_from: ['*'], package_separately: true },
      '1.3': { separate_from: ['*'], package_separately: true },
      
      // Class 2 - Gases
      '2.1': { separate_from: ['4.1', '4.2', '4.3', '5.1', '5.2'], away_from: ['8'] }, // Flammable gas
      '2.2': { compatible_with: ['most'], special_notes: ['non_flammable_gas'] }, // Non-flammable gas
      '2.3': { separate_from: ['*'], special_handling: ['poison_gas'] }, // Poison gas
      
      // Class 3 - Flammable liquids
      '3': { separate_from: ['4.1', '4.2', '4.3', '5.1', '5.2', '8'], away_from: ['1', '2.3'] },
      
      // Class 4 - Flammable solids
      '4.1': { separate_from: ['3', '5.1', '5.2', '8'] }, // Flammable solid
      '4.2': { separate_from: ['3', '4.3', '5.1', '5.2', '8'] }, // Spontaneously combustible
      '4.3': { separate_from: ['3', '4.2', '5.1', '5.2', '8'] }, // Water reactive
      
      // Class 5 - Oxidizers
      '5.1': { separate_from: ['3', '4.1', '4.2', '4.3', '8'] }, // Oxidizer
      '5.2': { separate_from: ['*'], package_separately: true }, // Organic peroxide
      
      // Class 6 - Toxic/Infectious
      '6.1': { separate_from: ['*'], special_handling: ['poison'] }, // Poison
      
      // Class 8 - Corrosives
      '8': { separate_from: ['3', '4.1', '4.2', '4.3', '5.1'], special_handling: ['corrosive'] },
      
      // Class 9 - Miscellaneous
      '9': { compatible_with: ['most'], special_notes: ['miscellaneous'] }
    };
  }

  initializeProductDatabase() {
    // Comprehensive product recognition database
    this.productDatabase = {
      // Brake cleaners - ALL are aerosols and flammable
      'brake_cleaner_patterns': [
        'brake cleaner', 'brake clean', 'brake fluid', 'disc brake', 'brake parts',
        'non-chlorinated brake', 'chlorinated brake', 'crc brakleen'
      ],
      
      // Contact cleaners - Usually aerosols
      'contact_cleaner_patterns': [
        'contact cleaner', 'electrical cleaner', 'electronic cleaner', 'switch cleaner'
      ],
      
      // Penetrating oils - Usually aerosols
      'penetrating_oil_patterns': [
        'wd-40', 'wd40', 'penetrating oil', 'rust penetrant', 'liquid wrench'
      ],
      
      // Compressed air - Aerosols
      'compressed_air_patterns': [
        'compressed air', 'air duster', 'dust off', 'blow off'
      ],
      
      // Caustic materials
      'caustic_patterns': [
        'sodium hydroxide', 'caustic soda', 'lye', 'drain cleaner', 'oven cleaner',
        'parts washer', 'degreaser solution', 'alkaline cleaner'
      ],
      
      // Acids
      'acid_patterns': [
        'hydrochloric', 'muriatic', 'sulfuric', 'battery acid', 'nitric',
        'phosphoric', 'acetic', 'citric', 'oxalic'
      ],
      
      // Oxidizers/Bleaches
      'oxidizer_patterns': [
        'bleach', 'hypochlorite', 'hydrogen peroxide', 'pool shock',
        'calcium hypochlorite', 'sodium hypochlorite'
      ],
      
      // Flammable solvents
      'flammable_patterns': [
        'acetone', 'mek', 'methyl ethyl ketone', 'toluene', 'xylene',
        'alcohol', 'methanol', 'ethanol', 'isopropanol', 'ipa'
      ],
      
      // Petroleum products
      'petroleum_patterns': [
        'diesel', 'gasoline', 'kerosene', 'fuel oil', 'mineral spirits',
        'paint thinner', 'petroleum distillate', 'stoddard solvent'
      ]
    };
  }

  initializeDOTMatrix() {
    // Enhanced DOT compatibility with specific chemical interactions
    this.enhancedDOTMatrix = {
      // Aerosol-specific rules (UN1950 - Aerosols)
      'aerosols': {
        dot_class: '2.1', // Usually flammable gas
        must_segregate_from: ['oxidizers', 'corrosives', 'heat_sources'],
        packing_requirements: ['cushioning', 'pressure_relief', 'separate_container'],
        temperature_sensitive: true,
        max_temp: 49 // °C
      }
    };
  }

  /**
   * Enhanced material detection and classification with ambiguity detection
   */
  detectMaterialType(material, userClassifications = {}) {
    const name = (material.productName || '').toLowerCase().trim();
    const composition = material.composition || [];
    const materialId = material.id || material.productName;
    
    const detection = {
      material_types: [],
      hazard_classes: [],
      special_handling: [],
      confidence: 0,
      warnings: [],
      ambiguous_types: [],
      requires_classification: false
    };

    // Check if user has already classified this material
    const userClassification = userClassifications[materialId];
    if (userClassification) {
      return this.applyUserClassification(material, userClassification);
    }

    // Check learning engine for historical predictions
    const learningPrediction = this.learningEngine.predictClassification(material);
    if (learningPrediction.prediction && !learningPrediction.requiresUserInput) {
      console.log(`🧠 Learning engine predicted: ${learningPrediction.prediction} (confidence: ${learningPrediction.confidence.toFixed(2)})`);
      return this.applyUserClassification(material, { classification: learningPrediction.prediction });
    }

    // 1. DETECT AMBIGUOUS MATERIALS FIRST
    
    // Gas/Pressurized Liquid ambiguity
    if (this.isGasOrPressurizedLiquid(name, material)) {
      detection.ambiguous_types.push('gas_or_aerosol');
      detection.requires_classification = true;
      detection.warnings.push('AMBIGUOUS: Could be pressurized cylinder OR aerosol can - user classification required');
      return detection; // Return early for user input
    }

    // Flammable vs Combustible ambiguity  
    if (this.isFlammableOrCombustible(name, composition, material)) {
      detection.ambiguous_types.push('flammable_or_combustible');
      detection.requires_classification = true;
      detection.warnings.push('AMBIGUOUS: Flash point unclear - user classification required');
      return detection; // Return early for user input
    }

    // 2. CRITICAL SAFETY DETECTIONS (High specificity)
    
    // Strong Acids (must be detected)
    if (this.isStrongAcid(name, composition)) {
      detection.material_types.push('acid', 'strong_acid');
      detection.hazard_classes.push('8');
      detection.special_handling.push('corrosive', 'gas_generation_risk');
      detection.confidence += 0.4;
      detection.warnings.push('STRONG ACID: Must be segregated from bases and metals');
    }

    // Strong Bases (must be detected)  
    if (this.isStrongBase(name, composition)) {
      detection.material_types.push('caustic', 'strong_base');
      detection.hazard_classes.push('8');
      detection.special_handling.push('corrosive', 'neutralization_risk');
      detection.confidence += 0.4;
      detection.warnings.push('STRONG BASE: Must be segregated from acids');
    }

    // Oxidizers (must be detected)
    if (this.isOxidizer(name, composition)) {
      detection.material_types.push('oxidizer');
      detection.hazard_classes.push('5.1');
      detection.special_handling.push('oxidizer', 'fire_enhancement');
      detection.confidence += 0.4;
      detection.warnings.push('OXIDIZER: Must be segregated from flammables');
    }

    // 3. CLEAR AEROSOL DETECTION (no ambiguity)
    if (this.isClearAerosol(name, material)) {
      detection.material_types.push('aerosol');
      detection.hazard_classes.push('2.1'); // Most aerosols
      detection.special_handling.push('pressure_sensitive');
      detection.confidence += 0.3;
    }

    // 4. BRAKE CLEANER SPECIFIC DETECTION
    if (this.isBrakeCleanerType(name)) {
      detection.material_types.push('brake_cleaner');
      if (!detection.material_types.includes('aerosol')) {
        detection.material_types.push('flammable_solvent');
      }
      detection.hazard_classes.push('3');
      detection.special_handling.push('flammable', 'vapor_hazard');
      detection.confidence += 0.3;
    }

    // 5. CLEAR FLAMMABLE DETECTION (only if obvious)
    if (this.isObviouslyFlammable(name, composition, material)) {
      if (!detection.material_types.some(type => ['brake_cleaner', 'aerosol'].includes(type))) {
        detection.material_types.push('flammable_liquid');
        detection.hazard_classes.push('3');
        detection.special_handling.push('flammable');
        detection.confidence += 0.2;
      }
    }

    // 6. PRESSURIZED CYLINDER DETECTION (clear case)
    if (this.isClearPressurizedCylinder(name, material)) {
      detection.material_types.push('pressurized_cylinder');
      detection.hazard_classes.push('2.2'); // Non-flammable gas (default)
      detection.special_handling.push('cylinder_handling', 'no_lab_pack');
      detection.confidence += 0.3;
      detection.warnings.push('PRESSURIZED CYLINDER: Cannot be lab packed - requires separate handling');
    }

    // 7. DEFAULT TO GENERAL IF NO SPECIFIC HAZARDS DETECTED
    if (detection.material_types.length === 0 && !detection.requires_classification) {
      detection.material_types.push('general_chemicals');
      detection.confidence = 0.1; // Low confidence = can be grouped with other general
    }

    return detection;
  }

  /**
   * Enhanced aerosol detection
   */
  isAerosol(name, material) {
    // Direct aerosol keywords
    const aerosolKeywords = [
      'aerosol', 'spray', 'pressurized', 'compressed',
      'wd-40', 'wd40', 'brake cleaner', 'contact cleaner',
      'penetrating oil', 'dust off', 'air duster'
    ];

    // Check product name
    if (aerosolKeywords.some(keyword => name.includes(keyword))) {
      return true;
    }

    // Check UN number (UN1950 = Aerosols)
    if (material.unNumber === 'UN1950' || material.unNumber === '1950') {
      return true;
    }

    // Check packaging description for aerosol indicators
    const packaging = (material.packaging || '').toLowerCase();
    if (packaging.includes('pressurized') || packaging.includes('aerosol can')) {
      return true;
    }

    return false;
  }

  /**
   * Specific brake cleaner detection
   */
  isBrakeCleanerType(name) {
    const brakeCleanerPatterns = [
      'brake cleaner', 'brake clean', 'brakleen', 'brake fluid remover',
      'disc brake cleaner', 'brake parts cleaner', 'non-chlorinated brake',
      'chlorinated brake cleaner', 'crc brake', 'gunk brake'
    ];

    return brakeCleanerPatterns.some(pattern => name.includes(pattern));
  }

  /**
   * Enhanced compatibility checking with proper grouping logic
   */
  checkCompatibility(material1, material2) {
    const detection1 = this.detectMaterialType(material1);
    const detection2 = this.detectMaterialType(material2);

    const result = {
      compatible: true,
      risk_level: 'low',
      issues: [],
      recommendations: [],
      segregation_required: false
    };

    // CRITICAL RULE 1: Chemical reactivity (SEVERE - Never mix)
    const reactivity = this.checkChemicalReactivity(detection1, detection2);
    if (!reactivity.compatible) {
      result.compatible = false;
      result.risk_level = 'severe';
      result.issues.push(...reactivity.issues);
      result.recommendations.push(...reactivity.recommendations);
      return result;
    }

    // CRITICAL RULE 2: Aerosol vs non-aerosol segregation 
    const hasAerosol1 = detection1.material_types.includes('aerosol');
    const hasAerosol2 = detection2.material_types.includes('aerosol');

    if (hasAerosol1 !== hasAerosol2) {
      result.compatible = false;
      result.risk_level = 'moderate'; // Changed from severe - this is segregation not reaction
      result.segregation_required = true;
      result.issues.push('AEROSOLS must be packed separately from non-aerosols');
      result.recommendations.push('Use separate container for aerosol products');
      return result;
    }

    // CRITICAL RULE 3: DOT hazard class incompatibility (SEVERE violations only)
    const incompatibleDOT = this.checkDOTIncompatibility(detection1.hazard_classes, detection2.hazard_classes);
    if (incompatibleDOT && incompatibleDOT.severity === 'severe') {
      result.compatible = false;
      result.risk_level = 'severe';
      result.issues.push(`DOT SEGREGATION REQUIRED: ${incompatibleDOT.reason}`);
      result.recommendations.push('Follow DOT segregation table requirements');
      return result;
    }

    // COMPATIBILITY RULES - Allow grouping of similar materials
    
    // Rule: Compatible material types can be grouped together
    const compatibleGroups = [
      // Flammable liquids group
      ['flammable_liquid', 'flammable_solvent', 'brake_cleaner'],
      // Petroleum products group  
      ['petroleum_products', 'flammable_petroleum'],
      // Aerosol group (all aerosols can generally go together if similar chemistry)
      ['aerosol'],
      // Corrosives group (acids with acids, bases with bases)
      ['acid', 'caustic'],
      // General chemicals
      ['general_chemicals']
    ];

    const types1 = detection1.material_types;
    const types2 = detection2.material_types;

    // Check if materials belong to the same compatible group
    for (const group of compatibleGroups) {
      const inGroup1 = types1.some(type => group.includes(type));
      const inGroup2 = types2.some(type => group.includes(type));
      
      if (inGroup1 && inGroup2) {
        // Both materials are in the same compatible group
        result.compatible = true;
        result.recommendations.push(`Compatible materials: both are ${group.join('/')}`);
        return result;
      }
    }

    // If no specific grouping found, check for obvious incompatibilities
    const hasFlammable1 = types1.some(type => 
      ['flammable_liquid', 'flammable_solvent', 'brake_cleaner', 'petroleum_products'].includes(type)
    );
    const hasFlammable2 = types2.some(type => 
      ['flammable_liquid', 'flammable_solvent', 'brake_cleaner', 'petroleum_products'].includes(type)
    );

    // Only segregate flammables from non-flammables if one is clearly non-flammable
    if (hasFlammable1 !== hasFlammable2) {
      // Check if the "non-flammable" one is actually just unidentified
      const hasGeneralTypes1 = types1.includes('general_chemicals') || types1.length === 0;
      const hasGeneralTypes2 = types2.includes('general_chemicals') || types2.length === 0;
      
      // If one is general/unknown, allow compatibility (don't over-segregate)
      if (hasGeneralTypes1 || hasGeneralTypes2) {
        result.compatible = true;
        result.recommendations.push('One material is general/unknown type - allowing grouping');
        return result;
      }
      
      // Both are specifically identified and incompatible
      result.compatible = false;
      result.risk_level = 'moderate';
      result.issues.push('FLAMMABLE vs NON-FLAMMABLE segregation required');
      result.recommendations.push('Group flammable materials separately');
      return result;
    }

    // Default to compatible if no specific incompatibility found
    result.compatible = true;
    return result;
  }

  /**
   * DOT hazard class incompatibility checking
   */
  checkDOTIncompatibility(classes1, classes2) {
    for (const class1 of classes1) {
      for (const class2 of classes2) {
        const segregation = this.dotSegregationTable[class1];
        if (segregation && segregation.separate_from) {
          if (segregation.separate_from.includes(class2) || segregation.separate_from.includes('*')) {
            return {
              reason: `DOT Class ${class1} must be segregated from Class ${class2}`,
              severity: 'severe'
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Chemical reactivity checking
   */
  checkChemicalReactivity(detection1, detection2) {
    const result = { compatible: true, issues: [], recommendations: [] };

    // Check for severe reactive combinations
    for (const type1 of detection1.material_types) {
      for (const type2 of detection2.material_types) {
        const group1 = this.reactiveGroups[type1];
        const group2 = this.reactiveGroups[type2];

        if (group1 && group1.incompatible_with.includes(type2)) {
          result.compatible = false;
          result.issues.push(`REACTIVE INCOMPATIBILITY: ${type1} + ${type2} = ${group1.reactions.join(', ')}`);
          result.recommendations.push('Maintain complete segregation - different containers required');
        }

        if (group2 && group2.incompatible_with.includes(type1)) {
          result.compatible = false;
          result.issues.push(`REACTIVE INCOMPATIBILITY: ${type2} + ${type1} = ${group2.reactions.join(', ')}`);
          result.recommendations.push('Maintain complete segregation - different containers required');
        }
      }
    }

    return result;
  }

  /**
   * Apply user classification to override automatic detection
   */
  applyUserClassification(material, userClassification) {
    const classification = userClassification.classification;
    
    const detection = {
      material_types: [],
      hazard_classes: [],
      special_handling: [],
      confidence: 0.9, // High confidence in user input
      warnings: [],
      user_classified: true,
      user_notes: userClassification.userNotes || ''
    };

    switch (classification) {
      case 'pressurized_cylinder':
        detection.material_types.push('pressurized_cylinder');
        detection.hazard_classes.push('2.2'); // Default non-flammable gas
        detection.special_handling.push('cylinder_handling', 'no_lab_pack', 'upright_storage');
        detection.warnings.push('USER CLASSIFIED: Pressurized cylinder - cannot be lab packed');
        break;

      case 'aerosol':
        detection.material_types.push('aerosol');
        detection.hazard_classes.push('2.1'); // UN1950 aerosols
        detection.special_handling.push('pressure_sensitive', 'separate_from_non_aerosols');
        detection.warnings.push('USER CLASSIFIED: Aerosol can - must segregate from non-aerosols');
        break;

      case 'flammable_liquid':
        detection.material_types.push('flammable_liquid');
        detection.hazard_classes.push('3');
        detection.special_handling.push('flammable', 'fire_hazard');
        detection.warnings.push('USER CLASSIFIED: Flammable liquid - flash point < 100°F');
        break;

      case 'combustible_liquid':
        detection.material_types.push('combustible_liquid');
        // No DOT class for combustible liquids (flash point 100-200°F)
        detection.special_handling.push('combustible', 'moderate_fire_risk');
        detection.warnings.push('USER CLASSIFIED: Combustible liquid - flash point 100-200°F');
        break;

      default:
        detection.material_types.push('general_chemicals');
        detection.confidence = 0.5;
        detection.warnings.push('USER CLASSIFIED: General chemical classification applied');
    }

    return detection;
  }

  /**
   * Detect gas/pressurized liquid ambiguity
   */
  isGasOrPressurizedLiquid(name, material) {
    // Ambiguous terms that could be either cylinders or aerosols
    const ambiguousTerms = [
      'gas', 'pressurized liquid', 'compressed', 'under pressure',
      'pressurized container', 'gas cylinder', 'pressure vessel'
    ];
    
    const hasAmbiguousTerm = ambiguousTerms.some(term => name.includes(term));
    const hasAmbiguousState = material.physicalState && 
      material.physicalState.toLowerCase().includes('gas') ||
      material.physicalState.toLowerCase().includes('pressurized');
    
    // If it's clearly an aerosol, don't flag as ambiguous
    if (this.isClearAerosol(name, material)) {
      return false;
    }
    
    // If it's clearly a cylinder, don't flag as ambiguous  
    if (this.isClearPressurizedCylinder(name, material)) {
      return false;
    }
    
    return hasAmbiguousTerm || hasAmbiguousState;
  }

  /**
   * Detect flammable vs combustible ambiguity
   */
  isFlammableOrCombustible(name, composition, material) {
    // Look for generic fire-related terms without specific flash point info
    const genericTerms = ['flammable', 'combustible', 'fire hazard', 'ignitable'];
    const hasGenericTerm = genericTerms.some(term => name.includes(term));
    
    // If flash point is specified, not ambiguous
    if (material.flashPoint !== undefined) {
      return false;
    }
    
    // If it's obviously flammable (acetone, etc.), not ambiguous
    if (this.isObviouslyFlammable(name, composition, material)) {
      return false;
    }
    
    return hasGenericTerm;
  }

  /**
   * Clear aerosol detection (no ambiguity)
   */
  isClearAerosol(name, material) {
    const clearAerosolTerms = [
      'aerosol', 'spray can', 'wd-40', 'wd40', 'brake cleaner',
      'contact cleaner', 'dust off', 'air duster', 'compressed air duster'
    ];
    
    const hasClearTerm = clearAerosolTerms.some(term => name.includes(term));
    const hasAerosolUN = material.unNumber === 'UN1950' || material.unNumber === '1950';
    const hasAerosolPackaging = material.packaging && 
      (material.packaging.toLowerCase().includes('aerosol') || 
       material.packaging.toLowerCase().includes('spray can'));
    
    return hasClearTerm || hasAerosolUN || hasAerosolPackaging;
  }

  /**
   * Clear pressurized cylinder detection (no ambiguity)
   */
  isClearPressurizedCylinder(name, material) {
    const clearCylinderTerms = [
      'propane tank', 'gas cylinder', 'welding gas', 'co2 cylinder',
      'oxygen cylinder', 'nitrogen cylinder', 'helium cylinder',
      'acetylene cylinder', 'argon cylinder'
    ];
    
    const hasClearTerm = clearCylinderTerms.some(term => name.includes(term));
    const hasLargeSize = material.size && 
      (material.size.includes('gallon') || material.size.includes('liter') || 
       material.size.includes('cubic feet') || material.size.includes('cu ft'));
    
    return hasClearTerm || hasLargeSize;
  }

  // Helper methods for material detection
  isStrongAcid(name, composition) {
    const strongAcidTerms = ['hydrochloric', 'sulfuric', 'nitric', 'phosphoric', 'muriatic', 'battery acid'];
    return strongAcidTerms.some(term => name.includes(term)) ||
           composition.some(comp => comp.name && strongAcidTerms.some(term => comp.name.toLowerCase().includes(term)));
  }

  isStrongBase(name, composition) {
    const strongBaseTerms = ['caustic', 'sodium hydroxide', 'potassium hydroxide', 'lye'];
    return strongBaseTerms.some(term => name.includes(term)) || 
           composition.some(comp => comp.name && strongBaseTerms.some(term => comp.name.toLowerCase().includes(term)));
  }

  isOxidizer(name, composition) {
    const oxidizerTerms = ['bleach', 'hypochlorite', 'hydrogen peroxide', 'permanganate', 'nitrate', 'pool shock'];
    return oxidizerTerms.some(term => name.includes(term)) ||
           composition.some(comp => comp.name && oxidizerTerms.some(term => comp.name.toLowerCase().includes(term)));
  }

  isCaustic(name, composition) {
    // Keep for legacy compatibility
    return this.isStrongBase(name, composition);
  }

  isAcid(name, composition) {
    // Keep for legacy compatibility  
    return this.isStrongAcid(name, composition);
  }

  isObviouslyFlammable(name, composition, material) {
    // Only detect clearly flammable materials to avoid over-classification
    const obviousFlammableTerms = ['acetone', 'methanol', 'ethanol', 'toluene', 'xylene', 'mek', 'alcohol', 'gasoline', 'diesel'];
    const hasObviousName = obviousFlammableTerms.some(term => name.includes(term));
    const hasLowFlashPoint = material.flashPoint !== undefined && material.flashPoint < 60;
    const hasFlammableComposition = composition.some(comp => 
      comp.name && obviousFlammableTerms.some(term => comp.name.toLowerCase().includes(term))
    );
    
    return hasObviousName || hasLowFlashPoint || hasFlammableComposition;
  }

  isFlammableLiquid(name, composition, material) {
    // Keep for legacy compatibility
    return this.isObviouslyFlammable(name, composition, material);
  }

  /**
   * Record user classification for learning and future predictions
   */
  recordUserClassification(material, userClassification, originalDetection) {
    console.log(`📚 Recording classification: ${material.productName} -> ${userClassification.classification}`);
    this.learningEngine.recordClassification(material, userClassification.classification, originalDetection);
  }

  /**
   * Get learning statistics for monitoring adaptive improvements
   */
  getLearningStatistics() {
    return this.learningEngine.getStatistics();
  }

  /**
   * Export learning data for backup or analysis
   */
  exportLearningData() {
    return this.learningEngine.exportData();
  }

  /**
   * Import learning data from backup
   */
  importLearningData(data) {
    return this.learningEngine.importData(data);
  }

  /**
   * Clear all learning data (for testing or reset)
   */
  clearLearningData() {
    this.learningEngine.clearLearningData();
  }
}