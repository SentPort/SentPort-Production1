import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Users, MessageCircle, Trophy, Info, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PlatformHeaderDropdown from './PlatformHeaderDropdown';
import PlatformBackButton from './PlatformBackButton';
import { SearchBar } from '../heddit/SearchBar';
import UniversalNavigationDropdown from './UniversalNavigationDropdown';
import NotificationBellDropdown from '../heddit/NotificationBellDropdown';
import { HedditNotificationProvider } from '../../contexts/HedditNotificationContext';
import HedditMobileBottomNav from '../heddit/HedditMobileBottomNav';

interface HedditLayoutProps {
  children: ReactNode;
  showCreateButtons?: boolean;
  showBackButton?: boolean;
  backButtonPath?: string;
}

export default function HedditLayout({ children, showCreateButtons = true, showBackButton = false, backButtonPath = '/heddit' }: HedditLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draftCount, setDraftCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadDraftCount();
      loadUnreadMessageCount();
      supabase.rpc('track_user_activity', { p_user_id: user.id, p_platform: 'heddit' }).then(() => {});

      const conversationsChannel = supabase
        .channel('heddit-conversations-unread')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'heddit_conversations',
          },
          () => {
            loadUnreadMessageCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(conversationsChannel);
      };
    }
  }, [user]);

  const loadDraftCount = async () => {
    if (!user) return;

    try {
      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) return;

      const { count } = await supabase
        .from('heddit_posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', hedditAccount.id)
        .eq('is_draft', true);

      setDraftCount(count || 0);
    } catch (error) {
      console.error('Error loading draft count:', error);
    }
  };

  const loadUnreadMessageCount = async () => {
    if (!user) return;

    try {
      const { data: hedditAccount } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hedditAccount) return;

      const { data: conversations } = await supabase
        .from('heddit_conversations')
        .select('participant_one_id, participant_two_id, unread_count_one, unread_count_two')
        .or(`participant_one_id.eq.${hedditAccount.id},participant_two_id.eq.${hedditAccount.id}`);

      if (conversations) {
        const totalUnread = conversations.reduce((sum, conv) => {
          if (conv.participant_one_id === hedditAccount.id) {
            return sum + (conv.unread_count_one || 0);
          } else {
            return sum + (conv.unread_count_two || 0);
          }
        }, 0);
        setUnreadMessageCount(totalUnread);
      }
    } catch (error) {
      console.error('Error loading unread message count:', error);
    }
  };

  return (
    <HedditNotificationProvider>
      <div className="min-h-screen bg-gray-50 pb-28 md:pb-0">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              <div className="flex items-center gap-4 flex-shrink-0">
                {showBackButton && (
                  <PlatformBackButton fallbackPath={backButtonPath} />
                )}
                <UniversalNavigationDropdown currentPlatform="heddit" />
                <Link to="/heddit" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <MessageSquare className="w-8 h-8 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-900 hidden sm:inline">Heddit</span>
                </Link>
              </div>

              <div className="flex-1 max-w-2xl mx-4">
                <SearchBar />
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {user && (
                  <>
                    <Link
                      to="/heddit/karma-guide"
                      className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="How Karma Works"
                    >
                      <Info className="w-6 h-6 text-blue-600" />
                    </Link>
                    <Link
                      to="/heddit/leaderboard"
                      className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="Leaderboard"
                    >
                      <Trophy className="w-6 h-6 text-orange-600" />
                    </Link>
                    <NotificationBellDropdown />
                    <Link
                      to="/heddit/messages"
                      className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="Messages"
                    >
                      <MessageCircle className="w-6 h-6 text-gray-600" />
                      {unreadMessageCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                          {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/heddit/drafts"
                      className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="Drafts"
                    >
                      <FileText className="w-6 h-6 text-gray-600" />
                      {draftCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                          {draftCount}
                        </span>
                      )}
                    </Link>
                  </>
                )}
                {showCreateButtons && user && (
                  <>
                    <button
                      onClick={() => navigate('/heddit/create-post')}
                      className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Create Post</span>
                    </button>
                    <button
                      onClick={() => navigate('/heddit/create-subreddit')}
                      className="hidden md:flex items-center gap-2 px-4 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      <Users className="w-5 h-5" />
                      <span className="hidden sm:inline">Create Community</span>
                    </button>
                  </>
                )}
                <PlatformHeaderDropdown platform="heddit" />
              </div>
            </div>
          </div>
        </header>

        <main>{children}</main>

        {user && (
          <HedditMobileBottomNav
            unreadMessageCount={unreadMessageCount}
            showCreateButton={showCreateButtons}
          />
        )}
      </div>
    </HedditNotificationProvider>
  );
}
