// ── KDS — KITCHEN DISPLAY SYSTEM ─────────────────────────────────────────────

var _kdsTab      = 'kds';      // 'kds' | 'pedidos'
var _kdsInterval = null;       // auto-refresh interval no viewer
var _kdsVisorCfg = null;       // settings panel aberto no viewer

// ── Helpers ──────────────────────────────────────────────────────────────────
function _kdsTempoMin(isoStr) {
  if (!isoStr) return 0;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
}

function _kdsCorTempo(min) {
  if (min < 10) return '#16a34a';
  if (min < 20) return '#ea580c';
  return '#dc2626';
}

function _nextPedidoNum() {
  var nums = (state.pedidos||[])
    .filter(function(p){return p.profile===state.profile;})
    .map(function(p){return p.numero||0;});
  return nums.length ? Math.max.apply(null,nums)+1 : 1;
}

function _salvarPedido(pedido) {
  var arr = (state.pedidos||[]);
  var exists = arr.find(function(p){return p.id===pedido.id;});
  var novos = exists
    ? arr.map(function(p){return p.id===pedido.id?pedido:p;})
    : arr.concat([pedido]);
  lsSet('pedidos',novos);
  setState({pedidos:novos});
  scheduleSave();
}

// ── KDS VIEWER (tela cheia) ───────────────────────────────────────────────────
function renderKDSViewer(kdsId) {
  var kds     = (state.kdsConfigs||[]).find(function(k){return k.id===kdsId;});
  if (!kds) {
    return el('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'16px',background:'#111',color:'#fff'}},[
      el('div',{style:{fontSize:'48px'}},'⚠️'),
      el('div',{style:{fontSize:'18px'}},'KDS não encontrado'),
      el('button',{style:{padding:'10px 24px',borderRadius:'8px',border:'none',background:'#c9a84c',color:'#000',fontWeight:'700',cursor:'pointer',fontSize:'14px'},
        onclick:function(){setState({kdsMode:null});}}, 'Voltar'),
    ]);
  }

  var empresa = ((state.empresaData||{})[state.profile]) || {};
  var tab     = state.kdsViewTab || 'pedidos';
  var perfil  = state.profile;

  // Filtrar pedidos visíveis para este KDS
  function itemVisivelNaKds(item) {
    if (!kds.setoresVisiveis || !kds.setoresVisiveis.length) return true;
    return kds.setoresVisiveis.indexOf(item.setorImpressao) >= 0;
  }

  function pedidoTemItensVisiveis(p) {
    if (!p.itens || !p.itens.length) return true;
    if (!kds.setoresVisiveis || !kds.setoresVisiveis.length) return true;
    return p.itens.some(function(it){ return itemVisivelNaKds(it); });
  }

  var todosPed = (state.pedidos||[]).filter(function(p){return p.profile===perfil;});
  var pedNovos = todosPed.filter(function(p){
    return (p.status==='novo'||p.status==='preparando') && pedidoTemItensVisiveis(p);
  }).sort(function(a,b){return new Date(a.criadoEm)-new Date(b.criadoEm);});
  var pedFin   = todosPed.filter(function(p){return p.status==='finalizado'&&pedidoTemItensVisiveis(p);}
  ).sort(function(a,b){return new Date(b.atualizadoEm)-new Date(a.atualizadoEm);});
  var pedCan   = todosPed.filter(function(p){return p.status==='cancelado'&&pedidoTemItensVisiveis(p);}
  ).sort(function(a,b){return new Date(b.atualizadoEm)-new Date(a.atualizadoEm);});
  var pedAtivos= tab==='pedidos'?pedNovos:tab==='finalizados'?pedFin:pedCan;

  // Auto-refresh
  if (_kdsInterval) clearInterval(_kdsInterval);
  _kdsInterval = setInterval(function(){
    if (!state.kdsMode) { clearInterval(_kdsInterval); _kdsInterval=null; return; }
    setState({}); // força re-render para atualizar timers
  }, 30000);

  // ── Botão ação do card ─────────────────────────────────────────────────────
  function acaoBtn(p) {
    if (p.status==='novo') {
      var b=el('button',{});
      b.style.cssText='width:100%;padding:10px;border:none;border-radius:0 0 10px 10px;background:#2563eb;color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:.3px;';
      b.textContent='▶ Iniciar preparo';
      b.onclick=function(){
        _salvarPedido(Object.assign({},p,{status:'preparando',atualizadoEm:new Date().toISOString()}));
        logAudit('KDS: iniciou preparo','Pedido #'+p.numero);
      };
      return b;
    }
    if (p.status==='preparando') {
      var b2=el('button',{});
      b2.style.cssText='width:100%;padding:10px;border:none;border-radius:0 0 10px 10px;background:#16a34a;color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:.3px;';
      b2.textContent='✓ Pronto / Finalizar';
      b2.onclick=function(){
        _salvarPedido(Object.assign({},p,{status:'finalizado',atualizadoEm:new Date().toISOString()}));
        logAudit('KDS: finalizou pedido','Pedido #'+p.numero);
      };
      return b2;
    }
    if (p.status==='finalizado') {
      var b3=el('button',{});
      b3.style.cssText='width:100%;padding:8px;border:none;border-radius:0 0 10px 10px;background:#6b7280;color:#fff;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit;';
      b3.textContent='↩ Reabrir';
      b3.onclick=function(){
        _salvarPedido(Object.assign({},p,{status:'preparando',atualizadoEm:new Date().toISOString()}));
      };
      return b3;
    }
    return null;
  }

  // ── Card do pedido ─────────────────────────────────────────────────────────
  function cardPedido(p) {
    var min = _kdsTempoMin(p.criadoEm);
    var corTempo = _kdsCorTempo(min);
    var statusLabel = p.status==='novo'?'Novo':p.status==='preparando'?'Prep.':'Finalizado';
    var statusBg = p.status==='novo'?'#16a34a':p.status==='preparando'?'#ea580c':'#6b7280';

    var badge=el('span',{style:{background:statusBg,color:'#fff',fontSize:'10px',fontWeight:'700',padding:'2px 7px',borderRadius:'10px',letterSpacing:'.4px'}},statusLabel);

    var timerEl=el('span',{style:{display:'flex',alignItems:'center',gap:'3px',fontSize:'12px',color:corTempo,fontWeight:'700'}});
    timerEl.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'+min+'m';

    var cardHeader=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#d1d5db',borderRadius:'10px 10px 0 0',gap:'6px'}});
    cardHeader.appendChild(badge);
    cardHeader.appendChild(timerEl);
    var numEl=el('span',{style:{fontWeight:'700',fontSize:'14px',flex:'1',textAlign:'center'}},
      'Pedido #'+p.numero);
    cardHeader.appendChild(numEl);
    var cliEl=el('span',{style:{fontSize:'12px',color:'#374151',maxWidth:'90px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},p.cliente||'');
    cardHeader.appendChild(cliEl);

    // Itens (filtrados pelo que este KDS deve ver)
    var itensParaExibir = (p.itens||[]).filter(function(it){return itemVisivelNaKds(it);});
    var itensEl=el('div',{style:{padding:'10px 12px',flex:'1'}});

    itensParaExibir.forEach(function(it){
      var rowProd=el('div',{style:{display:'flex',gap:'6px',marginBottom:'2px',fontWeight:'600',fontSize:'13px'}});
      rowProd.textContent=it.qtd+'x /'+it.nome.toUpperCase();
      itensEl.appendChild(rowProd);

      (it.complementos||[]).forEach(function(c){
        var rowComp=el('div',{style:{fontSize:'12px',paddingLeft:'18px',color:'#374151',marginBottom:'1px'}});
        rowComp.textContent=(c.qtd||1)+'x '+c.nome;
        itensEl.appendChild(rowComp);
      });

      if (it.obs) {
        var obsEl=el('div',{style:{fontSize:'11px',paddingLeft:'18px',color:'#6b7280',fontStyle:'italic'}});
        obsEl.textContent='Obs: '+it.obs;
        itensEl.appendChild(obsEl);
      }
    });

    if (p.obs) {
      var pedObs=el('div',{style:{fontSize:'12px',color:'#6b7280',fontStyle:'italic',paddingTop:'4px',borderTop:'1px solid #e5e7eb',margin:'4px 0 0'}});
      pedObs.textContent='Obs (pedido): '+p.obs;
      itensEl.appendChild(pedObs);
    }

    var card=el('div',{style:{background:'#fff',borderRadius:'10px',border:'1px solid #d1d5db',boxShadow:'0 2px 8px rgba(0,0,0,.1)',width:'230px',minHeight:'140px',display:'flex',flexDirection:'column',flexShrink:'0'}});
    card.appendChild(cardHeader);
    card.appendChild(itensEl);
    var acao=acaoBtn(p);
    if(acao)card.appendChild(acao);
    return card;
  }

  // ── Settings panel (engrenagem) ───────────────────────────────────────────
  var settingsPanel=null;
  if (_kdsVisorCfg) {
    var spEl=el('div',{});
    spEl.style.cssText='position:fixed;top:52px;right:0;bottom:0;width:320px;background:#fff;border-left:1px solid #d1d5db;z-index:200;overflow-y:auto;box-shadow:-4px 0 16px rgba(0,0,0,.12);';

    var spHead=el('div',{style:{padding:'14px 16px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}});
    spHead.appendChild(el('span',{style:{fontWeight:'700',fontSize:'14px',color:'#111'}},'⚙️ Configurações do KDS'));
    var spClose=el('button',{style:{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6b7280'},onclick:function(){_kdsVisorCfg=null;setState({});}});
    spClose.textContent='✕';
    spHead.appendChild(spClose);
    spEl.appendChild(spHead);

    var spBody=el('div',{style:{padding:'16px'}});

    // Setor KDS info
    var infoDiv=el('div',{style:{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'16px'}});
    infoDiv.innerHTML='<div style="font-weight:700;color:#111;margin-bottom:4px">'+kds.nome+'</div>'
      +'<div style="font-size:12px;color:#6b7280">ID: '+kds.identificador+'</div>'
      +'<div style="font-size:12px;color:#6b7280">'+pedNovos.length+' pedido(s) ativos</div>';
    spBody.appendChild(infoDiv);

    // Setores visíveis
    var allSetores=(state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});
    var setLabel=el('div',{style:{fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'.6px',color:'#6b7280',marginBottom:'10px'}});
    setLabel.textContent='Setores visíveis neste KDS';
    spBody.appendChild(setLabel);
    allSetores.forEach(function(s){
      var isVis=!kds.setoresVisiveis||!kds.setoresVisiveis.length||kds.setoresVisiveis.indexOf(s.id)>=0;
      var row=el('label',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid #f0f0f0',cursor:'pointer'}});
      var chk=el('input',{type:'checkbox',style:{accentColor:s.cor||'#c9a84c',width:'15px',height:'15px',cursor:'pointer'}});
      chk.checked=isVis;
      chk.onchange=function(){
        var arr=(state.kdsConfigs||[]).map(function(k){
          if(k.id!==kds.id)return k;
          var vis=k.setoresVisiveis?[].concat(k.setoresVisiveis):[];
          if(this.checked){if(vis.indexOf(s.id)<0)vis.push(s.id);}
          else{vis=vis.filter(function(x){return x!==s.id;});}
          return Object.assign({},k,{setoresVisiveis:vis});
        }.bind(this));
        lsSet('kdsConfigs',arr);
        setState({kdsConfigs:arr});
        scheduleSave();
      };
      var dot=el('span',{style:{width:'10px',height:'10px',borderRadius:'50%',background:s.cor||'#c9a84c',flexShrink:'0'}});
      row.appendChild(chk);
      row.appendChild(dot);
      row.appendChild(document.createTextNode(s.nome));
      spBody.appendChild(row);
    });

    if(!allSetores.length){
      var noSet=el('div',{style:{color:'#9ca3af',fontSize:'12px',marginBottom:'12px'}});
      noSet.textContent='Nenhum setor cadastrado. Crie em Setores de Impressão.';
      spBody.appendChild(noSet);
    }

    // Categorias visíveis
    var catLabel=el('div',{style:{fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'.6px',color:'#6b7280',margin:'16px 0 10px'}});
    catLabel.textContent='Categorias visíveis';
    spBody.appendChild(catLabel);
    estCats().forEach(function(cat){
      var isVisCat=!kds.categoriasVisiveis||!kds.categoriasVisiveis.length||kds.categoriasVisiveis.indexOf(cat)>=0;
      var rowC=el('label',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid #f0f0f0',cursor:'pointer'}});
      var chkC=el('input',{type:'checkbox',style:{accentColor:'#c9a84c',width:'15px',height:'15px',cursor:'pointer'}});
      chkC.checked=isVisCat;
      chkC.onchange=function(){
        var arr=(state.kdsConfigs||[]).map(function(k){
          if(k.id!==kds.id)return k;
          var vis=k.categoriasVisiveis?[].concat(k.categoriasVisiveis):estCats().slice();
          if(this.checked){if(vis.indexOf(cat)<0)vis.push(cat);}
          else{vis=vis.filter(function(x){return x!==cat;});}
          return Object.assign({},k,{categoriasVisiveis:vis});
        }.bind(this));
        lsSet('kdsConfigs',arr);
        setState({kdsConfigs:arr});
        scheduleSave();
      };
      rowC.appendChild(chkC);
      rowC.appendChild(document.createTextNode(cat));
      spBody.appendChild(rowC);
    });

    // Exit button
    var exitBtn=el('button',{});
    exitBtn.style.cssText='width:100%;margin-top:24px;padding:12px;border:2px solid #dc2626;background:transparent;color:#dc2626;font-weight:700;font-size:13px;cursor:pointer;border-radius:8px;font-family:inherit;';
    exitBtn.textContent='✕ Sair do modo KDS';
    exitBtn.onclick=function(){
      _kdsVisorCfg=null;
      clearInterval(_kdsInterval);_kdsInterval=null;
      setState({kdsMode:null,kdsViewTab:'pedidos'});
    };
    spBody.appendChild(exitBtn);
    spEl.appendChild(spBody);
    settingsPanel=spEl;
  }

  // ── Header do viewer ──────────────────────────────────────────────────────
  var headerEl=el('div',{style:{display:'flex',alignItems:'center',borderBottom:'1px solid #d1d5db',background:'#fff',height:'50px',position:'fixed',top:'0',left:'0',right:'0',zIndex:'100',userSelect:'none'}});

  // Tabs
  var tabsEl=el('div',{style:{display:'flex',alignItems:'stretch',height:'100%',flex:'1'}});
  [['pedidos','PEDIDOS',pedNovos.length],['finalizados','FINALIZADOS',null],['cancelados','CANCELADOS',null]].forEach(function(t){
    var isAct=tab===t[0];
    var b=el('button',{});
    b.style.cssText='padding:0 28px;font-size:13px;font-weight:'+(isAct?'700':'500')+';'
      +'background:none;border:none;border-bottom:3px solid '+(isAct?'#2563eb':'transparent')+';'
      +'color:'+(isAct?'#2563eb':'#6b7280')+';cursor:pointer;font-family:inherit;letter-spacing:.5px;position:relative;white-space:nowrap;';
    b.textContent=t[1];
    if(t[2]&&t[2]>0){
      var ct=el('span',{style:{position:'absolute',top:'8px',right:'10px',background:'#dc2626',color:'#fff',fontSize:'9px',fontWeight:'700',padding:'1px 4px',borderRadius:'8px'}},String(t[2]));
      b.appendChild(ct);
    }
    b.onclick=function(){setState({kdsViewTab:t[0]});};
    tabsEl.appendChild(b);
  });
  headerEl.appendChild(tabsEl);

  // Info direita
  var infoRight=el('div',{style:{display:'flex',alignItems:'center',gap:'16px',padding:'0 16px',fontSize:'12px',color:'#374151',flexShrink:'0'}});
  var nomeEmp=el('span',{style:{fontWeight:'700'}},empresa.nomeFantasia||'KDS Sistema');
  var kdsInfo=el('span',{style:{color:'#6b7280'}},'KDS ativo: '+kds.identificador);
  var userInfo=el('span',{style:{color:'#6b7280'}},'Logado como KDS '+(kds.identificador||kds.nome).toUpperCase());
  var gearBtn=el('button',{style:{background:'none',border:'none',cursor:'pointer',fontSize:'20px',padding:'4px',color:'#374151'}});
  gearBtn.textContent='⚙';
  gearBtn.onclick=function(){_kdsVisorCfg=!_kdsVisorCfg;setState({});};
  infoRight.appendChild(nomeEmp);
  infoRight.appendChild(kdsInfo);
  infoRight.appendChild(userInfo);
  infoRight.appendChild(gearBtn);
  headerEl.appendChild(infoRight);

  // ── Grid de cards ─────────────────────────────────────────────────────────
  var gridEl=el('div',{style:{display:'flex',flexWrap:'wrap',gap:'14px',padding:'16px',paddingTop:'66px',minHeight:'100vh',background:'#f3f4f6',alignContent:'flex-start'}});
  if(pedAtivos.length===0){
    var emptyEl=el('div',{style:{width:'100%',textAlign:'center',padding:'80px 20px',color:'#9ca3af'}});
    emptyEl.innerHTML='<div style="font-size:48px;margin-bottom:12px">📋</div>'
      +'<div style="font-size:16px;font-weight:600">Nenhum pedido '+
      (tab==='pedidos'?'ativo':tab==='finalizados'?'finalizado':'cancelado')+'</div>';
    gridEl.appendChild(emptyEl);
  } else {
    pedAtivos.forEach(function(p){ gridEl.appendChild(cardPedido(p)); });
  }

  var root=el('div',{style:{background:'#f3f4f6',minHeight:'100vh',overflowY:'auto'}});
  root.appendChild(headerEl);
  root.appendChild(gridEl);
  if(settingsPanel) root.appendChild(settingsPanel);
  return root;
}

// ── PÁGINA GERENCIAL DE KDS ───────────────────────────────────────────────────
function renderKDS() {
  var perfil  = state.profile;
  var kdsArr  = (state.kdsConfigs||[]).filter(function(k){return k.profile===perfil;});
  var pedidos = (state.pedidos||[]).filter(function(p){return p.profile===perfil;});

  var COR_OPCOES=['#c9a84c','#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d'];

  // ── Modal KDS ─────────────────────────────────────────────────────────────
  var kdsModal=null;
  if (state.kdsModal!==null&&state.kdsModal!==undefined) {
    var km  = state.kdsModal;
    var isEdK=!!km.id;
    var allSetores=(state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});

    var nomeInp=el('input',{class:'form-input',value:km.nome||'',placeholder:'Ex: KDS Cozinha, KDS Chapa, KDS Bar...',oninput:function(){km.nome=this.value;}});
    var identInp=el('input',{class:'form-input',value:km.identificador||'',placeholder:'Ex: CHAPA, COZINHA, BAR...',
      style:{textTransform:'uppercase'},oninput:function(){km.identificador=this.value.toUpperCase();}});

    var corSel=el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}},
      COR_OPCOES.map(function(cor){
        var b=el('button',{});
        b.style.cssText='width:28px;height:28px;border-radius:50%;background:'+cor+';border:3px solid '
          +((km.cor||COR_OPCOES[0])===cor?'var(--text)':'transparent')+';cursor:pointer;';
        b.onclick=function(e){e.preventDefault();km.cor=cor;setState({kdsModal:Object.assign({},state.kdsModal,{cor:cor})});};
        return b;
      }));

    // Checkboxes de setores visíveis
    var setoresCheck=el('div',{style:{display:'flex',flexDirection:'column',gap:'6px',marginTop:'6px'}},
      allSetores.map(function(s){
        var vis=km.setoresVisiveis||[];
        var chk=el('input',{type:'checkbox',style:{accentColor:s.cor||'var(--gold)'}});
        chk.checked=!vis.length||vis.indexOf(s.id)>=0;
        chk.onchange=function(){
          var v=km.setoresVisiveis?[].concat(km.setoresVisiveis):[];
          if(this.checked){if(v.indexOf(s.id)<0)v.push(s.id);}
          else{v=v.filter(function(x){return x!==s.id;});}
          km.setoresVisiveis=v;
        };
        var lbl=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px'}});
        var dot=el('span',{style:{width:'10px',height:'10px',borderRadius:'50%',background:s.cor||'var(--gold)',flexShrink:'0'}});
        lbl.appendChild(chk);lbl.appendChild(dot);lbl.appendChild(document.createTextNode(s.nome));
        return lbl;
      }));

    // Checkboxes de categorias visíveis
    var catsCheck=el('div',{style:{display:'flex',flexDirection:'column',gap:'6px',marginTop:'6px'}},
      estCats().map(function(cat){
        var vis=km.categoriasVisiveis||[];
        var chkC=el('input',{type:'checkbox',style:{accentColor:'var(--gold)'}});
        chkC.checked=!vis.length||vis.indexOf(cat)>=0;
        chkC.onchange=function(){
          var v=km.categoriasVisiveis?[].concat(km.categoriasVisiveis):[];
          if(this.checked){if(v.indexOf(cat)<0)v.push(cat);}
          else{v=v.filter(function(x){return x!==cat;});}
          km.categoriasVisiveis=v;
        };
        var lblC=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px'}});
        lblC.appendChild(chkC);lblC.appendChild(document.createTextNode(cat));
        return lblC;
      }));

    function salvarKDS(){
      if(!(km.nome||'').trim()){showToast('Informe o nome do KDS','error');return;}
      var item={
        id:isEdK?km.id:uid(),profile:perfil,
        nome:(km.nome||'').trim(),
        identificador:(km.identificador||km.nome||'').trim().toUpperCase(),
        cor:km.cor||COR_OPCOES[0],
        setoresVisiveis:km.setoresVisiveis||[],
        categoriasVisiveis:km.categoriasVisiveis||[],
        ativo:km.ativo!==false,
        criadoEm:km.criadoEm||today(),
      };
      var arr=isEdK
        ?(state.kdsConfigs||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.kdsConfigs||[]).concat([item]);
      lsSet('kdsConfigs',arr);
      logAudit((isEdK?'editou':'criou')+' KDS',item.nome);
      setState({kdsConfigs:arr,kdsModal:null});
      scheduleSave();
      showToast(isEdK?'KDS atualizado!':'KDS cadastrado!');
    }

    function fg(lbl,inp,hint){
      var g=div('form-group',[el('label',{class:'form-label'},lbl),inp,hint?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},hint):null].filter(Boolean));
      return g;
    }

    var mEl=el('div',{class:'modal',style:{maxWidth:'520px',maxHeight:'88vh',overflowY:'auto'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEdK?'✏️ Editar':'➕ Novo')+' KDS'),
        el('button',{class:'modal-close',onclick:function(){setState({kdsModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},fg('Nome do KDS *',nomeInp,'Nome completo — Ex: KDS Cozinha Principal')),
          el('div',{style:{gridColumn:'1/-1'}},fg('Identificador (curto)',identInp,'Aparece no header do KDS — Ex: CHAPA, BAR, COZINHA')),
        ]),
        fg('Cor identificadora',corSel),
        el('div',{style:{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}},[
          el('div',{style:{fontWeight:'700',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},'🖨️ Setores visíveis neste KDS'),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'8px'}},'Marque todos os setores cujos itens aparecerão nesta tela.'),
          allSetores.length ? setoresCheck : el('div',{style:{color:'var(--text3)',fontSize:'12px'}},'Nenhum setor cadastrado ainda — crie em Setores de Impressão.'),
        ]),
        el('div',{style:{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}},[
          el('div',{style:{fontWeight:'700',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},'📂 Categorias visíveis'),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'8px'}},'Deixe todos marcados para exibir todas as categorias.'),
          catsCheck,
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({kdsModal:null});}),
        btn('btn-primary',isEdK?'💾 Salvar':'➕ Criar',salvarKDS),
      ]),
    ]);
    var mOv=div('modal-overlay',[mEl]);
    mOv.onclick=function(e){if(e.target===mOv)setState({kdsModal:null});};
    kdsModal=mOv;
  }

  // ── Modal Pedido ──────────────────────────────────────────────────────────
  var pedModal=null;
  if (state.pedidoModal!==null&&state.pedidoModal!==undefined) {
    var pm  = state.pedidoModal;
    var isEdP=!!pm.id;
    var prodCatalogo=(state.produtos||[]).filter(function(p){return p.profile===perfil&&p.tipo==='produto';});
    var compCatalogo=(state.complementos||[]).filter(function(c){return c.profile===perfil;});
    var allSetores2=(state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});

    var cliInp=el('input',{class:'form-input',value:pm.cliente||'',placeholder:'Nome do cliente...',oninput:function(){pm.cliente=this.value;}});
    var mesaInp=el('input',{class:'form-input',value:pm.mesa||'',placeholder:'Nº mesa / comanda...',oninput:function(){pm.mesa=this.value;}});
    var obsInp=el('input',{class:'form-input',value:pm.obs||'',placeholder:'Observação geral do pedido...',oninput:function(){pm.obs=this.value;}});

    pm.itens=pm.itens||[];

    function reRenderModal(){setState({pedidoModal:Object.assign({},state.pedidoModal)});}

    var itensEl=el('div',{style:{display:'flex',flexDirection:'column',gap:'10px',marginTop:'8px'}});

    pm.itens.forEach(function(it,idx){
      var prod=prodCatalogo.find(function(p){return p.id===it.produtoId;})||{};
      var setor=allSetores2.find(function(s){return s.id===(it.setorImpressao||prod.setorImpressao);})||{};

      var itCard=el('div',{style:{background:'var(--bg3)',borderRadius:'8px',padding:'10px 12px',border:'1px solid var(--border)'}});

      var itHead=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}});
      var qtdInp=el('input',{type:'number',min:'1',value:it.qtd||1,style:{width:'56px',padding:'4px 6px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--text)',fontFamily:'inherit',fontSize:'13px'},
        onchange:function(){it.qtd=parseInt(this.value)||1;}});
      itHead.appendChild(qtdInp);

      var itNome=el('span',{style:{fontWeight:'600',fontSize:'13px',flex:'1'}},it.nome);
      itHead.appendChild(itNome);

      if(setor.nome){
        var sBadge=el('span',{style:{fontSize:'10px',padding:'2px 6px',borderRadius:'8px',background:(setor.cor||'var(--gold)')+'22',color:setor.cor||'var(--gold)',fontWeight:'600'}},setor.nome);
        itHead.appendChild(sBadge);
      }

      var delItBtn=el('button',{class:'btn-icon',style:{color:'var(--danger)',flexShrink:'0'}});
      delItBtn.textContent='🗑';
      delItBtn.onclick=function(){pm.itens.splice(idx,1);reRenderModal();};
      itHead.appendChild(delItBtn);
      itCard.appendChild(itHead);

      // Complementos do item
      var compList=el('div',{style:{paddingLeft:'8px'}});
      (it.complementos||[]).forEach(function(c,ci){
        var cRow=el('div',{style:{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',fontSize:'12px',color:'var(--text3)'}});
        cRow.textContent='  └ '+c.nome;
        var cDel=el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'11px',padding:'0 2px'}});
        cDel.textContent='×';
        cDel.onclick=function(){it.complementos.splice(ci,1);reRenderModal();};
        cRow.appendChild(cDel);
        compList.appendChild(cRow);
      });
      itCard.appendChild(compList);

      // Adicionar complemento ao item
      var addCompSel=el('select',{style:{fontSize:'11px',padding:'3px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--text)',maxWidth:'180px',marginRight:'6px'}},
        [el('option',{value:''},'+ Complemento...')].concat(compCatalogo.map(function(c){return el('option',{value:c.id},c.nome);})));
      addCompSel.onchange=function(){
        if(!this.value)return;
        var c=compCatalogo.find(function(x){return x.id===addCompSel.value;});
        if(c){it.complementos=it.complementos||[];it.complementos.push({id:c.id,nome:c.nome,qtd:1,preco:c.preco||0});}
        reRenderModal();
      };

      var obsItInp=el('input',{style:{fontSize:'11px',padding:'3px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--text)',flex:'1'},
        placeholder:'Obs do item...',value:it.obs||'',oninput:function(){it.obs=this.value;}});

      var itFoot=el('div',{style:{display:'flex',gap:'6px',marginTop:'6px',alignItems:'center'}});
      itFoot.appendChild(addCompSel);
      itFoot.appendChild(obsItInp);
      itCard.appendChild(itFoot);

      itensEl.appendChild(itCard);
    });

    // Seletor produto para adicionar
    var addProdSel=el('select',{class:'form-input'},
      [el('option',{value:''},'+ Adicionar produto ao pedido...')].concat(
        prodCatalogo.map(function(p){return el('option',{value:p.id},p.nome+(p.categoria?' ('+p.categoria+')':''));})));
    addProdSel.onchange=function(){
      if(!this.value)return;
      var p=prodCatalogo.find(function(x){return x.id===addProdSel.value;});
      if(p){pm.itens.push({id:uid(),produtoId:p.id,nome:p.nome,qtd:1,complementos:[],obs:'',setorImpressao:p.setorImpressao||'',preco:p.precoVenda||0});}
      reRenderModal();
    };

    function salvarPedido(){
      if(!pm.itens.length){showToast('Adicione ao menos 1 item','error');return;}
      var total=pm.itens.reduce(function(acc,it){return acc+(it.preco||0)*(it.qtd||1);},0);
      var item={
        id:isEdP?pm.id:uid(),profile:perfil,
        numero:isEdP?pm.numero:_nextPedidoNum(),
        status:pm.status||'novo',
        cliente:pm.cliente||'',mesa:pm.mesa||'',obs:pm.obs||'',
        itens:pm.itens,total:total,
        origem:'manual',
        criadoEm:pm.criadoEm||new Date().toISOString(),
        atualizadoEm:new Date().toISOString(),
      };
      _salvarPedido(item);
      logAudit((isEdP?'editou':'criou')+' pedido','#'+item.numero+' '+item.cliente);
      setState({pedidoModal:null});
      showToast(isEdP?'Pedido atualizado!':'Pedido lançado!');
    }

    var pmEl=el('div',{class:'modal',style:{maxWidth:'560px',maxHeight:'92vh',overflowY:'auto'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEdP?'✏️ Editar':'➕ Nova')+(isEdP?' Pedido #'+pm.numero:' Comanda')),
        el('button',{class:'modal-close',onclick:function(){setState({pedidoModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}},[
          div('form-group',[el('label',{class:'form-label'},'Cliente'),cliInp]),
          div('form-group',[el('label',{class:'form-label'},'Mesa / Comanda'),mesaInp]),
          el('div',{style:{gridColumn:'1/-1'}},div('form-group',[el('label',{class:'form-label'},'Observação geral'),obsInp])),
        ]),
        el('div',{style:{fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'.6px',color:'var(--text3)',marginBottom:'8px'}},'Itens do pedido'),
        addProdSel,
        itensEl,
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({pedidoModal:null});}),
        btn('btn-primary',isEdP?'💾 Salvar':'✅ Lançar pedido',salvarPedido),
      ]),
    ]);
    var pmOv=div('modal-overlay',[pmEl]);
    pmOv.onclick=function(e){if(e.target===pmOv)setState({pedidoModal:null});};
    pedModal=pmOv;
  }

  // ── Tab: KDSs ─────────────────────────────────────────────────────────────
  function renderKdsList() {
    var rows=kdsArr.map(function(k){
      var setoresV=(k.setoresVisiveis||[]);
      var allSet=(state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});
      var setLabel=setoresV.length===0?'Todos os setores':setoresV.map(function(id){
        var s=allSet.find(function(x){return x.id===id;});return s?s.nome:'?';
      }).join(', ');

      return el('div',{style:{display:'flex',alignItems:'center',gap:'14px',padding:'16px 0',borderBottom:'1px solid var(--border)'}},[
        el('div',{style:{width:'18px',height:'18px',borderRadius:'50%',background:k.cor||'var(--gold)',flexShrink:'0',boxShadow:'0 0 0 4px '+(k.cor||'var(--gold)')+'22'}}),
        el('div',{style:{flex:'1'}},[
          el('div',{style:{fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',gap:'8px'}},[
            el('span',{},k.nome),
            el('span',{style:{fontSize:'10px',background:'var(--bg3)',color:'var(--text3)',padding:'2px 7px',borderRadius:'8px'}},k.identificador),
          ]),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'3px',display:'flex',gap:'14px',flexWrap:'wrap'}},[
            el('span',{},'🖨️ '+setLabel),
            el('span',{},k.ativo!==false?'🟢 Ativo':'🔴 Inativo'),
          ]),
        ]),
        el('div',{style:{display:'flex',gap:'6px'}},[
          el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'},
            onclick:function(){
              _kdsVisorCfg=null;
              if(_kdsInterval){clearInterval(_kdsInterval);_kdsInterval=null;}
              setState({kdsMode:k.id,kdsViewTab:'pedidos'});
            }}, '📺 Abrir KDS'),
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({kdsModal:Object.assign({},k)});}},'✏️'),
          el('button',{class:'btn-icon',title:'Excluir',style:{color:'var(--danger)'},onclick:function(){
            if(!window.confirm('Excluir KDS "'+k.nome+'"?'))return;
            var arr=(state.kdsConfigs||[]).filter(function(x){return x.id!==k.id;});
            lsSet('kdsConfigs',arr);setState({kdsConfigs:arr});scheduleSave();
            showToast('KDS removido','error');
          }},'🗑'),
        ]),
      ]);
    });

    return el('div',{class:'card'},[
      kdsArr.length===0
        ? div('empty',[
            div('empty-icon','📺'),
            div('empty-title','Nenhum KDS configurado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Configure telas de cozinha, bar e chapa para visualizar pedidos em tempo real.'),
            btn('btn-primary','➕ Criar primeiro KDS',function(){setState({kdsModal:{}});}),
          ])
        : el('div',{style:{padding:'0 6px'}},rows),
    ]);
  }

  // ── Tab: Pedidos ──────────────────────────────────────────────────────────
  function renderPedidosList() {
    var STATUS_COR={novo:'#16a34a',preparando:'#ea580c',finalizado:'#2563eb',cancelado:'#9ca3af'};
    var STATUS_LBL={novo:'Novo',preparando:'Preparando',finalizado:'Finalizado',cancelado:'Cancelado'};

    var rows=pedidos.slice().reverse().map(function(p){
      var min=_kdsTempoMin(p.criadoEm);
      var cor=STATUS_COR[p.status]||'#9ca3af';
      return el('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid var(--border)'}},[
        el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:cor,flexShrink:'0'}}),
        el('div',{style:{flex:'1'}},[
          el('div',{style:{fontWeight:'700',fontSize:'13px',display:'flex',alignItems:'center',gap:'8px'}},[
            el('span',{},'Pedido #'+p.numero),
            el('span',{style:{fontSize:'11px',padding:'1px 7px',borderRadius:'8px',background:cor+'22',color:cor,fontWeight:'600'}},STATUS_LBL[p.status]||p.status),
          ]),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px',display:'flex',gap:'12px',flexWrap:'wrap'}},[
            p.cliente?el('span',{},'👤 '+p.cliente):null,
            p.mesa?el('span',{},'🪑 '+p.mesa):null,
            el('span',{},(p.itens||[]).length+' item(s)'),
            el('span',{},'⏱ '+min+'min'),
            el('span',{},'R$ '+(p.total||0).toFixed(2).replace('.',',')),
          ].filter(Boolean)),
        ]),
        el('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'flex-end'}},[
          p.status==='novo'?el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'5px 10px',whiteSpace:'nowrap'},onclick:function(){
            _salvarPedido(Object.assign({},p,{status:'preparando',atualizadoEm:new Date().toISOString()}));
          }},'▶ Iniciar'):null,
          p.status==='preparando'?el('button',{class:'btn-primary',style:{fontSize:'11px',padding:'5px 10px',whiteSpace:'nowrap'},onclick:function(){
            _salvarPedido(Object.assign({},p,{status:'finalizado',atualizadoEm:new Date().toISOString()}));
          }},'✓ Finalizar'):null,
          p.status!=='cancelado'?el('button',{class:'btn-icon',title:'Cancelar',style:{color:'var(--danger)'},onclick:function(){
            if(!window.confirm('Cancelar pedido #'+p.numero+'?'))return;
            _salvarPedido(Object.assign({},p,{status:'cancelado',atualizadoEm:new Date().toISOString()}));
          }},'✕'):null,
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){var cpy=JSON.parse(JSON.stringify(p.itens||[]));setState({pedidoModal:Object.assign({},p,{itens:cpy})});}},  '✏️'),
        ].filter(Boolean)),
      ]);
    });

    return el('div',{},[
      el('div',{class:'card'},[
        pedidos.length===0
          ? div('empty',[
              div('empty-icon','📋'),
              div('empty-title','Nenhum pedido ainda'),
              el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Lance pedidos manualmente para teste, ou integre com o módulo PDV.'),
              btn('btn-primary','➕ Nova comanda',function(){setState({pedidoModal:{}});}),
            ])
          : el('div',{style:{padding:'0 6px'}},rows),
      ]),
    ]);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  function tabBtn(id,label){
    var b=el('button',{});
    b.style.cssText='padding:11px 18px;font-size:13px;font-weight:'+(_kdsTab===id?'700':'500')+';'
      +'background:none;border:none;border-bottom:3px solid '+(_kdsTab===id?'var(--gold)':'transparent')+';'
      +'color:'+(_kdsTab===id?'var(--text)':'var(--text3)')+';cursor:pointer;font-family:inherit;transition:all .15s;';
    b.textContent=label;
    b.onclick=function(){_kdsTab=id;setState({});};
    return b;
  }

  var tabBar=el('div',{style:{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:'20px'}},[
    tabBtn('kds','📺 KDSs configurados'),
    tabBtn('pedidos','📋 Pedidos / Comandas'),
  ]);

  var hdrBtns=_kdsTab==='kds'
    ? [btn('btn-primary','➕ Novo KDS',function(){setState({kdsModal:{}});})]
    : [btn('btn-primary','➕ Nova comanda',function(){setState({pedidoModal:{}});})];

  var page=el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'📺 KDS — Kitchen Display System'),
        el('p',{class:'page-sub'},'Gerencie telas de produção, pedidos e setores visíveis por KDS'),
      ]),
      el('div',{style:{display:'flex',gap:'8px'}},hdrBtns),
    ]),
    tabBar,
    _kdsTab==='kds'     ? renderKdsList()    : null,
    _kdsTab==='pedidos' ? renderPedidosList() : null,
  ].filter(Boolean));

  var root=el('div',{});
  root.appendChild(page);
  if(kdsModal) root.appendChild(kdsModal);
  if(pedModal) root.appendChild(pedModal);
  return root;
}
