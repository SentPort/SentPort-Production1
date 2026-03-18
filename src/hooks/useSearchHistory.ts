import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const MAX_HISTORY_ITEMS = 10;

function getSessionId(): string {
  let sessionId = localStorage.getItem('search_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('search_session_id', sessionId);
  }
  return sessionId;
}

export function useSearchHistory(platform: string = 'main') {
  const { user } = useAuth();
  const [history, setHistory] = useState<Array<{ id: string; query: string; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('search_history')
        .select('id, query, created_at')
        .eq('platform', platform)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ITEMS);

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        const sessionId = getSessionId();
        query = query.eq('session_id', sessionId).is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching search history:', error);
        setHistory([]);
      } else {
        setHistory(data || []);
      }
    } catch (error) {
      console.error('Exception fetching search history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, platform]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const addToHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      const sessionId = user ? null : getSessionId();

      const { error } = await supabase.from('search_history').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        query: query.trim(),
        platform,
      });

      if (error) {
        console.error('Error adding to search history:', error);
      } else {
        await fetchHistory();
      }
    } catch (error) {
      console.error('Exception adding to search history:', error);
    }
  }, [user, platform, fetchHistory]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting search history item:', error);
      } else {
        setHistory(prev => prev.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Exception deleting search history item:', error);
    }
  }, []);

  const clearAllHistory = useCallback(async () => {
    try {
      let query = supabase
        .from('search_history')
        .delete()
        .eq('platform', platform);

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        const sessionId = getSessionId();
        query = query.eq('session_id', sessionId).is('user_id', null);
      }

      const { error } = await query;

      if (error) {
        console.error('Error clearing search history:', error);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error('Exception clearing search history:', error);
    }
  }, [user, platform]);

  return {
    history,
    isLoading,
    addToHistory,
    deleteHistoryItem,
    clearAllHistory,
    refreshHistory: fetchHistory,
  };
}
