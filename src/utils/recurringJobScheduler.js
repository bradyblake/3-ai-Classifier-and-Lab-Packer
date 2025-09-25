// Recurring Job Scheduler - Automatically creates recurring jobs

export const processRecurringJobs = (cards, lanes) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of day for comparison

  const newJobs = [];
  const updatedCards = [...cards];

  // Find all recurring jobs
  const recurringJobs = cards.filter(card =>
    card.isRecurring &&
    card.autoCreateRecurring &&
    card.nextDueDate
  );

  recurringJobs.forEach(parentJob => {
    const nextDue = new Date(parentJob.nextDueDate);
    nextDue.setHours(0, 0, 0, 0);

    // Check if it's time to create a new occurrence
    if (nextDue <= today) {
      const newJob = createRecurringJobInstance(parentJob, lanes);
      newJobs.push(newJob);

      // Update the parent job's next due date
      const updatedParent = {
        ...parentJob,
        nextDueDate: calculateNextDueDate(parentJob),
        lastRecurrenceCreated: new Date().toISOString()
      };

      const parentIndex = updatedCards.findIndex(card => card.id === parentJob.id);
      if (parentIndex !== -1) {
        updatedCards[parentIndex] = updatedParent;
      }
    }
  });

  return {
    newJobs,
    updatedCards
  };
};

const createRecurringJobInstance = (parentJob, lanes) => {
  const now = new Date();
  const scheduledDate = new Date(parentJob.nextDueDate);

  // Find the "Scheduled" status or use the first status if not found
  const scheduledStatus = 'Scheduled'; // This should match your status configuration

  const newJob = {
    id: Date.now() + Math.random(), // Ensure unique ID
    title: `${parentJob.title} (${scheduledDate.toLocaleDateString()})`,
    customerName: parentJob.customerName,
    customerLocation: parentJob.customerLocation,
    location: parentJob.location,
    status: scheduledStatus,
    priority: parentJob.priority || 'Medium',
    revenue: parentJob.revenue,
    description: `${parentJob.description}\n\nRecurring job scheduled for ${scheduledDate.toLocaleDateString()}`,
    tags: [
      ...(parentJob.tags || []),
      'recurring',
      'auto-created'
    ],
    created: now.toISOString(),
    updated: now.toISOString(),
    scheduledDate: parentJob.nextDueDate,
    parentRecurringJob: parentJob.id,
    isRecurringInstance: true,
    recurringNotes: parentJob.recurringNotes,
    attachments: [], // Don't copy attachments to save space
    comments: [{
      id: Date.now(),
      text: `🔄 Automatically created recurring job instance\n\nParent job: ${parentJob.title}\nScheduled for: ${scheduledDate.toLocaleDateString()}\n\n${parentJob.recurringNotes || 'No special instructions.'}`,
      timestamp: now.toISOString(),
      author: 'System',
      type: 'recurring-creation'
    }]
  };

  return newJob;
};

export const calculateNextDueDate = (recurringJob) => {
  const current = new Date(recurringJob.nextDueDate);
  const interval = recurringJob.recurringInterval || 1;

  switch (recurringJob.recurringFrequency) {
    case 'daily':
      current.setDate(current.getDate() + interval);
      break;
    case 'weekly':
      current.setDate(current.getDate() + (interval * 7));
      break;
    case 'monthly':
      current.setMonth(current.getMonth() + interval);
      break;
    case 'quarterly':
      current.setMonth(current.getMonth() + (interval * 3));
      break;
    case 'annually':
      current.setFullYear(current.getFullYear() + interval);
      break;
    default:
      // For custom patterns, advance by the interval in days
      current.setDate(current.getDate() + interval);
      break;
  }

  // Check if we've passed the end date
  if (recurringJob.recurringEndDate) {
    const endDate = new Date(recurringJob.recurringEndDate);
    if (current > endDate) {
      return null; // No more recurrences
    }
  }

  return current.toISOString().split('T')[0];
};

export const checkAndCreateRecurringJobs = (cards, lanes, saveCards) => {
  const result = processRecurringJobs(cards, lanes);

  if (result.newJobs.length > 0) {
    const allCards = [...result.updatedCards, ...result.newJobs];
    saveCards(allCards);

    // Show notification
    const message = `🔄 Created ${result.newJobs.length} recurring job${result.newJobs.length > 1 ? 's' : ''}:\n\n${
      result.newJobs.map(job => `• ${job.title}`).join('\n')
    }`;

    // Use a timeout to avoid blocking
    setTimeout(() => {
      alert(message);
    }, 100);

    return allCards;
  }

  return cards;
};

export const getRecurringJobSummary = (cards) => {
  const recurringJobs = cards.filter(card => card.isRecurring);
  const activeRecurring = recurringJobs.filter(card =>
    card.autoCreateRecurring &&
    card.nextDueDate &&
    (!card.recurringEndDate || new Date(card.recurringEndDate) > new Date())
  );

  const upcomingJobs = activeRecurring
    .map(job => ({
      ...job,
      nextDue: new Date(job.nextDueDate)
    }))
    .filter(job => job.nextDue > new Date())
    .sort((a, b) => a.nextDue - b.nextDue)
    .slice(0, 10); // Next 10 recurring jobs

  return {
    totalRecurring: recurringJobs.length,
    activeRecurring: activeRecurring.length,
    upcomingJobs,
    inactiveRecurring: recurringJobs.length - activeRecurring.length
  };
};

export const updateRecurringJob = (cards, jobId, recurringData, saveCards) => {
  const updatedCards = cards.map(card => {
    if (card.id === jobId) {
      return {
        ...card,
        isRecurring: recurringData.isRecurring,
        recurringFrequency: recurringData.frequency,
        recurringInterval: recurringData.interval,
        recurringStartDate: recurringData.startDate,
        recurringEndDate: recurringData.endDate,
        nextDueDate: recurringData.nextDueDate,
        autoCreateRecurring: recurringData.autoCreate,
        recurringNotes: recurringData.notes,
        customPattern: recurringData.customPattern,
        updated: new Date().toISOString()
      };
    }
    return card;
  });

  saveCards(updatedCards);
  return updatedCards;
};

export default {
  processRecurringJobs,
  calculateNextDueDate,
  checkAndCreateRecurringJobs,
  getRecurringJobSummary,
  updateRecurringJob
};