#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏛️ Texas Quick Indexer - Creating Efficient TX Search Index');
console.log('='.repeat(60));

const STATE_DIR = './state_extracts';
const OUTPUT_FILE = './TX_search_index.json';

// Parse CSV line handling quoted values
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && nextChar === '"') {
      current += '"';
      i++; // Skip next quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function main() {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      console.error('❌ State extracts directory not found. Run state-extractor.cjs first.');
      process.exit(1);
    }
    
    // Find Texas files
    const txFiles = fs.readdirSync(STATE_DIR).filter(f => f.startsWith('TX_') && f.endsWith('.csv'));
    
    if (txFiles.length === 0) {
      console.error('❌ No Texas files found');
      process.exit(1);
    }
    
    console.log(`📁 Found ${txFiles.length} Texas files to process`);
    
    // Create efficient index structure (only storing essential data)
    const index = {
      state: 'TX',
      byZip: {},
      generators: {},
      stats: {
        totalGenerators: 0,
        totalManifests: 0,
        totalTons: 0,
        zipCodes: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    let totalProcessed = 0;
    const generatorMap = new Map();
    
    // Process each Texas file
    txFiles.forEach(file => {
      console.log(`\n📖 Processing ${file}...`);
      const filePath = path.join(STATE_DIR, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        if (lines.length < 2) return;
        
        const headers = parseCSVLine(lines[0]);
        let rowCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;
          
          const values = parseCSVLine(line);
          const row = {};
          
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          
          const generatorId = row['GENERATOR ID'];
          const zip = row['GENERATOR MAIL ZIP'] || row['GENERATOR LOCATION ZIP'] || '';
          
          if (!generatorId || !zip) continue;
          
          rowCount++;
          
          // Create minimal generator record
          if (!generatorMap.has(generatorId)) {
            generatorMap.set(generatorId, {
              id: generatorId,
              name: row['GENERATOR NAME'] || 'Unknown',
              city: row['GENERATOR MAIL CITY'] || row['GENERATOR LOCATION CITY'] || '',
              state: 'TX',
              zip: zip,
              manifestCount: 0,
              totalTons: 0,
              lastShipped: '',
              destinationFacility: ''
            });
          }
          
          const gen = generatorMap.get(generatorId);
          
          // Update generator with manifest data
          gen.manifestCount++;
          gen.totalTons += parseFloat(row['TOTAL QUANTITY TONS'] || '0');
          
          // Keep latest shipment info
          const shippedDate = row['SHIPPED DATE'];
          if (shippedDate > gen.lastShipped) {
            gen.lastShipped = shippedDate;
            gen.destinationFacility = row['DES FACILITY NAME'] || '';
          }
          
          // Index by ZIP
          if (!index.byZip[zip]) {
            index.byZip[zip] = [];
          }
          if (!index.byZip[zip].includes(generatorId)) {
            index.byZip[zip].push(generatorId);
          }
          
          // Progress indicator
          if (rowCount % 20000 === 0) {
            console.log(`     Progress: ${rowCount} rows processed...`);
          }
        }
        
        console.log(`   ✅ Processed ${rowCount} rows`);
        totalProcessed += rowCount;
        
      } catch (err) {
        console.error(`   ❌ Error processing ${file}: ${err.message}`);
      }
    });
    
    // Convert Map to object (more memory efficient than keeping all manifest details)
    console.log('\n📊 Finalizing index...');
    
    for (const [id, gen] of generatorMap) {
      // Only store essential data
      index.generators[id] = {
        id: gen.id,
        name: gen.name,
        city: gen.city,
        zip: gen.zip,
        manifestCount: gen.manifestCount,
        totalTons: Math.round(gen.totalTons * 100) / 100, // Round to 2 decimals
        lastShipped: gen.lastShipped,
        destinationFacility: gen.destinationFacility
      };
    }
    
    // Update stats
    index.stats.totalGenerators = generatorMap.size;
    index.stats.totalManifests = totalProcessed;
    index.stats.totalTons = Array.from(generatorMap.values()).reduce((sum, gen) => sum + gen.totalTons, 0);
    index.stats.zipCodes = Object.keys(index.byZip).length;
    
    // Write index file
    console.log('💾 Writing Texas search index...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Texas Index Complete!');
    console.log(`📊 Total Generators: ${index.stats.totalGenerators.toLocaleString()}`);
    console.log(`📊 Total Manifests: ${index.stats.totalManifests.toLocaleString()}`);
    console.log(`📊 Total Tonnage: ${Math.round(index.stats.totalTons).toLocaleString()} tons`);
    console.log(`📊 ZIP Codes: ${index.stats.zipCodes}`);
    console.log(`💾 Index File: ${OUTPUT_FILE}`);
    
    // Show sample ZIP codes with counts
    console.log('\n📍 Sample ZIP Codes with Generator Counts:');
    const zipSample = Object.entries(index.byZip)
      .sort((a, b) => b[1].length - a[1].length) // Sort by count
      .slice(0, 10);
    
    zipSample.forEach(([zip, generators]) => {
      console.log(`   ${zip}: ${generators.length} generators`);
    });
    
    // Check ZIP 75065 specifically
    if (index.byZip['75065']) {
      console.log(`\n🎯 ZIP 75065: ${index.byZip['75065'].length} generators found!`);
    } else {
      console.log(`\n❌ ZIP 75065: No generators found`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();