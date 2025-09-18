// NotesPanel - Dashboard Notes
// Simple note-taking for the right pane

import React, { useState, useEffect } from "react";

export default function NotesPanel() {
  const [notes, setNotes] = useState('');

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('unboxed-dashboard-notes');
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  // Save notes to localStorage when they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('unboxed-dashboard-notes', notes);
    }, 1000); // Debounce saves by 1 second

    return () => clearTimeout(timeoutId);
  }, [notes]);

  return (
    <div className="notes-panel">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-700">📝 Quick Notes</h4>
        <div className="text-xs text-gray-500">
          Auto-saved
        </div>
      </div>
      
      <textarea
        className="notes-content"
        placeholder="Jot down quick notes, ideas, or reminders...

Examples:
• Follow up with client about quote
• Review weekly reports
• Check compliance requirements
• Schedule team meeting"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      
      <div className="mt-2 text-xs text-gray-400 text-center">
        {notes.length} characters • Saved locally
      </div>
    </div>
  );
}