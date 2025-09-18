import React from 'react';
import { useDrop } from 'react-dnd';

const ItemType = "CARD";

const DropZone = ({ onDrop, children, className = '', lane, status }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemType,
    drop: (item, monitor) => {
      if (onDrop) {
        onDrop(item, lane, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
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