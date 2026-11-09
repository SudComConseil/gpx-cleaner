/* GPX Cleaner PWA 1.0.12 — cache uniquement les ressources de l'application.
   Les traces GPX et les données IndexedDB ne sont jamais mises en cache ici. */
const CACHE = 'gpx-cleaner-shell-v1-0-12';
const APP_SHELL = ['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const LIBRARY_HOSTS = new Set(['unpkg.com','cdnjs.cloudflare.com']);
const LIBRARIES = [
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
 'https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.0/leaflet-maplibre-gl.js',
 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(LIBRARIES.map(async url => {
      const response=await fetch(url,{mode:'cors'});
      if(response.ok) await cache.put(url,response);
    }));
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('gpx-cleaner-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin){
    if(url.pathname.endsWith('.gpx')||url.pathname.endsWith('.osf')) return;
    if(req.mode==='navigate'){
      event.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put('./index.html',copy)));}return response;}).catch(()=>caches.match('./index.html')));
      return;
    }
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)));}return response;})));
    return;
  }
  // Only cache JavaScript/CSS libraries required for offline GPX processing.
  // Map tiles, MapTiler keys, geodata and satellite imagery are NOT cached.
  if(LIBRARY_HOSTS.has(url.hostname) && /\.(js|css)(\?|$)/i.test(url.pathname)){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok||response.type==='opaque'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(req,copy)));}return response;})));
  }
});
