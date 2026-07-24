// ── CAIXA DIÁRIO (Kiosk PC do Caixa) ─────────────────────────────────────────
// Livro de caixa diário: abertura e fechamento por contagem de cédulas/moedas,
// e lançamento de entradas/saídas ao longo do dia pelo responsável do caixa.
// Acessível via state.caixaDiarioMode = true (login por PIN de funcionário,
// reaproveita o mesmo PIN de 4 dígitos já usado na Requisição de Estoque).

function _cxDiaAtual(){
  var pf=state.profile, dt=today();
  return (state.caixaDiario||[]).find(function(d){return d.data===dt&&d.profile===pf;})||null;
}

function renderCaixaDiario(){
  var pf=state.profile;
  var funcs=(state.funcionarios||[]).filter(function(f){
    return (f.profile===pf||!f.profile)&&f.status==='ativo'&&f.senhaRequisicao;
  }).sort(function(a,b){return a.nome.localeCompare(b.nome);});

  var session   = state.cxSession        || null;
  var pinSt     = state.cxPin            || null;
  var contModal = state.cxContagemModal  || null;
  var movModal  = state.cxMovModal       || null;

  var root=el('div',{style:{
    position:'fixed',inset:'0',background:'#0f172a',
    display:'flex',flexDirection:'column',zIndex:'9000',
    color:'#f1f5f9',fontFamily:"system-ui,-apple-system,sans-serif",
    touchAction:'manipulation',
  }});

  // ── HEADER ──────────────────────────────────────────────────────────────
  var hdr=el('div',{style:{
    display:'flex',alignItems:'center',gap:'12px',
    padding:'14px 20px',background:'#1e293b',
    borderBottom:'2px solid #334155',flexShrink:'0',
  }});
  hdr.appendChild(el('div',{style:{
    fontSize:'18px',fontWeight:'800',color:'#38bdf8',flex:'1',
    display:'flex',alignItems:'center',gap:'8px',
  }},'💵 Caixa Diário'));
  if(session){
    hdr.appendChild(el('div',{style:{
      padding:'7px 16px',background:'#334155',borderRadius:'20px',
      fontSize:'14px',fontWeight:'700',color:'#f1f5f9',
    }},'👤 '+session.funcNome));
  }
  var exitBtn=el('button',{style:{
    background:'#dc2626',color:'#fff',border:'none',borderRadius:'10px',
    padding:'10px 20px',cursor:'pointer',fontSize:'14px',fontWeight:'700',flexShrink:'0',
  }},session?'⬅ Sair':'✕ Fechar');
  exitBtn.onclick=function(){
    if(session){
      setState({cxSession:null,cxPin:null,cxContagemModal:null,cxMovModal:null});
    } else if(window.DJF_KIOSK_BOOT && typeof lockApp==='function'){
      lockApp();
    } else {
      setState({caixaDiarioMode:false,cxSession:null,cxPin:null,cxContagemModal:null,cxMovModal:null});
    }
  };
  hdr.appendChild(exitBtn);
  root.appendChild(hdr);

  // ── LOGIN ───────────────────────────────────────────────────────────────
  if(!session){
    var loginWrap=el('div',{style:{
      flex:'1',overflowY:'auto',padding:'40px 20px',
      display:'flex',flexDirection:'column',alignItems:'center',
    }});
    loginWrap.appendChild(el('div',{style:{
      fontSize:'18px',fontWeight:'700',color:'#94a3b8',marginBottom:'36px',textAlign:'center',
    }},'🔐  Selecione seu nome para continuar'));

    if(funcs.length===0){
      loginWrap.appendChild(el('div',{style:{
        textAlign:'center',padding:'48px 32px',background:'#1e293b',borderRadius:'20px',
        maxWidth:'480px',width:'100%',border:'1px solid #334155',
      }},[
        el('div',{style:{fontSize:'52px',marginBottom:'16px'}},'⚠'),
        el('div',{style:{fontWeight:'700',fontSize:'16px',marginBottom:'10px'}},'Nenhum funcionário configurado'),
        el('div',{style:{fontSize:'13px',color:'#64748b',lineHeight:'1.7'}},
          'Vá em Funcionários → edite um funcionário ativo → defina o PIN de 4 dígitos na seção "Acesso ao Tablet".'),
      ]));
    } else {
      var empGrid=el('div',{style:{
        display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',
        gap:'16px',maxWidth:'700px',width:'100%',
      }});
      funcs.forEach(function(f){
        var card=el('div',{style:{
          background:'#1e293b',border:'2px solid #334155',borderRadius:'18px',
          padding:'28px 14px',display:'flex',flexDirection:'column',
          alignItems:'center',gap:'10px',cursor:'pointer',minHeight:'150px',justifyContent:'center',
          transition:'border-color .15s,background .15s',
        }});
        card.onmouseenter=function(){card.style.borderColor='#60a5fa';card.style.background='rgba(29,78,216,.15)';};
        card.onmouseleave=function(){card.style.borderColor='#334155';card.style.background='#1e293b';};
        card.appendChild(el('div',{style:{fontSize:'44px'}},'👤'));
        card.appendChild(el('div',{style:{fontWeight:'800',fontSize:'16px',textAlign:'center',lineHeight:'1.3'}},f.nome));
        if(f.cargo)card.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8'}},f.cargo));
        !function(fn){
          card.onclick=function(){setState({cxPin:{funcId:fn.id,value:'',erro:false}});};
        }(f);
        empGrid.appendChild(card);
      });
      loginWrap.appendChild(empGrid);
    }
    root.appendChild(loginWrap);

    if(pinSt){
      var pinFunc=funcs.find(function(x){return x.id===pinSt.funcId;});
      if(pinFunc){
        var pinOv=el('div',{tabIndex:'-1',style:{
          position:'absolute',inset:'0',background:'rgba(0,0,0,.82)',
          display:'flex',alignItems:'center',justifyContent:'center',zIndex:'200',outline:'none',
        }});
        var pinBox=el('div',{style:{
          background:'#1e293b',borderRadius:'22px',padding:'32px 28px',
          width:'300px',maxWidth:'90vw',border:'2px solid #334155',
          boxShadow:'0 30px 80px rgba(0,0,0,.9)',
        }});
        pinBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'22px'}},[
          el('div',{style:{fontSize:'52px',lineHeight:'1'}},'👤'),
          el('div',{style:{fontWeight:'800',fontSize:'19px',marginTop:'10px'}},pinFunc.nome),
        ]));
        var dotsEl=el('div',{style:{display:'flex',gap:'14px',justifyContent:'center',marginBottom:'8px'}});
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

        function pressCxPinKey(key,fn){
          var cur=(state.cxPin||{}).value||'';
          if(key==='←'){
            setState({cxPin:{funcId:fn.id,value:cur.slice(0,-1),erro:false}});
          } else if(key==='✓'){
            var v=(state.cxPin||{}).value||'';
            if(v===fn.senhaRequisicao){
              setState({cxSession:{funcId:fn.id,funcNome:fn.nome,funcCargo:fn.cargo||''},cxPin:null});
            } else {
              setState({cxPin:{funcId:fn.id,value:'',erro:true}});
            }
          } else if(cur.length<4){
            var nova=cur+key;
            setState({cxPin:{funcId:fn.id,value:nova,erro:false}});
            if(nova.length===4){
              setTimeout(function(){
                var st=state.cxPin;
                if(!st||st.funcId!==fn.id)return;
                if(st.value===fn.senhaRequisicao){
                  setState({cxSession:{funcId:fn.id,funcNome:fn.nome,funcCargo:fn.cargo||''},cxPin:null});
                } else {
                  setState({cxPin:{funcId:fn.id,value:'',erro:true}});
                }
              },300);
            }
          }
        }
        pinOv.onkeydown=function(ev){
          var key=ev.key;
          if(key>='0'&&key<='9'){ev.preventDefault();pressCxPinKey(key,pinFunc);}
          else if(key==='Backspace'){ev.preventDefault();pressCxPinKey('←',pinFunc);}
          else if(key==='Enter'){ev.preventDefault();pressCxPinKey('✓',pinFunc);}
          else if(key==='Escape'){ev.preventDefault();setState({cxPin:null});}
        };

        var kpad=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'9px'}});
        ['1','2','3','4','5','6','7','8','9','←','0','✓'].forEach(function(k){
          var bgK=k==='✓'?'#1d4ed8':k==='←'?'#374151':'#334155';
          var kb=el('button',{style:{
            background:bgK,color:'#f1f5f9',border:'none',borderRadius:'12px',
            padding:'19px 10px',fontSize:'22px',fontWeight:'700',cursor:'pointer',lineHeight:'1',
          }},k);
          kb.onmouseenter=function(){kb.style.opacity='.8';};
          kb.onmouseleave=function(){kb.style.opacity='1';};
          !function(key,fn){
            kb.onclick=function(){pressCxPinKey(key,fn);};
          }(k,pinFunc);
          kpad.appendChild(kb);
        });
        pinBox.appendChild(kpad);
        var cancelPin=el('button',{style:{
          width:'100%',marginTop:'14px',background:'transparent',color:'#64748b',
          border:'1px solid #334155',borderRadius:'10px',padding:'12px',cursor:'pointer',
          fontSize:'14px',fontWeight:'600',
        }},'Cancelar');
        cancelPin.onclick=function(){setState({cxPin:null});};
        pinBox.appendChild(cancelPin);
        pinOv.appendChild(pinBox);
        root.appendChild(pinOv);
        setTimeout(function(){pinOv.focus();},0);
      }
    }
    return root;
  }

  // ── ÁREA PRINCIPAL (logado) ───────────────────────────────────────────────
  var dia  = _cxDiaAtual();
  var movs = (state.caixaDiarioMovs||[]).filter(function(m){return m.data===today()&&m.profile===pf;})
    .sort(function(a,b){return (b.criadoEm||'').localeCompare(a.criadoEm||'');});
  var totalEntradas = movs.filter(function(m){return m.tipo==='entrada';}).reduce(function(s,m){return s+m.valor;},0);
  var totalSaidas   = movs.filter(function(m){return m.tipo==='saida';}).reduce(function(s,m){return s+m.valor;},0);
  var aberturaTotal = dia?(dia.aberturaTotal||0):0;
  var saldoEsperado = aberturaTotal+totalEntradas-totalSaidas;

  var mainArea=el('div',{style:{flex:'1',overflowY:'auto',padding:'20px'}});
  mainArea.appendChild(el('div',{style:{fontSize:'14px',color:'#94a3b8',marginBottom:'16px',fontWeight:'700'}},
    '📅 '+(typeof fmtDate==='function'?fmtDate(today()):today())));

  if(!dia||dia.status!=='aberto'){
    if(dia&&dia.status==='fechado'){
      mainArea.appendChild(_cxResumoFechado(dia,totalEntradas,totalSaidas));
    } else {
      var abrirCard=el('div',{style:{
        textAlign:'center',padding:'48px 32px',background:'#1e293b',
        borderRadius:'20px',maxWidth:'420px',margin:'40px auto',border:'1px solid #334155',
      }});
      abrirCard.appendChild(el('div',{style:{fontSize:'52px',marginBottom:'16px'}},'🔓'));
      abrirCard.appendChild(el('div',{style:{fontWeight:'700',fontSize:'16px',marginBottom:'20px'}},'Caixa ainda não foi aberto hoje'));
      var abrirBtn=el('button',{style:{
        background:'#16a34a',color:'#fff',border:'none',borderRadius:'12px',
        padding:'16px 32px',cursor:'pointer',fontSize:'16px',fontWeight:'800',
      }},'🔓 Contar e Abrir Caixa');
      abrirBtn.onclick=function(){setState({cxContagemModal:{tipo:'abertura',qtds:{}}});};
      abrirCard.appendChild(abrirBtn);
      mainArea.appendChild(abrirCard);
    }
  } else {
    var kpis=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}});
    function kpiCard(label,val,cor){
      return el('div',{style:{background:'#1e293b',border:'1px solid #334155',borderRadius:'14px',padding:'16px'}},[
        el('div',{style:{fontSize:'11px',color:'#94a3b8',fontWeight:'700',textTransform:'uppercase',marginBottom:'6px'}},label),
        el('div',{style:{fontSize:'20px',fontWeight:'800',color:cor||'#f1f5f9'}},fmtMoney(val)),
      ]);
    }
    kpis.appendChild(kpiCard('Abertura',aberturaTotal,'#60a5fa'));
    kpis.appendChild(kpiCard('Entradas',totalEntradas,'#4ade80'));
    kpis.appendChild(kpiCard('Saídas',totalSaidas,'#f87171'));
    kpis.appendChild(kpiCard('Saldo esperado',saldoEsperado,'#fbbf24'));
    mainArea.appendChild(kpis);

    var actsRow=el('div',{style:{display:'flex',gap:'10px',marginBottom:'20px',flexWrap:'wrap'}});
    var addEntBtn=el('button',{style:{
      flex:'1',minWidth:'140px',background:'#16a34a',color:'#fff',border:'none',
      borderRadius:'12px',padding:'14px',cursor:'pointer',fontSize:'15px',fontWeight:'800',
    }},'+ Entrada');
    addEntBtn.onclick=function(){setState({cxMovModal:{tipo:'entrada',descricao:'',valor:''}});};
    var addSaiBtn=el('button',{style:{
      flex:'1',minWidth:'140px',background:'#dc2626',color:'#fff',border:'none',
      borderRadius:'12px',padding:'14px',cursor:'pointer',fontSize:'15px',fontWeight:'800',
    }},'− Saída');
    addSaiBtn.onclick=function(){setState({cxMovModal:{tipo:'saida',descricao:'',valor:''}});};
    actsRow.appendChild(addEntBtn);actsRow.appendChild(addSaiBtn);
    mainArea.appendChild(actsRow);

    mainArea.appendChild(el('div',{style:{fontSize:'14px',fontWeight:'700',color:'#94a3b8',marginBottom:'10px'}},'Movimentações de hoje'));
    if(movs.length===0){
      mainArea.appendChild(el('div',{style:{textAlign:'center',color:'#64748b',padding:'30px',fontSize:'14px'}},'Nenhuma movimentação registrada ainda.'));
    } else {
      movs.forEach(function(m){
        var row=el('div',{style:{
          display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',
          background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',marginBottom:'8px',
        }});
        row.appendChild(el('div',{style:{fontSize:'20px'}},m.tipo==='entrada'?'⬆':'⬇'));
        row.appendChild(el('div',{style:{flex:'1'}},[
          el('div',{style:{fontSize:'14px',fontWeight:'700'}},m.descricao||'—'),
          el('div',{style:{fontSize:'11px',color:'#64748b'}},(m.horario||'')+' · '+(m.funcNome||'')),
        ]));
        row.appendChild(el('div',{style:{fontSize:'15px',fontWeight:'800',color:m.tipo==='entrada'?'#4ade80':'#f87171'}},
          (m.tipo==='entrada'?'+':'−')+fmtMoney(m.valor)));
        var delBtn=el('button',{style:{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:'20px',padding:'0 4px',lineHeight:'1'}},'×');
        delBtn.onclick=(function(id){return function(){
          var novos=(state.caixaDiarioMovs||[]).filter(function(x){return x.id!==id;});
          lsSet('caixaDiarioMovs',novos);
          setState({caixaDiarioMovs:novos});
          scheduleSave();
        };})(m.id);
        row.appendChild(delBtn);
        mainArea.appendChild(row);
      });
    }

    var fecharBtn=el('button',{style:{
      width:'100%',marginTop:'20px',background:'#334155',color:'#fff',border:'none',
      borderRadius:'12px',padding:'16px',cursor:'pointer',fontSize:'15px',fontWeight:'800',
    }},'🔒 Contar e Fechar Caixa');
    fecharBtn.onclick=function(){setState({cxContagemModal:{tipo:'fechamento',qtds:{}}});};
    mainArea.appendChild(fecharBtn);
  }

  root.appendChild(mainArea);

  if(contModal)root.appendChild(_cxRenderContagemModal(contModal,dia,session,totalEntradas,totalSaidas));
  if(movModal)root.appendChild(_cxRenderMovModal(movModal,session));

  return root;
}

// ── RESUMO DO DIA JÁ FECHADO ─────────────────────────────────────────────────
function _cxResumoFechado(dia,totalEntradas,totalSaidas){
  var saldoEsp=(dia.aberturaTotal||0)+totalEntradas-totalSaidas;
  var dif=(dia.fechamentoTotal||0)-saldoEsp;
  var card=el('div',{style:{
    background:'#1e293b',border:'1px solid #334155',borderRadius:'16px',padding:'24px',maxWidth:'440px',margin:'20px auto',
  }});
  card.appendChild(el('div',{style:{fontSize:'16px',fontWeight:'800',marginBottom:'16px',textAlign:'center'}},'✅ Caixa fechado hoje'));
  function linha(label,val,cor){
    return el('div',{style:{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #334155',fontSize:'14px'}},[
      el('span',{style:{color:'#94a3b8'}},label),
      el('span',{style:{fontWeight:'700',color:cor||'#f1f5f9'}},fmtMoney(val)),
    ]);
  }
  card.appendChild(linha('Abertura',dia.aberturaTotal||0,'#60a5fa'));
  card.appendChild(linha('Entradas',totalEntradas,'#4ade80'));
  card.appendChild(linha('Saídas',totalSaidas,'#f87171'));
  card.appendChild(linha('Saldo esperado',saldoEsp,'#fbbf24'));
  card.appendChild(linha('Contado no fechamento',dia.fechamentoTotal||0));
  card.appendChild(el('div',{style:{display:'flex',justifyContent:'space-between',padding:'12px 0 0',marginTop:'8px',borderTop:'2px solid #334155',fontSize:'15px'}},[
    el('span',{style:{fontWeight:'800'}},'Diferença'),
    el('span',{style:{fontWeight:'900',color:Math.abs(dif)<0.01?'#4ade80':dif>0?'#fbbf24':'#f87171'}},
      Math.abs(dif)<0.01?'✓ Conferido':(dif>0?'+':'')+fmtMoney(dif)),
  ]));
  var reabrirBtn=el('button',{style:{
    width:'100%',marginTop:'18px',background:'#334155',color:'#fff',border:'none',
    borderRadius:'10px',padding:'12px',cursor:'pointer',fontSize:'13px',fontWeight:'700',
  }},'🔓 Reabrir caixa para corrigir');
  reabrirBtn.onclick=function(){
    var dias=(state.caixaDiario||[]).map(function(d){
      return d.id===dia.id?Object.assign({},d,{status:'aberto'}):d;
    });
    lsSet('caixaDiario',dias);
    setState({caixaDiario:dias});
    scheduleSave();
    showToast('Caixa reaberto','error');
  };
  card.appendChild(reabrirBtn);
  return card;
}

// ── MODAL DE CONTAGEM DE CÉDULAS/MOEDAS (abertura ou fechamento) ─────────────
function _cxRenderContagemModal(m,dia,session,totalEntradas,totalSaidas){
  var isFechamento=m.tipo==='fechamento';
  var qtds=m.qtds||{};

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',
    padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'380px',maxWidth:'94vw',border:'2px solid #334155',
    maxHeight:'90vh',overflowY:'auto',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center'}},
    isFechamento?'🔒 Contagem de Fechamento':'🔓 Contagem de Abertura'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'18px'}},
    'Conte as cédulas e moedas do caixa'));

  function calcTotal(){
    var t=0;
    _CEDULAS.forEach(function(c){t+=(parseInt(qtds[c.val.toFixed(2)])||0)*c.val;});
    return Math.round(t*100)/100;
  }
  var totalEl=el('div',{style:{fontSize:'26px',fontWeight:'900',color:'#fbbf24',textAlign:'right'}},fmtMoney(calcTotal()));

  _CEDULAS.forEach(function(c){
    var key=c.val.toFixed(2);
    var inp=el('input',{type:'number',min:'0',inputmode:'numeric',value:qtds[key]||'',placeholder:'0',
      style:{width:'70px',padding:'8px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',textAlign:'center',fontSize:'15px'}});
    inp.oninput=function(){
      qtds[key]=parseInt(inp.value)||0;
      m.qtds=qtds;
      totalEl.textContent=fmtMoney(calcTotal());
    };
    box.appendChild(el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #334155'}},[
      el('span',{style:{fontSize:'14px',fontWeight:'700'}},c.label),
      inp,
    ]));
  });

  box.appendChild(el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 0 6px',marginTop:'8px',borderTop:'2px solid #334155'}},[
    el('span',{style:{fontSize:'13px',fontWeight:'700',color:'#94a3b8'}},'TOTAL CONTADO'),
    totalEl,
  ]));

  if(isFechamento){
    var saldoEsp=(dia?dia.aberturaTotal||0:0)+totalEntradas-totalSaidas;
    box.appendChild(el('div',{style:{fontSize:'12px',color:'#64748b',textAlign:'center',marginTop:'6px'}},
      'Saldo esperado pelo sistema: '+fmtMoney(saldoEsp)));
  }

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'18px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxContagemModal:null});};
  var confirmBtn=el('button',{style:{background:isFechamento?'#dc2626':'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},
    isFechamento?'🔒 Confirmar Fechamento':'🔓 Confirmar Abertura');
  confirmBtn.onclick=function(){
    var total=calcTotal();
    var pf=state.profile, dt=today(), agora=new Date();
    var horario=agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    var dias=(state.caixaDiario||[]).slice();
    var idx=-1;
    for(var i=0;i<dias.length;i++){if(dias[i].data===dt&&dias[i].profile===pf){idx=i;break;}}
    if(isFechamento){
      if(idx<0)return;
      dias[idx]=Object.assign({},dias[idx],{
        fechamentoCedulas:Object.assign({},qtds),fechamentoTotal:total,
        fechamentoFuncId:session.funcId,fechamentoFuncNome:session.funcNome,
        fechamentoHorario:horario,status:'fechado',
      });
    } else {
      var novo={
        id:uid(),profile:pf,data:dt,
        aberturaCedulas:Object.assign({},qtds),aberturaTotal:total,
        aberturaFuncId:session.funcId,aberturaFuncNome:session.funcNome,aberturaHorario:horario,
        status:'aberto',
      };
      if(idx>=0)dias[idx]=Object.assign({},dias[idx],novo);
      else dias.push(novo);
    }
    lsSet('caixaDiario',dias);
    setState({caixaDiario:dias,cxContagemModal:null});
    scheduleSave();
    showToast(isFechamento?'Caixa fechado!':'Caixa aberto!','success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);
  box.appendChild(actsRow);

  ov.appendChild(box);
  return ov;
}

// ── MODAL DE NOVA ENTRADA/SAÍDA ──────────────────────────────────────────────
function _cxRenderMovModal(m,session){
  var isEntrada=m.tipo==='entrada';
  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'360px',maxWidth:'94vw',border:'2px solid #334155',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'18px',textAlign:'center',color:isEntrada?'#4ade80':'#f87171'}},
    isEntrada?'⬆ Nova Entrada':'⬇ Nova Saída'));

  var descInp=el('input',{type:'text',placeholder:'Descrição (ex: Sangria, Troco, Compra gelo...)',value:m.descricao||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px',marginBottom:'12px'}});
  descInp.oninput=function(){m.descricao=descInp.value;};

  var valInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'0,00',value:m.valor||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'18px',fontWeight:'700',textAlign:'center',marginBottom:'18px'}});
  valInp.oninput=function(){m.valor=valInp.value;};

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxMovModal:null});};
  var confirmBtn=el('button',{style:{background:isEntrada?'#16a34a':'#dc2626',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Salvar');
  confirmBtn.onclick=function(){
    var desc=(m.descricao||'').trim();
    var val=parseFloat((m.valor+'').replace(',','.'))||0;
    if(!desc){showToast('Informe uma descrição','error');return;}
    if(!val||val<=0){showToast('Informe um valor válido','error');return;}
    var agora=new Date();
    var novo={
      id:uid(),profile:state.profile,data:today(),
      tipo:m.tipo,descricao:desc,valor:val,
      funcId:session.funcId,funcNome:session.funcNome,
      horario:agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:agora.toISOString(),
    };
    var lista=(state.caixaDiarioMovs||[]).concat([novo]);
    lsSet('caixaDiarioMovs',lista);
    setState({caixaDiarioMovs:lista,cxMovModal:null});
    scheduleSave();
    showToast('Lançamento registrado!','success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);

  box.appendChild(descInp);box.appendChild(valInp);box.appendChild(actsRow);
  ov.appendChild(box);
  return ov;
}
