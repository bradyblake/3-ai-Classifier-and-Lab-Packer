// PDF utilities for Revolutionary Classifier
// Provides PDF processing and text extraction capabilities

export const extractTextFromPDF = async (file) => {
  try {
    // If we have access to MuPDF.js, use it
    if (window.mupdf) {
      return await extractWithMuPDF(file);
    }
    
    // Fallback to server-side extraction
    return await extractViaServer(file);
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  }
};

const extractWithMuPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  
  try {
    const doc = window.mupdf.openDocument(uint8Array, file.name);
    const pageCount = doc.countPages();
    let fullText = '';
    
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const text = page.toText();
      fullText += text + '\n\n';
    }
    
    return {
      text: fullText,
      pageCount,
      method: 'mupdf',
      success: true
    };
  } catch (error) {
    console.error('MuPDF extraction failed:', error);
    throw error;
  }
};

const extractViaServer = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  
  const response = await fetch('/api/extract-pdf', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Server extraction failed: ${response.status}`);
  }
  
  const result = await response.json();
  
  return {
    text: result.text || result.content || '',
    pageCount: result.pageCount || 1,
    method: 'server',
    success: true
  };
};

export const validatePDFFile = (file) => {
  const validTypes = ['application/pdf'];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please select a PDF file.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Please select a PDF smaller than 50MB.');
  }
  
  return true;
};

export const preprocessPDFText = (text) => {
  // Clean up common PDF extraction artifacts
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove page breaks and form feeds
    .replace(/[\f\x0C]/g, ' ')
    // Clean up line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
};

export const extractSectionsFromText = (text) => {
  const sections = {};
  
  // Common SDS section headers
  const sectionPatterns = {
    'identification': /section\s*1\s*[:\-]?\s*identification/i,
    'hazards': /section\s*2\s*[:\-]?\s*hazard/i,
    'composition': /section\s*3\s*[:\-]?\s*composition/i,
    'firstAid': /section\s*4\s*[:\-]?\s*first.*aid/i,
    'firefighting': /section\s*5\s*[:\-]?\s*fire.*fighting/i,
    'accidentalRelease': /section\s*6\s*[:\-]?\s*accidental.*release/i,
    'handlingStorage': /section\s*7\s*[:\-]?\s*handling.*storage/i,
    'exposureControls': /section\s*8\s*[:\-]?\s*exposure.*controls/i,
    'physicalChemical': /section\s*9\s*[:\-]?\s*physical.*chemical/i,
    'stabilityReactivity': /section\s*10\s*[:\-]?\s*stability.*reactivity/i,
    'toxicological': /section\s*11\s*[:\-]?\s*toxicological/i,
    'ecological': /section\s*12\s*[:\-]?\s*ecological/i,
    'disposal': /section\s*13\s*[:\-]?\s*disposal/i,
    'transport': /section\s*14\s*[:\-]?\s*transport/i,
    'regulatory': /section\s*15\s*[:\-]?\s*regulatory/i,
    'other': /section\s*16\s*[:\-]?\s*other/i
  };
  
  const lines = text.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    let foundSection = false;
    
    // Check if this line starts a new section
    for (const [sectionKey, pattern] of Object.entries(sectionPatterns)) {
      if (pattern.test(line)) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        
        currentSection = sectionKey;
        currentContent = [];
        foundSection = true;
        break;
      }
    }
    
    // Add line to current section if we're in a section
    if (!foundSection && currentSection) {
      currentContent.push(line);
    }
  }
  
  // Save final section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }
  
  return sections;
};

export const analyzePDFStructure = (text) => {
  const structure = {
    hasTableOfContents: /table\s+of\s+contents/i.test(text),
    hasSectionNumbers: /section\s+\d+/i.test(text),
    isSDSFormat: /safety\s+data\s+sheet/i.test(text) || /section\s+1.*identification/i.test(text),
    isLabReport: /certificate\s+of\s+analysis|lab.*report|analytical.*results/i.test(text),
    pageCount: (text.match(/page\s+\d+/gi) || []).length,
    wordCount: text.split(/\s+/).length,
    hasFormattedTables: /\t.*\t.*\t/g.test(text) || /\|.*\|.*\|/g.test(text)
  };
  
  return structure;
};

export default {
  extractTextFromPDF,
  validatePDFFile,
  preprocessPDFText,
  extractSectionsFromText,
  analyzePDFStructure
};