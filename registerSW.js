if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Unregister any old service worker from the subdomain path
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (registration.scope.includes('juba-application-pros')) {
        await registration.unregister();
      }
    }

    // Register the new service worker at root
    navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}