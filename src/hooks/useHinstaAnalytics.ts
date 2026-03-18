import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AnalyticsData {
  account: {
    username: string;
    display_name: string;
    avatar_url: string;
    follower_count: number;
    following_count: number;
    post_count: number;
    account_created_at: string;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
  overview: {
    total_post_views: number;
    total_profile_views: number;
    total_view_time: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    total_saves: number;
    new_followers: number;
    total_engagement: number;
  };
  top_posts: Array<{
    id: string;
    media_url: string;
    caption: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    engagement_rate: number;
    created_at: string;
  }>;
}

export function useHinstaAnalytics(accountId: string | null, startDate?: string, endDate?: string) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }

    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = { p_account_id: accountId };
        if (startDate) params.p_start_date = startDate;
        if (endDate) params.p_end_date = endDate;

        const { data: result, error: rpcError } = await supabase
          .rpc('get_hinsta_account_analytics', params);

        if (rpcError) throw rpcError;

        setData(result);
      } catch (err) {
        console.error('Error fetching Hinsta analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [accountId, startDate, endDate]);

  return { data, loading, error };
}
