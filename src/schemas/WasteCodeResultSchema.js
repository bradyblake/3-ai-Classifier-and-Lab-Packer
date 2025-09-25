/**
 * WasteCodeResultSchema.js
 * Defines the detailed structure for waste code classification results
 * including constituents and characteristics that triggered each code
 */

export const WasteCodeResultSchema = {
  // Standard waste code information
  code: "string", // "D001", "F003", "P001", etc.
  description: "string", // "Ignitable", "Spent solvents", etc.
  category: "string", // "characteristic", "listed", "source-specific"

  // Regulatory basis
  regulatoryBasis: "string", // "40 CFR 261.21(a)(1)"
  regulatoryReference: "string", // Full regulation text excerpt
  listingDate: "string", // When code was first listed (for F/P/U/K codes)

  // Triggering constituents (what caused this code to apply)
  triggeringConstituents: [
    {
      name: "string", // Chemical name
      casNumber: "string", // CAS Registry Number
      percentage: "number", // Concentration in waste
      units: "string", // "wt%", "vol%", "ppm", "mg/L"

      // Why this constituent triggered the code
      triggerReason: "string", // Detailed explanation
      triggerMechanism: "string", // "concentration", "presence", "listing", "characteristic"

      // Constituent properties relevant to classification
      properties: {
        flashPoint: "number|null", // °C
        boilingPoint: "number|null", // °C
        pH: "number|null",
        specificGravity: "number|null",
        vaporPressure: "number|null", // mmHg
        waterSolubility: "string|null", // "soluble", "insoluble", "slightly soluble"

        // Toxicological properties
        oralLD50: "number|null", // mg/kg
        dermalLD50: "number|null", // mg/kg
        inhalationLC50: "number|null", // mg/L

        // Regulatory classifications
        isCarcinogen: "boolean",
        isMutagen: "boolean",
        isTeratogen: "boolean"
      }
    }
  ],

  // Physical/chemical characteristics that apply (for D codes)
  characteristics: {
    // D001 - Ignitability
    ignitability: {
      flashPoint: "number|null", // °C
      flashPointMethod: "string|null", // "Closed cup", "Open cup"
      autoIgnitionTemp: "number|null", // °C
      flammableLimits: {
        lower: "number|null", // % in air
        upper: "number|null"
      },
      result: "string", // "EXCEEDS", "WITHIN", "BELOW"
      threshold: "string", // "≤60°C for liquids"
      testMethod: "string" // "SW-846 Method 1010A"
    },

    // D002 - Corrosivity
    corrosivity: {
      pH: "number|null",
      pHMethod: "string|null", // "Electrometric", "Colorimetric"
      steelCorrosionRate: "number|null", // mm/year
      result: "string", // "EXCEEDS", "WITHIN", "BELOW"
      threshold: "string", // "≤2.0 or ≥12.5"
      testMethod: "string" // "SW-846 Method 9040C"
    },

    // D003 - Reactivity
    reactivity: {
      unstable: "boolean",
      reactsViolentlyWithWater: "boolean",
      generatesToxicGases: "boolean",
      explosiveWhenDry: "boolean",
      shockSensitive: "boolean",

      // Specific tests
      cyanideContent: "number|null", // mg/kg
      sulfideContent: "number|null", // mg/kg

      result: "string",
      testMethods: ["string"]
    },

    // D004-D043 - Toxicity Characteristic
    toxicity: {
      tclpResults: [
        {
          parameter: "string", // "Lead", "Mercury", etc.
          casNumber: "string",
          concentration: "number", // mg/L
          regulatoryLimit: "number", // mg/L
          exceedsLimit: "boolean",
          detectionMethod: "string" // "EPA Method 6010"
        }
      ],
      testMethod: "string", // "SW-846 Method 1311 (TCLP)"
      result: "string"
    }
  },

  // Waste source information (for F/K codes)
  wasteSource: {
    process: "string", // "degreasing", "electroplating", etc.
    industry: "string", // "metal fabrication", "petroleum refining"
    isSpent: "boolean", // Material has been used
    isOffSpecification: "boolean", // Off-spec commercial product
    isResidueOrSludge: "boolean", // Process residue
    sourceDescription: "string", // Detailed process description

    // F code specific
    solventUse: {
      originalPurpose: "string", // "degreasing", "cleaning"
      contaminants: ["string"], // What contaminated the solvent
      recyclability: "string" // "recyclable", "non-recyclable", "unknown"
    }
  },

  // Mixture rule application
  mixtureRule: {
    applies: "boolean",
    basis: "string", // "Listed waste mixed with solid waste"
    derivedFromRule: "boolean", // Material derived from listed waste
    exemptionCriteria: "string|null" // Any applicable exemptions
  },

  // Confidence and data quality
  classificationConfidence: "number", // 0-1 scale
  dataQuality: {
    completeness: "number", // 0-1 scale
    reliability: "string", // "high", "medium", "low"
    missingData: ["string"], // What data was not available
    assumptions: ["string"] // What assumptions were made
  },

  // Recommended actions
  recommendations: {
    additionalTesting: ["string"], // Recommended tests
    characterizationNeeds: ["string"], // Additional characterization
    managementRequirements: ["string"], // How waste must be managed
    treatmentOptions: ["string"] // Potential treatment methods
  }
};

/**
 * Example of detailed waste code result
 */
export const ExampleWasteCodeResult = {
  code: "D001",
  description: "Ignitable",
  category: "characteristic",
  regulatoryBasis: "40 CFR 261.21(a)(1) - Flash point less than 60°C",
  regulatoryReference: "A liquid, other than an aqueous solution containing less than 24 percent alcohol by volume, that has a flash point less than 60°C (140°F)",

  triggeringConstituents: [
    {
      name: "Acetone",
      casNumber: "67-64-1",
      percentage: 75.0,
      units: "wt%",
      triggerReason: "Primary flammable constituent with flash point well below regulatory threshold",
      triggerMechanism: "characteristic",
      properties: {
        flashPoint: -17,
        boilingPoint: 56.05,
        specificGravity: 0.791,
        vaporPressure: 184,
        waterSolubility: "miscible"
      }
    },
    {
      name: "Ethanol",
      casNumber: "64-17-5",
      percentage: 20.0,
      units: "wt%",
      triggerReason: "Secondary flammable constituent contributing to overall ignitability",
      triggerMechanism: "characteristic",
      properties: {
        flashPoint: 13,
        boilingPoint: 78.37,
        specificGravity: 0.789,
        waterSolubility: "miscible"
      }
    }
  ],

  characteristics: {
    ignitability: {
      flashPoint: 45,
      flashPointMethod: "Closed cup",
      result: "EXCEEDS",
      threshold: "≤60°C for liquids",
      testMethod: "SW-846 Method 1010A (Pensky-Martens Closed Cup)"
    }
  },

  wasteSource: {
    process: "degreasing operations",
    industry: "metal fabrication",
    isSpent: true,
    sourceDescription: "Used solvent mixture from metal parts degreasing operations"
  },

  classificationConfidence: 0.95,
  dataQuality: {
    completeness: 0.90,
    reliability: "high",
    missingData: [],
    assumptions: ["Assumed closed cup flash point method based on SDS"]
  },

  recommendations: {
    additionalTesting: [],
    characterizationNeeds: [],
    managementRequirements: [
      "Store in compatible containers away from ignition sources",
      "Manifest as hazardous waste D001",
      "Use DOT Class 3 flammable liquid shipping requirements"
    ],
    treatmentOptions: [
      "Fuel blending (if meets specifications)",
      "High temperature incineration",
      "Solvent recovery/distillation"
    ]
  }
};

export default { WasteCodeResultSchema, ExampleWasteCodeResult };