class PhysicalStateDetector {
  constructor() {
    this.liquidIndicators = [
      'liquid', 'solution', 'fluid', 'oil', 'solvent', 'aqueous',
      'emulsion', 'suspension', 'mixture', 'concentrate', 'syrup'
    ];
    
    this.solidIndicators = [
      'solid', 'powder', 'crystal', 'granule', 'pellet', 'flake',
      'dust', 'cake', 'tablet', 'pill', 'chunk', 'block', 'bar'
    ];
    
    this.gasIndicators = [
      'gas', 'vapor', 'vapour', 'fume', 'aerosol', 'mist',
      'compressed', 'liquefied gas', 'gaseous'
    ];
    
    this.semiSolidIndicators = [
      'paste', 'gel', 'cream', 'ointment', 'grease', 'wax',
      'slurry', 'sludge', 'semi-solid'
    ];
  }

  detect(input) {
    if (!input) {
      return {
        state: 'unknown',
        isLiquid: false,
        isSolid: false,
        isGas: false,
        isSemiSolid: false,
        confidence: 0
      };
    }
    
    const text = typeof input === 'string' ? input.toLowerCase() : 
                 (input.physicalState && typeof input.physicalState === 'string') ? input.physicalState.toLowerCase() :
                 (input.state && typeof input.state === 'string') ? input.state.toLowerCase() : 
                 (input.form && typeof input.form === 'string') ? input.form.toLowerCase() : 'unknown';
    
    const scores = {
      liquid: 0,
      solid: 0,
      gas: 0,
      semiSolid: 0
    };
    
    for (const indicator of this.liquidIndicators) {
      if (text.includes(indicator)) {
        scores.liquid += 10;
      }
    }
    
    for (const indicator of this.solidIndicators) {
      if (text.includes(indicator)) {
        scores.solid += 10;
      }
    }
    
    for (const indicator of this.gasIndicators) {
      if (text.includes(indicator)) {
        scores.gas += 10;
      }
    }
    
    for (const indicator of this.semiSolidIndicators) {
      if (text.includes(indicator)) {
        scores.semiSolid += 10;
      }
    }
    
    if (text.includes('viscous') || text.includes('thick')) {
      scores.liquid += 5;
      scores.semiSolid += 3;
    }
    
    if (text.includes('clear') || text.includes('transparent')) {
      scores.liquid += 3;
    }
    
    if (text.includes('white') || text.includes('colored') || text.includes('colour')) {
      if (!text.includes('liquid')) {
        scores.solid += 2;
      }
    }
    
    let detectedState = 'unknown';
    let maxScore = 0;
    
    for (const [state, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedState = state;
      }
    }
    
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? (maxScore / totalScore) * 100 : 0;
    
    return {
      state: detectedState,
      isLiquid: detectedState === 'liquid',
      isSolid: detectedState === 'solid',
      isGas: detectedState === 'gas',
      isSemiSolid: detectedState === 'semiSolid',
      confidence: confidence,
      scores: scores,
      originalText: text
    };
  }

  classifyForShipping(physicalState, flashPoint = null, viscosity = null) {
    const result = {
      shippingCategory: '',
      packagingRequirements: [],
      specialProvisions: []
    };
    
    const state = typeof physicalState === 'string' ? 
                  this.detect(physicalState) : physicalState;
    
    if (state.isLiquid) {
      result.shippingCategory = 'Liquid';
      result.packagingRequirements.push('Liquid-tight container required');
      result.packagingRequirements.push('Secondary containment recommended');
      
      if (flashPoint && parseFloat(flashPoint) < 60) {
        result.shippingCategory = 'Flammable Liquid';
        result.packagingRequirements.push('UN-approved container required');
        result.specialProvisions.push('Keep away from heat sources');
      }
      
      if (viscosity && parseFloat(viscosity) > 1000) {
        result.packagingRequirements.push('Wide-mouth container recommended');
      }
    } else if (state.isSolid) {
      result.shippingCategory = 'Solid';
      result.packagingRequirements.push('Solid-compatible container');
      result.packagingRequirements.push('Dust-tight seal required');
      
      if (state.originalText && state.originalText.includes('powder')) {
        result.specialProvisions.push('Anti-static precautions may be required');
        result.packagingRequirements.push('Avoid glass containers');
      }
    } else if (state.isGas) {
      result.shippingCategory = 'Gas';
      result.packagingRequirements.push('Pressure vessel required');
      result.packagingRequirements.push('DOT-approved cylinder');
      result.specialProvisions.push('Valve protection required');
      result.specialProvisions.push('Upright storage and transport');
    } else if (state.isSemiSolid) {
      result.shippingCategory = 'Semi-solid';
      result.packagingRequirements.push('Wide-mouth container required');
      result.packagingRequirements.push('May require inner liner');
    }
    
    return result;
  }

  determineContainerType(physicalState, volume = null) {
    const state = typeof physicalState === 'string' ? 
                  this.detect(physicalState) : physicalState;
    
    const recommendations = [];
    
    if (state.isLiquid) {
      if (volume && parseFloat(volume) <= 4) {
        recommendations.push({
          type: 'Glass Bottle',
          material: 'Borosilicate Glass',
          sizes: ['1L', '2.5L', '4L']
        });
        recommendations.push({
          type: 'Poly Bottle',
          material: 'HDPE',
          sizes: ['1L', '2.5L', '4L']
        });
      } else {
        recommendations.push({
          type: 'Poly Drum',
          material: 'HDPE',
          sizes: ['5 gal', '30 gal', '55 gal']
        });
        recommendations.push({
          type: 'Steel Drum',
          material: 'Carbon Steel with Epoxy Lining',
          sizes: ['5 gal', '30 gal', '55 gal']
        });
      }
    } else if (state.isSolid) {
      recommendations.push({
        type: 'Fiber Drum',
        material: 'Fiber with Poly Liner',
        sizes: ['5 gal', '10 gal', '30 gal', '55 gal']
      });
      recommendations.push({
        type: 'Poly Drum',
        material: 'HDPE',
        sizes: ['5 gal', '30 gal', '55 gal']
      });
      
      if (state.originalText && state.originalText.includes('powder')) {
        recommendations.push({
          type: 'Anti-static Drum',
          material: 'Conductive HDPE',
          sizes: ['5 gal', '30 gal', '55 gal']
        });
      }
    } else if (state.isGas) {
      recommendations.push({
        type: 'Gas Cylinder',
        material: 'Steel or Aluminum',
        sizes: ['Lecture Bottle', 'Size B', 'Size K']
      });
    } else if (state.isSemiSolid) {
      recommendations.push({
        type: 'Wide-mouth Poly Jar',
        material: 'HDPE',
        sizes: ['1 gal', '5 gal']
      });
      recommendations.push({
        type: 'Pail',
        material: 'HDPE or Steel',
        sizes: ['1 gal', '5 gal', '7 gal']
      });
    }
    
    return recommendations;
  }
}

export { PhysicalStateDetector };
export default PhysicalStateDetector;