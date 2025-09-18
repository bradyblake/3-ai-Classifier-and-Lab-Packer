import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Calendar,
  Building,
  FlaskConical,
  Zap,
  Database,
  Filter,
  BarChart3
} from 'lucide-react';
// No need to import pdfjs-dist at the top level since we'll dynamically import it

// Lab Report Analyzer Component - Fixed syntax and added PDF support
const LabReportAnalyzer = () => {
  const [uploadedReports, setUploadedReports] = useState([]);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filters, setFilters] = useState({
    hazardous: 'all',
    testType: 'all',
    location: 'all'
  });
  const fileInputRef = useRef(null);

  // Texas State Waste Codes and Form Codes
  const TEXAS_WASTE_CODES = {
    // Hazardous Waste Form Codes
    '00005': { description: 'Ignitable Hazardous Waste', classification: 'H' },
    '00006': { description: 'Corrosive Hazardous Waste', classification: 'H' },
    '00007': { description: 'Reactive Hazardous Waste', classification: 'H' },
    '00008': { description: 'EP Toxic Hazardous Waste', classification: 'H' },
    '00009': { description: 'Acute Hazardous Waste', classification: 'H' },
    '00010': { description: 'Other Hazardous Waste', classification: 'H' },
    
    // Class 1 Industrial Waste Form Codes
    '00100': { description: 'Class 1 Industrial Solid Waste', classification: '1' },
    '00101': { description: 'Class 1 Containerized Liquid', classification: '1' },
    '00102': { description: 'Class 1 Bulk Liquid', classification: '1' },
    
    // Class 2 Industrial Waste Form Codes  
    '00200': { description: 'Class 2 Industrial Solid Waste', classification: '2' },
    '00201': { description: 'Class 2 Containerized Liquid', classification: '2' },
    '00202': { description: 'Class 2 Bulk Liquid', classification: '2' },
    
    // Class 3 Industrial Waste Form Codes
    '00300': { description: 'Class 3 Industrial Solid Waste', classification: '3' },
    '00301': { description: 'Class 3 Containerized Liquid', classification: '3' },
    '00302': { description: 'Class 3 Bulk Liquid', classification: '3' }
  };

  // RCRA D Codes and limits
  const RCRA_D_CODES = {
    D004: { name: 'Arsenic', limit: 5.0, units: 'mg/L' },
    D005: { name: 'Barium', limit: 100.0, units: 'mg/L' },
    D006: { name: 'Cadmium', limit: 1.0, units: 'mg/L' },
    D007: { name: 'Chromium', limit: 5.0, units: 'mg/L' },
    D008: { name: 'Lead', limit: 5.0, units: 'mg/L' },
    D009: { name: 'Mercury', limit: 0.2, units: 'mg/L' },
    D010: { name: 'Selenium', limit: 1.0, units: 'mg/L' },
    D011: { name: 'Silver', limit: 5.0, units: 'mg/L' },
    D018: { name: 'Benzene', limit: 0.5, units: 'mg/L' },
    D019: { name: 'Carbon tetrachloride', limit: 0.5, units: 'mg/L' },
    D020: { name: 'Chlordane', limit: 0.03, units: 'mg/L' },
    D021: { name: 'Chlorobenzene', limit: 100.0, units: 'mg/L' },
    D022: { name: 'Chloroform', limit: 6.0, units: 'mg/L' },
    D023: { name: 'o-Cresol', limit: 200.0, units: 'mg/L' },
    D024: { name: 'm-Cresol', limit: 200.0, units: 'mg/L' },
    D025: { name: 'p-Cresol', limit: 200.0, units: 'mg/L' },
    D026: { name: 'Cresol', limit: 200.0, units: 'mg/L' },
    D027: { name: '1,4-Dichlorobenzene', limit: 7.5, units: 'mg/L' },
    D028: { name: '1,2-Dichloroethane', limit: 0.5, units: 'mg/L' },
    D029: { name: '1,1-Dichloroethylene', limit: 0.7, units: 'mg/L' },
    D030: { name: '2,4-Dinitrotoluene', limit: 0.13, units: 'mg/L' },
    D031: { name: 'Heptachlor', limit: 0.008, units: 'mg/L' },
    D032: { name: 'Hexachlorobenzene', limit: 0.13, units: 'mg/L' },
    D033: { name: 'Hexachlorobutadiene', limit: 0.5, units: 'mg/L' },
    D034: { name: 'Hexachloroethane', limit: 3.0, units: 'mg/L' },
    D035: { name: 'Methyl ethyl ketone', limit: 200.0, units: 'mg/L' },
    D036: { name: 'Nitrobenzene', limit: 2.0, units: 'mg/L' },
    D037: { name: 'Pentachlorophenol', limit: 100.0, units: 'mg/L' },
    D038: { name: 'Pyridine', limit: 5.0, units: 'mg/L' },
    D039: { name: 'Tetrachloroethylene', limit: 0.7, units: 'mg/L' },
    D040: { name: 'Trichloroethylene', limit: 0.5, units: 'mg/L' },
    D041: { name: '2,4,5-Trichlorophenol', limit: 400.0, units: 'mg/L' },
    D042: { name: '2,4,6-Trichlorophenol', limit: 2.0, units: 'mg/L' },
    D043: { name: 'Vinyl chloride', limit: 0.2, units: 'mg/L' }
  };

  // Texas Class 1 Industrial Waste Limits (30 TAC 335.521)
  // Based on Maximum Leachable Concentrations for Constituents of Concern
  const TEXAS_CLASS1_LIMITS = {
    // Metals (TCLP extraction - mg/L)
    'Arsenic': { limit: 0.5, units: 'mg/L', testMethod: 'TCLP' },
    'Barium': { limit: 10.0, units: 'mg/L', testMethod: 'TCLP' },
    'Cadmium': { limit: 0.1, units: 'mg/L', testMethod: 'TCLP' },
    'Chromium': { limit: 0.5, units: 'mg/L', testMethod: 'TCLP' },
    'Lead': { limit: 0.5, units: 'mg/L', testMethod: 'TCLP' },
    'Mercury': { limit: 0.02, units: 'mg/L', testMethod: 'TCLP' },
    'Selenium': { limit: 0.1, units: 'mg/L', testMethod: 'TCLP' },
    'Silver': { limit: 0.5, units: 'mg/L', testMethod: 'TCLP' },
    
    // Organics (TCLP extraction - mg/L)
    'Benzene': { limit: 0.005, units: 'mg/L', testMethod: 'TCLP' },
    'Toluene': { limit: 1.0, units: 'mg/L', testMethod: 'TCLP' },
    'Ethylbenzene': { limit: 0.7, units: 'mg/L', testMethod: 'TCLP' },
    'Xylenes': { limit: 10.0, units: 'mg/L', testMethod: 'TCLP' },
    'Chlorobenzene': { limit: 10.0, units: 'mg/L', testMethod: 'TCLP' },
    'Chloroform': { limit: 0.6, units: 'mg/L', testMethod: 'TCLP' },
    'Methyl ethyl ketone': { limit: 20.0, units: 'mg/L', testMethod: 'TCLP' },
    'Vinyl chloride': { limit: 0.02, units: 'mg/L', testMethod: 'TCLP' },
    
    // Total concentrations (mg/kg solid or mg/L liquid)
    'Total Petroleum Hydrocarbons': { limit: 1500.0, units: 'mg/kg', testMethod: 'Total' },
    'PCBs': { limit: 0.5, units: 'mg/kg', testMethod: 'Total' },
    
    // pH ranges (Class 1 if outside these ranges)
    'pH_low': { limit: 5.0, units: 'pH units', testMethod: 'pH' },
    'pH_high': { limit: 12.5, units: 'pH units', testMethod: 'pH' }
  };

  const handleFileUpload = (files) => {
    const newReports = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      uploadDate: new Date(),
      status: 'uploaded',
      analysisResults: null
    }));

    setUploadedReports(prev => [...prev, ...newReports]);
  };

  const analyzeReport = async (report) => {
    setIsAnalyzing(true);
    setSelectedReport(report);

    try {
      // Parse report content using actual file data
      const analysisData = await parseLabReport(report.file);
      
      // Check if parsing failed
      if (analysisData.error) {
        // Update report status to show error
        setUploadedReports(prev => 
          prev.map(r => 
            r.id === report.id 
              ? { ...r, status: 'error', error: analysisData.error }
              : r
          )
        );
        return;
      }
      
      // Check if no analytes were found
      if (!analysisData.analytes || analysisData.analytes.length === 0) {
        setUploadedReports(prev => 
          prev.map(r => 
            r.id === report.id 
              ? { ...r, status: 'error', error: 'No analytical data found in the uploaded file.' }
              : r
          )
        );
        return;
      }
      
      const rcraCodes = determineRcraCodes(analysisData.analytes);
      const texasWasteCode = determineTexasWasteCode(analysisData.analytes, rcraCodes);
      
      const analysisResult = {
        reportId: report.id,
        testTypes: analysisData.testTypes,
        analytes: analysisData.analytes,
        rcraCodes: rcraCodes,
        texasCompliance: checkTexasCompliance(analysisData.analytes),
        texasWasteCode: texasWasteCode,
        hazardousClassification: determineHazardousClassification(analysisData.analytes),
        recommendations: generateRecommendations(analysisData.analytes),
        analyzedDate: new Date()
      };

      setAnalysisResults(prev => [...prev, analysisResult]);
      
      // Update report status
      setUploadedReports(prev => 
        prev.map(r => 
          r.id === report.id 
            ? { ...r, status: 'analyzed', analysisResults: analysisResult }
            : r
        )
      );

    } catch (error) {
      console.error('Analysis error:', error);
      // Update report status to show error
      setUploadedReports(prev => 
        prev.map(r => 
          r.id === report.id 
            ? { ...r, status: 'error', error: `Failed to analyze report: ${error.message}` }
            : r
        )
      );
    } finally {
      setIsAnalyzing(false);
      setSelectedReport(null);
    }
  };

  const parsePdfContent = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Use the same import path as SDS Analyzer
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      return fullText;
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  };

  const parseLabReport = async (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        let content = '';
        
        // Handle PDF files
        if (file.type === 'application/pdf') {
          content = await parsePdfContent(file);
        } else {
          // Handle text and CSV files
          const reader = new FileReader();
          reader.onload = (e) => {
            content = e.target.result;
            processFileContent(content, resolve, reject);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
          return; // Exit early for non-PDF files
        }
        
        // Process PDF content
        processFileContent(content, resolve, reject);
        
      } catch (error) {
        reject(error);
      }
    });
  };

  const processFileContent = (content, resolve, reject) => {
    try {
      const analytes = [];
          
          // Enhanced parsing patterns for more comprehensive lab report formats
          const patterns = [
            // Enhanced patterns to capture more formats and table structures
            // Format: "Parameter    Result    Units    Method    DL"
            { regex: /Arsenic[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Arsenic', method: 'EPA 6020' },
            { regex: /Barium[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Barium', method: 'EPA 6020' },
            { regex: /Cadmium[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Cadmium', method: 'EPA 6020' },
            { regex: /Chromium[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Chromium', method: 'EPA 6020' },
            { regex: /Lead[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Lead', method: 'EPA 6020' },
            { regex: /Mercury[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Mercury', method: 'EPA 7470A' },
            { regex: /Selenium[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Selenium', method: 'EPA 6020' },
            { regex: /Silver[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Silver', method: 'EPA 6020' },
            
            // Volatile organics
            { regex: /Benzene[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Benzene', method: 'EPA 8260' },
            { regex: /Toluene[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Toluene', method: 'EPA 8260' },
            { regex: /Ethylbenzene[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Ethylbenzene', method: 'EPA 8260' },
            { regex: /(Xylene|Total Xylenes?)[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Xylenes', method: 'EPA 8260' },
            { regex: /Chloroform[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Chloroform', method: 'EPA 8260' },
            { regex: /(Methyl ethyl ketone|MEK)[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Methyl ethyl ketone', method: 'EPA 8260' },
            { regex: /Vinyl chloride[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/L|ug\/L|ppm|ppb)/gi, name: 'Vinyl chloride', method: 'EPA 8260' },
            
            // TPH patterns
            { regex: /(TPH|Total Petroleum Hydrocarbons?)[:\s\|]*(?:<|ND)?[\s\|]*([<]?)[\s\|]*([0-9]+\.?[0-9]*)\s*(mg\/kg|mg\/L|ppm|ppb)/gi, name: 'Total Petroleum Hydrocarbons', method: 'EPA 8015' }
          ];
          
          // Parse content for each pattern
          patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(content)) !== null) {
              const isNonDetect = match[1] === '<' || content.includes('ND') || content.includes('Non-detect');
              let value = parseFloat(match[2] || match[3]); // handle different capture group positions
              const units = match[3] || match[4];
              
              // Convert units to standard format (mg/L or mg/kg)
              if (units && (units.toLowerCase() === 'ug/l' || units.toLowerCase() === 'ppb')) {
                value = value / 1000; // Convert ug/L to mg/L
              }
              
              if (!isNaN(value)) {
                analytes.push({
                  name: pattern.name,
                  value: isNonDetect ? 0 : value,
                  units: pattern.name === 'Total Petroleum Hydrocarbons' ? 'mg/kg' : 'mg/L',
                  method: pattern.method,
                  detectLimit: isNonDetect ? value : (value * 0.1), // Reasonable detection limit estimate
                  nonDetect: isNonDetect
                });
              }
            }
          });
          
          // Try to parse CSV format if no matches found in text format
          if (analytes.length === 0 && (content.includes(',') || content.includes('\t'))) {
            const lines = content.split('\n');
            const headers = lines[0].toLowerCase().split(/[,\t]/);
            
            // Find column indices for parameter, result, units
            const paramIndex = headers.findIndex(h => h.includes('parameter') || h.includes('analyte') || h.includes('compound'));
            const resultIndex = headers.findIndex(h => h.includes('result') || h.includes('concentration') || h.includes('value'));
            const unitsIndex = headers.findIndex(h => h.includes('unit') || h.includes('mg/l') || h.includes('mg/kg'));
            
            if (paramIndex !== -1 && resultIndex !== -1) {
              lines.slice(1).forEach(line => {
                const cols = line.split(/[,\t]/);
                if (cols.length > Math.max(paramIndex, resultIndex)) {
                  const param = cols[paramIndex]?.trim().toLowerCase();
                  const result = cols[resultIndex]?.trim();
                  const units = cols[unitsIndex]?.trim() || 'mg/L';
                  
                  // Match against known analytes
                  const knownAnalytes = ['arsenic', 'barium', 'cadmium', 'chromium', 'lead', 'mercury', 'selenium', 'silver', 'benzene', 'toluene'];
                  const matchedAnalyte = knownAnalytes.find(a => param?.includes(a));
                  
                  if (matchedAnalyte && result && !isNaN(parseFloat(result.replace('<', '')))) {
                    const isNonDetect = result.includes('<') || result.includes('ND');
                    const value = parseFloat(result.replace('<', '').replace('ND', '0'));
                    
                    analytes.push({
                      name: matchedAnalyte.charAt(0).toUpperCase() + matchedAnalyte.slice(1),
                      value: isNonDetect ? 0 : value,
                      units: units,
                      method: matchedAnalyte.includes('mercury') ? 'EPA 7470A' : 'EPA 6020',
                      detectLimit: isNonDetect ? value : (value * 0.1),
                      nonDetect: isNonDetect
                    });
                  }
                }
              });
            }
          }
          
          // Only use fallback data if absolutely no analytes were extracted
          if (analytes.length === 0) {
            console.warn('No analyte data could be extracted from the uploaded file. Please ensure the file contains lab analysis results in a supported format.');
            // Instead of generating mock data, inform the user that no data could be extracted
            resolve({
              testTypes: [],
              analytes: [],
              error: 'No analytical data could be extracted from this file. Please ensure the file contains lab report data with analyte names, concentrations, and units.'
            });
            return;
          }
          
          // Remove duplicates based on analyte name (keep the first occurrence)
          const uniqueAnalytes = analytes.filter((analyte, index, self) => 
            index === self.findIndex((a) => a.name === analyte.name)
          );
          
          // Determine test types based on analytes found
          const testTypes = [];
          if (uniqueAnalytes.some(a => ['Arsenic', 'Barium', 'Cadmium', 'Chromium', 'Lead', 'Mercury', 'Selenium', 'Silver'].includes(a.name))) {
            testTypes.push('TCLP RCRA 8 Metals');
          }
          if (uniqueAnalytes.some(a => ['Benzene', 'Toluene', 'Ethylbenzene', 'Xylenes', 'Chloroform', 'Vinyl chloride'].includes(a.name))) {
            testTypes.push('TCLP Volatiles');
          }
          if (uniqueAnalytes.some(a => a.name === 'Total Petroleum Hydrocarbons')) {
            testTypes.push('TPH');
          }
          
          resolve({ testTypes, analytes: uniqueAnalytes });
    } catch (error) {
      console.error('Error in processFileContent:', error);
      reject(error);
    }
  };

  const determineRcraCodes = (analytes) => {
    const exceededCodes = [];
    
    analytes.forEach(analyte => {
      Object.entries(RCRA_D_CODES).forEach(([code, standard]) => {
        if (analyte.name === standard.name && analyte.value > standard.limit) {
          exceededCodes.push({
            code,
            analyte: analyte.name,
            value: analyte.value,
            limit: standard.limit,
            units: standard.units,
            exceedance: ((analyte.value - standard.limit) / standard.limit * 100).toFixed(1)
          });
        }
      });
    });

    return exceededCodes;
  };

  const checkTexasCompliance = (analytes) => {
    const texasIssues = [];
    
    analytes.forEach(analyte => {
      const texasLimit = TEXAS_CLASS1_LIMITS[analyte.name];
      if (texasLimit && analyte.value > texasLimit.limit) {
        texasIssues.push({
          analyte: analyte.name,
          value: analyte.value,
          limit: texasLimit.limit,
          units: texasLimit.units,
          testMethod: texasLimit.testMethod,
          exceedance: ((analyte.value - texasLimit.limit) / texasLimit.limit * 100).toFixed(1),
          classification: 'Class 1'
        });
      }
    });

    return texasIssues;
  };

  const determineTexasWasteCode = (analytes, rcraCodes) => {
    // Check if it's hazardous waste (RCRA codes present)
    if (rcraCodes.length > 0) {
      // EP Toxic Hazardous Waste is most common for TCLP failures
      return {
        formCode: '00008',
        description: 'EP Toxic Hazardous Waste',
        classification: 'H',
        reason: `RCRA characteristic waste (${rcraCodes.map(c => c.code).join(', ')})`,
        sequenceNumber: '[Generator Assigned]'
      };
    }
    
    // Check for TPH > 1500 ppm (mg/kg) - automatic Class 1 in Texas
    const tphAnalyte = analytes.find(a => a.name === 'Total Petroleum Hydrocarbons');
    if (tphAnalyte && tphAnalyte.value > 1500) {
      // Determine if solid or liquid based on units
      const isLiquid = analytes.some(a => a.units === 'mg/L' && a.value > 0);
      return {
        formCode: isLiquid ? '00101' : '00100',
        description: isLiquid ? 'Class 1 Containerized Liquid' : 'Class 1 Industrial Solid Waste',
        classification: '1',
        reason: `TPH exceeds 1500 ppm (${tphAnalyte.value} mg/kg)`,
        sequenceNumber: '[Generator Assigned]'
      };
    }
    
    // Check Texas limits for Class 1 or Class 2 determination
    const texasExceedances = analytes.filter(analyte => {
      const texasLimit = TEXAS_CLASS1_LIMITS[analyte.name];
      return texasLimit && analyte.value > texasLimit.limit;
    });
    
    if (texasExceedances.length > 0) {
      // Multiple exceedances or significant exceedances = Class 1
      const hasSignificantExceedance = texasExceedances.some(a => {
        const texasLimit = TEXAS_CLASS1_LIMITS[a.name];
        return a.value > texasLimit.limit * 10;
      });
      
      if (hasSignificantExceedance || texasExceedances.length > 2) {
        const isLiquid = analytes.some(a => a.units === 'mg/L' && a.value > 0);
        return {
          formCode: isLiquid ? '00101' : '00100',
          description: isLiquid ? 'Class 1 Containerized Liquid' : 'Class 1 Industrial Solid Waste',
          classification: '1',
          reason: `Exceeds Texas regulatory limits for ${texasExceedances.map(e => e.name).join(', ')}`,
          sequenceNumber: '[Generator Assigned]'
        };
      } else {
        // Minor exceedances = Class 2
        const isLiquid = analytes.some(a => a.units === 'mg/L' && a.value > 0);
        return {
          formCode: isLiquid ? '00201' : '00200',
          description: isLiquid ? 'Class 2 Containerized Liquid' : 'Class 2 Industrial Solid Waste',
          classification: '2',
          reason: `Minor exceedances of Texas limits`,
          sequenceNumber: '[Generator Assigned]'
        };
      }
    }
    
    // No exceedances = Class 3 (non-hazardous)
    const isLiquid = analytes.some(a => a.units === 'mg/L' && a.value > 0);
    return {
      formCode: isLiquid ? '00301' : '00300',
      description: isLiquid ? 'Class 3 Containerized Liquid' : 'Class 3 Industrial Solid Waste',
      classification: '3',
      reason: 'No regulatory exceedances',
      sequenceNumber: '[Generator Assigned]'
    };
  };

  const determineHazardousClassification = (analytes) => {
    const rcraCodes = determineRcraCodes(analytes);
    const texasIssues = checkTexasCompliance(analytes);
    
    if (rcraCodes.length > 0) {
      return {
        classification: 'RCRA Hazardous Waste',
        severity: 'High',
        codes: rcraCodes.map(c => c.code),
        description: `Material exhibits characteristic of toxicity for ${rcraCodes.map(c => c.analyte).join(', ')}`
      };
    } else if (texasIssues.length > 0) {
      return {
        classification: 'Texas Regulated Waste',
        severity: 'Medium',
        codes: ['Texas State'],
        description: `Exceeds Texas regulatory limits for ${texasIssues.map(i => i.analyte).join(', ')}`
      };
    } else {
      return {
        classification: 'Non-Hazardous',
        severity: 'Low',
        codes: [],
        description: 'Material does not exceed regulatory limits'
      };
    }
  };

  const generateRecommendations = (analytes) => {
    const rcraCodes = determineRcraCodes(analytes);
    const classification = determineHazardousClassification(analytes);
    
    const recommendations = [];
    
    if (rcraCodes.length > 0) {
      recommendations.push({
        type: 'Disposal',
        priority: 'High',
        action: 'Material must be disposed at RCRA-permitted hazardous waste facility',
        details: `EPA Waste Codes: ${rcraCodes.map(c => c.code).join(', ')}`
      });
      
      recommendations.push({
        type: 'Transportation',
        priority: 'High',
        action: 'DOT hazardous materials shipping requirements apply',
        details: 'Proper shipping name, hazard class, and packaging required'
      });
    }
    
    if (classification.severity === 'Medium') {
      recommendations.push({
        type: 'Treatment',
        priority: 'Medium',
        action: 'Consider treatment to reduce contaminant levels',
        details: 'Stabilization or other treatment may allow non-hazardous disposal'
      });
    }
    
    recommendations.push({
      type: 'Documentation',
      priority: 'Medium',
      action: 'Maintain chain of custody and analytical records',
      details: 'Required for regulatory compliance and waste tracking'
    });

    return recommendations;
  };

  const exportResults = (result) => {
    const exportData = {
      analysisDate: result.analyzedDate,
      testTypes: result.testTypes,
      analytes: result.analytes,
      rcraCodes: result.rcraCodes,
      texasCompliance: result.texasCompliance,
      classification: result.hazardousClassification,
      recommendations: result.recommendations
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lab_analysis_${result.reportId}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const downloadSampleReport = () => {
    const sampleReportContent = `LABORATORY ANALYSIS REPORT
=============================

Sample ID: DEMO-2025-001
Client: Environmental Services Demo
Date Collected: 2025-01-15
Date Analyzed: 2025-01-16
Analysis Method: EPA TCLP

TCLP METALS ANALYSIS
====================
Parameter         Result    Units    Detection Limit    Method
Arsenic          2.3       mg/L     0.1               EPA 6020
Barium           125.5     mg/L     1.0               EPA 6020  
Cadmium          0.8       mg/L     0.1               EPA 6020
Chromium         6.2       mg/L     1.0               EPA 6020
Lead             3.1       mg/L     0.5               EPA 6020
Mercury          0.15      mg/L     0.02              EPA 7470A
Selenium         1.5       mg/L     0.5               EPA 6020
Silver           4.8       mg/L     0.5               EPA 6020

TCLP VOLATILE ORGANICS
======================
Parameter         Result    Units    Detection Limit    Method
Benzene          0.75      mg/L     0.01              EPA 8260
Toluene          0.08      mg/L     0.01              EPA 8260
Ethylbenzene     <0.01     mg/L     0.01              EPA 8260
Total Xylenes    <0.01     mg/L     0.01              EPA 8260

TOTAL PETROLEUM HYDROCARBONS
============================
Parameter         Result    Units    Detection Limit    Method
TPH              1825      mg/kg    10                EPA 8015

NOTES:
- < indicates result below detection limit
- All TCLP extractions performed according to EPA Method 1311
- Sample analyzed within required holding times
- QA/QC data available upon request

END OF REPORT`;

    const dataBlob = new Blob([sampleReportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_lab_report.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredResults = analysisResults.filter(result => {
    if (filters.hazardous !== 'all') {
      const isHazardous = result.hazardousClassification.classification !== 'Non-Hazardous';
      if (filters.hazardous === 'hazardous' && !isHazardous) return false;
      if (filters.hazardous === 'non-hazardous' && isHazardous) return false;
    }
    return true;
  });

  return (
    <div className="lab-report-analyzer p-6 bg-white rounded-lg">
      <div className="header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FlaskConical className="mr-2 text-blue-600" />
              Lab Report Analyzer
            </h2>
            <p className="text-gray-600 mt-1">
              Analyze laboratory reports for RCRA compliance and Texas regulatory limits
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Reports
            </button>
            
            <button
              onClick={downloadSampleReport}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Sample Report
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.csv"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      {/* Upload Area */}
      <div className="upload-section mb-6">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          onDrop={(e) => {
            e.preventDefault();
            handleFileUpload(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drop lab reports here or click Upload Reports
          </p>
          <p className="text-sm text-gray-500 mb-2">
            Supports PDF, TXT, and CSV formats
          </p>
          <p className="text-xs text-gray-400">
            Download the sample report to see the expected format for text files.
          </p>
        </div>
      </div>

      {/* Uploaded Reports */}
      {uploadedReports.length > 0 && (
        <div className="reports-section mb-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Reports</h3>
          <div className="grid gap-4">
            {uploadedReports.map(report => (
              <div key={report.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-gray-500">
                      {(report.size / 1024).toFixed(1)} KB • {report.uploadDate.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    report.status === 'uploaded' ? 'bg-gray-100 text-gray-700' :
                    report.status === 'analyzed' ? 'bg-green-100 text-green-700' :
                    report.status === 'error' ? 'bg-red-100 text-red-700' : ''
                  }`}>
                    {report.status}
                  </div>
                  
                  {report.status === 'uploaded' && (
                    <button
                      onClick={() => analyzeReport(report)}
                      disabled={isAnalyzing}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isAnalyzing && selectedReport?.id === report.id ? 'Analyzing...' : 'Analyze'}
                    </button>
                  )}
                  
                  {report.status === 'error' && (
                    <button
                      onClick={() => analyzeReport(report)}
                      disabled={isAnalyzing}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      Retry
                    </button>
                  )}
                </div>
                
                {/* Error message display */}
                {report.status === 'error' && report.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <div className="flex items-start">
                      <XCircle className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Analysis Failed</div>
                        <div>{report.error}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {analysisResults.length > 0 && (
        <div className="filters-section mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Filter className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={filters.hazardous}
              onChange={(e) => setFilters(prev => ({ ...prev, hazardous: e.target.value }))}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Classifications</option>
              <option value="hazardous">Hazardous Only</option>
              <option value="non-hazardous">Non-Hazardous Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {filteredResults.length > 0 && (
        <div className="results-section">
          <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
          <div className="space-y-6">
            {filteredResults.map(result => (
              <div key={result.reportId} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      result.hazardousClassification.severity === 'High' ? 'bg-red-500' :
                      result.hazardousClassification.severity === 'Medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}></div>
                    <div>
                      <div className="font-semibold">{result.hazardousClassification.classification}</div>
                      <div className="text-sm text-gray-500">
                        Analyzed {result.analyzedDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => exportResults(result)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* RCRA Codes */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
                      RCRA D Codes ({result.rcraCodes.length})
                    </h4>
                    {result.rcraCodes.length > 0 ? (
                      <div className="space-y-2">
                        {result.rcraCodes.map((code, idx) => (
                          <div key={idx} className="bg-red-50 p-2 rounded text-sm">
                            <div className="font-medium text-red-700">{code.code}</div>
                            <div className="text-red-600">
                              {code.analyte}: {code.value} {code.units} (Limit: {code.limit} {code.units})
                            </div>
                            <div className="text-red-500">
                              Exceeds by {code.exceedance}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-green-600 text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        No RCRA limits exceeded
                      </div>
                    )}
                  </div>

                  {/* Texas Compliance */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center">
                      <Building className="w-4 h-4 mr-2 text-yellow-600" />
                      Texas Compliance ({result.texasCompliance.length} issues)
                    </h4>
                    {result.texasCompliance.length > 0 ? (
                      <div className="space-y-2">
                        {result.texasCompliance.map((issue, idx) => (
                          <div key={idx} className="bg-yellow-50 p-2 rounded text-sm">
                            <div className="font-medium text-yellow-700">{issue.analyte}</div>
                            <div className="text-yellow-600">
                              {issue.value} {issue.units} (Limit: {issue.limit} {issue.units})
                            </div>
                            <div className="text-yellow-500">
                              Exceeds by {issue.exceedance}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-green-600 text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Texas limits compliant
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-blue-700">{rec.type}</div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            rec.priority === 'High' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {rec.priority}
                          </div>
                        </div>
                        <div className="text-sm text-blue-600 mb-1">{rec.action}</div>
                        <div className="text-xs text-blue-500">{rec.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Zap className="w-6 h-6 text-blue-600 mr-2 animate-pulse" />
              <h3 className="text-lg font-semibold">Analyzing Report</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                Parsing laboratory data...
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                Checking RCRA D codes...
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                Verifying Texas compliance...
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
                Generating recommendations...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabReportAnalyzer;