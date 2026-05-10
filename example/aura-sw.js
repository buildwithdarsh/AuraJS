/**
 * Aura.js Service Worker
 * Drop this file in your project root and register with:
 *   Aura.pwa.register('/aura-sw.js');
 *
 * Supports: cache-first, network-first, stale-while-revalidate, network-only, cache-only
 * Configured via Aura.pwa.addStrategy() from the main thread.
 */

const CACHE_PREFIX = 'aura-cache-';
const CACHE_VERSION = 'v1';
const PRECACHE_NAME = `${CACHE_PREFIX}precache-${CACHE_VERSION}`;

let strategies = [];
let precacheUrls = [];

// ============================================================
// MESSAGE HANDLER — receives config from Aura.pwa
// ============================================================
self.addEventListener('message', (event) => {
  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'AURA_STRATEGIES') {
    strategies = event.data.strategies.map((s) => ({
      ...s,
      matcher: s.isRegex ? new RegExp(s.match) : s.match,
    }));
  }

  if (type === 'AURA_PRECACHE') {
    precacheUrls = event.data.urls;
    caches.open(PRECACHE_NAME).then((cache) => cache.addAll(precacheUrls));
  }
});

// ============================================================
// INSTALL — precache assets
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE_NAME).then((cache) => {
      if (precacheUrls.length) return cache.addAll(precacheUrls);
    })
  );
});

// ============================================================
// ACTIVATE — clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== PRECACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH — apply caching strategies
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const strategy = findStrategy(url);

  if (!strategy) return; // No strategy = passthrough to network

  switch (strategy.strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request, strategy));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request, strategy));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request, strategy));
      break;
    case 'cache-only':
      event.respondWith(cacheOnly(event.request, strategy));
      break;
    case 'network-only':
      event.respondWith(fetch(event.request));
      break;
  }
});

// ============================================================
// STRATEGIES
// ============================================================

function cacheName(strategy) {
  return `${CACHE_PREFIX}${strategy.name}-${CACHE_VERSION}`;
}

function isExpired(response, maxAge) {
  if (!maxAge) return false;
  const date = response.headers.get('date');
  if (!date) return false;
  return (Date.now() - new Date(date).getTime()) > maxAge;
}

async function cacheFirst(request, strategy) {
  const cache = await caches.open(cacheName(strategy));
  const cached = await cache.match(request);
  if (cached && !isExpired(cached, strategy.maxAge)) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    if (cached) return cached; // Serve stale if network fails
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, strategy) {
  const cache = await caches.open(cacheName(strategy));
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, strategy) {
  const cache = await caches.open(cacheName(strategy));
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

async function cacheOnly(request, strategy) {
  const cache = await caches.open(cacheName(strategy));
  const cached = await cache.match(request);
  return cached || new Response('Not in cache', { status: 404 });
}

// ============================================================
// HELPERS
// ============================================================

function findStrategy(url) {
  for (const s of strategies) {
    if (typeof s.matcher === 'string') {
      if (url.includes(s.matcher)) return s;
    } else if (s.matcher instanceof RegExp) {
      if (s.matcher.test(url)) return s;
    }
  }
  return null;
}
