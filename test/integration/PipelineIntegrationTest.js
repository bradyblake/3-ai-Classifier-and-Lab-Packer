/**
 * Integration Test Suite for Complete SDS Classification Pipeline
 * Tests the end-to-end flow: SDS → API → JSON → Classification
 */

import { SDSClassificationPipeline } from '../../src/pipelines/SDSClassificationPipeline.js';
import { SDSExtractionService } from '../../src/services/SDSExtractionService.js';
import { MasterWasteClassifier } from '../../src/engines/MasterWasteClassifier.js';
import { validateExtractedData } from '../../src/schemas/SDSExtractionSchema.js';
import fs from 'fs';
import path from 'path';

describe('SDS Classification Pipeline Integration Tests', () => {
  let pipeline;
  let mockApiKeys;

  beforeAll(() => {
    // Use mock API keys for testing
    mockApiKeys = {
      groq: process.env.GROQ_API_KEY || 'test-groq-key',
      gemini: process.env.GEMINI_API_KEY || 'test-gemini-key'
    };

    pipeline = new SDSClassificationPipeline(mockApiKeys);
  });

  describe('Complete Pipeline Flow', () => {
    test('should handle end-to-end processing with valid SDS text', async () => {
      const mockSDSText = createMockSDSText();

      // Mock the API calls to return structured data
      const mockExtractor = new SDSExtractionService();
      mockExtractor.extractSDSData = jest.fn().mockResolvedValue(createMockStructuredData());

      pipeline.masterClassifier.sdsExtractor = mockExtractor;

      const result = await pipeline.processSDSText(mockSDSText, {
        selectedState: 'TX',
        wasteSource: 'degreasing',
        isSpent: true
      });

      expect(result.success).toBe(true);
      expect(result.result.pipeline).toBe('SDS Text → API → JSON → Classification');
      expect(result.result.extractionMeta).toBeDefined();
      expect(result.result.classificationResults).toBeDefined();
    });

    test('should handle API extraction failure gracefully', async () => {
      const mockSDSText = createMockSDSText();

      // Mock API failure
      const mockExtractor = new SDSExtractionService();
      mockExtractor.extractSDSData = jest.fn().mockRejectedValue(new Error('API failure'));

      pipeline.masterClassifier.sdsExtractor = mockExtractor;

      const result = await pipeline.processSDSText(mockSDSText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API failure');
    });
  });

  describe('Schema Validation', () => {
    test('should validate extracted data structure', () => {
      const validData = createMockStructuredData();
      const validation = validateExtractedData(validData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should identify missing required fields', () => {
      const invalidData = {
        productInfo: {}, // Missing required fields
        physicalProperties: {},
        composition: []
      };

      const validation = validateExtractedData(invalidData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Classification Logic Integration', () => {
    test('should apply D001 (ignitability) correctly', async () => {
      const sdsData = createMockStructuredData({
        physicalProperties: {
          physicalState: 'liquid',
          flashPoint: { value: 45, units: '°C' } // Below 60°C threshold
        }
      });

      const classifier = new MasterWasteClassifier();
      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX'
      });

      const d001Code = result.results.rcraWasteCodes.find(c => c.code === 'D001');
      expect(d001Code).toBeDefined();
      expect(d001Code.description).toBe('Ignitable');
    });

    test('should apply D002 (corrosivity) correctly', async () => {
      const sdsData = createMockStructuredData({
        physicalProperties: {
          physicalState: 'liquid',
          pH: 1.5 // Below 2.0 threshold
        }
      });

      const classifier = new MasterWasteClassifier();
      const result = await classifier.classifyWaste(sdsData);

      const d002Code = result.results.rcraWasteCodes.find(c => c.code === 'D002');
      expect(d002Code).toBeDefined();
      expect(d002Code.description).toBe('Corrosive');
    });

    test('should identify P-listed wastes', async () => {
      const sdsData = createMockStructuredData({
        composition: [
          {
            chemicalName: 'Acrolein',
            casNumber: '107-02-8', // P003
            percentage: 85
          }
        ]
      });

      const classifier = new MasterWasteClassifier();
      const result = await classifier.classifyWaste(sdsData);

      const pCode = result.results.rcraWasteCodes.find(c => c.code.startsWith('P'));
      expect(pCode).toBeDefined();
    });

    test('should apply Texas state regulations', async () => {
      const sdsData = createMockStructuredData({
        physicalProperties: {
          physicalState: 'liquid',
          flashPoint: { value: 45, units: '°C' }
        }
      });

      const classifier = new MasterWasteClassifier();
      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX',
        generatorInfo: {
          companyName: 'Test Company',
          epaId: '12345'
        }
      });

      expect(result.results.stateWasteCodes.length).toBeGreaterThan(0);
      const texasCode = result.results.stateWasteCodes.find(c => c.texasWasteCode);
      expect(texasCode).toBeDefined();
      expect(texasCode.texasWasteCode).toMatch(/^\d{7}H$/); // Should end with H for hazardous
    });
  });

  describe('Form Generation', () => {
    test('should generate appropriate forms for hazardous waste', async () => {
      const sdsData = createMockStructuredData({
        physicalProperties: {
          physicalState: 'liquid',
          flashPoint: { value: 45, units: '°C' }
        }
      });

      const classifier = new MasterWasteClassifier();
      const result = await classifier.classifyWaste(sdsData, {
        selectedState: 'TX',
        generateForms: true,
        generatorInfo: {
          companyName: 'Test Company',
          epaId: 'TXD123456789'
        }
      });

      expect(result.forms).toBeDefined();
      expect(Object.keys(result.forms).length).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing', () => {
    test('should handle batch processing with mixed results', async () => {
      // Mock multiple files with different outcomes
      const mockFiles = ['file1.pdf', 'file2.pdf', 'file3.pdf'];

      // Mock the file extraction to return different results
      const mockExtractor = new SDSExtractionService();
      mockExtractor.extractFromFile = jest.fn()
        .mockResolvedValueOnce(createMockStructuredData()) // Success
        .mockRejectedValueOnce(new Error('File not found')) // Failure
        .mockResolvedValueOnce(createMockStructuredData()); // Success

      pipeline.masterClassifier.sdsExtractor = mockExtractor;

      const results = await pipeline.batchProcess(mockFiles, {
        selectedState: 'TX'
      });

      expect(results.totalFiles).toBe(3);
      expect(results.successful).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.successRate).toBe(67); // 2/3 * 100, rounded
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed SDS text gracefully', async () => {
      const malformedText = 'This is not a valid SDS document';

      // Mock API to return minimal valid structure
      const mockExtractor = new SDSExtractionService();
      mockExtractor.extractSDSData = jest.fn().mockResolvedValue({
        productInfo: { productName: 'Unknown' },
        physicalProperties: { physicalState: 'unknown' },
        composition: [],
        extractionMeta: {
          apiProvider: 'test',
          confidence: 0.1,
          warnings: ['Low confidence extraction'],
          missingData: ['Most data fields']
        }
      });

      pipeline.masterClassifier.sdsExtractor = mockExtractor;

      const result = await pipeline.processSDSText(malformedText);

      expect(result.success).toBe(true); // Should still succeed with low confidence
      expect(result.result.extractionMeta.confidence).toBeLessThan(0.5);
      expect(result.result.extractionMeta.warnings.length).toBeGreaterThan(0);
    });

    test('should handle network timeouts', async () => {
      const mockSDSText = createMockSDSText();

      const mockExtractor = new SDSExtractionService();
      mockExtractor.extractSDSData = jest.fn().mockRejectedValue(new Error('Network timeout'));

      pipeline.masterClassifier.sdsExtractor = mockExtractor;

      const result = await pipeline.processSDSText(mockSDSText);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Performance Metrics', () => {
    test('should track processing statistics', async () => {
      // Reset stats
      pipeline.resetStats();

      const mockSDSText = createMockSDSText();
      const mockExtractor = new SDSExtractionService();
      mockExtractor.extractSDSData = jest.fn().mockResolvedValue(createMockStructuredData());
      pipeline.masterClassifier.sdsExtractor = mockExtractor;

      // Process multiple times
      await pipeline.processSDSText(mockSDSText);
      await pipeline.processSDSText(mockSDSText);

      const stats = pipeline.getStats();

      expect(stats.totalProcessed).toBe(2);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });
});

// Helper functions for creating test data

function createMockSDSText() {
  return `
SAFETY DATA SHEET

1. IDENTIFICATION
Product Name: Test Industrial Solvent
Manufacturer: Test Chemical Company
Product Code: TIC-001

2. HAZARD IDENTIFICATION
GHS Classification: Flammable liquid Category 2
Signal Word: Danger
Hazard Statements: H225 - Highly flammable liquid and vapor

3. COMPOSITION
Acetone: 70% (CAS: 67-64-1)
Ethanol: 25% (CAS: 64-17-5)
Water: 5% (CAS: 7732-18-5)

9. PHYSICAL AND CHEMICAL PROPERTIES
Physical State: Liquid
Color: Colorless
Flash Point: 45°C (Closed cup)
Boiling Point: 85°C
pH: Not applicable
Density: 0.89 g/cm³

10. STABILITY AND REACTIVITY
Chemical Stability: Stable under normal conditions
Incompatible Materials: Strong oxidizers
Hazardous Decomposition: Carbon monoxide, carbon dioxide
`;
}

function createMockStructuredData(overrides = {}) {
  const defaultData = {
    productInfo: {
      productName: 'Test Industrial Solvent',
      manufacturer: 'Test Chemical Company',
      productCode: 'TIC-001',
      casNumber: '67-64-1'
    },
    physicalProperties: {
      physicalState: 'liquid',
      color: 'colorless',
      flashPoint: { value: 45, units: '°C' },
      boilingPoint: { value: 85, units: '°C' },
      density: { value: 0.89, units: 'g/cm³' },
      pH: null
    },
    composition: [
      {
        chemicalName: 'Acetone',
        casNumber: '67-64-1',
        percentage: 70,
        concentrationUnits: 'wt%',
        isHazardous: true
      },
      {
        chemicalName: 'Ethanol',
        casNumber: '64-17-5',
        percentage: 25,
        concentrationUnits: 'wt%',
        isHazardous: true
      }
    ],
    hazardClassifications: {
      ghsClassifications: [
        {
          hazardClass: 'Flammable liquids',
          category: 'Category 2',
          hazardStatement: 'H225: Highly flammable liquid and vapor'
        }
      ],
      signalWord: 'Danger',
      hazardStatements: ['H225: Highly flammable liquid and vapor'],
      pictograms: ['Flame']
    },
    stabilityReactivity: {
      chemicalStability: 'Stable under normal conditions',
      incompatibleMaterials: ['Strong oxidizers'],
      hazardousDecomposition: ['Carbon monoxide', 'Carbon dioxide'],
      reactsViolentlyWithWater: false,
      generatesToxicGases: false
    },
    analyticalData: {
      tclpResults: [],
      otherAnalytical: []
    },
    extractionMeta: {
      extractionDate: new Date().toISOString(),
      apiProvider: 'test',
      confidence: 0.9,
      processingTime: 1500,
      warnings: [],
      missingData: []
    }
  };

  // Deep merge overrides
  return mergeDeep(defaultData, overrides);
}

function mergeDeep(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}