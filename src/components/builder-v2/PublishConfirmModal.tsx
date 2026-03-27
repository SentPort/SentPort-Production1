import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  variant: 'publishAll' | 'unpublishAll' | 'publishPage' | 'unpublishPage' | 'publishEdit';
  pageTitle?: string;
  pageCount?: number;
  loading?: boolean;
}

export default function PublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  variant,
  pageTitle,
  pageCount = 0,
  loading = false,
}: PublishConfirmModalProps) {
  if (!isOpen) return null;

  const getModalContent = () => {
    switch (variant) {
      case 'publishAll':
        return {
          title: 'Publish All Pages',
          icon: <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />,
          description: `You are about to publish ${pageCount} page${pageCount !== 1 ? 's' : ''} to your live site.`,
          details: [
            'All pages will become publicly accessible',
            'Your subdomain will be activated',
            'Visitors can browse your entire site',
          ],
          confirmText: 'Publish All',
          confirmClass: 'bg-green-600 hover:bg-green-700',
        };

      case 'unpublishAll':
        return {
          title: 'Unpublish All Pages',
          icon: <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-4" />,
          description: 'You are about to unpublish your homepage and all secondary pages.',
          details: [
            'Your entire site will go offline',
            'All pages will return to draft status',
            'Visitors will see a "Site not found" message',
            'You can republish at any time',
          ],
          confirmText: 'Unpublish All',
          confirmClass: 'bg-orange-600 hover:bg-orange-700',
        };

      case 'publishPage':
        return {
          title: 'Publish Page',
          icon: <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />,
          description: `You are about to publish "${pageTitle}" to your live site.`,
          details: [
            'This page will become publicly accessible',
            'Visitors can view this page at its URL path',
            'The page will appear in your site navigation',
          ],
          confirmText: 'Publish Page',
          confirmClass: 'bg-blue-600 hover:bg-blue-700',
        };

      case 'unpublishPage':
        return {
          title: 'Unpublish Page',
          icon: <AlertTriangle className="w-12 h-12 text-orange-600 mx-auto mb-4" />,
          description: `You are about to unpublish "${pageTitle}".`,
          details: [
            'This page will go offline',
            'The page will return to draft status',
            'Visitors will see a "Page not found" error',
            'You can republish this page at any time',
          ],
          confirmText: 'Unpublish Page',
          confirmClass: 'bg-orange-600 hover:bg-orange-700',
        };

      case 'publishEdit':
        return {
          title: 'Publish Edits',
          icon: <CheckCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />,
          description: `You are about to publish your edits to "${pageTitle}".`,
          details: [
            'Your changes will go live immediately',
            'The published page will be updated',
            'The page will remain published',
          ],
          confirmText: 'Publish Edits',
          confirmClass: 'bg-blue-600 hover:bg-blue-700',
        };

      default:
        return {
          title: 'Confirm Action',
          icon: <CheckCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />,
          description: 'Confirm this action',
          details: [],
          confirmText: 'Confirm',
          confirmClass: 'bg-gray-600 hover:bg-gray-700',
        };
    }
  };

  const content = getModalContent();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-end mb-2">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {content.icon}

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            {content.title}
          </h2>

          <p className="text-gray-600 text-center mb-4">
            {content.description}
          </p>

          {content.details.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <ul className="space-y-2">
                {content.details.map((detail, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-700">
                    <span className="text-gray-400 mr-2">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${content.confirmClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={loading}
            >
              {loading ? 'Processing...' : content.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
