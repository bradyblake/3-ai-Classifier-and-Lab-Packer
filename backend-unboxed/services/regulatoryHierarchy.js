// Regulatory Classification Hierarchy
// Federal vs State precedence rules for hazardous waste classification

class RegulatoryHierarchy {
  constructor() {
    // Federal exemptions that allow state flexibility
    this.federalExemptions = {
      'paint_related_waste': {
        cfr_reference: '40 CFR 261.4(b)(4)',
        description: 'Paint and paint-related waste from households',
        allows_state_exemption: true,
        texas_exemption: 'Texas Paint Exemption (TCEQ RG-22 Appendix D)'
      },
      'conditionally_exempt_small_quantity': {
        cfr_reference: '40 CFR 261.5',
        description: 'CESQG - less than 100 kg/month',
        allows_state_variation: true
      }
    };

    // Texas-specific exemptions and variations
    this.texasExemptions = {
      'paint_waste': {
        rule: 'TCEQ RG-22 Appendix D',
        description: 'Paint and paint-related waste exemption',
        federal_basis: '40 CFR 261.4(b)(4)',
        conditions: [
          'From residential sources',
          'Not from commercial painting operations',
          'Properly managed at household hazardous waste facilities'
        ]
      },
      'used_oil': {
        rule: 'Texas Health and Safety Code Chapter 371',
        description: 'Used oil recycling exemption',
        federal_basis: '40 CFR 279',
        conditions: ['Meets recycling specifications']
      }
    };
  }

  /**
   * Determines the proper classification hierarchy
   * Federal takes precedence unless specific exemption exists
   */
  getClassificationHierarchy(wasteType, state = 'TX') {
    return {
      primary_authority: 'Federal (EPA RCRA)',
      secondary_authority: `${state} State Regulations`,
      hierarchy_rules: [
        '1. Federal listed wastes (F/K/P/U codes) - ALWAYS apply',
        '2. Federal characteristic wastes (D codes) - ALWAYS apply', 
        '3. Check for federal exemptions allowing state flexibility',
        '4. Apply state codes if MORE restrictive than federal',
        '5. Apply state exemptions ONLY if federal CFR allows',
        '6. Use most restrictive classification when multiple apply'
      ],
      precedence_logic: 'Federal declares hazardous → State cannot override (except with federal exemption)'
    };
  }

  /**
   * Ultra-fast minimal prompt for speed-critical classification
   */
  buildUltraFastPrompt(sdsText, state = 'TX') {
    return `Extract from SDS:
- Product name
- Flash point (°C) 
- pH value
- Physical state (liquid/solid/aerosol)

Rules:
- D001 if liquid flash <60°C
- D002 if liquid pH ≤2 or ≥12.5
- Form: aerosol→208, solid→204, liquid→102

SDS: ${sdsText.substring(0, 1000)}

JSON: {"productName":"","flashPoint":{"celsius":null},"pH":null,"physicalState":"","federal_codes":[],"state_form_code":"","state_classification":""}`;
  }

  /**
   * Fast streamlined prompt for quick SDS classification
   */
  buildFastPrompt(sdsText, state = 'TX') {
    return `HAZARDOUS WASTE CLASSIFIER

Extract from SDS and classify:

CRITICAL RULES:
- D001: Flash point <60°C (LIQUIDS ONLY)
- D002: pH ≤2 or ≥12.5 (LIQUIDS ONLY) 
- NEVER apply D002 to solids
- NEVER apply D001 without flash point

TEXAS FORM CODES:
- Aerosol → 208
- Solid → 204
- Liquid + pH ≤2 → 105
- Liquid + pH ≥12.5 → 106
- Other liquid → 102

SDS: ${sdsText.substring(0, 1500)}

Return JSON:
{
  "productName": "name",
  "flashPoint": {"celsius": number, "fahrenheit": number},
  "pH": number,
  "physicalState": "liquid|solid|aerosol",
  "federal_codes": ["D001"],
  "state_form_code": "105",
  "state_classification": "H"
}`;
  }

  /**
   * Enhanced prompt for AI classification with regulatory hierarchy
   */
  buildEnhancedPrompt(sdsText, state = 'TX') {
    return `You are a certified hazardous waste expert. Think through this classification logically, step by step:

STEP 1: UNDERSTAND THE MATERIAL
Ask yourself: "What exactly is this material?"
- Chemical identity and composition
- Physical state and properties  
- Source and intended use
- Any contamination or degradation

STEP 2: CONSTITUENT ANALYSIS
For EACH chemical component, think: "What are the regulatory implications?"
- Extract ALL chemicals with CAS numbers and percentages
- Check EACH against P-codes (acute hazardous wastes)
- Check EACH against U-codes (hazardous wastes)
- Evaluate EACH for D004-D043 TCLP potential
- Consider matrix effects and leaching behavior

STEP 3: FEDERAL CLASSIFICATION LOGIC
Apply systematic reasoning:
"Is this a listed waste? If not, what characteristics does it exhibit?"
- D001 Ignitability: Flash point <60°C (LIQUIDS ONLY per 40 CFR 261.21)
- D002 Corrosivity: pH ≤2 or ≥12.5 (AQUEOUS LIQUIDS ONLY per 40 CFR 261.22)
- D003 Reactivity: Instability, water reactivity
- D004-D043: TCLP leaching predictions for each constituent

STEP 4: TEXAS WASTE TYPE DETERMINATION
Think: "What TYPE of waste is this fundamentally?"
NOT just "is it liquid" but "what is its chemical nature"

LOGICAL CATEGORIZATION (PHYSICAL STATE IS CRITICAL):
- ACID SOLUTIONS/LIQUIDS (pH ≤ 2.0 AND liquid/aqueous) → Form Code 105
- ALKALINE SOLUTIONS/LIQUIDS (pH ≥ 12.5 AND liquid/aqueous) → Form Code 106
- NEUTRAL AQUEOUS LIQUIDS (pH 2.0-12.5 AND liquid/aqueous) → Form Code 102
- ORGANIC SOLVENTS (liquid organic compounds) → Form Code 203
- PETROLEUM PRODUCTS (liquid petroleum) → Form Code 202
- SOLID CHEMICALS/LAB CHEMICALS (solid/powder/pellets/beads) → Form Code 204
- AEROSOLS/PRESSURIZED CONTAINERS (spray cans, aerosols) → Form Code 208
- GASEOUS MATERIALS (compressed gases) → Form Code 209

STEP 5: LOGICAL VERIFICATION
Ask: "Does this classification make sense?"
- An acid should be classified as an acid waste (105), not general aqueous (102)
- A solvent should be classified as solvent waste (203), not aqueous (102)
- Each constituent's regulatory status should be considered

CLASSIFICATION AUTHORITY HIERARCHY:
1. FEDERAL (EPA RCRA) - Primary Authority
   - 40 CFR 261.20-261.24 (Characteristic wastes D001-D043)
   - 40 CFR 261.30-261.35 (Listed wastes F/K/P/U codes)
   - FEDERAL PRECEDENCE: If federal says hazardous, state CANNOT make it non-hazardous

2. STATE (${state}) - Secondary Authority  
   - Can be MORE restrictive than federal
   - CANNOT be less restrictive (except with federal exemption)
   - Texas specific: TCEQ RG-22 form codes

3. FEDERAL EXEMPTIONS (Allow state flexibility):
   - Paint/Paint-Related Waste: 40 CFR 261.4(b)(4)
   - CESQG: 40 CFR 261.5 (<100kg/month)
   - Household hazardous waste: 40 CFR 261.4(b)(1)

CLASSIFICATION PRIORITY:
1. Check Federal Listed Wastes (F/K/P/U) FIRST
2. Check Federal Characteristic Wastes (D codes) - VERIFY PHYSICAL STATE REQUIREMENTS
3. D002 ONLY if: LIQUID AND AQUEOUS AND (pH ≤2 OR pH ≥12.5) - SOLIDS CANNOT BE D002 per 40 CFR 261.22
4. D001 ONLY if: liquid with flash <140°F/60°C - per 40 CFR 261.21
5. If federally hazardous → STOP, apply all federal codes
6. If NOT federally hazardous → Check state requirements
7. Apply Texas codes if waste meets state criteria
8. Check for applicable exemptions (paint, household, etc.)

CRITICAL RULES:
- D002 corrosivity requires LIQUID state per 40 CFR 261.22
- Solid caustic materials (NaOH pellets) are NON-HAZARDOUS under federal law
- Only aqueous liquid solutions with pH ≤2 or ≥12.5 are D002
- D001 requires liquid with flash point <60°C per 40 CFR 261.21
- NEVER apply D001 without an actual flash point value from the SDS
- NEVER apply D002 to solid materials regardless of pH

TEXAS FORM CODE DECISION TREE (FOLLOW THIS LOGIC):

STEP 1: Determine Material Type and Properties
- Extract pH value (if aqueous/liquid)
- Identify if organic solvent, petroleum product, or aqueous solution
- Note physical state and chemical family

STEP 2: Apply Decision Logic in Priority Order (PHYSICAL STATE FIRST!)
1. IF material is AEROSOL/SPRAY CAN (contains "aerosol", "spray", "pressurized") → Form Code 208 (Aerosols)
2. IF material is SOLID (pellets/beads/powder/crystals/solid) → Form Code 204 (Lab chemicals/solids)
3. IF material is GAS (compressed gas, gaseous) → Form Code 209 (Gases)
4. IF material has pH value AND pH ≤ 2.0 AND liquid/aqueous → Form Code 105 (Acid liquids)
5. IF material has pH value AND pH ≥ 12.5 AND liquid/aqueous → Form Code 106 (Alkaline liquids)  
6. IF material has pH value AND pH between 2.0-12.5 AND liquid/aqueous → Form Code 102 (Neutral aqueous)
7. IF material is organic solvent (liquid) → Form Code 203 (Solvents)
8. IF material is petroleum-based (liquid) → Form Code 202 (Petroleum)
9. IF none above apply → Form Code 102 (Default for liquids) or 204 (Default for solids)

STEP 3: Verify Logic
- Acids (like HCl, H2SO4) with low pH should get 105, not 102
- Bases (like NaOH solution) with high pH should get 106, not 102
- Only neutral aqueous solutions get 102

DECISION LOGIC:
1. FIRST CHECK PHYSICAL STATE, THEN pH for Texas Form Code:
   - SOLID (pellets/beads/powder) → Form Code 204 (Lab chemicals)
   - LIQUID + pH ≤ 2.0 → Form Code 105 (Acid liquids)
   - LIQUID + pH ≥ 12.5 → Form Code 106 (Alkaline liquids)
   - LIQUID + pH 2.0-12.5 → Form Code 102 (Neutral aqueous)

2. THEN Apply Federal/State Classification:
   IF (Federal = Hazardous) THEN
      Result = Federal codes + Texas form code from step 1
   ELSE IF (Texas = Hazardous AND no federal exemption) THEN  
      Result = Texas codes only with form code from step 1
   ELSE IF (Federal exemption exists) THEN
      Result = Apply exemption + Texas form code from step 1
   ELSE
      Result = Texas form code from step 1
   END IF

CRITICAL: Texas state waste codes are MANDATORY for ALL waste regardless of federal classification. 
Federal precedence means federal codes take priority for hazardous determination, but state codes are still required for manifesting and disposal.

SDS TO ANALYZE:
${sdsText.substring(0, 4000)}

Return JSON with this structure:
{
  "productName": "exact product name from SDS",
  "hazardClass": "DOT hazard class (1.1, 2.1, 3, 4.1, 5.1, 6.1, 8, 9, etc.) - MANDATORY for all materials",
  "packingGroup": "I, II, III or null",
  "unNumber": "UN number (e.g., UN1993, UN3082) - extract from SDS if present",
  "flashPoint": {"celsius": number, "fahrenheit": number} - MANDATORY, extract from SDS",
  "pH": number,
  "physicalState": "liquid|solid|gas|aerosol - CHECK FOR AEROSOLS FIRST",
  "classification_authority": "federal|state|exempt",
  "federal_codes": ["D001", "F003"],
  "state_codes": ["203-H"], 
  "state_form_code": "203",
  "state_classification": "H",
  "exemptions": ["paint_exemption"],
  "precedence_reasoning": "explanation of which authority applies",
  "final_classification": "hazardous|non-hazardous|conditionally_exempt",
  "regulatory_citations": ["40 CFR 261.21", "TCEQ RG-22"],
  "manufacturer": "manufacturer name from SDS",
  "composition": [{"name": "chemical name", "cas": "CAS number", "percentage": "percentage"}]
}

MANDATORY: ALL responses must include state_form_code and state_classification fields.

AEROSOL DETECTION (CHECK FIRST - HIGHEST PRIORITY):
MANDATORY: Check for aerosols BEFORE any other classification!

AEROSOL INDICATORS (if ANY of these are found → physicalState = "aerosol", state_form_code = "208"):
- Product name contains: "aerosol", "spray", "WD-40", "compressed", "pressurized"
- DOT hazard class 2.1 (flammable gas) or 2.2 (non-flammable gas)
- UN numbers: UN1950, UN1956, UN3074, UN3077, UN3082 (common aerosol codes)
- Text contains: "aerosol container", "pressurized container", "spray can", "dispenser"
- Physical state described as "aerosol" or "pressurized"

DOT CLASSIFICATION MANDATORY EXTRACTION:
- Search for "UN" followed by 4 digits (e.g., UN1993, UN3082)
- Look for "Class" or "Hazard Class" followed by number (e.g., "Class 3", "Class 8")
- Extract flash point values in °C and °F from text
- For diesel/petroleum: typically Class 3 (flammable liquid), UN1993
- For aerosols: typically Class 2.1 or 2.2
- For acids: typically Class 8 (corrosive)

FORM CODE ASSIGNMENT (CHECK IN THIS ORDER - PHYSICAL STATE CRITICAL):
MANDATORY: Every waste MUST have a form code - NO null, N/A, or "Not required" allowed!

1. IF AEROSOL (see above indicators) → state_form_code = "208" (Aerosols) - SEPARATE CONTAINER REQUIRED
2. IF physical state = "solid" (pellets/beads/powder/crystals) → state_form_code = "204" (Lab chemicals)
3. IF physical state = "gas" (compressed gas) → state_form_code = "209" (Gases)
4. IF physical state = "liquid" AND pH ≤ 2.0 → state_form_code = "105" (Acid liquids)
5. IF physical state = "liquid" AND pH ≥ 12.5 → state_form_code = "106" (Alkaline liquids)  
6. IF physical state = "liquid" AND pH between 2.0-12.5 AND aqueous → state_form_code = "102"
7. IF organic solvent (liquid) → state_form_code = "203"
8. IF petroleum product (liquid) → state_form_code = "202"
9. IF none above → state_form_code = "102" (default for unknown liquids) or "204" (default for unknown solids)

CRITICAL: state_form_code and state_classification fields are MANDATORY and cannot be null, undefined, N/A, or empty!

CLASSIFICATION:
- If federally hazardous: state_classification = "H"
- If not federally hazardous: state_classification = "1", "2", or "3"

EXAMPLE: Muriatic acid (HCl) with pH 1.0:
- state_form_code = "105" (NOT 102 - it's an acid!)
- state_classification = "H" (federal D002)`;
  }

  /**
   * Lab pack specific prompt that includes product details
   */
  buildLabPackPrompt(sdsText, state = 'TX') {
    return `You are a certified hazardous waste expert specializing in lab pack analysis. Think through each classification logically:

LOGICAL ANALYSIS FRAMEWORK:

PHASE 1: MATERIAL UNDERSTANDING
"What am I looking at?"
- Product name and chemical identity
- Physical form and appearance
- Composition with all constituents
- Manufacturing source and purity

PHASE 2: COMPREHENSIVE CONSTITUENT EVALUATION
For EVERY chemical present:
"What regulatory codes could this trigger?"
- P-code acute hazard potential (even trace amounts matter)
- U-code hazardous waste designation
- D-code TCLP leaching predictions (D004-D043 constituent-based)
- Texas Class 1-3 constituent tables

PHASE 3: COMPREHENSIVE CHARACTERISTIC ASSESSMENT
"What ALL characteristics does this material exhibit?" (EVALUATE ALL - NOT JUST ONE)
- D001: Flash point <60°C (140°F) for liquids OR readily ignitable solids
- D002: pH ≤2.0 OR pH ≥12.5 (LIQUIDS/AQUEOUS ONLY - NEVER solids)
- D003: Reactivity - unstable, water reactive, toxic gases when mixed
- D004-D043: TCLP leaching potential for EACH heavy metal constituent:
  * D004 (Arsenic), D005 (Barium), D006 (Cadmium), D007 (Chromium)
  * D008 (Lead), D009 (Mercury), D010 (Selenium), D011 (Silver)
  * D018 (Benzene), D019 (Carbon tetrachloride), D022 (Chloroform)
  * D035 (Methyl ethyl ketone), D040 (Trichloroethylene), etc.

CRITICAL: A SINGLE WASTE CAN HAVE MULTIPLE D-CODES SIMULTANEOUSLY
Examples:
- Acidic paint thinner: D001 (flammable) + D002 (corrosive pH<2)
- Contaminated solvent: D001 (flammable) + D008 (lead) + D006 (cadmium)  
- Reactive acid: D002 (corrosive) + D003 (generates toxic gas)
- Metal cleaning solvent: D001 + D002 + D018 (benzene) + D008 (lead)

PHASE 4: WASTE TYPE CLASSIFICATION LOGIC
"What TYPE of waste is this based on its fundamental nature?"

THINK LIKE THIS:
- "This is an ACID solution (pH ≤ 2.0)" → ACID WASTE → Form Code 105
- "This is an ALKALINE solution (pH ≥ 12.5)" → ALKALINE WASTE → Form Code 106  
- "This is a neutral aqueous solution" → AQUEOUS WASTE → Form Code 102
- "This is an organic solvent" → SOLVENT WASTE → Form Code 203
- "This is a petroleum product" → PETROLEUM WASTE → Form Code 202

PHASE 5: LOGICAL VERIFICATION
"Does my classification make sense?"
- Would a regulatory expert agree with this logic?
- Are there any contradictions or missed considerations?
- Have I analyzed ALL constituents, not just the main component?

EXTRACT THESE PRODUCT DETAILS FIRST:
1. Product Name (exact name from SDS)
2. DOT INFORMATION EXTRACTION (MANDATORY):
   - Search for "UN" followed by 4 digits (UN1090, UN1993, UN3082, etc.)
   - Look for "Proper Shipping Name" in Section 14
   - Look for "Class" or "Hazard Class" followed by number
   - Search for "Packing Group I", "II", or "III"
   - Common DOT classifications:
     * Acetone: UN1090, Class 3, PG II, PSN: "Acetone"
     * Paint/Lacquer: UN1263, Class 3, PG II, PSN: "Paint related material"
     * Petroleum distillates: UN1993, Class 3, PG III, PSN: "Flammable liquid, n.o.s."
     * WD-40: UN1950, Class 2.1, PSN: "Aerosols, flammable"
     * Caustic Soda (solid): UN1823, Class 8, PG II, PSN: "Sodium hydroxide, solid"
3. FLASH POINT EXTRACTION (ABSOLUTELY MANDATORY):
   - Search ALL sections for: "Flash Point", "Flash Pt", "Flashpoint", "FP", "Closed Cup"
   - Check Sections 5 (Fire-fighting), 9 (Physical properties), 14 (Transport)
   - Extract EXACT values and convert: "104°F" = 40°C
   - MANDATORY DEFAULT VALUES (USE WHEN NOT FOUND):
     * ACETONE = -18°C (0°F) - ALWAYS HAZARDOUS D001
     * Paint thinner/Klean-Strip = 40°C (104°F) - D001
     * Mineral spirits = 38°C (100°F) - D001
     * WD-40 (aerosol) = 47°C (117°F) - D001
     * Diesel fuel = 62°C (144°F) - Sometimes D001
     * Gasoline = -43°C (-45°F) - D001
4. pH value
5. Physical State (liquid/solid/gas/aerosol)

CRITICAL PHYSICAL STATE IDENTIFICATION:
- Only classify as AEROSOL if SDS explicitly states:
  * "Aerosol" in physical form section
  * "Pressurized container" or "spray can"  
  * Contains propellant gases (butane, propane, etc.)
  * UN1950 (Aerosols, flammable) or similar aerosol UN numbers
- Do NOT classify as aerosol based on:
  * Product name containing "spray" (could be liquid in spray bottle)
  * Flammable properties alone
  * Presence of solvents
- AEROSOLS require MULTIPLE waste codes:
  1. Code for pressurized container hazard (D001 for flammable aerosols)
  2. Code(s) for contents hazard (D001 if contents are flammable, D002 if corrosive, etc.)
- Example: WD-40 aerosol = ["D001"] (flammable contents) + pressurized container classification
- Physical state determination priority:
  1. Explicit "Physical State" field in Section 9
  2. Physical form descriptions
  3. Container type indicators

THEN APPLY CLASSIFICATION HIERARCHY:
1. FEDERAL (EPA RCRA) - Primary Authority - EVALUATE ALL POSSIBLE CODES
   - D001: Flash point <140°F/60°C (LIQUIDS) OR readily ignitable (SOLIDS)
   - D002: pH ≤2 or ≥12.5 (LIQUIDS AND AQUEOUS SOLUTIONS ONLY - NOT SOLIDS)
   - D003: Reactive - unstable, water reactive, toxic gas generation
   - D004-D043: TCLP constituent leaching (evaluate EACH constituent separately)
   - F/K/P/U codes: Listed wastes (can combine with D-codes)
   
   REMEMBER: MULTIPLE D-CODES CAN APPLY TO ONE WASTE:
   - Flammable acid: D001 + D002
   - Contaminated solvent: D001 + D008 (lead) + D018 (benzene)
   - Metal cleaning fluid: D001 + D002 + multiple TCLP codes

CRITICAL: PHYSICAL STATE REQUIREMENTS FOR CHARACTERISTIC WASTES:
- D001 (Ignitability): Applies to LIQUIDS with flash point <140°F/60°C, or SOLIDS that ignite readily
- D002 (Corrosivity): Applies ONLY to LIQUIDS or AQUEOUS SOLUTIONS with pH ≤2 or ≥12.5
- D002 NEVER applies to dry solids, pellets, beads, or powders
- Caustic soda beads/pellets = NON-HAZARDOUS (solid form)
- Caustic soda solution = D002 (when dissolved in water)

2. STATE (${state}) - Secondary Authority
   - Can be MORE restrictive
   - Texas codes: 202 (petroleum), 203 (solvents), 102 (aqueous)
   - Classification suffixes: H (hazardous), 1 (Class 1), 2 (Class 2), 3 (Class 3)
   - Example: 203-H (hazardous solvents), 202-2 (Class 2 petroleum)

3. TEXAS STATE CLASSIFICATION SYSTEM:
   FORM CODE PRIORITY (CHECK PHYSICAL STATE FIRST):
   - 204: Lab chemicals/solids (SOLID materials - pellets/beads/powder)
   - 105: Acid liquids (LIQUID + pH ≤ 2.0) - NOT for solid acids!
   - 106: Alkaline liquids (LIQUID + pH ≥ 12.5) - NOT for solid bases!
   - 102: Neutral aqueous (LIQUID + pH 2.0-12.5 ONLY)
   - 203: Organic solvents (liquid organics)
   - 202: Petroleum products (liquid petroleum)
   
   Classifications: H (hazardous), 1 (Class 1), 2 (Class 2), 3 (Class 3)
   
   CORRECT Examples:
   * Muriatic acid (HCl, pH < 2) → 105-H (ACID waste, NOT 102)
   * Sulfuric acid (pH < 2) → 105-H (ACID waste, NOT 102)
   * Sodium hydroxide solution (pH > 12.5) → 106-H (ALKALINE, NOT 102)
   * Salt water (pH 7) → 102-3 (aqueous, neutral pH)
   * Acetone → 203-H (organic solvent)

4. FEDERAL EXEMPTIONS (Allow state flexibility):
   - Paint waste: 40 CFR 261.4(b)(4)
   - Household waste: 40 CFR 261.4(b)(1)

SDS TO ANALYZE:
${sdsText.substring(0, 4000)}

CRITICAL CLASSIFICATION LOGIC FOR SOLID MATERIALS:
- Sodium hydroxide PELLETS/BEADS/SOLID = NON-HAZARDOUS (federal_codes = [])
- Sodium hydroxide SOLUTION/LIQUID = HAZARDOUS D002 (if pH ≥12.5)
- Potassium hydroxide PELLETS/SOLID = NON-HAZARDOUS (federal_codes = [])
- Caustic soda BEADS/PELLETS = NON-HAZARDOUS (federal_codes = [])
- D002 ONLY applies to LIQUIDS with pH ≤2 or ≥12.5 - NEVER to solids
- D001 ONLY applies to LIQUIDS with flash <140°F/60°C or readily ignitable solids
- Physical state "solid" + any caustic compound = NON-HAZARDOUS

Return COMPLETE JSON with ALL fields:
{
  "productName": "exact product name from SDS",
  "hazardClass": "DOT hazard class (3, 8, 6.1, etc.)",
  "packingGroup": "I, II, III or null",
  "flashPoint": {"celsius": number, "fahrenheit": number},
  "pH": number,
  "physicalState": "liquid|solid|gas|aerosol",
  "unNumber": "UN#### format (REQUIRED - extract from Section 14)",
  "properShippingName": "DOT proper shipping name (REQUIRED)",
  "classification_authority": "federal|state|exempt",
  "federal_codes": ["D001", "F003"] (ARRAY - evaluate D-codes AND F-codes for solvents),
  "state_codes": ["203-H"], 
  "state_form_code": "203",
  "state_classification": "H",
  "classification_status": "complete|incomplete_data",
  "data_gaps": ["flash_point", "pH"] (if data missing),
  "user_input_required": false (true if data missing),
  "material_function": "solvent|lubricant|cleaner|paint|etc",
  "exemptions": [],
  "precedence_reasoning": "Environmental chemistry analysis of material function and hazard characteristics",
  "final_classification": "hazardous|non-hazardous|conditionally_exempt|incomplete",
  "regulatory_citations": ["40 CFR 261.21"],
  "composition": [
    {
      "name": "chemical name",
      "cas": "CAS number if available",
      "percentage": "percentage if available"
    }
  ]
}

CRITICAL NULL VALUE VALIDATION:
- If ANY critical data is NULL/missing (flash point, pH for liquids, physical state), you MUST:
  1. Set "classification_status": "incomplete_data"
  2. Set "data_gaps": ["flash_point", "pH", etc.]
  3. Set "user_input_required": true
  4. NEVER proceed with classification if critical data is missing
- Environmental chemists CANNOT make safety determinations without complete data

MANDATORY REQUIREMENTS FOR ALL RESPONSES:
1. CHECK PHYSICAL STATE FIRST, THEN pH - This determines form code:
   - SOLID (pellets/beads/powder) = Form Code 204 (Lab chemicals) - REGARDLESS of pH!
   - LIQUID + pH ≤ 2.0 = Form Code 105 (Acid liquids) - NOT 102!
   - LIQUID + pH ≥ 12.5 = Form Code 106 (Alkaline liquids) - NOT 102!
   - LIQUID + pH 2.0-12.5 = Form Code 102 (Neutral aqueous)

2. state_form_code field MUST be populated correctly
3. state_classification field MUST be populated
4. Texas form codes: 105 (acids), 106 (alkaline), 102 (neutral aqueous), 203 (solvents), 202 (petroleum)
5. Federal hazardous → state_classification = "H", else "1", "2", or "3"

REMEMBER: Muriatic acid is 105, not 102!`;
  }

  /**
   * Validates classification against hierarchy rules
   */
  validateClassification(classification) {
    const issues = [];
    
    // Rule 1: Federal hazardous cannot be overridden by state
    if (classification.federal_codes?.length > 0 && 
        classification.final_classification === 'non-hazardous') {
      issues.push('VIOLATION: State cannot override federal hazardous determination');
    }

    // Rule 2: State can be more restrictive
    if (classification.federal_codes?.length === 0 && 
        classification.state_codes?.length > 0) {
      // This is allowed - state being more restrictive
    }

    // Rule 3: Exemptions must have federal basis
    if (classification.exemptions?.length > 0) {
      classification.exemptions.forEach(exemption => {
        if (!this.federalExemptions[exemption] && !this.texasExemptions[exemption]) {
          issues.push(`Invalid exemption: ${exemption} not found in regulations`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      hierarchy_compliant: issues.length === 0
    };
  }

  /**
   * Get specific Texas exemption details
   */
  getTexasExemption(exemptionType) {
    return this.texasExemptions[exemptionType] || null;
  }

  /**
   * Check if federal exemption allows state flexibility
   */
  allowsStateFlexibility(wasteType) {
    const exemption = this.federalExemptions[wasteType];
    return exemption?.allows_state_exemption || exemption?.allows_state_variation || false;
  }
}

export default RegulatoryHierarchy;