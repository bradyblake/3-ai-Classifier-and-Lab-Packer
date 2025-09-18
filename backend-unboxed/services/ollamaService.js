// Ollama API Service
import axios from 'axios';

class OllamaService {
  constructor(baseURL = process.env.AI_URL || 'http://localhost:1234') {
    // Now supports LM Studio (1234) or Ollama (11434) via AI_URL env var
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minute timeout for AI processing
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Check if Ollama is running and accessible
  async isAvailable() {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      console.log('Ollama not available:', error.message);
      return false;
    }
  }

  // Get list of available models
  async getModels() {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models || [];
    } catch (error) {
      console.error('Error getting Ollama models:', error.message);
      return [];
    }
  }

  // Generate completion using Ollama
  async generateCompletion(model, prompt, options = {}) {
    try {
      const requestData = {
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.2,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          ...options
        }
      };

      const response = await this.client.post('/api/generate', requestData);
      return {
        success: true,
        response: response.data.response,
        model: response.data.model,
        created_at: response.data.created_at,
        done: response.data.done
      };
    } catch (error) {
      console.error('Ollama generation error:', error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }

  // Chat completion (for conversational models)
  async chatCompletion(model, messages, options = {}) {
    try {
      const requestData = {
        model: model,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.2,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          ...options
        }
      };

      const response = await this.client.post('/api/chat', requestData);
      return {
        success: true,
        message: response.data.message,
        model: response.data.model,
        created_at: response.data.created_at,
        done: response.data.done
      };
    } catch (error) {
      console.error('Ollama chat error:', error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || null
      };
    }
  }

  // Pull a model from Ollama registry
  async pullModel(modelName) {
    try {
      const response = await this.client.post('/api/pull', {
        name: modelName,
        stream: false
      });
      return {
        success: true,
        status: response.data.status
      };
    } catch (error) {
      console.error('Error pulling model:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if a specific model is available
  async hasModel(modelName) {
    try {
      const models = await this.getModels();
      return models.some(model => model.name === modelName || model.name.includes(modelName));
    } catch (error) {
      return false;
    }
  }

  // Get model info
  async getModelInfo(modelName) {
    try {
      const response = await this.client.post('/api/show', {
        name: modelName
      });
      return {
        success: true,
        info: response.data
      };
    } catch (error) {
      console.error('Error getting model info:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default OllamaService;