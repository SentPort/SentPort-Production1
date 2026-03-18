import React, { useState } from 'react';
import { BuilderComponent } from '../../types/builder';
import { Trash2, Settings } from 'lucide-react';

interface PropertiesPanelProps {
  selectedComponent: BuilderComponent | null;
  onUpdateComponent: (id: string, updates: Partial<BuilderComponent>) => void;
  onDeleteComponent: (id: string) => void;
}

export default function PropertiesPanel({
  selectedComponent,
  onUpdateComponent,
  onDeleteComponent,
}: PropertiesPanelProps) {
  if (!selectedComponent) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-center text-gray-500 py-12">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Select a component to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
          <button
            onClick={() => onDeleteComponent(selectedComponent.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Component"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 capitalize">{selectedComponent.type} Component</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <ComponentProperties
          component={selectedComponent}
          onUpdate={onUpdateComponent}
        />

        <StyleProperties
          component={selectedComponent}
          onUpdate={onUpdateComponent}
        />
      </div>
    </div>
  );
}

function ComponentProperties({
  component,
  onUpdate,
}: {
  component: BuilderComponent;
  onUpdate: (id: string, updates: Partial<BuilderComponent>) => void;
}) {
  const props = component.props || {};

  const handlePropChange = (key: string, value: any) => {
    onUpdate(component.id, {
      props: { ...props, [key]: value },
    });
  };

  switch (component.type) {
    case 'heading':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heading Text
            </label>
            <input
              type="text"
              value={props.text || ''}
              onChange={e => handlePropChange('text', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heading Level
            </label>
            <select
              value={props.level || 1}
              onChange={e => handlePropChange('level', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>
                  H{level}
                </option>
              ))}
            </select>
          </div>
        </div>
      );

    case 'text':
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <textarea
            value={props.content || ''}
            onChange={e => handlePropChange('content', e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Enter HTML content..."
          />
          <p className="text-xs text-gray-500 mt-1">Supports HTML tags</p>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="url"
              value={props.src || ''}
              onChange={e => handlePropChange('src', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Text
            </label>
            <input
              type="text"
              value={props.alt || ''}
              onChange={e => handlePropChange('alt', e.target.value)}
              placeholder="Image description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={props.text || ''}
              onChange={e => handlePropChange('text', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link URL
            </label>
            <input
              type="url"
              value={props.url || ''}
              onChange={e => handlePropChange('url', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      );

    case 'custom_code':
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HTML
            </label>
            <textarea
              value={props.html || ''}
              onChange={e => handlePropChange('html', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="<div>Your HTML here</div>"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSS
            </label>
            <textarea
              value={props.css || ''}
              onChange={e => handlePropChange('css', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder=".my-class { color: red; }"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JavaScript
            </label>
            <textarea
              value={props.javascript || ''}
              onChange={e => handlePropChange('javascript', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="console.log('Hello');"
            />
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-gray-500">No specific properties for this component</p>;
  }
}

function StyleProperties({
  component,
  onUpdate,
}: {
  component: BuilderComponent;
  onUpdate: (id: string, updates: Partial<BuilderComponent>) => void;
}) {
  const styles = component.styles || {};

  const handleStyleChange = (key: string, value: string) => {
    onUpdate(component.id, {
      styles: { ...styles, [key]: value },
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
        Styling
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Background
          </label>
          <input
            type="color"
            value={styles.backgroundColor || '#ffffff'}
            onChange={e => handleStyleChange('backgroundColor', e.target.value)}
            className="w-full h-10 rounded border border-gray-300 cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Text Color
          </label>
          <input
            type="color"
            value={styles.color || '#000000'}
            onChange={e => handleStyleChange('color', e.target.value)}
            className="w-full h-10 rounded border border-gray-300 cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Padding
        </label>
        <input
          type="text"
          value={styles.padding || ''}
          onChange={e => handleStyleChange('padding', e.target.value)}
          placeholder="e.g., 1rem or 16px"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Margin
        </label>
        <input
          type="text"
          value={styles.margin || ''}
          onChange={e => handleStyleChange('margin', e.target.value)}
          placeholder="e.g., 1rem or 16px"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Font Size
        </label>
        <input
          type="text"
          value={styles.fontSize || ''}
          onChange={e => handleStyleChange('fontSize', e.target.value)}
          placeholder="e.g., 1rem or 16px"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Border Radius
        </label>
        <input
          type="text"
          value={styles.borderRadius || ''}
          onChange={e => handleStyleChange('borderRadius', e.target.value)}
          placeholder="e.g., 0.5rem or 8px"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}
