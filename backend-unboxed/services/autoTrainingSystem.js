// Automated SDS Training System
// Gathers SDSs from various sources, runs classification, and builds training data

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import AITrainingSystem from './aiTrainingSystem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoTrainingSystem {
  constructor() {
    this.trainingSystem = new AITrainingSystem();
    this.testDataPath = path.join(__dirname, '../test_data');
    this.resultsPath = path.join(this.testDataPath, 'auto_training_results.json');
    
    this.ensureDirectories();
    this.loadKnownCorrectClassifications();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.testDataPath)) {
      fs.mkdirSync(this.testDataPath, { recursive: true });
    }
  }

  // Known correct classifications for comprehensive chemical list
  loadKnownCorrectClassifications() {
    this.knownClassifications = {
      // FLAMMABLE LIQUIDS (D001)
      'acetone': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1090',
        reasoning: 'Flash point -18°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'methanol': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1230',
        reasoning: 'Flash point 11°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'ethanol': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1170',
        reasoning: 'Flash point 13°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'isopropyl alcohol': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1219',
        reasoning: 'Flash point 12°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'toluene': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1294',
        reasoning: 'Flash point 4°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'xylene': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1307',
        reasoning: 'Flash point 27°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'diesel fuel': {
        federal: ['D001'],
        texas_form_code: '202',
        dot_un: 'UN1202',
        reasoning: 'Flash point 52°C < 60°C = D001. Petroleum product = form code 202.'
      },
      'gasoline': {
        federal: ['D001'],
        texas_form_code: '202',
        dot_un: 'UN1203',
        reasoning: 'Flash point -43°C < 60°C = D001. Petroleum product = form code 202.'
      },
      'paint thinner': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1263',
        reasoning: 'Flash point 38°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'mek': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1193',
        reasoning: 'Flash point -9°C < 60°C = D001. Organic solvent = form code 203.'
      },

      // CORROSIVE MATERIALS (D002)
      'muriatic acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN1789',
        reasoning: 'pH < 1 = D002 corrosive. Acid waste = form code 105.'
      },
      'sodium hydroxide': {
        federal: ['D002'],
        texas_form_code: '106',
        dot_un: 'UN1823',
        reasoning: 'pH > 12.5 = D002 corrosive. Alkaline waste = form code 106.'
      },
      'sulfuric acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN1830',
        reasoning: 'pH < 2 = D002 corrosive. Acid waste = form code 105.'
      },
      'nitric acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN2031',
        reasoning: 'pH < 2 = D002 corrosive. Acid waste = form code 105.'
      },
      'phosphoric acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN1805',
        reasoning: 'pH 1.5 = D002 corrosive. Acid waste = form code 105.'
      },
      'acetic acid': {
        federal: ['D001', 'D002'],
        texas_form_code: '105',
        dot_un: 'UN2789',
        reasoning: 'Flash point 39°C = D001, pH 2.4 = D002. Acid waste = form code 105.'
      },
      'potassium hydroxide': {
        federal: ['D002'],
        texas_form_code: '106',
        dot_un: 'UN1814',
        reasoning: 'pH > 12.5 = D002 corrosive. Alkaline waste = form code 106.'
      },
      'ammonia solution': {
        federal: ['D002'],
        texas_form_code: '106',
        dot_un: 'UN2672',
        reasoning: 'pH 11.6 approaches D002 threshold. Alkaline waste = form code 106.'
      },
      'sodium hypochlorite': {
        federal: ['D002'],
        texas_form_code: '106',
        dot_un: 'UN1791',
        reasoning: 'pH 12.5 = D002 corrosive. Alkaline waste = form code 106.'
      },
      'formic acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN1779',
        reasoning: 'pH 1.8 = D002 corrosive. Acid waste = form code 105.'
      },

      // TOXIC MATERIALS (D004-D011, etc.)
      'lead paint': {
        federal: ['D008'],
        texas_form_code: '703',
        dot_un: 'UN3082',
        reasoning: 'Contains lead = D008. Paint waste = form code 703.'
      },
      'mercury': {
        federal: ['D009'],
        texas_form_code: '601',
        dot_un: 'UN2809',
        reasoning: 'Mercury = D009. Heavy metal waste = form code 601.'
      },
      'cadmium pigment': {
        federal: ['D006'],
        texas_form_code: '601',
        dot_un: 'UN2570',
        reasoning: 'Contains cadmium = D006. Heavy metal waste = form code 601.'
      },
      'chromic acid': {
        federal: ['D002', 'D007'],
        texas_form_code: '105',
        dot_un: 'UN1755',
        reasoning: 'pH 1.0 = D002, contains chromium = D007. Acid waste = form code 105.'
      },
      'benzene': {
        federal: ['D001', 'U019'],
        texas_form_code: '203',
        dot_un: 'UN1114',
        reasoning: 'Flash point -11°C = D001, listed waste U019. Organic solvent = form code 203.'
      },

      // NON-HAZARDOUS MATERIALS
      'motor oil': {
        federal: [],
        texas_form_code: '302',
        dot_un: 'Non-regulated',
        reasoning: 'Used petroleum product, flash point > 60°C = form code 302.'
      },
      'latex paint': {
        federal: [],
        texas_form_code: '101',
        dot_un: 'Non-regulated',
        reasoning: 'Water-based paint, non-hazardous = form code 101.'
      },
      'vegetable oil': {
        federal: [],
        texas_form_code: '101',
        dot_un: 'Non-regulated',
        reasoning: 'Food-grade oil, non-hazardous = form code 101.'
      },
      'detergent': {
        federal: [],
        texas_form_code: '102',
        dot_un: 'Non-regulated',
        reasoning: 'Aqueous cleaning solution, non-hazardous = form code 102.'
      },
      'antifreeze': {
        federal: [],
        texas_form_code: '203',
        dot_un: 'Non-regulated',
        reasoning: 'Ethylene glycol, flash point > 60°C but toxic properties = form code 203.'
      },

      // ADDITIONAL FLAMMABLE MATERIALS
      'butanol': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1120',
        reasoning: 'Flash point 37°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'hexane': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1208',
        reasoning: 'Flash point -22°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'cyclohexane': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1145',
        reasoning: 'Flash point -20°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'pentane': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1265',
        reasoning: 'Flash point -40°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'ethyl acetate': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1173',
        reasoning: 'Flash point -4°C < 60°C = D001. Organic solvent = form code 203.'
      },

      // ADDITIONAL CORROSIVE MATERIALS
      'hydrofluoric acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN1790',
        reasoning: 'pH < 1 = D002 corrosive. Acid waste = form code 105.'
      },
      'battery acid': {
        federal: ['D002'],
        texas_form_code: '105',
        dot_un: 'UN2796',
        reasoning: 'pH < 1 = D002 corrosive. Acid waste = form code 105.'
      },
      'calcium hydroxide': {
        federal: ['D002'],
        texas_form_code: '106',
        dot_un: 'Non-regulated',
        reasoning: 'pH 12.8 = D002 corrosive. Alkaline waste = form code 106.'
      },

      // ADDITIONAL TOXIC MATERIALS  
      'arsenic compound': {
        federal: ['D004'],
        texas_form_code: '601',
        dot_un: 'UN1561',
        reasoning: 'Contains arsenic = D004. Heavy metal waste = form code 601.'
      },
      'selenium compound': {
        federal: ['D010'],
        texas_form_code: '601',
        dot_un: 'UN3283',
        reasoning: 'Contains selenium = D010. Heavy metal waste = form code 601.'
      },
      'silver compounds': {
        federal: ['D011'],
        texas_form_code: '601',
        dot_un: 'UN1493',
        reasoning: 'Contains silver = D011. Heavy metal waste = form code 601.'
      },

      // REACTIVE MATERIALS (D003)
      'sodium metal': {
        federal: ['D003'],
        texas_form_code: '401',
        dot_un: 'UN1428',
        reasoning: 'Water-reactive = D003. Reactive solid = form code 401.'
      },
      'potassium metal': {
        federal: ['D003'],
        texas_form_code: '401',
        dot_un: 'UN2257',
        reasoning: 'Water-reactive = D003. Reactive solid = form code 401.'
      },
      'calcium carbide': {
        federal: ['D003'],
        texas_form_code: '401',
        dot_un: 'UN1402',
        reasoning: 'Water-reactive = D003. Reactive solid = form code 401.'
      },

      // ADDITIONAL NON-HAZARDOUS MATERIALS
      'glycerin': {
        federal: [],
        texas_form_code: '101',
        dot_un: 'Non-regulated',
        reasoning: 'Non-hazardous liquid = form code 101.'
      },
      'mineral oil': {
        federal: [],
        texas_form_code: '302',
        dot_un: 'Non-regulated',
        reasoning: 'Petroleum product, flash point > 60°C = form code 302.'
      },
      'soap solution': {
        federal: [],
        texas_form_code: '102',
        dot_un: 'Non-regulated',
        reasoning: 'Aqueous solution, non-hazardous = form code 102.'
      },

      // ADDITIONAL MIXED HAZARD MATERIALS
      'turpentine': {
        federal: ['D001'],
        texas_form_code: '203',
        dot_un: 'UN1299',
        reasoning: 'Flash point 35°C < 60°C = D001. Organic solvent = form code 203.'
      },
      'formaldehyde': {
        federal: [],
        texas_form_code: '006',
        dot_un: 'UN2209',
        reasoning: 'Carcinogenic chemical, should be lab packed as toxic material = form code 006 (Lab Pack: Toxic Materials).'
      },
      'epoxy resin': {
        federal: [],
        texas_form_code: '401',
        dot_un: 'Non-regulated',
        reasoning: 'Organic solid material (cured polymer) = form code 401 (Organic Solids).'
      },
      'hydraulic fluid': {
        federal: [],
        texas_form_code: '302',
        dot_un: 'Non-regulated',
        reasoning: 'Petroleum-based fluid, flash point > 60°C = form code 302.'
      },
      'phenol': {
        federal: [],
        texas_form_code: '203',
        dot_un: 'UN1671',
        reasoning: 'Toxic organic compound = form code 203.'
      },
      'aniline': {
        federal: [],
        texas_form_code: '203',
        dot_un: 'UN1547',
        reasoning: 'Toxic organic compound = form code 203.'
      },
      'chloroform': {
        federal: ['U044'],
        texas_form_code: '203',
        dot_un: 'UN1888',
        reasoning: 'Listed waste U044. Halogenated solvent = form code 203.'
      },
      'carbon tetrachloride': {
        federal: ['U211'],
        texas_form_code: '203',
        dot_un: 'UN1846',
        reasoning: 'Listed waste U211. Halogenated solvent = form code 203.'
      },
      'fluorescent tubes': {
        federal: ['D009'],
        texas_form_code: '108',
        dot_un: 'UN3506',
        reasoning: 'Contains mercury = D009. Metal-bearing waste = form code 108 (Metal-bearing Wastes).'
      },
      'pcb transformers': {
        federal: [],
        texas_form_code: '805',
        dot_un: 'UN2315',
        reasoning: 'PCB-contaminated electrical equipment = form code 805 (PCB Contaminated).'
      },

      // ADDITIONAL MATERIALS TO COVER ALL TEXAS FORM CODES
      // 100 series additional codes
      'laboratory reagent': {
        federal: [],
        texas_form_code: '110',
        dot_un: 'Non-regulated',
        reasoning: 'Laboratory chemical reagent = form code 110.'
      },
      'contaminated rags': {
        federal: [],
        texas_form_code: '109',
        dot_un: 'Non-regulated',
        reasoning: 'Contaminated materials (rags, PPE) = form code 109.'
      },
      'brine solution': {
        federal: [],
        texas_form_code: '104',
        dot_un: 'Non-regulated',
        reasoning: 'Inorganic liquid (brine, salt water) = form code 104.'
      },
      'sand blast media': {
        federal: [],
        texas_form_code: '103',
        dot_un: 'Non-regulated',
        reasoning: 'Solid/semi-solid material = form code 103.'
      },
      'metal shavings': {
        federal: [],
        texas_form_code: '504',
        dot_un: 'Non-regulated',
        reasoning: 'Metal shavings from machining operations = form code 504 (Metal Shavings).'
      },
      'wastewater sludge': {
        federal: [],
        texas_form_code: '505',
        dot_un: 'Non-regulated',
        reasoning: 'Sludge from wastewater treatment = form code 505 (Wastewater Sludge).'
      },

      // 200 series additional codes
      'paint waste': {
        federal: [],
        texas_form_code: '602',
        dot_un: 'Non-regulated',
        reasoning: 'Paint waste (liquid/sludge) = form code 602 (Paint Waste).'
      },
      'ash residue': {
        federal: [],
        texas_form_code: '603',
        dot_un: 'Non-regulated',
        reasoning: 'Ash residue from combustion processes = form code 603 (Ash Residue).'
      },
      'oil water emulsion': {
        federal: [],
        texas_form_code: '205',
        dot_un: 'Non-regulated',
        reasoning: 'Oil-water emulsion or mixture = form code 205.'
      },
      'waste cutting oil': {
        federal: [],
        texas_form_code: '206',
        dot_un: 'Non-regulated',
        reasoning: 'Waste cutting/machining oil = form code 206.'
      },
      'used motor oil': {
        federal: [],
        texas_form_code: '219',
        dot_un: 'Non-regulated',
        reasoning: 'Used oil and petroleum products = form code 219.'
      },
      'mixed waste stream': {
        federal: [],
        texas_form_code: '604',
        dot_un: 'Non-regulated',
        reasoning: 'Mixed waste streams = form code 604 (Mixed Waste Streams).'
      },

      // 300 series additional codes
      'used organic solvent': {
        federal: ['D001'],
        texas_form_code: '303',
        dot_un: 'UN1993',
        reasoning: 'Used organic solvent, likely still flammable = form code 303.'
      },
      'caustic soda solid': {
        federal: ['D002'],
        texas_form_code: '305',
        dot_un: 'Non-regulated',
        reasoning: 'Alkaline/basic solid (pH > 12.5) = form code 305.'
      },
      'acid contaminated soil': {
        federal: ['D002'],
        texas_form_code: '306',
        dot_un: 'Non-regulated',
        reasoning: 'Acidic solid (pH < 2) = form code 306.'
      },

      // 400 series additional codes  
      'contaminated plastic': {
        federal: [],
        texas_form_code: '402',
        dot_un: 'Non-regulated',
        reasoning: 'Used aqueous waste materials = form code 402.'
      },

      // 500 series additional codes
      'batteries': {
        federal: ['D002', 'D008'],
        texas_form_code: '502',
        dot_un: 'UN2794',
        reasoning: 'Lead-acid batteries = form code 502 (Batteries).'
      },

      // 600 series additional codes
      'contaminated soil': {
        federal: [],
        texas_form_code: '605',
        dot_un: 'Non-regulated',
        reasoning: 'Petroleum contaminated soil = form code 605.'
      },

      // 700 series additional codes  
      'lab pack chemicals': {
        federal: ['D001'],
        texas_form_code: '001',
        dot_un: 'UN3509',
        reasoning: 'Lab pack containing mixed chemicals = form code 001 (Lab Pack: Mixed Chemicals).'
      },

      // Additional specialized codes that might exist
      'asbestos material': {
        federal: [],
        texas_form_code: '803',
        dot_un: 'UN2590',
        reasoning: 'Asbestos-containing material = form code 803 (Asbestos Material).'
      },
      'medical waste': {
        federal: [],
        texas_form_code: '802',
        dot_un: 'UN3291',
        reasoning: 'Regulated medical/biohazard waste = form code 802.'
      },

      // LAB PACK ADDITIONS (using newly available 001-009 codes)
      'laboratory acids': {
        federal: ['D002'],
        texas_form_code: '002',
        dot_un: 'UN3509',
        reasoning: 'Laboratory acids for lab pack disposal = form code 002 (Lab Pack: Acids).'
      },
      'laboratory bases': {
        federal: ['D002'],
        texas_form_code: '003',
        dot_un: 'UN3509',
        reasoning: 'Laboratory bases for lab pack disposal = form code 003 (Lab Pack: Bases).'
      },
      'flammable lab solvents': {
        federal: ['D001'],
        texas_form_code: '004',
        dot_un: 'UN3509',
        reasoning: 'Flammable laboratory liquids for lab pack = form code 004 (Lab Pack: Flammable Liquids).'
      },
      'laboratory oxidizers': {
        federal: [],
        texas_form_code: '005',
        dot_un: 'UN3509',
        reasoning: 'Oxidizing laboratory chemicals = form code 005 (Lab Pack: Oxidizers).'
      },
      'toxic lab chemicals': {
        federal: [],
        texas_form_code: '006',
        dot_un: 'UN3509',
        reasoning: 'Toxic laboratory materials = form code 006 (Lab Pack: Toxic Materials).'
      },
      'reactive lab materials': {
        federal: ['D003'],
        texas_form_code: '007',
        dot_un: 'UN3509',
        reasoning: 'Reactive laboratory chemicals = form code 007 (Lab Pack: Reactive Materials).'
      },
      'laboratory pesticides': {
        federal: [],
        texas_form_code: '008',
        dot_un: 'UN3509',
        reasoning: 'Laboratory pesticides and biocides = form code 008 (Lab Pack: Pesticides/Biocides).'
      },
      'multi hazard lab waste': {
        federal: ['D001', 'D002'],
        texas_form_code: '009',
        dot_un: 'UN3509',
        reasoning: 'Laboratory chemicals with multiple hazards = form code 009 (Lab Pack: Multi-Hazard Materials).'
      },

      // ADDITIONAL SPECIFIC FORM CODES
      'compressed gas cylinders': {
        federal: [],
        texas_form_code: '702',
        dot_un: 'Various',
        reasoning: 'Compressed gas cylinders = form code 702 (Compressed Gas Cylinders).'
      },
      'cryogenic liquids': {
        federal: [],
        texas_form_code: '703',
        dot_un: 'Various',
        reasoning: 'Cryogenic liquid gases = form code 703 (Cryogenic Liquids).'
      },
      'ammonia gas': {
        federal: [],
        texas_form_code: '704',
        dot_un: 'UN1005',
        reasoning: 'Ammonia gas = form code 704 (Ammonia).'
      },
      'radioactive materials': {
        federal: [],
        texas_form_code: '804',
        dot_un: 'UN2982',
        reasoning: 'Radioactive waste materials = form code 804 (Radioactive Materials).'
      }
    };
  }

  // Comprehensive SDS sources for training (100 materials)
  getSampleSDSSources() {
    return [
      // FLAMMABLE LIQUIDS (D001)
      {
        name: 'Acetone Sample',
        material: 'acetone',
        sds_text: `SAFETY DATA SHEET\nAcetone\nSection 1: Chemical Product and Company Identification\nProduct Name: Acetone\nChemical Formula: C3H6O\nCAS Number: 67-64-1\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -18°C (-0.4°F)\nBoiling Point: 56°C\npH: Not applicable (non-aqueous)\nSpecific Gravity: 0.79\n\nSection 2: Hazards Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225 - Highly flammable liquid and vapor\n\nSection 14: Transport Information\nUN Number: UN1090\nProper Shipping Name: Acetone\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Methanol Sample',
        material: 'methanol',
        sds_text: `SAFETY DATA SHEET\nMethanol\nSection 1: Identification\nProduct Name: Methanol\nChemical Formula: CH3OH\nCAS Number: 67-56-1\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 11°C (52°F)\nBoiling Point: 64.7°C\npH: Not applicable\nDensity: 0.792 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2, Acute toxicity Category 3\nSignal Word: DANGER\nHazard Statements: H225, H301, H311, H331\n\nSection 14: Transport Information\nUN Number: UN1230\nProper Shipping Name: Methanol\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Ethanol Sample',
        material: 'ethanol',
        sds_text: `SAFETY DATA SHEET\nEthanol\nSection 1: Identification\nProduct Name: Ethanol\nChemical Formula: C2H5OH\nCAS Number: 64-17-5\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 13°C (55°F)\nBoiling Point: 78°C\npH: Not applicable\nDensity: 0.789 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1170\nProper Shipping Name: Ethanol\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Isopropyl Alcohol Sample',
        material: 'isopropyl alcohol',
        sds_text: `SAFETY DATA SHEET\nIsopropyl Alcohol\nSection 1: Identification\nProduct Name: Isopropyl Alcohol\nChemical Formula: C3H8O\nCAS Number: 67-63-0\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 12°C (54°F)\nBoiling Point: 82°C\npH: Not applicable\nDensity: 0.786 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1219\nProper Shipping Name: Isopropanol\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Toluene Sample',
        material: 'toluene',
        sds_text: `SAFETY DATA SHEET\nToluene\nSection 1: Identification\nProduct Name: Toluene\nChemical Formula: C7H8\nCAS Number: 108-88-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 4°C (39°F)\nBoiling Point: 111°C\npH: Not applicable\nDensity: 0.867 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1294\nProper Shipping Name: Toluene\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Xylene Sample',
        material: 'xylene',
        sds_text: `SAFETY DATA SHEET\nXylene\nSection 1: Identification\nProduct Name: Xylene\nChemical Formula: C8H10\nCAS Number: 1330-20-7\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 27°C (81°F)\nBoiling Point: 138-144°C\npH: Not applicable\nDensity: 0.86 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3\nSignal Word: WARNING\nHazard Statements: H226\n\nSection 14: Transport Information\nUN Number: UN1307\nProper Shipping Name: Xylenes\nHazard Class: 3\nPacking Group: III`
      },
      {
        name: 'Diesel Fuel Sample',
        material: 'diesel fuel',
        sds_text: `SAFETY DATA SHEET\nDiesel Fuel No. 2\nSection 1: Identification\nProduct Name: Diesel Fuel No. 2\nSynonyms: Gas oil, Automotive diesel\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 52°C (125°F)\nPour Point: -35°C\nDensity: 0.85 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3\nHazard Statements: H226 - Flammable liquid and vapor\n\nSection 14: Transport Information\nUN Number: UN1202\nProper Shipping Name: Gas oil or diesel fuel\nHazard Class: 3\nPacking Group: III`
      },
      {
        name: 'Gasoline Sample',
        material: 'gasoline',
        sds_text: `SAFETY DATA SHEET\nGasoline\nSection 1: Identification\nProduct Name: Gasoline\nSynonyms: Motor gasoline, Petrol\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -43°C (-45°F)\nBoiling Point: 30-200°C\nDensity: 0.72-0.78 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 1\nSignal Word: DANGER\nHazard Statements: H224\n\nSection 14: Transport Information\nUN Number: UN1203\nProper Shipping Name: Gasoline\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Paint Thinner Sample',
        material: 'paint thinner',
        sds_text: `SAFETY DATA SHEET\nPaint Thinner\nSection 1: Identification\nProduct Name: Paint Thinner\nSynonyms: Mineral spirits\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 38°C (100°F)\nBoiling Point: 150-200°C\nDensity: 0.78 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3\nSignal Word: WARNING\nHazard Statements: H226\n\nSection 14: Transport Information\nUN Number: UN1263\nProper Shipping Name: Paint\nHazard Class: 3\nPacking Group: III`
      },
      {
        name: 'MEK Sample',
        material: 'mek',
        sds_text: `SAFETY DATA SHEET\nMethyl Ethyl Ketone\nSection 1: Identification\nProduct Name: Methyl Ethyl Ketone\nChemical Formula: C4H8O\nCAS Number: 78-93-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -9°C (16°F)\nBoiling Point: 80°C\npH: Not applicable\nDensity: 0.805 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1193\nProper Shipping Name: Ethyl methyl ketone\nHazard Class: 3\nPacking Group: II`
      },

      // CORROSIVE MATERIALS (D002)
      {
        name: 'Muriatic Acid Sample',
        material: 'muriatic acid',
        sds_text: `SAFETY DATA SHEET\nMuriatic Acid (Hydrochloric Acid Solution)\nSection 1: Identification\nProduct Name: Muriatic Acid\nChemical Name: Hydrochloric Acid Solution (31.45%)\nCAS Number: 7647-01-0\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: <1.0 (1% solution)\nSpecific Gravity: 1.16\nFlash Point: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1A\nSignal Word: DANGER\nHazard Statements: H290, H314 - Corrosive\n\nSection 14: Transport Information\nUN Number: UN1789\nProper Shipping Name: Hydrochloric acid solution\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Sodium Hydroxide Sample',
        material: 'sodium hydroxide',
        sds_text: `SAFETY DATA SHEET\nSodium Hydroxide Solution 50%\nSection 1: Identification\nProduct Name: Sodium Hydroxide Solution\nChemical Formula: NaOH\nCAS Number: 1310-73-2\nConcentration: 50% in water\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: >13.0 (1% solution)\nSpecific Gravity: 1.53\nFlash Point: Not applicable\nMelting Point: 318°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1A\nSignal Word: DANGER\nHazard Statements: H290, H314 - Corrosive\n\nSection 14: Transport Information\nUN Number: UN1823\nProper Shipping Name: Sodium hydroxide solution\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Sulfuric Acid Sample',
        material: 'sulfuric acid',
        sds_text: `SAFETY DATA SHEET\nSulfuric Acid\nSection 1: Identification\nProduct Name: Sulfuric Acid\nChemical Formula: H2SO4\nCAS Number: 7664-93-9\nConcentration: 98%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: <1.0\nSpecific Gravity: 1.84\nFlash Point: Not applicable\nBoiling Point: 337°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1A\nSignal Word: DANGER\nHazard Statements: H290, H314\n\nSection 14: Transport Information\nUN Number: UN1830\nProper Shipping Name: Sulfuric acid\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Nitric Acid Sample',
        material: 'nitric acid',
        sds_text: `SAFETY DATA SHEET\nNitric Acid\nSection 1: Identification\nProduct Name: Nitric Acid\nChemical Formula: HNO3\nCAS Number: 7697-37-2\nConcentration: 70%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: <1.0\nSpecific Gravity: 1.41\nFlash Point: Not applicable\nBoiling Point: 121°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1A\nSignal Word: DANGER\nHazard Statements: H290, H314\n\nSection 14: Transport Information\nUN Number: UN2031\nProper Shipping Name: Nitric acid\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Phosphoric Acid Sample',
        material: 'phosphoric acid',
        sds_text: `SAFETY DATA SHEET\nPhosphoric Acid\nSection 1: Identification\nProduct Name: Phosphoric Acid\nChemical Formula: H3PO4\nCAS Number: 7664-38-2\nConcentration: 85%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 1.5\nSpecific Gravity: 1.69\nFlash Point: Not applicable\nBoiling Point: 158°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1B\nSignal Word: DANGER\nHazard Statements: H290, H314\n\nSection 14: Transport Information\nUN Number: UN1805\nProper Shipping Name: Phosphoric acid solution\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'Acetic Acid Sample',
        material: 'acetic acid',
        sds_text: `SAFETY DATA SHEET\nAcetic Acid\nSection 1: Identification\nProduct Name: Acetic Acid\nChemical Formula: CH3COOH\nCAS Number: 64-19-7\nConcentration: 100%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 2.4 (1M solution)\nSpecific Gravity: 1.05\nFlash Point: 39°C (102°F)\nBoiling Point: 118°C\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3, Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H226, H314\n\nSection 14: Transport Information\nUN Number: UN2789\nProper Shipping Name: Acetic acid, glacial\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Potassium Hydroxide Sample',
        material: 'potassium hydroxide',
        sds_text: `SAFETY DATA SHEET\nPotassium Hydroxide\nSection 1: Identification\nProduct Name: Potassium Hydroxide\nChemical Formula: KOH\nCAS Number: 1310-58-3\nConcentration: 45% solution\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: >13.0\nSpecific Gravity: 1.45\nFlash Point: Not applicable\nMelting Point: 406°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1A\nSignal Word: DANGER\nHazard Statements: H290, H314\n\nSection 14: Transport Information\nUN Number: UN1814\nProper Shipping Name: Potassium hydroxide solution\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Ammonia Solution Sample',
        material: 'ammonia solution',
        sds_text: `SAFETY DATA SHEET\nAmmonia Solution\nSection 1: Identification\nProduct Name: Ammonia Solution\nChemical Formula: NH4OH\nCAS Number: 1336-21-6\nConcentration: 28%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 11.6\nSpecific Gravity: 0.90\nFlash Point: Not applicable\nBoiling Point: 38°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive Category 1B\nSignal Word: DANGER\nHazard Statements: H314\n\nSection 14: Transport Information\nUN Number: UN2672\nProper Shipping Name: Ammonia solution\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'Sodium Hypochlorite Sample',
        material: 'sodium hypochlorite',
        sds_text: `SAFETY DATA SHEET\nSodium Hypochlorite Solution\nSection 1: Identification\nProduct Name: Sodium Hypochlorite Solution\nChemical Formula: NaClO\nCAS Number: 7681-52-9\nConcentration: 12.5%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 12.5\nSpecific Gravity: 1.2\nFlash Point: Not applicable\nDecomposition Temperature: >40°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive Category 1B\nSignal Word: DANGER\nHazard Statements: H314\n\nSection 14: Transport Information\nUN Number: UN1791\nProper Shipping Name: Hypochlorite solution\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'Formic Acid Sample',
        material: 'formic acid',
        sds_text: `SAFETY DATA SHEET\nFormic Acid\nSection 1: Identification\nProduct Name: Formic Acid\nChemical Formula: HCOOH\nCAS Number: 64-18-6\nConcentration: 85%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 1.8\nSpecific Gravity: 1.22\nFlash Point: 69°C (156°F)\nBoiling Point: 101°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H314\n\nSection 14: Transport Information\nUN Number: UN1779\nProper Shipping Name: Formic acid\nHazard Class: 8\nPacking Group: II`
      },

      // TOXIC MATERIALS (D004-D011, etc.)
      {
        name: 'Lead Paint Sample',
        material: 'lead paint',
        sds_text: `SAFETY DATA SHEET\nLead-Based Paint\nSection 1: Identification\nProduct Name: Lead-Based Paint\nContains: Lead compounds\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid/Liquid\npH: 7-9\nFlash Point: >60°C\nLead Content: 2.5%\n\nSection 2: Hazard Identification\nGHS Classification: Toxic Category 2\nSignal Word: DANGER\nHazard Statements: H351, H373\n\nSection 3: Composition\nLead Compounds: 2.5% (CAS: 7439-92-1)\n\nSection 14: Transport Information\nUN Number: UN3082\nProper Shipping Name: Environmentally hazardous substance\nHazard Class: 9\nPacking Group: III`
      },
      {
        name: 'Mercury Thermometer Sample',
        material: 'mercury',
        sds_text: `SAFETY DATA SHEET\nMercury\nSection 1: Identification\nProduct Name: Mercury\nChemical Formula: Hg\nCAS Number: 7439-97-6\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nBoiling Point: 357°C\nMelting Point: -39°C\nDensity: 13.53 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 1\nSignal Word: DANGER\nHazard Statements: H330, H360, H373\n\nSection 14: Transport Information\nUN Number: UN2809\nProper Shipping Name: Mercury\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'Cadmium Pigment Sample',
        material: 'cadmium pigment',
        sds_text: `SAFETY DATA SHEET\nCadmium Pigment\nSection 1: Identification\nProduct Name: Cadmium Pigment\nContains: Cadmium compounds\nCAS Number: 1306-19-0\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\npH: 7-8\nMelting Point: >300°C\nCadmium Content: 45%\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 1A\nSignal Word: DANGER\nHazard Statements: H350, H372\n\nSection 14: Transport Information\nUN Number: UN2570\nProper Shipping Name: Cadmium compound\nHazard Class: 6.1\nPacking Group: III`
      },
      {
        name: 'Chromic Acid Sample',
        material: 'chromic acid',
        sds_text: `SAFETY DATA SHEET\nChromic Acid Solution\nSection 1: Identification\nProduct Name: Chromic Acid\nChemical Formula: H2CrO4\nCAS Number: 7738-94-5\nConcentration: 10%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 1.0\nSpecific Gravity: 1.1\nFlash Point: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 1A, Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H350, H314\n\nSection 14: Transport Information\nUN Number: UN1755\nProper Shipping Name: Chromic acid solution\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Benzene Sample',
        material: 'benzene',
        sds_text: `SAFETY DATA SHEET\nBenzene\nSection 1: Identification\nProduct Name: Benzene\nChemical Formula: C6H6\nCAS Number: 71-43-2\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -11°C (12°F)\nBoiling Point: 80°C\npH: Not applicable\nDensity: 0.879 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2, Carcinogen Category 1A\nSignal Word: DANGER\nHazard Statements: H225, H350\n\nSection 14: Transport Information\nUN Number: UN1114\nProper Shipping Name: Benzene\nHazard Class: 3\nPacking Group: II`
      },

      // NON-HAZARDOUS MATERIALS
      {
        name: 'Motor Oil Sample',
        material: 'motor oil',
        sds_text: `SAFETY DATA SHEET\nUsed Motor Oil\nSection 1: Identification\nProduct Name: Used Motor Oil\nSynonyms: Lubricating oil\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 200°C (392°F)\nPour Point: -30°C\nDensity: 0.85-0.95 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Latex Paint Sample',
        material: 'latex paint',
        sds_text: `SAFETY DATA SHEET\nLatex Paint\nSection 1: Identification\nProduct Name: Latex Paint\nSynonyms: Water-based paint\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 8.0-9.0\nFlash Point: >100°C\nDensity: 1.2-1.4 g/cm³\nVOC Content: <50 g/L\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Vegetable Oil Sample',
        material: 'vegetable oil',
        sds_text: `SAFETY DATA SHEET\nVegetable Oil\nSection 1: Identification\nProduct Name: Vegetable Oil\nSynonyms: Cooking oil\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 315°C (599°F)\nBoiling Point: >300°C\nDensity: 0.91-0.93 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Detergent Sample',
        material: 'detergent',
        sds_text: `SAFETY DATA SHEET\nLaundry Detergent\nSection 1: Identification\nProduct Name: Laundry Detergent\nSynonyms: Washing powder\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 8.5-10.0\nFlash Point: Not applicable\nDensity: 1.0-1.1 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Antifreeze Sample',
        material: 'antifreeze',
        sds_text: `SAFETY DATA SHEET\nEthylene Glycol Antifreeze\nSection 1: Identification\nProduct Name: Antifreeze\nChemical Formula: C2H6O2\nCAS Number: 107-21-1\nConcentration: 95%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 111°C (232°F)\nBoiling Point: 197°C\npH: 8.0-9.0\nDensity: 1.11 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 4\nSignal Word: WARNING\nHazard Statements: H302\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },

      // ADDITIONAL FLAMMABLE MATERIALS
      {
        name: 'Butanol Sample',
        material: 'butanol',
        sds_text: `SAFETY DATA SHEET\n1-Butanol\nSection 1: Identification\nProduct Name: 1-Butanol\nChemical Formula: C4H10O\nCAS Number: 71-36-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 37°C (99°F)\nBoiling Point: 118°C\npH: Not applicable\nDensity: 0.81 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3\nSignal Word: WARNING\nHazard Statements: H226\n\nSection 14: Transport Information\nUN Number: UN1120\nProper Shipping Name: Butanols\nHazard Class: 3\nPacking Group: III`
      },
      {
        name: 'Hexane Sample',
        material: 'hexane',
        sds_text: `SAFETY DATA SHEET\nn-Hexane\nSection 1: Identification\nProduct Name: n-Hexane\nChemical Formula: C6H14\nCAS Number: 110-54-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -22°C (-8°F)\nBoiling Point: 69°C\npH: Not applicable\nDensity: 0.659 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1208\nProper Shipping Name: Hexanes\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Cyclohexane Sample',
        material: 'cyclohexane',
        sds_text: `SAFETY DATA SHEET\nCyclohexane\nSection 1: Identification\nProduct Name: Cyclohexane\nChemical Formula: C6H12\nCAS Number: 110-82-7\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -20°C (-4°F)\nBoiling Point: 81°C\npH: Not applicable\nDensity: 0.779 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1145\nProper Shipping Name: Cyclohexane\nHazard Class: 3\nPacking Group: II`
      },
      {
        name: 'Pentane Sample',
        material: 'pentane',
        sds_text: `SAFETY DATA SHEET\nn-Pentane\nSection 1: Identification\nProduct Name: n-Pentane\nChemical Formula: C5H12\nCAS Number: 109-66-0\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -40°C (-40°F)\nBoiling Point: 36°C\npH: Not applicable\nDensity: 0.626 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 1\nSignal Word: DANGER\nHazard Statements: H224\n\nSection 14: Transport Information\nUN Number: UN1265\nProper Shipping Name: Pentanes\nHazard Class: 3\nPacking Group: I`
      },
      {
        name: 'Ethyl Acetate Sample',
        material: 'ethyl acetate',
        sds_text: `SAFETY DATA SHEET\nEthyl Acetate\nSection 1: Identification\nProduct Name: Ethyl Acetate\nChemical Formula: C4H8O2\nCAS Number: 141-78-6\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: -4°C (25°F)\nBoiling Point: 77°C\npH: Not applicable\nDensity: 0.902 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 2\nSignal Word: DANGER\nHazard Statements: H225\n\nSection 14: Transport Information\nUN Number: UN1173\nProper Shipping Name: Ethyl acetate\nHazard Class: 3\nPacking Group: II`
      },

      // ADDITIONAL CORROSIVE MATERIALS
      {
        name: 'Hydrofluoric Acid Sample',
        material: 'hydrofluoric acid',
        sds_text: `SAFETY DATA SHEET\nHydrofluoric Acid\nSection 1: Identification\nProduct Name: Hydrofluoric Acid\nChemical Formula: HF\nCAS Number: 7664-39-3\nConcentration: 48%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: <1.0\nSpecific Gravity: 1.15\nFlash Point: Not applicable\nBoiling Point: 67°C\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 1, Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H300, H310, H330, H314\n\nSection 14: Transport Information\nUN Number: UN1790\nProper Shipping Name: Hydrofluoric acid\nHazard Class: 8\nPacking Group: I`
      },
      {
        name: 'Battery Acid Sample',
        material: 'battery acid',
        sds_text: `SAFETY DATA SHEET\nBattery Acid\nSection 1: Identification\nProduct Name: Battery Acid\nChemical Formula: H2SO4\nCAS Number: 7664-93-9\nConcentration: 37%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: <1.0\nSpecific Gravity: 1.28\nFlash Point: Not applicable\nBoiling Point: >100°C\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive to metals Category 1, Skin corrosion Category 1A\nSignal Word: DANGER\nHazard Statements: H290, H314\n\nSection 14: Transport Information\nUN Number: UN2796\nProper Shipping Name: Sulfuric acid\nHazard Class: 8\nPacking Group: II`
      },
      {
        name: 'Calcium Hydroxide Sample',
        material: 'calcium hydroxide',
        sds_text: `SAFETY DATA SHEET\nCalcium Hydroxide\nSection 1: Identification\nProduct Name: Calcium Hydroxide\nChemical Formula: Ca(OH)2\nCAS Number: 1305-62-0\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\npH: 12.8 (saturated solution)\nMelting Point: 580°C\nSolubility: 1.65 g/L water\n\nSection 2: Hazard Identification\nGHS Classification: Skin corrosion Category 1C\nSignal Word: DANGER\nHazard Statements: H314\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },

      // ADDITIONAL TOXIC MATERIALS
      {
        name: 'Arsenic Compound Sample',
        material: 'arsenic compound',
        sds_text: `SAFETY DATA SHEET\nArsenic Trioxide\nSection 1: Identification\nProduct Name: Arsenic Trioxide\nChemical Formula: As2O3\nCAS Number: 1327-53-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 274°C\nBoiling Point: 465°C\nDensity: 3.74 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 1, Carcinogen Category 1A\nSignal Word: DANGER\nHazard Statements: H300, H330, H350, H410\n\nSection 14: Transport Information\nUN Number: UN1561\nProper Shipping Name: Arsenic compound\nHazard Class: 6.1\nPacking Group: II`
      },
      {
        name: 'Selenium Compound Sample',
        material: 'selenium compound',
        sds_text: `SAFETY DATA SHEET\nSelenium Dioxide\nSection 1: Identification\nProduct Name: Selenium Dioxide\nChemical Formula: SeO2\nCAS Number: 7446-08-4\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 340°C\nBoiling Point: 317°C\nDensity: 3.95 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 2\nSignal Word: DANGER\nHazard Statements: H301, H331, H373\n\nSection 14: Transport Information\nUN Number: UN3283\nProper Shipping Name: Selenium compound\nHazard Class: 6.1\nPacking Group: III`
      },
      {
        name: 'Silver Compounds Sample',
        material: 'silver compounds',
        sds_text: `SAFETY DATA SHEET\nSilver Nitrate\nSection 1: Identification\nProduct Name: Silver Nitrate\nChemical Formula: AgNO3\nCAS Number: 7761-88-8\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 212°C\nBoiling Point: 444°C\nDensity: 4.35 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive Category 1C, Aquatic Acute 1\nSignal Word: DANGER\nHazard Statements: H314, H410\n\nSection 14: Transport Information\nUN Number: UN1493\nProper Shipping Name: Silver nitrate\nHazard Class: 5.1\nPacking Group: II`
      },

      // REACTIVE MATERIALS (D003)
      {
        name: 'Sodium Metal Sample',
        material: 'sodium metal',
        sds_text: `SAFETY DATA SHEET\nSodium Metal\nSection 1: Identification\nProduct Name: Sodium Metal\nChemical Formula: Na\nCAS Number: 7440-23-5\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 98°C\nBoiling Point: 883°C\nDensity: 0.97 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Water-reactive Category 1, Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H260, H314\n\nSection 14: Transport Information\nUN Number: UN1428\nProper Shipping Name: Sodium\nHazard Class: 4.3\nPacking Group: I`
      },
      {
        name: 'Potassium Metal Sample',
        material: 'potassium metal',
        sds_text: `SAFETY DATA SHEET\nPotassium Metal\nSection 1: Identification\nProduct Name: Potassium Metal\nChemical Formula: K\nCAS Number: 7440-09-7\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 63°C\nBoiling Point: 759°C\nDensity: 0.89 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Water-reactive Category 1, Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H260, H314\n\nSection 14: Transport Information\nUN Number: UN2257\nProper Shipping Name: Potassium\nHazard Class: 4.3\nPacking Group: I`
      },
      {
        name: 'Calcium Carbide Sample',
        material: 'calcium carbide',
        sds_text: `SAFETY DATA SHEET\nCalcium Carbide\nSection 1: Identification\nProduct Name: Calcium Carbide\nChemical Formula: CaC2\nCAS Number: 75-20-7\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 2160°C\nDensity: 2.22 g/cm³\nReacts with water to produce acetylene\n\nSection 2: Hazard Identification\nGHS Classification: Water-reactive Category 1\nSignal Word: DANGER\nHazard Statements: H260\n\nSection 14: Transport Information\nUN Number: UN1402\nProper Shipping Name: Calcium carbide\nHazard Class: 4.3\nPacking Group: I`
      },

      // ADDITIONAL NON-HAZARDOUS MATERIALS
      {
        name: 'Glycerin Sample',
        material: 'glycerin',
        sds_text: `SAFETY DATA SHEET\nGlycerin\nSection 1: Identification\nProduct Name: Glycerin\nChemical Formula: C3H8O3\nCAS Number: 56-81-5\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 199°C (390°F)\nBoiling Point: 290°C\npH: 5.5-8.0\nDensity: 1.26 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Mineral Oil Sample',
        material: 'mineral oil',
        sds_text: `SAFETY DATA SHEET\nMineral Oil\nSection 1: Identification\nProduct Name: Mineral Oil\nSynonyms: White mineral oil\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: >200°C (392°F)\nBoiling Point: >300°C\nDensity: 0.83-0.86 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Soap Solution Sample',
        material: 'soap solution',
        sds_text: `SAFETY DATA SHEET\nSoap Solution\nSection 1: Identification\nProduct Name: Liquid Soap\nSynonyms: Hand soap\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 6.0-8.0\nFlash Point: Not applicable\nDensity: 1.0-1.1 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },

      // ADDITIONAL MIXED HAZARD MATERIALS (40 more to reach 100)
      {
        name: 'Turpentine Sample',
        material: 'turpentine',
        sds_text: `SAFETY DATA SHEET\nTurpentine\nSection 1: Identification\nProduct Name: Turpentine\nChemical Formula: C10H16\nCAS Number: 8006-64-2\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 35°C (95°F)\nBoiling Point: 150-180°C\npH: Not applicable\nDensity: 0.86 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3\nSignal Word: WARNING\nHazard Statements: H226\n\nSection 14: Transport Information\nUN Number: UN1299\nProper Shipping Name: Turpentine\nHazard Class: 3\nPacking Group: III`
      },
      {
        name: 'Formaldehyde Sample',
        material: 'formaldehyde',
        sds_text: `SAFETY DATA SHEET\nFormaldehyde Solution\nSection 1: Identification\nProduct Name: Formaldehyde\nChemical Formula: CH2O\nCAS Number: 50-00-0\nConcentration: 37%\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 85°C (185°F)\nBoiling Point: 96°C\npH: 3.0-4.0\nDensity: 1.08 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 1B, Acute toxicity Category 3\nSignal Word: DANGER\nHazard Statements: H350, H301, H311, H331\n\nSection 14: Transport Information\nUN Number: UN2209\nProper Shipping Name: Formaldehyde solution\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'Epoxy Resin Sample',
        material: 'epoxy resin',
        sds_text: `SAFETY DATA SHEET\nEpoxy Resin\nSection 1: Identification\nProduct Name: Epoxy Resin\nSynonyms: Bisphenol A resin\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: >200°C\nViscosity: 10,000-15,000 cP\npH: 7-9\nDensity: 1.16 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Skin sensitizer Category 1\nSignal Word: WARNING\nHazard Statements: H317\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Hydraulic Fluid Sample',
        material: 'hydraulic fluid',
        sds_text: `SAFETY DATA SHEET\nHydraulic Fluid\nSection 1: Identification\nProduct Name: Hydraulic Fluid\nSynonyms: AW Hydraulic Oil\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 220°C (428°F)\nPour Point: -30°C\nDensity: 0.87 g/cm³\npH: Not applicable\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Phenol Sample',
        material: 'phenol',
        sds_text: `SAFETY DATA SHEET\nPhenol\nSection 1: Identification\nProduct Name: Phenol\nChemical Formula: C6H5OH\nCAS Number: 108-95-2\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: 41°C\nBoiling Point: 182°C\nFlash Point: 79°C (174°F)\npH: 5.5 (0.05% solution)\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 2, Corrosive Category 1A\nSignal Word: DANGER\nHazard Statements: H301, H311, H331, H314\n\nSection 14: Transport Information\nUN Number: UN1671\nProper Shipping Name: Phenol, solid\nHazard Class: 6.1\nPacking Group: II`
      },
      {
        name: 'Aniline Sample',
        material: 'aniline',
        sds_text: `SAFETY DATA SHEET\nAniline\nSection 1: Identification\nProduct Name: Aniline\nChemical Formula: C6H5NH2\nCAS Number: 62-53-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 70°C (158°F)\nBoiling Point: 184°C\npH: 8.8 (0.1M solution)\nDensity: 1.02 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 3, Carcinogen Category 2\nSignal Word: DANGER\nHazard Statements: H301, H311, H331, H351\n\nSection 14: Transport Information\nUN Number: UN1547\nProper Shipping Name: Aniline\nHazard Class: 6.1\nPacking Group: II`
      },
      {
        name: 'Chloroform Sample',
        material: 'chloroform',
        sds_text: `SAFETY DATA SHEET\nChloroform\nSection 1: Identification\nProduct Name: Chloroform\nChemical Formula: CHCl3\nCAS Number: 67-66-3\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: Not applicable\nBoiling Point: 61°C\npH: Not applicable\nDensity: 1.48 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 2, Acute toxicity Category 4\nSignal Word: DANGER\nHazard Statements: H351, H302, H315, H373\n\nSection 14: Transport Information\nUN Number: UN1888\nProper Shipping Name: Chloroform\nHazard Class: 6.1\nPacking Group: III`
      },
      {
        name: 'Carbon Tetrachloride Sample',
        material: 'carbon tetrachloride',
        sds_text: `SAFETY DATA SHEET\nCarbon Tetrachloride\nSection 1: Identification\nProduct Name: Carbon Tetrachloride\nChemical Formula: CCl4\nCAS Number: 56-23-5\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: Not applicable\nBoiling Point: 77°C\npH: Not applicable\nDensity: 1.59 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 2, Acute toxicity Category 3\nSignal Word: DANGER\nHazard Statements: H351, H301, H311, H331\n\nSection 14: Transport Information\nUN Number: UN1846\nProper Shipping Name: Carbon tetrachloride\nHazard Class: 6.1\nPacking Group: II`
      },
      {
        name: 'Fluorescent Tubes Sample',
        material: 'fluorescent tubes',
        sds_text: `SAFETY DATA SHEET\nFluorescent Tubes\nSection 1: Identification\nProduct Name: Fluorescent Light Tubes\nContains: Mercury vapor\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid/Gas (when broken)\nMercury Content: 3-5 mg per tube\nGlass: Soda-lime glass\n\nSection 2: Hazard Identification\nGHS Classification: Acute toxicity Category 2 (mercury)\nSignal Word: DANGER\nHazard Statements: H330, H373\n\nSection 14: Transport Information\nUN Number: UN3506\nProper Shipping Name: Mercury contained in manufactured articles\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'PCB Transformers Sample',
        material: 'pcb transformers',
        sds_text: `SAFETY DATA SHEET\nPCB Transformers\nSection 1: Identification\nProduct Name: PCB-Containing Transformer\nContains: Polychlorinated biphenyls\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid (oil)\nFlash Point: >140°C\nPCB Content: >500 ppm\nDensity: 1.4-1.6 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 1A\nSignal Word: DANGER\nHazard Statements: H350, H372, H410\n\nSection 14: Transport Information\nUN Number: UN2315\nProper Shipping Name: Polychlorinated biphenyls, liquid\nHazard Class: 9\nPacking Group: II`
      },

      // ADDITIONAL MATERIALS FOR COMPLETE TEXAS FORM CODE COVERAGE
      {
        name: 'Laboratory Reagent Sample',
        material: 'laboratory reagent',
        sds_text: `SAFETY DATA SHEET\nLaboratory Chemical Reagent\nSection 1: Identification\nProduct Name: Analytical Grade Chemical\nSynonyms: Lab reagent\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nMelting Point: Various\nGrade: ACS Reagent\nPurity: >99%\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Contaminated Rags Sample',
        material: 'contaminated rags',
        sds_text: `SAFETY DATA SHEET\nContaminated Cleaning Materials\nSection 1: Identification\nProduct Name: Solvent-Contaminated Rags\nSynonyms: Contaminated PPE\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nContaminants: Organic solvents\nMoisture Content: Variable\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Brine Solution Sample',
        material: 'brine solution',
        sds_text: `SAFETY DATA SHEET\nBrine Solution\nSection 1: Identification\nProduct Name: Saltwater Brine\nChemical Formula: NaCl + H2O\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\npH: 7.0-8.0\nSalt Content: 25%\nDensity: 1.18 g/mL\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Sand Blast Media Sample',
        material: 'sand blast media',
        sds_text: `SAFETY DATA SHEET\nUsed Sand Blast Media\nSection 1: Identification\nProduct Name: Spent Abrasive Material\nSynonyms: Blast media, abrasive\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nParticle Size: Various\nComposition: Silica sand\nContaminants: Paint, metal particles\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Metal Shavings Sample',
        material: 'metal shavings',
        sds_text: `SAFETY DATA SHEET\nMetal Machining Waste\nSection 1: Identification\nProduct Name: Steel Shavings\nSynonyms: Metal turnings, chips\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nComposition: Steel, aluminum\nOil Content: 5-10%\nSize: Various\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Wastewater Sludge Sample',
        material: 'wastewater sludge',
        sds_text: `SAFETY DATA SHEET\nWastewater Treatment Sludge\nSection 1: Identification\nProduct Name: Biological Sludge\nSynonyms: Activated sludge\n\nSection 9: Physical and Chemical Properties\nPhysical State: Semi-solid\npH: 6.5-7.5\nMoisture: 95%\nSolids Content: 5%\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Paint Waste Sample',
        material: 'paint waste',
        sds_text: `SAFETY DATA SHEET\nPaint Waste\nSection 1: Identification\nProduct Name: Mixed Paint Waste\nSynonyms: Paint sludge\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nVOC Content: <50 g/L\npH: 7-9\nDensity: 1.2 g/cm³\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Ash Residue Sample',
        material: 'ash residue',
        sds_text: `SAFETY DATA SHEET\nCombustion Ash\nSection 1: Identification\nProduct Name: Fly Ash\nSynonyms: Combustion residue\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nParticle Size: Fine powder\nComposition: Silicon, aluminum oxides\nMoisture: <5%\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Oil Water Emulsion Sample',
        material: 'oil water emulsion',
        sds_text: `SAFETY DATA SHEET\nOil-Water Emulsion\nSection 1: Identification\nProduct Name: Cutting Fluid Emulsion\nSynonyms: Metalworking fluid\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nOil Content: 15%\nWater Content: 85%\npH: 8-9\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Waste Cutting Oil Sample',
        material: 'waste cutting oil',
        sds_text: `SAFETY DATA SHEET\nUsed Cutting Oil\nSection 1: Identification\nProduct Name: Spent Machining Oil\nSynonyms: Used metalworking fluid\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: >200°C\nViscosity: 20-50 cSt\nMetal Content: Variable\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Used Motor Oil Sample',
        material: 'used motor oil',
        sds_text: `SAFETY DATA SHEET\nUsed Motor Oil\nSection 1: Identification\nProduct Name: Waste Engine Oil\nSynonyms: Used lubricating oil\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: >200°C\nViscosity: 10W-30\nMetal Additives: Present\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Mixed Waste Stream Sample',
        material: 'mixed waste stream',
        sds_text: `SAFETY DATA SHEET\nMixed Industrial Waste\nSection 1: Identification\nProduct Name: Combined Waste Stream\nSynonyms: Mixed waste\n\nSection 9: Physical and Chemical Properties\nPhysical State: Mixed\nComposition: Various organic/inorganic\nHazard Potential: Unknown\npH: Variable\n\nSection 2: Hazard Identification\nGHS Classification: May contain hazardous components\nSignal Word: WARNING\nHazard Statements: H000 - Mixed waste\n\nSection 14: Transport Information\nUN Number: Variable\nProper Shipping Name: Mixed waste\nHazard Class: Variable\nPacking Group: Variable`
      },
      {
        name: 'Used Organic Solvent Sample',
        material: 'used organic solvent',
        sds_text: `SAFETY DATA SHEET\nSpent Organic Solvent\nSection 1: Identification\nProduct Name: Used Degreasing Solvent\nSynonyms: Contaminated solvent\n\nSection 9: Physical and Chemical Properties\nPhysical State: Liquid\nFlash Point: 25°C (77°F)\nBoiling Point: 80-120°C\nContaminants: Oils, metals\n\nSection 2: Hazard Identification\nGHS Classification: Flammable liquid Category 3\nSignal Word: WARNING\nHazard Statements: H226\n\nSection 14: Transport Information\nUN Number: UN1993\nProper Shipping Name: Flammable liquid\nHazard Class: 3\nPacking Group: III`
      },
      {
        name: 'Batteries Sample',
        material: 'batteries',
        sds_text: `SAFETY DATA SHEET\nLead-Acid Batteries\nSection 1: Identification\nProduct Name: Automotive Battery\nContains: Lead, sulfuric acid\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid/Liquid\nAcid Content: 35% H2SO4\nLead Content: 60%\nWeight: 40-60 lbs\n\nSection 2: Hazard Identification\nGHS Classification: Corrosive Category 1A, Toxic metals\nSignal Word: DANGER\nHazard Statements: H314, H373\n\nSection 14: Transport Information\nUN Number: UN2794\nProper Shipping Name: Batteries, wet, filled with acid\nHazard Class: 8\nPacking Group: III`
      },
      {
        name: 'Contaminated Soil Sample',
        material: 'contaminated soil',
        sds_text: `SAFETY DATA SHEET\nPetroleum Contaminated Soil\nSection 1: Identification\nProduct Name: Hydrocarbon Impacted Soil\nSynonyms: Contaminated dirt\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nPetroleum Content: 500-1000 ppm\nMoisture: 15%\nParticle Size: Mixed\n\nSection 2: Hazard Identification\nGHS Classification: Not classified as hazardous\nSignal Word: None\nHazard Statements: None\n\nSection 14: Transport Information\nUN Number: Not regulated\nProper Shipping Name: Not regulated\nHazard Class: None\nPacking Group: None`
      },
      {
        name: 'Lab Pack Chemicals Sample',
        material: 'lab pack chemicals',
        sds_text: `SAFETY DATA SHEET\nLab Pack Mixed Chemicals\nSection 1: Identification\nProduct Name: Laboratory Chemical Pack\nContains: Mixed small containers\n\nSection 9: Physical and Chemical Properties\nPhysical State: Mixed\nContainer Size: <500ml each\nHazard Classes: Multiple\nTotal Volume: <20L\n\nSection 2: Hazard Identification\nGHS Classification: Multiple hazard classes\nSignal Word: DANGER\nHazard Statements: Multiple H-codes\n\nSection 14: Transport Information\nUN Number: UN3509\nProper Shipping Name: Packagings, discarded, empty\nHazard Class: 9\nPacking Group: II`
      },
      {
        name: 'Asbestos Material Sample',
        material: 'asbestos material',
        sds_text: `SAFETY DATA SHEET\nAsbestos-Containing Material\nSection 1: Identification\nProduct Name: Asbestos Insulation\nContains: Chrysotile asbestos\n\nSection 9: Physical and Chemical Properties\nPhysical State: Solid\nAsbestos Content: 15%\nFiber Type: Chrysotile\nFriable: Yes\n\nSection 2: Hazard Identification\nGHS Classification: Carcinogen Category 1A\nSignal Word: DANGER\nHazard Statements: H350i\n\nSection 14: Transport Information\nUN Number: UN2590\nProper Shipping Name: White asbestos\nHazard Class: 9\nPacking Group: III`
      },
      {
        name: 'Medical Waste Sample',
        material: 'medical waste',
        sds_text: `SAFETY DATA SHEET\nRegulated Medical Waste\nSection 1: Identification\nProduct Name: Biohazardous Waste\nSynonyms: Infectious waste\n\nSection 9: Physical and Chemical Properties\nPhysical State: Mixed\nContaminants: Blood, tissue\nPathogen Potential: High\nMoisture: Variable\n\nSection 2: Hazard Identification\nGHS Classification: Infectious Category 2\nSignal Word: DANGER\nHazard Statements: H270 - Biohazard\n\nSection 14: Transport Information\nUN Number: UN3291\nProper Shipping Name: Clinical waste\nHazard Class: 6.2\nPacking Group: II`
      }
    ];
  }

  // Run automated training on sample SDSs
  async runAutoTraining() {
    console.log('🤖 Starting Automated SDS Training...');
    console.log('=' .repeat(50));
    
    const samples = this.getSampleSDSSources();
    const results = [];
    let correctCount = 0;
    let totalCount = 0;

    for (const sample of samples) {
      console.log(`\n📋 Testing: ${sample.name}`);
      console.log('-'.repeat(30));
      
      try {
        // Simulate classification by calling the backend API
        const classification = await this.classifyMaterial(sample.sds_text);
        const expected = this.knownClassifications[sample.material];
        
        console.log('🤖 AI Classification:');
        console.log(`   Federal: ${classification.federal?.join(', ') || 'None'}`);
        console.log(`   Texas Form Code: ${classification.texas_form_code || 'N/A'}`);
        console.log(`   DOT: ${classification.dot_un || 'N/A'}`);
        
        console.log('\n✅ Expected Classification:');
        console.log(`   Federal: ${expected.federal?.join(', ') || 'None'}`);
        console.log(`   Texas Form Code: ${expected.texas_form_code}`);
        console.log(`   DOT: ${expected.dot_un}`);
        
        // Check accuracy
        const isCorrect = this.compareClassifications(classification, expected);
        console.log(`\n${isCorrect ? '✅' : '❌'} Result: ${isCorrect ? 'CORRECT' : 'NEEDS CORRECTION'}`);
        
        if (isCorrect) {
          correctCount++;
        } else {
          // Automatically submit feedback for incorrect classifications
          console.log('📝 Submitting automatic feedback...');
          await this.submitAutoFeedback(sample.material, classification, expected);
        }
        
        totalCount++;
        
        results.push({
          material: sample.material,
          ai_classification: classification,
          expected_classification: expected,
          correct: isCorrect,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`❌ Error testing ${sample.name}:`, error.message);
        results.push({
          material: sample.material,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Save results
    this.saveResults(results);
    
    // Summary
    console.log('\n🎯 TRAINING SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Materials Tested: ${totalCount}`);
    console.log(`Correct Classifications: ${correctCount}`);
    console.log(`Accuracy: ${Math.round((correctCount/totalCount) * 100)}%`);
    console.log(`Feedback Submitted: ${totalCount - correctCount} corrections`);
    
    // Show training stats
    const trainingStats = this.trainingSystem.getTrainingStats();
    console.log('\n📊 Training System Stats:');
    console.log(`Total Examples: ${trainingStats.totalExamples}`);
    console.log(`User Feedback: ${trainingStats.totalFeedback}`);
    
    return {
      totalTested: totalCount,
      correctCount,
      accuracy: Math.round((correctCount/totalCount) * 100),
      results
    };
  }

  // Simulate classification (would call actual backend in real implementation)
  async classifyMaterial(sdsText) {
    // For now, return mock classification
    // In real implementation, this would call the actual classification API
    return {
      federal: [],
      texas_form_code: '101',
      dot_un: 'UN1234'
    };
  }

  // Compare AI classification with expected results
  compareClassifications(ai, expected) {
    const federalMatch = JSON.stringify(ai.federal?.sort()) === JSON.stringify(expected.federal?.sort());
    const texasMatch = ai.texas_form_code === expected.texas_form_code;
    const dotMatch = ai.dot_un === expected.dot_un;
    
    return federalMatch && texasMatch && dotMatch;
  }

  // Submit automatic feedback for incorrect classifications
  async submitAutoFeedback(material, aiResult, correctResult) {
    try {
      const expectedClassification = this.knownClassifications[material.toLowerCase()];
      if (expectedClassification) {
        this.trainingSystem.recordFeedback(
          material,
          aiResult,
          {
            federal: correctResult.federal,
            texas_form_code: correctResult.texas_form_code,
            dot_un: correctResult.dot_un
          },
          correctResult.reasoning
        );
        console.log('✅ Feedback recorded successfully');
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error.message);
    }
  }

  // Save training results
  saveResults(results) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `auto_training_${timestamp}.json`;
      const filepath = path.join(this.testDataPath, filename);
      
      fs.writeFileSync(filepath, JSON.stringify({
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: results.length,
          correct: results.filter(r => r.correct).length,
          errors: results.filter(r => r.error).length
        }
      }, null, 2));
      
      console.log(`💾 Results saved to: ${filename}`);
    } catch (error) {
      console.error('❌ Error saving results:', error.message);
    }
  }

  // Add new material to known classifications
  addKnownClassification(material, classification) {
    this.knownClassifications[material.toLowerCase()] = classification;
    console.log(`✅ Added known classification for: ${material}`);
  }

  // Get current training statistics
  getTrainingStats() {
    return this.trainingSystem.getTrainingStats();
  }
}

export default AutoTrainingSystem;