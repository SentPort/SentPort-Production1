import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, RefreshCw, Zap, BarChart3, CheckCircle, XCircle, Clock, TrendingUp, ChevronLeft, ChevronRight, AlertCircle, ChevronDown, ChevronUp, Play, Pause, Tag, Link } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isAuthError, getErrorMessage, logAuthDebug } from '../../lib/authHelpers';
import { normalizeUrl } from '../../lib/urlHelpers';
import { withRetry, isPermanentSessionError } from '../../lib/databaseRetry';
import Header from '../../components/Header';
import SessionExpiredModal from '../../components/shared/SessionExpiredModal';
import ContentTypeRulesManager from '../../components/admin/ContentTypeRulesManager';

interface CrawlerStats {
  total_crawled: number;
  successful: number;
  failed: number;
  in_queue: number;
}

interface QueueItem {
  id: string;
  url: string;
  priority: number;
  status: string;
  attempts: number;
  scheduled_at: string;
  last_error: string | null;
  priority_crawl: boolean;
  priority_crawl_failed: boolean;
}

interface QueueStatusCounts {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface CrawlerHistoryRecord {
  id: string;
  crawl_type: string;
  batch_size: number;
  successful_count: number;
  failed_count: number;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  status: string;
}

export default function WebCrawlerDashboard() {
  const { user, isAdmin, sessionExpired, isAuthTransitioning } = useAuth();
  const [stats, setStats] = useState<CrawlerStats>({
    total_crawled: 0,
    successful: 0,
    failed: 0,
    in_queue: 0
  });
  const [queueStatusCounts, setQueueStatusCounts] = useState<QueueStatusCounts>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  });
  const [priorityCrawlCount, setPriorityCrawlCount] = useState(0);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const itemsPerPage = 20;
  const [urlInput, setUrlInput] = useState('');
  const [priority, setPriority] = useState('5');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [urlFilter, setUrlFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [addUrlStatus, setAddUrlStatus] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info'
  });
  const [processingStatus, setProcessingStatus] = useState<{
    show: boolean;
    message: string;
    progress: number;
    total: number;
    successful: number;
    failed: number;
  }>({
    show: false,
    message: '',
    progress: 0,
    total: 0,
    successful: 0,
    failed: 0
  });
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [crawlerHistory, setCrawlerHistory] = useState<CrawlerHistoryRecord[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyPageInput, setHistoryPageInput] = useState('1');
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyBatchSizeFilter, setHistoryBatchSizeFilter] = useState('all');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [nextCrawlTime, setNextCrawlTime] = useState<Date | null>(null);
  const [timeUntilNextCrawl, setTimeUntilNextCrawl] = useState<string>('Calculating...');
  const [autoCrawlerEnabled, setAutoCrawlerEnabled] = useState<boolean | null>(null);
  const [togglingAutoCrawler, setTogglingAutoCrawler] = useState(false);
  const [linkCollectionEnabled, setLinkCollectionEnabled] = useState<boolean | null>(null);
  const [togglingLinkCollection, setTogglingLinkCollection] = useState(false);
  const [showContentTypeRulesManager, setShowContentTypeRulesManager] = useState(false);

  // Track user ID to prevent unnecessary reloads on auth token refresh
  const lastUserIdRef = useRef<string | null>(null);
  const loadingDataRef = useRef(false);
  const subscriptionsPausedRef = useRef(false);
  const pendingRealtimeUpdatesRef = useRef(0);

  const checkAuthBeforeOperation = (): boolean => {
    if (!user || !isAdmin) {
      setAuthError('You must be signed in as an administrator to perform this action.');
      return false;
    }
    if (sessionExpired) {
      setShowSessionExpiredModal(true);
      return false;
    }
    setAuthError(null);
    return true;
  };

  const handleDatabaseError = useCallback((error: any, operation: string): boolean => {
    logAuthDebug(operation, { error, user: user?.id, isAdmin });

    if (isAuthError(error)) {
      // Only show session expired modal for permanent session errors
      if (isPermanentSessionError(error)) {
        console.error('[WebCrawlerDashboard] Permanent session error detected:', error);
        setShowSessionExpiredModal(true);
        return true;
      }

      // For transient auth errors (RLS, JWT during token refresh), just log and continue
      // The retry logic will handle these automatically
      if (error?.code === 'PGRST301' || error?.message?.toLowerCase()?.includes('permission') || error?.message?.toLowerCase()?.includes('rls')) {
        console.warn('[WebCrawlerDashboard] Transient auth error during operation:', operation, error);
        // Don't set error state or show modal - let retry logic handle it
        return false;
      }

      // For other auth errors, show the error message
      const message = getErrorMessage(error);
      setAuthError(message);
      return true;
    }

    return false;
  }, [user?.id, isAdmin]);

  const fetchStats = useCallback(async () => {
    try {
      const completedResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
      );

      if (completedResult.error) {
        if (handleDatabaseError(completedResult.error, 'fetching completed count')) return;
        console.error('Error fetching completed count:', completedResult.error);
        return;
      }

      const failedResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
      );

      if (failedResult.error) {
        if (handleDatabaseError(failedResult.error, 'fetching failed count')) return;
        console.error('Error fetching failed count:', failedResult.error);
        return;
      }

      const pendingResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      );

      if (pendingResult.error) {
        if (handleDatabaseError(pendingResult.error, 'fetching pending count')) return;
        console.error('Error fetching pending count:', pendingResult.error);
        return;
      }

      const totalCrawled = (completedResult.count || 0) + (failedResult.count || 0);

      setStats({
        total_crawled: totalCrawled,
        successful: completedResult.count || 0,
        failed: failedResult.count || 0,
        in_queue: pendingResult.count || 0
      });
    } catch (error) {
      console.error('Exception in fetchStats:', error);
    }
  }, [handleDatabaseError]);

  const fetchQueueStatusCounts = useCallback(async () => {
    try {
      const pendingResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      );

      if (pendingResult.error) {
        console.error('Error fetching pending count:', pendingResult.error);
        return;
      }

      const processingResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')
      );

      if (processingResult.error) {
        console.error('Error fetching processing count:', processingResult.error);
        return;
      }

      const completedResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
      );

      if (completedResult.error) {
        console.error('Error fetching completed count:', completedResult.error);
        return;
      }

      const failedResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
      );

      if (failedResult.error) {
        console.error('Error fetching failed count:', failedResult.error);
        return;
      }

      const priorityCrawlResult = await withRetry(() =>
        supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('priority_crawl', true)
      );

      if (priorityCrawlResult.error) {
        console.error('Error fetching priority crawl count:', priorityCrawlResult.error);
      } else {
        setPriorityCrawlCount(priorityCrawlResult.count || 0);
      }

      setQueueStatusCounts({
        pending: pendingResult.count || 0,
        processing: processingResult.count || 0,
        completed: completedResult.count || 0,
        failed: failedResult.count || 0
      });
    } catch (error) {
      console.error('Exception in fetchQueueStatusCounts:', error);
    }
  }, []);

  const fetchQueueItems = useCallback(async () => {
    try {
      // Build count query
      const buildCountQuery = () => {
        let countQuery = supabase
          .from('crawler_queue')
          .select('id', { count: 'exact', head: true });

        if (statusFilter === 'priority') {
          countQuery = countQuery.eq('status', 'pending').eq('priority_crawl', true);
        } else if (statusFilter !== 'all') {
          countQuery = countQuery.eq('status', statusFilter);
        }

        if (priorityFilter !== 'all') {
          countQuery = countQuery.eq('priority', parseInt(priorityFilter));
        }

        if (urlFilter) {
          countQuery = countQuery.ilike('url', `%${urlFilter}%`);
        }

        return countQuery;
      };

      const countResult = await withRetry(() => buildCountQuery());
      if (countResult.error) {
        console.error('Error fetching queue item count:', countResult.error);
        setTotalItems(0);
        setQueueItems([]);
        return;
      }

      setTotalItems(countResult.count || 0);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      // Build data query
      const buildDataQuery = () => {
        let query = supabase
          .from('crawler_queue')
          .select('*');

        if (statusFilter === 'priority') {
          query = query.eq('status', 'pending').eq('priority_crawl', true);
        } else if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (priorityFilter !== 'all') {
          query = query.eq('priority', parseInt(priorityFilter));
        }

        if (urlFilter) {
          query = query.ilike('url', `%${urlFilter}%`);
        }

        return query
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .range(from, to);
      };

      const dataResult = await withRetry(() => buildDataQuery());

      if (dataResult.error) {
        console.error('Error fetching queue items:', dataResult.error);
        setQueueItems([]);
      } else if (dataResult.data) {
        setQueueItems(dataResult.data);
      }
    } catch (error) {
      console.error('Exception fetching queue items:', error);
      setQueueItems([]);
    }
  }, [statusFilter, priorityFilter, urlFilter, currentPage]);

  const fetchCrawlerHistory = useCallback(async () => {
    try {
      let countQuery = supabase
        .from('crawler_history')
        .select('id', { count: 'exact', head: true })
        .eq('crawl_type', 'automatic');

      let dataQuery = supabase
        .from('crawler_history')
        .select('*')
        .eq('crawl_type', 'automatic');

      // Apply filters
      if (historyStatusFilter !== 'all') {
        countQuery = countQuery.eq('status', historyStatusFilter);
        dataQuery = dataQuery.eq('status', historyStatusFilter);
      }

      if (historyBatchSizeFilter !== 'all') {
        const batchSize = parseInt(historyBatchSizeFilter);
        countQuery = countQuery.eq('batch_size', batchSize);
        dataQuery = dataQuery.eq('batch_size', batchSize);
      }

      if (historyDateFrom) {
        const fromDate = new Date(historyDateFrom).toISOString();
        countQuery = countQuery.gte('started_at', fromDate);
        dataQuery = dataQuery.gte('started_at', fromDate);
      }

      if (historyDateTo) {
        const toDate = new Date(historyDateTo + 'T23:59:59').toISOString();
        countQuery = countQuery.lte('started_at', toDate);
        dataQuery = dataQuery.lte('started_at', toDate);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        console.error('Error fetching history count:', countError);
        return;
      }

      setHistoryTotalCount(count || 0);
      const totalPages = Math.ceil((count || 0) / historyItemsPerPage);
      setHistoryTotalPages(totalPages);

      // Fetch paginated history records
      const from = (historyCurrentPage - 1) * historyItemsPerPage;
      const to = from + historyItemsPerPage - 1;

      const { data, error } = await dataQuery
        .order('started_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching crawler history:', error);
        setCrawlerHistory([]);
      } else if (data) {
        setCrawlerHistory(data);

        // Calculate next crawl time based on most recent completed crawl
        if (data.length > 0 && data[0].completed_at) {
          const lastCrawlTime = new Date(data[0].completed_at);
          const nextCrawl = new Date(lastCrawlTime.getTime() + 5 * 60 * 1000); // 5 minutes later
          setNextCrawlTime(nextCrawl);
        } else if (data.length > 0 && data[0].started_at && !data[0].completed_at) {
          // If there's a crawl in progress, show that
          setNextCrawlTime(null);
        }
      }
    } catch (error) {
      console.error('Exception fetching crawler history:', error);
      setCrawlerHistory([]);
    }
  }, [historyCurrentPage, historyItemsPerPage, historyStatusFilter, historyBatchSizeFilter, historyDateFrom, historyDateTo]);

  // Countdown timer for next crawl
  useEffect(() => {
    if (!nextCrawlTime) {
      // Check if there's a crawl in progress
      if (crawlerHistory.length > 0 && crawlerHistory[0].started_at && !crawlerHistory[0].completed_at) {
        setTimeUntilNextCrawl('Crawl in progress...');
      } else {
        setTimeUntilNextCrawl('Waiting for first run...');
      }
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = nextCrawlTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilNextCrawl('Any moment now...');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilNextCrawl(`${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextCrawlTime, crawlerHistory]);

  // Fetch auto-crawler enabled status
  const fetchAutoCrawlerStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crawler_settings')
        .select('value')
        .eq('key', 'auto_crawl_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error fetching auto-crawler status:', error);
        return;
      }

      if (data) {
        setAutoCrawlerEnabled(data.value === 'true');
      }
    } catch (error) {
      console.error('Exception fetching auto-crawler status:', error);
    }
  }, []);

  // Toggle auto-crawler enabled/disabled
  const handleToggleAutoCrawler = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    setTogglingAutoCrawler(true);

    try {
      const newValue = !autoCrawlerEnabled;

      const { error } = await supabase
        .from('crawler_settings')
        .update({ value: newValue ? 'true' : 'false', updated_at: new Date().toISOString() })
        .eq('key', 'auto_crawl_enabled');

      if (error) {
        if (handleDatabaseError(error, 'toggling auto-crawler')) {
          setTogglingAutoCrawler(false);
          return;
        }
        console.error('Error toggling auto-crawler:', error);
        setAddUrlStatus({
          show: true,
          message: 'Failed to toggle auto-crawler. Please try again.',
          type: 'error'
        });
        setTimeout(() => {
          setAddUrlStatus({ show: false, message: '', type: 'info' });
        }, 5000);
        setTogglingAutoCrawler(false);
        return;
      }

      setAutoCrawlerEnabled(newValue);
      setAddUrlStatus({
        show: true,
        message: `Auto-crawler ${newValue ? 'enabled' : 'paused'}. ${newValue ? 'Automatic crawls will resume.' : 'Only manual crawls will run.'}`,
        type: 'success'
      });

      setTimeout(() => {
        setAddUrlStatus({ show: false, message: '', type: 'info' });
      }, 5000);

    } catch (error) {
      console.error('Exception toggling auto-crawler:', error);
      setAddUrlStatus({
        show: true,
        message: 'An unexpected error occurred.',
        type: 'error'
      });
      setTimeout(() => {
        setAddUrlStatus({ show: false, message: '', type: 'info' });
      }, 5000);
    }

    setTogglingAutoCrawler(false);
  };

  // Fetch link collection enabled status
  const fetchLinkCollectionStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crawler_settings')
        .select('value')
        .eq('key', 'link_collection_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error fetching link collection status:', error);
        return;
      }

      if (data) {
        setLinkCollectionEnabled(data.value === 'true');
      }
    } catch (error) {
      console.error('Exception fetching link collection status:', error);
    }
  }, []);

  // Toggle link collection enabled/disabled
  const handleToggleLinkCollection = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    setTogglingLinkCollection(true);

    try {
      const newValue = !linkCollectionEnabled;

      const { error } = await supabase
        .from('crawler_settings')
        .update({ value: newValue ? 'true' : 'false', updated_at: new Date().toISOString() })
        .eq('key', 'link_collection_enabled');

      if (error) {
        if (handleDatabaseError(error, 'toggling link collection')) {
          setTogglingLinkCollection(false);
          return;
        }
        console.error('Error toggling link collection:', error);
        setAddUrlStatus({
          show: true,
          message: 'Failed to toggle link collection. Please try again.',
          type: 'error'
        });
        setTimeout(() => {
          setAddUrlStatus({ show: false, message: '', type: 'info' });
        }, 5000);
        setTogglingLinkCollection(false);
        return;
      }

      setLinkCollectionEnabled(newValue);
      setAddUrlStatus({
        show: true,
        message: `Link collection ${newValue ? 'resumed' : 'paused'}. ${newValue ? 'New links will be queued.' : 'Queue growth stopped.'}`,
        type: 'success'
      });

      setTimeout(() => {
        setAddUrlStatus({ show: false, message: '', type: 'info' });
      }, 3000);

    } catch (error) {
      console.error('Exception toggling link collection:', error);
      setAddUrlStatus({
        show: true,
        message: 'An unexpected error occurred.',
        type: 'error'
      });
      setTimeout(() => {
        setAddUrlStatus({ show: false, message: '', type: 'info' });
      }, 5000);
    }

    setTogglingLinkCollection(false);
  };

  // Handle auth state changes (only reload when user ID changes, not on token refresh)
  useEffect(() => {
    if (sessionExpired) {
      setShowSessionExpiredModal(true);
      return;
    }

    if (!user || !isAdmin) {
      lastUserIdRef.current = null;
      return;
    }

    // Only reload if the user ID actually changed (not just the user object reference)
    if (lastUserIdRef.current !== user.id) {
      lastUserIdRef.current = user.id;

      const loadData = async () => {
        if (loadingDataRef.current) return;
        loadingDataRef.current = true;

        try {
          await fetchStats();
          await fetchQueueStatusCounts();
          await fetchQueueItems();
          await fetchCrawlerHistory();
          await fetchAutoCrawlerStatus();
          await fetchLinkCollectionStatus();
        } finally {
          loadingDataRef.current = false;
        }
      };

      loadData();
      setSelectedItems(new Set());
      setCurrentPage(1);
      setPageInput('1');
    }
  }, [user?.id, isAdmin, sessionExpired, fetchStats, fetchQueueStatusCounts, fetchQueueItems, fetchCrawlerHistory, fetchAutoCrawlerStatus, fetchLinkCollectionStatus]);

  // Handle filter changes (separate from auth changes)
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    const loadData = async () => {
      if (loadingDataRef.current) return;
      loadingDataRef.current = true;

      try {
        await fetchStats();
        await fetchQueueStatusCounts();
        await fetchQueueItems();
      } finally {
        loadingDataRef.current = false;
      }
    };

    loadData();
    setSelectedItems(new Set());
    setCurrentPage(1);
    setPageInput('1');
  }, [statusFilter, priorityFilter, urlFilter, user, isAdmin, sessionExpired, fetchStats, fetchQueueStatusCounts]);

  // Handle history page changes
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    if (loadingDataRef.current) return;
    fetchCrawlerHistory();
  }, [historyCurrentPage, user, isAdmin, sessionExpired, fetchCrawlerHistory]);

  // Handle page changes (separate from auth and filter changes)
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    if (loadingDataRef.current) return;
    fetchQueueItems();
  }, [currentPage, user, isAdmin, sessionExpired, fetchQueueItems]);

  // Real-time subscription to crawler_queue table
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    console.log('[WebCrawlerDashboard] Setting up real-time subscription');

    // Debounce updates to avoid excessive refreshes during bulk operations
    let debounceTimer: NodeJS.Timeout | null = null;
    let pendingUpdate = false;

    const handleRealtimeUpdate = () => {
      // Pause updates during auth transitions
      if (isAuthTransitioning || subscriptionsPausedRef.current) {
        console.log('[WebCrawlerDashboard] Realtime update paused (auth transitioning)');
        pendingRealtimeUpdatesRef.current++;
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      pendingUpdate = true;

      debounceTimer = setTimeout(async () => {
        if (!pendingUpdate || loadingDataRef.current) return;

        pendingUpdate = false;
        console.log('[WebCrawlerDashboard] Real-time update triggered, refreshing data');

        try {
          await fetchStats();
          await fetchQueueStatusCounts();
          await fetchQueueItems();
        } catch (error) {
          console.error('[WebCrawlerDashboard] Error refreshing data after real-time update:', error);
        }
      }, 3000); // Increased to 3000ms debounce to prevent overwhelming during bulk operations
    };

    const subscription = supabase
      .channel('crawler_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crawler_queue'
        },
        (payload) => {
          console.log('[WebCrawlerDashboard] Real-time change detected:', payload.eventType);
          handleRealtimeUpdate();
        }
      )
      .subscribe((status) => {
        console.log('[WebCrawlerDashboard] Subscription status:', status);
      });

    return () => {
      console.log('[WebCrawlerDashboard] Cleaning up real-time subscription');
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      subscription.unsubscribe();
    };
  }, [user?.id, isAdmin, sessionExpired, isAuthTransitioning, fetchStats, fetchQueueStatusCounts, fetchQueueItems]);

  // Real-time subscription to crawler_history table
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    console.log('[WebCrawlerDashboard] Setting up crawler_history real-time subscription');

    let historyDebounceTimer: NodeJS.Timeout | null = null;

    const historySubscription = supabase
      .channel('crawler_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crawler_history'
        },
        (payload) => {
          // Pause updates during auth transitions
          if (isAuthTransitioning || subscriptionsPausedRef.current) {
            console.log('[WebCrawlerDashboard] History update paused (auth transitioning)');
            return;
          }

          console.log('[WebCrawlerDashboard] Crawler history change detected:', payload.eventType);

          // Throttle history updates to prevent excessive refreshes
          if (historyDebounceTimer) {
            clearTimeout(historyDebounceTimer);
          }

          historyDebounceTimer = setTimeout(() => {
            fetchCrawlerHistory();
          }, 2000); // 2 second debounce for history updates
        }
      )
      .subscribe((status) => {
        console.log('[WebCrawlerDashboard] History subscription status:', status);
      });

    return () => {
      console.log('[WebCrawlerDashboard] Cleaning up history subscription');
      if (historyDebounceTimer) {
        clearTimeout(historyDebounceTimer);
      }
      historySubscription.unsubscribe();
    };
  }, [user?.id, isAdmin, sessionExpired, isAuthTransitioning, fetchCrawlerHistory]);

  // Real-time subscription to crawler_settings table (for auto-crawler status)
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    console.log('[WebCrawlerDashboard] Setting up crawler_settings real-time subscription');

    const settingsSubscription = supabase
      .channel('crawler_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crawler_settings',
          filter: 'key=eq.auto_crawl_enabled'
        },
        (payload) => {
          // Pause updates during auth transitions
          if (isAuthTransitioning || subscriptionsPausedRef.current) {
            console.log('[WebCrawlerDashboard] Settings update paused (auth transitioning)');
            return;
          }

          console.log('[WebCrawlerDashboard] Auto-crawler setting changed:', payload);
          if (payload.new && 'value' in payload.new) {
            setAutoCrawlerEnabled(payload.new.value === 'true');
          }
        }
      )
      .subscribe((status) => {
        console.log('[WebCrawlerDashboard] Settings subscription status:', status);
      });

    return () => {
      console.log('[WebCrawlerDashboard] Cleaning up settings subscription');
      settingsSubscription.unsubscribe();
    };
  }, [user?.id, isAdmin, sessionExpired, isAuthTransitioning]);

  // Real-time subscription to crawler_settings table (for link collection status)
  useEffect(() => {
    if (!user || !isAdmin || sessionExpired) {
      return;
    }

    console.log('[WebCrawlerDashboard] Setting up link_collection_settings real-time subscription');

    const linkCollectionSubscription = supabase
      .channel('link_collection_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crawler_settings',
          filter: 'key=eq.link_collection_enabled'
        },
        (payload) => {
          // Pause updates during auth transitions
          if (isAuthTransitioning || subscriptionsPausedRef.current) {
            console.log('[WebCrawlerDashboard] Link collection update paused (auth transitioning)');
            return;
          }

          console.log('[WebCrawlerDashboard] Link collection setting changed:', payload);
          if (payload.new && 'value' in payload.new) {
            setLinkCollectionEnabled(payload.new.value === 'true');
          }
        }
      )
      .subscribe((status) => {
        console.log('[WebCrawlerDashboard] Link collection subscription status:', status);
      });

    return () => {
      console.log('[WebCrawlerDashboard] Cleaning up link collection subscription');
      linkCollectionSubscription.unsubscribe();
    };
  }, [user?.id, isAdmin, sessionExpired, isAuthTransitioning]);

  // Recovery effect: process pending updates after auth stabilizes
  useEffect(() => {
    if (!isAuthTransitioning && pendingRealtimeUpdatesRef.current > 0) {
      console.log('[WebCrawlerDashboard] Auth stabilized, processing', pendingRealtimeUpdatesRef.current, 'pending realtime updates');

      // Wait a bit for auth to fully settle, then refresh
      const recoveryTimer = setTimeout(async () => {
        if (!user || !isAdmin || sessionExpired || loadingDataRef.current) return;

        try {
          await fetchStats();
          await fetchQueueStatusCounts();
          await fetchQueueItems();
          await fetchCrawlerHistory();
          pendingRealtimeUpdatesRef.current = 0;
        } catch (error) {
          console.error('[WebCrawlerDashboard] Error during recovery refresh:', error);
        }
      }, 500);

      return () => clearTimeout(recoveryTimer);
    }
  }, [isAuthTransitioning, user, isAdmin, sessionExpired, fetchStats, fetchQueueStatusCounts, fetchQueueItems, fetchCrawlerHistory]);

  // Sync history page input with current page
  useEffect(() => {
    setHistoryPageInput(historyCurrentPage.toString());
  }, [historyCurrentPage]);

  const handleHistoryPageJump = () => {
    const pageNum = parseInt(historyPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= historyTotalPages) {
      setHistoryCurrentPage(pageNum);
    } else {
      setHistoryPageInput(historyCurrentPage.toString());
    }
  };

  const handleHistoryPageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setHistoryPageInput(value);
    }
  };

  const handleHistoryPageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleHistoryPageJump();
    }
  };

  const handleSeedSentPortUrls = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    const seedUrls = [
      // Main SentPort site
      'https://sentport.com',
      'https://sentport.com/about',
      'https://sentport.com/manifesto',
      'https://sentport.com/make-your-own-site',

      // HuTube paths
      'https://sentport.com/hutube',
      'https://sentport.com/hutube/feed',

      // Heddit paths
      'https://sentport.com/heddit',
      'https://sentport.com/heddit/feed',

      // HuBook paths
      'https://sentport.com/hubook',
      'https://sentport.com/hubook/feed',

      // Switter paths
      'https://sentport.com/switter',
      'https://sentport.com/switter/feed',

      // Hinsta paths
      'https://sentport.com/hinsta',
      'https://sentport.com/hinsta/feed',

      // Blog paths
      'https://sentport.com/blog',
      'https://sentport.com/blog/feed'
    ];

    setLoading(true);
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    try {
      for (const url of seedUrls) {
        try {
          const trimmedUrl = url.trim();
          const isInternal = true; // All seed URLs are internal

          const { data: existing, error: selectError } = await supabase
            .from('crawler_queue')
            .select('id, status')
            .eq('url', trimmedUrl)
            .maybeSingle();

          if (selectError) {
            if (handleDatabaseError(selectError, 'checking existing URL')) {
              setLoading(false);
              return;
            }
            console.error('Error checking existing URL:', selectError);
            errorCount++;
            continue;
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('crawler_queue')
              .update({
                status: 'pending',
                priority: 10,
                manual_priority: true,
                scheduled_at: new Date().toISOString(),
                last_error: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (updateError) {
              if (handleDatabaseError(updateError, 'updating URL')) {
                setLoading(false);
                return;
              }
              console.error('Error updating URL:', updateError);
              errorCount++;
              continue;
            }
            updatedCount++;
          } else {
            const { error: insertError } = await supabase.from('crawler_queue').insert({
              url: trimmedUrl,
              priority: 10,
              manual_priority: true,
              source_type: 'internal',
              status: 'pending',
              scheduled_at: new Date().toISOString()
            });

            if (insertError) {
              if (handleDatabaseError(insertError, 'inserting URL')) {
                setLoading(false);
                return;
              }
              console.error('Error inserting URL:', insertError);
              errorCount++;
              continue;
            }
            addedCount++;
          }
        } catch (urlError) {
          console.error('Error processing URL:', url, urlError);
          errorCount++;
        }
      }

      const message = [];
      if (addedCount > 0) message.push(`${addedCount} new SentPort URL${addedCount > 1 ? 's' : ''} added`);
      if (updatedCount > 0) message.push(`${updatedCount} existing URL${updatedCount > 1 ? 's' : ''} reset to pending`);
      if (errorCount > 0) message.push(`${errorCount} URL${errorCount > 1 ? 's' : ''} failed`);

      setAddUrlStatus({
        show: true,
        message: message.join(', '),
        type: errorCount > 0 ? (addedCount + updatedCount > 0 ? 'info' : 'error') : 'success'
      });

      setTimeout(() => {
        setAddUrlStatus({ show: false, message: '', type: 'info' });
      }, 5000);

      await fetchStats();
      await fetchQueueItems();
    } catch (error) {
      console.error('Error seeding SentPort URLs:', error);
      setAddUrlStatus({
        show: true,
        message: 'An error occurred while seeding URLs',
        type: 'error'
      });
    }

    setLoading(false);
  };

  const handleAddUrls = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    const urls = urlInput.split('\n').filter(url => url.trim());
    if (urls.length === 0) return;

    setLoading(true);
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    try {
      for (const url of urls) {
        try {
          const trimmedUrl = url.trim();

          // Normalize URL to ensure it has https:// protocol
          let normalizedUrl: string;
          try {
            normalizedUrl = normalizeUrl(trimmedUrl);
          } catch (normalizeError) {
            console.error('Error normalizing URL:', trimmedUrl, normalizeError);
            setAddUrlStatus({
              show: true,
              message: `Invalid URL: ${trimmedUrl}`,
              type: 'error'
            });
            setTimeout(() => {
              setAddUrlStatus(prev => ({ ...prev, show: false }));
            }, 5000);
            errorCount++;
            continue;
          }

          const socialPlatformPaths = ['/hutube/', '/heddit/', '/switter/', '/hubook/', '/hinsta/', '/blog/'];
          const isSocialPlatform = socialPlatformPaths.some(path => normalizedUrl.toLowerCase().includes(path));

          if (isSocialPlatform) {
            setAddUrlStatus({
              show: true,
              message: 'Internal social platform URLs cannot be added to the crawler',
              type: 'error'
            });
            setTimeout(() => {
              setAddUrlStatus({ show: false, message: '', type: 'info' });
            }, 5000);
            errorCount++;
            continue;
          }

          const isInternal = normalizedUrl.includes('.sentport.com') || normalizedUrl.includes('sentport.com');

          const { data: existing, error: selectError } = await supabase
            .from('crawler_queue')
            .select('id, status')
            .eq('url', normalizedUrl)
            .maybeSingle();

          if (selectError) {
            if (handleDatabaseError(selectError, 'checking existing URL')) {
              setLoading(false);
              return;
            }
            console.error('Error checking existing URL:', selectError);
            errorCount++;
            continue;
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('crawler_queue')
              .update({
                status: 'pending',
                priority: parseInt(priority),
                manual_priority: true,
                scheduled_at: new Date().toISOString(),
                last_error: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (updateError) {
              if (handleDatabaseError(updateError, 'updating URL')) {
                setLoading(false);
                return;
              }
              console.error('Error updating URL:', updateError);
              errorCount++;
              continue;
            }
            updatedCount++;
          } else {
            const { error: insertError } = await supabase.from('crawler_queue').insert({
              url: normalizedUrl,
              priority: parseInt(priority),
              manual_priority: true,
              source_type: isInternal ? 'internal' : 'external',
              status: 'pending',
              scheduled_at: new Date().toISOString()
            });

            if (insertError) {
              if (handleDatabaseError(insertError, 'inserting URL')) {
                setLoading(false);
                return;
              }
              console.error('Error inserting URL:', insertError);
              errorCount++;
              continue;
            }
            addedCount++;
          }
        } catch (urlError) {
          console.error('Error processing URL:', url, urlError);
          errorCount++;
        }
      }

      setUrlInput('');

      const message = [];
      if (addedCount > 0) message.push(`${addedCount} new URL${addedCount > 1 ? 's' : ''} added`);
      if (updatedCount > 0) message.push(`${updatedCount} existing URL${updatedCount > 1 ? 's' : ''} reset to pending`);
      if (errorCount > 0) message.push(`${errorCount} URL${errorCount > 1 ? 's' : ''} failed`);

      setAddUrlStatus({
        show: true,
        message: message.join(', '),
        type: errorCount > 0 ? (addedCount + updatedCount > 0 ? 'info' : 'error') : 'success'
      });

      setTimeout(() => {
        setAddUrlStatus(prev => ({ ...prev, show: false }));
      }, 5000);

      await fetchStats();
      await fetchQueueItems();
      await fetchQueueStatusCounts();
    } catch (error) {
      console.error('Exception in handleAddUrls:', error);
      setAddUrlStatus({
        show: true,
        message: 'Failed to add URLs. Please try again.',
        type: 'error'
      });

      setTimeout(() => {
        setAddUrlStatus(prev => ({ ...prev, show: false }));
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async (batchSize: number) => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    setProcessing(true);
    setProcessingStatus({
      show: true,
      message: 'Initializing crawler...',
      progress: 0,
      total: batchSize,
      successful: 0,
      failed: 0
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No active session found');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-crawler-queue`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      setProcessingStatus(prev => ({
        ...prev,
        message: `Processing ${batchSize} URLs from queue...`
      }));

      const pollInterval = setInterval(async () => {
        await fetchQueueStatusCounts();
        await fetchQueueItems();

        // Update processing status with current progress
        const { data: historyRecords } = await supabase
          .from('crawler_history')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (historyRecords) {
          const processed = (historyRecords.successful_count || 0) + (historyRecords.failed_count || 0);
          setProcessingStatus(prev => ({
            ...prev,
            progress: processed,
            successful: historyRecords.successful_count || 0,
            failed: historyRecords.failed_count || 0
          }));
        }
      }, 2000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          batchSize,
          triggeredBy: session.user.id
        })
      });

      clearInterval(pollInterval);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process queue');
      }

      setProcessingStatus({
        show: true,
        message: 'Crawl completed!',
        progress: result.totalProcessed || 0,
        total: result.totalProcessed || 0,
        successful: result.successCount || 0,
        failed: result.failCount || 0
      });

      await fetchStats();
      await fetchQueueItems();
      await fetchQueueStatusCounts();
      await fetchCrawlerHistory();

      setTimeout(() => {
        setProcessingStatus(prev => ({ ...prev, show: false }));
      }, 5000);
    } catch (error) {
      setProcessingStatus({
        show: true,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        progress: 0,
        total: 0,
        successful: 0,
        failed: 0
      });

      setTimeout(() => {
        setProcessingStatus(prev => ({ ...prev, show: false }));
      }, 5000);
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === queueItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queueItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleRetrySelected = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    if (selectedItems.size === 0) return;

    setLoading(true);

    const selectedIds = Array.from(selectedItems);
    await supabase
      .from('crawler_queue')
      .update({
        status: 'pending',
        scheduled_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .in('id', selectedIds);

    setAddUrlStatus({
      show: true,
      message: `${selectedIds.length} URL${selectedIds.length > 1 ? 's' : ''} reset to pending`,
      type: 'success'
    });

    setTimeout(() => {
      setAddUrlStatus(prev => ({ ...prev, show: false }));
    }, 5000);

    setSelectedItems(new Set());
    await fetchStats();
    await fetchQueueItems();
    await fetchQueueStatusCounts();
    setLoading(false);
  };

  const handlePriorityCrawlSelected = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    if (selectedItems.size === 0) return;

    if (selectedItems.size > 100) {
      setAddUrlStatus({
        show: true,
        message: 'Maximum 100 URLs can be selected for priority crawl',
        type: 'error'
      });

      setTimeout(() => {
        setAddUrlStatus(prev => ({ ...prev, show: false }));
      }, 5000);
      return;
    }

    setLoading(true);

    const selectedIds = Array.from(selectedItems);
    await supabase
      .from('crawler_queue')
      .update({
        status: 'pending',
        priority_crawl: true,
        priority_crawl_failed: false,
        manual_priority: true,
        scheduled_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString()
      })
      .in('id', selectedIds);

    setAddUrlStatus({
      show: true,
      message: `${selectedIds.length} URL${selectedIds.length > 1 ? 's' : ''} marked for priority crawl. They will be crawled first on the next manual crawl.`,
      type: 'success'
    });

    setTimeout(() => {
      setAddUrlStatus(prev => ({ ...prev, show: false }));
    }, 5000);

    setSelectedItems(new Set());
    await fetchStats();
    await fetchQueueItems();
    await fetchQueueStatusCounts();
    setLoading(false);
  };

  const handleRetryAllFailed = async () => {
    if (!checkAuthBeforeOperation()) {
      return;
    }

    setLoading(true);

    const { data: failedUrls } = await supabase
      .from('crawler_queue')
      .select('id')
      .eq('status', 'failed');

    if (failedUrls && failedUrls.length > 0) {
      await supabase
        .from('crawler_queue')
        .update({
          status: 'pending',
          scheduled_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'failed');

      setAddUrlStatus({
        show: true,
        message: `${failedUrls.length} failed URL${failedUrls.length > 1 ? 's' : ''} reset to pending`,
        type: 'success'
      });

      setTimeout(() => {
        setAddUrlStatus(prev => ({ ...prev, show: false }));
      }, 5000);

      await fetchStats();
      await fetchQueueItems();
      await fetchQueueStatusCounts();
    } else {
      setAddUrlStatus({
        show: true,
        message: 'No failed URLs to retry',
        type: 'info'
      });

      setTimeout(() => {
        setAddUrlStatus(prev => ({ ...prev, show: false }));
      }, 3000);
    }

    setLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setPageInput(newPage.toString());
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      handlePageChange(page);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setUrlFilter('');
  };

  return (
    <>
      <Header />
      <SessionExpiredModal
        isOpen={showSessionExpiredModal}
        onReauthenticate={() => setShowSessionExpiredModal(false)}
      />
      {showContentTypeRulesManager && (
        <ContentTypeRulesManager onClose={() => setShowContentTypeRulesManager(false)} />
      )}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {authError && (
          <div className="mb-6 bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">{authError}</p>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Globe className="w-10 h-10 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Web <span className="text-yellow-400">Crawler Dashboard</span>
              </h1>
              <p className="text-blue-200 mt-1">Manage and monitor the external content crawler</p>
            </div>
          </div>
          <button
            onClick={() => {
              fetchStats();
              fetchQueueItems();
              fetchQueueStatusCounts();
              fetchCrawlerHistory();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Auto-Crawler Status</h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleAutoCrawler}
                disabled={togglingAutoCrawler || autoCrawlerEnabled === null}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoCrawlerEnabled === null
                    ? 'bg-gray-600 text-white'
                    : autoCrawlerEnabled
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                } ${togglingAutoCrawler || autoCrawlerEnabled === null ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {autoCrawlerEnabled === null ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : togglingAutoCrawler ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {autoCrawlerEnabled ? 'Pausing...' : 'Resuming...'}
                  </>
                ) : (
                  <>
                    {autoCrawlerEnabled ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause Auto-Crawler
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Resume Auto-Crawler
                      </>
                    )}
                  </>
                )}
              </button>
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                {historyExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide History
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show History
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            {autoCrawlerEnabled === null ? (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"></div>
                <p className="text-sm font-medium text-gray-400">
                  Auto-Crawler: Loading...
                </p>
              </>
            ) : (
              <>
                <div className={`w-3 h-3 rounded-full ${autoCrawlerEnabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <p className={`text-sm font-medium ${autoCrawlerEnabled ? 'text-green-300' : 'text-red-300'}`}>
                  Auto-Crawler: {autoCrawlerEnabled ? 'Active' : 'Paused'}
                </p>
                <span className="text-gray-400 text-sm">•</span>
                <p className="text-blue-200 text-sm">
                  {autoCrawlerEnabled ? 'Runs every 5 minutes' : 'Manual crawls only'}
                </p>
              </>
            )}
          </div>

          {crawlerHistory.length === 0 ? (
            <div className="bg-slate-900/50 rounded-lg p-4 text-center">
              <p className="text-gray-400 text-sm">
                No cron runs recorded yet.
                {autoCrawlerEnabled === null
                  ? ' Loading status...'
                  : autoCrawlerEnabled
                  ? ' The auto-crawler will start running within 5 minutes.'
                  : ' Enable the auto-crawler to start automatic crawls.'}
              </p>
              {autoCrawlerEnabled === null ? (
                <p className="text-gray-400 text-sm mt-2">Loading auto-crawler status...</p>
              ) : autoCrawlerEnabled ? (
                <p className="text-blue-300 text-sm mt-2">Next crawl in: Waiting for first run...</p>
              ) : (
                <p className="text-yellow-300 text-sm mt-2">Auto-crawler paused - No scheduled crawls</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                {crawlerHistory[0].completed_at ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Last Crawl:</span>
                      <span className="text-sm text-white">
                        {new Date(crawlerHistory[0].completed_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Batch Size:</span>
                      <span className="text-sm text-white">{crawlerHistory[0].batch_size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Successful:</span>
                      <span className="text-sm text-green-400">{crawlerHistory[0].successful_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Failed:</span>
                      <span className="text-sm text-red-400">{crawlerHistory[0].failed_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Duration:</span>
                      <span className="text-sm text-white">
                        {(() => {
                          const start = new Date(crawlerHistory[0].started_at);
                          const end = new Date(crawlerHistory[0].completed_at);
                          const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
                          return `${duration}s`;
                        })()}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      {autoCrawlerEnabled === null ? (
                        <p className="text-gray-400 text-sm">Loading auto-crawler status...</p>
                      ) : autoCrawlerEnabled ? (
                        <p className="text-blue-300 text-sm">Next crawl in: {timeUntilNextCrawl}</p>
                      ) : (
                        <p className="text-yellow-300 text-sm">Auto-crawler paused - No scheduled crawls</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {(() => {
                        const start = new Date(crawlerHistory[0].started_at);
                        const now = new Date();
                        const elapsedMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
                        const isLongRunning = elapsedMinutes > 10;

                        return (
                          <>
                            {isLongRunning ? (
                              <AlertCircle className="w-4 h-4 text-yellow-400 animate-pulse" />
                            ) : (
                              <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                            )}
                            <span className={`font-medium ${isLongRunning ? 'text-yellow-300' : 'text-blue-300'}`}>
                              Crawl in progress...
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-400">
                      Started: {new Date(crawlerHistory[0].started_at).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Elapsed: {(() => {
                        const start = new Date(crawlerHistory[0].started_at);
                        const now = new Date();
                        const elapsedSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
                        const minutes = Math.floor(elapsedSeconds / 60);
                        const seconds = elapsedSeconds % 60;
                        return `${minutes}m ${seconds}s`;
                      })()}
                    </p>
                    <p className="text-sm text-gray-400">
                      Batch Size: {crawlerHistory[0].batch_size}
                    </p>
                    {(() => {
                      const start = new Date(crawlerHistory[0].started_at);
                      const now = new Date();
                      const elapsedMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);

                      if (elapsedMinutes > 10) {
                        return (
                          <p className="text-xs text-yellow-400 mt-2">
                            This crawl has been running longer than expected
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {historyExpanded && (
                <div className="bg-slate-900/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Status</label>
                        <select
                          value={historyStatusFilter}
                          onChange={(e) => {
                            setHistoryStatusFilter(e.target.value);
                            setHistoryCurrentPage(1);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                          <option value="timeout">Timeout</option>
                          <option value="in_progress">In Progress</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Batch Size</label>
                        <select
                          value={historyBatchSizeFilter}
                          onChange={(e) => {
                            setHistoryBatchSizeFilter(e.target.value);
                            setHistoryCurrentPage(1);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="all">All Batch Sizes</option>
                          <option value="10">10</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">From Date</label>
                        <input
                          type="date"
                          value={historyDateFrom}
                          onChange={(e) => {
                            setHistoryDateFrom(e.target.value);
                            setHistoryCurrentPage(1);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">To Date</label>
                        <input
                          type="date"
                          value={historyDateTo}
                          onChange={(e) => {
                            setHistoryDateTo(e.target.value);
                            setHistoryCurrentPage(1);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        Showing {crawlerHistory.length === 0 ? 0 : ((historyCurrentPage - 1) * historyItemsPerPage) + 1}-{Math.min(historyCurrentPage * historyItemsPerPage, historyTotalCount)} of {historyTotalCount} results
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Per page:</label>
                        <select
                          value={historyItemsPerPage}
                          onChange={(e) => {
                            setHistoryItemsPerPage(parseInt(e.target.value));
                            setHistoryCurrentPage(1);
                          }}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">STARTED</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">COMPLETED</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">DURATION</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">BATCH</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">SUCCESS</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">FAILED</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-blue-300">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crawlerHistory.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                              No crawl history found matching your filters
                            </td>
                          </tr>
                        ) : (
                          crawlerHistory.map((record) => (
                            <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                              <td className="py-2 px-4 text-xs text-gray-400">
                                {new Date(record.started_at).toLocaleString()}
                              </td>
                              <td className="py-2 px-4 text-xs text-gray-400">
                                {record.completed_at ? new Date(record.completed_at).toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-4 text-xs text-white">
                                {record.completed_at ? (
                                  (() => {
                                    const start = new Date(record.started_at);
                                    const end = new Date(record.completed_at);
                                    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
                                    return `${duration}s`;
                                  })()
                                ) : (
                                  (() => {
                                    const start = new Date(record.started_at);
                                    const now = new Date();
                                    const duration = Math.floor((now.getTime() - start.getTime()) / 1000);
                                    return `${duration}s`;
                                  })()
                                )}
                              </td>
                              <td className="py-2 px-4 text-xs text-white">{record.batch_size}</td>
                              <td className="py-2 px-4 text-xs text-green-400">{record.successful_count}</td>
                              <td className="py-2 px-4 text-xs text-red-400">{record.failed_count}</td>
                              <td className="py-2 px-4">
                                {record.status === 'completed' ? (
                                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                                    Completed
                                  </span>
                                ) : record.status === 'failed' ? (
                                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300">
                                    Failed
                                  </span>
                                ) : record.status === 'timeout' ? (
                                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300">
                                    Timeout
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                                    In Progress
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                    <div className="text-xs text-gray-400">
                      Page {historyCurrentPage} of {historyTotalPages || 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHistoryCurrentPage(Math.max(1, historyCurrentPage - 1))}
                        disabled={historyCurrentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        <span>Previous</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Page</span>
                        <input
                          type="text"
                          value={historyPageInput}
                          onChange={handleHistoryPageInputChange}
                          onKeyDown={handleHistoryPageInputKeyDown}
                          onBlur={handleHistoryPageJump}
                          className="w-14 px-2 py-1.5 bg-slate-700 border border-slate-600 text-white text-xs rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="1"
                        />
                        <span className="text-xs text-gray-400">of {historyTotalPages || 1}</span>
                      </div>
                      <button
                        onClick={() => setHistoryCurrentPage(Math.min(historyTotalPages, historyCurrentPage + 1))}
                        disabled={historyCurrentPage === historyTotalPages || historyTotalPages === 0}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-semibold text-white">Link Collection Control</h2>
            </div>
            <button
              onClick={handleToggleLinkCollection}
              disabled={togglingLinkCollection || linkCollectionEnabled === null}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                linkCollectionEnabled === null
                  ? 'bg-gray-600 text-white'
                  : linkCollectionEnabled
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } ${togglingLinkCollection || linkCollectionEnabled === null ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {linkCollectionEnabled === null ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : togglingLinkCollection ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {linkCollectionEnabled ? 'Pausing...' : 'Resuming...'}
                </>
              ) : (
                <>
                  {linkCollectionEnabled ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause Link Collection
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Resume Link Collection
                    </>
                  )}
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            {linkCollectionEnabled === null ? (
              <>
                <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse"></div>
                <p className="text-sm font-medium text-gray-400">
                  Link Collection: Loading...
                </p>
              </>
            ) : (
              <>
                <div className={`w-3 h-3 rounded-full ${linkCollectionEnabled ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}></div>
                <p className={`text-sm font-medium ${linkCollectionEnabled ? 'text-green-300' : 'text-amber-300'}`}>
                  Link Collection: {linkCollectionEnabled ? 'Active' : 'Paused'}
                </p>
                <span className="text-gray-400 text-sm">•</span>
                <p className="text-blue-200 text-sm">
                  {linkCollectionEnabled ? 'Discovering and queuing new links' : 'Crawling without adding links'}
                </p>
              </>
            )}
          </div>

          <div className={`rounded-lg p-4 ${linkCollectionEnabled === null ? 'bg-slate-900/50 border border-slate-700' : linkCollectionEnabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
            {linkCollectionEnabled === null ? (
              <p className="text-gray-400 text-sm">Loading link collection status...</p>
            ) : linkCollectionEnabled ? (
              <div className="space-y-2">
                <p className="text-green-200 text-sm font-medium">
                  New links discovered during crawls are being added to the queue.
                </p>
                <p className="text-gray-300 text-sm">
                  Your queue will grow as more pages are crawled and new URLs are discovered. This is the normal operating mode for building your search index.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-amber-200 text-sm font-medium">
                  Link discovery is paused. The crawler will process your existing {queueStatusCounts.pending.toLocaleString()} pending URLs without adding new links.
                </p>
                <p className="text-gray-300 text-sm">
                  This allows your queue to shrink while completed crawls increase. Resume anytime to start discovering links again.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.total_crawled.toLocaleString()}</div>
            <div className="text-sm text-blue-300">Total Crawled</div>
          </div>

          <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-green-400 mb-1">{stats.successful.toLocaleString()}</div>
            <div className="text-sm text-green-300">Successful</div>
          </div>

          <div className="bg-slate-800/50 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400 mb-1">{stats.failed.toLocaleString()}</div>
            <div className="text-sm text-red-300">Failed</div>
          </div>

          <div className="bg-slate-800/50 border border-yellow-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400 mb-1">{queueStatusCounts.pending.toLocaleString()}</div>
            <div className="text-sm text-yellow-300">In Queue</div>
          </div>
        </div>

        {processingStatus.show && (
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-blue-400 animate-pulse" />
              <h2 className="text-xl font-semibold text-white">Crawler Status</h2>
            </div>
            <div className="space-y-4">
              <p className="text-blue-200">{processingStatus.message}</p>

              {processingStatus.total > 0 && (
                <>
                  <div className="bg-slate-900/50 rounded-lg overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 transition-all duration-300"
                      style={{ width: `${(processingStatus.progress / processingStatus.total) * 100}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">Processed</div>
                      <div className="text-xl font-bold text-white">{processingStatus.progress} / {processingStatus.total}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-green-400 mb-1">Successful</div>
                      <div className="text-xl font-bold text-green-400">{processingStatus.successful}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-xs text-red-400 mb-1">Failed</div>
                      <div className="text-xl font-bold text-red-400">{processingStatus.failed}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-semibold text-white">Add URLs to Crawler Queue</h2>
            </div>

            <div className="mb-4 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200 mb-3">
                Quickly seed the crawler with all SentPort internal URLs (main site, HuTube, Heddit, HuBook, Switter, Hinsta, Blog)
              </p>
              <button
                onClick={handleSeedSentPortUrls}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Seeding...' : 'Seed SentPort URLs (Priority 10)'}
              </button>
            </div>

            <div className="mb-4 p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg">
              <p className="text-sm text-purple-200 mb-3">
                Manage how domains are classified in search results (News vs Reference/Web Pages)
              </p>
              <button
                onClick={() => setShowContentTypeRulesManager(true)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4" />
                Manage Content Type Classification
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-200 mb-2">Or add custom URLs (one per line)</label>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/Example&#10;https://www.investopedia.com/terms/a/example.asp"
                className="w-full h-32 px-4 py-3 bg-slate-900 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Priority (1-10)
                <span className="text-xs text-gray-400 ml-2">Higher = crawled first</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-400"
              >
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(p => (
                  <option key={p} value={p}>{p}{p === 5 ? ' (Default)' : ''}</option>
                ))}
              </select>
            </div>
            {addUrlStatus.show && (
              <div className={`mb-4 p-3 rounded-lg ${
                addUrlStatus.type === 'success' ? 'bg-green-500/20 border border-green-500/50' :
                addUrlStatus.type === 'error' ? 'bg-red-500/20 border border-red-500/50' :
                'bg-blue-500/20 border border-blue-500/50'
              }`}>
                <p className={`text-sm ${
                  addUrlStatus.type === 'success' ? 'text-green-300' :
                  addUrlStatus.type === 'error' ? 'text-red-300' :
                  'text-blue-300'
                }`}>
                  {addUrlStatus.message}
                </p>
              </div>
            )}

            <button
              onClick={handleAddUrls}
              disabled={loading || !urlInput.trim()}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add to Queue'}
            </button>
          </div>

          <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Process Queue</h2>
              </div>
              {linkCollectionEnabled === false && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Pause className="w-3 h-3" />
                  Link Collection Paused
                </span>
              )}
            </div>

            {priorityCrawlCount > 0 && (
              <div className="mb-4 p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-medium text-emerald-300">Priority Queue</div>
                    <div className="text-2xl font-bold text-emerald-400">{priorityCrawlCount}</div>
                  </div>
                  <div className="ml-auto text-xs text-emerald-300">
                    These URLs will be crawled first
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-yellow-300 mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-400">{queueStatusCounts.pending}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-blue-300 mb-1">Processing</div>
                <div className="text-2xl font-bold text-blue-400">{queueStatusCounts.processing}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-green-300 mb-1">Completed</div>
                <div className="text-2xl font-bold text-green-400">{queueStatusCounts.completed}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-sm text-red-300 mb-1">Failed</div>
                <div className="text-2xl font-bold text-red-400">{queueStatusCounts.failed}</div>
              </div>
            </div>

            <p className="text-sm text-blue-200 mb-4">
              Click one of the buttons below to process URLs from the queue. {priorityCrawlCount > 0 && 'Priority URLs will be crawled first.'} {linkCollectionEnabled ? 'This will crawl the pages and add discovered links.' : 'This will crawl the pages without adding discovered links to queue.'}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleProcessQueue(10)}
                disabled={processing || queueStatusCounts.pending === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : `Process 10 URLs${priorityCrawlCount > 0 ? ' (Priority first)' : ''}`}
              </button>
              <button
                onClick={() => handleProcessQueue(50)}
                disabled={processing || queueStatusCounts.pending === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : `Process 50 URLs${priorityCrawlCount > 0 ? ' (Priority first)' : ''}`}
              </button>
              <button
                onClick={() => handleProcessQueue(100)}
                disabled={processing || queueStatusCounts.pending === 0}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : `Process 100 URLs${priorityCrawlCount > 0 ? ' (Priority first)' : ''}`}
              </button>

              {queueStatusCounts.failed > 0 && (
                <button
                  onClick={handleRetryAllFailed}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {loading ? 'Retrying...' : `Retry All ${queueStatusCounts.failed} Failed URLs`}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Queue Items</h2>
            <button
              onClick={() => setStatusFilter(statusFilter === 'priority' ? 'all' : 'priority')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === 'priority'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              Priority Queue
              {priorityCrawlCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  statusFilter === 'priority'
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-emerald-400 text-emerald-900'
                }`}>
                  {priorityCrawlCount}
                </span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-400"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="priority">Priority</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-400"
              >
                <option value="all">All</option>
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">Search URL</label>
              <input
                type="text"
                value={urlFilter}
                onChange={(e) => setUrlFilter(e.target.value)}
                placeholder="Filter by URL..."
                className="w-full px-4 py-2 bg-slate-900 border border-blue-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              {(statusFilter !== 'all' || priorityFilter !== 'all' || urlFilter) && (
                <button
                  onClick={clearFilters}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRetrySelected}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry {selectedItems.size} Selected
                </button>
                <button
                  onClick={handlePriorityCrawlSelected}
                  disabled={loading || selectedItems.size > 100}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={selectedItems.size > 100 ? 'Maximum 100 URLs can be selected for priority crawl' : 'Mark selected URLs for priority crawl'}
                >
                  <Zap className="w-4 h-4" />
                  Priority Crawl {selectedItems.size} Selected
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-500/30">
                  <th className="py-3 px-4 w-12">
                    <input
                      type="checkbox"
                      checked={queueItems.length > 0 && selectedItems.size === queueItems.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-blue-500/30 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blue-300">URL</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blue-300">PRIORITY</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blue-300">STATUS</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blue-300">ATTEMPTS</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blue-300">SCHEDULED</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-blue-300">LAST ERROR</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item) => (
                  <tr key={item.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${item.priority_crawl ? 'bg-emerald-500/5' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-4 h-4 rounded border-blue-500/30 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                      />
                    </td>
                    <td className="py-3 px-4 text-sm text-white max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        {item.priority_crawl && (
                          <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" title="Priority Crawl" />
                        )}
                        {item.priority_crawl_failed && (
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" title="Priority crawl failed" />
                        )}
                        <span className="truncate">{item.url}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{item.priority}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          item.status === 'processing' ? 'bg-blue-500/20 text-blue-300' :
                          item.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {item.status}
                        </span>
                        {item.priority_crawl && item.status === 'pending' && (
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300">
                            PRIORITY
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white">{item.attempts}</td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {new Date(item.scheduled_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-red-400 max-w-xs truncate">
                      {item.last_error || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>

              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Page</span>
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  className="w-16 px-2 py-1 bg-slate-900 border border-blue-500/30 rounded text-white text-center focus:outline-none focus:border-blue-400"
                />
                <span className="text-sm text-gray-400">of {Math.ceil(totalItems / itemsPerPage) || 1}</span>
              </form>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                className="flex items-center gap-1 px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
