/**
 * Mentes Sinteticas — Service Worker
 *
 * Caching strategies:
 * - CacheFirst for static assets (JS, CSS, images, fonts)
 * - NetworkFirst for HTML pages (fallback to cache, then /offline)
 * - NetworkOnly for API calls
 *
 * Cache versioning via CACHE_VERSION constant.
 */

const CACHE_VERSION = 1;
const STATIC_CACHE = `static-assets-v${CACHE_VERSION}`;
const PAGES_CACHE = `pages-v${CACHE_VERSION}`;

const PRECACHE_URLS = ["/offline"];

const STATIC_EXTENSIONS = [
  ".js",
  ".css",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".ico",
  ".gif",
];

const MAX_STATIC_ENTRIES = 200;
const MAX_STATIC_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PAGE_NETWORK_TIMEOUT_MS = 3000;

// ---------------------------------------------------------------------------
// Install — precache offline page
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---------------------------------------------------------------------------
// Activate — clean old caches
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  const validCaches = new Set([STATIC_CACHE, PAGES_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isStaticAsset(url) {
  const pathname = new URL(url).pathname;
  // Next.js hashed assets
  if (pathname.startsWith("/_next/static/")) return true;
  // Known static extensions
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isAPIRequest(url) {
  return new URL(url).pathname.startsWith("/api/");
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

/**
 * CacheFirst with expiration enforcement.
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get("sw-cached-at");
    if (dateHeader) {
      const age = Date.now() - parseInt(dateHeader, 10);
      if (age > MAX_STATIC_AGE_MS) {
        // Expired — fetch fresh, don't block
        fetchAndCache(request, cache);
      }
    }
    return cached;
  }

  return fetchAndCache(request, cache);
}

async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone and add timestamp header
      const headers = new Headers(response.headers);
      headers.set("sw-cached-at", String(Date.now()));
      const timedResponse = new Response(await response.clone().blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      await cache.put(request, timedResponse);
      // Enforce max entries
      enforceMaxEntries(cache);
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function enforceMaxEntries(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_STATIC_ENTRIES) {
    const toDelete = keys.length - MAX_STATIC_ENTRIES;
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * NetworkFirst with timeout, fallback to cache, then /offline.
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(PAGES_CACHE);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      PAGE_NETWORK_TIMEOUT_MS
    );

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed or timed out — try cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Last resort — offline page
    const offlinePage = await cache.match("/offline");
    if (offlinePage) return offlinePage;

    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET
  if (request.method !== "GET") return;

  const url = request.url;

  // API — NetworkOnly (pass through)
  if (isAPIRequest(url)) return;

  // Static assets — CacheFirst
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Navigation (HTML pages) — NetworkFirst
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
});
