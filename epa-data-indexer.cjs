#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createReadStream } = require('fs');

console.log('🚀 EPA Data Indexer - Converting CSV to Searchable Database');
console.log('='.repeat(60));

const MANIFEST_PATH = 'C:/Users/brady/Documents/EM_MANIFEST';
const OUTPUT_PATH = './epa-data-index.json';
const SQLITE_PATH = './epa-manifest.db';

// Initialize SQLite database
const Database = require('better-sqlite3');
const db = new Database(SQLITE_PATH);

// Create tables
function initializeDatabase() {
  console.log('📊 Initializing database...');
  
  // Drop existing tables
  db.exec(`DROP TABLE IF EXISTS generators`);
  db.exec(`DROP TABLE IF EXISTS manifests`);
  db.exec(`DROP TABLE IF EXISTS waste_streams`);
  
  // Create generators table
  db.exec(`
    CREATE TABLE generators (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      street1 TEXT,
      street2 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      location_street1 TEXT,
      location_street2 TEXT,
      location_city TEXT,
      location_state TEXT,
      location_zip TEXT,
      contact_company TEXT,
      total_manifests INTEGER DEFAULT 0,
      total_tons REAL DEFAULT 0,
      first_shipment DATE,
      last_shipment DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create manifests table
  db.exec(`
    CREATE TABLE manifests (
      tracking_number TEXT PRIMARY KEY,
      generator_id TEXT,
      generator_name TEXT,
      destination_id TEXT,
      destination_name TEXT,
      shipped_date DATE,
      received_date DATE,
      updated_date DATE,
      status TEXT,
      submission_type TEXT,
      origin_type TEXT,
      rejection TEXT,
      residue TEXT,
      total_quantity_kg REAL,
      total_quantity_tons REAL,
      acute_kg REAL,
      acute_tons REAL,
      haz_kg REAL,
      haz_tons REAL,
      non_acute_kg REAL,
      non_acute_tons REAL,
      non_haz_kg REAL,
      non_haz_tons REAL,
      broker_id TEXT,
      FOREIGN KEY (generator_id) REFERENCES generators(id)
    )
  `);
  
  // Create waste streams table
  db.exec(`
    CREATE TABLE waste_streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manifest_tracking_number TEXT,
      generator_id TEXT,
      waste_type TEXT,
      quantity_tons REAL,
      shipped_date DATE,
      FOREIGN KEY (manifest_tracking_number) REFERENCES manifests(tracking_number),
      FOREIGN KEY (generator_id) REFERENCES generators(id)
    )
  `);
  
  // Create indexes for fast searching
  db.exec(`
    CREATE INDEX idx_generators_zip ON generators(zip);
    CREATE INDEX idx_generators_state ON generators(state);
    CREATE INDEX idx_generators_city ON generators(city);
    CREATE INDEX idx_generators_name ON generators(name);
    CREATE INDEX idx_manifests_generator ON manifests(generator_id);
    CREATE INDEX idx_manifests_shipped ON manifests(shipped_date);
    CREATE INDEX idx_manifests_destination ON manifests(destination_id);
    CREATE INDEX idx_waste_streams_generator ON waste_streams(generator_id);
  `);
  
  console.log('✅ Database initialized');
}

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

// Process a single CSV file
async function processCSVFile(filePath, fileName) {
  return new Promise((resolve, reject) => {
    console.log(`\n📁 Processing ${fileName}...`);
    
    const fileStream = createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    let headers = null;
    let rowCount = 0;
    let generatorCount = 0;
    let manifestCount = 0;
    
    // Prepare statements for bulk insert
    const insertGenerator = db.prepare(`
      INSERT OR REPLACE INTO generators (
        id, name, street1, street2, city, state, zip,
        location_street1, location_street2, location_city, location_state, location_zip,
        contact_company, total_manifests, total_tons, first_shipment, last_shipment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateGenerator = db.prepare(`
      UPDATE generators 
      SET total_manifests = total_manifests + 1,
          total_tons = total_tons + ?,
          last_shipment = CASE WHEN ? > last_shipment THEN ? ELSE last_shipment END,
          first_shipment = CASE WHEN ? < first_shipment OR first_shipment IS NULL THEN ? ELSE first_shipment END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const insertManifest = db.prepare(`
      INSERT OR IGNORE INTO manifests (
        tracking_number, generator_id, generator_name, destination_id, destination_name,
        shipped_date, received_date, updated_date, status, submission_type, origin_type,
        rejection, residue, total_quantity_kg, total_quantity_tons,
        acute_kg, acute_tons, haz_kg, haz_tons,
        non_acute_kg, non_acute_tons, non_haz_kg, non_haz_tons, broker_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertWasteStream = db.prepare(`
      INSERT INTO waste_streams (
        manifest_tracking_number, generator_id, waste_type, quantity_tons, shipped_date
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    // Start transaction for performance
    const transaction = db.transaction(() => {
      rl.on('line', (line) => {
        if (!headers) {
          headers = parseCSVLine(line);
          return;
        }
        
        rowCount++;
        if (rowCount > 10000) return; // Limit for performance
        
        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Extract generator info
        const generatorId = row['GENERATOR ID'];
        if (generatorId) {
          try {
            // Check if generator exists
            const existing = db.prepare('SELECT id FROM generators WHERE id = ?').get(generatorId);
            
            if (!existing) {
              insertGenerator.run(
                generatorId,
                row['GENERATOR NAME'],
                row['GENERATOR MAIL STREET1'],
                row['GENERATOR MAIL STREET2'],
                row['GENERATOR MAIL CITY'],
                row['GENERATOR MAIL STATE'],
                row['GENERATOR MAIL ZIP'],
                row['GENERATOR LOCATION STREET1'],
                row['GENERATOR LOCATION STREET2'],
                row['GENERATOR LOCATION CITY'],
                row['GENERATOR LOCATION STATE'],
                row['GENERATOR LOCATION ZIP'],
                row['GENERATOR CONTACT COMPANY NAME'],
                1, // initial manifest count
                parseFloat(row['TOTAL QUANTITY TONS'] || '0'),
                row['SHIPPED DATE'],
                row['SHIPPED DATE']
              );
              generatorCount++;
            } else {
              // Update existing generator
              updateGenerator.run(
                parseFloat(row['TOTAL QUANTITY TONS'] || '0'),
                row['SHIPPED DATE'],
                row['SHIPPED DATE'],
                row['SHIPPED DATE'],
                row['SHIPPED DATE'],
                generatorId
              );
            }
            
            // Insert manifest
            const trackingNumber = row['MANIFEST TRACKING NUMBER'];
            if (trackingNumber) {
              insertManifest.run(
                trackingNumber,
                generatorId,
                row['GENERATOR NAME'],
                row['DES FACILITY ID'],
                row['DES FACILITY NAME'],
                row['SHIPPED DATE'],
                row['RECEIVED DATE'],
                row['UPDATED DATE'],
                row['STATUS'],
                row['SUBMISSION TYPE'],
                row['ORIGIN TYPE'],
                row['REJECTION'],
                row['MANIFEST RESIDUE'],
                parseFloat(row['TOTAL QUANTITY KG'] || '0'),
                parseFloat(row['TOTAL QUANTITY TONS'] || '0'),
                parseFloat(row['TOTAL QUANTITY ACUTE KG'] || '0'),
                parseFloat(row['TOTAL QUANTITY ACUTE TONS'] || '0'),
                parseFloat(row['TOTAL QUANTITY HAZ KG'] || '0'),
                parseFloat(row['TOTAL QUANTITY HAZ TONS'] || '0'),
                parseFloat(row['TOTAL QUANTITY NON ACUTE KG'] || '0'),
                parseFloat(row['TOTAL QUANTITY NON ACUTE TONS'] || '0'),
                parseFloat(row['TOTAL QUANTITY NON HAZ KG'] || '0'),
                parseFloat(row['TOTAL QUANTITY NON HAZ TONS'] || '0'),
                row['BROKER ID']
              );
              manifestCount++;
              
              // Determine waste types and insert
              const wasteTypes = [];
              if (parseFloat(row['TOTAL QUANTITY ACUTE TONS'] || '0') > 0) wasteTypes.push('Acute Hazardous');
              if (parseFloat(row['TOTAL QUANTITY HAZ TONS'] || '0') > 0) wasteTypes.push('Hazardous');
              if (parseFloat(row['TOTAL QUANTITY NON ACUTE TONS'] || '0') > 0) wasteTypes.push('Non-Acute Hazardous');
              if (parseFloat(row['TOTAL QUANTITY NON HAZ TONS'] || '0') > 0) wasteTypes.push('Non-Hazardous');
              
              wasteTypes.forEach(type => {
                insertWasteStream.run(
                  trackingNumber,
                  generatorId,
                  type,
                  parseFloat(row['TOTAL QUANTITY TONS'] || '0'),
                  row['SHIPPED DATE']
                );
              });
            }
          } catch (err) {
            console.error(`Error processing row: ${err.message}`);
          }
        }
        
        if (rowCount % 1000 === 0) {
          console.log(`  Processed ${rowCount} rows...`);
        }
      });
    });
    
    rl.on('close', () => {
      transaction();
      console.log(`  ✅ Processed ${rowCount} rows, ${generatorCount} new generators, ${manifestCount} manifests`);
      resolve({ rowCount, generatorCount, manifestCount });
    });
    
    rl.on('error', reject);
  });
}

// Create JSON index for quick lookups
function createJSONIndex() {
  console.log('\n📝 Creating JSON index...');
  
  const generators = db.prepare(`
    SELECT 
      g.*,
      GROUP_CONCAT(DISTINCT w.waste_type) as waste_types,
      COUNT(DISTINCT m.tracking_number) as manifest_count,
      MAX(m.shipped_date) as last_shipment,
      MIN(m.shipped_date) as first_shipment
    FROM generators g
    LEFT JOIN manifests m ON g.id = m.generator_id
    LEFT JOIN waste_streams w ON g.id = w.generator_id
    GROUP BY g.id
  `).all();
  
  // Create indexes by ZIP, state, city
  const index = {
    byZip: {},
    byState: {},
    byCity: {},
    byName: {},
    generators: {},
    stats: {
      totalGenerators: generators.length,
      totalManifests: db.prepare('SELECT COUNT(*) as count FROM manifests').get().count,
      totalTons: db.prepare('SELECT SUM(total_tons) as total FROM generators').get().total || 0,
      states: db.prepare('SELECT DISTINCT state FROM generators WHERE state IS NOT NULL').all().map(r => r.state),
      lastUpdated: new Date().toISOString()
    }
  };
  
  generators.forEach(gen => {
    // Store full generator data
    index.generators[gen.id] = gen;
    
    // Index by ZIP
    if (gen.zip) {
      if (!index.byZip[gen.zip]) index.byZip[gen.zip] = [];
      index.byZip[gen.zip].push(gen.id);
      
      // Also index by ZIP prefix (first 3 digits)
      const zipPrefix = gen.zip.substring(0, 3);
      if (!index.byZip[zipPrefix]) index.byZip[zipPrefix] = [];
      index.byZip[zipPrefix].push(gen.id);
    }
    
    // Index by state
    if (gen.state) {
      if (!index.byState[gen.state]) index.byState[gen.state] = [];
      index.byState[gen.state].push(gen.id);
    }
    
    // Index by city
    if (gen.city) {
      const cityKey = `${gen.city.toUpperCase()}_${gen.state}`;
      if (!index.byCity[cityKey]) index.byCity[cityKey] = [];
      index.byCity[cityKey].push(gen.id);
    }
    
    // Index by name (first word)
    if (gen.name) {
      const firstWord = gen.name.split(' ')[0].toUpperCase();
      if (!index.byName[firstWord]) index.byName[firstWord] = [];
      index.byName[firstWord].push(gen.id);
    }
  });
  
  // Write to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
  console.log(`✅ JSON index created: ${OUTPUT_PATH}`);
  console.log(`   Total generators: ${index.stats.totalGenerators}`);
  console.log(`   Total manifests: ${index.stats.totalManifests}`);
  console.log(`   Total tonnage: ${index.stats.totalTons.toFixed(2)} tons`);
}

// Main processing function
async function main() {
  try {
    // Check if manifest directory exists
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(`❌ Directory not found: ${MANIFEST_PATH}`);
      console.log('Please ensure EPA manifest CSV files are in this directory.');
      process.exit(1);
    }
    
    // Get all CSV files
    const csvFiles = fs.readdirSync(MANIFEST_PATH).filter(f => f.endsWith('.csv'));
    
    if (csvFiles.length === 0) {
      console.error(`❌ No CSV files found in ${MANIFEST_PATH}`);
      process.exit(1);
    }
    
    console.log(`Found ${csvFiles.length} CSV files to process`);
    
    // Initialize database
    initializeDatabase();
    
    // Process each CSV file
    let totalRows = 0;
    let totalGenerators = 0;
    let totalManifests = 0;
    
    for (const file of csvFiles) {
      const filePath = path.join(MANIFEST_PATH, file);
      const stats = await processCSVFile(filePath, file);
      totalRows += stats.rowCount;
      totalGenerators += stats.generatorCount;
      totalManifests += stats.manifestCount;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Complete!');
    console.log(`   Total rows processed: ${totalRows}`);
    console.log(`   Total generators: ${totalGenerators}`);
    console.log(`   Total manifests: ${totalManifests}`);
    
    // Create JSON index
    createJSONIndex();
    
    // Show sample queries
    console.log('\n📍 Sample Database Queries:');
    
    const texasGenerators = db.prepare('SELECT COUNT(*) as count FROM generators WHERE state = ?').get('TX');
    console.log(`   Generators in Texas: ${texasGenerators.count}`);
    
    const largeGenerators = db.prepare('SELECT COUNT(*) as count FROM generators WHERE total_tons > ?').get(100);
    console.log(`   Large generators (>100 tons): ${largeGenerators.count}`);
    
    const recentManifests = db.prepare('SELECT COUNT(*) as count FROM manifests WHERE shipped_date > ?').get('2024-01-01');
    console.log(`   Manifests shipped after 2024: ${recentManifests.count}`);
    
    console.log('\n✅ Database ready at:', SQLITE_PATH);
    console.log('✅ JSON index ready at:', OUTPUT_PATH);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the indexer
if (require.main === module) {
  main();
}

module.exports = { db, SQLITE_PATH, OUTPUT_PATH };