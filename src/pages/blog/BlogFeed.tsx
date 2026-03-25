import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Info, CheckCircle2, BookOpen } from 'lucide-react';
import DiscoveryPostCard from '../../components/blog/DiscoveryPostCard';
import BlogWheel from '../../components/blog/BlogWheel';
import BlogSidebar from '../../components/blog/BlogSidebar';
import BlogRightSidebar from '../../components/blog/BlogRightSidebar';
import BlogHeader from '../../components/blog/BlogHeader';
import PlatformGuard from '../../components/shared/PlatformGuard';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

export default function BlogFeed() {
  return (
    <ErrorBoundary fallbackPath="/blog" fallbackMessage="We encountered an issue loading your HuBlog feed. Please try refreshing the page.">
      <PlatformGuard platform="blog">
        <BlogFeedContent />
      </PlatformGuard>
    </ErrorBoundary>
  );
}

function BlogFeedContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [discoveryPosts, setDiscoveryPosts] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track user ID to prevent unnecessary reloads on auth token refresh
  const lastUserIdRef = useRef<string | null>(null);
  const loadingFeedRef = useRef(false);

  const loadPinnedPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_accounts (username, display_name, avatar_url),
          blog_feed_metrics (quality_score, engagement_score, total_views_30d, total_comments_30d, emotional_reaction_multiplier, completion_rate, content_length_multiplier)
        `)
        .eq('is_pinned', true)
        .eq('status', 'published')
        .order('pinned_at', { ascending: false });

      if (error) throw error;

      setPinnedPosts(data || []);
    } catch (err) {
      console.error('Error loading pinned posts:', err);
      setPinnedPosts([]);
    }
  }, []);

  const loadDiscoveryPosts = useCallback(async (userId: string) => {
    if (!userId) return;

    try {
      const { data: isDue } = await supabase.rpc('check_discovery_injection_due', {
        p_user_id: userId
      });

      if (!isDue) {
        return;
      }

      const { data: selectedPosts, error: selectError } = await supabase.rpc(
        'select_discovery_posts_for_user',
        { p_user_id: userId }
      );

      if (selectError) throw selectError;

      if (!selectedPosts || selectedPosts.length === 0) {
        return;
      }

      const postIds = selectedPosts.map((p: any) => p.post_id);
      const interestIds = selectedPosts.map((p: any) => p.interest_id);
      const interestNames = selectedPosts.map((p: any) => p.interest_name);

      const { data: fullPosts } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_accounts (username, display_name, avatar_url),
          blog_feed_metrics (quality_score, engagement_score, total_views_30d, total_comments_30d, emotional_reaction_multiplier, completion_rate, content_length_multiplier)
        `)
        .in('id', postIds);

      if (fullPosts && fullPosts.length > 0) {
        const postsWithInterests = fullPosts.map((post, idx) => ({
          ...post,
          is_discovery: true,
          interest_name: selectedPosts.find((sp: any) => sp.post_id === post.id)?.interest_name
        }));

        setDiscoveryPosts(postsWithInterests);

        await supabase.rpc('record_discovery_injection', {
          p_user_id: userId,
          p_post_ids: postIds,
          p_interest_ids: interestIds,
          p_interest_names: interestNames
        });
      }
    } catch (err) {
      console.error('Error loading discovery posts:', err);
      setDiscoveryPosts([]);
    }
  }, []);

  const loadPublicFeed = useCallback(async () => {
    try {
      await supabase.rpc('refresh_blog_feed_metrics');

      await loadPinnedPosts();

      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_accounts (username, display_name, avatar_url),
          blog_feed_metrics (quality_score, engagement_score, total_views_30d, total_comments_30d, emotional_reaction_multiplier, completion_rate, content_length_multiplier)
        `)
        .eq('status', 'published')
        .eq('privacy', 'public')
        .eq('is_pinned', false)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const sortedPosts = (data || []).sort((a, b) => {
        const scoreA = a?.blog_feed_metrics?.[0]?.quality_score || 0;
        const scoreB = b?.blog_feed_metrics?.[0]?.quality_score || 0;
        return scoreB - scoreA;
      });

      setPosts(sortedPosts);
    } catch (err) {
      console.error('Error loading public feed:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [loadPinnedPosts]);

  const loadPersonalizedFeed = useCallback(async (interests: string[], userId: string) => {
    try {
      await supabase.rpc('refresh_blog_feed_metrics');

      await loadPinnedPosts();

      if (userId) {
        await loadDiscoveryPosts(userId);
      }

      const { data: interestData } = await supabase
        .from('blog_interests')
        .select('id')
        .in('name', interests);

      const interestIds = interestData?.map(i => i.id) || [];

      let matchedPosts: any[] = [];
      if (interestIds.length > 0) {
        const { data: postInterests } = await supabase
          .from('blog_post_interests')
          .select('post_id')
          .in('interest_id', interestIds);

        const postIds = [...new Set(postInterests?.map(pi => pi.post_id) || [])];

        if (postIds.length > 0) {
          const { data } = await supabase
            .from('blog_posts')
            .select(`
              *,
              blog_accounts (username, display_name, avatar_url),
              blog_feed_metrics (quality_score, engagement_score, total_views_30d, total_comments_30d, emotional_reaction_multiplier, completion_rate, content_length_multiplier)
            `)
            .in('id', postIds)
            .eq('status', 'published')
            .eq('privacy', 'public')
            .eq('is_pinned', false)
            .order('created_at', { ascending: false })
            .limit(50);

          matchedPosts = data || [];
        }
      }

      if (matchedPosts.length < 20) {
        const { data: backfillData } = await supabase
          .from('blog_posts')
          .select(`
            *,
            blog_accounts (username, display_name, avatar_url),
            blog_feed_metrics (quality_score, engagement_score, total_views_30d, total_comments_30d, emotional_reaction_multiplier, completion_rate, content_length_multiplier)
          `)
          .eq('status', 'published')
          .eq('privacy', 'public')
          .eq('is_pinned', false)
          .order('created_at', { ascending: false })
          .limit(30);

        const backfillPosts = (backfillData || []).filter(
          p => !matchedPosts.find(mp => mp.id === p.id)
        );

        matchedPosts = [...matchedPosts, ...backfillPosts];
      }

      const sortedPosts = matchedPosts.sort((a, b) => {
        const scoreA = a?.blog_feed_metrics?.[0]?.quality_score || 0;
        const scoreB = b?.blog_feed_metrics?.[0]?.quality_score || 0;
        return scoreB - scoreA;
      });

      setPosts(sortedPosts.slice(0, 30));
    } catch (err) {
      console.error('Error loading personalized feed:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [loadPinnedPosts, loadDiscoveryPosts]);

  const loadFeed = useCallback(async (userId: string | null) => {
    if (loadingFeedRef.current) return;
    loadingFeedRef.current = true;

    try {
      if (!userId) {
        await loadPublicFeed();
        return;
      }

      const { data, error } = await supabase
        .from('blog_accounts')
        .select('interests')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserInterests(data.interests || []);
        await loadPersonalizedFeed(data.interests || [], userId);
      } else {
        await loadPublicFeed();
      }
    } catch (err) {
      console.error('Error loading feed:', err);
      await loadPublicFeed();
    } finally {
      loadingFeedRef.current = false;
    }
  }, [loadPublicFeed, loadPersonalizedFeed]);

  // Load feed only when user ID actually changes (not on token refresh)
  useEffect(() => {
    const currentUserId = user?.id || null;

    // Only reload if the user ID actually changed
    if (lastUserIdRef.current !== currentUserId) {
      lastUserIdRef.current = currentUserId;
      loadFeed(currentUserId);
    }

    if (location.state?.justJoined) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [user?.id, loadFeed, location.state]);

  useEffect(() => {
    const metricsChannel = supabase
      .channel('blog_feed_metrics_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blog_feed_metrics'
        },
        (payload) => {
          try {
            const updatedMetrics = payload.new;
            if (!updatedMetrics || !updatedMetrics.post_id) return;

            const updatePostMetrics = (post: any) => {
              if (post && post.id === updatedMetrics.post_id) {
                return {
                  ...post,
                  blog_feed_metrics: [{
                    ...updatedMetrics
                  }]
                };
              }
              return post;
            };

            setPosts(currentPosts =>
              Array.isArray(currentPosts) ? currentPosts.map(updatePostMetrics) : []
            );

            setPinnedPosts(currentPinnedPosts =>
              Array.isArray(currentPinnedPosts) ? currentPinnedPosts.map(updatePostMetrics) : []
            );

            setDiscoveryPosts(currentDiscoveryPosts =>
              Array.isArray(currentDiscoveryPosts) ? currentDiscoveryPosts.map(updatePostMetrics) : []
            );
          } catch (err) {
            console.error('Error updating feed metrics:', err);
          }
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('blog_comments_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blog_comments'
        },
        async (payload) => {
          try {
            const newComment = payload.new;
            if (!newComment || !newComment.post_id) return;

            const { data: updatedMetrics, error } = await supabase
              .from('blog_feed_metrics')
              .select('*')
              .eq('post_id', newComment.post_id)
              .maybeSingle();

            if (error) {
              console.error('Error fetching updated metrics:', error);
              return;
            }

            if (updatedMetrics) {
              const updatePostMetrics = (post: any) => {
                if (post && post.id === newComment.post_id) {
                  return {
                    ...post,
                    blog_feed_metrics: [updatedMetrics]
                  };
                }
                return post;
              };

              setPosts(currentPosts =>
                Array.isArray(currentPosts) ? currentPosts.map(updatePostMetrics) : []
              );

              setPinnedPosts(currentPinnedPosts =>
                Array.isArray(currentPinnedPosts) ? currentPinnedPosts.map(updatePostMetrics) : []
              );

              setDiscoveryPosts(currentDiscoveryPosts =>
                Array.isArray(currentDiscoveryPosts) ? currentDiscoveryPosts.map(updatePostMetrics) : []
              );
            }
          } catch (err) {
            console.error('Error handling comment insertion:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'blog_comments'
        },
        async (payload) => {
          try {
            const deletedComment = payload.old;
            if (!deletedComment || !deletedComment.post_id) return;

            const { data: updatedMetrics, error } = await supabase
              .from('blog_feed_metrics')
              .select('*')
              .eq('post_id', deletedComment.post_id)
              .maybeSingle();

            if (error) {
              console.error('Error fetching updated metrics:', error);
              return;
            }

            if (updatedMetrics) {
              const updatePostMetrics = (post: any) => {
                if (post && post.id === deletedComment.post_id) {
                  return {
                    ...post,
                    blog_feed_metrics: [updatedMetrics]
                  };
                }
                return post;
              };

              setPosts(currentPosts =>
                Array.isArray(currentPosts) ? currentPosts.map(updatePostMetrics) : []
              );

              setPinnedPosts(currentPinnedPosts =>
                Array.isArray(currentPinnedPosts) ? currentPinnedPosts.map(updatePostMetrics) : []
              );

              setDiscoveryPosts(currentDiscoveryPosts =>
                Array.isArray(currentDiscoveryPosts) ? currentDiscoveryPosts.map(updatePostMetrics) : []
              );
            }
          } catch (err) {
            console.error('Error handling comment deletion:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <BlogHeader onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-emerald-300 font-medium">Loading your reading sanctuary...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <BlogHeader onMenuClick={() => setSidebarOpen(true)} />
      <BlogSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <BlogRightSidebar />
      <div className="lg:pl-64 xl:pr-80 px-4 relative overflow-hidden transition-all duration-300 pt-16">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-slate-700 rounded-full mix-blend-lighten filter blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-slate-600 rounded-full mix-blend-lighten filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-slate-700 rounded-full mix-blend-lighten filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
        {showWelcome && (
          <div className="mb-6 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-2 border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4 shadow-lg backdrop-blur">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-emerald-100 font-bold text-lg">Welcome to HuBlog!</p>
              <p className="text-emerald-300">Your account has been created. Check your dashboard to see all your platforms.</p>
            </div>
          </div>
        )}

        <div className="text-center pt-4 pb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="w-12 h-12 text-emerald-400" />
            <h1 className="text-5xl font-bold text-white font-serif">HuBlog</h1>
          </div>
          <p className="text-lg text-gray-300 mb-2">Your Reading Sanctuary</p>
          {userInterests.length > 0 && (
            <p className="text-sm text-emerald-300 font-medium">
              Personalized for: {userInterests.slice(0, 3).join(', ')}{userInterests.length > 3 ? ` + ${userInterests.length - 3} more` : ''}
            </p>
          )}
          <button
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium mt-4 relative z-50"
          >
            <Info className="w-5 h-5" />
            How the feed works
          </button>
        </div>

        {pinnedPosts.length === 0 && posts.length === 0 ? (
          <div className="bg-slate-800/60 backdrop-blur rounded-2xl shadow-xl p-16 text-center border-2 border-slate-600/30">
            <BookOpen className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-3">No Stories Yet</h3>
            <p className="text-gray-300 text-lg">
              Be the first to write a HuBlog post and start the conversation!
            </p>
          </div>
        ) : (
          <>
            {Array.isArray(posts) && posts.length > 0 && (
              <div className="mb-8 mt-16">
                <BlogWheel
                  posts={posts.filter(post => post && post.id)}
                  onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                  title="Your Personalized Feed"
                  subtitle="Stories curated just for you"
                />
              </div>
            )}

            {Array.isArray(discoveryPosts) && discoveryPosts.length > 0 && (
              <div className="my-12 space-y-6">
                <h2 className="text-3xl font-bold text-center text-white font-serif mb-8">
                  Discover New Perspectives
                </h2>
                {discoveryPosts.filter(post => post && post.id).map((post) => (
                  <DiscoveryPostCard
                    key={post.id}
                    post={{
                      id: post.id,
                      title: post.title || 'Untitled',
                      content: post.content || '',
                      created_at: post.created_at,
                      account_id: post.account_id,
                      author_name: post.blog_accounts?.display_name || 'Anonymous',
                      author_username: post.blog_accounts?.username || '',
                      interest_name: post.interest_name || 'General',
                      engagement_metrics: {
                        view_count: post.view_count || 0,
                        like_count: post.like_count || 0,
                        comment_count: post.comment_count || 0
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {Array.isArray(pinnedPosts) && pinnedPosts.length > 0 && (
              <div className="mb-8 mt-16">
                <BlogWheel
                  posts={pinnedPosts.filter(post => post && post.id)}
                  onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                  title="Featured Stories"
                  subtitle="Handpicked by our community curators"
                />
              </div>
            )}
          </>
        )}
        </div>

        {showInfoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-8 border-2 border-emerald-500/30">
              <div className="flex items-center gap-3 mb-6">
                <Info className="w-8 h-8 text-emerald-400" />
                <h3 className="text-2xl font-bold text-white">How the Wheel Works</h3>
              </div>
              <div className="space-y-4 text-gray-300">
                <p className="leading-relaxed">
                  Our Wheels of Blogs create an immersive reading experience. Posts are carefully ranked to surface the most engaging, meaningful conversations.
                </p>
                <div className="bg-slate-700/40 rounded-xl p-4 border border-emerald-500/20">
                  <p className="font-semibold text-emerald-300 mb-2">We consider:</p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>30-day view and comment velocity</li>
                    <li>Optimal balance between views and engagement</li>
                    <li>Your selected interests for personalization</li>
                  </ul>
                </div>
                <p className="text-sm text-gray-400 italic bg-emerald-900/20 p-3 rounded-lg border border-emerald-500/20">
                  Spin the wheel with your mouse, arrow keys, or scroll wheel. Click the center card to read the full story!
                </p>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-bold shadow-lg"
              >
                Start Exploring
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
