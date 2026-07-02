import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n.ts';

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Auto-authentication logic & fetch interceptor
const originalFetch = window.fetch;

window.fetch = async function(input, init) {
  const token = localStorage.getItem('agentforge_auth_token');
  const url = typeof input === 'string' ? input : (input as Request).url;

  // Intercept requests targeting /api/
  if (url.includes('/api/') && token) {
    init = init || {};
    init.headers = init.headers || {};
    
    if (init.headers instanceof Headers) {
      if (!init.headers.has('Authorization')) {
        init.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(init.headers)) {
      const hasAuth = init.headers.some(h => h[0].toLowerCase() === 'authorization');
      if (!hasAuth) {
        init.headers.push(['Authorization', `Bearer ${token}`]);
      }
    } else {
      // It's a plain object
      const hasAuth = Object.keys(init.headers).some(k => k.toLowerCase() === 'authorization');
      if (!hasAuth) {
        (init.headers as any)['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  return originalFetch(input, init);
};

// Async authentication bootstrap
async function bootstrapAuth() {
  const credentials = {
    email: 'guest@agentforge.ai',
    password: 'GuestPassword123!'
  };

  try {
    const existingToken = localStorage.getItem('agentforge_auth_token');
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
        localStorage.setItem('agentforge_auth_token', data.token);
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
        localStorage.setItem('agentforge_auth_token', data.token);
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

