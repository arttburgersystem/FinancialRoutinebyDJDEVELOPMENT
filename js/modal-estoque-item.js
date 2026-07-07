// ── MODAL ITEM DE ESTOQUE ─────────────────────────────────────────────────────

function renderEstoqueItemModal() {
  var m = state.estoqueItemModal;
  if (!m) return null;

  var edit   = m.editItem || {};
  var isEdit = !!edit.id;

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
      obs:           g('obs').trim(),
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
    setState({ estoqueItens: lista, estoqueMovs: movs, estoqueItemModal: null });
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

  // Linha quantidade min/max
  var qtdRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } });
  qtdRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Estoque mínimo'), mkInp('estoqueMinimo', 'number', '0', edit.estoqueMinimo != null ? edit.estoqueMinimo : '')]));
  qtdRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Estoque máximo'), mkInp('estoqueMaximo', 'number', '0', edit.estoqueMaximo || '')]));

  // Custo + preço + margem preview
  var custoRow = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '8px', alignItems: 'end' } });
  var custoInp = mkInp('custoAtual', 'number', '0,00', edit.custoAtual || '');
  custoInp.setAttribute('min', '0'); custoInp.setAttribute('step', '0.01');
  custoInp.oninput = atualizarMargem;
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
            var allCats = _EI_CATS.concat((state.estCategorias || []).filter(function(c) { return _EI_CATS.indexOf(c) === -1; }));
            var catSel = el('select', { class: 'form-input', id: 'ei-categoria' });
            ['— Categoria —'].concat(allCats).forEach(function(c) {
              var v = c === '— Categoria —' ? '' : c;
              var opt = el('option', { value: v }, c);
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
              if (cats.indexOf(nome) === -1) {
                cats = cats.concat([nome]);
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
      ]),

      // Estoque inicial (só criação)
      estoqueIniBlock,

      // Limites de estoque
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📊 Limites de Estoque'),
        qtdRow,
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
  ov.onclick = function(e) { if (e.target === ov) setState({ estoqueItemModal: null }); };
  setTimeout(atualizarMargem, 0);
  return ov;
}
