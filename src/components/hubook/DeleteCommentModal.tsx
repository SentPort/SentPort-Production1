import { Trash2, AlertCircle } from 'lucide-react';

interface DeleteCommentModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  platform?: string;
}

export default function DeleteCommentModal({ onConfirm, onCancel, platform }: DeleteCommentModalProps) {
  const isHeddit = platform === 'heddit';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Delete Comment?
          </h2>

          <p className="text-gray-600 text-center mb-4">
            Are you sure you want to delete this comment? This action cannot be undone.
          </p>

          {isHeddit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-left">
              <p className="text-sm text-yellow-800 font-medium mb-1">
                Karma Impact:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• You will lose 5 karma for deleting this comment</li>
                <li>• Any replies under this comment will also be deleted</li>
                <li>• Users who replied will lose karma for their deleted replies</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
