/**
 * Simplified Development Server - Works without API keys for testing
 */

import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: 'enhanced-demo-with-apis-ready',
    apiKeys: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    }
  });
});

/**
 * Simplified SDS classification (mock data for testing)
 */
app.post('/api/classify/file', upload.single('sdsFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const options = {
      selectedState: req.body.state || 'TX',
      wasteSource: req.body.wasteSource || 'unknown',
      industryType: req.body.industryType || 'general',
      isSpent: req.body.isSpent === 'true'
    };

    console.log(`Processing uploaded file: ${req.file.originalname}`);
    console.log(`File size: ${req.file.size} bytes`);
    console.log(`Options:`, options);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock classification results based on filename and options
    const mockResult = generateMockClassification(req.file.originalname, options);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      filename: req.file.originalname,
      result: mockResult,
      summaryReport: generateMockSummaryReport(mockResult),
      processingTime: 2000,
      mode: 'simplified-demo'
    });

  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Test with sample data
 */
app.get('/api/test', async (req, res) => {
  try {
    const sampleResult = generateMockClassification('Sample Acetone SDS.pdf', {
      selectedState: 'TX',
      wasteSource: 'laboratory cleaning',
      isSpent: false
    });

    res.json({
      message: 'Sample test completed successfully',
      result: {
        success: true,
        result: sampleResult,
        summaryReport: generateMockSummaryReport(sampleResult)
      },
      mode: 'simplified-demo'
    });

  } catch (error) {
    res.status(500).json({
      message: 'Test failed',
      error: error.message
    });
  }
});

/**
 * Get processing statistics
 */
app.get('/api/stats', (req, res) => {
  res.json({
    totalProcessed: 15,
    successful: 13,
    failed: 2,
    successRate: 87,
    averageProcessingTime: 2500,
    mode: 'simplified'
  });
});

/**
 * Get supported codes
 */
app.get('/api/codes', (req, res) => {
  res.json({
    rcra: {
      characteristic: { range: 'D001-D043', count: 43, description: 'Characteristic hazardous wastes' },
      nonSpecific: { range: 'F001-F039', count: 39, description: 'Non-specific source wastes' },
      acutelyHazardous: { range: 'P001-P123', count: 123, description: 'Acutely hazardous wastes' },
      toxic: { range: 'U001-U391', count: 391, description: 'Toxic wastes' },
      sourceSpecific: { range: 'K001-K102', count: 102, description: 'Source-specific wastes' }
    },
    states: {
      texas: { regulation: 'TCEQ RG-22', classes: ['H', '1', '2', '3'] },
      oklahoma: { regulation: 'DEQ', categories: ['VSQG', 'SQG', 'LQG'] }
    },
    totalCodes: '698+',
    mode: 'simplified'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Helper functions

function generateMockClassification(filename, options) {
  // Generate realistic mock data based on filename patterns
  const isFlammable = filename.toLowerCase().includes('acetone') ||
                     filename.toLowerCase().includes('alcohol') ||
                     filename.toLowerCase().includes('solvent');

  const isAcidic = filename.toLowerCase().includes('acid') ||
                   filename.toLowerCase().includes('hcl') ||
                   filename.toLowerCase().includes('sulfuric');

  const rcraWasteCodes = [];

  if (isFlammable) {
    rcraWasteCodes.push({
      code: 'D001',
      description: 'Ignitable',
      reason: 'Flash point below 60°C threshold',
      triggeringConstituents: [
        {
          name: 'Acetone',
          casNumber: '67-64-1',
          percentage: 75,
          flashPoint: '−17°C',
          triggerReason: 'Primary flammable constituent with flash point well below 60°C threshold'
        }
      ],
      characteristics: {
        flashPoint: '45°C',
        method: 'Closed cup',
        threshold: '≤60°C',
        result: 'EXCEEDS threshold - classified as ignitable'
      },
      regulatoryBasis: '40 CFR 261.21(a)(1) - Flash point less than 60°C',
      testMethod: 'SW-846 Method 1010A (Pensky-Martens Closed Cup)'
    });
  }

  if (isAcidic) {
    rcraWasteCodes.push({
      code: 'D002',
      description: 'Corrosive',
      reason: 'pH below 2.0 threshold',
      triggeringConstituents: [
        {
          name: 'Hydrochloric Acid',
          casNumber: '7647-01-0',
          percentage: 10,
          pHContribution: 1.2,
          triggerReason: 'Strong acid contributing to corrosive pH'
        }
      ],
      characteristics: {
        pH: 1.8,
        method: 'pH meter calibration',
        threshold: '≤2.0 or ≥12.5',
        result: 'EXCEEDS lower threshold - classified as corrosive'
      },
      regulatoryBasis: '40 CFR 261.22(a)(1) - pH ≤ 2 or ≥ 12.5',
      testMethod: 'SW-846 Method 9040C (pH Electrometric)'
    });
  }

  if (options.isSpent && isFlammable) {
    rcraWasteCodes.push({
      code: 'F003',
      description: 'Spent non-halogenated solvents',
      reason: 'Spent solvent from degreasing operations',
      triggeringConstituents: [
        {
          name: 'Acetone',
          casNumber: '67-64-1',
          percentage: 75,
          listingBasis: 'F003 listed solvent',
          triggerReason: 'Used acetone from metal degreasing operations'
        },
        {
          name: 'Ethanol',
          casNumber: '64-17-5',
          percentage: 20,
          listingBasis: 'F003 listed solvent',
          triggerReason: 'Used ethanol from cleaning operations'
        }
      ],
      wasteSource: {
        process: options.wasteSource,
        industry: options.industryType,
        isSpent: true,
        sourceDescription: 'Solvent used in manufacturing operations and now contaminated'
      },
      regulatoryBasis: '40 CFR 261.31 - F003 spent non-halogenated solvents',
      listingReason: 'Spent solvents from degreasing and other operations'
    });
  }

  const stateWasteCodes = [];
  if (options.selectedState === 'TX') {
    const texasCode = rcraWasteCodes.length > 0 ? '1234567H' : '1234563';
    stateWasteCodes.push({
      texasWasteCode: texasCode,
      class: rcraWasteCodes.length > 0 ? 'H' : '3',
      description: rcraWasteCodes.length > 0 ? 'Hazardous waste' : 'Class 3 non-hazardous'
    });
  }

  return {
    extractionMeta: {
      extractionDate: new Date().toISOString(),
      apiProvider: 'mock',
      confidence: 0.85,
      processingTime: 2000,
      warnings: ['This is a simplified demo version'],
      missingData: []
    },
    classificationResults: {
      results: {
        classification: rcraWasteCodes.length > 0 ? 'hazardous' : 'non-hazardous',
        materialState: 'liquid',
        rcraWasteCodes,
        stateWasteCodes,
        confidence: 0.87
      },
      forms: rcraWasteCodes.length > 0 ? {
        'hazardous-waste-manifest': '<html>Mock Form Generated</html>',
        'texas-steers-report': '<html>Mock Texas Report</html>'
      } : {}
    },
    totalProcessingTime: 2000,
    pipeline: 'SDS → Mock Analysis → Classification'
  };
}

function generateMockSummaryReport(result) {
  const { results } = result.classificationResults;

  let report = '';
  report += '📋 SDS CLASSIFICATION SUMMARY (DEMO MODE)\n';
  report += '═'.repeat(50) + '\n';
  report += `🤖 API Provider: MOCK (Demo Version)\n`;
  report += `⏱️ Processing Time: ${result.totalProcessingTime}ms\n`;
  report += `📊 Confidence: ${Math.round((result.extractionMeta.confidence || 0) * 100)}%\n`;
  report += '\n';

  report += '🧪 MATERIAL CLASSIFICATION\n';
  report += '─'.repeat(30) + '\n';
  report += `Physical State: ${results.materialState?.toUpperCase() || 'LIQUID'}\n`;
  report += `Hazard Status: ${results.classification?.toUpperCase() || 'UNKNOWN'}\n`;
  report += '\n';

  if (results.rcraWasteCodes && results.rcraWasteCodes.length > 0) {
    report += '⚠️ RCRA WASTE CODES\n';
    report += '─'.repeat(20) + '\n';
    results.rcraWasteCodes.forEach(code => {
      report += `• ${code.code}: ${code.description}\n`;
      report += `  Basis: ${code.regulatoryBasis}\n`;

      if (code.triggeringConstituents && code.triggeringConstituents.length > 0) {
        report += `  Triggering Constituents:\n`;
        code.triggeringConstituents.forEach(constituent => {
          report += `    - ${constituent.name} (${constituent.casNumber}): ${constituent.percentage}%\n`;
          report += `      ${constituent.triggerReason}\n`;
        });
      }

      if (code.characteristics) {
        report += `  Characteristic Values:\n`;
        if (code.characteristics.flashPoint) {
          report += `    Flash Point: ${code.characteristics.flashPoint} (${code.characteristics.threshold})\n`;
          report += `    Result: ${code.characteristics.result}\n`;
        }
        if (code.characteristics.pH) {
          report += `    pH: ${code.characteristics.pH} (${code.characteristics.threshold})\n`;
          report += `    Result: ${code.characteristics.result}\n`;
        }
      }

      if (code.wasteSource) {
        report += `  Waste Source: ${code.wasteSource.sourceDescription}\n`;
        report += `  Process: ${code.wasteSource.process}\n`;
      }

      if (code.testMethod) {
        report += `  Test Method: ${code.testMethod}\n`;
      }

      report += '\n';
    });
  } else {
    report += '✅ NO RCRA WASTE CODES IDENTIFIED\n\n';
  }

  if (results.stateWasteCodes && results.stateWasteCodes.length > 0) {
    report += '🏛️ STATE-SPECIFIC CODES\n';
    report += '─'.repeat(25) + '\n';
    results.stateWasteCodes.forEach(code => {
      if (code.texasWasteCode) {
        report += `• Texas Code: ${code.texasWasteCode}\n`;
        report += `  Class: ${code.class}\n`;
      }
    });
    report += '\n';
  }

  report += '⚠️ DEMO MODE NOTICE\n';
  report += '─'.repeat(20) + '\n';
  report += '• This is a simplified demo version\n';
  report += '• Add API keys for full AI-powered extraction\n';
  report += '• Results are generated from filename patterns\n';
  report += '\n';

  report += '═'.repeat(50);

  return report;
}

// Start server
app.listen(PORT, () => {
  console.log('🚀 Enhanced SDS Classification Server');
  console.log('═'.repeat(50));
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📡 Available Endpoints:');
  console.log('  POST /api/classify/file     - Upload SDS file (enhanced demo)');
  console.log('  GET  /api/test             - Test with sample data');
  console.log('  GET  /api/stats            - Processing statistics');
  console.log('  GET  /api/codes            - Supported waste codes');
  console.log('');
  console.log('🔑 API Keys Status:');
  console.log(`  Groq: ${process.env.GROQ_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`  Gemini: ${process.env.GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log('');
  console.log('🔧 MODE: Enhanced Demo with Detailed Classifications');
  console.log('• Full constituent and characteristic analysis');
  console.log('• Regulatory basis and test methods');
  console.log('• Complete traceability for each waste code');
  console.log('• Ready for AI integration');
  console.log('═'.repeat(50));
});

export default app;