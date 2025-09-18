// EPA Waste Code Descriptions
// Provides detailed descriptions for all waste codes

export const wasteCodeDescriptions = {
  // D-Codes (Characteristic Waste Codes)
  D001: {
    code: 'D001',
    name: 'Ignitable Waste',
    description: 'Waste with flash point < 60°C (140°F) or is an ignitable compressed gas, oxidizer, or meets DOT ignitable definition',
    criteria: [
      'Liquid with flash point < 60°C (140°F)',
      'Non-liquid capable of causing fire through friction, absorption of moisture, or spontaneous chemical changes',
      'Ignitable compressed gas per DOT regulations',
      'Oxidizer per DOT regulations'
    ]
  },
  D002: {
    code: 'D002',
    name: 'Corrosive Waste',
    description: 'Aqueous waste with pH ≤ 2 or ≥ 12.5, or liquid that corrodes steel at specific rate',
    criteria: [
      'Aqueous with pH ≤ 2.0',
      'Aqueous with pH ≥ 12.5',
      'Liquid that corrodes steel (SAE 1020) at rate > 6.35 mm/year at 55°C'
    ]
  },
  D003: {
    code: 'D003',
    name: 'Reactive Waste',
    description: 'Unstable, reacts violently, generates toxic gases, or is explosive',
    criteria: [
      'Normally unstable and readily undergoes violent change',
      'Reacts violently with water',
      'Forms potentially explosive mixtures with water',
      'Generates toxic gases when mixed with water',
      'Contains cyanide or sulfide and generates toxic gases at pH 2-12.5',
      'Capable of detonation or explosive reaction',
      'Classified as explosive per DOT'
    ]
  },
  D004: {
    code: 'D004',
    name: 'Arsenic',
    description: 'Waste containing arsenic at concentrations ≥ 5.0 mg/L by TCLP test',
    criteria: ['TCLP arsenic concentration ≥ 5.0 mg/L']
  },
  D005: {
    code: 'D005',
    name: 'Barium',
    description: 'Waste containing barium at concentrations ≥ 100.0 mg/L by TCLP test',
    criteria: ['TCLP barium concentration ≥ 100.0 mg/L']
  },
  D006: {
    code: 'D006',
    name: 'Cadmium',
    description: 'Waste containing cadmium at concentrations ≥ 1.0 mg/L by TCLP test',
    criteria: ['TCLP cadmium concentration ≥ 1.0 mg/L']
  },
  D007: {
    code: 'D007',
    name: 'Chromium',
    description: 'Waste containing chromium at concentrations ≥ 5.0 mg/L by TCLP test',
    criteria: ['TCLP chromium concentration ≥ 5.0 mg/L']
  },
  D008: {
    code: 'D008',
    name: 'Lead',
    description: 'Waste containing lead at concentrations ≥ 5.0 mg/L by TCLP test',
    criteria: ['TCLP lead concentration ≥ 5.0 mg/L']
  },
  D009: {
    code: 'D009',
    name: 'Mercury',
    description: 'Waste containing mercury at concentrations ≥ 0.2 mg/L by TCLP test',
    criteria: ['TCLP mercury concentration ≥ 0.2 mg/L']
  },
  D010: {
    code: 'D010',
    name: 'Selenium',
    description: 'Waste containing selenium at concentrations ≥ 1.0 mg/L by TCLP test',
    criteria: ['TCLP selenium concentration ≥ 1.0 mg/L']
  },
  D011: {
    code: 'D011',
    name: 'Silver',
    description: 'Waste containing silver at concentrations ≥ 5.0 mg/L by TCLP test',
    criteria: ['TCLP silver concentration ≥ 5.0 mg/L']
  },

  // F-Codes (Listed Wastes from Non-Specific Sources)
  F001: {
    code: 'F001',
    name: 'Halogenated Solvents',
    description: 'Spent halogenated solvents used in degreasing operations',
    criteria: [
      'Contains tetrachloroethylene',
      'Contains trichloroethylene', 
      'Contains methylene chloride',
      'Contains 1,1,1-trichloroethane',
      'Contains carbon tetrachloride',
      'Contains chlorinated fluorocarbons',
      'Used for degreasing operations'
    ]
  },
  F002: {
    code: 'F002',
    name: 'Halogenated Solvents',
    description: 'Spent halogenated solvents from various operations',
    criteria: [
      'Contains tetrachloroethylene',
      'Contains methylene chloride',
      'Contains trichloroethylene',
      'Contains 1,1,1-trichloroethane',
      'Contains chlorobenzene',
      'Contains 1,1,2-trichloro-1,2,2-trifluoroethane',
      'Contains o-dichlorobenzene',
      'Contains trichlorofluoromethane',
      'Contains 1,1,2-trichloroethane'
    ]
  },
  F003: {
    code: 'F003',
    name: 'Non-Halogenated Solvents',
    description: 'Spent non-halogenated solvents including xylene, acetone, ethyl acetate, ethyl benzene, ethyl ether, methyl isobutyl ketone, n-butyl alcohol, cyclohexanone, and methanol',
    criteria: [
      'Contains xylene',
      'Contains acetone',
      'Contains ethyl acetate',
      'Contains ethyl benzene',
      'Contains ethyl ether',
      'Contains methyl isobutyl ketone (MIBK)',
      'Contains n-butyl alcohol',
      'Contains cyclohexanone',
      'Contains methanol'
    ]
  },
  F004: {
    code: 'F004',
    name: 'Non-Halogenated Solvents',
    description: 'Spent non-halogenated solvents including cresols, cresylic acid, and nitrobenzene',
    criteria: [
      'Contains cresols',
      'Contains cresylic acid',
      'Contains nitrobenzene'
    ]
  },
  F005: {
    code: 'F005',
    name: 'Non-Halogenated Solvents',
    description: 'Spent non-halogenated solvents including toluene, methyl ethyl ketone, carbon disulfide, isobutanol, pyridine, benzene, 2-ethoxyethanol, and 2-nitropropane',
    criteria: [
      'Contains toluene',
      'Contains methyl ethyl ketone (MEK)',
      'Contains carbon disulfide',
      'Contains isobutanol',
      'Contains pyridine',
      'Contains benzene',
      'Contains 2-ethoxyethanol',
      'Contains 2-nitropropane'
    ]
  },

  // P-Codes (Acutely Hazardous Listed Wastes)
  P001: {
    code: 'P001',
    name: 'Warfarin',
    description: 'Warfarin and salts, when concentration > 0.3%',
    criteria: ['Contains warfarin > 0.3%']
  },
  P002: {
    code: 'P002',
    name: '1-Acetyl-2-thiourea',
    description: 'Commercial chemical product containing 1-Acetyl-2-thiourea',
    criteria: ['Contains 1-Acetyl-2-thiourea']
  },
  P003: {
    code: 'P003',
    name: 'Acrolein',
    description: 'Commercial chemical product containing acrolein (2-Propenal)',
    criteria: ['Contains acrolein']
  },

  // U-Codes (Toxic Listed Wastes)
  U001: {
    code: 'U001',
    name: 'Acetaldehyde',
    description: 'Commercial chemical product containing acetaldehyde',
    criteria: ['Contains acetaldehyde']
  },
  U002: {
    code: 'U002',
    name: 'Acetone',
    description: 'Commercial chemical product containing acetone',
    criteria: ['Contains acetone as sole active ingredient']
  },
  U003: {
    code: 'U003',
    name: 'Acetonitrile',
    description: 'Commercial chemical product containing acetonitrile',
    criteria: ['Contains acetonitrile']
  },
  U019: {
    code: 'U019',
    name: 'Benzene',
    description: 'Commercial chemical product containing benzene',
    criteria: ['Contains benzene as sole active ingredient']
  },
  U080: {
    code: 'U080',
    name: 'Methylene Chloride',
    description: 'Commercial chemical product containing methylene chloride (dichloromethane)',
    criteria: ['Contains methylene chloride as sole active ingredient']
  },
  U154: {
    code: 'U154',
    name: 'Methanol',
    description: 'Commercial chemical product containing methanol',
    criteria: ['Contains methanol as sole active ingredient']
  },
  U159: {
    code: 'U159',
    name: 'Methyl Ethyl Ketone (MEK)',
    description: 'Commercial chemical product containing 2-butanone (MEK)',
    criteria: ['Contains MEK as sole active ingredient']
  },
  U220: {
    code: 'U220',
    name: 'Toluene',
    description: 'Commercial chemical product containing toluene',
    criteria: ['Contains toluene as sole active ingredient']
  },
  U239: {
    code: 'U239',
    name: 'Xylene',
    description: 'Commercial chemical product containing xylene',
    criteria: ['Contains xylene as sole active ingredient']
  },

  // K-Codes (Industry-Specific Listed Wastes) - Examples
  K001: {
    code: 'K001',
    name: 'Bottom Sediment Sludge',
    description: 'Bottom sediment sludge from wood preserving process using creosote/pentachlorophenol',
    criteria: ['From wood preserving operations', 'Contains creosote or pentachlorophenol']
  },
  K048: {
    code: 'K048',
    name: 'Petroleum Refining Sludge',
    description: 'Dissolved air flotation float from petroleum refining',
    criteria: ['From petroleum refining operations', 'DAF float waste']
  }
};

// Texas State Codes
export const texasWasteCodeDescriptions = {
  '001': {
    code: '001',
    name: 'Corrosive Solid',
    description: 'Non-aqueous solid waste that exhibits corrosive characteristics',
    criteria: ['Solid form', 'Corrosive properties', 'Non-aqueous']
  },
  '002': {
    code: '002',
    name: 'Corrosive Liquid',
    description: 'Non-aqueous liquid waste that exhibits corrosive characteristics',
    criteria: ['Liquid form', 'Corrosive properties', 'Non-aqueous']
  },
  '102': {
    code: '102',
    name: 'Non-RCRA Liquid',
    description: 'Class 2 non-RCRA liquid industrial waste',
    criteria: ['Liquid form', 'Not RCRA regulated', 'Industrial waste']
  },
  '201': {
    code: '201',
    name: 'Halogenated Organic Liquid',
    description: 'Halogenated organic compounds in liquid form',
    criteria: ['Contains halogenated organics', 'Liquid form', '> 1000 ppm total organic halogens']
  },
  '202': {
    code: '202',
    name: 'Halogenated Organic Solid',
    description: 'Halogenated organic compounds in solid form',
    criteria: ['Contains halogenated organics', 'Solid form', '> 1000 ppm total organic halogens']
  },
  '203': {
    code: '203',
    name: 'Non-Halogenated Organic Liquid',
    description: 'Non-halogenated organic compounds in liquid form',
    criteria: ['Non-halogenated organics', 'Liquid form', 'Flash point ≥ 60°C']
  },
  '204': {
    code: '204',
    name: 'Non-Halogenated Organic Solid',
    description: 'Non-halogenated organic compounds in solid form',
    criteria: ['Non-halogenated organics', 'Solid form']
  },
  '305-H': {
    code: '305-H',
    name: 'Ignitable Lab Pack',
    description: 'Lab pack containing ignitable materials (flash point < 60°C)',
    criteria: ['Lab pack waste', 'Flash point < 60°C', 'Small containers']
  },
  '305-NH': {
    code: '305-NH',
    name: 'Non-Ignitable Lab Pack',
    description: 'Lab pack containing non-ignitable materials',
    criteria: ['Lab pack waste', 'Flash point ≥ 60°C or non-flammable', 'Small containers']
  }
};

// Function to get description for any waste code
export function getWasteCodeDescription(code) {
  // Check federal codes first
  if (wasteCodeDescriptions[code]) {
    return wasteCodeDescriptions[code];
  }
  
  // Check Texas state codes
  if (texasWasteCodeDescriptions[code]) {
    return texasWasteCodeDescriptions[code];
  }
  
  // Return generic description if not found
  return {
    code: code,
    name: 'Waste Code',
    description: `EPA or state waste code ${code}`,
    criteria: []
  };
}

// Function to get all descriptions for an array of codes
export function getWasteCodeDescriptions(codes) {
  if (!codes || !Array.isArray(codes)) return [];
  
  return codes.map(code => {
    // Handle codes that might have additional info (e.g., "D001, F003")
    const cleanCode = code.trim().split(',')[0].trim();
    return getWasteCodeDescription(cleanCode);
  });
}

// Function to format waste codes with descriptions for display
export function formatWasteCodesWithDescriptions(codes) {
  if (!codes || !Array.isArray(codes)) return [];
  
  return codes.map(code => {
    const cleanCode = code.trim();
    const description = getWasteCodeDescription(cleanCode);
    
    return {
      code: cleanCode,
      name: description.name,
      description: description.description,
      criteria: description.criteria,
      display: `${cleanCode} - ${description.name}`,
      fullDescription: `${cleanCode} - ${description.name}: ${description.description}`
    };
  });
}

export default {
  wasteCodeDescriptions,
  texasWasteCodeDescriptions,
  getWasteCodeDescription,
  getWasteCodeDescriptions,
  formatWasteCodesWithDescriptions
};