// Jarvis Routes - Separate file for JARVIS endpoints
import express from 'express';
import lmStudioService from './lmstudio-service.js';

const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'JARVIS router test endpoint working!' });
});

// TEMPORARY PDF Analysis endpoint - Added to working route file (GET for testing)
router.get('/pdf-analyze', async (req, res) => {
  console.log('🎉 PDF ANALYZE ENDPOINT IN JARVIS ROUTES HIT!');
  res.json({ 
    test: 'PDF analysis endpoint working from JARVIS routes!', 
    timestamp: new Date().toISOString() 
  });
});

// Jarvis AI Query Endpoint - Advanced conversational AI
router.post('/jarvis-query', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('🤖 Jarvis processing query:', prompt.substring(0, 100) + '...');
    
    // Get AI provider service from global
    const aiProviders = global.aiProviderService;
    if (!aiProviders) {
      throw new Error('AI Provider Service not initialized');
    }
    
    // Determine provider preference based on query type
    let provider = 'groq'; // Fast by default
    if (options.agent_context === 'complianceOps' || prompt.includes('regulation')) {
      provider = 'gemini'; // More thorough for compliance
    }
    
    // Enhanced prompt for Jarvis personality
    const jarvisPrompt = `You are JARVIS, an advanced AI assistant. You are professional, intelligent, and action-oriented.

IMPORTANT: When the user asks to open a tool or perform an action:
- Simply acknowledge and confirm the action
- Do NOT explain waste classification or SDS analysis unless specifically asked
- Be brief and direct

User Query: ${prompt}

Context: ${options.agent_context ? `Acting as ${options.agent_context} specialist.` : 'General assistant mode.'}

Instructions:
- If user says "open X" or "show me X", respond with: "Opening [X] for you now." or similar brief acknowledgment
- Only discuss technical details if explicitly asked
- Be concise - one or two sentences maximum unless user asks for details
- Focus on action, not explanation

Response:`;

    const response = await aiProviders.jarvisQuery(jarvisPrompt, provider, {
      ...options,
      temperature: 0.1,
      max_tokens: 800
    });

    console.log('✅ Jarvis response generated');
    
    res.json({
      response: response.trim(),
      provider: provider,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Jarvis query error:', error);
    res.status(500).json({
      error: 'Failed to process Jarvis query',
      message: error.message,
      fallback: 'I apologize, but I encountered an error processing your request. Please try again or use a more specific query.'
    });
  }
});

// Advanced Jarvis Capabilities Endpoint
router.post('/jarvis-analyze-context', async (req, res) => {
  try {
    const { context, query, multi_agent = false } = req.body;
    
    console.log('🧠 Jarvis analyzing context for:', query);
    
    const aiProviders = global.aiProviderService;
    if (!aiProviders) {
      throw new Error('AI Provider Service not initialized');
    }
    
    // Multi-agent analysis if requested
    if (multi_agent) {
      const agents = ['businessOps', 'complianceOps', 'customerSuccess'];
      const responses = [];
      
      for (const agent of agents) {
        try {
          const agentPrompt = `As the ${agent} specialist for unboXed platform, analyze this situation:
          
Context: ${JSON.stringify(context)}
Query: ${query}

Provide your specialized perspective and recommendations:`;
          
          const response = await aiProviders.analyze(agentPrompt, 'gemini', {
            temperature: 0.1,
            max_tokens: 500
          });
          
          responses.push({
            agent,
            response: response.trim()
          });
        } catch (error) {
          console.error(`Error with ${agent}:`, error.message);
        }
      }
      
      return res.json({
        multi_agent: true,
        responses,
        synthesized: responses.length > 0 ? 
          `Multiple perspectives on your query:\n\n${responses.map(r => `**${r.agent}**: ${r.response}`).join('\n\n')}` :
          'Unable to generate multi-agent analysis at this time.'
      });
    }
    
    // Single comprehensive analysis
    const contextPrompt = `You are JARVIS, analyzing the current platform context to provide intelligent insights.

Current Context Data: ${JSON.stringify(context)}
User Query: ${query}

Please analyze the context and provide:
1. Key insights from the current state
2. Recommended actions
3. Potential issues or opportunities
4. Next steps

Be practical and business-focused:`;

    const response = await aiProviders.analyze(contextPrompt, 'gemini', {
      temperature: 0.1,
      max_tokens: 1000
    });

    res.json({
      context_analysis: response.trim(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Jarvis context analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze context',
      message: error.message
    });
  }
});

// LM Studio powered intelligent query endpoint
router.post('/lm-query', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('🤖 LM Studio processing:', query);
    
    // Get intelligent analysis from LM Studio
    const analysis = await lmStudioService.analyzeQuery(query);
    
    console.log('📊 LM Studio analysis:', analysis);
    
    res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ LM Studio error:', error);
    res.status(500).json({
      error: 'Failed to process with LM Studio',
      message: error.message,
      fallback: 'Please ensure LM Studio is running with a model loaded'
    });
  }
});

// Health check for LM Studio
router.get('/lm-health', async (req, res) => {
  const health = await lmStudioService.checkHealth();
  res.json(health);
});

export default router;