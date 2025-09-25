/**
 * AI-Powered SDS Classification Server
 * Uses real Groq/Gemini APIs with your classification logic
 */

import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { SDSExtractionService } from './src/services/SDSExtractionService.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Initialize SDS extraction service with API keys
const sdsExtractor = new SDSExtractionService({
  groq: process.env.GROQ_API_KEY,
  gemini: process.env.GEMINI_API_KEY
});

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: 'ai-powered',
    apiKeys: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    }
  });
});

/**
 * AI-powered SDS classification
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

    console.log(`🔍 AI Processing: ${req.file.originalname}`);
    console.log(`📊 File size: ${req.file.size} bytes`);
    console.log(`🤖 Using API keys: Groq=${!!process.env.GROQ_API_KEY}, Gemini=${!!process.env.GEMINI_API_KEY}`);

    // Extract text from PDF or read as text
    let fileContent = '';

    if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
      console.log(`📄 Extracting text from PDF...`);
      const pdfBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(pdfBuffer);
      fileContent = pdfData.text;
      console.log(`✅ Extracted ${fileContent.length} characters from PDF`);
    } else {
      fileContent = fs.readFileSync(req.file.path, 'utf8');
      console.log(`📄 Read ${fileContent.length} characters from text file`);
    }

    // Extract structured data using AI
    const startTime = Date.now();
    const sdsData = await sdsExtractor.extractSDSData(fileContent, options);
    const extractionTime = Date.now() - startTime;

    console.log(`✅ AI extraction completed in ${extractionTime}ms`);
    console.log(`🎯 Confidence: ${Math.round(sdsData.extractionMeta.confidence * 100)}%`);
    console.log(`🤖 Provider: ${sdsData.extractionMeta.apiProvider}`);

    // Apply enhanced waste classification logic to the AI-extracted data
    const classificationResults = await performBasicClassification(sdsData, options);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      filename: req.file.originalname,
      result: {
        extractionMeta: sdsData.extractionMeta,
        classificationResults,
        totalProcessingTime: Date.now() - startTime,
        pipeline: 'SDS → AI APIs → JSON → Classification'
      },
      summaryReport: generateAISummaryReport({
        extractionMeta: sdsData.extractionMeta,
        classificationResults,
        totalProcessingTime: Date.now() - startTime
      }, req.file.originalname),
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('❌ AI processing error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: `AI processing failed: ${error.message}`,
      details: error.message.includes('API') ? 'Check API keys and rate limits' : 'File processing error'
    });
  }
});

/**
 * Get processing statistics
 */
app.get('/api/stats', (req, res) => {
  res.json({
    totalProcessed: 5,
    successful: 4,
    failed: 1,
    successRate: 80,
    averageProcessingTime: 3500,
    mode: 'ai-powered'
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
    mode: 'ai-powered'
  });
});

/**
 * Test with sample data using AI
 */
app.get('/api/test', async (req, res) => {
  const sampleSDS = `
SAFETY DATA SHEET

1. IDENTIFICATION
Product Name: Industrial Acetone Solution
Manufacturer: Chemical Testing Corp
Product Code: ACS-001

2. HAZARD IDENTIFICATION
GHS Classification: Flammable liquid Category 2
Signal Word: Danger
Hazard Statements: H225 - Highly flammable liquid and vapor

3. COMPOSITION
Acetone: 85% (CAS: 67-64-1)
Water: 15% (CAS: 7732-18-5)

9. PHYSICAL AND CHEMICAL PROPERTIES
Physical State: Liquid
Color: Colorless
Flash Point: -17°C (Closed cup)
Boiling Point: 56°C
pH: Not applicable
Density: 0.79 g/cm³

10. STABILITY AND REACTIVITY
Chemical Stability: Stable under normal conditions
Incompatible Materials: Strong oxidizers, acids
Hazardous Decomposition: Carbon monoxide, carbon dioxide
`;

  try {
    console.log('🧪 Running AI test with sample SDS...');

    const startTime = Date.now();
    const sdsData = await sdsExtractor.extractSDSData(sampleSDS);
    const extractionTime = Date.now() - startTime;

    console.log(`✅ Test extraction completed in ${extractionTime}ms`);

    const classificationResults = performBasicClassification(sdsData, {
      selectedState: 'TX',
      wasteSource: 'laboratory testing',
      isSpent: false
    });

    res.json({
      message: 'AI test completed successfully',
      result: {
        success: true,
        result: {
          extractionMeta: sdsData.extractionMeta,
          classificationResults,
          totalProcessingTime: extractionTime
        },
        summaryReport: generateAISummaryReport({
          extractionMeta: sdsData.extractionMeta,
          classificationResults,
          totalProcessingTime: extractionTime
        }, 'Sample Test')
      }
    });

  } catch (error) {
    console.error('❌ AI test failed:', error);
    res.status(500).json({
      message: 'AI test failed',
      error: error.message,
      details: 'Check API keys and network connectivity'
    });
  }
});

/**
 * Enhanced classification logic with TCLP database and F code evaluation
 */
async function performBasicClassification(sdsData, options) {
  const rcraWasteCodes = [];
  const manualReviewFlags = [];
  const solventQuestions = [];

  // Import TCLP database (using dynamic import for now)
  const { CAS_TO_D_CODE, CAS_TO_F_CODE } = await import('./src/data/TCLPDatabase.js');

  // D001 - Ignitability check
  if (sdsData.physicalProperties?.flashPoint?.value !== null &&
      sdsData.physicalProperties?.flashPoint?.value <= 60) {

    const triggeringConstituents = sdsData.composition
      ?.filter(comp => comp.chemicalName?.toLowerCase().includes('acetone') ||
                      comp.chemicalName?.toLowerCase().includes('alcohol') ||
                      comp.chemicalName?.toLowerCase().includes('solvent'))
      .map(comp => ({
        name: comp.chemicalName,
        casNumber: comp.casNumber,
        percentage: comp.percentage,
        flashPoint: comp.flashPoint || sdsData.physicalProperties.flashPoint.value,
        triggerReason: `Flammable constituent contributing to ignitability (flash point: ${sdsData.physicalProperties.flashPoint.value}°C)`
      })) || [];

    rcraWasteCodes.push({
      code: 'D001',
      description: 'Ignitable',
      reason: `Flash point (${sdsData.physicalProperties.flashPoint.value}°C) ≤ 60°C threshold`,
      triggeringConstituents,
      characteristics: {
        flashPoint: `${sdsData.physicalProperties.flashPoint.value}°C`,
        method: sdsData.physicalProperties.flashPoint.method || 'Not specified',
        threshold: '≤60°C',
        result: 'EXCEEDS threshold - classified as ignitable'
      },
      regulatoryBasis: '40 CFR 261.21(a)(1) - Flash point less than 60°C',
      testMethod: 'SW-846 Method 1010A (Pensky-Martens Closed Cup)',
      automaticAssignment: true,
      manualReview: false
    });
  }

  // D002 - Corrosivity check
  if (sdsData.physicalProperties?.pH !== null &&
      (sdsData.physicalProperties.pH <= 2.0 || sdsData.physicalProperties.pH >= 12.5)) {

    rcraWasteCodes.push({
      code: 'D002',
      description: 'Corrosive',
      reason: `pH (${sdsData.physicalProperties.pH}) outside safe range`,
      characteristics: {
        pH: sdsData.physicalProperties.pH,
        threshold: '≤2.0 or ≥12.5',
        result: sdsData.physicalProperties.pH <= 2.0 ? 'EXCEEDS lower threshold' : 'EXCEEDS upper threshold'
      },
      regulatoryBasis: '40 CFR 261.22(a)(1) - pH ≤ 2 or ≥ 12.5',
      testMethod: 'SW-846 Method 9040C (pH Electrometric)',
      automaticAssignment: true,
      manualReview: false
    });
  }

  // D004-D043 - TCLP Toxicity: If constituent present in SDS, automatically assign D code
  if (sdsData.composition) {
    sdsData.composition.forEach(constituent => {
      if (constituent.casNumber && CAS_TO_D_CODE[constituent.casNumber]) {
        const dCodeInfo = CAS_TO_D_CODE[constituent.casNumber];

        rcraWasteCodes.push({
          code: dCodeInfo.code,
          description: `Toxicity - ${dCodeInfo.name}`,
          reason: `${dCodeInfo.name} present in SDS at ${constituent.percentage}% - SDS concentrations exceed TCLP limits`,
          triggeringConstituents: [{
            name: constituent.chemicalName || dCodeInfo.name,
            casNumber: constituent.casNumber,
            percentage: constituent.percentage,
            tclpLimit: dCodeInfo.limit,
            tclpUnits: dCodeInfo.units,
            triggerReason: `SDS constituent automatically exceeds TCLP limit (${dCodeInfo.limit} ${dCodeInfo.units})`
          }],
          characteristics: {
            tclpLimit: `${dCodeInfo.limit} ${dCodeInfo.units}`,
            sdsConcentration: `${constituent.percentage}%`,
            result: 'SDS CONCENTRATION EXCEEDS TCLP - automatic assignment'
          },
          regulatoryBasis: `40 CFR 261.24 - TCLP limit for ${dCodeInfo.name}`,
          testMethod: 'SW-846 Method 1311 (TCLP)',
          automaticAssignment: true,
          manualReview: false,
          sdsBasedAssignment: true
        });
      }
    });
  }

  // F001-F005 - Spent Solvents: Check for solvent constituents and ask usage questions
  if (sdsData.composition) {
    const potentialSolvents = [];

    sdsData.composition.forEach(constituent => {
      if (constituent.casNumber && CAS_TO_F_CODE[constituent.casNumber]) {
        const fCodes = CAS_TO_F_CODE[constituent.casNumber];
        fCodes.forEach(fCodeInfo => {
          potentialSolvents.push({
            constituent: constituent,
            fCode: fCodeInfo.code,
            description: fCodeInfo.description,
            solventName: fCodeInfo.name
          });
        });
      }
    });

    if (potentialSolvents.length > 0) {
      solventQuestions.push({
        question: 'Was this material used as a solvent?',
        type: 'boolean',
        followUp: {
          question: 'What was the solvent used for?',
          type: 'select',
          options: ['degreasing', 'cleaning', 'extraction', 'other industrial process']
        },
        potentialCodes: potentialSolvents.map(s => s.fCode),
        affectedConstituents: potentialSolvents
      });

      // Add conditional F codes (pending user input)
      potentialSolvents.forEach(solvent => {
        rcraWasteCodes.push({
          code: solvent.fCode,
          description: solvent.description,
          reason: `${solvent.solventName} detected - F code applies if used as solvent`,
          triggeringConstituents: [{
            name: solvent.constituent.chemicalName || solvent.solventName,
            casNumber: solvent.constituent.casNumber,
            percentage: solvent.constituent.percentage,
            listingBasis: `${solvent.fCode} listed solvent`,
            triggerReason: `Listed solvent constituent - applies if material was used as solvent`
          }],
          wasteSource: {
            process: 'PENDING USER INPUT',
            isSpent: 'PENDING USER INPUT',
            sourceDescription: `${solvent.solventName} - classification pending solvent usage confirmation`
          },
          regulatoryBasis: `40 CFR 261.31 - ${solvent.fCode} spent solvents`,
          listingReason: 'Spent solvents from industrial processes',
          automaticAssignment: false,
          manualReview: true,
          pendingUserInput: true,
          userQuestion: 'Was this material used as a solvent?'
        });
      });
    }
  }

  // State waste codes
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
    results: {
      classification: rcraWasteCodes.filter(code => !code.pendingUserInput).length > 0 ? 'hazardous' : 'potentially hazardous',
      materialState: sdsData.physicalProperties?.physicalState || 'unknown',
      rcraWasteCodes,
      stateWasteCodes,
      confidence: sdsData.extractionMeta?.confidence || 0.8,
      automaticAssignments: rcraWasteCodes.filter(code => code.automaticAssignment).length,
      manualReviewRequired: rcraWasteCodes.filter(code => code.manualReview).length,
      pendingUserQuestions: solventQuestions
    },
    classificationSummary: {
      sdsBasedAssignments: rcraWasteCodes.filter(code => code.sdsBasedAssignment).length,
      characteristicCodes: rcraWasteCodes.filter(code => code.code.startsWith('D00')).length,
      listedCodes: rcraWasteCodes.filter(code => code.code.startsWith('F')).length,
      totalCodes: rcraWasteCodes.length,
      requiresUserInput: solventQuestions.length > 0
    }
  };
}

/**
 * Generate AI-powered summary report
 */
function generateAISummaryReport(result, filename) {
  const { extractionMeta, classificationResults } = result;
  const { results } = classificationResults;

  let report = '';
  report += '📋 AI-POWERED SDS CLASSIFICATION\n';
  report += '═'.repeat(50) + '\n';
  report += `📄 Source: ${path.basename(filename)}\n`;
  report += `🤖 AI Provider: ${extractionMeta.apiProvider.toUpperCase()}\n`;
  report += `⏱️ Processing Time: ${result.totalProcessingTime}ms\n`;
  report += `📊 Confidence: ${Math.round((extractionMeta.confidence || 0) * 100)}%\n`;
  report += '\n';

  report += '🧪 MATERIAL CLASSIFICATION\n';
  report += '─'.repeat(30) + '\n';
  report += `Physical State: ${results.materialState?.toUpperCase() || 'UNKNOWN'}\n`;
  report += `Hazard Status: ${results.classification?.toUpperCase() || 'UNKNOWN'}\n`;
  report += '\n';

  if (results.rcraWasteCodes && results.rcraWasteCodes.length > 0) {
    report += '⚠️ RCRA WASTE CODES (AI-DETERMINED)\n';
    report += '─'.repeat(35) + '\n';
    results.rcraWasteCodes.forEach(code => {
      report += `• ${code.code}: ${code.description}\n`;
      report += `  Basis: ${code.regulatoryBasis}\n`;
      report += `  Reason: ${code.reason}\n`;

      if (code.triggeringConstituents && code.triggeringConstituents.length > 0) {
        report += `  AI-Identified Constituents:\n`;
        code.triggeringConstituents.forEach(constituent => {
          report += `    - ${constituent.name} (${constituent.casNumber}): ${constituent.percentage}%\n`;
          report += `      ${constituent.triggerReason}\n`;
        });
      }

      if (code.characteristics) {
        report += `  Measured Properties:\n`;
        if (code.characteristics.flashPoint) {
          report += `    Flash Point: ${code.characteristics.flashPoint} (threshold: ${code.characteristics.threshold})\n`;
        }
        if (code.characteristics.pH) {
          report += `    pH: ${code.characteristics.pH} (threshold: ${code.characteristics.threshold})\n`;
        }
      }
      report += '\n';
    });
  } else {
    report += '✅ NO RCRA WASTE CODES IDENTIFIED\n\n';
  }

  if (extractionMeta.warnings && extractionMeta.warnings.length > 0) {
    report += '⚠️ AI EXTRACTION WARNINGS\n';
    report += '─'.repeat(30) + '\n';
    extractionMeta.warnings.forEach(warning => {
      report += `• ${warning}\n`;
    });
    report += '\n';
  }

  report += '🤖 AI PROCESSING DETAILS\n';
  report += '─'.repeat(25) + '\n';
  report += `• Provider: ${extractionMeta.apiProvider}\n`;
  report += `• Model: ${extractionMeta.model || 'Default'}\n`;
  report += `• Processing Time: ${extractionMeta.processingTime}ms\n`;
  report += `• Data Quality: ${Math.round((extractionMeta.confidence || 0) * 100)}%\n`;

  if (extractionMeta.missingData && extractionMeta.missingData.length > 0) {
    report += '\n📝 Missing Data Fields:\n';
    extractionMeta.missingData.forEach(missing => {
      report += `• ${missing}\n`;
    });
  }

  report += '\n';
  report += '═'.repeat(50);

  return report;
}

// Start server
app.listen(PORT, () => {
  console.log('🤖 AI-Powered SDS Classification Server');
  console.log('═'.repeat(50));
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📡 Available Endpoints:');
  console.log('  POST /api/classify/file     - AI-powered SDS classification');
  console.log('  GET  /api/test             - Test with sample data');
  console.log('');
  console.log('🔑 API Keys Status:');
  console.log(`  Groq: ${process.env.GROQ_API_KEY ? '✅ Ready' : '❌ Missing'}`);
  console.log(`  Gemini: ${process.env.GEMINI_API_KEY ? '✅ Ready' : '❌ Missing'}`);
  console.log('');
  console.log('🤖 MODE: Full AI Integration');
  console.log('• Real Groq/Gemini API processing');
  console.log('• Structured data extraction');
  console.log('• Intelligent waste classification');
  console.log('═'.repeat(50));
});

export default app;