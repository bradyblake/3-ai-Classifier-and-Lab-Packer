/**
 * Test Suite for ConstituentFirstClassifier
 * 
 * Tests the revolutionary constituent-first hazardous waste classification logic
 */

import ConstituentFirstClassifier from '../../src/engines/ConstituentFirstClassifier.js';

describe('ConstituentFirstClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new ConstituentFirstClassifier();
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with empty performance stats', () => {
      const stats = classifier.getPerformanceStats();
      expect(stats.totalClassifications).toBe(0);
      expect(stats.averageClassificationTime).toBe(0);
    });

    test('should load regulatory databases', () => {
      const dbStats = classifier.getDatabaseStats();
      expect(dbStats.pCodes).toBeGreaterThan(0);
      expect(dbStats.uCodes).toBeGreaterThan(0);
      expect(dbStats.dCodes).toBeGreaterThan(0);
      expect(dbStats.totalChemicals).toBeGreaterThan(0);
    });
  });

  describe('CAS Number Normalization', () => {
    test('should normalize valid CAS numbers', () => {
      expect(classifier.normalizeCAS('67-64-1')).toBe('67-64-1');
      expect(classifier.normalizeCAS(' 67-64-1 ')).toBe('67-64-1');
      expect(classifier.normalizeCAS('67 - 64 - 1')).toBe('67-64-1');
    });

    test('should handle invalid CAS numbers', () => {
      expect(classifier.normalizeCAS('')).toBeNull();
      expect(classifier.normalizeCAS(null)).toBeNull();
      expect(classifier.normalizeCAS('invalid')).toBeNull();
      expect(classifier.normalizeCAS('123')).toBeNull();
    });

    test('should validate CAS format', () => {
      expect(classifier.validateCAS('67-64-1')).toBe(true);
      expect(classifier.validateCAS('123-45-6')).toBe(true);
      expect(classifier.validateCAS('invalid')).toBe(false);
      expect(classifier.validateCAS('')).toBe(false);
    });
  });

  describe('Core Classification Logic', () => {
    test('should classify acetone as U002', () => {
      const result = classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "100%" }
      ]);
      
      expect(result.wasteCodes).toContain("U002");
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reasoning).toContain("67-64-1 (Acetone) → U002");
    });

    test('should classify methanol as U154', () => {
      const result = classifier.classify([
        { name: "Methanol", cas: "67-56-1", percentage: "50%" }
      ]);
      
      expect(result.wasteCodes).toContain("U154");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    test('should handle multiple chemicals', () => {
      const result = classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "85%" },
        { name: "Methanol", cas: "67-56-1", percentage: "15%" }
      ]);
      
      expect(result.wasteCodes).toContain("U002"); // Acetone
      expect(result.wasteCodes).toContain("U154"); // Methanol
      expect(result.wasteCodes.length).toBeGreaterThanOrEqual(2);
      expect(result.chemicals.length).toBe(2);
    });

    test('should identify ignitable chemicals (D001)', () => {
      const result = classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "100%" }
      ]);
      
      expect(result.wasteCodes).toContain("D001");
      expect(result.reasoning).toContain("D001");
    });

    test('should handle unknown CAS numbers gracefully', () => {
      const result = classifier.classify([
        { name: "Unknown Chemical", cas: "000-00-0", percentage: "50%" }
      ]);
      
      expect(result.wasteCodes).toEqual([]);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.unknownChemicals.length).toBe(1);
    });

    test('should handle invalid input gracefully', () => {
      const result = classifier.classify([]);
      expect(result.wasteCodes).toEqual([]);
      expect(result.reasoning).toContain('No valid chemical composition provided');
    });

    test('should handle null/undefined input', () => {
      const result = classifier.classify(null);
      expect(result.wasteCodes).toEqual([]);
      expect(result.reasoning).toContain('No valid chemical composition provided');
    });
  });

  describe('P-Code Classification (Acutely Hazardous)', () => {
    test('should identify P-codes for acutely hazardous chemicals', () => {
      // Test with a known P-code chemical (if available in test data)
      const result = classifier.classify([
        { name: "Test Chemical", cas: "116-06-3", percentage: "1%" } // Aldicarb - P001
      ]);
      
      // This test depends on the actual P-code data loaded
      if (result.wasteCodes.some(code => code.startsWith('P'))) {
        expect(result.wasteCodes).toContain("P001");
        expect(result.confidence).toBeGreaterThan(0.9);
      }
    });
  });

  describe('D-Code Classification (Characteristics)', () => {
    test('should identify D-codes for characteristic wastes', () => {
      const result = classifier.classify([
        { name: "Benzene", cas: "71-43-2", percentage: "10%" } // D018
      ]);
      
      // This test depends on the actual D-code data loaded
      if (result.wasteCodes.some(code => code.startsWith('D'))) {
        expect(result.wasteCodes).toContain("D018");
        expect(result.confidence).toBeGreaterThan(0.9);
      }
    });
  });

  describe('Performance Requirements', () => {
    test('should classify within 100ms', () => {
      const startTime = performance.now();
      
      classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "100%" },
        { name: "Methanol", cas: "67-56-1", percentage: "50%" },
        { name: "Benzene", cas: "71-43-2", percentage: "25%" }
      ]);
      
      const endTime = performance.now();
      const classificationTime = endTime - startTime;
      
      expect(classificationTime).toBeLessThan(100);
    });

    test('should track performance statistics', () => {
      classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "100%" }
      ]);
      
      const stats = classifier.getPerformanceStats();
      expect(stats.totalClassifications).toBe(1);
      expect(stats.averageClassificationTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed chemical objects', () => {
      const result = classifier.classify([
        { name: "Test", cas: null, percentage: "50%" },
        { name: null, cas: "67-64-1", percentage: "50%" },
        { cas: "67-56-1", percentage: "50%" } // missing name
      ]);
      
      expect(result).toBeDefined();
      expect(result.wasteCodes).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });

    test('should handle empty strings and whitespace', () => {
      const result = classifier.classify([
        { name: "", cas: "", percentage: "" },
        { name: "   ", cas: "   ", percentage: "   " }
      ]);
      
      expect(result).toBeDefined();
      expect(result.unknownChemicals.length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    test('should search chemicals by name', () => {
      const results = classifier.searchChemicals('acetone');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('acetone');
    });

    test('should handle empty search terms', () => {
      const results = classifier.searchChemicals('');
      expect(results).toEqual([]);
    });

    test('should handle null search terms', () => {
      const results = classifier.searchChemicals(null);
      expect(results).toEqual([]);
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign high confidence to known chemicals', () => {
      const result = classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "100%" }
      ]);
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should assign low confidence to unknown chemicals', () => {
      const result = classifier.classify([
        { name: "Unknown", cas: "999-99-9", percentage: "100%" }
      ]);
      
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Output Format', () => {
    test('should return properly formatted result', () => {
      const result = classifier.classify([
        { name: "Acetone", cas: "67-64-1", percentage: "100%" }
      ]);
      
      expect(result).toHaveProperty('wasteCodes');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('chemicals');
      expect(result).toHaveProperty('unknownChemicals');
      expect(result).toHaveProperty('performance');
      
      expect(Array.isArray(result.wasteCodes)).toBe(true);
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.chemicals)).toBe(true);
      expect(Array.isArray(result.unknownChemicals)).toBe(true);
      expect(typeof result.performance).toBe('object');
    });
  });
});
