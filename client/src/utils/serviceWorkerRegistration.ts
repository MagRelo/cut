let currentVersion: string | null = null;

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('ServiceWorker registration successful');

          // Check for updates every hour
          setInterval(async () => {
            try {
              // Check version from service worker
              const response = await fetch('/version-check');
              const { version } = await response.json();

              if (currentVersion && version !== currentVersion) {
                // Version has changed, trigger update
                registration.update();
              }
              currentVersion = version;
            } catch (error) {
              console.error('Version check failed:', error);
            }
          }, 60 * 60 * 1000);

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            newWorker?.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New content is available, show update notification
                if (
                  confirm('New version available! Would you like to update?')
                ) {
                  newWorker.postMessage({ type: 'skipWaiting' });
                  window.location.reload();
                }
              }
            });
          });
        })
        .catch((error) => {
          console.error('ServiceWorker registration failed:', error);
        });
    });
  }
}
