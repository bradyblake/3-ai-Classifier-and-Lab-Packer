# CURSOR AI - Phase 1.1: ConstituentFirstClassifier Engine

## 🚀 READY TO COPY/PASTE INTO CURSOR

**Project Location**: `C:\Users\brady\Desktop\8-2-25\REVOLUTIONARY-CLASSIFIER`

---

## PROMPT FOR CURSOR AI:

I need you to build a revolutionary hazardous waste classifier that uses **constituent-first logic**. This is critical: if ANY chemical constituent appears on an SDS, it automatically carries its associated waste codes (P/U/D codes).

### Current Problem
Existing classifiers have 0% accuracy because they use backwards logic. They try to analyze characteristics first, then check for constituents. We're doing it RIGHT: constituents first, characteristics second.

### Your Mission: ConstituentFirstClassifier.js

Create `/src/engines/ConstituentFirstClassifier.js` with this exact logic:

#### Core Algorithm
```javascript
for each chemical in composition {
  cas = chemical.cas_number
  if (pCodeList.contains(cas)) → add P-code 
  if (uCodeList.contains(cas)) → add U-code
  if (dCodeTCLP.contains(cas)) → add D-code
}
return all_waste_codes_found
```

#### Input Format
```javascript
const composition = [
  { name: "Acetone", cas: "67-64-1", percentage: "85%" },
  { name: "Methanol", cas: "67-56-1", percentage: "15%" }
];
```

#### Expected Output  
```javascript
{
  wasteCodes: ["U002", "D001", "U154"],
  reasoning: [
    "67-64-1 (Acetone) → U002 (U-listed waste)",
    "67-64-1 (Acetone) → D001 (Flash point -17°C < 60°C)",  
    "67-56-1 (Methanol) → U154 (U-listed waste)"
  ],
  confidence: 0.95,
  chemicals: [
    { cas: "67-64-1", name: "Acetone", codes: ["U002", "D001"] },
    { cas: "67-56-1", name: "Methanol", codes: ["U154"] }
  ]
}
```

### Data Sources (Already Available)

Load these JSON files in your constructor:

1. **`/data/regulatory/p_code_wastes.json`** - P-codes (acutely hazardous)
2. **`/data/regulatory/u_code_wastes.json`** - U-codes (toxic commercial) 
3. **`/data/regulatory/d_code_limits.json`** - D-codes with TCLP limits
4. **`/data/chemicals/comprehensive_chemical_database.js`** - 2000+ chemicals with properties

### Key Implementation Requirements

#### 1. Efficient Lookup Maps
```javascript
// Build these in constructor for O(1) lookup
this.pCodeMap = new Map(); // cas -> P-code info
this.uCodeMap = new Map(); // cas -> U-code info  
this.dCodeMap = new Map(); // cas -> D-code info
```

#### 2. CAS Number Normalization
```javascript
normalizeCAS(cas) {
  return cas.trim().replace(/\s+/g, '').replace(/[^\d-]/g, '');
}
```

#### 3. Confidence Scoring
- Known CAS in database: confidence = 0.95
- Unknown CAS: confidence = 0.3 (flag for manual review)
- Multiple codes per chemical: average confidence

#### 4. Error Handling
- Handle null/undefined CAS numbers
- Validate CAS format (XXX-XX-X pattern)
- Log unknown chemicals for database expansion

### Critical Business Logic

#### P-Codes (Acutely Hazardous)
- ANY percentage triggers the P-code  
- P001 (Aldrin), P013 (Endrin), etc.
- Most dangerous - always prioritize

#### U-Codes (Toxic Commercial)
- Commercial chemical products
- U002 (Acetone), U154 (Methanol), U019 (Benzene)
- Apply regardless of concentration

#### D-Codes (Characteristics)  
- Some are constituent-based (D004-D043)
- D008 (Lead), D018 (Benzene), D039 (Tetrachloroethylene)
- Apply based on TCLP limits in database

### Test Cases (Must Pass)

Create basic tests in `/test/engines/ConstituentFirstClassifier.test.js`:

```javascript
// Test 1: Acetone should return U002
const result = classifier.classify([
  { name: "Acetone", cas: "67-64-1", percentage: "100%" }
]);
expect(result.wasteCodes).toContain("U002");

// Test 2: Unknown CAS should not crash
const result2 = classifier.classify([
  { name: "Unknown Chemical", cas: "000-00-0", percentage: "50%" }
]);
expect(result2.wasteCodes).toEqual([]);
expect(result2.confidence).toBeLessThan(0.5);

// Test 3: Multiple chemicals
const result3 = classifier.classify([
  { name: "Acetone", cas: "67-64-1", percentage: "85%" },
  { name: "Methanol", cas: "67-56-1", percentage: "15%" }
]);
expect(result3.wasteCodes).toContain("U002"); // Acetone
expect(result3.wasteCodes).toContain("U154"); // Methanol
```

### Performance Requirements
- **Speed**: < 100ms per classification
- **Memory**: Efficient lookup tables
- **Accuracy**: 98%+ on known CAS numbers

### Integration Notes
- Export as ES6 module: `export default ConstituentFirstClassifier;`
- Next phase (Copilot) will build PDF extractor that feeds this engine
- Document any unknown CAS numbers encountered

### Success Criteria
- All test cases pass
- Performance benchmarks met
- Clean code with comprehensive error handling  
- Ready for integration with PDF parser (Phase 2)

**Start with the class structure and P/U/D code loading. Build incrementally and test each component!**

---

## Files You'll Need to Reference

All regulatory data files are ready in:
- `/data/regulatory/p_code_wastes.json`
- `/data/regulatory/u_code_wastes.json`  
- `/data/regulatory/d_code_limits.json`
- `/data/chemicals/comprehensive_chemical_database.js`

**Ready to revolutionize hazardous waste classification! 🚀**