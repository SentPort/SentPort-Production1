import React, { useState, useRef, useEffect } from 'react';

interface ResizeHandlesProps {
  onResize: (width: string, height: string) => void;
  initialWidth?: string;
  initialHeight?: string;
  minWidth?: number;
  minHeight?: number;
  showGrid?: boolean;
  gridSize?: number;
  showDimensions?: boolean;
  enableVertical?: boolean;
  enableHorizontal?: boolean;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export default function ResizeHandles({
  onResize,
  initialWidth = 'auto',
  initialHeight = 'auto',
  minWidth = 80,
  minHeight = 36,
  showGrid = false,
  gridSize = 16,
  showDimensions = true,
  enableVertical = true,
  enableHorizontal = true,
}: ResizeHandlesProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [direction, setDirection] = useState<ResizeDirection | null>(null);
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const parseSize = (size: string): number => {
    if (size === 'auto') return 0;
    return parseInt(size) || 0;
  };

  const snapToGrid = (value: number): number => {
    if (!showGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const handleMouseDown = (e: React.MouseEvent, dir: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();

    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();

    setIsResizing(true);
    setDirection(dir);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = {
      width: rect.width,
      height: rect.height,
    };
  };

  useEffect(() => {
    if (!isResizing || !direction) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      let newWidth = startSize.current.width;
      let newHeight = startSize.current.height;

      if (direction.includes('e')) {
        newWidth = Math.max(minWidth, startSize.current.width + deltaX);
      } else if (direction.includes('w')) {
        newWidth = Math.max(minWidth, startSize.current.width - deltaX);
      }

      if (direction.includes('s')) {
        newHeight = Math.max(minHeight, startSize.current.height + deltaY);
      } else if (direction.includes('n')) {
        newHeight = Math.max(minHeight, startSize.current.height - deltaY);
      }

      if (showGrid) {
        newWidth = snapToGrid(newWidth);
        newHeight = snapToGrid(newHeight);
      }

      setCurrentSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      onResize(`${Math.round(newWidth)}px`, `${Math.round(newHeight)}px`);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setDirection(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, direction, minWidth, minHeight, onResize]);

  const handleClasses = 'absolute bg-blue-500 hover:bg-blue-600 transition-colors z-50';
  const cornerClasses = `${handleClasses} w-3 h-3 rounded-full`;
  const sideClasses = `${handleClasses} rounded-sm`;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {/* Dimension tooltip */}
      {isResizing && showDimensions && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2 py-1 rounded text-xs font-mono whitespace-nowrap z-50 pointer-events-none">
          {enableHorizontal && enableVertical ? `${currentSize.width}px × ${currentSize.height}px` : enableHorizontal ? `${currentSize.width}px` : `${currentSize.height}px`}
        </div>
      )}

      {/* Corner handles */}
      {enableHorizontal && enableVertical && (
        <>
          <div
            className={`${cornerClasses} -top-1.5 -left-1.5 cursor-nw-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
          />
          <div
            className={`${cornerClasses} -top-1.5 -right-1.5 cursor-ne-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'ne')}
          />
          <div
            className={`${cornerClasses} -bottom-1.5 -left-1.5 cursor-sw-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'sw')}
          />
          <div
            className={`${cornerClasses} -bottom-1.5 -right-1.5 cursor-se-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'se')}
          />
        </>
      )}

      {/* Side handles */}
      {enableVertical && (
        <>
          <div
            className={`${sideClasses} -top-1 left-1/2 -translate-x-1/2 w-8 h-2 cursor-n-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'n')}
          />
          <div
            className={`${sideClasses} -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 cursor-s-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 's')}
          />
        </>
      )}
      {enableHorizontal && (
        <>
          <div
            className={`${sideClasses} -left-1 top-1/2 -translate-y-1/2 w-2 h-8 cursor-w-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'w')}
          />
          <div
            className={`${sideClasses} -right-1 top-1/2 -translate-y-1/2 w-2 h-8 cursor-e-resize pointer-events-auto`}
            onMouseDown={(e) => handleMouseDown(e, 'e')}
          />
        </>
      )}
    </div>
  );
}
