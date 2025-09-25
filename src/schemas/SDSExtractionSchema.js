/**
 * SDSExtractionSchema.js
 * Defines the exact JSON structure that APIs must return
 * for waste classification logic to work properly
 */

export const SDSExtractionSchema = {
  // Required product identification
  productInfo: {
    productName: "string",
    manufacturer: "string",
    productCode: "string",
    casNumber: "string", // Primary CAS if single chemical
    dateOfSds: "string" // ISO date format
  },

  // Critical physical properties for waste classification
  physicalProperties: {
    physicalState: "string", // "liquid", "solid", "gas"
    color: "string",
    odor: "string",
    pH: "number|null", // Numeric pH value or null
    flashPoint: {
      value: "number|null", // Flash point in Celsius
      units: "string", // "°C" or "°F"
      method: "string" // Test method if specified
    },
    boilingPoint: {
      value: "number|null",
      units: "string"
    },
    meltingPoint: {
      value: "number|null",
      units: "string"
    },
    vaporPressure: {
      value: "number|null",
      units: "string",
      temperature: "number|null" // At what temperature
    },
    density: {
      value: "number|null",
      units: "string"
    },
    viscosity: {
      value: "number|null",
      units: "string"
    },
    solubility: {
      water: "string", // "soluble", "insoluble", "partially soluble", or specific value
      other: "string" // Other solvents if mentioned
    }
  },

  // Chemical composition - CRITICAL for waste classification
  composition: [
    {
      chemicalName: "string",
      casNumber: "string", // Must be in XXX-XX-X format
      percentage: "number", // 0-100
      percentageRange: "string", // "5-10%" if range given
      concentrationUnits: "string", // "wt%", "vol%", "ppm", etc.
      synonyms: ["string"], // Alternative names
      isHazardous: "boolean", // If explicitly marked as hazardous
      // Additional properties for waste classification
      flashPoint: "number|null", // Individual constituent flash point
      boilingPoint: "number|null", // Individual constituent boiling point
      specificGravity: "number|null", // Individual constituent density
      vaporPressure: "number|null", // Individual constituent vapor pressure
      isListed: "boolean", // If constituent is RCRA listed (P/U codes)
      isCarcinogen: "boolean", // If constituent is known carcinogen
      tclpConcern: "boolean" // If constituent is TCLP regulated (D004-D043)
    }
  ],

  // Hazard classifications from Section 2
  hazardClassifications: {
    ghsClassifications: [
      {
        hazardClass: "string", // "Flammable liquids", "Acute toxicity", etc.
        category: "string", // "Category 1", "Category 2", etc.
        hazardStatement: "string" // "H225: Highly flammable liquid"
      }
    ],
    signalWord: "string", // "Danger", "Warning", or null
    hazardStatements: ["string"], // Array of H-codes and descriptions
    precautionaryStatements: ["string"], // Array of P-codes
    pictograms: ["string"] // GHS pictogram names
  },

  // Stability and reactivity - Critical for D003 determination
  stabilityReactivity: {
    chemicalStability: "string", // "Stable", "Unstable"
    incompatibleMaterials: ["string"], // Materials to avoid
    hazardousDecomposition: ["string"], // Decomposition products
    hazardousPolymerization: "string", // "Can occur", "Will not occur"
    conditionsToAvoid: ["string"], // Heat, light, moisture, etc.
    reactsViolentlyWithWater: "boolean",
    generatesToxicGases: "boolean",
    explosiveWhenDry: "boolean",
    shockSensitive: "boolean"
  },

  // Toxicological information - For D004-D043 evaluation
  toxicology: {
    acuteToxicity: {
      oral: {
        ld50: "number|null", // mg/kg
        species: "string", // rat, mouse, etc.
      },
      dermal: {
        ld50: "number|null",
        species: "string"
      },
      inhalation: {
        lc50: "number|null", // mg/L or ppm
        species: "string",
        exposureTime: "string" // "4 hours"
      }
    },
    carcinogenicity: {
      iarc: "string", // "Group 1", "Group 2A", etc.
      ntp: "string", // "Known", "Reasonably anticipated"
      osha: "boolean" // Listed as carcinogen
    },
    mutagenicity: "boolean",
    reproductiveToxicity: "boolean"
  },

  // TCLP and analytical data - Critical for toxicity characteristic
  analyticalData: {
    tclpResults: [
      {
        parameter: "string", // "Lead", "Mercury", etc.
        casNumber: "string",
        value: "number", // mg/L
        method: "string", // "EPA 1311"
      }
    ],
    otherAnalytical: [
      {
        parameter: "string",
        value: "number",
        units: "string",
        method: "string"
      }
    ]
  },

  // Transport information - May affect classification
  transportInfo: {
    unNumber: "string", // UN1234
    properShippingName: "string",
    hazardClass: "string", // DOT hazard class
    packingGroup: "string" // I, II, III
  },

  // Regulatory information
  regulatoryInfo: {
    tsca: "boolean", // Listed on TSCA inventory
    cercla: "boolean", // CERCLA hazardous substance
    rcra: {
      listed: "boolean", // Is it RCRA listed
      wasteCodes: ["string"], // Any waste codes mentioned
      characteristicWaste: "boolean" // Exhibits RCRA characteristics
    },
    sara: {
      section302: "boolean", // Extremely hazardous substance
      section311312: "boolean", // Hazardous chemical
      section313: "boolean" // Toxic chemical
    }
  },

  // Additional context for waste classification
  wasteContext: {
    intendedUse: "string", // Manufacturing, laboratory, etc.
    processDescription: "string", // How material is used
    wasteGenerationProcess: "string", // How waste is generated
    isSpentMaterial: "boolean", // Used vs virgin
    isOffSpecification: "boolean", // Off-spec product
    isResidueOrSludge: "boolean" // Process residue
  },

  // Raw text sections for fallback analysis
  rawSections: {
    section1: "string", // Product identification
    section2: "string", // Hazard identification
    section3: "string", // Composition
    section7: "string", // Handling and storage
    section9: "string", // Physical properties
    section10: "string", // Stability and reactivity
    section11: "string", // Toxicological information
    section14: "string", // Transport information
    section15: "string" // Regulatory information
  },

  // Extraction metadata
  extractionMeta: {
    extractionDate: "string", // ISO timestamp
    apiProvider: "string", // "groq" or "gemini"
    confidence: "number", // 0-1 confidence score
    processingTime: "number", // milliseconds
    warnings: ["string"], // Any extraction warnings
    missingData: ["string"] // What data couldn't be extracted
  }
};

/**
 * Example of expected JSON output:
 */
export const ExampleSDSExtraction = {
  productInfo: {
    productName: "Industrial Cleaning Solvent",
    manufacturer: "Chemical Company Inc.",
    productCode: "ICS-001",
    casNumber: "67-64-1",
    dateOfSds: "2024-01-15"
  },
  physicalProperties: {
    physicalState: "liquid",
    color: "colorless",
    odor: "characteristic",
    pH: null,
    flashPoint: {
      value: 45,
      units: "°C",
      method: "Closed cup"
    },
    boilingPoint: {
      value: 85,
      units: "°C"
    },
    meltingPoint: {
      value: -15,
      units: "°C"
    },
    density: {
      value: 0.89,
      units: "g/cm³"
    },
    solubility: {
      water: "partially soluble",
      other: "soluble in alcohols"
    }
  },
  composition: [
    {
      chemicalName: "Acetone",
      casNumber: "67-64-1",
      percentage: 70,
      concentrationUnits: "wt%",
      synonyms: ["2-Propanone", "Dimethyl ketone"],
      isHazardous: true
    },
    {
      chemicalName: "Ethanol",
      casNumber: "64-17-5",
      percentage: 25,
      concentrationUnits: "wt%",
      synonyms: ["Ethyl alcohol"],
      isHazardous: true
    }
  ],
  hazardClassifications: {
    ghsClassifications: [
      {
        hazardClass: "Flammable liquids",
        category: "Category 2",
        hazardStatement: "H225: Highly flammable liquid and vapor"
      }
    ],
    signalWord: "Danger",
    hazardStatements: ["H225: Highly flammable liquid and vapor"],
    precautionaryStatements: ["P210: Keep away from heat"],
    pictograms: ["Flame"]
  },
  stabilityReactivity: {
    chemicalStability: "Stable under normal conditions",
    incompatibleMaterials: ["Strong oxidizers"],
    hazardousDecomposition: ["Carbon monoxide", "Carbon dioxide"],
    reactsViolentlyWithWater: false,
    generatesToxicGases: false,
    explosiveWhenDry: false,
    shockSensitive: false
  },
  analyticalData: {
    tclpResults: [],
    otherAnalytical: []
  },
  wasteContext: {
    intendedUse: "Industrial cleaning",
    isSpentMaterial: false,
    isOffSpecification: false
  },
  extractionMeta: {
    extractionDate: "2024-12-25T10:00:00Z",
    apiProvider: "groq",
    confidence: 0.95,
    processingTime: 1500,
    warnings: [],
    missingData: ["TCLP data not available"]
  }
};

/**
 * Validation function for extracted data
 */
export function validateExtractedData(data) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!data.productInfo?.productName) {
    errors.push("Product name is required");
  }

  if (!data.physicalProperties?.physicalState) {
    errors.push("Physical state is required");
  }

  if (!data.composition || data.composition.length === 0) {
    warnings.push("No composition data found - may limit classification accuracy");
  }

  // Validate composition entries
  if (data.composition) {
    data.composition.forEach((comp, index) => {
      if (!comp.chemicalName) {
        errors.push(`Composition entry ${index}: Chemical name required`);
      }
      if (!comp.casNumber) {
        warnings.push(`Composition entry ${index}: CAS number missing`);
      }
      if (typeof comp.percentage !== 'number') {
        warnings.push(`Composition entry ${index}: Percentage not numeric`);
      }
    });
  }

  // Validate physical properties
  if (data.physicalProperties?.flashPoint?.value &&
      !data.physicalProperties.flashPoint.units) {
    warnings.push("Flash point units not specified");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export default { SDSExtractionSchema, ExampleSDSExtraction, validateExtractedData };