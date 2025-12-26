/* Service Worker - handles notification click to focus/open app and route to conversation */
'use strict';

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', function (event) {
  const notification = event.notification;
  const data = notification && notification.data ? notification.data : {};
  notification.close();

  event.waitUntil(
    (async function () {
      try {
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });

        // Try to focus an existing client
        if (allClients && allClients.length > 0) {
          const client = allClients[0];
          client.focus && client.focus();
          client.postMessage({ type: 'open_conversation', conversationId: data?.conversationId });
          return;
        }

        // Otherwise open a new window/tab
        const url = data && data.url ? data.url : '/';
        const newClient = await clients.openWindow(url);
        if (newClient) {
          // postMessage may fail if not yet ready, but attempt it
          newClient.postMessage({ type: 'open_conversation', conversationId: data?.conversationId });
        }
      } catch (e) {
        // no-op
      }
    })()
  );
});
