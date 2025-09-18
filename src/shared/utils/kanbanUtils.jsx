// File: src/utils/kanbanUtils.jsx

// Lane, Status, and Card LocalStorage Persistence
export function getLanes() {
  try {
    const data = JSON.parse(localStorage.getItem("platformSetup"));
    return data?.lanes || [];
  } catch (error) {
    // console.error('Error parsing platformSetup from localStorage:', error);
    return [];
  }
}

export function getStatuses() {
  try {
    const data = JSON.parse(localStorage.getItem("platformSetup"));
    return data?.statuses || [];
  } catch (error) {
    // console.error('Error parsing platformSetup from localStorage:', error);
    return [];
  }
}

export function getCards() {
  try {
    return JSON.parse(localStorage.getItem("kanbanCards")) || [];
  } catch (error) {
    // console.error('Error parsing kanbanCards from localStorage:', error);
    return [];
  }
}

export function saveCards(cards) {
  localStorage.setItem("kanbanCards", JSON.stringify(cards)); // ✅ Corrected key casing
}

export function saveLanes(lanes) {
  try {
    const platformData = JSON.parse(localStorage.getItem("platformSetup") || "{}");
    platformData.lanes = lanes;
    localStorage.setItem("platformSetup", JSON.stringify(platformData));
  } catch (error) {
    console.error('Error saving lanes to localStorage:', error);
  }
}

export function saveStatuses(statuses) {
  try {
    const platformData = JSON.parse(localStorage.getItem("platformSetup") || "{}");
    platformData.statuses = statuses;
    localStorage.setItem("platformSetup", JSON.stringify(platformData));
  } catch (error) {
    console.error('Error saving statuses to localStorage:', error);
  }
}

// Returns the revenue category for a given status name (basic version - more advanced version below)

// Status Color Mapping
export function generateStatusColorMap(statuses) {
  const map = {};
  statuses.forEach((status) => {
    map[status.name] = status.color || "#aaa";
  });
  return map;
}

// Revenue Summary Calculator
export function calculateRevenueSummary(cards, statuses) {
  const statusRevenueMap = {};
  statuses.forEach((status) => {
    statusRevenueMap[status.name] = status.revenue || "Pipeline";
  });

  let pipeline = 0;
  let projected = 0;
  let actual = 0;

  cards.forEach((card) => {
    const revenue = parseFloat(card.revenue || 0);
    const category = statusRevenueMap[card.status];
    if (category === "Pipeline") pipeline += revenue;
    if (category === "Projected") projected += revenue;
    if (category === "Actual") actual += revenue;
  });

  return { pipeline, projected, actual };
}

// Flag Cards Missing Revenue
export function flagCardsMissingRevenue(cards, statuses) {
  const quoteSentStatuses = statuses
    .filter((s) => s.name.toLowerCase().includes("quote"))
    .map((s) => s.name);

  return cards.map((card) => {
    const isQuoteSent = quoteSentStatuses.includes(card.status);
    const missingRevenue = isQuoteSent && (!card.revenue || parseFloat(card.revenue) === 0);
    return { ...card, missingRevenue };
  });
}

// Optional: Darken color for status progression (future-safe)
export function darkenColor(hex, amount = 20) {
  let usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }

  const num = parseInt(hex, 16);
  let r = (num >> 16) - amount;
  let g = ((num >> 8) & 0x00ff) - amount;
  let b = (num & 0x0000ff) - amount;

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  return (
    (usePound ? "#" : "") +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

// ✅ Attach file to Kanban card
export function attachFileToCard(cardId, fileBlob, filename) {
  if (!cardId || !fileBlob) return;

  const reader = new FileReader();
  reader.onloadend = () => {
    const base64data = reader.result;
    const attachments = JSON.parse(localStorage.getItem("cardAttachments") || "{}");

    if (!attachments[cardId]) attachments[cardId] = [];
    attachments[cardId].push({ name: filename, data: base64data });

    localStorage.setItem("cardAttachments", JSON.stringify(attachments));
  };
  reader.readAsDataURL(fileBlob);
}

export const fetchCardById = async (cardId) => {
  const stored = localStorage.getItem('kanbanCards');
  if (!stored) return null;
  try {
    const cards = JSON.parse(stored) || [];
    return cards.find(card => card.id === cardId);
  } catch (error) {
    // console.error('Error parsing kanbanCards in fetchCardById:', error);
    return null;
  }
};

export const downloadAttachment = (file) => {
  const link = document.createElement('a');
  link.href = file.url || URL.createObjectURL(new Blob([file.blob], { type: file.type || 'application/pdf' }));
  link.download = file.name;
  link.click();
};

// Personnel/Assignment Management
export function getPersonnelAssignments() {
  try {
    return JSON.parse(localStorage.getItem("personnelAssignments")) || [];
  } catch (error) {
    // console.error('Error parsing personnelAssignments from localStorage:', error);
    return [];
  }
}

export function getJobRoles() {
  try {
    return JSON.parse(localStorage.getItem("jobRoles")) || [];
  } catch (error) {
    // console.error('Error parsing jobRoles from localStorage:', error);
    return [];
  }
}

export function getPersonnelByLocation(location) {
  const personnel = getPersonnelAssignments();
  return personnel.filter(person => person.location === location);
}

export function getPersonnelByRole(role) {
  const personnel = getPersonnelAssignments();
  return personnel.filter(person => person.role === role);
}

export function getAllPersonnelOptions() {
  const personnel = getPersonnelAssignments();
  return personnel.map(person => ({
    id: `${person.name}_${person.location}`,
    name: person.name,
    role: person.role,
    location: person.location,
    displayName: `${person.name} (${person.role})`
  }));
}

// Lead Source Management
export function getLeadSources() {
  try {
    return JSON.parse(localStorage.getItem("leadSources")) || [
      "Website Inquiry",
      "Referral",
      "Cold Call",
      "Trade Show",
      "Social Media",
      "Direct Mail",
      "Sales Rep",
      "Existing Customer",
      "Partner Referral"
    ];
  } catch (error) {
    // console.error('Error parsing leadSources from localStorage:', error);
    return [
      "Website Inquiry",
      "Referral", 
      "Cold Call",
      "Trade Show",
      "Social Media",
      "Direct Mail",
      "Sales Rep",
      "Existing Customer",
      "Partner Referral"
    ];
  }
}

export function saveLeadSources(sources) {
  try {
    localStorage.setItem("leadSources", JSON.stringify(sources));
  } catch (error) {
    // console.error('Error saving lead sources:', error);
  }
}

export function getLeadSourcesByType() {
  const sources = getLeadSources();
  const personnel = getAllPersonnelOptions();
  
  return {
    general: sources.filter(source => source !== "Sales Rep"),
    salesReps: personnel.map(person => ({
      value: `Sales Rep: ${person.name}`,
      display: `Sales Rep: ${person.name} (${person.role})`,
      person: person
    }))
  };
}

// Revenue Category Management
export function getStatusRevenueCategory(statusName, card = null) {
  const normalizedStatus = statusName.toLowerCase();
  
  // Override: Completed jobs are always Projected, regardless of scheduling
  if (normalizedStatus.includes('complete') || normalizedStatus === 'completed' || normalizedStatus === 'job complete') {
    return 'Projected';
  }
  
  // Special handling for scheduled jobs - check if completion falls within sales period
  if ((normalizedStatus.includes('scheduled') || normalizedStatus === 'job scheduled') && card) {
    return getScheduledJobRevenueCategory(card);
  }
  
  // Default revenue categories for common status names
  const categoryMap = {
    // Pipeline statuses (potential revenue)
    'quote submitted': 'Pipeline',
    'quote sent': 'Pipeline',
    'quote pending': 'Pipeline',
    'awaiting approval': 'Pipeline',
    'under review': 'Pipeline',
    
    // Projected statuses (likely revenue)
    'quote approved': 'Projected',
    'job scheduled': 'Projected', // Will be overridden by scheduling logic above
    'job in progress': 'Projected',
    'work in progress': 'Projected',
    'job complete': 'Projected', // Will be overridden by completion logic above
    'completed': 'Projected',    // Will be overridden by completion logic above
    
    // Actual revenue (confirmed revenue)
    'invoiced': 'Actual',
    'billed': 'Actual',
    'paid': 'Actual',
    'closed': 'Actual'
  };
  
  // Check exact match first
  if (categoryMap[normalizedStatus]) {
    return categoryMap[normalizedStatus];
  }
  
  // Check for partial matches
  if (normalizedStatus.includes('quote') || normalizedStatus.includes('pending')) {
    return 'Pipeline';
  }
  if (normalizedStatus.includes('approved') || normalizedStatus.includes('scheduled') || normalizedStatus.includes('progress')) {
    return 'Projected';
  }
  if (normalizedStatus.includes('paid') || normalizedStatus.includes('billed') || normalizedStatus.includes('invoice')) {
    return 'Actual';
  }
  
  // Default fallback
  return 'Pipeline';
}

// Determine revenue category for scheduled jobs based on completion date within sales period
export function getScheduledJobRevenueCategory(card) {
  // If no completion date is specified, default to Pipeline
  if (!card.estimatedCompletionDate) {
    return 'Pipeline';
  }
  
  try {
    const completionDate = new Date(card.estimatedCompletionDate);
    const salesPeriodEnd = getSalesPeriodEnd();
    
    // If completion date is within current sales period, count as Projected
    if (completionDate <= salesPeriodEnd) {
      return 'Projected';
    } else {
      // Completion outside sales period = Pipeline
      return 'Pipeline';
    }
  } catch (error) {
    console.warn('Error parsing completion date:', card.estimatedCompletionDate);
    return 'Pipeline';
  }
}

// Get the end date of the current sales period
export function getSalesPeriodEnd() {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Sales year runs from last Sunday of previous December to last Saturday of current December
  // Find the last Saturday of December in current year
  let salesYearEnd = new Date(currentYear, 11, 31); // Dec 31
  
  // Move backwards to find the last Saturday
  while (salesYearEnd.getDay() !== 6) { // 6 = Saturday
    salesYearEnd.setDate(salesYearEnd.getDate() - 1);
  }
  
  return salesYearEnd;
}