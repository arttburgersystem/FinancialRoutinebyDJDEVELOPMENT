// ── TELA DE TRANSFERÊNCIA ENTRE ESTOQUES (Tablet Kiosk) ──────────────────────
// Acessível via state.reqMode = true
// Retira itens do Estoque Estacionado (estoqueItens) e envia para o Estoque Rotativo

function renderRequisicao() {
  var pf = state.profile;
  var itens = (state.estoqueItens || [])
    .filter(function(x){ return x.profile === pf; })
    .sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); });
  var funcs = (state.funcionarios || []).filter(function(f){
    return (f.profile===pf||!f.profile) && f.status==='ativo' && f.senhaRequisicao;
  }).sort(function(a,b){ return a.nome.localeCompare(b.nome); });

  var session  = state.reqSession   || null;  // {funcId,funcNome,funcCargo}
  var carrinho = state.reqCarrinho  || [];    // [{insumoId,nome,unidade,qtd,estoqueAtual,custoMedio}]
  var pinSt    = state.reqPin       || null;  // {funcId,value,erro}
  var qtdMdl   = state.reqQtdModal  || null;  // {item:{...estoqueItem},qtd:''}
  var busca    = state.reqBusca     || '';

  // ── ROOT ──────────────────────────────────────────────────────────────────
  var root = el('div', {style: {
    position:'fixed',inset:'0',background:'var(--k-bg)',
    display:'flex',flexDirection:'column',zIndex:'9000',
    color:'var(--k-text)',fontFamily:"system-ui,-apple-system,sans-serif",
    touchAction:'manipulation',WebkitUserSelect:'none',userSelect:'none',
  }});

  // ── HEADER ────────────────────────────────────────────────────────────────
  var hdr = el('div',{style:{
    display:'flex',alignItems:'center',gap:'12px',
    padding:'14px 20px',background:'var(--k-bg2)',
    borderBottom:'2px solid var(--k-border)',flexShrink:'0',
  }});
  hdr.appendChild(el('div',{style:{flex:'1'}},[
    el('div',{style:{fontSize:'18px',fontWeight:'800',color:'var(--k-accent)'}},'🔄 Transferência entre Estoques'),
    el('div',{style:{fontSize:'11px',color:'var(--k-text4)',marginTop:'2px',fontWeight:'600',letterSpacing:'.03em'}},'📦 Estoque Estacionado  →  🔁 Estoque Rotativo'),
  ]));

  if (session) {
    hdr.appendChild(el('div',{style:{
      padding:'7px 16px',background:'var(--k-border)',borderRadius:'20px',
      fontSize:'14px',fontWeight:'700',color:'var(--k-text)',
      display:'flex',alignItems:'center',gap:'7px',
    }},'👤 '+session.funcNome));
    if (carrinho.length > 0) {
      hdr.appendChild(el('div',{style:{
        position:'relative',display:'inline-flex',alignItems:'center',
        fontSize:'22px',lineHeight:'1',
      }},[
        '🛒',
        el('span',{style:{
          position:'absolute',top:'-6px',right:'-8px',
          background:'#f59e0b',color:'#000',borderRadius:'50%',
          width:'18px',height:'18px',fontSize:'11px',fontWeight:'900',
          display:'flex',alignItems:'center',justifyContent:'center',
        }},String(carrinho.length)),
      ]));
    }
  }

  var exitBtn = el('button',{style:{
    background:'#dc2626',color:'#fff',border:'none',borderRadius:'10px',
    padding:'10px 20px',cursor:'pointer',fontSize:'14px',fontWeight:'700',
    flexShrink:'0',
  }},session?'⬅ Sair':'✕ Fechar');
  exitBtn.onclick = function(){
    if(session){
      setState({reqSession:null,reqCarrinho:[],reqPin:null,reqQtdModal:null,reqBusca:''});
    } else if(window.DJF_KIOSK_BOOT && typeof lockApp==='function'){
      // Tablet dedicado (aberto via link direto): fechar exige a PIN geral do sistema,
      // em vez de abrir o app completo sem proteção.
      lockApp();
    } else {
      setState({reqMode:false,reqSession:null,reqCarrinho:[],reqPin:null,reqBusca:'',reqQtdModal:null});
    }
  };
  // Botão do painel do desenvolvedor (sempre visível, exige PIN ao clicar)
  var devBtn=el('button',{title:'Painel do desenvolvedor',style:{
    background:'none',border:'1px solid var(--k-border)',borderRadius:'8px',
    color:'var(--k-text3)',cursor:'pointer',padding:'7px 10px',fontSize:'16px',
    flexShrink:'0',lineHeight:'1',
  }},'🔑');
  devBtn.onclick=function(){setState({reqDevModal:{step:'pin',pinVal:'',pinErro:false}});};
  hdr.appendChild(devBtn);
  if(typeof _kioskThemeBtn==='function')hdr.appendChild(_kioskThemeBtn());
  hdr.appendChild(exitBtn);
  root.appendChild(hdr);

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!session) {
    var loginWrap = el('div',{style:{
      flex:'1',overflowY:'auto',padding:'40px 20px',
      display:'flex',flexDirection:'column',alignItems:'center',
    }});

    loginWrap.appendChild(el('div',{style:{
      fontSize:'18px',fontWeight:'700',color:'var(--k-text2)',
      marginBottom:'36px',textAlign:'center',letterSpacing:'-.01em',
    }},'🔐  Selecione seu nome para continuar'));

    if (funcs.length === 0) {
      loginWrap.appendChild(el('div',{style:{
        textAlign:'center',padding:'48px 32px',background:'var(--k-bg2)',
        borderRadius:'20px',maxWidth:'480px',width:'100%',
        border:'1px solid var(--k-border)',
      }},[
        el('div',{style:{fontSize:'52px',marginBottom:'16px'}},'⚠'),
        el('div',{style:{fontWeight:'700',fontSize:'16px',color:'var(--k-text)',marginBottom:'10px'}},'Nenhum funcionário configurado'),
        el('div',{style:{fontSize:'13px',color:'var(--k-text3)',lineHeight:'1.7'}},
          'Vá em Funcionários → edite um funcionário ativo → defina o PIN de 4 dígitos na seção "Acesso ao Tablet".'),
      ]));
    } else {
      var empGrid = el('div',{style:{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',
        gap:'16px',maxWidth:'700px',width:'100%',
      }});
      funcs.forEach(function(f){
        var card = el('div',{style:{
          background:'var(--k-bg2)',border:'2px solid var(--k-border)',borderRadius:'18px',
          padding:'28px 14px',display:'flex',flexDirection:'column',
          alignItems:'center',gap:'10px',cursor:'pointer',
          transition:'border-color .15s,background .15s',
          minHeight:'150px',justifyContent:'center',
        }});
        card.onmouseenter=function(){card.style.borderColor='var(--k-accent2)';card.style.background='rgba(29,78,216,.15)';};
        card.onmouseleave=function(){card.style.borderColor='var(--k-border)';card.style.background='var(--k-bg2)';};
        card.appendChild(el('div',{style:{fontSize:'44px',lineHeight:'1'}},'👤'));
        card.appendChild(el('div',{style:{fontWeight:'800',fontSize:'16px',color:'var(--k-text)',textAlign:'center',lineHeight:'1.3'}},f.nome));
        if(f.cargo)card.appendChild(el('div',{style:{fontSize:'12px',color:'var(--k-text2)',textAlign:'center'}},f.cargo));
        !function(fn){
          card.onclick=function(){setState({reqPin:{funcId:fn.id,value:'',erro:false}});};
        }(f);
        empGrid.appendChild(card);
      });
      loginWrap.appendChild(empGrid);
    }
    root.appendChild(loginWrap);

    // PIN overlay
    if (pinSt) {
      var pinFunc = funcs.find(function(x){return x.id===pinSt.funcId;});
      if (pinFunc) {
        var pinOv = el('div',{
          tabIndex:'-1',
          style:{
            position:'absolute',inset:'0',background:'var(--k-overlay)',
            display:'flex',alignItems:'center',justifyContent:'center',zIndex:'200',
            outline:'none',
          },
        });
        var pinBox = el('div',{style:{
          background:'var(--k-bg2)',borderRadius:'22px',padding:'32px 28px',
          width:'300px',maxWidth:'90vw',border:'2px solid var(--k-border)',
          boxShadow:'0 30px 80px var(--k-overlay)',
        }});
        // Avatar + name
        pinBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'22px'}},[
          el('div',{style:{fontSize:'52px',lineHeight:'1'}},'👤'),
          el('div',{style:{fontWeight:'800',fontSize:'19px',color:'var(--k-text)',marginTop:'10px'}},pinFunc.nome),
          pinFunc.cargo?el('div',{style:{fontSize:'12px',color:'var(--k-text2)',marginTop:'4px'}},pinFunc.cargo):null,
        ].filter(Boolean)));
        // Dots
        var dotsEl = el('div',{style:{display:'flex',gap:'14px',justifyContent:'center',marginBottom:'8px'}});
        for(var d=0;d<4;d++){
          dotsEl.appendChild(el('div',{style:{
            width:'20px',height:'20px',borderRadius:'50%',transition:'all .12s',
            background:d<pinSt.value.length?'var(--k-accent2)':'transparent',
            border:'2px solid '+(d<pinSt.value.length?'var(--k-accent2)':'var(--k-text4)'),
          }}));
        }
        pinBox.appendChild(dotsEl);
        pinBox.appendChild(el('div',{style:{
          textAlign:'center',minHeight:'22px',fontSize:'13px',fontWeight:'700',
          color:'#f87171',marginBottom:'14px',
        }},pinSt.erro?'❌ PIN incorreto — tente novamente':''));
        // Pressiona uma tecla do teclado do PIN (clique no botão ou teclado físico/numérico)
        function pressPinKey(key, fn){
          var cur=(state.reqPin||{}).value||'';
          if(key==='←'){
            setState({reqPin:{funcId:fn.id,value:cur.slice(0,-1),erro:false}});
          } else if(key==='✓'){
            var v=(state.reqPin||{}).value||'';
            if(v===fn.senhaRequisicao){
              setState({reqSession:{funcId:fn.id,funcNome:fn.nome,funcCargo:fn.cargo||''},reqPin:null,reqCarrinho:[]});
            } else {
              setState({reqPin:{funcId:fn.id,value:'',erro:true}});
            }
          } else if(cur.length<4){
            var nova=cur+key;
            setState({reqPin:{funcId:fn.id,value:nova,erro:false}});
            if(nova.length===4){
              setTimeout(function(){
                var st=state.reqPin;
                if(!st||st.funcId!==fn.id)return;
                if(st.value===fn.senhaRequisicao){
                  setState({reqSession:{funcId:fn.id,funcNome:fn.nome,funcCargo:fn.cargo||''},reqPin:null,reqCarrinho:[]});
                } else {
                  setState({reqPin:{funcId:fn.id,value:'',erro:true}});
                }
              },300);
            }
          }
        }
        // Habilita digitação via teclado físico/numérico (além do toque nos botões)
        pinOv.onkeydown=function(ev){
          var key=ev.key;
          if(key>='0'&&key<='9'){ev.preventDefault();pressPinKey(key,pinFunc);}
          else if(key==='Backspace'){ev.preventDefault();pressPinKey('←',pinFunc);}
          else if(key==='Enter'){ev.preventDefault();pressPinKey('✓',pinFunc);}
          else if(key==='Escape'){ev.preventDefault();setState({reqPin:null});}
        };
        // Keypad
        var kpad = el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}});
        ['1','2','3','4','5','6','7','8','9','←','0','✓'].forEach(function(k){
          var bgK = k==='✓'?'#1d4ed8':k==='←'?'var(--k-btn-back)':'var(--k-border)';
          var kb = el('button',{style:{
            background:bgK,color:'var(--k-text)',border:'none',borderRadius:'12px',
            padding:'19px 10px',fontSize:'22px',fontWeight:'700',cursor:'pointer',lineHeight:'1',
          }},k);
          kb.onmouseenter=function(){kb.style.opacity='.8';};
          kb.onmouseleave=function(){kb.style.opacity='1';};
          !function(key,fn){
            kb.onclick=function(){pressPinKey(key,fn);};
          }(k,pinFunc);
          kpad.appendChild(kb);
        });
        pinBox.appendChild(kpad);
        var cancelPin=el('button',{style:{
          width:'100%',marginTop:'14px',background:'transparent',
          color:'var(--k-text3)',border:'1px solid var(--k-border)',borderRadius:'10px',
          padding:'12px',cursor:'pointer',fontSize:'14px',fontWeight:'600',
        }},'Cancelar');
        cancelPin.onclick=function(){setState({reqPin:null});};
        pinBox.appendChild(cancelPin);
        pinOv.appendChild(pinBox);
        root.appendChild(pinOv);
        setTimeout(function(){pinOv.focus();},0);
      }
    }
    return root;
  }

  // ── BARRA DE BUSCA ────────────────────────────────────────────────────────
  var searchBar = el('div',{style:{
    padding:'12px 20px',background:'var(--k-bg2)',
    borderBottom:'1px solid var(--k-border)',flexShrink:'0',
  }});
  var searchInp = el('input',{
    id:'req-busca-inp',
    type:'text',placeholder:'🔍 Buscar item no Estoque Estacionado...',
    style:{
      width:'100%',background:'var(--k-bg)',border:'2px solid var(--k-border)',
      borderRadius:'12px',padding:'12px 18px',fontSize:'16px',
      color:'var(--k-text)',outline:'none',boxSizing:'border-box',
      WebkitAppearance:'none',
    }
  });
  searchInp.value=busca;
  searchInp.onfocus=function(){this.style.borderColor='var(--k-accent2)';};
  searchInp.onblur=function(){this.style.borderColor='var(--k-border)';};
  searchInp.oninput=function(){setState({reqBusca:this.value});};
  searchBar.appendChild(searchInp);
  root.appendChild(searchBar);

  // ── GRADE DE PRODUTOS ─────────────────────────────────────────────────────
  var mainArea = el('div',{style:{
    flex:'1',overflowY:'auto',padding:'16px 20px',
  }});

  var buscaLow = busca.toLowerCase();
  var itensFilt = itens.filter(function(x){
    if(!buscaLow)return true;
    return (x.nome||'').toLowerCase().indexOf(buscaLow)>=0
        || (x.categoria||'').toLowerCase().indexOf(buscaLow)>=0;
  });

  mainArea.appendChild(el('div',{style:{
    fontSize:'11px',fontWeight:'700',color:'var(--k-text4)',letterSpacing:'.08em',
    textTransform:'uppercase',marginBottom:'12px',
  }},'📦 Itens disponíveis no Estoque Estacionado — selecione para enviar ao Rotativo'));

  if(itensFilt.length===0){
    mainArea.appendChild(el('div',{style:{
      textAlign:'center',color:'var(--k-text3)',padding:'60px 20px',fontSize:'16px',
    }},busca?'Nenhum item encontrado para "'+busca+'"':'Nenhum item cadastrado no Estoque Estacionado.'));
  } else {
    var prodGrid = el('div',{style:{
      display:'grid',
      gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',
      gap:'14px',
    }});
    itensFilt.forEach(function(item){
      var qtdEstq=item.estoqueAtual||0;
      var isCrit=qtdEstq<=0;
      var isBaixo=!isCrit&&item.estoqueMinimo&&qtdEstq<item.estoqueMinimo;
      var stCor=isCrit?'#f87171':isBaixo?'#fbbf24':'#4ade80';
      var inCart=carrinho.find(function(c){return c.insumoId===item.id;});

      var card=el('div',{style:{
        background:'var(--k-bg2)',
        border:'2px solid '+(inCart?'var(--k-accent2)':'var(--k-border)'),
        borderRadius:'14px',padding:'18px 16px',
        cursor:isCrit?'default':'pointer',
        opacity:isCrit?'.45':'1',
        transition:'border-color .15s,background .15s',
        display:'flex',flexDirection:'column',gap:'8px',minHeight:'120px',
      }});
      if(!isCrit){
        card.onmouseenter=function(){card.style.borderColor='var(--k-accent2)';card.style.background='rgba(29,78,216,.12)';};
        card.onmouseleave=function(){
          card.style.borderColor=inCart?'var(--k-accent2)':'var(--k-border)';
          card.style.background='var(--k-bg2)';
        };
      }
      card.appendChild(el('div',{style:{display:'flex',alignItems:'flex-start',gap:'8px'}},[
        el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:stCor,flexShrink:'0',marginTop:'4px'}}),
        el('div',{style:{fontWeight:'700',fontSize:'15px',color:'var(--k-text)',lineHeight:'1.3',flex:'1'}},item.nome),
      ]));
      if(item.categoria){
        card.appendChild(el('div',{style:{fontSize:'11px',color:'var(--k-text3)',textTransform:'uppercase',letterSpacing:'.06em'}},item.categoria));
      }
      card.appendChild(el('div',{style:{fontSize:'16px',fontWeight:'700',color:stCor}},
        isCrit?'⚠ Sem estoque':qtdEstq+' '+(item.unidade||'un')));
      if(inCart){
        card.appendChild(el('div',{style:{
          padding:'5px 10px',background:'rgba(29,78,216,.7)',borderRadius:'8px',
          fontSize:'13px',fontWeight:'700',color:'#fff',textAlign:'center',
        }},'✓ '+inCart.qtd+' '+(item.unidade||'un')));
      }
      if(!isCrit){
        !function(it){
          card.onclick=function(){
            var cur=carrinho.find(function(c){return c.insumoId===it.id;});
            setState({reqQtdModal:{item:it,qtd:cur?String(cur.qtd):''}});
          };
        }(item);
      }
      prodGrid.appendChild(card);
    });
    mainArea.appendChild(prodGrid);
  }
  root.appendChild(mainArea);

  // ── BARRA DO CARRINHO ─────────────────────────────────────────────────────
  if(carrinho.length>0){
    var cartBar=el('div',{style:{
      background:'var(--k-bg2)',borderTop:'2px solid var(--k-border)',
      padding:'14px 20px',flexShrink:'0',
    }});
    var cartChips=el('div',{style:{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'12px'}});
    carrinho.forEach(function(c){
      var chip=el('div',{style:{
        display:'flex',alignItems:'center',gap:'8px',
        padding:'5px 10px 5px 14px',background:'var(--k-border)',
        borderRadius:'20px',fontSize:'13px',color:'var(--k-text)',fontWeight:'600',
      }},[
        el('span',{},c.nome+': '+c.qtd+' '+c.unidade),
        (function(cItem){
          var x=el('button',{style:{
            background:'none',border:'none',color:'var(--k-text2)',cursor:'pointer',
            fontSize:'16px',padding:'0 2px',lineHeight:'1',fontWeight:'700',
          }},'×');
          x.onclick=function(e){
            e.stopPropagation();
            var carr=state.reqCarrinho.filter(function(r){return r.insumoId!==cItem.insumoId;});
            setState({reqCarrinho:carr});
          };
          return x;
        })(c),
      ]);
      cartChips.appendChild(chip);
    });
    cartBar.appendChild(cartChips);
    var cartActs=el('div',{style:{display:'flex',gap:'10px',alignItems:'center'}});
    cartActs.appendChild(el('div',{style:{flex:'1',fontSize:'14px',color:'var(--k-text2)',fontWeight:'600'}},
      carrinho.length+' item'+(carrinho.length!==1?'ns':'')+' selecionado'+(carrinho.length!==1?'s':'')));
    var limparBtn=el('button',{style:{
      background:'var(--k-btn-back)',color:'var(--k-text)',border:'none',borderRadius:'10px',
      padding:'13px 22px',cursor:'pointer',fontSize:'14px',fontWeight:'700',
    }},'🗑 Limpar');
    limparBtn.onclick=function(){setState({reqCarrinho:[]});};
    cartActs.appendChild(limparBtn);
    var confirmarBtn=el('button',{style:{
      background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',
      padding:'13px 32px',cursor:'pointer',fontSize:'16px',fontWeight:'900',
    }},'✅ Enviar para o Rotativo');
    confirmarBtn.onclick=function(){_reqConfirmar();};
    cartActs.appendChild(confirmarBtn);
    cartBar.appendChild(cartActs);
    root.appendChild(cartBar);
  }

  // ── MODAL DE QUANTIDADE ───────────────────────────────────────────────────
  if(qtdMdl){
    var qItem=qtdMdl.item;
    var qVal=qtdMdl.qtd||'';
    var qEstq=qItem.estoqueAtual||0;
    var needsDec=['kg','g','L','mL','ml'].indexOf(qItem.unidade||'')>=0;

    var qOv=el('div',{
      tabIndex:'-1',
      style:{
        position:'absolute',inset:'0',background:'var(--k-overlay)',
        display:'flex',alignItems:'center',justifyContent:'center',zIndex:'200',
        outline:'none',
      },
    });
    var qBox=el('div',{style:{
      background:'var(--k-bg2)',borderRadius:'22px',padding:'28px 24px',
      width:'310px',maxWidth:'92vw',border:'2px solid var(--k-border)',
      boxShadow:'0 30px 80px var(--k-overlay)',
    }});
    // Header do modal de qtd
    qBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'18px'}},[
      el('div',{style:{fontWeight:'800',fontSize:'19px',color:'var(--k-text)',marginBottom:'6px'}},qItem.nome),
      el('div',{style:{fontSize:'13px',color:'var(--k-text2)'}},
        'Em estoque: '+qEstq+' '+(qItem.unidade||'un')),
    ]));
    // Display da quantidade
    qBox.appendChild(el('div',{style:{
      background:'var(--k-bg)',borderRadius:'12px',padding:'14px',
      textAlign:'center',fontSize:'38px',fontWeight:'900',
      color:qVal?'var(--k-accent2)':'var(--k-border)',marginBottom:'4px',
      minHeight:'68px',display:'flex',alignItems:'center',justifyContent:'center',
    }},qVal||'—'));
    qBox.appendChild(el('div',{style:{
      textAlign:'center',fontSize:'13px',color:'var(--k-text3)',marginBottom:'16px',
    }},'Quantidade em '+(qItem.unidade||'un')));
    // Confirma a quantidade e adiciona ao carrinho
    function qtdConfirmar(){
      var md=state.reqQtdModal;
      if(!md)return;
      var qty=parseFloat(md.qtd);
      if(!qty||qty<=0){showToast&&showToast('Informe uma quantidade válida','error');return;}
      var estq=md.item.estoqueAtual||0;
      if(qty>estq){
        if(!confirm('Atenção: quantidade ('+qty+') maior que o estoque disponível ('+estq+').\nContinuar mesmo assim?'))return;
      }
      var carr=(state.reqCarrinho||[]).slice();
      var idx=-1;
      for(var ci=0;ci<carr.length;ci++){if(carr[ci].insumoId===md.item.id){idx=ci;break;}}
      var novo={insumoId:md.item.id,nome:md.item.nome,unidade:md.item.unidade||'un',qtd:qty,estoqueAtual:estq,custoMedio:md.item.custoMedio||0};
      if(idx>=0)carr[idx]=novo;else carr.push(novo);
      setState({reqQtdModal:null,reqCarrinho:carr});
    }
    // Pressiona uma tecla do teclado de quantidade (clique no botão ou teclado físico/numérico)
    function pressQtyKey(key){
      var cur=(state.reqQtdModal||{}).qtd||'';
      var item2=(state.reqQtdModal||{}).item;
      if(key==='←'){
        setState({reqQtdModal:{item:item2,qtd:cur.slice(0,-1)}});
      } else if(key==='.'&&(!needsDec||cur.indexOf('.')>=0)){
        return;
      } else if(cur==='0'&&key!=='.'){
        setState({reqQtdModal:{item:item2,qtd:key}});
      } else if(cur.length<8){
        setState({reqQtdModal:{item:item2,qtd:cur+key}});
      }
    }
    // Habilita digitação via teclado físico/numérico (além do toque nos botões)
    qOv.onkeydown=function(ev){
      var key=ev.key;
      if(key>='0'&&key<='9'){ev.preventDefault();pressQtyKey(key);}
      else if(key==='.'||key===','){ev.preventDefault();pressQtyKey('.');}
      else if(key==='Backspace'){ev.preventDefault();pressQtyKey('←');}
      else if(key==='Enter'){ev.preventDefault();qtdConfirmar();}
      else if(key==='Escape'){ev.preventDefault();setState({reqQtdModal:null});}
    };
    // Teclado numérico
    var qKpad=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}});
    var qKeys=['1','2','3','4','5','6','7','8','9',needsDec?'.':'__','0','←'];
    qKeys.forEach(function(k){
      if(k==='__'){qKpad.appendChild(el('div',{}));return;}
      var kb=el('button',{style:{
        background:k==='←'?'var(--k-btn-back)':'var(--k-border)',color:'var(--k-text)',border:'none',
        borderRadius:'11px',padding:'18px 10px',fontSize:'21px',
        fontWeight:'700',cursor:'pointer',lineHeight:'1',
      }},k);
      kb.onmouseenter=function(){kb.style.opacity='.8';};
      kb.onmouseleave=function(){kb.style.opacity='1';};
      !function(key){
        kb.onclick=function(){pressQtyKey(key);};
      }(k);
      qKpad.appendChild(kb);
    });
    qBox.appendChild(qKpad);
    // Botões de ação
    var qActs=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
    var qCancel=el('button',{style:{
      background:'var(--k-btn-back)',color:'var(--k-text)',border:'none',borderRadius:'11px',
      padding:'15px',cursor:'pointer',fontSize:'15px',fontWeight:'700',
    }},'Cancelar');
    qCancel.onclick=function(){setState({reqQtdModal:null});};
    var qAdd=el('button',{style:{
      background:'#1d4ed8',color:'#fff',border:'none',borderRadius:'11px',
      padding:'15px',cursor:'pointer',fontSize:'15px',fontWeight:'900',
    }},'+ Adicionar');
    qAdd.onclick=qtdConfirmar;
    qActs.appendChild(qCancel);
    qActs.appendChild(qAdd);
    qBox.appendChild(qActs);
    // Remove from cart
    var inCartNow=carrinho.find(function(c){return c.insumoId===qItem.id;});
    if(inCartNow){
      var qRemove=el('button',{style:{
        width:'100%',marginTop:'8px',background:'transparent',color:'#f87171',
        border:'1px solid #f8717133',borderRadius:'10px',padding:'10px',
        cursor:'pointer',fontSize:'13px',fontWeight:'700',
      }},'🗑 Remover do carrinho');
      qRemove.onclick=function(){
        var carr2=(state.reqCarrinho||[]).filter(function(c){return c.insumoId!==qItem.id;});
        setState({reqQtdModal:null,reqCarrinho:carr2});
      };
      qBox.appendChild(qRemove);
    }
    qOv.appendChild(qBox);
    root.appendChild(qOv);
    setTimeout(function(){qOv.focus();},0);
  }

  // Painel do desenvolvedor
  var devMdl=renderReqDevModal();
  if(devMdl)root.appendChild(devMdl);

  return root;
}

// ── PAINEL DO DESENVOLVEDOR — Gerenciar acesso ao kiosk ──────────────────────
function renderReqDevModal(){
  var m=state.reqDevModal; if(!m)return null;
  var pf=state.profile;

  // Usuários com papel dev/admin que possuem pinCaixa configurado
  var devUsers=(state.usuarios||[]).filter(function(u){
    return u.ativo!==false&&(u.papel==='desenvolvedor'||u.papel==='administrador')&&u.pinCaixa;
  });

  var ov=el('div',{tabIndex:'-1',style:{
    position:'absolute',inset:'0',background:'var(--k-overlay)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',outline:'none',
  }});
  setTimeout(function(){ov.focus();},0);

  function fechar(){setState({reqDevModal:null});}

  // ── STEP: PIN de autenticação ────────────────────────────────────────────
  if(m.step==='pin'){
    if(devUsers.length===0){
      var noPin=el('div',{style:{
        background:'var(--k-bg2)',borderRadius:'20px',padding:'32px 28px',
        maxWidth:'340px',width:'90vw',border:'2px solid var(--k-border)',textAlign:'center',
      }});
      noPin.appendChild(el('div',{style:{fontSize:'40px',marginBottom:'16px'}},'⚠️'));
      noPin.appendChild(el('div',{style:{fontWeight:'700',fontSize:'16px',color:'var(--k-text)',marginBottom:'10px'}},'Nenhum PIN configurado'));
      noPin.appendChild(el('div',{style:{fontSize:'13px',color:'var(--k-text2)',lineHeight:'1.7',marginBottom:'20px'}},
        'Configure o PIN do Caixa Diário para um usuário Desenvolvedor ou Administrador no painel principal.'));
      var okBtn=el('button',{style:{
        width:'100%',background:'var(--k-border)',color:'var(--k-text)',border:'none',
        borderRadius:'10px',padding:'14px',cursor:'pointer',fontSize:'15px',fontWeight:'700',
      }},'Fechar');
      okBtn.onclick=fechar;
      noPin.appendChild(okBtn);
      ov.appendChild(noPin);
      return ov;
    }

    var box=el('div',{style:{
      background:'var(--k-bg2)',borderRadius:'22px',padding:'32px 28px',
      width:'300px',maxWidth:'90vw',border:'2px solid var(--k-border)',
      boxShadow:'0 30px 80px var(--k-overlay)',
    }});
    box.appendChild(el('div',{style:{textAlign:'center',marginBottom:'22px'}},[
      el('div',{style:{fontSize:'40px',lineHeight:'1'}},'🔑'),
      el('div',{style:{fontWeight:'800',fontSize:'18px',color:'var(--k-text)',marginTop:'10px'}},'Painel do Desenvolvedor'),
      el('div',{style:{fontSize:'12px',color:'var(--k-text2)',marginTop:'6px'}},'Digite o PIN do Caixa Diário para continuar'),
    ]));

    var dotsEl=el('div',{style:{display:'flex',gap:'14px',justifyContent:'center',marginBottom:'8px'}});
    for(var d=0;d<4;d++){
      dotsEl.appendChild(el('div',{style:{
        width:'20px',height:'20px',borderRadius:'50%',transition:'all .12s',
        background:d<m.pinVal.length?'var(--k-accent)':'transparent',
        border:'2px solid '+(d<m.pinVal.length?'var(--k-accent)':'var(--k-border)'),
      }}));
    }
    box.appendChild(dotsEl);
    box.appendChild(el('div',{style:{
      textAlign:'center',minHeight:'22px',fontSize:'13px',fontWeight:'700',
      color:'#f87171',marginBottom:'14px',
    }},m.pinErro?'❌ PIN incorreto — tente novamente':''));

    function pressDevPin(key){
      var cur=(state.reqDevModal||{}).pinVal||'';
      if(key==='←'){
        setState({reqDevModal:{step:'pin',pinVal:cur.slice(0,-1),pinErro:false}});
      } else {
        var nova=cur+key;
        setState({reqDevModal:{step:'pin',pinVal:nova,pinErro:false}});
        if(nova.length===4){
          setTimeout(function(){
            var ok=devUsers.some(function(u){return u.pinCaixa===nova;});
            if(ok){setState({reqDevModal:{step:'list'}});}
            else{setState({reqDevModal:{step:'pin',pinVal:'',pinErro:true}});}
          },300);
        }
      }
    }
    ov.onkeydown=function(ev){
      var k=ev.key;
      if(k>='0'&&k<='9'){ev.preventDefault();pressDevPin(k);}
      else if(k==='Backspace'){ev.preventDefault();pressDevPin('←');}
      else if(k==='Escape'){ev.preventDefault();fechar();}
    };

    var kpad=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}});
    ['1','2','3','4','5','6','7','8','9','←','0','✕'].forEach(function(k){
      var kb=el('button',{style:{
        background:k==='✕'?'#dc2626':k==='←'?'var(--k-btn-back)':'var(--k-border)',
        color:k==='✕'?'#fff':'var(--k-text)',border:'none',borderRadius:'12px',
        padding:'19px 10px',fontSize:'22px',fontWeight:'700',cursor:'pointer',lineHeight:'1',
      }},k);
      kb.onmouseenter=function(){kb.style.opacity='.8';};
      kb.onmouseleave=function(){kb.style.opacity='1';};
      !function(key){
        kb.onclick=function(){key==='✕'?fechar():pressDevPin(key);};
      }(k);
      kpad.appendChild(kb);
    });
    box.appendChild(kpad);
    ov.appendChild(box);
    return ov;
  }

  // ── STEP: lista de funcionários ──────────────────────────────────────────
  if(m.step==='list'){
    var funcs=(state.funcionarios||[])
      .filter(function(f){return (f.profile===pf||!f.profile)&&f.status==='ativo';})
      .sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});

    var panel=el('div',{style:{
      background:'var(--k-bg2)',borderRadius:'22px',padding:'0',
      width:'480px',maxWidth:'92vw',maxHeight:'80vh',
      border:'2px solid var(--k-border)',display:'flex',flexDirection:'column',
      boxShadow:'0 30px 80px var(--k-overlay)',overflow:'hidden',
    }});

    // Header do painel
    var panHdr=el('div',{style:{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'18px 20px',borderBottom:'1px solid var(--k-border)',flexShrink:'0',
    }});
    panHdr.appendChild(el('div',{},[
      el('div',{style:{fontWeight:'800',fontSize:'16px',color:'var(--k-text)'}},'👥 Acesso — Transferência entre Estoques'),
      el('div',{style:{fontSize:'12px',color:'var(--k-text2)',marginTop:'3px'}},
        funcs.length+' funcionário'+(funcs.length!==1?'s':'')+' ativo'+(funcs.length!==1?'s':'')),
    ]));
    var closeListBtn=el('button',{style:{
      background:'#dc2626',color:'#fff',border:'none',borderRadius:'8px',
      padding:'8px 14px',cursor:'pointer',fontSize:'13px',fontWeight:'700',
    }},'✕ Fechar');
    closeListBtn.onclick=fechar;
    panHdr.appendChild(closeListBtn);
    panel.appendChild(panHdr);

    // Lista
    var lista=el('div',{style:{overflowY:'auto',padding:'14px 16px',flex:'1'}});
    if(funcs.length===0){
      lista.appendChild(el('div',{style:{textAlign:'center',padding:'40px 20px',color:'var(--k-text2)',fontSize:'14px'}},
        'Nenhum funcionário ativo cadastrado.'));
    } else {
      funcs.forEach(function(f){
        var habilitado=!!f.senhaRequisicao;
        var row=el('div',{style:{
          display:'flex',alignItems:'center',gap:'14px',
          padding:'12px 14px',marginBottom:'8px',borderRadius:'12px',
          background:'var(--k-bg)',border:'1px solid var(--k-border)',
        }});
        var avatar=el('div',{style:{
          width:'44px',height:'44px',borderRadius:'50%',
          background:habilitado?'rgba(74,222,128,.15)':'rgba(248,113,113,.10)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'22px',flexShrink:'0',
        }},habilitado?'✅':'🚫');
        row.appendChild(avatar);
        var info=el('div',{style:{flex:'1',minWidth:'0'}});
        info.appendChild(el('div',{style:{fontWeight:'700',fontSize:'14px',color:'var(--k-text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},f.nome));
        info.appendChild(el('div',{style:{fontSize:'12px',color:'var(--k-text2)',marginTop:'2px'}},
          (f.cargo||'Funcionário')+' · '+(habilitado?'✅ Habilitado':'⭕ Sem acesso')));
        row.appendChild(info);

        if(habilitado){
          var remBtn=el('button',{style:{
            background:'rgba(248,113,113,.12)',color:'#f87171',border:'1px solid rgba(248,113,113,.3)',
            borderRadius:'8px',padding:'8px 14px',cursor:'pointer',fontSize:'12px',fontWeight:'700',flexShrink:'0',
          }},'🚫 Remover');
          !function(fn){
            remBtn.onclick=function(){
              if(!confirm('Remover acesso de "'+fn.nome+'"?\nEle não poderá mais usar o kiosk até ser habilitado novamente.'))return;
              var novos=(state.funcionarios||[]).map(function(x){
                return x.id===fn.id?Object.assign({},x,{senhaRequisicao:''}):x;
              });
              lsSet('funcionarios',novos);setState({funcionarios:novos});saveNow();
              showToast&&showToast('Acesso de '+fn.nome+' removido','error');
            };
          }(f);
          row.appendChild(remBtn);
        } else {
          var habBtn=el('button',{style:{
            background:'rgba(74,222,128,.12)',color:'#4ade80',border:'1px solid rgba(74,222,128,.3)',
            borderRadius:'8px',padding:'8px 14px',cursor:'pointer',fontSize:'12px',fontWeight:'700',flexShrink:'0',
          }},'✅ Habilitar');
          !function(fn){
            habBtn.onclick=function(){
              setState({reqDevModal:{step:'setPin',funcId:fn.id,funcNome:fn.nome,pinVal:'',pinErro:false}});
            };
          }(f);
          row.appendChild(habBtn);
        }
        lista.appendChild(row);
      });
    }
    panel.appendChild(lista);
    ov.appendChild(panel);
    return ov;
  }

  // ── STEP: definir PIN para funcionário ───────────────────────────────────
  if(m.step==='setPin'){
    var sBox=el('div',{style:{
      background:'var(--k-bg2)',borderRadius:'22px',padding:'28px 24px',
      width:'310px',maxWidth:'92vw',border:'2px solid var(--k-border)',
      boxShadow:'0 30px 80px var(--k-overlay)',
    }});
    sBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'20px'}},[
      el('div',{style:{fontSize:'40px'}},'👤'),
      el('div',{style:{fontWeight:'800',fontSize:'17px',color:'var(--k-text)',marginTop:'8px'}},m.funcNome),
      el('div',{style:{fontSize:'12px',color:'var(--k-text2)',marginTop:'6px'}},'Digite o PIN de 4 dígitos para este funcionário'),
    ]));

    var sDots=el('div',{style:{display:'flex',gap:'14px',justifyContent:'center',marginBottom:'8px'}});
    for(var sd=0;sd<4;sd++){
      sDots.appendChild(el('div',{style:{
        width:'20px',height:'20px',borderRadius:'50%',transition:'all .12s',
        background:sd<m.pinVal.length?'#4ade80':'transparent',
        border:'2px solid '+(sd<m.pinVal.length?'#4ade80':'var(--k-border)'),
      }}));
    }
    sBox.appendChild(sDots);
    sBox.appendChild(el('div',{style:{
      textAlign:'center',minHeight:'22px',fontSize:'13px',fontWeight:'700',
      color:'#f87171',marginBottom:'14px',
    }},m.pinErro?'❌ PIN já em uso por outro funcionário':''));

    function pressSetPin(key){
      var cur=(state.reqDevModal||{}).pinVal||'';
      var fId=(state.reqDevModal||{}).funcId;
      var fNm=(state.reqDevModal||{}).funcNome;
      if(key==='←'){
        setState({reqDevModal:{step:'setPin',funcId:fId,funcNome:fNm,pinVal:cur.slice(0,-1),pinErro:false}});
      } else if(key==='✕'){
        setState({reqDevModal:{step:'list'}});
      } else {
        var nova=cur+key;
        setState({reqDevModal:{step:'setPin',funcId:fId,funcNome:fNm,pinVal:nova,pinErro:false}});
        if(nova.length===4){
          setTimeout(function(){
            var st=state.reqDevModal;
            if(!st||st.step!=='setPin'||st.funcId!==fId)return;
            // Verifica conflito com outro funcionário
            var conflito=(state.funcionarios||[]).some(function(x){
              return x.id!==fId&&x.senhaRequisicao===nova;
            });
            if(conflito){
              setState({reqDevModal:{step:'setPin',funcId:fId,funcNome:fNm,pinVal:'',pinErro:true}});
              return;
            }
            var novos=(state.funcionarios||[]).map(function(x){
              return x.id===fId?Object.assign({},x,{senhaRequisicao:nova}):x;
            });
            lsSet('funcionarios',novos);setState({funcionarios:novos,reqDevModal:{step:'list'}});
            saveNow();
            showToast&&showToast(fNm+' habilitado com PIN ****');
          },300);
        }
      }
    }
    ov.onkeydown=function(ev){
      var k=ev.key;
      if(k>='0'&&k<='9'){ev.preventDefault();pressSetPin(k);}
      else if(k==='Backspace'){ev.preventDefault();pressSetPin('←');}
      else if(k==='Escape'){ev.preventDefault();setState({reqDevModal:{step:'list'}});}
    };

    var sKpad=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}});
    ['1','2','3','4','5','6','7','8','9','←','0','✕'].forEach(function(k){
      var kb=el('button',{style:{
        background:k==='✕'?'var(--k-btn-back)':k==='←'?'var(--k-btn-back)':'var(--k-border)',
        color:'var(--k-text)',border:'none',borderRadius:'11px',
        padding:'18px 10px',fontSize:'21px',fontWeight:'700',cursor:'pointer',lineHeight:'1',
      }},k);
      kb.onmouseenter=function(){kb.style.opacity='.8';};
      kb.onmouseleave=function(){kb.style.opacity='1';};
      !function(key){kb.onclick=function(){pressSetPin(key);};} (k);
      sKpad.appendChild(kb);
    });
    sBox.appendChild(sKpad);
    sBox.appendChild(el('div',{style:{fontSize:'11px',color:'var(--k-text3)',textAlign:'center',lineHeight:'1.6'}},
      '⬅ Voltar → tecle ✕  ·  PIN deve ser único entre os funcionários'));
    ov.appendChild(sBox);
    return ov;
  }

  return null;
}

// ── REGISTRA A TRANSFERÊNCIA (Estacionado → Rotativo) ───────────────────────
// A retirada no tablet abastece o Estoque Rotativo — usa a mesma função
// compartilhada de transferência do módulo Estoque Rotativo, pra ter uma
// única lógica (sem duplicar cálculo em dois arquivos diferentes).
function _reqConfirmar() {
  var session  = state.reqSession;
  var carrinho = state.reqCarrinho||[];
  if(!session||carrinho.length===0)return;

  if(typeof _erTransferirLote!=='function'){
    if(typeof showToast==='function')showToast('Erro interno: módulo de transferência não carregado.','error');
    return;
  }

  var linhas=carrinho.map(function(c){return {itemId:c.insumoId,qtd:c.qtd,nome:c.nome};});
  var res=_erTransferirLote(linhas,session.funcId,session.funcNome,'Transf. Estacionado→Rotativo — '+session.funcNome);

  if(res.erros.length>0){alert('Erros ao registrar:\n'+res.erros.join('\n'));return;}

  setState({reqSession:null,reqCarrinho:[],reqQtdModal:null,reqBusca:''});
  if(typeof showToast==='function')showToast(res.count+' item(ns) transferido(s): Estacionado → Rotativo!');
}
