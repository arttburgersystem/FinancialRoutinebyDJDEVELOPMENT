// ── FREELANCERS ───────────────────────────────────────────────────────────────

var _FL_ESPECIALIDADES = [
  'Designer','Fotógrafo / Videomaker','Marketing Digital',
  'TI / Desenvolvimento','Contador / Financeiro','Advogado',
  'Entregador','Limpeza / Conservação','Eventos / Buffet','Outros',
];

function renderFreelancers() {
  var pf       = state.profile;
  var tab      = state.freelancerTab || 'freelancers';
  var hj       = today();
  var fls      = (state.freelancers || []).filter(function(f){ return f.profile === pf || !f.profile; });
  var servicos = (state.servicosFreelancer || []).filter(function(s){ return s.profile === pf; });

  function flNomePorId(id) {
    var f = fls.find(function(x){ return x.id === id; });
    return f ? f.nome : '—';
  }

  // ── MODAL FREELANCER ──────────────────────────────────────────────────────
  if (state.freelancerModal) {
    var mfl   = state.freelancerModal;
    var efl   = mfl.editItem || {};
    var isEdit = !!efl.id;

    function gfl(id){ var e = document.getElementById('fl-' + id); return e ? e.value : ''; }

    function saveFreelancer() {
      var nome = (gfl('nome') || '').trim();
      if (!nome) { showToast('Informe o nome', 'error'); return; }
      var recChk = document.getElementById('fl-recorrente');
      var isRec  = recChk ? recChk.checked : false;
      var item = {
        id:              isEdit ? efl.id : ('fl_' + Date.now()),
        nome:            nome,
        especialidade:   gfl('especialidade') || '',
        tipo:            gfl('tipo') || 'pf',
        cpfCnpj:         (gfl('cpfCnpj') || '').trim(),
        email:           (gfl('email') || '').trim(),
        telefone:        (gfl('telefone') || '').trim(),
        chavePix:        (gfl('chavePix') || '').trim(),
        banco:           (gfl('banco') || '').trim(),
        valorHora:       parseFloat(gfl('valorHora')) || 0,
        status:          gfl('status') || 'ativo',
        notas:           (gfl('notas') || '').trim(),
        recorrente:      isRec,
        valorFixo:       isRec ? (parseFloat(gfl('valorFixo')) || 0) : 0,
        diaVencimento:   isRec ? (parseInt(gfl('diaVencimento')) || 5) : 5,
        descricaoFixa:   isRec ? (gfl('descricaoFixa') || '').trim() : '',
        profile:         pf,
        criadoEm:        isEdit ? (efl.criadoEm || hj) : hj,
      };
      var arr = isEdit
        ? (state.freelancers || []).map(function(x){ return x.id === item.id ? item : x; })
        : (state.freelancers || []).concat([item]);
      lsSet('freelancers', arr);
      setState({ freelancers: arr, freelancerModal: null });
      scheduleSave();
      showToast(isEdit ? 'Freelancer atualizado!' : 'Freelancer cadastrado!');
    }

    function fli(id, type, ph, val) {
      var i = el('input', { class: 'form-input', type: type || 'text', id: 'fl-' + id, placeholder: ph || '' });
      i.value = val !== undefined && val !== null ? String(val) : '';
      return i;
    }

    function fg(label, inp){ return div('form-group', [el('label', { class: 'form-label' }, label), inp]); }
    function grid2(a, b){ var g = el('div', {}, [a, b]); g.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;'; return g; }
    function secBox(children){ var b = el('div', {}, children); b.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;'; return b; }
    function secTitle(icon, label){
      return el('div', { style: { fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)', marginBottom: '10px' } }, icon + ' ' + label);
    }

    var tipoOpts = [{ v: 'pf', l: '👤 Pessoa Física (PF)' }, { v: 'pj', l: '🏢 Pessoa Jurídica (PJ)' }];
    var tipoSel  = el('select', { class: 'form-input', id: 'fl-tipo' },
      tipoOpts.map(function(o){ var op = el('option', { value: o.v }, o.l); if (o.v === (efl.tipo || 'pf')) op.selected = true; return op; }));

    // Specialty list — initialized from state or hardcoded defaults
    var espListRef = (state.flEspecialidades && state.flEspecialidades.length > 0)
      ? state.flEspecialidades.slice()
      : _FL_ESPECIALIDADES.slice();

    var espSel = el('select', { class: 'form-input', id: 'fl-especialidade' });
    function rebuildEspSel() {
      var cur = espSel.value;
      while (espSel.firstChild) espSel.removeChild(espSel.firstChild);
      [el('option', { value: '' }, '— Especialidade —')].concat(
        espListRef.map(function(e2) {
          var op = el('option', { value: e2 }, e2);
          if (e2 === (cur || efl.especialidade)) op.selected = true;
          return op;
        })
      ).forEach(function(op){ espSel.appendChild(op); });
    }
    rebuildEspSel();

    function saveEspList() {
      state.flEspecialidades = espListRef.slice();
      lsSet('flEspecialidades', state.flEspecialidades);
      scheduleSave();
    }

    // Management panel (hidden by default)
    var espPanelEl = el('div', { style: { display:'none', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'6px', padding:'10px', marginTop:'6px' } });

    function renderEspRows() {
      while (espPanelEl.firstChild) espPanelEl.removeChild(espPanelEl.firstChild);
      var listEl = el('div', { style: { maxHeight:'170px', overflowY:'auto', marginBottom:'8px', display:'flex', flexDirection:'column', gap:'2px' } });
      espListRef.forEach(function(esp, idx) {
        (function(esp2, idx2) {
          var rowEl = el('div', { style: { display:'flex', alignItems:'center', gap:'6px', padding:'5px 4px', borderBottom:'1px solid var(--border)' } });
          var nameSpan = el('span', { style: { flex:'1', fontSize:'12px', color:'var(--text)' } }, esp2);
          var editB = el('button', { class:'btn-icon edit', title:'Editar', style:{ fontSize:'12px' },
            onclick: function() {
              var inp2 = el('input', { class:'form-input', style:{ flex:'1', fontSize:'12px', padding:'3px 7px' } });
              inp2.value = esp2;
              var saveB = el('button', { class:'btn-primary', style:{ fontSize:'11px', padding:'3px 8px', whiteSpace:'nowrap' },
                onclick: function() {
                  var novo = inp2.value.trim();
                  if (!novo || novo === esp2) { renderEspRows(); return; }
                  if (espListRef.indexOf(novo) !== -1) { showToast('Especialidade já existe', 'error'); return; }
                  var oldVal = espSel.value;
                  espListRef[idx2] = novo;
                  rebuildEspSel();
                  if (oldVal === esp2) espSel.value = novo;
                  saveEspList();
                  renderEspRows();
                  showToast('Especialidade renomeada!');
                }
              }, '✓');
              var cancelB = el('button', { class:'btn-ghost', style:{ fontSize:'11px', padding:'3px 8px' },
                onclick: function() { renderEspRows(); }
              }, '✕');
              while (rowEl.firstChild) rowEl.removeChild(rowEl.firstChild);
              rowEl.appendChild(inp2); rowEl.appendChild(saveB); rowEl.appendChild(cancelB);
              setTimeout(function(){ inp2.focus(); inp2.select(); }, 30);
            }
          }, '✏️');
          var delB = el('button', { class:'btn-icon delete', title:'Excluir', style:{ fontSize:'12px' },
            onclick: function() {
              if (!window.confirm('Excluir especialidade "' + esp2 + '"?')) return;
              var oldVal = espSel.value;
              espListRef.splice(idx2, 1);
              rebuildEspSel();
              if (oldVal === esp2) espSel.value = '';
              saveEspList();
              renderEspRows();
              showToast('Especialidade removida', 'error');
            }
          }, '🗑');
          rowEl.appendChild(nameSpan); rowEl.appendChild(editB); rowEl.appendChild(delB);
          listEl.appendChild(rowEl);
        })(esp, idx);
      });
      espPanelEl.appendChild(listEl);
      var newInp = el('input', { class:'form-input', type:'text', placeholder:'Nova especialidade...', style:{ flex:'1', fontSize:'12px' } });
      var addBtn2 = el('button', { class:'btn-primary', style:{ fontSize:'11px', padding:'4px 12px', whiteSpace:'nowrap' },
        onclick: function() {
          var nome = newInp.value.trim();
          if (!nome) { showToast('Informe o nome', 'error'); return; }
          if (espListRef.indexOf(nome) !== -1) { showToast('Já existe', 'error'); return; }
          espListRef.push(nome);
          var op2 = el('option', { value: nome }, nome);
          espSel.appendChild(op2);
          espSel.value = nome;
          saveEspList();
          newInp.value = '';
          renderEspRows();
          showToast('Especialidade "' + nome + '" adicionada!');
        }
      }, '+ Adicionar');
      newInp.onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); addBtn2.click(); } };
      espPanelEl.appendChild(el('div', { style:{ display:'flex', gap:'6px' } }, [newInp, addBtn2]));
    }

    var espGearBtn = el('button', {
      class: 'btn-ghost',
      style: { fontSize:'11px', padding:'3px 8px', marginLeft:'6px' },
      title: 'Gerenciar especialidades',
      onclick: function(e) {
        e.preventDefault();
        if (espPanelEl.style.display === 'none') {
          renderEspRows();
          espPanelEl.style.display = 'block';
        } else {
          espPanelEl.style.display = 'none';
        }
      }
    }, '⚙️ Gerenciar');

    var stOpts = [{ v: 'ativo', l: '✅ Ativo' }, { v: 'inativo', l: '⛔ Inativo' }];
    var stSel  = el('select', { class: 'form-input', id: 'fl-status' },
      stOpts.map(function(o){ var op = el('option', { value: o.v }, o.l); if (o.v === (efl.status || 'ativo')) op.selected = true; return op; }));

    var mEl = div('modal', [
      div('modal-title', [
        el('span', {}, (isEdit ? 'Editar' : 'Novo') + ' freelancer'),
        el('button', { class: 'modal-close', onclick: function(){ setState({ freelancerModal: null }); } }, '×'),
      ]),
      secBox([secTitle('👤', 'Dados do freelancer'),
        grid2(
          fg('Nome completo *', fli('nome', 'text', 'Nome do freelancer', efl.nome || '')),
          el('div', { class: 'form-group' }, [
            el('div', { style: { display:'flex', alignItems:'center', marginBottom:'4px' } }, [
              el('label', { class: 'form-label', style: { marginBottom:'0', flex:'1' } }, 'Especialidade'),
              espGearBtn,
            ]),
            espSel,
            espPanelEl,
          ])
        ),
        grid2(fg('Tipo de pessoa', tipoSel), fg('CPF / CNPJ', fli('cpfCnpj', 'text', '000.000.000-00 ou 00.000.000/0001-00', efl.cpfCnpj || ''))),
        grid2(fg('Status', stSel), fg('Valor/hora referência (R$)', fli('valorHora', 'number', '0,00', efl.valorHora || ''))),
      ]),
      secBox([secTitle('📞', 'Contato'),
        grid2(fg('Telefone', fli('telefone', 'tel', '(00) 00000-0000', efl.telefone || '')), fg('E-mail', fli('email', 'email', 'freelancer@email.com', efl.email || ''))),
      ]),
      secBox([secTitle('💳', 'Dados para pagamento'),
        grid2(fg('Chave Pix', fli('chavePix', 'text', 'CPF, e-mail, telefone ou chave aleatória', efl.chavePix || '')), fg('Banco', fli('banco', 'text', 'Ex: Nubank, Itaú, Bradesco...', efl.banco || ''))),
      ]),
      (function(){
        var recChkEl = el('input', { type: 'checkbox', id: 'fl-recorrente', style: { width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' } });
        if (efl.recorrente) recChkEl.checked = true;
        var recPanel = el('div', { id: 'fl-rec-panel', style: { display: efl.recorrente ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' } }, [
          el('div', { class: 'form-group', style: { marginBottom: '0' } }, [
            el('label', { class: 'form-label' }, 'Valor fixo mensal (R$)'),
            fli('valorFixo', 'number', '0,00', efl.valorFixo || ''),
          ]),
          el('div', { class: 'form-group', style: { marginBottom: '0' } }, [
            el('label', { class: 'form-label' }, 'Dia de vencimento'),
            fli('diaVencimento', 'number', 'Ex: 5', efl.diaVencimento || '5'),
          ]),
          el('div', { class: 'form-group', style: { marginBottom: '0', gridColumn: '1 / -1' } }, [
            el('label', { class: 'form-label' }, 'Descrição padrão do serviço'),
            fli('descricaoFixa', 'text', 'Ex: Serviço mensal de entregas', efl.descricaoFixa || ''),
          ]),
        ]);
        recChkEl.onchange = function() {
          recPanel.style.display = recChkEl.checked ? 'grid' : 'none';
        };
        return el('div', { style: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '14px' } }, [
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, [
            recChkEl,
            el('div', {}, [
              el('div', { style: { fontSize: '13px', fontWeight: '600', color: 'var(--text)' } }, '🔄 Freelancer fixo / recorrente'),
              el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, 'Gera alerta mensal automático quando não houver lançamento'),
            ]),
          ]),
          recPanel,
        ]);
      })(),
      div('form-group', [
        el('label', { class: 'form-label' }, 'Observações'),
        el('textarea', { class: 'form-input', id: 'fl-notas', rows: '2', placeholder: 'Portfólio, contrato, acordos gerais...', style: { resize: 'vertical' } }, efl.notas || ''),
      ]),
      div('modal-actions', [
        btn('btn-ghost', 'Cancelar', function(){ setState({ freelancerModal: null }); }),
        btn('btn-primary', isEdit ? '💾 Salvar' : '➕ Cadastrar', saveFreelancer),
      ]),
    ]);
    mEl.style.maxWidth = '540px';
    var ovFl = div('modal-overlay', [mEl]);
    ovFl.onclick = function(e){ if (e.target === ovFl) setState({ freelancerModal: null }); };
    setTimeout(function(){ var i = document.getElementById('fl-nome'); if (i) i.focus(); }, 50);
    return ovFl;
  }

  // ── MODAL SERVIÇO ─────────────────────────────────────────────────────────
  if (state.servicoFreelancerModal) {
    var msv   = state.servicoFreelancerModal;
    var esv   = msv.editItem || {};
    var isEditSv = !!esv.id;

    function gsv(id){ var e = document.getElementById('sv-' + id); return e ? e.value : ''; }

    function togglePgtRow() {
      var row = document.getElementById('sv-pgt-row');
      var st  = document.getElementById('sv-status');
      if (row && st) row.style.display = st.value === 'pago' ? 'block' : 'none';
    }

    function saveSv() {
      var flId  = gsv('freelancer');
      var desc  = (gsv('descricao') || '').trim();
      var data  = gsv('data');
      var valor = parseFloat(gsv('valor')) || 0;
      if (!flId)  { showToast('Selecione o freelancer', 'error'); return; }
      if (!desc)  { showToast('Descreva o serviço', 'error'); return; }
      if (!data)  { showToast('Informe a data do serviço', 'error'); return; }
      if (!valor) { showToast('Informe o valor', 'error'); return; }
      var st = gsv('status') || 'pendente';
      var item = {
        id:            isEditSv ? esv.id : ('sv_' + Date.now()),
        freelancerId:  flId,
        descricao:     desc,
        data:          data,
        valor:         valor,
        status:        st,
        dataPagamento: st === 'pago' ? (gsv('dataPagamento') || hj) : '',
        notas:         (gsv('notas') || '').trim(),
        profile:       pf,
        criadoEm:      isEditSv ? (esv.criadoEm || hj) : hj,
      };
      var arr = isEditSv
        ? (state.servicosFreelancer || []).map(function(x){ return x.id === item.id ? item : x; })
        : (state.servicosFreelancer || []).concat([item]);
      lsSet('servicosFreelancer', arr);
      setState({ servicosFreelancer: arr, servicoFreelancerModal: null });
      scheduleSave();
      showToast(isEditSv ? 'Serviço atualizado!' : 'Serviço registrado!');
    }

    function svi(id, type, ph, val) {
      var i = el('input', { class: 'form-input', type: type || 'text', id: 'sv-' + id, placeholder: ph || '' });
      i.value = val !== undefined && val !== null ? String(val) : '';
      return i;
    }
    function fgv(label, inp){ return div('form-group', [el('label', { class: 'form-label' }, label), inp]); }

    var flOpts = [el('option', { value: '' }, '— Selecione —')].concat(
      fls.filter(function(f){ return f.status !== 'inativo'; })
        .sort(function(a, b){ return a.nome.localeCompare(b.nome); })
        .map(function(f){
          var op = el('option', { value: f.id }, f.nome + (f.especialidade ? ' — ' + f.especialidade : ''));
          if (f.id === (esv.freelancerId || msv.freelancerId)) op.selected = true;
          return op;
        })
    );
    var flSel = el('select', { class: 'form-input', id: 'sv-freelancer' }, flOpts);

    var svStOpts = [
      { v: 'pendente',  l: '⏳ Pendente' },
      { v: 'pago',      l: '✅ Pago' },
      { v: 'cancelado', l: '❌ Cancelado' },
    ];
    var svStSel = el('select', { class: 'form-input', id: 'sv-status' },
      svStOpts.map(function(o){ var op = el('option', { value: o.v }, o.l); if (o.v === (esv.status || 'pendente')) op.selected = true; return op; }));
    svStSel.onchange = togglePgtRow;

    var pgtRow = el('div', { id: 'sv-pgt-row', style: { display: (esv.status === 'pago') ? 'block' : 'none' } }, [
      fgv('Data de pagamento', svi('dataPagamento', 'date', '', esv.dataPagamento || hj)),
    ]);

    var svEl = div('modal', [
      div('modal-title', [
        el('span', {}, (isEditSv ? 'Editar' : 'Novo') + ' serviço'),
        el('button', { class: 'modal-close', onclick: function(){ setState({ servicoFreelancerModal: null }); } }, '×'),
      ]),
      fgv('Freelancer *', flSel),
      fgv('Descrição do serviço *', svi('descricao', 'text', 'Ex: Criação de arte para Instagram, Ensaio fotográfico...', esv.descricao || '')),
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } }, [
        fgv('Data do serviço *', svi('data', 'date', '', esv.data || msv.preData || hj)),
        fgv('Valor (R$) *', svi('valor', 'number', '0,00', esv.valor || '')),
        fgv('Status', svStSel),
      ]),
      pgtRow,
      fgv('Observações', el('textarea', { class: 'form-input', id: 'sv-notas', rows: '2', placeholder: 'Referências, links, observações...', style: { resize: 'vertical' } }, esv.notas || '')),
      div('modal-actions', [
        btn('btn-ghost', 'Cancelar', function(){ setState({ servicoFreelancerModal: null }); }),
        btn('btn-primary', isEditSv ? '💾 Salvar' : '✅ Registrar', saveSv),
      ]),
    ]);
    svEl.style.maxWidth = '500px';
    var ovSv = div('modal-overlay', [svEl]);
    ovSv.onclick = function(e){ if (e.target === ovSv) setState({ servicoFreelancerModal: null }); };
    setTimeout(function(){ var i = document.getElementById('sv-descricao'); if (i) i.focus(); }, 50);
    return ovSv;
  }

  // ── MODAL PAGAR SERVIÇO ───────────────────────────────────────────────────
  if (state.flPagarModal) {
    var mp  = state.flPagarModal;
    var svp = mp.servico || {};
    var flp = fls.find(function(f){ return f.id === svp.freelancerId; }) || {};
    var bancosPag = (state.bancos || []).filter(function(b){ return b.profile === pf; });

    var datInpP = el('input', { class: 'form-input', type: 'date', id: 'flp-data' });
    datInpP.value = hj;

    var bancSelP = el('select', { class: 'form-input', id: 'flp-banco' });
    [el('option', { value: '' }, '— Selecione o banco —')].concat(
      bancosPag.map(function(b){
        var op = el('option', { value: b.id }, b.nome + (b.saldo != null ? '  (' + fmtMoney(b.saldo) + ')' : ''));
        return op;
      })
    ).forEach(function(op){ bancSelP.appendChild(op); });
    // pré-seleciona se só tiver um
    if (bancosPag.length === 1) bancSelP.value = bancosPag[0].id;

    var formaSelP = el('select', { class: 'form-input', id: 'flp-forma' });
    ['Pix', 'Dinheiro', 'Transferência', 'Cartão de Débito'].forEach(function(f){
      formaSelP.appendChild(el('option', { value: f }, f));
    });

    function confirmarPagamento() {
      var dataPgto = document.getElementById('flp-data').value || hj;
      var banco    = document.getElementById('flp-banco').value;
      var forma    = document.getElementById('flp-forma').value;

      // Atualiza serviço
      var arr2 = (state.servicosFreelancer || []).map(function(x){
        return x.id === svp.id
          ? Object.assign({}, x, { status: 'pago', dataPagamento: dataPgto, banco: banco, formaPgto: forma })
          : x;
      });

      // Lança saída financeira
      var novasConta = (state.contas || []).concat([{
        id:        'sv_pgt_' + svp.id,
        tipo:      'pagar',
        profile:   pf,
        descricao: 'Freelancer — ' + flp.nome + (svp.descricao ? ': ' + svp.descricao : ''),
        valor:     svp.valor || 0,
        categoria: 'Pessoal / RH',
        vencimento: dataPgto,
        status:    'pago',
        formaPgto: forma,
        banco:     banco,
        fornecedor: flp.nome || '',
        notas:     'Pagamento de serviço freelancer',
      }]);

      // Desconta saldo do banco
      var novosBancos = (state.bancos || []).map(function(b){
        if (!banco || b.id !== banco) return b;
        return Object.assign({}, b, { saldo: Math.round(((b.saldo || 0) - (svp.valor || 0)) * 100) / 100 });
      });

      lsSet('servicosFreelancer', arr2);
      lsSet('contas', novasConta);
      lsSet('bancos', novosBancos);
      setState({ servicosFreelancer: arr2, contas: novasConta, bancos: novosBancos, flPagarModal: null });
      scheduleSave();
      showToast('Pagamento de ' + fmtMoney(svp.valor || 0) + ' registrado!');
    }

    var mpEl = div('modal', [
      div('modal-title', [
        el('span', {}, '💳 Confirmar Pagamento'),
        el('button', { class: 'modal-close', onclick: function(){ setState({ flPagarModal: null }); } }, '×'),
      ]),

      // Resumo do serviço
      el('div', { style: {
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
      }}, [
        el('div', { style: { fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' } }, flp.nome || '—'),
        el('div', { style: { fontSize: '12px', color: 'var(--text3)' } }, svp.descricao || ''),
        el('div', { style: { fontSize: '12px', color: 'var(--text3)', marginTop: '2px' } }, 'Serviço: ' + fmtDate(svp.data)),
        el('div', { style: { fontSize: '18px', fontWeight: '800', color: 'var(--gold)', marginTop: '8px' } }, fmtMoney(svp.valor || 0)),
      ]),

      div('form-group', [el('label', { class: 'form-label' }, 'Data do pagamento'), datInpP]),
      div('form-group', [el('label', { class: 'form-label' }, 'Conta debitada'), bancSelP]),
      div('form-group', [el('label', { class: 'form-label' }, 'Forma de pagamento'), formaSelP]),

      div('modal-actions', [
        btn('btn-ghost', 'Cancelar', function(){ setState({ flPagarModal: null }); }),
        btn('btn-primary', '✅ Confirmar pagamento', confirmarPagamento),
      ]),
    ]);
    mpEl.style.maxWidth = '420px';
    var ovMp = div('modal-overlay', [mpEl]);
    ovMp.onclick = function(e){ if (e.target === ovMp) setState({ flPagarModal: null }); };
    return ovMp;
  }

  // ── MODAL CALENDÁRIO ─────────────────────────────────────────────────────
  if (state.flCalendarModal) {
    var mc  = state.flCalendarModal;
    var flc = fls.find(function(f){ return f.id === mc.freelancerId; }) || {};
    var calMes = mc.mes || hj.slice(0, 7);

    function navCalMes(delta) {
      var p = calMes.split('-'); var y = parseInt(p[0]); var mo = parseInt(p[1]) - 1 + delta;
      y += Math.floor(mo / 12); mo = ((mo % 12) + 12) % 12;
      setState({ flCalendarModal: Object.assign({}, mc, { mes: y + '-' + String(mo + 1).padStart(2, '0') }) });
    }

    var calYear  = parseInt(calMes.split('-')[0]);
    var calMonth = parseInt(calMes.split('-')[1]) - 1; // 0-indexed
    var DIAS_SEM = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Serviços deste freelancer neste mês, indexados por dia
    var svsMes = servicos.filter(function(s){
      return s.freelancerId === mc.freelancerId && (s.data || '').slice(0, 7) === calMes;
    });
    var svsPorDia = {}; // dia(1-31) → [sv,...]
    svsMes.forEach(function(s){
      var d = parseInt((s.data || '').slice(8, 10));
      if (!svsPorDia[d]) svsPorDia[d] = [];
      svsPorDia[d].push(s);
    });

    var diasNoMes = new Date(calYear, calMonth + 1, 0).getDate();
    var primeiroDia = new Date(calYear, calMonth, 1).getDay(); // 0=Dom

    // Totais do mês
    var totalMesFl  = svsMes.reduce(function(s, sv){ return s + (sv.valor || 0); }, 0);
    var totalDiasFL = Object.keys(svsPorDia).length;

    // Grid de células do calendário
    var cells = [];
    for (var ci = 0; ci < primeiroDia; ci++) cells.push(null); // vazios antes
    for (var cd = 1; cd <= diasNoMes; cd++) cells.push(cd);

    var calGrid = el('div', { style: {
      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '4px', padding: '0 2px',
    }});

    // Cabeçalho dias semana
    DIAS_SEM.forEach(function(d, i){
      calGrid.appendChild(el('div', { style: {
        textAlign: 'center', fontSize: '10px', fontWeight: '700',
        color: (i === 0 || i === 6) ? 'var(--red)' : 'var(--text3)',
        padding: '4px 0', textTransform: 'uppercase',
      }}, d));
    });

    // Células dos dias
    cells.forEach(function(dia){
      if (dia === null) { calGrid.appendChild(el('div', {})); return; }

      var svsDia  = svsPorDia[dia] || [];
      var temSv   = svsDia.length > 0;
      var totalDia = svsDia.reduce(function(s, sv){ return s + (sv.valor || 0); }, 0);
      var eHj     = calMes + '-' + String(dia).padStart(2, '0') === hj;
      var isFut   = calMes + '-' + String(dia).padStart(2, '0') > hj;

      var cell = el('div', { style: {
        minHeight: '54px', borderRadius: '8px', padding: '4px',
        cursor: 'pointer',
        border: eHj ? '2px solid var(--primary)' : '1px solid var(--border)',
        background: temSv ? 'rgba(0,168,107,.10)' : isFut ? 'var(--bg3)' : 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        transition: 'background .12s',
        opacity: isFut ? '0.5' : '1',
      }});
      cell.onmouseenter = function(){ if (!isFut) cell.style.background = temSv ? 'rgba(0,168,107,.22)' : 'var(--bg3)'; };
      cell.onmouseleave = function(){ cell.style.background = temSv ? 'rgba(0,168,107,.10)' : isFut ? 'var(--bg3)' : 'var(--bg)'; };

      var diaEl = el('div', { style: {
        fontSize: '13px', fontWeight: eHj ? '800' : temSv ? '700' : '500',
        color: eHj ? 'var(--primary)' : temSv ? '#00a86b' : 'var(--text)',
      }}, String(dia));
      cell.appendChild(diaEl);

      if (temSv) {
        cell.appendChild(el('div', { style: { fontSize: '9px', fontWeight: '700', color: '#00a86b' } }, fmtMoney(totalDia)));
        cell.appendChild(el('div', { style: {
          fontSize: '9px', background: '#00a86b', color: '#fff',
          borderRadius: '8px', padding: '1px 5px', fontWeight: '700',
        }}, svsDia.length + ' serv.'));
      }

      (function(d2, svsDia2){
        cell.onclick = function(){
          // Se tem serviço, abre edição do primeiro; senão abre novo serviço pré-preenchido
          if (svsDia2.length === 1) {
            setState({ flCalendarModal: null, servicoFreelancerModal: { editItem: svsDia2[0] } });
          } else if (svsDia2.length > 1) {
            // múltiplos: abre novo mas pré-preenche data
            setState({ flCalendarModal: null, servicoFreelancerModal: { freelancerId: mc.freelancerId, preData: calMes + '-' + String(d2).padStart(2, '0') } });
          } else {
            setState({ flCalendarModal: null, servicoFreelancerModal: { freelancerId: mc.freelancerId, preData: calMes + '-' + String(d2).padStart(2, '0') } });
          }
        };
      })(dia, svsDia);

      calGrid.appendChild(cell);
    });

    var calModal = div('modal', [
      div('modal-title', [
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px' } }, [
          el('span', { style: { fontSize: '15px', fontWeight: '800' } }, '📅 ' + (flc.nome || '—')),
          el('span', { style: { fontSize: '11px', color: 'var(--text3)', fontWeight: '400' } }, flc.especialidade || 'Freelancer'),
        ]),
        el('button', { class: 'modal-close', onclick: function(){ setState({ flCalendarModal: null }); } }, '×'),
      ]),

      // Navegação de mês
      el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 14px' } }, [
        el('button', { style: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer', padding: '5px 12px', fontSize: '16px', lineHeight: '1' }, onclick: function(){ navCalMes(-1); } }, '‹'),
        el('div', { style: { fontWeight: '700', fontSize: '15px', color: 'var(--text)' } }, MESES[calMonth] + ' ' + calYear),
        el('button', { style: { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer', padding: '5px 12px', fontSize: '16px', lineHeight: '1' }, onclick: function(){ navCalMes(1); } }, '›'),
      ]),

      // Totais do mês
      el('div', { style: { display: 'flex', gap: '12px', marginBottom: '14px' } }, [
        el('div', { style: { flex: '1', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' } }, [
          el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Dias trabalhados'),
          el('div', { style: { fontSize: '20px', fontWeight: '800', color: 'var(--text)' } }, String(totalDiasFL)),
        ]),
        el('div', { style: { flex: '1', background: 'rgba(0,168,107,.08)', border: '1px solid rgba(0,168,107,.3)', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' } }, [
          el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Total do mês'),
          el('div', { style: { fontSize: '20px', fontWeight: '800', color: '#00a86b' } }, fmtMoney(totalMesFl)),
        ]),
        el('div', { style: { flex: '1', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 14px', textAlign: 'center' } }, [
          el('div', { style: { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: '700' } }, 'Serviços'),
          el('div', { style: { fontSize: '20px', fontWeight: '800', color: 'var(--text)' } }, String(svsMes.length)),
        ]),
      ]),

      calGrid,

      el('div', { style: { marginTop: '12px', fontSize: '11px', color: 'var(--text3)', display: 'flex', gap: '16px' } }, [
        el('span', {}, '🟢 Dia com serviço · Clique em qualquer dia para registrar'),
      ]),

      div('modal-actions', [
        btn('btn-ghost', 'Fechar', function(){ setState({ flCalendarModal: null }); }),
        btn('btn-primary', '+ Novo serviço', function(){ setState({ flCalendarModal: null, servicoFreelancerModal: { freelancerId: mc.freelancerId } }); }),
      ]),
    ]);
    calModal.style.maxWidth = '520px';
    var ovCal = div('modal-overlay', [calModal]);
    ovCal.onclick = function(e){ if (e.target === ovCal) setState({ flCalendarModal: null }); };
    return ovCal;
  }

  // ── KPIs GERAIS ───────────────────────────────────────────────────────────
  var ativos   = fls.filter(function(f){ return f.status === 'ativo'; });
  var pendente = servicos.reduce(function(s, sv){ return s + (sv.status === 'pendente' ? (sv.valor || 0) : 0); }, 0);

  var mesStr = hj.slice(0, 7);
  var pagosMs = servicos.filter(function(sv){ return sv.status === 'pago' && (sv.dataPagamento || sv.data || '').slice(0, 7) === mesStr; });
  var totalPagoMes = pagosMs.reduce(function(s, sv){ return s + (sv.valor || 0); }, 0);

  // ── TABS ──────────────────────────────────────────────────────────────────
  var pendBadge = servicos.filter(function(s){ return s.status === 'pendente'; }).length;
  var tabDefs = [
    { id: 'freelancers', label: '👤 Freelancers', badge: 0 },
    { id: 'servicos',    label: '📋 Serviços',    badge: pendBadge, badgeColor: 'var(--gold)' },
  ];
  var tabsEl = el('div', { style: { display: 'flex', gap: '0', borderBottom: '2px solid var(--border)', marginBottom: '20px' } },
    tabDefs.map(function(t){
      var isActive = tab === t.id;
      var children = [t.label];
      if (t.badge > 0) children.push(el('span', { style: { background: t.badgeColor, color: '#fff', borderRadius: '10px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', marginLeft: '6px' } }, String(t.badge)));
      return el('button', {
        style: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px', fontSize: '13px', fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--primary)' : 'var(--text2)', borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px', display: 'flex', alignItems: 'center' },
        onclick: function(){ setState({ freelancerTab: t.id }); },
      }, children);
    })
  );

  // ── ACTION BUTTON ─────────────────────────────────────────────────────────
  var actionBtn = tab === 'freelancers'
    ? btn('btn-primary', '➕ Novo freelancer', function(){ setState({ freelancerModal: {} }); })
    : btn('btn-primary', '📋 Novo serviço', function(){ setState({ servicoFreelancerModal: {} }); });

  // ── CONTEÚDO: FREELANCERS ─────────────────────────────────────────────────
  var contentEl;

  if (tab === 'freelancers') {
    var kpis = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' } }, [
      el('div', { class: 'kpi-card' },        [el('div', { class: 'kpi-label' }, 'Total'),         el('div', { class: 'kpi-value' }, String(fls.length)),       el('div', { class: 'kpi-sub' }, 'cadastrados')]),
      el('div', { class: 'kpi-card green' },  [el('div', { class: 'kpi-label' }, 'Ativos'),        el('div', { class: 'kpi-value green' }, String(ativos.length)), el('div', { class: 'kpi-sub' }, 'em atividade')]),
      el('div', { class: 'kpi-card' },        [el('div', { class: 'kpi-label' }, 'A pagar'),       el('div', { class: 'kpi-value gold' }, fmtMoney(pendente)),    el('div', { class: 'kpi-sub' }, 'serviços pendentes')]),
      el('div', { class: 'kpi-card' },        [el('div', { class: 'kpi-label' }, 'Pago este mês'), el('div', { class: 'kpi-value' }, fmtMoney(totalPagoMes)),    el('div', { class: 'kpi-sub' }, MESES[parseInt(mesStr.split('-')[1])-1]+'/'+mesStr.split('-')[0])]),
    ]);

    var ST_COR   = { ativo: 'var(--green)', inativo: 'var(--text3)' };
    var ST_LABEL = { ativo: 'Ativo', inativo: 'Inativo' };

    var sorted = fls.slice().sort(function(a, b){
      if ((a.status === 'ativo') !== (b.status === 'ativo')) return a.status === 'ativo' ? -1 : 1;
      return a.nome.localeCompare(b.nome);
    });

    var rows = sorted.map(function(f){
      var svsFl  = servicos.filter(function(s){ return s.freelancerId === f.id; });
      var pendFl = svsFl.reduce(function(s, sv){ return s + (sv.status === 'pendente' ? (sv.valor || 0) : 0); }, 0);
      return el('tr', {
        style: { borderBottom: '1px solid var(--border)' },
        onmouseenter: function(e){ e.currentTarget.style.background = 'var(--bg3)'; },
        onmouseleave: function(e){ e.currentTarget.style.background = ''; },
      }, [
        el('td', { style: { padding: '10px 14px' } }, [
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
            el('span', { style: { fontWeight: '600', fontSize: '13px', color: 'var(--text)' } }, f.nome),
            f.recorrente ? el('span', { style: { fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '8px', background: 'rgba(96,165,250,.15)', color: 'var(--blue)', border: '1px solid rgba(96,165,250,.3)', whiteSpace: 'nowrap' } }, '🔄 Fixo') : null,
          ].filter(Boolean)),
          f.especialidade ? el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, f.especialidade) : null,
          f.recorrente && f.valorFixo ? el('div', { style: { fontSize: '10px', color: 'var(--blue)', marginTop: '2px' } }, fmtMoney(f.valorFixo) + '/mês · dia ' + (f.diaVencimento || 5)) : null,
          f.tipo ? el('div', { style: { fontSize: '10px', color: 'var(--text3)', marginTop: '2px' } }, f.tipo === 'pj' ? '🏢 PJ' : '👤 PF') : null,
        ].filter(Boolean)),
        el('td', { style: { padding: '10px 14px' } }, [
          el('span', { style: { fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '10px', background: (ST_COR[f.status] || 'var(--text3)') + '22', color: ST_COR[f.status] || 'var(--text3)' } }, ST_LABEL[f.status] || f.status || '—'),
        ]),
        el('td', { style: { padding: '10px 14px', fontSize: '12px', color: 'var(--text3)' } }, [
          f.chavePix ? el('div', {}, ['Pix: ', el('span', { style: { color: 'var(--text)', fontWeight: '500' } }, f.chavePix)]) : null,
          f.banco    ? el('div', { style: { fontSize: '11px', marginTop: '2px' } }, f.banco) : null,
        ].filter(Boolean)),
        el('td', { style: { padding: '10px 14px', fontSize: '12px', color: 'var(--text3)' } }, [
          f.telefone ? el('div', {}, f.telefone) : null,
          f.email    ? el('div', { style: { fontSize: '11px', marginTop: '2px' } }, f.email) : null,
        ].filter(Boolean)),
        el('td', { style: { padding: '10px 14px', textAlign: 'right' } }, [
          pendFl > 0
            ? el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--gold)' } }, fmtMoney(pendFl))
            : el('div', { style: { fontSize: '11px', color: 'var(--text3)' } }, svsFl.length > 0 ? 'Em dia' : '—'),
          el('div', { style: { fontSize: '10px', color: 'var(--text3)', marginTop: '2px' } }, svsFl.length + ' serviço' + (svsFl.length !== 1 ? 's' : '')),
        ]),
        el('td', { style: { padding: '8px 10px', textAlign: 'right' } }, [
          el('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end' } }, [
            el('button', { class: 'btn-icon', title: 'Ver calendário', style: { fontSize: '14px' }, onclick: (function(ff){ return function(){ setState({ flCalendarModal: { freelancerId: ff.id, mes: hj.slice(0,7) } }); }; })(f) }, '📅'),
            el('button', { class: 'btn-icon', title: 'Novo serviço', style: { fontSize: '14px' }, onclick: (function(ff){ return function(){ setState({ servicoFreelancerModal: { freelancerId: ff.id } }); }; })(f) }, '📋'),
            el('button', { class: 'btn-icon edit', title: 'Editar', onclick: (function(ff){ return function(){ setState({ freelancerModal: { editItem: ff } }); }; })(f) }, '✏️'),
            el('button', { class: 'btn-icon delete', title: 'Excluir', onclick: (function(ff){ return function(){
              if (!window.confirm('Excluir "' + ff.nome + '"?\nOs serviços vinculados também serão excluídos.')) return;
              var arr2 = (state.freelancers || []).filter(function(x){ return x.id !== ff.id; });
              var svsArr = (state.servicosFreelancer || []).filter(function(x){ return x.freelancerId !== ff.id; });
              lsSet('freelancers', arr2); lsSet('servicosFreelancer', svsArr);
              setState({ freelancers: arr2, servicosFreelancer: svsArr });
              scheduleSave(); showToast('Freelancer removido', 'error');
            }; })(f) }, '🗑'),
          ]),
        ]),
      ]);
    });

    contentEl = div('', [
      kpis,
      div('card', [
        fls.length === 0
          ? div('empty', [
            div('empty-icon', '🎨'),
            div('empty-title', 'Nenhum freelancer cadastrado'),
            el('p', { style: { fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' } }, 'Cadastre designers, fotógrafos, contadores e outros prestadores de serviço.'),
            btn('btn-primary', '➕ Cadastrar primeiro freelancer', function(){ setState({ freelancerModal: {} }); }),
          ])
          : el('div', { style: { overflowX: 'auto' } }, [
            el('div', { style: { marginBottom: '10px', fontSize: '12px', color: 'var(--text3)' } }, fls.length + ' freelancer' + (fls.length !== 1 ? 's' : '') + ' · ' + ativos.length + ' ativo' + (ativos.length !== 1 ? 's' : '')),
            el('table', { style: { width: '100%', borderCollapse: 'collapse' } }, [
              el('thead', {}, [el('tr', { style: { borderBottom: '2px solid var(--border)' } },
                ['Nome / Especialidade', 'Status', 'Pix / Banco', 'Contato', 'A pagar', ''].map(function(h){
                  return el('th', { style: { padding: '8px 14px', textAlign: h === '' ? 'right' : 'left', fontSize: '11px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase' } }, h);
                })
              )]),
              el('tbody', {}, rows),
            ]),
          ]),
      ]),
    ]);

  // ── CONTEÚDO: SERVIÇOS ────────────────────────────────────────────────────
  } else {
    var svSorted = servicos.slice().sort(function(a, b){ return (b.data || '').localeCompare(a.data || ''); });

    var numPend  = servicos.filter(function(s){ return s.status === 'pendente'; }).length;
    var numPago  = servicos.filter(function(s){ return s.status === 'pago'; }).length;
    var numCanc  = servicos.filter(function(s){ return s.status === 'cancelado'; }).length;
    var totalSvs = servicos.reduce(function(s, sv){ return s + (sv.status !== 'cancelado' ? (sv.valor || 0) : 0); }, 0);

    var kpiSv = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' } }, [
      el('div', { class: 'kpi-card' },        [el('div', { class: 'kpi-label' }, 'Total serviços'), el('div', { class: 'kpi-value' }, String(servicos.length)),    el('div', { class: 'kpi-sub' }, 'histórico')]),
      el('div', { class: 'kpi-card' },        [el('div', { class: 'kpi-label' }, 'Pendentes'),      el('div', { class: 'kpi-value gold' }, String(numPend)),        el('div', { class: 'kpi-sub' }, fmtMoney(pendente))]),
      el('div', { class: 'kpi-card green' }, [el('div', { class: 'kpi-label' }, 'Pagos'),          el('div', { class: 'kpi-value green' }, String(numPago)),        el('div', { class: 'kpi-sub' }, 'realizados')]),
      el('div', { class: 'kpi-card' },        [el('div', { class: 'kpi-label' }, 'Volume total'),   el('div', { class: 'kpi-value' }, fmtMoney(totalSvs)),          el('div', { class: 'kpi-sub' }, 'excl. cancelados')]),
    ]);

    var SV_ST = {
      pendente:  { label: '⏳ Pendente',  cor: 'var(--gold)',  bg: '#c9a84c22' },
      pago:      { label: '✅ Pago',      cor: '#00a86b',      bg: '#00a86b22' },
      cancelado: { label: '❌ Cancelado', cor: 'var(--text3)', bg: 'var(--bg3)' },
    };

    var pendAlerta   = svSorted.filter(function(s){ return s.status === 'pendente'; });
    var svAtrasados  = pendAlerta.filter(function(s){ return (s.data || '') < hj; });
    var svNoPrazo    = pendAlerta.filter(function(s){ return (s.data || '') >= hj; });

    // Recorrentes sem lançamento no mês atual
    var flsRecorr = fls.filter(function(f){ return f.recorrente && f.status === 'ativo'; });
    var recorrSemMes = flsRecorr.filter(function(f){
      return !servicos.some(function(s){ return s.freelancerId === f.id && (s.data || '').slice(0,7) === mesStr; });
    });

    function svRow(sv, corValor) {
      var diasAt = sv.data < hj ? Math.round((new Date(hj) - new Date(sv.data)) / 86400000) : 0;
      return el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', borderRadius: '6px', padding: '8px 12px' } }, [
        el('div', { style: { flex: '1' } }, [
          el('div', { style: { fontWeight: '600', fontSize: '13px', color: 'var(--text)' } }, flNomePorId(sv.freelancerId)),
          el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, [
            sv.descricao + ' · ' + fmtDate(sv.data),
            diasAt > 0 ? el('span', { style: { color: 'var(--red)', fontWeight: '700', marginLeft: '6px' } }, '⚠ ' + diasAt + 'd atrasado') : null,
          ].filter(Boolean)),
        ]),
        el('div', { style: { fontWeight: '700', fontSize: '14px', color: corValor || 'var(--gold)' } }, fmtMoney(sv.valor || 0)),
        (function(s2){ return el('button', { class: 'btn-ghost', style: { fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' },
          onclick: function(){ setState({ flPagarModal: { servico: s2 } }); },
        }, '✅ Pagar'); })(sv),
      ]);
    }

    // Painel vermelho — atrasados
    var painelAtrasados = svAtrasados.length > 0 ? el('div', { style: {
      background: 'rgba(239,68,68,.06)', border: '1.5px solid rgba(239,68,68,.4)',
      borderRadius: '8px', padding: '12px 16px', marginBottom: '12px',
    }}, [
      el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--red)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' } }, [
        el('span', {}, '🚨 Pagamentos em atraso'),
        el('span', { style: { background: 'var(--red)', color: '#fff', borderRadius: '10px', fontSize: '10px', padding: '1px 7px' } }, String(svAtrasados.length)),
      ]),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, svAtrasados.map(function(sv){ return svRow(sv, 'var(--red)'); })),
    ]) : null;

    // Painel dourado — pendentes no prazo
    var painelPendentes = svNoPrazo.length > 0 ? el('div', { style: {
      background: '#c9a84c11', border: '1px solid var(--gold)',
      borderRadius: '8px', padding: '12px 16px', marginBottom: '12px',
    }}, [
      el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--gold)', marginBottom: '10px' } }, '💰 Pendentes de pagamento'),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, svNoPrazo.map(function(sv){ return svRow(sv, 'var(--gold)'); })),
    ]) : null;

    // Painel azul — recorrentes sem lançamento este mês
    var painelRecorr = recorrSemMes.length > 0 ? el('div', { style: {
      background: 'rgba(96,165,250,.06)', border: '1.5px solid rgba(96,165,250,.35)',
      borderRadius: '8px', padding: '12px 16px', marginBottom: '12px',
    }}, [
      el('div', { style: { fontSize: '12px', fontWeight: '700', color: 'var(--blue)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' } }, [
        el('span', {}, '🔄 Freelancers fixos sem lançamento em ' + MESES[parseInt(mesStr.split('-')[1])-1]),
        el('span', { style: { background: 'var(--blue)', color: '#fff', borderRadius: '10px', fontSize: '10px', padding: '1px 7px' } }, String(recorrSemMes.length)),
      ]),
      el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        recorrSemMes.map(function(f){
          var diaVenc = f.diaVencimento || 5;
          var dataGerada = mesStr + '-' + String(diaVenc).padStart(2, '0');
          return el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg)', borderRadius: '6px', padding: '8px 12px' } }, [
            el('div', { style: { flex: '1' } }, [
              el('div', { style: { fontWeight: '600', fontSize: '13px', color: 'var(--text)' } }, f.nome),
              el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, (f.descricaoFixa || 'Serviço mensal') + ' · vence dia ' + diaVenc),
            ]),
            el('div', { style: { fontWeight: '700', fontSize: '14px', color: 'var(--blue)' } }, fmtMoney(f.valorFixo || 0)),
            (function(ff, dg){ return el('button', { class: 'btn-primary', style: { fontSize: '11px', padding: '4px 12px', whiteSpace: 'nowrap' },
              onclick: function(){
                var novoSv = {
                  id: 'sv_' + Date.now() + '_' + ff.id,
                  freelancerId: ff.id,
                  descricao: ff.descricaoFixa || 'Serviço mensal',
                  data: dg,
                  valor: ff.valorFixo || 0,
                  status: 'pendente',
                  dataPagamento: '',
                  notas: 'Gerado automaticamente',
                  profile: pf,
                  criadoEm: hj,
                };
                var arr2 = (state.servicosFreelancer || []).concat([novoSv]);
                lsSet('servicosFreelancer', arr2);
                setState({ servicosFreelancer: arr2 });
                scheduleSave();
                showToast('Lançamento gerado para ' + ff.nome + '!');
              },
            }, '+ Gerar lançamento'); })(f, dataGerada),
          ]);
        })
      ),
    ]) : null;

    var alertaPainel = el('div', {}, [painelAtrasados, painelPendentes, painelRecorr].filter(Boolean));

    var svRows = svSorted.map(function(sv){
      var stSv = SV_ST[sv.status] || SV_ST.pendente;
      return el('tr', {
        style: { borderBottom: '1px solid var(--border)' },
        onmouseenter: function(e){ e.currentTarget.style.background = 'var(--bg3)'; },
        onmouseleave: function(e){ e.currentTarget.style.background = ''; },
      }, [
        el('td', { style: { padding: '10px 14px' } }, [
          el('div', { style: { fontWeight: '600', fontSize: '13px', color: 'var(--text)' } }, flNomePorId(sv.freelancerId)),
          el('div', { style: { fontSize: '11px', color: 'var(--text3)', marginTop: '2px' } }, sv.descricao || '—'),
        ]),
        el('td', { style: { padding: '10px 14px', fontSize: '12px', color: 'var(--text3)' } }, sv.data ? fmtDate(sv.data) : '—'),
        el('td', { style: { padding: '10px 14px', fontSize: '13px', fontWeight: '700', color: sv.status === 'pendente' ? 'var(--gold)' : sv.status === 'pago' ? '#00a86b' : 'var(--text3)' } }, fmtMoney(sv.valor || 0)),
        el('td', { style: { padding: '10px 14px' } }, [
          el('span', { style: { fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '10px', color: stSv.cor, background: stSv.bg } }, stSv.label),
          sv.status === 'pago' && sv.dataPagamento ? el('div', { style: { fontSize: '10px', color: 'var(--text3)', marginTop: '3px' } }, 'Pago em ' + fmtDate(sv.dataPagamento)) : null,
        ].filter(Boolean)),
        sv.notas ? el('td', { style: { padding: '10px 14px', fontSize: '11px', color: 'var(--text3)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, sv.notas) : el('td', {}, ''),
        el('td', { style: { padding: '8px 10px', textAlign: 'right' } }, [
          el('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end' } }, [
            sv.status === 'pendente' ? (function(s2){ return el('button', { class: 'btn-icon', title: 'Marcar como pago', style: { fontSize: '14px' },
              onclick: function(){ setState({ flPagarModal: { servico: s2 } }); }
            }, '✅'); })(sv) : null,
            el('button', { class: 'btn-icon edit', title: 'Editar', onclick: (function(s2){ return function(){ setState({ servicoFreelancerModal: { editItem: s2 } }); }; })(sv) }, '✏️'),
            el('button', { class: 'btn-icon delete', title: 'Excluir', onclick: (function(s2){ return function(){
              if (!window.confirm('Excluir serviço "' + s2.descricao + '"?')) return;
              var arr2 = (state.servicosFreelancer || []).filter(function(x){ return x.id !== s2.id; });
              lsSet('servicosFreelancer', arr2); setState({ servicosFreelancer: arr2 }); scheduleSave(); showToast('Serviço removido', 'error');
            }; })(sv) }, '🗑'),
          ].filter(Boolean)),
        ]),
      ]);
    });

    contentEl = div('', [
      kpiSv,
      alertaPainel,
      div('card', [
        svSorted.length === 0
          ? div('empty', [
            div('empty-icon', '📋'),
            div('empty-title', 'Nenhum serviço registrado'),
            el('p', { style: { fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' } }, 'Registre os serviços prestados pelos seus freelancers para controlar pagamentos.'),
          ])
          : el('div', { style: { overflowX: 'auto' } }, [
            el('div', { style: { marginBottom: '10px', fontSize: '12px', color: 'var(--text3)' } }, servicos.length + ' serviço' + (servicos.length !== 1 ? 's' : '') + ' · ' + numPend + ' pendente' + (numPend !== 1 ? 's' : '')),
            el('table', { style: { width: '100%', borderCollapse: 'collapse' } }, [
              el('thead', {}, [el('tr', { style: { borderBottom: '2px solid var(--border)' } },
                ['Freelancer / Serviço', 'Data', 'Valor', 'Status', 'Obs', ''].map(function(h){
                  return el('th', { style: { padding: '8px 14px', textAlign: h === '' ? 'right' : 'left', fontSize: '11px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase' } }, h);
                })
              )]),
              el('tbody', {}, svRows),
            ]),
          ]),
      ]),
    ]);
  }

  return div('', [
    div('page-header', [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }, [
        el('div', {}, [
          el('h1', {}, '🎨 Freelancers'),
          el('p', {}, 'Gerencie prestadores de serviço, controle pagamentos e serviços realizados'),
        ]),
        actionBtn,
      ]),
    ]),
    tabsEl,
    contentEl,
  ]);
}
