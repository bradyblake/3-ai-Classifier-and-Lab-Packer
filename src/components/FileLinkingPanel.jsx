import React from 'react';
import { useFileUpload } from '../context/FileUploadContext';

const FileLinkingPanel = ({
  cards = [],
  onCreateProject,
  createProjectFromDocument,
  lanes = [],
  statuses = [],
  setCards,
  saveCards,
  setEditingCard,
  setModalOpen
}) => {
  const { pendingLinks, showLinkingPanel, linkToProject, dismissLink, clearAllPendingLinks } = useFileUpload();

  if (!showLinkingPanel || pendingLinks.length === 0) {
    return null;
  }

  const handleLinkToProject = (uploadId, projectId) => {
    linkToProject(uploadId, projectId);
  };

  const handleCreateNewProject = (uploadId) => {
    const upload = pendingLinks.find(link => link.id === uploadId);
    if (!upload || !createProjectFromDocument) {
      console.error('Upload not found or createProjectFromDocument function not provided');
      dismissLink(uploadId);
      return;
    }

    try {
      // Create the project using the existing function
      const newProject = createProjectFromDocument(
        {
          extractedData: upload.extractedData,
          confidence: upload.confidence,
          projectMatch: upload.projectMatch
        },
        {
          name: upload.name,
          type: upload.type,
          size: upload.size
        }
      );

      // Add to cards and save
      if (setCards && saveCards) {
        setCards(prevCards => {
          const newCards = [...prevCards, newProject];
          saveCards(newCards);
          return newCards;
        });
      }

      // Link the upload to the new project
      linkToProject(uploadId, newProject.id);

      // Open the modal for editing if functions are available
      if (setEditingCard && setModalOpen) {
        setEditingCard(newProject);
        setModalOpen(true);
      }

      // Show success message
      setTimeout(() => {
        alert(`🎉 Project created successfully!\n\n"${newProject.title}"\n\nThe project has been added to your Kanban board and the document has been linked.`);
      }, 100);

    } catch (error) {
      console.error('Error creating project:', error);
      alert(`❌ Error creating project: ${error.message}`);
      dismissLink(uploadId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Document Linking</h2>
              <p className="text-blue-100 mt-1">
                {pendingLinks.length} file{pendingLinks.length > 1 ? 's' : ''} need{pendingLinks.length === 1 ? 's' : ''} to be linked to projects
              </p>
            </div>
            <button
              onClick={clearAllPendingLinks}
              className="text-white hover:text-gray-200 transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            {pendingLinks.map((upload) => (
              <div key={upload.id} className="border border-gray-200 rounded-lg p-4">
                {/* File Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800">{upload.name}</h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span className="mr-4">📄 {upload.type}</span>
                      <span className="mr-4">📊 {upload.confidence}% confidence</span>
                      <span>⏰ {new Date(upload.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => dismissLink(upload.id)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>

                {/* Extracted Data Preview */}
                {upload.extractedData && Object.keys(upload.extractedData).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Extracted Information:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {upload.extractedData.references && upload.extractedData.references.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-600">References:</span>
                          <div className="text-gray-800">
                            {upload.extractedData.references.slice(0, 3).join(', ')}
                          </div>
                        </div>
                      )}
                      {upload.extractedData.amounts && upload.extractedData.amounts.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-600">Amounts:</span>
                          <div className="text-gray-800">
                            {upload.extractedData.amounts.slice(0, 3).join(', ')}
                          </div>
                        </div>
                      )}
                      {upload.extractedData.dates && upload.extractedData.dates.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-600">Dates:</span>
                          <div className="text-gray-800">
                            {upload.extractedData.dates.slice(0, 3).join(', ')}
                          </div>
                        </div>
                      )}
                      {upload.extractedData.keywords && upload.extractedData.keywords.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-600">Keywords:</span>
                          <div className="text-gray-800">
                            {upload.extractedData.keywords.slice(0, 5).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Create New Project */}
                  <button
                    onClick={() => handleCreateNewProject(upload.id)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium"
                  >
                    🚀 Create New Project from Document
                  </button>

                  {/* Link to Existing Project */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Or link to existing project:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                      {cards.slice(0, 12).map((card) => (
                        <button
                          key={card.id}
                          onClick={() => handleLinkToProject(upload.id, card.id)}
                          className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                        >
                          <div className="font-medium text-gray-800 text-sm truncate group-hover:text-blue-800">
                            {card.customerName || 'No Customer'}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {card.title || 'Untitled Project'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {card.status} • {card.location}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Files will be linked to projects for better organization and tracking.
          </div>
          <button
            onClick={clearAllPendingLinks}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            Skip All
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileLinkingPanel;