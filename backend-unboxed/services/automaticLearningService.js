// Automatic Learning Service
// Continuously learns from correct classifications to improve accuracy

import fs from 'fs';
import path from 'path';

class AutomaticLearningService {
  constructor() {
    this.name = "Automatic Learning Service";
    this.trainingDataPath = 'backend/training_data/classification_examples.json';
    this.userFeedbackPath = 'backend/training_data/user_feedback.json';
    this.incorrectFeedbackPath = 'backend/feedback/failed_classifications.json';
    this.learnedExamplesPath = 'backend/training_data/learned_examples.json';
    
    // Learning thresholds
    this.minExamplesForRetraining = 5;
    this.retrainingInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.lastRetrainingTime = 0;
    
    console.log('🧠 Automatic Learning Service initialized');
  }

  /**
   * Check if system should retrain based on new data
   */
  shouldRetrain() {
    const now = Date.now();
    const timeSinceLastRetrain = now - this.lastRetrainingTime;
    
    // Check if enough time has passed
    if (timeSinceLastRetrain < this.retrainingInterval) {
      return false;
    }

    // Check if we have enough new examples
    const newExamples = this.getUnprocessedFeedback();
    return newExamples.length >= this.minExamplesForRetraining;
  }

  /**
   * Get feedback that hasn't been processed into training examples
   */
  getUnprocessedFeedback() {
    try {
      const userFeedback = this.loadJSON(this.userFeedbackPath) || [];
      const incorrectFeedback = this.loadJSON(this.incorrectFeedbackPath) || [];
      
      // Filter unprocessed feedback
      return [
        ...userFeedback.filter(f => !f.processed),
        ...incorrectFeedback.filter(f => !f.processed)
      ];
    } catch (error) {
      console.warn('⚠️ Error loading feedback data:', error.message);
      return [];
    }
  }

  /**
   * Load JSON file with error handling
   */
  loadJSON(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load ${filePath}:`, error.message);
    }
    return null;
  }

  /**
   * Save JSON file with error handling
   */
  saveJSON(filePath, data) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Failed to save ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Process new feedback into training examples
   */
  async processNewFeedback() {
    try {
      const unprocessedFeedback = this.getUnprocessedFeedback();
      
      if (unprocessedFeedback.length === 0) {
        console.log('📚 No new feedback to process');
        return { processed: 0, added: 0 };
      }

      console.log(`🔄 Processing ${unprocessedFeedback.length} feedback entries...`);
      
      // Load existing training examples
      let trainingExamples = this.loadJSON(this.trainingDataPath) || [];
      let addedCount = 0;

      for (const feedback of unprocessedFeedback) {
        const trainingExample = this.convertFeedbackToTrainingExample(feedback);
        
        if (trainingExample && !this.isDuplicate(trainingExample, trainingExamples)) {
          trainingExamples.push(trainingExample);
          addedCount++;
          console.log(`✅ Added training example: ${trainingExample.material}`);
        }

        // Mark feedback as processed
        feedback.processed = true;
        feedback.processedAt = new Date().toISOString();
      }

      // Save updated training examples
      if (addedCount > 0) {
        this.saveJSON(this.trainingDataPath, trainingExamples);
        console.log(`📚 Added ${addedCount} new training examples`);
      }

      // Save updated feedback files
      this.updateFeedbackFiles(unprocessedFeedback);

      return { 
        processed: unprocessedFeedback.length, 
        added: addedCount 
      };

    } catch (error) {
      console.error('❌ Error processing feedback:', error);
      return { processed: 0, added: 0, error: error.message };
    }
  }

  /**
   * Convert feedback to training example format
   */
  convertFeedbackToTrainingExample(feedback) {
    try {
      // Handle different feedback formats
      let material, keyProperties, correctClassification;

      if (feedback.material) {
        // User feedback format
        material = feedback.material;
        keyProperties = {
          pH: feedback.ai_result?.pH || null,
          flashPoint: feedback.ai_result?.flashPoint || null,
          physicalState: feedback.ai_result?.physicalState || 'unknown',
          primaryHazard: 'unknown'
        };
        correctClassification = {
          federal: feedback.correct_result?.federal || [],
          texas_form_code: feedback.correct_result?.texas_form_code || null,
          dot_un: feedback.correct_result?.dot_un || null,
          reasoning: feedback.reason || 'User correction'
        };
      } else if (feedback.productName) {
        // Incorrect classification feedback format
        material = feedback.productName;
        keyProperties = {
          pH: feedback.inputData?.pH || null,
          flashPoint: feedback.inputData?.flashPoint || null,
          physicalState: feedback.inputData?.physicalState || 'unknown',
          primaryHazard: 'unknown'
        };
        // For incorrect feedback, we don't have the correct answer yet
        // This would need manual review
        return null;
      } else {
        return null;
      }

      return {
        id: `learned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        material,
        key_properties: keyProperties,
        correct_classification: correctClassification,
        source: 'automatic_learning',
        learned_at: new Date().toISOString(),
        confidence: 0.8 // Medium confidence for user corrections
      };

    } catch (error) {
      console.warn('⚠️ Failed to convert feedback:', error.message);
      return null;
    }
  }

  /**
   * Check if training example is duplicate
   */
  isDuplicate(newExample, existingExamples) {
    return existingExamples.some(existing => 
      existing.material?.toLowerCase().trim() === newExample.material?.toLowerCase().trim()
    );
  }

  /**
   * Update feedback files to mark as processed
   */
  updateFeedbackFiles(processedFeedback) {
    try {
      // Update user feedback file
      const userFeedback = this.loadJSON(this.userFeedbackPath) || [];
      const userProcessed = processedFeedback.filter(f => f.material);
      
      userProcessed.forEach(processed => {
        const existing = userFeedback.find(f => f.id === processed.id);
        if (existing) {
          existing.processed = true;
          existing.processedAt = processed.processedAt;
        }
      });
      
      if (userProcessed.length > 0) {
        this.saveJSON(this.userFeedbackPath, userFeedback);
      }

      // Update incorrect feedback file
      const incorrectFeedback = this.loadJSON(this.incorrectFeedbackPath) || [];
      const incorrectProcessed = processedFeedback.filter(f => f.productName);
      
      incorrectProcessed.forEach(processed => {
        const existing = incorrectFeedback.find(f => f.id === processed.id);
        if (existing) {
          existing.processed = true;
          existing.processedAt = processed.processedAt;
        }
      });

      if (incorrectProcessed.length > 0) {
        this.saveJSON(this.incorrectFeedbackPath, incorrectFeedback);
      }

    } catch (error) {
      console.error('❌ Error updating feedback files:', error.message);
    }
  }

  /**
   * Get learning statistics
   */
  getStats() {
    try {
      const trainingExamples = this.loadJSON(this.trainingDataPath) || [];
      const userFeedback = this.loadJSON(this.userFeedbackPath) || [];
      const incorrectFeedback = this.loadJSON(this.incorrectFeedbackPath) || [];
      
      const learnedExamples = trainingExamples.filter(e => e.source === 'automatic_learning');
      const unprocessedFeedback = this.getUnprocessedFeedback();

      return {
        totalTrainingExamples: trainingExamples.length,
        learnedExamples: learnedExamples.length,
        userFeedbackEntries: userFeedback.length,
        incorrectFeedbackEntries: incorrectFeedback.length,
        unprocessedFeedback: unprocessedFeedback.length,
        readyForRetraining: this.shouldRetrain(),
        lastRetrainingTime: new Date(this.lastRetrainingTime).toISOString()
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Start automatic learning loop
   */
  startLearningLoop() {
    console.log('🔄 Starting automatic learning loop...');
    
    // Process feedback immediately
    this.processNewFeedback();
    
    // Set up periodic processing
    setInterval(async () => {
      console.log('🧠 Checking for new learning opportunities...');
      const result = await this.processNewFeedback();
      
      if (result.added > 0) {
        console.log(`📚 Learning update: Added ${result.added} new examples`);
        this.lastRetrainingTime = Date.now();
      }
      
      if (this.shouldRetrain()) {
        console.log('🎓 Ready for model retraining with new examples');
        // Here we could trigger actual model retraining
      }
      
    }, 60 * 60 * 1000); // Check every hour
  }
}

export default new AutomaticLearningService();