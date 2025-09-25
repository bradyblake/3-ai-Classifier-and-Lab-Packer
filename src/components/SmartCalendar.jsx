import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { X } from 'lucide-react';

const localizer = momentLocalizer(moment);

const SmartCalendar = ({
  isOpen,
  onClose,
  cards,
  lanes,
  statuses,
  onEditCard,
  salesPeriods = [] // From setup panel
}) => {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  // Convert cards to calendar events
  const events = useMemo(() => {
    return cards
      .filter(card => card.scheduledDate)
      .map(card => {
        const lane = lanes.find(l => l.id === card.location || l.name === card.location);
        const status = statuses.find(s => s.name === card.status);

        const eventDate = new Date(card.scheduledDate);

        return {
          id: card.id,
          title: `${card.jobNumber || 'N/A'} - ${card.title || 'Untitled'}`,
          start: eventDate,
          end: new Date(eventDate.getTime() + (2 * 60 * 60 * 1000)), // Default 2 hour duration
          resource: {
            card,
            lane,
            status,
            location: lane?.name || 'Unknown',
            customer: card.customerName || 'Unknown Customer',
            crew: card.assignedCrew || [],
            vendor: card.vendor || 'Unassigned'
          }
        };
      });
  }, [cards, lanes, statuses]);

  // Create sales period events for background display
  const salesPeriodEvents = useMemo(() => {
    return salesPeriods.map((period, index) => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);

      return {
        id: `sales-period-${index}`,
        title: `📊 ${period.name || `Sales Period ${index + 1}`}`,
        start: startDate,
        end: endDate,
        allDay: true,
        resource: {
          type: 'sales-period',
          period
        }
      };
    });
  }, [salesPeriods]);

  const allEvents = [...events, ...salesPeriodEvents];

  // Custom event style function
  const eventStyleGetter = useCallback((event) => {
    const { resource } = event;

    // Sales period styling
    if (resource?.type === 'sales-period') {
      return {
        style: {
          backgroundColor: '#e3f2fd',
          border: '2px dashed #1976d2',
          color: '#1976d2',
          opacity: 0.7,
          fontSize: '11px'
        }
      };
    }

    // Job event styling
    const lane = resource?.lane;
    const status = resource?.status;

    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    // Use lane color if available
    if (lane?.color) {
      backgroundColor = lane.color;
      borderColor = lane.color;
    }

    // Modify opacity based on status
    let opacity = 1;
    if (status?.name === 'Completed') {
      opacity = 0.6;
    } else if (status?.name === 'On Hold' || status?.name === 'Cancelled') {
      opacity = 0.4;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        opacity,
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    };
  }, []);

  // Handle event click
  const handleSelectEvent = useCallback((event) => {
    if (event.resource?.type === 'sales-period') {
      // Show sales period info
      alert(`Sales Period: ${event.resource.period.name}\nStart: ${moment(event.start).format('MMMM DD, YYYY')}\nEnd: ${moment(event.end).format('MMMM DD, YYYY')}`);
      return;
    }

    if (event.resource?.card && onEditCard) {
      onEditCard(event.resource.card);
      onClose();
    }
  }, [onEditCard, onClose]);

  // Handle slot selection (for creating new events)
  const handleSelectSlot = useCallback((slotInfo) => {
    const selectedDate = moment(slotInfo.start).format('YYYY-MM-DD');
    console.log('Selected date for new event:', selectedDate);
    // Could implement creating new job here
  }, []);

  // Custom toolbar
  const CustomToolbar = ({ label, onNavigate, onView }) => (
    <div className="rbc-toolbar" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '10px',
      background: '#f8f9fa',
      borderRadius: '8px'
    }}>
      <div className="rbc-btn-group">
        <button
          onClick={() => onNavigate('PREV')}
          className="rbc-btn"
          style={{ padding: '8px 12px', marginRight: '4px' }}
        >
          ‹
        </button>
        <button
          onClick={() => onNavigate('TODAY')}
          className="rbc-btn"
          style={{ padding: '8px 12px', margin: '0 4px' }}
        >
          Today
        </button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="rbc-btn"
          style={{ padding: '8px 12px', marginLeft: '4px' }}
        >
          ›
        </button>
      </div>

      <span className="rbc-toolbar-label" style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333'
      }}>
        {label}
      </span>

      <div className="rbc-btn-group">
        {['month', 'week', 'day', 'agenda'].map(viewName => (
          <button
            key={viewName}
            onClick={() => onView(viewName)}
            className={`rbc-btn ${view === viewName ? 'rbc-active' : ''}`}
            style={{
              padding: '8px 12px',
              margin: '0 2px',
              backgroundColor: view === viewName ? '#007bff' : '#fff',
              color: view === viewName ? '#fff' : '#333'
            }}
          >
            {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95vw] h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">📅 Smart Calendar</h2>
            <p className="text-sm text-gray-600">
              Project scheduling with sales period tracking • {events.length} scheduled jobs
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-b bg-gray-50">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span>Scheduled Jobs</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-dashed border-blue-600 bg-blue-100 rounded mr-2"></div>
              <span>Sales Periods</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-400 rounded mr-2"></div>
              <span>Completed Jobs</span>
            </div>
            {lanes.slice(0, 3).map(lane => (
              <div key={lane.id} className="flex items-center">
                <div
                  className="w-4 h-4 rounded mr-2"
                  style={{ backgroundColor: lane.color || '#6b7280' }}
                ></div>
                <span>{lane.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 p-4">
          <Calendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            components={{
              toolbar: CustomToolbar
            }}
            popup
            showMultiDayTimes
            step={60}
            timeslots={1}
            formats={{
              eventTimeRangeFormat: ({ start, end }, culture, localizer) => {
                return localizer.format(start, 'h:mm A', culture) + ' - ' + localizer.format(end, 'h:mm A', culture);
              }
            }}
            tooltipAccessor={(event) => {
              if (event.resource?.type === 'sales-period') {
                return `Sales Period: ${event.resource.period.name}`;
              }
              const { resource } = event;
              return `${resource?.customer || 'Unknown Customer'}\n${resource?.location || 'Unknown Location'}\nVendor: ${resource?.vendor || 'Unassigned'}\nCrew: ${resource?.crew?.join(', ') || 'None assigned'}`;
            }}
          />
        </div>

        {/* Summary Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              📋 {events.length} scheduled jobs • 📊 {salesPeriods.length} sales periods
            </div>
            <div>
              Click jobs to edit • Click sales periods for details • Select empty slots to add jobs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartCalendar;
