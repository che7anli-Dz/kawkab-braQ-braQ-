/* كوكب برق برق — Service Worker */
var CACHE = 'kawkab-bb-v30';
var ASSETS = ['./', './index.html', './app.js?v=52', './app2.js?v=52', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* نخزن كل ملف وحدو باش ملف واحد فاشل ما يخربش الكل */
      return Promise.all(ASSETS.map(function (u) {
        return fetch(u).then(function (res) {
          if (res && res.ok) return c.put(u, res);
        }).catch(function () {});
      }));
    })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isPage(url) {
  return url.pathname === '/' || url.pathname.endsWith('/index.html') ||
    url.pathname === '/kawkab-braQ-braQ-/' || url.pathname.endsWith('/kawkab-braQ-braQ-/');
}

function isDocumentRequest(req) {
  return req.mode === 'navigate' ||
    (req.headers.get('accept') || '').indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  /* الصفحة: الشبكة أولا باش التحديثات توصل مباشرة */
  if (isPage(url)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || caches.match('./index.html'); });
      })
    );
    return;
  }
  /* الملفات (JS/CSS/صور): الكاش أولا، بصح عمري ما نرجع صفحة HTML
     بلاصة ملف JS — هاذي كانت تسبب شاشة بيضاء */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return res;
      }).catch(function () {
        /* غير لطلبات الصفحات نرجع index.html، أما السكريبتات نخليو الخطأ
           يبان باش المتصفح يعاود المحاولة بدل ما ينفذ HTML كـJS */
        if (isDocumentRequest(e.request)) return caches.match('./index.html');
        throw new Error('network-fail');
      });
    })
  );
});
