// Basic CAS Hazard Lookup Database
// Provides essential hazard characteristics for common CAS numbers

export class BasicCasLookup {
  constructor() {
    // Common hazardous materials with their key properties
    this.casDatabase = {
      // Strong Bases (highly basic materials)
      '1310-73-2': { // Sodium hydroxide
        name: 'Sodium hydroxide',
        pH: 13.5,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'strong_base',
        federalCodes: [], // D002 only if aqueous solution, not solid
        texasFormCode: '110',
        texasClassification: '1',
        wasteType: 'caustic_aqueous',
        isAqueous: false, // Can be solid beads or aqueous solution
        isAcid: false,
        isBase: true,
        isCaustic: true,
        isOrganic: false,
        physicalForm: 'variable', // Can be solid or liquid
        solubility: 'highly_soluble',
        d002OnlyWhenAqueous: true // Special flag for D002 qualification
      },
      '1310-58-3': { // Potassium hydroxide  
        name: 'Potassium hydroxide',
        pH: 13.2,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'strong_base',
        federalCodes: ['D002']
      },
      '1336-21-6': { // Ammonia solution
        name: 'Ammonia solution',
        pH: 11.6,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'basic',
        federalCodes: ['D002']
      },
      '7681-52-9': { // Sodium hypochlorite
        name: 'Sodium hypochlorite',
        pH: 12.5,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'basic_oxidizer',
        federalCodes: ['D002'],
        texasFormCode: '110',
        texasClassification: '1',
        wasteType: 'caustic_aqueous',
        isAqueous: true,
        isAcid: false,
        isBase: true,
        isCaustic: true,
        isOrganic: false,
        isOxidizer: true,
        physicalForm: 'liquid',
        solubility: 'highly_soluble',
        commonName: 'bleach'
      },
      
      // Strong Acids (highly acidic materials)
      '7647-01-0': { // Hydrochloric acid
        name: 'Hydrochloric acid',
        pH: 0.1,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'strong_acid',
        federalCodes: ['D002'],
        texasFormCode: '105',
        texasClassification: '1',
        wasteType: 'acid_aqueous',
        isAqueous: true,
        isAcid: true,
        isBase: false,
        isCaustic: false,
        isOrganic: false,
        physicalForm: 'liquid',
        solubility: 'highly_soluble',
        commonName: 'muriatic acid'
      },
      '7664-93-9': { // Sulfuric acid
        name: 'Sulfuric acid',
        pH: 0.3,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'strong_acid',
        federalCodes: ['D002']
      },
      '7697-37-2': { // Nitric acid
        name: 'Nitric acid',
        pH: 0.4,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'strong_acid',
        federalCodes: ['D002']
      },
      '7664-38-2': { // Phosphoric acid
        name: 'Phosphoric acid',
        pH: 1.5,
        flashPoint: null,
        hazardClass: 'corrosive',
        category: 'acid',
        federalCodes: ['D002']
      },
      
      // Ignitable materials
      '67-64-1': { // Acetone
        name: 'Acetone',
        pH: null,
        flashPoint: -20,
        hazardClass: 'flammable',
        category: 'ketone',
        federalCodes: ['D001'],
        texasFormCode: '203',
        texasClassification: 'H',
        wasteType: 'organic_solvent',
        isAqueous: false,
        isAcid: false,
        isBase: false,
        isCaustic: false,
        isOrganic: true,
        isFlammable: true,
        physicalForm: 'liquid',
        solubility: 'miscible',
        volatility: 'high'
      },
      '67-56-1': { // Methanol
        name: 'Methanol',
        pH: null,
        flashPoint: 11,
        hazardClass: 'flammable',
        category: 'alcohol',
        federalCodes: ['D001']
      },
      '64-17-5': { // Ethanol
        name: 'Ethanol',
        pH: null,
        flashPoint: 13,
        hazardClass: 'flammable',
        category: 'alcohol',
        federalCodes: ['D001'],
        texasFormCode: '203',
        texasClassification: 'H',
        wasteType: 'organic_solvent'
      },
      '71-43-2': { // Benzene
        name: 'Benzene',
        pH: null,
        flashPoint: -11,
        hazardClass: 'flammable',
        category: 'aromatic',
        federalCodes: ['D001']
      },
      
      // Toxic/P-listed materials
      '7439-97-6': { // Mercury
        name: 'Mercury',
        pH: null,
        flashPoint: null,
        hazardClass: 'toxic',
        category: 'heavy_metal',
        federalCodes: ['P065']
      },
      '7439-92-1': { // Lead
        name: 'Lead',
        pH: null,
        flashPoint: null,
        hazardClass: 'toxic',
        category: 'heavy_metal',
        federalCodes: ['D008']
      }
    };
    
    console.log(`📚 Basic CAS Lookup initialized with ${Object.keys(this.casDatabase).length} materials`);
  }

  /**
   * Get hazard characteristics for a CAS number
   * @param {string} casNumber - The CAS registry number
   * @returns {Object|null} Hazard data or null if not found
   */
  getHazardCharacteristics(casNumber) {
    const normalized = this.normalizeCAS(casNumber);
    const data = this.casDatabase[normalized];
    
    if (data) {
      console.log(`🔍 CAS Lookup found: ${normalized} -> ${data.name} (pH: ${data.pH}, flash: ${data.flashPoint}°C)`);
      return {
        name: data.name,
        pH: data.pH,
        flashPoint: data.flashPoint,
        hazardClass: data.hazardClass,
        category: data.category,
        federalCodes: data.federalCodes || [],
        isHazardous: data.federalCodes && data.federalCodes.length > 0,
        texasFormCode: data.texasFormCode,
        texasClassification: data.texasClassification,
        wasteType: data.wasteType,
        // Enhanced chemical characteristics
        isAqueous: data.isAqueous,
        isAcid: data.isAcid,
        isBase: data.isBase,
        isCaustic: data.isCaustic,
        isOrganic: data.isOrganic,
        isOxidizer: data.isOxidizer,
        isFlammable: data.isFlammable,
        physicalForm: data.physicalForm,
        solubility: data.solubility,
        volatility: data.volatility,
        commonName: data.commonName
      };
    }
    
    console.log(`🔍 CAS Lookup: ${normalized} not found in database`);
    return null;
  }

  /**
   * Check if a CAS number represents a known hazardous material
   * @param {string} casNumber - The CAS registry number
   * @returns {boolean} True if material is known to be hazardous
   */
  isHazardous(casNumber) {
    const data = this.getHazardCharacteristics(casNumber);
    return data && data.isHazardous;
  }

  /**
   * Get all CAS numbers for a specific hazard category
   * @param {string} category - Hazard category (e.g., 'strong_base', 'strong_acid')
   * @returns {Array} Array of CAS numbers
   */
  getCASByCategory(category) {
    return Object.entries(this.casDatabase)
      .filter(([cas, data]) => data.category === category)
      .map(([cas, data]) => cas);
  }

  /**
   * Normalize CAS number format
   * @param {string} casNumber - Raw CAS number
   * @returns {string} Normalized CAS number
   */
  normalizeCAS(casNumber) {
    if (!casNumber) return '';
    return casNumber.toString().trim().replace(/\s+/g, '');
  }

  /**
   * Check if a chemical is aqueous (water-based)
   * @param {string} casNumber - CAS registry number
   * @returns {boolean} True if aqueous
   */
  isAqueous(casNumber) {
    const data = this.getHazardCharacteristics(casNumber);
    return data ? data.isAqueous : false;
  }

  /**
   * Check if a chemical is acidic
   * @param {string} casNumber - CAS registry number
   * @returns {boolean} True if acidic
   */
  isAcidic(casNumber) {
    const data = this.getHazardCharacteristics(casNumber);
    return data ? data.isAcid : false;
  }

  /**
   * Check if a chemical is basic/caustic
   * @param {string} casNumber - CAS registry number
   * @returns {boolean} True if basic
   */
  isBasic(casNumber) {
    const data = this.getHazardCharacteristics(casNumber);
    return data ? data.isBase : false;
  }

  /**
   * Check if a chemical is organic
   * @param {string} casNumber - CAS registry number
   * @returns {boolean} True if organic
   */
  isOrganic(casNumber) {
    const data = this.getHazardCharacteristics(casNumber);
    return data ? data.isOrganic : false;
  }

  /**
   * Check if a chemical qualifies for D002 based on physical state
   * @param {string} casNumber - CAS registry number
   * @param {string} physicalState - Current physical state ('liquid', 'solid', 'aqueous', etc.)
   * @returns {boolean} True if D002 applies
   */
  qualifiesForD002(casNumber, physicalState) {
    const data = this.getHazardCharacteristics(casNumber);
    if (!data) return false;
    
    // D002 only applies to liquids/aqueous solutions
    const isLiquidForm = physicalState === 'liquid' || 
                        physicalState === 'aqueous' || 
                        physicalState?.includes('liquid') ||
                        physicalState?.includes('solution');
    
    if (!isLiquidForm) {
      return false; // Solids can never be D002
    }
    
    // If chemical has d002OnlyWhenAqueous flag, check it
    if (data.d002OnlyWhenAqueous && !isLiquidForm) {
      return false;
    }
    
    // Check if chemical is corrosive (pH criteria)
    return data.isAcid || data.isBase || data.isCaustic;
  }

  /**
   * Get chemicals by waste type
   * @param {string} wasteType - Type of waste (e.g., 'caustic_aqueous', 'acid_aqueous')
   * @returns {Array} Array of CAS numbers matching waste type
   */
  getChemicalsByWasteType(wasteType) {
    return Object.entries(this.casDatabase)
      .filter(([cas, data]) => data.wasteType === wasteType)
      .map(([cas, data]) => ({ cas, name: data.name }));
  }

  /**
   * Get statistics about the database
   * @returns {Object} Database statistics
   */
  getStats() {
    const categories = {};
    const hazardClasses = {};
    let hazardousCount = 0;
    
    Object.values(this.casDatabase).forEach(data => {
      categories[data.category] = (categories[data.category] || 0) + 1;
      hazardClasses[data.hazardClass] = (hazardClasses[data.hazardClass] || 0) + 1;
      if (data.federalCodes && data.federalCodes.length > 0) {
        hazardousCount++;
      }
    });
    
    return {
      totalMaterials: Object.keys(this.casDatabase).length,
      hazardousMaterials: hazardousCount,
      categories: categories,
      hazardClasses: hazardClasses
    };
  }
}

// Export singleton instance
export default new BasicCasLookup();