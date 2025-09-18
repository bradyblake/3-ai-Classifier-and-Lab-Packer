import React, { useState, useEffect } from 'react';
import {
  Edit3,
  Save,
  X,
  AlertTriangle,
  FileText,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import PDFViewer from './PDFViewer';

const ManualOverridePanel = ({ 
  result, 
  onOverride, 
  onReanalyze, 
  onViewSDSSection,
  fullText,
  pdfFile 
}) => {
  console.log('🔧 ManualOverridePanel rendered with:', {
    result: !!result,
    resultProduct: result?.product,
    pdfFile: !!pdfFile,
    pdfFileName: pdfFile?.name,
    isModalContext: !!result && !!result.product
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [hasUnknownData, setHasUnknownData] = useState(false);
  const [unknownFields, setUnknownFields] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentSectionKey, setCurrentSectionKey] = useState(null);
  const [currentFieldKey, setCurrentFieldKey] = useState(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [completedFields, setCompletedFields] = useState(new Set());
  const [constituents, setConstituents] = useState([{ name: '', percentage: '', cas: '' }]);
  const [flashPointUnit, setFlashPointUnit] = useState('F');

  // SDS Section Mapping - Comprehensive Editable Fields
  const sdsSections = {
    section1: {
      title: "Section 1: Identification",
      fields: [
        { key: 'productName', label: 'Product Name', required: true },
        { key: 'name', label: 'Product Name', required: true }, // Alternative field name
        { key: 'manufacturer', label: 'Manufacturer', required: false }
      ]
    },
    section3: {
      title: "Section 3: Composition",
      fields: [
        { key: 'composition', label: 'Chemical Composition', type: 'composition', required: true }
      ]
    },
    section9: {
      title: "Section 9: Physical Properties",
      fields: [
        { key: 'physicalState', label: 'Physical State', required: true },
        { key: 'state', label: 'Physical State', required: true }, // Alternative field name
        { key: 'flashPoint', label: 'Flash Point', required: true },
        { key: 'pH', label: 'pH Range', required: true },
        { key: 'density', label: 'Density', required: false },
        { key: 'boilingPoint', label: 'Boiling Point (°F)', required: false },
        { key: 'meltingPoint', label: 'Melting Point (°F)', required: false }
      ]
    },
    section14: {
      title: "Section 14: Transport",
      fields: [
        { key: 'unNumber', label: 'UN Number', required: true },
        { key: 'hazardClass', label: 'Hazard Class', required: false },
        { key: 'properShippingName', label: 'Proper Shipping Name', required: false },
        { key: 'packingGroup', label: 'Packing Group', required: false }
      ]
    },
    classification: {
      title: "Classification Results",
      displayOnly: true,  // Mark as display-only section
      fields: [
        { key: 'hazardous', label: 'Hazardous', required: false, readOnly: true },
        { key: 'waste_codes', label: 'Federal Waste Codes', type: 'array', required: false, readOnly: true },
        { key: 'state_classification', label: 'State Classification', required: false, readOnly: true },
        { key: 'state_form_code', label: 'State Form Code', required: false, readOnly: true },
        { key: 'final_classification', label: 'Final Classification', required: false, readOnly: true }
      ]
    }
  };

  useEffect(() => {
    // Check for essential required fields only
    const unknown = [];
    
    // Essential fields to check
    const essentialFields = [
      'productName', 'name', 'product',  // Product name variants
      'manufacturer',                     // Manufacturer
      'composition',                      // Chemical composition
      'physicalState', 'state',          // Physical state variants  
      'pH',                              // pH value
      'flashPoint',                      // Flash point
      'density', 'boilingPoint', 'meltingPoint', // Additional physical properties
      'unNumber', 'hazardClass', 'properShippingName', 'packingGroup', // DOT fields
      'hazardous', 'waste_codes', 'state_classification', 'state_form_code', 'final_classification' // Classification fields
    ];

    const checkEssentialFields = (obj, path = '') => {
      if (!obj) return;
      
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Only check essential fields
        if (essentialFields.includes(key)) {
          if (typeof value === 'string') {
            const valueLower = value.toLowerCase().trim();
            if (valueLower === 'unknown' || 
                valueLower === 'unknown product' || 
                valueLower === 'unknown material' ||
                valueLower === 'n/a' ||
                valueLower === '' ||
                valueLower === 'not specified' ||
                valueLower === 'not available') {
              unknown.push({
                path: currentPath,
                key,
                value,
                section: determineSectionForField(key)
              });
            }
          } else if (!value || (Array.isArray(value) && value.length === 0)) {
            // Missing or empty values
            unknown.push({
              path: currentPath,
              key,
              value: value || 'Missing',
              section: determineSectionForField(key)
            });
          }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          checkEssentialFields(value, currentPath);
        }
      });
    };

    if (result) {
      checkEssentialFields(result);
      checkEssentialFields(result.parsedData, 'parsedData');
      checkEssentialFields(result.analysis, 'analysis');
      checkEssentialFields(result.extractedData, 'extractedData');
    }

    // Remove duplicates based on field key
    const uniqueUnknown = unknown.filter((field, index, self) => 
      index === self.findIndex(f => f.key === field.key)
    );

    console.log('🔍 Essential fields check:', {
      totalFound: unknown.length,
      uniqueFields: uniqueUnknown.length,
      fields: uniqueUnknown.map(f => ({ key: f.key, value: f.value, section: f.section }))
    });

    setUnknownFields(uniqueUnknown);
    setHasUnknownData(uniqueUnknown.length > 0);

    // Block finalization if product name is unknown
    const productNameUnknown = uniqueUnknown.some(field => 
      ['productName', 'name', 'product'].includes(field.key)
    );
    
    if (productNameUnknown) {
      console.warn('⚠️ Product name is unknown - must be corrected before finalization');
    }
  }, [result]);

  const determineSectionForField = (fieldKey) => {
    // Check defined sections first
    for (const [sectionKey, section] of Object.entries(sdsSections)) {
      if (section.fields.some(f => f.key === fieldKey)) {
        return sectionKey;
      }
    }
    
    // Essential field mapping
    const fieldMappings = {
      'productName': 'section1',
      'name': 'section1', 
      'product': 'section1',
      'manufacturer': 'section1',
      'composition': 'section3',
      'physicalState': 'section9',
      'state': 'section9',
      'pH': 'section9',
      'flashPoint': 'section9',
      'density': 'section9',
      'boilingPoint': 'section9',
      'meltingPoint': 'section9',
      'unNumber': 'section14',
      'hazardClass': 'section14',
      'properShippingName': 'section14',
      'packingGroup': 'section14',
      'hazardous': 'classification',
      'waste_codes': 'classification',
      'state_classification': 'classification',
      'state_form_code': 'classification',
      'final_classification': 'classification'
    };
    
    return fieldMappings[fieldKey] || 'section1';
  };

  const handleEdit = () => {
    console.log('👆 Edit button clicked - enabling field editing');
    
    // Initialize edited data with current values
    const initialData = {};
    Object.entries(sdsSections).forEach(([sectionKey, section]) => {
      section.fields.forEach(field => {
        const value = getFieldValue(field.key);
        if (value !== undefined) {
          initialData[field.key] = value;
        }
      });
    });
    
    console.log('📝 Initial edit data:', initialData);
    setEditedData(initialData);
    
    // Initialize composition data if available
    const currentComposition = getFieldValue('composition');
    if (currentComposition && Array.isArray(currentComposition) && currentComposition.length > 0) {
      const initConstituents = currentComposition.map(comp => ({
        name: comp.name || comp.chemical || '',
        percentage: comp.percentage || comp.percent || '',
        cas: comp.cas || comp.casNumber || ''
      }));
      setConstituents(initConstituents);
    }
    
    // Initialize flash point unit based on existing data
    const currentFlashPoint = getFieldValue('flashPoint');
    if (typeof currentFlashPoint === 'string' && currentFlashPoint.includes('°C')) {
      setFlashPointUnit('C');
    }
    
    // Always enable editing mode first
    setIsEditing(true);
    
    // If there are unknown fields AND user has a PDF, offer guided walkthrough as an option
    if (unknownFields.length > 0 && pdfFile) {
      console.log('🎯 Unknown fields detected, guided walkthrough available for', unknownFields.length, 'missing fields');
      // Note: We could add a separate "Start Guided Walkthrough" button if needed
      // For now, users can manually edit all fields
    }
  };

  const getFieldValue = (key) => {
    // Navigate through nested objects to find the value
    const paths = [
      result?.[key],
      result?.parsedData?.[key],
      result?.analysis?.[key],
      result?.extractedData?.[key],
      result?.rcraClassification?.[key],
      result?.dotClassification?.[key],
      result?.stateClassification?.[key],
      result?.classification?.[key],
      result?.product, // For productName
      result?.name     // Alternative for productName
    ];
    
    // Special handling for product name variants
    if (key === 'productName' || key === 'name') {
      const productValue = paths.find(val => val !== undefined) || result?.product;
      return productValue;
    }
    
    return paths.find(val => val !== undefined);
  };

  const handleFieldChange = (key, value, type) => {
    setEditedData(prev => ({
      ...prev,
      [key]: type === 'array' ? value.split(',').map(v => v.trim()) : value
    }));
  };

  const handleConstituentChange = (index, field, value) => {
    const updatedConstituents = [...constituents];
    updatedConstituents[index][field] = value;
    setConstituents(updatedConstituents);
    
    // Update editedData with the constituent data
    setEditedData(prev => ({
      ...prev,
      composition: updatedConstituents.filter(c => c.name || c.percentage || c.cas)
    }));
  };

  const addConstituent = () => {
    setConstituents([...constituents, { name: '', percentage: '', cas: '' }]);
  };

  const removeConstituent = (index) => {
    const updatedConstituents = constituents.filter((_, i) => i !== index);
    setConstituents(updatedConstituents);
    setEditedData(prev => ({
      ...prev,
      composition: updatedConstituents.filter(c => c.name || c.percentage || c.cas)
    }));
  };

  const handleSave = () => {
    // Validate required fields
    const productName = editedData.productName || getFieldValue('productName');
    if (!productName || productName.toLowerCase() === 'unknown') {
      alert('Product name cannot be "Unknown". Please provide a valid product name.');
      return;
    }

    // Apply overrides
    onOverride(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleViewSection = (sectionKey, fieldKey) => {
    console.log(`👁️ User clicked to view ${sectionKey} for field ${fieldKey}`);
    console.log(`📄 PDF file available:`, !!pdfFile);
    
    // Set current field for navigation
    const fieldIndex = unknownFields.findIndex(f => f.key === fieldKey);
    if (fieldIndex >= 0) {
      setCurrentFieldIndex(fieldIndex);
    }
    
    if (pdfFile) {
      // Open PDF viewer with section navigation
      setCurrentSectionKey(sectionKey);
      setCurrentFieldKey(fieldKey);
      setShowPDFViewer(true);
      setActiveSection(sectionKey);
    } else {
      // Fallback to text extraction if no PDF available
      console.log(`📄 Available fullText length: ${fullText?.length || 0} characters`);
      const sectionData = extractSDSSection(fullText, sectionKey);
      console.log(`📋 Extracted section data length: ${sectionData?.length || 0} characters`);
      onViewSDSSection(sectionData, sectionKey, fieldKey);
      setActiveSection(sectionKey);
    }
  };

  const handleTextSelection = (selectedText) => {
    console.log(`📝 User selected text: "${selectedText}"`);
    if (selectedText && currentFieldKey) {
      // Auto-populate the current field with selected text
      const updatedEditedData = {
        ...editedData,
        [currentFieldKey]: selectedText.trim()
      };
      
      setEditedData(updatedEditedData);
      
      // Mark field as completed
      setCompletedFields(prev => new Set([...prev, currentFieldKey]));
      
      console.log(`✅ Auto-populated field "${currentFieldKey}" with: "${selectedText.trim()}"`);
      console.log(`📋 Updated editedData:`, updatedEditedData);
      
      // Immediately apply the override for this field to ensure it persists
      if (onOverride) {
        onOverride({ [currentFieldKey]: selectedText.trim() });
      }
    }
  };

  const handleNextField = () => {
    const nextIndex = currentFieldIndex + 1;
    if (nextIndex < unknownFields.length) {
      const nextField = unknownFields[nextIndex];
      setCurrentFieldIndex(nextIndex);
      setCurrentFieldKey(nextField.key);
      setCurrentSectionKey(nextField.section);
      
      console.log(`⏭️ Moving to next field: ${nextField.key} in ${nextField.section}`);
    } else {
      // All fields completed - apply the final overrides
      setShowPDFViewer(false);
      console.log(`🎉 All fields completed, applying final overrides`);
      
      // Get the current editedData state and apply all overrides at once
      setEditedData(currentEditedData => {
        console.log(`📝 Final edited data to apply:`, currentEditedData);
        
        // Apply the complete set of overrides
        if (Object.keys(currentEditedData).length > 0) {
          onOverride(currentEditedData);
          
          // Trigger reanalysis if available
          if (onReanalyze && result) {
            console.log(`🔄 Triggering reanalysis with complete updated data`);
            onReanalyze(result, currentEditedData);
          }
        }
        
        return currentEditedData;
      });
      
      // Reset states
      setIsEditing(false);
      setCurrentFieldIndex(0);
      setCompletedFields(new Set());
    }
  };

  const handlePreviousField = () => {
    const prevIndex = currentFieldIndex - 1;
    if (prevIndex >= 0) {
      const prevField = unknownFields[prevIndex];
      setCurrentFieldIndex(prevIndex);
      setCurrentFieldKey(prevField.key);
      setCurrentSectionKey(prevField.section);
      
      console.log(`⏮️ Moving to previous field: ${prevField.key} in ${prevField.section}`);
    }
  };

  const handleSkipField = () => {
    console.log(`⏭️ Skipping field: ${currentFieldKey}`);
    handleNextField();
  };

  const getCurrentFieldInfo = () => {
    if (currentFieldIndex >= 0 && unknownFields[currentFieldIndex]) {
      const field = unknownFields[currentFieldIndex];
      const sectionInfo = Object.values(sdsSections).find(section =>
        section.fields.some(f => f.key === field.key)
      );
      
      return {
        field: field,
        section: sectionInfo,
        progress: `${currentFieldIndex + 1} of ${unknownFields.length}`,
        isCompleted: completedFields.has(field.key),
        completedCount: completedFields.size,
        totalCount: unknownFields.length
      };
    }
    return null;
  };

  const extractSDSSection = (text, sectionKey) => {
    if (!text) {
      console.log('❌ No fullText available for SDS section extraction');
      return `No SDS text available. The full SDS text was not captured during analysis.`;
    }
    
    console.log(`🔍 Extracting ${sectionKey} from ${text.length} characters of SDS text`);
    
    const sectionMappings = {
      section1: { 
        patterns: ['section 1', 'identification', 'product identifier'],
        end: ['section 2', 'hazard identification'],
        maxLines: 40 
      },
      section2: { 
        patterns: ['section 2', 'hazard identification', 'classification'],
        end: ['section 3', 'composition', 'ingredient'],
        maxLines: 50 
      },
      section3: { 
        patterns: ['section 3', 'composition', 'ingredient'],
        end: ['section 4', 'first aid'],
        maxLines: 60 
      },
      section9: { 
        patterns: ['section 9', 'physical and chemical properties', 'physical properties'],
        end: ['section 10', 'stability'],
        maxLines: 50 
      },
      section13: { 
        patterns: ['section 13', 'disposal considerations', 'disposal'],
        end: ['section 14', 'transport'],
        maxLines: 40 
      },
      section14: { 
        patterns: ['section 14', 'transport information', 'shipping'],
        end: ['section 15', 'regulatory', 'section 16'],
        maxLines: 40 
      }
    };

    const mapping = sectionMappings[sectionKey];
    if (!mapping) {
      console.log(`❌ No mapping found for section: ${sectionKey}`);
      return `Section mapping not found for ${sectionKey}`;
    }

    const lines = text.split('\n');
    let sectionText = [];
    let inSection = false;
    let foundStart = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase().trim();
      
      // Check for section start
      if (!inSection && mapping.patterns.some(pattern => lineLower.includes(pattern.toLowerCase()))) {
        console.log(`✅ Found section start at line ${i}: "${line}"`);
        inSection = true;
        foundStart = true;
        sectionText.push(line);
        continue;
      }
      
      // Check for section end
      if (inSection && mapping.end.some(endPattern => lineLower.includes(endPattern.toLowerCase()))) {
        console.log(`🛑 Found section end at line ${i}: "${line}"`);
        break;
      }
      
      // Collect lines while in section
      if (inSection && sectionText.length < mapping.maxLines) {
        sectionText.push(line);
      }
    }

    if (!foundStart) {
      console.log(`❌ Could not find section ${sectionKey} in SDS text`);
      return `Section ${sectionKey.replace('section', 'Section ')} not found in SDS document. 
      
Available text preview:
${text.substring(0, 500)}...`;
    }

    const result = sectionText.join('\n');
    console.log(`📄 Extracted ${sectionText.length} lines for ${sectionKey}`);
    return result || `Section ${sectionKey.replace('section', 'Section ')} found but appears to be empty.`;
  };

  const renderField = (field, sectionKey) => {
    const currentValue = editedData[field.key] ?? getFieldValue(field.key) ?? '';
    const isUnknown = unknownFields.some(f => f.key === field.key);
    const isCompleted = completedFields.has(field.key);
    
    return (
      <div key={field.key} className="flex items-start space-x-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
            {isUnknown && !isCompleted && (
              <span className="ml-2 text-xs text-orange-500">
                <AlertTriangle className="inline w-3 h-3 mr-1" />
                Unknown/Missing
              </span>
            )}
            {isCompleted && (
              <span className="ml-2 text-xs text-green-600">
                <CheckCircle className="inline w-3 h-3 mr-1" />
                Updated
              </span>
            )}
          </label>
          
          {isEditing ? (
            field.type === 'composition' ? (
              <div className="space-y-3">
                {constituents.map((constituent, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Material Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        value={constituent.name}
                        onChange={(e) => handleConstituentChange(index, 'name', e.target.value)}
                        placeholder="Chemical name"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Percentage
                      </label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        value={constituent.percentage}
                        onChange={(e) => handleConstituentChange(index, 'percentage', e.target.value)}
                        placeholder="00.0%"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        CAS Number
                      </label>
                      <input
                        type="text"
                        className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                        value={constituent.cas}
                        onChange={(e) => handleConstituentChange(index, 'cas', e.target.value)}
                        placeholder="000-00-0"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {index > 0 && (
                        <button
                          onClick={() => removeConstituent(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove constituent"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addConstituent}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  + Add Another Constituent
                </button>
              </div>
            ) : field.key === 'flashPoint' ? (
              <div>
                <select
                  value={currentValue || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value, field.type)}
                  className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select flash point range...</option>
                  <option value="≤140°F">≤140°F (Flammable)</option>
                  <option value="≥141°F">≥141°F (Combustible)</option>
                  <option value="N/A">N/A - Not Applicable</option>
                </select>
                {currentValue === '≥141°F' && (
                  <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-orange-800 dark:text-orange-300">
                          Near Flammability Threshold
                        </p>
                        <p className="text-orange-700 dark:text-orange-400 mt-1">
                          Materials with flash points 141-150°F are just above the flammable threshold.
                          Small temperature variations could affect classification.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : field.key === 'pH' ? (
              <div>
                <select
                  value={currentValue || ''}
                  onChange={(e) => handleFieldChange(field.key, e.target.value, field.type)}
                  className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select pH range...</option>
                  <option value="0-2.0">0-2.0 (Strongly Acidic)</option>
                  <option value="2.1-12.4">2.1-12.4 (Neutral Range)</option>
                  <option value="12.5-14">12.5-14 (Strongly Basic)</option>
                  <option value="N/A">N/A - Not Applicable</option>
                </select>
                {currentValue === '2.1-12.4' && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-md">
                    <div className="flex items-start">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-yellow-800 dark:text-yellow-300">
                          Wide pH Range - Verify Classification
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                          pH values near 2.0-2.5 or 11.5-12.4 are close to corrosive thresholds.
                          Consider requesting exact pH for materials near these boundaries.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : field.key === 'physicalState' || field.key === 'state' ? (
              <select
                value={currentValue || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value, field.type)}
                className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Select physical state...</option>
                <option value="Solid">Solid</option>
                <option value="Liquid">Liquid</option>
                <option value="Gas">Gas</option>
                <option value="Pressurized/Liquified Gas (Cylinder)">Pressurized/Liquified Gas (Cylinder)</option>
                <option value="Aerosol">Aerosol</option>
                <option value="Semi-solid">Semi-solid</option>
                <option value="Paste">Paste</option>
                <option value="Gel">Gel</option>
                <option value="Powder">Powder</option>
                <option value="Granular">Granular</option>
                <option value="Sludge">Sludge</option>
                <option value="Slurry">Slurry</option>
                <option value="Emulsion">Emulsion</option>
                <option value="Foam">Foam</option>
                <option value="Crystalline">Crystalline</option>
              </select>
            ) : field.type === 'array' ? (
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                value={Array.isArray(currentValue) ? currentValue.join(', ') : currentValue}
                onChange={(e) => handleFieldChange(field.key, e.target.value, field.type)}
                placeholder="Enter values separated by commas"
              />
            ) : (
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-600"
                value={currentValue}
                onChange={(e) => handleFieldChange(field.key, e.target.value, field.type)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
              />
            )
          ) : (
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm">
              {Array.isArray(currentValue) 
                ? currentValue.join(', ') || 'Not specified'
                : currentValue || 'Not specified'}
            </div>
          )}
        </div>
        
        {/* Eye icons removed - guided walkthrough starts automatically */}
      </div>
    );
  };

  console.log('🎨 ManualOverridePanel rendering with state:', {
    isEditing,
    hasUnknownData,
    unknownFieldsCount: unknownFields.length,
    editedDataKeys: Object.keys(editedData)
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Classification Data Override
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasUnknownData && !isEditing && (
            <div className="flex items-center text-orange-600 mr-4">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">
                {unknownFields.length - completedFields.size} of {unknownFields.length} fields need attention
              </span>
              {completedFields.size > 0 && (
                <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs">
                  {completedFields.size} completed
                </span>
              )}
            </div>
          )}
          
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Data
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {hasUnknownData && !isEditing && !showPDFViewer && (
        <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-2" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Missing or Unknown Data Detected
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                Click "Edit Data" to start a guided walkthrough that will help you find and enter the missing information from the SDS document.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(sdsSections).map(([sectionKey, section]) => {
          // Skip classification section in edit mode
          if (isEditing && section.displayOnly) return null;
          
          const sectionFields = section.fields.filter(field => {
            const value = getFieldValue(field.key);
            return isEditing || value !== undefined || unknownFields.some(f => f.key === field.key);
          });

          if (sectionFields.length === 0 && !isEditing) return null;

          return (
            <div key={sectionKey} className="border-t pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {section.title}
                </h4>
                {pdfFile && sectionKey !== 'classification' && !section.displayOnly && (
                  <button
                    onClick={() => handleViewSection(sectionKey, sectionFields[0]?.key)}
                    className="flex items-center px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Section
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sectionFields.map(field => {
                  // For classification fields in view mode, show as read-only
                  if (section.displayOnly || field.readOnly) {
                    const value = getFieldValue(field.key);
                    return (
                      <div key={field.key} className="flex items-start space-x-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {field.label}
                          </label>
                          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-sm border border-gray-300 dark:border-gray-600">
                            {Array.isArray(value) 
                              ? value.join(', ') || 'Auto-calculated'
                              : value || 'Auto-calculated'}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return renderField(field, sectionKey);
                })}
              </div>
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> After saving your changes, you can reanalyze this specific waste 
            to update its classification based on the corrected data.
          </p>
        </div>
      )}

      {!isEditing && Object.keys(editedData).length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onReanalyze(result, editedData)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reanalyze with Override Data
          </button>
        </div>
      )}

      {/* PDF Viewer Modal */}
      <PDFViewer
        pdfFile={pdfFile}
        isOpen={showPDFViewer}
        onClose={() => setShowPDFViewer(false)}
        sectionKey={currentSectionKey}
        fieldKey={currentFieldKey}
        title={`SDS Document - ${currentFieldKey ? `Section for ${currentFieldKey}` : 'Document Viewer'}`}
        onTextSelection={handleTextSelection}
        onNextField={handleNextField}
        onPreviousField={handlePreviousField}
        onSkipField={handleSkipField}
        fieldInfo={getCurrentFieldInfo()}
      />
    </div>
  );
};

export default ManualOverridePanel;