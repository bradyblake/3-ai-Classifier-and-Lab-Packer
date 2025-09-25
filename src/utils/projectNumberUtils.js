// Project Number Generation Utilities
// Generates unique project numbers based on location and year

/**
 * Generate a unique project number for a new card
 * Format: [LOCATION_CODE]-[YEAR]-[SEQUENCE]
 * Example: HOU-2025-001, NYC-2025-042
 */
export function generateProjectNumber(location, lanes = [], cards = []) {
  if (!location) {
    console.warn('No location provided for project number generation');
    return `PROJ-${new Date().getFullYear()}-${String(cards.length + 1).padStart(3, '0')}`;
  }

  // Get location code (first 3 characters, uppercase)
  let locationCode = location.substring(0, 3).toUpperCase();

  // Handle common location mappings
  const locationMappings = {
    'CORPORATE': 'CORP',
    'FIELD OPERATIONS': 'FIELD',
    'FIELD OPS': 'FIELD',
    'WAREHOUSE': 'WH',
    'REMOTE': 'REM',
    'HEADQUARTERS': 'HQ',
    'OFFICE': 'OFF'
  };

  const upperLocation = location.toUpperCase();
  if (locationMappings[upperLocation]) {
    locationCode = locationMappings[upperLocation];
  }

  // Get current year
  const currentYear = new Date().getFullYear();

  // Find existing cards for this location and year to determine next sequence
  const locationCards = cards.filter(card => {
    if (!card.jobNumber) return false;

    // Parse existing job numbers to find matching location and year
    const parts = card.jobNumber.split('-');
    if (parts.length >= 3) {
      const cardLocationCode = parts[0];
      const cardYear = parseInt(parts[1]);
      return cardLocationCode === locationCode && cardYear === currentYear;
    }
    return false;
  });

  // Get the next sequence number
  let maxSequence = 0;
  locationCards.forEach(card => {
    const parts = card.jobNumber.split('-');
    if (parts.length >= 3) {
      const sequence = parseInt(parts[2]);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });

  const nextSequence = maxSequence + 1;
  const sequenceStr = String(nextSequence).padStart(3, '0');

  const projectNumber = `${locationCode}-${currentYear}-${sequenceStr}`;

  console.log(`📋 Generated project number: ${projectNumber} for location: ${location}`);
  return projectNumber;
}

/**
 * Update card lane history when a card is moved between lanes and statuses
 */
export function updateCardLaneHistory(card, newLane, newStatus) {
  if (!card.laneHistory) {
    card.laneHistory = [];
  }

  // Add history entry if moving to a different lane or status
  const isLocationChange = !card.location || card.location !== newLane;
  const isStatusChange = !card.status || card.status !== newStatus;

  if (isLocationChange || isStatusChange) {
    card.laneHistory.push({
      from: card.location || 'New',
      to: newLane,
      fromStatus: card.status || 'New',
      toStatus: newStatus,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString()
    });
  }

  // Actually update the card's location and status
  card.location = newLane;
  card.status = newStatus;

  console.log('🔄 Updated card in updateCardLaneHistory:', {
    id: card.id,
    title: card.title,
    newLocation: card.location,
    newStatus: card.status,
    historyEntry: card.laneHistory[card.laneHistory.length - 1]
  });

  return card;
}

/**
 * Parse project number components
 */
export function parseProjectNumber(projectNumber) {
  if (!projectNumber || typeof projectNumber !== 'string') {
    return null;
  }

  const parts = projectNumber.split('-');
  if (parts.length >= 3) {
    return {
      locationCode: parts[0],
      year: parseInt(parts[1]),
      sequence: parseInt(parts[2]),
      full: projectNumber
    };
  }

  return null;
}

/**
 * Validate project number format
 */
export function isValidProjectNumber(projectNumber) {
  const parsed = parseProjectNumber(projectNumber);
  return parsed !== null &&
         parsed.locationCode.length >= 2 &&
         parsed.year > 2020 &&
         parsed.sequence > 0;
}

/**
 * Get project statistics for a location
 */
export function getLocationProjectStats(location, cards = []) {
  const locationCards = cards.filter(card =>
    card.location === location ||
    (card.jobNumber && card.jobNumber.startsWith(location.substring(0, 3).toUpperCase()))
  );

  const currentYear = new Date().getFullYear();
  const thisYearCards = locationCards.filter(card => {
    const parsed = parseProjectNumber(card.jobNumber);
    return parsed && parsed.year === currentYear;
  });

  return {
    total: locationCards.length,
    thisYear: thisYearCards.length,
    nextSequence: thisYearCards.length + 1
  };
}