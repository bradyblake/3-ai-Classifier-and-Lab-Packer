// File: KanbanBoard.jsx - Location/Status Grid with Revenue Tracking
import React, { useEffect, useState, useContext } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableCard from "./DraggableCard";
import DropZone from "./DropZone";
import DraggableLaneHeader from "./DraggableLaneHeader";
import DraggableStatusHeader from "./DraggableStatusHeader";
import ReportsModal from "./ReportsModal";
import KanbanCardModal from "./KanbanCardModal";
import KanbanSetupPanel from "./KanbanSetupPanel";
import ProjectAutomationPanel from "./ProjectAutomationPanel";
import CustomerAutoPopulateModal from "./CustomerAutoPopulateModal";
import RecurringTemplatesModal from "./RecurringTemplatesModal";
import FileLinkingPanel from "./FileLinkingPanel";
import EndOfPeriodModal from "./EndOfPeriodModal";
import RecurringJobModal from "./RecurringJobModal";
import "../styles/KanbanBoard.css";
import { ModalContext } from "../context/ModalContext";
import { ThemeContext } from "../context/ThemeContext.jsx";
import BackButton from "./BackButton";
import { useAuth } from "../hooks/useAuth";
import LoginModal from "./LoginModal";
import UserProfile from "./UserProfile";
import {
  getLanes,
  getStatuses,
  getCards,
  saveCards,
  saveLanes,
  saveStatuses,
  getStatusRevenueCategory,
} from "../shared/utils/kanbanUtils.jsx";
import { generateProjectNumber, updateCardLaneHistory } from "../utils/projectNumberUtils.js";
import customerProfileManager from "../utils/customerProfileManager.js";
import manifestGenerator from "../utils/manifestGenerator.js";
import { checkAndCreateRecurringJobs, updateRecurringJob } from "../utils/recurringJobScheduler";

const KanbanBoard = () => {
  const [cards, setCards] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [modalLane, setModalLane] = useState('');
  const [modalStatus, setModalStatus] = useState('');
  const [setupPanelOpen, setSetupPanelOpen] = useState(false);
  const [customerAutoPopulateOpen, setCustomerAutoPopulateOpen] = useState(false);
  const [pendingCardLocation, setPendingCardLocation] = useState({ lane: '', status: '' });
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [selectedCardForManifest, setSelectedCardForManifest] = useState(null);
  const [generatedManifest, setGeneratedManifest] = useState(null);
  const [recurringTemplatesOpen, setRecurringTemplatesOpen] = useState(false);
  const [selectedCardForTemplate, setSelectedCardForTemplate] = useState(null);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [bulkOperationsOpen, setBulkOperationsOpen] = useState(false);
  const [selectedCards, setSelectedCards] = useState([]);
  const [eopModalOpen, setEopModalOpen] = useState(false);
  const [recurringJobModalOpen, setRecurringJobModalOpen] = useState(false);
  const [selectedCardForRecurring, setSelectedCardForRecurring] = useState(null);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [quickWorkflowsOpen, setQuickWorkflowsOpen] = useState(false);
  const [smartUploadOpen, setSmartUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { themeColors } = useContext(ThemeContext);

  // Authentication
  const { currentUser } = useAuth();

  // Load data on mount
  useEffect(() => {
    console.log('🔧 KanbanBoard mounting...');
    const storedCards = getCards();
    let storedLanes = getLanes();
    let storedStatuses = getStatuses();
    
    // Listen for daily planner focus events
    const handleFocusCard = (event) => {
      const { cardId } = event.detail;
      const targetCard = storedCards.find(card => card.id === cardId);
      if (targetCard) {
        setEditingCard(targetCard);
        setModalOpen(true);
      }
    };
    
    window.addEventListener('focusKanbanCard', handleFocusCard);
    
    // Expose comprehensive platform API for JARVIS
    window.createProjectCard = handleCustomerAutoPopulateProject;
    window.kanbanAPI = {
      // CRUD Operations
      createCard: (projectData) => {
        // If a lane is specified, generate project number with abbreviation
        if (projectData.lane) {
          const lane = lanes.find(l => l.name === projectData.lane || l.id === projectData.lane);
          if (lane && lane.abbreviation) {
            // Increment lane's project counter
            const currentCounter = lane.projectCounter || 0;
            const newCounter = currentCounter + 1;
            
            // Generate project number: ABBR-YYYY-####
            const year = new Date().getFullYear();
            const projectNumber = `${lane.abbreviation}-${year}-${String(newCounter).padStart(4, '0')}`;
            
            // Update lane counter
            const updatedLanes = lanes.map(l => 
              l.id === lane.id ? { ...l, projectCounter: newCounter } : l
            );
            setLanes(updatedLanes);
            saveLanes(updatedLanes);
            
            // Add project number to project data
            projectData.projectNumber = projectNumber;
            console.log(`📋 Generated project number: ${projectNumber}`);
          }
        }
        
        // Call the original project creation function
        return handleCustomerAutoPopulateProject(projectData);
      },
      updateCard: handleSaveCard,
      deleteCard: (cardId) => {
        const updatedCards = cards.filter(card => card.id !== cardId);
        setCards(updatedCards);
        saveCards(updatedCards);
        console.log('🗑️ Deleted project card:', cardId);
        return true;
      },
      moveCard: (cardId, newStatus, newLane = null) => {
        const updatedCards = cards.map(card =>
          card.id === cardId ? { ...card, status: newStatus, lane: newLane || card.lane } : card
        );
        setCards(updatedCards);
        saveCards(updatedCards);
        console.log('📦 Moved card to:', newStatus);
        return true;
      },
      
      // Bulk Operations
      bulkUpdate: handleBulkUpdate,
      duplicateCard: (cardId) => {
        const originalCard = cards.find(card => card.id === cardId);
        if (originalCard) {
          const newCard = {
            ...originalCard,
            id: Date.now(),
            title: `${originalCard.title} (Copy)`,
            jobNumber: generateProjectNumber(originalCard.location, lanes, cards),
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          };
          const updatedCards = [...cards, newCard];
          setCards(updatedCards);
          saveCards(updatedCards);
          console.log('📋 Duplicated card:', newCard.jobNumber);
          return newCard;
        }
        return null;
      },
      
      // Lane Management
      createLane: (laneName, color = '#3B82F6') => {
        const newLane = {
          id: Date.now() + Math.random(), // More unique ID generation
          name: laneName,
          color: color,
          created: new Date().toISOString()
        };
        const updatedLanes = [...lanes, newLane];
        setLanes(updatedLanes);
        saveLanes(updatedLanes);
        console.log('➕ Created new lane:', laneName);
        return newLane;
      },
      
      createLaneWithId: (laneId, laneName, color = '#3B82F6') => {
        // Check if lane with this ID already exists
        if (lanes.some(lane => lane.id === laneId)) {
          console.warn(`⚠️ Lane with ID ${laneId} already exists`);
          return null;
        }
        
        const newLane = {
          id: laneId, // Use the provided ID/abbreviation
          abbreviation: laneId, // Store abbreviation for project numbering
          name: laneName,
          color: color,
          created: new Date().toISOString(),
          projectCounter: 0 // Initialize project counter for this lane
        };
        const updatedLanes = [...lanes, newLane];
        setLanes(updatedLanes);
        saveLanes(updatedLanes);
        console.log(`➕ Created new lane: ${laneName} (ID/Abbr: ${laneId})`);
        
        // Store abbreviation mapping for project numbering
        const abbrevMappings = JSON.parse(localStorage.getItem('laneAbbreviations') || '{}');
        abbrevMappings[laneName] = laneId;
        localStorage.setItem('laneAbbreviations', JSON.stringify(abbrevMappings));
        
        return newLane;
      },
      
      // Status Management
      createStatus: (statusName, category = 'active') => {
        const newStatus = {
          name: statusName,
          category: category,
          created: new Date().toISOString()
        };
        const updatedStatuses = [...statuses, newStatus];
        setStatuses(updatedStatuses);
        saveStatuses(updatedStatuses);
        console.log('🏷️ Created new status:', statusName);
        return newStatus;
      },
      
      // Data Access
      getAllCards: () => cards,
      getCardById: (cardId) => cards.find(card => card.id === cardId),
      getCardsByStatus: (status) => cards.filter(card => card.status === status),
      getCardsByCustomer: (customerName) => cards.filter(card => 
        card.vendor === customerName || card.customerName === customerName
      ),
      searchCards: (searchTerm) => cards.filter(card =>
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      ),
      
      // Analysis Functions
      getProjectStats: () => {
        const stats = {
          total: cards.length,
          byStatus: statuses.map(status => ({
            status: status.name,
            count: cards.filter(card => card.status === status.name).length,
            revenue: cards
              .filter(card => card.status === status.name)
              .reduce((sum, card) => sum + (parseFloat(card.revenue) || 0), 0)
          })),
          totalRevenue: cards.reduce((sum, card) => sum + (parseFloat(card.revenue) || 0), 0),
          averageValue: cards.length > 0 
            ? cards.reduce((sum, card) => sum + (parseFloat(card.revenue) || 0), 0) / cards.length 
            : 0
        };
        console.log('📊 Generated project stats:', stats);
        return stats;
      }
    };
    
    // Fallback test data if none exists
    if (storedLanes.length === 0) {
      storedLanes = [
        { id: 'houston', name: 'Houston', color: '#16a34a', abbreviation: 'HOU' },
        { id: 'dallas', name: 'Dallas', color: '#0284c7', abbreviation: 'DAL' }
      ];
      saveLanes(storedLanes);
      console.log('📊 Using fallback lanes');
    }

    if (storedStatuses.length === 0) {
      storedStatuses = [
        { id: 'lead', name: 'Lead', color: '#6b7280', revenueCategory: 'Pipeline' },
        { id: 'quoted', name: 'Quoted', color: '#f59e0b', revenueCategory: 'Pipeline' },
        { id: 'contracted', name: 'Contracted', color: '#0ea5e9', revenueCategory: 'Projected' },
        { id: 'active', name: 'Active', color: '#8b5cf6', revenueCategory: 'Projected' },
        { id: 'completed', name: 'Completed', color: '#22c55e', revenueCategory: 'Actual' }
      ];
      saveStatuses(storedStatuses);
      console.log('📊 Using fallback statuses');
    }

    console.log('📊 Final data:', {
      cards: storedCards,
      lanes: storedLanes,
      statuses: storedStatuses
    });
    console.log('📊 Cards count:', storedCards.length);
    console.log('📊 Lanes count:', storedLanes.length);
    console.log('📊 Statuses count:', storedStatuses.length);
    console.log('📊 Lane structure:', storedLanes);
    console.log('📊 Status structure:', storedStatuses);

    setCards(storedCards);
    setLanes(storedLanes);
    setStatuses(storedStatuses);

    // Check for recurring jobs that need to be created
    setTimeout(() => {
      const updatedCards = checkAndCreateRecurringJobs(storedCards, storedLanes, saveCards);
      if (updatedCards !== storedCards) {
        setCards(updatedCards);
      }
    }, 1000); // Delay to ensure all data is loaded

    return () => {
      window.removeEventListener('focusKanbanCard', handleFocusCard);
      delete window.createProjectCard;
      delete window.kanbanAPI;
    };
  }, []);

  // Calculate revenue metrics by category
  const calculateRevenue = () => {
    let pipeline = 0;
    let projected = 0;
    let actual = 0;

    console.log('💰 Starting revenue calculation with', cards.length, 'cards');

    const revenueByStatus = statuses.reduce((acc, status) => {
      const statusCards = cards.filter(card => card.status === status.name);

      // Calculate revenue for each card individually to apply scheduling criteria
      let statusRevenue = 0;
      statusCards.forEach(card => {
        const cardRevenue = parseFloat(card.revenue) || 0;
        statusRevenue += cardRevenue;

        // Apply scheduling criteria for revenue categorization
        const category = getStatusRevenueCategory(status.name, card, statuses);
        console.log(`📊 Card "${card.title}" (${card.status}): $${cardRevenue} → ${category}`);

        if (category === "Pipeline") {
          pipeline += cardRevenue;
        } else if (category === "Projected") {
          projected += cardRevenue;
        } else if (category === "Actual") {
          actual += cardRevenue;
        }
      });

      acc[status.name] = statusRevenue;
      return acc;
    }, {});

    const totalRevenue = pipeline + projected + actual;

    // Get quota from localStorage or use default
    const storedQuotas = localStorage.getItem('kanban_quotas');
    let quota = 500000; // Default quota

    if (storedQuotas) {
      try {
        const quotas = JSON.parse(storedQuotas);
        const activeQuota = quotas.find(q => q.active && new Date(q.startDate) <= new Date() && new Date(q.endDate) >= new Date());
        if (activeQuota) {
          quota = parseInt(activeQuota.target) || 500000;
        }
      } catch (error) {
        console.warn('Error parsing quotas:', error);
      }
    }

    const percentage = quota > 0 ? ((actual / quota) * 100).toFixed(1) : '0.0';

    console.log('💰 Revenue calculation results:', {
      pipeline: `$${pipeline.toLocaleString()}`,
      projected: `$${projected.toLocaleString()}`,
      actual: `$${actual.toLocaleString()}`,
      total: `$${totalRevenue.toLocaleString()}`,
      quota: `$${quota.toLocaleString()}`,
      percentage: `${percentage}%`,
      calculation: `${actual} / ${quota} = ${percentage}%`
    });

    return {
      total: totalRevenue,
      pipeline,
      projected,
      actual,
      byStatus: revenueByStatus,
      quota,
      percentage
    };
  };

  const revenue = calculateRevenue();

  // Functions to reorder lanes and statuses
  const moveLane = (fromIndex, toIndex) => {
    const newLanes = [...lanes];
    const [movedLane] = newLanes.splice(fromIndex, 1);
    newLanes.splice(toIndex, 0, movedLane);
    setLanes(newLanes);
    saveLanes(newLanes);
  };

  const moveStatus = (fromIndex, toIndex) => {
    const newStatuses = [...statuses];
    const [movedStatus] = newStatuses.splice(fromIndex, 1);
    newStatuses.splice(toIndex, 0, movedStatus);
    setStatuses(newStatuses);
    saveStatuses(newStatuses);
  };

  // Handle card drop
  const handleDrop = (item, newLane, newStatus) => {
    console.log('🔄 Handling drop:', { item, newLane, newStatus });
    console.log('🔍 Current cards array:', cards);
    console.log('🔍 Looking for card with ID:', item.id);
    console.log('🔍 Item object:', item);
    
    // Find the card being moved
    const cardToMove = cards.find(card => card.id === item.id);
    if (!cardToMove) {
      console.error('❌ Card not found:', item.id);
      console.error('❌ Available card IDs:', cards.map(c => c.id));
      return;
    }
    
    console.log('📦 Found card to move:', cardToMove);
    console.log('📦 Card current location/status:', { location: cardToMove.location, status: cardToMove.status });
    console.log('📦 Moving to new location/status:', { newLane, newStatus });
    
    // Update the card with new location and status using lane history tracking
    const updatedCards = cards.map((card) =>
      card.id === item.id
        ? {
            ...updateCardLaneHistory(card, newLane, newStatus),
            updated: new Date().toISOString() // Update timestamp when card is moved
          }
        : card
    );
    
    console.log('✅ Updated cards array:', updatedCards);
    console.log('✅ Updated card:', updatedCards.find(c => c.id === item.id));
    
    setCards(updatedCards);
    saveCards(updatedCards);
    console.log('💾 Cards saved to localStorage');
  };

  // Open modal for new card
  const openNewCardModal = (lane, status, customerName = '') => {
    setModalLane(lane);
    setModalStatus(status);
    
    // Generate automatic project number
    const projectNumber = generateProjectNumber(lane, lanes, cards);
    
    // Get customer auto-population suggestions if customer name provided
    let autoPopulationData = {};
    if (customerName) {
      const suggestions = customerProfileManager.getAutoPopulationSuggestions(customerName);
      if (suggestions && suggestions.suggestions.confidence > 0.3) {
        autoPopulationData = {
          title: `${customerName} - ${status}`,
          vendor: customerName,
          revenue: suggestions.suggestions.estimatedRevenue?.toString() || '',
          location: suggestions.suggestions.preferredLocation || lane,
          description: `Auto-populated from customer profile (${Math.round(suggestions.suggestions.confidence * 100)}% confidence)`,
          tags: suggestions.suggestions.commonMaterials.slice(0, 3).map(m => m.productName) || []
        };
        console.log('🤖 Auto-populated project data:', autoPopulationData);
      }
    }
    
    setEditingCard({
      id: Date.now(),
      title: autoPopulationData.title || '',
      jobNumber: projectNumber,
      location: autoPopulationData.location || lane,
      status: status,
      revenue: autoPopulationData.revenue || '',
      vendor: autoPopulationData.vendor || '',
      disposal: '',
      description: autoPopulationData.description || '',
      attachments: [],
      scheduledDate: '',
      estimatedCompletionDate: '',
      actualStartDate: '',
      actualCompletionDate: '',
      dueDate: '',
      priority: 'Medium',
      assignedTo: '',
      tags: autoPopulationData.tags || [],
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      autoPopulated: !!customerName && !!autoPopulationData.title
    });
    setModalOpen(true);
  };

  // Open modal for existing card
  const openEditCardModal = (card) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  // Save card from modal
  const handleSaveCard = (cardData) => {
    console.log('💾 handleSaveCard called with:', cardData);
    console.log('💾 Card data location/status:', { location: cardData.location, status: cardData.status });
    console.log('💾 Card data revenue:', cardData.revenue);
    
    // Update customer profile if job is completed
    if (cardData.vendor && cardData.status === 'Job Complete') {
      const jobData = {
        customerName: cardData.vendor,
        jobNumber: cardData.jobNumber,
        location: cardData.location,
        revenue: parseFloat(cardData.revenue) || 0,
        completedDate: new Date().toISOString(),
        jobType: 'project-card',
        materials: [], // This could be populated from linked lab packs
        labPacks: [] // This could be populated from linked lab packs
      };
      
      customerProfileManager.addJobToHistory(jobData);
      console.log('🤖 Updated customer profile for:', cardData.vendor);
    }
    
    if (cards.find(c => c.id === cardData.id)) {
      // Update existing card
      console.log('💾 Updating existing card');
      const updatedCards = cards.map(c => c.id === cardData.id ? cardData : c);
      console.log('💾 Updated cards after save:', updatedCards);
      setCards(updatedCards);
      saveCards(updatedCards);
    } else {
      // Add new card
      console.log('💾 Adding new card');
      const newCards = [...cards, cardData];
      console.log('💾 New cards array:', newCards);
      setCards(newCards);
      saveCards(newCards);
    }
    setModalOpen(false);
    setEditingCard(null);
  };

  // Handle automated card updates from PM assistant
  const handleAutomatedUpdate = (cardId, updates) => {
    const updatedCards = cards.map(card => 
      card.id === cardId ? { ...card, ...updates } : card
    );
    setCards(updatedCards);
    saveCards(updatedCards);
  };

  // Handle bulk updates
  const handleBulkUpdate = (cardIds, updates) => {
    const updatedCards = cards.map(card => 
      cardIds.includes(card.id) ? { ...card, ...updates } : card
    );
    setCards(updatedCards);
    saveCards(updatedCards);
  };

  // Handle creating project from customer auto-populate
  const handleCustomerAutoPopulateProject = (projectData) => {
    const { customerName, location, status, estimatedRevenue, commonMaterials, confidence, autoPopulated } = projectData;
    
    // Generate project number
    const projectNumber = generateProjectNumber(location, lanes, cards);
    
    // Create the project card with auto-populated data
    const newCard = {
      id: Date.now(),
      title: `${customerName} - ${status}`,
      jobNumber: projectNumber,
      location: location,
      status: status,
      revenue: estimatedRevenue?.toString() || '',
      vendor: customerName,
      disposal: '',
      description: autoPopulated 
        ? `Auto-populated from customer profile (${Math.round(confidence * 100)}% confidence)\n\nCommon materials: ${commonMaterials?.slice(0, 5).map(m => m.productName).join(', ') || 'None'}`
        : `New project for ${customerName}`,
      attachments: [],
      scheduledDate: '',
      estimatedCompletionDate: '',
      actualStartDate: '',
      actualCompletionDate: '',
      dueDate: '',
      priority: 'Medium',
      assignedTo: '',
      tags: commonMaterials?.slice(0, 3).map(m => m.productName) || [],
      dependencies: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      autoPopulated: autoPopulated,
      customerProfile: {
        confidence: confidence || 0,
        suggestedMaterials: commonMaterials || []
      }
    };

    const newCards = [...cards, newCard];
    setCards(newCards);
    saveCards(newCards);
    
    console.log('🤖 Created auto-populated project card:', newCard);
  };

  // Open smart card creation modal
  const openSmartCardModal = (lane, status) => {
    setPendingCardLocation({ lane, status });
    setCustomerAutoPopulateOpen(true);
  };

  // Generate manifest from project card
  const handleGenerateManifest = (card) => {
    try {
      const manifest = manifestGenerator.generateFromProjectCard(card, {
        generatorName: 'unboXed Environmental Services',
        generatorAddress: '123 Industrial Blvd, Houston, TX 77001',
        generatorContact: 'Environmental Manager',
        generatorPhone: '(713) 555-0123',
        emergencyPhone: 'CHEMTREC 1-800-424-9300',
        generatorEpaId: 'TXD987654321'
      });

      setGeneratedManifest(manifest);
      setSelectedCardForManifest(card);
      setManifestModalOpen(true);
      
      console.log('✅ Generated manifest for card:', card.jobNumber, manifest);
    } catch (error) {
      console.error('Error generating manifest:', error);
      alert(`Failed to generate manifest: ${error.message}`);
    }
  };

  // Save generated manifest
  const handleSaveManifest = (manifest) => {
    manifestGenerator.saveManifest(manifest);
    setManifestModalOpen(false);
    setGeneratedManifest(null);
    setSelectedCardForManifest(null);
    alert(`Manifest "${manifest.manifestNumber}" saved successfully!`);
  };

  // Export manifest in various formats
  const handleExportManifest = (manifest, format) => {
    try {
      let blob, fileName;
      
      if (format === 'pdf' || format === 'shipping') {
        const pdf = manifestGenerator.exportManifest(manifest, format);
        const pdfBlob = pdf.output('blob');
        blob = pdfBlob;
        fileName = `${manifest.manifestNumber}_${format}.pdf`;
      } else {
        const exportData = manifestGenerator.exportManifest(manifest, format);
        blob = new Blob([exportData], { 
          type: format === 'json' ? 'application/json' : 'text/csv'
        });
        fileName = `${manifest.manifestNumber}.${format}`;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`✅ Exported manifest as ${format}:`, fileName);
    } catch (error) {
      console.error('Error exporting manifest:', error);
      alert(`Failed to export manifest: ${error.message}`);
    }
  };

  // Get cards for a specific location/status intersection
  const getCardsForCell = (location, status) => {
    return cards.filter(card => card.location === location && card.status === status);
  };

  // Bulk Operations Functions
  const handleBulkStatusUpdate = (cardIds, newStatus) => {
    const currentDate = new Date().toISOString();
    const updatedCards = cards.map(card => {
      if (cardIds.includes(card.id)) {
        const statusHistory = card.statusHistory || [];
        const newStatusEntry = {
          status: newStatus,
          timestamp: currentDate,
          previousStatus: card.status || 'New',
          automatedBy: 'Bulk Operation'
        };

        const comments = card.comments || [];
        const bulkComment = {
          id: Date.now() + Math.random(),
          text: `🔄 Status updated via bulk operation: ${card.status || 'New'} → ${newStatus}`,
          timestamp: currentDate,
          author: 'System',
          type: 'bulk-operation'
        };

        return {
          ...card,
          status: newStatus,
          statusHistory: [...statusHistory, newStatusEntry],
          comments: [...comments, bulkComment],
          updated: currentDate
        };
      }
      return card;
    });

    setCards(updatedCards);
    saveCards(updatedCards);
    alert(`✅ Updated status for ${cardIds.length} cards to "${newStatus}"`);
  };

  const handleBulkPriorityUpdate = (cardIds, newPriority) => {
    const currentDate = new Date().toISOString();
    const updatedCards = cards.map(card => {
      if (cardIds.includes(card.id)) {
        const comments = card.comments || [];
        const bulkComment = {
          id: Date.now() + Math.random(),
          text: `🔥 Priority updated via bulk operation: ${card.priority || 'None'} → ${newPriority || 'None'}`,
          timestamp: currentDate,
          author: 'System',
          type: 'bulk-operation'
        };

        return {
          ...card,
          priority: newPriority,
          comments: [...comments, bulkComment],
          updated: currentDate
        };
      }
      return card;
    });

    setCards(updatedCards);
    saveCards(updatedCards);
    alert(`✅ Updated priority for ${cardIds.length} cards to "${newPriority || 'None'}"`);
  };

  const handleBulkAssignmentUpdate = (cardIds, assignedTo) => {
    const currentDate = new Date().toISOString();
    const updatedCards = cards.map(card => {
      if (cardIds.includes(card.id)) {
        const comments = card.comments || [];
        const bulkComment = {
          id: Date.now() + Math.random(),
          text: `👤 Assigned via bulk operation: ${assignedTo}`,
          timestamp: currentDate,
          author: 'System',
          type: 'bulk-operation'
        };

        return {
          ...card,
          assignedTo,
          comments: [...comments, bulkComment],
          updated: currentDate
        };
      }
      return card;
    });

    setCards(updatedCards);
    saveCards(updatedCards);
    alert(`✅ Assigned ${cardIds.length} cards to "${assignedTo}"`);
  };

  const handleBulkCommentAdd = (cardIds, comment) => {
    const currentDate = new Date().toISOString();
    const updatedCards = cards.map(card => {
      if (cardIds.includes(card.id)) {
        const comments = card.comments || [];
        const bulkComment = {
          id: Date.now() + Math.random(),
          text: `💬 Bulk Comment: ${comment}`,
          timestamp: currentDate,
          author: 'User',
          type: 'bulk-comment'
        };

        return {
          ...card,
          comments: [...comments, bulkComment],
          updated: currentDate
        };
      }
      return card;
    });

    setCards(updatedCards);
    saveCards(updatedCards);
    alert(`✅ Added comment to ${cardIds.length} cards`);
  };

  const handleBulkExport = (cardIds, format) => {
    const selectedCardsData = cards.filter(card => cardIds.includes(card.id));

    let exportData, fileName, mimeType;

    if (format === 'csv') {
      const headers = ['ID', 'Title', 'Customer', 'Location', 'Status', 'Priority', 'Revenue', 'Created', 'Updated'];
      const csvRows = selectedCardsData.map(card => [
        card.id,
        `"${(card.title || '').replace(/"/g, '""')}"`,
        `"${(card.customerName || '').replace(/"/g, '""')}"`,
        card.location || '',
        card.status || '',
        card.priority || '',
        card.revenue || '',
        card.created || '',
        card.updated || ''
      ]);
      exportData = [headers, ...csvRows].map(row => row.join(',')).join('\n');
      fileName = `kanban_bulk_export_${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else {
      exportData = JSON.stringify(selectedCardsData, null, 2);
      fileName = `kanban_bulk_export_${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([exportData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✅ Exported ${cardIds.length} cards as ${format.toUpperCase()}`);
  };

  // Quick Project Creation Templates
  const createQuickProject = (template) => {
    const currentDate = new Date().toISOString();
    const defaultLocation = lanes.length > 0 ? lanes[0].name : '';

    const templates = {
      emergency: {
        title: 'Emergency Environmental Response',
        customerName: '',
        location: defaultLocation,
        status: 'Lead',
        priority: 'Critical',
        description: 'High-priority environmental emergency requiring immediate response. Includes spill cleanup, hazardous material containment, and regulatory compliance.',
        tags: ['emergency', 'high-priority', 'hazmat'],
        estimatedDuration: 1, // days
        responseTime: '4 hours',
        requiredCertifications: ['HAZMAT', 'Emergency Response'],
        comments: [{
          id: Date.now(),
          text: '🚨 Emergency project created via quick template. Immediate response required.',
          timestamp: currentDate,
          author: 'System',
          type: 'template'
        }]
      },
      labpack: {
        title: 'Routine Laboratory Chemical Waste Pack-Out',
        customerName: '',
        location: defaultLocation,
        status: 'Lead',
        priority: 'Medium',
        description: 'Standard laboratory chemical waste collection, sorting, and packaging for safe disposal according to EPA regulations.',
        tags: ['lab-pack', 'routine', 'chemicals'],
        estimatedDuration: 14, // days
        requiredEquipment: ['Chemical containers', 'PPE', 'Labeling materials'],
        comments: [{
          id: Date.now(),
          text: '🧪 Lab pack project created. Standard 2-week timeline for chemical waste processing.',
          timestamp: currentDate,
          author: 'System',
          type: 'template'
        }]
      },
      'tank-cleaning': {
        title: 'Industrial Tank Cleaning & Decontamination',
        customerName: '',
        location: defaultLocation,
        status: 'Lead',
        priority: 'High',
        description: 'Professional cleaning and decontamination of industrial storage tanks, including confined space entry procedures and safety protocols.',
        tags: ['tank-cleaning', 'industrial', 'confined-space'],
        estimatedDuration: 7, // days
        safetyRequirements: ['Confined space permit', 'Gas monitoring', 'Rescue standby'],
        comments: [{
          id: Date.now(),
          text: '🛢️ Tank cleaning project initialized. Confined space safety protocols required.',
          timestamp: currentDate,
          author: 'System',
          type: 'template'
        }]
      },
      'soil-remediation': {
        title: 'Contaminated Soil Remediation Project',
        customerName: '',
        location: defaultLocation,
        status: 'Lead',
        priority: 'Medium',
        description: 'Long-term soil treatment and restoration project including excavation, treatment, and site restoration with ongoing monitoring.',
        tags: ['soil-remediation', 'long-term', 'monitoring'],
        estimatedDuration: 90, // days
        regulatoryRequirements: ['EPA permits', 'State approvals', 'Monitoring plan'],
        comments: [{
          id: Date.now(),
          text: '🌱 Soil remediation project created. Extended timeline with regulatory compliance tracking.',
          timestamp: currentDate,
          author: 'System',
          type: 'template'
        }]
      },
      asbestos: {
        title: 'Asbestos Abatement Project',
        customerName: '',
        location: defaultLocation,
        status: 'Lead',
        priority: 'High',
        description: 'Safe removal and disposal of asbestos-containing materials with certified personnel and strict containment procedures.',
        tags: ['asbestos', 'certified', 'containment'],
        estimatedDuration: 10, // days
        certificationRequired: ['Asbestos supervisor', 'Licensed workers', 'Air monitoring'],
        comments: [{
          id: Date.now(),
          text: '🏠 Asbestos abatement project created. Certified crew and containment procedures required.',
          timestamp: currentDate,
          author: 'System',
          type: 'template'
        }]
      },
      custom: {
        title: 'New Environmental Project',
        customerName: '',
        location: defaultLocation,
        status: 'Lead',
        priority: 'Medium',
        description: '',
        tags: ['custom'],
        comments: [{
          id: Date.now(),
          text: '🎨 Custom project created with smart field suggestions enabled.',
          timestamp: currentDate,
          author: 'System',
          type: 'template'
        }]
      }
    };

    const projectTemplate = templates[template];
    if (!projectTemplate) return;

    const newProject = {
      id: Date.now(),
      ...projectTemplate,
      created: currentDate,
      updated: currentDate,
      templateUsed: template
    };

    // Add the project to the board
    const newCards = [...cards, newProject];
    setCards(newCards);
    saveCards(newCards);

    // Close the modal and open the card for editing
    setQuickWorkflowsOpen(false);
    setEditingCard(newProject);
    setModalOpen(true);

    console.log(`🎨 Created ${template} project template:`, newProject);
  };

  // Quick Workflow Functions
  const runWeeklyReviewWorkflow = () => {
    const staleCards = cards.filter(card => {
      const daysSinceUpdate = Math.floor((new Date() - new Date(card.updated || card.created)) / (1000 * 60 * 60 * 24));
      return daysSinceUpdate >= 7 && !card.status?.toLowerCase().includes('complete');
    });

    if (staleCards.length === 0) {
      alert('✅ No stale projects found. All projects are up to date!');
      return;
    }

    const reviewSummary = `📅 Weekly Review Summary:

⚠️ Found ${staleCards.length} projects needing attention:

${staleCards.slice(0, 5).map(card =>
      `• ${card.title || 'Untitled'} (${card.customerName || 'No customer'}) - ${Math.floor((new Date() - new Date(card.updated || card.created)) / (1000 * 60 * 60 * 24))} days stale`
    ).join('\n')}${staleCards.length > 5 ? `\n...and ${staleCards.length - 5} more` : ''}`;

    alert(reviewSummary);
    setQuickWorkflowsOpen(false);
  };

  const runRevenueOptimizationWorkflow = () => {
    const revenueAnalysis = cards.reduce((acc, card) => {
      const revenue = parseFloat(card.revenue || 0);
      if (revenue > 0) {
        acc.totalRevenue += revenue;
        acc.revenueProjects++;
        if (revenue < 5000) acc.lowRevenueProjects++;
        if (revenue > 20000) acc.highRevenueProjects++;
      } else if (card.status !== 'Lead') {
        acc.missingRevenue++;
      }
      return acc;
    }, { totalRevenue: 0, revenueProjects: 0, lowRevenueProjects: 0, highRevenueProjects: 0, missingRevenue: 0 });

    const avgRevenue = revenueAnalysis.revenueProjects > 0 ? revenueAnalysis.totalRevenue / revenueAnalysis.revenueProjects : 0;

    const summary = `💰 Revenue Optimization Analysis:

📊 Total Revenue: $${revenueAnalysis.totalRevenue.toLocaleString()}
📈 Average per Project: $${avgRevenue.toFixed(0).toLocaleString()}

🔴 Projects <$5k: ${revenueAnalysis.lowRevenueProjects}
🔵 Projects >$20k: ${revenueAnalysis.highRevenueProjects}
⚠️ Missing Revenue: ${revenueAnalysis.missingRevenue} projects

💡 Recommendation: ${revenueAnalysis.missingRevenue > 0 ? 'Add revenue estimates to quoted projects' : 'Consider upselling opportunities for low-revenue projects'}`;

    alert(summary);
    setQuickWorkflowsOpen(false);
  };

  const runCustomerFollowupWorkflow = () => {
    const quotedProjects = cards.filter(card =>
      card.status?.toLowerCase().includes('quoted') &&
      card.customerName
    );

    if (quotedProjects.length === 0) {
      alert('✅ No quoted projects requiring follow-up.');
      return;
    }

    const followupSummary = `📞 Customer Follow-up Opportunities:

${quotedProjects.slice(0, 5).map(card => {
      const daysSinceQuote = Math.floor((new Date() - new Date(card.updated || card.created)) / (1000 * 60 * 60 * 24));
      return `• ${card.customerName} - ${card.title || 'Untitled'} (${daysSinceQuote} days ago)`;
    }).join('\n')}${quotedProjects.length > 5 ? `\n...and ${quotedProjects.length - 5} more` : ''}

💡 Suggested actions:
• Schedule follow-up calls
• Send updated quotes
• Check for additional needs`;

    alert(followupSummary);
    setQuickWorkflowsOpen(false);
  };

  const runCapacityPlanningWorkflow = () => {
    const locationWorkload = lanes.reduce((acc, lane) => {
      const activeProjects = cards.filter(card =>
        card.location === lane.name &&
        !card.status?.toLowerCase().includes('complete')
      ).length;
      acc[lane.name] = activeProjects;
      return acc;
    }, {});

    const maxWorkload = Math.max(...Object.values(locationWorkload));
    const avgWorkload = Object.values(locationWorkload).reduce((a, b) => a + b, 0) / lanes.length;

    const capacityReport = `📈 Capacity Planning Analysis:

${Object.entries(locationWorkload).map(([location, count]) => {
      const utilization = maxWorkload > 0 ? (count / maxWorkload * 100).toFixed(0) : 0;
      const indicator = count > avgWorkload * 1.5 ? '🔴' : count < avgWorkload * 0.5 ? '🟢' : '🟡';
      return `${indicator} ${location}: ${count} projects (${utilization}% utilization)`;
    }).join('\n')}

📉 Average: ${avgWorkload.toFixed(1)} projects per location
💡 Consider redistributing workload for optimal efficiency`;

    alert(capacityReport);
    setQuickWorkflowsOpen(false);
  };

  const toggleAutomationRule = (rule) => {
    const automationRules = JSON.parse(localStorage.getItem('kanban_automation_rules') || '{}');
    automationRules[rule] = !automationRules[rule];
    localStorage.setItem('kanban_automation_rules', JSON.stringify(automationRules));

    const ruleNames = {
      'emergency-assignment': 'Emergency Auto-Assignment',
      'stale-alerts': 'Stale Project Alerts',
      'revenue-milestones': 'Revenue Milestone Tracking'
    };

    alert(`⚙️ ${ruleNames[rule]} ${automationRules[rule] ? 'enabled' : 'disabled'}`);
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragOver to false if we're leaving the drop zone itself
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure we maintain dragOver state
    setDragOver(true);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('🎉 Files dropped:', files.length);
      handleSmartUpload(files);
    }
  };

  // Smart upload handler for global document processing
  const handleSmartUpload = async (files) => {
    if (!files || files.length === 0) return;

    // Show processing notification
    if (files.length === 1) {
      alert(`🚀 Processing "${files[0].name}"...\n\nAI will analyze the document and either:\n• Link to existing project\n• Create new project\n• Request manual review`);
    } else {
      alert(`🚀 Processing ${files.length} files...\n\nAI will analyze each document and provide suggestions.`);
    }

    for (const file of Array.from(files)) {
      try {
        console.log('📄 Processing smart upload:', file.name);

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const parsedData = await parseGlobalDocument(file, reader.result);

            if (parsedData.projectMatch) {
              // Document matches existing project
              handleExistingProjectLink(parsedData, file);
            } else if (parsedData.extractedData && Object.keys(parsedData.extractedData).length > 2) {
              // Enough data to create new project
              handleNewProjectCreation(parsedData, file);
            } else {
              // Minimal data - show manual options
              handleManualDocumentProcessing(parsedData, file);
            }
          } catch (error) {
            console.error('Smart upload processing error:', error);
            alert(`Error processing ${file.name}: ${error.message}`);
          }
        };

        if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file);
        }
      } catch (error) {
        console.error('File reading error:', error);
        alert(`Error reading ${file.name}`);
      }
    }
  };

  // Parse document globally (outside of specific project context)
  const parseGlobalDocument = async (file, content) => {
    // Reuse the parsing logic from KanbanCardModal but for global context
    const filename = file.name.toLowerCase();
    let extractedData = {};
    let text = '';

    try {
      if (file.type.startsWith('text/') || filename.endsWith('.txt')) {
        text = content;
      } else if (filename.endsWith('.csv')) {
        text = content;
      } else {
        text = filename; // Fallback for binary files
      }

      // Extract key project information
      const patterns = {
        customerName: /(?:customer|client|company)\s*:?\s*([A-Za-z\s&.,'-]+?)(?:\n|,|\.|$)/gi,
        projectTitle: /(?:project|job|work|description|scope)\s*:?\s*([A-Za-z\s-]+?)(?:\n|,|\.|$)/gi,
        jobNumber: /(?:job|project|po|order)\s*#?\s*:?\s*([A-Z0-9-]+)/gi,
        totalAmount: /(?:total|amount|cost|price)\s*:?\s*\$?([\d,]+\.?\d*)/gi,
        address: /(?:address|location|site)\s*:?\s*([A-Za-z0-9\s,.-]+?)(?:\n|zip|state)/gi
      };

      for (const [field, regex] of Object.entries(patterns)) {
        const matches = [...text.matchAll(regex)];
        if (matches.length > 0) {
          let value = matches[0][1]?.trim();
          if (value) {
            if (field.includes('Amount')) {
              value = value.replace(/,/g, '');
              if (!isNaN(parseFloat(value))) {
                extractedData[field] = parseFloat(value);
              }
            } else {
              extractedData[field] = value;
            }
          }
        }
      }

      // Find matching project
      const projectMatch = findBestProjectMatch(extractedData);

      return {
        extractedData,
        projectMatch,
        filename: file.name,
        fileType: file.type
      };
    } catch (error) {
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  };

  // Find best matching project across all cards
  const findBestProjectMatch = (extractedData) => {
    let bestMatch = null;
    let highestScore = 0;

    cards.forEach(card => {
      let score = 0;

      // Job number exact match (highest priority)
      if (extractedData.jobNumber && card.jobNumber && extractedData.jobNumber === card.jobNumber) {
        score += 100;
      }

      // Customer name similarity
      if (extractedData.customerName && card.customerName) {
        const similarity = calculateSimilarity(extractedData.customerName, card.customerName);
        score += similarity * 40;
      }

      // Project title similarity
      if (extractedData.projectTitle && card.title) {
        const similarity = calculateSimilarity(extractedData.projectTitle, card.title);
        score += similarity * 30;
      }

      if (score > highestScore && score > 40) {
        highestScore = score;
        bestMatch = { ...card, matchScore: score };
      }
    });

    return bestMatch;
  };

  // Simple similarity calculation
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1;
    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  const editDistance = (str1, str2) => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        matrix[j][i] = str1[i - 1] === str2[j - 1] ? matrix[j - 1][i - 1] : Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Handle linking document to existing project
  const handleExistingProjectLink = (parsedData, file) => {
    const match = parsedData.projectMatch;
    const confirmation = confirm(
      `🔗 SMART MATCH FOUND!\n\n` +
      `Document: "${file.name}"\n` +
      `Matches Project: "${match.title}"\n` +
      `Customer: ${match.customerName}\n` +
      `Confidence: ${Math.round(match.matchScore)}/100\n\n` +
      `📝 Extracted Data Preview:\n` +
      `${Object.entries(parsedData.extractedData).slice(0, 3).map(([key, value]) => `• ${key}: ${value}`).join('\n')}\n\n` +
      `✅ Open this project to attach document?`
    );

    if (confirmation) {
      setEditingCard(match);
      setModalOpen(true);
      setSmartUploadOpen(false);
      // Add a delay to allow modal transition
      setTimeout(() => {
        alert(`📄 Project opened!\n\nDocument "${file.name}" is ready to attach.\nPlease scroll to the Document Upload section.`);
      }, 500);
    }
  };

  // Handle creating new project from document
  const handleNewProjectCreation = (parsedData, file) => {
    const { extractedData } = parsedData;
    const confirmation = confirm(
      `🎨 CREATE NEW PROJECT\n\n` +
      `Document: "${file.name}"\n` +
      `Contains enough data to auto-create project\n\n` +
      `📝 Extracted Information:\n` +
      `Customer: ${extractedData.customerName || '❌ Not detected'}\n` +
      `Project: ${extractedData.projectTitle || '📄 Will use filename'}\n` +
      `Amount: ${extractedData.totalAmount ? `💰 $${extractedData.totalAmount.toLocaleString()}` : '❌ Not detected'}\n` +
      `Address: ${extractedData.address || '❌ Not detected'}\n\n` +
      `⚙️ You can edit all details after creation.\n\n` +
      `✅ Create this project?`
    );

    if (confirmation) {
      const newProject = createProjectFromDocument(parsedData, file);
      const newCards = [...cards, newProject];
      setCards(newCards);
      saveCards(newCards);
      setEditingCard(newProject);
      setModalOpen(true);
      setSmartUploadOpen(false);

      setTimeout(() => {
        alert(`🎉 Project created successfully!\n\n"${newProject.title}"\n\nThe project modal is now open for editing.\nDocument has been automatically attached.`);
      }, 500);
    }
  };

  // Handle manual document processing
  const handleManualDocumentProcessing = (parsedData, file) => {
    const extractedCount = Object.keys(parsedData.extractedData || {}).length;

    alert(
      `📋 DOCUMENT PROCESSED\n\n` +
      `Document: "${file.name}"\n` +
      `Extracted Fields: ${extractedCount}\n\n` +
      `💭 Limited data found for auto-processing.\n\n` +
      `📝 Manual Options:\n` +
      `• Create a new project manually\n` +
      `• Select existing project to attach document\n` +
      `• Use Quick Start templates for guided creation\n\n` +
      `Document data is preserved for later use.`
    );
    setSmartUploadOpen(false);
  };

  // Create project from extracted document data
  const createProjectFromDocument = (parsedData, file) => {
    const { extractedData } = parsedData;
    const currentDate = new Date().toISOString();
    const defaultLocation = lanes.length > 0 ? lanes[0].name : '';

    // Create more detailed description from extracted data
    let description = `Project created from uploaded document: ${file.name}`;
    if (extractedData.scopeDetails) {
      description += `\n\nScope: ${extractedData.scopeDetails}`;
    }

    // Generate job number if quote number exists
    let jobNumber = '';
    if (extractedData.quoteNumber) {
      jobNumber = `Q-${extractedData.quoteNumber}`;
    }

    // Clean up revenue amount
    let revenue = '';
    if (extractedData.totalAmount) {
      revenue = extractedData.totalAmount.replace(/[$,]/g, '');
    }

    return {
      id: Date.now(),
      title: extractedData.projectTitle || file.name.replace(/\.[^/.]+$/, ''),
      customerName: extractedData.customerName || '',
      customerLocation: extractedData.location || extractedData.address || '',
      location: defaultLocation,
      status: 'Lead',
      priority: 'Medium',
      revenue: revenue,
      jobNumber: jobNumber,
      description: description,
      tags: ['auto-created', 'document-import', 'quote'],
      created: currentDate,
      updated: currentDate,
      attachments: [{
        name: file.name,
        url: parsedData.fileContent || '',
        type: 'quote',
        uploadDate: currentDate,
        extractedData: extractedData
      }],
      comments: [{
        id: Date.now(),
        text: `📄 Project auto-created from quote "${file.name}"\n\n` +
              `${extractedData.customerName ? `Customer: ${extractedData.customerName}\n` : ''}` +
              `${extractedData.location ? `Location: ${extractedData.location}\n` : ''}` +
              `${extractedData.quoteNumber ? `Quote #: ${extractedData.quoteNumber}\n` : ''}` +
              `${extractedData.totalAmount ? `Amount: ${extractedData.totalAmount}\n` : ''}` +
              `\nExtracted ${Object.keys(extractedData).length} data fields. Please review and update as needed.`,
        timestamp: currentDate,
        author: 'System',
        type: 'auto-creation'
      }]
    };
  };

  // Handle End of Period archival
  const handleEOPComplete = (remainingCards, nextPeriodData) => {
    setCards(remainingCards);
    saveCards(remainingCards);

    // Save next period data to localStorage
    localStorage.setItem('nextPeriodData', JSON.stringify(nextPeriodData));

    alert(`🎉 Sales period closed successfully!\n\nActive jobs (${remainingCards.length}) moved to new period.\nCompleted jobs archived with EOP report.\n\nNext period: ${nextPeriodData.year}`);
  };

  // Handle EOP completion callback
  const handleEopComplete = (archivedData) => {
    console.log('📋 EOP archival completed:', archivedData);

    // Refresh the cards to reflect any changes
    const storedCards = JSON.parse(localStorage.getItem('kanbanCards') || '[]');
    setCards(storedCards);

    // Close the EOP modal
    setEopModalOpen(false);

    // Show success message
    alert(`✅ End of Period archival completed!\n\nArchived: ${archivedData?.archivedCount || 0} completed jobs\nRemaining: ${storedCards.length} active jobs`);
  };

  // Handle recurring job settings
  const handleSaveRecurring = (cardId, recurringData) => {
    const updatedCards = updateRecurringJob(cards, cardId, recurringData, saveCards);
    setCards(updatedCards);

    alert(`🔄 Recurring job settings saved!\n\nNext occurrence: ${recurringData.nextDueDate || 'Not scheduled'}`);
  };

  // Open recurring job modal
  const handleSetRecurring = (card) => {
    setSelectedCardForRecurring(card);
    setRecurringJobModalOpen(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="kanban-board">
        <BackButton />
        
        {/* Revenue Dashboard Header */}
        <div className="kanban-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="heading-2" style={{marginBottom: 'var(--space-sm)', color: 'var(--env-primary-800)'}}>
                🌱 Environmental Services Hub
              </h1>
              <p className="text-small" style={{color: '#6b7280', marginBottom: 'var(--space-xs)'}}>
                Comprehensive Project Management & Revenue Analytics
              </p>
              <p className="text-xs" style={{color: '#9ca3af'}}>
                * Smart scheduling with compliance tracking • Real-time revenue categorization
              </p>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {/* User Profile */}
              {currentUser ? (
                <UserProfile />
              ) : (
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="btn btn-primary btn-sm"
                  title="Sign in to sync your data across devices"
                >
                  <span>🔐</span>
                  <span>Sign In</span>
                </button>
              )}

              {/* Board Setup Button */}
              <button
                onClick={() => setSetupPanelOpen(true)}
                className="btn btn-secondary btn-sm"
                title="Configure locations, statuses, and revenue categories"
              >
                <span>⚙️</span>
                <span>Board Setup</span>
              </button>
              
              {/* Recurring Templates Button */}
              <button
                onClick={() => setRecurringTemplatesOpen(true)}
                className="btn btn-primary btn-sm"
                title="Manage recurring job templates"
              >
                <span>🔄</span>
                <span>Templates</span>
              </button>

              {/* Smart Upload Button */}
              <button
                onClick={() => setSmartUploadOpen(true)}
                className="btn btn-purple btn-sm"
                title="AI-powered document upload and project creation"
              >
                <span>📄</span>
                <span>Smart Upload</span>
              </button>

              {/* Quick Workflows Button */}
              <button
                onClick={() => setQuickWorkflowsOpen(true)}
                className="btn btn-info btn-sm"
                title="One-click workflows and templates"
              >
                <span>🎨</span>
                <span>Quick Start</span>
              </button>

              {/* Bulk Operations Button */}
              <button
                onClick={() => setBulkOperationsOpen(true)}
                className="btn btn-warning btn-sm"
                title="Bulk update multiple cards at once"
              >
                <span>⚡</span>
                <span>Bulk Actions</span>
              </button>

              {/* Close Sales Period Button */}
              <button
                onClick={() => setEopModalOpen(true)}
                className="btn btn-danger btn-sm"
                title="Close current sales period and archive completed jobs"
              >
                <span>📊</span>
                <span>Close Period</span>
              </button>

              {/* Reports Button */}
              <button
                onClick={() => setReportsModalOpen(true)}
                className="btn btn-success btn-sm"
                title="Generate vendor and status reports"
              >
                <span>📊</span>
                <span>Reports</span>
              </button>
            </div>
          </div>
          
          {/* Revenue Metrics and Quick File Drop */}
          <div className="flex flex-col xl:flex-row gap-6 items-stretch" style={{marginTop: 'var(--space-xl)'}}>

            {/* Enhanced Revenue Metrics */}
            <div className="flex-1">
              <div className="kanban-revenue-metrics">
                <div className="revenue-metric">
                  <div className="revenue-metric-value" style={{color: 'var(--status-danger)'}}>
                    ${revenue.pipeline.toLocaleString()}
                  </div>
                  <div className="revenue-metric-label">Pipeline</div>
                </div>
                <div className="revenue-metric">
                  <div className="revenue-metric-value" style={{color: 'var(--status-warning)'}}>
                    ${revenue.projected.toLocaleString()}
                  </div>
                  <div className="revenue-metric-label">Projected</div>
                </div>
                <div className="revenue-metric">
                  <div className="revenue-metric-value" style={{color: 'var(--status-success)'}}>
                    ${revenue.actual.toLocaleString()}
                  </div>
                  <div className="revenue-metric-label">Actual</div>
                </div>
                <div className="revenue-metric" style={{borderLeft: '2px solid var(--env-earth-300)', paddingLeft: 'var(--space-lg)'}}>
                  <div className="revenue-metric-value" style={{color: 'var(--env-ocean-600)'}}>
                    ${revenue.total.toLocaleString()}
                  </div>
                  <div className="revenue-metric-label">Total Revenue</div>
                </div>
                <div className="revenue-metric">
                  <div className="revenue-metric-value" style={{color: 'var(--env-primary-600)'}}>
                    {revenue.percentage}%
                  </div>
                  <div className="revenue-metric-label">To Quota</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="kanban-grid-container">
          <div className="kanban-grid" style={{
            gridTemplateColumns: `220px repeat(${statuses.length}, 1fr)`,
            gridTemplateRows: `auto repeat(${lanes.length}, minmax(180px, auto))`
          }}>
            
            {/* Header Row */}
            <div className="grid-header">
              📍 Location \ Status
            </div>
            {statuses.map((status, index) => (
              <DraggableStatusHeader
                key={status.id || status.name}
                status={status}
                index={index}
                moveStatus={moveStatus}
                revenue={revenue.byStatus[status.name]}
              />
            ))}

            {/* Grid Cells */}
            {console.log('🎯 Rendering lanes:', lanes.length, lanes)}
            {lanes.map((lane, laneIndex) => (
              <React.Fragment key={lane.id || lane.name}>
                {/* Row Header */}
                <DraggableLaneHeader
                  lane={lane}
                  index={laneIndex}
                  moveLane={moveLane}
                />
                
                {/* Status Cells */}
                {statuses.map(status => {
                  const cellCards = getCardsForCell(lane.name, status.name);
                  return (
                    <DropZone
                      key={`${lane.name}-${status.name}`}
                      lane={lane.name}
                      status={status.name}
                      onDrop={handleDrop}
                      className="kanban-cell"
                    >
                      {/* Add Card Buttons */}
                      <div style={{marginBottom: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)'}}>
                        <button
                          onClick={() => openSmartCardModal(lane.name, status.name)}
                          className="kanban-smart-create"
                        >
                          🤖 Smart Create
                        </button>
                        <button
                          onClick={() => openNewCardModal(lane.name, status.name)}
                          className="kanban-basic-create"
                        >
                          + Basic Card
                        </button>
                      </div>
                      
                      {/* Existing Cards */}
                      {cellCards.map(card => (
                        <div key={card.id} className="mb-2">
                          <DraggableCard
                            card={card}
                            onClick={() => openEditCardModal(card)}
                            className="mb-1"
                            laneColor={lane.color}
                            statusColor={status.color}
                            lanes={lanes}
                            statuses={statuses}
                          />
                          {/* Actions for Completed Jobs */}
                          {card.status === 'Job Complete' && (
                            <div className="space-y-1 mt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateManifest(card);
                                }}
                                className="w-full p-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 flex items-center justify-center gap-1"
                                title="Generate EPA manifest and shipping documents"
                              >
                                📋 Generate Manifest
                              </button>
                              {card.vendor && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCardForTemplate(card);
                                    setRecurringTemplatesOpen(true);
                                  }}
                                  className="w-full p-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 flex items-center justify-center gap-1"
                                  title="Create recurring template from this job"
                                >
                                  🔄 Create Template
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </DropZone>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Card Modal */}
        {modalOpen && editingCard && (
          <KanbanCardModal
            card={editingCard}
            lanes={lanes}
            statuses={statuses}
            closeModal={() => setModalOpen(false)}
            updateCards={handleSaveCard}
          />
        )}
        
        {/* Kanban Setup Panel */}
        <KanbanSetupPanel
          isOpen={setupPanelOpen}
          onClose={() => setSetupPanelOpen(false)}
          onConfigUpdate={() => {
            // Reload data when configuration is updated
            const updatedLanes = getLanes();
            const updatedStatuses = getStatuses();
            setLanes(updatedLanes);
            setStatuses(updatedStatuses);
          }}
        />

        {/* Project Management Automation Panel */}
        {cards.length > 0 && (
          <ProjectAutomationPanel
            cards={cards}
            statuses={statuses}
            onUpdateCard={handleAutomatedUpdate}
            onBulkUpdate={handleBulkUpdate}
          />
        )}

        {/* Customer Auto-Populate Modal */}
        <CustomerAutoPopulateModal
          isOpen={customerAutoPopulateOpen}
          onClose={() => setCustomerAutoPopulateOpen(false)}
          onCreateProject={(projectData) => {
            handleCustomerAutoPopulateProject({
              ...projectData,
              location: pendingCardLocation.lane,
              status: pendingCardLocation.status
            });
          }}
          lanes={lanes}
          statuses={statuses}
        />

        {/* Recurring Templates Modal */}
        <RecurringTemplatesModal
          isOpen={recurringTemplatesOpen}
          onClose={() => {
            setRecurringTemplatesOpen(false);
            setSelectedCardForTemplate(null);
          }}
          onCreateProject={(projectData) => {
            // Add the project to the board
            const newCards = [...cards, projectData];
            setCards(newCards);
            saveCards(newCards);
            console.log('🔄 Created recurring project:', projectData);
          }}
          selectedCard={selectedCardForTemplate}
        />

        {/* Manifest Generation Modal */}
        {/* Reports Modal */}
        <ReportsModal
          isOpen={reportsModalOpen}
          onClose={() => setReportsModalOpen(false)}
          cards={cards}
          lanes={lanes}
          statuses={statuses}
        />

        {/* Bulk Operations Modal */}
        {bulkOperationsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">⚡ Bulk Operations</h2>
                  <button
                    onClick={() => {
                      setBulkOperationsOpen(false);
                      setSelectedCards([]);
                      setBulkSelectionMode(false);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>

                {/* Bulk Selection Tools */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Select Cards for Bulk Actions</h3>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedCards(cards.map(c => c.id));
                      }}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Select All ({cards.length})
                    </button>
                    <button
                      onClick={() => setSelectedCards([])}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={() => {
                        const staleCards = cards.filter(c => {
                          const daysSinceUpdate = Math.floor((new Date() - new Date(c.updated || c.created)) / (1000 * 60 * 60 * 24));
                          return daysSinceUpdate > 7;
                        }).map(c => c.id);
                        setSelectedCards(staleCards);
                      }}
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      Select Stale Cards (7+ days)
                    </button>
                    <button
                      onClick={() => {
                        const leadCards = cards.filter(c => c.status === 'Lead').map(c => c.id);
                        setSelectedCards(leadCards);
                      }}
                      className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                      Select All Leads
                    </button>
                  </div>
                  <p className="text-sm text-blue-600">
                    Selected: <strong>{selectedCards.length}</strong> cards
                  </p>
                </div>

                {/* Card Selection Grid */}
                <div className="mb-6 max-h-60 overflow-y-auto border border-gray-200 rounded">
                  <div className="grid grid-cols-1 gap-1 p-2">
                    {cards.map(card => (
                      <label key={card.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCards.includes(card.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCards(prev => [...prev, card.id]);
                            } else {
                              setSelectedCards(prev => prev.filter(id => id !== card.id));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{card.title || 'Untitled'}</div>
                          <div className="text-xs text-gray-500">
                            {card.customerName} • {card.location} • {card.status}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bulk Actions */}
                {selectedCards.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">🚀 Available Actions ({selectedCards.length} cards)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Status Update */}
                      <div className="p-4 border border-gray-200 rounded">
                        <h4 className="font-medium mb-2">📋 Update Status</h4>
                        <select
                          id="bulk-status"
                          className="w-full p-2 border rounded mb-2 text-sm"
                          defaultValue=""
                        >
                          <option value="">Select new status...</option>
                          {statuses.map(status => (
                            <option key={status.name} value={status.name}>{status.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const newStatus = document.getElementById('bulk-status').value;
                            if (newStatus) {
                              handleBulkStatusUpdate(selectedCards, newStatus);
                            }
                          }}
                          className="w-full px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Update Status
                        </button>
                      </div>

                      {/* Priority Update */}
                      <div className="p-4 border border-gray-200 rounded">
                        <h4 className="font-medium mb-2">🔥 Update Priority</h4>
                        <select
                          id="bulk-priority"
                          className="w-full p-2 border rounded mb-2 text-sm"
                          defaultValue=""
                        >
                          <option value="">Select priority...</option>
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                          <option value="">None</option>
                        </select>
                        <button
                          onClick={() => {
                            const newPriority = document.getElementById('bulk-priority').value;
                            handleBulkPriorityUpdate(selectedCards, newPriority);
                          }}
                          className="w-full px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                        >
                          Update Priority
                        </button>
                      </div>

                      {/* Assignment Update */}
                      <div className="p-4 border border-gray-200 rounded">
                        <h4 className="font-medium mb-2">👤 Assign Team Member</h4>
                        <select
                          id="bulk-assign"
                          className="w-full p-2 border rounded mb-2 text-sm"
                          defaultValue=""
                        >
                          <option value="">Select team member...</option>
                          {Array.from(new Set(cards.map(c => c.assignedTo).filter(Boolean))).map(person => (
                            <option key={person} value={person}>{person}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const assignedTo = document.getElementById('bulk-assign').value;
                            if (assignedTo) {
                              handleBulkAssignmentUpdate(selectedCards, assignedTo);
                            }
                          }}
                          className="w-full px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Assign
                        </button>
                      </div>

                      {/* Add Comment */}
                      <div className="p-4 border border-gray-200 rounded">
                        <h4 className="font-medium mb-2">💬 Add Comment</h4>
                        <textarea
                          id="bulk-comment"
                          className="w-full p-2 border rounded mb-2 text-sm"
                          rows="2"
                          placeholder="Comment to add to all selected cards..."
                        />
                        <button
                          onClick={() => {
                            const comment = document.getElementById('bulk-comment').value;
                            if (comment.trim()) {
                              handleBulkCommentAdd(selectedCards, comment.trim());
                              document.getElementById('bulk-comment').value = '';
                            }
                          }}
                          className="w-full px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                        >
                          Add Comment
                        </button>
                      </div>

                      {/* Export Selected */}
                      <div className="p-4 border border-gray-200 rounded md:col-span-2">
                        <h4 className="font-medium mb-2">📤 Export Selected Cards</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBulkExport(selectedCards, 'csv')}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Export CSV
                          </button>
                          <button
                            onClick={() => handleBulkExport(selectedCards, 'json')}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Export JSON
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manifest Generation Modal */}
        {manifestModalOpen && generatedManifest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">📋 Generated Manifest</h2>
                  <button
                    onClick={() => setManifestModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>

                {/* Manifest Header */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800">
                        Manifest #{generatedManifest.manifestNumber}
                      </h3>
                      <p className="text-blue-600">
                        Generated: {new Date(generatedManifest.generatedDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p><strong>Customer:</strong> {generatedManifest.customer.name}</p>
                      <p><strong>Job Number:</strong> {generatedManifest.customer.jobNumber}</p>
                      <p><strong>Location:</strong> {generatedManifest.customer.location}</p>
                    </div>
                  </div>
                </div>

                {/* Generator Information */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Generator Information</h4>
                  <div className="bg-gray-50 p-3 rounded border grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p><strong>Name:</strong> {generatedManifest.generator.name}</p>
                      <p><strong>Address:</strong> {generatedManifest.generator.address}</p>
                    </div>
                    <div>
                      <p><strong>Contact:</strong> {generatedManifest.generator.contactName}</p>
                      <p><strong>EPA ID:</strong> {generatedManifest.generator.epaId}</p>
                    </div>
                  </div>
                </div>

                {/* Waste Streams */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Waste Stream Information</h4>
                  {generatedManifest.wasteStreams.map((stream, index) => (
                    <div key={index} className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p><strong>Description:</strong> {stream.wasteDescription}</p>
                          <p><strong>Proper Shipping Name:</strong> {stream.properShippingName}</p>
                          <p><strong>UN Number:</strong> {stream.unNumber}</p>
                        </div>
                        <div>
                          <p><strong>Hazard Class:</strong> {stream.hazardClass}</p>
                          <p><strong>Packing Group:</strong> {stream.packingGroup}</p>
                          <p><strong>Quantity:</strong> {stream.totalQuantity} {stream.unitOfMeasure}</p>
                        </div>
                      </div>
                      {stream.wasteCodes.length > 0 && (
                        <div className="mt-2">
                          <strong>Waste Codes:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stream.wasteCodes.map(code => (
                              <span key={code} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Facility Information */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Designated Facility</h4>
                  <div className="bg-green-50 p-3 rounded border text-sm">
                    <p><strong>{generatedManifest.facility.name}</strong></p>
                    <p>{generatedManifest.facility.address}</p>
                    <p>EPA ID: {generatedManifest.facility.epaId}</p>
                  </div>
                </div>

                {/* Special Instructions */}
                {generatedManifest.compliance.specialInstructions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-700 mb-2">Special Instructions</h4>
                    <ul className="bg-orange-50 p-3 rounded border text-sm">
                      {generatedManifest.compliance.specialInstructions.map((instruction, index) => (
                        <li key={index} className="mb-1">• {instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compliance Status */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Compliance Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className={`p-2 rounded text-center ${generatedManifest.compliance.dotCompliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      DOT Compliant: {generatedManifest.compliance.dotCompliant ? 'Yes' : 'No'}
                    </div>
                    <div className={`p-2 rounded text-center ${generatedManifest.compliance.epaCompliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      EPA Compliant: {generatedManifest.compliance.epaCompliant ? 'Yes' : 'No'}
                    </div>
                    <div className={`p-2 rounded text-center ${generatedManifest.compliance.rcraManifest ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                      RCRA Manifest: {generatedManifest.compliance.rcraManifest ? 'Required' : 'Not Required'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSaveManifest(generatedManifest)}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    💾 Save Manifest
                  </button>
                  <button
                    onClick={() => handleExportManifest(generatedManifest, 'pdf')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    📄 Export EPA Form
                  </button>
                  <button
                    onClick={() => handleExportManifest(generatedManifest, 'shipping')}
                    className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                  >
                    🚛 Export Shipping Paper
                  </button>
                  <button
                    onClick={() => handleExportManifest(generatedManifest, 'csv')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    📊 Export CSV
                  </button>
                  <button
                    onClick={() => setManifestModalOpen(false)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 ml-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Workflows Modal */}
        {quickWorkflowsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">🎨 Quick Start Workflows</h2>
                  <button
                    onClick={() => setQuickWorkflowsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>

                {/* One-Click Project Templates */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">🚀 One-Click Project Creation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Emergency Response Template */}
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
                      onClick={() => createQuickProject('emergency')}
                    >
                      <div className="text-red-600 text-2xl mb-2">🚨</div>
                      <h4 className="font-semibold text-red-800">Emergency Response</h4>
                      <p className="text-sm text-red-600 mt-1">High-priority spill cleanup or environmental emergency</p>
                      <div className="mt-2 text-xs text-red-500">
                        • Priority: Critical<br/>
                        • Auto-assigns emergency crew<br/>
                        • Sets 4-hour response SLA
                      </div>
                    </div>

                    {/* Routine Lab Pack Template */}
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                      onClick={() => createQuickProject('labpack')}
                    >
                      <div className="text-blue-600 text-2xl mb-2">🧪</div>
                      <h4 className="font-semibold text-blue-800">Routine Lab Pack</h4>
                      <p className="text-sm text-blue-600 mt-1">Standard chemical waste collection and packaging</p>
                      <div className="mt-2 text-xs text-blue-500">
                        • Priority: Medium<br/>
                        • Pre-fills common vendors<br/>
                        • Sets 2-week timeline
                      </div>
                    </div>

                    {/* Tank Cleaning Template */}
                    <div className="p-4 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100 cursor-pointer transition-colors"
                      onClick={() => createQuickProject('tank-cleaning')}
                    >
                      <div className="text-green-600 text-2xl mb-2">🛢️</div>
                      <h4 className="font-semibold text-green-800">Tank Cleaning</h4>
                      <p className="text-sm text-green-600 mt-1">Industrial tank cleaning and decontamination</p>
                      <div className="mt-2 text-xs text-green-500">
                        • Priority: High<br/>
                        • Includes safety checklist<br/>
                        • Sets 1-week timeline
                      </div>
                    </div>

                    {/* Soil Remediation Template */}
                    <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition-colors"
                      onClick={() => createQuickProject('soil-remediation')}
                    >
                      <div className="text-yellow-600 text-2xl mb-2">🌱</div>
                      <h4 className="font-semibold text-yellow-800">Soil Remediation</h4>
                      <p className="text-sm text-yellow-600 mt-1">Contaminated soil treatment and restoration</p>
                      <div className="mt-2 text-xs text-yellow-500">
                        • Priority: Medium<br/>
                        • Extended timeline (3 months)<br/>
                        • Regulatory compliance tracking
                      </div>
                    </div>

                    {/* Asbestos Abatement Template */}
                    <div className="p-4 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                      onClick={() => createQuickProject('asbestos')}
                    >
                      <div className="text-purple-600 text-2xl mb-2">🏠</div>
                      <h4 className="font-semibold text-purple-800">Asbestos Abatement</h4>
                      <p className="text-sm text-purple-600 mt-1">Safe asbestos removal and disposal</p>
                      <div className="mt-2 text-xs text-purple-500">
                        • Priority: High<br/>
                        • Certified crew required<br/>
                        • Regulatory documentation
                      </div>
                    </div>

                    {/* Custom Project Template */}
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => createQuickProject('custom')}
                    >
                      <div className="text-gray-600 text-2xl mb-2">🎨</div>
                      <h4 className="font-semibold text-gray-800">Custom Project</h4>
                      <p className="text-sm text-gray-600 mt-1">Start with a blank template</p>
                      <div className="mt-2 text-xs text-gray-500">
                        • Priority: Medium<br/>
                        • Customizable parameters<br/>
                        • Smart field suggestions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Workflows */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">⚡ Quick Workflows</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Weekly Review Workflow */}
                    <div className="p-4 border border-indigo-200 rounded-lg">
                      <h4 className="font-medium text-indigo-800 mb-2">📅 Weekly Project Review</h4>
                      <p className="text-sm text-gray-600 mb-3">Review all stale projects and update statuses</p>
                      <button
                        onClick={() => runWeeklyReviewWorkflow()}
                        className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-sm"
                      >
                        Run Weekly Review
                      </button>
                    </div>

                    {/* Revenue Optimization */}
                    <div className="p-4 border border-green-200 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">💰 Revenue Optimization</h4>
                      <p className="text-sm text-gray-600 mb-3">Identify underpriced projects and optimization opportunities</p>
                      <button
                        onClick={() => runRevenueOptimizationWorkflow()}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                      >
                        Analyze Revenue
                      </button>
                    </div>

                    {/* Customer Follow-up */}
                    <div className="p-4 border border-orange-200 rounded-lg">
                      <h4 className="font-medium text-orange-800 mb-2">📞 Customer Follow-up</h4>
                      <p className="text-sm text-gray-600 mb-3">Generate follow-up tasks for quoted projects</p>
                      <button
                        onClick={() => runCustomerFollowupWorkflow()}
                        className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                      >
                        Generate Follow-ups
                      </button>
                    </div>

                    {/* Capacity Planning */}
                    <div className="p-4 border border-teal-200 rounded-lg">
                      <h4 className="font-medium text-teal-800 mb-2">📈 Capacity Planning</h4>
                      <p className="text-sm text-gray-600 mb-3">Analyze workload distribution and resource allocation</p>
                      <button
                        onClick={() => runCapacityPlanningWorkflow()}
                        className="w-full px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 text-sm"
                      >
                        Analyze Capacity
                      </button>
                    </div>
                  </div>
                </div>

                {/* Smart Automation Rules */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">🤖 Smart Automation Rules</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                      <div>
                        <span className="font-medium text-blue-800">Auto-assign emergency projects</span>
                        <p className="text-sm text-blue-600">Automatically assign Critical priority projects to emergency response team</p>
                      </div>
                      <button
                        onClick={() => toggleAutomationRule('emergency-assignment')}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Enable
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                      <div>
                        <span className="font-medium text-yellow-800">Stale project alerts</span>
                        <p className="text-sm text-yellow-600">Send notifications for projects with no activity in 7+ days</p>
                      </div>
                      <button
                        onClick={() => toggleAutomationRule('stale-alerts')}
                        className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                      >
                        Enable
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                      <div>
                        <span className="font-medium text-green-800">Revenue milestone tracking</span>
                        <p className="text-sm text-green-600">Automatically update milestones when revenue goals are met</p>
                      </div>
                      <button
                        onClick={() => toggleAutomationRule('revenue-milestones')}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Enable
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Smart Upload Modal */}
        {smartUploadOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">📄 Smart Document Upload</h2>
                  <button
                    onClick={() => setSmartUploadOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">🤖 AI-Powered Document Processing</h3>
                    <p className="text-blue-700 text-sm mb-3">
                      Upload documents and let AI automatically extract project data, find matching projects, or create new ones.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-600">
                      <div>
                        <strong>What AI extracts:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Customer information</li>
                          <li>• Project details & scope</li>
                          <li>• Financial amounts</li>
                          <li>• Dates & scheduling</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Smart features:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Project linking suggestions</li>
                          <li>• Auto-field population</li>
                          <li>• Priority detection</li>
                          <li>• Status updates</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      dragOver
                        ? 'border-blue-500 bg-blue-50 border-solid scale-105'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleFileDrop}
                  >
                    <input
                      type="file"
                      id="smart-upload"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.png"
                      onChange={(e) => handleSmartUpload(e.target.files)}
                    />
                    <label htmlFor="smart-upload" className="cursor-pointer block">
                      {dragOver ? (
                        <>
                          <div className="text-6xl text-blue-500 mb-4 animate-bounce">📥</div>
                          <div className="text-lg font-semibold text-blue-700 mb-2">
                            Drop files to upload and analyze
                          </div>
                          <div className="text-sm text-blue-600">
                            AI will automatically process and extract data
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl text-gray-400 mb-4">📁</div>
                          <div className="text-lg font-semibold text-gray-700 mb-2">
                            Drop files here or click to browse
                          </div>
                          <div className="text-sm text-gray-500">
                            Supports: PDF, Word docs, text files, CSV, images with text
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl text-green-600 mb-2">🔗</div>
                      <div className="font-semibold text-green-800">Link to Existing</div>
                      <div className="text-xs text-green-600 mt-1">
                        AI finds matching projects and suggests links
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl text-blue-600 mb-2">🎨</div>
                      <div className="font-semibold text-blue-800">Create New Project</div>
                      <div className="text-xs text-blue-600 mt-1">
                        Auto-generate project from document data
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl text-purple-600 mb-2">📊</div>
                      <div className="font-semibold text-purple-800">Smart Analysis</div>
                      <div className="text-xs text-purple-600 mt-1">
                        Extract insights and populate fields automatically
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* End of Period Modal */}
        <EndOfPeriodModal
          isOpen={eopModalOpen}
          onClose={() => setEopModalOpen(false)}
          cards={cards}
          lanes={lanes}
          statuses={statuses}
          currentPeriod={new Date().getFullYear()}
          onArchiveComplete={handleEopComplete}
        />

        {/* Recurring Job Modal */}
        <RecurringJobModal
          isOpen={recurringJobModalOpen}
          onClose={() => setRecurringJobModalOpen(false)}
          card={selectedCardForRecurring}
          onSaveRecurring={handleSaveRecurring}
        />

        {/* File Linking Panel */}
        <FileLinkingPanel
          cards={cards}
          onCreateProject={handleNewProjectCreation}
          createProjectFromDocument={createProjectFromDocument}
          lanes={lanes}
          statuses={statuses}
          setCards={setCards}
          saveCards={saveCards}
          setEditingCard={setEditingCard}
          setModalOpen={setModalOpen}
        />

        {/* Login Modal */}
        <LoginModal
          isOpen={loginModalOpen}
          onClose={() => setLoginModalOpen(false)}
        />
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;
// Force reload to clear any cached imports