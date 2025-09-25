// Document Parser Utility
// Analyzes and extracts data from uploaded documents

export const parseDocument = async (file, content) => {
  try {
    console.log('📄 Parsing document:', file.name);

    const filename = file.name.toLowerCase();
    let extractedData = {};
    let text = '';

    // Convert content to text based on file type
    if (file.type.startsWith('text/') || filename.endsWith('.txt')) {
      text = content;
    } else if (filename.endsWith('.csv')) {
      text = content;
    } else {
      text = filename; // Fallback for binary files
    }

    // Extract key project information using patterns
    const patterns = {
      customerName: /(?:customer|client|company)\s*:?\s*([A-Za-z\s&.,'-]+?)(?:\n|,|\.|$)/gi,
      projectTitle: /(?:project|job|work|description|scope)\s*:?\s*([A-Za-z\s-]+?)(?:\n|,|\.|$)/gi,
      jobNumber: /(?:job|project|po|order)\s*#?\s*:?\s*([A-Z0-9-]+)/gi,
      totalAmount: /(?:total|amount|cost|price)\s*:?\s*\$?([\d,]+\.?\d*)/gi,
      address: /(?:address|location|site)\s*:?\s*([A-Za-z0-9\s,.-]+?)(?:\n|zip|state)/gi,
      quoteNumber: /(?:quote|est|estimate)\s*#?\s*:?\s*([A-Z0-9-]+)/gi
    };

    // Enhanced patterns for structured quotes
    const structuredQuotePatterns = {
      customerName: /^([A-Za-z\s&.,'-]+?)(?:\n|\r)/m, // First line is customer
      location: /^[A-Za-z\s&.,'-]+?\n([A-Za-z0-9\s,.-]+?\n[A-Za-z0-9\s,.-]+?)(?:\n|$)/m, // Next 2 lines are location
      projectTitle: /re:\s*\(([^)]+)\)/gi, // Project title in "re: (title)" format
      quoteNumber: /re:\s*\([^)]+\)\s*\n([A-Z0-9-]+)/gi, // Quote number after re: line
      scopeDetails: /scope[:\s]+([^]+?)(?=cost|table|total|$)/gi, // Scope section content
      totalAmount: /(?:total|final).*?\$?([\d,]+\.?\d*)(?:\s|$)/gi // Total amount from cost table
    };

    // Try structured quote parsing first
    if (text.includes('re:') && text.includes('scope')) {
      console.log('📋 Detected structured quote format');

      for (const [field, regex] of Object.entries(structuredQuotePatterns)) {
        const matches = [...text.matchAll(regex)];
        if (matches.length > 0) {
          let value = matches[0][1]?.trim();
          if (value) {
            if (field === 'totalAmount') {
              value = parseFloat(value.replace(/,/g, ''));
            }
            extractedData[field] = value;
          }
        }
      }
    }

    // Fallback to general patterns
    for (const [field, regex] of Object.entries(patterns)) {
      if (!extractedData[field]) {
        const matches = [...text.matchAll(regex)];
        if (matches.length > 0) {
          let value = matches[0][1]?.trim();
          if (value) {
            if (field === 'totalAmount') {
              value = parseFloat(value.replace(/,/g, ''));
            }
            extractedData[field] = value;
          }
        }
      }
    }

    // Calculate confidence score
    const fieldsFound = Object.keys(extractedData).filter(key => extractedData[key]);
    const confidence = fieldsFound.length / Object.keys(patterns).length;

    const result = {
      extractedData,
      confidence,
      fieldsFound: fieldsFound.length,
      totalFields: Object.keys(patterns).length,
      fileContent: content,
      filename: file.name,
      fileType: file.type
    };

    console.log('✅ Document parsing complete:', {
      fields: fieldsFound.length,
      confidence: (confidence * 100).toFixed(1) + '%'
    });

    return result;

  } catch (error) {
    console.error('❌ Document parsing error:', error);
    return {
      extractedData: {},
      confidence: 0,
      fieldsFound: 0,
      totalFields: 0,
      error: error.message,
      fileContent: content,
      filename: file.name,
      fileType: file.type
    };
  }
};

// Find potential matching projects based on extracted data
export const findMatchingProjects = (extractedData, existingCards) => {
  const matches = [];
  const searchTerms = [
    extractedData.customerName,
    extractedData.projectTitle,
    extractedData.jobNumber,
    extractedData.address
  ].filter(Boolean);

  if (searchTerms.length === 0) {
    return [];
  }

  existingCards.forEach(card => {
    let matchScore = 0;
    const matchedFields = [];

    // Check customer name match
    if (extractedData.customerName && card.customerName) {
      const similarity = calculateStringSimilarity(
        extractedData.customerName.toLowerCase(),
        card.customerName.toLowerCase()
      );
      if (similarity > 0.7) {
        matchScore += 40;
        matchedFields.push('customer');
      }
    }

    // Check project title match
    if (extractedData.projectTitle && card.title) {
      const similarity = calculateStringSimilarity(
        extractedData.projectTitle.toLowerCase(),
        card.title.toLowerCase()
      );
      if (similarity > 0.6) {
        matchScore += 30;
        matchedFields.push('title');
      }
    }

    // Check job number match
    if (extractedData.jobNumber && card.jobNumber) {
      if (extractedData.jobNumber === card.jobNumber) {
        matchScore += 50;
        matchedFields.push('jobNumber');
      }
    }

    // Check address/location match
    if (extractedData.address && (card.location || card.address)) {
      const cardLocation = card.location || card.address;
      const similarity = calculateStringSimilarity(
        extractedData.address.toLowerCase(),
        cardLocation.toLowerCase()
      );
      if (similarity > 0.5) {
        matchScore += 20;
        matchedFields.push('location');
      }
    }

    if (matchScore > 50) { // Minimum threshold for a match
      matches.push({
        ...card,
        matchScore,
        matchedFields,
        confidence: matchScore / 100
      });
    }
  });

  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
};

// Calculate string similarity using Levenshtein distance
const calculateStringSimilarity = (str1, str2) => {
  if (str1.length === 0) return str2.length === 0 ? 1 : 0;
  if (str2.length === 0) return 0;

  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLength = Math.max(str1.length, str2.length);
  return (maxLength - matrix[str2.length][str1.length]) / maxLength;
};

// Alias for parseDocument to match existing usage
export const parseGlobalDocument = parseDocument;

export default {
  parseDocument,
  parseGlobalDocument,
  findMatchingProjects
};