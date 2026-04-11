import React, { useState } from 'react';
import { X, Search, Type, Image, Video, MousePointer, Minus, Code, Grid3x3, Link as LinkIcon, Share2 } from 'lucide-react';
import { BlockType } from '../../types/builder';

interface BlockTemplate {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'text' | 'media' | 'buttons' | 'layout' | 'advanced';
  preview?: string;
}

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBlock: (blockType: BlockType) => void;
}

const blockTemplates: BlockTemplate[] = [
  {
    type: 'heading',
    label: 'Heading',
    description: 'Add a title or heading',
    icon: <Type className="w-6 h-6" />,
    category: 'text',
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Add body text',
    icon: <Type className="w-6 h-6" />,
    category: 'text',
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Upload or select an image',
    icon: <Image className="w-6 h-6" />,
    category: 'media',
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embed or upload a video',
    icon: <Video className="w-6 h-6" />,
    category: 'media',
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'Image gallery or carousel',
    icon: <Grid3x3 className="w-6 h-6" />,
    category: 'media',
  },
  {
    type: 'button',
    label: 'Button',
    description: 'Add a call-to-action button',
    icon: <MousePointer className="w-6 h-6" />,
    category: 'buttons',
  },
  {
    type: 'spacer',
    label: 'Spacer',
    description: 'Add vertical space',
    icon: <Minus className="w-6 h-6" />,
    category: 'layout',
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Add a horizontal line',
    icon: <Minus className="w-6 h-6" />,
    category: 'layout',
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Custom HTML/CSS/JS',
    icon: <Code className="w-6 h-6" />,
    category: 'advanced',
  },
  {
    type: 'social_links',
    label: 'Social Links',
    description: 'Social media icons',
    icon: <Share2 className="w-6 h-6" />,
    category: 'buttons',
  },
];

const categories = [
  { id: 'all', label: 'All Blocks' },
  { id: 'text', label: 'Text' },
  { id: 'media', label: 'Media' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'layout', label: 'Layout' },
  { id: 'advanced', label: 'Advanced' },
];

export default function AddBlockModal({ isOpen, onClose, onAddBlock }: AddBlockModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const filteredTemplates = blockTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full md:rounded-2xl md:max-w-4xl md:max-h-[90vh] overflow-hidden rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-3 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">Add Block</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors touch-manipulation p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search blocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                  selectedCategory === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.type}
                onClick={() => {
                  onAddBlock(template.type);
                  onClose();
                }}
                className="group flex md:flex-col items-center md:items-center p-4 md:p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left md:text-center touch-manipulation gap-4 md:gap-0"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center md:mb-3 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors flex-shrink-0">
                  <div className="text-blue-600">{template.icon}</div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 md:mb-1">{template.label}</h3>
                  <p className="text-xs text-gray-500">{template.description}</p>
                </div>
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No blocks found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
