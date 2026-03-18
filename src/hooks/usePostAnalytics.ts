import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PostAnalyticsData {
  post: {
    id: string;
    caption: string;
    media_url: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    save_count: number;
    created_at: string;
    author_username: string;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_views: number;
    unique_viewers: number;
    avg_view_duration: number;
    mobile_views: number;
    desktop_views: number;
    tablet_views: number;
  };
  daily_views: Array<{
    date: string;
    views: number;
  }>;
  traffic_sources: Array<{
    source: string;
    views: number;
  }>;
  engagement_rate: number;
}

export function usePostAnalytics(postId: string | null, startDate?: string, endDate?: string) {
  const [data, setData] = useState<PostAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    async function fetchPostAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const params: Record<string, string> = { p_post_id: postId };
        if (startDate) params.p_start_date = startDate;
        if (endDate) params.p_end_date = endDate;

        const { data: result, error: rpcError } = await supabase
          .rpc('get_hinsta_post_analytics', params);

        if (rpcError) throw rpcError;

        setData(result);
      } catch (err) {
        console.error('Error fetching post analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load post analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchPostAnalytics();
  }, [postId, startDate, endDate]);

  return { data, loading, error };
}
