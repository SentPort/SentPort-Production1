import { supabase } from './supabase';

const SESSION_KEY = 'sentport_session_id';

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function trackPageView(
  pagePath: string,
  platform: string,
  subdomain?: string
) {
  try {
    const sessionId = getOrCreateSessionId();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_page_views').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      page_path: pagePath,
      platform,
      subdomain: subdomain || null,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export async function trackSearch(query: string, resultsCount: number) {
  try {
    const sessionId = getOrCreateSessionId();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_searches').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      query,
      results_count: resultsCount
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export async function trackPlatformAction(
  platform: string,
  actionType: string,
  contentId?: string,
  metadata?: Record<string, any>
) {
  try {
    const sessionId = getOrCreateSessionId();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('analytics_platform_actions').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      platform,
      action_type: actionType,
      content_id: contentId || null,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export async function trackSubdomainVisit(
  subdomain: string,
  pagePath: string,
  referrer?: string
) {
  try {
    const sessionId = getOrCreateSessionId();

    await supabase.from('analytics_subdomain_visits').insert({
      subdomain,
      visitor_session_id: sessionId,
      page_path: pagePath,
      referrer: referrer || document.referrer || null
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export function useAnalytics() {
  return {
    trackPageView,
    trackSearch,
    trackPlatformAction,
    trackSubdomainVisit
  };
}
