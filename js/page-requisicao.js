// ── TELA DE REQUISIÇÃO DE ESTOQUE (Tablet Kiosk) ─────────────────────────────
// Acessível via state.reqMode = true
// Usa state.estoqueItens + state.estoqueMovs do módulo Estoque Insumos

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
    position:'fixed',inset:'0',background:'#0f172a',
    display:'flex',flexDirection:'column',zIndex:'9000',
    color:'#f1f5f9',fontFamily:"system-ui,-apple-system,sans-serif",
    touchAction:'manipulation',WebkitUserSelect:'none',userSelect:'none',
  }});

  // ── HEADER ────────────────────────────────────────────────────────────────
  var hdr = el('div',{style:{
    display:'flex',alignItems:'center',gap:'12px',
    padding:'14px 20px',background:'#1e293b',
    borderBottom:'2px solid #334155',flexShrink:'0',
  }});
  hdr.appendChild(el('div',{style:{
    fontSize:'18px',fontWeight:'800',color:'#38bdf8',flex:'1',
    display:'flex',alignItems:'center',gap:'8px',
  }},'📦 Requisição de Estoque'));

  if (session) {
    hdr.appendChild(el('div',{style:{
      padding:'7px 16px',background:'#334155',borderRadius:'20px',
      fontSize:'14px',fontWeight:'700',color:'#f1f5f9',
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
    } else {
      setState({reqMode:false,reqSession:null,reqCarrinho:[],reqPin:null,reqBusca:'',reqQtdModal:null});
    }
  };
  hdr.appendChild(exitBtn);
  root.appendChild(hdr);

  // ── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!session) {
    var loginWrap = el('div',{style:{
      flex:'1',overflowY:'auto',padding:'40px 20px',
      display:'flex',flexDirection:'column',alignItems:'center',
    }});

    loginWrap.appendChild(el('div',{style:{
      fontSize:'18px',fontWeight:'700',color:'#94a3b8',
      marginBottom:'36px',textAlign:'center',letterSpacing:'-.01em',
    }},'🔐  Selecione seu nome para continuar'));

    if (funcs.length === 0) {
      loginWrap.appendChild(el('div',{style:{
        textAlign:'center',padding:'48px 32px',background:'#1e293b',
        borderRadius:'20px',maxWidth:'480px',width:'100%',
        border:'1px solid #334155',
      }},[
        el('div',{style:{fontSize:'52px',marginBottom:'16px'}},'⚠'),
        el('div',{style:{fontWeight:'700',fontSize:'16px',color:'#f1f5f9',marginBottom:'10px'}},'Nenhum funcionário configurado'),
        el('div',{style:{fontSize:'13px',color:'#64748b',lineHeight:'1.7'}},
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
          background:'#1e293b',border:'2px solid #334155',borderRadius:'18px',
          padding:'28px 14px',display:'flex',flexDirection:'column',
          alignItems:'center',gap:'10px',cursor:'pointer',
          transition:'border-color .15s,background .15s',
          minHeight:'150px',justifyContent:'center',
        }});
        card.onmouseenter=function(){card.style.borderColor='#60a5fa';card.style.background='rgba(29,78,216,.15)';};
        card.onmouseleave=function(){card.style.borderColor='#334155';card.style.background='#1e293b';};
        card.appendChild(el('div',{style:{fontSize:'44px',lineHeight:'1'}},'👤'));
        card.appendChild(el('div',{style:{fontWeight:'800',fontSize:'16px',color:'#f1f5f9',textAlign:'center',lineHeight:'1.3'}},f.nome));
        if(f.cargo)card.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center'}},f.cargo));
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
            position:'absolute',inset:'0',background:'rgba(0,0,0,.82)',
            display:'flex',alignItems:'center',justifyContent:'center',zIndex:'200',
            outline:'none',
          },
        });
        var pinBox = el('div',{style:{
          background:'#1e293b',borderRadius:'22px',padding:'32px 28px',
          width:'300px',maxWidth:'90vw',border:'2px solid #334155',
          boxShadow:'0 30px 80px rgba(0,0,0,.9)',
        }});
        // Avatar + name
        pinBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'22px'}},[
          el('div',{style:{fontSize:'52px',lineHeight:'1'}},'👤'),
          el('div',{style:{fontWeight:'800',fontSize:'19px',color:'#f1f5f9',marginTop:'10px'}},pinFunc.nome),
          pinFunc.cargo?el('div',{style:{fontSize:'12px',color:'#94a3b8',marginTop:'4px'}},pinFunc.cargo):null,
        ].filter(Boolean)));
        // Dots
        var dotsEl = el('div',{style:{display:'flex',gap:'14px',justifyContent:'center',marginBottom:'8px'}});
        for(var d=0;d<4;d++){
          dotsEl.appendChild(el('div',{style:{
            width:'20px',height:'20px',borderRadius:'50%',transition:'all .12s',
            background:d<pinSt.value.length?'#60a5fa':'transparent',
            border:'2px solid '+(d<pinSt.value.length?'#60a5fa':'#475569'),
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
          var bgK = k==='✓'?'#1d4ed8':k==='←'?'#374151':'#334155';
          var kb = el('button',{style:{
            background:bgK,color:'#f1f5f9',border:'none',borderRadius:'12px',
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
          color:'#64748b',border:'1px solid #334155',borderRadius:'10px',
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
    padding:'12px 20px',background:'#1e293b',
    borderBottom:'1px solid #334155',flexShrink:'0',
  }});
  var searchInp = el('input',{
    id:'req-busca-inp',
    type:'text',placeholder:'🔍 Buscar produto por nome ou categoria...',
    style:{
      width:'100%',background:'#0f172a',border:'2px solid #334155',
      borderRadius:'12px',padding:'12px 18px',fontSize:'16px',
      color:'#f1f5f9',outline:'none',boxSizing:'border-box',
      WebkitAppearance:'none',
    }
  });
  searchInp.value=busca;
  searchInp.onfocus=function(){this.style.borderColor='#60a5fa';};
  searchInp.onblur=function(){this.style.borderColor='#334155';};
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

  if(itensFilt.length===0){
    mainArea.appendChild(el('div',{style:{
      textAlign:'center',color:'#64748b',padding:'60px 20px',fontSize:'16px',
    }},busca?'Nenhum produto encontrado para "'+busca+'"':'Nenhum produto cadastrado no estoque de insumos.'));
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
        background:'#1e293b',
        border:'2px solid '+(inCart?'#60a5fa':'#334155'),
        borderRadius:'14px',padding:'18px 16px',
        cursor:isCrit?'default':'pointer',
        opacity:isCrit?'.45':'1',
        transition:'border-color .15s,background .15s',
        display:'flex',flexDirection:'column',gap:'8px',minHeight:'120px',
      }});
      if(!isCrit){
        card.onmouseenter=function(){card.style.borderColor='#60a5fa';card.style.background='rgba(29,78,216,.12)';};
        card.onmouseleave=function(){
          card.style.borderColor=inCart?'#60a5fa':'#334155';
          card.style.background='#1e293b';
        };
      }
      card.appendChild(el('div',{style:{display:'flex',alignItems:'flex-start',gap:'8px'}},[
        el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:stCor,flexShrink:'0',marginTop:'4px'}}),
        el('div',{style:{fontWeight:'700',fontSize:'15px',color:'#f1f5f9',lineHeight:'1.3',flex:'1'}},item.nome),
      ]));
      if(item.categoria){
        card.appendChild(el('div',{style:{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em'}},item.categoria));
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
      background:'#1e293b',borderTop:'2px solid #334155',
      padding:'14px 20px',flexShrink:'0',
    }});
    var cartChips=el('div',{style:{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'12px'}});
    carrinho.forEach(function(c){
      var chip=el('div',{style:{
        display:'flex',alignItems:'center',gap:'8px',
        padding:'5px 10px 5px 14px',background:'#334155',
        borderRadius:'20px',fontSize:'13px',color:'#f1f5f9',fontWeight:'600',
      }},[
        el('span',{},c.nome+': '+c.qtd+' '+c.unidade),
        (function(cItem){
          var x=el('button',{style:{
            background:'none',border:'none',color:'#94a3b8',cursor:'pointer',
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
    cartActs.appendChild(el('div',{style:{flex:'1',fontSize:'14px',color:'#94a3b8',fontWeight:'600'}},
      carrinho.length+' item'+(carrinho.length!==1?'ns':'')+' selecionado'+(carrinho.length!==1?'s':'')));
    var limparBtn=el('button',{style:{
      background:'#374151',color:'#f1f5f9',border:'none',borderRadius:'10px',
      padding:'13px 22px',cursor:'pointer',fontSize:'14px',fontWeight:'700',
    }},'🗑 Limpar');
    limparBtn.onclick=function(){setState({reqCarrinho:[]});};
    cartActs.appendChild(limparBtn);
    var confirmarBtn=el('button',{style:{
      background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',
      padding:'13px 32px',cursor:'pointer',fontSize:'16px',fontWeight:'900',
    }},'✅ Registrar Retirada');
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

    var qOv=el('div',{style:{
      position:'absolute',inset:'0',background:'rgba(0,0,0,.82)',
      display:'flex',alignItems:'center',justifyContent:'center',zIndex:'200',
    }});
    var qBox=el('div',{style:{
      background:'#1e293b',borderRadius:'22px',padding:'28px 24px',
      width:'310px',maxWidth:'92vw',border:'2px solid #334155',
      boxShadow:'0 30px 80px rgba(0,0,0,.9)',
    }});
    // Header do modal de qtd
    qBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'18px'}},[
      el('div',{style:{fontWeight:'800',fontSize:'19px',color:'#f1f5f9',marginBottom:'6px'}},qItem.nome),
      el('div',{style:{fontSize:'13px',color:'#94a3b8'}},
        'Em estoque: '+qEstq+' '+(qItem.unidade||'un')),
    ]));
    // Display da quantidade
    qBox.appendChild(el('div',{style:{
      background:'#0f172a',borderRadius:'12px',padding:'14px',
      textAlign:'center',fontSize:'38px',fontWeight:'900',
      color:qVal?'#60a5fa':'#334155',marginBottom:'4px',
      minHeight:'68px',display:'flex',alignItems:'center',justifyContent:'center',
    }},qVal||'—'));
    qBox.appendChild(el('div',{style:{
      textAlign:'center',fontSize:'13px',color:'#64748b',marginBottom:'16px',
    }},'Quantidade em '+(qItem.unidade||'un')));
    // Teclado numérico
    var qKpad=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}});
    var qKeys=['1','2','3','4','5','6','7','8','9',needsDec?'.':'__','0','←'];
    qKeys.forEach(function(k){
      if(k==='__'){qKpad.appendChild(el('div',{}));return;}
      var kb=el('button',{style:{
        background:k==='←'?'#374151':'#334155',color:'#f1f5f9',border:'none',
        borderRadius:'11px',padding:'18px 10px',fontSize:'21px',
        fontWeight:'700',cursor:'pointer',lineHeight:'1',
      }},k);
      kb.onmouseenter=function(){kb.style.opacity='.8';};
      kb.onmouseleave=function(){kb.style.opacity='1';};
      !function(key){
        kb.onclick=function(){
          var cur=(state.reqQtdModal||{}).qtd||'';
          var item2=(state.reqQtdModal||{}).item;
          if(key==='←'){
            setState({reqQtdModal:{item:item2,qtd:cur.slice(0,-1)}});
          } else if(key==='.'&&cur.indexOf('.')>=0){
            return;
          } else if(cur==='0'&&key!=='.'){
            setState({reqQtdModal:{item:item2,qtd:key}});
          } else if(cur.length<8){
            setState({reqQtdModal:{item:item2,qtd:cur+key}});
          }
        };
      }(k);
      qKpad.appendChild(kb);
    });
    qBox.appendChild(qKpad);
    // Botões de ação
    var qActs=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
    var qCancel=el('button',{style:{
      background:'#374151',color:'#f1f5f9',border:'none',borderRadius:'11px',
      padding:'15px',cursor:'pointer',fontSize:'15px',fontWeight:'700',
    }},'Cancelar');
    qCancel.onclick=function(){setState({reqQtdModal:null});};
    var qAdd=el('button',{style:{
      background:'#1d4ed8',color:'#fff',border:'none',borderRadius:'11px',
      padding:'15px',cursor:'pointer',fontSize:'15px',fontWeight:'900',
    }},'+ Adicionar');
    qAdd.onclick=function(){
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
    };
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
  }

  return root;
}

// ── REGISTRA A RETIRADA ───────────────────────────────────────────────────────
function _reqConfirmar() {
  var session  = state.reqSession;
  var carrinho = state.reqCarrinho||[];
  if(!session||carrinho.length===0)return;

  var pf  = state.profile;
  var now = new Date().toISOString();
  var dataHj = now.slice(0,10);

  var itensNovos = (state.estoqueItens||[]).slice();
  var movsNovos  = (state.estoqueMovs ||[]).slice();
  var erros = [];

  carrinho.forEach(function(c){
    var idx=-1;
    for(var i=0;i<itensNovos.length;i++){if(itensNovos[i].id===c.insumoId){idx=i;break;}}
    if(idx<0){erros.push(c.nome+': produto não encontrado');return;}
    var item = itensNovos[idx];
    var qtdAtual = item.estoqueAtual||0;
    var qtdNova  = Math.round((qtdAtual-c.qtd)*1000)/1000;
    itensNovos[idx] = Object.assign({},item,{estoqueAtual:qtdNova,atualizadoEm:now});
    movsNovos.push({
      id:uid(),profile:pf,
      insumoId:c.insumoId,insumoNome:c.nome,
      tipo:'saida',quantidade:c.qtd,
      custoUnit:c.custoMedio||null,
      valorTotal:c.qtd*(c.custoMedio||0)||null,
      qtdAntes:qtdAtual,qtdDepois:qtdNova,
      custoMedioAntes:item.custoMedio||0,custoMedioDepois:item.custoMedio||0,
      motivo:'Consumo Produção',
      funcId:session.funcId,funcNome:session.funcNome,
      data:dataHj,
      obs:'Requisição tablet — '+session.funcNome,
      criadoEm:now,
    });
  });

  if(erros.length>0){alert('Erros ao registrar:\n'+erros.join('\n'));return;}

  lsSet('estoqueItens',itensNovos);
  lsSet('estoqueMovs',movsNovos);
  setState({
    estoqueItens:itensNovos,estoqueMovs:movsNovos,
    reqSession:null,reqCarrinho:[],reqQtdModal:null,reqBusca:'',
  });
  scheduleSave();
  if(typeof showToast==='function')showToast('Retirada registrada com sucesso!');
}
