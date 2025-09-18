/**
 * MasterOrchestrator.test.js - Comprehensive Integration Test Suite
 * 
 * Tests the full pipeline integration, conflict resolution, and regulatory compliance
 */

const MasterOrchestrator = require('../src/engines/MasterOrchestrator');

// Mock engine implementations for testing
class MockBulletproofSDSExtractor {
  async extract(pdfBuffer) {
    // Simulate different SDS extraction scenarios
    if (pdfBuffer.toString().includes('ACETONE')) {
      return {
        success: true,
        composition: [
          { name: 'Acetone', cas: '67-64-1', percentage: 95, formula: 'C3H6O' },
          { name: 'Water', cas: '7732-18-5', percentage: 5, formula: 'H2O' }
        ],
        text: 'Flash point: -17°C. Highly flammable liquid.',
        quality: 0.94
      };
    } else if (pdfBuffer.toString().includes('ALDRIN')) {
      return {
        success: true,
        composition: [
          { name: 'Aldrin', cas: '309-00-2', percentage: 98, formula: 'C12H8Cl6' }
        ],
        text: 'Extremely toxic pesticide. Banned substance.',
        quality: 0.91
      };
    } else if (pdfBuffer.toString().includes('LEAD_PAINT')) {
      return {
        success: true,
        composition: [
          { name: 'Lead chromate', cas: '7758-97-6', percentage: 15, formula: 'PbCrO4' },
          { name: 'Titanium dioxide', cas: '13463-67-7', percentage: 25, formula: 'TiO2' },
          { name: 'Mineral spirits', cas: '64742-47-8', percentage: 60, formula: 'C7-C12' }
        ],
        text: 'Paint formulation containing lead compounds. Flash point: 38°C.',
        quality: 0.89
      };
    }
    
    return {
      success: false,
      error: 'Failed to extract SDS content'
    };
  }
}

class MockConstituentFirstClassifier {
  async classify(composition) {
    const codes = [];
    
    composition.forEach(chemical => {
      // P-codes (Acutely hazardous)
      if (chemical.cas === '309-00-2') { // Aldrin
        codes.push({
          wasteCode: 'P001',
          chemical: chemical.name,
          cas: chemical.cas,
          confidence: 0.98,
          reasoning: `${chemical.name} (CAS: ${chemical.cas}) → P001 (Acutely hazardous waste)`
        });
      }
      
      // U-codes (Hazardous)
      if (chemical.cas === '67-64-1') { // Acetone
        codes.push({
          wasteCode: 'U002',
          chemical: chemical.name,
          cas: chemical.cas,
          confidence: 0.95,
          reasoning: `${chemical.name} (CAS: ${chemical.cas}) → U002 (Hazardous waste)`
        });
      }
    });
    
    return {
      success: true,
      codes: codes
    };
  }
}

class MockPhysicalStateClassifier {
  async classify(composition, text) {
    const codes = [];
    
    // D001 - Ignitable
    if (text.includes('Flash point') && text.includes('-17°C')) {
      codes.push({
        wasteCode: 'D001',
        characteristic: 'ignitable',
        confidence: 0.92,
        reasoning: 'Flash point -17°C < 60°C → D001 (Ignitable)'
      });
    } else if (text.includes('Flash point: 38°C')) {
      codes.push({
        wasteCode: 'D001',
        characteristic: 'ignitable', 
        confidence: 0.87,
        reasoning: 'Flash point 38°C < 60°C → D001 (Ignitable)'
      });
    }
    
    // D008 - Lead
    const hasLead = composition.some(chem => 
      chem.name.toLowerCase().includes('lead') || 
      chem.cas === '7758-97-6'
    );
    if (hasLead) {
      codes.push({
        wasteCode: 'D008',
        characteristic: 'lead',
        confidence: 0.89,
        reasoning: 'Lead content → D008 (Toxic metal)'
      });
    }
    
    return {
      success: true,
      codes: codes
    };
  }
}

describe('MasterOrchestrator Integration Tests', () => {
  let orchestrator;
  let mockEngines;

  beforeEach(() => {
    orchestrator = new MasterOrchestrator({
      confidenceThreshold: 0.7,
      maxProcessingTime: 5000
    });
    
    mockEngines = {
      extractor: new MockBulletproofSDSExtractor(),
      constituentClassifier: new MockConstituentFirstClassifier(),
      physicalStateClassifier: new MockPhysicalStateClassifier()
    };
  });

  describe('Engine Initialization', () => {
    test('should initialize with all required engines', async () => {
      await expect(orchestrator.initialize(mockEngines)).resolves.not.toThrow();
    });

    test('should reject initialization with missing engines', async () => {
      const incompleteEngines = { extractor: mockEngines.extractor };
      await expect(orchestrator.initialize(incompleteEngines)).rejects.toThrow();
    });
  });

  describe('P-Code Classification (Acutely Hazardous)', () => {
    test('should correctly classify Aldrin as P001', async () => {
      await orchestrator.initialize(mockEngines);
      const pdfBuffer = Buffer.from('ALDRIN Safety Data Sheet');
      
      const result = await orchestrator.classifySDS(pdfBuffer);
      
      expect(result.success).toBe(true);
      expect(result.classification.wasteCodes).toContain('P001');
      expect(result.classification.primary).toBe('P001');
      expect(result.classification.confidence).toBeGreaterThan(0.9);
      expect(result.reasoning).toContain('Aldrin (CAS: 309-00-2) → P001 (Acutely hazardous waste)');
    });
  });

  describe('U-Code Classification (Hazardous)', () => {
    test('should correctly classify Acetone as U002 and D001', async () => {
      await orchestrator.initialize(mockEngines);
      const pdfBuffer = Buffer.from('ACETONE Safety Data Sheet');
      
      const result = await orchestrator.classifySDS(pdfBuffer);
      
      expect(result.success).toBe(true);
      expect(result.classification.wasteCodes).toContain('U002');
      expect(result.classification.wasteCodes).toContain('D001');
      expect(result.classification.primary).toBe('U002'); // U-code should be primary over D-code
      expect(result.classification.characteristics).toContain('ignitable');
    });
  });

  describe('Multi-Hazard Classification', () => {
    test('should handle complex multi-hazard materials (Lead Paint)', async () => {
      await orchestrator.initialize(mockEngines);
      const pdfBuffer = Buffer.from('LEAD_PAINT Safety Data Sheet');
      
      const result = await orchestrator.classifySDS(pdfBuffer);
      
      expect(result.success).toBe(true);
      expect(result.classification.wasteCodes).toContain('D001'); // Ignitable
      expect(result.classification.wasteCodes).toContain('D008'); // Lead
      expect(result.classification.characteristics).toContain('ignitable');
      expect(result.classification.characteristics).toContain('lead');
      expect(result.composition).toHaveLength(3); // Three components
    });
  });

  describe('Conflict Resolution', () => {
    test('should prioritize P-codes over U-codes and D-codes', async () => {
      // Create a scenario with multiple code types
      const customExtractor = {
        async extract() {
          return {
            success: true,
            composition: [
              { name: 'Aldrin', cas: '309-00-2', percentage: 50 },
              { name: 'Acetone', cas: '67-64-1', percentage: 50 }
            ],
            text: 'Flash point: -17°C',
            quality: 0.9
          };
        }
      };

      await orchestrator.initialize({
        ...mockEngines,
        extractor: customExtractor
      });
      
      const result = await orchestrator.classifySDS(Buffer.from('test'));
      
      expect(result.classification.primary).toBe('P001'); // P-code should be primary
      expect(result.classification.wasteCodes).toContain('P001');
      expect(result.classification.wasteCodes).toContain('U002');
      expect(result.classification.wasteCodes).toContain('D001');
    });

    test('should handle duplicate codes by keeping highest confidence', async () => {
      // Mock scenario where same chemical generates codes from different engines
      const result = await orchestrator.resolveConflicts([
        { code: 'D001', confidence: 0.8, type: 'D', source: 'engine1' },
        { code: 'D001', confidence: 0.9, type: 'D', source: 'engine2' }
      ]);
      
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.9);
    });
  });

  describe('Performance Requirements', () => {
    test('should complete classification within 3 seconds', async () => {
      await orchestrator.initialize(mockEngines);
      const startTime = Date.now();
      
      const result = await orchestrator.classifySDS(Buffer.from('ACETONE'));
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000);
      expect(result.metadata.processingTime).toMatch(/^\d+\.\d+ seconds$/);
    });

    test('should handle timeout gracefully', async () => {
      const slowEngine = {
        async extract() {
          await new Promise(resolve => setTimeout(resolve, 6000)); // 6 second delay
          return { success: true, composition: [], text: '', quality: 1 };
        }
      };

      await orchestrator.initialize({
        ...mockEngines,
        extractor: slowEngine
      });

      const result = await orchestrator.classifySDS(Buffer.from('test'));
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Compliance Information', () => {
    test('should generate proper RCRA compliance info', async () => {
      await orchestrator.initialize(mockEngines);
      const result = await orchestrator.classifySDS(Buffer.from('ACETONE'));
      
      expect(result.compliance.rcra).toBe(true);
      expect(result.compliance.recommendations).toContain('Licensed hazardous waste facility required');
    });

    test('should generate DOT classification for ignitable waste', async () => {
      await orchestrator.initialize(mockEngines);
      const result = await orchestrator.classifySDS(Buffer.from('ACETONE'));
      
      expect(result.compliance.dot).toContain('Hazard Class 3');
      expect(result.compliance.dot).toContain('Flammable');
    });

    test('should provide enhanced recommendations for P-codes', async () => {
      await orchestrator.initialize(mockEngines);
      const result = await orchestrator.classifySDS(Buffer.from('ALDRIN'));
      
      expect(result.compliance.recommendations).toContain('Acutely hazardous waste - Enhanced safety protocols required');
    });
  });

  describe('Error Handling', () => {
    test('should handle extraction failures gracefully', async () => {
      const failingExtractor = {
        async extract() {
          throw new Error('PDF corrupted');
        }
      };

      await orchestrator.initialize({
        ...mockEngines,
        extractor: failingExtractor
      });

      const result = await orchestrator.classifySDS(Buffer.from('test'));
      expect(result.success).toBe(false);
      expect(result.error).toContain('PDF corrupted');
      expect(result.metadata.error).toBe(true);
    });

    test('should validate input parameters', async () => {
      await orchestrator.initialize(mockEngines);
      
      // Test invalid input
      const result = await orchestrator.classifySDS(null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Valid PDF buffer required');
    });
  });

  describe('Accuracy Validation Against Known Cases', () => {
    const knownTestCases = [
      {
        name: 'Aldrin (P001)',
        input: 'ALDRIN',
        expectedCodes: ['P001'],
        expectedPrimary: 'P001',
        minConfidence: 0.95
      },
      {
        name: 'Acetone (U002 + D001)',
        input: 'ACETONE',
        expectedCodes: ['U002', 'D001'],
        expectedPrimary: 'U002',
        minConfidence: 0.9
      },
      {
        name: 'Lead Paint (D001 + D008)',
        input: 'LEAD_PAINT',
        expectedCodes: ['D001', 'D008'],
        expectedPrimary: 'D001', // Based on confidence
        minConfidence: 0.85
      }
    ];

    knownTestCases.forEach(testCase => {
      test(`should correctly classify ${testCase.name}`, async () => {
        await orchestrator.initialize(mockEngines);
        const result = await orchestrator.classifySDS(Buffer.from(testCase.input));
        
        expect(result.success).toBe(true);
        testCase.expectedCodes.forEach(code => {
          expect(result.classification.wasteCodes).toContain(code);
        });
        expect(result.classification.confidence).toBeGreaterThanOrEqual(testCase.minConfidence);
      });
    });
  });

  describe('Regression Testing', () => {
    test('should maintain consistent results across multiple runs', async () => {
      await orchestrator.initialize(mockEngines);
      const pdfBuffer = Buffer.from('ACETONE');
      
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await orchestrator.classifySDS(pdfBuffer));
      }
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.classification.wasteCodes).toEqual(firstResult.classification.wasteCodes);
        expect(result.classification.primary).toBe(firstResult.classification.primary);
        expect(result.classification.confidence).toBe(firstResult.classification.confidence);
      });
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory during processing', async () => {
      await orchestrator.initialize(mockEngines);
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run multiple classifications
      for (let i = 0; i < 10; i++) {
        await orchestrator.classifySDS(Buffer.from(`TEST_${i}`));
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});

// Integration test runner
if (require.main === module) {
  console.log('🧪 Running MasterOrchestrator Integration Tests...');
  
  // Run tests with actual engines when available
  const runProductionTests = async () => {
    try {
      // This would use real engines in production
      const orchestrator = new MasterOrchestrator();
      
      // Load real engines here when ready
      // const realEngines = {
      //   extractor: new BulletproofSDSExtractor(),
      //   constituentClassifier: new ConstituentFirstClassifier(),
      //   physicalStateClassifier: new PhysicalStateClassifier()
      // };
      
      console.log('✅ Production integration test setup ready');
      console.log('📋 Awaiting real engine implementations for full testing');
      
    } catch (error) {
      console.error('❌ Production test setup failed:', error.message);
    }
  };
  
  runProductionTests();
}

module.exports = {
  MockBulletproofSDSExtractor,
  MockConstituentFirstClassifier, 
  MockPhysicalStateClassifier
};