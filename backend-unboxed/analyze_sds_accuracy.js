// Analyze SDS Classification Accuracy
// Compare actual SDS content with classification results

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const sdsDirectory = '../src/shared/data/regulatory/SDS Classification Runs/SDS/';

// Classification results from the report
const classificationResults = {
  'sodium hypochlorite.pdf': {
    result: {
      rcra: 'None',
      texasClass: 'Class 1',
      texasForm: '102',
      ph: 'Not Determined',
      flashPoint: 'Not Determined'
    },
    issues: ['pH should be determined - hypochlorite solutions are typically pH 11-13']
  },
  
  'SDSDetailPage.pdf': { // Ultra-Duty HD Oil
    result: {
      rcra: 'None',
      texasClass: 'Class 1', 
      texasForm: '601',
      flashPoint: '204 °C (399 °F)'
    },
    issues: ['Classification appears correct for non-hazardous oil']
  },
  
  'SDS_Diesel_Fuel_Final.pdf': {
    result: {
      rcra: 'D001',
      texasClass: 'Hazardous (H)',
      texasForm: '202',
      flashPoint: '> 125.6 ˚F (52 ˚C)'
    },
    issues: ['Classification appears correct for petroleum product']
  },
  
  'Paint-thinner-kleanstrip.pdf': {
    result: {
      rcra: 'D001',
      texasClass: 'Hazardous (H)', 
      texasForm: '202',
      flashPoint: '>= 101.00 F',
      dotUN: 'Non-regulated'
    },
    issues: ['UN number missing - paint thinner typically UN1300 or similar']
  },
  
  'Caustic Soda Beads SDS 3-10-23.pdf': {
    result: {
      rcra: 'None',
      texasClass: 'Class 3',
      texasForm: '305',
      ph: '>= 13',
      dotUN: 'UN1823'
    },
    issues: ['MAJOR ERROR: pH >= 13 = D002 Corrosive! Should be RCRA D002, not "None"']
  },
  
  'Acetone.pdf': {
    result: {
      rcra: 'D001',
      texasClass: 'Hazardous (H)',
      texasForm: '203', 
      flashPoint: '-17.0 °C (1.4 °F)',
      ph: '5 - 6'
    },
    issues: ['Classification appears correct for organic solvent']
  }
};

async function analyzeSDS(filename) {
  console.log(`\n🔍 ANALYZING: ${filename}`);
  
  const filePath = path.join(sdsDirectory, filename);
  
  try {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;
    
    console.log(`📄 Text Length: ${text.length} characters`);
    
    // Extract key data points
    const analysis = {
      productName: extractProductName(text),
      ph: extractPH(text),
      flashPoint: extractFlashPoint(text),
      physicalState: extractPhysicalState(text),
      composition: extractComposition(text),
      hazardStatements: extractHazardStatements(text),
      unNumber: extractUNNumber(text)
    };
    
    console.log('📊 EXTRACTED DATA:');
    Object.entries(analysis).forEach(([key, value]) => {
      if (value) {
        console.log(`   ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      }
    });
    
    // Check classification logic
    console.log('\n🎯 CLASSIFICATION ANALYSIS:');
    checkClassificationLogic(analysis, classificationResults[filename]);
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ Error analyzing ${filename}: ${error.message}`);
    return null;
  }
}

function extractProductName(text) {
  const patterns = [
    /Product\s*(?:Name|Identifier)[\s:]+([^\n\r]{3,80}?)(?:\n|\r|$)/i,
    /Trade\s*Name[\s:]+([^\n\r]{3,80}?)(?:\n|\r|$)/i,
    /Material[\s:]+([^\n\r]{3,80}?)(?:\n|\r|$)/i,
    /Chemical[\s:]+([^\n\r]{3,80}?)(?:\n|\r|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function extractPH(text) {
  const patterns = [
    /pH[\s:]+([^\n\r]{1,30}?)(?:\s+at|$|\n|\r)/i,
    /\bpH\b[^a-z]*([0-9.><=\s-]+)/i,
    /acidity.*pH[\s:]*([0-9.><=\s-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (!/not\s*applicable|n\/a|not\s*available/i.test(value)) {
        return value;
      }
    }
  }
  
  return null;
}

function extractFlashPoint(text) {
  const patterns = [
    /Flash\s*Point[\s:]+([^\n\r]{1,50}?)(?:\s+(?:Boiling|Physical)|$|\n|\r)/i,
    /Flashpoint[\s:]+([^\n\r]{1,50}?)(?:\s+(?:Boiling|Physical)|$|\n|\r)/i,
    /F\.?P\.?[\s:]+([^\n\r]{1,50}?)(?:\s|$|\n|\r)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (!/not\s*applicable|n\/a|not\s*available|not\s*determined/i.test(value)) {
        return value;
      }
    }
  }
  
  return null;
}

function extractPhysicalState(text) {
  const patterns = [
    /Physical\s*State[\s:]+(\w+)/i,
    /Form[\s:]+(\w+)/i,
    /Appearance[\s:]+([^\n\r,]{1,20}?)(?:,|\n|\r|$)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  return null;
}

function extractComposition(text) {
  const components = [];
  
  // Pattern for component with CAS and percentage
  const pattern = /([A-Za-z][^\n\(]{2,60}?)\s*\(CAS[^\)]*(\d{2,7}-\d{2}-\d)\)[^\n]*?(\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?)\s*%/g;
  
  let match;
  while ((match = pattern.exec(text)) !== null) {
    components.push(`${match[1].trim()} (${match[2]}): ${match[3]}%`);
  }
  
  return components.length > 0 ? components : null;
}

function extractHazardStatements(text) {
  const hCodes = text.match(/H\d{3}[a-zA-Z]?/g) || [];
  return hCodes.length > 0 ? [...new Set(hCodes)] : null;
}

function extractUNNumber(text) {
  const patterns = [
    /UN\s*(\d{4})/i,
    /United\s*Nations[\s:]+(\d{4})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return `UN${match[1]}`;
  }
  
  return null;
}

function checkClassificationLogic(extracted, classification) {
  if (!classification) return;
  
  console.log('🔍 CLASSIFICATION CHECKS:');
  
  // Check pH vs RCRA D002
  if (extracted.ph) {
    const pHValue = parseFloat(extracted.ph.replace(/[>=<\s]/g, ''));
    if (!isNaN(pHValue)) {
      console.log(`   pH: ${extracted.ph} (numeric: ${pHValue})`);
      
      if (pHValue <= 2 || pHValue >= 12.5) {
        console.log('   ✅ pH indicates RCRA D002 (Corrosive)');
        if (classification.result.rcra === 'None') {
          console.log('   🚨 ERROR: Should be D002, not "None"');
        }
      } else {
        console.log('   ✅ pH does not indicate corrosivity');
      }
    }
  }
  
  // Check Flash Point vs RCRA D001
  if (extracted.flashPoint) {
    console.log(`   Flash Point: ${extracted.flashPoint}`);
    
    const fpMatch = extracted.flashPoint.match(/([<>≤≥]?\s*-?\d+(?:\.\d+)?)\s*°?\s*([CF])/i);
    if (fpMatch) {
      const temp = parseFloat(fpMatch[1].replace(/[<>=≤≥\s]/g, ''));
      const unit = fpMatch[2].toUpperCase();
      const celsius = unit === 'C' ? temp : (temp - 32) * 5/9;
      
      console.log(`   Flash Point: ${celsius.toFixed(1)}°C`);
      
      if (celsius < 60) {
        console.log('   ✅ Flash Point indicates RCRA D001 (Ignitable)');
        if (!classification.result.rcra.includes('D001')) {
          console.log('   🚨 ERROR: Should include D001');
        }
      } else {
        console.log('   ✅ Flash Point does not indicate ignitability');
      }
    }
  }
  
  // Display known issues
  if (classification.issues) {
    console.log('⚠️  IDENTIFIED ISSUES:');
    classification.issues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
}

async function runAnalysis() {
  console.log('🔬 SDS CLASSIFICATION ACCURACY ANALYSIS');
  console.log('=====================================\n');
  
  const files = Object.keys(classificationResults);
  
  for (const file of files) {
    await analyzeSDS(file);
    console.log('\n' + '='.repeat(60));
  }
  
  console.log('\n📋 SUMMARY OF FINDINGS:');
  console.log('1. 🚨 CRITICAL: Caustic Soda Beads (pH ≥13) should be D002 Corrosive');
  console.log('2. ⚠️  Sodium Hypochlorite pH not being determined properly');
  console.log('3. ⚠️  Paint Thinner missing proper UN number classification');
  console.log('4. ✅ Acetone, Diesel, and Oil classifications appear correct');
  
  console.log('\n🎯 REQUIRED FIXES:');
  console.log('1. Fix pH parsing to handle ranges like "≥13"');
  console.log('2. Implement proper RCRA D002 logic: pH ≤2 OR pH ≥12.5 = Corrosive');
  console.log('3. Improve UN number extraction and validation');
  console.log('4. Add pH determination fallbacks for common chemicals');
}

runAnalysis().catch(console.error);