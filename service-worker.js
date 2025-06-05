/*
  service-worker.js – ToolsApp 2.0
  -------------------------------------------------------------------
  Basic offline support:
    • Pre-caches core HTML, CSS, JS and icon assets on install
    • Cleans up old caches on activate
    • Cache-first strategy for same-origin GET requests
    • Network-first fallback for navigation requests (HTML pages)
*/

const CACHE_VERSION = 'v1';
const CACHE_NAME = `toolsapp-${CACHE_VERSION}`;

// Core assets – update this list when adding new top-level pages or major files
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/payslip.html',
  '/tax.html',
  '/loan.html',
  '/budget.html',
  '/retirement.html',
  '/invoice.html',
  '/converters.html',
  '/assets/css/styles.css',
  '/assets/css/components.css',
  '/assets/js/main.js',
  '/assets/js/payslip.js',
  '/assets/js/taxCalculator.js',
  '/assets/js/loanCalculator.js',
  '/assets/js/budgetPlanner.js',
  '/assets/js/retirementPlanner.js',
  '/assets/js/invoiceGenerator.js',
  '/assets/js/converters.js',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Skip waiting so the SW activates immediately after install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('toolsapp-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only handle same-origin GET requests
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // For navigation requests (HTML pages) – network-first then cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Stash a copy for offline use
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For other assets – cache-first strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache fetched file for next time
        const respClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
        return response;
      });
    })
  );
});
