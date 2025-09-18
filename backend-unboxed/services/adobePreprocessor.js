// File: backend/services/adobePreprocessor.js
import adobePdfServices from './adobePdfServices.js';
import fs from 'fs';
import path from 'path';

class AdobePreprocessor {
  constructor() {
    this.debug = true;
    this.adobePaths = {
      // Common Adobe Acrobat installation paths
      acrobat: [
        'C:\\Program Files\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe',
        'C:\\Program Files (x86)\\Adobe\\Acrobat DC\\Acrobat\\Acrobat.exe',
        'C:\\Program Files\\Adobe\\Acrobat\\Acrobat.exe',
        'C:\\Program Files (x86)\\Adobe\\Acrobat\\Acrobat.exe'
      ]
    };
    
    this.tempDir = path.join(process.cwd(), 'temp', 'adobe');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      if (this.debug) console.log('📁 Created Adobe temp directory:', this.tempDir);
    }
  }

  /**
   * Find Adobe Acrobat installation
   */
  async findAdobeAcrobat() {
    for (const acrobatPath of this.adobePaths.acrobat) {
      if (fs.existsSync(acrobatPath)) {
        if (this.debug) console.log('✅ Found Adobe Acrobat:', acrobatPath);
        return acrobatPath;
      }
    }
    
    // Try to find via registry or PATH
    try {
      const { stdout } = await execAsync('where acrobat');
      const foundPath = stdout.trim();
      if (foundPath) {
        if (this.debug) console.log('✅ Found Adobe Acrobat via PATH:', foundPath);
        return foundPath;
      }
    } catch (error) {
      // Ignore error, continue searching
    }
    
    if (this.debug) console.log('❌ Adobe Acrobat not found');
    return null;
  }

  /**
   * Enhanced PDF preprocessing using Adobe PDF Services API
   */
  async preprocessPDF(inputPdfPath, options = {}) {
    const startTime = Date.now();
    
    if (this.debug) {
      console.log('🚀 Adobe PDF Services Preprocessing Started');
      console.log('📄 Input PDF:', inputPdfPath);
    }

    try {
      // Check if Adobe PDF Services is configured
      if (!adobePdfServices.isConfigured()) {
        if (this.debug) console.log('⚠️ Adobe PDF Services not configured');
        return { 
          success: false, 
          reason: 'Adobe PDF Services not configured. Please add PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET to .env',
          originalFile: inputPdfPath 
        };
      }

      // Use Adobe PDF Services for enhanced extraction
      const extractionResult = await adobePdfServices.extractTextAndTables(inputPdfPath);
      
      if (extractionResult.success) {
        const processingTime = Date.now() - startTime;
        
        if (this.debug) {
          console.log('✅ Adobe PDF Services preprocessing completed');
          console.log('⏱️ Total processing time:', processingTime + 'ms');
          console.log('📈 Enhanced text length:', extractionResult.enhancedText.length);
          console.log('📊 Tables extracted:', extractionResult.tables.length);
          
          // COMPREHENSIVE PREPROCESSING DEBUG: Show ALL extracted content with highlighting
          console.log('\n' + '='.repeat(80));
          console.log('🔍 COMPLETE ADOBE PREPROCESSING RESULTS');
          console.log('='.repeat(80));
          
          const fullText = extractionResult.enhancedText || '';
          console.log(fullText);
          
          console.log('\n' + '='.repeat(80));
          console.log('🎯 CRITICAL PROPERTY EXTRACTION HIGHLIGHTS (PREPROCESSING)');
          console.log('='.repeat(80));
          
          if (extractionResult.criticalProperties) {
            Object.keys(extractionResult.criticalProperties).forEach(prop => {
              const data = extractionResult.criticalProperties[prop];
              console.log(`\n🔸 ${prop.toUpperCase()}:`);
              console.log(`   Value: ${data.value || data.celsius}`);
              console.log(`   Source Text: "${data.original}"`);
              console.log(`   Context: ${data.contextHighlight || data.context}`);
              console.log(`   Confidence: ${data.confidence}`);
              if (data.source) console.log(`   Extraction Method: ${data.source}`);
            });
          } else {
            console.log('⚠️ No critical properties found in extraction result');
          }
          
          console.log('\n' + '='.repeat(80));
          console.log('📋 SDS SECTIONS DETECTED (PREPROCESSING)');
          console.log('='.repeat(80));
          
          if (extractionResult.structuredSections) {
            Object.keys(extractionResult.structuredSections).forEach(section => {
              console.log(`\n📂 ${section}:`);
              console.log(extractionResult.structuredSections[section]);
            });
          } else {
            console.log('⚠️ No structured sections found in extraction result');
          }
          
          console.log('='.repeat(80) + '\n');
        }

        return {
          success: true,
          enhancedText: `=== ADOBE PDF SERVICES ENHANCED ===\n${extractionResult.enhancedText}\n=== END ADOBE ENHANCED ===`,
          processingTime: processingTime,
          hasTableData: extractionResult.hasTables,
          method: 'adobe_pdf_services',
          tables: extractionResult.tables,
          structuredData: extractionResult.structuredData,
          criticalProperties: extractionResult.criticalProperties,
          structuredSections: extractionResult.structuredSections
        };
      } else {
        return extractionResult; // Return the error result from Adobe PDF Services
      }

    } catch (error) {
      if (this.debug) {
        console.error('❌ Adobe PDF Services preprocessing error:', error.message);
      }
      
      return {
        success: false,
        error: error.message,
        originalFile: inputPdfPath,
        fallbackRequired: true
      };
    }
  }

  /**
   * Perform OCR on PDF using Adobe Acrobat
   */
  async performOCR(adobePath, inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        // Adobe Acrobat command-line OCR
        // Note: This may need adjustment based on your Adobe version
        const args = [
          '/h',  // Hide window
          `/t`, inputPath,  // Input file
          `/o`, outputPath, // Output file with OCR
        ];

        const process = spawn(adobePath, args, { stdio: 'pipe' });
        
        let stderr = '';
        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0 || fs.existsSync(outputPath)) {
            resolve(outputPath);
          } else {
            // OCR might not be necessary if already text-based
            if (this.debug) console.log('ℹ️ OCR not applied (already text-based PDF)');
            resolve(null);
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          process.kill();
          resolve(null);
        }, 30000);

      } catch (error) {
        if (this.debug) console.log('⚠️ OCR error (continuing):', error.message);
        resolve(null);
      }
    });
  }

  /**
   * Extract structured text using Adobe
   */
  async extractStructuredText(adobePath, inputPath, outputPath) {
    try {
      // Alternative approach: Use Adobe's export to text functionality
      // This preserves better structure than standard PDF.js
      
      // For now, we'll use a simpler approach that works with most Adobe versions
      // You may need to adjust based on your specific Adobe Acrobat version
      
      const tempScript = path.join(this.tempDir, 'extract_text.js');
      
      // Adobe JavaScript for text extraction
      const jsScript = `
        try {
          this.saveAs({
            cPath: "${outputPath.replace(/\\/g, '\\\\')}",
            cConvID: "com.adobe.acrobat.accesstext"
          });
          console.println("Text extraction completed");
        } catch(e) {
          console.println("Error: " + e.toString());
        }
      `;
      
      fs.writeFileSync(tempScript, jsScript);
      
      // Execute the script (if supported)
      await execAsync(`"${adobePath}" /n /s /o /h "${inputPath}"`);
      
      // Read extracted text if available
      if (fs.existsSync(outputPath)) {
        const text = fs.readFileSync(outputPath, 'utf8');
        fs.unlinkSync(tempScript);
        return text;
      }
      
      return '';
      
    } catch (error) {
      if (this.debug) console.log('⚠️ Structured text extraction error:', error.message);
      return '';
    }
  }

  /**
   * Extract tables from PDF
   */
  async extractTables(adobePath, inputPath, outputPath) {
    try {
      // Adobe table extraction (simplified approach)
      // This would need specific Adobe scripting based on your version
      
      // For now, return empty - this is where you'd implement
      // Adobe's table extraction functionality
      return [];
      
    } catch (error) {
      if (this.debug) console.log('⚠️ Table extraction error:', error.message);
      return [];
    }
  }

  /**
   * Combine extraction results into enhanced text
   */
  combineExtractionResults(extractedText, tableData) {
    let enhancedText = extractedText || '';
    
    // Add table data as structured text
    if (tableData && tableData.length > 0) {
      enhancedText += '\n\n=== EXTRACTED TABLES ===\n';
      tableData.forEach((table, index) => {
        enhancedText += `\nTable ${index + 1}:\n${table}\n`;
      });
    }
    
    // Add processing markers for your custom engine
    enhancedText = `=== ADOBE ENHANCED ===\n${enhancedText}\n=== END ADOBE ===`;
    
    return enhancedText;
  }

  /**
   * Cleanup temporary files
   */
  cleanupTempFiles(filePaths) {
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          if (this.debug) console.log('🧹 Cleaned up:', path.basename(filePath));
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  }

  /**
   * Check if Adobe preprocessing is available
   */
  async isAvailable() {
    const adobePath = await this.findAdobeAcrobat();
    return adobePath !== null;
  }
}

// Export singleton instance
const adobePreprocessor = new AdobePreprocessor();
export default adobePreprocessor;