// API Key Configuration Routes
import express from 'express';
import fs from 'fs';

const router = express.Router();

// API key configuration endpoint
router.post('/configure', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    if (!provider || !apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Provider and API key are required' 
      });
    }

    // Map provider names to environment variable names
    const envVarMap = {
      'groq': 'GROQ_API_KEY',
      'gemini': 'GEMINI_API_KEY', 
      'openai': 'OPENAI_API_KEY'
    };

    const envVar = envVarMap[provider];
    if (!envVar) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid provider name' 
      });
    }

    // Set the environment variable
    process.env[envVar] = apiKey;

    // Update the .env file for persistence
    const envPath = '.env';
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
      // File doesn't exist, create new content
      envContent = '';
    }

    // Remove existing line for this variable if it exists
    const lines = envContent.split('\n').filter(line => 
      !line.startsWith(`${envVar}=`) && line.trim() !== ''
    );
    
    // Add the new key
    lines.push(`${envVar}=${apiKey}`);
    
    // Write back to file
    fs.writeFileSync(envPath, lines.join('\n') + '\n');

    console.log(`✅ ${provider} API key saved to .env file`);

    res.json({
      success: true,
      message: `${provider} API key configured successfully`,
      provider: provider
    });

  } catch (error) {
    console.error('Error configuring API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to configure API key',
      details: error.message
    });
  }
});

export default router;