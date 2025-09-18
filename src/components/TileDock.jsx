import React from "react";
import PropTypes from "prop-types";
import { 
  FileSearch, 
  Package, 
  Users, 
  Kanban, 
  Route, 
  Calculator,
  Zap,
  ArrowRight,
  Workflow,
  AlertCircle,
  Brain,
  Database,
  Calendar
} from "lucide-react";
import toolMap from "../toolRegistry";
import { useWorkflow } from "../context/WorkflowContext";
import "../styles/TileDock.css";

export default function TileDock({ openTool }) {
  const { workflows } = useWorkflow();

  // Get active workflow steps for each tool
  const getToolWorkflowInfo = (toolName) => {
    let activeSteps = 0;
    let hasActiveWorkflow = false;
    
    workflows.forEach(workflow => {
      workflow.steps.forEach(step => {
        if (step.tool === toolName && (step.status === 'active' || step.status === 'pending')) {
          activeSteps++;
          if (step.status === 'active') {
            hasActiveWorkflow = true;
          }
        }
      });
    });
    
    return { activeSteps, hasActiveWorkflow };
  };
  const toolCategories = {
    "Analysis & Classification": [
      {
        name: "SDSAnalyzer",
        title: "SDS Analyzer",
        description: "Chemical safety data sheet analysis and classification",
        icon: <FileSearch />,
        color: "var(--env-primary-500)",
        bgColor: "var(--env-primary-50)"
      },
      {
        name: "LabReportAnalyzer",
        title: "Lab Report Analyzer",
        description: "Analyze laboratory reports for RCRA compliance and regulatory limits",
        icon: <FileSearch />,
        color: "var(--env-ocean-500)",
        bgColor: "var(--env-ocean-50)"
      }
    ],
    "Project Management": [
      {
        name: "LabPackPlanner",
        title: "Lab Pack Planner",
        description: "Laboratory waste packaging and planning",
        icon: <Package />,
        color: "var(--env-ocean-500)",
        bgColor: "var(--env-ocean-50)"
      },
      {
        name: "ProjectKanban",
        title: "Project Tracker",
        description: "Visual project tracking and workflow management",
        icon: <Kanban />,
        color: "var(--env-earth-500)",
        bgColor: "var(--env-earth-50)"
      },
      {
        name: "SmartCalendar",
        title: "Smart Calendar",
        description: "Intelligent scheduling with natural language date parsing",
        icon: <Calendar />,
        color: "var(--env-primary-500)",
        bgColor: "var(--env-primary-50)"
      }
    ],
    "Business Development": [
      {
        name: "LeadGenerator",
        title: "Lead Generator",
        description: "Customer lead generation and management",
        icon: <Users />,
        color: "var(--env-sage-500)",
        bgColor: "var(--env-sage-50)"
      },
      {
        name: "QuoteGenerator",
        title: "Quote Generator",
        description: "Automated quote generation and pricing",
        icon: <Calculator />,
        color: "var(--status-info)",
        bgColor: "rgba(59, 130, 246, 0.1)"
      }
    ],
    "Operations": [
      {
        name: "WasteRouting",
        title: "Waste Routing",
        description: "Optimal waste transportation and routing",
        icon: <Route />,
        color: "var(--status-warning)",
        bgColor: "rgba(245, 158, 11, 0.1)"
      }
    ],
    "Testing & Quality": [
      {
        name: "LabPackCompatibilityTest",
        title: "Compatibility Testing",
        description: "Test and validate chemical compatibility logic",
        icon: <Zap />,
        color: "var(--status-info)",
        bgColor: "rgba(59, 130, 246, 0.1)"
      },
      {
        name: "LearningEngineMonitor",
        title: "Learning Engine Monitor",
        description: "Monitor adaptive learning system performance and statistics",
        icon: <Brain />,
        color: "var(--status-success)",
        bgColor: "rgba(16, 185, 129, 0.1)"
      },
      {
        name: "DatabaseViewer",
        title: "Classification Database",
        description: "View and manage learned material classifications by type",
        icon: <Database />,
        color: "var(--env-primary-500)",
        bgColor: "var(--env-primary-50)"
      }
    ]
  };

  const getToolConfig = (toolName) => {
    for (const category of Object.values(toolCategories)) {
      const tool = category.find(t => t.name === toolName);
      if (tool) return tool;
    }
    return {
      name: toolName,
      title: toolName,
      description: "Tool description",
      icon: <Zap />,
      color: "var(--text-secondary)",
      bgColor: "var(--surface-secondary)"
    };
  };

  return (
    <div className="tile-dock-container">
      <div className="tile-dock-header">
        <h1 className="tile-dock-title">Environmental Services Platform</h1>
        <p className="tile-dock-subtitle">
          Comprehensive waste management and regulatory compliance tools
        </p>
      </div>

      {Object.entries(toolCategories).map(([categoryName, tools]) => (
        <div key={categoryName} className="tool-category">
          <h3 className="category-title">{categoryName}</h3>
          <div className="tool-grid">
            {tools.map((tool) => {
              const workflowInfo = getToolWorkflowInfo(tool.name);
              
              return (
                <div
                  key={tool.name}
                  className={`tool-tile ${workflowInfo.hasActiveWorkflow ? 'has-active-workflow' : ''}`}
                  onClick={() => openTool(tool.name)}
                  style={{
                    '--tool-color': tool.color,
                    '--tool-bg-color': tool.bgColor
                  }}
                >
                  <div className="tool-icon-container">
                    {tool.icon}
                    {workflowInfo.hasActiveWorkflow && (
                      <div className="workflow-indicator active">
                        <AlertCircle />
                      </div>
                    )}
                  </div>
                  <div className="tool-content">
                    <div className="tool-header">
                      <h4 className="tool-title">{tool.title}</h4>
                      {workflowInfo.activeSteps > 0 && (
                        <div className="workflow-badge">
                          <Workflow />
                          <span>{workflowInfo.activeSteps}</span>
                        </div>
                      )}
                    </div>
                    <p className="tool-description">{tool.description}</p>
                    {workflowInfo.hasActiveWorkflow && (
                      <div className="workflow-status">
                        <span>• Action Required</span>
                      </div>
                    )}
                  </div>
                  <div className="tool-arrow">
                    <ArrowRight />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

TileDock.propTypes = {
  openTool: PropTypes.func.isRequired,
};