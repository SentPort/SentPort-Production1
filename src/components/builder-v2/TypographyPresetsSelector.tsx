import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TypographyPreset {
  id: string;
  preset_name: string;
  font_family: string;
  font_size: string;
  font_weight: string;
  line_height: string;
  letter_spacing: string;
  font_style: string;
  category: string;
  block_type: string;
  description: string;
  is_system: boolean;
}

interface TypographyPresetsSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: TypographyPreset) => void;
  currentBlockType: 'heading' | 'paragraph';
  currentPresetId?: string;
}

const categories = [
  { id: 'all', label: 'All Presets', color: 'gray' },
  { id: 'modern', label: 'Modern', color: 'blue' },
  { id: 'classic', label: 'Classic', color: 'amber' },
  { id: 'tech', label: 'Tech', color: 'cyan' },
  { id: 'creative', label: 'Creative', color: 'purple' },
  { id: 'professional', label: 'Professional', color: 'green' },
];

export default function TypographyPresetsSelector({
  isOpen,
  onClose,
  onSelectPreset,
  currentBlockType,
  currentPresetId,
}: TypographyPresetsSelectorProps) {
  const [presets, setPresets] = useState<TypographyPreset[]>([]);
  const [filteredPresets, setFilteredPresets] = useState<TypographyPreset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen]);

  useEffect(() => {
    filterPresets();
  }, [presets, selectedCategory, searchQuery, currentBlockType]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('builder_typography_presets')
        .select('*')
        .order('category', { ascending: true })
        .order('preset_name', { ascending: true });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPresets = () => {
    let filtered = presets.filter(preset => preset.block_type === currentBlockType);

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(preset => preset.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        preset =>
          preset.preset_name.toLowerCase().includes(query) ||
          preset.description?.toLowerCase().includes(query) ||
          preset.font_family.toLowerCase().includes(query)
      );
    }

    setFilteredPresets(filtered);
  };

  const handlePresetClick = (preset: TypographyPreset) => {
    onSelectPreset(preset);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Typography Presets</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose a preset for your {currentBlockType}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? `bg-${category.color}-100 text-${category.color}-700 border-2 border-${category.color}-500`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPresets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p className="text-lg font-medium">No presets found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset)}
                  className={`group relative p-4 border-2 rounded-lg text-left transition-all hover:shadow-lg ${
                    currentPresetId === preset.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  {currentPresetId === preset.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{preset.preset_name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{preset.description}</p>
                  </div>

                  <div
                    className="mb-2 p-3 bg-gray-50 rounded border border-gray-200"
                    style={{
                      fontFamily: preset.font_family,
                      fontSize: currentBlockType === 'heading' ? '20px' : '14px',
                      fontWeight: preset.font_weight,
                      lineHeight: preset.line_height,
                      letterSpacing: preset.letter_spacing,
                      fontStyle: preset.font_style,
                    }}
                  >
                    {currentBlockType === 'heading'
                      ? 'The Quick Brown Fox'
                      : 'The quick brown fox jumps over the lazy dog'}
                  </div>

                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Font:</span>
                      <span className="font-medium text-gray-700">
                        {preset.font_family.split(',')[0]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span className="font-medium text-gray-700">{preset.font_size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weight:</span>
                      <span className="font-medium text-gray-700">{preset.font_weight}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
