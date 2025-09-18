// PyMuPDF Service for Node.js Backend
// Clean, local PDF text extraction using PyMuPDF
// Replaces all complex fallback chains with single, reliable method

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fixedPDFExtractor from './fixedPDFExtractor.js';

class PyMuPDFService {
  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.pythonScript = path.join(__dirname, 'pymupdf_extractor.py');
    console.log('🐍 PyMuPDF Service initialized - USING FIXED PDF EXTRACTOR');
  }

  /**
   * Extract text from PDF using Fixed PDF Extractor (reliable pdf-parse)
   * @param {string} pdfPath - Path to PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(pdfPath) {
    console.log(`🔍 PyMuPDF (via Fixed PDF Extractor) extracting text from: ${pdfPath}`);
    
    try {
      // Delegate to Fixed PDF Extractor service (direct pdf-parse, no hardcoded paths)
      const result = await fixedPDFExtractor.extractText(pdfPath);
      
      if (result.success) {
        console.log(`✅ PyMuPDF extraction successful: ${result.totalCharacters} characters from ${result.metadata.pageCount} pages`);
        console.log(`📄 Preview: "${result.text.slice(0, 200)}..."`);
      } else {
        console.error(`❌ PyMuPDF extraction failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ PyMuPDF service error: ${error.message}`);
      return {
        success: false,
        error: `PyMuPDF extraction failed: ${error.message}`,
        text: '',
        metadata: {}
      };
    }
  }

  /**
   * Simple wrapper for backward compatibility
   * Returns just the text string like current methods expect
   */
  async getTextOnly(pdfPath) {
    const result = await this.extractText(pdfPath);
    
    if (result.success && result.text) {
      return result.text;
    } else {
      console.error(`❌ PyMuPDF text extraction failed: ${result.error}`);
      throw new Error(`PDF text extraction failed: ${result.error}`);
    }
  }

  /**
   * Enhanced extraction with metadata for advanced use cases
   */
  async extractWithMetadata(pdfPath) {
    const result = await this.extractText(pdfPath);
    
    if (!result.success) {
      throw new Error(`PDF extraction failed: ${result.error}`);
    }
    
    return {
      text: result.text,
      metadata: result.metadata,
      pages: result.pages,
      totalCharacters: result.totalCharacters,
      method: 'PyMuPDF'
    };
  }

  /**
   * Health check for the PyMuPDF service
   */
  async healthCheck() {
    try {
      const python = spawn('python', ['-c', 'import fitz; print("PyMuPDF available")']);
      
      return new Promise((resolve) => {
        let output = '';
        
        python.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        python.on('close', (code) => {
          if (code === 0 && output.includes('PyMuPDF available')) {
            console.log('✅ PyMuPDF health check passed');
            resolve({ healthy: true, message: 'PyMuPDF is ready' });
          } else {
            console.log('❌ PyMuPDF health check failed');
            resolve({ healthy: false, message: 'PyMuPDF not available' });
          }
        });
      });
    } catch (error) {
      console.log('❌ PyMuPDF health check error:', error.message);
      return { healthy: false, message: error.message };
    }
  }
}

// Export singleton instance
const pymupdfService = new PyMuPDFService();

export default pymupdfService;