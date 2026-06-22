/**
 * CzechMaster — Service Worker
 * ===============================
 * Offline rejimni ta'minlash uchun fayllarni keshlaydi (Cache First strategiyasi).
 */
'use strict';

const CACHE_NAME = 'czechmaster-v1.0.0';
const CACHE_ASSETS = [
  './',
  './index.html',
  './lesson.html',
  './css/variables.css',
  './css/style.css',
  './css/components.css',
  './css/dashboard.css',
  './css/lesson.css',
  './js/app.js',
  './js/progress.js',
  './js/search.js',
  './js/theme.js',
  './js/quiz.js',
  './js/flashcard.js',
  './js/audio.js',
  './js/listening.js',
  './js/speaking.js',
  './js/writing.js',
  './js/certificate.js',
  './js/achievements.js',
  './js/toast.js',
  './js/lesson-engine.js',
  './data/curriculum.json',
  './data/vocabulary.json',
  './data/achievements.json',
  './data/listening.json',
  './data/speaking.json',
  './data/writing.json',
  './manifest.json'
];

/** Install — fayllarni keshga oldindan yuklaydi */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('SW cache xatolik:', err))
  );
});

/** Activate — eski keshlarni tozalaydi */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

/** Fetch — Cache First, keyin Network fallback */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then(networkResponse => {
          // Faqat muvaffaqiyatli javoblarni keshlash
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline va keshda yo'q — agar HTML so'ralgan bo'lsa, asosiy sahifani qaytarish
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
    })
  );
});
