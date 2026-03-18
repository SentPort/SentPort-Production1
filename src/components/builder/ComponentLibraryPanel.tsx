import React, { useState, useEffect, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { supabase } from '../../lib/supabase';
import { ComponentTemplate, BuilderComponent } from '../../types/builder';
import { LayoutGrid as Layout, Type, Image, Video, MousePointer, Menu, FileText, Code, Box, Grid3x3, Columns2 as Columns, GripVertical, Search, Star } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

interface ComponentLibraryPanelProps {
  onAddComponent: (template: BuilderComponent) => void;
}

const categoryIcons: Record<string, any> = {
  layout: Layout,
  content: Type,
  navigation: Menu,
  forms: FileText,
  custom: Code,
};

export default function ComponentLibraryPanel({ onAddComponent }: ComponentLibraryPanelProps) {
  const [components, setComponents] = useState<ComponentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadComponents();
    const storedFavorites = localStorage.getItem('builder_component_favorites');
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
  }, []);

  async function loadComponents() {
    try {
      const { data, error } = await supabase
        .from('website_builder_component_library')
        .select('*')
        .eq('is_system', true)
        .order('component_name');

      if (error) throw error;
      setComponents(data || []);
    } catch (err) {
      console.error('Error loading components:', err);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { id: 'all', label: 'All Components' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'layout', label: 'Layout' },
    { id: 'content', label: 'Content' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'forms', label: 'Forms' },
    { id: 'custom', label: 'Custom' },
  ];

  const toggleFavorite = (componentId: string) => {
    const newFavorites = favorites.includes(componentId)
      ? favorites.filter(id => id !== componentId)
      : [...favorites, componentId];
    setFavorites(newFavorites);
    localStorage.setItem('builder_component_favorites', JSON.stringify(newFavorites));
  };

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const filteredComponents = useMemo(() => {
    return components.filter(c => {
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'favorites' && favorites.includes(c.id)) ||
        c.category === selectedCategory;

      const matchesSearch =
        debouncedSearchQuery === '' ||
        c.component_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [components, selectedCategory, favorites, debouncedSearchQuery]);

  return (
    <div className="w-64 lg:w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg hidden md:flex">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Components</h2>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading components...</p>
        ) : filteredComponents.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No components found</p>
        ) : (
          filteredComponents.map(component => (
            <ComponentCard
              key={component.id}
              component={component}
              isFavorite={favorites.includes(component.id)}
              onAdd={() => onAddComponent(component.template_data as BuilderComponent)}
              onToggleFavorite={() => toggleFavorite(component.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ComponentCard({
  component,
  isFavorite,
  onAdd,
  onToggleFavorite,
}: {
  component: ComponentTemplate;
  isFavorite: boolean;
  onAdd: () => void;
  onToggleFavorite: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${component.id}`,
    data: {
      type: 'new-component',
      component: component.template_data,
    },
  });

  const Icon = getComponentIcon(component.component_type);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={`relative transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <button
        onClick={onAdd}
        className="w-full p-4 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-blue-100 border-2 border-gray-200 hover:border-blue-300 rounded-xl transition-all hover:shadow-lg text-left group relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-0 group-hover:opacity-5 rounded-full blur-2xl transition-opacity"></div>

        <div className="flex items-start gap-3 relative z-10">
          <div className="p-2.5 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-all group-hover:scale-110">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
              {component.component_name}
            </h3>
            <p className="text-xs text-gray-600 capitalize">{component.category}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-1.5 rounded transition-all ${
              isFavorite
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-gray-300 hover:text-yellow-500'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <div
            {...listeners}
            className="p-1.5 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
            title="Drag to canvas"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Click to add or drag to canvas
        </div>
      </button>
    </div>
  );
}

function getComponentIcon(type: string) {
  const icons: Record<string, any> = {
    section: Box,
    container: Box,
    columns: Columns,
    grid: Grid3x3,
    heading: Type,
    text: Type,
    image: Image,
    video: Video,
    button: MousePointer,
    spacer: Box,
    navbar: Menu,
    footer: Menu,
    form: FileText,
    input: FileText,
    custom_code: Code,
  };
  return icons[type] || Box;
}
