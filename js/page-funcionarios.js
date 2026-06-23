// ── FUNCIONÁRIOS ──────────────────────────────────────────────────────────────
function renderFuncionarios(){
  var funcionarios=(state.funcionarios||[])
    .filter(function(f){return !f.profile||f.profile===state.profile;});

  // ── MODAL ADD/EDIT ─────────────────────────────────────────────────────────
  if(state.funcionarioModal){
    var m=state.funcionarioModal;
    var ed=m.editItem||{};
    var isEdit=!!ed.id;

    function gf(id){var e=document.getElementById('func-'+id);return e?e.value:'';}

    function saveFunc(){
      var nome=(gf('nome')||'').trim();
      if(!nome){showToast('Informe o nome','error');return;}
      var item={
        id:isEdit?ed.id:('func_'+Date.now()),
        nome:nome,
        cargo:(gf('cargo')||'').trim(),
        status:gf('status')||'ativo',
        cpf:(gf('cpf')||'').trim(),
        dataAdmissao:gf('dataAdmissao')||'',
        salario:parseFloat(gf('salario'))||0,
        telefone:(gf('telefone')||'').trim(),
        email:(gf('email')||'').trim(),
        chavePix:(gf('chavePix')||'').trim(),
        banco:(gf('banco')||'').trim(),
        notas:(gf('notas')||'').trim(),
        profile:state.profile,
      };
      var arr=isEdit
        ?(state.funcionarios||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.funcionarios||[]).concat([item]);
      lsSet('funcionarios',arr);
      setState({funcionarios:arr,funcionarioModal:null});
      scheduleSave();
      showToast(isEdit?'Funcionário atualizado!':'Funcionário cadastrado!');
    }

    function inp2(id,type,ph,val){
      var i=el('input',{class:'form-input',type:type||'text',id:'func-'+id,placeholder:ph||''});
      i.value=val!==undefined&&val!==null?String(val):'';
      return i;
    }

    var statusOpts=[
      {v:'ativo',    l:'✅ Ativo'},
      {v:'inativo',  l:'⛔ Inativo'},
      {v:'ferias',   l:'🏖 Férias'},
      {v:'afastado', l:'⚕️ Afastado'},
    ];
    var statusSel=el('select',{class:'form-input',id:'func-status'},
      statusOpts.map(function(s){
        var op=el('option',{value:s.v},s.l);
        if(s.v===(ed.status||'ativo'))op.selected=true;
        return op;
      }));

    var mEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEdit?'Editar':'Novo')+' funcionário'),
        el('button',{class:'modal-close',onclick:function(){setState({funcionarioModal:null});}},'×'),
      ]),

      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Nome completo *'),inp2('nome','text','Nome do funcionário',ed.nome||'')]),
        div('form-group',[el('label',{class:'form-label'},'Cargo / Função'),inp2('cargo','text','Ex: Atendente, Cozinheiro...',ed.cargo||'')]),
      ]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Status'),statusSel]),
        div('form-group',[el('label',{class:'form-label'},'CPF'),inp2('cpf','text','000.000.000-00',ed.cpf||'')]),
      ]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Data de admissão'),inp2('dataAdmissao','date','',ed.dataAdmissao||'')]),
        div('form-group',[el('label',{class:'form-label'},'Salário base (R$)'),inp2('salario','number','0,00',ed.salario||'')]),
      ]),

      el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:'14px'}},[
        el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},'💳 Dados para pagamento'),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          div('form-group',[el('label',{class:'form-label'},'Chave Pix'),inp2('chavePix','text','CPF, e-mail, telefone ou chave aleatória',ed.chavePix||'')]),
          div('form-group',[el('label',{class:'form-label'},'Banco'),inp2('banco','text','Ex: Nubank, Itaú, Bradesco...',ed.banco||'')]),
        ]),
      ]),

      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Telefone'),inp2('telefone','tel','(00) 00000-0000',ed.telefone||'')]),
        div('form-group',[el('label',{class:'form-label'},'E-mail'),inp2('email','email','funcionario@email.com',ed.email||'')]),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Observações'),
        el('textarea',{class:'form-input',id:'func-notas',rows:'2',
          placeholder:'Informações adicionais, benefícios, acordos...',
          style:{resize:'vertical'}},ed.notas||''),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({funcionarioModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'➕ Cadastrar',saveFunc),
      ]),
    ]);
    mEl.style.maxWidth='540px';
    var ov=div('modal-overlay',[mEl]);
    ov.onclick=function(e){if(e.target===ov)setState({funcionarioModal:null});};
    setTimeout(function(){var i=document.getElementById('func-nome');if(i)i.focus();},50);
    return ov;
  }

  // ── CÁLCULOS RÁPIDOS ────────────────────────────────────────────────────────
  var ativos=funcionarios.filter(function(f){return f.status==='ativo';});
  var folhaMensal=ativos.reduce(function(s,f){return s+(f.salario||0);},0);

  // ── KPIS ────────────────────────────────────────────────────────────────────
  var STATUS_COLOR={ativo:'var(--green)',inativo:'var(--text3)',ferias:'var(--gold)',afastado:'var(--red)'};
  var STATUS_LABEL={ativo:'Ativo',inativo:'Inativo',ferias:'Férias',afastado:'Afastado'};

  var kpis=funcionarios.length>0?el('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total cadastrados'),el('div',{class:'kpi-value'},String(funcionarios.length)),el('div',{class:'kpi-sub'},'neste perfil')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Ativos'),el('div',{class:'kpi-value green'},String(ativos.length)),el('div',{class:'kpi-sub'},'em atividade')]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Folha mensal'),el('div',{class:'kpi-value'},fmtMoney(folhaMensal)),el('div',{class:'kpi-sub'},'somente ativos')]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Outros'),el('div',{class:'kpi-value',style:{fontSize:'16px'}},[
      funcionarios.filter(function(f){return f.status==='ferias';}).length+' férias',
      el('span',{style:{color:'var(--border)',margin:'0 5px'}},' · '),
      funcionarios.filter(function(f){return f.status==='afastado';}).length+' afastado',
    ]),el('div',{class:'kpi-sub'},'situação atual')]),
  ]):null;

  // ── LISTA ──────────────────────────────────────────────────────────────────
  var sorted=funcionarios.slice().sort(function(a,b){
    var ord={ativo:0,ferias:1,afastado:2,inativo:3};
    var diff=(ord[a.status]||0)-(ord[b.status]||0);
    return diff!==0?diff:a.nome.localeCompare(b.nome);
  });

  var rows=sorted.map(function(f){
    var admStr='';
    if(f.dataAdmissao){
      var d=new Date(f.dataAdmissao+'T12:00:00');
      var meses=Math.floor((new Date()-d)/(1000*60*60*24*30.4));
      admStr=fmtDate(f.dataAdmissao)+(meses>0?' ('+meses+'m)':'');
    }
    return el('tr',{
      style:{borderBottom:'1px solid var(--border)'},
      onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){e.currentTarget.style.background='';},
    },[
      el('td',{style:{padding:'10px 14px'}},[
        el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)'}},f.nome),
        f.cargo?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},f.cargo):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'10px 14px'}},[
        el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'10px',
          background:STATUS_COLOR[f.status]+'22'||'var(--bg3)',
          color:STATUS_COLOR[f.status]||'var(--text3)'}},
          STATUS_LABEL[f.status]||f.status||'—'),
      ]),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},admStr||'—'),
      el('td',{style:{padding:'10px 14px',fontSize:'13px',fontWeight:'600',color:f.salario?'var(--text)':'var(--text3)'}},
        f.salario?fmtMoney(f.salario):'—'),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},[
        f.chavePix?el('div',{},[el('span',{style:{color:'var(--text3)'}},'Pix: '),el('span',{style:{fontWeight:'500',color:'var(--text)'}},f.chavePix)]):null,
        f.banco?el('div',{style:{fontSize:'11px',marginTop:'2px'}},f.banco):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},[
        f.telefone?el('div',{},f.telefone):null,
        f.email?el('div',{style:{fontSize:'11px',marginTop:'2px'}},f.email):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'8px 10px',textAlign:'right'}},[
        el('div',{style:{display:'flex',gap:'6px',justifyContent:'flex-end'}},[
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({funcionarioModal:{editItem:f}});}},'✏️'),
          el('button',{class:'btn-icon delete',title:'Excluir',onclick:function(){
            if(window.confirm('Excluir "'+f.nome+'"?\nEsta ação não pode ser desfeita.')){
              var arr=(state.funcionarios||[]).filter(function(x){return x.id!==f.id;});
              lsSet('funcionarios',arr);setState({funcionarios:arr});scheduleSave();
              showToast('Funcionário removido','error');
            }
          }},'🗑'),
        ]),
      ]),
    ]);
  });

  return div('',[
    div('page-header',[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},[
        el('div',{},[
          el('h1',{},'👥 Funcionários'),
          el('p',{},'Gerencie sua equipe, salários e dados de pagamento'),
        ]),
        funcionarios.length>0?btn('btn-primary','➕ Novo funcionário',function(){setState({funcionarioModal:{}});}):null,
      ].filter(Boolean)),
    ]),

    kpis,

    div('card',[
      funcionarios.length===0
        ?div('empty',[
            div('empty-icon','👥'),
            div('empty-title','Nenhum funcionário cadastrado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},
              'Cadastre seus funcionários para controlar equipe, salários e dados de pagamento.'),
            btn('btn-primary','➕ Cadastrar primeiro funcionário',function(){setState({funcionarioModal:{}});}),
          ])
        :el('div',{style:{overflowX:'auto'}},[
            el('div',{style:{marginBottom:'10px',fontSize:'12px',color:'var(--text3)'}},[
              el('span',{},funcionarios.length+' funcionário'+(funcionarios.length!==1?'s':'')+' · ordenados por situação e nome'),
            ]),
            el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
              el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Nome / Cargo'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Status'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Admissão'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Salário'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Pix / Banco'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Contato'),
                el('th',{}),
              ])]),
              el('tbody',{},rows),
            ]),
          ]),
    ]),
  ]);
}
