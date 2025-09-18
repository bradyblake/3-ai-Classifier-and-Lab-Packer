# CURSOR AI - Phase 1: Constituent Engine Development

## 🎯 Primary Mission: Build ConstituentFirstClassifier.js

**Core Logic**: If ANY chemical constituent appears on an SDS, it automatically carries its associated waste codes (P/U/D codes).

## Task List

### ✅ Setup Tasks
- [x] Project structure created
- [x] Regulatory data files available in `/data/regulatory/`
- [x] Chemical database available in `/data/chemicals/`

### 🔄 Development Tasks (CURRENT FOCUS)

#### Task 1.1: Create ConstituentFirstClassifier.js
**Status**: Not Started  
**Location**: `/src/engines/ConstituentFirstClassifier.js`  
**Subtasks**:
- [ ] Create class structure with constructor
- [ ] Load P-code wastes from `/data/regulatory/p_code_wastes.json`  
- [ ] Load U-code wastes from `/data/regulatory/u_code_wastes.json`
- [ ] Load D-code limits from `/data/regulatory/d_code_limits.json`
- [ ] Create CAS → waste code mapping system
- [ ] Implement `classify(composition)` method

**Expected Input**:
```javascript
const composition = [
  { name: "Acetone", cas: "67-64-1", percentage: "85%" },
  { name: "Methanol", cas: "67-56-1", percentage: "15%" }
];
```

**Expected Output**:
```javascript
{
  wasteCodes: ["U002", "D001", "U154"],
  reasoning: [
    "67-64-1 (Acetone) → U002 (U-listed waste)",
    "67-64-1 (Acetone) → D001 (Flash point -17°C < 60°C)",
    "67-56-1 (Methanol) → U154 (U-listed waste)"
  ],
  confidence: 0.95
}
```

#### Task 1.2: Create Basic Test Suite
**Status**: Not Started  
**Location**: `/test/engines/ConstituentFirstClassifier.test.js`  
**Subtasks**:
- [ ] Test P-code recognition (e.g., Aldrin → P001)
- [ ] Test U-code recognition (e.g., Acetone → U002)  
- [ ] Test D-code recognition (e.g., Lead → D008)
- [ ] Test multi-chemical compositions
- [ ] Test edge cases (unknown CAS numbers)

#### Task 1.3: Integration Preparation
**Status**: Not Started  
**Subtasks**:
- [ ] Export class as ES6 module
- [ ] Create usage documentation
- [ ] Performance testing (target < 100ms per classification)
- [ ] Mark as `_COMPLETED_` when ready for handoff

## Key Technical Requirements

### Data Sources (Already Available)
- **P-codes**: `/data/regulatory/p_code_wastes.json` (Acutely hazardous)
- **U-codes**: `/data/regulatory/u_code_wastes.json` (Toxic commercial chemicals)  
- **D-codes**: `/data/regulatory/d_code_limits.json` (Characteristic hazards with TCLP limits)
- **Chemicals**: `/data/chemicals/comprehensive_chemical_database.js` (2000+ chemicals with properties)

### Performance Targets
- **Speed**: < 100ms per classification
- **Accuracy**: 98%+ on known CAS numbers
- **Coverage**: All EPA P/U/D codes (400+ chemicals)
- **Memory**: Efficient lookup tables, no redundant data loading

## Implementation Notes

### Critical Insight from User
> "Any D code constituent present on SDS will necessitate that D code be applied"

This means:
- If Benzene (71-43-2) appears at ANY percentage → D018
- If Lead compounds appear → D008  
- If Acetone appears → U002 + D001 (flash point)
- **No minimum thresholds for constituent-based codes**

### Error Prevention
- Validate CAS number format (XXX-XX-X)
- Handle missing/null CAS numbers gracefully
- Log unknown chemicals for database expansion
- Never return empty classification for known hazardous materials

## Handoff Preparation

When complete, create summary with:
- [ ] Function signatures and usage examples
- [ ] Test results showing 95%+ accuracy
- [ ] Performance benchmarks
- [ ] Integration instructions for next AI (Copilot)
- [ ] Known limitations or edge cases

## Communication Protocol

Update this document after each development session:
1. Mark completed subtasks with [x]
2. Note any issues or blockers
3. Update status and next steps
4. Prepare handoff notes when phase complete

**Next AI Handoff**: VS Code Copilot (PDF Parser development)  
**Current Status**: Ready to begin Phase 1 development! 🚀