import { ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, PlusSquare, Heart, MessageCircle, Bell, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PlatformHeaderDropdown from './PlatformHeaderDropdown';
import PlatformBackButton from './PlatformBackButton';
import CreatePost from '../../pages/hinsta/CreatePost';
import UniversalNavigationDropdown from './UniversalNavigationDropdown';

interface HinstaLayoutProps {
  children: ReactNode;
  showCreateButton?: boolean;
  showBackButton?: boolean;
  backButtonPath?: string;
}

export default function HinstaLayout({ children, showCreateButton = true, showBackButton = false, backButtonPath = '/hinsta' }: HinstaLayoutProps) {
  const { user } = useAuth();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [myAccount, setMyAccount] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount) {
      loadUnreadCounts();
      const interval = setInterval(loadUnreadCounts, 10000);
      return () => clearInterval(interval);
    }
  }, [myAccount]);

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadUnreadCounts = async () => {
    if (!myAccount) return;

    const { data: conversations } = await supabase
      .from('hinsta_conversations')
      .select('id')
      .or(`participant1_id.eq.${myAccount.id},participant2_id.eq.${myAccount.id}`);

    if (conversations) {
      let totalUnread = 0;
      for (const conv of conversations) {
        const { count } = await supabase
          .from('hinsta_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', myAccount.id)
          .eq('is_read', false);
        totalUnread += count || 0;
      }
      setUnreadMessages(totalUnread);
    }

    const { count: notifCount } = await supabase
      .from('hinsta_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', myAccount.id)
      .eq('is_read', false);

    setUnreadNotifications(notifCount || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <PlatformBackButton fallbackPath={backButtonPath} />
              )}
              <UniversalNavigationDropdown currentPlatform="hinsta" />
              <Link to="/hinsta" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Camera className="w-8 h-8 text-pink-500" />
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                  Hinsta
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {showCreateButton && user && (
                <>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    <PlusSquare className="w-5 h-5" />
                    <span className="hidden sm:inline">Create</span>
                  </button>
                  <Link to="/hinsta/analytics" className="relative">
                    <BarChart3 className="w-6 h-6 text-gray-700 hover:text-pink-500 cursor-pointer transition-colors" />
                  </Link>
                  <Link to="/hinsta/notifications" className="relative">
                    <Heart className="w-6 h-6 text-gray-700 hover:text-red-500 cursor-pointer transition-colors" />
                    {unreadNotifications > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </div>
                    )}
                  </Link>
                  <Link to="/hinsta/messages" className="relative">
                    <MessageCircle className="w-6 h-6 text-gray-700 hover:text-pink-500 cursor-pointer transition-colors" />
                    {unreadMessages > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </div>
                    )}
                  </Link>
                </>
              )}
              <PlatformHeaderDropdown platform="hinsta" />
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {showCreatePost && (
        <CreatePost
          onClose={() => setShowCreatePost(false)}
          onPostCreated={() => {
            setShowCreatePost(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
