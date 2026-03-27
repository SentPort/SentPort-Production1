import React from 'react';
import { AlertCircle } from 'lucide-react';

interface LivePageBannerProps {
  pageTitle: string;
  onPublishEdit: () => void;
}

export default function LivePageBanner({ pageTitle, onPublishEdit }: LivePageBannerProps) {
  return (
    <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-900">
              You are editing a published page
            </p>
            <p className="text-xs text-orange-700">
              Changes to "{pageTitle}" are not live until you publish them
            </p>
          </div>
        </div>
        <button
          onClick={onPublishEdit}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          Publish Edits
        </button>
      </div>
    </div>
  );
}
