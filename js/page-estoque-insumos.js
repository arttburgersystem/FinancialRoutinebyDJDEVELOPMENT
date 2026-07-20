// ── ESTOQUE DE INSUMOS ────────────────────────────────────────────────────────

var _EI_CATS = [
  'Bebidas','Alimentos','Carnes e Proteínas','Hortifruti',
  'Laticínios','Embalagens','Descartáveis','Material de Limpeza',
  'Gás e Combustível','Equipamentos','Outros',
];
var _EI_UNIDADES = ['un','kg','g','L','mL','cx','pct','sc','frd','bd','par','m','rolo','Outro'];

function _eiStatus(item) {
  var qtd = item.estoqueAtual || 0;
  if (qtd <= 0) return 'critico';
  if (item.estoqueMinimo && qtd < item.estoqueMinimo) return 'baixo';
  return 'ok';
}

function _eiMargem(item) {
  if (!item.precoVenda || !item.custoMedio) return null;
  return (item.precoVenda - item.custoMedio) / item.precoVenda * 100;
}

function renderEstoqueInsumos() {
  var pf      = state.profile;
  var itens   = (state.estoqueItens  || []).filter(function(x) { return x.profile === pf; });
  var movs    = (state.estoqueMovs   || []).filter(function(x) { return x.profile === pf; });
  var fichas  = (state.fichaTecnicas || []).filter(function(x) { return x.profile === pf; });
  var tab     = state.estoqueTab    || 'itens';
  var busca   = state.estoqueBusca  || '';
  var filtro  = state.estoqueFiltro || 'todos';
  var catFilt = state.estoqueCat    || '';

  // KPIs
  var totalValor  = itens.reduce(function(a, x) { return a + (x.estoqueAtual || 0) * (x.custoMedio || 0); }, 0);
  var criticos    = itens.filter(function(x) { return _eiStatus(x) === 'critico'; }).length;
  var baixos      = itens.filter(function(x) { return _eiStatus(x) === 'baixo'; }).length;
  var comMargem   = itens.filter(function(x) { return x.precoVenda && x.custoMedio; });
  var margemMedia = comMargem.length
    ? comMargem.reduce(function(a, x) { return a + _eiMargem(x); }, 0) / comMargem.length
    : null;

  var kpiGrid = el('div', { class: 'kpi-grid', style: { marginBottom: '14px' } });
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Valor em Estoque'),
    el('div', { class: 'kpi-value', style: { color: 'var(--gold)' } }, fmtMoney(totalValor)),
    el('div', { class: 'kpi-sub' }, itens.length + ' produto(s) cadastrado(s)'),
  ]));
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Críticos (zerado)'),
    el('div', { class: 'kpi-value', style: { color: criticos > 0 ? '#e05252' : 'var(--text)' } }, String(criticos)),
    el('div', { class: 'kpi-sub' }, 'precisam de reposição'),
  ]));
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Abaixo do Mínimo'),
    el('div', { class: 'kpi-value', style: { color: baixos > 0 ? 'var(--gold)' : 'var(--text)' } }, String(baixos)),
    el('div', { class: 'kpi-sub' }, 'reposição urgente'),
  ]));
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Margem Média'),
    el('div', { class: 'kpi-value', style: { color: margemMedia !== null && margemMedia >= 30 ? '#00a86b' : 'var(--text)' } },
      margemMedia !== null ? margemMedia.toFixed(1) + '%' : '—'),
    el('div', { class: 'kpi-sub' }, 'sobre produtos c/ preço'),
  ]));

  // Tabs
  var tabsEl = el('div', { style: { display: 'flex', gap: '0', marginBottom: '14px', borderBottom: '2px solid var(--border)' } });
  [
    { id: 'itens',  label: '📦 Produtos (' + itens.length + ')' },
    { id: 'movs',   label: '🔄 Movimentações (' + movs.length + ')' },
    { id: 'fichas', label: '📋 Fichas Técnicas (' + fichas.length + ')' },
  ].forEach(function(t) {
    var isActive = tab === t.id;
    var tb = el('button', {}, t.label);
    tb.style.cssText = 'padding:8px 16px;border:none;cursor:pointer;font-size:13px;background:none;margin-bottom:-2px;border-bottom:2px solid ' + (isActive ? 'var(--primary)' : 'transparent') + ';color:' + (isActive ? 'var(--primary)' : 'var(--text3)') + ';font-weight:' + (isActive ? '700' : '500') + ';';
    (function(tid) { tb.onclick = function() { setState({ estoqueTab: tid }); }; })(t.id);
    tabsEl.appendChild(tb);
  });

  // Action row dinâmica por tab
  var leftFilters = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } });
  var rightBtns   = el('div', { style: { display: 'flex', gap: '6px' } });

  if (tab === 'itens') {
    var buscaInp = el('input', { class: 'form-input', placeholder: 'Buscar produto...', style: { fontSize: '12px', padding: '5px 10px', maxWidth: '200px' } });
    buscaInp.value = busca;
    buscaInp.oninput = function(e) { setState({ estoqueBusca: e.target.value }); };
    leftFilters.appendChild(buscaInp);

    var chipsEl = el('div', { style: { display: 'flex', gap: '4px' } });
    [
      { v: 'todos',   l: 'Todos'      },
      { v: 'critico', l: '🔴 Crítico' },
      { v: 'baixo',   l: '🟡 Baixo'   },
      { v: 'ok',      l: '🟢 OK'      },
    ].forEach(function(f) {
      var cb = el('button', { class: 'chip' + (filtro === f.v ? ' active' : '') }, f.l);
      (function(fv) { cb.onclick = function() { setState({ estoqueFiltro: fv }); }; })(f.v);
      chipsEl.appendChild(cb);
    });
    leftFilters.appendChild(chipsEl);

    var catSel = el('select', { class: 'form-input', style: { fontSize: '12px', padding: '5px 8px' } });
    var allOpt = el('option', { value: '' }, 'Todas categorias');
    catSel.appendChild(allOpt);
    _EI_CATS.forEach(function(c) {
      var opt = el('option', { value: c }, c);
      if (c === catFilt) opt.selected = true;
      catSel.appendChild(opt);
    });
    catSel.onchange = function(e) { setState({ estoqueCat: e.target.value }); };
    leftFilters.appendChild(catSel);

    rightBtns.appendChild(btn('btn-ghost', '📱 Tablet de Requisição', function() { setState({ reqMode: true, reqSession: null, reqCarrinho: [], reqPin: null, reqBusca: '' }); }));
    rightBtns.appendChild(btn('btn-ghost', '🔄 Movimentar', function() { setState({ estoqueMovModal: { insumoId: null, tipo: 'entrada' } }); }));
    rightBtns.appendChild(btn('btn-primary', '+ Produto', function() { setState({ estoqueItemModal: { editItem: null } }); }));

  } else if (tab === 'movs') {
    rightBtns.appendChild(btn('btn-primary', '+ Movimento', function() { setState({ estoqueMovModal: { insumoId: null, tipo: 'entrada' } }); }));
  } else {
    // Filtros da aba Fichas Técnicas
    var fBuscaInp = el('input', { class: 'form-input', placeholder: 'Buscar ficha técnica...', style: { fontSize: '12px', padding: '5px 10px', maxWidth: '200px' } });
    fBuscaInp.value = busca;
    fBuscaInp.oninput = function(e) { setState({ estoqueBusca: e.target.value }); };
    leftFilters.appendChild(fBuscaInp);

    // Categorias disponíveis nas fichas
    var fichasCats = [];
    fichas.forEach(function(ft) { if (ft.categoria && fichasCats.indexOf(ft.categoria) === -1) fichasCats.push(ft.categoria); });
    fichasCats.sort();
    var fCatSel = el('select', { class: 'form-input', style: { fontSize: '12px', padding: '5px 8px' } });
    fCatSel.appendChild(el('option', { value: '' }, 'Todas categorias'));
    fichasCats.forEach(function(c) {
      var opt = el('option', { value: c }, c);
      if (c === catFilt) opt.selected = true;
      fCatSel.appendChild(opt);
    });
    fCatSel.onchange = function(e) { setState({ estoqueCat: e.target.value }); };
    leftFilters.appendChild(fCatSel);

    rightBtns.appendChild(btn('btn-primary', '+ Ficha Técnica', function() { setState({ fichaTecnicaModal: { editItem: null } }); }));
  }

  var actionRow = el('div', { class: 'action-row' }, [leftFilters]);
  actionRow.appendChild(rightBtns);

  // Conteúdo da tab
  var content;
  if (tab === 'itens')       content = _renderEiItens(itens, busca, filtro, catFilt);
  else if (tab === 'movs')   content = _renderEiMovs(movs, itens);
  else                       content = _renderEiFichas(fichas, busca, catFilt);

  var wrap = div('', []);
  wrap.appendChild(div('page-header', [
    el('h1', {}, 'Estoque'),
    el('p', {}, 'Insumos, custo médio, fichas técnicas — ' + pf),
  ]));
  wrap.appendChild(actionRow);
  wrap.appendChild(kpiGrid);
  wrap.appendChild(tabsEl);
  wrap.appendChild(content);
  return wrap;
}

// ── Tab Produtos ──────────────────────────────────────────────────────────────

function _renderEiItens(itens, busca, filtro, catFilt) {
  var stCores = {
    ok:      { label: 'OK',      cor: '#00a86b',      bg: '#00a86b22', icon: '🟢' },
    baixo:   { label: 'Baixo',   cor: 'var(--gold)',  bg: '#c9a84c22', icon: '🟡' },
    critico: { label: 'Crítico', cor: '#e05252',      bg: '#e0525222', icon: '🔴' },
  };

  var filtrados = itens.filter(function(x) {
    if (filtro !== 'todos' && _eiStatus(x) !== filtro) return false;
    if (catFilt && x.categoria !== catFilt) return false;
    if (busca) {
      var b = busca.toLowerCase();
      if ((x.nome || '').toLowerCase().indexOf(b) === -1 &&
          (x.categoria || '').toLowerCase().indexOf(b) === -1) return false;
    }
    return true;
  }).sort(function(a, b) {
    var sa = _eiStatus(a) === 'critico' ? 0 : _eiStatus(a) === 'baixo' ? 1 : 2;
    var sb = _eiStatus(b) === 'critico' ? 0 : _eiStatus(b) === 'baixo' ? 1 : 2;
    if (sa !== sb) return sa - sb;
    return (a.nome || '').localeCompare(b.nome || '');
  });

  var wrap = el('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } });

  // Header
  var cols = '2.5fr 100px 55px 80px 70px 100px 100px 80px 130px';
  var hdrData = ['Produto', 'Categoria', 'Und', 'Estoque', 'Mínimo', 'C. Médio', 'C. Atual', 'Margem', 'Status / Ações'];
  var hdr = el('div', { style: { display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '2px solid var(--border)' } });
  hdrData.forEach(function(h, i) {
    var align = (i >= 3 && i <= 7) ? 'right' : i === 8 ? 'center' : 'left';
    hdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: align } }, h));
  });
  wrap.appendChild(hdr);

  if (filtrados.length === 0) {
    wrap.appendChild(div('empty', [
      div('empty-icon', '📦'),
      div('empty-title', itens.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum resultado'),
      div('empty-sub', itens.length === 0 ? 'Clique em "+ Produto" para cadastrar' : 'Ajuste os filtros'),
    ]));
    return wrap;
  }

  filtrados.forEach(function(item) {
    var st    = _eiStatus(item);
    var stDef = stCores[st];
    var mg    = _eiMargem(item);
    var mgCor = mg === null ? 'var(--text3)' : mg >= 40 ? '#00a86b' : mg >= 20 ? 'var(--gold)' : '#e05252';
    var qtd   = item.estoqueAtual || 0;

    var row = el('div', { style: {
      display: 'grid', gridTemplateColumns: cols,
      gap: '6px', padding: '10px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    }});
    row.onmouseenter = function() { row.style.background = 'var(--bg2)'; };
    row.onmouseleave = function() { row.style.background = ''; };

    // Nome
    var nomeCol = el('div', {});
    nomeCol.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, item.nome || '—'));
    if (item.obs) nomeCol.appendChild(el('div', { style: { fontSize: '10px', color: 'var(--text3)', marginTop: '1px' } }, item.obs));
    row.appendChild(nomeCol);

    row.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, item.categoria || '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } }, item.unidade || '—'));

    // Estoque atual (colorido pelo status)
    row.appendChild(el('div', { style: { fontSize: '14px', fontWeight: '700', color: stDef.cor, textAlign: 'right' } },
      Number.isInteger(qtd) ? String(qtd) : qtd.toFixed(2)));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } },
      item.estoqueMinimo != null ? String(item.estoqueMinimo) : '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', fontWeight: '600', color: 'var(--text)', textAlign: 'right' } },
      item.custoMedio ? fmtMoney(item.custoMedio) : '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } },
      item.custoAtual ? fmtMoney(item.custoAtual) : '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', fontWeight: '700', color: mgCor, textAlign: 'right' } },
      mg !== null ? mg.toFixed(1) + '%' : '—'));

    // Status + ações
    var actCol = el('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' } });
    actCol.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '20px', color: stDef.cor, background: stDef.bg, whiteSpace: 'nowrap' } }, stDef.icon + ' ' + stDef.label));

    var iCopy = item;
    var editBtn = el('button', { title: 'Editar produto' }, '✏️');
    editBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 5px;font-size:11px;';
    editBtn.onclick = function() { setState({ estoqueItemModal: { editItem: iCopy } }); };
    actCol.appendChild(editBtn);

    var movBtn = el('button', { title: 'Movimentar estoque' }, '🔄');
    movBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 5px;font-size:11px;';
    movBtn.onclick = function() { setState({ estoqueMovModal: { insumoId: iCopy.id, tipo: 'entrada' } }); };
    actCol.appendChild(movBtn);

    row.appendChild(actCol);
    wrap.appendChild(row);
  });

  return wrap;
}

// ── Tab Movimentações ─────────────────────────────────────────────────────────

function _renderEiMovs(movs, itens) {
  var sorted = movs.slice().sort(function(a, b) {
    return (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || '');
  }).slice(0, 300);

  var tipoCores = {
    entrada: { cor: '#00a86b', bg: '#00a86b22', label: '⬆ Entrada' },
    saida:   { cor: '#e05252', bg: '#e0525222', label: '⬇ Saída'   },
    ajuste:  { cor: 'var(--primary)', bg: 'var(--bg3)', label: '⚙ Ajuste' },
  };

  var wrap = el('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } });
  var cols = '90px 2fr 100px 80px 100px 100px 2fr';
  var hdr = el('div', { style: { display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '2px solid var(--border)' } });
  ['Data', 'Produto', 'Tipo', 'Qtd', 'Custo Unit.', 'Total', 'Motivo / Obs'].forEach(function(h, i) {
    hdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : 'left' } }, h));
  });
  wrap.appendChild(hdr);

  if (sorted.length === 0) {
    wrap.appendChild(div('empty', [div('empty-icon', '🔄'), div('empty-title', 'Nenhuma movimentação registrada')]));
    return wrap;
  }

  sorted.forEach(function(mov) {
    var insumo = (itens || []).filter(function(x) { return x.id === mov.insumoId; })[0];
    var tc = tipoCores[mov.tipo] || tipoCores.ajuste;
    var sinal = mov.tipo === 'saida' ? '−' : mov.tipo === 'entrada' ? '+' : '=';

    var row = el('div', { style: {
      display: 'grid', gridTemplateColumns: cols,
      gap: '6px', padding: '9px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    }});
    row.onmouseenter = function() { row.style.background = 'var(--bg2)'; };
    row.onmouseleave = function() { row.style.background = ''; };

    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)' } }, mov.data ? fmtDate(mov.data) : '—'));
    var nomeCol = el('div', {});
    nomeCol.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, insumo ? insumo.nome : (mov.insumoNome || '—')));
    if (mov.qtdAntes != null) nomeCol.appendChild(el('div', { style: { fontSize: '10px', color: 'var(--text3)' } }, 'Antes: ' + mov.qtdAntes + ' → Depois: ' + mov.qtdDepois));
    row.appendChild(nomeCol);
    row.appendChild(el('div', { style: { textAlign: 'center' } }, [
      el('span', { style: { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', color: tc.cor, background: tc.bg, whiteSpace: 'nowrap' } }, tc.label),
    ]));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '700', color: tc.cor, textAlign: 'center' } }, sinal + (mov.quantidade || 0)));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'center' } }, mov.custoUnit ? fmtMoney(mov.custoUnit) : '—'));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)', textAlign: 'center' } }, mov.valorTotal ? fmtMoney(mov.valorTotal) : '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)' } }, [mov.motivo, mov.obs].filter(Boolean).join(' — ') || '—'));

    wrap.appendChild(row);
  });

  return wrap;
}

// ── Tab Fichas Técnicas ───────────────────────────────────────────────────────

function _renderEiFichas(fichas, busca, catFilt) {
  // Aplicar filtros
  var filtradas = fichas.filter(function(ft) {
    if (catFilt && ft.categoria !== catFilt) return false;
    if (busca) {
      var b = busca.toLowerCase();
      if ((ft.nome || '').toLowerCase().indexOf(b) === -1 &&
          (ft.categoria || '').toLowerCase().indexOf(b) === -1) return false;
    }
    return true;
  });

  var wrap = el('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } });
  var cols = '2fr 100px 90px 110px 110px 70px 70px 80px';
  var hdr = el('div', { style: { display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '2px solid var(--border)' } });
  ['Nome / Categoria', 'Rendimento', 'Ingredientes', 'Custo/Porção', 'Preço Venda', 'CMV%', 'Margem', 'Ações'].forEach(function(h, i) {
    hdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: i >= 3 ? 'right' : i === 7 ? 'center' : 'left' } }, h));
  });
  wrap.appendChild(hdr);

  if (fichas.length === 0) {
    wrap.appendChild(div('empty', [
      div('empty-icon', '📋'),
      div('empty-title', 'Nenhuma ficha técnica cadastrada'),
      div('empty-sub', 'Clique em "+ Ficha Técnica" para criar'),
    ]));
    return wrap;
  }

  if (filtradas.length === 0) {
    wrap.appendChild(div('empty', [
      div('empty-icon', '🔍'),
      div('empty-title', 'Nenhuma ficha encontrada'),
      div('empty-sub', 'Ajuste os filtros de busca ou categoria'),
    ]));
    return wrap;
  }

  filtradas.forEach(function(ft) {
    var pv    = ft.precoVenda || 0;
    var cp    = ft.custoPorcao || 0;
    var das   = ft.pctDAS || 0;
    var lDin  = pv ? pv - pv * das / 100 - cp : null;
    var mg    = pv && lDin !== null ? lDin / pv * 100 : null;
    var cmv   = pv && cp ? cp / pv * 100 : null;
    var mgCor  = mg  === null ? 'var(--text3)' : mg  >= 40 ? '#00a86b' : mg  >= 20 ? 'var(--gold)' : '#e05252';
    var cmvCor = cmv === null ? 'var(--text3)' : cmv <= 30 ? '#00a86b' : cmv <= 40 ? 'var(--gold)' : '#e05252';
    var nIngr = ft.ingredientes ? ft.ingredientes.length : 0;

    var row = el('div', { style: {
      display: 'grid', gridTemplateColumns: cols,
      gap: '6px', padding: '10px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    }});
    row.onmouseenter = function() { row.style.background = 'var(--bg2)'; };
    row.onmouseleave = function() { row.style.background = ''; };

    var nomeCol = el('div', {});
    nomeCol.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, ft.nome || '—'));
    if (ft.categoria) nomeCol.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, ft.categoria));
    row.appendChild(nomeCol);

    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } }, (ft.rendimento || 1) + ' ' + (ft.unidadeRend || 'porção')));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } }, nIngr + ' ingrediente(s)'));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textAlign: 'right' } }, cp ? fmtMoney(cp) : '—'));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', textAlign: 'right' } }, pv ? fmtMoney(pv) : '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', fontWeight: '700', color: cmvCor, textAlign: 'right' } }, cmv !== null ? cmv.toFixed(1) + '%' : '—'));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '700', color: mgCor, textAlign: 'right' } }, mg !== null ? mg.toFixed(1) + '%' : (das ? '—' : (pv && cp ? ((pv-cp)/pv*100).toFixed(1)+'%' : '—'))));

    var actCol = el('div', { style: { display: 'flex', gap: '4px', justifyContent: 'center' } });
    var fCopy = ft;
    var editBtn = el('button', { title: 'Editar' }, '✏️');
    editBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 5px;font-size:11px;';
    editBtn.onclick = function() { setState({ fichaTecnicaModal: { editItem: fCopy } }); };
    actCol.appendChild(editBtn);

    var delBtn = el('button', { title: 'Excluir' }, '🗑️');
    delBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 5px;font-size:11px;';
    delBtn.onclick = function() {
      if (!confirm('Excluir ficha "' + fCopy.nome + '"?')) return;
      var lista = (state.fichaTecnicas || []).filter(function(x) { return x.id !== fCopy.id; });
      lsSet('fichaTecnicas', lista);
      setState({ fichaTecnicas: lista });
      scheduleSave();
      showToast('Ficha excluída', 'error');
    };
    actCol.appendChild(delBtn);
    row.appendChild(actCol);
    wrap.appendChild(row);
  });

  return wrap;
}
