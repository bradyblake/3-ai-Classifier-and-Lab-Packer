import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  MapPin,
  FileText,
  Bell,
  Filter,
  Search,
  Download,
  Settings,
  Target,
  Truck,
  Building
} from 'lucide-react';

const SmartCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration: 60,
    type: 'meeting',
    projectId: null,
    location: '',
    attendees: '',
    reminder: 15,
    priority: 'medium'
  });
  const [filter, setFilter] = useState({
    type: 'all',
    project: 'all',
    priority: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [upcomingOverdue, setUpcomingOverdue] = useState([]);

  const eventTypes = {
    meeting: { color: '#3B82F6', icon: <Users className="w-4 h-4" />, label: 'Meeting' },
    project: { color: '#10B981', icon: <Target className="w-4 h-4" />, label: 'Project Milestone' },
    appointment: { color: '#F59E0B', icon: <Clock className="w-4 h-4" />, label: 'Appointment' },
    deadline: { color: '#EF4444', icon: <AlertTriangle className="w-4 h-4" />, label: 'Deadline' },
    pickup: { color: '#8B5CF6', icon: <Truck className="w-4 h-4" />, label: 'Pickup/Delivery' },
    inspection: { color: '#06B6D4', icon: <Building className="w-4 h-4" />, label: 'Site Inspection' },
    note: { color: '#6B7280', icon: <FileText className="w-4 h-4" />, label: 'Note/Reminder' }
  };

  useEffect(() => {
    loadEvents();
    loadProjects();
    checkUpcomingOverdue();
  }, []);

  useEffect(() => {
    checkUpcomingOverdue();
  }, [events, projects]);

  const loadEvents = () => {
    const savedEvents = localStorage.getItem('smart_calendar_events');
    const scheduledNotes = localStorage.getItem('scheduled_notes');
    
    let allEvents = [];
    
    if (savedEvents) {
      try {
        allEvents = [...allEvents, ...JSON.parse(savedEvents)];
      } catch (error) {
        console.error('Error loading events:', error);
      }
    }
    
    // Load scheduled notes from SmartNotesDropArea
    if (scheduledNotes) {
      try {
        const notes = JSON.parse(scheduledNotes);
        const noteEvents = notes.map(note => ({
          id: `note_${note.id}`,
          title: note.text.substring(0, 50) + (note.text.length > 50 ? '...' : ''),
          description: note.text,
          date: note.scheduledDate,
          time: '09:00',
          duration: 30,
          type: 'note',
          projectId: note.projectId,
          priority: 'medium',
          isFromNote: true
        }));
        allEvents = [...allEvents, ...noteEvents];
      } catch (error) {
        console.error('Error loading scheduled notes:', error);
      }
    }
    
    setEvents(allEvents);
  };

  const loadProjects = () => {
    const savedProjects = localStorage.getItem('enhanced_project_tracker_projects');
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        setProjects(parsed);
        
        // Generate project events for scheduled jobs
        const projectEvents = parsed
          .filter(p => p.status === 'scheduled' || p.status === 'active')
          .map(project => ({
            id: `project_${project.id}`,
            title: `${project.name} - ${project.status}`,
            description: `Project: ${project.name}\nClient: ${project.client || 'N/A'}\nTracking: ${project.trackingNumber}`,
            date: project.scheduledDate || new Date().toISOString().split('T')[0],
            time: '08:00',
            duration: 480, // 8 hours
            type: 'project',
            projectId: project.id,
            location: project.location,
            priority: project.priority,
            isFromProject: true
          }));
          
        setEvents(prev => [...prev.filter(e => !e.isFromProject), ...projectEvents]);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
  };

  const checkUpcomingOverdue = () => {
    const now = new Date();
    const upcoming = [];
    const overdue = [];

    events.forEach(event => {
      const eventDate = new Date(event.date + 'T' + event.time);
      const diffTime = eventDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffTime < 0) {
        overdue.push({ ...event, daysOverdue: Math.abs(diffDays) });
      } else if (diffDays <= 7) {
        upcoming.push({ ...event, daysUntil: diffDays });
      }
    });

    // Check projects for status updates needed
    projects.forEach(project => {
      const statusDate = new Date(project.currentStatusSince);
      const daysSinceUpdate = Math.floor((now - statusDate) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate > 14) { // 2 weeks without update
        upcoming.push({
          id: `status_update_${project.id}`,
          title: `Status Update Required: ${project.name}`,
          description: `Project has been in "${project.status}" status for ${daysSinceUpdate} days`,
          type: 'deadline',
          projectId: project.id,
          priority: 'high',
          daysUntil: 0,
          isStatusReminder: true
        });
      }
    });

    setUpcomingOverdue([...upcoming.sort((a, b) => a.daysUntil - b.daysUntil), ...overdue]);
  };

  const saveEvents = (updatedEvents) => {
    // Filter out auto-generated events
    const userEvents = updatedEvents.filter(e => !e.isFromNote && !e.isFromProject);
    localStorage.setItem('smart_calendar_events', JSON.stringify(userEvents));
    setEvents(updatedEvents);
  };

  const parseNaturalDate = (text) => {
    const now = new Date();
    const today = new Date(now);
    
    // Reset time to start of day for comparison
    today.setHours(0, 0, 0, 0);
    
    // Convert text to lowercase for easier matching
    const lowerText = text.toLowerCase();
    
    // Today
    if (lowerText.includes('today')) {
      return today;
    }
    
    // Tomorrow
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    // This Friday vs Next Friday
    if (lowerText.includes('this friday')) {
      const currentDay = today.getDay(); // 0 = Sunday, 5 = Friday
      const daysUntilFriday = (5 - currentDay + 7) % 7;
      const thisFriday = new Date(today);
      thisFriday.setDate(thisFriday.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
      return thisFriday;
    }
    
    if (lowerText.includes('next friday')) {
      const currentDay = today.getDay();
      const daysUntilFriday = (5 - currentDay + 7) % 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(nextFriday.getDate() + daysUntilFriday + 7);
      return nextFriday;
    }
    
    // This week/next week for other days
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(`this ${days[i]}`)) {
        const currentDay = today.getDay();
        const targetDay = i;
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const thisDay = new Date(today);
        thisDay.setDate(thisDay.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
        return thisDay;
      }
      
      if (lowerText.includes(`next ${days[i]}`)) {
        const currentDay = today.getDay();
        const targetDay = i;
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const nextDay = new Date(today);
        nextDay.setDate(nextDay.getDate() + daysUntilTarget + 7);
        return nextDay;
      }
    }
    
    // Next week
    if (lowerText.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    
    // Specific date patterns (MM/DD/YYYY, MM/DD, etc.)
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{1,2})\/(\d{1,2})/,           // MM/DD
      /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        let month, day, year;
        if (pattern.source.includes('\\d{4}') && match[1].length === 4) {
          // YYYY-MM-DD format
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          // MM/DD formats
          month = parseInt(match[1]) - 1;
          day = parseInt(match[2]);
          year = match[3] ? parseInt(match[3]) : now.getFullYear();
        }
        
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }
    }
    
    return null;
  };

  const createEvent = () => {
    if (!newEvent.title.trim()) {
      alert('Event title is required');
      return;
    }

    const eventData = {
      id: Date.now().toString(),
      ...newEvent,
      attendees: newEvent.attendees.split(',').map(a => a.trim()).filter(a => a)
    };

    const updatedEvents = [...events, eventData];
    saveEvents(updatedEvents);
    
    setNewEvent({
      title: '', description: '', date: '', time: '', duration: 60,
      type: 'meeting', projectId: null, location: '', attendees: '',
      reminder: 15, priority: 'medium'
    });
    setShowEventModal(false);
  };

  const deleteEvent = (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      const updatedEvents = events.filter(e => e.id !== eventId);
      saveEvents(updatedEvents);
      setSelectedEvent(null);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const filteredEvents = events.filter(event => {
    const matchesType = filter.type === 'all' || event.type === filter.type;
    const matchesProject = filter.project === 'all' || event.projectId === filter.project;
    const matchesPriority = filter.priority === 'all' || event.priority === filter.priority;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesProject && matchesPriority && matchesSearch;
  });

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const generateReport = () => {
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
    const overdue = events.filter(e => new Date(e.date) < now);
    
    const report = `SMART CALENDAR REPORT
Generated: ${now.toLocaleString()}
Total Events: ${events.length}
Upcoming Events: ${upcoming.length}
Overdue Events: ${overdue.length}

UPCOMING EVENTS:
${upcoming.map(e => 
  `• ${e.date} ${formatTime(e.time)} - ${e.title} (${eventTypes[e.type]?.label || e.type})`
).join('\n')}

OVERDUE EVENTS:
${overdue.map(e => 
  `• ${e.date} ${formatTime(e.time)} - ${e.title} (${eventTypes[e.type]?.label || e.type})`
).join('\n')}

EVENTS BY TYPE:
${Object.keys(eventTypes).map(type => {
  const typeEvents = events.filter(e => e.type === type);
  return `• ${eventTypes[type].label}: ${typeEvents.length}`;
}).join('\n')}

PROJECT-RELATED EVENTS:
${events.filter(e => e.projectId).map(e => {
  const project = projects.find(p => p.id === e.projectId);
  return `• ${e.title} - ${project ? project.name : 'Unknown Project'}`;
}).join('\n')}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Smart_Calendar_Report_${now.toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="smart-calendar p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Smart Calendar</h1>
            <p className="text-gray-600">
              Intelligent scheduling with natural language date parsing
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowEventModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </button>
            <button
              onClick={generateReport}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>

        {/* Upcoming/Overdue Alerts */}
        {upcomingOverdue.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Attention Required ({upcomingOverdue.length})
            </h3>
            <div className="space-y-1">
              {upcomingOverdue.slice(0, 5).map((item, index) => (
                <div key={index} className="text-sm">
                  <span className={`px-2 py-1 rounded text-xs mr-2 ${
                    item.daysOverdue ? 'bg-red-100 text-red-700' : 
                    item.daysUntil === 0 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {item.daysOverdue ? `${item.daysOverdue}d overdue` :
                     item.daysUntil === 0 ? 'Today' : `${item.daysUntil}d`}
                  </span>
                  {item.title}
                </div>
              ))}
              {upcomingOverdue.length > 5 && (
                <div className="text-sm text-gray-600">
                  ... and {upcomingOverdue.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {Object.entries(eventTypes).map(([key, type]) => (
              <option key={key} value={key}>{type.label}</option>
            ))}
          </select>
          
          <select
            value={filter.project}
            onChange={(e) => setFilter({ ...filter, project: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          
          <select
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(currentDate).map((day, index) => {
              if (!day) {
                return <div key={index} className="h-24 p-1"></div>;
              }
              
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayEvents = getEventsForDate(date);
              const filteredDayEvents = dayEvents.filter(event => filteredEvents.includes(event));
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div
                  key={day}
                  className={`h-24 p-1 border rounded cursor-pointer hover:bg-gray-50 ${
                    isToday ? 'bg-blue-50 border-blue-200' : 'border-gray-200'
                  }`}
                  onClick={() => {
                    setNewEvent({
                      ...newEvent,
                      date: date.toISOString().split('T')[0]
                    });
                    setShowEventModal(true);
                  }}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {filteredDayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="text-xs p-1 rounded truncate"
                        style={{ backgroundColor: eventTypes[event.type]?.color + '20', color: eventTypes[event.type]?.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        {formatTime(event.time)} {event.title}
                      </div>
                    ))}
                    {filteredDayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{filteredDayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedEvent ? 'Event Details' : 'Create New Event'}
                </h3>
                <button
                  onClick={() => {
                    setShowEventModal(false);
                    setSelectedEvent(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {selectedEvent ? (
                // View event details
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded mr-3"
                      style={{ backgroundColor: eventTypes[selectedEvent.type]?.color }}
                    ></div>
                    <h4 className="text-lg font-semibold">{selectedEvent.title}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Date:</strong> {new Date(selectedEvent.date).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {formatTime(selectedEvent.time)}</div>
                    <div><strong>Duration:</strong> {selectedEvent.duration} minutes</div>
                    <div><strong>Type:</strong> {eventTypes[selectedEvent.type]?.label}</div>
                    <div><strong>Priority:</strong> <span className="capitalize">{selectedEvent.priority}</span></div>
                    {selectedEvent.location && <div><strong>Location:</strong> {selectedEvent.location}</div>}
                  </div>
                  
                  {selectedEvent.description && (
                    <div>
                      <strong>Description:</strong>
                      <p className="text-gray-600 mt-1">{selectedEvent.description}</p>
                    </div>
                  )}
                  
                  {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                    <div>
                      <strong>Attendees:</strong>
                      <p className="text-gray-600 mt-1">{selectedEvent.attendees.join(', ')}</p>
                    </div>
                  )}
                  
                  {selectedEvent.projectId && (
                    <div>
                      <strong>Project:</strong>
                      <p className="text-gray-600 mt-1">
                        {projects.find(p => p.id === selectedEvent.projectId)?.name || 'Unknown Project'}
                      </p>
                    </div>
                  )}
                  
                  {!selectedEvent.isFromNote && !selectedEvent.isFromProject && (
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        onClick={() => deleteEvent(selectedEvent.id)}
                        className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
                      >
                        Delete Event
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // Create new event form
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newEvent.type}
                        onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Object.entries(eventTypes).map(([key, type]) => (
                          <option key={key} value={key}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                      <input
                        type="number"
                        value={newEvent.duration}
                        onChange={(e) => setNewEvent({ ...newEvent, duration: parseInt(e.target.value) || 60 })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="15"
                        step="15"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={newEvent.priority}
                        onChange={(e) => setNewEvent({ ...newEvent, priority: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                      <select
                        value={newEvent.projectId || ''}
                        onChange={(e) => setNewEvent({ ...newEvent, projectId: e.target.value || null })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No Project</option>
                        {projects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attendees (comma-separated)</label>
                    <input
                      type="text"
                      value={newEvent.attendees}
                      onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="john@example.com, jane@example.com"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createEvent}
                      disabled={!newEvent.title.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Create Event
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCalendar;