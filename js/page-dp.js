// ── PAGE DP / RH ──────────────────────────────────────────────────────────────

var _dpTab        = 'admissao';
var _dpSelCargo   = null;
var _dpExpandDept = {};
var _dpEntBusca   = '';
var _dpEntFiltro  = '';
var _dpPendingCv  = null;
var _dpPendingDoc = null;

var DP_ADM_CATS = ['Documento Pessoal','Exame Admissional','Contrato / Acordo','Termo de Ciência','EPI / Uniforme','Treinamento Inicial','Regra Interna','Outros'];
var DP_DEM_CATS = ['Exame Demissional','Devolução EPI / Uniforme','Termo de Rescisão','Acerto Financeiro','Entrega de Crachá / Chave','Outros'];
var DP_ENT_STATUS = ['Agendada','Realizada','Aprovada','Reprovada','Em espera'];

// ── RENDER PRINCIPAL ──────────────────────────────────────────────────────────

function renderDp() {
  var cargos      = (state.dpCargos      || []).filter(function(c){ return c.profile===state.profile; });
  var entrevistas = (state.dpEntrevistas || []).filter(function(e){ return e.profile===state.profile; });

  function dpTabBtn(id, label) {
    return btn('tab-btn'+(_dpTab===id?' active':''), label, function(){ _dpTab=id; setState({}); });
  }

  var subtitle = _dpTab==='admissao' ? 'Checklists e documentos por cargo — Processo de Admissão'
    : _dpTab==='demissao'  ? 'Checklists e documentos por cargo — Processo de Demissão'
    : 'Candidatos cadastrados · '+entrevistas.length+' entrevista'+(entrevistas.length!==1?'s':'');

  var headerBtn = _dpTab==='entrevista'
    ? btn('btn-primary','+ Nova Entrevista',function(){ setState({dpEntModal:{novo:true}}); })
    : btn('btn-primary','+ Novo Cargo',function(){ setState({dpCargoModal:{novo:true,deptId:'cozinha',nome:'',funcao:''}}); });

  var header = el('div',{class:'manual-header'},[
    el('div',{},[
      el('h2',{style:{margin:'0 0 2px',fontSize:'1.25rem',fontWeight:'700'}},'👔 DP / RH'),
      el('p',{style:{margin:'0',fontSize:'0.82rem',color:'var(--text-muted)'}},subtitle),
    ]),
    headerBtn,
  ]);

  var tabsRow = div('tabs-row',[
    dpTabBtn('admissao','✅ Processo de Admissão'),
    dpTabBtn('demissao','📤 Processo de Demissão'),
    dpTabBtn('entrevista','🧑‍💼 Entrevistas'),
  ]);

  var wrap = div('page-section',[header,tabsRow]);
  if     (_dpTab==='admissao')  wrap.appendChild(_dpProcessoTab('admissao',  cargos));
  else if(_dpTab==='demissao')  wrap.appendChild(_dpProcessoTab('demissao',  cargos));
  else                          wrap.appendChild(_dpEntrevistaTab(entrevistas, cargos));

  if(state.dpCargoModal)   wrap.appendChild(_dpCargoModalEl(state.dpCargoModal, cargos));
  if(state.dpCheckModal)   wrap.appendChild(_dpCheckItemModalEl(state.dpCheckModal));
  if(state.dpDocModal)     wrap.appendChild(_dpDocModalEl(state.dpDocModal));
  if(state.dpEntModal)     wrap.appendChild(_dpEntModalEl(state.dpEntModal, cargos));
  if(state.dpEntViewModal) wrap.appendChild(_dpEntViewModalEl(state.dpEntViewModal, cargos));
  return wrap;
}

// ── ABA ADMISSÃO / DEMISSÃO ───────────────────────────────────────────────────

function _dpProcessoTab(tipo, cargos) {
  var checks = tipo==='admissao' ? (state.dpAdmChecks||{}) : (state.dpDemChecks||{});
  var docs   = (state.dpDocs||[]).filter(function(d){ return d.tipo===tipo && d.profile===state.profile; });

  var sideItems = [];
  MANUAL_DEPTS.forEach(function(dept){
    var dCargos = cargos.filter(function(c){ return c.deptId===dept.id; });
    var isExp   = !!_dpExpandDept[dept.id];

    var hdr = el('div',{
      class:'dp-dept-hdr'+(isExp?' dp-dept-expanded':''),
      onclick:function(){ _dpExpandDept[dept.id]=!isExp; setState({}); },
    },[
      el('span',{class:'dp-toggle-icon'},isExp?'▾':'▸'),
      el('span',{class:'dp-dept-label'},dept.label),
      dCargos.length ? el('span',{class:'manual-dept-count'},String(dCargos.length)) : null,
    ].filter(Boolean));
    sideItems.push(hdr);

    if(isExp){
      if(!dCargos.length){
        sideItems.push(el('div',{class:'dp-cargo-empty'},'Nenhum cargo. Use "+ Novo Cargo".'));
      }
      dCargos.forEach(function(c){
        var isAct  = _dpSelCargo===c.id;
        var total  = (checks[c.id]||[]).length;
        var feitos = (checks[c.id]||[]).filter(function(i){ return i.feito; }).length;
        var item   = el('div',{
          class:'dp-cargo-item'+(isAct?' active':''),
          onclick:function(){ _dpSelCargo=c.id; setState({}); },
        },[
          el('span',{class:'dp-cargo-icon'},'💼'),
          el('div',{class:'dp-cargo-info'},[
            el('div',{class:'dp-cargo-nome'},c.nome),
            c.funcao ? el('div',{class:'dp-cargo-func'},c.funcao) : null,
          ].filter(Boolean)),
          total ? el('span',{class:'manual-dept-count'},feitos+'/'+total) : null,
        ].filter(Boolean));
        sideItems.push(item);
      });
    }
  });

  var sidebar = el('div',{class:'manual-sidebar dp-sidebar'},[
    el('div',{class:'dp-sidebar-title'},tipo==='admissao'?'✅ Admissão — Cargos':'📤 Demissão — Cargos'),
    el('div',{class:'dp-sidebar-scroll'},sideItems),
  ]);

  var panel;
  if(!_dpSelCargo){
    panel = el('div',{class:'dp-panel-empty'},[
      el('div',{style:{fontSize:'3rem',marginBottom:'12px'}},tipo==='admissao'?'✅':'📤'),
      el('h3',{style:{margin:'0 0 8px',fontWeight:'600'}},'Selecione um cargo'),
      el('p',{style:{margin:'0',color:'var(--text-muted)'}},'Expanda um departamento e escolha o cargo para gerenciar o checklist de '+(tipo==='admissao'?'admissão':'demissão')+'.'),
    ]);
  } else {
    var cargo = cargos.find(function(c){ return c.id===_dpSelCargo; });
    if(!cargo){ _dpSelCargo=null; panel=el('div',{}); }
    else {
      panel = _dpChecklistPanel(tipo, cargo, checks[cargo.id]||[], docs.filter(function(d){ return d.cargoId===cargo.id; }));
    }
  }

  return el('div',{class:'manual-layout',style:{minHeight:'560px'}},[sidebar,panel]);
}

// ── PAINEL CHECKLIST ──────────────────────────────────────────────────────────

function _dpChecklistPanel(tipo, cargo, itens, docs) {
  var cats = tipo==='admissao' ? DP_ADM_CATS : DP_DEM_CATS;
  var dept = MANUAL_DEPTS.find(function(d){ return d.id===cargo.deptId; });

  function salvarItens(novos){
    var key  = tipo==='admissao'?'dpAdmChecks':'dpDemChecks';
    var base = Object.assign({}, tipo==='admissao'?(state.dpAdmChecks||{}):(state.dpDemChecks||{}));
    base[cargo.id] = novos;
    lsSet(key,base);
    var patch={}; patch[key]=base;
    setState(patch); scheduleSave();
  }

  var catGroups = {};
  cats.forEach(function(c){ catGroups[c]=[]; });
  itens.forEach(function(it,idx){
    var c=it.cat||cats[cats.length-1];
    if(!catGroups[c]) catGroups[c]=[];
    catGroups[c].push({item:it,idx:idx});
  });

  var feitos = itens.filter(function(i){ return i.feito; }).length;
  var pct    = itens.length ? Math.round(feitos/itens.length*100) : 0;

  var progressEl = el('div',{class:'dp-progress-wrap'},[
    el('div',{class:'dp-progress-info'},[
      el('span',{},feitos+' / '+itens.length+' itens concluídos'),
      el('b',{style:{color:pct===100?'var(--success,#22a047)':'var(--primary)'}},pct+'%'),
    ]),
    el('div',{class:'dp-prog-bar'},[
      el('div',{class:'dp-prog-fill',style:{width:pct+'%',background:pct===100?'var(--success,#22a047)':'var(--primary)'}},''),
    ]),
  ]);

  var catSections = cats.map(function(cat){
    var grupo = catGroups[cat]||[];
    var rows  = grupo.map(function(g){
      var it=g.item, idx=g.idx;
      var chkBtn=el('button',{class:'dp-chk-toggle'+(it.feito?' dp-chk-done':''),title:'Marcar/desmarcar'},it.feito?'✅':'☐');
      chkBtn.onclick=function(){
        salvarItens(itens.map(function(x,i){ return i===idx?Object.assign({},x,{feito:!x.feito}):x; }));
      };
      var delBtn=el('button',{class:'cl-del-btn',title:'Remover'},'✕');
      delBtn.onclick=function(){
        if(confirm('Remover "'+it.texto+'" do checklist?'))
          salvarItens(itens.filter(function(_,i){ return i!==idx; }));
      };
      return el('div',{class:'dp-chk-row'+(it.feito?' dp-row-done':'')},[
        chkBtn,
        el('span',{class:'dp-chk-txt'},it.texto),
        el('span',{class:'dp-chk-catbadge'},it.cat||'Outros'),
        delBtn,
      ]);
    });
    return el('div',{class:'dp-cat-block'},[
      el('div',{class:'dp-cat-hdr'},[
        el('span',{class:'dp-cat-lbl'},cat),
        el('span',{class:'manual-dept-count'},String(grupo.length)),
      ]),
      grupo.length
        ? el('div',{class:'dp-chk-list'},rows)
        : el('div',{class:'cl-empty-hint'},'Nenhum item nesta categoria.'),
    ]);
  });

  var docsEls = docs.map(function(doc){
    var ext=(doc.nome||'').split('.').pop().toUpperCase();
    var ecol={PDF:'#e53e3e',DOC:'#3182ce',DOCX:'#3182ce',XLS:'#38a169',XLSX:'#38a169',JPG:'#dd6b20',PNG:'#dd6b20'}[ext]||'#718096';
    var viewBtn=el('button',{class:'doc-act-btn btn-secondary'},'👁');
    viewBtn.onclick=function(){ _docAction(doc.id,doc.nome,doc.mimeType,'view'); };
    var dlBtn=el('button',{class:'doc-act-btn btn-secondary'},'⬇');
    dlBtn.onclick=function(){ _docAction(doc.id,doc.nome,doc.mimeType,'download'); };
    var delBtn=el('button',{class:'doc-act-btn btn-danger-outline btn-secondary'},'🗑');
    delBtn.onclick=function(){
      if(!confirm('Excluir "'+doc.nome+'"?'))return;
      _idbDel(doc.id);
      var arr=(state.dpDocs||[]).filter(function(d){ return d.id!==doc.id; });
      lsSet('dpDocs',arr); setState({dpDocs:arr}); scheduleSave();
      showToast('Documento excluído','error');
    };
    return el('div',{class:'doc-card'},[
      el('div',{class:'doc-card-left'},[el('div',{class:'doc-ext-badge',style:{background:ecol}},ext||'?')]),
      el('div',{class:'doc-card-body'},[
        el('div',{class:'doc-card-nome'},doc.nome),
        el('div',{class:'doc-card-meta'},[
          el('span',{class:'doc-tag'},doc.cat||''),
          doc.criadoEm?el('span',{style:{color:'var(--text-muted)',fontSize:'0.75rem'}},'📅 '+doc.criadoEm):null,
          doc.tamanho?el('span',{style:{color:'var(--text-muted)',fontSize:'0.75rem'}},_fmtSize(doc.tamanho)):null,
        ].filter(Boolean)),
      ]),
      el('div',{class:'doc-card-actions',style:{flexDirection:'row',gap:'4px'}},[viewBtn,dlBtn,delBtn]),
    ]);
  });

  var panel = el('div',{class:'dp-panel'},[
    el('div',{class:'dp-panel-hdr'},[
      el('div',{},[
        el('div',{style:{display:'flex',gap:'8px',alignItems:'center',marginBottom:'4px'}},[
          el('span',{class:'manual-badge dept'},dept?dept.label:cargo.deptId),
          el('span',{class:'manual-badge cat'},tipo==='admissao'?'✅ Admissão':'📤 Demissão'),
        ]),
        el('h2',{style:{margin:'0 0 2px',fontSize:'1.1rem',fontWeight:'700'}},'💼 '+cargo.nome),
        cargo.funcao?el('p',{style:{margin:'0',fontSize:'0.82rem',color:'var(--text-muted)'}},cargo.funcao):null,
      ].filter(Boolean)),
      el('div',{class:'dp-panel-hdr-btns'},[
        btn('btn-secondary','✏️ Editar Cargo',function(){
          setState({dpCargoModal:{editId:cargo.id,deptId:cargo.deptId,nome:cargo.nome,funcao:cargo.funcao||''}});
        }),
        btn('btn-secondary','🖨️ Imprimir',function(){ _dpPrint(tipo,cargo,itens,dept); }),
        btn('btn-danger-outline','🗑 Excluir Cargo',function(){
          if(!confirm('Excluir cargo "'+cargo.nome+'" e todos os seus dados?'))return;
          var arr=(state.dpCargos||[]).filter(function(c){ return c.id!==cargo.id; });
          lsSet('dpCargos',arr);
          var nAdm=Object.assign({},state.dpAdmChecks||{}); delete nAdm[cargo.id]; lsSet('dpAdmChecks',nAdm);
          var nDem=Object.assign({},state.dpDemChecks||{}); delete nDem[cargo.id]; lsSet('dpDemChecks',nDem);
          var nDocs=(state.dpDocs||[]).filter(function(d){ return d.cargoId!==cargo.id; }); lsSet('dpDocs',nDocs);
          docs.forEach(function(d){ _idbDel(d.id); });
          _dpSelCargo=null;
          setState({dpCargos:arr,dpAdmChecks:nAdm,dpDemChecks:nDem,dpDocs:nDocs});
          scheduleSave(); showToast('Cargo excluído','error');
        }),
      ]),
    ]),
    progressEl,
    el('div',{class:'dp-panel-actions'},[
      btn('btn-primary','+ Adicionar ao Checklist',function(){
        setState({dpCheckModal:{tipo:tipo,cargoId:cargo.id,texto:'',cat:cats[0]}});
      }),
      btn('btn-secondary','⬆ Anexar Documento',function(){
        _dpPendingDoc=null;
        setState({dpDocModal:{tipo:tipo,cargoId:cargo.id,cargoNome:cargo.nome}});
      }),
    ]),
    el('div',{class:'dp-panel-body'},catSections),
    docs.length ? el('div',{class:'dp-docs-section'},[
      el('div',{class:'dp-docs-title'},'📎 Documentos Anexados ('+docs.length+')'),
      el('div',{class:'doc-list'},docsEls),
    ]) : null,
  ].filter(Boolean));

  return panel;
}

// ── ABA ENTREVISTAS ───────────────────────────────────────────────────────────

function _dpEntrevistaTab(entrevistas, cargos) {
  var lista = entrevistas.slice().sort(function(a,b){ return (b.criadoEm||'').localeCompare(a.criadoEm||''); });
  if(_dpEntBusca){
    var q=_dpEntBusca.toLowerCase();
    lista=lista.filter(function(e){ return (e.nome||'').toLowerCase().includes(q)||(e.cpf||'').includes(q)||(e.cargoDesejado||'').toLowerCase().includes(q); });
  }
  if(_dpEntFiltro) lista=lista.filter(function(e){ return e.status===_dpEntFiltro; });

  var buscaInp=el('input',{type:'search',placeholder:'🔍 Nome, CPF ou cargo...',value:_dpEntBusca,class:'manual-search',style:{width:'280px'}},[]);
  buscaInp.oninput=function(){ _dpEntBusca=this.value; setState({}); };

  var statusSel=el('select',{class:'mop-input',style:{width:'160px',padding:'7px 10px'}},
    [el('option',{value:''},'Todos os status')].concat(DP_ENT_STATUS.map(function(s){ return el('option',{value:s},s); }))
  );
  statusSel.value=_dpEntFiltro;
  statusSel.onchange=function(){ _dpEntFiltro=this.value; setState({}); };

  var stColors={'Agendada':'#3182ce','Realizada':'#718096','Aprovada':'#38a169','Reprovada':'#e53e3e','Em espera':'#dd6b20'};

  var cards = lista.map(function(ent){
    var stCol=stColors[ent.status]||'#718096';
    var dept=MANUAL_DEPTS.find(function(d){ return d.id===ent.deptId; });
    return el('div',{class:'dp-ent-card'},[
      el('div',{class:'dp-ent-card-stripe',style:{background:stCol}},''),
      el('div',{class:'dp-ent-card-body'},[
        el('div',{class:'dp-ent-card-top'},[
          el('div',{},[
            el('div',{class:'dp-ent-nome'},ent.nome),
            el('div',{class:'dp-ent-meta'},[
              ent.cargoDesejado?el('span',{class:'doc-tag'},ent.cargoDesejado):null,
              dept?el('span',{class:'doc-tag-period'},dept.label):null,
              ent.telefone?el('span',{style:{fontSize:'0.78rem',color:'var(--text-muted)'}},ent.telefone):null,
            ].filter(Boolean)),
          ]),
          el('div',{class:'dp-ent-status-badge',style:{background:stCol+'22',color:stCol,border:'1px solid '+stCol}},ent.status||'—'),
        ]),
        el('div',{class:'dp-ent-card-footer'},[
          ent.dataEntrevista?el('span',{},'📅 '+ent.dataEntrevista):null,
          ent.cvNome?el('span',{},'📎 CV anexado'):null,
          ent.criadoEm?el('span',{},'Cadastrado: '+ent.criadoEm):null,
        ].filter(Boolean)),
      ]),
      el('div',{class:'dp-ent-card-actions'},[
        btn('btn-secondary doc-act-btn','👁 Ver',function(){ setState({dpEntViewModal:ent}); }),
        btn('btn-secondary doc-act-btn','✏️',function(){ setState({dpEntModal:Object.assign({},ent,{_edit:true})}); }),
        btn('btn-danger-outline doc-act-btn','🗑',function(){
          if(!confirm('Excluir candidato "'+ent.nome+'"?'))return;
          if(ent.cvDocId)_idbDel(ent.cvDocId);
          var arr=(state.dpEntrevistas||[]).filter(function(e){ return e.id!==ent.id; });
          lsSet('dpEntrevistas',arr); setState({dpEntrevistas:arr}); scheduleSave();
          showToast('Candidato excluído','error');
        }),
      ]),
    ]);
  });

  var emptyEl = !cards.length ? el('div',{class:'dp-panel-empty'},[
    el('div',{style:{fontSize:'3rem',marginBottom:'12px'}},'🧑‍💼'),
    el('h3',{style:{margin:'0 0 8px',fontWeight:'600'}},lista.length===entrevistas.length?'Nenhuma entrevista cadastrada':'Nenhum resultado'),
    el('p',{style:{margin:'0',color:'var(--text-muted)'}},lista.length===entrevistas.length?'Clique em "+ Nova Entrevista" para cadastrar um candidato.':'Tente outros filtros.'),
  ]) : null;

  return el('div',{class:'dp-ent-page'},[
    el('div',{class:'dp-ent-toolbar'},[buscaInp,statusSel]),
    cards.length ? el('div',{class:'dp-ent-grid'},cards) : (emptyEl||el('div',{})),
  ]);
}

// ── MODAL: CARGO ──────────────────────────────────────────────────────────────

function _dpCargoModalEl(m) {
  var isEdit=!!m.editId;
  function salvar(){
    var nome=((document.getElementById('dp-cargo-nome')||{}).value||'').trim();
    var dept=((document.getElementById('dp-cargo-dept')||{}).value)||'cozinha';
    var func=((document.getElementById('dp-cargo-func')||{}).value||'').trim();
    if(!nome){showToast('Informe o nome do cargo','error');return;}
    var arr=state.dpCargos||[];
    if(isEdit){
      arr=arr.map(function(c){ return c.id===m.editId?Object.assign({},c,{nome:nome,deptId:dept,funcao:func}):c; });
    } else {
      arr=arr.concat([{id:uid(),profile:state.profile,nome:nome,deptId:dept,funcao:func,criadoEm:today()}]);
    }
    lsSet('dpCargos',arr);
    _dpExpandDept[dept]=true;
    setState({dpCargos:arr,dpCargoModal:null});
    scheduleSave(); showToast(isEdit?'Cargo atualizado!':'Cargo criado!','success');
  }
  var deptSel=el('select',{id:'dp-cargo-dept',class:'mop-input'},MANUAL_DEPTS.map(function(d){ return el('option',{value:d.id},d.label); }));
  deptSel.value=m.deptId||'cozinha';
  var nomeInp=el('input',{id:'dp-cargo-nome',type:'text',class:'mop-input mop-titulo',placeholder:'Ex: Assistente de Cozinha, Caixa, Atendente...',value:m.nome||''},[]);
  nomeInp.onkeydown=function(e){ if(e.key==='Enter')salvar(); };
  var funcInp=el('input',{id:'dp-cargo-func',type:'text',class:'mop-input',placeholder:'Ex: Apoio no preparo de alimentos e higienização do setor',value:m.funcao||''},[]);
  setTimeout(function(){ var x=document.getElementById('dp-cargo-nome');if(x){x.focus();x.select();} },80);

  var overlay=el('div',{class:'modal-overlay',onclick:function(e){ if(e.target===overlay)setState({dpCargoModal:null}); }},[
    el('div',{class:'modal-box',style:{maxWidth:'460px'},onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('h3',{style:{margin:0}},isEdit?'✏️ Editar Cargo':'💼 Novo Cargo / Função'),
        btn('modal-close','×',function(){setState({dpCargoModal:null});}),
      ]),
      el('div',{class:'mop-form',style:{padding:'20px'}},[
        el('label',{class:'mop-label'},'Departamento'),deptSel,
        el('label',{class:'mop-label'},'Nome do Cargo *'),nomeInp,
        el('label',{class:'mop-label'},'Função / Descrição'),funcInp,
      ]),
      el('div',{class:'modal-footer'},[
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','Cancelar',function(){setState({dpCargoModal:null});}),
          btn('btn-primary',isEdit?'✓ Salvar':'✓ Criar Cargo',salvar),
        ]),
      ]),
    ]),
  ]);
  return overlay;
}

// ── MODAL: ITEM CHECKLIST ─────────────────────────────────────────────────────

function _dpCheckItemModalEl(m) {
  var cats=m.tipo==='admissao'?DP_ADM_CATS:DP_DEM_CATS;
  function salvar(){
    var texto=((document.getElementById('dp-chk-texto')||{}).value||'').trim();
    var cat  =((document.getElementById('dp-chk-cat')  ||{}).value)||cats[0];
    if(!texto){showToast('Descreva o item do checklist','error');return;}
    var key=m.tipo==='admissao'?'dpAdmChecks':'dpDemChecks';
    var base=Object.assign({},m.tipo==='admissao'?(state.dpAdmChecks||{}):(state.dpDemChecks||{}));
    base[m.cargoId]=(base[m.cargoId]||[]).concat([{id:uid(),texto:texto,cat:cat,feito:false}]);
    lsSet(key,base);
    var patch={}; patch[key]=base;
    setState(Object.assign({},patch,{dpCheckModal:null}));
    scheduleSave(); showToast('Item adicionado!','success');
  }
  var textoInp=el('input',{id:'dp-chk-texto',type:'text',class:'mop-input',placeholder:'Ex: Apresentar RG e CPF originais',value:m.texto||''},[]);
  textoInp.onkeydown=function(e){ if(e.key==='Enter')salvar(); };
  var catSel=el('select',{id:'dp-chk-cat',class:'mop-input'},cats.map(function(c){ return el('option',{value:c},c); }));
  catSel.value=m.cat||cats[0];
  setTimeout(function(){ var x=document.getElementById('dp-chk-texto');if(x)x.focus(); },80);

  var overlay=el('div',{class:'modal-overlay',onclick:function(e){ if(e.target===overlay)setState({dpCheckModal:null}); }},[
    el('div',{class:'modal-box',style:{maxWidth:'440px'},onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('h3',{style:{margin:0}},(m.tipo==='admissao'?'✅':'📤')+' Adicionar Item ao Checklist'),
        btn('modal-close','×',function(){setState({dpCheckModal:null});}),
      ]),
      el('div',{class:'mop-form',style:{padding:'20px'}},[
        el('label',{class:'mop-label'},'Descrição do Item *'),textoInp,
        el('label',{class:'mop-label'},'Categoria'),catSel,
      ]),
      el('div',{class:'modal-footer'},[
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','Cancelar',function(){setState({dpCheckModal:null});}),
          btn('btn-primary','✓ Adicionar',salvar),
        ]),
      ]),
    ]),
  ]);
  return overlay;
}

// ── MODAL: UPLOAD DOCUMENTO ───────────────────────────────────────────────────

function _dpDocModalEl(m) {
  var cats=m.tipo==='admissao'?DP_ADM_CATS:DP_DEM_CATS;
  var sizeInfo=el('span',{style:{fontSize:'0.78rem',color:'var(--text-muted)',marginLeft:'8px'}},'');
  var statusEl=el('div',{style:{fontSize:'0.82rem',marginTop:'4px'}},'');
  var fileInp=el('input',{type:'file',accept:'.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip',style:{width:'100%',boxSizing:'border-box'}},[]);
  fileInp.onchange=function(){
    var file=this.files[0]; _dpPendingDoc=null;
    if(!file){sizeInfo.textContent='';return;}
    if(file.size>50*1024*1024){showToast('Máximo 50 MB','error');this.value='';return;}
    sizeInfo.textContent='('+_fmtSize(file.size)+')';
    statusEl.textContent='⏳ Lendo...'; statusEl.style.color='var(--text-muted)';
    var r=new FileReader();
    r.onload=function(e){
      _dpPendingDoc={dataBase64:e.target.result,tipo:file.type,tamanho:file.size};
      var n=document.getElementById('dp-doc-nome'); if(n&&!n.value)n.value=file.name;
      statusEl.textContent='✅ Pronto.'; statusEl.style.color='var(--success,#22a047)';
    };
    r.onerror=function(){ statusEl.textContent='❌ Erro ao ler.'; statusEl.style.color='#e53e3e'; };
    r.readAsDataURL(file);
  };
  var nomeInp=el('input',{id:'dp-doc-nome',type:'text',class:'mop-input',placeholder:'Nome do documento...'},[]);
  var catSel=el('select',{id:'dp-doc-cat',class:'mop-input'},cats.map(function(c){ return el('option',{value:c},c); }));
  function salvar(){
    var nome=((document.getElementById('dp-doc-nome')||{}).value||'').trim();
    var cat =((document.getElementById('dp-doc-cat') ||{}).value)||cats[0];
    if(!nome){showToast('Informe o nome','error');return;}
    if(!_dpPendingDoc){showToast('Selecione um arquivo','error');return;}
    var id=uid();
    var meta={id:id,profile:state.profile,tipo:m.tipo,cargoId:m.cargoId,nome:nome,cat:cat,mimeType:_dpPendingDoc.tipo,tamanho:_dpPendingDoc.tamanho,criadoEm:today()};
    _idbPut({id:id,dataBase64:_dpPendingDoc.dataBase64},function(ok){
      if(!ok){showToast('Erro ao salvar arquivo','error');return;}
      var arr=(state.dpDocs||[]).concat([meta]);
      lsSet('dpDocs',arr); setState({dpDocs:arr,dpDocModal:null}); scheduleSave(); _dpPendingDoc=null;
      showToast('Documento anexado!','success');
    });
  }
  var overlay=el('div',{class:'modal-overlay',onclick:function(e){ if(e.target===overlay)setState({dpDocModal:null}); }},[
    el('div',{class:'modal-box',style:{maxWidth:'500px'},onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('h3',{style:{margin:0}},(m.tipo==='admissao'?'✅':'📤')+' Documento — '+(m.cargoNome||'')),
        btn('modal-close','×',function(){setState({dpDocModal:null});}),
      ]),
      el('div',{class:'mop-form',style:{padding:'20px'}},[
        el('label',{class:'mop-label'},'Arquivo'),
        el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[fileInp,sizeInfo]),
        statusEl,
        el('label',{class:'mop-label'},'Nome do Documento'),nomeInp,
        el('label',{class:'mop-label'},'Categoria'),catSel,
        el('div',{class:'doc-storage-note'},'📦 Arquivos salvos localmente (IndexedDB). Para outro dispositivo, refaça o upload.'),
      ]),
      el('div',{class:'modal-footer'},[
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','Cancelar',function(){setState({dpDocModal:null});}),
          btn('btn-primary','💾 Salvar',salvar),
        ]),
      ]),
    ]),
  ]);
  return overlay;
}

// ── MODAL: NOVA / EDITAR ENTREVISTA ──────────────────────────────────────────

function _dpEntModalEl(m, cargos) {
  var isEdit=!!m._edit;

  var cvSizeInfo=el('span',{style:{fontSize:'0.78rem',color:'var(--text-muted)',marginLeft:'8px'}},'');
  var cvStatus=el('div',{style:{fontSize:'0.82rem',marginTop:'4px'}},'');
  var cvInp=el('input',{type:'file',accept:'.pdf,.doc,.docx,.jpg,.jpeg,.png,.zip',style:{width:'100%',boxSizing:'border-box'}},[]);
  cvInp.onchange=function(){
    var file=this.files[0]; _dpPendingCv=null;
    if(!file){cvSizeInfo.textContent='';return;}
    if(file.size>30*1024*1024){showToast('Máximo 30 MB','error');this.value='';return;}
    cvSizeInfo.textContent='('+_fmtSize(file.size)+')';
    cvStatus.textContent='⏳ Lendo...'; cvStatus.style.color='var(--text-muted)';
    var r=new FileReader();
    r.onload=function(e){
      _dpPendingCv={dataBase64:e.target.result,tipo:file.type,tamanho:file.size,nome:file.name};
      cvStatus.textContent='✅ CV pronto.'; cvStatus.style.color='var(--success,#22a047)';
    };
    r.onerror=function(){ cvStatus.textContent='❌ Erro ao ler.'; cvStatus.style.color='#e53e3e'; };
    r.readAsDataURL(file);
  };

  function _applyMask(inp,fn){ inp.oninput=function(){ this.value=fn(this.value); }; }

  var telInp=el('input',{id:'dp-ent-tel',type:'tel',class:'mop-input',placeholder:'(11) 99999-9999',value:m.telefone||'',maxlength:'15'},[]);
  _applyMask(telInp,function(v){ v=v.replace(/\D/g,'').slice(0,11); if(v.length>10)return v.replace(/^(\d{2})(\d{5})(\d{4})/,'($1) $2-$3'); if(v.length>6)return v.replace(/^(\d{2})(\d{4})/,'($1) $2-'); if(v.length>2)return v.replace(/^(\d{2})/,'($1) '); return v; });

  var cpfInp=el('input',{id:'dp-ent-cpf',type:'text',class:'mop-input',placeholder:'000.000.000-00',value:m.cpf||'',maxlength:'14'},[]);
  _applyMask(cpfInp,function(v){ v=v.replace(/\D/g,'').slice(0,11); if(v.length>9)return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'); if(v.length>6)return v.replace(/^(\d{3})(\d{3})/,'$1.$2.'); if(v.length>3)return v.replace(/^(\d{3})/,'$1.'); return v; });

  var deptSel=el('select',{id:'dp-ent-dept',class:'mop-input'},
    [el('option',{value:''},'Selecione...')].concat(MANUAL_DEPTS.map(function(d){ return el('option',{value:d.id},d.label); }))
  );
  deptSel.value=m.deptId||'';

  var cargoInp=el('input',{id:'dp-ent-cargo',type:'text',class:'mop-input',placeholder:'Ex: Assistente de Cozinha',value:m.cargoDesejado||'',list:'dp-ent-cargo-list'},[]);
  var cargoList=el('datalist',{id:'dp-ent-cargo-list'},cargos.map(function(c){ return el('option',{value:c.nome},''); }));

  var statusSel=el('select',{id:'dp-ent-status',class:'mop-input'},DP_ENT_STATUS.map(function(s){ return el('option',{value:s},s); }));
  statusSel.value=m.status||'Agendada';

  var nomeInp=el('input',{id:'dp-ent-nome',type:'text',class:'mop-input mop-titulo',placeholder:'Nome completo do candidato',value:m.nome||''},[]);
  var emailInp=el('input',{id:'dp-ent-email',type:'email',class:'mop-input',placeholder:'candidato@email.com',value:m.email||''},[]);
  var nascInp=el('input',{id:'dp-ent-nasc',type:'date',class:'mop-input',value:m.nascimento||''},[]);
  var dataInp=el('input',{id:'dp-ent-data',type:'date',class:'mop-input',value:m.dataEntrevista||''},[]);
  var obsEl=el('textarea',{id:'dp-ent-obs',rows:3,class:'mop-textarea',placeholder:'Anotações sobre o candidato...'},[]);
  obsEl.value=m.obs||'';

  function salvar(){
    var nome  =nomeInp.value.trim();
    var cpf   =cpfInp.value.replace(/\D/g,'');
    var tel   =telInp.value.trim();
    var email =emailInp.value.trim();
    var nasc  =nascInp.value;
    var dept  =deptSel.value;
    var cargo =cargoInp.value.trim();
    var status=statusSel.value;
    var data  =dataInp.value;
    var obs   =obsEl.value.trim();
    if(!nome){showToast('Informe o nome do candidato','error');return;}

    function finalizar(cvDocId, cvNome){
      var obj={
        id: isEdit?(m.id||uid()):uid(), profile:state.profile,
        nome:nome,
        cpf: cpf?cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4'):'',
        telefone:tel, email:email, nascimento:nasc,
        deptId:dept, cargoDesejado:cargo, status:status,
        dataEntrevista:data, obs:obs,
        cvDocId: cvDocId||m.cvDocId||null,
        cvNome:  cvNome||m.cvNome||null,
        criadoEm: isEdit?(m.criadoEm||today()):today(),
      };
      var arr=state.dpEntrevistas||[];
      arr=isEdit?arr.map(function(e){ return e.id===m.id?obj:e; }):arr.concat([obj]);
      lsSet('dpEntrevistas',arr); setState({dpEntrevistas:arr,dpEntModal:null}); scheduleSave(); _dpPendingCv=null;
      showToast(isEdit?'Candidato atualizado!':'Candidato cadastrado!','success');
    }

    if(_dpPendingCv){
      var cvId=uid();
      _idbPut({id:cvId,dataBase64:_dpPendingCv.dataBase64},function(ok){
        if(!ok){showToast('Erro ao salvar CV','error');return;}
        if(isEdit&&m.cvDocId) _idbDel(m.cvDocId);
        finalizar(cvId,_dpPendingCv.nome);
      });
    } else { finalizar(null,null); }
  }

  function fechar(){ setState({dpEntModal:null}); _dpPendingCv=null; }
  setTimeout(function(){ var x=document.getElementById('dp-ent-nome');if(x)x.focus(); },80);

  var overlay=el('div',{class:'modal-overlay',onclick:function(e){ if(e.target===overlay)fechar(); }},[
    el('div',{class:'modal-box mop-modal',onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('h3',{style:{margin:0}},isEdit?'✏️ Editar Candidato':'🧑‍💼 Nova Entrevista'),
        btn('modal-close','×',fechar),
      ]),
      el('div',{class:'mop-form',style:{padding:'20px'}},[
        el('h4',{class:'dp-form-section-title'},'👤 Identificação'),
        el('div',{class:'mop-row2'},[
          el('div',{},[el('label',{class:'mop-label'},'Nome Completo *'),nomeInp]),
          el('div',{},[el('label',{class:'mop-label'},'CPF'),cpfInp]),
        ]),
        el('div',{class:'mop-row2'},[
          el('div',{},[el('label',{class:'mop-label'},'Data de Nascimento'),nascInp]),
          el('div',{},[el('label',{class:'mop-label'},'Telefone / WhatsApp'),telInp]),
        ]),
        el('label',{class:'mop-label'},'E-mail'),emailInp,
        el('h4',{class:'dp-form-section-title'},'💼 Vaga'),
        el('div',{class:'mop-row2'},[
          el('div',{},[el('label',{class:'mop-label'},'Departamento'),deptSel]),
          el('div',{},[el('label',{class:'mop-label'},'Cargo Desejado'),cargoInp,cargoList]),
        ]),
        el('div',{class:'mop-row2'},[
          el('div',{},[el('label',{class:'mop-label'},'Status'),statusSel]),
          el('div',{},[el('label',{class:'mop-label'},'Data da Entrevista'),dataInp]),
        ]),
        el('label',{class:'mop-label'},'Observações'),obsEl,
        el('h4',{class:'dp-form-section-title'},'📎 Currículo'),
        el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[cvInp,cvSizeInfo]),
        cvStatus,
        m.cvNome ? el('div',{style:{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'4px'}},'Atual: 📎 '+m.cvNome+(m.cvDocId?' — novo arquivo substituirá o atual':'')) : null,
      ].filter(Boolean)),
      el('div',{class:'modal-footer'},[
        isEdit?btn('btn-danger-outline','🗑 Excluir Candidato',function(){
          if(!confirm('Excluir "'+m.nome+'"?'))return;
          if(m.cvDocId)_idbDel(m.cvDocId);
          var arr=(state.dpEntrevistas||[]).filter(function(e){ return e.id!==m.id; });
          lsSet('dpEntrevistas',arr); setState({dpEntrevistas:arr,dpEntModal:null}); scheduleSave();
          showToast('Candidato excluído','error');
        }):null,
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','Cancelar',fechar),
          btn('btn-primary',isEdit?'✓ Salvar':'✓ Cadastrar',salvar),
        ]),
      ].filter(Boolean)),
    ]),
  ]);
  return overlay;
}

// ── MODAL: VISUALIZAÇÃO ENTREVISTA ────────────────────────────────────────────

function _dpEntViewModalEl(m, cargos) {
  var stColors={'Agendada':'#3182ce','Realizada':'#718096','Aprovada':'#38a169','Reprovada':'#e53e3e','Em espera':'#dd6b20'};
  var dept=MANUAL_DEPTS.find(function(d){ return d.id===m.deptId; });
  var stCol=stColors[m.status]||'#718096';

  function row(label,val){ if(!val)return null; return el('div',{class:'dp-view-row'},[el('span',{class:'dp-view-label'},label),el('span',{class:'dp-view-val'},val)]); }

  var statusSel=el('select',{class:'mop-input',style:{padding:'4px 8px',fontSize:'0.85rem',borderColor:stCol,color:stCol,borderRadius:'6px',borderWidth:'1px',borderStyle:'solid',background:'transparent'}},
    DP_ENT_STATUS.map(function(s){ return el('option',{value:s},s); })
  );
  statusSel.value=m.status||'Agendada';
  statusSel.onchange=function(){
    var upd=Object.assign({},m,{status:statusSel.value});
    var arr=(state.dpEntrevistas||[]).map(function(e){ return e.id===m.id?upd:e; });
    lsSet('dpEntrevistas',arr); setState({dpEntrevistas:arr,dpEntViewModal:upd}); scheduleSave();
  };

  var overlay=el('div',{class:'modal-overlay',onclick:function(e){ if(e.target===overlay)setState({dpEntViewModal:null}); }},[
    el('div',{class:'modal-box',style:{maxWidth:'560px'},onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('div',{style:{display:'flex',alignItems:'center',gap:'10px'}},[
          el('span',{style:{fontSize:'1.5rem'}},'🧑‍💼'),
          el('h3',{style:{margin:0}},m.nome),
        ]),
        btn('modal-close','×',function(){setState({dpEntViewModal:null});}),
      ]),
      el('div',{style:{padding:'20px'}},[
        el('div',{style:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'16px',padding:'10px 14px',background:'var(--bg)',borderRadius:'8px',border:'1px solid var(--border)'}},[
          el('span',{style:{fontSize:'0.82rem',color:'var(--text-muted)'}},'Alterar status:'),
          statusSel,
        ]),
        el('div',{class:'dp-view-section'},[
          el('div',{class:'dp-view-title'},'👤 Identificação'),
          row('Nome',m.nome),
          row('CPF',m.cpf),
          row('Nascimento',m.nascimento),
          row('Telefone',m.telefone),
          row('E-mail',m.email),
        ].filter(Boolean)),
        el('div',{class:'dp-view-section'},[
          el('div',{class:'dp-view-title'},'💼 Vaga'),
          row('Cargo desejado',m.cargoDesejado),
          row('Departamento',dept?dept.label:m.deptId),
          row('Data da entrevista',m.dataEntrevista),
          row('Status',m.status),
        ].filter(Boolean)),
        m.obs ? el('div',{class:'dp-view-section'},[
          el('div',{class:'dp-view-title'},'📝 Observações'),
          el('div',{style:{fontSize:'0.9rem',lineHeight:'1.6',whiteSpace:'pre-wrap'}},m.obs),
        ]) : null,
        m.cvDocId ? el('div',{class:'dp-view-section'},[
          el('div',{class:'dp-view-title'},'📎 Currículo'),
          el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap'}},[
            btn('btn-secondary','👁 Visualizar',function(){ _docAction(m.cvDocId,m.cvNome||'curriculo',null,'view'); }),
            btn('btn-secondary','⬇ Baixar',function(){ _docAction(m.cvDocId,m.cvNome||'curriculo',null,'download'); }),
          ]),
          el('div',{style:{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'4px'}},'📎 '+m.cvNome),
        ]) : null,
        row('Cadastrado em',m.criadoEm),
      ].filter(Boolean)),
      el('div',{class:'modal-footer'},[
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','✏️ Editar',function(){ setState({dpEntViewModal:null,dpEntModal:Object.assign({},m,{_edit:true})}); }),
          btn('btn-secondary','🖨️ Imprimir Ficha',function(){ _dpEntPrint(m,dept); }),
          btn('btn-secondary','Fechar',function(){ setState({dpEntViewModal:null}); }),
        ]),
      ]),
    ]),
  ]);
  return overlay;
}

// ── IMPRESSÃO CHECKLIST ───────────────────────────────────────────────────────

function _dpPrintCSS(){
  return '@page{size:A4 portrait;margin:18mm 16mm;}body{font-family:Arial,sans-serif;color:#000;font-size:10pt;line-height:1.4;margin:0;}.pg{max-width:170mm;margin:0 auto;}.logo-area{text-align:center;padding-bottom:10px;border-bottom:3px solid #000;margin-bottom:12px;}.empresa-nome{font-size:9pt;text-transform:uppercase;letter-spacing:0.12em;color:#333;margin-top:4px;}.doc-type{font-size:7pt;color:#666;}.titulo-doc{text-align:center;font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;margin:14px 0 4px;}.sub-doc{text-align:center;font-size:10pt;color:#333;margin-bottom:12px;}.info-bar{display:flex;gap:16px;border:1px solid #000;border-radius:4px;padding:8px 12px;margin-bottom:12px;font-size:9pt;}.info-field{flex:1;}.info-field label{font-size:7.5pt;text-transform:uppercase;letter-spacing:0.06em;color:#555;display:block;margin-bottom:2px;}.info-line{border-bottom:1px solid #777;min-height:18px;display:block;}.section-label{font-size:8pt;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#444;border-bottom:2px solid #000;padding-bottom:3px;margin:14px 0 6px;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}thead th{background:#000;color:#fff;padding:5px 8px;font-size:8.5pt;text-align:left;}tbody tr{border-bottom:1px solid #ccc;}tbody tr:nth-child(even){background:#f5f5f5;}tbody td{padding:5px 8px;font-size:9pt;vertical-align:middle;}td.num{width:24px;text-align:center;color:#555;font-size:8pt;}td.chk{width:26px;text-align:center;font-size:13pt;}.ass-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;padding-top:12px;border-top:1px solid #ccc;}.ass-bloco label{font-size:7.5pt;text-transform:uppercase;letter-spacing:0.06em;color:#555;display:block;margin-bottom:2px;}.ass-line{border-bottom:1px solid #777;margin-bottom:10px;min-height:22px;}.rodape{margin-top:18px;padding-top:8px;border-top:1px solid #ccc;font-size:7.5pt;color:#888;display:flex;justify-content:space-between;}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}.field-block label{font-size:7.5pt;text-transform:uppercase;letter-spacing:0.06em;color:#555;display:block;margin-bottom:2px;}.field-val{border-bottom:1px solid #777;min-height:20px;padding-bottom:2px;font-size:10pt;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}';
}

function _dpPrint(tipo, cargo, itens, dept){
  if(!itens.length){showToast('Adicione itens antes de imprimir','error');return;}
  var ed=(state.empresaData||{}), empresa=ed.nome||'Artt Burger';
  var cats=tipo==='admissao'?DP_ADM_CATS:DP_DEM_CATS;
  var catGroups={}; cats.forEach(function(c){catGroups[c]=[];});
  itens.forEach(function(it){ var c=it.cat||cats[cats.length-1]; if(!catGroups[c])catGroups[c]=[]; catGroups[c].push(it); });
  var tablesHtml='';
  cats.forEach(function(cat){
    var grupo=catGroups[cat]||[]; if(!grupo.length)return;
    tablesHtml+='<div class="section-label">'+_esc(cat)+'</div>';
    tablesHtml+='<table><thead><tr><th style="width:26px">#</th><th>Documento / Item</th><th style="width:34px" align="center">✓</th></tr></thead><tbody>';
    grupo.forEach(function(it,i){ tablesHtml+='<tr><td class="num">'+(i+1)+'</td><td>'+_esc(it.texto)+'</td><td class="chk">☐</td></tr>'; });
    tablesHtml+='</tbody></table>';
  });
  var deptLabel=dept?dept.label:'';
  var tipoLabel=tipo==='admissao'?'PROCESSO DE ADMISSÃO':'PROCESSO DE DEMISSÃO';
  var w=window.open('','_blank');
  if(w){
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+tipoLabel+' — '+_esc(cargo.nome)+'</title><style>'+_dpPrintCSS()+'</style></head><body><div class="pg">');
    w.document.write('<div class="logo-area">'+_clLogoHTML()+'<div class="empresa-nome">'+_esc(empresa)+'</div><div class="doc-type">DP / RH — Documento Controlado</div></div>');
    w.document.write('<div class="titulo-doc">'+tipoLabel+'</div>');
    w.document.write('<div class="sub-doc">Cargo: <strong>'+_esc(cargo.nome)+'</strong>'+(deptLabel?' &middot; '+_esc(deptLabel):'')+' &middot; Função: '+(cargo.funcao?_esc(cargo.funcao):'—')+'</div>');
    w.document.write('<div class="info-bar"><div class="info-field"><label>Colaborador</label><span class="info-line"></span></div><div class="info-field"><label>CPF</label><span class="info-line"></span></div><div class="info-field"><label>Data de '+(tipo==='admissao'?'Admissão':'Demissão')+'</label><span class="info-line"></span></div></div>');
    w.document.write(tablesHtml);
    w.document.write('<div class="ass-grid"><div class="ass-bloco"><label>Assinatura do Colaborador</label><div class="ass-line"></div><label>Data</label><div class="ass-line"></div></div><div class="ass-bloco"><label>Assinatura do Responsável RH</label><div class="ass-line"></div><label>Data</label><div class="ass-line"></div></div></div>');
    w.document.write('<div class="rodape"><span>'+_esc(empresa)+' · DP/RH — Documento Controlado</span><span>'+today()+'</span></div>');
    w.document.write('</div></body></html>');
    w.document.close(); setTimeout(function(){w.print();},400);
  }
}

function _dpEntPrint(ent, dept){
  var ed=(state.empresaData||{}), empresa=ed.nome||'Artt Burger';
  var w=window.open('','_blank');
  if(w){
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ficha de Entrevista — '+_esc(ent.nome)+'</title><style>'+_dpPrintCSS()+'</style></head><body><div class="pg">');
    w.document.write('<div class="logo-area">'+_clLogoHTML()+'<div class="empresa-nome">'+_esc(empresa)+'</div><div class="doc-type">DP / RH — Ficha de Entrevista</div></div>');
    w.document.write('<div class="titulo-doc">FICHA DE ENTREVISTA</div>');
    w.document.write('<div class="sub-doc">Candidato: <strong>'+_esc(ent.nome)+'</strong></div>');
    w.document.write('<div class="section-label">Dados do Candidato</div>');
    w.document.write('<div class="field-grid">');
    w.document.write('<div class="field-block"><label>Nome Completo</label><div class="field-val">'+_esc(ent.nome||'')+'</div></div>');
    w.document.write('<div class="field-block"><label>CPF</label><div class="field-val">'+_esc(ent.cpf||'')+'</div></div>');
    w.document.write('<div class="field-block"><label>Data de Nascimento</label><div class="field-val">'+_esc(ent.nascimento||'')+'</div></div>');
    w.document.write('<div class="field-block"><label>Telefone / WhatsApp</label><div class="field-val">'+_esc(ent.telefone||'')+'</div></div>');
    w.document.write('<div class="field-block"><label>E-mail</label><div class="field-val">'+_esc(ent.email||'')+'</div></div>');
    w.document.write('<div class="field-block"><label>Status</label><div class="field-val">'+_esc(ent.status||'')+'</div></div>');
    w.document.write('</div>');
    w.document.write('<div class="section-label">Vaga Desejada</div>');
    w.document.write('<div class="field-grid">');
    w.document.write('<div class="field-block"><label>Cargo</label><div class="field-val">'+_esc(ent.cargoDesejado||'')+'</div></div>');
    w.document.write('<div class="field-block"><label>Departamento</label><div class="field-val">'+_esc(dept?dept.label:(ent.deptId||''))+'</div></div>');
    w.document.write('<div class="field-block"><label>Data da Entrevista</label><div class="field-val">'+_esc(ent.dataEntrevista||'')+'</div></div>');
    w.document.write('</div>');
    if(ent.obs){ w.document.write('<div class="section-label">Observações</div><p style="font-size:10pt;line-height:1.6;">'+_esc(ent.obs)+'</p>'); }
    w.document.write('<div class="section-label">Avaliação do Entrevistador</div>');
    w.document.write('<table><thead><tr><th>Critério</th><th style="width:60px">Nota (1-5)</th><th>Observação</th></tr></thead><tbody>');
    ['Apresentação Pessoal','Comunicação e Postura','Experiência Profissional','Disponibilidade de Horário','Alinhamento com a Cultura'].forEach(function(c){
      w.document.write('<tr><td>'+c+'</td><td></td><td></td></tr>');
    });
    w.document.write('</tbody></table>');
    w.document.write('<div class="ass-grid"><div class="ass-bloco"><label>Assinatura do Entrevistador</label><div class="ass-line"></div><label>Data</label><div class="ass-line"></div></div><div class="ass-bloco"><label>Resultado Final</label><div class="ass-line"></div><label>Data</label><div class="ass-line"></div></div></div>');
    w.document.write('<div class="rodape"><span>'+_esc(empresa)+' · DP/RH — Ficha de Entrevista</span><span>'+today()+'</span></div>');
    w.document.write('</div></body></html>');
    w.document.close(); setTimeout(function(){w.print();},400);
  }
}

// ── CSS ───────────────────────────────────────────────────────────────────────

(function(){
  if(document.getElementById('dp-styles'))return;
  var s=document.createElement('style'); s.id='dp-styles';
  s.textContent=[
    '.dp-sidebar{display:flex;flex-direction:column;border-right:1px solid var(--border);background:var(--surface,var(--bg2));}',
    '.dp-sidebar-title{padding:9px 14px;font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted,var(--text3));border-bottom:2px solid var(--border);background:var(--bg);}',
    '.dp-sidebar-scroll{overflow-y:auto;flex:1;}',
    '.dp-dept-hdr{display:flex;align-items:center;gap:6px;padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.83rem;font-weight:600;user-select:none;transition:background .12s;}',
    '.dp-dept-hdr:hover{background:var(--hover,var(--bg3));}',
    '.dp-dept-expanded{background:var(--gold-dim,rgba(201,168,76,0.07));}',
    '.dp-toggle-icon{font-size:0.72rem;color:var(--text-muted,var(--text3));width:12px;flex-shrink:0;}',
    '.dp-dept-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.dp-cargo-item{display:flex;align-items:center;gap:8px;padding:8px 12px 8px 28px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s;}',
    '.dp-cargo-item:hover{background:var(--hover,var(--bg3));}',
    '.dp-cargo-item.active{background:rgba(var(--primary-rgb,201,168,76),0.12);border-left:3px solid var(--gold,var(--primary));color:var(--gold,var(--primary));}',
    '.dp-cargo-icon{font-size:1rem;flex-shrink:0;}',
    '.dp-cargo-info{flex:1;min-width:0;}',
    '.dp-cargo-nome{font-size:0.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.dp-cargo-func{font-size:0.72rem;color:var(--text-muted,var(--text3));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.dp-cargo-empty{padding:8px 12px 8px 28px;font-size:0.78rem;color:var(--text-muted,var(--text3));font-style:italic;}',
    '.dp-panel{display:flex;flex-direction:column;overflow:hidden;min-height:0;}',
    '.dp-panel-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;flex:1;}',
    '.dp-panel-hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg2,var(--surface));flex-wrap:wrap;flex-shrink:0;}',
    '.dp-panel-hdr-btns{display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;}',
    '.dp-progress-wrap{padding:10px 18px;border-bottom:1px solid var(--border);flex-shrink:0;}',
    '.dp-progress-info{display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:5px;}',
    '.dp-prog-bar{height:6px;background:var(--border);border-radius:3px;overflow:hidden;}',
    '.dp-prog-fill{height:100%;border-radius:3px;transition:width .35s;}',
    '.dp-panel-actions{display:flex;gap:8px;padding:10px 18px;border-bottom:1px solid var(--border);background:var(--bg);flex-wrap:wrap;flex-shrink:0;}',
    '.dp-panel-body{flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:10px;}',
    '.dp-cat-block{border:1px solid var(--border);border-radius:8px;overflow:hidden;}',
    '.dp-cat-hdr{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:var(--bg);border-bottom:1px solid var(--border);}',
    '.dp-cat-lbl{font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted,var(--text3));}',
    '.dp-chk-list{display:flex;flex-direction:column;}',
    '.dp-chk-row{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);transition:background .12s;}',
    '.dp-chk-row:last-child{border-bottom:none;}',
    '.dp-chk-row:hover{background:var(--hover,var(--bg3));}',
    '.dp-row-done{opacity:.55;}',
    '.dp-chk-toggle{background:none;border:none;cursor:pointer;font-size:1.1rem;padding:0 2px;flex-shrink:0;line-height:1;}',
    '.dp-chk-txt{flex:1;font-size:0.88rem;}',
    '.dp-chk-catbadge{font-size:0.68rem;padding:2px 7px;border-radius:10px;background:var(--gold-dim,rgba(201,168,76,0.12));color:var(--gold,var(--primary));white-space:nowrap;flex-shrink:0;}',
    '.dp-docs-section{padding:14px 18px;border-top:1px solid var(--border);}',
    '.dp-docs-title{font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted,var(--text3));margin-bottom:10px;}',
    '.dp-ent-page{padding:16px;display:flex;flex-direction:column;gap:14px;}',
    '.dp-ent-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}',
    '.dp-ent-grid{display:flex;flex-direction:column;gap:10px;}',
    '.dp-ent-card{display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg2,var(--surface));transition:box-shadow .15s;}',
    '.dp-ent-card:hover{box-shadow:0 2px 10px rgba(0,0,0,0.1);}',
    '.dp-ent-card-stripe{width:5px;flex-shrink:0;}',
    '.dp-ent-card-body{flex:1;padding:12px 14px;min-width:0;}',
    '.dp-ent-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;}',
    '.dp-ent-nome{font-size:0.97rem;font-weight:700;margin-bottom:4px;}',
    '.dp-ent-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
    '.dp-ent-status-badge{padding:3px 10px;border-radius:20px;font-size:0.74rem;font-weight:600;white-space:nowrap;flex-shrink:0;}',
    '.dp-ent-card-footer{display:flex;gap:12px;flex-wrap:wrap;font-size:0.77rem;color:var(--text-muted,var(--text3));}',
    '.dp-ent-card-actions{display:flex;flex-direction:column;gap:4px;padding:10px;justify-content:center;flex-shrink:0;border-left:1px solid var(--border);}',
    '.dp-view-section{margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);}',
    '.dp-view-section:last-child{border-bottom:none;margin-bottom:0;}',
    '.dp-view-title{font-size:0.76rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted,var(--text3));margin-bottom:8px;}',
    '.dp-view-row{display:flex;gap:12px;margin-bottom:6px;font-size:0.88rem;align-items:baseline;}',
    '.dp-view-label{color:var(--text-muted,var(--text3));min-width:130px;flex-shrink:0;font-size:0.82rem;}',
    '.dp-view-val{font-weight:500;}',
    '.dp-form-section-title{margin:16px 0 4px;font-size:0.85rem;font-weight:700;color:var(--gold,var(--primary));border-bottom:1px solid var(--border);padding-bottom:4px;}',
    '@media(max-width:600px){.dp-panel-hdr{flex-direction:column;}.dp-panel-hdr-btns{flex-wrap:wrap;}.dp-ent-card-actions{flex-direction:row;border-left:none;border-top:1px solid var(--border);padding:8px 12px;}.mop-row2{grid-template-columns:1fr;}}',
  ].join('');
  document.head.appendChild(s);
})();
