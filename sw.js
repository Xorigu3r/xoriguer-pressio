// XoriguerPressió · funcionament sense connexió
// Quan canviïs l'app, puja el número de versió perquè els mòbils agafin la nova.
const VERSION = "xoriguerpressio-v5-icones";
const APP = [
  "./", "index.html", "manifest.json", "css/app.css", "marca/marca.css", "marca/Montserrat-ExtraBold.ttf", "js/rules.js", "js/app.js",
  "vendor/fonts/pjs-400.woff2", "vendor/fonts/pjs-600.woff2", "vendor/fonts/pjs-700.woff2", "vendor/fonts/pjs-800.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
  "icons/apple-touch-icon.png", "icons/logo-informe.png", "icons/mark-256.png", "icons/favicon-64.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    // Només esborra versions velles d'AQUESTA app: el domini xorigu3r.github.io el comparteixen altres apps Xoriguer.
    .then(keys => Promise.all(keys.filter(k => k.startsWith("xoriguerpressio-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Pàgina i codi propi: primer internet (per rebre actualitzacions), si no, la còpia guardada
  if (req.mode === "navigate" || /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith("/")) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
    );
    return;
  }
  // Icones i fonts: primer la còpia guardada
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return res;
  })));
});
