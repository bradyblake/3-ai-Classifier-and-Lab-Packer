// NEW SDS Lookup Service with Real API Integration
// Replaces search engine links with actual API calls to get chemical data

import axios from 'axios';
import * as cheerio from 'cheerio';

class SDSLookupService {
  constructor() {
    this.pubchemBase = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
    
    // Define manufacturer search endpoints
    this.vendors = {
      fisher: {
        name: 'Fisher Scientific',
        searchUrl: 'https://www.fishersci.com/us/en/catalog/search/sds',
        searchParam: 'searchTerm',
        method: 'automated_search'
      },
      sigmaAldrich: {
        name: 'Sigma-Aldrich',
        searchUrl: 'https://www.sigmaaldrich.com/US/en/search/',
        searchParam: 'term',
        method: 'automated_search'
      },
      vwr: {
        name: 'VWR',
        searchUrl: 'https://us.vwr.com/store/search',
        searchParam: 'keyword',
        method: 'automated_search'
      }
    };
    
    console.log('🚀 Enhanced SDS Lookup Service with Automated Web Search initialized');
  }

  /**
   * Search for SDS URLs for a batch of chemicals
   */
  async lookupBatch(chemicals) {
    console.log(`🔍 FRESH Batch lookup for ${chemicals.length} chemicals`);
    const results = [];
    
    for (const chemical of chemicals) {
      try {
        const result = await this.lookupSingle(chemical);
        results.push(result);
      } catch (error) {
        console.error(`❌ FRESH Failed to lookup ${chemical}:`, error.message);
        results.push({
          chemical,
          sdsUrl: null,
          error: error.message,
          source: 'Error'
        });
      }
    }
    
    return results;
  }

  /**
   * Enhanced lookup - ALWAYS prioritizes PRODUCT NAME over constituents
   */
  async lookupSingle(chemicalName) {
    console.log(`🔍 PRODUCT-FOCUSED lookup for: ${chemicalName}`);
    
    // STEP 1: Always try direct product search first
    const productUrls = this.generateSmartSearchUrls(chemicalName);
    
    // STEP 2: Try to enrich with chemical data (only for context, not replacement)
    let chemicalData = null;
    let casNumber = null;
    
    try {
      // Only use PubChem for pure chemicals (not products)
      if (this.isPureChemical(chemicalName)) {
        console.log(`🧪 ${chemicalName} appears to be a pure chemical, getting PubChem data...`);
        chemicalData = await this.searchPubChemAPI(chemicalName);
        casNumber = chemicalData.casNumber;
      } else {
        console.log(`📦 ${chemicalName} appears to be a product, skipping PubChem lookup`);
      }
    } catch (error) {
      console.log(`⚠️ PubChem failed (this is OK for products): ${error.message}`);
    }
    
    // STEP 3: Generate URLs using ORIGINAL product name (not CAS)
    const finalUrls = this.generateSmartSearchUrls(chemicalName, casNumber, 'product-priority');
    
    return {
      chemical: chemicalName,
      sdsUrl: finalUrls.primary,
      alternativeUrls: finalUrls.alternatives,
      source: finalUrls.primaryVendor,
      searchMethod: 'product_name_priority',
      ...(chemicalData && {
        // Include chemical data only as supplementary info
        molecularFormula: chemicalData.molecularFormula,
        casNumber: chemicalData.casNumber,
        supplementaryData: 'Chemical data provided for reference only - SDS search uses product name'
      }),
      instructions: `Searching for "${chemicalName}" product SDS (not individual constituents)`,
      searchTimestamp: new Date().toISOString()
    };
  }

  /**
   * Real PubChem API integration
   */
  async searchPubChemAPI(chemicalName) {
    console.log(`🧪 FRESH Calling PubChem for: ${chemicalName}`);
    
    // Get compound ID
    const searchUrl = `${this.pubchemBase}/compound/name/${encodeURIComponent(chemicalName)}/cids/JSON`;
    console.log(`📡 FRESH PubChem URL: ${searchUrl}`);
    
    const searchResponse = await axios.get(searchUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!searchResponse.data?.IdentifierList?.CID) {
      throw new Error('Chemical not found in PubChem');
    }
    
    const cid = searchResponse.data.IdentifierList.CID[0];
    console.log(`🔢 FRESH Found CID: ${cid} for ${chemicalName}`);
    
    // Get chemical properties
    const dataUrl = `${this.pubchemBase}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`;
    const dataResponse = await axios.get(dataUrl, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const props = dataResponse.data?.PropertyTable?.Properties?.[0] || {};
    
    // Get CAS number from synonyms
    let casNumber = null;
    try {
      const synUrl = `${this.pubchemBase}/compound/cid/${cid}/synonyms/JSON`;
      const synResponse = await axios.get(synUrl, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const synonyms = synResponse.data?.InformationList?.Information?.[0]?.Synonym || [];
      casNumber = synonyms.find(syn => /^\d{2,5}-\d{2}-\d{1}$/.test(syn));
      console.log(`🏷️ FRESH Found CAS: ${casNumber} for ${chemicalName}`);
    } catch (err) {
      console.log('⚠️ FRESH Could not get CAS number');
    }
    
    // Generate smart SDS URL based on chemical data
    const sdsUrl = this.generateSmartSDSURL(chemicalName, casNumber);
    console.log(`🔗 FRESH Generated SDS URL: ${sdsUrl}`);
    
    return {
      chemical: chemicalName,
      sdsUrl: sdsUrl,
      downloadUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      source: 'PubChem API',
      casNumber: casNumber,
      molecularFormula: props.MolecularFormula,
      chemicalData: {
        cid: cid,
        molecularWeight: props.MolecularWeight,
        iupacName: props.IUPACName,
        pubchemUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
      },
      hazardInfo: {
        pubchemSafety: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`
      }
    };
  }

  /**
   * Generate smart SDS URLs based on chemical type - prioritize direct PDF sources
   */
  generateSmartSDSURL(chemicalName, casNumber) {
    const searchTerm = casNumber || chemicalName;
    const name = chemicalName.toLowerCase();
    
    // Try known databases with direct SDS access first
    if (casNumber) {
      // Priority 1: Try known direct SDS databases
      const directSources = [
        // Sigma-Aldrich direct PDF attempts (sometimes works)
        `https://www.sigmaaldrich.com/US/en/sds/${casNumber}`,
        // Fisher Scientific SDS search
        `https://www.fishersci.com/us/en/catalog/search/sds?query=${encodeURIComponent(casNumber)}`,
        // VWR SDS lookup
        `https://us.vwr.com/store/search?keyword=${encodeURIComponent(casNumber)}&searchType=SDS`,
        // Try PubChem SDS links if available
        `https://pubchem.ncbi.nlm.nih.gov/compound/${casNumber}#section=Safety-and-Hazards`
      ];
      
      // Return the first promising direct source
      return directSources[0]; // Start with Sigma-Aldrich
    }
    
    // Fallback to vendor search pages
    if (this.isLabChemical(name)) {
      // Try Sigma-Aldrich first for lab chemicals
      return `https://www.sigmaaldrich.com/US/en/search/${encodeURIComponent(searchTerm)}?focus=products&page=1&perpage=30&sort=relevance&term=${encodeURIComponent(searchTerm)}&type=product`;
    } else if (this.isIndustrialChemical(name)) {
      // Fisher Scientific for industrial chemicals
      return `https://www.fishersci.com/us/en/catalog/search/sds?query=${encodeURIComponent(searchTerm)}`;
    } else {
      // Default to Fisher Scientific
      return `https://www.fishersci.com/us/en/catalog/search/sds?query=${encodeURIComponent(searchTerm)}`;
    }
  }

  /**
   * Try to get direct SDS URL from known patterns
   */
  tryDirectSDSUrl(chemicalName, casNumber) {
    if (!casNumber) return null;

    // Known direct URL patterns for major suppliers
    const directPatterns = [
      // Sigma-Aldrich sometimes has direct PDF URLs
      `https://www.sigmaaldrich.com/content/dam/sigma-aldrich/docs/Sigma-Aldrich/Datasheet/${casNumber}_SIAL.pdf`,
      // Fisher Scientific pattern (less reliable)
      `https://www.fishersci.com/content/dam/fishersci/en_US/documents/programs/education/regulatory-documents/sds/chemicals/${casNumber}.pdf`,
      // VWR pattern attempt
      `https://us.vwr.com/sds?catalogNumber=${casNumber}`
    ];

    // Return first pattern to try - the backend will test if these actually work
    return directPatterns[0];
  }

  /**
   * Detect if input is a commercial/industrial product
   */
  isCommercialProduct(name) {
    const lowerName = name.toLowerCase();
    
    // Commercial/industrial product indicators
    const commercialIndicators = [
      // Brand names
      'wd-40', 'wd40', '3m', 'loctite', 'permatex', 'lucas', 'valvoline',
      'mobil', 'castrol', 'shell', 'chevron', 'exxon', 'bp',
      // Product types
      'brake', 'motor oil', 'transmission', 'antifreeze', 'coolant',
      'hydraulic', 'gear oil', 'penetrating', 'lubricant', 'grease',
      'cleaner', 'degreaser', 'solvent', 'thinner', 'remover',
      'adhesive', 'sealant', 'gasket', 'rtv',
      // Maintenance products
      'starting fluid', 'carb cleaner', 'contact cleaner', 'electrical'
    ];
    
    return commercialIndicators.some(indicator => lowerName.includes(indicator));
  }

  /**
   * Detect if input is a pure chemical vs product name
   */
  isPureChemical(name) {
    const lowerName = name.toLowerCase();
    
    // Product indicators (brands, multi-word products, etc.)
    const productIndicators = [
      // Brand names
      'wd-40', 'wd40', 'lysol', 'bleach', 'drano', 'ajax', 'comet',
      // Product descriptors
      'cleaner', 'solvent', 'paint', 'thinner', 'remover', 'stripper',
      'adhesive', 'sealant', 'lubricant', 'grease', 'oil',
      // Multi-word complex products
      'brake fluid', 'antifreeze', 'motor oil', 'hydraulic fluid'
    ];
    
    // Pure chemical indicators
    const chemicalIndicators = [
      // Common lab chemicals
      'acetone', 'ethanol', 'methanol', 'benzene', 'toluene', 'xylene',
      'sodium hydroxide', 'hydrochloric acid', 'sulfuric acid', 'nitric acid',
      'ammonia', 'hydrogen peroxide', 'sodium chloride'
    ];
    
    // Check for product indicators
    if (productIndicators.some(indicator => lowerName.includes(indicator))) {
      return false; // It's a product
    }
    
    // Check for pure chemical indicators
    if (chemicalIndicators.some(indicator => lowerName.includes(indicator))) {
      return true; // It's a pure chemical
    }
    
    // Default logic: if it's simple (1-2 words) and doesn't look like a brand, assume chemical
    const wordCount = name.trim().split(/\s+/).length;
    const hasNumbers = /\d/.test(name);
    const hasBrandPattern = /[-®™©]/.test(name);
    
    return wordCount <= 2 && !hasNumbers && !hasBrandPattern;
  }

  /**
   * Generate smart search URLs - ALWAYS prioritizes product name
   */
  generateSmartSearchUrls(chemicalName, casNumber = null, mode = 'product-priority') {
    // ALWAYS search by product name first
    const encodedName = encodeURIComponent(chemicalName);
    const encodedCas = casNumber ? encodeURIComponent(casNumber) : null;
    
    // FOCUS ON ACTUAL SDS SOURCES THAT WORK
    const vendors = [
      {
        name: 'Fisher Scientific',
        url: `https://www.fishersci.com/us/en/catalog/search/sds?query=${encodedName}`,
        priority: 1,
        reason: 'Reliable SDS downloads'
      },
      {
        name: 'Sigma-Aldrich',
        url: `https://www.sigmaaldrich.com/US/en/search/${encodedName}?focus=products&page=1&perpage=30&sort=relevance&term=${encodedName}&type=product`,
        priority: 2,
        reason: 'Comprehensive chemical database'
      },
      {
        name: 'VWR',
        url: `https://us.vwr.com/store/search?keyword=${encodedName}`,
        priority: 3,
        reason: 'Lab and industrial chemicals'
      }
    ];
    
    // Sort by priority
    const sortedVendors = vendors.sort((a, b) => a.priority - b.priority);
    
    return {
      primary: sortedVendors[0].url,
      primaryVendor: sortedVendors[0].name,
      alternatives: sortedVendors.slice(1).map(v => ({
        vendor: v.name,
        url: v.url,
        reason: v.reason
      })),
      searchTerm: chemicalName, // Always use product name
      casNumber: casNumber, // Keep CAS as supplementary info
      searchInstructions: {
        method: 'product_name_search',
        description: `Searching for "${chemicalName}" product SDS using exact product name`,
        tip: 'URLs will search for the exact product name you entered, not individual chemical constituents'
      }
    };
  }

  /**
   * Smart vendor routing for non-API results
   */
  getSmartVendorURL(chemicalName) {
    const name = chemicalName.toLowerCase();
    
    if (this.isLabChemical(name)) {
      return `https://www.sigmaaldrich.com/US/en/search/${encodeURIComponent(chemicalName)}?focus=products&page=1&perpage=30&sort=relevance&term=${encodeURIComponent(chemicalName)}&type=product`;
    } else if (this.isIndustrialChemical(name)) {
      return `https://www.fishersci.com/us/en/catalog/search/sds?query=${encodeURIComponent(chemicalName)}`;
    } else {
      return `https://www.fishersci.com/us/en/catalog/search/sds?query=${encodeURIComponent(chemicalName)}`;
    }
  }

  // Helper methods for chemical classification
  isLabChemical(name) {
    const labKeywords = ['acid', 'hydroxide', 'chloride', 'sulfate', 'acetone', 'ethanol', 'methanol', 'sodium', 'potassium', 'calcium'];
    return labKeywords.some(keyword => name.includes(keyword));
  }

  isIndustrialChemical(name) {
    const industrialKeywords = ['fuel', 'oil', 'thinner', 'solvent', 'cleaner', 'degreaser', 'lubricant'];
    return industrialKeywords.some(keyword => name.includes(keyword));
  }
}

export default new SDSLookupService();