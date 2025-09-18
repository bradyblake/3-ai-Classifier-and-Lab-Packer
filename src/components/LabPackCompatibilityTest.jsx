import React, { useState } from 'react';
import { ChemicalCompatibilityEngine } from '../engines/ChemicalCompatibilityEngine.js';
import { EnhancedLabPackEngine } from '../engines/EnhancedLabPackEngine.js';

export default function LabPackCompatibilityTest() {
  const [testResults, setTestResults] = useState([]);
  const [compatibility] = useState(new ChemicalCompatibilityEngine());
  const [labPack] = useState(new EnhancedLabPackEngine());

  // Test scenarios that should validate proper grouping vs segregation
  const testScenarios = [
    {
      name: "Brake Cleaner vs Non-Hazardous (SHOULD SEGREGATE)",
      material1: {
        productName: "CRC Brake Cleaner Aerosol",
        composition: [{ name: "Acetone", percentage: 60 }, { name: "Toluene", percentage: 30 }],
        physicalState: "liquid",
        unNumber: "UN1950",
        packaging: "Pressurized aerosol can"
      },
      material2: {
        productName: "Paper Towels", 
        composition: [],
        physicalState: "solid",
        wasteCodes: []
      },
      expectedResult: "INCOMPATIBLE - Aerosol segregation required"
    },
    {
      name: "WD-40 vs Diesel (SHOULD SEGREGATE - Aerosol vs Liquid)",
      material1: {
        productName: "WD-40 Penetrating Oil",
        composition: [{ name: "Petroleum distillates", percentage: 50 }],
        physicalState: "liquid",
        unNumber: "UN1950"
      },
      material2: {
        productName: "Diesel Fuel",
        composition: [{ name: "Petroleum distillates", percentage: 90 }],
        physicalState: "liquid",
        wasteCodes: ["D001"]
      },
      expectedResult: "INCOMPATIBLE - Aerosol vs non-aerosol"
    },
    {
      name: "Strong Caustic vs Strong Acid (SHOULD SEGREGATE - Reaction)",
      material1: {
        productName: "Sodium Hydroxide Solution",
        composition: [{ name: "Sodium hydroxide", percentage: 20 }],
        physicalState: "liquid",
        wasteCodes: ["D002"]
      },
      material2: {
        productName: "Hydrochloric Acid",
        composition: [{ name: "Hydrochloric acid", percentage: 37 }],
        physicalState: "liquid", 
        wasteCodes: ["D002"]
      },
      expectedResult: "INCOMPATIBLE - Acid/Base reaction"
    },
    {
      name: "Two Compatible Flammables (SHOULD GROUP)",
      material1: {
        productName: "Acetone",
        composition: [{ name: "Acetone", percentage: 99 }],
        physicalState: "liquid",
        wasteCodes: ["D001"],
        flashPoint: 16
      },
      material2: {
        productName: "Methyl Ethyl Ketone (MEK)",
        composition: [{ name: "Butanone", percentage: 99 }], 
        physicalState: "liquid",
        wasteCodes: ["D001"],
        flashPoint: 16
      },
      expectedResult: "COMPATIBLE - Both flammable solvents"
    },
    {
      name: "Two Aerosols (SHOULD GROUP)",
      material1: {
        productName: "Non-Chlorinated Brake Cleaner",
        composition: [{ name: "Heptane", percentage: 70 }],
        physicalState: "liquid",
        unNumber: "UN1950"
      },
      material2: {
        productName: "Contact Cleaner Spray",
        composition: [{ name: "Isopropanol", percentage: 80 }],
        physicalState: "liquid",
        unNumber: "UN1950" 
      },
      expectedResult: "COMPATIBLE - Both aerosols"
    },
    {
      name: "Two General Chemicals (SHOULD GROUP)",
      material1: {
        productName: "Office Supplies - Mixed",
        composition: [],
        physicalState: "solid",
        wasteCodes: []
      },
      material2: {
        productName: "Plastic Containers",
        composition: [],
        physicalState: "solid",
        wasteCodes: []
      },
      expectedResult: "COMPATIBLE - Both general/unknown"
    },
    {
      name: "General Chemical + Flammable (SHOULD GROUP - Don't over-segregate)",
      material1: {
        productName: "Unknown Liquid Waste",
        composition: [],
        physicalState: "liquid",
        wasteCodes: []
      },
      material2: {
        productName: "Acetone",
        composition: [{ name: "Acetone", percentage: 99 }],
        physicalState: "liquid",
        wasteCodes: ["D001"]
      },
      expectedResult: "COMPATIBLE - One unknown allows grouping"
    },
    {
      name: "Paint Thinner + Used Oil (SHOULD GROUP - Similar materials)",
      material1: {
        productName: "Paint Thinner",
        composition: [{ name: "Mineral spirits", percentage: 90 }],
        physicalState: "liquid",
        wasteCodes: ["D001"]
      },
      material2: {
        productName: "Used Motor Oil",
        composition: [{ name: "Petroleum oil", percentage: 95 }],
        physicalState: "liquid",
        wasteCodes: ["D001"]
      },
      expectedResult: "COMPATIBLE - Both petroleum-based"
    }
  ];

  const runTests = () => {
    console.log('🧪 Running Lab Pack Compatibility Tests...');
    
    const results = testScenarios.map(scenario => {
      console.log(`\n🔍 Testing: ${scenario.name}`);
      
      // Test both engines
      const enhancedResult = compatibility.checkCompatibility(scenario.material1, scenario.material2);
      const labPackResult = labPack.checkCompatibility(scenario.material1, scenario.material2);
      
      // Analyze material types
      const detection1 = compatibility.detectMaterialType(scenario.material1);
      const detection2 = compatibility.detectMaterialType(scenario.material2);
      
      const result = {
        scenario: scenario.name,
        material1: scenario.material1.productName,
        material2: scenario.material2.productName,
        expected: scenario.expectedResult,
        enhancedEngine: {
          compatible: enhancedResult.compatible,
          risk_level: enhancedResult.risk_level,
          issues: enhancedResult.issues,
          detection1: detection1.material_types,
          detection2: detection2.material_types
        },
        labPackEngine: {
          compatible: labPackResult.compatible,
          risk_level: labPackResult.risk_level,
          issues: labPackResult.issues
        },
        passed: !enhancedResult.compatible === scenario.expectedResult.includes('INCOMPATIBLE')
      };
      
      console.log(`   Enhanced: ${enhancedResult.compatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
      console.log(`   Issues: ${enhancedResult.issues.join('; ')}`);
      console.log(`   Material 1 Types: ${detection1.material_types.join(', ')}`);
      console.log(`   Material 2 Types: ${detection2.material_types.join(', ')}`);
      console.log(`   Test ${result.passed ? 'PASSED' : 'FAILED'}`);
      
      return result;
    });
    
    setTestResults(results);
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Lab Pack Compatibility Testing</h2>
      <p>Testing enhanced chemical compatibility logic to prevent dangerous mixtures like brake cleaner with non-hazardous materials.</p>
      
      <button 
        onClick={runTests}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Run Compatibility Tests
      </button>

      {testResults.length > 0 && (
        <div>
          <h3>Test Results:</h3>
          {testResults.map((result, index) => (
            <div 
              key={index} 
              style={{
                border: '1px solid #ccc',
                borderRadius: '5px',
                padding: '15px',
                margin: '10px 0',
                backgroundColor: result.passed ? '#e8f5e8' : '#ffe8e8'
              }}
            >
              <h4 style={{ color: result.passed ? '#2e7d32' : '#c62828' }}>
                {result.passed ? '✅' : '❌'} {result.scenario}
              </h4>
              
              <div style={{ marginBottom: '10px' }}>
                <strong>Materials:</strong> {result.material1} vs {result.material2}
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <strong>Expected:</strong> {result.expected}
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <strong>Enhanced Engine Result:</strong>
                <div style={{ marginLeft: '20px', fontSize: '0.9em' }}>
                  <div>Compatible: {result.enhancedEngine.compatible ? 'Yes' : 'No'}</div>
                  <div>Risk Level: {result.enhancedEngine.risk_level}</div>
                  <div>Issues: {result.enhancedEngine.issues.join('; ') || 'None'}</div>
                  <div>Material 1 Types: {result.enhancedEngine.detection1.join(', ')}</div>
                  <div>Material 2 Types: {result.enhancedEngine.detection2.join(', ')}</div>
                </div>
              </div>
              
              <div>
                <strong>Lab Pack Engine Result:</strong>
                <div style={{ marginLeft: '20px', fontSize: '0.9em' }}>
                  <div>Compatible: {result.labPackEngine.compatible ? 'Yes' : 'No'}</div>
                  <div>Risk Level: {result.labPackEngine.risk_level}</div>
                  <div>Issues: {result.labPackEngine.issues.join('; ') || 'None'}</div>
                </div>
              </div>
            </div>
          ))}
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '5px' }}>
            <h4>Summary:</h4>
            <p>Passed: {testResults.filter(r => r.passed).length}/{testResults.length} tests</p>
            {testResults.filter(r => !r.passed).length > 0 && (
              <p style={{ color: '#c62828' }}>
                Failed tests indicate compatibility logic needs further refinement.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}