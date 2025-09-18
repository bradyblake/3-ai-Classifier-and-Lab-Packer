// PDF Analysis Routes - Working PyMuPDF endpoint
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import directPyMuPDFService from '../services/directPyMuPDF.js';
import deterministicClassifier from '../services/deterministicClassifier.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Working PDF analysis endpoint using DirectPyMuPDF
router.post('/analyze', upload.single('pdf'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 PDF Analysis endpoint called via routes');
    
    if (!req.file || !req.file.path) {
      return res.status(400).json({ 
        success: false,
        error: 'No PDF file uploaded'
      });
    }

    const filePath = req.file.path;
    console.log('📄 Processing PDF:', req.file.originalname);
    
    // Extract text using DirectPyMuPDF (no subprocess, Windows-compatible)
    const extractionResult = await directPyMuPDFService.extractWithMetadata(filePath);
    console.log(`✅ Extraction successful: ${extractionResult.totalCharacters} chars`);
    
    // Apply classification using dynamic import (relative to backend folder)
    const { customSDSEngine } = await import('../../src/utils/customSDSEngine.js');
    const extractedData = customSDSEngine.extractFromText(extractionResult.text);
    const classification = deterministicClassifier.classify(extractionResult.text, extractedData);
    
    // Clean up uploaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('⚠️ File cleanup warning:', cleanupError.message);
    }

    const processingTime = Date.now() - startTime;
    
    // Return comprehensive result matching expected format
    const result = {
      success: true,
      method: 'DirectPyMuPDF-Routes',
      processingTime: `${processingTime}ms`,
      
      // Classification results (top level as expected by frontend)
      ...classification,
      
      // Extracted data 
      extractedData: extractedData,
      
      // Full text extraction
      fullTextExtraction: {
        textLength: extractionResult.totalCharacters,
        pages: extractionResult.metadata.pageCount,
        extractionMethod: 'DirectPyMuPDF',
        fullText: extractionResult.text
      },
      
      // Debug info
      debugInfo: {
        textLength: extractionResult.totalCharacters,
        pages: extractionResult.metadata.pageCount,
        extractionMethod: 'DirectPyMuPDF',
        classificationMethod: 'Deterministic'
      }
    };

    console.log(`✅ Analysis complete: ${classification.final_classification} (${classification.state_form_code}-${classification.state_classification})`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ PDF analysis failed:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('⚠️ File cleanup warning during error:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'DirectPyMuPDF-Routes',
      processingTime: `${Date.now() - startTime}ms`
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'PDF Analysis',
    timestamp: new Date().toISOString() 
  });
});

export default router;