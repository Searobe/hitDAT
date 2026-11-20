// Chạy không cần mạng, nhưng có mạng thì luôn lấy bản mới nhất:
// hỏi máy chủ trước (bỏ qua bộ nhớ đệm 10 phút của trình duyệt), quá 4 giây hoặc mất mạng thì dùng bản đã lưu.
// Số ở CACHE phải bằng VERSION trong app.js (có ca kiểm).
const CACHE = 'hitdat-12';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'program.js', 'legs.js', 'figures.js', 'progress.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-512.png'];
const TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    if (!hit) return fresh;
    fresh.catch(() => {}); // lỗi mạng đã có bản lưu đỡ
    const slow = new Promise((resolve) => setTimeout(() => resolve(hit), TIMEOUT));
    return Promise.race([fresh.catch(() => hit), slow]);
  })());
});
