import { useEffect } from 'react';
import { trackSubdomainVisit, generateSessionId } from '../lib/subdomainAnalytics';

interface UseSubdomainTrackingOptions {
  subdomainId: string;
  pageId?: string;
  pagePath: string;
  enabled?: boolean;
}

export function useSubdomainTracking({
  subdomainId,
  pageId,
  pagePath,
  enabled = true,
}: UseSubdomainTrackingOptions) {
  useEffect(() => {
    if (!enabled || !subdomainId) return;

    const sessionId = generateSessionId();
    const startTime = Date.now();

    trackSubdomainVisit({
      subdomainId,
      pageId,
      pagePath,
      sessionId,
    });

    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);

      if (duration > 0) {
        trackSubdomainVisit({
          subdomainId,
          pageId,
          pagePath,
          sessionId,
        });
      }
    };
  }, [subdomainId, pageId, pagePath, enabled]);
}
