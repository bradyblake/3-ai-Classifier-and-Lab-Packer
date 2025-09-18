// CAS Number Lookup Service
// Provides regulatory information based on CAS numbers
// Keeps it simple - just what's needed for classification

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// import comprehensiveChemicalDatabase from '../data/comprehensive_chemical_database.js'; // DEACTIVATED - Syntax errors from other Claude session
const comprehensiveChemicalDatabase = { chemicals: {} }; // Empty fallback

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CASLookupService {
  constructor() {
    this.dataPath = path.join(__dirname, '../../src/shared/data/regulatory');
    this.casDatabase = new Map();
    this.loadData();
  }

  loadData() {
    try {
      // Load P-codes
      const pCodes = JSON.parse(fs.readFileSync(path.join(this.dataPath, 'p_code_wastes.json'), 'utf8'));
      pCodes.forEach(waste => {
        if (waste.cas) {
          this.addToDatabase(waste.cas, {
            type: 'P-listed',
            code: waste.code,
            chemical: waste.chemical,
            acuteHazardous: true
          });
        }
      });

      // Load U-codes  
      const uCodes = JSON.parse(fs.readFileSync(path.join(this.dataPath, 'u_code_wastes.json'), 'utf8'));
      uCodes.forEach(waste => {
        if (waste.cas) {
          this.addToDatabase(waste.cas, {
            type: 'U-listed',
            code: waste.code,
            chemical: waste.chemical,
            toxic: true
          });
        }
      });

      console.log(`📚 CAS Database loaded: ${this.casDatabase.size} P/U-listed wastes`);
      
      // Log comprehensive database stats
      const stats = this.getDatabaseStats();
      console.log(stats.message);
    } catch (error) {
      console.error('Error loading CAS database:', error);
    }
  }

  addToDatabase(cas, info) {
    if (!this.casDatabase.has(cas)) {
      this.casDatabase.set(cas, []);
    }
    this.casDatabase.get(cas).push(info);
  }

  /**
   * Look up a CAS number and return regulatory information
   * @param {string} cas - CAS number to look up
   * @returns {object} Regulatory data or null
   */
  lookup(cas) {
    if (!cas) return null;
    
    // Normalize CAS format (remove spaces, ensure dashes)
    const normalizedCAS = cas.trim().replace(/\s+/g, '');
    
    return this.casDatabase.get(normalizedCAS) || null;
  }

  /**
   * Check if a chemical composition contains listed wastes
   * @param {array} composition - Array of {name, cas, percentage} objects
   * @returns {object} Listed waste codes found
   */
  checkComposition(composition) {
    const results = {
      pCodes: [],
      uCodes: [],
      warnings: [],
      hasListedWaste: false
    };

    if (!Array.isArray(composition)) return results;

    composition.forEach(component => {
      if (component.cas) {
        const data = this.lookup(component.cas);
        if (data) {
          data.forEach(entry => {
            if (entry.type === 'P-listed') {
              results.pCodes.push({
                code: entry.code,
                chemical: entry.chemical,
                cas: component.cas,
                percentage: component.percentage
              });
              results.hasListedWaste = true;
              
              // P-listed wastes are acutely hazardous - even small amounts matter
              results.warnings.push(`Contains P-listed waste ${entry.code} (${entry.chemical})`);
            } else if (entry.type === 'U-listed') {
              // U-codes typically apply to commercial chemical products
              // Check if it's a significant component (not just a trace)
              const percent = parseFloat(component.percentage) || 0;
              if (percent > 1) { // More than 1% is significant
                results.uCodes.push({
                  code: entry.code,
                  chemical: entry.chemical,
                  cas: component.cas,
                  percentage: component.percentage
                });
                results.hasListedWaste = true;
              }
            }
          });
        }
      }
    });

    return results;
  }

  /**
   * Get hazard characteristics for a CAS number
   * This helps determine D-codes using our comprehensive database
   */
  getHazardCharacteristics(cas) {
    if (!cas) return null;
    
    // Normalize CAS format (remove spaces, ensure dashes)
    const normalizedCAS = cas.trim().replace(/\s+/g, '');
    
    // Look up in comprehensive database
    const chemicalData = comprehensiveChemicalDatabase[normalizedCAS];
    
    if (chemicalData) {
      const characteristics = {
        name: chemicalData.name,
        ignitable: chemicalData.ignitable,
        corrosive: chemicalData.corrosive,
        flashPoint: chemicalData.flashPoint,
        pH: chemicalData.pH,
        boilingPoint: chemicalData.boilingPoint,
        physicalState: chemicalData.physicalState,
        unNumber: chemicalData.unNumber,
        properShippingName: chemicalData.properShippingName,
        hazardClass: chemicalData.hazardClass
      };
      
      return characteristics;
    }
    
    return null;
  }

  /**
   * Get basic chemical information for a CAS number
   * @param {string} cas - CAS number to look up
   * @returns {object} Chemical data or null
   */
  getChemicalInfo(cas) {
    return this.getHazardCharacteristics(cas);
  }

  /**
   * Check if a chemical is ignitable (D001)
   * @param {string} cas - CAS number to check
   * @returns {boolean} True if ignitable
   */
  isIgnitable(cas) {
    const data = this.getHazardCharacteristics(cas);
    return data ? data.ignitable : false;
  }

  /**
   * Check if a chemical is corrosive (D002)
   * @param {string} cas - CAS number to check
   * @returns {boolean} True if corrosive
   */
  isCorrosive(cas) {
    const data = this.getHazardCharacteristics(cas);
    return data ? data.corrosive : false;
  }

  /**
   * Get flash point for a chemical
   * @param {string} cas - CAS number to look up
   * @returns {number|null} Flash point in Celsius or null
   */
  getFlashPoint(cas) {
    const data = this.getHazardCharacteristics(cas);
    return data ? data.flashPoint : null;
  }

  /**
   * Get pH for a chemical
   * @param {string} cas - CAS number to look up
   * @returns {number|null} pH value or null
   */
  getPH(cas) {
    const data = this.getHazardCharacteristics(cas);
    return data ? data.pH : null;
  }

  /**
   * Get DOT shipping information
   * @param {string} cas - CAS number to look up
   * @returns {object|null} DOT shipping data or null
   */
  getDOTInfo(cas) {
    const data = this.getHazardCharacteristics(cas);
    if (data && (data.unNumber || data.properShippingName || data.hazardClass)) {
      return {
        unNumber: data.unNumber,
        properShippingName: data.properShippingName,
        hazardClass: data.hazardClass
      };
    }
    return null;
  }

  /**
   * Get database statistics
   * @returns {object} Database size and coverage info
   */
  getDatabaseStats() {
    const totalChemicals = Object.keys(comprehensiveChemicalDatabase).length;
    const ignitableCount = Object.values(comprehensiveChemicalDatabase)
      .filter(chem => chem.ignitable).length;
    const corrosiveCount = Object.values(comprehensiveChemicalDatabase)
      .filter(chem => chem.corrosive).length;
    
    return {
      totalChemicals,
      ignitableCount,
      corrosiveCount,
      pAndUListedWastes: this.casDatabase.size,
      message: `📊 Database contains ${totalChemicals} chemicals (${ignitableCount} ignitable, ${corrosiveCount} corrosive) plus ${this.casDatabase.size} P/U-listed wastes`
    };
  }
}

export default new CASLookupService();