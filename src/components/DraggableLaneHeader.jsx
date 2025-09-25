import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical } from 'lucide-react';

const DraggableLaneHeader = ({ lane, index, moveLane, children }) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'LANE',
    item: () => {
      console.log('🏭 Lane drag started:', lane.name, 'at index', index);
      return { index, id: lane.id, name: lane.name, type: 'LANE' };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      console.log('🏭 Lane drag ended:', { item, didDrop: monitor.didDrop() });
    },
    canDrag: () => true,
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'LANE',
    hover: (draggedItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      if (draggedItem.index !== index) {
        console.log('🔄 Moving lane from', draggedItem.index, 'to', index);
        moveLane(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    drop: (item) => {
      console.log('✅ Lane dropped at position:', index);
      return { moved: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`grid-location-header ${isDragging ? 'dragging opacity-50' : ''} ${isOver && canDrop ? 'bg-blue-100 border-blue-400' : ''}`}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease',
        position: 'relative',
        paddingLeft: '24px',
        transform: isDragging ? 'scale(1.05) rotate(-1deg)' : 'scale(1)',
        boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : undefined,
        zIndex: isDragging ? 1000 : 'auto',
      }}
    >
      <div
        ref={drag}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-move text-gray-400 hover:text-gray-600 transition-colors"
        title="Drag to reorder lane"
        style={{
          opacity: isDragging ? 0.8 : 1,
          transform: 'scale(1.2)'
        }}
      >
        <GripVertical size={16} />
      </div>
      {children || `🏭 ${lane.name}`}
    </div>
  );
};

export default DraggableLaneHeader;