// Safety Checker for Lab Pack Compatibility
// Critical safety system to prevent dangerous chemical combinations
import incompatibleMaterialsDB from '../data/incompatibleMaterialsDatabase.js';

export class SafetyChecker {
  constructor() {
    this.incompatibilityMatrix = incompatibleMaterialsDB.INCOMPATIBILITY_MATRIX;
    this.casIncompatibilities = incompatibleMaterialsDB.CAS_INCOMPATIBILITIES;
    this.physicalStateCompatibility = incompatibleMaterialsDB.PHYSICAL_STATE_COMPATIBILITY;
    this.emergencyWarnings = incompatibleMaterialsDB.EMERGENCY_WARNINGS;
  }

  /**
   * Check if two materials are compatible for lab packing
   * Returns { compatible: boolean, reason: string, severity: 'prohibited'|'dangerous'|'caution' }
   */
  checkMaterialCompatibility(material1, material2) {
    // Get material properties
    const mat1 = this.extractMaterialProperties(material1);
    const mat2 = this.extractMaterialProperties(material2);

    console.log('🔍 Safety check:', {
      material1: mat1.name,
      material2: mat2.name,
      categories: [mat1.category, mat2.category],
      cas: [mat1.cas, mat2.cas]
    });

    // 1. Check CAS-specific incompatibilities first (highest priority)
    const casCheck = this.checkCASIncompatibility(mat1, mat2);
    if (!casCheck.compatible) {
      return {
        compatible: false,
        reason: casCheck.reason,
        severity: 'prohibited',
        type: 'cas_specific',
        emergency: casCheck.emergency
      };
    }

    // 2. Check category-based incompatibilities
    const categoryCheck = this.checkCategoryIncompatibility(mat1, mat2);
    if (!categoryCheck.compatible) {
      return {
        compatible: false,
        reason: categoryCheck.reason,
        severity: categoryCheck.severity,
        type: 'category_based'
      };
    }

    // 3. Check physical state compatibility
    const physicalCheck = this.checkPhysicalStateCompatibility(mat1, mat2);
    if (!physicalCheck.compatible) {
      return {
        compatible: false,
        reason: physicalCheck.reason,
        severity: 'caution',
        type: 'physical_state'
      };
    }

    // 4. Check for emergency warning triggers
    const emergencyCheck = this.checkEmergencyWarnings(mat1, mat2);
    if (emergencyCheck.warning) {
      return {
        compatible: false,
        reason: emergencyCheck.warning,
        severity: 'prohibited',
        type: 'emergency_hazard',
        response: emergencyCheck.response
      };
    }

    return {
      compatible: true,
      reason: 'Materials are compatible for lab packing',
      severity: 'safe'
    };
  }

  /**
   * Check if a material is compatible with all materials in a lab pack
   */
  checkLabPackCompatibility(newMaterial, existingMaterials) {
    if (!existingMaterials || existingMaterials.length === 0) {
      return { compatible: true, reason: 'Empty lab pack - no conflicts' };
    }

    for (const existingMaterial of existingMaterials) {
      const compatibilityCheck = this.checkMaterialCompatibility(newMaterial, existingMaterial);
      
      if (!compatibilityCheck.compatible) {
        return {
          compatible: false,
          reason: `Incompatible with "${existingMaterial.productName}": ${compatibilityCheck.reason}`,
          severity: compatibilityCheck.severity,
          conflictingMaterial: existingMaterial.productName,
          details: compatibilityCheck
        };
      }
    }

    return { compatible: true, reason: 'Compatible with all materials in lab pack' };
  }

  /**
   * Extract relevant properties from material for safety checking
   */
  extractMaterialProperties(material) {
    // Get chemical constituents from Section 3 if available
    const constituents = material.constituents || [];
    const primaryConstituent = constituents.length > 0 ? constituents[0] : null;

    return {
      name: material.productName || 'Unknown',
      cas: primaryConstituent?.cas || material.cas || null,
      category: this.determineMaterialCategory(material),
      physicalState: material.physicalState?.toLowerCase() || 'unknown',
      pH: material.pH,
      flashPoint: material.flashPoint,
      hazardClass: material.dotShipping?.hazardClass || material.hazardClass,
      rcra: material.rcraCharacteristic || [],
      constituents: constituents
    };
  }

  /**
   * Determine material category for compatibility checking
   */
  determineMaterialCategory(material) {
    const name = (material.productName || '').toLowerCase();
    const hazardClass = material.dotShipping?.hazardClass || material.hazardClass;
    const rcra = material.rcraCharacteristic || [];
    const pH = material.pH;

    // Check for specific categories based on common chemicals
    if (name.includes('hypochlorite') || name.includes('bleach')) return 'oxidizers';
    if (name.includes('acid') && !name.includes('non-')) {
      if (name.includes('nitric') || name.includes('chromic')) return 'acids_oxidizing';
      return 'acids_inorganic';
    }
    if (name.includes('hydroxide') || name.includes('caustic')) return 'bases_inorganic';
    if (name.includes('cyanide')) return 'cyanides';
    if (name.includes('peroxide')) return 'peroxides';
    if (name.includes('metal') || name.includes('sodium') || name.includes('potassium')) return 'reactive_metals';

    // Check by DOT hazard class
    if (hazardClass === '3') return 'flammable_organic';
    if (hazardClass === '5.1') return 'oxidizers';
    if (hazardClass === '8') {
      if (pH !== null && pH !== undefined) {
        return pH <= 2 ? 'acids_inorganic' : pH >= 12.5 ? 'bases_inorganic' : 'corrosive_other';
      }
      return 'corrosive_other';
    }
    if (hazardClass === '6.1') return 'toxic_inorganic';

    // Check by RCRA codes
    if (rcra.includes('D001')) return 'flammable_organic';
    if (rcra.includes('D002')) return pH <= 2 ? 'acids_inorganic' : 'bases_inorganic';
    if (rcra.includes('D003')) return 'reactive_materials';

    return 'unknown';
  }

  /**
   * Check CAS-specific incompatibilities
   */
  checkCASIncompatibility(mat1, mat2) {
    // Check if either material has specific CAS incompatibilities
    for (const material of [mat1, mat2]) {
      if (!material.cas) continue;

      const incompatibilities = this.casIncompatibilities[material.cas];
      if (!incompatibilities) continue;

      const otherMaterial = material === mat1 ? mat2 : mat1;

      // Check prohibited CAS numbers
      if (incompatibilities.prohibited_cas?.includes(otherMaterial.cas)) {
        return {
          compatible: false,
          reason: incompatibilities.reason,
          emergency: this.checkForEmergencyResponse(material.cas, otherMaterial.cas)
        };
      }

      // Check prohibited categories
      if (incompatibilities.prohibited_categories?.includes(otherMaterial.category)) {
        return {
          compatible: false,
          reason: incompatibilities.reason,
          emergency: this.checkForEmergencyResponse(material.cas, otherMaterial.category)
        };
      }
    }

    return { compatible: true };
  }

  /**
   * Check category-based incompatibilities
   */
  checkCategoryIncompatibility(mat1, mat2) {
    const category1 = mat1.category;
    const category2 = mat2.category;

    // Get incompatibility rules for both categories
    const rules1 = this.incompatibilityMatrix[category1];
    const rules2 = this.incompatibilityMatrix[category2];

    // Check if either category prohibits the other
    if (rules1?.prohibited?.includes(category2)) {
      return {
        compatible: false,
        reason: rules1.reason,
        severity: 'prohibited'
      };
    }

    if (rules2?.prohibited?.includes(category1)) {
      return {
        compatible: false,
        reason: rules2.reason,
        severity: 'prohibited'
      };
    }

    // Check for dangerous combinations
    if (rules1?.dangerous?.includes(category2)) {
      return {
        compatible: false,
        reason: `Dangerous combination: ${rules1.reason}`,
        severity: 'dangerous'
      };
    }

    if (rules2?.dangerous?.includes(category1)) {
      return {
        compatible: false,
        reason: `Dangerous combination: ${rules2.reason}`,
        severity: 'dangerous'
      };
    }

    // Special case: Check for "ALL" prohibition (like oxidizing acids)
    if (rules1?.prohibited?.includes('ALL') || rules2?.prohibited?.includes('ALL')) {
      return {
        compatible: false,
        reason: 'This material cannot be mixed with any other materials',
        severity: 'prohibited'
      };
    }

    return { compatible: true };
  }

  /**
   * Check physical state compatibility
   */
  checkPhysicalStateCompatibility(mat1, mat2) {
    const state1 = mat1.physicalState;
    const state2 = mat2.physicalState;

    const rules1 = this.physicalStateCompatibility[state1];
    const rules2 = this.physicalStateCompatibility[state2];

    if (rules1?.incompatible_with?.includes(state2)) {
      return {
        compatible: false,
        reason: `Physical states incompatible: ${rules1.notes}`
      };
    }

    if (rules2?.incompatible_with?.includes(state1)) {
      return {
        compatible: false,
        reason: `Physical states incompatible: ${rules2.notes}`
      };
    }

    return { compatible: true };
  }

  /**
   * Check for emergency warning triggers
   */
  checkEmergencyWarnings(mat1, mat2) {
    for (const [warningType, warningData] of Object.entries(this.emergencyWarnings)) {
      for (const combination of warningData.trigger_combinations) {
        const [trigger1, trigger2] = combination;
        
        // Check if materials match the trigger combination
        if (this.materialMatchesTrigger(mat1, trigger1) && this.materialMatchesTrigger(mat2, trigger2)) {
          return {
            warning: warningData.warning,
            response: warningData.response,
            type: warningType
          };
        }
        
        // Check reverse combination
        if (this.materialMatchesTrigger(mat1, trigger2) && this.materialMatchesTrigger(mat2, trigger1)) {
          return {
            warning: warningData.warning,
            response: warningData.response,
            type: warningType
          };
        }
      }
    }

    return { warning: null };
  }

  /**
   * Check if material matches a trigger pattern
   */
  materialMatchesTrigger(material, trigger) {
    const name = material.name.toLowerCase();
    const category = material.category;
    const cas = material.cas;

    // Direct name match
    if (name.includes(trigger.toLowerCase())) return true;
    
    // Category match
    if (category === trigger) return true;
    
    // CAS match
    if (cas === trigger) return true;
    
    // Partial matches for common chemicals
    if (trigger === 'acid' && (category.includes('acid') || name.includes('acid'))) return true;
    if (trigger === 'base' && (category.includes('base') || name.includes('hydroxide'))) return true;
    if (trigger === 'metal' && (category.includes('metal') || name.includes('metal'))) return true;
    
    return false;
  }

  /**
   * Check for emergency response requirements
   */
  checkForEmergencyResponse(identifier1, identifier2) {
    // This would check against emergency response database
    // For now, return basic emergency info for known dangerous combinations
    const dangerousPairs = [
      ['7681-52-9', 'acid'], // Bleach + acid = chlorine gas
      ['143-33-9', 'acid'],  // Cyanide + acid = HCN gas
      ['7722-84-1', 'organic'] // Peroxide + organic = explosion
    ];
    
    for (const [id1, id2] of dangerousPairs) {
      if ((identifier1 === id1 && identifier2.includes(id2)) || 
          (identifier2 === id1 && identifier1.includes(id2))) {
        return {
          required: true,
          level: 'immediate_evacuation',
          equipment: ['SCBA', 'hazmat_suit'],
          contacts: ['emergency_services', 'hazmat_team']
        };
      }
    }
    
    return { required: false };
  }
}

export default new SafetyChecker();