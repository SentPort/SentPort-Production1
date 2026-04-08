import { useEffect, useState, useRef } from 'react';
import { Bell, Check, Trash2, MessageSquare, TrendingUp, MessageCircle, Users, UserPlus, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface HedditNotification {
  id: string;
  type: 'comment_reply' | 'post_reply' | 'mention' | 'community_mention' | 'upvote_milestone' | 'subreddit_update' | 'moderation_action' | 'new_follower';
  content_type: 'post' | 'comment' | 'subreddit' | 'follow';
  content_id: string;
  post_id: string | null;
  following_id?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  heddit_accounts?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function NotificationBellDropdown() {
  const [notifications, setNotifications] = useState<HedditNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hedditAccountId, setHedditAccountId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHedditAccount();
  }, []);

  useEffect(() => {
    if (hedditAccountId) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [hedditAccountId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHedditAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setHedditAccountId(data.id);
    }
  };

  const loadNotifications = async () => {
    if (!hedditAccountId) return;

    setLoading(true);
    const { data } = await supabase
      .from('heddit_notifications')
      .select(`
        *,
        heddit_accounts!heddit_notifications_actor_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('user_id', hedditAccountId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
    setLoading(false);
  };

  const subscribeToNotifications = () => {
    if (!hedditAccountId) return;

    const channel = supabase
      .channel('heddit-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'heddit_notifications',
          filter: `user_id=eq.${hedditAccountId}`,
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
    await supabase
      .from('heddit_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!hedditAccountId) return;

    await supabase.rpc('mark_all_heddit_notifications_read', {
      p_heddit_account_id: hedditAccountId
    });

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase
      .from('heddit_notifications')
      .delete()
      .eq('id', notificationId);

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: HedditNotification['type']) => {
    switch (type) {
      case 'comment_reply':
      case 'post_reply':
        return <MessageCircle className="w-5 h-5 text-orange-500" />;
      case 'upvote_milestone':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'mention':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'community_mention':
        return <Users className="w-5 h-5 text-orange-600" />;
      case 'new_follower':
        return <UserPlus className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationLink = (notification: HedditNotification) => {
    if (notification.type === 'new_follower' && notification.heddit_accounts?.username) {
      return `/heddit/user/${notification.heddit_accounts.username}`;
    }
    if (notification.post_id) {
      return `/heddit/post/${notification.post_id}`;
    }
    return '#';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - notificationTime.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-bold text-lg text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm mt-1">When you get notifications, they'll show up here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {notification.type === 'new_follower' && notification.heddit_accounts ? (
                        <Link
                          to={`/heddit/user/${notification.heddit_accounts.username}`}
                          onClick={() => setIsOpen(false)}
                          className="flex-shrink-0"
                        >
                          {notification.heddit_accounts.avatar_url ? (
                            <img
                              src={notification.heddit_accounts.avatar_url}
                              alt={notification.heddit_accounts.display_name || notification.heddit_accounts.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-orange-600" />
                            </div>
                          )}
                        </Link>
                      ) : (
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link
                          to={getNotificationLink(notification)}
                          onClick={() => {
                            if (!notification.is_read) {
                              markAsRead(notification.id);
                            }
                            setIsOpen(false);
                          }}
                          className="block group"
                        >
                          <p className="text-sm text-gray-900 group-hover:text-orange-600">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </Link>
                      </div>
                      <div className="flex-shrink-0 flex items-start gap-1">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
