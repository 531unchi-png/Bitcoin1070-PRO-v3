// =====================================
// Bitcoin1070 PRO Service Worker v5.1
// =====================================

const CACHE_NAME =
    "bitcoin1070-pro-v5-1";

const APP_FILES = [
    "./",
    "./index.html",
    "./portfolio-edit.html",
    "./analysis.html",
    "./style.css",
    "./storage.js",
    "./stocks.js",
    "./chart.js",
    "./portfolio.js",
    "./editor.js",
    "./asset-editor-page.js",
    "./analytics.js",
    "./technical.js",
    "./monitoring.js",
    "./script.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.PNG"
];

// アプリファイルを保存
self.addEventListener(
    "install",
    event => {
        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(APP_FILES)
                )
        );

        self.skipWaiting();
    }
);

// 古いキャッシュを削除
self.addEventListener(
    "activate",
    event => {
        event.waitUntil(
            caches
                .keys()
                .then(cacheNames =>
                    Promise.all(
                        cacheNames
                            .filter(
                                name =>
                                    name !==
                                    CACHE_NAME
                            )
                            .map(
                                name =>
                                    caches.delete(
                                        name
                                    )
                            )
                    )
                )
        );

        self.clients.claim();
    }
);

// 通信優先、失敗時は保存データ
self.addEventListener(
    "fetch",
    event => {
        if (
            event.request.method !== "GET"
        ) {
            return;
        }

        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const copy =
                        response.clone();

                    caches
                        .open(CACHE_NAME)
                        .then(cache =>
                            cache.put(
                                event.request,
                                copy
                            )
                        );

                    return response;
                })
                .catch(() =>
                    caches.match(
                        event.request
                    )
                )
        );
    }
);
