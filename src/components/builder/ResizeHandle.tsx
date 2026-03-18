import React, { useState, useRef, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';

interface ResizeHandleProps {
  onResize: (width: string, height: string) => void;
  currentWidth?: string;
  currentHeight?: string;
}

export default function ResizeHandle({ onResize, currentWidth, currentHeight }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width: currentWidth || 'auto', height: currentHeight || 'auto' });
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const parseSize = (size: string): number => {
    if (!size || size === 'auto') return 0;
    return parseInt(size) || 0;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: parseSize(currentWidth || ''),
      height: parseSize(currentHeight || ''),
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      const newWidth = Math.max(100, startPosRef.current.width + deltaX);
      const newHeight = Math.max(50, startPosRef.current.height + deltaY);

      const widthStr = `${newWidth}px`;
      const heightStr = `${newHeight}px`;

      setDimensions({ width: widthStr, height: heightStr });
      onResize(widthStr, heightStr);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50
        flex items-center justify-center
        bg-blue-500 text-white rounded-tl-lg
        hover:bg-blue-600 transition-colors
        ${isDragging ? 'bg-blue-700' : ''}
      `}
      title="Drag to resize"
    >
      <Maximize2 className="w-3 h-3" />
    </div>
  );
}
