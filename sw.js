const CACHE = "rppa-inventory-v6-firestore-auth";
const ASSETS = [
  "./",
  "./index.html",
  "./item.html",
  "./css/styles.css",
  "./js/utils.js",
  "./js/db.js",
  "./js/firebase-storage.js",
  "./js/app.js",
  "./js/item.js",
  "./manifest.json?v=2",
  "./assets/logo.jpeg",
  "./assets/icon-192-v2.png",
  "./assets/icon-512-v2.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e)=>{
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e)=>{
  const req = e.request;
  if(req.method !== "GET") return;

  e.respondWith((async ()=>{
    const url = new URL(req.url);
    const isAppShell = req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/app.js") || url.pathname.endsWith("/firebase-storage.js") || url.pathname.endsWith("/styles.css");

    if(isAppShell){
      try{
        const fresh = await fetch(req, { cache: "no-store" });
        if(url.origin === location.origin){
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      }catch{
        return caches.match(req) || caches.match("./index.html");
      }
    }

    const cached = await caches.match(req);
    if(cached) return cached;

    try{
      const fresh = await fetch(req);
      if(url.origin === location.origin){
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    }catch{
      return caches.match("./index.html");
    }
  })());
});
