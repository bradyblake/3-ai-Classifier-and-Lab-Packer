#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Simple EPA Data Indexer');
console.log('='.repeat(60));

const MANIFEST_PATH = 'C:/Users/brady/Documents/EM_MANIFEST';
const OUTPUT_PATH = './epa-search-index.json';

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

// Main processing
function main() {
  try {
    // Check if manifest directory exists
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(`❌ Directory not found: ${MANIFEST_PATH}`);
      process.exit(1);
    }
    
    // Get all CSV files
    const csvFiles = fs.readdirSync(MANIFEST_PATH).filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.error(`❌ No CSV files found in ${MANIFEST_PATH}`);
      process.exit(1);
    }
    
    console.log(`Found ${csvFiles.length} CSV files to process`);
    
    // Create index structure
    const index = {
      generators: {},
      byZip: {},
      byState: {},
      byCity: {},
      stats: {
        totalGenerators: 0,
        totalManifests: 0,
        totalTons: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    
    let totalRows = 0;
    
    // Process each CSV file (limit to first 3 for testing full processing)
    csvFiles.slice(0, 3).forEach((file, fileIndex) => {
      // Process first 3 files completely
      
      console.log(`\n📁 Processing ${file}...`);
      const filePath = path.join(MANIFEST_PATH, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        if (lines.length < 2) {
          console.log('   Empty file, skipping...');
          return;
        }
        
        // Parse headers
        const headers = parseCSVLine(lines[0]);
        console.log(`   Found ${headers.length} columns`);
        
        let rowCount = 0;
        
        // Process data rows (removed limit to process all rows)
        console.log(`   Processing ${lines.length - 1} data rows...`);
        for (let i = 1; i < lines.length; i++) {
          
          // Progress indicator for large files
          if (i % 50000 === 0) {
            console.log(`     Progress: ${i} / ${lines.length - 1} rows (${Math.round(i/(lines.length-1)*100)}%)`);
          }
          const line = lines[i];
          if (!line.trim()) continue;
          
          const values = parseCSVLine(line);
          const row = {};
          
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          
          // Extract generator data
          const generatorId = row['GENERATOR ID'];
          if (!generatorId) continue;
          
          rowCount++;
          
          // Create or update generator entry
          if (!index.generators[generatorId]) {
            index.generators[generatorId] = {
              id: generatorId,
              name: row['GENERATOR NAME'] || 'Unknown',
              street1: row['GENERATOR MAIL STREET1'] || '',
              street2: row['GENERATOR MAIL STREET2'] || '',
              city: row['GENERATOR MAIL CITY'] || '',
              state: row['GENERATOR MAIL STATE'] || '',
              zip: row['GENERATOR MAIL ZIP'] || '',
              locationCity: row['GENERATOR LOCATION CITY'] || '',
              locationState: row['GENERATOR LOCATION STATE'] || '',
              locationZip: row['GENERATOR LOCATION ZIP'] || '',
              contact: row['GENERATOR CONTACT COMPANY NAME'] || '',
              manifests: [],
              totalTons: 0,
              wasteTypes: new Set()
            };
            index.stats.totalGenerators++;
          }
          
          const gen = index.generators[generatorId];
          
          // Add manifest data
          const manifest = {
            trackingNumber: row['MANIFEST TRACKING NUMBER'],
            shippedDate: row['SHIPPED DATE'],
            receivedDate: row['RECEIVED DATE'],
            destinationFacility: row['DES FACILITY NAME'],
            destinationId: row['DES FACILITY ID'],
            status: row['STATUS'],
            tons: parseFloat(row['TOTAL QUANTITY TONS'] || '0')
          };
          
          gen.manifests.push(manifest);
          gen.totalTons += manifest.tons;
          index.stats.totalTons += manifest.tons;
          index.stats.totalManifests++;
          
          // Determine waste types
          if (parseFloat(row['TOTAL QUANTITY ACUTE TONS'] || '0') > 0) gen.wasteTypes.add('Acute Hazardous');
          if (parseFloat(row['TOTAL QUANTITY HAZ TONS'] || '0') > 0) gen.wasteTypes.add('Hazardous');
          if (parseFloat(row['TOTAL QUANTITY NON ACUTE TONS'] || '0') > 0) gen.wasteTypes.add('Non-Acute');
          if (parseFloat(row['TOTAL QUANTITY NON HAZ TONS'] || '0') > 0) gen.wasteTypes.add('Non-Hazardous');
          
          // Index by ZIP
          const zip = gen.zip || gen.locationZip;
          if (zip) {
            if (!index.byZip[zip]) index.byZip[zip] = [];
            if (!index.byZip[zip].includes(generatorId)) {
              index.byZip[zip].push(generatorId);
            }
            
            // Also index by ZIP prefix
            const zipPrefix = zip.substring(0, 3);
            if (!index.byZip[zipPrefix]) index.byZip[zipPrefix] = [];
            if (!index.byZip[zipPrefix].includes(generatorId)) {
              index.byZip[zipPrefix].push(generatorId);
            }
          }
          
          // Index by state
          const state = gen.state || gen.locationState;
          if (state) {
            if (!index.byState[state]) index.byState[state] = [];
            if (!index.byState[state].includes(generatorId)) {
              index.byState[state].push(generatorId);
            }
          }
          
          // Index by city
          const city = gen.city || gen.locationCity;
          if (city && state) {
            const cityKey = `${city}_${state}`;
            if (!index.byCity[cityKey]) index.byCity[cityKey] = [];
            if (!index.byCity[cityKey].includes(generatorId)) {
              index.byCity[cityKey].push(generatorId);
            }
          }
        }
        
        console.log(`   ✅ Processed ${rowCount} data rows`);
        totalRows += rowCount;
        
      } catch (err) {
        console.error(`   ❌ Error processing ${file}: ${err.message}`);
      }
    });
    
    // Convert Sets to Arrays for JSON serialization
    Object.values(index.generators).forEach(gen => {
      gen.wasteTypes = Array.from(gen.wasteTypes);
    });
    
    // Write index to file
    console.log('\n📝 Writing search index...');
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Indexing Complete!');
    console.log(`   Total rows processed: ${totalRows}`);
    console.log(`   Total generators: ${index.stats.totalGenerators}`);
    console.log(`   Total manifests: ${index.stats.totalManifests}`);
    console.log(`   Total tonnage: ${index.stats.totalTons.toFixed(2)} tons`);
    console.log(`   Index saved to: ${OUTPUT_PATH}`);
    
    // Show sample data
    if (index.stats.totalGenerators > 0) {
      console.log('\n📊 Sample ZIP codes in index:');
      const zips = Object.keys(index.byZip).filter(z => z.length === 5).slice(0, 10);
      console.log('   ' + zips.join(', '));
      
      console.log('\n📊 States in index:');
      console.log('   ' + Object.keys(index.byState).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the indexer
main();