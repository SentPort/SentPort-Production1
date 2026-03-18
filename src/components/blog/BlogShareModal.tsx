import { useState } from 'react';
import { X, Share2, CheckCircle, Facebook, Twitter, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BlogShareModalProps {
  post: any;
  onClose: () => void;
  onShareSuccess?: () => void;
}

export default function BlogShareModal({ post, onClose, onShareSuccess }: BlogShareModalProps) {
  const { user, platformAccounts } = useAuth();
  const [shareComment, setShareComment] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'hubook' | 'switter' | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleShare = async () => {
    if (!user || !selectedPlatform) return;

    setSharing(true);
    setError('');

    try {
      if (selectedPlatform === 'hubook') {
        if (!platformAccounts.hubook) {
          setError('You need to join HuBook before sharing there.');
          setSharing(false);
          return;
        }

        const { data: hubookProfile } = await supabase
          .from('hubook_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (hubookProfile) {
          const shareContent = shareComment.trim()
            ? `${shareComment}\n\n📖 Shared from HuBlog: "${post.title}" by @${post.blog_accounts?.username}`
            : `📖 Check out this blog post: "${post.title}" by @${post.blog_accounts?.username}`;

          await supabase.from('posts').insert({
            author_id: hubookProfile.id,
            content: shareContent,
            privacy,
            shared_from_platform: 'hublog',
            shared_from_content_type: 'post',
            shared_from_content_id: post.id,
            shared_from_url: `/blog/post/${post.id}`
          });
        } else {
          setError('You need to join HuBook before sharing there.');
          setSharing(false);
          return;
        }
      } else if (selectedPlatform === 'switter') {
        if (!platformAccounts.switter) {
          setError('You need to join Switter before sharing there.');
          setSharing(false);
          return;
        }

        const { data: switterAccount } = await supabase
          .from('switter_accounts')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (switterAccount) {
          const tweetContent = shareComment.trim()
            ? `${shareComment} 📖 "${post.title}" by @${post.blog_accounts?.username}`
            : `📖 "${post.title}" by @${post.blog_accounts?.username}`;

          await supabase.from('switter_tweets').insert({
            author_id: switterAccount.id,
            content: tweetContent.slice(0, 280),
            shared_from_platform: 'hublog',
            shared_from_content_type: 'post',
            shared_from_content_id: post.id,
            shared_from_url: `/blog/post/${post.id}`
          });
        } else {
          setError('You need to join Switter before sharing there.');
          setSharing(false);
          return;
        }
      }

      setSuccess(true);
      onShareSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error sharing post:', err);
      setError('Failed to share post. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full border border-slate-600">
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Share Post</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <p className="text-xl font-semibold text-white mb-2">Post Shared!</p>
              <p className="text-gray-400">Your share has been posted successfully.</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h3 className="font-bold text-white mb-2">{post.title}</h3>
                <p className="text-sm text-gray-400">by {post.blog_accounts?.display_name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Add a comment (optional)
                </label>
                <textarea
                  value={shareComment}
                  onChange={(e) => setShareComment(e.target.value)}
                  placeholder="Share your thoughts about this post..."
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">{shareComment.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Share to:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedPlatform('hubook')}
                    disabled={!platformAccounts.hubook}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      selectedPlatform === 'hubook'
                        ? 'border-blue-500 bg-blue-500/10'
                        : platformAccounts.hubook
                        ? 'border-slate-600 hover:border-slate-500'
                        : 'border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Facebook className="w-6 h-6 text-blue-400" />
                      <span className="text-white font-medium">HuBook</span>
                    </div>
                    {!platformAccounts.hubook && (
                      <span className="text-xs text-gray-400">Not joined</span>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedPlatform('switter')}
                    disabled={!platformAccounts.switter}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      selectedPlatform === 'switter'
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : platformAccounts.switter
                        ? 'border-slate-600 hover:border-slate-500'
                        : 'border-slate-700 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Twitter className="w-6 h-6 text-cyan-400" />
                      <span className="text-white font-medium">Switter</span>
                    </div>
                    {!platformAccounts.switter && (
                      <span className="text-xs text-gray-400">Not joined</span>
                    )}
                  </button>
                </div>
              </div>

              {selectedPlatform === 'hubook' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Privacy
                  </label>
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value as any)}
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="public">Public</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing || !selectedPlatform}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-emerald-500/50"
                >
                  {sharing ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
