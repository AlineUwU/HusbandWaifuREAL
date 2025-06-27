const CACHE_NAME = "husbandwaifu-cache-v1";
const urlsToCache = [
  "/HusbandWaifuREAL/",
  "/HusbandWaifuREAL/index.html",
  "/HusbandWaifuREAL/styles.css",
  "/HusbandWaifuREAL/script.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.error("❌ Error al agregar archivos al caché:", error);
      });
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
