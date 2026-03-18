import { useState } from 'react';
import { X, AlertTriangle, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
  post_usage_count: number;
  subreddit_usage_count: number;
}

interface TagBanModalProps {
  tag: Tag;
  onClose: () => void;
  onSuccess: () => void;
}

const BAN_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'spam_abuse', label: 'Spam/Abuse' },
  { value: 'misleading', label: 'Misleading Information' },
  { value: 'policy_violation', label: 'Policy Violation' },
  { value: 'duplicate', label: 'Duplicate (should be merged instead)' },
  { value: 'other', label: 'Other' }
];

export default function TagBanModal({ tag, onClose, onSuccess }: TagBanModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBan = async () => {
    if (!selectedReason) {
      setError('Please select a reason for banning this tag');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      setError('Please provide a custom reason');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const reason = selectedReason === 'other'
        ? customReason
        : BAN_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      const { error: banError } = await supabase.rpc('ban_heddit_tag', {
        p_tag_id: tag.id,
        p_banned_by: user.id,
        p_reason: reason
      });

      if (banError) throw banError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to ban tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="bg-red-600 text-white p-6 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ban className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Ban Tag</h2>
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
            <h3 className="font-semibold text-gray-900 mb-2">Tag to Ban</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="font-medium text-gray-900">{tag.display_name}</div>
              <div className="text-sm text-gray-600 mt-1">
                Currently used in {tag.post_usage_count} posts and {tag.subreddit_usage_count} subreddits
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Warning</h4>
                <p className="text-sm text-yellow-800">
                  Banning this tag will completely hide it from all users. It will remain in existing posts and subreddits but will not be visible or searchable. Users will not be able to add this tag to new content.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Ban <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              {BAN_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'other' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please explain why you are banning this tag..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          )}

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
              onClick={handleBan}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Banning...' : 'Ban Tag'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
