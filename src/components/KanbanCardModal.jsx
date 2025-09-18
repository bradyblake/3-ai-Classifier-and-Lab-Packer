// File: KanbanCardModal.jsx
import React, { useState, useEffect } from "react";
import { injectConfig } from "../ai/securityUtils.js";

export default function KanbanCardModal({ card, closeModal, updateCards, lanes, statuses }) {
  const [localCard, setLocalCard] = useState({ ...card });

  useEffect(() => {
    setLocalCard({ ...card });
  }, [card]);

  const handleChange = (field, value) => {
    setLocalCard(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateCards(localCard);
    closeModal();
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment = {
          name: file.name,
          url: reader.result,
        };
        setLocalCard(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteAttachment = (index) => {
    const updatedAttachments = [...(localCard.attachments || [])];
    updatedAttachments.splice(index, 1);
    setLocalCard(prev => ({ ...prev, attachments: updatedAttachments }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="bg-white rounded shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
          <button
            onClick={closeModal}
            className="absolute top-2 right-2 text-red-500 text-xl font-bold"
          >
            ×
          </button>

          <h2 className="text-lg font-bold mb-4">Edit Card</h2>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input className="border p-2" value={localCard.title || ""} onChange={e => handleChange("title", e.target.value)} placeholder="Project Title" />
            <div className="relative">
              <input 
                className="border p-2 bg-gray-50 text-gray-700" 
                value={localCard.jobNumber || ""} 
                onChange={e => handleChange("jobNumber", e.target.value)} 
                placeholder="Auto-generated Project Number"
                title="Format: LocationYearPeriodSequence (e.g., FTW2025P901)"
              />
              <span className="absolute right-2 top-2 text-xs text-gray-500">Auto</span>
            </div>
            <select className="border p-2" value={localCard.location || ""} onChange={e => handleChange("location", e.target.value)}>
              <option value="">Select Location</option>
              {lanes.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
            </select>
            <select className="border p-2" value={localCard.status || ""} onChange={e => handleChange("status", e.target.value)}>
              <option value="">Select Status</option>
              {statuses.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          {/* Priority and Assignment */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <select className="border p-2" value={localCard.priority || "Medium"} onChange={e => handleChange("priority", e.target.value)}>
              <option value="Low">🟢 Low Priority</option>
              <option value="Medium">🟡 Medium Priority</option>
              <option value="High">🟠 High Priority</option>
              <option value="Critical">🔴 Critical Priority</option>
            </select>
            <input 
              className="border p-2" 
              value={localCard.assignedTo || ""} 
              onChange={e => handleChange("assignedTo", e.target.value)} 
              placeholder="Assigned Team Member"
              list="team-members"
            />
            <datalist id="team-members">
              <option value="John Smith" />
              <option value="Sarah Johnson" />
              <option value="Mike Wilson" />
              <option value="Lisa Brown" />
              <option value="David Lee" />
            </datalist>
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input className="border p-2" value={localCard.revenue || ""} onChange={e => handleChange("revenue", e.target.value)} placeholder="Revenue ($)" />
            <input className="border p-2" value={localCard.vendor || ""} onChange={e => handleChange("vendor", e.target.value)} placeholder="Vendor" />
          </div>

          {/* Scheduling Dates */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">📅 Project Timeline</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                <input 
                  className="border p-2 w-full" 
                  type="date" 
                  value={localCard.dueDate || ""} 
                  onChange={e => handleChange("dueDate", e.target.value)} 
                  title="Project deadline"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Scheduled Start</label>
                <input 
                  className="border p-2 w-full" 
                  type="date" 
                  value={localCard.scheduledDate || ""} 
                  onChange={e => handleChange("scheduledDate", e.target.value)} 
                  title="When is this job scheduled to start?"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Estimated Completion</label>
                <input 
                  className="border p-2 w-full" 
                  type="date" 
                  value={localCard.estimatedCompletionDate || ""} 
                  onChange={e => handleChange("estimatedCompletionDate", e.target.value)} 
                  title="When is this job expected to be completed?"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Disposal Method</label>
                <input 
                  className="border p-2 w-full" 
                  value={localCard.disposal || ""} 
                  onChange={e => handleChange("disposal", e.target.value)} 
                  placeholder="e.g., Incineration, Recycling"
                />
              </div>
            </div>
          </div>

          {/* Actual Dates (for tracking) */}
          {(localCard.actualStartDate || localCard.actualCompletionDate) && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">✅ Actual Timeline</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Actual Start Date</label>
                  <input 
                    className="border p-2 w-full" 
                    type="date" 
                    value={localCard.actualStartDate || ""} 
                    onChange={e => handleChange("actualStartDate", e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Actual Completion Date</label>
                  <input 
                    className="border p-2 w-full" 
                    type="date" 
                    value={localCard.actualCompletionDate || ""} 
                    onChange={e => handleChange("actualCompletionDate", e.target.value)} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">🏷️ Tags</h4>
            <input 
              className="border p-2 w-full" 
              value={(localCard.tags || []).join(', ')} 
              onChange={e => handleChange("tags", e.target.value.split(',').map(t => t.trim()).filter(t => t))} 
              placeholder="e.g., hazardous, urgent, lab-pack (comma separated)"
            />
          </div>

          <textarea className="border p-2 w-full mt-4" value={localCard.description || ""} onChange={e => handleChange("description", e.target.value)} placeholder="Description" rows={4} />

          {/* File Upload */}
          <div className="mt-6 border-t pt-4">
            <label className="font-semibold">Upload Documents</label>
            <input type="file" onChange={handleFileUpload} className="mt-1 block w-full" multiple />
          </div>

          {/* Attachments Section */}
          {localCard.attachments && localCard.attachments.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">Attached Files</h3>
              <ul className="space-y-2">
                {localCard.attachments.map((file, idx) => (
                  <li key={idx} className="flex justify-between items-center">
                    <span className="truncate max-w-xs">{file.name}</span>
                    <div className="space-x-2">
                      <a href={file.url} download={file.name} className="text-blue-600 underline text-sm">Download</a>
                      <button onClick={() => handleDeleteAttachment(idx)} className="text-red-500 text-sm">Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-2">
            <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
            <button onClick={closeModal} className="bg-gray-300 text-black px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      </div>
  );
}