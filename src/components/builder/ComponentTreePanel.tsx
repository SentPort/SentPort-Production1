import React, { useState } from 'react';
import { BuilderComponent } from '../../types/builder';
import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2, GripVertical } from 'lucide-react';

interface ComponentTreePanelProps {
  components: BuilderComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
}

interface TreeNodeProps {
  component: BuilderComponent;
  level: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function TreeNode({ component, level, isSelected, onSelect, onDelete }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = component.children && component.children.length > 0;

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(component.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        <GripVertical className="w-4 h-4 text-gray-400" />

        <span className="flex-1 text-sm font-medium capitalize">
          {component.type}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(component.id);
          }}
          className="p-1 hover:bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {component.children!.map((child) => (
            <TreeNode
              key={child.id}
              component={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComponentTreePanel({
  components,
  selectedComponentId,
  onSelectComponent,
  onDeleteComponent,
}: ComponentTreePanelProps) {
  return (
    <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Component Tree</h3>
        <p className="text-xs text-gray-500 mt-1">
          Click to select, drag to reorder
        </p>
      </div>

      <div className="py-2">
        {components.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No components yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add components from the library
            </p>
          </div>
        ) : (
          components.map((component) => (
            <div key={component.id} className="group">
              <TreeNode
                component={component}
                level={0}
                isSelected={component.id === selectedComponentId}
                onSelect={onSelectComponent}
                onDelete={onDeleteComponent}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
