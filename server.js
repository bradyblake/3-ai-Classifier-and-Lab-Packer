/**
 * Simple Development Server for SDS Classification Pipeline
 * HTTP API endpoints for testing and development
 */

import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { SDSClassificationPipeline } from './src/pipelines/SDSClassificationPipeline.js';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Initialize pipeline
const pipeline = new SDSClassificationPipeline({
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
    apiKeys: {
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY
    }
  });
});

/**
 * Process SDS from uploaded file
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
      isSpent: req.body.isSpent === 'true',
      generateForms: req.body.generateForms !== 'false'
    };

    console.log(`Processing uploaded file: ${req.file.originalname}`);

    const result = await pipeline.processSDS(req.file.path, options);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (result.success) {
      res.json({
        success: true,
        filename: req.file.originalname,
        result: result.result,
        summaryReport: result.summaryReport,
        processingTime: result.processingTime
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        filename: req.file.originalname
      });
    }

  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process SDS from text content
 */
app.post('/api/classify/text', async (req, res) => {
  try {
    const { sdsText, ...options } = req.body;

    if (!sdsText) {
      return res.status(400).json({ error: 'SDS text is required' });
    }

    const processOptions = {
      selectedState: options.state || 'TX',
      wasteSource: options.wasteSource || 'unknown',
      industryType: options.industryType || 'general',
      isSpent: options.isSpent === true,
      generateForms: options.generateForms !== false
    };

    console.log('Processing SDS text content...');

    const result = await pipeline.processSDSText(sdsText, processOptions);

    if (result.success) {
      res.json({
        success: true,
        result: result.result,
        summaryReport: result.summaryReport,
        processingTime: result.processingTime
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch process multiple files
 */
app.post('/api/classify/batch', upload.array('sdsFiles', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const options = {
      selectedState: req.body.state || 'TX',
      wasteSource: req.body.wasteSource || 'unknown',
      industryType: req.body.industryType || 'general',
      isSpent: req.body.isSpent === 'true',
      generateForms: req.body.generateForms !== 'false'
    };

    console.log(`Processing batch of ${req.files.length} files...`);

    const filePaths = req.files.map(file => file.path);
    const results = await pipeline.batchProcess(filePaths, options);

    // Clean up uploaded files
    req.files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        console.warn('Failed to delete temp file:', file.path);
      }
    });

    res.json({
      success: true,
      batch: results,
      fileNames: req.files.map(f => f.originalname)
    });

  } catch (error) {
    console.error('Batch processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get processing statistics
 */
app.get('/api/stats', (req, res) => {
  const stats = pipeline.getStats();
  res.json(stats);
});

/**
 * Reset processing statistics
 */
app.post('/api/stats/reset', (req, res) => {
  pipeline.resetStats();
  res.json({ message: 'Statistics reset successfully' });
});

/**
 * Get supported waste codes info
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
    totalCodes: '698+'
  });
});

/**
 * Test endpoint with sample data
 */
app.get('/api/test', async (req, res) => {
  const sampleSDS = `
SAFETY DATA SHEET

1. IDENTIFICATION
Product Name: Test Acetone Solution
Manufacturer: Example Chemical Co.

2. HAZARD IDENTIFICATION
GHS Classification: Flammable liquid Category 2
Signal Word: Danger

3. COMPOSITION
Acetone: 85% (CAS: 67-64-1)
Water: 15% (CAS: 7732-18-5)

9. PHYSICAL AND CHEMICAL PROPERTIES
Physical State: Liquid
Flash Point: -17°C
pH: Not applicable
`;

  try {
    const result = await pipeline.processSDSText(sampleSDS, {
      selectedState: 'TX',
      wasteSource: 'laboratory cleaning'
    });

    res.json({
      message: 'Test processing completed',
      sample: sampleSDS,
      result: result
    });
  } catch (error) {
    res.status(500).json({
      message: 'Test failed - likely missing API keys',
      error: error.message,
      sample: sampleSDS
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 SDS Classification Server Started');
  console.log('═'.repeat(50));
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`📋 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📡 Available Endpoints:');
  console.log('  POST /api/classify/file     - Upload SDS file');
  console.log('  POST /api/classify/text     - Submit SDS text');
  console.log('  POST /api/classify/batch    - Upload multiple files');
  console.log('  GET  /api/stats            - Processing statistics');
  console.log('  GET  /api/codes            - Supported waste codes');
  console.log('  GET  /api/test             - Test with sample data');
  console.log('');
  console.log('🔑 API Keys Status:');
  console.log(`  Groq: ${process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Gemini: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log('═'.repeat(50));
});

export default app;