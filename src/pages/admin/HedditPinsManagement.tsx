import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Pin, X, Search, Calendar, User, MessageCircle, ArrowLeft, AlertCircle } from 'lucide-react';

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

export default function HedditPinsManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<HedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pinningPostId, setPinningPostId] = useState<string | null>(null);
  const [hasHedditAccount, setHasHedditAccount] = useState(true);
  const [adminAccountId, setAdminAccountId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [user]);

  const loadPosts = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: accountData } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!accountData) {
        setHasHedditAccount(false);
        setLoading(false);
        return;
      }

      setAdminAccountId(accountData.id);

      const { data, error } = await supabase
        .from('heddit_posts')
        .select(`
          id,
          title,
          content,
          type,
          like_count,
          comment_count,
          created_at,
          is_pinned,
          pinned_at,
          subreddit:heddit_subreddits!subreddit_id (
            name,
            display_name
          ),
          author:heddit_accounts!author_id (
            username,
            display_name
          )
        `)
        .eq('author_id', accountData.id)
        .eq('status', 'active')
        .eq('is_draft', false)
        .order('is_pinned', { ascending: false })
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

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
        await loadPosts();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    } finally {
      setPinningPostId(null);
    }
  };

  const filteredPosts = posts.filter(post => {
    const searchLower = searchTerm.toLowerCase();
    return (
      post.title.toLowerCase().includes(searchLower) ||
      post.content?.toLowerCase().includes(searchLower) ||
      post.subreddit?.name.toLowerCase().includes(searchLower)
    );
  });

  const pinnedPosts = filteredPosts.filter(p => p.is_pinned);
  const unpinnedPosts = filteredPosts.filter(p => !p.is_pinned);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (!content || content.length <= maxLength) return content || '';
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading posts...</div>
      </div>
    );
  }

  if (!hasHedditAccount) {
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
          <div className="bg-white rounded-lg border border-amber-200 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Heddit Account Found</h2>
            <p className="text-gray-600">
              You need a Heddit account to pin posts to the platform feed. Join Heddit first, then create posts from your account to pin them here.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-gray-600">Pin your own Heddit posts to appear at the top of the main Heddit feed for all users</p>
        </div>

        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Pin className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            Only your own Heddit posts are shown here. Pinned posts appear at the top of the main Heddit feed platform-wide with a "Pinned by Admin" badge. Up to 5 posts can be pinned at once.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search your posts by title, content, or community..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
            <Pin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 mb-1">No posts yet</p>
            <p className="text-sm">Create posts on your Heddit account first, then return here to pin them to the platform feed.</p>
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Pin className="w-5 h-5 text-orange-600" />
                  Pinned Posts ({pinnedPosts.length}/5)
                </h2>
                <div className="space-y-4">
                  {pinnedPosts.map(post => (
                    <div
                      key={post.id}
                      className="bg-white border-2 border-orange-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <Pin className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                              {post.content && (
                                <p className="text-gray-600 mb-4">{truncateContent(post.content)}</p>
                              )}

                              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                {post.subreddit && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold">h/{post.subreddit.name}</span>
                                  </div>
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
                                  <span>Created {formatDate(post.created_at)}</span>
                                </div>
                                {post.pinned_at && (
                                  <div className="flex items-center gap-1 text-orange-600">
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
                          disabled={pinningPostId === post.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                          <X className="w-4 h-4" />
                          Unpin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Your Posts
              </h2>
              {unpinnedPosts.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
                  {searchTerm ? 'No posts match your search' : 'All your posts are currently pinned'}
                </div>
              ) : (
                <div className="space-y-4">
                  {unpinnedPosts.map(post => (
                    <div
                      key={post.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                          {post.content && (
                            <p className="text-gray-600 mb-4">{truncateContent(post.content)}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {post.subreddit && (
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">h/{post.subreddit.name}</span>
                              </div>
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
                              <span>Created {formatDate(post.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => togglePin(post.id, post.is_pinned)}
                          disabled={pinningPostId === post.id || pinnedPosts.length >= 5}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                          title={pinnedPosts.length >= 5 ? 'Maximum 5 posts can be pinned at once' : ''}
                        >
                          <Pin className="w-4 h-4" />
                          Pin
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
