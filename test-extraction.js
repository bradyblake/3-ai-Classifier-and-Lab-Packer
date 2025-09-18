// Test extraction patterns with actual SDS text
const testText = `Aldrich   -   243205   Page   1   of   12  The life science business of Merck KGaA, Darmstadt, Germany  operates as MilliporeSigma in the US and Canada  SAFETY DATA SHEET   Version   6 . 13  Revision Date   09/07/2024  Print Date   09/08/2024  SECTION 1: Identification of the substance/mixture and of the company/undertaking 1.1   Product identifiers  Product name   :   Trimethylamine  Product Number   :   243205  Brand   :   Aldrich  Index - No.   :   612 - 001 - 00 - 9  CAS - No.   :   75 - 50`;

// Test product name patterns
const productPatterns = [
  /product\s+name\s*:?\s*(.+)/i,
  /Product\s+name\s*:\s*([^\s].+?)(?:\s{2,}|\n|$)/i,
  /Product\s+name\s+:\s+(\S+)/i,
];

console.log("Testing product name patterns:");
productPatterns.forEach((pattern, i) => {
  const match = testText.match(pattern);
  if (match) {
    console.log(`Pattern ${i}: MATCHED - "${match[1]}"`);
  } else {
    console.log(`Pattern ${i}: NO MATCH`);
  }
});

// Test CAS patterns
const casPatterns = [
  /cas\s*-\s*no\.?\s*:?\s*(\d{1,7}\s*-\s*\d{2}\s*-?\s*\d?)/i,
  /CAS\s*-\s*No\.\s*:\s*([\d\s-]+)/i,
];

console.log("\nTesting CAS patterns:");
casPatterns.forEach((pattern, i) => {
  const match = testText.match(pattern);
  if (match) {
    console.log(`Pattern ${i}: MATCHED - "${match[1]}"`);
  } else {
    console.log(`Pattern ${i}: NO MATCH`);
  }
});