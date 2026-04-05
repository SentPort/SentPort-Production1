import { supabase } from './supabase';

/**
 * Admin bypass helper for crawler queue operations.
 * Uses SECURITY DEFINER functions that bypass RLS when PostgREST cache is stale.
 */

export interface CrawlerQueueCounts {
  total_count: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
}

export interface CrawlerQueueItem {
  id: number;
  url: string;
  status: string;
  priority: number;
  retry_count: number;
  created_at: string;
  updated_at: string;
  last_error: string | null;
  indexed_at: string | null;
}

/**
 * Fetch crawler queue counts using admin bypass function
 */
export async function fetchCrawlerQueueCountsAdmin(): Promise<CrawlerQueueCounts | null> {
  try {
    const { data, error } = await supabase.rpc('get_crawler_queue_counts_for_admin');

    if (error) {
      console.error('[fetchCrawlerQueueCountsAdmin] Error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        total_count: 0,
        pending_count: 0,
        completed_count: 0,
        failed_count: 0
      };
    }

    return data[0];
  } catch (err) {
    console.error('[fetchCrawlerQueueCountsAdmin] Exception:', err);
    return null;
  }
}

/**
 * Fetch crawler queue items using admin bypass function
 */
export async function fetchCrawlerQueueItemsAdmin(
  filterStatus: string | null = null,
  pageLimit: number = 50,
  pageOffset: number = 0
): Promise<CrawlerQueueItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_crawler_queue_for_admin', {
      filter_status: filterStatus,
      page_limit: pageLimit,
      page_offset: pageOffset
    });

    if (error) {
      console.error('[fetchCrawlerQueueItemsAdmin] Error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[fetchCrawlerQueueItemsAdmin] Exception:', err);
    return [];
  }
}

/**
 * Try direct query first, fall back to admin bypass if RLS fails
 */
export async function fetchCrawlerQueueWithFallback(
  filterStatus: string | null = null,
  pageLimit: number = 50,
  pageOffset: number = 0
): Promise<{ items: CrawlerQueueItem[]; usedFallback: boolean }> {
  try {
    let query = supabase
      .from('crawler_queue')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .range(pageOffset, pageOffset + pageLimit - 1);

    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[fetchCrawlerQueueWithFallback] Direct query failed, using admin bypass:', error);
      const fallbackData = await fetchCrawlerQueueItemsAdmin(filterStatus, pageLimit, pageOffset);
      return { items: fallbackData, usedFallback: true };
    }

    return { items: data || [], usedFallback: false };
  } catch (err) {
    console.error('[fetchCrawlerQueueWithFallback] Exception, using admin bypass:', err);
    const fallbackData = await fetchCrawlerQueueItemsAdmin(filterStatus, pageLimit, pageOffset);
    return { items: fallbackData, usedFallback: true };
  }
}

/**
 * Try direct count query first, fall back to admin bypass if RLS fails
 */
export async function fetchCrawlerQueueCountsWithFallback(): Promise<{
  counts: CrawlerQueueCounts;
  usedFallback: boolean;
}> {
  try {
    // Try direct queries first
    const [pendingResult, completedResult, failedResult, totalResult] = await Promise.all([
      supabase.from('crawler_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('crawler_queue').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('crawler_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('crawler_queue').select('id', { count: 'exact', head: true })
    ]);

    if (pendingResult.error || completedResult.error || failedResult.error || totalResult.error) {
      console.warn('[fetchCrawlerQueueCountsWithFallback] Direct queries failed, using admin bypass');
      const fallbackCounts = await fetchCrawlerQueueCountsAdmin();
      return {
        counts: fallbackCounts || {
          total_count: 0,
          pending_count: 0,
          completed_count: 0,
          failed_count: 0
        },
        usedFallback: true
      };
    }

    return {
      counts: {
        total_count: totalResult.count || 0,
        pending_count: pendingResult.count || 0,
        completed_count: completedResult.count || 0,
        failed_count: failedResult.count || 0
      },
      usedFallback: false
    };
  } catch (err) {
    console.error('[fetchCrawlerQueueCountsWithFallback] Exception, using admin bypass:', err);
    const fallbackCounts = await fetchCrawlerQueueCountsAdmin();
    return {
      counts: fallbackCounts || {
        total_count: 0,
        pending_count: 0,
        completed_count: 0,
        failed_count: 0
      },
      usedFallback: true
    };
  }
}
