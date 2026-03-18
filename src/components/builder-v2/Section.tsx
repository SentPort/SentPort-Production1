import React, { useRef, useEffect, useState } from 'react';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BuilderSection, DeviceBreakpoint, BuilderBlock } from '../../types/builder';
import { GripVertical, Grid3x3, Rows3 } from 'lucide-react';
import Block from './Block';

interface SectionProps {
  section: BuilderSection;
  isSelected: boolean;
  currentDevice: DeviceBreakpoint;
  onSelect: () => void;
  onUpdateSection: (updates: Partial<BuilderSection>) => void;
  onDeleteSection: () => void;
  onDuplicateSection: () => void;
  onUpdateBlock?: (blockId: string, updates: Partial<BuilderBlock> | ((block: BuilderBlock) => Partial<BuilderBlock>)) => void;
  onDeleteBlock?: (blockId: string) => void;
  onDuplicateBlock?: (blockId: string) => void;
  onReorderBlocks?: (blockIds: string[]) => void;
  onSelectBlock?: (blockId: string) => void;
  selectedBlockId?: string;
  isEditMode: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function Section({
  section,
  isSelected,
  currentDevice,
  onSelect,
  onUpdateSection,
  onDeleteSection,
  onDuplicateSection,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onReorderBlocks,
  onSelectBlock,
  selectedBlockId,
  isEditMode,
  isDragging,
  isDropTarget = false,
  showGrid = false,
  gridSize = 16,
  onDragStart,
  onDragEnd,
}: SectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: section.id });

  const sectionContentRef = useRef<HTMLDivElement>(null);
  const [sectionBounds, setSectionBounds] = useState<DOMRect | undefined>();

  useEffect(() => {
    if (sectionContentRef.current) {
      setSectionBounds(sectionContentRef.current.getBoundingClientRect());
    }
  }, [section.id, isSelected]);

  const getSectionPropertyForDevice = () => {
    if (currentDevice === 'desktop') {
      return {
        paddingTop: section.padding_top,
        paddingBottom: section.padding_bottom,
        paddingLeft: section.padding_left,
        paddingRight: section.padding_right,
        columns: section.layout_columns || 1,
        maxWidth: section.max_width || 'contained',
        layoutMode: section.layout_mode || 'flow',
      };
    }

    const deviceConfig = currentDevice === 'tablet' ? section.tablet_config : section.mobile_config;
    return {
      paddingTop: deviceConfig?.padding_top ?? section.padding_top,
      paddingBottom: deviceConfig?.padding_bottom ?? section.padding_bottom,
      paddingLeft: deviceConfig?.padding_left ?? section.padding_left,
      paddingRight: deviceConfig?.padding_right ?? section.padding_right,
      columns: deviceConfig?.layout_columns ?? section.layout_columns ?? 1,
      maxWidth: deviceConfig?.max_width ?? section.max_width ?? 'contained',
      layoutMode: deviceConfig?.layout_mode ?? section.layout_mode ?? 'flow',
    };
  };

  const { paddingTop, paddingBottom, paddingLeft, paddingRight, columns, maxWidth, layoutMode: deviceLayoutMode } = getSectionPropertyForDevice();
  const layoutMode = deviceLayoutMode; // Use device-specific layout mode

  const toggleLayoutMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMode = layoutMode === 'flow' ? 'absolute' : 'flow';

    // Update the appropriate config based on current device
    if (currentDevice === 'desktop') {
      onUpdateSection({ layout_mode: newMode });
    } else if (currentDevice === 'tablet') {
      const tabletConfig = section.tablet_config || {};
      onUpdateSection({
        tablet_config: { ...tabletConfig, layout_mode: newMode }
      });
    } else {
      const mobileConfig = section.mobile_config || {};
      onUpdateSection({
        mobile_config: { ...mobileConfig, layout_mode: newMode }
      });
    }

    // Update blocks based on the new layout mode and device
    if (newMode === 'absolute') {
      section.blocks?.forEach((block, index) => {
        if (currentDevice === 'desktop') {
          onUpdateBlock?.(block.id, {
            is_absolute: true,
            position_x: 50,
            position_y: 50 + (index * 100),
          });
        } else {
          // For mobile/tablet, store in device-specific properties
          const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
          onUpdateBlock?.(block.id, (prevBlock) => {
            const currentDeviceProps = prevBlock?.[devicePropsKey] || block[devicePropsKey] || {};
            return {
              [devicePropsKey]: {
                ...currentDeviceProps,
                is_absolute: true,
                position_x: 50,
                position_y: 50 + (index * 100),
              }
            };
          });
        }
      });
    } else {
      section.blocks?.forEach((block) => {
        if (currentDevice === 'desktop') {
          onUpdateBlock?.(block.id, {
            is_absolute: false,
          });
        } else {
          // For mobile/tablet, remove absolute positioning from device-specific properties
          const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
          onUpdateBlock?.(block.id, (prevBlock) => {
            const currentDeviceProps = prevBlock?.[devicePropsKey] || block[devicePropsKey] || {};
            return {
              [devicePropsKey]: {
                ...currentDeviceProps,
                is_absolute: false,
              }
            };
          });
        }
      });
    }
  };

  const shouldShow = () => {
    if (currentDevice === 'desktop') return section.visibility_desktop;
    if (currentDevice === 'tablet') return section.visibility_tablet;
    return section.visibility_mobile;
  };

  if (!shouldShow()) {
    if (!isEditMode) return null;
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const getBackgroundStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (section.background_type === 'color') {
      styles.backgroundColor = section.background_value?.color || '#ffffff';
    } else if (section.background_type === 'gradient' && section.background_value?.gradient) {
      const { gradient } = section.background_value;
      if (gradient.type === 'linear') {
        const stops = gradient.stops
          .map((s) => `${s.color} ${s.position}%`)
          .join(', ');
        styles.backgroundImage = `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
      } else {
        const stops = gradient.stops
          .map((s) => `${s.color} ${s.position}%`)
          .join(', ');
        styles.backgroundImage = `radial-gradient(circle, ${stops})`;
      }
    } else if (section.background_type === 'image' && section.background_image_url) {
      styles.backgroundImage = `url('${section.background_image_url}')`;
      styles.backgroundPosition = section.background_position;
      styles.backgroundSize = section.background_size;
      styles.backgroundRepeat = section.background_repeat;
      styles.backgroundAttachment = section.background_attachment;
    }

    return styles;
  };


  const containerStyles: React.CSSProperties = {
    ...getBackgroundStyles(),
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    position: 'relative',
    minHeight: '100px',
  };

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: section.background_overlay_color || 'transparent',
    opacity: section.background_overlay_opacity,
    pointerEvents: 'none',
  };

  const contentStyles: React.CSSProperties = {
    maxWidth: maxWidth === 'full' ? '100%' : maxWidth === 'contained' ? '1200px' : 'auto',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
    ...(layoutMode === 'flow' ? {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      alignItems: 'flex-start',
    } : {
      minHeight: '400px',
      position: 'relative',
    }),
  };

  const deviceBlocks = (section.blocks || []).filter(block =>
    block.device === currentDevice || !block.device
  );
  const sortedBlocks = [...deviceBlocks].sort((a, b) => a.block_order - b.block_order);
  const blockIds = sortedBlocks.map((block) => block.id);

  const hasResponsiveOverride = currentDevice === 'tablet' ? !!section.tablet_config :
    currentDevice === 'mobile' ? !!section.mobile_config : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-id={section.id}
      className={`builder-section relative ${isSelected ? 'selected' : ''} ${!shouldShow() ? 'opacity-50' : ''} ${
        isEditMode ? 'hover:ring-2 hover:ring-blue-400 transition-all' : ''
      } ${isDropTarget ? 'ring-4 ring-green-400 bg-green-50' : ''} ${section.custom_css_classes?.join(' ') || ''}`}
      onClick={(e) => {
        if (isEditMode) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      <div style={containerStyles}>
        {(section.background_overlay_color && section.background_overlay_opacity > 0) && (
          <div style={overlayStyles} />
        )}


        {isEditMode && isSelected && (
          <div className="absolute top-2 left-2 z-50 flex gap-2">
            <button
              {...attributes}
              {...listeners}
              className="bg-white text-gray-700 p-2 rounded-md shadow-lg hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>
            <button
              onClick={toggleLayoutMode}
              className={`p-2 rounded-md shadow-lg transition-colors ${
                layoutMode === 'absolute'
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title={layoutMode === 'absolute' ? 'Switch to Flow Layout' : 'Switch to Absolute Layout'}
            >
              {layoutMode === 'absolute' ? <Grid3x3 className="w-5 h-5" /> : <Rows3 className="w-5 h-5" />}
            </button>
          </div>
        )}

        {isEditMode && isSelected && (
          <div className="absolute top-2 right-2 z-50 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateSection();
              }}
              className="bg-white text-gray-700 px-3 py-1.5 rounded-md shadow-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Duplicate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to permanently delete this section from all devices?')) {
                  onDeleteSection();
                }
              }}
              className="bg-red-500 text-white px-3 py-1.5 rounded-md shadow-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </div>
        )}

        <SortableContext items={blockIds} strategy={rectSortingStrategy}>
          <div ref={sectionContentRef} style={contentStyles}>
            {sortedBlocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                currentDevice={currentDevice}
                isEditMode={isEditMode}
                isDraggable={isEditMode && layoutMode === 'flow'}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock?.(block.id)}
                onUpdate={(updates) => onUpdateBlock?.(block.id, updates)}
                onDelete={() => onDeleteBlock?.(block.id)}
                onDuplicate={() => onDuplicateBlock?.(block.id)}
                showGrid={showGrid}
                gridSize={gridSize}
                sectionBounds={sectionBounds}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}

            {isEditMode && sortedBlocks.length === 0 && (
              <div className="w-full flex items-center justify-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 text-sm">
                  Click "Add Block" to add content to this section
                </p>
              </div>
            )}
          </div>
        </SortableContext>

        {isEditMode && isSelected && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-white text-gray-700 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium">
              <span>Section: {section.section_type}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
