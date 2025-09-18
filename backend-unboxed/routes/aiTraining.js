// AI Training Routes
import express from 'express';
import AITrainingSystem from '../services/aiTrainingSystem.js';

const router = express.Router();
const trainingSystem = new AITrainingSystem();

// Submit feedback for incorrect classification
router.post('/feedback', async (req, res) => {
  try {
    const { material, ai_result, correct_result, reason } = req.body;
    
    if (!material || !reason) {
      return res.status(400).json({ 
        error: 'Material name and reason are required' 
      });
    }

    const feedback = trainingSystem.recordFeedback(
      material,
      ai_result,
      correct_result,
      reason
    );

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedback,
      stats: trainingSystem.getTrainingStats()
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get training statistics
router.get('/stats', (req, res) => {
  try {
    const stats = trainingSystem.getTrainingStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get enhanced prompt with examples for a material
router.post('/enhanced-prompt', (req, res) => {
  try {
    const { sdsText, materialType } = req.body;
    
    const enhancedPrompt = trainingSystem.buildEnhancedPrompt(
      sdsText,
      materialType
    );

    res.json({
      prompt: enhancedPrompt,
      examplesUsed: trainingSystem.examples.length
    });
  } catch (error) {
    console.error('Enhanced prompt error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export training data for fine-tuning
router.get('/export', (req, res) => {
  try {
    const exportPath = trainingSystem.exportForFineTuning();
    
    res.json({
      success: true,
      message: 'Training data exported successfully',
      path: exportPath,
      examples: trainingSystem.examples.length
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all training examples
router.get('/examples', (req, res) => {
  try {
    res.json({
      examples: trainingSystem.examples,
      count: trainingSystem.examples.length
    });
  } catch (error) {
    console.error('Examples error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a new training example manually
router.post('/examples', (req, res) => {
  try {
    const example = req.body;
    
    if (!example.material || !example.correct_classification) {
      return res.status(400).json({ 
        error: 'Material and correct classification are required' 
      });
    }

    // Add unique ID
    example.id = `manual_${Date.now()}`;
    example.source = 'manual_entry';
    
    trainingSystem.examples.push(example);
    trainingSystem.saveExamples();

    res.json({
      success: true,
      message: 'Example added successfully',
      example,
      totalExamples: trainingSystem.examples.length
    });
  } catch (error) {
    console.error('Add example error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;