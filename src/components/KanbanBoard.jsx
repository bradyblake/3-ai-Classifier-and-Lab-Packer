// File: KanbanBoard.jsx - Location/Status Grid with Revenue Tracking
import React, { useEffect, useState, useContext } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import DraggableCard from "./DraggableCard";
import DropZone from "./DropZone";
import KanbanCardModal from "./KanbanCardModal";
import BoardTemplateManager from "./BoardTemplateManager";
import ProjectAutomationPanel from "./ProjectAutomationPanel";
import CustomerAutoPopulateModal from "./CustomerAutoPopulateModal";
import RecurringTemplatesModal from "./RecurringTemplatesModal";
import "../styles/KanbanBoard.css";
import { ModalContext } from "../context/ModalContext";
import { ThemeContext } from "../context/ThemeContext.jsx";
import BackButton from "./BackButton";
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

const KanbanBoard = () => {
  const [cards, setCards] = useState([]);
  const [lanes, setLanes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [modalLane, setModalLane] = useState('');
  const [modalStatus, setModalStatus] = useState('');
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [customerAutoPopulateOpen, setCustomerAutoPopulateOpen] = useState(false);
  const [pendingCardLocation, setPendingCardLocation] = useState({ lane: '', status: '' });
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [selectedCardForManifest, setSelectedCardForManifest] = useState(null);
  const [generatedManifest, setGeneratedManifest] = useState(null);
  const [recurringTemplatesOpen, setRecurringTemplatesOpen] = useState(false);
  const [selectedCardForTemplate, setSelectedCardForTemplate] = useState(null);
  const { themeColors } = useContext(ThemeContext);

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
    
    return () => {
      window.removeEventListener('focusKanbanCard', handleFocusCard);
      delete window.createProjectCard;
      delete window.kanbanAPI;
    };
    
    // Fallback test data if none exists
    if (storedLanes.length === 0) {
      storedLanes = [
        { name: 'Houston', abbreviation: 'HOU' },
        { name: 'Dallas', abbreviation: 'DAL' }
      ];
      console.log('📊 Using fallback lanes');
    }
    
    if (storedStatuses.length === 0) {
      storedStatuses = [
        { name: 'Quote Submitted', color: '#FEF3C7' },
        { name: 'Quote Approved', color: '#D1FAE5' },
        { name: 'Job Complete', color: '#FCE7F3' }
      ];
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
    
    setCards(storedCards);
    setLanes(storedLanes);
    setStatuses(storedStatuses);
  }, []);

  // Calculate revenue metrics by category
  const calculateRevenue = () => {
    let pipeline = 0;
    let projected = 0;
    let actual = 0;
    
    const revenueByStatus = statuses.reduce((acc, status) => {
      const statusCards = cards.filter(card => card.status === status.name);
      
      // Calculate revenue for each card individually to apply scheduling criteria
      let statusRevenue = 0;
      statusCards.forEach(card => {
        const cardRevenue = parseFloat(card.revenue) || 0;
        statusRevenue += cardRevenue;
        
        // Apply scheduling criteria for revenue categorization
        const category = getStatusRevenueCategory(status.name, card);
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
    const quota = 500000; // This could be configurable

    return {
      total: totalRevenue,
      pipeline,
      projected,
      actual,
      byStatus: revenueByStatus,
      quota,
      percentage: ((totalRevenue / quota) * 100).toFixed(1)
    };
  };

  const revenue = calculateRevenue();

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
        ? updateCardLaneHistory(card, newLane, newStatus)
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
              {/* Board Setup Button */}
              <button
                onClick={() => setTemplateManagerOpen(true)}
                className="btn btn-secondary btn-sm"
                title="Configure board templates and settings"
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
            </div>
          </div>
          
          {/* Enhanced Revenue Metrics */}
          <div className="kanban-revenue-metrics" style={{marginTop: 'var(--space-xl)'}}>
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

        {/* Grid Layout */}
        <div className="flex-1 overflow-auto">
          <div className="kanban-grid" style={{
            gridTemplateColumns: `220px repeat(${statuses.length}, 1fr)`,
            gridTemplateRows: `auto repeat(${lanes.length}, minmax(180px, auto))`
          }}>
            
            {/* Header Row */}
            <div className="grid-header">
              📍 Location \ Status
            </div>
            {statuses.map(status => {
              const category = getStatusRevenueCategory(status.name);
              const isScheduledStatus = status.name.toLowerCase().includes('scheduled');
              const categoryColor = 
                category === "Pipeline" ? "text-red-600" :
                category === "Projected" ? "text-orange-600" :
                category === "Actual" ? "text-green-600" : "text-gray-600";
              
              return (
                <div key={status.name} className="grid-header">
                  <div style={{marginBottom: 'var(--space-xs)'}}>{status.name}</div>
                  <div className="text-xs" style={{color: '#6b7280', marginBottom: 'var(--space-sm)'}}>
                    {isScheduledStatus ? '(Pipeline/Projected*)' : `(${category})`}
                  </div>
                  <div className={`text-sm font-bold ${categoryColor}`} style={{fontSize: '0.875rem', fontWeight: '600'}}>
                    ${revenue.byStatus[status.name]?.toLocaleString() || '0'}
                  </div>
                </div>
              );
            })}

            {/* Grid Cells */}
            {lanes.map(lane => (
              <React.Fragment key={lane.name}>
                {/* Row Header */}
                <div className="grid-location-header">
                  🏭 {lane.name}
                </div>
                
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
        
        {/* Board Template Manager Modal */}
        {templateManagerOpen && (
          <BoardTemplateManager
            onClose={() => setTemplateManagerOpen(false)}
            onApplyTemplate={(template) => {
              console.log('Applied template:', template.name);
              setTemplateManagerOpen(false);
            }}
          />
        )}

        {/* Project Management Automation Panel */}
        <ProjectAutomationPanel
          cards={cards}
          statuses={statuses}
          onUpdateCard={handleAutomatedUpdate}
          onBulkUpdate={handleBulkUpdate}
        />

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
      </div>
    </DndProvider>
  );
};

export default KanbanBoard;
// Force reload to clear any cached imports