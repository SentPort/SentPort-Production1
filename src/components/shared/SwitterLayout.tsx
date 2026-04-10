import { ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bird, CreditCard as Edit3, Search, Mail, Bookmark } from 'lucide-react';
import PlatformHeaderDropdown from './PlatformHeaderDropdown';
import PlatformBackButton from './PlatformBackButton';
import UniversalNavigationDropdown from './UniversalNavigationDropdown';
import CreateTweetModal from '../../components/switter/CreateTweetModal';
import NotificationBellDropdown from '../../components/switter/NotificationBellDropdown';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SwitterLayoutProps {
  children: ReactNode;
  showCreateButton?: boolean;
  showBackButton?: boolean;
  backButtonPath?: string;
}

export default function SwitterLayout({ children, showCreateButton = false, showBackButton = false, backButtonPath = '/switter' }: SwitterLayoutProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      supabase.rpc('track_user_activity', { p_user_id: user.id, p_platform: 'switter' }).then(() => {});
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <PlatformBackButton fallbackPath={backButtonPath} />
              )}
              <UniversalNavigationDropdown currentPlatform="switter" />
              <Link to="/switter" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Bird className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold text-gray-900">Switter</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/switter/search"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </Link>

              <Link
                to="/switter/bookmarks"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Bookmarks"
              >
                <Bookmark className="w-5 h-5 text-gray-700" />
              </Link>

              <NotificationBellDropdown />

              <Link
                to="/switter/messages"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Messages"
              >
                <Mail className="w-5 h-5 text-gray-700" />
              </Link>

              {showCreateButton && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Tweet</span>
                </button>
              )}

              <PlatformHeaderDropdown platform="switter" />
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {showCreateModal && (
        <CreateTweetModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
