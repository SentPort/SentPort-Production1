import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SquarePen as PenSquare, Sparkles, BookOpen } from 'lucide-react';
import BlogWheel from '../../components/blog/BlogWheel';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function MyPosts() {
  return (
    <PlatformGuard platform="blog">
      <MyPostsContent />
    </PlatformGuard>
  );
}

function MyPostsContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPosts();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_accounts!blog_posts_account_id_fkey (
            username,
            display_name,
            avatar_url
          ),
          blog_feed_metrics (
            total_views_30d,
            total_comments_30d
          )
        `)
        .eq('account_id', user.id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { data, error } = await supabase
        .rpc('delete_blog_post_with_cascade', { p_post_id: postId });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete post');
      }

      loadPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      alert(`Failed to delete post: ${err?.message || 'Unknown error'}. Please try again.`);
    }
  };

  if (loading) {
    return (
      <BlogLayout showCreateButton={false}>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-emerald-400 font-medium">Loading your stories...</p>
          </div>
        </div>
      </BlogLayout>
    );
  }


  return (
    <BlogLayout showCreateButton={false}>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-12 h-12 text-emerald-400" />
            <h1 className="text-5xl font-bold text-white font-serif">
              My Stories
            </h1>
            <Sparkles className="w-12 h-12 text-amber-400" />
          </div>
          <p className="text-xl text-gray-300 mb-6">
            Your literary journey in one place
          </p>
          <button
            onClick={() => navigate('/blog/create-post')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-bold shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105"
          >
            <PenSquare className="w-5 h-5" />
            Write New Story
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl p-16 text-center border border-slate-600/50">
            <PenSquare className="w-20 h-20 text-slate-500 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-white mb-4 font-serif">Begin Your Journey</h3>
            <p className="text-gray-300 text-lg mb-8 max-w-lg mx-auto">
              Every great writer starts with a blank page. Share your first story and inspire others!
            </p>
            <button
              onClick={() => navigate('/blog/create-post')}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-10 py-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-bold shadow-lg hover:shadow-emerald-500/50 transform hover:scale-105"
            >
              Write Your First Story
            </button>
          </div>
        ) : (
          <BlogWheel
            posts={posts}
            onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
            title="Your Writing Collection"
            subtitle={`${posts.length} ${posts.length === 1 ? 'story' : 'stories'} shared with the world`}
            showEditButton={true}
          />
        )}
      </div>
      </div>
    </BlogLayout>
  );
}
