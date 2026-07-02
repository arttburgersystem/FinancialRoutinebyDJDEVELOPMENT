// ── COMPRAS ───────────────────────────────────────────────────────────────────

var _COMPRAS_CATS = [
  'Alimentos e Bebidas','Embalagens','Material de Limpeza','Equipamentos',
  'Manutenção','Uniformes e EPIs','Material de Escritório','Gás e Combustível',
  'Descartáveis','Hortifruti','Carnes e Proteínas','Laticínios','Outros',
];
var _COMPRAS_UNIDADES = ['un','kg','g','L','mL','cx','pct','sc','frd','bd','par','m','rolo','Outro'];
var _COMPRAS_FORMAS   = ['Pix','Dinheiro','Boleto','Cartão de Débito','Cartão de Crédito','Prazo','Nota Promissória'];

function _compraStatus(c) {
  if (c.status === 'cancelado') return 'cancelado';
  if (c.status === 'pago') return 'pago';
  if (c.dataVencimento && c.dataVencimento < today() && c.status !== 'pago') return 'vencido';
  return c.status || 'pendente';
}

// Retorna o nome principal da compra (suporta formato antigo e novo)
function _compraNome(c) {
  if (c.itens && c.itens.length) {
    var n = c.itens[0].item || '—';
    if (c.itens.length > 1) n += ' (+' + (c.itens.length - 1) + ')';
    return n;
  }
  return c.item || '—';
}

// Retorna label da quantidade
function _compraQtdLabel(c) {
  if (c.itens && c.itens.length > 1) return c.itens.length + ' itens';
  if (c.itens && c.itens.length === 1) {
    var it = c.itens[0];
    return it.quantidade ? (it.quantidade + ' ' + (it.unidade || '')) : '—';
  }
  return c.quantidade ? (c.quantidade + ' ' + (c.unidade || '')) : '—';
}

function renderCompras() {
  var pf        = state.profile;
  var todas     = (state.compras || []).filter(function(c) { return c.profile === pf; });
  var mesFiltro = state.comprasMes || today().slice(0, 7);
  var filtro    = state.comprasFiltro || 'todos';
  var busca     = state.comprasBusca || '';

  function navMes(delta) {
    var p = mesFiltro.split('-');
    var y = parseInt(p[0]);
    var mo = parseInt(p[1]) - 1 + delta;
    y += Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    setState({ comprasMes: y + '-' + String(mo + 1).padStart(2, '0') });
  }

  var pParts  = mesFiltro.split('-');
  var labelMes = MESES[parseInt(pParts[1]) - 1] + ' ' + pParts[0];

  // KPIs do mês
  var doMes = todas.filter(function(c) {
    return (c.dataCompra || c.dataVencimento || '').slice(0, 7) === mesFiltro;
  });
  var kpiTotal    = doMes.reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);
  var kpiPago     = doMes.filter(function(c) { return c.status === 'pago'; })
                         .reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);
  var kpiPendente = doMes.filter(function(c) { return _compraStatus(c) === 'pendente'; })
                         .reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);
  var kpiVencido  = doMes.filter(function(c) { return _compraStatus(c) === 'vencido'; })
                         .reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);

  // Itens filtrados
  var filtradas = todas.filter(function(c) {
    var st   = _compraStatus(c);
    var data = (c.dataCompra || c.dataVencimento || '');
    if (filtro !== 'todos' && data.slice(0, 7) !== mesFiltro) return false;
    if (filtro === 'pendente' && st !== 'pendente') return false;
    if (filtro === 'pago'     && st !== 'pago')     return false;
    if (filtro === 'vencido'  && st !== 'vencido')  return false;
    if (busca) {
      var b = busca.toLowerCase();
      var ok = (c.item || '').toLowerCase().indexOf(b) !== -1 ||
               (c.fornecedor || '').toLowerCase().indexOf(b) !== -1 ||
               (c.categoria || '').toLowerCase().indexOf(b) !== -1 ||
               (c.nf || '').toLowerCase().indexOf(b) !== -1;
      // Busca também nos itens individuais
      if (!ok && c.itens && c.itens.length) {
        c.itens.forEach(function(it) {
          if ((it.item || '').toLowerCase().indexOf(b) !== -1) ok = true;
        });
      }
      if (!ok) return false;
    }
    return true;
  }).sort(function(a, b) {
    return (b.dataCompra || '').localeCompare(a.dataCompra || '');
  });

  // KPIs
  var kpiGrid = el('div', { class: 'kpi-grid', style: { marginBottom: '14px' } });
  function mkKpi(label, val, cls, sub) {
    return el('div', { class: 'kpi-card' + (cls ? ' ' + cls : '') }, [
      el('div', { class: 'kpi-label' }, label),
      el('div', { class: 'kpi-value' + (cls ? ' ' + cls : '') }, fmtMoney(val)),
      el('div', { class: 'kpi-sub' }, sub),
    ]);
  }
  kpiGrid.appendChild(mkKpi('Total do mês', kpiTotal, 'gold', doMes.length + ' compra(s)'));
  kpiGrid.appendChild(mkKpi('Pago', kpiPago, 'green', doMes.filter(function(c){return c.status==='pago';}).length + ' item(s)'));
  kpiGrid.appendChild(mkKpi('Pendente', kpiPendente, '', 'a pagar'));
  if (kpiVencido > 0) kpiGrid.appendChild(mkKpi('Vencido', kpiVencido, 'red', 'em atraso'));

  // Navegação de mês
  var navStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer', padding: '5px 10px', fontSize: '14px' };
  var mesNav = el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
    el('button', { style: navStyle, onclick: function() { navMes(-1); } }, '‹'),
    el('div', { style: { padding: '5px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', minWidth: '120px', textAlign: 'center' } }, labelMes),
    el('button', { style: navStyle, onclick: function() { navMes(1); } }, '›'),
  ]);

  // Chips
  var chipsEl = el('div', { style: { display: 'flex', gap: '6px' } });
  ['todos', 'pendente', 'pago', 'vencido'].forEach(function(f) {
    var label = f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1);
    chipsEl.appendChild(el('button', {
      class: 'chip' + (filtro === f ? ' active' : ''),
      onclick: function() { setState({ comprasFiltro: f }); },
    }, label));
  });

  // Busca
  var buscaInp = el('input', { class: 'form-input', placeholder: 'Buscar item, fornecedor...', style: { fontSize: '12px', padding: '5px 10px', maxWidth: '200px' } });
  buscaInp.value = busca;
  buscaInp.oninput = function(e) { setState({ comprasBusca: e.target.value }); };

  // Lista
  var stCores = {
    pendente:  { label: 'Pendente',  cor: 'var(--gold)',  bg: '#c9a84c22' },
    pago:      { label: 'Pago',      cor: '#00a86b',      bg: '#00a86b22' },
    vencido:   { label: 'Vencido',   cor: '#e05252',      bg: '#e0525222' },
    cancelado: { label: 'Cancelado', cor: 'var(--text3)', bg: 'var(--bg3)' },
  };

  var listaWrap = el('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } });

  // Header
  var hdr = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px 100px 90px', gap: '8px', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '2px solid var(--border)' } }, [
    el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' } }, 'Item / Fornecedor'),
    el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' } }, 'Qtd'),
    el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right'  } }, 'Total'),
    el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' } }, 'Compra'),
    el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' } }, 'Vencimento'),
    el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' } }, 'Status'),
  ]);
  listaWrap.appendChild(hdr);

  if (filtradas.length === 0) {
    listaWrap.appendChild(div('empty', [
      div('empty-icon', '🛒'),
      div('empty-title', 'Nenhuma compra encontrada'),
      div('empty-sub', 'Clique em "+ Nova compra" para registrar'),
    ]));
  } else {
    filtradas.forEach(function(c) {
      var st    = _compraStatus(c);
      var stDef = stCores[st] || stCores.pendente;
      var dias  = c.dataVencimento ? diasRestantes(c.dataVencimento) : null;

      var row = el('div', { style: {
        display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px 100px 90px',
        gap: '8px', padding: '11px 14px', borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
      }});
      row.onmouseenter = function() { row.style.background = 'var(--bg2)'; };
      row.onmouseleave = function() { row.style.background = ''; };
      var cCopy = c;
      row.onclick = function() { setState({ compraModal: { editItem: cCopy } }); };

      // Coluna item
      var itemCol = el('div', {});
      itemCol.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, _compraNome(c)));
      var subParts = [];
      if (c.categoria) subParts.push(c.categoria);
      if (c.fornecedor) subParts.push(c.fornecedor);
      if (subParts.length) {
        itemCol.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, subParts.join(' · ')));
      }
      row.appendChild(itemCol);

      row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'center', alignSelf: 'center' } }, _compraQtdLabel(c)));
      row.appendChild(el('div', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--text)', textAlign: 'right', alignSelf: 'center' } }, fmtMoney(c.valorTotal || 0)));
      row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'center', alignSelf: 'center' } }, c.dataCompra ? fmtDate(c.dataCompra) : '—'));

      // Vencimento
      var vencCol = el('div', { style: { textAlign: 'center', alignSelf: 'center' } });
      if (c.dataVencimento) {
        var vColor = dias !== null && dias < 0 ? '#e05252' : dias !== null && dias <= 3 ? 'var(--gold)' : 'var(--text3)';
        vencCol.appendChild(el('div', { style: { fontSize: '12px', color: vColor } }, fmtDate(c.dataVencimento)));
        if (dias !== null && c.status !== 'pago') {
          var dLabel = dias < 0 ? (dias + 'd') : dias === 0 ? 'hoje' : ('em ' + dias + 'd');
          vencCol.appendChild(el('div', { style: { fontSize: '10px', color: vColor } }, dLabel));
        }
      } else {
        vencCol.appendChild(el('span', { style: { color: 'var(--text3)' } }, '—'));
      }
      row.appendChild(vencCol);

      row.appendChild(el('div', { style: { textAlign: 'center', alignSelf: 'center' } }, [
        el('span', { style: { fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px', color: stDef.cor, background: stDef.bg } }, stDef.label),
      ]));

      listaWrap.appendChild(row);
    });
  }

  // Montar página
  var wrap = div('', []);
  wrap.appendChild(div('page-header', [
    el('h1', {}, 'Compras'),
    el('p', {}, 'Registro e controle de compras — ' + pf),
  ]));
  wrap.appendChild(div('action-row', [
    el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, [
      mesNav, chipsEl, buscaInp,
    ]),
    btn('btn-primary', '+ Nova compra', function() { setState({ compraModal: { editItem: null } }); }),
  ]));
  wrap.appendChild(kpiGrid);
  wrap.appendChild(listaWrap);
  return wrap;
}
