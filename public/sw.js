/* Service worker FiltroPro — fonctionnement hors-ligne.
   Stratégies :
   - App (HTML/JS/CSS, même origine) : stale-while-revalidate (UI dispo hors-ligne).
   - Données Supabase (GET) : network-first + repli cache (dernières données chargées).
   - Images produits (Scene7 / Unsplash) : cache-first (photos dispo hors-ligne).
   - Écritures (POST/PATCH/DELETE) : réseau direct (échec si hors-ligne -> à gérer côté app).
*/
const VERSION = "v8";
const STATIC = "fp-static-" + VERSION;
const DATA = "fp-data-" + VERSION;
const IMG = "fp-img-" + VERSION;
const TILES = "fp-tiles-" + VERSION;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => ![STATIC, DATA, IMG, TILES].includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // --- Pages SEO toujours fraîches (jamais interceptées) : catalogue Google /c/,
  //     sitemap, robots. (/catalogue et /tarif, eux, sont des pages « app » : on met
  //     leur shell en cache comme le reste → ouverture instantanée et hors-ligne.) ---
  if (url.origin === self.location.origin &&
      (url.pathname === "/c" || url.pathname.startsWith("/c/") ||
       url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt")) return;

  // --- Données Supabase : network-first AVEC timeout court ---
  //     Sur réseau lent (3G Maroc), attendre le réseau à chaque requête rend l'app
  //     poussive. Ici : si le réseau ne répond pas sous ~2 s et qu'on a une copie en
  //     cache, on sert le cache TOUT DE SUITE et on met à jour en arrière-plan.
  //     Réseau rapide → données fraîches ; hors-ligne → instantané depuis le cache.
  if (url.hostname.endsWith(".supabase.co")) {
    if (req.method !== "GET") return; // écritures : laisser passer (réseau)
    event.respondWith((async () => {
      const cache = await caches.open(DATA);
      const cached = await cache.match(req);
      const net = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) {
        const timeout = new Promise((r) => setTimeout(() => r(null), 2000));
        const winner = await Promise.race([net, timeout]);
        if (winner) return winner;          // réseau assez rapide (ou erreur rapide → null → on tombe plus bas)
        event.waitUntil(net);               // réseau lent : on continue de rafraîchir le cache en fond
        return cached;                      // et on sert le cache maintenant
      }
      const res = await net;
      return res || new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    })());
    return;
  }

  // --- Tuiles de carte OpenStreetMap (cache-first : carte dispo hors-ligne sur les zones déjà vues) ---
  if (req.method === "GET" && url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // --- Images produits (cache-first) ---
  if (req.method === "GET" && (url.hostname.includes("scene7.com") || url.hostname.includes("images.unsplash.com"))) {
    event.respondWith((async () => {
      const cache = await caches.open(IMG);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // --- App (même origine, GET) : stale-while-revalidate ---
  if (url.origin === self.location.origin && req.method === "GET") {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC);
      const cached = await cache.match(req);
      const fetching = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(fetching); return cached; }
      const res = await fetching;
      if (res) return res;
      if (req.mode === "navigate") {
        const fallback = (await cache.match("/")) || (await cache.match("/produits"));
        if (fallback) return fallback;
      }
      return new Response("Hors ligne", { status: 503, headers: { "Content-Type": "text/plain" } });
    })());
  }
});
