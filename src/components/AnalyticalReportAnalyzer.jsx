// Analytical Report Analyzer - Revolutionary Classifier Integration
// AI-powered analysis of analytical lab reports with advanced pattern recognition

import React, { useState, useEffect } from 'react';
import { 
  FileText, Brain, Settings, Download, Upload, 
  AlertCircle, CheckCircle, Beaker, BarChart3,
  Microscope, FlaskConical, Target, Zap,
  Database, Eye, Layers, Grid, RefreshCw
} from 'lucide-react';

// Advanced Lab Report Processing Engine
const AnalyticalEngine = {
  // Extract data from different lab report formats
  extractReportData: (reportText, labFormat = 'auto') => {
    const extractedData = {
      sampleInfo: extractSampleInformation(reportText),
      analyticalResults: extractAnalyticalResults(reportText),
      qcData: extractQualityControlData(reportText),
      methodology: extractTestMethods(reportText),
      limits: extractRegulatoryLimits(reportText),
      timestamp: new Date()
    };
    
    return {
      ...extractedData,
      confidence: calculateExtractionConfidence(extractedData),
      labFormat: detectLabFormat(reportText)
    };
  },

  // AI-powered hazardous waste analysis
  performHazardAnalysis: async (extractedData) => {
    const analysisPrompt = buildAnalysisPrompt(extractedData);
    
    try {
      // Use Revolutionary Classifier's AI integration
      const response = await fetch('/api/analyze-lab-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
          data: extractedData
        })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const analysis = await response.json();
      
      return {
        ...analysis,
        complianceChecks: performRegulatoryCompliance(extractedData),
        characterization: generateWasteCharacterization(analysis),
        disposalRecommendations: generateDisposalRecommendations(analysis),
        riskAssessment: performRiskAssessment(extractedData)
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Fallback to local analysis
      return performLocalAnalysis(extractedData);
    }
  },

  // Compare against regulatory standards
  checkCompliance: (analytes) => {
    const complianceResults = [];
    
    analytes.forEach(analyte => {
      const regulatory = getRegulatoryThresholds(analyte);
      
      if (regulatory) {
        complianceResults.push({
          analyte: analyte.name,
          casNumber: analyte.casNumber,
          result: analyte.result,
          unit: analyte.unit,
          thresholds: regulatory,
          status: determineComplianceStatus(analyte.result, regulatory),
          exceedanceLevel: calculateExceedanceLevel(analyte.result, regulatory),
          regulatoryFlags: identifyRegulatoryFlags(analyte, regulatory)
        });
      }
    });
    
    return complianceResults;
  }
};

// Main Analytical Report Analyzer Component
const AnalyticalReportAnalyzer = () => {
  const [reports, setReports] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [extractionMode, setExtractionMode] = useState('ai-powered');

  // Handle file upload
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      try {
        let content = '';
        
        if (file.type === 'application/pdf') {
          // PDF processing using Revolutionary Classifier's PDF engine
          content = await processPDFFile(file);
        } else {
          // Text file processing
          content = await readTextFile(file);
        }
        
        const reportData = {
          id: `report-${Date.now()}-${Math.random()}`,
          filename: file.name,
          content,
          uploadedAt: new Date(),
          size: file.size,
          type: file.type,
          extractedData: null,
          analysisResults: null
        };
        
        setReports(prev => [...prev, reportData]);
      } catch (error) {
        console.error('File processing failed:', error);
        alert(`Failed to process ${file.name}: ${error.message}`);
      }
    }
  };

  // Process PDF using Revolutionary Classifier's MuPDF integration
  const processPDFFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('PDF extraction failed');
      }
      
      const result = await response.json();
      return result.text || result.content || '';
    } catch (error) {
      console.error('PDF processing failed:', error);
      return '';
    }
  };

  // Read text file
  const readTextFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  };

  // Analyze all uploaded reports
  const analyzeReports = async () => {
    if (reports.length === 0) {
      alert('Please upload analytical reports first');
      return;
    }

    setIsAnalyzing(true);
    const analysisResults = [];

    try {
      for (const report of reports) {
        // Extract data from report
        const extractedData = AnalyticalEngine.extractReportData(
          report.content, 
          extractionMode
        );
        
        // Perform AI-powered hazard analysis
        const analysis = await AnalyticalEngine.performHazardAnalysis(extractedData);
        
        // Check regulatory compliance
        const compliance = AnalyticalEngine.checkCompliance(extractedData.analyticalResults || []);
        
        const result = {
          reportId: report.id,
          filename: report.filename,
          extractedData,
          analysis,
          compliance,
          timestamp: new Date()
        };
        
        analysisResults.push(result);
        
        // Update report with results
        setReports(prev => prev.map(r => 
          r.id === report.id 
            ? { ...r, extractedData, analysisResults: result }
            : r
        ));
      }
      
      setAnalysisResults(analysisResults);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Remove report
  const removeReport = (reportId) => {
    setReports(prev => prev.filter(r => r.id !== reportId));
    if (selectedReport?.id === reportId) {
      setSelectedReport(null);
    }
  };

  return (
    <div className="analytical-report-analyzer p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="header mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl">
              <Microscope className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analytical Report Analyzer
              </h1>
              <p className="text-gray-600 mt-1">
                AI-powered analytical lab report processing with advanced hazardous waste classification
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">AI Enhanced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="upload-zone mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
          <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-700">Upload Lab Reports</h3>
          <p className="text-gray-600 mb-6">
            Upload PDF or text files containing analytical results (COA, lab reports, test data)
          </p>
          
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            id="report-upload"
          />
          <label
            htmlFor="report-upload"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
          >
            <Upload className="w-5 h-5" />
            Choose Files
          </label>
        </div>
      </div>

      {/* Processing Mode Selection */}
      <div className="mode-selection mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          Processing Mode
        </h3>
        
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="extractionMode"
              value="ai-powered"
              checked={extractionMode === 'ai-powered'}
              onChange={(e) => setExtractionMode(e.target.value)}
              className="text-blue-600"
            />
            <span className="font-medium">AI-Powered</span>
            <span className="text-sm text-gray-600">Advanced AI analysis with classification</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="extractionMode"
              value="pattern-based"
              checked={extractionMode === 'pattern-based'}
              onChange={(e) => setExtractionMode(e.target.value)}
              className="text-blue-600"
            />
            <span className="font-medium">Pattern-Based</span>
            <span className="text-sm text-gray-600">Rule-based extraction and analysis</span>
          </label>
        </div>
      </div>

      {/* Uploaded Reports */}
      {reports.length > 0 && (
        <div className="reports-list mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Uploaded Reports ({reports.length})
            </h3>
            
            <button
              onClick={analyzeReports}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Analyze All Reports
                </>
              )}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onSelect={setSelectedReport}
                onRemove={removeReport}
                isSelected={selectedReport?.id === report.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && analysisResults.length > 0 && (
        <AnalysisResultsDisplay results={analysisResults} />
      )}

      {/* Selected Report Details */}
      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

// Report Card Component
const ReportCard = ({ report, onSelect, onRemove, isSelected }) => {
  const hasResults = !!report.analysisResults;
  
  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={() => onSelect(report)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium truncate" title={report.filename}>
              {report.filename}
            </div>
            <div className="text-sm text-gray-600">
              {Math.round(report.size / 1024)} KB
            </div>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(report.id);
          }}
          className="text-red-400 hover:text-red-600 transition-colors"
        >
          ×
        </button>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasResults ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm text-gray-600">
            {hasResults ? 'Analyzed' : 'Pending analysis'}
          </span>
        </div>
        
        {hasResults && (
          <button className="text-sm text-blue-600 hover:text-blue-800">
            View Results
          </button>
        )}
      </div>
    </div>
  );
};

// Analysis Results Display Component
const AnalysisResultsDisplay = ({ results }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  if (!results || results.length === 0) return null;
  
  const result = results[selectedIndex];
  
  return (
    <div className="analysis-results bg-white border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-green-500" />
          Analysis Results
        </h3>
        
        {results.length > 1 && (
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {results.map((r, index) => (
              <option key={index} value={index}>
                {r.filename}
              </option>
            ))}
          </select>
        )}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Extracted Data Summary */}
        <div className="extracted-data">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Extracted Data
          </h4>
          
          <div className="space-y-3">
            {result.extractedData?.sampleInfo && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">Sample Information</div>
                <div className="text-sm text-gray-600">
                  ID: {result.extractedData.sampleInfo.id || 'Not found'}<br/>
                  Date: {result.extractedData.sampleInfo.date || 'Not found'}<br/>
                  Matrix: {result.extractedData.sampleInfo.matrix || 'Not specified'}
                </div>
              </div>
            )}
            
            {result.extractedData?.analyticalResults && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">Analytical Results</div>
                <div className="max-h-32 overflow-y-auto">
                  {result.extractedData.analyticalResults.slice(0, 5).map((analyte, index) => (
                    <div key={index} className="text-sm text-gray-600 mb-1">
                      {analyte.name}: {analyte.result} {analyte.unit}
                    </div>
                  ))}
                  {result.extractedData.analyticalResults.length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{result.extractedData.analyticalResults.length - 5} more results
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Compliance Summary */}
        <div className="compliance-summary">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Regulatory Compliance
          </h4>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {result.compliance?.map((comp, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  comp.status === 'compliant'
                    ? 'bg-green-50 border-green-500'
                    : comp.status === 'exceeded'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{comp.analyte}</div>
                    <div className="text-xs text-gray-600">
                      Result: {comp.result} {comp.unit}
                    </div>
                    {comp.casNumber && (
                      <div className="text-xs text-gray-500">
                        CAS: {comp.casNumber}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${
                      comp.status === 'compliant' ? 'text-green-600' :
                      comp.status === 'exceeded' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {comp.status.toUpperCase()}
                    </div>
                    {comp.exceedanceLevel > 1 && (
                      <div className="text-xs text-red-600">
                        {comp.exceedanceLevel.toFixed(1)}x limit
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-gray-500 py-4">
                No compliance data available
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Export Options */}
      <div className="mt-6 pt-4 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Analysis completed: {result.timestamp.toLocaleString()}
          </span>
          
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Details Modal
const ReportDetailsModal = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">{report.filename}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Raw Content Preview:</h4>
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {report.content.slice(0, 2000)}
                {report.content.length > 2000 && '...'}
              </pre>
            </div>
          </div>
          
          {report.analysisResults && (
            <div>
              <h4 className="font-semibold mb-2">Analysis Results:</h4>
              <div className="bg-blue-50 p-4 rounded-lg">
                <pre className="text-sm">
                  {JSON.stringify(report.analysisResults, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper functions for data extraction and analysis
function extractSampleInformation(text) {
  // Pattern matching for sample information
  const patterns = {
    id: /(?:sample|lab|report)\s*(?:#|id|number)?\s*:?\s*([A-Z0-9-_]+)/i,
    date: /(?:sample|test|analysis)\s*date\s*:?\s*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    matrix: /(?:matrix|sample\s+type)\s*:?\s*([a-z\s]+)/i
  };
  
  const result = {};
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      result[key] = match[1].trim();
    }
  }
  
  return result;
}

function extractAnalyticalResults(text) {
  // Pattern matching for analytical results
  const results = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Look for patterns like "Chemical Name: 123.45 mg/kg"
    const match = line.match(/([A-Za-z\s,\-()]+):\s*([0-9.]+)\s*([a-z%/]+)/i);
    if (match) {
      results.push({
        name: match[1].trim(),
        result: parseFloat(match[2]),
        unit: match[3].trim(),
        casNumber: extractCASFromLine(line)
      });
    }
  }
  
  return results;
}

function extractCASFromLine(line) {
  const casMatch = line.match(/(\d{1,7}-\d{2}-\d)/);
  return casMatch ? casMatch[1] : null;
}

function extractQualityControlData(text) {
  // Extract QC data (spikes, blanks, duplicates)
  return {
    blanks: [],
    spikes: [],
    duplicates: [],
    surrogates: []
  };
}

function extractTestMethods(text) {
  const methods = [];
  const methodPattern = /(EPA|ASTM|SW)\s*-?\s*(\d+[A-Z]?)/gi;
  let match;
  
  while ((match = methodPattern.exec(text)) !== null) {
    methods.push(`${match[1]} ${match[2]}`);
  }
  
  return [...new Set(methods)]; // Remove duplicates
}

function extractRegulatoryLimits(text) {
  // Extract regulatory limits mentioned in the report
  return {};
}

function calculateExtractionConfidence(data) {
  let score = 0;
  if (data.sampleInfo?.id) score += 20;
  if (data.analyticalResults?.length > 0) score += 40;
  if (data.methodology?.length > 0) score += 20;
  if (data.qcData) score += 20;
  
  return Math.min(score, 100);
}

function detectLabFormat(text) {
  const patterns = {
    testamerica: /testamerica|ta\s*labs?/i,
    pace: /pace\s*analytical/i,
    eurofins: /eurofins/i,
    asl: /analytical\s*solutions/i
  };
  
  for (const [lab, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) return lab;
  }
  
  return 'unknown';
}

function buildAnalysisPrompt(extractedData) {
  return `
    Analyze this laboratory analytical data for hazardous waste classification:
    
    Sample Information:
    ${JSON.stringify(extractedData.sampleInfo, null, 2)}
    
    Analytical Results:
    ${extractedData.analyticalResults?.map(a => 
      `- ${a.name}: ${a.result} ${a.unit}${a.casNumber ? ` (CAS: ${a.casNumber})` : ''}`
    ).join('\n') || 'No analytical results found'}
    
    Test Methods:
    ${extractedData.methodology?.join(', ') || 'No methods specified'}
    
    Perform comprehensive hazardous waste analysis:
    1. Identify all hazardous constituents
    2. Determine RCRA characteristic codes (D001-D043)
    3. Check for listed waste codes (F, K, P, U)
    4. Assess physical state and form code
    5. Evaluate DOT shipping requirements
    6. Generate disposal recommendations
    7. Flag regulatory compliance issues
    
    Return detailed analysis in JSON format.
  `;
}

function performLocalAnalysis(extractedData) {
  // Fallback local analysis when AI service is unavailable
  return {
    hazardousConstituents: [],
    rcraCharacteristics: [],
    listedWasteCodes: [],
    physicalState: 'unknown',
    recommendedDisposal: 'Requires professional evaluation',
    riskLevel: 'medium',
    regulatoryFlags: []
  };
}

function performRegulatoryCompliance(extractedData) {
  // Check analytical results against regulatory thresholds
  return extractedData.analyticalResults?.map(analyte => ({
    analyte: analyte.name,
    result: analyte.result,
    unit: analyte.unit,
    status: 'unknown',
    threshold: null
  })) || [];
}

function generateWasteCharacterization(analysis) {
  return {
    physicalState: analysis.physicalState || 'solid',
    hazardClasses: analysis.hazardClasses || [],
    federalCodes: analysis.rcraCharacteristics || [],
    stateCodes: [],
    formCode: 'XX',
    shippingName: analysis.recommendedShippingName || 'HAZARDOUS WASTE, SOLID, N.O.S.'
  };
}

function generateDisposalRecommendations(analysis) {
  return {
    method: 'incineration',
    facility: 'RCRA-permitted',
    notes: 'Professional evaluation recommended'
  };
}

function performRiskAssessment(extractedData) {
  return {
    level: 'medium',
    factors: ['unknown composition'],
    recommendations: ['Professional evaluation required']
  };
}

function getRegulatoryThresholds(analyte) {
  // This would normally query a regulatory database
  return null;
}

function determineComplianceStatus(result, regulatory) {
  return 'unknown';
}

function calculateExceedanceLevel(result, regulatory) {
  return 1;
}

function identifyRegulatoryFlags(analyte, regulatory) {
  return [];
}

export default AnalyticalReportAnalyzer;