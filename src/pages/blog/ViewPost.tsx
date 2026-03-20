import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, MessageCircle, Send, Calendar, Pin, Users, ChevronLeft, ChevronRight, List, Share2, Flag, MoreHorizontal, Trash2 } from 'lucide-react';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformBackButton from '../../components/shared/PlatformBackButton';
import ReportContentModal from '../../components/shared/ReportContentModal';
import BookmarkButton from '../../components/blog/BookmarkButton';
import AddToCollectionButton from '../../components/blog/AddToCollectionButton';
import FollowButton from '../../components/blog/FollowButton';
import ReactionButton from '../../components/blog/ReactionButton';
import BlogShareModal from '../../components/blog/BlogShareModal';
import DeleteBlogPostModal from '../../components/blog/DeleteBlogPostModal';
import AdminDeleteWarningModal from '../../components/blog/AdminDeleteWarningModal';
import { useBlogReadingTracker } from '../../hooks/useBlogReadingTracker';
import PlatformGuard from '../../components/shared/PlatformGuard';
import { splitContentIntoPages, extractHeadings, shouldShowTableOfContents, type PageContent } from '../../lib/blogPaginationHelpers';

export default function ViewPost() {
  return (
    <PlatformGuard platform="blog">
      <ViewPostContent />
    </PlatformGuard>
  );
}

function ViewPostContent() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [coAuthors, setCoAuthors] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [reactionCounts, setReactionCounts] = useState({ like: 0, love: 0, insightful: 0, inspiring: 0, thoughtful: 0, helpful: 0, mindblown: 0 });
  const [pages, setPages] = useState<PageContent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTOC, setShowTOC] = useState(false);
  const [headings, setHeadings] = useState<{ text: string; level: number; id: string }[]>([]);
  const [currentUserBlogAccountId, setCurrentUserBlogAccountId] = useState<string | null>(null);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [isAdminOverride, setIsAdminOverride] = useState(false);

  const pageNumber = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    if (pageNumber !== currentPage && pageNumber > 0 && pageNumber <= pages.length) {
      setCurrentPage(pageNumber);
    }
  }, [pageNumber, pages.length]);

  useBlogReadingTracker({
    postId: postId || '',
    userId: user?.id || null,
    wordCount: post?.word_count || 0,
    estimatedReadMinutes: post?.estimated_read_minutes || 0,
    currentPage,
    totalPages: pages.length
  });

  useEffect(() => {
    if (postId) {
      loadPost();
      loadCoAuthors();
      loadEngagementCounts();
    }
  }, [postId, user]);

  useEffect(() => {
    if (!post) return;

    // Admin can always delete, regardless of blog account
    if (isAdmin) {
      console.log('[ViewPost] Admin detected, granting delete permission');
      setIsAuthor(true);
      return;
    }

    // For non-admins, check if they have a blog account and are author/co-author
    if (currentUserBlogAccountId) {
      const isPrimaryAuthor = post.account_id === currentUserBlogAccountId;
      const isCoAuthor = coAuthors.some((author: any) => author.user_profiles?.id === currentUserBlogAccountId);
      const canDelete = isPrimaryAuthor || isCoAuthor;
      console.log('[ViewPost] Delete permission check:', { isPrimaryAuthor, isCoAuthor, canDelete, currentUserBlogAccountId });
      setIsAuthor(canDelete);
    } else {
      setIsAuthor(false);
    }
  }, [post, isAdmin, currentUserBlogAccountId, coAuthors]);

  useEffect(() => {
    if (user) {
      loadCurrentUserBlogAccount();
    }
  }, [user]);

  const loadCurrentUserBlogAccount = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blog_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setCurrentUserBlogAccountId(data?.id || null);
    } catch (err) {
      console.error('Error loading blog account:', err);
    }
  };

  useEffect(() => {
    if (!postId) return;

    const commentChannel = supabase
      .channel(`blog_comments_${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blog_comments',
          filter: `post_id=eq.${postId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    const metricsChannel = supabase
      .channel(`blog_metrics_${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blog_feed_metrics',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          setPost(currentPost => {
            if (!currentPost) return currentPost;
            return {
              ...currentPost,
              blog_feed_metrics: [payload.new]
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [postId]);

  const loadEngagementCounts = async () => {
    if (!postId) return;

    try {
      const { count: hubookShares } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('shared_from_platform', 'hublog')
        .eq('shared_from_content_type', 'post')
        .eq('shared_from_content_id', postId);

      const { count: switterShares } = await supabase
        .from('switter_tweets')
        .select('*', { count: 'exact', head: true })
        .eq('shared_from_platform', 'hublog')
        .eq('shared_from_content_type', 'post')
        .eq('shared_from_content_id', postId);

      const { data: postData } = await supabase
        .from('blog_posts')
        .select('like_count, love_count, insightful_count, inspiring_count, thoughtful_count, helpful_count, mindblown_count')
        .eq('id', postId)
        .single();

      if (postData) {
        setReactionCounts({
          like: postData.like_count || 0,
          love: postData.love_count || 0,
          insightful: postData.insightful_count || 0,
          inspiring: postData.inspiring_count || 0,
          thoughtful: postData.thoughtful_count || 0,
          helpful: postData.helpful_count || 0,
          mindblown: postData.mindblown_count || 0
        });
      }

      setShareCount((hubookShares || 0) + (switterShares || 0));
    } catch (error) {
      console.error('Error loading engagement counts:', error);
    }
  };

  const loadPost = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_accounts (username, display_name, avatar_url, bio),
          blog_feed_metrics (total_views_30d, total_comments_30d, engagement_score)
        `)
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      if (!postData) {
        navigate('/blog/feed');
        return;
      }

      setPost(postData);

      const pageBreaks = postData.page_breaks || [];
      const pagesData = splitContentIntoPages(postData.content, pageBreaks);
      setPages(pagesData);

      if (shouldShowTableOfContents(postData.word_count || 0)) {
        const extractedHeadings = extractHeadings(postData.content);
        setHeadings(extractedHeadings);
      }

      recordView();
      loadComments();
    } catch (err) {
      console.error('Error loading post:', err);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      await supabase.from('blog_views').insert({
        post_id: postId,
        viewer_id: user?.id || null
      });
    } catch (err) {
      console.error('Error recording view:', err);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .select(`
          *,
          blog_accounts (username, display_name, avatar_url)
        `)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  const loadCoAuthors = async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from('blog_post_authors')
        .select(`
          role,
          user_profiles:author_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', postId);

      if (error) throw error;
      setCoAuthors(data || []);
    } catch (err) {
      console.error('Error loading co-authors:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    setCommentError('');

    try {
      const { data: blogAccount, error: accountError } = await supabase
        .from('blog_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (accountError) throw accountError;

      if (!blogAccount) {
        setCommentError('You need to join HuBlog before commenting. Please visit the HuBlog feed first.');
        return;
      }

      const { error } = await supabase.from('blog_comments').insert({
        post_id: postId,
        account_id: blogAccount.id,
        content: newComment.trim()
      });

      if (error) throw error;

      setNewComment('');
      await loadComments();
    } catch (err) {
      console.error('Error submitting comment:', err);
      setCommentError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      const { error } = await supabase
        .from('blog_comments')
        .delete()
        .eq('id', commentToDelete);

      if (error) throw error;

      setCommentToDelete(null);
      setOpenMenuCommentId(null);
      await loadComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!postId) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase
        .rpc('delete_blog_post_with_cascade', { p_post_id: postId });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete post');
      }

      navigate('/blog/my-posts', { replace: true });
    } catch (err: any) {
      console.error('Error deleting post:', err);
      console.error('Error message:', err?.message);
      console.error('Error details:', JSON.stringify(err, null, 2));
      alert(`Failed to delete post: ${err?.message || 'Unknown error'}. Please try again.`);
      setIsDeleting(false);
      setShowDeletePostModal(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pages.length) return;
    setCurrentPage(newPage);
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentPageContent = pages[currentPage - 1]?.content || post?.content || '';

  if (loading) {
    return (
      <BlogLayout showCreateButton={false}>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      </BlogLayout>
    );
  }

  if (!post) {
    return (
      <BlogLayout showCreateButton={false}>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Post Not Found</h2>
            <button
              onClick={() => navigate('/blog/feed')}
              className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors shadow-lg hover:shadow-emerald-500/50"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout showCreateButton={false}>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4 relative overflow-hidden">
        {/* Ambient blur orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="mb-6">
            <PlatformBackButton fallbackPath="/blog" />
          </div>

        <article className={`bg-slate-800/70 backdrop-blur-md rounded-lg shadow-lg border border-slate-600/50 p-8 mb-6 ${post.is_pinned ? 'border-2 border-emerald-400' : ''}`}>
          {post.is_pinned && (
            <div className="flex items-center gap-2 mb-4 bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/30">
              <Pin className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">
                Pinned by Admin
                {post.pinned_at && ` • ${new Date(post.pinned_at).toLocaleDateString()}`}
              </span>
            </div>
          )}

          <div className="flex items-start gap-4 mb-6">
            <Link
              to={`/blog/profile/${post.blog_accounts?.username}`}
              className="hover:opacity-80 transition-opacity flex-shrink-0"
            >
              {post.blog_accounts?.avatar_url ? (
                <img
                  src={post.blog_accounts.avatar_url}
                  alt={post.blog_accounts.display_name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-transparent hover:ring-emerald-400 transition-all"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center ring-2 ring-transparent hover:ring-emerald-400 transition-all">
                  <span className="text-emerald-400 font-bold text-2xl">
                    {post.blog_accounts?.display_name?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </Link>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-white mb-2 flex-1">{post.title}</h1>
                {isAuthor && (
                  <div className="relative">
                    <button
                      onClick={() => setShowPostMenu(!showPostMenu)}
                      className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                      aria-label="Post options"
                    >
                      <MoreHorizontal className="w-5 h-5 text-gray-400" />
                    </button>
                    {showPostMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowPostMenu(false)}
                        />
                        <div className="absolute right-0 top-12 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 min-w-[140px]">
                          <button
                            onClick={() => {
                              // Check if this is an admin deletion
                              if (isAdmin) {
                                const isPrimaryAuthor = currentUserBlogAccountId && post.account_id === currentUserBlogAccountId;
                                const isCoAuthor = currentUserBlogAccountId && coAuthors.some((author: any) => author.user_profiles?.id === currentUserBlogAccountId);
                                const isAdminDeletion = !isPrimaryAuthor && !isCoAuthor;
                                console.log('[ViewPost] Delete button clicked:', { isAdmin, isPrimaryAuthor, isCoAuthor, isAdminDeletion });
                                setIsAdminOverride(isAdminDeletion);
                              } else {
                                setIsAdminOverride(false);
                              }
                              setShowDeletePostModal(true);
                              setShowPostMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-slate-700 transition-colors text-left rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-medium">Delete Post</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <Link
                  to={`/blog/profile/${post.blog_accounts?.username}`}
                  className="font-medium hover:text-emerald-400 transition-colors"
                >
                  {post.blog_accounts?.display_name}
                </Link>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
              {post.blog_accounts?.bio && (
                <p className="text-sm text-gray-400 mt-2">{post.blog_accounts.bio}</p>
              )}
            </div>
          </div>

          {coAuthors.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-purple-400">Collaborative Post</h3>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                This post was created through collaboration with:
              </p>
              <div className="flex flex-wrap gap-3">
                {coAuthors.map((coAuthor: any) => (
                  <Link
                    key={coAuthor.user_profiles.id}
                    to={`/blog/profile/${coAuthor.user_profiles.username}`}
                    className="flex items-center gap-2 bg-slate-700/50 rounded-full px-3 py-1.5 border border-slate-600 hover:bg-slate-600/50 hover:border-purple-400 transition-all"
                  >
                    {coAuthor.user_profiles.avatar_url ? (
                      <img
                        src={coAuthor.user_profiles.avatar_url}
                        alt={coAuthor.user_profiles.display_name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 font-semibold text-xs">
                          {coAuthor.user_profiles.display_name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-white font-medium hover:text-purple-300 transition-colors">
                      {coAuthor.user_profiles.display_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({coAuthor.role})
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-400 mb-6 pb-6 border-b border-slate-600/50">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{post.view_count || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{comments.length} comments</span>
            </div>
          </div>

          {headings.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <List className="w-5 h-5" />
                <span className="font-medium">
                  {showTOC ? 'Hide' : 'Show'} Table of Contents
                </span>
              </button>
              {showTOC && (
                <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3">Contents</h3>
                  <ul className="space-y-2">
                    {headings.map((heading, idx) => (
                      <li
                        key={idx}
                        style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                      >
                        <a
                          href={`#${heading.id}`}
                          className="text-gray-300 hover:text-emerald-400 transition-colors text-sm"
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="prose max-w-none">
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-lg">
              {currentPageContent}
            </p>
          </div>

          {pages.length > 1 && (
            <div className="mt-8 pt-6 border-t border-slate-600/50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-gray-300 font-medium">
                  Page {currentPage} of {pages.length}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pages.length}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 justify-center mt-4">
                {Array.from({ length: pages.length }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded ${
                      page === currentPage
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    } transition-colors`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-6 mt-6 border-t border-slate-600/50 flex-wrap">
            <ReactionButton
              postId={post.id}
              initialCounts={reactionCounts}
              onReactionChange={loadEngagementCounts}
              variant="default"
            />
            <button
              onClick={() => {
                const commentsSection = document.getElementById('comments-section');
                commentsSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-gray-300"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{comments.length}</span>
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-gray-300"
            >
              <Share2 className="w-5 h-5" />
              <span>{shareCount}</span>
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-gray-300"
            >
              <Flag className="w-5 h-5" />
              <span className="text-sm">Report</span>
            </button>
            <BookmarkButton
              postId={post.id}
              onBookmarkChange={loadPost}
            />
            <AddToCollectionButton postId={post.id} />
            {user && user.id !== post.account_id && (
              <div className="ml-auto">
                <FollowButton
                  authorId={post.account_id}
                  authorUsername={post.blog_accounts?.username}
                  variant="compact"
                />
              </div>
            )}
          </div>
        </article>

        <div id="comments-section" className="bg-slate-800/70 backdrop-blur-md rounded-lg shadow-lg border border-slate-600/50 p-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Comments ({comments.length})
          </h2>

          {user ? (
            <form onSubmit={handleSubmitComment} className="mb-8">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                rows={3}
              />
              {commentError && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{commentError}</p>
                </div>
              )}
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-lg hover:shadow-emerald-500/50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 mb-8 text-center">
              <p className="text-gray-300 mb-3">
                Sign in to leave a comment
              </p>
              <button
                onClick={() => navigate('/signin')}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium shadow-lg hover:shadow-emerald-500/50"
              >
                Sign In
              </button>
            </div>
          )}

          <div className="space-y-6">
            {comments.map((comment) => {
              const isOwnComment = currentUserBlogAccountId && comment.account_id === currentUserBlogAccountId;
              const isMenuOpen = openMenuCommentId === comment.id;

              return (
                <div key={comment.id} className="flex gap-4">
                  {comment.blog_accounts?.avatar_url ? (
                    <img
                      src={comment.blog_accounts.avatar_url}
                      alt={comment.blog_accounts.display_name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-300 font-bold">
                        {comment.blog_accounts?.display_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-white">
                          {comment.blog_accounts?.display_name}
                        </p>
                        {isOwnComment && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuCommentId(isMenuOpen ? null : comment.id)}
                              className="p-1 hover:bg-slate-600/50 rounded transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4 text-gray-400" />
                            </button>
                            {isMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setOpenMenuCommentId(null)}
                                />
                                <div className="absolute right-0 top-8 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 min-w-[120px]">
                                  <button
                                    onClick={() => {
                                      setCommentToDelete(comment.id);
                                      setOpenMenuCommentId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-slate-700 transition-colors text-left"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="text-sm">Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-4">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}

            {comments.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-gray-300">
                  No comments yet. Be the first to share your thoughts!
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {showReportModal && (
        <ReportContentModal
          platform="hublog"
          contentType="post"
          contentId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showShareModal && post && (
        <BlogShareModal
          post={post}
          onClose={() => setShowShareModal(false)}
          onShareSuccess={loadEngagementCounts}
        />
      )}

      {commentToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">Delete Comment</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCommentToDelete(null)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteComment}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePostModal && (
        isAdminOverride ? (
          <AdminDeleteWarningModal
            postTitle={post.title}
            authorName={post.blog_accounts?.display_name || 'Unknown'}
            onConfirm={handleDeletePost}
            onCancel={() => {
              setShowDeletePostModal(false);
              setIsAdminOverride(false);
            }}
            isDeleting={isDeleting}
          />
        ) : (
          <DeleteBlogPostModal
            onConfirm={handleDeletePost}
            onCancel={() => setShowDeletePostModal(false)}
            isDeleting={isDeleting}
          />
        )
      )}
    </BlogLayout>
  );
}
