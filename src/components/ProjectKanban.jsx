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
  Mail
} from 'lucide-react';
import BackButton from './BackButton';
import projectManager from '../utils/projectManager.js';

const ProjectKanban = () => {
  const [projects, setProjects] = useState([]);
  const [columns, setColumns] = useState({
    backlog: { id: 'backlog', title: 'Backlog', color: 'bg-gray-100', items: [] },
    planning: { id: 'planning', title: 'Planning', color: 'bg-blue-100', items: [] },
    active: { id: 'active', title: 'Active', color: 'bg-yellow-100', items: [] },
    review: { id: 'review', title: 'Review', color: 'bg-purple-100', items: [] },
    completed: { id: 'completed', title: 'Completed', color: 'bg-green-100', items: [] }
  });
  
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client: '',
    jobNumber: '',
    location: '',
    priority: 'medium',
    dueDate: '',
    contacts: '',
    estimatedVolume: ''
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const allProjects = projectManager.getAllProjects();
    setProjects(allProjects);
    
    // Distribute projects into columns based on status
    const newColumns = { ...columns };
    
    // Clear existing items
    Object.keys(newColumns).forEach(key => {
      newColumns[key].items = [];
    });
    
    // Distribute projects
    allProjects.forEach(project => {
      const status = project.status || 'backlog';
      if (newColumns[status]) {
        newColumns[status].items.push(project);
      } else {
        newColumns.backlog.items.push(project);
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

    // Remove from source column
    const newSourceItems = [...sourceColumn.items];
    newSourceItems.splice(source.index, 1);

    // Add to destination column  
    const newDestItems = [...destColumn.items];
    newDestItems.splice(destination.index, 0, draggedProject);

    // Update project status
    const updatedProject = { ...draggedProject, status: destination.droppableId };
    projectManager.updateProject(draggedProject.id, { status: destination.droppableId });

    // Update columns
    setColumns({
      ...columns,
      [source.droppableId]: {
        ...sourceColumn,
        items: newSourceItems
      },
      [destination.droppableId]: {
        ...destColumn,
        items: newDestItems
      }
    });

    console.log(`Moved project "${draggedProject.name}" from ${source.droppableId} to ${destination.droppableId}`);
  };

  const createProject = () => {
    if (!newProject.name.trim()) {
      alert('Project name is required');
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
      const createdProject = projectManager.createProject(projectData);
      
      // Reset form
      setNewProject({
        name: '', description: '', client: '', jobNumber: '', location: '',
        priority: 'medium', dueDate: '', contacts: '', estimatedVolume: ''
      });
      
      setShowNewProjectModal(false);
      loadProjects();
      
      console.log('✅ Project created and added to Kanban board');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    }
  };

  const deleteProject = (projectId) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        projectManager.deleteProject(projectId);
        loadProjects();
        setShowProjectModal(false);
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Failed to delete project');
      }
    }
  };

  const loadLabPacksToPlanner = (project) => {
    try {
      if (!project.labPacks || project.labPacks.length === 0) {
        alert('No lab packs found in this project');
        return;
      }

      // Format lab pack data to match the expected import structure
      const importData = {
        containers: [{
          containers: []
        }]
      };

      // Convert lab pack materials to import format
      project.labPacks.forEach(labPack => {
        if (labPack.materials && labPack.materials.length > 0) {
          labPack.materials.forEach(material => {
            importData.containers[0].containers.push({
              container_id: material.id || Date.now().toString(),
              product_name: material.productName,
              classification: {
                productName: material.productName,
                physicalState: material.physicalState,
                pH: material.pH,
                flashPoint: material.flashPoint,
                hazardClass: material.hazardClass,
                packingGroup: material.packingGroup,
                unNumber: material.unNumber
              },
              // Preserve all material properties
              ...material,
              // Add lab pack context
              labPackName: labPack.name,
              labPackCategory: labPack.category,
              containerSize: labPack.containerSize,
              projectId: project.id,
              projectName: project.name
            });
          });
        }
      });

      // Store in localStorage for LabPackPlanner to pick up
      localStorage.setItem('labpack_import_data', JSON.stringify(importData));
      
      console.log('✅ Lab pack data prepared for import:', importData);
      alert(`Loaded ${importData.containers[0].containers.length} materials from ${project.labPacks.length} lab pack(s)`);

      // Navigate to LabPackPlanner
      if (window.setActiveTool) {
        window.setActiveTool('LabPackPlanner');
        setShowProjectModal(false);
      }

    } catch (error) {
      console.error('Error loading lab packs to planner:', error);
      alert('Failed to load lab packs. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredProjects = (items) => {
    return items.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          project.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterBy === 'all' || 
                          (filterBy === 'high' && project.priority === 'high') ||
                          (filterBy === 'overdue' && getDaysUntilDue(project.dueDate) < 0) ||
                          (filterBy === 'due-soon' && getDaysUntilDue(project.dueDate) >= 0 && getDaysUntilDue(project.dueDate) <= 7);
      
      return matchesSearch && matchesFilter;
    });
  };

  const generateReport = () => {
    const reportData = Object.values(columns).map(column => ({
      status: column.title,
      count: column.items.length,
      projects: column.items.map(p => ({
        name: p.name,
        client: p.client,
        priority: p.priority,
        dueDate: p.dueDate,
        labPacks: p.labPacks?.length || 0
      }))
    }));

    const report = `PROJECT KANBAN BOARD REPORT
Generated: ${new Date().toLocaleString()}
Total Projects: ${projects.length}

${reportData.map(column => `
${column.status.toUpperCase()}: ${column.count} projects
${column.projects.map(p => 
  `• ${p.name}${p.client ? ` (${p.client})` : ''}${p.dueDate ? ` - Due: ${new Date(p.dueDate).toLocaleDateString()}` : ''}`
).join('\n')}
`).join('\n')}

Summary:
• Active Projects: ${columns.active.items.length}
• Pending Review: ${columns.review.items.length}
• Completed This Period: ${columns.completed.items.length}
• High Priority: ${projects.filter(p => p.priority === 'high').length}
• Overdue: ${projects.filter(p => getDaysUntilDue(p.dueDate) < 0).length}

Generated by unboXed Dashboard Project Tracker
`;

    // Download report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_Tracker_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <BackButton />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            📋 Project Tracker
          </h1>
          <p className="text-gray-600">
            Manage waste management projects with drag-and-drop workflow organization
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="mr-2" size={16} />
            New Project
          </button>
          <button
            onClick={generateReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <Download className="mr-2" size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(columns).map(([key, column]) => (
          <div key={key} className={`${column.color} border rounded-lg p-4 text-center`}>
            <div className="text-2xl font-bold text-gray-800">{column.items.length}</div>
            <div className="text-sm font-medium text-gray-600">{column.title}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              <option value="high">High Priority</option>
              <option value="overdue">Overdue</option>
              <option value="due-soon">Due Soon</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6">
          {Object.entries(columns).map(([columnId, column]) => (
            <div key={columnId} className="flex-shrink-0 w-80">
              <div className={`${column.color} rounded-lg border p-4`}>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                  {column.title}
                  <span className="bg-white rounded-full px-2 py-1 text-sm font-medium">
                    {filteredProjects(column.items).length}
                  </span>
                </h3>
                
                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-3 min-h-96 ${
                        snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg p-2' : ''
                      }`}
                    >
                      {filteredProjects(column.items).map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg border shadow-sm p-4 cursor-move transition-all hover:shadow-md ${
                                snapshot.isDragging ? 'rotate-2 shadow-lg' : ''
                              }`}
                              onClick={() => {
                                setSelectedProject(project);
                                setShowProjectModal(true);
                              }}
                            >
                              {/* Project Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-800 mb-1">{project.name}</h4>
                                  {project.client && (
                                    <div className="text-sm text-gray-600 flex items-center">
                                      <Building size={12} className="mr-1" />
                                      {project.client}
                                    </div>
                                  )}
                                  {project.jobNumber && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Job #{project.jobNumber}
                                    </div>
                                  )}
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                                  {project.priority}
                                </div>
                              </div>

                              {/* Project Details */}
                              {project.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {project.description}
                                </p>
                              )}

                              {/* Project Metrics */}
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                <div className="flex items-center gap-3">
                                  {project.labPacks?.length > 0 && (
                                    <span className="flex items-center">
                                      <Package size={12} className="mr-1" />
                                      {project.labPacks.length} packs
                                    </span>
                                  )}
                                  {project.location && (
                                    <span className="flex items-center">
                                      <MapPin size={12} className="mr-1" />
                                      {project.location}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Due Date */}
                              {project.dueDate && (
                                <div className="flex items-center text-xs">
                                  <Calendar size={12} className="mr-1" />
                                  {(() => {
                                    const daysUntil = getDaysUntilDue(project.dueDate);
                                    const isOverdue = daysUntil < 0;
                                    const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
                                    
                                    return (
                                      <span className={`${
                                        isOverdue ? 'text-red-600' : 
                                        isDueSoon ? 'text-orange-600' : 'text-gray-500'
                                      }`}>
                                        Due: {new Date(project.dueDate).toLocaleDateString()}
                                        {isOverdue && ' (Overdue)'}
                                        {isDueSoon && !isOverdue && ` (${daysUntil} days)`}
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Progress Indicator */}
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                                  <div className="flex items-center">
                                    <Eye size={12} className="mr-1" />
                                    View Details
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {/* Empty Column State */}
                      {filteredProjects(column.items).length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-sm">No projects in {column.title.toLowerCase()}</div>
                          {columnId === 'backlog' && (
                            <button
                              onClick={() => setShowNewProjectModal(true)}
                              className="mt-2 text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center mx-auto"
                            >
                              <Plus size={14} className="mr-1" />
                              Add Project
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create New Project</h2>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client/Company
                  </label>
                  <input
                    type="text"
                    value={newProject.client}
                    onChange={(e) => setNewProject({...newProject, client: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Client name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Number
                  </label>
                  <input
                    type="text"
                    value={newProject.jobNumber}
                    onChange={(e) => setNewProject({...newProject, jobNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Job #"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newProject.location}
                    onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Project location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newProject.dueDate}
                    onChange={(e) => setNewProject({...newProject, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project description..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={createProject}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                >
                  Create Project
                </button>
                <button
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {showProjectModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{selectedProject.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Open SDS Analyzer to add materials
                      if (window.setActiveTool) {
                        window.setActiveTool('SDSAnalyzer');
                        setShowProjectModal(false);
                      }
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center"
                  >
                    <Package className="mr-1" size={14} />
                    Add Materials
                  </button>
                  <button
                    onClick={() => setShowProjectModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Project Information</h3>
                  <div className="space-y-2 text-sm">
                    {selectedProject.client && (
                      <div className="flex items-center">
                        <Building size={14} className="mr-2 text-gray-500" />
                        <span className="font-medium">Client:</span>
                        <span className="ml-2">{selectedProject.client}</span>
                      </div>
                    )}
                    {selectedProject.jobNumber && (
                      <div className="flex items-center">
                        <Tag size={14} className="mr-2 text-gray-500" />
                        <span className="font-medium">Job Number:</span>
                        <span className="ml-2">{selectedProject.jobNumber}</span>
                      </div>
                    )}
                    {selectedProject.location && (
                      <div className="flex items-center">
                        <MapPin size={14} className="mr-2 text-gray-500" />
                        <span className="font-medium">Location:</span>
                        <span className="ml-2">{selectedProject.location}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <AlertCircle size={14} className="mr-2 text-gray-500" />
                      <span className="font-medium">Priority:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${getPriorityColor(selectedProject.priority)}`}>
                        {selectedProject.priority}
                      </span>
                    </div>
                    {selectedProject.dueDate && (
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-2 text-gray-500" />
                        <span className="font-medium">Due Date:</span>
                        <span className="ml-2">{new Date(selectedProject.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Project Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Clock size={14} className="mr-2 text-gray-500" />
                      <span className="font-medium">Status:</span>
                      <span className="ml-2 capitalize">{selectedProject.status}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2 text-gray-500" />
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">{new Date(selectedProject.createdAt).toLocaleDateString()}</span>
                    </div>
                    {selectedProject.labPacks?.length > 0 && (
                      <div className="flex items-center">
                        <Package size={14} className="mr-2 text-gray-500" />
                        <span className="font-medium">Lab Packs:</span>
                        <span className="ml-2">{selectedProject.labPacks.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedProject.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded">
                    {selectedProject.description}
                  </p>
                </div>
              )}

              {/* Lab Packs Section */}
              {selectedProject.labPacks && selectedProject.labPacks.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <Package size={16} className="mr-2" />
                    Lab Packs ({selectedProject.labPacks.length})
                  </h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedProject.labPacks.map((labPack, index) => (
                      <div key={labPack.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-800">{labPack.name}</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {labPack.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Materials: {labPack.materials?.length || 0}</div>
                          <div>Container: {labPack.containerSize}</div>
                          {labPack.specialHandling && labPack.specialHandling.length > 0 && (
                            <div>Special Handling: {labPack.specialHandling.join(', ')}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Integration Prompts */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-800 mb-3">Quick Actions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      if (window.setActiveTool) {
                        window.setActiveTool('SDSAnalyzer');
                        setShowProjectModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center justify-center"
                  >
                    <FileText className="mr-2" size={14} />
                    Analyze SDS Files
                  </button>
                  <button
                    onClick={() => {
                      if (window.setActiveTool) {
                        window.setActiveTool('LabPackPlanner');
                        setShowProjectModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center justify-center"
                  >
                    <Package className="mr-2" size={14} />
                    Plan Lab Packs
                  </button>
                  {selectedProject.labPacks && selectedProject.labPacks.length > 0 && (
                    <button
                      onClick={() => loadLabPacksToPlanner(selectedProject)}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm flex items-center justify-center"
                      title="Load existing lab packs from this project into the planner"
                    >
                      <Download className="mr-2" size={14} />
                      Load Lab Packs ({selectedProject.labPacks.length})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.setActiveTool) {
                        window.setActiveTool('LeadGenerator');
                        setShowProjectModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center justify-center"
                  >
                    <Target className="mr-2" size={14} />
                    Find Similar Leads
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => deleteProject(selectedProject.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
                >
                  <Trash2 className="mr-2" size={14} />
                  Delete Project
                </button>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
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

export default ProjectKanban;