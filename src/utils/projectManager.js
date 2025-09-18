// Project Manager - Handles project creation and lab pack linking
export class ProjectManager {
  constructor() {
    this.storageKey = 'unboxed_projects';
  }

  // Get all projects
  getAllProjects() {
    try {
      const projectsData = localStorage.getItem(this.storageKey);
      return projectsData ? JSON.parse(projectsData) : [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  // Create new project
  createProject(projectData) {
    const projects = this.getAllProjects();
    const newProject = {
      id: Date.now().toString(),
      name: projectData.name,
      description: projectData.description || '',
      client: projectData.client || '',
      jobNumber: projectData.jobNumber || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      labPacks: [],
      materials: [],
      location: projectData.location || '',
      estimatedVolume: projectData.estimatedVolume || '',
      priority: projectData.priority || 'medium',
      dueDate: projectData.dueDate || null,
      contacts: projectData.contacts || []
    };

    projects.push(newProject);
    localStorage.setItem(this.storageKey, JSON.stringify(projects));
    
    console.log('✅ Project created:', newProject);
    return newProject;
  }

  // Update project
  updateProject(projectId, updates) {
    const projects = this.getAllProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error('Project not found');
    }

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.storageKey, JSON.stringify(projects));
    
    console.log('✅ Project updated:', projects[projectIndex]);
    return projects[projectIndex];
  }

  // Add lab pack to project
  addLabPackToProject(projectId, labPackData) {
    const projects = this.getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error('Project not found');
    }

    const labPackEntry = {
      id: Date.now().toString(),
      name: labPackData.name || `Lab Pack ${project.labPacks.length + 1}`,
      category: labPackData.category || 'mixed',
      materials: labPackData.materials || [],
      containerSize: labPackData.containerSize || '30-gal',
      estimatedWeight: labPackData.estimatedWeight || 'Unknown',
      specialHandling: labPackData.specialHandling || [],
      dotClass: labPackData.dotClass || '9',
      createdAt: new Date().toISOString(),
      status: 'planned'
    };

    project.labPacks.push(labPackEntry);
    project.updatedAt = new Date().toISOString();

    // Also add materials to project materials list
    if (labPackData.materials) {
      labPackData.materials.forEach(material => {
        if (!project.materials.some(m => m.id === material.id)) {
          project.materials.push({
            ...material,
            addedToProject: new Date().toISOString()
          });
        }
      });
    }

    localStorage.setItem(this.storageKey, JSON.stringify(projects));
    
    console.log('✅ Lab pack added to project:', { projectId, labPackEntry });
    return labPackEntry;
  }

  // Get project by ID
  getProject(projectId) {
    const projects = this.getAllProjects();
    return projects.find(p => p.id === projectId);
  }

  // Delete project
  deleteProject(projectId) {
    const projects = this.getAllProjects();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredProjects));
    
    console.log('✅ Project deleted:', projectId);
  }

  // Search projects
  searchProjects(query) {
    const projects = this.getAllProjects();
    const lowerQuery = query.toLowerCase();
    
    return projects.filter(project =>
      project.name.toLowerCase().includes(lowerQuery) ||
      project.description.toLowerCase().includes(lowerQuery) ||
      project.client.toLowerCase().includes(lowerQuery) ||
      project.jobNumber.toLowerCase().includes(lowerQuery)
    );
  }

  // Get project statistics
  getProjectStats(projectId) {
    const project = this.getProject(projectId);
    if (!project) return null;

    return {
      totalLabPacks: project.labPacks.length,
      totalMaterials: project.materials.length,
      hazardousMaterials: project.materials.filter(m => 
        m.classification?.hazardous || 
        m.rcraCharacteristic?.length > 0
      ).length,
      estimatedVolume: project.labPacks.reduce((total, pack) => {
        const volume = parseInt(pack.containerSize) || 30;
        return total + volume;
      }, 0),
      lastUpdated: project.updatedAt
    };
  }
}

export default new ProjectManager();