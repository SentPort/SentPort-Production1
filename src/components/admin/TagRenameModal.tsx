import { useState } from 'react';
import { X, CreditCard as Edit3, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
}

interface TagRenameModalProps {
  tag: Tag;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TagRenameModal({ tag, onClose, onSuccess }: TagRenameModalProps) {
  const [newDisplayName, setNewDisplayName] = useState(tag.display_name);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRename = async () => {
    if (!newDisplayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    if (newDisplayName.trim() === tag.display_name) {
      setError('New display name must be different from current name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: renameError } = await supabase.rpc('rename_heddit_tag', {
        p_tag_id: tag.id,
        p_new_display_name: newDisplayName.trim(),
        p_renamed_by: user.id,
        p_reason: reason || null
      });

      if (renameError) throw renameError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="bg-blue-600 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Rename Tag</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Current Tag</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="font-medium text-gray-900">{tag.display_name}</div>
              <div className="text-sm text-gray-600 mt-1">
                {tag.usage_count} total uses
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Enter new display name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-600">
              This will update how the tag is displayed across all of Heddit
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you renaming this tag? (e.g., fixing typo, improving clarity)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">What will happen:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>The display name will be updated immediately</li>
                <li>The tag will keep its usage history</li>
                <li>If this tag was flagged for "Needs Rename", the flag will be automatically resolved</li>
                <li>All {tag.usage_count} existing uses will show the new name</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Renaming...' : 'Rename Tag'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
