// Script to fix sodium hypochlorite entries in the comprehensive chemical database
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the database file
const dbPath = path.join(__dirname, 'data', 'comprehensive_chemical_database.js');
let dbContent = fs.readFileSync(dbPath, 'utf8');

// Count existing entries
const casNumber = '7681-52-9';
const regex = new RegExp(`'${casNumber}':[^}]+}`, 'g');
const matches = dbContent.match(regex);

console.log(`Found ${matches ? matches.length : 0} entries for CAS ${casNumber}`);

// Remove all existing entries for sodium hypochlorite
dbContent = dbContent.replace(regex, '/* REMOVED DUPLICATE */');

// Define the correct entry for sodium hypochlorite
const correctEntry = `  '7681-52-9': { // Sodium Hypochlorite (Bleach)
    name: 'Sodium hypochlorite solution',
    flashPoint: null, // Not flammable - it's an oxidizer
    pH: 11.5, // Typical pH 11-13, varies with concentration
    boilingPoint: 101,
    physicalState: 'liquid',
    ignitable: false, // NOT flammable - it's an oxidizer
    corrosive: false, // pH < 12.5 so not D002 unless concentrated
    oxidizer: true, // Important: This is an oxidizing agent
    unNumber: 'UN1791',
    properShippingName: 'Hypochlorite solution',
    hazardClass: '8', // Primary hazard: corrosive
    subsidiaryHazard: '5.1' // Secondary hazard: oxidizer
  }`;

// Find a good place to insert the consolidated entry (after the first chemical)
const insertPosition = dbContent.indexOf('},') + 2;
dbContent = dbContent.slice(0, insertPosition) + ',\n' + correctEntry + dbContent.slice(insertPosition);

// Clean up the removed duplicate markers
dbContent = dbContent.replace(/,\s*\/\* REMOVED DUPLICATE \*\//g, '');
dbContent = dbContent.replace(/\/\* REMOVED DUPLICATE \*\//g, '');

// Clean up any double commas or formatting issues
dbContent = dbContent.replace(/,\s*,/g, ',');
dbContent = dbContent.replace(/,(\s*})/g, '$1');

// Write the fixed database back
fs.writeFileSync(dbPath, dbContent);

console.log('✅ Fixed sodium hypochlorite entry:');
console.log('- Removed duplicate entries');
console.log('- Set flashPoint: null (not flammable)');
console.log('- Set pH: 11.5 (typical value, not D002)');
console.log('- Set ignitable: false');
console.log('- Added oxidizer: true flag');
console.log('- Set hazardClass: 8 with subsidiary 5.1 (oxidizer)');