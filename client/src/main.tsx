import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { PostHogProvider } from 'posthog-js/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
