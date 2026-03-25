import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, SquarePen as PenSquare, Compass, Bookmark, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PlatformHeaderDropdown from '../shared/PlatformHeaderDropdown';
import PlatformBackButton from '../shared/PlatformBackButton';
import UniversalNavigationDropdown from '../shared/UniversalNavigationDropdown';
import NotificationBell from './NotificationBell';
import { BlogSearchBar } from './BlogSearchBar';

interface BlogHeaderProps {
  showCreateButton?: boolean;
  showBackButton?: boolean;
  backButtonPath?: string;
}

export default function BlogHeader({ showCreateButton = true, showBackButton = false, backButtonPath = '/blog' }: BlogHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadDraftCount();

      const subscription = supabase
        .channel('blog_drafts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'blog_posts',
            filter: `account_id=eq.${user.id}`
          },
          () => {
            loadDraftCount();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadDraftCount = async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', user.id)
      .eq('is_draft', true);

    if (!error && count !== null) {
      setDraftCount(count);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            {showBackButton && (
              <PlatformBackButton fallbackPath={backButtonPath} />
            )}
            <UniversalNavigationDropdown currentPlatform="hublog" />
            <Link to="/blog" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <BookOpen className="w-8 h-8 text-emerald-600" />
              <span className="text-2xl font-bold text-gray-900 hidden md:inline">HuBlog</span>
            </Link>
          </div>

          <div className="hidden sm:flex flex-1 max-w-2xl mx-4">
            <BlogSearchBar />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => navigate('/blog/explore')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors hidden sm:block"
              title="Explore"
            >
              <Compass className="w-6 h-6 text-gray-700" />
            </button>
            {user && (
              <>
                <button
                  onClick={() => navigate('/blog/drafts')}
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors hidden md:block"
                  title="Drafts"
                >
                  <FileText className="w-6 h-6 text-gray-700" />
                  {draftCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {draftCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/blog/saved')}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors hidden sm:block"
                  title="Saved Stories"
                >
                  <Bookmark className="w-6 h-6 text-gray-700" />
                </button>
                <NotificationBell />
              </>
            )}
            {showCreateButton && user && (
              <button
                onClick={() => navigate('/blog/create-post')}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <PenSquare className="w-5 h-5" />
                <span className="hidden sm:inline">Write Post</span>
              </button>
            )}
            <PlatformHeaderDropdown platform="blog" />
          </div>
        </div>

        <div className="sm:hidden pb-3">
          <BlogSearchBar />
        </div>
      </div>
    </header>
  );
}
