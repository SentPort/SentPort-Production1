import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Users, Image, MessageCircle, Settings, Bell, UserPlus, Menu, X, Home, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import FlaggedContentNotificationWrapper from '../shared/FlaggedContentNotificationWrapper';
import WelcomeModal from './WelcomeModal';
import UniversalNavigationDropdown from '../shared/UniversalNavigationDropdown';
import NotificationToast from './NotificationToast';
import NotificationBellDropdown from './NotificationBellDropdown';
import UserSearchDropdown from './UserSearchDropdown';
import MobileBottomNav from './MobileBottomNav';

export default function HuBookLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hubookProfile, refreshProfile } = useHuBook();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [notificationToasts, setNotificationToasts] = useState<Array<{ notification: any; user: any }>>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (hubookProfile) {
      fetchNotificationCount();
      fetchUnreadMessagesCount();
      fetchFriendRequestCount();
      fetchSuggestions();
      checkWelcomeStatus();
      supabase.rpc('track_user_activity', { p_user_id: hubookProfile.user_id, p_platform: 'hubook' }).then(() => {});

      // Subscribe to real-time notification updates
      const notificationChannel = supabase
        .channel('hubook-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hubook_notifications',
            filter: `user_id=eq.${hubookProfile.id}`
          },
          async (payload) => {
            // Refetch notification count when any notification changes
            fetchNotificationCount();

            // Show toast for new notifications if it's an INSERT event
            if (payload.eventType === 'INSERT') {
              const newNotification = payload.new;

              // Fetch user data for the notification
              if (newNotification.actor_id) {
                const { data: userData } = await supabase
                  .from('hubook_profiles')
                  .select('display_name, profile_photo_url')
                  .eq('id', newNotification.actor_id)
                  .single();

                if (userData) {
                  setNotificationToasts(prev => [...prev, {
                    notification: newNotification,
                    user: userData
                  }]);
                }
              }
            }
          }
        )
        .subscribe();

      // Subscribe to real-time friend request updates
      const friendRequestChannel = supabase
        .channel('hubook-friend-requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'friendships',
            filter: `addressee_id=eq.${hubookProfile.id}`
          },
          () => {
            // Refetch friend request count when any friendship changes
            fetchFriendRequestCount();
          }
        )
        .subscribe();

      // Subscribe to real-time message updates
      const messagesChannel = supabase
        .channel('hubook-messages-unread')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          () => {
            // Refetch unread message count when messages are inserted or updated
            fetchUnreadMessagesCount();
          }
        )
        .subscribe();

      // Cleanup subscriptions on unmount
      return () => {
        supabase.removeChannel(notificationChannel);
        supabase.removeChannel(friendRequestChannel);
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [hubookProfile]);

  const checkWelcomeStatus = async () => {
    if (!hubookProfile) return;

    if (!hubookProfile.welcome_message_shown) {
      setShowWelcomeModal(true);
    }
  };

  const handleWelcomeClose = async () => {
    if (!hubookProfile) return;

    await supabase
      .from('hubook_profiles')
      .update({ welcome_message_shown: true })
      .eq('id', hubookProfile.id);

    setShowWelcomeModal(false);

    // Refresh profile to ensure updated state
    await refreshProfile();
  };

  const fetchNotificationCount = async () => {
    if (!hubookProfile) return;

    const { count } = await supabase
      .from('hubook_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', hubookProfile.id)
      .eq('read', false)
      .eq('dismissed', false);

    setUnreadNotifications(count || 0);
  };

  const fetchUnreadMessagesCount = async () => {
    if (!hubookProfile) return;

    // Get all conversations the user is part of
    const { data: participantData } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', hubookProfile.id)
      .is('deleted_at', null);

    if (!participantData || participantData.length === 0) {
      setUnreadMessagesCount(0);
      return;
    }

    const conversationIds = participantData.map(p => p.conversation_id);

    // Get visible message IDs for this user
    const { data: visibilityData } = await supabase
      .from('message_visibility')
      .select('message_id')
      .eq('user_id', hubookProfile.id);

    const visibleMessageIds = new Set(visibilityData?.map(v => v.message_id) || []);

    // Count unread messages in user's conversations that are visible to them
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', hubookProfile.id)
      .eq('is_read', false)
      .in('id', Array.from(visibleMessageIds));

    setUnreadMessagesCount(count || 0);
  };

  const fetchFriendRequestCount = async () => {
    if (!hubookProfile) return;

    const { count } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .eq('addressee_id', hubookProfile.id)
      .eq('status', 'pending');

    setFriendRequestCount(count || 0);
  };

  const fetchSuggestions = async () => {
    if (!hubookProfile) return;

    const { data: myFriends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${hubookProfile.id},addressee_id.eq.${hubookProfile.id}`);

    const myFriendIds = new Set(
      (myFriends || []).map((f) =>
        f.requester_id === hubookProfile.id ? f.addressee_id : f.requester_id
      )
    );

    const { data: blockedUsers } = await supabase
      .from('hubook_blocked_users')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${hubookProfile.id},blocked_id.eq.${hubookProfile.id}`);

    const blockedUserIds = new Set(
      (blockedUsers || []).map((b) =>
        b.blocker_id === hubookProfile.id ? b.blocked_id : b.blocker_id
      )
    );

    const { data: allUsers } = await supabase
      .from('hubook_profiles')
      .select('*')
      .neq('id', hubookProfile.id)
      .limit(20);

    const suggested = (allUsers || [])
      .filter((user) => !myFriendIds.has(user.id) && !blockedUserIds.has(user.id))
      .slice(0, 5);

    setSuggestions(suggested);
  };


  const sendFriendRequest = async (userId: string) => {
    if (!hubookProfile) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: hubookProfile.id,
        addressee_id: userId,
        status: 'pending'
      });

    if (!error) {
      setSuggestions(suggestions.filter((s) => s.id !== userId));
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/hubook', icon: Home, label: 'HuFeed' },
    { path: '/hubook/profile', icon: User, label: 'Profile' },
    { path: '/hubook/friends', icon: Users, label: 'Friends' },
    { path: '/hubook/photos', icon: Image, label: 'Photos' },
    { path: '/hubook/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessagesCount },
    { path: '/hubook/settings', icon: Settings, label: 'Settings' },
    { path: '/hubook/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications }
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-16 lg:pb-0">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <UniversalNavigationDropdown currentPlatform="hubook" />
              <Link to="/hubook" className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base sm:text-lg">H</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
                  HuBook
                </span>
              </Link>

              <div className="flex-1 max-w-xl relative hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search for people on HuBook..."
                    onClick={() => setShowSearchDropdown(true)}
                    readOnly
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                  />
                </div>
                {showSearchDropdown && (
                  <UserSearchDropdown
                    onClose={() => setShowSearchDropdown(false)}
                    onNavigate={() => setShowSearchDropdown(false)}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
                onClick={() => setShowSearchDropdown(true)}
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>

              <button className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              <div className="hidden lg:flex items-center gap-2">
                <Link
                  to="/hubook/friend-requests"
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <UserPlus className="w-6 h-6 text-gray-700" />
                  {friendRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {friendRequestCount}
                    </span>
                  )}
                </Link>

                <NotificationBellDropdown />

                <Link to="/hubook/profile" className="ml-2">
                  {hubookProfile?.profile_photo_url ? (
                    <img
                      src={hubookProfile.profile_photo_url}
                      alt={hubookProfile.display_name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 hover:border-blue-500 transition-colors"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                      {hubookProfile?.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive(link.path)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                  {(link.badge ?? 0) > 0 && (
                    <span className="ml-auto bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {link.badge! > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {showSearchDropdown && (
        <div className="md:hidden">
          <UserSearchDropdown
            isMobile
            onClose={() => setShowSearchDropdown(false)}
            onNavigate={() => setShowSearchDropdown(false)}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <Link
                to="/hubook/profile"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors mb-4"
              >
                {hubookProfile?.profile_photo_url ? (
                  <img
                    src={hubookProfile.profile_photo_url}
                    alt={hubookProfile.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold text-lg">
                    {hubookProfile?.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">{hubookProfile?.display_name}</div>
                  <div className="text-sm text-gray-500">View profile</div>
                </div>
              </Link>

              <nav className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                      isActive(link.path)
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    <span className="font-medium">{link.label}</span>
                    {(link.badge ?? 0) > 0 && (
                      <span className="ml-auto bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {link.badge! > 9 ? '9+' : link.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {children}
          </main>

          <aside className="hidden xl:block w-80 shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Friend Suggestions</h3>
              <div className="space-y-3">
                {suggestions.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">
                    No suggestions available
                  </div>
                ) : (
                  suggestions.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <Link to={`/hubook/user/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                        {user.profile_photo_url ? (
                          <img
                            src={user.profile_photo_url}
                            alt={user.display_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {user.display_name}
                          </div>
                          {user.work && (
                            <div className="text-xs text-gray-500 truncate">
                              {user.work}
                            </div>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                        title="Add friend"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MobileBottomNav
        unreadMessagesCount={unreadMessagesCount}
        onMenuClick={() => setMobileMenuOpen(true)}
      />

      <FlaggedContentNotificationWrapper />

      {showWelcomeModal && hubookProfile && (
        <WelcomeModal
          onClose={handleWelcomeClose}
          displayName={hubookProfile.display_name}
        />
      )}

      {notificationToasts.map((toast, index) => (
        <NotificationToast
          key={`${toast.notification.id}-${index}`}
          notification={toast.notification}
          user={toast.user}
          onDismiss={() => {
            setNotificationToasts(prev => prev.filter((_, i) => i !== index));
          }}
        />
      ))}
    </div>
  );
}
