import { useState } from 'react';
import { X, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
  post_usage_count: number;
  subreddit_usage_count: number;
}

interface TagMergeModalProps {
  sourceTags: Tag[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TagMergeModal({ sourceTags, onClose, onSuccess }: TagMergeModalProps) {
  const [targetTag, setTargetTag] = useState<Tag | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const totalUsage = sourceTags.reduce((sum, tag) => sum + tag.usage_count, 0);
  const totalPosts = sourceTags.reduce((sum, tag) => sum + tag.post_usage_count, 0);
  const totalSubreddits = sourceTags.reduce((sum, tag) => sum + tag.subreddit_usage_count, 0);

  const handleMerge = async () => {
    if (!targetTag) {
      setError('Please select a target tag');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const sourceTagIds = sourceTags.filter(t => t.id !== targetTag.id).map(t => t.id);

      const { data, error: mergeError } = await supabase.rpc('merge_heddit_tags', {
        p_source_tag_ids: sourceTagIds,
        p_target_tag_id: targetTag.id,
        p_merged_by: user.id,
        p_reason: reason || null
      });

      if (mergeError) throw mergeError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to merge tags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Merge Tags</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Source Tags</h3>
                <p className="text-sm text-gray-600 mb-4">
                  These tags will be merged into the target tag and then deleted.
                </p>
                <div className="space-y-2">
                  {sourceTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{tag.display_name}</div>
                          <div className="text-sm text-gray-600">
                            {tag.usage_count} uses ({tag.post_usage_count} posts, {tag.subreddit_usage_count} subreddits)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Target Tag
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  All source tags will be merged into this tag. The source tags will be deleted.
                </p>
                <div className="space-y-2">
                  {sourceTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setTargetTag(tag)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        targetTag?.id === tag.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{tag.display_name}</div>
                          <div className="text-sm text-gray-600">
                            {tag.usage_count} current uses
                          </div>
                        </div>
                        {targetTag?.id === tag.id && (
                          <Check className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you merging these tags?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
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
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!targetTag) {
                      setError('Please select a target tag');
                      return;
                    }
                    setStep('confirm');
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && targetTag && (
            <>
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-1">Confirm Merge</h4>
                      <p className="text-sm text-yellow-800">
                        This action cannot be undone. All source tags will be deleted and their usage will be transferred to the target tag.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Merge Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Source tags to be deleted:</span>
                      <span className="font-medium text-gray-900">{sourceTags.filter(t => t.id !== targetTag.id).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total affected posts:</span>
                      <span className="font-medium text-gray-900">{totalPosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total affected subreddits:</span>
                      <span className="font-medium text-gray-900">{totalSubreddits}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Target tag:</span>
                      <span className="font-semibold text-orange-600">{targetTag.display_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">New usage count:</span>
                      <span className="font-semibold text-orange-600">{targetTag.usage_count + totalUsage - targetTag.usage_count}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">What will happen:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>All source tags will be merged into "{targetTag.display_name}"</li>
                    <li>All post and subreddit references will be updated</li>
                    <li>Tag aliases will be created for future searches</li>
                    <li>Merge history will be preserved for audit purposes</li>
                    <li>Source tags will be permanently deleted</li>
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
                  onClick={() => setStep('select')}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleMerge}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
