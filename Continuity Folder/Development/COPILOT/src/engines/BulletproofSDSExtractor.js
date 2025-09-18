// BulletproofSDSExtractor.js
// Extracts chemical names, CAS numbers, and percentages from SDS Section 3 with confidence scoring.
// Core logic for advanced PDF parsing as per tracking document.

const pdfParse = require('pdf-parse');

class BulletproofSDSExtractor {
  constructor(options = {}) {
    this.options = options;
  }

  async extract(pdfBuffer) {
    let text = '';
    let warnings = [];
    let extractionQuality = 0;
    let sectionsFound = [];
    let composition = [];

    // 1. Extract text from PDF
    try {
      const data = await pdfParse(pdfBuffer);
      text = data.text;
    } catch (err) {
      warnings.push('PDF parsing failed: ' + err.message);
      return { composition, extractionQuality, sectionsFound, warnings };
    }

    // 2. Detect Section 3 (and optionally Section 9 for validation)
    const section3Match = this._findSection3(text);
    if (!section3Match) {
      warnings.push('Section 3 not found');
      return { composition, extractionQuality, sectionsFound, warnings };
    }
    sectionsFound.push('Section 3');
    const sectionText = section3Match;

    // 3. Multi-pattern extraction
    const patterns = [
      this._extractTablePattern,
      this._extractListPattern,
      this._extractParagraphPattern
    ];
    let allCandidates = [];
    for (const pattern of patterns) {
      const candidates = pattern.call(this, sectionText);
      allCandidates = allCandidates.concat(candidates);
    }

    // 4. Synonym/variation handling (stub)
    // TODO: Implement synonym/variation normalization

    // 5. Validate and score candidates
    composition = allCandidates.map(c => this._scoreCandidate(c));
    if (composition.length > 0) {
      extractionQuality = composition.reduce((a, b) => a + b.confidence, 0) / composition.length;
    }

    // 6. Section 9 detection (optional, for output)
    if (/section\s*9[:.\s]/i.test(text)) {
      sectionsFound.push('Section 9');
    }

    return { composition, extractionQuality, sectionsFound, warnings };
  }

  // --- Section 3 Detection ---
  _findSection3(text) {
    // Look for Section 3 header and extract until next section or end
    const match = text.match(/section\s*3[:.\s][\s\S]*?(?=section\s*\d+[:.\s]|$)/i);
    return match ? match[0] : null;
  }

  // --- Pattern 1: Table Format ---
  _extractTablePattern(sectionText) {
    // Match lines with: Name | CAS | %
    const lines = sectionText.split(/\r?\n/);
    const candidates = [];
    for (const line of lines) {
      const m = line.match(/([A-Za-z0-9\-\s(),.]+)\s*[|\t]\s*(\d{2,3}-\d{2}-\d)\s*[|\t]\s*([\d.\-]+%?)/);
      if (m) {
        candidates.push({ name: m[1].trim(), cas: m[2], percentage: m[3] });
      }
    }
    return candidates;
  }

  // --- Pattern 2: List Format ---
  _extractListPattern(sectionText) {
    // Match bullets: • Acetone (CAS: 67-64-1) ... 85%
    const regex = /[•*-]\s*([A-Za-z0-9\-\s(),.]+)\s*\(?(?:CAS[:\s]*)?(\d{2,3}-\d{2}-\d)\)?[^\d%]*(\d{1,3}(?:\.\d+)?%?)/g;
    const candidates = [];
    let m;
    while ((m = regex.exec(sectionText))) {
      candidates.push({ name: m[1].trim(), cas: m[2], percentage: m[3] });
    }
    return candidates;
  }

  // --- Pattern 3: Paragraph Format ---
  _extractParagraphPattern(sectionText) {
    // e.g. Acetone (67-64-1) at 85% concentration
    const regex = /([A-Za-z0-9\-\s(),.]+)\s*\(?(?:CAS[:\s]*)?(\d{2,3}-\d{2}-\d)\)?[^\d%]*(\d{1,3}(?:\.\d+)?%?)/g;
    const candidates = [];
    let m;
    while ((m = regex.exec(sectionText))) {
      candidates.push({ name: m[1].trim(), cas: m[2], percentage: m[3] });
    }
    return candidates;
  }

  // --- Candidate Scoring and Validation ---
  _scoreCandidate(candidate) {
    // Validate CAS
    const casValid = /^\d{2,3}-\d{2}-\d$/.test(candidate.cas);
    // Confidence: base 0.8, +0.1 for valid CAS, +0.05 for % present
    let confidence = 0.8;
    if (casValid) confidence += 0.1;
    if (candidate.percentage) confidence += 0.05;
    confidence = Math.min(confidence, 0.99);
    return { ...candidate, confidence };
  }
}

module.exports = BulletproofSDSExtractor;
