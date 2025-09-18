// BulletproofSDSExtractor.test.js
// Integration tests for BulletproofSDSExtractor

const fs = require('fs');
const path = require('path');
const BulletproofSDSExtractor = require('../../src/engines/BulletproofSDSExtractor');

describe('BulletproofSDSExtractor', () => {
  let extractor;
  beforeAll(() => {
    extractor = new BulletproofSDSExtractor();
  });

  it('should extract composition from a known Acetone/Methanol SDS PDF', async () => {
    const pdfBuffer = fs.readFileSync(path.join(__dirname, 'fixtures', 'acetone_methanol.pdf'));
    const result = await extractor.extract(pdfBuffer);
    expect(result.composition.length).toBeGreaterThan(0);
    expect(result.composition[0]).toHaveProperty('name');
    expect(result.composition[0]).toHaveProperty('cas');
    expect(result.composition[0]).toHaveProperty('percentage');
    expect(result.composition[0]).toHaveProperty('confidence');
    expect(result.sectionsFound).toContain('Section 3');
    expect(result.extractionQuality).toBeGreaterThan(0.8);
  });

  it('should handle malformed PDFs gracefully', async () => {
    const pdfBuffer = Buffer.from('not a real pdf');
    const result = await extractor.extract(pdfBuffer);
    expect(result.composition.length).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // Add more tests for performance, error handling, and edge cases as needed
});
