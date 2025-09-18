import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink, Edit3 } from 'lucide-react';

const PDFViewer = ({ 
  pdfFile, 
  isOpen, 
  onClose, 
  sectionKey, 
  fieldKey,
  title = "SDS Document Viewer",
  onTextSelection,
  onNextField,
  onPreviousField,
  onSkipField,
  fieldInfo
}) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [targetPage, setTargetPage] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [isTextSelected, setIsTextSelected] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputValue, setManualInputValue] = useState('');
  const iframeRef = React.useRef(null);

  // Handle text selection in PDF
  useEffect(() => {
    let selectionTimeout;
    
    const handleSelection = () => {
      // Clear any existing timeout
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      
      // Delay to ensure selection is complete
      selectionTimeout = setTimeout(() => {
        try {
          // Try to get selection from main window
          let selection = window.getSelection();
          let text = selection.toString().trim();
          
          // If no text from main window, try iframe
          if (!text && iframeRef.current) {
            try {
              const iframeWindow = iframeRef.current.contentWindow;
              if (iframeWindow) {
                const iframeSelection = iframeWindow.getSelection();
                if (iframeSelection) {
                  text = iframeSelection.toString().trim();
                }
              }
            } catch (e) {
              // Cross-origin iframe - can't access selection
              console.log('⚠️ Cannot access iframe selection (cross-origin)');
            }
          }
          
          if (text && text.length > 0) {
            setSelectedText(text);
            setIsTextSelected(true);
            console.log('📝 Text selected:', text);
            
            // Auto-populate the manual input field instead of direct callback
            setManualInputValue(text.trim());
            setShowManualInput(true);
            
            console.log('📋 Auto-populated manual input with selected text');
          }
        } catch (error) {
          console.error('Error handling selection:', error);
        }
      }, 200); // Small delay to ensure selection is complete
    };

    // Add listeners to both document and iframe
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('selectionchange', handleSelection);
    
    // Try to add listeners to iframe as well
    if (iframeRef.current) {
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.addEventListener('mouseup', handleSelection);
          iframeDoc.addEventListener('selectionchange', handleSelection);
        }
      } catch (e) {
        console.log('⚠️ Cannot add iframe listeners (cross-origin)');
      }
    }

    return () => {
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('selectionchange', handleSelection);
      
      // Cleanup iframe listeners
      if (iframeRef.current) {
        try {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.removeEventListener('mouseup', handleSelection);
            iframeDoc.removeEventListener('selectionchange', handleSelection);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [onTextSelection]);

  useEffect(() => {
    if (pdfFile && isOpen) {
      // Create object URL for PDF viewing
      let url;
      if (pdfFile instanceof File) {
        url = URL.createObjectURL(pdfFile);
      } else if (typeof pdfFile === 'string') {
        // If it's already a URL
        url = pdfFile;
      } else if (pdfFile.arrayBuffer) {
        // If it's a blob or has arrayBuffer method
        url = URL.createObjectURL(pdfFile);
      }
      
      setPdfUrl(url);
      
      // Set search term and target page based on section
      if (sectionKey) {
        const sectionSearchTerms = {
          section1: 'Section 1',
          section2: 'Section 2', 
          section3: 'Section 3',
          section9: 'Section 9',
          section13: 'Section 13',
          section14: 'Section 14'
        };
        setSearchTerm(sectionSearchTerms[sectionKey] || '');
        
        // Estimate page numbers for common SDS sections
        // Most SDS documents follow a standard format
        const sectionPageEstimates = {
          section1: 1,   // Usually on page 1
          section2: 1,   // Usually on page 1-2
          section3: 2,   // Usually on page 2-3
          section9: 5,   // Usually around page 5-7
          section13: 9,  // Usually around page 9-10
          section14: 10  // Usually around page 10-11
        };
        setTargetPage(sectionPageEstimates[sectionKey] || 1);
        setCurrentPage(sectionPageEstimates[sectionKey] || 1);
      }
      
      // Cleanup function
      return () => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [pdfFile, isOpen, sectionKey]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `SDS_${fieldKey}_${Date.now()}.pdf`;
      link.click();
    }
  };

  const handleExternalView = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const adjustZoom = (increment) => {
    setZoom(prev => Math.max(25, Math.min(200, prev + increment)));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-11/12 h-5/6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {sectionKey && fieldKey && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Viewing for: {fieldKey} (Section {sectionKey.replace('section', '')})
              </p>
            )}
            
            {/* Field Navigation */}
            {fieldInfo && (
              <div className="flex items-center space-x-4 text-sm mt-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Field {fieldInfo.progress}: {fieldKey}
                </span>
                {selectedText && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                    Text Selected: "{selectedText.substring(0, 30)}{selectedText.length > 30 ? '...' : ''}"
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
              <button
                onClick={() => adjustZoom(-25)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-medium min-w-[3rem] text-center">
                {zoom}%
              </span>
              <button
                onClick={() => adjustZoom(25)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleExternalView}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            
            {/* Field Navigation Controls */}
            {fieldInfo && (
              <>
                {onPreviousField && fieldInfo && fieldInfo.progress.includes('1 of') === false && (
                  <button
                    onClick={onPreviousField}
                    className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center"
                    title="Go to previous missing field"
                  >
                    ← Previous
                  </button>
                )}
                
                {onSkipField && (
                  <button
                    onClick={onSkipField}
                    className="px-4 py-2 text-sm bg-yellow-500 text-white hover:bg-yellow-600 rounded-md flex items-center"
                    title="Skip this field and move to next"
                  >
                    Skip Field
                  </button>
                )}
                
                {onNextField && (
                  <button
                    onClick={() => {
                      onNextField();
                      // Clear states for next field
                      setSelectedText('');
                      setIsTextSelected(false);
                      setShowManualInput(false);
                      setManualInputValue('');
                    }}
                    className={`px-6 py-2 text-sm rounded-md font-medium flex items-center ${
                      selectedText 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={selectedText ? "Save selected text and continue" : "Continue to next field"}
                  >
                    {selectedText ? '✓ Save & Next' : 'Next Field'} →
                  </button>
                )}
                
                <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
              </>
            )}
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Guided Instructions Bar */}
        {fieldInfo && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Step {fieldInfo.progress}: Find {fieldKey}
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                🔍 Auto-navigated to {getSectionName(sectionKey)} (Page {targetPage || currentPage}) - Look for <strong>{fieldKey}</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                📝 <strong>Instructions:</strong> Find and highlight the {fieldKey} information, then click "Next Field" to continue
              </p>
              
              {selectedText && (
                <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                    ✅ Selected: "{selectedText.substring(0, 50)}{selectedText.length > 50 ? '...' : ''}"
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    Click "Save & Next" to save this data and continue
                  </p>
                </div>
              )}
              
              {/* Manual Input Always Visible */}
              <div className="mt-3">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-300 dark:border-blue-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    💡 <strong>Highlight text above</strong> to auto-fill, or type the {fieldKey} value manually:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={manualInputValue}
                      onChange={(e) => setManualInputValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && manualInputValue.trim()) {
                          setSelectedText(manualInputValue.trim());
                          setIsTextSelected(true);
                          if (onTextSelection) {
                            onTextSelection(manualInputValue.trim());
                          }
                        }
                      }}
                      placeholder={`Enter ${fieldKey} here...`}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (manualInputValue.trim()) {
                          setSelectedText(manualInputValue.trim());
                          setIsTextSelected(true);
                          if (onTextSelection) {
                            onTextSelection(manualInputValue.trim());
                          }
                        }
                      }}
                      disabled={!manualInputValue.trim()}
                      className={`px-4 py-2 text-sm rounded-md font-medium ${
                        manualInputValue.trim()
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Apply
                    </button>
                  </div>
                  {selectedText && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-xs text-green-700 dark:text-green-300">
                        ✅ Ready to save: "{selectedText}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar with Auto-Navigation Notice */}
        {searchTerm && !fieldInfo && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center space-x-4">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                📍 Auto-navigated to: "{searchTerm}" (Page {targetPage || currentPage})
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Use Ctrl+F to search within the section | Scroll if section spans multiple pages
              </span>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <div 
              className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
            >
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#zoom=${zoom}&page=${targetPage || currentPage}&toolbar=1&navpanes=1&scrollbar=1&search=${encodeURIComponent(searchTerm)}`}
                className="w-full h-full border-0"
                title="PDF Viewer"
                style={{
                  width: rotation % 180 === 0 ? '100%' : '100vh',
                  height: rotation % 180 === 0 ? '100%' : '100vw',
                  maxWidth: '100%',
                  maxHeight: '100%'
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with helpful hints */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          {fieldInfo ? (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-6 text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  📊 Progress: {fieldInfo.completedCount} completed, {fieldInfo.totalCount - fieldInfo.completedCount} remaining
                </span>
                
                {selectedText ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    ✅ Ready to save selected text!
                  </span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400">
                    💡 Highlight the {fieldKey} information above
                  </span>
                )}
              </div>
              
              {sectionKey && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Looking in: Section {sectionKey.replace('section', '')} - {getSectionName(sectionKey)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>💡 Select text to auto-copy to current field</span>
                <span>📖 Use Ctrl+F to find specific text</span>
                {isTextSelected && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    ✅ Text copied to field!
                  </span>
                )}
              </div>
              {sectionKey && (
                <span className="font-medium">
                  Look for: Section {sectionKey.replace('section', '')} - {getSectionName(sectionKey)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get section names
const getSectionName = (sectionKey) => {
  const sectionNames = {
    section1: 'Identification',
    section2: 'Hazard Identification', 
    section3: 'Composition/Information on Ingredients',
    section9: 'Physical and Chemical Properties',
    section13: 'Disposal Considerations',
    section14: 'Transport Information'
  };
  return sectionNames[sectionKey] || 'Unknown Section';
};

export default PDFViewer;