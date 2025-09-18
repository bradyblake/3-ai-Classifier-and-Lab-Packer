// Lab Pack Analysis API Routes
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { analyzeBatch, generateExcelReport } from '../services/labPackAnalyzer.js';
import xlsx from 'xlsx';
import PDFDocument from 'pdfkit';

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/lab-pack/',
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 50 // Max 50 files at once
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Lab Pack Analyzer',
    version: '2.0.0',
    features: [
      'Batch SDS analysis',
      'Chemical compatibility checking', 
      'Lab pack optimization',
      'Excel/PDF report generation'
    ]
  });
});

// Analyze batch of SDS files for lab pack
router.post('/analyze', upload.array('sds_files', 50), async (req, res) => {
  const uploadedFiles = [];
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        message: 'Please upload at least one SDS file' 
      });
    }

    // Read all uploaded files
    const filePromises = req.files.map(async (file) => {
      const content = await fs.readFile(file.path, 'utf8');
      uploadedFiles.push(file.path); // Track for cleanup
      return {
        name: file.originalname,
        content: content,
        size: file.size
      };
    });

    const files = await Promise.all(filePromises);

    // Get configuration from request
    const config = {
      aiProvider: req.body.aiProvider || 'groq',
      maxConcurrent: parseInt(req.body.maxConcurrent) || 3,
      state: req.body.state || 'TX',
      labPackType: req.body.labPackType || 'standard'
    };

    console.log(`📦 Analyzing ${files.length} SDS files for lab pack...`);

    // Perform batch analysis
    const results = await analyzeBatch(files, config);

    // Add metadata
    results.metadata = {
      analyzedAt: new Date().toISOString(),
      fileCount: files.length,
      config: config
    };

    // Clean up uploaded files
    await cleanupFiles(uploadedFiles);

    res.json(results);

  } catch (error) {
    console.error('Lab pack analysis error:', error);
    
    // Clean up files on error
    await cleanupFiles(uploadedFiles);
    
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Generate report in various formats
router.post('/report', async (req, res) => {
  try {
    const { containers, compatibility, format = 'json' } = req.body;

    if (!containers || !compatibility) {
      return res.status(400).json({
        error: 'Missing data',
        message: 'Containers and compatibility data required'
      });
    }

    const results = { containers, compatibility };

    switch (format.toLowerCase()) {
      case 'excel':
        const excelBuffer = await generateExcel(results);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=lab-pack-report.xlsx');
        res.send(excelBuffer);
        break;

      case 'pdf':
        const pdfBuffer = await generatePDF(results);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=lab-pack-report.pdf');
        res.send(pdfBuffer);
        break;

      case 'json':
      default:
        res.json({
          report: results,
          generatedAt: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message
    });
  }
});

// Get compatibility matrix
router.get('/compatibility', (req, res) => {
  // Return the compatibility rules for frontend reference
  const compatibilityMatrix = {
    acids: {
      incompatible: ['bases', 'cyanides', 'sulfides', 'reactive_metals'],
      compatible: ['other_acids', 'neutral_salts']
    },
    bases: {
      incompatible: ['acids', 'ammonium_salts'],
      compatible: ['other_bases', 'neutral_salts']
    },
    oxidizers: {
      incompatible: ['flammables', 'organics', 'reducing_agents'],
      compatible: ['other_oxidizers', 'inorganic_salts']
    },
    flammables: {
      incompatible: ['oxidizers', 'peroxides'],
      compatible: ['other_flammables', 'organic_solvents']
    },
    cyanides: {
      incompatible: ['acids', 'oxidizers'],
      compatible: ['other_cyanides', 'basic_solutions']
    },
    water_reactive: {
      incompatible: ['aqueous_solutions', 'water'],
      compatible: ['dry_chemicals', 'anhydrous_solvents']
    }
  };

  res.json(compatibilityMatrix);
});

// Validate a single SDS classification
router.post('/validate', async (req, res) => {
  try {
    const { classification, productName } = req.body;

    if (!classification) {
      return res.status(400).json({
        error: 'No classification provided',
        message: 'Please provide classification data to validate'
      });
    }

    // Validation logic
    const issues = [];
    const warnings = [];

    // Check pH consistency
    if (classification.pH !== undefined && classification.pH !== null) {
      if (classification.pH <= 2.0 && !classification.labPackCategory?.includes('acid')) {
        issues.push('pH ≤ 2.0 but not classified as acid');
      }
      if (classification.pH >= 12.5 && classification.labPackCategory !== 'caustic') {
        issues.push('pH ≥ 12.5 but not classified as caustic');
      }
    }

    // Check flash point
    if (classification.flashPoint?.fahrenheit < 140 && classification.labPackCategory !== 'flammable') {
      warnings.push('Flash point < 140°F suggests flammable classification');
    }

    // Check for incompatible codes
    const codes = classification.federalCodes || [];
    if (codes.includes('D001') && codes.includes('D003')) {
      warnings.push('D001 (ignitable) and D003 (reactive) together requires special handling');
    }

    res.json({
      valid: issues.length === 0,
      issues,
      warnings,
      suggestions: generateSuggestions(classification, issues, warnings)
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

// Helper function to generate Excel
async function generateExcel(results) {
  const worksheetData = generateExcelReport(results);
  const workbook = xlsx.utils.book_new();

  // Add worksheets
  Object.entries(worksheetData).forEach(([name, data]) => {
    const worksheet = xlsx.utils.aoa_to_sheet([data.headers, ...data.rows]);
    xlsx.utils.book_append_sheet(workbook, worksheet, name);
  });

  // Generate buffer
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Helper function to generate PDF
async function generatePDF(results) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(20).text('Lab Pack Analysis Report', { align: 'center' });
    doc.moveDown();
    
    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Containers: ${results.containers.length}`);
    doc.text(`Categories: ${Object.keys(results.compatibility.groups).length}`);
    doc.text(`Incompatibilities Found: ${results.compatibility.conflicts.length}`);
    doc.moveDown();

    // Categories
    doc.fontSize(14).text('Chemical Categories', { underline: true });
    doc.fontSize(10);
    Object.values(results.compatibility.groups).forEach(group => {
      doc.text(`• ${group.name}: ${group.containers.length} containers`);
      if (group.hazardCodes.size > 0) {
        doc.text(`  Codes: ${Array.from(group.hazardCodes).join(', ')}`, { 
          indent: 20 
        });
      }
    });
    doc.moveDown();

    // Incompatibilities
    if (results.compatibility.conflicts.length > 0) {
      doc.fontSize(14).text('⚠️ Incompatibilities', { underline: true });
      doc.fontSize(10);
      results.compatibility.conflicts.forEach(conflict => {
        doc.text(`• ${conflict.message}`, { color: 'red' });
      });
      doc.moveDown();
    }

    // Recommendations
    doc.fontSize(14).text('Recommendations', { underline: true });
    doc.fontSize(10);
    results.compatibility.recommendations.forEach(rec => {
      if (rec.type === 'warning') {
        doc.fillColor('red').text(`⚠️ ${rec.message}`);
      } else {
        doc.fillColor('black').text(`${rec.name}:`);
        rec.packingInstructions?.forEach(instruction => {
          doc.text(`  • ${instruction}`, { indent: 10 });
        });
      }
    });

    doc.end();
  });
}

// Helper function to clean up uploaded files
async function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error.message);
    }
  }
}

// Helper function to generate suggestions
function generateSuggestions(classification, issues, warnings) {
  const suggestions = [];

  if (issues.includes('pH ≤ 2.0 but not classified as acid')) {
    suggestions.push({
      field: 'labPackCategory',
      suggestion: 'Change to organic_acid or inorganic_acid based on composition',
      priority: 'high'
    });
  }

  if (warnings.includes('Flash point < 140°F suggests flammable classification')) {
    suggestions.push({
      field: 'labPackCategory', 
      suggestion: 'Consider changing to flammable category',
      priority: 'medium'
    });
  }

  return suggestions;
}

export default router;