'use strict';

// prepare-release injects the complete content-derived build and local file list.
// The source template remains inert when dist is served directly for development.
const BUILD_VERSION = 'c00614f72065c691aac36fbbfeae32fb16fead1c700b18cf22f12e33e1f4dc25';
const ASSET_PATHS = ["./app.js","./art.js","./assets/agents/astra-thumb.webp","./assets/agents/breach-thumb.webp","./assets/agents/brimstone-thumb.webp","./assets/agents/chamber-thumb.webp","./assets/agents/clove-thumb.webp","./assets/agents/cypher-thumb.webp","./assets/agents/deadlock-thumb.webp","./assets/agents/fade-thumb.webp","./assets/agents/gekko-thumb.webp","./assets/agents/harbor-thumb.webp","./assets/agents/hush-thumb.webp","./assets/agents/iso-thumb.webp","./assets/agents/jett-thumb.webp","./assets/agents/kayo-thumb.webp","./assets/agents/killjoy-thumb.webp","./assets/agents/miks-thumb.webp","./assets/agents/neon-thumb.webp","./assets/agents/omen-thumb.webp","./assets/agents/phoenix-thumb.webp","./assets/agents/raze-thumb.webp","./assets/agents/reyna-thumb.webp","./assets/agents/sage-thumb.webp","./assets/agents/skye-thumb.webp","./assets/agents/sova-thumb.webp","./assets/agents/tejo-thumb.webp","./assets/agents/veto-thumb.webp","./assets/agents/viper-thumb.webp","./assets/agents/vyse-thumb.webp","./assets/agents/waylay-thumb.webp","./assets/agents/yoru-thumb.webp","./assets/favicon.svg","./data.js","./home.js","./index.html","./manifest.webmanifest","./persistence.js","./pwa.js","./quiz.js","./session.js","./share-card.js","./style.css"];
const ASSET_HASHES = {"./app.js":"586155ad95c9ee301c6a9ab6c1aac37185323f3b0bb27538414a8fdf4f4c41d0","./art.js":"47a5447146dfc604430632685beb2cc14b294502bc3e3a64a981afe4401d060b","./assets/agents/astra-thumb.webp":"400320b7eaaea2f1ad0926a9e24dfc893ad9172b2c15effbed8fa07e3c1c4a08","./assets/agents/breach-thumb.webp":"137392403086883239a167117d48fe382101062223ee722d828db4b82a427c27","./assets/agents/brimstone-thumb.webp":"a627bca8ea3e2ceb226818f2b5c8d05ddd5102a796a99af5572fcffab250661b","./assets/agents/chamber-thumb.webp":"887f91ee016724fbba2b4d9be9df4185d3ef485d7543fa38dbb2de90513feff9","./assets/agents/clove-thumb.webp":"29aeb46fd350832cfab1e4357b9433d9374c266a924202c3fdcbc54b7f559a3b","./assets/agents/cypher-thumb.webp":"bb341c3de33ca701a8af616f9b7acdb73f2c7fbc15220b2417f7ab5c002f1692","./assets/agents/deadlock-thumb.webp":"fa97373fefde8f0b1f50a2bc3b0eb5733f9abdd14d7eea43ffd3252aaf00f0e8","./assets/agents/fade-thumb.webp":"2975cacd3d44aafe2e1ca096093d236739dca01ecb44529a8d213fdde15c20a0","./assets/agents/gekko-thumb.webp":"accf20e88fc5826c91c84562161c776447d77f9e01e965713bdc36c89b480899","./assets/agents/harbor-thumb.webp":"7f20e35d0260e1eda54fbe57236ae61e87f4c53e02fa44593a32c67810b1053f","./assets/agents/hush-thumb.webp":"b6ea21555bb99996929f30bde86f8f6054fac5f11146b98aaf1d5dc583cc68f1","./assets/agents/iso-thumb.webp":"05a56482882b9fc69df4014259da0b898cdc4cf033a80469a384e7ab32ace6e6","./assets/agents/jett-thumb.webp":"d6150d798292f350f47b38e2fa6bc718447336c5065c729085a164e38fa01411","./assets/agents/kayo-thumb.webp":"8946e6b6e2aafacdbf9311043f6f7bc95855ea2bae6325784368a5912cb58163","./assets/agents/killjoy-thumb.webp":"b35acc353db3e0aad2a2857aaa3bbc27909f7c4563dfccc0701bf5ab0a4869c0","./assets/agents/miks-thumb.webp":"824a2995321c394cf4dda1409b1548d317589498d87bccb1d6b63153b3dd30e2","./assets/agents/neon-thumb.webp":"f5bf14a31301cf4b6ee16e1356bc06b67b191c88915bc918e0cfddbf3f9ecfff","./assets/agents/omen-thumb.webp":"60e8dccd73b0c595033ad70fa3deed0d69a7ad924eb95ab3b0c73cf1f88c67ea","./assets/agents/phoenix-thumb.webp":"7f603911a3f9f182b3e1e7e653e8b57840b01bd812e06a965fbaaba95b69e2f8","./assets/agents/raze-thumb.webp":"e5df45c1ad62ea864334cf0d2da83307f1ce59cf5ace2c94ee344e5d3df34636","./assets/agents/reyna-thumb.webp":"57fa46027c5cad634076334e1fb015850b6371dabef3314b34824dfe06bb256d","./assets/agents/sage-thumb.webp":"3f3f31406dae0a43b18be56e3bf40e7bc268a140a0e5a83bed78cd3e20dadce8","./assets/agents/skye-thumb.webp":"f8bbfd1f0e534078a11b0d1098316eed31d4570ec3b7d3100ca13a3afc628c3e","./assets/agents/sova-thumb.webp":"2f26e6f95333a8e35c0c14fe92871acd8426e2c1f0782f4f80e2a3790dd32ad0","./assets/agents/tejo-thumb.webp":"6194914aa670c412e365c6e38451fcadb4d55aa26a13f147cbd484679b91e94d","./assets/agents/veto-thumb.webp":"6bc64d1ccbade69e0bb92c47dd363aec52c18d322b5fd20135c83208bce217d5","./assets/agents/viper-thumb.webp":"f87bc56d106cd9a3abe23fb425b85641867e86bf86a9b93d30c383bec21fe5b5","./assets/agents/vyse-thumb.webp":"dcf5ca25767df93a420df537fdfdde2fc7978eba308afb0212b37fc799cc9e7e","./assets/agents/waylay-thumb.webp":"e10b52107dd7caa586bd9ce3d32a528c15e9b7995a943026d9fa29436e8d0a83","./assets/agents/yoru-thumb.webp":"1491894e59e5e31779f1885d1f5491fa2c81416464b6a4ccd1c5bcbe39e4a9ed","./assets/favicon.svg":"40658b2b7a925e0bf29a479c036826573c8b9b7eaf931c87b36970819e8acc2d","./data.js":"5d82826e9b07b58c79273a826d8a6517606d15dadc63e92abfb13ffbcdafb596","./home.js":"5d10debd9fdfb7c5b3facbd5cc1b15da963926cae95dadff343d2f52ea3a6d71","./index.html":"3a20feb98c911a4f8b901a74bf4540813e6af04e85ec8624b3e6986654de3cb3","./manifest.webmanifest":"468eb08bec0f7b507bb6b7d456d5014c21216115ec387006067373c15f395c34","./persistence.js":"af277bb00eec8347404a2df5221cf2800f5f4255a2b013751a09563ce85db0cc","./pwa.js":"79e93ac87cf1c2974a3d162ad0c2c84da63e87eee994033b833d02f726fc4614","./quiz.js":"db3b21a239faf49d57ccceb9347f099679368214e3b3b8c0d387426360f8676e","./session.js":"bc1ff206b51f2dcb03434066e345a54cb6995aa02f430d6919fb127e7c9c6c71","./share-card.js":"1790e63d6b799b4559bbf282f756978389f037e25eaee5e63eb4c8caef9aa3ab","./style.css":"8222d48508cfb9240196f99b606d548856066ab06eeb99e77f506ef32a0617b3"};
const PREPARED = /^[a-f0-9]{64}$/.test(BUILD_VERSION);
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `agent-file:${encodeURIComponent(SCOPE.href)}:`;
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_VERSION}`;
const INDEX_URL = new URL('./index.html', SCOPE).href;
const ASSET_URLS = ASSET_PATHS.map(path => new URL(path, SCOPE));
const VALID_ALLOWLIST = ASSET_URLS.every((url, index) => url.origin === SCOPE.origin && url.pathname.startsWith(SCOPE.pathname) && !url.search && !url.hash && /^[a-f0-9]{64}$/.test(ASSET_HASHES[ASSET_PATHS[index]] || ''));
const ALLOWLIST = new Set(ASSET_URLS.map(url => url.href));
const INTEGRITY = new Map(ASSET_URLS.map((url, index) => [url.href, ASSET_HASHES[ASSET_PATHS[index]]]));

async function validResponse(response, url) {
  if (!response || response.status !== 200 || response.type === 'opaque' || response.redirected) return false;
  if (response.url && new URL(response.url).origin !== SCOPE.origin) return false;
  const type = response.headers.get('Content-Type') || '';
  if (/\.(?:m?js)$/i.test(new URL(url).pathname)) {
    if (!/(?:java|ecma)script/i.test(type)) return false;
    // Some static hosts return their HTML fallback with a misleading JS MIME.
    const body = (await response.clone().text()).trimStart();
    if (/^(?:<!doctype\s+html|<html(?:\s|>))/i.test(body)) return false;
  }
  const expected = INTEGRITY.get(url);
  if (!expected) return false;
  const hash = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  const actual = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return actual === expected;
}

async function completeCache() {
  if (!(await caches.has(CACHE_NAME))) return false;
  const cache = await caches.open(CACHE_NAME);
  for (const url of ALLOWLIST) {
    if (!(await validResponse(await cache.match(url), url))) return false;
  }
  return true;
}

async function installSnapshot() {
  if (!VALID_ALLOWLIST || !ALLOWLIST.has(INDEX_URL) || ALLOWLIST.size === 0) throw new Error('Invalid local precache allowlist');
  // A fully installed identical content build is reusable. Never mutate it while
  // another worker of this same version might still be serving a client.
  if (await completeCache()) return;
  let newCacheOpened = false;
  try {
    // Download and validate the entire small app before opening a new cache.
    // Work is O(total asset bytes); there are no third-party or runtime packages.
    const resources = await Promise.all([...ALLOWLIST].map(async url => {
      const response = await fetch(url, { cache: 'reload', credentials: 'same-origin', redirect: 'error' });
      if (!(await validResponse(response, url))) throw new Error(`Invalid precache response: ${url}`);
      return [url, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    newCacheOpened = true;
    for (const [url, response] of resources) await cache.put(url, response);
  } catch (error) {
    if (newCacheOpened) await caches.delete(CACHE_NAME);
    throw error;
  }
}

self.addEventListener('install', event => {
  if (PREPARED) event.waitUntil(installSnapshot());
  // skipWaiting is intentionally only invoked after the page's update button.
});

self.addEventListener('activate', event => {
  if (!PREPARED || !VALID_ALLOWLIST) return;
  event.waitUntil((async () => {
    if (!(await completeCache())) return;
    // Other applications and other subdirectory deployments keep their caches.
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (PREPARED && event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

async function networkWithTimeout(request) {
  const controller = new AbortController();
  let timeout;
  const deadline = new Promise((resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Navigation timeout'));
    }, 3000);
  });
  try {
    return await Promise.race([
      fetch(request, { signal: controller.signal, cache: 'no-cache', credentials: 'same-origin', redirect: 'error' }),
      deadline,
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function navigationResponse(request) {
  try {
    const response = await networkWithTimeout(request);
    if (response.status !== 200 || !/text\/html/i.test(response.headers.get('Content-Type') || '')) throw new Error('Invalid navigation response');
    const html = await response.clone().text();
    const match = html.match(/<meta\s+name=["']puppy-build-version["']\s+content=["']([a-f0-9]{64})["']\s*\/?>/i);
    // A waiting update must not mix its new HTML with the active worker's old
    // cache-first modules. Only a coherent current-build network shell is used.
    if (match?.[1] !== BUILD_VERSION) throw new Error('Navigation build differs from active worker');
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(INDEX_URL)) || Response.error();
  }
}

async function staticResponse(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  try {
    const response = await fetch(request, { credentials: 'same-origin', redirect: 'error' });
    if (!(await validResponse(response, request.url))) return Response.error();
    // A quota error should not turn a successfully downloaded static file into
    // a page failure. The next request can attempt to refill this cache entry.
    try { await cache.put(request.url, response.clone()); } catch { /* CacheStorage may be full or unavailable. */ }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  if (!PREPARED || !VALID_ALLOWLIST || event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Exact URL matching also excludes query-bearing account or token requests.
  if (url.origin !== SCOPE.origin || url.search || url.hash) return;
  const navigation = event.request.mode === 'navigate';
  if (navigation && (url.href === SCOPE.href || url.href === INDEX_URL) && ALLOWLIST.has(INDEX_URL)) {
    event.respondWith(navigationResponse(event.request));
  } else if (!navigation && ALLOWLIST.has(url.href)) {
    event.respondWith(staticResponse(event.request));
  }
});
