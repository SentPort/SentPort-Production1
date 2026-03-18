import { useState, useEffect } from 'react';
import { Bell, ThumbsUp, MessageCircle, UserPlus, Share2, Flag, AtSign, CheckCheck } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';

export default function Notifications() {
  const { hubookProfile } = useHuBook();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    if (hubookProfile) {
      fetchNotifications();
    }
  }, [hubookProfile]);

  const fetchNotifications = async () => {
    if (!hubookProfile) return;

    const { data } = await supabase
      .from('notifications')
      .select('*, related_user:hubook_profiles!related_user_id(*)')
      .eq('user_id', hubookProfile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setLoading(false);

    const unreadIds = (data || []).filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  const markAllAsRead = async () => {
    if (!hubookProfile || markingAllRead) return;

    setMarkingAllRead(true);

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', hubookProfile.id)
        .eq('is_read', false);

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reaction':
        return <ThumbsUp className="w-5 h-5 text-blue-600" />;
      case 'comment':
      case 'comment_reply':
        return <MessageCircle className="w-5 h-5 text-green-600" />;
      case 'friend_request':
      case 'friend_request_accepted':
        return <UserPlus className="w-5 h-5 text-purple-600" />;
      case 'share':
        return <Share2 className="w-5 h-5 text-orange-600" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-cyan-600" />;
      case 'post_under_review':
        return <Flag className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationText = (notification: any) => {
    const userName = notification.related_user?.display_name || 'Someone';

    switch (notification.type) {
      case 'reaction':
        return `${userName} reacted to your post`;
      case 'comment':
        return `${userName} commented on your post`;
      case 'comment_reply':
        return `${userName} replied to your comment`;
      case 'friend_request':
        return `${userName} sent you a friend request`;
      case 'friend_request_accepted':
        return `${userName} accepted your friend request`;
      case 'share':
        return `${userName} shared your post`;
      case 'mention':
        return notification.content_type === 'comment'
          ? `${userName} mentioned you in a comment`
          : `${userName} mentioned you in a post`;
      case 'post_under_review':
        return 'Your post has been flagged for review';
      default:
        return 'New notification';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {hasUnread && (
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              {markingAllRead ? 'Marking...' : 'Mark all as read'}
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">{getNotificationText(notification)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>

                  {notification.related_user && (
                    <div className="flex-shrink-0">
                      {notification.related_user.profile_photo_url ? (
                        <img
                          src={notification.related_user.profile_photo_url}
                          alt={notification.related_user.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                          {notification.related_user.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
