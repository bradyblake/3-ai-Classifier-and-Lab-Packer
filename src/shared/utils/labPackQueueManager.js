// Lab Pack Queue Manager - Supports separate queues for solids and liquids

const STORAGE_KEYS = {
  solids: 'labPackQueue_solids',
  liquids: 'labPackQueue_liquids',
  legacy: 'labPackQueue' // For backward compatibility
};

/**
 * Get current queue from localStorage or memory.
 * @param {string} queueType - 'solids', 'liquids', or 'all'
 */
export function getLabPackQueue(queueType = 'all') {
  if (typeof localStorage === 'undefined') return [];
  
  try {
    if (queueType === 'all') {
      const solids = JSON.parse(localStorage.getItem(STORAGE_KEYS.solids)) || [];
      const liquids = JSON.parse(localStorage.getItem(STORAGE_KEYS.liquids)) || [];
      const legacy = JSON.parse(localStorage.getItem(STORAGE_KEYS.legacy)) || [];
      
      // Migrate legacy queue if it exists
      if (legacy.length > 0 && solids.length === 0 && liquids.length === 0) {
        migrateLegacyQueue(legacy);
        return getLabPackQueue('all');
      }
      
      return {
        solids: solids,
        liquids: liquids,
        all: [...solids, ...liquids]
      };
    }
    
    return JSON.parse(localStorage.getItem(STORAGE_KEYS[queueType])) || [];
  } catch {
    return queueType === 'all' ? { solids: [], liquids: [], all: [] } : [];
  }
}

/**
 * Save the updated queue to localStorage.
 * Limits queue size to prevent quota exceeded errors.
 * @param {Array} queue - The queue array
 * @param {string} queueType - 'solids' or 'liquids'
 */
function saveQueue(queue, queueType) {
  if (typeof localStorage === 'undefined') return;
  
  // Limit queue to last 50 items to prevent localStorage quota issues
  const MAX_QUEUE_SIZE = 50;
  const limitedQueue = queue.slice(-MAX_QUEUE_SIZE);
  
  try {
    localStorage.setItem(STORAGE_KEYS[queueType], JSON.stringify(limitedQueue));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // If still exceeding quota, clear old data and try again
      console.warn('localStorage quota exceeded, clearing old lab pack data...');
      clearOldLabPackData();
      try {
        localStorage.setItem(STORAGE_KEYS[queueType], JSON.stringify(limitedQueue.slice(-25)));
      } catch (e2) {
        console.error('Failed to save even after clearing:', e2);
      }
    }
  }
}

/**
 * Migrate legacy queue to separate solid/liquid queues
 * @param {Array} legacyQueue 
 */
function migrateLegacyQueue(legacyQueue) {
  const solids = [];
  const liquids = [];
  
  legacyQueue.forEach(item => {
    const physicalState = item.physicalProperties?.state || item.physicalState || 'unknown';
    if (physicalState === 'solid') {
      solids.push(item);
    } else {
      liquids.push(item);
    }
  });
  
  saveQueue(solids, 'solids');
  saveQueue(liquids, 'liquids');
  
  // Clear legacy queue
  localStorage.removeItem(STORAGE_KEYS.legacy);
}

/**
 * Add a classification result to the appropriate queue.
 * @param {object} classificationResult 
 */
export function addToLabPackQueue(classificationResult) {
  // console.log('🔵 addToLabPackQueue called with:', classificationResult);
  
  const physicalState = classificationResult.physicalProperties?.state || 
                       classificationResult.physicalState || 'liquid';
  
  // console.log('🔵 Detected physical state:', physicalState);
  
  const queueType = physicalState === 'solid' ? 'solids' : 'liquids';
  // console.log('🔵 Queue type determined:', queueType);
  
  const queue = getLabPackQueue(queueType);
  // console.log('🔵 Current queue before addition:', queue);
  
  queue.push(classificationResult);
  saveQueue(queue, queueType);
  
  // console.log(`🔵 Added to ${queueType} lab pack queue:`, classificationResult.productName);
  
  // Verify it was saved
  const verifyQueue = getLabPackQueue(queueType);
  // console.log('🔵 Queue after save:', verifyQueue);
}

/**
 * Get the number of items in the queue.
 * @param {string} queueType - 'solids', 'liquids', or 'all'
 */
export function getLabPackQueueCount(queueType = 'all') {
  if (queueType === 'all') {
    const queues = getLabPackQueue('all');
    return {
      solids: queues.solids.length,
      liquids: queues.liquids.length,
      total: queues.all.length
    };
  }
  return getLabPackQueue(queueType).length;
}

/**
 * Clear the lab pack queue (for planner reset).
 * @param {string} queueType - 'solids', 'liquids', or 'all'
 */
export function clearLabPackQueue(queueType = 'all') {
  if (queueType === 'all') {
    // Clear new queue system
    saveQueue([], 'solids');
    saveQueue([], 'liquids');
    
    // Clear ALL lab pack related localStorage keys
    try {
      localStorage.removeItem(STORAGE_KEYS.legacy);     // 'labPackQueue'  
      localStorage.removeItem('labpack_import_data');   // Import data from SDS analyzer
      localStorage.removeItem('batchResults');          // Batch analysis results
      localStorage.removeItem('labPackOptimization');   // Optimization results
      localStorage.removeItem('labPackResults');        // General results
      localStorage.removeItem('sdsAnalysisResults');    // SDS analysis results that feed lab pack
      localStorage.removeItem('lab_pack_queue');        // Alternative naming
      localStorage.removeItem('labPackData');           // General lab pack data
      
      console.log('🗑️ COMPREHENSIVE LAB PACK CLEAR: All storage cleared');
    } catch (error) {
      console.error('Error clearing lab pack storage:', error);
    }
  } else {
    saveQueue([], queueType);
  }
}

/**
 * Clear old lab pack data and other large localStorage items
 */
function clearOldLabPackData() {
  if (typeof localStorage === 'undefined') return;
  
  try {
    // Clear any oversized items
    const keysToCheck = Object.keys(localStorage);
    keysToCheck.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        // Remove items larger than 100KB
        if (item && item.length > 100000) {
          console.log(`Clearing large localStorage item: ${key} (${(item.length / 1024).toFixed(1)}KB)`);
          localStorage.removeItem(key);
        }
      } catch (e) {
        console.error(`Error checking ${key}:`, e);
      }
    });
    
    // Also clear old classification results if they exist
    localStorage.removeItem('recentClassifications');
    localStorage.removeItem('batchResults');
  } catch (e) {
    console.error('Error clearing old data:', e);
  }
}

/**
 * Clean up localStorage to prevent quota issues
 */
export function cleanupLabPackStorage() {
  clearOldLabPackData();
  
  // Also limit existing queues
  const solids = getLabPackQueue('solids');
  const liquids = getLabPackQueue('liquids');
  
  if (solids.length > 50) {
    saveQueue(solids.slice(-50), 'solids');
  }
  if (liquids.length > 50) {
    saveQueue(liquids.slice(-50), 'liquids');
  }
}
