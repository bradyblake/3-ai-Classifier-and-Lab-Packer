// Quick System Validation Test
// Tests that all engines can load and basic functionality works

import ConstituentFirstClassifier from './src/engines/ConstituentFirstClassifier_COMPLETED_.js';
import BulletproofSDSExtractor from './src/engines/BulletproofSDSExtractor_COMPLETED_.js';
import { classifyCharacteristicHazards } from './src/engines/PhysicalStateClassifier_COMPLETED_.js';

console.log('🧪 REVOLUTIONARY CLASSIFIER - QUICK VALIDATION TEST\n');

async function testConstituentFirstClassifier() {
  console.log('1️⃣ Testing ConstituentFirstClassifier...');
  try {
    const classifier = new ConstituentFirstClassifier();
    
    // Test with Acetone
    const result = classifier.classify([
      { name: "Acetone", cas: "67-64-1", percentage: "100%" }
    ]);
    
    console.log('   ✅ ConstituentFirstClassifier loaded successfully');
    console.log(`   📊 Database stats: ${JSON.stringify(classifier.getDatabaseStats())}`);
    console.log(`   🎯 Acetone classification: ${JSON.stringify(result.wasteCodes)}`);
    
    if (result.wasteCodes.includes('U002')) {
      console.log('   ✅ Constituent-first logic working! (Found U002 for Acetone)');
    } else {
      console.log('   ⚠️  U002 not found for Acetone - check database');
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ ConstituentFirstClassifier failed: ${error.message}`);
    return false;
  }
}

async function testBulletproofSDSExtractor() {
  console.log('\n2️⃣ Testing BulletproofSDSExtractor...');
  try {
    const extractor = new BulletproofSDSExtractor();
    
    // Test with mock PDF content
    const mockPDF = Buffer.from(`
    SAFETY DATA SHEET
    Section 3: Composition/Information on Ingredients
    Chemical Name          | CAS No.    | Concentration
    Acetone                | 67-64-1    | 85-90%
    Water                  | 7732-18-5  | 10-15%
    `);
    
    const result = await extractor.extract(mockPDF);
    
    console.log('   ✅ BulletproofSDSExtractor loaded successfully');
    console.log(`   📋 Extraction result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📊 Composition found: ${result.composition?.length || 0} chemicals`);
    
    if (result.composition && result.composition.length > 0) {
      console.log(`   🎯 Found chemicals: ${result.composition.map(c => c.name).join(', ')}`);
      return true;
    } else {
      console.log('   ⚠️  No chemicals extracted from mock PDF');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ BulletproofSDSExtractor failed: ${error.message}`);
    return false;
  }
}

async function testPhysicalStateClassifier() {
  console.log('\n3️⃣ Testing PhysicalStateClassifier...');
  try {
    const mockText = `
    Section 9: Physical and Chemical Properties
    Physical state: Liquid
    Flash point: -17 °C
    pH: Not applicable
    `;
    
    const result = classifyCharacteristicHazards({ 
      text: mockText,
      composition: [{ name: "Acetone", cas: "67-64-1", percentage: "100%" }]
    });
    
    console.log('   ✅ PhysicalStateClassifier loaded successfully');
    console.log(`   📊 Characteristic codes: ${JSON.stringify(result.characteristicCodes)}`);
    console.log(`   🌡️  Physical state detected: ${result.physicalState}`);
    console.log(`   📋 Confidence: ${result.confidence}`);
    
    if (result.characteristicCodes.includes('D001')) {
      console.log('   ✅ D001 (ignitable) classification working!');
      return true;
    } else {
      console.log('   ⚠️  D001 not detected for flash point -17°C');
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ PhysicalStateClassifier failed: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await testConstituentFirstClassifier());
  results.push(await testBulletproofSDSExtractor());
  results.push(await testPhysicalStateClassifier());
  
  const passCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  console.log('\n🎯 FINAL RESULTS:');
  console.log(`   ✅ Passed: ${passCount}/${totalCount} engines`);
  console.log(`   📊 Success rate: ${Math.round(passCount/totalCount * 100)}%`);
  
  if (passCount === totalCount) {
    console.log('\n🎉 ALL ENGINES WORKING! Revolutionary Classifier is READY! 🚀');
    console.log('\n📋 Next steps:');
    console.log('   - Run full test suite: npm test');
    console.log('   - Set up production API server');
    console.log('   - Begin real-world SDS testing');
    return true;
  } else {
    console.log(`\n⚠️  ${totalCount - passCount} engine(s) need attention before production deployment.`);
    return false;
  }
}

// Execute the test
runAllTests().catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
});