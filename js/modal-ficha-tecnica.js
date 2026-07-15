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
  var rend  = parseFloat((document.getElementById('ft-rendimento')  || {}).value) || 1;
  var custo = _ftSomaCusto();
  var cp    = custo / rend;
  var pv    = parseFloat((document.getElementById('ft-precoVenda')  || {}).value) || 0;
  var das   = parseFloat((document.getElementById('ft-das')         || {}).value) || 0;
  var tcr   = parseFloat((document.getElementById('ft-credito')     || {}).value) || 0;
  var tdb   = parseFloat((document.getElementById('ft-debito')      || {}).value) || 0;

  var dasRs   = pv * das  / 100;
  var crRs    = pv * tcr  / 100;
  var dbRs    = pv * tdb  / 100;
  var lDin    = pv - dasRs - cp;
  var lCred   = pv - dasRs - crRs  - cp;
  var lDeb    = pv - dasRs - dbRs  - cp;
  var mgDin   = pv ? lDin  / pv * 100 : null;
  var mgCred  = pv ? lCred / pv * 100 : null;
  var mgDeb   = pv ? lDeb  / pv * 100 : null;

  function cor(v) { return v === null ? 'var(--text3)' : v >= 40 ? '#00a86b' : v >= 20 ? 'var(--gold)' : '#e05252'; }
  function set(id, txt, c) { var e = document.getElementById(id); if (e) { e.textContent = txt; if (c) e.style.color = c; } }

  set('ft-custo-total',      fmtMoney(custo));
  set('ft-custo-porcao',     fmtMoney(cp));
  set('ft-das-rs',           pv ? '−' + fmtMoney(dasRs) : '—', pv && dasRs ? '#e05252' : 'var(--text3)');
  set('ft-lucro-dinheiro',   pv ? fmtMoney(lDin)  : '—', pv ? (lDin  >= 0 ? '#00a86b' : '#e05252') : 'var(--text3)');
  set('ft-lucro-credito',    pv ? fmtMoney(lCred) : '—', pv ? (lCred >= 0 ? '#00a86b' : '#e05252') : 'var(--text3)');
  set('ft-lucro-debito',     pv ? fmtMoney(lDeb)  : '—', pv ? (lDeb  >= 0 ? '#00a86b' : '#e05252') : 'var(--text3)');
  set('ft-margem-dinheiro',  mgDin  !== null ? mgDin.toFixed(1)  + '%' : '—', cor(mgDin));
  set('ft-margem-credito',   mgCred !== null ? mgCred.toFixed(1) + '%' : '—', cor(mgCred));
  set('ft-margem-debito',    mgDeb  !== null ? mgDeb.toFixed(1)  + '%' : '—', cor(mgDeb));
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

    // Autocomplete insumo
    var insWrapper = el('div', { style: { position: 'relative' } });
    var insSearch = el('input', { class: 'form-input', type: 'text', id: 'fti-search-' + idx, placeholder: 'Buscar insumo...', autocomplete: 'off', style: { fontSize: '12px', padding: '4px 6px' } });
    if (ingr.insumoNome) insSearch.value = ingr.insumoNome;
    var insDrop = el('div', { id: 'fti-drop-' + idx, style: { display: 'none', position: 'absolute', top: '100%', left: '0', right: '0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', zIndex: '9999', maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,.25)' } });
    (function(i) {
      var hiIdx = -1;
      var filtered = [];
      function renderDrop(q) {
        while (insDrop.firstChild) insDrop.removeChild(insDrop.firstChild);
        q = (q || '').toLowerCase();
        filtered = q ? itens.filter(function(x){ return x.nome.toLowerCase().indexOf(q) >= 0; }) : itens.slice(0, 40);
        hiIdx = -1;
        if (!filtered.length) { insDrop.style.display = 'none'; return; }
        filtered.forEach(function(x, fi) {
          var item = el('div', { style: { padding: '6px 10px', cursor: 'pointer', fontSize: '12px', borderBottom: '1px solid var(--border)' } }, x.nome + ' (' + (x.unidade || 'un') + ')');
          item.onmouseenter = function() { hiIdx = fi; upHi(); };
          item.onmousedown = function(e) { e.preventDefault(); pick(x); };
          insDrop.appendChild(item);
        });
        insDrop.style.display = 'block';
      }
      function upHi() {
        var kids = insDrop.children;
        for (var j = 0; j < kids.length; j++) { kids[j].style.background = j === hiIdx ? 'var(--primary)' : ''; kids[j].style.color = j === hiIdx ? '#fff' : ''; }
      }
      function pick(x) {
        _ftIngredientes[i].insumoId   = x.id;
        _ftIngredientes[i].insumoNome = x.nome;
        _ftIngredientes[i].custoUnit  = x.custoMedio || 0;
        _ftIngredientes[i].unidade    = x.unidade || 'un';
        _ftIngredientes[i].custoTotal = (_ftIngredientes[i].quantidade || 1) * _ftIngredientes[i].custoUnit;
        insSearch.value = x.nome;
        insDrop.style.display = 'none';
        var puEl = document.getElementById('fti-pu-' + i);
        var totEl = document.getElementById('fti-tot-' + i);
        var undEl = document.getElementById('fti-und-' + i);
        if (puEl)  puEl.value  = _ftIngredientes[i].custoUnit.toFixed(4);
        if (totEl) totEl.value = _ftIngredientes[i].custoTotal.toFixed(2);
        if (undEl) { for (var j = 0; j < undEl.options.length; j++) { if (undEl.options[j].value === x.unidade) { undEl.selectedIndex = j; break; } } }
        _ftAtualizarResumo();
        setTimeout(function() { var q = document.getElementById('fti-qtd-' + i); if (q) { q.focus(); q.select(); } }, 50);
      }
      insSearch.oninput  = function() { renderDrop(insSearch.value); };
      insSearch.onfocus  = function() { renderDrop(insSearch.value); };
      insSearch.onblur   = function() { setTimeout(function(){ insDrop.style.display = 'none'; }, 160); };
      insSearch.onkeydown = function(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); hiIdx = Math.min(hiIdx + 1, filtered.length - 1); upHi(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); hiIdx = Math.max(hiIdx - 1, 0); upHi(); }
        else if (e.key === 'Tab' || e.key === 'Enter') {
          if (insDrop.style.display !== 'none' && filtered.length) { e.preventDefault(); pick(filtered[hiIdx >= 0 ? hiIdx : 0]); }
        } else if (e.key === 'Escape') { insDrop.style.display = 'none'; }
      };
    })(idx);
    insWrapper.appendChild(insSearch);
    insWrapper.appendChild(insDrop);

    // Quantidade
    var qtdInp = el('input', { class: 'form-input', type: 'number', placeholder: '1', id: 'fti-qtd-' + idx, style: { fontSize: '12px' } });
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
    var undSel = el('select', { class: 'form-input', id: 'fti-und-' + idx, style: { fontSize: '11px', padding: '4px 3px' } });
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

    row.appendChild(insWrapper);
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
    var das     = parseFloat(g('das'))     || 0;
    var tcred   = parseFloat(g('credito')) || 0;
    var tdeb    = parseFloat(g('debito'))  || 0;
    var lDin    = pv ? pv - pv * das / 100 - porcao : null;
    var mg      = pv ? lDin / pv * 100 : null;

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
      pctDAS:        das,
      pctCredito:    tcred,
      pctDebito:     tdeb,
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

  var dasInp = mkInp('das', 'number', '0,00', edit.pctDAS || '');
  dasInp.setAttribute('min', '0'); dasInp.setAttribute('max', '100'); dasInp.setAttribute('step', '0.1');
  dasInp.oninput = _ftAtualizarResumo;

  var credInp = mkInp('credito', 'number', '0,00', edit.pctCredito || '');
  credInp.setAttribute('min', '0'); credInp.setAttribute('max', '100'); credInp.setAttribute('step', '0.1');
  credInp.oninput = _ftAtualizarResumo;

  var debInp = mkInp('debito', 'number', '0,00', edit.pctDebito || '');
  debInp.setAttribute('min', '0'); debInp.setAttribute('max', '100'); debInp.setAttribute('step', '0.1');
  debInp.oninput = _ftAtualizarResumo;

  function _mkResumoCell(label, id, big) {
    return el('div', { style: { textAlign: 'center', padding: '6px 4px' } }, [
      el('div', { style: { fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '3px', letterSpacing: '.5px' } }, label),
      el('span', { id: id, style: { fontSize: big ? '16px' : '13px', fontWeight: '800', color: 'var(--text3)' } }, '—'),
    ]);
  }

  var resumoBox = el('div', { style: { borderRadius: '8px', background: 'var(--bg3)', border: '1px solid var(--border)', marginTop: '8px', overflow: 'hidden' } }, [
    // Linha 1: Custo total | Custo/porção | DAS R$
    el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', background: 'var(--border)', borderBottom: '1px solid var(--border)' } }, [
      el('div', { style: { background: 'var(--bg3)', padding: '8px 4px', textAlign: 'center' } }, [
        el('div', { style: { fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '3px' } }, 'Custo Total'),
        el('span', { id: 'ft-custo-total', style: { fontSize: '15px', fontWeight: '800', color: 'var(--text)' } }, '—'),
      ]),
      el('div', { style: { background: 'var(--bg3)', padding: '8px 4px', textAlign: 'center' } }, [
        el('div', { style: { fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '3px' } }, 'Custo / Porção'),
        el('span', { id: 'ft-custo-porcao', style: { fontSize: '15px', fontWeight: '800', color: 'var(--gold)' } }, '—'),
      ]),
      el('div', { style: { background: 'var(--bg3)', padding: '8px 4px', textAlign: 'center' } }, [
        el('div', { style: { fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '3px' } }, 'DAS (imposto)'),
        el('span', { id: 'ft-das-rs', style: { fontSize: '15px', fontWeight: '800', color: 'var(--text3)' } }, '—'),
      ]),
    ]),
    // Linha 2: header das formas de pagamento
    el('div', { style: { display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', background: 'var(--bg2)', padding: '6px 8px', alignItems: 'center' } }, [
      el('span', {}),
      el('div', { style: { textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text2)' } }, '💵 Dinheiro/PIX'),
      el('div', { style: { textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text2)' } }, '💳 Crédito'),
      el('div', { style: { textAlign: 'center', fontSize: '11px', fontWeight: '700', color: 'var(--text2)' } }, '💳 Débito'),
    ]),
    // Linha 3: Lucro R$
    el('div', { style: { display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', background: 'var(--bg3)', padding: '6px 8px', alignItems: 'center', borderTop: '1px solid var(--border)' } }, [
      el('span', { style: { fontSize: '10px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase' } }, 'Lucro R$'),
      el('div', { style: { textAlign: 'center', fontSize: '15px', fontWeight: '800' } }, [el('span', { id: 'ft-lucro-dinheiro' }, '—')]),
      el('div', { style: { textAlign: 'center', fontSize: '15px', fontWeight: '800' } }, [el('span', { id: 'ft-lucro-credito'  }, '—')]),
      el('div', { style: { textAlign: 'center', fontSize: '15px', fontWeight: '800' } }, [el('span', { id: 'ft-lucro-debito'   }, '—')]),
    ]),
    // Linha 4: Margem %
    el('div', { style: { display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', background: 'var(--bg3)', padding: '6px 8px', alignItems: 'center', borderTop: '1px solid var(--border)' } }, [
      el('span', { style: { fontSize: '10px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase' } }, 'Margem'),
      el('div', { style: { textAlign: 'center', fontSize: '18px', fontWeight: '800' } }, [el('span', { id: 'ft-margem-dinheiro' }, '—')]),
      el('div', { style: { textAlign: 'center', fontSize: '18px', fontWeight: '800' } }, [el('span', { id: 'ft-margem-credito'  }, '—')]),
      el('div', { style: { textAlign: 'center', fontSize: '18px', fontWeight: '800' } }, [el('span', { id: 'ft-margem-debito'   }, '—')]),
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
        el('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' } }, [
          el('div', {}, [el('label', { class: 'form-label' }, 'Preço de venda (R$) / porção'), pvInp]),
          el('div', {}, [el('label', { class: 'form-label' }, '% DAS (Simples)'), dasInp]),
          el('div', {}, [el('label', { class: 'form-label' }, '% Taxa Crédito'), credInp]),
          el('div', {}, [el('label', { class: 'form-label' }, '% Taxa Débito'), debInp]),
        ]),
        div('form-group', [el('label', { class: 'form-label' }, 'Observações'), mkInp('obs', 'text', 'Rendimento, alergênicos...', edit.obs || '')]),
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
