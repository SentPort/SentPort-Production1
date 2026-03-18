import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({ count, onConfirm, onCancel }: DeleteConfirmationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-900 mb-2">
            Are you sure you want to permanently delete{' '}
            <span className="font-bold text-red-600">
              {count} review{count !== 1 ? 's' : ''}
            </span>?
          </p>
          <p className="text-gray-600 text-sm">
            This action cannot be undone. All associated tags will also be removed from {count !== 1 ? 'these reviews' : 'this review'}.
          </p>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 rounded-b-lg flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete {count !== 1 ? 'Reviews' : 'Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
