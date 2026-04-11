import React, { useState } from 'react';
import { X, Search, LayoutGrid as Layout, Star, Award, Users, DollarSign, Mail, MessageSquare } from 'lucide-react';
import { SectionType } from '../../types/builder';

interface SectionTemplate {
  type: SectionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  preview?: string;
}

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (sectionType: SectionType) => void;
}

const sectionTemplates: SectionTemplate[] = [
  {
    type: 'hero',
    label: 'Hero Section',
    description: 'Eye-catching header with title and CTA',
    icon: <Star className="w-6 h-6" />,
  },
  {
    type: 'features',
    label: 'Features',
    description: 'Showcase product features',
    icon: <Layout className="w-6 h-6" />,
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Customer reviews and quotes',
    icon: <MessageSquare className="w-6 h-6" />,
  },
  {
    type: 'pricing',
    label: 'Pricing',
    description: 'Pricing tables and plans',
    icon: <DollarSign className="w-6 h-6" />,
  },
  {
    type: 'team',
    label: 'Team',
    description: 'Team member profiles',
    icon: <Users className="w-6 h-6" />,
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'Photo or project gallery',
    icon: <Layout className="w-6 h-6" />,
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Contact form and info',
    icon: <Mail className="w-6 h-6" />,
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Drive conversions with CTAs',
    icon: <Award className="w-6 h-6" />,
  },
  {
    type: 'custom',
    label: 'Blank Section',
    description: 'Start from scratch',
    icon: <Layout className="w-6 h-6" />,
  },
];

export default function AddSectionModal({ isOpen, onClose, onAddSection }: AddSectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredTemplates = sectionTemplates.filter((template) =>
    template.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">Add Section</h2>
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
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.type}
                onClick={() => {
                  onAddSection(template.type);
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
              <p className="text-gray-500">No sections found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
