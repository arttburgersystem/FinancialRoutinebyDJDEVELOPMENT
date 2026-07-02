// ── PÁGINA COMPRAS ────────────────────────────────────────────────────────────

var _COMPRAS_CATS = [
  'Alimentos e Bebidas','Embalagens','Material de Limpeza','Equipamentos',
  'Manutenção','Uniformes e EPIs','Material de Escritório','Gás e Combustível',
  'Descartáveis','Hortifruti','Carnes e Proteínas','Laticínios','Outros',
];

var _COMPRAS_UNIDADES = ['un','kg','g','L','mL','cx','pct','sc','frd','bd','par','m','m²','rolo','Outro'];

var _COMPRAS_FORMAS = ['Pix','Dinheiro','Boleto','Cartão de Débito','Cartão de Crédito','Prazo','Nota Promissória'];

var _COMPRAS_STATUS = {
  pendente:  { label: 'Pendente',   cor: 'var(--gold)',  bg: '#c9a84c22' },
  pago:      { label: 'Pago',       cor: '#00a86b',      bg: '#00a86b22' },
  recebido:  { label: 'Recebido',   cor: 'var(--blue)',  bg: 'var(--blue)22' },
  cancelado: { label: 'Cancelado',  cor: 'var(--text3)', bg: 'var(--bg3)' },
  vencido:   { label: 'Vencido',    cor: '#e05252',      bg: '#e0525222' },
};

function _compraStatus(c) {
  if (c.status === 'cancelado') return 'cancelado';
  if (c.status === 'pago' && c.statusEntrega === 'recebido') return 'recebido';
  if (c.status === 'pago') return 'pago';
  if (c.dataVencimento && c.dataVencimento < today() && c.status !== 'pago') return 'vencido';
  return c.status || 'pendente';
}

function renderCompras() {
  var pf = state.profile;
  var todas = (state.compras || []).filter(function(c) { return c.profile === pf; });
  var mesFiltro = state.comprasMes || today().slice(0, 7);
  var filtro = state.comprasFiltro || 'todos';
  var busca = state.comprasBusca || '';
  var catFiltro = state.comprasCat || '';

  function _navMes(delta) {
    var p = mesFiltro.split('-'); var y = parseInt(p[0]); var mo = parseInt(p[1]) - 1 + delta;
    y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
    setState({ comprasMes: y + '-' + String(mo + 1).padStart(2, '0') });
  }
  var _pParts = mesFiltro.split('-');
  var _labelMes = MESES[parseInt(_pParts[1]) - 1] + ' ' + _pParts[0];

  // Filtrar
  var filtradas = todas.filter(function(c) {
    var st = _compraStatus(c);
    var mesOk = (filtro === 'todos') || (c.dataCompra || c.dataVencimento || '').slice(0, 7) === mesFiltro;
    if (!mesOk) return false;
    if (filtro === 'pendente') { if (st !== 'pendente') return false; }
    else if (filtro === 'pago')     { if (st !== 'pago' && st !== 'recebido') return false; }
    else if (filtro === 'vencido')  { if (st !== 'vencido') return false; }
    var buscaOk = !busca || (c.item || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.fornecedor || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.categoria || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.nf || '').toLowerCase().includes(busca.toLowerCase());
    if (!buscaOk) return false;
    if (catFiltro && c.categoria !== catFiltro) return false;
    return true;
  }).sort(function(a, b) {
    return (b.dataCompra || b.dataVencimento || '').localeCompare(a.dataCompra || a.dataVencimento || '');
  });

  // KPIs do mês
  var doMes = todas.filter(function(c) {
    return (c.dataCompra || c.dataVencimento || '').slice(0, 7) === mesFiltro;
  });
  var kpiTotal    = doMes.reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);
  var kpiPago     = doMes.filter(function(c) { return c.status === 'pago'; }).reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);
  var kpiPendente = doMes.filter(function(c) { var s=_compraStatus(c); return s==='pendente'; }).reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);
  var kpiVencido  = doMes.filter(function(c) { return _compraStatus(c) === 'vencido'; }).reduce(function(a, c) { return a + (c.valorTotal || 0); }, 0);

  // Totais por categoria
  var porCat = {};
  doMes.forEach(function(c) { porCat[c.categoria || 'Outros'] = (porCat[c.categoria || 'Outros'] || 0) + (c.valorTotal || 0); });
  var catArr = Object.keys(porCat).map(function(k) { return { cat: k, val: porCat[k] }; }).sort(function(a, b) { return b.val - a.val; }).slice(0, 5);

  // Cats disponíveis para filtro
  var catsDisponiveis = [...new Set(todas.map(function(c) { return c.categoria; }).filter(Boolean))];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  var kpis = el('div', { class: 'kpi-grid', style: { marginBottom: '14px' } }, [
    el('div', { class: 'kpi-card' }, [
      el('div', { class: 'kpi-label' }, 'Total do mês'),
      el('div', { class: 'kpi-value gold' }, fmtMoney(kpiTotal)),
      el('div', { class: 'kpi-sub' }, doMes.length + ' compra(s)'),
    ]),
    el('div', { class: 'kpi-card' }, [
      el('div', { class: 'kpi-label' }, 'Pago'),
      el('div', { class: 'kpi-value green' }, fmtMoney(kpiPago)),
      el('div', { class: 'kpi-sub' }, doMes.filter(function(c){return c.status==='pago';}).length + ' item(s)'),
    ]),
    el('div', { class: 'kpi-card' }, [
      el('div', { class: 'kpi-label' }, 'Pendente'),
      el('div', { class: 'kpi-value' }, fmtMoney(kpiPendente)),
      el('div', { class: 'kpi-sub' }, 'a pagar'),
    ]),
    kpiVencido > 0 ? el('div', { class: 'kpi-card red' }, [
      el('div', { class: 'kpi-label' }, 'Vencido'),
      el('div', { class: 'kpi-value red' }, fmtMoney(kpiVencido)),
      el('div', { class: 'kpi-sub' }, 'em atraso'),
    ]) : null,
  ].filter(Boolean));

  // ── Navegação de mês ──────────────────────────────────────────────────────
  var mesNav = el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
    el('button', { style: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer', padding: '5px 10px', fontSize: '14px' }, onclick: function() { _navMes(-1); } }, '‹'),
    el('div', { style: { padding: '5px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', minWidth: '130px', textAlign: 'center' } }, _labelMes),
    el('button', { style: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer', padding: '5px 10px', fontSize: '14px' }, onclick: function() { _navMes(1); } }, '›'),
  ]);

  // ── Chips de filtro ───────────────────────────────────────────────────────
  var chips = ['todos', 'pendente', 'pago', 'vencido'].map(function(f) {
    return el('button', { class: 'chip' + (filtro === f ? ' active' : ''), onclick: function() { setState({ comprasFiltro: f }); } },
      f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1));
  });

  // ── Busca ─────────────────────────────────────────────────────────────────
  var sbEl = div('search-wrap', [
    el('span', {}, '🔍'),
    el('input', { placeholder: 'Buscar item, fornecedor, NF...', value: busca, oninput: function(e) { setState({ comprasBusca: e.target.value }); } }),
  ]);

  // ── Filtro de categoria ───────────────────────────────────────────────────
  var selCat = el('select', { class: 'form-input', style: { fontSize: '12px', padding: '5px 8px' }, onchange: function(e) { setState({ comprasCat: e.target.value }); } }, [
    el('option', { value: '' }, 'Todas categorias'),
    ...catsDisponiveis.map(function(c) { var o = el('option', { value: c }, c); if (c === catFiltro) o.selected = true; return o; }),
  ]);

  // ── Totais por categoria (mini gráfico) ───────────────────────────────────
  var catBar = catArr.length > 0 ? div('card', { style: { marginBottom: '10px' } }, [
    div('card-title', 'Top categorias — ' + _labelMes),
    el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' } }, catArr.map(function(ct) {
      var pct = kpiTotal > 0 ? (ct.val / kpiTotal * 100).toFixed(1) : 0;
      return el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        el('span', { style: { fontSize: '12px', color: 'var(--text2)', minWidth: '160px' } }, ct.cat),
        el('div', { style: { flex: '1', height: '6px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden' } }, [
          el('div', { style: { height: '100%', width: pct + '%', background: 'var(--gold)', borderRadius: '3px' } }),
        ]),
        el('span', { style: { fontSize: '12px', color: 'var(--text3)', minWidth: '70px', textAlign: 'right' } }, fmtMoney(ct.val)),
      ]);
    })),
  ]) : null;

  // ── Lista de compras ──────────────────────────────────────────────────────
  function renderLinha(c) {
    var st = _compraStatus(c);
    var stDef = _COMPRAS_STATUS[st] || _COMPRAS_STATUS.pendente;
    var dias = c.dataVencimento ? diasRestantes(c.dataVencimento) : null;
    var fornNome = c.fornecedor || '—';
    var forn = (state.fornecedores || []).find(function(f) { return f.id === c.fornecedorId; });
    if (forn) fornNome = forn.nome;

    return el('div', { style: {
      display: 'grid',
      gridTemplateColumns: '1fr 110px 100px 90px 100px 110px 90px',
      alignItems: 'center',
      gap: '8px',
      padding: '11px 14px',
      borderBottom: '1px solid var(--border)',
      cursor: 'pointer',
      transition: 'background .15s',
    },
    onmouseenter: function(e) { e.currentTarget.style.background = 'var(--bg2)'; },
    onmouseleave: function(e) { e.currentTarget.style.background = ''; },
    onclick: function() { setState({ compraModal: { editItem: c } }); },
    }, [
      // Item + categoria
      el('div', {}, [
        el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, c.item || '—'),
        el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, [
          c.categoria ? el('span', { style: { marginRight: '6px' } }, c.categoria) : null,
          fornNome !== '—' ? el('span', { style: { color: 'var(--text3)' } }, '· ' + fornNome) : null,
        ].filter(Boolean)),
      ]),
      // Quantidade
      el('div', { style: { fontSize: '13px', color: 'var(--text2)', textAlign: 'center' } },
        c.quantidade ? (c.quantidade + ' ' + (c.unidade || '')) : '—'),
      // Preço unit
      el('div', { style: { fontSize: '13px', color: 'var(--text2)', textAlign: 'right' } },
        c.precoUnit ? fmtMoney(c.precoUnit) : '—'),
      // Total
      el('div', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--text)', textAlign: 'right' } },
        fmtMoney(c.valorTotal || 0)),
      // Data compra
      el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'center' } },
        c.dataCompra ? fmtDate(c.dataCompra) : '—'),
      // Vencimento
      el('div', { style: { textAlign: 'center' } }, [
        c.dataVencimento ? el('div', { style: { fontSize: '12px', color: dias !== null && dias < 0 ? '#e05252' : dias !== null && dias <= 3 ? 'var(--gold)' : 'var(--text3)' } }, fmtDate(c.dataVencimento)) : el('span', { style: { color: 'var(--text3)' } }, '—'),
        dias !== null && c.status !== 'pago' ? el('div', { style: { fontSize: '10px', color: dias < 0 ? '#e05252' : dias <= 3 ? 'var(--gold)' : 'var(--text3)' } }, dias < 0 ? dias + 'd' : dias === 0 ? 'hoje' : 'em ' + dias + 'd') : null,
      ].filter(Boolean)),
      // Status
      el('div', { style: { textAlign: 'center' } }, [
        el('span', { style: {
          fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '20px',
          color: stDef.cor, background: stDef.bg,
        } }, stDef.label),
      ]),
    ]);
  }

  var headerCols = el('div', { style: {
    display: 'grid',
    gridTemplateColumns: '1fr 110px 100px 90px 100px 110px 90px',
    gap: '8px', padding: '7px 14px',
    borderBottom: '2px solid var(--border)',
    background: 'var(--bg2)',
  } }, [
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase' } }, 'Item / Fornecedor'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' } }, 'Qtd'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'right' } }, 'Preço Unit.'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'right' } }, 'Total'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' } }, 'Compra'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' } }, 'Vencimento'),
    el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' } }, 'Status'),
  ]);

  var listaEl = filtradas.length === 0
    ? div('empty', [div('empty-icon', '🛒'), div('empty-title', 'Nenhuma compra encontrada'), div('empty-sub', 'Clique em "+ Nova compra" para registrar')])
    : el('div', {}, filtradas.map(renderLinha));

  var lista = div('card', { style: { padding: '0', overflow: 'hidden' } }, [headerCols, listaEl]);

  return div('', [
    div('page-header', [
      el('h1', {}, 'Compras'),
      el('p', {}, 'Registro e controle de todas as compras — ' + pf),
    ]),
    el('div', { class: 'action-row' }, [
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, [
        mesNav, ...chips, sbEl, selCat,
      ]),
      btn('btn-primary', '+ Nova compra', function() { setState({ compraModal: { editItem: null } }); }),
    ]),
    kpis,
    catBar,
    lista,
  ].filter(Boolean));
}
