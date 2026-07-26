// ── ESTOQUE ROTATIVO ─────────────────────────────────────────────────────────
// Usa o MESMO catálogo do Estoque Estacionado (state.estoqueItens) — cada
// produto tem uma quantidade "estacionada" (item.estoqueAtual) e uma
// quantidade "rotativa" (item.estoqueRotativoQtd). O Rotativo só é abastecido
// por transferência vinda do Estacionado (pelo tablet de Requisição ou pelo
// botão "Transferir" aqui dentro); o consumo/uso final sai daqui.

// Move quantidade do Estacionado pro Rotativo, em lote (uma ou mais linhas de
// uma vez), registrando UMA movimentação tipo "transferencia" por item.
// Não bloqueia se a quantidade for maior que o disponível no Estacionado —
// quem decide se segue mesmo assim é a tela que chama essa função (mesmo
// padrão já usado no tablet de Requisição, que sempre permitiu isso com
// confirmação do usuário).
function _erTransferirLote(linhas, funcId, funcNome, obsExtra) {
  var pf = state.profile;
  var itens = (state.estoqueItens || []).slice();
  var movs = (state.estoqueMovs || []).slice();
  var now = new Date().toISOString();
  var dataHj = now.slice(0, 10);
  var erros = [];
  var count = 0;

  linhas.forEach(function(l) {
    var idx = -1;
    for (var i = 0; i < itens.length; i++) { if (itens[i].id === l.itemId) { idx = i; break; } }
    if (idx < 0) { erros.push((l.nome || l.itemId) + ': produto não encontrado'); return; }
    var qtd = parseFloat(l.qtd) || 0;
    if (qtd <= 0) { erros.push(itens[idx].nome + ': quantidade inválida'); return; }
    var item = itens[idx];
    var qtdEstAntes = item.estoqueAtual || 0;
    var qtdRotAntes = item.estoqueRotativoQtd || 0;
    var qtdEstDepois = Math.round((qtdEstAntes - qtd) * 1000) / 1000;
    var qtdRotDepois = Math.round((qtdRotAntes + qtd) * 1000) / 1000;
    itens[idx] = Object.assign({}, item, { estoqueAtual: qtdEstDepois, estoqueRotativoQtd: qtdRotDepois, atualizadoEm: now });
    movs.push({
      id: uid(), profile: pf, insumoId: item.id, insumoNome: item.nome,
      tipo: 'transferencia', origem: 'estacionado', destino: 'rotativo',
      quantidade: qtd, custoUnit: item.custoMedio || null, valorTotal: (qtd * (item.custoMedio || 0)) || null,
      qtdAntes: qtdEstAntes, qtdDepois: qtdEstDepois,
      qtdRotativoAntes: qtdRotAntes, qtdRotativoDepois: qtdRotDepois,
      motivo: 'Abastecimento Estoque Rotativo',
      funcId: funcId || null, funcNome: funcNome || null,
      data: dataHj, obs: obsExtra || '', criadoEm: now,
    });
    count++;
  });

  if (count > 0) {
    lsSet('estoqueItens', itens);
    lsSet('estoqueMovs', movs);
    setState({ estoqueItens: itens, estoqueMovs: movs });
    scheduleSave();
  }
  return { erros: erros, count: count };
}

// Dá baixa de uso/consumo final no Rotativo (item saiu de vez do sistema —
// foi usado na produção, na venda, ou virou gasto da loja). Mesma lógica de
// não bloquear sozinho por quantidade — quem decide é a tela chamadora.
function _erRegistrarConsumoLote(linhas, motivo, obsExtra) {
  var pf = state.profile;
  var itens = (state.estoqueItens || []).slice();
  var movs = (state.estoqueMovs || []).slice();
  var now = new Date().toISOString();
  var dataHj = now.slice(0, 10);
  var erros = [];
  var count = 0;

  linhas.forEach(function(l) {
    var idx = -1;
    for (var i = 0; i < itens.length; i++) { if (itens[i].id === l.itemId) { idx = i; break; } }
    if (idx < 0) { erros.push((l.nome || l.itemId) + ': produto não encontrado'); return; }
    var qtd = parseFloat(l.qtd) || 0;
    if (qtd <= 0) { erros.push(itens[idx].nome + ': quantidade inválida'); return; }
    var item = itens[idx];
    var qtdRotAntes = item.estoqueRotativoQtd || 0;
    var qtdRotDepois = Math.round((qtdRotAntes - qtd) * 1000) / 1000;
    itens[idx] = Object.assign({}, item, { estoqueRotativoQtd: qtdRotDepois, atualizadoEm: now });
    movs.push({
      id: uid(), profile: pf, insumoId: item.id, insumoNome: item.nome,
      tipo: 'saida', origem: 'rotativo',
      quantidade: qtd, custoUnit: item.custoMedio || null, valorTotal: (qtd * (item.custoMedio || 0)) || null,
      qtdAntes: qtdRotAntes, qtdDepois: qtdRotDepois,
      motivo: motivo || 'Consumo/Uso', data: dataHj, obs: obsExtra || '', criadoEm: now,
    });
    count++;
  });

  if (count > 0) {
    lsSet('estoqueItens', itens);
    lsSet('estoqueMovs', movs);
    setState({ estoqueItens: itens, estoqueMovs: movs });
    scheduleSave();
  }
  return { erros: erros, count: count };
}

function renderEstoqueRotativo() {
  var pf = state.profile;
  var itens = (state.estoqueItens || []).filter(function(x) { return x.profile === pf; })
    .sort(function(a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
  var movsRot = (state.estoqueMovs || []).filter(function(x) {
    return x.profile === pf && (x.destino === 'rotativo' || x.origem === 'rotativo');
  });
  var tab = state.erTab || 'itens';
  var busca = state.erBusca || '';

  var comRotativo = itens.filter(function(x) { return (x.estoqueRotativoQtd || 0) > 0; });
  var valorRotativo = itens.reduce(function(a, x) { return a + (x.estoqueRotativoQtd || 0) * (x.custoMedio || 0); }, 0);
  var zerados = itens.filter(function(x) { return (x.estoqueRotativoQtd || 0) <= 0; }).length;

  var kpiGrid = el('div', { class: 'kpi-grid', style: { marginBottom: '14px' } });
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Valor no Rotativo'),
    el('div', { class: 'kpi-value', style: { color: 'var(--gold)' } }, fmtMoney(valorRotativo)),
    el('div', { class: 'kpi-sub' }, comRotativo.length + ' produto(s) abastecido(s)'),
  ]));
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Zerados no Rotativo'),
    el('div', { class: 'kpi-value', style: { color: zerados > 0 ? '#e05252' : 'var(--text)' } }, String(zerados)),
    el('div', { class: 'kpi-sub' }, 'precisam de transferência'),
  ]));
  kpiGrid.appendChild(el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-label' }, 'Itens cadastrados'),
    el('div', { class: 'kpi-value' }, String(itens.length)),
    el('div', { class: 'kpi-sub' }, 'no catálogo geral'),
  ]));

  var tabsEl = el('div', { style: { display: 'flex', gap: '0', marginBottom: '14px', borderBottom: '2px solid var(--border)' } });
  [
    { id: 'itens', label: '🔄 Itens (' + itens.length + ')' },
    { id: 'movs', label: '📜 Movimentações (' + movsRot.length + ')' },
  ].forEach(function(t) {
    var isActive = tab === t.id;
    var tb = el('button', {}, t.label);
    tb.style.cssText = 'padding:8px 16px;border:none;cursor:pointer;font-size:13px;background:none;margin-bottom:-2px;border-bottom:2px solid ' + (isActive ? 'var(--primary)' : 'transparent') + ';color:' + (isActive ? 'var(--primary)' : 'var(--text3)') + ';font-weight:' + (isActive ? '700' : '500') + ';';
    (function(tid) { tb.onclick = function() { setState({ erTab: tid }); }; })(t.id);
    tabsEl.appendChild(tb);
  });

  var leftFilters = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } });
  var rightBtns = el('div', { style: { display: 'flex', gap: '6px' } });

  if (tab === 'itens') {
    var buscaInp = el('input', { class: 'form-input', placeholder: 'Buscar produto...', style: { fontSize: '12px', padding: '5px 10px', maxWidth: '200px' } });
    buscaInp.value = busca;
    buscaInp.oninput = function(e) { setState({ erBusca: e.target.value }); };
    leftFilters.appendChild(buscaInp);

    rightBtns.appendChild(btn('btn-ghost', '📤 Registrar Consumo', function() { setState({ erConsumoModal: { itemId: itens[0] ? itens[0].id : '', qtd: '', motivo: '' } }); }));
    rightBtns.appendChild(btn('btn-primary', '🔽 Transferir do Estacionado', function() { setState({ erTransferModal: { itemId: itens[0] ? itens[0].id : '', qtd: '' } }); }));
  }

  var actionRow = el('div', { class: 'action-row' }, [leftFilters]);
  actionRow.appendChild(rightBtns);

  var content = tab === 'itens' ? _erRenderItens(itens, busca) : _erRenderMovs(movsRot);

  var wrap = div('', []);
  wrap.appendChild(div('page-header', [
    el('h1', {}, '🔄 Estoque Rotativo'),
    el('p', {}, 'Insumos abastecidos a partir do Estoque Estacionado, prontos pra manipulação/venda — ' + pf),
  ]));
  wrap.appendChild(actionRow);
  wrap.appendChild(kpiGrid);
  wrap.appendChild(tabsEl);
  wrap.appendChild(content);
  if (state.erTransferModal) wrap.appendChild(_erRenderTransferModal(itens));
  if (state.erConsumoModal) wrap.appendChild(_erRenderConsumoModal(itens));
  return wrap;
}

function _erRenderItens(itens, busca) {
  var filtrados = itens.filter(function(x) {
    if (!busca) return true;
    var b = busca.toLowerCase();
    return (x.nome || '').toLowerCase().indexOf(b) >= 0 || (x.categoria || '').toLowerCase().indexOf(b) >= 0;
  });

  var wrap = el('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } });
  var cols = '2.5fr 100px 55px 100px 100px 100px 110px';
  var hdrData = ['Produto', 'Categoria', 'Und', 'No Rotativo', 'No Estacionado', 'C. Médio', 'Ações'];
  var hdr = el('div', { style: { display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '2px solid var(--border)' } });
  hdrData.forEach(function(h, i) {
    var align = (i >= 3 && i <= 5) ? 'right' : i === 6 ? 'center' : 'left';
    hdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: align } }, h));
  });
  wrap.appendChild(hdr);

  if (filtrados.length === 0) {
    wrap.appendChild(div('empty', [
      div('empty-icon', '🔄'),
      div('empty-title', itens.length === 0 ? 'Nenhum produto cadastrado no Estoque Estacionado ainda' : 'Nenhum resultado'),
      div('empty-sub', itens.length === 0 ? 'Cadastre produtos no Estoque Estacionado primeiro' : 'Ajuste a busca'),
    ]));
    return wrap;
  }

  filtrados.forEach(function(item) {
    var qtdRot = item.estoqueRotativoQtd || 0;
    var cor = qtdRot <= 0 ? '#e05252' : '#00a86b';

    var row = el('div', { style: {
      display: 'grid', gridTemplateColumns: cols,
      gap: '6px', padding: '10px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    }});
    row.onmouseenter = function() { row.style.background = 'var(--bg2)'; };
    row.onmouseleave = function() { row.style.background = ''; };

    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, item.nome || '—'));
    row.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, item.categoria || '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } }, item.unidade || '—'));
    row.appendChild(el('div', { style: { fontSize: '14px', fontWeight: '700', color: cor, textAlign: 'right' } },
      Number.isInteger(qtdRot) ? String(qtdRot) : qtdRot.toFixed(2)));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } },
      Number.isInteger(item.estoqueAtual || 0) ? String(item.estoqueAtual || 0) : (item.estoqueAtual || 0).toFixed(2)));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } },
      item.custoMedio ? fmtMoney(item.custoMedio) : '—'));

    var actCol = el('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' } });
    var iCopy = item;
    var transfBtn = el('button', { title: 'Transferir do Estacionado' }, '🔽');
    transfBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 5px;font-size:11px;';
    transfBtn.onclick = function() { setState({ erTransferModal: { itemId: iCopy.id, qtd: '' } }); };
    actCol.appendChild(transfBtn);
    var consBtn = el('button', { title: 'Registrar consumo/uso' }, '📤');
    consBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 5px;font-size:11px;';
    consBtn.onclick = function() { setState({ erConsumoModal: { itemId: iCopy.id, qtd: '', motivo: '' } }); };
    actCol.appendChild(consBtn);
    row.appendChild(actCol);

    wrap.appendChild(row);
  });

  return wrap;
}

function _erRenderMovs(movs) {
  var sorted = movs.slice().sort(function(a, b) {
    return (b.data || b.criadoEm || '').localeCompare(a.data || a.criadoEm || '');
  }).slice(0, 300);

  var wrap = el('div', { class: 'card', style: { padding: '0', overflow: 'hidden' } });
  var cols = '90px 2fr 120px 80px 100px 2fr';
  var hdr = el('div', { style: { display: 'grid', gridTemplateColumns: cols, gap: '6px', padding: '8px 14px', background: 'var(--bg2)', borderBottom: '2px solid var(--border)' } });
  ['Data', 'Produto', 'Tipo', 'Qtd', 'Total', 'Motivo / Obs'].forEach(function(h, i) {
    hdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: i >= 2 ? 'center' : 'left' } }, h));
  });
  wrap.appendChild(hdr);

  if (sorted.length === 0) {
    wrap.appendChild(div('empty', [div('empty-icon', '📜'), div('empty-title', 'Nenhuma movimentação no Rotativo ainda')]));
    return wrap;
  }

  sorted.forEach(function(mov) {
    var isTransf = mov.tipo === 'transferencia';
    var tc = isTransf
      ? { cor: '#38bdf8', bg: '#38bdf822', label: '🔽 Abastecimento' }
      : { cor: '#e05252', bg: '#e0525222', label: '📤 Consumo/Uso' };

    var row = el('div', { style: {
      display: 'grid', gridTemplateColumns: cols,
      gap: '6px', padding: '9px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center',
    }});
    row.onmouseenter = function() { row.style.background = 'var(--bg2)'; };
    row.onmouseleave = function() { row.style.background = ''; };

    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)' } }, mov.data ? fmtDate(mov.data) : '—'));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, mov.insumoNome || '—'));
    row.appendChild(el('div', { style: { textAlign: 'center' } }, [
      el('span', { style: { fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', color: tc.cor, background: tc.bg, whiteSpace: 'nowrap' } }, tc.label),
    ]));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '700', color: tc.cor, textAlign: 'center' } }, (isTransf ? '+' : '−') + (mov.quantidade || 0)));
    row.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)', textAlign: 'center' } }, mov.valorTotal ? fmtMoney(mov.valorTotal) : '—'));
    row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)' } }, [mov.motivo, mov.obs].filter(Boolean).join(' — ') || '—'));

    wrap.appendChild(row);
  });

  return wrap;
}

function _erRenderTransferModal(itens) {
  var m = state.erTransferModal;
  if (!m) return null;
  var item = itens.find(function(x) { return x.id === m.itemId; }) || itens[0];

  var sel = el('select', { class: 'form-input' });
  itens.forEach(function(x) {
    var opt = el('option', {}, x.nome + ' (estacionado: ' + (x.estoqueAtual || 0) + ' ' + (x.unidade || 'un') + ')');
    opt.value = x.id;
    if (item && x.id === item.id) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = function() { setState({ erTransferModal: Object.assign({}, m, { itemId: sel.value }) }); };

  var qtdInp = el('input', { class: 'form-input', type: 'number', min: '0', step: '0.001', placeholder: '0', value: m.qtd || '' });
  qtdInp.oninput = function(e) { m.qtd = e.target.value; };

  var titleBar = div('modal-title', [
    el('span', { style: { flex: '1' } }, '🔽 Transferir para o Rotativo'),
    el('button', { class: 'modal-close', onclick: function() { setState({ erTransferModal: null }); } }, '×'),
  ]);
  var body = el('div', {}, [
    div('form-group', [el('label', { class: 'form-label' }, 'Produto'), sel]),
    div('form-group', [el('label', { class: 'form-label' }, 'Quantidade a transferir'), qtdInp]),
  ]);
  var footer = div('modal-actions', [
    btn('btn-ghost', 'Cancelar', function() { setState({ erTransferModal: null }); }),
    btn('btn-primary', '✓ Transferir', function() {
      var qtd = parseFloat(qtdInp.value) || 0;
      if (!item || qtd <= 0) { showToast('Informe uma quantidade válida', 'error'); return; }
      var disp = item.estoqueAtual || 0;
      if (qtd > disp && !confirm('Quantidade (' + qtd + ') maior que o disponível no Estacionado (' + disp + ').\nContinuar mesmo assim?')) return;
      var su = state.sessionUser;
      var res = _erTransferirLote([{ itemId: item.id, qtd: qtd, nome: item.nome }], null, su ? su.nome : '', 'Transferência manual');
      if (res.erros.length) { showToast(res.erros.join(' | '), 'error'); return; }
      setState({ erTransferModal: null });
      showToast('Transferido pro Estoque Rotativo!');
    }),
  ]);

  var modal = div('modal', [titleBar, body, footer]);
  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ erTransferModal: null }); };
  return ov;
}

function _erRenderConsumoModal(itens) {
  var m = state.erConsumoModal;
  if (!m) return null;
  var item = itens.find(function(x) { return x.id === m.itemId; }) || itens[0];

  var sel = el('select', { class: 'form-input' });
  itens.forEach(function(x) {
    var opt = el('option', {}, x.nome + ' (rotativo: ' + (x.estoqueRotativoQtd || 0) + ' ' + (x.unidade || 'un') + ')');
    opt.value = x.id;
    if (item && x.id === item.id) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = function() { setState({ erConsumoModal: Object.assign({}, m, { itemId: sel.value }) }); };

  var qtdInp = el('input', { class: 'form-input', type: 'number', min: '0', step: '0.001', placeholder: '0', value: m.qtd || '' });
  qtdInp.oninput = function(e) { m.qtd = e.target.value; };

  var motivoInp = el('input', { class: 'form-input', placeholder: 'Ex: Produção do dia, gasto da loja, perda...', value: m.motivo || '' });
  motivoInp.oninput = function(e) { m.motivo = e.target.value; };

  var titleBar = div('modal-title', [
    el('span', { style: { flex: '1' } }, '📤 Registrar Consumo/Uso'),
    el('button', { class: 'modal-close', onclick: function() { setState({ erConsumoModal: null }); } }, '×'),
  ]);
  var body = el('div', {}, [
    div('form-group', [el('label', { class: 'form-label' }, 'Produto'), sel]),
    div('form-group', [el('label', { class: 'form-label' }, 'Quantidade usada/consumida'), qtdInp]),
    div('form-group', [el('label', { class: 'form-label' }, 'Motivo (opcional)'), motivoInp]),
  ]);
  var footer = div('modal-actions', [
    btn('btn-ghost', 'Cancelar', function() { setState({ erConsumoModal: null }); }),
    btn('btn-primary', '✓ Registrar', function() {
      var qtd = parseFloat(qtdInp.value) || 0;
      if (!item || qtd <= 0) { showToast('Informe uma quantidade válida', 'error'); return; }
      var disp = item.estoqueRotativoQtd || 0;
      if (qtd > disp && !confirm('Quantidade (' + qtd + ') maior que o disponível no Rotativo (' + disp + ').\nContinuar mesmo assim?')) return;
      var res = _erRegistrarConsumoLote([{ itemId: item.id, qtd: qtd, nome: item.nome }], motivoInp.value.trim() || 'Consumo/Uso', '');
      if (res.erros.length) { showToast(res.erros.join(' | '), 'error'); return; }
      setState({ erConsumoModal: null });
      showToast('Consumo registrado!');
    }),
  ]);

  var modal = div('modal', [titleBar, body, footer]);
  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ erConsumoModal: null }); };
  return ov;
}
