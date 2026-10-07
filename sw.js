const CACHE='ma-jt16-pwa-v0.5.6-signal';
const APP_SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(APP_SHELL.map(path=>new Request(path,{cache:'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    const upgrading=keys.some(k=>k.startsWith('ma-jt16-pwa-') && k!==CACHE);
    await Promise.all(keys.filter(k=>k.startsWith('ma-jt16-pwa-') && k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    // A korábbi verzióban nincs controllerchange-handler: azt is frissítjük.
    if(upgrading){
      const tabs=await self.clients.matchAll({type:'window'});
      await Promise.all(tabs.filter(c=>c.url.startsWith(self.registration.scope)).map(c=>c.navigate(c.url).catch(()=>{})));
    }
  })());
});
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(u.origin!==self.location.origin || event.request.method!=='GET') return;
  // Telemetry és az SW-script sosem kerül app-shell cache-be.
  if(u.pathname.endsWith('/sw.js')) return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(new Request(event.request,{cache:'no-store'}));
      if(response.ok){ const cache=await caches.open(CACHE); await cache.put(event.request,response.clone()); }
      return response;
    }catch(error){
      const cache=await caches.open(CACHE);
      const cached=await cache.match(event.request);
      if(cached) return cached;
      if(event.request.mode==='navigate'){
        const shell=await cache.match('./index.html');
        if(shell) return shell;
      }
      throw error;
    }
  })());
});
