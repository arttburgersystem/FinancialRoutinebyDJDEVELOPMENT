// ── MODAL COMPRA ──────────────────────────────────────────────────────────────

var _cmItens   = [];
var _cmModalId = null;

function _cmNovoItem() {
  return { item: '', quantidade: 1, unidade: 'un', precoUnit: 0, valorTotal: 0, insumoId: null, insumoSrc: null };
}

function _cmGetInsumos() {
  var pf = state.profile;
  var lista = [];
  (state.estoqueItens || []).filter(function(x) { return !x.profile || x.profile === pf; }).forEach(function(x) {
    lista.push({ id: x.id, src: 'ei', nome: x.nome, unidade: x.unidade || 'un', custoMedio: x.custoMedio || x.custoAtual || 0, estoqueAtual: x.estoqueAtual || 0, estoqueMinimo: x.estoqueMinimo || 0, categoria: x.categoria || '' });
  });
  (state.produtos || []).filter(function(x) { return (!x.profile || x.profile === pf) && x.tipo === 'insumo' && x.ativo !== false; }).forEach(function(x) {
    if (!lista.some(function(y) { return y.nome.toLowerCase() === x.nome.toLowerCase(); }))
      lista.push({ id: x.id, src: 'pr', nome: x.nome, unidade: x.unidade || 'un', custoMedio: x.custoMedio || 0, estoqueAtual: x.estoqueAtual || 0, estoqueMinimo: x.estoqueMinimo || 0, categoria: x.categoria || '' });
  });
  return lista;
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
  // Remove dropdowns de renders anteriores
  var _oldSugs = document.querySelectorAll('.cm-sug-div');
  for (var _si = 0; _si < _oldSugs.length; _si++) { if (_oldSugs[_si].parentNode) _oldSugs[_si].parentNode.removeChild(_oldSugs[_si]); }
  while (container.firstChild) container.removeChild(container.firstChild);

  var _allInsumos = _cmGetInsumos();

  _cmItens.forEach(function(it, idx) {
    var row = el('div', { style: {
      display: 'grid',
      gridTemplateColumns: '3fr 68px 56px 110px 110px 28px',
      gap: '4px',
      marginBottom: '4px',
      alignItems: 'center',
    }});

    // ── Autocomplete de insumo ─────────────────────────────────────────────
    var _selIns = it.insumoId ? _allInsumos.filter(function(x) { return x.id === it.insumoId; })[0] : null;
    var nomeInp = el('input', { class: 'form-input', placeholder: '🔍 Buscar insumo...', style: { fontSize: '12px' }, autocomplete: 'off' });
    nomeInp.value = _selIns ? _selIns.nome : (it.item || '');
    // Suggestion div fixo no body para não ser cortado pelo overflow do modal
    var sugDiv = el('div', { style: {
      display: 'none', position: 'fixed', zIndex: '99999',
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,.25)', maxHeight: '210px', overflowY: 'auto',
    }});
    sugDiv.className = 'cm-sug-div';
    document.body.appendChild(sugDiv);
    var nomWrap = el('div', { style: { position: 'relative' } }, [nomeInp]);
    (function(i, nd, sd, insumos) {
      function _fil(q) {
        if (!q) return insumos;
        var ql = q.toLowerCase();
        return insumos.filter(function(x) { return x.nome.toLowerCase().indexOf(ql) >= 0 || (x.categoria && x.categoria.toLowerCase().indexOf(ql) >= 0); });
      }
      function _pos() {
        var r = nd.getBoundingClientRect();
        sd.style.top = (r.bottom + 3) + 'px';
        sd.style.left = r.left + 'px';
        sd.style.width = r.width + 'px';
      }
      function _show(lista) {
        while (sd.firstChild) sd.removeChild(sd.firstChild);
        _pos();
        if (!lista.length) {
          sd.appendChild(el('div', { style: { padding: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--text3)' } }, 'Nenhum insumo encontrado'));
          sd.style.display = 'block'; return;
        }
        lista.slice(0, 50).forEach(function(x) {
          var sBg = x.estoqueAtual <= 0 ? 'var(--danger)' : (x.estoqueMinimo > 0 && x.estoqueAtual <= x.estoqueMinimo) ? '#c9a84c' : 'var(--green)';
          var sLbl = x.estoqueAtual <= 0 ? 'zerado' : (x.estoqueMinimo > 0 && x.estoqueAtual <= x.estoqueMinimo) ? 'crítico' : 'ok';
          var r2 = el('div', { style: { padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', transition: 'background .1s' } });
          r2.onmouseenter = function() { r2.style.background = 'var(--bg3)'; };
          r2.onmouseleave = function() { r2.style.background = ''; };
          var inf = el('div', { style: { flex: '1', minWidth: '0' } });
          inf.appendChild(el('div', { style: { fontWeight: '600', fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, '⚙️ ' + x.nome));
          inf.appendChild(el('div', { style: { fontSize: '10px', color: 'var(--text3)', marginTop: '1px' } }, (x.categoria || 'insumo') + ' · Estoque: ' + x.estoqueAtual + ' ' + x.unidade + (x.custoMedio > 0 ? ' · ' + fmtMoney(x.custoMedio) : '')));
          r2.appendChild(inf);
          r2.appendChild(el('span', { style: { fontSize: '9px', fontWeight: '700', color: '#fff', background: sBg, padding: '2px 6px', borderRadius: '8px', flexShrink: '0' } }, sLbl));
          r2.onmousedown = function(e) {
            e.preventDefault();
            // Verifica se este insumo já existe em outra linha da compra
            var _dupIdx = -1;
            _cmItens.forEach(function(it2, j) { if (j !== i && it2.insumoId === x.id) _dupIdx = j; });
            if (_dupIdx >= 0 && !confirm('⚠️ Duplicidade detectada!\n\n"' + x.nome + '" já foi adicionado na linha ' + (_dupIdx + 1) + ' desta compra.\n\nDeseja mesmo repetir este produto?')) {
              return;
            }
            sd.style.display = 'none';
            _cmItens[i].item      = x.nome;
            _cmItens[i].insumoId  = x.id;
            _cmItens[i].insumoSrc = x.src;
            _cmItens[i].unidade   = x.unidade || 'un';
            nd.value = x.nome;
            // Auto-preenche unidade no select da linha
            var rowEl = nd.closest ? nd.closest('[style*="grid-template-columns"]') : null;
            if (rowEl) { var undEl = rowEl.querySelector('select'); if (undEl) undEl.value = x.unidade || 'un'; }
            // Auto-preenche preço se estiver vazio
            if (x.custoMedio > 0) {
              _cmItens[i].precoUnit = x.custoMedio;
              var puEl = document.getElementById('cmi-pu-' + i);
              if (puEl && !parseFloat(puEl.value)) {
                puEl.value = String(x.custoMedio);
                var qtd2 = _cmItens[i].quantidade || 1;
                _cmItens[i].valorTotal = x.custoMedio * qtd2;
                var totEl2 = document.getElementById('cmi-tot-' + i);
                if (totEl2) totEl2.value = _cmItens[i].valorTotal.toFixed(2);
                _cmAtualizarTotal();
              }
            }
          };
          sd.appendChild(r2);
        });
        sd.style.display = 'block';
      }
      nd.oninput = function(e) { _cmItens[i].item = e.target.value; _cmItens[i].insumoId = null; _cmItens[i].insumoSrc = null; _show(_fil(e.target.value)); };
      nd.onfocus = function() { _show(_fil(this.value)); };
      nd.onblur  = function() { setTimeout(function() { sd.style.display = 'none'; }, 160); };
    })(idx, nomeInp, sugDiv, _allInsumos);

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

    row.appendChild(nomWrap);
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
  // Limpa dropdowns de autocomplete que possam ter ficado no body
  var _os = document.querySelectorAll('.cm-sug-div');
  for (var _si = 0; _si < _os.length; _si++) { if (_os[_si].parentNode) _os[_si].parentNode.removeChild(_os[_si]); }

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
        insumoId:   x.insumoId   || null,
        insumoSrc:  x.insumoSrc  || null,
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

    // ── Atualiza estoque para itens vinculados a insumos ────────────────────
    var pf2 = state.profile;
    var estItens  = (state.estoqueItens || []).slice();
    var estMovs   = (state.estoqueMovs  || []).slice();
    var produtos2 = (state.produtos     || []).slice();
    var estoqueAtualizado = false;
    var now2 = new Date().toISOString();

    itensParaSalvar.forEach(function(x) {
      if (!x.insumoId || isEdit) return; // só na criação (evita duplo lançamento em edições)
      var qtd2 = x.quantidade || 0;
      var cu   = x.precoUnit  || 0;
      if (x.insumoSrc === 'ei') {
        var iIdx = -1;
        estItens.forEach(function(ei, j) { if (ei.id === x.insumoId) iIdx = j; });
        if (iIdx < 0) return;
        var ins = estItens[iIdx];
        var qtdAnt = ins.estoqueAtual || 0;
        var cmAnt  = ins.custoMedio  || 0;
        var qtdNova = qtdAnt + qtd2;
        var cmNovo  = qtdAnt <= 0 ? cu : (cu > 0 ? (qtdAnt * cmAnt + qtd2 * cu) / (qtdAnt + qtd2) : cmAnt);
        estItens[iIdx] = Object.assign({}, ins, { estoqueAtual: qtdNova, custoMedio: cmNovo, custoAtual: cu || ins.custoAtual, atualizadoEm: now2 });
        estMovs.push({ id: uid(), profile: pf2, insumoId: x.insumoId, insumoNome: ins.nome, tipo: 'entrada', quantidade: qtd2, custoUnit: cu, valorTotal: x.valorTotal || 0, qtdAntes: qtdAnt, qtdDepois: qtdNova, motivo: 'Compra', compraId: compra.id, data: compra.dataCompra, obs: compra.nf ? 'NF: ' + compra.nf : '', criadoEm: now2 });
        estoqueAtualizado = true;
      } else if (x.insumoSrc === 'pr') {
        var pIdx = -1;
        produtos2.forEach(function(p, j) { if (p.id === x.insumoId) pIdx = j; });
        if (pIdx < 0) return;
        var prd = produtos2[pIdx];
        var qtdAnt3 = prd.estoqueAtual || 0;
        var cmAnt3  = prd.custoMedio  || 0;
        var qtdNova3 = qtdAnt3 + qtd2;
        var cmNovo3  = qtdAnt3 <= 0 ? cu : (cu > 0 ? (qtdAnt3 * cmAnt3 + qtd2 * cu) / (qtdAnt3 + qtd2) : cmAnt3);
        produtos2[pIdx] = Object.assign({}, prd, { estoqueAtual: qtdNova3, custoMedio: cmNovo3, atualizadoEm: now2 });
        estoqueAtualizado = true;
      }
    });

    var stPatch = { compras: lista, compraModal: null };
    lsSet('compras', lista);
    if (estoqueAtualizado) {
      lsSet('estoqueItens', estItens);
      lsSet('estoqueMovs',  estMovs);
      lsSet('produtos',     produtos2);
      Object.assign(stPatch, { estoqueItens: estItens, estoqueMovs: estMovs, produtos: produtos2 });
    }
    setState(stPatch);
    scheduleSave();
    showToast(isEdit ? 'Compra atualizada!' : 'Compra registrada!' + (estoqueAtualizado ? ' Estoque atualizado ✓' : ''));
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
    // Detecta duplicatas já existentes na lista antes de adicionar nova linha
    var _ids = {}, _dupNomes = [];
    _cmItens.forEach(function(it) {
      if (it.insumoId) {
        if (_ids[it.insumoId] && _dupNomes.indexOf(it.item) < 0) _dupNomes.push(it.item);
        _ids[it.insumoId] = true;
      }
    });
    if (_dupNomes.length && !confirm('⚠️ Produtos duplicados identificados!\n\n' + _dupNomes.map(function(n){ return '• ' + n; }).join('\n') + '\n\nVerifique se os itens acima estão corretos antes de adicionar mais um produto.\n\nContinuar mesmo assim?')) {
      return;
    }
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
