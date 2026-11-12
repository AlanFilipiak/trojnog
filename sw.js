/* Trójnóg – praca bez internetu: pliki aplikacji w pamięci telefonu, nowa wersja pobiera się sama. */
const VER = '12.5-1794509279';
const FILES = ["./", "agnus.png", "app.js", "data.js", "fonts/OFL-Cinzel.txt", "fonts/OFL-EB-Garamond.txt", "fonts/cinzel-latin-700-normal.woff2", "fonts/cinzel-latin-ext-700-normal.woff2", "fonts/eb-garamond-latin-500-normal.woff2", "fonts/eb-garamond-latin-600-normal.woff2", "fonts/eb-garamond-latin-ext-500-normal.woff2", "fonts/eb-garamond-latin-ext-600-normal.woff2", "icon-180.png", "icon-192.png", "icon-512.png", "index.html", "kalendarz.js", "kasa.js", "katechezy.js", "konto.js", "krzyz.png", "lib/LICENSE-pdfjs.txt", "lib/jsQR.js", "lib/leaflet/images/layers-2x.png", "lib/leaflet/images/layers.png", "lib/leaflet/images/marker-icon-2x.png", "lib/leaflet/images/marker-icon.png", "lib/leaflet/images/marker-shadow.png", "lib/leaflet/leaflet.css", "lib/leaflet/leaflet.js", "lib/pdf.min.js", "lib/pdf.worker.min.js", "lib/qrcode.js", "rozpiska.js", "shim.js", "spiewnik.js", "style.css", "witraz.png", "wyglad.js", "zdjecia.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open('trojnog-' + VER).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('trojnog-') === 0 && k !== 'trojnog-' + VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});
