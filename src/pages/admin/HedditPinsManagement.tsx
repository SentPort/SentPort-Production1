import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Pin, X, Search, Calendar, User, MessageCircle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface HedditPost {
  id: string;
  title: string;
  content: string;
  type: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  subreddit?: {
    name: string;
    display_name: string;
  };
  author?: {
    username: string;
    display_name: string;
  };
}

const PAGE_SIZE = 25;

export default function HedditPinsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pinnedPosts, setPinnedPosts] = useState<HedditPost[]>([]);
  const [posts, setPosts] = useState<HedditPost[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pinningPostId, setPinningPostId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadPinnedPosts = useCallback(async () => {
    const { data } = await supabase
      .from('heddit_posts')
      .select(`
        id, title, content, type, like_count, comment_count, created_at, is_pinned, pinned_at,
        subreddit:heddit_subreddits!subreddit_id (name, display_name),
        author:heddit_accounts!author_id (username, display_name)
      `)
      .eq('is_pinned', true)
      .eq('status', 'active')
      .eq('is_draft', false)
      .order('pinned_at', { ascending: false });

    setPinnedPosts(data || []);
  }, []);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      let query = supabase
        .from('heddit_posts')
        .select(`
          id, title, content, type, like_count, comment_count, created_at, is_pinned, pinned_at,
          subreddit:heddit_subreddits!subreddit_id (name, display_name),
          author:heddit_accounts!author_id (username, display_name)
        `, { count: 'exact' })
        .eq('status', 'active')
        .eq('is_draft', false)
        .eq('is_pinned', false);

      if (debouncedSearch.trim()) {
        query = query.or(
          `title.ilike.%${debouncedSearch}%,content.ilike.%${debouncedSearch}%`
        );
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) throw error;

      setPosts(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, page, debouncedSearch]);

  useEffect(() => {
    loadPinnedPosts();
  }, [loadPinnedPosts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const togglePin = async (postId: string, currentlyPinned: boolean) => {
    try {
      setPinningPostId(postId);

      const { error } = await supabase.rpc('pin_heddit_post_admin', {
        post_id: postId,
        should_pin: !currentlyPinned
      });

      if (error) {
        if (error.message.includes('Maximum of 5')) {
          alert('You can only pin up to 5 posts at a time. Please unpin another post first.');
        } else {
          throw error;
        }
      } else {
        await Promise.all([loadPinnedPosts(), loadPosts()]);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    } finally {
      setPinningPostId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength = 200) => {
    if (!content || content.length <= maxLength) return content || '';
    return content.substring(0, maxLength) + '...';
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderPostCard = (post: HedditPost, pinned: boolean) => (
    <div
      key={post.id}
      className={`bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow ${
        pinned ? 'border-2 border-orange-200' : 'border border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-3">
            {pinned && <Pin className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{post.title}</h3>
              {post.content && (
                <p className="text-gray-600 mb-4 text-sm">{truncateContent(post.content)}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                {post.subreddit && (
                  <span className="font-semibold text-orange-700">h/{post.subreddit.name}</span>
                )}
                {post.author && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>u/{post.author.username}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comment_count || 0} comments</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(post.created_at)}</span>
                </div>
                {post.pinned_at && (
                  <div className="flex items-center gap-1 text-orange-600 font-medium">
                    <Pin className="w-4 h-4" />
                    <span>Pinned {formatDate(post.pinned_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => togglePin(post.id, post.is_pinned)}
          disabled={pinningPostId === post.id || (!pinned && pinnedPosts.length >= 5)}
          className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            pinned
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
          title={!pinned && pinnedPosts.length >= 5 ? 'Maximum 5 posts can be pinned at once' : ''}
        >
          {pinned ? (
            <><X className="w-4 h-4" /> Unpin</>
          ) : (
            <><Pin className="w-4 h-4" /> Pin</>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/admin/pins-management')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Manage Pinned Content
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Heddit Pinned Posts Management</h1>
          <p className="text-gray-600">Pin any Heddit post to appear at the top of the main Heddit feed for all users</p>
        </div>

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Pin className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            You can pin any post from any Heddit user to the platform-wide feed. Pinned posts appear at the top of the main Heddit feed with a "Pinned by Admin" badge. Up to 5 posts can be pinned at once.
          </p>
        </div>

        {pinnedPosts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Pin className="w-5 h-5 text-orange-600" />
              Currently Pinned ({pinnedPosts.length}/5)
            </h2>
            <div className="space-y-4">
              {pinnedPosts.map(post => renderPostCard(post, true))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-semibold text-gray-900">All Posts</h2>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by title or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
              <Pin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">
                {debouncedSearch ? 'No posts match your search' : 'No posts found'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {posts.map(post => renderPostCard(post, false))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-gray-600">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} posts
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 px-2">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
