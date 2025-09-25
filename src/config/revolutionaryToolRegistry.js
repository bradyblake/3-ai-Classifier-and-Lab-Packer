// Revolutionary Classifier Tool Registry
// Revolutionary Classifier Tool Registry - Core UI infrastructure for integrated system

// Optimized Lazy-Loaded Components for Performance
import {
  RevolutionaryClassifierLazy as RevolutionaryClassifier,
  SDSAnalyzerLazy as SDSAnalyzer,
  LabPackPlannerLazy as LabPackPlanner,
  KanbanBoardLazy as KanbanBoard,
  QuoteGeneratorLazy as QuoteGenerator,
  UnifiedCalendarLazy as UnifiedCalendar,
  AnalyticalReportAnalyzerLazy as AnalyticalReportAnalyzer,
  EnhancedAIAssistantLazy as EnhancedAIAssistant
} from '../components/LazyLoader.jsx';

// Tool Categories - Starting with core Research tools
export const toolCategories = {
  Research: {
    name: "Research",
    color: "#3B82F6", // Blue
    icon: "🔬",
    tools: [
      {
        id: "revolutionary-classifier",
        name: "Revolutionary Classifier",
        description: "Advanced constituent-first hazardous waste classification using MuPDF.js",
        icon: "🧪",
        features: ["MuPDF.js Processing", "Constituent Analysis", "Advanced Classification"],
        component: RevolutionaryClassifier
      },
      {
        id: "sds-analyzer", 
        name: "SDS Analyzer",
        description: "AI-powered safety data sheet analysis and classification",
        icon: "📋",
        features: ["PDF Upload", "AI Classification", "Regulatory Analysis"],
        component: SDSAnalyzer
      },
      {
        id: "analytical-report-analyzer",
        name: "Analytical Report Analyzer",
        description: "AI-powered analytical lab report processing with advanced hazardous waste classification",
        icon: "🔬",
        features: ["Lab Report Analysis", "COA Processing", "Compliance Checking", "Pattern Recognition"],
        component: AnalyticalReportAnalyzer
      }
    ]
  },
  
  Plan: {
    name: "Plan",
    color: "#10B981", // Green
    icon: "📋",
    tools: [
      {
        id: "lab-pack-planner",
        name: "Lab Pack Planner", 
        description: "Comprehensive lab pack planning with material segregation",
        icon: "📦",
        features: ["Drag & Drop", "Material Segregation", "Compatibility Engine"],
        component: LabPackPlanner
      }
    ]
  },
  
  Project: {
    name: "Project", 
    color: "#F59E0B", // Amber
    icon: "🏗️",
    tools: [
      {
        id: "kanban-board",
        name: "Project Board",
        description: "Kanban-style project management with drag-and-drop",
        icon: "📊",
        features: ["Drag & Drop", "Project Tracking", "Task Management"],
        component: KanbanBoard
      },
      {
        id: "smart-calendar",
        name: "Smart Calendar", 
        description: "Advanced scheduling with FullCalendar integration",
        icon: "📅",
        features: ["Event Management", "Drag & Drop", "Calendar Views"],
        component: UnifiedCalendar
      }
    ]
  },
  
  Document: {
    name: "Document",
    color: "#8B5CF6", // Purple
    icon: "📄", 
    tools: [
      {
        id: "quote-generator",
        name: "Quote Generator",
        description: "Automated quote generation with PDF export",
        icon: "💰",
        features: ["PDF Export", "Cost Calculation", "Client Management"],
        component: QuoteGenerator
      }
    ]
  },
  
  Setup: {
    name: "Setup",
    color: "#6B7280", // Gray
    icon: "⚙️",
    tools: [
      {
        id: "enhanced-ai-assistant",
        name: "AI Assistant",
        description: "Intelligent assistant for project management, scheduling, and workflow automation",
        icon: "🤖",
        features: ["Natural Language Processing", "Project Analytics", "Smart Scheduling", "Workflow Automation", "Document Analysis", "Command Recognition"],
        component: EnhancedAIAssistant
      }
    ]
  }
};

// Flattened tool map for easy access
export const unifiedToolMap = {};
Object.values(toolCategories).forEach(category => {
  category.tools.forEach(tool => {
    unifiedToolMap[tool.id] = tool;
  });
});

// Tool navigation utilities
export const getToolById = (id) => unifiedToolMap[id];

export const getToolsByCategory = (categoryName) => {
  return toolCategories[categoryName]?.tools || [];
};

export const getAllTools = () => {
  return Object.values(unifiedToolMap);
};

export const getCategoryByToolId = (toolId) => {
  for (const [categoryName, category] of Object.entries(toolCategories)) {
    if (category.tools.find(tool => tool.id === toolId)) {
      return categoryName;
    }
  }
  return null;
};

// Global tool opener function
export const openTool = (toolId) => {
  const tool = getToolById(toolId);
  if (tool && tool.component && window.setActiveTool) {
    window.setActiveTool(toolId);
    return true;
  } else {
    console.warn("❌ Tool not found or not ready:", toolId);
    return false;
  }
};

// Export for global access
if (typeof window !== 'undefined') {
  window.openTool = openTool;
  window.getToolById = getToolById;
  window.toolCategories = toolCategories;
}

export default toolCategories;