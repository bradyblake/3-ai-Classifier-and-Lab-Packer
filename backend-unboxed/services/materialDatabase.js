// Material Classification Database
// Stores and retrieves previously classified materials to avoid reprocessing

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MaterialDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../training_data/material_database.json');
    this.database = this.loadDatabase();
    this.stats = {
      totalMaterials: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCallsSaved: 0
    };
  }

  loadDatabase() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
        console.log(`📚 Loaded material database with ${Object.keys(data).length} materials`);
        return data;
      }
    } catch (error) {
      console.warn('⚠️ Failed to load material database:', error.message);
    }
    return {};
  }

  saveDatabase() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 2));
      console.log(`💾 Saved material database with ${Object.keys(this.database).length} materials`);
    } catch (error) {
      console.error('❌ Failed to save material database:', error.message);
    }
  }

  /**
   * Generate a unique key for a material based on its properties
   */
  generateMaterialKey(material) {
    // Create a normalized key based on material properties
    const normalized = {
      name: (material.productName || material.filename || '').toLowerCase().trim(),
      state: (material.physicalState || '').toLowerCase(),
      pH: material.pH ? Math.round(material.pH * 10) / 10 : null,
      flashPoint: material.flashPoint?.fahrenheit ? Math.round(material.flashPoint.fahrenheit) : null
    };
    
    // Create a hash of the normalized properties
    const keyString = JSON.stringify(normalized);
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Check if a material has been classified before
   */
  getMaterialClassification(material) {
    const key = this.generateMaterialKey(material);
    const stored = this.database[key];
    
    if (stored) {
      this.stats.cacheHits++;
      this.stats.apiCallsSaved++;
      console.log(`✅ Found cached classification for: ${material.productName || material.filename}`);
      
      // Return a copy with updated timestamp
      return {
        ...stored.classification,
        source: 'cache',
        cached_at: stored.timestamp,
        cache_key: key
      };
    }
    
    this.stats.cacheMisses++;
    return null;
  }

  /**
   * Store a new material classification
   */
  storeMaterialClassification(material, classification) {
    const key = this.generateMaterialKey(material);
    
    this.database[key] = {
      material: {
        productName: material.productName || material.filename,
        physicalState: material.physicalState,
        pH: material.pH,
        flashPoint: material.flashPoint
      },
      classification: classification,
      timestamp: new Date().toISOString(),
      access_count: 1
    };
    
    this.stats.totalMaterials = Object.keys(this.database).length;
    console.log(`💾 Stored classification for: ${material.productName || material.filename}`);
    
    // Auto-save every 10 new materials
    if (this.stats.totalMaterials % 10 === 0) {
      this.saveDatabase();
    }
  }

  /**
   * Search for similar materials (fuzzy matching)
   */
  findSimilarMaterials(searchTerm, limit = 5) {
    const term = searchTerm.toLowerCase();
    const matches = [];
    
    Object.entries(this.database).forEach(([key, entry]) => {
      const name = (entry.material.productName || '').toLowerCase();
      if (name.includes(term) || term.includes(name)) {
        matches.push({
          ...entry.material,
          classification: entry.classification,
          key: key,
          similarity: this.calculateSimilarity(term, name)
        });
      }
    });
    
    // Sort by similarity and return top matches
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate string similarity (simple Levenshtein-like score)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
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

  /**
   * Get database statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalMaterials: Object.keys(this.database).length,
      cacheHitRate: this.stats.cacheHits > 0 
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Clear the database (use with caution!)
   */
  clearDatabase() {
    this.database = {};
    this.saveDatabase();
    this.stats = {
      totalMaterials: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCallsSaved: 0
    };
    console.log('🗑️ Material database cleared');
  }

  /**
   * Export database for backup
   */
  exportDatabase() {
    return {
      materials: this.database,
      stats: this.getStats(),
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Import database from backup
   */
  importDatabase(data) {
    if (data.materials) {
      this.database = data.materials;
      this.saveDatabase();
      console.log(`📥 Imported ${Object.keys(this.database).length} materials`);
      return true;
    }
    return false;
  }

  /**
   * Export database to Excel for human review
   */
  exportToExcel(filename = 'material_database.xlsx') {
    const data = [];
    
    Object.entries(this.database).forEach(([key, entry]) => {
      data.push({
        'Material Name': entry.material.productName,
        'Physical State': entry.material.physicalState,
        'pH': entry.material.pH,
        'Flash Point (°F)': entry.material.flashPoint?.fahrenheit,
        'Flash Point (°C)': entry.material.flashPoint?.celsius,
        'Federal Codes': entry.classification.federal_codes?.join(', ') || '',
        'State Form Code': entry.classification.state_form_code,
        'State Classification': entry.classification.state_classification,
        'Final Classification': entry.classification.final_classification,
        'DOT Hazard Class': entry.classification.hazardClass,
        'UN Number': entry.classification.unNumber,
        'Packing Group': entry.classification.packingGroup,
        'Last Updated': entry.timestamp,
        'Access Count': entry.access_count,
        'Cache Key': key
      });
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns
    const maxWidth = 50;
    const cols = Object.keys(data[0] || {}).map(key => ({
      wch: Math.min(maxWidth, Math.max(key.length, ...data.map(row => String(row[key] || '').length)))
    }));
    ws['!cols'] = cols;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    
    // Add stats sheet
    const statsData = [
      { Metric: 'Total Materials', Value: Object.keys(this.database).length },
      { Metric: 'Cache Hits', Value: this.stats.cacheHits },
      { Metric: 'Cache Misses', Value: this.stats.cacheMisses },
      { Metric: 'API Calls Saved', Value: this.stats.apiCallsSaved },
      { Metric: 'Cache Hit Rate', Value: this.getStats().cacheHitRate }
    ];
    
    const statsWs = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');
    
    const filepath = path.join(__dirname, '../exports', filename);
    
    // Ensure exports directory exists
    const exportDir = path.dirname(filepath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    XLSX.writeFile(wb, filepath);
    console.log(`📊 Exported database to Excel: ${filepath}`);
    return filepath;
  }

  /**
   * Import materials from Excel file
   */
  importFromExcel(filepath) {
    try {
      const wb = XLSX.readFile(filepath);
      const ws = wb.Sheets['Materials'];
      
      if (!ws) {
        throw new Error('No Materials sheet found in Excel file');
      }
      
      const data = XLSX.utils.sheet_to_json(ws);
      let imported = 0;
      
      data.forEach(row => {
        if (row['Material Name']) {
          const key = row['Cache Key'] || this.generateMaterialKey({
            productName: row['Material Name'],
            physicalState: row['Physical State'],
            pH: row['pH'],
            flashPoint: {
              fahrenheit: row['Flash Point (°F)'],
              celsius: row['Flash Point (°C)']
            }
          });
          
          this.database[key] = {
            material: {
              productName: row['Material Name'],
              physicalState: row['Physical State'],
              pH: row['pH'],
              flashPoint: {
                fahrenheit: row['Flash Point (°F)'],
                celsius: row['Flash Point (°C)']
              }
            },
            classification: {
              federal_codes: row['Federal Codes']?.split(', ').filter(Boolean) || [],
              state_form_code: row['State Form Code'],
              state_classification: row['State Classification'],
              final_classification: row['Final Classification'],
              hazardClass: row['DOT Hazard Class'],
              unNumber: row['UN Number'],
              packingGroup: row['Packing Group']
            },
            timestamp: row['Last Updated'] || new Date().toISOString(),
            access_count: row['Access Count'] || 1
          };
          imported++;
        }
      });
      
      this.saveDatabase();
      console.log(`📥 Imported ${imported} materials from Excel`);
      return imported;
    } catch (error) {
      console.error('Failed to import from Excel:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new MaterialDatabase();