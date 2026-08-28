import { useAuthStore } from '../store/authStore';
import { isDesktopApp } from '../lib/desktop';

const MAX_CLICK_EVENTS_PER_10_SECONDS = 20;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
let clickWindowStartedAt = 0;
let clickEventsInWindow = 0;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const initializeGoogleAnalytics = (): void => {
  if (isDesktopApp()) return;
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined' || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
};

// Generate a simple high-entropy UUID-like string
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Get or create session ID in sessionStorage
export const getOrCreateSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('hi_analytics_session_id');
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem('hi_analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track event utility
export const trackEvent = async (
  eventType: 'PAGE_VIEW' | 'CLICK' | 'REGISTER' | 'ONBOARDING_COMPLETE',
  target: string,
  metadata?: Record<string, any>
): Promise<void> => {
  if (isDesktopApp()) return;
  try {
    if (eventType === 'CLICK' && !allowClickEvent()) {
      return;
    }
    const sessionId = getOrCreateSessionId();
    const user = useAuthStore.getState().user;
    const userId = user?._id || '';

    const payload = {
      sessionId,
      userId: userId || undefined,
      eventType,
      target: target.substring(0, 160),
      metadata: metadata
        ? Object.fromEntries(
            Object.entries(metadata)
              .filter(([, value]) => typeof value === 'number' || typeof value === 'boolean')
              .slice(0, 12)
          )
        : undefined
    };

    trackGoogleAnalyticsEvent(eventType, target, payload.metadata);

    // Keep browser requests same-origin in production; Vercel proxies /api to
    // the active backend and cookies remain first-party.
    const apiUrl = import.meta.env.PROD ? '/api' : import.meta.env.VITE_API_URL || '/api';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);

    // Use native fetch to avoid axios interceptor side-effects
    fetch(`${apiUrl}/analytics/track`, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Analytics is best-effort and should never affect app UX or local QA.
    }).finally(() => {
      window.clearTimeout(timeout);
    });
  } catch {
    // Analytics is best-effort and should never affect app UX or local QA.
  }
};

function trackGoogleAnalyticsEvent(
  eventType: 'PAGE_VIEW' | 'CLICK' | 'REGISTER' | 'ONBOARDING_COMPLETE',
  target: string,
  metadata?: Record<string, number | boolean>
) {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;

  const eventName = {
    PAGE_VIEW: 'page_view',
    CLICK: 'hi_click',
    REGISTER: 'sign_up',
    ONBOARDING_COMPLETE: 'onboarding_complete'
  }[eventType];

  const params = eventType === 'PAGE_VIEW'
    ? { page_path: target }
    : { element_id: target, ...metadata };

  window.gtag('event', eventName, params);
}

function allowClickEvent() {
  const now = Date.now();
  if (now - clickWindowStartedAt > 10_000) {
    clickWindowStartedAt = now;
    clickEventsInWindow = 0;
  }
  clickEventsInWindow += 1;
  return clickEventsInWindow <= MAX_CLICK_EVENTS_PER_10_SECONDS;
}
