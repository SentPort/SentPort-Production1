import { AlertTriangle } from 'lucide-react';

interface AdminDeleteWarningModalProps {
  postTitle: string;
  authorName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function AdminDeleteWarningModal({
  postTitle,
  authorName,
  onConfirm,
  onCancel,
  isDeleting
}: AdminDeleteWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">Admin Override: Delete Another User's Post</h3>
            <p className="text-slate-300 text-sm mb-4">
              You are about to delete a post that belongs to another user using admin privileges.
            </p>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 mb-6 space-y-2">
          <div>
            <span className="text-slate-400 text-sm">Post Title:</span>
            <p className="text-white font-medium">{postTitle}</p>
          </div>
          <div>
            <span className="text-slate-400 text-sm">Author:</span>
            <p className="text-white font-medium">{authorName}</p>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-6">
          <p className="text-orange-300 text-sm font-medium">
            ⚠️ This action cannot be undone. The post and all its comments will be permanently deleted.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isDeleting ? 'Deleting...' : 'Delete Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
