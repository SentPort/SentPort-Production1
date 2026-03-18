import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import BlogWheel from '../../components/blog/BlogWheel';
import BlogSidebar from '../../components/blog/BlogSidebar';
import BlogRightSidebar from '../../components/blog/BlogRightSidebar';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Following() {
  return (
    <PlatformGuard platform="blog">
      <FollowingContent />
    </PlatformGuard>
  );
}

function FollowingContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFollowingFeed();
    }
  }, [user]);

  const loadFollowingFeed = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: follows } = await supabase
        .from('blog_follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = follows?.map((f) => f.following_id) || [];

      if (followingIds.length > 0) {
        const { data } = await supabase
          .from('blog_posts')
          .select(`
            *,
            blog_accounts (username, display_name, avatar_url),
            blog_feed_metrics (quality_score, engagement_score, total_views_30d, total_comments_30d)
          `)
          .in('account_id', followingIds)
          .eq('status', 'published')
          .eq('privacy', 'public')
          .order('created_at', { ascending: false })
          .limit(30);

        setPosts(data || []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error loading following feed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <BlogLayout showBackButton backButtonPath="/blog">
        <BlogSidebar />
        <BlogRightSidebar />
        <div className="lg:pl-64 xl:pr-80 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-emerald-400 font-medium">Loading stories from writers you follow...</p>
          </div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout showBackButton backButtonPath="/blog">
      <BlogSidebar />
      <BlogRightSidebar />
      <div className="lg:pl-64 xl:pr-80 min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Users className="w-12 h-12 text-emerald-400" />
              <h1 className="text-5xl font-bold text-white font-serif">Following</h1>
            </div>
            <p className="text-lg text-gray-300">Stories from writers you follow</p>
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
              <UserPlus className="w-20 h-20 text-slate-500 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">Not Following Anyone Yet</h3>
              <p className="text-gray-300 text-lg mb-6">
                Discover amazing writers and follow them to see their latest stories here!
              </p>
              <button
                onClick={() => navigate('/blog/explore')}
                className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md shadow-emerald-500/50"
              >
                Explore Writers
              </button>
            </div>
          )}
        </div>
      </div>
    </BlogLayout>
  );
}
