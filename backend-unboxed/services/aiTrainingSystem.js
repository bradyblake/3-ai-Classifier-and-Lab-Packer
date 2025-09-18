// AI Training System for SDS Classification
// This system helps improve LM Studio's classification accuracy through:
// 1. Example-based learning (few-shot prompting)
// 2. Feedback collection and correction
// 3. Dynamic prompt improvement

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TrainingDataValidator from './trainingDataValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AITrainingSystem {
  constructor() {
    this.trainingDataPath = path.join(__dirname, '../training_data');
    this.examplesPath = path.join(this.trainingDataPath, 'classification_examples.json');
    this.feedbackPath = path.join(this.trainingDataPath, 'user_feedback.json');
    this.promptTemplatePath = path.join(this.trainingDataPath, 'prompt_templates.json');
    
    this.validator = new TrainingDataValidator();
    
    this.ensureDirectories();
    this.loadTrainingData();
    this.validateLoadedData();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.trainingDataPath)) {
      fs.mkdirSync(this.trainingDataPath, { recursive: true });
    }
  }

  loadTrainingData() {
    // Load classification examples
    if (fs.existsSync(this.examplesPath)) {
      this.examples = JSON.parse(fs.readFileSync(this.examplesPath, 'utf8'));
    } else {
      this.examples = this.getDefaultExamples();
      this.saveExamples();
    }

    // Load user feedback
    if (fs.existsSync(this.feedbackPath)) {
      this.feedback = JSON.parse(fs.readFileSync(this.feedbackPath, 'utf8'));
    } else {
      this.feedback = [];
    }

    // Load prompt templates
    if (fs.existsSync(this.promptTemplatePath)) {
      this.promptTemplates = JSON.parse(fs.readFileSync(this.promptTemplatePath, 'utf8'));
    } else {
      this.promptTemplates = this.getDefaultPromptTemplates();
      this.savePromptTemplates();
    }
  }
  
  validateLoadedData() {
    // Validate all loaded training data
    const report = this.validator.validateDataset(this.feedback, this.examples);
    
    if (report.errors.length > 0) {
      console.warn('⚠️ Training data validation errors found:');
      report.errors.forEach(err => {
        console.warn(`  - ${err.material}: ${err.errors.join(', ')}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('📋 Training data validation warnings:');
      report.warnings.forEach(warn => {
        console.log(`  - ${warn.material}: ${warn.warnings.join(', ')}`);
      });
    }
    
    console.log(`✅ Training data quality score: ${report.qualityScore.toFixed(1)}%`);
    console.log(`📊 ${report.validFeedback}/${report.totalFeedback} feedback entries valid`);
    
    // Auto-fix issues if quality is acceptable
    if (report.qualityScore >= 70) {
      this.autoFixFeedback();
    }
    
    return report;
  }
  
  autoFixFeedback() {
    let fixedCount = 0;
    const fixedFeedback = [];
    
    for (const entry of this.feedback) {
      const { fixed, changes, hasChanges } = this.validator.autoFix(entry);
      
      if (hasChanges) {
        fixedCount++;
        console.log(`🔧 Auto-fixed ${entry.material}:`, changes.join(', '));
      }
      
      fixedFeedback.push(fixed);
    }
    
    if (fixedCount > 0) {
      this.feedback = fixedFeedback;
      this.saveFeedback();
      console.log(`✨ Auto-fixed ${fixedCount} feedback entries`);
    }
  }

  getDefaultExamples() {
    return [
      {
        id: "example_001",
        material: "Acetone",
        key_properties: {
          pH: null,
          flashPoint: -20,
          physicalState: "liquid",
          primaryHazard: "flammable"
        },
        correct_classification: {
          federal: ["D001"],
          texas_form_code: "203",
          dot_un: "UN1090",
          reasoning: "Flash point < 60°C makes it D001 ignitable. Form code 203 for organic solvents."
        }
      },
      {
        id: "example_002", 
        material: "Muriatic Acid (31.45% HCl)",
        key_properties: {
          pH: 1,
          flashPoint: null,
          physicalState: "liquid",
          primaryHazard: "corrosive"
        },
        correct_classification: {
          federal: ["D002"],
          texas_form_code: "105",
          dot_un: "UN1789",
          reasoning: "pH ≤ 2 makes it D002 corrosive. Form code 105 for acid wastes."
        }
      },
      {
        id: "example_003",
        material: "Diesel Fuel",
        key_properties: {
          pH: null,
          flashPoint: 52,
          physicalState: "liquid", 
          primaryHazard: "flammable"
        },
        correct_classification: {
          federal: ["D001"],
          texas_form_code: "202",
          dot_un: "UN1202",
          reasoning: "Flash point 52°C < 60°C makes it D001. Form code 202 for petroleum products."
        }
      },
      {
        id: "example_004",
        material: "Sodium Hydroxide Solution (50%)",
        key_properties: {
          pH: 14,
          flashPoint: null,
          physicalState: "liquid",
          primaryHazard: "corrosive"
        },
        correct_classification: {
          federal: ["D002"],
          texas_form_code: "106",
          dot_un: "UN1824",
          reasoning: "pH ≥ 12.5 makes it D002 corrosive. Form code 106 for alkaline wastes."
        }
      },
      {
        id: "example_005",
        material: "Methanol",
        key_properties: {
          pH: null,
          flashPoint: 11,
          physicalState: "liquid",
          primaryHazard: "flammable/toxic"
        },
        correct_classification: {
          federal: ["D001", "D003"],
          texas_form_code: "203",
          dot_un: "UN1230",
          reasoning: "Flash point 11°C makes it D001. Toxic properties may add D003. Form code 203 for organic solvents."
        }
      },
      {
        id: "example_006",
        material: "Used Motor Oil",
        key_properties: {
          pH: null,
          flashPoint: 150,
          physicalState: "liquid",
          primaryHazard: "petroleum",
          isUsed: true
        },
        correct_classification: {
          federal: [],
          texas_form_code: "302",
          dot_un: "Non-regulated",
          reasoning: "Flash point > 60°C, not RCRA hazardous. Form code 302 for used petroleum products."
        }
      },
      {
        id: "example_007",
        material: "Lead-Acid Battery",
        key_properties: {
          pH: 1,
          flashPoint: null,
          physicalState: "solid/liquid",
          primaryHazard: "corrosive/toxic",
          contains: ["lead", "sulfuric acid"]
        },
        correct_classification: {
          federal: ["D002", "D008"],
          texas_form_code: "505",
          dot_un: "UN2794",
          reasoning: "Contains sulfuric acid (pH < 2) = D002. Contains lead = D008. Form code 505 for batteries."
        }
      },
      {
        id: "example_008",
        material: "Paint Waste (Latex)",
        key_properties: {
          pH: 8,
          flashPoint: null,
          physicalState: "liquid",
          primaryHazard: "non-hazardous",
          isLatex: true
        },
        correct_classification: {
          federal: [],
          texas_form_code: "101",
          dot_un: "Non-regulated",
          reasoning: "Latex paint is typically non-hazardous. Form code 101 for non-hazardous liquids."
        }
      },
      {
        id: "example_009",
        material: "Xylene",
        key_properties: {
          pH: null,
          flashPoint: 27,
          physicalState: "liquid",
          primaryHazard: "flammable"
        },
        correct_classification: {
          federal: ["D001"],
          texas_form_code: "203",
          dot_un: "UN1307",
          reasoning: "Flash point 27°C < 60°C makes it D001. Form code 203 for organic solvents."
        }
      },
      {
        id: "example_010",
        material: "Chromic Acid Solution",
        key_properties: {
          pH: 1,
          flashPoint: null,
          physicalState: "liquid",
          primaryHazard: "corrosive/toxic",
          contains: ["chromium"]
        },
        correct_classification: {
          federal: ["D002", "D007"],
          texas_form_code: "105",
          dot_un: "UN1755",
          reasoning: "pH < 2 = D002. Contains chromium = D007. Form code 105 for acid wastes."
        }
      }
    ];
  }

  getDefaultPromptTemplates() {
    return {
      classification_prompt: `You are an expert hazardous waste classifier. Analyze the following SDS data and classify the waste according to EPA RCRA and Texas state regulations.

IMPORTANT CLASSIFICATION RULES:

FEDERAL RCRA D-CODES:
- D001 (Ignitability): Flash point < 60°C (140°F) for liquids
- D002 (Corrosivity): pH ≤ 2.0 or pH ≥ 12.5 for aqueous solutions
- D003 (Reactivity): Unstable, reacts violently with water, generates toxic gases
- D004-D043 (Toxicity): Contains specific toxic constituents above TCLP limits

TEXAS FORM CODES (RG-22):
Fresh/Unused Materials:
- 101: Non-hazardous inorganic liquids
- 102: Aqueous wastes with pH 2-12.5
- 105: Acid wastes (pH ≤ 2)
- 106: Alkaline wastes (pH ≥ 12.5)
- 201: Non-hazardous organic liquids
- 202: Petroleum products (flash point > 60°C)
- 203: Organic solvents (typically flammable)

Used/Spent Materials (add 100 to base code):
- 302: Used petroleum products
- 303: Used organic solvents
- 402: Used aqueous wastes

Special Categories:
- 505: Batteries
- 605: Contaminated soil
- 705: Lab packs

EXAMPLES OF CORRECT CLASSIFICATIONS:
{examples}

Now classify this material:
{material_data}`,

      extraction_prompt: `Extract hazardous waste classification data from this SDS text. Focus on:
1. pH value (exact number if available)
2. Flash point (in Celsius)
3. Physical state
4. Chemical composition with CAS numbers
5. Any RCRA characteristics (ignitability, corrosivity, reactivity, toxicity)
6. DOT shipping information

Return data as structured JSON.`,

      correction_prompt: `The AI incorrectly classified this material. Here's the correction:
Material: {material}
AI Classification: {ai_result}
Correct Classification: {correct_result}
Reason for correction: {reason}

Learn from this correction and apply similar logic to future classifications.`
    };
  }

  // Build an enhanced prompt with relevant examples
  buildEnhancedPrompt(sdsText, materialType = null) {
    // Select relevant examples based on material type
    let relevantExamples = this.examples;
    
    if (materialType) {
      // Filter examples by similarity
      relevantExamples = this.examples.filter(ex => {
        const material = ex.material.toLowerCase();
        const type = materialType.toLowerCase();
        
        // Check for keyword matches
        if (material.includes(type) || type.includes(material)) return true;
        
        // Check for hazard type matches
        if (ex.key_properties.primaryHazard && 
            ex.key_properties.primaryHazard.includes(type)) return true;
        
        return false;
      }).slice(0, 3); // Use top 3 most relevant examples
    }

    // If no specific matches, use diverse examples
    if (relevantExamples.length === 0) {
      relevantExamples = [
        this.examples.find(e => e.key_properties.primaryHazard === 'flammable'),
        this.examples.find(e => e.key_properties.primaryHazard === 'corrosive'),
        this.examples.find(e => e.key_properties.primaryHazard === 'toxic')
      ].filter(Boolean);
    }

    // Format examples for the prompt
    const examplesText = relevantExamples.map(ex => {
      return `Material: ${ex.material}
pH: ${ex.key_properties.pH || 'N/A'}
Flash Point: ${ex.key_properties.flashPoint ? ex.key_properties.flashPoint + '°C' : 'N/A'}
Classification: Federal ${ex.correct_classification.federal.join(', ') || 'Non-hazardous'}, Texas Form Code ${ex.correct_classification.texas_form_code}, DOT ${ex.correct_classification.dot_un}
Reasoning: ${ex.correct_classification.reasoning}`;
    }).join('\n\n');

    // Build the enhanced prompt
    const prompt = this.promptTemplates.classification_prompt
      .replace('{examples}', examplesText)
      .replace('{material_data}', sdsText);

    return prompt;
  }

  // Record user feedback for continuous improvement
  recordFeedback(material, aiResult, correctResult, reason) {
    const feedback = {
      id: `feedback_${Date.now()}`,
      timestamp: new Date().toISOString(),
      material,
      ai_result: aiResult,
      correct_result: correctResult,
      reason,
      applied: false
    };

    this.feedback.push(feedback);
    this.saveFeedback();

    // If we have enough similar feedback, create a new example
    this.analyzeAndLearnFromFeedback(feedback);

    return feedback;
  }

  // Analyze feedback patterns and create new training examples
  analyzeAndLearnFromFeedback(newFeedback) {
    // Count similar corrections
    const similarFeedback = this.feedback.filter(f => {
      return f.reason && f.reason.toLowerCase().includes(newFeedback.reason.toLowerCase().split(' ')[0]);
    });

    // If we see the same type of error 3+ times, create a new training example
    if (similarFeedback.length >= 3) {
      const newExample = {
        id: `learned_${Date.now()}`,
        material: newFeedback.material,
        key_properties: this.extractKeyProperties(newFeedback),
        correct_classification: newFeedback.correct_result,
        source: "learned_from_feedback",
        feedback_ids: similarFeedback.map(f => f.id)
      };

      this.examples.push(newExample);
      this.saveExamples();

      // Mark feedback as applied
      similarFeedback.forEach(f => f.applied = true);
      this.saveFeedback();

      console.log(`📚 Learned new classification pattern from user feedback`);
    }
  }

  extractKeyProperties(feedback) {
    // Extract key properties from the feedback
    const props = {
      pH: null,
      flashPoint: null,
      physicalState: 'unknown',
      primaryHazard: 'unknown'
    };

    // Try to extract from the material description or reason
    const text = `${feedback.material} ${feedback.reason}`.toLowerCase();
    
    // Extract pH
    const pHMatch = text.match(/ph[:\s]+([0-9.]+)/);
    if (pHMatch) props.pH = parseFloat(pHMatch[1]);

    // Extract flash point
    const flashMatch = text.match(/flash\s*point[:\s]+([0-9.]+)/);
    if (flashMatch) props.flashPoint = parseFloat(flashMatch[1]);

    // Determine primary hazard
    if (text.includes('corrosive') || text.includes('acid') || text.includes('alkaline')) {
      props.primaryHazard = 'corrosive';
    } else if (text.includes('flammable') || text.includes('ignitable')) {
      props.primaryHazard = 'flammable';
    } else if (text.includes('toxic')) {
      props.primaryHazard = 'toxic';
    }

    return props;
  }

  // Save methods
  saveExamples() {
    fs.writeFileSync(this.examplesPath, JSON.stringify(this.examples, null, 2));
  }

  saveFeedback() {
    fs.writeFileSync(this.feedbackPath, JSON.stringify(this.feedback, null, 2));
  }

  savePromptTemplates() {
    fs.writeFileSync(this.promptTemplatePath, JSON.stringify(this.promptTemplates, null, 2));
  }

  // Get training statistics
  getTrainingStats() {
    return {
      totalExamples: this.examples.length,
      defaultExamples: this.examples.filter(e => !e.source).length,
      learnedExamples: this.examples.filter(e => e.source === 'learned_from_feedback').length,
      totalFeedback: this.feedback.length,
      appliedFeedback: this.feedback.filter(f => f.applied).length,
      pendingFeedback: this.feedback.filter(f => !f.applied).length
    };
  }

  // Export training data for fine-tuning
  exportForFineTuning() {
    const trainingData = this.examples.map(ex => {
      return {
        prompt: `Classify this hazardous waste: ${ex.material} with properties: pH=${ex.key_properties.pH}, flash point=${ex.key_properties.flashPoint}°C`,
        completion: `Federal: ${ex.correct_classification.federal.join(', ') || 'Non-hazardous'}, Texas Form Code: ${ex.correct_classification.texas_form_code}, DOT: ${ex.correct_classification.dot_un}. Reasoning: ${ex.correct_classification.reasoning}`
      };
    });

    const exportPath = path.join(this.trainingDataPath, 'fine_tuning_data.jsonl');
    const jsonlData = trainingData.map(item => JSON.stringify(item)).join('\n');
    fs.writeFileSync(exportPath, jsonlData);

    return exportPath;
  }
}

export default AITrainingSystem;