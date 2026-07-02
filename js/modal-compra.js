// ── MODAL COMPRA ──────────────────────────────────────────────────────────────

function renderCompraModal() {
  var m = state.compraModal;
  if (!m) return null;

  var edit = m.editItem || {};
  var isEdit = !!edit.id;

  // Helpers de campo
  function g(id) {
    var e = document.getElementById('cm-' + id);
    return e ? e.value : '';
  }

  function inp(id, type, ph, val, extra) {
    var attrs = Object.assign({ class: 'form-input', type: type || 'text', id: 'cm-' + id, placeholder: ph || '' }, extra || {});
    var i = el('input', attrs);
    if (val !== undefined && val !== null) i.value = String(val);
    return i;
  }

  function sel(id, opts, val) {
    var s = el('select', { class: 'form-input', id: 'cm-' + id });
    opts.forEach(function(o) {
      var opt = typeof o === 'string'
        ? el('option', { value: o }, o)
        : el('option', { value: o.v }, o.l);
      if ((typeof o === 'string' ? o : o.v) === val) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function txt(id, ph, val) {
    var t = el('textarea', { class: 'form-input', id: 'cm-' + id, placeholder: ph || '', rows: '2', style: { resize: 'vertical', minHeight: '56px' } });
    t.value = val || '';
    return t;
  }

  function fgroup(label, child, hint) {
    return div('form-group', [
      el('label', { class: 'form-label' }, label),
      child,
      hint ? el('small', { style: { color: 'var(--text3)', fontSize: '11px' } }, hint) : null,
    ].filter(Boolean));
  }

  // Atualizar valor total automaticamente
  function recalcTotal() {
    var qtd = parseFloat(document.getElementById('cm-quantidade') && document.getElementById('cm-quantidade').value) || 0;
    var pu  = parseFloat(document.getElementById('cm-precoUnit') && document.getElementById('cm-precoUnit').value) || 0;
    var tot = document.getElementById('cm-valorTotal');
    if (tot) tot.value = qtd > 0 && pu > 0 ? (qtd * pu).toFixed(2) : (edit.valorTotal || '');
  }

  // Fornecedores disponíveis
  var forns = (state.fornecedores || []).filter(function(f) { return f.profile === state.profile || !f.profile; });
  var fornOpts = [{ v: '', l: '— Selecionar fornecedor —' }].concat(forns.map(function(f) { return { v: f.id, l: f.nome }; }));

  // Bancos disponíveis
  var bancos = (state.bancos || []).filter(function(b) { return b.profile === state.profile; });
  var bancoOpts = [{ v: '', l: '— Selecionar conta —' }].concat(bancos.map(function(b) { return { v: b.id, l: b.nome }; }));

  // Categorias (padrão + customizadas)
  var catOpts = ['— Categoria —'].concat(_COMPRAS_CATS);

  function save() {
    var item       = g('item').trim();
    var categoria  = g('categoria');
    var fornId     = g('fornecedorId');
    var fornNome   = g('fornecedor').trim();
    var quantidade = parseFloat(g('quantidade')) || 0;
    var unidade    = g('unidade');
    var precoUnit  = parseFloat(g('precoUnit')) || 0;
    var valorTotal = parseFloat(g('valorTotal')) || (quantidade * precoUnit);
    var dataCompra     = g('dataCompra');
    var dataVencimento = g('dataVencimento');
    var dataEntrega    = g('dataEntrega');
    var formaPagamento = g('formaPagamento');
    var banco          = g('banco');
    var status         = g('status');
    var nf             = g('nf').trim();
    var obs            = g('obs').trim();

    if (!item) { showToast('Informe o nome do item', 'error'); return; }
    if (!dataCompra) { showToast('Informe a data da compra', 'error'); return; }

    // Resolve fornecedor: preferir id se selecionado, senão usar nome livre
    var fornFinal = fornNome;
    if (fornId) {
      var fObj = forns.find(function(f) { return f.id === fornId; });
      if (fObj) fornFinal = fObj.nome;
    }

    var compra = {
      id:             edit.id || uid(),
      profile:        state.profile,
      item:           item,
      categoria:      categoria === '— Categoria —' ? '' : categoria,
      fornecedorId:   fornId || '',
      fornecedor:     fornFinal,
      quantidade:     quantidade,
      unidade:        unidade,
      precoUnit:      precoUnit,
      valorTotal:     valorTotal || 0,
      dataCompra:     dataCompra,
      dataVencimento: dataVencimento || '',
      dataEntrega:    dataEntrega || '',
      formaPagamento: formaPagamento,
      banco:          banco,
      status:         status || 'pendente',
      nf:             nf,
      obs:            obs,
      criadoEm:       edit.criadoEm || new Date().toISOString(),
      atualizadoEm:   new Date().toISOString(),
    };

    var lista = (state.compras || []);
    if (isEdit) {
      lista = lista.map(function(x) { return x.id === compra.id ? compra : x; });
      showToast('Compra atualizada!');
    } else {
      lista = lista.concat([compra]);
      showToast('Compra registrada!');
    }
    lsSet('compras', lista);
    setState({ compras: lista, compraModal: null });
    scheduleSave();
  }

  function excluir() {
    if (!confirm('Excluir esta compra?')) return;
    var lista = (state.compras || []).filter(function(x) { return x.id !== edit.id; });
    lsSet('compras', lista);
    setState({ compras: lista, compraModal: null });
    scheduleSave();
    showToast('Compra excluída', 'error');
  }

  // Campos de status disponíveis
  var statusOpts = [
    { v: 'pendente',  l: 'Pendente' },
    { v: 'pago',      l: 'Pago' },
    { v: 'cancelado', l: 'Cancelado' },
  ];

  // Campos de quantidade + unidade juntos
  var qtdUndRow = el('div', { style: { display: 'flex', gap: '8px' } }, [
    el('div', { style: { flex: '2' } }, [inp('quantidade', 'number', '0', edit.quantidade, { min: '0', step: 'any', oninput: recalcTotal })]),
    el('div', { style: { flex: '1' } }, [sel('unidade', _COMPRAS_UNIDADES, edit.unidade || 'un')]),
  ]);

  // Preço unit + total
  var precoRow = el('div', { style: { display: 'flex', gap: '8px' } }, [
    el('div', { style: { flex: '1' } }, [
      el('label', { class: 'form-label' }, 'Preço unitário (R$)'),
      inp('precoUnit', 'number', '0,00', edit.precoUnit, { min: '0', step: '0.01', oninput: recalcTotal }),
    ]),
    el('div', { style: { flex: '1' } }, [
      el('label', { class: 'form-label' }, 'Valor total (R$)'),
      inp('valorTotal', 'number', '0,00', edit.valorTotal, { min: '0', step: '0.01' }),
    ]),
  ]);

  // Linha de datas
  var datasRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' } }, [
    el('div', {}, [el('label', { class: 'form-label' }, 'Data da compra'), inp('dataCompra', 'date', '', edit.dataCompra || today())]),
    el('div', {}, [el('label', { class: 'form-label' }, 'Vencimento'), inp('dataVencimento', 'date', '', edit.dataVencimento || '')]),
    el('div', {}, [el('label', { class: 'form-label' }, 'Previsão de entrega'), inp('dataEntrega', 'date', '', edit.dataEntrega || '')]),
  ]);

  // Forma de pagamento + banco
  var pagRow = el('div', { style: { display: 'flex', gap: '8px' } }, [
    el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Forma de pagamento'), sel('formaPagamento', _COMPRAS_FORMAS, edit.formaPagamento || 'Pix')]),
    el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Conta debitada'), sel('banco', bancoOpts, edit.banco || '')]),
  ]);

  // Campo fornecedor: select + input livre
  var fornRow = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start' } }, [
    el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Fornecedor (cadastrado)'), sel('fornecedorId', fornOpts, edit.fornecedorId || '')]),
    el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Ou nome livre'), inp('fornecedor', 'text', 'Ex: Atacadão, feira...', edit.fornecedor || '')]),
  ]);

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar compra' : '🛒 Nova compra'),
      el('button', { class: 'modal-close', onclick: function() { setState({ compraModal: null }); } }, '×'),
    ]),

    // Scroll interno
    el('div', { style: { maxHeight: '72vh', overflowY: 'auto', paddingRight: '2px', display: 'flex', flexDirection: 'column', gap: '0' } }, [

      // Bloco 1 — Identificação
      el('div', { style: { padding: '14px 0 10px', borderBottom: '1px solid var(--border)', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' } }, '📦 Item'),
        fgroup('Nome do item / produto *', inp('item', 'text', 'Ex: Óleo de soja, Embalagem 500ml...', edit.item || '')),
        fgroup('Categoria', sel('categoria', catOpts, edit.categoria || '')),
        fornRow,
      ]),

      // Bloco 2 — Quantidade e valores
      el('div', { style: { padding: '0 0 10px', borderBottom: '1px solid var(--border)', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' } }, '📐 Quantidade e Valores'),
        fgroup('Quantidade + Unidade', qtdUndRow),
        precoRow,
      ]),

      // Bloco 3 — Datas e pagamento
      el('div', { style: { padding: '0 0 10px', borderBottom: '1px solid var(--border)', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' } }, '📅 Datas e Pagamento'),
        fgroup('Datas', datasRow),
        pagRow,
      ]),

      // Bloco 4 — Status e complementos
      el('div', { style: { padding: '0 0 10px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' } }, '📋 Complemento'),
        el('div', { style: { display: 'flex', gap: '8px' } }, [
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Status'), sel('status', statusOpts, edit.status || 'pendente')]),
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Nº NF / Pedido'), inp('nf', 'text', 'Ex: NF 00123', edit.nf || '')]),
        ]),
        fgroup('Observações', txt('obs', 'Anotações sobre a compra...', edit.obs || '')),
      ]),

    ]),

    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', excluir) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ compraModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Registrar compra', save),
    ].filter(Boolean)),
  ]);

  modal.style.maxWidth = '620px';
  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ compraModal: null }); };
  return ov;
}
