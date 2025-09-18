// CalendarPanel - Dashboard Calendar Component
// Simplified calendar for the right pane

import React, { useState } from "react";
import PropTypes from "prop-types";

export default function CalendarPanel({ events = [], addEventToCalendar }) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');

  const handleAddEvent = () => {
    if (eventTitle.trim() && eventDate && eventTime) {
      const newEvent = {
        id: Date.now(),
        title: eventTitle,
        date: eventDate,
        time: eventTime,
        datetime: `${eventDate}T${eventTime}`,
        created: new Date().toISOString()
      };
      
      addEventToCalendar(newEvent);
      
      // Reset form
      setEventTitle('');
      setEventDate('');
      setEventTime('');
      setShowAddEvent(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(event => event.date >= today)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 5);

  return (
    <div className="calendar-panel">
      {/* Header */}
      <div className="calendar-header">
        <h3 className="calendar-title">📅 Calendar</h3>
        <button
          className="calendar-add-button"
          onClick={() => setShowAddEvent(!showAddEvent)}
        >
          {showAddEvent ? '×' : '+'}
        </button>
      </div>

      {/* Add Event Form */}
      {showAddEvent && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddEvent}
                className="flex-1 bg-blue-500 text-white p-2 rounded text-sm hover:bg-blue-600"
              >
                Add Event
              </button>
              <button
                onClick={() => setShowAddEvent(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {upcomingEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">No upcoming events</p>
            <p className="text-xs text-gray-400 mt-1">
              Click + to add an event
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map(event => (
              <div
                key={event.id}
                className="p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {event.title}
                </div>
                <div className="text-xs text-gray-600">
                  📅 {new Date(event.date).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-600">
                  ⏰ {event.time}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {events.length} total event{events.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

CalendarPanel.propTypes = {
  events: PropTypes.array,
  addEventToCalendar: PropTypes.func.isRequired,
};