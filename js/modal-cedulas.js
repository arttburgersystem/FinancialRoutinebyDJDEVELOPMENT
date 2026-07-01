// ── MODAL CONTADOR DE CÉDULAS ─────────────────────────────────────────────────

var _CEDULAS = [
  { val: 200,  label: 'R$ 200',  tipo: 'cedula' },
  { val: 100,  label: 'R$ 100',  tipo: 'cedula' },
  { val: 50,   label: 'R$ 50',   tipo: 'cedula' },
  { val: 20,   label: 'R$ 20',   tipo: 'cedula' },
  { val: 10,   label: 'R$ 10',   tipo: 'cedula' },
  { val: 5,    label: 'R$ 5',    tipo: 'cedula' },
  { val: 2,    label: 'R$ 2',    tipo: 'cedula' },
  { val: 1,    label: 'R$ 1,00', tipo: 'moeda'  },
  { val: 0.5,  label: 'R$ 0,50', tipo: 'moeda'  },
  { val: 0.25, label: 'R$ 0,25', tipo: 'moeda'  },
  { val: 0.1,  label: 'R$ 0,10', tipo: 'moeda'  },
  { val: 0.05, label: 'R$ 0,05', tipo: 'moeda'  },
];

function renderCedulasModal() {
  var m = state.cedurasModal;
  if (!m) return null;

  var banco = (state.bancos || []).find(function(b) { return b.id === m.bancoId; });
  if (!banco) return null;

  var qtds = m.qtds || {};

  function calcTotal() {
    var t = 0;
    _CEDULAS.forEach(function(c) {
      var q = parseInt(document.getElementById('ced-' + c.val.toFixed(2)) && document.getElementById('ced-' + c.val.toFixed(2)).value) || 0;
      t += q * c.val;
    });
    return Math.round(t * 100) / 100;
  }

  function atualizarTotais() {
    var total = 0;
    _CEDULAS.forEach(function(c) {
      var inp = document.getElementById('ced-' + c.val.toFixed(2));
      var sub = document.getElementById('ced-sub-' + c.val.toFixed(2));
      if (!inp || !sub) return;
      var q = parseInt(inp.value) || 0;
      var st = q * c.val;
      total += st;
      sub.textContent = st > 0 ? fmtMoney(st) : '—';
      sub.style.color = st > 0 ? 'var(--text)' : 'var(--text3)';
    });
    total = Math.round(total * 100) / 100;
    var totalEl = document.getElementById('ced-total');
    if (totalEl) totalEl.textContent = fmtMoney(total);
  }

  function salvar() {
    var total = 0;
    var qtdsSalvar = {};
    _CEDULAS.forEach(function(c) {
      var inp = document.getElementById('ced-' + c.val.toFixed(2));
      var q = parseInt(inp ? inp.value : 0) || 0;
      qtdsSalvar[c.val.toFixed(2)] = q;
      total += q * c.val;
    });
    total = Math.round(total * 100) / 100;
    var bancAtual = (state.bancos || []).find(function(b) { return b.id === m.bancoId; });
    if (!bancAtual) return;
    var bancUpd = Object.assign({}, bancAtual, { saldo: total, cedurasQtds: qtdsSalvar });
    updateBanco(bancUpd);
    setState({ cedurasModal: null });
    showToast('Cofre atualizado: ' + fmtMoney(total));
  }

  // Separar cédulas e moedas
  var cedulas = _CEDULAS.filter(function(c) { return c.tipo === 'cedula'; });
  var moedas  = _CEDULAS.filter(function(c) { return c.tipo === 'moeda'; });

  function makeRows(lista) {
    return lista.map(function(c) {
      var idKey = c.val.toFixed(2);
      var qSaved = (banco.cedurasQtds && banco.cedurasQtds[idKey]) || qtds[idKey] || 0;
      var subVal = qSaved * c.val;

      var inp = el('input', {
        type: 'number',
        id: 'ced-' + idKey,
        min: '0',
        value: qSaved || '',
        placeholder: '0',
        class: 'form-input',
        style: { width: '80px', textAlign: 'center', padding: '6px 8px' },
      });
      inp.oninput = atualizarTotais;

      return el('div', { style: {
        display: 'grid',
        gridTemplateColumns: '90px 1fr 1fr',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 0',
        borderBottom: '1px solid var(--border)',
      }}, [
        el('span', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--text)' } }, c.label),
        inp,
        el('span', {
          id: 'ced-sub-' + idKey,
          style: { fontSize: '13px', color: subVal > 0 ? 'var(--text)' : 'var(--text3)', textAlign: 'right' },
        }, subVal > 0 ? fmtMoney(subVal) : '—'),
      ]);
    });
  }

  var totalInicial = 0;
  _CEDULAS.forEach(function(c) {
    var q = (banco.cedurasQtds && banco.cedurasQtds[c.val.toFixed(2)]) || 0;
    totalInicial += q * c.val;
  });
  totalInicial = Math.round(totalInicial * 100) / 100;

  var headerRow = el('div', { style: {
    display: 'grid',
    gridTemplateColumns: '90px 1fr 1fr',
    gap: '10px',
    padding: '0 0 6px 0',
    borderBottom: '2px solid var(--border)',
    marginBottom: '4px',
  }}, [
    el('span', { style: { fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase' } }, 'Denominação'),
    el('span', { style: { fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase' } }, 'Qtd'),
    el('span', { style: { fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'right' } }, 'Subtotal'),
  ]);

  var modal = div('modal', [
    div('modal-title', [
      el('span', {}, '🏦 Contador de Cédulas — ' + banco.nome),
      el('button', { class: 'modal-close', onclick: function() { setState({ cedurasModal: null }); } }, '×'),
    ]),

    el('div', { style: { maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' } }, [
      // Cédulas
      el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 0 4px' } }, 'Cédulas'),
      headerRow,
      el('div', {}, makeRows(cedulas)),

      // Moedas
      el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '14px 0 4px' } }, 'Moedas'),
      el('div', {}, makeRows(moedas)),
    ]),

    // Total
    el('div', { style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 0 10px',
      borderTop: '2px solid var(--border)',
      marginTop: '8px',
    }}, [
      el('span', { style: { fontSize: '14px', fontWeight: '700', color: 'var(--text3)' } }, 'TOTAL NO COFRE'),
      el('span', { id: 'ced-total', style: { fontSize: '22px', fontWeight: '800', color: 'var(--gold)' } }, fmtMoney(totalInicial)),
    ]),

    div('modal-actions', [
      btn('btn-ghost', 'Cancelar', function() { setState({ cedurasModal: null }); }),
      btn('btn-primary', '💾 Atualizar saldo do cofre', salvar),
    ]),
  ]);
  modal.style.maxWidth = '440px';

  var ov = div('modal-overlay', [modal]);
  ov.onclick = function(e) { if (e.target === ov) setState({ cedurasModal: null }); };
  return ov;
}
