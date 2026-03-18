import { useEffect, useState } from 'react';
import { X, AtSign, Heart, MessageCircle, UserPlus, Share2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NotificationToastProps {
  notification: {
    id: string;
    type: string;
    related_user_id?: string;
    related_content_id?: string;
    content_type?: string;
    created_at: string;
  };
  user?: {
    display_name: string;
    profile_photo_url?: string;
  };
  onDismiss: () => void;
  autoHideDuration?: number;
}

export default function NotificationToast({
  notification,
  user,
  onDismiss,
  autoHideDuration = 5000
}: NotificationToastProps) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setVisible(true), 10);

    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleClick = () => {
    handleDismiss();

    switch (notification.type) {
      case 'mention':
        if (notification.content_type === 'post' && notification.related_content_id) {
          navigate(`/hubook/post/${notification.related_content_id}`);
        } else if (notification.content_type === 'comment' && notification.related_content_id) {
          navigate(`/hubook/post/${notification.related_content_id}`);
        }
        break;
      case 'comment':
      case 'comment_reply':
      case 'reaction':
      case 'share':
        if (notification.related_content_id) {
          navigate(`/hubook/post/${notification.related_content_id}`);
        }
        break;
      case 'friend_request':
      case 'friend_request_accepted':
        navigate('/hubook/friends');
        break;
      default:
        navigate('/hubook/notifications');
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'mention':
        return <AtSign className="w-5 h-5 text-blue-600" />;
      case 'reaction':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
      case 'comment_reply':
        return <MessageCircle className="w-5 h-5 text-green-600" />;
      case 'friend_request':
      case 'friend_request_accepted':
        return <UserPlus className="w-5 h-5 text-purple-600" />;
      case 'share':
        return <Share2 className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMessage = () => {
    const userName = user?.display_name || 'Someone';

    switch (notification.type) {
      case 'mention':
        return `${userName} mentioned you in a ${notification.content_type || 'post'}`;
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
      default:
        return 'New notification';
    }
  };

  return (
    <div
      className={`fixed top-20 right-4 z-[100] transform transition-all duration-300 ease-out ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-4 min-w-[320px] max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {user?.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={user.display_name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                {user?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-1">{getIcon()}</div>
              <button
                onClick={handleClick}
                className="flex-1 text-left text-sm text-gray-900 hover:text-blue-600 transition-colors"
              >
                {getMessage()}
              </button>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
