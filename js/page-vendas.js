// ── VENDAS DO DIA — exclusivo Artt Burger ────────────────────────────────────
function renderVendas(){
  if(state.profile!=='artt'){
    setState({page:'dashboard'});
    return div('');
  }

  var taxas=state.taxas||TAXAS_DEFAULT;
  var dataSel=state.vendasData||today();
  var vendaId='venda_'+dataSel;
  var atual=(state.vendas||[]).find(function(v){return v.id===vendaId;})||null;

  // Labels de data
  var ontem=new Date();ontem.setDate(ontem.getDate()-1);
  var ontemStr=ontem.toISOString().split('T')[0];
  var dObj=new Date(dataSel+'T12:00:00');
  var DIAS_SEMANA=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  var MESES_FULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var dateDisplay=DIAS_SEMANA[dObj.getDay()]+', '+dObj.getDate()+' de '+MESES_FULL[dObj.getMonth()]+' de '+dObj.getFullYear();
  var dateTag=dataSel===today()?'HOJE':dataSel===ontemStr?'ONTEM':'';

  function navDate(delta){
    var d=new Date(dataSel+'T12:00:00');d.setDate(d.getDate()+delta);
    setState({vendasData:d.toISOString().split('T')[0]});
  }

  // Canais de apps e formas de pagamento PDV
  var APPS=[
    {key:'ifood',   label:'iFood',           cor:'#27ae60'},
    {key:'rappi',   label:'Rappi',            cor:'#ff6b00'},
    {key:'food99',  label:'99Food',           cor:'#f1c40f'},
    {key:'delivery',label:'Delivery Próprio', cor:'#3a8fd4'},
  ];
  var PAGS=[
    {key:'dinheiro',label:'Dinheiro',         icon:'💵'},
    {key:'pix',     label:'Pix',              icon:'⚡'},
    {key:'debito',  label:'Cartão Débito',    icon:'💳'},
    {key:'credito', label:'Cartão Crédito',   icon:'💳'},
    {key:'vale',    label:'Vale Alimentação', icon:'🎫'},
    {key:'outros',  label:'Outros',           icon:'📦'},
  ];

  function calcLiq(bruto,taxa){return Math.max(0,Math.round(bruto*(1-(taxa||0)/100)*100)/100);}

  // Lê valor salvo do lançamento atual
  function getValApp(k){return atual&&atual.apps?atual.apps[k]||0:0;}
  function getValPdv(k){return atual&&atual.pdv?atual.pdv[k]||0:0;}

  // Soma totais de todos os inputs para atualizar o resumo no DOM
  function updateTotals(){
    var tBruto=0,tTaxas=0;
    APPS.forEach(function(a){
      var inp=document.getElementById('inp_app_'+a.key);
      var b=inp?parseFloat(inp.value)||0:0;
      tBruto+=b; tTaxas+=b*(taxas[a.key]||0)/100;
    });
    PAGS.forEach(function(p){
      var inp=document.getElementById('inp_pdv_'+p.key);
      var b=inp?parseFloat(inp.value)||0:0;
      tBruto+=b; tTaxas+=b*(taxas[p.key]||0)/100;
    });
    var tLiq=tBruto-tTaxas;
    var eB=document.getElementById('tot_bruto');
    var eT=document.getElementById('tot_taxas');
    var eL=document.getElementById('tot_liq');
    if(eB)eB.textContent=fmtMoney(tBruto);
    if(eT)eT.textContent=fmtMoney(tTaxas);
    if(eL)eL.textContent=fmtMoney(tLiq);
  }

  // Monta uma linha de input com cálculo de líquido ao vivo
  function inputRow(id,label,taxaKey,corDot,icon,brutoVal){
    var taxa=taxas[taxaKey]||0;
    var liqId='liq_'+id;

    var liqEl=el('span',{id:liqId,style:{fontSize:'13px',fontWeight:'700',color:'var(--green)',minWidth:'90px',textAlign:'right'}},
      fmtMoney(calcLiq(brutoVal,taxa))
    );

    var inp=el('input',{type:'number',class:'form-input',id:'inp_'+id,min:'0',step:'0.01',placeholder:'0,00',
      style:{width:'110px',fontSize:'13px',padding:'6px 10px',textAlign:'right'},
      oninput:function(e){
        var b=parseFloat(e.target.value)||0;
        var lEl=document.getElementById(liqId);
        if(lEl)lEl.textContent=fmtMoney(calcLiq(b,taxa));
        updateTotals();
      }
    });
    if(brutoVal)inp.value=String(brutoVal);

    var badge=el('span',{style:{fontSize:'10px',fontWeight:'700',color:'var(--text3)',background:'var(--bg3)',padding:'2px 6px',borderRadius:'10px',flexShrink:'0'}},taxa+'%');

    var iconEl=icon
      ? el('span',{style:{fontSize:'15px',width:'22px',textAlign:'center',flexShrink:'0'}},icon)
      : el('div',{style:{width:'9px',height:'9px',borderRadius:'50%',background:corDot,flexShrink:'0'}});

    return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'9px 0',borderBottom:'1px solid var(--border)'}},[
      iconEl,
      el('span',{style:{flex:'1',fontSize:'13px',color:'var(--text2)'}},label),
      badge,
      inp,
      liqEl,
    ]);
  }

  // ── COLUNAS DE ENTRADA ─────────────────────────────────────────────────────
  var colHeader=el('div',{style:{display:'flex',justifyContent:'flex-end',gap:'6px',marginBottom:'10px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)'}},[
    el('span',{style:{width:'40px',textAlign:'center'}},'Taxa'),
    el('span',{style:{width:'110px',textAlign:'right'}},'Bruto (R$)'),
    el('span',{style:{width:'90px',textAlign:'right'}},'Líquido'),
  ]);

  var colApps=div('card',[
    div('card-title','Apps de Entrega'),
    colHeader.cloneNode(true),
    ...APPS.map(function(a){return inputRow('app_'+a.key,a.label,a.key,a.cor,null,getValApp(a.key));}),
  ]);

  var colPdv=div('card',[
    div('card-title','PDV — Formas de Pagamento'),
    colHeader.cloneNode(true),
    ...PAGS.map(function(p){return inputRow('pdv_'+p.key,p.label,p.key,null,p.icon,getValPdv(p.key));}),
  ]);

  // ── RESUMO ─────────────────────────────────────────────────────────────────
  var resumo=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}},[
    el('div',{class:'kpi-card'},[
      el('div',{class:'kpi-label'},'Total Bruto'),
      el('div',{class:'kpi-value',id:'tot_bruto'},fmtMoney(0)),
      el('div',{class:'kpi-sub'},'Antes das taxas'),
    ]),
    el('div',{class:'kpi-card red'},[
      el('div',{class:'kpi-label'},'Total Taxas'),
      el('div',{class:'kpi-value red',id:'tot_taxas'},fmtMoney(0)),
      el('div',{class:'kpi-sub'},'Descontado pelos canais'),
    ]),
    el('div',{class:'kpi-card green'},[
      el('div',{class:'kpi-label'},'Total Líquido'),
      el('div',{class:'kpi-value green',id:'tot_liq'},fmtMoney(0)),
      el('div',{class:'kpi-sub'},'O que entra no caixa'),
    ]),
  ]);

  // ── CONFIGURAÇÃO DE TAXAS ──────────────────────────────────────────────────
  function taxRow(key,label){
    var inp=el('input',{type:'number',class:'form-input',id:'taxacfg_'+key,min:'0',max:'100',step:'0.01',
      style:{width:'72px',fontSize:'12px',padding:'5px 8px',textAlign:'right'}});
    inp.value=String(taxas[key]||0);
    return el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'6px 0',borderBottom:'1px solid var(--border)'}},[
      el('span',{style:{flex:'1',fontSize:'12px',color:'var(--text2)'}},label),
      inp,
      el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'%'),
    ]);
  }

  function salvarTaxas(){
    var novas={};
    APPS.forEach(function(a){var i=document.getElementById('taxacfg_'+a.key);novas[a.key]=i?parseFloat(i.value)||0:taxas[a.key]||0;});
    PAGS.forEach(function(p){var i=document.getElementById('taxacfg_'+p.key);novas[p.key]=i?parseFloat(i.value)||0:taxas[p.key]||0;});
    lsSet('taxas',novas);
    setState({taxas:novas});
    showToast('Taxas salvas! Reabra o lançamento para recalcular.');
  }

  var taxPanel=div('card',{marginBottom:'14px'},[
    div('card-title','⚙ Configurar taxas por canal'),
    el('p',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'14px',lineHeight:'1.6'}},'As taxas são usadas para calcular o valor líquido que entra no seu caixa. Altere conforme os contratos vigentes.'),
    el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}},[
      el('div',{},[
        el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'8px',paddingBottom:'6px',borderBottom:'2px solid var(--gold)'}},'Apps de Entrega'),
        ...APPS.map(function(a){return taxRow(a.key,a.label);}),
      ]),
      el('div',{},[
        el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'8px',paddingBottom:'6px',borderBottom:'2px solid var(--gold)'}},'PDV — Formas de Pagamento'),
        ...PAGS.map(function(p){return taxRow(p.key,p.label);}),
      ]),
    ]),
    el('div',{style:{marginTop:'14px',display:'flex',justifyContent:'flex-end'}},[
      btn('btn-primary','💾 Salvar taxas',salvarTaxas),
    ]),
  ]);
  taxPanel.style.display='none';
  taxPanel.id='tax-panel';

  function toggleTaxas(){
    var p=document.getElementById('tax-panel');
    if(p)p.style.display=p.style.display==='none'?'block':'none';
  }

  // ── SALVAR LANÇAMENTO ──────────────────────────────────────────────────────
  function salvarVendaDia(){
    var apps={};
    APPS.forEach(function(a){var i=document.getElementById('inp_app_'+a.key);apps[a.key]=i?parseFloat(i.value)||0:0;});
    var pdv={};
    PAGS.forEach(function(p){var i=document.getElementById('inp_pdv_'+p.key);pdv[p.key]=i?parseFloat(i.value)||0:0;});
    var obs=document.getElementById('venda_obs')?document.getElementById('venda_obs').value:'';
    var tBruto=Object.values(apps).concat(Object.values(pdv)).reduce(function(s,v){return s+v;},0);
    if(tBruto===0){showToast('Informe ao menos um valor','error');return;}
    saveVenda({id:vendaId,data:dataSel,profile:'artt',apps:apps,pdv:pdv,obs:obs});
  }

  var obsInp=el('textarea',{class:'form-input',id:'venda_obs',rows:'2',placeholder:'Observações do dia: eventos, promoções, ocorrências...',style:{resize:'vertical',width:'100%'}});
  if(atual&&atual.obs)obsInp.value=atual.obs;

  var saveBar=el('div',{style:{display:'flex',gap:'10px',alignItems:'flex-end',marginBottom:'14px'}},[
    el('div',{style:{flex:'1'}},[
      el('label',{class:'form-label'},'Observações (opcional)'),
      obsInp,
    ]),
    el('div',{style:{display:'flex',gap:'8px',flexShrink:'0'}},[
      atual?btn('btn-ghost','🗑 Excluir',function(){
        if(window.confirm('Excluir lançamento de '+fmtDate(dataSel)+'? As receitas geradas serão removidas.')){deleteVenda(vendaId);}
      }):null,
      btn('btn-primary',atual?'✓ Atualizar':'✓ Salvar lançamento',salvarVendaDia),
    ].filter(Boolean)),
  ]);

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────
  var historico=(state.vendas||[])
    .filter(function(v){return v.profile==='artt';})
    .sort(function(a,b){return b.data.localeCompare(a.data);})
    .slice(0,45);

  function calcTotaisVenda(v){
    var tBruto=0,tTaxas=0;
    Object.keys(v.apps||{}).forEach(function(k){var b=v.apps[k]||0;tBruto+=b;tTaxas+=b*(taxas[k]||0)/100;});
    Object.keys(v.pdv||{}).forEach(function(k){var b=v.pdv[k]||0;tBruto+=b;tTaxas+=b*(taxas[k]||0)/100;});
    return{bruto:tBruto,taxas:tTaxas,liq:tBruto-tTaxas};
  }

  var histRows=historico.map(function(v){
    var t=calcTotaisVenda(v);
    var isAtivo=v.data===dataSel;
    var appsList=Object.keys(v.apps||{}).filter(function(k){return v.apps[k]>0;})
      .map(function(k){return{ifood:'iFood',rappi:'Rappi',food99:'99F',delivery:'Del.'}[k]||k;}).join(' · ')||'—';
    var pdvList=Object.keys(v.pdv||{}).filter(function(k){return v.pdv[k]>0;})
      .map(function(k){return{dinheiro:'Din',pix:'Pix',debito:'Déb',credito:'Créd',vale:'Vale',outros:'Out'}[k]||k;}).join(' · ')||'—';
    return el('tr',{
      style:{background:isAtivo?'var(--gold-dim)':'',cursor:'pointer',transition:'background .1s'},
      onmouseenter:function(e){if(!isAtivo)e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){if(!isAtivo)e.currentTarget.style.background='';},
      onclick:function(){setState({vendasData:v.data});}
    },[
      el('td',{style:{padding:'8px 10px',fontSize:'12px',fontWeight:isAtivo?'700':'400'}},[
        fmtDate(v.data),
        v.data===today()?el('span',{style:{marginLeft:'6px',fontSize:'10px',color:'var(--blue)'}},'● hoje'):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'8px 10px',fontSize:'11px',color:'var(--text3)'}},appsList),
      el('td',{style:{padding:'8px 10px',fontSize:'11px',color:'var(--text3)'}},pdvList),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',textAlign:'right'}},fmtMoney(t.bruto)),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',textAlign:'right',color:'var(--red)'}},t.taxas>0?'-'+fmtMoney(t.taxas):'—'),
      el('td',{style:{padding:'8px 10px',fontSize:'13px',fontWeight:'700',textAlign:'right',color:'var(--green)'}},fmtMoney(t.liq)),
    ]);
  });

  var histCard=div('card',[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}},[
      div('card-title','Histórico de lançamentos'),
      el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Clique em um dia para carregá-lo'),
    ]),
    historico.length===0
      ? div('empty',[div('empty-icon','📋'),div('empty-title','Nenhum lançamento ainda'),el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Faça o primeiro lançamento acima')])
      : el('div',{style:{overflowX:'auto'}},[
          el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
            el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
              el('th',{style:{padding:'6px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Data'),
              el('th',{style:{padding:'6px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Apps'),
              el('th',{style:{padding:'6px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'PDV'),
              el('th',{style:{padding:'6px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Bruto'),
              el('th',{style:{padding:'6px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Taxas'),
              el('th',{style:{padding:'6px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Líquido'),
            ])]),
            el('tbody',{},histRows),
          ]),
        ]),
  ]);

  // Inicializa totais após render
  setTimeout(updateTotals,50);

  return div('',[
    div('page-header',[
      el('h1',{},'🛒 Vendas do Dia'),
      el('p',{},'Lançamento diário · valores brutos e líquidos após taxas · exclusivo Artt Burger'),
    ]),

    // Navegação de data
    el('div',{style:{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'10px 16px'}},[
      btn('btn-ghost','←',function(){navDate(-1);}),
      el('div',{style:{flex:'1',textAlign:'center'}},[
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:'var(--text)'}},dateDisplay),
        el('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginTop:'4px'}},[
          dateTag?el('span',{style:{fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'1px',color:'var(--gold)',background:'var(--gold-dim)',padding:'2px 8px',borderRadius:'10px'}},dateTag):null,
          atual
            ?el('span',{style:{fontSize:'11px',color:'var(--green)'}},'✓ Lançamento salvo')
            :el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Sem lançamento'),
        ].filter(Boolean)),
      ]),
      btn('btn-ghost','→',function(){navDate(1);}),
      el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'6px 12px',color:'var(--text3)'},onclick:toggleTaxas},'⚙ Taxas'),
    ]),

    taxPanel,
    resumo,

    el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}},[colApps,colPdv]),
    saveBar,
    histCard,
  ]);
}
