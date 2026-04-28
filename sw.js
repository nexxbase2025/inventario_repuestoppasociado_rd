
const CACHE = "rppa-inventory-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./item.html",
  "./css/styles.css",
  "./js/utils.js",
  "./js/db.js",
  "./js/app.js",
  "./js/item.js",
  "./manifest.json",
  "./assets/logo.jpeg",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
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
    const cached = await caches.match(req);
    if(cached) return cached;

    try{
      const fresh = await fetch(req);
      const url = new URL(req.url);
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