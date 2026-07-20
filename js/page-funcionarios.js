// ── FUNCIONÁRIOS ──────────────────────────────────────────────────────────────

var _EXAME_TIPOS = ['Admissional','Demissional','Periódico','Retorno ao Trabalho','Mudança de Função'];
var _EXAME_RESULTADOS = [
  {v:'apto',l:'Apto'},
  {v:'apto_restricao',l:'Apto c/ Restrição'},
  {v:'inapto',l:'Inapto'},
  {v:'pendente',l:'Pendente'},
];

function _exameStatusInfo(exame) {
  if (!exame.dataVencimento) return {label:'Sem prazo',cor:'var(--text3)',bg:'var(--bg3)'};
  var hj = today();
  var d30 = new Date(hj + 'T12:00:00');
  d30.setDate(d30.getDate() + 30);
  var d30str = d30.toISOString().slice(0,10);
  if (exame.dataVencimento < hj) return {label:'Vencido',cor:'#e05252',bg:'#e0525222'};
  if (exame.dataVencimento <= d30str) return {label:'A vencer',cor:'var(--gold)',bg:'#c9a84c22'};
  return {label:'Em dia',cor:'#00a86b',bg:'#00a86b22'};
}

function _feriasStatusInfo(fv) {
  var hj = today();
  if (fv.cancelada) return {label:'Cancelada',cor:'var(--text3)',bg:'var(--bg3)'};
  if (fv.dataInicio <= hj && fv.dataFim >= hj) return {label:'Em andamento',cor:'#5599ff',bg:'#5599ff22'};
  if (fv.dataInicio > hj) return {label:'Programada',cor:'var(--gold)',bg:'#c9a84c22'};
  return {label:'Concluída',cor:'#00a86b',bg:'#00a86b22'};
}

function _calcDiasFerias(inicio, fim) {
  if (!inicio || !fim) return 0;
  var d1 = new Date(inicio + 'T12:00:00');
  var d2 = new Date(fim + 'T12:00:00');
  return Math.max(0, Math.round((d2 - d1) / (1000*60*60*24)) + 1);
}

function _funcNomePorId(id, lista) {
  var f = (lista||[]).find(function(x){return x.id===id;});
  return f ? f.nome : '—';
}

function _mesesDesde(dateStr) {
  if (!dateStr) return 0;
  var d = new Date(dateStr + 'T12:00:00');
  return Math.floor((new Date() - d) / (1000*60*60*24*30.4));
}

function renderFuncionarios() {
  var pf = state.profile;
  var funcTab = state.funcTab || 'funcionarios';
  var hj = today();
  var funcionarios = (state.funcionarios||[]).filter(function(f){return f.profile===pf||!f.profile;});
  var feriasList   = (state.feriasFuncionarios||[]).filter(function(f){return f.profile===pf;});
  var examesList   = (state.examesFuncionarios||[]).filter(function(f){return f.profile===pf;});

  // ── MODAL FUNCIONÁRIO ─────────────────────────────────────────────────────
  if (state.funcionarioModal) {
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
        nome:nome,cargo:(gf('cargo')||'').trim(),status:gf('status')||'ativo',
        cpf:(gf('cpf')||'').trim(),rg:(gf('rg')||'').trim(),
        dataAdmissao:gf('dataAdmissao')||'',dataNascimento:gf('dataNascimento')||'',
        salario:parseFloat(gf('salario'))||0,telefone:(gf('telefone')||'').trim(),
        email:(gf('email')||'').trim(),chavePix:(gf('chavePix')||'').trim(),
        banco:(gf('banco')||'').trim(),cep:(gf('cep')||'').trim(),
        rua:(gf('rua')||'').trim(),numero:(gf('numero')||'').trim(),
        complemento:(gf('complemento')||'').trim(),bairro:(gf('bairro')||'').trim(),
        cidade:(gf('cidade')||'').trim(),estado:(gf('estado')||'').trim(),
        notas:(gf('notas')||'').trim(),profile:state.profile,
      };
      var arr=isEdit
        ?(state.funcionarios||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.funcionarios||[]).concat([item]);
      lsSet('funcionarios',arr);setState({funcionarios:arr,funcionarioModal:null});scheduleSave();
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
      return el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},icon+' '+label);
    }
    function secBox(children){var b=el('div',{},children);b.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;';return b;}
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
      secBox([secTitle('👤','Dados pessoais'),
        grid2(fg('Nome completo *',inp2('nome','text','Nome do funcionário',ed.nome||'')),fg('Cargo / Função',inp2('cargo','text','Ex: Atendente, Cozinheiro...',ed.cargo||''))),
        grid2(fg('Status',statusSel),fg('CPF',inp2('cpf','text','000.000.000-00',ed.cpf||''))),
        grid2(fg('RG',inp2('rg','text','00.000.000-0',ed.rg||'')),fg('Data de nascimento',inp2('dataNascimento','date','',ed.dataNascimento||''))),
      ]),
      secBox([secTitle('💼','Vínculo empregatício'),
        grid2(fg('Data de admissão',inp2('dataAdmissao','date','',ed.dataAdmissao||'')),fg('Salário base (R$)',inp2('salario','number','0,00',ed.salario||''))),
      ]),
      secBox([secTitle('💳','Dados para pagamento'),
        grid2(fg('Chave Pix',inp2('chavePix','text','CPF, e-mail, telefone ou chave aleatória',ed.chavePix||'')),fg('Banco',inp2('banco','text','Ex: Nubank, Itaú, Bradesco...',ed.banco||''))),
      ]),
      secBox([secTitle('📞','Contato'),
        grid2(fg('Telefone',inp2('telefone','tel','(00) 00000-0000',ed.telefone||'')),fg('E-mail',inp2('email','email','funcionario@email.com',ed.email||''))),
      ]),
      secBox([secTitle('📍','Endereço'),cepRow,
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 90px',gap:'12px',marginBottom:'12px'}},[
          fg('Rua / Avenida',inp2('rua','text','Nome da rua, avenida...',ed.rua||'')),
          fg('Número',inp2('numero','text','Nº',ed.numero||'')),
        ]),
        grid2(fg('Complemento',inp2('complemento','text','Apto, Bloco, Casa...',ed.complemento||'')),fg('Bairro',inp2('bairro','text','Bairro',ed.bairro||''))),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 70px',gap:'12px'}},[
          fg('Cidade',inp2('cidade','text','Cidade',ed.cidade||'')),fg('UF',inp2('estado','text','UF',ed.estado||'')),
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

  // ── MODAL FÉRIAS ──────────────────────────────────────────────────────────
  if (state.feriasModal) {
    var mfv = state.feriasModal;
    var efv  = mfv.editItem || {};
    var isEditFv = !!efv.id;

    function gff(id){var e=document.getElementById('fv-'+id);return e?e.value:'';}

    function updateDias(){
      var ini=gff('inicio'), fim=gff('fim');
      var el2=document.getElementById('fv-dias-preview');
      if(el2){
        var d=_calcDiasFerias(ini,fim);
        el2.textContent=d>0?d+' dias corridos':'—';
        el2.style.color=d>30?'#e05252':d>0?'#00a86b':'var(--text3)';
      }
    }

    function saveFerias(){
      var funcId=gff('func'), inicio=gff('inicio'), fim=gff('fim');
      if(!funcId){showToast('Selecione o funcionário','error');return;}
      if(!inicio||!fim){showToast('Informe o período de férias','error');return;}
      if(fim<inicio){showToast('Data final deve ser após a data inicial','error');return;}
      var item={
        id:isEditFv?efv.id:('fv_'+Date.now()),
        funcId:funcId, dataInicio:inicio, dataFim:fim,
        diasCorridos:_calcDiasFerias(inicio,fim),
        cancelada:false,
        notas:(gff('notas')||'').trim(),
        profile:state.profile,
        criadoEm:isEditFv?(efv.criadoEm||hj):hj,
      };
      var arr=isEditFv
        ?(state.feriasFuncionarios||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.feriasFuncionarios||[]).concat([item]);
      lsSet('feriasFuncionarios',arr);
      setState({feriasFuncionarios:arr,feriasModal:null});
      scheduleSave();
      showToast(isEditFv?'Férias atualizadas!':'Férias programadas!');
    }

    var fvFuncOpts=[el('option',{value:''},'— Selecione —')].concat(
      funcionarios.filter(function(f){return f.status!=='inativo';})
        .sort(function(a,b){return a.nome.localeCompare(b.nome);})
        .map(function(f){
          var op=el('option',{value:f.id},f.nome+(f.cargo?' — '+f.cargo:''));
          if(f.id===(efv.funcId||mfv.funcId))op.selected=true;
          return op;
        })
    );
    var fvFuncSel=el('select',{class:'form-input',id:'fv-func'},fvFuncOpts);

    var fvIni=el('input',{class:'form-input',type:'date',id:'fv-inicio'});
    fvIni.value=efv.dataInicio||'';
    fvIni.oninput=updateDias;

    var fvFim=el('input',{class:'form-input',type:'date',id:'fv-fim'});
    fvFim.value=efv.dataFim||'';
    fvFim.oninput=updateDias;

    var diasPreview=el('div',{id:'fv-dias-preview',style:{fontSize:'13px',fontWeight:'600',color:'var(--text3)'}},
      efv.diasCorridos?efv.diasCorridos+' dias corridos':'—');

    var fvEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEditFv?'Editar':'Programar')+' férias'),
        el('button',{class:'modal-close',onclick:function(){setState({feriasModal:null});}},'×'),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Funcionário *'),fvFuncSel]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Data de início *'),fvIni]),
        div('form-group',[el('label',{class:'form-label'},'Data de retorno *'),fvFim]),
      ]),
      el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',padding:'10px 14px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px'}},[
        el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Duração:'),
        diasPreview,
        el('span',{style:{fontSize:'11px',color:'var(--text3)',marginLeft:'auto'}},'CLT: máx. 30 dias corridos'),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Observações'),
        el('textarea',{class:'form-input',id:'fv-notas',rows:'2',placeholder:'Abono pecuniário, parcelamento, acordos...',style:{resize:'vertical'}},efv.notas||''),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({feriasModal:null});}),
        btn('btn-primary',isEditFv?'💾 Salvar':'🏖 Programar',saveFerias),
      ]),
    ]);
    fvEl.style.maxWidth='460px';
    var fvOv=div('modal-overlay',[fvEl]);
    fvOv.onclick=function(e){if(e.target===fvOv)setState({feriasModal:null});};
    setTimeout(updateDias,50);
    return fvOv;
  }

  // ── MODAL EXAME ───────────────────────────────────────────────────────────
  if (state.exameModal) {
    var mex = state.exameModal;
    var eex  = mex.editItem || {};
    var isEditEx = !!eex.id;

    function gfe(id){var e=document.getElementById('ex-'+id);return e?e.value:'';}

    function exUpdateVenc(){
      var dataEx=gfe('data');
      var periMeses=parseInt(gfe('periodicidade'))||0;
      var vEl=document.getElementById('ex-venc-preview');
      var vInp=document.getElementById('ex-dataVencimento');
      if(dataEx && periMeses>0){
        var d=new Date(dataEx+'T12:00:00');
        d.setMonth(d.getMonth()+periMeses);
        var vs=d.toISOString().slice(0,10);
        if(vInp)vInp.value=vs;
        if(vEl){vEl.textContent='Vencimento: '+fmtDate(vs);vEl.style.color=vs<hj?'#e05252':'var(--gold)';}
      } else if(vEl){vEl.textContent='';}
    }

    function saveExame(){
      var funcId=gfe('func'),tipo=gfe('tipo'),dataEx=gfe('data');
      if(!funcId){showToast('Selecione o funcionário','error');return;}
      if(!tipo){showToast('Selecione o tipo de exame','error');return;}
      if(!dataEx){showToast('Informe a data do exame','error');return;}
      var item={
        id:isEditEx?eex.id:('ex_'+Date.now()),
        funcId:funcId, tipo:tipo, dataExame:dataEx,
        periodicidade:parseInt(gfe('periodicidade'))||0,
        dataVencimento:gfe('dataVencimento')||'',
        resultado:gfe('resultado')||'pendente',
        medico:(gfe('medico')||'').trim(),
        crm:(gfe('crm')||'').trim(),
        clinica:(gfe('clinica')||'').trim(),
        notas:(gfe('notas')||'').trim(),
        profile:state.profile,
        criadoEm:isEditEx?(eex.criadoEm||hj):hj,
      };
      var arr=isEditEx
        ?(state.examesFuncionarios||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.examesFuncionarios||[]).concat([item]);
      lsSet('examesFuncionarios',arr);
      setState({examesFuncionarios:arr,exameModal:null});
      scheduleSave();
      showToast(isEditEx?'Exame atualizado!':'Exame cadastrado!');
    }

    function exInp(id,type,ph,val){
      var i=el('input',{class:'form-input',type:type||'text',id:'ex-'+id,placeholder:ph||''});
      i.value=val!==undefined&&val!==null?String(val):'';
      return i;
    }

    var exFuncOpts=[el('option',{value:''},'— Selecione —')].concat(
      funcionarios.sort(function(a,b){return a.nome.localeCompare(b.nome);}).map(function(f){
        var op=el('option',{value:f.id},f.nome+(f.cargo?' — '+f.cargo:''));
        if(f.id===(eex.funcId||mex.funcId))op.selected=true;
        return op;
      })
    );
    var exFuncSel=el('select',{class:'form-input',id:'ex-func'},exFuncOpts);

    var exTipoOpts=[el('option',{value:''},'— Selecione —')].concat(
      _EXAME_TIPOS.map(function(t){
        var op=el('option',{value:t},t);
        if(t===eex.tipo)op.selected=true;
        return op;
      })
    );
    var exTipoSel=el('select',{class:'form-input',id:'ex-tipo'},exTipoOpts);
    exTipoSel.onchange=function(){
      var row=document.getElementById('ex-perio-row');
      if(row)row.style.display=this.value==='Periódico'?'block':'none';
    };

    var exResuOpts=_EXAME_RESULTADOS.map(function(r){
      var op=el('option',{value:r.v},r.l);
      if(r.v===(eex.resultado||'pendente'))op.selected=true;
      return op;
    });
    var exResuSel=el('select',{class:'form-input',id:'ex-resultado'},exResuOpts);

    var exDataInp=exInp('data','date','',eex.dataExame||'');
    exDataInp.oninput=exUpdateVenc;

    var exPeriInp=exInp('periodicidade','number','Ex: 12 para anual',eex.periodicidade||12);
    exPeriInp.min='1';exPeriInp.max='60';
    exPeriInp.oninput=exUpdateVenc;

    var exVencInp=exInp('dataVencimento','date','',eex.dataVencimento||'');
    var exVencPreview=el('div',{id:'ex-venc-preview',style:{fontSize:'11px',marginTop:'4px',color:'var(--gold)'}},
      eex.dataVencimento?'Vencimento: '+fmtDate(eex.dataVencimento):'');

    var exPerioRow=el('div',{id:'ex-perio-row',style:{display:eex.tipo==='Periódico'?'block':'none'}},[
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Periodicidade (meses)'),exPeriInp]),
        div('form-group',[el('label',{class:'form-label'},'Data de vencimento'),exVencInp,exVencPreview]),
      ]),
    ]);

    var exEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEditEx?'Editar':'Novo')+' exame ocupacional'),
        el('button',{class:'modal-close',onclick:function(){setState({exameModal:null});}},'×'),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Funcionário *'),exFuncSel]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Tipo de exame *'),exTipoSel]),
        div('form-group',[el('label',{class:'form-label'},'Data do exame *'),exDataInp]),
      ]),
      exPerioRow,
      div('form-group',[el('label',{class:'form-label'},'Resultado'),exResuSel]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Médico responsável'),exInp('medico','text','Dr. Nome...',eex.medico||'')]),
        div('form-group',[el('label',{class:'form-label'},'CRM'),exInp('crm','text','CRM/UF 000000',eex.crm||'')]),
        div('form-group',[el('label',{class:'form-label'},'Clínica'),exInp('clinica','text','Nome da clínica',eex.clinica||'')]),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Observações'),
        el('textarea',{class:'form-input',id:'ex-notas',rows:'2',placeholder:'Restrições, laudos, informações relevantes...',style:{resize:'vertical'}},eex.notas||''),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({exameModal:null});}),
        btn('btn-primary',isEditEx?'💾 Salvar':'🩺 Cadastrar',saveExame),
      ]),
    ]);
    exEl.style.maxWidth='520px';
    var exOv=div('modal-overlay',[exEl]);
    exOv.onclick=function(e){if(e.target===exOv)setState({exameModal:null});};
    return exOv;
  }

  // ── CÁLCULOS BASE ─────────────────────────────────────────────────────────
  var ativos = funcionarios.filter(function(f){return f.status==='ativo';});
  var STATUS_COLOR={ativo:'var(--green)',inativo:'var(--text3)',ferias:'var(--gold)',afastado:'var(--red)'};
  var STATUS_LABEL={ativo:'Ativo',inativo:'Inativo',ferias:'Férias',afastado:'Afastado'};

  // Sugestões de férias
  var cutoff12 = new Date(hj+'T12:00:00');
  cutoff12.setFullYear(cutoff12.getFullYear()-1);
  var cutoff12str = cutoff12.toISOString().slice(0,10);
  var feriasNecessarias = ativos.filter(function(f){
    if(!f.dataAdmissao) return false;
    if(_mesesDesde(f.dataAdmissao)<12) return false;
    return !feriasList.some(function(fv){
      return fv.funcId===f.id && !fv.cancelada && fv.dataFim>=cutoff12str;
    });
  });

  // Alertas de exames
  var examesVencidos = examesList.filter(function(e){return _exameStatusInfo(e).label==='Vencido';}).length;
  var examesAVencer  = examesList.filter(function(e){return _exameStatusInfo(e).label==='A vencer';}).length;

  // ── TABS ──────────────────────────────────────────────────────────────────
  var tabDefs = [
    {id:'funcionarios', label:'👥 Funcionários', badge:0},
    {id:'ferias',       label:'🏖 Férias',       badge:feriasNecessarias.length, badgeColor:'var(--gold)'},
    {id:'exames',       label:'🩺 Exames',       badge:examesVencidos+examesAVencer, badgeColor:examesVencidos>0?'#e05252':'var(--gold)'},
    {id:'folha',        label:'💰 Folha',         badge:0},
  ];
  var tabsEl=el('div',{style:{display:'flex',gap:'0',borderBottom:'2px solid var(--border)',marginBottom:'20px'}},
    tabDefs.map(function(t){
      var isActive=funcTab===t.id;
      var children=[t.label];
      if(t.badge>0){
        children.push(el('span',{style:{
          background:t.badgeColor,color:'#fff',borderRadius:'10px',
          fontSize:'10px',fontWeight:'700',padding:'1px 6px',marginLeft:'6px',
        }},String(t.badge)));
      }
      return el('button',{
        style:{
          background:'none',border:'none',cursor:'pointer',padding:'8px 18px',
          fontSize:'13px',fontWeight:isActive?'700':'500',
          color:isActive?'var(--primary)':'var(--text2)',
          borderBottom:isActive?'2px solid var(--primary)':'2px solid transparent',
          marginBottom:'-2px',display:'flex',alignItems:'center',gap:'0',
        },
        onclick:function(){setState({funcTab:t.id});},
      },children);
    })
  );

  // ── ACTION BUTTON ─────────────────────────────────────────────────────────
  var actionBtn=null;
  if(funcTab==='funcionarios'&&funcionarios.length>0){
    actionBtn=btn('btn-primary','➕ Novo funcionário',function(){setState({funcionarioModal:{},funcTab:'funcionarios'});});
  } else if(funcTab==='ferias'){
    actionBtn=btn('btn-primary','🏖 Programar férias',function(){setState({feriasModal:{}});});
  } else if(funcTab==='exames'){
    actionBtn=btn('btn-primary','🩺 Novo exame',function(){setState({exameModal:{}});});
  } else if(funcTab==='folha'){
    var _folhaMesBtn = state.folhaMes || today().slice(0,7);
    actionBtn = el('div',{style:{display:'flex',gap:'8px'}},[
      btn('btn-ghost','🖨 Exportar PDF',function(){_exportFolhaPDF(ativos,state.folhaMes||(today().slice(0,7)));}),
      btn('btn-primary','💵 Adiantamentos',function(){setState({adiantamentoModal:{mes:state.folhaMes||today().slice(0,7)}});}),
    ]);
  }

  // ── CONTEÚDO: FUNCIONÁRIOS ────────────────────────────────────────────────
  var contentEl;

  if(funcTab==='funcionarios'){
    var folhaMensal=ativos.reduce(function(s,f){return s+(f.salario||0);},0);
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
        var d2=new Date(f.dataAdmissao+'T12:00:00');
        var meses=Math.floor((new Date()-d2)/(1000*60*60*24*30.4));
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
            el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({funcionarioModal:{editItem:f}});}}, '✏️'),
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

    contentEl=div('',[
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

  // ── CONTEÚDO: FÉRIAS ──────────────────────────────────────────────────────
  } else if(funcTab==='ferias'){
    var fvSorted=feriasList.slice().sort(function(a,b){return (b.dataInicio||'').localeCompare(a.dataInicio||'');});

    var numFvAndamento=feriasList.filter(function(v){return _feriasStatusInfo(v).label==='Em andamento';}).length;
    var numFvProgram  =feriasList.filter(function(v){return _feriasStatusInfo(v).label==='Programada';}).length;
    var numFvConcluid =feriasList.filter(function(v){return _feriasStatusInfo(v).label==='Concluída';}).length;

    var kpiFv=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'16px'}},[
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total registradas'),el('div',{class:'kpi-value'},String(feriasList.length)),el('div',{class:'kpi-sub'},'histórico')]),
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Em andamento'),el('div',{class:'kpi-value',style:{color:'#5599ff'}},String(numFvAndamento)),el('div',{class:'kpi-sub'},'agora')]),
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Programadas'),el('div',{class:'kpi-value gold'},String(numFvProgram)),el('div',{class:'kpi-sub'},'próximas')]),
      el('div',{class:'kpi-card'+(feriasNecessarias.length>0?' red':'')},[
        el('div',{class:'kpi-label'},'Sugestões CLT'),
        el('div',{class:'kpi-value'+(feriasNecessarias.length>0?' red':'')},String(feriasNecessarias.length)),
        el('div',{class:'kpi-sub'},'precisam de férias'),
      ]),
    ]);

    var sugestoesPainel=feriasNecessarias.length>0?el('div',{style:{
      background:'#c9a84c11',border:'1px solid var(--gold)',borderRadius:'8px',
      padding:'12px 16px',marginBottom:'16px',
    }},[
      el('div',{style:{fontSize:'12px',fontWeight:'700',color:'var(--gold)',marginBottom:'10px'}},
        '⚠️ Funcionários com direito a férias — sem registro nos últimos 12 meses'),
      el('div',{style:{display:'flex',flexDirection:'column',gap:'8px'}},
        feriasNecessarias.map(function(f){
          var mesesAdm=_mesesDesde(f.dataAdmissao);
          var fvFunc=feriasList.filter(function(fv){return fv.funcId===f.id&&!fv.cancelada;});
          fvFunc.sort(function(a,b){return (b.dataFim||'').localeCompare(a.dataFim||'');});
          var ultima=fvFunc[0];
          var mesesSem=ultima?_mesesDesde(ultima.dataFim):mesesAdm;
          var cor=mesesSem>18?'#e05252':'var(--gold)';
          return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',background:'var(--bg)',borderRadius:'6px',padding:'8px 12px'}},[
            el('div',{style:{flex:'1'}},[
              el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)'}},f.nome),
              el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},[
                f.cargo?f.cargo+' · ':'',
                el('span',{style:{color:cor,fontWeight:'600'}},mesesSem+' meses sem férias'),
                ultima?' · Última: '+fmtDate(ultima.dataInicio):' · Nunca usufruiu',
              ]),
            ]),
            (function(ff){
              return el('button',{
                class:'btn-ghost',style:{fontSize:'11px',padding:'4px 10px',whiteSpace:'nowrap'},
                onclick:function(){setState({feriasModal:{funcId:ff.id}});},
              },'🏖 Programar');
            })(f),
          ]);
        })
      ),
    ]):null;

    var fvRows=fvSorted.map(function(fv){
      var stFv=_feriasStatusInfo(fv);
      var fn=_funcNomePorId(fv.funcId,funcionarios);
      var funcObj=funcionarios.find(function(x){return x.id===fv.funcId;});
      return el('tr',{
        style:{borderBottom:'1px solid var(--border)'},
        onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
        onmouseleave:function(e){e.currentTarget.style.background='';},
      },[
        el('td',{style:{padding:'10px 14px'}},[
          el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)'}},fn),
          funcObj&&funcObj.cargo?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},funcObj.cargo):null,
        ].filter(Boolean)),
        el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},fv.dataInicio?fmtDate(fv.dataInicio):'—'),
        el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},fv.dataFim?fmtDate(fv.dataFim):'—'),
        el('td',{style:{padding:'10px 14px',fontSize:'13px',fontWeight:'600',color:'var(--text)',textAlign:'center'}},(fv.diasCorridos||0)+' dias'),
        el('td',{style:{padding:'10px 14px'}},[
          el('span',{style:{fontSize:'11px',fontWeight:'600',padding:'3px 10px',borderRadius:'10px',color:stFv.cor,background:stFv.bg}},stFv.label),
        ]),
        fv.notas?el('td',{style:{padding:'10px 14px',fontSize:'11px',color:'var(--text3)',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},fv.notas):el('td',{},''),
        el('td',{style:{padding:'8px 10px',textAlign:'right'}},[
          el('div',{style:{display:'flex',gap:'6px',justifyContent:'flex-end'}},[
            el('button',{class:'btn-icon edit',title:'Editar',onclick:(function(v){return function(){setState({feriasModal:{editItem:v}});};})(fv)},'✏️'),
            el('button',{class:'btn-icon delete',title:'Excluir',onclick:(function(v){return function(){
              if(window.confirm('Excluir férias de "'+_funcNomePorId(v.funcId,funcionarios)+'"?')){
                var arr=(state.feriasFuncionarios||[]).filter(function(x){return x.id!==v.id;});
                lsSet('feriasFuncionarios',arr);setState({feriasFuncionarios:arr});scheduleSave();
                showToast('Registro de férias removido','error');
              }
            };})(fv)},'🗑'),
          ]),
        ]),
      ]);
    });

    contentEl=div('',[
      kpiFv,
      sugestoesPainel,
      div('card',[
        fvSorted.length===0
          ?div('empty',[
            div('empty-icon','🏖'),
            div('empty-title','Nenhum registro de férias'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},
              'Programe e controle as férias da equipe para garantir conformidade com a CLT.'),
          ])
          :el('div',{style:{overflowX:'auto'}},[
            el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
              el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
                'Funcionário','Início','Retorno','Dias','Status','Obs','',
              ].map(function(h){return el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},h);}))]),
              el('tbody',{},fvRows),
            ]),
          ]),
      ]),
    ]);

  // ── CONTEÚDO: EXAMES ──────────────────────────────────────────────────────
  } else if(funcTab==='exames'){
    var exSorted=examesList.slice().sort(function(a,b){return (b.dataExame||'').localeCompare(a.dataExame||'');});
    var numVencidos=examesList.filter(function(e){return _exameStatusInfo(e).label==='Vencido';}).length;
    var numAVencer =examesList.filter(function(e){return _exameStatusInfo(e).label==='A vencer';}).length;
    var numEmDia   =examesList.filter(function(e){return _exameStatusInfo(e).label==='Em dia';}).length;

    var kpiEx=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'16px'}},[
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total'),el('div',{class:'kpi-value'},String(examesList.length)),el('div',{class:'kpi-sub'},'cadastrados')]),
      el('div',{class:'kpi-card'+(numVencidos>0?' red':'')},[el('div',{class:'kpi-label'},'Vencidos'),el('div',{class:'kpi-value'+(numVencidos>0?' red':'')},String(numVencidos)),el('div',{class:'kpi-sub'},'em atraso')]),
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'A vencer (30d)'),el('div',{class:'kpi-value gold'},String(numAVencer)),el('div',{class:'kpi-sub'},'requer atenção')]),
      el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Em dia'),el('div',{class:'kpi-value green'},String(numEmDia)),el('div',{class:'kpi-sub'},'válidos')]),
    ]);

    var exAlerta=examesList.filter(function(e){
      var s=_exameStatusInfo(e).label;return s==='Vencido'||s==='A vencer';
    }).sort(function(a,b){return (a.dataVencimento||'').localeCompare(b.dataVencimento||'');});

    var alertaPainel=exAlerta.length>0?el('div',{style:{
      background:'#e0525211',border:'1px solid #e05252',borderRadius:'8px',
      padding:'12px 16px',marginBottom:'16px',
    }},[
      el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#e05252',marginBottom:'10px'}},
        '🚨 Atenção — exames vencidos ou a vencer em 30 dias'),
      el('div',{style:{display:'flex',flexDirection:'column',gap:'6px'}},
        exAlerta.map(function(ex){
          var stEx=_exameStatusInfo(ex);
          return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',background:'var(--bg)',borderRadius:'6px',padding:'8px 12px'}},[
            el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',color:stEx.cor,background:stEx.bg}},stEx.label),
            el('div',{style:{flex:'1'}},[
              el('span',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)'}},_funcNomePorId(ex.funcId,funcionarios)),
              el('span',{style:{color:'var(--text3)',fontSize:'12px',marginLeft:'8px'}},ex.tipo),
            ]),
            el('span',{style:{fontSize:'12px',color:stEx.cor,fontWeight:'600'}},ex.dataVencimento?fmtDate(ex.dataVencimento):'—'),
            (function(e2){return el('button',{
              class:'btn-ghost',style:{fontSize:'11px',padding:'4px 10px'},
              onclick:function(){setState({exameModal:{editItem:e2}});},
            },'✏️ Atualizar');})(ex),
          ]);
        })
      ),
    ]):null;

    var exRows=exSorted.map(function(ex){
      var stEx=_exameStatusInfo(ex);
      var fn=_funcNomePorId(ex.funcId,funcionarios);
      var funcObj=funcionarios.find(function(x){return x.id===ex.funcId;});
      var resuInfo=_EXAME_RESULTADOS.find(function(r){return r.v===ex.resultado;})||{l:'—'};
      var resuCor=ex.resultado==='apto'?'#00a86b':ex.resultado==='inapto'?'#e05252':ex.resultado==='apto_restricao'?'var(--gold)':'var(--text3)';
      return el('tr',{
        style:{borderBottom:'1px solid var(--border)'},
        onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
        onmouseleave:function(e){e.currentTarget.style.background='';},
      },[
        el('td',{style:{padding:'10px 14px'}},[
          el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)'}},fn),
          funcObj&&funcObj.cargo?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},funcObj.cargo):null,
        ].filter(Boolean)),
        el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},ex.tipo||'—'),
        el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},ex.dataExame?fmtDate(ex.dataExame):'—'),
        el('td',{style:{padding:'10px 14px',fontSize:'12px'}},ex.dataVencimento?[
          el('div',{style:{color:stEx.cor,fontWeight:'600'}},fmtDate(ex.dataVencimento)),
          ex.periodicidade?el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},'A cada '+ex.periodicidade+' meses'):null,
        ].filter(Boolean):['—']),
        el('td',{style:{padding:'10px 14px',fontSize:'12px',fontWeight:'600',color:resuCor}},resuInfo.l),
        el('td',{style:{padding:'10px 14px'}},[
          el('span',{style:{fontSize:'11px',fontWeight:'600',padding:'3px 10px',borderRadius:'10px',color:stEx.cor,background:stEx.bg}},stEx.label),
        ]),
        el('td',{style:{padding:'10px 14px',fontSize:'11px',color:'var(--text3)'}},ex.medico?(ex.medico+(ex.crm?' · '+ex.crm:'')):el('span',{},'—')),
        el('td',{style:{padding:'8px 10px',textAlign:'right'}},[
          el('div',{style:{display:'flex',gap:'6px',justifyContent:'flex-end'}},[
            el('button',{class:'btn-icon edit',title:'Editar',onclick:(function(v){return function(){setState({exameModal:{editItem:v}});};})(ex)},'✏️'),
            el('button',{class:'btn-icon delete',title:'Excluir',onclick:(function(v){return function(){
              if(window.confirm('Excluir exame de "'+_funcNomePorId(v.funcId,funcionarios)+'"?')){
                var arr=(state.examesFuncionarios||[]).filter(function(x){return x.id!==v.id;});
                lsSet('examesFuncionarios',arr);setState({examesFuncionarios:arr});scheduleSave();
                showToast('Exame removido','error');
              }
            };})(ex)},'🗑'),
          ]),
        ]),
      ]);
    });

    contentEl=div('',[
      kpiEx,
      alertaPainel,
      div('card',[
        exSorted.length===0
          ?div('empty',[
            div('empty-icon','🩺'),
            div('empty-title','Nenhum exame cadastrado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},
              'Cadastre exames admissionais, periódicos e demissionais para manter a conformidade legal.'),
          ])
          :el('div',{style:{overflowX:'auto'}},[
            el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
              el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
                'Funcionário','Tipo','Data exame','Vencimento','Resultado','Status','Médico','',
              ].map(function(h){return el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},h);}))]),
              el('tbody',{},exRows),
            ]),
          ]),
      ]),
    ]);
  }

  // ── CONTEÚDO: FOLHA DE PAGAMENTO ──────────────────────────────────────────
  if (funcTab === 'folha') {
    var folhaMesSel = state.folhaMes || today().slice(0,7);
    var fParts = folhaMesSel.split('-');
    var fAno = parseInt(fParts[0]), fMes = parseInt(fParts[1])-1;

    function navFolhaMes(delta){
      var mo = fMes + delta, an = fAno;
      if(mo<0){mo=11;an--;}if(mo>11){mo=0;an++;}
      setState({folhaMes:an+'-'+String(mo+1).padStart(2,'0')});
    }

    var MESES_F=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var labelFolha = MESES_F[fMes] + ' ' + fAno;

    // Calcula encargos simplificados para cada funcionário ativo
    var adiantMes = (state.adiantamentos||[]).filter(function(a){
      return a.profile===pf && a.mes===folhaMesSel;
    });
    var adiantMap = {};
    adiantMes.forEach(function(a){ adiantMap[a.funcionarioId]=a; });

    var folhaItens = ativos.map(function(f){
      var sal = f.salario || 0;
      // INSS tabela simplificada 2025
      var inss = sal <= 1518 ? sal*0.075
               : sal <= 2793.88 ? sal*0.09
               : sal <= 4190.83 ? sal*0.12
               : sal <= 8157.41 ? sal*0.14
               : 1201.86; // teto INSS
      inss = Math.round(inss*100)/100;
      var baseIrrf = sal - inss;
      // IRRF simplificado (isento até R$2.824,00 com desconto)
      var irrf = baseIrrf <= 2824 ? 0
               : baseIrrf <= 3751.05 ? baseIrrf*0.075 - 158.40
               : baseIrrf <= 4664.68 ? baseIrrf*0.15  - 370.40
               : baseIrrf <= 6101.06 ? baseIrrf*0.225 - 651.73
               : baseIrrf*0.275 - 884.96;
      irrf = Math.max(0, Math.round(irrf*100)/100);
      var liquido = Math.round((sal - inss - irrf)*100)/100;
      var fgts = Math.round(sal*0.08*100)/100;
      var adiant = adiantMap[f.id] ? adiantMap[f.id].valorAdiantamento : 0;
      var saldo  = Math.round((liquido - adiant)*100)/100;
      return {f:f, sal:sal, inss:inss, irrf:irrf, liquido:liquido, fgts:fgts, adiant:adiant, saldo:saldo};
    });

    var totalSal     = folhaItens.reduce(function(s,i){return s+i.sal;},0);
    var totalInss    = folhaItens.reduce(function(s,i){return s+i.inss;},0);
    var totalIrrf    = folhaItens.reduce(function(s,i){return s+i.irrf;},0);
    var totalLiquido = folhaItens.reduce(function(s,i){return s+i.liquido;},0);
    var totalFgts    = folhaItens.reduce(function(s,i){return s+i.fgts;},0);
    var totalAdiant  = folhaItens.reduce(function(s,i){return s+i.adiant;},0);
    var totalSaldo   = folhaItens.reduce(function(s,i){return s+i.saldo;},0);

    var mesNav2 = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'20px'}});
    var prevBtn2 = el('button',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text2)',cursor:'pointer',padding:'5px 12px',fontSize:'14px'}},'‹');
    prevBtn2.onclick=function(){navFolhaMes(-1);};
    var mesLabel2 = el('div',{style:{padding:'6px 20px',borderRadius:'6px',fontSize:'14px',fontWeight:'700',background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--gold)',minWidth:'180px',textAlign:'center'}});
    mesLabel2.textContent = labelFolha;
    var nextBtn2 = el('button',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text2)',cursor:'pointer',padding:'5px 12px',fontSize:'14px'}},'›');
    nextBtn2.onclick=function(){navFolhaMes(1);};
    mesNav2.appendChild(prevBtn2); mesNav2.appendChild(mesLabel2); mesNav2.appendChild(nextBtn2);

    var kpiFolha = el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}},[
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Funcionários'),el('div',{class:'kpi-value'},String(ativos.length)),el('div',{class:'kpi-sub'},'ativos')]),
      el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Total bruto'),el('div',{class:'kpi-value red'},fmtMoney(totalSal)),el('div',{class:'kpi-sub'},'salários')]),
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'INSS desconto'),el('div',{class:'kpi-value'},fmtMoney(totalInss)),el('div',{class:'kpi-sub'},'retido funcionários')]),
      el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'IRRF desconto'),el('div',{class:'kpi-value'},fmtMoney(totalIrrf)),el('div',{class:'kpi-sub'},'retido funcionários')]),
      el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Total líquido'),el('div',{class:'kpi-value green'},fmtMoney(totalLiquido)),el('div',{class:'kpi-sub'},'a pagar')]),
      el('div',{class:'kpi-card gold'},[el('div',{class:'kpi-label'},'FGTS empresa'),el('div',{class:'kpi-value gold'},fmtMoney(totalFgts)),el('div',{class:'kpi-sub'},'8% sobre salários')]),
      totalAdiant>0?el('div',{class:'kpi-card gold'},[el('div',{class:'kpi-label'},'Adiantado (dia 20)'),el('div',{class:'kpi-value gold'},fmtMoney(totalAdiant)),el('div',{class:'kpi-sub'},'já pago')]):null,
      totalAdiant>0?el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Saldo a pagar'),el('div',{class:'kpi-value green'},fmtMoney(totalSaldo)),el('div',{class:'kpi-sub'},'no fechamento')]):null,
    ].filter(Boolean));

    var aviso = el('div',{style:{background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.3)',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'var(--text2)',lineHeight:'1.5'}});
    aviso.textContent='⚠ Cálculos estimados com base na tabela INSS/IRRF 2025. Consulte seu contador para valores oficiais com adicionais, benefícios e horas extras.';

    var temAdiant = totalAdiant > 0;
    var theadCols = ['Funcionário / Cargo','Salário Bruto','INSS (desc.)','IRRF (desc.)','Salário Líquido','FGTS (emp.)','Adiantamento','Saldo a Pagar','Pix / Banco'];
    var tbody = folhaItens.length === 0
      ? [el('tr',{},[el('td',{colspan:'9',style:{textAlign:'center',padding:'30px',color:'var(--text3)'}},'Nenhum funcionário ativo')])]
      : folhaItens.map(function(item){
        var f = item.f;
        var pix = [f.chavePix?'Pix: '+f.chavePix:null, f.banco?f.banco:null].filter(Boolean).join('\n') || '—';
        return el('tr',{},[
          el('td',{class:'text-main'},[
            f.nome,
            f.cargo?el('span',{style:{fontSize:'11px',color:'var(--text3)',display:'block'}},f.cargo):null
          ].filter(Boolean)),
          el('td',{style:{fontWeight:'600',color:'var(--text)'}},fmtMoney(item.sal)),
          el('td',{style:{color:'var(--red)'}},fmtMoney(item.inss)),
          el('td',{style:{color:'var(--red)'}},item.irrf>0?fmtMoney(item.irrf):'—'),
          el('td',{style:{fontWeight:'700',color:'var(--green)'}},fmtMoney(item.liquido)),
          el('td',{style:{color:'var(--gold)'}},fmtMoney(item.fgts)),
          el('td',{style:{color:item.adiant?'var(--gold)':'var(--text3)',fontWeight:item.adiant?'700':'400'}},item.adiant?fmtMoney(item.adiant):'—'),
          el('td',{style:{fontWeight:'700',color:item.adiant?'var(--green)':'var(--text3)'}},item.adiant?fmtMoney(item.saldo):'—'),
          el('td',{style:{fontSize:'11px',color:'var(--text3)',whiteSpace:'pre-line'}},pix),
        ]);
      });

    var tfoot = el('tr',{style:{borderTop:'2px solid var(--border)',fontWeight:'700',background:'var(--bg3)'}},[
      el('td',{style:{padding:'10px 14px',fontWeight:'700'}},'TOTAIS'),
      el('td',{style:{padding:'10px 14px',fontWeight:'700'}},fmtMoney(totalSal)),
      el('td',{style:{padding:'10px 14px',color:'var(--red)'}},fmtMoney(totalInss)),
      el('td',{style:{padding:'10px 14px',color:'var(--red)'}},totalIrrf>0?fmtMoney(totalIrrf):'—'),
      el('td',{style:{padding:'10px 14px',fontWeight:'800',color:'var(--green)'}},fmtMoney(totalLiquido)),
      el('td',{style:{padding:'10px 14px',color:'var(--gold)'}},fmtMoney(totalFgts)),
      el('td',{style:{padding:'10px 14px',color:'var(--gold)',fontWeight:'800'}},temAdiant?fmtMoney(totalAdiant):'—'),
      el('td',{style:{padding:'10px 14px',fontWeight:'800',color:'var(--green)'}},temAdiant?fmtMoney(totalSaldo):'—'),
      el('td',{},''),
    ]);

    contentEl = div('',[
      mesNav2,
      aviso,
      kpiFolha,
      el('div',{style:{overflowX:'auto'}},[
        el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
          el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},
            theadCols.map(function(h){return el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},h);}))]),
          el('tbody',{},tbody),
          el('tfoot',{},[tfoot]),
        ]),
      ]),
    ]);
  }

  return div('',[
    div('page-header',[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},[
        el('div',{},[
          el('h1',{},'👥 Funcionários'),
          el('p',{},'Gerencie sua equipe, salários, férias e exames ocupacionais'),
        ]),
        actionBtn,
      ].filter(Boolean)),
    ]),
    tabsEl,
    contentEl,
  ]);
}

function _exportFolhaPDF(ativos, folhaMesSel) {
  var emp = ((state.empresaData||{})[state.profile])||{};
  var nomeEmp = emp.nomeFantasia||emp.razaoSocial||'Financial Routine';
  var MESES_F=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var p=folhaMesSel.split('-');
  var labelMes = MESES_F[parseInt(p[1])-1]+' '+p[0];
  var M=function(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};

  var rows = ativos.map(function(f){
    var sal=f.salario||0;
    var inss=sal<=1518?sal*0.075:sal<=2793.88?sal*0.09:sal<=4190.83?sal*0.12:sal<=8157.41?sal*0.14:1201.86;
    inss=Math.round(inss*100)/100;
    var baseIrrf=sal-inss;
    var irrf=baseIrrf<=2824?0:baseIrrf<=3751.05?baseIrrf*0.075-158.40:baseIrrf<=4664.68?baseIrrf*0.15-370.40:baseIrrf<=6101.06?baseIrrf*0.225-651.73:baseIrrf*0.275-884.96;
    irrf=Math.max(0,Math.round(irrf*100)/100);
    var liquido=Math.round((sal-inss-irrf)*100)/100;
    var fgts=Math.round(sal*0.08*100)/100;
    return {f:f,sal:sal,inss:inss,irrf:irrf,liquido:liquido,fgts:fgts};
  });

  var totSal=rows.reduce(function(s,i){return s+i.sal;},0);
  var totLiq=rows.reduce(function(s,i){return s+i.liquido;},0);
  var totFgts=rows.reduce(function(s,i){return s+i.fgts;},0);

  var tr=rows.map(function(item){
    return '<tr>'+
      '<td>'+item.f.nome+(item.f.cargo?'<br><span class="sub">'+item.f.cargo+'</span>':'')+'</td>'+
      '<td class="num">'+M(item.sal)+'</td>'+
      '<td class="num red">'+M(item.inss)+'</td>'+
      '<td class="num red">'+(item.irrf>0?M(item.irrf):'—')+'</td>'+
      '<td class="num green bold">'+M(item.liquido)+'</td>'+
      '<td class="num gold">'+M(item.fgts)+'</td>'+
    '</tr>';
  }).join('');

  var w=window.open('','_blank','width=900,height=700');
  w.document.write(
    '<html><head><meta charset="UTF-8"><title>Folha '+labelMes+'</title><style>'+
    'body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:850px;margin:0 auto}'+
    'h1{font-size:18px;font-weight:800;margin:0}'+
    '.sub2{font-size:12px;color:#666;margin-bottom:4px}'+
    '.periodo{font-size:15px;font-weight:700;margin:16px 0 16px;color:#333;padding:10px 16px;background:#f9f9f9;border-radius:8px;border:1px solid #e5e7eb}'+
    'table{width:100%;border-collapse:collapse;margin-top:16px}'+
    'th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e5e7eb}'+
    'td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px}'+
    'tfoot td{font-weight:700;border-top:2px solid #111;background:#f9f9f9}'+
    '.num{text-align:right}'+
    '.red{color:#dc2626}'+
    '.green{color:#16a34a}'+
    '.gold{color:#b45309}'+
    '.bold{font-weight:800}'+
    '.sub{font-size:11px;color:#666;display:block}'+
    '.aviso{margin-top:20px;padding:10px 14px;background:#fefce8;border:1px solid #fef08a;border-radius:6px;font-size:11px;color:#713f12}'+
    '.rodape{margin-top:16px;font-size:10px;color:#999;text-align:center;border-top:1px dashed #ccc;padding-top:10px}'+
    '@media print{button{display:none}body{padding:16px}}'+
    '</style></head><body>'+
    '<h1>'+nomeEmp+'</h1>'+
    (emp.cnpj?'<div class="sub2">CNPJ: '+emp.cnpj+'</div>':'')+
    '<div class="periodo">💰 Folha de Pagamento — '+labelMes+'</div>'+
    '<table>'+
    '<thead><tr><th>Funcionário</th><th class="num">Salário Bruto</th><th class="num">INSS desc.</th><th class="num">IRRF desc.</th><th class="num">Salário Líquido</th><th class="num">FGTS (8%)</th></tr></thead>'+
    '<tbody>'+tr+'</tbody>'+
    '<tfoot><tr>'+
      '<td>TOTAIS ('+rows.length+' funcionários)</td>'+
      '<td class="num">'+M(totSal)+'</td>'+
      '<td class="num red">—</td>'+
      '<td class="num red">—</td>'+
      '<td class="num green">'+M(totLiq)+'</td>'+
      '<td class="num gold">'+M(totFgts)+'</td>'+
    '</tr></tfoot>'+
    '</table>'+
    '<div class="aviso">⚠ Cálculos estimados com base na tabela INSS/IRRF 2025. Consulte seu contador para valores oficiais.</div>'+
    '<div class="rodape">Emitido em '+new Date().toLocaleString('pt-BR')+' · Financial Routine</div>'+
    '<br><button onclick="window.print()" style="padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">🖨 Imprimir / Salvar PDF</button>'+
    '</body></html>'
  );
  w.document.close();
}
