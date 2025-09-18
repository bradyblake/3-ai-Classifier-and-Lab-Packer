#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🏛️ TCEQ Data Scraper - Competitor Intelligence Module');
console.log('='.repeat(60));

// TCEQ Central Registry API endpoints
const TCEQ_BASE_URL = 'www15.tceq.texas.gov';
const TCEQ_SEARCH_PATH = '/crpub/index.cfm';

// Search parameters for different queries
const SEARCH_CONFIGS = {
  // Search for waste transporters by area - Fixed based on actual form
  transportersByZip: {
    '_fuseaction': 'regent.validateRE',
    'pgm_area': 'IHW',
    'addn_id_txt': '',
    'entity_nm_txt': '',
    'cnty_name': 'DENTON', // Default county for testing
    'addn_id_status_cd': 'ACTIVE'
  },
  
  // Get detailed registration documents for a specific RN number
  getRegistrationDetails: {
    '_fuseaction': 'regent.validateRE',
    'addn_id_txt': '', // Will be populated with RN number
    'addn_id_status_cd': 'ALL'
  },
  
  // Search for specific customer's service providers - Fixed based on form
  customerTransporters: {
    '_fuseaction': 'cust.validateCust',
    'pr_ref_num_txt': '', // CN number field
    'pr_name_txt': '', // Will be populated with customer name
    'searchButton': 'Search'
  },
  
  // Direct RN lookup for registration details
  directRNLookup: {
    '_fuseaction': 'regent.viewRE',
    'rn': '', // Will be populated with RN number
    'viewRpts': '1',
    'viewDocs': '1'
  }
};

// Function to make HTTPS request to TCEQ
function searchTCEQ(searchType, params) {
  return new Promise((resolve, reject) => {
    const searchConfig = { ...SEARCH_CONFIGS[searchType], ...params };
    const postData = new URLSearchParams(searchConfig).toString();
    
    const options = {
      hostname: TCEQ_BASE_URL,
      path: TCEQ_SEARCH_PATH,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log(`🔍 Searching TCEQ: ${searchType}`);
    console.log(`   URL: https://${options.hostname}${options.path}`);
    console.log(`   POST data: ${postData}`);
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   📄 Received ${data.length} chars, status: ${res.statusCode}`);
        // Save HTML to file for debugging
        if (data.length > 1000) {
          fs.writeFileSync('./tceq_debug_response.html', data);
          console.log('   💾 Saved HTML response to tceq_debug_response.html');
        }
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    // Write POST data
    req.write(postData);
    req.end();
  });
}

// Parse TCEQ HTML response to extract transporter data
function parseTCEQResponse(html) {
  const transporters = [];
  
  // Extract table data using regex (since we can't use DOM parser in Node)
  // TCEQ returns results in HTML tables
  const tableRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
  
  const rows = html.match(tableRegex) || [];
  
  rows.forEach(row => {
    const cells = [];
    let cell;
    
    while ((cell = cellRegex.exec(row)) !== null) {
      // Clean HTML tags and whitespace
      const cellContent = cell[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(cellContent);
    }
    
    // TCEQ table structure (approximate):
    // [0] = RN Number, [1] = Name, [2] = Location, [3] = County, [4] = Programs
    if (cells.length >= 5 && cells[0].match(/RN\d+/)) {
      transporters.push({
        rnNumber: cells[0],
        companyName: cells[1],
        location: cells[2],
        county: cells[3],
        programs: cells[4],
        type: detectTransporterType(cells[4])
      });
    }
  });
  
  return transporters;
}

// Detect what type of transporter based on program codes
function detectTransporterType(programs) {
  if (programs.includes('IHW')) return 'Industrial & Hazardous Waste';
  if (programs.includes('MW')) return 'Medical Waste';
  if (programs.includes('SLUDGE')) return 'Sludge Transporter';
  if (programs.includes('UST')) return 'Underground Storage Tank';
  return 'General Waste';
}

// Search for competitors in a specific ZIP code
async function findCompetitorsByZip(zipCode) {
  console.log(`\n🎯 Finding competitors in ZIP: ${zipCode}`);
  
  try {
    const html = await searchTCEQ('transportersByZip', { cnty_name: 'DENTON' });
    const transporters = parseTCEQResponse(html);
    
    console.log(`   ✅ Found ${transporters.length} transporters`);
    
    return transporters;
  } catch (error) {
    console.error(`   ❌ Error searching ZIP ${zipCode}:`, error.message);
    return [];
  }
}

// Search for transporters serving a specific customer
async function findCustomerTransporters(customerName) {
  console.log(`\n🏢 Finding transporters for customer: ${customerName}`);
  
  try {
    const html = await searchTCEQ('customerTransporters', { cn_name: customerName });
    const transporters = parseTCEQResponse(html);
    
    console.log(`   ✅ Found ${transporters.length} service providers`);
    
    return transporters;
  } catch (error) {
    console.error(`   ❌ Error searching customer:`, error.message);
    return [];
  }
}

// Get detailed registration information and documents for a specific RN number
async function getGeneratorRegistrationDetails(rnNumber) {
  console.log(`\n📋 Getting registration details for RN: ${rnNumber}`);
  
  try {
    // First try direct RN lookup
    console.log(`   🔍 Trying direct RN lookup: ${rnNumber}`);
    let html = await searchTCEQ('directRNLookup', { rn: rnNumber });
    
    // If direct lookup fails, try search approach
    if (html.includes('Customer Search') || html.includes('validateRE')) {
      console.log(`   🔄 Direct lookup failed, trying search approach...`);
      html = await searchTCEQ('getRegistrationDetails', { addn_id_txt: rnNumber });
    }
    
    // Parse the registration page to extract document links and data
    const registrationData = parseRegistrationDetails(html);
    
    // Save the HTML response for debugging
    fs.writeFileSync(`./tceq_registration_${rnNumber}.html`, html);
    console.log(`   💾 Saved registration HTML to tceq_registration_${rnNumber}.html`);
    
    console.log(`   ✅ Found ${registrationData.downloadLinks?.length || 0} download links`);
    console.log(`   📊 Found ${registrationData.wasteData?.length || 0} waste codes`);
    console.log(`   🚛 Found ${registrationData.transporters?.length || 0} transporters`);
    
    return registrationData;
  } catch (error) {
    console.error(`   ❌ Error getting registration details:`, error.message);
    return { 
      documents: [], 
      wasteData: [], 
      transporters: [], 
      downloadLinks: [],
      error: error.message 
    };
  }
}

// Parse registration details page to extract solid waste documents and data
function parseRegistrationDetails(html) {
  const registrationData = {
    documents: [],
    wasteData: [],
    transporters: [],
    downloadLinks: []
  };
  
  // Extract any document links (PDFs, reports, registrations)
  const allLinkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gis;
  let linkMatch;
  
  while ((linkMatch = allLinkRegex.exec(html)) !== null) {
    const link = linkMatch[1];
    const linkText = linkMatch[2].trim();
    
    // Look for PDF files or registration documents
    if (link.includes('.pdf') || link.includes('document') || link.includes('report') || 
        linkText.toLowerCase().includes('registration') || linkText.toLowerCase().includes('solid waste') ||
        linkText.toLowerCase().includes('report') || linkText.toLowerCase().includes('document')) {
      registrationData.downloadLinks.push({
        type: linkText.includes('Registration') ? 'Solid Waste Registration' : 'TCEQ Document',
        url: link.startsWith('http') ? link : `https://${TCEQ_BASE_URL}${link}`,
        description: linkText,
        linkText: linkText
      });
    }
  }
  
  // Extract Texas waste codes - broader pattern matching
  const wasteCodePatterns = [
    /<td[^>]*>([A-Z]\d{3})<\/td>/gi,  // Standard format
    /([A-Z]\d{3})/g,                  // Anywhere in text
    /waste\s+code[^>]*>([A-Z]\d{3})/gi // After "waste code"
  ];
  
  wasteCodePatterns.forEach(pattern => {
    const matches = html.match(pattern) || [];
    matches.forEach(match => {
      const code = match.replace(/<[^>]*>/g, '').replace(/waste\s+code[:\s]*/gi, '').trim();
      if (code.match(/^[A-Z]\d{3}$/)) {
        // Avoid duplicates
        if (!registrationData.wasteData.some(w => w.wasteCode === code)) {
          registrationData.wasteData.push({
            wasteCode: code,
            type: 'Texas State Waste Code'
          });
        }
      }
    });
  });
  
  // Extract RN numbers (Registration Numbers) from various contexts
  const rnPatterns = [
    /<td[^>]*>(RN\d+)<\/td>/gi,        // In table cells
    /Registration\s+Number[^>]*>(RN\d+)/gi, // After "Registration Number"
    /(RN\d{9})/g                       // Any RN followed by 9 digits
  ];
  
  rnPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const rnNumber = match[1];
      if (rnNumber && rnNumber.match(/^RN\d+$/)) {
        // Try to find associated company name
        const contextRegex = new RegExp(`(RN${rnNumber.substring(2)})[^<]*<[^>]*>([^<]+)`, 'i');
        const contextMatch = html.match(contextRegex);
        
        registrationData.transporters.push({
          rnNumber: rnNumber,
          name: contextMatch ? contextMatch[2].trim() : 'Unknown Company'
        });
      }
    }
  });
  
  // Remove duplicate transporters
  registrationData.transporters = registrationData.transporters.filter((t, index, arr) => 
    arr.findIndex(x => x.rnNumber === t.rnNumber) === index
  );
  
  // If we found a search form instead of results, note it
  if (html.includes('Customer Search') || html.includes('Central Registry Query')) {
    registrationData.searchForm = true;
    registrationData.message = 'Received search form instead of registration details';
  }
  
  return registrationData;
}

// Create integrated database combining EPA and TCEQ data
async function buildCompetitorIntelligence(zipCode) {
  console.log('\n📊 Building Competitor Intelligence Database...');
  
  const intelligence = {
    zipCode: zipCode,
    timestamp: new Date().toISOString(),
    epaGenerators: [],
    tceqTransporters: [],
    competitorAnalysis: {},
    marketShare: {}
  };
  
  // Load EPA data
  const epaIndexPath = './TX_search_index.json';
  if (fs.existsSync(epaIndexPath)) {
    console.log('   📁 Loading EPA generator data...');
    const epaData = JSON.parse(fs.readFileSync(epaIndexPath, 'utf8'));
    
    if (epaData.byZip && epaData.byZip[zipCode]) {
      intelligence.epaGenerators = epaData.byZip[zipCode].map(id => ({
        id: id,
        ...epaData.generators[id]
      }));
      console.log(`   ✅ Loaded ${intelligence.epaGenerators.length} EPA generators`);
    }
  }
  
  // Get TCEQ transporter data
  console.log('   🔍 Fetching TCEQ transporter data...');
  intelligence.tceqTransporters = await findCompetitorsByZip(zipCode);
  
  // Analyze market share
  const transporterCounts = {};
  intelligence.tceqTransporters.forEach(transporter => {
    transporterCounts[transporter.companyName] = 
      (transporterCounts[transporter.companyName] || 0) + 1;
  });
  
  intelligence.marketShare = Object.entries(transporterCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      company: name,
      manifests: count,
      percentage: ((count / intelligence.tceqTransporters.length) * 100).toFixed(1)
    }));
  
  // Save integrated database
  const outputPath = `./competitor_intelligence_${zipCode}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(intelligence, null, 2));
  
  console.log('\n✅ Competitor Intelligence Database Created!');
  console.log(`   📊 EPA Generators: ${intelligence.epaGenerators.length}`);
  console.log(`   🚛 TCEQ Transporters: ${intelligence.tceqTransporters.length}`);
  console.log(`   💾 Saved to: ${outputPath}`);
  
  // Show top competitors
  if (intelligence.marketShare.length > 0) {
    console.log('\n🏆 Top Competitors in Area:');
    intelligence.marketShare.slice(0, 5).forEach((competitor, i) => {
      console.log(`   ${i + 1}. ${competitor.company} (${competitor.percentage}% market share)`);
    });
  }
  
  return intelligence;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('\nUsage:');
    console.log('  node tceq-scraper.cjs <zipCode>     - Find competitors by ZIP');
    console.log('  node tceq-scraper.cjs -c <customer> - Find customer\'s transporters');
    console.log('\nExample:');
    console.log('  node tceq-scraper.cjs 75065');
    console.log('  node tceq-scraper.cjs -c "WALMART"');
    return;
  }
  
  if (args[0] === '-c') {
    // Search by customer name
    const customerName = args.slice(1).join(' ');
    await findCustomerTransporters(customerName);
  } else {
    // Search by ZIP code and build full intelligence
    const zipCode = args[0];
    await buildCompetitorIntelligence(zipCode);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  searchTCEQ,
  findCompetitorsByZip,
  findCustomerTransporters,
  buildCompetitorIntelligence,
  getGeneratorRegistrationDetails
};