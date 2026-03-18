import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeleteCommunityModalProps {
  communityId: string;
  communityName: string;
  postCount: number;
  memberCount: number;
  moderatorCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteCommunityModal({
  communityId,
  communityName,
  postCount,
  memberCount,
  moderatorCount,
  onClose,
  onSuccess
}: DeleteCommunityModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmText !== communityName) {
      setError('Community name does not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: deleteError } = await supabase.rpc('delete_heddit_community', {
        community_id: communityId
      });

      if (deleteError) {
        throw deleteError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error deleting community:', err);
      setError(err.message || 'Failed to delete community. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Delete Community</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {moderatorCount > 1 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                Cannot Delete Community
              </p>
              <p className="text-sm text-yellow-700">
                This community has {moderatorCount} moderators. All other moderators must voluntarily leave before the community can be deleted.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                This requirement ensures that no single moderator can unilaterally destroy a community. Deletion requires consensus.
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                Warning: This action cannot be undone!
              </p>
              <p className="text-sm text-red-700">
                Deleting this community will permanently remove:
              </p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                <li>{postCount} post{postCount !== 1 ? 's' : ''}</li>
                <li>{memberCount} member{memberCount !== 1 ? 's' : ''}</li>
                <li>All comments and votes</li>
                <li>All community settings and moderators</li>
                <li>All topics and custom tags</li>
              </ul>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                <p className="text-sm text-yellow-900 font-medium mb-1">
                  Karma Impact:
                </p>
                <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                  <li>You will lose 50 karma for deleting this community</li>
                  <li>All users who posted in this community will lose karma for their deleted posts (15 karma each)</li>
                  <li>All users who commented will lose karma for their deleted comments (5 karma each)</li>
                </ul>
                <p className="text-xs text-yellow-700 mt-2">
                  This prevents karma gaming through create/delete cycles and affects everyone who contributed.
                </p>
              </div>
            </div>
          )}

          {moderatorCount === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To confirm deletion, type the community name:{' '}
                <span className="font-bold text-gray-900">h/{communityName}</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type: ${communityName}`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            {moderatorCount > 1 ? 'Close' : 'Cancel'}
          </button>
          {moderatorCount === 1 && (
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== communityName}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Community'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
