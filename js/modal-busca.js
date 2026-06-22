// ── BUSCA GLOBAL ──────────────────────────────────────────────────────────────
function renderBuscaModal(){
  if(!state.buscaModal)return null;

  var q=(state.buscaBusca||'').toLowerCase().trim();

  var resultados=[];
  if(q.length>=2){
    // Contas a pagar
    state.contas.filter(function(c){return c.tipo==='pagar'&&(c.descricao||'').toLowerCase().includes(q);}).slice(0,5).forEach(function(c){
      resultados.push({tipo:'Conta a pagar',icone:'💸',titulo:c.descricao,sub:fmtMoney(c.valor)+' · '+fmtDate(c.vencimento)+' · '+c.status,page:'pagar',profile:c.profile});
    });
    // Contas a receber
    state.contas.filter(function(c){return c.tipo==='receber'&&(c.descricao||'').toLowerCase().includes(q);}).slice(0,5).forEach(function(c){
      resultados.push({tipo:'Conta a receber',icone:'💰',titulo:c.descricao,sub:fmtMoney(c.valor)+' · '+fmtDate(c.vencimento)+' · '+c.status,page:'receber',profile:c.profile});
    });
    // Receitas
    state.receitas.filter(function(r){return(r.descricao||'').toLowerCase().includes(q);}).slice(0,5).forEach(function(r){
      resultados.push({tipo:'Receita',icone:'💵',titulo:r.descricao,sub:fmtMoney(r.valor)+' · '+fmtDate(r.data)+' · '+r.categoria,page:'receitas',profile:r.profile});
    });
    // Metas
    state.metas.filter(function(m){return(m.descricao||'').toLowerCase().includes(q);}).slice(0,3).forEach(function(m){
      resultados.push({tipo:'Meta',icone:'🎯',titulo:m.descricao,sub:fmtMoney(m.atual)+' / '+fmtMoney(m.meta)+' · '+m.categoria,page:'planejamento',profile:m.profile});
    });
    // Bancos
    state.bancos.filter(function(b){return(b.nome||'').toLowerCase().includes(q);}).slice(0,3).forEach(function(b){
      resultados.push({tipo:'Banco',icone:'🏦',titulo:b.nome,sub:'Saldo: '+fmtMoney(b.saldo),page:'bancos',profile:b.profile});
    });
  }

  var pf=PROFILES.find(function(p){return p.id===state.profile;});

  var rows=resultados.map(function(r){
    return el('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',transition:'background .1s'},
      onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){e.currentTarget.style.background='transparent';},
      onclick:function(){
        lsSet('pf',r.profile);
        setState({buscaModal:false,buscaBusca:'',profile:r.profile,page:r.page});
      }
    },[
      el('span',{style:{fontSize:'18px',flexShrink:'0'}},r.icone),
      el('div',{style:{flex:'1',minWidth:'0'}},[
        el('div',{style:{fontSize:'13px',fontWeight:'500',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},r.titulo),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},r.tipo+' · '+r.sub),
      ]),
      el('span',{style:{fontSize:'10px',color:'var(--text3)',flexShrink:'0',padding:'2px 6px',border:'1px solid var(--border)',borderRadius:'4px'}},r.profile==='artt'?'Artt':'Pessoal'),
    ]);
  });

  var inpBusca=el('input',{class:'form-input',type:'text',placeholder:'Buscar lançamentos, receitas, metas, bancos...',style:{fontSize:'15px',padding:'12px 14px'},
    oninput:function(e){setState({buscaBusca:e.target.value});},
    onkeydown:function(e){if(e.key==='Escape')setState({buscaModal:false,buscaBusca:''});}
  });
  inpBusca.value=state.buscaBusca||'';

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},'🔍 Busca global'),
      el('button',{class:'modal-close',onclick:function(){setState({buscaModal:false,buscaBusca:''});}}, '×'),
    ]),
    el('div',{style:{marginBottom:'12px'}},[inpBusca]),
    q.length<2
      ?el('p',{style:{fontSize:'13px',color:'var(--text3)',textAlign:'center',padding:'24px 0'}},'Digite pelo menos 2 caracteres para buscar...')
      :resultados.length===0
        ?el('p',{style:{fontSize:'13px',color:'var(--text3)',textAlign:'center',padding:'24px 0'}},'Nenhum resultado para "'+q+'"')
        :el('div',{style:{maxHeight:'380px',overflowY:'auto',margin:'0 -24px'}},rows),
    resultados.length>0?el('p',{style:{fontSize:'11px',color:'var(--text3)',textAlign:'center',marginTop:'10px'}},resultados.length+' resultado(s) — clique para navegar'):null,
  ].filter(Boolean));
  modal.style.maxWidth='520px';

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({buscaModal:false,buscaBusca:'',});};

  // Auto-focus
  setTimeout(function(){var i=document.querySelector('#app .modal input');if(i)i.focus();},50);
  return ov;
}
