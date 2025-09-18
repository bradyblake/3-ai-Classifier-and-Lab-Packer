import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Plus, 
  Settings, 
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  Package,
  FileText,
  Trash2,
  Edit3,
  Eye,
  ChevronRight,
  Building,
  Users,
  DollarSign,
  Target,
  Filter,
  Search,
  Download,
  MoreVertical,
  Tag,
  MapPin,
  Phone,
  Mail,
  Upload,
  Paperclip,
  History,
  Truck,
  Receipt,
  X
} from 'lucide-react';
import BackButton from './BackButton';
import ProjectTrackerSetup from './ProjectTrackerSetup';
import SmartNotesDropArea from './SmartNotesDropArea';
import { 
  generateTrackingNumber, 
  calculateDaysInStatus, 
  createProjectWithTracking,
  LOCATIONS,
  STATUS_REVENUE_MAPPING
} from '../utils/trackingUtils';

const EnhancedProjectTracker = () => {
  const [projects, setProjects] = useState([]);
  const [columns, setColumns] = useState({});
  const [settings, setSettings] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [scheduledNotes, setScheduledNotes] = useState([]);
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client: '',
    location: 'HOU',
    priority: 'medium',
    contacts: '',
    estimatedVolume: '',
    estimatedRevenue: 5000,
    vendors: [],
    progressNotes: [],
    attachments: [],
    assignments: []
  });

  // Load settings and initialize
  useEffect(() => {
    loadSettings();
    loadProjects();
    loadNotes();
  }, []);

  // Update columns when settings change
  useEffect(() => {
    if (settings) {
      const defaultColumns = {};
      settings.columns.forEach(col => {
        defaultColumns[col.id] = {
          id: col.id,
          title: col.title,
          color: col.color,
          revenueStage: col.revenueStage,
          items: []
        };
      });
      setColumns(defaultColumns);
      distributeProjectsToColumns(defaultColumns);
    }
  }, [settings, projects]);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('project_tracker_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error loading settings:', error);
        setDefaultSettings();
      }
    } else {
      setDefaultSettings();
    }
  };

  const setDefaultSettings = () => {
    const defaultSettings = {
      locations: { ...LOCATIONS },
      periodType: '13_PERIODS',
      columns: [
        { id: 'backlog', title: 'Backlog', color: '#f3f4f6', revenueStage: 'pipeline' },
        { id: 'planning', title: 'Planning', color: '#dbeafe', revenueStage: 'pipeline' },
        { id: 'quote-sent', title: 'Quote Sent', color: '#fed7aa', revenueStage: 'pipeline' },
        { id: 'quote-approved', title: 'Quote Approved', color: '#bbf7d0', revenueStage: 'projected' },
        { id: 'active', title: 'Active', color: '#fde68a', revenueStage: 'projected' },
        { id: 'completed', title: 'Completed', color: '#c7d2fe', revenueStage: 'billed' },
        { id: 'billed', title: 'Billed', color: '#d1fae5', revenueStage: 'billed' },
        { id: 'paid', title: 'Paid', color: '#dcfce7', revenueStage: 'collected' }
      ],
      revenueTracking: {
        trackPipeline: true,
        trackProjected: true,
        trackBilled: true,
        trackCollected: true,
        defaultRevenue: 5000,
        currency: 'USD'
      },
      trackingNumbers: {
        format: 'JULIAN',
        autoGenerate: true,
        includeLocation: true
      }
    };
    setSettings(defaultSettings);
    localStorage.setItem('project_tracker_settings', JSON.stringify(defaultSettings));
  };

  const loadProjects = () => {
    const savedProjects = localStorage.getItem('enhanced_project_tracker_projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
  };

  const saveProjects = (updatedProjects) => {
    localStorage.setItem('enhanced_project_tracker_projects', JSON.stringify(updatedProjects));
    setProjects(updatedProjects);
  };

  const loadNotes = () => {
    const savedNotes = localStorage.getItem('smart_notes');
    const savedTodos = localStorage.getItem('smart_todos');
    const savedScheduled = localStorage.getItem('scheduled_notes');
    
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    }
    
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (error) {
        console.error('Error loading todos:', error);
      }
    }
    
    if (savedScheduled) {
      try {
        setScheduledNotes(JSON.parse(savedScheduled));
      } catch (error) {
        console.error('Error loading scheduled notes:', error);
      }
    }
  };

  const distributeProjectsToColumns = (targetColumns) => {
    const newColumns = { ...targetColumns };
    
    // Clear existing items
    Object.keys(newColumns).forEach(key => {
      newColumns[key].items = [];
    });
    
    // Distribute projects
    projects.forEach(project => {
      const status = project.status || 'backlog';
      if (newColumns[status]) {
        newColumns[status].items.push(project);
      } else {
        newColumns.backlog?.items?.push(project);
      }
    });
    
    setColumns(newColumns);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && 
        destination.index === source.index) return;

    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    const draggedProject = sourceColumn.items.find(item => item.id === draggableId);

    if (!draggedProject) return;

    // Calculate days in previous status
    const daysInPrevious = calculateDaysInStatus(draggedProject.currentStatusSince);

    // Remove from source column
    const newSourceItems = [...sourceColumn.items];
    newSourceItems.splice(source.index, 1);

    // Add to destination column  
    const newDestItems = [...destColumn.items];
    newDestItems.splice(destination.index, 0, draggedProject);

    // Update project with status history
    const updatedProject = { 
      ...draggedProject, 
      status: destination.droppableId,
      currentStatusSince: new Date().toISOString(),
      statusHistory: [
        ...(draggedProject.statusHistory || []),
        {
          status: source.droppableId,
          changedAt: new Date().toISOString(),
          daysInStatus: daysInPrevious,
          note: `Moved from ${sourceColumn.title} to ${destColumn.title}`
        }
      ]
    };

    // Update columns
    const updatedColumns = {
      ...columns,
      [source.droppableId]: {
        ...sourceColumn,
        items: newSourceItems
      },
      [destination.droppableId]: {
        ...destColumn,
        items: newDestItems
      }
    };
    
    setColumns(updatedColumns);

    // Update projects array
    const updatedProjects = projects.map(p => 
      p.id === draggedProject.id ? updatedProject : p
    );
    saveProjects(updatedProjects);

    console.log(`Moved project "${draggedProject.name}" from ${source.droppableId} to ${destination.droppableId}`);
  };

  const createProject = () => {
    if (!newProject.name.trim()) {
      alert('Project name is required');
      return;
    }

    if (!settings) {
      alert('Settings not loaded. Please try again.');
      return;
    }

    // Parse contacts from string to array
    const contacts = newProject.contacts ? 
      newProject.contacts.split(',').map(c => c.trim()).filter(c => c) : [];

    const projectData = {
      ...newProject,
      contacts,
      priority: newProject.priority || 'medium',
      status: 'backlog'
    };

    try {
      const createdProject = createProjectWithTracking(projectData, {
        location: newProject.location,
        periodType: settings.trackingNumbers.format,
        autoGenerateJobNumber: settings.trackingNumbers.autoGenerate
      });
      
      const updatedProjects = [...projects, createdProject];
      saveProjects(updatedProjects);
      
      // Reset form
      setNewProject({
        name: '', description: '', client: '', location: 'HOU',
        priority: 'medium', contacts: '', estimatedVolume: '',
        estimatedRevenue: settings.revenueTracking.defaultRevenue,
        vendors: [], progressNotes: [], attachments: [], assignments: []
      });
      
      setShowNewProjectModal(false);
      
      console.log('✅ Project created with tracking number:', createdProject.trackingNumber);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const deleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        const updatedProjects = projects.filter(p => p.id !== projectId);
        saveProjects(updatedProjects);
        setShowProjectModal(false);
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const addNote = (noteData, projectId) => {
    if (projectId) {
      // Add note to specific project
      const updatedProjects = projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            progressNotes: [...(p.progressNotes || []), noteData]
          };
        }
        return p;
      });
      saveProjects(updatedProjects);
    } else {
      // Add to general notes
      const updatedNotes = [...notes, noteData];
      setNotes(updatedNotes);
      localStorage.setItem('smart_notes', JSON.stringify(updatedNotes));
    }
  };

  const addTodo = (todoData) => {
    const updatedTodos = [...todos, todoData];
    setTodos(updatedTodos);
    localStorage.setItem('smart_todos', JSON.stringify(updatedTodos));
  };

  const scheduleNote = (noteData) => {
    const updatedScheduled = [...scheduledNotes, noteData];
    setScheduledNotes(updatedScheduled);
    localStorage.setItem('scheduled_notes', JSON.stringify(updatedScheduled));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getLocationColor = (location) => {
    return settings?.locations[location]?.color || '#6b7280';
  };

  const calculateRevenueSummary = () => {
    const summary = {
      pipeline: 0,
      projected: 0,
      billed: 0,
      collected: 0
    };

    projects.forEach(project => {
      const revenueStage = STATUS_REVENUE_MAPPING[project.status];
      if (revenueStage && project.estimatedRevenue) {
        summary[revenueStage] += parseFloat(project.estimatedRevenue) || 0;
      }
    });

    return summary;
  };

  const filteredProjects = (items) => {
    return items.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === 'all' || 
                          (filterBy === 'high' && project.priority === 'high') ||
                          (filterBy === 'overdue' && calculateDaysInStatus(project.currentStatusSince) > 30);
                          
      const matchesLocation = filterLocation === 'all' || project.location === filterLocation;
      
      return matchesSearch && matchesFilter && matchesLocation;
    });
  };

  const generateReport = () => {
    const revenueSummary = calculateRevenueSummary();
    const reportData = Object.values(columns).map(column => ({
      status: column.title,
      count: column.items.length,
      revenue: column.items.reduce((sum, p) => sum + (parseFloat(p.estimatedRevenue) || 0), 0),
      projects: column.items.map(p => ({
        name: p.name,
        client: p.client,
        trackingNumber: p.trackingNumber,
        priority: p.priority,
        revenue: p.estimatedRevenue,
        location: p.location,
        daysInStatus: calculateDaysInStatus(p.currentStatusSince)
      }))
    }));

    const report = `PROJECT TRACKER REPORT
Generated: ${new Date().toLocaleString()}
Total Projects: ${projects.length}
Total Pipeline Revenue: $${revenueSummary.pipeline.toLocaleString()}
Total Projected Revenue: $${revenueSummary.projected.toLocaleString()}
Total Billed Revenue: $${revenueSummary.billed.toLocaleString()}
Total Collected Revenue: $${revenueSummary.collected.toLocaleString()}

${reportData.map(column => `
${column.status.toUpperCase()}: ${column.count} projects ($${column.revenue.toLocaleString()})
${column.projects.map(p => 
  `• ${p.trackingNumber} - ${p.name}${p.client ? ` (${p.client})` : ''} - $${(p.revenue || 0).toLocaleString()} - ${p.daysInStatus} days in status`
).join('\n')}
`).join('\n')}

Summary by Location:
${Object.keys(settings?.locations || {}).map(loc => {
  const locationProjects = projects.filter(p => p.location === loc);
  const locationRevenue = locationProjects.reduce((sum, p) => sum + (parseFloat(p.estimatedRevenue) || 0), 0);
  return `• ${loc}: ${locationProjects.length} projects ($${locationRevenue.toLocaleString()})`;
}).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Tracker_Report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const revenueSummary = calculateRevenueSummary();

  if (!settings) {
    return <div className="p-8 text-center">Loading settings...</div>;
  }

  return (
    <div className="project-tracker p-6 bg-gray-50 min-h-screen">
      <BackButton />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Project Tracker</h1>
            <p className="text-gray-600">
              Manage projects with automated tracking numbers and revenue calculations
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Smart Notes
            </button>
            <button
              onClick={() => setShowSetup(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Setup
            </button>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </button>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Pipeline</div>
            <div className="text-2xl font-bold text-blue-600">
              ${revenueSummary.pipeline.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Projected</div>
            <div className="text-2xl font-bold text-green-600">
              ${revenueSummary.projected.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Billed</div>
            <div className="text-2xl font-bold text-orange-600">
              ${revenueSummary.billed.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-sm text-gray-600">Collected</div>
            <div className="text-2xl font-bold text-purple-600">
              ${revenueSummary.collected.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects, clients, or tracking numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="overdue">Overdue (30+ days)</option>
          </select>
          
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Locations</option>
            {Object.entries(settings.locations).map(([key, location]) => (
              <option key={key} value={key}>{location.name}</option>
            ))}
          </select>
          
          <button
            onClick={generateReport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Smart Notes Area */}
      {showNotes && (
        <div className="mb-6">
          <SmartNotesDropArea
            projects={projects}
            onAddNote={addNote}
            onAddTodo={addTodo}
            onScheduleNote={scheduleNote}
          />
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {Object.values(columns).map(column => (
            <div key={column.id} className="min-w-80 bg-white rounded-lg shadow-sm border">
              <div 
                className="p-4 border-b"
                style={{ backgroundColor: column.color }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">{column.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="bg-white px-2 py-1 rounded text-sm font-medium text-gray-700">
                      {filteredProjects(column.items).length}
                    </span>
                    <span className="bg-white px-2 py-1 rounded text-xs text-gray-600">
                      ${column.items.reduce((sum, p) => sum + (parseFloat(p.estimatedRevenue) || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 min-h-96 space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                  >
                    {filteredProjects(column.items).map((project, index) => (
                      <Draggable key={project.id} draggableId={project.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                              snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                            }`}
                            onClick={() => {
                              setSelectedProject(project);
                              setShowProjectModal(true);
                            }}
                          >
                            {/* Project Header */}
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center mb-1">
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: getLocationColor(project.location) }}
                                  ></div>
                                  <span className="text-xs font-mono text-gray-500">
                                    {project.trackingNumber}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-gray-800 truncate">
                                  {project.name}
                                </h4>
                                {project.client && (
                                  <p className="text-sm text-gray-600 truncate">{project.client}</p>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end space-y-1">
                                <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(project.priority)}`}>
                                  {project.priority}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {calculateDaysInStatus(project.currentStatusSince)}d
                                </span>
                              </div>
                            </div>

                            {/* Revenue */}
                            {project.estimatedRevenue && (
                              <div className="flex items-center mb-2">
                                <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                                <span className="text-sm font-medium text-green-600">
                                  ${parseFloat(project.estimatedRevenue).toLocaleString()}
                                </span>
                              </div>
                            )}

                            {/* Vendors */}
                            {project.vendors && project.vendors.length > 0 && (
                              <div className="flex items-center mb-2">
                                <Truck className="w-4 h-4 text-blue-600 mr-1" />
                                <span className="text-xs text-gray-600">
                                  {project.vendors.length} vendor{project.vendors.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            {/* Progress Notes Count */}
                            {project.progressNotes && project.progressNotes.length > 0 && (
                              <div className="flex items-center mb-2">
                                <FileText className="w-4 h-4 text-purple-600 mr-1" />
                                <span className="text-xs text-gray-600">
                                  {project.progressNotes.length} note{project.progressNotes.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            {/* Attachments Count */}
                            {project.attachments && project.attachments.length > 0 && (
                              <div className="flex items-center">
                                <Paperclip className="w-4 h-4 text-gray-600 mr-1" />
                                <span className="text-xs text-gray-600">
                                  {project.attachments.length} file{project.attachments.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Setup Modal */}
      {showSetup && (
        <ProjectTrackerSetup
          isOpen={showSetup}
          onClose={() => setShowSetup(false)}
          onSave={(newSettings) => {
            setSettings(newSettings);
            setShowSetup(false);
          }}
        />
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Create New Project</h3>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input
                    type="text"
                    value={newProject.client}
                    onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Client name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={newProject.location}
                      onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(settings.locations).map(([key, location]) => (
                        <option key={key} value={key}>{location.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newProject.priority}
                      onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Revenue</label>
                  <input
                    type="number"
                    value={newProject.estimatedRevenue}
                    onChange={(e) => setNewProject({ ...newProject, estimatedRevenue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5000"
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacts (comma-separated)</label>
                  <input
                    type="text"
                    value={newProject.contacts}
                    onChange={(e) => setNewProject({ ...newProject, contacts: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@client.com, jane@client.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Volume</label>
                  <input
                    type="text"
                    value={newProject.estimatedVolume}
                    onChange={(e) => setNewProject({ ...newProject, estimatedVolume: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 500 containers, 10 tons"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  disabled={!newProject.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {showProjectModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{selectedProject.name}</h3>
                  <p className="text-gray-600">{selectedProject.trackingNumber}</p>
                </div>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Project Details */}
                <div>
                  <h4 className="font-semibold mb-3">Project Details</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Client:</strong> {selectedProject.client || 'Not specified'}</div>
                    <div><strong>Location:</strong> {settings.locations[selectedProject.location]?.name || selectedProject.location}</div>
                    <div><strong>Priority:</strong> <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedProject.priority)}`}>{selectedProject.priority}</span></div>
                    <div><strong>Revenue:</strong> ${(selectedProject.estimatedRevenue || 0).toLocaleString()}</div>
                    <div><strong>Days in Status:</strong> {calculateDaysInStatus(selectedProject.currentStatusSince)} days</div>
                    <div><strong>Created:</strong> {new Date(selectedProject.createdAt).toLocaleDateString()}</div>
                  </div>
                  
                  {selectedProject.description && (
                    <div className="mt-4">
                      <strong>Description:</strong>
                      <p className="text-sm text-gray-600 mt-1">{selectedProject.description}</p>
                    </div>
                  )}
                </div>

                {/* Status History */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <History className="w-4 h-4 mr-2" />
                    Status History
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedProject.statusHistory?.map((entry, index) => (
                      <div key={index} className="text-sm border-l-2 border-gray-200 pl-3">
                        <div className="font-medium">{entry.status}</div>
                        <div className="text-gray-600">{entry.daysInStatus} days</div>
                        <div className="text-xs text-gray-500">{new Date(entry.changedAt).toLocaleString()}</div>
                        {entry.note && <div className="text-xs text-gray-600 italic">{entry.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress Notes */}
              {selectedProject.progressNotes && selectedProject.progressNotes.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Progress Notes</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedProject.progressNotes.map((note, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                        <div>{note.text}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(note.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendors */}
              {selectedProject.vendors && selectedProject.vendors.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Truck className="w-4 h-4 mr-2" />
                    Vendors
                  </h4>
                  <div className="space-y-2">
                    {selectedProject.vendors.map((vendor, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="font-medium">{vendor.name}</div>
                        {vendor.quote && <div className="text-gray-600">Quote: ${vendor.quote.toLocaleString()}</div>}
                        {vendor.poNumber && <div className="text-gray-600">PO: {vendor.poNumber}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  onClick={() => deleteProject(selectedProject.id)}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50 flex items-center"
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete Project
                </button>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProjectTracker;