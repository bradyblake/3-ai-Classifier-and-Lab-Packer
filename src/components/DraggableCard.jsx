// DraggableCard component for Kanban Board
import React from 'react';
import { useDrag } from 'react-dnd';
import { Calendar, MapPin, User, Clock } from 'lucide-react';
import '../styles/DraggableCard.css';

const ItemType = "CARD";

const DraggableCard = ({ 
  card, 
  onClick,
  className = ""
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: card.id, type: ItemType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'New Lead': return 'border-blue-200 bg-blue-50';
      case 'Quote Requested': return 'border-yellow-200 bg-yellow-50';
      case 'Quote Submitted': return 'border-orange-200 bg-orange-50';
      case 'Job Scheduled': return 'border-purple-200 bg-purple-50';
      case 'Job In Progress': return 'border-indigo-200 bg-indigo-50';
      case 'Job Complete': return 'border-green-200 bg-green-50';
      case 'Invoiced': return 'border-teal-200 bg-teal-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div 
      ref={drag}
      className={`draggable-card ${isDragging ? 'dragging' : ''} ${className} card-fade-in`}
      data-status={card.status}
      data-priority={card.priority?.toLowerCase() || 'medium'}
      onClick={onClick}
      tabIndex={0}
    >
      <div className="card-header-section">
        <h4 className="card-title">
          {card.title || 'Unnamed Project'}
        </h4>
        {card.jobNumber && (
          <div className="card-job-number">
            {card.jobNumber}
          </div>
        )}
      </div>
      
      <div className="card-metadata">
        {card.vendor && (
          <div className="card-metadata-item">
            <User className="card-metadata-icon" />
            <span className="card-metadata-text">{card.vendor}</span>
          </div>
        )}
        
        {card.location && (
          <div className="card-metadata-item">
            <MapPin className="card-metadata-icon" />
            <span className="card-metadata-text">{card.location}</span>
          </div>
        )}
        
        {card.scheduledDate && (
          <div className="card-metadata-item">
            <Calendar className="card-metadata-icon" />
            <span className="card-metadata-text">
              {new Date(card.scheduledDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
      
      {card.revenue && (
        <div className="card-revenue">
          💰 ${parseFloat(card.revenue).toLocaleString()}
        </div>
      )}
      
      {card.description && (
        <div className="card-description">
          {card.description}
        </div>
      )}
    </div>
  );
};

export default DraggableCard;