/**
 * WasteCategoryTree.js
 * Comprehensive waste categorization decision tree for AI training
 *
 * Flow:
 * 1. Parse SDS/Lab report data
 * 2. Determine material state (liquid/solid/gas)
 * 3. Apply RCRA waste codes (D, F, P, U, K) in order
 * 4. Apply state-specific regulations based on user selection
 * 5. Generate compliance forms
 */

import { detectPhysicalState } from './PhysicalStateDetector_COMPLETED_.js';
import fs from 'fs';
import path from 'path';

export class WasteCategoryTree {
  constructor() {
    this.dCodes = [];
    this.fCodes = [];
    this.pCodes = [];
    this.uCodes = [];
    this.kCodes = [];
    this.stateRegulations = {};
    this.loadRegulatoryData();
  }

  async loadRegulatoryData() {
    try {
      // Load RCRA codes using filesystem
      const dataDir = path.resolve('data/regulatory');

      this.dCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'd_code_limits.json'), 'utf8'));
      this.pCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'p_code_wastes.json'), 'utf8'));
      this.uCodes = JSON.parse(fs.readFileSync(path.join(dataDir, 'u_code_wastes.json'), 'utf8'));

      // TODO: Load F and K codes when available
      // TODO: Load state-specific regulations
    } catch (error) {
      console.error('Failed to load regulatory data:', error);
    }
  }

  /**
   * Main classification method
   * @param {Object} sdsData - Parsed SDS/lab report data
   * @param {string} state - State where waste is managed (e.g., 'TX', 'OK')
   * @returns {Object} Classification results with waste codes and compliance info
   */
  async classifyWaste(sdsData, state = null) {
    const results = {
      materialState: 'unknown',
      rcraWasteCodes: [],
      stateWasteCodes: [],
      classification: 'non-hazardous',
      complianceRequirements: [],
      forms: [],
      confidence: 0,
      reasoning: []
    };

    // Step 1: Determine material state
    const stateResult = this.determinePhysicalState(sdsData);
    results.materialState = stateResult.state;
    results.confidence = stateResult.confidence;
    results.reasoning.push(`Material state: ${stateResult.state} (confidence: ${Math.round(stateResult.confidence * 100)}%)`);

    // Step 2: Apply RCRA D codes
    const dCodeResults = await this.checkDCodes(sdsData, results.materialState);
    results.rcraWasteCodes.push(...dCodeResults.codes);
    results.reasoning.push(...dCodeResults.reasoning);

    // Step 3: Apply RCRA F codes
    const fCodeResults = await this.checkFCodes(sdsData, results.materialState);
    results.rcraWasteCodes.push(...fCodeResults.codes);
    results.reasoning.push(...fCodeResults.reasoning);

    // Step 4: Apply RCRA P codes
    const pCodeResults = await this.checkPCodes(sdsData);
    results.rcraWasteCodes.push(...pCodeResults.codes);
    results.reasoning.push(...pCodeResults.reasoning);

    // Step 5: Apply RCRA U codes
    const uCodeResults = await this.checkUCodes(sdsData);
    results.rcraWasteCodes.push(...uCodeResults.codes);
    results.reasoning.push(...uCodeResults.reasoning);

    // Step 6: Apply RCRA K codes
    const kCodeResults = await this.checkKCodes(sdsData, results.materialState);
    results.rcraWasteCodes.push(...kCodeResults.codes);
    results.reasoning.push(...kCodeResults.reasoning);

    // Step 7: Apply state-specific regulations
    if (state) {
      const stateResults = await this.checkStateRegulations(sdsData, results.materialState, state);
      results.stateWasteCodes.push(...stateResults.codes);
      results.complianceRequirements.push(...stateResults.requirements);
      results.forms.push(...stateResults.forms);
      results.reasoning.push(...stateResults.reasoning);
    }

    // Step 8: Final classification
    if (results.rcraWasteCodes.length > 0 || results.stateWasteCodes.length > 0) {
      results.classification = 'hazardous';
    }

    return results;
  }

  /**
   * Determine physical state of material
   */
  determinePhysicalState(sdsData) {
    let combinedText = '';

    // Combine relevant SDS sections
    if (sdsData.sections) {
      combinedText += sdsData.sections['9'] || ''; // Physical properties
      combinedText += sdsData.sections['1'] || ''; // Product identification
      combinedText += sdsData.sections['3'] || ''; // Composition
    }

    if (sdsData.text) {
      combinedText += sdsData.text;
    }

    return detectPhysicalState({ text: combinedText });
  }

  /**
   * Check RCRA D codes (Characteristic hazards)
   */
  async checkDCodes(sdsData, materialState) {
    const results = { codes: [], reasoning: [] };

    for (const dCode of this.dCodes) {
      const decision = this.evaluateDCode(dCode, sdsData, materialState);
      if (decision.applies) {
        results.codes.push({
          code: dCode.code,
          description: dCode.description,
          reason: decision.reason
        });
        results.reasoning.push(`${dCode.code}: ${decision.reason}`);
      } else {
        results.reasoning.push(`${dCode.code}: Not applicable - ${decision.reason}`);
      }
    }

    return results;
  }

  /**
   * Evaluate individual D code
   */
  evaluateDCode(dCode, sdsData, materialState) {
    switch (dCode.code) {
      case 'D001': // Ignitability
        return this.checkIgnitability(sdsData, materialState);
      case 'D002': // Corrosivity
        return this.checkCorrosivity(sdsData, materialState);
      case 'D003': // Reactivity
        return this.checkReactivity(sdsData, materialState);
      default:
        if (dCode.threshold && dCode.cas) {
          return this.checkToxicityCharacteristic(dCode, sdsData);
        }
        return { applies: false, reason: 'No evaluation criteria available' };
    }
  }

  /**
   * Check D001 - Ignitability
   */
  checkIgnitability(sdsData, materialState) {
    // D001 primarily applies to liquids, with specific exceptions for solids
    if (materialState === 'gas') {
      return { applies: false, reason: 'D001 does not typically apply to gases' };
    }

    // Check flash point data
    const flashPoint = this.extractFlashPoint(sdsData);

    if (flashPoint !== null) {
      if (materialState === 'liquid' && flashPoint <= 60) {
        return { applies: true, reason: `Liquid with flash point of ${flashPoint}°C (≤60°C)` };
      }
      if (materialState === 'solid' && this.checkIgnitableSolid(sdsData)) {
        return { applies: true, reason: 'Solid that is capable of spontaneous combustion' };
      }
      return { applies: false, reason: `Flash point ${flashPoint}°C exceeds 60°C threshold` };
    }

    // Check for ignitable descriptions
    const ignitable = this.checkIgnitableKeywords(sdsData);
    if (ignitable.found) {
      return { applies: true, reason: `Ignitable characteristics found: ${ignitable.evidence}` };
    }

    return { applies: false, reason: 'No flash point data or ignitable characteristics found' };
  }

  /**
   * Check D002 - Corrosivity
   */
  checkCorrosivity(sdsData, materialState) {
    // D002 applies primarily to aqueous solutions
    if (materialState === 'gas') {
      return { applies: false, reason: 'D002 does not apply to gases' };
    }

    const ph = this.extractPH(sdsData);

    if (ph !== null) {
      if (ph <= 2.0 || ph >= 12.5) {
        return { applies: true, reason: `pH of ${ph} (≤2.0 or ≥12.5)` };
      }
      return { applies: false, reason: `pH of ${ph} is within safe range (2.0-12.5)` };
    }

    // Check for corrosive descriptions
    const corrosive = this.checkCorrosiveKeywords(sdsData);
    if (corrosive.found) {
      return { applies: true, reason: `Corrosive characteristics found: ${corrosive.evidence}` };
    }

    return { applies: false, reason: 'No pH data or corrosive characteristics found' };
  }

  /**
   * Check D003 - Reactivity
   */
  checkReactivity(sdsData, materialState) {
    const reactive = this.checkReactiveKeywords(sdsData);

    if (reactive.found) {
      return { applies: true, reason: `Reactive characteristics found: ${reactive.evidence}` };
    }

    return { applies: false, reason: 'No reactive characteristics identified' };
  }

  /**
   * Check toxicity characteristic (D004-D043)
   */
  checkToxicityCharacteristic(dCode, sdsData) {
    // Look for the specific chemical in composition
    const composition = this.extractComposition(sdsData);

    for (const component of composition) {
      if (component.cas === dCode.cas ||
          component.name.toLowerCase().includes(dCode.constituent.toLowerCase())) {

        // If TCLP data is available, check against threshold
        const tclpValue = this.extractTCLPValue(sdsData, dCode.cas);
        if (tclpValue !== null) {
          if (tclpValue >= dCode.threshold) {
            return {
              applies: true,
              reason: `TCLP value of ${tclpValue} mg/L exceeds threshold of ${dCode.threshold} mg/L for ${dCode.constituent}`
            };
          }
          return {
            applies: false,
            reason: `TCLP value of ${tclpValue} mg/L below threshold of ${dCode.threshold} mg/L for ${dCode.constituent}`
          };
        }

        // If component is present but no TCLP data, flag for testing
        return {
          applies: false,
          reason: `${dCode.constituent} present but TCLP testing required to determine if threshold exceeded`
        };
      }
    }

    return { applies: false, reason: `${dCode.constituent} not found in composition` };
  }

  /**
   * Check RCRA F codes (Non-specific source wastes)
   */
  async checkFCodes(sdsData, materialState) {
    const results = { codes: [], reasoning: [] };

    // F codes depend on source/process - need implementation based on waste origin
    // Common F codes:
    // F001-F005: Spent halogenated solvents
    // F006-F019: Spent non-halogenated solvents
    // F020-F023: Wastes from production of certain chemicals

    results.reasoning.push('F codes evaluation requires waste source/process information - not implemented in this version');

    return results;
  }

  /**
   * Check RCRA P codes (Acutely hazardous wastes)
   */
  async checkPCodes(sdsData) {
    const results = { codes: [], reasoning: [] };

    const composition = this.extractComposition(sdsData);

    for (const pCode of this.pCodes) {
      const found = composition.some(component =>
        component.cas === pCode.cas_number ||
        component.name.toLowerCase().includes(pCode.chemical_name.toLowerCase())
      );

      if (found) {
        results.codes.push({
          code: pCode.waste_code,
          description: `${pCode.chemical_name} - ${pCode.hazardous_properties.join(', ')}`,
          reason: `Acutely hazardous chemical ${pCode.chemical_name} present`
        });
        results.reasoning.push(`${pCode.waste_code}: ${pCode.chemical_name} identified in composition`);
      }
    }

    if (results.codes.length === 0) {
      results.reasoning.push('No P-listed chemicals found in composition');
    }

    return results;
  }

  /**
   * Check RCRA U codes (Hazardous wastes from non-specific sources)
   */
  async checkUCodes(sdsData) {
    const results = { codes: [], reasoning: [] };

    const composition = this.extractComposition(sdsData);

    for (const uCode of this.uCodes) {
      const found = composition.some(component =>
        component.cas === uCode.cas ||
        component.name.toLowerCase().includes(uCode.chemical.toLowerCase())
      );

      if (found) {
        results.codes.push({
          code: uCode.code,
          description: `${uCode.chemical} - Toxic`,
          reason: `Hazardous chemical ${uCode.chemical} present`
        });
        results.reasoning.push(`${uCode.code}: ${uCode.chemical} identified in composition`);
      }
    }

    if (results.codes.length === 0) {
      results.reasoning.push('No U-listed chemicals found in composition');
    }

    return results;
  }

  /**
   * Check RCRA K codes (Source-specific wastes)
   */
  async checkKCodes(sdsData, materialState) {
    const results = { codes: [], reasoning: [] };

    // K codes are source-specific and require knowledge of industrial process
    results.reasoning.push('K codes evaluation requires specific industrial source information - not implemented in this version');

    return results;
  }

  /**
   * Check state-specific regulations
   */
  async checkStateRegulations(sdsData, materialState, state) {
    const results = { codes: [], requirements: [], forms: [], reasoning: [] };

    switch (state.toUpperCase()) {
      case 'TX':
        return this.checkTexasRegulations(sdsData, materialState);
      case 'OK':
        return this.checkOklahomaRegulations(sdsData, materialState);
      default:
        results.reasoning.push(`State-specific regulations for ${state} not yet implemented`);
        return results;
    }
  }

  /**
   * Check Texas TCEQ regulations (RG-22)
   */
  checkTexasRegulations(sdsData, materialState) {
    const results = { codes: [], requirements: [], forms: [], reasoning: [] };

    // Texas uses form codes and classifications H, 1, 2, 3
    // This would require loading RG-22 regulation data

    results.requirements.push('Texas waste classification per TCEQ regulations');
    results.forms.push({
      name: 'Texas Waste Classification Form',
      type: 'TCEQ',
      required: true
    });
    results.reasoning.push('Texas TCEQ RG-22 classification system - implementation pending');

    return results;
  }

  /**
   * Check Oklahoma DEQ regulations
   */
  checkOklahomaRegulations(sdsData, materialState) {
    const results = { codes: [], requirements: [], forms: [], reasoning: [] };

    results.requirements.push('Oklahoma DEQ waste generator registration');
    results.forms.push({
      name: 'Oklahoma Waste Generator Form',
      type: 'DEQ',
      required: true,
      printable: true
    });
    results.reasoning.push('Oklahoma DEQ specific forms - implementation pending');

    return results;
  }

  // Utility methods for data extraction

  extractFlashPoint(sdsData) {
    // Implementation to extract flash point from SDS data
    // This would parse Section 9 physical properties
    return null; // Placeholder
  }

  extractPH(sdsData) {
    // Implementation to extract pH from SDS data
    return null; // Placeholder
  }

  extractComposition(sdsData) {
    // Implementation to extract chemical composition from Section 3
    return []; // Placeholder
  }

  extractTCLPValue(sdsData, cas) {
    // Implementation to extract TCLP test results if available
    return null; // Placeholder
  }

  checkIgnitableKeywords(sdsData) {
    return { found: false, evidence: '' }; // Placeholder
  }

  checkCorrosiveKeywords(sdsData) {
    return { found: false, evidence: '' }; // Placeholder
  }

  checkReactiveKeywords(sdsData) {
    return { found: false, evidence: '' }; // Placeholder
  }

  checkIgnitableSolid(sdsData) {
    return false; // Placeholder
  }
}

export default WasteCategoryTree;