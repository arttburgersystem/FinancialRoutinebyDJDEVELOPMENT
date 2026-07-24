// ── SERVICE WORKER — Financial Routine ───────────────────────────────────────
// Mantém o app funcionando offline e dispara notificações de tarefas
// mesmo com a aba em segundo plano
//
// IMPORTANTE: todos os caminhos aqui são RELATIVOS (sem "/" no início).
// O site roda tanto em domínio raiz (Firebase Hosting) quanto em subpasta
// (GitHub Pages, ex: /FinancialRoutinebyDJDEVELOPMENT/) — caminhos absolutos
// como "/sw.js" ou "/index.html" quebram no GitHub Pages, pois resolvem pra
// raiz do domínio (github.io), não da subpasta do projeto.

var CACHE_NAME = 'djf-cache-v123';
var ASSETS = [
  '.',
  'index.html',
  'caixa.html',
  'requisicao.html',
  'manual.html',
  'relatorio-sistema.html',
  'manifest.json',
  'manifest-caixa.json',
  'manifest-requisicao.json',
  'icons/icon.svg',
  'icons/logo-ifood.jpg',
  'icons/logo-yooga.png',
  'js/background-sync.js',
  'js/charts.js',
  'js/import-yooga.js',
  'js/modal-adiantamento.js',
  'js/modal-banco.js',
  'js/modal-busca.js',
  'js/modal-categorias.js',
  'js/modal-cedulas.js',
  'js/modal-compra.js',
  'js/modal-estoque-item.js',
  'js/modal-estoque-mov.js',
  'js/modal-ficha-tecnica.js',
  'js/modal-lancamento.js',
  'js/modal-lembrete-compra.js',
  'js/modal-meta.js',
  'js/modal-orcamento.js',
  'js/modal-perfil.js',
  'js/modal-receita.js',
  'js/modal-transferencia.js',
  'js/page-administrador.js',
  'js/page-ajuda.js',
  'js/page-apostas.js',
  'js/page-auditoria.js',
  'js/page-caixa-diario.js',
  'js/page-caixa.js',
  'js/page-cardapio.js',
  'js/page-cartoes.js',
  'js/page-clientes.js',
  'js/page-compras.js',
  'js/page-daily.js',
  'js/page-dp.js',
  'js/page-dre.js',
  'js/page-empresa.js',
  'js/page-emprestimos.js',
  'js/page-estoque-insumos.js',
  'js/page-estoque.js',
  'js/page-fidelidade.js',
  'js/page-fiscal.js',
  'js/page-fornecedores.js',
  'js/page-freelancers.js',
  'js/page-funcionarios.js',
  'js/page-importar-extrato.js',
  'js/page-impressoes.js',
  'js/page-kds.js',
  'js/page-lista-compras.js',
  'js/page-manual.js',
  'js/page-mapa.js',
  'js/page-notas.js',
  'js/page-orcamento.js',
  'js/page-patrimonio.js',
  'js/page-pdv.js',
  'js/page-recorrencias.js',
  'js/page-requisicao.js',
  'js/page-tarefas.js',
  'js/page-usuarios.js',
  'js/page-vendas.js',
  'js/xlsx.min.js',
  'js/xlsx.mini.min.js',
];

// ── INSTALL: cacheia o app ────────────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // addAll é atômico (falha tudo se 1 arquivo falhar) — cacheia um por um
      // pra garantir que um caminho quebrado não derrube o precache inteiro.
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function() {});
      }));
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
          icon: 'icons/icon.svg',
          badge: 'icons/icon.svg',
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
        self.clients.openWindow('.');
      }
    })
  );
});
