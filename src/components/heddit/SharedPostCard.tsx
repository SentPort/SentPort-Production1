import { useEffect, useState } from 'react';
import { Share2, MessageSquare, ArrowBigUp, ArrowBigDown, Trash2, MoreVertical, Pin, PinOff, Star, Heart, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import HedditContentRenderer from './HedditContentRenderer';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import { useHedditNotification } from '../../contexts/HedditNotificationContext';
import { TagChip } from './TagChip';

interface SharedPostCardProps {
  sharePost: any;
  onNavigate?: () => void;
  currentAccountId?: string;
  onDelete?: () => void;
  isModerator?: boolean;
  moderatorPermissions?: {
    pin_posts: boolean;
    delete_posts: boolean;
  };
  subredditId?: string;
  onUpdate?: () => void;
}

export default function SharedPostCard({ sharePost, onNavigate, currentAccountId, onDelete, isModerator, moderatorPermissions, subredditId, onUpdate }: SharedPostCardProps) {
  const navigate = useNavigate();
  const { showError, showSuccess } = useHedditNotification();
  const [originalPost, setOriginalPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showModMenu, setShowModMenu] = useState(false);
  const [confirmModDelete, setConfirmModDelete] = useState(false);
  const [moderatorActionLoading, setModeratorActionLoading] = useState(false);
  const [postTags, setPostTags] = useState<string[]>([]);

  const isOwnShare = currentAccountId && sharePost.author_id === currentAccountId;
  const showModeratorActions = isModerator && moderatorPermissions && (moderatorPermissions.pin_posts || moderatorPermissions.delete_posts);

  useEffect(() => {
    fetchOriginalPost();
  }, [sharePost.shared_post_id]);

  const fetchOriginalPost = async () => {
    if (!sharePost.shared_post_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_accounts!heddit_posts_author_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          ),
          heddit_subreddits!heddit_posts_subreddit_id_fkey (
            id,
            name,
            display_name
          )
        `)
        .eq('id', sharePost.shared_post_id)
        .maybeSingle();

      if (!error && data) {
        setOriginalPost(data);
        // Fetch tags for the original post
        fetchPostTags(data.id);
      }
    } catch (err) {
      console.error('Error fetching original post:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostTags = async (postId: string) => {
    try {
      const { data } = await supabase
        .from('heddit_post_tags')
        .select('heddit_custom_tags(display_name)')
        .eq('post_id', postId);

      if (data) {
        setPostTags(data.map((t: any) => t.heddit_custom_tags.display_name));
      }
    } catch (err) {
      console.error('Error fetching post tags:', err);
    }
  };

  const handleClick = () => {
    if (originalPost) {
      if (onNavigate) {
        onNavigate();
      }
      navigate(`/heddit/post/${originalPost.id}`);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleDeleteShare = async () => {
    if (deleting) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('heddit_posts')
        .delete()
        .eq('id', sharePost.id);

      if (error) throw error;

      setShowDeleteModal(false);
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      console.error('Error deleting shared post:', err);
      showError('Failed to delete shared post. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handlePinToggle = async () => {
    if (!subredditId || moderatorActionLoading) return;

    setModeratorActionLoading(true);
    try {
      const { error } = await supabase.rpc('pin_heddit_post', {
        post_id: sharePost.id,
        should_pin: !sharePost.is_pinned
      });

      if (error) {
        console.error('Error toggling pin:', error);
        if (error.message?.includes('permission')) {
          showError('You do not have permission to pin posts in this community.');
        } else if (error.message?.includes('Maximum')) {
          showError('Maximum of 5 posts can be pinned at once in this community.');
        } else {
          showError('Failed to pin/unpin post. Please try again.');
        }
      } else {
        showSuccess(sharePost.is_pinned ? 'Post unpinned successfully' : 'Post pinned successfully');
        if (onUpdate) {
          onUpdate();
        }
      }
    } finally {
      setModeratorActionLoading(false);
      setShowModMenu(false);
    }
  };

  const handleModeratorDelete = async () => {
    if (moderatorActionLoading) return;

    setModeratorActionLoading(true);
    try {
      const { error } = await supabase
        .from('heddit_posts')
        .delete()
        .eq('id', sharePost.id);

      if (error) throw error;

      showSuccess('Post deleted successfully');
      if (onUpdate) {
        onUpdate();
      }
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      console.error('Error deleting shared post:', err);
      showError('Failed to delete post. Please try again.');
    } finally {
      setModeratorActionLoading(false);
      setConfirmModDelete(false);
      setShowModMenu(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!originalPost) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Share2 className="w-4 h-4" />
          <p className="text-sm">Original post has been deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      {/* Share commentary section */}
      {sharePost.share_text && (
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            {sharePost.heddit_accounts?.avatar_url ? (
              <img
                src={sharePost.heddit_accounts.avatar_url}
                alt={sharePost.heddit_accounts.username}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-sm font-medium text-orange-600">
                  {sharePost.heddit_accounts?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-900">
                    u/{sharePost.heddit_accounts?.username}
                  </span>
                  <span className="text-gray-500">shared this</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{formatTimeAgo(sharePost.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isOwnShare && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteModal(true);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors p-1"
                      title="Delete shared post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {showModeratorActions && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowModMenu(!showModMenu);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title="Moderator actions"
                      >
                        <MoreVertical size={16} className="text-gray-600" />
                      </button>

                      {showModMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowModMenu(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            {moderatorPermissions?.pin_posts && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePinToggle();
                                }}
                                disabled={moderatorActionLoading}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 text-sm disabled:opacity-50"
                              >
                                {sharePost.is_pinned ? (
                                  <>
                                    <PinOff size={16} className="text-orange-600" />
                                    <span>Unpin Post</span>
                                  </>
                                ) : (
                                  <>
                                    <Pin size={16} className="text-orange-600" />
                                    <span>Pin Post</span>
                                  </>
                                )}
                              </button>
                            )}

                            {moderatorPermissions?.delete_posts && (
                              <>
                                {!confirmModDelete ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmModDelete(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-50 text-sm text-red-600"
                                  >
                                    <Trash2 size={16} />
                                    <span>Delete Post</span>
                                  </button>
                                ) : (
                                  <div className="px-4 py-2 border-t">
                                    <p className="text-xs text-gray-600 mb-2">Delete this post?</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleModeratorDelete();
                                        }}
                                        disabled={moderatorActionLoading}
                                        className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                      >
                                        Delete
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmModDelete(false);
                                        }}
                                        className="flex-1 bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-300"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <HedditContentRenderer
                content={sharePost.share_text}
                className="text-gray-700 mt-1 whitespace-pre-wrap"
              />

              {/* Sharer's quality scores - compact version */}
              {(sharePost.heddit_accounts?.karma !== undefined ||
                sharePost.heddit_accounts?.kindness !== undefined ||
                sharePost.heddit_accounts?.quality_score !== undefined) && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
                  {sharePost.heddit_accounts?.karma !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{sharePost.heddit_accounts.karma}</span>
                      <span className="text-gray-400">Karma</span>
                    </div>
                  )}
                  {sharePost.heddit_accounts?.kindness !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                      <span className="font-medium">{sharePost.heddit_accounts.kindness}</span>
                      <span className="text-gray-400">Kindness</span>
                    </div>
                  )}
                  {sharePost.heddit_accounts?.quality_score !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Trophy className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                      <span className="font-medium">{sharePost.heddit_accounts.quality_score}</span>
                      <span className="text-gray-400">Quality</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share without commentary - show sharer info with quality scores */}
      {!sharePost.share_text && (
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {sharePost.heddit_accounts?.avatar_url ? (
                <img
                  src={sharePost.heddit_accounts.avatar_url}
                  alt={sharePost.heddit_accounts.username}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-orange-600">
                    {sharePost.heddit_accounts?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <span className="font-medium text-gray-900">
                u/{sharePost.heddit_accounts?.username}
              </span>
              <span className="text-gray-500">shared this</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{formatTimeAgo(sharePost.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              {isOwnShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Delete shared post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {showModeratorActions && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModMenu(!showModMenu);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Moderator actions"
                  >
                    <MoreVertical size={16} className="text-gray-600" />
                  </button>

                  {showModMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowModMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {moderatorPermissions?.pin_posts && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinToggle();
                            }}
                            disabled={moderatorActionLoading}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 text-sm disabled:opacity-50"
                          >
                            {sharePost.is_pinned ? (
                              <>
                                <PinOff size={16} className="text-orange-600" />
                                <span>Unpin Post</span>
                              </>
                            ) : (
                              <>
                                <Pin size={16} className="text-orange-600" />
                                <span>Pin Post</span>
                              </>
                            )}
                          </button>
                        )}

                        {moderatorPermissions?.delete_posts && (
                          <>
                            {!confirmModDelete ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmModDelete(true);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-50 text-sm text-red-600"
                              >
                                <Trash2 size={16} />
                                <span>Delete Post</span>
                              </button>
                            ) : (
                              <div className="px-4 py-2 border-t">
                                <p className="text-xs text-gray-600 mb-2">Delete this post?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleModeratorDelete();
                                    }}
                                    disabled={moderatorActionLoading}
                                    className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmModDelete(false);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quality scores for shares without commentary */}
          {(sharePost.heddit_accounts?.karma !== undefined ||
            sharePost.heddit_accounts?.kindness !== undefined ||
            sharePost.heddit_accounts?.quality_score !== undefined) && (
            <div className="flex items-center gap-3 mt-2">
              {sharePost.heddit_accounts?.karma !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{sharePost.heddit_accounts.karma}</span>
                  <span className="text-gray-400">Karma</span>
                </div>
              )}
              {sharePost.heddit_accounts?.kindness !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                  <span className="font-medium">{sharePost.heddit_accounts.kindness}</span>
                  <span className="text-gray-400">Kindness</span>
                </div>
              )}
              {sharePost.heddit_accounts?.quality_score !== undefined && (
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Trophy className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  <span className="font-medium">{sharePost.heddit_accounts.quality_score}</span>
                  <span className="text-gray-400">Quality</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Original post preview card - clickable */}
      <div
        onClick={handleClick}
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="w-3.5 h-3.5 text-gray-400" />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium hover:underline" onClick={(e) => {
              e.stopPropagation();
              navigate(`/heddit/h/${originalPost.heddit_subreddits.name}`);
            }}>
              h/{originalPost.heddit_subreddits.name}
            </span>
            <span>•</span>
            <span>Posted by</span>
            <span className="hover:underline" onClick={(e) => {
              e.stopPropagation();
              navigate(`/heddit/u/${originalPost.heddit_accounts.username}`);
            }}>
              u/{originalPost.heddit_accounts.username}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(originalPost.created_at)}</span>
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {originalPost.title}
        </h3>

        {originalPost.content && (
          <HedditContentRenderer
            content={originalPost.content}
            className="text-sm text-gray-700 line-clamp-3 mb-3 whitespace-pre-wrap"
          />
        )}

        {originalPost.type === 'link' && originalPost.url && (
          <div className="flex items-center gap-2 text-xs text-blue-600 mb-3">
            <span className="truncate">{originalPost.url}</span>
          </div>
        )}

        {originalPost.type === 'image' && originalPost.url && (
          <img
            src={originalPost.url}
            alt={originalPost.title}
            className="w-full max-h-64 object-cover rounded-lg mb-3"
          />
        )}

        {postTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {postTags.map((tag) => (
              <TagChip key={tag} tag={tag} size="sm" />
            ))}
          </div>
        )}

        {/* Engagement stats */}
        <div className="flex items-center gap-4 text-gray-500">
          <div className="flex items-center gap-1">
            <ArrowBigUp className="w-4 h-4" />
            <span className="text-xs font-medium">
              {originalPost.like_count - originalPost.dislike_count}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium">
              {originalPost.comment_count} comments
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="w-4 h-4" />
            <span className="text-xs font-medium">
              {originalPost.share_count} shares
            </span>
          </div>
        </div>
      </div>

      {!sharePost.share_text && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Share2 className="w-3.5 h-3.5" />
              <span>Shared by</span>
              <span className="font-medium text-gray-700 hover:underline cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                navigate(`/heddit/u/${sharePost.heddit_accounts?.username}`);
              }}>
                u/{sharePost.heddit_accounts?.username}
              </span>
              <span>•</span>
              <span>{formatTimeAgo(sharePost.created_at)}</span>
            </div>
            <div className="flex items-center gap-1">
              {isOwnShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Delete shared post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {showModeratorActions && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModMenu(!showModMenu);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Moderator actions"
                  >
                    <MoreVertical size={16} className="text-gray-600" />
                  </button>

                  {showModMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowModMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        {moderatorPermissions?.pin_posts && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinToggle();
                            }}
                            disabled={moderatorActionLoading}
                            className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 text-sm disabled:opacity-50"
                          >
                            {sharePost.is_pinned ? (
                              <>
                                <PinOff size={16} className="text-orange-600" />
                                <span>Unpin Post</span>
                              </>
                            ) : (
                              <>
                                <Pin size={16} className="text-orange-600" />
                                <span>Pin Post</span>
                              </>
                            )}
                          </button>
                        )}

                        {moderatorPermissions?.delete_posts && (
                          <>
                            {!confirmModDelete ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmModDelete(true);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-50 text-sm text-red-600"
                              >
                                <Trash2 size={16} />
                                <span>Delete Post</span>
                              </button>
                            ) : (
                              <div className="px-4 py-2 border-t">
                                <p className="text-xs text-gray-600 mb-2">Delete this post?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleModeratorDelete();
                                    }}
                                    disabled={moderatorActionLoading}
                                    className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmModDelete(false);
                                    }}
                                    className="flex-1 bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <ConfirmationDialog
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteShare}
          title="Delete Shared Post"
          message="Are you sure you want to delete this shared post? The original post will remain intact. This action cannot be undone."
          confirmText={deleting ? "Deleting..." : "Delete"}
          confirmStyle="danger"
        />
      )}
    </div>
  );
}
