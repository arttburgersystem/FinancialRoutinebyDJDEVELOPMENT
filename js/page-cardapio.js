// ── CARDÁPIO ──────────────────────────────────────────────────────────────────

var _crdTab    = 'produtos';
var _crdBusca  = '';
var _crdCatFlt = '';
var _crdSetFlt = '';
var _crdStsFlt = '';
var _crdSel    = {};

function renderCardapio() {
  var perfil  = state.profile;
  var cats    = estCats();
  var setores = (state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});
  var isComp  = _crdTab === 'complementos';

  var todosProd = (state.produtos||[]).filter(function(p){
    return p.profile===perfil && p.tipo==='produto';
  });
  var todosComp = (state.complementos||[]).filter(function(c){
    return c.profile===perfil;
  });
  var todos = isComp ? todosComp : todosProd;

  var visivel = todos.filter(function(p){
    var q = _crdBusca.toLowerCase();
    if (q && !(p.nome||'').toLowerCase().includes(q) && !(p.codigo||'').toLowerCase().includes(q)) return false;
    if (!isComp && _crdCatFlt && p.categoria !== _crdCatFlt) return false;
    if (!isComp && _crdSetFlt && p.setorImpressao !== _crdSetFlt) return false;
    if (_crdStsFlt==='ativo'   && p.disponivel===false) return false;
    if (_crdStsFlt==='inativo' && p.disponivel!==false) return false;
    return true;
  });

  // ── Modal complemento ────────────────────────────────────────────────────────
  var compModal = null;
  if (state.complementoModal !== null && state.complementoModal !== undefined) {
    var cm   = state.complementoModal;
    var isEc = !!cm.id;
    function ci(field,type,ph,val){
      var i=el('input',{class:'form-input',type:type||'text',value:String(val||''),placeholder:ph||'',
        oninput:function(){cm[field]=type==='number'?parseFloat(this.value)||0:this.value;}});
      return i;
    }
    var catsSel=el('select',{class:'form-input',onchange:function(){cm.categoria=this.value;}},
      cats.map(function(c){var o=el('option',{value:c},c);if(c===(cm.categoria||cats[0]))o.selected=true;return o;}));

    function salvarComp(){
      if(!(cm.nome||'').trim()){showToast('Informe o nome','error');return;}
      var item={id:isEc?cm.id:uid(),profile:state.profile,nome:(cm.nome||'').trim(),
        codigo:cm.codigo||'',categoria:cm.categoria||cats[0]||'',
        preco:cm.preco||0,custo:cm.custo||0,estoque:cm.estoque||0,
        disponivel:cm.disponivel!==false,criadoEm:cm.criadoEm||today()};
      var arr=isEc
        ?(state.complementos||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.complementos||[]).concat([item]);
      lsSet('complementos',arr);
      logAudit((isEc?'editou':'cadastrou')+' complemento',item.nome);
      setState({complementos:arr,complementoModal:null});
      scheduleSave();
      showToast(isEc?'Complemento atualizado!':'Complemento cadastrado!');
    }

    var mEl=el('div',{class:'modal',style:{maxWidth:'480px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEc?'✏️ Editar':'➕ Novo')+' Complemento'),
        el('button',{class:'modal-close',onclick:function(){setState({complementoModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},
            div('form-group',[el('label',{class:'form-label'},'Nome *'),ci('nome','text','Ex: Bacon extra, Queijo, Molho especial...',cm.nome||'')])),
          div('form-group',[el('label',{class:'form-label'},'Código (COD)'),ci('codigo','text','EX-001',cm.codigo||'')]),
          div('form-group',[el('label',{class:'form-label'},'Categoria'),catsSel]),
          div('form-group',[el('label',{class:'form-label'},'Preço de venda (R$)'),ci('preco','number','0,00',cm.preco||'')]),
          div('form-group',[el('label',{class:'form-label'},'Custo (R$)'),ci('custo','number','0,00',cm.custo||'')]),
          div('form-group',[el('label',{class:'form-label'},'Estoque'),ci('estoque','number','0',cm.estoque||'')]),
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({complementoModal:null});}),
        btn('btn-primary',isEc?'💾 Salvar':'➕ Criar',salvarComp),
      ]),
    ]);
    var mOv=div('modal-overlay',[mEl]);
    mOv.onclick=function(e){if(e.target===mOv)setState({complementoModal:null});};
    compModal=mOv;
  }

  // ── Helpers de dropdown ──────────────────────────────────────────────────────
  function filterDrop(id, label, value, options, onSelect, onClear) {
    var isOpen = state.crdDropOpen === id;
    var hasVal = !!value;
    var selLabel = hasVal ? (options.find(function(o){return o.v===value;})||{}).l : null;

    var wrap = el('div',{style:{position:'relative',display:'inline-block'}});

    var btnEl = el('button',{});
    btnEl.style.cssText='display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:6px;border:1px solid '
      +(hasVal?'var(--gold)':'var(--border)')+';background:'
      +(hasVal?'var(--gold-dim)':'var(--bg2)')+';color:'
      +(hasVal?'var(--gold)':'var(--text2)')+';font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;';
    var iconSpan=el('span',{style:{opacity:'.55',fontSize:'11px'}});
    iconSpan.textContent='⊿';
    btnEl.appendChild(iconSpan);
    if(hasVal){
      var valSpan=el('span',{style:{fontWeight:'600'}});
      valSpan.textContent=selLabel;
      btnEl.appendChild(valSpan);
      var clrBtn=el('button',{});
      clrBtn.style.cssText='margin-left:2px;padding:0 3px;background:none;border:none;cursor:pointer;color:var(--text3);font-size:15px;line-height:1;';
      clrBtn.textContent='×';
      clrBtn.onclick=function(e){e.stopPropagation();onClear();setState({crdDropOpen:null});};
      btnEl.appendChild(clrBtn);
    } else {
      var lblSpan=el('span',{});
      lblSpan.innerHTML='Filtrar: <em style="font-style:normal;opacity:.7">'+label+'</em>';
      btnEl.appendChild(lblSpan);
      var arrSpan=el('span',{style:{fontSize:'10px',opacity:'.55'}});
      arrSpan.textContent='▼';
      btnEl.appendChild(arrSpan);
    }
    btnEl.onclick=function(e){
      e.stopPropagation();
      setState({crdDropOpen:isOpen?null:id});
    };
    wrap.appendChild(btnEl);

    if (isOpen) {
      var panel=el('div',{});
      panel.style.cssText='position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);'
        +'border-radius:8px;min-width:200px;z-index:9500;box-shadow:0 4px 16px rgba(0,0,0,.25);overflow:hidden;';
      options.forEach(function(o){
        var row=el('div',{});
        var isAct=value===o.v;
        row.style.cssText='padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;'
          +'color:'+(isAct?'var(--gold)':'var(--text)')+';background:'+(isAct?'var(--gold-dim)':'transparent')+';';
        row.onmouseenter=function(){if(!isAct)this.style.background='var(--bg3)';};
        row.onmouseleave=function(){if(!isAct)this.style.background='transparent';};
        if(isAct){var chkSpan=el('span',{style:{fontSize:'10px'}});chkSpan.textContent='✓';row.appendChild(chkSpan);}
        row.appendChild(document.createTextNode(o.l));
        row.onclick=function(e){e.stopPropagation();onSelect(o.v);setState({crdDropOpen:null});};
        panel.appendChild(row);
      });
      wrap.appendChild(panel);
    }
    return wrap;
  }

  if (state.crdDropOpen) {
    setTimeout(function(){
      document.addEventListener('click',function handler(){
        setState({crdDropOpen:null});
        document.removeEventListener('click',handler);
      },{once:true});
    },10);
  }

  // ── Ações dropdown ────────────────────────────────────────────────────────────
  function acoesBtn() {
    var isOpen = state.crdDropOpen === 'acoes';
    var selIds = Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    var wrap = el('div',{style:{position:'relative',display:'inline-block'}});
    var b = el('button',{});
    b.style.cssText='display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:6px;border:1px solid '
      +(selIds.length?'var(--gold)':'var(--border)')+';background:var(--bg2);color:var(--text2);font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;';
    b.innerHTML='<span style="font-size:12px">✎</span> Ações <span style="font-size:10px;opacity:.6">▼</span>';
    b.onclick=function(e){e.stopPropagation();setState({crdDropOpen:isOpen?null:'acoes'});};
    wrap.appendChild(b);

    if(isOpen){
      var panel=el('div',{});
      panel.style.cssText='position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;min-width:220px;z-index:9500;box-shadow:0 4px 16px rgba(0,0,0,.25);overflow:hidden;';
      if(!selIds.length){
        var hint=el('div',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},'Selecione itens na tabela primeiro.');
        panel.appendChild(hint);
      } else {
        var ACOES=[
          {l:'✅ Ativar selecionados', fn:function(){ativarSel(true);}},
          {l:'🚫 Desativar selecionados', fn:function(){ativarSel(false);}},
          {l:'🗑 Excluir selecionados', fn:function(){excluirSel();}, danger:true},
        ];
        ACOES.forEach(function(a){
          var row=el('div',{});
          row.style.cssText='padding:9px 14px;cursor:pointer;font-size:13px;color:'+(a.danger?'var(--danger)':'var(--text)')+';';
          row.onmouseenter=function(){this.style.background='var(--bg3)';};
          row.onmouseleave=function(){this.style.background='';};
          row.textContent=a.l;
          row.onclick=function(e){e.stopPropagation();setState({crdDropOpen:null});a.fn();};
          panel.appendChild(row);
        });
      }
      wrap.appendChild(panel);
    }
    return wrap;
  }

  function ativarSel(val){
    var ids=Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    if(!ids.length)return;
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).map(function(p){
      return ids.indexOf(p.id)>=0?Object.assign({},p,{disponivel:val}):p;
    });
    _crdSel={};
    lsSet(key,arr);
    var patch={};patch[key]=arr;
    setState(patch);
    scheduleSave();
    showToast((val?'Ativado(s)':'Desativado(s)')+': '+ids.length+' item(s)');
  }

  function excluirSel(){
    var ids=Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    if(!ids.length)return;
    if(!window.confirm('Excluir '+ids.length+' item(s) selecionado(s)?'))return;
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).filter(function(p){return ids.indexOf(p.id)<0;});
    _crdSel={};
    lsSet(key,arr);
    var patch={};patch[key]=arr;
    setState(patch);
    scheduleSave();
    showToast('Excluído(s): '+ids.length+' item(s)','error');
  }

  function toggleDisponivel(p){
    var key=isComp?'complementos':'produtos';
    var novoVal=p.disponivel===false;
    var arr=(state[key]||[]).map(function(x){
      return x.id===p.id?Object.assign({},x,{disponivel:novoVal}):x;
    });
    lsSet(key,arr);
    var patch={};patch[key]=arr;
    setState(patch);
    scheduleSave();
  }

  // ── TAB bar ──────────────────────────────────────────────────────────────────
  function tabBtn(id,label){
    var b=el('button',{});
    b.style.cssText='padding:14px 22px;font-size:14px;font-weight:'+(_crdTab===id?'700':'500')+';'
      +'background:none;border:none;border-bottom:3px solid '+(_crdTab===id?'var(--gold)':'transparent')+';'
      +'color:'+(_crdTab===id?'var(--text)':'var(--text3)')+';cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;';
    b.textContent=label;
    b.onclick=function(){_crdTab=id;_crdSel={};setState({});};
    return b;
  }

  var tabBar=el('div',{style:{display:'flex',alignItems:'stretch',borderBottom:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'10px 10px 0 0',padding:'0 4px',justifyContent:'space-between'}},[
    el('div',{style:{display:'flex'}},[
      tabBtn('produtos','Produtos'),
      tabBtn('complementos','Complementos'),
    ]),
    el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}},[
      el('button',{class:'btn-secondary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'},
        onclick:function(){setState({estCatManager:{open:true}});}}, '+ Nova categoria'),
      el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'},
        onclick:function(){
          if(isComp) setState({complementoModal:{}});
          else setState({produtoModal:{tipo:'produto'}});
        }}, isComp?'+ Novo complemento':'+ Novo produto'),
    ]),
  ]);

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  var searchWrap=el('div',{style:{position:'relative',flex:'1',maxWidth:'380px',minWidth:'180px'}});
  var searchIcon=el('span',{});
  searchIcon.style.cssText='position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;pointer-events:none;';
  searchIcon.textContent='🔍';
  var searchInp=el('input',{class:'form-input',placeholder:'Pesquisar',value:_crdBusca,
    oninput:function(){_crdBusca=this.value;setState({});},
    style:{paddingLeft:'34px',marginBottom:'0'}});
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInp);

  var catOpts=cats.map(function(c){return {v:c,l:c};});
  var setOpts=setores.map(function(s){return {v:s.id,l:s.nome};});
  var stsOpts=[{v:'ativo',l:'✅ Ativo'},{v:'inativo',l:'❌ Inativo'}];

  var catFiltro=filterDrop('cat','por categoria',_crdCatFlt,catOpts,
    function(v){_crdCatFlt=v;},function(){_crdCatFlt='';});
  var setFiltro=filterDrop('set','por categoria de impressão',_crdSetFlt,setOpts,
    function(v){_crdSetFlt=v;},function(){_crdSetFlt='';});
  var stsFiltro=filterDrop('sts','por status',_crdStsFlt,stsOpts,
    function(v){_crdStsFlt=v;},function(){_crdStsFlt='';});

  var menuBtn=el('button',{title:'Ir para Setores de Impressão'});
  menuBtn.style.cssText='padding:7px 11px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);font-size:16px;cursor:pointer;line-height:1;';
  menuBtn.textContent='≡';
  menuBtn.onclick=function(){setState({page:'impressoes'});};

  var toolbarChildren=[searchWrap];
  if(!isComp){toolbarChildren.push(catFiltro);toolbarChildren.push(setFiltro);}
  toolbarChildren.push(stsFiltro);
  toolbarChildren.push(acoesBtn());
  toolbarChildren.push(el('div',{style:{flex:'1'}}));
  toolbarChildren.push(menuBtn);

  var toolbar=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',flexWrap:'wrap',borderBottom:'1px solid var(--border)',background:'var(--bg2)'}}
    ,toolbarChildren);

  // ── Tabela ────────────────────────────────────────────────────────────────────
  var allIds=visivel.map(function(p){return p.id;});
  var allChecked=allIds.length>0&&allIds.every(function(id){return _crdSel[id];});

  var chkAll=el('input',{type:'checkbox'});
  chkAll.checked=allChecked;
  chkAll.style.cssText='cursor:pointer;width:15px;height:15px;accent-color:var(--gold);';
  chkAll.onchange=function(){
    var v=this.checked;
    allIds.forEach(function(id){_crdSel[id]=v;});
    setState({});
  };

  function thCell(txt,w,align){
    var th=el('th',{});
    th.style.cssText='padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;'
      +'color:var(--text3);white-space:nowrap;text-align:'+(align||'left')+';'+(w?'width:'+w+';':'');
    th.textContent=txt;
    return th;
  }

  var headCells=[
    el('th',{style:{padding:'10px 12px',width:'36px'}},[chkAll]),
    thCell('Nome',''),
    thCell('COD','90px'),
  ];
  if(!isComp) headCells.push(thCell('Categoria','110px'));
  headCells.push(thCell('Estoque','90px','right'));
  headCells.push(thCell('Valor de custo','110px','right'));
  headCells.push(thCell('Valor de venda','110px','right'));
  headCells.push(thCell('Ativo','70px','center'));
  headCells.push(el('th',{style:{width:'70px'}}));

  var thead=el('thead',{},[el('tr',{style:{background:'var(--bg3)'}},headCells)]);

  var colCount=headCells.length;
  var EMPTY_ROW=el('tr',{},[
    el('td',{colspan:String(colCount),style:{padding:'48px 20px',textAlign:'center',color:'var(--text3)',fontSize:'14px'}},
      visivel.length===0&&!_crdBusca&&!_crdCatFlt&&!_crdSetFlt&&!_crdStsFlt
        ? (isComp?'Nenhum complemento cadastrado. Clique em "+ Novo complemento" para começar.':'Nenhum produto cadastrado. Clique em "+ Novo produto" para começar.')
        : 'Nenhum item corresponde aos filtros aplicados.'),
  ]);

  var rows=visivel.map(function(p){
    var isChecked=!!_crdSel[p.id];
    var isDisp=p.disponivel!==false;
    var setor=setores.find(function(s){return s.id===p.setorImpressao;});
    var codTxt=p.codigo||(p.id?'#'+p.id.slice(-4).toUpperCase():'—');

    var chk=el('input',{type:'checkbox'});
    chk.checked=isChecked;
    chk.style.cssText='cursor:pointer;width:15px;height:15px;accent-color:var(--gold);';
    chk.onchange=function(){_crdSel[p.id]=this.checked;setState({});};

    var track=el('span',{});
    track.style.cssText='display:inline-flex;align-items:center;width:36px;height:20px;border-radius:10px;background:'
      +(isDisp?'var(--green)':'var(--border)')+';padding:2px;cursor:pointer;transition:background .2s;flex-shrink:0;';
    var thumb=el('span',{});
    thumb.style.cssText='width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);'
      +'transition:transform .2s;transform:translateX('+(isDisp?'16px':'0px')+');';
    track.appendChild(thumb);
    track.onclick=function(e){e.stopPropagation();toggleDisponivel(p);};

    var editB=el('button',{class:'btn-icon edit',title:'Editar'});
    editB.style.opacity='.7';
    editB.textContent='✏️';
    editB.onclick=function(e){e.stopPropagation();
      if(isComp) setState({complementoModal:Object.assign({},p)});
      else setState({produtoModal:Object.assign({},p)});
    };
    var delB=el('button',{class:'btn-icon',title:'Excluir'});
    delB.style.cssText='opacity:.7;color:var(--danger);';
    delB.textContent='🗑';
    delB.onclick=function(e){e.stopPropagation();
      if(!window.confirm('Excluir "'+p.nome+'"?'))return;
      var key=isComp?'complementos':'produtos';
      var arr=(state[key]||[]).filter(function(x){return x.id!==p.id;});
      lsSet(key,arr);
      var patch={};patch[key]=arr;
      setState(patch);
      scheduleSave();
      showToast('Item excluído','error');
    };

    var tr=el('tr',{});
    tr.style.cssText='border-bottom:1px solid var(--border);transition:background .1s;';
    tr.onmouseenter=function(){this.style.background='var(--bg3)';};
    tr.onmouseleave=function(){this.style.background='';};

    function tdCell(style){var c=el('td',{});c.style.cssText='padding:10px 12px;font-size:13px;vertical-align:middle;'+(style||'');return c;}

    // Checkbox
    var td0=tdCell('width:36px;');td0.appendChild(chk);tr.appendChild(td0);
    // Nome
    var td1=tdCell('max-width:200px;');
    var nameDiv=el('div',{style:{fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},p.nome||'');
    td1.appendChild(nameDiv);
    if(!isComp&&setor){
      var setBadge=el('span',{});
      setBadge.style.cssText='font-size:10px;color:'+(setor.cor||'var(--blue)')+';margin-top:2px;display:block;';
      setBadge.textContent='🖨️ '+setor.nome;
      td1.appendChild(setBadge);
    }
    tr.appendChild(td1);
    // COD
    var td2=tdCell('color:var(--text3);font-size:12px;font-family:monospace;width:90px;');
    td2.textContent=codTxt;tr.appendChild(td2);
    // Categoria (só produto)
    if(!isComp){
      var td3=tdCell('width:110px;');
      var catBadge=el('span',{});
      catBadge.style.cssText='font-size:11px;padding:2px 8px;border-radius:8px;background:var(--bg3);color:var(--text2);display:inline-block;white-space:nowrap;';
      catBadge.textContent=p.categoria||'—';
      td3.appendChild(catBadge);tr.appendChild(td3);
    }
    // Estoque
    var td4=tdCell('text-align:right;width:90px;color:var(--text2);');
    td4.textContent=(p.estoqueAtual!==undefined?p.estoqueAtual:(p.estoque||0))+' '+(p.unidade||'un');tr.appendChild(td4);
    // Custo
    var td5=tdCell('text-align:right;width:110px;color:var(--text2);');
    td5.textContent=fmtMoney(p.custoMedio||p.custo||0);tr.appendChild(td5);
    // Venda
    var td6=tdCell('text-align:right;width:110px;font-weight:600;color:var(--gold);');
    td6.textContent=fmtMoney(p.precoVenda||p.preco||0);tr.appendChild(td6);
    // Ativo
    var td7=tdCell('width:70px;text-align:center;');td7.appendChild(track);tr.appendChild(td7);
    // Ações
    var td8=tdCell('width:70px;text-align:right;white-space:nowrap;');
    td8.appendChild(editB);td8.appendChild(delB);tr.appendChild(td8);

    return tr;
  });

  var tbody=el('tbody',{},rows.length?rows:[EMPTY_ROW]);
  var table=el('table',{style:{width:'100%',borderCollapse:'collapse'}});
  table.appendChild(thead);
  table.appendChild(tbody);
  var tableWrap=el('div',{style:{overflowX:'auto'}});
  tableWrap.appendChild(table);

  // ── Rodapé da tabela ─────────────────────────────────────────────────────────
  var selCount=Object.keys(_crdSel).filter(function(k){return _crdSel[k];}).length;
  var footer=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',fontSize:'12px',color:'var(--text3)',borderRadius:'0 0 10px 10px'}},[
    el('span',{},selCount>0?selCount+' selecionado(s) — '+visivel.length+' itens':visivel.length+' de '+todos.length+' item(s) exibido(s)'),
    (visivel.length<todos.length)?el('span',{style:{color:'var(--gold)',fontWeight:'600'}},'⚠ Filtro ativo'):el('span',{},''),
  ]);

  // ── Modais adicionais ────────────────────────────────────────────────────────
  var prodModal  = (state.produtoModal!==null&&state.produtoModal!==undefined&&typeof renderProdutoModal==='function') ? renderProdutoModal() : null;
  var catMgrMod  = state.estCatManager ? renderEstCatManager() : null;
  var unidMgrMod = state.estUnidManager ? renderEstUnidManager() : null;

  var page=el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('h2',{class:'page-title'},'🍽️ Cardápio'),
      el('p',{class:'page-sub'},'Gerencie produtos e complementos do cardápio — '+todos.length+' item(s) cadastrado(s)'),
    ]),
    el('div',{style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'10px',overflow:'visible'}},[
      tabBar,
      toolbar,
      tableWrap,
      footer,
    ]),
  ]);

  var root=el('div',{});
  root.appendChild(page);
  if(compModal)  root.appendChild(compModal);
  if(prodModal)  root.appendChild(prodModal);
  if(catMgrMod)  root.appendChild(catMgrMod);
  if(unidMgrMod) root.appendChild(unidMgrMod);
  return root;
}
