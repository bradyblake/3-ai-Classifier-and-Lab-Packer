#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏛️ EPA State Data Extractor - Creating State-Specific Files');
console.log('='.repeat(60));

const MANIFEST_PATH = 'C:/Users/brady/Documents/EM_MANIFEST';
const OUTPUT_DIR = './state_extracts';

// Target states to extract (you can modify this list)
const TARGET_STATES = ['TX', 'CA', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

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

// Create output directory
function createOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}`);
  }
}

// Extract specific state data from a CSV file
function extractStateData(filePath, fileName, targetState) {
  console.log(`\n📖 Extracting ${targetState} data from ${fileName}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lines.length < 2) {
      console.log('   Empty file, skipping...');
      return 0;
    }
    
    const headers = parseCSVLine(lines[0]);
    const outputFile = path.join(OUTPUT_DIR, `${targetState}_${fileName}`);
    const outputLines = [lines[0]]; // Include header
    
    let extractedCount = 0;
    
    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      const row = {};
      
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      
      // Check if this row belongs to the target state
      const genState = row['GENERATOR MAIL STATE'] || row['GENERATOR LOCATION STATE'] || '';
      const destState = row['DES FAC MAIL STATE'] || row['DES FAC LOCATION STATE'] || '';
      
      if (genState === targetState || destState === targetState) {
        outputLines.push(line);
        extractedCount++;
      }
      
      // Progress indicator for large files
      if (i % 100000 === 0) {
        console.log(`     Progress: ${i} / ${lines.length - 1} rows (${Math.round(i/(lines.length-1)*100)}%)`);
      }
    }
    
    // Write state-specific file
    if (extractedCount > 0) {
      fs.writeFileSync(outputFile, outputLines.join('\n'));
      console.log(`   ✅ Extracted ${extractedCount} rows to ${outputFile}`);
    } else {
      console.log(`   ❌ No data found for state ${targetState}`);
    }
    
    return extractedCount;
    
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
    return 0;
  }
}

// Create fast index for a specific state
function createStateIndex(state) {
  console.log(`\n📊 Creating fast index for ${state}...`);
  
  const stateFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith(`${state}_`) && f.endsWith('.csv'));
  
  if (stateFiles.length === 0) {
    console.log(`   ❌ No ${state} files found`);
    return;
  }
  
  const index = {
    state: state,
    generators: {},
    byZip: {},
    byCity: {},
    stats: {
      totalGenerators: 0,
      totalManifests: 0,
      totalTons: 0,
      lastUpdated: new Date().toISOString()
    }
  };
  
  let totalRows = 0;
  
  stateFiles.forEach(file => {
    console.log(`   📁 Processing ${file}...`);
    const filePath = path.join(OUTPUT_DIR, file);
    
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
        }
        
        // Index by city
        const city = gen.city || gen.locationCity;
        if (city) {
          const cityKey = city.toUpperCase();
          if (!index.byCity[cityKey]) index.byCity[cityKey] = [];
          if (!index.byCity[cityKey].includes(generatorId)) {
            index.byCity[cityKey].push(generatorId);
          }
        }
      }
      
      console.log(`     ✅ Processed ${rowCount} rows`);
      totalRows += rowCount;
      
    } catch (err) {
      console.error(`     ❌ Error processing ${file}: ${err.message}`);
    }
  });
  
  // Convert Sets to Arrays for JSON serialization
  Object.values(index.generators).forEach(gen => {
    gen.wasteTypes = Array.from(gen.wasteTypes);
  });
  
  // Write state index
  const indexFile = path.join(OUTPUT_DIR, `${state}_index.json`);
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  
  console.log(`   ✅ Created ${state} index:`);
  console.log(`      Generators: ${index.stats.totalGenerators}`);
  console.log(`      Manifests: ${index.stats.totalManifests}`);
  console.log(`      Total Tons: ${index.stats.totalTons.toFixed(2)}`);
  console.log(`      ZIP Codes: ${Object.keys(index.byZip).length}`);
  console.log(`      Index File: ${indexFile}`);
}

// Main function
function main() {
  try {
    console.log('🎯 Target States:', TARGET_STATES.join(', '));
    
    // Check if manifest directory exists
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(`❌ Directory not found: ${MANIFEST_PATH}`);
      process.exit(1);
    }
    
    // Create output directory
    createOutputDir();
    
    // Get all CSV files
    const csvFiles = fs.readdirSync(MANIFEST_PATH).filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.error(`❌ No CSV files found in ${MANIFEST_PATH}`);
      process.exit(1);
    }
    
    console.log(`Found ${csvFiles.length} CSV files to process`);
    
    // Extract data for each target state
    for (const state of TARGET_STATES) {
      console.log(`\n🏛️ Processing State: ${state}`);
      console.log('='.repeat(40));
      
      let totalExtracted = 0;
      
      // Extract from each CSV file
      for (const file of csvFiles) {
        const filePath = path.join(MANIFEST_PATH, file);
        const extracted = extractStateData(filePath, file, state);
        totalExtracted += extracted;
      }
      
      console.log(`\n📊 ${state} Summary: ${totalExtracted} total rows extracted`);
      
      // Create fast index for this state
      if (totalExtracted > 0) {
        createStateIndex(state);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ State Extraction Complete!');
    console.log(`📁 State files created in: ${OUTPUT_DIR}`);
    console.log('📊 Each state now has its own optimized index file');
    console.log('\n🚀 Next Steps:');
    console.log('1. Use state-specific indexes for lightning-fast searches');
    console.log('2. Modify the server to load specific state indexes as needed');
    console.log('3. Scale to additional states or regions as required');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the extractor
if (require.main === module) {
  main();
}

module.exports = { TARGET_STATES, OUTPUT_DIR };