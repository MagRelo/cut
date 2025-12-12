import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { PostHogProvider } from "posthog-js/react";
import { unregisterServiceWorker } from "./utils/unregisterServiceWorker";

// Unregister any existing service workers
unregisterServiceWorker();

const app = (
  <React.StrictMode>
    {import.meta.env.PROD ? (
      <PostHogProvider
        apiKey={import.meta.env.VITE_POSTHOG_KEY}
        options={{
          api_host: "https://analytics.mattlovan.dev",
          loaded: (posthog) => {
            if (import.meta.env.DEV) posthog.debug();
          },
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: true,
          capture_exceptions: {
            capture_unhandled_errors: true,
            capture_unhandled_rejections: true,
            capture_console_errors: false,
          },
        }}
      >
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")!).render(app);
