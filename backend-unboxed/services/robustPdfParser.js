// Robust PDF Parser - Simple, reliable, no-frills text extraction
// Focuses on getting clean text from PDFs without complexity

import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';

export class RobustPdfParser {
  constructor() {
    this.config = {
      maxPages: 100,        // Limit pages to prevent memory issues
      normalizeText: true,  // Clean up text formatting
      preserveLayout: false, // Focus on content, not layout
      pageDelimiter: '\n\n', // Clear page separation
    };
  }

  /**
   * Parse PDF and extract clean text
   * @param {Buffer|String} input - PDF buffer or file path
   * @returns {Object} Parsed result with text and metadata
   */
  async parse(input) {
    const startTime = Date.now();
    console.log('🔍 Starting enhanced PDF parsing...');
    
    try {
      // Get buffer from input with validation
      const buffer = await this.getBuffer(input);
      
      // Pre-validate the buffer
      const validation = this.validatePDFBuffer(buffer);
      if (!validation.isValid) {
        console.log(`⚠️ PDF validation failed: ${validation.reason}`);
        if (validation.canFallback) {
          return this.fallbackExtraction(input, new Error(validation.reason));
        }
      }
      
      // Parse with pdf-parse using enhanced options
      const parseOptions = {
        max: this.config.maxPages,
        pagerender: this.renderPage.bind(this),
        // Add options for better error recovery
        normalizeWhitespace: true,
        disableCombineTextItems: false,
        // Add timeout to prevent hanging
        timeout: 30000 // 30 seconds
      };
      
      console.log('📖 Attempting primary PDF extraction...');
      const data = await Promise.race([
        pdfParse(buffer, parseOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF parsing timeout')), 35000)
        )
      ]);

      // Validate extracted text
      if (!data.text || data.text.length < 10) {
        console.log('⚠️ Extracted text too short, trying fallback');
        return this.fallbackExtraction(input, new Error('No meaningful text extracted'));
      }

      // Clean and structure the text
      const cleanedText = this.cleanText(data.text);
      
      // Extract sections if it's an SDS
      const sections = this.extractSDSSections(cleanedText);
      
      const result = {
        success: true,
        text: cleanedText,
        sections: sections,
        metadata: {
          pages: data.numpages,
          info: data.info || {},
          textLength: cleanedText.length,
          hasContent: cleanedText.length > 100,
          processingTime: Date.now() - startTime,
          extractionStrategy: 'primary_success'
        }
      };
      
      console.log(`✅ PDF parsing successful: ${cleanedText.length} chars, ${data.numpages} pages`);
      return result;
      
    } catch (error) {
      console.error(`❌ PDF parsing error (${Date.now() - startTime}ms):`, error.message);
      
      // Enhanced error context
      const errorContext = {
        ...error,
        processingTime: Date.now() - startTime,
        inputType: Buffer.isBuffer(input) ? 'buffer' : typeof input
      };
      
      // Try fallback extraction with enhanced context
      return this.fallbackExtraction(input, errorContext);
    }
  }

  /**
   * Validate PDF buffer before processing
   */
  validatePDFBuffer(buffer) {
    try {
      if (!Buffer.isBuffer(buffer)) {
        return { isValid: false, reason: 'Input is not a valid buffer', canFallback: true };
      }
      
      if (buffer.length === 0) {
        return { isValid: false, reason: 'Empty file buffer', canFallback: false };
      }
      
      if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
        return { isValid: false, reason: 'File too large (>50MB)', canFallback: false };
      }
      
      // Check PDF signature
      const header = buffer.subarray(0, 10).toString();
      if (!header.startsWith('%PDF-')) {
        return { 
          isValid: false, 
          reason: 'Not a valid PDF file (missing PDF header)', 
          canFallback: true 
        };
      }
      
      // Check for common corruption patterns
      const bufferStr = buffer.toString('utf8', 0, 1000);
      if (bufferStr.includes('\x00\x00\x00\x00\x00')) {
        return { 
          isValid: false, 
          reason: 'PDF appears to be corrupted (null bytes)', 
          canFallback: true 
        };
      }
      
      return { isValid: true };
      
    } catch (error) {
      return { 
        isValid: false, 
        reason: `Validation error: ${error.message}`, 
        canFallback: true 
      };
    }
  }

  /**
   * Get buffer from various input types
   */
  async getBuffer(input) {
    // If already a buffer
    if (Buffer.isBuffer(input)) {
      return input;
    }
    
    // If it's a file path
    if (typeof input === 'string') {
      if (!fs.existsSync(input)) {
        throw new Error(`File not found: ${input}`);
      }
      return fs.readFileSync(input);
    }
    
    // If it's a stream or other object
    if (input && typeof input === 'object') {
      // Try to read as buffer
      if (input.buffer) return input.buffer;
      if (input.data) return Buffer.from(input.data);
    }
    
    throw new Error('Invalid input type for PDF parsing');
  }

  /**
   * Custom page rendering for better text extraction
   */
  renderPage(pageData) {
    // Check if we have text content
    let render_options = {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    };

    return pageData.getTextContent(render_options)
      .then(textContent => {
        let text = '';
        
        // Build text from items
        for (let item of textContent.items) {
          // Add text
          text += item.str;
          
          // Add appropriate spacing
          if (item.hasEOL) {
            text += '\n';
          } else if (item.str && !item.str.endsWith(' ')) {
            text += ' ';
          }
        }
        
        return text;
      });
  }

  /**
   * Clean extracted text while preserving line structure
   */
  cleanText(text) {
    if (!text) return '';
    
    let cleaned = text;
    
    // First normalize line endings to preserve them
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Split by lines to preserve structure
    const lines = cleaned.split('\n');
    
    // Clean each line individually
    const cleanedLines = lines.map(line => {
      let cleanLine = line;
      
      // Remove excessive spaces within a line (but not at line breaks)
      cleanLine = cleanLine.replace(/[ \t]+/g, ' ');
      
      // Fix common OCR issues
      cleanLine = cleanLine
        .replace(/\bl\s+/g, 'I ')  // Common OCR mistake: l instead of I
        .replace(/\s+'/g, "'")      // Fix spaced apostrophes
        .replace(/'\s+/g, "'")
        .replace(/\(\s+/g, '(')     // Fix spaced parentheses  
        .replace(/\s+\)/g, ')')
        .replace(/\s+,/g, ',')      // Fix spaced commas
        .replace(/\s+\./g, '.');    // Fix spaced periods
      
      // Trim each line
      return cleanLine.trim();
    });
    
    // Join lines back, removing completely empty lines but preserving structure
    cleaned = cleanedLines
      .filter((line, index) => {
        // Keep non-empty lines
        if (line.length > 0) return true;
        // Keep empty lines between content (for paragraph breaks)
        if (index > 0 && index < cleanedLines.length - 1) {
          const prevHasContent = cleanedLines[index - 1].length > 0;
          const nextHasContent = cleanedLines[index + 1].length > 0;
          return prevHasContent && nextHasContent;
        }
        return false;
      })
      .join('\n');
    
    // Limit consecutive newlines to maximum 2 (for paragraph breaks)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned;
  }

  /**
   * Extract SDS sections with common headers
   */
  extractSDSSections(text) {
    const sections = {};
    
    // Common SDS section patterns
    const sectionPatterns = [
      // Section 1: Identification
      { key: 'identification', patterns: [
        /(?:section\s*1|identification|product\s*identifier)/i,
        /product\s*name\s*:?\s*([^\n]+)/i,
        /cas\s*(?:number|#|no\.?)\s*:?\s*([\d-]+)/i
      ]},
      
      // Section 2: Hazards
      { key: 'hazards', patterns: [
        /(?:section\s*2|hazard.*identification)/i,
        /(?:ghs|hazard)\s*classification/i,
        /signal\s*word\s*:?\s*(\w+)/i
      ]},
      
      // Section 3: Composition
      { key: 'composition', patterns: [
        /(?:section\s*3|composition.*information)/i,
        /ingredients?\s*:?/i,
        /chemical\s*name/i
      ]},
      
      // Section 9: Physical Properties
      { key: 'physical', patterns: [
        /(?:section\s*9|physical.*chemical.*properties)/i,
        /flash\s*point\s*:?\s*([\d.-]+\s*[°℃℉CF])/i,
        /boiling\s*point\s*:?\s*([\d.-]+\s*[°℃℉CF])/i,
        /ph\s*:?\s*([\d.-]+)/i
      ]},
      
      // Section 14: Transport
      { key: 'transport', patterns: [
        /(?:section\s*14|transport.*information)/i,
        /un\s*number\s*:?\s*(UN\s*\d{4}|\d{4})/i,
        /proper\s*shipping\s*name\s*:?\s*([^\n]+)/i,
        /hazard\s*class\s*:?\s*([\d.]+)/i
      ]}
    ];
    
    // Try to find each section
    for (const section of sectionPatterns) {
      let content = '';
      let found = false;
      
      for (const pattern of section.patterns) {
        const match = text.match(pattern);
        if (match) {
          found = true;
          // Extract content after the match
          const startIndex = match.index;
          const endIndex = this.findNextSection(text, startIndex);
          content = text.substring(startIndex, endIndex).trim();
          break;
        }
      }
      
      if (found && content) {
        sections[section.key] = this.cleanSectionContent(content);
      }
    }
    
    // Extract key chemical data
    sections.chemicals = this.extractChemicals(text);
    sections.casNumbers = this.extractCASNumbers(text);
    sections.unNumber = this.extractUNNumber(text);
    sections.flashPoint = this.extractFlashPoint(text);
    
    // Only return sections with content
    const filteredSections = {};
    for (const [key, value] of Object.entries(sections)) {
      if (value && ((Array.isArray(value) && value.length > 0) || 
          (typeof value === 'string' && value.trim().length > 0) ||
          (typeof value === 'object' && Object.keys(value).length > 0))) {
        filteredSections[key] = value;
      }
    }
    
    return filteredSections;
  }

  /**
   * Find where the next section starts
   */
  findNextSection(text, currentIndex) {
    const sectionPattern = /\n(?:section\s*\d+|appendix|references)/i;
    const match = text.substring(currentIndex + 100).match(sectionPattern);
    
    if (match) {
      return currentIndex + 100 + match.index;
    }
    
    // Default to 2000 chars or end of text
    return Math.min(currentIndex + 2000, text.length);
  }

  /**
   * Clean section content
   */
  cleanSectionContent(content) {
    return content
      .replace(/^\s*section\s*\d+\s*[:\-.]?\s*/i, '') // Remove section headers
      .replace(/\s+/g, ' ')                            // Normalize whitespace
      .trim();
  }

  /**
   * Extract chemical names
   */
  extractChemicals(text) {
    const chemicals = [];
    
    // Multiple patterns for chemical names with percentages
    const patterns = [
      // Standard format: "Chemical name 99.5%"
      /([A-Za-z][A-Za-z0-9\s,\-()]+)\s+([\d.]+\s*[-–]\s*[\d.]+\s*%|[\d.]+\s*%)/g,
      
      // Line format: "Chemical name: Sodium Hydroxide \nConcentration: 25%"
      /Chemical\s+name:\s*([^\n\r]+)\s*[\n\r][^%]*?([\d.]+\s*%)/gi,
      
      // Alternative line format: "Chemical name: Name \nCAS number: \nConcentration: X%"
      /Chemical\s+name:\s*([^\n\r]+)[\s\S]*?Concentration:\s*([\d.]+\s*%)/gi,
      
      // Composition format: "Acetone\nPercentage: 99.5%"
      /^([A-Za-z][A-Za-z0-9\s,\-()]{2,50})\s*\n[^%]*?([\d.]+\s*%)/gim,
      
      // Simple format: "Acetone - 99.5%"
      /([A-Za-z][A-Za-z0-9\s,\-()]{2,50})\s*[-–]\s*([\d.]+\s*%)/g,
      
      // Direct CAS + Name format: "Name \nCAS number: 1234-56-7 \nConcentration: X%"
      /([A-Za-z][A-Za-z0-9\s,\-()]+)\s*\n?CAS\s+number:\s*[\d-]+\s*\n?Concentration:\s*([\d.]+\s*%)/gi
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        const percentage = match[2].trim();
        
        // Filter out common non-chemicals and section headers
        if (!this.isLikelyChemical(name)) continue;
        
        // Check if we already have this chemical
        const existing = chemicals.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (existing) continue;
        
        chemicals.push({
          name: name,
          percentage: percentage,
          casNumber: this.findCASForChemical(name, text)
        });
        
        // Limit to prevent excessive matches
        if (chemicals.length >= 20) break;
      }
      
      if (chemicals.length >= 20) break;
    }
    
    return chemicals;
  }

  /**
   * Check if string is likely a chemical name
   */
  isLikelyChemical(name) {
    // Too short or too long
    if (name.length < 3 || name.length > 100) return false;
    
    // Common non-chemical words - be more specific
    const nonChemicals = [
      'section', 'hazard', 'safety', 'data', 'sheet', 'page',
      'not applicable', 'none', 'information', 'see section',
      'description', 'identification', 'composition', 'ingredients'
    ];
    
    const lower = name.toLowerCase().trim();
    for (const word of nonChemicals) {
      if (lower === word || lower.includes(word)) return false;
    }
    
    // Common chemical names - be more inclusive
    const knownChemicals = [
      'acetone', 'benzene', 'toluene', 'methanol', 'ethanol', 
      'propanol', 'butanol', 'hexane', 'heptane', 'octane',
      'xylene', 'styrene', 'phenol', 'ether', 'ketone',
      'formaldehyde', 'ammonia', 'chloroform', 'dichloromethane'
    ];
    
    for (const chemical of knownChemicals) {
      if (lower.includes(chemical)) return true;
    }
    
    // Chemical indicators - expanded list
    const chemicalIndicators = [
      'acid', 'oxide', 'hydroxide', 'chloride', 'sulfate', 'nitrate',
      'benzene', 'methyl', 'ethyl', 'propyl', 'butyl', 'amine', 'amide',
      'carbonate', 'phosphate', 'sulfide', 'fluoride', 'bromide', 'iodide'
    ];
    
    for (const indicator of chemicalIndicators) {
      if (lower.includes(indicator)) return true;
    }
    
    // Has numbers (like 2-propanol)
    if (/\d/.test(name)) return true;
    
    // Has parentheses (like (meth)acrylate)
    if (/\(.*\)/.test(name)) return true;
    
    // Has chemical-like structure (ends in -ene, -ane, -ol, -one, etc)
    const chemicalEndings = [
      'ene', 'ane', 'ine', 'one', 'ide', 'ate', 'ite', 
      'ium', 'ous', 'tic', 'yl', 'al'
    ];
    
    for (const ending of chemicalEndings) {
      if (lower.endsWith(ending)) return true;
    }
    
    // If it's a single word with mixed case or all caps, likely chemical
    if (!name.includes(' ') && (
        /[A-Z][a-z]/.test(name) || // Mixed case like "Acetone"
        name === name.toUpperCase() // All caps like "ACETONE"
    )) {
      return true;
    }
    
    return false;
  }

  /**
   * Find CAS number for a specific chemical in the text
   */
  findCASForChemical(chemicalName, text) {
    // Look for CAS number near the chemical name
    const searchArea = 200; // chars around the chemical name
    const nameIndex = text.toLowerCase().indexOf(chemicalName.toLowerCase());
    
    if (nameIndex === -1) return null;
    
    const start = Math.max(0, nameIndex - searchArea);
    const end = Math.min(text.length, nameIndex + chemicalName.length + searchArea);
    const nearbyText = text.substring(start, end);
    
    // Find CAS numbers in the nearby text
    const casPattern = /(\d{2,7}-\d{2}-\d)/g;
    const matches = nearbyText.match(casPattern);
    
    return matches ? matches[0] : null;
  }

  /**
   * Extract CAS numbers
   */
  extractCASNumbers(text) {
    const casNumbers = [];
    const casPattern = /(\d{2,7}-\d{2}-\d)/g;
    let match;
    
    while ((match = casPattern.exec(text)) !== null) {
      const cas = match[1];
      if (this.isValidCAS(cas)) {
        casNumbers.push(cas);
      }
    }
    
    return [...new Set(casNumbers)]; // Remove duplicates
  }

  /**
   * Validate CAS number format
   */
  isValidCAS(cas) {
    const parts = cas.split('-');
    if (parts.length !== 3) return false;
    
    const [first, second, check] = parts;
    
    // Basic format validation
    if (first.length < 2 || first.length > 7) return false;
    if (second.length !== 2) return false;
    if (check.length !== 1) return false;
    
    return true;
  }

  /**
   * Extract UN number
   */
  extractUNNumber(text) {
    // Various UN number patterns
    const patterns = [
      /UN\s*(\d{4})/i,
      /UN\s*No\.?\s*(\d{4})/i,
      /United\s*Nations\s*Number\s*:?\s*(\d{4})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return `UN${match[1]}`;
      }
    }
    
    return null;
  }

  /**
   * Extract flash point
   */
  extractFlashPoint(text) {
    // Debug the input text
    console.log(`🔍 SEARCHING FOR FLASH POINT in: "${text.substring(0, 200)}..."`);
    
    const patterns = [
      // Special format: "g) Flash point - 7 ° C" (note the minus before 7 is part of the temp)
      /flash\s*point\s*[-:]?\s*[-+]?\s*(\d+(?:\.\d+)?)\s*°?\s*([CF])(?:\s*\([^)]+\))?/i,
      // Standard colon format: "Flash point: -7°C"
      /flash\s*point\s*:\s*([-+]?\d+(?:\.\d+)?)\s*°?\s*([CF])(?:\s*\([^)]+\))?/i,
      // With degrees word: "Flash point: -7 degrees C"
      /flash\s*point\s*:?\s*([-+]?\d+(?:\.\d+)?)\s*degrees?\s*([CF])/i,
      // Whitespace format: "Flash Point   -7 °C"
      /flash\s*point\s+([-+]?\d+(?:\.\d+)?)\s*°?\s*([CF])/i
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      if (match) {
        let value = parseFloat(match[1]);
        
        // Special case: check if there's a minus sign before the number in the original text
        // For patterns like "Flash point - 7" where minus is the temperature sign
        if (i === 0 && text.includes('- ' + match[1])) {
          value = -value;
          console.log(`🔥 FLASH POINT EXTRACTED: "${-match[1]}°${match[2]}" from "${match[0]}" (corrected negative)`);
        } else {
          console.log(`🔥 FLASH POINT EXTRACTED: "${match[1]}°${match[2]}" from "${match[0]}"`);
        }
        
        return {
          value: value,
          unit: match[2].toUpperCase()
        };
      }
    }
    
    console.log(`⚠️ No flash point found in text excerpt: "${text.substring(0, 200)}..."`);
    return null;
  }

  /**
   * Fallback extraction when PDF parsing fails
   */
  async fallbackExtraction(input, originalError) {
    console.log(`🔄 Attempting enhanced fallback extraction for error: ${originalError?.message}`);
    
    try {
      // Strategy 1: If we have partial text from the error, enhance it
      if (originalError && originalError.partial) {
        console.log('📄 Found partial text, attempting to extract sections');
        const cleanedText = this.cleanText(originalError.partial);
        const sections = this.extractSDSSections(cleanedText);
        
        return {
          success: false,
          partial: true,
          text: cleanedText,
          sections: sections,
          error: 'Partial extraction with section recovery',
          metadata: {
            pages: 0,
            textLength: originalError.partial.length,
            extractionStrategy: 'partial_recovery'
          }
        };
      }
      
      // Strategy 2: Try multiple buffer encoding strategies
      const buffer = await this.getBuffer(input);
      
      // Strategy 2a: Check if it's plain text misidentified as PDF
      const rawText = buffer.toString('utf8');
      if (rawText && !rawText.startsWith('%PDF') && rawText.length > 100) {
        console.log('📝 Detected plain text file, extracting as text');
        const cleanedText = this.cleanText(rawText);
        const sections = this.extractSDSSections(cleanedText);
        
        return {
          success: true,
          text: cleanedText,
          sections: sections,
          metadata: {
            pages: 0,
            textLength: cleanedText.length,
            extractionStrategy: 'plain_text',
            note: 'File was plain text, not PDF'
          }
        };
      }
      
      // Strategy 2b: Try different encodings for corrupted PDFs
      const encodings = ['latin1', 'ascii', 'base64'];
      for (const encoding of encodings) {
        try {
          const encodedText = buffer.toString(encoding);
          if (encodedText && encodedText.length > 200) {
            const cleanedText = this.cleanText(encodedText);
            const sections = this.extractSDSSections(cleanedText);
            
            // Check if we got meaningful content
            if (Object.keys(sections).length > 0 || cleanedText.includes('section')) {
              console.log(`✅ Successfully extracted using ${encoding} encoding`);
              return {
                success: true,
                text: cleanedText,
                sections: sections,
                metadata: {
                  pages: 0,
                  textLength: cleanedText.length,
                  extractionStrategy: `encoding_${encoding}`,
                  note: `Recovered using ${encoding} encoding`
                }
              };
            }
          }
        } catch (encodingError) {
          console.log(`❌ ${encoding} encoding failed:`, encodingError.message);
          continue;
        }
      }
      
      // Strategy 3: Try basic PDF structure recovery
      if (rawText && rawText.startsWith('%PDF')) {
        console.log('🔧 Attempting basic PDF structure recovery');
        const textContent = this.extractTextFromCorruptedPDF(rawText);
        if (textContent && textContent.length > 50) {
          const cleanedText = this.cleanText(textContent);
          const sections = this.extractSDSSections(cleanedText);
          
          return {
            success: false,
            partial: true,
            text: cleanedText,
            sections: sections,
            error: 'PDF structure damaged, recovered basic text',
            metadata: {
              pages: 0,
              textLength: cleanedText.length,
              extractionStrategy: 'structure_recovery'
            }
          };
        }
      }
      
    } catch (fallbackError) {
      console.error('❌ Enhanced fallback extraction failed:', fallbackError.message);
    }
    
    // Final fallback: Return informative error with any salvaged content
    const salvageAttempt = this.salvageAnyContent(input, originalError);
    
    return {
      success: false,
      text: salvageAttempt.text || '',
      sections: salvageAttempt.sections || {},
      error: this.categorizeError(originalError),
      metadata: {
        pages: 0,
        textLength: salvageAttempt.text?.length || 0,
        extractionStrategy: 'final_salvage',
        originalError: originalError?.message,
        recommendations: this.getRecoveryRecommendations(originalError)
      }
    };
  }

  /**
   * Extract text from corrupted PDF by looking for readable streams
   */
  extractTextFromCorruptedPDF(rawText) {
    try {
      // Look for text between stream markers
      const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
      let extractedText = '';
      let match;
      
      while ((match = streamPattern.exec(rawText)) !== null) {
        const streamContent = match[1];
        // Try to extract readable text (basic decompression attempt)
        const readableText = streamContent.replace(/[^\x20-\x7E\n\r]/g, ' ');
        if (readableText.length > 10) {
          extractedText += readableText + ' ';
        }
      }
      
      return extractedText.trim();
    } catch (error) {
      console.log('Structure recovery failed:', error.message);
      return '';
    }
  }

  /**
   * Attempt to salvage any readable content from the input
   */
  salvageAnyContent(input, originalError) {
    try {
      if (typeof input === 'string' && input.length > 0) {
        const sections = this.extractSDSSections(input);
        return { text: input, sections };
      }
      
      if (originalError?.stack && originalError.stack.includes('text')) {
        // Try to extract any text mentioned in the error
        const textMatch = originalError.stack.match(/"([^"]{20,})"/);
        if (textMatch) {
          const text = textMatch[1];
          const sections = this.extractSDSSections(text);
          return { text, sections };
        }
      }
    } catch (error) {
      console.log('Salvage attempt failed:', error.message);
    }
    
    return { text: '', sections: {} };
  }

  /**
   * Categorize the error type for better reporting
   */
  categorizeError(error) {
    if (!error) return 'Unknown PDF processing error';
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid') && message.includes('pdf')) {
      return 'Invalid PDF structure - file may be corrupted or not a valid PDF';
    }
    if (message.includes('password') || message.includes('encrypted')) {
      return 'PDF is password protected or encrypted';
    }
    if (message.includes('permission') || message.includes('access')) {
      return 'PDF access denied - check file permissions';
    }
    if (message.includes('memory') || message.includes('size')) {
      return 'PDF too large - file exceeds memory limits';
    }
    if (message.includes('timeout')) {
      return 'PDF processing timeout - file too complex';
    }
    
    return `PDF processing error: ${error.message}`;
  }

  /**
   * Provide recovery recommendations based on error type
   */
  getRecoveryRecommendations(error) {
    const recommendations = [];
    
    if (!error) return recommendations;
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('invalid') || message.includes('corrupt')) {
      recommendations.push('Try re-saving the PDF from the original document');
      recommendations.push('Attempt manual text extraction or OCR processing');
    }
    if (message.includes('password') || message.includes('encrypted')) {
      recommendations.push('Remove password protection from the PDF');
      recommendations.push('Contact document owner for unencrypted version');
    }
    if (message.includes('size') || message.includes('memory')) {
      recommendations.push('Reduce PDF file size by compressing images');
      recommendations.push('Split large PDF into smaller sections');
    }
    
    recommendations.push('Manual data entry may be required for critical information');
    
    return recommendations;
  }
}

// Export singleton instance for convenience
export default new RobustPdfParser();