/**
 * WasteClassificationTests.js
 * Comprehensive test cases for all waste classification paths
 * Provides examples for AI training and validation
 */

import { MasterWasteClassifier } from '../../src/engines/MasterWasteClassifier.js';

describe('Comprehensive Waste Classification Tests', () => {
  let classifier;

  beforeEach(() => {
    classifier = new MasterWasteClassifier();
  });

  describe('D001 Ignitable Wastes', () => {
    test('D001 - Liquid with low flash point', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          Flash Point: 45°C (113°F)
          Physical State: Liquid
          Color: Clear
          Odor: Characteristic
        `,
        sections: {
          '9': 'Flash Point: 45°C Physical State: Liquid'
        }
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX',
        generateForms: true
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.materialState).toBe('liquid');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D001' })
      );
      expect(result.results.confidence).toBeGreaterThan(0.8);
    });

    test('D001 - Liquid with high flash point (non-hazardous)', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          Flash Point: 95°C (203°F)
          Physical State: Liquid
        `,
        sections: {
          '9': 'Flash Point: 95°C Physical State: Liquid'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('non-hazardous');
      expect(result.results.rcraWasteCodes).not.toContainEqual(
        expect.objectContaining({ code: 'D001' })
      );
    });

    test('D001 - Ignitable solid', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          Physical State: Solid
          Flash Point: Not applicable
          Special Properties: Spontaneously ignites under normal conditions
        `,
        sections: {
          '9': 'Physical State: Solid, Spontaneously ignites under normal conditions'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.materialState).toBe('solid');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D001' })
      );
    });
  });

  describe('D002 Corrosive Wastes', () => {
    test('D002 - Acidic material', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          pH: 1.5
          Physical State: Liquid
          Corrosive to metals and skin
        `,
        sections: {
          '9': 'pH: 1.5 Physical State: Liquid'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D002' })
      );
    });

    test('D002 - Basic material', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          pH: 13.2
          Physical State: Liquid
          Strongly alkaline
        `,
        sections: {
          '9': 'pH: 13.2 Physical State: Liquid'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D002' })
      );
    });

    test('D002 - Neutral pH (non-hazardous)', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          pH: 7.8
          Physical State: Liquid
        `
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.rcraWasteCodes).not.toContainEqual(
        expect.objectContaining({ code: 'D002' })
      );
    });
  });

  describe('D003 Reactive Wastes', () => {
    test('D003 - Water reactive material', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 7: Handling and Storage
          Reacts violently with water generating toxic gases
          Unstable under normal conditions
        `,
        sections: {
          '7': 'Reacts violently with water generating toxic gases'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D003' })
      );
    });

    test('D003 - Explosive material', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 2: Hazard Identification
          Explosive when dry
          Shock sensitive
          Detonation hazard
        `
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D003' })
      );
    });
  });

  describe('Toxicity Characteristic (D004-D043)', () => {
    test('D008 - Lead toxicity', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 3: Composition
          Lead compounds: 15%
          TCLP Lead: 8.5 mg/L
        `,
        composition: [
          { name: 'Lead oxide', cas: '1317-36-8', percentage: 15 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D008' })
      );
    });

    test('D009 - Mercury toxicity', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 3: Composition
          Mercury: 0.5%
          TCLP Mercury: 0.8 mg/L
        `,
        composition: [
          { name: 'Mercury', cas: '7439-97-6', percentage: 0.5 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D009' })
      );
    });
  });

  describe('F-Listed Wastes', () => {
    test('F001 - Spent halogenated solvent from degreasing', async () => {
      const sdsData = {
        text: `
          Used degreasing solvent
          Contains: Trichloroethylene, Methylene chloride
          From metal degreasing operations
        `,
        composition: [
          { name: 'Trichloroethylene', cas: '79-01-6', percentage: 85 },
          { name: 'Methylene chloride', cas: '75-09-2', percentage: 10 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        wasteSource: 'degreasing operations',
        isSpent: true
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'F001' })
      );
    });

    test('F003 - Spent non-halogenated solvent', async () => {
      const sdsData = {
        text: `
          Spent solvent mixture
          Contains: Acetone, Ethyl acetate, Xylene
          From coating operations
        `,
        composition: [
          { name: 'Acetone', cas: '67-64-1', percentage: 60 },
          { name: 'Ethyl acetate', cas: '141-78-6', percentage: 30 },
          { name: 'Xylene', cas: '1330-20-7', percentage: 10 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        wasteSource: 'coating operations',
        isSpent: true
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'F003' })
      );
    });
  });

  describe('P-Listed Wastes (Acutely Hazardous)', () => {
    test('P120 - Sodium cyanide', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Chemical: Sodium cyanide
          CAS: 143-33-9
          Extremely toxic
        `,
        composition: [
          { name: 'Sodium cyanide', cas: '143-33-9', percentage: 98 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'P098' })
      );
    });

    test('P081 - Phosgene', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Chemical: Phosgene
          CAS: 75-44-5
          Extremely hazardous gas
        `,
        composition: [
          { name: 'Phosgene', cas: '75-44-5', percentage: 100 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'P081' })
      );
    });
  });

  describe('U-Listed Wastes', () => {
    test('U002 - Acetone', async () => {
      const sdsData = {
        text: `
          Commercial grade acetone
          CAS: 67-64-1
          Purity: 99%
        `,
        composition: [
          { name: 'Acetone', cas: '67-64-1', percentage: 99 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'U002' })
      );
    });

    test('U187 - Toluene', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Chemical: Toluene
          CAS: 108-88-3
        `,
        composition: [
          { name: 'Toluene', cas: '108-88-3', percentage: 98 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'U187' })
      );
    });
  });

  describe('K-Listed Wastes (Source-Specific)', () => {
    test('K001 - Wood preserving wastewater sludge', async () => {
      const sdsData = {
        text: `
          Wastewater treatment sludge
          Contains creosote, pentachlorophenol
          From wood preserving operations
        `,
        composition: [
          { name: 'Creosote', cas: '8001-58-9', percentage: 12 },
          { name: 'Pentachlorophenol', cas: '87-86-5', percentage: 5 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        industryType: 'wood preserving',
        processDescription: 'wastewater treatment from wood preserving operations'
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'K001' })
      );
    });

    test('K087 - Coking operations sludge', async () => {
      const sdsData = {
        text: `
          Decanting tank sludge
          Contains benzene, naphthalene, phenanthrene
          From steel coking operations
        `,
        composition: [
          { name: 'Benzene', cas: '71-43-2', percentage: 8 },
          { name: 'Naphthalene', cas: '91-20-3', percentage: 15 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        industryType: 'iron and steel',
        processDescription: 'coking operations decanting tank sludge'
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'K087' })
      );
    });
  });

  describe('Texas State-Specific Classifications', () => {
    test('Texas Class H - Hazardous waste', async () => {
      const sdsData = {
        text: `
          Waste paint thinner
          Flash point: 38°C
          Contains toluene, methyl ethyl ketone
        `,
        composition: [
          { name: 'Toluene', cas: '108-88-3', percentage: 60 },
          { name: 'Methyl ethyl ketone', cas: '78-93-3', percentage: 30 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX',
        generateForms: true
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.stateWasteCodes[0]).toMatchObject(
        expect.objectContaining({
          classification: 'H',
          texasWasteCode: expect.stringMatching(/.*H$/)
        })
      );
      expect(result.results.forms.length).toBeGreaterThan(0);
    });

    test('Texas Class 1 - Potentially threatening industrial waste', async () => {
      const sdsData = {
        text: `
          Industrial solid waste
          Contains PCBs at 100 ppm
          Solid corrosive material
        `,
        composition: [
          { name: 'PCB mixture', cas: '1336-36-3', percentage: 0.01 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX'
      });

      expect(result.results.classification).toBe('non-hazardous');
      expect(result.results.stateWasteCodes[0]).toMatchObject(
        expect.objectContaining({
          classification: '1',
          texasWasteCode: expect.stringMatching(/.*1$/)
        })
      );
    });

    test('Texas Class 2 - General industrial waste', async () => {
      const sdsData = {
        text: `
          Office paper and cardboard waste
          Physical State: Solid
          No hazardous characteristics
        `
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX'
      });

      expect(result.results.classification).toBe('non-hazardous');
      expect(result.results.stateWasteCodes[0]).toMatchObject(
        expect.objectContaining({
          classification: '2',
          texasWasteCode: expect.stringMatching(/.*2$/)
        })
      );
    });

    test('Texas Class 3 - Inert waste', async () => {
      const sdsData = {
        text: `
          Concrete demolition debris
          Physical State: Solid
          Inert, non-liquid, essentially insoluble
          No chemical reactivity
        `
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX'
      });

      expect(result.results.classification).toBe('non-hazardous');
      expect(result.results.stateWasteCodes[0]).toMatchObject(
        expect.objectContaining({
          classification: '3',
          texasWasteCode: expect.stringMatching(/.*3$/)
        })
      );
    });
  });

  describe('Oklahoma State-Specific Classifications', () => {
    test('Oklahoma SQG - Small Quantity Generator', async () => {
      const sdsData = {
        text: `
          Laboratory waste containing acetone and methanol
          Mixed solvents from research operations
        `,
        composition: [
          { name: 'Acetone', cas: '67-64-1', percentage: 60 },
          { name: 'Methanol', cas: '67-56-1', percentage: 40 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'OK',
        generatorInfo: {
          companyName: 'Test University',
          monthlyGeneration: { hazardous: 500 }, // pounds per month
          epaId: 'OKD123456789'
        },
        generateForms: true
      });

      expect(result.results.classification).toBe('hazardous');
      expect(result.results.forms).toContainEqual(
        expect.objectContaining({
          title: 'Small Quantity Generator Self-Certification'
        })
      );
    });

    test('Oklahoma VSQG - Very Small Quantity Generator', async () => {
      const sdsData = {
        text: `
          Small amount of waste oil
          Contains trace heavy metals
        `
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'OK',
        generatorInfo: {
          monthlyGeneration: { hazardous: 100 } // pounds per month
        }
      });

      expect(result.results.complianceRequirements).toContain(
        expect.stringContaining('Very Small Quantity')
      );
    });
  });

  describe('Physical State Classification', () => {
    test('Liquid state determination with temperature data', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          Physical State: Liquid
          Melting Point: -15°C
          Boiling Point: 85°C
        `,
        sections: {
          '9': 'Physical State: Liquid, Melting Point: -15°C, Boiling Point: 85°C'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.materialState).toBe('liquid');
      expect(result.results.confidence).toBeGreaterThan(0.8);
    });

    test('Solid state determination', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          Physical State: Solid powder
          Melting Point: 180°C
          Color: White
        `,
        sections: {
          '9': 'Physical State: Solid powder, Melting Point: 180°C'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.materialState).toBe('solid');
    });

    test('Gas state determination', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Section 9: Physical Properties
          Physical State: Compressed gas
          Vapor Pressure: 1000 kPa at 20°C
        `,
        sections: {
          '9': 'Physical State: Compressed gas'
        }
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.materialState).toBe('gas');
    });
  });

  describe('Form Generation', () => {
    test('Generate Texas forms for hazardous waste', async () => {
      const sdsData = {
        text: `
          Waste solvent mixture
          Flash point: 25°C
          Contains acetone, toluene
        `
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX',
        generateForms: true,
        generatorInfo: {
          companyName: 'Test Chemical Company',
          epaId: 'TXD123456789',
          address: '123 Industrial Blvd, Houston, TX',
          contact: 'John Smith'
        }
      });

      expect(result.results.forms).toContainEqual(
        expect.objectContaining({
          title: 'Texas Waste Classification Documentation',
          printable: true,
          required: true
        })
      );

      expect(result.results.forms).toContainEqual(
        expect.objectContaining({
          title: 'STEERS Annual Waste Report'
        })
      );
    });

    test('Generate Oklahoma forms for SQG', async () => {
      const sdsData = {
        text: `Hazardous waste containing toluene`
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'OK',
        generateForms: true,
        generatorInfo: {
          companyName: 'Oklahoma Manufacturing',
          monthlyGeneration: { hazardous: 800 }
        }
      });

      expect(result.results.forms).toContainEqual(
        expect.objectContaining({
          title: 'EPA Form 8700-12 (Site Identification)'
        })
      );

      expect(result.results.forms).toContainEqual(
        expect.objectContaining({
          title: 'Small Quantity Generator Self-Certification'
        })
      );
    });
  });

  describe('Training Data Collection', () => {
    test('Collect training data during classification', async () => {
      const sdsData = {
        text: `
          Test chemical with moderate flash point
          Flash point: 65°C
          Physical state: Liquid
        `
      };

      const result = await classifier.classifyWaste(sdsData, {
        collectTrainingData: true
      });

      expect(classifier.trainingData.length).toBeGreaterThan(0);
      expect(result.trainingMetadata.decisionPoints.length).toBeGreaterThan(0);
    });

    test('Export training data', async () => {
      // First generate some training data
      const sdsData = {
        text: 'Test data for training export'
      };

      await classifier.classifyWaste(sdsData, {
        collectTrainingData: true
      });

      const exported = classifier.exportTrainingData('json');
      const data = JSON.parse(exported);

      expect(data.metadata).toBeDefined();
      expect(data.metadata.recordCount).toBeGreaterThan(0);
      expect(data.data).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    test('Handle missing SDS data gracefully', async () => {
      const sdsData = {
        text: '',
        sections: {}
      };

      const result = await classifier.classifyWaste(sdsData);

      expect(result.results.materialState).toBe('unknown');
      expect(result.results.confidence).toBeLessThan(0.5);
      expect(result.results.reasoning).toContain(
        expect.stringMatching(/unknown|insufficient/i)
      );
    });

    test('Handle invalid state selection', async () => {
      const sdsData = {
        text: 'Test chemical'
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'INVALID'
      });

      expect(result.results.stateWasteCodes).toHaveLength(0);
      expect(result.results.reasoning).toContain(
        expect.stringMatching(/not implemented|invalid/i)
      );
    });
  });

  describe('Integration Tests', () => {
    test('End-to-end classification with all components', async () => {
      const sdsData = {
        text: `
          SAFETY DATA SHEET
          Product: Industrial Cleaning Solvent
          Section 3: Composition
          Trichloroethylene: 70%
          Methanol: 25%
          Other ingredients: 5%

          Section 9: Physical Properties
          Physical State: Liquid
          Flash Point: 42°C
          pH: Not applicable

          Section 7: Handling
          Used in metal degreasing operations
          Spent solvent from cleaning process
        `,
        sections: {
          '3': 'Trichloroethylene: 70%, Methanol: 25%',
          '9': 'Physical State: Liquid, Flash Point: 42°C',
          '7': 'Used in metal degreasing operations'
        },
        composition: [
          { name: 'Trichloroethylene', cas: '79-01-6', percentage: 70 },
          { name: 'Methanol', cas: '67-56-1', percentage: 25 }
        ]
      };

      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX',
        wasteSource: 'degreasing operations',
        isSpent: true,
        generateForms: true,
        generatorInfo: {
          companyName: 'Metal Fabrication Inc.',
          epaId: 'TXD987654321',
          address: '456 Manufacturing Dr, Dallas, TX',
          contact: 'Jane Doe',
          process: 'Metal degreasing and cleaning'
        },
        collectTrainingData: true
      });

      // Should be hazardous due to multiple factors
      expect(result.results.classification).toBe('hazardous');
      expect(result.results.materialState).toBe('liquid');

      // Should have multiple RCRA codes
      expect(result.results.rcraWasteCodes.length).toBeGreaterThan(0);
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'D001' }) // Ignitable
      );
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'F001' }) // Spent halogenated solvent
      );
      expect(result.results.rcraWasteCodes).toContainEqual(
        expect.objectContaining({ code: 'U191' }) // Trichloroethylene
      );

      // Should have Texas classification
      expect(result.results.stateWasteCodes).toHaveLength(1);
      expect(result.results.stateWasteCodes[0].classification).toBe('H');

      // Should generate appropriate forms
      expect(result.results.forms.length).toBeGreaterThan(2);
      expect(result.results.forms).toContainEqual(
        expect.objectContaining({
          title: 'Texas Waste Classification Documentation'
        })
      );

      // Should have high confidence
      expect(result.results.confidence).toBeGreaterThan(0.8);

      // Should have comprehensive reasoning
      expect(result.results.reasoning.length).toBeGreaterThan(5);

      // Should collect training data
      expect(classifier.trainingData.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Performance and Stress Tests
 */
describe('Performance Tests', () => {
  let classifier;

  beforeEach(() => {
    classifier = new MasterWasteClassifier();
  });

  test('Handle large SDS documents efficiently', async () => {
    const largeSdsText = 'Large SDS content '.repeat(10000);
    const sdsData = {
      text: largeSdsText,
      sections: {
        '1': 'Product identification',
        '2': 'Hazard identification',
        '3': 'Composition information',
        '9': 'Physical properties'
      }
    };

    const startTime = Date.now();
    const result = await classifier.classifyWaste(sdsData);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(result.results).toBeDefined();
  });

  test('Process multiple classifications concurrently', async () => {
    const testCases = [
      { text: 'Acetone test case' },
      { text: 'Toluene test case' },
      { text: 'Methanol test case' },
      { text: 'Benzene test case' },
      { text: 'Xylene test case' }
    ];

    const startTime = Date.now();
    const results = await Promise.all(
      testCases.map(sdsData => classifier.classifyWaste(sdsData))
    );
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(5);
    expect(results.every(result => result.results)).toBe(true);
    expect(duration).toBeLessThan(10000); // All should complete within 10 seconds
  });
});

/**
 * Mock Data Generators for Testing
 */
export const MockDataGenerators = {
  createIgnitableLiquid: (flashPoint = 45) => ({
    text: `Flash Point: ${flashPoint}°C, Physical State: Liquid`,
    sections: { '9': `Flash Point: ${flashPoint}°C, Physical State: Liquid` }
  }),

  createCorrosiveMaterial: (pH = 1.5) => ({
    text: `pH: ${pH}, Physical State: Liquid, Corrosive`,
    sections: { '9': `pH: ${pH}, Physical State: Liquid` }
  }),

  createReactiveMaterial: () => ({
    text: 'Reacts violently with water, Unstable compound, Explosive when dry',
    sections: { '7': 'Reacts violently with water, Explosive characteristics' }
  }),

  createToxicMaterial: (chemical, cas, tclpValue, threshold) => ({
    text: `Contains ${chemical}, TCLP ${chemical}: ${tclpValue} mg/L`,
    composition: [{ name: chemical, cas, percentage: 10 }]
  }),

  createSpentSolvent: (solvents, source = 'degreasing') => ({
    text: `Spent solvent from ${source} operations`,
    composition: solvents.map((solvent, index) => ({
      name: solvent.name,
      cas: solvent.cas,
      percentage: 100 / solvents.length
    }))
  })
};

export default MockDataGenerators;