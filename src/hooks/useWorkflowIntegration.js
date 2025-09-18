import { useWorkflow } from '../context/WorkflowContext';
import { useEffect, useState } from 'react';

export function useWorkflowIntegration(toolName) {
  const { 
    workflows, 
    activeWorkflow, 
    getSharedData, 
    shareData,
    completeStep 
  } = useWorkflow();

  const [activeSteps, setActiveSteps] = useState([]);
  const [availableData, setAvailableData] = useState({});

  // Find active steps for this tool
  useEffect(() => {
    const steps = [];
    workflows.forEach(workflow => {
      workflow.steps.forEach(step => {
        if (step.tool === toolName && (step.status === 'active' || step.status === 'pending')) {
          steps.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            ...step
          });
        }
      });
    });
    setActiveSteps(steps);
  }, [workflows, toolName]);

  // Gather available shared data for this tool
  useEffect(() => {
    const data = {};
    
    // Check for data shared TO this tool from other tools
    const allToolNames = ['SDSAnalyzer', 'LabPackPlanner', 'LeadGenerator', 'ProjectKanban', 'QuoteGenerator', 'WasteRouting'];
    
    allToolNames.forEach(fromTool => {
      if (fromTool !== toolName) {
        const sharedData = getSharedData(fromTool, toolName);
        if (sharedData) {
          data[fromTool] = sharedData;
        }
      }
    });
    
    setAvailableData(data);
  }, [toolName, getSharedData, workflows]);

  const workflowIntegration = {
    // Current state
    activeSteps,
    availableData,
    hasActiveWorkflows: activeSteps.length > 0,
    hasAvailableData: Object.keys(availableData).length > 0,

    // Actions
    completeCurrentStep: (stepId, data) => {
      const step = activeSteps.find(s => s.id === stepId);
      if (step) {
        completeStep(step.workflowId, stepId, data);
      }
    },

    shareDataToTool: (targetTool, data, key = 'shared') => {
      shareData(toolName, targetTool, data, key);
    },

    getDataFromTool: (sourceTool, key = 'shared') => {
      return getSharedData(sourceTool, toolName, key);
    },

    // UI helpers
    getWorkflowBadges: () => {
      return activeSteps.map(step => ({
        id: step.id,
        workflowName: step.workflowName,
        status: step.status,
        color: step.status === 'active' ? 'primary' : 'secondary'
      }));
    },

    getDataSummary: () => {
      return Object.entries(availableData).map(([sourceTool, data]) => ({
        sourceTool,
        dataKeys: Object.keys(data),
        preview: JSON.stringify(data).substring(0, 100) + '...'
      }));
    }
  };

  return workflowIntegration;
}