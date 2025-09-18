// LM Studio Integration Service
// Connects JARVIS to your local LM Studio server

class LMStudioService {
  constructor() {
    this.baseURL = 'http://localhost:1234/v1';
    this.model = 'local-model'; // LM Studio uses this generic name
  }

  // Analyze user query with rule-based system + LM Studio fallback
  async analyzeQuery(userQuery) {
    try {
      // First try rule-based analysis for common patterns
      const ruleBasedResult = this.analyzeWithRules(userQuery);
      if (ruleBasedResult.confidence > 0.7) {
        console.log('✅ Rule-based analysis successful:', ruleBasedResult);
        return ruleBasedResult;
      }

      // Fallback to LM Studio for complex queries
      console.log('🤖 Using LM Studio for complex query...');
      const prompt = `You are JARVIS, a hazardous waste management AI assistant. You understand:
- Chemical classifications (D001, D002, D003, etc.)
- Texas form codes (101, 105, 106, 202, 203, etc.)
- DOT shipping codes (UN numbers)
- Tool operations (SDS analyzer, lab pack planner)

Analyze: "${userQuery}"

Return ONLY valid JSON:
{"intent":"OPEN|CREATE|ANALYZE|QUERY","target":"tool|material|project","action":"brief description"}

Examples:
- "Open SDS analyzer" → {"intent":"OPEN","target":"tool","action":"open sds-analyzer"}
- "Acetone flash point 20C" → {"intent":"ANALYZE","target":"material","action":"classify flammable liquid"}
- "Show projects" → {"intent":"QUERY","target":"project","action":"list active projects"}

JSON:`;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tinyllama-tinyllama-1.1b-chat-v1.0-smashed',
          messages: [
            {
              role: 'system',
              content: 'Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 80,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`LM Studio error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      try {
        // Enhanced JSON extraction for TinyLlama
        let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Multiple strategies to extract JSON from TinyLlama's verbose responses
        let jsonMatch = cleanContent.match(/\{[^}]*\}/);
        if (!jsonMatch) {
          // Try to find JSON with nested objects
          jsonMatch = cleanContent.match(/\{[\s\S]*?\}/);
        }
        if (!jsonMatch) {
          // Try to extract just the first line that looks like JSON
          const lines = cleanContent.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('{') && line.includes(':')) {
              jsonMatch = [line.trim()];
              break;
            }
          }
        }
        
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
          // Clean up common TinyLlama artifacts
          cleanContent = cleanContent.replace(/\n.*$/g, ''); // Remove everything after first newline
          cleanContent = cleanContent.replace(/,\s*$/, ''); // Remove trailing comma
        }
        
        const parsed = JSON.parse(cleanContent);
        console.log('✅ LM Studio JSON parsed successfully:', parsed);
        return parsed;
      } catch (parseError) {
        console.log('⚠️ LM Studio JSON parse failed, using rules fallback');
        console.log('Raw response:', content);
        return this.fallbackParse(content, userQuery);
      }
      
    } catch (error) {
      console.error('LM Studio query error:', error);
      return this.getDefaultResponse(userQuery);
    }
  }

  // Rule-based analysis for common commands
  analyzeWithRules(query) {
    const lowerQuery = query.toLowerCase();
    
    // Tool opening patterns
    if (lowerQuery.includes('open') && lowerQuery.includes('sds')) {
      return {
        intent: 'OPEN',
        confidence: 0.95,
        target: 'tool',
        entities: { names: [], locations: [], numbers: [] },
        suggestedAction: { function: 'openTool', parameters: { toolId: 'sds-analyzer' } },
        naturalResponse: 'Opening SDS analyzer tool'
      };
    }
    
    if (lowerQuery.includes('open') && lowerQuery.includes('lab pack')) {
      return {
        intent: 'OPEN',
        confidence: 0.95,
        target: 'tool',
        entities: { names: [], locations: [], numbers: [] },
        suggestedAction: { function: 'openTool', parameters: { toolId: 'lab-pack-planner' } },
        naturalResponse: 'Opening Lab Pack Planner'
      };
    }

    // Project queries
    if (lowerQuery.includes('show') && lowerQuery.includes('project')) {
      return {
        intent: 'QUERY',
        confidence: 0.90,
        target: 'project',
        entities: { names: [], locations: [], numbers: [] },
        suggestedAction: { function: 'showProjects', parameters: {} },
        naturalResponse: 'Showing active projects'
      };
    }

    // Chemical analysis patterns
    if (lowerQuery.includes('classify') || lowerQuery.includes('analyze')) {
      const chemicals = this.extractChemicals(query);
      if (chemicals.length > 0) {
        return {
          intent: 'ANALYZE',
          confidence: 0.90,
          target: 'material',
          entities: { names: chemicals, locations: [], numbers: [] },
          suggestedAction: { function: 'classifyMaterial', parameters: { chemicals } },
          naturalResponse: `Analyzing ${chemicals.join(', ')} for hazardous waste classification`
        };
      }
    }

    // Create patterns
    if (lowerQuery.includes('add') || lowerQuery.includes('create')) {
      const locations = this.extractLocations(query);
      if (locations.length > 0) {
        return {
          intent: 'CREATE',
          confidence: 0.85,
          target: 'lane',
          entities: { names: [], locations, numbers: [] },
          suggestedAction: { function: 'createLanes', parameters: { locations } },
          naturalResponse: `Creating lanes for ${locations.join(', ')}`
        };
      }
    }

    // Low confidence fallback
    return {
      intent: 'UNKNOWN',
      confidence: 0.3,
      target: 'unknown',
      entities: { names: [], locations: [], numbers: [] },
      suggestedAction: { function: 'handleGeneralQuery', parameters: { query } },
      naturalResponse: 'I need to analyze this further'
    };
  }

  // Extract common location patterns
  extractLocations(query) {
    const cities = [];
    const cityPatterns = [
      /fort worth|fw/gi,
      /dallas|dal/gi, 
      /houston|hou/gi,
      /austin/gi,
      /san antonio/gi
    ];
    
    cityPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        cities.push(matches[0]);
      }
    });
    
    return cities;
  }

  // Extract common chemical names
  extractChemicals(query) {
    const chemicals = [];
    const chemicalPatterns = [
      /acetone/gi,
      /methanol/gi,
      /ethanol/gi,
      /benzene/gi,
      /toluene/gi,
      /xylene/gi,
      /diesel/gi,
      /gasoline/gi,
      /sodium hydroxide/gi,
      /hydrochloric acid|muriatic acid/gi,
      /sulfuric acid/gi,
      /sodium hypochlorite/gi,
      /lead.acid battery/gi,
      /motor oil/gi,
      /paint/gi
    ];
    
    chemicalPatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        chemicals.push(matches[0]);
      }
    });
    
    return chemicals;
  }

  // Execute the suggested action
  async executeAction(analysis) {
    const { intent, target, entities, suggestedAction } = analysis;
    
    // Build execution plan
    const executionPlan = {
      intent,
      target,
      entities,
      action: suggestedAction.function,
      parameters: suggestedAction.parameters,
      timestamp: new Date().toISOString()
    };
    
    // Log for debugging
    console.log('🎯 LM Studio Execution Plan:', executionPlan);
    
    return executionPlan;
  }

  // Fallback parsing if JSON fails
  fallbackParse(content, query) {
    const result = {
      intent: 'UNKNOWN',
      confidence: 0.5,
      target: 'unknown',
      entities: {
        names: [],
        locations: [],
        abbreviations: [],
        numbers: [],
        dates: [],
        money: []
      },
      suggestedAction: {
        function: 'handleGeneralQuery',
        parameters: { query }
      },
      naturalResponse: 'I understood your request but had trouble parsing it. Let me try to help.'
    };

    // Try to extract basic intent
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('create') || lowerQuery.includes('add')) {
      result.intent = 'CREATE';
    } else if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
      result.intent = 'DELETE';
    } else if (lowerQuery.includes('open') || lowerQuery.includes('show')) {
      result.intent = 'OPEN';
    } else if (lowerQuery.includes('update') || lowerQuery.includes('edit')) {
      result.intent = 'UPDATE';
    }

    // Extract any obvious entities
    const cityPattern = /(Fort Worth|Dallas|Houston|Austin|San Antonio|Odessa|Lubbock|El Paso)/gi;
    const cities = query.match(cityPattern);
    if (cities) {
      result.entities.locations = cities;
    }

    return result;
  }

  // Default response when LM Studio is unavailable
  getDefaultResponse(query) {
    return {
      intent: 'UNKNOWN',
      confidence: 0,
      target: 'unknown',
      entities: {
        names: [],
        locations: [],
        abbreviations: [],
        numbers: [],
        dates: [],
        money: []
      },
      suggestedAction: {
        function: 'showError',
        parameters: { 
          message: 'LM Studio is not responding. Please check that the server is running and a model is loaded.' 
        }
      },
      naturalResponse: 'I cannot connect to the local AI model. Please check LM Studio is running.'
    };
  }

  // Health check
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseURL}/models`);
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          models: data.data || [],
          server: 'LM Studio'
        };
      }
      return { status: 'unhealthy', error: 'Cannot reach LM Studio' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

export default new LMStudioService();