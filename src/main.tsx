import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import './i18n.ts';

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true });
}
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

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

