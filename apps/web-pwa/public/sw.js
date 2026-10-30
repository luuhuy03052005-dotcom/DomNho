/* ==========================================================================
   ĐỐM NHỎ — SERVICE WORKER (Web Push Notification & Offline Shell)
   Hỗ trợ thông báo đẩy khi đi vào bán kính 500m của Đốm Đỏ (Co-op Patrol)
   hoặc lịch nhắc "Chạm Ảnh Mỗi Tuần" (Weekly Memory Pact) trên iOS 16.4+ & Android.
   ========================================================================== */

const CACHE_NAME = 'dom-nho-pwa-v1';
const OFFLINE_ASSETS = ['/', '/manifest.json', '/icons/icon-192.svg'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Đốm Nhỏ • Tín Hiệu Quanh Bạn',
    body: 'Có một Đốm Đỏ cần sự giúp đỡ trong bán kính 500m quanh nơi bạn đang đi dạo.',
    url: '/',
    tag: 'dom-nho-patrol-alert',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      tag: payload.tag,
      vibrate: [120, 60, 120],
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })
  );
});

