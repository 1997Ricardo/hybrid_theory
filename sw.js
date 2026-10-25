
// ======================================================
// HYBRID THEORY
// Training System — Service Worker
// ======================================================

// Cambiar la versión cuando se actualicen los recursos
// o se modifique el comportamiento de la aplicación.
const CACHE_NAME = 'hybrid-theory-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// ======================================================
// INSTALACIÓN
// ======================================================

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ======================================================
// ACTIVACIÓN
// Eliminar las cachés antiguas de esta aplicación.
// ======================================================

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                const oldCaches = cacheNames.filter(
                    (name) =>
                        name.startsWith('lionbeat-performance-') ||
                        name.startsWith('hybrid-theory-')
                        ? name !== CACHE_NAME
                        : false
                );

                return Promise.all(
                    oldCaches.map((name) => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// ======================================================
// PETICIONES
// Solo gestionar GET del mismo origen.
// ======================================================

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // No interceptar peticiones a otros dominios.
    if (url.origin !== self.location.origin) {
        return;
    }

    // No almacenar respuestas de API en la caché estática.
    // Ajusta esta condición si tu API usa otra ruta.
    if (url.pathname.includes('/api/')) {
        return;
    }

    // Para páginas HTML, priorizar la versión de la red.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.ok) {
                        const responseCopy = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put('./index.html', responseCopy);
                            })
                            .catch(() => {});
                    }

                    return response;
                })
                .catch(async () => {
                    return (
                        await caches.match('./index.html')
                    ) || Response.error();
                })
        );

        return;
    }

    // Para otros recursos: red primero y caché como alternativa.
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response && response.ok) {
                    const responseCopy = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseCopy);
                        })
                        .catch(() => {});
                }

                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(request);

                return cachedResponse || Response.error();
            })
    );
});
