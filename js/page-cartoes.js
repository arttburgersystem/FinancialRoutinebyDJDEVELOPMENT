// ── CARTÕES DE CRÉDITO ────────────────────────────────────────────────────────

// ── INTELIGÊNCIA: calcula float e janela ideal para um cartão ────────────────
function calcCartaoInteligencia(card) {
  var hoje = typeof nowBR === 'function' ? nowBR() : new Date();
  var diaAtual = hoje.getDate();
  var diaFech  = card.diaFechamento  || 1;
  var diaVenc  = card.diaVencimento  || 10;
  var ano = hoje.getFullYear(), mes = hoje.getMonth();

  // Próximo fechamento
  var proxFechamento = diaAtual < diaFech
    ? new Date(ano, mes, diaFech)
    : new Date(ano, mes + 1, diaFech);

  // Data de pagamento para compras feitas HOJE
  var pagamento = diaAtual < diaFech
    ? new Date(ano, mes + 1, diaVenc)   // fecha este mês → paga próximo mês
    : new Date(ano, mes + 2, diaVenc);  // já fechou → paga daqui 2 meses

  var diasFloat     = Math.ceil((pagamento - hoje) / 86400000);
  var diasParaFechar = Math.ceil((proxFechamento - hoje) / 86400000);

  // Janela ideal = logo após o fechamento (1-7 dias depois)
  var noJanelaOtima = diaAtual > diaFech && diaAtual <= diaFech + 7;
  var melhorDia = diaFech + 1 > 28 ? 1 : diaFech + 1;

  var status, statusColor, statusBg;
  if (noJanelaOtima) {
    status='✅ Janela ideal agora!'; statusColor='var(--green)'; statusBg='rgba(34,197,94,.12)';
  } else if (diasParaFechar > 7) {
    status='🟡 Período razoável'; statusColor='var(--gold)'; statusBg='rgba(251,191,36,.1)';
  } else if (diasParaFechar <= 3) {
    status='🔴 Evitar — fecha em breve'; statusColor='var(--red)'; statusBg='rgba(239,68,68,.1)';
  } else {
    status='🟠 Período curto'; statusColor='#f97316'; statusBg='rgba(249,115,22,.1)';
  }

  return { diasFloat, diasParaFechar, melhorDia, pagamento, proxFechamento, noJanelaOtima, status, statusColor, statusBg };
}

// ── CSV PARSER INTELIGENTE ───────────────────────────────────────────────────
function parseFaturaCSV(text) {
  // Detectar delimitador
  var delim = (text.split(';').length > text.split(',').length) ? ';' : ',';
  var linhas = text.trim().split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (linhas.length < 2) return null;

  var header = linhas[0].split(delim).map(function(h) { return h.replace(/"/g,'').trim(); });
  var rows = linhas.slice(1).map(function(l) {
    var cols = l.split(delim).map(function(c) { return c.replace(/"/g,'').trim(); });
    var obj = {};
    header.forEach(function(h, i) { obj[h] = cols[i] || ''; });
    return obj;
  });

  // Detectar colunas automaticamente
  function detectCol(keywords) {
    return header.find(function(h) {
      var hl = h.toLowerCase();
      return keywords.some(function(k) { return hl.includes(k); });
    }) || null;
  }

  var colData  = detectCol(['data','date','dt']);
  var colDesc  = detectCol(['descri','title','titulo','lançamento','lancamento','merchant','estabelecimento','nome']);
  var colValor = detectCol(['valor','value','amount','total','quantia','débito','credito']);
  var colCat   = detectCol(['categ','category','tipo']);
  var colParc  = detectCol(['parcel','parcela','install']);

  return { header, rows, delim, colData, colDesc, colValor, colCat, colParc };
}

function parseDataBR(str) {
  if (!str) return '';
  var s = str.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY or DD/MM/YY
  var m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (m) {
    var y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + m[2] + '-' + m[1];
  }
  return '';
}

function parseValorBR(str) {
  if (!str) return 0;
  var s = str.replace(/[R$\s]/g,'').trim();
  // Remove pontos de milhar e converte vírgula decimal
  if (/^\-?[\d.]+,\d{2}$/.test(s)) s = s.replace(/\./g,'').replace(',','.');
  var v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────────────────────
function renderCartoes() {
  var cartoes  = (state.cartoes || []).filter(function(c) { return !c.profile || c.profile === state.profile; });
  var transacoes = (state.transacoesCartao || []).filter(function(t) { return !t.profile || t.profile === state.profile; });
  var hoje = typeof nowBR === 'function' ? nowBR() : new Date();
  var mesFiltro = state.cartaoMesFiltro || (hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2,'0'));
  var cardFiltro = state.cartaoFiltro || null;

  // ── MODAL: IMPORTAR FATURA ─────────────────────────────────────────────────
  if (state.importarFaturaModal) {
    var imp = state.importarFaturaModal;
    var parsed = imp.parsed || null;

    // Estado interno da detecção de colunas
    var _colData  = imp.colData  || (parsed && parsed.colData)  || '';
    var _colDesc  = imp.colDesc  || (parsed && parsed.colDesc)  || '';
    var _colValor = imp.colValor || (parsed && parsed.colValor) || '';
    var _colCat   = imp.colCat   || (parsed && parsed.colCat)   || '';
    var _colParc  = imp.colParc  || (parsed && parsed.colParc)  || '';
    var _cardId   = imp.cardId   || (cartoes[0] && cartoes[0].id) || '';
    var _mes      = imp.mes      || mesFiltro;
    var _negativoComoDespesa = imp.negativoComoDespesa !== false;

    function atualizarImp(patch) {
      setState({ importarFaturaModal: Object.assign({}, state.importarFaturaModal, patch) });
    }

    function confirmarImport() {
      if (!parsed || !_colData || !_colDesc || !_colValor) {
        showToast('Selecione as colunas obrigatórias','error'); return;
      }
      if (!_cardId) { showToast('Selecione o cartão','error'); return; }
      var novas = [];
      parsed.rows.forEach(function(row) {
        var dataStr = parseDataBR(row[_colData]);
        var valor   = parseValorBR(row[_colValor]);
        var desc    = (row[_colDesc] || '').trim();
        if (!dataStr || !desc || valor === 0) return;
        // Se negativo = despesa, usar abs; senão ignorar positivos (pagamentos)
        if (_negativoComoDespesa && valor > 0) return; // ignora créditos/pagamentos
        var valorFinal = Math.abs(valor);
        novas.push({
          id: 'ctrans_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
          cardId: _cardId,
          data: dataStr,
          descricao: desc,
          valor: valorFinal,
          categoria: _colCat ? (row[_colCat] || '') : '',
          parcela: _colParc ? (row[imp.colParc] || '') : '',
          fatura: _mes,
          profile: state.profile,
        });
      });
      if (novas.length === 0) { showToast('Nenhuma transação válida encontrada','error'); return; }
      // Remove transações existentes deste cartão/mês antes de reimportar
      var semOld = (state.transacoesCartao || []).filter(function(t) {
        return !(t.cardId === _cardId && t.fatura === _mes);
      });
      var todas = semOld.concat(novas);
      lsSet('transacoesCartao', todas);
      setState({ transacoesCartao: todas, importarFaturaModal: null, cartaoFiltro: _cardId, cartaoMesFiltro: _mes });
      scheduleSave();
      showToast(novas.length + ' transações importadas!');
    }

    var headerOpts = [el('option', {value: ''}, '— selecione —')]
      .concat((parsed ? parsed.header : []).map(function(h) { return el('option', {value: h}, h); }));

    function selCol(id, val, onchange) {
      var s = el('select', {class: 'form-input', style: {fontSize: '12px', padding: '5px 8px'}},
        headerOpts.map(function(o) { var c = o.cloneNode(true); if(c.value===val)c.selected=true; return c; }));
      s.onchange = function() { onchange(s.value); };
      return s;
    }

    // Preview das primeiras 5 linhas
    var previewRows = [];
    if (parsed && _colData && _colDesc && _colValor) {
      var validRows = parsed.rows.filter(function(r) {
        var v = parseValorBR(r[_colValor]);
        if (_negativoComoDespesa && v > 0) return false;
        return parseDataBR(r[_colData]) && (r[_colDesc]||'').trim() && v !== 0;
      }).slice(0, 8);
      previewRows = validRows.map(function(r) {
        return el('tr', {style: {borderBottom: '1px solid var(--border)'}}, [
          el('td', {style: {padding: '5px 8px', fontSize: '12px'}}, fmtDate(parseDataBR(r[_colData]))),
          el('td', {style: {padding: '5px 8px', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}, r[_colDesc] || ''),
          el('td', {style: {padding: '5px 8px', fontSize: '12px', fontWeight: '600', color: 'var(--red)', textAlign: 'right'}}, fmtMoney(Math.abs(parseValorBR(r[_colValor])))),
        ]);
      });
    }

    var cardSel = el('select', {class: 'form-input'},
      cartoes.map(function(c) {
        var op = el('option', {value: c.id}, c.nome + ' (••••' + c.final + ')');
        if (c.id === _cardId) op.selected = true;
        return op;
      }));
    cardSel.onchange = function() { atualizarImp({cardId: cardSel.value}); };

    var mesInput = el('input', {class: 'form-input', type: 'month', value: _mes});
    mesInput.onchange = function() { atualizarImp({mes: mesInput.value}); };

    var chkNeg = el('input', {type: 'checkbox'});
    chkNeg.checked = _negativoComoDespesa;
    chkNeg.onchange = function() { atualizarImp({negativoComoDespesa: chkNeg.checked}); };

    var fileInput = el('input', {type: 'file', accept: '.csv,.txt', style: {display: 'none'}});
    fileInput.onchange = function() {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var p = parseFaturaCSV(e.target.result);
        if (!p) { showToast('Não foi possível ler o arquivo','error'); return; }
        atualizarImp({ parsed: p, colData: p.colData||'', colDesc: p.colDesc||'', colValor: p.colValor||'', colCat: p.colCat||'' });
      };
      reader.readAsText(file, 'utf-8');
    };

    var uploadArea = el('div', {
      style: {border: '2px dashed var(--border)',borderRadius: '8px',padding: '24px',textAlign: 'center',cursor: 'pointer',marginBottom: '14px'},
      onclick: function() { fileInput.click(); },
    }, [
      el('div', {style: {fontSize: '28px', marginBottom: '6px'}}, '📂'),
      el('div', {style: {fontWeight: '600', fontSize: '14px'}}, parsed ? '✅ Arquivo carregado — ' + (parsed.rows.length) + ' linhas' : 'Clique para selecionar o CSV'),
      el('div', {style: {fontSize: '11px', color: 'var(--text3)', marginTop: '4px'}}, 'Formatos suportados: CSV exportado do app do banco'),
    ]);
    uploadArea.appendChild(fileInput);

    var mImp = div('modal', [
      div('modal-title', [
        el('span', {}, '📥 Importar fatura CSV'),
        el('button', {class: 'modal-close', onclick: function() { setState({importarFaturaModal: null}); }}, '×'),
      ]),
      uploadArea,
      parsed ? el('div', {}, [
        el('div', {style: {fontWeight: '600', fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', textTransform: 'uppercase'}}, 'Mapeamento de colunas'),
        el('div', {style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px'}}, [
          div('form-group', [el('label', {class: 'form-label'}, 'Data *'), selCol('data', _colData, function(v) { atualizarImp({colData: v}); })]),
          div('form-group', [el('label', {class: 'form-label'}, 'Descrição *'), selCol('desc', _colDesc, function(v) { atualizarImp({colDesc: v}); })]),
          div('form-group', [el('label', {class: 'form-label'}, 'Valor *'), selCol('valor', _colValor, function(v) { atualizarImp({colValor: v}); })]),
          div('form-group', [el('label', {class: 'form-label'}, 'Categoria'), selCol('cat', _colCat, function(v) { atualizarImp({colCat: v}); })]),
        ]),
        el('div', {style: {display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginBottom: '12px'}}, [
          chkNeg,
          el('span', {}, 'Valores negativos são despesas (ignorar créditos/pagamentos)'),
        ]),
      ]) : null,
      el('div', {style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px'}}, [
        div('form-group', [el('label', {class: 'form-label'}, 'Cartão'), cartoes.length ? cardSel : el('span', {style: {color: 'var(--red)', fontSize: '12px'}}, 'Cadastre um cartão primeiro')]),
        div('form-group', [el('label', {class: 'form-label'}, 'Mês da fatura'), mesInput]),
      ]),
      previewRows.length ? el('div', {}, [
        el('div', {style: {fontWeight: '600', fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase'}}, 'Prévia (' + previewRows.length + ' de ' + (parsed ? parsed.rows.length : 0) + ' transações)'),
        el('div', {style: {overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '14px'}}, [
          el('table', {style: {width: '100%', borderCollapse: 'collapse'}}, [
            el('thead', {}, [el('tr', {style: {background: 'var(--bg3)'}}, [
              el('th', {style: {padding: '5px 8px', fontSize: '11px', textAlign: 'left'}}, 'Data'),
              el('th', {style: {padding: '5px 8px', fontSize: '11px', textAlign: 'left'}}, 'Descrição'),
              el('th', {style: {padding: '5px 8px', fontSize: '11px', textAlign: 'right'}}, 'Valor'),
            ])]),
            el('tbody', {}, previewRows),
          ]),
        ]),
      ]) : null,
      div('modal-actions', [
        btn('btn-ghost', 'Cancelar', function() { setState({importarFaturaModal: null}); }),
        btn('btn-primary', '✅ Importar ' + (parsed ? parsed.rows.length : '') + ' linhas', confirmarImport),
      ]),
    ].filter(Boolean));
    mImp.style.maxWidth = '580px';
    var ovImp = div('modal-overlay', [mImp]);
    ovImp.onclick = function(e) { if(e.target===ovImp) setState({importarFaturaModal: null}); };
    return ovImp;
  }

  // ── MODAL: NOVO/EDITAR CARTÃO ──────────────────────────────────────────────
  if (state.cartaoModal !== null && state.cartaoModal !== undefined) {
    var cm = state.cartaoModal || {};
    var ced = cm.editItem || {};
    var isCEdit = !!ced.id;

    function gcf(id) { var e = document.getElementById('card-' + id); return e ? e.value : ''; }

    var BANDEIRAS = ['Visa','Mastercard','Elo','American Express','Hipercard','Outros'];
    var CORES_CARD = ['#1a1a2e','#16213e','#0f3460','#1b4332','#6b21a8','#7f1d1d','#1e40af','#0f766e','#374151'];

    function salvarCard() {
      var nome = gcf('nome').trim();
      if (!nome) { showToast('Informe o nome do cartão','error'); return; }
      var dFech = parseInt(gcf('diaFechamento')) || 1;
      var dVenc = parseInt(gcf('diaVencimento')) || 10;
      if (dFech < 1 || dFech > 31 || dVenc < 1 || dVenc > 31) {
        showToast('Dias de fechamento/vencimento inválidos (1-31)','error'); return;
      }
      var item = {
        id: isCEdit ? ced.id : ('card_' + Date.now()),
        nome, banco: gcf('banco').trim(),
        bandeira: gcf('bandeira') || 'Visa',
        final: gcf('final').replace(/\D/g,'').slice(-4),
        limite: parseFloat(gcf('limite')) || 0,
        diaFechamento: dFech,
        diaVencimento: dVenc,
        cor: gcf('cor') || '#1a1a2e',
        profile: state.profile,
      };
      var arr = isCEdit
        ? (state.cartoes||[]).map(function(x){return x.id===item.id?item:x;})
        : (state.cartoes||[]).concat([item]);
      lsSet('cartoes', arr);
      setState({ cartoes: arr, cartaoModal: null });
      scheduleSave();
      showToast(isCEdit ? 'Cartão atualizado!' : 'Cartão cadastrado!');
    }

    function cinp(id, type, ph, val) {
      var i = el('input', {class: 'form-input', type: type||'text', id: 'card-'+id, placeholder: ph||''});
      i.value = val !== undefined ? String(val) : '';
      return i;
    }
    function cfg(label, inp) { return div('form-group', [el('label', {class: 'form-label'}, label), inp]); }

    var bandSel = el('select', {class: 'form-input', id: 'card-bandeira'},
      BANDEIRAS.map(function(b) { var o = el('option', {value: b}, b); if(b===(ced.bandeira||'Visa'))o.selected=true; return o; }));

    var corSel = el('div', {style: {display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px'}});
    var corAtual = ced.cor || '#1a1a2e';
    CORES_CARD.forEach(function(cor) {
      var btn2 = el('button', {});
      btn2.style.cssText = 'width:28px;height:28px;border-radius:50%;background:'+cor+';border:'+(cor===corAtual?'3px solid #fff':'2px solid transparent')+';cursor:pointer;';
      btn2.onclick = function() {
        corAtual = cor;
        document.getElementById('card-cor').value = cor;
        corSel.querySelectorAll('button').forEach(function(b) { b.style.border = '2px solid transparent'; });
        btn2.style.border = '3px solid #fff';
      };
      corSel.appendChild(btn2);
    });

    var mCard = div('modal', [
      div('modal-title', [
        el('span', {}, (isCEdit ? 'Editar' : 'Novo') + ' cartão'),
        el('button', {class: 'modal-close', onclick: function() { setState({cartaoModal: null}); }}, '×'),
      ]),
      el('div', {style: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}, [
        cfg('Nome do cartão *', cinp('nome','text','Ex: Nubank Gold, Itaú Platinum...', ced.nome||'')),
        cfg('Banco emissor', cinp('banco','text','Ex: Nubank, Itaú, Bradesco...', ced.banco||'')),
      ]),
      el('div', {style: {display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}, [
        cfg('Bandeira', bandSel),
        cfg('4 últimos dígitos', cinp('final','text','1234', ced.final||'')),
        cfg('Limite (R$)', cinp('limite','number','5000', ced.limite||'')),
      ]),
      el('div', {style: {display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}, [
        cfg('Dia de fechamento', cinp('diaFechamento','number','5', ced.diaFechamento||'')),
        cfg('Dia de vencimento', cinp('diaVencimento','number','15', ced.diaVencimento||'')),
      ]),
      div('form-group', [
        el('label', {class: 'form-label'}, 'Cor do cartão'),
        corSel,
        el('input', {type: 'hidden', id: 'card-cor', value: corAtual}),
      ]),
      div('modal-actions', [
        btn('btn-ghost', 'Cancelar', function() { setState({cartaoModal: null}); }),
        btn('btn-primary', isCEdit ? '💾 Salvar' : '➕ Adicionar cartão', salvarCard),
      ]),
    ]);
    mCard.style.maxWidth = '520px';
    var ovCard = div('modal-overlay', [mCard]);
    ovCard.onclick = function(e) { if(e.target===ovCard) setState({cartaoModal: null}); };
    setTimeout(function() { var i = document.getElementById('card-nome'); if(i) i.focus(); }, 50);
    return ovCard;
  }

  // ── MODAL: PAGAR FATURA ────────────────────────────────────────────────────
  if (state.pagamentoFaturaModal) {
    var pm    = state.pagamentoFaturaModal;
    var pmCard = cartoes.find(function(c){ return c.id === pm.cardId; });
    var bancos = (state.bancos||[]).filter(function(b){ return !b.profile || b.profile === state.profile; });
    var MESES_PM = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    function fmtMesPM(m){ var p=m.split('-'); return MESES_PM[parseInt(p[1])-1]+'/'+p[0]; }

    function gpm(id){ var e=document.getElementById('pm-'+id); return e?e.value:''; }

    function confirmarPagamento(){
      var valorRaw = gpm('valor').replace(',','.').replace(/[^\d\.]/g,'');
      var valor = parseFloat(valorRaw) || pm.total;
      if(valor <= 0){ showToast('Valor inválido','error'); return; }
      var dataPag   = gpm('data') || today();
      var bancoId   = gpm('banco');
      var chkEl     = document.getElementById('pm-deduzir');
      var deduzir   = bancoId && chkEl && chkEl.checked;

      var novaConta = {
        id:            'conta_' + Date.now(),
        tipo:          'pagar',
        descricao:     'Fatura ' + (pmCard ? pmCard.nome : 'Cartão') + ' — ' + fmtMesPM(pm.mes),
        categoria:     'Fatura Cartão',
        valor:         valor,
        valorPago:     valor,
        vencimento:    dataPag,
        dataPagamento: dataPag,
        pago:          true,
        profile:       state.profile,
        _cardId:       pm.cardId,
        _faturaRef:    pm.mes,
        bancoId:       bancoId || '',
      };
      var newContas = (state.contas||[]).concat([novaConta]);

      var newBancos = state.bancos || [];
      if(deduzir && bancoId){
        newBancos = newBancos.map(function(b){
          if(b.id !== bancoId) return b;
          return Object.assign({},b,{saldo: Math.round(((b.saldo||0) - valor)*100)/100});
        });
        lsSet('bancos', newBancos);
      }

      lsSet('contas', newContas);
      setState({contas: newContas, bancos: newBancos, pagamentoFaturaModal: null});
      scheduleSave();
      if(typeof logAudit==='function') logAudit('pagou fatura cartão', (pmCard?pmCard.nome:'Cartão')+' '+pm.mes+' — '+fmtMoney(valor));
      showToast('✅ Fatura paga! Lançado em Despesas'+(deduzir?' e deduzido do banco':'')+'.', 'success', 3500);
    }

    var pmValorInp = el('input',{class:'form-input',type:'number',id:'pm-valor',step:'0.01',min:'0'});
    pmValorInp.value = pm.total.toFixed(2);

    var pmDataInp = el('input',{class:'form-input',type:'date',id:'pm-data'});
    pmDataInp.value = today();

    var bancoOpts = [el('option',{value:''},'— Não deduzir de nenhuma conta —')].concat(
      bancos.map(function(b){
        var op = el('option',{value:b.id}, b.nome + (b.saldo!=null?' ('+fmtMoney(b.saldo)+')':''));
        return op;
      })
    );
    var pmBancoSel = el('select',{class:'form-input',id:'pm-banco'}, bancoOpts);

    var pmDeduzirChk = el('input',{type:'checkbox',id:'pm-deduzir'});
    pmDeduzirChk.checked = true;

    var mPm = div('modal',[
      div('modal-title',[
        el('span',{},'💳 Pagar Fatura'),
        el('button',{class:'modal-close',onclick:function(){setState({pagamentoFaturaModal:null});}},'×'),
      ]),
      el('div',{style:{background:'rgba(201,168,76,0.08)',border:'1px solid var(--gold)',borderRadius:'8px',padding:'12px 14px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'14px'}},[
        pmCard ? el('div',{style:{width:'40px',height:'26px',borderRadius:'6px',background:pmCard.cor,flexShrink:'0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:'700'}},'••'+pmCard.final) : null,
        el('div',{},[
          el('div',{style:{fontWeight:'700',fontSize:'14px'}}, pmCard ? pmCard.nome+' ••••'+pmCard.final : 'Cartão'),
          el('div',{style:{fontSize:'12px',color:'var(--text3)',marginTop:'2px'}}, 'Fatura de '+fmtMesPM(pm.mes)+' — '+pm.count+' transação'+(pm.count!==1?'ões':'')),
        ]),
        el('div',{style:{marginLeft:'auto',textAlign:'right'}},[
          el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Total da fatura'),
          el('div',{style:{fontSize:'20px',fontWeight:'800',color:'var(--red)'}},fmtMoney(pm.total)),
        ]),
      ].filter(Boolean)),
      el('div',{class:'form-row'},[
        div('form-group',[el('label',{class:'form-label'},'Valor pago'), pmValorInp]),
        div('form-group',[el('label',{class:'form-label'},'Data do pagamento'), pmDataInp]),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Débitar de qual conta bancária'),
        pmBancoSel,
      ]),
      bancos.length > 0 ? el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginTop:'10px',padding:'10px 12px',background:'var(--bg3)',borderRadius:'8px',fontSize:'13px'}},[
        pmDeduzirChk,
        el('label',{for:'pm-deduzir',style:{cursor:'pointer'}},'Deduzir do saldo bancário ao confirmar'),
      ]) : null,
      el('div',{style:{background:'rgba(76,175,130,0.08)',border:'1px solid rgba(76,175,130,0.3)',borderRadius:'8px',padding:'10px 12px',marginTop:'12px',fontSize:'12px',color:'var(--text2)'}},[
        el('b',{},'O que será registrado: '),
        el('span',{},'Uma despesa "Fatura Cartão" marcada como paga aparece em Despesas e, se selecionado, o saldo da conta bancária é deduzido automaticamente.'),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({pagamentoFaturaModal:null});}),
        btn('btn-primary','✅ Confirmar pagamento', confirmarPagamento),
      ]),
    ].filter(Boolean));
    mPm.style.maxWidth = '500px';
    var ovPm = div('modal-overlay',[mPm]);
    ovPm.onclick = function(e){ if(e.target===ovPm) setState({pagamentoFaturaModal:null}); };
    return ovPm;
  }

  // ── PAINEL DE INTELIGÊNCIA ─────────────────────────────────────────────────
  var intel = null;
  if (cartoes.length > 0) {
    var diaHoje = hoje.getDate();
    var ranking = cartoes.map(function(card) {
      var info = calcCartaoInteligencia(card);
      return { card, info };
    }).sort(function(a, b) { return b.info.diasFloat - a.info.diasFloat; });

    var melhor = ranking[0];
    var rankRows = ranking.map(function(r, idx) {
      var medals = ['🥇','🥈','🥉'];
      var medal = medals[idx] || (idx+1)+'º';
      var row = el('div', {});
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);';
      if (r.card.id === melhor.card.id) row.style.background = 'rgba(34,197,94,.06)';

      var cardDot = el('div', {});
      cardDot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:'+r.card.cor+';flex-shrink:0;';

      var info2 = el('div', {style: {flex: '1'}}, [
        el('div', {style: {fontSize: '13px', fontWeight: '600', color: 'var(--text)'}},
          medal + ' ' + r.card.nome + ' ••••' + r.card.final),
        el('div', {style: {fontSize: '11px', color: 'var(--text3)', marginTop: '2px'}},
          r.info.status + ' · Fecha em ' + r.info.diasParaFechar + 'd · Paga ' + fmtDate(r.info.pagamento.toISOString().slice(0,10))),
      ]);

      var floatBadge = el('div', {});
      floatBadge.style.cssText = 'text-align:right;flex-shrink:0;';
      var fb = el('div', {style: {fontSize: '18px', fontWeight: '800', color: r.info.statusColor}},
        r.info.diasFloat + 'd');
      var fbl = el('div', {style: {fontSize: '10px', color: 'var(--text3)'}}, 'de float');
      floatBadge.appendChild(fb);
      floatBadge.appendChild(fbl);

      row.appendChild(cardDot);
      row.appendChild(info2);
      row.appendChild(floatBadge);
      return row;
    });

    var melhorInfo = melhor.info;
    var cabecalho = el('div', {style: {background: 'linear-gradient(135deg,var(--bg3),var(--bg2))', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', border: '1px solid var(--border)'}}, [
      el('div', {style: {fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)', marginBottom: '8px'}}, '🧠 Inteligência de Compras — Hoje, ' + diaHoje + ' de ' + ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][hoje.getMonth()]),
      el('div', {style: {display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'}}, [
        el('div', {}, [
          el('div', {style: {fontSize: '13px', color: 'var(--text3)'}}, 'Melhor cartão para usar agora'),
          el('div', {style: {fontSize: '17px', fontWeight: '800', color: melhorInfo.statusColor, marginTop: '2px'}},
            melhor.card.nome + ' ••••' + melhor.card.final),
          el('div', {style: {fontSize: '12px', color: 'var(--text3)', marginTop: '2px'}},
            melhorInfo.status),
        ]),
        el('div', {style: {borderLeft: '1px solid var(--border)', paddingLeft: '16px'}}, [
          el('div', {style: {fontSize: '13px', color: 'var(--text3)'}}, 'Você paga em'),
          el('div', {style: {fontSize: '17px', fontWeight: '800', color: 'var(--blue)', marginTop: '2px'}},
            fmtDate(melhorInfo.pagamento.toISOString().slice(0,10))),
          el('div', {style: {fontSize: '12px', color: 'var(--text3)', marginTop: '2px'}},
            'Dinheiro fica ' + melhorInfo.diasFloat + ' dias a mais na conta'),
        ]),
        el('div', {style: {borderLeft: '1px solid var(--border)', paddingLeft: '16px'}}, [
          el('div', {style: {fontSize: '12px', color: 'var(--text3)'}}, 'Melhor dia para comprar'),
          el('div', {style: {fontSize: '17px', fontWeight: '800', color: 'var(--gold)', marginTop: '2px'}},
            'Dia ' + melhorInfo.melhorDia),
          el('div', {style: {fontSize: '12px', color: 'var(--text3)', marginTop: '2px'}},
            'Logo após o fechamento'),
        ]),
      ]),
    ]);

    var dica = el('div', {style: {background: 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', lineHeight: '1.6'}}, [
      el('strong', {style: {color: 'var(--blue)'}}, '💡 Como maximizar o dinheiro em conta: '),
      el('span', {style: {color: 'var(--text2)'}},
        'Para compras grandes, use o cartão com mais dias de float. Comprar logo após o fechamento da fatura garante ~40 dias até o pagamento. Evite comprar próximo ao fechamento — a dívida vence muito antes.'),
    ]);

    intel = div('card', [
      cabecalho,
      dica,
      el('div', {style: {fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)', marginBottom: '8px'}}, 'Ranking de cartões por float disponível hoje'),
      el('div', {style: {border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden'}}, rankRows),
    ]);
  }

  // ── CARDS VISUAIS ──────────────────────────────────────────────────────────
  var cardWidgets = cartoes.length === 0
    ? div('empty', [
        div('empty-icon', '💳'),
        div('empty-title', 'Nenhum cartão cadastrado'),
        el('p', {style: {fontSize: '13px', color: 'var(--text3)', marginBottom: '16px'}},
          'Adicione seus cartões para ativar a inteligência de compras e controle de faturas.'),
        btn('btn-primary', '➕ Adicionar primeiro cartão', function() { setState({cartaoModal: {}}); }),
      ])
    : el('div', {style: {display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px', marginBottom: '20px'}},
        cartoes.map(function(card) {
          var info = calcCartaoInteligencia(card);
          var transCard = transacoes.filter(function(t) { return t.cardId === card.id && t.fatura === mesFiltro; });
          var totalFatura = transCard.reduce(function(s, t) { return s + (t.valor || 0); }, 0);

          // Se a fatura deste mês foi paga, crédito volta ao limite total
          var faturaMesPaga = (state.contas||[]).find(function(c){
            return c._cardId===card.id && c._faturaRef===mesFiltro && c.categoria==='Fatura Cartão' && c.pago;
          });
          var gastoEfetivo = faturaMesPaga ? 0 : totalFatura;
          var pctUsado  = card.limite > 0 ? Math.min(100, (gastoEfetivo / card.limite) * 100) : 0;
          var disponivel = card.limite > 0 ? Math.max(0, card.limite - gastoEfetivo) : null;

          var cardEl = el('div', {});
          cardEl.style.cssText = [
            'border-radius:14px;padding:20px;color:#fff;position:relative;overflow:hidden;',
            'background:' + card.cor + ';box-shadow:0 8px 24px rgba(0,0,0,.3);',
            'cursor:pointer;transition:transform .15s,box-shadow .15s;',
          ].join('');
          cardEl.onmouseenter = function() { cardEl.style.transform = 'translateY(-3px)'; cardEl.style.boxShadow = '0 14px 32px rgba(0,0,0,.4)'; };
          cardEl.onmouseleave = function() { cardEl.style.transform = ''; cardEl.style.boxShadow = '0 8px 24px rgba(0,0,0,.3)'; };
          cardEl.onclick = function() { setState({cartaoFiltro: card.id === cardFiltro ? null : card.id}); };

          // Selecionado
          if (card.id === cardFiltro) cardEl.style.outline = '3px solid #fff';

          var topRow = el('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}, [
            el('div', {}, [
              el('div', {style: {fontSize: '16px', fontWeight: '800'}}, card.nome),
              el('div', {style: {fontSize: '12px', opacity: '.7', marginTop: '2px'}}, card.banco || card.bandeira),
            ]),
            el('div', {style: {textAlign: 'right'}}, [
              el('div', {style: {fontSize: '11px', opacity: '.7'}}, card.bandeira),
              el('div', {style: {
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '700',
                marginTop: '4px',
                background: info.statusBg,
                color: info.statusColor,
                border: '1px solid ' + info.statusColor + '55',
              }}, info.diasFloat + 'd float'),
            ]),
          ]);

          var final4 = el('div', {style: {fontSize: '18px', letterSpacing: '3px', marginBottom: '16px', opacity: '.9'}},
            '•••• •••• •••• ' + (card.final || '????'));

          var limiteInfo = el('div', {}, [
            el('div', {style: {display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: '.7', marginBottom: '4px'}}, [
              el('span', {}, faturaMesPaga ? '✅ Fatura ' + mesFiltro + ' paga' : 'Fatura ' + mesFiltro),
              el('span', {}, faturaMesPaga
                ? fmtMoney(totalFatura) + ' (quitado)'
                : (card.limite > 0 ? fmtMoney(totalFatura) + ' / ' + fmtMoney(card.limite) : fmtMoney(totalFatura))),
            ]),
            el('div', {style: {height: '4px', background: 'rgba(255,255,255,.2)', borderRadius: '2px', overflow: 'hidden'}}, [
              el('div', {style: {height: '100%', width: pctUsado + '%', background: faturaMesPaga ? '#22c55e' : (pctUsado > 80 ? '#ef4444' : '#fff'), borderRadius: '2px', transition: 'width .5s'}}),
            ]),
            el('div', {style: {display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px'}}, [
              disponivel !== null
                ? el('span', {style: {opacity: '.7', color: faturaMesPaga ? '#86efac' : ''}},
                    'Disponível: ' + fmtMoney(disponivel) + (faturaMesPaga ? ' (limite total)' : ''))
                : el('span', {style: {opacity: '.5'}}, 'Limite não definido'),
              el('span', {style: {opacity: '.7'}}, 'Fecha dia ' + card.diaFechamento + ' · Vence dia ' + card.diaVencimento),
            ]),
          ]);

          var actions = el('div', {style: {position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px'}}, [
            el('button', {
              style: {background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px'},
              title: 'Editar',
              onclick: function(e) { e.stopPropagation(); setState({cartaoModal: {editItem: card}}); },
            }, '✏️'),
            el('button', {
              style: {background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '13px'},
              title: 'Excluir',
              onclick: function(e) {
                e.stopPropagation();
                if (!window.confirm('Excluir cartão "' + card.nome + '"?\nAs transações importadas também serão removidas.')) return;
                var novsC = (state.cartoes||[]).filter(function(x){return x.id!==card.id;});
                var novsT = (state.transacoesCartao||[]).filter(function(x){return x.cardId!==card.id;});
                lsSet('cartoes',novsC); lsSet('transacoesCartao',novsT);
                setState({cartoes:novsC,transacoesCartao:novsT,cartaoFiltro:null});
                scheduleSave(); showToast('Cartão removido','error');
              },
            }, '🗑'),
          ]);
          actions.onclick = function(e) { e.stopPropagation(); };

          // Verificar se a fatura deste mês já foi paga
          var faturaPaga = (state.contas||[]).find(function(c){
            return c._cardId===card.id && c._faturaRef===mesFiltro && c.categoria==='Fatura Cartão' && c.pago;
          });

          // Botão / badge de pagamento — sempre visível
          var payRow = el('div',{style:{marginTop:'12px',paddingTop:'10px',borderTop:'1px solid rgba(255,255,255,.2)'}});
          if(faturaPaga){
            payRow.appendChild(el('div',{style:{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'rgba(255,255,255,.9)',fontWeight:'600'}},[
              el('span',{},'✅ Fatura paga'),
              el('span',{style:{opacity:'.6',fontWeight:'400'}}, faturaPaga.dataPagamento ? '· '+fmtDate(faturaPaga.dataPagamento) : ''),
            ]));
          } else {
            var payBtn = el('button',{});
            payBtn.style.cssText = 'width:100%;padding:8px 0;border-radius:8px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);color:#fff;font-size:13px;font-weight:700;cursor:pointer;';
            payBtn.textContent = totalFatura > 0
              ? '💳 Pagar fatura — ' + fmtMoney(totalFatura)
              : '💳 Registrar pagamento';
            payBtn.onclick = function(e){
              e.stopPropagation();
              setState({pagamentoFaturaModal:{cardId:card.id,mes:mesFiltro,total:totalFatura,count:transCard.length}});
            };
            payRow.appendChild(payBtn);
          }

          cardEl.appendChild(topRow);
          cardEl.appendChild(final4);
          cardEl.appendChild(limiteInfo);
          cardEl.appendChild(payRow);
          cardEl.appendChild(actions);
          return cardEl;
        })
      );

  // ── FILTRO MÊS ────────────────────────────────────────────────────────────
  var mesesDisponiveis = [];
  var vistosM = {};
  transacoes.forEach(function(t) { if(t.fatura && !vistosM[t.fatura]) { vistosM[t.fatura]=true; mesesDisponiveis.push(t.fatura); } });
  if (!vistosM[mesFiltro]) mesesDisponiveis.push(mesFiltro);
  mesesDisponiveis.sort().reverse();

  var MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  function fmtMesLabel(m) { var p=m.split('-'); return MESES_NOMES[parseInt(p[1])-1]+' '+p[0]; }

  var mesChips = mesesDisponiveis.map(function(m) {
    return el('button', {
      class: 'chip' + (m===mesFiltro?' active':''),
      onclick: function() { setState({cartaoMesFiltro: m}); },
    }, fmtMesLabel(m));
  });

  // ── TRANSAÇÕES ────────────────────────────────────────────────────────────
  var transFiltradas = transacoes.filter(function(t) {
    var mesOk = t.fatura === mesFiltro;
    var cardOk = !cardFiltro || t.cardId === cardFiltro;
    return mesOk && cardOk;
  }).sort(function(a, b) { return b.data < a.data ? -1 : 1; });

  var totalFiltrado = transFiltradas.reduce(function(s, t) { return s + (t.valor || 0); }, 0);

  // Agrupar por categoria para mini-relatório
  var porCat = {};
  transFiltradas.forEach(function(t) {
    var cat = t.categoria || 'Outros';
    porCat[cat] = (porCat[cat] || 0) + t.valor;
  });
  var catArr = Object.keys(porCat).map(function(k) { return {cat: k, val: porCat[k]}; }).sort(function(a,b) { return b.val-a.val; });

  var cardMap = {};
  cartoes.forEach(function(c) { cardMap[c.id] = c; });

  var transRows = transFiltradas.length === 0
    ? [el('tr', {}, [el('td', {colspan: '5', style: {textAlign:'center',padding:'30px',color:'var(--text3)'}}, 'Nenhuma transação. Importe uma fatura CSV.')])]
    : transFiltradas.map(function(t) {
        var card = cardMap[t.cardId];
        return el('tr', {
          style: {borderBottom: '1px solid var(--border)'},
          onmouseenter: function(e) { e.currentTarget.style.background='var(--bg3)'; },
          onmouseleave: function(e) { e.currentTarget.style.background=''; },
        }, [
          el('td', {style: {padding: '8px 12px', fontSize: '12px', color: 'var(--text3)'}}, fmtDate(t.data)),
          el('td', {style: {padding: '8px 12px', fontSize: '13px', fontWeight: '500', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}, t.descricao),
          el('td', {style: {padding: '8px 12px', fontSize: '11px', color: 'var(--text3)'}}, t.categoria || '—'),
          el('td', {style: {padding: '8px 12px', fontSize: '12px', color: 'var(--text3)'}},
            card ? el('span', {style: {background: card.cor, color: '#fff', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700'}},
              card.nome.split(' ')[0] + ' ••' + (card.final || '')) : '—'),
          el('td', {style: {padding: '8px 12px', fontWeight: '700', color: 'var(--red)', textAlign: 'right'}}, fmtMoney(t.valor)),
          el('td', {style: {padding: '8px 8px', textAlign: 'right'}}, [
            el('button', {class: 'btn-icon', title: 'Remover', onclick: function() {
              var novas = (state.transacoesCartao||[]).filter(function(x){return x.id!==t.id;});
              lsSet('transacoesCartao',novas); setState({transacoesCartao:novas}); scheduleSave();
            }}, '🗑'),
          ]),
        ]);
      });

  var catChartItems = catArr.slice(0, 6).map(function(c) {
    var pct = totalFiltrado > 0 ? (c.val / totalFiltrado * 100) : 0;
    var barEl = el('div', {style: {marginBottom: '8px'}}, [
      el('div', {style: {display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px'}}, [
        el('span', {style: {color: 'var(--text2)'}}, c.cat),
        el('span', {style: {color: 'var(--text3)'}}, fmtMoney(c.val) + ' (' + pct.toFixed(0) + '%)'),
      ]),
      el('div', {style: {height: '5px', background: 'var(--bg3)', borderRadius: '3px', overflow: 'hidden'}}, [
        el('div', {style: {height: '100%', width: pct + '%', background: 'var(--blue)', borderRadius: '3px'}}),
      ]),
    ]);
    return barEl;
  });

  return div('', [
    div('page-header', [
      el('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}, [
        el('div', {}, [
          el('h1', {}, '💳 Cartões de Crédito'),
          el('p', {}, 'Gerencie cartões, faturas e maximize o dinheiro em conta'),
        ]),
        el('div', {style: {display: 'flex', gap: '8px'}}, [
          cartoes.length > 0 ? btn('btn-ghost', '📥 Importar fatura CSV', function() { setState({importarFaturaModal: {}}); }) : null,
          btn('btn-primary', '➕ Novo cartão', function() { setState({cartaoModal: {}}); }),
        ].filter(Boolean)),
      ]),
    ]),

    intel,

    cartoes.length > 0 ? el('div', {style: {marginBottom: '20px'}}, [
      el('div', {style: {fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--text3)', marginBottom: '10px'}}, '💳 Seus cartões — clique para filtrar'),
      cardWidgets,
    ]) : div('card', [cardWidgets]),

    cartoes.length > 0 ? el('div', {style: {display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '20px', alignItems: 'start'}}, [
      el('div', {style: {minWidth: '220px'}}, [
        div('card', [
          el('div', {style: {fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px'}}, 'Fatura por mês'),
          mesChips.length ? el('div', {style: {display: 'flex', flexDirection: 'column', gap: '4px'}},
            mesesDisponiveis.map(function(m) {
              var totM = transacoes.filter(function(t){return t.fatura===m&&(!cardFiltro||t.cardId===cardFiltro);}).reduce(function(s,t){return s+t.valor;},0);
              var chip = el('button', {
                class: 'chip' + (m===mesFiltro?' active':''),
                style: {display: 'flex', justifyContent: 'space-between', textAlign: 'left', padding: '7px 12px'},
                onclick: function() { setState({cartaoMesFiltro: m}); },
              }, [
                el('span', {}, fmtMesLabel(m)),
                el('span', {style: {fontSize: '11px', fontWeight: '700'}}, fmtMoney(totM)),
              ]);
              return chip;
            })
          ) : el('p', {style: {fontSize: '12px', color: 'var(--text3)'}}, 'Importe uma fatura para ver os meses'),
          catArr.length > 0 ? el('div', {style: {marginTop: '16px'}}, [
            el('div', {style: {fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '10px'}}, 'Por categoria'),
            el('div', {}, catChartItems),
          ]) : null,
        ].filter(Boolean)),
      ]),
      el('div', {}, [
        div('card', [
          el('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px', flexWrap: 'wrap'}}, [
            el('div', {}, [
              el('div', {style: {fontWeight: '700', fontSize: '14px'}}, fmtMesLabel(mesFiltro) + (cardFiltro && cardMap[cardFiltro] ? ' — ' + cardMap[cardFiltro].nome : '')),
              el('div', {style: {fontSize: '12px', color: 'var(--text3)'}}, transFiltradas.length + ' transações · Total: ' + fmtMoney(totalFiltrado)),
            ]),
            el('div', {style: {display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap'}}, [
              // Botão pagar (só aparece se há transações e cartão filtrado)
              (function(){
                if(transFiltradas.length === 0) return null;
                var pmCardId = cardFiltro || (cartoes.length === 1 ? cartoes[0].id : null);
                var pmCardObj = pmCardId ? cartoes.find(function(c){return c.id===pmCardId;}) : null;
                var jaPaga = (state.contas||[]).some(function(c){
                  return c._cardId===pmCardId && c._faturaRef===mesFiltro && c.categoria==='Fatura Cartão' && c.pago;
                });
                if(jaPaga) return el('span',{style:{fontSize:'12px',color:'var(--green)',fontWeight:'700',display:'flex',alignItems:'center',gap:'4px'}},'✅ Fatura paga');
                if(!pmCardId && cartoes.length > 1) return null; // múltiplos cartões sem filtro: usar botão no card
                return btn('btn-primary', '💳 Pagar fatura', function(){
                  setState({pagamentoFaturaModal:{
                    cardId: pmCardId,
                    mes: mesFiltro,
                    total: totalFiltrado,
                    count: transFiltradas.length,
                  }});
                });
              })(),
              cardFiltro ? btn('btn-ghost', '× Limpar filtro', function() { setState({cartaoFiltro: null}); }) : null,
            ].filter(Boolean)),
          ].filter(Boolean)),
          el('div', {style: {overflowX: 'auto'}}, [
            el('table', {style: {width: '100%', borderCollapse: 'collapse'}}, [
              el('thead', {}, [el('tr', {style: {borderBottom: '2px solid var(--border)'}}, [
                'Data','Descrição','Categoria','Cartão','Valor','',
              ].map(function(h) { return el('th', {style: {padding: '7px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--text3)', fontWeight: '700', textTransform: 'uppercase'}}, h); }))]),
              el('tbody', {}, transRows),
            ]),
          ]),
        ]),
      ]),
    ]) : null,
  ].filter(Boolean));
}
