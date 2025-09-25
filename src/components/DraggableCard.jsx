// DraggableCard component for Kanban Board
import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, MapPin, User, Clock, Timer, History, Users } from 'lucide-react';
import '../styles/DraggableCard.css';

const ItemType = "CARD";

const DraggableCard = ({
  card,
  onClick,
  className = "",
  laneColor,
  statusColor,
  lanes = [],
  statuses = []
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => {
      console.log('🚀 Drag started for card:', card.id, card.title);
      return { id: card.id, type: ItemType };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      console.log('🎯 Drag ended:', { item, dropResult, didDrop: monitor.didDrop() });
    },
    canDrag: () => true,
  });

  // Handle card click - only trigger if not dragging
  const handleCardClick = (e) => {
    // Prevent click during or right after drag
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Small delay to ensure we're not in a drag operation
    setTimeout(() => {
      if (!isDragging && onClick) {
        onClick(e);
      }
    }, 50);
  };

  // Get the actual colors from configuration
  const getCardColors = () => {
    // Find the lane color based on card location
    const cardLane = lanes.find(l => l.name === card.location);
    const cardStatus = statuses.find(s => s.name === card.status);

    // Use provided colors or fallback to configured colors
    const primaryColor = laneColor || cardLane?.color || '#4ade80';
    const secondaryColor = statusColor || cardStatus?.color || '#0ea5e9';

    return {
      borderColor: primaryColor,
      backgroundColor: primaryColor + '15', // Add transparency
      accentColor: secondaryColor
    };
  };

  const colors = getCardColors();

  // Calculate days since creation and days in current status
  const calculateDaysSince = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate days in current status
  const getDaysInCurrentStatus = () => {
    if (!card.statusHistory || card.statusHistory.length === 0) {
      return calculateDaysSince(card.created);
    }
    const lastStatusChange = card.statusHistory[card.statusHistory.length - 1];
    return calculateDaysSince(lastStatusChange.timestamp);
  };

  // Calculate total days from lead to complete (stop counting when complete)
  const getTotalDaysInSystem = () => {
    const isComplete = card.status && (
      card.status.toLowerCase().includes('complete') ||
      card.status.toLowerCase().includes('finished') ||
      card.status.toLowerCase().includes('done') ||
      card.status === 'Job Complete' ||
      card.status === 'Completed'
    );

    if (isComplete && card.statusHistory) {
      // Find when it was marked complete
      const completeEntry = card.statusHistory.find(entry =>
        entry.status && (
          entry.status.toLowerCase().includes('complete') ||
          entry.status.toLowerCase().includes('finished') ||
          entry.status.toLowerCase().includes('done') ||
          entry.status === 'Job Complete' ||
          entry.status === 'Completed'
        )
      );

      if (completeEntry) {
        return calculateDaysSince(completeEntry.timestamp);
      }
    }

    // If not complete, count from creation to now
    return calculateDaysSince(card.created);
  };

  const daysSinceCreation = calculateDaysSince(card.created);
  const daysSinceUpdate = calculateDaysSince(card.updated);
  const daysInCurrentStatus = getDaysInCurrentStatus();
  const totalDaysInSystem = getTotalDaysInSystem();

  // Format day count display
  const formatDayCount = (days) => {
    if (days === null) return '';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
  };

  console.log('🎨 Rendering DraggableCard:', {
    cardId: card.id,
    title: card.title,
    isDragging,
    dragRef: !!drag
  });

  return (
    <div
      ref={drag}
      className={`draggable-card ${isDragging ? 'dragging' : ''} ${className} card-fade-in relative overflow-hidden`}
      style={{
        borderLeft: `4px solid ${colors.borderColor}`,
        backgroundColor: colors.backgroundColor,
        '--card-accent-color': colors.accentColor,
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        minHeight: '120px',
        padding: '12px',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(2deg) scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        zIndex: isDragging ? 1000 : 'auto',
        boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : undefined,
      }}
      data-status={card.status}
      data-priority={card.priority?.toLowerCase() || 'medium'}
      onClick={handleCardClick}
      onMouseDown={() => console.log('🖱️ Mouse down on card:', card.id)}
      tabIndex={0}
    >
      {/* Priority Flag Overlay */}
      {card.priority && card.priority !== 'Medium' && (
        <div
          className="absolute top-0 right-0 w-0 h-0"
          style={{
            borderStyle: 'solid',
            borderWidth: '0 35px 35px 0',
            borderColor: `transparent ${
              card.priority === 'Critical' ? 'rgba(220, 38, 38, 0.8)' :
              card.priority === 'High' ? 'rgba(249, 115, 22, 0.8)' :
              card.priority === 'Low' ? 'rgba(34, 197, 94, 0.8)' :
              'rgba(156, 163, 175, 0.8)'
            } transparent transparent`,
            zIndex: 10
          }}
          title={`${card.priority} Priority`}
        />
      )}

      {/* Top Row: Customer Name and Days in Status */}
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm font-semibold text-gray-800 flex-1">
          👤 {card.customerName || 'Customer Not Set'}
        </div>
        <div className="text-right">
          {daysInCurrentStatus !== null && (
            <div className="text-xs font-bold px-2 py-1 rounded mb-1" style={{
              backgroundColor: daysInCurrentStatus > 7 ? '#fef3c7' : '#ecfdf5',
              color: daysInCurrentStatus > 7 ? '#92400e' : '#14532d'
            }}>
              {formatDayCount(daysInCurrentStatus)} in status
            </div>
          )}
          {totalDaysInSystem !== null && (
            <div className="text-xs font-medium px-2 py-1 rounded" style={{
              backgroundColor: totalDaysInSystem > 30 ? '#fecaca' : '#e0f2fe',
              color: totalDaysInSystem > 30 ? '#7f1d1d' : '#0c4a6e'
            }}>
              {formatDayCount(totalDaysInSystem)} total
              {card.status && (card.status.toLowerCase().includes('complete') ||
                card.status.toLowerCase().includes('finished') ||
                card.status.toLowerCase().includes('done')) && ' ✓'}
            </div>
          )}
        </div>
      </div>

      {/* Second Row: Project Title */}
      <div className="text-sm font-medium text-gray-700 mb-2">
        {card.title || 'Unnamed Project'}
      </div>

      {/* Third Row: Estimated Revenue */}
      <div className="text-sm font-bold mb-2" style={{
        color: colors.accentColor
      }}>
        {card.revenue && parseFloat(card.revenue) > 0 ? (
          `💰 $${parseFloat(card.revenue).toLocaleString()}`
        ) : (
          <span className="text-gray-400">Revenue not set</span>
        )}
      </div>

      {/* Job Number Badge */}
      {card.jobNumber && (
        <div className="inline-block text-xs px-2 py-1 rounded mb-2" style={{
          backgroundColor: colors.accentColor + '20',
          color: colors.accentColor,
          fontWeight: '500'
        }}>
          Job #{card.jobNumber}
        </div>
      )}

      {/* Status indicator bar at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b"
        style={{
          backgroundColor: colors.accentColor,
          opacity: 0.8
        }}
      />

      {/* Visual aging indicator for stale cards */}
      {daysSinceUpdate > 14 && (
        <div
          className="absolute top-0 left-0 w-0 h-0"
          style={{
            borderStyle: 'solid',
            borderWidth: '30px 0 0 30px',
            borderColor: `${daysSinceUpdate > 30 ? '#dc2626' : '#f97316'} transparent transparent transparent`,
            opacity: 0.7
          }}
          title={`Stale card - not updated for ${formatDayCount(daysSinceUpdate)}`}
        />
      )}
    </div>
  );
};

export default DraggableCard;