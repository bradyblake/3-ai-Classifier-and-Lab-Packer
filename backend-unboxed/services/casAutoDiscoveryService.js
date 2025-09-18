// CAS Auto-Discovery Service
// Automatically discovers and adds new chemicals from SDS analysis
// Continuously expands the database with real-world chemical encounters

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import casLookupService from './casLookupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CASAutoDiscoveryService {
  constructor() {
    this.discoveryLog = [];
    this.pendingDiscoveries = new Map();
    this.apiEndpoints = {
      nist: 'https://webbook.nist.gov/chemistry/cas-ser/',
      pubchem: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/',
      epa: 'https://comptox.epa.gov/dashboard-api/'
    };
    this.databasePath = path.join(__dirname, '../data/comprehensive_chemical_database.js');
    this.discoveryLogPath = path.join(__dirname, '../data/cas_discovery_log.json');
    this.loadDiscoveryLog();
  }

  /**
   * Main entry point: Process SDS and discover new CAS numbers
   * @param {object} sdsData - Parsed SDS data with composition
   * @param {string} sdsFileName - Name of the SDS file for logging
   * @returns {object} Discovery results
   */
  async discoverFromSDS(sdsData, sdsFileName = 'unknown') {
    console.log(`🔍 Starting CAS auto-discovery for: ${sdsFileName}`);
    
    const results = {
      totalCAS: 0,
      existingCAS: 0,
      newCAS: 0,
      discoveredChemicals: [],
      errors: []
    };

    try {
      // Extract CAS numbers from SDS composition
      const casNumbers = this.extractCASNumbers(sdsData);
      results.totalCAS = casNumbers.length;

      console.log(`📋 Found ${casNumbers.length} CAS numbers in SDS`);

      // Check each CAS number against existing database
      for (const cas of casNumbers) {
        try {
          const exists = casLookupService.lookup(cas);
          
          if (exists) {
            results.existingCAS++;
            console.log(`✅ Known CAS: ${cas}`);
          } else {
            results.newCAS++;
            console.log(`🆕 New CAS discovered: ${cas}`);
            
            // Queue for property lookup and database addition
            const chemicalData = await this.processNewCAS(cas, sdsFileName);
            if (chemicalData) {
              results.discoveredChemicals.push(chemicalData);
              await this.addToDatabase(cas, chemicalData);
            }
          }
        } catch (error) {
          console.error(`❌ Error processing CAS ${cas}:`, error.message);
          results.errors.push({ cas, error: error.message });
        }
      }

      // Log discovery session
      this.logDiscoverySession({
        timestamp: new Date().toISOString(),
        sdsFile: sdsFileName,
        results
      });

      console.log(`🎯 Discovery complete: ${results.newCAS} new chemicals added`);
      return results;

    } catch (error) {
      console.error('❌ CAS auto-discovery failed:', error);
      results.errors.push({ general: error.message });
      return results;
    }
  }

  /**
   * Extract CAS numbers from SDS composition data
   * @param {object} sdsData - Parsed SDS data
   * @returns {array} Array of CAS numbers
   */
  extractCASNumbers(sdsData) {
    const casNumbers = [];
    const casRegex = /\b\d{1,7}-\d{2}-\d\b/g;

    try {
      // Extract from composition section
      if (sdsData.composition && Array.isArray(sdsData.composition)) {
        sdsData.composition.forEach(component => {
          if (component.cas) {
            casNumbers.push(component.cas.trim());
          }
        });
      }

      // Extract from raw text if composition parsing failed
      if (sdsData.rawText) {
        const matches = sdsData.rawText.match(casRegex);
        if (matches) {
          matches.forEach(cas => {
            if (!casNumbers.includes(cas)) {
              casNumbers.push(cas);
            }
          });
        }
      }

      // Extract from sections 2 and 3 (composition sections)
      ['section2', 'section3'].forEach(section => {
        if (sdsData[section]) {
          const matches = sdsData[section].match(casRegex);
          if (matches) {
            matches.forEach(cas => {
              if (!casNumbers.includes(cas)) {
                casNumbers.push(cas);
              }
            });
          }
        }
      });

      return [...new Set(casNumbers)]; // Remove duplicates
    } catch (error) {
      console.error('❌ Error extracting CAS numbers:', error);
      return [];
    }
  }

  /**
   * Process a new CAS number: lookup properties and prepare for database addition
   * @param {string} cas - CAS number
   * @param {string} source - Source SDS file
   * @returns {object} Chemical data or null
   */
  async processNewCAS(cas, source) {
    try {
      console.log(`🔎 Looking up properties for CAS: ${cas}`);

      // Try multiple data sources
      let chemicalData = null;
      
      // Priority 1: Try PubChem (most comprehensive and available)
      try {
        chemicalData = await this.lookupPubChem(cas);
        if (chemicalData) console.log(`✅ Found data in PubChem for ${cas}`);
      } catch (error) {
        console.log(`⚠️  PubChem lookup failed for ${cas}: ${error.message}`);
      }

      // Priority 2: Try NIST (best for flash points)
      if (!chemicalData || !chemicalData.flashPoint) {
        try {
          const nistData = await this.lookupNIST(cas);
          if (nistData) {
            chemicalData = { ...chemicalData, ...nistData };
            console.log(`✅ Enhanced with NIST data for ${cas}`);
          }
        } catch (error) {
          console.log(`⚠️  NIST lookup failed for ${cas}: ${error.message}`);
        }
      }

      // If no data found, create minimal entry
      if (!chemicalData) {
        console.log(`⚠️  No properties found for ${cas}, creating minimal entry`);
        chemicalData = this.createMinimalEntry(cas);
      }

      // Apply D001/D002 classification rules
      chemicalData = this.applyClassificationRules(chemicalData);

      // Add metadata
      chemicalData.discoveredFrom = source;
      chemicalData.discoveredAt = new Date().toISOString();

      return chemicalData;

    } catch (error) {
      console.error(`❌ Failed to process CAS ${cas}:`, error);
      return null;
    }
  }

  /**
   * Lookup chemical properties from PubChem
   * @param {string} cas - CAS number
   * @returns {object} Chemical properties or null
   */
  async lookupPubChem(cas) {
    try {
      console.log(`🔍 Looking up ${cas} in PubChem...`);
      
      // PubChem REST API endpoint for CAS lookup
      const response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${cas}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`);
      
      if (!response.ok) {
        console.log(`⚠️ PubChem API returned ${response.status} for ${cas}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.PropertyTable?.Properties?.[0]) {
        const props = data.PropertyTable.Properties[0];
        
        // Get additional properties like flash point (if available)
        const detailsResponse = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${cas}/property/FlashPoint,MeltingPoint,BoilingPoint/JSON`).catch(() => null);
        let detailsData = null;
        if (detailsResponse?.ok) {
          detailsData = await detailsResponse.json().catch(() => null);
        }
        
        return {
          name: props.IUPACName || `Chemical ${cas}`,
          molecularFormula: props.MolecularFormula || null,
          molecularWeight: props.MolecularWeight || null,
          flashPoint: detailsData?.PropertyTable?.Properties?.[0]?.FlashPoint || null,
          boilingPoint: detailsData?.PropertyTable?.Properties?.[0]?.BoilingPoint || null,
          pH: null, // PubChem doesn't typically have pH data
          physicalState: 'unknown',
          source: 'PubChem'
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ PubChem lookup failed for ${cas}:`, error.message);
      return null;
    }
  }

  /**
   * Lookup chemical properties from NIST
   * @param {string} cas - CAS number  
   * @returns {object} Chemical properties or null
   */
  async lookupNIST(cas) {
    try {
      console.log(`🔍 Looking up ${cas} in NIST WebBook...`);
      
      // NIST WebBook search by CAS number
      // Note: NIST doesn't have a simple REST API, so we'll simulate a lookup
      // In production, this would involve web scraping or more complex API calls
      
      // For now, return null but log the attempt
      console.log(`⚠️ NIST lookup for ${cas} - API integration pending`);
      return null;
      
      // TODO: Implement actual NIST WebBook integration
      // This would involve either:
      // 1. Web scraping NIST WebBook pages
      // 2. Using NIST's more complex API endpoints
      // 3. Integrating with third-party services that aggregate NIST data
      
    } catch (error) {
      console.error(`❌ NIST lookup failed for ${cas}:`, error.message);
      return null;
    }
  }

  /**
   * Create minimal entry for unknown chemicals
   * @param {string} cas - CAS number
   * @returns {object} Minimal chemical data
   */
  createMinimalEntry(cas) {
    // Use CAS number patterns to make educated guesses about physical state
    let physicalState = 'liquid'; // Default assumption for most chemicals
    let name = `Unknown Chemical ${cas}`;
    
    // Common CAS number patterns for known physical states
    // These are heuristics based on common chemical types
    if (cas.startsWith('7664-') || cas.startsWith('1310-') || cas.startsWith('1344-')) {
      // Common inorganic salts and bases
      physicalState = 'solid';
      name = `Inorganic Compound ${cas}`;
    } else if (cas.startsWith('74-') || cas.startsWith('75-') || cas.startsWith('76-')) {
      // Light hydrocarbons and gases
      physicalState = 'gas';
      name = `Gaseous Compound ${cas}`;
    }
    
    return {
      name: name,
      flashPoint: null,
      pH: null,
      boilingPoint: null,
      physicalState: physicalState,
      ignitable: false,
      corrosive: false,
      unNumber: null,
      properShippingName: null,
      hazardClass: null,
      needsReview: true,
      discoveryMethod: 'minimal_entry'
    };
  }

  /**
   * Apply D001/D002 classification rules
   * @param {object} chemicalData - Chemical properties
   * @returns {object} Chemical data with classification
   */
  applyClassificationRules(chemicalData) {
    // D001 Rule: Flash point < 60°C = ignitable
    if (chemicalData.flashPoint !== null && chemicalData.flashPoint < 60) {
      chemicalData.ignitable = true;
    }

    // D002 Rule: pH ≤ 2 or ≥ 12.5 = corrosive
    if (chemicalData.pH !== null) {
      if (chemicalData.pH <= 2 || chemicalData.pH >= 12.5) {
        chemicalData.corrosive = true;
      }
    }

    return chemicalData;
  }

  /**
   * Add new chemical to database file
   * @param {string} cas - CAS number
   * @param {object} chemicalData - Chemical properties
   */
  async addToDatabase(cas, chemicalData) {
    try {
      console.log(`💾 Adding ${cas} to database...`);

      // Read current database file
      const currentContent = fs.readFileSync(this.databasePath, 'utf8');
      
      // Generate new chemical entry
      const newEntry = this.generateDatabaseEntry(cas, chemicalData);
      
      // Insert before closing brace
      const updatedContent = currentContent.replace(
        /}\s*;\s*export default/,
        `,\n\n${newEntry}  }\n};\n\nexport default`
      );

      // Write updated database
      fs.writeFileSync(this.databasePath, updatedContent);
      
      console.log(`✅ Successfully added ${cas} to database`);

      // Update discovery log
      this.discoveryLog.push({
        cas,
        name: chemicalData.name,
        timestamp: new Date().toISOString(),
        source: chemicalData.discoveredFrom,
        status: 'added'
      });

    } catch (error) {
      console.error(`❌ Failed to add ${cas} to database:`, error);
      throw error;
    }
  }

  /**
   * Generate database entry string for new chemical
   * @param {string} cas - CAS number
   * @param {object} data - Chemical data
   * @returns {string} Database entry string
   */
  generateDatabaseEntry(cas, data) {
    const comment = data.needsReview ? ` // AUTO-DISCOVERED - NEEDS REVIEW` : ` // Auto-discovered from ${data.discoveredFrom}`;
    
    return `  '${cas}': {${comment}
    name: '${data.name}',
    flashPoint: ${data.flashPoint},
    pH: ${data.pH},
    boilingPoint: ${data.boilingPoint},
    physicalState: '${data.physicalState}',
    ignitable: ${data.ignitable},
    corrosive: ${data.corrosive},
    unNumber: ${data.unNumber ? `'${data.unNumber}'` : 'null'},
    properShippingName: ${data.properShippingName ? `'${data.properShippingName}'` : 'null'},
    hazardClass: ${data.hazardClass ? `'${data.hazardClass}'` : 'null'}
  }`;
  }

  /**
   * Load discovery log from file
   */
  loadDiscoveryLog() {
    try {
      if (fs.existsSync(this.discoveryLogPath)) {
        const logData = fs.readFileSync(this.discoveryLogPath, 'utf8');
        this.discoveryLog = JSON.parse(logData);
        console.log(`📋 Loaded ${this.discoveryLog.length} discovery log entries`);
      }
    } catch (error) {
      console.log('⚠️  Could not load discovery log, starting fresh');
      this.discoveryLog = [];
    }
  }

  /**
   * Log discovery session
   * @param {object} sessionData - Session results
   */
  logDiscoverySession(sessionData) {
    try {
      // Save session to log
      const sessionLog = {
        sessions: this.discoveryLog,
        lastSession: sessionData
      };

      fs.writeFileSync(this.discoveryLogPath, JSON.stringify(sessionLog, null, 2));
      console.log(`📝 Logged discovery session`);
    } catch (error) {
      console.error('❌ Failed to log discovery session:', error);
    }
  }

  /**
   * Get discovery statistics
   * @returns {object} Discovery stats
   */
  getStats() {
    return {
      totalDiscoveries: this.discoveryLog.length,
      recentDiscoveries: this.discoveryLog.slice(-10),
      needsReview: this.discoveryLog.filter(entry => entry.needsReview).length
    };
  }
}

export default new CASAutoDiscoveryService();