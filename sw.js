const CACHE='fly-eye-runtime-v0.4.2';
const ASSET_PREFIXES=['/vendor/mediapipe/','/data/brain/','/data/escape-v1/'];

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('fly-eye-runtime-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  if(!ASSET_PREFIXES.some(prefix=>url.pathname.startsWith(prefix))) return;

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request);
    if(cached) return cached;
    const response=await fetch(event.request);
    if(response.ok) cache.put(event.request,response.clone());
    return response;
  })());
});
