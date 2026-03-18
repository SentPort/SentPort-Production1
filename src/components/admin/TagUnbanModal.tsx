import { useState } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  ban_reason?: string;
  banned_at?: string;
}

interface TagUnbanModalProps {
  tag: Tag;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TagUnbanModal({ tag, onClose, onSuccess }: TagUnbanModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnban = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for unbanning this tag');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: unbanError } = await supabase.rpc('unban_heddit_tag', {
        p_tag_id: tag.id,
        p_unbanned_by: user.id,
        p_reason: reason.trim()
      });

      if (unbanError) throw unbanError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to unban tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="bg-green-600 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Unban Tag</h2>
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
            <h3 className="font-semibold text-gray-900 mb-2">Tag to Unban</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="font-medium text-gray-900">{tag.display_name}</div>
              {tag.ban_reason && (
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Ban reason:</span> {tag.ban_reason}
                </div>
              )}
              {tag.banned_at && (
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Banned:</span> {new Date(tag.banned_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">What will happen:</h4>
              <ul className="space-y-1 text-sm text-green-800">
                <li>This tag will be made visible and searchable again</li>
                <li>Users will be able to add this tag to new posts and subreddits</li>
                <li>The tag will appear in autocomplete suggestions</li>
                <li>Ban history will be preserved for audit purposes</li>
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Unbanning <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you unbanning this tag?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
              autoFocus
            />
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
              onClick={handleUnban}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Unbanning...' : 'Unban Tag'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
