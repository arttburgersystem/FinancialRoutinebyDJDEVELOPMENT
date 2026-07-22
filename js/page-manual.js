// ── PAGE MANUAL DE OPERAÇÃO — P.O.P ──────────────────────────────────────────

var _manualBusca     = '';
var _manualDept      = null;
var _manualTab       = 'artigos';
var _clSelDept       = 'cozinha';
var _clEdits         = {};
var _sgSelFolder     = null;
var _opSelFolder     = null;
var _sgExpandFolders = {};
var _opExpandFolders = {};
var _docDB           = null;
var _pendingDocData  = null;

var MANUAL_DEPTS = [
  { id: 'cozinha',     label: '🍔 Cozinha' },
  { id: 'atendimento', label: '🛎️ Atendimento / Salão' },
  { id: 'caixa',       label: '💳 Caixa & PDV' },
  { id: 'delivery',    label: '🛵 Delivery' },
  { id: 'limpeza',     label: '🧹 Limpeza & Higienização' },
  { id: 'estoque',     label: '📦 Estoque & Compras' },
  { id: 'rh',          label: '👥 RH & Pessoas' },
  { id: 'manutencao',  label: '🔧 Manutenção' },
  { id: 'geral',       label: '📋 Geral' },
];
var MANUAL_CATS = ['Procedimento Operacional','Equipamentos','Padrão de Atendimento','Normas & Segurança','Abertura & Fechamento','Treinamento','Outro'];
var SEG_CATS    = ['PGR','PCMSO','ASO','LTCAT','NR-12','NR-10','NR-17','CIPA','Treinamento NR','ART/RRT','EPI/EPC','Relatório de Inspeção','Outro'];
var OP_CATS     = ['Alvará','Licença','Contrato','Relatório','Declaração','Certidão','Nota Fiscal','Outro'];

// ── RENDER PRINCIPAL ──────────────────────────────────────────────────────────

function renderManual() {
  var artigos = (state.manualArtigos  || []).filter(function(a){ return a.profile===state.profile; });
  var docs    = (state.manualDocs     || []).filter(function(d){ return d.profile===state.profile; });
  var folders = (state.manualFolders  || []).filter(function(f){ return f.profile===state.profile; });

  function mTab(id, label) {
    return btn('tab-btn'+(_manualTab===id?' active':''), label, function(){ _manualTab=id; setState({}); });
  }

  var tabsRow = div('tabs-row',[
    mTab('artigos','📝 Artigos & Procedimentos'),
    mTab('departamentos','✅ Checklists de Abertura/Fechamento'),
    mTab('seguranca','🦺 Segurança do Trabalho'),
    mTab('operacional','📁 Documentos Operacionais'),
  ]);

  var headerBtnEl = null;
  if (_manualTab==='artigos') {
    headerBtnEl = btn('btn-primary','+ Novo Artigo',function(){
      setState({manualModal:{novo:true,departamento:_manualDept||'cozinha',categoria:'Procedimento Operacional',titulo:'',conteudo:''}});
    });
  } else if (_manualTab==='seguranca'||_manualTab==='operacional') {
    headerBtnEl = btn('btn-primary','⬆ Enviar Documento',function(){
      _pendingDocData=null;
      var selF=_manualTab==='seguranca'?_sgSelFolder:_opSelFolder;
      setState({manualDocModal:{modulo:_manualTab,folderId:selF}});
    });
  }

  var tabDocs = docs.filter(function(d){ return d.modulo===_manualTab; });
  var subtitle = _manualTab==='artigos' ? 'Procedimento Operacional Padrão · '+artigos.length+' artigo'+(artigos.length!==1?'s':'')
    : _manualTab==='departamentos' ? 'Checklists de abertura e fechamento por departamento'
    : _manualTab==='seguranca'     ? 'Segurança do Trabalho · '+tabDocs.length+' arquivo'+(tabDocs.length!==1?'s':'')
    : 'Documentos Operacionais · '+tabDocs.length+' arquivo'+(tabDocs.length!==1?'s':'');

  var header = el('div',{class:'manual-header'},[
    el('div',{},[
      el('h2',{style:{margin:'0 0 2px',fontSize:'1.25rem',fontWeight:'700'}},'📖 Manual de Operação (P.O.P)'),
      el('p',{style:{margin:'0',fontSize:'0.82rem',color:'var(--text-muted)'}},subtitle),
    ]),
    headerBtnEl||el('span',{},''),
  ]);

  var wrap = div('page-section',[header,tabsRow]);
  if      (_manualTab==='artigos')       wrap.appendChild(_manualArtigosTab(artigos));
  else if (_manualTab==='departamentos') wrap.appendChild(_manualDeptTab());
  else if (_manualTab==='seguranca')     wrap.appendChild(_explorerLayout('seguranca', docs, folders));
  else                                   wrap.appendChild(_explorerLayout('operacional', docs, folders));

  if (state.manualModal)       wrap.appendChild(_manualModal(state.manualModal));
  if (state.manualDocModal)    wrap.appendChild(_docUploadModal(state.manualDocModal, folders));
  if (state.manualFolderModal) wrap.appendChild(_folderModal(state.manualFolderModal, folders));
  return wrap;
}

// ── ABA: ARTIGOS ──────────────────────────────────────────────────────────────

function _manualArtigosTab(artigos) {
  var filtrados = artigos;
  if (_manualBusca) {
    var q = _manualBusca.toLowerCase();
    filtrados = artigos.filter(function(a){ return (a.titulo||'').toLowerCase().includes(q)||(a.conteudo||'').toLowerCase().includes(q)||(a.categoria||'').toLowerCase().includes(q); });
  }
  if (_manualDept) filtrados = filtrados.filter(function(a){ return a.departamento===_manualDept; });

  var buscaInp = el('input',{type:'search',placeholder:'🔍 Buscar procedimentos...',value:_manualBusca,class:'manual-search'},[]);
  buscaInp.oninput = function(){ _manualBusca=this.value; setState({}); };

  var sidebarItems = [];
  MANUAL_DEPTS.forEach(function(dept){
    var itens = filtrados.filter(function(a){ return a.departamento===dept.id; });
    if (_manualBusca&&!itens.length) return;
    sidebarItems.push(el('div',{class:'manual-dept-hdr'+(_manualDept===dept.id?' active':''),onclick:function(){ _manualDept=_manualDept===dept.id?null:dept.id; setState({}); }},[
      el('span',{},dept.label),
      el('span',{class:'manual-dept-count'},String(artigos.filter(function(a){return a.departamento===dept.id;}).length)),
    ]));
    if (_manualDept===dept.id||_manualBusca) {
      itens.forEach(function(a){
        sidebarItems.push(el('div',{class:'manual-article-link'+(state.manualSel===a.id?' active':''),onclick:function(){setState({manualSel:a.id});}},
          [el('span',{class:'manual-link-cat'},a.categoria||''),el('span',{class:'manual-link-titulo'},a.titulo||'')]));
      });
    }
  });
  if (!sidebarItems.length) sidebarItems.push(el('div',{style:{padding:'20px 12px',color:'var(--text-muted)',fontSize:'0.83rem'}},_manualBusca?'Nenhum resultado.':'Nenhum artigo criado ainda.'));

  var sel = state.manualSel ? artigos.find(function(a){return a.id===state.manualSel;}) : null;
  return el('div',{},[
    el('div',{style:{marginBottom:'10px'}},[buscaInp]),
    el('div',{class:'manual-layout'},[el('div',{class:'manual-sidebar'},sidebarItems), sel?_manualViewArticle(sel):_manualEmptyState()]),
  ]);
}

// ── ABA: DEPARTAMENTOS / CHECKLISTS ──────────────────────────────────────────

function _manualDeptTab() {
  var cls  = state.manualChecklists||{};
  var dept = MANUAL_DEPTS.find(function(d){return d.id===_clSelDept;})||MANUAL_DEPTS[0];

  var sideItems = MANUAL_DEPTS.map(function(d){
    var clD=cls[d.id]||{}; var tA=(clD.abertura||[]).length,tF=(clD.fechamento||[]).length;
    return el('div',{class:'manual-dept-hdr'+(_clSelDept===d.id?' active':''),onclick:function(){_clSelDept=d.id;setState({});}},
      [el('span',{},d.label),el('span',{class:'manual-dept-count'},tA+'/'+tF)]);
  });

  var clDept=cls[dept.id]||{};
  var abertura=clDept.abertura||[];
  var fechamento=clDept.fechamento||[];

  function salvarTipo(tipo,itens){ var novo=Object.assign({},cls);if(!novo[dept.id])novo[dept.id]={};novo[dept.id]=Object.assign({},novo[dept.id]);novo[dept.id][tipo]=itens;lsSet('manualChecklists',novo);setState({manualChecklists:novo});scheduleSave(); }
  function addItem(tipo,itens){ var txt=((document.getElementById('cl-add-'+tipo)||{}).value||'').trim();if(!txt)return;salvarTipo(tipo,itens.concat([{id:uid(),texto:txt}])); }
  function removeItem(tipo,itens,idx){ salvarTipo(tipo,itens.filter(function(_,i){return i!==idx;})); }
  function saveEdits(tipo,itens){ var nova=itens.map(function(item,i){var k=dept.id+'.'+tipo+'.'+i;return _clEdits[k]!==undefined?Object.assign({},item,{texto:_clEdits[k]}):item;});itens.forEach(function(_,i){delete _clEdits[dept.id+'.'+tipo+'.'+i];});salvarTipo(tipo,nova); }

  function buildSection(tipo,itens,cor,icon){
    var rows=itens.map(function(item,i){
      var k=dept.id+'.'+tipo+'.'+i;
      var inp=el('input',{type:'text',value:item.texto||'',class:'cl-item-input',placeholder:'Descrição da tarefa...'},[]);
      inp.oninput=function(){_clEdits[k]=this.value;};
      inp.onblur=function(){saveEdits(tipo,itens);};
      var del=el('button',{class:'cl-del-btn',type:'button'},'✕');
      del.onmousedown=function(e){e.preventDefault();};
      del.onclick=function(){removeItem(tipo,itens,i);};
      return el('div',{class:'cl-item-row'},[el('span',{class:'cl-num'},String(i+1)),el('span',{class:'cl-check-box'},'☐'),inp,del]);
    });
    var addInp=el('input',{id:'cl-add-'+tipo,type:'text',class:'cl-add-input',placeholder:'Nova tarefa... (Enter para adicionar)'},[]);
    addInp.onkeydown=function(e){if(e.key==='Enter')addItem(tipo,itens);};
    return el('div',{class:'cl-section'},[
      el('div',{class:'cl-section-header'},[
        el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[
          el('span',{class:'cl-section-icon'},icon),
          el('h3',{class:'cl-section-title',style:{color:cor}},tipo==='abertura'?'Checklist de Abertura':'Checklist de Fechamento'),
          el('span',{class:'manual-dept-count'},String(itens.length)+' itens'),
        ]),
        btn('btn-secondary cl-print-btn','🖨️ Imprimir PDF',function(){_clPrint(dept,tipo,itens);}),
      ]),
      rows.length?el('div',{class:'cl-items'},rows):el('div',{class:'cl-empty-hint'},'Nenhuma tarefa ainda. Adicione abaixo.'),
      el('div',{class:'cl-add-row'},[addInp,btn('btn-secondary cl-add-btn','+ Adicionar',function(){addItem(tipo,itens);})]),
    ]);
  }

  return el('div',{class:'manual-layout',style:{minHeight:'560px'}},[
    el('div',{class:'manual-sidebar'},sideItems),
    el('div',{class:'cl-main'},[
      el('div',{class:'cl-dept-title'},[
        el('h2',{style:{margin:'0 0 4px',fontSize:'1.1rem',fontWeight:'700'}},dept.label),
        el('p',{style:{margin:'0',fontSize:'0.82rem',color:'var(--text-muted)'}},abertura.length+' itens de abertura · '+fechamento.length+' itens de fechamento'),
        el('div',{style:{marginTop:'10px'}},[btn('btn-primary','🖨️ Imprimir Abertura + Fechamento',function(){_clPrintAmbos(dept,abertura,fechamento);})]),
      ]),
      buildSection('abertura',abertura,'var(--success,#22a047)','🌅'),
      buildSection('fechamento',fechamento,'var(--primary)','🌙'),
    ]),
  ]);
}

// ── EXPLORER LAYOUT ───────────────────────────────────────────────────────────

function _explorerLayout(modulo, allDocs, allFolders) {
  var docs    = allDocs.filter(function(d){ return d.modulo===modulo; });
  var folders = allFolders.filter(function(f){ return f.modulo===modulo; });
  var selFolder = modulo==='seguranca' ? _sgSelFolder : _opSelFolder;
  return el('div',{class:'manual-layout',style:{minHeight:'520px'}},[
    _explorerSidebar(modulo, folders, docs, selFolder),
    _explorerContent(modulo, folders, docs, selFolder),
  ]);
}

// ── SIDEBAR ÁRVORE ────────────────────────────────────────────────────────────

function _explorerSidebar(modulo, folders, docs, selFolder) {
  var rootItem = el('div',{
    class:'ftree-item ftree-root'+(selFolder===null?' active':''),
    onclick:function(){ if(modulo==='seguranca')_sgSelFolder=null; else _opSelFolder=null; setState({}); },
  },[
    el('span',{class:'ftree-icon'},'🖥️'),
    el('span',{class:'ftree-name'},'Todos os documentos'),
    el('span',{class:'manual-dept-count'},String(docs.length)),
  ]);
  var treeItems = _buildFolderTree(folders, modulo, null, 0, docs);
  var newBtn = el('div',{class:'ftree-new-row'},[
    btn('ftree-new-btn','📁 Nova Pasta',function(){
      setState({manualFolderModal:{modulo:modulo,parentId:selFolder,name:''}});
    }),
  ]);
  return el('div',{class:'manual-sidebar ftree-sidebar'},[rootItem].concat(treeItems).concat([newBtn]));
}

function _buildFolderTree(folders, modulo, parentId, depth, docs) {
  var children = folders.filter(function(f){ return (f.parentId||null)===(parentId||null); });
  var items = [];
  var expandedSet = modulo==='seguranca' ? _sgExpandFolders : _opExpandFolders;
  var selFolder   = modulo==='seguranca' ? _sgSelFolder     : _opSelFolder;

  children.forEach(function(folder){
    var hasKids    = folders.some(function(f){ return f.parentId===folder.id; });
    var isExpanded = !!expandedSet[folder.id];
    var isSelected = selFolder===folder.id;
    var docCount   = docs.filter(function(d){ return d.folderId===folder.id; }).length;

    var item = el('div',{
      class:'ftree-item'+(isSelected?' active':''),
      style:{paddingLeft:(10+depth*16)+'px'},
    },[
      el('span',{class:'ftree-toggle'},hasKids?(isExpanded?'▾':'▸'):''),
      el('span',{class:'ftree-icon'},isExpanded?'📂':'📁'),
      el('span',{class:'ftree-name'},folder.name),
      docCount>0 ? el('span',{class:'manual-dept-count'},String(docCount)) : el('span',{},''),
    ]);
    item.onclick = function(e){
      e.stopPropagation();
      if(modulo==='seguranca'){ _sgSelFolder=folder.id; if(hasKids)_sgExpandFolders[folder.id]=!isExpanded; }
      else { _opSelFolder=folder.id; if(hasKids)_opExpandFolders[folder.id]=!isExpanded; }
      setState({});
    };
    items.push(item);
    if (isExpanded) items = items.concat(_buildFolderTree(folders, modulo, folder.id, depth+1, docs));
  });
  return items;
}

// ── PAINEL DE CONTEÚDO ────────────────────────────────────────────────────────

function _explorerContent(modulo, folders, docs, selFolder) {
  // Breadcrumb
  var path=[]; var cur=selFolder;
  while(cur){ var pf=folders.find(function(x){return x.id===cur;}); if(!pf)break; path.unshift(pf); cur=pf.parentId||null; }

  var bcParts=[
    el('span',{class:'bc-item'+(selFolder===null?' bc-current':''),onclick:function(){
      if(modulo==='seguranca')_sgSelFolder=null; else _opSelFolder=null; setState({});
    }},'🖥️ Início'),
  ];
  path.forEach(function(folder,i){
    bcParts.push(el('span',{class:'bc-sep'},'›'));
    var isCur=i===path.length-1;
    var bcItem=el('span',{class:'bc-item'+(isCur?' bc-current':'')},folder.name);
    if(!isCur) bcItem.onclick=function(){
      if(modulo==='seguranca'){_sgSelFolder=folder.id;_sgExpandFolders[folder.id]=true;}
      else{_opSelFolder=folder.id;_opExpandFolders[folder.id]=true;}
      setState({});
    };
    bcParts.push(bcItem);
  });

  var toolbar = el('div',{class:'exp-toolbar'},[
    el('div',{class:'breadcrumb'},bcParts),
    btn('ftree-new-btn','📁 Nova Pasta',function(){
      setState({manualFolderModal:{modulo:modulo,parentId:selFolder,name:''}});
    }),
  ]);

  // Subpastas
  var subFolders = folders.filter(function(f){ return (f.parentId||null)===(selFolder||null); });
  var folderGrid = subFolders.length ? el('div',{class:'exp-folder-grid'},subFolders.map(function(f){
    var dCnt=docs.filter(function(d){return d.folderId===f.id;}).length;
    var sCnt=folders.filter(function(sf){return sf.parentId===f.id;}).length;
    var meta=[]; if(dCnt)meta.push(dCnt+' arquivo'+(dCnt!==1?'s':'')); if(sCnt)meta.push(sCnt+' subpasta'+(sCnt!==1?'s':''));

    var renBtn=el('button',{class:'exp-fold-act',title:'Renomear'},'✏️');
    renBtn.onclick=function(e){ e.stopPropagation(); setState({manualFolderModal:{modulo:modulo,editId:f.id,name:f.name}}); };
    var delBtn=el('button',{class:'exp-fold-act exp-fold-del',title:'Excluir'},'🗑');
    delBtn.onclick=function(e){
      e.stopPropagation();
      if(folders.some(function(sf){return sf.parentId===f.id;})||docs.some(function(d){return d.folderId===f.id;})){
        showToast('Pasta não está vazia. Mova ou exclua o conteúdo primeiro.','error'); return;
      }
      if(!confirm('Excluir pasta "'+f.name+'"?'))return;
      var arr=(state.manualFolders||[]).filter(function(fl){return fl.id!==f.id;});
      lsSet('manualFolders',arr); setState({manualFolders:arr}); scheduleSave();
      showToast('Pasta excluída','error');
    };

    var card=el('div',{class:'exp-folder-card'},[
      el('div',{class:'exp-folder-top'},[
        el('span',{class:'exp-folder-icon'},'📂'),
        el('div',{class:'exp-fold-btns'},[renBtn,delBtn]),
      ]),
      el('div',{class:'exp-folder-label'},f.name),
      el('div',{class:'exp-folder-meta'},meta.length?meta.join(' · '):'Pasta vazia'),
    ]);
    card.onclick=function(){
      if(modulo==='seguranca'){_sgSelFolder=f.id;_sgExpandFolders[f.id]=true;}
      else{_opSelFolder=f.id;_opExpandFolders[f.id]=true;}
      setState({});
    };
    return card;
  })) : null;

  // Documentos desta pasta
  var folderDocs = selFolder===null
    ? docs.filter(function(d){ return !d.folderId||!folders.some(function(f){return f.id===d.folderId;}); })
    : docs.filter(function(d){ return d.folderId===selFolder; });
  folderDocs = folderDocs.slice().sort(function(a,b){return (b.criadoEm||'').localeCompare(a.criadoEm||'');});

  var docsSection = folderDocs.length ? el('div',{class:'exp-docs-section'},[
    subFolders.length ? el('div',{class:'exp-section-label'},'Arquivos nesta pasta') : null,
    el('div',{class:'doc-list'},folderDocs.map(function(doc){return _docCard(doc,folders);})),
  ].filter(Boolean)) : null;

  var isEmpty=!subFolders.length&&!folderDocs.length;
  var emptyEl = isEmpty ? el('div',{class:'doc-empty'},[
    el('div',{style:{fontSize:'2.5rem',marginBottom:'8px'}},selFolder?'📂':'🗂️'),
    el('p',{style:{margin:'0',color:'var(--text-muted)'}},
      selFolder?'Pasta vazia. Envie um documento ou crie subpastas.':'Nenhum documento ainda. Crie uma pasta e envie seus arquivos.'),
  ]) : null;

  var children=[toolbar];
  if(folderGrid)  children.push(folderGrid);
  if(docsSection) children.push(docsSection);
  if(emptyEl)     children.push(emptyEl);
  return el('div',{class:'exp-content'},children);
}

// ── MODAL CRIAR / RENOMEAR PASTA ──────────────────────────────────────────────

function _folderModal(m, allFolders) {
  var isEdit    = !!m.editId;
  var editFolder= isEdit ? (allFolders||[]).find(function(f){return f.id===m.editId;}) : null;
  var sameMod   = (allFolders||[]).filter(function(f){return f.modulo===m.modulo;});

  function _buildParentOpts(folders, excludeId, parentId, depth){
    var ch=folders.filter(function(f){return (f.parentId||null)===(parentId||null)&&f.id!==excludeId;});
    var opts=[];
    ch.forEach(function(f){
      var pfx=depth>0?Array(depth+1).join('　')+'└ ':'';
      opts.push(el('option',{value:f.id},pfx+'📂 '+f.name));
      opts=opts.concat(_buildParentOpts(folders,excludeId,f.id,depth+1));
    });
    return opts;
  }

  function salvar(){
    var nome=((document.getElementById('folder-name')||{}).value||'').trim();
    if(!nome){showToast('Digite um nome para a pasta','error');return;}
    var arr=state.manualFolders||[];
    if(isEdit){
      var rawParent=((document.getElementById('folder-parent')||{}).value||'__root__');
      var newParent=rawParent==='__root__'?null:rawParent;
      if(newParent){
        var desc=[m.editId];
        var collect=function(pid){arr.filter(function(f){return f.parentId===pid;}).forEach(function(f){desc.push(f.id);collect(f.id);});};
        collect(m.editId);
        if(desc.indexOf(newParent)!==-1){showToast('Não é possível mover para dentro de si mesma','error');return;}
      }
      arr=arr.map(function(f){return f.id===m.editId?Object.assign({},f,{name:nome,parentId:newParent}):f;});
    } else {
      var newId=uid();
      arr=arr.concat([{id:newId,modulo:m.modulo,profile:state.profile,name:nome,parentId:m.parentId||null,criadoEm:today()}]);
      if(m.parentId){
        if(m.modulo==='seguranca')_sgExpandFolders[m.parentId]=true;
        else _opExpandFolders[m.parentId]=true;
      }
    }
    lsSet('manualFolders',arr);
    setState({manualFolders:arr,manualFolderModal:null});
    scheduleSave();
    showToast(isEdit?'Pasta atualizada!':'Pasta criada!','success');
  }
  var parentLabel='';
  if(!isEdit&&m.parentId){
    var parent=(allFolders||[]).find(function(f){return f.id===m.parentId;});
    if(parent) parentLabel=' em "'+parent.name+'"';
  }
  var nameInp=el('input',{id:'folder-name',type:'text',class:'mop-input',style:{fontSize:'1rem'},placeholder:'Nome da pasta...',value:m.name||''},[]);
  nameInp.onkeydown=function(e){if(e.key==='Enter')salvar();};
  setTimeout(function(){var el2=document.getElementById('folder-name');if(el2){el2.focus();el2.select();}},80);

  var parentEl=null;
  if(isEdit){
    var rootOpt=el('option',{value:'__root__'},'📁 Raiz (nível raiz)');
    var parentSel=el('select',{id:'folder-parent',class:'mop-input'},[rootOpt].concat(_buildParentOpts(sameMod,m.editId,null,0)));
    parentSel.value=(editFolder&&editFolder.parentId)||'__root__';
    parentEl=el('div',{},[el('label',{class:'mop-label',style:{marginTop:'12px'}},'Mover para (pasta pai)'),parentSel]);
  }

  var overlay=el('div',{class:'modal-overlay',onclick:function(e){if(e.target===overlay)setState({manualFolderModal:null});}},[
    el('div',{class:'modal-box',style:{maxWidth:'420px'},onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('h3',{style:{margin:0}},isEdit?'✏️ Renomear / Mover Pasta':'📁 Nova Pasta'+parentLabel),
        btn('modal-close','×',function(){setState({manualFolderModal:null});}),
      ]),
      el('div',{style:{padding:'20px'}},[
        el('label',{class:'mop-label'},'Nome'),
        nameInp,
        parentEl,
      ].filter(Boolean)),
      el('div',{class:'modal-footer'},[
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','Cancelar',function(){setState({manualFolderModal:null});}),
          btn('btn-primary',isEdit?'✓ Salvar':'✓ Criar Pasta',salvar),
        ]),
      ]),
    ]),
  ]);
  return overlay;
}

// ── CARD DE DOCUMENTO ─────────────────────────────────────────────────────────

function _docCard(doc, allFolders) {
  var ext=(doc.nome||'').split('.').pop().toUpperCase();
  var extColor={PDF:'#e53e3e',DOC:'#3182ce',DOCX:'#3182ce',XLS:'#38a169',XLSX:'#38a169',JPG:'#dd6b20',PNG:'#dd6b20',ZIP:'#805ad5'}[ext]||'#718096';
  var folder=allFolders&&doc.folderId ? allFolders.find(function(f){return f.id===doc.folderId;}) : null;
  return el('div',{class:'doc-card'},[
    el('div',{class:'doc-card-left'},[el('div',{class:'doc-ext-badge',style:{background:extColor}},ext||'?')]),
    el('div',{class:'doc-card-body'},[
      el('div',{class:'doc-card-nome'},doc.nome||'Sem nome'),
      el('div',{class:'doc-card-meta'},[
        doc.categoria ? el('span',{class:'doc-tag'},doc.categoria) : null,
        folder        ? el('span',{class:'doc-tag-period'},'📂 '+folder.name) : null,
        doc.tamanho   ? el('span',{style:{color:'var(--text-muted)',fontSize:'0.75rem'}},_fmtSize(doc.tamanho)) : null,
        doc.criadoEm  ? el('span',{style:{color:'var(--text-muted)',fontSize:'0.75rem'}},'📅 '+doc.criadoEm) : null,
      ].filter(Boolean)),
      doc.obs ? el('div',{class:'doc-card-obs'},doc.obs) : null,
    ].filter(Boolean)),
    el('div',{class:'doc-card-actions'},[
      btn('btn-secondary doc-act-btn','👁 Visualizar',function(){_docAction(doc.id,doc.nome,doc.tipo,'view');}),
      btn('btn-secondary doc-act-btn','⬇ Baixar',    function(){_docAction(doc.id,doc.nome,doc.tipo,'download');}),
      btn('btn-danger-outline doc-act-btn','🗑',      function(){
        if(!confirm('Excluir "'+doc.nome+'"?'))return;
        _idbDel(doc.id);
        var arr=(state.manualDocs||[]).filter(function(d){return d.id!==doc.id;});
        lsSet('manualDocs',arr);setState({manualDocs:arr});scheduleSave();
        showToast('Documento excluído','error');
      }),
    ]),
  ]);
}

// ── MODAL DE UPLOAD ───────────────────────────────────────────────────────────

function _docUploadModal(m, allFolders) {
  var modulo   = m.modulo||'operacional';
  var cats     = modulo==='seguranca' ? SEG_CATS : OP_CATS;
  var myFolders= (allFolders||[]).filter(function(f){return f.modulo===modulo;});
  var anoAtual = String(new Date().getFullYear());

  var sizeInfo  = el('span',{style:{fontSize:'0.78rem',color:'var(--text-muted)',marginLeft:'8px'}},'');
  var statusEl  = el('div',{style:{fontSize:'0.82rem',marginTop:'4px'}},'');
  var fileInput = el('input',{type:'file',id:'doc-file',accept:'.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip',style:{width:'100%',boxSizing:'border-box'}},[]);
  fileInput.onchange=function(){
    var file=this.files[0]; _pendingDocData=null;
    if(!file){sizeInfo.textContent='';return;}
    if(file.size>50*1024*1024){showToast('Arquivo muito grande. Máximo 50 MB.','error');this.value='';return;}
    sizeInfo.textContent='('+_fmtSize(file.size)+')';
    statusEl.textContent='⏳ Lendo arquivo...'; statusEl.style.color='var(--text-muted)';
    var reader=new FileReader();
    reader.onload=function(e){
      _pendingDocData={dataBase64:e.target.result,tipo:file.type,tamanho:file.size};
      var nomeEl=document.getElementById('doc-nome');
      if(nomeEl&&!nomeEl.value)nomeEl.value=file.name;
      statusEl.textContent='✅ Arquivo pronto para salvar.';
      statusEl.style.color='var(--success,#22a047)';
    };
    reader.onerror=function(){statusEl.textContent='❌ Erro ao ler o arquivo.';statusEl.style.color='#e53e3e';};
    reader.readAsDataURL(file);
  };

  function buildFolderOptions(foldersArr, parentId, depth) {
    var children=foldersArr.filter(function(f){return (f.parentId||null)===(parentId||null);});
    var opts=[];
    children.forEach(function(f){
      var prefix=depth>0 ? Array(depth+1).join('　')+'└ ' : '';
      var optEl=el('option',{value:f.id},prefix+'📂 '+f.name);
      if(m.folderId===f.id) optEl.selected=true;
      opts.push(optEl);
      opts=opts.concat(buildFolderOptions(foldersArr,f.id,depth+1));
    });
    return opts;
  }
  var rootOpt=el('option',{value:''},'📁 Raiz (sem pasta específica)');
  if(!m.folderId) rootOpt.selected=true;
  var folderSel=el('select',{id:'doc-folder',class:'mop-input'},[rootOpt].concat(buildFolderOptions(myFolders,null,0)));

  var catSel=el('select',{id:'doc-cat',class:'mop-input'},cats.map(function(c){return el('option',{value:c},c);}));
  var anoInp=el('input',{id:'doc-ano',type:'number',value:anoAtual,min:'2000',max:'2099',class:'mop-input',placeholder:'Ex: 2024'},[]);
  var nomeInp=el('input',{id:'doc-nome',type:'text',class:'mop-input mop-titulo',placeholder:'Ex: PCMSO 2024, Alvará Municipal...'},[]);
  var obsInp=el('textarea',{id:'doc-obs',rows:2,class:'mop-textarea',style:{resize:'vertical'},placeholder:'Observações opcionais...'},[]);

  function salvar(){
    var nome=((document.getElementById('doc-nome')||{}).value||'').trim();
    var ano =((document.getElementById('doc-ano') ||{}).value||'').trim();
    var cat =((document.getElementById('doc-cat') ||{}).value)||cats[0];
    var obs =((document.getElementById('doc-obs') ||{}).value)||'';
    var fid =((document.getElementById('doc-folder')||{}).value)||null;
    if(!nome){showToast('Informe o nome do documento','error');return;}
    if(!_pendingDocData){showToast('Selecione um arquivo antes de salvar','error');return;}
    var id=uid();
    var meta={id:id,profile:state.profile,modulo:modulo,nome:nome,tipo:_pendingDocData.tipo,
      tamanho:_pendingDocData.tamanho,ano:ano,categoria:cat,obs:obs,folderId:fid||null,criadoEm:today()};
    _idbPut({id:id,dataBase64:_pendingDocData.dataBase64},function(ok){
      if(!ok){showToast('Erro ao salvar arquivo no armazenamento local','error');return;}
      var arr=(state.manualDocs||[]).concat([meta]);
      lsSet('manualDocs',arr);
      setState({manualDocs:arr,manualDocModal:null});
      scheduleSave(); _pendingDocData=null;
      showToast('Documento anexado com sucesso!','success');
    });
  }

  var overlay=el('div',{class:'modal-overlay',onclick:function(e){if(e.target===overlay)setState({manualDocModal:null});}},[
    el('div',{class:'modal-box mop-modal',onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[
        el('h3',{style:{margin:0}},modulo==='seguranca'?'🦺 Anexar Documento de Segurança':'📁 Anexar Documento Operacional'),
        btn('modal-close','×',function(){setState({manualDocModal:null});}),
      ]),
      el('div',{class:'mop-form'},[
        el('label',{class:'mop-label'},'Arquivo'),
        el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[fileInput,sizeInfo]),
        statusEl,
        el('label',{class:'mop-label'},'Nome do Documento'),
        nomeInp,
        el('label',{class:'mop-label'},'Pasta de Destino'),
        folderSel,
        el('div',{class:'mop-row2'},[
          el('div',{},[el('label',{class:'mop-label'},'Categoria'),catSel]),
          el('div',{},[el('label',{class:'mop-label'},'Ano'),anoInp]),
        ]),
        el('label',{class:'mop-label'},'Observações'),
        obsInp,
        el('div',{class:'doc-storage-note'},'📦 Arquivos salvos localmente (IndexedDB). Para acessar em outro dispositivo, refaça o upload.'),
      ]),
      el('div',{class:'modal-footer'},[
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[
          btn('btn-secondary','Cancelar',function(){setState({manualDocModal:null});}),
          btn('btn-primary','💾 Salvar Documento',salvar),
        ]),
      ]),
    ]),
  ]);
  return overlay;
}

// ── AÇÕES DE DOCUMENTO ────────────────────────────────────────────────────────

function _docAction(id,nome,tipo,action){
  _idbGet(id,function(record){
    if(!record||!record.dataBase64){showToast('Arquivo não encontrado no armazenamento local.','error');return;}
    try{
      var arr2=record.dataBase64.split(',');
      var mime=(arr2[0].match(/:(.*?);/)||[,'application/octet-stream'])[1];
      var bstr=atob(arr2[1]); var u8=new Uint8Array(bstr.length);
      for(var i=0;i<bstr.length;i++)u8[i]=bstr.charCodeAt(i);
      var blob=new Blob([u8],{type:mime}); var url=URL.createObjectURL(blob);
      if(action==='view')window.open(url,'_blank');
      else{var a=document.createElement('a');a.href=url;a.download=nome;a.click();}
      setTimeout(function(){URL.revokeObjectURL(url);},8000);
    }catch(e){showToast('Erro ao abrir arquivo: '+e.message,'error');}
  });
}
function _fmtSize(b){if(!b)return '';if(b<1024)return b+'B';if(b<1048576)return (b/1024).toFixed(1)+'KB';return (b/1048576).toFixed(1)+'MB';}

// ── IndexedDB ─────────────────────────────────────────────────────────────────

function _openDocDB(cb){if(_docDB){cb(_docDB);return;}try{var req=indexedDB.open('djf_manual_docs',1);req.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'id'});};req.onsuccess=function(e){_docDB=e.target.result;cb(_docDB);};req.onerror=function(){cb(null);};}catch(e){cb(null);}}
function _idbPut(record,cb){_openDocDB(function(db){if(!db){cb(false);return;}try{var tx=db.transaction('files','readwrite');tx.objectStore('files').put(record);tx.oncomplete=function(){cb(true);};tx.onerror=function(){cb(false);};}catch(e){cb(false);}});}
function _idbGet(id,cb){_openDocDB(function(db){if(!db){cb(null);return;}try{var tx=db.transaction('files','readonly');var req=tx.objectStore('files').get(id);req.onsuccess=function(){cb(req.result||null);};req.onerror=function(){cb(null);};}catch(e){cb(null);}});}
function _idbDel(id){_openDocDB(function(db){if(!db)return;try{var tx=db.transaction('files','readwrite');tx.objectStore('files').delete(id);}catch(e){}});}

// ── ARTIGO VIEW / EMPTY ───────────────────────────────────────────────────────

function _manualEmptyState(){
  return el('div',{class:'manual-empty'},[
    el('div',{style:{fontSize:'3rem',marginBottom:'12px'}},'📖'),
    el('h3',{style:{margin:'0 0 8px',fontWeight:'600'}},'Comece a construir o seu Manual'),
    el('p',{style:{margin:'0 0 20px',color:'var(--text-muted)',maxWidth:'380px',lineHeight:'1.6'}},'Documente cada procedimento do negócio. Essencial para treinamentos, filiais e franquias.'),
    el('div',{style:{marginTop:'24px'}},[btn('btn-primary','+ Criar primeiro procedimento',function(){setState({manualModal:{novo:true,departamento:'cozinha',categoria:'Procedimento Operacional',titulo:'',conteudo:''}});})]),
  ]);
}

function _manualViewArticle(artigo){
  var dept=MANUAL_DEPTS.find(function(d){return d.id===artigo.departamento;});
  var deptLabel=dept?dept.label:artigo.departamento;
  return el('div',{class:'manual-content-area'},[
    el('div',{class:'manual-article-header'},[
      el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'8px'}},[el('span',{class:'manual-badge dept'},deptLabel),el('span',{class:'manual-badge cat'},artigo.categoria||'')]),
      el('h1',{class:'manual-article-title'},artigo.titulo||''),
      el('div',{class:'manual-article-meta'},[artigo.criadoEm?el('span',{},'📅 Criado em '+artigo.criadoEm):null].filter(Boolean)),
    ]),
    el('div',{class:'manual-article-actions'},[
      btn('btn-secondary','✏️ Editar',function(){setState({manualModal:Object.assign({},artigo)});}),
      btn('btn-danger-outline','🗑️ Excluir',function(){if(!confirm('Excluir "'+artigo.titulo+'"?'))return;var arr=(state.manualArtigos||[]).filter(function(a){return a.id!==artigo.id;});lsSet('manualArtigos',arr);setState({manualArtigos:arr,manualSel:null});scheduleSave();showToast('Artigo excluído','error');}),
      btn('btn-secondary','🖨️ Imprimir',function(){_manualPrint(artigo,deptLabel);}),
    ]),
    el('div',{class:'manual-article-body'},[_renderMarkdown(artigo.conteudo||'')]),
  ]);
}

function _renderMarkdown(texto){
  if(!texto)return el('p',{style:{color:'var(--text-muted)'}},'Nenhum conteúdo.');
  var linhas=texto.split('\n'),blocos=[],lista=null;
  function flush(){if(lista){blocos.push(el('ul',{class:'manual-list'},lista));lista=null;}}
  function inl(txt){var span=document.createElement('span');txt.split(/(\*\*[^*]+\*\*)/g).forEach(function(p){if(p.startsWith('**')&&p.endsWith('**')){var b=document.createElement('strong');b.textContent=p.slice(2,-2);span.appendChild(b);}else span.appendChild(document.createTextNode(p));});return span;}
  linhas.forEach(function(l){
    if(l.startsWith('# '))       {flush();blocos.push(el('h2',{class:'manual-h1'},l.slice(2)));}
    else if(l.startsWith('## ')) {flush();blocos.push(el('h3',{class:'manual-h2'},l.slice(3)));}
    else if(l.startsWith('> '))  {flush();blocos.push(el('div',{class:'manual-callout'},[inl(l.slice(2))]));}
    else if(l.startsWith('⚠️')||l.startsWith('ATENÇÃO:')){flush();blocos.push(el('div',{class:'manual-warning'},[inl(l)]));}
    else if(l.startsWith('- ')||l.startsWith('• ')){if(!lista)lista=[];lista.push(el('li',{},[inl(l.slice(2))]));}
    else if(/^\d+\.\s/.test(l)) {flush();if(!lista)lista=[];lista.push(el('li',{class:'manual-ol-item'},[inl(l.replace(/^\d+\.\s/,''))]));}
    else if(l.trim()==='')      {flush();blocos.push(el('div',{style:{height:'8px'}},[]));}
    else if(l.trim()==='---')   {flush();blocos.push(el('hr',{class:'manual-hr'},[]));}
    else                        {flush();blocos.push(el('p',{class:'manual-p'},[inl(l)]));}
  });
  flush();
  return el('div',{class:'manual-rendered'},blocos);
}

// ── MODAL ARTIGO ──────────────────────────────────────────────────────────────

function _manualModal(artigo){
  var isNovo=!!artigo.novo;
  function salvar(){
    var titulo=(document.getElementById('mop-titulo')||{}).value||'';
    var dept  =(document.getElementById('mop-dept')  ||{}).value||'geral';
    var cat   =(document.getElementById('mop-cat')   ||{}).value||'';
    var cont  =(document.getElementById('mop-conteudo')||{}).value||'';
    if(!titulo.trim()){showToast('Informe o título','error');return;}
    var novo=Object.assign({},artigo,{id:isNovo?uid():artigo.id,profile:state.profile,titulo:titulo.trim(),departamento:dept,categoria:cat,conteudo:cont,criadoEm:isNovo?today():(artigo.criadoEm||today()),atualizadoEm:today()});
    delete novo.novo;
    var arr=isNovo?(state.manualArtigos||[]).concat([novo]):(state.manualArtigos||[]).map(function(a){return a.id===novo.id?novo:a;});
    lsSet('manualArtigos',arr);setState({manualArtigos:arr,manualModal:null,manualSel:novo.id});scheduleSave();
    showToast(isNovo?'Artigo criado!':'Artigo atualizado!','success');
  }
  function insText(a,d){var ta=document.getElementById('mop-conteudo');if(!ta)return;var s=ta.selectionStart,e=ta.selectionEnd,sel=ta.value.slice(s,e)||'texto',ins=a+sel+(d||'');ta.value=ta.value.slice(0,s)+ins+ta.value.slice(e);ta.focus();ta.selectionStart=s+a.length;ta.selectionEnd=s+a.length+sel.length;}
  function insLinha(p){var ta=document.getElementById('mop-conteudo');if(!ta)return;var s=ta.selectionStart,b=ta.value.lastIndexOf('\n',s-1)+1;if(!ta.value.slice(b,s).startsWith(p)){ta.value=ta.value.slice(0,b)+p+ta.value.slice(b);ta.focus();ta.selectionStart=ta.selectionEnd=s+p.length;}}
  var toolbar=el('div',{class:'mop-toolbar'},[
    _toolBtn('H1',function(){insLinha('# ');},'Título'),
    _toolBtn('H2',function(){insLinha('## ');},'Subtítulo'),
    _toolBtn('B', function(){insText('**','**');},'Negrito'),
    _toolBtn('—', function(){insLinha('- ');},'Lista'),
    _toolBtn('1.',function(){var ta=document.getElementById('mop-conteudo');if(!ta)return;var s=ta.selectionStart,b=ta.value.lastIndexOf('\n',s-1)+1;ta.value=ta.value.slice(0,b)+'1. '+ta.value.slice(b);ta.focus();},'Numerada'),
    _toolBtn('💡',function(){insLinha('> ');},'Observação'),
    _toolBtn('⚠️',function(){var ta=document.getElementById('mop-conteudo');if(!ta)return;var s=ta.selectionStart,ins='\n⚠️ ATENÇÃO: ';ta.value=ta.value.slice(0,s)+ins+ta.value.slice(s);ta.focus();ta.selectionStart=ta.selectionEnd=s+ins.length;},'Aviso'),
    _toolBtn('---',function(){var ta=document.getElementById('mop-conteudo');if(!ta)return;var s=ta.selectionStart,ins='\n---\n';ta.value=ta.value.slice(0,s)+ins+ta.value.slice(s);ta.focus();ta.selectionStart=ta.selectionEnd=s+ins.length;},'Separador'),
  ]);
  var deptSel=el('select',{id:'mop-dept',class:'mop-input'},MANUAL_DEPTS.map(function(d){return el('option',{value:d.id},d.label);}));deptSel.value=artigo.departamento||'cozinha';
  var catSel=el('select',{id:'mop-cat',class:'mop-input'},MANUAL_CATS.map(function(c){return el('option',{value:c},c);}));catSel.value=artigo.categoria||'Procedimento Operacional';
  var tituloInp=el('input',{id:'mop-titulo',type:'text',placeholder:'Título do procedimento...',value:artigo.titulo||'',class:'mop-input mop-titulo'},[]);
  var contTa=el('textarea',{id:'mop-conteudo',class:'mop-textarea',placeholder:'# Título\n\n## Passo a passo\n1. Primeiro passo\n2. Segundo passo',rows:16},[]);
  contTa.value=artigo.conteudo||'';
  var overlay=el('div',{class:'modal-overlay',onclick:function(e){if(e.target===overlay)setState({manualModal:null});}},[
    el('div',{class:'modal-box mop-modal',onclick:function(e){e.stopPropagation();}},[
      el('div',{class:'modal-header'},[el('h3',{style:{margin:0}},isNovo?'+ Novo Artigo':'✏️ Editar Artigo'),btn('modal-close','×',function(){setState({manualModal:null});})]),
      el('div',{class:'mop-form'},[
        el('div',{class:'mop-row2'},[el('div',{},[el('label',{class:'mop-label'},'Departamento'),deptSel]),el('div',{},[el('label',{class:'mop-label'},'Categoria'),catSel])]),
        el('label',{class:'mop-label'},'Título'),tituloInp,
        el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'12px',marginBottom:'4px'}},[el('label',{class:'mop-label',style:{margin:0}},'Conteúdo'),toolbar]),
        contTa,
      ]),
      el('div',{class:'modal-footer'},[
        !isNovo?btn('btn-danger-outline','🗑️ Excluir',function(){if(!confirm('Excluir "'+artigo.titulo+'"?'))return;var arr=(state.manualArtigos||[]).filter(function(a){return a.id!==artigo.id;});lsSet('manualArtigos',arr);setState({manualArtigos:arr,manualModal:null,manualSel:null});scheduleSave();showToast('Excluído','error');}):null,
        el('div',{style:{display:'flex',gap:'8px',marginLeft:'auto'}},[btn('btn-secondary','Cancelar',function(){setState({manualModal:null});}),btn('btn-primary',isNovo?'✓ Criar':'✓ Salvar',salvar)]),
      ].filter(Boolean)),
    ]),
  ]);
  return overlay;
}
function _toolBtn(label,onclick,title){var b=el('button',{class:'mop-tool',title:title||label,type:'button'},label);b.onclick=onclick;return b;}

// ── IMPRESSÃO ─────────────────────────────────────────────────────────────────

function _clLogoHTML(){var ed=(state.empresaData||{});var logo=ed.logo||ed.logoUrl||'';if(logo)return '<img src="'+logo+'" style="max-height:80px;max-width:200px;object-fit:contain;" alt="Logo">';return '<div style="font-size:1.8rem;font-weight:900;letter-spacing:-0.03em;">'+(ed.nome||'Artt Burger')+'</div>';}
function _clPrintCSS(){return '@page{size:A4 portrait;margin:18mm 16mm;}body{font-family:Arial,sans-serif;color:#000;font-size:10pt;line-height:1.4;margin:0;padding:0;}.pg{max-width:170mm;margin:0 auto;}.logo-area{text-align:center;padding-bottom:10px;border-bottom:3px solid #000;margin-bottom:12px;}.empresa-nome{font-size:9pt;text-transform:uppercase;letter-spacing:0.12em;color:#333;margin-top:4px;}.doc-type{font-size:7pt;color:#666;}.titulo-checklist{text-align:center;font-size:14pt;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 4px;}.dept-label{text-align:center;font-size:10pt;color:#333;margin-bottom:12px;}.info-bar{display:flex;gap:16px;border:1px solid #000;border-radius:4px;padding:8px 12px;margin-bottom:12px;font-size:9pt;}.info-field{flex:1;}.info-field label{font-size:7.5pt;text-transform:uppercase;letter-spacing:0.06em;color:#555;display:block;margin-bottom:2px;}.info-line{border-bottom:1px solid #777;min-height:18px;display:block;}table{width:100%;border-collapse:collapse;margin-bottom:14px;}thead th{background:#000;color:#fff;padding:5px 8px;font-size:8.5pt;text-align:left;}thead th.c{text-align:center;}tbody tr{border-bottom:1px solid #ccc;}tbody tr:nth-child(even){background:#f5f5f5;}tbody td{padding:5px 8px;font-size:9pt;vertical-align:middle;}td.num{width:24px;text-align:center;color:#555;font-size:8pt;}td.chk{width:26px;text-align:center;font-size:12pt;}.assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px;padding-top:12px;border-top:1px solid #ccc;}.ass-bloco label{font-size:7.5pt;text-transform:uppercase;letter-spacing:0.06em;color:#555;display:block;margin-bottom:2px;}.ass-line{border-bottom:1px solid #777;margin-bottom:10px;min-height:22px;}.rodape{margin-top:18px;padding-top:8px;border-top:1px solid #ccc;font-size:7.5pt;color:#888;display:flex;justify-content:space-between;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}';}
function _clBuildTableHTML(itens){if(!itens.length)return '<p style="color:#999;text-align:center;">Nenhuma tarefa cadastrada.</p>';return '<table><thead><tr><th style="width:28px;" class="c">#</th><th>Tarefa</th><th style="width:36px;" class="c">✓</th></tr></thead><tbody>'+itens.map(function(item,i){return '<tr><td class="num">'+(i+1)+'</td><td>'+_esc(item.texto||'')+'</td><td class="chk">☐</td></tr>';}).join('')+'</tbody></table>';}
function _clPageHTML(dept,tipo,itens){var ed=(state.empresaData||{}),empresa=ed.nome||'Artt Burger',tipoIcon=tipo==='abertura'?'🌅':'🌙';return '<div class="pg"><div class="logo-area">'+_clLogoHTML()+'<div class="empresa-nome">'+_esc(empresa)+'</div><div class="doc-type">P.O.P — Manual de Operação</div></div><div class="titulo-checklist">'+tipoIcon+' Checklist de '+(tipo==='abertura'?'ABERTURA':'FECHAMENTO')+'</div><div class="dept-label">Departamento: <strong>'+_esc(dept.label)+'</strong></div><div class="info-bar"><div class="info-field"><label>Data</label><span class="info-line"></span></div><div class="info-field"><label>Turno</label><span class="info-line"></span></div><div class="info-field"><label>Responsável</label><span class="info-line"></span></div></div>'+_clBuildTableHTML(itens)+'<div class="assinaturas"><div class="ass-bloco"><label>Assinatura do Responsável</label><div class="ass-line"></div><label>Data</label><div class="ass-line"></div></div><div class="ass-bloco"><label>Visto do Supervisor</label><div class="ass-line"></div><label>Data</label><div class="ass-line"></div></div></div><div class="rodape"><span>'+_esc(empresa)+' · Documento controlado — P.O.P</span><span>Versão: '+today()+'</span></div></div>';}
function _clPrint(dept,tipo,itens){if(!itens.length){showToast('Adicione pelo menos um item antes de imprimir.','error');return;}var w=window.open('','_blank');if(w){w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Checklist '+dept.label+'</title><style>'+_clPrintCSS()+'</style></head><body>'+_clPageHTML(dept,tipo,itens)+'</body></html>');w.document.close();setTimeout(function(){w.print();},400);}}
function _clPrintAmbos(dept,abertura,fechamento){if(!abertura.length&&!fechamento.length){showToast('Adicione itens antes de imprimir.','error');return;}var pages='';if(abertura.length)pages+=_clPageHTML(dept,'abertura',abertura);if(fechamento.length){if(abertura.length)pages+='<div style="page-break-before:always;"></div>';pages+=_clPageHTML(dept,'fechamento',fechamento);}var w=window.open('','_blank');if(w){w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Checklists '+dept.label+'</title><style>'+_clPrintCSS()+'</style></head><body>'+pages+'</body></html>');w.document.close();setTimeout(function(){w.print();},400);}}
function _esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _manualPrint(artigo,deptLabel){var ed=(state.empresaData||{}),empresa=ed.nome||'Artt Burger';function inl(t){return _esc(t).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');}function toHTML(texto){var html='',lines=texto.split('\n'),inUl=false,inOl=false;function cl(){if(inUl){html+='</ul>';inUl=false;}if(inOl){html+='</ol>';inOl=false;}}lines.forEach(function(l){if(l.startsWith('# ')){cl();html+='<h2>'+inl(l.slice(2))+'</h2>';}else if(l.startsWith('## ')){cl();html+='<h3>'+inl(l.slice(3))+'</h3>';}else if(l.startsWith('> ')){cl();html+='<div class="callout">'+inl(l.slice(2))+'</div>';}else if(l.startsWith('⚠️')){cl();html+='<div class="warning">'+inl(l)+'</div>';}else if(l.startsWith('- ')){if(!inUl){if(inOl){html+='</ol>';inOl=false;}html+='<ul>';inUl=true;}html+='<li>'+inl(l.slice(2))+'</li>';}else if(/^\d+\.\s/.test(l)){if(!inOl){if(inUl){html+='</ul>';inUl=false;}html+='<ol>';inOl=true;}html+='<li>'+inl(l.replace(/^\d+\.\s/,''))+'</li>';}else if(l.trim()==='---'){cl();html+='<hr>';}else if(l.trim()===''){cl();}else{cl();html+='<p>'+inl(l)+'</p>';}});cl();return html;}var w=window.open('','_blank');if(w){w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+artigo.titulo+'</title><style>@page{size:A4 portrait;margin:18mm 16mm;}body{font-family:Arial,sans-serif;max-width:170mm;margin:0 auto;color:#000;line-height:1.6;font-size:10pt;}.header{text-align:center;border-bottom:3px solid #000;padding-bottom:12px;margin-bottom:20px;}.empresa{font-size:8pt;text-transform:uppercase;letter-spacing:0.1em;color:#555;margin-top:4px;}.badges{display:flex;gap:8px;margin:8px 0;font-size:8pt;justify-content:center;}.badge{padding:2px 8px;border:1px solid #000;border-radius:3px;}h1{margin:0 0 8px;font-size:14pt;}h2{font-size:11pt;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px;}h3{font-size:10pt;margin-top:14px;}ul,ol{padding-left:20px}li{margin-bottom:4px}.callout{background:#f0f0f0;border-left:4px solid #666;padding:8px 12px;margin:10px 0;font-style:italic;}.warning{background:#fff3cd;border-left:4px solid #f90;padding:8px 12px;margin:10px 0;font-weight:bold;}hr{border:none;border-top:1px solid #ccc;margin:14px 0;}.footer{margin-top:36px;padding-top:8px;border-top:1px solid #ccc;font-size:7.5pt;color:#777;text-align:center;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body><div class="header">'+_clLogoHTML()+'<div class="empresa">'+_esc(empresa)+' · P.O.P</div><h1>'+_esc(artigo.titulo)+'</h1><div class="badges"><span class="badge">'+_esc(deptLabel)+'</span><span class="badge">'+_esc(artigo.categoria||'')+'</span></div></div>'+toHTML(artigo.conteudo||'')+'<div class="footer">'+_esc(empresa)+' · '+today()+'</div></body></html>');w.document.close();setTimeout(function(){w.print();},400);}}

// ── CSS ───────────────────────────────────────────────────────────────────────

(function(){
  if(document.getElementById('manual-styles'))return;
  var s=document.createElement('style'); s.id='manual-styles';
  s.textContent=[
    '.manual-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;flex-wrap:wrap;}',
    '.manual-search{padding:7px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:inherit;font-size:0.88rem;width:220px;outline:none;}',
    '.manual-search:focus{border-color:var(--primary);}',
    '.manual-layout{display:grid;grid-template-columns:220px 1fr;gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden;min-height:520px;}',
    '.manual-sidebar{border-right:1px solid var(--border);overflow-y:auto;background:var(--surface);}',
    '.manual-dept-hdr{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-size:0.83rem;font-weight:600;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s;}',
    '.manual-dept-hdr:hover{background:var(--hover);}',
    '.manual-dept-hdr.active{background:rgba(var(--primary-rgb,0,120,255),0.1);color:var(--primary);}',
    '.manual-dept-count{font-size:0.72rem;background:var(--border);color:var(--text-muted);border-radius:10px;padding:1px 7px;font-weight:400;flex-shrink:0;min-width:18px;text-align:center;}',
    '.manual-article-link{padding:8px 14px 8px 22px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.12s;}',
    '.manual-article-link:hover{background:var(--hover);}',
    '.manual-article-link.active{background:rgba(var(--primary-rgb,0,120,255),0.1);border-left:3px solid var(--primary);}',
    '.manual-link-cat{display:block;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;}',
    '.manual-link-titulo{display:block;font-size:0.85rem;font-weight:500;}',
    '.manual-content-area{padding:24px 28px;overflow-y:auto;display:flex;flex-direction:column;}',
    '.manual-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;flex:1;}',
    '.manual-article-header{margin-bottom:16px;}',
    '.manual-article-title{font-size:1.5rem;font-weight:700;margin:8px 0 6px;line-height:1.3;}',
    '.manual-article-meta{font-size:0.78rem;color:var(--text-muted);}',
    '.manual-article-actions{display:flex;gap:8px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);flex-wrap:wrap;}',
    '.manual-article-body{font-size:0.93rem;line-height:1.75;}',
    '.manual-badge{display:inline-flex;align-items:center;font-size:0.76rem;padding:3px 10px;border-radius:20px;font-weight:500;}',
    '.manual-badge.dept{background:rgba(var(--primary-rgb,0,120,255),0.12);color:var(--primary);}',
    '.manual-badge.cat{background:var(--surface);border:1px solid var(--border);}',
    '.manual-rendered{font-size:0.93rem;line-height:1.75;}',
    '.manual-h1{font-size:1.15rem;font-weight:700;margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid var(--border);}',
    '.manual-h2{font-size:1rem;font-weight:600;margin:16px 0 6px;color:var(--primary);}',
    '.manual-h3{font-size:0.93rem;font-weight:600;margin:12px 0 4px;}',
    '.manual-p{margin:0 0 10px;}',
    '.manual-list{margin:4px 0 10px;padding-left:20px;}',
    '.manual-list li,.manual-ol-item{margin-bottom:4px;}',
    '.manual-callout{background:rgba(var(--primary-rgb,0,120,255),0.07);border-left:4px solid var(--primary);padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0;font-style:italic;font-size:0.9rem;}',
    '.manual-warning{background:rgba(255,180,0,0.1);border-left:4px solid #f90;padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0;font-weight:600;font-size:0.9rem;}',
    '.manual-hr{border:none;border-top:1px solid var(--border);margin:16px 0;}',
    // Checklist
    '.cl-main{padding:20px 24px;overflow-y:auto;flex:1;}',
    '.cl-dept-title{margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);}',
    '.cl-section{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;}',
    '.cl-section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;}',
    '.cl-section-icon{font-size:1.3rem;}',
    '.cl-section-title{margin:0;font-size:1rem;font-weight:700;}',
    '.cl-items{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;}',
    '.cl-item-row{display:flex;align-items:center;gap:8px;padding:4px 6px;border-radius:6px;background:var(--bg);border:1px solid var(--border);}',
    '.cl-num{min-width:22px;text-align:center;font-size:0.75rem;color:var(--text-muted);font-weight:600;}',
    '.cl-check-box{font-size:1rem;color:var(--text-muted);flex-shrink:0;}',
    '.cl-item-input{flex:1;border:none;background:transparent;color:inherit;font-size:0.9rem;outline:none;padding:2px 0;}',
    '.cl-del-btn{background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:0.85rem;padding:2px 6px;border-radius:4px;flex-shrink:0;}',
    '.cl-del-btn:hover{background:rgba(220,50,50,0.1);color:#dc3232;}',
    '.cl-empty-hint{padding:16px;text-align:center;color:var(--text-muted);font-size:0.85rem;font-style:italic;}',
    '.cl-add-row{display:flex;gap:8px;align-items:center;margin-top:8px;}',
    '.cl-add-input{flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:inherit;font-size:0.88rem;outline:none;}',
    '.cl-add-input:focus{border-color:var(--primary);}',
    '.cl-add-btn,.cl-print-btn{font-size:0.82rem!important;padding:6px 12px!important;white-space:nowrap;}',
    // ── Explorer ──
    '.ftree-sidebar{display:flex;flex-direction:column;}',
    '.ftree-item{display:flex;align-items:center;gap:5px;padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.83rem;user-select:none;transition:background 0.12s;}',
    '.ftree-item:hover{background:var(--hover);}',
    '.ftree-item.active{background:rgba(var(--primary-rgb,0,120,255),0.12);color:var(--primary);font-weight:600;}',
    '.ftree-root{font-size:0.82rem;font-weight:600;padding:10px 12px;border-bottom:2px solid var(--border);background:var(--bg);}',
    '.ftree-toggle{width:12px;text-align:center;font-size:0.7rem;color:var(--text-muted);flex-shrink:0;}',
    '.ftree-icon{font-size:1rem;flex-shrink:0;}',
    '.ftree-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.ftree-new-row{padding:8px 10px;border-top:1px solid var(--border);margin-top:auto;}',
    '.ftree-new-btn{width:100%;padding:7px 10px;border:1px dashed var(--border);border-radius:6px;background:transparent;color:var(--text-muted);cursor:pointer;font-size:0.82rem;text-align:left;transition:all 0.15s;}',
    '.ftree-new-btn:hover{border-color:var(--primary);color:var(--primary);background:rgba(var(--primary-rgb,0,120,255),0.06);}',
    '.exp-content{display:flex;flex-direction:column;overflow:hidden;}',
    '.exp-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--surface);flex-wrap:wrap;}',
    '.breadcrumb{display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:0.82rem;}',
    '.bc-item{cursor:pointer;color:var(--primary);padding:2px 5px;border-radius:4px;transition:background 0.12s;}',
    '.bc-item:hover{background:rgba(var(--primary-rgb,0,120,255),0.08);}',
    '.bc-item.bc-current{color:var(--text-muted);cursor:default;font-weight:600;}',
    '.bc-item.bc-current:hover{background:none;}',
    '.bc-sep{color:var(--text-muted);font-size:0.85rem;}',
    '.exp-folder-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;padding:14px 14px 4px;}',
    '.exp-folder-card{border:1px solid var(--border);border-radius:8px;padding:12px 10px 10px;cursor:pointer;transition:all 0.15s;background:var(--surface);text-align:center;position:relative;}',
    '.exp-folder-card:hover{border-color:var(--primary);box-shadow:0 2px 8px rgba(0,0,0,0.08);}',
    '.exp-folder-top{position:relative;display:flex;justify-content:center;align-items:center;margin-bottom:6px;min-height:40px;}',
    '.exp-folder-icon{font-size:2.2rem;line-height:1;}',
    '.exp-fold-btns{position:absolute;top:-6px;right:-6px;display:none;gap:2px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:2px;box-shadow:0 2px 6px rgba(0,0,0,0.12);}',
    '.exp-folder-card:hover .exp-fold-btns{display:flex;}',
    '.exp-fold-act{background:none;border:none;cursor:pointer;padding:3px 5px;border-radius:4px;font-size:0.8rem;color:var(--text-muted);}',
    '.exp-fold-act:hover{background:var(--hover);}',
    '.exp-fold-del:hover{color:#e53e3e;background:rgba(229,62,62,0.1);}',
    '.exp-folder-label{font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;}',
    '.exp-folder-meta{font-size:0.7rem;color:var(--text-muted);}',
    '.exp-docs-section{padding:0 14px 14px;}',
    '.exp-section-label{font-size:0.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;padding:10px 0 8px;}',
    '.doc-list{display:flex;flex-direction:column;gap:10px;}',
    '.doc-empty{padding:40px 24px;text-align:center;color:var(--text-muted);display:flex;flex-direction:column;align-items:center;}',
    '.doc-card{display:flex;align-items:flex-start;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);transition:box-shadow 0.15s;}',
    '.doc-card:hover{box-shadow:0 2px 8px rgba(0,0,0,0.08);}',
    '.doc-card-left{flex-shrink:0;}',
    '.doc-ext-badge{width:38px;height:38px;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.6rem;font-weight:700;text-align:center;line-height:1.2;}',
    '.doc-card-body{flex:1;min-width:0;}',
    '.doc-card-nome{font-size:0.9rem;font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.doc-card-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}',
    '.doc-tag{font-size:0.72rem;padding:2px 8px;border-radius:20px;background:rgba(var(--primary-rgb,0,120,255),0.1);color:var(--primary);font-weight:500;}',
    '.doc-tag-period{font-size:0.72rem;padding:2px 8px;border-radius:20px;background:var(--border);color:var(--text-muted);}',
    '.doc-card-obs{font-size:0.78rem;color:var(--text-muted);margin-top:4px;font-style:italic;}',
    '.doc-card-actions{display:flex;flex-direction:column;gap:4px;flex-shrink:0;}',
    '.doc-act-btn{font-size:0.75rem!important;padding:4px 8px!important;white-space:nowrap;}',
    '.doc-storage-note{margin-top:12px;padding:10px 12px;background:rgba(255,180,0,0.1);border-left:3px solid #f90;border-radius:0 4px 4px 0;font-size:0.78rem;color:var(--text-muted);}',
    // Modal
    '.mop-modal{max-width:780px;width:95vw;max-height:92vh;display:flex;flex-direction:column;}',
    '.mop-form{flex:1;overflow-y:auto;padding:0 2px;}',
    '.mop-label{display:block;font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;margin-top:12px;}',
    '.mop-input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:inherit;font-size:0.9rem;}',
    '.mop-input:focus{outline:none;border-color:var(--primary);}',
    '.mop-titulo{font-size:1.05rem!important;font-weight:600;}',
    '.mop-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
    '.mop-toolbar{display:flex;gap:4px;flex-wrap:wrap;}',
    '.mop-tool{padding:3px 8px;font-size:0.78rem;border:1px solid var(--border);border-radius:4px;background:var(--surface);color:inherit;cursor:pointer;font-weight:600;line-height:1.4;}',
    '.mop-tool:hover{background:var(--hover);border-color:var(--primary);}',
    '.mop-textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:inherit;font-family:monospace;font-size:0.87rem;line-height:1.6;resize:vertical;margin-top:4px;}',
    '.mop-textarea:focus{outline:none;border-color:var(--primary);}',
    '@media(max-width:600px){.manual-layout{grid-template-columns:1fr;}.manual-sidebar{border-right:none;border-bottom:1px solid var(--border);max-height:200px;}.mop-row2{grid-template-columns:1fr;}.exp-folder-grid{grid-template-columns:repeat(auto-fill,minmax(90px,1fr));}.doc-card{flex-wrap:wrap;}.doc-card-actions{flex-direction:row;}}',
  ].join('');
  document.head.appendChild(s);
})();
