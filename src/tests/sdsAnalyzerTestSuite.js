import EnhancedSDSAnalyzer from '../services/enhancedSDSAnalyzer.js';

class SDSAnalyzerTestSuite {
  constructor() {
    this.analyzer = new EnhancedSDSAnalyzer();
    this.testCases = this.generateTestCases();
    this.results = [];
  }

  generateTestCases() {
    return [
      {
        name: 'Acetone - Simple Ignitable',
        data: {
          productName: 'Pure Acetone',
          composition: [
            { name: 'Acetone', cas: '67-64-1', percentage: '100' }
          ],
          flashPoint: '-20',
          physicalState: 'liquid'
        },
        expectedCodes: ['D001'],
        expectedClass: 'Ignitable'
      },
      {
        name: 'Sulfuric Acid - Corrosive',
        data: {
          productName: 'Sulfuric Acid Solution',
          composition: [
            { name: 'Sulfuric Acid', cas: '7664-93-9', percentage: '50' },
            { name: 'Water', cas: '7732-18-5', percentage: '50' }
          ],
          pH: '1.0',
          physicalState: 'liquid'
        },
        expectedCodes: ['D002'],
        expectedClass: 'Corrosive'
      },
      {
        name: 'Mercury Compound - P-Listed',
        data: {
          productName: 'Mercury(II) Chloride',
          composition: [
            { name: 'Mercury(II) Chloride', cas: '7487-94-7', percentage: '100' }
          ],
          physicalState: 'solid'
        },
        expectedCodes: ['P065', 'D009'],
        expectedClass: 'Acutely Hazardous'
      },
      {
        name: 'Benzene - U-Listed',
        data: {
          productName: 'Benzene',
          composition: [
            { name: 'Benzene', cas: '71-43-2', percentage: '100' }
          ],
          flashPoint: '-11',
          physicalState: 'liquid'
        },
        expectedCodes: ['U019', 'D001', 'D018'],
        expectedClass: 'Toxic'
      },
      {
        name: 'Lead Paint Waste',
        data: {
          productName: 'Lead-Based Paint Chips',
          composition: [
            { name: 'Lead Chromate', cas: '7758-97-6', percentage: '15' },
            { name: 'Paint Matrix', cas: 'mixture', percentage: '85' }
          ],
          physicalState: 'solid'
        },
        expectedCodes: ['D007', 'D008'],
        expectedClass: 'Toxic'
      },
      {
        name: 'Mixed Solvent Waste',
        data: {
          productName: 'Laboratory Solvent Waste',
          composition: [
            { name: 'Methanol', cas: '67-56-1', percentage: '30' },
            { name: 'Toluene', cas: '108-88-3', percentage: '25' },
            { name: 'Xylene', cas: '1330-20-7', percentage: '25' },
            { name: 'Acetone', cas: '67-64-1', percentage: '20' }
          ],
          flashPoint: '10',
          physicalState: 'liquid'
        },
        expectedCodes: ['D001', 'U154', 'U220', 'U239'],
        expectedClass: 'Ignitable'
      },
      {
        name: 'Chromic Acid Solution',
        data: {
          productName: 'Chromic Acid Cleaning Solution',
          composition: [
            { name: 'Chromium Trioxide', cas: '1333-82-0', percentage: '5' },
            { name: 'Sulfuric Acid', cas: '7664-93-9', percentage: '40' },
            { name: 'Water', cas: '7732-18-5', percentage: '55' }
          ],
          pH: '0.5',
          physicalState: 'liquid'
        },
        expectedCodes: ['D002', 'D007'],
        expectedClass: 'Corrosive'
      },
      {
        name: 'Cyanide Plating Solution',
        data: {
          productName: 'Silver Cyanide Plating Bath',
          composition: [
            { name: 'Silver Cyanide', cas: '506-64-9', percentage: '2' },
            { name: 'Potassium Cyanide', cas: '151-50-8', percentage: '5' },
            { name: 'Water', cas: '7732-18-5', percentage: '93' }
          ],
          pH: '10.5',
          physicalState: 'liquid'
        },
        expectedCodes: ['P104', 'P098', 'D003', 'D011'],
        expectedClass: 'Acutely Hazardous'
      },
      {
        name: 'Pesticide Formulation',
        data: {
          productName: 'Agricultural Pesticide',
          composition: [
            { name: 'Parathion', cas: '56-38-2', percentage: '20' },
            { name: 'Xylene', cas: '1330-20-7', percentage: '60' },
            { name: 'Surfactants', cas: 'mixture', percentage: '20' }
          ],
          flashPoint: '28',
          physicalState: 'liquid'
        },
        expectedCodes: ['P089', 'D001', 'U239'],
        expectedClass: 'Acutely Hazardous'
      },
      {
        name: 'Laboratory Acid Waste',
        data: {
          productName: 'Mixed Acid Waste',
          composition: [
            { name: 'Hydrochloric Acid', cas: '7647-01-0', percentage: '30' },
            { name: 'Nitric Acid', cas: '7697-37-2', percentage: '20' },
            { name: 'Phosphoric Acid', cas: '7664-38-2', percentage: '10' },
            { name: 'Water', cas: '7732-18-5', percentage: '40' }
          ],
          pH: '0.2',
          physicalState: 'liquid'
        },
        expectedCodes: ['D002'],
        expectedClass: 'Corrosive'
      }
    ];
  }

  generateRandomTestCases(count = 90) {
    const chemicals = [
      { name: 'Acetone', cas: '67-64-1', codes: ['D001'], category: 'ignitable' },
      { name: 'Methanol', cas: '67-56-1', codes: ['U154', 'D001'], category: 'ignitable' },
      { name: 'Toluene', cas: '108-88-3', codes: ['U220', 'D001'], category: 'ignitable' },
      { name: 'Benzene', cas: '71-43-2', codes: ['U019', 'D001', 'D018'], category: 'toxic' },
      { name: 'Lead Oxide', cas: '1317-36-8', codes: ['D008'], category: 'toxic' },
      { name: 'Mercury Oxide', cas: '21908-53-2', codes: ['U151', 'D009'], category: 'toxic' },
      { name: 'Chromium Trioxide', cas: '1333-82-0', codes: ['D007'], category: 'toxic' },
      { name: 'Arsenic Trioxide', cas: '1327-53-3', codes: ['P012', 'D004'], category: 'acute' },
      { name: 'Cadmium Oxide', cas: '1306-19-0', codes: ['D006'], category: 'toxic' },
      { name: 'Silver Nitrate', cas: '7761-88-8', codes: ['D011'], category: 'toxic' },
      { name: 'Barium Chloride', cas: '10361-37-2', codes: ['D005'], category: 'toxic' },
      { name: 'Selenium Dioxide', cas: '7446-08-4', codes: ['D010'], category: 'toxic' },
      { name: 'Chloroform', cas: '67-66-3', codes: ['U044', 'D022'], category: 'toxic' },
      { name: 'Carbon Tetrachloride', cas: '56-23-5', codes: ['U211', 'D019'], category: 'toxic' },
      { name: 'Phenol', cas: '108-95-2', codes: ['U188'], category: 'listed' },
      { name: 'Formaldehyde', cas: '50-00-0', codes: ['U122'], category: 'listed' },
      { name: 'Hydrazine', cas: '302-01-2', codes: ['U133'], category: 'listed' },
      { name: 'Sulfuric Acid', cas: '7664-93-9', codes: ['D002'], category: 'corrosive' },
      { name: 'Sodium Hydroxide', cas: '1310-73-2', codes: ['D002'], category: 'corrosive' },
      { name: 'Water', cas: '7732-18-5', codes: [], category: 'inert' }
    ];

    const randomCases = [];
    let attempts = 0;
    
    while (randomCases.length < count && attempts < count * 2) {
      attempts++;
      // Generate between 1-3 components for more manageable test cases
      const numComponents = Math.floor(Math.random() * 3) + 1;
      const selectedChemicals = [];
      const expectedCodes = new Set();
      
      let remainingPercentage = 100;
      
      for (let j = 0; j < numComponents; j++) {
        const chemical = chemicals[Math.floor(Math.random() * chemicals.length)];
        
        // Ensure meaningful percentages and avoid zero percentages
        let percentage;
        if (j === numComponents - 1) {
          percentage = remainingPercentage; // Last component gets remaining
        } else {
          // Give each component at least 10% and at most 70% of remaining
          const minPercent = Math.max(10, remainingPercentage * 0.1);
          const maxPercent = Math.min(70, remainingPercentage * 0.7);
          percentage = Math.floor(Math.random() * (maxPercent - minPercent) + minPercent);
        }
        
        selectedChemicals.push({
          name: chemical.name,
          cas: chemical.cas,
          percentage: percentage.toString()
        });
        
        // Only add codes for components with significant percentages (>5%)
        if (percentage > 5) {
          chemical.codes.forEach(code => expectedCodes.add(code));
        }
        
        remainingPercentage -= percentage;
        if (remainingPercentage <= 0) break;
      }
      
      // More realistic physical properties
      const isLiquid = Math.random() > 0.4;
      let flashPoint = null;
      let pH = null;
      
      // Only generate flash point for liquids and ignitable materials
      if (isLiquid && selectedChemicals.some(c => 
        ['Acetone', 'Methanol', 'Toluene', 'Benzene'].includes(c.name))) {
        flashPoint = (Math.random() * 80 - 10).toFixed(1); // -10 to 70°C range
      }
      
      // Only generate pH for acids/bases
      const hasAcid = selectedChemicals.some(c => c.name === 'Sulfuric Acid');
      const hasBase = selectedChemicals.some(c => c.name === 'Sodium Hydroxide');
      
      if (hasAcid || hasBase) {
        pH = hasAcid ? 
          (Math.random() * 2).toFixed(1) : // 0-2 for acids
          (12 + Math.random() * 2).toFixed(1); // 12-14 for bases
      }
      
      // Add characteristic codes based on properties
      if (flashPoint && parseFloat(flashPoint) < 60) {
        expectedCodes.add('D001');
      }
      
      if (pH && (parseFloat(pH) <= 2 || parseFloat(pH) >= 12.5)) {
        expectedCodes.add('D002');
      }
      
      // Only create test case if we have at least one expected code, or explicitly non-hazardous
      const codesArray = Array.from(expectedCodes);
      if (codesArray.length === 0) {
        // If no hazardous codes, this should be non-hazardous
        // But only if we have inert materials like water
        if (selectedChemicals.some(c => c.name === 'Water')) {
          codesArray.push('NON-HAZARDOUS'); // Special marker for non-hazardous
        } else {
          // Skip this test case - regenerate
          continue;
        }
      }
      
      randomCases.push({
        name: `Random Test Case ${randomCases.length + 1}`,
        data: {
          productName: `Test Product ${randomCases.length + 1}`,
          composition: selectedChemicals,
          flashPoint,
          pH,
          physicalState: isLiquid ? 'liquid' : 'solid'
        },
        expectedCodes: codesArray.filter(c => c !== 'NON-HAZARDOUS'),
        expectedClass: this.determineExpectedClass(codesArray)
      });
    }
    
    return randomCases;
  }

  determineExpectedClass(codes) {
    if (codes.some(code => code.startsWith('P'))) return 'Acutely Hazardous';
    if (codes.includes('D001')) return 'Ignitable';
    if (codes.includes('D002')) return 'Corrosive';
    if (codes.includes('D003')) return 'Reactive';
    if (codes.some(code => /^D00[4-9]|^D0[1-4]\d/.test(code))) return 'Toxic';
    return 'Non-Hazardous';
  }

  async runTest(testCase) {
    const startTime = Date.now();
    
    try {
      const result = await this.analyzer.analyzeSDS(testCase.data);
      
      if (!result.success || !result.analysis) {
        throw new Error('Analysis failed or returned no results');
      }
      
      const actualCodes = (result.analysis.wasteCodes || []).sort();
      const expectedCodes = testCase.expectedCodes.sort();
      
      const codesMatch = this.arraysEqual(actualCodes, expectedCodes);
      const actualClass = result.analysis.hazardClass || 'Non-Hazardous';
      const classMatch = actualClass === testCase.expectedClass;
      
      const confidence = result.analysis.confidence || 0;
      const passed = confidence >= 95 && (codesMatch || this.partialMatch(actualCodes, expectedCodes));
      
      return {
        name: testCase.name,
        passed,
        confidence,
        executionTime: Date.now() - startTime,
        expected: {
          codes: expectedCodes,
          class: testCase.expectedClass
        },
        actual: {
          codes: actualCodes,
          class: actualClass
        },
        codesMatch,
        classMatch,
        details: result.analysis
      };
      
    } catch (error) {
      return {
        name: testCase.name,
        passed: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => val === b[index]);
  }

  partialMatch(actual, expected) {
    const actualSet = new Set(actual);
    const expectedSet = new Set(expected);
    
    let matchCount = 0;
    for (const code of expectedSet) {
      if (actualSet.has(code)) matchCount++;
    }
    
    return matchCount / expectedSet.size >= 0.8;
  }

  async runFullTestSuite() {
    console.log('Starting SDS Analyzer Test Suite (100 runs)...\n');
    
    this.analyzer.reset();
    
    const allTestCases = [
      ...this.testCases,
      ...this.generateRandomTestCases(90)
    ];
    
    const results = [];
    let passedCount = 0;
    let totalConfidence = 0;
    
    for (let i = 0; i < allTestCases.length; i++) {
      const testCase = allTestCases[i];
      process.stdout.write(`Running test ${i + 1}/100: ${testCase.name}... `);
      
      const result = await this.runTest(testCase);
      results.push(result);
      
      if (result.passed) {
        passedCount++;
        console.log('✅ PASSED');
      } else {
        console.log(`❌ FAILED (Confidence: ${result.confidence?.toFixed(1)}%)`);
      }
      
      if (result.confidence) {
        totalConfidence += result.confidence;
      }
      
      await this.delay(50);
    }
    
    const passRate = (passedCount / allTestCases.length) * 100;
    const avgConfidence = totalConfidence / allTestCases.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUITE RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${allTestCases.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${allTestCases.length - passedCount}`);
    console.log(`Pass Rate: ${passRate.toFixed(2)}%`);
    console.log(`Average Confidence: ${avgConfidence.toFixed(2)}%`);
    console.log(`Target: >95% pass rate`);
    console.log(`Status: ${passRate >= 95 ? '✅ TARGET MET!' : '❌ Below target'}`);
    
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0 && failedTests.length <= 10) {
      console.log('\nFailed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Code mismatch'}`);
      });
    }
    
    return {
      results,
      summary: {
        totalTests: allTestCases.length,
        passed: passedCount,
        failed: allTestCases.length - passedCount,
        passRate,
        avgConfidence,
        targetMet: passRate >= 95
      }
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runContinuousTest(iterations = 10) {
    console.log(`Starting continuous testing (${iterations} iterations)...\n`);
    
    const iterationResults = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ITERATION ${i + 1}/${iterations}`);
      console.log('='.repeat(60));
      
      const result = await this.runFullTestSuite();
      iterationResults.push(result.summary);
      
      console.log(`\nIteration ${i + 1} Pass Rate: ${result.summary.passRate.toFixed(2)}%`);
      
      if (result.summary.passRate >= 95) {
        console.log('✅ Target achieved!');
      } else {
        console.log('❌ Below target, continuing...');
      }
      
      if (i < iterations - 1) {
        console.log('Waiting before next iteration...');
        await this.delay(2000);
      }
    }
    
    const avgPassRate = iterationResults.reduce((sum, r) => sum + r.passRate, 0) / iterations;
    const successfulIterations = iterationResults.filter(r => r.passRate >= 95).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('CONTINUOUS TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Iterations: ${iterations}`);
    console.log(`Successful Iterations (≥95%): ${successfulIterations}`);
    console.log(`Average Pass Rate: ${avgPassRate.toFixed(2)}%`);
    console.log(`Success Rate: ${(successfulIterations / iterations * 100).toFixed(1)}%`);
    
    return {
      iterations: iterationResults,
      summary: {
        totalIterations: iterations,
        successfulIterations,
        avgPassRate,
        successRate: (successfulIterations / iterations * 100)
      }
    };
  }
}

export default SDSAnalyzerTestSuite;