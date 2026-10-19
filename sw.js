const CACHE_NAME = 'wedding-offline-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './couple.jpg',
  './audio.mp3'
];

// 1. تثبيت النسخة الجديدة وحفظ ملفات الدعوة والموسيقى والصورة فوراً
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. مسح أي كاش قديم عالق من المرات السابقة تلقائياً
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// 3. نظام ذكي:
// - للموسيقى والصورة: يقرأها فوراً من ذاكرة الهاتف (0 ثانية بدون تأخير)
// - لصفحة الدعوة (index.html): يجلب أحدث تعديل من GitHub ويحفظه للاستخدام بدون نت
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // إذا كان الطلب لصفحة الدعوة نفسها: جلب الأحدث أولاً ثم حفظه في الكاش
  if (event.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // للموسيقى والصورة والخطوط: القراءة الفورية من ذاكرة الهاتف (0ms)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
