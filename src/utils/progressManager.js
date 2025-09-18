// Progress Manager - Tracks and manages user progress across all components
export class ProgressManager {
  constructor() {
    this.storageKey = 'unboxed_user_progress';
    this.sessionKey = 'unboxed_active_session';
  }

  // Get all saved progress
  getAllProgress() {
    try {
      const progressData = localStorage.getItem(this.storageKey);
      return progressData ? JSON.parse(progressData) : [];
    } catch (error) {
      console.error('Error loading progress:', error);
      return [];
    }
  }

  // Get current active session
  getActiveSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error loading active session:', error);
      return null;
    }
  }

  // Save progress for a specific workflow
  saveProgress(workflowType, progressData) {
    const progress = this.getAllProgress();
    const timestamp = new Date().toISOString();
    
    const progressEntry = {
      id: `${workflowType}_${Date.now()}`,
      workflowType: workflowType,
      timestamp: timestamp,
      lastUpdated: timestamp,
      data: progressData,
      status: 'in_progress',
      completionPercentage: this.calculateCompletion(workflowType, progressData)
    };

    // Check if there's an existing progress entry for this workflow
    const existingIndex = progress.findIndex(p => 
      p.workflowType === workflowType && 
      p.status === 'in_progress' &&
      this.isSameWorkflow(p.data, progressData)
    );

    if (existingIndex >= 0) {
      // Update existing progress
      progress[existingIndex] = {
        ...progress[existingIndex],
        ...progressEntry,
        id: progress[existingIndex].id // Keep original ID
      };
    } else {
      // Add new progress entry
      progress.push(progressEntry);
    }

    // Keep only last 50 progress entries
    if (progress.length > 50) {
      progress.splice(0, progress.length - 50);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(progress));
    
    // Update active session
    this.setActiveSession(progressEntry);
    
    console.log('✅ Progress saved for workflow:', workflowType, progressEntry);
    return progressEntry;
  }

  // Set active session
  setActiveSession(progressEntry) {
    localStorage.setItem(this.sessionKey, JSON.stringify(progressEntry));
  }

  // Clear active session
  clearActiveSession() {
    localStorage.removeItem(this.sessionKey);
  }

  // Mark progress as completed
  completeProgress(progressId) {
    const progress = this.getAllProgress();
    const progressIndex = progress.findIndex(p => p.id === progressId);
    
    if (progressIndex >= 0) {
      progress[progressIndex].status = 'completed';
      progress[progressIndex].completedAt = new Date().toISOString();
      progress[progressIndex].completionPercentage = 100;
      
      localStorage.setItem(this.storageKey, JSON.stringify(progress));
      
      // Clear active session if this was the active workflow
      const activeSession = this.getActiveSession();
      if (activeSession && activeSession.id === progressId) {
        this.clearActiveSession();
      }
      
      console.log('✅ Progress marked as completed:', progressId);
    }
  }

  // Resume progress for a workflow
  resumeProgress(progressId) {
    const progress = this.getAllProgress();
    const progressEntry = progress.find(p => p.id === progressId);
    
    if (progressEntry && progressEntry.status === 'in_progress') {
      this.setActiveSession(progressEntry);
      console.log('🔄 Resumed progress for workflow:', progressEntry.workflowType);
      return progressEntry;
    }
    
    return null;
  }

  // Get progress for specific workflow type
  getProgressForWorkflow(workflowType) {
    const progress = this.getAllProgress();
    return progress.filter(p => p.workflowType === workflowType)
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  }

  // Get in-progress workflows
  getInProgressWorkflows() {
    const progress = this.getAllProgress();
    return progress.filter(p => p.status === 'in_progress')
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
  }

  // Calculate completion percentage based on workflow type and data
  calculateCompletion(workflowType, data) {
    switch (workflowType) {
      case 'sds_analysis':
        return this.calculateSDSAnalysisCompletion(data);
      case 'lab_pack_planning':
        return this.calculateLabPackCompletion(data);
      case 'project_creation':
        return this.calculateProjectCreationCompletion(data);
      case 'manifest_generation':
        return this.calculateManifestCompletion(data);
      case 'waste_profile_generation':
        return this.calculateWasteProfileCompletion(data);
      default:
        return data.completionPercentage || 0;
    }
  }

  // Calculate SDS Analysis completion
  calculateSDSAnalysisCompletion(data) {
    let completion = 0;
    
    if (data.filesUploaded > 0) completion += 30;
    if (data.analysisComplete) completion += 40;
    if (data.exportedToLabPack) completion += 20;
    if (data.linkedToProject) completion += 10;
    
    return Math.min(100, completion);
  }

  // Calculate Lab Pack planning completion
  calculateLabPackCompletion(data) {
    let completion = 0;
    
    if (data.materialsLoaded > 0) completion += 20;
    if (data.labPacksCreated > 0) completion += 30;
    if (data.compatibilityChecked) completion += 20;
    if (data.wasteProfileGenerated) completion += 15;
    if (data.linkedToProject) completion += 15;
    
    return Math.min(100, completion);
  }

  // Calculate project creation completion
  calculateProjectCreationCompletion(data) {
    let completion = 0;
    
    if (data.basicInfoComplete) completion += 40;
    if (data.customerSelected) completion += 20;
    if (data.materialsAdded) completion += 20;
    if (data.revenueEstimated) completion += 10;
    if (data.schedulingComplete) completion += 10;
    
    return Math.min(100, completion);
  }

  // Calculate manifest generation completion
  calculateManifestCompletion(data) {
    let completion = 0;
    
    if (data.projectSelected) completion += 20;
    if (data.wasteStreamsGenerated) completion += 30;
    if (data.complianceChecked) completion += 20;
    if (data.manifestGenerated) completion += 20;
    if (data.exported) completion += 10;
    
    return Math.min(100, completion);
  }

  // Calculate waste profile generation completion
  calculateWasteProfileCompletion(data) {
    let completion = 0;
    
    if (data.labPacksSelected) completion += 30;
    if (data.profileGenerated) completion += 40;
    if (data.validated) completion += 20;
    if (data.exported) completion += 10;
    
    return Math.min(100, completion);
  }

  // Check if two workflow data objects represent the same workflow
  isSameWorkflow(data1, data2) {
    // For SDS analysis, match by session or file list
    if (data1.workflowType === 'sds_analysis' && data2.workflowType === 'sds_analysis') {
      return data1.sessionId === data2.sessionId || 
             JSON.stringify(data1.fileNames?.sort()) === JSON.stringify(data2.fileNames?.sort());
    }
    
    // For lab pack planning, match by material set
    if (data1.workflowType === 'lab_pack_planning' && data2.workflowType === 'lab_pack_planning') {
      return data1.materialSetId === data2.materialSetId ||
             data1.queueSnapshot === data2.queueSnapshot;
    }
    
    // For project creation, match by customer and job number
    if (data1.workflowType === 'project_creation' && data2.workflowType === 'project_creation') {
      return data1.customerName === data2.customerName && 
             data1.jobNumber === data2.jobNumber;
    }
    
    // Default: different workflows
    return false;
  }

  // Get workflow statistics
  getWorkflowStats() {
    const progress = this.getAllProgress();
    const stats = {
      total: progress.length,
      inProgress: progress.filter(p => p.status === 'in_progress').length,
      completed: progress.filter(p => p.status === 'completed').length,
      byWorkflow: {},
      averageCompletion: 0,
      recentActivity: progress.filter(p => {
        const lastUpdated = new Date(p.lastUpdated);
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return lastUpdated > dayAgo;
      }).length
    };

    // Calculate by workflow type
    progress.forEach(p => {
      if (!stats.byWorkflow[p.workflowType]) {
        stats.byWorkflow[p.workflowType] = {
          total: 0,
          inProgress: 0,
          completed: 0,
          avgCompletion: 0
        };
      }
      
      stats.byWorkflow[p.workflowType].total++;
      if (p.status === 'in_progress') stats.byWorkflow[p.workflowType].inProgress++;
      if (p.status === 'completed') stats.byWorkflow[p.workflowType].completed++;
    });

    // Calculate average completion
    if (progress.length > 0) {
      stats.averageCompletion = progress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / progress.length;
    }

    // Calculate average completion by workflow
    Object.keys(stats.byWorkflow).forEach(workflowType => {
      const workflowProgress = progress.filter(p => p.workflowType === workflowType);
      if (workflowProgress.length > 0) {
        stats.byWorkflow[workflowType].avgCompletion = 
          workflowProgress.reduce((sum, p) => sum + (p.completionPercentage || 0), 0) / workflowProgress.length;
      }
    });

    return stats;
  }

  // Export progress data
  exportProgress() {
    const progress = this.getAllProgress();
    const exportData = {
      exportDate: new Date().toISOString(),
      totalEntries: progress.length,
      progress: progress
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Import progress data
  importProgress(progressData) {
    try {
      const imported = JSON.parse(progressData);
      if (imported.progress && Array.isArray(imported.progress)) {
        localStorage.setItem(this.storageKey, JSON.stringify(imported.progress));
        console.log('✅ Progress data imported:', imported.totalEntries, 'entries');
        return true;
      }
    } catch (error) {
      console.error('Error importing progress:', error);
    }
    return false;
  }

  // Clean up old progress entries
  cleanupProgress() {
    const progress = this.getAllProgress();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredProgress = progress.filter(p => {
      const lastUpdated = new Date(p.lastUpdated);
      // Keep completed entries for 30 days, in-progress entries indefinitely
      return p.status === 'in_progress' || lastUpdated > thirtyDaysAgo;
    });

    if (filteredProgress.length !== progress.length) {
      localStorage.setItem(this.storageKey, JSON.stringify(filteredProgress));
      console.log(`🗑️ Cleaned up ${progress.length - filteredProgress.length} old progress entries`);
    }
  }

  // Delete specific progress entry
  deleteProgress(progressId) {
    const progress = this.getAllProgress();
    const filteredProgress = progress.filter(p => p.id !== progressId);
    localStorage.setItem(this.storageKey, JSON.stringify(filteredProgress));
    
    // Clear active session if this was the active workflow
    const activeSession = this.getActiveSession();
    if (activeSession && activeSession.id === progressId) {
      this.clearActiveSession();
    }
    
    console.log('✅ Progress entry deleted:', progressId);
  }

  // Generate progress summary
  generateProgressSummary() {
    const stats = this.getWorkflowStats();
    const inProgress = this.getInProgressWorkflows();
    const activeSession = this.getActiveSession();

    return {
      overview: {
        totalWorkflows: stats.total,
        inProgress: stats.inProgress,
        completed: stats.completed,
        averageCompletion: Math.round(stats.averageCompletion),
        recentActivity: stats.recentActivity
      },
      activeSession: activeSession ? {
        workflowType: activeSession.workflowType,
        completion: activeSession.completionPercentage,
        lastUpdated: activeSession.lastUpdated,
        canResume: true
      } : null,
      inProgressWorkflows: inProgress.slice(0, 5).map(p => ({
        id: p.id,
        type: p.workflowType,
        completion: p.completionPercentage,
        lastUpdated: p.lastUpdated,
        description: this.getWorkflowDescription(p)
      })),
      workflowBreakdown: Object.entries(stats.byWorkflow).map(([type, data]) => ({
        type: type,
        ...data
      }))
    };
  }

  // Get human-readable workflow description
  getWorkflowDescription(progress) {
    const descriptions = {
      'sds_analysis': `SDS Analysis - ${progress.data.filesUploaded || 0} files`,
      'lab_pack_planning': `Lab Pack Planning - ${progress.data.materialsLoaded || 0} materials`,
      'project_creation': `Project: ${progress.data.customerName || 'New Project'}`,
      'manifest_generation': `Manifest for ${progress.data.projectName || 'Project'}`,
      'waste_profile_generation': `Waste Profile - ${progress.data.labPackCount || 0} lab packs`
    };
    
    return descriptions[progress.workflowType] || progress.workflowType;
  }

  // Check for abandoned workflows (no activity for 24 hours)
  getAbandonedWorkflows() {
    const progress = this.getAllProgress();
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);

    return progress.filter(p => {
      const lastUpdated = new Date(p.lastUpdated);
      return p.status === 'in_progress' && lastUpdated < dayAgo;
    });
  }

  // Suggest workflows to resume
  suggestWorkflowsToResume() {
    const inProgress = this.getInProgressWorkflows();
    const suggestions = [];

    inProgress.forEach(p => {
      if (p.completionPercentage > 50) {
        suggestions.push({
          priority: 'high',
          reason: 'More than 50% complete',
          progress: p
        });
      } else if (p.completionPercentage > 20) {
        suggestions.push({
          priority: 'medium',
          reason: 'Significant progress made',
          progress: p
        });
      }
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

export default new ProgressManager();