// ── AUDITORIA / HISTÓRICO ─────────────────────────────────────────────────────

function logAudit(acao, detalhe){
  var u=state.sessionUser;
  var entry={
    id:uid(),
    data:new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),
    iso: new Date().toISOString(),
    usuario:u?(u.nome||u.email):'Sistema',
    acao:acao,
    detalhe:detalhe||'',
  };
  var log=(state.auditLog||[]).slice(0,499);
  log.unshift(entry);
  state.auditLog=log;
  lsSet('auditLog',log);
  try{fbPut('/auditLog',arrToObj(log.slice(0,100)));}catch(e){}
}

function renderAuditoria(){
  var log=state.auditLog||[];
  var busca=(state.auditBusca||'').toLowerCase().trim();

  var filtrado=busca?log.filter(function(e){
    return (e.acao||'').toLowerCase().includes(busca)||
           (e.detalhe||'').toLowerCase().includes(busca)||
           (e.usuario||'').toLowerCase().includes(busca);
  }):log;

  // ── ícone por tipo de ação ───────────────────────────────────────────────
  function acaoIcon(a){
    var a2=(a||'').toLowerCase();
    if(a2.includes('exclu')||a2.includes('remov'))return'🗑️';
    if(a2.includes('crio')||a2.includes('criou')||a2.includes('cad'))return'➕';
    if(a2.includes('edit')||a2.includes('atualiz'))return'✏️';
    if(a2.includes('login')||a2.includes('logout'))return'🔐';
    if(a2.includes('export'))return'📤';
    if(a2.includes('import'))return'📥';
    if(a2.includes('pag')||a2.includes('receb'))return'💰';
    if(a2.includes('transf'))return'🔄';
    if(a2.includes('recorr'))return'🔁';
    if(a2.includes('nota'))return'📄';
    if(a2.includes('estoque')||a2.includes('insumo'))return'📦';
    return'📝';
  }

  function acaoCor(a){
    var a2=(a||'').toLowerCase();
    if(a2.includes('exclu')||a2.includes('remov'))return'#ef4444';
    if(a2.includes('crio')||a2.includes('criou')||a2.includes('cad'))return'#22c55e';
    if(a2.includes('edit')||a2.includes('atualiz'))return'#f59e0b';
    if(a2.includes('pag')||a2.includes('receb'))return'#3b82f6';
    return'var(--text3)';
  }

  // ── agrupar por data (YYYY-MM-DD) ─────────────────────────────────────────
  var grupos={};
  var grupoOrder=[];
  filtrado.forEach(function(e){
    var dateKey='';
    // iso é mais confiável, mas pode não existir em entradas antigas
    if(e.iso){
      dateKey=e.iso.slice(0,10);
    } else if(e.data){
      // formato pt-BR: "dd/mm/yyyy, HH:MM:SS"
      var partes=e.data.split(',')[0].split('/');
      if(partes.length===3) dateKey=partes[2]+'-'+partes[1]+'-'+partes[0];
      else dateKey=today();
    } else {
      dateKey=today();
    }
    if(!grupos[dateKey]){grupos[dateKey]=[];grupoOrder.push(dateKey);}
    grupos[dateKey].push(e);
  });

  // label de data ao estilo Chrome
  function dateLabel(k){
    var t=today();
    var ontem=new Date(t+'T12:00:00');ontem.setDate(ontem.getDate()-1);
    var ontemStr=ontem.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
    if(k===t)return'Hoje — '+new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if(k===ontemStr)return'Ontem — '+new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    return new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  }

  // ── extrair hora do campo data ──────────────────────────────────────────
  function getHora(e){
    if(e.iso){
      return new Date(e.iso).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
    }
    if(e.data){
      var idx=e.data.indexOf(',');
      if(idx>=0){
        var t2=e.data.slice(idx+2).trim();
        return t2.slice(0,5);
      }
    }
    return'—';
  }

  // ── linha de histórico (ao estilo Chrome) ──────────────────────────────────
  function histRow(e){
    var cor=acaoCor(e.acao);
    var row=el('div',{style:{
      display:'flex',alignItems:'center',gap:'12px',
      padding:'8px 14px',borderRadius:'8px',cursor:'default',
      transition:'background .12s',
    }});
    row.onmouseenter=function(){row.style.background='var(--bg3)';};
    row.onmouseleave=function(){row.style.background='';};

    // ícone
    var iconBox=el('div',{style:{
      width:'32px',height:'32px',borderRadius:'50%',
      background:'var(--bg3)',border:'1px solid var(--border)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:'14px',flexShrink:'0',
    }},acaoIcon(e.acao));

    // hora
    var horaEl=el('div',{style:{
      fontSize:'11px',color:'var(--text3)',minWidth:'42px',
      fontVariantNumeric:'tabular-nums',flexShrink:'0',
    }},getHora(e));

    // conteúdo
    var acaoEl=el('div',{style:{
      fontSize:'13px',fontWeight:'600',color:'var(--text)',
      flex:'1',minWidth:'0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
    }},e.acao||'—');
    var detalheEl=e.detalhe?el('div',{style:{
      fontSize:'11px',color:'var(--text3)',marginTop:'1px',
      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
    }},e.detalhe):null;
    var textoBox=el('div',{style:{flex:'1',minWidth:'0'}},[acaoEl,detalheEl].filter(Boolean));

    // usuário
    var userEl=el('div',{style:{
      fontSize:'11px',color:'var(--text3)',flexShrink:'0',
      background:'var(--bg2)',padding:'2px 8px',borderRadius:'20px',
      border:'1px solid var(--border)',
    }},e.usuario||'Sistema');

    // botão excluir
    var delBtn=el('button',{style:{
      background:'none',border:'none',color:'var(--text3)',cursor:'pointer',
      fontSize:'16px',padding:'2px 6px',borderRadius:'6px',flexShrink:'0',
      opacity:'0',transition:'opacity .15s',
    }},'×');
    delBtn.title='Remover do histórico';
    delBtn.onclick=function(ev){
      ev.stopPropagation();
      var newLog=(state.auditLog||[]).filter(function(x){return x.id!==e.id;});
      state.auditLog=newLog;lsSet('auditLog',newLog);render();
    };
    row.onmouseenter=function(){row.style.background='var(--bg3)';delBtn.style.opacity='1';};
    row.onmouseleave=function(){row.style.background='';delBtn.style.opacity='0';};

    row.appendChild(iconBox);
    row.appendChild(horaEl);
    row.appendChild(textoBox);
    row.appendChild(userEl);
    row.appendChild(delBtn);
    return row;
  }

  // ── seção de data (grupo) ─────────────────────────────────────────────────
  function grupoSection(dateKey){
    var entradas=grupos[dateKey];
    var labelEl=el('div',{style:{
      fontSize:'12px',fontWeight:'700',color:'var(--text3)',
      textTransform:'uppercase',letterSpacing:'.7px',
      padding:'18px 14px 6px',
      borderBottom:'1px solid var(--border)',marginBottom:'4px',
      display:'flex',justifyContent:'space-between',alignItems:'center',
    }},[
      el('span',{},dateLabel(dateKey)),
      el('button',{style:{
        fontSize:'11px',color:'var(--text3)',background:'none',
        border:'1px solid var(--border)',borderRadius:'20px',
        cursor:'pointer',padding:'2px 10px',
      },onclick:function(){
        var ids=entradas.map(function(x){return x.id;});
        var newLog=(state.auditLog||[]).filter(function(x){return ids.indexOf(x.id)===-1;});
        state.auditLog=newLog;lsSet('auditLog',newLog);render();
      }},'Limpar dia'),
    ]);
    var rows=el('div',{},entradas.map(histRow));
    return el('div',{},[labelEl,rows]);
  }

  // ── search bar ────────────────────────────────────────────────────────────
  var searchWrap=el('div',{style:{
    display:'flex',alignItems:'center',gap:'10px',
    background:'var(--bg3)',border:'1px solid var(--border)',
    borderRadius:'10px',padding:'10px 16px',marginBottom:'20px',
  }},[
    el('span',{style:{fontSize:'16px',color:'var(--text3)'}},'🔍'),
    el('input',{
      id:'_audit_search',
      style:{flex:'1',background:'none',border:'none',outline:'none',fontSize:'14px',color:'var(--text)'},
      placeholder:'Pesquisar no histórico...',
      value:state.auditBusca||'',
    }),
  ]);
  var searchInp=searchWrap.querySelector('#_audit_search')||searchWrap.children[1];
  searchInp.oninput=function(){
    var val=this.value;var pos=this.selectionStart;
    state.auditBusca=val;render();
    var inp=document.getElementById('_audit_search');
    if(inp){inp.focus();try{inp.setSelectionRange(pos,pos);}catch(e){}}
  };

  // ── KPI bar ───────────────────────────────────────────────────────────────
  var hojeCount=grupos[today()]?(grupos[today()].length):0;
  var kpis=el('div',{style:{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}},[
    el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 18px',flex:'1',minWidth:'120px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'3px'}},'Total no histórico'),
      el('div',{style:{fontSize:'18px',fontWeight:'800',color:'var(--text)'}},String(log.length)),
    ]),
    el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 18px',flex:'1',minWidth:'120px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'3px'}},'Hoje'),
      el('div',{style:{fontSize:'18px',fontWeight:'800',color:'var(--gold)'}},String(hojeCount)),
    ]),
    el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'10px 18px',flex:'1',minWidth:'120px'}},[
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'3px'}},'Dias com registros'),
      el('div',{style:{fontSize:'18px',fontWeight:'800',color:'var(--blue)'}},String(grupoOrder.length)),
    ]),
  ]);

  // ── conteúdo ─────────────────────────────────────────────────────────────
  var conteudo;
  if(log.length===0){
    conteudo=el('div',{style:{textAlign:'center',padding:'60px 20px'}},[
      el('div',{style:{fontSize:'40px',marginBottom:'12px'}},'🕐'),
      el('div',{style:{fontSize:'16px',fontWeight:'700',color:'var(--text2)',marginBottom:'6px'}},'Nenhuma atividade registrada'),
      el('p',{style:{fontSize:'13px',color:'var(--text3)'}},'As ações realizadas no sistema aparecerão aqui automaticamente'),
    ]);
  } else if(filtrado.length===0){
    conteudo=el('div',{style:{textAlign:'center',padding:'60px 20px'}},[
      el('div',{style:{fontSize:'36px',marginBottom:'12px'}},'🔍'),
      el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--text2)',marginBottom:'6px'}},'Nenhum resultado encontrado'),
      el('p',{style:{fontSize:'13px',color:'var(--text3)'}},'Tente pesquisar com outros termos'),
    ]);
  } else {
    var totalLabel=el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'10px',paddingLeft:'14px'}},
      filtrado.length+' evento(s)'+(busca?' — pesquisa: "'+busca+'"':''));
    conteudo=el('div',{},[totalLabel].concat(grupoOrder.map(grupoSection)));
  }

  // ── botão limpar tudo ─────────────────────────────────────────────────────
  var limparTudoBtn=log.length>0?el('button',{style:{
    background:'none',border:'1px solid var(--border)',borderRadius:'8px',
    color:'var(--text3)',fontSize:'12px',cursor:'pointer',padding:'7px 14px',
  },onclick:function(){
    if(!confirm('Limpar todo o histórico?'))return;
    state.auditLog=[];lsSet('auditLog',[]);
    try{fbPut('/auditLog',{});}catch(e){}
    setState({auditBusca:''});
    showToast('Histórico limpo','info');
  }},'🗑️  Limpar tudo'):null;

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header',style:{marginBottom:'20px'}},[
      el('div',{},[
        el('h2',{class:'page-title'},'🕐 Histórico'),
        el('p',{class:'page-sub'},'Registro de todas as ações realizadas no sistema'),
      ]),
      limparTudoBtn,
    ].filter(Boolean)),
    kpis,
    searchWrap,
    el('div',{class:'card',style:{padding:'8px 0'}},conteudo),
  ]);
}
