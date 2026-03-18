import React, { useState, memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { BuilderComponent, BuilderTheme } from '../../types/builder';
import { Pencil, GripVertical, Copy, Trash2 } from 'lucide-react';
import ResizeHandle from './ResizeHandle';

interface ComponentRendererProps {
  component: BuilderComponent;
  isSelected: boolean;
  theme: BuilderTheme;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BuilderComponent>) => void;
  index?: number;
  parentId?: string;
}

const ComponentRenderer = memo(function ComponentRenderer({
  component,
  isSelected,
  theme,
  onSelect,
  onUpdate,
  index = 0,
  parentId = 'canvas-root',
}: ComponentRendererProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isContainer = ['section', 'container', 'columns', 'grid'].includes(component.type);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: component.id,
    data: {
      type: 'existing-component',
      component,
      index,
      parentId,
    },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${component.id}`,
    data: {
      type: 'component-container',
      componentId: component.id,
      accepts: isContainer ? ['section', 'container', 'heading', 'text', 'image', 'button', 'form', 'custom_code'] : [],
    },
    disabled: !isContainer,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(component.id);
  };

  const renderComponent = () => {
    const styles = component.styles || {};
    const props = component.props || {};

    switch (component.type) {
      case 'section':
        return (
          <section
            ref={setDropRef}
            style={styles}
            className={`relative min-h-[100px] ${isOver ? 'bg-blue-50' : ''}`}
          >
            {(!component.children || component.children.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg m-2">
                <span className="text-gray-400 text-sm">Drop components here</span>
              </div>
            )}
            {component.children?.map((child, idx) => (
              <ComponentRenderer
                key={child.id}
                component={child}
                isSelected={false}
                theme={theme}
                onSelect={onSelect}
                onUpdate={onUpdate}
                index={idx}
                parentId={component.id}
              />
            ))}
            {isOver && component.children && component.children.length > 0 && (
              <div className="h-16 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg m-2 flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">Drop here</span>
              </div>
            )}
          </section>
        );

      case 'container':
        return (
          <div
            ref={setDropRef}
            style={styles}
            className={`container relative min-h-[80px] ${isOver ? 'bg-blue-50' : ''}`}
          >
            {(!component.children || component.children.length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg m-2">
                <span className="text-gray-400 text-sm">Drop components here</span>
              </div>
            )}
            {component.children?.map((child, idx) => (
              <ComponentRenderer
                key={child.id}
                component={child}
                isSelected={false}
                theme={theme}
                onSelect={onSelect}
                onUpdate={onUpdate}
                index={idx}
                parentId={component.id}
              />
            ))}
            {isOver && component.children && component.children.length > 0 && (
              <div className="h-16 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg m-2 flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">Drop here</span>
              </div>
            )}
          </div>
        );

      case 'columns':
        const columnCount = props.columns || 2;
        return (
          <div
            ref={setDropRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
              gap: '1rem',
              ...styles,
            }}
            className={`relative min-h-[100px] ${isOver ? 'bg-blue-50' : ''}`}
          >
            {(!component.children || component.children.length === 0) && (
              <div className="col-span-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-8">
                <span className="text-gray-400 text-sm">Drop components into columns</span>
              </div>
            )}
            {component.children?.map((child, idx) => (
              <div key={child.id} className="border-2 border-dashed border-gray-200 rounded-lg p-2 min-h-[60px]">
                <ComponentRenderer
                  component={child}
                  isSelected={false}
                  theme={theme}
                  onSelect={onSelect}
                  onUpdate={onUpdate}
                  index={idx}
                  parentId={component.id}
                />
              </div>
            ))}
          </div>
        );

      case 'grid':
        const gridColumns = props.columns || 3;
        return (
          <div
            ref={setDropRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
              gap: '1rem',
              ...styles,
            }}
            className={`relative min-h-[100px] ${isOver ? 'bg-blue-50' : ''}`}
          >
            {(!component.children || component.children.length === 0) && (
              <div className="col-span-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg p-8">
                <span className="text-gray-400 text-sm">Drop components into grid</span>
              </div>
            )}
            {component.children?.map((child, idx) => (
              <ComponentRenderer
                key={child.id}
                component={child}
                isSelected={false}
                theme={theme}
                onSelect={onSelect}
                onUpdate={onUpdate}
                index={idx}
                parentId={component.id}
              />
            ))}
          </div>
        );

      case 'heading':
        const HeadingTag = `h${props.level || 1}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag
            style={{
              fontFamily: theme.font_family_heading,
              ...styles,
            }}
            onClick={() => setIsEditing(true)}
          >
            {isEditing ? (
              <input
                type="text"
                value={props.text || ''}
                onChange={e =>
                  onUpdate(component.id, {
                    props: { ...props, text: e.target.value },
                  })
                }
                onBlur={() => setIsEditing(false)}
                autoFocus
                className="w-full bg-transparent border-none outline-none"
              />
            ) : (
              <>
                {props.text || 'Click to edit heading'}
                {!isEditing && isHovered && (
                  <Pencil className="inline-block ml-2 w-4 h-4 opacity-50" />
                )}
              </>
            )}
          </HeadingTag>
        );

      case 'text':
        return (
          <div
            style={styles}
            dangerouslySetInnerHTML={{ __html: props.content || '<p>Click to edit text</p>' }}
            onClick={() => setIsEditing(true)}
          />
        );

      case 'image':
        return (
          <img
            src={props.src || 'https://via.placeholder.com/800x400?text=Click+to+add+image'}
            alt={props.alt || 'Image'}
            style={styles}
            className="max-w-full h-auto"
          />
        );

      case 'video':
        return (
          <video
            src={props.src}
            controls
            style={styles}
            className="max-w-full h-auto"
          />
        );

      case 'button':
        return (
          <a
            href={props.url || '#'}
            style={styles}
            className="inline-block text-center cursor-pointer px-6 py-3 rounded-lg"
          >
            {props.text || 'Button'}
          </a>
        );

      case 'spacer':
        return <div style={{ height: props.height || '2rem' }} className="bg-gray-100 border border-dashed border-gray-300" />;

      case 'navbar':
        return (
          <nav style={styles} className="flex items-center justify-between p-4">
            <div className="font-bold text-xl">{props.brand || 'Site Name'}</div>
            <div className="flex gap-4">
              {(props.links || []).map((link: any, idx: number) => (
                <a key={idx} href={link.url} className="hover:underline">
                  {link.text}
                </a>
              ))}
            </div>
          </nav>
        );

      case 'footer':
        return (
          <footer style={styles} className="p-4">
            {props.content || '© 2026 Your Site'}
          </footer>
        );

      case 'form':
        return (
          <form style={styles} className="space-y-4">
            {(props.fields || []).map((field: any, idx: number) => (
              <div key={idx}>
                <label className="block text-sm font-medium mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                  />
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {props.submitText || 'Submit'}
            </button>
          </form>
        );

      case 'input':
        return (
          <div style={styles}>
            <label className="block text-sm font-medium mb-1">
              {props.label || 'Label'}
            </label>
            <input
              type={props.inputType || 'text'}
              placeholder={props.placeholder}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        );

      case 'custom_code':
        return (
          <div style={styles}>
            <style>{props.css || ''}</style>
            <div dangerouslySetInnerHTML={{ __html: props.html || '<p>Custom HTML goes here</p>' }} />
          </div>
        );

      default:
        return (
          <div style={styles} className="p-4 bg-gray-100 border border-gray-300 rounded">
            Unknown component type: {component.type}
          </div>
        );
    }
  };

  const styles = component.styles || {};
  const padding = styles.padding || '0px';
  const margin = styles.margin || '0px';
  const showSpacingGuides = isSelected && isContainer;

  const handleResize = (width: string, height: string) => {
    onUpdate(component.id, {
      styles: {
        ...component.styles,
        width,
        height,
      },
    });
  };

  return (
    <div
      ref={setDragRef}
      {...attributes}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative group transition-all
        ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'}
        ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''}
        ${isHovered && !isSelected ? 'ring-2 ring-blue-300 ring-offset-1' : ''}
        ${isContainer ? 'border-2 border-dashed border-gray-300' : ''}
      `}
      style={{
        outline: isContainer && (isHovered || isSelected) ? '2px solid rgba(59, 130, 246, 0.5)' : 'none',
        outlineOffset: '4px',
      }}
    >
      {(isHovered || isSelected) && (
        <div className="absolute -top-8 left-0 z-50 flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-t-lg text-xs font-medium shadow-lg">
          <span className="capitalize">{component.type}</span>
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-blue-700 rounded"
          >
            <GripVertical className="w-3 h-3" />
          </div>
        </div>
      )}

      {showSpacingGuides && padding !== '0px' && (
        <div className="absolute inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 border-2 border-green-400 border-dashed opacity-50" />
          <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
            P: {padding}
          </div>
        </div>
      )}

      {showSpacingGuides && margin !== '0px' && (
        <div className="absolute -inset-2 pointer-events-none z-40">
          <div className="absolute inset-0 border-2 border-orange-400 border-dashed opacity-50" />
          <div className="absolute -top-5 left-0 bg-orange-500 text-white text-xs px-1 rounded">
            M: {margin}
          </div>
        </div>
      )}

      {isSelected && isContainer && (
        <ResizeHandle
          onResize={handleResize}
          currentWidth={styles.width}
          currentHeight={styles.height}
        />
      )}

      {renderComponent()}
    </div>
  );
});

export default ComponentRenderer;
