import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FlaggedContentNotification {
  id: string;
  post_id: string;
  platform: string;
  content_preview: string;
  notification_shown_at: string | null;
  notification_dismissed_at: string | null;
  review_completed_at: string | null;
  created_at: string;
}

export function useFlaggedContentNotifications() {
  const { user } = useAuth();
  const [pendingNotification, setPendingNotification] = useState<FlaggedContentNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch notifications that haven't been dismissed and haven't been reviewed yet
      const { data, error } = await supabase
        .from('flagged_post_notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('notification_dismissed_at', null)
        .is('review_completed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPendingNotification(data);
      } else {
        setPendingNotification(null);
      }
    } catch (error) {
      console.error('Error fetching flagged content notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPendingNotifications();
  }, [fetchPendingNotifications]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time changes for new flagged content notifications
    const channel = supabase
      .channel('flagged_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'flagged_post_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as FlaggedContentNotification;
          // Only show if not dismissed and not reviewed
          if (!newNotification.notification_dismissed_at && !newNotification.review_completed_at) {
            setPendingNotification(newNotification);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'flagged_post_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as FlaggedContentNotification;
          // If dismissed or reviewed, clear the pending notification
          if (updatedNotification.notification_dismissed_at || updatedNotification.review_completed_at) {
            setPendingNotification(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsShown = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('flagged_post_notifications')
        .update({ notification_shown_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as shown:', error);
    }
  }, [user]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('flagged_post_notifications')
        .update({ notification_dismissed_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPendingNotification(null);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, [user]);

  return {
    pendingNotification,
    isLoading,
    markAsShown,
    dismissNotification
  };
}
