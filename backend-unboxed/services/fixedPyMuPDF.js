// Fixed PyMuPDF service that bypasses Python entirely
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FixedPyMuPDFService {
  constructor() {
    console.log('🔧 Fixed PyMuPDF Service initialized - Node.js only');
  }

  async extractText(pdfPath) {
    try {
      console.log(`🔍 Fixed extraction from: ${pdfPath}`);
      
      // Verify file exists and is a PDF
      const fileSize = fs.statSync(pdfPath).size;
      const buffer = fs.readFileSync(pdfPath, { encoding: null });
      const isPDF = buffer.toString('utf8', 0, 4) === '%PDF';
      
      if (!isPDF) {
        throw new Error('Not a valid PDF file');
      }

      // Use Node.js pdf-parse directly
      const pdfParse = await import('pdf-parse');
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse.default(dataBuffer);
      
      console.log(`✅ Fixed extraction successful: ${pdfData.text.length} chars`);
      return {
        success: true,
        text: pdfData.text,
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info,
          method: 'nodejs-fixed'
        },
        totalCharacters: pdfData.text.length
      };
      
    } catch (error) {
      console.error(`❌ Fixed extraction failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        text: '',
        metadata: {}
      };
    }
  }
  
  async extractWithMetadata(pdfPath) {
    const result = await this.extractText(pdfPath);
    
    if (!result.success) {
      throw new Error(`PDF extraction failed: ${result.error}`);
    }
    
    return {
      text: result.text,
      metadata: result.metadata,
      pages: result.metadata.pages,
      totalCharacters: result.totalCharacters
    };
  }
}

export default new FixedPyMuPDFService();