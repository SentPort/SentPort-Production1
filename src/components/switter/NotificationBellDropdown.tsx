import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, Repeat2, MessageCircle, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Notification {
  id: string;
  notification_type: string;
  read: boolean;
  created_at: string;
  actor: {
    handle: string;
    display_name: string;
    avatar_url: string;
  };
  tweet?: {
    id: string;
    content: string;
  };
}

export default function NotificationBellDropdown() {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const subscription = supabase
        .channel('switter_notifications_changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'switter_notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          loadNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('switter_notifications')
      .select(`
        *,
        actor:actor_id(handle, display_name, avatar_url),
        tweet:tweet_id(id, content)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data.map((n: any) => ({
        id: n.id,
        notification_type: n.notification_type,
        read: n.read,
        created_at: n.created_at,
        actor: n.actor,
        tweet: n.tweet
      })));
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('switter_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    loadNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'retweet':
        return <Repeat2 className="w-4 h-4 text-green-500" />;
      case 'reply':
      case 'mention':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <Users className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.notification_type) {
      case 'like':
        return 'liked your sweet';
      case 'retweet':
        return 'resweet your sweet';
      case 'reply':
        return 'replied to your sweet';
      case 'mention':
        return 'mentioned you';
      case 'follow':
        return 'followed you';
      default:
        return 'interacted with you';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold">Notifications</h3>
              <Link
                to="/switter/notifications"
                className="text-blue-500 text-sm hover:underline"
                onClick={() => setShowDropdown(false)}
              >
                See all
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <img
                            src={notification.actor.avatar_url || 'https://via.placeholder.com/32'}
                            alt={notification.actor.display_name}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-bold">{notification.actor.display_name}</span>
                              {' '}
                              <span className="text-gray-600">{getNotificationText(notification)}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(notification.created_at)}
                            </p>
                          </div>
                        </div>
                        {notification.tweet && (
                          <p className="text-sm text-gray-700 mt-1 truncate">
                            {notification.tweet.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
