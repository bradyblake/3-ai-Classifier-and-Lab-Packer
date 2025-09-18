// LabPackPlanner.jsx - Comprehensive lab pack planning with material segregation

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { EnhancedLabPackEngine } from '../engines/EnhancedLabPackEngine.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import BackButton from './BackButton';
import { getLabPackQueue, clearLabPackQueue } from '../shared/utils/labPackQueueManager';
import projectManager from '../utils/projectManager.js';
import safetyChecker from '../utils/safetyChecker.js';
import wasteProfileGenerator from '../utils/wasteProfileGenerator.js';
import MaterialVolumeInput from './MaterialVolumeInput.jsx';
import MaterialClassificationDialog from './MaterialClassificationDialog.jsx';

const LabPackPlanner = () => {
  console.log('🚀 LabPackPlanner component mounted/re-rendered');
  
  const [materials, setMaterials] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [labPacks, setLabPacks] = useState([]);
  const [unpackableMaterials, setUnpackableMaterials] = useState([]);
  const [packingList, setPackingList] = useState(null);
  const [showJobFilter, setShowJobFilter] = useState(false);
  const [compatibilityEngine] = useState(new EnhancedLabPackEngine());
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newProjectData, setNewProjectData] = useState({ name: '', description: '', client: '', jobNumber: '' });
  const [wasteProfiles, setWasteProfiles] = useState([]);
  const [showWasteProfileModal, setShowWasteProfileModal] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState(null);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [showClassificationDialog, setShowClassificationDialog] = useState(false);
  const [ambiguousMaterial, setAmbiguousMaterial] = useState(null);
  const [userClassifications, setUserClassifications] = useState({});

  useEffect(() => {
    loadMaterials();
    loadJobs();
    checkForImportedData();
    loadProjects();
  }, []);

  const loadProjects = () => {
    const allProjects = projectManager.getAllProjects();
    setProjects(allProjects);
  };

  const loadWasteProfiles = () => {
    const allProfiles = wasteProfileGenerator.getAllProfiles();
    setWasteProfiles(allProfiles);
  };

  // Generate waste profile from current lab packs
  const handleGenerateWasteProfile = (options = {}) => {
    if (labPacks.length === 0) {
      alert('No lab packs available to generate waste profile');
      return;
    }

    try {
      const profile = wasteProfileGenerator.generateFromLabPacks(labPacks, {
        profileName: options.profileName,
        includeUnpackable: options.includeUnpackable || false,
        customDescription: options.customDescription
      });

      // Add unpackable materials if requested
      if (options.includeUnpackable && unpackableMaterials.length > 0) {
        profile.unpackableMaterials = unpackableMaterials.map(material => ({
          productName: material.productName,
          reason: material.reason,
          hazardClass: material.hazardClass,
          requiresSpecialDisposal: true
        }));
        
        profile.wasteDescription += `. Note: ${unpackableMaterials.length} materials cannot be lab packed and require individual disposal`;
      }

      setGeneratedProfile(profile);
      setShowWasteProfileModal(true);
      
      console.log('✅ Generated waste profile:', profile);
    } catch (error) {
      console.error('Error generating waste profile:', error);
      alert(`Failed to generate waste profile: ${error.message}`);
    }
  };

  // Save generated waste profile
  const handleSaveWasteProfile = (profile) => {
    wasteProfileGenerator.saveProfile(profile);
    loadWasteProfiles();
    setShowWasteProfileModal(false);
    setGeneratedProfile(null);
    alert(`Waste profile "${profile.profileName}" saved successfully!`);
  };

  // Export waste profile in various formats
  const handleExportWasteProfile = (profile, format) => {
    try {
      const exportData = wasteProfileGenerator.exportProfile(profile, format);
      
      // Create and download file
      const fileName = `${profile.profileName.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
      const blob = new Blob([typeof exportData === 'string' ? exportData : JSON.stringify(exportData, null, 2)], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Exported waste profile as ${format}:`, fileName);
    } catch (error) {
      console.error('Error exporting waste profile:', error);
      alert(`Failed to export waste profile: ${error.message}`);
    }
  };

  const checkForImportedData = () => {
    try {
      const importedData = localStorage.getItem('labpack_import_data');
      if (importedData) {
        const data = JSON.parse(importedData);
        console.log('Found imported lab pack data:', data);
        
        // Convert container assignments to materials format
        const importedMaterials = [];
        
        if (data.containers && data.containers.length > 0) {
          data.containers.forEach(container => {
            container.containers.forEach(item => {
              importedMaterials.push({
                id: item.container_id,
                productName: item.product_name || item.classification?.productName,
                filename: item.filename,
                category: container.category,
                categoryName: container.category_name,
                containerLabel: container.container_label,
                specialNotes: container.special_notes,
                packagingRequirements: container.packaging_requirements,
                dotHazardClass: container.dot_hazard_class,
                estimatedVolume: container.estimated_volume,
                requiresSeparateContainer: container.requires_separate_container,
                
                // Add classification data that Lab Pack Planner expects
                physicalState: item.classification?.physicalState,
                pH: item.classification?.pH,
                flashPoint: item.classification?.flashPoint,
                hazardClass: item.classification?.hazardClass,
                packingGroup: item.classification?.packingGroup,
                unNumber: item.classification?.unNumber,
                
                // Preserve chemical category for proper segregation
                chemicalCategory: container.category,
                chemicalCategoryName: container.category_name,
                
                // Container manifest information
                containerFormCode: container.container_form_code,
                containerClassification: container.container_classification,
                manifestInfo: container.manifest_info,
                
                // Federal and state codes
                classification: {
                  hazardous: item.classification?.final_classification === 'hazardous',
                  primaryCategory: item.classification?.classification_authority,
                  dCodes: item.classification?.federal_codes || [],
                  segregationLevel: container.requires_separate_container ? 'extreme' : 'low',
                  specialHandling: container.packaging_requirements || []
                },
                
                // RCRA and regulatory data
                rcraCharacteristic: item.classification?.federal_codes || [],
                dotShipping: {
                  hazardClass: item.classification?.hazardClass,
                  unNumber: item.classification?.unNumber,
                  packingGroup: item.classification?.packingGroup
                },
                
                // State codes
                stateFormCode: item.classification?.state_form_code,
                stateClassification: item.classification?.state_classification,
                
                source: 'Lab Pack Analyzer',
                importedAt: new Date().toISOString(),
                addedAt: new Date().toISOString()
              });
            });
          });
        } else {
          console.warn('No container assignments found in imported data:', data);
        }
        
        // Merge with existing materials or replace
        const existingMaterials = JSON.parse(localStorage.getItem('labPackQueue') || '[]');
        const allMaterials = [...existingMaterials, ...importedMaterials];
        
        setMaterials(allMaterials);
        localStorage.setItem('labPackQueue', JSON.stringify(allMaterials));
        
        // Clear the import data
        localStorage.removeItem('labpack_import_data');
        
        // Show notification
        alert(`Successfully imported ${importedMaterials.length} containers from Lab Pack Analyzer!`);
      }
    } catch (error) {
      console.error('Error processing imported data:', error);
    }
  };

  useEffect(() => {
    if (materials.length > 0) {
      generateLabPacks();
    }
  }, [materials, selectedJobId]);

  const loadMaterials = () => {
    console.log('🔥 LabPackPlanner loadMaterials function called');
    try {
      // Load materials from the new queue system (solids and liquids)
      const queues = getLabPackQueue('all');
      const labPackQueue = queues.all || [];
      
      // Also check legacy queue for backward compatibility
      const legacyQueue = JSON.parse(localStorage.getItem('labPackQueue') || '[]');
      
      // 🔍 DEBUG LOGGING
      console.log('🔍 LabPackPlanner - Loading materials...');
      console.log('🔍 New queue system (all):', labPackQueue);
      console.log('🔍 Legacy queue:', legacyQueue);
      
      const allMaterials = [...labPackQueue, ...legacyQueue];
      setMaterials(allMaterials);
      
      console.log(`🧪 LabPackPlanner loaded ${allMaterials.length} materials`);
      console.log('🔍 Final materials array:', allMaterials);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const loadJobs = () => {
    try {
      const cards = JSON.parse(localStorage.getItem('kanbanCards') || '[]');
      setJobs(cards);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const generateLabPacks = () => {
    let materialsToProcess = materials;
    
    // Filter by job if selected
    if (selectedJobId) {
      materialsToProcess = materials.filter(material => material.jobId === selectedJobId);
    }

    if (materialsToProcess.length === 0) {
      setLabPacks([]);
      setUnpackableMaterials([]);
      return;
    }

    console.log('🧪 Generating lab packs for materials:', materialsToProcess);

    // STEP 1: Check for ambiguous materials that need user classification
    for (const material of materialsToProcess) {
      const materialId = material.id || material.productName;
      
      // Skip if already classified by user
      if (userClassifications[materialId]) {
        continue;
      }

      // Check if material needs classification
      const detection = compatibilityEngine.chemicalCompatibility.detectMaterialType(material, userClassifications);
      
      if (detection.requires_classification) {
        console.log(`🤔 Material "${material.productName}" requires user classification:`, detection.ambiguous_types);
        
        // Show classification dialog for the first ambiguous material
        setAmbiguousMaterial({
          ...material,
          id: materialId,
          ambiguous_types: detection.ambiguous_types
        });
        setShowClassificationDialog(true);
        return; // Stop processing until user classifies
      }
    }

    // STEP 2: All materials are classified, proceed with lab pack generation
    const result = compatibilityEngine.optimizeLabPackConfiguration(materialsToProcess, userClassifications);
    
    setLabPacks(result.labPacks);
    setUnpackableMaterials(result.unpackable || []);
    setPackingList(result.packingList || null);
  };

  const removeMaterial = (materialIndex, packIndex = null) => {
    const materialId = packIndex !== null 
      ? labPacks[packIndex].materials[materialIndex].id || materialIndex
      : unpackableMaterials[materialIndex].id || materialIndex;

    // Remove from localStorage
    try {
      const queue = JSON.parse(localStorage.getItem('labPackQueue') || '[]');
      const updatedQueue = queue.filter((_, index) => index !== materialId);
      localStorage.setItem('labPackQueue', JSON.stringify(updatedQueue));
      
      // Reload materials
      loadMaterials();
    } catch (error) {
      console.error('Error removing material:', error);
    }
  };

  // Handle material classification from dialog
  const handleMaterialClassification = (classificationData) => {
    const { materialId, classification, userNotes } = classificationData;
    
    // Store user classification
    const newClassifications = {
      ...userClassifications,
      [materialId]: {
        classification,
        userNotes,
        timestamp: new Date().toISOString(),
        materialName: ambiguousMaterial.productName
      }
    };
    setUserClassifications(newClassifications);
    
    // Save to localStorage for persistence
    localStorage.setItem('materialClassifications', JSON.stringify(newClassifications));
    
    // Record classification for adaptive learning
    const originalDetection = compatibilityEngine.chemicalCompatibility.detectMaterialType(ambiguousMaterial);
    compatibilityEngine.chemicalCompatibility.recordUserClassification(
      ambiguousMaterial,
      { classification, userNotes },
      originalDetection
    );
    
    // Close dialog
    setShowClassificationDialog(false);
    setAmbiguousMaterial(null);
    
    console.log(`✅ Material classified: ${ambiguousMaterial.productName} → ${classification}`);
    
    // Restart lab pack generation with new classification
    generateLabPacks();
  };

  const handleClassificationCancel = () => {
    setShowClassificationDialog(false);
    setAmbiguousMaterial(null);
  };

  // Load saved classifications on component mount
  useEffect(() => {
    try {
      const savedClassifications = localStorage.getItem('materialClassifications');
      if (savedClassifications) {
        setUserClassifications(JSON.parse(savedClassifications));
      }
    } catch (error) {
      console.warn('Failed to load saved material classifications:', error);
    }
  }, []);

  const clearAllMaterials = () => {
    if (confirm('Are you sure you want to clear all materials from the lab pack queue?')) {
      // Use comprehensive clear function from queue manager
      clearLabPackQueue('all');
      
      // Clear component state
      setMaterials([]);
      setLabPacks([]);
      setUnpackableMaterials([]);
      
      console.log('🗑️ LabPackPlanner: All materials and data cleared');
      
      // Force reload materials (should be empty now)
      loadMaterials();
    }
  };

  const handleAddToProject = () => {
    if (labPacks.length === 0 && materials.length === 0) {
      alert('No lab packs or materials to add to project');
      return;
    }
    setShowProjectModal(true);
  };

  const handleCreateProject = () => {
    if (!newProjectData.name.trim()) {
      alert('Project name is required');
      return;
    }

    try {
      const project = projectManager.createProject(newProjectData);
      setProjects([...projects, project]);
      setSelectedProjectId(project.id);
      
      // Reset form
      setNewProjectData({ name: '', description: '', client: '', jobNumber: '' });
      
      alert(`Project "${project.name}" created successfully!`);
      
      // Now add lab packs to the new project
      addLabPacksToProject(project.id);
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const addLabPacksToProject = (projectId) => {
    if (!projectId) {
      alert('Please select a project');
      return;
    }

    try {
      let addedCount = 0;
      
      // Add each lab pack to the project
      labPacks.forEach((pack, index) => {
        const labPackData = {
          name: pack.categoryName || `Lab Pack ${index + 1}`,
          category: pack.category,
          materials: pack.materials,
          containerSize: pack.estimatedVolume || '30-gal',
          specialHandling: pack.specialHandling || [],
          dotClass: pack.dotClass || '9'
        };
        
        projectManager.addLabPackToProject(projectId, labPackData);
        addedCount++;
      });
      
      // Also add any remaining materials
      if (materials.length > 0 && labPacks.length === 0) {
        const labPackData = {
          name: 'Mixed Materials Lab Pack',
          category: 'mixed',
          materials: materials,
          containerSize: '30-gal'
        };
        
        projectManager.addLabPackToProject(projectId, labPackData);
        addedCount++;
      }
      
      const project = projectManager.getProject(projectId);
      alert(`Successfully added ${addedCount} lab pack(s) to project "${project.name}"`);
      
      setShowProjectModal(false);
      
    } catch (error) {
      console.error('Error adding to project:', error);
      alert('Failed to add lab packs to project');
    }
  };

  const handleSelectExistingProject = () => {
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }
    
    addLabPacksToProject(selectedProjectId);
  };

  const handleVolumeUpdate = (updatedMaterials) => {
    setMaterials(updatedMaterials);
    // Save updated materials back to localStorage
    try {
      const queues = getLabPackQueue('all');
      const updatedQueue = updatedMaterials;
      localStorage.setItem('labPackQueue', JSON.stringify(updatedQueue));
      console.log('💾 Updated material volumes/weights saved');
    } catch (error) {
      console.error('Error saving updated materials:', error);
    }
  };

  const exportToExcel = () => {
    if (labPacks.length === 0 && unpackableMaterials.length === 0) {
      alert('No materials to export');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Add Packing List Summary Sheet FIRST
    if (packingList) {
      const packingListSummary = [
        { 'Item': 'Total Lab Packs', 'Value': packingList.totalPacks },
        { 'Item': 'Total Material Volume', 'Value': `${packingList.totalVolume}ml` },
        { 'Item': 'Total Material Weight', 'Value': `${packingList.totalWeight}lbs` },
        { 'Item': 'Total Vermiculite Needed', 'Value': `${packingList.packingMaterials.vermiculite}L` },
        { 'Item': 'Poly Bags Required', 'Value': packingList.packingMaterials.polyBags },
        { 'Item': 'Labels Required', 'Value': packingList.packingMaterials.labels },
        { 'Item': 'Absorbent Pads Required', 'Value': packingList.packingMaterials.absorbentPads },
        { 'Item': '', 'Value': '' }, // spacer
        { 'Item': 'CONTAINER REQUIREMENTS', 'Value': '' },
      ];

      // Add container requirements
      Object.entries(packingList.containerRequirements).forEach(([size, count]) => {
        packingListSummary.push({
          'Item': `${size} containers needed`,
          'Value': count
        });
      });

      const packingListSheet = XLSX.utils.json_to_sheet(packingListSummary);
      XLSX.utils.book_append_sheet(workbook, packingListSheet, 'PACKING LIST');

      // Add Container Specifications Sheet
      if (packingList.containerSpecs && packingList.containerSpecs.length > 0) {
        const containerSpecsData = packingList.containerSpecs.map(spec => ({
          'Pack Number': spec.packNumber,
          'Container Type': spec.containerType,
          'Container Size': spec.containerSize,
          'Container Material': spec.containerMaterial,
          'Fill Volume': spec.fillVolume,
          'Fill Percentage': spec.fillPercentage,
          'Total Weight': spec.weight,
          'Material Count': spec.materialCount,
          'DOT Class': spec.dotClass,
          'Category': spec.category,
          'Vermiculite Needed': spec.vermiculiteNeeded
        }));

        const containerSpecsSheet = XLSX.utils.json_to_sheet(containerSpecsData);
        XLSX.utils.book_append_sheet(workbook, containerSpecsSheet, 'CONTAINER SPECS');
      }
    }

    // Export lab packs
    if (labPacks.length > 0) {
      const packData = [];
      labPacks.forEach((pack, packIndex) => {
        pack.materials.forEach((material, materialIndex) => {
          packData.push({
            'Pack Number': packIndex + 1,
            'Pack Category': pack.category,
            'Pack Subcategory': pack.subcategory || '',
            'Material Name': material.productName || 'Unknown',
            'Job Number': material.jobNumber || '',
            'Job Title': material.jobTitle || '',
            'Physical State': material.physicalState || '',
            'pH': material.pH || '',
            'Flash Point': material.flashPoint || '',
            'RCRA Codes': material.rcraCharacteristic?.join(', ') || '',
            'DOT Class': material.dotShipping?.hazardClass || '',
            'Classification': material.classification?.primaryCategory || '',
            'Segregation Level': material.classification?.segregationLevel || '',
            'Special Handling': material.classification?.specialHandling?.join('; ') || '',
            'Added Date': material.addedAt || ''
          });
        });
      });

      const packSheet = XLSX.utils.json_to_sheet(packData);
      XLSX.utils.book_append_sheet(workbook, packSheet, 'Lab Packs');
    }

    // Export unpackable materials
    if (unpackableMaterials.length > 0) {
      const unpackableData = unpackableMaterials.map(material => ({
        'Material Name': material.productName || 'Unknown',
        'Job Number': material.jobNumber || '',
        'Job Title': material.jobTitle || '',
        'Reason Cannot Pack': material.reason || '',
        'Physical State': material.physicalState || '',
        'pH': material.pH || '',
        'Flash Point': material.flashPoint || '',
        'RCRA Codes': material.rcraCharacteristic?.join(', ') || '',
        'DOT Class': material.dotShipping?.hazardClass || '',
        'Classification': material.classification?.primaryCategory || '',
        'Added Date': material.addedAt || ''
      }));

      const unpackableSheet = XLSX.utils.json_to_sheet(unpackableData);
      XLSX.utils.book_append_sheet(workbook, unpackableSheet, 'Cannot Pack');
    }

    // Generate filename with job info
    const selectedJob = jobs.find(job => job.id === selectedJobId);
    const filename = selectedJob 
      ? `LabPack_${selectedJob.jobNumber || selectedJob.title}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `LabPack_All_Jobs_${new Date().toISOString().slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, filename);
  };

  const exportToPDF = () => {
    if (labPacks.length === 0 && unpackableMaterials.length === 0) {
      alert('No materials to export');
      return;
    }

    const doc = new jsPDF();
    const selectedJob = jobs.find(job => job.id === selectedJobId);
    const title = selectedJob 
      ? `Lab Pack Plan - ${selectedJob.jobNumber || selectedJob.title}`
      : 'Lab Pack Plan - All Jobs';

    // Header
    doc.setFontSize(16);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Total Materials: ${materials.length} | Lab Packs: ${labPacks.length} | Cannot Pack: ${unpackableMaterials.length}`, 20, 35);

    let yPosition = 50;

    // Lab Packs Section
    if (labPacks.length > 0) {
      doc.setFontSize(14);
      doc.text('Lab Pack Assignments', 20, yPosition);
      yPosition += 15;

      labPacks.forEach((pack, packIndex) => {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Pack header
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Pack #${packIndex + 1}: ${pack.subcategory || pack.category}`, 20, yPosition);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        yPosition += 8;
        
        doc.text(`Category: ${pack.category} | Segregation: ${pack.segregationLevel?.toUpperCase() || 'STANDARD'}`, 25, yPosition);
        yPosition += 6;

        if (pack.specialHandling?.length > 0) {
          doc.text(`Special Handling: ${pack.specialHandling.join('; ')}`, 25, yPosition);
          yPosition += 6;
        }

        // Materials list (simplified approach without autoTable)
        doc.setFontSize(8);
        doc.text('Materials:', 25, yPosition);
        yPosition += 5;

        pack.materials.forEach((material, idx) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          const materialLine = `${idx + 1}. ${material.productName || 'Unknown'} | ${material.physicalState || 'N/A'} | pH: ${material.pH || 'N/A'} | Codes: ${(material.classification?.dCodes || []).join(', ') || 'None'}`;
          doc.text(materialLine, 30, yPosition);
          yPosition += 4;
        });

        yPosition += 10; // Space between packs
      });
    }

    // Unpackable Materials Section
    if (unpackableMaterials.length > 0) {
      // Check if we need a new page
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.text('Materials That Cannot Be Lab Packed', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(8);
      unpackableMaterials.forEach((material, idx) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const materialLine = `${idx + 1}. ${material.productName || 'Unknown'} - ${material.reason || 'Incompatible'} | ${material.physicalState || 'N/A'} | Codes: ${(material.classification?.dCodes || []).join(', ') || 'None'}`;
        doc.text(materialLine, 25, yPosition);
        yPosition += 5;
      });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text('Generated by unboXed Dashboard Lab Pack Planner', 20, doc.internal.pageSize.height - 10);
    }

    // Generate filename
    const filename = selectedJob 
      ? `LabPack_${selectedJob.jobNumber || selectedJob.title}_${new Date().toISOString().slice(0, 10)}.pdf`
      : `LabPack_All_Jobs_${new Date().toISOString().slice(0, 10)}.pdf`;

    doc.save(filename);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // No destination = dropped outside droppable area
    if (!destination) {
      return;
    }

    // Dropped in same position
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) {
      return;
    }

    // Parse the material ID and source info
    const materialId = parseInt(draggableId.split('-')[1]);
    const sourcePack = source.droppableId === 'unpackable' ? null : parseInt(source.droppableId.split('-')[1]);
    const destPack = destination.droppableId === 'unpackable' ? null : parseInt(destination.droppableId.split('-')[1]);

    // Get the material being moved
    let materialToMove;
    if (sourcePack === null) {
      // Moving from unpackable
      materialToMove = unpackableMaterials[source.index];
    } else {
      // Moving from a pack
      materialToMove = labPacks[sourcePack].materials[source.index];
    }

    // SAFETY CHECK: If moving to a lab pack (not unpackable), check compatibility
    if (destPack !== null) {
      const destinationMaterials = labPacks[destPack].materials;
      const compatibilityCheck = safetyChecker.checkLabPackCompatibility(materialToMove, destinationMaterials);
      
      if (!compatibilityCheck.compatible) {
        // Show detailed safety warning
        const warningMessage = `⚠️ SAFETY WARNING: Cannot add "${materialToMove.productName}" to this lab pack!\n\n` +
          `Reason: ${compatibilityCheck.reason}\n\n` +
          `Severity: ${compatibilityCheck.severity?.toUpperCase()}\n\n` +
          (compatibilityCheck.details?.response ? `Response Required: ${compatibilityCheck.details.response}\n\n` : '') +
          'This combination could be dangerous and violates EPA/DOT regulations.';
        
        alert(warningMessage);
        
        // Log safety violation for audit trail
        console.error('🚨 SAFETY VIOLATION PREVENTED:', {
          material: materialToMove.productName,
          targetPack: destPack,
          reason: compatibilityCheck.reason,
          severity: compatibilityCheck.severity,
          conflictingMaterial: compatibilityCheck.conflictingMaterial
        });
        
        return; // Prevent the move
      }
      
      // Log successful compatibility check
      console.log('✅ Compatibility check passed:', {
        material: materialToMove.productName,
        targetPack: destPack,
        existingMaterials: destinationMaterials.length
      });
    }

    // Create new state
    const newLabPacks = [...labPacks];
    const newUnpackableMaterials = [...unpackableMaterials];

    // Remove from source
    if (sourcePack === null) {
      newUnpackableMaterials.splice(source.index, 1);
    } else {
      newLabPacks[sourcePack].materials.splice(source.index, 1);
    }

    // Add to destination
    if (destPack === null) {
      // Moving to unpackable
      newUnpackableMaterials.splice(destination.index, 0, {
        ...materialToMove,
        reason: 'Manually moved by user'
      });
    } else {
      // Moving to a pack
      newLabPacks[destPack].materials.splice(destination.index, 0, materialToMove);
    }

    // Update state
    setLabPacks(newLabPacks);
    setUnpackableMaterials(newUnpackableMaterials);

    console.log(`Moved material "${materialToMove.productName}" from ${sourcePack === null ? 'unpackable' : `pack ${sourcePack}`} to ${destPack === null ? 'unpackable' : `pack ${destPack}`}`);
  };

  const getSegregationColor = (level) => {
    switch (level) {
      case 'prohibited': return 'bg-red-100 border-red-400 text-red-800';
      case 'extreme': return 'bg-orange-100 border-orange-400 text-orange-800';
      case 'high': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default: return 'bg-green-100 border-green-400 text-green-800';
    }
  };

  // Helper function to determine if material is hazardous
  const isHazardousMaterial = (material) => {
    // Check waste codes for hazardous classification
    if (material.wasteCodes && material.wasteCodes.length > 0) {
      return material.wasteCodes.some(code => 
        code.startsWith('D0') || // RCRA characteristic hazardous
        code.startsWith('F') ||  // RCRA listed hazardous
        code.startsWith('K') ||  // RCRA listed hazardous
        code.startsWith('P') ||  // RCRA acute hazardous
        code.startsWith('U')     // RCRA hazardous
      );
    }

    // Check chemical composition and product name for hazardous materials
    const hazardousChemicals = [
      'acetone', 'methanol', 'ethanol', 'toluene', 'xylene', 'benzene',
      'methyl ethyl ketone', 'mek', 'butanone', '2-butanone', '2 butanone',
      'isopropanol', 'dichloromethane', 'chloroform', 'carbon tetrachloride',
      'hydrochloric', 'sulfuric', 'nitric', 'caustic', 'sodium hydroxide',
      'bleach', 'peroxide', 'cyanide', 'formaldehyde', 'mercury',
      'hexane', 'heptane', 'pentane', 'cyclohexane', 'tetrahydrofuran'
    ];
    
    // Check product name
    if (material.productName) {
      const productNameMatch = hazardousChemicals.some(haz => 
        material.productName.toLowerCase().includes(haz)
      );
      if (productNameMatch) return true;
    }
    
    // Check chemical composition
    if (material.composition && material.composition.length > 0) {
      return material.composition.some(comp => 
        hazardousChemicals.some(haz => 
          comp.name && comp.name.toLowerCase().includes(haz)
        )
      );
    }

    // Check UN numbers for hazardous materials
    if (material.unNumber) {
      return true; // UN numbers generally indicate hazardous materials
    }

    // Check flash point for flammable materials
    if (material.flashPoint !== undefined && material.flashPoint < 200) {
      return true;
    }

    // Default to non-hazardous if no indicators
    return false;
  };

  // Helper function to get hazard color coding
  const getHazardColor = (material) => {
    if (isHazardousMaterial(material)) {
      // Red for hazardous materials
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        badge: 'bg-red-500 text-white'
      };
    } else {
      // Green for non-hazardous materials
      return {
        bg: 'bg-green-50',
        border: 'border-green-200', 
        text: 'text-green-800',
        badge: 'bg-green-500 text-white'
      };
    }
  };

  // Helper function to get physical state color and icon
  const getPhysicalStateDisplay = (physicalState) => {
    switch (physicalState?.toLowerCase()) {
      case 'liquid':
        return {
          icon: '🧪',
          color: 'bg-blue-500 text-white',
          label: 'Liquid'
        };
      case 'solid':
        return {
          icon: '🧊',
          color: 'bg-gray-500 text-white',
          label: 'Solid'
        };
      case 'gas':
        return {
          icon: '💨',
          color: 'bg-purple-500 text-white',
          label: 'Gas'
        };
      case 'paste':
      case 'gel':
        return {
          icon: '🟫',
          color: 'bg-amber-500 text-white',
          label: 'Paste/Gel'
        };
      default:
        return {
          icon: '❓',
          color: 'bg-gray-400 text-white',
          label: 'Unknown'
        };
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'acids_bases_reagents': '🧪',
      'toxic_flammable_corrosive_pyrophoric_explosive': '☠️',
      'aerosols_compressed_gases': '🗲',
      'oxidizers': '🔥',
      'solvents': '🧴',
      'tsca_chemicals': '⚠️',
      'cleaning_disinfecting_agents': '🧽',
      'reactive_materials_metals': '⚡',
      'radioactive_materials': '☢️',
      'dea_substances': '💊',
      'inks_dyes_paints': '🎨',
      'organic_peroxides': '💥',
      'universal_wastes': '🔋',
      'mixed_waste': '🔀',
      'non_hazardous': '✅',
      'unknowns_unlabeled': '❓'
    };
    return icons[category] || '📦';
  };

  return (
    <>
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="p-6">
        <BackButton />
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">🧪 Lab Pack Planner</h1>
          <p className="text-gray-600">
            Comprehensive lab pack planning with material segregation and compatibility checking. Drag materials between packs to manually adjust classifications.
          </p>
        </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Job Filter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="jobFilter"
              checked={showJobFilter}
              onChange={(e) => {
                setShowJobFilter(e.target.checked);
                if (!e.target.checked) setSelectedJobId('');
              }}
            />
            <label htmlFor="jobFilter" className="text-sm font-medium">Filter by Job</label>
          </div>

          {showJobFilter && (
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded"
            >
              <option value="">All Jobs</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>
                  {job.jobNumber ? `#${job.jobNumber}` : ''} {job.title}
                </option>
              ))}
            </select>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setShowVolumeModal(true)}
              disabled={materials.length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
              title="Set container volumes and weights for better packing"
            >
              📏 Set Volumes
            </button>
            <button
              onClick={() => {
                console.log('🔬 Returning to SDS Analyzer from Lab Pack Planner');
                if (window.openTool) {
                  window.openTool('sds-analyzer');
                } else {
                  console.warn('window.openTool not available');
                }
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium"
            >
              🔬 Back to Analyzer
            </button>
            {(labPacks.length > 0 || materials.length > 0) && (
              <button
                onClick={handleAddToProject}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                📁 Add to Project
              </button>
            )}
            <button
              onClick={exportToPDF}
              disabled={labPacks.length === 0 && unpackableMaterials.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              📄 Export PDF
            </button>
            <button
              onClick={exportToExcel}
              disabled={labPacks.length === 0 && unpackableMaterials.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              📤 Export Excel
            </button>
            <button
              onClick={() => handleGenerateWasteProfile()}
              disabled={labPacks.length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
              title="Generate EPA-compliant waste profile from lab pack data"
            >
              📋 Generate Waste Profile
            </button>
            <button
              onClick={clearAllMaterials}
              disabled={materials.length === 0}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              🗑️ Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-3">📋 Material Classification Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hazard Status Legend */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Hazard Status:</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">HAZ</span>
                <span className="text-sm text-gray-600">Hazardous</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">NON-HAZ</span>
                <span className="text-sm text-gray-600">Non-Hazardous</span>
              </div>
            </div>
          </div>
          
          {/* Physical State Legend */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Physical State:</h4>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-blue-500 text-white">
                🧪 Liquid
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-gray-500 text-white">
                🧊 Solid
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 bg-purple-500 text-white">
                💨 Gas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 font-semibold">Total Materials</div>
          <div className="text-2xl font-bold text-blue-900">{materials.length}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-semibold">Lab Packs Created</div>
          <div className="text-2xl font-bold text-green-900">{labPacks.length}</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 font-semibold">Packable Materials</div>
          <div className="text-2xl font-bold text-yellow-900">
            {labPacks.reduce((sum, pack) => sum + pack.materials.length, 0)}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold">Cannot Pack</div>
          <div className="text-2xl font-bold text-red-900">{unpackableMaterials.length}</div>
        </div>
      </div>

      {/* Lab Packs */}
      {labPacks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Generated Lab Packs</h2>
          <div className="space-y-4">
            {labPacks.map((pack, packIndex) => (
              <div key={packIndex} className={`border rounded-lg p-4 ${getSegregationColor(pack.segregationLevel)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(pack.category)}</span>
                    <div>
                      <h3 className="font-bold">Pack #{packIndex + 1}</h3>
                      <div className="text-sm opacity-75">
                        {pack.description || `${pack.subcategory || pack.category} • ${pack.materials.length} materials`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Segregation: {pack.segregationLevel?.toUpperCase() || 'STANDARD'}
                    </div>
                    {pack.consolidatedWasteCodes && pack.consolidatedWasteCodes.length > 0 && (
                      <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-1">
                        Codes: {pack.consolidatedWasteCodes.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Container and DOT Information */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Container Size */}
                  <div className="p-2 bg-gray-50 rounded">
                    <div className="font-medium text-sm text-gray-900">Container:</div>
                    <div className="text-xs text-gray-700">
                      {pack.container_size || '30 gallon'} drum
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Volume: {((pack.total_volume || 0) / 1000).toFixed(1)}L / 
                      Weight: {(pack.total_weight || 0).toFixed(1)} lbs
                    </div>
                  </div>
                  
                  {/* DOT Shipping */}
                  {pack.dotShippingName && (
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="font-medium text-sm text-blue-900">DOT Shipping:</div>
                      <div className="text-xs text-blue-700">{pack.dotShippingName}</div>
                    </div>
                  )}
                </div>

                {pack.specialHandling?.length > 0 && (
                  <div className="mb-3 p-2 bg-white bg-opacity-50 rounded">
                    <div className="font-medium text-sm">Special Handling:</div>
                    <ul className="text-xs ml-4">
                      {pack.specialHandling.map((handling, idx) => (
                        <li key={idx}>• {handling}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Droppable droppableId={`pack-${packIndex}`}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 min-h-16 p-2 rounded ${
                        snapshot.isDraggingOver ? 'bg-blue-100 border-2 border-blue-300' : ''
                      }`}
                    >
                      {pack.materials.map((material, materialIndex) => (
                        <Draggable 
                          key={`material-${materialIndex}`} 
                          draggableId={`material-${materialIndex}-pack-${packIndex}`} 
                          index={materialIndex}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${getHazardColor(material).bg} ${getHazardColor(material).border} border-2 rounded p-3 flex justify-between items-center cursor-move transition-all ${
                                snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : ''
                              }`}
                            >
                              <div className="flex-1">
                                <div className={`font-medium ${getHazardColor(material).text}`}>{material.productName || 'Unknown Material'}</div>
                                <div className="text-sm opacity-75 flex items-center gap-2 mt-1">
                                  <span>Job: {material.jobTitle || 'No Job'}</span>
                                  {material.jobNumber && <span>(#{material.jobNumber})</span>}
                                  {material.pH && <span>• pH: {material.pH}</span>}
                                  {material.labReport && <span>• Lab Report</span>}
                                </div>
                                {material.chemicalCategoryName && (
                                  <div className="text-xs text-purple-600 mt-1">
                                    Category: {material.chemicalCategoryName}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Hazard Status Badge */}
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${getHazardColor(material).badge}`}>
                                  {isHazardousMaterial(material) ? 'HAZ' : 'NON-HAZ'}
                                </span>
                                
                                {/* Physical State Badge */}
                                {material.physicalState && (
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getPhysicalStateDisplay(material.physicalState).color}`}>
                                    {getPhysicalStateDisplay(material.physicalState).icon}
                                    {getPhysicalStateDisplay(material.physicalState).label}
                                  </span>
                                )}
                                {material.labData && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Lab: {material.labData.labNumber} • Sampled: {material.labData.sampledDate}
                                  </div>
                                )}
                                {material.classification?.hazardous && (
                                  <div className="text-xs text-red-600 mt-1 font-medium">
                                    🚨 HAZARDOUS: {material.classification.dCodes?.join(', ') || 'Classified'}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">📋 Drag</span>
                                <button
                                  onClick={() => removeMaterial(materialIndex, packIndex)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {pack.materials.length === 0 && (
                        <div className="text-center text-gray-400 py-4 border-2 border-dashed border-gray-300 rounded">
                          Drag materials here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpackable Materials */}
      {unpackableMaterials.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-red-800 mb-4">⚠️ Materials That Cannot Be Lab Packed</h2>
          <Droppable droppableId="unpackable">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-3 min-h-16 p-3 rounded-lg border-2 border-dashed ${
                  snapshot.isDraggingOver 
                    ? 'bg-red-100 border-red-400' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {unpackableMaterials.map((material, index) => (
                  <Draggable 
                    key={`unpackable-${index}`} 
                    draggableId={`material-${index}-unpackable`} 
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-red-50 border border-red-200 rounded-lg p-4 cursor-move transition-all ${
                          snapshot.isDragging ? 'shadow-lg rotate-2 scale-105' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-red-800">{material.productName || 'Unknown Material'}</div>
                            <div className="text-sm text-red-600 mt-1">
                              <strong>Reason:</strong> {material.reason}
                            </div>
                            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                              <span>Job: {material.jobTitle || 'No Job'}</span>
                              {material.jobNumber && <span>(#{material.jobNumber})</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Hazard Status Badge - Always hazardous for unpackable */}
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                              HAZ
                            </span>
                            
                            {/* Physical State Badge */}
                            {material.physicalState && (
                              <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${getPhysicalStateDisplay(material.physicalState).color}`}>
                                {getPhysicalStateDisplay(material.physicalState).icon}
                                {getPhysicalStateDisplay(material.physicalState).label}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-gray-400 text-xs">📋 Drag</span>
                          <button
                            onClick={() => removeMaterial(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      )}

      {/* Empty State */}
      {materials.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧪</div>
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Materials in Queue</h3>
          <p className="text-gray-500">
            Use the SDS Analyzer to add materials to the lab pack queue.
          </p>
        </div>
      )}


      </div>
    </DragDropContext>

    {/* Waste Profile Modal */}
    {showWasteProfileModal && generatedProfile && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 Generated Waste Profile</h2>
              <button
                onClick={() => setShowWasteProfileModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            {/* Profile Overview */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">{generatedProfile.profileName}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Materials:</span> {generatedProfile.materialCount}
                </div>
                <div>
                  <span className="font-medium">Containers:</span> {generatedProfile.estimatedContainerCount}
                </div>
                <div>
                  <span className="font-medium">Total Volume:</span> {generatedProfile.totalVolume}ml
                </div>
              </div>
            </div>

            {/* Waste Description */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Waste Description:</h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{generatedProfile.wasteDescription}</p>
            </div>

            {/* DOT Shipping Classifications */}
            {generatedProfile.dotClassifications.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">DOT Shipping Classifications:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {generatedProfile.dotClassifications.map((dotClass, index) => (
                    <div key={index} className="bg-orange-50 border border-orange-200 p-3 rounded text-sm">
                      <div className="font-medium text-orange-800">{dotClass.hazardClass}</div>
                      <div className="text-orange-700">{dotClass.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RCRA Classifications */}
            {generatedProfile.rcraClassifications.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">RCRA Waste Classifications:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {generatedProfile.rcraClassifications.map((rcra, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 p-3 rounded text-sm">
                      <div className="font-medium text-red-800">{rcra.code}</div>
                      <div className="text-red-700">{rcra.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lab Pack Details */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">Lab Pack Breakdown:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {generatedProfile.labPackDetails.map((pack, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                    <div className="font-medium text-green-800">Pack #{index + 1} - {pack.category}</div>
                    <div className="text-green-700">Materials: {pack.materialCount} | Volume: {pack.totalVolume}ml</div>
                    {pack.materials.length > 0 && (
                      <div className="mt-1 text-xs text-green-600">
                        {pack.materials.map(m => m.productName).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button
                onClick={() => handleExportWasteProfile(generatedProfile, 'json')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                📄 Export JSON
              </button>
              <button
                onClick={() => handleExportWasteProfile(generatedProfile, 'manifest')}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
              >
                📋 Export Manifest
              </button>
              <button
                onClick={() => handleExportWasteProfile(generatedProfile, 'shipping')}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                🚛 Export Shipping
              </button>
              <button
                onClick={() => setShowWasteProfileModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Project Modal */}
    {showProjectModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-bold mb-4">Add to Project</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Existing Project:</label>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2"
            >
              <option value="">-- Select Project --</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.jobNumber})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">Or create a new project below</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">New Project Details:</label>
            <input
              type="text"
              placeholder="Project Name"
              value={newProjectData.name}
              onChange={(e) => setNewProjectData({...newProjectData, name: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
            />
            
            <input
              type="text"
              placeholder="Client Name"
              value={newProjectData.client}
              onChange={(e) => setNewProjectData({...newProjectData, client: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
            />
            
            <input
              type="text"
              placeholder="Job Number"
              value={newProjectData.jobNumber}
              onChange={(e) => setNewProjectData({...newProjectData, jobNumber: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
            />
            
            <textarea
              placeholder="Project Description"
              value={newProjectData.description}
              onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3"
              rows="3"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowProjectModal(false);
                setSelectedProjectId('');
                setNewProjectData({ name: '', description: '', client: '', jobNumber: '' });
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!newProjectData.name.trim()}
              className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Create & Add
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Volume Input Modal */}
    {showVolumeModal && (
      <MaterialVolumeInput
        materials={materials}
        onVolumeUpdate={handleVolumeUpdate}
        onClose={() => setShowVolumeModal(false)}
      />
    )}

    {showClassificationDialog && ambiguousMaterial && (
      <MaterialClassificationDialog
        material={ambiguousMaterial}
        ambiguousTypes={ambiguousMaterial.ambiguous_types}
        onClassify={handleMaterialClassification}
        onCancel={handleClassificationCancel}
      />
    )}

    </>
  );
};

export default LabPackPlanner;
