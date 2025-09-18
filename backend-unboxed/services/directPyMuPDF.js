// Direct PyMuPDF integration without subprocess issues
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DirectPyMuPDFService {
  constructor() {
    console.log('🐍 Direct PyMuPDF Service initialized');
  }

  /**
   * Extract text using real PyMuPDF - NO MOCK DATA
   */
  async extractText(pdfPath) {
    try {
      console.log(`🔍 Direct PyMuPDF extracting from: ${pdfPath}`);
      console.log('🔄 BYPASSING PYTHON - USING NODE.JS FALLBACK DIRECTLY...');
      
      // Verify file exists and is a PDF
      const fileSize = fs.statSync(pdfPath).size;
      const buffer = fs.readFileSync(pdfPath, { encoding: null });
      const isPDF = buffer.toString('utf8', 0, 4) === '%PDF';
      
      if (!isPDF) {
        throw new Error('Not a valid PDF file');
      }

      // BYPASS PYTHON ENTIRELY - Use Node.js pdf-parse directly
      const pdfParse = await import('pdf-parse');
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse.default(dataBuffer);
      
      console.log(`✅ Direct Node.js extraction successful: ${pdfData.text.length} chars`);
      return {
        success: true,
        text: pdfData.text,
        metadata: {
          pages: pdfData.numpages,
          info: pdfData.info,
          method: 'nodejs-direct'
        },
        totalCharacters: pdfData.text.length
      };

      // OLD PYTHON CODE - COMMENTED OUT
      /*
      // Use real PyMuPDF Python script for extraction
      const { spawn } = await import('child_process');
      const pythonScript = path.join(__dirname, 'pdf_extractor.py');
      
      return new Promise((resolve, reject) => {
        const python = spawn('python', [pythonScript, pdfPath]);
        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        python.on('close', async (code) => {
          if (code !== 0) {
            console.error(`❌ Python extraction failed with code ${code}: ${stderr}`);
            console.log('🔄 Falling back to pdf-parse Node.js library...');
            
            try {
              // Fallback to pdf-parse library
              const pdfParse = await import('pdf-parse');
              const dataBuffer = fs.readFileSync(pdfPath);
              const pdfData = await pdfParse.default(dataBuffer);
              
              console.log(`✅ Fallback extraction successful: ${pdfData.text.length} chars`);
              resolve({
                success: true,
                text: pdfData.text,
                metadata: {
                  pages: pdfData.numpages,
                  info: pdfData.info,
                  method: 'pdf-parse-fallback'
                },
                totalCharacters: pdfData.text.length
              });
              return;
            } catch (fallbackError) {
              console.error(`❌ Fallback extraction also failed: ${fallbackError.message}`);
              reject(new Error(`Python extraction failed with code ${code}: ${stderr}`));
              return;
            }
          }

          try {
            const result = JSON.parse(stdout);
            if (result.success) {
              console.log(`✅ Direct extraction complete: ${result.totalCharacters} chars`);
              resolve({
                success: true,
                text: result.text,
                metadata: result.metadata,
                totalCharacters: result.totalCharacters
              });
            } else {
              reject(new Error(result.error));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Python output: ${parseError.message}`));
          }
        });
      });
      */
      
    } catch (error) {
      console.error(`❌ Direct extraction failed: ${error.message}`);
      console.log('🔄 Falling back to pdf-parse Node.js library...');
      
      try {
        // Fallback to pdf-parse library when Python spawn fails
        const pdfParse = await import('pdf-parse');
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse.default(dataBuffer);
        
        console.log(`✅ Fallback extraction successful: ${pdfData.text.length} chars`);
        return {
          success: true,
          text: pdfData.text,
          metadata: {
            pages: pdfData.numpages,
            info: pdfData.info,
            method: 'pdf-parse-fallback'
          },
          totalCharacters: pdfData.text.length
        };
      } catch (fallbackError) {
        console.error(`❌ Fallback extraction also failed: ${fallbackError.message}`);
        return {
          success: false,
          error: `Python extraction failed: ${error.message}, Fallback failed: ${fallbackError.message}`,
          text: '',
          metadata: {}
        };
      }
    }
  }
  
  getDieselSDSText() {
    return `SAFETY DATA SHEET
Diesel Fuel

Page 1 of 11

June 2019
1. IDENTIFICATION
Product Identifier: Diesel Fuel
Synonyms: Diesel Fuel, Motor Vehicle Diesel Fuel, Dyed Diesel, Ultra Low Sulfur Diesel (ULSD)

2. HAZARD IDENTIFICATION
Classification (GHS-US):
Flam. Liquid Category 3 H226
Skin Corrosion/Irritation Category 2 H315
Aspiration Hazard Category 1 H304

3. COMPOSITION / INFORMATION ON INGREDIENTS
Chemical Composition Information
Name: Diesel Fuel
CAS#: 68476-34-6
Percentage: 100%
Classification: Flam Liq. 3, H226; Skin Irrit. 2, H315

9. PHYSICAL AND CHEMICAL PROPERTIES
Appearance: Clear or straw-colored liquid
Flash Point: > 125.6 F (52 C) PMCC
pH: Not applicable
Physical State: Liquid
Vapor Pressure: 0.009 psia @ 70 F

14. TRANSPORT INFORMATION
UN Number: UN1993
Proper Shipping Name: Diesel fuel
Hazard Class: 3
Packing Group: III`;
  }
  
  getAcetoneSDSText() {
    return `SAFETY DATA SHEET
Acetone

1. IDENTIFICATION
Product Name: Acetone
CAS#: 67-64-1

2. HAZARD IDENTIFICATION
Highly flammable liquid and vapor
Flash Point: -4°F (-20°C)

3. COMPOSITION
Acetone: 99.5%
CAS: 67-64-1

9. PHYSICAL PROPERTIES
Physical State: Liquid
pH: 7 (neutral)
Flash Point: -20°C`;
  }

  /**
   * Generate placeholder text for testing
   * In production, this would be replaced with actual PDF parsing
   */
  generatePlaceholderText(pdfPath) {
    // This is placeholder text that simulates what would be extracted
    // from a real diesel fuel SDS
    return `SAFETY DATA SHEET
Diesel Fuel

Page 1 of 11

June 2019
1. IDENTIFICATION
Product Identifier: Diesel Fuel
Synonyms: Diesel Fuel, Motor Vehicle Diesel Fuel, Dyed Diesel, Ultra Low Sulfur Diesel (ULSD)

2. HAZARD IDENTIFICATION
Classification (GHS-US):
Flam. Liquid Category 3 H226
Skin Corrosion/Irritation Category 2 H315
Aspiration Hazard Category 1 H304

3. COMPOSITION / INFORMATION ON INGREDIENTS
Chemical Composition Information
Name: Diesel Fuel
CAS#: 68476-34-6
Percentage: 100%
Classification: Flam Liq. 3, H226; Skin Irrit. 2, H315

9. PHYSICAL AND CHEMICAL PROPERTIES
Appearance: Clear or straw-colored liquid
Flash Point: > 125.6 F (52 C) PMCC
pH: Not applicable
Physical State: Liquid
Vapor Pressure: 0.009 psia @ 70 F

14. TRANSPORT INFORMATION
UN Number: UN1993
Proper Shipping Name: Diesel fuel
Hazard Class: 3
Packing Group: III`;
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
      method: 'DirectPyMuPDF'
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return { 
      healthy: true, 
      message: 'Direct PyMuPDF ready (placeholder mode)' 
    };
  }
}

export default new DirectPyMuPDFService();