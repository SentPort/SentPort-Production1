import { useState, useEffect } from 'react';
import { MessageCircle, Share2, MoreHorizontal, Globe, Users as FriendsIcon, Lock, Flag, CreditCard as Edit, Trash2, Pin, Camera, Image as ImageIcon, Video, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import ReactionPicker, { ReactionType } from './ReactionPicker';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';
import ShareModal from './ShareModal';
import HuBookNotification from './HuBookNotification';
import DeletePostModal from './DeletePostModal';
import MentionTextarea from './MentionTextarea';
import { renderMentionsAsLinks } from '../../lib/mentionHelpers';
import SharedContentCard from '../shared/SharedContentCard';
import ReactionDetailsModal, { ReactionDetail } from './ReactionDetailsModal';

interface PostProps {
  post: any;
  onUpdate?: () => void;
  isPinned?: boolean;
  isEmbedded?: boolean;
}

export default function Post({ post, onUpdate, isPinned = false, isEmbedded = false }: PostProps) {
  const { hubookProfile } = useHuBook();
  const navigate = useNavigate();
  const [author, setAuthor] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [reactions, setReactions] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<ReactionDetail[]>([]);
  const [loadingReactionDetails, setLoadingReactionDetails] = useState(false);

  useEffect(() => {
    fetchPostData();
  }, [post.id]);

  const fetchPostData = async () => {
    const [authorRes, mediaRes, reactionRes, userReactionRes, commentsRes, sharesRes] = await Promise.all([
      supabase.from('hubook_profiles').select('*').eq('id', post.author_id).single(),
      supabase.from('post_media').select('id, post_id, media_url, media_type, display_order, album_media_id').eq('post_id', post.id).order('display_order'),
      supabase.from('reactions').select('*').eq('target_id', post.id).eq('target_type', 'post'),
      hubookProfile
        ? supabase
            .from('reactions')
            .select('*')
            .eq('target_id', post.id)
            .eq('target_type', 'post')
            .eq('user_id', hubookProfile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      supabase.from('shares').select('id', { count: 'exact', head: true }).eq('post_id', post.id)
    ]);

    if (authorRes.data) setAuthor(authorRes.data);
    if (mediaRes.data) setMedia(mediaRes.data);
    if (reactionRes.data) setReactions(reactionRes.data);
    if (userReactionRes.data) setCurrentReaction(userReactionRes.data.reaction_type);
    setCommentCount(commentsRes.count || 0);
    setShareCount(sharesRes.count || 0);
  };

  const handleReact = async (type: ReactionType) => {
    if (!hubookProfile) return;

    try {
      if (currentReaction === type) {
        await supabase
          .from('reactions')
          .delete()
          .eq('user_id', hubookProfile.id)
          .eq('target_id', post.id)
          .eq('target_type', 'post');
        setCurrentReaction(null);
      } else {
        await supabase
          .from('reactions')
          .upsert({
            user_id: hubookProfile.id,
            target_id: post.id,
            target_type: 'post',
            reaction_type: type
          });
        setCurrentReaction(type);
      }
      fetchPostData();
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  const handleShareClick = () => {
    if (!hubookProfile) return;
    setShowShareModal(true);
  };

  const handleShareSuccess = () => {
    setNotification({ type: 'success', message: 'Post shared to your feed!' });
    fetchPostData();
  };

  const handleReactionCountClick = async () => {
    if (reactions.length === 0) return;

    setLoadingReactionDetails(true);
    setShowReactionDetails(true);

    try {
      const { data, error } = await supabase.rpc('get_post_reactions_with_users', {
        p_target_id: post.id,
        p_target_type: 'post'
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

  const handleEdit = async () => {
    if (!hubookProfile || !editContent.trim()) return;

    try {
      await supabase
        .from('posts')
        .update({
          content: editContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id);

      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error editing post:', error);
    }
  };

  const renderPostContent = (content: string) => {
    // Check if this is an album upload post
    if (post.source_type === 'album_upload' && post.source_album_id) {
      // Parse album name from content (format: "added X photo(s)/video(s) to [Album Name]")
      const albumNameMatch = content.match(/to (.+)$/);
      if (albumNameMatch && albumNameMatch[1]) {
        const albumName = albumNameMatch[1];
        // Get everything up to (but not including) "to [Album Name]"
        const toIndex = content.lastIndexOf('to ');
        const beforeTo = content.substring(0, toIndex);

        return (
          <span>
            {beforeTo}to{' '}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/hubook/albums/${post.source_album_id}`);
              }}
              className="text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
            >
              {albumName}
            </button>
          </span>
        );
      }
    }

    // Default rendering with mention links
    return <span dangerouslySetInnerHTML={{ __html: renderMentionsAsLinks(content) }} />;
  };

  const handleDelete = async () => {
    if (!hubookProfile) {
      console.error('No hubook profile found');
      return;
    }

    console.log('Attempting to delete post:', post.id);
    console.log('Current user profile ID:', hubookProfile.id);
    console.log('Post author ID:', post.author_id);

    try {
      const { data, error, count, status, statusText } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .select();

      console.log('Delete response:', { data, error, count, status, statusText });

      if (error) {
        console.error('Delete error:', error);
        setNotification({
          type: 'error',
          message: `Failed to delete post: ${error.message}`
        });
        setShowDeleteModal(false);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('No rows were deleted - possible permission issue');
        setNotification({
          type: 'error',
          message: 'Unable to delete post. You may not have permission.'
        });
        setShowDeleteModal(false);
        return;
      }

      console.log('Post deleted successfully');
      setShowDeleteModal(false);
      setNotification({
        type: 'success',
        message: 'Post deleted successfully'
      });

      setTimeout(() => {
        onUpdate?.();
      }, 100);
    } catch (error) {
      console.error('Error deleting post:', error);
      setNotification({
        type: 'error',
        message: 'An unexpected error occurred'
      });
      setShowDeleteModal(false);
    }
  };

  const privacyIcon = {
    public: Globe,
    friends: FriendsIcon,
    private: Lock
  }[post.privacy];

  const PrivacyIcon = privacyIcon;

  const reactionSummary = reactions.reduce((acc: any, reaction) => {
    acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
    return acc;
  }, {});

  const topReactions = Object.entries(reactionSummary)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 3);

  const isOwnPost = hubookProfile?.id === post.author_id;

  if (!author) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4">
      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-3">
            <button
              onClick={() => navigate(hubookProfile?.id === author.id ? '/hubook/profile' : `/hubook/user/${author.id}`)}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              {author.profile_photo_url ? (
                <img
                  src={author.profile_photo_url}
                  alt={author.display_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                  {author.display_name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(hubookProfile?.id === author.id ? '/hubook/profile' : `/hubook/user/${author.id}`)}
                  className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {author.display_name}
                </button>
                {post.is_auto_generated && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {post.post_type === 'profile_photo' && <Camera className="w-3 h-3" />}
                    {post.post_type === 'cover_photo' && <Camera className="w-3 h-3" />}
                    {post.post_type === 'album_media' && <ImageIcon className="w-3 h-3" />}
                    {post.post_type === 'profile_photo' && 'Profile Photo'}
                    {post.post_type === 'cover_photo' && 'Cover Photo'}
                    {post.post_type === 'album_media' && 'Album Update'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span>·</span>
                <PrivacyIcon className="w-3 h-3" />
              </div>
              {isPinned && (
                <div className="flex items-center gap-1 text-sm text-blue-600 font-semibold mt-1">
                  <Pin size={14} className="fill-blue-600" />
                  <span>Pinned by Admin</span>
                </div>
              )}
            </div>
          </div>

          {!isEmbedded && (
            <>
              {isOwnPost ? (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                      {!post.is_auto_generated && (
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Post
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowDeleteModal(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Post
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors group relative"
                  title="Report Fake Content"
                >
                  <Flag className="w-5 h-5 text-red-600" />
                </button>
              )}
            </>
          )}
        </div>

        {post.status === 'paused' && isOwnPost && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <Flag className="w-4 h-4" />
              <span className="font-medium">Under Review</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              This post has been flagged for review and is temporarily hidden from others.
            </p>
          </div>
        )}

        {isEditing ? (
          <div className="mb-4">
            <MentionTextarea
              value={editContent}
              onChange={setEditContent}
              placeholder="Edit your post..."
              rows={4}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {post.shared_from_platform ? (
              <>
                {post.share_comment && (
                  <p
                    className="text-gray-900 mb-3 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderMentionsAsLinks(post.share_comment) }}
                  />
                )}
                <SharedContentCard
                  platform={post.shared_from_platform}
                  contentType={post.shared_from_content_type || 'post'}
                  contentId={post.shared_from_content_id || ''}
                  url={post.shared_from_url}
                  title={post.shared_from_title}
                  author={post.shared_from_author}
                  excerpt={post.shared_from_excerpt}
                  thumbnail={post.shared_from_thumbnail}
                  className="mb-4"
                />
              </>
            ) : (
              <p className="text-gray-900 mb-4 whitespace-pre-wrap">
                {renderPostContent(post.content)}
              </p>
            )}
            {post.is_edited && (
              <span className="text-sm text-gray-500 -mt-2 mb-4 block">(edited)</span>
            )}
          </>
        )}

        {media.length > 0 && (
          <div className={`grid gap-2 mb-4 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {media.map((item, index) => {
              // Check if this is an album update post with clickable media
              const isAlbumMedia = post.source_type === 'album_upload' && post.source_album_id && item.album_media_id;
              const albumId = post.source_album_id;
              const mediaId = item.album_media_id;

              const handleMediaClick = () => {
                if (isAlbumMedia && albumId && mediaId) {
                  navigate(`/hubook/albums/${albumId}?mediaId=${mediaId}`);
                }
              };

              return (
                <div
                  key={item.id}
                  className={isAlbumMedia ? 'relative group cursor-pointer' : ''}
                  onClick={isAlbumMedia ? handleMediaClick : undefined}
                >
                  {item.media_type === 'image' ? (
                    <>
                      <img
                        src={item.media_url}
                        alt="Post media"
                        className={`w-full rounded-lg object-cover ${isAlbumMedia ? 'group-hover:scale-[1.02] transition-transform duration-300' : ''}`}
                      />
                      {isAlbumMedia && (
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center gap-2 text-white">
                            <Eye className="w-8 h-8" />
                            <span className="text-sm font-semibold">View in Album</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <video
                      src={item.media_url}
                      controls
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(reactions.length > 0 || commentCount > 0 || shareCount > 0) && (
          <div className="flex items-center justify-between py-2 border-b border-gray-200 text-sm text-gray-600">
            {reactions.length > 0 && (
              <button
                onClick={handleReactionCountClick}
                className="flex items-center gap-1 hover:underline cursor-pointer transition-all"
                title="Click to see who reacted"
              >
                {topReactions.map(([type]) => {
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
                    <span key={type} className="text-base" title={reactionConfig.label}>
                      {reactionConfig.emoji}
                    </span>
                  );
                })}
                <span className="ml-1">{reactions.length}</span>
              </button>
            )}
            <div className="flex gap-4">
              {commentCount > 0 && <span>{commentCount} comments</span>}
              {shareCount > 0 && <span>{shareCount} shares</span>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-1">
            <ReactionPicker onReact={handleReact} currentReaction={currentReaction} />

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Comment</span>
            </button>

            <button
              onClick={handleShareClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>

          {!isOwnPost && (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Flag className="w-3 h-3" />
              Report Fake Content
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <div className="border-t border-gray-200">
          <CommentSection postId={post.id} />
        </div>
      )}

      {showReportModal && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          post={post}
          author={author}
          media={media}
          onClose={() => setShowShareModal(false)}
          onSuccess={handleShareSuccess}
        />
      )}

      {notification && (
        <HuBookNotification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {showDeleteModal && (
        <DeletePostModal
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isAutoGenerated={post.is_auto_generated}
          postType={post.post_type}
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
