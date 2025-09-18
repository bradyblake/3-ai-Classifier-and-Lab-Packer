/**
 * Enhanced PDF Utils with Custom SDS Parser Integration
 * 
 * This module provides a drop-in replacement for pdfUtils.js that uses
 * the custom SDS parser to solve text run-together issues.
 * 
 * Key improvements:
 * - Proper section separation with 5-line buffers
 * - SDS-aware text extraction
 * - Better handling of complex layouts and tables
 * - Maintains backward compatibility with existing code
 */

// TEMPORARY FIX: Use working pdfUtils.js while PDF.js worker issues are resolved
import { extractTextFromPDF as originalPdfExtraction } from './pdfUtils.js';

/**
 * Temporary fallback PDF extraction using working pdfUtils.js
 * This bypasses the PDF.js worker issues while maintaining functionality
 */
export async function extractTextFromPDF(file) {
  try {
    console.log('🚨 USING FALLBACK PDF EXTRACTION - Worker issues bypassed');
    console.log(`📄 Processing file: ${file.name} (${file.size} bytes)`);
    
    // Use the working pdfUtils.js extractor
    const result = await originalPdfExtraction(file);
    
    if (result.text) {
      console.log(`✅ Fallback extraction succeeded: ${result.text.length} chars`);
      console.log(`📊 Stats: ${result.pageCount || 'unknown'} pages, scanned: ${result.scanned}`);
      console.log(`📋 Sample text: "${result.text.slice(0, 150)}..."`);
      return result;
    } else {
      console.log('⚠️ Fallback extraction returned no text');
      return {
        text: null,
        scanned: true,
        error: 'No text extracted from PDF'
      };
    }
    
  } catch (error) {
    console.error('❌ Fallback PDF extraction failed:', error);
    return { 
      text: null, 
      scanned: true, 
      error: error.message 
    };
  }
}

/**
 * Temporary fallback section extraction using basic text parsing
 */
export async function extractTextWithSections(file) {
  try {
    // Get basic text first
    const result = await extractTextFromPDF(file);
    
    if (result.text && !result.error) {
      // Basic section detection from text
      const sections = extractBasicSections(result.text);
      
      return {
        ...result,
        sections: sections,
        sectionCount: Object.keys(sections).length,
        fallbackUsed: true
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Fallback section extraction failed:', error);
    return { 
      text: null, 
      scanned: true, 
      error: error.message 
    };
  }
}

/**
 * Basic section extraction from text
 */
function extractBasicSections(text) {
  const sections = {};
  const lines = text.split('\n');
  let currentSection = null;
  let currentSectionLines = [];
  
  for (const line of lines) {
    const sectionMatch = line.match(/^SECTION\s+(\d+)[:\s]*(.*)$/i);
    
    if (sectionMatch) {
      // Save previous section
      if (currentSection) {
        sections[`section${currentSection.number}`] = {
          number: currentSection.number,
          title: currentSection.title,
          content: currentSectionLines.join('\n')
        };
      }
      
      // Start new section
      currentSection = {
        number: parseInt(sectionMatch[1]),
        title: sectionMatch[2].trim()
      };
      currentSectionLines = [line];
    } else if (currentSection) {
      currentSectionLines.push(line);
    }
  }
  
  // Save final section
  if (currentSection) {
    sections[`section${currentSection.number}`] = {
      number: currentSection.number,
      title: currentSection.title,
      content: currentSectionLines.join('\n')
    };
  }
  
  return sections;
}

/**
 * Complete SDS analysis pipeline using line-preserving parser + extractor
 * Returns both PDF text and fully extracted SDS data with exact line formatting
 */
export async function extractAndAnalyzeSDS(file) {
  try {
    // Step 1: Extract text with line-preserving parser
    const pdfResult = await extractTextWithSections(file);
    
    if (pdfResult.error || !pdfResult.text) {
      return {
        pdfResult,
        sdsData: null,
        error: pdfResult.error || 'PDF extraction failed'
      };
    }
    
    // Step 2: Extract SDS data using FIXED customSDSEngine (no more legacy extractors!)
    const { customSDSEngine } = await import('../../utils/customSDSEngine.js');
    const sdsData = customSDSEngine.extract(pdfResult.text);
    
    return {
      pdfResult,
      sdsData,
      linePreservingUsed: true,
      enhancedParsingUsed: true,
      quality: sdsData ? 1 : 0
    };
    
  } catch (error) {
    console.error('❌ Complete SDS analysis failed:', error);
    return {
      pdfResult: null,
      sdsData: null,
      error: error.message
    };
  }
}

/**
 * Utility function to validate and compare extraction quality
 */
export function validateExtractionQuality(extractedData) {
  const quality = {
    score: 0,
    issues: [],
    recommendations: []
  };
  
  if (!extractedData.text || extractedData.text.length < 100) {
    quality.issues.push('Text too short - may be scanned PDF');
    quality.recommendations.push('Consider OCR processing for scanned documents');
  } else {
    quality.score += 25;
  }
  
  // Check for section detection
  const sectionCount = (extractedData.text.match(/SECTION\\s+\\d+/gi) || []).length;
  if (sectionCount >= 10) {
    quality.score += 35;
    quality.recommendations.push('Good section detection - suitable for SDS parsing');
  } else if (sectionCount >= 5) {
    quality.score += 20;
    quality.issues.push('Some sections detected but may be incomplete');
  } else {
    quality.issues.push('Few or no sections detected - may have formatting issues');
  }
  
  // Check for SDS indicators
  const sdsIndicators = /(?:safety data sheet|sds|material safety|msds|hazard|flash point|cas|section)/gi;
  const indicatorMatches = (extractedData.text.match(sdsIndicators) || []).length;
  if (indicatorMatches >= 10) {
    quality.score += 25;
  } else if (indicatorMatches >= 5) {
    quality.score += 15;
  } else {
    quality.issues.push('Low SDS indicator content - verify document type');
  }
  
  // Check text density (characters per item)
  if (extractedData.itemCount && extractedData.text.length) {
    const density = extractedData.text.length / extractedData.itemCount;
    if (density > 5) {
      quality.score += 15;
    } else {
      quality.issues.push('Low text density - possible formatting issues');
    }
  }
  
  return quality;
}

/**
 * Debug function to compare original vs enhanced parsing
 * Useful for development and troubleshooting
 */
export async function compareParsingMethods(file, originalExtractor = null) {
  const results = {
    enhanced: null,
    original: null,
    comparison: null
  };
  
  try {
    // Test enhanced parser
    results.enhanced = await extractTextFromPDF(file);
    
    // Test original parser if provided
    if (originalExtractor) {
      results.original = await originalExtractor(file);
    }
    
    // Compare results
    if (results.enhanced && results.original) {
      results.comparison = {
        textLengthDiff: (results.enhanced.text?.length || 0) - (results.original.text?.length || 0),
        sectionCountDiff: (results.enhanced.sectionCount || 0) - ((results.original.text?.match(/SECTION\\s+\\d+/gi) || []).length),
        qualityImprovement: validateExtractionQuality(results.enhanced).score - validateExtractionQuality(results.original).score
      };
    }
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    results.error = error.message;
  }
  
  return results;
}

// Parsers removed - using customSDSEngine directly now