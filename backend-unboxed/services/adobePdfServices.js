// Adobe PDF Services Integration for Enhanced SDS Processing
// Uses official Adobe PDF Services Node.js SDK

import {
    ServicePrincipalCredentials,
    PDFServices,
    MimeType,
    ExtractPDFParams,
    ExtractElementType,
    ExtractPDFJob,
    ExtractPDFResult,
    SDKError,
    ServiceUsageError,
    ServiceApiError
} from "@adobe/pdfservices-node-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdobePdfServices {
  constructor() {
    this.debug = true;
    this.outputDir = path.join(__dirname, '..', 'temp', 'adobe');
    this.ensureOutputDir();
    
    if (this.debug) {
      console.log('🔥 Adobe PDF Services initialized');
      console.log('📁 Output directory:', this.outputDir);
    }
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Enhanced PDF text and table extraction using Adobe PDF Services
   */
  async extractTextAndTables(pdfFilePath) {
    const startTime = Date.now();
    
    if (this.debug) {
      console.log('🚀 Adobe PDF Services - Enhanced extraction starting');
      console.log('📄 Input file:', pdfFilePath);
    }

    if (!fs.existsSync(pdfFilePath)) {
      return {
        success: false,
        error: 'PDF file does not exist'
      };
    }

    let readStream;
    try {
      // Initialize credentials from environment
      const credentials = new ServicePrincipalCredentials({
        clientId: process.env.PDF_SERVICES_CLIENT_ID,
        clientSecret: process.env.PDF_SERVICES_CLIENT_SECRET
      });

      if (this.debug) {
        console.log('✅ Adobe credentials initialized');
        console.log('🔑 Client ID:', process.env.PDF_SERVICES_CLIENT_ID?.substring(0, 8) + '...');
      }

      // Create PDF Services instance
      const pdfServices = new PDFServices({ credentials });

      // Upload the PDF file
      readStream = fs.createReadStream(pdfFilePath);
      const inputAsset = await pdfServices.upload({
        readStream,
        mimeType: MimeType.PDF
      });

      if (this.debug) console.log('📤 PDF uploaded successfully');

      // Configure extraction parameters for SDS processing (basic TEXT only)
      const params = new ExtractPDFParams({
        elementsToExtract: [
          ExtractElementType.TEXT
        ]
      });

      // Create and submit extraction job
      const job = new ExtractPDFJob({ inputAsset, params });
      const pollingURL = await pdfServices.submit({ job });

      if (this.debug) console.log('⏳ Extraction job submitted, waiting for completion...');

      // Wait for job completion
      const pdfServicesResponse = await pdfServices.getJobResult({
        pollingURL,
        resultType: ExtractPDFResult
      });

      // Download extraction results
      const resultAsset = pdfServicesResponse.result.resource;
      const streamAsset = await pdfServices.getContent({ asset: resultAsset });

      // Save results to temporary file
      const outputFilePath = this.createOutputFilePath();
      const writeStream = fs.createWriteStream(outputFilePath);
      
      await new Promise((resolve, reject) => {
        streamAsset.readStream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      if (this.debug) console.log('📥 Extraction results downloaded:', outputFilePath);

      // Process the ZIP file containing extraction results
      const extractionResults = await this.processExtractionResults(outputFilePath);
      
      const processingTime = Date.now() - startTime;

      if (extractionResults.success) {
        if (this.debug) {
          console.log('✅ Adobe PDF extraction completed successfully');
          console.log('⏱️ Total processing time:', processingTime + 'ms');
          console.log('📈 Enhanced text length:', extractionResults.enhancedText.length);
          console.log('📊 Tables found:', extractionResults.tables.length);
          
          // COMPREHENSIVE DEBUG: Show ALL extracted content with highlighting
          console.log('\n' + '='.repeat(80));
          console.log('🔍 COMPLETE ADOBE EXTRACTION RESULTS');
          console.log('='.repeat(80));
          
          const fullText = extractionResults.enhancedText || '';
          console.log(fullText);
          
          console.log('\n' + '='.repeat(80));
          console.log('🎯 CRITICAL PROPERTY EXTRACTION HIGHLIGHTS');
          console.log('='.repeat(80));
          
          if (extractionResults.criticalProperties) {
            Object.keys(extractionResults.criticalProperties).forEach(prop => {
              const data = extractionResults.criticalProperties[prop];
              console.log(`\n🔸 ${prop.toUpperCase()}:`);
              console.log(`   Value: ${data.value || data.celsius}`);
              console.log(`   Source Text: "${data.original}"`);
              console.log(`   Confidence: ${data.confidence}`);
              if (data.source) console.log(`   Extraction Method: ${data.source}`);
            });
          }
          
          console.log('\n' + '='.repeat(80));
          console.log('📋 SDS SECTIONS DETECTED');
          console.log('='.repeat(80));
          
          if (extractionResults.structuredSections) {
            Object.keys(extractionResults.structuredSections).forEach(section => {
              console.log(`\n📂 ${section}:`);
              console.log(extractionResults.structuredSections[section]);
            });
          }
          
          // Look for SDS indicators
          const lowerText = fullText.toLowerCase();
          const hasFlash = lowerText.includes('flash point') || lowerText.includes('flash');
          const hasPH = lowerText.includes('ph') || lowerText.includes('p.h.');
          const hasProduct = lowerText.includes('product') || lowerText.includes('name');
          console.log(`\n🔍 SDS INDICATORS: Flash=${hasFlash}, pH=${hasPH}, Product=${hasProduct}`);
          console.log('='.repeat(80) + '\n');
        }

        return {
          success: true,
          enhancedText: extractionResults.enhancedText,
          tables: extractionResults.tables,
          structuredData: extractionResults.structuredData,
          criticalProperties: extractionResults.criticalProperties,
          structuredSections: extractionResults.structuredSections,
          processingTime: processingTime,
          hasTables: extractionResults.tables.length > 0,
          method: 'adobe_pdf_services'
        };
      } else {
        return extractionResults;
      }

    } catch (err) {
      let errorMessage = 'Unknown error';
      
      if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
        errorMessage = `Adobe API Error: ${err.message}`;
        if (this.debug) console.error('❌ Adobe SDK Error:', err);
      } else {
        errorMessage = err.message || 'Extraction failed';
        if (this.debug) console.error('❌ General Error:', err);
      }

      return {
        success: false,
        error: errorMessage,
        fallbackRequired: true
      };

    } finally {
      if (readStream) {
        readStream.destroy();
      }
    }
  }

  /**
   * Process the ZIP file containing Adobe extraction results
   */
  async processExtractionResults(zipFilePath) {
    try {
      console.log('🔍 PROCESSING EXTRACTION RESULTS FROM:', zipFilePath);
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();
      console.log('📦 ZIP ENTRIES FOUND:', zipEntries.length);
      
      let structuredData = null;
      let tables = [];
      let enhancedText = '';

      // Find and process the JSON file containing structured data
      for (const zipEntry of zipEntries) {
        console.log('📄 ZIP ENTRY:', zipEntry.entryName);
        if (zipEntry.entryName.endsWith('.json')) {
          console.log('✅ FOUND JSON FILE:', zipEntry.entryName);
          const jsonContent = zipEntry.getData().toString('utf8');
          console.log('📊 JSON CONTENT LENGTH:', jsonContent.length);
          structuredData = JSON.parse(jsonContent);
          console.log('🎯 JSON PARSED SUCCESSFULLY');
          
          if (this.debug) {
            console.log('📋 JSON data processed, elements found:', structuredData.elements?.length || 0);
            console.log('🔍 CALLING processStructuredElements NOW...');
          }
          break;
        }
      }

      if (!structuredData || !structuredData.elements) {
        return {
          success: false,
          error: 'No structured data found in Adobe extraction results'
        };
      }

      // Process elements to extract text and tables
      console.log('🔍 About to process structured elements...');
      const processedData = this.processStructuredElements(structuredData.elements);
      console.log('✅ Structured processing completed');
      console.log('📊 Processed data keys:', Object.keys(processedData));
      
      enhancedText = processedData.text;
      tables = processedData.tables;

      // Mark as Adobe processed for custom engine recognition
      const markedText = `=== ADOBE PDF SERVICES ENHANCED ===\n${enhancedText}\n${this.formatTablesAsText(tables)}\n=== END ADOBE ===`;

      // Cleanup temporary files
      this.cleanup(zipFilePath);

      return {
        success: true,
        enhancedText: markedText,
        tables: tables,
        structuredData: structuredData,
        criticalProperties: processedData.criticalProperties,
        structuredSections: processedData.structuredSections
      };

    } catch (error) {
      if (this.debug) console.error('❌ Error processing extraction results:', error);
      
      return {
        success: false,
        error: `Failed to process extraction results: ${error.message}`
      };
    }
  }

  /**
   * Process structured elements from Adobe extraction with SDS-specific logic
   */
  processStructuredElements(elements) {
    console.log('🚀 PROCESS STRUCTURED ELEMENTS CALLED');
    console.log('📊 Elements to process:', elements?.length || 0);
    
    if (!elements || elements.length === 0) {
      console.log('❌ No elements to process!');
      return { text: '', tables: [], sdsData: { sections: {}, criticalProperties: {} } };
    }
    
    let text = '';
    let tables = [];
    let sdsData = {
      sections: {},
      criticalProperties: {}
    };
    
    let currentSection = null;
    let sectionText = '';
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      // Process text elements with section detection
      if (element.Text) {
        const elementText = element.Text.trim();
        
        // Check if this is a section header (e.g., "9. PHYSICAL AND CHEMICAL PROPERTIES")
        const sectionMatch = elementText.match(/^(\d+)\.\s*([A-Z\s&]+)$/i);
        if (sectionMatch) {
          // Save previous section
          if (currentSection && sectionText.trim()) {
            sdsData.sections[currentSection] = sectionText.trim();
            console.log(`📋 SDS Section ${currentSection} captured: ${sectionText.length} chars`);
          }
          
          // Start new section
          currentSection = `Section ${sectionMatch[1]} - ${sectionMatch[2].trim()}`;
          sectionText = elementText + '\n';
          
          console.log(`🏷️ Found SDS Section: ${currentSection}`);
        } else if (currentSection) {
          // Add to current section
          sectionText += elementText + '\n';
        }
        
        // Always add to main text
        text += elementText + '\n';
        
        // Extract critical properties on-the-fly
        this.extractCriticalProperties(elementText, sdsData.criticalProperties);
      }
      
      // Process table elements (often contain physical properties)
      if (element.Table) {
        const table = this.processTableElement(element.Table);
        if (table) {
          tables.push(table);
          
          // Check if this table contains physical properties
          if (this.isPhysicalPropertiesTable(table)) {
            console.log('🔍 Physical properties table detected!');
            this.extractTableProperties(table, sdsData.criticalProperties);
          }
        }
      }
    }
    
    // Save final section
    if (currentSection && sectionText.trim()) {
      sdsData.sections[currentSection] = sectionText.trim();
    }
    
    // Log extracted data
    if (this.debug) {
      console.log('📊 SDS Sections found:', Object.keys(sdsData.sections));
      console.log('🎯 Critical properties found:', Object.keys(sdsData.criticalProperties));
      
      // Prioritize Section 9 data
      const section9 = Object.keys(sdsData.sections).find(key => key.includes('Section 9') || key.toLowerCase().includes('physical'));
      if (section9) {
        console.log(`⭐ Section 9 text: ${sdsData.sections[section9].substring(0, 300)}...`);
      }
    }

    return { 
      text, 
      tables, 
      sdsData,
      structuredSections: sdsData.sections,
      criticalProperties: sdsData.criticalProperties 
    };
  }

  /**
   * Process individual table elements
   */
  processTableElement(tableElement) {
    try {
      const table = {
        headers: [],
        rows: [],
        caption: null
      };

      // Extract table headers
      if (tableElement.THead) {
        for (const row of tableElement.THead) {
          if (row.TR) {
            const headerRow = [];
            for (const cell of row.TR) {
              if (cell.TD && cell.TD.Text) {
                headerRow.push(cell.TD.Text);
              }
            }
            if (headerRow.length > 0) {
              table.headers = headerRow;
            }
          }
        }
      }

      // Extract table body
      if (tableElement.TBody) {
        for (const row of tableElement.TBody) {
          if (row.TR) {
            const dataRow = [];
            for (const cell of row.TR) {
              if (cell.TD && cell.TD.Text) {
                dataRow.push(cell.TD.Text);
              }
            }
            if (dataRow.length > 0) {
              table.rows.push(dataRow);
            }
          }
        }
      }

      return table.rows.length > 0 ? table : null;

    } catch (error) {
      if (this.debug) console.warn('⚠️ Error processing table element:', error);
      return null;
    }
  }

  /**
   * Format tables as readable text for SDS processing
   */
  formatTablesAsText(tables) {
    if (tables.length === 0) return '';
    
    let formattedText = '\n=== EXTRACTED TABLES ===\n';
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      formattedText += `\nTable ${i + 1}:\n`;
      
      // Add headers
      if (table.headers && table.headers.length > 0) {
        formattedText += table.headers.join(' | ') + '\n';
        formattedText += '-'.repeat(table.headers.join(' | ').length) + '\n';
      }
      
      // Add rows
      for (const row of table.rows) {
        formattedText += row.join(' | ') + '\n';
      }
      
      formattedText += '\n';
    }
    
    return formattedText;
  }

  /**
   * Create output file path for extraction results
   */
  createOutputFilePath() {
    const date = new Date();
    const dateString = date.getFullYear() + "-" + 
      ("0" + (date.getMonth() + 1)).slice(-2) + "-" +
      ("0" + date.getDate()).slice(-2) + "T" + 
      ("0" + date.getHours()).slice(-2) + "-" +
      ("0" + date.getMinutes()).slice(-2) + "-" + 
      ("0" + date.getSeconds()).slice(-2);
      
    return path.join(this.outputDir, `extract_${dateString}.zip`);
  }

  /**
   * Extract critical properties from text as we process it
   */
  extractCriticalProperties(text, criticalProperties) {
    const lowerText = text.toLowerCase();
    
    // Flash point extraction with context highlighting
    const flashMatch = text.match(/flash\s*point[:\s]*([<>]?\s*-?\d+(?:\.\d+)?)\s*°?\s*([cf])/i);
    if (flashMatch) {
      let temp = parseFloat(flashMatch[1].replace(/[<>]/g, ''));
      const unit = flashMatch[2].toLowerCase();
      
      if (unit === 'f') {
        temp = (temp - 32) * 5 / 9; // Convert to Celsius
      }
      
      // Find surrounding context (50 chars before and after)
      const matchIndex = text.indexOf(flashMatch[0]);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(text.length, matchIndex + flashMatch[0].length + 50);
      const context = text.substring(contextStart, contextEnd);
      
      criticalProperties.flashPoint = {
        celsius: Math.round(temp),
        original: flashMatch[0],
        context: context,
        contextHighlight: `...${context.substring(0, 50)}🔥【${flashMatch[0]}】🔥${context.substring(50 + flashMatch[0].length)}...`,
        confidence: 0.9
      };
      console.log(`🔥 Flash Point found: ${temp}°C`);
      console.log(`🔍 Context: ${criticalProperties.flashPoint.contextHighlight}`);
    }
    
    // pH extraction with context highlighting
    const pHMatch = text.match(/ph[:\s]*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?/i);
    if (pHMatch) {
      const pH1 = parseFloat(pHMatch[1]);
      const pH2 = pHMatch[2] ? parseFloat(pHMatch[2]) : null;
      const finalPH = pH2 ? (pH1 + pH2) / 2 : pH1;
      
      // Find surrounding context
      const matchIndex = text.indexOf(pHMatch[0]);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(text.length, matchIndex + pHMatch[0].length + 50);
      const context = text.substring(contextStart, contextEnd);
      
      criticalProperties.pH = {
        value: finalPH,
        range: pH2 ? `${pH1}-${pH2}` : pH1.toString(),
        original: pHMatch[0],
        context: context,
        contextHighlight: `...${context.substring(0, 50)}🧪【${pHMatch[0]}】🧪${context.substring(50 + pHMatch[0].length)}...`,
        confidence: 0.9
      };
      console.log(`🧪 pH found: ${finalPH}`);
      console.log(`🔍 Context: ${criticalProperties.pH.contextHighlight}`);
    }
    
    // Product name extraction from identification section with context highlighting
    if (lowerText.includes('product') && (lowerText.includes('name') || lowerText.includes('identifier'))) {
      const nameMatch = text.match(/product\s*(?:name|identifier)[:\s]*([^\n\r]+)/i);
      if (nameMatch && nameMatch[1].trim().length > 2) {
        const productName = nameMatch[1].trim();
        if (!productName.toLowerCase().includes('section') && !productName.toLowerCase().includes('page')) {
          // Find surrounding context
          const matchIndex = text.indexOf(nameMatch[0]);
          const contextStart = Math.max(0, matchIndex - 50);
          const contextEnd = Math.min(text.length, matchIndex + nameMatch[0].length + 50);
          const context = text.substring(contextStart, contextEnd);
          
          criticalProperties.productName = {
            value: productName,
            original: nameMatch[0],
            context: context,
            contextHighlight: `...${context.substring(0, 50)}📛【${nameMatch[0]}】📛${context.substring(50 + nameMatch[0].length)}...`,
            confidence: 0.8
          };
          console.log(`📛 Product Name found: ${productName}`);
          console.log(`🔍 Context: ${criticalProperties.productName.contextHighlight}`);
        }
      }
    }
  }

  /**
   * Check if a table contains physical properties
   */
  isPhysicalPropertiesTable(table) {
    if (!table.headers || table.headers.length === 0) return false;
    
    const headerText = table.headers.join(' ').toLowerCase();
    return headerText.includes('property') || 
           headerText.includes('value') || 
           headerText.includes('flash') ||
           headerText.includes('ph') ||
           headerText.includes('temperature');
  }

  /**
   * Extract properties from physical properties tables with highlighting
   */
  extractTableProperties(table, criticalProperties) {
    if (!table.rows) return;
    
    console.log('📊 ANALYZING PHYSICAL PROPERTIES TABLE:');
    console.log('Headers:', table.headers);
    
    for (const row of table.rows) {
      if (row.length >= 2) {
        const property = row[0].toLowerCase();
        const value = row[1];
        
        console.log(`   🔍 Row: "${row[0]}" = "${row[1]}"`);
        
        if (property.includes('flash') && property.includes('point')) {
          const flashMatch = value.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([cf])/i);
          if (flashMatch) {
            let temp = parseFloat(flashMatch[1]);
            if (flashMatch[2].toLowerCase() === 'f') {
              temp = (temp - 32) * 5 / 9;
            }
            
            const tableContext = `TABLE ROW: "${row[0]}" | "${row[1]}"`; 
            
            criticalProperties.flashPoint = {
              celsius: Math.round(temp),
              original: `${property}: ${value}`,
              context: tableContext,
              contextHighlight: `📊🔥【TABLE EXTRACTION】🔥 ${tableContext}`,
              confidence: 0.95,
              source: 'table'
            };
            console.log(`🔥 TABLE Flash Point found: ${temp}°C from table row`);
          }
        }
        
        if (property.includes('ph')) {
          const pHMatch = value.match(/(\d+(?:\.\d+)?)/);
          if (pHMatch) {
            const tableContext = `TABLE ROW: "${row[0]}" | "${row[1]}"`; 
            
            criticalProperties.pH = {
              value: parseFloat(pHMatch[1]),
              original: `${property}: ${value}`,
              context: tableContext,
              contextHighlight: `📊🧪【TABLE EXTRACTION】🧪 ${tableContext}`,
              confidence: 0.95,
              source: 'table'
            };
            console.log(`🧪 TABLE pH found: ${pHMatch[1]} from table row`);
          }
        }
      }
    }
  }

  /**
   * Cleanup temporary files
   */
  cleanup(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        if (this.debug) console.log('🧹 Cleaned up temporary file:', path.basename(filePath));
      }
    } catch (error) {
      if (this.debug) console.warn('⚠️ Cleanup warning:', error.message);
    }
  }

  /**
   * Check if Adobe PDF Services is properly configured
   */
  isConfigured() {
    const clientId = process.env.PDF_SERVICES_CLIENT_ID;
    const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET;
    
    return !!(clientId && clientSecret);
  }
}

// Export singleton instance
const adobePdfServices = new AdobePdfServices();
export default adobePdfServices;