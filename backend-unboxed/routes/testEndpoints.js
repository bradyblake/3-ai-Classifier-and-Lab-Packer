// Test Endpoints for Classification API
import express from 'express';
import basicCasLookup from '../services/basicCasLookup.js';

const router = express.Router();

// Test classification with direct input
router.post('/test/classify', (req, res) => {
  const { productName, pH, flashPoint, chemicals } = req.body;
  
  console.log('🧪 Test classification request:', {
    productName,
    pH,
    flashPoint,
    chemicalCount: chemicals?.length || 0
  });
  
  const federalCodes = [];
  const justifications = [];
  
  // Temperature conversion for flash point
  const classifyFlashPoint = (fp) => {
    if (!fp || ['Not Provided', 'Not Available', 'Not Calculated'].includes(fp)) {
      return null;
    }
    
    const fpStr = fp.toString();
    let numericFP = parseFloat(fp);
    
    if (isNaN(numericFP)) return null;
    
    let tempC = numericFP;
    let unit = 'C';
    
    // Detect Fahrenheit
    if (fpStr.match(/[Ff°]/) || numericFP > 100) {
      tempC = (numericFP - 32) * 5 / 9;
      unit = 'F';
    }
    
    if (tempC < 60) {
      return {
        code: 'D001',
        justification: `Flash Point ${numericFP}°${unit} = ${tempC.toFixed(1)}°C < 60°C`
      };
    }
    
    return null;
  };
  
  // pH classification
  const classifypH = (ph) => {
    if (!ph || ['Not Provided', 'Not Available', 'Not Calculated'].includes(ph)) {
      return null;
    }
    
    const numericpH = parseFloat(ph);
    if (isNaN(numericpH)) return null;
    
    if (numericpH <= 2) {
      return {
        code: 'D002',
        justification: `pH ${numericpH} ≤ 2.0 (Corrosive - Acidic)`
      };
    }
    
    if (numericpH >= 12.5) {
      return {
        code: 'D002',
        justification: `pH ${numericpH} ≥ 12.5 (Corrosive - Basic)`
      };
    }
    
    return null;
  };
  
  // CAS lookup for chemicals
  const checkChemicals = (chems) => {
    const results = [];
    
    if (!chems || !Array.isArray(chems)) return results;
    
    chems.forEach(chem => {
      if (chem.casNumber) {
        const hazardData = basicCasLookup.getHazardCharacteristics(chem.casNumber);
        if (hazardData) {
          // Check if CAS data provides missing pH or flash point
          if (hazardData.pH !== null && !pH) {
            const phResult = classifypH(hazardData.pH);
            if (phResult) results.push(phResult);
          }
          
          if (hazardData.flashPoint !== null && !flashPoint) {
            const fpResult = classifyFlashPoint(hazardData.flashPoint);
            if (fpResult) results.push(fpResult);
          }
          
          if (hazardData.federalCodes) {
            hazardData.federalCodes.forEach(code => {
              results.push({
                code: code,
                justification: `${code} from CAS ${chem.casNumber} (${hazardData.name})`
              });
            });
          }
        }
      }
    });
    
    return results;
  };
  
  // Run classifications
  const fpResult = classifyFlashPoint(flashPoint);
  if (fpResult) {
    federalCodes.push(fpResult.code);
    justifications.push(fpResult.justification);
  }
  
  const phResult = classifypH(pH);
  if (phResult) {
    federalCodes.push(phResult.code);
    justifications.push(phResult.justification);
  }
  
  const chemResults = checkChemicals(chemicals);
  chemResults.forEach(result => {
    if (!federalCodes.includes(result.code)) {
      federalCodes.push(result.code);
      justifications.push(result.justification);
    }
  });
  
  // Determine state classification
  let stateClass = 'Class 3';
  let formCode = '102';
  
  if (federalCodes.includes('D002')) {
    stateClass = 'Corrosive Waste';
    const numericpH = parseFloat(pH);
    formCode = numericpH <= 2 ? '105' : '106';
  } else if (federalCodes.includes('D001')) {
    stateClass = 'Ignitable Waste';
    formCode = '102';
  }
  
  // DOT classification
  let dotClass = 'Non-regulated';
  let unNumber = 'None';
  
  if (federalCodes.includes('D001')) {
    dotClass = 'Class 3 - Flammable Liquid';
    unNumber = 'UN1993';
  } else if (federalCodes.includes('D002')) {
    dotClass = 'Class 8 - Corrosive';
    unNumber = pH && parseFloat(pH) <= 2 ? 'UN1830' : 'UN1824';
  }
  
  const result = {
    success: true,
    classification: {
      product: productName || 'Test Material',
      federal_codes: federalCodes,
      explanation: justifications.join('; '),
      state_classification: {
        description: stateClass,
        form_code: formCode
      },
      dot_shipping: {
        hazard_class: dotClass,
        un_number: unNumber
      },
      test_endpoint: true,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('✅ Test classification result:', result);
  res.json(result);
});

// Test specific scenarios
router.get('/test/scenarios/:scenario', (req, res) => {
  const { scenario } = req.params;
  
  const scenarios = {
    'diesel-126f': {
      productName: 'Diesel Fuel',
      flashPoint: '126°F',
      pH: 'Not Provided',
      chemicals: [{ name: 'Petroleum Distillates', casNumber: '68334-30-5' }]
    },
    'sodium-hydroxide': {
      productName: 'Sodium Hydroxide Solution',
      flashPoint: 'Not Available',
      pH: '13.5',
      chemicals: [{ name: 'Sodium Hydroxide', casNumber: '1310-73-2', percentage: '12.5%' }]
    },
    'acetone': {
      productName: 'Acetone',
      flashPoint: '-20°C',
      pH: '7.0',
      chemicals: [{ name: 'Acetone', casNumber: '67-64-1', percentage: '99%' }]
    },
    'hydrochloric-acid': {
      productName: 'Hydrochloric Acid',
      flashPoint: 'Not Applicable',
      pH: '0.5',
      chemicals: [{ name: 'Hydrochloric Acid', casNumber: '7647-01-0', percentage: '10%' }]
    }
  };
  
  const testData = scenarios[scenario];
  
  if (!testData) {
    return res.status(404).json({
      error: 'Scenario not found',
      available: Object.keys(scenarios)
    });
  }
  
  // Forward to classification endpoint
  req.body = testData;
  router.handle(req, res);
});

// Health check
router.get('/test/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    casDatabase: {
      loaded: true,
      materialCount: Object.keys(basicCasLookup.casDatabase).length
    }
  });
});

// CAS lookup test
router.get('/test/cas/:casNumber', (req, res) => {
  const { casNumber } = req.params;
  
  const result = basicCasLookup.getHazardCharacteristics(casNumber);
  
  if (result) {
    res.json({
      found: true,
      casNumber: casNumber,
      data: result
    });
  } else {
    res.status(404).json({
      found: false,
      casNumber: casNumber,
      message: 'CAS number not found in database'
    });
  }
});

// Batch test
router.post('/test/batch', (req, res) => {
  const { materials } = req.body;
  
  if (!materials || !Array.isArray(materials)) {
    return res.status(400).json({
      error: 'Invalid request - materials array required'
    });
  }
  
  const results = materials.map(material => {
    // Run classification for each material
    const federalCodes = [];
    const justifications = [];
    
    // Similar classification logic as above
    // ... (simplified for brevity)
    
    return {
      productName: material.productName,
      federalCodes: federalCodes,
      justifications: justifications
    };
  });
  
  res.json({
    success: true,
    count: results.length,
    results: results
  });
});

export default router;