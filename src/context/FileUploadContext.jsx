import React, { createContext, useContext, useState } from 'react';

const FileUploadContext = createContext();

export const useFileUpload = () => {
  const context = useContext(FileUploadContext);
  if (!context) {
    throw new Error('useFileUpload must be used within a FileUploadProvider');
  }
  return context;
};

export const FileUploadProvider = ({ children }) => {
  const [recentUploads, setRecentUploads] = useState([]);
  const [pendingLinks, setPendingLinks] = useState([]);
  const [showLinkingPanel, setShowLinkingPanel] = useState(false);

  const addUpload = (fileData) => {
    const upload = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...fileData
    };

    setRecentUploads(prev => [upload, ...prev.slice(0, 9)]); // Keep last 10

    // If the file has potential project matches, add to pending links
    if (fileData.projectMatch) {
      setPendingLinks(prev => [upload, ...prev]);
      setShowLinkingPanel(true);
    }

    return upload;
  };

  const linkToProject = (uploadId, projectId) => {
    // Remove from pending links
    setPendingLinks(prev => prev.filter(link => link.id !== uploadId));

    // Update the upload record
    setRecentUploads(prev => prev.map(upload =>
      upload.id === uploadId
        ? { ...upload, linkedProjectId: projectId, linkedAt: new Date().toISOString() }
        : upload
    ));

    // If no more pending links, hide the panel
    if (pendingLinks.length <= 1) {
      setShowLinkingPanel(false);
    }
  };

  const dismissLink = (uploadId) => {
    setPendingLinks(prev => prev.filter(link => link.id !== uploadId));

    if (pendingLinks.length <= 1) {
      setShowLinkingPanel(false);
    }
  };

  const clearAllPendingLinks = () => {
    setPendingLinks([]);
    setShowLinkingPanel(false);
  };

  const getProjectFiles = (projectId) => {
    return recentUploads.filter(upload => upload.linkedProjectId === projectId);
  };

  const value = {
    recentUploads,
    pendingLinks,
    showLinkingPanel,
    addUpload,
    linkToProject,
    dismissLink,
    clearAllPendingLinks,
    getProjectFiles,
    setShowLinkingPanel
  };

  return (
    <FileUploadContext.Provider value={value}>
      {children}
    </FileUploadContext.Provider>
  );
};

export default FileUploadProvider;