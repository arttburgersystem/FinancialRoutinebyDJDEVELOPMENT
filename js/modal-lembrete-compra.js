// ── MODAL LEMBRETE DE COMPRA ──────────────────────────────────────────────────

var _lcModalId = null;

function renderLembreteCompraModal() {
  var m = state.compraLembreteModal;
  if (!m) { _lcModalId = null; return null; }

  var edit   = m.editItem || {};
  var isEdit = !!edit.id;

  var forns = (state.fornecedores || []).filter(function(f) {
    return !f.profile || f.profile === state.profile;
  });
  var fornOpts = [{ v: '', l: '— Selecionar —' }].concat(forns.map(function(f) {
    return { v: f.id, l: f.nome };
  }));

  function mkInp(id, type, ph, val) {
    var i = el('input', { class: 'form-input', type: type || 'text', id: 'lc-' + id, placeholder: ph || '' });
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }

  function mkSel(id, optsArr, selVal) {
    var s = el('select', { class: 'form-input', id: 'lc-' + id });
    optsArr.forEach(function(o) {
      var v = typeof o === 'string' ? o : o.v;
      var l = typeof o === 'string' ? o : o.l;
      var opt = el('option', { value: v }, l);
      if (v === selVal) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function g(id) {
    var e = document.getElementById('lc-' + id);
    return e ? e.value : '';
  }

  function fg(label, child) {
    return div('form-group', [el('label', { class: 'form-label' }, label), child]);
  }

  var periodicidades = [
    { v: 'semanal',    l: 'Semanal' },
    { v: 'quinzenal',  l: 'Quinzenal' },
    { v: 'mensal',     l: 'Mensal' },
    { v: 'bimestral',  l: 'Bimestral' },
    { v: 'trimestral', l: 'Trimestral' },
    { v: 'avulso',     l: 'Avulso (sem repetição)' },
  ];

  // Itens do lembrete (nome do produto + qtd + unidade)
  var _lcItens = (edit.itens && edit.itens.length)
    ? edit.itens.map(function(x) { return Object.assign({}, x); })
    : [{ item: '', quantidade: 1, unidade: 'un' }];

  var itensContainer = el('div', { id: 'lc-itens-container' });

  function renderLcItens() {
    while (itensContainer.firstChild) itensContainer.removeChild(itensContainer.firstChild);
    _lcItens.forEach(function(it, idx) {
      !function(it, i) {
        var row = el('div', { style: { display: 'grid', gridTemplateColumns: '3fr 80px 60px 28px', gap: '4px', marginBottom: '4px', alignItems: 'center' } });

        var nomeInp = el('input', { class: 'form-input', placeholder: 'Produto / serviço...', style: { fontSize: '12px' } });
        nomeInp.value = it.item || '';
        nomeInp.oninput = function(e) { _lcItens[i].item = e.target.value; };

        var qtdInp = el('input', { class: 'form-input', type: 'number', placeholder: '1', style: { fontSize: '12px' } });
        qtdInp.value = String(it.quantidade || 1);
        qtdInp.setAttribute('min', '0'); qtdInp.setAttribute('step', 'any');
        qtdInp.oninput = function(e) { _lcItens[i].quantidade = parseFloat(e.target.value) || 1; };

        var undSel = el('select', { class: 'form-input', style: { fontSize: '11px', padding: '4px 3px' } });
        _COMPRAS_UNIDADES.forEach(function(u) {
          var opt = el('option', { value: u }, u);
          if (u === (it.unidade || 'un')) opt.selected = true;
          undSel.appendChild(opt);
        });
        undSel.onchange = function(e) { _lcItens[i].unidade = e.target.value; };

        var rmBtn = el('button', {}, '×');
        rmBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;color:#e05252;cursor:pointer;font-size:16px;line-height:1;padding:1px 5px;width:28px;text-align:center;';
        rmBtn.onclick = function() {
          if (_lcItens.length === 1) { showToast('Informe ao menos 1 item', 'error'); return; }
          _lcItens.splice(i, 1);
          renderLcItens();
        };

        row.appendChild(nomeInp); row.appendChild(qtdInp); row.appendChild(undSel); row.appendChild(rmBtn);
        itensContainer.appendChild(row);
      }(it, idx);
    });

    var addBtn = el('button', {}, '+ Adicionar item');
    addBtn.style.cssText = 'margin-top:4px;background:none;border:1px dashed var(--primary);color:var(--primary);border-radius:6px;cursor:pointer;padding:4px 12px;font-size:12px;width:100%;';
    addBtn.onclick = function() { _lcItens.push({ item: '', quantidade: 1, unidade: 'un' }); renderLcItens(); };
    itensContainer.appendChild(addBtn);
  }

  // Cabeçalho da tabela de itens
  var itensHdr = el('div', { style: { display: 'grid', gridTemplateColumns: '3fr 80px 60px 28px', gap: '4px', marginBottom: '4px' } });
  ['Produto / Serviço', 'Qtd', 'Und', ''].forEach(function(h, i) {
    itensHdr.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: i === 0 ? 'left' : 'center' } }, h));
  });

  function save() {
    var itensValidos = _lcItens.filter(function(x) { return (x.item || '').trim(); });
    if (!itensValidos.length) { showToast('Informe ao menos 1 produto', 'error'); return; }

    var fornId   = g('fornecedorId');
    var fornNome = g('fornecedorNome').trim();
    if (fornId) {
      var fObj = forns.filter(function(f) { return f.id === fornId; })[0];
      if (fObj) fornNome = fObj.nome;
    }
    if (!fornNome) { showToast('Informe o fornecedor', 'error'); return; }

    var proxData = g('proximaData');
    if (!proxData) { showToast('Informe a próxima data', 'error'); return; }

    var lembrete = {
      id:            edit.id || uid(),
      profile:       state.profile,
      itens:         itensValidos,
      fornecedorId:  fornId,
      fornecedor:    fornNome,
      periodicidade: g('periodicidade') || 'mensal',
      proximaData:   proxData,
      categoria:     g('categoria') === '— Categoria —' ? '' : g('categoria'),
      obs:           (document.getElementById('lc-obs') || {}).value || '',
      ativo:         true,
      criadoEm:      edit.criadoEm || new Date().toISOString(),
    };

    var lista = state.comprasLembretes || [];
    if (isEdit) {
      lista = lista.map(function(x) { return x.id === lembrete.id ? lembrete : x; });
    } else {
      lista = lista.concat([lembrete]);
    }
    lsSet('comprasLembretes', lista);
    setState({ comprasLembretes: lista, compraLembreteModal: null });
    scheduleSave();
    showToast(isEdit ? 'Lembrete atualizado!' : 'Lembrete criado!');
  }

  function excluir() {
    if (!confirm('Excluir este lembrete?')) return;
    var lista = (state.comprasLembretes || []).filter(function(x) { return x.id !== edit.id; });
    lsSet('comprasLembretes', lista);
    setState({ comprasLembretes: lista, compraLembreteModal: null });
    scheduleSave();
    showToast('Lembrete excluído', 'error');
  }

  var catOpts = ['— Categoria —'].concat(_COMPRAS_CATS);

  var fornRow = el('div', { style: { display: 'flex', gap: '8px' } });
  fornRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Fornecedor (cadastrado)'), mkSel('fornecedorId', fornOpts, edit.fornecedorId || '')]));
  fornRow.appendChild(el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Ou nome livre'), mkInp('fornecedorNome', 'text', 'Ex: Atacadão...', edit.fornecedor || '')]));

  var periodicidadeRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } });
  periodicidadeRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Periodicidade'), mkSel('periodicidade', periodicidades, edit.periodicidade || 'mensal')]));
  periodicidadeRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Próxima data *'), mkInp('proximaData', 'date', '', edit.proximaData || today())]));

  var obsEl = el('textarea', { class: 'form-input', id: 'lc-obs', placeholder: 'Observações, ponto de referência, contato...', rows: '2' });
  obsEl.value = edit.obs || '';

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar lembrete' : '🔔 Novo lembrete de compra'),
      el('button', { class: 'modal-close', onclick: function() { setState({ compraLembreteModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '75vh', overflowY: 'auto' } }, [

      // Itens
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📦 Produtos / Itens'),
        itensHdr,
        itensContainer,
      ]),

      // Fornecedor
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '🏪 Fornecedor'),
        fornRow,
        fg('Categoria', mkSel('categoria', catOpts, edit.categoria || '')),
      ]),

      // Periodicidade
      el('div', {}, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📅 Recorrência'),
        periodicidadeRow,
        fg('Observações', obsEl),
      ]),
    ]),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', excluir) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ compraLembreteModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Criar lembrete', save),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '580px';

  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ compraLembreteModal: null }); };

  setTimeout(function() { renderLcItens(); }, 0);

  return ov;
}
