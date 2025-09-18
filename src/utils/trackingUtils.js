// Enhanced Project Tracker Utilities
// Generates tracking numbers, manages locations, and handles revenue calculations

export const LOCATIONS = {
  'HOU': { name: 'Houston', color: '#dc2626', abbreviation: 'HOU' }, // Red
  'DAL': { name: 'Dallas', color: '#2563eb', abbreviation: 'DAL' },   // Blue
  'AUS': { name: 'Austin', color: '#16a34a', abbreviation: 'AUS' },   // Green
  'SA': { name: 'San Antonio', color: '#ca8a04', abbreviation: 'SA' }, // Yellow
  'EP': { name: 'El Paso', color: '#9333ea', abbreviation: 'EP' },     // Purple
  'COR': { name: 'Corpus Christi', color: '#ea580c', abbreviation: 'COR' }, // Orange
  'FW': { name: 'Fort Worth', color: '#0891b2', abbreviation: 'FW' },  // Cyan
  'LUB': { name: 'Lubbock', color: '#be123c', abbreviation: 'LUB' },   // Rose
};

export const PERIOD_TYPES = {
  '13_PERIODS': { name: '13 Periods (28 days each)', periods: 13, daysPerPeriod: 28 },
  '12_MONTHS': { name: '12 Monthly Periods', periods: 12, daysPerPeriod: 30 },
  '4_QUARTERS': { name: '4 Quarterly Periods', periods: 4, daysPerPeriod: 91 },
  '26_BIWEEKLY': { name: '26 Bi-weekly Periods', periods: 26, daysPerPeriod: 14 },
  '52_WEEKLY': { name: '52 Weekly Periods', periods: 52, daysPerPeriod: 7 },
};

// Generate unique tracking number
export const generateTrackingNumber = (location, periodType = 'JULIAN') => {
  const now = new Date();
  const year = now.getFullYear();
  const locationAbbr = LOCATIONS[location]?.abbreviation || 'UNK';
  
  let periodIdentifier = '';
  
  switch (periodType) {
    case 'JULIAN':
      // Julian day (1-366)
      const start = new Date(year, 0, 0);
      const diff = now - start;
      const julianDay = Math.floor(diff / (1000 * 60 * 60 * 24));
      periodIdentifier = String(julianDay).padStart(3, '0');
      break;
      
    case 'PERIOD':
      // 13-period system (1-13)
      const periodNum = Math.ceil((now.getMonth() + 1) * 13 / 12);
      periodIdentifier = String(periodNum).padStart(2, '0');
      break;
      
    case 'QUARTER':
      // Quarterly (Q1-Q4)
      const quarter = Math.ceil((now.getMonth() + 1) / 3);
      periodIdentifier = `Q${quarter}`;
      break;
      
    case 'MONTH':
      // Monthly (01-12)
      periodIdentifier = String(now.getMonth() + 1).padStart(2, '0');
      break;
      
    default:
      periodIdentifier = String(now.getMonth() + 1).padStart(2, '0');
  }
  
  // Add sequential number for same day
  const dailySequence = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  
  return `${locationAbbr}-${year}-${periodIdentifier}-${dailySequence}`;
};

// Calculate days in current status
export const calculateDaysInStatus = (statusChangeDate) => {
  if (!statusChangeDate) return 0;
  const now = new Date();
  const statusDate = new Date(statusChangeDate);
  const diffTime = now - statusDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Revenue calculation stages
export const REVENUE_STAGES = {
  PIPELINE: 'pipeline',     // Initial lead/quote stage
  PROJECTED: 'projected',   // Signed contract/approved
  BILLED: 'billed',        // Invoice sent
  COLLECTED: 'collected'   // Payment received
};

// Status to revenue stage mapping
export const STATUS_REVENUE_MAPPING = {
  'backlog': REVENUE_STAGES.PIPELINE,
  'planning': REVENUE_STAGES.PIPELINE,
  'quote-sent': REVENUE_STAGES.PIPELINE,
  'quote-approved': REVENUE_STAGES.PROJECTED,
  'active': REVENUE_STAGES.PROJECTED,
  'scheduled': REVENUE_STAGES.PROJECTED,
  'in-progress': REVENUE_STAGES.PROJECTED,
  'completed': REVENUE_STAGES.BILLED,
  'billed': REVENUE_STAGES.BILLED,
  'paid': REVENUE_STAGES.COLLECTED
};

// Calculate current period
export const getCurrentPeriod = (periodType = '13_PERIODS') => {
  const now = new Date();
  const year = now.getFullYear();
  const config = PERIOD_TYPES[periodType];
  
  if (periodType === '13_PERIODS') {
    // 13 periods of 28 days each
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
    const period = Math.ceil(dayOfYear / 28);
    return Math.min(period, 13);
  }
  
  if (periodType === '12_MONTHS') {
    return now.getMonth() + 1;
  }
  
  if (periodType === '4_QUARTERS') {
    return Math.ceil((now.getMonth() + 1) / 3);
  }
  
  return 1;
};

// Generate period summary data
export const generatePeriodSummary = (projects, period, location = null) => {
  const filtered = location 
    ? projects.filter(p => p.location === location)
    : projects;
  
  const summary = {
    period,
    location: location || 'All Locations',
    newLeads: 0,
    quotesSent: 0,
    quotesApproved: 0,
    jobsScheduled: 0,
    jobsCompleted: 0,
    jobsBilled: 0,
    totalRevenue: {
      pipeline: 0,
      projected: 0,
      billed: 0,
      collected: 0
    },
    vendors: new Map(),
    disposalSites: new Map(),
    projects: []
  };
  
  filtered.forEach(project => {
    // Count project stages
    if (project.status === 'backlog') summary.newLeads++;
    if (project.status === 'quote-sent') summary.quotesSent++;
    if (project.status === 'quote-approved') summary.quotesApproved++;
    if (project.status === 'scheduled') summary.jobsScheduled++;
    if (project.status === 'completed') summary.jobsCompleted++;
    if (project.status === 'billed') summary.jobsBilled++;
    
    // Calculate revenue
    const revenueStage = STATUS_REVENUE_MAPPING[project.status];
    if (revenueStage && project.estimatedRevenue) {
      summary.totalRevenue[revenueStage] += parseFloat(project.estimatedRevenue) || 0;
    }
    
    // Track vendors
    if (project.vendors) {
      project.vendors.forEach(vendor => {
        const count = summary.vendors.get(vendor.name) || 0;
        summary.vendors.set(vendor.name, count + 1);
      });
    }
    
    // Track disposal sites
    if (project.disposalSites) {
      project.disposalSites.forEach(site => {
        const count = summary.disposalSites.get(site) || 0;
        summary.disposalSites.set(site, count + 1);
      });
    }
    
    summary.projects.push({
      trackingNumber: project.trackingNumber,
      name: project.name,
      client: project.client,
      status: project.status,
      revenue: project.estimatedRevenue,
      vendors: project.vendors?.map(v => v.name) || [],
      disposalSites: project.disposalSites || []
    });
  });
  
  return summary;
};

// Archive period data
export const archivePeriod = (projects, period, location = null) => {
  const summary = generatePeriodSummary(projects, period, location);
  const archiveData = {
    ...summary,
    archivedDate: new Date().toISOString(),
    id: `archive-${period}-${location || 'all'}-${Date.now()}`
  };
  
  // Store in localStorage (could be database in production)
  const archives = JSON.parse(localStorage.getItem('period_archives') || '[]');
  archives.push(archiveData);
  localStorage.setItem('period_archives', JSON.stringify(archives));
  
  return archiveData;
};

// Get archived periods
export const getArchivedPeriods = (location = null) => {
  const archives = JSON.parse(localStorage.getItem('period_archives') || '[]');
  return location 
    ? archives.filter(a => a.location === location || a.location === 'All Locations')
    : archives;
};

// Enhanced project creation with tracking number
export const createProjectWithTracking = (projectData, settings = {}) => {
  const {
    location = 'HOU',
    periodType = 'JULIAN',
    autoGenerateJobNumber = true
  } = settings;
  
  const trackingNumber = generateTrackingNumber(location, periodType);
  
  return {
    id: trackingNumber, // Use tracking number as ID
    trackingNumber,
    ...projectData,
    location,
    createdAt: new Date().toISOString(),
    statusHistory: [{
      status: projectData.status || 'backlog',
      changedAt: new Date().toISOString(),
      daysInPrevious: 0,
      note: 'Project created'
    }],
    currentStatusSince: new Date().toISOString(),
    notes: [],
    attachments: [],
    assignments: [],
    vendors: [],
    progressUpdates: [],
    estimatedRevenue: projectData.estimatedRevenue || 0,
    actualRevenue: 0,
    revenueStage: REVENUE_STAGES.PIPELINE,
    jobNumber: autoGenerateJobNumber ? trackingNumber : projectData.jobNumber || '',
    projectNumber: projectData.projectNumber || '' // User can set later
  };
};

export default {
  LOCATIONS,
  PERIOD_TYPES,
  REVENUE_STAGES,
  STATUS_REVENUE_MAPPING,
  generateTrackingNumber,
  calculateDaysInStatus,
  getCurrentPeriod,
  generatePeriodSummary,
  archivePeriod,
  getArchivedPeriods,
  createProjectWithTracking
};