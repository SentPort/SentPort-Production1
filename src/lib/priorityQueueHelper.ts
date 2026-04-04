import { supabase } from './supabase';

interface AddToPriorityQueueResult {
  success: boolean;
  message: string;
  action?: 'inserted' | 'updated' | 'exists' | 'limit_reached' | 'skipped';
}

export async function addWikipediaUrlToPriorityQueue(
  wikipediaUrl: string
): Promise<AddToPriorityQueueResult> {
  try {
    if (!wikipediaUrl) {
      return {
        success: false,
        message: 'No URL provided',
        action: 'skipped'
      };
    }

    const normalizedUrl = normalizeWikipediaUrl(wikipediaUrl);

    if (!isValidWikipediaArticleUrl(normalizedUrl)) {
      console.log('[PriorityQueue] Skipping invalid Wikipedia URL:', normalizedUrl);
      return {
        success: false,
        message: 'Invalid Wikipedia article URL',
        action: 'skipped'
      };
    }

    const { count: priorityCount, error: countError } = await supabase
      .from('crawler_queue')
      .select('*', { count: 'exact', head: true })
      .eq('priority_crawl', true)
      .eq('status', 'pending');

    if (countError) {
      console.error('[PriorityQueue] Error checking priority queue count:', countError);
      return {
        success: false,
        message: 'Error checking priority queue count',
        action: 'skipped'
      };
    }

    if (priorityCount !== null && priorityCount >= 100) {
      console.log('[PriorityQueue] Priority queue at capacity (100 URLs). Skipping auto-add.');
      return {
        success: false,
        message: 'Priority queue at capacity (100 URLs)',
        action: 'limit_reached'
      };
    }

    const { data: existingUrls, error: checkError } = await supabase
      .from('crawler_queue')
      .select('id, priority_crawl, status')
      .eq('url', normalizedUrl)
      .maybeSingle();

    if (checkError) {
      console.error('[PriorityQueue] Error checking existing URL:', checkError);
      return {
        success: false,
        message: 'Error checking existing URL',
        action: 'skipped'
      };
    }

    if (existingUrls) {
      if (existingUrls.priority_crawl) {
        console.log('[PriorityQueue] URL already in priority queue:', normalizedUrl);
        return {
          success: true,
          message: 'URL already in priority queue',
          action: 'exists'
        };
      }

      const { error: updateError } = await supabase
        .from('crawler_queue')
        .update({
          priority_crawl: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUrls.id);

      if (updateError) {
        console.error('[PriorityQueue] Error updating URL to priority:', updateError);
        return {
          success: false,
          message: 'Error updating URL to priority',
          action: 'skipped'
        };
      }

      console.log('[PriorityQueue] Updated existing URL to priority queue:', normalizedUrl);
      return {
        success: true,
        message: 'URL updated to priority queue',
        action: 'updated'
      };
    }

    const { error: insertError } = await supabase
      .from('crawler_queue')
      .insert({
        url: normalizedUrl,
        priority_crawl: true,
        manual_priority: false,
        priority_crawl_failed: false,
        status: 'pending',
        source_type: 'external',
        priority: 10,
        attempts: 0,
        scheduled_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[PriorityQueue] Error inserting URL to priority queue:', insertError);
      return {
        success: false,
        message: 'Error inserting URL to priority queue',
        action: 'skipped'
      };
    }

    console.log('[PriorityQueue] Successfully added Wikipedia URL to priority queue:', normalizedUrl);
    return {
      success: true,
      message: 'URL added to priority queue',
      action: 'inserted'
    };

  } catch (error) {
    console.error('[PriorityQueue] Unexpected error:', error);
    return {
      success: false,
      message: 'Unexpected error',
      action: 'skipped'
    };
  }
}

function normalizeWikipediaUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
}

function isValidWikipediaArticleUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    if (!urlObj.hostname.endsWith('wikipedia.org')) {
      return false;
    }

    if (!urlObj.pathname.startsWith('/wiki/')) {
      return false;
    }

    const articleTitle = urlObj.pathname.replace('/wiki/', '');

    if (articleTitle.includes(':')) {
      return false;
    }

    if (articleTitle.length === 0) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
