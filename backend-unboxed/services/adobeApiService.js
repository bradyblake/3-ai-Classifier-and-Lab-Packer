// Adobe PDF Extract API Service
// Uses Adobe Document Services API for enhanced PDF text and table extraction

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

class AdobeApiService {
  constructor() {
    this.debug = true;
    this.clientId = process.env.ADOBE_CLIENT_ID || process.env.VITE_ADOBE_CLIENT_ID;
    this.apiKey = process.env.ADOBE_API_KEY;
    this.baseUrl = 'https://pdf-services.adobe.io';
    
    if (this.debug) {
      console.log('🔥 Adobe API Service initialized');
      console.log('🔥 Client ID configured:', !!this.clientId);
      console.log('🔥 API Key configured:', !!this.apiKey);
    }
  }

  /**
   * Check if Adobe API is properly configured
   */
  isConfigured() {
    return !!(this.clientId && this.apiKey);
  }

  /**
   * Extract text and structure from PDF using Adobe PDF Extract API
   */
  async extractFromPDF(pdfFilePath, options = {}) {
    const startTime = Date.now();
    
    if (this.debug) {
      console.log('🔥 Adobe PDF Extract API - Starting extraction');
      console.log('📄 File:', pdfFilePath);
    }

    if (!this.isConfigured()) {
      if (this.debug) console.log('⚠️ Adobe API not configured properly');
      return {
        success: false,
        error: 'Adobe API not configured. Please add ADOBE_CLIENT_ID and ADOBE_API_KEY to .env file'
      };
    }

    try {
      // Step 1: Upload PDF to Adobe
      const uploadResult = await this.uploadPDF(pdfFilePath);
      if (!uploadResult.success) {
        return uploadResult;
      }

      // Step 2: Submit extraction job
      const jobResult = await this.submitExtractionJob(uploadResult.assetID, options);
      if (!jobResult.success) {
        return jobResult;
      }

      // Step 3: Wait for job completion and get results
      const extractionResult = await this.waitForJobCompletion(jobResult.jobID);
      if (!extractionResult.success) {
        return extractionResult;
      }

      // Step 4: Download and parse results
      const finalResult = await this.downloadAndParseResults(extractionResult.resultUrl);
      
      const processingTime = Date.now() - startTime;
      
      if (finalResult.success) {
        if (this.debug) {
          console.log('✅ Adobe PDF extraction completed successfully');
          console.log('⏱️ Processing time:', processingTime + 'ms');
          console.log('📈 Extracted text length:', finalResult.enhancedText.length);
          console.log('📊 Has tables:', finalResult.hasTables);
        }

        return {
          success: true,
          enhancedText: finalResult.enhancedText,
          tables: finalResult.tables || [],
          processingTime: processingTime,
          hasTables: finalResult.hasTables,
          method: 'adobe_pdf_extract_api',
          structuredData: finalResult.structuredData
        };
      } else {
        return finalResult;
      }

    } catch (error) {
      if (this.debug) {
        console.error('❌ Adobe API error:', error.message);
      }
      
      return {
        success: false,
        error: error.message,
        fallbackRequired: true
      };
    }
  }

  /**
   * Upload PDF to Adobe services
   */
  async uploadPDF(pdfFilePath) {
    try {
      if (!fs.existsSync(pdfFilePath)) {
        throw new Error('PDF file does not exist');
      }

      const formData = new FormData();
      formData.append('contentAnalyzerRequests', JSON.stringify({
        cpf:extractPdf: {
          elementsToExtract: [
            'text',
            'tables'
          ]
        }
      }));
      formData.append('file', fs.createReadStream(pdfFilePath));

      const response = await fetch(`${this.baseUrl}/operation/extractpdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Key': this.clientId,
          ...formData.getHeaders()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Adobe API upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (this.debug) {
        console.log('✅ Adobe PDF upload successful');
        console.log('📋 Asset ID:', result.asset?.assetID);
      }

      return {
        success: true,
        assetID: result.asset?.assetID,
        jobID: result.asset?.jobID
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit extraction job to Adobe
   */
  async submitExtractionJob(assetID, options = {}) {
    try {
      const extractionParams = {
        assetID: assetID,
        getCharBounds: options.getCharBounds || false,
        includeStyling: options.includeStyling || true,
        elementsToExtract: options.elements || [
          'text',
          'tables'
        ]
      };

      const response = await fetch(`${this.baseUrl}/operation/extractpdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Key': this.clientId
        },
        body: JSON.stringify(extractionParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Adobe extraction job failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        jobID: result.jobId
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Wait for job completion with polling
   */
  async waitForJobCompletion(jobID, maxWaitTime = 60000) {
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = Math.floor(maxWaitTime / pollInterval);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/operation/extractpdf/${jobID}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-API-Key': this.clientId
          }
        });

        if (!response.ok) {
          throw new Error(`Job status check failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'done') {
          return {
            success: true,
            resultUrl: result.asset?.downloadUri
          };
        } else if (result.status === 'failed') {
          return {
            success: false,
            error: 'Adobe extraction job failed'
          };
        }
        
        // Still processing, wait and try again
        if (this.debug && attempt % 5 === 0) {
          console.log(`⏳ Adobe job still processing... (attempt ${attempt + 1}/${maxAttempts})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        if (attempt === maxAttempts - 1) {
          return {
            success: false,
            error: error.message
          };
        }
        // Continue polling on error
      }
    }

    return {
      success: false,
      error: 'Job completion timeout'
    };
  }

  /**
   * Download and parse extraction results
   */
  async downloadAndParseResults(resultUrl) {
    try {
      const response = await fetch(resultUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download results: ${response.status}`);
      }

      const jsonResults = await response.json();
      
      // Parse Adobe's structured extraction results
      let enhancedText = '';
      let tables = [];
      let structuredData = jsonResults;

      // Extract text content
      if (jsonResults.elements) {
        for (const element of jsonResults.elements) {
          if (element.Text) {
            enhancedText += element.Text + '\n';
          }
        }
      }

      // Extract table data
      if (jsonResults.elements) {
        const tableElements = jsonResults.elements.filter(el => el.Path?.includes('Table'));
        tables = this.parseTablesFromElements(tableElements);
      }

      // Mark as Adobe processed
      const markedText = `=== ADOBE API ENHANCED ===\n${enhancedText}\n=== TABLES ===\n${this.formatTablesAsText(tables)}\n=== END ADOBE ===`;

      return {
        success: true,
        enhancedText: markedText,
        tables: tables,
        hasTables: tables.length > 0,
        structuredData: structuredData
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse table data from Adobe extraction elements
   */
  parseTablesFromElements(tableElements) {
    const tables = [];
    
    for (const element of tableElements) {
      if (element.Table) {
        const table = {
          rows: [],
          headers: []
        };
        
        // Extract table structure
        if (element.Table.THead) {
          table.headers = element.Table.THead.map(header => header.Text || '');
        }
        
        if (element.Table.TBody) {
          for (const row of element.Table.TBody) {
            if (row.TR) {
              const tableRow = row.TR.map(cell => cell.Text || '');
              table.rows.push(tableRow);
            }
          }
        }
        
        tables.push(table);
      }
    }
    
    return tables;
  }

  /**
   * Format tables as readable text for SDS processing
   */
  formatTablesAsText(tables) {
    let formattedText = '';
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      formattedText += `\nTable ${i + 1}:\n`;
      
      if (table.headers && table.headers.length > 0) {
        formattedText += table.headers.join(' | ') + '\n';
        formattedText += '-'.repeat(table.headers.join(' | ').length) + '\n';
      }
      
      for (const row of table.rows) {
        formattedText += row.join(' | ') + '\n';
      }
      
      formattedText += '\n';
    }
    
    return formattedText;
  }
}

// Export singleton instance
const adobeApiService = new AdobeApiService();
export default adobeApiService;