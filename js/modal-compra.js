// ── MODAL COMPRA ──────────────────────────────────────────────────────────────

var _cmItens   = [];
var _cmModalId = null;

function _cmNovoItem() {
  return { item: '', quantidade: 1, unidade: 'un', precoUnit: 0, valorTotal: 0 };
}

function _cmSomaTotal() {
  var t = 0;
  _cmItens.forEach(function(x) { t += parseFloat(x.valorTotal) || 0; });
  return t;
}

function _cmAtualizarTotal() {
  var totalEl = document.getElementById('cm-grand-total');
  if (totalEl) totalEl.textContent = fmtMoney(_cmSomaTotal());
}

function _cmRenderItens() {
  var container = document.getElementById('cm-itens-container');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  _cmItens.forEach(function(it, idx) {
    var row = el('div', { style: {
      display: 'grid',
      gridTemplateColumns: '3fr 68px 56px 110px 110px 28px',
      gap: '4px',
      marginBottom: '4px',
      alignItems: 'center',
    }});

    // Produto
    var nomeInp = el('input', { class: 'form-input', placeholder: 'Produto / serviço...', style: { fontSize: '12px' } });
    nomeInp.value = it.item || '';
    (function(i) { nomeInp.oninput = function(e) { _cmItens[i].item = e.target.value; }; })(idx);

    // Quantidade
    var qtdInp = el('input', { class: 'form-input', type: 'number', placeholder: '1', style: { fontSize: '12px' } });
    qtdInp.value = it.quantidade != null ? String(it.quantidade) : '1';
    qtdInp.setAttribute('min', '0');
    qtdInp.setAttribute('step', 'any');
    (function(i) {
      qtdInp.oninput = function(e) {
        _cmItens[i].quantidade = parseFloat(e.target.value) || 0;
        if (_cmItens[i].precoUnit) {
          _cmItens[i].valorTotal = _cmItens[i].quantidade * _cmItens[i].precoUnit;
          var t = document.getElementById('cmi-tot-' + i);
          if (t) t.value = _cmItens[i].valorTotal.toFixed(2);
        }
        _cmAtualizarTotal();
      };
    })(idx);

    // Unidade
    var undSel = el('select', { class: 'form-input', style: { fontSize: '11px', padding: '4px 3px' } });
    _COMPRAS_UNIDADES.forEach(function(u) {
      var opt = el('option', { value: u }, u);
      if (u === (it.unidade || 'un')) opt.selected = true;
      undSel.appendChild(opt);
    });
    (function(i) { undSel.onchange = function(e) { _cmItens[i].unidade = e.target.value; }; })(idx);

    // Preço unitário
    var puInp = el('input', { class: 'form-input', type: 'number', placeholder: '0,00', id: 'cmi-pu-' + idx, style: { fontSize: '12px' } });
    if (it.precoUnit) puInp.value = String(it.precoUnit);
    puInp.setAttribute('min', '0');
    puInp.setAttribute('step', '0.01');
    (function(i) {
      puInp.oninput = function(e) {
        _cmItens[i].precoUnit = parseFloat(e.target.value) || 0;
        var qtd = _cmItens[i].quantidade || 0;
        if (qtd) {
          _cmItens[i].valorTotal = _cmItens[i].precoUnit * qtd;
          var t = document.getElementById('cmi-tot-' + i);
          if (t) t.value = _cmItens[i].valorTotal.toFixed(2);
        }
        _cmAtualizarTotal();
      };
    })(idx);

    // Valor total (editável — recalcula preço unit)
    var totInp = el('input', { class: 'form-input', type: 'number', placeholder: '0,00', id: 'cmi-tot-' + idx, style: { fontSize: '12px', fontWeight: '700', color: 'var(--gold)' } });
    if (it.valorTotal) totInp.value = String(it.valorTotal);
    totInp.setAttribute('min', '0');
    totInp.setAttribute('step', '0.01');
    (function(i) {
      totInp.oninput = function(e) {
        _cmItens[i].valorTotal = parseFloat(e.target.value) || 0;
        var qtd = _cmItens[i].quantidade || 0;
        if (qtd && _cmItens[i].valorTotal) {
          _cmItens[i].precoUnit = _cmItens[i].valorTotal / qtd;
          var pu = document.getElementById('cmi-pu-' + i);
          if (pu) pu.value = _cmItens[i].precoUnit.toFixed(4);
        }
        _cmAtualizarTotal();
      };
    })(idx);

    // Remover linha
    var rmBtn = el('button', {}, '×');
    rmBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;color:#e05252;cursor:pointer;font-size:16px;line-height:1;padding:1px 5px;width:28px;text-align:center;flex-shrink:0;';
    (function(i) {
      rmBtn.onclick = function() {
        if (_cmItens.length === 1) { showToast('A compra deve ter ao menos 1 item', 'error'); return; }
        _cmItens.splice(i, 1);
        _cmRenderItens();
      };
    })(idx);

    row.appendChild(nomeInp);
    row.appendChild(qtdInp);
    row.appendChild(undSel);
    row.appendChild(puInp);
    row.appendChild(totInp);
    row.appendChild(rmBtn);
    container.appendChild(row);
  });

  _cmAtualizarTotal();
}

function renderCompraModal() {
  var m = state.compraModal;
  if (!m) { _cmModalId = null; return null; }

  var edit   = m.editItem || {};
  var isEdit = !!edit.id;
  var curId  = edit.id || '__new__';

  // Inicializa itens apenas ao abrir (não a cada re-render)
  if (curId !== _cmModalId) {
    _cmModalId = curId;
    if (isEdit && edit.itens && edit.itens.length) {
      _cmItens = edit.itens.map(function(x) { return Object.assign({}, x); });
    } else if (isEdit && edit.item) {
      _cmItens = [{
        item:       edit.item,
        quantidade: edit.quantidade || 1,
        unidade:    edit.unidade    || 'un',
        precoUnit:  edit.precoUnit  || 0,
        valorTotal: edit.valorTotal || 0,
      }];
    } else {
      _cmItens = [_cmNovoItem()];
    }
  }

  function g(id) {
    var e = document.getElementById('cm-' + id);
    return e ? e.value : '';
  }

  function mkInp(id, type, ph, val) {
    var i = el('input', { class: 'form-input', type: type || 'text', id: 'cm-' + id, placeholder: ph || '' });
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }

  function mkSel(id, optsArr, selVal) {
    var s = el('select', { class: 'form-input', id: 'cm-' + id });
    optsArr.forEach(function(o) {
      var v = typeof o === 'string' ? o : o.v;
      var l = typeof o === 'string' ? o : o.l;
      var opt = el('option', { value: v }, l);
      if (v === selVal) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function fg(label, child) {
    return div('form-group', [el('label', { class: 'form-label' }, label), child]);
  }

  // Fornecedores
  var forns = (state.fornecedores || []).filter(function(f) {
    return !f.profile || f.profile === state.profile;
  });
  var fornOpts = [{ v: '', l: '— Selecionar —' }].concat(forns.map(function(f) {
    return { v: f.id, l: f.nome };
  }));

  // Bancos
  var bancoOpts = [{ v: '', l: '— Conta —' }].concat(
    (state.bancos || []).filter(function(b) { return b.profile === state.profile; })
      .map(function(b) { return { v: b.id, l: b.nome }; })
  );

  var catOpts = ['— Categoria —'].concat(_COMPRAS_CATS);

  var statusOpts = [
    { v: 'pendente',  l: 'Pendente'  },
    { v: 'pago',      l: 'Pago'      },
    { v: 'cancelado', l: 'Cancelado' },
  ];

  function save() {
    var itensValidos = _cmItens.filter(function(x) { return (x.item || '').trim(); });
    if (!itensValidos.length) { showToast('Informe ao menos 1 produto', 'error'); return; }
    var dataC = g('dataCompra');
    if (!dataC) { showToast('Informe a data da compra', 'error'); return; }

    var fornId   = g('fornecedorId');
    var fornNome = g('fornecedorNome').trim();
    if (fornId) {
      var fObj = forns.filter(function(f) { return f.id === fornId; })[0];
      if (fObj) fornNome = fObj.nome;
    }

    var itensParaSalvar = itensValidos.map(function(x) {
      return {
        item:       (x.item || '').trim(),
        quantidade: x.quantidade  || 0,
        unidade:    x.unidade     || 'un',
        precoUnit:  x.precoUnit   || 0,
        valorTotal: x.valorTotal  || 0,
      };
    });

    var compra = {
      id:             edit.id || uid(),
      profile:        state.profile,
      itens:          itensParaSalvar,
      item:           itensParaSalvar[0] ? itensParaSalvar[0].item : '',
      categoria:      g('categoria') === '— Categoria —' ? '' : g('categoria'),
      fornecedorId:   fornId,
      fornecedor:     fornNome,
      dataCompra:     dataC,
      dataVencimento: g('dataVencimento'),
      dataEntrega:    g('dataEntrega'),
      formaPagamento: g('formaPagamento'),
      banco:          g('banco'),
      status:         g('status') || 'pendente',
      nf:             g('nf').trim(),
      obs:            (document.getElementById('cm-obs') || {}).value || '',
      valorTotal:     _cmSomaTotal(),
      criadoEm:       edit.criadoEm || new Date().toISOString(),
    };

    var lista = state.compras || [];
    if (isEdit) {
      lista = lista.map(function(x) { return x.id === compra.id ? compra : x; });
    } else {
      lista = lista.concat([compra]);
    }
    lsSet('compras', lista);
    setState({ compras: lista, compraModal: null });
    scheduleSave();
    showToast(isEdit ? 'Compra atualizada!' : 'Compra registrada!');
  }

  function excluir() {
    if (!confirm('Excluir esta compra?')) return;
    var lista = (state.compras || []).filter(function(x) { return x.id !== edit.id; });
    lsSet('compras', lista);
    setState({ compras: lista, compraModal: null });
    scheduleSave();
    showToast('Compra excluída', 'error');
  }

  // Cabeçalho da tabela de itens
  var itensHdr = el('div', { style: {
    display: 'grid',
    gridTemplateColumns: '3fr 68px 56px 110px 110px 28px',
    gap: '4px',
    marginBottom: '4px',
  }});
  ['Produto / Serviço', 'Qtd', 'Und', 'Preço unit. (R$)', 'Total (R$)', ''].forEach(function(h, i) {
    var align = i === 0 ? 'left' : i === 5 ? 'center' : 'right';
    itensHdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: align } }, h));
  });

  // Container preenchido via _cmRenderItens()
  var itensContainer = el('div', { id: 'cm-itens-container' });

  // Botão adicionar linha
  var addBtn = el('button', {}, '+ Adicionar produto');
  addBtn.style.cssText = 'margin-top:6px;background:none;border:1px dashed var(--primary);color:var(--primary);border-radius:6px;cursor:pointer;padding:5px 12px;font-size:12px;width:100%;';
  addBtn.onclick = function() {
    _cmItens.push(_cmNovoItem());
    _cmRenderItens();
  };

  // Total geral
  var grandTotalWrap = el('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '2px solid var(--border)' } }, [
    el('span', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' } }, 'Total geral:'),
    el('span', { id: 'cm-grand-total', style: { fontSize: '22px', fontWeight: '800', color: 'var(--gold)' } }, 'R$ 0,00'),
  ]);

  // Fornecedor
  var fornRow = el('div', { style: { display: 'flex', gap: '8px' } });
  fornRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Fornecedor (cadastrado)'), mkSel('fornecedorId', fornOpts, edit.fornecedorId || '')]));
  fornRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Ou nome livre'), mkInp('fornecedorNome', 'text', 'Ex: Atacadão...', edit.fornecedor || '')]));

  // Datas
  var datasRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } });
  datasRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Data da compra *'), mkInp('dataCompra', 'date', '', edit.dataCompra || today())]));
  datasRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Vencimento'),       mkInp('dataVencimento', 'date', '', edit.dataVencimento || '')]));
  datasRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Prev. entrega'),    mkInp('dataEntrega', 'date', '', edit.dataEntrega || '')]));

  // Pagamento + banco
  var pagRow = el('div', { style: { display: 'flex', gap: '8px' } });
  pagRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Forma de pagamento'), mkSel('formaPagamento', _COMPRAS_FORMAS, edit.formaPagamento || 'Pix')]));
  pagRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Conta debitada'), mkSel('banco', bancoOpts, edit.banco || '')]));

  // Status + NF
  var compRow = el('div', { style: { display: 'flex', gap: '8px' } });
  compRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Status'), mkSel('status', statusOpts, edit.status || 'pendente')]));
  compRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'NF / Pedido'), mkInp('nf', 'text', 'Ex: NF 00123', edit.nf || '')]));

  // Obs
  var obsEl = el('textarea', { class: 'form-input', id: 'cm-obs', placeholder: 'Observações...', rows: '2' });
  obsEl.value = edit.obs || '';

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar compra' : '🛒 Nova compra'),
      el('button', { class: 'modal-close', onclick: function() { setState({ compraModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '75vh', overflowY: 'auto' } }, [

      // Produtos / Itens
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📦 Produtos / Itens'),
        itensHdr,
        itensContainer,
        addBtn,
        grandTotalWrap,
      ]),

      // Fornecedor
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '🏪 Fornecedor'),
        fornRow,
        fg('Categoria geral', mkSel('categoria', catOpts, edit.categoria || '')),
      ]),

      // Datas e pagamento
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📅 Datas e Pagamento'),
        fg('Datas', datasRow),
        pagRow,
      ]),

      // Complemento
      el('div', {}, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📋 Complemento'),
        compRow,
        fg('Observações', obsEl),
      ]),
    ]),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', excluir) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ compraModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Registrar', save),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '660px';

  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ compraModal: null }); };

  // Preenche tabela de itens após o DOM ser montado
  setTimeout(function() { _cmRenderItens(); }, 0);

  return ov;
}
