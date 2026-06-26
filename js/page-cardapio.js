// ── CARDÁPIO ──────────────────────────────────────────────────────────────────

var _crdTab      = 'produtos';
var _crdBusca    = '';
var _crdCatFlt   = '';
var _crdSetFlt   = '';
var _crdStsFlt   = '';
var _crdSel      = {};
var _crdCatModal = null; // {id?,nome,imagem} — categoria sendo criada/editada

function renderCardapio() {
  var perfil  = state.profile;
  var cats    = estCats();
  var setores = (state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});
  var isComp  = _crdTab === 'complementos';
  var isCats  = _crdTab === 'categorias';
  var isEmb   = _crdTab === 'embalagens';

  var todosProd = (state.produtos||[]).filter(function(p){
    return p.profile===perfil && p.tipo==='produto';
  });
  var todosComp = (state.complementos||[]).filter(function(c){
    return c.profile===perfil;
  });
  var todos = (isCats||isEmb) ? [] : isComp ? todosComp : todosProd;

  var visivel = todos.filter(function(p){
    var q = _crdBusca.toLowerCase();
    if (q && !(p.nome||'').toLowerCase().includes(q) && !(p.codigo||'').toLowerCase().includes(q)) return false;
    if (!isComp && !isCats && !isEmb && _crdCatFlt && p.categoria !== _crdCatFlt) return false;
    if (!isComp && !isCats && !isEmb && _crdSetFlt && p.setorImpressao !== _crdSetFlt) return false;
    if (_crdStsFlt==='ativo'   && p.disponivel===false) return false;
    if (_crdStsFlt==='inativo' && p.disponivel!==false) return false;
    return true;
  });

  // ── Modal de categoria ───────────────────────────────────────────────────────
  var catModal = null;
  if (_crdCatModal !== null) {
    var cm = _crdCatModal;
    var isEditCat = !!cm.id;
    var previewUrl = cm.imagem || '';

    var nomeInpCat = el('input',{class:'form-input',placeholder:'Ex: Artesanais Clássicos, Bebidas, Porções...',value:cm.nome||'',
      oninput:function(){cm.nome=this.value;}});
    var imgInpCat  = el('input',{class:'form-input',type:'url',placeholder:'https://...',value:cm.imagem||'',
      oninput:function(){
        cm.imagem=this.value;
        previewEl.style.backgroundImage=this.value?'url("'+this.value+'")':"url('')";
        previewEl.innerHTML=this.value?'':'<div style="color:#9ca3af;font-size:28px">🏷️</div>';
      }});

    var previewEl = el('div',{style:{
      width:'100%',height:'120px',borderRadius:'8px',backgroundSize:'cover',backgroundPosition:'center',
      background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',
      border:'1px solid var(--border)',marginTop:'4px',overflow:'hidden'
    }});
    if (previewUrl) {
      previewEl.style.backgroundImage='url("'+previewUrl+'")';
    } else {
      previewEl.innerHTML='<div style="color:#9ca3af;font-size:28px">🏷️</div>';
    }

    function salvarCat() {
      var nome=(cm.nome||'').trim();
      if(!nome){_fldErr(nomeInpCat,'Nome da categoria é obrigatório');showToast('Preencha os campos em vermelho','error');return;}
      var arr=state.estCategorias||[];
      var dup=arr.find(function(c){return c.nome.toLowerCase()===nome.toLowerCase()&&c.id!==cm.id;});
      if(dup){showToast('Já existe uma categoria com este nome','error');return;}
      var item={id:isEditCat?cm.id:('cat_'+Date.now()),nome:nome,imagem:cm.imagem||''};
      var novas=isEditCat
        ?arr.map(function(c){return c.id===item.id?item:c;})
        :arr.concat([item]);
      if(isEditCat){
        // Renomeia nos produtos e montagens
        var novosProds=(state.produtos||[]).map(function(p){return p.categoria===cm._nomeOriginal?Object.assign({},p,{categoria:nome}):p;});
        var novosComps=(state.complementos||[]).map(function(c){return c.categoria===cm._nomeOriginal?Object.assign({},c,{categoria:nome}):c;});
        lsSet('estCategorias',novas);lsSet('produtos',novosProds);lsSet('complementos',novosComps);
        _crdCatModal=null;
        setState({estCategorias:novas,produtos:novosProds,complementos:novosComps});
      } else {
        lsSet('estCategorias',novas);
        _crdCatModal=null;
        setState({estCategorias:novas});
      }
      scheduleSave();
      showToast(isEditCat?'Categoria atualizada!':'Categoria criada!');
    }

    var mEl=el('div',{class:'modal',style:{maxWidth:'480px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEditCat?'✏️ Editar':'➕ Nova')+' categoria'),
        el('button',{class:'modal-close',onclick:function(){_crdCatModal=null;setState({});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        div('form-group',[el('label',{class:'form-label'},'Nome *'),nomeInpCat]),
        div('form-group',[
          el('label',{class:'form-label'},'Imagem de capa (URL)'),
          imgInpCat,
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Cole a URL de uma imagem. Ex: link do Google Fotos, ImgBB, Unsplash...'),
          previewEl,
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){_crdCatModal=null;setState({});}),
        btn('btn-primary',isEditCat?'💾 Salvar':'➕ Criar',salvarCat),
      ]),
    ]);
    var mOv=div('modal-overlay',[mEl]);
    mOv.onclick=function(e){if(e.target===mOv){_crdCatModal=null;setState({});}};
    catModal=mOv;
  }

  // ── Modal complemento ────────────────────────────────────────────────────────
  var compModal = null;
  if (state.complementoModal !== null && state.complementoModal !== undefined) {
    var cmr   = state.complementoModal;
    var isEc  = !!cmr.id;
    function ci(field,type,ph,val){
      return el('input',{class:'form-input',type:type||'text',value:String(val||''),placeholder:ph||'',
        oninput:function(){cmr[field]=type==='number'?parseFloat(this.value)||0:this.value;}});
    }
    var catsSel=el('select',{class:'form-input',onchange:function(){cmr.categoria=this.value;}},
      cats.map(function(c){var o=el('option',{value:c},c);if(c===(cmr.categoria||cats[0]))o.selected=true;return o;}));

    function salvarComp(){
      if(!(cmr.nome||'').trim()){showToast('Informe o nome','error');return;}
      var item={id:isEc?cmr.id:uid(),profile:state.profile,nome:(cmr.nome||'').trim(),
        codigo:cmr.codigo||'',categoria:cmr.categoria||cats[0]||'',
        preco:cmr.preco||0,custo:cmr.custo||0,estoque:cmr.estoque||0,
        disponivel:cmr.disponivel!==false,criadoEm:cmr.criadoEm||today()};
      var arr=isEc
        ?(state.complementos||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.complementos||[]).concat([item]);
      lsSet('complementos',arr);
      logAudit((isEc?'editou':'cadastrou')+' montagem',item.nome);
      setState({complementos:arr,complementoModal:null});
      scheduleSave();
      showToast(isEc?'Montagem atualizada!':'Montagem cadastrada!');
    }

    var mEl2=el('div',{class:'modal',style:{maxWidth:'480px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEc?'✏️ Editar':'➕ Nova')+' Montagem'),
        el('button',{class:'modal-close',onclick:function(){setState({complementoModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},
            div('form-group',[el('label',{class:'form-label'},'Nome *'),ci('nome','text','Ex: Bacon extra, Queijo, Molho especial...',cmr.nome||'')])),
          div('form-group',[el('label',{class:'form-label'},'Código'),ci('codigo','text','EX-001',cmr.codigo||'')]),
          div('form-group',[el('label',{class:'form-label'},'Categoria'),catsSel]),
          div('form-group',[el('label',{class:'form-label'},'Preço de venda (R$)'),ci('preco','number','0,00',cmr.preco||'')]),
          div('form-group',[el('label',{class:'form-label'},'Custo (R$)'),ci('custo','number','0,00',cmr.custo||'')]),
          div('form-group',[el('label',{class:'form-label'},'Estoque'),ci('estoque','number','0',cmr.estoque||'')]),
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({complementoModal:null});}),
        btn('btn-primary',isEc?'💾 Salvar':'➕ Criar',salvarComp),
      ]),
    ]);
    var mOv2=div('modal-overlay',[mEl2]);
    mOv2.onclick=function(e){if(e.target===mOv2)setState({complementoModal:null});};
    compModal=mOv2;
  }

  // ── Helpers de dropdown ──────────────────────────────────────────────────────
  function filterDrop(id, label, value, options, onSelect, onClear) {
    var isOpen = state.crdDropOpen === id;
    var hasVal = !!value;
    var selLabel = hasVal ? (options.find(function(o){return o.v===value;})||{}).l : null;
    var wrap = el('div',{style:{position:'relative',display:'inline-block'}});
    var btnEl = el('button',{});
    btnEl.style.cssText='display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:6px;border:1px solid '
      +(hasVal?'var(--gold)':'var(--border)')+';background:'+(hasVal?'var(--gold-dim)':'var(--bg2)')+';color:'
      +(hasVal?'var(--gold)':'var(--text2)')+';font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;';
    btnEl.appendChild(el('span',{style:{opacity:'.55',fontSize:'11px'}},'⊿'));
    if(hasVal){
      btnEl.appendChild(el('span',{style:{fontWeight:'600'}},selLabel));
      var clrBtn=el('button',{});
      clrBtn.style.cssText='margin-left:2px;padding:0 3px;background:none;border:none;cursor:pointer;color:var(--text3);font-size:15px;line-height:1;';
      clrBtn.textContent='×';
      clrBtn.onclick=function(e){e.stopPropagation();onClear();setState({crdDropOpen:null});};
      btnEl.appendChild(clrBtn);
    } else {
      var lbl=el('span',{});
      lbl.innerHTML='Filtrar: <em style="font-style:normal;opacity:.7">'+label+'</em>';
      btnEl.appendChild(lbl);
      btnEl.appendChild(el('span',{style:{fontSize:'10px',opacity:'.55'}},'▼'));
    }
    btnEl.onclick=function(e){e.stopPropagation();setState({crdDropOpen:isOpen?null:id});};
    wrap.appendChild(btnEl);
    if (isOpen) {
      var panel=el('div',{});
      panel.style.cssText='position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;min-width:200px;z-index:9500;box-shadow:0 4px 16px rgba(0,0,0,.25);overflow:hidden;';
      options.forEach(function(o){
        var row=el('div',{});
        var isAct=value===o.v;
        row.style.cssText='padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;color:'+(isAct?'var(--gold)':'var(--text)')+';background:'+(isAct?'var(--gold-dim)':'transparent')+';';
        row.onmouseenter=function(){if(!isAct)this.style.background='var(--bg3)';};
        row.onmouseleave=function(){if(!isAct)this.style.background='transparent';};
        if(isAct){row.appendChild(el('span',{style:{fontSize:'10px'}},'✓'));}
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

  // ── Ações em massa ────────────────────────────────────────────────────────────
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
        panel.appendChild(el('div',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},'Selecione itens na tabela primeiro.'));
      } else {
        [{l:'✅ Ativar selecionados',fn:function(){ativarSel(true);}},
         {l:'🚫 Desativar selecionados',fn:function(){ativarSel(false);}},
         {l:'🗑 Excluir selecionados',fn:function(){excluirSel();},danger:true}].forEach(function(a){
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
    var arr=(state[key]||[]).map(function(p){return ids.indexOf(p.id)>=0?Object.assign({},p,{disponivel:val}):p;});
    _crdSel={};lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
    showToast((val?'Ativado(s)':'Desativado(s)')+': '+ids.length+' item(s)');
  }
  function excluirSel(){
    var ids=Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    if(!ids.length)return;
    if(!window.confirm('Excluir '+ids.length+' item(s)?'))return;
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).filter(function(p){return ids.indexOf(p.id)<0;});
    _crdSel={};lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
    showToast('Excluído(s): '+ids.length+' item(s)','error');
  }
  function toggleDisponivel(p){
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).map(function(x){return x.id===p.id?Object.assign({},x,{disponivel:p.disponivel===false}):x;});
    lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
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

  var tabBarRight;
  if (isCats) {
    tabBarRight = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}});
    var ncBtn=el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'}});
    ncBtn.textContent='+ Nova categoria';
    ncBtn.onclick=function(){_crdCatModal={nome:'',imagem:''};setState({});};
    tabBarRight.appendChild(ncBtn);
  } else if (isEmb) {
    tabBarRight = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}});
    var embInfoEl=el('span',{style:{fontSize:'11px',color:'var(--text3)'}});
    var embCount=todosProd.filter(function(p){return p.embalagens&&p.embalagens.ativo;}).length;
    embInfoEl.textContent=embCount+' produto(s) configurado(s)';
    tabBarRight.appendChild(embInfoEl);
  } else {
    tabBarRight = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}});
    var addBtn=el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'}});
    addBtn.textContent = isComp ? '+ Nova montagem' : '+ Novo produto';
    addBtn.onclick = function(){
      if(isComp) setState({complementoModal:{}});
      else setState({produtoModal:{tipo:'produto'}});
    };
    tabBarRight.appendChild(addBtn);
  }

  var tabBar=el('div',{style:{display:'flex',alignItems:'stretch',borderBottom:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'10px 10px 0 0',padding:'0 4px',justifyContent:'space-between'}},[
    el('div',{style:{display:'flex'}},[
      tabBtn('produtos','Produtos'),
      tabBtn('complementos','Montagens'),
      tabBtn('categorias','🏷️ Categorias'),
      tabBtn('embalagens','📦 Embalagens'),
    ]),
    tabBarRight,
  ]);

  // ── ABA EMBALAGENS ───────────────────────────────────────────────────────────
  function renderEmbalagemTab() {
    var prods = todosProd.filter(function(p){
      if(_crdBusca) return (p.nome||'').toLowerCase().includes(_crdBusca.toLowerCase());
      return true;
    });
    var insumos=(state.produtos||[]).filter(function(x){return x.tipo==='insumo'&&x.profile===perfil;});

    function renderChannelColumn(ch, label, icon, cor) {
      var prodsConf=prods.filter(function(p){
        return p.embalagens&&p.embalagens.ativo&&p.embalagens[ch]&&p.embalagens[ch].ativo;
      });

      var cards=prodsConf.map(function(p){
        var itens=(p.embalagens[ch].itens||[]).filter(function(i){return i.nome||i.estoqueId;});
        var itemEls=itens.map(function(item){
          var ins=insumos.find(function(x){return x.id===item.estoqueId;});
          var nome=ins?ins.nome:(item.nome||'—');
          var unid=ins?ins.unidade:(item.unidade||'un');
          var row=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:'12px',color:'var(--text2)'}});
          row.appendChild(el('span',{},nome));
          var badge=el('span',{style:{fontWeight:'700',color:cor,background:'rgba(0,0,0,.06)',padding:'2px 8px',borderRadius:'10px',fontSize:'11px'}});
          badge.textContent='× '+item.qtd+' '+unid;
          row.appendChild(badge);
          return row;
        });
        if(!itemEls.length){
          itemEls=[el('div',{style:{fontSize:'11px',color:'var(--text3)',padding:'4px 0'}},'Nenhum insumo configurado.')];
        }
        var configBtn=el('button',{style:{fontSize:'11px',padding:'4px 10px',background:'none',border:'1px solid var(--border)',borderRadius:'5px',cursor:'pointer',color:'var(--text3)',marginTop:'8px'}});
        configBtn.textContent='✏️ Editar produto';
        configBtn.onclick=function(){setState({produtoModal:Object.assign({},p)});};

        var card=el('div',{style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px',marginBottom:'10px'}});
        card.appendChild(el('div',{style:{fontWeight:'700',fontSize:'13px',marginBottom:'8px',color:'var(--text)'}},p.nome));
        itemEls.forEach(function(r){card.appendChild(r);});
        card.appendChild(configBtn);
        return card;
      });

      // Produtos sem config para este canal
      var semConf=prods.filter(function(p){
        return !(p.embalagens&&p.embalagens.ativo&&p.embalagens[ch]&&p.embalagens[ch].ativo);
      });
      var semConfRows=semConf.map(function(p){
        var row=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderBottom:'1px solid var(--border)',fontSize:'12px',color:'var(--text3)'}});
        row.appendChild(el('span',{},p.nome));
        var cfg=el('button',{style:{fontSize:'11px',padding:'3px 8px',background:'none',border:'1px solid var(--border)',borderRadius:'4px',cursor:'pointer',color:'var(--text3)'}});
        cfg.textContent='+ Configurar';
        cfg.onclick=function(){setState({produtoModal:Object.assign({},p)});};
        row.appendChild(cfg);
        return row;
      });

      var col=el('div',{style:{flex:'1',minWidth:'0'}});
      var hdr=el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'14px 16px',background:cor,borderRadius:'8px 8px 0 0'}});
      hdr.appendChild(el('span',{style:{fontSize:'20px'}},icon));
      hdr.appendChild(el('span',{style:{fontWeight:'700',fontSize:'14px',color:'#fff'}},label));
      hdr.appendChild(el('span',{style:{fontSize:'11px',color:'rgba(255,255,255,.8)',marginLeft:'auto'}},(prodsConf.length)+' configurado(s)'));
      col.appendChild(hdr);

      var body=el('div',{style:{border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden'}});
      if(prodsConf.length>0){
        var confArea=el('div',{style:{padding:'14px',background:'var(--bg2)'}});
        cards.forEach(function(c){confArea.appendChild(c);});
        body.appendChild(confArea);
      }
      if(semConf.length>0){
        var semHdr=el('div',{style:{padding:'8px 10px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',background:'var(--bg3)',borderTop:prodsConf.length?'1px solid var(--border)':'none'}});
        semHdr.textContent='Sem embalagem '+(label)+' configurada';
        body.appendChild(semHdr);
        semConfRows.forEach(function(r){body.appendChild(r);});
      }
      if(!prodsConf.length&&!semConf.length){
        body.appendChild(el('div',{style:{padding:'40px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}},'Nenhum produto. Use a busca acima ou cadastre produtos.'));
      }
      col.appendChild(body);
      return col;
    }

    var infoBar=el('div',{style:{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg3)',fontSize:'12px',color:'var(--text3)'}});
    infoBar.textContent='Configure quais insumos de embalagem são baixados automaticamente do estoque ao registrar uma venda. Edite cada produto para ativar.';

    var cols=el('div',{style:{display:'flex',gap:'16px',padding:'16px'}});
    cols.appendChild(renderChannelColumn('delivery','DELIVERY','🛵','#ea580c'));
    cols.appendChild(renderChannelColumn('salao','SALÃO','🍽️','#0284c7'));

    return el('div',{},[infoBar,cols]);
  }

  // ── ABA CATEGORIAS ────────────────────────────────────────────────────────────
  function renderCategoriasTab() {
    var catsData = state.estCategorias || [];
    var todosProdAll = (state.produtos||[]).filter(function(p){return p.profile===perfil;});
    var todosCompAll = (state.complementos||[]).filter(function(c){return c.profile===perfil;});

    // Filtra por busca
    var catsFiltradas = _crdBusca
      ? catsData.filter(function(c){return (c.nome||'').toLowerCase().includes(_crdBusca.toLowerCase());})
      : catsData;

    function moverCat(i, direcao) {
      var novas=catsData.slice();
      var j=i+direcao;
      if(j<0||j>=novas.length)return;
      var tmp=novas[i];novas[i]=novas[j];novas[j]=tmp;
      lsSet('estCategorias',novas);setState({estCategorias:novas});scheduleSave();
    }

    function excluirCat(cat) {
      var nprod=todosProdAll.filter(function(p){return p.categoria===cat.nome;}).length;
      var ncomp=todosCompAll.filter(function(c){return c.categoria===cat.nome;}).length;
      var total=nprod+ncomp;
      if(total>0&&!window.confirm('A categoria "'+cat.nome+'" está em uso por '+total+' item(s). Excluir mesmo assim?'))return;
      var novas=catsData.filter(function(c){return c.id!==cat.id;});
      lsSet('estCategorias',novas);setState({estCategorias:novas});scheduleSave();
      showToast('Categoria removida','error');
    }

    // Grid de cards
    var cards=catsFiltradas.map(function(cat,i){
      var nprod=todosProdAll.filter(function(p){return p.categoria===cat.nome;}).length;
      var ncomp=todosCompAll.filter(function(c){return c.categoria===cat.nome;}).length;
      var total=nprod+ncomp;
      var idxReal=catsData.indexOf(cat); // índice real para reordenação

      var imgEl=el('div',{style:{
        width:'100%',paddingBottom:'56.25%', // 16:9
        position:'relative',overflow:'hidden',
        background:cat.imagem?'#111':'#f3f4f6',
        borderRadius:'8px 8px 0 0',
      }});
      if(cat.imagem){
        imgEl.style.backgroundImage='url("'+cat.imagem+'")';
        imgEl.style.backgroundSize='cover';
        imgEl.style.backgroundPosition='center';
      } else {
        var icon=el('div',{style:{position:'absolute',inset:'0',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'6px'}});
        icon.innerHTML='<div style="font-size:28px;color:#d1d5db">🏷️</div>';
        imgEl.appendChild(icon);
      }

      // Overlay de ações (aparece no hover)
      var overlay=el('div',{style:{
        position:'absolute',inset:'0',background:'rgba(0,0,0,.55)',
        display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
        opacity:'0',transition:'opacity .15s',borderRadius:'8px 8px 0 0',
      }});

      var upBtn=el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px',opacity:idxReal===0?'0.3':'1'}});
      upBtn.textContent='↑';upBtn.title='Mover para cima';
      upBtn.onclick=function(e){e.stopPropagation();moverCat(idxReal,-1);};
      var downBtn=el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px',opacity:idxReal===catsData.length-1?'0.3':'1'}});
      downBtn.textContent='↓';downBtn.title='Mover para baixo';
      downBtn.onclick=function(e){e.stopPropagation();moverCat(idxReal,1);};
      var editBtn=el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px'}});
      editBtn.textContent='✏️';editBtn.title='Editar';
      editBtn.onclick=function(e){e.stopPropagation();_crdCatModal={id:cat.id,nome:cat.nome,imagem:cat.imagem||'',_nomeOriginal:cat.nome};setState({});};
      var delBtn=el('button',{style:{background:'rgba(220,38,38,.5)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px'}});
      delBtn.textContent='🗑';delBtn.title='Excluir';
      delBtn.onclick=function(e){e.stopPropagation();excluirCat(cat);};

      overlay.appendChild(upBtn);overlay.appendChild(downBtn);overlay.appendChild(editBtn);overlay.appendChild(delBtn);
      imgEl.appendChild(overlay);

      var card=el('div',{style:{
        background:'var(--bg2)',borderRadius:'8px',
        border:'1px solid var(--border)',
        boxShadow:'0 1px 4px rgba(0,0,0,.06)',
        cursor:'pointer',transition:'box-shadow .15s, transform .1s',
        userSelect:'none',overflow:'hidden',
      }});
      card.onmouseenter=function(){
        this.style.boxShadow='0 4px 16px rgba(0,0,0,.14)';
        this.style.transform='translateY(-2px)';
        overlay.style.opacity='1';
      };
      card.onmouseleave=function(){
        this.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';
        this.style.transform='';
        overlay.style.opacity='0';
      };
      card.ondblclick=function(){
        _crdCatModal={id:cat.id,nome:cat.nome,imagem:cat.imagem||'',_nomeOriginal:cat.nome};setState({});
      };

      var info=el('div',{style:{padding:'10px 12px',textAlign:'center',background:'var(--bg2)'}});
      var nomeTxt=el('div',{style:{fontWeight:'600',fontSize:'12px',color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},cat.nome);
      var countTxt=el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},
        total>0?(nprod+' prod.'+(ncomp?' · '+ncomp+' mont.':'')):'Sem itens');
      info.appendChild(nomeTxt);
      info.appendChild(countTxt);

      card.appendChild(imgEl);
      card.appendChild(info);
      return card;
    });

    // Card "adicionar"
    var addCard=el('div',{style:{
      background:'var(--bg3)',borderRadius:'8px',
      border:'2px dashed var(--border)',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:'8px',cursor:'pointer',
      minHeight:'150px',transition:'border-color .15s',color:'var(--text3)',
    }});
    addCard.onmouseenter=function(){this.style.borderColor='var(--gold)';this.style.color='var(--gold)';};
    addCard.onmouseleave=function(){this.style.borderColor='var(--border)';this.style.color='var(--text3)';};
    addCard.onclick=function(){_crdCatModal={nome:'',imagem:''};setState({});};
    addCard.innerHTML='<div style="font-size:28px">＋</div><div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Nova categoria</div>';

    var grid=el('div',{style:{
      display:'grid',
      gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',
      gap:'14px',padding:'20px',
    }});
    cards.forEach(function(c){grid.appendChild(c);});
    grid.appendChild(addCard);

    if(catsData.length===0 && !_crdBusca){
      return el('div',{style:{padding:'60px 20px',textAlign:'center',color:'var(--text3)'}},[
        el('div',{style:{fontSize:'48px',marginBottom:'12px'}},'🏷️'),
        el('div',{style:{fontWeight:'700',fontSize:'16px',marginBottom:'6px'}},'Nenhuma categoria ainda'),
        el('div',{style:{fontSize:'13px',marginBottom:'20px'}},'Crie categorias para organizar Produtos e Montagens do cardápio'),
        btn('btn-primary','+ Criar primeira categoria',function(){_crdCatModal={nome:'',imagem:''};setState({});}),
      ]);
    }

    var infoBar=el('div',{style:{
      padding:'10px 20px',borderBottom:'1px solid var(--border)',
      display:'flex',alignItems:'center',justifyContent:'space-between',
      fontSize:'12px',color:'var(--text3)',background:'var(--bg2)',
    }});
    infoBar.appendChild(el('span',{},catsData.length+' categoria(s) — clique e arraste no hover para reordenar, duplo-clique para editar'));
    infoBar.appendChild(el('span',{style:{color:'var(--gold)',fontWeight:'600',cursor:'pointer'},
      onclick:function(){_crdCatModal={nome:'',imagem:''};setState({});}}, '+ Nova'));

    return el('div',{},[infoBar,grid]);
  }

  // ── Toolbar (para Produtos e Montagens) ───────────────────────────────────────
  var searchWrap=el('div',{style:{position:'relative',flex:'1',maxWidth:'380px',minWidth:'180px'}});
  var searchIcon=el('span',{});
  searchIcon.style.cssText='position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;pointer-events:none;';
  searchIcon.textContent='🔍';
  var searchInp=el('input',{class:'form-input',placeholder:isCats?'Pesquisar categorias...':'Pesquisar',value:_crdBusca,
    oninput:function(){_crdBusca=this.value;setState({});},
    style:{paddingLeft:'34px',marginBottom:'0'}});
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInp);

  var catOpts=cats.map(function(c){return {v:c,l:c};});
  var setOpts=setores.map(function(s){return {v:s.id,l:s.nome};});
  var stsOpts=[{v:'ativo',l:'✅ Ativo'},{v:'inativo',l:'❌ Inativo'}];

  var toolbarChildren=[searchWrap];
  if(!isComp&&!isCats&&!isEmb){
    toolbarChildren.push(filterDrop('cat','por categoria',_crdCatFlt,catOpts,function(v){_crdCatFlt=v;},function(){_crdCatFlt='';}));
    toolbarChildren.push(filterDrop('set','por setor de impressão',_crdSetFlt,setOpts,function(v){_crdSetFlt=v;},function(){_crdSetFlt='';}));
  }
  if(!isCats&&!isEmb){
    toolbarChildren.push(filterDrop('sts','por status',_crdStsFlt,stsOpts,function(v){_crdStsFlt=v;},function(){_crdStsFlt='';}));
    toolbarChildren.push(acoesBtn());
  }
  toolbarChildren.push(el('div',{style:{flex:'1'}}));
  if(!isCats&&!isEmb){
    var menuBtn=el('button',{title:'Ir para Setores de Impressão'});
    menuBtn.style.cssText='padding:7px 11px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);font-size:16px;cursor:pointer;line-height:1;';
    menuBtn.textContent='≡';
    menuBtn.onclick=function(){setState({page:'impressoes'});};
    toolbarChildren.push(menuBtn);
  }

  var toolbar=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',flexWrap:'wrap',borderBottom:'1px solid var(--border)',background:'var(--bg2)'}},
    toolbarChildren);

  // ── Tabela (Produtos e Montagens) ─────────────────────────────────────────────
  function renderTabela() {
    var allIds=visivel.map(function(p){return p.id;});
    var allChecked=allIds.length>0&&allIds.every(function(id){return _crdSel[id];});
    var chkAll=el('input',{type:'checkbox'});
    chkAll.checked=allChecked;
    chkAll.style.cssText='cursor:pointer;width:15px;height:15px;accent-color:var(--gold);';
    chkAll.onchange=function(){var v=this.checked;allIds.forEach(function(id){_crdSel[id]=v;});setState({});};

    function thCell(txt,w,align){
      var th=el('th',{});
      th.style.cssText='padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);white-space:nowrap;text-align:'+(align||'left')+';'+(w?'width:'+w+';':'');
      th.textContent=txt;return th;
    }

    var headCells=[
      el('th',{style:{padding:'10px 12px',width:'36px'}},[chkAll]),
      thCell('Nome',''),
      thCell('COD','90px'),
      thCell('Categoria','110px'),
      thCell('Estoque','90px','right'),
      thCell('Custo','110px','right'),
      thCell('Venda','110px','right'),
      thCell('Ativo','70px','center'),
      el('th',{style:{width:'70px'}}),
    ];

    var thead=el('thead',{},[el('tr',{style:{background:'var(--bg3)'}},headCells)]);
    var colCount=headCells.length;

    var EMPTY_ROW=el('tr',{},[
      el('td',{colspan:String(colCount),style:{padding:'48px 20px',textAlign:'center',color:'var(--text3)',fontSize:'14px'}},
        visivel.length===0&&!_crdBusca&&!_crdCatFlt&&!_crdSetFlt&&!_crdStsFlt
          ?(isComp?'Nenhuma montagem cadastrada.':'Nenhum produto cadastrado.')
          :'Nenhum item corresponde aos filtros.'),
    ]);

    var rows=visivel.map(function(p){
      var isChecked=!!_crdSel[p.id];
      var isDisp=p.disponivel!==false;
      var setor=setores.find(function(s){return s.id===p.setorImpressao;});
      var codTxt=p.codigo||(p.id?'#'+p.id.slice(-4).toUpperCase():'—');

      var chk=el('input',{type:'checkbox'});
      chk.checked=isChecked;chk.style.cssText='cursor:pointer;width:15px;height:15px;accent-color:var(--gold);';
      chk.onchange=function(){_crdSel[p.id]=this.checked;setState({});};

      var track=el('span',{});
      track.style.cssText='display:inline-flex;align-items:center;width:36px;height:20px;border-radius:10px;background:'+(isDisp?'var(--green)':'var(--border)')+';padding:2px;cursor:pointer;transition:background .2s;flex-shrink:0;';
      var thumb=el('span',{});
      thumb.style.cssText='width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s;transform:translateX('+(isDisp?'16px':'0px')+');';
      track.appendChild(thumb);
      track.onclick=function(e){e.stopPropagation();toggleDisponivel(p);};

      var editB=el('button',{class:'btn-icon edit',title:'Editar',style:{opacity:'.7'}});
      editB.textContent='✏️';
      editB.onclick=function(e){e.stopPropagation();
        if(isComp) setState({complementoModal:Object.assign({},p)});
        else setState({produtoModal:Object.assign({},p)});
      };
      var delB=el('button',{class:'btn-icon',title:'Excluir',style:{opacity:'.7',color:'var(--danger)'}});
      delB.textContent='🗑';
      delB.onclick=function(e){e.stopPropagation();
        if(!window.confirm('Excluir "'+p.nome+'"?'))return;
        var key=isComp?'complementos':'produtos';
        var arr=(state[key]||[]).filter(function(x){return x.id!==p.id;});
        lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
        showToast('Item excluído','error');
      };

      var tr=el('tr',{});
      tr.style.cssText='border-bottom:1px solid var(--border);transition:background .1s;';
      tr.onmouseenter=function(){this.style.background='var(--bg3)';};
      tr.onmouseleave=function(){this.style.background='';};

      function tdCell(style){var c=el('td',{});c.style.cssText='padding:10px 12px;font-size:13px;vertical-align:middle;'+(style||'');return c;}

      var td0=tdCell('width:36px;');td0.appendChild(chk);tr.appendChild(td0);
      var td1=tdCell('max-width:200px;');
      td1.appendChild(el('div',{style:{fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},p.nome||''));
      if(!isComp&&setor){
        var setBadge=el('span',{style:{fontSize:'10px',color:setor.cor||'var(--blue)',marginTop:'2px',display:'block'}});
        setBadge.textContent='🖨️ '+setor.nome;
        td1.appendChild(setBadge);
      }
      tr.appendChild(td1);
      var td2=tdCell('color:var(--text3);font-size:12px;font-family:monospace;width:90px;');
      td2.textContent=codTxt;tr.appendChild(td2);
      var td3=tdCell('width:110px;');
      var catBadge=el('span',{style:{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'var(--bg3)',color:'var(--text2)',display:'inline-block',whiteSpace:'nowrap'}});
      catBadge.textContent=p.categoria||'—';
      td3.appendChild(catBadge);tr.appendChild(td3);
      var td4=tdCell('text-align:right;width:90px;color:var(--text2);');
      td4.textContent=(p.estoqueAtual!==undefined?p.estoqueAtual:(p.estoque||0))+' '+(p.unidade||'un');tr.appendChild(td4);
      var td5=tdCell('text-align:right;width:110px;color:var(--text2);');
      td5.textContent=fmtMoney(p.custoMedio||p.custo||0);tr.appendChild(td5);
      var td6=tdCell('text-align:right;width:110px;font-weight:600;color:var(--gold);');
      td6.textContent=fmtMoney(p.precoVenda||p.preco||0);tr.appendChild(td6);
      var td7=tdCell('width:70px;text-align:center;');td7.appendChild(track);tr.appendChild(td7);
      var td8=tdCell('width:70px;text-align:right;white-space:nowrap;');
      td8.appendChild(editB);td8.appendChild(delB);tr.appendChild(td8);
      return tr;
    });

    var tbody=el('tbody',{},rows.length?rows:[EMPTY_ROW]);
    var table=el('table',{style:{width:'100%',borderCollapse:'collapse'}});
    table.appendChild(thead);table.appendChild(tbody);
    var tableWrap=el('div',{style:{overflowX:'auto'}});
    tableWrap.appendChild(table);

    var selCount=Object.keys(_crdSel).filter(function(k){return _crdSel[k];}).length;
    var footer=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',fontSize:'12px',color:'var(--text3)',borderRadius:'0 0 10px 10px'}},[
      el('span',{},selCount>0?selCount+' selecionado(s) — '+visivel.length+' itens':visivel.length+' de '+todos.length+' item(s)'),
      (visivel.length<todos.length)?el('span',{style:{color:'var(--gold)',fontWeight:'600'}},'⚠ Filtro ativo'):el('span',{},''),
    ]);
    return el('div',{},[tableWrap,footer]);
  }

  // ── Modais adicionais ────────────────────────────────────────────────────────
  var prodModal  = (state.produtoModal!==null&&state.produtoModal!==undefined&&typeof renderProdutoModal==='function') ? renderProdutoModal() : null;
  var catMgrMod  = state.estCatManager ? renderEstCatManager() : null;
  var unidMgrMod = state.estUnidManager ? renderEstUnidManager() : null;

  var page=el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('h2',{class:'page-title'},'🍽️ Cardápio'),
      el('p',{class:'page-sub'},
        isCats
          ?((state.estCategorias||[]).length+' categorias — organizam Produtos e Montagens')
          :isEmb
          ?'Configure quais insumos são baixados no estoque conforme canal de venda (Delivery / Salão)'
          :'Gerencie produtos e montagens — '+todos.length+' item(s) cadastrado(s)'),
    ]),
    el('div',{style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'10px',overflow:'visible'}},[
      tabBar,
      toolbar,
      isCats ? renderCategoriasTab() : isEmb ? renderEmbalagemTab() : renderTabela(),
    ]),
  ]);

  var root=el('div',{});
  root.appendChild(page);
  if(catModal)   root.appendChild(catModal);
  if(compModal)  root.appendChild(compModal);
  if(prodModal)  root.appendChild(prodModal);
  if(catMgrMod)  root.appendChild(catMgrMod);
  if(unidMgrMod) root.appendChild(unidMgrMod);
  return root;
}
