/**
 * Example Usage - SDS Classification Pipeline
 * Demonstrates how to use the complete AI-driven SDS extraction and classification system
 */

import { SDSClassificationPipeline } from './src/pipelines/SDSClassificationPipeline.js';
import fs from 'fs';
import path from 'path';

// Initialize pipeline with API keys
const pipeline = new SDSClassificationPipeline({
  groq: 'your-groq-api-key-here',
  gemini: 'your-gemini-api-key-here'
});

async function demonstrateUsage() {
  console.log('🧪 SDS CLASSIFICATION PIPELINE DEMONSTRATION');
  console.log('═'.repeat(60));
  console.log('');

  // Example 1: Process single SDS file
  console.log('1️⃣ SINGLE FILE PROCESSING');
  console.log('─'.repeat(30));

  try {
    const result = await pipeline.processSDS('sample-sds.pdf', {
      selectedState: 'TX',
      wasteSource: 'degreasing operations',
      industryType: 'metal fabrication',
      isSpent: true,
      generateForms: true
    });

    if (result.success) {
      console.log('✅ Successfully processed SDS');

      // Show key results
      const classification = result.result.classificationResults.results;
      console.log(`Material State: ${classification.materialState}`);
      console.log(`Hazard Classification: ${classification.classification}`);
      console.log(`RCRA Codes Found: ${classification.rcraWasteCodes.length}`);

      if (classification.rcraWasteCodes.length > 0) {
        classification.rcraWasteCodes.forEach(code => {
          console.log(`  • ${code.code}: ${code.description}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Single file processing example requires actual SDS file');
    console.log('   Place an SDS file named "sample-sds.pdf" in the project root to test');
  }

  console.log('');

  // Example 2: Process SDS from text
  console.log('2️⃣ TEXT-BASED PROCESSING');
  console.log('─'.repeat(30));

  const sampleSDSText = `
SAFETY DATA SHEET

1. IDENTIFICATION
Product Name: Industrial Cleaning Solvent
Manufacturer: Chemical Company Inc.
Product Code: ICS-001

2. HAZARD IDENTIFICATION
GHS Classification: Flammable liquid Category 2
Signal Word: Danger
Hazard Statements: H225 - Highly flammable liquid and vapor

3. COMPOSITION
Acetone: 70% (CAS: 67-64-1)
Ethanol: 25% (CAS: 64-17-5)
Water: 5% (CAS: 7732-18-5)

9. PHYSICAL AND CHEMICAL PROPERTIES
Physical State: Liquid
Color: Colorless
Flash Point: 45°C (Closed cup)
Boiling Point: 85°C
pH: Not applicable
Density: 0.89 g/cm³

10. STABILITY AND REACTIVITY
Chemical Stability: Stable under normal conditions
Incompatible Materials: Strong oxidizers
Hazardous Decomposition: Carbon monoxide, carbon dioxide
`;

  try {
    const textResult = await pipeline.processSDSText(sampleSDSText, {
      selectedState: 'TX',
      wasteSource: 'industrial cleaning',
      industryType: 'manufacturing',
      isSpent: false
    });

    console.log('✅ Text processing completed');
    console.log(`API Provider Used: ${textResult.result.extractionMeta.apiProvider}`);
    console.log(`Processing Time: ${textResult.processingTime}ms`);

  } catch (error) {
    console.log('❌ Text processing example failed - API keys may be missing');
    console.log('   Set GROQ_API_KEY or GEMINI_API_KEY environment variables to test');
  }

  console.log('');

  // Example 3: Show API requirements
  console.log('3️⃣ API SETUP REQUIREMENTS');
  console.log('─'.repeat(30));
  console.log('To use this pipeline, you need API keys from:');
  console.log('');
  console.log('🔑 Groq API (Primary - Faster & Cheaper)');
  console.log('   • Get key from: https://console.groq.com/');
  console.log('   • Set env var: GROQ_API_KEY=your-key-here');
  console.log('   • Or pass to constructor: { groq: "your-key" }');
  console.log('');
  console.log('🔑 Gemini API (Fallback)');
  console.log('   • Get key from: https://console.cloud.google.com/');
  console.log('   • Set env var: GEMINI_API_KEY=your-key-here');
  console.log('   • Or pass to constructor: { gemini: "your-key" }');
  console.log('');

  // Example 4: Show classification capabilities
  console.log('4️⃣ CLASSIFICATION CAPABILITIES');
  console.log('─'.repeat(35));
  console.log('✅ Complete RCRA Coverage:');
  console.log('   • D001-D043: Characteristic hazardous wastes');
  console.log('   • F001-F039: Non-specific source wastes');
  console.log('   • P001-P123: Acutely hazardous wastes');
  console.log('   • U001-U391: Toxic wastes');
  console.log('   • K001-K102: Source-specific wastes');
  console.log('');
  console.log('🏛️ State Regulations:');
  console.log('   • Texas TCEQ RG-22 (Classes H, 1, 2, 3)');
  console.log('   • Oklahoma DEQ (VSQG, SQG, LQG)');
  console.log('');
  console.log('📋 Form Generation:');
  console.log('   • Hazardous Waste Manifests');
  console.log('   • Texas STEERS Reports');
  console.log('   • Oklahoma EPA Forms');
  console.log('   • SQG Self-Certifications');
  console.log('');

  // Example 5: Show processing statistics
  console.log('5️⃣ PROCESSING STATISTICS');
  console.log('─'.repeat(30));
  const stats = pipeline.getStats();
  console.log(`Total Processed: ${stats.totalProcessed}`);
  console.log(`Successful: ${stats.successful}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log(`Avg Processing Time: ${Math.round(stats.averageProcessingTime)}ms`);

  console.log('');
  console.log('═'.repeat(60));
  console.log('🎯 READY FOR PRODUCTION USE');
  console.log('');
  console.log('The pipeline provides:');
  console.log('✅ AI-powered SDS data extraction');
  console.log('✅ Comprehensive waste classification');
  console.log('✅ State-specific compliance forms');
  console.log('✅ Step-by-step decision audit trails');
  console.log('✅ Batch processing capabilities');
  console.log('✅ Training data collection');
  console.log('✅ Error handling & fallback logic');
}

// Additional utility functions for testing

/**
 * Test with mock SDS data
 */
export async function testWithMockData() {
  console.log('🧪 Testing with mock SDS data...');

  const mockSDS = {
    productInfo: {
      productName: "Test Chemical",
      manufacturer: "Test Company",
      casNumber: "67-64-1"
    },
    physicalProperties: {
      physicalState: "liquid",
      flashPoint: { value: 45, units: "°C" },
      pH: 7.5
    },
    composition: [
      {
        chemicalName: "Acetone",
        casNumber: "67-64-1",
        percentage: 70
      }
    ]
  };

  // This would normally use the MasterWasteClassifier directly
  // without API extraction for testing classification logic only
  console.log('Mock data structure:', JSON.stringify(mockSDS, null, 2));
  return mockSDS;
}

/**
 * Generate example configuration file
 */
export function generateConfigFile() {
  const config = {
    apiKeys: {
      groq: "your-groq-api-key-here",
      gemini: "your-gemini-api-key-here"
    },
    defaultOptions: {
      selectedState: "TX",
      generateForms: true,
      collectTrainingData: true
    },
    processing: {
      timeout: 60000,
      maxRetries: 2,
      batchSize: 10
    }
  };

  fs.writeFileSync('./pipeline-config.json', JSON.stringify(config, null, 2));
  console.log('📄 Generated pipeline-config.json');
}

// Run demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateUsage().catch(console.error);
}