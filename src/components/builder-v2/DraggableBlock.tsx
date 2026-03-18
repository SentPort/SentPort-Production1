import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move } from 'lucide-react';

interface DraggableBlockProps {
  blockId: string;
  positionX: number;
  positionY: number;
  width?: string;
  height?: string;
  zIndex?: number;
  isAbsolute: boolean;
  isSelected: boolean;
  showGrid: boolean;
  gridSize?: number;
  sectionBounds?: DOMRect;
  onPositionChange: (x: number, y: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  children: React.ReactNode;
}

export default function DraggableBlock({
  blockId,
  positionX,
  positionY,
  width = 'auto',
  height = 'auto',
  zIndex = 0,
  isAbsolute,
  isSelected,
  showGrid,
  gridSize = 16,
  sectionBounds,
  onPositionChange,
  onDragStart,
  onDragEnd,
  children,
}: DraggableBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentPos, setCurrentPos] = useState({ x: positionX, y: positionY });
  const blockRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: positionX, y: positionY });
  const showGridRef = useRef(showGrid);
  const gridSizeRef = useRef(gridSize);

  useEffect(() => {
    showGridRef.current = showGrid;
    gridSizeRef.current = gridSize;
  }, [showGrid, gridSize]);

  useEffect(() => {
    setCurrentPos({ x: positionX, y: positionY });
    currentPosRef.current = { x: positionX, y: positionY };
  }, [positionX, positionY]);

  useEffect(() => {
    currentPosRef.current = currentPos;
  }, [currentPos]);

  const snapToGrid = useCallback((value: number): number => {
    if (!showGridRef.current) return value;
    return Math.round(value / gridSizeRef.current) * gridSizeRef.current;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAbsolute || !isSelected) return;

    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle') || target.closest('.block-content')) {
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - currentPos.x,
        y: e.clientY - currentPos.y,
      };
      onDragStart?.();
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      try {
        let newX = e.clientX - dragStartRef.current.x;
        let newY = e.clientY - dragStartRef.current.y;

        if (sectionBounds && blockRef.current) {
          const blockRect = blockRef.current.getBoundingClientRect();
          const maxX = sectionBounds.width - blockRect.width;
          const maxY = sectionBounds.height - blockRect.height;

          newX = Math.max(0, Math.min(newX, maxX));
          newY = Math.max(0, Math.min(newY, maxY));
        }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        if (showGridRef.current) {
          newX = snapToGrid(newX);
          newY = snapToGrid(newY);
        }

        setCurrentPos({ x: newX, y: newY });
      } catch (error) {
        console.error('Error during drag:', error);
      }
    };

    const handleMouseUp = () => {
      try {
        setIsDragging(false);
        const finalX = currentPosRef.current.x;
        const finalY = currentPosRef.current.y;

        if (typeof finalX === 'number' && typeof finalY === 'number' &&
            !isNaN(finalX) && !isNaN(finalY)) {
          onPositionChange(finalX, finalY);
        }
        onDragEnd?.();
      } catch (error) {
        console.error('Error ending drag:', error);
        setIsDragging(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, snapToGrid, onPositionChange, onDragEnd]);

  if (!isAbsolute) {
    return <>{children}</>;
  }

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${currentPos.x}px`,
    top: `${currentPos.y}px`,
    width,
    height,
    zIndex,
    cursor: isDragging ? 'grabbing' : 'default',
    transition: isDragging ? 'none' : 'all 0.1s ease',
  };

  return (
    <div
      ref={blockRef}
      style={containerStyle}
      className={`draggable-block ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      {isSelected && (
        <div
          className="drag-handle absolute -top-6 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 cursor-grab active:cursor-grabbing z-10"
          title="Drag to move"
        >
          <Move className="w-3 h-3" />
          <span className="font-mono text-[10px]">
            {Math.round(currentPos.x)}, {Math.round(currentPos.y)}
          </span>
        </div>
      )}

      {isDragging && showGrid && (
        <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded" />
      )}

      <div className="block-content h-full w-full">
        {children}
      </div>
    </div>
  );
}
