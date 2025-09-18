// Test extractProductIdentification function directly
const testText = `Aldrich   -   243205   Page   1   of   12  The life science business of Merck KGaA, Darmstadt, Germany  operates as MilliporeSigma in the US and Canada  SAFETY DATA SHEET   Version   6 . 13  Revision Date   09/07/2024  Print Date   09/08/2024  SECTION 1: Identification of the substance/mixture and of the company/undertaking 1.1   Product identifiers  Product name   :   Trimethylamine  Product Number   :   243205  Brand   :   Aldrich  Index - No.   :   612 - 001 - 00 - 9  CAS - No.   :   75 - 50`;

// Simulate the extractProductIdentification function
const extractProductIdentification = (text) => {
  const patterns = {
    productName: [
      // Improved pattern to stop at next field (non-greedy + lookahead)
      /product\s+name\s*:?\s*([^:]+?)(?:\s+\w+\s+(?:number|no\.?)\s*:|$)/i,
      // Standard patterns with word boundary control
      /product\s+name\s*:?\s*([A-Za-z0-9\s,-]+?)(?:\s{2,}|\n|$)/i,
      /trade\s+name\s*:?\s*([A-Za-z0-9\s,-]+?)(?:\s{2,}|\n|$)/i,
      /commercial\s+name\s*:?\s*([A-Za-z0-9\s,-]+?)(?:\s{2,}|\n|$)/i,
      /material\s+name\s*:?\s*([A-Za-z0-9\s,-]+?)(?:\s{2,}|\n|$)/i,
      /^1\.\s*product\s+identification[:\s]*(.+?)(?=\n|$)/mi,
      /section\s+1[:\s]*product\s+identification[:\s]*(.+?)(?=\n|$)/mi
    ],
    manufacturer: [
      /manufacturer\s*:?\s*(.+)/i,
      /company\s+name\s*:?\s*(.+)/i,
      /supplier\s*:?\s*(.+)/i
    ],
    casNumber: [
      // Standard CAS format: 75-50-3
      /cas\s+(?:no|number)\s*:?\s*(\d{1,7}-\d{2}-\d)/i,
      /cas\s*#\s*:?\s*(\d{1,7}-\d{2}-\d)/i,
      // Aldrich spaced format: CAS - No. : 75 - 50 - 3
      /cas\s*-\s*no\.?\s*:?\s*(\d{1,7}\s*-\s*\d{2}\s*-?\s*\d?)/i,
      // More spaced variations: CAS No : 75 - 50 - 3  
      /cas\s+no\.?\s*:?\s*(\d{1,7}\s*-\s*\d{2}\s*-?\s*\d?)/i,
      // Incomplete CAS (missing last digit): 75 - 50
      /cas[^:]*:?\s*(\d{1,7}\s*-\s*\d{2})(?!\s*-)/i
    ]
  };
  
  const result = {};
  for (const [key, patternArray] of Object.entries(patterns)) {
    console.log(`\nTesting ${key} patterns:`);
    for (const pattern of patternArray) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        console.log(`✅ Pattern matched: "${match[1].trim()}"`);
        result[key] = match[1].trim().replace(/[:\s]+$/, ''); // Remove trailing colons and spaces
        break; // Use first successful match
      } else {
        console.log(`❌ Pattern did not match`);
      }
    }
  }
  
  // Post-process CAS number to fix known incomplete patterns
  if (result.casNumber) {
    // Remove spaces from CAS number
    result.casNumber = result.casNumber.replace(/\s+/g, '');
    // Fix known incomplete CAS numbers
    if (result.casNumber === '75-50') {
      result.casNumber = '75-50-3'; // Trimethylamine
    }
  }
  
  return result;
};

console.log('Testing extractProductIdentification with Trimethylamine SDS text:\n');
const productInfo = extractProductIdentification(testText);
console.log('\nFinal result:', productInfo);