/**
 * TCLP Database - D004-D043 Toxicity Characteristic Leaching Procedure
 * For SDS analysis: if constituent is present at ANY level, assign the D code
 * (SDS concentrations are inherently above TCLP limits)
 */

export const TCLP_CONSTITUENTS = {
  // D004-D043 - Toxicity Characteristic constituents
  'D004': { name: 'Arsenic', casNumbers: ['7440-38-2'], limit: 5.0, units: 'mg/L' },
  'D005': { name: 'Barium', casNumbers: ['7440-39-3'], limit: 100.0, units: 'mg/L' },
  'D006': { name: 'Cadmium', casNumbers: ['7440-43-9'], limit: 1.0, units: 'mg/L' },
  'D007': { name: 'Chromium', casNumbers: ['7440-47-3', '18540-29-9'], limit: 5.0, units: 'mg/L' },
  'D008': { name: 'Lead', casNumbers: ['7439-92-1'], limit: 5.0, units: 'mg/L' },
  'D009': { name: 'Mercury', casNumbers: ['7439-97-6'], limit: 0.2, units: 'mg/L' },
  'D010': { name: 'Selenium', casNumbers: ['7782-49-2'], limit: 1.0, units: 'mg/L' },
  'D011': { name: 'Silver', casNumbers: ['7440-22-4'], limit: 5.0, units: 'mg/L' },

  // D012-D043 - Organic toxicity constituents
  'D012': { name: 'Endrin', casNumbers: ['72-20-8'], limit: 0.02, units: 'mg/L' },
  'D013': { name: 'Lindane', casNumbers: ['58-89-9'], limit: 0.4, units: 'mg/L' },
  'D014': { name: 'Methoxychlor', casNumbers: ['72-43-5'], limit: 10.0, units: 'mg/L' },
  'D015': { name: 'Toxaphene', casNumbers: ['8001-35-2'], limit: 0.5, units: 'mg/L' },
  'D016': { name: '2,4-D', casNumbers: ['94-75-7'], limit: 10.0, units: 'mg/L' },
  'D017': { name: '2,4,5-TP (Silvex)', casNumbers: ['93-72-1'], limit: 1.0, units: 'mg/L' },

  'D018': { name: 'Benzene', casNumbers: ['71-43-2'], limit: 0.5, units: 'mg/L' },
  'D019': { name: 'Carbon tetrachloride', casNumbers: ['56-23-5'], limit: 0.5, units: 'mg/L' },
  'D020': { name: 'Chlordane', casNumbers: ['57-74-9'], limit: 0.03, units: 'mg/L' },
  'D021': { name: 'Chlorobenzene', casNumbers: ['108-90-7'], limit: 100.0, units: 'mg/L' },
  'D022': { name: 'Chloroform', casNumbers: ['67-66-3'], limit: 6.0, units: 'mg/L' },
  'D023': { name: 'o-Cresol', casNumbers: ['95-48-7'], limit: 200.0, units: 'mg/L' },
  'D024': { name: 'm-Cresol', casNumbers: ['108-39-4'], limit: 200.0, units: 'mg/L' },
  'D025': { name: 'p-Cresol', casNumbers: ['106-44-5'], limit: 200.0, units: 'mg/L' },
  'D026': { name: 'Cresol', casNumbers: ['1319-77-3'], limit: 200.0, units: 'mg/L' },
  'D027': { name: '1,4-Dichlorobenzene', casNumbers: ['106-46-7'], limit: 7.5, units: 'mg/L' },
  'D028': { name: '1,2-Dichloroethane', casNumbers: ['107-06-2'], limit: 0.5, units: 'mg/L' },
  'D029': { name: '1,1-Dichloroethylene', casNumbers: ['75-35-4'], limit: 0.7, units: 'mg/L' },
  'D030': { name: '2,4-Dinitrotoluene', casNumbers: ['121-14-2'], limit: 0.13, units: 'mg/L' },

  'D031': { name: 'Heptachlor', casNumbers: ['76-44-8'], limit: 0.008, units: 'mg/L' },
  'D032': { name: 'Hexachlorobenzene', casNumbers: ['118-74-1'], limit: 0.13, units: 'mg/L' },
  'D033': { name: 'Hexachlorobutadiene', casNumbers: ['87-68-3'], limit: 0.5, units: 'mg/L' },
  'D034': { name: 'Hexachloroethane', casNumbers: ['67-72-1'], limit: 3.0, units: 'mg/L' },
  'D035': { name: 'Methyl ethyl ketone', casNumbers: ['78-93-3'], limit: 200.0, units: 'mg/L' },
  'D036': { name: 'Nitrobenzene', casNumbers: ['98-95-3'], limit: 2.0, units: 'mg/L' },
  'D037': { name: 'Pentachlorophenol', casNumbers: ['87-86-5'], limit: 100.0, units: 'mg/L' },
  'D038': { name: 'Pyridine', casNumbers: ['110-86-1'], limit: 5.0, units: 'mg/L' },
  'D039': { name: 'Tetrachloroethylene', casNumbers: ['127-18-4'], limit: 0.7, units: 'mg/L' },
  'D040': { name: 'Trichloroethylene', casNumbers: ['79-01-6'], limit: 0.5, units: 'mg/L' },
  'D041': { name: '2,4,5-Trichlorophenol', casNumbers: ['95-95-4'], limit: 400.0, units: 'mg/L' },
  'D042': { name: '2,4,6-Trichlorophenol', casNumbers: ['88-06-2'], limit: 2.0, units: 'mg/L' },
  'D043': { name: 'Vinyl chloride', casNumbers: ['75-01-4'], limit: 0.2, units: 'mg/L' }
};

// Reverse lookup by CAS number
export const CAS_TO_D_CODE = {};
Object.keys(TCLP_CONSTITUENTS).forEach(dCode => {
  const constituent = TCLP_CONSTITUENTS[dCode];
  constituent.casNumbers.forEach(cas => {
    CAS_TO_D_CODE[cas] = {
      code: dCode,
      name: constituent.name,
      limit: constituent.limit,
      units: constituent.units
    };
  });
});

// Common solvent chemicals that may trigger F codes
export const F_CODE_SOLVENTS = {
  // F001 - Halogenated solvents from degreasing
  'F001': {
    description: 'Spent halogenated degreasing solvents',
    chemicals: [
      { name: 'Tetrachloroethylene', casNumbers: ['127-18-4'] },
      { name: 'Trichloroethylene', casNumbers: ['79-01-6'] },
      { name: 'Methylene chloride', casNumbers: ['75-09-2'] },
      { name: '1,1,1-Trichloroethane', casNumbers: ['71-55-6'] },
      { name: 'Carbon tetrachloride', casNumbers: ['56-23-5'] },
      { name: 'Chlorinated fluorocarbons', casNumbers: ['various'] }
    ]
  },

  // F002 - Halogenated solvents from other uses
  'F002': {
    description: 'Spent halogenated solvents',
    chemicals: [
      { name: 'Tetrachloroethylene', casNumbers: ['127-18-4'] },
      { name: 'Methylene chloride', casNumbers: ['75-09-2'] },
      { name: 'Trichloroethylene', casNumbers: ['79-01-6'] },
      { name: '1,1,1-Trichloroethane', casNumbers: ['71-55-6'] },
      { name: 'Chlorobenzene', casNumbers: ['108-90-7'] },
      { name: '1,1,2-Trichloro-1,2,2-trifluoroethane', casNumbers: ['76-13-1'] }
    ]
  },

  // F003 - Non-halogenated solvents
  'F003': {
    description: 'Spent non-halogenated solvents',
    chemicals: [
      { name: 'Xylene', casNumbers: ['1330-20-7'] },
      { name: 'Acetone', casNumbers: ['67-64-1'] },
      { name: 'Ethyl acetate', casNumbers: ['141-78-6'] },
      { name: 'Ethyl benzene', casNumbers: ['100-41-4'] },
      { name: 'Ethyl ether', casNumbers: ['60-29-7'] },
      { name: 'Methyl isobutyl ketone', casNumbers: ['108-10-1'] },
      { name: 'n-Butyl alcohol', casNumbers: ['71-36-3'] },
      { name: 'Cyclohexanone', casNumbers: ['108-94-1'] },
      { name: 'Methanol', casNumbers: ['67-56-1'] }
    ]
  },

  // F004 - Non-halogenated solvents
  'F004': {
    description: 'Spent non-halogenated solvents',
    chemicals: [
      { name: 'Cresols and cresylic acid', casNumbers: ['1319-77-3'] },
      { name: 'Nitrobenzene', casNumbers: ['98-95-3'] }
    ]
  },

  // F005 - Non-halogenated solvents
  'F005': {
    description: 'Spent non-halogenated solvents',
    chemicals: [
      { name: 'Toluene', casNumbers: ['108-88-3'] },
      { name: 'Methyl ethyl ketone', casNumbers: ['78-93-3'] },
      { name: 'Carbon disulfide', casNumbers: ['75-15-0'] },
      { name: 'Isobutanol', casNumbers: ['78-83-1'] },
      { name: 'Pyridine', casNumbers: ['110-86-1'] },
      { name: 'Benzene', casNumbers: ['71-43-2'] },
      { name: '2-Ethoxyethanol', casNumbers: ['110-80-5'] },
      { name: '2-Nitropropane', casNumbers: ['79-46-9'] }
    ]
  }
};

// Create reverse lookup for F codes by CAS
export const CAS_TO_F_CODE = {};
Object.keys(F_CODE_SOLVENTS).forEach(fCode => {
  const solventGroup = F_CODE_SOLVENTS[fCode];
  solventGroup.chemicals.forEach(chemical => {
    chemical.casNumbers.forEach(cas => {
      if (cas !== 'various') {
        if (!CAS_TO_F_CODE[cas]) CAS_TO_F_CODE[cas] = [];
        CAS_TO_F_CODE[cas].push({
          code: fCode,
          description: solventGroup.description,
          name: chemical.name
        });
      }
    });
  });
});

export default { TCLP_CONSTITUENTS, CAS_TO_D_CODE, F_CODE_SOLVENTS, CAS_TO_F_CODE };