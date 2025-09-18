// FIXED PDF Extractor Service - No hardcoded paths, direct pdf-parse usage
// This replaces the broken directPyMuPDF service

import fs from 'fs';

class FixedPDFExtractor {
  constructor() {
    console.log('🔧 Fixed PDF Extractor Service initialized');
  }

  /**
   * Extract text from PDF using pdf-parse with proper error handling
   * @param {string} pdfPath - Full path to PDF file
   * @returns {Promise<Object>} Extraction result
   */
  async extractText(pdfPath) {
    console.log(`🔍 Fixed PDF Extractor processing: ${pdfPath}`);
    
    try {
      // Verify file exists and is accessible
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file does not exist: ${pdfPath}`);
      }
      
      const stats = fs.statSync(pdfPath);
      console.log(`📊 File size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      // Read file buffer
      const dataBuffer = fs.readFileSync(pdfPath);
      console.log(`📁 Buffer loaded: ${dataBuffer.length} bytes`);
      
      // Verify it's a valid PDF
      const pdfHeader = dataBuffer.toString('utf8', 0, 5);
      if (!pdfHeader.startsWith('%PDF')) {
        throw new Error(`Not a valid PDF file (header: "${pdfHeader}")`);
      }
      
      // Import pdf-parse dynamically
      const pdfParse = await import('pdf-parse');
      console.log('📦 pdf-parse module loaded');
      
      // Extract text with pdf-parse
      const pdfData = await pdfParse.default(dataBuffer);
      
      const result = {
        success: true,
        text: pdfData.text,
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info,
          method: 'fixed-pdf-parse'
        },
        totalCharacters: pdfData.text.length,
        extractedPath: pdfPath // Include for verification
      };
      
      console.log(`✅ Fixed PDF extraction successful:`);
      console.log(`   Pages: ${pdfData.numpages}`);
      console.log(`   Characters: ${pdfData.text.length}`);
      console.log(`   Preview: "${pdfData.text.slice(0, 100)}..."`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Fixed PDF extraction failed: ${error.message}`);
      
      return {
        success: false,
        error: `PDF extraction failed: ${error.message}`,
        text: '',
        metadata: {},
        totalCharacters: 0,
        extractedPath: pdfPath
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
      pages: result.metadata.pages,
      totalCharacters: result.totalCharacters,
      method: 'FixedPDFExtractor'
    };
  }

  /**
   * Health check for the PDF extraction service
   */
  async healthCheck() {
    try {
      // Test pdf-parse import
      const pdfParse = await import('pdf-parse');
      console.log('✅ Fixed PDF Extractor health check passed');
      return { 
        healthy: true, 
        message: 'Fixed PDF Extractor ready with pdf-parse',
        version: 'fixed-1.0.0'
      };
    } catch (error) {
      console.log('❌ Fixed PDF Extractor health check failed:', error.message);
      return { 
        healthy: false, 
        message: error.message,
        version: 'fixed-1.0.0'
      };
    }
  }
}

// Export singleton instance
const fixedPDFExtractor = new FixedPDFExtractor();

export default fixedPDFExtractor;