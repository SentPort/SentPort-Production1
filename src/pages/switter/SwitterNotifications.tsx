import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Repeat2, MessageCircle, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  tweet_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    handle: string;
    display_name: string;
    avatar_url: string;
  };
}

export default function SwitterNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      markAsRead();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    const { data: notifData } = await supabase
      .from('switter_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifData) {
      const notificationsWithActors = await Promise.all(
        notifData.map(async (notif) => {
          const { data: actor } = await supabase
            .from('switter_accounts')
            .select('handle, display_name, avatar_url')
            .eq('user_id', notif.actor_id)
            .maybeSingle();

          return {
            ...notif,
            actor: actor || { handle: '', display_name: 'Unknown', avatar_url: '' }
          };
        })
      );

      setNotifications(notificationsWithActors);
    }
    setLoading(false);
  };

  const markAsRead = async () => {
    if (!user) return;

    await supabase
      .from('switter_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'retweet':
        return <Repeat2 className="w-5 h-5 text-green-500" />;
      case 'comment':
      case 'reply':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (type: string) => {
    switch (type) {
      case 'like':
        return 'liked your sweet';
      case 'retweet':
        return 'resweet your sweet';
      case 'comment':
      case 'reply':
        return 'replied to your sweet';
      case 'follow':
        return 'followed you';
      case 'mention':
        return 'mentioned you in a sweet';
      default:
        return 'interacted with you';
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="sticky top-16 z-10 bg-white border-b border-gray-200 p-4">
            <h1 className="text-xl font-bold">Notifications</h1>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No notifications yet</p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <Link
                  key={notif.id}
                  to={notif.tweet_id ? `/switter/tweet/${notif.tweet_id}` : `/switter/u/${notif.actor.handle}`}
                  className={`flex gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    !notif.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  <img
                    src={notif.actor.avatar_url || 'https://via.placeholder.com/48'}
                    alt={notif.actor.display_name}
                    className="w-10 h-10 rounded-full"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-bold">{notif.actor.display_name}</span>
                      {' '}
                      <span className="text-gray-600">{getNotificationText(notif.type)}</span>
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDistanceToNow(notif.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
