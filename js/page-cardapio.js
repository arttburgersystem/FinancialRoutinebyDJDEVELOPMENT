// ── CARDÁPIO ──────────────────────────────────────────────────────────────────

var _cardBusca   = '';
var _cardCatFlt  = '';
var _cardSetFlt  = '';

function renderCardapio() {
  var perfil   = state.profile;
  var todos    = (state.produtos||[]).filter(function(p){ return p.profile===perfil && p.tipo==='produto' && p.ativo!==false; });
  var setores  = (state.setoresImpressao||[]).filter(function(s){ return s.profile===perfil; });
  var cats     = estCats();

  // ── Filtros ─────────────────────────────────────────────────────────────────

  var buscaInp = el('input',{
    class:'form-input',
    placeholder:'🔍 Buscar item do cardápio...',
    value:_cardBusca,
    oninput:function(){ _cardBusca=this.value; setState({}); },
    style:{maxWidth:'300px'},
  });

  // Barra de categorias
  var catBtns = [el('button',{
    style:{padding:'6px 14px',borderRadius:'20px',border:'2px solid '
      +(_cardCatFlt===''?'var(--gold)':'var(--border)'),
      background:_cardCatFlt===''?'var(--gold-dim)':'var(--bg3)',
      color:_cardCatFlt===''?'var(--gold)':'var(--text3)',
      fontWeight:_cardCatFlt===''?'700':'500',fontSize:'12px',cursor:'pointer',
      fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .15s'},
    onclick:function(){_cardCatFlt='';setState({});}
  },'Todas')].concat(
    cats.map(function(c){
      var ativo = _cardCatFlt===c;
      return el('button',{
        style:{padding:'6px 14px',borderRadius:'20px',border:'2px solid '+(ativo?'var(--gold)':'var(--border)'),
          background:ativo?'var(--gold-dim)':'var(--bg3)',
          color:ativo?'var(--gold)':'var(--text3)',
          fontWeight:ativo?'700':'500',fontSize:'12px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',transition:'all .15s'},
        onclick:function(){_cardCatFlt=c;setState({});}
      },c);
    })
  );

  var catBar = el('div',{style:{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'4px',flexWrap:'nowrap'}},catBtns);

  // Barra de setores
  var setorBtns = [el('button',{
    style:{padding:'6px 12px',borderRadius:'20px',border:'2px solid '
      +(_cardSetFlt===''?'var(--blue)':'var(--border)'),
      background:_cardSetFlt===''?'rgba(37,99,235,.12)':'var(--bg3)',
      color:_cardSetFlt===''?'var(--blue)':'var(--text3)',
      fontWeight:_cardSetFlt===''?'700':'500',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'},
    onclick:function(){_cardSetFlt='';setState({});}
  },'🖨️ Todos os setores')].concat(
    setores.map(function(s){
      var ativo=_cardSetFlt===s.id;
      return el('button',{
        style:{padding:'6px 12px',borderRadius:'20px',border:'2px solid '+(ativo?s.cor||'var(--gold)':'var(--border)'),
          background:ativo?(s.cor||'var(--gold)')+'22':'var(--bg3)',
          color:ativo?(s.cor||'var(--gold)'):'var(--text3)',
          fontWeight:ativo?'700':'500',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'},
        onclick:function(){_cardSetFlt=s.id;setState({});}
      },s.nome);
    })
  );
  var setorBar = setores.length ? el('div',{style:{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'4px',flexWrap:'nowrap'}},setorBtns) : null;

  // ── Filtrar itens ─────────────────────────────────────────────────────────
  var visivel = todos.filter(function(p){
    if (_cardBusca && !p.nome.toLowerCase().includes(_cardBusca.toLowerCase()) &&
        !(p.descricaoCard||'').toLowerCase().includes(_cardBusca.toLowerCase())) return false;
    if (_cardCatFlt && p.categoria !== _cardCatFlt) return false;
    if (_cardSetFlt && p.setorImpressao !== _cardSetFlt) return false;
    return true;
  });

  // ── Cards ─────────────────────────────────────────────────────────────────
  function cardItem(p) {
    var setor = setores.find(function(s){return s.id===p.setorImpressao;});
    var margem = (p.precoVenda>0&&p.custoMedio>0)?((1-p.custoMedio/p.precoVenda)*100).toFixed(1):null;

    var imgEl = p.imagemUrl
      ? el('img',{src:p.imagemUrl,alt:p.nome,style:{width:'100%',height:'120px',objectFit:'cover',borderRadius:'8px 8px 0 0',display:'block'}})
      : el('div',{style:{width:'100%',height:'80px',background:'var(--bg3)',borderRadius:'8px 8px 0 0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'32px'}},'🍽️');

    var dispToggle = el('button',{title:p.disponivel!==false?'Marcar como indisponível':'Marcar como disponível'});
    dispToggle.style.cssText='padding:4px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);'
      +'font-size:11px;cursor:pointer;font-family:inherit;color:'+(p.disponivel!==false?'var(--green)':'var(--danger)')+';font-weight:700;';
    dispToggle.textContent = p.disponivel!==false ? '✅ Disponível' : '❌ Indisponível';
    dispToggle.onclick = function(){
      var novos=(state.produtos||[]).map(function(x){return x.id===p.id?Object.assign({},x,{disponivel:!(p.disponivel!==false)}):x;});
      lsSet('produtos',novos);
      setState({produtos:novos});
      scheduleSave();
    };

    var editBtn = el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({produtoModal:Object.assign({},p)});}});
    editBtn.textContent='✏️';

    var card = el('div',{});
    card.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;'
      +'display:flex;flex-direction:column;transition:border .15s;opacity:'+(p.disponivel!==false?'1':'.55')+';';
    card.onmouseenter=function(){this.style.borderColor='var(--gold)';};
    card.onmouseleave=function(){this.style.borderColor='var(--border)';};

    var body = el('div',{style:{padding:'10px 12px',flex:'1'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}},[
        el('div',{style:{fontWeight:'700',fontSize:'13px',flex:'1',marginRight:'6px'}},p.nome),
        editBtn,
      ]),
      p.descricaoCard?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'6px',lineHeight:'1.4'}},p.descricaoCard):null,
      el('div',{style:{display:'flex',gap:'4px',flexWrap:'wrap',marginBottom:'6px'}},[
        el('span',{style:{fontSize:'10px',fontWeight:'600',padding:'2px 7px',borderRadius:'8px',background:'var(--bg3)',color:'var(--text3)'}},p.categoria),
        setor?el('span',{style:{fontSize:'10px',fontWeight:'600',padding:'2px 7px',borderRadius:'8px',background:(setor.cor||'var(--gold)')+'22',color:setor.cor||'var(--gold)'}},'🖨️ '+setor.nome):null,
      ].filter(Boolean)),
      el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'4px'}},[
        el('div',{style:{fontWeight:'700',fontSize:'15px',color:'var(--gold)'}},p.precoVenda>0?fmtMoney(p.precoVenda):'—'),
        margem?el('div',{style:{fontSize:'10px',color:'var(--green)',fontWeight:'600'}},margem+'% margem'):null,
      ].filter(Boolean)),
    ].filter(Boolean));

    var footer = el('div',{style:{padding:'6px 12px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}},[
      dispToggle,
      el('div',{style:{fontSize:'10px',color:'var(--text3)'}},'custo: '+fmtMoney(p.custoMedio||0)),
    ]);

    card.appendChild(imgEl);
    card.appendChild(body);
    card.appendChild(footer);
    return card;
  }

  var grid = el('div',{style:{
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',
    gap:'14px',
    marginTop:'16px',
  }},
    visivel.length===0
      ? [el('div',{style:{gridColumn:'1/-1'}},div('empty',[
          div('empty-icon','🍽️'),
          div('empty-title','Nenhum item encontrado'),
          el('p',{style:{fontSize:'13px',color:'var(--text3)'}},'Crie produtos com tipo "Produto" em Estoque & CMV para aparecerem aqui.'),
        ]))]
      : visivel.map(cardItem)
  );

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'🍽️ Cardápio'),
        el('p',{class:'page-sub'},todos.length+' itens · '+visivel.length+' exibidos'),
      ]),
      el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[
        buscaInp,
        btn('btn-ghost','🖨️ Setores',function(){setState({page:'impressoes'});}),
      ]),
    ]),
    el('div',{class:'card',style:{marginBottom:'12px'}},[
      el('div',{style:{marginBottom:'8px'}},[
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'6px',fontWeight:'600'}},'FILTRAR POR CATEGORIA'),
        catBar,
      ]),
      setorBar ? el('div',{},[
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'6px',fontWeight:'600',marginTop:'10px'}},'FILTRAR POR SETOR DE IMPRESSÃO'),
        setorBar,
      ]) : null,
    ].filter(Boolean)),
    grid,
  ]);
}
