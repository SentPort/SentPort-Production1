import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

export function usePageTracking(platform: string) {
  const location = useLocation();

  useEffect(() => {
    const hostname = window.location.hostname;
    const isSubdomain = hostname.includes('.sentport.com') && !hostname.startsWith('www');
    const subdomain = isSubdomain ? hostname.split('.')[0] : undefined;

    trackPageView(location.pathname, platform, subdomain);
  }, [location.pathname, platform]);
}
