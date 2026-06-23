// ── USUÁRIOS & PERMISSÕES ────────────────────────────────────────────────────

var PERMISSOES_MODULOS=[
  {id:'dashboard',    label:'Dashboard',            icone:'📊', acoes:['ver']},
  {id:'bancos',       label:'Bancos e Contas',       icone:'🏦', acoes:['ver','criar','editar','excluir']},
  {id:'receitas',     label:'Receitas',              icone:'💵', acoes:['ver','criar','editar','excluir']},
  {id:'pagar',        label:'Despesas',              icone:'💸', acoes:['ver','criar','editar','excluir']},
  {id:'receber',      label:'Contas a Receber',      icone:'📥', acoes:['ver','criar','editar','excluir']},
  {id:'dre',          label:'DRE / Resultado',       icone:'📈', acoes:['ver']},
  {id:'vendas',       label:'Vendas',                icone:'🛒', acoes:['ver','criar','editar','excluir']},
  {id:'fluxo',        label:'Fluxo de Caixa',        icone:'🔄', acoes:['ver']},
  {id:'orcamento',    label:'Orçamento',             icone:'🎯', acoes:['ver','criar','editar','excluir']},
  {id:'planejamento', label:'Metas & Objetivos',     icone:'🏆', acoes:['ver','criar','editar','excluir']},
  {id:'alertas',      label:'Alertas',               icone:'🔔', acoes:['ver']},
  {id:'exportar',     label:'Relatórios',            icone:'📤', acoes:['ver','exportar']},
  {id:'cartoes',      label:'Cartões de Crédito',    icone:'💳', acoes:['ver','criar','editar','excluir']},
  {id:'tarefas',      label:'Tarefas & Agenda',      icone:'📋', acoes:['ver','criar','editar','excluir']},
  {id:'emprestimos',  label:'Empréstimos',           icone:'🤝', acoes:['ver','criar','editar','excluir']},
  {id:'fornecedores', label:'Fornecedores',          icone:'🏭', acoes:['ver','criar','editar','excluir']},
  {id:'funcionarios', label:'Funcionários',          icone:'👥', acoes:['ver','criar','editar','excluir']},
  {id:'usuarios',     label:'Usuários & Permissões', icone:'🔐', acoes:['ver','criar','editar','excluir']},
];

var PAPEIS=[
  {id:'desenvolvedor',label:'Desenvolvedor',cor:'#ff6b35'},
  {id:'administrador',label:'Administrador', cor:'#c9a84c'},
  {id:'gerente',      label:'Gerente',       cor:'#4caf7d'},
  {id:'operador',     label:'Operador',      cor:'#4c7dc9'},
  {id:'visualizador', label:'Visualizador',  cor:'#9e9e9e'},
];

// Hash simples para armazenamento de senha (obfuscação, não criptografia real)
function hashSenha(s){
  var h=0;
  for(var i=0;i<s.length;i++){h=(Math.imul(31,h)+s.charCodeAt(i))|0;}
  return 'djf1:'+Math.abs(h).toString(36)+':'+btoa(unescape(encodeURIComponent(s))).substring(0,12);
}
function verificaSenha(s,hash){return hash===hashSenha(s);}

// Inicia com letras do nome
function avatarIniciais(nome){
  var parts=(nome||'').trim().split(' ').filter(Boolean);
  if(parts.length===0)return '??';
  if(parts.length===1)return parts[0].substring(0,2).toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}

function permissoesDefault(papel){
  var all={};
  PERMISSOES_MODULOS.forEach(function(m){
    all[m.id]={};
    m.acoes.forEach(function(a){all[m.id][a]=false;});
  });
  switch(papel){
    case 'desenvolvedor':
      PERMISSOES_MODULOS.forEach(function(m){m.acoes.forEach(function(a){all[m.id][a]=true;});});
      break;
    case 'administrador':
      PERMISSOES_MODULOS.forEach(function(m){
        m.acoes.forEach(function(a){
          all[m.id][a]=(m.id==='usuarios'&&a!=='ver')?false:true;
        });
      });
      break;
    case 'gerente':
      PERMISSOES_MODULOS.forEach(function(m){
        m.acoes.forEach(function(a){
          if(a==='ver')all[m.id][a]=true;
          else if(a==='excluir'||m.id==='usuarios'||m.id==='funcionarios')all[m.id][a]=false;
          else all[m.id][a]=['receitas','pagar','receber','vendas','tarefas','fornecedores','cartoes','orcamento'].includes(m.id);
        });
      });
      break;
    case 'operador':
      var opMods=['receitas','pagar','receber','vendas','tarefas','fornecedores'];
      PERMISSOES_MODULOS.forEach(function(m){
        m.acoes.forEach(function(a){
          if(a==='ver')all[m.id][a]=['dashboard','receitas','pagar','receber','vendas','tarefas','fornecedores','bancos','alertas'].includes(m.id);
          else if(a==='criar'||a==='editar')all[m.id][a]=opMods.includes(m.id);
          else all[m.id][a]=false;
        });
      });
      break;
    default: // visualizador
      PERMISSOES_MODULOS.forEach(function(m){
        m.acoes.forEach(function(a){all[m.id][a]=(a==='ver');});
      });
      break;
  }
  return all;
}

// Sessão de desenvolvedor verificada (persiste enquanto a aba estiver aberta)
var _devSessao=false;

function seedUsuariosDev(){
  if(!state.usuarios||state.usuarios.length===0){
    var devUser={
      id:'dev001',
      nome:'Daniel Junior',
      email:'danieljunior@arttburger.com.br',
      senhaHash:hashSenha('741258'),
      papel:'desenvolvedor',
      perfil:'ambos',
      ativo:true,
      avatar:'DJ',
      criadoEm:today(),
      permissoes:permissoesDefault('desenvolvedor'),
    };
    setState({usuarios:[devUser]});
    scheduleSave();
  }
}

// ── MODAL DE VERIFICAÇÃO DE DESENVOLVEDOR ─────────────────────────────────────
function renderDevVerModal(onOk){
  var inp=el('input',{type:'password',class:'form-input',placeholder:'Senha do desenvolvedor',style:{textAlign:'center',letterSpacing:'4px',fontSize:'20px'}});
  var err=el('div',{style:{color:'var(--danger)',fontSize:'12px',textAlign:'center',minHeight:'18px'}});
  function tentar(){
    var dev=(state.usuarios||[]).find(function(u){return u.papel==='desenvolvedor';});
    if(!dev){_devSessao=true;setState({usuDevModal:false});onOk();return;}
    if(verificaSenha(inp.value,dev.senhaHash)){
      _devSessao=true;
      setState({usuDevModal:false});
      onOk();
    }else{
      err.textContent='Senha incorreta.';
      inp.value='';inp.focus();
    }
  }
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')tentar();});
  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({usuDevModal:false});}},
    el('div',{class:'modal',style:{maxWidth:'340px',textAlign:'center'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},'🔐 Acesso Restrito'),
        el('button',{class:'modal-close',onclick:function(){setState({usuDevModal:false});}},  '✕'),
      ]),
      el('div',{class:'modal-body',style:{padding:'24px'}},[
        el('p',{style:{color:'var(--text2)',marginBottom:'16px',fontSize:'13px'}},'Esta ação é restrita ao desenvolvedor. Informe a senha para continuar.'),
        inp,
        err,
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({usuDevModal:false});}),
        btn('btn-primary','Confirmar',tentar),
      ]),
    ])
  );
}

// ── MODAL CRIAR / EDITAR USUÁRIO ─────────────────────────────────────────────
function renderUsuarioModal(){
  var u=state.usuarioModal;
  var isEdit=!!(u&&u.id);
  var perm=u.permissoes||permissoesDefault(u.papel||'visualizador');

  function field(label,children){
    return el('div',{class:'form-group'},[el('label',{class:'form-label'},label)].concat(Array.isArray(children)?children:[children]));
  }

  // Preset buttons
  var presetsRow=el('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'12px'}},
    PAPEIS.map(function(p){
      return el('button',{
        class:'btn-ghost',
        style:{fontSize:'11px',padding:'4px 8px',border:'1px solid '+p.cor+'55',color:p.cor},
        onclick:function(){
          var np=permissoesDefault(p.id);
          setState({usuarioModal:Object.assign({},state.usuarioModal,{permissoes:np,papel:p.id})});
        }
      },p.label);
    }).concat([
      el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'4px 8px'},onclick:function(){
        var all={};PERMISSOES_MODULOS.forEach(function(m){all[m.id]={};m.acoes.forEach(function(a){all[m.id][a]=true;});});
        setState({usuarioModal:Object.assign({},state.usuarioModal,{permissoes:all})});
      }},'✅ Tudo'),
      el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'4px 8px'},onclick:function(){
        var none={};PERMISSOES_MODULOS.forEach(function(m){none[m.id]={};m.acoes.forEach(function(a){none[m.id][a]=false;});});
        setState({usuarioModal:Object.assign({},state.usuarioModal,{permissoes:none})});
      }},'⬜ Nenhum'),
    ])
  );

  // Matriz de permissões
  var acoesCols=['ver','criar','editar','excluir','exportar'];
  var acoesLabel={ver:'Ver',criar:'Criar',editar:'Editar',excluir:'Excluir',exportar:'Export.'};
  var tHead=el('tr',{},[el('th',{style:{textAlign:'left',fontWeight:'600',paddingBottom:'8px',color:'var(--text2)',fontSize:'12px'}},'Módulo')]
    .concat(acoesCols.map(function(a){
      return el('th',{style:{textAlign:'center',fontWeight:'600',paddingBottom:'8px',color:'var(--text2)',fontSize:'11px',minWidth:'52px'}},acoesLabel[a]);
    }))
  );
  var tRows=PERMISSOES_MODULOS.map(function(m){
    var cells=[el('td',{style:{padding:'5px 4px',fontSize:'13px',whiteSpace:'nowrap'}},m.icone+' '+m.label)];
    acoesCols.forEach(function(a){
      var temAcao=m.acoes.includes(a);
      if(!temAcao){cells.push(el('td',{style:{textAlign:'center',color:'var(--border2)'}},'-'));return;}
      var checked=!!(perm[m.id]&&perm[m.id][a]);
      var chk=el('input',{type:'checkbox',checked:checked,style:{cursor:'pointer',width:'15px',height:'15px',accentColor:'var(--gold)'},onchange:function(){
        var np=JSON.parse(JSON.stringify(state.usuarioModal.permissoes||{}));
        if(!np[m.id])np[m.id]={};
        np[m.id][a]=this.checked;
        // Se marcou criar/editar/excluir, marca ver também
        if(this.checked&&a!=='ver'&&np[m.id])np[m.id].ver=true;
        setState({usuarioModal:Object.assign({},state.usuarioModal,{permissoes:np})});
      }});
      cells.push(el('td',{style:{textAlign:'center'}},chk));
    });
    return el('tr',{style:{borderBottom:'1px solid var(--border)'}},cells);
  });

  var permTable=el('div',{style:{maxHeight:'280px',overflowY:'auto',border:'1px solid var(--border)',borderRadius:'8px',marginBottom:'8px'}},
    el('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'12px'}},[tHead].concat(tRows))
  );

  // Campos do usuário
  var nomeInp  =el('input',{class:'form-input',value:u.nome||'',placeholder:'Nome completo',oninput:function(){u.nome=this.value;}});
  var emailInp =el('input',{class:'form-input',value:u.email||'',placeholder:'email@empresa.com',type:'email',oninput:function(){u.email=this.value;}});
  var senhaInp =el('input',{class:'form-input',placeholder:isEdit?'Deixe em branco para manter':'Senha de acesso',type:'password',oninput:function(){u._senhaNova=this.value;}});
  var confInp  =el('input',{class:'form-input',placeholder:'Confirmar senha',type:'password',oninput:function(){u._senhaConf=this.value;}});

  var papelSel=el('select',{class:'form-input',onchange:function(){
    var np=permissoesDefault(this.value);
    setState({usuarioModal:Object.assign({},state.usuarioModal,{papel:this.value,permissoes:np})});
  }},PAPEIS.map(function(p){return el('option',{value:p.id,selected:u.papel===p.id},p.label);}));

  var perfilSel=el('select',{class:'form-input',onchange:function(){u.perfil=this.value;}},
    [{id:'ambos',l:'Ambos os perfis'},{id:'dj',l:'DJ Finance'},{id:'artt',l:'Artt Burger'}]
    .map(function(p){return el('option',{value:p.id,selected:u.perfil===p.id},p.l);})
  );

  var statusChk=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'}},[
    el('input',{type:'checkbox',checked:u.ativo!==false,style:{width:'16px',height:'16px',accentColor:'var(--gold)'},onchange:function(){u.ativo=this.checked;}}),
    el('span',{style:{fontSize:'13px',color:'var(--text2)'}},'Usuário ativo'),
  ]);

  var errEl=el('div',{id:'usu-err',style:{color:'var(--danger)',fontSize:'12px',minHeight:'18px',marginBottom:'4px'}});

  function salvar(){
    var nome=(u.nome||'').trim();
    var email=(u.email||'').trim();
    if(!nome){document.getElementById('usu-err').textContent='Informe o nome.';return;}
    if(!email){document.getElementById('usu-err').textContent='Informe o e-mail.';return;}
    var senhaHash=u.senhaHash||'';
    if(u._senhaNova){
      if(u._senhaNova!==u._senhaConf){document.getElementById('usu-err').textContent='As senhas não coincidem.';return;}
      if(u._senhaNova.length<4){document.getElementById('usu-err').textContent='Senha deve ter ao menos 4 caracteres.';return;}
      senhaHash=hashSenha(u._senhaNova);
    }else if(!isEdit){
      document.getElementById('usu-err').textContent='Defina uma senha para o usuário.';return;
    }
    var lista=state.usuarios?state.usuarios.slice():[];
    var novoUser={
      id:u.id||uid(),
      nome:nome,
      email:email,
      senhaHash:senhaHash,
      papel:u.papel||'visualizador',
      perfil:u.perfil||'ambos',
      ativo:u.ativo!==false,
      avatar:avatarIniciais(nome),
      criadoEm:u.criadoEm||today(),
      permissoes:u.permissoes||permissoesDefault(u.papel||'visualizador'),
    };
    if(isEdit){
      var idx=lista.findIndex(function(x){return x.id===u.id;});
      if(idx>=0)lista[idx]=novoUser; else lista.push(novoUser);
    }else{lista.push(novoUser);}
    setState({usuarios:lista,usuarioModal:null});
    scheduleSave();
    showToast(isEdit?'Usuário atualizado!':'Usuário criado!','success');
  }

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({usuarioModal:null});}},
    el('div',{class:'modal',style:{maxWidth:'680px',width:'95vw'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEdit?'✏️ Editar':'➕ Novo')+' Usuário'),
        el('button',{class:'modal-close',onclick:function(){setState({usuarioModal:null});}}, '✕'),
      ]),
      el('div',{class:'modal-body',style:{maxHeight:'70vh',overflowY:'auto'}},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          field('Nome completo',nomeInp),
          field('E-mail',emailInp),
          field('Senha',senhaInp),
          field('Confirmar senha',confInp),
          field('Papel / Função',papelSel),
          field('Acesso ao perfil',perfilSel),
        ]),
        el('div',{style:{margin:'8px 0'}},[statusChk]),
        el('hr',{style:{border:'none',borderTop:'1px solid var(--border)',margin:'16px 0'}}),
        el('div',{style:{marginBottom:'8px'}},[
          el('div',{style:{fontWeight:'700',fontSize:'13px',marginBottom:'8px',color:'var(--text)'}},'🔐 Permissões por módulo'),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'10px'}},'Aplique um preset ou configure manualmente:'),
          presetsRow,
        ]),
        permTable,
        errEl,
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({usuarioModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar alterações':'✅ Criar usuário',salvar),
      ]),
    ])
  );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
function renderUsuarios(){
  seedUsuariosDev();
  var lista=state.usuarios||[];
  var ativos=lista.filter(function(u){return u.ativo!==false;}).length;

  function acaoComDevCheck(fn){
    if(_devSessao){fn();return;}
    setState({usuDevModal:true,_devCallback:fn});
  }

  // Badges de papel
  function papelBadge(papel){
    var p=PAPEIS.find(function(x){return x.id===papel;})||{label:papel,cor:'#666'};
    return el('span',{style:{fontSize:'10px',fontWeight:'700',background:p.cor+'22',color:p.cor,padding:'2px 8px',borderRadius:'99px',letterSpacing:'.4px',textTransform:'uppercase'}},p.label);
  }

  // Cards de usuário
  var cards=lista.map(function(u){
    var pInfo=PAPEIS.find(function(p){return p.id===u.papel;})||{cor:'#666'};
    var avatarEl=el('div',{style:{
      width:'52px',height:'52px',borderRadius:'50%',
      background:'linear-gradient(135deg,'+pInfo.cor+'44,'+pInfo.cor+'22)',
      border:'2px solid '+pInfo.cor+'66',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:'18px',fontWeight:'900',color:pInfo.cor,flexShrink:'0',
      fontFamily:'inherit',
    }},u.avatar||avatarIniciais(u.nome));

    var permCount=0,permTotal=0;
    PERMISSOES_MODULOS.forEach(function(m){m.acoes.forEach(function(a){permTotal++;if(u.permissoes&&u.permissoes[m.id]&&u.permissoes[m.id][a])permCount++;});});
    var permPct=permTotal>0?Math.round(permCount/permTotal*100):0;

    return el('div',{class:'card',style:{padding:'16px',display:'flex',flexDirection:'column',gap:'10px'}},[
      el('div',{style:{display:'flex',alignItems:'center',gap:'12px'}},[
        avatarEl,
        el('div',{style:{flex:'1',minWidth:0}},[
          el('div',{style:{fontWeight:'700',fontSize:'14px',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},u.nome),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},u.email),
          el('div',{style:{marginTop:'4px',display:'flex',alignItems:'center',gap:'6px'}},[
            papelBadge(u.papel),
            el('span',{style:{fontSize:'10px',color:u.ativo!==false?'var(--success)':'var(--danger)'}},
              u.ativo!==false?'● Ativo':'○ Inativo'),
          ]),
        ]),
      ]),
      // Barra de permissões
      el('div',{},[
        el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text3)',marginBottom:'4px'}},[
          el('span',{},'Permissões'),
          el('span',{style:{color:'var(--gold)',fontWeight:'700'}},permPct+'%'),
        ]),
        el('div',{style:{height:'4px',background:'var(--bg3)',borderRadius:'2px'}},[
          el('div',{style:{height:'4px',width:permPct+'%',background:'linear-gradient(90deg,var(--gold),var(--gold2))',borderRadius:'2px',transition:'width .4s'}}),
        ]),
      ]),
      // Ações
      el('div',{style:{display:'flex',gap:'6px'}},[
        el('button',{class:'btn-ghost',style:{flex:'1',fontSize:'12px',padding:'6px'},onclick:function(){
          acaoComDevCheck(function(){setState({usuarioModal:JSON.parse(JSON.stringify(u))});});
        }},'✏️ Editar'),
        u.papel!=='desenvolvedor'?el('button',{class:'btn-ghost',style:{flex:'1',fontSize:'12px',padding:'6px',color:'var(--danger)'},onclick:function(){
          acaoComDevCheck(function(){
            if(!confirm('Excluir o usuário '+u.nome+'?'))return;
            var nl=(state.usuarios||[]).filter(function(x){return x.id!==u.id;});
            setState({usuarios:nl});scheduleSave();showToast('Usuário removido.','success');
          });
        }},'🗑️ Excluir'):el('span',{style:{flex:'1'}}),
      ]),
    ]);
  });

  // Cabeçalho + estatísticas
  var header=el('div',{class:'page-header'},[
    el('div',{},[
      el('h2',{class:'page-title'},'🔐 Usuários & Permissões'),
      el('p',{class:'page-sub'},lista.length+' usuário(s) · '+ativos+' ativo(s) · '+PERMISSOES_MODULOS.length+' módulos configuráveis'),
    ]),
    el('div',{style:{display:'flex',gap:'8px'}},[
      el('button',{class:'btn-primary',onclick:function(){
        acaoComDevCheck(function(){
          setState({usuarioModal:{papel:'operador',perfil:'ambos',ativo:true,permissoes:permissoesDefault('operador')}});
        });
      }},'+ Novo Usuário'),
    ]),
  ]);

  // Legenda de papéis
  var legendaEl=el('div',{class:'card',style:{padding:'14px 16px',marginBottom:'0'}},[
    el('div',{style:{fontWeight:'700',fontSize:'12px',color:'var(--text3)',marginBottom:'10px',letterSpacing:'.5px',textTransform:'uppercase'}},'Hierarquia de Papéis'),
    el('div',{style:{display:'flex',gap:'12px',flexWrap:'wrap'}},
      PAPEIS.map(function(p){
        var descs={
          desenvolvedor:'Acesso total, gerencia usuários e permissões',
          administrador:'Acesso total, exceto gestão de usuários',
          gerente:'Operações + relatórios, sem exclusões',
          operador:'Operações básicas do dia a dia',
          visualizador:'Somente leitura em todos os módulos',
        };
        return el('div',{style:{display:'flex',alignItems:'flex-start',gap:'8px',minWidth:'180px',flex:'1'}},[
          el('span',{style:{width:'10px',height:'10px',borderRadius:'50%',background:p.cor,marginTop:'3px',flexShrink:'0'}}),
          el('div',{},[
            el('div',{style:{fontSize:'12px',fontWeight:'700',color:p.cor}},p.label),
            el('div',{style:{fontSize:'11px',color:'var(--text3)',lineHeight:'1.4'}},descs[p.id]||''),
          ]),
        ]);
      })
    ),
  ]);

  return el('div',{class:'page-content'},[
    header,
    legendaEl,
    el('div',{class:'card-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}},cards),
    state.usuarioModal?renderUsuarioModal():null,
    state.usuDevModal?renderDevVerModal(function(){
      if(state._devCallback)state._devCallback();
    }):null,
  ].filter(Boolean));
}
