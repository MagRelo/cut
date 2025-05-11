import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { PostHogProvider } from 'posthog-js/react';

const app = (
  <React.StrictMode>
    {import.meta.env.PROD ? (
      <PostHogProvider
        apiKey={import.meta.env.VITE_POSTHOG_KEY}
        options={{
          api_host:
            import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
          loaded: (posthog) => {
            if (import.meta.env.DEV) posthog.debug();
          },
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: true,
        }}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(app);
