# VS CODE COPILOT - Phase 2: Advanced PDF Parser

## 🎯 Primary Mission: Build BulletproofSDSExtractor.js

**Core Logic**: Extract chemical names and CAS numbers from SDS Section 3 with maximum accuracy and confidence scoring.

## Task List

### ⏳ Waiting for Phase 1 Completion
**Dependency**: ConstituentFirstClassifier.js from CURSOR  
**Expected Handoff**: Chemical composition array format specification

### 🔄 Development Tasks (READY TO START)

#### Task 2.1: Create BulletproofSDSExtractor.js
**Status**: Not Started  
**Location**: `/src/engines/BulletproofSDSExtractor.js`  
**Subtasks**:
- [ ] Create PDF text extraction with pdf-parse
- [ ] Build Section 3 detection patterns
- [ ] Implement multi-pattern chemical name extraction
- [ ] Build CAS number validation and extraction
- [ ] Create confidence scoring system
- [ ] Handle percentage extraction for compositions

**Expected Output**:
```javascript
{
  composition: [
    { name: "Acetone", cas: "67-64-1", percentage: "85%", confidence: 0.95 },
    { name: "Methanol", cas: "67-56-1", percentage: "15%", confidence: 0.88 }
  ],
  extractionQuality: 0.92,
  sectionsFound: ["Section 3", "Section 9"],
  warnings: []
}
```

#### Task 2.2: Multi-Pattern Recognition System
**Status**: Not Started  
**Subtasks**:
- [ ] Pattern 1: Table format (Name | CAS | %)
- [ ] Pattern 2: List format with bullets/numbers  
- [ ] Pattern 3: Paragraph format embedded text
- [ ] Pattern 4: Chemical name variations and synonyms
- [ ] Pattern 5: CAS number format validation (XXX-XX-X)
- [ ] Confidence weighting system for pattern matches

#### Task 2.3: Advanced PDF Processing
**Status**: Not Started  
**Subtasks**:
- [ ] Handle multi-column layouts
- [ ] Process tables with merged cells
- [ ] Extract text from embedded images (OCR fallback)
- [ ] Handle rotated text and headers
- [ ] Process multi-page Section 3 content
- [ ] Error recovery for corrupted PDFs

#### Task 2.4: Integration Testing
**Status**: Not Started  
**Location**: `/test/engines/BulletproofSDSExtractor.test.js`  
**Subtasks**:
- [ ] Test with known SDS files (Acetone, Methanol, etc.)
- [ ] Test extraction accuracy vs manual parsing
- [ ] Performance testing (target < 2 seconds per PDF)
- [ ] Error handling for malformed PDFs
- [ ] Integration with ConstituentFirstClassifier

## Key Technical Requirements

### PDF Processing Libraries
- **Primary**: pdf-parse (lightweight, fast)
- **Fallback**: pdf2pic + OCR for image-based PDFs
- **Validation**: CAS number format checking
- **Performance**: < 2 seconds per SDS analysis

### Accuracy Targets
- **Chemical Names**: 95%+ extraction accuracy
- **CAS Numbers**: 98%+ accuracy (critical for classification)
- **Percentages**: 90%+ accuracy (less critical)
- **Section Detection**: 99%+ (must find Section 3)

## Critical Patterns to Handle

### Pattern Examples from Real SDSs
```
Table Format:
Chemical Name          | CAS No.    | Concentration
Acetone                | 67-64-1    | 85-90%
Methanol               | 67-56-1    | 10-15%

List Format:
• Acetone (CAS: 67-64-1) .................. 85%
• Methanol (67-56-1) ..................... 15%

Paragraph Format:
This product contains Acetone (67-64-1) at 85% concentration
and Methanol (CAS No. 67-56-1) at 15% by weight.
```

### Error Patterns to Handle
- Missing CAS numbers
- Inconsistent chemical naming
- Percentage ranges vs exact values
- Proprietary/confidential ingredients
- Non-hazardous components mixed with hazardous

## Integration Points

### Input Interface
```javascript
const extractor = new BulletproofSDSExtractor();
const result = await extractor.extract(pdfBuffer);
```

### Output Interface (to ConstituentFirstClassifier)
```javascript
const classifier = new ConstituentFirstClassifier();
const classification = await classifier.classify(result.composition);
```

## Handoff Preparation

When complete, provide:
- [ ] Extraction accuracy benchmarks on test SDS files
- [ ] Performance metrics (speed, memory usage)
- [ ] Error handling documentation
- [ ] Integration examples with Phase 1 engine
- [ ] Known limitations and edge cases

## Communication Protocol

Update this document after each development session:
1. Mark completed subtasks with [x]
2. Document extraction accuracy improvements
3. Note performance optimizations
4. Prepare detailed handoff for Phase 3 (ChatGPT)

**Previous AI**: CURSOR (ConstituentFirstClassifier)  
**Next AI**: ChatGPT (Physical State Logic)  
**Status**: Ready to begin upon Phase 1 completion! ⏳