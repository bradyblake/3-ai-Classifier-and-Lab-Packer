import React from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripHorizontal } from 'lucide-react';

const DraggableStatusHeader = ({ status, index, moveStatus, revenue }) => {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'STATUS_COLUMN',
    item: () => {
      console.log('📊 Status drag started:', status.name, 'at index', index);
      return { index, id: status.id || status.name, name: status.name, type: 'STATUS_COLUMN' };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      console.log('📊 Status drag ended:', { item, didDrop: monitor.didDrop() });
    },
    canDrag: () => true,
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'STATUS_COLUMN',
    hover: (draggedItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      if (draggedItem.index !== index) {
        console.log('🔄 Moving status from', draggedItem.index, 'to', index);
        moveStatus(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    drop: (item) => {
      console.log('✅ Status dropped at position:', index);
      return { moved: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const category = status.revenueCategory || 'Pipeline';
  const isScheduledStatus = status.name.toLowerCase().includes('scheduled');
  const categoryColor =
    category === "Pipeline" ? "text-red-600" :
    category === "Projected" ? "text-orange-600" :
    category === "Actual" ? "text-green-600" : "text-gray-600";

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`grid-header ${isDragging ? 'dragging opacity-50' : ''} ${isOver && canDrop ? 'bg-blue-100 border-blue-400' : ''}`}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.2s ease',
        position: 'relative',
        paddingTop: '24px',
        transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
        boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : undefined,
        zIndex: isDragging ? 1000 : 'auto',
      }}
    >
      <div
        ref={drag}
        className="absolute top-2 left-1/2 -translate-x-1/2 cursor-move text-gray-400 hover:text-gray-600 transition-colors"
        title="Drag to reorder column"
        style={{
          opacity: isDragging ? 0.8 : 1,
          transform: 'scale(1.2)'
        }}
      >
        <GripHorizontal size={16} />
      </div>
      <div style={{marginBottom: 'var(--space-xs)'}}>{status.name}</div>
      <div className="text-xs" style={{color: '#6b7280', marginBottom: 'var(--space-sm)'}}>
        {isScheduledStatus ? '(Pipeline/Projected*)' : `(${category})`}
      </div>
      <div className={`text-sm font-bold ${categoryColor}`} style={{fontSize: '0.875rem', fontWeight: '600'}}>
        ${revenue?.toLocaleString() || '0'}
      </div>
    </div>
  );
};

export default DraggableStatusHeader;