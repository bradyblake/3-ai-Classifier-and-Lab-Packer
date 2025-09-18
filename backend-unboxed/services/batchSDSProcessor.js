// Batch SDS Processing Service for Lab Pack Analysis
// Processes multiple containers simultaneously with compatibility checking

import AIProviderService from './aiProviders.js';
import RegulatoryHierarchy from './regulatoryHierarchy.js';
import materialDatabase from './materialDatabase.js';
import ClassificationValidator from './classificationValidator.js';
import MultiAttemptParser from './multiAttemptParser.js';
import pdfParse from 'pdf-parse';
import fs from 'fs';

class BatchSDSProcessor {
  constructor(aiService = null) {
    this.aiService = aiService || new AIProviderService();
    this.aiProviders = this.aiService; // Keep legacy reference
    this.regulatoryHierarchy = new RegulatoryHierarchy();
    this.validator = new ClassificationValidator();
    this.multiParser = new MultiAttemptParser();
    
    // COMPREHENSIVE LAB PACK COMPATIBILITY MATRIX
    // Designed by Environmental Chemist Standards - EPA RCRA + DOT Compliant
    // Each chemical gets individual compatibility check even within same category
    this.labPackCategories = {
      
      // GROUP 1: FLAMMABLE LIQUIDS (DOT Class 3)
      'flammable_organic': {
        name: 'Flammable Organic Liquids',
        description: 'Organic compounds with flash point <60°C',
        dot_class: '3',
        subcategories: {
          'alcohols': {
            name: 'Alcohols & Glycols',
            examples: ['methanol', 'ethanol', 'isopropanol', 'ethylene glycol'],
            compatible_within: true, // Alcohols can mix with other alcohols
            notes: 'Generally compatible with each other'
          },
          'ketones': {
            name: 'Ketones',
            examples: ['acetone', 'methyl ethyl ketone', 'cyclohexanone'],
            compatible_within: true,
            notes: 'High vapor pressure - extra ventilation'
          },
          'aromatic_hydrocarbons': {
            name: 'Aromatic Hydrocarbons',
            examples: ['benzene', 'toluene', 'xylene'],
            compatible_within: true,
            notes: 'Carcinogenic - sealed containers required'
          },
          'esters': {
            name: 'Esters',
            examples: ['ethyl acetate', 'methyl acetate'],
            compatible_within: true,
            notes: 'May react with strong bases over time'
          }
        },
        incompatible_categories: ['oxidizers', 'oxidizing_acids', 'reactive_metals', 'aerosols'],
        compatible_categories: ['toxic_organic'],
        packaging: 'Secondary containment, absorbent material, fire prevention'
      },
      
      'flammable_petroleum': {
        name: 'Petroleum Products',
        description: 'Petroleum-based flammable liquids',
        dot_class: '3',
        subcategories: {
          'light_distillates': {
            name: 'Light Petroleum Distillates',
            examples: ['gasoline', 'naphtha', 'petroleum ether'],
            compatible_within: true,
            notes: 'High vapor pressure - explosion risk'
          },
          'solvents': {
            name: 'Petroleum Solvents',
            examples: ['mineral spirits', 'paint thinner', 'stoddard solvent'],
            compatible_within: true,
            notes: 'Moderate vapor pressure'
          }
        },
        incompatible_categories: ['oxidizers', 'oxidizing_acids', 'reactive_metals', 'aerosols'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Vapor-tight containers, static control'
      },
      
      // GROUP 2: CORROSIVE ACIDS (DOT Class 8)
      'acids_inorganic': {
        name: 'Inorganic Acids',
        description: 'Mineral acids, pH ≤2',
        dot_class: '8',
        subcategories: {
          'strong_acids': {
            name: 'Strong Mineral Acids',
            examples: ['hydrochloric acid', 'sulfuric acid', 'phosphoric acid'],
            compatible_within: false, // Need individual compatibility check
            notes: 'Each acid pair must be individually assessed'
          },
          'weak_acids': {
            name: 'Weak Inorganic Acids',
            examples: ['boric acid', 'carbonic acid'],
            compatible_within: true,
            notes: 'Generally compatible with each other'
          }
        },
        incompatible_categories: ['bases_inorganic', 'bases_organic', 'reactive_metals', 'cyanides', 'aerosols'],
        compatible_categories: [],
        packaging: 'Acid-resistant containers, secondary containment'
      },
      
      'acids_organic': {
        name: 'Organic Acids',
        description: 'Carbon-containing acids',
        dot_class: '8',
        subcategories: {
          'carboxylic_acids': {
            name: 'Carboxylic Acids',
            examples: ['acetic acid', 'formic acid', 'citric acid'],
            compatible_within: true,
            notes: 'Generally compatible with each other'
          },
          'phenolic_acids': {
            name: 'Phenolic Compounds',
            examples: ['phenol', 'cresol'],
            compatible_within: true,
            notes: 'Toxic - sealed containers required'
          }
        },
        incompatible_categories: ['bases_inorganic', 'bases_organic', 'reactive_metals'],
        compatible_categories: ['flammable_organic'], // Can mix with some organics
        packaging: 'Corrosion-resistant containers'
      },
      
      'acids_oxidizing': {
        name: 'Oxidizing Acids',
        description: 'Acids with strong oxidizing properties',
        dot_class: '8+5.1',
        subcategories: {
          'nitric_based': {
            name: 'Nitric Acid Systems',
            examples: ['nitric acid', 'nitric/sulfuric mixtures'],
            compatible_within: false, // NEVER mix oxidizing acids
            notes: 'SEPARATE CONTAINER REQUIRED - extremely dangerous'
          },
          'chromic_based': {
            name: 'Chromium-Based Oxidizers',
            examples: ['chromic acid', 'dichromate solutions'],
            compatible_within: false,
            notes: 'SEPARATE CONTAINER REQUIRED - carcinogenic'
          }
        },
        incompatible_categories: ['ALL'], // Cannot mix with anything
        compatible_categories: [],
        packaging: 'SEPARATE PACKAGING MANDATORY - special handling required'
      },
      
      // GROUP 3: CORROSIVE BASES (DOT Class 8)
      'bases_inorganic': {
        name: 'Inorganic Bases',
        description: 'Mineral bases, pH ≥12.5, LIQUIDS ONLY',
        dot_class: '8',
        subcategories: {
          'alkali_hydroxides': {
            name: 'Alkali Metal Hydroxides',
            examples: ['sodium hydroxide solution', 'potassium hydroxide solution'],
            compatible_within: true,
            notes: 'Solutions only - solids are non-hazardous'
          },
          'ammonia_based': {
            name: 'Ammonia Solutions',
            examples: ['ammonium hydroxide', 'ammonia water'],
            compatible_within: true,
            notes: 'High vapor pressure - ventilation required'
          }
        },
        incompatible_categories: ['acids_inorganic', 'acids_organic', 'acids_oxidizing', 'reactive_metals'],
        compatible_categories: ['non_hazardous_liquids'],
        packaging: 'Base-resistant containers, vapor control'
      },
      
      'bases_organic': {
        name: 'Organic Bases',
        description: 'Nitrogen-containing basic compounds',
        dot_class: '8',
        subcategories: {
          'amines': {
            name: 'Aliphatic Amines',
            examples: ['triethylamine', 'diethylamine'],
            compatible_within: true,
            notes: 'Often flammable as well - check flash point'
          }
        },
        incompatible_categories: ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Vapor-tight containers'
      },
      
      // GROUP 4: OXIDIZERS (DOT Class 5.1)
      'oxidizers': {
        name: 'Oxidizing Agents',
        description: 'Chemicals that readily give up oxygen',
        dot_class: '5.1',
        subcategories: {
          'peroxides': {
            name: 'Peroxides',
            examples: ['hydrogen peroxide', 'benzoyl peroxide'],
            compatible_within: false, // Individual assessment required
            notes: 'Concentration-dependent compatibility'
          },
          'hypochlorites': {
            name: 'Hypochlorite Solutions',
            examples: ['sodium hypochlorite', 'calcium hypochlorite'],
            compatible_within: true,
            notes: 'Chlorine gas risk with acids'
          },
          'permanganates': {
            name: 'Permanganates',
            examples: ['potassium permanganate'],
            compatible_within: true,
            notes: 'Strong oxidizer - separate from organics'
          }
        },
        incompatible_categories: ['flammable_organic', 'flammable_petroleum', 'reactive_metals'],
        compatible_categories: ['toxic_inorganic'],
        packaging: 'Non-combustible absorbent, ventilation'
      },
      
      // GROUP 5: TOXIC MATERIALS (DOT Class 6.1)
      'toxic_inorganic': {
        name: 'Inorganic Toxic Materials',
        description: 'Heavy metals and inorganic poisons',
        dot_class: '6.1',
        subcategories: {
          'heavy_metals': {
            name: 'Heavy Metal Compounds',
            examples: ['mercury compounds', 'lead compounds', 'cadmium compounds'],
            compatible_within: false, // Individual assessment needed
            notes: 'Check for reaction potential between different metals'
          },
          'metalloids': {
            name: 'Metalloid Compounds',
            examples: ['arsenic compounds', 'antimony compounds'],
            compatible_within: true,
            notes: 'Highly toxic - sealed containers'
          }
        },
        incompatible_categories: ['reactive_metals', 'cyanides'],
        compatible_categories: ['oxidizers'],
        packaging: 'Leak-proof containers, double containment'
      },
      
      'toxic_organic': {
        name: 'Organic Toxic Materials',
        description: 'Carbon-containing toxic compounds',
        dot_class: '6.1',
        subcategories: {
          'chlorinated_solvents': {
            name: 'Chlorinated Solvents',
            examples: ['methylene chloride', 'chloroform', 'carbon tetrachloride'],
            compatible_within: true,
            notes: 'Carcinogenic - vapor control essential'
          },
          'pesticides': {
            name: 'Pesticides & Herbicides',
            examples: ['organophosphates', 'carbamates'],
            compatible_within: false, // Individual assessment
            notes: 'Complex formulations - check all components'
          }
        },
        incompatible_categories: ['reactive_metals'],
        compatible_categories: ['flammable_organic'],
        packaging: 'Vapor-tight, chemical-resistant containers'
      },
      
      'cyanides': {
        name: 'Cyanide Compounds',
        description: 'Cyanide-containing materials',
        dot_class: '6.1',
        subcategories: {
          'alkali_cyanides': {
            name: 'Alkali Cyanides',
            examples: ['sodium cyanide', 'potassium cyanide'],
            compatible_within: true,
            notes: 'NEVER with acids - generates deadly HCN gas'
          }
        },
        incompatible_categories: ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
        compatible_categories: [],
        packaging: 'SEPARATE CONTAINER MANDATORY - special labeling required'
      },
      
      // GROUP 6: REACTIVE MATERIALS (DOT Class 4.2/4.3)
      'reactive_metals': {
        name: 'Reactive Metals',
        description: 'Water-reactive and pyrophoric metals',
        dot_class: '4.3',
        subcategories: {
          'alkali_metals': {
            name: 'Alkali Metals',
            examples: ['sodium metal', 'potassium metal', 'lithium metal'],
            compatible_within: false, // Individual assessment
            notes: 'KEEP DRY - violent reaction with water'
          },
          'metal_hydrides': {
            name: 'Metal Hydrides',
            examples: ['lithium aluminum hydride', 'sodium hydride'],
            compatible_within: false,
            notes: 'Generate hydrogen gas - explosion risk'
          }
        },
        incompatible_categories: ['ALL'], // Generally incompatible with most materials
        compatible_categories: [],
        packaging: 'SEPARATE CONTAINER - inert atmosphere, moisture barrier'
      },
      
      // GROUP 7: AEROSOLS & COMPRESSED GASES (DOT Class 2.1/2.2)
      'aerosols': {
        name: 'Aerosols & Compressed Gases',
        description: 'Pressurized containers',
        dot_class: '2.1/2.2',
        subcategories: {
          'flammable_aerosols': {
            name: 'Flammable Aerosols',
            examples: ['WD-40', 'spray paint', 'compressed propane'],
            compatible_within: true, // Only with other aerosols
            notes: 'Pressure hazard - cannot puncture'
          },
          'non_flammable_aerosols': {
            name: 'Non-Flammable Compressed Gases',
            examples: ['compressed air', 'nitrogen cylinders'],
            compatible_within: true,
            notes: 'Pressure hazard only'
          }
        },
        incompatible_categories: ['ALL'], // Must be separate from all liquids
        compatible_categories: [], // Only other aerosols
        packaging: 'SEPARATE CONTAINER MANDATORY - pressure relief considerations'
      },
      
      // GROUP 8: NON-HAZARDOUS MATERIALS
      'non_hazardous_liquids': {
        name: 'Non-Hazardous Liquids',
        description: 'Non-RCRA aqueous solutions and oils',
        dot_class: 'none',
        subcategories: {
          'aqueous_solutions': {
            name: 'Aqueous Solutions',
            examples: ['salt water', 'sugar solutions', 'neutral pH solutions'],
            compatible_within: true,
            notes: 'Check for contamination before mixing'
          },
          'non_hazardous_oils': {
            name: 'Non-Hazardous Oils',
            examples: ['vegetable oil', 'mineral oil (non-waste)', 'hydraulic oil (new)'],
            compatible_within: true,
            notes: 'Separate from water-based materials'
          }
        },
        incompatible_categories: [],
        compatible_categories: ['non_hazardous_solids'],
        packaging: 'Standard containers, absorbent material'
      },
      
      'non_hazardous_solids': {
        name: 'Non-Hazardous Solids',
        description: 'Solid materials not regulated under RCRA',
        dot_class: 'none',
        subcategories: {
          'inorganic_solids': {
            name: 'Inorganic Solid Chemicals',
            examples: ['sodium chloride', 'calcium carbonate', 'sodium hydroxide pellets/beads'],
            compatible_within: true,
            notes: 'Solid caustics are non-hazardous until dissolved'
          },
          'organic_solids': {
            name: 'Organic Solid Materials',
            examples: ['sucrose', 'cellulose', 'non-hazardous polymers'],
            compatible_within: true,
            notes: 'Check for contamination'
          }
        },
        incompatible_categories: [],
        compatible_categories: ['non_hazardous_liquids'],
        packaging: 'Standard containers, moisture protection'
      }
    };

    // DOT hazard class mapping for transportation
    this.dotSegregationTable = {
      '1.1': { // Explosives
        incompatible: ['1.2', '1.3', '2.1', '2.2', '2.3', '3', '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '8'],
        special_provisions: 'No other hazmat in same package'
      },
      '2.1': { // Flammable gas
        incompatible: ['1.1', '1.2', '1.3', '2.3', '4.2', '5.1', '5.2', '6.1'],
        compatible: ['2.2', '3', '4.1', '8'],
        notes: 'Keep away from ignition sources'
      },
      '2.2': { // Non-flammable gas
        incompatible: ['1.1', '1.2', '1.3'],
        compatible: ['2.1', '3', '4.1', '6.1', '8', '9'],
        notes: 'Generally compatible with most classes'
      },
      '2.3': { // Toxic gas
        incompatible: ['1.1', '1.2', '1.3', '2.1', '4.2', '5.1', '5.2'],
        special_provisions: 'Separate packaging required'
      },
      '3': { // Flammable liquid
        incompatible: ['1.1', '1.2', '1.3', '4.2', '5.1', '5.2'],
        compatible: ['2.2', '4.1', '6.1', '8', '9'],
        notes: 'Most common lab pack class'
      },
      '4.1': { // Flammable solid
        incompatible: ['1.1', '1.2', '1.3', '5.1', '5.2'],
        compatible: ['2.2', '3', '6.1', '8', '9']
      },
      '4.2': { // Spontaneously combustible
        incompatible: ['1.1', '1.2', '1.3', '2.1', '2.3', '3', '5.1', '5.2', '8'],
        special_provisions: 'Separate packaging required'
      },
      '4.3': { // Dangerous when wet
        incompatible: ['1.1', '1.2', '1.3', '3', '6.1', '8'],
        special_provisions: 'Keep dry, separate packaging'
      },
      '5.1': { // Oxidizer
        incompatible: ['1.1', '1.2', '1.3', '2.1', '2.3', '3', '4.1', '4.2', '4.3'],
        special_provisions: 'Separate from combustibles'
      },
      '5.2': { // Organic peroxide
        incompatible: ['1.1', '1.2', '1.3', '2.1', '2.3', '3', '4.1', '4.2', '5.1'],
        special_provisions: 'Temperature controlled, separate packaging'
      },
      '6.1': { // Toxic
        incompatible: ['1.1', '1.2', '1.3', '2.3', '4.3'],
        compatible: ['2.2', '3', '4.1', '8', '9'],
        notes: 'Common in lab packs'
      },
      '8': { // Corrosive
        incompatible: ['1.1', '1.2', '1.3', '4.2', '4.3'],
        compatible: ['2.2', '3', '4.1', '6.1', '9'],
        notes: 'Acids and bases must be separated'
      },
      '9': { // Miscellaneous
        compatible: ['2.2', '3', '4.1', '6.1', '8'],
        notes: 'Generally compatible'
      }
    };
  }

  /**
   * ENVIRONMENTAL CHEMIST CLASSIFICATION SYSTEM
   * Determines primary category and subcategory for lab pack compatibility
   */
  classifyChemicalForLabPack(classification, sdsText) {
    const productName = (classification.productName || '').toLowerCase();
    const hazardClass = classification.hazardClass;
    const pH = classification.pH;
    const flashPoint = classification.flashPoint?.fahrenheit;
    const physicalState = (classification.physicalState || '').toLowerCase();
    const sdsLower = (sdsText || '').toLowerCase();
    
    console.log(`🧪 CHEMIST ANALYSIS: Classifying "${classification.productName}"`);
    console.log(`   Physical State: ${physicalState}, pH: ${pH}, Flash: ${flashPoint}°F, DOT: ${hazardClass}`);
    
    // PRIORITY 1: AEROSOLS & COMPRESSED GASES (HIGHEST PRIORITY - NEVER MIX)
    // Be more specific to avoid false positives with "spray" and "paint thinner"
    const aerosolIndicators = [
      'wd-40', 'wd40', 'aerosol container', 'pressurized container', 
      'spray can', 'propellant', 'compressed gas'
    ];
    
    // Only detect as aerosol if:
    // 1. Explicitly stated as "aerosol" in physical state OR
    // 2. Product name contains specific aerosol products OR  
    // 3. DOT Class 2.1/2.2 (gases) OR
    // 4. UN numbers for aerosols
    // BUT NOT if it's clearly a liquid solvent
    const isLiquidSolvent = productName.includes('thinner') || productName.includes('spirits') || 
                           productName.includes('solvent') || productName.includes('acetone') ||
                           productName.includes('mineral spirits');
    
    const isAerosol = !isLiquidSolvent && (
      aerosolIndicators.some(indicator => productName.includes(indicator)) ||
      (hazardClass && ['2.1', '2.2'].includes(hazardClass)) ||
      (classification.unNumber && ['UN1950', 'UN1956', 'UN3074', 'UN3077', 'UN3082'].includes(classification.unNumber)) ||
      sdsLower.includes('pressurized container') || sdsLower.includes('aerosol container')
    );
    
    if (isAerosol) {
      const subcategory = (hazardClass === '2.1' || productName.includes('flammable')) ? 
        'flammable_aerosols' : 'non_flammable_aerosols';
      console.log(`   🔴 AEROSOL DETECTED: ${subcategory} - SEPARATE CONTAINER REQUIRED`);
      return { category: 'aerosols', subcategory, reasoning: 'Pressurized container - cannot mix with liquids' };
    }
    
    // PRIORITY 2: OXIDIZING ACIDS (EXTREMELY DANGEROUS - SEPARATE ALWAYS)
    const oxidizingAcids = ['nitric acid', 'chromic acid', 'perchloric acid', 'dichromic acid'];
    if (oxidizingAcids.some(acid => productName.includes(acid))) {
      const subcategory = productName.includes('nitric') ? 'nitric_based' : 'chromic_based';
      console.log(`   🔴 OXIDIZING ACID: ${subcategory} - MANDATORY SEPARATE CONTAINER`);
      return { category: 'acids_oxidizing', subcategory, reasoning: 'Oxidizing acid - cannot mix with anything' };
    }
    
    // PRIORITY 3: CYANIDES (DEADLY WITH ACIDS)
    if (productName.includes('cyanide')) {
      console.log(`   🔴 CYANIDE DETECTED - NEVER WITH ACIDS`);
      return { category: 'cyanides', subcategory: 'alkali_cyanides', reasoning: 'Cyanide - generates HCN gas with acids' };
    }
    
    // PRIORITY 4: REACTIVE METALS (WATER REACTIVE)
    const reactiveMetals = ['sodium metal', 'potassium metal', 'lithium metal', 'aluminum powder'];
    const metalHydrides = ['lithium aluminum hydride', 'sodium hydride', 'calcium hydride'];
    
    if (reactiveMetals.some(metal => productName.includes(metal)) ||
        hazardClass === '4.3' || 
        (sdsLower.includes('water reactive') && physicalState === 'solid')) {
      const subcategory = metalHydrides.some(h => productName.includes(h)) ? 'metal_hydrides' : 'alkali_metals';
      console.log(`   🔴 REACTIVE METAL: ${subcategory} - KEEP DRY, SEPARATE CONTAINER`);
      return { category: 'reactive_metals', subcategory, reasoning: 'Water reactive - violent reaction risk' };
    }
    
    // PRIORITY 5: FLAMMABLE LIQUIDS (DOT CLASS 3)
    if ((flashPoint !== null && flashPoint < 140) || 
        hazardClass === '3' || 
        (classification.federal_codes && classification.federal_codes.includes('D001'))) {
      
      // Determine subcategory by chemical family
      let subcategory = 'flammable_organic'; // default
      
      // Petroleum products (excluding paint thinner which is an organic solvent)
      const petroleumTerms = ['gasoline', 'diesel', 'petroleum', 'naphtha', 'mineral spirits', 
                             'stoddard', 'kerosene'];
      if (petroleumTerms.some(term => productName.includes(term))) {
        subcategory = petroleumTerms.slice(0, 3).some(term => productName.includes(term)) ? 
          'light_distillates' : 'solvents';
        console.log(`   🟡 FLAMMABLE PETROLEUM: ${subcategory}`);
        return { category: 'flammable_petroleum', subcategory, reasoning: `Flammable petroleum product, flash point ${flashPoint}°F` };
      }
      
      // Organic flammables - determine subcategory
      if (productName.includes('alcohol') || productName.includes('methanol') || 
          productName.includes('ethanol') || productName.includes('glycol')) {
        subcategory = 'alcohols';
      } else if (productName.includes('acetone') || productName.includes('ketone')) {
        subcategory = 'ketones';
      } else if (productName.includes('benzene') || productName.includes('toluene') || 
                 productName.includes('xylene')) {
        subcategory = 'aromatic_hydrocarbons';
      } else if (productName.includes('acetate') || productName.includes('ester')) {
        subcategory = 'esters';
      } else if (productName.includes('thinner') || productName.includes('solvent')) {
        subcategory = 'solvents';
      }
      
      console.log(`   🟡 FLAMMABLE ORGANIC: ${subcategory}`);
      return { category: 'flammable_organic', subcategory, reasoning: `Flammable organic liquid, flash point ${flashPoint}°F` };
    }
    
    // PRIORITY 6: CORROSIVE ACIDS (pH ≤ 2, LIQUIDS ONLY)
    if (physicalState === 'liquid' && pH !== null && pH <= 2) {
      // Determine if organic or inorganic
      const organicAcids = ['acetic', 'citric', 'formic', 'oxalic', 'tartaric'];
      const isOrganic = organicAcids.some(acid => productName.includes(acid)) || 
                        sdsLower.includes('organic acid') || productName.includes('phenol');
      
      if (isOrganic) {
        const subcategory = productName.includes('phenol') ? 'phenolic_acids' : 'carboxylic_acids';
        console.log(`   🟠 ORGANIC ACID: ${subcategory}`);
        return { category: 'acids_organic', subcategory, reasoning: `Organic acid, pH ${pH}` };
      } else {
        // Inorganic acids
        const weakAcids = ['boric', 'carbonic'];
        const subcategory = weakAcids.some(acid => productName.includes(acid)) ? 'weak_acids' : 'strong_acids';
        console.log(`   🟠 INORGANIC ACID: ${subcategory}`);
        return { category: 'acids_inorganic', subcategory, reasoning: `Inorganic acid, pH ${pH}` };
      }
    }
    
    // PRIORITY 7: CORROSIVE BASES (pH ≥ 12.5, LIQUIDS ONLY)
    if (physicalState === 'liquid' && pH !== null && pH >= 12.5) {
      // Determine subcategory
      const subcategory = (productName.includes('ammonia') || productName.includes('ammonium')) ? 
        'ammonia_based' : 'alkali_hydroxides';
      console.log(`   🟣 INORGANIC BASE: ${subcategory}`);
      return { category: 'bases_inorganic', subcategory, reasoning: `Inorganic base, pH ${pH}` };
    }
    
    // PRIORITY 8: OXIDIZERS (DOT CLASS 5.1)
    if (hazardClass === '5.1' || 
        productName.includes('peroxide') || 
        productName.includes('hypochlorite') || 
        productName.includes('permanganate') ||
        productName.includes('chlorate')) {
      
      let subcategory = 'peroxides'; // default
      if (productName.includes('hypochlorite') || productName.includes('bleach')) {
        subcategory = 'hypochlorites';
      } else if (productName.includes('permanganate')) {
        subcategory = 'permanganates';
      }
      
      console.log(`   🔶 OXIDIZER: ${subcategory}`);
      return { category: 'oxidizers', subcategory, reasoning: 'Oxidizing agent - keep from combustibles' };
    }
    
    // PRIORITY 9: TOXIC MATERIALS (DOT CLASS 6.1)
    if (hazardClass === '6.1' || 
        classification.federal_codes?.some(code => code.startsWith('D')) ||
        productName.includes('mercury') || productName.includes('lead') || 
        productName.includes('cadmium') || productName.includes('arsenic')) {
      
      // Determine if organic or inorganic toxic
      const chlorinatedSolvents = ['methylene chloride', 'chloroform', 'carbon tetrachloride', 
                                  'trichloroethylene', 'perchloroethylene'];
      const heavyMetals = ['mercury', 'lead', 'cadmium', 'chromium', 'nickel'];
      
      if (chlorinatedSolvents.some(solv => productName.includes(solv))) {
        console.log(`   🟤 TOXIC ORGANIC: chlorinated_solvents`);
        return { category: 'toxic_organic', subcategory: 'chlorinated_solvents', reasoning: 'Chlorinated solvent - carcinogenic' };
      } else if (productName.includes('pesticide') || productName.includes('herbicide')) {
        console.log(`   🟤 TOXIC ORGANIC: pesticides`);
        return { category: 'toxic_organic', subcategory: 'pesticides', reasoning: 'Pesticide formulation' };
      } else if (heavyMetals.some(metal => productName.includes(metal))) {
        console.log(`   🟤 TOXIC INORGANIC: heavy_metals`);
        return { category: 'toxic_inorganic', subcategory: 'heavy_metals', reasoning: 'Heavy metal compound' };
      } else {
        console.log(`   🟤 TOXIC INORGANIC: metalloids`);
        return { category: 'toxic_inorganic', subcategory: 'metalloids', reasoning: 'Toxic inorganic compound' };
      }
    }
    
    // PRIORITY 10: NON-HAZARDOUS MATERIALS
    // Solid caustics are non-hazardous until dissolved
    if (physicalState === 'solid' && 
        (productName.includes('sodium hydroxide') || 
         productName.includes('caustic soda') ||
         productName.includes('potassium hydroxide') ||
         productName.includes('beads') || productName.includes('pellets'))) {
      console.log(`   ⚪ NON-HAZARDOUS SOLID: inorganic_solids (solid caustic)`);
      return { category: 'non_hazardous_solids', subcategory: 'inorganic_solids', 
               reasoning: 'Solid caustic - non-hazardous until dissolved' };
    }
    
    // Other non-hazardous liquids
    if (physicalState === 'liquid' && 
        (classification.final_classification === 'non-hazardous' || 
         (!classification.federal_codes || classification.federal_codes.length === 0))) {
      
      const subcategory = (productName.includes('oil') || productName.includes('grease')) ? 
        'non_hazardous_oils' : 'aqueous_solutions';
      console.log(`   ⚪ NON-HAZARDOUS LIQUID: ${subcategory}`);
      return { category: 'non_hazardous_liquids', subcategory, reasoning: 'Non-RCRA regulated liquid' };
    }
    
    // Other non-hazardous solids
    if (physicalState === 'solid') {
      const subcategory = (sdsLower.includes('organic') || productName.includes('polymer')) ? 
        'organic_solids' : 'inorganic_solids';
      console.log(`   ⚪ NON-HAZARDOUS SOLID: ${subcategory}`);
      return { category: 'non_hazardous_solids', subcategory, reasoning: 'Non-RCRA regulated solid' };
    }
    
    // Default fallback
    console.log(`   ❓ UNCLASSIFIED - defaulting to non-hazardous liquid`);
    return { category: 'non_hazardous_liquids', subcategory: 'aqueous_solutions', 
             reasoning: 'Unable to classify - treating as non-hazardous' };
  }

  /**
   * Apply permanent classification overrides for regulatory compliance
   * This ensures correct classification regardless of AI responses
   */
  applyClassificationOverrides(classification, sdsText) {
    const productName = (classification.productName || '').toLowerCase();
    const physicalState = (classification.physicalState || '').toLowerCase();
    const sdsTextLower = sdsText.toLowerCase();

    // Override 0: Aerosol Detection and Correction (Highest Priority)
    // Only apply if explicitly confirmed as aerosol - avoid false positives
    const aerosolIndicators = [
      'wd-40', 'wd40', 'aerosol container', 'spray can'
    ];
    
    // Very specific aerosol detection to avoid false positives with paint thinner
    // Do NOT classify as aerosol if it's clearly a liquid solvent
    const isLiquidSolvent = productName.includes('thinner') || productName.includes('spirits') || 
                           productName.includes('solvent') || productName.includes('acetone') ||
                           (classification.flashPoint && classification.flashPoint.fahrenheit > 80);
    
    const isAerosol = !isLiquidSolvent && (
      aerosolIndicators.some(indicator => productName.includes(indicator)) ||
      (classification.hazardClass && (classification.hazardClass === '2.1' || classification.hazardClass === '2.2')) ||
      sdsTextLower.includes('pressurized container') || sdsTextLower.includes('aerosol container')
    );
    
    if (isAerosol) {
      console.log(`🔧 OVERRIDE: Correcting aerosol classification for ${classification.productName}`);
      
      // Force aerosol classification
      classification.physicalState = 'aerosol';
      classification.state_form_code = '208';
      classification.state_classification = classification.federal_codes?.length > 0 ? 'H' : '1';
      classification.state_codes = [`208-${classification.state_classification}`];
      classification.precedence_reasoning = (classification.precedence_reasoning || '') + ' [CORRECTED: Aerosol product - requires separate container in lab pack]';
      classification._aerosol_override_applied = true;
      
      // Clear any liquid-based codes that might have been incorrectly assigned
      if (classification.state_codes) {
        classification.state_codes = classification.state_codes.filter(code => !code.startsWith('203') && !code.startsWith('202'));
      }
    } else {
      // PHYSICAL STATE CORRECTION: Fix AI misclassifications
      const isLiquidSolvent = productName.includes('thinner') || productName.includes('spirits') || 
                             productName.includes('solvent') || productName.includes('acetone');
      
      if (isLiquidSolvent && classification.physicalState === 'aerosol') {
        console.log(`🔧 OVERRIDE: Correcting physical state from aerosol to liquid for ${classification.productName}`);
        classification.physicalState = 'liquid';
        classification.precedence_reasoning = (classification.precedence_reasoning || '').replace(/\[CORRECTED: Aerosol[^\]]*\]/g, '') + ' [CORRECTED: Physical state changed from aerosol to liquid for solvent]';
        classification._aerosol_override_applied = false;
      }
    }

    // Override 1: Solid caustic materials - ALWAYS non-hazardous
    const solidCausticIndicators = [
      'sodium hydroxide',
      'caustic soda', 
      'potassium hydroxide',
      'caustic potash',
      'naoh',
      'koh'
    ];

    const solidStateIndicators = [
      'pellets',
      'beads',
      'flakes',
      'solid',
      'granules',
      'powder',
      'crystals'
    ];

    const isSolidCaustic = solidCausticIndicators.some(indicator => 
      productName.includes(indicator) || sdsTextLower.includes(indicator)
    ) && (
      physicalState === 'solid' || 
      solidStateIndicators.some(solid => 
        productName.includes(solid) || sdsTextLower.includes(solid)
      )
    );

    if (isSolidCaustic) {
      console.log(`🔧 OVERRIDE: Correcting solid caustic classification for ${classification.productName}`);
      
      // Preserve or improve the product name for caustic materials
      if (!classification.productName || classification.productName === 'Unknown Product' || 
          classification.productName.toLowerCase().includes('identifier')) {
        // Try to extract a better product name from the SDS text
        const betterName = this.extractProductName(sdsText);
        if (betterName && betterName !== 'Unknown Product') {
          classification.productName = betterName;
          console.log(`📝 Updated product name to: ${betterName}`);
        } else {
          classification.productName = 'Caustic Soda Beads'; // Fallback for caustic materials
        }
      }
      
      // Remove D002 corrosive code (pH-based) since it only applies to liquids
      if (classification.federal_codes) {
        classification.federal_codes = classification.federal_codes.filter(code => code !== 'D002');
      }
      
      // Keep other hazard codes if they exist (D004-D043 for metals, etc.)
      const hasOtherFederalCodes = classification.federal_codes && classification.federal_codes.length > 0;
      
      if (hasOtherFederalCodes) {
        classification.final_classification = 'hazardous';
        classification.precedence_reasoning = 'OVERRIDE: Solid caustic - removed D002 (liquids only) but retained other federal codes';
      } else {
        classification.federal_codes = [];
        classification.final_classification = 'non-hazardous';
        classification.precedence_reasoning = 'OVERRIDE: Solid caustic materials are non-corrosive per 40 CFR 261.21 (D002 applies only to liquids)';
      }
      
      classification.classification_authority = 'federal';
      
      // State classification - solid caustic materials get form code 305 (caustic solid)
      classification.state_form_code = '305';
      classification.state_classification = hasOtherFederalCodes ? 'H' : '1'; // Caustic materials are Class 1
      classification.state_codes = [`305-${classification.state_classification}`];
      classification._state_override_applied = true; // Mark as manually set
    }

    // Override 2: Motor oil and petroleum products (non-waste oil)
    const petroleumNonHazardousIndicators = [
      'motor oil',
      'engine oil', 
      'lubricating oil',
      'hydraulic oil'
    ];

    const isPetroleumNonHazardous = petroleumNonHazardousIndicators.some(indicator => 
      productName.includes(indicator) || sdsTextLower.includes(indicator)
    ) && !sdsTextLower.includes('waste') && !sdsTextLower.includes('used');

    if (isPetroleumNonHazardous && (!classification.flashPoint || classification.flashPoint.fahrenheit >= 140)) {
      console.log(`🔧 OVERRIDE: Correcting petroleum product classification for ${classification.productName}`);
      classification.federal_codes = [];
      classification.final_classification = 'non-hazardous';
      classification.state_form_code = '219';
      classification.state_classification = '2'; // Petroleum products are Class 2 minimum
      classification.state_codes = ['219-2'];
      classification._state_override_applied = true; // Mark as manually set
    }

    // DISABLED: State classification deactivated to focus on federal only
    // this.applyCorrectStateClassification(classification);

    return classification;
  }


  /**
   * Apply Texas state classification based on material properties
   */
  applyTexasStateClassification(classification) {
    const productName = (classification.productName || '').toLowerCase();
    const physicalState = classification.physicalState || 'liquid';
    const pH = classification.pH;
    const isHazardous = classification.final_classification === 'hazardous' || 
                       (classification.federal_codes && classification.federal_codes.length > 0);
    
    console.log(`📋 Determining Texas classification for: ${classification.productName}`);
    console.log(`   Physical State: ${physicalState}, pH: ${pH}, Hazardous: ${isHazardous}`);
    
    let formCode = '102'; // Default to aqueous waste
    let stateClass = isHazardous ? 'H' : '3'; // H for hazardous, 3 for non-hazardous
    let reasoning = 'default classification';
    
    // Determine form code based on material type and physical state
    if (physicalState === 'aerosol') {
      formCode = '208';
      reasoning = 'aerosol/pressurized container';
    } else if (physicalState === 'solid') {
      formCode = '204'; 
      reasoning = 'solid laboratory chemical';
    } else if (physicalState === 'gas') {
      formCode = '209';
      reasoning = 'gaseous material';
    } else if (pH !== null && pH !== undefined) {
      // pH-based classification for liquids
      if (pH <= 2.0) {
        formCode = '105';
        reasoning = 'acidic liquid';
      } else if (pH >= 12.5) {
        formCode = '106';
        reasoning = 'alkaline liquid';
      } else {
        formCode = '102';
        reasoning = 'neutral aqueous liquid';
      }
    } else {
      // Chemical type-based classification
      if (productName.includes('acid') || productName.includes('muriatic') || 
          productName.includes('sulfuric') || productName.includes('hydrochloric')) {
        formCode = '105';
        reasoning = 'identified as acid';
      } else if (productName.includes('caustic') || productName.includes('sodium hydroxide') ||
                productName.includes('potassium hydroxide') || productName.includes('lye')) {
        formCode = '106';
        reasoning = 'identified as caustic';
      } else if (productName.includes('acetone') || productName.includes('solvent') ||
                productName.includes('thinner') || productName.includes('alcohol')) {
        formCode = '203';
        reasoning = 'organic solvent';
      } else if (productName.includes('oil') || productName.includes('diesel') ||
                productName.includes('gasoline') || productName.includes('petroleum')) {
        formCode = '202';
        reasoning = 'petroleum product';
      }
    }
    
    // Apply Texas classification
    classification.state_form_code = formCode;
    classification.state_classification = stateClass;
    classification.state_codes = [`${formCode}-${stateClass}`];
    
    console.log(`✅ Texas classification: Form Code ${formCode}-${stateClass} (${reasoning})`);
    
    return classification;
  }

  /**
   * Apply correct Texas state classification based on material type and hazard status
   */
  applyCorrectStateClassification(classification) {
    const productName = (classification.productName || '').toLowerCase();
    const isHazardous = classification.final_classification === 'hazardous' || 
                       (classification.federal_codes && classification.federal_codes.length > 0);
    
    console.log(`📋 Analyzing state classification for: ${classification.productName} (hazardous: ${isHazardous})`);
    
    // Comprehensive Texas form code mappings (54 total codes)
    let formCode = '110'; // Default to laboratory chemical
    let reason = 'laboratory chemical (default)';
    
    // ACIDS (105 series)
    if (productName.includes('muriatic') || productName.includes('hydrochloric') ||
        productName.includes('sulfuric') || productName.includes('nitric') ||
        productName.includes('phosphoric') || productName.includes('chromic') ||
        productName.includes('acid') && classification.federal_codes?.includes('D002')) {
      formCode = '105';
      reason = 'acid waste';
    }
    // BASES/CAUSTICS - liquid (106 series) vs solid (305 series)
    else if (productName.includes('sodium hydroxide') || productName.includes('potassium hydroxide') ||
             productName.includes('ammonium hydroxide') || productName.includes('caustic') ||
             productName.includes('alkaline') || productName.includes('lime') ||
             (productName.includes('hydroxide') && classification.federal_codes?.includes('D002'))) {
      // Check if solid vs liquid caustic
      if (classification.physicalState === 'solid' || 
          productName.includes('pellets') || productName.includes('beads') || 
          productName.includes('flakes') || productName.includes('solid')) {
        formCode = '305';
        reason = 'caustic solid';
      } else {
        formCode = '106';
        reason = 'alkaline/caustic liquid';
      }
    }
    // PETROLEUM PRODUCTS (202 series)
    else if (productName.includes('diesel') || productName.includes('gasoline') ||
             productName.includes('fuel oil') || productName.includes('jet fuel') ||
             productName.includes('kerosene') || productName.includes('petroleum') ||
             productName.includes('naphtha')) {
      formCode = '202';
      reason = 'petroleum product';
    }
    // ORGANIC SOLVENTS (203 series)
    else if (productName.includes('acetone') || productName.includes('methanol') ||
             productName.includes('ethanol') || productName.includes('isopropyl') ||
             productName.includes('toluene') || productName.includes('xylene') ||
             productName.includes('benzene') || productName.includes('solvent') ||
             classification.federal_codes?.includes('D001')) {
      formCode = '203';
      reason = 'organic solvent';
    }
    // HALOGENATED SOLVENTS (201 series)
    else if (productName.includes('methylene chloride') || productName.includes('trichloroethylene') ||
             productName.includes('perchloroethylene') || productName.includes('chlorinated')) {
      formCode = '201';
      reason = 'halogenated solvent';
    }
    // USED OILS (219 series)
    else if (productName.includes('motor oil') || productName.includes('lubricating oil') ||
             productName.includes('hydraulic oil') || productName.includes('gear oil') ||
             (productName.includes('oil') && !isHazardous)) {
      formCode = '219';
      reason = 'used oil';
    }
    // AEROSOLS/COMPRESSED GASES (301 series)
    else if (productName.includes('aerosol') || productName.includes('compressed gas') ||
             productName.includes('spray') || productName.includes('wd-40') ||
             classification.physicalState === 'aerosol' ||
             (classification.hazardClass && classification.hazardClass.startsWith('2.'))) {
      formCode = '301';
      reason = 'aerosol/compressed gas';
    }
    // PAINT/COATINGS (303 series for water-based, 203 for solvent-based)
    else if (productName.includes('paint')) {
      if (productName.includes('latex') || productName.includes('water-based') || 
          productName.includes('acrylic') || !isHazardous) {
        formCode = '303';
        reason = 'water-based paint';
      } else {
        formCode = '203';
        reason = 'solvent-based paint';
      }
    }
    // PAINT THINNER/LACQUER THINNER (203 series)
    else if (productName.includes('thinner') || productName.includes('lacquer')) {
      formCode = '203';
      reason = 'paint/lacquer thinner';
    }
    // BATTERIES (502 series)
    else if (productName.includes('battery') || productName.includes('batteries') ||
             productName.includes('lead acid') || productName.includes('nicad') ||
             productName.includes('lithium battery')) {
      formCode = '502';
      reason = 'batteries';
    }
    // FLUORESCENT LAMPS (108 series)
    else if (productName.includes('fluorescent') || productName.includes('mercury lamp') ||
             productName.includes('bulb') || productName.includes('lamp')) {
      formCode = '108';
      reason = 'fluorescent lamps';
    }
    // HYPOCHLORITE/BLEACH (aqueous - 102 series)
    else if (productName.includes('hypochlorite') || productName.includes('bleach') ||
             productName.includes('sodium hypochlorite')) {
      formCode = '102';
      reason = 'aqueous solution (hypochlorite)';
    }
    // AQUEOUS SOLUTIONS (102 series) - general aqueous wastes
    else if (productName.includes('aqueous') || productName.includes('solution') ||
             productName.includes('wastewater') || classification.physicalState === 'liquid') {
      formCode = '102';
      reason = 'aqueous solution';
    }
    
    // Determine classification suffix
    const classificationSuffix = isHazardous ? 'H' : '3';
    
    // Update state codes
    const oldCode = `${classification.state_form_code || 'undefined'}-${classification.state_classification || 'undefined'}`;
    classification.state_form_code = formCode;
    classification.state_classification = classificationSuffix;
    classification.state_codes = [`${formCode}-${classificationSuffix}`];
    
    console.log(`📋 State classification: ${classification.productName} → ${formCode}-${classificationSuffix} (${reason}, ${isHazardous ? 'hazardous' : 'non-hazardous'}) [was: ${oldCode}]`);
  }

  /**
   * Process multiple SDS files for lab pack analysis
   */
  async processBatch(files, options = {}) {
    const {
      state = 'TX',
      aiProvider = 'gemini',
      maxConcurrent = 3, // Process 3 at a time to avoid rate limits
      labPackType = 'standard' // standard, chempack, etc.
    } = options;

    console.log(`🧪 Starting batch processing of ${files.length} containers for lab pack`);
    console.log(`📋 Files received: ${files.map(f => f.originalname).join(', ')}`);

    const results = {
      containers: [],
      compatibility: {
        compatible_groups: [],
        incompatible_pairs: [],
        segregation_required: []
      },
      lab_pack_summary: {
        total_containers: files.length,
        hazard_classes: new Set(),
        regulatory_status: 'pending',
        shipping_name: 'Laboratory chemicals, n.o.s.',
        un_number: 'UN3432'
      },
      processing_time: Date.now()
    };

    // DEBUG: Log all files received
    console.log('📋 FILES RECEIVED:', files.map(f => ({
      originalname: f.originalname,
      path: f.path,
      size: f.size
    })));
    
    // Process each file individually to ensure all are processed
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📦 Processing container ${i + 1}/${files.length}: ${file.originalname}`);
      console.log(`   File path: ${file.path}, Size: ${file.size} bytes`);
      
      try {
        // Process single file
        const result = await this.processSingleContainer(file, { state, aiProvider });
        results.containers.push(result);
        console.log(`✅ Container ${i + 1} completed: ${file.originalname}`);
        console.log(`   Results so far: ${results.containers.length} containers`);
        
      } catch (error) {
        console.error(`❌ Container ${i + 1} failed:`, error.message);
        console.error(`   Full error:`, error);
        
        // Add failed result
        results.containers.push({
          container_id: i + 1,
          filename: file.originalname,
          error: error.message,
          classification: {
            productName: file.originalname.replace(/\.(pdf|txt)$/i, ''),
            hazardClass: null,
            packingGroup: null,
            flashPoint: null,
            pH: null,
            physicalState: 'unknown',
            classification_authority: 'failed',
            federal_codes: [],
            state_codes: [],
            final_classification: 'failed',
            error: error.message
          }
        });
      }
    }

    // Analyze compatibility between all containers
    results.compatibility = this.analyzeCompatibility(results.containers);
    
    // Generate lab pack summary
    results.lab_pack_summary = this.generateLabPackSummary(results.containers, labPackType);
    results.processing_time = Date.now() - results.processing_time;

    console.log(`✅ Batch processing complete: ${results.containers.length} containers analyzed`);
    return results;
  }

  /**
   * Process multiple SDS files in a single API request to reduce rate limit issues
   */
  async processBatchedContainers(files, options = {}) {
    const { state = 'TX', aiProvider = 'gemini' } = options;
    
    // Process files individually since AI batch processing is unreliable
    console.log(`🔄 Processing ${files.length} files individually for accurate results`);
    console.log(`📋 Files to process: ${files.map(f => f.originalname).join(', ')}`);
    const individualResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.processSingleContainer(file, options);
        individualResults.push({
          container_id: i + 1,
          filename: file.originalname,
          ...result
        });
        console.log(`✅ Processed ${i + 1}/${files.length}: ${file.originalname}`);
      } catch (error) {
        console.error(`❌ Failed to process ${file.originalname}:`, error);
        individualResults.push({
          container_id: i + 1,
          filename: file.originalname,
          error: error.message,
          classification: {
            productName: file.originalname || 'Unknown',
            hazardClass: null,
            packingGroup: null,
            flashPoint: null,
            pH: null,
            physicalState: 'unknown',
            classification_authority: 'failed',
            federal_codes: [],
            state_codes: [],
            final_classification: 'failed',
            error: error.message
          }
        });
      }
    }
    
    console.log(`🎯 Individual processing complete: ${individualResults.length} results from ${files.length} files`);
    console.log(`📊 Results summary: ${individualResults.map(r => `${r.filename}: ${r.error ? 'ERROR' : 'SUCCESS'}`).join(', ')}`);
    return individualResults;
    
    /* Original batch processing code - keeping for future reference when AI improves
    const batchSize = Math.min(files.length, 8); // Process up to 8 files per API call
    
    try {
      // Extract text from all files first
      const sdsDocuments = [];
      const cachedResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // CACHE DISABLED: Always reprocess files to use improved AI classification
        // This ensures all files benefit from the latest environmental chemist standards
        console.log(`🔄 Processing ${file.originalname} with latest AI classification (cache disabled for quality)`);
        
        try {
          let rawText;
          const buffer = fs.readFileSync(file.path);
          
          const isPDF = file.originalname?.toLowerCase().endsWith('.pdf') || 
                        (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
          
          if (isPDF) {
            const parsed = await pdfParse(buffer);
            rawText = parsed.text;
          } else {
            rawText = buffer.toString('utf8');
          }

          sdsDocuments.push({
            filename: file.originalname,
            content: rawText.substring(0, 8000), // Limit per document to stay within token limits
            container_id: i + 1
          });

          // Don't clean up file yet - will be cleaned up after analysis
        } catch (error) {
          console.error(`❌ Failed to extract text from ${file.originalname}:`, error);
          sdsDocuments.push({
            filename: file.originalname,
            content: '',
            container_id: i + 1,
            error: `Text extraction failed: ${error.message}`
          });
        }
      }

      // Create batched analysis prompt
      const batchedPrompt = this.buildBatchedAnalysisPrompt(sdsDocuments, state);
      
      // Analyze with AI provider
      let analysisResult;
      let primaryError;
      
      try {
        console.log(`🔍 Analyzing batch of ${sdsDocuments.length} containers with ${aiProvider}...`);
        analysisResult = await this.aiProviders.analyze(batchedPrompt, aiProvider);
      } catch (error) {
        console.log(`Primary provider ${aiProvider} failed, trying fallback...`);
        primaryError = error;
        
        // Try fallback providers
        const fallbackProviders = ['groq', 'openai'].filter(p => p !== aiProvider);
        
        for (const fallbackProvider of fallbackProviders) {
          try {
            console.log(`🔍 Analyzing batch with ${fallbackProvider} using regulatory hierarchy...`);
            analysisResult = await this.aiProviders.analyze(batchedPrompt, fallbackProvider);
            console.log(`✅ Fallback to ${fallbackProvider} successful`);
            break;
          } catch (fallbackError) {
            console.log(`Fallback ${fallbackProvider} also failed:`, fallbackError.message);
            continue;
          }
        }
        
        if (!analysisResult) {
          throw primaryError;
        }
      }

      // Parse the batched response
      const result = this.parseBatchedResponse(analysisResult, sdsDocuments);
      
      // Clean up files after successful processing
      files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup file ${file.path}:`, cleanupError.message);
        }
      });
      
      return result;

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      console.log('🔄 Falling back to individual processing...');
      
      // Fall back to processing files individually
      const individualResults = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`🔍 Processing container ${i + 1}/${files.length} individually: ${file.originalname}`);
        
        try {
          // CACHE DISABLED: Always reprocess to ensure latest classification quality
          console.log(`🔄 Processing ${file.originalname} with enhanced environmental chemist classification`);
          // This ensures all files get the benefit of improved AI prompts and classification overrides
          
          // Read the file
          const fileData = fs.readFileSync(file.path);
          const sdsText = await pdfParse(fileData);
          
          // Use regulatory hierarchy prompt for individual analysis
          const prompt = this.regulatoryHierarchy.buildLabPackPrompt(sdsText.text, state);
          
          // Try to analyze with available providers
          let analysisResult;
          try {
            analysisResult = await this.aiProviders.analyze(prompt, aiProvider);
          } catch (providerError) {
            // Try fallback providers
            const fallbackProviders = ['groq', 'openai', 'gemini'].filter(p => p !== aiProvider);
            for (const fallback of fallbackProviders) {
              try {
                analysisResult = await this.aiProviders.analyze(prompt, fallback);
                break;
              } catch (e) {
                continue;
              }
            }
          }
          
          if (analysisResult) {
            // Parse individual result
            let classification = this.parseIndividualResponse(analysisResult);
            
            // Apply overrides
            classification = this.applyClassificationOverrides(classification, sdsText.text);
            this.applyCorrectStateClassification(classification);
            
            // VALIDATE AND CORRECT with known chemical database
            const validationResult = this.validator.validateAndCorrect(classification, file.originalname, sdsText.text);
            classification = validationResult.classification;
            if (validationResult.issues.length > 0) {
              console.log(`   🔧 Validation fixed ${validationResult.issues.length} issues`);
            }
            
            // Note: Classifications are saved to database only when user exports to planner
            // This ensures only verified, corrected data gets stored
            
            individualResults.push({
              container_id: i + 1,
              filename: file.originalname,
              classification: classification,
              analysis_provider: 'individual',
              processing_time: new Date().toISOString()
            });
          } else {
            throw new Error('All AI providers failed');
          }
        } catch (individualError) {
          console.error(`❌ Failed to process ${file.originalname}:`, individualError.message);
          individualResults.push({
            container_id: i + 1,
            filename: file.originalname,
            error: individualError.message,
            classification: {
              productName: file.originalname || 'Unknown',
              hazardClass: null,
              packingGroup: null,
              flashPoint: null,
              pH: null,
              physicalState: 'unknown',
              classification_authority: 'failed',
              federal_codes: [],
              state_codes: [],
              final_classification: 'failed',
              error: individualError.message
            }
          });
        }
      }
      
      // Clean up files after processing
      files.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup file ${file.path}:`, cleanupError.message);
        }
      });
      
      return individualResults;
    }
    */
  }

  /**
   * Parse individual AI response (for fallback processing)
   */
  parseIndividualResponse(analysisResult) {
    try {
      // Clean the response - remove markdown code blocks
      let cleanedResult = analysisResult;
      
      if (cleanedResult.includes('```json')) {
        const jsonMatch = cleanedResult.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResult = jsonMatch[1];
        }
      } else if (cleanedResult.includes('```')) {
        const jsonMatch = cleanedResult.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResult = jsonMatch[1];
        }
      }
      
      // Extract JSON object
      const objectMatch = cleanedResult.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (objectMatch) {
        cleanedResult = objectMatch[0];
      }
      
      return JSON.parse(cleanedResult.trim());
    } catch (error) {
      console.error('Failed to parse individual response:', error);
      return {
        productName: 'Unknown',
        hazardClass: null,
        packingGroup: null,
        flashPoint: null,
        pH: null,
        physicalState: 'unknown',
        classification_authority: 'failed',
        federal_codes: [],
        state_codes: [],
        final_classification: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Build prompt for analyzing multiple SDS documents in one request
   */
  buildBatchedAnalysisPrompt(sdsDocuments, state = 'TX') {
    const documentsText = sdsDocuments.map((doc, index) => {
      if (doc.error) {
        return `DOCUMENT ${index + 1} (${doc.filename}): ERROR - ${doc.error}`;
      }
      return `DOCUMENT ${index + 1} (${doc.filename}):\n${doc.content}\n${'='.repeat(80)}`;
    }).join('\n\n');

    return `You are a certified hazardous waste expert analyzing multiple SDS documents for lab pack planning. Analyze each document separately and return a JSON array with one classification object per document.

CLASSIFICATION AUTHORITY HIERARCHY:
1. FEDERAL (EPA RCRA) - Primary Authority
   - D001: Flash point <60°C (LIQUIDS ONLY) 
   - D002: pH ≤2 or ≥12.5 (LIQUIDS AND AQUEOUS SOLUTIONS ONLY - NOT SOLIDS)
   - D003-D043: Other characteristics
   - F/K/P/U codes: Listed wastes

2. STATE (${state}) - Secondary Authority  
   - Texas codes: 102 (aqueous), 202 (petroleum), 203 (solvents), 204 (lab chemicals)
   - Classifications: H (hazardous), 1 (Class 1), 2 (Class 2), 3 (Class 3)

CRITICAL PHYSICAL STATE RULES:
- D002 ONLY applies to LIQUIDS with pH ≤2 or ≥12.5 - NEVER to dry solids
- Caustic soda beads/pellets = NON-HAZARDOUS (solid form)
- D001 ONLY applies to LIQUIDS with flash <140°F/60°C or readily ignitable solids

SDS DOCUMENTS TO ANALYZE:
${documentsText}

Return JSON array with this exact structure:
[
  {
    "document_id": 1,
    "filename": "exact filename from above",
    "productName": "exact product name from SDS",
    "physicalState": "liquid|solid|gas|aerosol",
    "pH": number_or_null,
    "flashPoint": {"celsius": number, "fahrenheit": number},
    "hazardClass": "DOT class like 3, 8, 6.1, etc.",
    "federal_codes": ["D001", "F003"],
    "state_form_code": "102|202|203|204|etc",
    "state_classification": "H|1|2|3",
    "final_classification": "hazardous|non-hazardous",
    "error": null
  }
]

IMPORTANT: Return ONLY the JSON array, no markdown or extra text.`;
  }

  /**
   * Parse batched AI response into individual container results
   */
  parseBatchedResponse(analysisResult, sdsDocuments) {
    try {
      console.log('Raw response:', analysisResult.substring(0, 500));
      
      // Clean the response - remove markdown code blocks and explanation text
      let cleanedResult = analysisResult;
      
      // Extract JSON from markdown code blocks
      if (cleanedResult.includes('```json')) {
        const jsonMatch = cleanedResult.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResult = jsonMatch[1];
        }
      } else if (cleanedResult.includes('```')) {
        const jsonMatch = cleanedResult.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResult = jsonMatch[1];
        }
      }
      
      // Look for JSON in the response - improved extraction
      // First try to find an array
      const arrayMatch = cleanedResult.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (arrayMatch) {
        cleanedResult = arrayMatch[0];
      } else {
        // Look for individual JSON objects - improved regex for nested objects
        const jsonMatches = cleanedResult.match(/\{[\s\S]*?\}(?=\s*$|\s*\n\s*$|\s*```)/g);
        if (jsonMatches && jsonMatches.length > 0) {
          // Take the last complete JSON object (usually the final structured response)
          cleanedResult = jsonMatches[jsonMatches.length - 1];
          console.log(`🔍 Found JSON object: ${cleanedResult.substring(0, 100)}...`);
        }
      }
      
      cleanedResult = cleanedResult.trim();
      
      // Try to parse the JSON
      let classifications;
      try {
        classifications = JSON.parse(cleanedResult);
      } catch (parseError) {
        console.error('Failed to parse JSON:', cleanedResult.substring(0, 200));
        console.error('Parse error:', parseError.message);
        
        // As a last resort, try to extract just the essential fields
        const fallbackClassification = {
          productName: 'Unknown',
          hazardClass: null,
          packingGroup: null,
          flashPoint: null,
          pH: null,
          physicalState: 'unknown',
          classification_authority: 'failed',
          federal_codes: [],
          state_codes: [],
          final_classification: 'failed',
          error: 'Failed to parse AI response'
        };
        
        // Try to extract product name
        const productNameMatch = analysisResult.match(/"productName"\s*:\s*"([^"]+)"/);
        if (productNameMatch) {
          fallbackClassification.productName = productNameMatch[1];
        }
        
        classifications = [fallbackClassification];
      }
      
      // If single object returned and we're processing multiple documents, wrap it
      if (!Array.isArray(classifications)) {
        if (sdsDocuments.length === 1) {
          // Single document, single classification is expected
          console.log('Single classification for single document - expected behavior');
          classifications = [classifications];
        } else {
          // Multiple documents but single classification - this is an error
          console.log('⚠️ Single classification returned for multiple documents - batch processing failed');
          throw new Error('Batch AI processing returned single result for multiple documents');
        }
      }

      // Process each classification and apply overrides
      const results = classifications.map((classification, index) => {
        try {
          // Find corresponding SDS document
          const sdsDoc = sdsDocuments.find(doc => 
            doc.container_id === classification.document_id || 
            doc.filename === classification.filename
          ) || sdsDocuments[index];

          if (!sdsDoc) {
            throw new Error(`No matching SDS document for classification ${index + 1}`);
          }

          // Enhanced property extraction using multiParser for missing values
          console.log(`🔍 Checking for missing properties in ${classification.filename}...`);
          
          const hasPhysicalState = classification.physicalState && classification.physicalState !== 'unknown';
          const hasFlashPoint = classification.flashPoint && classification.flashPoint !== null;
          const hasPH = classification.pH !== null && classification.pH !== undefined;
          
          if (!hasPhysicalState || !hasFlashPoint || !hasPH) {
            console.log(`📋 Missing properties: physicalState=${!hasPhysicalState}, flashPoint=${!hasFlashPoint}, pH=${!hasPH}`);
            
            try {
              const extractedProperties = this.multiParser.attemptSectionBasedExtraction(sdsDoc.content);
              
              // Fill in missing physical state
              if (!hasPhysicalState && extractedProperties.physicalState) {
                classification.physicalState = extractedProperties.physicalState;
                console.log(`✅ Extracted physical state: ${extractedProperties.physicalState}`);
              }
              
              // Fill in missing flash point
              if (!hasFlashPoint && extractedProperties.flashPoint) {
                classification.flashPoint = extractedProperties.flashPoint;
                console.log(`✅ Extracted flash point: ${extractedProperties.flashPoint.fahrenheit}°F`);
              }
              
              // Fill in missing pH
              if (!hasPH && extractedProperties.pH !== null && extractedProperties.pH !== undefined) {
                classification.pH = extractedProperties.pH;
                console.log(`✅ Extracted pH: ${extractedProperties.pH}`);
              }
            } catch (extractionError) {
              console.warn(`⚠️ Property extraction failed: ${extractionError.message}`);
            }
          } else {
            console.log(`✅ All properties present: physicalState=${classification.physicalState}, flashPoint=${classification.flashPoint?.fahrenheit}°F, pH=${classification.pH}`);
          }

          // Apply permanent classification overrides
          const correctedClassification = this.applyClassificationOverrides(classification, sdsDoc.content || '');

          // Apply state classification
          this.applyCorrectStateClassification(correctedClassification);

          return {
            container_id: sdsDoc.container_id,
            filename: sdsDoc.filename,
            classification: correctedClassification,
            analysis_provider: 'batched',
            processing_time: new Date().toISOString()
          };

        } catch (error) {
          console.error(`❌ Failed to process classification ${index + 1}:`, error);
          const sdsDoc = sdsDocuments[index];
          return {
            container_id: sdsDoc?.container_id || index + 1,
            filename: sdsDoc?.filename || `document_${index + 1}`,
            error: `Classification processing failed: ${error.message}`,
            classification: {
              productName: sdsDoc?.filename || 'Unknown',
              hazardClass: null,
              packingGroup: null,
              flashPoint: null,
              pH: null,
              physicalState: 'unknown',
              classification_authority: 'failed',
              federal_codes: [],
              state_codes: [],
              final_classification: 'failed',
              error: error.message
            }
          };
        }
      });

      return results;

    } catch (error) {
      console.error('❌ Failed to parse batched response:', error);
      console.log('Raw response:', analysisResult);
      
      // Return individual errors
      return sdsDocuments.map((doc, index) => ({
        container_id: doc.container_id,
        filename: doc.filename,
        error: `Response parsing failed: ${error.message}`,
        classification: {
          productName: doc.filename || 'Unknown',
          hazardClass: null,
          packingGroup: null,
          flashPoint: null,
          pH: null,
          physicalState: 'unknown',
          classification_authority: 'failed',
          federal_codes: [],
          state_codes: [],
          final_classification: 'failed',
          error: error.message
        }
      }));
    }
  }

  /**
   * Parse AI response string to extract JSON classification object
   */
  parseAIResponse(aiResponse, filename) {
    try {
      console.log(`🔍 Parsing AI response for ${filename}...`);
      
      let cleanedResponse = aiResponse;
      
      // Extract JSON from markdown code blocks
      if (cleanedResponse.includes('```json')) {
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1];
        }
      } else if (cleanedResponse.includes('```')) {
        const jsonMatch = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[1];
        }
      }
      
      // Look for JSON object in the response
      const jsonMatches = cleanedResponse.match(/\{[\s\S]*?\}(?=\s*$|\s*\n\s*$|\s*```|$)/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try each JSON match until we find one that parses successfully
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            let jsonString = jsonMatches[i].trim();
            console.log(`✅ Found JSON: ${jsonString.substring(0, 100)}...`);
            
            // Fix common JSON syntax issues
            jsonString = this.fixJsonSyntax(jsonString);
            
            const parsed = JSON.parse(jsonString);
            console.log(`✅ Successfully parsed classification for ${filename}`);
            return parsed;
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse JSON attempt ${i + 1}: ${parseError.message}`);
            if (i === 0) {
              // If all attempts failed, continue to fallback
              break;
            }
          }
        }
      }
      
      // If no JSON found, create fallback
      console.warn(`⚠️ No JSON found in AI response for ${filename}, creating fallback`);
      return this.createFallbackClassification(filename, aiResponse);
      
    } catch (error) {
      console.error(`❌ Failed to parse AI response for ${filename}:`, error.message);
      return this.createFallbackClassification(filename, aiResponse);
    }
  }

  /**
   * Fix common JSON syntax issues
   */
  fixJsonSyntax(jsonString) {
    // Fix common issues in AI-generated JSON
    return jsonString
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix unquoted property names
      .replace(/(\w+):\s*([^,}\]]+)/g, (match, key, value) => {
        // Only fix if key is not already quoted
        if (!key.startsWith('"')) {
          return `"${key}": ${value}`;
        }
        return match;
      })
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Fix undefined/null values
      .replace(/:\s*undefined/g, ': null');
  }

  /**
   * Create fallback classification when parsing fails
   */
  createFallbackClassification(filename, aiResponse) {
    return {
      productName: filename?.replace(/\.(pdf|txt)$/i, '') || 'Unknown Product',
      hazardClass: null,
      packingGroup: null,
      flashPoint: null,
      pH: null,
      physicalState: 'unknown',
      classification_authority: 'failed',
      federal_codes: [],
      state_codes: [],
      final_classification: 'failed',
      error: 'Failed to parse AI response',
      raw_response: aiResponse?.substring(0, 500) // Keep first 500 chars for debugging
    };
  }

  /**
   * Extract text from PDF buffer using pdf-parse
   */
  async extractTextFromPDF(buffer) {
    try {
      const parsed = await pdfParse(buffer);
      return parsed.text;
    } catch (error) {
      console.error('PDF extraction failed:', error.message);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Process a single container's SDS
   */
  async processSingleContainer(file, options = {}) {
    try {
      // Extract text from PDF or read text file
      let rawText;
      const buffer = fs.readFileSync(file.path);
      
      const isPDF = file.originalname?.toLowerCase().endsWith('.pdf') || 
                    (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46);
      
      if (isPDF) {
        console.log(`📄 Processing PDF: ${file.originalname}`);
        rawText = await this.extractTextFromPDF(buffer);
      } else {
        console.log(`📝 Processing text file: ${file.originalname}`);
        rawText = buffer.toString('utf-8');
      }

      if (!rawText || rawText.length < 50) {
        throw new Error('Document appears to be empty or text extraction failed');
      }

      console.log(`📊 Extracted ${rawText.length} characters from ${file.originalname}`);

      // Get AI provider service
      const aiProvider = options.aiProvider || 'gemini'; // Default to Gemini with 2 keys
      
      // Enhanced analysis with comprehensive error handling
      let classification;
      let usedProvider = aiProvider;
      
      try {
        // Use the AI provider service with automatic fallback
        const aiService = this.aiService || global.aiProviderService;
        if (!aiService) {
          throw new Error('AI Provider Service not available');
        }

        console.log(`🤖 Starting analysis with ${aiProvider}...`);
        const aiResponse = await aiService.analyze(rawText, aiProvider, {
          state: options.state || 'TX',
          mode: 'standard'
        });
        
        // Parse AI response to get classification object
        classification = this.parseAIResponse(aiResponse, file.originalname);
        
      } catch (aiError) {
        console.error(`❌ AI analysis failed with ${aiProvider}:`, aiError.message);
        
        // Create fallback classification
        const productName = this.extractProductName(rawText) || file.originalname?.replace(/\.(pdf|txt)$/i, '') || 'Unknown Product';
        
        classification = {
          productName: productName,
          hazardClass: 'unknown',
          federal_codes: [],
          state_codes: [],
          final_classification: 'failed',
          physicalState: this.extractPhysicalState(rawText),
          error: aiError.message,
          analysis_provider: `${aiProvider}_failed`
        };
        
        usedProvider = `${aiProvider}_failed`;
      }

      // Enhanced property extraction using multiParser for missing values
      console.log(`🔍 Checking for missing properties in ${file.originalname}...`);
      
      // Use multiParser to extract missing physical properties
      const hasPhysicalState = classification.physicalState && classification.physicalState !== 'unknown';
      const hasFlashPoint = classification.flashPoint && classification.flashPoint !== null;
      const hasPH = classification.pH !== null && classification.pH !== undefined;
      
      if (!hasPhysicalState || !hasFlashPoint || !hasPH) {
        console.log(`📋 Missing properties: physicalState=${!hasPhysicalState}, flashPoint=${!hasFlashPoint}, pH=${!hasPH}`);
        
        try {
          const extractedProperties = this.multiParser.attemptSectionBasedExtraction(rawText);
          
          // Fill in missing physical state
          if (!hasPhysicalState && extractedProperties.physicalState) {
            classification.physicalState = extractedProperties.physicalState;
            console.log(`✅ Extracted physical state: ${extractedProperties.physicalState}`);
          }
          
          // Fill in missing flash point
          if (!hasFlashPoint && extractedProperties.flashPoint) {
            classification.flashPoint = extractedProperties.flashPoint;
            console.log(`✅ Extracted flash point: ${extractedProperties.flashPoint.fahrenheit}°F`);
          }
          
          // Fill in missing pH
          if (!hasPH && extractedProperties.pH !== null && extractedProperties.pH !== undefined) {
            classification.pH = extractedProperties.pH;
            console.log(`✅ Extracted pH: ${extractedProperties.pH}`);
          }
        } catch (extractionError) {
          console.warn(`⚠️ Property extraction failed: ${extractionError.message}`);
        }
      } else {
        console.log(`✅ All properties present: physicalState=${classification.physicalState}, flashPoint=${classification.flashPoint?.fahrenheit}°F, pH=${classification.pH}`);
      }

      // Apply classification overrides and Texas requirements
      classification = this.applyClassificationOverrides(classification, rawText);
      
      // Ensure Texas state codes
      if (!classification.state_codes || classification.state_codes.length === 0) {
        const productName = (classification.productName || '').toLowerCase();
        const physicalState = classification.physicalState || 'liquid';
        const isHazardous = classification.federal_codes && classification.federal_codes.length > 0;
        
        let formCode = '203'; // Default to organic solvents
        if (physicalState === 'solid') {
          formCode = '204'; // Lab chemicals
        } else if (productName.includes('oil') || productName.includes('petroleum')) {
          formCode = '202'; // Petroleum products
        }
        
        const stateClass = isHazardous ? 'H' : '3';
        classification.state_form_code = formCode;
        classification.state_classification = stateClass;
        classification.state_codes = [`${formCode}-${stateClass}`];
      }

      return {
        classification,
        text_length: rawText.length,
        analysis_provider: usedProvider,
        processed_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Container processing error:', error.message);
      
      const productName = file.originalname?.replace(/\.(pdf|txt)$/i, '') || 'Unknown';
      return {
        classification: {
          productName: productName,
          hazardClass: null,
          federal_codes: [],
          state_codes: [],
          final_classification: 'error',
          physicalState: 'unknown',
          error: error.message
        },
        text_length: 0,
        analysis_provider: 'error',
        processed_at: new Date().toISOString()
      };
    }
  }
  /**
   * Analyze chemical compatibility between containers for lab pack
   */
  analyzeCompatibility(containers) {
    const compatibility = {
      compatible_groups: [],
      incompatible_pairs: [],
      segregation_required: [],
      chemical_categories: {},
      packaging_recommendations: [],
      recommendations: []
    };

    const validContainers = containers.filter(c => c.classification && !c.error);
    
    // First, classify each container by chemical category
    validContainers.forEach(container => {
      const chemResult = this.classifyChemicalForLabPack(container.classification, '');
      const chemCategory = chemResult.category;
      container.chemical_category = chemCategory;
      container.chemical_subcategory = chemResult.subcategory;
      container.classification_reasoning = chemResult.reasoning;
      
      if (!compatibility.chemical_categories[chemCategory]) {
        compatibility.chemical_categories[chemCategory] = [];
      }
      compatibility.chemical_categories[chemCategory].push(container);
    });
    
    if (validContainers.length < 2) {
      compatibility.recommendations.push('Insufficient containers for compatibility analysis');
      return compatibility;
    }

    // ENVIRONMENTAL CHEMIST COMPATIBILITY ANALYSIS
    // Check both category-level and individual chemical compatibility
    console.log('🧪 Starting comprehensive compatibility analysis...');
    
    const categories = Object.keys(compatibility.chemical_categories);
    
    // Check category-level incompatibilities first
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const cat1 = categories[i];
        const cat2 = categories[j];
        
        const category1Info = this.labPackCategories[cat1];
        const category2Info = this.labPackCategories[cat2];
        
        // Check if categories are fundamentally incompatible
        const isIncompatible = this.areCategoriesIncompatible(cat1, cat2);
        
        if (isIncompatible) {
          const reason = this.getIncompatibilityReason(cat1, cat2);
          
          compatibility.incompatible_pairs.push({
            category1: cat1,
            category2: cat2,
            category1_name: category1Info?.name || cat1,
            category2_name: category2Info?.name || cat2,
            containers1: compatibility.chemical_categories[cat1].map(c => c.container_id),
            containers2: compatibility.chemical_categories[cat2].map(c => c.container_id),
            reason: reason,
            severity: this.getIncompatibilitySeverity(cat1, cat2)
          });
          
          compatibility.segregation_required.push({
            group1: compatibility.chemical_categories[cat1],
            group2: compatibility.chemical_categories[cat2],
            segregation_type: 'separate_packages',
            reason: reason,
            safety_level: this.getIncompatibilitySeverity(cat1, cat2)
          });
          
        } else {
          // Categories might be compatible - check individual chemicals
          const individualCompatibility = this.checkIndividualCompatibility(
            compatibility.chemical_categories[cat1],
            compatibility.chemical_categories[cat2]
          );
          
          if (individualCompatibility.compatible) {
            compatibility.compatible_groups.push({
              categories: [cat1, cat2],
              category_names: [category1Info?.name, category2Info?.name],
              containers: [...compatibility.chemical_categories[cat1], ...compatibility.chemical_categories[cat2]],
              compatibility_level: 'compatible',
              individual_checks: individualCompatibility.checks
            });
          } else {
            // Individual incompatibilities found
            individualCompatibility.incompatible_pairs.forEach(pair => {
              compatibility.incompatible_pairs.push(pair);
            });
          }
        }
      }
    }
    
    // Check within-category compatibility for categories that require individual assessment
    categories.forEach(category => {
      const containers = compatibility.chemical_categories[category];
      if (containers.length > 1) {
        const withinCategoryCheck = this.checkWithinCategoryCompatibility(category, containers);
        if (!withinCategoryCheck.compatible) {
          withinCategoryCheck.incompatible_pairs.forEach(pair => {
            compatibility.incompatible_pairs.push(pair);
          });
        }
      }
    });

    // Generate environmental chemist packaging recommendations
    categories.forEach(category => {
      const categoryInfo = this.labPackCategories[category];
      const containers = compatibility.chemical_categories[category];
      
      if (categoryInfo && containers.length > 0) {
        compatibility.packaging_recommendations.push({
          category: category,
          category_name: categoryInfo.name,
          container_count: containers.length,
          containers: containers.map(c => ({
            container_id: c.container_id,
            product_name: c.classification?.productName,
            subcategory: c.chemical_subcategory,
            reasoning: c.classification_reasoning
          })),
          packaging_notes: categoryInfo.packaging,
          dot_class: categoryInfo.dot_class,
          special_requirements: this.getAdvancedPackagingRequirements(category, containers),
          safety_level: this.getCategorySafetyLevel(category)
        });
      }
    });

    // Generate container assignments and recommendations
    compatibility.container_assignments = this.generateContainerAssignments(compatibility.chemical_categories, compatibility.incompatible_pairs);
    
    // Generate recommendations
    if (compatibility.incompatible_pairs.length > 0) {
      compatibility.recommendations.push(
        `${compatibility.incompatible_pairs.length} incompatible pairs found - separate packaging required`
      );
    }

    if (compatibility.compatible_groups.length > 0) {
      compatibility.recommendations.push(
        `${compatibility.compatible_groups.length} compatible groups can be packed together`
      );
    }

    // Add container-specific recommendations
    compatibility.container_assignments.forEach((container, index) => {
      if (container.containers.length > 0) {
        compatibility.recommendations.push(
          `Container ${index + 1}: ${container.category_name} (${container.containers.length} items) - ${container.special_notes}`
        );
      }
    });

    // Special checks for acids/bases
    const acids = validContainers.filter(c => 
      c.classification.pH?.value < 3 || 
      c.classification.productName?.toLowerCase().includes('acid')
    );
    const bases = validContainers.filter(c => 
      c.classification.pH?.value > 11 || 
      c.classification.productName?.toLowerCase().includes('base') ||
      c.classification.productName?.toLowerCase().includes('hydroxide')
    );

    if (acids.length > 0 && bases.length > 0) {
      compatibility.segregation_required.push({
        group1: acids,
        group2: bases,
        segregation_type: 'acid_base_separation',
        reason: 'Acids and bases must be separated to prevent violent reaction'
      });
    }

    return compatibility;
  }

  /**
   * ENVIRONMENTAL CHEMIST CATEGORY COMPATIBILITY CHECKER
   * Determines if two chemical categories can ever be mixed safely
   */
  areCategoriesIncompatible(cat1, cat2) {
    // ABSOLUTE INCOMPATIBILITIES (NEVER MIX)
    const neverMixCategories = {
      'aerosols': ['ALL'], // Aerosols never mix with anything except other aerosols
      'acids_oxidizing': ['ALL'], // Oxidizing acids never mix with anything
      'reactive_metals': ['ALL'], // Reactive metals generally don't mix
      'cyanides': ['acids_inorganic', 'acids_organic', 'acids_oxidizing'], // Deadly HCN gas
      'acids_inorganic': ['bases_inorganic', 'bases_organic', 'reactive_metals', 'cyanides'],
      'acids_organic': ['bases_inorganic', 'bases_organic', 'reactive_metals', 'cyanides'],
      'bases_inorganic': ['acids_inorganic', 'acids_organic', 'acids_oxidizing', 'reactive_metals'],
      'bases_organic': ['acids_inorganic', 'acids_organic', 'acids_oxidizing'],
      'flammable_organic': ['oxidizers', 'acids_oxidizing', 'reactive_metals'],
      'flammable_petroleum': ['oxidizers', 'acids_oxidizing', 'reactive_metals'],
      'oxidizers': ['flammable_organic', 'flammable_petroleum', 'reactive_metals']
    };
    
    const cat1Incompatible = neverMixCategories[cat1] || [];
    const cat2Incompatible = neverMixCategories[cat2] || [];
    
    // Check if either category lists the other as incompatible, or lists 'ALL'
    return cat1Incompatible.includes('ALL') || 
           cat1Incompatible.includes(cat2) || 
           cat2Incompatible.includes('ALL') || 
           cat2Incompatible.includes(cat1);
  }
  
  /**
   * Get specific reason for category incompatibility
   */
  getIncompatibilityReason(cat1, cat2) {
    const reasons = {
      'aerosols': 'Pressurized containers cannot be mixed with liquids - explosion/pressure hazard',
      'acids_oxidizing': 'Oxidizing acids cannot be mixed with any other chemicals - violent reaction risk',
      'reactive_metals': 'Water-reactive metals cannot be mixed with aqueous solutions - fire/explosion risk',
      'cyanides': 'Cyanides with acids generate deadly hydrogen cyanide gas',
      'acids_with_bases': 'Acids and bases create violent neutralization reactions with heat generation',
      'flammables_with_oxidizers': 'Flammable materials with oxidizers create fire and explosion hazards',
      'general': 'Chemical incompatibility - potential for dangerous reaction'
    };
    
    if (cat1 === 'aerosols' || cat2 === 'aerosols') return reasons.aerosols;
    if (cat1 === 'acids_oxidizing' || cat2 === 'acids_oxidizing') return reasons.acids_oxidizing;
    if (cat1 === 'reactive_metals' || cat2 === 'reactive_metals') return reasons.reactive_metals;
    if ((cat1 === 'cyanides' && cat2.includes('acids')) || (cat2 === 'cyanides' && cat1.includes('acids'))) return reasons.cyanides;
    if ((cat1.includes('acids') && cat2.includes('bases')) || (cat1.includes('bases') && cat2.includes('acids'))) return reasons.acids_with_bases;
    if ((cat1.includes('flammable') && cat2 === 'oxidizers') || (cat1 === 'oxidizers' && cat2.includes('flammable'))) return reasons.flammables_with_oxidizers;
    
    return reasons.general;
  }
  
  /**
   * Determine severity level of incompatibility
   */
  getIncompatibilitySeverity(cat1, cat2) {
    // EXTREME: Death, explosion, fire
    if (cat1 === 'aerosols' || cat2 === 'aerosols') return 'EXTREME';
    if (cat1 === 'acids_oxidizing' || cat2 === 'acids_oxidizing') return 'EXTREME';
    if (cat1 === 'reactive_metals' || cat2 === 'reactive_metals') return 'EXTREME';
    if ((cat1 === 'cyanides' && cat2.includes('acids')) || (cat2 === 'cyanides' && cat1.includes('acids'))) return 'EXTREME';
    
    // HIGH: Violent reactions, toxic gas generation
    if ((cat1.includes('acids') && cat2.includes('bases')) || (cat1.includes('bases') && cat2.includes('acids'))) return 'HIGH';
    if ((cat1.includes('flammable') && cat2 === 'oxidizers') || (cat1 === 'oxidizers' && cat2.includes('flammable'))) return 'HIGH';
    
    return 'MODERATE';
  }
  
  /**
   * Check individual chemical compatibility within potentially compatible categories
   */
  checkIndividualCompatibility(containers1, containers2) {
    const result = {
      compatible: true,
      checks: [],
      incompatible_pairs: []
    };
    
    containers1.forEach(container1 => {
      containers2.forEach(container2 => {
        const check = this.checkTwoChemicals(container1, container2);
        result.checks.push(check);
        
        if (!check.compatible) {
          result.compatible = false;
          result.incompatible_pairs.push({
            container1_id: container1.container_id,
            container2_id: container2.container_id,
            product1: container1.classification?.productName,
            product2: container2.classification?.productName,
            reason: check.reason,
            severity: check.severity
          });
        }
      });
    });
    
    return result;
  }
  
  /**
   * Check compatibility within a single category (for categories requiring individual assessment)
   */
  checkWithinCategoryCompatibility(category, containers) {
    const result = {
      compatible: true,
      incompatible_pairs: []
    };
    
    // Categories that require individual compatibility checks even within same category
    const requireIndividualChecks = [
      'acids_inorganic', // Different acids can react
      'toxic_inorganic', // Different metals can react
      'toxic_organic', // Different organic toxics may be incompatible
      'oxidizers' // Different oxidizers have different reaction potentials
    ];
    
    if (!requireIndividualChecks.includes(category)) {
      return result; // Category allows mixing within itself
    }
    
    // Check each pair within the category
    for (let i = 0; i < containers.length; i++) {
      for (let j = i + 1; j < containers.length; j++) {
        const check = this.checkTwoChemicals(containers[i], containers[j]);
        
        if (!check.compatible) {
          result.compatible = false;
          result.incompatible_pairs.push({
            container1_id: containers[i].container_id,
            container2_id: containers[j].container_id,
            product1: containers[i].classification?.productName,
            product2: containers[j].classification?.productName,
            reason: check.reason,
            severity: check.severity,
            within_category: true
          });
        }
      }
    }
    
    return result;
  }
  
  /**
   * INDIVIDUAL CHEMICAL COMPATIBILITY CHECKER
   * Environmental chemist-level analysis of two specific chemicals
   */
  checkTwoChemicals(container1, container2) {
    const chem1 = container1.classification;
    const chem2 = container2.classification;
    const name1 = (chem1?.productName || '').toLowerCase();
    const name2 = (chem2?.productName || '').toLowerCase();
    
    // SPECIFIC CHEMICAL INCOMPATIBILITIES
    
    // 1. Strong acids with each other (concentration and type dependent)
    if (this.isStrongAcid(name1) && this.isStrongAcid(name2)) {
      // Specific incompatible acid pairs
      const incompatibleAcidPairs = [
        ['sulfuric', 'nitric'], // Nitrating mixture - explosive
        ['hydrochloric', 'nitric'], // Aqua regia - highly corrosive
        ['perchloric', 'hydrochloric'], // Explosive chlorine dioxide
      ];
      
      for (const [acid1, acid2] of incompatibleAcidPairs) {
        if ((name1.includes(acid1) && name2.includes(acid2)) || 
            (name1.includes(acid2) && name2.includes(acid1))) {
          return {
            compatible: false,
            reason: `${acid1} acid and ${acid2} acid form dangerous mixtures`,
            severity: 'EXTREME'
          };
        }
      }
    }
    
    // 2. Peroxides with organics (explosive peroxide formation)
    if ((name1.includes('peroxide') && this.isOrganic(name2)) ||
        (name2.includes('peroxide') && this.isOrganic(name1))) {
      return {
        compatible: false,
        reason: 'Peroxides with organics can form explosive peroxide compounds',
        severity: 'HIGH'
      };
    }
    
    // 3. Heavy metals that form explosive compounds
    const explosiveMetalPairs = [
      ['mercury', 'aluminum'], // Aluminum amalgam
      ['silver', 'ammonia'], // Silver fulminate
      ['lead', 'azide'] // Lead azide
    ];
    
    for (const [metal1, metal2] of explosiveMetalPairs) {
      if ((name1.includes(metal1) && name2.includes(metal2)) ||
          (name1.includes(metal2) && name2.includes(metal1))) {
        return {
          compatible: false,
          reason: `${metal1} and ${metal2} can form explosive compounds`,
          severity: 'EXTREME'
        };
      }
    }
    
    // 4. Check pH compatibility for liquids
    if (chem1.physicalState === 'liquid' && chem2.physicalState === 'liquid') {
      const pH1 = chem1.pH;
      const pH2 = chem2.pH;
      
      if (pH1 !== null && pH2 !== null) {
        // Extreme pH differences can cause violent reactions
        if (Math.abs(pH1 - pH2) > 10) {
          return {
            compatible: false,
            reason: `Extreme pH difference (${pH1} vs ${pH2}) - violent neutralization risk`,
            severity: 'HIGH'
          };
        }
      }
    }
    
    // 5. Oxidizer concentration checks
    if (this.isOxidizer(name1) && this.isOxidizer(name2)) {
      // Some oxidizer combinations are extremely dangerous
      const dangerousOxidizerPairs = [
        ['hydrogen peroxide', 'potassium permanganate'], // Explosive reaction
        ['sodium hypochlorite', 'hydrogen peroxide'] // Oxygen gas generation
      ];
      
      for (const [ox1, ox2] of dangerousOxidizerPairs) {
        if ((name1.includes(ox1) && name2.includes(ox2)) ||
            (name1.includes(ox2) && name2.includes(ox1))) {
          return {
            compatible: false,
            reason: `Incompatible oxidizer combination: ${ox1} + ${ox2}`,
            severity: 'HIGH'
          };
        }
      }
    }
    
    // Default: Compatible
    return {
      compatible: true,
      reason: 'No specific incompatibilities identified',
      severity: 'NONE'
    };
  }
  
  // Helper methods for chemical identification
  isStrongAcid(name) {
    const strongAcids = ['sulfuric', 'hydrochloric', 'nitric', 'perchloric', 'hydrobromic', 'hydroiodic'];
    return strongAcids.some(acid => name.includes(acid));
  }
  
  isOrganic(name) {
    const organicIndicators = ['methyl', 'ethyl', 'propyl', 'butyl', 'acetone', 'benzene', 'toluene', 
                               'alcohol', 'ether', 'ester', 'ketone', 'aldehyde'];
    return organicIndicators.some(indicator => name.includes(indicator));
  }
  
  isOxidizer(name) {
    const oxidizers = ['peroxide', 'hypochlorite', 'permanganate', 'chlorate', 'nitrate', 'dichromate'];
    return oxidizers.some(oxidizer => name.includes(oxidizer));
  }
  
  /**
   * Get advanced packaging requirements based on environmental chemist standards
   */
  getAdvancedPackagingRequirements(category, containers) {
    const categoryInfo = this.labPackCategories[category];
    const requirements = [];
    
    // Base requirements from category
    if (categoryInfo?.packaging) {
      requirements.push(categoryInfo.packaging);
    }
    
    // Additional requirements based on specific chemicals
    containers.forEach(container => {
      const name = (container.classification?.productName || '').toLowerCase();
      
      // Carcinogen handling
      if (name.includes('benzene') || name.includes('chromium') || name.includes('formaldehyde')) {
        requirements.push('CARCINOGEN: Sealed secondary containment, no vapor exposure');
      }
      
      // High vapor pressure materials
      if (name.includes('acetone') || name.includes('methanol') || name.includes('ether')) {
        requirements.push('HIGH VAPOR PRESSURE: Vapor-tight containers, ventilation required');
      }
      
      // Temperature sensitive
      if (name.includes('peroxide') || name.includes('azide')) {
        requirements.push('TEMPERATURE SENSITIVE: Cool storage, avoid shock');
      }
      
      // Light sensitive
      if (name.includes('silver') || name.includes('photo')) {
        requirements.push('LIGHT SENSITIVE: Opaque containers or dark storage');
      }
    });
    
    return [...new Set(requirements)]; // Remove duplicates
  }
  
  /**
   * Determine safety level for category
   */
  getCategorySafetyLevel(category) {
    const extremeCategories = ['aerosols', 'acids_oxidizing', 'reactive_metals', 'cyanides'];
    const highCategories = ['flammable_organic', 'flammable_petroleum', 'acids_inorganic', 'bases_inorganic', 'oxidizers'];
    const moderateCategories = ['acids_organic', 'bases_organic', 'toxic_inorganic', 'toxic_organic'];
    
    if (extremeCategories.includes(category)) return 'EXTREME';
    if (highCategories.includes(category)) return 'HIGH';
    if (moderateCategories.includes(category)) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Generate lab pack shipping summary
   */
  generateLabPackSummary(containers, labPackType = 'standard') {
    const validContainers = containers.filter(c => c.classification && !c.error);
    const hazardClasses = new Set();
    const federalCodes = new Set();
    const stateCodes = new Set();

    validContainers.forEach(container => {
      const classification = container.classification;
      
      // Collect hazard classes
      if (classification.hazardClass) {
        hazardClasses.add(classification.hazardClass);
      }
      
      // Collect waste codes
      if (classification.federal_codes) {
        classification.federal_codes.forEach(code => federalCodes.add(code));
      }
      if (classification.state_codes) {
        classification.state_codes.forEach(code => stateCodes.add(code));
      }
    });

    // Determine primary hazard class for shipping
    const primaryHazardClass = this.determinePrimaryHazardClass(Array.from(hazardClasses));
    
    return {
      total_containers: containers.length,
      valid_containers: validContainers.length,
      failed_containers: containers.length - validContainers.length,
      hazard_classes: Array.from(hazardClasses),
      primary_hazard_class: primaryHazardClass,
      federal_waste_codes: Array.from(federalCodes),
      state_waste_codes: Array.from(stateCodes),
      regulatory_status: federalCodes.size > 0 ? 'hazardous' : 'non-hazardous',
      shipping_info: {
        un_number: 'UN3432',
        proper_shipping_name: 'Laboratory chemicals, n.o.s.',
        hazard_class: primaryHazardClass || '9',
        packing_group: 'II', // Most restrictive for lab chemicals
        labels_required: Array.from(hazardClasses)
      },
      lab_pack_type: labPackType,
      packaging_requirements: this.getPackagingRequirements(Array.from(hazardClasses))
    };
  }

  /**
   * Determine primary hazard class for shipping purposes
   */
  determinePrimaryHazardClass(hazardClasses) {
    // Priority order for lab pack shipping
    const priority = ['1.1', '1.2', '1.3', '2.3', '5.2', '4.2', '5.1', '2.1', '4.3', '4.1', '6.1', '8', '3', '2.2', '9'];
    
    for (const priorityClass of priority) {
      if (hazardClasses.includes(priorityClass)) {
        return priorityClass;
      }
    }
    
    return hazardClasses[0] || '9';
  }

  /**
   * Get packaging requirements based on hazard classes
   */
  getPackagingRequirements(hazardClasses) {
    const requirements = {
      packaging_instruction: '4G',
      inner_packaging: 'Required for all containers',
      absorbent_required: false,
      cushioning_required: true,
      special_provisions: []
    };

    if (hazardClasses.includes('3') || hazardClasses.includes('8')) {
      requirements.absorbent_required = true;
      requirements.special_provisions.push('Absorbent material required for liquids');
    }

    if (hazardClasses.includes('4.2') || hazardClasses.includes('5.2')) {
      requirements.special_provisions.push('Temperature control may be required');
    }

    if (hazardClasses.includes('1.1') || hazardClasses.includes('1.2') || hazardClasses.includes('1.3')) {
      requirements.special_provisions.push('Explosives require separate packaging - not suitable for lab pack');
    }

    return requirements;
  }

  /**
   * Get special packaging requirements for chemical categories
   */
  getSpecialPackagingRequirements(category, containers) {
    const requirements = [];
    
    switch (category) {
      case 'oxidizing_acid':
        requirements.push('SEPARATE PACKAGE REQUIRED - Do not pack with any other chemicals');
        requirements.push('Use extra absorbent material');
        requirements.push('Temperature control may be required');
        break;
      case 'cyanide':
        requirements.push('SEPARATE PACKAGE REQUIRED - Never pack with acids');
        requirements.push('Leak-proof containers essential');
        requirements.push('Label clearly as cyanide hazard');
        break;
      case 'pyrophoric':
        requirements.push('SEPARATE PACKAGE REQUIRED - Inert atmosphere needed');
        requirements.push('Keep away from all other chemicals');
        requirements.push('Fire suppression readily available');
        break;
      case 'reactive':
        requirements.push('SEPARATE PACKAGE REQUIRED - Keep dry');
        requirements.push('Moisture barrier packaging');
        requirements.push('Do not pack with water-containing materials');
        break;
      case 'organic_acid':
      case 'inorganic_acid':
        requirements.push('Secondary containment required');
        requirements.push('Acid-resistant absorbent material');
        requirements.push('Keep separate from bases/caustics');
        break;
      case 'caustic':
        requirements.push('Secondary containment required');
        requirements.push('Base-resistant absorbent material');
        requirements.push('Keep separate from acids');
        break;
      case 'flammable':
        requirements.push('Fire prevention measures');
        requirements.push('Absorbent material required');
        requirements.push('Static electricity precautions');
        break;
      case 'oxidizer':
        requirements.push('Keep separate from combustibles');
        requirements.push('Use non-combustible absorbent');
        requirements.push('Ventilation required');
        break;
      case 'toxic':
        requirements.push('Vapor-tight containers');
        requirements.push('Double containment recommended');
        requirements.push('Leak detection measures');
        break;
      default:
        requirements.push('Standard lab pack procedures');
    }
    
    return requirements;
  }

  /**
   * ENVIRONMENTAL CHEMIST CONTAINER ASSIGNMENT SYSTEM
   * Advanced lab pack segregation based on chemical compatibility analysis
   */
  generateContainerAssignments(chemicalCategories, incompatiblePairs) {
    console.log('🧪 Generating environmental chemist-approved container assignments...');
    
    const assignments = [];
    const assignedContainers = new Set();
    
    // Build incompatibility map with severity levels
    const incompatibilityMap = new Map();
    incompatiblePairs.forEach(pair => {
      const key1 = `${pair.category1}`;
      const key2 = `${pair.category2}`;
      
      if (!incompatibilityMap.has(key1)) incompatibilityMap.set(key1, new Map());
      if (!incompatibilityMap.has(key2)) incompatibilityMap.set(key2, new Map());
      
      incompatibilityMap.get(key1).set(key2, pair.severity);
      incompatibilityMap.get(key2).set(key1, pair.severity);
    });

    // Process categories in order of safety priority (most dangerous first)
    const categoryPriority = [
      'aerosols', 'acids_oxidizing', 'reactive_metals', 'cyanides', // EXTREME - Always separate
      'flammable_organic', 'flammable_petroleum', 'oxidizers', // HIGH - Usually separate
      'acids_inorganic', 'acids_organic', 'bases_inorganic', 'bases_organic', // MODERATE
      'toxic_inorganic', 'toxic_organic', // MODERATE
      'non_hazardous_liquids', 'non_hazardous_solids' // LOW - Can combine
    ];
    
    const sortedCategories = categoryPriority.filter(cat => chemicalCategories[cat] && chemicalCategories[cat].length > 0);
    
    sortedCategories.forEach(category => {
      const containers = chemicalCategories[category];
      if (containers.length === 0) return;
      
      const categoryInfo = this.labPackCategories[category];
      const safetyLevel = this.getCategorySafetyLevel(category);
      
      // Determine if category needs subdivision due to individual incompatibilities
      const subdivisions = this.subdivideCategory(category, containers, incompatiblePairs);
      
      subdivisions.forEach((subdivision, subIndex) => {
        const containerNumber = assignments.length + 1;
        const containerLabel = this.generateContainerLabel(category, subdivision.subcategory, subdivisions.length > 1 ? subIndex + 1 : null);
        
        const assignment = {
          container_number: containerNumber,
          category: category,
          subcategory: subdivision.subcategory,
          category_name: categoryInfo?.name || category,
          container_label: containerLabel,
          containers: subdivision.containers.map(c => ({
            container_id: c.container_id,
            filename: c.filename,
            product_name: c.classification?.productName,
            subcategory: c.chemical_subcategory,
            reasoning: c.classification_reasoning
          })),
          requires_separate_container: safetyLevel === 'EXTREME' || subdivision.forced_separation,
          safety_level: safetyLevel,
          special_notes: this.generateSpecialNotes(category, subdivision),
          packaging_requirements: this.getAdvancedPackagingRequirements(category, subdivision.containers),
          dot_hazard_class: categoryInfo?.dot_class || this.getDominantHazardClass(subdivision.containers),
          estimated_volume: this.estimateVolume(subdivision.containers),
          container_form_code: this.determineContainerFormCode(category, subdivision.containers),
          container_classification: this.determineContainerClassification(category, subdivision.containers),
          compatibility_notes: subdivision.compatibility_notes,
          regulatory_citations: this.getRegulatoryCitations(category)
        };
        
        assignments.push(assignment);
        subdivision.containers.forEach(c => assignedContainers.add(c.container_id));
        
        console.log(`📦 Container ${containerNumber}: ${containerLabel} (${subdivision.containers.length} items, ${safetyLevel} safety)`);
      });
    });

    // Handle any unassigned containers
    const unassigned = [];
    Object.values(chemicalCategories).flat().forEach(container => {
      if (!assignedContainers.has(container.container_id)) {
        unassigned.push(container);
      }
    });

    if (unassigned.length > 0) {
      assignments.push({
        container_number: assignments.length + 1,
        category: 'unclassified',
        category_name: 'Unclassified Materials - REQUIRES CHEMIST REVIEW',
        container_label: 'UNCLASSIFIED - MANUAL REVIEW REQUIRED',
        containers: unassigned.map(c => ({
          container_id: c.container_id,
          filename: c.filename,
          product_name: c.classification?.productName || 'Unknown'
        })),
        requires_separate_container: true,
        safety_level: 'EXTREME', // Treat unknowns as dangerous
        special_notes: 'CRITICAL: Manual review by environmental chemist required before packing',
        packaging_requirements: ['DO NOT PACK - Manual classification required'],
        dot_hazard_class: '9',
        estimated_volume: 'Unknown',
        regulatory_citations: ['Manual review required per 49 CFR 173.12']
      });
      
      console.log(`⚠️ ${unassigned.length} unclassified materials require manual review`);
    }

    return assignments;
  }
  
  /**
   * Subdivide category if individual incompatibilities exist
   */
  subdivideCategory(category, containers, incompatiblePairs) {
    // Check for individual incompatibilities within the category
    const individualIncompatibilities = incompatiblePairs.filter(pair => 
      pair.within_category && 
      (pair.container1_id || pair.container2_id) // Individual chemical pairs
    );
    
    if (individualIncompatibilities.length === 0) {
      // No subdivisions needed - all containers can go together
      return [{
        containers: containers,
        subcategory: containers[0]?.chemical_subcategory || 'general',
        forced_separation: false,
        compatibility_notes: 'All materials in category are compatible'
      }];
    }
    
    // Create compatibility groups using graph theory approach
    const compatibilityGroups = this.createCompatibilityGroups(containers, individualIncompatibilities);
    
    return compatibilityGroups.map((group, index) => ({
      containers: group.containers,
      subcategory: group.subcategory,
      forced_separation: true,
      compatibility_notes: `Subdivision ${index + 1}: ${group.reason}`
    }));
  }
  
  /**
   * Create compatibility groups using graph-based clustering
   */
  createCompatibilityGroups(containers, incompatibilities) {
    // Build incompatibility graph
    const incompatibleSet = new Set();
    incompatibilities.forEach(incomp => {
      incompatibleSet.add(`${incomp.container1_id}-${incomp.container2_id}`);
      incompatibleSet.add(`${incomp.container2_id}-${incomp.container1_id}`);
    });
    
    // Find connected components of compatible materials
    const visited = new Set();
    const groups = [];
    
    containers.forEach(container => {
      if (visited.has(container.container_id)) return;
      
      // Start new compatibility group
      const group = { containers: [], subcategory: container.chemical_subcategory, reason: '' };
      const queue = [container];
      
      while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.container_id)) continue;
        
        visited.add(current.container_id);
        group.containers.push(current);
        
        // Find all containers compatible with current
        containers.forEach(other => {
          if (visited.has(other.container_id)) return;
          
          const pairKey = `${current.container_id}-${other.container_id}`;
          if (!incompatibleSet.has(pairKey)) {
            queue.push(other);
          }
        });
      }
      
      group.reason = `Compatible ${group.subcategory} materials (${group.containers.length} items)`;
      groups.push(group);
    });
    
    return groups;
  }
  
  /**
   * Generate appropriate container label
   */
  generateContainerLabel(category, subcategory, subdivisionNumber) {
    const baseLabels = {
      'aerosols': 'AEROSOLS - SEPARATE CONTAINER REQUIRED',
      'acids_oxidizing': 'OXIDIZING ACIDS - SEPARATE CONTAINER REQUIRED',
      'reactive_metals': 'REACTIVE METALS - SEPARATE CONTAINER REQUIRED',
      'cyanides': 'CYANIDES - SEPARATE CONTAINER REQUIRED',
      'flammable_organic': 'FLAMMABLE ORGANIC LIQUIDS',
      'flammable_petroleum': 'FLAMMABLE PETROLEUM PRODUCTS',
      'acids_inorganic': 'INORGANIC ACIDS',
      'acids_organic': 'ORGANIC ACIDS',
      'bases_inorganic': 'INORGANIC BASES',
      'bases_organic': 'ORGANIC BASES',
      'oxidizers': 'OXIDIZING AGENTS',
      'toxic_inorganic': 'TOXIC INORGANIC MATERIALS',
      'toxic_organic': 'TOXIC ORGANIC MATERIALS',
      'non_hazardous_liquids': 'NON-HAZARDOUS LIQUIDS',
      'non_hazardous_solids': 'NON-HAZARDOUS SOLIDS'
    };
    
    let label = baseLabels[category] || category.toUpperCase().replace(/_/g, ' ');
    
    if (subdivisionNumber) {
      label += ` - GROUP ${subdivisionNumber}`;
    }
    
    return label;
  }
  
  /**
   * Generate special handling notes
   */
  generateSpecialNotes(category, subdivision) {
    const categoryNotes = {
      'aerosols': 'CRITICAL: Pressurized containers - cannot mix with liquids, explosion hazard',
      'acids_oxidizing': 'CRITICAL: Never mix with any other chemicals - violent reaction risk',
      'reactive_metals': 'CRITICAL: Keep absolutely dry - violent water reaction',
      'cyanides': 'CRITICAL: Never with acids - deadly HCN gas generation',
      'flammable_organic': 'Fire prevention measures, static control, absorbent material',
      'flammable_petroleum': 'Fire prevention measures, vapor control, grounding required',
      'acids_inorganic': 'Secondary containment, acid-resistant materials, separate from bases',
      'acids_organic': 'Corrosion-resistant containers, vapor control if volatile',
      'bases_inorganic': 'Base-resistant containers, separate from acids, vapor control',
      'bases_organic': 'Often flammable - check flash points, vapor control',
      'oxidizers': 'Non-combustible absorbent, separate from all combustibles',
      'toxic_inorganic': 'Leak-proof containers, heavy metal precautions',
      'toxic_organic': 'Vapor-tight containers, carcinogen precautions',
      'non_hazardous_liquids': 'Standard liquid packaging, absorbent material',
      'non_hazardous_solids': 'Standard solid packaging, moisture protection'
    };
    
    let notes = categoryNotes[category] || 'Standard lab pack procedures';
    
    if (subdivision.forced_separation) {
      notes += ` | ${subdivision.compatibility_notes}`;
    }
    
    return notes;
  }
  
  /**
   * Get regulatory citations for category
   */
  getRegulatoryCitations(category) {
    const citations = {
      'aerosols': ['49 CFR 173.12(b)', '49 CFR 173.306'],
      'acids_oxidizing': ['49 CFR 173.127', '40 CFR 261.21'],
      'reactive_metals': ['49 CFR 173.124', '49 CFR 173.151'],
      'cyanides': ['49 CFR 173.132', '40 CFR 261.31'],
      'flammable_organic': ['49 CFR 173.120', '40 CFR 261.21'],
      'flammable_petroleum': ['49 CFR 173.120', '40 CFR 261.21'],
      'acids_inorganic': ['49 CFR 173.137', '40 CFR 261.22'],
      'acids_organic': ['49 CFR 173.137', '40 CFR 261.22'],
      'bases_inorganic': ['49 CFR 173.137', '40 CFR 261.22'],
      'oxidizers': ['49 CFR 173.127', '40 CFR 261.23'],
      'toxic_inorganic': ['49 CFR 173.132', '40 CFR 261.24'],
      'toxic_organic': ['49 CFR 173.132', '40 CFR 261.24']
    };
    
    return citations[category] || ['49 CFR 173.12'];
  }

  /**
   * Determine the container form code based on chemical category and contents
   * This is what goes on the manifest for the entire container
   * Uses generic "Other" codes from each category instead of lab pack specific codes
   */
  determineContainerFormCode(category, containers) {
    const hasHazardous = containers.some(c => 
      c.classification?.final_classification === 'hazardous' ||
      (c.classification?.federal_codes && c.classification.federal_codes.length > 0)
    );

    // Use generic "Other" codes from each category for better manifest acceptance
    // Lab packs are almost always either H (hazardous) or 1 (Class 1 non-hazardous)
    switch (category) {
      case 'organic_acid':
      case 'inorganic_acid':
        return hasHazardous ? '105-H' : '105-1'; // Acid wastes - Other
      
      case 'oxidizing_acid':
        return '105-H'; // Acid wastes - Other (always hazardous)
      
      case 'caustic':
        return hasHazardous ? '106-H' : '106-1'; // Alkaline/caustic liquids - Other
      
      case 'flammable':
      case 'organic_solvent':
        return '203-H'; // Organic solvents - Other
      
      case 'oxidizer':
        return '204-H'; // Lab chemicals - Other (oxidizers)
      
      case 'toxic':
        return '204-H'; // Lab chemicals - Other (toxic materials)
      
      case 'reactive':
      case 'pyrophoric':
      case 'cyanide':
        return '204-H'; // Lab chemicals - Other (specialty reactive)
      
      case 'aerosol':
        return hasHazardous ? '301-H' : '301-1'; // Aerosols/compressed gases - Other
      
      case 'non_hazardous':
        return '204-1'; // Lab chemicals - Other (non-hazardous)
      
      case 'unclassified':
      default:
        return hasHazardous ? '204-H' : '204-1'; // Lab chemicals - Other (default)
    }
  }

  /**
   * Determine the container classification suffix (H, 1, 2, 3)
   * Lab packs are almost always either H (hazardous) or 1 (Class 1 non-hazardous)
   */
  determineContainerClassification(category, containers) {
    const hasHazardous = containers.some(c => 
      c.classification?.final_classification === 'hazardous' ||
      (c.classification?.federal_codes && c.classification.federal_codes.length > 0)
    );

    // If any material in the container is hazardous, the whole container is hazardous
    if (hasHazardous) {
      return 'H'; // Hazardous
    }

    // For non-hazardous lab pack materials, use Class 1 (most common for lab packs)
    // Class 2 and 3 are very rarely used for lab pack containers
    return '1'; // Class 1 non-hazardous (standard for non-hazardous lab packs)
  }

  /**
   * Get container manifest information for reporting
   */
  getContainerManifestInfo(containerAssignment) {
    const formCode = containerAssignment.container_form_code;
    const classification = containerAssignment.container_classification;
    const fullCode = `${formCode}`;

    // Get form code description  
    const formDescriptions = {
      '105-H': 'Acid Wastes - Other (Hazardous)',
      '105-1': 'Acid Wastes - Other (Class 1)',
      '106-H': 'Alkaline/Caustic Liquids - Other (Hazardous)',
      '106-1': 'Alkaline/Caustic Liquids - Other (Class 1)',
      '203-H': 'Organic Solvents - Other (Hazardous)',
      '203-1': 'Organic Solvents - Other (Class 1)',
      '204-H': 'Lab Chemicals - Other (Hazardous)',
      '204-1': 'Lab Chemicals - Other (Class 1)',
      '301-H': 'Aerosols/Compressed Gases - Other (Hazardous)',
      '301-1': 'Aerosols/Compressed Gases - Other (Class 1)'
    };

    return {
      form_code: formCode,
      classification: classification,
      full_code: fullCode,
      description: formDescriptions[fullCode] || `Form ${formCode}`,
      container_count: 1,
      total_materials: containerAssignment.containers.length,
      manifest_description: `${formDescriptions[fullCode] || 'Lab Pack'} containing ${containerAssignment.containers.length} materials`,
      regulatory_notes: this.getContainerRegulatoryNotes(containerAssignment.category, classification)
    };
  }

  /**
   * Get regulatory notes for container manifest
   */
  getContainerRegulatoryNotes(category, classification) {
    const notes = [];

    if (classification === 'H') {
      notes.push('RCRA hazardous waste - requires manifest');
    }

    switch (category) {
      case 'oxidizing_acid':
        notes.push('OXIDIZER - Keep separate from combustibles');
        break;
      case 'reactive':
        notes.push('WATER REACTIVE - Keep dry');
        break;
      case 'pyrophoric':
        notes.push('PYROPHORIC - Inert atmosphere required');
        break;
      case 'cyanide':
        notes.push('CYANIDE - Never mix with acids');
        break;
      case 'flammable':
      case 'organic_solvent':
        notes.push('FLAMMABLE - Fire prevention required');
        break;
    }

    return notes;
  }

  /**
   * Get dominant DOT hazard class for a group of containers
   */
  getDominantHazardClass(containers) {
    const classes = containers.map(c => c.classification?.hazardClass).filter(Boolean);
    if (classes.length === 0) return '9';
    
    // Priority order for hazard classes
    const priority = ['1.1', '1.2', '1.3', '2.3', '5.2', '4.2', '5.1', '2.1', '4.3', '4.1', '6.1', '8', '3', '2.2', '9'];
    
    for (const priorityClass of priority) {
      if (classes.includes(priorityClass)) {
        return priorityClass;
      }
    }
    
    return classes[0];
  }

  /**
   * Estimate volume for container sizing
   */
  estimateVolume(containers) {
    // Simple estimation - in real implementation would use actual container sizes
    const count = containers.length;
    if (count <= 5) return 'Small (5-gal)';
    if (count <= 15) return 'Medium (30-gal)';
    if (count <= 30) return 'Large (55-gal)';
    return 'Multiple containers required';
  }

  /**
   * Extract product name from SDS text using regex (fallback method)
   */
  extractProductName(sdsText) {
    const patterns = [
      /Product\s*Name\s*:?\s*([^\n\r]+)/i,
      /Product\s*:?\s*([^\n\r]+)/i,
      /Chemical\s*Name\s*:?\s*([^\n\r]+)/i,
      /Trade\s*Name\s*:?\s*([^\n\r]+)/i,
      /PELS®?\s*([^\n\r]+)/i, // For PELS products
      /Caustic\s*Soda[^\n\r]*/i, // For caustic soda products
      /Product\s*Identifier\s*:?\s*([^\n\r]+)/i
    ];

    for (const pattern of patterns) {
      const match = sdsText.match(pattern);
      if (match && match[1]) {
        const productName = match[1].trim();
        // Clean up common unwanted text
        const cleaned = productName
          .replace(/\s*identifier\s*/gi, '')
          .replace(/\s*product\s*identifier\s*/gi, '')
          .replace(/\s*section\s*1\s*/gi, '')
          .trim();
        
        if (cleaned && cleaned.length > 2) {
          console.log(`📝 Extracted product name: "${cleaned}" from pattern: ${pattern}`);
          return cleaned;
        }
      }
    }

    // If no pattern matches, try to extract from common SDS structures
    const fallbackMatch = sdsText.match(/PELS®?\s*Caustic\s*Soda\s*Beads/i);
    if (fallbackMatch) {
      console.log(`📝 Extracted product name from fallback: "${fallbackMatch[0]}"`);
      return fallbackMatch[0];
    }

    console.log('📝 No product name found, using Unknown Product');
    return 'Unknown Product';
  }

  /**
   * Extract physical state from SDS text using regex (fallback method)
   */
  extractPhysicalState(sdsText) {
    const patterns = [
      /Physical\s*State\s*:?\s*([^\n\r]+)/i,
      /Physical\s*Form\s*:?\s*([^\n\r]+)/i,
      /Appearance\s*:?\s*([^\n\r]+)/i
    ];

    for (const pattern of patterns) {
      const match = sdsText.match(pattern);
      if (match && match[1]) {
        const state = match[1].toLowerCase();
        if (state.includes('solid') || state.includes('pellet') || state.includes('bead') || state.includes('powder')) {
          return 'solid';
        }
        if (state.includes('liquid')) {
          return 'liquid';
        }
        if (state.includes('gas')) {
          return 'gas';
        }
      }
    }

    // Check for solid indicators in product name and text
    const textLower = sdsText.toLowerCase();
    if (textLower.includes('pellet') || textLower.includes('bead') || textLower.includes('flake') || 
        textLower.includes('powder') || textLower.includes('crystal') || textLower.includes('granule')) {
      return 'solid';
    }

    return 'unknown';
  }

  /**
   * Get processing status for long-running batches
   */
  getProcessingStatus(batchId) {
    // Implementation for tracking batch processing status
    // This would integrate with a job queue system in production
    return {
      batch_id: batchId,
      status: 'processing',
      completed: 0,
      total: 0,
      estimated_completion: null
    };
  }
}

export default BatchSDSProcessor;