import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { BuilderComponent, BuilderTheme } from '../../types/builder';
import ComponentRenderer from './ComponentRenderer';
import { Palette, MousePointerClick, ZoomIn, ZoomOut, Maximize2, Grid3x3 } from 'lucide-react';

interface BuilderCanvasProps {
  components: BuilderComponent[];
  selectedComponentId: string | null;
  viewMode: 'desktop' | 'tablet' | 'mobile';
  theme: BuilderTheme;
  zoomLevel?: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  onSelectComponent: (id: string) => void;
  onUpdateComponent: (id: string, updates: Partial<BuilderComponent>) => void;
  onMoveComponent?: (componentId: string, toIndex: number, toParentId?: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
}

export default function BuilderCanvas({
  components,
  selectedComponentId,
  viewMode,
  theme,
  zoomLevel = 100,
  showGrid = false,
  snapToGrid = false,
  onSelectComponent,
  onUpdateComponent,
  onMoveComponent,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleGrid,
  onToggleSnap,
}: BuilderCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-root',
    data: {
      type: 'canvas',
      accepts: ['section', 'container', 'columns', 'grid', 'navbar', 'footer'],
    },
  });

  const canvasWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }[viewMode];

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-auto p-8 relative">
      {onZoomIn && onZoomOut && onZoomReset && (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          <button
            onClick={onZoomIn}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-gray-700" />
          </button>
          <div className="text-xs font-medium text-gray-600 text-center px-2">
            {zoomLevel}%
          </div>
          <button
            onClick={onZoomOut}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-gray-700" />
          </button>
          <div className="h-px bg-gray-200 my-1" />
          <button
            onClick={onZoomReset}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-5 h-5 text-gray-700" />
          </button>
          {onToggleGrid && (
            <>
              <div className="h-px bg-gray-200 my-1" />
              <button
                onClick={onToggleGrid}
                className={`p-2 rounded transition-colors ${
                  showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title={showGrid ? 'Hide Grid' : 'Show Grid'}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      )}

      <div
        ref={setNodeRef}
        className={`mx-auto bg-white shadow-2xl transition-all duration-300 rounded-lg overflow-hidden relative ${
          isOver ? 'ring-4 ring-blue-400 ring-opacity-50' : ''
        }`}
        style={{
          width: canvasWidth,
          minHeight: '100vh',
          fontFamily: theme.font_family_body,
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top center',
          backgroundImage: showGrid
            ? 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)'
            : undefined,
          backgroundSize: showGrid ? '20px 20px' : undefined,
        }}
      >
        {components.length === 0 ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center p-12 max-w-md">
              <div className="relative inline-block mb-6">
                <Palette className="w-24 h-24 text-gray-300" strokeWidth={1.5} />
                <MousePointerClick className="w-10 h-10 text-blue-500 absolute -bottom-2 -right-2 animate-bounce" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Start Building Your Page
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Drag and drop components from the left panel to create your perfect website
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Drop zone ready</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative min-h-screen">
            {components.map((component, index) => (
              <ComponentRenderer
                key={component.id}
                component={component}
                isSelected={component.id === selectedComponentId}
                theme={theme}
                onSelect={onSelectComponent}
                onUpdate={onUpdateComponent}
                index={index}
                parentId="canvas-root"
              />
            ))}
            {components.length > 0 && isOver && (
              <div className="h-20 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg m-4 flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">Drop component here</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
