# CHATGPT - Phase 3: Physical State Logic Engine

## 🎯 Primary Mission: Build PhysicalStateClassifier.js

**Core Logic**: Apply state-dependent classification rules for D001 (ignitable), D002 (corrosive), and D003 (reactive) based on physical state.

## Task List

### ⏳ Waiting for Phase 2 Completion
**Dependencies**: 
- ConstituentFirstClassifier.js from CURSOR
- BulletproofSDSExtractor.js from VS Code Copilot
**Expected Handoff**: Physical state detection from SDS Section 9

### 🔄 Development Tasks (READY TO START)

#### Task 3.1: Create PhysicalStateClassifier.js
**Status**: Not Started  
**Location**: `/src/engines/PhysicalStateClassifier.js`  
**Subtasks**:
- [ ] Create physical state detection from SDS text
- [ ] Implement D001 ignitable logic by state
- [ ] Implement D002 corrosive logic (liquids only)
- [ ] Implement D003 reactive logic (all states)
- [ ] Create state-dependent test criteria
- [ ] Build confidence scoring for state classification

#### Task 3.2: D001 Ignitable Logic (State-Dependent)
**Status**: Not Started  
**Critical User Insight**: Different D001 criteria for each physical state
**Subtasks**:
- [ ] **Liquids**: Flash point < 60°C (140°F) → D001
- [ ] **Solids**: Spontaneous ignition under standard conditions → D001  
- [ ] **Gases**: DOT hazard class 2.1 (flammable gas) → D001
- [ ] **Oxidizers**: DOT hazard class 5.1 oxidizing solids/liquids → D001
- [ ] Flash point extraction from Section 9
- [ ] DOT class extraction from Section 14

#### Task 3.3: D002 Corrosive Logic (Liquids Only)
**Status**: Not Started  
**Critical Rule**: D002 only applies to aqueous liquids
**Subtasks**:
- [ ] **pH ≤ 2**: Strong acid → D002
- [ ] **pH ≥ 12.5**: Strong base → D002
- [ ] **Steel corrosion rate > 6.35 mm/year** → D002
- [ ] Physical state validation (must be liquid)
- [ ] pH extraction from Section 9
- [ ] Non-liquid rejection logic

#### Task 3.4: D003 Reactive Logic (All States)
**Status**: Not Started  
**Subtasks**:
- [ ] Water reactive materials
- [ ] Unstable/explosive materials  
- [ ] Materials forming toxic gases
- [ ] Organic peroxides
- [ ] Reactivity indicators from SDS sections 2, 7, 10
- [ ] GHS hazard statement parsing (H200-series)

#### Task 3.5: Physical State Detection Engine
**Status**: Not Started  
**Location**: `/src/engines/PhysicalStateDetector.js`  
**Subtasks**:
- [ ] Extract from Section 9 "Physical and Chemical Properties"
- [ ] Parse: "Physical state: Liquid", "Form: Solid", etc.
- [ ] Handle state at temperature conditions
- [ ] Confidence scoring for state detection
- [ ] Fallback logic for missing state information

## Key Technical Requirements

### State-Dependent Logic Matrix

| Physical State | D001 Criteria | D002 Criteria | D003 Criteria |
|---------------|---------------|---------------|---------------|
| **Liquid** | Flash point < 60°C | pH ≤2 or ≥12.5 | Water reactive |
| **Solid** | Spontaneous ignition | N/A (not applicable) | Unstable/explosive |
| **Gas** | DOT Class 2.1 | N/A (not applicable) | Forms toxic gas |

### Critical User Correction from Session
> **"Material is solid (not classified as ignitable)"** - This was WRONG  
> Correct logic: Solids CAN be D001 if spontaneously combustible!

### Data Sources for Classification
- **Flash Points**: `/data/chemicals/comprehensive_chemical_database.js`
- **pH Values**: SDS Section 9 extraction + database
- **DOT Classes**: SDS Section 14 + database  
- **Physical States**: SDS Section 9 primary, database fallback

## Critical Patterns to Extract

### Section 9 Patterns
```
Physical state: Liquid
Form: Clear liquid  
Appearance: Colorless liquid
Flash point: -17°C (-1.4°F)
pH: Not applicable
Boiling point: 56°C (133°F)
```

### Section 14 Patterns (DOT Classification)
```
UN number: UN1090
Proper shipping name: Acetone
Hazard class: 3 (Flammable liquid)
Packing group: II
```

### GHS Hazard Statements (Section 2)
```
H225: Highly flammable liquid and vapor
H314: Causes severe skin burns and eye damage  
H260: In contact with water releases flammable gases
```

## Integration Points

### Input from Previous Phases
```javascript
const composition = [
  { name: "Acetone", cas: "67-64-1", percentage: "85%" }
];
const extractedText = "Physical state: Liquid\nFlash point: -17°C";
```

### Output to Final Orchestrator
```javascript
{
  characteristicCodes: ["D001"],
  physicalState: "liquid",
  reasoning: [
    "Physical state: Liquid (from Section 9)",
    "Flash point: -17°C < 60°C threshold → D001"
  ],
  confidence: 0.94
}
```

## Performance Targets
- **Speed**: < 50ms per classification
- **Accuracy**: 95%+ on characteristic hazards
- **State Detection**: 98%+ accuracy
- **Integration**: Seamless with constituent engine

## Edge Cases to Handle
- **Mixed states**: Liquids that freeze, aerosols
- **Temperature-dependent states**: State at use conditions
- **Missing data**: Default classification strategies  
- **Conflicting information**: SDS vs database discrepancies

## Handoff Preparation

When complete, provide:
- [ ] Physical state detection accuracy metrics
- [ ] D001/D002/D003 classification benchmarks
- [ ] Integration testing with Phases 1 & 2
- [ ] Performance optimization results
- [ ] Documentation for Final Orchestrator (Claude)

## Communication Protocol

Update this document after each development session:
1. Mark completed subtasks with [x]
2. Document accuracy improvements on test cases
3. Note integration challenges with previous phases
4. Prepare comprehensive handoff documentation

**Previous AIs**: CURSOR + VS Code Copilot  
**Next AI**: Claude (Final Integration)  
**Status**: Ready to begin upon Phase 2 completion! ⏳