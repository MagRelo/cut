export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Wait for the page to be fully loaded
    window.addEventListener('load', () => {
      // Add a small delay to ensure all resources are loaded
      setTimeout(() => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful');

            // Check for updates every hour
            setInterval(() => {
              registration.update();
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
      }, 1000); // 1 second delay
    });
  }
}
