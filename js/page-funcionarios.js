// ── FUNCIONÁRIOS ──────────────────────────────────────────────────────────────
function renderFuncionarios(){
  var funcionarios=(state.funcionarios||[])
    .filter(function(f){return f.profile===state.profile||!f.profile;});

  // ── MODAL ADD/EDIT ─────────────────────────────────────────────────────────
  if(state.funcionarioModal){
    var m=state.funcionarioModal;
    var ed=m.editItem||{};
    var isEdit=!!ed.id;

    function gf(id){var e=document.getElementById('func-'+id);return e?e.value:'';}

    function buscarCep(){
      var cep=(gf('cep')||'').replace(/\D/g,'');
      if(cep.length!==8){showToast('CEP inválido — informe 8 dígitos','error');return;}
      var btn=document.getElementById('func-cep-btn');
      if(btn){btn.textContent='...';btn.disabled=true;}
      fetch('https://viacep.com.br/ws/'+cep+'/json/')
        .then(function(r){return r.json();})
        .then(function(d){
          if(btn){btn.textContent='Buscar';btn.disabled=false;}
          if(d.erro){showToast('CEP não encontrado','error');return;}
          var set=function(id,v){var e=document.getElementById('func-'+id);if(e)e.value=v||'';};
          set('rua',d.logradouro);set('bairro',d.bairro);set('cidade',d.localidade);set('estado',d.uf);
          showToast('Endereço encontrado!');
          setTimeout(function(){var n=document.getElementById('func-numero');if(n)n.focus();},50);
        }).catch(function(){
          if(btn){btn.textContent='Buscar';btn.disabled=false;}
          showToast('Erro ao buscar CEP','error');
        });
    }

    function saveFunc(){
      var nome=(gf('nome')||'').trim();
      if(!nome){showToast('Informe o nome','error');return;}
      var item={
        id:isEdit?ed.id:('func_'+Date.now()),
        nome:nome,
        cargo:(gf('cargo')||'').trim(),
        status:gf('status')||'ativo',
        cpf:(gf('cpf')||'').trim(),
        rg:(gf('rg')||'').trim(),
        dataAdmissao:gf('dataAdmissao')||'',
        dataNascimento:gf('dataNascimento')||'',
        salario:parseFloat(gf('salario'))||0,
        telefone:(gf('telefone')||'').trim(),
        email:(gf('email')||'').trim(),
        chavePix:(gf('chavePix')||'').trim(),
        banco:(gf('banco')||'').trim(),
        cep:(gf('cep')||'').trim(),
        rua:(gf('rua')||'').trim(),
        numero:(gf('numero')||'').trim(),
        complemento:(gf('complemento')||'').trim(),
        bairro:(gf('bairro')||'').trim(),
        cidade:(gf('cidade')||'').trim(),
        estado:(gf('estado')||'').trim(),
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

    function inp2(id,type,ph,val,extraAttrs){
      var attrs=Object.assign({class:'form-input',type:type||'text',id:'func-'+id,placeholder:ph||''},extraAttrs||{});
      var i=el('input',attrs);
      i.value=val!==undefined&&val!==null?String(val):'';
      return i;
    }

    var statusOpts=[{v:'ativo',l:'✅ Ativo'},{v:'inativo',l:'⛔ Inativo'},{v:'ferias',l:'🏖 Férias'},{v:'afastado',l:'⚕️ Afastado'}];
    var statusSel=el('select',{class:'form-input',id:'func-status'},
      statusOpts.map(function(s){var op=el('option',{value:s.v},s.l);if(s.v===(ed.status||'ativo'))op.selected=true;return op;}));

    function secTitle(icon,label){
      var d2=el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},icon+' '+label);
      return d2;
    }
    function secBox(children){
      var b=el('div',{},children);
      b.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;';
      return b;
    }
    function grid2(a,b){var g=el('div',{},[a,b]);g.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;';return g;}
    function fg(label,inp){return div('form-group',[el('label',{class:'form-label'},label),inp]);}

    var cepRow=el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'12px'}},[
      el('div',{style:{flex:'1'}},[el('label',{class:'form-label'},'CEP'),inp2('cep','text','00000-000',ed.cep||'',{onkeydown:function(e){if(e.key==='Enter'){e.preventDefault();buscarCep();}}})]),
      el('button',{id:'func-cep-btn',class:'btn-ghost',style:{whiteSpace:'nowrap',padding:'8px 14px'},onclick:buscarCep},'Buscar'),
    ]);

    var mEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEdit?'Editar':'Novo')+' funcionário'),
        el('button',{class:'modal-close',onclick:function(){setState({funcionarioModal:null});}},'×'),
      ]),

      secBox([
        secTitle('👤','Dados pessoais'),
        grid2(fg('Nome completo *',inp2('nome','text','Nome do funcionário',ed.nome||'')),fg('Cargo / Função',inp2('cargo','text','Ex: Atendente, Cozinheiro...',ed.cargo||''))),
        grid2(fg('Status',statusSel),fg('CPF',inp2('cpf','text','000.000.000-00',ed.cpf||''))),
        grid2(fg('RG',inp2('rg','text','00.000.000-0',ed.rg||'')),fg('Data de nascimento',inp2('dataNascimento','date','',ed.dataNascimento||''))),
      ]),

      secBox([
        secTitle('💼','Vínculo empregatício'),
        grid2(fg('Data de admissão',inp2('dataAdmissao','date','',ed.dataAdmissao||'')),fg('Salário base (R$)',inp2('salario','number','0,00',ed.salario||''))),
      ]),

      secBox([
        secTitle('💳','Dados para pagamento'),
        grid2(fg('Chave Pix',inp2('chavePix','text','CPF, e-mail, telefone ou chave aleatória',ed.chavePix||'')),fg('Banco',inp2('banco','text','Ex: Nubank, Itaú, Bradesco...',ed.banco||''))),
      ]),

      secBox([
        secTitle('📞','Contato'),
        grid2(fg('Telefone',inp2('telefone','tel','(00) 00000-0000',ed.telefone||'')),fg('E-mail',inp2('email','email','funcionario@email.com',ed.email||''))),
      ]),

      secBox([
        secTitle('📍','Endereço'),
        cepRow,
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 90px',gap:'12px',marginBottom:'12px'}},[
          fg('Rua / Avenida',inp2('rua','text','Nome da rua, avenida...',ed.rua||'')),
          fg('Número',inp2('numero','text','Nº',ed.numero||'')),
        ]),
        grid2(fg('Complemento',inp2('complemento','text','Apto, Bloco, Casa...',ed.complemento||'')),fg('Bairro',inp2('bairro','text','Bairro',ed.bairro||''))),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 70px',gap:'12px'}},[
          fg('Cidade',inp2('cidade','text','Cidade',ed.cidade||'')),
          fg('UF',inp2('estado','text','UF',ed.estado||'')),
        ]),
      ]),

      div('form-group',[
        el('label',{class:'form-label'},'Observações'),
        el('textarea',{class:'form-input',id:'func-notas',rows:'2',placeholder:'Benefícios, acordos, observações gerais...',style:{resize:'vertical'}},ed.notas||''),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({funcionarioModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'➕ Cadastrar',saveFunc),
      ]),
    ]);
    mEl.style.maxWidth='560px';
    var ov=div('modal-overlay',[mEl]);
    ov.onclick=function(e){if(e.target===ov)setState({funcionarioModal:null});};
    setTimeout(function(){var i=document.getElementById('func-nome');if(i)i.focus();},50);
    return ov;
  }

  // ── CÁLCULOS ────────────────────────────────────────────────────────────────
  var ativos=funcionarios.filter(function(f){return f.status==='ativo';});
  var folhaMensal=ativos.reduce(function(s,f){return s+(f.salario||0);},0);
  var STATUS_COLOR={ativo:'var(--green)',inativo:'var(--text3)',ferias:'var(--gold)',afastado:'var(--red)'};
  var STATUS_LABEL={ativo:'Ativo',inativo:'Inativo',ferias:'Férias',afastado:'Afastado'};

  var kpis=funcionarios.length>0?el('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'20px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total'),el('div',{class:'kpi-value'},String(funcionarios.length)),el('div',{class:'kpi-sub'},'cadastrados')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Ativos'),el('div',{class:'kpi-value green'},String(ativos.length)),el('div',{class:'kpi-sub'},'em atividade')]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Folha mensal'),el('div',{class:'kpi-value'},fmtMoney(folhaMensal)),el('div',{class:'kpi-sub'},'somente ativos')]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Outros'),el('div',{class:'kpi-value',style:{fontSize:'16px'}},[
      funcionarios.filter(function(f){return f.status==='ferias';}).length+' férias',
      el('span',{style:{color:'var(--border)',margin:'0 5px'}},'·'),
      funcionarios.filter(function(f){return f.status==='afastado';}).length+' afastado',
    ]),el('div',{class:'kpi-sub'},'situação atual')]),
  ]):null;

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
    var enderecoStr=[f.cidade,f.estado].filter(Boolean).join('/');
    return el('tr',{
      style:{borderBottom:'1px solid var(--border)'},
      onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){e.currentTarget.style.background='';},
    },[
      el('td',{style:{padding:'10px 14px'}},[
        el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)'}},f.nome),
        f.cargo?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},f.cargo):null,
        enderecoStr?el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},'📍 '+enderecoStr):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'10px 14px'}},[
        el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'3px 10px',borderRadius:'10px',
          background:(STATUS_COLOR[f.status]||'var(--text3)')+'22',
          color:STATUS_COLOR[f.status]||'var(--text3)'}},
          STATUS_LABEL[f.status]||f.status||'—'),
      ]),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},admStr||'—'),
      el('td',{style:{padding:'10px 14px',fontSize:'13px',fontWeight:'600',color:f.salario?'var(--text)':'var(--text3)'}},
        f.salario?fmtMoney(f.salario):'—'),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},[
        f.chavePix?el('div',{},[el('span',{},'Pix: '),el('span',{style:{fontWeight:'500',color:'var(--text)'}},f.chavePix)]):null,
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
          el('p',{},'Gerencie sua equipe, salários, dados pessoais e de pagamento'),
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
              'Cadastre seus funcionários para controlar a equipe, salários e dados completos.'),
            btn('btn-primary','➕ Cadastrar primeiro funcionário',function(){setState({funcionarioModal:{}});}),
          ])
        :el('div',{style:{overflowX:'auto'}},[
            el('div',{style:{marginBottom:'10px',fontSize:'12px',color:'var(--text3)'}},
              funcionarios.length+' funcionário'+(funcionarios.length!==1?'s':'')+' · ordenados por situação e nome'),
            el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
              el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
                'Nome / Cargo','Status','Admissão','Salário','Pix / Banco','Contato','',
              ].map(function(h){return el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},h);}))]),
              el('tbody',{},rows),
            ]),
          ]),
    ]),
  ]);
}
