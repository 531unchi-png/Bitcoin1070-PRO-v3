// Bitcoin1070 PRO Service Worker v6.0
const CACHE_NAME="bitcoin1070-pro-v6-0";
const APP_FILES=["./", "./index.html", "./market.html", "./portfolio.html", "./portfolio-edit.html", "./analysis.html", "./news.html", "./settings.html", "./style.css", "./storage.js", "./stocks.js", "./chart.js", "./portfolio.js", "./editor.js", "./asset-editor-page.js", "./analytics.js", "./technical.js", "./monitoring.js", "./script.js", "./manifest.json", "./icon-192.png", "./icon-512.PNG"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_FILES)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ns=>Promise.all(ns.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n)))));self.clients.claim();});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request)));});
