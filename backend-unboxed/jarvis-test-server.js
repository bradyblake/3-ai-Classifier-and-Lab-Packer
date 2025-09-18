// Test server using external JARVIS router
import express from 'express';
import cors from 'cors';
import jarvisRoutes from './jarvis-routes.js';

// Set up global mock for AI providers (required by jarvis-routes.js)
global.aiProviderService = {
  analyze: async (prompt, provider, options) => {
    console.log(`🤖 Mock AI analysis with ${provider}`);
    return `Mock response to: ${prompt.substring(0, 50)}... [This is working with external router!]`;
  }
};

const app = express();
const port = 3004; // Changed from 3003 to avoid conflict with main server.js

// Middleware
app.use(express.json());
app.use(cors());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

// Use external JARVIS router
app.use('/api', jarvisRoutes);

app.listen(port, () => {
  console.log(`✅ JARVIS Test Server with external router listening on port ${port}`);
});