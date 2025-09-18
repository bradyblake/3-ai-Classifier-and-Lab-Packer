import React, { useState } from 'react';
import { 
  Workflow,
  Plus,
  Play,
  Pause,
  Check,
  Clock,
  ArrowRight,
  Settings,
  Trash2,
  Share2,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useWorkflow } from '../context/WorkflowContext';
import '../styles/WorkflowPanel.css';

export default function WorkflowPanel({ currentTool, onNavigateToTool }) {
  const {
    workflows,
    activeWorkflow,
    templates,
    createWorkflow,
    setActiveWorkflow,
    completeStep,
    deleteWorkflow,
    getWorkflowStatus
  } = useWorkflow();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedWorkflows, setExpandedWorkflows] = useState(new Set());

  const handleCreateWorkflow = (templateId) => {
    createWorkflow(templateId);
    setShowCreateModal(false);
    setSelectedTemplate(null);
  };

  const toggleWorkflowExpanded = (workflowId) => {
    const newExpanded = new Set(expandedWorkflows);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedWorkflows(newExpanded);
  };

  const getStepStatus = (step) => {
    switch (step.status) {
      case 'completed': return { icon: <Check />, class: 'step-completed', color: 'var(--status-success)' };
      case 'active': return { icon: <Play />, class: 'step-active', color: 'var(--env-primary-500)' };
      case 'pending': return { icon: <Clock />, class: 'step-pending', color: 'var(--text-tertiary)' };
      default: return { icon: <Clock />, class: 'step-pending', color: 'var(--text-tertiary)' };
    }
  };

  const getCurrentStepForTool = (workflow, toolName) => {
    return workflow.steps.find(step => 
      step.tool === toolName && (step.status === 'active' || step.status === 'pending')
    );
  };

  const canCompleteStep = (step) => {
    return step.status === 'active' && step.tool === currentTool;
  };

  return (
    <div className="workflow-panel">
      <div className="workflow-header">
        <div className="workflow-title">
          <Workflow />
          <span>Workflows</span>
        </div>
        <button 
          className="create-workflow-btn"
          onClick={() => setShowCreateModal(true)}
          title="Create New Workflow"
        >
          <Plus />
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="workflow-empty-state">
          <Workflow className="empty-icon" />
          <p>No active workflows</p>
          <button 
            className="create-workflow-empty"
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        <div className="workflow-list">
          {workflows.map(workflow => {
            const status = getWorkflowStatus(workflow.id);
            const isExpanded = expandedWorkflows.has(workflow.id);
            const currentStep = getCurrentStepForTool(workflow, currentTool);
            
            return (
              <div key={workflow.id} className="workflow-item">
                <div className="workflow-summary">
                  <button 
                    className="workflow-expand-btn"
                    onClick={() => toggleWorkflowExpanded(workflow.id)}
                  >
                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                  </button>
                  
                  <div className="workflow-info">
                    <h4 className="workflow-name">{workflow.name}</h4>
                    <div className="workflow-meta">
                      <span className="workflow-progress">
                        {status.completedSteps}/{status.totalSteps} steps
                      </span>
                      <div className="workflow-progress-bar">
                        <div 
                          className="workflow-progress-fill"
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {currentStep && (
                    <div className="current-step-indicator">
                      <AlertCircle />
                      <span>Action Required</span>
                    </div>
                  )}

                  <button 
                    className="workflow-delete-btn"
                    onClick={() => deleteWorkflow(workflow.id)}
                    title="Delete Workflow"
                  >
                    <Trash2 />
                  </button>
                </div>

                {isExpanded && (
                  <div className="workflow-details">
                    <div className="workflow-steps">
                      {workflow.steps.map((step, index) => {
                        const stepStatus = getStepStatus(step);
                        const isCurrentStep = canCompleteStep(step);
                        
                        return (
                          <div key={step.id} className={`workflow-step ${stepStatus.class}`}>
                            <div className="step-indicator">
                              <div 
                                className="step-icon"
                                style={{ color: stepStatus.color }}
                              >
                                {stepStatus.icon}
                              </div>
                              {index < workflow.steps.length - 1 && (
                                <div className="step-connector" />
                              )}
                            </div>
                            
                            <div className="step-content">
                              <div className="step-header">
                                <span className="step-tool">{step.tool}</span>
                                <span className="step-status">{step.status}</span>
                              </div>
                              
                              {step.data && (
                                <div className="step-data">
                                  <small>Data: {JSON.stringify(step.data, null, 2).substring(0, 100)}...</small>
                                </div>
                              )}
                              
                              <div className="step-actions">
                                {step.tool !== currentTool && (
                                  <button 
                                    className="navigate-to-tool-btn"
                                    onClick={() => onNavigateToTool(step.tool)}
                                  >
                                    Open {step.tool}
                                    <ArrowRight />
                                  </button>
                                )}
                                
                                {isCurrentStep && (
                                  <button 
                                    className="complete-step-btn"
                                    onClick={() => completeStep(workflow.id, step.id, { completedAt: new Date() })}
                                  >
                                    Mark Complete
                                    <Check />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="workflow-modal-overlay">
          <div className="workflow-modal">
            <div className="modal-header">
              <h3>Create New Workflow</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <p>Choose a workflow template to get started:</p>
              
              <div className="template-list">
                {Object.entries(templates).map(([templateId, template]) => (
                  <div 
                    key={templateId}
                    className={`template-item ${selectedTemplate === templateId ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(templateId)}
                  >
                    <h4>{template.name}</h4>
                    <p>{template.description}</p>
                    <div className="template-steps">
                      {template.steps.map((step, index) => (
                        <span key={step.id} className="template-step">
                          {step.tool}
                          {index < template.steps.length - 1 && <ArrowRight />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-create-btn"
                onClick={() => handleCreateWorkflow(selectedTemplate)}
                disabled={!selectedTemplate}
              >
                Create Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}