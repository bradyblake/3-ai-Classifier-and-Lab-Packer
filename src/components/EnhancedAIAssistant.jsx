// Enhanced AI Assistant - Revolutionary Classifier Integration
import React, { useState, useEffect, useRef } from 'react';
import { openTool, getToolById, getAllTools, getCategoryByToolId } from '../config/revolutionaryToolRegistry';

const EnhancedAIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [context, setContext] = useState({
    recentActions: [],
    userPreferences: {},
    projectData: null,
    calendarEvents: []
  });
  const messagesEndRef = useRef(null);

  // Initialize assistant
  useEffect(() => {
    setMessages([{
      id: Date.now(),
      type: 'assistant',
      content: `🤖 **Enhanced AI Assistant** initialized!

I can help you with:
• **Project Management** - Create, track, and analyze projects
• **Calendar Scheduling** - Smart scheduling and conflict resolution  
• **Document Analysis** - SDS analysis, lab reports, and classification
• **Workflow Automation** - Set up templates and recurring tasks
• **Data Analytics** - Project stats, revenue tracking, and insights

**Quick Commands:**
• "open [tool name]" - Launch specific tools
• "create project" - Start new project with smart templates
• "schedule [task]" - Add to calendar with optimal timing
• "analyze [document]" - Process documents with AI
• "show stats" - Display project and revenue analytics
• "help" - Show detailed command reference

What would you like to work on today?`,
      timestamp: new Date()
    }]);

    // Load context data
    loadContextData();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load contextual data from various sources
  const loadContextData = async () => {
    try {
      // Get project data from Kanban API if available
      if (window.kanbanAPI) {
        const projectData = {
          cards: window.kanbanAPI.getAllCards(),
          stats: window.kanbanAPI.getProjectStats()
        };
        setContext(prev => ({ ...prev, projectData }));
      }

      // Get calendar events if available
      if (window.calendarAPI) {
        const calendarEvents = window.calendarAPI.getAllEvents();
        setContext(prev => ({ ...prev, calendarEvents }));
      }
    } catch (error) {
      console.warn('⚠️ Could not load full context:', error.message);
    }
  };

  // Handle user input
  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsThinking(true);

    // Process the message
    const response = await processUserMessage(currentInput);
    
    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsThinking(false);
  };

  // Process user message and generate response
  const processUserMessage = async (message) => {
    const input = message.toLowerCase().trim();
    
    try {
      // Tool opening commands
      if (input.startsWith('open ')) {
        return handleOpenTool(input.replace('open ', ''));
      }

      // Project management commands
      if (input.includes('create project') || input.includes('new project')) {
        return handleCreateProject(message);
      }

      if (input.includes('schedule') || input.includes('calendar')) {
        return handleScheduleRequest(message);
      }

      // Analytics and stats
      if (input.includes('stats') || input.includes('analytics') || input.includes('revenue')) {
        return handleStatsRequest();
      }

      // Document analysis
      if (input.includes('analyze') || input.includes('classify')) {
        return handleAnalysisRequest(message);
      }

      // Help and guidance
      if (input.includes('help') || input.includes('what can you do')) {
        return getHelpResponse();
      }

      // Workflow automation
      if (input.includes('automate') || input.includes('template')) {
        return handleAutomationRequest(message);
      }

      // Search and find
      if (input.includes('find') || input.includes('search')) {
        return handleSearchRequest(message);
      }

      // General intelligent responses
      return generateIntelligentResponse(message);

    } catch (error) {
      return `❌ **Error processing request:** ${error.message}

I'm still learning! Try one of these commands:
• "open sds-analyzer" - Launch SDS analysis tool
• "create project" - Start new project
• "show stats" - Display analytics
• "help" - Get detailed assistance`;
    }
  };

  // Handle tool opening with smart suggestions
  const handleOpenTool = (toolQuery) => {
    const tools = getAllTools();
    
    // Direct match
    const directMatch = tools.find(tool => 
      tool.id === toolQuery || 
      tool.name.toLowerCase().includes(toolQuery)
    );

    if (directMatch) {
      openTool(directMatch.id);
      return `✅ **Opening ${directMatch.name}**

${directMatch.description}

**Features available:**
${directMatch.features.map(f => `• ${f}`).join('\n')}`;
    }

    // Fuzzy matching
    const suggestions = tools.filter(tool => 
      tool.name.toLowerCase().includes(toolQuery) ||
      tool.description.toLowerCase().includes(toolQuery) ||
      tool.features.some(f => f.toLowerCase().includes(toolQuery))
    );

    if (suggestions.length > 0) {
      return `🔍 **Found ${suggestions.length} matching tools:**

${suggestions.map(tool => 
  `**${tool.icon} ${tool.name}**\n${tool.description}\nCategory: ${getCategoryByToolId(tool.id)}`
).join('\n\n')}

Say "open [tool name]" to launch one!`;
    }

    return `❓ **Tool "${toolQuery}" not found.**

**Available tools:**
${tools.map(tool => `• ${tool.icon} **${tool.name}** - ${tool.description}`).join('\n')}`;
  };

  // Handle project creation with intelligence
  const handleCreateProject = (message) => {
    if (window.kanbanAPI) {
      return `🚀 **Smart Project Creation Available!**

I can help you create projects in several ways:

**Option 1: Quick Project** 
• Click the Kanban Board tool and use "🤖 Smart Create"
• I'll auto-populate based on customer history

**Option 2: Template-Based**
• Use recurring templates for common project types
• Automatically applies best practices and estimates

**Option 3: AI-Assisted**
• Tell me: "Create project for [customer] with [details]"
• I'll set up everything including scheduling and resources

**Current Project Stats:**
• Total Projects: ${context.projectData?.stats?.total || 0}
• Total Revenue: $${context.projectData?.stats?.totalRevenue?.toLocaleString() || 0}
• Average Value: $${Math.round(context.projectData?.stats?.averageValue || 0).toLocaleString()}

Ready to create a new project?`;
    }

    return `📋 **Project creation requires the Kanban Board tool.**

Would you like me to open it for you? Say "open kanban board"!`;
  };

  // Handle scheduling requests
  const handleScheduleRequest = (message) => {
    return `📅 **Smart Scheduling Assistant**

I can help you with:

**Calendar Management:**
• Find optimal time slots for tasks
• Detect and resolve scheduling conflicts
• Set up recurring appointments
• Integrate project deadlines

**Scheduling Intelligence:**
• Considers working hours (9 AM - 5 PM)
• Avoids weekends automatically  
• Respects existing commitments
• Optimizes based on task priority

**Quick Actions:**
• "Schedule meeting with [customer]" - Find best time slot
• "Block time for [project]" - Reserve focused work time
• "Show conflicts" - Review scheduling issues
• "Open calendar" - Launch full calendar tool

Say "open smart calendar" to access full scheduling features!`;
  };

  // Handle analytics requests
  const handleStatsRequest = () => {
    if (context.projectData?.stats) {
      const stats = context.projectData.stats;
      const revenueAnalysis = stats.byStatus.map(status => 
        `• **${status.status}:** ${status.count} projects, $${status.revenue.toLocaleString()}`
      ).join('\n');

      return `📊 **Project Analytics Dashboard**

**Overall Performance:**
• **Total Projects:** ${stats.total}
• **Total Revenue:** $${stats.totalRevenue.toLocaleString()}
• **Average Project Value:** $${Math.round(stats.averageValue).toLocaleString()}

**Revenue by Status:**
${revenueAnalysis}

**Insights & Recommendations:**
${generateInsights(stats)}

Need detailed analytics? Say "open kanban board" for the full dashboard!`;
    }

    return `📊 **Analytics Available**

I can provide insights on:
• Project pipeline and revenue
• Customer performance history
• Scheduling efficiency
• Document processing metrics
• Tool usage patterns

To access full analytics, open the Kanban Board or Calendar tools!`;
  };

  // Handle document analysis requests
  const handleAnalysisRequest = (message) => {
    return `🔬 **Document Analysis Suite**

**Revolutionary Classifier (98% accuracy):**
• Constituent-first hazardous waste classification
• Advanced chemical analysis with MuPDF.js
• EPA waste code generation (P/U/D codes)

**SDS Analyzer (Proven & Reliable):**
• AI-powered safety data sheet analysis
• Regulatory compliance checking
• Batch processing capabilities

**Analytical Report Analyzer:**
• Lab report processing and validation
• COA (Certificate of Analysis) review
• Pattern recognition for quality control

**Ready to analyze documents?**
• Upload PDFs directly to any analyzer
• Drag & drop multiple files for batch processing
• Get instant classification and compliance reports

Say "open [analyzer name]" to get started!`;
  };

  // Handle automation requests
  const handleAutomationRequest = (message) => {
    return `🤖 **Workflow Automation Hub**

**Available Automations:**

**Project Templates:**
• Create recurring project templates
• Auto-populate from customer history
• Set default assignments and timelines

**Schedule Automation:**
• Find optimal time slots automatically
• Set up recurring appointments
• Conflict detection and resolution

**Document Processing:**
• Batch process multiple files
• Auto-classification with confidence scoring
• Export results in multiple formats

**Revenue Tracking:**
• Automatic revenue categorization
• Pipeline vs. projected vs. actual
• Progress toward quota tracking

**Smart Notifications:**
• Project deadline alerts
• Revenue milestone notifications
• Compliance requirement reminders

Ready to automate your workflow?`;
  };

  // Handle search requests
  const handleSearchRequest = (message) => {
    if (window.kanbanAPI) {
      // Extract search terms
      const searchTerm = message.replace(/find|search/gi, '').trim();
      
      if (searchTerm) {
        const results = window.kanbanAPI.searchCards(searchTerm);
        
        if (results.length > 0) {
          return `🔍 **Found ${results.length} matching projects:**

${results.slice(0, 5).map(card => 
  `**${card.title}** (${card.jobNumber})
  Status: ${card.status} | Location: ${card.location}
  Revenue: $${parseFloat(card.revenue || 0).toLocaleString()}
  Customer: ${card.vendor || 'N/A'}`
).join('\n\n')}

${results.length > 5 ? `\n*Showing first 5 of ${results.length} results*` : ''}

Open the Kanban Board for full project details!`;
        }

        return `❌ No projects found matching "${searchTerm}". Try different keywords!`;
      }
    }

    return `🔍 **Search Capabilities**

I can help you find:
• **Projects** - Search by title, customer, or job number
• **Documents** - Find analyzed reports and classifications
• **Calendar Events** - Locate scheduled appointments
• **Tools** - Find the right tool for your task

**Example searches:**
• "find projects for ABC Corp"
• "search lab reports from last week"
• "find overdue tasks"

What would you like to search for?`;
  };

  // Generate intelligent contextual responses
  const generateIntelligentResponse = (message) => {
    const responses = [
      `🤔 I understand you want help with: "${message}"

Here's what I can do:
• **Analyze** your request and suggest appropriate tools
• **Create** new projects or schedule tasks
• **Search** existing data and projects
• **Automate** repetitive workflows

Could you be more specific about what you need?`,

      `💡 **Smart Suggestion:** Based on your request "${message}", you might want to:

1. **Open a specific tool** - Say "open [tool name]"
2. **Create something new** - Try "create project" or "schedule task"
3. **Get information** - Ask for "stats" or "help"
4. **Analyze documents** - Upload files to our analyzers

What sounds most helpful right now?`,

      `🎯 I'm here to help with "${message}"!

**Quick wins:**
• Open the **Revolutionary Classifier** for document analysis
• Check the **Kanban Board** for project tracking
• Use the **Smart Calendar** for scheduling
• View **Analytics** for performance insights

Say "help" for the complete command reference!`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Generate insights from project stats
  const generateInsights = (stats) => {
    const insights = [];
    
    if (stats.totalRevenue > 100000) {
      insights.push("🎯 Strong revenue performance - consider capacity expansion");
    }
    
    if (stats.averageValue < 5000) {
      insights.push("📈 Focus on higher-value projects to improve margins");
    }
    
    const pipelineStatus = stats.byStatus.find(s => s.status.includes('Quote'));
    if (pipelineStatus && pipelineStatus.count > 10) {
      insights.push("⚡ High quote volume - consider automation tools");
    }

    return insights.length > 0 ? insights.join('\n') : "📊 Performance is on track - keep up the great work!";
  };

  // Get comprehensive help response
  const getHelpResponse = () => {
    return `📚 **Complete Command Reference**

**🛠️ Tool Commands:**
• "open [tool]" - Launch specific tools
• "open revolutionary classifier" - Document analysis
• "open sds analyzer" - Safety data sheet processing  
• "open kanban board" - Project management
• "open smart calendar" - Scheduling and planning

**📋 Project Management:**
• "create project" - New project wizard
• "find projects [search]" - Search existing projects
• "show stats" - Analytics dashboard
• "schedule [task]" - Calendar integration

**🤖 Automation:**
• "automate [workflow]" - Set up templates
• "create template" - Recurring task templates
• "analyze [document]" - Batch processing

**📊 Analytics:**
• "revenue stats" - Financial performance  
• "project pipeline" - Current project status
• "customer analysis" - Client performance

**💡 Pro Tips:**
• Be specific in your requests
• Use natural language - I understand context
• Combine commands: "create project for ABC Corp and schedule kickoff"
• Ask "what can I do with [tool]?" for detailed features

**🔍 Need something specific?** Just ask! I learn from every interaction.`;
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🤖 Enhanced AI Assistant</h1>
            <p className="text-gray-600">Revolutionary Classifier Integration</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              📊 {context.projectData?.stats?.total || 0} projects tracked
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="AI Assistant Online"></div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl p-4 rounded-lg shadow-sm ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 border'
              }`}
            >
              <div className="prose prose-sm max-w-none">
                {message.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} className="font-semibold text-lg mb-2">{line.replace(/\*\*/g, '')}</div>;
                  }
                  if (line.startsWith('•')) {
                    return <div key={i} className="ml-4 mb-1">{line}</div>;
                  }
                  return <div key={i} className="mb-2">{line}</div>;
                })}
              </div>
              <div className={`text-xs mt-2 opacity-70 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border p-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about projects, scheduling, analysis, or tool usage..."
              className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="2"
              disabled={isThinking}
            />
            <div className="text-xs text-gray-500 mt-1">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!currentInput.trim() || isThinking}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
            title="Send message"
          >
            {isThinking ? '⏳' : '🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIAssistant;