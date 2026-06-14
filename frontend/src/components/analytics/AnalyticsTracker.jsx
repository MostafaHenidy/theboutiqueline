import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalyticsFromUrl, trackPageView } from '../../utils/analyticsTracker';

/** Records storefront page views for admin analytics (skips /admin). */
export default function AnalyticsTracker() {
  const location = useLocation();
  const lastPath = useRef('');

  useEffect(() => {
    initAnalyticsFromUrl();
  }, []);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === lastPath.current) return;
    lastPath.current = path;
    trackPageView(path);
  }, [location.pathname, location.search]);

  return null;
}
