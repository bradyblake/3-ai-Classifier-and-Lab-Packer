import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Image,
  Paperclip,
  Mic,
  MicOff,
  Search,
  Plus,
  MessageCircle,
  Calendar,
  CheckSquare,
  X,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const SmartNotesDropArea = ({ projects, onAddNote, onAddTodo, onScheduleNote }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [noteType, setNoteType] = useState('note');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const speechRecognition = new window.webkitSpeechRecognition();
      speechRecognition.continuous = true;
      speechRecognition.interimResults = true;
      speechRecognition.lang = 'en-US';
      
      speechRecognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setNoteText(prev => prev + ' ' + finalTranscript);
        }
      };
      
      speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      speechRecognition.onend = () => {
        setIsRecording(false);
      };
      
      setRecognition(speechRecognition);
    }
  }, []);

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const text = e.dataTransfer.getData('text/plain');

    if (files.length > 0) {
      handleFiles(files);
    } else if (text) {
      handleText(text);
    }
  };

  const handleFiles = (files) => {
    const fileData = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setModalData({
      type: 'files',
      files: fileData
    });
    setShowModal(true);
  };

  const handleText = (text) => {
    setNoteText(text);
    setModalData({
      type: 'text',
      content: text
    });
    setShowModal(true);
  };

  // Smart project matching
  const findMatchingProjects = (text) => {
    if (!text) return [];
    
    const keywords = text.toLowerCase().split(/\s+/);
    const matches = projects.filter(project => {
      const searchText = `${project.name} ${project.client} ${project.jobNumber} ${project.trackingNumber} ${project.description}`.toLowerCase();
      return keywords.some(keyword => searchText.includes(keyword));
    });
    
    return matches.slice(0, 5); // Limit to top 5 matches
  };

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const parseDate = (text) => {
    const now = new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Simple date parsing
    if (text.includes('today')) {
      return today;
    } else if (text.includes('tomorrow')) {
      return tomorrow;
    } else if (text.includes('this friday')) {
      const days = (5 + 7 - today.getDay()) % 7;
      const thisFriday = new Date(today);
      thisFriday.setDate(thisFriday.getDate() + days);
      return thisFriday;
    } else if (text.includes('next friday')) {
      const days = (5 + 7 - today.getDay()) % 7 + 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(nextFriday.getDate() + days);
      return nextFriday;
    }
    
    // Try to extract specific dates (MM/DD/YYYY or similar)
    const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) {
      return new Date(dateMatch[1]);
    }
    
    return null;
  };

  const handleSave = async () => {
    if (!noteText.trim()) return;

    const noteData = {
      id: Date.now(),
      text: noteText,
      type: noteType,
      createdAt: new Date().toISOString(),
      files: modalData?.files || [],
      projectId: selectedProject?.id || null,
      scheduledDate: parseDate(noteText)
    };

    if (noteType === 'todo') {
      onAddTodo(noteData);
    } else if (noteData.scheduledDate) {
      onScheduleNote(noteData);
    } else {
      onAddNote(noteData, selectedProject?.id);
    }

    // Reset form
    setNoteText('');
    setSelectedProject(null);
    setNoteType('note');
    setModalData(null);
    setShowModal(false);
  };

  const matchedProjects = findMatchingProjects(noteText);

  return (
    <>
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 mb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Notes & Attachments</h3>
          <p className="text-gray-600 text-sm mb-4">
            Drop files, add notes, or record voice notes. System will automatically match to projects.
          </p>
          
          <div
            ref={dropRef}
            className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Drop files here or click to browse
            </p>
            
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                Add Files
              </button>
              
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Add Note
              </button>
              
              <button
                onClick={toggleRecording}
                className={`flex items-center px-4 py-2 rounded ${
                  isRecording 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                {isRecording ? 'Stop Recording' : 'Voice Note'}
              </button>
            </div>
            
            {isRecording && (
              <div className="flex items-center justify-center text-red-600">
                <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                Recording...
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files))}
          />
        </div>
      </div>

      {/* Smart Notes Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Add Note or Attachment</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Note Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Note Type</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="note"
                      checked={noteType === 'note'}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="mr-2"
                    />
                    <MessageCircle size={16} className="mr-1" />
                    Note
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="todo"
                      checked={noteType === 'todo'}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="mr-2"
                    />
                    <CheckSquare size={16} className="mr-1" />
                    To-Do Task
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="calendar"
                      checked={noteType === 'calendar'}
                      onChange={(e) => setNoteType(e.target.value)}
                      className="mr-2"
                    />
                    <Calendar size={16} className="mr-1" />
                    Calendar Event
                  </label>
                </div>
              </div>

              {/* Note Text Area */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {noteType === 'todo' ? 'Task Description' : noteType === 'calendar' ? 'Event Details' : 'Note Content'}
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    noteType === 'todo' 
                      ? 'Enter task details...' 
                      : noteType === 'calendar'
                      ? 'Enter event details with date (e.g., Meeting this Friday at 2pm)'
                      : 'Enter your note...'
                  }
                />
              </div>

              {/* File Display */}
              {modalData?.files && modalData.files.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attached Files</label>
                  <div className="space-y-2">
                    {modalData.files.map((file, index) => (
                      <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                        <FileText size={16} className="mr-2 text-blue-600" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Project Matching */}
              {matchedProjects.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suggested Projects
                    <span className="text-xs text-gray-500 ml-1">(Based on content)</span>
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {matchedProjects.map(project => (
                      <div
                        key={project.id}
                        className={`p-2 border rounded cursor-pointer ${
                          selectedProject?.id === project.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedProject(
                          selectedProject?.id === project.id ? null : project
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{project.name}</div>
                            <div className="text-xs text-gray-500">
                              {project.client} • {project.trackingNumber}
                            </div>
                          </div>
                          {selectedProject?.id === project.id && (
                            <CheckCircle size={16} className="text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Detection */}
              {parseDate(noteText) && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">
                      Date detected: {parseDate(noteText).toLocaleDateString()}
                      {noteType !== 'calendar' && ' (will be added to calendar)'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!noteText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {noteType === 'todo' ? 'Add Task' : noteType === 'calendar' ? 'Schedule Event' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartNotesDropArea;