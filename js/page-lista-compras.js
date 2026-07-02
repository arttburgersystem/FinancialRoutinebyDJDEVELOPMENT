// ── LISTA DE COMPRAS ──────────────────────────────────────────────────────────

var _LC_CATS = [
  '🥩 Carnes e Proteínas','🥦 Hortifruti','🧀 Laticínios','🍞 Padaria',
  '🫙 Mercearia','🧴 Limpeza','📦 Embalagens','🍺 Bebidas',
  '🔧 Manutenção','👕 Uniformes','🖊️ Escritório','⛽ Combustível','📋 Outros',
];

var _LC_UNIDADES = ['un','kg','g','L','mL','cx','pct','sc','frd','dúz','maço','rolo','m'];

// ── CRUD de listas ────────────────────────────────────────────────────────────

function _lcSalvarListas(listas) {
  lsSet('shopLists', listas);
  setState({ shopLists: listas });
  scheduleSave();
}

function _lcAddLista(nome) {
  if (!nome || !nome.trim()) return;
  var lista = { id: uid(), profile: state.profile, nome: nome.trim(), items: [], criadoEm: new Date().toISOString() };
  var todas = (state.shopLists || []).concat([lista]);
  lsSet('shopLists', todas);
  setState({ shopLists: todas, shopListSel: lista.id, shopListModal: null });
  scheduleSave();
}

function _lcRenomear(listId, nome) {
  if (!nome || !nome.trim()) return;
  var todas = (state.shopLists || []).map(function(l) { return l.id === listId ? Object.assign({}, l, { nome: nome.trim() }) : l; });
  _lcSalvarListas(todas);
  setState({ shopListModal: null });
}

function _lcExcluirLista(listId) {
  if (!confirm('Excluir esta lista de compras?')) return;
  var todas = (state.shopLists || []).filter(function(l) { return l.id !== listId; });
  var sel = todas.length > 0 && todas[0].profile === state.profile ? todas[0].id : null;
  lsSet('shopLists', todas);
  setState({ shopLists: todas, shopListSel: sel, shopListModal: null });
  scheduleSave();
}

// ── CRUD de itens ─────────────────────────────────────────────────────────────

function _lcSalvarItem(listId, item) {
  var todas = (state.shopLists || []).map(function(l) {
    if (l.id !== listId) return l;
    var items = l.items || [];
    var existe = items.find(function(i) { return i.id === item.id; });
    return Object.assign({}, l, {
      items: existe
        ? items.map(function(i) { return i.id === item.id ? item : i; })
        : items.concat([item]),
    });
  });
  _lcSalvarListas(todas);
  setState({ shopItemModal: null });
}

function _lcToggleItem(listId, itemId) {
  var todas = (state.shopLists || []).map(function(l) {
    if (l.id !== listId) return l;
    return Object.assign({}, l, {
      items: (l.items || []).map(function(i) { return i.id === itemId ? Object.assign({}, i, { comprado: !i.comprado }) : i; }),
    });
  });
  _lcSalvarListas(todas);
}

function _lcExcluirItem(listId, itemId) {
  var todas = (state.shopLists || []).map(function(l) {
    if (l.id !== listId) return l;
    return Object.assign({}, l, { items: (l.items || []).filter(function(i) { return i.id !== itemId; }) });
  });
  _lcSalvarListas(todas);
  setState({ shopItemModal: null });
}

function _lcLimparComprados(listId) {
  if (!confirm('Remover todos os itens já comprados?')) return;
  var todas = (state.shopLists || []).map(function(l) {
    if (l.id !== listId) return l;
    return Object.assign({}, l, { items: (l.items || []).filter(function(i) { return !i.comprado; }) });
  });
  _lcSalvarListas(todas);
}

// ── MODAL Lista ───────────────────────────────────────────────────────────────

function renderShopListModal() {
  var m = state.shopListModal;
  if (!m) return null;
  var edit = m.editItem;
  var isEdit = !!(edit && edit.id);

  var inp = el('input', { class: 'form-input', id: 'slm-nome', placeholder: 'Ex: Feira semanal, Atacado do mês...', style: { marginBottom: '16px' } });
  if (isEdit) inp.value = edit.nome || '';

  function salvar() {
    var nome = document.getElementById('slm-nome') && document.getElementById('slm-nome').value;
    if (isEdit) _lcRenomear(edit.id, nome);
    else _lcAddLista(nome);
  }

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Renomear lista' : '📋 Nova lista de compras'),
      el('button', { class: 'modal-close', onclick: function() { setState({ shopListModal: null }); } }, '×'),
    ]),
    div('form-group', [el('label', { class: 'form-label' }, 'Nome da lista'), inp]),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir lista', function() { _lcExcluirLista(edit.id); }) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ shopListModal: null }); }),
      btn('btn-primary', isEdit ? 'Renomear' : 'Criar lista', salvar),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '400px';
  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ shopListModal: null }); };
  return ov;
}

// ── MODAL Item ────────────────────────────────────────────────────────────────

function renderShopItemModal() {
  var m = state.shopItemModal;
  if (!m) return null;
  var edit = m.editItem || {};
  var isEdit = !!edit.id;
  var listId = m.listId;

  function g(id) { var e = document.getElementById('sim-' + id); return e ? e.value : ''; }
  function inp(id, type, ph, val) {
    var i = el('input', { class: 'form-input', type: type || 'text', id: 'sim-' + id, placeholder: ph || '' });
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }
  function selEl(id, opts, val) {
    var s = el('select', { class: 'form-input', id: 'sim-' + id });
    opts.forEach(function(o) {
      var opt = el('option', { value: o }, o);
      if (o === val) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function salvar() {
    var nome = g('nome').trim();
    if (!nome) { showToast('Informe o nome do item', 'error'); return; }
    var item = {
      id:       edit.id || uid(),
      nome:     nome,
      qtd:      parseFloat(g('qtd')) || 1,
      unidade:  g('unidade') || 'un',
      categoria: g('categoria') || '',
      precoEst: parseFloat(g('precoEst')) || 0,
      comprado: edit.comprado || false,
      obs:      g('obs').trim(),
    };
    _lcSalvarItem(listId, item);
  }

  var catOpts = ['— Categoria —'].concat(_LC_CATS);

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar item' : '➕ Adicionar item'),
      el('button', { class: 'modal-close', onclick: function() { setState({ shopItemModal: null }); } }, '×'),
    ]),
    div('form-group', [el('label', { class: 'form-label' }, 'Item *'), inp('nome', 'text', 'Ex: Tomate, Frango, Sabão...', edit.nome)]),
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } }, [
      div('form-group', [el('label', { class: 'form-label' }, 'Quantidade'), inp('qtd', 'number', '1', edit.qtd !== undefined ? edit.qtd : 1)]),
      div('form-group', [el('label', { class: 'form-label' }, 'Unidade'), selEl('unidade', _LC_UNIDADES, edit.unidade || 'un')]),
    ]),
    div('form-group', [el('label', { class: 'form-label' }, 'Categoria'), selEl('categoria', catOpts, edit.categoria || '— Categoria —')]),
    div('form-group', [el('label', { class: 'form-label' }, 'Preço estimado (R$)'), inp('precoEst', 'number', '0,00', edit.precoEst || '')]),
    div('form-group', [el('label', { class: 'form-label' }, 'Observação'), inp('obs', 'text', 'Ex: sem glúten, marca X...', edit.obs || '')]),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', function() { _lcExcluirItem(listId, edit.id); }) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ shopItemModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '➕ Adicionar', salvar),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '420px';
  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ shopItemModal: null }); };
  return ov;
}

// ── PÁGINA ────────────────────────────────────────────────────────────────────

function renderListaCompras() {
  var pf = state.profile;
  var todasListas = (state.shopLists || []).filter(function(l) { return l.profile === pf; });

  var selId = state.shopListSel;
  if (!selId && todasListas.length > 0) selId = todasListas[0].id;
  var listaAtual = todasListas.find(function(l) { return l.id === selId; }) || null;

  var filtroSel = state.shopListFiltro || 'todos';

  // ── Abas das listas ────────────────────────────────────────────────────────
  var abas = el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' } }, [
    ...todasListas.map(function(l) {
      var items = l.items || [];
      var done  = items.filter(function(i) { return i.comprado; }).length;
      var total = items.length;
      var ativa = l.id === selId;
      var pct   = total > 0 ? Math.round(done / total * 100) : 0;

      var aba = el('button', {
        style: {
          padding: '7px 14px', borderRadius: '20px', border: '1px solid ' + (ativa ? 'var(--gold)' : 'var(--border)'),
          background: ativa ? 'var(--gold)22' : 'var(--bg2)', color: ativa ? 'var(--gold)' : 'var(--text2)',
          fontSize: '13px', fontWeight: ativa ? '700' : '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
        },
        onclick: function() { setState({ shopListSel: l.id, shopListFiltro: 'todos' }); },
      }, [
        el('span', {}, l.nome),
        total > 0 ? el('span', { style: {
          fontSize: '11px', background: done === total ? '#00a86b33' : 'var(--bg3)',
          color: done === total ? '#00a86b' : 'var(--text3)',
          borderRadius: '10px', padding: '1px 6px',
        } }, done + '/' + total) : null,
      ].filter(Boolean));
      return aba;
    }),
    el('button', { class: 'btn-ghost', style: { fontSize: '12px', padding: '6px 12px', borderRadius: '20px' }, onclick: function() { setState({ shopListModal: { editItem: null } }); } }, '+ Nova lista'),
  ]);

  // Sem listas
  if (todasListas.length === 0) {
    return div('', [
      div('page-header', [el('h1', {}, '🛍️ Lista de Compras'), el('p', {}, 'Planeje suas compras com organização')]),
      div('card', [
        div('empty', [
          div('empty-icon', '🛍️'),
          div('empty-title', 'Nenhuma lista criada'),
          div('empty-sub', 'Crie uma lista para começar a planejar suas compras'),
          btn('btn-primary', '+ Nova lista', function() { setState({ shopListModal: { editItem: null } }); }),
        ]),
      ]),
    ]);
  }

  // Sem lista selecionada / lista não encontrada
  if (!listaAtual) {
    return div('', [
      div('page-header', [el('h1', {}, '🛍️ Lista de Compras')]),
      abas,
    ]);
  }

  var items = listaAtual.items || [];
  var comprados = items.filter(function(i) { return i.comprado; }).length;
  var pendentes = items.length - comprados;
  var estTotal  = items.reduce(function(a, i) { return a + (i.precoEst || 0) * (i.qtd || 1); }, 0);
  var estPendente = items.filter(function(i) { return !i.comprado; }).reduce(function(a, i) { return a + (i.precoEst || 0) * (i.qtd || 1); }, 0);
  var pct = items.length > 0 ? Math.round(comprados / items.length * 100) : 0;

  // ── Barra de progresso ────────────────────────────────────────────────────
  var progressBar = div('card', { style: { marginBottom: '14px' } }, [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
        el('span', { style: { fontSize: '16px', fontWeight: '700', color: 'var(--text)' } }, listaAtual.nome),
        el('button', { class: 'btn-icon edit', style: { padding: '4px 8px', fontSize: '12px' }, onclick: function() { setState({ shopListModal: { editItem: listaAtual } }); } }, '✏️'),
      ]),
      el('span', { style: { fontSize: '13px', color: 'var(--text3)' } }, comprados + ' de ' + items.length + ' itens · Est. ' + fmtMoney(estTotal)),
    ]),
    el('div', { style: { height: '8px', background: 'var(--bg3)', borderRadius: '4px', overflow: 'hidden' } }, [
      el('div', { style: { height: '100%', width: pct + '%', background: pct === 100 ? '#00a86b' : 'var(--gold)', borderRadius: '4px', transition: 'width .3s' } }),
    ]),
    el('div', { style: { display: 'flex', gap: '20px', marginTop: '10px' } }, [
      el('span', { style: { fontSize: '12px', color: '#00a86b', fontWeight: '600' } }, '✅ ' + comprados + ' comprado(s)'),
      el('span', { style: { fontSize: '12px', color: 'var(--gold)', fontWeight: '600' } }, '⏳ ' + pendentes + ' pendente(s)'),
      estPendente > 0 ? el('span', { style: { fontSize: '12px', color: 'var(--text3)' } }, 'Ainda a gastar: ' + fmtMoney(estPendente)) : null,
      pct === 100 && items.length > 0 ? el('span', { style: { fontSize: '12px', color: '#00a86b', fontWeight: '700' } }, '🎉 Lista completa!') : null,
    ].filter(Boolean)),
  ]);

  // ── Filtros ───────────────────────────────────────────────────────────────
  var filtros = el('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' } }, [
    ['todos', 'Todos (' + items.length + ')'],
    ['pendente', 'Pendentes (' + pendentes + ')'],
    ['comprado', 'Comprados (' + comprados + ')'],
  ].map(function(f) {
    return el('button', { class: 'chip' + (filtroSel === f[0] ? ' active' : ''), onclick: function() { setState({ shopListFiltro: f[0] }); } }, f[1]);
  }));

  // ── Itens filtrados agrupados por categoria ────────────────────────────────
  var itensFiltrados = items.filter(function(i) {
    if (filtroSel === 'pendente') return !i.comprado;
    if (filtroSel === 'comprado') return i.comprado;
    return true;
  });

  // Agrupar por categoria
  var grupos = {};
  itensFiltrados.forEach(function(i) {
    var cat = i.categoria && i.categoria !== '— Categoria —' ? i.categoria : '📋 Outros';
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(i);
  });

  // Ordenar: pendentes primeiro dentro de cada grupo
  Object.keys(grupos).forEach(function(cat) {
    grupos[cat].sort(function(a, b) { return (a.comprado ? 1 : 0) - (b.comprado ? 1 : 0); });
  });

  function renderItem(item) {
    var subtotal = (item.precoEst || 0) * (item.qtd || 1);
    return el('div', { style: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px',
      borderBottom: '1px solid var(--border)',
      background: item.comprado ? 'var(--bg2)' : '',
      opacity: item.comprado ? '0.65' : '1',
      transition: 'all .2s',
    } }, [
      // Checkbox
      el('button', {
        style: {
          width: '24px', height: '24px', borderRadius: '50%', flexShrink: '0',
          border: '2px solid ' + (item.comprado ? '#00a86b' : 'var(--border)'),
          background: item.comprado ? '#00a86b' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', color: '#fff', transition: 'all .15s',
        },
        onclick: function() { _lcToggleItem(listaAtual.id, item.id); },
      }, item.comprado ? '✓' : ''),

      // Nome + obs
      el('div', { style: { flex: '1' } }, [
        el('div', { style: {
          fontSize: '14px', fontWeight: '500',
          color: item.comprado ? 'var(--text3)' : 'var(--text)',
          textDecoration: item.comprado ? 'line-through' : 'none',
        } }, item.nome),
        item.obs ? el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '1px' } }, item.obs) : null,
      ].filter(Boolean)),

      // Qtd + unidade
      el('span', { style: { fontSize: '13px', color: 'var(--text3)', minWidth: '60px', textAlign: 'center' } },
        (item.qtd || 1) + ' ' + (item.unidade || 'un')),

      // Preço estimado
      el('span', { style: { fontSize: '13px', color: item.comprado ? 'var(--text3)' : 'var(--text2)', minWidth: '80px', textAlign: 'right', fontWeight: '600' } },
        subtotal > 0 ? fmtMoney(subtotal) : '—'),

      // Editar
      el('button', { class: 'btn-icon edit', style: { opacity: '0', transition: 'opacity .2s' },
        onmouseenter: function(e) { e.currentTarget.style.opacity = '1'; },
        onmouseleave: function(e) { e.currentTarget.style.opacity = '0'; },
        onclick: function(e) { e.stopPropagation(); setState({ shopItemModal: { listId: listaAtual.id, editItem: item } }); },
      }, '✏️'),
    ]);
  }

  var listaEl;
  if (itensFiltrados.length === 0) {
    listaEl = div('empty', [div('empty-icon', '🛍️'), div('empty-title', items.length === 0 ? 'Lista vazia' : 'Nenhum item nesse filtro')]);
  } else {
    var grupos_keys = Object.keys(grupos).sort(function(a, b) {
      // Pendentes primeiro — calcula por grupo
      var aPend = grupos[a].some(function(i) { return !i.comprado; });
      var bPend = grupos[b].some(function(i) { return !i.comprado; });
      return (bPend ? 1 : 0) - (aPend ? 1 : 0) || a.localeCompare(b);
    });
    listaEl = el('div', {}, grupos_keys.map(function(cat) {
      var catItems = grupos[cat];
      var catEst = catItems.reduce(function(a, i) { return a + (i.precoEst || 0) * (i.qtd || 1); }, 0);
      return el('div', {}, [
        el('div', { style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 14px 4px',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
        } }, [
          el('span', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, cat),
          catEst > 0 ? el('span', { style: { fontSize: '11px', color: 'var(--text3)' } }, fmtMoney(catEst)) : null,
        ].filter(Boolean)),
        el('div', {}, catItems.map(renderItem)),
      ]);
    }));
  }

  var card = div('card', { style: { padding: '0', overflow: 'hidden' } }, [listaEl]);

  // ── Footer actions ─────────────────────────────────────────────────────────
  var footerActions = el('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } }, [
    btn('btn-primary', '+ Adicionar item', function() { setState({ shopItemModal: { listId: listaAtual.id, editItem: null } }); }),
    comprados > 0 ? btn('btn-ghost', '🗑️ Limpar comprados', function() { _lcLimparComprados(listaAtual.id); }) : null,
    items.length > 0 ? btn('btn-ghost', '📤 Compartilhar lista', function() {
      var txt = '📋 ' + listaAtual.nome + '\n\n';
      Object.keys(grupos).forEach(function(cat) {
        txt += cat.toUpperCase() + '\n';
        grupos[cat].forEach(function(i) { txt += (i.comprado ? '✅' : '⬜') + ' ' + i.nome + ' — ' + (i.qtd || 1) + ' ' + (i.unidade || 'un') + (i.precoEst ? ' · R$ ' + ((i.precoEst * (i.qtd || 1)).toFixed(2)).replace('.', ',') : '') + '\n'; });
        txt += '\n';
      });
      txt += '\nTotal estimado: ' + fmtMoney(estTotal);
      if (navigator.share) { navigator.share({ title: listaAtual.nome, text: txt }); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(function() { showToast('Lista copiada!'); }); }
    }) : null,
  ].filter(Boolean));

  return div('', [
    div('page-header', [
      el('h1', {}, '🛍️ Lista de Compras'),
      el('p', {}, 'Planeje e acompanhe suas compras com organização'),
    ]),
    abas,
    progressBar,
    filtros,
    card,
    footerActions,
  ]);
}
