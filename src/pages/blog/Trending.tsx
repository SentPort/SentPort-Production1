import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Flame } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BlogLayout from '../../components/shared/BlogLayout';
import BlogWheel from '../../components/blog/BlogWheel';
import BlogSidebar from '../../components/blog/BlogSidebar';
import BlogRightSidebar from '../../components/blog/BlogRightSidebar';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Trending() {
  return (
    <PlatformGuard platform="blog">
      <TrendingContent />
    </PlatformGuard>
  );
}

function TrendingContent() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadTrendingPosts();
  }, [timeRange]);

  const loadTrendingPosts = async () => {
    setLoading(true);
    try {
      // Calculate the date threshold based on time range
      const now = new Date();
      let dateThreshold: Date;

      switch (timeRange) {
        case 'day':
          dateThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_accounts (username, display_name, avatar_url),
          blog_feed_metrics (
            engagement_score,
            final_trending_score,
            author_authority_score,
            time_decay_factor,
            freshness_boost,
            total_views_30d,
            total_comments_30d
          )
        `)
        .eq('status', 'published')
        .eq('privacy', 'public')
        .gte('created_at', dateThreshold.toISOString())
        .order('view_count', { ascending: false })
        .limit(50);

      if (data) {
        // Sort by enhanced final_trending_score which includes time decay, author authority, and freshness
        const sortedPosts = data.sort((a, b) => {
          const scoreA = a.blog_feed_metrics?.[0]?.final_trending_score || 0;
          const scoreB = b.blog_feed_metrics?.[0]?.final_trending_score || 0;
          return scoreB - scoreA;
        });

        setPosts(sortedPosts.slice(0, 30));
      }
    } catch (error) {
      console.error('Error loading trending posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <BlogLayout showBackButton backButtonPath="/blog" onMenuClick={() => setSidebarOpen(true)}>
        <BlogSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <BlogRightSidebar />
        <div className="lg:pl-64 xl:pr-80 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-emerald-400 font-medium">Loading trending stories...</p>
          </div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout showBackButton backButtonPath="/blog" onMenuClick={() => setSidebarOpen(true)}>
      <BlogSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <BlogRightSidebar />
      <div className="lg:pl-64 xl:pr-80 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Flame className="w-12 h-12 text-emerald-400" />
              <h1 className="text-5xl font-bold text-white font-serif">Trending Now</h1>
            </div>
            <p className="text-lg text-gray-300">The hottest stories on HuBlog</p>

            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setTimeRange('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === 'day'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/50'
                    : 'bg-slate-700/70 text-gray-300 hover:bg-slate-600/70'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === 'week'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/50'
                    : 'bg-slate-700/70 text-gray-300 hover:bg-slate-600/70'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === 'month'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/50'
                    : 'bg-slate-700/70 text-gray-300 hover:bg-slate-600/70'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {posts.length > 0 ? (
            <div className="mt-16">
              <BlogWheel
                posts={posts}
                onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                title=""
                subtitle=""
              />
            </div>
          ) : (
            <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl p-16 text-center border border-slate-600/50">
              <TrendingUp className="w-20 h-20 text-slate-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">No Trending Stories</h3>
              <p className="text-gray-300 text-lg">
                Check back soon to see what's hot on HuBlog!
              </p>
            </div>
          )}
        </div>
      </div>
    </BlogLayout>
  );
}
