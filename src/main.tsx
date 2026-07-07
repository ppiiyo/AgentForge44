import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n.ts';

// Suppress benign ResizeObserver loop completed / limit exceeded notifications
if (typeof window !== 'undefined') {
  const preventBenignResizeObserverError = (e: ErrorEvent) => {
    if (e && (
      e.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
      e.message?.includes('ResizeObserver loop limit exceeded')
    )) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };
  window.addEventListener('error', preventBenignResizeObserverError);
}

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Auto-authentication logic & fetch interceptor
const originalFetch = window.fetch;

/* eslint-disable no-undef */
const secureFetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  const token = localStorage.getItem('kostromai44_auth_token');
  
  // Resolve the URL string safely
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as any).url || '';
  }

  // Intercept requests targeting /api/
  if (url && url.includes('/api/') && token) {
    // If input is a Request object, create a new Request to avoid mutating readonly properties
    if (input && typeof input === 'object' && 'clone' in input) {
      try {
        const req = input as Request;
        if (!req.headers.has('Authorization')) {
          const newHeaders = new Headers(req.headers);
          newHeaders.set('Authorization', `Bearer ${token}`);
          const newRequest = new Request(req, { headers: newHeaders });
          return originalFetch(newRequest, init);
        }
      } catch (e) {
        console.warn('Failed to intercept Request object headers:', e);
      }
    } else {
      // input is a string or URL, so copy/modify init safely
      try {
        const newInit = { ...init };
        const headers = new Headers(newInit.headers || {});
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
          newInit.headers = headers;
        }
        return originalFetch(input, newInit);
      } catch (e) {
        console.warn('Failed to intercept fetch init headers:', e);
      }
    }
  }

  return originalFetch(input, init);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: secureFetch,
    writable: true,
    configurable: true
  });
} catch (err) {
  console.warn('Failed to redefine window.fetch with defineProperty:', err);
  try {
    (window as any).fetch = secureFetch;
  } catch (err2) {
    console.error('Failed to intercept fetch completely:', err2);
  }
}

// Async authentication bootstrap
async function bootstrapAuth() {
  const credentials = {
    email: 'guest@kostromai44.ai',
    password: 'GuestPassword123!'
  };

  try {
    const existingToken = localStorage.getItem('kostromai44_auth_token');
    if (existingToken) return;

    // Attempt login first
    const loginRes = await originalFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (loginRes.ok) {
      const data = await loginRes.json();
      if (data.token) {
        localStorage.setItem('kostromai44_auth_token', data.token);
        return;
      }
    }

    // Attempt registration if login fails
    const registerRes = await originalFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...credentials, role: 'admin' })
    });

    if (registerRes.ok) {
      const data = await registerRes.json();
      if (data.token) {
        localStorage.setItem('kostromai44_auth_token', data.token);
      }
    }
  } catch (err) {
    console.warn('Auto-authentication failed:', err);
  }
}

bootstrapAuth();

const sentryDsn = (import.meta as any).env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration()
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  });
}

const posthogKey = (import.meta as any).env.VITE_POSTHOG_KEY;
if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: (import.meta as any).env.VITE_POSTHOG_HOST || 'https://app.posthog.com'
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {posthogKey ? (
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);

