// PhysicalStateClassifier.js
// v0.2 — D001/D002/D003 with state-dependent rules + confidence & reasoning
// Exported API:
//   classifyCharacteristicHazards({ text, composition, dot, overrides }) ->
//      { characteristicCodes: [...], physicalState, reasoning: [...], confidence }

import { detectPhysicalState } from './PhysicalStateDetector_COMPLETED_.js';

// --- Regex helpers (robust to units/phrasing) ---
const C_NUM = '[-+]?\\d*\\.?\\d+';
const DEG = '[°\\s]*';
const FP_PATTS = [
  new RegExp(`\\bflash\\s*point\\s*[:=]\\s*(${C_NUM})\\s*${DEG}C\\b`, 'i'),
  new RegExp(`\\bflash\\s*point\\s*[:=]\\s*(${C_NUM})\\s*${DEG}F\\b`, 'i'),
  // variants like "FP (CC): 14 °C"
  new RegExp(`\\bFP\\b[^\\d]*(${C_NUM})\\s*${DEG}C\\b`, 'i'),
  new RegExp(`\\bFP\\b[^\\d]*(${C_NUM})\\s*${DEG}F\\b`, 'i'),
];

const PH_PATTS = [
  /\bpH\s*[:=]\s*([><]?\s*[-+]?\d*\.?\d+)\b/i,
  /\bpH\s*(?:\(.*?\))?\s*[:=]?\s*~?\s*([0-9]{1,2}(?:\.[0-9])?)\b/i,
];

const DOT_CLASS_PATT = /\bhazard\s*class\s*[:=]\s*([0-9](?:\.[0-9])?)/i;
const UN_PATT = /\bUN\s*0*(\d{3,4})\b/i;

// GHS Hazard statements (H2xx series for physical hazards)
const H_PATT = /\bH(1\d{2}|2\d{2}|3\d{2})\b/g; // capture H200-series (and neighbors)

// --- Unit conversions ---
function fToC(f) {
  return (f - 32) * (5 / 9);
}

// --- Extractors ---
function extractFlashPointC(text) {
  if (!text || typeof text !== 'string') return null;
  for (const rx of FP_PATTS) {
    const m = text.match(rx);
    if (m) {
      const val = parseFloat(m[1]);
      if (!isNaN(val)) {
        if (/F\b/i.test(m[0])) return { valueC: fToC(val), evidence: m[0] };
        return { valueC: val, evidence: m[0] };
      }
    }
  }
  return null;
}

function extractPH(text) {
  if (!text || typeof text !== 'string') return null;
  for (const rx of PH_PATTS) {
    const m = text.match(rx);
    if (m) {
      // strip any > or < qualifiers but keep note in evidence
      const raw = m[1].replace(/[<>~\s]/g, '');
      const val = parseFloat(raw);
      if (!isNaN(val)) {
        return { value: val, evidence: m[0] };
      }
    }
  }
  return null;
}

function extractDotHazClass(text, dot) {
  // Prefer parsed DOT payload if provided
  if (dot && dot.hazardClass) {
    return { value: String(dot.hazardClass), evidence: `DOT.hazardClass=${dot.hazardClass}` };
  }
  if (!text || typeof text !== 'string') return null;
  const m = text.match(DOT_CLASS_PATT);
  if (m) return { value: m[1], evidence: m[0] };
  return null;
}

function extractUN(text, dot) {
  if (dot && dot.unNumber) return { value: String(dot.unNumber).padStart(4, '0'), evidence: `DOT.UN=${dot.unNumber}` };
  if (!text || typeof text !== 'string') return null;
  const m = text.match(UN_PATT);
  if (m) return { value: m[1].padStart(4, '0'), evidence: m[0] };
  return null;
}

function extractHazardStatements(text) {
  if (!text || typeof text !== 'string') return [];
  const set = new Set();
  let m;
  while ((m = H_PATT.exec(text)) !== null) {
    set.add(`H${m[1]}`);
  }
  return Array.from(set);
}

// --- Rule evaluation helpers ---
function add(reasoning, msg) {
  reasoning.push(msg);
}

function combineConfidence(...nums) {
  // Conservative blend: mean * penalty for uncertainty count
  const vals = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!vals.length) return 0.2;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.max(0, Math.min(1, mean));
}

// --- D001 logic ---
function evalD001({ state, text, reasoning }) {
  const hazards = extractHazardStatements(text);
  const fp = extractFlashPointC(text);
  const dotClass = extractDotHazClass(text);
  let hit = false;
  let conf = 0.0;

  if (state === 'liquid') {
    if (fp && fp.valueC < 60) {
      hit = true;
      conf = 0.9;
      add(reasoning, `D001: Liquid with flash point ${fp.valueC.toFixed(1)} °C (< 60 °C). Evidence: ${fp.evidence}`);
    } else if (hazards.includes('H224') || hazards.includes('H225') || hazards.includes('H226')) {
      hit = true;
      conf = 0.7;
      add(reasoning, `D001: Liquid with flammability statements (${hazards.filter(h=>/^H22[4-6]$/.test(h)).join(', ')}).`);
    } else if (dotClass && dotClass.value === '3') { // Flammable liquid
      hit = true;
      conf = 0.7;
      add(reasoning, `D001: DOT Hazard Class 3 (flammable liquid). Evidence: ${dotClass.evidence}`);
    }
  } else if (state === 'solid') {
    // self-heating/pyrophoric indicators
    const solidFlags = [
      /spontaneously\s*combustible/i,
      /self-?heating/i,
      /pyrophoric/i,
      /ignites?\s*(?:on|in)\s*contact\s*with\s*air/i,
    ];
    if (solidFlags.some((rx) => rx.test(text)) || hazards.includes('H250') || hazards.includes('H251') || hazards.includes('H252')) {
      hit = true;
      conf = 0.75;
      add(reasoning, `D001: Solid that ignites spontaneously/self-heats (e.g., H250/H251/H252 or equivalent phrasing).`);
    } else if (dotClass && dotClass.value === '4.1') {
      // Class 4.1 (flammable solids) – strong cue
      hit = true;
      conf = 0.65;
      add(reasoning, `D001: DOT Hazard Class 4.1 (flammable solid). Evidence: ${dotClass.evidence}`);
    }
  } else if (state === 'gas') {
    if ((dotClass && /^2\.1$/.test(dotClass.value)) || hazards.includes('H220') || hazards.includes('H221')) {
      hit = true;
      conf = 0.75;
      add(reasoning, `D001: Flammable gas (DOT 2.1 or H220/H221). ${dotClass ? `Evidence: ${dotClass.evidence}` : ''}`);
    }
  }

  // Oxidizers (DOT 5.1 / H271/H272) are considered ignitable by RCRA definition context
  if (!hit) {
    if ((dotClass && /^5\.1$/.test(dotClass.value)) || hazards.includes('H271') || hazards.includes('H272')) {
      hit = true;
      conf = Math.max(conf, 0.6);
      add(reasoning, `D001: Strong oxidizer (DOT 5.1 or H271/H272) → ignitability under RCRA.`);
    }
  }

  return { hit, confidence: conf };
}

// --- D002 logic (liquids only) ---
function evalD002({ state, text, reasoning }) {
  if (state !== 'liquid') {
    // Explicit non-liquid rejection; caller can choose to prompt user upstream if needed
    const pH = extractPH(text);
    if (pH) {
      add(reasoning, `D002 not applied: pH reported (${pH.value}) but material not detected as liquid.`);
    } else {
      add(reasoning, `D002 not applied: material not detected as liquid.`);
    }
    return { hit: false, confidence: 0.3 };
  }

  const pH = extractPH(text);
  if (pH && (pH.value <= 2 || pH.value >= 12.5)) {
    add(reasoning, `D002: Liquid with pH ${pH.value} (≤2 or ≥12.5). Evidence: ${pH.evidence}`);
    return { hit: true, confidence: 0.9 };
  }

  // steel corrosion cue
  const steel = text.match(/\b(corrosi(?:on|ve)\s*rate|steel\s*corrosi(?:on|ve)\s*rate)[^.\n]*?(\d+(\.\d+)?)\s*mm\/y/i);
  if (steel) {
    const rate = parseFloat(steel[2]);
    if (!isNaN(rate) && rate > 6.35) {
      add(reasoning, `D002: Steel corrosion rate ${rate} mm/yr (> 6.35 mm/yr). Evidence: ${steel[0]}`);
      return { hit: true, confidence: 0.85 };
    }
  }

  return { hit: false, confidence: 0.4 };
}

// --- D003 logic (all states) ---
function evalD003({ text, reasoning }) {
  const hazards = extractHazardStatements(text);
  let hit = false;
  let conf = 0.0;

  // Water-reactive
  if (/reacts\s*violently\s*with\s*water/i.test(text) || hazards.includes('H260') || hazards.includes('H261')) {
    hit = true;
    conf = Math.max(conf, 0.75);
    add(reasoning, `D003: Water-reactive (e.g., H260/H261 or explicit phrasing).`);
  }

  // Unstable/explosive
  if (/may\s*explode|explosive\s*(?:unstable)?/i.test(text) || hazards.some((h) => /^H20[0-3]$/.test(h))) {
    hit = true;
    conf = Math.max(conf, 0.75);
    add(reasoning, `D003: Unstable/explosive indications (H200–H203 or equivalent text).`);
  }

  // Organic peroxides / self-accelerating decomposition
  if (hazards.includes('H240') || hazards.includes('H242') || /organic\s*peroxide/i.test(text)) {
    hit = true;
    conf = Math.max(conf, 0.7);
    add(reasoning, `D003: Organic peroxide / violent decomposition risk (H240/H242).`);
  }

  // Forms toxic gases with acids/water (e.g., cyanides, sulfides) — heuristic phrase search
  if (/in\s*contact\s*with\s*(?:acids?|water)\s*releases?\s*(?:toxic|poisonous)\s*gases?/i.test(text)) {
    hit = true;
    conf = Math.max(conf, 0.7);
    add(reasoning, `D003: Forms toxic gases in contact with acids/water (explicit SDS phrasing).`);
  }

  return { hit, confidence: conf || 0.45 };
}

// --- Main API ---
function classifyCharacteristicHazards({ text, composition = [], dot = null, overrides = {} } = {}) {
  const reasoning = [];
  const det = detectPhysicalState({ text });
  add(reasoning, `Physical state detected: ${det.state} (confidence ${det.confidence.toFixed(2)}). Evidence: ${det.evidence.join(' | ') || 'n/a'}`);

  const state = overrides.physicalState || det.state;

  // Evaluate characteristics
  const d001 = evalD001({ state, text, reasoning });
  const d002 = evalD002({ state, text, reasoning });
  const d003 = evalD003({ text, reasoning });

  const codes = [];
  if (d001.hit) codes.push('D001');
  if (d002.hit) codes.push('D002');
  if (d003.hit) codes.push('D003');

  // Overall confidence blends detector + strongest characteristic hit
  const overallConf = combineConfidence(
    det.confidence,
    d001.hit ? d001.confidence : 0.5,
    d002.hit ? d002.confidence : 0.5,
    d003.hit ? d003.confidence : 0.5
  );

  return {
    characteristicCodes: codes,
    physicalState: state,
    reasoning,
    confidence: Number(overallConf.toFixed(2)),
    debug: {
      detector: det,
      flags: { d001, d002, d003 },
      dotUsed: extractUN(text, dot) || null,
      ghs: extractHazardStatements(text),
    },
  };
}

export {
  classifyCharacteristicHazards,
  // export internals for unit tests if needed
  extractFlashPointC,
  extractPH,
  extractDotHazClass,
  extractUN,
  extractHazardStatements,
};
