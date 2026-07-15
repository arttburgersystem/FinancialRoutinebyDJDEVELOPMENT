// ── MODAL FICHA TÉCNICA ───────────────────────────────────────────────────────

var _ftIngredientes = [];
var _ftModalId      = null;

function _ftNovoIngrediente() {
  return { insumoId: '', insumoNome: '', quantidade: 1, unidade: 'un', custoUnit: 0, custoTotal: 0 };
}

function _ftSomaCusto() {
  var t = 0;
  _ftIngredientes.forEach(function(x) { t += parseFloat(x.custoTotal) || 0; });
  return t;
}

function _ftAtualizarResumo() {
  var rend   = parseFloat((document.getElementById('ft-rendimento') || {}).value) || 1;
  var custo  = _ftSomaCusto();
  var porcao = custo / rend;
  var pv     = parseFloat((document.getElementById('ft-precoVenda') || {}).value) || 0;
  var mg     = pv ? (pv - porcao) / pv * 100 : null;
  var mgCor  = mg === null ? 'var(--text3)' : mg >= 40 ? '#00a86b' : mg >= 20 ? 'var(--gold)' : '#e05252';

  var custoEl   = document.getElementById('ft-custo-total');
  var porcaoEl  = document.getElementById('ft-custo-porcao');
  var margemEl  = document.getElementById('ft-margem');

  if (custoEl)  custoEl.textContent  = fmtMoney(custo);
  if (porcaoEl) porcaoEl.textContent = fmtMoney(porcao);
  if (margemEl) { margemEl.textContent = mg !== null ? mg.toFixed(1) + '%' : '—'; margemEl.style.color = mgCor; }
}

function _ftRenderIngredientes() {
  var container = document.getElementById('ft-ingredientes-container');
  if (!container) return;
  while (container.firstChild) container.removeChild(container.firstChild);

  var pf    = state.profile;
  var itens = (state.estoqueItens || []).filter(function(x) { return x.profile === pf; });

  var insumoOpts = [{ v: '', l: '— Selecionar insumo —' }].concat(
    itens.map(function(x) { return { v: x.id, l: x.nome + ' (' + (x.unidade || 'un') + ')' }; })
  );

  _ftIngredientes.forEach(function(ingr, idx) {
    var row = el('div', { style: {
      display: 'grid', gridTemplateColumns: '2fr 70px 55px 100px 100px 28px',
      gap: '4px', marginBottom: '4px', alignItems: 'center',
    }});

    // Select insumo
    var insSel = el('select', { class: 'form-input', style: { fontSize: '12px', padding: '4px 6px' } });
    insumoOpts.forEach(function(o) {
      var opt = el('option', { value: o.v }, o.l);
      if (o.v === ingr.insumoId) opt.selected = true;
      insSel.appendChild(opt);
    });
    (function(i) {
      insSel.onchange = function(e) {
        _ftIngredientes[i].insumoId = e.target.value;
        var ins = itens.filter(function(x) { return x.id === e.target.value; })[0];
        if (ins) {
          _ftIngredientes[i].insumoNome = ins.nome;
          _ftIngredientes[i].custoUnit  = ins.custoMedio || 0;
          _ftIngredientes[i].unidade    = ins.unidade || 'un';
          _ftIngredientes[i].custoTotal = _ftIngredientes[i].quantidade * _ftIngredientes[i].custoUnit;
          // Atualiza campos da linha
          var puEl  = document.getElementById('fti-pu-' + i);
          var totEl = document.getElementById('fti-tot-' + i);
          if (puEl)  puEl.value  = _ftIngredientes[i].custoUnit.toFixed(4);
          if (totEl) totEl.value = _ftIngredientes[i].custoTotal.toFixed(2);
        }
        _ftAtualizarResumo();
      };
    })(idx);

    // Quantidade
    var qtdInp = el('input', { class: 'form-input', type: 'number', placeholder: '1', style: { fontSize: '12px' } });
    qtdInp.value = String(ingr.quantidade || 1);
    qtdInp.setAttribute('min', '0'); qtdInp.setAttribute('step', 'any');
    (function(i) {
      qtdInp.oninput = function(e) {
        _ftIngredientes[i].quantidade = parseFloat(e.target.value) || 0;
        _ftIngredientes[i].custoTotal = _ftIngredientes[i].quantidade * (_ftIngredientes[i].custoUnit || 0);
        var totEl = document.getElementById('fti-tot-' + i);
        if (totEl) totEl.value = _ftIngredientes[i].custoTotal.toFixed(2);
        _ftAtualizarResumo();
      };
    })(idx);

    // Unidade
    var undSel = el('select', { class: 'form-input', style: { fontSize: '11px', padding: '4px 3px' } });
    _EI_UNIDADES.forEach(function(u) {
      var opt = el('option', { value: u }, u);
      if (u === (ingr.unidade || 'un')) opt.selected = true;
      undSel.appendChild(opt);
    });
    (function(i) { undSel.onchange = function(e) { _ftIngredientes[i].unidade = e.target.value; }; })(idx);

    // Custo unit
    var puInp = el('input', { class: 'form-input', type: 'number', placeholder: '0,00', id: 'fti-pu-' + idx, style: { fontSize: '12px' } });
    if (ingr.custoUnit) puInp.value = String(ingr.custoUnit);
    puInp.setAttribute('min', '0'); puInp.setAttribute('step', '0.0001');
    (function(i) {
      puInp.oninput = function(e) {
        _ftIngredientes[i].custoUnit  = parseFloat(e.target.value) || 0;
        _ftIngredientes[i].custoTotal = _ftIngredientes[i].quantidade * _ftIngredientes[i].custoUnit;
        var totEl = document.getElementById('fti-tot-' + i);
        if (totEl) totEl.value = _ftIngredientes[i].custoTotal.toFixed(2);
        _ftAtualizarResumo();
      };
    })(idx);

    // Custo total (read-only visual)
    var totInp = el('input', { class: 'form-input', type: 'number', placeholder: '0,00', id: 'fti-tot-' + idx, style: { fontSize: '12px', fontWeight: '700', color: 'var(--gold)', background: 'var(--bg2)' } });
    if (ingr.custoTotal) totInp.value = String(ingr.custoTotal);
    totInp.setAttribute('readonly', true);

    // Remover
    var rmBtn = el('button', {}, '×');
    rmBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:4px;color:#e05252;cursor:pointer;font-size:16px;line-height:1;padding:1px 5px;width:28px;text-align:center;';
    (function(i) {
      rmBtn.onclick = function() {
        if (_ftIngredientes.length === 1) { showToast('A ficha deve ter ao menos 1 ingrediente', 'error'); return; }
        _ftIngredientes.splice(i, 1);
        _ftRenderIngredientes();
        _ftAtualizarResumo();
      };
    })(idx);

    row.appendChild(insSel);
    row.appendChild(qtdInp);
    row.appendChild(undSel);
    row.appendChild(puInp);
    row.appendChild(totInp);
    row.appendChild(rmBtn);
    container.appendChild(row);
  });

  _ftAtualizarResumo();
}

function renderFichaTecnicaModal() {
  var m = state.fichaTecnicaModal;
  if (!m) { _ftModalId = null; return null; }

  var edit   = m.editItem || {};
  var isEdit = !!edit.id;
  var curId  = edit.id || '__ft_new__';

  // Inicializa ingredientes apenas ao abrir
  if (curId !== _ftModalId) {
    _ftModalId = curId;
    if (isEdit && edit.ingredientes && edit.ingredientes.length) {
      _ftIngredientes = edit.ingredientes.map(function(x) { return Object.assign({}, x); });
    } else {
      _ftIngredientes = [_ftNovoIngrediente()];
    }
  }

  function g(id) { var e = document.getElementById('ft-' + id); return e ? e.value : ''; }

  function mkInp(id, type, ph, val) {
    var i = el('input', { class: 'form-input', type: type || 'text', id: 'ft-' + id, placeholder: ph || '' });
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }

  function mkSel(id, optsArr, selVal) {
    var s = el('select', { class: 'form-input', id: 'ft-' + id });
    optsArr.forEach(function(o) {
      var v = typeof o === 'string' ? o : o.v;
      var l = typeof o === 'string' ? o : o.l;
      var opt = el('option', { value: v }, l);
      if (v === selVal) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  function save() {
    var nome = g('nome').trim();
    if (!nome) { showToast('Informe o nome da ficha', 'error'); return; }

    var ingrsValidos = _ftIngredientes.filter(function(x) { return x.insumoId || x.insumoNome; });
    if (!ingrsValidos.length) { showToast('Adicione ao menos 1 ingrediente', 'error'); return; }

    var rend    = parseFloat(g('rendimento')) || 1;
    var custo   = _ftSomaCusto();
    var porcao  = custo / rend;
    var pv      = parseFloat(g('precoVenda')) || 0;
    var mg      = pv ? (pv - porcao) / pv * 100 : null;

    var ft = {
      id:            edit.id || uid(),
      profile:       state.profile,
      nome:          nome,
      categoria:     g('categoria') === '— Categoria —' ? '' : g('categoria'),
      rendimento:    rend,
      unidadeRend:   g('unidadeRend') || 'porção',
      ingredientes:  ingrsValidos,
      custoTotal:    custo,
      custoPorcao:   porcao,
      precoVenda:    pv,
      margemLucro:   mg,
      obs:           g('obs').trim(),
      criadoEm:      edit.criadoEm || new Date().toISOString(),
    };

    ft.produtoId = g('produtoId') || edit.produtoId || '';

    var lista = state.fichaTecnicas || [];
    if (isEdit) {
      lista = lista.map(function(x) { return x.id === ft.id ? ft : x; });
    } else {
      lista = lista.concat([ft]);
    }
    lsSet('fichaTecnicas', lista);
    setState({ fichaTecnicas: lista, fichaTecnicaModal: null });
    scheduleSave();
    showToast(isEdit ? 'Ficha atualizada!' : 'Ficha criada!');
  }

  function excluir() {
    if (!confirm('Excluir ficha "' + (edit.nome || '') + '"?')) return;
    var lista = (state.fichaTecnicas || []).filter(function(x) { return x.id !== edit.id; });
    lsSet('fichaTecnicas', lista);
    setState({ fichaTecnicas: lista, fichaTecnicaModal: null });
    scheduleSave();
    showToast('Ficha excluída', 'error');
  }

  // Header da tabela de ingredientes
  var hdrEl = el('div', { style: { display: 'grid', gridTemplateColumns: '2fr 70px 55px 100px 100px 28px', gap: '4px', marginBottom: '4px' } });
  ['Insumo / Ingrediente', 'Qtd', 'Und', 'Custo unit.', 'Total (R$)', ''].forEach(function(h, i) {
    hdrEl.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: i >= 3 ? 'right' : 'left' } }, h));
  });

  // Container de ingredientes
  var ingrContainer = el('div', { id: 'ft-ingredientes-container' });

  // Botão adicionar
  var addBtn = el('button', {}, '+ Adicionar ingrediente');
  addBtn.style.cssText = 'margin-top:6px;background:none;border:1px dashed var(--primary);color:var(--primary);border-radius:6px;cursor:pointer;padding:5px 12px;font-size:12px;width:100%;';
  addBtn.onclick = function() {
    _ftIngredientes.push(_ftNovoIngrediente());
    _ftRenderIngredientes();
  };

  // Resumo de custos
  var rendInp = mkInp('rendimento', 'number', '1', edit.rendimento || 1);
  rendInp.setAttribute('min', '0.01'); rendInp.setAttribute('step', 'any');
  rendInp.oninput = _ftAtualizarResumo;

  var pvInp = mkInp('precoVenda', 'number', '0,00', edit.precoVenda || '');
  pvInp.setAttribute('min', '0'); pvInp.setAttribute('step', '0.01');
  pvInp.oninput = _ftAtualizarResumo;

  var resumoBox = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '12px', borderRadius: '8px', background: 'var(--bg3)', border: '1px solid var(--border)', marginTop: '8px' } }, [
    el('div', { style: { textAlign: 'center' } }, [
      el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' } }, 'Custo Total Receita'),
      el('span', { id: 'ft-custo-total', style: { fontSize: '18px', fontWeight: '800', color: 'var(--text)' } }, '—'),
    ]),
    el('div', { style: { textAlign: 'center' } }, [
      el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' } }, 'Custo / Porção'),
      el('span', { id: 'ft-custo-porcao', style: { fontSize: '18px', fontWeight: '800', color: 'var(--gold)' } }, '—'),
    ]),
    el('div', { style: { textAlign: 'center' } }, [
      el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' } }, 'Margem de Lucro'),
      el('span', { id: 'ft-margem', style: { fontSize: '18px', fontWeight: '800', color: 'var(--text3)' } }, '—'),
    ]),
  ]);

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar Ficha Técnica' : '📋 Nova Ficha Técnica'),
      el('button', { class: 'modal-close', onclick: function() { setState({ fichaTecnicaModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '76vh', overflowY: 'auto' } }, [

      // Identificação
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📋 Identificação'),
        (function() {
          var pf = state.profile;
          var prods = (state.produtos || []).filter(function(p) { return p.profile === pf && p.ativo !== false && p.tipo !== 'insumo'; });
          var prodSel = el('select', { class: 'form-input', id: 'ft-produtoId' });
          [{ v: '', l: '— Vincular produto do Cardápio (opcional) —' }].concat(
            prods.map(function(p) { return { v: p.id, l: p.nome + (p.categoria ? ' · ' + p.categoria : '') }; })
          ).forEach(function(o) {
            var opt = el('option', { value: o.v }, o.l);
            if (o.v === (edit.produtoId || '')) opt.selected = true;
            prodSel.appendChild(opt);
          });
          prodSel.onchange = function() {
            var pid = prodSel.value;
            var prod = prods.filter(function(p) { return p.id === pid; })[0];
            if (!prod) return;
            var nomeEl = document.getElementById('ft-nome');
            var catEl  = document.getElementById('ft-categoria');
            var pvEl   = document.getElementById('ft-precoVenda');
            if (nomeEl) nomeEl.value = prod.nome;
            if (catEl) { for (var i = 0; i < catEl.options.length; i++) { if (catEl.options[i].value === (prod.categoria || '')) { catEl.selectedIndex = i; break; } } }
            if (pvEl)  pvEl.value = prod.precoVenda || prod.preco || '';
            _ftAtualizarResumo();
          };
          return div('form-group', [el('label', { class: 'form-label' }, 'Produto do Cardápio'), prodSel]);
        })(),
        div('form-group', [el('label', { class: 'form-label' }, 'Nome da receita / prato *'), mkInp('nome', 'text', 'Ex: Hambúrguer Artesanal 180g', edit.nome || '')]),
        el('div', { style: { display: 'flex', gap: '8px' } }, [
          el('div', { style: { flex: '2' } }, [el('label', { class: 'form-label' }, 'Categoria'), mkSel('categoria', ['— Categoria —'].concat((state.estCategorias || []).map(function(c){ return typeof c === 'string' ? c : (c && c.nome ? c.nome : ''); }).filter(Boolean)), edit.categoria || '')]),
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Rendimento'), rendInp]),
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Unidade'), mkSel('unidadeRend', ['porção','un','kg','g','L','mL'], edit.unidadeRend || 'porção')]),
        ]),
      ]),

      // Ingredientes
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '🧂 Ingredientes'),
        el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' } }, 'O custo unit. é preenchido automaticamente com o Custo Médio do insumo.'),
        hdrEl,
        ingrContainer,
        addBtn,
        resumoBox,
      ]),

      // Precificação
      el('div', {}, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '💰 Precificação'),
        el('div', { style: { display: 'flex', gap: '8px' } }, [
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Preço de venda (R$) / porção'), pvInp]),
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Observações'), mkInp('obs', 'text', 'Rendimento, alergênicos...', edit.obs || '')]),
        ]),
      ]),
    ]),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', excluir) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ fichaTecnicaModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Criar Ficha', save),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '680px';

  var ov = div('modal-overlay', [modal]);
  setTimeout(function() { _ftRenderIngredientes(); }, 0);
  return ov;
}
