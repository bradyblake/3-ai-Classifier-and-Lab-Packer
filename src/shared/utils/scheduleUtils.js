// Schedule Utilities for Calendar and Task Management
// Provides intelligent scheduling and time slot management

import moment from 'moment';

/**
 * Find the next available time slot for a task
 * @param {Array} existingEvents - Current calendar events
 * @param {number} durationMinutes - Required duration in minutes
 * @param {Date} preferredStart - Preferred start time (optional)
 * @returns {Object|null} - Available slot or null if none found
 */
export function findNextOpenSlot(existingEvents, durationMinutes, preferredStart = null) {
  const duration = moment.duration(durationMinutes, 'minutes');
  const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
  const searchStart = preferredStart ? moment(preferredStart) : moment();
  
  // Ensure we start during working hours
  if (searchStart.hour() < workingHours.start) {
    searchStart.hour(workingHours.start).minute(0).second(0);
  } else if (searchStart.hour() >= workingHours.end) {
    searchStart.add(1, 'day').hour(workingHours.start).minute(0).second(0);
  }
  
  // Search for up to 30 days
  const maxSearchDays = 30;
  let currentCheck = searchStart.clone();
  
  for (let day = 0; day < maxSearchDays; day++) {
    // Skip weekends
    if (currentCheck.day() === 0 || currentCheck.day() === 6) {
      currentCheck.add(1, 'day').hour(workingHours.start).minute(0).second(0);
      continue;
    }
    
    // Check every 30-minute slot during working hours
    const dayStart = currentCheck.clone().hour(workingHours.start).minute(0).second(0);
    const dayEnd = currentCheck.clone().hour(workingHours.end).minute(0).second(0);
    
    let slotStart = dayStart.clone();
    
    while (slotStart.add(duration).isBefore(dayEnd)) {
      const slotEnd = slotStart.clone().add(duration);
      
      // Check if this slot conflicts with existing events
      const hasConflict = existingEvents.some(event => {
        const eventStart = moment(event.start);
        const eventEnd = moment(event.end);
        
        return slotStart.isBefore(eventEnd) && slotEnd.isAfter(eventStart);
      });
      
      if (!hasConflict) {
        return {
          start: slotStart.toDate(),
          end: slotEnd.toDate(),
          duration: durationMinutes
        };
      }
      
      // Move to next 30-minute slot
      slotStart.add(30, 'minutes');
    }
    
    // Move to next day
    currentCheck.add(1, 'day').hour(workingHours.start).minute(0).second(0);
  }
  
  return null; // No slot found
}

/**
 * Insert a task into the calendar at a specific time slot
 * @param {Object} slot - Time slot with start/end times
 * @param {Object} taskData - Task information
 * @param {number} durationMinutes - Task duration
 * @returns {Object} - Calendar event object
 */
export function insertIntoCalendar(slot, taskData, durationMinutes) {
  const eventId = Date.now() + Math.random();
  
  return {
    id: eventId,
    title: taskData.title || taskData.name || 'New Task',
    start: slot.start,
    end: slot.end,
    category: taskData.category || determineCategory(taskData),
    priority: taskData.priority || determinePriority(taskData),
    description: taskData.description || '',
    source: 'auto-scheduled',
    duration: durationMinutes,
    resource: {
      color: getCategoryColor(taskData.category || determineCategory(taskData)),
      textColor: '#333'
    }
  };
}

/**
 * Determine task category based on task data
 * @param {Object} taskData - Task information
 * @returns {string} - Category name
 */
function determineCategory(taskData) {
  const title = (taskData.title || taskData.name || '').toLowerCase();
  const description = (taskData.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  
  if (combined.includes('meeting') || combined.includes('call') || combined.includes('discuss')) {
    return 'meeting';
  } else if (combined.includes('deadline') || combined.includes('due') || combined.includes('submit')) {
    return 'deadline';
  } else if (combined.includes('analysis') || combined.includes('review') || combined.includes('report')) {
    return 'analysis';
  } else if (combined.includes('maintenance') || combined.includes('update') || combined.includes('fix')) {
    return 'maintenance';
  } else if (combined.includes('project') || combined.includes('development') || combined.includes('build')) {
    return 'project';
  } else {
    return 'general';
  }
}

/**
 * Determine task priority based on task data
 * @param {Object} taskData - Task information
 * @returns {string} - Priority level
 */
function determinePriority(taskData) {
  const title = (taskData.title || taskData.name || '').toLowerCase();
  const description = (taskData.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  
  if (combined.includes('urgent') || combined.includes('critical') || combined.includes('asap')) {
    return 'high';
  } else if (combined.includes('important') || combined.includes('priority') || combined.includes('deadline')) {
    return 'high';
  } else if (combined.includes('routine') || combined.includes('maintenance') || combined.includes('optional')) {
    return 'low';
  } else {
    return 'medium';
  }
}

/**
 * Get color for task category
 * @param {string} category - Category name
 * @returns {string} - Color hex code
 */
function getCategoryColor(category) {
  const colors = {
    'general': '#3174ad',
    'meeting': '#28a745',
    'deadline': '#dc3545',
    'personal': '#6f42c1',
    'project': '#fd7e14',
    'maintenance': '#6c757d',
    'analysis': '#17a2b8'
  };
  return colors[category] || colors.general;
}

/**
 * Calculate optimal time distribution for multiple tasks
 * @param {Array} tasks - List of tasks to schedule
 * @param {Array} existingEvents - Current calendar events
 * @returns {Array} - Scheduled tasks with time slots
 */
export function optimizeSchedule(tasks, existingEvents) {
  const scheduledTasks = [];
  const sortedTasks = tasks
    .map(task => ({
      ...task,
      priority: determinePriority(task),
      estimatedDuration: task.estimatedDuration || estimateTaskDuration(task)
    }))
    .sort((a, b) => {
      // Sort by priority (high -> medium -> low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    });
  
  let currentEvents = [...existingEvents];
  
  for (const task of sortedTasks) {
    const slot = findNextOpenSlot(currentEvents, task.estimatedDuration);
    if (slot) {
      const scheduledTask = insertIntoCalendar(slot, task, task.estimatedDuration);
      scheduledTasks.push(scheduledTask);
      currentEvents.push(scheduledTask);
    }
  }
  
  return scheduledTasks;
}

/**
 * Estimate task duration based on task data
 * @param {Object} taskData - Task information
 * @returns {number} - Estimated duration in minutes
 */
function estimateTaskDuration(taskData) {
  const title = (taskData.title || taskData.name || '').toLowerCase();
  const description = (taskData.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  
  // Analysis tasks tend to be longer
  if (combined.includes('analysis') || combined.includes('report') || combined.includes('review')) {
    return 120; // 2 hours
  }
  // Meetings are typically 1 hour
  else if (combined.includes('meeting') || combined.includes('call') || combined.includes('discuss')) {
    return 60; // 1 hour
  }
  // Quick tasks
  else if (combined.includes('quick') || combined.includes('brief') || combined.includes('check')) {
    return 30; // 30 minutes
  }
  // Development tasks
  else if (combined.includes('develop') || combined.includes('build') || combined.includes('implement')) {
    return 180; // 3 hours
  }
  // Default
  else {
    return 60; // 1 hour
  }
}

/**
 * Get schedule statistics
 * @param {Array} events - Calendar events
 * @returns {Object} - Schedule statistics
 */
export function getScheduleStats(events) {
  const now = moment();
  const thisWeek = events.filter(event => moment(event.start).isSame(now, 'week'));
  const today = events.filter(event => moment(event.start).isSame(now, 'day'));
  const overdue = events.filter(event => moment(event.end).isBefore(now));
  
  return {
    total: events.length,
    thisWeek: thisWeek.length,
    today: today.length,
    overdue: overdue.length,
    upcoming: events.filter(event => moment(event.start).isAfter(now)).length,
    categories: getCategoryBreakdown(events),
    priorities: getPriorityBreakdown(events)
  };
}

/**
 * Get category breakdown of events
 * @param {Array} events - Calendar events
 * @returns {Object} - Category counts
 */
function getCategoryBreakdown(events) {
  return events.reduce((acc, event) => {
    const category = event.category || 'general';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Get priority breakdown of events
 * @param {Array} events - Calendar events
 * @returns {Object} - Priority counts
 */
function getPriorityBreakdown(events) {
  return events.reduce((acc, event) => {
    const priority = event.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Check for schedule conflicts
 * @param {Array} events - Calendar events
 * @returns {Array} - List of conflicts
 */
export function detectConflicts(events) {
  const conflicts = [];
  
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];
      
      const start1 = moment(event1.start);
      const end1 = moment(event1.end);
      const start2 = moment(event2.start);
      const end2 = moment(event2.end);
      
      if (start1.isBefore(end2) && start2.isBefore(end1)) {
        conflicts.push({
          event1: event1,
          event2: event2,
          overlap: {
            start: moment.max(start1, start2).toDate(),
            end: moment.min(end1, end2).toDate()
          }
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Suggest reschedule options for conflicts
 * @param {Array} conflicts - Schedule conflicts
 * @param {Array} allEvents - All calendar events
 * @returns {Array} - Reschedule suggestions
 */
export function suggestReschedule(conflicts, allEvents) {
  return conflicts.map(conflict => {
    const suggestions = [];
    
    // Try to reschedule the lower priority event
    const event1Priority = conflict.event1.priority || 'medium';
    const event2Priority = conflict.event2.priority || 'medium';
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    const eventToReschedule = priorityOrder[event1Priority] < priorityOrder[event2Priority] 
      ? conflict.event1 : conflict.event2;
    
    const duration = moment(eventToReschedule.end).diff(moment(eventToReschedule.start), 'minutes');
    const newSlot = findNextOpenSlot(allEvents, duration);
    
    if (newSlot) {
      suggestions.push({
        event: eventToReschedule,
        newSlot: newSlot,
        reason: 'Priority-based reschedule'
      });
    }
    
    return {
      conflict: conflict,
      suggestions: suggestions
    };
  });
}

export default {
  findNextOpenSlot,
  insertIntoCalendar,
  optimizeSchedule,
  getScheduleStats,
  detectConflicts,
  suggestReschedule
};