// ── SERVICE WORKER — Financial Routine ───────────────────────────────────────
// Mantém o app funcionando offline e dispara notificações de tarefas
// mesmo com a aba em segundo plano

var CACHE_NAME = 'djf-cache-v42';
var ASSETS = [
  '/',
  '/index.html',
  '/js/charts.js',
  '/js/page-tarefas.js',
  '/js/page-estoque.js',
  '/js/page-auditoria.js',
  '/js/page-ajuda.js',
  '/js/page-usuarios.js',
  '/js/page-recorrencias.js',
  '/js/page-caixa.js',
  '/js/page-patrimonio.js',
];

// ── INSTALL: cacheia o app ────────────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).catch(function() {});
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpa caches antigos ───────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// ── FETCH: cache-first para assets, network-first para Firebase ───────────────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // Firebase e APIs externas: sempre rede
  if (url.includes('firebaseio.com') || url.includes('open-meteo') || url.includes('nominatim')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (response && response.status === 200 && e.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() { return cached; });
    })
  );
});

// ── MENSAGENS da página → SW ──────────────────────────────────────────────────
self.addEventListener('message', function(e) {
  if (!e.data) return;

  // Recebe lista de tarefas para checar e disparar notificação do SW
  if (e.data.tipo === 'checar-tarefas') {
    var tarefas = e.data.tarefas || [];
    var agora = Date.now();
    tarefas.forEach(function(t) {
      if (!t || t.status !== 'pendente' || !t.data) return;
      var venc = t.hora
        ? new Date(t.data + 'T' + t.hora + ':00').getTime()
        : new Date(t.data + 'T23:59:59').getTime();
      var lemMs = (t.lembrete_antecipado || 0) * 60000;
      var disparo = venc - lemMs;
      // Dentro da janela: já passou do horário mas com menos de 5 minutos de atraso
      if (agora >= disparo && agora <= disparo + 300000 && !t.notificado) {
        self.registration.showNotification('⏰ ' + t.titulo, {
          body: t.descricao || ('Compromisso agendado para ' + t.data + (t.hora ? ' às ' + t.hora : '')),
          icon: '/icons/icon.svg',
          badge: '/icons/icon.svg',
          tag: 'djf-tarefa-' + t.id,
          requireInteraction: true,
          actions: [
            { action: 'concluir', title: '✅ Concluir' },
            { action: 'dispensar', title: '⏭ Dispensar' },
          ],
        });
      }
    });
  }

  // Skip waiting (atualização imediata)
  if (e.data.tipo === 'skip-waiting') {
    self.skipWaiting();
  }
});

// ── CLIQUE NA NOTIFICAÇÃO ─────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      if (clients.length > 0) {
        clients[0].focus();
        clients[0].postMessage({ tipo: 'abrir-tarefas' });
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
