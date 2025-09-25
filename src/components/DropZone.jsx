import React from 'react';
import { useDrop } from 'react-dnd';

const ItemType = "CARD";

const DropZone = ({ onDrop, children, className = '', lane, status }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemType,
    drop: (item, monitor) => {
      // Only process if we're the deepest drop target
      if (!monitor.isOver({ shallow: true })) return;

      console.log('📦 Drop event triggered:', { item, lane, status, onDrop: !!onDrop });
      if (onDrop) {
        onDrop(item, lane, status);
      }
      return { lane, status }; // Return drop result for drag end handler
    },
    hover: (item, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      console.log('🌊 Hover over drop zone:', { lane, status, itemId: item.id });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
    canDrop: (item) => {
      console.log('🎯 Can drop check:', { itemId: item.id, lane, status });
      return true;
    },
  });

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop}
      className={`
        ${className}
        ${isActive ? 'bg-blue-50 border-blue-400 border-dashed border-2' : ''}
        transition-all duration-200
      `}
      style={{
        minHeight: '100px',
        position: 'relative',
      }}
    >
      {children}
      {isActive && (
        <div className="absolute inset-0 bg-blue-100 opacity-20 pointer-events-none rounded" />
      )}
    </div>
  );
};

export default DropZone;