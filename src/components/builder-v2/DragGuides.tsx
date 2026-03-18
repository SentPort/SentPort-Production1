import React from 'react';

interface DragGuidesProps {
  showGrid: boolean;
  gridSize?: number;
}

export default function DragGuides({ showGrid, gridSize = 16 }: DragGuidesProps) {
  if (!showGrid) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid-small"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="rgba(59, 130, 246, 0.08)"
              strokeWidth="0.5"
            />
          </pattern>
          <pattern
            id="grid-large"
            width={gridSize * 4}
            height={gridSize * 4}
            patternUnits="userSpaceOnUse"
          >
            <rect width={gridSize * 4} height={gridSize * 4} fill="url(#grid-small)" />
            <path
              d={`M ${gridSize * 4} 0 L 0 0 0 ${gridSize * 4}`}
              fill="none"
              stroke="rgba(59, 130, 246, 0.15)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-large)" />
      </svg>
    </div>
  );
}
