import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Heart, MessageCircle, UserPlus, Sparkles, Film } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  actor_username: string;
  actor_avatar: string;
  post_title?: string;
  post_id?: string;
  reaction_type?: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blog_notifications')
        .select(`
          id,
          type,
          reaction_type,
          is_read,
          created_at,
          actor:actor_id (
            username,
            avatar_url
          ),
          post:post_id (
            id,
            title
          )
        `)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedNotifications = (data || []).map((notif: any) => ({
        id: notif.id,
        type: notif.type,
        actor_username: notif.actor?.username || 'Someone',
        actor_avatar: notif.actor?.avatar_url || '',
        post_title: notif.post?.title,
        post_id: notif.post?.id,
        reaction_type: notif.reaction_type,
        is_read: notif.is_read,
        created_at: notif.created_at
      }));

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadNotifications]);

  const markAsRead = async (notificationIds: string[]) => {
    if (!user) return;

    try {
      await supabase.rpc('mark_blog_notifications_read', {
        notification_ids: notificationIds
      });

      setNotifications(prev =>
        prev.map(notif =>
          notificationIds.includes(notif.id)
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      await supabase.rpc('mark_all_blog_notifications_read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string, reactionType?: string) => {
    if (type === 'new_follower') return <UserPlus className="w-4 h-4 text-blue-500" />;
    if (type === 'screenplay_inspiration') return <Film className="w-4 h-4 text-amber-500" />;
    if (type === 'reaction') {
      if (reactionType === 'love') return <Heart className="w-4 h-4 text-red-500" />;
      if (reactionType === 'inspiring') return <Sparkles className="w-4 h-4 text-purple-500" />;
      return <Heart className="w-4 h-4 text-blue-500" />;
    }
    if (type === 'comment' || type === 'comment_reply') return <MessageCircle className="w-4 h-4 text-green-500" />;
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  const getNotificationMessage = (notif: Notification) => {
    const username = <span className="font-semibold">@{notif.actor_username}</span>;
    const postTitle = notif.post_title ? (
      <span className="font-semibold text-gray-900">"{notif.post_title.slice(0, 40)}..."</span>
    ) : null;

    switch (notif.type) {
      case 'new_follower':
        return <span>{username} started following you</span>;
      case 'screenplay_inspiration':
        return <span>{username} wrote a screenplay inspired by your story {postTitle}</span>;
      case 'reaction':
        return <span>{username} reacted to {postTitle}</span>;
      case 'comment':
        return <span>{username} commented on {postTitle}</span>;
      case 'comment_reply':
        return <span>{username} replied to your comment</span>;
      default:
        return <span>New notification from {username}</span>;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No notifications yet</p>
                  <p className="text-sm mt-1">We'll notify you when something happens</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <Link
                      key={notif.id}
                      to={notif.post_id ? `/blog/post/${notif.post_id}` : '#'}
                      onClick={() => {
                        if (!notif.is_read) {
                          markAsRead([notif.id]);
                        }
                        setIsOpen(false);
                      }}
                      className={`flex gap-3 p-4 hover:bg-gray-50 transition-colors ${
                        !notif.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      {notif.actor_avatar ? (
                        <img
                          src={notif.actor_avatar}
                          alt={notif.actor_username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white font-bold">
                          {notif.actor_username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {getNotificationIcon(notif.type, notif.reaction_type)}
                          <p className="text-sm text-gray-700 flex-1">
                            {getNotificationMessage(notif)}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(notif.created_at)}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
