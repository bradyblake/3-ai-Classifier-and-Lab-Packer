import React, { useState } from 'react';
import { X, Calendar, Copy, Plus, Trash2, Clock, Repeat } from 'lucide-react';

const RecurringTemplatesModal = ({ isOpen, onClose, onTemplateSelect, sourceCard = null }) => {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Monthly Safety Inspection',
      description: 'Regular safety inspection for hazardous materials storage',
      frequency: 'monthly',
      dayOfMonth: 15,
      estimatedValue: 2500,
      duration: '4 hours',
      location: 'industrial',
      status: 'quote-requested',
      lastUsed: '2024-07-15',
      usageCount: 12
    },
    {
      id: 2,
      name: 'Quarterly Waste Pickup',
      description: 'Scheduled quarterly pickup of laboratory waste',
      frequency: 'quarterly',
      dayOfMonth: 1,
      estimatedValue: 5000,
      duration: '2 days',
      location: 'laboratory',
      status: 'job-scheduled',
      lastUsed: '2024-06-01',
      usageCount: 8
    },
    {
      id: 3,
      name: 'Annual EPA Compliance Review',
      description: 'Comprehensive annual review of EPA compliance standards',
      frequency: 'yearly',
      dayOfMonth: 1,
      monthOfYear: 1,
      estimatedValue: 15000,
      duration: '1 week',
      location: 'commercial',
      status: 'new-lead',
      lastUsed: '2024-01-01',
      usageCount: 3
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    frequency: 'monthly',
    dayOfMonth: 1,
    monthOfYear: 1,
    estimatedValue: '',
    duration: '',
    location: 'industrial',
    status: 'new-lead'
  });

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const locationOptions = [
    { value: 'industrial', label: 'Industrial' },
    { value: 'laboratory', label: 'Laboratory' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'residential', label: 'Residential' }
  ];

  const statusOptions = [
    { value: 'new-lead', label: 'New Lead' },
    { value: 'quote-requested', label: 'Quote Requested' },
    { value: 'quote-submitted', label: 'Quote Submitted' },
    { value: 'job-scheduled', label: 'Job Scheduled' }
  ];

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim()) return;

    const template = {
      id: Date.now(),
      ...newTemplate,
      estimatedValue: parseFloat(newTemplate.estimatedValue) || 0,
      lastUsed: null,
      usageCount: 0
    };

    setTemplates(prev => [...prev, template]);
    setNewTemplate({
      name: '',
      description: '',
      frequency: 'monthly',
      dayOfMonth: 1,
      monthOfYear: 1,
      estimatedValue: '',
      duration: '',
      location: 'industrial',
      status: 'new-lead'
    });
    setShowCreateForm(false);
  };

  const handleDeleteTemplate = (templateId) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const handleTemplateSelect = (template) => {
    onTemplateSelect && onTemplateSelect(template);
    onClose();
  };

  const getFrequencyIcon = (frequency) => {
    switch (frequency) {
      case 'weekly': return <Clock className="w-4 h-4" />;
      case 'monthly': return <Calendar className="w-4 h-4" />;
      case 'quarterly': return <Repeat className="w-4 h-4" />;
      case 'yearly': return <Calendar className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Repeat className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Recurring Templates</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-96">
          {showCreateForm && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Template</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter template name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={newTemplate.frequency}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {frequencyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows="2"
                    placeholder="Describe the recurring task"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Value
                  </label>
                  <input
                    type="number"
                    value={newTemplate.estimatedValue}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, estimatedValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={newTemplate.duration}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., 2 hours, 1 day"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create Template
                </button>
              </div>
            </div>
          )}

          {templates.length === 0 ? (
            <div className="p-8 text-center">
              <Repeat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No recurring templates found.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Your First Template
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {templates.map((template) => (
                <div key={template.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          {getFrequencyIcon(template.frequency)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {template.name}
                          </h3>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {template.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              {getFrequencyIcon(template.frequency)}
                              <span className="capitalize">{template.frequency}</span>
                            </div>
                            
                            <div>
                              <span className="font-medium">${template.estimatedValue.toLocaleString()}</span>
                            </div>
                            
                            <div>
                              Duration: {template.duration}
                            </div>
                            
                            <div>
                              Used {template.usageCount} times
                            </div>
                            
                            {template.lastUsed && (
                              <div>
                                Last: {new Date(template.lastUsed).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex items-center gap-2">
                      <button
                        onClick={() => handleTemplateSelect(template)}
                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Use Template"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecurringTemplatesModal;