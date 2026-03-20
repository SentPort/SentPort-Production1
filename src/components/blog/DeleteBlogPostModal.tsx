import { Trash2, AlertCircle, Info } from 'lucide-react';

interface DeleteBlogPostModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function DeleteBlogPostModal({ onConfirm, onCancel, isDeleting = false }: DeleteBlogPostModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/20 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>

          <h2 className="text-xl font-bold text-white text-center mb-2">
            Delete Post?
          </h2>

          <p className="text-gray-300 text-center mb-4">
            Are you sure you want to delete this post? This action cannot be undone.
          </p>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 mb-6">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-white mb-1">This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>The post content</li>
                  <li>All comments and reactions</li>
                  <li>All bookmarks and collections</li>
                  <li>All analytics and view history</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
