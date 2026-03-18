import { useState, useEffect } from 'react';
import { Bell, Loader2, Check, CheckCheck, Trash2, Settings, Video, MessageSquare, Heart, UserPlus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';

interface Notification {
  id: string;
  type: string;
  video_id: string | null;
  channel_id: string | null;
  actor_channel_id: string | null;
  message: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  actor_channel?: {
    handle: string;
    display_name: string;
    profile_photo_url: string | null;
  };
}

type FilterType = 'all' | 'unread' | 'videos' | 'comments' | 'engagement';

export default function Notifications() {
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
        .from('hutube_notifications')
        .select(`
          *,
          actor_channel:actor_channel_id (
            handle,
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
      .channel('hutube_notifications_page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hutube_notifications',
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
        .from('hutube_notifications')
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
        .from('hutube_notifications')
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
        .from('hutube_notifications')
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
        .from('hutube_notifications')
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
        .from('hutube_notifications')
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
    if (notification.video_id) {
      return `/hutube/watch/${notification.video_id}`;
    } else if (notification.channel_id) {
      return `/hutube/channel/${notification.channel_id}`;
    } else if (notification.actor_channel?.handle) {
      return `/hutube/channel/${notification.actor_channel.handle}`;
    }
    return null;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_video':
        return <Video size={16} className="text-red-600" />;
      case 'new_comment':
      case 'comment_reply':
        return <MessageSquare size={16} className="text-blue-600" />;
      case 'video_liked':
        return <Heart size={16} className="text-pink-600" />;
      case 'new_subscriber':
        return <UserPlus size={16} className="text-green-600" />;
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
      case 'videos':
        filtered = notifications.filter(n => n.type === 'new_video');
        break;
      case 'comments':
        filtered = notifications.filter(n => n.type === 'new_comment' || n.type === 'comment_reply');
        break;
      case 'engagement':
        filtered = notifications.filter(n => n.type === 'video_liked' || n.type === 'new_subscriber');
        break;
    }

    return filtered;
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Bell className="text-red-600" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full">
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
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <CheckCheck size={18} />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => navigate('/hutube/notification-settings')}
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
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'unread'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('videos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'videos'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Video size={16} />
              Videos
            </button>
            <button
              onClick={() => setFilter('comments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'comments'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageSquare size={16} />
              Comments
            </button>
            <button
              onClick={() => setFilter('engagement')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === 'engagement'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart size={16} />
              Engagement
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const link = getNotificationLink(notification);
                const NotificationContent = (
                  <div
                    className={`p-4 transition-colors ${
                      !notification.read ? 'bg-red-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {notification.actor_channel?.profile_photo_url ? (
                        <img
                          src={notification.actor_channel.profile_photo_url}
                          alt={notification.actor_channel.display_name}
                          className="w-12 h-12 rounded-full flex-shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1">
                            <p className="text-gray-900 leading-relaxed">{notification.message}</p>
                            {notification.actor_channel && (
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.actor_channel.display_name}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleRead(notification.id, notification.read);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors"
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
                {filter === 'unread' ? 'No unread notifications' : `No ${filter} notifications`}
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
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete all read notifications?</h3>
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
      </HuTubeLayout>
    </PlatformGuard>
  );
}
