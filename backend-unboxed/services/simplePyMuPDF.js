// Simplified PyMuPDF Service - Direct approach for Windows compatibility
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class SimplePyMuPDFService {
  constructor() {
    console.log('🐍 Simple PyMuPDF Service initialized');
  }

  /**
   * Extract text from PDF using direct execSync approach
   */
  async extractText(pdfPath) {
    try {
      console.log(`🔍 Simple PyMuPDF extracting text from: ${pdfPath}`);
      
      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      // Use execSync for more reliable Windows execution  
      const __filename = import.meta.url.replace('file:///', '');
      const __dirname = path.dirname(__filename);
      const scriptPath = path.join(__dirname, 'pymupdf_extractor.py');
      const absolutePdfPath = path.resolve(pdfPath);
      const absoluteScriptPath = path.resolve(scriptPath);
      
      console.log(`📄 Script: ${absoluteScriptPath}`);
      console.log(`📄 PDF: ${absolutePdfPath}`);
      
      // Execute Python script synchronously
      const command = `python "${absoluteScriptPath}" "${absolutePdfPath}"`;
      console.log(`🐍 Executing: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      console.log(`✅ Python execution successful, output length: ${output.length}`);
      
      // Parse JSON response
      const result = JSON.parse(output);
      
      if (result.success) {
        console.log(`✅ PyMuPDF extraction successful: ${result.totalCharacters} chars from ${result.metadata.pageCount} pages`);
      } else {
        console.error(`❌ PyMuPDF extraction failed: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Simple PyMuPDF extraction failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: {}
      };
    }
  }

  /**
   * Enhanced extraction with metadata
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
      method: 'SimplePyMuPDF'
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Simple Python availability check
      execSync('python -c "import fitz; print(\\"PyMuPDF available\\")"', { 
        encoding: 'utf8',
        timeout: 5000 
      });
      console.log('✅ Simple PyMuPDF health check passed');
      return { healthy: true, message: 'Simple PyMuPDF is ready' };
    } catch (error) {
      console.log('❌ Simple PyMuPDF health check failed:', error.message);
      return { healthy: false, message: error.message };
    }
  }
}

export default new SimplePyMuPDFService();