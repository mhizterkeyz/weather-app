const CACHENAME = "staticv3";

//  Cache data and skip waiting
self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches
      .open(CACHENAME)
      .then((cache) => {
        return cache.addAll([
          "./",
          "./css/main.css",
          "./css/normalize.css",
          "./img/close-btn.svg",
          "./img/close-btn-dark.svg",
          "./img/cloud.svg",
          "./img/hambuger.svg",
          "./img/humid.svg",
          "./img/map-marker.svg",
          "./img/rain.svg",
          "./img/search.svg",
          "./img/sun.svg",
          "./img/wave.svg",
          "./img/weather-icon.svg",
          "./img/wind.svg",
          "./js/main.js",
          "./js/plugins.js",
        ]);
      })
      .then(() => self.skipWaiting())
  );
});

//  Delete and claim clients
self.addEventListener("activate", (ev) => {
  const currentCaches = [CACHENAME];
  ev.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        cacheNames.filter((cachename) => !currentCaches.includes(cachename))
      )
      .then((todelete) =>
        Promise.all(todelete.map((item) => caches.delete(item)))
      )
      .then(() => self.clients.claim())
  );
});

//  Capture requests and cache
self.addEventListener("fetch", (ev) => {
  ev.respondWith(
    caches.match(ev.request).then(async (res) => {
      if (res) {
        fetch(ev.request)
          .then((data) => {
            if (data.status >= 400) {
              return;
            }
            caches.open(CACHENAME).then((cache) => {
              cache.put(ev.request, data);
            });
          })
          .catch((e) => {
            /**Do nothing just revalidating.*/
          });
        return res;
      }
      try {
        const staticData = await fetch(ev.request);
        const responseClone = staticData.clone();
        caches.open(CACHENAME).then((cache) => {
          cache.put(ev.request, responseClone);
        });
        return staticData;
      } catch (error) {
        return fetch(ev.request);
      }
    })
  );
});
