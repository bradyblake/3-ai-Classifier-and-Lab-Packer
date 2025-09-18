// Material Classification Database
// Learns from previous classifications and provides smart lookups

export class ClassificationDatabase {
  constructor() {
    this.storageKey = 'unboxed_classification_database';
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Load existing database or create with seed data
    const existing = this.loadDatabase();
    if (!existing || Object.keys(existing).length === 0) {
      this.database = this.createSeedDatabase();
      this.saveDatabase();
    } else {
      this.database = existing;
    }
    
    console.log('🗄️ Classification Database loaded with', Object.keys(this.database).length, 'entries');
  }

  createSeedDatabase() {
    // Comprehensive database with all major material classifications
    return {
      // SOLVENTS - Halogenated
      'methylene chloride': {
        productName: 'Methylene Chloride',
        casNumber: '75-09-2',
        materialType: 'solvents',
        materialSubtype: 'halogenated_solvents',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: null, // Non-flammable
        unNumber: 'UN1593',
        dotClass: '6.1',
        wasteCodes: ['U080', 'F001'],
        chemicalFamily: 'chlorinated_hydrocarbons',
        commonUses: ['paint stripper', 'degreaser', 'solvent'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'trichloroethylene': {
        productName: 'Trichloroethylene',
        casNumber: '79-01-6',
        materialType: 'solvents',
        materialSubtype: 'halogenated_solvents',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: null, // Non-flammable
        unNumber: 'UN1710',
        dotClass: '6.1',
        wasteCodes: ['U228', 'F001'],
        chemicalFamily: 'chlorinated_hydrocarbons',
        commonUses: ['degreaser', 'dry cleaning', 'extraction'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'perchloroethylene': {
        productName: 'Perchloroethylene',
        casNumber: '127-18-4',
        materialType: 'solvents',
        materialSubtype: 'halogenated_solvents',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: null, // Non-flammable
        unNumber: 'UN1897',
        dotClass: '6.1',
        wasteCodes: ['U210', 'F001'],
        chemicalFamily: 'chlorinated_hydrocarbons',
        commonUses: ['dry cleaning', 'degreaser', 'solvent'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      
      // SOLVENTS - Non-Halogenated
      'acetone': {
        productName: 'Acetone',
        casNumber: '67-64-1',
        materialType: 'solvents',
        materialSubtype: 'ketones',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: -18,
        unNumber: 'UN1090',
        dotClass: '3',
        wasteCodes: ['F003'],
        chemicalFamily: 'ketones',
        commonUses: ['solvent', 'cleaning', 'paint thinner'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'methyl ethyl ketone': {
        productName: 'Methyl Ethyl Ketone',
        casNumber: '78-93-3',
        materialType: 'solvents',
        materialSubtype: 'ketones',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: 16,
        unNumber: 'UN1193',
        dotClass: '3',
        wasteCodes: ['F005'],
        chemicalFamily: 'ketones',
        commonUses: ['solvent', 'degreaser', 'paint thinner'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'toluene': {
        productName: 'Toluene',
        casNumber: '108-88-3',
        materialType: 'solvents',
        materialSubtype: 'aromatics',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: 40,
        unNumber: 'UN1294',
        dotClass: '3',
        wasteCodes: ['F005'],
        chemicalFamily: 'aromatics',
        commonUses: ['solvent', 'fuel additive', 'chemical intermediate'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'xylene': {
        productName: 'Xylene',
        casNumber: '1330-20-7',
        materialType: 'solvents',
        materialSubtype: 'aromatics',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: 81,
        unNumber: 'UN1307',
        dotClass: '3',
        wasteCodes: ['F003'],
        chemicalFamily: 'aromatics',
        commonUses: ['solvent', 'paint thinner', 'cleaning'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // FUELS
      'gasoline': {
        productName: 'Gasoline',
        casNumber: '86290-81-5',
        materialType: 'fuels',
        materialSubtype: 'petroleum',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: -45,
        unNumber: 'UN1203',
        dotClass: '3',
        wasteCodes: ['D001'],
        chemicalFamily: 'petroleum',
        commonUses: ['motor fuel', 'solvent'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'diesel fuel': {
        productName: 'Diesel Fuel',
        casNumber: '68334-30-5',
        materialType: 'fuels',
        materialSubtype: 'petroleum',
        physicalState: 'liquid',
        hazardous: false, // Above 100°F flash point
        flashPoint: 125,
        unNumber: 'UN1202',
        dotClass: '3',
        chemicalFamily: 'petroleum',
        commonUses: ['motor fuel', 'heating'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'jet fuel': {
        productName: 'Jet Fuel',
        casNumber: '8008-20-6',
        materialType: 'fuels',
        materialSubtype: 'petroleum',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: 100,
        unNumber: 'UN1863',
        dotClass: '3',
        chemicalFamily: 'petroleum',
        commonUses: ['aircraft fuel'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // OILS
      'motor oil': {
        productName: 'Motor Oil',
        casNumber: '8042-47-5',
        materialType: 'oils',
        materialSubtype: 'lubricants',
        physicalState: 'liquid',
        hazardous: false,
        flashPoint: 200,
        chemicalFamily: 'petroleum',
        commonUses: ['lubrication', 'engine protection'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'hydraulic oil': {
        productName: 'Hydraulic Oil',
        casNumber: '8012-95-1',
        materialType: 'oils',
        materialSubtype: 'hydraulic',
        physicalState: 'liquid',
        hazardous: false,
        flashPoint: 210,
        chemicalFamily: 'petroleum',
        commonUses: ['hydraulic systems', 'power transmission'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // ACIDS
      'hydrochloric acid': {
        productName: 'Hydrochloric Acid',
        casNumber: '7647-01-0',
        materialType: 'acids',
        materialSubtype: 'mineral_acids',
        physicalState: 'liquid',
        hazardous: true,
        pH: 1,
        unNumber: 'UN1789',
        dotClass: '8',
        wasteCodes: ['D002'],
        chemicalFamily: 'inorganic_acids',
        commonUses: ['metal cleaning', 'pH adjustment', 'chemical processing'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'sulfuric acid': {
        productName: 'Sulfuric Acid',
        casNumber: '7664-93-9',
        materialType: 'acids',
        materialSubtype: 'mineral_acids',
        physicalState: 'liquid',
        hazardous: true,
        pH: 0,
        unNumber: 'UN1830',
        dotClass: '8',
        wasteCodes: ['D002'],
        chemicalFamily: 'inorganic_acids',
        commonUses: ['chemical processing', 'battery acid', 'metal treatment'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // BASES
      'sodium hydroxide': {
        productName: 'Sodium Hydroxide',
        casNumber: '1310-73-2',
        materialType: 'bases',
        materialSubtype: 'caustics',
        physicalState: 'solid',
        hazardous: true,
        pH: 14,
        unNumber: 'UN1823',
        dotClass: '8',
        wasteCodes: ['D002'],
        chemicalFamily: 'alkali_metals',
        commonUses: ['cleaning', 'pH adjustment', 'chemical processing'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // PESTICIDES
      'chlordane': {
        productName: 'Chlordane',
        casNumber: '57-74-9',
        materialType: 'pesticides',
        materialSubtype: 'insecticides',
        physicalState: 'liquid',
        hazardous: true,
        unNumber: 'UN2761',
        dotClass: '6.1',
        wasteCodes: ['U036'],
        chemicalFamily: 'organochlorines',
        commonUses: ['termite control', 'insecticide'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'ddt': {
        productName: 'DDT',
        casNumber: '50-29-3',
        materialType: 'pesticides',
        materialSubtype: 'insecticides',
        physicalState: 'solid',
        hazardous: true,
        wasteCodes: ['U061'],
        chemicalFamily: 'organochlorines',
        commonUses: ['insecticide'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // HEAVY METALS
      'lead oxide': {
        productName: 'Lead Oxide',
        casNumber: '1317-36-8',
        materialType: 'heavy_metals',
        materialSubtype: 'lead_compounds',
        physicalState: 'solid',
        hazardous: true,
        wasteCodes: ['D008'],
        chemicalFamily: 'lead_compounds',
        commonUses: ['paint pigment', 'glass manufacturing'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'mercury': {
        productName: 'Mercury',
        casNumber: '7439-97-6',
        materialType: 'heavy_metals',
        materialSubtype: 'elemental_metals',
        physicalState: 'liquid',
        hazardous: true,
        unNumber: 'UN2809',
        dotClass: '8',
        wasteCodes: ['D009'],
        chemicalFamily: 'elemental_metals',
        commonUses: ['thermometers', 'switches', 'dental amalgam'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'cadmium sulfate': {
        productName: 'Cadmium Sulfate',
        casNumber: '10124-36-4',
        materialType: 'heavy_metals',
        materialSubtype: 'cadmium_compounds',
        physicalState: 'solid',
        hazardous: true,
        wasteCodes: ['D006'],
        chemicalFamily: 'cadmium_compounds',
        commonUses: ['electroplating', 'pigments'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // PHARMACEUTICALS
      'warfarin': {
        productName: 'Warfarin',
        casNumber: '81-81-2',
        materialType: 'pharmaceuticals',
        materialSubtype: 'anticoagulants',
        physicalState: 'solid',
        hazardous: true,
        wasteCodes: ['P001'],
        chemicalFamily: 'coumarins',
        commonUses: ['blood thinner', 'rodenticide'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // WASTE OILS
      'used motor oil': {
        productName: 'Used Motor Oil',
        casNumber: '8042-47-5',
        materialType: 'waste_oils',
        materialSubtype: 'automotive_oils',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: 200,
        chemicalFamily: 'petroleum_derivatives',
        commonUses: ['automotive lubrication'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'cutting fluid': {
        productName: 'Cutting Fluid',
        casNumber: 'mixture',
        materialType: 'waste_oils',
        materialSubtype: 'metalworking_fluids',
        physicalState: 'liquid',
        hazardous: true,
        chemicalFamily: 'petroleum_derivatives',
        commonUses: ['machining', 'metalworking'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // BATTERIES AND ELECTRONICS
      'lead acid battery': {
        productName: 'Lead Acid Battery',
        casNumber: 'mixture',
        materialType: 'batteries',
        materialSubtype: 'lead_acid',
        physicalState: 'solid',
        hazardous: true,
        wasteCodes: ['D002', 'D008'],
        chemicalFamily: 'mixed_metals_acids',
        commonUses: ['automotive batteries', 'backup power'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'lithium battery': {
        productName: 'Lithium Battery',
        casNumber: 'mixture',
        materialType: 'batteries',
        materialSubtype: 'lithium_ion',
        physicalState: 'solid',
        hazardous: true,
        unNumber: 'UN3480',
        dotClass: '9',
        chemicalFamily: 'mixed_metals',
        commonUses: ['electronics', 'electric vehicles'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // PAINTS AND COATINGS
      'latex paint': {
        productName: 'Latex Paint',
        casNumber: 'mixture',
        materialType: 'paints_coatings',
        materialSubtype: 'water_based',
        physicalState: 'liquid',
        hazardous: false,
        chemicalFamily: 'polymer_emulsions',
        commonUses: ['architectural coating', 'decorative finish'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'oil based paint': {
        productName: 'Oil Based Paint',
        casNumber: 'mixture',
        materialType: 'paints_coatings',
        materialSubtype: 'solvent_based',
        physicalState: 'liquid',
        hazardous: true,
        flashPoint: 100,
        dotClass: '3',
        wasteCodes: ['D001'],
        chemicalFamily: 'petroleum_resins',
        commonUses: ['industrial coating', 'protective finish'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // LABORATORY CHEMICALS
      'formalin': {
        productName: 'Formalin',
        casNumber: '50-00-0',
        materialType: 'laboratory_chemicals',
        materialSubtype: 'preservatives',
        physicalState: 'liquid',
        hazardous: true,
        unNumber: 'UN1198',
        dotClass: '3',
        wasteCodes: ['U122'],
        chemicalFamily: 'aldehydes',
        commonUses: ['tissue preservation', 'disinfectant'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'phenol': {
        productName: 'Phenol',
        casNumber: '108-95-2',
        materialType: 'laboratory_chemicals',
        materialSubtype: 'organics',
        physicalState: 'solid',
        hazardous: true,
        unNumber: 'UN1671',
        dotClass: '6.1',
        wasteCodes: ['U188'],
        chemicalFamily: 'phenols',
        commonUses: ['chemical synthesis', 'disinfectant'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // OXIDIZERS
      'hydrogen peroxide': {
        productName: 'Hydrogen Peroxide',
        casNumber: '7722-84-1',
        materialType: 'oxidizers',
        materialSubtype: 'peroxides',
        physicalState: 'liquid',
        hazardous: true,
        unNumber: 'UN2014',
        dotClass: '5.1',
        chemicalFamily: 'peroxides',
        commonUses: ['bleaching', 'disinfectant', 'oxidizer'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'sodium hypochlorite': {
        productName: 'Sodium Hypochlorite',
        casNumber: '7681-52-9',
        materialType: 'oxidizers',
        materialSubtype: 'hypochlorites',
        physicalState: 'liquid',
        hazardous: true,
        unNumber: 'UN1791',
        dotClass: '8',
        wasteCodes: ['D001'],
        chemicalFamily: 'hypochlorites',
        commonUses: ['bleach', 'disinfectant', 'water treatment'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // GASES (when containerized)
      'compressed oxygen': {
        productName: 'Compressed Oxygen',
        casNumber: '7782-44-7',
        materialType: 'compressed_gases',
        materialSubtype: 'oxidizing_gases',
        physicalState: 'gas',
        hazardous: true,
        unNumber: 'UN1072',
        dotClass: '2.2',
        chemicalFamily: 'elemental_gases',
        commonUses: ['welding', 'medical oxygen', 'combustion support'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },
      'propane': {
        productName: 'Propane',
        casNumber: '74-98-6',
        materialType: 'compressed_gases',
        materialSubtype: 'flammable_gases',
        physicalState: 'gas',
        hazardous: true,
        unNumber: 'UN1978',
        dotClass: '2.1',
        chemicalFamily: 'alkanes',
        commonUses: ['fuel', 'heating', 'torch gas'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // ASBESTOS CONTAINING MATERIALS
      'asbestos insulation': {
        productName: 'Asbestos Insulation',
        casNumber: '1332-21-4',
        materialType: 'asbestos_materials',
        materialSubtype: 'friable_asbestos',
        physicalState: 'solid',
        hazardous: true,
        chemicalFamily: 'silicate_minerals',
        commonUses: ['insulation', 'fireproofing'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // PCBs
      'pcb transformer oil': {
        productName: 'PCB Transformer Oil',
        casNumber: '1336-36-3',
        materialType: 'pcbs',
        materialSubtype: 'electrical_equipment',
        physicalState: 'liquid',
        hazardous: true,
        wasteCodes: ['U016'],
        chemicalFamily: 'polychlorinated_biphenyls',
        commonUses: ['electrical transformers', 'capacitors'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      },

      // EXPLOSIVES
      'tnt': {
        productName: 'TNT',
        casNumber: '118-96-7',
        materialType: 'explosives',
        materialSubtype: 'nitro_compounds',
        physicalState: 'solid',
        hazardous: true,
        unNumber: 'UN0209',
        dotClass: '1.1D',
        wasteCodes: ['U234'],
        chemicalFamily: 'nitroaromatics',
        commonUses: ['explosive'],
        lastUpdated: new Date().toISOString(),
        confidence: 1.0,
        sources: ['seed_data']
      }
    };
  }

  // Find classification by multiple criteria
  findClassification(material) {
    const searchKeys = this.generateSearchKeys(material);
    let bestMatch = null;
    let highestScore = 0;

    for (const key of searchKeys) {
      const normalizedKey = this.normalizeKey(key);
      if (this.database[normalizedKey]) {
        const score = this.calculateMatchScore(material, this.database[normalizedKey]);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = this.database[normalizedKey];
        }
      }
    }

    if (bestMatch && highestScore >= 0.7) { // 70% confidence threshold
      console.log('🎯 Found database match:', bestMatch.productName, 'Score:', highestScore);
      return { 
        ...bestMatch, 
        matchScore: highestScore,
        matchType: highestScore >= 0.9 ? 'exact' : 'similar'
      };
    }

    return null;
  }

  // Generate possible search keys for a material
  generateSearchKeys(material) {
    const keys = [];
    
    if (material.productName) {
      keys.push(material.productName);
      keys.push(...this.extractChemicalNames(material.productName));
    }
    if (material.casNumber) keys.push(material.casNumber);
    if (material.unNumber) keys.push(material.unNumber);
    
    // Add composition-based keys
    if (material.composition && material.composition.length > 0) {
      material.composition.forEach(comp => {
        if (comp.name) {
          keys.push(comp.name);
          keys.push(...this.extractChemicalNames(comp.name));
        }
        if (comp.casNumber) keys.push(comp.casNumber);
      });
    }

    return [...new Set(keys)]; // Remove duplicates
  }

  // Extract chemical names from product names
  extractChemicalNames(productName) {
    if (!productName) return [];
    
    const names = [];
    const name = productName.toLowerCase();
    
    // Common chemical name patterns
    const patterns = [
      /methyl ethyl ketone|mek/g,
      /acetone/g,
      /toluene/g,
      /xylene/g,
      /benzene/g,
      /gasoline|petrol/g,
      /diesel/g,
      /motor oil|engine oil/g,
      /hydraulic oil|hydraulic fluid/g,
      /hydrochloric acid|hcl/g,
      /sulfuric acid|sulphuric acid/g,
      /sodium hydroxide|caustic soda|lye/g,
      /isopropanol|isopropyl alcohol|ipa/g,
      /methanol|methyl alcohol/g,
      /ethanol|ethyl alcohol/g
    ];

    patterns.forEach(pattern => {
      const matches = name.match(pattern);
      if (matches) {
        names.push(...matches);
      }
    });

    return names;
  }

  // Calculate match score between material and database entry
  calculateMatchScore(material, dbEntry) {
    let score = 0;
    let factors = 0;

    // Product name matching (40% weight)
    if (material.productName && dbEntry.productName) {
      const similarity = this.calculateStringSimilarity(
        material.productName.toLowerCase(),
        dbEntry.productName.toLowerCase()
      );
      score += similarity * 0.4;
      factors += 0.4;
    }

    // CAS number (30% weight) - exact match
    if (material.casNumber && dbEntry.casNumber) {
      if (material.casNumber === dbEntry.casNumber) {
        score += 0.3;
      }
      factors += 0.3;
    }

    // UN number (20% weight) - exact match
    if (material.unNumber && dbEntry.unNumber) {
      if (material.unNumber === dbEntry.unNumber) {
        score += 0.2;
      }
      factors += 0.2;
    }

    // Physical state (10% weight)
    if (material.physicalState && dbEntry.physicalState) {
      if (material.physicalState.toLowerCase() === dbEntry.physicalState.toLowerCase()) {
        score += 0.1;
      }
      factors += 0.1;
    }

    return factors > 0 ? score / factors : 0;
  }

  // Simple string similarity calculation
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.includes(str2) || str2.includes(str1)) return 0.8;
    
    // Levenshtein distance approximation
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  // Save a new or updated classification
  saveClassification(material, classification, source = 'user') {
    const key = this.normalizeKey(material.productName || material.casNumber || 'unknown');
    
    const entry = {
      productName: material.productName,
      casNumber: material.casNumber,
      unNumber: material.unNumber,
      materialType: classification.materialType,
      materialSubtype: classification.materialSubtype,
      physicalState: material.physicalState,
      hazardous: classification.hazardous,
      flashPoint: material.flashPoint,
      pH: material.pH,
      dotClass: classification.dotClass,
      wasteCodes: classification.wasteCodes || [],
      chemicalFamily: classification.chemicalFamily,
      commonUses: classification.commonUses || [],
      lastUpdated: new Date().toISOString(),
      confidence: classification.confidence || 0.9,
      sources: [...(this.database[key]?.sources || []), source]
    };

    this.database[key] = entry;
    this.saveDatabase();
    
    console.log('💾 Saved classification for:', entry.productName);
    return entry;
  }

  // Get materials by type
  getMaterialsByType(materialType) {
    return Object.values(this.database).filter(entry => 
      entry.materialType === materialType
    );
  }

  // Get all material types with counts
  getMaterialTypeSummary() {
    const summary = {};
    Object.values(this.database).forEach(entry => {
      const type = entry.materialType;
      if (!summary[type]) {
        summary[type] = { count: 0, subtypes: new Set(), examples: [] };
      }
      summary[type].count++;
      if (entry.materialSubtype) {
        summary[type].subtypes.add(entry.materialSubtype);
      }
      if (summary[type].examples.length < 3) {
        summary[type].examples.push(entry.productName);
      }
    });

    // Convert sets to arrays
    Object.keys(summary).forEach(type => {
      summary[type].subtypes = Array.from(summary[type].subtypes);
    });

    return summary;
  }

  // Normalize keys for consistent storage
  normalizeKey(key) {
    if (!key) return 'unknown';
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Database persistence
  loadDatabase() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error loading classification database:', error);
      return {};
    }
  }

  saveDatabase() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.database));
      console.log('💾 Classification database saved');
    } catch (error) {
      console.error('Error saving classification database:', error);
    }
  }

  // Get database statistics
  getStats() {
    const entries = Object.values(this.database);
    return {
      totalEntries: entries.length,
      materialTypes: this.getMaterialTypeSummary(),
      hazardousCount: entries.filter(e => e.hazardous).length,
      nonHazardousCount: entries.filter(e => !e.hazardous).length,
      lastUpdated: Math.max(...entries.map(e => new Date(e.lastUpdated).getTime()))
    };
  }

  // Export database
  exportDatabase() {
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      entries: this.database
    };
  }

  // Import database (merge with existing)
  importDatabase(importData) {
    if (importData.entries) {
      Object.keys(importData.entries).forEach(key => {
        const entry = importData.entries[key];
        // Add import source
        entry.sources = [...(entry.sources || []), 'import'];
        entry.lastUpdated = new Date().toISOString();
        this.database[key] = entry;
      });
      this.saveDatabase();
      console.log('📥 Imported', Object.keys(importData.entries).length, 'database entries');
    }
  }
}

export default new ClassificationDatabase();