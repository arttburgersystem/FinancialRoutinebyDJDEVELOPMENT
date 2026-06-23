// ── VENDAS DO DIA — exclusivo Artt Burger ────────────────────────────────────
var _vcalYear=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'})).getFullYear();
var _vcalMonth=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'})).getMonth();

function renderVendas(){
  if(state.profile!=='artt'){
    setState({page:'dashboard'});
    return div('');
  }

  var taxas=state.taxas||TAXAS_DEFAULT;
  var dataSel=state.vendasData||today();
  var vendaId='venda_'+dataSel;
  var atual=(state.vendas||[]).find(function(v){return v.id===vendaId;})||null;

  var ontem=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  ontem.setDate(ontem.getDate()-1);
  var ontemStr=ontem.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  var dObj=new Date(dataSel+'T12:00:00');
  var DIAS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  var MESES_FULL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var DIAS_CURTOS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var dateDisplay=DIAS[dObj.getDay()]+', '+dObj.getDate()+' de '+MESES_FULL[dObj.getMonth()]+' de '+dObj.getFullYear();
  var dateTag=dataSel===today()?'HOJE':dataSel===ontemStr?'ONTEM':'';

  var todasVendas=(state.vendas||[]).filter(function(v){return v.profile==='artt';});
  var datasComVenda={};
  todasVendas.forEach(function(v){datasComVenda[v.data]=true;});

  function navDate(delta){
    var d=new Date(dataSel+'T12:00:00');
    d.setDate(d.getDate()+delta);
    setState({vendasData:d.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})});
  }

  function irParaData(dateStr){
    setState({vendasData:dateStr});
    fecharPopups();
  }

  function fecharPopups(){
    ['cal-popup','calc-popup'].forEach(function(id){
      var e=document.getElementById(id);if(e)e.remove();
    });
    document.removeEventListener('click',_closeOnOutside);
  }

  var _closeOnOutside=function(e){
    var cal=document.getElementById('cal-popup');
    var calc=document.getElementById('calc-popup');
    if(cal&&!cal.contains(e.target)&&!e.target.closest('#btn-cal-open'))cal.remove();
    if(calc&&!calc.contains(e.target)&&!e.target.closest('#btn-calc-open'))calc.remove();
  };

  // ── CALENDÁRIO POPUP ──────────────────────────────────────────────────────
  function abrirCalendario(){
    var exist=document.getElementById('cal-popup');
    if(exist){exist.remove();return;}
    var d=new Date(dataSel+'T12:00:00');
    var viewY=d.getFullYear(),viewM=d.getMonth();

    function buildCal(){
      var popup=document.getElementById('cal-popup');
      if(!popup)return;
      popup.innerHTML='';

      var header=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}},[
        el('button',{style:{background:'none',border:'none',color:'var(--text)',cursor:'pointer',fontSize:'16px',padding:'2px 8px'},
          onclick:function(){viewM--;if(viewM<0){viewM=11;viewY--;}buildCal();}
        },'‹'),
        el('span',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)'}},MESES_FULL[viewM]+' '+viewY),
        el('button',{style:{background:'none',border:'none',color:'var(--text)',cursor:'pointer',fontSize:'16px',padding:'2px 8px'},
          onclick:function(){viewM++;if(viewM>11){viewM=0;viewY++;}buildCal();}
        },'›'),
      ]);

      var diasHead=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'4px'}},
        DIAS_CURTOS.map(function(d){return el('div',{style:{textAlign:'center',fontSize:'10px',fontWeight:'700',color:'var(--text3)',padding:'3px 0'}},d);}));

      var firstDay=new Date(viewY,viewM,1).getDay();
      var daysInMonth=new Date(viewY,viewM+1,0).getDate();
      var cells=[];
      for(var i=0;i<firstDay;i++)cells.push(el('div',{}));
      for(var d2=1;d2<=daysInMonth;d2++){
        (function(day){
          var dateStr=viewY+'-'+String(viewM+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
          var isSel=dateStr===dataSel;
          var isToday=dateStr===today();
          var temVenda=datasComVenda[dateStr];
          var cell=el('div',{
            style:{
              textAlign:'center',padding:'5px 2px',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontWeight:'500',
              background:isSel?'var(--gold)':isToday?'var(--bg3)':'transparent',
              color:isSel?'#000':isToday?'var(--gold)':'var(--text)',
              border:isToday&&!isSel?'1px solid var(--gold)':'1px solid transparent',
              position:'relative',
            },
            onclick:function(){irParaData(dateStr);}
          },String(day));
          if(temVenda&&!isSel){
            var dot=el('div',{style:{width:'4px',height:'4px',borderRadius:'50%',background:'var(--green)',position:'absolute',bottom:'2px',left:'50%',transform:'translateX(-50%)'}});
            cell.style.position='relative';
            cell.appendChild(dot);
          }
          cells.push(cell);
        })(d2);
      }

      var grid=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px'}},cells);
      var legend=el('div',{style:{display:'flex',gap:'12px',marginTop:'10px',paddingTop:'8px',borderTop:'1px solid var(--border)',fontSize:'10px',color:'var(--text3)'}},[
        el('div',{style:{display:'flex',alignItems:'center',gap:'4px'}},[el('div',{style:{width:'6px',height:'6px',borderRadius:'50%',background:'var(--green)'}}),el('span',{},'Com lançamento')]),
        el('div',{style:{display:'flex',alignItems:'center',gap:'4px'}},[el('div',{style:{width:'12px',height:'12px',borderRadius:'3px',background:'var(--gold)'}}),el('span',{},'Selecionado')]),
      ]);

      popup.appendChild(header);
      popup.appendChild(diasHead);
      popup.appendChild(grid);
      popup.appendChild(legend);
    }

    var popup=el('div',{id:'cal-popup',style:{
      position:'fixed',zIndex:'9000',
      background:'var(--bg2)',border:'1px solid var(--border2)',
      borderRadius:'var(--radius)',padding:'14px',
      boxShadow:'0 8px 32px rgba(0,0,0,.4)',width:'260px',
    }});
    document.body.appendChild(popup);

    var btn=document.getElementById('btn-cal-open');
    if(btn){
      var rect=btn.getBoundingClientRect();
      popup.style.top=(rect.bottom+6)+'px';
      popup.style.left=Math.min(rect.left,window.innerWidth-270)+'px';
    }

    buildCal();
    setTimeout(function(){document.addEventListener('click',_closeOnOutside);},50);
  }

  // ── CALCULADORA POPUP ─────────────────────────────────────────────────────
  function abrirCalculadora(){
    var exist=document.getElementById('calc-popup');
    if(exist){exist.remove();return;}

    var display='0';
    var expr='';
    var dispEl;

    function updDisp(){if(dispEl)dispEl.textContent=display;}

    function pressCalc(k){
      if(k==='C'){display='0';expr='';updDisp();return;}
      if(k==='⌫'){
        expr=expr.slice(0,-1)||'';
        try{display=expr?String(eval(expr.replace(/×/g,'*').replace(/÷/g,'/'))):'0';}catch(e){display=expr||'0';}
        updDisp();return;
      }
      if(k==='='){
        try{
          var r=eval(expr.replace(/×/g,'*').replace(/÷/g,'/'));
          display=String(Math.round(r*100)/100);
          expr=display;
        }catch(e){display='Erro';expr='';}
        updDisp();return;
      }
      if(k==='📋'){
        navigator.clipboard.writeText(display).then(function(){showToast('Copiado: '+display);});
        return;
      }
      expr+=k;
      try{
        var val=eval(expr.replace(/×/g,'*').replace(/÷/g,'/'));
        if(!isNaN(val))display=String(Math.round(val*100)/100);
      }catch(e){}
      updDisp();
    }

    dispEl=el('div',{style:{
      background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'10px 14px',
      fontSize:'22px',fontWeight:'700',color:'var(--text)',textAlign:'right',
      marginBottom:'10px',minHeight:'44px',overflow:'hidden',fontFamily:'monospace',
    }},'0');

    var keys=[
      ['C','⌫','%','÷'],
      ['7','8','9','×'],
      ['4','5','6','-'],
      ['1','2','3','+'],
      ['📋','0','.','='],
    ];

    var keypad=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px'}},
      keys.map(function(row){return row.map(function(k){
        var isOp=['÷','×','-','+','='].includes(k);
        var isSpec=['C','⌫','%','📋'].includes(k);
        var b=el('button',{style:{
          padding:'12px 0',borderRadius:'var(--radius-sm)',fontSize:'14px',fontWeight:'600',
          background:k==='='?'var(--gold)':isOp?'var(--bg4)':isSpec?'var(--bg3)':'var(--bg3)',
          color:k==='='?'#000':isOp?'var(--gold)':'var(--text)',
          border:'1px solid var(--border)',cursor:'pointer',
        },onclick:function(){pressCalc(k);}},k);
        return b;
      });}).flat()
    );

    function onCalcKey(e){
      var map={'Enter':'=','Backspace':'⌫','Escape':'C','*':'×','/':'÷'};
      var k=map[e.key]||e.key;
      if('0123456789.+-×÷C=⌫%'.includes(k))pressCalc(k);
    }
    document.addEventListener('keydown',onCalcKey);

    var popup=el('div',{id:'calc-popup',style:{
      position:'fixed',zIndex:'9000',
      background:'var(--bg2)',border:'1px solid var(--border2)',
      borderRadius:'var(--radius)',padding:'14px',
      boxShadow:'0 8px 32px rgba(0,0,0,.4)',width:'220px',
    }},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}},[
        el('span',{style:{fontSize:'12px',fontWeight:'700',color:'var(--text3)'}},'Calculadora'),
        el('button',{style:{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'16px'},
          onclick:function(){popup.remove();document.removeEventListener('keydown',onCalcKey);}
        },'×'),
      ]),
      dispEl,
      keypad,
    ]);

    document.body.appendChild(popup);
    var btn=document.getElementById('btn-calc-open');
    if(btn){
      var rect=btn.getBoundingClientRect();
      popup.style.top=(rect.bottom+6)+'px';
      popup.style.left=Math.max(4,rect.right-220)+'px';
    }
    setTimeout(function(){document.addEventListener('click',_closeOnOutside);},50);
  }

  // ── FORMAS DE PAGAMENTO ───────────────────────────────────────────────────
  var PAGS=[
    {key:'dinheiro',     label:'Dinheiro',               icon:'💵'},
    {key:'pix',          label:'Pix',                    icon:'⚡'},
    {key:'credito',      label:'Cartão Crédito',         icon:'💳'},
    {key:'debito',       label:'Cartão Débito',          icon:'💳'},
    {key:'notinha',      label:'Notinha Funcionários',   icon:'🧾'},
    {key:'ifood_online', label:'Pagamento Online iFood', icon:'🟢'},
    {key:'yooga',        label:'Pagamento Online Yooga', icon:'🟣'},
  ];

  function calcLiq(bruto,taxa){return Math.max(0,Math.round(bruto*(1-(taxa||0)/100)*100)/100);}
  function getVal(k){return atual&&atual.pdv?atual.pdv[k]||0:0;}

  function updateTotals(){
    var tBruto=0,tTaxas=0;
    PAGS.forEach(function(p){
      var inp=document.getElementById('inp_'+p.key);
      var b=inp?parseFloat(inp.value)||0:0;
      tBruto+=b; tTaxas+=b*(taxas[p.key]||0)/100;
    });
    var eB=document.getElementById('tot_bruto');
    var eT=document.getElementById('tot_taxas');
    var eL=document.getElementById('tot_liq');
    if(eB)eB.textContent=fmtMoney(tBruto);
    if(eT)eT.textContent=fmtMoney(tTaxas);
    if(eL)eL.textContent=fmtMoney(tBruto-tTaxas);
  }

  function inputRow(p){
    var taxa=taxas[p.key]||0;
    var brutoVal=getVal(p.key);
    var liqId='liq_'+p.key;
    var liqEl=el('span',{id:liqId,style:{fontSize:'13px',fontWeight:'700',color:'var(--green)',minWidth:'100px',textAlign:'right',flexShrink:'0'}},
      fmtMoney(calcLiq(brutoVal,taxa)));
    var inp=el('input',{type:'number',class:'form-input',id:'inp_'+p.key,min:'0',step:'0.01',placeholder:'0,00',
      style:{width:'120px',fontSize:'13px',padding:'7px 10px',textAlign:'right'},
      oninput:function(e){
        var b=parseFloat(e.target.value)||0;
        var lEl=document.getElementById(liqId);
        if(lEl)lEl.textContent=fmtMoney(calcLiq(b,taxa));
        updateTotals();
      }
    });
    if(brutoVal)inp.value=String(brutoVal);
    var badge=el('span',{style:{fontSize:'10px',fontWeight:'700',color:taxa>0?'var(--gold)':'var(--text3)',background:'var(--bg3)',padding:'2px 7px',borderRadius:'10px',flexShrink:'0',minWidth:'36px',textAlign:'center'}},taxa+'%');
    return el('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid var(--border)'}},[
      el('span',{style:{fontSize:'16px',width:'24px',textAlign:'center',flexShrink:'0'}},p.icon),
      el('span',{style:{flex:'1',fontSize:'13px',color:'var(--text2)',fontWeight:'500'}},p.label),
      badge,inp,liqEl,
    ]);
  }

  var colHeader=el('div',{style:{display:'flex',justifyContent:'flex-end',gap:'12px',marginBottom:'6px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)'}},[
    el('span',{style:{minWidth:'36px',textAlign:'center'}},'Taxa'),
    el('span',{style:{width:'120px',textAlign:'right'}},'Valor bruto'),
    el('span',{style:{width:'100px',textAlign:'right'}},'Líquido'),
  ]);

  var editBanner=atual?el('div',{style:{display:'flex',alignItems:'center',gap:'10px',background:'var(--gold-dim)',border:'1px solid var(--gold)',borderRadius:'var(--radius-sm)',padding:'8px 14px',marginBottom:'12px'}},[
    el('span',{style:{fontSize:'14px'}},'✏️'),
    el('div',{},[
      el('div',{style:{fontSize:'12px',fontWeight:'700',color:'var(--gold)'}},'Modo edição — '+fmtDate(dataSel)),
      el('div',{style:{fontSize:'11px',color:'var(--text2)'}},'Corrija os valores e clique em "Atualizar lançamento" para salvar.'),
    ]),
  ]):null;

  // Ícone calculadora no cabeçalho do card
  var calcIconBtn=el('button',{
    id:'btn-calc-open',
    title:'Calculadora rápida',
    style:{background:'none',border:'none',cursor:'pointer',fontSize:'18px',padding:'2px 6px',opacity:'0.7',lineHeight:'1'},
    onclick:function(e){e.stopPropagation();abrirCalculadora();}
  },'🧮');

  var formCard=div('card',[
    editBanner,
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}},[
      div('card-title','PDV — Formas de Pagamento'),
      el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[
        el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Bruto → taxa → líquido'),
        calcIconBtn,
      ]),
    ]),
    colHeader,
    ...PAGS.map(inputRow),
  ].filter(Boolean));
  formCard.id='vendas-form-card';

  // ── RESUMO ────────────────────────────────────────────────────────────────
  var resumo=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'14px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total Bruto'),el('div',{class:'kpi-value',id:'tot_bruto'},fmtMoney(0)),el('div',{class:'kpi-sub'},'Antes das taxas')]),
    el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Total Taxas'),el('div',{class:'kpi-value red',id:'tot_taxas'},fmtMoney(0)),el('div',{class:'kpi-sub'},'Descontado')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Total Líquido'),el('div',{class:'kpi-value green',id:'tot_liq'},fmtMoney(0)),el('div',{class:'kpi-sub'},'Entra no caixa')]),
  ]);

  // ── CONFIG TAXAS ──────────────────────────────────────────────────────────
  function taxRow(p){
    var inp=el('input',{type:'number',class:'form-input',id:'taxacfg_'+p.key,min:'0',max:'100',step:'0.01',style:{width:'72px',fontSize:'12px',padding:'5px 8px',textAlign:'right'}});
    inp.value=String(taxas[p.key]||0);
    return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:'1px solid var(--border)'}},[
      el('span',{style:{fontSize:'14px',width:'20px',textAlign:'center'}},p.icon),
      el('span',{style:{flex:'1',fontSize:'12px',color:'var(--text2)'}},p.label),
      inp,
      el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'%'),
    ]);
  }
  function salvarTaxas(){
    var novas={};
    PAGS.forEach(function(p){var i=document.getElementById('taxacfg_'+p.key);novas[p.key]=i?parseFloat(i.value)||0:taxas[p.key]||0;});
    lsSet('taxas',novas);setState({taxas:novas});showToast('Taxas salvas!');
  }
  var taxPanel=div('card',[
    div('card-title','⚙ Configurar taxas por forma de pagamento'),
    el('p',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'14px',lineHeight:'1.6'}},'Configure a taxa de cada forma. O valor líquido é calculado automaticamente.'),
    ...PAGS.map(taxRow),
    el('div',{style:{marginTop:'14px',display:'flex',justifyContent:'flex-end'}},[btn('btn-primary','💾 Salvar taxas',salvarTaxas)]),
  ]);
  taxPanel.id='tax-panel';taxPanel.style.display='none';taxPanel.style.marginBottom='14px';
  function toggleTaxas(){var p=document.getElementById('tax-panel');if(p)p.style.display=p.style.display==='none'?'block':'none';}

  // ── SALVAR ────────────────────────────────────────────────────────────────
  function salvarVendaDia(){
    var pdv={};
    PAGS.forEach(function(p){var i=document.getElementById('inp_'+p.key);pdv[p.key]=i?parseFloat(i.value)||0:0;});
    if(Object.values(pdv).reduce(function(s,v){return s+v;},0)===0){showToast('Informe ao menos um valor','error');return;}
    var obs=document.getElementById('venda_obs')?document.getElementById('venda_obs').value:'';
    saveVenda({id:vendaId,data:dataSel,profile:'artt',pdv:pdv,obs:obs});
  }
  var obsInp=el('textarea',{class:'form-input',id:'venda_obs',rows:'2',placeholder:'Observações: promoções, eventos, ocorrências do dia...',style:{resize:'vertical',width:'100%'}});
  if(atual&&atual.obs)obsInp.value=atual.obs;
  var saveBar=el('div',{style:{display:'flex',gap:'12px',alignItems:'flex-end',marginBottom:'14px'}},[
    el('div',{style:{flex:'1'}},[el('label',{class:'form-label',style:{marginBottom:'6px'}},'Observações (opcional)'),obsInp]),
    el('div',{style:{display:'flex',gap:'8px',flexShrink:'0'}},[
      atual?btn('btn-ghost','🗑 Excluir',function(){if(window.confirm('Excluir lançamento de '+fmtDate(dataSel)+'?')){deleteVenda(vendaId);}}):null,
      btn('btn-primary',atual?'✓ Atualizar lançamento':'✓ Salvar lançamento',salvarVendaDia),
    ].filter(Boolean)),
  ]);

  // ── HISTÓRICO ─────────────────────────────────────────────────────────────
  var historico=todasVendas.sort(function(a,b){return b.data.localeCompare(a.data);}).slice(0,45);
  function calcTotais(v){var tB=0,tT=0;Object.keys(v.pdv||{}).forEach(function(k){var b=v.pdv[k]||0;tB+=b;tT+=b*(taxas[k]||0)/100;});return{bruto:tB,taxas:tT,liq:tB-tT};}
  var LABEL_SHORT={dinheiro:'Din',pix:'Pix',credito:'Créd',debito:'Déb',notinha:'Not',ifood_online:'iFood',yooga:'Yooga'};

  var histRows=historico.map(function(v){
    var t=calcTotais(v);var isAtivo=v.data===dataSel;
    var formas=Object.keys(v.pdv||{}).filter(function(k){return v.pdv[k]>0;}).map(function(k){return LABEL_SHORT[k]||k;}).join(' · ')||'—';
    var editBtn=el('button',{class:'btn-icon edit',title:'Editar',style:{opacity:isAtivo?'1':'0.6'},onclick:function(e){
      e.stopPropagation();setState({vendasData:v.data});
      setTimeout(function(){var f=document.getElementById('vendas-form-card');if(f)f.scrollIntoView({behavior:'smooth',block:'start'});},100);
    }},'✏️');
    return el('tr',{
      style:{background:isAtivo?'var(--gold-dim)':''},
      onmouseenter:function(e){if(!isAtivo)e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){if(!isAtivo)e.currentTarget.style.background='';},
    },[
      el('td',{style:{padding:'8px 10px',fontSize:'12px',fontWeight:isAtivo?'700':'400'}},[fmtDate(v.data),v.data===today()?el('span',{style:{marginLeft:'5px',fontSize:'10px',color:'var(--blue)'}},'●'):null].filter(Boolean)),
      el('td',{style:{padding:'8px 10px',fontSize:'11px',color:'var(--text3)'}},formas),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',textAlign:'right'}},fmtMoney(t.bruto)),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',textAlign:'right',color:'var(--red)'}},t.taxas>0?'-'+fmtMoney(t.taxas):'—'),
      el('td',{style:{padding:'8px 10px',fontSize:'13px',fontWeight:'700',textAlign:'right',color:'var(--green)'}},fmtMoney(t.liq)),
      el('td',{style:{padding:'8px 6px',textAlign:'center'}},editBtn),
    ]);
  });

  var histCard=div('card',[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}},[
      div('card-title','Histórico de lançamentos'),
      el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Clique em ✏️ para editar'),
    ]),
    historico.length===0
      ?div('empty',[div('empty-icon','📋'),div('empty-title','Nenhum lançamento ainda'),el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Faça o primeiro lançamento acima')])
      :el('div',{style:{overflowX:'auto'}},[el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
          el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
            el('th',{style:{padding:'7px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Data'),
            el('th',{style:{padding:'7px 10px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Formas'),
            el('th',{style:{padding:'7px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Bruto'),
            el('th',{style:{padding:'7px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Taxas'),
            el('th',{style:{padding:'7px 10px',textAlign:'right',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Líquido'),
            el('th',{}),
          ])]),
          el('tbody',{},histRows),
        ])]),
  ]);

  // ── CALENDÁRIO MENSAL (FUNDO DE PÁGINA) ───────────────────────────────────
  function buildMonthCalendar(year,month){
    var firstDay=new Date(year,month,1).getDay();
    var daysInMonth=new Date(year,month+1,0).getDate();
    var cells=[];
    for(var i=0;i<firstDay;i++)cells.push(el('div',{}));
    for(var d=1;d<=daysInMonth;d++){
      (function(day){
        var dateStr=year+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
        var isSel=dateStr===dataSel;
        var isToday=dateStr===today();
        var temVenda=datasComVenda[dateStr];
        var cell=el('div',{
          style:{
            position:'relative',textAlign:'center',padding:'8px 4px',borderRadius:'8px',cursor:'pointer',
            fontSize:'13px',fontWeight: isSel||isToday?'700':'400',
            background:isSel?'var(--gold)':isToday?'var(--bg4)':'transparent',
            color:isSel?'#000':isToday?'var(--gold)':'var(--text)',
            border:isToday&&!isSel?'1px solid var(--gold)':'1px solid transparent',
            transition:'background .1s',
          },
          onclick:function(){setState({vendasData:dateStr});window.scrollTo({top:0,behavior:'smooth'});},
          onmouseenter:function(e){if(!isSel)e.currentTarget.style.background='var(--bg3)';},
          onmouseleave:function(e){if(!isSel)e.currentTarget.style.background=isSel?'var(--gold)':isToday?'var(--bg4)':'transparent';},
        },String(day));
        if(temVenda){
          cell.appendChild(el('div',{style:{width:'5px',height:'5px',borderRadius:'50%',background:isSel?'#000':'var(--green)',position:'absolute',bottom:'3px',left:'50%',transform:'translateX(-50%)'}}));
        }
        cells.push(cell);
      })(d);
    }
    return cells;
  }

  var calCard=div('card',[
    el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}},[
      div('card-title','📅 Calendário de lançamentos'),
      el('div',{style:{display:'flex',gap:'12px',fontSize:'11px',color:'var(--text3)'}},[
        el('div',{style:{display:'flex',alignItems:'center',gap:'4px'}},[el('div',{style:{width:'7px',height:'7px',borderRadius:'50%',background:'var(--green)'}}),el('span',{},'Com lançamento')]),
        el('div',{style:{display:'flex',alignItems:'center',gap:'4px'}},[el('div',{style:{width:'12px',height:'12px',borderRadius:'3px',background:'var(--gold)'}}),el('span',{},'Selecionado')]),
        el('div',{style:{display:'flex',alignItems:'center',gap:'4px'}},[el('div',{style:{width:'12px',height:'12px',borderRadius:'3px',border:'1px solid var(--gold)',background:'var(--bg4)'}}),el('span',{},'Hoje')]),
      ]),
    ]),
    el('div',{id:'cal-bottom-wrap'},[]),
  ]);

  // Monta o calendário do mês corrente e do mês passado lado a lado
  function renderBottomCal(){
    var wrap=document.getElementById('cal-bottom-wrap');
    if(!wrap)return;
    wrap.innerHTML='';

    var months=[];
    for(var i=-1;i<=1;i++){
      var d2=new Date(_vcalYear,_vcalMonth+i,1);
      months.push({y:d2.getFullYear(),m:d2.getMonth()});
    }

    var header=el('div',{style:{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',justifyContent:'center'}},[
      el('button',{class:'btn-ghost',style:{padding:'4px 12px'},onclick:function(){
        _vcalMonth--;if(_vcalMonth<0){_vcalMonth=11;_vcalYear--;}renderBottomCal();
      }},'←'),
      el('span',{style:{fontSize:'14px',fontWeight:'700',minWidth:'200px',textAlign:'center'}},
        MESES_FULL[_vcalMonth]+' '+_vcalYear),
      el('button',{class:'btn-ghost',style:{padding:'4px 12px'},onclick:function(){
        _vcalMonth++;if(_vcalMonth>11){_vcalMonth=0;_vcalYear++;}renderBottomCal();
      }},'→'),
      el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'4px 10px',marginLeft:'8px'},onclick:function(){
        var _hj=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));_vcalYear=_hj.getFullYear();_vcalMonth=_hj.getMonth();renderBottomCal();
      }},'Hoje'),
    ]);
    wrap.appendChild(header);

    var calGrid=el('div',{},[
      el('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'4px'}},
        DIAS_CURTOS.map(function(d){return el('div',{style:{textAlign:'center',fontSize:'10px',fontWeight:'700',color:'var(--text3)',padding:'4px 0'}},d);})),
      el('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px'}},
        buildMonthCalendar(_vcalYear,_vcalMonth)),
    ]);
    wrap.appendChild(calGrid);
  }

  // Inicializa totais e calendário após render
  setTimeout(function(){updateTotals();_vcalYear=dObj.getFullYear();_vcalMonth=dObj.getMonth();renderBottomCal();},50);

  // ── BARRA DE DATA COM ÍCONES ──────────────────────────────────────────────
  var dateBar=el('div',{style:{
    display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',
    background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'12px 16px',
  }},[
    btn('btn-ghost','←',function(){navDate(-1);}),
    el('div',{style:{flex:'1',textAlign:'center'}},[
      el('div',{style:{fontSize:'14px',fontWeight:'700',color:'var(--text)'}},dateDisplay),
      el('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginTop:'5px'}},[
        dateTag?el('span',{style:{fontSize:'10px',fontWeight:'800',textTransform:'uppercase',letterSpacing:'1px',color:'var(--gold)',background:'var(--gold-dim)',padding:'2px 8px',borderRadius:'10px'}},dateTag):null,
        atual
          ?el('span',{style:{fontSize:'11px',color:'var(--green)'}},'✓ Lançamento salvo')
          :el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Sem lançamento para este dia'),
      ].filter(Boolean)),
    ]),
    btn('btn-ghost','→',function(){navDate(1);}),
    el('button',{id:'btn-cal-open',title:'Abrir calendário',style:{background:'none',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'18px',padding:'6px 10px',lineHeight:'1'},
      onclick:function(e){e.stopPropagation();abrirCalendario();}
    },'📅'),
    el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'6px 12px',color:'var(--text3)',flexShrink:'0'},onclick:toggleTaxas},'⚙ Taxas'),
  ]);

  return div('',[
    div('page-header',[el('h1',{},'🛒 Vendas do Dia'),el('p',{},'Lançamento diário de caixa · Artt Burger')]),
    dateBar,
    taxPanel,
    resumo,
    formCard,
    saveBar,
    histCard,
    calCard,
  ]);
}
