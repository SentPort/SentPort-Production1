import { useState, useEffect } from 'react';
import { Reply, MoreHorizontal, CreditCard as Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import ReactionPicker, { ReactionType } from './ReactionPicker';
import DeleteCommentModal from './DeleteCommentModal';
import MentionTextarea from './MentionTextarea';
import { saveMentions, renderMentionsAsLinks } from '../../lib/mentionHelpers';
import ReactionDetailsModal, { ReactionDetail } from './ReactionDetailsModal';

interface MediaCommentProps {
  comment: any;
  mediaId: string;
  onUpdate: () => void;
  isReply?: boolean;
}

export default function MediaComment({ comment, mediaId, onUpdate, isReply = false }: MediaCommentProps) {
  const { hubookProfile } = useHuBook();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<any>(null);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<any[]>([]);
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [reactions, setReactions] = useState<any[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<ReactionDetail[]>([]);
  const [loadingReactionDetails, setLoadingReactionDetails] = useState(false);

  useEffect(() => {
    fetchCommentData();
    if (!isReply) {
      fetchReplies();
    }
  }, [comment.id]);

  const fetchCommentData = async () => {
    const [authorRes, reactionRes, userReactionRes] = await Promise.all([
      supabase.from('hubook_profiles').select('*').eq('id', comment.author_id).single(),
      supabase.from('reactions').select('*').eq('target_id', comment.id).eq('target_type', 'media_comment'),
      hubookProfile
        ? supabase
            .from('reactions')
            .select('*')
            .eq('target_id', comment.id)
            .eq('target_type', 'media_comment')
            .eq('user_id', hubookProfile.id)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    if (authorRes.data) setAuthor(authorRes.data);
    if (reactionRes.data) setReactions(reactionRes.data);
    if (userReactionRes.data) setCurrentReaction(userReactionRes.data.reaction_type);
  };

  const fetchReplies = async () => {
    const { data } = await supabase
      .from('album_media_comments')
      .select('*')
      .eq('parent_comment_id', comment.id)
      .order('created_at', { ascending: true });

    setReplies(data || []);
  };

  const handleReact = async (type: ReactionType) => {
    if (!hubookProfile) return;

    try {
      if (currentReaction === type) {
        await supabase
          .from('reactions')
          .delete()
          .eq('user_id', hubookProfile.id)
          .eq('target_id', comment.id)
          .eq('target_type', 'media_comment');
        setCurrentReaction(null);
      } else {
        await supabase
          .from('reactions')
          .upsert({
            user_id: hubookProfile.id,
            target_id: comment.id,
            target_type: 'media_comment',
            reaction_type: type
          });
        setCurrentReaction(type);
      }
      fetchCommentData();
    } catch (error) {
      console.error('Error reacting to comment:', error);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !hubookProfile) return;

    try {
      const { data: newComment, error: insertError } = await supabase
        .from('album_media_comments')
        .insert({
          media_id: mediaId,
          author_id: hubookProfile.id,
          content: replyText.trim(),
          parent_comment_id: comment.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (newComment) {
        await saveMentions('media_comment', newComment.id, replyText.trim(), hubookProfile.id);
      }

      setReplyText('');
      setShowReplyInput(false);
      fetchReplies();
      onUpdate();
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleEdit = async () => {
    if (!hubookProfile || !editContent.trim()) return;

    try {
      await supabase
        .from('album_media_comments')
        .update({
          content: editContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', comment.id);

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!hubookProfile) return;

    try {
      await supabase.from('album_media_comments').delete().eq('id', comment.id);
      setShowDeleteModal(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReactionCountClick = async () => {
    if (reactions.length === 0) return;

    setLoadingReactionDetails(true);
    setShowReactionDetails(true);

    try {
      const { data, error } = await supabase.rpc('get_post_reactions_with_users', {
        p_target_id: comment.id,
        p_target_type: 'media_comment'
      });

      if (error) throw error;
      setReactionDetails(data || []);
    } catch (error) {
      console.error('Error fetching reaction details:', error);
      setReactionDetails([]);
    } finally {
      setLoadingReactionDetails(false);
    }
  };

  const reactionSummary = reactions.reduce((acc: any, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
    return acc;
  }, {});

  const isOwnComment = hubookProfile?.id === comment.author_id;

  if (!author) return null;

  return (
    <div className={isReply ? 'ml-10' : ''}>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(hubookProfile?.id === author.id ? '/hubook/profile' : `/hubook/user/${author.id}`)}
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          {author.profile_photo_url ? (
            <img
              src={author.profile_photo_url}
              alt={author.display_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
              {author.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        <div className="flex-1">
          <div className="bg-gray-100 rounded-2xl px-4 py-2 inline-block">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(hubookProfile?.id === author.id ? '/hubook/profile' : `/hubook/user/${author.id}`)}
                className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {author.display_name}
              </button>
              {isOwnComment && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <MoreHorizontal className="w-3 h-3 text-gray-600" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 text-sm">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <MentionTextarea
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Edit comment..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleEdit}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="text-gray-900 text-sm"
                dangerouslySetInnerHTML={{ __html: renderMentionsAsLinks(comment.content) }}
              />
            )}
            {!isEditing && comment.is_edited && (
              <span className="text-xs text-gray-500 ml-1">(edited)</span>
            )}
          </div>

          {reactions.length > 0 && (
            <button
              onClick={handleReactionCountClick}
              className="flex items-center gap-1 mt-1 px-2 hover:underline cursor-pointer transition-all"
              title="Click to see who reacted"
            >
              {Object.entries(reactionSummary)
                .sort(([, a]: any, [, b]: any) => b - a)
                .slice(0, 3)
                .map(([type]) => {
                  const reactionConfig = {
                    like: { emoji: '👍', label: 'Like' },
                    love: { emoji: '❤️', label: 'Love' },
                    laugh: { emoji: '😂', label: 'Laugh' },
                    smile: { emoji: '😊', label: 'Smile' },
                    grateful: { emoji: '🙏', label: 'Grateful' },
                    insightful: { emoji: '💡', label: 'Insightful' },
                    curious: { emoji: '🤔', label: 'Curious' },
                    wow: { emoji: '😮', label: 'Wow' },
                    support: { emoji: '💪', label: 'Support' },
                    care: { emoji: '🤗', label: 'Care' },
                    sad: { emoji: '😢', label: 'Sad' },
                    angry: { emoji: '😠', label: 'Angry' },
                    clap: { emoji: '👏', label: 'Clap' },
                    fire: { emoji: '🔥', label: 'Fire' },
                    eyes: { emoji: '👀', label: 'Eyes' }
                  }[type as string] || { emoji: type as string, label: type as string };

                  return (
                    <span key={type} className="text-sm" title={reactionConfig.label}>
                      {reactionConfig.emoji}
                    </span>
                  );
                })}
              <span className="text-xs text-gray-600 ml-1">{reactions.length}</span>
            </button>
          )}

          <div className="flex items-center gap-3 mt-1 px-2 relative z-10">
            <ReactionPicker onReact={handleReact} currentReaction={currentReaction} />

            {!isReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-xs font-semibold text-gray-600 hover:text-blue-600 flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                Reply
              </button>
            )}

            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {showReplyInput && (
            <div className="mt-2">
              <div className="bg-gray-100 rounded-2xl p-2">
                <MentionTextarea
                  value={replyText}
                  onChange={setReplyText}
                  placeholder="Write a reply..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reply
                </button>
                <button
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyText('');
                  }}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-3 space-y-2">
              {replies.map((reply) => (
                <MediaComment
                  key={reply.id}
                  comment={reply}
                  mediaId={mediaId}
                  onUpdate={() => {
                    fetchReplies();
                    onUpdate();
                  }}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <DeleteCommentModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showReactionDetails && (
        <ReactionDetailsModal
          isOpen={showReactionDetails}
          onClose={() => setShowReactionDetails(false)}
          reactions={reactionDetails}
        />
      )}
    </div>
  );
}
