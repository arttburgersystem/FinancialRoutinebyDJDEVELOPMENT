// ── AUDITORIA ────────────────────────────────────────────────────────────────

function logAudit(acao, detalhe){
  var u=state.sessionUser;
  var entry={
    id:uid(),
    data:new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}),
    usuario:u?(u.nome||u.email):'Sistema',
    acao:acao,
    detalhe:detalhe||'',
  };
  var log=(state.auditLog||[]).slice(0,199);
  log.unshift(entry);
  state.auditLog=log;
  lsSet('auditLog',log);
  // Salva no Firebase de forma assíncrona sem bloquear
  try{fbPut('/auditLog',arrToObj(log.slice(0,100)));}catch(e){}
}

function renderAuditoria(){
  var log=state.auditLog||[];
  var hoje=today();

  // Filtros
  var busca=(state.auditBusca||'').toLowerCase();
  var filtrado=busca?log.filter(function(e){
    return (e.acao||'').toLowerCase().includes(busca)||
           (e.detalhe||'').toLowerCase().includes(busca)||
           (e.usuario||'').toLowerCase().includes(busca);
  }):log;

  // Estatísticas
  var hojeCount=log.filter(function(e){return e.data&&e.data.includes(hoje.split('-').reverse().join('/'));}).length;
  var usuariosUnicos=[...new Set(log.map(function(e){return e.usuario;}))].length;

  var kpis=el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))'}},[
    el('div',{class:'kpi-card blue'},[el('div',{class:'kpi-label'},'Total de eventos'),el('div',{class:'kpi-value blue'},String(log.length)),el('div',{class:'kpi-sub'},'histórico completo')]),
    el('div',{class:'kpi-card gold'},[el('div',{class:'kpi-label'},'Hoje'),el('div',{class:'kpi-value gold'},String(hojeCount)),el('div',{class:'kpi-sub'},'ações registradas')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Usuários ativos'),el('div',{class:'kpi-value green'},String(usuariosUnicos)),el('div',{class:'kpi-sub'},'no histórico')]),
  ]);

  var buscaInp=el('input',{
    class:'form-input',
    placeholder:'🔍 Buscar por ação, usuário ou detalhe...',
    value:state.auditBusca||'',
    oninput:function(){setState({auditBusca:this.value});},
    style:{maxWidth:'340px'},
  });

  // Ícone por tipo de ação
  function acaoIcon(a){
    var a2=(a||'').toLowerCase();
    if(a2.includes('exclu')||a2.includes('remov'))return'🗑️';
    if(a2.includes('crio')||a2.includes('criou')||a2.includes('cad'))return'➕';
    if(a2.includes('edit')||a2.includes('atualiz'))return'✏️';
    if(a2.includes('login')||a2.includes('logout'))return'🔐';
    if(a2.includes('export'))return'📤';
    if(a2.includes('import'))return'📥';
    if(a2.includes('pag')||a2.includes('receb'))return'💰';
    return'📝';
  }

  var rows=filtrado.slice(0,200).map(function(e){
    return el('tr',{style:{borderBottom:'1px solid var(--border)'}},[
      el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text3)',whiteSpace:'nowrap',fontVariantNumeric:'tabular-nums'}},e.data||'—'),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--gold)',fontWeight:'600',whiteSpace:'nowrap'}},e.usuario||'—'),
      el('td',{style:{padding:'8px 10px',fontSize:'13px',whiteSpace:'nowrap'}},acaoIcon(e.acao)+' '+e.acao),
      el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text2)'}},e.detalhe||''),
    ]);
  });

  var tabela=log.length===0
    ?el('div',{class:'empty'},[el('div',{class:'empty-icon'},'📋'),el('div',{class:'empty-title'},'Nenhum evento registrado'),el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'As ações no sistema aparecerão aqui automaticamente')])
    :el('div',{style:{overflowX:'auto'}},[
        el('div',{style:{marginBottom:'8px',fontSize:'12px',color:'var(--text3)'}},
          filtrado.length+' evento(s)'+(busca?' encontrado(s)':'')),
        el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
          el('thead',{},[el('tr',{},[
            el('th',{style:{textAlign:'left',padding:'8px 10px',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',fontWeight:'600',whiteSpace:'nowrap'}},'Data / Hora'),
            el('th',{style:{textAlign:'left',padding:'8px 10px',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',fontWeight:'600'}},'Usuário'),
            el('th',{style:{textAlign:'left',padding:'8px 10px',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',fontWeight:'600'}},'Ação'),
            el('th',{style:{textAlign:'left',padding:'8px 10px',fontSize:'11px',color:'var(--text3)',borderBottom:'1px solid var(--border)',fontWeight:'600'}},'Detalhe'),
          ])]  ),
          el('tbody',{},rows.length>0?rows:[el('tr',{},[el('td',{colspan:'4',style:{textAlign:'center',padding:'20px',color:'var(--text3)',fontSize:'12px'}},'Nenhum resultado para "'+busca+'"')])]),
        ]),
      ]);

  var limparBtn=log.length>0?btn('btn-ghost',function(){
    if(!confirm('Limpar todo o histórico de auditoria?'))return;
    setState({auditLog:[],auditBusca:''});
    lsSet('auditLog',[]);
    try{fbPut('/auditLog',{});}catch(e){}
    showToast('Histórico limpo','info');
  },'🗑️ Limpar histórico'):null;

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'📋 Auditoria'),
        el('p',{class:'page-sub'},'Histórico de todas as ações realizadas no sistema'),
      ]),
      el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[
        buscaInp,
        limparBtn,
      ].filter(Boolean)),
    ]),
    kpis,
    el('div',{class:'card'},tabela),
  ]);
}
