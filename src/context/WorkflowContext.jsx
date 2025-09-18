import React, { createContext, useContext, useReducer, useEffect } from 'react';

const WorkflowContext = createContext();

const WORKFLOW_ACTIONS = {
  CREATE_WORKFLOW: 'CREATE_WORKFLOW',
  UPDATE_WORKFLOW: 'UPDATE_WORKFLOW',
  COMPLETE_STEP: 'COMPLETE_STEP',
  ADD_DATA: 'ADD_DATA',
  LINK_TOOLS: 'LINK_TOOLS',
  SET_ACTIVE_WORKFLOW: 'SET_ACTIVE_WORKFLOW',
  DELETE_WORKFLOW: 'DELETE_WORKFLOW',
  SHARE_DATA: 'SHARE_DATA'
};

// Workflow Templates
const WORKFLOW_TEMPLATES = {
  SDS_TO_LABPACK: {
    id: 'sds_to_labpack',
    name: 'SDS Analysis → Lab Pack Planning',
    description: 'Analyze SDS documents and create lab pack plans',
    steps: [
      { id: 'sds_analysis', tool: 'SDSAnalyzer', status: 'pending', data: null },
      { id: 'review_results', tool: 'SDSAnalyzer', status: 'pending', data: null },
      { id: 'create_labpack', tool: 'LabPackPlanner', status: 'pending', data: null },
      { id: 'schedule_pickup', tool: 'ProjectKanban', status: 'pending', data: null }
    ],
    dataFlows: [
      { from: 'sds_analysis', to: 'create_labpack', fields: ['chemicals', 'hazardClasses', 'volumes'] },
      { from: 'create_labpack', to: 'schedule_pickup', fields: ['packingPlan', 'estimatedValue'] }
    ]
  },
  LEAD_TO_PROJECT: {
    id: 'lead_to_project',
    name: 'Lead Generation → Project Management',
    description: 'Convert leads to active projects with tracking',
    steps: [
      { id: 'generate_leads', tool: 'LeadGenerator', status: 'pending', data: null },
      { id: 'qualify_lead', tool: 'LeadGenerator', status: 'pending', data: null },
      { id: 'create_quote', tool: 'QuoteGenerator', status: 'pending', data: null },
      { id: 'track_project', tool: 'ProjectKanban', status: 'pending', data: null }
    ],
    dataFlows: [
      { from: 'qualify_lead', to: 'create_quote', fields: ['companyInfo', 'wasteTypes', 'volumes'] },
      { from: 'create_quote', to: 'track_project', fields: ['quoteAmount', 'services', 'timeline'] }
    ]
  },
  FULL_SERVICE: {
    id: 'full_service',
    name: 'Complete Environmental Services',
    description: 'End-to-end waste management workflow',
    steps: [
      { id: 'lead_generation', tool: 'LeadGenerator', status: 'pending', data: null },
      { id: 'sds_analysis', tool: 'SDSAnalyzer', status: 'pending', data: null },
      { id: 'lab_pack_planning', tool: 'LabPackPlanner', status: 'pending', data: null },
      { id: 'route_optimization', tool: 'WasteRouting', status: 'pending', data: null },
      { id: 'project_tracking', tool: 'ProjectKanban', status: 'pending', data: null },
      { id: 'final_quote', tool: 'QuoteGenerator', status: 'pending', data: null }
    ],
    dataFlows: [
      { from: 'lead_generation', to: 'sds_analysis', fields: ['customerInfo', 'wasteInventory'] },
      { from: 'sds_analysis', to: 'lab_pack_planning', fields: ['chemicals', 'hazardClasses'] },
      { from: 'lab_pack_planning', to: 'route_optimization', fields: ['packingPlan', 'locations'] },
      { from: 'route_optimization', to: 'project_tracking', fields: ['timeline', 'logistics'] },
      { from: 'project_tracking', to: 'final_quote', fields: ['projectDetails', 'resources'] }
    ]
  }
};

const initialState = {
  workflows: [],
  activeWorkflow: null,
  templates: WORKFLOW_TEMPLATES,
  sharedData: {},
  integrations: {
    calendarEvents: [],
    notifications: [],
    reports: []
  }
};

function workflowReducer(state, action) {
  switch (action.type) {
    case WORKFLOW_ACTIONS.CREATE_WORKFLOW:
      const newWorkflow = {
        id: `workflow_${Date.now()}`,
        templateId: action.payload.templateId,
        name: action.payload.name || action.payload.template.name,
        description: action.payload.description || action.payload.template.description,
        steps: action.payload.template.steps.map(step => ({ ...step, data: null, status: 'pending' })),
        dataFlows: action.payload.template.dataFlows,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      };
      
      return {
        ...state,
        workflows: [...state.workflows, newWorkflow],
        activeWorkflow: newWorkflow
      };

    case WORKFLOW_ACTIONS.UPDATE_WORKFLOW:
      return {
        ...state,
        workflows: state.workflows.map(workflow =>
          workflow.id === action.payload.workflowId
            ? { ...workflow, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : workflow
        ),
        activeWorkflow: state.activeWorkflow?.id === action.payload.workflowId
          ? { ...state.activeWorkflow, ...action.payload.updates, updatedAt: new Date().toISOString() }
          : state.activeWorkflow
      };

    case WORKFLOW_ACTIONS.COMPLETE_STEP:
      const updatedWorkflows = state.workflows.map(workflow => {
        if (workflow.id === action.payload.workflowId) {
          const updatedSteps = workflow.steps.map(step =>
            step.id === action.payload.stepId
              ? { ...step, status: 'completed', data: action.payload.data, completedAt: new Date().toISOString() }
              : step
          );
          
          // Auto-start next step if available
          const currentStepIndex = workflow.steps.findIndex(step => step.id === action.payload.stepId);
          if (currentStepIndex < workflow.steps.length - 1) {
            updatedSteps[currentStepIndex + 1].status = 'active';
          }
          
          return { ...workflow, steps: updatedSteps, updatedAt: new Date().toISOString() };
        }
        return workflow;
      });

      return {
        ...state,
        workflows: updatedWorkflows,
        activeWorkflow: state.activeWorkflow?.id === action.payload.workflowId
          ? updatedWorkflows.find(w => w.id === action.payload.workflowId)
          : state.activeWorkflow
      };

    case WORKFLOW_ACTIONS.SHARE_DATA:
      const { fromTool, toTool, data, key } = action.payload;
      return {
        ...state,
        sharedData: {
          ...state.sharedData,
          [`${fromTool}_to_${toTool}_${key}`]: {
            data,
            timestamp: new Date().toISOString(),
            from: fromTool,
            to: toTool
          }
        }
      };

    case WORKFLOW_ACTIONS.SET_ACTIVE_WORKFLOW:
      return {
        ...state,
        activeWorkflow: state.workflows.find(w => w.id === action.payload.workflowId) || null
      };

    case WORKFLOW_ACTIONS.DELETE_WORKFLOW:
      return {
        ...state,
        workflows: state.workflows.filter(w => w.id !== action.payload.workflowId),
        activeWorkflow: state.activeWorkflow?.id === action.payload.workflowId ? null : state.activeWorkflow
      };

    default:
      return state;
  }
}

export function WorkflowProvider({ children }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);

  // Auto-save workflows to localStorage
  useEffect(() => {
    localStorage.setItem('envServices_workflows', JSON.stringify(state.workflows));
  }, [state.workflows]);

  // Load workflows on mount
  useEffect(() => {
    const savedWorkflows = localStorage.getItem('envServices_workflows');
    if (savedWorkflows) {
      try {
        const workflows = JSON.parse(savedWorkflows);
        workflows.forEach(workflow => {
          dispatch({
            type: WORKFLOW_ACTIONS.CREATE_WORKFLOW,
            payload: {
              templateId: workflow.templateId,
              template: state.templates[workflow.templateId] || workflow,
              name: workflow.name,
              description: workflow.description
            }
          });
        });
      } catch (error) {
        console.warn('Failed to load saved workflows:', error);
      }
    }
  }, []);

  const workflowActions = {
    createWorkflow: (templateId, customName = null, customDescription = null) => {
      const template = state.templates[templateId];
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }
      
      dispatch({
        type: WORKFLOW_ACTIONS.CREATE_WORKFLOW,
        payload: {
          templateId,
          template,
          name: customName,
          description: customDescription
        }
      });
    },

    updateWorkflow: (workflowId, updates) => {
      dispatch({
        type: WORKFLOW_ACTIONS.UPDATE_WORKFLOW,
        payload: { workflowId, updates }
      });
    },

    completeStep: (workflowId, stepId, data) => {
      dispatch({
        type: WORKFLOW_ACTIONS.COMPLETE_STEP,
        payload: { workflowId, stepId, data }
      });

      // Auto-transfer data to next step if data flows exist
      const workflow = state.workflows.find(w => w.id === workflowId);
      if (workflow) {
        const relevantFlows = workflow.dataFlows?.filter(flow => flow.from === stepId) || [];
        relevantFlows.forEach(flow => {
          const transferData = {};
          flow.fields.forEach(field => {
            if (data[field] !== undefined) {
              transferData[field] = data[field];
            }
          });
          
          if (Object.keys(transferData).length > 0) {
            workflowActions.shareData(flow.from, flow.to, transferData, 'auto_transfer');
          }
        });
      }
    },

    shareData: (fromTool, toTool, data, key = 'shared') => {
      dispatch({
        type: WORKFLOW_ACTIONS.SHARE_DATA,
        payload: { fromTool, toTool, data, key }
      });
    },

    getSharedData: (fromTool, toTool, key = 'shared') => {
      return state.sharedData[`${fromTool}_to_${toTool}_${key}`]?.data || null;
    },

    setActiveWorkflow: (workflowId) => {
      dispatch({
        type: WORKFLOW_ACTIONS.SET_ACTIVE_WORKFLOW,
        payload: { workflowId }
      });
    },

    deleteWorkflow: (workflowId) => {
      dispatch({
        type: WORKFLOW_ACTIONS.DELETE_WORKFLOW,
        payload: { workflowId }
      });
    },

    getWorkflowStatus: (workflowId) => {
      const workflow = state.workflows.find(w => w.id === workflowId);
      if (!workflow) return null;
      
      const completedSteps = workflow.steps.filter(step => step.status === 'completed').length;
      const totalSteps = workflow.steps.length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      
      return {
        ...workflow,
        progress,
        completedSteps,
        totalSteps,
        isComplete: completedSteps === totalSteps
      };
    }
  };

  const value = {
    ...state,
    ...workflowActions
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}