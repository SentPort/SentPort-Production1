import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import UniversalComment from './UniversalComment';
import HuTubeMentionTextarea from '../hutube/HuTubeMentionTextarea';
import HedditMentionTextarea from '../heddit/HedditMentionTextarea';
import { saveHuTubeMentions } from '../../lib/huTubeMentionHelpers';
import { saveHedditMentions } from '../../lib/hedditMentionHelpers';
import ErrorToast from './ErrorToast';

interface UniversalCommentSectionProps {
  platform: string;
  contentType: string;
  contentId: string;
  userProfile?: any;
  onCommentCountChange?: (newCount: number) => void;
  channelId?: string;
  accountId?: string;
}

export default function UniversalCommentSection({
  platform,
  contentType,
  contentId,
  userProfile,
  onCommentCountChange,
  channelId,
  accountId
}: UniversalCommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localAccountId, setLocalAccountId] = useState<string | null>(null);
  const [localChannelId, setLocalChannelId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [contentId]);

  useEffect(() => {
    if (user && platform === 'heddit' && !accountId) {
      fetchHedditAccountId();
    }
  }, [user, platform]);

  useEffect(() => {
    if (user && platform === 'hutube' && !channelId) {
      fetchHuTubeChannelId();
    }
  }, [user, platform]);

  const fetchHedditAccountId = async () => {
    if (!user) return;

    try {
      const { data: hedditAccount, error } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching heddit account:', error);
        return;
      }

      if (hedditAccount) {
        setLocalAccountId(hedditAccount.id);
      }
    } catch (err) {
      console.error('Exception fetching heddit account:', err);
    }
  };

  const fetchHuTubeChannelId = async () => {
    if (!user) return;

    try {
      const { data: channel, error } = await supabase
        .from('hutube_channels')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching hutube channel:', error);
        return;
      }

      if (channel) {
        setLocalChannelId(channel.id);
      }
    } catch (err) {
      console.error('Exception fetching hutube channel:', err);
    }
  };

  const fetchComments = async () => {
    let query = supabase
      .from('platform_comments')
      .select(`
        *,
        user_profiles!platform_comments_user_id_fkey (full_name, id)
      `)
      .eq('platform', platform)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    // For HuTube platform, fetch channel info separately for each comment
    if (platform === 'hutube' && data) {
      const commentsWithChannels = await Promise.all(
        data.map(async (comment) => {
          const { data: channelData } = await supabase
            .from('hutube_channels')
            .select('display_name, handle, avatar_url')
            .eq('user_id', comment.user_id)
            .maybeSingle();

          return {
            ...comment,
            hutube_channels: channelData
          };
        })
      );
      setComments(commentsWithChannels);
    } else if (platform === 'heddit' && data) {
      // For Heddit platform, fetch account info separately for each comment
      const commentsWithAccounts = await Promise.all(
        data.map(async (comment) => {
          const { data: accountData } = await supabase
            .from('heddit_accounts')
            .select('display_name, username, karma, kindness, quality_score')
            .eq('user_id', comment.user_id)
            .maybeSingle();

          return {
            ...comment,
            heddit_accounts: accountData
          };
        })
      );
      setComments(commentsWithAccounts);
    } else if (platform === 'hinsta' && data) {
      // For Hinsta platform, fetch account info separately for each comment
      const commentsWithAccounts = await Promise.all(
        data.map(async (comment) => {
          const { data: accountData } = await supabase
            .from('hinsta_accounts')
            .select('username, display_name, avatar_url')
            .eq('user_id', comment.user_id)
            .maybeSingle();

          return {
            ...comment,
            hinsta_accounts: accountData
          };
        })
      );
      setComments(commentsWithAccounts);
    } else if (platform === 'switter' && data) {
      // For Switter platform, fetch account info separately for each comment
      const commentsWithAccounts = await Promise.all(
        data.map(async (comment) => {
          const { data: accountData } = await supabase
            .from('switter_accounts')
            .select('display_name, handle, avatar_url')
            .eq('user_id', comment.user_id)
            .maybeSingle();

          return {
            ...comment,
            switter_accounts: accountData
          };
        })
      );
      setComments(commentsWithAccounts);
    } else {
      setComments(data || []);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) {
      console.log('Comment submission blocked: empty comment or no user');
      return;
    }

    // Use locally fetched IDs with fallback to props
    const effectiveAccountId = localAccountId || accountId;
    const effectiveChannelId = localChannelId || channelId;

    // For platforms that support mentions, ensure the account/channel ID is available
    if (platform === 'heddit' && !effectiveAccountId) {
      console.error('Comment submission blocked: Heddit accountId not available yet');
      setErrorMessage('Please wait a moment while we load your account information...');

      // Try to fetch it one more time
      await fetchHedditAccountId();

      // Check again after fetch attempt
      if (!localAccountId && !accountId) {
        return;
      }
    }

    if (platform === 'hutube' && !effectiveChannelId) {
      console.error('Comment submission blocked: HuTube channelId not available yet');
      setErrorMessage('Please wait a moment while we load your channel information...');

      // Try to fetch it one more time
      await fetchHuTubeChannelId();

      // Check again after fetch attempt
      if (!localChannelId && !channelId) {
        return;
      }
    }

    setLoading(true);

    try {
      console.log('Attempting to post comment:', {
        user_id: user.id,
        platform,
        content_type: contentType,
        content_id: contentId,
        comment_length: newComment.trim().length
      });

      const { data, error } = await supabase.from('platform_comments').insert({
        user_id: user.id,
        platform,
        content_type: contentType,
        content_id: contentId,
        content: newComment.trim()
      }).select();

      if (error) {
        console.error('Supabase error posting comment:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Comment posted successfully:', data);

      // Save mentions if platform supports them
      if (data && data[0]) {
        const commentId = data[0].id;
        const finalAccountId = localAccountId || accountId;
        const finalChannelId = localChannelId || channelId;

        if (platform === 'hutube' && finalChannelId) {
          try {
            console.log('Saving HuTube mentions for comment:', commentId);
            await saveHuTubeMentions('comment', commentId, newComment.trim(), finalChannelId);
            console.log('HuTube mentions saved successfully');
          } catch (mentionError) {
            console.error('Error saving HuTube mentions:', mentionError);
          }
        } else if (platform === 'heddit') {
          if (!finalAccountId) {
            console.error('Cannot save Heddit mentions: accountId is missing!', {
              platform,
              commentId,
              hasUser: !!user,
              localAccountId,
              propAccountId: accountId
            });
            setErrorMessage('Warning: Could not save mentions. Your comment was posted but mentions may not work.');
          } else {
            try {
              console.log('Saving Heddit mentions for comment:', {
                commentId,
                accountId: finalAccountId,
                content: newComment.trim()
              });
              await saveHedditMentions('comment', commentId, newComment.trim(), finalAccountId);
              console.log('Heddit mentions saved successfully');
            } catch (mentionError) {
              console.error('Error saving Heddit mentions:', mentionError);
              setErrorMessage('Warning: Mentions may not have been saved correctly.');
            }
          }
        }
      }

      setNewComment('');
      await fetchComments();

      // Fetch and report updated comment count (only top-level comments)
      if (onCommentCountChange) {
        const { count, error: countError } = await supabase
          .from('platform_comments')
          .select('*', { count: 'exact', head: true })
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .is('parent_id', null);

        if (!countError && count !== null) {
          onCommentCountChange(count);
        }
      }

      console.log('Comment submission complete');
    } catch (error: any) {
      console.error('Error posting comment:', error);
      const message = error?.message || 'Failed to post comment';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4 text-center text-gray-600">
        Sign in to leave a comment
      </div>
    );
  }

  const renderCommentInput = () => {
    if (platform === 'hutube') {
      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <HuTubeMentionTextarea
              value={newComment}
              onChange={setNewComment}
              placeholder="Write a comment... Use @ to mention channels"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 h-10"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      );
    } else if (platform === 'heddit') {
      return (
        <div className="flex gap-2">
          <div className="flex-1">
            <HedditMentionTextarea
              value={newComment}
              onChange={setNewComment}
              placeholder="Write a Comment... Use @ for users or @h/ for communities"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 h-10"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      );
    } else {
      return (
        <>
          {userProfile?.avatar_url || userProfile?.profile_photo_url ? (
            <img
              src={userProfile.avatar_url || userProfile.profile_photo_url}
              alt={userProfile.display_name || userProfile.full_name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {(userProfile?.display_name || userProfile?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || loading}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      );
    }
  };

  return (
    <>
      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
      <div className="p-3 sm:p-4 space-y-4 overflow-x-hidden">
        <form onSubmit={handleSubmitComment} className="mb-4">
          {renderCommentInput()}
        </form>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <UniversalComment
              key={comment.id}
              comment={comment}
              platform={platform}
              contentType={contentType}
              contentId={contentId}
              onUpdate={fetchComments}
              onCommentCountChange={onCommentCountChange}
            />
          ))
        )}
      </div>
      </div>
    </>
  );
}
