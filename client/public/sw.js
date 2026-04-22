// VENTEX Service Worker — PWA offline caching + push notifications
// v2: Fixed stale JS caching — JS/CSS now network-first so deployments take effect immediately
const CACHE_NAME = "ventex-v2";
const VENTEX_ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/ventex-logo-mark_1f534165.png";

// Assets to pre-cache for offline shell
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
];

// Install: pre-cache critical assets, skip waiting to activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        console.log("[SW] Some precache assets failed to cache");
      });
    })
  );
  self.skipWaiting();
});

// Activate: delete ALL old caches (including ventex-v1) so stale JS is gone
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip SSE and API calls — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // For navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/");
      })
    );
    return;
  }

  // For JS and CSS: NETWORK-FIRST so new deployments take effect immediately
  // Only fall back to cache when offline
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // For images/fonts/static: stale-while-revalidate (these don't change often)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|ico)$/) ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("cloudfront.net")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  let data = { title: "VENTEX", body: "New update available", tag: "ventex-update" };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    // Use defaults
  }

  const options = {
    body: data.body,
    icon: VENTEX_ICON,
    badge: VENTEX_ICON,
    tag: data.tag || "ventex-update",
    renotify: true,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/dashboard",
      timestamp: Date.now(),
    },
    actions: data.actions || [
      { action: "open", title: "Open VENTEX" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler — open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard";

  if (event.action === "dismiss") return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
