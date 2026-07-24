// ── CAIXA DIÁRIO (Kiosk PC do Caixa) ─────────────────────────────────────────
// Livro de caixa diário: abertura e fechamento por contagem de cédulas/moedas,
// e lançamento de entradas/saídas ao longo do dia pelo responsável do caixa.
// Acessível via state.caixaDiarioMode = true (login por PIN de funcionário,
// reaproveita o mesmo PIN de 4 dígitos já usado na Requisição de Estoque).

// Permite múltiplas sessões de caixa no mesmo dia (ex: turno almoço + jantar).
// Retorna a sessão aberta da data se existir; senão, a última sessão da data
// (fechada) para exibir o resumo; senão null (nenhuma sessão nessa data).
function _cxDiaPorData(dt){
  var pf=state.profile;
  var todos=(state.caixaDiario||[]).filter(function(d){return d.data===dt&&d.profile===pf;});
  if(todos.length===0)return null;
  var aberto=todos.find(function(d){return d.status==='aberto';});
  return aberto||todos[todos.length-1];
}
function _cxDiaAtual(){
  return _cxDiaPorData(today());
}

// Processa uma tecla do teclado numérico do PIN (clique no botão ou teclado físico)
function _cxPressPinKey(key,fn){
  var cur=(state.cxPin||{}).value||'';
  var setup=!fn.pin;
  function tentaConcluir(v){
    if(setup){
      _cxSalvarPinUsuario(fn,v);
      setState({cxSession:{funcId:fn.id,funcNome:fn.nome,funcCargo:fn.cargo||''},cxPin:null});
    } else if(v===fn.pin){
      setState({cxSession:{funcId:fn.id,funcNome:fn.nome,funcCargo:fn.cargo||''},cxPin:null});
    } else {
      setState({cxPin:{funcId:fn.id,value:'',erro:true}});
    }
  }
  if(key==='←'){
    setState({cxPin:{funcId:fn.id,value:cur.slice(0,-1),erro:false}});
  } else if(key==='✓'){
    var v=(state.cxPin||{}).value||'';
    if(v.length===4)tentaConcluir(v);
  } else if(cur.length<4){
    var nova=cur+key;
    setState({cxPin:{funcId:fn.id,value:nova,erro:false}});
    if(nova.length===4){
      setTimeout(function(){
        var st=state.cxPin;
        if(!st||st.funcId!==fn.id)return;
        tentaConcluir(st.value);
      },300);
    }
  }
}

// Teclado físico do kiosk: listener global (não depende de foco em nenhum
// elemento específico, evitando perder digitação em re-renders do kiosk).
// Cobre tanto a digitação do PIN quanto a navegação por setas na tela de login.
if(!window._cxKeydownBound){
  window._cxKeydownBound=true;
  document.addEventListener('keydown',function(e){
    if(!state.caixaDiarioMode)return;
    var k=e.key;

    if(state.cxPin){
      var funcsPin=typeof _cxListaLogin==='function'?_cxListaLogin():[];
      var fn=funcsPin.find(function(x){return x.id===state.cxPin.funcId;});
      if(!fn)return;
      if(k>='0'&&k<='9'){e.preventDefault();_cxPressPinKey(k,fn);}
      else if(k==='Backspace'){e.preventDefault();_cxPressPinKey('←',fn);}
      else if(k==='Enter'){e.preventDefault();_cxPressPinKey('✓',fn);}
      else if(k==='Escape'){e.preventDefault();setState({cxPin:null});}
      return;
    }

    if(!state.cxSession){
      var funcsNav=typeof _cxListaLogin==='function'?_cxListaLogin():[];
      if(funcsNav.length===0)return;
      var curId=state.cxLoginSel||funcsNav[0].id;
      var idx=funcsNav.findIndex(function(x){return x.id===curId;});
      if(idx<0)idx=0;
      if(k==='ArrowRight'||k==='ArrowDown'){
        e.preventDefault();
        idx=(idx+1)%funcsNav.length;
        setState({cxLoginSel:funcsNav[idx].id});
      } else if(k==='ArrowLeft'||k==='ArrowUp'){
        e.preventDefault();
        idx=(idx-1+funcsNav.length)%funcsNav.length;
        setState({cxLoginSel:funcsNav[idx].id});
      } else if(k==='Enter'||k===' '){
        e.preventDefault();
        setState({cxPin:{funcId:funcsNav[idx].id,value:'',erro:false},cxLoginSel:funcsNav[idx].id});
      }
    }
  });
}

// Só o Desenvolvedor pode editar/excluir formas de pagamento e taxas
function _cxIsDev(session){
  if(!session)return false;
  return (state.usuarios||[]).some(function(u){return u.id===session.funcId&&u.papel==='desenvolvedor';});
}

// Semeia o catálogo de formas de pagamento na primeira vez que o kiosk abre
// taxaTipo: 'pct' (% sobre o valor) ou 'fixo' (R$ fixo por venda, ex: taxa de pedido próprio do Yooga)
var _CX_FORMAS_DEFAULT=[
  {id:'fp_dinheiro',          nome:'Dinheiro',            taxaValor:0,    taxaTipo:'pct', ehDinheiroFisico:true},
  {id:'fp_pix',                nome:'Pix',                  taxaValor:0,    taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_debito',              nome:'Débito',                taxaValor:1.2,  taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_credito',            nome:'Crédito',              taxaValor:2.5,  taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_delivery_dinheiro', nome:'Delivery - Dinheiro', taxaValor:0,    taxaTipo:'pct', ehDinheiroFisico:true},
  {id:'fp_delivery_debito',    nome:'Delivery - Débito',    taxaValor:1.2,  taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_delivery_credito',  nome:'Delivery - Crédito',  taxaValor:2.5,  taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_delivery_pix',      nome:'Delivery - Pix',      taxaValor:0,    taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_ifood',              nome:'iFood Online',         taxaValor:12,   taxaTipo:'pct', ehDinheiroFisico:false},
  {id:'fp_yooga',              nome:'Yooga Online',         taxaValor:0.99, taxaTipo:'fixo', ehDinheiroFisico:false},
];
function _cxSeedFormasPagamento(){
  if(state.formasPagamento&&state.formasPagamento.length>0)return;
  var def=_CX_FORMAS_DEFAULT.map(function(f){return Object.assign({},f);});
  lsSet('formasPagamento',def);
  state.formasPagamento=def;
}
// Taxa da forma de pagamento: percentual sobre o valor, ou valor fixo em R$ por venda
// (ex: Yooga cobra R$0,99 fixo quando o cliente pede por conta própria, não é %)
function _cxCalcLiquido(val,f){
  var t=f.taxaValor||0;
  var desconto=f.taxaTipo==='fixo'?Math.min(t,val):val*(t/100);
  return Math.round((val-desconto)*100)/100;
}
function _cxFormatTaxa(f){
  return f.taxaTipo==='fixo'?fmtMoney(f.taxaValor||0):(f.taxaValor||0)+'%';
}

// Junta funcionários (PIN da Requisição de Estoque) + usuários admin/dev
// (PIN próprio do Caixa, "pinCaixa") numa única lista de login, em ordem alfabética
function _cxListaLogin(){
  var pf=state.profile;
  var funcsFunc=(state.funcionarios||[]).filter(function(f){
    return (f.profile===pf||!f.profile)&&f.status==='ativo'&&f.senhaRequisicao;
  }).map(function(f){
    return {id:f.id,nome:f.nome,cargo:f.cargo||'',pin:f.senhaRequisicao,_tipo:'funcionario'};
  });
  var funcsAdmin=(state.usuarios||[]).filter(function(u){
    return u.ativo!==false&&(u.papel==='desenvolvedor'||u.papel==='administrador')&&(!u.perfil||u.perfil==='ambos'||u.perfil===pf);
  }).map(function(u){
    return {id:u.id,nome:u.nome,cargo:u.papel==='desenvolvedor'?'Desenvolvedor':'Administrador',pin:u.pinCaixa||'',_tipo:'usuario'};
  });
  return funcsFunc.concat(funcsAdmin).sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});
}
function _cxSalvarPinUsuario(fn,pin){
  var usuarios=(state.usuarios||[]).map(function(u){
    return u.id===fn.id?Object.assign({},u,{pinCaixa:pin}):u;
  });
  lsSet('usuarios',usuarios);
  state.usuarios=usuarios;
  scheduleSave();
}

function renderCaixaDiario(){
  _cxSeedFormasPagamento();
  var pf=state.profile;
  var funcs=_cxListaLogin();

  var session   = state.cxSession        || null;
  var pinSt     = state.cxPin            || null;
  var contModal = state.cxContagemModal  || null;
  var movModal  = state.cxMovModal       || null;
  var formasModal = state.cxFormasModal  || false;

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
  var logoBase64=((state.empresaData||{})[pf]||{}).logoBase64;
  var tituloEls=[];
  if(logoBase64){
    tituloEls.push(el('img',{src:logoBase64,style:{width:'32px',height:'32px',borderRadius:'8px',objectFit:'cover',flexShrink:'0'}}));
  } else {
    tituloEls.push(document.createTextNode('💵'));
  }
  tituloEls.push(document.createTextNode('Caixa Diário'));
  hdr.appendChild(el('div',{style:{
    fontSize:'18px',fontWeight:'800',color:'#38bdf8',flex:'1',
    display:'flex',alignItems:'center',gap:'8px',
  }},tituloEls));
  var pickerOpen=!!state.cxPickerOpen;
  if(session){
    var userBtn=el('button',{title:'Trocar de usuário',style:{
      display:'flex',alignItems:'center',gap:'8px',
      padding:'7px 12px 7px 16px',background:'#334155',border:'none',borderRadius:'20px',
      fontSize:'14px',fontWeight:'700',color:'#f1f5f9',cursor:'pointer',fontFamily:'inherit',
    }},[
      document.createTextNode('👤 '+session.funcNome),
      el('span',{style:{fontSize:'11px',color:'#94a3b8',transition:'transform .15s',display:'inline-block',transform:pickerOpen?'rotate(180deg)':'none'}},'▾'),
    ]);
    userBtn.onclick=function(){setState({cxPickerOpen:!pickerOpen});};
    hdr.appendChild(userBtn);
    if(_cxIsDev(session)){
      var relBtn=el('button',{title:'Relatório de vendas (PDF)',style:{
        background:'#334155',color:'#f1f5f9',border:'none',borderRadius:'10px',
        padding:'10px 14px',cursor:'pointer',fontSize:'16px',flexShrink:'0',
      }},'📄');
      relBtn.onclick=function(){setState({cxPickerOpen:false,cxRelatorioModal:{data:today()}});};
      hdr.appendChild(relBtn);
      var gearBtn=el('button',{title:'Gerenciar formas de pagamento',style:{
        background:'#334155',color:'#f1f5f9',border:'none',borderRadius:'10px',
        padding:'10px 14px',cursor:'pointer',fontSize:'16px',flexShrink:'0',
      }},'⚙');
      gearBtn.onclick=function(){setState({cxFormasModal:true,cxPickerOpen:false});};
      hdr.appendChild(gearBtn);
    }
  }
  var exitBtn=el('button',{style:{
    background:'#dc2626',color:'#fff',border:'none',borderRadius:'10px',
    padding:'10px 20px',cursor:'pointer',fontSize:'14px',fontWeight:'700',flexShrink:'0',
  }},session?'⬅ Sair':'✕ Fechar');
  exitBtn.onclick=function(){
    if(session){
      setState({cxSession:null,cxPin:null,cxContagemModal:null,cxMovModal:null,cxFormasModal:false,cxPickerOpen:false,cxKpiDetalhe:null,cxRelatorioModal:null});
    } else if(window.DJF_KIOSK_BOOT && typeof lockApp==='function'){
      lockApp();
    } else {
      setState({caixaDiarioMode:false,cxSession:null,cxPin:null,cxContagemModal:null,cxMovModal:null,cxFormasModal:false,cxPickerOpen:false,cxKpiDetalhe:null,cxRelatorioModal:null});
    }
  };
  hdr.appendChild(exitBtn);
  root.appendChild(hdr);

  if(session&&pickerOpen){
    var pickerPanel=el('div',{style:{
      position:'absolute',top:'62px',right:'150px',zIndex:'250',
      background:'#1e293b',border:'2px solid #334155',borderRadius:'14px',
      padding:'8px',minWidth:'220px',maxHeight:'320px',overflowY:'auto',
      boxShadow:'0 20px 60px rgba(0,0,0,.7)',
    }});
    funcs.forEach(function(f){
      var isAtual=session.funcId===f.id;
      var item=el('div',{style:{
        display:'flex',alignItems:'center',gap:'10px',padding:'9px 10px',borderRadius:'9px',
        cursor:isAtual?'default':'pointer',background:isAtual?'rgba(29,78,216,.25)':'transparent',
      }});
      item.onmouseenter=function(){if(!isAtual)item.style.background='rgba(255,255,255,.06)';};
      item.onmouseleave=function(){item.style.background=isAtual?'rgba(29,78,216,.25)':'transparent';};
      item.appendChild(el('div',{style:{fontSize:'22px'}},'👤'));
      item.appendChild(el('div',{style:{flex:'1',minWidth:'0'}},[
        el('div',{style:{fontSize:'13px',fontWeight:'700',color:'#f1f5f9'}},f.nome+(isAtual?' (você)':'')),
        f.cargo?el('div',{style:{fontSize:'11px',color:'#94a3b8'}},f.cargo):null,
      ].filter(Boolean)));
      if(isAtual)item.appendChild(el('span',{style:{color:'#4ade80',fontSize:'14px'}},'✓'));
      if(!isAtual){
        !function(fn){
          item.onclick=function(){setState({cxPin:{funcId:fn.id,value:'',erro:false},cxPickerOpen:false});};
        }(f);
      }
      pickerPanel.appendChild(item);
    });
    root.appendChild(pickerPanel);
  }

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
      if(!state.cxLoginSel||!funcs.some(function(f){return f.id===state.cxLoginSel;})){
        state.cxLoginSel=funcs[0].id;
      }
      var empGrid=el('div',{style:{
        display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',
        gap:'16px',maxWidth:'700px',width:'100%',
      }});
      funcs.forEach(function(f){
        var isSel=f.id===state.cxLoginSel;
        var card=el('div',{style:{
          background:isSel?'rgba(29,78,216,.18)':'#1e293b',
          border:'2px solid '+(isSel?'#60a5fa':'#334155'),
          borderRadius:'18px',boxShadow:isSel?'0 0 0 3px rgba(96,165,250,.25)':'none',
          padding:'28px 14px',display:'flex',flexDirection:'column',
          alignItems:'center',gap:'10px',cursor:'pointer',minHeight:'150px',justifyContent:'center',
          transition:'border-color .15s,background .15s',
        }});
        card.onmouseenter=function(){card.style.borderColor='#60a5fa';card.style.background='rgba(29,78,216,.15)';};
        card.onmouseleave=function(){card.style.borderColor=isSel?'#60a5fa':'#334155';card.style.background=isSel?'rgba(29,78,216,.18)':'#1e293b';};
        card.appendChild(el('div',{style:{fontSize:'44px'}},'👤'));
        card.appendChild(el('div',{style:{fontWeight:'800',fontSize:'16px',textAlign:'center',lineHeight:'1.3'}},f.nome));
        if(f.cargo)card.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8'}},f.cargo));
        if(!f.pin)card.appendChild(el('div',{style:{fontSize:'10px',fontWeight:'700',color:'#fbbf24',background:'rgba(251,191,36,.12)',border:'1px solid rgba(251,191,36,.3)',borderRadius:'6px',padding:'2px 8px'}},'🆕 Criar PIN'));
        !function(fn){
          card.onclick=function(){setState({cxPin:{funcId:fn.id,value:'',erro:false},cxLoginSel:fn.id});};
        }(f);
        empGrid.appendChild(card);
      });
      loginWrap.appendChild(empGrid);
    }
    root.appendChild(loginWrap);
  } else {

  // ── ÁREA PRINCIPAL (logado) ───────────────────────────────────────────────
  var dia  = _cxDiaAtual();
  // Movimentações pertencem à sessão de caixa atual (não a todas do dia), para
  // que uma nova abertura comece com Vendas/Saídas zerados de novo.
  var movs = dia?(state.caixaDiarioMovs||[]).filter(function(m){return m.diaId===dia.id&&m.profile===pf;})
    .sort(function(a,b){return (b.criadoEm||'').localeCompare(a.criadoEm||'');}):[];
  var totalEntradas = movs.filter(function(m){return m.tipo==='entrada';}).reduce(function(s,m){return s+m.valor;},0);
  var totalSaidas   = movs.filter(function(m){return m.tipo==='saida';}).reduce(function(s,m){return s+m.valor;},0);
  // Só as formas marcadas como "dinheiro físico" entram na contagem de cédulas do fechamento
  var totalDinheiroFisico = movs.filter(function(m){return m.tipo==='entrada';}).reduce(function(s,m){
    return s+(m.valorDinheiroFisico!==undefined?m.valorDinheiroFisico:m.valor);
  },0);
  var aberturaTotal = dia?(dia.aberturaTotal||0):0;
  var saldoFisicoEsperado = aberturaTotal+totalDinheiroFisico-totalSaidas;

  var mainArea=el('div',{style:{flex:'1',overflowY:'auto',padding:'20px'}});
  mainArea.appendChild(el('div',{style:{fontSize:'14px',color:'#94a3b8',marginBottom:'16px',fontWeight:'700'}},
    '📅 '+(typeof fmtDate==='function'?fmtDate(today()):today())));

  if(!dia||dia.status!=='aberto'){
    if(dia&&dia.status==='fechado'){
      mainArea.appendChild(_cxResumoFechado(dia));
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
    function kpiCard(label,val,cor,tipo){
      var card=el('div',{style:{background:'#1e293b',border:'1px solid #334155',borderRadius:'14px',padding:'16px',cursor:'pointer',transition:'border-color .15s'},title:'Ver histórico'},[
        el('div',{style:{fontSize:'11px',color:'#94a3b8',fontWeight:'700',textTransform:'uppercase',marginBottom:'6px'}},label),
        el('div',{style:{fontSize:'20px',fontWeight:'800',color:cor||'#f1f5f9'}},fmtMoney(val)),
      ]);
      card.onmouseenter=function(){card.style.borderColor='#60a5fa';};
      card.onmouseleave=function(){card.style.borderColor='#334155';};
      card.onclick=function(){setState({cxKpiDetalhe:tipo});};
      return card;
    }
    kpis.appendChild(kpiCard('Abertura',aberturaTotal,'#60a5fa','abertura'));
    kpis.appendChild(kpiCard('Vendas do dia',totalEntradas,'#4ade80','vendas'));
    kpis.appendChild(kpiCard('Saídas',totalSaidas,'#f87171','saidas'));
    kpis.appendChild(kpiCard('Dinheiro esperado no caixa',saldoFisicoEsperado,'#fbbf24','dinheiro'));
    mainArea.appendChild(kpis);

    var actsRow=el('div',{style:{display:'flex',gap:'10px',marginBottom:'20px',flexWrap:'wrap'}});
    var addEntBtn=el('button',{style:{
      flex:'1',minWidth:'140px',background:'#16a34a',color:'#fff',border:'none',
      borderRadius:'12px',padding:'14px',cursor:'pointer',fontSize:'15px',fontWeight:'800',
    }},'+ Entrada');
    addEntBtn.onclick=function(){setState({cxMovModal:{tipo:'entrada',canal:'salao',identificacao:'',misto:false,pagamentos:[{formaId:((state.formasPagamento||[])[0]||{}).id||'',valor:''}]}});};
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
        var titulo, sub;
        if(m.tipo==='entrada'&&m.pagamentos){
          var canalLabel=m.canal==='delivery'?'🛵 Delivery':'🏠 Salão';
          titulo=canalLabel+(m.identificacao?' · '+m.identificacao:'');
          var formasTxt=m.pagamentos.map(function(p){return p.formaNome+' '+fmtMoney(p.valor);}).join(' + ');
          if(m.troco>0)formasTxt+=' (troco '+fmtMoney(m.troco)+')';
          if(m.falta>0)formasTxt+=' (falta '+fmtMoney(m.falta)+')';
          sub=(m.horario||'')+' · '+(m.funcNome||'')+' · '+formasTxt;
        } else {
          titulo=m.descricao||'—';
          sub=(m.horario||'')+' · '+(m.funcNome||'');
        }
        row.appendChild(el('div',{style:{flex:'1',minWidth:'0'}},[
          el('div',{style:{fontSize:'14px',fontWeight:'700'}},titulo),
          el('div',{style:{fontSize:'11px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},sub),
        ]));
        row.appendChild(el('div',{style:{fontSize:'15px',fontWeight:'800',color:m.tipo==='entrada'?'#4ade80':'#f87171',whiteSpace:'nowrap'}},
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

  if(contModal)root.appendChild(_cxRenderContagemModal(contModal,dia,session,totalDinheiroFisico,totalSaidas));
  if(movModal)root.appendChild(movModal.tipo==='entrada'?_cxRenderEntradaModal(movModal,session):_cxRenderSaidaModal(movModal,session));
  if(formasModal)root.appendChild(_cxRenderFormasModal());
  if(state.cxKpiDetalhe)root.appendChild(_cxRenderKpiModal(state.cxKpiDetalhe,dia,movs,aberturaTotal,totalEntradas,totalSaidas,totalDinheiroFisico,saldoFisicoEsperado));
  if(state.cxRelatorioModal)root.appendChild(_cxRenderRelatorioFiltroModal());
  }

  // ── PIN overlay: usado tanto no login inicial quanto ao trocar de usuário ──
  if(pinSt){
    var pinFunc=funcs.find(function(x){return x.id===pinSt.funcId;});
    if(pinFunc){
      var pinOv=el('div',{style:{
        position:'absolute',inset:'0',background:'rgba(0,0,0,.82)',
        display:'flex',alignItems:'center',justifyContent:'center',zIndex:'200',
      }});
      var pinBox=el('div',{style:{
        background:'#1e293b',borderRadius:'22px',padding:'32px 28px',
        width:'300px',maxWidth:'90vw',border:'2px solid #334155',
        boxShadow:'0 30px 80px rgba(0,0,0,.9)',
      }});
      var isSetup=!pinFunc.pin;
      pinBox.appendChild(el('div',{style:{textAlign:'center',marginBottom:'22px'}},[
        el('div',{style:{fontSize:'52px',lineHeight:'1'}},'👤'),
        el('div',{style:{fontWeight:'800',fontSize:'19px',marginTop:'10px'}},pinFunc.nome),
        isSetup?el('div',{style:{fontSize:'12px',color:'#fbbf24',marginTop:'6px',fontWeight:'700'}},'🆕 Primeiro acesso — crie seu PIN de 4 dígitos'):null,
      ].filter(Boolean)));
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
          kb.onclick=function(){_cxPressPinKey(key,fn);};
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
    }
  }

  return root;
}

// ── RESUMO DO DIA JÁ FECHADO ─────────────────────────────────────────────────
// Visão mínima: o caixa foi encerrado, os números ficam guardados (dev pode
// consultar pelo Relatório em PDF). A única ação daqui é abrir uma nova sessão.
function _cxResumoFechado(dia){
  var card=el('div',{style:{
    background:'#1e293b',border:'1px solid #334155',borderRadius:'16px',padding:'32px 24px',
    maxWidth:'420px',margin:'40px auto',textAlign:'center',
  }});
  card.appendChild(el('div',{style:{fontSize:'44px',marginBottom:'12px'}},'✅'));
  card.appendChild(el('div',{style:{fontSize:'17px',fontWeight:'800',marginBottom:'6px'}},'Caixa fechado'));
  card.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',marginBottom:'24px'}},
    'Encerrado às '+(dia.fechamentoHorario||'—')+' por '+(dia.fechamentoFuncNome||'—')));
  var novaBtn=el('button',{style:{
    width:'100%',background:'#16a34a',color:'#fff',border:'none',borderRadius:'12px',
    padding:'16px',cursor:'pointer',fontSize:'15px',fontWeight:'800',
  }},'🔓 Iniciar nova abertura de caixa');
  novaBtn.onclick=function(){setState({cxContagemModal:{tipo:'abertura',qtds:{}}});};
  card.appendChild(novaBtn);
  return card;
}

// ── MODAL DE CONTAGEM DE CÉDULAS/MOEDAS (abertura ou fechamento) ─────────────
function _cxRenderContagemModal(m,dia,session,totalDinheiroFisico,totalSaidas){
  var isFechamento=m.tipo==='fechamento';
  var qtds=m.qtds||{};

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',
    padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'660px',maxWidth:'96vw',border:'2px solid #334155',
    maxHeight:'92vh',overflowY:'auto',
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

  // Modo paisagem: grade de cédulas/moedas lado a lado em vez de lista vertical
  var cedGrid=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'8px'}});
  _CEDULAS.forEach(function(c){
    var key=c.val.toFixed(2);
    var inp=el('input',{type:'number',min:'0',inputmode:'numeric',value:qtds[key]||'',placeholder:'0',
      style:{width:'100%',boxSizing:'border-box',padding:'8px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',textAlign:'center',fontSize:'15px',fontWeight:'700'}});
    inp.oninput=function(){
      qtds[key]=parseInt(inp.value)||0;
      m.qtds=qtds;
      totalEl.textContent=fmtMoney(calcTotal());
    };
    cedGrid.appendChild(el('div',{style:{background:'#0f172a',border:'1px solid #334155',borderRadius:'10px',padding:'8px 10px'}},[
      el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'5px',textAlign:'center'}},c.label),
      inp,
    ]));
  });
  box.appendChild(cedGrid);

  box.appendChild(el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 0 6px',marginTop:'8px',borderTop:'2px solid #334155'}},[
    el('span',{style:{fontSize:'13px',fontWeight:'700',color:'#94a3b8'}},'TOTAL CONTADO'),
    totalEl,
  ]));

  if(isFechamento){
    var saldoEsp=(dia?dia.aberturaTotal||0:0)+totalDinheiroFisico-totalSaidas;
    box.appendChild(el('div',{style:{fontSize:'12px',color:'#64748b',textAlign:'center',marginTop:'6px'}},
      'Dinheiro esperado pelo sistema: '+fmtMoney(saldoEsp)));
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
    if(isFechamento){
      var idx=-1;
      for(var i=0;i<dias.length;i++){if(dias[i].data===dt&&dias[i].profile===pf&&dias[i].status==='aberto'){idx=i;break;}}
      if(idx<0)return;
      dias[idx]=Object.assign({},dias[idx],{
        fechamentoCedulas:Object.assign({},qtds),fechamentoTotal:total,
        fechamentoFuncId:session.funcId,fechamentoFuncNome:session.funcNome,
        fechamentoHorario:horario,status:'fechado',
      });
    } else {
      // Sempre cria uma nova sessão (permite mais de uma abertura no mesmo dia)
      var novo={
        id:uid(),profile:pf,data:dt,
        aberturaCedulas:Object.assign({},qtds),aberturaTotal:total,
        aberturaFuncId:session.funcId,aberturaFuncNome:session.funcNome,aberturaHorario:horario,
        status:'aberto',
      };
      dias.push(novo);
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

// ── MODAL DE NOVA SAÍDA (sangria, troco, compra à vista...) ─────────────────
function _cxRenderSaidaModal(m,session){
  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'360px',maxWidth:'94vw',border:'2px solid #334155',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'18px',textAlign:'center',color:'#f87171'}},'⬇ Nova Saída'));

  var descInp=el('input',{type:'text',placeholder:'Descrição (ex: Sangria, Troco, Compra gelo...)',value:m.descricao||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px',marginBottom:'12px'}});
  descInp.oninput=function(){m.descricao=descInp.value;};

  var valInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'0,00',value:m.valor||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'18px',fontWeight:'700',textAlign:'center',marginBottom:'18px'}});
  valInp.oninput=function(){m.valor=valInp.value;};

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxMovModal:null});};
  var confirmBtn=el('button',{style:{background:'#dc2626',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Salvar');
  confirmBtn.onclick=function(){
    var desc=(m.descricao||'').trim();
    var val=parseFloat((m.valor+'').replace(',','.'))||0;
    if(!desc){showToast('Informe uma descrição','error');return;}
    if(!val||val<=0){showToast('Informe um valor válido','error');return;}
    var diaAtual=_cxDiaAtual();
    var agora=new Date();
    var novo={
      id:uid(),profile:state.profile,data:today(),diaId:diaAtual?diaAtual.id:null,
      tipo:'saida',descricao:desc,valor:val,
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

// ── MODAL DE NOVA ENTRADA (venda: salão/delivery, forma(s) de pagamento) ────
function _cxRenderEntradaModal(m,session){
  var formas=state.formasPagamento||[];
  if(!m.pagamentos||!m.pagamentos.length)m.pagamentos=[{formaId:(formas[0]||{}).id||'',valor:''}];
  if(m.misto===undefined)m.misto=false;
  if(m.canal===undefined)m.canal='salao';

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'420px',maxWidth:'94vw',border:'2px solid #334155',maxHeight:'92vh',overflowY:'auto',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'18px',textAlign:'center',color:'#4ade80'}},'⬆ Nova Entrada — Venda'));

  function rerenderMov(){setState({cxMovModal:m});}

  // ── Canal: Salão ou Delivery ──
  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Canal'));
  var canalRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}});
  [['salao','🏠 Salão'],['delivery','🛵 Delivery']].forEach(function(pair){
    var b=el('button',{type:'button',style:{
      padding:'12px',borderRadius:'10px',border:'2px solid '+(m.canal===pair[0]?'#60a5fa':'#334155'),
      background:m.canal===pair[0]?'rgba(29,78,216,.25)':'#0f172a',color:'#f1f5f9',
      fontWeight:'700',fontSize:'13px',cursor:'pointer',
    }},pair[1]);
    b.onclick=function(){m.canal=pair[0];rerenderMov();};
    canalRow.appendChild(b);
  });
  box.appendChild(canalRow);

  // ── Identificação da venda ──
  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Identificação da venda'));
  var idInp=el('input',{type:'text',placeholder:'Ex: Comanda 12, Mesa 5, Pedido iFood #123...',value:m.identificacao||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px',marginBottom:'16px'}});
  idInp.oninput=function(){m.identificacao=idInp.value;};
  box.appendChild(idInp);

  // ── Total da venda (o que é devido) ──
  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Total da venda'));
  var totalVendaInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'0,00',value:m.totalVenda||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'20px',fontWeight:'800',textAlign:'center',marginBottom:'16px'}});
  totalVendaInp.oninput=function(){m.totalVenda=totalVendaInp.value;atualizaBannerPag();};
  box.appendChild(totalVendaInp);

  if(formas.length===0){
    box.appendChild(el('div',{style:{fontSize:'12px',color:'#fbbf24',background:'rgba(251,191,36,.12)',border:'1px solid rgba(251,191,36,.3)',borderRadius:'8px',padding:'10px 12px',marginBottom:'16px'}},
      '⚠ Nenhuma forma de pagamento cadastrada. Toque em ⚙ no topo para cadastrar.'));
  }

  // ── Pagamento misto ──
  var mistoRow=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px',cursor:'pointer',fontSize:'13px',fontWeight:'700',color:'#f1f5f9'}});
  var mistoChk=el('input',{type:'checkbox'});
  mistoChk.checked=m.misto;
  mistoChk.onchange=function(){
    m.misto=mistoChk.checked;
    if(!m.misto&&m.pagamentos.length>1)m.pagamentos=[m.pagamentos[0]];
    rerenderMov();
  };
  mistoRow.appendChild(mistoChk);
  mistoRow.appendChild(document.createTextNode('Pagamento misto (mais de uma forma nesta comanda)'));
  box.appendChild(mistoRow);

  // ── Linhas de forma de pagamento + valor pago ──
  function calcTotalPag(){
    return m.pagamentos.reduce(function(s,p){return s+(parseFloat((p.valor+'').replace(',','.'))||0);},0);
  }
  function calcTotalVenda(){
    return parseFloat((m.totalVenda+'').replace(',','.'))||0;
  }
  var totalEl=el('span',{style:{fontSize:'20px',fontWeight:'900',color:'#4ade80'}},fmtMoney(calcTotalPag()));
  var bannerEl=el('div',{style:{fontSize:'13px',fontWeight:'800',textAlign:'center',padding:'10px',borderRadius:'8px',marginBottom:'12px',display:'none'}});
  function atualizaBannerPag(){
    var totalVenda=calcTotalVenda();
    var totalPago=calcTotalPag();
    var dif=Math.round((totalPago-totalVenda)*100)/100;
    if(totalVenda<=0||totalPago<=0){
      bannerEl.style.display='none';
      return;
    }
    bannerEl.style.display='block';
    if(Math.abs(dif)<0.005){
      bannerEl.style.background='rgba(74,222,128,.12)';bannerEl.style.color='#4ade80';bannerEl.style.border='1px solid rgba(74,222,128,.3)';
      bannerEl.textContent='✓ Pagamento confere';
    } else if(dif>0){
      bannerEl.style.background='rgba(96,165,250,.12)';bannerEl.style.color='#60a5fa';bannerEl.style.border='1px solid rgba(96,165,250,.3)';
      bannerEl.textContent='💵 Troco a devolver: '+fmtMoney(dif);
    } else {
      bannerEl.style.background='rgba(248,113,113,.12)';bannerEl.style.color='#f87171';bannerEl.style.border='1px solid rgba(248,113,113,.3)';
      bannerEl.textContent='⚠ Falta receber: '+fmtMoney(-dif);
    }
  }

  var pagWrap=el('div',{style:{marginBottom:'8px'}});
  m.pagamentos.forEach(function(p,i){
    var sel=el('select',{style:{
      flex:'1',padding:'10px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',
    }});
    formas.forEach(function(f){
      var opt=el('option',{},f.nome+(f.taxaValor?' ('+_cxFormatTaxa(f)+')':''));
      opt.value=f.id;
      if(f.id===p.formaId)opt.selected=true;
      sel.appendChild(opt);
    });
    sel.onchange=function(){p.formaId=sel.value;};

    var valInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'Valor pago',value:p.valor||'',
      style:{width:'100px',padding:'10px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',fontWeight:'700',textAlign:'right'}});
    valInp.oninput=function(){p.valor=valInp.value;totalEl.textContent=fmtMoney(calcTotalPag());atualizaBannerPag();};

    var linha=el('div',{style:{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}},[sel,valInp]);
    if(m.misto&&m.pagamentos.length>1){
      var rmBtn=el('button',{type:'button',style:{background:'none',border:'none',color:'#f87171',fontSize:'18px',cursor:'pointer',padding:'0 4px'}},'×');
      rmBtn.onclick=function(){m.pagamentos.splice(i,1);rerenderMov();};
      linha.appendChild(rmBtn);
    }
    pagWrap.appendChild(linha);
  });
  box.appendChild(pagWrap);

  if(m.misto){
    var addPagBtn=el('button',{type:'button',style:{
      background:'transparent',border:'1px dashed #475569',color:'#94a3b8',borderRadius:'8px',
      padding:'8px',width:'100%',cursor:'pointer',fontSize:'12px',fontWeight:'700',marginBottom:'14px',
    }},'+ Adicionar forma de pagamento');
    addPagBtn.onclick=function(){
      m.pagamentos.push({formaId:(formas[0]||{}).id||'',valor:''});
      rerenderMov();
    };
    box.appendChild(addPagBtn);
  }

  box.appendChild(el('div',{style:{display:'flex',justifyContent:'space-between',padding:'12px 0',borderTop:'2px solid #334155',marginTop:'6px',marginBottom:'8px'}},[
    el('span',{style:{fontSize:'13px',fontWeight:'700',color:'#94a3b8'}},'TOTAL PAGO'),
    totalEl,
  ]));
  box.appendChild(bannerEl);
  atualizaBannerPag();

  if(_cxIsDev(session)){
    var gerenciarLink=el('button',{type:'button',style:{
      background:'none',border:'none',color:'#60a5fa',fontSize:'11px',cursor:'pointer',padding:'0',marginBottom:'16px',textDecoration:'underline',
    }},'⚙ Gerenciar formas de pagamento e taxas');
    gerenciarLink.onclick=function(){setState({cxFormasModal:true});};
    box.appendChild(gerenciarLink);
  }

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxMovModal:null});};
  var confirmBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Salvar Venda');
  confirmBtn.onclick=function(){
    if(formas.length===0){showToast('Cadastre ao menos uma forma de pagamento primeiro','error');return;}
    var totalVenda=calcTotalVenda();
    if(!totalVenda||totalVenda<=0){showToast('Informe o total da venda','error');return;}
    var pags=[];
    var erro=false;
    m.pagamentos.forEach(function(p){
      var val=parseFloat((p.valor+'').replace(',','.'))||0;
      if(val<=0){erro=true;return;}
      var f=formas.find(function(x){return x.id===p.formaId;});
      if(!f){erro=true;return;}
      var liq=_cxCalcLiquido(val,f);
      pags.push({formaId:f.id,formaNome:f.nome,valor:val,taxaValor:f.taxaValor||0,taxaTipo:f.taxaTipo||'pct',valorLiquido:liq,ehDinheiroFisico:!!f.ehDinheiroFisico});
    });
    if(erro||pags.length===0){showToast('Preencha a forma e o valor de cada pagamento','error');return;}
    var totalPago=pags.reduce(function(s,p){return s+p.valor;},0);
    var dif=Math.round((totalPago-totalVenda)*100)/100;
    var troco=dif>0?dif:0;
    var falta=dif<0?-dif:0;
    // Dinheiro físico que fica na gaveta: soma das formas em dinheiro menos o troco devolvido
    var totalDinheiro=pags.filter(function(p){return p.ehDinheiroFisico;}).reduce(function(s,p){return s+p.valor;},0);
    totalDinheiro=Math.max(0,Math.round((totalDinheiro-troco)*100)/100);
    var diaAtual=_cxDiaAtual();
    var agora=new Date();
    var novo={
      id:uid(),profile:state.profile,data:today(),diaId:diaAtual?diaAtual.id:null,tipo:'entrada',
      canal:m.canal,identificacao:(m.identificacao||'').trim(),
      pagamentos:pags,valor:totalVenda,totalPago:totalPago,troco:troco,falta:falta,
      valorDinheiroFisico:totalDinheiro,
      funcId:session.funcId,funcNome:session.funcNome,
      horario:agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:agora.toISOString(),
    };
    var lista=(state.caixaDiarioMovs||[]).concat([novo]);
    lsSet('caixaDiarioMovs',lista);
    setState({caixaDiarioMovs:lista,cxMovModal:null});
    scheduleSave();
    showToast(troco>0?('Venda registrada! Troco: '+fmtMoney(troco)):falta>0?('Venda registrada — falta receber '+fmtMoney(falta)):'Venda registrada!',troco>0||falta>0?'info':'success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);
  box.appendChild(actsRow);

  ov.appendChild(box);
  return ov;
}

// ── MODAL DE GESTÃO: formas de pagamento e taxa da máquina ──────────────────
function _cxRenderFormasModal(){
  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.9)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'400',padding:'20px',overflowY:'auto',
  }});

  if(!_cxIsDev(state.cxSession)){
    var boxNeg=el('div',{style:{
      background:'#1e293b',borderRadius:'20px',padding:'32px 28px',
      width:'340px',maxWidth:'94vw',border:'2px solid #334155',textAlign:'center',
    }},[
      el('div',{style:{fontSize:'44px',marginBottom:'12px'}},'🔒'),
      el('div',{style:{fontWeight:'800',fontSize:'15px',marginBottom:'8px'}},'Acesso restrito'),
      el('div',{style:{fontSize:'12px',color:'#94a3b8',lineHeight:'1.6',marginBottom:'18px'}},'Somente o desenvolvedor pode editar formas de pagamento e taxas.'),
    ]);
    var okBtn=el('button',{style:{width:'100%',background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'12px',cursor:'pointer',fontWeight:'700'}},'Fechar');
    okBtn.onclick=function(){setState({cxFormasModal:false});};
    boxNeg.appendChild(okBtn);
    ov.appendChild(boxNeg);
    return ov;
  }

  var formas=(state.formasPagamento||[]).slice();

  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'440px',maxWidth:'94vw',border:'2px solid #334155',maxHeight:'92vh',overflowY:'auto',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center'}},'⚙ Formas de Pagamento'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'18px'}},'Cadastre as formas e a taxa da máquina de cada uma'));

  var listWrap=el('div',{style:{marginBottom:'14px'}});
  function renderList(){
    listWrap.innerHTML='';
    formas.forEach(function(f,i){
      if(!f.taxaTipo)f.taxaTipo='pct';
      var nomeInp=el('input',{type:'text',value:f.nome,placeholder:'Nome da forma',style:{
        flex:'1',minWidth:'0',padding:'8px 10px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',
      }});
      nomeInp.oninput=function(){f.nome=nomeInp.value;};
      var rmBtn=el('button',{type:'button',style:{width:'22px',flexShrink:'0',background:'none',border:'none',color:'#f87171',fontSize:'18px',cursor:'pointer',padding:'0'}},'×');
      rmBtn.onclick=function(){formas.splice(i,1);renderList();};

      var taxaInp=el('input',{type:'number',min:'0',step:'0.01',value:f.taxaValor||0,style:{
        width:'72px',padding:'8px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',textAlign:'center',
      }});
      taxaInp.oninput=function(){f.taxaValor=parseFloat(taxaInp.value)||0;};

      var tipoBtn=el('button',{type:'button',title:'Clique para alternar entre % e R$ fixo por venda',style:{
        width:'44px',flexShrink:'0',padding:'8px 4px',borderRadius:'8px',border:'1px solid #334155',
        background:f.taxaTipo==='fixo'?'#1d4ed8':'#334155',color:'#f1f5f9',fontSize:'11px',fontWeight:'800',cursor:'pointer',
      }},f.taxaTipo==='fixo'?'R$':'%');
      tipoBtn.onclick=function(){
        f.taxaTipo=f.taxaTipo==='fixo'?'pct':'fixo';
        tipoBtn.textContent=f.taxaTipo==='fixo'?'R$':'%';
        tipoBtn.style.background=f.taxaTipo==='fixo'?'#1d4ed8':'#334155';
      };

      var dinChk=el('input',{type:'checkbox',style:{cursor:'pointer'}});
      dinChk.checked=!!f.ehDinheiroFisico;
      dinChk.onchange=function(){f.ehDinheiroFisico=dinChk.checked;};
      var dinLabel=el('label',{style:{display:'flex',alignItems:'center',gap:'4px',fontSize:'10px',color:'#94a3b8',marginLeft:'auto',cursor:'pointer',whiteSpace:'nowrap'}},[dinChk,document.createTextNode('$ físico')]);

      var linha1=el('div',{style:{display:'flex',gap:'6px',alignItems:'center',marginBottom:'6px'}},[nomeInp,rmBtn]);
      var linha2=el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
        el('span',{style:{fontSize:'10px',color:'#64748b'}},'Taxa:'),taxaInp,tipoBtn,dinLabel,
      ]);
      listWrap.appendChild(el('div',{style:{background:'#0f172a',border:'1px solid #334155',borderRadius:'10px',padding:'10px 12px',marginBottom:'8px'}},[linha1,linha2]));
    });
  }
  renderList();
  box.appendChild(listWrap);

  var addBtn=el('button',{type:'button',style:{
    background:'transparent',border:'1px dashed #475569',color:'#94a3b8',borderRadius:'8px',
    padding:'8px',width:'100%',cursor:'pointer',fontSize:'12px',fontWeight:'700',marginBottom:'16px',
  }},'+ Nova forma de pagamento');
  addBtn.onclick=function(){
    formas.push({id:uid(),nome:'',taxaValor:0,taxaTipo:'pct',ehDinheiroFisico:false});
    renderList();
  };
  box.appendChild(addBtn);

  box.appendChild(el('div',{style:{fontSize:'10px',color:'#64748b',lineHeight:'1.6',marginBottom:'16px'}},
    'Marque "$ físico" só para formas em dinheiro vivo — são as únicas que entram na contagem de cédulas/moedas do fechamento.'));

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxFormasModal:false});};
  var saveBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'💾 Salvar');
  saveBtn.onclick=function(){
    var validas=formas.filter(function(f){return (f.nome||'').trim();}).map(function(f){return Object.assign({},f,{nome:f.nome.trim(),id:f.id||uid()});});
    lsSet('formasPagamento',validas);
    setState({formasPagamento:validas,cxFormasModal:false});
    scheduleSave();
    showToast('Formas de pagamento salvas!','success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(saveBtn);
  box.appendChild(actsRow);

  ov.appendChild(box);
  return ov;
}

// ── MODAL DE HISTÓRICO: detalhe por trás de cada KPI do dia ─────────────────
function _cxRenderKpiModal(tipo,dia,movs,aberturaTotal,totalEntradas,totalSaidas,totalDinheiroFisico,saldoFisicoEsperado){
  var titulos={abertura:'🔓 Abertura do Caixa',vendas:'⬆ Vendas do Dia',saidas:'⬇ Saídas do Dia',dinheiro:'💰 Dinheiro Esperado no Caixa'};

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'24px',
    width:'440px',maxWidth:'94vw',border:'2px solid #334155',maxHeight:'88vh',overflowY:'auto',
  }});
  box.appendChild(el('div',{style:{fontSize:'17px',fontWeight:'800',marginBottom:'16px',textAlign:'center'}},titulos[tipo]||'Histórico'));

  var body=el('div',{});

  function linha(label,val,cor){
    return el('div',{style:{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #334155',fontSize:'14px'}},[
      el('span',{style:{color:'#94a3b8'}},label),
      el('span',{style:{fontWeight:'700',color:cor||'#f1f5f9'}},fmtMoney(val)),
    ]);
  }
  function totalRow(label,val,cor){
    return el('div',{style:{display:'flex',justifyContent:'space-between',padding:'12px 0 0',marginTop:'8px',borderTop:'2px solid #334155',fontSize:'15px',fontWeight:'800'}},[
      el('span',{},label),el('span',{style:{color:cor||'#f1f5f9'}},fmtMoney(val)),
    ]);
  }
  function movRow(m){
    var titulo,sub;
    if(m.tipo==='entrada'&&m.pagamentos){
      var canalLabel=m.canal==='delivery'?'🛵 Delivery':'🏠 Salão';
      titulo=canalLabel+(m.identificacao?' · '+m.identificacao:'');
      var formasTxt2=m.pagamentos.map(function(p){return p.formaNome+' '+fmtMoney(p.valor);}).join(' + ');
      if(m.troco>0)formasTxt2+=' (troco '+fmtMoney(m.troco)+')';
      if(m.falta>0)formasTxt2+=' (falta '+fmtMoney(m.falta)+')';
      sub=(m.horario||'')+' · '+(m.funcNome||'')+' · '+formasTxt2;
    } else {
      titulo=m.descricao||'—';
      sub=(m.horario||'')+' · '+(m.funcNome||'');
    }
    return el('div',{style:{padding:'10px 0',borderBottom:'1px solid #334155'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',gap:'8px'}},[
        el('div',{style:{fontSize:'13px',fontWeight:'700'}},titulo),
        el('div',{style:{fontSize:'14px',fontWeight:'800',color:m.tipo==='entrada'?'#4ade80':'#f87171',whiteSpace:'nowrap'}},
          (m.tipo==='entrada'?'+':'−')+fmtMoney(m.valor)),
      ]),
      el('div',{style:{fontSize:'11px',color:'#64748b',marginTop:'2px'}},sub),
    ]);
  }

  if(tipo==='abertura'){
    if(!dia||!dia.aberturaTotal){
      body.appendChild(el('div',{style:{textAlign:'center',color:'#64748b',padding:'20px',fontSize:'13px'}},'Caixa ainda não foi aberto hoje.'));
    } else {
      body.appendChild(el('div',{style:{marginBottom:'14px',fontSize:'13px',color:'#94a3b8'}},
        'Aberto por '+(dia.aberturaFuncNome||'—')+' às '+(dia.aberturaHorario||'—')));
      var ced=dia.aberturaCedulas||{};
      _CEDULAS.forEach(function(c){
        var q=parseInt(ced[c.val.toFixed(2)])||0;
        if(q<=0)return;
        body.appendChild(linha(c.label+' × '+q,q*c.val));
      });
      body.appendChild(totalRow('Total',aberturaTotal,'#60a5fa'));
    }
  } else if(tipo==='vendas'||tipo==='saidas'){
    var lista=movs.filter(function(m){return m.tipo===(tipo==='vendas'?'entrada':'saida');});
    if(lista.length===0){
      body.appendChild(el('div',{style:{textAlign:'center',color:'#64748b',padding:'20px',fontSize:'13px'}},'Nenhum registro ainda.'));
    } else {
      lista.forEach(function(m){body.appendChild(movRow(m));});
      body.appendChild(totalRow('Total',tipo==='vendas'?totalEntradas:totalSaidas,tipo==='vendas'?'#4ade80':'#f87171'));
    }
  } else if(tipo==='dinheiro'){
    body.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',marginBottom:'14px',lineHeight:'1.6'}},
      'Só as vendas em formas marcadas como "$ físico" (ex: Dinheiro) entram nessa conta — cartão/Pix/apps não ficam na gaveta.'));
    body.appendChild(linha('Abertura',aberturaTotal,'#60a5fa'));
    body.appendChild(linha('+ Dinheiro em vendas',totalDinheiroFisico,'#4ade80'));
    body.appendChild(linha('− Saídas',totalSaidas,'#f87171'));
    body.appendChild(totalRow('Dinheiro esperado',saldoFisicoEsperado,'#fbbf24'));

    var comFisico=[];
    movs.filter(function(m){return m.tipo==='entrada';}).forEach(function(m){
      (m.pagamentos||[]).forEach(function(p){if(p.ehDinheiroFisico)comFisico.push({m:m,p:p});});
    });
    if(comFisico.length>0){
      body.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',margin:'16px 0 8px'}},'Vendas que contaram como dinheiro:'));
      comFisico.forEach(function(x){
        body.appendChild(el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'12px',padding:'4px 0',color:'#cbd5e1'}},[
          el('span',{},(x.m.identificacao||(x.m.canal==='delivery'?'Delivery':'Salão'))+' · '+x.p.formaNome),
          el('span',{},fmtMoney(x.p.valor)),
        ]));
      });
    }
  }

  box.appendChild(body);
  var closeBtn=el('button',{style:{width:'100%',marginTop:'18px',background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'12px',cursor:'pointer',fontWeight:'700'}},'Fechar');
  closeBtn.onclick=function(){setState({cxKpiDetalhe:null});};
  box.appendChild(closeBtn);

  ov.appendChild(box);
  return ov;
}

// ── MODAL: filtrar a data antes de gerar o relatório ─────────────────────────
function _cxRenderRelatorioFiltroModal(){
  var m=state.cxRelatorioModal;
  if(!m)return null;

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'350',padding:'20px',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'340px',maxWidth:'94vw',border:'2px solid #334155',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center'}},'📄 Relatório de Vendas'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'20px'}},'Escolha o dia que deseja imprimir'));

  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Data'));
  var dataInp=el('input',{type:'date',value:m.data||today(),max:today(),
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'16px',fontWeight:'700',textAlign:'center',marginBottom:'20px'}});
  dataInp.oninput=function(){m.data=dataInp.value;};
  box.appendChild(dataInp);

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxRelatorioModal:null});};
  var confirmBtn=el('button',{style:{background:'#1d4ed8',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'📥 Gerar PDF');
  confirmBtn.onclick=function(){
    var dt=dataInp.value||today();
    setState({cxRelatorioModal:null});
    _cxExportarRelatorio(dt);
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);
  box.appendChild(actsRow);

  ov.appendChild(box);
  return ov;
}

// ── RELATÓRIO DE VENDAS DO DIA — impressão/PDF (somente Desenvolvedor) ──────
function _cxExportarRelatorio(dataFiltro){
  if(!_cxIsDev(state.cxSession)){showToast('Restrito ao desenvolvedor','error');return;}
  dataFiltro=dataFiltro||today();

  var pf=state.profile;
  var dia=_cxDiaPorData(dataFiltro);
  var movs=(state.caixaDiarioMovs||[]).filter(function(m){return m.data===dataFiltro&&m.profile===pf;})
    .sort(function(a,b){return (a.criadoEm||'').localeCompare(b.criadoEm||'');});
  var entradas=movs.filter(function(m){return m.tipo==='entrada';});
  var saidas=movs.filter(function(m){return m.tipo==='saida';});
  var aberturaTotal=dia?(dia.aberturaTotal||0):0;
  var totalVendas=entradas.reduce(function(s,m){return s+m.valor;},0);
  var totalSaidas=saidas.reduce(function(s,m){return s+m.valor;},0);
  var totalDinheiroFisico=entradas.reduce(function(s,m){return s+(m.valorDinheiroFisico!==undefined?m.valorDinheiroFisico:m.valor);},0);
  var saldoFisicoEsperado=aberturaTotal+totalDinheiroFisico-totalSaidas;

  // Totais por forma de pagamento
  var porForma={};
  entradas.forEach(function(m){
    (m.pagamentos||[]).forEach(function(p){
      porForma[p.formaNome]=(porForma[p.formaNome]||0)+p.valor;
    });
  });

  var emp=((state.empresaData||{})[pf])||{};
  var nomeEmp=emp.nomeFantasia||emp.razaoSocial||'Financial Routine';
  var M=function(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};

  var entradasRows=entradas.map(function(m){
    var canalLabel=m.canal==='delivery'?'Delivery':'Salão';
    var formasTxt=(m.pagamentos||[]).map(function(p){return p.formaNome+' '+M(p.valor);}).join(' + ');
    var obs=(m.troco>0?' · troco '+M(m.troco):'')+(m.falta>0?' · falta '+M(m.falta):'');
    return '<tr>'+
      '<td>'+(m.horario||'')+'</td>'+
      '<td>'+canalLabel+'</td>'+
      '<td>'+(m.identificacao||'—')+'</td>'+
      '<td>'+formasTxt+obs+'</td>'+
      '<td class="num">'+M(m.valor)+'</td>'+
      '<td>'+(m.funcNome||'')+'</td>'+
    '</tr>';
  }).join('');

  var saidasRows=saidas.map(function(m){
    return '<tr>'+
      '<td>'+(m.horario||'')+'</td>'+
      '<td colspan="2">'+(m.descricao||'—')+'</td>'+
      '<td class="num">'+M(m.valor)+'</td>'+
      '<td>'+(m.funcNome||'')+'</td>'+
    '</tr>';
  }).join('');

  var porFormaRows=Object.keys(porForma).sort().map(function(k){
    return '<tr><td>'+k+'</td><td class="num">'+M(porForma[k])+'</td></tr>';
  }).join('');

  var w=window.open('','_blank','width=800,height=1000');
  w.document.write(
    '<html><head><meta charset="UTF-8"><title>Relatório de Vendas — '+fmtDate(dataFiltro)+'</title><style>'+
    'body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:820px;margin:0 auto}'+
    'h1{font-size:20px;font-weight:900;margin:0}'+
    '.sub{font-size:12px;color:#666;margin-bottom:4px}'+
    '.data{font-size:16px;font-weight:700;margin:16px 0;padding:10px 16px;background:#f9f9f9;border-radius:8px;border:1px solid #e5e7eb}'+
    '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}'+
    '.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:10px;text-align:center}'+
    '.kpi .label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}'+
    '.kpi .value{font-size:15px;font-weight:800}'+
    '.green{color:#16a34a}.red{color:#dc2626}.gold{color:#b45309}.blue{color:#1d4ed8}'+
    'h3{font-size:13px;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.5px;color:#444}'+
    'table{width:100%;border-collapse:collapse;margin-bottom:16px}'+
    'th{padding:6px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e5e7eb}'+
    'td{padding:6px 10px;border-bottom:1px solid #f3f4f6;font-size:12px}'+
    '.num{text-align:right}'+
    '.rodape{margin-top:16px;font-size:10px;color:#999;text-align:center;border-top:1px dashed #ccc;padding-top:10px}'+
    '@media print{button{display:none}}'+
    '</style></head><body>'+
    '<h1>'+nomeEmp+'</h1>'+
    (emp.cnpj?'<div class="sub">CNPJ: '+emp.cnpj+'</div>':'')+
    '<div class="data">📄 Relatório de Vendas — Caixa Diário — '+fmtDate(dataFiltro)+'</div>'+
    '<div class="kpis">'+
      '<div class="kpi"><div class="label">Abertura</div><div class="value blue">'+M(aberturaTotal)+'</div></div>'+
      '<div class="kpi"><div class="label">Vendas</div><div class="value green">'+M(totalVendas)+'</div></div>'+
      '<div class="kpi"><div class="label">Saídas</div><div class="value red">'+M(totalSaidas)+'</div></div>'+
      '<div class="kpi"><div class="label">Dinheiro esperado</div><div class="value gold">'+M(saldoFisicoEsperado)+'</div></div>'+
    '</div>'+
    (dia&&dia.status==='fechado'?
      '<div class="kpis" style="grid-template-columns:repeat(2,1fr)">'+
        '<div class="kpi"><div class="label">Contado no fechamento</div><div class="value">'+M(dia.fechamentoTotal||0)+'</div></div>'+
        '<div class="kpi"><div class="label">Diferença</div><div class="value '+(Math.abs((dia.fechamentoTotal||0)-saldoFisicoEsperado)<0.01?'green':((dia.fechamentoTotal||0)-saldoFisicoEsperado)>0?'gold':'red')+'">'+
          M((dia.fechamentoTotal||0)-saldoFisicoEsperado)+'</div></div>'+
      '</div>'
      :'<div class="sub" style="margin-bottom:16px">⏳ Caixa ainda em aberto — sem contagem de fechamento.</div>'
    )+
    '<h3>Totais por forma de pagamento</h3>'+
    (porFormaRows?'<table><thead><tr><th>Forma</th><th class="num">Total</th></tr></thead><tbody>'+porFormaRows+'</tbody></table>':'<div class="sub">Nenhuma venda registrada.</div>')+
    '<h3>Vendas do dia ('+entradas.length+')</h3>'+
    (entradasRows?'<table><thead><tr><th>Hora</th><th>Canal</th><th>Identificação</th><th>Pagamento</th><th class="num">Valor</th><th>Funcionário</th></tr></thead><tbody>'+entradasRows+'</tbody></table>':'<div class="sub">Nenhuma venda registrada.</div>')+
    '<h3>Saídas do dia ('+saidas.length+')</h3>'+
    (saidasRows?'<table><thead><tr><th>Hora</th><th colspan="2">Descrição</th><th class="num">Valor</th><th>Funcionário</th></tr></thead><tbody>'+saidasRows+'</tbody></table>':'<div class="sub">Nenhuma saída registrada.</div>')+
    '<div class="rodape">Emitido em '+new Date().toLocaleString('pt-BR')+' · Financial Routine</div>'+
    '<br><button onclick="window.print()" style="padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">🖨 Imprimir / Salvar PDF</button>'+
    '</body></html>'
  );
  w.document.close();
}
