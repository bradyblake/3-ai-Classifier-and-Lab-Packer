import React, { useState } from 'react';
import { parseGlobalDocument } from '../utils/aiDocumentParser';
import { useFileUpload } from '../context/FileUploadContext';

const FileDropPanel = () => {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { recentUploads, addUpload } = useFileUpload();

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileUpload = async (files) => {
    setProcessing(true);

    for (const file of files) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const parsedData = await parseGlobalDocument(file, event.target.result);

            // Add to upload context
            const upload = addUpload({
              name: file.name,
              size: file.size,
              type: file.type,
              extractedData: parsedData.extractedData || {},
              confidence: parsedData.confidence || 0,
              projectMatch: parsedData.projectMatch
            });

            // Show success notification
            if (parsedData.projectMatch) {
              alert(`📄 File processed successfully!\n\n${file.name}\n\nFound potential project match. Check the Kanban board for linking options.`);
            } else {
              alert(`📄 File processed!\n\n${file.name}\n\nExtracted ${Object.keys(parsedData.extractedData || {}).length} data fields. Use Quick Start templates to create a project.`);
            }

          } catch (error) {
            console.error('Error processing file:', error);
            alert(`❌ Error processing ${file.name}:\n${error.message}`);
          }
        };

        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading file:', error);
        alert(`❌ Error reading ${file.name}:\n${error.message}`);
      }
    }

    setProcessing(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="file-drop-container flex flex-col h-full">
      {/* Main Drop Zone */}
      <div className="flex-1">
        <div
          className={`file-drop-zone h-full flex flex-col justify-center items-center ${
            dragOver ? 'drag-over' : ''
          } ${processing ? 'pointer-events-none opacity-75' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="sidebar-file-drop"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.png"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <label htmlFor="sidebar-file-drop" className="cursor-pointer text-center w-full h-full flex flex-col justify-center">
            {processing ? (
              <>
                <div className="text-4xl text-blue-500 mb-4 animate-spin">⚙️</div>
                <div className="text-lg font-semibold text-blue-700 mb-2">
                  Processing Files...
                </div>
                <div className="text-sm text-blue-600">
                  AI is extracting data
                </div>
              </>
            ) : dragOver ? (
              <>
                <div className="file-drop-icon animate-bounce">📥</div>
                <div className="file-drop-text text-lg font-semibold">
                  Drop Files Here
                </div>
                <div className="file-drop-subtext">
                  AI will process automatically
                </div>
              </>
            ) : (
              <>
                <div className="file-drop-icon">📁</div>
                <div className="file-drop-text text-lg font-semibold">
                  File Drop Zone
                </div>
                <div className="file-drop-subtext mb-2">
                  Drag & drop files or click to browse
                </div>
                <div className="file-drop-subtext text-xs mb-3">
                  PDF • Word • Images • CSV • Text
                </div>
                <div className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
                  🤖 AI-Powered Processing
                </div>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Recent Files Section */}
      {recentUploads.length > 0 && (
        <div className="recent-files-section border-t p-3 max-h-40 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-600 mb-2">Recent Files</div>
          <div className="space-y-2">
            {recentUploads.map((file) => (
              <div key={file.id} className="recent-file-item flex items-center justify-between p-2 rounded text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{file.name}</div>
                  <div className="text-gray-500 flex items-center gap-2">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{formatTimeAgo(file.timestamp)}</span>
                  </div>
                </div>
                <div className="ml-2">
                  {file.confidence > 70 ? (
                    <span className="text-green-600 text-lg">✅</span>
                  ) : file.confidence > 40 ? (
                    <span className="text-yellow-600 text-lg">⚠️</span>
                  ) : (
                    <span className="text-gray-400 text-lg">📄</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropPanel;