// ── ESTOQUE & CMV ─────────────────────────────────────────────────────────────
// v1.1.1 — Controle de estoque com CMV, Curva ABC e integração financeira

var EST_CATS_DEFAULT  = ['Proteínas','Pães','Vegetais/Saladas','Laticínios','Bebidas','Embalagens','Temperos/Molhos','Outros'];
var EST_UNIDS_DEFAULT = ['kg','g','un','L','ml','cx','pct','sc'];

function estCats() {
  var cats = state.estCategorias || [];
  return cats.length ? cats.map(function(c){ return c.nome; }) : EST_CATS_DEFAULT;
}
function estUnids() {
  var u = state.estUnidades || [];
  return u.length ? u.map(function(u){ return u.nome; }) : EST_UNIDS_DEFAULT;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function estProdutos() {
  return (state.produtos || []).filter(function(p){ return p.profile === state.profile && p.ativo !== false && p.tipo === 'insumo'; });
}
function estMovs() {
  return (state.movEstoque || []).filter(function(m){ return m.profile === state.profile; });
}
function formatQtd(v, unid) {
  var n = parseFloat(v) || 0;
  var s = n % 1 === 0 ? String(n) : n.toFixed(3).replace(/0+$/,'');
  return s + ' ' + (unid || 'un');
}
function calcCustoMedioNovo(estAtual, custoAtual, qtdNova, custoNovo) {
  if (estAtual <= 0 || custoAtual <= 0) return custoNovo;
  return ((estAtual * custoAtual) + (qtdNova * custoNovo)) / (estAtual + qtdNova);
}
function calcCMVPeriodo(anoMes) {
  return estMovs()
    .filter(function(m){ return m.tipo === 'saida' && m.data && m.data.startsWith(anoMes); })
    .reduce(function(a, m){ return a + ((m.custoUnitario || 0) * (m.quantidade || 0)); }, 0);
}
function calcValorEstoque() {
  return estProdutos().reduce(function(a, p){ return a + ((p.estoqueAtual || 0) * (p.custoMedio || 0)); }, 0);
}
function classeCorABC(c) {
  return c === 'A' ? 'var(--danger)' : c === 'B' ? 'var(--gold)' : 'var(--green)';
}

// ── AUTOCOMPLETE DE FORNECEDOR ────────────────────────────────────────────────

function buildFornecedorCombo(fornecedores, currentId, onChange) {
  var _idx    = -1;
  var _selId  = currentId || '';
  var _aberto = false;

  // Opções: "Nenhum" + fornecedores do perfil
  var OPTS = [{id:'', nome:'— Nenhum —'}].concat(
    fornecedores.filter(function(f){ return f.profile === state.profile; })
  );

  // Valor inicial visível
  var selAtual = OPTS.find(function(o){ return o.id === _selId; });

  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;';

  var inp = document.createElement('input');
  inp.className = 'form-input';
  inp.value     = selAtual && selAtual.id ? selAtual.nome : '';
  inp.placeholder = '🔍 Pesquisar fornecedor...';
  inp.autocomplete = 'off';
  inp.spellcheck  = false;
  inp.style.paddingRight = '28px';

  // Ícone de seta
  var arrow = document.createElement('span');
  arrow.textContent = '▾';
  arrow.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--text3);pointer-events:none;font-size:13px;';

  var drop = document.createElement('div');
  drop.style.cssText = [
    'position:absolute;top:calc(100% + 2px);left:0;right:0;',
    'background:var(--bg2);border:1px solid var(--gold);border-radius:8px;',
    'max-height:220px;overflow-y:auto;z-index:99999;display:none;',
    'box-shadow:0 8px 24px rgba(0,0,0,.5);',
  ].join('');

  function filtradas() {
    var q = inp.value.toLowerCase().trim();
    if (!q || q === (selAtual && selAtual.nome || '').toLowerCase()) return OPTS;
    return OPTS.filter(function(o){ return o.nome.toLowerCase().includes(q); });
  }

  function renderDrop() {
    drop.innerHTML = '';
    var lista = filtradas();
    if (!lista.length) {
      var vazio = document.createElement('div');
      vazio.style.cssText = 'padding:10px 12px;font-size:12px;color:var(--text3);';
      vazio.textContent = 'Nenhum fornecedor encontrado';
      drop.appendChild(vazio);
      return;
    }
    lista.forEach(function(o, i) {
      var item = document.createElement('div');
      var ativo = i === _idx;
      item.style.cssText = [
        'padding:9px 14px;font-size:13px;cursor:pointer;',
        'color:' + (ativo ? 'var(--gold)' : 'var(--text)') + ';',
        'background:' + (ativo ? 'var(--gold-dim)' : 'transparent') + ';',
        'font-weight:' + (ativo ? '700' : '400') + ';',
        'display:flex;align-items:center;gap:8px;',
        i > 0 ? 'border-top:1px solid var(--border);' : '',
      ].join('');
      item.innerHTML = (o.id ? '🏭 ' : '✕ ') + o.nome;
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        selecionar(o);
      });
      item.addEventListener('mouseenter', function() {
        _idx = i;
        renderDrop();
      });
      drop.appendChild(item);
      // Scroll automático no item ativo
      if (ativo) { setTimeout(function(){ item.scrollIntoView({block:'nearest'}); }, 0); }
    });
    drop.style.display = 'block';
  }

  function selecionar(o) {
    _selId    = o.id;
    selAtual  = o;
    inp.value = o.id ? o.nome : '';
    _aberto   = false;
    _idx      = -1;
    drop.style.display = 'none';
    onChange(o.id);
    inp.blur();
  }

  function abrir() {
    _aberto = true;
    _idx    = -1;
    renderDrop();
    // Scroll até o item já selecionado
    var sel = OPTS.findIndex(function(o){ return o.id === _selId; });
    if (sel >= 0) { _idx = sel; renderDrop(); }
  }

  function fechar() {
    _aberto = false;
    drop.style.display = 'none';
    _idx = -1;
    // Restaura o nome se o campo ficou sujo sem selecionar
    inp.value = selAtual && selAtual.id ? selAtual.nome : '';
  }

  inp.addEventListener('focus', function() { inp.select(); abrir(); });
  inp.addEventListener('input', function() { _idx = -1; renderDrop(); });
  inp.addEventListener('blur',  function() { setTimeout(fechar, 160); });

  inp.addEventListener('keydown', function(e) {
    var lista = filtradas();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _idx = Math.min(_idx + 1, lista.length - 1);
      renderDrop();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _idx = Math.max(_idx - 1, 0);
      renderDrop();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_idx >= 0 && lista[_idx]) { selecionar(lista[_idx]); }
      else { fechar(); }
    } else if (e.key === 'Tab') {
      // Tab confirma o item em destaque (se houver) sem bloquear navegação
      if (_idx >= 0 && lista[_idx]) {
        selecionar(lista[_idx]);
      } else {
        fechar();
      }
    } else if (e.key === 'Escape') {
      fechar();
    }
  });

  // Clique na seta abre/fecha
  arrow.addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (_aberto) { fechar(); inp.blur(); } else { inp.focus(); }
  });

  wrap.appendChild(inp);
  wrap.appendChild(arrow);
  wrap.appendChild(drop);
  return wrap;
}

// ── MODAL PRODUTO ─────────────────────────────────────────────────────────────

// ── GERENCIADOR DE CATEGORIAS ─────────────────────────────────────────────────

function renderEstCatManager() {
  if (!state.estCatManager) return null;
  var cats = state.estCategorias || [];

  var newInp = el('input',{class:'form-input',placeholder:'Nova categoria...',style:{flex:'1'}});
  newInp.style.marginBottom='0';

  function addCat() {
    var nome = newInp.value.trim();
    if (!nome) return;
    if (cats.find(function(c){ return c.nome.toLowerCase()===nome.toLowerCase(); })) {
      showToast('Categoria já existe','error'); return;
    }
    var nova = {id:'cat_'+Date.now(), nome:nome};
    var novas = cats.concat([nova]);
    lsSet('estCategorias', novas);
    setState({estCategorias:novas, estCatManager:{open:true}});
    scheduleSave();
    showToast('Categoria adicionada!');
  }
  newInp.onkeydown = function(e){ if(e.key==='Enter'){e.preventDefault();addCat();} };

  var rows = cats.map(function(c,i) {
    var nameEl = el('span',{style:{flex:'1',fontSize:'13px'}},c.nome);
    var inUseCount = (state.produtos||[]).filter(function(p){return p.categoria===c.nome&&p.profile===state.profile;}).length;
    var badge = inUseCount>0 ? el('span',{style:{fontSize:'10px',color:'var(--text3)',background:'var(--bg3)',borderRadius:'8px',padding:'1px 6px'}},inUseCount+' prod.') : null;

    var editBtn = el('button',{class:'btn-icon edit',title:'Editar'});
    editBtn.textContent='✏️';
    editBtn.onclick = function(){
      var novo = window.prompt('Renomear "'+c.nome+'" para:', c.nome);
      if (!novo || !novo.trim() || novo.trim()===c.nome) return;
      var novoNome = novo.trim();
      var novas = cats.map(function(x,j){ return j===i ? Object.assign({},x,{nome:novoNome}) : x; });
      var novosProds = (state.produtos||[]).map(function(p){
        return p.categoria===c.nome ? Object.assign({},p,{categoria:novoNome}) : p;
      });
      lsSet('estCategorias',novas); lsSet('produtos',novosProds);
      setState({estCategorias:novas, produtos:novosProds, estCatManager:{open:true}});
      scheduleSave();
      showToast('Categoria renomeada!');
    };

    var delBtn = el('button',{class:'btn-icon',title:'Excluir',style:{color:'var(--danger)'}});
    delBtn.textContent='🗑';
    delBtn.onclick = function(){
      if (inUseCount>0&&!window.confirm('A categoria "'+c.nome+'" está em uso por '+inUseCount+' produto(s). Excluir mesmo assim?')) return;
      var novas = cats.filter(function(x,j){ return j!==i; });
      lsSet('estCategorias',novas);
      setState({estCategorias:novas, estCatManager:{open:true}});
      scheduleSave();
      showToast('Categoria removida','error');
    };

    var row = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 0',borderBottom:'1px solid var(--border)'}},
      [nameEl,badge,editBtn,delBtn].filter(Boolean));
    return row;
  });

  var addRow = el('div',{style:{display:'flex',gap:'8px',marginTop:'14px',alignItems:'center'}},[
    newInp,
    el('button',{class:'btn-primary',onclick:addCat,style:{flexShrink:'0'}},'＋ Adicionar'),
  ]);

  var modal = el('div',{class:'modal',style:{maxWidth:'420px',zIndex:'100000'}},[
    el('div',{class:'modal-header'},[
      el('h3',{class:'modal-title'},'⚙️ Gerenciar Categorias'),
      el('button',{class:'modal-close',onclick:function(){setState({estCatManager:null});}},'✕'),
    ]),
    el('div',{class:'modal-body'},[
      cats.length===0 ? el('p',{style:{color:'var(--text3)',fontSize:'13px',margin:'0 0 12px'}},'Nenhuma categoria cadastrada ainda.') : null,
      el('div',{},rows),
      addRow,
    ].filter(Boolean)),
    el('div',{class:'modal-footer'},[
      el('button',{class:'btn-primary',onclick:function(){setState({estCatManager:null});}},'Fechar'),
    ]),
  ]);
  var overlay = el('div',{class:'modal-overlay',style:{zIndex:'99999'}});
  overlay.onclick = function(e){ if(e.target===overlay) setState({estCatManager:null}); };
  overlay.appendChild(modal);
  return overlay;
}

// ── GERENCIADOR DE UNIDADES ───────────────────────────────────────────────────

function renderEstUnidManager() {
  if (!state.estUnidManager) return null;
  var unids = state.estUnidades || [];

  var newInp = el('input',{class:'form-input',placeholder:'Nova unidade (ex: dz, L, m²)...',style:{flex:'1','margin-bottom':'0'}});

  function addUnid() {
    var nome = newInp.value.trim();
    if (!nome) return;
    if (unids.find(function(u){ return u.nome.toLowerCase()===nome.toLowerCase(); })) {
      showToast('Unidade já existe','error'); return;
    }
    var nova = {id:'unid_'+Date.now(), nome:nome};
    var novas = unids.concat([nova]);
    lsSet('estUnidades',novas);
    setState({estUnidades:novas, estUnidManager:{open:true}});
    scheduleSave();
    showToast('Unidade adicionada!');
  }
  newInp.onkeydown = function(e){ if(e.key==='Enter'){e.preventDefault();addUnid();} };

  var rows = unids.map(function(u,i) {
    var nameEl = el('span',{style:{flex:'1',fontSize:'13px',fontWeight:'600'}},u.nome);

    var editBtn = el('button',{class:'btn-icon edit'});
    editBtn.textContent='✏️';
    editBtn.onclick = function(){
      var novo = window.prompt('Renomear "'+u.nome+'" para:', u.nome);
      if (!novo || !novo.trim() || novo.trim()===u.nome) return;
      var novoNome = novo.trim();
      var novas = unids.map(function(x,j){ return j===i ? Object.assign({},x,{nome:novoNome}) : x; });
      var novosProds = (state.produtos||[]).map(function(p){
        return p.unidade===u.nome ? Object.assign({},p,{unidade:novoNome}) : p;
      });
      lsSet('estUnidades',novas); lsSet('produtos',novosProds);
      setState({estUnidades:novas,produtos:novosProds,estUnidManager:{open:true}});
      scheduleSave();
      showToast('Unidade renomeada!');
    };

    var delBtn = el('button',{class:'btn-icon',style:{color:'var(--danger)'}});
    delBtn.textContent='🗑';
    delBtn.onclick = function(){
      if (!window.confirm('Excluir unidade "'+u.nome+'"?')) return;
      var novas = unids.filter(function(x,j){ return j!==i; });
      lsSet('estUnidades',novas);
      setState({estUnidades:novas, estUnidManager:{open:true}});
      scheduleSave();
      showToast('Unidade removida','error');
    };

    return el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 0',borderBottom:'1px solid var(--border)'}},[nameEl,editBtn,delBtn]);
  });

  var addRow = el('div',{style:{display:'flex',gap:'8px',marginTop:'14px'}},[
    newInp,
    el('button',{class:'btn-primary',onclick:addUnid,style:{flexShrink:'0'}},'＋ Adicionar'),
  ]);

  var modal = el('div',{class:'modal',style:{maxWidth:'380px',zIndex:'100000'}},[
    el('div',{class:'modal-header'},[
      el('h3',{class:'modal-title'},'⚙️ Gerenciar Unidades de Medida'),
      el('button',{class:'modal-close',onclick:function(){setState({estUnidManager:null});}},'✕'),
    ]),
    el('div',{class:'modal-body'},[
      unids.length===0 ? el('p',{style:{color:'var(--text3)',fontSize:'13px',margin:'0 0 12px'}},'Usando as unidades padrão do sistema. Adicione para personalizar.') : null,
      el('div',{},rows),
      addRow,
    ].filter(Boolean)),
    el('div',{class:'modal-footer'},[
      el('button',{class:'btn-primary',onclick:function(){setState({estUnidManager:null});}},'Fechar'),
    ]),
  ]);
  var overlay = el('div',{class:'modal-overlay',style:{zIndex:'99999'}});
  overlay.onclick = function(e){ if(e.target===overlay) setState({estUnidManager:null}); };
  overlay.appendChild(modal);
  return overlay;
}

function renderProdutoModal() {
  var p = state.produtoModal || {};
  var isEdit = !!p.id;
  function fld(lbl, inp) { return el('div',{class:'form-group'},[el('label',{class:'form-label'},lbl),inp]); }

  // ── TIPO (obrigatório) ────────────────────────────────────────────────────
  function tipoBtn(id, icon, label, desc) {
    var ativo = p.tipo === id;
    var b = el('button',{});
    b.style.cssText = 'flex:1;padding:14px 10px;border-radius:10px;border:2px solid '
      +(ativo?'var(--gold)':'var(--border)')+';background:'
      +(ativo?'var(--gold-dim)':'var(--bg3)')+';color:'
      +(ativo?'var(--gold)':'var(--text3)')+';font-family:inherit;'
      +'cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;transition:all .15s;';
    var iconEl = el('span',{style:{fontSize:'28px'}},icon);
    var lblEl  = el('span',{style:{fontSize:'13px',fontWeight:'700'}},label);
    var dscEl  = el('span',{style:{fontSize:'10px',opacity:'.8'}},desc);
    b.appendChild(iconEl); b.appendChild(lblEl); b.appendChild(dscEl);
    b.onclick = function(e){
      e.preventDefault();
      setState({produtoModal:Object.assign({},state.produtoModal,{tipo:id})});
    };
    return b;
  }

  // ── CATEGORIA + criar inline ───────────────────────────────────────────────
  var cats = estCats();
  var catSel = el('select',{class:'form-input',onchange:function(){p.categoria=this.value;}},
    cats.map(function(c){return el('option',{value:c,selected:(p.categoria||cats[0])===c},c);}));

  // Área de nova categoria inline (sem abrir outro modal)
  var novaCatInp = el('input',{class:'form-input',placeholder:'Nome da nova categoria...',style:{flex:'1',fontSize:'12px'}});
  var novaCatWrap = el('div',{style:{display:'none',gap:'6px',alignItems:'center',marginTop:'6px'}});
  function _adicionarCatInline(){
    var nome=(novaCatInp.value||'').trim();
    if(!nome){novaCatInp.style.borderColor='var(--red)';return;}
    novaCatInp.style.borderColor='';
    var arr=(state.estCategorias||[]).filter(function(c){return typeof c!=='string'&&c&&c.nome;});
    if(arr.find(function(c){return c.nome.toLowerCase()===nome.toLowerCase();})){showToast('Categoria já existe','error');return;}
    var nova={id:'cat_'+Date.now(),nome:nome};
    var novas=arr.concat([nova]);
    // Salva SEM re-render para não perder o formulário
    lsSet('estCategorias',novas);
    state.estCategorias=novas;
    // Adiciona opção diretamente no <select> e seleciona
    var opt=document.createElement('option');
    opt.value=nome;opt.textContent=nome;opt.selected=true;
    catSel.appendChild(opt);
    catSel.value=nome;
    p.categoria=nome;
    // Limpa e fecha o campo inline
    novaCatInp.value='';
    novaCatWrap.style.display='none';
    scheduleSave();
    showToast('Categoria "'+nome+'" criada!','success');
  }
  novaCatInp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();_adicionarCatInline();}};
  var novaCatAddBtn=el('button',{class:'btn-primary',style:{padding:'7px 12px',fontSize:'12px',flexShrink:'0'},onclick:function(e){e.preventDefault();_adicionarCatInline();}},'＋ Adicionar');
  var novaCatCancelBtn=el('button',{class:'btn-ghost',style:{padding:'7px 10px',fontSize:'12px',flexShrink:'0'},onclick:function(e){e.preventDefault();novaCatWrap.style.display='none';}},'✕');
  novaCatWrap.appendChild(novaCatInp);novaCatWrap.appendChild(novaCatAddBtn);novaCatWrap.appendChild(novaCatCancelBtn);

  var catRow = el('div',{style:{gridColumn:'1/-1'}},[
    el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end'}},[
      el('div',{style:{flex:'1'}},[el('label',{class:'form-label'},'Categoria'),catSel]),
      el('button',{class:'btn-ghost',style:{padding:'8px 10px',fontSize:'11px',flexShrink:'0',whiteSpace:'nowrap'},
        onclick:function(e){e.preventDefault();novaCatWrap.style.display=novaCatWrap.style.display==='none'?'flex':'none';if(novaCatWrap.style.display==='flex')novaCatInp.focus();}}, '＋ Nova categoria'),
    ]),
    novaCatWrap,
  ]);

  // ── UNIDADE + gerenciar ────────────────────────────────────────────────────
  var unids = estUnids();
  var unidSel = el('select',{class:'form-input',onchange:function(){p.unidade=this.value;}},
    unids.map(function(u){return el('option',{value:u,selected:(p.unidade||'un')===u},u);}));
  var unidRow = el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end'}},[
    el('div',{style:{flex:'1'}},[el('label',{class:'form-label'},'Unidade de medida'),unidSel]),
    el('button',{class:'btn-ghost',style:{padding:'8px 10px',fontSize:'11px',flexShrink:'0',whiteSpace:'nowrap'},
      onclick:function(e){e.preventDefault();setState({estUnidManager:{open:true}});}}, '⚙️ Gerenciar'),
  ]);

  // ── CAMPOS BÁSICOS ─────────────────────────────────────────────────────────
  var nomeInp  = el('input',{class:'form-input',value:p.nome||'',placeholder:'Ex: Carne, Bacon, Pão brioche...',oninput:function(){p.nome=this.value;}});
  var custoInp = el('input',{class:'form-input',type:'number',min:'0',step:'0.0001',value:p.custoMedio||'',placeholder:'0,0000',oninput:function(){p.custoMedio=parseFloat(this.value)||0;}});

  function _recalcCustoEmb(){
    var preco=p.precoEmbalagem||0;
    if(preco>0){
      // custoMedio = preço por embalagem (a unidade de rastreio é a embalagem)
      // qtdPorEmbalagem é apenas para referência do custo por unidade interna
      p.custoMedio=preco;
      custoInp.value=String(preco);
    }
  }
  var qtdPorEmbInp=el('input',{class:'form-input',type:'number',min:'1',step:'0.001',
    value:p.qtdPorEmbalagem||'',placeholder:'Ex: 36',
    oninput:function(){p.qtdPorEmbalagem=parseFloat(this.value)||0;_recalcCustoEmb();}});
  var precoEmbInp=el('input',{class:'form-input',type:'number',min:'0',step:'0.01',
    value:p.precoEmbalagem||'',placeholder:'R$ 0,00',
    oninput:function(){p.precoEmbalagem=parseFloat(this.value)||0;_recalcCustoEmb();}});

  var vendaInp = el('input',{class:'form-input',type:'number',min:'0',step:'0.01',value:p.precoVenda||'',placeholder:'0,00',oninput:function(){p.precoVenda=parseFloat(this.value)||0;}});
  var estAInp  = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:p.estoqueAtual||'',placeholder:'0',oninput:function(){p.estoqueAtual=parseFloat(this.value)||0;}});
  var estMInp  = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:p.estoqueMinimo||'',placeholder:'0',oninput:function(){p.estoqueMinimo=parseFloat(this.value)||0;}});
  var _fornsModal=(state.fornecedores||[]).filter(function(f){return f.profile===state.profile;});
  var fornSel=el('select',{class:'form-input',onchange:function(){p.fornecedor_id=this.value;}},
    [{id:'',nome:'— Nenhum —'}].concat(_fornsModal).map(function(f){
      return el('option',{value:f.id,selected:(p.fornecedor_id||'')===f.id},f.nome);
    })
  );
  var obsInp    = el('input',{class:'form-input',value:p.obs||'',placeholder:'Observações...',oninput:function(){p.obs=this.value;}});

  // SKU com botão auto-gerar
  var skuWrap = el('div',{style:{display:'flex',gap:'6px'}});
  var skuInp = el('input',{class:'form-input',value:p.sku||'',placeholder:'Ex: SKU-0001',oninput:function(){p.sku=this.value;}});
  var skuAutoBtn = el('button',{class:'btn-ghost',style:{padding:'6px 10px',fontSize:'11px',flexShrink:'0',whiteSpace:'nowrap'}});
  skuAutoBtn.textContent = '⚡ Gerar';
  skuAutoBtn.onclick = function(e){
    e.preventDefault();
    var prefixo = (p.tipo==='insumo'?'INS':'SKU');
    var num = String(Math.floor(Math.random()*9000)+1000);
    skuInp.value = prefixo+'-'+num;
    p.sku = skuInp.value;
  };
  skuWrap.appendChild(skuInp);
  skuWrap.appendChild(skuAutoBtn);

  // Estoque máximo
  var estMaxInp = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:p.estoqueMaximo||'',placeholder:'0',oninput:function(){p.estoqueMaximo=parseFloat(this.value)||0;}});

  // Dias de aviso de vencimento
  var diasAvisoInp = el('input',{class:'form-input',type:'number',min:'1',step:'1',value:p.diasAvisoVencimento||'',placeholder:'Ex: 7',oninput:function(){p.diasAvisoVencimento=parseInt(this.value)||0;}});

  // Flag: produto tem controle de vencimento
  var ctrlVencCb = el('input',{type:'checkbox',id:'_ctrlVenc'});
  if(p.controleVencimento) ctrlVencCb.checked = true;
  ctrlVencCb.onchange = function(){p.controleVencimento=this.checked;setState({produtoModal:Object.assign({},state.produtoModal,{controleVencimento:this.checked})});};
  var ctrlVencEl = el('div',{style:{display:'flex',gap:'8px',alignItems:'center',padding:'6px 0'}},[
    ctrlVencCb,
    el('label',{for:'_ctrlVenc',style:{fontSize:'12px',color:'var(--text2)',cursor:'pointer'}},'📅 Controlar data de vencimento por lote')
  ]);

  // ── SEÇÃO CARDÁPIO (só para produto) ──────────────────────────────────────
  var setores = state.setoresImpressao || [];
  var setorSel = el('select',{class:'form-input',onchange:function(){p.setorImpressao=this.value;}},
    [el('option',{value:''},'— Nenhum —')].concat(
      setores.map(function(s){return el('option',{value:s.id,selected:p.setorImpressao===s.id},s.nome);})));
  var descCardInp = el('textarea',{class:'form-input',rows:'2',placeholder:'Descrição visível no cardápio...',style:{resize:'vertical'},oninput:function(){p.descricaoCard=this.value;}},p.descricaoCard||'');
  var imgInp = el('input',{class:'form-input',type:'url',placeholder:'https://... URL da foto do item',value:p.imagemUrl||'',oninput:function(){p.imagemUrl=this.value;}});

  // ── INFORMAÇÕES FISCAIS ────────────────────────────────────────────────────
  var ORIGEM_OPTS=[
    {v:'0',l:'0 – Nacional'},
    {v:'1',l:'1 – Estrangeira (importação direta)'},
    {v:'2',l:'2 – Estrangeira (mercado interno)'},
    {v:'3',l:'3 – Nacional, conteúdo > 40% importado'},
    {v:'4',l:'4 – Nacional (prod. básicos)'},
    {v:'5',l:'5 – Nacional, conteúdo < 40% importado'},
    {v:'6',l:'6 – Estrangeira (imp. direta), sem similar'},
    {v:'7',l:'7 – Estrangeira (merc. interno), sem similar'},
    {v:'8',l:'8 – Nacional, conteúdo > 70%'},
  ];
  var origemSel = el('select',{class:'form-input',onchange:function(){p.origemMerc=this.value;}},
    ORIGEM_OPTS.map(function(o){return el('option',{value:o.v,selected:(p.origemMerc||'0')===o.v},o.l);}));

  function ftxt(field,ph,val){
    var i=el('input',{class:'form-input',type:'text',value:val||'',placeholder:ph||'',oninput:function(){p[field]=this.value;}});
    return i;
  }
  function fnum(field,val){
    var i=el('input',{class:'form-input',type:'number',min:'0',step:'0.01',value:val||'',placeholder:'0',oninput:function(){p[field]=parseFloat(this.value)||0;}});
    return i;
  }

  // ── ERRO + SALVAR ──────────────────────────────────────────────────────────
  var errEl = el('div',{style:{color:'var(--danger)',fontSize:'12px',minHeight:'18px',marginTop:'4px'}});

  function secHead(icon,txt) {
    var d=el('div',{});
    d.style.cssText='font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);padding:14px 0 8px;border-top:1px solid var(--border);margin-top:4px;';
    d.textContent=icon+' '+txt;
    return d;
  }

  function buildEmbSection() {
    if(!p.embalagens) p.embalagens={ativo:false,delivery:{ativo:false,itens:[]},salao:{ativo:false,itens:[]}};
    var emb=p.embalagens;
    emb.delivery=emb.delivery||{ativo:false,itens:[]};
    emb.salao   =emb.salao   ||{ativo:false,itens:[]};
    emb.delivery.itens=emb.delivery.itens||[];
    emb.salao.itens   =emb.salao.itens   ||[];
    var insumos=(state.estoqueItens||[]).filter(function(x){return x.profile===state.profile;})
      .concat((state.produtos||[]).filter(function(x){return x.tipo==='insumo'&&x.profile===state.profile;}));
    function refresh(){setState({produtoModal:Object.assign({},p)});}

    function buildChannel(ch,label,icon){
      var chData=emb[ch];
      var tog=el('div',{style:{display:'inline-flex',alignItems:'center',width:'32px',height:'18px',borderRadius:'9px',background:chData.ativo?'var(--green)':'var(--border)',padding:'2px',cursor:'pointer',transition:'background .2s',flexShrink:'0'}});
      var thumb=el('div',{style:{width:'14px',height:'14px',borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.3)',transition:'transform .2s',transform:'translateX('+(chData.ativo?'14px':'0px')+')'}});
      tog.appendChild(thumb);
      tog.onclick=function(){chData.ativo=!chData.ativo;refresh();};
      var hdrRow=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px',paddingBottom:'8px',borderBottom:'1px solid var(--border)'}});
      hdrRow.appendChild(tog);
      hdrRow.appendChild(el('span',{style:{fontWeight:'700',fontSize:'12px',color:chData.ativo?'var(--text)':'var(--text3)'}},(icon+' '+label+(chData.ativo?'':' — desativado'))));
      var box=el('div',{style:{background:'var(--bg3)',borderRadius:'8px',padding:'10px 12px'}});
      box.appendChild(hdrRow);
      if(chData.ativo){
        if(insumos.length===0){
          box.appendChild(el('div',{style:{fontSize:'12px',color:'var(--text3)',padding:'4px 0'}},'Nenhum insumo cadastrado. Crie insumos na aba Estoque.'));
        } else {
          chData.itens.forEach(function(item,i){
            var insSel=el('select',{class:'form-input',style:{flex:'1',fontSize:'12px'}},
              [el('option',{value:''},'— Insumo —')].concat(
                insumos.map(function(ins){
                  var o=el('option',{value:ins.id},ins.nome+(ins.unidade?' ('+ins.unidade+')':''));
                  if(item.estoqueId===ins.id)o.selected=true;
                  return o;
                })
              )
            );
            insSel.onchange=function(){
              var ins=insumos.find(function(x){return x.id===insSel.value;});
              item.estoqueId=insSel.value;
              item.nome=ins?ins.nome:'';
              item.unidade=ins?ins.unidade:'un';
            };
            var qtdInp=el('input',{class:'form-input',type:'number',min:'0.001',step:'0.001',
              value:String(item.qtd||1),placeholder:'Qtd',style:{width:'72px',fontSize:'12px'},
              oninput:function(){item.qtd=parseFloat(this.value)||1;}});
            var delBtn=el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'18px',padding:'0 4px',lineHeight:'1',flexShrink:'0'}});
            delBtn.textContent='×';
            delBtn.onclick=function(e){e.preventDefault();chData.itens.splice(i,1);refresh();};
            var row=el('div',{style:{display:'flex',gap:'6px',alignItems:'center',marginBottom:'6px'}});
            row.appendChild(insSel);row.appendChild(qtdInp);row.appendChild(delBtn);
            box.appendChild(row);
          });
          var addBtn=el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'4px 10px',marginTop:'2px'}});
          addBtn.textContent='+ Adicionar insumo';
          addBtn.onclick=function(e){e.preventDefault();chData.itens.push({estoqueId:'',nome:'',qtd:1,unidade:'un'});refresh();};
          box.appendChild(addBtn);
        }
      }
      return box;
    }

    var masterTrack=el('div',{style:{display:'inline-flex',alignItems:'center',width:'32px',height:'18px',borderRadius:'9px',background:emb.ativo?'var(--green)':'var(--border)',padding:'2px',cursor:'pointer',transition:'background .2s',flexShrink:'0'}});
    var masterThumb=el('div',{style:{width:'14px',height:'14px',borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.3)',transition:'transform .2s',transform:'translateX('+(emb.ativo?'14px':'0px')+')'}});
    masterTrack.appendChild(masterThumb);
    masterTrack.onclick=function(){emb.ativo=!emb.ativo;refresh();};
    var masterRow=el('div',{style:{display:'flex',alignItems:'center',gap:'10px',marginBottom:emb.ativo?'12px':'0'}});
    masterRow.appendChild(masterTrack);
    masterRow.appendChild(el('span',{style:{fontSize:'13px',fontWeight:'600'}},'Saídas automáticas de embalagem'));
    masterRow.appendChild(el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'(baixa de insumos ao registrar venda)'));

    var wrap=el('div',{});
    wrap.appendChild(secHead('📦','Embalagens / Saídas automáticas'));
    wrap.appendChild(masterRow);
    if(emb.ativo){
      var grid=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginTop:'12px'}});
      var delCol=el('div',{});
      delCol.appendChild(el('div',{style:{fontWeight:'700',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'8px'}},'🛵 Delivery'));
      delCol.appendChild(buildChannel('delivery','DELIVERY','🛵'));
      var salCol=el('div',{});
      salCol.appendChild(el('div',{style:{fontWeight:'700',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'8px'}},'🍽️ Salão'));
      salCol.appendChild(buildChannel('salao','SALÃO','🍽️'));
      grid.appendChild(delCol);grid.appendChild(salCol);
      wrap.appendChild(grid);
    }
    return wrap;
  }

  function salvar() {
    if (!p.tipo) { errEl.textContent='⚠️ Selecione o tipo: Produto ou Insumo.'; return; }
    if (!(p.nome||'').trim()) { errEl.textContent='Informe o nome.'; return; }
    var catVal  = catSel.value || cats[0] || '';
    var unidVal = unidSel.value || 'un';
    var prod = {
      id:p.id||uid(), profile:state.profile,
      tipo:p.tipo,
      nome:(p.nome||'').trim(),
      categoria:catVal, unidade:unidVal,
      custoMedio:p.custoMedio||0, precoVenda:p.precoVenda||0,
      qtdPorEmbalagem:p.qtdPorEmbalagem||0, precoEmbalagem:p.precoEmbalagem||0,
      estoqueAtual:p.estoqueAtual||0, estoqueMinimo:p.estoqueMinimo||0,
      sku: (p.sku||'').trim(),
      estoqueMaximo: p.estoqueMaximo||0,
      controleVencimento: !!p.controleVencimento,
      diasAvisoVencimento: p.diasAvisoVencimento||7,
      fornecedor_id:p.fornecedor_id||'', obs:p.obs||'',
      // Cardápio
      setorImpressao:p.setorImpressao||'',
      descricaoCard:p.descricaoCard||'',
      imagemUrl:p.imagemUrl||'',
      disponivel:p.disponivel!==false,
      // Fiscal
      ncm:p.ncm||'', cest:p.cest||'', cfop:p.cfop||'',
      csosn:p.csosn||'', cst:p.cst||'', origemMerc:origemSel.value||'0',
      aliqIcms:p.aliqIcms||0, aliqIpi:p.aliqIpi||0,
      aliqPis:p.aliqPis||0, aliqCofins:p.aliqCofins||0,
      unidTrib:p.unidTrib||'',
      ativo:true, criadoEm:p.criadoEm||today(),
      embalagens: p.embalagens||null,
    };
    var novos = isEdit
      ? state.produtos.map(function(x){return x.id===prod.id?prod:x;})
      : (state.produtos||[]).concat([prod]);
    logAudit((isEdit?'editou':'cadastrou')+' '+prod.tipo, prod.nome);
    setState({produtos:novos, produtoModal:null});
    scheduleSave();
    showToast(isEdit?'Produto atualizado!':'Produto cadastrado!','success');
  }

  // ── LAYOUT ────────────────────────────────────────────────────────────────
  return el('div',{class:'modal-overlay'},
    el('div',{class:'modal',style:{maxWidth:'600px',maxHeight:'90vh',overflowY:'auto'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEdit?'✏️ Editar':'➕ Novo')+' Produto / Insumo'),
        el('button',{class:'modal-close',onclick:function(){setState({produtoModal:null});}}, '✕'),
      ]),
      el('div',{class:'modal-body'},[

        // TIPO — OBRIGATÓRIO
        el('div',{style:{marginBottom:'18px'}},[
          el('div',{style:{fontWeight:'700',fontSize:'12px',color:'var(--gold)',marginBottom:'10px',display:'flex',alignItems:'center',gap:'6px'}},[
            el('span',{},'⭐ Tipo (obrigatório)'),
            !p.tipo?el('span',{style:{fontSize:'11px',color:'var(--danger)',fontWeight:'400'}},'— selecione para continuar'):null,
          ].filter(Boolean)),
          el('div',{style:{display:'flex',gap:'10px'}},[
            tipoBtn('produto','🍔','Produto','aparece no cardápio'),
            tipoBtn('insumo','⚙️','Insumo','matéria-prima / estoque'),
          ]),
        ]),

        // IDENTIFICAÇÃO
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},fld('SKU',skuWrap)),
          el('div',{style:{gridColumn:'1/-1'}},fld('Nome *',nomeInp)),
          el('div',{style:{gridColumn:'1/-1'}},catRow),
          el('div',{style:{gridColumn:'1/-1'}},unidRow),

          // Seção embalagem — só para insumo
          p.tipo==='insumo' ? el('div',{style:{gridColumn:'1/-1',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'8px',padding:'12px'}},[
            el('div',{style:{fontSize:'11px',fontWeight:'700',color:'var(--gold)',marginBottom:'10px'}},'📦 Embalagem / Cálculo de custo'),
            el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}},[
              el('div',{class:'form-group',style:{margin:'0'}},[
                el('label',{class:'form-label'},'Unid. por embalagem'),
                qtdPorEmbInp,
                el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}},'Ex: 36 unidades por caixa'),
              ]),
              el('div',{class:'form-group',style:{margin:'0'}},[
                el('label',{class:'form-label'},'Preço da embalagem (R$)'),
                precoEmbInp,
                el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}},'Valor pago pela caixa/fardo/etc.'),
              ]),
            ]),
            (p.precoEmbalagem>0) ? el('div',{style:{marginTop:'8px',padding:'8px',background:'var(--bg2)',borderRadius:'6px',fontSize:'12px',color:'var(--green)',fontWeight:'700',display:'flex',gap:'16px',flexWrap:'wrap'}},[
              el('span',{},'✅ Custo por '+( unidSel.value||'cx')+': '+fmtMoney(p.precoEmbalagem)),
              (p.qtdPorEmbalagem>0) ? el('span',{style:{color:'var(--text3)',fontWeight:'400'}},'→ R$ '+(p.precoEmbalagem/p.qtdPorEmbalagem).toFixed(4)+'/un interno (informativo)') : null,
            ].filter(Boolean)) : el('div',{style:{marginTop:'6px',fontSize:'11px',color:'var(--text3)'}},'Preencha o preço da embalagem para calcular o custo automaticamente.'),
          ]) : null,

          fld('Custo médio (R$)',custoInp),
          p.tipo==='insumo' ? null : fld('Preço de venda (R$)',vendaInp),
          fld('Estoque atual',estAInp),
          fld('Estoque mínimo (alerta)',estMInp),
          fld('Estoque máximo',estMaxInp),
          el('div',{style:{gridColumn:'1/-1'}},ctrlVencEl),
          p.controleVencimento ? el('div',{style:{gridColumn:'1/-1'}},fld('Aviso de vencimento (dias antes)',diasAvisoInp)) : null,
          el('div',{style:{gridColumn:'1/-1'}},fld('Fornecedor principal',fornSel)),
        ].filter(Boolean)),

        // CARDÁPIO (só produto)
        p.tipo==='produto' ? el('div',{},[
          secHead('🍽️','Cardápio / Impressão'),
          el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
            el('div',{style:{gridColumn:'1/-1'}},fld('Setor de impressão',setorSel)),
            el('div',{style:{gridColumn:'1/-1'}},fld('Descrição no cardápio (opcional)',descCardInp)),
            el('div',{style:{gridColumn:'1/-1'}},fld('URL da imagem (opcional)',imgInp)),
          ]),
        ]) : null,

        // EMBALAGENS (só produto)
        p.tipo==='produto' ? buildEmbSection() : null,

        // FISCAL
        secHead('🧾','Informações Fiscais'),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          fld('NCM (8 dígitos)',ftxt('ncm','0000.00.00',p.ncm||'')),
          fld('CEST (7 dígitos, se aplicável)',ftxt('cest','0000000',p.cest||'')),
          fld('CFOP',ftxt('cfop','0000',p.cfop||'')),
          fld('CSOSN (Simples) ou CST',ftxt('csosn','000 / 00',p.csosn||p.cst||'')),
          el('div',{style:{gridColumn:'1/-1'}},fld('Origem da mercadoria',origemSel)),
          fld('Alíq. ICMS (%)',fnum('aliqIcms',p.aliqIcms||'')),
          fld('Alíq. IPI (%)',fnum('aliqIpi',p.aliqIpi||'')),
          fld('PIS (%)',fnum('aliqPis',p.aliqPis||'')),
          fld('COFINS (%)',fnum('aliqCofins',p.aliqCofins||'')),
          fld('Unidade tributável (se ≠ comercial)',ftxt('unidTrib','kg, L, un...',p.unidTrib||'')),
        ]),

        // OBS
        el('div',{style:{marginTop:'12px'}},fld('Observações',obsInp)),
        errEl,
      ].filter(Boolean)),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({produtoModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'✅ Criar',salvar),
      ]),
    ])
  );
}

// ── MODAL MOVIMENTAÇÃO ────────────────────────────────────────────────────────

function renderMovModal() {
  var m    = state.movModal || {};
  var tipo = m.tipo || 'entrada';
  var prods = estProdutos();
  var errEl = el('div',{style:{color:'var(--danger)',fontSize:'12px',minHeight:'16px'}});

  var motivosMap = {
    entrada:['Compra','Devolução de cliente','Ajuste de inventário','Doação/Brinde'],
    saida:  ['Consumo/Venda','Perda/Vencimento','Ajuste de inventário','Devolução a fornecedor'],
    ajuste: ['Contagem de inventário','Correção manual'],
  };
  var motivos = motivosMap[tipo] || motivosMap.entrada;

  var tipoSel = el('select',{class:'form-input',onchange:function(){
    setState({movModal:Object.assign({},m,{tipo:this.value,motivo:null})});
  }},
    [{v:'entrada',l:'📥 Entrada (compra / recebimento)'},
     {v:'saida',  l:'📤 Saída (consumo / venda / perda)'},
     {v:'ajuste', l:'🔧 Ajuste de inventário'},
    ].map(function(x){return el('option',{value:x.v},x.l);}));
  tipoSel.value = tipo;

  var prodAtual = prods.find(function(p){return p.id===m.produto_id;});

  var _insOpts = prods.filter(function(p){return p.tipo==='insumo';}).map(function(p){
    return el('option',{value:p.id},'⚙️ '+p.nome+' ('+formatQtd(p.estoqueAtual,p.unidade)+')');
  });
  var _prdOpts = prods.filter(function(p){return p.tipo!=='insumo';}).map(function(p){
    return el('option',{value:p.id},'🍔 '+p.nome+' ('+formatQtd(p.estoqueAtual,p.unidade)+')');
  });
  function _custoParaProd(prd) {
    if(!prd) return 0;
    if(prd.custoMedio>0) return prd.custoMedio;
    if(prd.precoEmbalagem>0) return prd.precoEmbalagem;
    return 0;
  }
  var prodSel = el('select',{class:'form-input',onchange:function(){
    var selVal = this.value;
    var prd = prods.find(function(p){return p.id===selVal;});
    var novoCusto = (prd && tipo!=='saida') ? _custoParaProd(prd) : m.custoUnitario;
    setState({movModal:Object.assign({},m,{produto_id:selVal,custoUnitario:novoCusto,qtdEmb:'',unidPorEmb:''})});
  }},
    [el('option',{value:''},'— Selecione o produto / insumo —')].concat(_insOpts).concat(_prdOpts));
  prodSel.value = m.produto_id || '';

  var qtdInp = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:m.quantidade||'',
    placeholder:tipo==='ajuste'?'Novo estoque total':'Quantidade',oninput:function(){m.quantidade=parseFloat(this.value)||0;}});
  var qtdEmbInp = tipo==='entrada' ? el('input',{class:'form-input',type:'number',min:'1',step:'1',
    value:m.qtdEmb||'',placeholder:'Ex: 3 (caixas, fardos...)',
    oninput:function(){m.qtdEmb=parseInt(this.value)||0;if(m.qtdEmb>0&&m.unidPorEmb>0){m.quantidade=m.qtdEmb*m.unidPorEmb;qtdInp.value=String(m.quantidade);}}}) : null;
  var unidPorEmbInp = tipo==='entrada' ? el('input',{class:'form-input',type:'number',min:'0.001',step:'0.001',
    value:m.unidPorEmb||'',placeholder:'Ex: 12 (unid/cx)',
    oninput:function(){m.unidPorEmb=parseFloat(this.value)||0;if(m.qtdEmb>0&&m.unidPorEmb>0){m.quantidade=m.qtdEmb*m.unidPorEmb;qtdInp.value=String(m.quantidade);}}}) : null;
  var custoInp  = el('input',{class:'form-input',type:'number',min:'0',step:'0.01',value:m.custoUnitario||'',
    placeholder:'0,00',oninput:function(){m.custoUnitario=parseFloat(this.value)||0;}});
  var dataInp   = el('input',{class:'form-input',type:'date',value:m.data||today(),oninput:function(){m.data=this.value;}});
  var motivoSel = el('select',{class:'form-input',onchange:function(){m.motivo=this.value;}},
    motivos.map(function(mt){return el('option',{value:mt},mt);}));
  motivoSel.value = m.motivo || motivos[0];
  var obsInp    = el('input',{class:'form-input',value:m.obs||'',placeholder:'Observação (opcional)',oninput:function(){m.obs=this.value;}});
  var loteInp = el('input',{class:'form-input',value:m.lote||'',placeholder:'Ex: L001, 2024-01...',oninput:function(){m.lote=this.value;}});
  var vencInp = el('input',{class:'form-input',type:'date',value:m.dataVencimento||'',oninput:function(){m.dataVencimento=this.value;}});

  var prodInfoEl = prodAtual ? el('div',{style:{background:'var(--bg3)',borderRadius:'8px',padding:'8px 12px',fontSize:'12px',color:'var(--text3)',display:'flex',gap:'16px',flexWrap:'wrap',marginBottom:'4px'}},[
    el('span',{},'📦 Estoque: '+formatQtd(prodAtual.estoqueAtual,prodAtual.unidade)),
    el('span',{style:{color:prodAtual.custoMedio>0?'var(--text3)':'var(--danger)'}},'💰 Custo unit.: '+fmtMoney(prodAtual.custoMedio||0)),
    (prodAtual.qtdPorEmbalagem>0&&prodAtual.precoEmbalagem>0) ? el('span',{style:{color:'var(--gold)'}},'📦 '+fmtMoney(prodAtual.precoEmbalagem)+'/emb × '+prodAtual.qtdPorEmbalagem+' un = '+fmtMoney(prodAtual.precoEmbalagem/prodAtual.qtdPorEmbalagem)+'/'+prodAtual.unidade) : null,
    prodAtual.estoqueMinimo>0 ? el('span',{style:{color:prodAtual.estoqueAtual<=prodAtual.estoqueMinimo?'var(--danger)':'var(--text3)'}},'⚠️ Mín: '+formatQtd(prodAtual.estoqueMinimo,prodAtual.unidade)) : null,
    prodAtual.estoqueMaximo>0 ? el('span',{style:{color:prodAtual.estoqueAtual>=prodAtual.estoqueMaximo?'var(--danger)':'var(--text3)'}},'⬆️ Máx: '+formatQtd(prodAtual.estoqueMaximo,prodAtual.unidade)) : null,
  ].filter(Boolean)) : null;

  var cbGerarDesp = el('input',{type:'checkbox',id:'_gerardesp'});
  if(m.gerarDespesa) cbGerarDesp.checked=true;
  cbGerarDesp.onchange=function(){setState({movModal:Object.assign({},m,{gerarDespesa:this.checked})});};
  var bancos=(state.bancos||[]).filter(function(b){return b.profile===state.profile;});
  var despValorAutoCalc=(m.custoUnitario||0)*(m.quantidade||0);
  var despValorInp=el('input',{class:'form-input',type:'number',min:'0',step:'0.01',
    value:m.despValor!==undefined?String(m.despValor):(despValorAutoCalc?String(despValorAutoCalc):''),placeholder:'0,00',
    oninput:function(){m.despValor=parseFloat(this.value)||0;}});
  var despVencInp=el('input',{class:'form-input',type:'date',value:m.despVenc||m.data||today(),oninput:function(){m.despVenc=this.value;}});
  var despFormSel=el('select',{class:'form-input',onchange:function(){setState({movModal:Object.assign({},m,{despFormPgto:this.value})});}},
    ['Boleto','PIX','Dinheiro','Cartão Débito','Cartão Crédito','Parcelado'].map(function(f){return el('option',{value:f},f);}));
  despFormSel.value = m.despFormPgto||'Boleto';
  var despParcelasInp=el('input',{class:'form-input',type:'number',min:'2',step:'1',
    value:m.despParcelas||'',placeholder:'Nº de parcelas',oninput:function(){m.despParcelas=parseInt(this.value)||2;}});
  var despBancoSel=el('select',{class:'form-input',onchange:function(){m.despBanco=this.value;}},
    [el('option',{value:''},'— Banco / Conta —')].concat(bancos.map(function(b){return el('option',{value:b.id},b.nome);})));
  despBancoSel.value = m.despBanco||'';
  var despDescInp=el('input',{class:'form-input',value:m.despDesc||'',placeholder:'Descrição da conta (opcional)',oninput:function(){m.despDesc=this.value;}});
  var despCampos=m.gerarDespesa?el('div',{style:{background:'var(--bg3)',border:'1px solid var(--gold)',borderRadius:'8px',padding:'12px',marginTop:'10px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}},[
    el('div',{style:{gridColumn:'1/-1',fontSize:'11px',fontWeight:'700',color:'var(--gold)',marginBottom:'2px'}},'💳 Detalhes da conta a pagar'),
    el('div',{class:'form-group',style:{margin:'0'}},[el('label',{class:'form-label'},'Valor total (R$)'),despValorInp]),
    el('div',{class:'form-group',style:{margin:'0'}},[el('label',{class:'form-label'},'Vencimento do pagamento'),despVencInp]),
    el('div',{class:'form-group',style:{margin:'0'}},[el('label',{class:'form-label'},'Forma de pagamento'),despFormSel]),
    (m.despFormPgto==='Parcelado')?el('div',{class:'form-group',style:{margin:'0'}},[el('label',{class:'form-label'},'Nº de parcelas'),despParcelasInp]):null,
    bancos.length>0?el('div',{class:'form-group',style:{margin:'0',gridColumn:m.despFormPgto==='Parcelado'?'auto':'1/-1'}},[el('label',{class:'form-label'},'Banco / Conta'),despBancoSel]):null,
    el('div',{class:'form-group',style:{margin:'0',gridColumn:'1/-1'}},[el('label',{class:'form-label'},'Descrição (opcional)'),despDescInp]),
  ].filter(Boolean)):null;
  var gerarDespEl=tipo==='entrada'?el('div',{style:{borderTop:'1px solid var(--border)',marginTop:'8px',paddingTop:'8px'}},[
    el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[
      cbGerarDesp,
      el('label',{for:'_gerardesp',style:{fontSize:'12px',color:'var(--text2)',cursor:'pointer'}},'💸 Gerar conta a pagar vinculada a esta compra'),
    ]),
    despCampos,
  ].filter(Boolean)):null;

  function salvar() {
    if (!m.produto_id)              { errEl.textContent='Selecione o produto.'; return; }
    if (!m.quantidade || m.quantidade<=0) { errEl.textContent='Informe a quantidade.'; return; }
    var prod = prods.find(function(p){return p.id===m.produto_id;});
    if (!prod) return;

    var qtd    = m.quantidade;
    var custo  = m.custoUnitario || (prod.qtdPorEmbalagem>0&&prod.precoEmbalagem>0 ? prod.precoEmbalagem/prod.qtdPorEmbalagem : 0) || prod.custoMedio || 0;
    var estAnt = prod.estoqueAtual || 0;
    var novoProd;

    if (tipo === 'entrada') {
      if (!custo && !confirm('⚠️ Custo unitário está R$ 0,00. O valor em estoque ficará zerado.\nContinuar mesmo assim?')) return;
      var novoCusto = calcCustoMedioNovo(estAnt, prod.custoMedio||0, qtd, custo);
      novoProd = Object.assign({},prod,{estoqueAtual:estAnt+qtd, custoMedio:novoCusto});
    } else if (tipo === 'saida') {
      if (estAnt - qtd < 0 && !confirm('Estoque ficará negativo ('+formatQtd(estAnt-qtd,prod.unidade)+'). Continuar?')) return;
      novoProd = Object.assign({},prod,{estoqueAtual:estAnt-qtd});
    } else {
      novoProd = Object.assign({},prod,{estoqueAtual:qtd});
    }

    var mov = {
      id:uid(), profile:state.profile,
      produto_id:m.produto_id, produtoNome:prod.nome,
      tipo:tipo, motivo:m.motivo||motivos[0],
      quantidade:qtd, custoUnitario:custo, custoTotal:custo*qtd,
      data:m.data||today(), obs:m.obs||'', criadoEm:today(),
      lote: m.lote || '',
      dataVencimento: m.dataVencimento || '',
    };

    var novosProd = state.produtos.map(function(x){return x.id===novoProd.id?novoProd:x;});
    var novosMovs = (state.movEstoque||[]).concat([mov]);
    var novasContas = state.contas||[];

    if (tipo==='entrada' && m.gerarDespesa) {
      var fornObj=(state.fornecedores||[]).find(function(f){return f.id===prod.fornecedor_id;});
      var despValorFinal=m.despValor!==undefined?m.despValor:custo*qtd;
      var despFormPgto=m.despFormPgto||'Boleto';
      var despParcelas=(despFormPgto==='Parcelado')?(parseInt(m.despParcelas)||2):1;
      var despBancoObj=m.despBanco?(state.bancos||[]).find(function(b){return b.id===m.despBanco;}):null;
      var despDescBase=m.despDesc||('Compra: '+prod.nome+' ('+formatQtd(qtd,prod.unidade)+')');
      var despVencBase=m.despVenc||m.data||today();
      var novasDesps=[];
      for(var parc=0;parc<despParcelas;parc++){
        var dtPts=despVencBase.split('-');
        var dtV=new Date(parseInt(dtPts[0]),parseInt(dtPts[1])-1+parc,parseInt(dtPts[2]));
        var dtStr=dtV.getFullYear()+'-'+String(dtV.getMonth()+1).padStart(2,'0')+'-'+String(dtV.getDate()).padStart(2,'0');
        novasDesps.push({
          id:uid(),profile:state.profile,
          descricao:despParcelas>1?despDescBase+' ('+(parc+1)+'/'+despParcelas+')':despDescBase,
          valor:Math.round((despValorFinal/despParcelas)*100)/100,
          vencimento:dtStr,tipo:'pagar',status:'pendente',categoria:'Estoque/Insumos',
          prioridade:'normal',fornecedor:fornObj?fornObj.nome:'',
          formaPgto:despFormPgto,banco:despBancoObj?despBancoObj.nome:'',
          mov_estoque_id:mov.id,criadoEm:today(),
        });
      }
      novasContas=state.contas.concat(novasDesps);
      logAudit('gerou conta'+(despParcelas>1?' em '+despParcelas+'x':'')+' por compra de estoque',prod.nome+' — '+fmtMoney(despValorFinal));
    }

    var tipoLabel = tipo==='entrada'?'entrada':tipo==='saida'?'saída':'ajuste';
    logAudit(tipoLabel+' de estoque', prod.nome+' '+formatQtd(qtd,prod.unidade));
    setState({produtos:novosProd, movEstoque:novosMovs, contas:novasContas, movModal:null});
    scheduleSave();
    showToast(tipo==='entrada'?'Entrada registrada!':tipo==='saida'?'Saída registrada!':'Estoque ajustado!','success');
    if (novoProd.estoqueMinimo>0 && novoProd.estoqueAtual<=novoProd.estoqueMinimo) {
      setTimeout(function(){showToast('⚠️ '+prod.nome+': estoque abaixo do mínimo!','error',4000);},600);
    }
    if (novoProd.estoqueMaximo>0 && novoProd.estoqueAtual>novoProd.estoqueMaximo) {
      setTimeout(function(){showToast('⚠️ '+prod.nome+': estoque ACIMA do máximo!','error',4000);},1200);
    }
  }

  return el('div',{class:'modal-overlay'},
    el('div',{class:'modal',style:{maxWidth:'500px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},'📦 Nova Movimentação de Estoque'),
        el('button',{class:'modal-close',onclick:function(){setState({movModal:null});}}, '✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Tipo de movimentação'),tipoSel])),
          el('div',{style:{gridColumn:'1/-1'}},
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Produto / Insumo'),prodSel])),
          prodInfoEl ? el('div',{style:{gridColumn:'1/-1'}},prodInfoEl) : null,
          el('div',{class:'form-group'},[el('label',{class:'form-label'},tipo==='ajuste'?'Novo estoque total':'Quantidade'),qtdInp]),
          (tipo==='entrada'&&qtdEmbInp)?el('div',{style:{gridColumn:'1/-1',background:'var(--bg3)',borderRadius:'8px',padding:'10px 12px',marginTop:'-4px'}},[
            el('div',{style:{fontSize:'11px',color:'var(--text3)',fontWeight:'600',marginBottom:'8px'}},'📦 Ou calcule pela embalagem (opcional):'),
            el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}},[
              el('div',{},[el('label',{class:'form-label',style:{fontSize:'11px'}},'Nº de embalagens'),qtdEmbInp]),
              el('div',{},[el('label',{class:'form-label',style:{fontSize:'11px'}},'Unid. por embalagem'),unidPorEmbInp]),
            ]),
            (m.qtdEmb>0&&m.unidPorEmb>0)?el('div',{style:{fontSize:'12px',color:'var(--green)',fontWeight:'700',marginTop:'6px'}},'→ Total: '+m.quantidade+' '+((prodAtual&&prodAtual.unidade)||'un')):null,
          ].filter(Boolean)):null,
          tipo!=='saida' ? el('div',{class:'form-group'},[el('label',{class:'form-label'},'Custo unitário (R$)'),custoInp]) : null,
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Data'),dataInp]),
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Motivo'),motivoSel]),
          el('div',{style:{gridColumn:'1/-1'}},
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Observação'),obsInp])),
          tipo!=='saida' ? el('div',{style:{gridColumn:'1/-1'}},
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Número do Lote (opcional)'),loteInp])) : null,
          (tipo!=='saida' && (prodAtual&&prodAtual.controleVencimento)) ? el('div',{style:{gridColumn:'1/-1'}},
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'📅 Data de Vencimento do Lote'),vencInp])) : null,
          gerarDespEl ? el('div',{style:{gridColumn:'1/-1'}},gerarDespEl) : null,
        ].filter(Boolean)),
        errEl,
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({movModal:null});}),
        btn('btn-primary','✅ Registrar',salvar),
      ]),
    ])
  );
}

// ── TAB: PRODUTOS ─────────────────────────────────────────────────────────────

function renderEstProdutos() {
  var prods     = estProdutos();
  var valorTotal = calcValorEstoque();
  var criticos  = prods.filter(function(p){return p.estoqueMinimo>0&&p.estoqueAtual>0&&p.estoqueAtual<=p.estoqueMinimo;}).length;
  var zerados   = prods.filter(function(p){return p.estoqueAtual<=0;}).length;
  var cats      = [].concat(prods.map(function(p){return p.categoria;})).filter(function(v,i,a){return a.indexOf(v)===i;}).length;

  var kpis = el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))'}},[
    el('div',{class:'kpi-card gold' },[el('div',{class:'kpi-label'},'Insumos ativos'),   el('div',{class:'kpi-value gold'},  String(prods.length)),      el('div',{class:'kpi-sub'},cats+' categorias')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Valor em estoque'),  el('div',{class:'kpi-value green'}, fmtMoney(valorTotal)),       el('div',{class:'kpi-sub'},'custo médio ponderado')]),
    el('div',{class:'kpi-card red'  },[el('div',{class:'kpi-label'},'Abaixo do mínimo'), el('div',{class:'kpi-value red'},   String(criticos)),            el('div',{class:'kpi-sub'},zerados+' zerados')]),
  ]);

  // Agrupa por categoria
  var grouped = {};
  prods.forEach(function(p){if(!grouped[p.categoria])grouped[p.categoria]=[];grouped[p.categoria].push(p);});

  function prodCard(p) {
    var pct     = p.estoqueMinimo>0 ? Math.min(100,(p.estoqueAtual/p.estoqueMinimo)*100) : 100;
    var status  = p.estoqueAtual<=0 ? 'zerado' : (p.estoqueMinimo>0&&p.estoqueAtual<=p.estoqueMinimo) ? 'critico' : 'ok';
    var cor     = status==='critico' ? 'var(--danger)' : status==='zerado' ? '#999' : 'var(--green)';
    var lbl     = status==='critico' ? '⚠️ Crítico' : status==='zerado' ? '⬛ Zerado' : '✅ OK';
    var margem  = (p.precoVenda>0&&p.custoMedio>0) ? ((1-p.custoMedio/p.precoVenda)*100).toFixed(1)+'%' : null;
    var vlTotal = (p.estoqueAtual||0)*(p.custoMedio||0);

    return el('div',{class:'card',style:{padding:'14px',display:'flex',flexDirection:'column',gap:'0'}},[

      // ── Cabeçalho: nome + badge status ──
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}},[
        el('div',{style:{flex:'1',minWidth:'0',paddingRight:'8px'}},[
          el('div',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},p.nome),
          el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},'#INSUMOS · '+p.unidade),
        ]),
        el('div',{style:{flexShrink:'0',textAlign:'right'}},[
          el('span',{style:{fontSize:'10px',fontWeight:'700',color:cor,background:status==='ok'?'rgba(79,193,133,.12)':status==='critico'?'rgba(192,57,43,.12)':'var(--bg3)',padding:'2px 7px',borderRadius:'10px',border:'1px solid '+cor}},lbl),
        ]),
      ]),

      // ── Estoque atual + barra ──
      el('div',{style:{marginBottom:'8px'}},[
        el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'4px'}},[
          el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Estoque atual'),
          el('span',{style:{fontSize:'13px',fontWeight:'800',color:cor}},formatQtd(p.estoqueAtual,p.unidade)),
        ]),
        p.estoqueMinimo>0 ? el('div',{style:{height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden',marginBottom:'3px'}},[
          el('div',{style:{height:'100%',width:pct+'%',background:cor,borderRadius:'3px',transition:'width .3s'}}),
        ]) : null,
        p.estoqueMinimo>0 ? el('div',{style:{fontSize:'10px',color:'var(--text3)'}},'Mínimo: '+formatQtd(p.estoqueMinimo,p.unidade)) : null,
      ].filter(Boolean)),

      // ── SKU (linha separada, limpa) ──
      p.sku ? el('div',{style:{fontSize:'10px',color:'var(--text3)',marginBottom:'6px',fontFamily:'monospace',background:'var(--bg3)',borderRadius:'4px',padding:'2px 6px',display:'inline-block'}},'SKU: '+p.sku) : null,

      // ── Custo + Valor total ──
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'6px',
        background:'var(--bg3)',borderRadius:'6px',padding:'7px 10px',fontSize:'11px'}},[
        el('div',{},[
          el('div',{style:{color:'var(--text3)',marginBottom:'1px'}},'Custo unit.'),
          el('div',{style:{fontWeight:'700',color:'var(--text)',fontSize:'12px'}},fmtMoney(p.custoMedio||0)),
        ]),
        el('div',{style:{textAlign:'right'}},[
          el('div',{style:{color:'var(--text3)',marginBottom:'1px'}},'Total em estoque'),
          el('div',{style:{fontWeight:'700',color:'var(--gold)',fontSize:'12px'}},fmtMoney(vlTotal)),
        ]),
      ]),

      // ── Embalagem (se configurada) ──
      (p.qtdPorEmbalagem>0&&p.precoEmbalagem>0) ? el('div',{style:{fontSize:'10px',color:'var(--text3)',marginBottom:'6px',display:'flex',alignItems:'center',gap:'4px'}},[
        el('span',{},'📦'),
        el('span',{},fmtMoney(p.precoEmbalagem)+'/emb · '+p.qtdPorEmbalagem+' '+p.unidade+'/emb'),
      ]) : null,

      // ── Botões ──
      el('div',{style:{display:'flex',gap:'5px',marginTop:'auto',paddingTop:'4px'}},[
        el('button',{class:'btn-secondary',style:{flex:'1',fontSize:'11px',padding:'5px 4px'},onclick:function(){
          var cu=p.custoMedio||(p.qtdPorEmbalagem>0&&p.precoEmbalagem>0?Math.round(p.precoEmbalagem/p.qtdPorEmbalagem*10000)/10000:0);
          setState({movModal:{tipo:'entrada',produto_id:p.id,custoUnitario:cu,data:today()}});
        }},'📥 Entrada'),
        el('button',{class:'btn-ghost',style:{flex:'1',fontSize:'11px',padding:'5px 4px',color:'var(--danger)'},onclick:function(){
          setState({movModal:{tipo:'saida',produto_id:p.id,data:today()}});
        }},'📤 Saída'),
        el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'5px 8px'},title:'Editar',onclick:function(){
          setState({produtoModal:JSON.parse(JSON.stringify(p))});
        }},'✏️'),
        el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'5px 8px',color:'var(--danger)'},title:'Inativar',onclick:function(){
          if(!confirm('Inativar "'+p.nome+'"? Movimentações são mantidas.'))return;
          var np=(state.produtos||[]).map(function(x){return x.id===p.id?Object.assign({},x,{ativo:false}):x;});
          logAudit('inativou produto',p.nome);
          setState({produtos:np});scheduleSave();showToast('Produto inativado','info');
        }},'🗑️'),
      ]),
    ].filter(Boolean));
  }

  var content = prods.length===0
    ? el('div',{class:'card'},[el('div',{class:'empty'},[
        el('div',{class:'empty-icon'},'⚙️'),
        el('div',{class:'empty-title'},'Nenhum insumo cadastrado'),
        el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Cadastre insumos (matérias-primas) para controlar o estoque e calcular o CMV'),
      ])])
    : el('div',{},Object.keys(grouped).map(function(cat){
        return el('div',{style:{marginBottom:'20px'}},[
          el('div',{style:{fontSize:'11px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}},cat),
          el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'10px'}},
            grouped[cat].map(prodCard)),
        ]);
      }));

  return el('div',{},[kpis,content]);
}

// ── TAB: MOVIMENTAÇÕES ────────────────────────────────────────────────────────

function renderEstMovs() {
  var now     = nowBR();
  var mesFlt  = state.estMovMes !== undefined ? state.estMovMes : now.getMonth();
  var anoFlt  = state.estMovAno || now.getFullYear();
  var anoMes  = anoFlt+'-'+String(mesFlt+1).padStart(2,'0');
  var movsMes = estMovs().filter(function(m){return m.data&&m.data.startsWith(anoMes);})
                  .sort(function(a,b){return (b.data||'').localeCompare(a.data||'');});

  var totalE  = movsMes.filter(function(m){return m.tipo==='entrada';}).reduce(function(a,m){return a+(m.custoUnitario||0)*(m.quantidade||0);},0);
  var totalS  = movsMes.filter(function(m){return m.tipo==='saida';  }).reduce(function(a,m){return a+(m.custoUnitario||0)*(m.quantidade||0);},0);

  var kpis = el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))'}},[
    el('div',{class:'kpi-card blue' },[el('div',{class:'kpi-label'},'Movimentações'),    el('div',{class:'kpi-value blue'},  String(movsMes.length)),el('div',{class:'kpi-sub'},'no mês')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Compras (entradas)'),el('div',{class:'kpi-value green'},fmtMoney(totalE)),       el('div',{class:'kpi-sub'},'custo total')]),
    el('div',{class:'kpi-card red'  },[el('div',{class:'kpi-label'},'CMV (saídas)'),     el('div',{class:'kpi-value red'},  fmtMoney(totalS)),         el('div',{class:'kpi-sub'},'custo das saídas')]),
  ]);

  var selMes = el('select',{class:'form-input',style:{fontSize:'12px',padding:'5px 8px'},onchange:function(){setState({estMovMes:parseInt(this.value)});}},
    MESES.map(function(m,i){return el('option',{value:i,selected:i===mesFlt},m);}));
  var selAno = el('select',{class:'form-input',style:{fontSize:'12px',padding:'5px 8px'},onchange:function(){setState({estMovAno:parseInt(this.value)});}},
    [now.getFullYear()-1,now.getFullYear()].map(function(y){return el('option',{value:y,selected:y===anoFlt},String(y));}));

  var tsMap = {
    entrada:{cor:'var(--green)', bg:'rgba(79,193,133,.12)',  lbl:'📥 Entrada'},
    saida:  {cor:'var(--danger)',bg:'rgba(192,57,43,.10)',   lbl:'📤 Saída'},
    ajuste: {cor:'var(--gold)', bg:'var(--gold-dim)',        lbl:'🔧 Ajuste'},
  };

  var rows = movsMes.length===0
    ? [el('tr',{},[el('td',{colspan:'8',style:{textAlign:'center',padding:'32px',color:'var(--text3)',fontSize:'13px'}},[
        el('div',{style:{fontSize:'32px',marginBottom:'8px'}},'📋'),
        el('div',{},'Nenhuma movimentação em '+MESES[mesFlt]+' '+anoFlt+'.'),
        el('div',{style:{fontSize:'11px',marginTop:'4px'}},'Use "+ Nova Movimentação" na aba Insumos para registrar entradas ou saídas.'),
      ])])]
    : movsMes.map(function(m){
        var ts = tsMap[m.tipo]||tsMap.ajuste;
        var custoZero = m.tipo==='entrada' && !(m.custoUnitario||0);
        return el('tr',{style:{borderBottom:'1px solid var(--border)',background:custoZero?'rgba(192,57,43,.06)':'transparent'}},[
          el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text3)',whiteSpace:'nowrap'}},m.data||'—'),
          el('td',{style:{padding:'8px 10px',fontSize:'12px',fontWeight:'600',color:'var(--text)'}},m.produtoNome||'—'),
          el('td',{style:{padding:'8px 10px'}},[
            el('span',{style:{background:ts.bg,color:ts.cor,padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}},ts.lbl),
          ]),
          el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text2)',textAlign:'right'}},String(m.quantidade||0)),
          el('td',{style:{padding:'8px 10px',fontSize:'12px',color:custoZero?'var(--danger)':'var(--text2)',textAlign:'right'}},[
            custoZero ? el('span',{title:'Custo não informado — refaça a entrada com custo correto'},'⚠️ '+fmtMoney(0)) : fmtMoney(m.custoUnitario||0),
          ]),
          el('td',{style:{padding:'8px 10px',fontSize:'13px',fontWeight:'700',color:custoZero?'var(--danger)':ts.cor,textAlign:'right'}},fmtMoney((m.custoUnitario||0)*(m.quantidade||0))),
          el('td',{style:{padding:'8px 10px',fontSize:'11px',color:'var(--text3)'}},m.motivo||'—'),
          el('td',{style:{padding:'8px 6px',textAlign:'center'}},
            el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'14px',padding:'2px 6px'},title:'Excluir movimentação',
              onclick:function(){
                if(!confirm('Excluir esta movimentação? O estoque será revertido.')) return;
                var prod2 = (state.produtos||[]).find(function(p){return p.id===m.produto_id;});
                var novosProd2 = state.produtos||[];
                if(prod2){
                  var qtdRev = m.tipo==='entrada'?-(m.quantidade||0):(m.tipo==='saida'?(m.quantidade||0):0);
                  var novoEst = (prod2.estoqueAtual||0)+qtdRev;
                  var novoCusto = prod2.custoMedio||0;
                  if(m.tipo==='entrada'){
                    if(novoEst>0){
                      var totAtual=(prod2.custoMedio||0)*(prod2.estoqueAtual||0);
                      var totEntrada=(m.custoUnitario||0)*(m.quantidade||0);
                      novoCusto=Math.max(0,(totAtual-totEntrada)/novoEst);
                    } else { novoCusto=0; }
                  }
                  novosProd2=(state.produtos||[]).map(function(p){return p.id===prod2.id?Object.assign({},p,{estoqueAtual:novoEst,custoMedio:novoCusto}):p;});
                }
                setState({produtos:novosProd2,movEstoque:(state.movEstoque||[]).filter(function(x){return x.id!==m.id;})});
                scheduleSave();
              }
            },'🗑️')
          ),
        ]);
      });

  var tabela = el('div',{style:{overflowX:'auto'}},
    el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
      el('thead',{style:{background:'var(--dark)'}},el('tr',{},[
        el('th',{style:{padding:'8px 10px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Data'),
        el('th',{style:{padding:'8px 10px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Produto'),
        el('th',{style:{padding:'8px 10px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Tipo'),
        el('th',{style:{padding:'8px 10px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Qtd'),
        el('th',{style:{padding:'8px 10px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Custo Unit.'),
        el('th',{style:{padding:'8px 10px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Total'),
        el('th',{style:{padding:'8px 10px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Motivo'),
        el('th',{style:{padding:'8px 6px',textAlign:'center',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},''),
      ])),
      el('tbody',{},rows),
    ]));

  return el('div',{},[
    kpis,
    el('div',{style:{display:'flex',gap:'8px',alignItems:'center',marginBottom:'12px'}},[
      el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Período:'),selMes,selAno,
    ]),
    el('div',{class:'card',style:{padding:'0',overflow:'hidden'}},tabela),
  ]);
}

// ── TAB: CMV ──────────────────────────────────────────────────────────────────

function renderEstCMV() {
  var now    = nowBR();
  var mes    = state.cmvMesSel !== undefined ? state.cmvMesSel : now.getMonth();
  var ano    = state.cmvAnoSel || now.getFullYear();
  var anoMes = ano+'-'+String(mes+1).padStart(2,'0');
  var pf     = state.profile;

  var cmvReal     = calcCMVPeriodo(anoMes);
  var recBruta    = (state.receitas||[]).filter(function(r){return r.profile===pf&&r.data&&r.data.startsWith(anoMes);}).reduce(function(a,r){return a+r.valor;},0);
  var margemBruta = recBruta - cmvReal;
  var cmvPct      = recBruta>0 ? (cmvReal/recBruta)*100 : 0;
  var margemPct   = recBruta>0 ? (margemBruta/recBruta)*100 : 0;
  var metaCmvPct  = state.metaCmvPct || 32;

  var cmvCor   = cmvPct===0 ? 'var(--text3)' : cmvPct<=metaCmvPct ? 'var(--green)' : cmvPct<=metaCmvPct+5 ? 'var(--gold)' : 'var(--danger)';
  var cmvLabel = cmvPct===0 ? '— sem dados' : cmvPct<=metaCmvPct ? '✅ Dentro da meta' : cmvPct<=metaCmvPct+5 ? '⚠️ Atenção' : '🔴 Acima da meta';

  // Histórico 6 meses
  var hist = [];
  for (var i=5;i>=0;i--) {
    var d  = new Date(ano,mes-i,1);
    var am = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    var rec= (state.receitas||[]).filter(function(r){return r.profile===pf&&r.data&&r.data.startsWith(am);}).reduce(function(a,r){return a+r.valor;},0);
    var cmv2= calcCMVPeriodo(am);
    hist.push({label:MESES[d.getMonth()].slice(0,3),rec:rec,cmv:cmv2,pct:rec>0?(cmv2/rec*100):0});
  }

  // CMV por produto no mês
  var todasMovsMes = estMovs().filter(function(m){return m.data&&m.data.startsWith(anoMes);});
  var saidasMes   = todasMovsMes.filter(function(m){return m.tipo==='saida';});
  var entradasMes = todasMovsMes.filter(function(m){return m.tipo==='entrada';});
  var totalCompras = entradasMes.reduce(function(a,m){return a+(m.custoUnitario||0)*(m.quantidade||0);},0);
  var agrupProd = {};
  saidasMes.forEach(function(m){
    if(!agrupProd[m.produto_id])agrupProd[m.produto_id]={nome:m.produtoNome,total:0};
    agrupProd[m.produto_id].total+=(m.custoUnitario||0)*(m.quantidade||0);
  });
  var rankCMV = Object.values(agrupProd).sort(function(a,b){return b.total-a.total;}).slice(0,10);

  var selMes = el('select',{class:'form-input',style:{fontSize:'12px',padding:'5px 8px'},onchange:function(){setState({cmvMesSel:parseInt(this.value)});}},
    MESES.map(function(m,i){return el('option',{value:i,selected:i===mes},m);}));
  var selAno = el('select',{class:'form-input',style:{fontSize:'12px',padding:'5px 8px'},onchange:function(){setState({cmvAnoSel:parseInt(this.value)});}},
    [now.getFullYear()-1,now.getFullYear()].map(function(y){return el('option',{value:y,selected:y===ano},String(y));}));
  var metaInp = el('input',{type:'number',class:'form-input',style:{width:'64px',padding:'5px 8px',fontSize:'12px'},value:String(metaCmvPct),min:'1',max:'100',
    onchange:function(){setState({metaCmvPct:parseFloat(this.value)||32});}});

  var kpis = el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))'}},[
    el('div',{class:'kpi-card blue' },[el('div',{class:'kpi-label'},'Compras (entradas)'),el('div',{class:'kpi-value blue'},fmtMoney(totalCompras)),  el('div',{class:'kpi-sub'},entradasMes.length+' movim. no mês')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Receita bruta'),    el('div',{class:'kpi-value green'},fmtMoney(recBruta)),       el('div',{class:'kpi-sub'},'do período')]),
    el('div',{class:'kpi-card red'  },[el('div',{class:'kpi-label'},'CMV (saídas)'),     el('div',{class:'kpi-value',style:{color:cmvCor}},fmtMoney(cmvReal)),el('div',{class:'kpi-sub'},cmvPct.toFixed(1)+'% da receita')]),
    el('div',{class:'kpi-card gold' },[el('div',{class:'kpi-label'},'Margem bruta'),     el('div',{class:'kpi-value',style:{color:margemBruta>=0?'var(--green)':'var(--danger)'}},fmtMoney(margemBruta)),el('div',{class:'kpi-sub'},margemPct.toFixed(1)+'%')]),
  ]);

  // Gauge
  var gaugePct = Math.min(100,cmvPct);
  var metaPct2 = Math.min(100,metaCmvPct);
  var gauge = el('div',{class:'card',style:{padding:'20px',marginBottom:'14px'}},[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}},[
      el('div',{},[
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:'var(--text)'}},'CMV% do Mês'),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},MESES[mes]+' '+ano),
      ]),
      el('div',{style:{textAlign:'right'}},[
        el('div',{style:{fontSize:'28px',fontWeight:'900',color:cmvCor}},cmvPct.toFixed(1)+'%'),
        el('div',{style:{fontSize:'11px',color:cmvCor,fontWeight:'700'}},cmvLabel),
      ]),
    ]),
    el('div',{style:{position:'relative',marginBottom:'20px'}},[
      el('div',{style:{height:'12px',background:'var(--bg3)',borderRadius:'6px',overflow:'hidden'}},[
        el('div',{style:{height:'100%',width:gaugePct+'%',background:cmvCor,borderRadius:'6px',transition:'width .5s'}}),
      ]),
      el('div',{style:{position:'absolute',top:'-3px',left:'calc('+metaPct2+'% - 1px)'}},[
        el('div',{style:{width:'2px',height:'18px',background:'var(--gold)'}}),
      ]),
      el('div',{style:{position:'absolute',top:'18px',left:'calc('+metaPct2+'% - 10px)',fontSize:'9px',color:'var(--gold)',fontWeight:'700',whiteSpace:'nowrap'}},'META'),
    ]),
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'11px',color:'var(--text3)'}},[
      el('span',{},'0%'),
      el('div',{style:{display:'flex',alignItems:'center',gap:'6px'}},[
        el('span',{},'Meta CMV%:'),metaInp,
        el('span',{style:{fontSize:'10px',color:'var(--text3)'}},'(food service ideal: 28-35%)'),
      ]),
      el('span',{},'100%'),
    ]),
  ]);

  // Gráfico histórico
  var maxH = Math.max.apply(null,hist.map(function(h){return Math.max(h.rec,h.cmv);})) || 1;
  var histEl = el('div',{class:'card',style:{padding:'20px',marginBottom:'14px'}},[
    el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--text)',marginBottom:'14px'}},'📈 Histórico 6 meses — Receita vs CMV'),
    el('div',{style:{display:'flex',gap:'6px',alignItems:'flex-end',height:'110px',paddingBottom:'20px'}},
      hist.map(function(h){
        var hR = Math.round((h.rec/maxH)*80);
        var hC = Math.round((h.cmv/maxH)*80);
        return el('div',{style:{flex:'1',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}},[
          el('div',{style:{fontSize:'9px',color:'var(--gold)',fontWeight:'700'}},h.pct>0?h.pct.toFixed(0)+'%':'—'),
          el('div',{style:{width:'100%',display:'flex',gap:'2px',alignItems:'flex-end',height:'80px'}},[
            el('div',{style:{flex:'1',height:hR+'px',background:'var(--green)',borderRadius:'3px 3px 0 0',opacity:'.85'}}),
            el('div',{style:{flex:'1',height:hC+'px',background:'var(--danger)',borderRadius:'3px 3px 0 0',opacity:'.85'}}),
          ]),
          el('div',{style:{fontSize:'9px',color:'var(--text3)',textAlign:'center'}},h.label),
        ]);
      })
    ),
    el('div',{style:{display:'flex',gap:'16px',marginTop:'4px',fontSize:'11px',color:'var(--text3)'}},[
      el('span',{},[el('span',{style:{display:'inline-block',width:'10px',height:'10px',background:'var(--green)',borderRadius:'2px',marginRight:'4px',verticalAlign:'middle'}},''),'Receita']),
      el('span',{},[el('span',{style:{display:'inline-block',width:'10px',height:'10px',background:'var(--danger)',borderRadius:'2px',marginRight:'4px',verticalAlign:'middle'}},''),'CMV']),
    ]),
  ]);

  // Ranking por produto
  // Compras do período (entradas) — sempre visível
  var semCusto2 = entradasMes.some(function(m){return !(m.custoUnitario||0);});
  var comprasEl = entradasMes.length===0 ? null : el('div',{class:'card',style:{padding:'0',overflow:'hidden',marginBottom:'14px'}},[
    el('div',{style:{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}},[
      el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--text)'}},'🛒 Compras do período — '+MESES[mes]+' '+ano),
      el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--blue)',background:'rgba(52,152,219,.12)',padding:'4px 12px',borderRadius:'20px'}},fmtMoney(totalCompras)),
    ]),
    el('div',{style:{overflowX:'auto'}},
      el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
        el('thead',{style:{background:'var(--dark)'}},el('tr',{},[
          el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Data'),
          el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Produto'),
          el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Qtd'),
          el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Custo Unit.'),
          el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Total'),
        ])),
        el('tbody',{},entradasMes.map(function(m,i){
          var semCusto = !(m.custoUnitario||0);
          return el('tr',{style:{borderBottom:'1px solid var(--border)',background:semCusto?'rgba(192,57,43,.06)':i%2===1?'var(--bg3)':'transparent'}},[
            el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text3)'}},m.data||'—'),
            el('td',{style:{padding:'8px 12px',fontSize:'13px',color:'var(--text)',fontWeight:'600'}},m.produtoNome||'—'),
            el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text2)',textAlign:'right'}},String(m.quantidade||0)),
            el('td',{style:{padding:'8px 12px',fontSize:'12px',color:semCusto?'var(--danger)':'var(--text2)',textAlign:'right'}},semCusto?'⚠️ R$0,00':fmtMoney(m.custoUnitario||0)),
            el('td',{style:{padding:'8px 12px',fontSize:'13px',fontWeight:'700',color:semCusto?'var(--danger)':'var(--blue)',textAlign:'right'}},fmtMoney((m.custoUnitario||0)*(m.quantidade||0))),
          ]);
        }))
      ])
    ),
    semCusto2 ? el('div',{style:{padding:'10px 16px',background:'rgba(192,57,43,.10)',fontSize:'12px',color:'var(--danger)',borderTop:'1px solid rgba(192,57,43,.2)'}},
      '⚠️ Entradas com custo R$0,00 não contribuem para o valor de estoque. Exclua e refaça a entrada informando o custo correto na aba Movimentações.'
    ) : null,
  ].filter(Boolean));

  var rankEl = rankCMV.length===0
    ? el('div',{class:'card',style:{padding:'24px',textAlign:'center',color:'var(--text3)',fontSize:'12px'}},[
        el('div',{style:{fontSize:'28px',marginBottom:'8px'}},'📊'),
        el('div',{style:{fontWeight:'700',marginBottom:'4px'}},'CMV por produto vazio'),
        el('div',{style:{fontSize:'11px',lineHeight:'1.7'}},'O CMV é calculado pelas saídas de estoque (consumo de insumos).\nPara preencher: registre saídas manualmente na aba Movimentações\nou vincule os produtos do cardápio com seus insumos para baixa automática.'),
      ])
    : el('div',{class:'card',style:{padding:'0',overflow:'hidden'}},[
        el('div',{style:{padding:'14px 16px',borderBottom:'1px solid var(--border)',fontSize:'13px',fontWeight:'700',color:'var(--text)'}},'🏆 CMV por produto — '+MESES[mes]),
        el('div',{style:{overflowX:'auto'}},
          el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
            el('thead',{style:{background:'var(--dark)'}},el('tr',{},[
              el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'#'),
              el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Produto'),
              el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'CMV R$'),
              el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'% do Total'),
              el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Participação'),
            ])),
            el('tbody',{},rankCMV.map(function(p,i){
              var pct2 = cmvReal>0 ? (p.total/cmvReal)*100 : 0;
              return el('tr',{style:{borderBottom:'1px solid var(--border)',background:i%2===1?'var(--bg3)':'transparent'}},[
                el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text3)',fontWeight:'700'}},String(i+1)),
                el('td',{style:{padding:'8px 12px',fontSize:'13px',color:'var(--text)',fontWeight:'600'}},p.nome),
                el('td',{style:{padding:'8px 12px',fontSize:'13px',color:'var(--danger)',fontWeight:'700',textAlign:'right'}},fmtMoney(p.total)),
                el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text2)',textAlign:'right'}},pct2.toFixed(1)+'%'),
                el('td',{style:{padding:'8px 12px'}},[
                  el('div',{style:{height:'6px',background:'var(--bg3)',borderRadius:'3px',width:'120px',overflow:'hidden'}},[
                    el('div',{style:{height:'100%',width:pct2+'%',background:'var(--danger)',borderRadius:'3px'}}),
                  ]),
                ]),
              ]);
            }))
          ])
        ),
      ]);

  return el('div',{},[
    el('div',{style:{display:'flex',gap:'8px',alignItems:'center',marginBottom:'12px'}},[
      el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Período:'),selMes,selAno,
    ]),
    kpis, gauge, histEl, comprasEl, rankEl,
  ].filter(Boolean));
}

// ── TAB: CURVA ABC ────────────────────────────────────────────────────────────

function renderEstABC() {
  var now   = nowBR();
  var nMes  = state.abcMeses || 3;
  var inicio = new Date(now.getFullYear(),now.getMonth()-nMes+1,1);
  var inicioStr = inicio.getFullYear()+'-'+String(inicio.getMonth()+1).padStart(2,'0');
  var saidas = estMovs().filter(function(m){return m.tipo==='saida'&&m.data&&m.data>=inicioStr;});
  var totalGeral = saidas.reduce(function(a,m){return a+(m.custoUnitario||0)*(m.quantidade||0);},0);

  var agrup = {};
  saidas.forEach(function(m){
    if(!agrup[m.produto_id])agrup[m.produto_id]={nome:m.produtoNome,total:0,qtd:0};
    agrup[m.produto_id].total+=(m.custoUnitario||0)*(m.quantidade||0);
    agrup[m.produto_id].qtd+=m.quantidade||0;
  });

  var acum=0;
  var lista = Object.values(agrup).sort(function(a,b){return b.total-a.total;}).map(function(p){
    var pct = totalGeral>0?(p.total/totalGeral)*100:0;
    acum+=pct;
    return Object.assign({},p,{pct:pct,acum:acum,classe:acum<=80?'A':acum<=95?'B':'C'});
  });

  var cntA=lista.filter(function(p){return p.classe==='A';}).length;
  var cntB=lista.filter(function(p){return p.classe==='B';}).length;
  var cntC=lista.filter(function(p){return p.classe==='C';}).length;
  var vlA =lista.filter(function(p){return p.classe==='A';}).reduce(function(a,p){return a+p.total;},0);

  var selMeses = el('select',{class:'form-input',style:{fontSize:'12px',padding:'5px 8px'},onchange:function(){setState({abcMeses:parseInt(this.value)});}},
    [{v:1,l:'Último mês'},{v:3,l:'Últimos 3 meses'},{v:6,l:'Últimos 6 meses'},{v:12,l:'Últimos 12 meses'}]
      .map(function(x){return el('option',{value:x.v,selected:x.v===nMes},x.l);}));

  var kpis = el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))'}},[
    el('div',{class:'kpi-card red'  },[el('div',{class:'kpi-label'},'Classe A — Críticos'),    el('div',{class:'kpi-value red'},  cntA+' itens'),el('div',{class:'kpi-sub'},fmtMoney(vlA)+' (80% CMV)')]),
    el('div',{class:'kpi-card gold' },[el('div',{class:'kpi-label'},'Classe B — Importantes'), el('div',{class:'kpi-value gold'}, cntB+' itens'),el('div',{class:'kpi-sub'},'15% do CMV')]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Classe C — Baixo impacto'),el('div',{class:'kpi-value green'},cntC+' itens'),el('div',{class:'kpi-sub'},'5% do CMV')]),
  ]);

  var explica = el('div',{class:'card',style:{padding:'14px 16px',marginBottom:'14px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}},[
    el('div',{style:{borderLeft:'3px solid var(--danger)',paddingLeft:'10px'}},[
      el('div',{style:{fontSize:'12px',fontWeight:'800',color:'var(--danger)','margin-bottom':'4px'}},'CLASSE A'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',lineHeight:'1.6'}},'80% do custo total. Controle rigoroso, negociar com fornecedores e monitorar diariamente.'),
    ]),
    el('div',{style:{borderLeft:'3px solid var(--gold)',paddingLeft:'10px'}},[
      el('div',{style:{fontSize:'12px',fontWeight:'800',color:'var(--gold)','margin-bottom':'4px'}},'CLASSE B'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',lineHeight:'1.6'}},'15% do custo. Controle periódico — revisão semanal suficiente.'),
    ]),
    el('div',{style:{borderLeft:'3px solid var(--green)',paddingLeft:'10px'}},[
      el('div',{style:{fontSize:'12px',fontWeight:'800',color:'var(--green)','margin-bottom':'4px'}},'CLASSE C'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',lineHeight:'1.6'}},'5% do custo. Baixo impacto — controle simples, compra em volume.'),
    ]),
  ]);

  var tabela = lista.length===0
    ? el('div',{class:'card',style:{padding:'32px',textAlign:'center',color:'var(--text3)',fontSize:'12px'}},[
        el('div',{style:{fontSize:'32px',marginBottom:'12px'}},'📊'),
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}},'Nenhuma saída registrada'),
        el('div',{style:{lineHeight:'1.8'}},'A Curva ABC é calculada pelas saídas de estoque (consumo de insumos).'),
        el('div',{style:{marginTop:'8px',background:'var(--bg3)',borderRadius:'8px',padding:'12px',textAlign:'left',fontSize:'11px',lineHeight:'1.9'}},[
          el('div',{style:{fontWeight:'700',color:'var(--gold)',marginBottom:'4px'}},'Como funciona:'),
          el('div',{},'1️⃣  Registre saídas manualmente (aba Movimentações → Tipo: Saída)'),
          el('div',{},'2️⃣  Ou vincule os itens do cardápio com os insumos para baixa automática ao vender no PDV'),
          el('div',{},'3️⃣  A curva ABC classificará os insumos em A (80% do custo), B (15%) e C (5%)'),
        ]),
      ])
    : el('div',{class:'card',style:{padding:'0',overflow:'hidden'}},
        el('div',{style:{overflowX:'auto'}},
          el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
            el('thead',{style:{background:'var(--dark)'}},el('tr',{},[
              el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'#'),
              el('th',{style:{padding:'8px 12px',textAlign:'left',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Produto'),
              el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'CMV Total'),
              el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'% Individual'),
              el('th',{style:{padding:'8px 12px',textAlign:'right',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'% Acumulado'),
              el('th',{style:{padding:'8px 12px',textAlign:'center',fontSize:'11px',color:'var(--gold)',fontWeight:'700'}},'Classe'),
            ])),
            el('tbody',{},lista.map(function(p,i){
              var cor = classeCorABC(p.classe);
              return el('tr',{style:{borderBottom:'1px solid var(--border)',background:i%2===1?'var(--bg3)':'transparent'}},[
                el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text3)'}},String(i+1)),
                el('td',{style:{padding:'8px 12px',fontSize:'13px',color:'var(--text)',fontWeight:'600'}},p.nome),
                el('td',{style:{padding:'8px 12px',fontSize:'13px',fontWeight:'700',color:cor,textAlign:'right'}},fmtMoney(p.total)),
                el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text2)',textAlign:'right'}},p.pct.toFixed(1)+'%'),
                el('td',{style:{padding:'8px 12px',fontSize:'12px',color:'var(--text3)',textAlign:'right'}},p.acum.toFixed(1)+'%'),
                el('td',{style:{padding:'8px 12px',textAlign:'center'}},[
                  el('span',{style:{background:'var(--bg3)',color:cor,border:'1.5px solid '+cor,padding:'2px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:'800',letterSpacing:'.5px'}},p.classe),
                ]),
              ]);
            }))
          ])
        )
      );

  return el('div',{},[
    el('div',{style:{display:'flex',gap:'8px',alignItems:'center',marginBottom:'12px'}},[
      el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Período de análise:'),selMeses,
    ]),
    kpis, explica, tabela,
  ]);
}

// ── LOTES VENCENDO ───────────────────────────────────────────────────────────

function _lotesVencendoEmBreve() {
  var hoje = new Date();
  var result = [];
  var movs = (state.movEstoque||[]).filter(function(m){return m.profile===state.profile&&m.tipo==='entrada'&&m.dataVencimento;});
  movs.forEach(function(m){
    var prod = (state.produtos||[]).find(function(p){return p.id===m.produto_id;});
    if(!prod) return;
    var dias = prod.diasAvisoVencimento || 7;
    var venc = new Date(m.dataVencimento+'T12:00:00');
    var diff = Math.ceil((venc - hoje) / 86400000);
    if(diff <= dias) {
      result.push({mov:m, prod:prod, diff:diff, venc:m.dataVencimento});
    }
  });
  return result.sort(function(a,b){return a.diff-b.diff;});
}

// ── MODAL: ENTRADA POR NOTA FISCAL ───────────────────────────────────────────

function renderNFModal() {
  var m = state.nfModal;
  if (!m) return null;
  var prods = estProdutos();

  function totalItem(it) { return (parseFloat(it.quantidade)||0) * (parseFloat(it.custoUnit)||0); }
  function totalNF()     { return (m.itens||[]).reduce(function(a,it){return a+totalItem(it);},0); }

  function addItem() {
    m.itens.push({_id:uid(), produto_id:'', quantidade:'', qtdEmb:'', unidPorEmb:'', custoUnit:''});
    setState({nfModal:m});
  }
  function removeItem(idx) {
    m.itens.splice(idx,1);
    setState({nfModal:m});
  }
  function selectProd(idx, pid) {
    var prd = prods.find(function(p){return p.id===pid;});
    m.itens[idx].produto_id = pid;
    m.itens[idx].custoUnit  = prd ? (prd.custoMedio||(prd.precoEmbalagem||0)) : '';
    if (prd && prd.qtdPorEmbalagem>0) m.itens[idx].unidPorEmb = prd.qtdPorEmbalagem;
    setState({nfModal:m});
  }

  // Render each item row
  function renderItem(it, idx) {
    var prd = prods.find(function(p){return p.id===it.produto_id;});

    // produto selector
    var prodSel = el('select',{class:'form-input',style:{fontSize:'12px'},onchange:function(){selectProd(idx,this.value);}},
      [el('option',{value:''},'— Insumo —')]
      .concat(prods.map(function(p){return el('option',{value:p.id},p.nome+(p.unidade?' ('+p.unidade+')':'')); }))
    );
    prodSel.value = it.produto_id||'';

    var unid = prd ? (prd.unidade||'un') : 'un';

    // Qtd embalagem
    var qtdEmbInp = el('input',{type:'number',class:'form-input',style:{fontSize:'12px',width:'72px'},
      min:'0',step:'1',value:it.qtdEmb||'',placeholder:'Nº emb',
      oninput:function(){
        it.qtdEmb = parseFloat(this.value)||0;
        var u = parseFloat(it.unidPorEmb)||0;
        if(it.qtdEmb>0 && u>0){it.quantidade=it.qtdEmb*u; qtdInp.value=it.quantidade;}
        rowTotalEl.textContent = fmtMoney(totalItem(it));
        grandTotalEl.textContent = fmtMoney(totalNF());
        if(m.valorRealNF){var _i2=m.valorRealNF-totalNF();impostosEl.textContent=(_i2>=0?'+ ':'-')+fmtMoney(Math.abs(_i2));impostosEl.style.color=_i2>0.01?'var(--gold)':_i2<-0.01?'var(--danger)':'var(--text3)';impostosRowEl.style.display=Math.abs(_i2)>0.005?'flex':'none';}
        totalRealEl.textContent = fmtMoney(m.valorRealNF||totalNF());
      }});

    var unidPorEmbInp = el('input',{type:'number',class:'form-input',style:{fontSize:'12px',width:'72px'},
      min:'0',step:'0.001',value:it.unidPorEmb||'',placeholder:'Un/emb',
      oninput:function(){
        it.unidPorEmb = parseFloat(this.value)||0;
        if((parseFloat(it.qtdEmb)||0)>0 && it.unidPorEmb>0){it.quantidade=it.qtdEmb*it.unidPorEmb; qtdInp.value=it.quantidade;}
        rowTotalEl.textContent = fmtMoney(totalItem(it));
        grandTotalEl.textContent = fmtMoney(totalNF());
        if(m.valorRealNF){var _i2=m.valorRealNF-totalNF();impostosEl.textContent=(_i2>=0?'+ ':'-')+fmtMoney(Math.abs(_i2));impostosEl.style.color=_i2>0.01?'var(--gold)':_i2<-0.01?'var(--danger)':'var(--text3)';impostosRowEl.style.display=Math.abs(_i2)>0.005?'flex':'none';}
        totalRealEl.textContent = fmtMoney(m.valorRealNF||totalNF());
      }});

    var qtdInp = el('input',{type:'number',class:'form-input',style:{fontSize:'12px',width:'80px'},
      min:'0',step:'0.001',value:it.quantidade||'',placeholder:'Qtd '+unid,
      oninput:function(){it.quantidade=parseFloat(this.value)||0; rowTotalEl.textContent=fmtMoney(totalItem(it)); grandTotalEl.textContent=fmtMoney(totalNF());}});

    var custoInp = el('input',{type:'number',class:'form-input',style:{fontSize:'12px',width:'90px'},
      min:'0',step:'0.0001',value:it.custoUnit||'',placeholder:'R$/'+unid,
      oninput:function(){it.custoUnit=parseFloat(this.value)||0; rowTotalEl.textContent=fmtMoney(totalItem(it)); grandTotalEl.textContent=fmtMoney(totalNF());}});

    var rowTotalEl = el('span',{style:{fontWeight:'700',color:'var(--blue)',minWidth:'90px',textAlign:'right',fontSize:'13px'}},fmtMoney(totalItem(it)));

    var removeBtn = el('button',{type:'button',style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:'4px 8px',fontSize:'16px'},
      onclick:function(){removeItem(idx);}}, '🗑️');

    return el('div',{style:{
      display:'grid',
      gridTemplateColumns:'minmax(150px,1fr) 70px 70px 80px 90px 90px 32px',
      gap:'6px',alignItems:'center',
      padding:'8px 0',
      borderBottom:'1px solid var(--border)',
    }},[
      prodSel,
      qtdEmbInp,
      unidPorEmbInp,
      qtdInp,
      custoInp,
      rowTotalEl,
      removeBtn,
    ]);
  }

  // Grand total elements (shared refs for live DOM update)
  var grandTotalEl    = el('span',{style:{fontWeight:'700',color:'var(--text2)',fontSize:'14px'}},fmtMoney(totalNF()));
  var impostosEl      = el('span',{style:{fontWeight:'700',color:'var(--gold)',fontSize:'13px'}},'R$ 0,00');
  var totalRealEl     = el('span',{style:{fontWeight:'800',color:'var(--gold)',fontSize:'18px'}},fmtMoney(m.valorRealNF||totalNF()));
  var impostosRowEl   = el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderTop:'1px dashed var(--border)'}},[
    el('span',{style:{fontSize:'12px',color:'var(--gold)'}},'📋 Impostos / Frete (diferença):'),
    impostosEl,
  ]);

  var valorRealInp = el('input',{
    type:'number',class:'form-input',min:'0',step:'0.01',
    value:m.valorRealNF||'',
    placeholder:'Ex: 965,71',
    style:{width:'150px',textAlign:'right',fontWeight:'700'},
    oninput:function(){
      m.valorRealNF = parseFloat(this.value)||0;
      var imp = m.valorRealNF - totalNF();
      impostosEl.textContent = (imp>=0?'+ ':'-')+fmtMoney(Math.abs(imp));
      impostosEl.style.color = imp>0.01?'var(--gold)':imp<-0.01?'var(--danger)':'var(--text3)';
      impostosRowEl.style.display = Math.abs(imp)>0.005 ? 'flex' : 'none';
      totalRealEl.textContent = fmtMoney(m.valorRealNF||totalNF());
    },
  });
  // init impostos row visibility
  var _impInit = (m.valorRealNF||0) - totalNF();
  impostosRowEl.style.display = Math.abs(_impInit)>0.005 ? 'flex' : 'none';
  if (m.valorRealNF) {
    impostosEl.textContent = (_impInit>=0?'+ ':'-')+fmtMoney(Math.abs(_impInit));
    impostosEl.style.color = _impInit>0.01?'var(--gold)':_impInit<-0.01?'var(--danger)':'var(--text3)';
  }

  // Conta a pagar section
  var despVencInp = el('input',{type:'date',class:'form-input',value:m.despVenc||today(),oninput:function(){m.despVenc=this.value;}});
  var despFormSel = el('select',{class:'form-input',onchange:function(){setState({nfModal:Object.assign({},m,{despFormPgto:this.value})});}},
    ['Boleto','PIX','Transferência','Cartão','Dinheiro','Parcelado'].map(function(f){return el('option',{value:f},f);}));
  despFormSel.value = m.despFormPgto||'Boleto';

  var despParcInp = el('input',{type:'number',class:'form-input',min:'2',max:'24',step:'1',
    value:m.despParcelas||2,oninput:function(){m.despParcelas=parseInt(this.value)||2;}});

  var fornecedores = (state.fornecedores||[]).filter(function(f){return f.profile===state.profile;});
  var bancos = (state.bancos||[]).filter(function(b){return b.profile===state.profile;});

  var cnpjInp = el('input',{type:'text',class:'form-input',value:m.cnpj||'',placeholder:'Preenchido automaticamente',
    oninput:function(){m.cnpj=this.value;}});

  var despBancoSel = el('select',{class:'form-input',onchange:function(){m.despBanco=this.value;}},
    [el('option',{value:''},'— Selecione o banco —')]
    .concat(bancos.map(function(b){return el('option',{value:b.id},b.nome+(b.saldo!=null?' · '+fmtMoney(b.saldo):''));}))
  );
  despBancoSel.value = m.despBanco||'';

  var despCampos = m.gerarDespesa ? el('div',{style:{
    marginTop:'12px',padding:'14px',background:'var(--bg3)',
    border:'1px solid var(--gold)',borderRadius:'8px',
    display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',
  }},[
    el('div',{},[el('label',{class:'form-label'},'Vencimento'),despVencInp]),
    el('div',{},[el('label',{class:'form-label'},'Forma de pagamento'),despFormSel]),
    m.despFormPgto==='Parcelado' ? el('div',{},[el('label',{class:'form-label'},'Nº de parcelas'),despParcInp]) : null,
    el('div',{style:{gridColumn:m.despFormPgto==='Parcelado'?'auto':'1/-1'}},[
      el('label',{class:'form-label'},'Banco / Conta'),
      bancos.length>0 ? despBancoSel
        : el('input',{type:'text',class:'form-input',value:m.despBanco||'',placeholder:'Nenhum banco cadastrado',
            oninput:function(){m.despBanco=this.value;}}),
    ]),
  ].filter(Boolean)) : null;

  var cbGerarDesp = el('input',{type:'checkbox',id:'_nfgerardesp',style:{marginRight:'6px'}});
  cbGerarDesp.checked = !!m.gerarDespesa;
  cbGerarDesp.onchange = function(){ setState({nfModal:Object.assign({},m,{gerarDespesa:this.checked})}); };

  function salvarNF() {
    if (!m.fornecedor) { alert('Informe o fornecedor.'); return; }
    var itens = (m.itens||[]).filter(function(it){return it.produto_id && (parseFloat(it.quantidade)||0)>0;});
    if (!itens.length) { alert('Adicione pelo menos um item com produto e quantidade.'); return; }

    var novosProd  = (state.produtos||[]).slice();
    var novosMovs  = (state.movEstoque||[]).slice();
    var novasContas = (state.contas||[]).slice();
    var nfTotal    = 0;

    itens.forEach(function(it){
      var qtd    = parseFloat(it.quantidade)||0;
      var custo  = parseFloat(it.custoUnit)||0;
      nfTotal   += qtd * custo;
      var prodIdx = novosProd.findIndex(function(p){return p.id===it.produto_id;});
      if (prodIdx<0) return;
      var prod   = novosProd[prodIdx];
      var novoCusto = calcCustoMedioNovo(prod.estoqueAtual||0, prod.custoMedio||0, qtd, custo);
      novosProd[prodIdx] = Object.assign({},prod,{estoqueAtual:(prod.estoqueAtual||0)+qtd, custoMedio:novoCusto});
      novosMovs.push({
        id:uid(), profile:state.profile,
        produto_id:it.produto_id, produtoNome:prod.nome,
        tipo:'entrada', motivo:'Nota Fiscal',
        data:m.dataEntrada||today(),
        quantidade:qtd, custoUnitario:custo,
        nfNumero:m.numero||'', nfFornecedor:m.fornecedor,
        obs:'NF '+(m.numero||'')+'  '+m.fornecedor,
      });
    });

    var vlConta = (m.valorRealNF && m.valorRealNF>0) ? m.valorRealNF : nfTotal;
    if (m.gerarDespesa && vlConta>0) {
      var fpg   = m.despFormPgto||'Boleto';
      var nParc = fpg==='Parcelado' ? (parseInt(m.despParcelas)||2) : 1;
      var vlParc = vlConta/nParc;
      for (var pi=0;pi<nParc;pi++) {
        var vd = new Date((m.despVenc||today())+'T12:00:00');
        vd.setMonth(vd.getMonth()+pi);
        var vdStr = vd.getFullYear()+'-'+String(vd.getMonth()+1).padStart(2,'0')+'-'+String(vd.getDate()).padStart(2,'0');
        novasContas.push({
          id:uid(), profile:state.profile,
          tipo:'pagar', categoria:'Estoque / Insumos',
          descricao:'NF '+(m.numero?m.numero+' — ':'')+m.fornecedor+(nParc>1?' ('+(pi+1)+'/'+nParc+')':''),
          valor:vlParc, vencimento:vdStr,
          formaPgto:fpg, banco:m.despBanco||'', bancoId:m.despBanco||'',
          status:'pendente', pago:false, data:today(),
        });
      }
    }

    var nfRecord = {
      id:uid(), profile:state.profile,
      numero:m.numero||'', fornecedor:m.fornecedor, cnpj:m.cnpj||'',
      dataEmissao:m.dataEmissao||today(), dataEntrada:m.dataEntrada||today(),
      itens:itens, total:nfTotal, data:today(),
    };
    lsSet('produtos',novosProd);lsSet('movEstoque',novosMovs);lsSet('contas',novasContas);
    var novasNFs=(state.notasFiscais||[]).concat([nfRecord]);lsSet('notasFiscais',novasNFs);
    setState({produtos:novosProd,movEstoque:novosMovs,contas:novasContas,notasFiscais:novasNFs,nfModal:null});
    scheduleSave();
  }

  var modalEl = el('div',{class:'modal-overlay'},[
    el('div',{class:'modal-box',style:{maxWidth:'820px',width:'96vw',maxHeight:'92vh',overflow:'auto'}},[

      // Cabeçalho
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}},[
        el('div',{},[
          el('h3',{style:{margin:'0',fontSize:'18px',color:'var(--text)'}},'📄 Entrada por Nota Fiscal'),
          el('div',{style:{fontSize:'12px',color:'var(--text3)',marginTop:'3px'}},'Todos os itens entram no estoque e atualizam o custo médio ponderado'),
        ]),
        el('button',{class:'btn-ghost',style:{padding:'4px 10px'},onclick:function(){setState({nfModal:null});}},'✕'),
      ]),

      // Dados da NF
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'18px',
        background:'var(--bg3)',padding:'14px',borderRadius:'8px',border:'1px solid var(--border)'}},[
        el('div',{},[
          el('label',{class:'form-label'},'Fornecedor *'),
          el('input',{type:'text',class:'form-input',value:m.fornecedor||'',placeholder:'Nome do fornecedor',
            list:'_nf_forn_list',
            oninput:function(){
              m.fornecedor = this.value;
              var match = fornecedores.find(function(f){
                return (f.nome||f.razaoSocial||'').toLowerCase() === (this.value||'').toLowerCase();
              }.bind(this));
              if (match && match.documento) {
                m.cnpj = match.documento;
                cnpjInp.value = match.documento;
              }
            }}),
          el('datalist',{id:'_nf_forn_list'},
            fornecedores.map(function(f){return el('option',{value:f.nome||f.razaoSocial||''});})),
        ]),
        el('div',{},[
          el('label',{class:'form-label'},'Nº da NF'),
          el('input',{type:'text',class:'form-input',value:m.numero||'',placeholder:'Ex: 000123',
            oninput:function(){m.numero=this.value;}}),
        ]),
        el('div',{},[
          el('label',{class:'form-label'},'CNPJ do fornecedor'),
          cnpjInp,
        ]),
        el('div',{},[
          el('label',{class:'form-label'},'Data de emissão'),
          el('input',{type:'date',class:'form-input',value:m.dataEmissao||today(),
            oninput:function(){m.dataEmissao=this.value;}}),
        ]),
        el('div',{},[
          el('label',{class:'form-label'},'Data de entrada'),
          el('input',{type:'date',class:'form-input',value:m.dataEntrada||today(),
            oninput:function(){m.dataEntrada=this.value;}}),
        ]),
        el('div',{},[
          el('label',{class:'form-label'},'Chave de acesso (NF-e)'),
          el('input',{type:'text',class:'form-input',value:m.chaveAcesso||'',placeholder:'44 dígitos (opcional)',
            oninput:function(){m.chaveAcesso=this.value;}}),
        ]),
      ]),

      // Header da tabela de itens
      el('div',{style:{display:'grid',
        gridTemplateColumns:'minmax(150px,1fr) 70px 70px 80px 90px 90px 32px',
        gap:'6px',padding:'6px 0',borderBottom:'2px solid var(--border)',
        fontSize:'11px',fontWeight:'700',color:'var(--gold)',letterSpacing:'.5px',marginBottom:'4px'}},[
        el('span',{},'PRODUTO / INSUMO'),
        el('span',{},'Nº EMB'),
        el('span',{},'UN/EMB'),
        el('span',{},'QUANTIDADE'),
        el('span',{},'CUSTO UNIT.'),
        el('span',{style:{textAlign:'right'}},'TOTAL'),
        el('span',{},''),
      ]),

      // Itens
      el('div',{id:'_nf_itens'},
        (m.itens||[]).map(function(it,idx){ return renderItem(it,idx); })
      ),

      // Botão adicionar item
      el('div',{style:{marginTop:'10px'}},[
        el('button',{type:'button',class:'btn-ghost',style:{fontSize:'13px',padding:'7px 14px'},
          onclick:addItem},'+ Adicionar item'),
      ]),

      // Total da NF
      el('div',{style:{
        margin:'16px 0',padding:'14px 16px',
        background:'var(--bg3)',borderRadius:'8px',border:'1px solid var(--border)',
      }},[
        el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}},[
          el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Σ Produtos / insumos:'),
          grandTotalEl,
        ]),
        impostosRowEl,
        el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'2px solid var(--border)',paddingTop:'10px',marginTop:'6px'}},[
          el('div',{},[
            el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--text)',marginBottom:'4px'}},'Valor total da NF (real)'),
            el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Informe o valor exato da nota para calcular impostos/frete'),
          ]),
          el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[
            el('span',{style:{fontSize:'13px',color:'var(--text3)'}},'R$'),
            valorRealInp,
          ]),
        ]),
        el('div',{style:{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'8px',marginTop:'10px',paddingTop:'8px',borderTop:'1px solid var(--border)'}},[
          el('span',{style:{fontSize:'14px',color:'var(--text3)'}},'Total a pagar:'),
          totalRealEl,
        ]),
      ]),

      // Gerar conta a pagar
      el('div',{style:{marginBottom:'14px'}},[
        el('label',{style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'var(--text)'}},[
          cbGerarDesp,
          el('span',{},'Gerar conta a pagar vinculada a esta NF'),
        ]),
        despCampos,
      ]),

      // Ações
      el('div',{style:{display:'flex',gap:'10px',justifyContent:'flex-end',paddingTop:'14px',borderTop:'1px solid var(--border)'}},[
        el('button',{class:'btn-ghost',onclick:function(){setState({nfModal:null});}}, 'Cancelar'),
        el('button',{class:'btn-primary',style:{padding:'10px 28px'},onclick:salvarNF},'✅ Registrar NF no Estoque'),
      ]),

    ]),
  ]);

  return modalEl;
}

// ── RENDER PRINCIPAL ──────────────────────────────────────────────────────────

function renderEstoque() {
  var tab      = state.estTab || 'produtos';
  var prods    = estProdutos();
  var criticos = prods.filter(function(p){return p.estoqueMinimo>0&&p.estoqueAtual>0&&p.estoqueAtual<=p.estoqueMinimo;}).length;
  var zerados  = prods.filter(function(p){return p.estoqueAtual<=0&&p.estoqueMinimo>0;}).length;
  var badge    = criticos+zerados;

  var TABS = [
    {id:'produtos',label:'⚙️ Insumos',     badge:badge>0?String(badge):null},
    {id:'movs',    label:'↕️ Movimentações'},
    {id:'cmv',     label:'📊 CMV'},
    {id:'abc',     label:'🔢 Curva ABC'},
  ];

  var tabNav = el('div',{style:{display:'flex',gap:'4px',marginBottom:'16px',background:'var(--bg3)',padding:'4px',borderRadius:'10px',flexWrap:'wrap'}},
    TABS.map(function(t){
      var active = tab===t.id;
      return el('button',{
        style:{flex:'1',padding:'7px 10px',borderRadius:'7px',border:'none',cursor:'pointer',fontFamily:'inherit',
          background:active?'var(--bg2)':'transparent',
          color:active?'var(--gold)':'var(--text3)',
          fontWeight:active?'700':'500',fontSize:'12px',
          boxShadow:active?'0 1px 4px rgba(0,0,0,.15)':'none',
          display:'flex',alignItems:'center',justifyContent:'center',gap:'5px',transition:'all .15s',
        },
        onclick:function(){setState({estTab:t.id});},
      },[
        t.label,
        t.badge ? el('span',{style:{background:'var(--danger)',color:'#fff',borderRadius:'10px',padding:'1px 6px',fontSize:'9px',fontWeight:'800'}},t.badge) : null,
      ].filter(Boolean));
    })
  );

  function _abrirNF() {
    setState({nfModal:{
      numero:'', fornecedor:'', cnpj:'', chaveAcesso:'',
      dataEmissao:today(), dataEntrada:today(),
      itens:[{_id:uid(), produto_id:'', quantidade:'', qtdEmb:'', unidPorEmb:'', custoUnit:''}],
      valorRealNF:0,
      gerarDespesa:false, despVenc:today(), despFormPgto:'Boleto', despParcelas:2, despBanco:'',
    }});
  }

  var acoes = [];
  if (tab==='produtos') {
    acoes.push(btn('btn-ghost','🔧 Ajuste',function(){setState({movModal:{tipo:'ajuste',data:today()}});}));
    acoes.push(btn('btn-ghost','📥 Entrada avulsa',function(){setState({movModal:{tipo:'entrada',data:today()}});}));
    acoes.push(btn('btn-secondary','📄 Nota Fiscal',_abrirNF));
    acoes.push(btn('btn-primary','+ Cadastrar Insumo',function(){setState({produtoModal:{tipo:'insumo'}});}));
  }
  if (tab==='movs') {
    acoes.push(btn('btn-ghost','📥 Entrada avulsa',function(){setState({movModal:{tipo:'entrada',data:today()}});}));
    acoes.push(btn('btn-secondary','📄 Nota Fiscal',_abrirNF));
    acoes.push(btn('btn-ghost','📤 Saída',function(){setState({movModal:{tipo:'saida',data:today()}});}));
  }

  var vencendo = _lotesVencendoEmBreve();
  var bannerVenc = vencendo.length ? el('div',{style:{
    background:'rgba(224,82,82,0.12)',border:'1px solid var(--red)',borderRadius:'8px',
    padding:'10px 14px',marginBottom:'14px',fontSize:'12px',color:'var(--red)',
    display:'flex',alignItems:'flex-start',gap:'8px'
  }},[
    el('span',{},'⚠️'),
    el('div',{},[
      el('b',{},'Lotes próximos ao vencimento: '),
      vencendo.map(function(v){
        return el('span',{style:{marginRight:'12px'}},
          (v.prod.nome||'')+(v.mov.lote?' lote '+v.mov.lote:'')+' — '+
          (v.diff<0?'vencido há '+Math.abs(v.diff)+'d':v.diff===0?'vence hoje':'vence em '+v.diff+'d')+' ('+v.venc+')'
        );
      }),
    ]),
  ]) : null;

  var content =
    tab==='produtos' ? renderEstProdutos() :
    tab==='movs'     ? renderEstMovs()     :
    tab==='cmv'      ? renderEstCMV()      :
                       renderEstABC();

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'⚙️ Estoque & CMV'),
        el('p',{class:'page-sub'},prods.length+' insumos ativos · Valor: '+fmtMoney(calcValorEstoque())),
      ]),
      acoes.length ? el('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap'}},acoes) : null,
    ].filter(Boolean)),
    bannerVenc,
    tabNav,
    content,
    state.produtoModal!==null ? renderProdutoModal() : null,
    state.movModal!==null     ? renderMovModal()     : null,
    state.nfModal!==null      ? renderNFModal()      : null,
    state.estCatManager  ? renderEstCatManager()  : null,
    state.estUnidManager ? renderEstUnidManager() : null,
  ].filter(Boolean));
}
