import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Users, Bookmark, MessageCircle, FolderHeart, PenTool, Clock, FileText, File as FileEdit, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BlogSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function BlogSidebar({ isOpen = true, onClose }: BlogSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [stats, setStats] = useState({ posts: 0, reads: 0, followers: 0 });
  const [draftCount, setDraftCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadStats();
      loadDraftCount();
      loadUnreadMessageCount();

      const messagesSubscription = supabase
        .channel('blog_sidebar_message_counts')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'blog_conversation_participants' },
          () => { loadUnreadMessageCount(); }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'blog_messages' },
          () => { loadUnreadMessageCount(); }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesSubscription);
      };
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

  const loadDraftCount = async () => {
    if (!user) return;

    try {
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', user.id)
        .eq('is_draft', true);

      setDraftCount(count || 0);
    } catch (error) {
      console.error('Error loading draft count:', error);
    }
  };

  const loadUnreadMessageCount = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('blog_conversation_participants')
        .select('unread_count')
        .eq('account_id', user.id)
        .is('deleted_at', null);

      if (data) {
        const total = data.reduce((sum: number, row: any) => sum + (row.unread_count || 0), 0);
        setUnreadMessageCount(total);
      }
    } catch (error) {
      console.error('Error loading unread message count:', error);
    }
  };

  const navItems = [
    { path: '/blog', icon: Home, label: 'Feed', exact: true },
    { path: '/blog/trending', icon: TrendingUp, label: 'Trending' },
    { path: '/blog/following', icon: Users, label: 'Following' },
    { path: '/blog/my-posts', icon: FileEdit, label: 'My Posts' },
    { path: '/blog/drafts', icon: FileText, label: 'Drafts', badge: draftCount },
    { path: '/blog/saved', icon: Bookmark, label: 'Saved' },
    { path: '/blog/collections', icon: FolderHeart, label: 'Collections' },
    { path: '/blog/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessageCount },
    { path: '/blog/collaborations', icon: PenTool, label: 'Collaborations' },
    { path: '/blog/reading-history', icon: Clock, label: 'History' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-slate-800 via-slate-700 to-slate-900 border-r border-slate-600/30 overflow-y-auto shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:z-40
          ${isOpen ? 'translate-x-0 z-50' : '-translate-x-full z-50'}
        `}
      >
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative
                  ${active
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 font-semibold shadow-lg border border-emerald-500/30'
                    : 'text-gray-300 hover:bg-white/10 hover:text-emerald-400'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : ''}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-emerald-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

      <div className="p-4 border-t border-slate-600/30 mt-4">
        <Link
          to="/blog/create-post"
          onClick={handleLinkClick}
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
    </>
  );
}
