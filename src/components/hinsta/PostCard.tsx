import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, Trash2, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { makeHashtagsClickable } from '../../lib/hinstaHashtagHelpers';
import DeletePostModal from './DeletePostModal';
import ReportPostModal from './ReportPostModal';
import ShareModal from './ShareModal';
import SharedContentCard from '../shared/SharedContentCard';

interface PostCardProps {
  post: any;
  onLike?: () => void;
  onComment?: () => void;
  onDelete?: () => void;
  showComments?: boolean;
  isPinned?: boolean;
}

export default function PostCard({ post, onLike, onComment, onDelete, showComments = true, isPinned = false }: PostCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [authorAccount, setAuthorAccount] = useState<any>(null);
  const [currentUserAccount, setCurrentUserAccount] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mediaUrls = post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0
    ? post.media_urls
    : post.media_url
    ? [post.media_url]
    : [];

  useEffect(() => {
    if (user) {
      checkLikeStatus();
      checkSavedStatus();
      fetchCurrentUserAccount();
    }
    fetchAuthor();
  }, [user, post.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const fetchAuthor = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('id', post.author_id)
      .single();

    if (data) setAuthorAccount(data);
  };

  const fetchCurrentUserAccount = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) setCurrentUserAccount(data);
  };

  const checkLikeStatus = async () => {
    const { data } = await supabase
      .from('platform_likes')
      .select('id')
      .eq('user_id', user?.id)
      .eq('platform', 'hinsta')
      .eq('content_type', 'post')
      .eq('content_id', post.id)
      .maybeSingle();

    setLiked(!!data);
  };

  const checkSavedStatus = async () => {
    const { data: account } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (account) {
      const { data } = await supabase
        .from('hinsta_saved_posts')
        .select('id')
        .eq('account_id', account.id)
        .eq('post_id', post.id)
        .maybeSingle();

      setSaved(!!data);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    try {
      if (liked) {
        await supabase
          .from('platform_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'hinsta')
          .eq('content_type', 'post')
          .eq('content_id', post.id);

        await supabase.rpc('decrement_like_count', {
          p_platform: 'hinsta',
          p_content_type: 'post',
          p_content_id: post.id
        });

        setLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('platform_likes')
          .insert({
            user_id: user.id,
            platform: 'hinsta',
            content_type: 'post',
            content_id: post.id
          });

        await supabase.rpc('increment_like_count', {
          p_platform: 'hinsta',
          p_content_type: 'post',
          p_content_id: post.id
        });

        setLiked(true);
        setLikeCount(prev => prev + 1);
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
      }

      if (onLike) onLike();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleSave = async () => {
    if (!user) return;

    try {
      const { data: account } = await supabase
        .from('hinsta_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!account) return;

      if (saved) {
        await supabase
          .from('hinsta_saved_posts')
          .delete()
          .eq('account_id', account.id)
          .eq('post_id', post.id);

        setSaved(false);
      } else {
        await supabase
          .from('hinsta_saved_posts')
          .insert({
            account_id: account.id,
            post_id: post.id
          });

        setSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleDoubleClick = () => {
    if (!liked) {
      toggleLike();
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (!authorAccount) return null;

  const isOwnPost = currentUserAccount && currentUserAccount.id === post.author_id;

  return (
    <article className={`bg-white border ${isPinned ? 'border-orange-200 border-2 rounded-b-lg' : 'border-gray-200 rounded-lg'} overflow-hidden mb-6`}>
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/hinsta/profile/${authorAccount.username}`} className="flex items-center gap-3 hover:opacity-80">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
            <div className="w-full h-full rounded-full bg-white p-0.5">
              {authorAccount.avatar_url ? (
                <img src={authorAccount.avatar_url} alt={authorAccount.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                  {authorAccount.username[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm">{authorAccount.username}</p>
            {post.location && <p className="text-xs text-gray-500">{post.location}</p>}
          </div>
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-600 hover:text-gray-900"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {isOwnPost ? (
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
              ) : (
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <Flag className="w-4 h-4" />
                  Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative" onDoubleClick={handleDoubleClick}>
        <img
          src={mediaUrls[currentImageIndex] || '/placeholder.jpg'}
          alt="Post"
          className="w-full aspect-square object-cover"
        />
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-24 h-24 text-white fill-white animate-ping" />
          </div>
        )}
        {mediaUrls.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaUrls.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="hover:opacity-70 transition-opacity">
              <Heart className={`w-6 h-6 ${liked ? 'fill-red-500 text-red-500' : 'text-gray-900'}`} />
            </button>
            <button onClick={onComment} className="hover:opacity-70 transition-opacity">
              <MessageCircle className="w-6 h-6 text-gray-900" />
            </button>
            <button onClick={() => setShowShareModal(true)} className="hover:opacity-70 transition-opacity">
              <Send className="w-6 h-6 text-gray-900" />
            </button>
          </div>
          <button onClick={toggleSave} className="hover:opacity-70 transition-opacity">
            <Bookmark className={`w-6 h-6 ${saved ? 'fill-gray-900 text-gray-900' : 'text-gray-900'}`} />
          </button>
        </div>

        {likeCount > 0 && (
          <p className="font-semibold text-sm mb-2">{likeCount.toLocaleString()} likes</p>
        )}

{post.shared_from_platform ? (
          <>
            {post.share_comment && (
              <div className="text-sm mb-2">
                <Link to={`/hinsta/profile/${authorAccount.username}`} className="font-semibold mr-2">
                  {authorAccount.username}
                </Link>
                <span
                  className="text-gray-900"
                  dangerouslySetInnerHTML={{ __html: makeHashtagsClickable(post.share_comment) }}
                />
              </div>
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
              className="mb-2"
            />
          </>
        ) : post.caption ? (
          <div className="text-sm mb-2">
            <Link to={`/hinsta/profile/${authorAccount.username}`} className="font-semibold mr-2">
              {authorAccount.username}
            </Link>
            <span
              className="text-gray-900"
              dangerouslySetInnerHTML={{ __html: makeHashtagsClickable(post.caption) }}
            />
          </div>
        ) : null}

        {showComments && post.comment_count > 0 && (
          <Link
            to={`/hinsta/post/${post.id}`}
            className="text-sm text-gray-500 hover:text-gray-700 block mb-2"
          >
            View all {post.comment_count} comments
          </Link>
        )}

        <p className="text-xs text-gray-400 uppercase">{formatTime(post.created_at)}</p>
      </div>

      {showDeleteModal && (
        <DeletePostModal
          post={post}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            setShowDeleteModal(false);
            if (onDelete) onDelete();
          }}
        />
      )}

      {showReportModal && (
        <ReportPostModal
          post={post}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showShareModal && (
        <ShareModal
          post={post}
          authorAccount={authorAccount}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </article>
  );
}
