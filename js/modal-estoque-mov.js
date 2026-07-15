// ── MODAL MOVIMENTAÇÃO DE ESTOQUE ─────────────────────────────────────────────

var _emMovMotivos = {
  entrada: ['Compra','Devolução de Cliente','Transferência Entrada','Saldo Inicial','Outro'],
  saida:   ['Consumo Produção','Perda / Validade','Furto / Quebra','Transferência Saída','Venda Direta','Outro'],
  ajuste:  ['Inventário Físico','Correção de Lançamento','Outro'],
};

function renderEstoqueMovModal() {
  var m = state.estoqueMovModal;
  if (!m) return null;

  var pf      = state.profile;
  var itens   = (state.estoqueItens || []).filter(function(x) { return x.profile === pf; });
  var tipo    = m.tipo || 'entrada';
  var insumoId = m.insumoId || '';
  var compraId = m.compraId || null;

  // Encontra o insumo selecionado
  var insumoSel = itens.filter(function(x) { return x.id === insumoId; })[0] || null;

  function g(id) { var e = document.getElementById('em-' + id); return e ? e.value : ''; }

  function mkInp(id, type, ph, val) {
    var i = el('input', { class: 'form-input', type: type || 'text', id: 'em-' + id, placeholder: ph || '' });
    if (val !== undefined && val !== null && val !== '') i.value = String(val);
    return i;
  }

  function mkSel(id, optsArr, selVal) {
    var s = el('select', { class: 'form-input', id: 'em-' + id });
    optsArr.forEach(function(o) {
      var v = typeof o === 'string' ? o : o.v;
      var l = typeof o === 'string' ? o : o.l;
      var opt = el('option', { value: v }, l);
      if (v === selVal) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  // Atualiza preview ao mudar valores
  function atualizarPreview() {
    var selId = (document.getElementById('em-insumoId') || {}).value || '';
    var ins   = itens.filter(function(x) { return x.id === selId; })[0] || null;
    var tp    = (document.getElementById('em-tipo') || {}).value || tipo;
    var qtd   = parseFloat((document.getElementById('em-quantidade') || {}).value) || 0;
    var cu    = parseFloat((document.getElementById('em-custoUnit') || {}).value) || 0;

    // Total
    var totEl = document.getElementById('em-valorTotal');
    if (totEl && qtd && cu) totEl.value = (qtd * cu).toFixed(2);

    // Preview
    var prev = document.getElementById('em-preview');
    if (!prev || !ins) return;

    var qtdAtual = ins.estoqueAtual || 0;
    var qtdNova  = tp === 'entrada' ? qtdAtual + qtd : tp === 'saida' ? qtdAtual - qtd : qtd;
    var cmAtual  = ins.custoMedio || 0;
    var cmNovo   = cmAtual;

    if (tp === 'entrada' && qtd > 0 && cu > 0) {
      if (qtdAtual <= 0) {
        cmNovo = cu;
      } else {
        cmNovo = (qtdAtual * cmAtual + qtd * cu) / (qtdAtual + qtd);
      }
    }

    var qtdCor = qtdNova < 0 ? '#e05252' : qtdNova < (ins.estoqueMinimo || 0) ? 'var(--gold)' : '#00a86b';

    while (prev.firstChild) prev.removeChild(prev.firstChild);
    prev.appendChild(el('div', { style: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' } }, [
      el('div', { style: { textAlign: 'center' } }, [
        el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Estoque Antes'),
        el('div', { style: { fontSize: '20px', fontWeight: '800', color: 'var(--text)' } }, String(qtdAtual)),
      ]),
      el('div', { style: { fontSize: '20px', color: 'var(--text3)', alignSelf: 'center' } }, '→'),
      el('div', { style: { textAlign: 'center' } }, [
        el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Estoque Depois'),
        el('div', { style: { fontSize: '20px', fontWeight: '800', color: qtdCor } }, String(qtdNova.toFixed(2).replace(/\.?0+$/, ''))),
      ]),
      tp === 'entrada' && cmNovo !== cmAtual ? el('div', { style: { textAlign: 'center' } }, [
        el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Custo Médio'),
        el('div', { style: { fontSize: '16px', fontWeight: '800', color: 'var(--gold)' } }, fmtMoney(cmAtual) + ' → ' + fmtMoney(cmNovo)),
      ]) : null,
    ].filter(Boolean)));
  }

  // Tipo chips
  var tipoEl = el('div', { style: { display: 'flex', gap: '6px', marginBottom: '12px' } });
  [
    { v: 'entrada', l: '⬆ Entrada', cor: '#00a86b' },
    { v: 'saida',   l: '⬇ Saída',   cor: '#e05252' },
    { v: 'ajuste',  l: '⚙ Ajuste',  cor: 'var(--primary)' },
  ].forEach(function(t) {
    var isActive = tipo === t.v;
    var tb = el('button', {}, t.l);
    tb.style.cssText = 'flex:1;padding:8px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;border:2px solid ' + (isActive ? t.cor : 'var(--border)') + ';background:' + (isActive ? t.cor + '22' : 'none') + ';color:' + (isActive ? t.cor : 'var(--text3)') + ';';
    (function(tv) {
      tb.onclick = function() {
        setState({ estoqueMovModal: Object.assign({}, m, { tipo: tv }) });
      };
    })(t.v);
    tipoEl.appendChild(tb);
  });

  // Select de insumo
  var insumoOpts = [{ v: '', l: '— Selecionar produto —' }].concat(
    itens.map(function(x) { return { v: x.id, l: x.nome + ' (' + (x.estoqueAtual || 0) + ' ' + (x.unidade || 'un') + ')' }; })
  );
  var insumoSel2 = mkSel('insumoId', insumoOpts, insumoId);
  insumoSel2.onchange = function(e) {
    setState({ estoqueMovModal: Object.assign({}, m, { insumoId: e.target.value }) });
  };

  // Motivos por tipo
  var motivoOpts = (_emMovMotivos[tipo] || []);

  // Campos de qtd e custo
  var qtdInp = mkInp('quantidade', 'number', '0', '');
  qtdInp.setAttribute('min', '0'); qtdInp.setAttribute('step', 'any');
  qtdInp.oninput = atualizarPreview;

  var custoInp = mkInp('custoUnit', 'number', '0,00', insumoSel ? (insumoSel.custoAtual || '') : '');
  custoInp.setAttribute('min', '0'); custoInp.setAttribute('step', '0.01');
  custoInp.oninput = atualizarPreview;

  var totInp = mkInp('valorTotal', 'number', '0,00', '');
  totInp.setAttribute('min', '0'); totInp.setAttribute('step', '0.01');
  totInp.oninput = function(e) {
    var tot  = parseFloat(e.target.value) || 0;
    var qtd  = parseFloat((document.getElementById('em-quantidade') || {}).value) || 0;
    if (qtd && tot) {
      var cu = document.getElementById('em-custoUnit');
      if (cu) cu.value = (tot / qtd).toFixed(4);
    }
    atualizarPreview();
  };

  // Alerta saída
  var alertaSaida = null;
  if (tipo === 'saida' && insumoSel) {
    alertaSaida = el('div', { style: { padding: '6px 10px', borderRadius: '6px', background: '#e0525211', border: '1px solid #e0525244', fontSize: '12px', color: '#e05252', marginBottom: '8px' } },
      '⚠ Estoque atual: ' + (insumoSel.estoqueAtual || 0) + ' ' + (insumoSel.unidade || 'un'));
  }

  // Info ajuste
  var infoAjuste = tipo === 'ajuste'
    ? el('div', { style: { padding: '6px 10px', borderRadius: '6px', background: 'var(--bg3)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' } },
      'ℹ No ajuste, informe a quantidade NOVA (absoluta) que o estoque deve ter.')
    : null;

  // Link compra info
  var compraInfo = compraId
    ? el('div', { style: { padding: '6px 10px', borderRadius: '6px', background: '#00a86b11', border: '1px solid #00a86b33', fontSize: '12px', color: '#00a86b', marginBottom: '8px' } },
      '🔗 Vinculada à compra: ' + compraId)
    : null;

  // Preview container
  var prevContainer = el('div', { id: 'em-preview', style: { padding: '12px', borderRadius: '8px', background: 'var(--bg3)', border: '1px solid var(--border)', marginTop: '12px', minHeight: '60px' } });

  // Linha qtd+custo+total
  var valoresRow = el('div', { style: { display: 'grid', gridTemplateColumns: tipo === 'entrada' ? '1fr 1fr 1fr' : '1fr', gap: '8px', marginBottom: '8px' } });
  if (tipo === 'ajuste') {
    valoresRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Nova quantidade (absoluta)'), qtdInp]));
  } else if (tipo === 'saida') {
    valoresRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Quantidade a retirar'), qtdInp]));
  } else {
    valoresRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Quantidade entrada'), qtdInp]));
    valoresRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Custo unit. (R$)'), custoInp]));
    valoresRow.appendChild(el('div', {}, [el('label', { class: 'form-label' }, 'Total (R$)'), totInp]));
  }

  function save() {
    var insId = g('insumoId');
    if (!insId) { showToast('Selecione o produto', 'error'); return; }
    var ins = itens.filter(function(x) { return x.id === insId; })[0];
    if (!ins) { showToast('Produto não encontrado', 'error'); return; }

    var qtd  = parseFloat(g('quantidade')) || 0;
    if (qtd <= 0) { showToast('Informe a quantidade', 'error'); return; }

    var cu   = parseFloat(g('custoUnit')) || 0;
    var tot  = parseFloat(g('valorTotal')) || (qtd * cu);
    var mot  = g('motivo') || '';
    var data = g('data') || today();
    var obs  = g('obs').trim();
    var tp   = tipo;

    var qtdAtual = ins.estoqueAtual || 0;
    var cmAtual  = ins.custoMedio   || 0;
    var qtdNova, cmNovo;

    if (tp === 'entrada') {
      qtdNova = qtdAtual + qtd;
      cmNovo  = qtdAtual <= 0 ? cu : (qtdAtual * cmAtual + qtd * cu) / (qtdAtual + qtd);
    } else if (tp === 'saida') {
      if (qtd > qtdAtual) {
        if (!confirm('Atenção: saída maior que o estoque disponível (' + qtdAtual + '). Continuar mesmo assim?')) return;
      }
      qtdNova = qtdAtual - qtd;
      cmNovo  = cmAtual;
    } else { // ajuste
      qtdNova = qtd;
      cmNovo  = cmAtual;
    }

    var now = new Date().toISOString();

    var mov = {
      id:               uid(),
      profile:          state.profile,
      insumoId:         insId,
      insumoNome:       ins.nome,
      tipo:             tp,
      quantidade:       qtd,
      custoUnit:        cu || null,
      valorTotal:       tot || null,
      qtdAntes:         qtdAtual,
      qtdDepois:        qtdNova,
      custoMedioAntes:  cmAtual,
      custoMedioDepois: cmNovo,
      motivo:           mot,
      compraId:         compraId || null,
      data:             data,
      obs:              obs,
      criadoEm:         now,
    };

    // Atualiza o insumo
    var itensNovos = (state.estoqueItens || []).map(function(x) {
      if (x.id !== insId) return x;
      return Object.assign({}, x, {
        estoqueAtual: qtdNova,
        custoMedio:   cmNovo,
        custoAtual:   tp === 'entrada' && cu ? cu : x.custoAtual,
        atualizadoEm: now,
      });
    });

    var movsNovos = (state.estoqueMovs || []).concat([mov]);
    lsSet('estoqueItens', itensNovos);
    lsSet('estoqueMovs', movsNovos);
    setState({ estoqueItens: itensNovos, estoqueMovs: movsNovos, estoqueMovModal: null });
    scheduleSave();
    showToast(tp === 'entrada' ? 'Entrada registrada!' : tp === 'saida' ? 'Saída registrada!' : 'Ajuste registrado!');
  }

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, tipo === 'entrada' ? '⬆ Entrada no Estoque' : tipo === 'saida' ? '⬇ Saída do Estoque' : '⚙ Ajuste de Estoque'),
      el('button', { class: 'modal-close', onclick: function() { setState({ estoqueMovModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '75vh', overflowY: 'auto' } }, [
      tipoEl,
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📦 Produto'),
        div('form-group', [el('label', { class: 'form-label' }, 'Produto *'), insumoSel2]),
        compraInfo,
        alertaSaida,
        infoAjuste,
      ]),
      el('div', { style: { borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' } }, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📐 Quantidade e Valores'),
        valoresRow,
        prevContainer,
      ]),
      el('div', {}, [
        el('div', { style: { fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' } }, '📋 Complemento'),
        el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' } }, [
          el('div', {}, [el('label', { class: 'form-label' }, 'Motivo'), mkSel('motivo', motivoOpts, motivoOpts[0] || '')]),
          el('div', {}, [el('label', { class: 'form-label' }, 'Data'), mkInp('data', 'date', '', today())]),
        ]),
        div('form-group', [el('label', { class: 'form-label' }, 'Observação'), mkInp('obs', 'text', 'Nota fiscal, referência...', compraId ? ('Compra ' + compraId) : '')]),
      ]),
    ].filter(Boolean)),
    div('modal-actions', [
      btn('btn-ghost', 'Cancelar', function() { setState({ estoqueMovModal: null }); }),
      btn('btn-primary', tipo === 'entrada' ? '✅ Registrar Entrada' : tipo === 'saida' ? '✅ Registrar Saída' : '✅ Confirmar Ajuste', save),
    ]),
  ]);
  modal.style.maxWidth = '560px';

  var ov = div('modal-overlay', [modal]);
  setTimeout(atualizarPreview, 0);
  return ov;
}
