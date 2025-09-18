// Test Classification Accuracy with Known Materials
// This script tests the fixed classification logic against the materials from your PDF reports

import deterministicClassifier from './backend-unboxed/services/deterministicClassifier.js';

const testCases = [
  {
    name: "GS 200",
    data: {
      productName: "GS 200",
      flashPoint: { celsius: 60.6, fahrenheit: 141 }, // 141°F = 60.6°C
      pH: null,
      physicalState: "liquid",
      composition: [
        {
          name: "2-(2-BUTOXYETHOXY)ETHYL ACETATE",
          cas: "124-17-4",
          percentage: 30
        }
      ]
    },
    expected: {
      federal_codes: ["F003"],
      state_classification: "H",
      state_form_code: "102",
      reasoning_should_include: ["F003: Listed waste containing 2-(2-BUTOXYETHOXY)ETHYL ACETATE"]
    }
  },
  {
    name: "DSR-50",
    data: {
      productName: "DSR-50",
      flashPoint: { celsius: null, fahrenheit: null },
      pH: "2.1-12.4", // Range that includes corrosive levels
      physicalState: "liquid",
      composition: [
        {
          name: "Ethylenediaminetetraacetic Acid",
          cas: "6381-92-6",
          percentage: 2.5
        },
        {
          name: "Sodium Gluconate",
          cas: "527-07-1",
          percentage: 3.5
        },
        {
          name: "Sodium Nitrite",
          cas: "7632-00-0",
          percentage: 2.5
        },
        {
          name: "Linear Alkyl, Aryl Sulphonic Acid",
          cas: "85536-14-7",
          percentage: 5.5
        }
      ]
    },
    expected: {
      federal_codes: ["D002"],
      state_classification: "H",
      state_form_code: "102",
      reasoning_should_include: ["D002: Liquid with pH range 2.1-12.4 spans 10.3 units, indicating variable corrosivity"]
    }
  },
  {
    name: "ALEXIT BR1275-BLADEREP TOPCOAT 12",
    data: {
      productName: "ALEXIT BR1275-BLADEREP TOPCOAT 12",
      flashPoint: { celsius: 34, fahrenheit: 93.2 }, // 93.2°F = 34°C
      pH: 7,
      physicalState: "liquid",
      composition: [
        {
          name: "CAS - No. EC - No.",
          cas: "128601-23-0",
          percentage: 100
        }
      ]
    },
    expected: {
      federal_codes: ["D001"],
      state_classification: "H",
      reasoning_should_include: ["D001: Liquid with flash point 34°C < 60°C"]
    }
  },
  {
    name: "ALEXIT BR12H0-BLADEREP HARDNER 12",
    data: {
      productName: "ALEXIT BR12H0-BLADEREP HARDNER 12",
      flashPoint: { celsius: 60.0, fahrenheit: 140.0 }, // 140°F = 60°C (edge case)
      pH: null,
      physicalState: "liquid",
      composition: [
        {
          name: "Hexamethylene diisocyanate, oligomers",
          cas: "28182-81-2",
          percentage: 70
        },
        {
          name: "n-butyl acetate",
          cas: "123-86-4",
          percentage: 32.5
        },
        {
          name: "hexamethylene diisocyanate",
          cas: "822-06-0",
          percentage: 0.375
        }
      ]
    },
    expected: {
      federal_codes: [], // 60°C is NOT < 60°C, so no D001
      state_classification: "2",
      reasoning_should_include: ["No D001: Flash point 60°C ≥ 60°C"]
    }
  },
  {
    name: "BladeRep LEP 9",
    data: {
      productName: "BladeRep LEP 9",
      flashPoint: { celsius: null, fahrenheit: null },
      pH: "2.1-12.4",
      physicalState: "unknown",
      composition: [
        {
          name: "tetraethyl N,N'(methylenedicyclohexane-4,1diyl)bis-dl-aspartate",
          cas: "136210-30-5",
          percentage: 70
        },
        {
          name: "Reaction mass of bis(1,2,2,6,6pentamethyl-4-piperidyl) sebacate and methyl 1,2,2,6,6-pentamethyl4-piperidyl sebacate",
          cas: "1065336-91-5",
          percentage: 0.75
        },
        {
          name: "titanium dioxide",
          cas: "13463-67-7",
          percentage: 16.25
        },
        {
          name: "diethyl fumarate",
          cas: "623-91-6",
          percentage: 3
        }
      ]
    },
    expected: {
      federal_codes: [], // pH range includes corrosive but it's unknown state (not liquid)
      state_classification: "2",
      reasoning_should_include: ["No D002: Material is unknown (solids cannot be D002)"]
    }
  },
  {
    name: "NANOMYTE MEND 2000 (Part B)",
    data: {
      productName: "NANOMYTE MEND 2000 (Part B)",
      flashPoint: { celsius: null, fahrenheit: null },
      pH: null,
      physicalState: "unknown",
      composition: []
    },
    expected: {
      federal_codes: [], // No hazard indicators
      state_classification: "2",
      reasoning_should_include: ["Texas Class 2: Default non-hazardous industrial waste"]
    }
  }
];

console.log("🧪 TESTING CLASSIFICATION ACCURACY");
console.log("==================================\n");

let passed = 0;
let total = testCases.length;

for (const testCase of testCases) {
  console.log(`\n🔍 Testing: ${testCase.name}`);
  console.log("-".repeat(50));

  const result = deterministicClassifier.classify(testCase.data);

  let testPassed = true;

  // Check federal codes
  const expectedFedCodes = testCase.expected.federal_codes || [];
  const actualFedCodes = result.federal_codes || [];

  if (JSON.stringify(expectedFedCodes.sort()) !== JSON.stringify(actualFedCodes.sort())) {
    console.log(`❌ Federal codes mismatch:`);
    console.log(`   Expected: [${expectedFedCodes.join(', ')}]`);
    console.log(`   Actual:   [${actualFedCodes.join(', ')}]`);
    testPassed = false;
  } else {
    console.log(`✅ Federal codes correct: [${actualFedCodes.join(', ')}]`);
  }

  // Check state classification
  if (testCase.expected.state_classification &&
      result.state_classification !== testCase.expected.state_classification) {
    console.log(`❌ State classification mismatch:`);
    console.log(`   Expected: ${testCase.expected.state_classification}`);
    console.log(`   Actual:   ${result.state_classification}`);
    testPassed = false;
  } else {
    console.log(`✅ State classification correct: ${result.state_classification}`);
  }

  // Check state form code
  if (testCase.expected.state_form_code &&
      result.state_form_code !== testCase.expected.state_form_code) {
    console.log(`❌ State form code mismatch:`);
    console.log(`   Expected: ${testCase.expected.state_form_code}`);
    console.log(`   Actual:   ${result.state_form_code}`);
    testPassed = false;
  } else {
    console.log(`✅ State form code correct: ${result.state_form_code}`);
  }

  // Check reasoning contains expected elements
  if (testCase.expected.reasoning_should_include) {
    const reasoning = result.reasoning.join(' ');
    for (const expectedReason of testCase.expected.reasoning_should_include) {
      if (!reasoning.includes(expectedReason)) {
        console.log(`❌ Missing expected reasoning: "${expectedReason}"`);
        testPassed = false;
      }
    }
  }

  // Show DOT classification
  if (result.dotClassification) {
    console.log(`📦 DOT: ${result.dotClassification.hazardClass} (${result.dotClassification.unNumber})`);
  }

  if (testPassed) {
    console.log(`\n✅ ${testCase.name} PASSED`);
    passed++;
  } else {
    console.log(`\n❌ ${testCase.name} FAILED`);
    console.log(`   Reasoning: ${result.reasoning.join('; ')}`);
  }
}

console.log(`\n🏁 FINAL RESULTS`);
console.log("================");
console.log(`Tests passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);

if (passed === total) {
  console.log("🎉 ALL TESTS PASSED! Classification logic is working correctly.");
} else {
  console.log("🔧 Some tests failed. Review the failed cases above.");
}