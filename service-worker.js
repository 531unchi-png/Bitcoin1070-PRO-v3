// Bitcoin1070 PRO Service Worker v10.3
const CACHE_NAME = 'bitcoin1070-pro-v10-3';
const APP_FILES = [
  './','./index.html','./doubling-navi.html','./future-simulator.html','./market.html','./portfolio.html','./portfolio-edit.html','./analysis.html','./news.html','./settings.html','./cycle1070.html',
  './style.css','./doubling-navi.js','./future-simulator.js','./app-shell.js','./asset-master.js','./asset-editor-page.js','./cycle1070.js','./score1070.js','./news-center.js','./storage.js','./stocks.js','./chart.js','./portfolio.js','./editor.js',
  './analytics.js','./technical.js','./monitoring.js','./script.js','./manifest.json','./icon-192.png','./icon-512.PNG'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  })));
});
