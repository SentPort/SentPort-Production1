import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Reply, Send, Trash2, Star, Heart, Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DeleteCommentModal from '../hubook/DeleteCommentModal';
import HedditContentRenderer from '../heddit/HedditContentRenderer';
import ErrorToast from './ErrorToast';

interface UniversalCommentProps {
  comment: any;
  platform: string;
  contentType: string;
  contentId: string;
  onUpdate: () => void;
  onCommentCountChange?: (newCount: number) => void;
  depth?: number;
}

export default function UniversalComment({
  comment,
  platform,
  contentType,
  contentId,
  onUpdate,
  onCommentCountChange,
  depth = 0
}: UniversalCommentProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<any[]>([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (showReplies) {
      fetchReplies();
    }
  }, [showReplies]);

  useEffect(() => {
    checkLikeDislikeStatus();
  }, [comment.id, user]);

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('platform_comments')
      .select(`
        *,
        user_profiles!platform_comments_user_id_fkey (full_name, id)
      `)
      .eq('parent_id', comment.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return;
    }

    // For HuTube platform, fetch channel info separately for each reply
    if (platform === 'hutube' && data) {
      const repliesWithChannels = await Promise.all(
        data.map(async (reply) => {
          const { data: channelData } = await supabase
            .from('hutube_channels')
            .select('display_name, handle, avatar_url')
            .eq('user_id', reply.user_id)
            .maybeSingle();

          return {
            ...reply,
            hutube_channels: channelData
          };
        })
      );
      setReplies(repliesWithChannels);
    } else if (platform === 'heddit' && data) {
      // For Heddit platform, fetch account info separately for each reply
      const repliesWithAccounts = await Promise.all(
        data.map(async (reply) => {
          const { data: accountData } = await supabase
            .from('heddit_accounts')
            .select('display_name, username, karma, kindness, quality_score')
            .eq('user_id', reply.user_id)
            .maybeSingle();

          return {
            ...reply,
            heddit_accounts: accountData
          };
        })
      );
      setReplies(repliesWithAccounts);
    } else if (platform === 'hinsta' && data) {
      // For Hinsta platform, fetch account info separately for each reply
      const repliesWithAccounts = await Promise.all(
        data.map(async (reply) => {
          const { data: accountData } = await supabase
            .from('hinsta_accounts')
            .select('username, display_name, avatar_url')
            .eq('user_id', reply.user_id)
            .maybeSingle();

          return {
            ...reply,
            hinsta_accounts: accountData
          };
        })
      );
      setReplies(repliesWithAccounts);
    } else if (platform === 'switter' && data) {
      // For Switter platform, fetch account info separately for each reply
      const repliesWithAccounts = await Promise.all(
        data.map(async (reply) => {
          const { data: accountData } = await supabase
            .from('switter_accounts')
            .select('display_name, handle, avatar_url')
            .eq('user_id', reply.user_id)
            .maybeSingle();

          return {
            ...reply,
            switter_accounts: accountData
          };
        })
      );
      setReplies(repliesWithAccounts);
    } else {
      setReplies(data || []);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('platform_comments').insert({
        user_id: user.id,
        platform,
        content_type: contentType,
        content_id: contentId,
        content: replyText.trim(),
        parent_id: comment.id
      });

      if (error) throw error;

      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
      await fetchReplies();
      onUpdate();

      // Update comment count for parent component
      if (onCommentCountChange) {
        const { count, error: countError } = await supabase
          .from('platform_comments')
          .select('*', { count: 'exact', head: true })
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId);

        if (!countError && count !== null) {
          onCommentCountChange(count);
        }
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      setErrorMessage('Failed to post reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkLikeDislikeStatus = async () => {
    if (!user) {
      setLiked(false);
      setDisliked(false);
      return;
    }

    // Check if user has liked this comment
    const { data: likeData } = await supabase
      .from('platform_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('content_type', 'comment')
      .eq('content_id', comment.id)
      .maybeSingle();

    setLiked(!!likeData);

    // Check if user has disliked this comment
    const { data: dislikeData } = await supabase
      .from('platform_dislikes')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('content_type', 'comment')
      .eq('content_id', comment.id)
      .maybeSingle();

    setDisliked(!!dislikeData);
  };

  const handleLike = async () => {
    if (!user) return;

    try {
      if (liked) {
        // Unlike - remove from platform_likes
        await supabase
          .from('platform_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', platform)
          .eq('content_type', 'comment')
          .eq('content_id', comment.id);

        await supabase
          .from('platform_comments')
          .update({ like_count: Math.max(0, (comment.like_count || 0) - 1) })
          .eq('id', comment.id);

        setLiked(false);
      } else {
        // Like - add to platform_likes
        await supabase
          .from('platform_likes')
          .insert({
            user_id: user.id,
            platform,
            content_type: 'comment',
            content_id: comment.id
          });

        await supabase
          .from('platform_comments')
          .update({ like_count: (comment.like_count || 0) + 1 })
          .eq('id', comment.id);

        setLiked(true);

        // If previously disliked, remove dislike
        if (disliked) {
          await supabase
            .from('platform_dislikes')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', platform)
            .eq('content_type', 'comment')
            .eq('content_id', comment.id);

          await supabase
            .from('platform_comments')
            .update({ dislike_count: Math.max(0, (comment.dislike_count || 0) - 1) })
            .eq('id', comment.id);

          setDisliked(false);
        }
      }

      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;

    try {
      if (disliked) {
        // Remove dislike - remove from platform_dislikes
        await supabase
          .from('platform_dislikes')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', platform)
          .eq('content_type', 'comment')
          .eq('content_id', comment.id);

        await supabase
          .from('platform_comments')
          .update({ dislike_count: Math.max(0, (comment.dislike_count || 0) - 1) })
          .eq('id', comment.id);

        setDisliked(false);
      } else {
        // Dislike - add to platform_dislikes
        await supabase
          .from('platform_dislikes')
          .insert({
            user_id: user.id,
            platform,
            content_type: 'comment',
            content_id: comment.id
          });

        await supabase
          .from('platform_comments')
          .update({ dislike_count: (comment.dislike_count || 0) + 1 })
          .eq('id', comment.id);

        setDisliked(true);

        // If previously liked, remove like
        if (liked) {
          await supabase
            .from('platform_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', platform)
            .eq('content_type', 'comment')
            .eq('content_id', comment.id);

          await supabase
            .from('platform_comments')
            .update({ like_count: Math.max(0, (comment.like_count || 0) - 1) })
            .eq('id', comment.id);

          setLiked(false);
        }
      }

      onUpdate();
    } catch (error) {
      console.error('Error toggling dislike:', error);
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== comment.user_id) return;

    const { error } = await supabase
      .from('platform_comments')
      .delete()
      .eq('id', comment.id);

    if (!error) {
      setShowDeleteModal(false);
      onUpdate();

      // Update comment count for parent component
      if (onCommentCountChange) {
        const { count, error: countError } = await supabase
          .from('platform_comments')
          .select('*', { count: 'exact', head: true })
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId);

        if (!countError && count !== null) {
          onCommentCountChange(count);
        }
      }
    }
  };

  const maxDepth = 3;

  const getDisplayName = () => {
    if (platform === 'hutube' && comment.hutube_channels) {
      return comment.hutube_channels.display_name || 'Anonymous';
    }
    if (platform === 'heddit' && comment.heddit_accounts) {
      return comment.heddit_accounts.display_name || comment.heddit_accounts.username || 'Anonymous';
    }
    if (platform === 'hinsta' && comment.hinsta_accounts) {
      return comment.hinsta_accounts.display_name || comment.hinsta_accounts.username || 'Anonymous';
    }
    if (platform === 'switter' && comment.switter_accounts) {
      return comment.switter_accounts.display_name || comment.switter_accounts.handle || 'Anonymous';
    }
    return comment.user_profiles?.full_name || 'Anonymous';
  };

  const getAvatarUrl = () => {
    if (platform === 'hutube' && comment.hutube_channels) {
      return comment.hutube_channels.avatar_url;
    }
    if (platform === 'hinsta' && comment.hinsta_accounts) {
      return comment.hinsta_accounts.avatar_url;
    }
    if (platform === 'switter' && comment.switter_accounts) {
      return comment.switter_accounts.avatar_url;
    }
    return null;
  };

  const displayName = getDisplayName();
  const avatarUrl = getAvatarUrl();

  return (
    <>
      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
      <div className={depth > 0 ? 'ml-8 pt-3' : ''}>
        <div className="flex gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="bg-gray-100 rounded-2xl px-4 py-2">
            <div className="font-semibold text-sm text-gray-900">
              {displayName}
            </div>
            {platform === 'heddit' ? (
              <HedditContentRenderer
                content={comment.content}
                className="text-gray-800 text-sm mt-1 whitespace-pre-wrap"
              />
            ) : (
              <p className="text-gray-800 text-sm mt-1">{comment.content}</p>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 px-2">
            <button
              onClick={handleLike}
              disabled={!user}
              className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                liked ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <ThumbsUp className="w-3 h-3" fill={liked ? 'currentColor' : 'none'} />
              <span>{comment.like_count || 0}</span>
            </button>

            <button
              onClick={handleDislike}
              disabled={!user}
              className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                disliked ? 'text-red-600 font-semibold' : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <ThumbsDown className="w-3 h-3" fill={disliked ? 'currentColor' : 'none'} />
              <span>{comment.dislike_count || 0}</span>
            </button>

            {depth < maxDepth && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            )}

            {user && user.id === comment.user_id && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}

            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>

          {platform === 'heddit' && comment.heddit_accounts && (
            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100 text-xs px-2">
              <div className="flex items-center gap-1 text-gray-600">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="font-medium">{comment.heddit_accounts.karma || 0}</span>
                <span className="text-gray-500">Karma</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Heart className="w-3 h-3 text-pink-500" />
                <span className="font-medium">{comment.heddit_accounts.kindness || 0}</span>
                <span className="text-gray-500">Kindness</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Trophy className="w-3 h-3 text-blue-500" />
                <span className="font-medium">{comment.heddit_accounts.quality_score || 0}</span>
                <span className="text-gray-500">Quality</span>
              </div>
            </div>
          )}

          {showReplyForm && (
            <form onSubmit={handleSubmitReply} className="mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || loading}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {replies.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                {showReplies ? 'Hide' : 'Show'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </button>

              {showReplies && (
                <div className="mt-2 space-y-2">
                  {replies.map((reply) => (
                    <UniversalComment
                      key={reply.id}
                      comment={reply}
                      platform={platform}
                      contentType={contentType}
                      contentId={contentId}
                      onUpdate={() => {
                        fetchReplies();
                        onUpdate();
                      }}
                      onCommentCountChange={onCommentCountChange}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <DeleteCommentModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          platform={platform}
        />
      )}
      </div>
    </>
  );
}
