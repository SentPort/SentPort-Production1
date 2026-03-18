import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BuilderBlock, DeviceBreakpoint } from '../../types/builder';
import InlineTextEditor from './InlineTextEditor';
import ResizeHandles from './ResizeHandles';
import DraggableBlock from './DraggableBlock';
import { GripVertical, Copy } from 'lucide-react';

interface BlockProps {
  block: BuilderBlock;
  currentDevice: DeviceBreakpoint;
  isEditMode: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onUpdate?: (updates: Partial<BuilderBlock> | ((block: BuilderBlock) => Partial<BuilderBlock>)) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isDraggable?: boolean;
  showGrid?: boolean;
  gridSize?: number;
  sectionBounds?: DOMRect;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function Block({
  block,
  currentDevice,
  isEditMode,
  isSelected = false,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  isDraggable = true,
  showGrid = false,
  gridSize = 16,
  sectionBounds,
  onDragStart,
  onDragEnd,
}: BlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: block.id,
    disabled: !isDraggable || !isEditMode,
  });

  const shouldShow = () => {
    if (currentDevice === 'desktop') return block.visibility_desktop;
    if (currentDevice === 'tablet') return block.visibility_tablet;
    return block.visibility_mobile;
  };

  if (!shouldShow()) {
    if (!isEditMode) return null;
  }

  const hasDeviceOverride = currentDevice !== 'desktop' && block.device === currentDevice;

  const normalizeValue = (value: string | undefined, shouldAddPx = true): string | undefined => {
    if (!value) return value;
    if (shouldAddPx && /^\d+$/.test(value)) {
      return `${value}px`;
    }
    return value;
  };

  const getDeviceProperty = (property: string): any => {
    try {
      if (currentDevice === 'desktop') {
        return block[property];
      } else {
        const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';
        const deviceProps = block[devicePropsKey];

        if (deviceProps && deviceProps[property] !== undefined && deviceProps[property] !== null) {
          return deviceProps[property];
        }

        return block[property];
      }
    } catch (error) {
      console.error(`Error getting device property ${property}:`, error);
      return block[property];
    }
  };

  const getTextStyles = (): React.CSSProperties => {
    try {
      return {
        margin: 0,
        padding: 0,
        textAlign: getDeviceProperty('alignment') || 'left',
        fontFamily: getDeviceProperty('font_family'),
        fontSize: normalizeValue(getDeviceProperty('font_size')),
        fontWeight: getDeviceProperty('font_weight'),
        fontStyle: getDeviceProperty('font_style'),
        textDecoration: getDeviceProperty('text_decoration'),
        lineHeight: getDeviceProperty('line_height'),
        letterSpacing: getDeviceProperty('letter_spacing'),
        color: getDeviceProperty('text_color'),
        display: 'block',
      };
    } catch (error) {
      console.error('Error getting text styles:', error);
      return {
        margin: 0,
        padding: 0,
        textAlign: 'left',
        display: 'block',
      };
    }
  };

  const getContainerStyles = (): React.CSSProperties => {
    try {
      const styles: React.CSSProperties = {
        padding: normalizeValue(getDeviceProperty('padding')),
        margin: normalizeValue(getDeviceProperty('margin')),
        borderRadius: normalizeValue(getDeviceProperty('border_radius')),
        borderWidth: normalizeValue(getDeviceProperty('border_width')),
        borderColor: getDeviceProperty('border_color'),
        borderStyle: getDeviceProperty('border_style') as any,
        boxShadow: getDeviceProperty('shadow'),
      };

      const bgColor = getDeviceProperty('background_color');
      if (bgColor) {
        styles.backgroundColor = bgColor;
      }

      return styles;
    } catch (error) {
      console.error('Error getting container styles:', error);
      return {};
    }
  };

  const renderBlockContent = () => {
    try {
      const textStyles = getTextStyles();
      const containerStyles = getContainerStyles();

      switch (block.block_type) {
      case 'heading':
        const HeadingTag = (block.content.level || 'h2') as keyof JSX.IntrinsicElements;
        return (
          <div style={containerStyles}>
            <HeadingTag
              style={textStyles}
              className={`${!shouldShow() ? 'opacity-50' : ''} ${isEditMode ? 'cursor-text' : ''}`}
              onDoubleClick={() => isEditMode && setIsEditing(true)}
            >
              {isEditing && isEditMode ? (
                <InlineTextEditor
                  initialValue={block.content.text || 'Heading'}
                  onSave={(text) => {
                    onUpdate?.({ content: { ...block.content, text } });
                    setIsEditing(false);
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                block.content.text || 'Heading'
              )}
            </HeadingTag>
          </div>
        );

      case 'paragraph':
        return (
          <div style={containerStyles}>
            <p
              style={textStyles}
              className={`${!shouldShow() ? 'opacity-50' : ''} ${isEditMode ? 'cursor-text' : ''}`}
              onDoubleClick={() => isEditMode && setIsEditing(true)}
            >
              {isEditing && isEditMode ? (
                <InlineTextEditor
                  initialValue={block.content.text || 'Paragraph text'}
                  onSave={(text) => {
                    onUpdate?.({ content: { ...block.content, text } });
                    setIsEditing(false);
                  }}
                  onCancel={() => setIsEditing(false)}
                  multiline
                />
              ) : (
                block.content.text || 'Paragraph text'
              )}
            </p>
          </div>
        );

      case 'image':
        const imageWidth = getDeviceProperty('width') || block.content.width || '100%';
        const imageHeight = getDeviceProperty('height') || block.content.height || 'auto';
        return (
          <div style={containerStyles} className={`${!shouldShow() ? 'opacity-50' : ''} relative`}>
            {block.content.url ? (
              <img
                src={block.content.url}
                alt={block.content.alt || ''}
                className="w-full h-auto"
                style={{
                  width: imageWidth,
                  height: imageHeight,
                  objectFit: block.content.objectFit || 'cover',
                }}
              />
            ) : (
              isEditMode && (
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Click to upload image</p>
                  </div>
                </div>
              )
            )}
            {isEditMode && isSelected && !isEditing && !block.is_absolute && (
              <ResizeHandles
                initialWidth={imageWidth}
                initialHeight={imageHeight}
                onResize={(width, height) => {
                  onUpdate?.({ width, height });
                }}
                minWidth={100}
                minHeight={100}
                showGrid={showGrid}
                gridSize={gridSize}
              />
            )}
          </div>
        );

      case 'button':
        const buttonWidth = getDeviceProperty('width') || '200px';
        const buttonHeight = getDeviceProperty('height') || 'auto';
        const buttonId = `button-${block.id}`;

        const hasHoverEffects = block.hover_background_color || block.hover_text_color ||
                                block.hover_border_color || block.hover_transform || block.hover_shadow;

        return (
          <>
            {hasHoverEffects && !isEditMode && (
              <style>
                {`
                  #${buttonId}:hover {
                    ${block.hover_background_color ? `background-color: ${block.hover_background_color} !important;` : ''}
                    ${block.hover_text_color ? `color: ${block.hover_text_color} !important;` : ''}
                    ${block.hover_border_color ? `border-color: ${block.hover_border_color} !important;` : ''}
                    ${block.hover_transform ? `transform: ${block.hover_transform} !important;` : ''}
                    ${block.hover_shadow ? `box-shadow: ${block.hover_shadow} !important;` : ''}
                  }
                `}
              </style>
            )}
            <div
              className="relative"
              style={{
                width: buttonWidth,
                height: buttonHeight,
              }}
            >
              <a
                id={buttonId}
                href={block.link_url || '#'}
                target={block.link_target}
                style={{
                  ...textStyles,
                  backgroundColor: getDeviceProperty('background_color'),
                  borderRadius: normalizeValue(getDeviceProperty('border_radius')),
                  borderWidth: normalizeValue(getDeviceProperty('border_width')),
                  borderColor: getDeviceProperty('border_color'),
                  borderStyle: getDeviceProperty('border_style') as any,
                  boxShadow: getDeviceProperty('shadow'),
                  padding: normalizeValue(getDeviceProperty('padding')) || '12px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                }}
                className={`font-medium ${
                  !shouldShow() ? 'opacity-50' : ''
                } ${isEditMode ? 'cursor-text' : 'cursor-pointer'}`}
                onClick={(e) => isEditMode && e.preventDefault()}
                onDoubleClick={() => isEditMode && setIsEditing(true)}
              >
                {isEditing && isEditMode ? (
                  <InlineTextEditor
                    initialValue={block.content.text || 'Button'}
                    onSave={(text) => {
                      onUpdate?.({ content: { ...block.content, text } });
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  block.content.text || 'Button'
                )}
              </a>
              {isEditMode && isSelected && !isEditing && !block.is_absolute && (
                <ResizeHandles
                  initialWidth={buttonWidth}
                  initialHeight={buttonHeight}
                  onResize={(width, height) => {
                    onUpdate?.({ width, height });
                  }}
                  minWidth={80}
                  minHeight={36}
                  showGrid={showGrid}
                  gridSize={gridSize}
                />
              )}
            </div>
          </>
        );

      case 'spacer':
        return (
          <div
            style={{
              ...containerStyles,
              height: block.content.height || '2rem',
            }}
            className={`${!shouldShow() ? 'opacity-50' : ''} ${isEditMode ? 'border border-dashed border-gray-300' : ''}`}
          />
        );

      case 'divider':
        return (
          <div style={containerStyles}>
            <hr
              style={{
                borderTopWidth: getDeviceProperty('border_width') || '1px',
                borderColor: getDeviceProperty('border_color') || '#e5e7eb',
                borderStyle: (getDeviceProperty('border_style') as any) || 'solid',
              }}
              className={`${!shouldShow() ? 'opacity-50' : ''}`}
            />
          </div>
        );

      case 'video':
        return (
          <div style={containerStyles} className={`${!shouldShow() ? 'opacity-50' : ''}`}>
            {block.content.url ? (
              <video
                src={block.content.url}
                controls
                className="w-full"
                poster={block.content.poster}
                style={{
                  width: block.content.width || '100%',
                  height: block.content.height || 'auto',
                }}
              />
            ) : (
              isEditMode && (
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">Click to upload video</p>
                  </div>
                </div>
              )
            )}
          </div>
        );

      default:
        return (
          <div style={containerStyles} className={`${!shouldShow() ? 'opacity-50' : ''}`}>
            {isEditMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Unknown block type: {block.block_type}
                </p>
              </div>
            )}
          </div>
        );
      }
    } catch (error) {
      console.error('Error rendering block content:', error);
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Error rendering block. Please refresh or delete this block.
          </p>
        </div>
      );
    }
  };

  const blockStyle = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const isTransparent = !block.background_color || block.background_color === 'transparent';
  const isTextBlock = block.block_type === 'heading' || block.block_type === 'paragraph';
  const showTransparentOutline = isEditMode && isTransparent && isTextBlock;

  const containerWidth = block.container_width || (block.is_absolute ? 'auto' : 'fit-content');

  const getAlignmentStyles = () => {
    const alignment = getDeviceProperty('alignment');
    if (block.block_type === 'button' && alignment) {
      return {
        display: 'flex',
        justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start'
      };
    }
    return {};
  };

  const blockContent = (
    <div
      ref={!block.is_absolute ? setNodeRef : undefined}
      data-block-id={block.id}
      style={{
        ...(!block.is_absolute ? blockStyle : {}),
        width: containerWidth,
        flexShrink: 0,
        ...getAlignmentStyles(),
      }}
      className={`builder-block relative group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${isEditMode ? 'hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer' : ''} ${showTransparentOutline ? 'outline outline-1 outline-dashed outline-gray-300' : ''}`}
      onClick={(e) => {
        if (isEditMode && !isEditing) {
          e.stopPropagation();
          onSelect?.();
        }
      }}
    >
      <div className="relative" style={{ width: block.width || 'auto', height: block.height || 'auto' }}>
        {renderBlockContent()}

        {isEditMode && isSelected && !isEditing && block.is_absolute && (
          <ResizeHandles
            initialWidth={block.width || '200px'}
            initialHeight={block.height || 'auto'}
            onResize={(width, height) => {
              onUpdate?.({ width, height });
            }}
            minWidth={80}
            minHeight={36}
            showGrid={showGrid}
            gridSize={gridSize}
          />
        )}
      </div>

      {isEditMode && (
        <div className="absolute -top-7 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {block.block_type.charAt(0).toUpperCase() + block.block_type.slice(1).replace('_', ' ')}
        </div>
      )}

      {isEditMode && isDraggable && !block.is_absolute && (
        <button
          {...attributes}
          {...listeners}
          className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-blue-600 z-10 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {hasDeviceOverride && isEditMode && currentDevice !== 'desktop' && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg z-10 whitespace-nowrap"
          title={`Custom ${currentDevice} styling applied`}
        >
          {currentDevice === 'tablet' ? '📱 Tablet' : '📱 Mobile'} Override
        </div>
      )}

      {isEditMode && onDuplicate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="absolute -top-2 right-6 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-green-600 z-10"
          title="Duplicate block"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}

      {isEditMode && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
          title="Delete block"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {isEditMode && isSelected && !isEditing && !block.is_absolute && (
        <ResizeHandles
          initialWidth={containerWidth}
          initialHeight="auto"
          onResize={(width, height) => {
            onUpdate?.({ container_width: width });
          }}
          minWidth={100}
          minHeight={0}
          showGrid={showGrid}
          gridSize={gridSize}
          enableVertical={false}
          enableHorizontal={true}
        />
      )}
    </div>
  );

  if (block.is_absolute && isEditMode) {
    const posX = getDeviceProperty('position_x') || 0;
    const posY = getDeviceProperty('position_y') || 0;

    return (
      <DraggableBlock
        blockId={block.id}
        positionX={posX}
        positionY={posY}
        width={block.width || 'auto'}
        height={block.height || 'auto'}
        zIndex={block.z_index || 0}
        isAbsolute={true}
        isSelected={isSelected}
        showGrid={showGrid}
        gridSize={gridSize}
        sectionBounds={sectionBounds}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onPositionChange={(x, y) => {
          if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
            console.error('Invalid position values:', { x, y });
            return;
          }

          if (currentDevice === 'desktop') {
            onUpdate?.({ position_x: x, position_y: y });
          } else {
            const devicePropsKey = currentDevice === 'tablet' ? 'tablet_properties' : 'mobile_properties';

            onUpdate?.((prevBlock) => {
              const currentDeviceProps = prevBlock?.[devicePropsKey] || block[devicePropsKey] || {};
              return {
                [devicePropsKey]: {
                  ...currentDeviceProps,
                  position_x: x,
                  position_y: y,
                }
              };
            });
          }
        }}
      >
        {blockContent}
      </DraggableBlock>
    );
  }

  return blockContent;
}
