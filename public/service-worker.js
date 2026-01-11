/**
 * Service Worker for Offline Support
 *
 * Provides caching strategies for offline functionality
 * Implements background sync for data updates
 */

const CACHE_VERSION = "v1.0.1"; // Updated for new manifest.json and PWA icons
const CACHE_NAME = `wms-pro-${CACHE_VERSION}`;

// Assets to cache immediately
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/offline.html",
];

// API routes that should be cached
const CACHEABLE_API_ROUTES = [
  "/api/inventory/items",
  "/api/inventory/locations",
  "/api/inventory/balances",
  "/api/dashboard/stats",
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: "cache-first", // Use cache, fallback to network
  NETWORK_FIRST: "network-first", // Use network, fallback to cache
  NETWORK_ONLY: "network-only", // Always use network
  CACHE_ONLY: "cache-only", // Always use cache
  STALE_WHILE_REVALIDATE: "stale-while-revalidate", // Return cache, update in background
};

/**
 * Install event - cache essential assets
 */
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching assets");
      return cache.addAll(PRECACHE_ASSETS);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Take control immediately
  return self.clients.claim();
});

/**
 * Fetch event - handle network requests with caching strategies
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Determine caching strategy based on request type
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;

  // Static assets - cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|eot)$/)
  ) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  }

  // API routes - network first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    if (isCacheableAPI(url.pathname)) {
      strategy = CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
    } else {
      strategy = CACHE_STRATEGIES.NETWORK_ONLY;
    }
  }

  // HTML pages - network first
  if (request.headers.get("accept").includes("text/html")) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  }

  event.respondWith(handleRequest(request, strategy));
});

/**
 * Handle request based on caching strategy
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      return cacheFirst(request);

    case CACHE_STRATEGIES.NETWORK_FIRST:
      return networkFirst(request);

    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);

    case CACHE_STRATEGIES.NETWORK_ONLY:
      return fetch(request);

    case CACHE_STRATEGIES.CACHE_ONLY:
      return cacheOnly(request);

    default:
      return networkFirst(request);
  }
}

/**
 * Cache First Strategy
 * Return cached response if available, otherwise fetch from network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    console.log("[Service Worker] Cache hit:", request.url);
    return cached;
  }

  console.log("[Service Worker] Cache miss, fetching:", request.url);
  const response = await fetch(request);

  // Cache successful responses
  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

/**
 * Network First Strategy
 * Try network first, fallback to cache if offline
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log("[Service Worker] Network failed, using cache:", request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page for HTML requests
    if (request.headers.get("accept").includes("text/html")) {
      return cache.match("/offline.html");
    }

    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached response immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch and update cache in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached version immediately if available
  if (cached) {
    return cached;
  }

  // Otherwise wait for network
  return fetchPromise;
}

/**
 * Cache Only Strategy
 * Only return cached responses
 */
async function cacheOnly(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request);
}

/**
 * Check if API route should be cached
 */
function isCacheableAPI(pathname) {
  return CACHEABLE_API_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Background Sync - retry failed requests when back online
 */
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync:", event.tag);

  if (event.tag === "sync-transactions") {
    event.waitUntil(syncPendingTransactions());
  }

  if (event.tag === "sync-inventory") {
    event.waitUntil(syncInventoryUpdates());
  }
});

/**
 * Sync pending transactions from IndexedDB
 */
async function syncPendingTransactions() {
  console.log("[Service Worker] Syncing pending transactions...");

  try {
    // Open IndexedDB and get pending transactions
    const db = await openDatabase();
    const transactions = await getPendingTransactions(db);

    console.log(`[Service Worker] Found ${transactions.length} pending transactions`);

    for (const transaction of transactions) {
      try {
        const response = await fetch("/api/inventory/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(transaction.data),
        });

        if (response.ok) {
          // Mark as synced
          await markTransactionSynced(db, transaction.id);
          console.log("[Service Worker] Transaction synced:", transaction.id);
        }
      } catch (error) {
        console.error("[Service Worker] Failed to sync transaction:", error);
      }
    }
  } catch (error) {
    console.error("[Service Worker] Sync failed:", error);
  }
}

/**
 * Sync inventory updates
 */
async function syncInventoryUpdates() {
  console.log("[Service Worker] Syncing inventory updates...");
  // Implementation would fetch latest inventory data
}

/**
 * Open IndexedDB for offline storage
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("WMSOfflineDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("pendingTransactions")) {
        const store = db.createObjectStore("pendingTransactions", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
        store.createIndex("synced", "synced");
      }

      if (!db.objectStoreNames.contains("cachedData")) {
        db.createObjectStore("cachedData", { keyPath: "key" });
      }
    };
  });
}

/**
 * Get pending transactions from IndexedDB
 */
function getPendingTransactions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pendingTransactions", "readonly");
    const store = transaction.objectStore("pendingTransactions");
    const index = store.index("synced");
    const request = index.getAll(false);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark transaction as synced
 */
function markTransactionSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("pendingTransactions", "readwrite");
    const store = transaction.objectStore("pendingTransactions");
    const request = store.get(id);

    request.onsuccess = () => {
      const data = request.result;
      data.synced = true;
      store.put(data);
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Push notification handler
 */
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || "New notification",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "WMS Pro", options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

/**
 * Message handler for communication with main app
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return self.registration.unregister();
      })
    );
  }
});

console.log("[Service Worker] Loaded successfully");
