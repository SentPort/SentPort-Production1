import { useState, useEffect } from 'react';
import { Bell, Loader2, Check, CheckCheck, Trash2, Settings, UserPlus, MessageCircle, Heart, Share2, AtSign, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuBookLayout from '../../components/hubook/HuBookLayout';

interface Notification {
  id: string;
  type: string;
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  share_id: string | null;
  message: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string;
    profile_photo_url: string | null;
  };
}

type FilterType = 'all' | 'unread' | 'friend_requests' | 'comments' | 'reactions' | 'shares' | 'mentions';

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('hubook_notifications')
        .select(`
          *,
          actor_profile:actor_id (
            display_name,
            profile_photo_url
          )
        `)
        .eq('user_id', user?.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('hubook_notifications_page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hubook_notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleRead = async (notificationId: string, currentRead: boolean) => {
    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .update({ read: !currentRead })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: !currentRead } : n)
      );
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false)
        .eq('dismissed', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllRead = async () => {
    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .delete()
        .eq('user_id', user?.id)
        .eq('read', true);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !n.read));
      setShowDeleteAllConfirm(false);
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.post_id) {
      return `/hubook/post/${notification.post_id}`;
    }
    return null;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus size={16} className="text-blue-600" />;
      case 'comment':
      case 'reply':
        return <MessageCircle size={16} className="text-green-600" />;
      case 'reaction':
        return <Heart size={16} className="text-red-600" />;
      case 'share':
        return <Share2 size={16} className="text-purple-600" />;
      case 'mention':
      case 'tag':
        return <AtSign size={16} className="text-orange-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.read);
        break;
      case 'friend_requests':
        filtered = notifications.filter(n => n.type === 'friend_request' || n.type === 'friend_accepted');
        break;
      case 'comments':
        filtered = notifications.filter(n => n.type === 'comment' || n.type === 'reply');
        break;
      case 'reactions':
        filtered = notifications.filter(n => n.type === 'reaction');
        break;
      case 'shares':
        filtered = notifications.filter(n => n.type === 'share');
        break;
      case 'mentions':
        filtered = notifications.filter(n => n.type === 'mention' || n.type === 'tag');
        break;
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  return (
    <PlatformGuard platform="hubook">
      <HuBookLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Bell className="text-blue-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {readCount > 0 && (
                <button
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Delete read</span>
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <CheckCheck size={18} />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => navigate('/hubook/notification-settings')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('friend_requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'friend_requests'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <UserPlus size={16} />
              Friends
            </button>
            <button
              onClick={() => setFilter('comments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'comments'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageCircle size={16} />
              Comments
            </button>
            <button
              onClick={() => setFilter('reactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'reactions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart size={16} />
              Reactions
            </button>
            <button
              onClick={() => setFilter('shares')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'shares'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Share2 size={16} />
              Shares
            </button>
            <button
              onClick={() => setFilter('mentions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'mentions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AtSign size={16} />
              Mentions
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const link = getNotificationLink(notification);
                const NotificationContent = (
                  <div
                    className={`p-4 transition-colors ${
                      !notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        {notification.actor_profile?.profile_photo_url ? (
                          <img
                            src={notification.actor_profile.profile_photo_url}
                            alt={notification.actor_profile.display_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <Bell size={20} className="text-gray-500" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 leading-relaxed">{notification.message}</p>
                        {notification.actor_profile && (
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.actor_profile.display_name}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleRead(notification.id, notification.read);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                          title={notification.read ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            deleteNotification(notification.id);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );

                return link ? (
                  <Link
                    key={notification.id}
                    to={link}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className="block"
                  >
                    {NotificationContent}
                  </Link>
                ) : (
                  <div key={notification.id}>
                    {NotificationContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <Bell className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {filter === 'unread' ? 'No unread notifications' : `No ${filter.replace('_', ' ')} notifications`}
              </h3>
              <p className="text-gray-600">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications will appear here when you receive them'}
              </p>
            </div>
          )}
        </div>

        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Delete all read notifications?</h3>
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                This will permanently delete all read notifications. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAllRead}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </HuBookLayout>
    </PlatformGuard>
  );
}
