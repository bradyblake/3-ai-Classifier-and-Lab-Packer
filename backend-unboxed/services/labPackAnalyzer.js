// Lab Pack Analyzer Service
// Intelligent batch SDS analysis and lab pack optimization

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AI providers
const providers = {};
if (process.env.GEMINI_API_KEY) {
  providers.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}
if (process.env.GROQ_API_KEY) {
  providers.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Lab pack categorization rules based on chemical compatibility
const LAB_PACK_CATEGORIES = {
  'organic_acid': {
    name: 'Organic Acids',
    incompatible: ['caustic', 'oxidizer', 'cyanide', 'reactive'],
    formCode: '105',
    examples: 'acetic acid, formic acid, citric acid'
  },
  'inorganic_acid': {
    name: 'Inorganic Acids',
    incompatible: ['caustic', 'oxidizer', 'cyanide', 'reactive', 'sulfide'],
    formCode: '105',
    examples: 'hydrochloric acid, sulfuric acid, phosphoric acid'
  },
  'oxidizing_acid': {
    name: 'Oxidizing Acids',
    incompatible: ['organic_acid', 'inorganic_acid', 'caustic', 'flammable', 'organic_solvent'],
    formCode: '105',
    examples: 'nitric acid, perchloric acid, chromic acid'
  },
  'caustic': {
    name: 'Caustics/Bases',
    incompatible: ['organic_acid', 'inorganic_acid', 'oxidizing_acid'],
    formCode: '106',
    examples: 'sodium hydroxide, potassium hydroxide, ammonia'
  },
  'flammable': {
    name: 'Flammable Liquids',
    incompatible: ['oxidizer', 'oxidizing_acid'],
    formCode: '203',
    examples: 'acetone, ethanol, toluene'
  },
  'organic_solvent': {
    name: 'Non-Flammable Organic Solvents',
    incompatible: ['oxidizer', 'oxidizing_acid'],
    formCode: '203',
    examples: 'dichloromethane, chloroform'
  },
  'oxidizer': {
    name: 'Oxidizers',
    incompatible: ['flammable', 'organic_solvent', 'organic_acid', 'reducing_agent'],
    formCode: '204',
    examples: 'hydrogen peroxide, sodium hypochlorite'
  },
  'toxic': {
    name: 'Toxic Materials',
    incompatible: [],
    formCode: '204',
    examples: 'mercury compounds, lead compounds, pesticides'
  },
  'reactive': {
    name: 'Water Reactive',
    incompatible: ['organic_acid', 'inorganic_acid', 'caustic', 'water_based'],
    formCode: '204',
    examples: 'sodium metal, calcium carbide'
  },
  'cyanide': {
    name: 'Cyanides',
    incompatible: ['organic_acid', 'inorganic_acid', 'oxidizing_acid'],
    formCode: '204',
    examples: 'sodium cyanide, potassium cyanide'
  }
};

// Build intelligent classification prompt
function buildClassificationPrompt(sdsText) {
  return `You are an expert hazardous waste chemist analyzing an SDS for lab pack classification.

ANALYZE THIS SDS AND DETERMINE:

1. CHEMICAL IDENTITY
- What is the exact product name?
- What are the main chemical constituents?
- What is the physical state (liquid/solid/gas)?

2. HAZARD CHARACTERISTICS
- pH value (if aqueous)
- Flash point (if applicable)
- Is it water-reactive?
- Is it an oxidizer?
- Does it contain cyanides or sulfides?

3. LAB PACK CATEGORY
Based on the chemical nature, assign ONE primary category:
- organic_acid: Organic acids (acetic, formic, etc.)
- inorganic_acid: Mineral acids (HCl, H2SO4, etc.) 
- oxidizing_acid: Oxidizing acids (HNO3, HClO4)
- caustic: Bases/alkaline materials (NaOH, KOH, NH3)
- flammable: Flammable liquids (flash point < 140°F)
- organic_solvent: Non-flammable organics
- oxidizer: Oxidizing agents (peroxides, hypochlorites)
- toxic: Acutely toxic materials
- reactive: Water-reactive materials
- cyanide: Cyanide-containing materials

4. REGULATORY CODES
- Federal RCRA codes (D001-D043, F, K, P, U)
- DOT hazard class
- Texas form code (102-106, 203-204, etc.)

IMPORTANT: Think through the chemistry logically. Don't just match keywords.
- If pH ≤ 2, it's an acid (organic or inorganic based on composition)
- If pH ≥ 12.5, it's a caustic
- If flash point < 140°F, it's flammable
- Oxidizers contain oxygen-releasing compounds
- Water-reactive materials react violently with water

SDS CONTENT:
${sdsText.substring(0, 4000)}

Return JSON with this structure:
{
  "productName": "exact name from SDS",
  "chemicalComposition": ["main constituents"],
  "physicalState": "liquid|solid|gas",
  "pH": numeric value or null,
  "flashPoint": {"fahrenheit": number, "celsius": number} or null,
  "labPackCategory": "category from list above",
  "categoryReasoning": "explanation of category choice",
  "federalCodes": ["D001", "D002", etc.],
  "dotHazardClass": "3" or null,
  "texasFormCode": "105",
  "compatibility": {
    "incompatibleWith": ["list of incompatible categories"],
    "specialNotes": "any special handling requirements"
  }
}`;
}

// Analyze a single SDS file
async function analyzeSingleSDS(fileContent, filename, aiProvider = 'groq') {
  try {
    const prompt = buildClassificationPrompt(fileContent);
    let result;

    if (aiProvider === 'groq' && providers.groq) {
      const completion = await providers.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are a hazardous waste expert specializing in lab pack classification. Focus on chemical compatibility and safety.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      });
      result = completion.choices[0].message.content;
    } else if (aiProvider === 'gemini' && providers.gemini) {
      const model = providers.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const response = await model.generateContent(prompt);
      result = response.response.text();
    } else {
      throw new Error('No AI provider available');
    }

    // Parse JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const classification = JSON.parse(jsonMatch[0]);
      
      // Add metadata
      classification.filename = filename;
      classification.analyzedAt = new Date().toISOString();
      
      // Validate and correct if needed
      validateClassification(classification);
      
      return classification;
    }

    throw new Error('Failed to parse AI response');
    
  } catch (error) {
    console.error(`Error analyzing ${filename}:`, error);
    return {
      filename,
      error: error.message,
      status: 'failed'
    };
  }
}

// Validate and correct classification
function validateClassification(classification) {
  // Ensure category makes chemical sense
  const pH = classification.pH;
  const flashPoint = classification.flashPoint?.fahrenheit;
  
  // pH-based corrections
  if (typeof pH === 'number') {
    if (pH <= 2.0 && !classification.labPackCategory.includes('acid')) {
      classification.labPackCategory = classification.chemicalComposition?.some(c => 
        /organic|acetic|formic|citric/i.test(c)) ? 'organic_acid' : 'inorganic_acid';
      classification.categoryReasoning = 'Corrected: pH ≤ 2.0 indicates acid';
    }
    if (pH >= 12.5 && classification.labPackCategory !== 'caustic') {
      classification.labPackCategory = 'caustic';
      classification.categoryReasoning = 'Corrected: pH ≥ 12.5 indicates caustic';
    }
  }
  
  // Flash point corrections
  if (flashPoint && flashPoint < 140 && classification.labPackCategory !== 'flammable') {
    classification.labPackCategory = 'flammable';
    classification.categoryReasoning = 'Corrected: Flash point < 140°F indicates flammable';
  }
  
  // Set incompatibilities based on category
  const category = LAB_PACK_CATEGORIES[classification.labPackCategory];
  if (category) {
    classification.compatibility = {
      incompatibleWith: category.incompatible,
      specialNotes: classification.compatibility?.specialNotes || ''
    };
  }
  
  return classification;
}

// Analyze multiple SDS files in batch
async function analyzeBatch(files, config = {}) {
  const { 
    aiProvider = 'groq',
    maxConcurrent = 3,
    state = 'TX'
  } = config;

  const results = {
    containers: [],
    compatibility: {
      groups: {},
      conflicts: [],
      recommendations: []
    },
    summary: {
      totalFiles: files.length,
      successful: 0,
      failed: 0,
      categories: {}
    }
  };

  // Process files in batches for rate limiting
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(file => analyzeSingleSDS(file.content, file.name, aiProvider))
    );
    
    results.containers.push(...batchResults);
  }

  // Group by compatibility
  results.containers.forEach(container => {
    if (container.status !== 'failed') {
      const category = container.labPackCategory;
      
      if (!results.compatibility.groups[category]) {
        results.compatibility.groups[category] = {
          category,
          name: LAB_PACK_CATEGORIES[category]?.name || category,
          containers: [],
          totalVolume: 0,
          hazardCodes: new Set(),
          formCode: LAB_PACK_CATEGORIES[category]?.formCode
        };
      }
      
      results.compatibility.groups[category].containers.push(container);
      container.federalCodes?.forEach(code => 
        results.compatibility.groups[category].hazardCodes.add(code)
      );
      
      results.summary.successful++;
      results.summary.categories[category] = (results.summary.categories[category] || 0) + 1;
    } else {
      results.summary.failed++;
    }
  });

  // Check for incompatibilities
  const categories = Object.keys(results.compatibility.groups);
  categories.forEach(cat1 => {
    categories.forEach(cat2 => {
      if (cat1 !== cat2) {
        const incompatible = LAB_PACK_CATEGORIES[cat1]?.incompatible || [];
        if (incompatible.includes(cat2)) {
          results.compatibility.conflicts.push({
            category1: cat1,
            category2: cat2,
            severity: 'high',
            message: `${LAB_PACK_CATEGORIES[cat1]?.name} incompatible with ${LAB_PACK_CATEGORIES[cat2]?.name}`
          });
        }
      }
    });
  });

  // Generate recommendations
  generateRecommendations(results);

  return results;
}

// Generate lab pack recommendations
function generateRecommendations(results) {
  const groups = Object.values(results.compatibility.groups);
  
  groups.forEach(group => {
    const recommendation = {
      category: group.category,
      name: group.name,
      containerCount: group.containers.length,
      packingInstructions: []
    };

    // Category-specific instructions
    switch (group.category) {
      case 'organic_acid':
      case 'inorganic_acid':
        recommendation.packingInstructions.push(
          'Use acid-resistant containers',
          'Add neutralizing agent as absorbent',
          'Keep separate from bases and oxidizers'
        );
        break;
      case 'oxidizing_acid':
        recommendation.packingInstructions.push(
          'Pack separately from ALL other materials',
          'Use chemically resistant containers',
          'NO organic absorbents'
        );
        break;
      case 'caustic':
        recommendation.packingInstructions.push(
          'Use caustic-resistant containers',
          'Keep separate from acids',
          'Use appropriate absorbent material'
        );
        break;
      case 'flammable':
        recommendation.packingInstructions.push(
          'Ground containers to prevent static',
          'Use spark-proof tools',
          'Keep away from heat sources and oxidizers'
        );
        break;
      case 'reactive':
        recommendation.packingInstructions.push(
          'Keep absolutely dry',
          'Pack under inert atmosphere if required',
          'Isolate from incompatible materials'
        );
        break;
      case 'cyanide':
        recommendation.packingInstructions.push(
          'NEVER mix with acids',
          'Pack separately',
          'Label clearly with poison warnings'
        );
        break;
    }

    // Add hazard codes
    if (group.hazardCodes.size > 0) {
      recommendation.hazardCodes = Array.from(group.hazardCodes);
      recommendation.manifestRequired = group.hazardCodes.has('D001') || 
                                       group.hazardCodes.has('D002') ||
                                       group.hazardCodes.size > 0;
    }

    results.compatibility.recommendations.push(recommendation);
  });

  // Add general recommendations
  if (results.compatibility.conflicts.length > 0) {
    results.compatibility.recommendations.unshift({
      type: 'warning',
      priority: 'high',
      message: `Found ${results.compatibility.conflicts.length} incompatible chemical groups. These must be packed separately.`,
      conflicts: results.compatibility.conflicts
    });
  }
}

// Generate Excel report
function generateExcelReport(results) {
  // This would integrate with an Excel library like xlsx
  // For now, return structured data that can be converted
  const worksheets = {
    summary: {
      headers: ['Category', 'Count', 'Form Code', 'Hazard Codes'],
      rows: Object.values(results.compatibility.groups).map(group => [
        group.name,
        group.containers.length,
        group.formCode,
        Array.from(group.hazardCodes).join(', ')
      ])
    },
    details: {
      headers: ['Product Name', 'Category', 'pH', 'Flash Point', 'Federal Codes', 'Special Notes'],
      rows: results.containers.map(c => [
        c.productName,
        c.labPackCategory,
        c.pH,
        c.flashPoint?.fahrenheit,
        c.federalCodes?.join(', '),
        c.compatibility?.specialNotes
      ])
    },
    incompatibilities: {
      headers: ['Group 1', 'Group 2', 'Severity', 'Notes'],
      rows: results.compatibility.conflicts.map(c => [
        LAB_PACK_CATEGORIES[c.category1]?.name,
        LAB_PACK_CATEGORIES[c.category2]?.name,
        c.severity,
        c.message
      ])
    }
  };
  
  return worksheets;
}

// Export functions
export {
  analyzeSingleSDS,
  analyzeBatch,
  generateExcelReport,
  LAB_PACK_CATEGORIES
};