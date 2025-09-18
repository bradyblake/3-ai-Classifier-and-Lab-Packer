/**
 * EPA Manifest CSV Parser Service
 * 
 * Processes EPA e-Manifest CSV data files for waste generator lead discovery
 * Updated every 90 days from EPA data releases
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EPAManifestParser {
  constructor() {
    this.dataPath = path.join(__dirname, '../data');
    this.manifestFiles = [];
    this.cache = new Map();
    this.lastLoadTime = null;
    this.cacheTimeout = 1000 * 60 * 60; // 1 hour cache
    
    console.log('🏛️ EPA Manifest Parser initialized');
  }

  /**
   * Initialize and scan for available manifest files
   */
  async initialize() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        console.log('⚠️ EPA data directory not found, using external path');
        this.dataPath = 'C:/Users/brady/Documents/EM_MANIFEST';
      }

      // Scan for all manifest CSV files
      const files = fs.readdirSync(this.dataPath);
      this.manifestFiles = files.filter(file => 
        file.startsWith('EM_MANIFEST_') && file.endsWith('.csv')
      );

      console.log(`📁 Found ${this.manifestFiles.length} EPA manifest files`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize EPA manifest parser:', error);
      return false;
    }
  }

  /**
   * Parse CSV line into structured generator data
   */
  parseManifestRow(csvRow) {
    const fields = this.parseCSVLine(csvRow);
    if (fields.length < 50) return null; // Invalid row

    const generator = {
      manifestNumber: fields[0]?.replace(/"/g, ''),
      updatedDate: fields[1]?.replace(/"/g, ''),
      shippedDate: fields[2]?.replace(/"/g, ''),
      receivedDate: fields[3]?.replace(/"/g, ''),
      status: fields[4]?.replace(/"/g, ''),
      
      // Generator Information
      generatorId: fields[7]?.replace(/"/g, ''),
      generatorName: fields[8]?.replace(/"/g, ''),
      generatorAddress: {
        streetNo: fields[15]?.replace(/"/g, ''),
        street1: fields[16]?.replace(/"/g, ''),
        street2: fields[17]?.replace(/"/g, ''),
        city: fields[18]?.replace(/"/g, ''),
        zip: fields[19]?.replace(/"/g, ''),
        state: fields[20]?.replace(/"/g, '')
      },
      generatorContact: fields[21]?.replace(/"/g, ''),
      
      // Destination Facility Information
      destinationId: fields[22]?.replace(/"/g, ''),
      destinationName: fields[23]?.replace(/"/g, ''),
      destinationAddress: {
        streetNo: fields[30]?.replace(/"/g, ''),
        street1: fields[31]?.replace(/"/g, ''),
        street2: fields[32]?.replace(/"/g, ''),
        city: fields[33]?.replace(/"/g, ''),
        zip: fields[34]?.replace(/"/g, ''),
        state: fields[35]?.replace(/"/g, '')
      },
      
      // Waste Quantities
      quantities: {
        totalQuantityHazKg: parseFloat(fields[41]?.replace(/"/g, '') || '0'),
        totalQuantityHazTons: parseFloat(fields[42]?.replace(/"/g, '') || '0'),
        totalQuantityKg: parseFloat(fields[47]?.replace(/"/g, '') || '0'),
        totalQuantityTons: parseFloat(fields[48]?.replace(/"/g, '') || '0')
      }
    };

    // Create full address strings
    generator.fullAddress = this.buildAddress(generator.generatorAddress);
    generator.destinationFullAddress = this.buildAddress(generator.destinationAddress);

    return generator;
  }

  /**
   * Build full address string from address components
   */
  buildAddress(addressObj) {
    const parts = [
      addressObj.streetNo,
      addressObj.street1,
      addressObj.street2,
      addressObj.city,
      addressObj.state,
      addressObj.zip
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(' ').trim();
  }

  /**
   * Parse CSV line handling quoted fields with commas
   */
  parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
        continue;
      }
      
      currentField += char;
    }
    
    if (currentField) {
      fields.push(currentField);
    }
    
    return fields;
  }

  /**
   * Search generators by zip code
   */
  async searchByZipCode(zipCode, limit = 100) {
    await this.ensureDataLoaded();
    
    const cacheKey = `zip_${zipCode}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log(`📋 Returning ${cached.length} cached results for zip ${zipCode}`);
      return cached.slice(0, limit);
    }

    console.log(`🔍 Searching EPA manifests for zip code: ${zipCode}`);
    const results = [];
    
    try {
      for (const filename of this.manifestFiles.slice(0, 3)) { // Process first 3 files for speed
        const filePath = path.join(this.dataPath, filename);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        console.log(`📁 Processing ${filename}: ${lines.length} lines`);
        
        for (let i = 1; i < lines.length && results.length < limit * 2; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const generator = this.parseManifestRow(line);
          if (!generator || !generator.generatorAddress.zip) continue;
          
          // Check if zip code matches (handle both 5 and 9 digit zips)
          const genZip = generator.generatorAddress.zip.substring(0, 5);
          const searchZip = zipCode.substring(0, 5);
          
          if (genZip === searchZip) {
            results.push(this.enrichGeneratorData(generator));
          }
        }
      }
      
      // Cache the results
      this.cache.set(cacheKey, results);
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
      
      console.log(`✅ Found ${results.length} generators for zip ${zipCode}`);
      return results.slice(0, limit);
      
    } catch (error) {
      console.error(`❌ Error searching zip ${zipCode}:`, error);
      return [];
    }
  }

  /**
   * Enrich generator data with business intelligence
   */
  enrichGeneratorData(generator) {
    // Calculate generator size based on quantities
    const annualTons = generator.quantities.totalQuantityTons || generator.quantities.totalQuantityHazTons || 0;
    const monthlyKg = annualTons * 1000 / 12; // Estimate monthly kg
    
    let generatorSize = 'Small';
    if (monthlyKg > 1000) generatorSize = 'Large';
    else if (monthlyKg > 100) generatorSize = 'Medium';
    
    // Infer waste types from company name and destination
    const wasteTypes = this.inferWasteTypes(generator.generatorName, generator.destinationName);
    
    // Calculate potential value
    const potentialValue = this.calculatePotentialValue(wasteTypes[0] || 'Industrial Waste', generatorSize);
    
    // Determine compliance status based on recent activity
    const lastShipped = new Date(generator.shippedDate);
    const monthsAgo = (new Date() - lastShipped) / (1000 * 60 * 60 * 24 * 30);
    const complianceStatus = monthsAgo < 6 ? 'Active' : monthsAgo < 12 ? 'Recent' : 'Inactive';
    
    return {
      id: generator.generatorId,
      companyName: generator.generatorName,
      handlerId: generator.generatorId,
      address: generator.fullAddress,
      phone: '', // Not available in manifest data
      wasteTypes: wasteTypes,
      generatorSize: generatorSize,
      complianceStatus: complianceStatus,
      potentialValue: potentialValue,
      lastUpdate: generator.updatedDate,
      source: 'EPA',
      
      // Additional manifest-specific data
      manifestData: {
        lastShipped: generator.shippedDate,
        lastReceived: generator.receivedDate,
        destinationFacility: generator.destinationName,
        destinationId: generator.destinationId,
        annualTons: annualTons,
        recentManifests: 1 // Would need aggregation for actual count
      },
      
      notes: `Generator ID: ${generator.generatorId}. Last shipment: ${generator.shippedDate}. Destination: ${generator.destinationName}`
    };
  }

  /**
   * Infer waste types from company name and destination facility
   */
  inferWasteTypes(generatorName, destinationName) {
    const name = (generatorName || '').toLowerCase();
    const dest = (destinationName || '').toLowerCase();
    const wasteTypes = [];
    
    // Medical waste indicators
    if (name.includes('medical') || name.includes('hospital') || name.includes('clinic') || 
        name.includes('healthcare') || dest.includes('medical')) {
      wasteTypes.push('Medical Waste');
    }
    
    // Lab chemicals
    if (name.includes('lab') || name.includes('research') || name.includes('university') || 
        name.includes('pharma') || dest.includes('lab')) {
      wasteTypes.push('Lab Chemicals');
    }
    
    // Automotive
    if (name.includes('auto') || name.includes('ford') || name.includes('gm') || 
        name.includes('toyota') || name.includes('honda') || dest.includes('auto')) {
      wasteTypes.push('Automotive Waste');
    }
    
    // Industrial/Chemical
    if (name.includes('chemical') || name.includes('inc') || name.includes('corp') || 
        name.includes('manufacturing') || dest.includes('chemical')) {
      wasteTypes.push('Chemical Waste');
    }
    
    // Default to industrial if nothing else matches
    if (wasteTypes.length === 0) {
      wasteTypes.push('Industrial Waste');
    }
    
    return wasteTypes;
  }

  /**
   * Calculate potential annual revenue value
   */
  calculatePotentialValue(wasteType, generatorSize) {
    const baseRates = {
      'Medical Waste': 5000,
      'Lab Chemicals': 8000,
      'Automotive Waste': 3000,
      'Industrial Waste': 12000,
      'Chemical Waste': 15000
    };
    
    const sizeMultipliers = {
      'Large': 3.0,
      'Medium': 1.5,
      'Small': 1.0
    };
    
    const baseRate = baseRates[wasteType] || 2500;
    const multiplier = sizeMultipliers[generatorSize] || 1.0;
    
    return Math.round(baseRate * multiplier);
  }

  /**
   * Ensure manifest data is loaded and current
   */
  async ensureDataLoaded() {
    if (!this.manifestFiles.length) {
      await this.initialize();
    }
    
    if (!this.lastLoadTime || (Date.now() - this.lastLoadTime) > this.cacheTimeout) {
      this.lastLoadTime = Date.now();
      console.log('🔄 EPA manifest data cache refreshed');
    }
  }

  /**
   * Get statistics about available manifest data
   */
  async getDataStats() {
    await this.ensureDataLoaded();
    
    const stats = {
      filesAvailable: this.manifestFiles.length,
      dataPath: this.dataPath,
      cacheSize: this.cache.size,
      lastUpdate: this.lastLoadTime ? new Date(this.lastLoadTime).toISOString() : null
    };
    
    // Get sample data from first file
    if (this.manifestFiles.length > 0) {
      try {
        const samplePath = path.join(this.dataPath, this.manifestFiles[0]);
        const content = fs.readFileSync(samplePath, 'utf8');
        const lines = content.split('\n');
        stats.sampleRecords = lines.length - 1; // Subtract header
        stats.sampleFile = this.manifestFiles[0];
      } catch (error) {
        stats.error = error.message;
      }
    }
    
    return stats;
  }
}

// Export singleton instance
const epaManifestParser = new EPAManifestParser();
export default epaManifestParser;