// ── BACKGROUND SYNC — Financial Routine ──────────────────────────────────────
// Firebase polling silencioso + Service Worker + Task Checker

var _bgSW = null;          // referência ao service worker registrado
var _bgSyncTimer = null;   // timer do Firebase polling
var _bgTaskTimer = null;   // timer do task checker

// ── REGISTRO DO SERVICE WORKER ────────────────────────────────────────────────

function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    _bgSW = reg;
    // Escuta mensagens do SW (ex: clique em notificação)
    navigator.serviceWorker.addEventListener('message', function(e) {
      if (e.data && e.data.tipo === 'abrir-tarefas') {
        setState({ page: 'tarefas' });
      }
    });
    // Verifica atualizações do SW ao voltar para a aba
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && reg.waiting) {
        reg.waiting.postMessage({ tipo: 'skip-waiting' });
      }
    });
  }).catch(function() {});
}

// Envia lista de tarefas ao SW para ele checar e disparar notificação do sistema
function enviarTarefasAoSW() {
  if (!_bgSW || !_bgSW.active) return;
  _bgSW.active.postMessage({
    tipo: 'checar-tarefas',
    tarefas: (state.tarefas || []).filter(function(t) { return t && t.status === 'pendente'; }),
  });
}

// ── FIREBASE SILENT POLLING ───────────────────────────────────────────────────
// A cada 90s faz um GET silencioso no Firebase.
// Se algum dado mudou, atualiza o state sem re-render desnecessário.

function _bgFirebasePoll() {
  if (typeof fbGet !== 'function') return;
  Promise.all([
    fbGet('/tarefas'),
    fbGet('/contas'),
    fbGet('/receitas'),
    fbGet('/bancos'),
    fbGet('/produtos'),
    fbGet('/movEstoque'),
  ]).then(function(results) {
    var tarefas    = typeof objToArr === 'function' ? objToArr(results[0]) : [];
    var contas     = typeof objToArr === 'function' ? objToArr(results[1]) : [];
    var receitas   = typeof objToArr === 'function' ? objToArr(results[2]) : [];
    var bancos     = results[3] && Object.keys(results[3]).length > 0
                      ? (typeof objToArr === 'function' ? objToArr(results[3]) : state.bancos)
                      : state.bancos;
    var produtos   = typeof objToArr === 'function' ? objToArr(results[4]) : [];
    var movEstoque = typeof objToArr === 'function' ? objToArr(results[5]) : [];

    // Só atualiza se algo mudou (compara por comprimento + ids)
    var patch = {};
    if (_dadosMudou(state.tarefas, tarefas))       { patch.tarefas    = tarefas;    if(typeof lsSet==='function') lsSet('tarefas',tarefas); }
    if (_dadosMudou(state.contas, contas))          { patch.contas     = contas;     if(typeof lsSet==='function') lsSet('contas',contas); }
    if (_dadosMudou(state.receitas, receitas))      { patch.receitas   = receitas;   if(typeof lsSet==='function') lsSet('receitas',receitas); }
    if (_dadosMudou(state.bancos, bancos))          { patch.bancos     = bancos;     if(typeof lsSet==='function') lsSet('bancos',bancos); }
    if (_dadosMudou(state.produtos, produtos))      { patch.produtos   = produtos;   if(typeof lsSet==='function') lsSet('produtos',produtos); }
    if (_dadosMudou(state.movEstoque, movEstoque))  { patch.movEstoque = movEstoque; if(typeof lsSet==='function') lsSet('movEstoque',movEstoque); }

    if (Object.keys(patch).length > 0) {
      Object.assign(state, patch);
      // Re-render silencioso SOMENTE se a página visível e não há modal aberto
      if (document.visibilityState === 'visible' && !_temModalAberto()) {
        if (typeof render === 'function') render();
      }
    }

    // Após atualizar dados, envia ao SW e verifica alertas localmente
    enviarTarefasAoSW();
    if (typeof verificarAlertas === 'function') verificarAlertas();

  }).catch(function() {});
}

function _dadosMudou(antes, depois) {
  if (!antes || !depois) return false;
  if (antes.length !== depois.length) return true;
  // Compara os IDs e updatedAt para detectar mudanças sem serialização completa
  var idsAntes  = antes.map(function(x) { return x && x.id; }).join(',');
  var idDepois  = depois.map(function(x) { return x && x.id; }).join(',');
  return idsAntes !== idDepois;
}

function _temModalAberto() {
  return !!(state.modal || state.produtoModal !== null || state.movModal !== null ||
    state.tarefaModal !== null || state.usuarioModal !== null || state.recorrModal !== null ||
    state.bancoModal || state.transfModal || state.receitaModal || state.cartaoModal ||
    state.perfilModal || state.metaModal || state.orcamentoModal || state.buscaModal);
}

// ── INDICADOR VISUAL DE SINCRONIZAÇÃO ─────────────────────────────────────────

var _bgUltimaSync = null;

function _atualizarBadgeSync(status) {
  _bgUltimaSync = new Date();
  var badge = document.getElementById('_djf-sync-badge');
  if (!badge) return;
  if (status === 'ok') {
    badge.title = 'Sincronizado às ' + _bgUltimaSync.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  }
}

// ── INICIALIZAÇÃO ─────────────────────────────────────────────────────────────

function iniciarBackgroundSync() {
  // Registra o Service Worker
  registrarSW();

  // Firebase polling a cada 90 segundos
  if (_bgSyncTimer) clearInterval(_bgSyncTimer);
  _bgSyncTimer = setInterval(_bgFirebasePoll, 90000);

  // Task checker a cada 30 segundos (mais rápido que o intervalo do page-tarefas)
  if (_bgTaskTimer) clearInterval(_bgTaskTimer);
  _bgTaskTimer = setInterval(function() {
    if (typeof verificarAlertas === 'function') verificarAlertas();
    enviarTarefasAoSW();
  }, 30000);

  // Quando a aba volta ao foco: sync imediato
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      _bgFirebasePoll();
    }
  });

  // Quando volta online após estar offline: sync imediato
  window.addEventListener('online', function() {
    _bgFirebasePoll();
    if (typeof showToast === 'function') showToast('Conexão restaurada — sincronizando...', 'info', 2000);
  });

  window.addEventListener('offline', function() {
    if (typeof showToast === 'function') showToast('Sem conexão — usando dados locais', 'error', 3000);
  });
}
