// ALOCO — Service Worker do painel (offline-shell + instalável)
var CACHE = 'aloco-painel-v1';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ self.clients.claim(); });
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;               // POST (agendar) sempre na rede
  e.respondWith(
    fetch(e.request).then(function(r){
      var copy = r.clone();
      caches.open(CACHE).then(function(c){ c.put(e.request, copy); }).catch(function(){});
      return r;
    }).catch(function(){ return caches.match(e.request); })
  );
});
