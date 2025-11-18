// service-worker.js - Estrategia: Cache first para assets estáticos, Network-first para datos (si aplica)
const CACHE_NAME = 'gimcontrol-static-v1';
const DATA_CACHE_NAME = 'gimcontrol-data-v1';

const FILES_TO_CACHE = [
  '/', 
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
  // agregá más recursos aquí si necesitás (por ejemplo seeds, logo svg, otras páginas)
];

self.addEventListener('install', (evt) => {
  console.log('[SW] Install');
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evt) => {
  console.log('[SW] Activate');
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[SW] Removing old cache', key);
          return caches.delete(key);
        }
      })
    )).then(() => self.clients.claim())
  );
});

// Fetch handler
self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);

  // Si la petición es a nuestro dominio y parece ser API/datos -> network-first
  if (url.origin === location.origin && (evt.request.method === 'GET') && url.pathname.startsWith('/api')) {
    evt.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache =>
        fetch(evt.request)
          .then(response => {
            // Clona y guarda en cache
            if (response.status === 200) {
              cache.put(evt.request.url, response.clone());
            }
            return response;
          })
          .catch(() => cache.match(evt.request))
      )
    );
    return;
  }

  // Para otros recursos, cache-first
  evt.respondWith(
    caches.match(evt.request).then(response => {
      return response || fetch(evt.request).then(fetchRes => {
        // Opcional: cachear recursos obtenidos dinámicamente (font, images)
        return fetchRes;
      });
    }).catch(() => {
      // Fallback: si es navegación, devolver index.html para SPA
      if (evt.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
