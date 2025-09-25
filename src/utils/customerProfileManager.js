// Customer Profile Manager
// Manages customer profiles and auto-population suggestions

class CustomerProfileManager {
  constructor() {
    this.storageKey = 'customer_profiles';
  }

  // Get auto-population suggestions for a customer
  getAutoPopulationSuggestions(customerName) {
    const profiles = this.getProfiles();
    const profile = profiles[customerName?.toLowerCase()];

    if (!profile) {
      return {
        suggestions: {
          confidence: 0,
          estimatedRevenue: 5000,
          preferredLocation: '',
          commonMaterials: []
        }
      };
    }

    // Calculate suggestions based on historical data
    const avgRevenue = profile.jobs.reduce((sum, job) => sum + (job.revenue || 0), 0) / profile.jobs.length;
    const commonLocation = this.getMostCommonLocation(profile.jobs);
    const materials = this.getCommonMaterials(profile.jobs);

    return {
      suggestions: {
        confidence: Math.min(profile.jobs.length * 0.2, 1),
        estimatedRevenue: Math.round(avgRevenue) || 5000,
        preferredLocation: commonLocation,
        commonMaterials: materials
      }
    };
  }

  // Add a job to customer history
  addJobToHistory(jobData) {
    const profiles = this.getProfiles();
    const customerKey = jobData.customerName?.toLowerCase();

    if (!customerKey) return;

    if (!profiles[customerKey]) {
      profiles[customerKey] = {
        name: jobData.customerName,
        jobs: [],
        created: new Date().toISOString()
      };
    }

    profiles[customerKey].jobs.push({
      jobNumber: jobData.jobNumber,
      location: jobData.location,
      revenue: jobData.revenue,
      completedDate: jobData.completedDate,
      materials: jobData.materials || [],
      labPacks: jobData.labPacks || []
    });

    this.saveProfiles(profiles);
  }

  // Get all customer profiles
  getProfiles() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || {};
    } catch (error) {
      console.error('Error loading customer profiles:', error);
      return {};
    }
  }

  // Save profiles to localStorage
  saveProfiles(profiles) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error saving customer profiles:', error);
    }
  }

  // Get most common location for a customer
  getMostCommonLocation(jobs) {
    const locationCounts = {};
    jobs.forEach(job => {
      if (job.location) {
        locationCounts[job.location] = (locationCounts[job.location] || 0) + 1;
      }
    });

    let maxCount = 0;
    let commonLocation = '';
    Object.entries(locationCounts).forEach(([location, count]) => {
      if (count > maxCount) {
        maxCount = count;
        commonLocation = location;
      }
    });

    return commonLocation;
  }

  // Get common materials across jobs
  getCommonMaterials(jobs) {
    const materialCounts = {};

    jobs.forEach(job => {
      (job.materials || []).forEach(material => {
        const key = material.productName || material;
        materialCounts[key] = (materialCounts[key] || 0) + 1;
      });
    });

    return Object.entries(materialCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ productName: name, count }));
  }
}

// Export singleton instance
const customerProfileManager = new CustomerProfileManager();
export default customerProfileManager;