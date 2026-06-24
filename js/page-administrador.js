// ── ADMINISTRADOR & SÓCIOS ───────────────────────────────────────────────────

function renderAdminModal() {
  var modal = state.adminModal;
  if (!modal) return null;
  var isEdit = !!modal.id;

  var CARGOS = ['Sócio','Sócio-Administrador','Administrador','Diretor','Representante Legal','Outro'];

  function g(id) { var e = document.getElementById('adm-'+id); return e ? e.value : ''; }

  function salvar() {
    var nome = g('nome').trim();
    if (!nome) { showToast('Informe o nome completo','error'); return; }
    var pf = state.profile;
    var novo = {
      id:           modal.id || uid(),
      profile:      pf,
      nome:         nome,
      cpf:          g('cpf').trim(),
      email:        g('email').trim(),
      telefone:     g('tel').trim(),
      cargo:        g('cargo') || 'Sócio',
      participacao: parseFloat(g('part'))||0,
      obs:          g('obs').trim(),
      criadoEm:     modal.criadoEm || new Date().toISOString(),
    };
    var arr = isEdit
      ? (state.administradores||[]).map(function(a){ return a.id===novo.id ? novo : a; })
      : (state.administradores||[]).concat([novo]);
    lsSet('administradores', arr);
    setState({administradores: arr, adminModal: null});
    scheduleSave();
    if(typeof logAudit==='function') logAudit((isEdit?'editou':'cadastrou')+' administrador', novo.nome+' — '+novo.cargo);
    showToast(isEdit ? 'Administrador atualizado!' : 'Administrador cadastrado!');
  }

  function inp(id, type, ph, val) {
    var i = el('input',{class:'form-input',type:type||'text',id:'adm-'+id,placeholder:ph||''});
    i.value = val !== undefined ? String(val) : '';
    return i;
  }

  var cargoOpts = CARGOS.map(function(c){
    var op = el('option',{value:c},c);
    if(c===(modal.cargo||'Sócio')) op.selected = true;
    return op;
  });
  var cargoSel = el('select',{class:'form-input',id:'adm-cargo'}, cargoOpts);

  var obsEl = el('textarea',{class:'form-input',id:'adm-obs',rows:'2',placeholder:'Observações...'});
  obsEl.value = modal.obs||'';

  var mdl = div('modal',[
    div('modal-title',[
      el('span',{},(isEdit?'✏️ Editar':'➕ Cadastrar')+' Administrador / Sócio'),
      el('button',{class:'modal-close',onclick:function(){setState({adminModal:null});}},'✕'),
    ]),
    el('div',{class:'form-row'},[
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'Nome completo *'), inp('nome','text','Nome completo',modal.nome||'')]),
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'CPF / CNPJ'), inp('cpf','text','000.000.000-00',modal.cpf||'')]),
    ]),
    el('div',{class:'form-row'},[
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'E-mail'), inp('email','email','email@empresa.com',modal.email||'')]),
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'Telefone'), inp('tel','text','(00) 00000-0000',modal.telefone||'')]),
    ]),
    el('div',{class:'form-row'},[
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'Cargo / Função'), cargoSel]),
      el('div',{class:'form-group'},[
        el('label',{class:'form-label'},'Participação societária (%)'),
        el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
          inp('part','number','Ex: 50', modal.participacao!=null&&modal.participacao!==0?String(modal.participacao):''),
          el('span',{style:{fontSize:'12px',color:'var(--text3)',flexShrink:'0'}},'%'),
        ]),
      ]),
    ]),
    el('div',{class:'form-group'},[el('label',{class:'form-label'},'Observações'), obsEl]),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({adminModal:null});}),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Cadastrar', salvar),
    ]),
  ]);
  mdl.style.maxWidth = '500px';
  var ov = div('modal-overlay',[mdl]);
  ov.onclick = function(e){if(e.target===ov)setState({adminModal:null});};
  return ov;
}

function renderAdministrador() {
  var pf = state.profile;
  var admins = (state.administradores||[]).filter(function(a){return a.profile===pf;});

  var mesAtual = new Date().toISOString().slice(0,7);
  var retiradaMes = (state.contas||[]).filter(function(c){
    return c.profile===pf && c.tipo==='pagar'
      && c.vencimento && c.vencimento.startsWith(mesAtual)
      && (c.categoria||'').toLowerCase().match(/retir|adiant|prolabore/);
  }).reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);

  var totalParticipacao = admins.reduce(function(s,a){return s+(a.participacao||0);},0);

  var corMap = {
    'Sócio':'var(--gold)','Sócio-Administrador':'var(--gold)',
    'Administrador':'#5b9bd5','Diretor':'#9b7fe8',
    'Representante Legal':'#4caf7d',
  };
  var rgbMap = {
    'var(--gold)':'201,168,76','#5b9bd5':'91,155,213',
    '#9b7fe8':'155,127,232','#4caf7d':'76,175,130',
  };

  function adminCard(a) {
    var initials = (a.nome||'?').split(' ').filter(Boolean).map(function(n){return n[0];}).slice(0,2).join('').toUpperCase();
    var cor = corMap[a.cargo] || 'var(--text3)';
    var rgb = rgbMap[cor] || '107,104,102';

    var retiradas = (state.contas||[]).filter(function(c){
      return c.profile===pf && c.fornecedorId===a.id
        && (c.categoria||'').toLowerCase().match(/retir|adiant|prolabore/);
    });
    var totalRetirado = retiradas.reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);

    var contatos = [
      a.cpf    ? el('div',{style:{fontSize:'12px',color:'var(--text2)',display:'flex',gap:'6px'}},[el('span',{style:{color:'var(--text3)',width:'80px',flexShrink:'0'}},'CPF/CNPJ:'), el('span',{},a.cpf)]) : null,
      a.email  ? el('div',{style:{fontSize:'12px',color:'var(--text2)',display:'flex',gap:'6px'}},[el('span',{style:{color:'var(--text3)',width:'80px',flexShrink:'0'}},'E-mail:'), el('span',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},a.email)]) : null,
      a.telefone ? el('div',{style:{fontSize:'12px',color:'var(--text2)',display:'flex',gap:'6px'}},[el('span',{style:{color:'var(--text3)',width:'80px',flexShrink:'0'}},'Telefone:'), el('span',{},a.telefone)]) : null,
    ].filter(Boolean);

    return el('div',{class:'card',style:{padding:'16px 18px'}},[
      el('div',{style:{display:'flex',gap:'14px',alignItems:'flex-start',marginBottom:'14px'}},[
        el('div',{style:{
          width:'52px',height:'52px',borderRadius:'14px',flexShrink:'0',
          background:'rgba('+rgb+',0.12)',border:'2px solid '+cor,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontWeight:'800',fontSize:'18px',color:cor,
        }},initials),
        el('div',{style:{flex:'1',minWidth:'0'}},[
          el('div',{style:{fontWeight:'800',fontSize:'15px',color:'var(--text)',marginBottom:'4px'}},a.nome),
          el('span',{style:{
            display:'inline-block',fontSize:'10px',fontWeight:'700',
            background:'rgba('+rgb+',0.12)',color:cor,
            borderRadius:'20px',padding:'2px 8px',
          }},a.cargo||'Sócio'),
          a.participacao ? el('span',{style:{fontSize:'11px',color:'var(--text3)',marginLeft:'8px'}},a.participacao+'% da sociedade') : null,
        ].filter(Boolean)),
      ]),
      contatos.length ? el('div',{style:{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'14px',paddingLeft:'2px'}},contatos) : null,
      totalRetirado > 0 ? el('div',{style:{
        background:'rgba(224,82,82,0.08)',border:'1px solid var(--red)',
        borderRadius:'8px',padding:'8px 12px',marginBottom:'12px',
        display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'12px',
      }},[
        el('span',{style:{color:'var(--text3)'}},'💸 Total retirado (histórico)'),
        el('strong',{style:{color:'var(--red)'}},fmtMoney(totalRetirado)),
      ]) : null,
      el('div',{style:{display:'flex',gap:'6px',paddingTop:'12px',borderTop:'1px solid var(--border)'}},[
        btn('btn-primary','💸 Retirada',function(){
          setState({modal:{tipo:'pagar',editItem:{
            descricao:'Retirada de Sócio — '+a.nome,
            categoria:'Retirada de Sócio',
            fornecedor:a.nome,
            fornecedorId:a.id,
          }}});
        }),
        btn('btn-ghost','✏️ Editar',function(){setState({adminModal:Object.assign({},a)});}),
        btn('btn-ghost','🗑️',function(){
          if(!confirm('Excluir "'+a.nome+'"?'))return;
          var arr=(state.administradores||[]).filter(function(x){return x.id!==a.id;});
          lsSet('administradores',arr);
          setState({administradores:arr});
          scheduleSave();
          showToast(a.nome+' removido','error');
        }),
      ]),
    ].filter(Boolean));
  }

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'👤 Administrador & Sócios'),
        el('p',{class:'page-sub'},'Cadastre sócios e administradores para retiradas, adiantamentos e pró-labore'),
      ]),
      btn('btn-primary','+ Cadastrar',function(){setState({adminModal:{cargo:'Sócio'}});}),
    ]),

    el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',marginBottom:'16px'}},[
      el('div',{class:'kpi-card gold'},[
        el('div',{class:'kpi-label'},'Cadastrados'),
        el('div',{class:'kpi-value gold'},String(admins.length)),
        el('div',{class:'kpi-sub'},admins.length===1?'administrador':'administradores'),
      ]),
      totalParticipacao > 0 ? el('div',{class:'kpi-card blue'},[
        el('div',{class:'kpi-label'},'Participação total'),
        el('div',{class:'kpi-value blue'},totalParticipacao.toFixed(1)+'%'),
        el('div',{class:'kpi-sub'},totalParticipacao===100?'100% mapeado':totalParticipacao+'% de 100%'),
      ]) : null,
      retiradaMes > 0 ? el('div',{class:'kpi-card red'},[
        el('div',{class:'kpi-label'},'Retiradas este mês'),
        el('div',{class:'kpi-value red'},fmtMoney(retiradaMes)),
        el('div',{class:'kpi-sub'},'adiantamentos e pró-labore'),
      ]) : null,
    ].filter(Boolean)),

    el('div',{style:{
      background:'rgba(201,168,76,0.08)',border:'1px solid var(--gold)',
      borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',
      fontSize:'12px',color:'var(--text2)',display:'flex',gap:'10px',alignItems:'flex-start',
    }},[
      el('span',{style:{fontSize:'16px',flexShrink:'0'}},'💡'),
      el('div',{},[
        el('b',{},'Como usar: '),
        el('span',{},'clique em "💸 Retirada" no card do sócio para abrir o lançamento já preenchido. O valor ficará registrado em Despesas com o sócio como destinatário.'),
      ]),
    ]),

    admins.length === 0
      ? el('div',{class:'card',style:{textAlign:'center',padding:'50px 20px'}},[
          el('div',{style:{fontSize:'54px',marginBottom:'14px'}},'👤'),
          el('h3',{style:{marginBottom:'8px',color:'var(--text)',fontWeight:'700'}},'Nenhum administrador cadastrado'),
          el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'20px'}},'Cadastre sócios e administradores para usá-los como destinatários em retiradas e adiantamentos'),
          btn('btn-primary','+ Cadastrar agora',function(){setState({adminModal:{cargo:'Sócio'}});}),
        ])
      : el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'14px'}},
          admins.map(adminCard)),
  ].filter(Boolean));
}
