import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import BlogWheel from '../../components/blog/BlogWheel';
import { useNavigate } from 'react-router-dom';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function SavedStories() {
  return (
    <PlatformGuard platform="blog">
      <SavedStoriesContent />
    </PlatformGuard>
  );
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  comment_count: number;
  total_reaction_count: number;
  bookmark_count: number;
  account: {
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  };
  comments_count?: number;
  bookmarked_at: string;
}

function SavedStoriesContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myBlogAccountId, setMyBlogAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSavedPosts();
    }
  }, [user]);

  const loadSavedPosts = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: myAccount } = await supabase
        .from('blog_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!myAccount) {
        setIsLoading(false);
        return;
      }

      setMyBlogAccountId(myAccount.id);

      const { data, error } = await supabase
        .from('blog_bookmarks')
        .select(`
          created_at,
          post:post_id (
            id,
            title,
            content,
            created_at,
            view_count,
            total_reaction_count,
            bookmark_count,
            account:account_id (
              username,
              display_name,
              avatar_url,
              bio
            )
          )
        `)
        .eq('account_id', myAccount.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsData = (data || []).map((item: any) => ({
        ...item.post,
        comments_count: item.post.comment_count || 0,
        bookmarked_at: item.created_at
      })).filter((post: any) => post.id);

      setPosts(postsData);
    } catch (error) {
      console.error('Error loading saved posts:', error);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return (
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Ambient blur orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Bookmark className="w-8 h-8 text-amber-400" />
              <h1 className="text-4xl font-bold text-white">Saved Stories</h1>
            </div>
            <p className="text-lg text-gray-300">
              Your personal collection of stories to read later
            </p>
          </div>

          {!user ? (
            <div className="text-center py-16">
              <Bookmark className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <h2 className="text-2xl font-bold text-white mb-4">Sign In to Save Stories</h2>
              <p className="text-gray-300 mb-6">Create an account to bookmark your favorite stories.</p>
              <button
                onClick={() => navigate('/signin')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                Sign In
              </button>
            </div>
          ) : !myBlogAccountId ? (
            <div className="text-center py-16">
              <Bookmark className="w-16 h-16 mx-auto mb-4 text-slate-500" />
              <h2 className="text-2xl font-bold text-white mb-4">Create a HuBlog Account</h2>
              <p className="text-gray-300 mb-6">You need a HuBlog account to save stories.</p>
              <button
                onClick={() => navigate('/blog/create-account')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                Create HuBlog Account
              </button>
            </div>
          ) : posts.length > 0 ? (
            <div className="mb-12">
              <BlogWheel
                posts={posts}
                onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                title=""
                subtitle=""
              />
              <p className="text-center text-gray-300 mt-8">
                {posts.length} {posts.length === 1 ? 'story' : 'stories'} saved
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <Bookmark className="w-20 h-20 mx-auto mb-6 text-slate-500" />
              <h2 className="text-2xl font-bold text-white mb-4">No Saved Stories Yet</h2>
              <p className="text-gray-300 mb-8 max-w-md mx-auto">
                Start bookmarking stories you want to read later. Click the bookmark icon on any story to save it here.
              </p>
              <button
                onClick={() => navigate('/blog/feed')}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                Explore Stories
              </button>
            </div>
          )}
        </div>
      </div>
    </BlogLayout>
  );
}
