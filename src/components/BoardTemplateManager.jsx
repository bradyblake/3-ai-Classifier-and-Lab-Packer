import React, { useState } from 'react';

const BoardTemplateManager = ({ onLoadTemplate, onSaveTemplate }) => {
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('kanbanTemplates');
    return saved ? JSON.parse(saved) : [];
  });
  const [templateName, setTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSaveTemplate = () => {
    if (templateName.trim()) {
      onSaveTemplate(templateName);
      setTemplateName('');
      setShowSaveDialog(false);
      // Refresh templates list
      const saved = localStorage.getItem('kanbanTemplates');
      if (saved) setTemplates(JSON.parse(saved));
    }
  };

  const handleDeleteTemplate = (name) => {
    const updatedTemplates = templates.filter(t => t.name !== name);
    localStorage.setItem('kanbanTemplates', JSON.stringify(updatedTemplates));
    setTemplates(updatedTemplates);
  };

  return (
    <div className="mb-4 p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Board Templates</h3>
        <button
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save Current Board
        </button>
      </div>

      {showSaveDialog && (
        <div className="mb-3 p-3 bg-gray-50 rounded">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name..."
            className="w-full p-2 border rounded mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveTemplate}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setTemplateName('');
              }}
              className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(template => (
          <div
            key={template.name}
            className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
          >
            <button
              onClick={() => onLoadTemplate(template)}
              className="flex-1 text-left"
            >
              {template.name}
            </button>
            <button
              onClick={() => handleDeleteTemplate(template.name)}
              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-gray-500 text-sm">No templates saved yet</p>
        )}
      </div>
    </div>
  );
};

export default BoardTemplateManager;