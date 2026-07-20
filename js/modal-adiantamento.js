// ── MODAL ADIANTAMENTO SALARIAL ───────────────────────────────────────────────

function renderAdiantamentoModal() {
  var m = state.adiantamentoModal;
  if (!m) return null;

  var pf       = state.profile;
  var mes      = m.mes || today().slice(0, 7);
  var ativos   = (state.funcionarios || []).filter(function(f) {
    return f.profile === pf && f.status !== 'inativo';
  });

  // Adiantamentos já registrados neste mês
  var jaReg = (state.adiantamentos || []).filter(function(a) {
    return a.profile === pf && a.mes === mes;
  });
  var jaRegMap = {};
  jaReg.forEach(function(a) { jaRegMap[a.funcionarioId] = a; });

  // Calcula líquido de cada funcionário
  function calcLiquido(sal) {
    sal = sal || 0;
    var inss = sal <= 1518 ? sal*0.075
             : sal <= 2793.88 ? sal*0.09
             : sal <= 4190.83 ? sal*0.12
             : sal <= 8157.41 ? sal*0.14 : 1201.86;
    inss = Math.round(inss*100)/100;
    var baseIrrf = sal - inss;
    var irrf = baseIrrf <= 2824 ? 0
             : baseIrrf <= 3751.05 ? baseIrrf*0.075 - 158.40
             : baseIrrf <= 4664.68 ? baseIrrf*0.15  - 370.40
             : baseIrrf <= 6101.06 ? baseIrrf*0.225 - 651.73
             : baseIrrf*0.275 - 884.96;
    irrf = Math.max(0, Math.round(irrf*100)/100);
    return Math.round((sal - inss - irrf)*100)/100;
  }

  // Valores editáveis por funcionário (40% do líquido como sugestão)
  var _vals = {};
  ativos.forEach(function(f) {
    var liq    = calcLiquido(f.salario);
    var jaFeito = jaRegMap[f.id];
    _vals[f.id] = {
      incluir:  !jaFeito,
      valor:    jaFeito ? jaFeito.valor : Math.round(liq * 0.40 * 100) / 100,
      liquido:  liq,
      salario:  f.salario || 0,
      jaFeito:  !!jaFeito,
    };
  });

  // Bancos disponíveis
  var bancos = (state.bancos || []).filter(function(b) { return b.profile === pf; });
  var bancoOpts = [{ v: '', l: '— Conta —' }].concat(bancos.map(function(b) {
    return { v: b.id, l: b.nome + (b.saldo != null ? ' · ' + fmtMoney(b.saldo) : '') };
  }));

  var FORMAS = ['Pix','Dinheiro','Transferência','Cartão de Débito'];

  // ── DOM helpers ──
  function mkSel(id, opts, selVal) {
    var s = el('select', { class: 'form-input', id: 'adi-' + id, style: { fontSize: '12px' } });
    opts.forEach(function(o) {
      var v = typeof o === 'string' ? o : o.v;
      var l = typeof o === 'string' ? o : o.l;
      var opt = el('option', { value: v }, l);
      if (v === selVal) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }
  function g(id) { var e = document.getElementById('adi-' + id); return e ? e.value : ''; }

  // ── Linha por funcionário ──
  var linhas = el('div', { id: 'adi-linhas' });

  function renderLinhas() {
    while (linhas.firstChild) linhas.removeChild(linhas.firstChild);
    ativos.forEach(function(f) {
      var vf = _vals[f.id];

      var row = el('div', { style: {
        display: 'grid', gridTemplateColumns: '28px 1fr 110px 110px 28px',
        gap: '8px', alignItems: 'center',
        padding: '8px 0', borderBottom: '1px solid var(--border)',
        opacity: (vf.incluir ? '1' : '0.45'),
      }});

      // Checkbox incluir
      var chk = el('input', { type: 'checkbox' });
      chk.checked = vf.incluir;
      if (vf.jaFeito) { chk.disabled = true; chk.title = 'Adiantamento já registrado'; }
      chk.onchange = function() {
        vf.incluir = chk.checked;
        row.style.opacity = chk.checked ? '1' : '0.45';
        recalcTotal();
      };
      row.appendChild(chk);

      // Nome + info
      var info = el('div', {});
      info.appendChild(el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, f.nome + (vf.jaFeito ? ' ✅' : '')));
      info.appendChild(el('div', { style: { fontSize: '11px', color: 'var(--text3)' } },
        'Líquido: ' + fmtMoney(vf.liquido) + ' · 40% = ' + fmtMoney(Math.round(vf.liquido*0.4*100)/100)));
      row.appendChild(info);

      // Valor do adiantamento (editável)
      var valInp = el('input', { class: 'form-input', type: 'number', style: { fontSize: '13px', fontWeight: '700', color: 'var(--gold)', textAlign: 'right' } });
      valInp.value = String(vf.valor);
      valInp.setAttribute('min', '0'); valInp.setAttribute('step', '0.01');
      if (vf.jaFeito) valInp.disabled = true;
      valInp.oninput = function() {
        vf.valor = parseFloat(valInp.value) || 0;
        recalcTotal();
      };
      row.appendChild(valInp);

      // Saldo a pagar (líquido - adiantamento)
      var saldoEl = el('div', { style: { fontSize: '12px', color: 'var(--green)', textAlign: 'right', fontWeight: '600' } });
      saldoEl.textContent = fmtMoney(Math.max(0, vf.liquido - vf.valor));
      valInp.oninput = (function(se, vf2, origFn) {
        return function() {
          origFn();
          se.textContent = fmtMoney(Math.max(0, vf2.liquido - vf2.valor));
        };
      })(saldoEl, vf, valInp.oninput);
      row.appendChild(saldoEl);

      // Ícone já feito
      var iconEl = el('div', { style: { fontSize: '16px', textAlign: 'center' } });
      iconEl.textContent = vf.jaFeito ? '✅' : '';
      row.appendChild(iconEl);

      linhas.appendChild(row);
    });
  }

  var totalEl = el('div', { style: { fontSize: '20px', fontWeight: '800', color: 'var(--gold)' } }, 'R$ 0,00');

  function recalcTotal() {
    var t = 0;
    ativos.forEach(function(f) {
      var vf = _vals[f.id];
      if (vf.incluir && !vf.jaFeito) t += vf.valor || 0;
    });
    totalEl.textContent = fmtMoney(t);
  }

  function save() {
    var bancoId   = g('banco');
    var formaPgto = g('formaPgto');
    var dataAdi   = g('data');
    if (!dataAdi) { showToast('Informe a data do adiantamento', 'error'); return; }

    var novasContas      = (state.contas || []).slice();
    var novosAdiant      = (state.adiantamentos || []).slice();
    var novosBancos      = (state.bancos || []).slice();
    var algum            = false;

    ativos.forEach(function(f) {
      var vf = _vals[f.id];
      if (!vf.incluir || vf.jaFeito || !vf.valor) return;
      algum = true;

      var contaId = 'conta_adi_' + f.id + '_' + mes.replace('-','');

      // Lançamento financeiro de saída
      var conta = {
        id:          contaId,
        tipo:        'pagar',
        profile:     pf,
        descricao:   'Adiantamento salarial — ' + f.nome,
        valor:       vf.valor,
        categoria:   'Pessoal / RH',
        vencimento:  dataAdi,
        status:      'pago',
        formaPgto:   formaPgto,
        banco:       bancoId,
        fornecedor:  f.nome,
        notas:       'Adiantamento dia 20 — ' + mes,
      };
      novasContas.push(conta);

      // Desconta do saldo do banco
      if (bancoId) {
        novosBancos = novosBancos.map(function(b) {
          if (b.id !== bancoId) return b;
          return Object.assign({}, b, { saldo: Math.round(((b.saldo || 0) - vf.valor) * 100) / 100 });
        });
      }

      // Registro do adiantamento
      novosAdiant.push({
        id:             uid(),
        profile:        pf,
        mes:            mes,
        funcionarioId:  f.id,
        funcionarioNome:f.nome,
        valorSalario:   vf.salario,
        valorLiquido:   vf.liquido,
        valorAdiantamento: vf.valor,
        data:           dataAdi,
        formaPgto:      formaPgto,
        banco:          bancoId,
        contaId:        contaId,
        criadoEm:       new Date().toISOString(),
      });
    });

    if (!algum) { showToast('Nenhum funcionário selecionado', 'error'); return; }

    lsSet('contas',        novasContas);
    lsSet('bancos',        novosBancos);
    lsSet('adiantamentos', novosAdiant);
    setState({ contas: novasContas, bancos: novosBancos, adiantamentos: novosAdiant, adiantamentoModal: null });
    scheduleSave();
    showToast('Adiantamentos registrados com sucesso!');
  }

  // Cabeçalho da tabela
  var thead = el('div', { style: {
    display: 'grid', gridTemplateColumns: '28px 1fr 110px 110px 28px',
    gap: '8px', padding: '0 0 6px 0', borderBottom: '2px solid var(--border)', marginBottom: '4px',
  }});
  ['', 'Funcionário', 'Adiantamento (R$)', 'Saldo a pagar', ''].forEach(function(h) {
    thead.appendChild(el('span', { style: { fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', textAlign: h === 'Adiantamento (R$)' || h === 'Saldo a pagar' ? 'right' : 'left' } }, h));
  });

  var mesLabel = (function() {
    var p = mes.split('-');
    var ML = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return ML[parseInt(p[1])-1] + '/' + p[0];
  })();

  // Dia 20 do mês corrente como default
  var defaultData = mes + '-20';

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, '💵 Adiantamentos Salariais — ' + mesLabel),
      el('button', { class: 'modal-close', onclick: function() { setState({ adiantamentoModal: null }); } }, '×'),
    ]),
    el('div', { style: { maxHeight: '75vh', overflowY: 'auto' } }, [

      // Config geral
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px', padding: '12px', background: 'var(--bg3)', borderRadius: '8px' } }, [
        el('div', {}, [el('label', { class: 'form-label' }, 'Data do pagamento'), el('input', { class: 'form-input', type: 'date', id: 'adi-data', value: defaultData, style: { fontSize: '12px' } })]),
        el('div', {}, [el('label', { class: 'form-label' }, 'Forma de pagamento'), mkSel('formaPgto', FORMAS, 'Pix')]),
        el('div', {}, [el('label', { class: 'form-label' }, 'Conta debitada'), mkSel('banco', bancoOpts, bancos.length === 1 ? bancos[0].id : '')]),
      ]),

      // Tabela funcionários
      el('div', { style: { marginBottom: '16px' } }, [
        thead,
        linhas,
      ]),

      // Total
      el('div', { style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '2px solid var(--border)' } }, [
        el('span', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase' } }, 'Total a pagar:'),
        totalEl,
      ]),
    ]),
    div('modal-actions', [
      btn('btn-ghost', 'Cancelar', function() { setState({ adiantamentoModal: null }); }),
      btn('btn-primary', '✅ Confirmar adiantamentos', save),
    ]),
  ]);
  modal.style.maxWidth = '620px';

  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ adiantamentoModal: null }); };

  setTimeout(function() { renderLinhas(); recalcTotal(); }, 0);

  return ov;
}
