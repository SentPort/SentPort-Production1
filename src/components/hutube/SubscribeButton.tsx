import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SubscribeButtonProps {
  channelId: string;
  channelName: string;
  size?: 'small' | 'medium' | 'large';
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export default function SubscribeButton({
  channelId,
  channelName,
  size = 'medium',
  onSubscriptionChange
}: SubscribeButtonProps) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, [channelId, user]);

  const checkSubscription = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('hutube_subscriptions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsSubscribed(!!data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      if (isSubscribed) {
        const { error } = await supabase.rpc('unsubscribe_from_channel', {
          p_channel_id: channelId
        });
        if (error) throw error;
        setIsSubscribed(false);
        onSubscriptionChange?.(false);
      } else {
        const { error } = await supabase.rpc('subscribe_to_channel', {
          p_channel_id: channelId
        });
        if (error) throw error;
        setIsSubscribed(true);
        onSubscriptionChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <button
        disabled
        className={`
          ${size === 'small' ? 'px-3 py-1 text-sm' : size === 'large' ? 'px-6 py-3 text-lg' : 'px-4 py-2'}
          bg-gray-200 text-gray-400 rounded-full font-semibold cursor-not-allowed
        `}
      >
        Loading...
      </button>
    );
  }

  if (!user) {
    return null;
  }

  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={handleSubscribe}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        ${isSubscribed
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-red-600 text-white hover:bg-red-700'
        }
        rounded-full font-semibold transition-all disabled:opacity-50
      `}
    >
      {isSubscribed ? 'Subscribed' : 'Subscribe'}
    </button>
  );
}
