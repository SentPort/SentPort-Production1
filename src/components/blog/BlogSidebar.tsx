import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Users, Bookmark, MessageCircle, FolderHeart, PenTool, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function BlogSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ posts: 0, reads: 0, followers: 0 });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { count: postCount } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', user.id)
        .eq('status', 'published');

      const { count: followerCount } = await supabase
        .from('blog_follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', user.id);

      const { data: posts } = await supabase
        .from('blog_posts')
        .select('view_count')
        .eq('account_id', user.id)
        .eq('status', 'published');

      const totalReads = posts?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;

      setStats({
        posts: postCount || 0,
        reads: totalReads,
        followers: followerCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const navItems = [
    { path: '/blog', icon: Home, label: 'Feed', exact: true },
    { path: '/blog/trending', icon: TrendingUp, label: 'Trending' },
    { path: '/blog/following', icon: Users, label: 'Following' },
    { path: '/blog/saved', icon: Bookmark, label: 'Saved' },
    { path: '/blog/collections', icon: FolderHeart, label: 'Collections' },
    { path: '/blog/messages', icon: MessageCircle, label: 'Messages' },
    { path: '/blog/collaborations', icon: PenTool, label: 'Collaborations' },
    { path: '/blog/reading-history', icon: Clock, label: 'History' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="hidden lg:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 border-r border-slate-600/30 overflow-y-auto z-40 shadow-2xl">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${active
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 font-semibold shadow-lg border border-emerald-500/30'
                  : 'text-gray-300 hover:bg-white/10 hover:text-emerald-400'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : ''}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-600/30 mt-4">
        <Link
          to="/blog/create-post"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-emerald-500/50 hover:shadow-xl"
        >
          <PenTool className="w-5 h-5" />
          <span>Write Story</span>
        </Link>
      </div>

      <div className="p-4 border-t border-slate-600/30 mt-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Your Stats
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">Stories Published</span>
            <span className="font-semibold text-white">{stats.posts}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">Total Reads</span>
            <span className="font-semibold text-white">{stats.reads.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">Followers</span>
            <span className="font-semibold text-white">{stats.followers}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
