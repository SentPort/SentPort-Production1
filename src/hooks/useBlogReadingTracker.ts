import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calculateReadingProgress } from '../lib/blogPaginationHelpers';

interface ReadingTrackerOptions {
  postId: string;
  userId: string | null;
  wordCount: number;
  estimatedReadMinutes: number;
  currentPage?: number;
  totalPages?: number;
}

const WORDS_PER_MINUTE = 200;
const UPDATE_INTERVAL = 10000;
const IDLE_MULTIPLIER = 2;

export function useBlogReadingTracker({
  postId,
  userId,
  wordCount,
  estimatedReadMinutes,
  currentPage = 1,
  totalPages = 1
}: ReadingTrackerOptions) {
  const sessionStartRef = useRef<Date>(new Date());
  const lastScrollRef = useRef<Date>(new Date());
  const lastActivityRef = useRef<Date>(new Date());
  const scrollCountRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const idleSecondsRef = useRef(0);
  const maxScrollDepthRef = useRef(0);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isTrackingRef = useRef(true);
  const pagesCompletedRef = useRef<Set<number>>(new Set());

  const calculateEstimatedReadTime = useCallback(() => {
    if (estimatedReadMinutes > 0) {
      return estimatedReadMinutes * 60;
    }
    return Math.max((wordCount / WORDS_PER_MINUTE) * 60, 60);
  }, [wordCount, estimatedReadMinutes]);

  const calculateScrollDepth = useCallback(() => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;
    const scrollDepth = ((scrollTop + windowHeight) / documentHeight) * 100;
    const currentPageScrollDepth = Math.min(Math.round(scrollDepth), 100);

    if (currentPageScrollDepth >= 80 && currentPage) {
      pagesCompletedRef.current.add(currentPage);
    }

    return currentPageScrollDepth;
  }, [currentPage]);

  const calculateActiveIdleTime = useCallback(() => {
    const now = new Date();
    const timeSinceLastActivity = (now.getTime() - lastActivityRef.current.getTime()) / 1000;

    const estimatedReadTime = calculateEstimatedReadTime();
    const avgTimePerScroll = scrollCountRef.current > 0
      ? estimatedReadTime / scrollCountRef.current
      : estimatedReadTime / 10;

    const idleThreshold = avgTimePerScroll * IDLE_MULTIPLIER;

    if (timeSinceLastActivity > idleThreshold) {
      idleSecondsRef.current += timeSinceLastActivity;
    } else {
      activeSecondsRef.current += timeSinceLastActivity;
    }

    lastActivityRef.current = now;
  }, [calculateEstimatedReadTime]);

  const updateReadProgress = useCallback(async () => {
    if (!isTrackingRef.current || !userId) return;

    calculateActiveIdleTime();

    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - sessionStartRef.current.getTime()) / 1000);
    const pageScrollDepth = maxScrollDepthRef.current;
    const overallProgress = calculateReadingProgress(currentPage, pageScrollDepth, totalPages);

    const isBookmarkSignal =
      overallProgress > 90 &&
      activeSecondsRef.current > calculateEstimatedReadTime() * 0.7 &&
      scrollCountRef.current > 3;

    const isCompleted = totalPages > 1
      ? pagesCompletedRef.current.size === totalPages
      : overallProgress >= 95;

    const progressData = {
      post_id: postId,
      user_id: userId,
      completion_percentage: Math.round(overallProgress),
      total_seconds_on_page: totalSeconds,
      active_reading_seconds: Math.floor(activeSecondsRef.current),
      idle_seconds_discounted: Math.floor(idleSecondsRef.current),
      last_scroll_at: lastScrollRef.current.toISOString(),
      session_start_at: sessionStartRef.current.toISOString(),
      is_bookmark_signal: isBookmarkSignal,
      scroll_events_count: scrollCountRef.current,
      completed_at: isCompleted ? now.toISOString() : null,
      current_page: currentPage,
      pages_completed: Array.from(pagesCompletedRef.current)
    };

    try {
      await supabase
        .from('blog_read_progress')
        .upsert(progressData, {
          onConflict: 'post_id,user_id'
        });
    } catch (error) {
      console.error('Error updating read progress:', error);
    }
  }, [postId, userId, calculateEstimatedReadTime, calculateActiveIdleTime, currentPage, totalPages]);

  const handleScroll = useCallback(() => {
    const scrollDepth = calculateScrollDepth();

    if (scrollDepth > maxScrollDepthRef.current) {
      maxScrollDepthRef.current = scrollDepth;
    }

    scrollCountRef.current += 1;
    lastScrollRef.current = new Date();
    lastActivityRef.current = new Date();
  }, [calculateScrollDepth]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      calculateActiveIdleTime();
      updateReadProgress();
      isTrackingRef.current = false;
    } else {
      lastActivityRef.current = new Date();
      isTrackingRef.current = true;
    }
  }, [calculateActiveIdleTime, updateReadProgress]);

  const handleBeforeUnload = useCallback(() => {
    calculateActiveIdleTime();
    updateReadProgress();
  }, [calculateActiveIdleTime, updateReadProgress]);

  useEffect(() => {
    sessionStartRef.current = new Date();
    lastActivityRef.current = new Date();
    lastScrollRef.current = new Date();
    maxScrollDepthRef.current = calculateScrollDepth();

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    updateIntervalRef.current = setInterval(() => {
      if (isTrackingRef.current) {
        updateReadProgress();
      }
    }, UPDATE_INTERVAL);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      calculateActiveIdleTime();
      updateReadProgress();

      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    handleScroll,
    handleVisibilityChange,
    handleBeforeUnload,
    updateReadProgress,
    calculateScrollDepth,
    calculateActiveIdleTime
  ]);

  return {
    scrollDepth: maxScrollDepthRef.current,
    scrollCount: scrollCountRef.current,
    activeSeconds: Math.floor(activeSecondsRef.current),
    totalSeconds: Math.floor((new Date().getTime() - sessionStartRef.current.getTime()) / 1000)
  };
}
