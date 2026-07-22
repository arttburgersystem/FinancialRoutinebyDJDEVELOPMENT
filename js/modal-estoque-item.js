// ── MODAL ITEM DE ESTOQUE ─────────────────────────────────────────────────────
var _eiIngredientes = [];
var _eiItemModalId  = null;

function renderEstoqueItemModal() {
  var m = state.estoqueItemModal;
  if (!m) { _eiItemModalId = null; return null; }

  var edit   = m.editItem || {};
  var isEdit = !!edit.id;

  // Initialize ingredients when item changes
  var _eiCurId = edit.id || '__new__';
  if (_eiCurId !== _eiItemModalId) {
    _eiItemModalId = _eiCurId;
    var _ftEIInit = edit.id ? (state.fichaTecnicas || []).filter(function(ft) {
      return ft.estoqueItemId === edit.id;
    })[0] : null;
    _eiIngredientes = _ftEIInit && _ftEIInit.ingredientes
      ? _ftEIInit.ingredientes.map(function(x) { return Object.assign({}, x); })
      : [];
  }

  function g(id) { var e = document.getElementById('ei-' + id); return e ? e.value : ''; }

  function mkInp(id, type, ph, val, readonly) {
    var attrs = { class: 'form-input', type: type || 'text', id: 'ei-' + id, placeholder: ph || '' };
    if (readonly) attrs.readonly = true;
    var i = el('input', attrs);
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }

  function mkSel(id, optsArr, selVal) {
    var s = el('select', { class: 'form-input', id: 'ei-' + id });
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

  // Calcula e exibe margem em tempo real
  function atualizarMargem() {
    var pv = parseFloat((document.getElementById('ei-precoVenda') || {}).value) || 0;
    var cm = parseFloat((document.getElementById('ei-custoAtual') || {}).value) || 0;
    var mg = document.getElementById('ei-margem-preview');
    if (mg) {
      if (pv && cm) {
        var pct = ((pv - cm) / pv * 100);
        mg.textContent = pct.toFixed(1) + '%';
        mg.style.color = pct >= 40 ? '#00a86b' : pct >= 20 ? 'var(--gold)' : '#e05252';
      } else {
        mg.textContent = '—';
        mg.style.color = 'var(--text3)';
      }
    }
  }

  function save() {
    var nome = g('nome').trim();
    if (!nome) { showToast('Informe o nome do produto', 'error'); return; }

    var custoAtual = parseFloat(g('custoAtual')) || 0;
    var precoVenda = parseFloat(g('precoVenda')) || 0;
    var estoqueIni = parseFloat(g('estoqueAtual')) || 0;
    var estoqueMin = parseFloat(g('estoqueMinimo')) || 0;
    var estoqueMax = parseFloat(g('estoqueMaximo')) || 0;

    var margem = precoVenda && custoAtual
      ? (precoVenda - custoAtual) / precoVenda * 100
      : null;

    var now = new Date().toISOString();

    var novoItem = {
      id:            edit.id || uid(),
      profile:       state.profile,
      nome:          nome,
      categoria:     g('categoria') === '— Categoria —' ? '' : g('categoria'),
      unidade:       g('unidade') || 'un',
      estoqueAtual:  isEdit ? (edit.estoqueAtual || 0) : estoqueIni,
      estoqueMinimo: estoqueMin,
      estoqueMaximo: estoqueMax || null,
      custoMedio:    isEdit ? (edit.custoMedio || custoAtual) : custoAtual,
      custoAtual:    custoAtual,
      precoVenda:    precoVenda,
      margemLucro:   margem,
      obs:              g('obs').trim(),
      fabricacaoPropria: !!(document.getElementById('ei-fabricacao') && document.getElementById('ei-fabricacao').checked),
      criadoEm:      edit.criadoEm || now,
      atualizadoEm:  now,
    };

    var lista = state.estoqueItens || [];
    var movs  = state.estoqueMovs  || [];

    if (isEdit) {
      lista = lista.map(function(x) { return x.id === novoItem.id ? novoItem : x; });
    } else {
      lista = lista.concat([novoItem]);
      // Cria movimentação de saldo inicial se tiver estoque
      if (estoqueIni > 0) {
        movs = movs.concat([{
          id:         uid(),
          profile:    state.profile,
          insumoId:   novoItem.id,
          insumoNome: nome,
          tipo:       'entrada',
          quantidade: estoqueIni,
          custoUnit:  custoAtual,
          valorTotal: estoqueIni * custoAtual,
          qtdAntes:   0,
          qtdDepois:  estoqueIni,
          custoMedioAntes:  0,
          custoMedioDepois: custoAtual,
          motivo:     'Saldo Inicial',
          data:       today(),
          criadoEm:  now,
        }]);
      }
    }

    lsSet('estoqueItens', lista);
    lsSet('estoqueMovs', movs);
    var patch = { estoqueItens: lista, estoqueMovs: movs, estoqueItemModal: null };
    if (!isEdit) { patch.estoqueCat = ''; patch.estoqueFiltro = 'todos'; patch.estoqueBusca = ''; }

    // Save ficha técnica if fabricação própria
    if (novoItem.fabricacaoPropria) {
      var _eiIngsValidos = _eiIngredientes.filter(function(ing) { return !!ing.insumoId; });
      if (_eiIngsValidos.length > 0) {
        var _ftCusto = Math.round(_eiIngsValidos.reduce(function(s, ing) { return s + (parseFloat(ing.custoTotal) || 0); }, 0) * 10000) / 10000;
        var _ftList = state.fichaTecnicas || [];
        var _ftExist = _ftList.filter(function(ft) { return ft.estoqueItemId === novoItem.id; })[0];
        var _ftNova = Object.assign({}, _ftExist || {}, {
          id:           (_ftExist && _ftExist.id) || uid(),
          profile:      state.profile,
          nome:         novoItem.nome,
          estoqueItemId: novoItem.id,
          ingredientes: _eiIngsValidos,
          custoTotal:   _ftCusto,
          custoPorcao:  _ftCusto,
          rendimento:   1,
          unidadeRend:  novoItem.unidade || 'un',
          criadoEm:     (_ftExist && _ftExist.criadoEm) || now,
        });
        var _ftListaNova = _ftExist
          ? _ftList.map(function(ft) { return ft.id === _ftNova.id ? _ftNova : ft; })
          : _ftList.concat([_ftNova]);
        lsSet('fichaTecnicas', _ftListaNova);
        patch.fichaTecnicas = _ftListaNova;
      }
    }

    setState(patch);
    scheduleSave();
    showToast(isEdit ? 'Produto atualizado!' : 'Produto cadastrado!');
  }

  function excluir() {
    if (!confirm('Excluir "' + (edit.nome || 'este produto') + '"? As movimentações NÃO serão excluídas.')) return;
    var lista = (state.estoqueItens || []).filter(function(x) { return x.id !== edit.id; });
    lsSet('estoqueItens', lista);
    setState({ estoqueItens: lista, estoqueItemModal: null });
    scheduleSave();
    showToast('Produto excluído', 'error');
  }

  function buildFabricacaoSection() {
    var _eiInsumos = (state.estoqueItens || []).filter(function(x) {
      return x.profile === state.profile && x.id !== (edit.id || null);
    });

    var ingListDiv = el('div', { id: 'ei-ing-list' });

    function _calcTotal() {
      return _eiIngredientes.reduce(function(sum, ing) { return sum + (parseFloat(ing.custoTotal) || 0); }, 0);
    }

    function _updateCustoFromFT() {
      var total = _calcTotal();
      var custoInpEl = document.getElementById('ei-custoAtual');
      if (custoInpEl) { custoInpEl.value = total.toFixed(2); atualizarMargem(); }
      var totEl = document.getElementById('ei-ft-total');
      if (totEl) totEl.textContent = fmtMoney(total);
    }

    function _eiRenderIngredientes() {
      var oldDrops = document.querySelectorAll('.ei-sug-ing');
      for (var _od = 0; _od < oldDrops.length; _od++) {
        if (oldDrops[_od].parentNode) oldDrops[_od].parentNode.removeChild(oldDrops[_od]);
      }
      while (ingListDiv.firstChild) ingListDiv.removeChild(ingListDiv.firstChild);

      if (!_eiIngredientes.length) {
        ingListDiv.appendChild(el('div', { style: { textAlign: 'center', color: 'var(--text3)', fontSize: '12px', padding: '12px' } }, 'Nenhum insumo adicionado. Clique em "+ Adicionar insumo" abaixo.'));
        _updateCustoFromFT();
        return;
      }

      ingListDiv.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px 70px 80px 24px', gap: '6px', alignItems: 'center', marginBottom: '6px', fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' } }, [
        el('span', {}, 'Insumo'), el('span', { style: { textAlign: 'center' } }, 'Qtd'), el('span', { style: { textAlign: 'center' } }, 'Un.'),
        el('span', { style: { textAlign: 'right' } }, 'Custo'), el('span', {}, ''),
      ]));

      _eiIngredientes.forEach(function(ing, idx) {
        if (ing.insumoId || ing.insumoNome) {
          var _curIns = ing.insumoId ? _eiInsumos.filter(function(x) { return x.id === ing.insumoId; })[0] : null;
          if ((!_curIns || !(_curIns.custoMedio > 0)) && ing.insumoNome) {
            var _byNome = _eiInsumos.filter(function(x) {
              return x.nome && x.nome.toLowerCase() === (ing.insumoNome || '').toLowerCase() && x.custoMedio > 0;
            }).sort(function(a, b) { return (b.custoMedio || 0) - (a.custoMedio || 0); });
            if (_byNome.length) _curIns = _byNome[0];
          }
          if (_curIns) {
            ing.insumoId   = _curIns.id;
            ing.custoUnit  = parseFloat(_curIns.custoMedio) || 0;
            ing.unidade    = _curIns.unidade || ing.unidade || 'un';
            ing.custoTotal = Math.round((parseFloat(ing.quantidade) || 0) * ing.custoUnit * 10000) / 10000;
          }
        }
        var _semCusto = ing.insumoId && !(ing.custoUnit > 0);
        var nomeInp = el('input', { class: 'form-input', type: 'text', placeholder: 'Nome do insumo...', style: { fontSize: '12px' }, autocomplete: 'off' });
        nomeInp.value = ing.insumoNome || '';
        var qi = el('input', { class: 'form-input', type: 'number', min: '0', step: 'any', placeholder: '0', style: { fontSize: '12px', textAlign: 'center' } });
        qi.value = ing.quantidade != null ? String(ing.quantidade) : '';
        var custoSpan = el('div', { style: { textAlign: 'right', fontSize: '12px', fontWeight: '700', color: _semCusto ? 'var(--danger)' : 'var(--text2)', padding: '2px 0', minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' } }, _semCusto ? '⚠️ sem custo' : fmtMoney(ing.custoTotal || 0));
        var rmBtn = el('button', { class: 'btn-ghost', style: { padding: '2px 6px', fontSize: '14px', color: 'var(--danger)', minWidth: '24px' } }, '×');
        rmBtn.onclick = function(e) { e.preventDefault(); _eiIngredientes.splice(idx, 1); _eiRenderIngredientes(); };
        ingListDiv.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 80px 70px 80px 24px', gap: '6px', alignItems: 'center', marginBottom: '4px' } }, [
          nomeInp, qi,
          el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'center', padding: '2px 0' } }, ing.unidade || 'un'),
          custoSpan, rmBtn,
        ]));

        qi.oninput = function() {
          var qtd = parseFloat(this.value) || 0;
          ing.quantidade = qtd;
          var _ins = ing.insumoId ? _eiInsumos.filter(function(x) { return x.id === ing.insumoId; })[0] : null;
          if (!_ins && ing.insumoNome) {
            _ins = _eiInsumos.filter(function(x) { return x.nome && x.nome.toLowerCase() === (ing.insumoNome || '').toLowerCase() && x.custoMedio > 0; }).sort(function(a, b) { return (b.custoMedio || 0) - (a.custoMedio || 0); })[0] || null;
          }
          if (_ins) { ing.custoUnit = parseFloat(_ins.custoMedio) || 0; ing.custoTotal = Math.round(qtd * ing.custoUnit * 10000) / 10000; }
          else { ing.custoTotal = 0; }
          custoSpan.textContent = fmtMoney(ing.custoTotal || 0);
          _updateCustoFromFT();
        };

        nomeInp.oninput = function() {
          var q = this.value.trim().toLowerCase();
          ing.insumoNome = this.value.trim(); ing.insumoId = null; ing.custoUnit = 0; ing.custoTotal = 0;
          var olds = document.querySelectorAll('.ei-sug-ing');
          for (var _i = 0; _i < olds.length; _i++) { if (olds[_i].parentNode) olds[_i].parentNode.removeChild(olds[_i]); }
          if (!q) return;
          var matches = _eiInsumos.filter(function(x) { return x.nome && x.nome.toLowerCase().includes(q); }).slice(0, 8);
          if (!matches.length) return;
          var sugDiv = document.createElement('div');
          sugDiv.className = 'ei-sug-ing';
          var rect = nomeInp.getBoundingClientRect();
          sugDiv.style.cssText = 'position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden;min-width:200px;max-height:200px;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,.18);';
          sugDiv.style.left = rect.left + 'px'; sugDiv.style.top = (rect.bottom + 2) + 'px'; sugDiv.style.width = Math.max(rect.width, 200) + 'px';
          matches.forEach(function(ins) {
            var it = document.createElement('div');
            it.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;';
            it.innerHTML = '<span>' + (ins.nome || '') + '</span><span style="font-size:11px;color:var(--text3)">' + (ins.unidade || 'un') + (ins.custoMedio > 0 ? ' · ' + fmtMoney(ins.custoMedio) : '') + '</span>';
            it.onmouseover = function() { this.style.background = 'var(--bg3)'; };
            it.onmouseout  = function() { this.style.background = ''; };
            it.onmousedown = function(e) {
              e.preventDefault();
              ing.insumoId = ins.id; ing.insumoNome = ins.nome; ing.unidade = ins.unidade || 'un';
              ing.custoUnit = parseFloat(ins.custoMedio) || 0;
              ing.quantidade = parseFloat(qi.value) || 1;
              if (!ing.quantidade) ing.quantidade = 1;
              ing.custoTotal = Math.round(ing.quantidade * ing.custoUnit * 10000) / 10000;
              var drops = document.querySelectorAll('.ei-sug-ing');
              for (var _d = 0; _d < drops.length; _d++) { if (drops[_d].parentNode) drops[_d].parentNode.removeChild(drops[_d]); }
              _eiRenderIngredientes();
            };
            sugDiv.appendChild(it);
          });
          document.body.appendChild(sugDiv);
          nomeInp.onblur = function() {
            setTimeout(function() {
              var drops = document.querySelectorAll('.ei-sug-ing');
              for (var _d = 0; _d < drops.length; _d++) { if (drops[_d].parentNode) drops[_d].parentNode.removeChild(drops[_d]); }
            }, 150);
          };
        };
      });

      ingListDiv.appendChild(el('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' } }, [
        el('span', { style: { fontSize: '12px', color: 'var(--text3)', fontWeight: '700' } }, 'Custo total de fabricação:'),
        el('span', { id: 'ei-ft-total', style: { fontSize: '16px', fontWeight: '800', color: 'var(--gold)' } }, fmtMoney(_calcTotal())),
      ]));
      _updateCustoFromFT();
    }

    var addIngBtn = btn('btn-ghost', '+ Adicionar insumo', function(e) {
      e.preventDefault();
      _eiIngredientes.push({ insumoId: null, insumoNome: '', quantidade: 1, unidade: 'un', custoUnit: 0, custoTotal: 0 });
      _eiRenderIngredientes();
    });
    addIngBtn.style.fontSize = '12px'; addIngBtn.style.marginTop = '8px';

    _eiRenderIngredientes();

    return el('div', { id: 'ei-fab-section' }, [
      el('div', { style: { fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' } }, 'Adicione os insumos que compõem este produto. O custo será calculado automaticamente.'),
      ingListDiv,
      addIngBtn,
    ]);
  }

  // Linha quantidade min/max
  var qtdRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } });
  qtdRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Estoque mínimo'), mkInp('estoqueMinimo', 'number', '0', edit.estoqueMinimo != null ? edit.estoqueMinimo : '')]));
  qtdRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Estoque máximo'), mkInp('estoqueMaximo', 'number', '0', edit.estoqueMaximo || '')]));

  // Custo + preço + margem preview
  var custoRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '8px', alignItems: 'end' } });
  var custoInp = mkInp('custoAtual', 'number', '0,00', edit.custoAtual || '');
  custoInp.setAttribute('min', '0'); custoInp.setAttribute('step', '0.01');
  custoInp.oninput = atualizarMargem;
  if (edit.fabricacaoPropria) { custoInp.readOnly = true; custoInp.style.background = 'var(--bg3)'; custoInp.style.color = 'var(--text3)'; }
  var pvInp = mkInp('precoVenda', 'number', '0,00', edit.precoVenda || '');
  pvInp.setAttribute('min', '0'); pvInp.setAttribute('step', '0.01');
  pvInp.oninput = atualizarMargem;
  custoRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Custo atual (R$)'), custoInp]));
  custoRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Preço de venda (R$)'), pvInp]));
  var margemPrev = el('div', { style: { textAlign: 'center', paddingBottom: '8px' } }, [
    el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' } }, 'Margem'),
    el('span', { id: 'ei-margem-preview', style: { fontSize: '20px', fontWeight: '800', color: 'var(--text3)' } }, '—'),
  ]);
  custoRow.appendChild(margemPrev);

  // Custo médio info (somente edição)
  var custoMedioInfo = null;
  if (isEdit && edit.custoMedio) {
    custoMedioInfo = el('div', { style: { padding: '8px 12px', borderRadius: '8px', background: 'var(--bg3)', border: '1px solid var(--border)', marginBottom: '8px', fontSize: '12px', color: 'var(--text3)' } }, [
      el('span', { style: { fontWeight: '700' } }, 'Custo médio atual: '),
      el('span', { style: { color: 'var(--gold)', fontWeight: '700' } }, fmtMoney(edit.custoMedio)),
      el('span', {}, ' — atualizado automaticamente a cada entrada'),
    ]);
  }

  // Estoque inicial (apenas criação)
  var estoqueIniBlock = null;
  if (!isEdit) {
    var esiInp = mkInp('estoqueAtual', 'number', '0', '');
    esiInp.setAttribute('min', '0'); esiInp.setAttribute('step', 'any');
    estoqueIniBlock = el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
      el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📥 Saldo Inicial'),
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } }, [
        el('div', {}, [el('label', { class: 'form-label' }, 'Qtd em estoque agora'), esiInp]),
        el('div', { style: { padding: '8px 0', fontSize: '12px', color: 'var(--text3)', alignSelf: 'end' } }, 'Uma movimentação de entrada será criada automaticamente'),
      ]),
    ]);
  }

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, isEdit ? '✏️ Editar produto' : '📦 Novo produto'),
      el('button', { class: 'modal-close', onclick: function() { setState({ estoqueItemModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '72vh', overflowY: 'auto' } }, [
      // Identificação
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📦 Identificação'),
        div('form-group', [el('label', { class: 'form-label' }, 'Nome do produto *'), mkInp('nome', 'text', 'Ex: Coca-Cola 2L', edit.nome || '')]),
        el('div', { style: { display: 'flex', gap: '8px' } }, [
          el('div', { style: { flex: '2' } }, (function() {
            var _rawCats = (state.estCategorias || []).map(function(c) {
              return typeof c === 'string' ? c : (c && c.nome ? c.nome : null);
            }).filter(function(c) { return c && _EI_CATS.indexOf(c) === -1; });
            var allCats = _EI_CATS.concat(_rawCats);
            var catSel = el('select', { class: 'form-input', id: 'ei-categoria' });
            ['— Categoria —'].concat(allCats).forEach(function(c) {
              var v = c === '— Categoria —' ? '' : c;
              var opt = el('option', { value: v }, String(c));
              if (v === (edit.categoria || '')) opt.selected = true;
              catSel.appendChild(opt);
            });
            var novaRow = el('div', { id: 'ei-newcat-row', style: { display: 'none', gap: '6px', marginTop: '6px' } });
            var novaInp = el('input', { class: 'form-input', type: 'text', id: 'ei-newcat-inp', placeholder: 'Nome da categoria...', style: { flex: '1', fontSize: '12px' } });
            var novaBtn = el('button', { class: 'btn-primary', style: { fontSize: '11px', padding: '4px 12px', whiteSpace: 'nowrap' }, onclick: function(e) {
              e.preventDefault();
              var nome = (document.getElementById('ei-newcat-inp') || {}).value || '';
              nome = nome.trim();
              if (!nome) { showToast('Informe o nome da categoria', 'error'); return; }
              var opt2 = el('option', { value: nome }, nome);
              opt2.selected = true;
              catSel.appendChild(opt2);
              var cats = (state.estCategorias || []);
              var exists = cats.some(function(c){
                var nm = typeof c === 'string' ? c : (c && c.nome ? c.nome : '');
                return nm.toLowerCase() === nome.toLowerCase();
              });
              if (!exists) {
                var novaCatEI = {id:'cat_'+Date.now(), nome:nome, imagem:''};
                cats = cats.concat([novaCatEI]);
                state.estCategorias = cats;
                lsSet('estCategorias', cats);
                scheduleSave();
              }
              novaRow.style.display = 'none';
              showToast('Categoria "' + nome + '" adicionada!');
            } }, 'Adicionar');
            novaRow.style.display = 'none';
            novaRow.appendChild(novaInp);
            novaRow.appendChild(novaBtn);
            var plusBtn = el('button', { class: 'btn-ghost', style: { fontSize: '11px', padding: '3px 8px', marginLeft: '6px', verticalAlign: 'middle' }, title: 'Criar nova categoria', onclick: function(e) {
              e.preventDefault();
              novaRow.style.display = novaRow.style.display === 'none' ? 'flex' : 'none';
              if (novaRow.style.display === 'flex') setTimeout(function() { var i = document.getElementById('ei-newcat-inp'); if (i) i.focus(); }, 50);
            } }, '+ Nova');
            return [
              el('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } }, [el('label', { class: 'form-label', style: { marginBottom: '0', flex: '1' } }, 'Categoria'), plusBtn]),
              catSel,
              novaRow,
            ];
          })()),
          el('div', { style: { flex: '1' } }, [el('label', { class: 'form-label' }, 'Unidade'), mkSel('unidade', _EI_UNIDADES, edit.unidade || 'un')]),
        ]),
        div('form-group', [el('label', { class: 'form-label' }, 'Observação / código'), mkInp('obs', 'text', 'SKU, marca, referência...', edit.obs || '')]),
        (function() {
          var chk = el('input', { type: 'checkbox', id: 'ei-fabricacao', style: { width: '16px', height: '16px', cursor: 'pointer', flexShrink: '0' } });
          if (edit.fabricacaoPropria) chk.checked = true;
          return el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer', userSelect: 'none' } }, [
            chk,
            el('span', { style: { fontSize: '13px', color: 'var(--text2)', fontWeight: '600' } }, '🏭 Produto de fabricação própria'),
          ]);
        })(),
      ]),

      // Estoque inicial (só criação)
      estoqueIniBlock,

      // Limites de estoque
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📊 Limites de Estoque'),
        qtdRow,
      ]),

      // Fabricação própria (ficha técnica)
      el('div', { id: 'ei-fab-wrapper', style: { display: edit.fabricacaoPropria ? 'block' : 'none', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '🏭 Ficha Técnica — Composição'),
        buildFabricacaoSection(),
      ]),

      // Custo e preço
      el('div', {}, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '💰 Custo e Preço'),
        custoMedioInfo,
        custoRow,
      ]),
    ].filter(Boolean)),
    div('modal-actions', [
      isEdit ? btn('btn-ghost', '🗑️ Excluir', excluir) : null,
      btn('btn-ghost', 'Cancelar', function() { setState({ estoqueItemModal: null }); }),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Cadastrar', save),
    ].filter(Boolean)),
  ]);
  modal.style.maxWidth = '560px';

  var ov = div('modal-overlay', [modal]);
  setTimeout(function() {
    atualizarMargem();
    var fabChk = document.getElementById('ei-fabricacao');
    if (fabChk) {
      fabChk.onchange = function() {
        var wrapper = document.getElementById('ei-fab-wrapper');
        if (wrapper) wrapper.style.display = this.checked ? 'block' : 'none';
        var custoEl = document.getElementById('ei-custoAtual');
        if (custoEl) {
          custoEl.readOnly = this.checked;
          custoEl.style.background = this.checked ? 'var(--bg3)' : '';
          custoEl.style.color = this.checked ? 'var(--text3)' : '';
          if (!this.checked) atualizarMargem();
        }
      };
    }
  }, 0);
  return ov;
}
