/**
 * DetailedClassificationLogic.js
 * Detailed implementation of waste code evaluation logic
 * with comprehensive yes/no decision trees for each code
 */

export class DetailedClassificationLogic {

  /**
   * Enhanced physical state determination with additional indicators
   */
  static determinePhysicalStateEnhanced(sdsData) {
    const indicators = {
      liquid: {
        keywords: ['liquid', 'solution', 'slurry', 'suspension', 'emulsion'],
        properties: ['viscosity', 'surface tension', 'pour point'],
        physicalForm: /form\s*[:\-]\s*liquid/i,
        meltingPoint: null, // Will check against room temperature
        boilingPoint: null
      },
      solid: {
        keywords: ['solid', 'powder', 'granules', 'pellets', 'flakes', 'crystals', 'paste'],
        properties: ['bulk density', 'particle size', 'hardness'],
        physicalForm: /form\s*[:\-]\s*(powder|solid|granules|pellets)/i,
        meltingPoint: null,
        boilingPoint: null
      },
      gas: {
        keywords: ['gas', 'vapor', 'vapour', 'aerosol', 'compressed gas'],
        properties: ['vapor pressure', 'vapor density'],
        physicalForm: /form\s*[:\-]\s*(gas|vapor|aerosol)/i,
        meltingPoint: null,
        boilingPoint: null
      }
    };

    // Extract temperatures if available
    const meltingPoint = this.extractTemperature(sdsData, /melting\s*point/i);
    const boilingPoint = this.extractTemperature(sdsData, /boiling\s*point/i);
    const roomTemp = 20; // Celsius

    let scores = { liquid: 0, solid: 0, gas: 0 };
    const evidence = [];

    // Keyword matching
    for (const [state, config] of Object.entries(indicators)) {
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(sdsData.text || '')) {
          scores[state] += 0.3;
          evidence.push(`${state}: keyword "${keyword}" found`);
        }
      }
    }

    // Temperature-based determination
    if (meltingPoint !== null && boilingPoint !== null) {
      if (roomTemp < meltingPoint) {
        scores.solid += 0.8;
        evidence.push(`solid: room temperature (${roomTemp}°C) below melting point (${meltingPoint}°C)`);
      } else if (roomTemp > boilingPoint) {
        scores.gas += 0.8;
        evidence.push(`gas: room temperature (${roomTemp}°C) above boiling point (${boilingPoint}°C)`);
      } else {
        scores.liquid += 0.8;
        evidence.push(`liquid: room temperature (${roomTemp}°C) between melting (${meltingPoint}°C) and boiling (${boilingPoint}°C) points`);
      }
    }

    // Determine final state
    const maxScore = Math.max(...Object.values(scores));
    const state = Object.keys(scores).find(key => scores[key] === maxScore);
    const confidence = Math.min(maxScore, 1.0);

    return {
      state: maxScore > 0.2 ? state : 'unknown',
      confidence,
      evidence,
      scores
    };
  }

  /**
   * D001 Ignitability - Step by step evaluation
   */
  static evaluateD001(sdsData, materialState) {
    const evaluation = {
      code: 'D001',
      applies: false,
      reason: '',
      steps: [],
      confidence: 0
    };

    // Step 1: Check if material state allows D001
    evaluation.steps.push({
      question: 'Does material state allow D001 evaluation?',
      answer: materialState !== 'gas',
      reasoning: materialState === 'gas' ?
        'D001 does not typically apply to gases' :
        'D001 can apply to liquids and certain solids'
    });

    if (materialState === 'gas') {
      evaluation.reason = 'D001 does not apply to gases';
      return evaluation;
    }

    // Step 2: Extract flash point
    const flashPoint = this.extractFlashPoint(sdsData);
    evaluation.steps.push({
      question: 'Is flash point data available?',
      answer: flashPoint !== null,
      data: flashPoint !== null ? `Flash point: ${flashPoint}°C` : 'No flash point data found',
      reasoning: flashPoint !== null ?
        'Flash point data extracted from SDS' :
        'No flash point information in available data'
    });

    // Step 3: For liquids, check flash point threshold
    if (materialState === 'liquid') {
      evaluation.steps.push({
        question: 'Is material a liquid?',
        answer: true,
        reasoning: 'Material identified as liquid'
      });

      if (flashPoint !== null) {
        const exceeds = flashPoint <= 60;
        evaluation.steps.push({
          question: 'Does flash point ≤ 60°C (140°F)?',
          answer: exceeds,
          data: `Flash point: ${flashPoint}°C`,
          reasoning: exceeds ?
            `${flashPoint}°C is at or below 60°C threshold` :
            `${flashPoint}°C exceeds 60°C threshold`
        });

        if (exceeds) {
          evaluation.applies = true;
          evaluation.reason = `Liquid with flash point of ${flashPoint}°C (≤60°C)`;
          evaluation.confidence = 0.9;
          return evaluation;
        }
      }
    }

    // Step 4: For solids, check spontaneous ignition characteristics
    if (materialState === 'solid') {
      evaluation.steps.push({
        question: 'Is material a solid?',
        answer: true,
        reasoning: 'Material identified as solid'
      });

      const spontaneousIgnition = this.checkSpontaneousIgnition(sdsData);
      evaluation.steps.push({
        question: 'Does solid ignite spontaneously under normal conditions?',
        answer: spontaneousIgnition.found,
        data: spontaneousIgnition.evidence,
        reasoning: spontaneousIgnition.found ?
          'Evidence of spontaneous ignition found' :
          'No evidence of spontaneous ignition'
      });

      if (spontaneousIgnition.found) {
        evaluation.applies = true;
        evaluation.reason = `Solid capable of spontaneous ignition: ${spontaneousIgnition.evidence}`;
        evaluation.confidence = 0.8;
        return evaluation;
      }
    }

    // Step 5: Check for ignitable oxidizers
    const oxidizer = this.checkOxidizer(sdsData);
    evaluation.steps.push({
      question: 'Is material an ignitable oxidizer?',
      answer: oxidizer.found,
      data: oxidizer.evidence,
      reasoning: oxidizer.found ?
        'Material shows oxidizing characteristics' :
        'No oxidizing characteristics identified'
    });

    if (oxidizer.found) {
      evaluation.applies = true;
      evaluation.reason = `Ignitable oxidizer: ${oxidizer.evidence}`;
      evaluation.confidence = 0.7;
      return evaluation;
    }

    evaluation.reason = 'Material does not meet D001 ignitable criteria';
    evaluation.confidence = 0.8;
    return evaluation;
  }

  /**
   * D002 Corrosivity - Step by step evaluation
   */
  static evaluateD002(sdsData, materialState) {
    const evaluation = {
      code: 'D002',
      applies: false,
      reason: '',
      steps: [],
      confidence: 0
    };

    // Step 1: Check if material state allows D002
    evaluation.steps.push({
      question: 'Does material state allow D002 evaluation?',
      answer: materialState !== 'gas',
      reasoning: materialState === 'gas' ?
        'D002 primarily applies to aqueous solutions and liquids' :
        'D002 can apply to liquids and aqueous solutions'
    });

    if (materialState === 'gas') {
      evaluation.reason = 'D002 does not apply to gases';
      return evaluation;
    }

    // Step 2: Extract pH data
    const ph = this.extractPH(sdsData);
    evaluation.steps.push({
      question: 'Is pH data available?',
      answer: ph !== null,
      data: ph !== null ? `pH: ${ph}` : 'No pH data found',
      reasoning: ph !== null ?
        'pH value extracted from SDS' :
        'No pH information in available data'
    });

    // Step 3: Check pH thresholds
    if (ph !== null) {
      const isAcidic = ph <= 2.0;
      const isBasic = ph >= 12.5;

      evaluation.steps.push({
        question: 'Is pH ≤ 2.0?',
        answer: isAcidic,
        data: `pH: ${ph}`,
        reasoning: isAcidic ?
          `pH ${ph} is at or below 2.0 (highly acidic)` :
          `pH ${ph} is above 2.0`
      });

      evaluation.steps.push({
        question: 'Is pH ≥ 12.5?',
        answer: isBasic,
        data: `pH: ${ph}`,
        reasoning: isBasic ?
          `pH ${ph} is at or above 12.5 (highly basic)` :
          `pH ${ph} is below 12.5`
      });

      if (isAcidic || isBasic) {
        evaluation.applies = true;
        evaluation.reason = `pH of ${ph} ${isAcidic ? '(≤2.0)' : '(≥12.5)'}`;
        evaluation.confidence = 0.9;
        return evaluation;
      }
    }

    // Step 4: Check for steel corrosion rate
    const corrosionRate = this.extractCorrosionRate(sdsData);
    evaluation.steps.push({
      question: 'Does material corrode steel at rate > 6.35mm/year at 55°C?',
      answer: corrosionRate.exceeds,
      data: corrosionRate.data,
      reasoning: corrosionRate.exceeds ?
        'Steel corrosion rate exceeds 6.35mm/year threshold' :
        'No evidence of excessive steel corrosion'
    });

    if (corrosionRate.exceeds) {
      evaluation.applies = true;
      evaluation.reason = `Steel corrosion rate exceeds threshold: ${corrosionRate.data}`;
      evaluation.confidence = 0.8;
      return evaluation;
    }

    evaluation.reason = 'Material does not meet D002 corrosivity criteria';
    evaluation.confidence = 0.8;
    return evaluation;
  }

  /**
   * D003 Reactivity - Step by step evaluation
   */
  static evaluateD003(sdsData, materialState) {
    const evaluation = {
      code: 'D003',
      applies: false,
      reason: '',
      steps: [],
      confidence: 0
    };

    // Step 1: Check for unstable reactions
    const unstable = this.checkUnstableReactions(sdsData);
    evaluation.steps.push({
      question: 'Is material unstable and readily undergoes violent change?',
      answer: unstable.found,
      data: unstable.evidence,
      reasoning: unstable.found ?
        'Evidence of instability found' :
        'No evidence of instability'
    });

    // Step 2: Check water reactivity
    const waterReactive = this.checkWaterReactivity(sdsData);
    evaluation.steps.push({
      question: 'Does material react violently with water?',
      answer: waterReactive.found,
      data: waterReactive.evidence,
      reasoning: waterReactive.found ?
        'Evidence of violent water reaction' :
        'No evidence of violent water reaction'
    });

    // Step 3: Check cyanide/sulfide gas generation
    const toxicGas = this.checkToxicGasGeneration(sdsData);
    evaluation.steps.push({
      question: 'Does material generate toxic gases with acids?',
      answer: toxicGas.found,
      data: toxicGas.evidence,
      reasoning: toxicGas.found ?
        'Material can generate toxic gases' :
        'No evidence of toxic gas generation'
    });

    // Step 4: Check explosive capability
    const explosive = this.checkExplosiveCapability(sdsData);
    evaluation.steps.push({
      question: 'Is material capable of detonation or explosive reaction?',
      answer: explosive.found,
      data: explosive.evidence,
      reasoning: explosive.found ?
        'Material shows explosive characteristics' :
        'No explosive characteristics identified'
    });

    // Step 5: Check forbidden explosive/water reactive substances
    const forbidden = this.checkForbiddenSubstances(sdsData);
    evaluation.steps.push({
      question: 'Contains forbidden explosive or water-reactive substances?',
      answer: forbidden.found,
      data: forbidden.evidence,
      reasoning: forbidden.found ?
        'Contains regulated reactive substances' :
        'No regulated reactive substances identified'
    });

    if (unstable.found || waterReactive.found || toxicGas.found || explosive.found || forbidden.found) {
      evaluation.applies = true;
      const reasons = [
        unstable.found ? 'unstable' : null,
        waterReactive.found ? 'water-reactive' : null,
        toxicGas.found ? 'generates toxic gases' : null,
        explosive.found ? 'explosive' : null,
        forbidden.found ? 'contains forbidden substances' : null
      ].filter(Boolean);

      evaluation.reason = `Material exhibits reactive characteristics: ${reasons.join(', ')}`;
      evaluation.confidence = 0.8;
      return evaluation;
    }

    evaluation.reason = 'Material does not meet D003 reactivity criteria';
    evaluation.confidence = 0.8;
    return evaluation;
  }

  // Utility methods for data extraction and checking

  static extractTemperature(sdsData, pattern) {
    const text = sdsData.text || '';
    const match = text.match(new RegExp(pattern.source + '\\s*[:\-]?\\s*([\\d\\.\\-]+)\\s*°?[CF]?', 'i'));
    if (match) {
      const temp = parseFloat(match[1]);
      // Convert Fahrenheit to Celsius if needed
      if (text.includes('°F') || text.includes('fahrenheit')) {
        return (temp - 32) * 5 / 9;
      }
      return temp;
    }
    return null;
  }

  static extractFlashPoint(sdsData) {
    return this.extractTemperature(sdsData, /flash\s*point/i);
  }

  static extractPH(sdsData) {
    const text = sdsData.text || '';
    const match = text.match(/ph\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i);
    return match ? parseFloat(match[1]) : null;
  }

  static extractCorrosionRate(sdsData) {
    const text = sdsData.text || '';
    const match = text.match(/steel\s*corrosion.*?([0-9]+\.?[0-9]*)\s*mm\/year/i);
    if (match) {
      const rate = parseFloat(match[1]);
      return {
        exceeds: rate > 6.35,
        data: `${rate} mm/year`,
        found: true
      };
    }
    return { exceeds: false, data: 'No steel corrosion data', found: false };
  }

  static checkSpontaneousIgnition(sdsData) {
    const keywords = [
      'spontaneous ignition',
      'spontaneous combustion',
      'pyrophoric',
      'ignites spontaneously',
      'self-heating'
    ];

    const text = (sdsData.text || '').toLowerCase();
    const evidence = [];

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        evidence.push(keyword);
      }
    }

    return { found: evidence.length > 0, evidence: evidence.join(', ') };
  }

  static checkOxidizer(sdsData) {
    const keywords = [
      'oxidizer',
      'oxidising',
      'oxidizing',
      'oxygen-releasing',
      'supports combustion'
    ];

    const text = (sdsData.text || '').toLowerCase();
    const evidence = [];

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        evidence.push(keyword);
      }
    }

    return { found: evidence.length > 0, evidence: evidence.join(', ') };
  }

  static checkUnstableReactions(sdsData) {
    const keywords = [
      'unstable',
      'violent change',
      'readily polymerizes',
      'decomposes violently',
      'thermally unstable'
    ];

    return this.checkKeywords(sdsData, keywords);
  }

  static checkWaterReactivity(sdsData) {
    const keywords = [
      'water reactive',
      'reacts violently with water',
      'generates gas with water',
      'dangerous with water'
    ];

    return this.checkKeywords(sdsData, keywords);
  }

  static checkToxicGasGeneration(sdsData) {
    const keywords = [
      'generates hydrogen cyanide',
      'generates hydrogen sulfide',
      'toxic gas with acid',
      'releases toxic vapors'
    ];

    return this.checkKeywords(sdsData, keywords);
  }

  static checkExplosiveCapability(sdsData) {
    const keywords = [
      'explosive',
      'detonation',
      'explosive reaction',
      'shock sensitive'
    ];

    return this.checkKeywords(sdsData, keywords);
  }

  static checkForbiddenSubstances(sdsData) {
    const forbiddenSubstances = [
      'ammonium picrate',
      'black powder',
      'class a explosives',
      'class b explosives'
    ];

    return this.checkKeywords(sdsData, forbiddenSubstances);
  }

  static checkKeywords(sdsData, keywords) {
    const text = (sdsData.text || '').toLowerCase();
    const evidence = [];

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        evidence.push(keyword);
      }
    }

    return { found: evidence.length > 0, evidence: evidence.join(', ') };
  }
}

export default DetailedClassificationLogic;