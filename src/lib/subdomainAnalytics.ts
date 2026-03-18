import { supabase } from './supabase';

export interface TrackVisitParams {
  subdomainId: string;
  pageId?: string;
  pagePath: string;
  sessionId: string;
  referrer?: string;
  userAgent?: string;
}

export async function trackSubdomainVisit(params: TrackVisitParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('subdomain_page_visits')
      .insert({
        subdomain_id: params.subdomainId,
        page_id: params.pageId || null,
        page_path: params.pagePath,
        session_id: params.sessionId,
        referrer: params.referrer || document.referrer || null,
        user_agent: params.userAgent || navigator.userAgent,
      });

    if (error) {
      console.error('Error tracking subdomain visit:', error);
    }
  } catch (error) {
    console.error('Error tracking subdomain visit:', error);
  }
}

export async function trackPagePublish(
  subdomainId: string,
  pageId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: pageId,
        event_type: 'page_published',
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error tracking page publish:', error);
    }
  } catch (error) {
    console.error('Error tracking page publish:', error);
  }
}

export async function trackSitePublish(
  subdomainId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('subdomain_publish_events')
      .insert({
        subdomain_id: subdomainId,
        page_id: null,
        event_type: 'site_published',
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error tracking site publish:', error);
    }
  } catch (error) {
    console.error('Error tracking site publish:', error);
  }
}

export function generateSessionId(): string {
  const stored = sessionStorage.getItem('subdomain_session_id');
  if (stored) return stored;

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('subdomain_session_id', sessionId);
  return sessionId;
}

export async function createSubdomainPage(
  subdomainId: string,
  pagePath: string,
  pageTitle: string,
  pageType: 'homepage' | 'content_page' | 'blog_post' | 'custom' = 'content_page'
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('subdomain_pages')
      .insert({
        subdomain_id: subdomainId,
        page_path: pagePath,
        page_title: pageTitle,
        page_type: pageType,
        is_published: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subdomain page:', error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error creating subdomain page:', error);
    return null;
  }
}

export async function publishSubdomainPage(pageId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subdomain_pages')
      .update({ is_published: true })
      .eq('id', pageId);

    if (error) {
      console.error('Error publishing page:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error publishing page:', error);
    return false;
  }
}

export async function getSubdomainPages(subdomainId: string) {
  try {
    const { data, error } = await supabase
      .from('subdomain_pages')
      .select('*')
      .eq('subdomain_id', subdomainId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subdomain pages:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching subdomain pages:', error);
    return [];
  }
}

export async function aggregateAnalytics(targetDate?: Date): Promise<void> {
  try {
    const date = targetDate || new Date();
    const dateString = date.toISOString().split('T')[0];

    const { error } = await supabase.rpc('aggregate_subdomain_analytics', {
      target_date: dateString,
    });

    if (error) {
      console.error('Error aggregating analytics:', error);
    }
  } catch (error) {
    console.error('Error aggregating analytics:', error);
  }
}
