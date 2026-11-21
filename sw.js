/*
 * 학급 대시보드 — 오프라인 대비
 * 한 번 열어 두면 교실 인터넷이 끊겨도 저장해 둔 화면으로 열린다.
 * 파일을 고쳐 올릴 때는 CACHE 끝 숫자와, index.html·아래 목록의 ?v= 숫자를 함께 올린다.
 */
const CACHE = 'class-dashboard-v3';
const FONT_CACHE = 'class-dashboard-fonts-v1';
const ASSETS = [
  './',
  './index.html',
  './fonts/pretendard/pretendard.css?v=1',
  './css/style.css?v=2',
  './js/core/util.js?v=1',
  './js/core/korean.js?v=1',
  './js/core/store.js?v=1',
  './js/core/sound.js?v=1',
  './js/core/wheel.js?v=1',
  './js/core/ui.js?v=1',
  './js/app.js?v=1',
  './js/modules/home.js?v=1',
  './js/modules/timetable.js?v=1',
  './js/modules/notice.js?v=1',
  './js/modules/attendance.js?v=1',
  './js/modules/checks.js?v=1',
  './js/modules/reading.js?v=1',
  './js/modules/roles.js?v=1',
  './js/modules/students.js?v=2',
  './js/modules/notes.js?v=1',
  './js/modules/budget.js?v=1',
  './js/modules/events.js?v=1',
  './js/modules/links.js?v=1',
  './js/modules/games.js?v=1',
  './js/modules/pick.js?v=1',
  './js/modules/timer.js?v=1',
  './js/modules/settings.js?v=2',
  './js/start.js?v=1',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(cacheName, req, res) {
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(cacheName).then((c) => c.put(req, copy));
  }
  return res;
}

// 인터넷이 되면 새 파일, 3초 안에 답이 없거나 끊겨 있으면 저장해 둔 파일
function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (res) => { if (!done && res) { done = true; resolve(res); } };
    const fallback = () => caches.match(req, { ignoreSearch: req.mode === 'navigate' })
      .then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : null));
    const timer = setTimeout(() => fallback().then(finish), 3000);
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
      .then((res) => { clearTimeout(timer); put(CACHE, req, res); finish(res); })
      .catch(() => {
        clearTimeout(timer);
        fallback().then((r) => { finish(r || Response.error()); });
      });
  });
}

// 글꼴 조각은 바뀌지 않으므로 한 번 받은 것을 계속 쓴다.
function cacheFirst(req) {
  return caches.open(FONT_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => put(FONT_CACHE, req, res))));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.includes('/class-dashboard/') && url.hostname.endsWith('github.io')) return;
  if (url.pathname.endsWith('.woff2')) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkFirst(req));
});
