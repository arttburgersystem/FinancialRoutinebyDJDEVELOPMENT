// ── MODAL LANÇAMENTO ──────────────────────────────────────────────────────────
function renderModal(){
  var m=state.modal; if(!m)return null;
  var tipo=m.tipo,edit=m.editItem||{};
  var catKey=getCatKey(state.profile,tipo); var cats=getCats(catKey);
  var vals={
    descricao:edit.descricao||'',valor:edit.valor||'',categoria:edit.categoria||cats[0],
    vencimento:edit.vencimento||today(),status:edit.status||(tipo==='pagar'?'pendente':'previsto'),
    prioridade:edit.prioridade||'normal',lembrete_custom:edit.lembrete_custom||'',
    recorrente:edit.recorrente||false,recorrencia_tipo:edit.recorrencia_tipo||'mensal',
    recorrencia_intervalo:edit.recorrencia_intervalo||1,recorrencia_fim:edit.recorrencia_fim||'nunca',
    recorrencia_fim_data:edit.recorrencia_fim_data||'',recorrencia_fim_ocorrencias:edit.recorrencia_fim_ocorrencias||12,
    lembrete_antecipado:edit.lembrete_antecipado||0,notas:edit.notas||'',
    formaPgto:edit.formaPgto||'',
    banco:edit.banco||'',
    fornecedor:edit.fornecedor||'',
    fornecedorId:edit.fornecedorId||'',
    cardId:edit.cardId||'',
    numParcelas:edit.numParcelas||1,
    faturaInicio:edit.faturaInicio||today().slice(0,7),
  };

  function g(id){return document.getElementById('mf-'+id)?document.getElementById('mf-'+id).value:vals[id];}
  function getCk(){return document.getElementById('mf-rec')?document.getElementById('mf-rec').checked:vals.recorrente;}
  function getRec(){return{tipo:g('rec-tipo'),intervalo:parseInt(g('rec-intervalo'))||1,fim:g('rec-fim'),fim_data:g('rec-fim-data'),fim_ocorrencias:parseInt(g('rec-fim-oc'))||12,lembrete:parseInt(g('rec-lembrete'))||0};}

  function save(){
    var rec=getCk();
    var d={
      id:edit.id||('conta_'+Date.now()),
      descricao:g('descricao'),valor:parseFloat(g('valor'))||0,
      categoria:g('categoria'),vencimento:g('vencimento'),
      status:g('status'),recorrente:rec,notas:g('notas'),
      tipo:tipo,profile:state.profile,
      formaPgto:g('formaPgto'),
      banco:g('banco'),
    };
    var r=getRec();
    d.recorrencia_tipo=r.tipo;d.recorrencia_intervalo=r.intervalo;d.recorrencia_fim=r.fim;
    d.recorrencia_fim_data=r.fim_data;d.recorrencia_fim_ocorrencias=r.fim_ocorrencias;
    d.lembrete_antecipado=r.lembrete;
    d.lembrete_custom=document.getElementById('mf-lembrete-custom')?document.getElementById('mf-lembrete-custom').value:'';
    d.prioridade=document.getElementById('mf-prior-val')?document.getElementById('mf-prior-val').value:'normal';
    var fornecedorInp=document.getElementById('mf-fornecedor-input');
    var fornecedorIdInp=document.getElementById('mf-fornecedor-id');
    d.fornecedor=fornecedorInp?fornecedorInp.value.trim():'';
    d.fornecedorId=fornecedorIdInp?fornecedorIdInp.value:'';
    if(!d.descricao||!d.valor||parseFloat(d.valor)<=0){
      function _fldErr(id, label){
        var e2=document.getElementById('mf-'+id);
        if(!e2)return;
        // Borda vermelha persistente
        e2.style.borderColor='var(--red)';
        e2.style.boxShadow='0 0 0 3px rgba(239,68,68,.35)';
        // Sacudida
        e2.classList.remove('_fldshake');
        void e2.offsetWidth;
        e2.classList.add('_fldshake');
        // Mensagem de erro abaixo do campo
        var errId='_mferr_'+id;
        var prev=document.getElementById(errId);if(prev)prev.remove();
        var msg=document.createElement('div');
        msg.id=errId;
        msg.style.cssText='color:#f87171;font-size:11px;font-weight:600;margin-top:5px;display:flex;align-items:center;gap:4px;';
        msg.innerHTML='<span style="font-size:14px;">⚠</span> '+label;
        e2.parentNode.appendChild(msg);
        // Remove ao digitar
        function _limpar(){
          e2.style.borderColor='';e2.style.boxShadow='';
          var em=document.getElementById(errId);if(em)em.remove();
          e2.removeEventListener('input',_limpar);e2.removeEventListener('change',_limpar);
        }
        e2.addEventListener('input',_limpar);
        e2.addEventListener('change',_limpar);
      }
      if(!d.descricao)_fldErr('descricao','Descrição é obrigatória');
      if(!d.valor||parseFloat(d.valor)<=0)_fldErr('valor','Informe um valor válido');
      showToast('Preencha os campos em vermelho','error');
      return;
    }

    // ── Lançamento em cartão de crédito com parcelamento ─────────────────────
    var _fAtual   = document.getElementById('mf-formaPgto') ? document.getElementById('mf-formaPgto').value : d.formaPgto;
    var _cardIdSel= document.getElementById('mf-cardId')    ? document.getElementById('mf-cardId').value    : '';
    if(_fAtual==='credito' && _cardIdSel && tipo==='pagar') {
      var _numParc  = Math.max(1, parseInt(document.getElementById('mf-numParcelas') ? document.getElementById('mf-numParcelas').value : '1')||1);
      var _fatInicio= document.getElementById('mf-faturaInicio') ? document.getElementById('mf-faturaInicio').value : today().slice(0,7);
      var _cardSel  = (state.cartoes||[]).find(function(c){return c.id===_cardIdSel;});
      var _diaVenc  = _cardSel ? (parseInt(_cardSel.diaVencimento)||10) : 10;
      var _grupoId  = uid();
      var _valParcela = Math.round((d.valor / _numParc)*100)/100;

      function _addMes(yyyymm, n){
        var p=yyyymm.split('-'); var y=parseInt(p[0]); var mo=parseInt(p[1])-1+n;
        y+=Math.floor(mo/12); mo=mo%12;
        return y+'-'+String(mo+1).padStart(2,'0');
      }

      var _novasCP=[], _novasTR=[];
      for(var _pi=0;_pi<_numParc;_pi++){
        var _mf=_addMes(_fatInicio,_pi);
        var _dv=_mf+'-'+String(_diaVenc).padStart(2,'0');
        var _sfx=_numParc>1?' ('+(_pi+1)+'/'+_numParc+')':'';
        _novasCP.push({
          id:'conta_'+Date.now()+'_p'+_pi,
          tipo:'pagar', descricao:d.descricao+_sfx,
          valor:_valParcela, categoria:d.categoria,
          vencimento:_dv, status:'pendente', pago:false,
          recorrente:false, notas:d.notas, profile:state.profile,
          formaPgto:'credito', cardId:_cardIdSel,
          parcela:(_pi+1)+'/'+_numParc, numParcelas:_numParc,
          grupoParcelamento:_grupoId,
        });
        _novasTR.push({
          id:'ctrans_'+Date.now()+'_p'+_pi,
          cardId:_cardIdSel, data:d.vencimento,
          descricao:d.descricao+_sfx,
          valor:_valParcela, categoria:d.categoria,
          parcela:(_pi+1)+'/'+_numParc, fatura:_mf,
          grupoParcelamento:_grupoId, profile:state.profile,
          importado:false,
        });
      }

      var _nc=(state.contas||[]).concat(_novasCP);
      var _ntc=(state.transacoesCartao||[]).concat(_novasTR);
      lsSet('contas',_nc); lsSet('transacoesCartao',_ntc);
      setState({contas:_nc, transacoesCartao:_ntc, modal:null});
      scheduleSave();
      showToast(_numParc>1 ? _numParc+'x de '+fmtMoney(_valParcela)+' em '+(_cardSel?_cardSel.nome:'cartão') : fmtMoney(d.valor)+' à vista em '+(_cardSel?_cardSel.nome:'cartão'));
      return;
    }

    var novasContas;
    var novosBancos=state.bancos;
    var statusPago=d.status==='pago'||d.status==='recebido';

    if(edit.id){
      var old=state.contas.find(function(x){return x.id===edit.id;});
      if(old&&(old.status==='pago'||old.status==='recebido')&&old.banco){
        novosBancos=novosBancos.map(function(b){
          return b.id===old.banco
            ?Object.assign({},b,{saldo:Math.round(((b.saldo||0)+(old.valor||0))*100)/100})
            :b;
        });
      }
      novasContas=state.contas.map(function(x){return x.id===d.id?d:x;});
    } else {
      novasContas=(state.contas||[]).concat([d]);
    }

    if(statusPago&&d.banco){
      novosBancos=novosBancos.map(function(b){
        if(b.id!==d.banco)return b;
        var delta=tipo==='pagar'?-(d.valor||0):(d.valor||0);
        return Object.assign({},b,{saldo:Math.round(((b.saldo||0)+delta)*100)/100});
      });
    }

    lsSet('contas',novasContas);
    lsSet('bancos',novosBancos);
    setState({contas:novasContas,bancos:novosBancos,modal:null});
    scheduleSave();
    showToast(edit.id?'Atualizado!':'Lançamento adicionado!');
  }

  function inp(id,type,ph,val){var i=el('input',{class:'form-input',type:type||'text',id:'mf-'+id,placeholder:ph||''});i.value=val!==undefined?String(val):'';return i;}
  function sel(id,opts,val){var s=el('select',{class:'form-input',id:'mf-'+id});opts.forEach(function(o){var op=el('option',{value:typeof o==='object'?o.v:o},typeof o==='object'?o.l:o);if((typeof o==='object'?o.v:o)===String(val))op.selected=true;s.appendChild(op);});return s;}

  var ck=el('input',{type:'checkbox',id:'mf-rec',style:{accentColor:'var(--gold)',width:'16px',height:'16px',cursor:'pointer',flexShrink:'0'}});
  ck.checked=vals.recorrente;
  ck.onchange=function(){
    var rf=document.getElementById('mf-rec-fields');
    if(rf)rf.style.display=this.checked?'block':'none';
    var lbl=document.getElementById('mf-rec-label');
    if(lbl)lbl.style.color=this.checked?'var(--gold)':'var(--text2)';
  };

  var recFields=el('div',{id:'mf-rec-fields',style:{display:vals.recorrente?'block':'none',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'14px',marginBottom:'14px'}},[
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Repetição'),sel('rec-tipo',[{v:'diario',l:'Diário'},{v:'semanal',l:'Semanal'},{v:'mensal',l:'Mensal'},{v:'anual',l:'Anual'},{v:'personalizado',l:'Personalizado...'}],vals.recorrencia_tipo)]),
      div('form-group',[el('label',{class:'form-label'},'A cada'),el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[el('input',{class:'form-input',type:'number',id:'mf-rec-intervalo',min:'1',style:{width:'70px'},value:String(vals.recorrencia_intervalo)}),el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'vez(es)')])]),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Terminar repetição'),sel('rec-fim',[{v:'nunca',l:'Nunca'},{v:'data',l:'Em data específica'},{v:'ocorrencias',l:'Após X ocorrências'}],vals.recorrencia_fim)]),
      div('form-group',[el('label',{class:'form-label'},'Data fim / Ocorrências'),el('div',{style:{display:'flex',gap:'6px'}},[el('input',{class:'form-input',type:'date',id:'mf-rec-fim-data',value:vals.recorrencia_fim_data,style:{flex:'1'}}),el('input',{class:'form-input',type:'number',id:'mf-rec-fim-oc',min:'1',value:String(vals.recorrencia_fim_ocorrencias),placeholder:'Qtd',style:{width:'70px'}})])]),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'🔔 Lembrete antecipado'),sel('rec-lembrete',[{v:'0',l:'Nenhum'},{v:'1',l:'1 dia antes'},{v:'3',l:'3 dias antes'},{v:'5',l:'5 dias antes'},{v:'7',l:'7 dias antes'},{v:'15',l:'15 dias antes'},{v:'30',l:'30 dias antes'},{v:'custom',l:'Personalizado...'}],vals.lembrete_antecipado)]),
      div('form-group',[el('label',{class:'form-label'},'Dias personalizados'),el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[el('input',{class:'form-input',type:'number',id:'mf-lembrete-custom',min:'1',placeholder:'Ex: 10',style:{flex:'1'},value:vals.lembrete_custom||''}),el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'dias antes')])]),
    ]),
  ]);

  var prioridades=[{v:'baixa',l:'⬇ Baixa',cor:'var(--blue)'},{v:'normal',l:'➡ Normal',cor:'var(--text2)'},{v:'alta',l:'⬆ Alta',cor:'var(--gold)'},{v:'urgente',l:'🔴 Urgente',cor:'var(--red)'}];
  var priorHidden=el('input',{type:'hidden',id:'mf-prior-val',value:vals.prioridade||'normal'});
  var priorBtns=prioridades.map(function(p){
    var isActive=(vals.prioridade||'normal')===p.v;
    var b=el('button',{type:'button',id:'mf-prior-'+p.v,style:{padding:'6px 14px',borderRadius:'20px',border:'1px solid '+(isActive?p.cor:'var(--border)'),background:isActive?p.cor+'22':'transparent',color:isActive?p.cor:'var(--text3)',fontSize:'12px',fontWeight:isActive?'700':'500',cursor:'pointer',transition:'all .15s'}},p.l);
    b.onclick=function(){
      prioridades.forEach(function(px){var b2=document.getElementById('mf-prior-'+px.v);if(b2){b2.style.border='1px solid var(--border)';b2.style.background='transparent';b2.style.color='var(--text3)';b2.style.fontWeight='500';}});
      b.style.border='1px solid '+p.cor;b.style.background=p.cor+'22';b.style.color=p.cor;b.style.fontWeight='700';
      document.getElementById('mf-prior-val').value=p.v;
    };
    return b;
  });

  // ── Formas de pagamento ───────────────────────────────────────────────────
  var FORMAS_PGTO=[
    {v:'',       l:'— Selecione a forma —'},
    {v:'dinheiro',l:'💵 Dinheiro'},
    {v:'pix',    l:'⚡ Pix'},
    {v:'credito',l:'💳 Cartão de Crédito'},
    {v:'debito', l:'💳 Cartão de Débito'},
    {v:'stone',  l:'🟢 Stone'},
    {v:'boleto', l:'📄 Boleto'},
    {v:'ted',    l:'🏦 TED / DOC'},
    {v:'debito_auto',l:'🔄 Débito Automático'},
    {v:'outros', l:'• Outros'},
  ];

  // ── Bancos disponíveis ───────────────────────────────────────────────────
  var bancoOpts=[{v:'',l:'— Nenhuma conta —'}].concat(
    (state.bancos||[]).map(function(b){
      return{v:b.id,l:b.nome+(b.saldo!=null?' ('+fmtMoney(b.saldo||0)+')':'')};
    })
  );

  // ── Cartões disponíveis ──────────────────────────────────────────────────
  var cartoesList=(state.cartoes||[]).filter(function(c){return !c.profile||c.profile===state.profile;});
  var cartaoOpts=[{v:'',l:'— Selecione o cartão —'}].concat(
    cartoesList.map(function(c){return{v:c.id,l:c.nome+(c.final?' ••••'+c.final:'')};})
  );
  var parcelasOpts=[];
  for(var _ni=1;_ni<=24;_ni++){parcelasOpts.push({v:String(_ni),l:_ni===1?'À vista (1x)':_ni+'x'});}

  var saldoPreview=el('div',{id:'mf-saldo-preview',style:{fontSize:'11px',marginTop:'5px',display:'none'}});

  function atualizarSaldoPreview(){
    var bancoId=document.getElementById('mf-banco')?document.getElementById('mf-banco').value:'';
    var valor=parseFloat(document.getElementById('mf-valor')?document.getElementById('mf-valor').value:0)||0;
    var status=document.getElementById('mf-status')?document.getElementById('mf-status').value:'';
    var el2=document.getElementById('mf-saldo-preview');
    if(!el2)return;
    var statusPago=status==='pago'||status==='recebido';
    if(bancoId&&valor>0&&statusPago){
      var banco=(state.bancos||[]).find(function(b){return b.id===bancoId;});
      if(banco){
        var delta=tipo==='pagar'?-valor:valor;
        var novo=Math.round(((banco.saldo||0)+delta)*100)/100;
        el2.style.display='block';
        el2.innerHTML='';
        el2.appendChild(el('span',{style:{color:'var(--text3)'}},'Saldo após: '));
        el2.appendChild(el('strong',{style:{color:novo<0?'var(--red)':'var(--green)'}},fmtMoney(novo)));
        if(novo<0)el2.appendChild(el('span',{style:{color:'var(--red)',marginLeft:'6px'}},'⚠️ Ficará negativo'));
      }
    } else {
      el2.style.display='none';
    }
  }

  function toggleCreditoSection(forma){
    var creditoDiv=document.getElementById('mf-credito-section');
    var bancoDiv  =document.getElementById('mf-banco-group');
    var isCredito = forma==='credito';
    if(creditoDiv) creditoDiv.style.display=isCredito&&tipo==='pagar'?'block':'none';
    if(bancoDiv)   bancoDiv.style.display=isCredito?'none':'block';
  }

  var formaPgtoSel=sel('formaPgto',FORMAS_PGTO,vals.formaPgto);
  formaPgtoSel.onchange=function(){
    atualizarSaldoPreview();
    toggleCreditoSection(this.value);
  };

  var bancoSel=el('select',{class:'form-input',id:'mf-banco',onchange:atualizarSaldoPreview});
  bancoOpts.forEach(function(o){
    var op=el('option',{value:o.v},o.l);
    if(o.v===String(vals.banco))op.selected=true;
    bancoSel.appendChild(op);
  });

  var statusSel=sel('status',tipo==='pagar'?['pendente','pago','vencido']:['previsto','recebido'],vals.status);
  statusSel.addEventListener('change',atualizarSaldoPreview);

  var valorInp=inp('valor','number','0,00',vals.valor);
  valorInp.addEventListener('input',atualizarSaldoPreview);

  // Seção de detalhes do cartão (só aparece quando forma = crédito + tipo = pagar)
  var isCreditoInicial = vals.formaPgto==='credito' && tipo==='pagar';
  var creditoSection=el('div',{id:'mf-credito-section',style:{
    display:isCreditoInicial?'block':'none',
    background:'rgba(201,168,76,.07)',border:'1px solid rgba(201,168,76,.35)',
    borderRadius:'var(--radius-sm)',padding:'14px',marginBottom:'14px',
  }},[
    el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--gold)',marginBottom:'12px'}},'💳 Dados do cartão'),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'Cartão de crédito'),
        sel('cardId',cartaoOpts,vals.cardId),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Parcelamento'),
        sel('numParcelas',parcelasOpts,String(vals.numParcelas||1)),
      ]),
    ]),
    div('form-group',[
      el('label',{class:'form-label'},'Mês da 1ª cobrança (fatura)'),
      el('input',{class:'form-input',type:'month',id:'mf-faturaInicio',value:vals.faturaInicio}),
    ]),
    el('p',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px',lineHeight:'1.5'}},
      'As parcelas serão lançadas automaticamente no financeiro e nas faturas do cartão correspondente.'),
  ]);

  var bancoGroup=el('div',{id:'mf-banco-group',style:{display:isCreditoInicial?'none':'block'}},[
    el('label',{class:'form-label'},tipo==='pagar'?'Conta de origem (banco)':'Conta de destino (banco)'),
    bancoSel,
    saldoPreview,
  ]);

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(edit.id?'Editar':'Novo')+(tipo==='pagar'?' lançamento — Despesas':' lançamento — A receber')),
      el('button',{class:'modal-close',onclick:function(){setState({modal:null});}},'×'),
    ]),
    div('form-group',[el('label',{class:'form-label',for:'mf-descricao'},'Descrição'),inp('descricao','text','Ex: Fornecedor de carnes',vals.descricao)]),
    div('form-group',[
      el('label',{class:'form-label'},tipo==='pagar'?'Fornecedor / Destinatário':'Cliente / Pagador'),
      buildFornecedorInput(vals.fornecedor,vals.fornecedorId),
      el('p',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Use ↑ ↓ para navegar · Tab para selecionar · Enter para criar novo'),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label',for:'mf-valor'},'Valor (R$)'),valorInp]),
      div('form-group',[el('label',{class:'form-label',for:'mf-vencimento'},tipo==='pagar'?'Data da compra':'Previsão'),inp('vencimento','date','',vals.vencimento)]),
    ]),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'Categoria'),
        el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
          sel('categoria',cats,vals.categoria),
          el('button',{type:'button',title:'Gerenciar categorias',style:{padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text3)',cursor:'pointer',flexShrink:'0',fontSize:'14px'},onclick:function(){setState({catManager:{key:catKey,tipo:tipo}});}}, '✏️'),
        ]),
      ]),
      div('form-group',[el('label',{class:'form-label',for:'mf-status'},'Status'),statusSel]),
    ]),

    // ── Forma de pagamento + Banco / Cartão ──────────────────────────────
    el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:'14px'}},[
      el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},tipo==='pagar'?'💳 Pagamento':'🏦 Recebimento'),
      div('form-row',[
        div('form-group',[
          el('label',{class:'form-label'},tipo==='pagar'?'Forma de pagamento':'Forma de recebimento'),
          formaPgtoSel,
        ]),
        bancoGroup,
      ]),
    ]),

    // Seção de cartão de crédito (visível quando forma=crédito)
    creditoSection,

    div('form-group',[
      el('label',{class:'form-label'},'🎯 Prioridade'),
      el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'6px'}},[...priorBtns,priorHidden]),
    ]),
    // ── Toggle de Recorrência ─────────────────────────────────────────────
    el('div',{style:{display:'flex',alignItems:'center',gap:'10px',margin:'18px 0 10px',padding:'10px 12px',background:'var(--bg3)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}},[
      el('label',{style:{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',flex:'1',userSelect:'none'}},[
        ck,
        el('div',{},[
          el('span',{id:'mf-rec-label',style:{fontSize:'12px',fontWeight:'700',color:vals.recorrente?'var(--gold)':'var(--text2)'}},'🔁 Ativar Recorrência'),
          el('span',{style:{fontSize:'11px',color:'var(--text3)',marginLeft:'8px'}},'— gera lançamentos automáticos'),
        ]),
      ]),
      el('button',{type:'button',style:{fontSize:'11px',color:'var(--gold)',background:'none',border:'1px solid var(--border)',borderRadius:'20px',cursor:'pointer',padding:'4px 10px',whiteSpace:'nowrap',flexShrink:'0'},
        onclick:function(){setState({modal:null});setTimeout(function(){setState({page:'recorrencias'});},60);},
      },'Ver recorrências →'),
    ]),
    recFields,
    div('form-group',[el('label',{class:'form-label',for:'mf-notas'},'Notas'),el('textarea',{class:'form-input',id:'mf-notas',rows:'2',placeholder:'Observações...',style:{resize:'vertical'}},vals.notas)]),
    div('modal-actions',[btn('btn-ghost','Cancelar',function(){setState({modal:null});}),btn('btn-primary',edit.id?'Salvar':'Adicionar',save)]),
  ]);

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({modal:null});};
  setTimeout(atualizarSaldoPreview,50);
  return ov;
}
