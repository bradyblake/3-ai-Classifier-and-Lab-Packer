// UnifiedCalendar.jsx - Consolidated calendar component with full functionality
// Combines CalendarPanel.jsx and CalendarDropHandler.jsx into one enhanced component

import React, { useState, useContext, useEffect, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../styles/CalendarPanel.css";
import { ThemeContext } from "../context/ThemeContext";
import { ModalContext } from "../context/ModalContext";
import { findNextOpenSlot, insertIntoCalendar } from '../shared/utils/scheduleUtils';
import { injectConfig } from "../ai/securityUtils.js";
import BackButton from "./BackButton";
import { Calendar as CalendarIcon, Plus, Settings, Filter, Download, Upload } from 'lucide-react';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const UnifiedCalendar = ({ isSidebar = false, calendarEvents, setCalendarEvents }) => {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("week");
  const [showFilters, setShowFilters] = useState(false);
  const [droppedItem, setDroppedItem] = useState(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState(new Set(['all']));
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const { themeColors } = useContext(ThemeContext);
  const { openModal } = useContext(ModalContext);

  // Load events from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("calendarEvents");
    if (stored) {
      const parsedEvents = JSON.parse(stored);
      setEvents(parsedEvents);
      if (setCalendarEvents) setCalendarEvents(parsedEvents);
    }
  }, [setCalendarEvents]);

  // Save events to localStorage when they change
  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
    if (setCalendarEvents) setCalendarEvents(events);
  }, [events, setCalendarEvents]);

  // Handle external calendarEvents prop changes
  useEffect(() => {
    if (calendarEvents && calendarEvents.length !== events.length) {
      setEvents(calendarEvents);
    }
  }, [calendarEvents, events.length]);

  // Enhanced event creation with categories
  const createEvent = useCallback((title, start, end = null, category = 'general', priority = 'medium') => {
    const id = Date.now() + Math.random();
    const newEvent = {
      id,
      title,
      start: new Date(start),
      end: end ? new Date(end) : new Date(new Date(start).getTime() + 60 * 60 * 1000), // Default 1 hour
      category,
      priority,
      resource: {
        color: getCategoryColor(category),
        textColor: priority === 'high' ? '#fff' : '#333'
      }
    };
    
    setEvents(prev => [...prev, newEvent]);
    
    // Sync with Kanban and other systems
    window.dispatchEvent(new CustomEvent('kanban-sync', { detail: newEvent }));
    window.dispatchEvent(new CustomEvent('note-sync', { 
      detail: { content: `Calendar event: ${title}`, taskTitle: title }
    }));
    
    return newEvent;
  }, []);

  // Get color for event categories
  const getCategoryColor = (category) => {
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
  };

  // Enhanced drag and drop handlers
  const onEventResize = useCallback((data) => {
    const { start, end } = data;
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === data.event.id ? { ...evt, start, end } : evt
      )
    );
  }, []);

  const onEventDrop = useCallback(({ event, start, end }) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === event.id ? { ...evt, start, end } : evt
      )
    );
  }, []);

  // Enhanced slot selection with modal
  const onSelectSlot = useCallback(({ start, end }) => {
    openModal({
      title: "Create New Event",
      children: (
        <EventCreationModal
          start={start}
          end={end}
          onSave={(eventData) => {
            createEvent(eventData.title, eventData.start, eventData.end, eventData.category, eventData.priority);
            openModal(null);
          }}
          onCancel={() => openModal(null)}
        />
      )
    });
  }, [openModal, createEvent]);

  // Handle external drops (from Kanban, etc.)
  const handleExternalDrop = useCallback((e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      setDroppedItem(data);
    } catch (error) {
      console.warn('Invalid drop data:', error);
    }
  }, []);

  // Confirm external drop with time estimation
  const handleConfirmDrop = useCallback((minutes) => {
    if (!droppedItem) return;
    
    const slot = findNextOpenSlot(events, minutes);
    if (!slot) {
      alert('No available time slot found. Please try a different duration.');
      return;
    }
    
    const newEvent = insertIntoCalendar(slot, droppedItem, minutes);
    createEvent(newEvent.title, newEvent.start, newEvent.end, 'project', droppedItem.priority || 'medium');
    
    setDroppedItem(null);
  }, [droppedItem, events, createEvent]);

  // Filter events based on selected criteria
  const filteredEvents = events.filter(event => {
    if (selectedEventTypes.has('all')) return true;
    if (selectedEventTypes.has(event.category)) return true;
    if (dateRange.start && event.start < dateRange.start) return false;
    if (dateRange.end && event.start > dateRange.end) return false;
    return false;
  });

  // Export calendar data
  const exportCalendar = useCallback(() => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `calendar-export-${moment().format('YYYY-MM-DD')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [events]);

  // Event style function
  const eventStyleGetter = useCallback((event) => {
    const backgroundColor = event.resource?.color || getCategoryColor(event.category);
    const color = event.resource?.textColor || '#333';
    
    return {
      style: {
        backgroundColor,
        color,
        border: event.priority === 'high' ? '2px solid #fff' : 'none',
        borderRadius: '5px',
        opacity: 0.8,
        fontSize: '12px',
        fontWeight: event.priority === 'high' ? 'bold' : 'normal'
      }
    };
  }, []);

  return (
    <div className={`unified-calendar ${isSidebar ? 'sidebar-mode' : 'full-mode'}`}>
      {!isSidebar && <BackButton />}
      
      {/* Enhanced Header */}
      <div className="calendar-header flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold">Unified Calendar</h2>
          <span className="text-sm text-gray-500">({events.length} events)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Filter Events"
          >
            <Filter className="w-5 h-5" />
          </button>
          
          <button
            onClick={exportCalendar}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            title="Export Calendar"
          >
            <Download className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => onSelectSlot({ start: new Date(), end: new Date(Date.now() + 60*60*1000) })}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700">Categories:</span>
            {['all', 'general', 'meeting', 'deadline', 'personal', 'project', 'maintenance', 'analysis'].map(category => (
              <label key={category} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedEventTypes.has(category)}
                  onChange={(e) => {
                    const newTypes = new Set(selectedEventTypes);
                    if (e.target.checked) {
                      newTypes.add(category);
                      if (category === 'all') {
                        setSelectedEventTypes(new Set(['all']));
                      }
                    } else {
                      newTypes.delete(category);
                      newTypes.delete('all');
                    }
                    setSelectedEventTypes(newTypes);
                  }}
                  className="mr-1"
                />
                <span className="text-sm capitalize">{category}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Main Calendar */}
      <div 
        className="calendar-container"
        style={{ height: isSidebar ? '400px' : '600px' }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleExternalDrop}
      >
        <DnDCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          onEventResize={onEventResize}
          onEventDrop={onEventDrop}
          onSelectSlot={onSelectSlot}
          onSelectEvent={(event) => {
            openModal({
              title: "Event Details",
              children: <EventDetailsModal event={event} onClose={() => openModal(null)} />
            });
          }}
          selectable
          resizable
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          step={30}
          showMultiDayTimes
          components={{
            toolbar: CustomToolbar,
            event: CustomEvent
          }}
        />
      </div>

      {/* Drop Confirmation Modal */}
      {droppedItem && (
        <DropConfirmationModal
          item={droppedItem}
          onConfirm={handleConfirmDrop}
          onCancel={() => setDroppedItem(null)}
        />
      )}

      {/* Stats Panel */}
      {!isSidebar && (
        <div className="calendar-stats mt-4 p-4 bg-white rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{events.length}</div>
              <div className="text-sm text-gray-500">Total Events</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.category === 'meeting').length}
              </div>
              <div className="text-sm text-gray-500">Meetings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {events.filter(e => e.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-500">High Priority</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {events.filter(e => moment(e.start).isAfter(moment(), 'day')).length}
              </div>
              <div className="text-sm text-gray-500">Upcoming</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Toolbar Component
const CustomToolbar = ({ label, onNavigate, onView, view }) => {
  return (
    <div className="rbc-toolbar flex justify-between items-center mb-4">
      <div className="rbc-btn-group flex space-x-1">
        <button onClick={() => onNavigate('PREV')} className="btn btn-sm">‹</button>
        <button onClick={() => onNavigate('TODAY')} className="btn btn-sm">Today</button>
        <button onClick={() => onNavigate('NEXT')} className="btn btn-sm">›</button>
      </div>
      
      <span className="rbc-toolbar-label text-lg font-semibold">{label}</span>
      
      <div className="rbc-btn-group flex space-x-1">
        {['month', 'week', 'day', 'agenda'].map(v => (
          <button
            key={v}
            onClick={() => onView(v)}
            className={`btn btn-sm ${view === v ? 'active' : ''}`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Custom Event Component
const CustomEvent = ({ event }) => {
  return (
    <div className="custom-event">
      <strong>{event.title}</strong>
      {event.priority === 'high' && <span className="priority-indicator">!</span>}
    </div>
  );
};

// Event Creation Modal
const EventCreationModal = ({ start, end, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'general',
    priority: 'medium',
    start: moment(start).format('YYYY-MM-DDTHH:mm'),
    end: moment(end).format('YYYY-MM-DDTHH:mm')
  });

  return (
    <div className="event-creation-modal p-4">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Event title"
          autoFocus
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="general">General</option>
            <option value="meeting">Meeting</option>
            <option value="deadline">Deadline</option>
            <option value="personal">Personal</option>
            <option value="project">Project</option>
            <option value="maintenance">Maintenance</option>
            <option value="analysis">Analysis</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
          <input
            type="datetime-local"
            value={formData.start}
            onChange={(e) => setFormData({...formData, start: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
          <input
            type="datetime-local"
            value={formData.end}
            onChange={(e) => setFormData({...formData, end: e.target.value})}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({
            ...formData,
            start: new Date(formData.start),
            end: new Date(formData.end)
          })}
          disabled={!formData.title}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
        >
          Create Event
        </button>
      </div>
    </div>
  );
};

// Event Details Modal
const EventDetailsModal = ({ event, onClose }) => {
  return (
    <div className="event-details-modal p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <p className="text-gray-600">
          {moment(event.start).format('MMMM Do YYYY, h:mm a')} - 
          {moment(event.end).format('h:mm a')}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Category:</span>
          <span className="ml-2 capitalize">{event.category}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700">Priority:</span>
          <span className={`ml-2 capitalize ${
            event.priority === 'high' ? 'text-red-600' : 
            event.priority === 'medium' ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {event.priority}
          </span>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Drop Confirmation Modal
const DropConfirmationModal = ({ item, onConfirm, onCancel }) => {
  const [duration, setDuration] = useState(60);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Schedule Task</h3>
        <p className="text-gray-600 mb-4">
          How long do you need for "{item.title || item.name}"?
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
            className="w-full p-2 border border-gray-300 rounded"
            min="15"
            max="480"
            step="15"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(duration)}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCalendar;