// ── KDS — KITCHEN DISPLAY SYSTEM ─────────────────────────────────────────────

var _kdsTab         = 'kds';
var _kdsInterval    = null;
var _kdsVisorCfg    = null;
var _kdsExpandidoId = null;
var KDS_COR_OPCOES  = ['#c9a84c','#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function _kdsTempoMin(isoStr) {
  if (!isoStr) return 0;
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
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
  var kds = (state.kdsConfigs||[]).find(function(k){return k.id===kdsId;});
  if (!kds) {
    return el('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'16px',background:'#111',color:'#fff'}},[
      el('div',{style:{fontSize:'48px'}},'⚠️'),
      el('div',{style:{fontSize:'18px'}},'KDS não encontrado'),
      el('button',{style:{padding:'10px 24px',borderRadius:'8px',border:'none',background:'#c9a84c',color:'#000',fontWeight:'700',cursor:'pointer',fontSize:'14px'},
        onclick:function(){setState({kdsMode:null});}}, 'Voltar'),
    ]);
  }

  var tempoAlerta = kds.tempoAlerta || 15;
  var empresa = ((state.empresaData||{})[state.profile]) || {};
  var tab     = state.kdsViewTab || 'pedidos';
  var perfil  = state.profile;

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

  // Ordem: preparando primeiro (mais antigo → frente), depois novo
  var pedNovos = todosPed.filter(function(p){
    return (p.status==='novo'||p.status==='preparando') && pedidoTemItensVisiveis(p);
  }).sort(function(a,b){
    var pa = a.status==='preparando'?0:1;
    var pb = b.status==='preparando'?0:1;
    if (pa!==pb) return pa-pb;
    return new Date(a.criadoEm)-new Date(b.criadoEm);
  });
  var pedFin = todosPed.filter(function(p){return p.status==='finalizado'&&pedidoTemItensVisiveis(p);})
    .sort(function(a,b){return new Date(b.atualizadoEm)-new Date(a.atualizadoEm);});
  var pedCan = todosPed.filter(function(p){return p.status==='cancelado'&&pedidoTemItensVisiveis(p);})
    .sort(function(a,b){return new Date(b.atualizadoEm)-new Date(a.atualizadoEm);});
  var pedAtivos = tab==='pedidos'?pedNovos:tab==='finalizados'?pedFin:pedCan;

  // Auto-refresh a cada 30s para atualizar cronômetros
  if (_kdsInterval) clearInterval(_kdsInterval);
  _kdsInterval = setInterval(function(){
    if (!state.kdsMode) { clearInterval(_kdsInterval); _kdsInterval=null; return; }
    setState({});
  }, 30000);

  // ── Modal expandido (comanda completa com itens marcáveis) ─────────────────
  function renderExpandido() {
    var p = _kdsExpandidoId ? todosPed.find(function(x){return x.id===_kdsExpandidoId;}) : null;
    if (!p) return null;

    var min       = _kdsTempoMin(p.criadoEm);
    var atrasado  = min >= tempoAlerta;
    var isNovo    = p.status==='novo';
    var isPrep    = p.status==='preparando';
    var hdrBg     = isPrep?'#f97316':isNovo?'#374151':'#6b7280';
    var itensFin  = p.itensFinaliz||[];
    var itensExib = (p.itens||[]).filter(function(it){return itemVisivelNaKds(it);});
    var numFin    = itensExib.filter(function(it){return itensFin.indexOf(it.id)>=0;}).length;

    function toggleItem(itemId) {
      var arr = (p.itensFinaliz||[]).slice();
      var idx = arr.indexOf(itemId);
      if (idx>=0) arr.splice(idx,1); else arr.push(itemId);
      _salvarPedido(Object.assign({},p,{itensFinaliz:arr}));
    }

    // Badges
    var badgesRow = el('div',{style:{display:'flex',gap:'5px',alignItems:'center',marginBottom:'4px'}});
    if (atrasado) {
      badgesRow.appendChild(el('span',{style:{background:'#dc2626',color:'#fff',fontSize:'10px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px'}},'Atrasado'));
    }
    badgesRow.appendChild(el('span',{style:{background:'rgba(255,255,255,.25)',color:'#fff',fontSize:'10px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px'}},
      isNovo?'Novo':isPrep?'Preparando':'Finalizado'));

    var closeBtn = el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'6px',padding:'5px 8px',color:'#fff',lineHeight:'1',display:'flex',alignItems:'center',justifyContent:'center'}});
    closeBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg>';
    closeBtn.title='Minimizar';
    closeBtn.onclick=function(){_kdsExpandidoId=null;setState({});};

    var hdrRow1=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between'}});
    hdrRow1.appendChild(badgesRow);
    hdrRow1.appendChild(closeBtn);

    var titleText=[p.mesa,p.cliente].filter(Boolean).join(' / ')||'Pedido #'+p.numero;
    var hdrTitle=el('div',{style:{fontWeight:'700',fontSize:'18px',color:'#fff',marginTop:'4px'}},titleText.toUpperCase()+' /');
    var hdrSub=el('div',{style:{fontSize:'12px',color:'rgba(255,255,255,.75)',marginTop:'2px'}},'Pedido feito a '+min+' minuto'+(min===1?'':'s')+' atrás');

    var hdrEl=el('div',{style:{padding:'12px 16px',background:hdrBg,borderRadius:'10px 10px 0 0',cursor:'pointer',userSelect:'none'}});
    hdrEl.appendChild(hdrRow1);
    hdrEl.appendChild(hdrTitle);
    hdrEl.appendChild(hdrSub);

    // Duplo-clique no cabeçalho expande → despacha comanda
    hdrEl.ondblclick=function(){
      if (p.status==='novo') {
        _salvarPedido(Object.assign({},p,{status:'preparando',atualizadoEm:new Date().toISOString()}));
        logAudit('KDS: iniciou preparo','Pedido #'+p.numero);
      } else if (p.status==='preparando') {
        _salvarPedido(Object.assign({},p,{status:'finalizado',atualizadoEm:new Date().toISOString()}));
        logAudit('KDS: finalizou pedido','Pedido #'+p.numero);
        _kdsExpandidoId=null;
      }
    };

    // Lista de itens com marcação individual
    var itensContainer=el('div',{style:{flex:'1',overflowY:'auto',padding:'4px 0'}});
    itensExib.forEach(function(it){
      var done=itensFin.indexOf(it.id)>=0;
      var row=el('div',{style:{
        display:'flex',alignItems:'flex-start',gap:'12px',
        padding:'10px 16px',borderBottom:'1px solid #f0f0f0',
        cursor:'pointer',userSelect:'none',
        background:done?'#f0fdf4':'#fff',transition:'background .12s'
      }});

      var checkEl=el('div',{style:{
        width:'22px',height:'22px',borderRadius:'50%',flexShrink:'0',
        background:done?'#16a34a':'#e5e7eb',
        display:'flex',alignItems:'center',justifyContent:'center',
        color:'#fff',fontSize:'13px',fontWeight:'700',marginTop:'2px'
      }},done?'✓':'');

      var infoEl=el('div',{style:{flex:'1'}});
      var prodRow=el('div',{style:{fontWeight:'700',fontSize:'14px',textDecoration:done?'line-through':'none',color:done?'#9ca3af':'#111'}},
        it.qtd+'x  '+it.nome.toUpperCase());
      infoEl.appendChild(prodRow);
      (it.complementos||[]).forEach(function(c){
        infoEl.appendChild(el('div',{style:{fontSize:'12px',color:'#374151',marginTop:'2px',paddingLeft:'4px'}},(c.qtd||1)+'x '+c.nome));
      });
      if (it.obs) infoEl.appendChild(el('div',{style:{fontSize:'12px',color:'#6b7280',fontStyle:'italic',marginTop:'2px',paddingLeft:'4px'}},'Obs: '+it.obs));

      row.appendChild(checkEl);
      row.appendChild(infoEl);
      row.onclick=(function(id){return function(){toggleItem(id);};})(it.id);
      itensContainer.appendChild(row);
    });

    // Rodapé contadores
    var footerEl=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'16px',padding:'12px 16px',borderTop:'1px solid #e5e7eb',fontSize:'13px',background:'#f9fafb',borderRadius:'0 0 10px 10px'}});
    footerEl.appendChild(el('span',{style:{color:numFin>0?'#16a34a':'#6b7280',fontWeight:'600'}},numFin+' finalizado'+(numFin!==1?'s':'')));
    footerEl.appendChild(el('span',{style:{color:'#374151'}},itensExib.length+' itens no total'));

    var modalEl=el('div',{style:{background:'#fff',borderRadius:'10px',border:isPrep?'2px solid #f97316':'2px solid #374151',boxShadow:'0 20px 60px rgba(0,0,0,.3)',width:'600px',maxWidth:'95vw',maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}});
    modalEl.appendChild(hdrEl);
    modalEl.appendChild(itensContainer);
    modalEl.appendChild(footerEl);

    var ovEl=el('div',{style:{position:'fixed',inset:'0',background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'500'}});
    ovEl.appendChild(modalEl);
    ovEl.onclick=function(e){if(e.target===ovEl){_kdsExpandidoId=null;setState({});}};
    return ovEl;
  }

  // ── Card do pedido ─────────────────────────────────────────────────────────
  function cardPedido(p) {
    var min      = _kdsTempoMin(p.criadoEm);
    var atrasado = min >= tempoAlerta;
    var isNovo   = p.status==='novo';
    var isPrep   = p.status==='preparando';

    var hdrBg        = isNovo?'#e5e7eb':'#f97316';
    var hdrTxtColor  = isNovo?'#111827':'#fff';
    var cardBorder   = isNovo?'1px solid #d1d5db':'2px solid #f97316';
    var cardShadow   = isNovo?'0 2px 8px rgba(0,0,0,.08)':'0 4px 16px rgba(249,115,22,.2)';

    // Badges
    var badgesEl=el('div',{style:{display:'flex',gap:'4px',alignItems:'center',flexWrap:'wrap'}});
    if (atrasado) {
      badgesEl.appendChild(el('span',{style:{background:'#dc2626',color:'#fff',fontSize:'9px',fontWeight:'700',padding:'2px 6px',borderRadius:'8px',letterSpacing:'.3px'}},'Atrasado'));
    }
    badgesEl.appendChild(el('span',{style:{background:isNovo?'#374151':'rgba(255,255,255,.3)',color:'#fff',fontSize:'9px',fontWeight:'700',padding:'2px 6px',borderRadius:'8px',letterSpacing:'.3px'}},
      isNovo?'Novo':'Preparando'));

    // Cronômetro
    var timerColor = isPrep?'rgba(255,255,255,.95)':(atrasado?'#dc2626':'#374151');
    var timerEl=el('span',{style:{display:'flex',alignItems:'center',gap:'3px',fontSize:'12px',color:timerColor,fontWeight:'700',whiteSpace:'nowrap',flexShrink:'0'}});
    timerEl.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'+min+'m';

    var userTag=p.cliente||p.mesa||'';

    // Linha superior do header: badges + cronômetro + tag usuário
    var hdrTop=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'6px',marginBottom:'4px'}});
    hdrTop.appendChild(badgesEl);
    var rightInfo=el('div',{style:{display:'flex',alignItems:'center',gap:'5px',flexShrink:'0'}});
    rightInfo.appendChild(timerEl);
    if (userTag) {
      rightInfo.appendChild(el('span',{style:{background:'#374151',color:'#fff',fontSize:'9px',fontWeight:'700',padding:'2px 6px',borderRadius:'8px',whiteSpace:'nowrap',maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis'}},userTag));
    }
    hdrTop.appendChild(rightInfo);

    // Título: mesa / cliente
    var titleText=[p.mesa,p.cliente].filter(Boolean).join(' / ')||'#'+p.numero;
    var hdrTitle=el('div',{style:{fontWeight:'700',fontSize:'14px',color:hdrTxtColor,lineHeight:'1.3'}},
      titleText.toUpperCase()+' /');

    var cardHeader=el('div',{style:{padding:'8px 12px',background:hdrBg,borderRadius:'10px 10px 0 0',cursor:'pointer',userSelect:'none'}});
    cardHeader.appendChild(hdrTop);
    cardHeader.appendChild(hdrTitle);

    // Duplo-clique no cabeçalho muda status
    cardHeader.ondblclick=function(){
      if (p.status==='novo') {
        _salvarPedido(Object.assign({},p,{status:'preparando',atualizadoEm:new Date().toISOString()}));
        logAudit('KDS: iniciou preparo','Pedido #'+p.numero);
      } else if (p.status==='preparando') {
        _salvarPedido(Object.assign({},p,{status:'finalizado',atualizadoEm:new Date().toISOString()}));
        logAudit('KDS: finalizou pedido','Pedido #'+p.numero);
      }
    };

    // Itens (máx 4 produtos visíveis)
    var itensExib=(p.itens||[]).filter(function(it){return itemVisivelNaKds(it);});
    var MAX_ITEMS=4;
    var itensVis=itensExib.slice(0,MAX_ITEMS);
    var temMais=itensExib.length>MAX_ITEMS;
    var itensFin=p.itensFinaliz||[];

    var itensEl=el('div',{style:{padding:'10px 12px',flex:'1'}});
    itensVis.forEach(function(it){
      var done=itensFin.indexOf(it.id)>=0;
      var rowProd=el('div',{style:{display:'flex',gap:'6px',marginBottom:'2px',fontWeight:'600',fontSize:'13px',textDecoration:done?'line-through':'none',color:done?'#9ca3af':'#111'}});
      rowProd.textContent=it.qtd+'x '+it.nome.toUpperCase();
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
      pedObs.textContent='Obs: '+p.obs;
      itensEl.appendChild(pedObs);
    }

    // Botão expandir
    var expandBtn=el('button',{style:{background:'#f3f4f6',border:'1px solid #d1d5db',cursor:'pointer',borderRadius:'5px',padding:'3px 7px',color:'#374151',flexShrink:'0',display:'flex',alignItems:'center',gap:'3px',fontSize:'11px'}});
    expandBtn.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
    expandBtn.title='Expandir comanda';
    expandBtn.onclick=function(e){e.stopPropagation();_kdsExpandidoId=p.id;setState({});};

    // Rodapé do card
    var footerLeft;
    if (temMais) {
      var maisBtn=el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'#2563eb',fontWeight:'600',fontSize:'12px',padding:'0'}});
      maisBtn.textContent='Mais...';
      maisBtn.onclick=function(e){e.stopPropagation();_kdsExpandidoId=p.id;setState({});};
      footerLeft=el('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},[
        maisBtn,
        el('span',{style:{fontSize:'11px',color:'#6b7280'}},itensExib.length+' itens no total'),
      ]);
    } else {
      footerLeft=el('span',{style:{fontSize:'11px',color:'#9ca3af'}},itensExib.length+' item'+(itensExib.length!==1?'s':''));
    }

    var cardFooter=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px',borderTop:'1px solid #e5e7eb',minHeight:'32px'}});
    cardFooter.appendChild(footerLeft);
    cardFooter.appendChild(expandBtn);

    var card=el('div',{style:{background:'#fff',borderRadius:'10px',border:cardBorder,boxShadow:cardShadow,width:'230px',minHeight:'120px',display:'flex',flexDirection:'column',flexShrink:'0'}});
    card.appendChild(cardHeader);
    card.appendChild(itensEl);
    card.appendChild(cardFooter);
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

    var infoDiv=el('div',{style:{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'12px',marginBottom:'16px'}});
    infoDiv.innerHTML='<div style="font-weight:700;color:#111;margin-bottom:4px">'+kds.nome+'</div>'
      +'<div style="font-size:12px;color:#6b7280">ID: '+kds.identificador+'</div>'
      +'<div style="font-size:12px;color:#6b7280">⏱ Alerta: '+tempoAlerta+'min</div>'
      +'<div style="font-size:12px;color:#6b7280">'+pedNovos.length+' pedido(s) ativos</div>';
    spBody.appendChild(infoDiv);

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
        lsSet('kdsConfigs',arr);setState({kdsConfigs:arr});scheduleSave();
      };
      var dot=el('span',{style:{width:'10px',height:'10px',borderRadius:'50%',background:s.cor||'#c9a84c',flexShrink:'0'}});
      row.appendChild(chk);row.appendChild(dot);row.appendChild(document.createTextNode(s.nome));
      spBody.appendChild(row);
    });
    if(!allSetores.length){
      spBody.appendChild(el('div',{style:{color:'#9ca3af',fontSize:'12px',marginBottom:'12px'}},'Nenhum setor cadastrado.'));
    }

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
        lsSet('kdsConfigs',arr);setState({kdsConfigs:arr});scheduleSave();
      };
      rowC.appendChild(chkC);rowC.appendChild(document.createTextNode(cat));
      spBody.appendChild(rowC);
    });

    var exitBtn=el('button',{});
    exitBtn.style.cssText='width:100%;margin-top:24px;padding:12px;border:2px solid #dc2626;background:transparent;color:#dc2626;font-weight:700;font-size:13px;cursor:pointer;border-radius:8px;font-family:inherit;';
    exitBtn.textContent='✕ Sair do modo KDS';
    exitBtn.onclick=function(){_kdsVisorCfg=null;clearInterval(_kdsInterval);_kdsInterval=null;setState({kdsMode:null,kdsViewTab:'pedidos'});};
    spBody.appendChild(exitBtn);
    spEl.appendChild(spBody);
    settingsPanel=spEl;
  }

  // ── Header do viewer ──────────────────────────────────────────────────────
  var headerEl=el('div',{style:{display:'flex',alignItems:'center',borderBottom:'1px solid #d1d5db',background:'#fff',height:'50px',position:'fixed',top:'0',left:'0',right:'0',zIndex:'100',userSelect:'none'}});
  var tabsEl=el('div',{style:{display:'flex',alignItems:'stretch',height:'100%',flex:'1'}});
  [['pedidos','PEDIDOS',pedNovos.length],['finalizados','FINALIZADOS',null],['cancelados','CANCELADOS',null]].forEach(function(t){
    var isAct=tab===t[0];
    var b=el('button',{});
    b.style.cssText='padding:0 28px;font-size:13px;font-weight:'+(isAct?'700':'500')+';background:none;border:none;border-bottom:3px solid '+(isAct?'#2563eb':'transparent')+';color:'+(isAct?'#2563eb':'#6b7280')+';cursor:pointer;font-family:inherit;letter-spacing:.5px;position:relative;white-space:nowrap;';
    b.textContent=t[1];
    if(t[2]&&t[2]>0){
      var ct=el('span',{style:{position:'absolute',top:'8px',right:'10px',background:'#dc2626',color:'#fff',fontSize:'9px',fontWeight:'700',padding:'1px 4px',borderRadius:'8px'}},String(t[2]));
      b.appendChild(ct);
    }
    b.onclick=function(){setState({kdsViewTab:t[0]});};
    tabsEl.appendChild(b);
  });
  headerEl.appendChild(tabsEl);

  var infoRight=el('div',{style:{display:'flex',alignItems:'center',gap:'16px',padding:'0 16px',fontSize:'12px',color:'#374151',flexShrink:'0'}});
  infoRight.appendChild(el('span',{style:{fontWeight:'700'}},empresa.nomeFantasia||'KDS Sistema'));
  infoRight.appendChild(el('span',{style:{color:'#6b7280'}},'KDS ativo: '+kds.identificador));
  infoRight.appendChild(el('span',{style:{color:'#6b7280',fontSize:'11px'}},'⏱ Alerta: '+tempoAlerta+'min'));
  var gearBtn=el('button',{style:{background:'none',border:'none',cursor:'pointer',fontSize:'20px',padding:'4px',color:'#374151'}});
  gearBtn.textContent='⚙';
  gearBtn.onclick=function(){_kdsVisorCfg=!_kdsVisorCfg;setState({});};
  infoRight.appendChild(gearBtn);
  headerEl.appendChild(infoRight);

  // ── Grid de cards ─────────────────────────────────────────────────────────
  var gridEl=el('div',{style:{display:'flex',flexWrap:'wrap',gap:'14px',padding:'16px',paddingTop:'66px',minHeight:'100vh',background:'#f3f4f6',alignContent:'flex-start'}});
  if(pedAtivos.length===0){
    var emptyEl=el('div',{style:{width:'100%',textAlign:'center',padding:'80px 20px',color:'#9ca3af'}});
    emptyEl.innerHTML='<div style="font-size:48px;margin-bottom:12px">📋</div>'
      +'<div style="font-size:16px;font-weight:600">Nenhum pedido '+(tab==='pedidos'?'ativo':tab==='finalizados'?'finalizado':'cancelado')+'</div>'
      +(tab==='pedidos'?'<div style="font-size:13px;margin-top:8px;color:#d1d5db">Duplo-clique no cabeçalho do card para aceitar (cinza→laranja) ou finalizar (laranja→concluído)</div>':'');
    gridEl.appendChild(emptyEl);
  } else {
    pedAtivos.forEach(function(p){ gridEl.appendChild(cardPedido(p)); });
  }

  var root=el('div',{style:{background:'#f3f4f6',minHeight:'100vh',overflowY:'auto'}});
  root.appendChild(headerEl);
  root.appendChild(gridEl);
  if(settingsPanel) root.appendChild(settingsPanel);
  var expandidoEl=renderExpandido();
  if(expandidoEl) root.appendChild(expandidoEl);
  return root;
}

// ── PÁGINA GERENCIAL DE KDS ───────────────────────────────────────────────────
function renderKDSModal() {
  if (state.kdsModal === null || state.kdsModal === undefined) return null;
  var perfil = state.profile;
  var km     = state.kdsModal;
  var isEdK  = !!km.id;
  var allSetores = (state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});

  var nomeInp  = el('input',{class:'form-input',value:km.nome||'',placeholder:'Ex: KDS Cozinha, KDS Chapa, KDS Bar...',
    oninput:function(){state.kdsModal.nome=this.value;}});
  var identInp = el('input',{class:'form-input',value:km.identificador||'',placeholder:'Ex: CHAPA, COZINHA, BAR...',
    style:{textTransform:'uppercase'},oninput:function(){state.kdsModal.identificador=this.value.toUpperCase();}});
  var tempoInp = el('input',{class:'form-input',type:'number',min:'1',max:'120',value:String(km.tempoAlerta||15),style:{width:'80px'},
    oninput:function(){state.kdsModal.tempoAlerta=parseInt(this.value)||15;}});

  var corSel=el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}},
    KDS_COR_OPCOES.map(function(cor){
      var b=el('button',{});
      b.style.cssText='width:28px;height:28px;border-radius:50%;background:'+cor+';border:3px solid '
        +((state.kdsModal.cor||KDS_COR_OPCOES[0])===cor?'var(--text)':'transparent')+';cursor:pointer;';
      b.onclick=function(e){
        e.preventDefault();state.kdsModal.cor=cor;
        corSel.querySelectorAll('button').forEach(function(btn2){
          btn2.style.border='3px solid '+(btn2.dataset.cor===cor?'var(--text)':'transparent');
        });
      };
      b.dataset.cor=cor;
      return b;
    }));

  var _setChks=[];
  var setoresCheck=el('div',{style:{display:'flex',flexDirection:'column',gap:'6px',marginTop:'6px'}},
    allSetores.map(function(s){
      var vis=km.setoresVisiveis||[];
      var chk=el('input',{type:'checkbox',style:{accentColor:s.cor||'var(--gold)'}});
      chk.checked=!vis.length||vis.indexOf(s.id)>=0;
      _setChks.push({chk:chk,id:s.id});
      var lbl=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px'}});
      var dot=el('span',{style:{width:'10px',height:'10px',borderRadius:'50%',background:s.cor||'var(--gold)',flexShrink:'0'}});
      lbl.appendChild(chk);lbl.appendChild(dot);lbl.appendChild(document.createTextNode(s.nome));
      return lbl;
    }));

  var _catChks=[];
  var catsCheck=el('div',{style:{display:'flex',flexDirection:'column',gap:'6px',marginTop:'6px'}},
    (typeof estCats==='function'?estCats():[]).map(function(cat){
      var vis=km.categoriasVisiveis||[];
      var chkC=el('input',{type:'checkbox',style:{accentColor:'var(--gold)'}});
      chkC.checked=!vis.length||vis.indexOf(cat)>=0;
      _catChks.push({chk:chkC,cat:cat});
      var lblC=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px'}});
      lblC.appendChild(chkC);lblC.appendChild(document.createTextNode(cat));
      return lblC;
    }));

  function salvarKDS(){
    var nomeVal=(nomeInp.value||'').trim();
    if(!nomeVal){_fldErr(nomeInp,'Nome do KDS é obrigatório');showToast('Preencha os campos em vermelho','error');return;}
    var setoresVis=_setChks.filter(function(x){return x.chk.checked;}).map(function(x){return x.id;});
    var catsVis=_catChks.filter(function(x){return x.chk.checked;}).map(function(x){return x.cat;});
    var item={
      id:isEdK?km.id:uid(),profile:perfil,
      nome:nomeVal,
      identificador:(identInp.value||nomeVal).trim().toUpperCase(),
      cor:state.kdsModal.cor||KDS_COR_OPCOES[0],
      tempoAlerta:parseInt(tempoInp.value)||15,
      setoresVisiveis:setoresVis,
      categoriasVisiveis:catsVis,
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
    showToast(isEdK?'KDS atualizado!':'KDS cadastrado!','success');
  }

  function fg(lbl,inp,hint){
    return div('form-group',[el('label',{class:'form-label'},lbl),inp,
      hint?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},hint):null].filter(Boolean));
  }

  var mEl=el('div',{class:'modal',style:{maxWidth:'520px',maxHeight:'88vh',overflowY:'auto'}},[
    el('div',{class:'modal-header'},[
      el('h3',{class:'modal-title'},(isEdK?'✏️ Editar':'➕ Novo')+' KDS'),
      el('button',{class:'modal-close',onclick:function(){setState({kdsModal:null});}},'✕'),
    ]),
    el('div',{class:'modal-body'},[
      fg('Nome do KDS *',nomeInp,'Nome completo — Ex: KDS Cozinha Principal'),
      fg('Identificador (curto)',identInp,'Aparece no header do KDS — Ex: CHAPA, BAR, COZINHA'),
      fg('⏱ Tempo de alerta',
        el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[
          tempoInp,
          el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'minutos até badge "Atrasado" aparecer'),
        ])
      ),
      fg('Cor identificadora',corSel),
      el('div',{style:{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}},[
        el('div',{style:{fontWeight:'700',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},'🖨️ Setores visíveis neste KDS'),
        allSetores.length?setoresCheck:el('div',{style:{color:'var(--text3)',fontSize:'12px'}},'Nenhum setor cadastrado.'),
      ]),
      el('div',{style:{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}},[
        el('div',{style:{fontWeight:'700',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},'📂 Categorias visíveis'),
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
  return mOv;
}

// ── MODAL PEDIDO ──────────────────────────────────────────────────────────────
function renderKDSPedidoModal() {
  if (state.pedidoModal === null || state.pedidoModal === undefined) return null;
  var perfil = state.profile;
  var pm     = state.pedidoModal;
  var isEdP  = !!pm.id;
  var prodCatalogo = (state.produtos||[]).filter(function(p){return p.profile===perfil&&p.tipo==='produto';});
  var compCatalogo = (state.complementos||[]).filter(function(c){return c.profile===perfil;});
  var allSetores2  = (state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});

  var cliInp  = el('input',{class:'form-input',value:pm.cliente||'',placeholder:'Nome do cliente...',oninput:function(){state.pedidoModal.cliente=this.value;}});
  var mesaInp = el('input',{class:'form-input',value:pm.mesa||'',placeholder:'Nº mesa / comanda...',oninput:function(){state.pedidoModal.mesa=this.value;}});
  var obsInp  = el('input',{class:'form-input',value:pm.obs||'',placeholder:'Observação geral do pedido...',oninput:function(){state.pedidoModal.obs=this.value;}});

  pm.itens=pm.itens||[];

  function reRenderModal(){setState({pedidoModal:Object.assign({},state.pedidoModal,{itens:state.pedidoModal.itens})});}

  var itensEl=el('div',{style:{display:'flex',flexDirection:'column',gap:'10px',marginTop:'8px'}});

  pm.itens.forEach(function(it,idx){
    var prod=prodCatalogo.find(function(p){return p.id===it.produtoId;})||{};
    var setor=allSetores2.find(function(s){return s.id===(it.setorImpressao||prod.setorImpressao);})||{};

    var itCard=el('div',{style:{background:'var(--bg3)',borderRadius:'8px',padding:'10px 12px',border:'1px solid var(--border)'}});
    var itHead=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}});

    var qtdInp=el('input',{type:'number',min:'1',value:it.qtd||1,
      style:{width:'56px',padding:'4px 6px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--text)',fontFamily:'inherit',fontSize:'13px'},
      onchange:function(){it.qtd=parseInt(this.value)||1;}});
    itHead.appendChild(qtdInp);
    itHead.appendChild(el('span',{style:{fontWeight:'600',fontSize:'13px',flex:'1'}},it.nome));
    if(setor.nome){
      itHead.appendChild(el('span',{style:{fontSize:'10px',padding:'2px 6px',borderRadius:'8px',background:(setor.cor||'var(--gold)')+'22',color:setor.cor||'var(--gold)',fontWeight:'600'}},setor.nome));
    }
    var delItBtn=el('button',{class:'btn-icon',style:{color:'var(--danger)',flexShrink:'0'}});
    delItBtn.textContent='🗑';
    delItBtn.onclick=(function(i){return function(){pm.itens.splice(i,1);reRenderModal();};})(idx);
    itHead.appendChild(delItBtn);
    itCard.appendChild(itHead);

    var compList=el('div',{style:{paddingLeft:'8px'}});
    (it.complementos||[]).forEach(function(c,ci){
      var cRow=el('div',{style:{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px',fontSize:'12px',color:'var(--text3)'}});
      cRow.textContent='  └ '+c.nome;
      var cDel=el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'11px',padding:'0 2px'}});
      cDel.textContent='×';
      cDel.onclick=(function(ii,ci2){return function(){pm.itens[ii].complementos.splice(ci2,1);reRenderModal();};})(idx,ci);
      cRow.appendChild(cDel);
      compList.appendChild(cRow);
    });
    itCard.appendChild(compList);

    var addCompSel=el('select',{style:{fontSize:'11px',padding:'3px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--text)',maxWidth:'180px',marginRight:'6px'}},
      [el('option',{value:''},'+ Complemento...')].concat(compCatalogo.map(function(c){return el('option',{value:c.id},c.nome);})));
    addCompSel.onchange=(function(ii){return function(){
      if(!this.value)return;
      var c=compCatalogo.find(function(x){return x.id===this.value;},this);
      if(c){pm.itens[ii].complementos=pm.itens[ii].complementos||[];pm.itens[ii].complementos.push({id:c.id,nome:c.nome,qtd:1,preco:c.preco||0});}
      reRenderModal();
    };})(idx);

    var obsItInp=el('input',{style:{fontSize:'11px',padding:'3px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--bg2)',color:'var(--text)',flex:'1'},
      placeholder:'Obs do item...',value:it.obs||'',oninput:(function(ii){return function(){pm.itens[ii].obs=this.value;};})(idx)});

    var itFoot=el('div',{style:{display:'flex',gap:'6px',marginTop:'6px',alignItems:'center'}});
    itFoot.appendChild(addCompSel);itFoot.appendChild(obsItInp);
    itCard.appendChild(itFoot);
    itensEl.appendChild(itCard);
  });

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
    var cliVal=cliInp.value;var mesaVal=mesaInp.value;var obsVal=obsInp.value;
    var itens=pm.itens.map(function(it){return Object.assign({},it,{complementos:(it.complementos||[]).slice()});});
    var total=itens.reduce(function(acc,it){return acc+(it.preco||0)*(it.qtd||1);},0);
    var item={
      id:isEdP?pm.id:uid(),profile:perfil,
      numero:isEdP?pm.numero:_nextPedidoNum(),
      status:pm.status||'novo',
      cliente:cliVal,mesa:mesaVal,obs:obsVal,
      itens:itens,total:total,origem:'manual',
      criadoEm:pm.criadoEm||new Date().toISOString(),
      atualizadoEm:new Date().toISOString(),
    };
    var arr=(state.pedidos||[]);
    var novos=arr.find(function(x){return x.id===item.id;})
      ?arr.map(function(x){return x.id===item.id?item:x;})
      :arr.concat([item]);
    lsSet('pedidos',novos);
    logAudit((isEdP?'editou':'criou')+' pedido','#'+item.numero+' '+item.cliente);
    setState({pedidos:novos,pedidoModal:null});
    scheduleSave();
    showToast(isEdP?'Pedido atualizado!':'Pedido lançado!','success');
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
  return pmOv;
}

function renderKDS() {
  var perfil  = state.profile;
  var kdsArr  = (state.kdsConfigs||[]).filter(function(k){return k.profile===perfil;});
  var pedidos = (state.pedidos||[]).filter(function(p){return p.profile===perfil;});

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
            el('span',{},'⏱ Alerta: '+(k.tempoAlerta||15)+'min'),
            el('span',{},k.ativo!==false?'🟢 Ativo':'🔴 Inativo'),
          ]),
        ]),
        el('div',{style:{display:'flex',gap:'6px'}},[
          el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'},
            onclick:function(){
              _kdsVisorCfg=null;_kdsExpandidoId=null;
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
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Configure telas de cozinha, bar e chapa.'),
            btn('btn-primary','➕ Criar primeiro KDS',function(){setState({kdsModal:{}});}),
          ])
        : el('div',{style:{padding:'0 6px'}},rows),
    ]);
  }

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
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){var cpy=JSON.parse(JSON.stringify(p.itens||[]));setState({pedidoModal:Object.assign({},p,{itens:cpy})});}},'✏️'),
        ].filter(Boolean)),
      ]);
    });

    return el('div',{},[
      el('div',{class:'card'},[
        pedidos.length===0
          ? div('empty',[
              div('empty-icon','📋'),
              div('empty-title','Nenhum pedido ainda'),
              btn('btn-primary','➕ Nova comanda',function(){setState({pedidoModal:{}});}),
            ])
          : el('div',{style:{padding:'0 6px'}},rows),
      ]),
    ]);
  }

  function tabBtn(id,label){
    var b=el('button',{});
    b.style.cssText='padding:11px 18px;font-size:13px;font-weight:'+(_kdsTab===id?'700':'500')+';background:none;border:none;border-bottom:3px solid '+(_kdsTab===id?'var(--gold)':'transparent')+';color:'+(_kdsTab===id?'var(--text)':'var(--text3)')+';cursor:pointer;font-family:inherit;transition:all .15s;';
    b.textContent=label;b.onclick=function(){_kdsTab=id;setState({});};return b;
  }

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'📺 KDS — Kitchen Display System'),
        el('p',{class:'page-sub'},'Gerencie telas de produção, pedidos e setores visíveis por KDS'),
      ]),
      el('div',{style:{display:'flex',gap:'8px'}},
        _kdsTab==='kds'
          ?[btn('btn-primary','➕ Novo KDS',function(){setState({kdsModal:{}});})]
          :[btn('btn-primary','➕ Nova comanda',function(){setState({pedidoModal:{}});})]),
    ]),
    el('div',{style:{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:'20px'}},[
      tabBtn('kds','📺 KDSs configurados'),
      tabBtn('pedidos','📋 Pedidos / Comandas'),
    ]),
    _kdsTab==='kds'     ? renderKdsList()    : null,
    _kdsTab==='pedidos' ? renderPedidosList() : null,
  ].filter(Boolean));
}
