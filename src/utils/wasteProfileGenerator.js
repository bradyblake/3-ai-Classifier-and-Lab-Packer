// Waste Profile Generator - Creates EPA-compliant waste profiles from lab pack data
export class WasteProfileGenerator {
  constructor() {
    this.storageKey = 'unboxed_waste_profiles';
  }

  // Get all saved waste profiles
  getAllProfiles() {
    try {
      const profilesData = localStorage.getItem(this.storageKey);
      return profilesData ? JSON.parse(profilesData) : [];
    } catch (error) {
      console.error('Error loading waste profiles:', error);
      return [];
    }
  }

  // Generate waste profile from lab pack data
  generateFromLabPacks(labPacks, options = {}) {
    if (!labPacks || labPacks.length === 0) {
      throw new Error('No lab packs provided for waste profile generation');
    }

    console.log('🔄 Generating waste profile from lab packs:', labPacks);

    // Analyze all materials across lab packs
    const allMaterials = [];
    const hazardClassesSet = new Set();
    const dCodesSet = new Set();
    const unNumbersSet = new Set();
    const packingGroupsSet = new Set();
    
    let totalVolume = 0;
    let totalWeight = 0;
    let hasFlammables = false;
    let hasCorrosives = false;
    let hasToxics = false;
    let hasOxidizers = false;

    labPacks.forEach(pack => {
      if (pack.materials && pack.materials.length > 0) {
        pack.materials.forEach(material => {
          allMaterials.push(material);

          // Extract hazard classification data
          if (material.hazardClass) {
            hazardClassesSet.add(material.hazardClass);
            
            // Check for specific hazard types
            if (material.hazardClass.includes('3')) hasFlammables = true;
            if (material.hazardClass.includes('8')) hasCorrosives = true;
            if (material.hazardClass.includes('6')) hasToxics = true;
            if (material.hazardClass.includes('5')) hasOxidizers = true;
          }

          // Extract RCRA codes
          if (material.rcraCharacteristic) {
            material.rcraCharacteristic.forEach(code => dCodesSet.add(code));
          }
          if (material.classification?.dCodes) {
            material.classification.dCodes.forEach(code => dCodesSet.add(code));
          }

          // Extract DOT data
          if (material.unNumber) unNumbersSet.add(material.unNumber);
          if (material.packingGroup) packingGroupsSet.add(material.packingGroup);
          if (material.dotShipping?.unNumber) unNumbersSet.add(material.dotShipping.unNumber);
          if (material.dotShipping?.packingGroup) packingGroupsSet.add(material.dotShipping.packingGroup);
        });
      }

      // Extract volume/weight data from containers
      if (pack.estimatedVolume) {
        const volume = parseFloat(pack.estimatedVolume) || 0;
        totalVolume += volume;
      }
      if (pack.estimatedWeight) {
        const weight = parseFloat(pack.estimatedWeight) || 0;
        totalWeight += weight;
      }
    });

    // Determine primary waste category
    const primaryCategory = this.determinePrimaryCategory(allMaterials, {
      hasFlammables, hasCorrosives, hasToxics, hasOxidizers
    });

    // Generate proper shipping name
    const properShippingName = this.generateProperShippingName(
      Array.from(hazardClassesSet), 
      primaryCategory, 
      allMaterials
    );

    // Generate waste description
    const wasteDescription = this.generateWasteDescription(allMaterials, primaryCategory);

    // Determine waste codes
    const wasteCodes = this.consolidateWasteCodes(Array.from(dCodesSet));

    // Generate profile
    const profile = {
      id: Date.now().toString(),
      profileName: options.profileName || this.generateProfileName(primaryCategory, labPacks.length),
      generatedDate: new Date().toISOString(),
      
      // Basic identification
      wasteDescription: wasteDescription,
      properShippingName: properShippingName,
      primaryCategory: primaryCategory,
      
      // DOT classification
      hazardClasses: Array.from(hazardClassesSet).sort(),
      unNumbers: Array.from(unNumbersSet).sort(),
      packingGroups: Array.from(packingGroupsSet).sort(),
      
      // EPA/RCRA classification
      wasteCodes: wasteCodes,
      rcraCharacteristics: Array.from(dCodesSet).sort(),
      
      // Physical properties
      totalVolume: totalVolume,
      totalWeight: totalWeight || (totalVolume * 8.34), // Estimate if not provided
      estimatedContainerCount: labPacks.length,
      
      // Material composition
      materialCount: allMaterials.length,
      uniqueMaterials: this.getUniqueMaterials(allMaterials),
      dominantMaterials: this.getDominantMaterials(allMaterials),
      
      // Hazard analysis
      hazardSummary: {
        hasFlammables,
        hasCorrosives, 
        hasToxics,
        hasOxidizers,
        requiresSpecialHandling: this.requiresSpecialHandling(allMaterials)
      },
      
      // Regulatory compliance
      epaForm8700: this.generateEPA8700Data(wasteCodes, allMaterials),
      dotShippingPaper: this.generateDOTShippingData(properShippingName, hazardClassesSet, unNumbersSet),
      
      // Source data reference
      sourceLabPacks: labPacks.map(pack => ({
        category: pack.category,
        materialCount: pack.materials?.length || 0,
        containerSize: pack.estimatedVolume || 'Unknown'
      })),
      
      // Generation options
      generationOptions: {
        ...options,
        autoGenerated: true,
        confidence: this.calculateConfidence(allMaterials, labPacks)
      }
    };

    console.log('✅ Generated waste profile:', profile);
    return profile;
  }

  // Determine the primary waste category
  determinePrimaryCategory(materials, hazardFlags) {
    const categoryCount = {};
    
    // Count occurrences of each category
    materials.forEach(material => {
      const category = material.category || 
                     material.chemicalCategory || 
                     material.classification?.primaryCategory || 
                     'mixed';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // Get the most common category
    const sortedCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a);
    
    const primaryCategory = sortedCategories[0]?.[0] || 'mixed';

    // Override based on hazard analysis if needed
    if (hazardFlags.hasFlammables && hazardFlags.hasCorrosives) {
      return 'mixed_hazardous';
    } else if (hazardFlags.hasFlammables) {
      return 'flammable_liquids';
    } else if (hazardFlags.hasCorrosives) {
      return 'corrosive_materials';
    } else if (hazardFlags.hasToxics) {
      return 'toxic_materials';
    }

    return primaryCategory;
  }

  // Generate EPA-compliant proper shipping name
  generateProperShippingName(hazardClasses, primaryCategory, materials) {
    // Sort hazard classes to get primary
    const sortedClasses = hazardClasses.sort();
    const primaryClass = sortedClasses[0];

    if (materials.length === 1) {
      // Single material - use specific shipping name if available
      const material = materials[0];
      if (material.dotShippingName) {
        return material.dotShippingName;
      }
      if (material.productName) {
        return `Chemical sample, ${material.productName.toLowerCase()}`;
      }
    }

    // Multiple materials - use generic lab pack shipping name
    switch (primaryClass) {
      case '3':
        return 'Chemical sample, laboratory sample, flammable liquid';
      case '8':
        return 'Chemical sample, laboratory sample, corrosive';
      case '6.1':
        return 'Chemical sample, laboratory sample, toxic';
      case '5.1':
        return 'Chemical sample, laboratory sample, oxidizer';
      case '9':
        return 'Chemical sample, laboratory sample, miscellaneous';
      default:
        if (sortedClasses.length > 1) {
          return 'Chemical sample, laboratory sample, mixed hazard classes';
        }
        return 'Chemical sample, laboratory sample';
    }
  }

  // Generate detailed waste description
  generateWasteDescription(materials, primaryCategory) {
    const uniqueMaterials = this.getUniqueMaterials(materials);
    const materialNames = uniqueMaterials.slice(0, 5).map(m => m.productName || 'Unknown').join(', ');
    
    let description = `Laboratory chemical waste containing ${materials.length} materials`;
    
    if (uniqueMaterials.length <= 5) {
      description += `: ${materialNames}`;
    } else {
      description += ` including: ${materialNames} and ${uniqueMaterials.length - 5} others`;
    }

    // Add category information
    if (primaryCategory && primaryCategory !== 'mixed') {
      description += `. Primary category: ${primaryCategory.replace(/_/g, ' ')}`;
    }

    // Add physical state information
    const solidCount = materials.filter(m => m.physicalState === 'solid').length;
    const liquidCount = materials.filter(m => m.physicalState === 'liquid').length;
    
    if (solidCount > 0 && liquidCount > 0) {
      description += `. Contains both solid (${solidCount}) and liquid (${liquidCount}) materials`;
    } else if (solidCount > 0) {
      description += `. All materials are solid`;
    } else if (liquidCount > 0) {
      description += `. All materials are liquid`;
    }

    return description;
  }

  // Consolidate and validate waste codes
  consolidateWasteCodes(dCodes) {
    const validCodes = dCodes.filter(code => {
      return code && (
        code.match(/^D\d{3}$/) ||  // D-codes (D001-D043)
        code.match(/^F\d{3}$/) ||  // F-codes
        code.match(/^K\d{3}$/) ||  // K-codes
        code.match(/^P\d{3}$/) ||  // P-codes
        code.match(/^U\d{3}$/)     // U-codes
      );
    });

    // Remove duplicates and sort
    return [...new Set(validCodes)].sort();
  }

  // Get unique materials (deduplicated by product name)
  getUniqueMaterials(materials) {
    const uniqueMap = new Map();
    
    materials.forEach(material => {
      const key = (material.productName || 'Unknown').toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...material,
          count: 1
        });
      } else {
        uniqueMap.get(key).count += 1;
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => b.count - a.count);
  }

  // Get dominant materials (by frequency)
  getDominantMaterials(materials) {
    const unique = this.getUniqueMaterials(materials);
    return unique.slice(0, 10); // Top 10 most common materials
  }

  // Check if materials require special handling
  requiresSpecialHandling(materials) {
    return materials.some(material => {
      return material.classification?.specialHandling?.length > 0 ||
             material.specialHandling?.length > 0 ||
             (material.pH && (parseFloat(material.pH) <= 2 || parseFloat(material.pH) >= 12.5)) ||
             (material.flashPoint && parseFloat(material.flashPoint) < 100);
    });
  }

  // Generate EPA Form 8700-22 compatible data
  generateEPA8700Data(wasteCodes, materials) {
    return {
      wasteStreams: wasteCodes.map(code => ({
        wasteCode: code,
        wasteDescription: this.getWasteCodeDescription(code),
        estimatedQuantity: Math.ceil(materials.length / wasteCodes.length) // Distribute materials across codes
      })),
      hazardousWaste: wasteCodes.length > 0,
      mixedWaste: wasteCodes.length > 1,
      generatorCategory: materials.length > 100 ? 'large' : materials.length > 27 ? 'small' : 'very_small'
    };
  }

  // Generate DOT shipping paper data
  generateDOTShippingData(properShippingName, hazardClasses, unNumbers) {
    const primaryClass = Array.from(hazardClasses).sort()[0];
    const primaryUN = Array.from(unNumbers).sort()[0];
    
    return {
      properShippingName,
      identificationNumber: primaryUN || 'UN3334', // Default for chemical samples
      hazardClass: primaryClass || '9',
      packingGroup: this.getPackingGroup(primaryClass),
      totalQuantity: 'See attached lab pack inventory',
      unitOfMeasure: 'containers'
    };
  }

  // Get waste code description
  getWasteCodeDescription(code) {
    const descriptions = {
      'D001': 'Ignitable waste',
      'D002': 'Corrosive waste', 
      'D003': 'Reactive waste',
      'D004': 'Arsenic',
      'D005': 'Barium',
      'D006': 'Cadmium',
      'D007': 'Chromium',
      'D008': 'Lead',
      'D009': 'Mercury',
      'D010': 'Selenium',
      'D011': 'Silver'
    };
    
    return descriptions[code] || `Waste code ${code}`;
  }

  // Get default packing group for hazard class
  getPackingGroup(hazardClass) {
    switch(hazardClass) {
      case '3': return 'II'; // Flammable liquids
      case '8': return 'II'; // Corrosives
      case '6.1': return 'III'; // Toxic
      case '5.1': return 'II'; // Oxidizers
      default: return 'III';
    }
  }

  // Calculate confidence score for generated profile
  calculateConfidence(materials, labPacks) {
    let score = 0;
    
    // More materials analyzed = higher confidence
    if (materials.length >= 10) score += 0.3;
    else if (materials.length >= 5) score += 0.2;
    else if (materials.length >= 2) score += 0.1;
    
    // Complete classification data = higher confidence
    const classifiedMaterials = materials.filter(m => 
      m.hazardClass || m.rcraCharacteristic?.length > 0 || m.classification
    );
    const classificationRatio = classifiedMaterials.length / materials.length;
    score += classificationRatio * 0.4;
    
    // Consistent lab pack categories = higher confidence
    const categories = new Set(labPacks.map(p => p.category));
    if (categories.size === 1) score += 0.2;
    else if (categories.size <= 3) score += 0.1;
    
    // Complete material data = higher confidence
    const completeDataMaterials = materials.filter(m => 
      m.productName && (m.physicalState || m.pH || m.flashPoint)
    );
    const dataRatio = completeDataMaterials.length / materials.length;
    score += dataRatio * 0.1;
    
    return Math.min(1.0, score);
  }

  // Generate profile name
  generateProfileName(primaryCategory, packCount) {
    const date = new Date().toISOString().slice(0, 10);
    const categoryName = primaryCategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return `${categoryName} Lab Pack Profile - ${packCount} containers (${date})`;
  }

  // Save waste profile
  saveProfile(profile) {
    const profiles = this.getAllProfiles();
    
    // Check if profile with same ID exists
    const existingIndex = profiles.findIndex(p => p.id === profile.id);
    
    if (existingIndex >= 0) {
      profiles[existingIndex] = {
        ...profile,
        updatedDate: new Date().toISOString()
      };
    } else {
      profiles.push(profile);
    }
    
    // Keep only last 100 profiles to prevent storage bloat
    if (profiles.length > 100) {
      profiles.splice(0, profiles.length - 100);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    console.log('✅ Waste profile saved:', profile.profileName);
    return profile;
  }

  // Delete waste profile
  deleteProfile(profileId) {
    const profiles = this.getAllProfiles();
    const filteredProfiles = profiles.filter(p => p.id !== profileId);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredProfiles));
    console.log('✅ Waste profile deleted:', profileId);
  }

  // Export profile to various formats
  exportProfile(profile, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(profile, null, 2);
        
      case 'manifest':
        return this.generateManifestFormat(profile);
        
      case 'shipping':
        return this.generateShippingFormat(profile);
        
      case 'epa':
        return this.generateEPAFormat(profile);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Generate manifest format
  generateManifestFormat(profile) {
    return {
      wasteDescription: profile.wasteDescription,
      properShippingName: profile.properShippingName,
      hazardClass: profile.hazardClasses.join(', '),
      wasteCode: profile.wasteCodes.join(', '),
      quantity: `${profile.estimatedContainerCount} containers`,
      unitOfMeasure: 'containers',
      physicalForm: 'Mixed lab pack containers',
      packagingType: 'Containers in overpack'
    };
  }

  // Generate shipping paper format  
  generateShippingFormat(profile) {
    return {
      properShippingName: profile.dotShippingPaper.properShippingName,
      identificationNumber: profile.dotShippingPaper.identificationNumber,
      hazardClass: profile.dotShippingPaper.hazardClass,
      packingGroup: profile.dotShippingPaper.packingGroup,
      totalQuantity: profile.dotShippingPaper.totalQuantity,
      unitOfMeasure: profile.dotShippingPaper.unitOfMeasure,
      emergencyContact: 'CHEMTREC 1-800-424-9300'
    };
  }

  // Generate EPA format
  generateEPAFormat(profile) {
    return {
      wasteStreams: profile.epaForm8700.wasteStreams,
      totalQuantity: `${profile.totalVolume} gallons`,
      hazardousWaste: profile.epaForm8700.hazardousWaste,
      wasteDescription: profile.wasteDescription,
      wasteCodes: profile.wasteCodes
    };
  }
}

export default new WasteProfileGenerator();