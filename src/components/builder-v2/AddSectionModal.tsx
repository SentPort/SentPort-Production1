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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add Section</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
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

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.type}
                onClick={() => {
                  onAddSection(template.type);
                  onClose();
                }}
                className="group flex flex-col items-center p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                  <div className="text-blue-600">{template.icon}</div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{template.label}</h3>
                <p className="text-xs text-gray-500">{template.description}</p>
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
