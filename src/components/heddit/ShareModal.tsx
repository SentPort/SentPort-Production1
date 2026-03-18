import { useState, useEffect } from 'react';
import { X, Share2, User, Home, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SubHedditMultiSelect from './SubHedditMultiSelect';

interface ShareModalProps {
  post: any;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SubHeddit {
  id: string;
  name: string;
  display_name: string;
  description: string;
  member_count: number;
  topics: string[];
  is_member: boolean;
}

export default function ShareModal({ post, onClose, onSuccess }: ShareModalProps) {
  const navigate = useNavigate();
  const [shareText, setShareText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Destination selection states
  const [shareToProfile, setShareToProfile] = useState(false);
  const [shareToSameSubreddit, setShareToSameSubreddit] = useState(false);
  const [shareToExternal, setShareToExternal] = useState(false);
  const [selectedSubreddits, setSelectedSubreddits] = useState<SubHeddit[]>([]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate at least one destination is selected
    if (!shareToProfile && !shareToSameSubreddit && !shareToExternal) {
      setError('Please select at least one destination to share to');
      setLoading(false);
      return;
    }

    // Validate external subreddit selection
    if (shareToExternal && selectedSubreddits.length === 0) {
      setError('Please select at least one SubHeddit to share to');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to share posts');
        return;
      }

      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id, username')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) {
        setError('Heddit account not found');
        return;
      }

      // Build destinations array
      const destinations: string[] = [];
      if (shareToProfile) destinations.push('profile');
      if (shareToSameSubreddit) destinations.push('same_subreddit');
      if (shareToExternal) destinations.push('external_subreddit');

      // Collect all subreddit IDs to share to
      const subredditIdsToShareTo: string[] = [];

      if (shareToSameSubreddit) {
        subredditIdsToShareTo.push(post.subreddit_id);
      }

      if (shareToExternal) {
        selectedSubreddits.forEach(sub => {
          // Avoid duplicates
          if (!subredditIdsToShareTo.includes(sub.id)) {
            subredditIdsToShareTo.push(sub.id);
          }
        });
      }

      // If sharing to profile only, still need a subreddit_id (use original)
      if (shareToProfile && subredditIdsToShareTo.length === 0) {
        subredditIdsToShareTo.push(post.subreddit_id);
      }

      // Create share posts for each destination
      const sharePromises = subredditIdsToShareTo.map(async (subredditId) => {
        return await supabase
          .from('heddit_posts')
          .insert({
            author_id: hedditAccount.id,
            subreddit_id: subredditId,
            title: post.title,
            content: null,
            type: 'share',
            shared_post_id: post.id,
            share_text: shareText.trim() || null,
            share_destinations: destinations
          })
          .select()
          .single();
      });

      const results = await Promise.all(sharePromises);

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      // Create platform_shares entry
      await supabase.from('platform_shares').insert({
        user_id: user.id,
        platform: 'heddit',
        content_type: 'post',
        content_id: post.id
      });

      if (onSuccess) {
        onSuccess();
      }

      onClose();

      // Navigate to the first shared post
      const firstSharedPost = results[0].data;
      if (firstSharedPost) {
        navigate(`/heddit/post/${firstSharedPost.id}`);
      }
    } catch (err: any) {
      console.error('Error sharing post:', err);
      setError('Failed to share post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Share Post</h2>
              <p className="text-sm text-gray-600">Share to your profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleShare} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Where would you like to share this? <span className="text-red-500">*</span>
            </label>

            <div className="space-y-3">
              {/* Share to Profile */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 transition-colors">
                <input
                  type="checkbox"
                  checked={shareToProfile}
                  onChange={(e) => setShareToProfile(e.target.checked)}
                  className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">My Profile</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Share to your profile feed for your followers to see
                  </p>
                </div>
              </label>

              {/* Share to Same SubHeddit */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 transition-colors">
                <input
                  type="checkbox"
                  checked={shareToSameSubreddit}
                  onChange={(e) => setShareToSameSubreddit(e.target.checked)}
                  className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">This SubHeddit</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Share back to h/{post.heddit_subreddits?.name}
                  </p>
                </div>
              </label>

              {/* Share to External SubHeddit */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 transition-colors">
                <input
                  type="checkbox"
                  checked={shareToExternal}
                  onChange={(e) => setShareToExternal(e.target.checked)}
                  className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">External SubHeddit</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Share to other SubHeddits you're a member of
                  </p>
                </div>
              </label>
            </div>

            {/* External SubHeddit Selector */}
            {shareToExternal && (
              <div className="mt-4 pl-7">
                <SubHedditMultiSelect
                  selectedSubreddits={selectedSubreddits}
                  onChange={setSelectedSubreddits}
                  maxSelections={5}
                />
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add your thoughts (optional)
            </label>
            <textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="What do you think about this?"
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-xs text-gray-500 mb-1">
                  h/{post.heddit_subreddits?.name} • Posted by u/{post.heddit_accounts?.username}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
                {post.content && (
                  <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sharing...' : 'Share Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
