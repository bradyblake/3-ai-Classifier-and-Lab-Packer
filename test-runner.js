/**
 * Simple Test Runner for ConstituentFirstClassifier
 * Run with: node test-runner.js
 */

import ConstituentFirstClassifier from './src/engines/ConstituentFirstClassifier.js';

console.log('🚀 Testing ConstituentFirstClassifier...\n');

// Create classifier instance
const classifier = new ConstituentFirstClassifier();

// Test 1: Basic acetone classification
console.log('Test 1: Acetone Classification');
const result1 = classifier.classify([
  { name: "Acetone", cas: "67-64-1", percentage: "100%" }
]);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('✅ Acetone test completed\n');

// Test 2: Multiple chemicals
console.log('Test 2: Multiple Chemicals');
const result2 = classifier.classify([
  { name: "Acetone", cas: "67-64-1", percentage: "85%" },
  { name: "Methanol", cas: "67-56-1", percentage: "15%" }
]);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('✅ Multiple chemicals test completed\n');

// Test 3: Unknown chemical
console.log('Test 3: Unknown Chemical');
const result3 = classifier.classify([
  { name: "Unknown Chemical", cas: "000-00-0", percentage: "50%" }
]);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('✅ Unknown chemical test completed\n');

// Test 4: Performance test
console.log('Test 4: Performance Test');
const startTime = performance.now();
for (let i = 0; i < 100; i++) {
  classifier.classify([
    { name: "Acetone", cas: "67-64-1", percentage: "100%" },
    { name: "Methanol", cas: "67-56-1", percentage: "50%" }
  ]);
}
const endTime = performance.now();
const avgTime = (endTime - startTime) / 100;

console.log(`Average classification time: ${avgTime.toFixed(2)}ms`);
console.log('✅ Performance test completed\n');

// Test 5: Database stats
console.log('Test 5: Database Statistics');
const stats = classifier.getDatabaseStats();
console.log('Database Stats:', stats);
console.log('✅ Database stats test completed\n');

// Test 6: Performance stats
console.log('Test 6: Performance Statistics');
const perfStats = classifier.getPerformanceStats();
console.log('Performance Stats:', perfStats);
console.log('✅ Performance stats test completed\n');

console.log('🎉 All tests completed successfully!');
console.log('\n📊 Summary:');
console.log(`- P-codes loaded: ${stats.pCodes}`);
console.log(`- U-codes loaded: ${stats.uCodes}`);
console.log(`- D-codes loaded: ${stats.dCodes}`);
console.log(`- Total chemicals: ${stats.totalChemicals}`);
console.log(`- Average classification time: ${perfStats.averageClassificationTime.toFixed(2)}ms`);
