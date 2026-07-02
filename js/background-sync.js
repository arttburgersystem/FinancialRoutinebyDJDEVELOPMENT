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
  var toArr = typeof objToArr === 'function' ? objToArr : function(){return[];};
  Promise.all([
    fbGet('/tarefas'),
    fbGet('/contas'),
    fbGet('/receitas'),
    fbGet('/bancos'),
    fbGet('/produtos'),
    fbGet('/movEstoque'),
    fbGet('/setoresImpressao'),
    fbGet('/complementos'),
    fbGet('/kdsConfigs'),
    fbGet('/pedidos'),
    fbGet('/notas'),
    fbGet('/impressorasCadastradas'),
    fbGet('/administradores'),
  ]).then(function(results) {
    var tarefas              = toArr(results[0]);
    var contas               = toArr(results[1]);
    var receitas             = toArr(results[2]);
    var bancos               = results[3] && Object.keys(results[3]).length > 0 ? toArr(results[3]) : state.bancos;
    var produtos             = toArr(results[4]);
    var movEstoque           = toArr(results[5]);
    var setoresImpressao     = toArr(results[6]||[]);
    var complementos         = toArr(results[7]||[]);
    var kdsConfigs           = toArr(results[8]||[]);
    var pedidos              = toArr(results[9]||[]);
    var notas                = toArr(results[10]||[]);
    var impressorasCadastradas = toArr(results[11]||[]);
    var administradores = toArr(results[12]||[]);

    var patch = {};
    if (_dadosMudou(state.tarefas, tarefas))            { patch.tarefas    = tarefas;    if(typeof lsSet==='function') lsSet('tarefas',tarefas); }
    if (_dadosMudou(state.contas, contas))              { patch.contas     = contas;     if(typeof lsSet==='function') lsSet('contas',contas); }
    if (_dadosMudou(state.receitas, receitas))          { patch.receitas   = receitas;   if(typeof lsSet==='function') lsSet('receitas',receitas); }
    if (_dadosMudou(state.bancos, bancos))              { patch.bancos     = bancos;     if(typeof lsSet==='function') lsSet('bancos',bancos); }
    if (_dadosMudou(state.produtos, produtos))          { patch.produtos   = produtos;   if(typeof lsSet==='function') lsSet('produtos',produtos); }
    if (_dadosMudou(state.movEstoque, movEstoque))      { patch.movEstoque = movEstoque; if(typeof lsSet==='function') lsSet('movEstoque',movEstoque); }
    if (_dadosMudou(state.setoresImpressao, setoresImpressao))     { patch.setoresImpressao = setoresImpressao; if(typeof lsSet==='function') lsSet('setoresImpressao',setoresImpressao); }
    if (_dadosMudou(state.complementos, complementos))             { patch.complementos = complementos; if(typeof lsSet==='function') lsSet('complementos',complementos); }
    if (_dadosMudou(state.kdsConfigs, kdsConfigs))                 { patch.kdsConfigs = kdsConfigs; if(typeof lsSet==='function') lsSet('kdsConfigs',kdsConfigs); }
    if (_dadosMudou(state.pedidos, pedidos))                       { patch.pedidos = pedidos; if(typeof lsSet==='function') lsSet('pedidos',pedidos); }
    if (_dadosMudou(state.notas, notas))                           { patch.notas = notas; if(typeof lsSet==='function') lsSet('notas',notas); }
    if (_dadosMudou(state.impressorasCadastradas, impressorasCadastradas)) { patch.impressorasCadastradas = impressorasCadastradas; if(typeof lsSet==='function') lsSet('impressorasCadastradas',impressorasCadastradas); }
    if (_dadosMudou(state.administradores, administradores)) { patch.administradores = administradores; if(typeof lsSet==='function') lsSet('administradores',administradores); }

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
    state.perfilModal || state.metaModal || state.orcamentoModal || state.buscaModal ||
    state.kdsModal || state.pedidoModal || state.impModal || state.adminModal ||
    state.pagamentoFaturaModal ||
    state.dailyModal || state.dailyAdiModal || state.dailyTemplatesOpen ||
    state._reprogModal || state.cedurasModal || state.compraModal);
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
