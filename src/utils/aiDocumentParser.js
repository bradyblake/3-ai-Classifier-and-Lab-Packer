// AI-Enhanced Document Parser
// Integrates Groq and Gemini APIs for intelligent document analysis

// API Configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

// Groq AI Integration (Fast, good for structured data)
const parseWithGroq = async (text) => {
  if (!GROQ_API_KEY) {
    console.warn('⚠️ Groq API key not configured');
    return null;
  }

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768', // Fast Mixtral model
        messages: [{
          role: 'user',
          content: `Extract project information from this document and return ONLY valid JSON:

${text}

Extract these fields if present:
- customerName: Company or client name
- projectTitle: Project description or title
- jobNumber: Job/project/PO number
- totalAmount: Total cost or amount (number only)
- address: Project location or address
- quoteNumber: Quote or estimate number

Return only JSON format like: {"customerName": "...", "projectTitle": "...", etc.}`
        }],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    const result = await response.json();

    if (result.choices && result.choices[0]) {
      const content = result.choices[0].message.content.trim();
      // Try to parse JSON from response
      const jsonMatch = content.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Groq API error:', error);
    return null;
  }
};

// Gemini AI Integration (Better understanding, free tier)
const parseWithGemini = async (text) => {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ Gemini API key not configured');
    return null;
  }

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this document and extract project information. Return only valid JSON:

${text}

Extract these fields if present:
- customerName: Company or client name
- projectTitle: Project description or title
- jobNumber: Job/project/PO number
- totalAmount: Total cost (as number)
- address: Project location
- quoteNumber: Quote/estimate number

Return only JSON like: {"customerName": "ABC Corp", "totalAmount": 5000}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    });

    const result = await response.json();

    if (result.candidates && result.candidates[0]) {
      const content = result.candidates[0].content.parts[0].text.trim();
      // Extract JSON from response
      const jsonMatch = content.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    return null;
  }
};

// Fallback to regex-based parsing (original method)
const parseWithRegex = (text) => {
  const patterns = {
    customerName: /(?:customer|client|company)\s*:?\s*([A-Za-z\s&.,'-]+?)(?:\n|,|\.|$)/gi,
    projectTitle: /(?:project|job|work|description|scope)\s*:?\s*([A-Za-z\s-]+?)(?:\n|,|\.|$)/gi,
    jobNumber: /(?:job|project|po|order)\s*#?\s*:?\s*([A-Z0-9-]+)/gi,
    totalAmount: /(?:total|amount|cost|price)\s*:?\s*\$?([\d,]+\.?\d*)/gi,
    address: /(?:address|location|site)\s*:?\s*([A-Za-z0-9\s,.-]+?)(?:\n|zip|state)/gi,
    quoteNumber: /(?:quote|est|estimate)\s*#?\s*:?\s*([A-Z0-9-]+)/gi
  };

  const extractedData = {};

  for (const [field, regex] of Object.entries(patterns)) {
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

  return extractedData;
};

// Main AI-enhanced parsing function
export const parseDocumentWithAI = async (file, content) => {
  try {
    console.log('🤖 Starting AI-enhanced document parsing:', file.name);

    const filename = file.name.toLowerCase();
    let text = '';

    // Convert content to text
    if (file.type.startsWith('text/') || filename.endsWith('.txt')) {
      text = content;
    } else if (filename.endsWith('.csv')) {
      text = content;
    } else {
      text = filename; // Fallback for binary files
    }

    // Try AI parsing first (Groq is faster, try it first)
    let extractedData = await parseWithGroq(text);
    let aiMethod = 'groq';

    // Fallback to Gemini if Groq fails
    if (!extractedData) {
      extractedData = await parseWithGemini(text);
      aiMethod = 'gemini';
    }

    // Final fallback to regex
    if (!extractedData) {
      extractedData = parseWithRegex(text);
      aiMethod = 'regex';
    }

    // Clean and validate extracted data
    const cleanedData = {};
    Object.entries(extractedData || {}).forEach(([key, value]) => {
      if (value && value !== '') {
        cleanedData[key] = value;
      }
    });

    // Calculate confidence score
    const fieldsFound = Object.keys(cleanedData).length;
    const totalPossibleFields = 6; // customerName, projectTitle, jobNumber, totalAmount, address, quoteNumber
    const confidence = fieldsFound / totalPossibleFields;

    const result = {
      extractedData: cleanedData,
      confidence,
      fieldsFound,
      totalFields: totalPossibleFields,
      aiMethod,
      fileContent: content,
      filename: file.name,
      fileType: file.type
    };

    console.log(`✅ AI parsing complete (${aiMethod}):`, {
      fields: fieldsFound,
      confidence: (confidence * 100).toFixed(1) + '%',
      method: aiMethod
    });

    return result;

  } catch (error) {
    console.error('❌ AI document parsing error:', error);

    // Return fallback regex result on error
    const regexData = parseWithRegex(content);
    const fieldsFound = Object.keys(regexData).length;

    return {
      extractedData: regexData,
      confidence: fieldsFound / 6,
      fieldsFound,
      totalFields: 6,
      aiMethod: 'regex-fallback',
      error: error.message,
      fileContent: content,
      filename: file.name,
      fileType: file.type
    };
  }
};

// Export both for backward compatibility
export const parseDocument = parseDocumentWithAI;
export const parseGlobalDocument = parseDocumentWithAI;

// Re-export existing functions
export { findMatchingProjects } from './documentParser';

export default {
  parseDocument: parseDocumentWithAI,
  parseGlobalDocument: parseDocumentWithAI,
  parseDocumentWithAI
};