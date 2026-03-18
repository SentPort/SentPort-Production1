import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Users, MessageCircle, Trophy, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import PlatformHeaderDropdown from './PlatformHeaderDropdown';
import PlatformBackButton from './PlatformBackButton';
import { SearchBar } from '../heddit/SearchBar';
import UniversalNavigationDropdown from './UniversalNavigationDropdown';
import NotificationBellDropdown from '../heddit/NotificationBellDropdown';
import { HedditNotificationProvider } from '../../contexts/HedditNotificationContext';

interface HedditLayoutProps {
  children: ReactNode;
  showCreateButtons?: boolean;
  showBackButton?: boolean;
  backButtonPath?: string;
}

export default function HedditLayout({ children, showCreateButtons = true, showBackButton = false, backButtonPath = '/heddit' }: HedditLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <HedditNotificationProvider>
      <div className="min-h-screen bg-gray-50">
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

              <div className="flex-1 max-w-2xl mx-4 hidden md:block">
                <SearchBar />
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {user && (
                  <>
                    <Link
                      to="/heddit/karma-guide"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="How Karma Works"
                    >
                      <Info className="w-6 h-6 text-blue-600" />
                    </Link>
                    <Link
                      to="/heddit/leaderboard"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="Leaderboard"
                    >
                      <Trophy className="w-6 h-6 text-orange-600" />
                    </Link>
                    <NotificationBellDropdown />
                    <Link
                      to="/heddit/messages"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                      title="Messages"
                    >
                      <MessageCircle className="w-6 h-6 text-gray-600" />
                    </Link>
                  </>
                )}
                {showCreateButtons && user && (
                  <>
                    <button
                      onClick={() => navigate('/heddit/create-post')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Create Post</span>
                    </button>
                    <button
                      onClick={() => navigate('/heddit/create-subreddit')}
                      className="flex items-center gap-2 px-4 py-2 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
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
      </div>
    </HedditNotificationProvider>
  );
}
