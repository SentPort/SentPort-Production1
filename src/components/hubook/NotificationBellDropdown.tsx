import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Loader2, UserPlus, MessageCircle, Heart, Share2, AtSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  actor_id: string;
  post_id: string | null;
  comment_id: string | null;
  share_id: string | null;
  album_media_comment_id: string | null;
  message: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  actor_profile?: {
    display_name: string;
    profile_photo_url: string | null;
  };
}

export default function NotificationBellDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
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
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('hubook_notifications_changes')
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

  const dismissNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .update({ dismissed: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.read ? prev - 1 : prev;
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
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
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('hubook_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('dismissed', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return <UserPlus size={16} className="text-blue-600" />;
      case 'comment':
      case 'comment_reply':
      case 'album_media_comment':
        return <MessageCircle size={16} className="text-green-600" />;
      case 'reaction':
      case 'album_media_reaction':
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

  const getNotificationLink = async (notification: Notification): Promise<string | null> => {
    if (notification.post_id) {
      return `/hubook/post/${notification.post_id}`;
    }

    if (notification.album_media_comment_id) {
      try {
        const { data: comment } = await supabase
          .from('album_media_comments')
          .select('media_id')
          .eq('id', notification.album_media_comment_id)
          .single();

        if (comment?.media_id) {
          return `/hubook/albums/media/${comment.media_id}`;
        }
      } catch (error) {
        console.error('Error fetching album media comment:', error);
      }
    }

    return null;
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

  const handleNotificationClick = async (notification: Notification) => {
    const link = await getNotificationLink(notification);
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (link) {
      navigate(link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 animate-slideDown">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Check size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : notifications.length > 0 ? (
              <>
                {notifications.map((notification) => {
                  const hasLink = !!(notification.post_id || notification.album_media_comment_id);
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 border-b border-gray-100 ${hasLink ? 'cursor-pointer' : ''} transition-colors ${
                        !notification.read ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          {notification.actor_profile?.profile_photo_url ? (
                            <img
                              src={notification.actor_profile.profile_photo_url}
                              alt={notification.actor_profile.display_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Bell size={20} className="text-gray-500" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => dismissNotification(notification.id, e)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                          title="Dismiss"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <Link
                  to="/hubook/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-center text-sm text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                >
                  View All Notifications
                </Link>
              </>
            ) : (
              <div className="py-8 px-4 text-center">
                <Bell className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-600 font-medium">No notifications</p>
                <p className="text-sm text-gray-500 mt-1">
                  You're all caught up!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
