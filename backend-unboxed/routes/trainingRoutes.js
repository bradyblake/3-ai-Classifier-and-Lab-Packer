// Training Routes - API endpoints for AI training management
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Training routes are working!' });
});

const TRAINING_DATA_PATH = path.join(__dirname, '../training_data');
const EXAMPLES_FILE = path.join(TRAINING_DATA_PATH, 'classification_examples.json');
const FEEDBACK_FILE = path.join(TRAINING_DATA_PATH, 'user_feedback.json');

// Ensure training data directory exists
if (!fs.existsSync(TRAINING_DATA_PATH)) {
  fs.mkdirSync(TRAINING_DATA_PATH, { recursive: true });
}

// Get all training examples
router.get('/examples', (req, res) => {
  try {
    if (fs.existsSync(EXAMPLES_FILE)) {
      const examples = JSON.parse(fs.readFileSync(EXAMPLES_FILE, 'utf8'));
      res.json(examples);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading training examples:', error);
    res.status(500).json({ error: 'Failed to load training examples' });
  }
});

// Add new training example
router.post('/add-example', (req, res) => {
  try {
    const newExample = req.body;
    
    // Validate required fields
    if (!newExample.material || !newExample.correct_classification?.reasoning) {
      return res.status(400).json({ error: 'Material name and reasoning are required' });
    }

    // Load existing examples
    let examples = [];
    if (fs.existsSync(EXAMPLES_FILE)) {
      examples = JSON.parse(fs.readFileSync(EXAMPLES_FILE, 'utf8'));
    }

    // Add new example
    examples.push(newExample);

    // Save back to file
    fs.writeFileSync(EXAMPLES_FILE, JSON.stringify(examples, null, 2));

    console.log(`✅ Added training example: ${newExample.material}`);
    res.json({ success: true, message: 'Training example added successfully' });

  } catch (error) {
    console.error('Error adding training example:', error);
    res.status(500).json({ error: 'Failed to add training example' });
  }
});

// Get user feedback/corrections
router.get('/feedback', (req, res) => {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
      res.json(feedback);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading feedback:', error);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

// Add user correction/feedback
router.post('/add-feedback', (req, res) => {
  try {
    const feedback = req.body;
    
    // Load existing feedback
    let allFeedback = [];
    if (fs.existsSync(FEEDBACK_FILE)) {
      allFeedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    }

    // Add timestamp and ID
    feedback.id = `feedback_${Date.now()}`;
    feedback.timestamp = new Date().toISOString();
    feedback.applied = false;

    allFeedback.push(feedback);

    // Save back to file
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(allFeedback, null, 2));

    console.log(`✅ Added feedback for: ${feedback.material}`);
    res.json({ success: true, message: 'Feedback added successfully' });

  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
});

// Convert feedback to training examples
router.post('/promote-feedback', (req, res) => {
  try {
    const { feedbackId } = req.body;
    
    // Load feedback
    if (!fs.existsSync(FEEDBACK_FILE)) {
      return res.status(404).json({ error: 'No feedback found' });
    }
    
    const allFeedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    const feedback = allFeedback.find(f => f.id === feedbackId);
    
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Convert to training example format
    const trainingExample = {
      id: `promoted_${feedbackId}`,
      material: feedback.material,
      key_properties: {
        pH: null, // Extract from feedback if available
        flashPoint: null,
        physicalState: "liquid", // Default - should be extracted
        primaryHazard: feedback.correct_result.federal?.includes('D001') ? 'flammable' : 
                      feedback.correct_result.federal?.includes('D002') ? 'corrosive' : 'unknown'
      },
      correct_classification: {
        federal: feedback.correct_result.federal || [],
        texas_form_code: feedback.correct_result.texas_form_code,
        dot_un: feedback.correct_result.dot_un,
        reasoning: feedback.reason
      }
    };

    // Add to training examples
    let examples = [];
    if (fs.existsSync(EXAMPLES_FILE)) {
      examples = JSON.parse(fs.readFileSync(EXAMPLES_FILE, 'utf8'));
    }
    
    examples.push(trainingExample);
    fs.writeFileSync(EXAMPLES_FILE, JSON.stringify(examples, null, 2));

    // Mark feedback as applied
    feedback.applied = true;
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(allFeedback, null, 2));

    console.log(`✅ Promoted feedback to training example: ${feedback.material}`);
    res.json({ success: true, message: 'Feedback promoted to training example' });

  } catch (error) {
    console.error('Error promoting feedback:', error);
    res.status(500).json({ error: 'Failed to promote feedback' });
  }
});

// Get training statistics
router.get('/stats', (req, res) => {
  try {
    let exampleCount = 0;
    let feedbackCount = 0;
    let pendingFeedback = 0;

    if (fs.existsSync(EXAMPLES_FILE)) {
      const examples = JSON.parse(fs.readFileSync(EXAMPLES_FILE, 'utf8'));
      exampleCount = examples.length;
    }

    if (fs.existsSync(FEEDBACK_FILE)) {
      const feedback = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
      feedbackCount = feedback.length;
      pendingFeedback = feedback.filter(f => !f.applied).length;
    }

    res.json({
      trainingExamples: exampleCount,
      totalFeedback: feedbackCount,
      pendingFeedback: pendingFeedback,
      appliedFeedback: feedbackCount - pendingFeedback
    });

  } catch (error) {
    console.error('Error getting training stats:', error);
    res.status(500).json({ error: 'Failed to get training statistics' });
  }
});

// Add complete document for unrestricted training
router.post('/add-document', (req, res) => {
  try {
    const { fileName, fullText, chunks, qaPairs, timestamp } = req.body;
    
    if (!fileName || !fullText) {
      return res.status(400).json({ error: 'fileName and fullText are required' });
    }

    // Create document training entry
    const documentEntry = {
      id: `doc_${Date.now()}`,
      fileName,
      timestamp,
      fullText,
      chunks: chunks || [],
      qaPairs: qaPairs || [],
      characterCount: fullText.length,
      chunkCount: chunks?.length || 0,
      qaCount: qaPairs?.length || 0
    };

    // Save to documents training file
    const DOCUMENTS_FILE = path.join(TRAINING_DATA_PATH, 'training_documents.json');
    let documents = [];
    
    if (fs.existsSync(DOCUMENTS_FILE)) {
      documents = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf8'));
    }

    documents.push(documentEntry);
    fs.writeFileSync(DOCUMENTS_FILE, JSON.stringify(documents, null, 2));

    console.log(`📚 Added full document for training: ${fileName} (${fullText.length} chars, ${chunks?.length || 0} chunks)`);
    res.json({ 
      success: true, 
      message: 'Complete document added for training',
      stats: {
        characters: fullText.length,
        chunks: chunks?.length || 0,
        qaPairs: qaPairs?.length || 0
      }
    });

  } catch (error) {
    console.error('Error adding training document:', error);
    res.status(500).json({ error: 'Failed to add training document' });
  }
});

// Get training documents
router.get('/documents', (req, res) => {
  try {
    const DOCUMENTS_FILE = path.join(TRAINING_DATA_PATH, 'training_documents.json');
    
    if (fs.existsSync(DOCUMENTS_FILE)) {
      const documents = JSON.parse(fs.readFileSync(DOCUMENTS_FILE, 'utf8'));
      res.json(documents);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error loading training documents:', error);
    res.status(500).json({ error: 'Failed to load training documents' });
  }
});

export default router;