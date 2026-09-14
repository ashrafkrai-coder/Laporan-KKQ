const CACHE='smart-kkq-laporan-v3';
const ASSETS=['/','/index.html','/styles.css','/app.js','/manifest.json',
  '/favicon.png','/apple-touch-icon.png',
  '/icons/icon-192.png','/icons/icon-512.png',
  '/icons/icon-maskable-192.png','/icons/icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(async c=>{
  await Promise.all(ASSETS.map(async asset=>{
    try { await c.add(asset); } catch (error) { console.warn('Aset cache gagal:', asset, error); }
  }));
})));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html'))));
});
