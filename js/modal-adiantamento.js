// ── PAGAR FUNCIONÁRIOS ────────────────────────────────────────────────────────

function renderAdiantamentoModal() {
  var m = state.adiantamentoModal;
  if (!m) return null;

  var pf     = state.profile;
  var mes    = m.mes || today().slice(0, 7);
  var ativos = (state.funcionarios || []).filter(function(f) {
    return f.profile === pf && f.status !== 'inativo';
  }).sort(function(a, b) { return (a.nome || '').localeCompare(b.nome || ''); });

  // Tipo de pagamento: 'adiantamento' ou 'salario'
  var _tipo = m.tipo || 'adiantamento';

  // Adiantamentos já registrados neste mês
  var adiantMes = (state.adiantamentos || []).filter(function(a) {
    return a.profile === pf && a.mes === mes;
  });
  var adiantMap  = {};  // funcionarioId → registro de adiantamento do mês
  var salarioMap = {};  // funcionarioId → registro de salário do mês
  adiantMes.forEach(function(a) {
    if (a.tipo === 'salario') salarioMap[a.funcionarioId] = a;
    else                      adiantMap[a.funcionarioId]  = a;
  });

  // Calcula líquido de cada funcionário
  function calcLiquido(sal) {
    sal = sal || 0;
    var inss = sal <= 1518 ? sal*0.075
             : sal <= 2793.88 ? sal*0.09
             : sal <= 4190.83 ? sal*0.12
             : sal <= 8157.41 ? sal*0.14 : 1201.86;
    inss = Math.round(inss * 100) / 100;
    var base = sal - inss;
    var irrf = base <= 2824 ? 0
             : base <= 3751.05 ? base*0.075 - 158.40
             : base <= 4664.68 ? base*0.15  - 370.40
             : base <= 6101.06 ? base*0.225 - 651.73
             : base*0.275 - 884.96;
    irrf = Math.max(0, Math.round(irrf * 100) / 100);
    return Math.round((sal - inss - irrf) * 100) / 100;
  }

  // Bancos disponíveis
  var bancos = (state.bancos || []).filter(function(b) { return b.profile === pf; });
  var FORMAS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão de Débito'];

  // Estado do modal (referências mutáveis)
  var _sel   = {};  // funcionarioId → bool
  var _vals  = {};  // funcionarioId → valor a pagar
  var _banco = bancos.length === 1 ? bancos[0].id : '';
  var _forma = 'Pix';
  var _data  = mes + '-' + (_tipo === 'adiantamento' ? '20' : '05');

  // Pre-seleciona todos e calcula valores sugeridos
  ativos.forEach(function(f) {
    var liq    = calcLiquido(f.salario);
    var jaAdi  = adiantMap[f.id]  ? adiantMap[f.id].valorPago  : 0;
    var jaSal  = salarioMap[f.id] ? salarioMap[f.id].valorPago : 0;
    var jaFeito = _tipo === 'adiantamento' ? !!adiantMap[f.id] : !!salarioMap[f.id];

    var sugerido = _tipo === 'adiantamento'
      ? Math.round(liq * 0.40 * 100) / 100
      : Math.max(0, Math.round((liq - jaAdi) * 100) / 100);

    _sel[f.id]  = !jaFeito;
    _vals[f.id] = sugerido;
  });

  // ── DOM refs ──────────────────────────────────────────────────────────────
  var totalSel = el('span', { style: { fontWeight: '700', color: 'var(--text)' } }, '0');
  var totalVal = el('span', { style: { fontWeight: '800', fontSize: '18px', color: 'var(--gold)' } }, 'R$ 0,00');
  var tableBody = el('div', { id: 'pf-tbody' });

  function recalc() {
    var nSel = 0, soma = 0;
    ativos.forEach(function(f) {
      if (_sel[f.id]) { nSel++; soma += _vals[f.id] || 0; }
    });
    totalSel.textContent = String(nSel);
    totalVal.textContent = fmtMoney(soma);
    // atualiza cor do botão confirmar
    var btn = document.getElementById('pf-confirmar');
    if (btn) btn.disabled = nSel === 0;
  }

  function buildRows() {
    while (tableBody.firstChild) tableBody.removeChild(tableBody.firstChild);

    ativos.forEach(function(f, idx) {
      var liq    = calcLiquido(f.salario);
      var jaAdi  = adiantMap[f.id]  ? adiantMap[f.id].valorPago  : 0;
      var jaSal  = salarioMap[f.id] ? salarioMap[f.id].valorPago : 0;
      var jaFeito = _tipo === 'adiantamento' ? !!adiantMap[f.id] : !!salarioMap[f.id];

      var isSel = !!_sel[f.id];

      var row = el('div', { style: {
        display: 'grid',
        gridTemplateColumns: '36px 28px 1fr 100px 100px 130px',
        gap: '10px', alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        background: isSel && !jaFeito ? 'rgba(0,168,107,.04)' : '',
        opacity: jaFeito ? '0.55' : '1',
        transition: 'background .15s',
      }});

      // Nº
      row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'center' } }, String(idx + 1)));

      // Checkbox
      var chk = el('input', { type: 'checkbox' });
      chk.checked = isSel && !jaFeito;
      if (jaFeito) { chk.disabled = true; chk.title = 'Já registrado'; }
      (function(fid, r) {
        chk.onchange = function() {
          _sel[fid] = chk.checked;
          r.style.background = chk.checked ? 'rgba(0,168,107,.04)' : '';
          recalc();
        };
      })(f.id, row);
      row.appendChild(chk);

      // Nome + cargo + badge
      var nomeCol = el('div', {});
      var nomeLine = el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } });
      nomeLine.appendChild(el('span', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, f.nome));
      if (jaFeito) {
        nomeLine.appendChild(el('span', { style: { fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: '#00a86b22', color: '#00a86b', fontWeight: '700' } }, '✅ Pago'));
      }
      nomeCol.appendChild(nomeLine);
      if (f.cargo) nomeCol.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, f.cargo));
      if (_tipo === 'salario' && jaAdi > 0) {
        nomeCol.appendChild(el('div', { style: { fontSize: '10px', color: 'var(--gold)' } }, 'Adi: ' + fmtMoney(jaAdi) + ' · Saldo: ' + fmtMoney(Math.max(0, liq - jaAdi))));
      }
      row.appendChild(nomeCol);

      // Líquido
      row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } }, fmtMoney(liq)));

      // Sugerido
      var sugerido = _tipo === 'adiantamento'
        ? Math.round(liq * 0.40 * 100) / 100
        : Math.max(0, Math.round((liq - jaAdi) * 100) / 100);
      row.appendChild(el('div', { style: { fontSize: '12px', color: 'var(--text3)', textAlign: 'right' } }, fmtMoney(sugerido)));

      // Valor a pagar (editável)
      var valWrap = el('div', { style: { position: 'relative' } });
      var valInp = el('input', { type: 'number', style: {
        width: '100%', boxSizing: 'border-box',
        padding: '6px 8px', fontSize: '13px', fontWeight: '700',
        color: 'var(--gold)', textAlign: 'right',
        border: '1px solid var(--border)', borderRadius: '6px',
        background: 'var(--bg)', outline: 'none',
      }});
      valInp.value = String(_vals[f.id] || 0);
      valInp.setAttribute('min', '0'); valInp.setAttribute('step', '0.01');
      if (jaFeito) valInp.disabled = true;
      (function(fid) {
        valInp.oninput = function() {
          _vals[fid] = parseFloat(valInp.value) || 0;
          recalc();
        };
        valInp.onfocus = function() { valInp.select(); };
      })(f.id);
      valWrap.appendChild(valInp);
      row.appendChild(valWrap);

      tableBody.appendChild(row);
    });

    recalc();
  }

  // ── Cabeçalho da tabela ──────────────────────────────────────────────────
  var allChk = el('input', { type: 'checkbox' });
  allChk.checked = true;
  allChk.title = 'Selecionar / desmarcar todos';
  allChk.onchange = function() {
    ativos.forEach(function(f) {
      var jaFeito = _tipo === 'adiantamento' ? !!adiantMap[f.id] : !!salarioMap[f.id];
      if (!jaFeito) _sel[f.id] = allChk.checked;
    });
    buildRows();
  };

  var thead = el('div', { style: {
    display: 'grid', gridTemplateColumns: '36px 28px 1fr 100px 100px 130px',
    gap: '10px', padding: '8px 16px',
    background: 'var(--bg2)', borderBottom: '2px solid var(--border)',
  }});
  thead.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' } }, 'Nº'));
  thead.appendChild(allChk);
  ['Nome / Cargo', 'Sal. Líquido', 'Sugerido', 'Valor a Pagar'].forEach(function(h, i) {
    thead.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' } }, h));
  });

  // ── Seletor de tipo ──────────────────────────────────────────────────────
  function mkTipoBtn(tipo, label) {
    var b = el('button', { style: {
      padding: '7px 18px', fontSize: '13px', fontWeight: '600',
      borderRadius: '6px', cursor: 'pointer', border: '1.5px solid',
      transition: 'all .15s',
    }}, label);
    function apply() {
      var active = _tipo === tipo;
      b.style.background = active ? 'var(--primary)' : 'none';
      b.style.color = active ? '#fff' : 'var(--text3)';
      b.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
    }
    apply();
    b.onclick = function() {
      _tipo = tipo;
      _data = mes + '-' + (tipo === 'adiantamento' ? '20' : '05');
      dateInp.value = _data;
      // Recalcula valores sugeridos
      ativos.forEach(function(f) {
        var liq   = calcLiquido(f.salario);
        var jaAdi = adiantMap[f.id] ? adiantMap[f.id].valorPago : 0;
        var jaFeito = tipo === 'adiantamento' ? !!adiantMap[f.id] : !!salarioMap[f.id];
        _sel[f.id]  = !jaFeito;
        _vals[f.id] = tipo === 'adiantamento'
          ? Math.round(liq * 0.40 * 100) / 100
          : Math.max(0, Math.round((liq - jaAdi) * 100) / 100);
      });
      allChk.checked = true;
      buildRows();
      tipoAdi.style.background = tipo === 'adiantamento' ? 'var(--primary)' : 'none';
      tipoAdi.style.color      = tipo === 'adiantamento' ? '#fff' : 'var(--text3)';
      tipoAdi.style.borderColor= tipo === 'adiantamento' ? 'var(--primary)' : 'var(--border)';
      tipoSal.style.background = tipo === 'salario' ? 'var(--primary)' : 'none';
      tipoSal.style.color      = tipo === 'salario' ? '#fff' : 'var(--text3)';
      tipoSal.style.borderColor= tipo === 'salario' ? 'var(--primary)' : 'var(--border)';
    };
    return b;
  }
  var tipoAdi = mkTipoBtn('adiantamento', '💵 Adiantamento (dia 20)');
  var tipoSal = mkTipoBtn('salario',      '💰 Pagamento de Salário');

  // ── Configurações (banco, forma, data) ────────────────────────────────────
  var bancoSel = el('select', { style: {
    padding: '7px 10px', fontSize: '12px', border: '1px solid var(--border)',
    borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)', flex: '1',
  }});
  [{ v: '', l: '— Conta debitada —' }].concat(bancos.map(function(b) {
    return { v: b.id, l: b.nome + (b.saldo != null ? '  (' + fmtMoney(b.saldo) + ')' : '') };
  })).forEach(function(o) {
    var opt = el('option', { value: o.v }, o.l);
    if (o.v === _banco) opt.selected = true;
    bancoSel.appendChild(opt);
  });
  bancoSel.onchange = function() { _banco = bancoSel.value; };

  var formaSel = el('select', { style: {
    padding: '7px 10px', fontSize: '12px', border: '1px solid var(--border)',
    borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)', flex: '1',
  }});
  FORMAS.forEach(function(f) {
    var opt = el('option', { value: f }, f);
    if (f === _forma) opt.selected = true;
    formaSel.appendChild(opt);
  });
  formaSel.onchange = function() { _forma = formaSel.value; };

  var dateInp = el('input', { type: 'date', value: _data, style: {
    padding: '7px 10px', fontSize: '12px', border: '1px solid var(--border)',
    borderRadius: '6px', background: 'var(--bg)', color: 'var(--text)', flex: '1',
  }});
  dateInp.oninput = function() { _data = dateInp.value; };

  // Mês selector
  var MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var mesLabel = (function() {
    var p = mes.split('-');
    return MESES_LABEL[parseInt(p[1])-1] + '/' + p[0];
  })();

  // ── Salvar ───────────────────────────────────────────────────────────────
  function save() {
    if (!_data) { showToast('Informe a data do pagamento', 'error'); return; }

    var novasContas  = (state.contas || []).slice();
    var novosAdiant  = (state.adiantamentos || []).slice();
    var novosBancos  = (state.bancos || []).slice();
    var count = 0;

    ativos.forEach(function(f) {
      var jaFeito = _tipo === 'adiantamento' ? !!adiantMap[f.id] : !!salarioMap[f.id];
      if (!_sel[f.id] || jaFeito) return;
      var valor = parseFloat(_vals[f.id]) || 0;
      if (valor <= 0) return;
      count++;

      var contaId = 'conta_pf_' + f.id + '_' + mes.replace('-', '') + '_' + _tipo;
      var liq     = calcLiquido(f.salario);

      // Lançamento financeiro de saída
      novasContas.push({
        id:         contaId,
        tipo:       'pagar',
        profile:    pf,
        descricao:  (_tipo === 'adiantamento' ? 'Adiantamento salarial' : 'Pagamento de salário') + ' — ' + f.nome,
        valor:      valor,
        categoria:  'Pessoal / RH',
        vencimento: _data,
        status:     'pago',
        formaPgto:  _forma,
        banco:      _banco,
        fornecedor: f.nome,
        notas:      (_tipo === 'adiantamento' ? 'Adiantamento dia 20' : 'Pagamento de salário') + ' — ' + mesLabel,
      });

      // Desconta saldo do banco
      if (_banco) {
        novosBancos = novosBancos.map(function(b) {
          if (b.id !== _banco) return b;
          return Object.assign({}, b, { saldo: Math.round(((b.saldo || 0) - valor) * 100) / 100 });
        });
      }

      // Registro do pagamento
      novosAdiant.push({
        id:              uid(),
        profile:         pf,
        mes:             mes,
        tipo:            _tipo,
        funcionarioId:   f.id,
        funcionarioNome: f.nome,
        valorSalario:    f.salario || 0,
        valorLiquido:    liq,
        valorPago:       valor,
        data:            _data,
        formaPgto:       _forma,
        banco:           _banco,
        contaId:         contaId,
        criadoEm:        new Date().toISOString(),
      });
    });

    if (!count) { showToast('Selecione ao menos um funcionário com valor > 0', 'error'); return; }

    lsSet('contas',        novasContas);
    lsSet('bancos',        novosBancos);
    lsSet('adiantamentos', novosAdiant);
    setState({ contas: novasContas, bancos: novosBancos, adiantamentos: novosAdiant, adiantamentoModal: null });
    scheduleSave();
    showToast(count + ' pagamento(s) registrado(s) com sucesso!');
  }

  // ── Montar modal ─────────────────────────────────────────────────────────
  var confirmBtn = el('button', { id: 'pf-confirmar', style: {
    padding: '10px 24px', fontSize: '14px', fontWeight: '700',
    background: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    flexShrink: '0',
  }}, '✅ Confirmar pagamento');
  confirmBtn.onclick = save;

  var modal = div('modal', [
    // Título
    div('modal-title', [
      el('span', {}, '💵 Pagar Funcionários — ' + mesLabel),
      el('button', { class: 'modal-close', onclick: function() { setState({ adiantamentoModal: null }); } }, '×'),
    ]),

    el('div', { style: { maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' } }, [

      // Tipo de pagamento
      el('div', { style: { display: 'flex', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' } }, [
        tipoAdi, tipoSal,
      ]),

      // Configurações
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg3)' } }, [
        el('div', {}, [el('label', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' } }, 'Conta debitada'), bancoSel]),
        el('div', {}, [el('label', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' } }, 'Forma de pagamento'), formaSel]),
        el('div', {}, [el('label', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' } }, 'Data do pagamento'), dateInp]),
      ]),

      // Tabela
      thead,
      tableBody,
    ]),

    // Rodapé fixo
    el('div', { style: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', borderTop: '2px solid var(--border)',
      background: 'var(--bg2)', gap: '16px',
    }}, [
      el('div', { style: { display: 'flex', gap: '20px', alignItems: 'center' } }, [
        el('div', {}, [
          el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Selecionados'),
          totalSel,
        ]),
        el('div', {}, [
          el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Total'),
          totalVal,
        ]),
      ]),
      confirmBtn,
    ]),
  ]);
  modal.style.maxWidth  = '700px';
  modal.style.width     = '95vw';

  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ adiantamentoModal: null }); };

  setTimeout(function() { buildRows(); }, 0);

  return ov;
}
