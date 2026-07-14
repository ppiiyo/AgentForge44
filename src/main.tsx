import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n.ts';
import { showErrorToast } from './utils/toast.js';

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

  // Wrap ResizeObserver to schedule callbacks via requestAnimationFrame, avoiding synchronous loop errors
  if (window.ResizeObserver) {
    const OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(callback: any) {
        super((entries, observer) => {
          requestAnimationFrame(() => {
            try {
              callback(entries, observer);
            } catch (err: any) {
              const msg = err?.message || String(err);
              if (
                msg.includes('ResizeObserver loop completed with undelivered notifications') ||
                msg.includes('ResizeObserver loop limit exceeded')
              ) {
                return;
              }
              throw err;
            }
          });
        });
      }
    };
  }
}

import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Auto-authentication logic & fetch interceptor
const originalFetch = window.fetch;

// Async authentication bootstrap
async function bootstrapAuth() {
  const credentials = {
    email: 'guest@kostromai44.ai',
    password: 'GuestPassword123!'
  };

  try {
    const existingToken = localStorage.getItem('kostromai44_auth_token');
    if (existingToken) {
      const verifyRes = await originalFetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${existingToken}` }
      });
      if (verifyRes.ok) {
        return;
      }
      localStorage.removeItem('kostromai44_auth_token');
    }

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
    let registerRes = await originalFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...credentials, role: 'admin' })
    });

    if (!registerRes.ok) {
      // If admin registration failed, retry as editor
      registerRes = await originalFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, role: 'editor' })
      });
    }

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

// Bootstrap auth on initial load
bootstrapAuth();

function sanitizeErrorMessage(msg: string, status: number, isRu: boolean): string {
  if (status === 500) {
    return isRu 
      ? 'Внутренняя ошибка сервера. Пожалуйста, проверьте конфигурацию узлов конвейера и повторите попытку.' 
      : 'Internal server error. Please check your pipeline node configuration and try again.';
  }
  
  // Also check if the message contains technical trace patterns
  const technicalPatterns = [
    'at ',
    'node_modules',
    '/app/',
    'sqlite',
    'drizzle',
    'syntax error',
    'postgres',
    'connection refused',
    'stack trace',
    'unhandled rejection'
  ];
  
  const hasTechnicalKeywords = technicalPatterns.some(pattern => msg.toLowerCase().includes(pattern));
  if (hasTechnicalKeywords) {
    return isRu
      ? 'Произошла системная ошибка при обработке запроса. Пожалуйста, проверьте корректность данных конвейера.'
      : 'An unexpected system error occurred. Please contact support or verify your pipeline configuration.';
  }
  
  return msg;
}

/* eslint-disable no-undef */
const secureFetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  let token = localStorage.getItem('kostromai44_auth_token');
  if (token === 'undefined' || token === 'null' || !token) {
    token = null;
  }
  const tokenUsed = token;
  
  // Resolve the URL string safely
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === 'object' && 'url' in input) {
    url = (input as any).url || '';
  }

  let actualInput = input;
  let actualInit = init;

  // Intercept requests targeting /api/
  if (url && url.includes('/api/') && token) {
    if (input && typeof input === 'object' && 'clone' in input) {
      try {
        const req = input as Request;
        const reqHeaders = req.headers;
        if (reqHeaders && typeof reqHeaders.get === 'function' && !reqHeaders.get('Authorization')) {
          const headersObj: Record<string, string> = {};
          reqHeaders.forEach((value, key) => {
            headersObj[key] = value;
          });
          headersObj['Authorization'] = `Bearer ${token}`;
          actualInput = new Request(req, { headers: headersObj });
          actualInit = undefined;
        }
      } catch (e) {
        console.warn('Failed to intercept Request object headers:', e);
      }
    } else {
      // input is a string or URL, so copy/modify init safely
      try {
        const newInit = { ...init };
        const headersObj: Record<string, string> = {};
        
        if (newInit.headers) {
          if (typeof (newInit.headers as any).forEach === 'function') {
            (newInit.headers as any).forEach((value: string, key: string) => {
              headersObj[key] = value;
            });
          } else if (Array.isArray(newInit.headers)) {
            newInit.headers.forEach(([key, value]) => {
              headersObj[key] = value;
            });
          } else {
            Object.assign(headersObj, newInit.headers);
          }
        }
        
        const hasAuth = Object.keys(headersObj).some(k => k.toLowerCase() === 'authorization');
        if (!hasAuth) {
          headersObj['Authorization'] = `Bearer ${token}`;
        }
        
        newInit.headers = headersObj;
        actualInit = newInit;
      } catch (e) {
        console.warn('Failed to intercept fetch init headers:', e);
      }
    }
  }

  let response: Response;
  try {
    response = await originalFetch(actualInput, actualInit);
  } catch (err: any) {
    if (url && url.includes('/api/')) {
      const isRu = typeof window !== 'undefined' && localStorage.getItem('i18nextLng') === 'ru';
      const msg = err?.message || String(err);
      showErrorToast(
        isRu ? `Сетевой сбой при запросе к серверу: ${msg}` : `Network connection failure: ${msg}`,
        isRu ? 'Ошибка сети' : 'Network Error'
      );
    }
    throw err;
  }

  // Auto-recovery: If we receive a 401 Unauthorized for an API call, try to re-authenticate and retry
  if (url && url.includes('/api/') && response.status === 401 && !url.includes('/api/auth/')) {
    localStorage.removeItem('kostromai44_auth_token');
    await bootstrapAuth();
    const newToken = localStorage.getItem('kostromai44_auth_token');
    if (newToken && newToken !== tokenUsed) {
      let retryInput = input;
      let retryInit = init;

      if (input && typeof input === 'object' && 'clone' in input) {
        try {
          const req = input as Request;
          const headersObj: Record<string, string> = {};
          if (req.headers && typeof req.headers.forEach === 'function') {
            req.headers.forEach((value, key) => {
              headersObj[key] = value;
            });
          }
          headersObj['Authorization'] = `Bearer ${newToken}`;
          retryInput = new Request(req, { headers: headersObj });
          retryInit = undefined;
        } catch (e) {
          console.warn('Failed to rebuild request on 401 retry:', e);
        }
      } else {
        try {
          const newInit = { ...init };
          const headersObj: Record<string, string> = {};
          if (newInit.headers) {
            if (typeof (newInit.headers as any).forEach === 'function') {
              (newInit.headers as any).forEach((value: string, key: string) => {
                headersObj[key] = value;
              });
            } else if (Array.isArray(newInit.headers)) {
              newInit.headers.forEach(([key, value]) => {
                headersObj[key] = value;
              });
            } else {
              Object.assign(headersObj, newInit.headers);
            }
          }
          headersObj['Authorization'] = `Bearer ${newToken}`;
          newInit.headers = headersObj;
          retryInit = newInit;
        } catch (e) {
          console.warn('Failed to rebuild fetch init on 401 retry:', e);
        }
      }

      try {
        const retriedResponse = await originalFetch(retryInput, retryInit);
        if (retriedResponse.ok) {
          return retriedResponse;
        }
        // If the retry also fails, let the flow continue to show error toast
        response = retriedResponse;
      } catch (retryErr) {
        console.error('Retry after 401 failed:', retryErr);
      }
    }
  }

  if (url && url.includes('/api/') && !response.ok) {
    try {
      const cloned = response.clone();
      cloned.json().then(data => {
        const isRu = typeof window !== 'undefined' && localStorage.getItem('i18nextLng') === 'ru';
        const errorMsg = data?.error || data?.message || `HTTP ${response.status} ${response.statusText}`;
        const sanitizedMsg = sanitizeErrorMessage(errorMsg, response.status, isRu);
        showErrorToast(
          sanitizedMsg,
          isRu ? 'Сбой операции' : 'API Failure'
        );
      }).catch(() => {
        response.clone().text().then(text => {
          const isRu = typeof window !== 'undefined' && localStorage.getItem('i18nextLng') === 'ru';
          const errorMsg = text ? (text.length > 100 ? `${text.substring(0, 100)}...` : text) : `HTTP ${response.status}`;
          const sanitizedMsg = sanitizeErrorMessage(errorMsg, response.status, isRu);
          showErrorToast(
            sanitizedMsg,
            isRu ? 'Сбой операции' : 'API Failure'
          );
        }).catch(() => {
          const isRu = typeof window !== 'undefined' && localStorage.getItem('i18nextLng') === 'ru';
          const sanitizedMsg = sanitizeErrorMessage(`HTTP ${response.status}`, response.status, isRu);
          showErrorToast(
            sanitizedMsg,
            isRu ? 'Ошибка API' : 'API Failure'
          );
        });
      });
    } catch (e) {
      console.warn('Failed to clone and parse error response:', e);
    }
  }

  return response;
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

// Sentry initiation helper

const sentryDsn = (import.meta as any).env.VITE_SENTRY_DSN;
if (sentryDsn && sentryDsn !== 'your_sentry_dsn_here' && sentryDsn.startsWith('http')) {
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

