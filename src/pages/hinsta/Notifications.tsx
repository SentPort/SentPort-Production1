import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  notification_type: string;
  content_type: string | null;
  content_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAccount, setMyAccount] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount) {
      loadNotifications();
    }
  }, [myAccount, filter]);

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadNotifications = async () => {
    setLoading(true);

    let query = supabase
      .from('hinsta_notifications')
      .select('*')
      .eq('recipient_id', myAccount.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data: notifData } = await query;

    if (notifData) {
      const notificationsWithActors = await Promise.all(
        notifData.map(async (notif) => {
          const { data: actorData } = await supabase
            .from('hinsta_accounts')
            .select('username, display_name, avatar_url')
            .eq('id', notif.actor_id)
            .maybeSingle();

          return {
            ...notif,
            actor: actorData || { username: 'Unknown', display_name: 'Unknown User', avatar_url: null }
          };
        })
      );

      setNotifications(notificationsWithActors);
    }

    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('hinsta_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    await supabase
      .from('hinsta_notifications')
      .update({ is_read: true })
      .eq('recipient_id', myAccount.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-8 h-8 text-red-500 fill-red-500" />;
      case 'comment':
        return <MessageCircle className="w-8 h-8 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-8 h-8 text-green-500" />;
      default:
        return <Heart className="w-8 h-8 text-gray-500" />;
    }
  };

  const getNotificationText = (notif: Notification) => {
    switch (notif.notification_type) {
      case 'like':
        return 'liked your post.';
      case 'comment':
        return 'commented on your post.';
      case 'follow':
        return 'started following you.';
      default:
        return 'interacted with your content.';
    }
  };

  const getNotificationLink = (notif: Notification) => {
    if (notif.notification_type === 'follow') {
      return `/hinsta/${notif.actor.username}`;
    } else if (notif.content_id) {
      return `/hinsta/post/${notif.content_id}`;
    }
    return null;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath="/hinsta">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Notifications</h1>
                {notifications.some(n => !n.is_read) && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-pink-500 hover:text-pink-600 font-semibold"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    filter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    filter === 'unread'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Unread
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Heart className="w-16 h-16 mb-4" />
                  <p className="font-semibold">No notifications yet</p>
                  <p className="text-sm mt-2">When someone interacts with your posts, you'll see it here</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const link = getNotificationLink(notif);
                  const content = (
                    <div
                      className={`flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors ${
                        !notif.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => !notif.is_read && markAsRead(notif.id)}
                    >
                      <Link to={`/hinsta/${notif.actor.username}`} className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                          <div className="w-full h-full rounded-full bg-white p-0.5">
                            {notif.actor.avatar_url ? (
                              <img
                                src={notif.actor.avatar_url}
                                alt={notif.actor.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                                {notif.actor.username[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <Link
                            to={`/hinsta/${notif.actor.username}`}
                            className="font-semibold hover:underline"
                          >
                            {notif.actor.username}
                          </Link>{' '}
                          <span className="text-gray-700">{getNotificationText(notif)}</span>{' '}
                          <span className="text-gray-500">{formatTime(notif.created_at)}</span>
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {getNotificationIcon(notif.notification_type)}
                      </div>

                      {!notif.is_read && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  );

                  return link ? (
                    <Link key={notif.id} to={link}>
                      {content}
                    </Link>
                  ) : (
                    <div key={notif.id}>{content}</div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}
