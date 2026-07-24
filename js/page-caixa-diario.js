// ── CAIXA DIÁRIO (Kiosk PC do Caixa) ─────────────────────────────────────────
// Livro de caixa diário: abertura e fechamento por contagem de cédulas/moedas,
// e lançamento de entradas/saídas ao longo do dia pelo responsável do caixa.
// Acessível via state.caixaDiarioMode = true (login por PIN de funcionário,
// reaproveita o mesmo PIN de 4 dígitos já usado na Requisição de Estoque).

// Fundo de caixa padrão: toda abertura deve totalizar esse valor. Abrir com
// mais ou menos exige autorização (senha) do Desenvolvedor.
var _CX_ABERTURA_PADRAO=390.00;

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
  return _cxDiaPorData(_cxDataAtiva());
}

// Data em que o kiosk está "operando". Normalmente é hoje; só o Desenvolvedor
// pode trocar (modo retroativo, ex: lançar comandas físicas de um dia perdido).
// Não é persistido -- sempre volta pra hoje ao recarregar o app.
function _cxDataAtiva(){
  return (state.cxSession&&_cxIsDev(state.cxSession)&&state.cxDataTrabalho)||today();
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
// Rótulo da plataforma de delivery (iFood/Yooga + tipo de pedido) pra exibir nas listas
function _cxPlataformaLabel(m){
  if(!m.plataforma)return '';
  var nome=m.plataforma==='yooga'?'Yooga':'iFood';
  var tipo=m.plataforma==='yooga'&&m.tipoPedidoYooga?(m.tipoPedidoYooga==='automatico'?' (Automático)':' (Manual)'):'';
  return nome+tipo;
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
    var fidAtiva=state.cxTab==='fidelidade';
    var fidBtn=el('button',{title:'Programa de Fidelidade',style:{
      background:fidAtiva?'#c9a84c':'#334155',color:fidAtiva?'#1e293b':'#f1f5f9',border:'none',borderRadius:'10px',
      padding:'10px 14px',cursor:'pointer',fontSize:'16px',flexShrink:'0',fontWeight:'800',
    }},'🎖');
    fidBtn.onclick=function(){setState({cxPickerOpen:false,cxTab:fidAtiva?'caixa':'fidelidade'});};
    hdr.appendChild(fidBtn);
    if(_cxIsDev(session)){
      var retroAtivo=state.cxDataTrabalho&&state.cxDataTrabalho!==today();
      var retroBtn=el('button',{title:'Lançamento retroativo (data passada)',style:{
        background:retroAtivo?'#fbbf24':'#334155',color:retroAtivo?'#1e293b':'#f1f5f9',border:'none',borderRadius:'10px',
        padding:'10px 14px',cursor:'pointer',fontSize:'16px',flexShrink:'0',fontWeight:'800',
      }},'🕓');
      retroBtn.onclick=function(){setState({cxPickerOpen:false,cxRetroModal:{data:state.cxDataTrabalho||today()}});};
      hdr.appendChild(retroBtn);
      var relBtn=el('button',{title:'Relatório de vendas (PDF)',style:{
        background:'#334155',color:'#f1f5f9',border:'none',borderRadius:'10px',
        padding:'10px 14px',cursor:'pointer',fontSize:'16px',flexShrink:'0',
      }},'📄');
      relBtn.onclick=function(){setState({cxPickerOpen:false,cxRelatorioModal:{data:_cxDataAtiva()}});};
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
      setState({cxSession:null,cxPin:null,cxContagemModal:null,cxMovModal:null,cxFormasModal:false,cxPickerOpen:false,cxKpiDetalhe:null,cxRelatorioModal:null,cxRetroModal:null,cxDataTrabalho:null,cxTab:null,cxFidBusca:'',cxFidCliente:null,cxFidModal:null,cxImportModal:null});
    } else if(window.DJF_KIOSK_BOOT && typeof lockApp==='function'){
      lockApp();
    } else {
      setState({caixaDiarioMode:false,cxSession:null,cxPin:null,cxContagemModal:null,cxMovModal:null,cxFormasModal:false,cxPickerOpen:false,cxKpiDetalhe:null,cxRelatorioModal:null,cxRetroModal:null,cxDataTrabalho:null,cxTab:null,cxFidBusca:'',cxFidCliente:null,cxFidModal:null,cxImportModal:null});
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
  var dataAtiva=_cxDataAtiva();
  var _dtDisp=typeof fmtDate==='function'?fmtDate(dataAtiva):dataAtiva;
  var _isRetro=dataAtiva!==today();
  var dataRow=el('div',{style:{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px',flexWrap:'wrap'}});
  dataRow.appendChild(el('div',{style:{fontSize:'14px',color:'#94a3b8',fontWeight:'700'}},'📅 '+_dtDisp));
  if(_cxIsDev(session)){
    var importXlsBtn=el('button',{type:'button',title:'Importar todas as vendas do dia via planilha XLS',style:{
      background:'#1d4ed8',color:'#fff',border:'none',borderRadius:'8px',
      padding:'6px 12px',cursor:'pointer',fontSize:'12px',fontWeight:'700',
    }},'📊 Importar XLS');
    importXlsBtn.onclick=function(){setState({cxImportModal:{}});};
    dataRow.appendChild(importXlsBtn);
  }
  mainArea.appendChild(dataRow);
  if(_isRetro){
    mainArea.appendChild(el('div',{style:{
      background:'rgba(251,191,36,.15)',border:'1px solid rgba(251,191,36,.4)',color:'#fbbf24',
      borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',fontWeight:'700',
      display:'flex',alignItems:'center',gap:'8px',
    }},'⚠ Modo retroativo — lançando dados de '+_dtDisp+', não de hoje.'));
  }
  if(dia&&dia.foraDoPadrao){
    var _dp=dia.diferencaPadrao||0;
    mainArea.appendChild(el('div',{style:{
      background:'rgba(248,113,113,.12)',border:'1px solid rgba(248,113,113,.35)',color:'#f87171',
      borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',fontWeight:'700',
      display:'flex',alignItems:'center',gap:'8px',
    }},'⚠ Abertura fora do padrão de '+fmtMoney(_CX_ABERTURA_PADRAO)+': '+(_dp>0?'+':'')+fmtMoney(_dp)+' — autorizado por '+(dia.autorizadoPorDev||'desenvolvedor')+'.'));
  }

  if(state.cxTab==='fidelidade'){
    mainArea.appendChild(_cxRenderFidelidadeTab(session));
  } else if(!dia||dia.status!=='aberto'){
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
    var addSangriaBtn=el('button',{style:{
      flex:'1',minWidth:'140px',background:'#7c2d12',color:'#fff',border:'none',
      borderRadius:'12px',padding:'14px',cursor:'pointer',fontSize:'15px',fontWeight:'800',
    }},'🩸 Sangria');
    addSangriaBtn.onclick=function(){setState({cxMovModal:{tipo:'sangria',motivo:'',valor:''}});};
    actsRow.appendChild(addEntBtn);actsRow.appendChild(addSaiBtn);actsRow.appendChild(addSangriaBtn);
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
        row.appendChild(el('div',{style:{fontSize:'20px'}},m.tipo==='entrada'?'⬆':m.subtipo==='sangria'?'🩸':'⬇'));
        var titulo, sub;
        if(m.tipo==='entrada'&&m.pagamentos){
          var canalLabel=m.canal==='delivery'?'🛵 Delivery':'🏠 Salão';
          var platLabel=_cxPlataformaLabel(m);
          titulo=canalLabel+(platLabel?' · '+platLabel:'')+(m.identificacao?' · '+m.identificacao:'');
          var formasTxt=m.pagamentos.map(function(p){return p.formaNome+' '+fmtMoney(p.valor);}).join(' + ');
          if(m.taxaPlataforma>0)formasTxt+=' (taxa plataforma '+fmtMoney(m.taxaPlataforma)+')';
          if(m.cupomCodigo)formasTxt+=' (🎟 '+m.cupomCodigo+': -'+fmtMoney(m.cupomValor)+')';
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
  if(state.cxImportModal&&_cxIsDev(session))root.appendChild(_cxRenderImportVendasModal(session));
  if(movModal)root.appendChild(
    movModal.tipo==='entrada'?_cxRenderEntradaModal(movModal,session):
    movModal.tipo==='sangria'?_cxRenderSangriaModal(movModal,session):
    _cxRenderSaidaModal(movModal,session)
  );
  if(formasModal)root.appendChild(_cxRenderFormasModal());
  if(state.cxKpiDetalhe)root.appendChild(_cxRenderKpiModal(state.cxKpiDetalhe,dia,movs,aberturaTotal,totalEntradas,totalSaidas,totalDinheiroFisico,saldoFisicoEsperado));
  if(state.cxRelatorioModal)root.appendChild(_cxRenderRelatorioFiltroModal());
  if(state.cxRetroModal)root.appendChild(_cxRenderRetroModal());
  if(state.cxFidCadastroModal)root.appendChild(_cxRenderFidCadastroModal());
  if(state.cxFidCarimboModal)root.appendChild(_cxRenderFidCarimboModal(session));
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
// Grava a abertura/fechamento já validados (chamado direto, ou após autorização do dev)
function _cxSalvarContagem(m,session,total,qtds,isFechamento,foraDoPadrao,diferencaPadrao,autorizadoPorNome){
  var pf=state.profile, dt=_cxDataAtiva(), agora=new Date();
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
      foraDoPadrao:!!foraDoPadrao,diferencaPadrao:diferencaPadrao||0,
      autorizadoPorDev:autorizadoPorNome||'',
    };
    dias.push(novo);
  }
  lsSet('caixaDiario',dias);
  setState({caixaDiario:dias,cxContagemModal:null});
  scheduleSave();
  showToast(isFechamento?'Caixa fechado!':(foraDoPadrao?'Caixa aberto fora do padrão (autorizado)!':'Caixa aberto!'),isFechamento||!foraDoPadrao?'success':'info');
}

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
    width:m.autorizando?'380px':'660px',maxWidth:'96vw',border:'2px solid #334155',
    maxHeight:'92vh',overflowY:'auto',
  }});

  // ── Etapa de autorização: abertura fora do padrão de R$390,00 ──────────────
  if(m.autorizando){
    var diff=m._totalPendente-_CX_ABERTURA_PADRAO;
    box.appendChild(el('div',{style:{fontSize:'40px',textAlign:'center',marginBottom:'8px'}},'🔐'));
    box.appendChild(el('div',{style:{fontSize:'17px',fontWeight:'800',textAlign:'center',marginBottom:'12px'}},'Autorização do Desenvolvedor'));
    box.appendChild(el('div',{style:{
      fontSize:'13px',color:'#fbbf24',background:'rgba(251,191,36,.12)',border:'1px solid rgba(251,191,36,.3)',
      borderRadius:'10px',padding:'12px 14px',marginBottom:'18px',lineHeight:'1.6',textAlign:'center',
    }},'Abertura de '+fmtMoney(m._totalPendente)+' está '+(diff>0?(fmtMoney(diff)+' ACIMA'):(fmtMoney(-diff)+' ABAIXO'))+' do padrão ('+fmtMoney(_CX_ABERTURA_PADRAO)+'). Digite o PIN do desenvolvedor (o mesmo do login do Caixa Diário) pra autorizar.'));

    var senhaInp=el('input',{type:'password',inputmode:'numeric',maxLength:'4',placeholder:'PIN do desenvolvedor',
      style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'20px',fontWeight:'700',textAlign:'center',letterSpacing:'8px',marginBottom:'8px'}});
    senhaInp.oninput=function(){senhaInp.value=senhaInp.value.replace(/\D/g,'').slice(0,4);m._senhaAutorizacao=senhaInp.value;};
    box.appendChild(senhaInp);
    var errAut=el('div',{style:{fontSize:'12px',color:'#f87171',textAlign:'center',minHeight:'18px',marginBottom:'10px',fontWeight:'700'}},m._erroAutorizacao?'❌ PIN incorreto':'');
    box.appendChild(errAut);

    var actsAut=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
    var voltarBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'← Voltar');
    voltarBtn.onclick=function(){m.autorizando=false;m._erroAutorizacao=false;setState({cxContagemModal:m});};
    var autorizarBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Autorizar');
    autorizarBtn.onclick=function(){
      var dev=(state.usuarios||[]).find(function(u){return u.papel==='desenvolvedor'&&u.pinCaixa;});
      if(!dev||!m._senhaAutorizacao||m._senhaAutorizacao!==dev.pinCaixa){
        m._erroAutorizacao=true;
        setState({cxContagemModal:m});
        return;
      }
      _cxSalvarContagem(m,session,m._totalPendente,m._qtdsPendente,false,true,diff,dev.nome);
    };
    actsAut.appendChild(voltarBtn);actsAut.appendChild(autorizarBtn);
    box.appendChild(actsAut);

    ov.appendChild(box);
    return ov;
  }

  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center'}},
    isFechamento?'🔒 Contagem de Fechamento':'🔓 Contagem de Abertura'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'18px'}},
    isFechamento?'Conte as cédulas e moedas do caixa':'Conte as cédulas e moedas do caixa — padrão: '+fmtMoney(_CX_ABERTURA_PADRAO)));

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
    if(!isFechamento){
      var diffPadrao=Math.round((total-_CX_ABERTURA_PADRAO)*100)/100;
      if(Math.abs(diffPadrao)>0.005){
        m.autorizando=true;
        m._totalPendente=total;
        m._qtdsPendente=Object.assign({},qtds);
        m._erroAutorizacao=false;
        setState({cxContagemModal:m});
        return;
      }
    }
    _cxSalvarContagem(m,session,total,qtds,isFechamento,false,0,'');
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
      id:uid(),profile:state.profile,data:_cxDataAtiva(),diaId:diaAtual?diaAtual.id:null,
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

// ── MODAL DE SANGRIA (retirada de dinheiro do caixa) — liberado a todos ─────
// Exige motivo obrigatório; entra no caixa como saída (reduz o dinheiro físico).
function _cxRenderSangriaModal(m,session){
  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'360px',maxWidth:'94vw',border:'2px solid #334155',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'6px',textAlign:'center',color:'#fb923c'}},'🩸 Sangria'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'16px'}},'Retirada de dinheiro do caixa — o motivo é obrigatório'));

  var motivoInp=el('input',{type:'text',placeholder:'Motivo da sangria (obrigatório)',value:m.motivo||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px',marginBottom:'12px'}});
  motivoInp.oninput=function(){m.motivo=motivoInp.value;};

  var valInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'0,00',value:m.valor||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'18px',fontWeight:'700',textAlign:'center',marginBottom:'18px'}});
  valInp.oninput=function(){m.valor=valInp.value;};

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxMovModal:null});};
  var confirmBtn=el('button',{style:{background:'#7c2d12',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Confirmar Sangria');
  confirmBtn.onclick=function(){
    var motivo=(m.motivo||'').trim();
    var val=parseFloat((m.valor+'').replace(',','.'))||0;
    if(!motivo){showToast('Informe o motivo da sangria','error');return;}
    if(!val||val<=0){showToast('Informe um valor válido','error');return;}
    var diaAtual=_cxDiaAtual();
    var agora=new Date();
    var novo={
      id:uid(),profile:state.profile,data:_cxDataAtiva(),diaId:diaAtual?diaAtual.id:null,
      tipo:'saida',subtipo:'sangria',descricao:'Sangria — '+motivo,motivo:motivo,valor:val,
      funcId:session.funcId,funcNome:session.funcNome,
      horario:agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:agora.toISOString(),
    };
    var lista=(state.caixaDiarioMovs||[]).concat([novo]);
    lsSet('caixaDiarioMovs',lista);
    setState({caixaDiarioMovs:lista,cxMovModal:null});
    scheduleSave();
    showToast('Sangria registrada!','success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);

  box.appendChild(motivoInp);box.appendChild(valInp);box.appendChild(actsRow);
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
  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Canal *'));
  var canalRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}});
  [['salao','🏠 Salão'],['delivery','🛵 Delivery']].forEach(function(pair){
    var b=el('button',{type:'button',style:{
      padding:'12px',borderRadius:'10px',border:'2px solid '+(m.canal===pair[0]?'#60a5fa':'#334155'),
      background:m.canal===pair[0]?'rgba(29,78,216,.25)':'#0f172a',color:'#f1f5f9',
      fontWeight:'700',fontSize:'13px',cursor:'pointer',
    }},pair[1]);
    b.onclick=function(){m.canal=pair[0];if(pair[0]==='salao'){m.plataforma='';m.tipoPedidoYooga='';}rerenderMov();};
    canalRow.appendChild(b);
  });
  box.appendChild(canalRow);

  // ── Plataforma de delivery: iFood ou Yooga ──
  if(m.canal==='delivery'){
    var yoogaForma=(state.formasPagamento||[]).find(function(f){return f.id==='fp_yooga'||/yooga/i.test(f.nome||'');});
    var ifoodForma=(state.formasPagamento||[]).find(function(f){return f.id==='fp_ifood'||/ifood/i.test(f.nome||'');});

    box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Plataforma *'));
    var platRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'16px'}});
    [['ifood','iFood','#ea1d2c','icons/logo-ifood.jpg'],['yooga','Yooga','#1c9fdb','icons/logo-yooga.png']].forEach(function(pl){
      var sel=m.plataforma===pl[0];
      var b=el('button',{type:'button',style:{
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:'8px',borderRadius:'10px',border:'2px solid '+(sel?pl[2]:'#334155'),
        background:sel?pl[2]+'33':'#0f172a',cursor:'pointer',overflow:'hidden',
      }},[
        el('img',{src:pl[3],alt:pl[1],style:{height:'28px',width:'auto',borderRadius:'4px',display:'block'}}),
      ]);
      b.onclick=function(){
        m.plataforma=pl[0];
        if(pl[0]!=='yooga')m.tipoPedidoYooga='';
        // Pré-seleciona a forma de pagamento correspondente (já traz a taxa configurada)
        var formaAuto=pl[0]==='yooga'?yoogaForma:ifoodForma;
        if(formaAuto&&m.pagamentos&&m.pagamentos[0])m.pagamentos[0].formaId=formaAuto.id;
        rerenderMov();
      };
      platRow.appendChild(b);
    });
    box.appendChild(platRow);

    if(m.plataforma==='yooga'){
      box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Tipo de pedido Yooga *'));
      var tipoRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}});
      [['manual','✋ Manual'],['automatico','🤖 Automático']].forEach(function(tp){
        var sel=m.tipoPedidoYooga===tp[0];
        var b=el('button',{type:'button',style:{
          padding:'10px',borderRadius:'10px',border:'2px solid '+(sel?'#1c9fdb':'#334155'),
          background:sel?'rgba(28,159,219,.25)':'#0f172a',color:'#f1f5f9',fontWeight:'700',fontSize:'13px',cursor:'pointer',
        }},tp[1]);
        b.onclick=function(){m.tipoPedidoYooga=tp[0];rerenderMov();};
        tipoRow.appendChild(b);
      });
      box.appendChild(tipoRow);
      if(m.tipoPedidoYooga==='automatico'&&yoogaForma&&yoogaForma.taxaValor>0){
        box.appendChild(el('div',{style:{fontSize:'11px',color:'#fbbf24',background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',borderRadius:'8px',padding:'8px 10px',marginBottom:'16px'}},
          '⚠ Pedido automático: taxa de '+_cxFormatTaxa(yoogaForma)+' retida pela Yooga será descontada.'));
      } else {
        box.appendChild(el('div',{style:{marginBottom:'8px'}}));
      }
    }
  }

  // ── Identificação da venda ──
  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Identificação da venda *'));
  var idInp=el('input',{type:'text',placeholder:'Ex: Comanda 12, Mesa 5, Pedido iFood #123...',value:m.identificacao||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px',marginBottom:'16px'}});
  idInp.oninput=function(){m.identificacao=idInp.value;};
  box.appendChild(idInp);

  // ── Total da venda (o que é devido antes do cupom) ──
  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Total da venda *'));
  var totalVendaInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'0,00',value:m.totalVenda||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'20px',fontWeight:'800',textAlign:'center',marginBottom:'16px'}});
  box.appendChild(totalVendaInp);

  // ── Cupom de desconto (opcional) ──
  var cupomRow=el('label',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px',cursor:'pointer',fontSize:'13px',fontWeight:'700',color:'#f1f5f9'}});
  var cupomChk=el('input',{type:'checkbox'});
  cupomChk.checked=!!m.cupomAtivo;
  cupomChk.onchange=function(){m.cupomAtivo=cupomChk.checked;if(!m.cupomAtivo){m.cupomCodigo='';m.cupomValor='';}rerenderMov();};
  cupomRow.appendChild(cupomChk);
  cupomRow.appendChild(document.createTextNode('🎟 Usar cupom de desconto'));
  box.appendChild(cupomRow);
  var totalDevidoEl=null;
  if(m.cupomAtivo){
    var cupomWrap=el('div',{style:{display:'flex',gap:'8px',marginBottom:'8px'}});
    var cupomCodInp=el('input',{type:'text',placeholder:'Código do cupom',value:m.cupomCodigo||'',
      style:{flex:'1',boxSizing:'border-box',padding:'10px 12px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px'}});
    cupomCodInp.oninput=function(){m.cupomCodigo=cupomCodInp.value;};
    var cupomValInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'Valor desc.',value:m.cupomValor||'',
      style:{width:'110px',boxSizing:'border-box',padding:'10px 12px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',fontWeight:'700',textAlign:'right'}});
    cupomWrap.appendChild(cupomCodInp);cupomWrap.appendChild(cupomValInp);
    box.appendChild(cupomWrap);
    totalDevidoEl=el('div',{style:{fontSize:'13px',color:'#4ade80',fontWeight:'800',textAlign:'center',marginBottom:'16px'}});
    box.appendChild(totalDevidoEl);
    var atualizaTotalDevidoEl=function(){
      totalDevidoEl.textContent='Total devido (com cupom): '+fmtMoney(calcTotalDevido());
    };
    cupomValInp.oninput=function(){m.cupomValor=cupomValInp.value;atualizaBannerPag();atualizaTotalDevidoEl();};
    atualizaTotalDevidoEl();
  }
  totalVendaInp.oninput=function(){m.totalVenda=totalVendaInp.value;atualizaBannerPag();if(totalDevidoEl)totalDevidoEl.textContent='Total devido (com cupom): '+fmtMoney(calcTotalDevido());};

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
  function calcCupomValor(){
    return m.cupomAtivo?(parseFloat((m.cupomValor+'').replace(',','.'))||0):0;
  }
  // Total realmente devido pelo cliente = Total da venda menos o cupom (se houver).
  // É contra esse valor que o pagamento precisa bater (não contra o total cheio).
  function calcTotalDevido(){
    return Math.max(0,Math.round((calcTotalVenda()-calcCupomValor())*100)/100);
  }
  var totalEl=el('span',{style:{fontSize:'20px',fontWeight:'900',color:'#4ade80'}},fmtMoney(calcTotalPag()));
  var bannerEl=el('div',{style:{fontSize:'13px',fontWeight:'800',textAlign:'center',padding:'10px',borderRadius:'8px',marginBottom:'12px',display:'none'}});
  function atualizaBannerPag(){
    var totalDevido=calcTotalDevido();
    var totalPago=calcTotalPag();
    var dif=Math.round((totalPago-totalDevido)*100)/100;
    if(totalDevido<=0||totalPago<=0){
      bannerEl.style.display='none';
      return;
    }
    bannerEl.style.display='block';
    if(Math.abs(dif)<0.005){
      bannerEl.style.background='rgba(74,222,128,.12)';bannerEl.style.color='#4ade80';bannerEl.style.border='1px solid rgba(74,222,128,.3)';
      bannerEl.textContent='✓ Pagamento confere'+(calcCupomValor()>0?' (já descontado o cupom)':'');
    } else if(dif>0){
      bannerEl.style.background='rgba(96,165,250,.12)';bannerEl.style.color='#60a5fa';bannerEl.style.border='1px solid rgba(96,165,250,.3)';
      bannerEl.textContent='💵 Troco a devolver: '+fmtMoney(dif);
    } else {
      bannerEl.style.background='rgba(248,113,113,.12)';bannerEl.style.color='#f87171';bannerEl.style.border='1px solid rgba(248,113,113,.3)';
      bannerEl.textContent='⚠ Falta receber: '+fmtMoney(-dif);
    }
  }
  // Taxa da plataforma de uma linha de pagamento: iFood/cartão/etc usam a taxa
  // cadastrada na forma normalmente; Yooga é especial (só cobra quando o pedido
  // é Automático, e não quando é Manual — então não usa a taxa fixa da forma).
  function _cxTaxaLinha(p,f){
    if(!f)return 0;
    var isYooga=f.id==='fp_yooga'||/yooga/i.test(f.nome||'');
    if(isYooga)return 0; // Yooga é tratado à parte, via tipoPedidoYooga
    var val=parseFloat((p.valor+'').replace(',','.'))||0;
    return Math.round((val-_cxCalcLiquido(val,f))*100)/100;
  }
  var taxasResumoEl=el('div',{style:{fontSize:'11px',color:'#94a3b8',marginBottom:'10px',display:'none'}});
  function atualizaTaxasResumo(){
    var linhas=[];
    var totalTaxas=0;
    m.pagamentos.forEach(function(p){
      var f=formas.find(function(x){return x.id===p.formaId;});
      var t=_cxTaxaLinha(p,f);
      if(t>0.004){totalTaxas+=t;linhas.push(f.nome+': -'+fmtMoney(t));}
    });
    if(m.plataforma==='yooga'&&m.tipoPedidoYooga==='automatico'){
      var yf=(state.formasPagamento||[]).find(function(x){return x.id==='fp_yooga'||/yooga/i.test(x.nome||'');});
      var tp=yf?(yf.taxaValor||0):0;
      if(tp>0){totalTaxas+=tp;linhas.push('Taxa Yooga (pedido automático): -'+fmtMoney(tp));}
    }
    if(linhas.length===0){taxasResumoEl.style.display='none';return;}
    taxasResumoEl.style.display='block';
    taxasResumoEl.innerHTML='';
    taxasResumoEl.appendChild(el('div',{style:{fontWeight:'700',color:'#fb923c',marginBottom:'3px'}},'💸 Taxas descontadas automaticamente:'));
    linhas.forEach(function(l){taxasResumoEl.appendChild(el('div',{},l));});
    taxasResumoEl.appendChild(el('div',{style:{fontWeight:'800',color:'#fb923c',marginTop:'3px'}},'Total de taxas: -'+fmtMoney(totalTaxas)));
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
    sel.onchange=function(){p.formaId=sel.value;atualizaTaxasResumo();};

    var valInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'Valor pago',value:p.valor||'',
      style:{width:'100px',padding:'10px',borderRadius:'8px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',fontWeight:'700',textAlign:'right'}});
    valInp.oninput=function(){p.valor=valInp.value;totalEl.textContent=fmtMoney(calcTotalPag());atualizaBannerPag();atualizaTaxasResumo();};

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
  box.appendChild(taxasResumoEl);
  atualizaTaxasResumo();

  box.appendChild(el('div',{style:{fontSize:'10px',color:'#64748b',marginBottom:'12px'}},'* Todos os campos são obrigatórios (canal, identificação, total e forma de pagamento).'));

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
    if(!(m.identificacao||'').trim()){showToast('Informe a identificação da venda','error');return;}
    if(m.canal==='delivery'&&!m.plataforma){showToast('Selecione a plataforma de delivery (iFood ou Yooga)','error');return;}
    if(m.plataforma==='yooga'&&!m.tipoPedidoYooga){showToast('Selecione o tipo de pedido Yooga (Manual ou Automático)','error');return;}
    var cupomValorNum=parseFloat((m.cupomValor+'').replace(',','.'))||0;
    if(m.cupomAtivo&&!(m.cupomCodigo||'').trim()){showToast('Informe o código do cupom','error');return;}
    if(m.cupomAtivo&&cupomValorNum<=0){showToast('Informe o valor do desconto do cupom','error');return;}
    var totalVenda=calcTotalVenda();
    if(!totalVenda||totalVenda<=0){showToast('Informe o total da venda','error');return;}
    if(m.cupomAtivo&&cupomValorNum>totalVenda){showToast('O desconto do cupom não pode ser maior que o total da venda','error');return;}
    var totalDevido=Math.max(0,Math.round((totalVenda-(m.cupomAtivo?cupomValorNum:0))*100)/100);
    var pags=[];
    var erro=false;
    m.pagamentos.forEach(function(p){
      var val=parseFloat((p.valor+'').replace(',','.'))||0;
      if(val<=0){erro=true;return;}
      var f=formas.find(function(x){return x.id===p.formaId;});
      if(!f){erro=true;return;}
      var isYoogaLinha=f.id==='fp_yooga'||/yooga/i.test(f.nome||'');
      var liq=isYoogaLinha?val:_cxCalcLiquido(val,f);
      pags.push({formaId:f.id,formaNome:f.nome,valor:val,taxaValor:isYoogaLinha?0:(f.taxaValor||0),taxaTipo:f.taxaTipo||'pct',valorLiquido:liq,ehDinheiroFisico:!!f.ehDinheiroFisico});
    });
    if(erro||pags.length===0){showToast('Preencha a forma e o valor de cada pagamento','error');return;}
    var totalPago=pags.reduce(function(s,p){return s+p.valor;},0);
    // Compara o pago contra o total JÁ COM O CUPOM DESCONTADO — é isso que o
    // cliente realmente deve, não o total cheio antes do desconto.
    var dif=Math.round((totalPago-totalDevido)*100)/100;
    var troco=dif>0?dif:0;
    var falta=dif<0?-dif:0;
    // Dinheiro físico que fica na gaveta: soma das formas em dinheiro menos o troco devolvido
    var totalDinheiro=pags.filter(function(p){return p.ehDinheiroFisico;}).reduce(function(s,p){return s+p.valor;},0);
    totalDinheiro=Math.max(0,Math.round((totalDinheiro-troco)*100)/100);
    // Pedido automático Yooga: soma a taxa retida pela plataforma (já cadastrada
    // na forma de pagamento "Yooga Online"), mesmo que o pagamento em si tenha
    // sido feito por outra forma.
    var taxaPlataforma=0;
    if(m.plataforma==='yooga'&&m.tipoPedidoYooga==='automatico'){
      var yoogaFormaSave=(state.formasPagamento||[]).find(function(f){return f.id==='fp_yooga'||/yooga/i.test(f.nome||'');});
      if(yoogaFormaSave)taxaPlataforma=yoogaFormaSave.taxaValor||0;
    }
    var diaAtual=_cxDiaAtual();
    var agora=new Date();
    var novo={
      id:uid(),profile:state.profile,data:_cxDataAtiva(),diaId:diaAtual?diaAtual.id:null,tipo:'entrada',
      canal:m.canal,identificacao:(m.identificacao||'').trim(),
      plataforma:m.canal==='delivery'?m.plataforma:'',tipoPedidoYooga:m.tipoPedidoYooga||'',taxaPlataforma:taxaPlataforma,
      cupomCodigo:m.cupomAtivo?(m.cupomCodigo||'').trim():'',cupomValor:m.cupomAtivo?cupomValorNum:0,
      pagamentos:pags,valorBruto:totalVenda,valor:totalDevido,totalPago:totalPago,troco:troco,falta:falta,
      valorDinheiroFisico:totalDinheiro,
      funcId:session.funcId,funcNome:session.funcNome,
      horario:agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      criadoEm:agora.toISOString(),
    };
    if(m._cxImportIdx!==undefined){
      novo.origemImportCodigo=m._cxImportCodigo||'';
      if(state.cxImportModal&&state.cxImportModal.rows&&state.cxImportModal.rows[m._cxImportIdx]){
        state.cxImportModal.rows[m._cxImportIdx].importado=true;
      }
    }
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

// ── IMPORTAÇÃO DE VENDAS DO DIA VIA XLS (somente desenvolvedor) ─────────────
// Lê o relatório detalhado "Histórico de vendas" do Yooga, filtra os pedidos
// da data ativa do Caixa Diário e monta uma fila para o dev revisar/editar
// pedido a pedido antes de salvar — cada edição reaproveita o mesmo modal e
// lógica de "Nova Entrada" já existente (_cxRenderEntradaModal).

function _cxGuessCanalPlataforma(row){
  var txt=((row.canal||'')+' '+(row.formaPagamento||'')).toLowerCase();
  if(txt.indexOf('ifood')>=0)return {canal:'delivery',plataforma:'ifood'};
  if(txt.indexOf('yooga')>=0||txt.indexOf('delivery')>=0)return {canal:'delivery',plataforma:'yooga'};
  return {canal:'salao',plataforma:''};
}

function _cxGuessFormaId(nomeTxt){
  var formas=state.formasPagamento||[];
  var txt=(nomeTxt||'').toLowerCase().trim();
  if(txt){
    var f=formas.find(function(x){
      var n=(x.nome||'').toLowerCase();
      return n&&(txt.indexOf(n)>=0||n.indexOf(txt)>=0);
    });
    if(f)return f.id;
  }
  return (formas[0]||{}).id||'';
}

function _cxRenderImportVendasModal(session){
  var m=state.cxImportModal;
  if(!m)return null;

  var expandido=!!m.expandido;
  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    position:'relative',background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:expandido?'96vw':'640px',maxWidth:'96vw',maxHeight:'92vh',overflowY:'auto',border:'2px solid #334155',
  }});
  if(m.rows){
    var expandBtn=el('button',{type:'button',title:expandido?'Reduzir':'Expandir',style:{
      position:'absolute',top:'20px',right:'22px',background:'#334155',color:'#f1f5f9',border:'none',
      borderRadius:'8px',width:'32px',height:'32px',fontSize:'15px',cursor:'pointer',lineHeight:'1',
    }},expandido?'🗗':'🗖');
    expandBtn.onclick=function(){setState({cxImportModal:Object.assign({},m,{expandido:!expandido})});};
    box.appendChild(expandBtn);
  }
  var dataAlvo=_cxDataAtiva();
  var dataAlvoDisp=typeof fmtDate==='function'?fmtDate(dataAlvo):dataAlvo;
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center',color:'#38bdf8'}},'📊 Importar Vendas do Dia'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'18px'}},'Data selecionada: '+dataAlvoDisp));

  if(!m.rows&&!m.semDados){
    box.appendChild(el('div',{style:{
      background:'#0f172a',borderRadius:'10px',padding:'12px 14px',fontSize:'12px',color:'#94a3b8',
      lineHeight:'1.7',marginBottom:'16px',borderLeft:'3px solid #38bdf8',
    }},[
      el('strong',{style:{color:'#f1f5f9',display:'block',marginBottom:'4px'}},'Como funciona:'),
      'No Yooga, exporte em Excel o relatório detalhado "Histórico de vendas" (por pedido). '
      +'O sistema lista aqui todos os pedidos da data selecionada acima, para você editar e salvar um a um — conferindo canal, plataforma e forma de pagamento antes de confirmar cada venda.',
    ]));

    var fileInp=el('input',{type:'file',accept:'.xlsx,.xls',style:{display:'none'}});
    function handleFile(f){
      if(!f)return;
      showToast('Lendo arquivo…','info');
      _parseYoogaFile(f,function(err,raw){
        if(err){showToast('Erro: '+err.message,'error');return;}
        try{
          var parsed=_parseYoogaAny(raw);
          if(parsed.tipo!=='detalhado'){
            showToast('Envie o relatório detalhado "Histórico de vendas" (por pedido), não o resumo por forma de pagamento.','error');
            return;
          }
          var pf=state.profile;
          var doDia=parsed.rows.filter(function(r){return r.data===dataAlvo;});
          if(!doDia.length){
            var datasSet={};
            parsed.rows.forEach(function(r){if(r.data)datasSet[r.data]=(datasSet[r.data]||0)+1;});
            var datasEncontradas=Object.keys(datasSet).sort().map(function(d){return {data:d,qtd:datasSet[d]};});
            setState({cxImportModal:{semDados:true,datasEncontradas:datasEncontradas}});
            return;
          }
          var jaLancados={};
          (state.caixaDiarioMovs||[]).forEach(function(mv){
            if(mv.profile===pf&&mv.origemImportCodigo)jaLancados[mv.origemImportCodigo]=true;
          });
          doDia.forEach(function(r){
            var gp=_cxGuessCanalPlataforma(r);
            r.guessCanal=gp.canal;r.guessPlataforma=gp.plataforma;
            r.guessFormaId=_cxGuessFormaId(r.formaPagamento);
            r.jaExistia=!!(r.codigo&&jaLancados[r.codigo]);
            r.importado=r.jaExistia;
          });
          setState({cxImportModal:{rows:doDia}});
        }catch(ex){showToast(ex.message,'error');}
      });
    }
    fileInp.onchange=function(){handleFile(fileInp.files[0]);};

    var dropZone=el('div',{style:{
      border:'2px dashed #334155',borderRadius:'12px',padding:'32px 20px',
      textAlign:'center',cursor:'pointer',background:'#0f172a',marginBottom:'16px',
    }});
    dropZone.innerHTML='<div style="font-size:36px;margin-bottom:10px">📂</div>'
      +'<div style="font-size:14px;font-weight:700;color:#f1f5f9;margin-bottom:4px">Clique para selecionar o arquivo Excel</div>'
      +'<div style="font-size:12px;color:#64748b">Relatório "Histórico de vendas" exportado do Yooga</div>';
    dropZone.onclick=function(){fileInp.click();};
    dropZone.ondragover=function(e){e.preventDefault();dropZone.style.borderColor='#38bdf8';};
    dropZone.ondragleave=function(){dropZone.style.borderColor='#334155';};
    dropZone.ondrop=function(e){
      e.preventDefault();dropZone.style.borderColor='#334155';
      handleFile(e.dataTransfer.files[0]);
    };
    box.appendChild(dropZone);
    box.appendChild(fileInp);

    var cancelBtn=el('button',{style:{width:'100%',background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
    cancelBtn.onclick=function(){setState({cxImportModal:null});};
    box.appendChild(cancelBtn);

  } else if(m.semDados){
    box.appendChild(el('div',{style:{
      background:'rgba(248,113,113,.12)',border:'1px solid rgba(248,113,113,.35)',color:'#f87171',
      borderRadius:'10px',padding:'14px',marginBottom:'16px',fontSize:'13px',fontWeight:'700',
    }},'⚠ Nenhum pedido encontrado para '+dataAlvoDisp+' neste arquivo.'));

    if(m.datasEncontradas&&m.datasEncontradas.length){
      box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',marginBottom:'8px',fontWeight:'700'}},'Datas encontradas no arquivo:'));
      var datasList=el('div',{style:{marginBottom:'14px',border:'1px solid #334155',borderRadius:'10px',overflow:'hidden'}});
      m.datasEncontradas.forEach(function(d){
        datasList.appendChild(el('div',{style:{fontSize:'13px',color:'#f1f5f9',padding:'8px 12px',borderBottom:'1px solid #334155'}},
          (typeof fmtDate==='function'?fmtDate(d.data):d.data)+' — '+d.qtd+' pedido(s)'));
      });
      box.appendChild(datasList);
      box.appendChild(el('div',{style:{fontSize:'11px',color:'#64748b',marginBottom:'16px',lineHeight:'1.6'}},
        'Se a data desejada estiver na lista acima, use o botão 🕓 (lançamento retroativo) no topo para mudar a data ativa do caixa para uma dessas datas e importe novamente.'));
    } else {
      box.appendChild(el('div',{style:{fontSize:'12px',color:'#64748b',marginBottom:'16px'}},
        'Não foi possível identificar nenhuma data válida neste arquivo. Confira se o relatório exportado do Yooga é o correto.'));
    }

    var voltarBtn=el('button',{style:{width:'100%',background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'← Tentar outro arquivo');
    voltarBtn.onclick=function(){setState({cxImportModal:{}});};
    box.appendChild(voltarBtn);

  } else {
    var pendentes=m.rows.filter(function(r){return !r.importado;}).length;
    var salvosAgora=m.rows.filter(function(r){return r.importado&&!r.jaExistia;}).length;
    var existentes=m.rows.filter(function(r){return r.jaExistia;}).length;

    var summary=el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}});
    summary.appendChild(el('span',{style:{background:'rgba(96,165,250,.15)',color:'#60a5fa',padding:'6px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}},pendentes+' pendente(s)'));
    summary.appendChild(el('span',{style:{background:'rgba(74,222,128,.15)',color:'#4ade80',padding:'6px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}},salvosAgora+' salvo(s) agora'));
    if(existentes>0)summary.appendChild(el('span',{style:{background:'rgba(251,191,36,.15)',color:'#fbbf24',padding:'6px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}},existentes+' já lançado(s) antes'));
    box.appendChild(summary);

    var listWrap=el('div',{style:{maxHeight:expandido?'calc(100vh - 300px)':'50vh',overflowY:'auto',border:'1px solid #334155',borderRadius:'10px',marginBottom:'16px'}});
    m.rows.forEach(function(r,idx){
      var statusTxt=r.jaExistia?'✅ Já lançado':(r.importado?'✅ Salvo':'⏳ Pendente');
      var statusCor=r.jaExistia?'#fbbf24':(r.importado?'#4ade80':'#94a3b8');
      var line=el('div',{style:{
        display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px',
        borderBottom:'1px solid #334155',opacity:r.importado?'0.55':'1',flexWrap:'wrap',
      }});
      var info=el('div',{style:{flex:'1',minWidth:'140px'}},[
        el('div',{style:{fontSize:'13px',fontWeight:'700',color:'#f1f5f9',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}},(r.codigo?'#'+r.codigo+' — ':'')+r.cliente),
        el('div',{style:{fontSize:'11px',color:'#64748b'}},(r.canal||'—')+' · '+(r.formaPagamento||'—')+(r.hora?' · '+r.hora:'')),
      ]);
      var valEl=el('div',{style:{fontSize:'14px',fontWeight:'800',color:'#4ade80',whiteSpace:'nowrap'}},fmtMoney(r.valorRecebido));
      var statusEl=el('div',{style:{fontSize:'11px',fontWeight:'700',color:statusCor,minWidth:'86px',textAlign:'right'}},statusTxt);
      var editBtn=el('button',{type:'button',style:{
        background:r.importado?'#334155':'#1d4ed8',color:'#fff',border:'none',borderRadius:'8px',
        padding:'8px 12px',cursor:'pointer',fontSize:'12px',fontWeight:'700',flexShrink:'0',
      }},r.importado?'✏ Editar':'Editar e Salvar');
      editBtn.onclick=function(){
        var cupomVal=r.desconto>0?r.desconto:0;
        setState({cxMovModal:{
          tipo:'entrada',canal:r.guessCanal,plataforma:r.guessPlataforma,
          tipoPedidoYooga:r.guessPlataforma==='yooga'?'manual':'',
          identificacao:((r.codigo?'Pedido #'+r.codigo:'')+(r.cliente&&r.cliente!=='Não identificado'?' — '+r.cliente:'')).trim()||('Pedido importado '+(idx+1)),
          totalVenda:r.valorTotal>0?r.valorTotal:r.valorRecebido,
          cupomAtivo:cupomVal>0,cupomCodigo:cupomVal>0?'Importado':'',cupomValor:cupomVal>0?cupomVal:'',
          misto:false,
          pagamentos:[{formaId:r.guessFormaId,valor:r.valorRecebido}],
          _cxImportIdx:idx,_cxImportCodigo:r.codigo||'',
        }});
      };
      line.appendChild(info);line.appendChild(valEl);line.appendChild(statusEl);line.appendChild(editBtn);
      listWrap.appendChild(line);
    });
    box.appendChild(listWrap);

    var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
    var trocarBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'← Trocar arquivo');
    trocarBtn.onclick=function(){setState({cxImportModal:{}});};
    var fecharBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Concluir');
    fecharBtn.onclick=function(){setState({cxImportModal:null});};
    actsRow.appendChild(trocarBtn);actsRow.appendChild(fecharBtn);
    box.appendChild(actsRow);
  }

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
      var platLabel2=_cxPlataformaLabel(m);
      titulo=canalLabel+(platLabel2?' · '+platLabel2:'')+(m.identificacao?' · '+m.identificacao:'');
      var formasTxt2=m.pagamentos.map(function(p){return p.formaNome+' '+fmtMoney(p.valor);}).join(' + ');
      if(m.taxaPlataforma>0)formasTxt2+=' (taxa plataforma '+fmtMoney(m.taxaPlataforma)+')';
      if(m.cupomCodigo)formasTxt2+=' (🎟 '+m.cupomCodigo+': -'+fmtMoney(m.cupomValor)+')';
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
      if(dia.foraDoPadrao){
        var _dpk=dia.diferencaPadrao||0;
        body.appendChild(el('div',{style:{fontSize:'12px',color:'#f87171',background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.3)',borderRadius:'8px',padding:'8px 10px',marginBottom:'14px'}},
          '⚠ Fora do padrão de '+fmtMoney(_CX_ABERTURA_PADRAO)+' ('+(_dpk>0?'+':'')+fmtMoney(_dpk)+'), autorizado por '+(dia.autorizadoPorDev||'desenvolvedor')+'.'));
      }
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
// ── MODAL: ativar/desativar lançamento retroativo (somente Desenvolvedor) ───
function _cxRenderRetroModal(){
  var m=state.cxRetroModal;
  if(!m)return null;
  if(!_cxIsDev(state.cxSession)){setState({cxRetroModal:null});return null;}

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'350',padding:'20px',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'340px',maxWidth:'94vw',border:'2px solid #334155',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center'}},'🕓 Lançamento Retroativo'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'20px',lineHeight:'1.6'}},
    'Escolha uma data passada pra lançar vendas/saídas de comandas físicas que ficaram de fora no dia. Só o Desenvolvedor vê essa opção.'));

  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'8px'}},'Data de trabalho'));
  var dataInp=el('input',{type:'date',value:m.data||today(),max:today(),
    style:{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'16px',fontWeight:'700',textAlign:'center',marginBottom:'20px'}});
  dataInp.oninput=function(){m.data=dataInp.value;};
  box.appendChild(dataInp);

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxRetroModal:null});};
  var confirmBtn=el('button',{style:{background:'#fbbf24',color:'#1e293b',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'🕓 Ativar');
  confirmBtn.onclick=function(){
    var dt=dataInp.value||today();
    setState({cxDataTrabalho:dt===today()?null:dt,cxRetroModal:null});
    showToast(dt===today()?'Voltou ao modo normal (hoje)':'Modo retroativo ativado para '+fmtDate(dt),dt===today()?'success':'info');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);
  box.appendChild(actsRow);

  if(state.cxDataTrabalho){
    var hojeBtn=el('button',{style:{width:'100%',background:'transparent',color:'#64748b',border:'1px solid #334155',borderRadius:'10px',padding:'10px',cursor:'pointer',fontSize:'12px',fontWeight:'700'}},'↩ Voltar para hoje ('+fmtDate(today())+')');
    hojeBtn.onclick=function(){setState({cxDataTrabalho:null,cxRetroModal:null});showToast('Voltou ao modo normal (hoje)','success');};
    box.appendChild(hojeBtn);
  }

  ov.appendChild(box);
  return ov;
}

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
  var totalTaxaPlataforma=entradas.reduce(function(s,m){return s+(m.taxaPlataforma||0);},0);
  var vendasComCupom=entradas.filter(function(m){return m.cupomCodigo;});
  var totalCupons=vendasComCupom.reduce(function(s,m){return s+(m.cupomValor||0);},0);

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
    var canalLabel=(m.canal==='delivery'?'Delivery':'Salão')+(_cxPlataformaLabel(m)?' — '+_cxPlataformaLabel(m):'');
    var formasTxt=(m.pagamentos||[]).map(function(p){return p.formaNome+' '+M(p.valor);}).join(' + ');
    var obs=(m.taxaPlataforma>0?' · taxa plat. '+M(m.taxaPlataforma):'')+(m.cupomCodigo?' · cupom '+m.cupomCodigo+' -'+M(m.cupomValor):'')+(m.troco>0?' · troco '+M(m.troco):'')+(m.falta>0?' · falta '+M(m.falta):'');
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

  var cupomRows=vendasComCupom.map(function(m){
    return '<tr><td>'+(m.horario||'')+'</td><td>'+(m.identificacao||'—')+'</td><td>'+m.cupomCodigo+'</td><td class="num">-'+M(m.cupomValor)+'</td></tr>';
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
    (dia&&dia.foraDoPadrao?'<div class="sub" style="margin-bottom:16px;color:#dc2626">⚠ Abertura fora do padrão de '+M(_CX_ABERTURA_PADRAO)+' ('+((dia.diferencaPadrao||0)>0?'+':'')+M(dia.diferencaPadrao||0)+'), autorizado por '+(dia.autorizadoPorDev||'desenvolvedor')+'.</div>':'')+
    (totalTaxaPlataforma>0?'<div class="sub" style="margin-bottom:16px">💸 Taxas retidas por plataforma (pedidos automáticos Yooga): <strong>'+M(totalTaxaPlataforma)+'</strong></div>':'')+
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
    (vendasComCupom.length>0?(
      '<h3>Cupons de desconto utilizados ('+vendasComCupom.length+')</h3>'+
      '<table><thead><tr><th>Hora</th><th>Identificação</th><th>Cupom</th><th class="num">Desconto</th></tr></thead><tbody>'+cupomRows+
      '</tbody><tfoot><tr style="font-weight:700"><td colspan="3">Total em cupons</td><td class="num">-'+M(totalCupons)+'</td></tr></tfoot></table>'
    ):'')+
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

// ── FIDELIDADE (Artt Fãs) dentro do Caixa Diário ─────────────────────────────
// Usa o MESMO banco de clientes/fidelidade do sistema principal
// (state.clientes, state.fidelidadeLog, state.fidelidadeConfig) — o que é
// cadastrado ou pontuado aqui aparece também no módulo Fidelidade do admin,
// e vice-versa. Sempre salvar com a chave "clientes" (não "fidelidadeClientes").

function _cxFidCfg(){
  return typeof _fidCfg==='function'?_fidCfg():{
    nomePrograma:'Artt Fãs',carimbosParaRecompensar:10,descricaoRecompensa:'Recompensa',
    ativo:true,cashbackAtivo:false,cashbackPorcentagem:5,cashbackMinResgate:5,
  };
}
function _cxFidTier(total){
  if(typeof _fidTier==='function')return _fidTier(total||0);
  return {label:'Cliente',cor:'#c9a84c',bg:'rgba(201,168,76,.12)',emoji:'⭐'};
}
function _cxValidaCPF(cpf){
  return typeof _validarCPF_cli==='function'?_validarCPF_cli(cpf):/^\d{11}$/.test((cpf||'').replace(/\D/g,''));
}
function _cxMaskCPF(v){
  v=(v||'').replace(/\D/g,'').slice(0,11);
  if(v.length>9)return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
  if(v.length>6)return v.replace(/(\d{3})(\d{3})(\d{1,3})/,'$1.$2.$3');
  if(v.length>3)return v.replace(/(\d{3})(\d{1,3})/,'$1.$2');
  return v;
}

// O programa roda SOMENTE como cashback (sem carimbos/recompensa por selo).
// Garante que a config compartilhada com o admin reflita isso.
function _cxFidGarantirCashback(){
  var atual=state.fidelidadeConfig||{};
  if(atual.cashbackAtivo===true)return;
  var novaCfg=Object.assign({},_cxFidCfg(),{cashbackAtivo:true});
  lsSet('fidelidadeConfig',novaCfg);
  state.fidelidadeConfig=novaCfg;
}

function _cxRenderFidelidadeTab(session){
  _cxFidGarantirCashback();
  var cfg=_cxFidCfg();
  var wrap=el('div',{});
  wrap.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',color:'#c9a84c',marginBottom:'4px'}},'💰 '+cfg.nomePrograma+' — Cashback'));
  wrap.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',marginBottom:'18px'}},'Cadastre clientes e credite cashback nas vendas — mesmo banco de dados do sistema principal'));

  if(!cfg.ativo){
    wrap.appendChild(el('div',{style:{fontSize:'13px',color:'#fbbf24',background:'rgba(251,191,36,.12)',border:'1px solid rgba(251,191,36,.3)',borderRadius:'10px',padding:'14px'}},
      '⚠ O programa de fidelidade está desativado nas configurações do sistema principal (Fidelidade → Configurações).'));
    return wrap;
  }

  var clienteSel=state.cxFidCliente?(state.clientes||[]).find(function(c){return c.id===state.cxFidCliente&&c.profile===state.profile;}):null;
  if(clienteSel){
    wrap.appendChild(_cxFidClienteCard(clienteSel,cfg,session));
  } else {
    wrap.appendChild(_cxFidBuscaArea());
  }
  return wrap;
}

function _cxFidBuscaArea(){
  var wrap=el('div',{});
  var topRow=el('div',{style:{display:'flex',gap:'10px',marginBottom:'16px'}});
  var buscaInp=el('input',{type:'text',placeholder:'🔍 Buscar por nome, CPF ou telefone...',value:state.cxFidBusca||'',
    style:{flex:'1',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px'}});
  buscaInp.oninput=function(){setState({cxFidBusca:buscaInp.value});};
  var novoBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'12px 18px',cursor:'pointer',fontSize:'14px',fontWeight:'800',whiteSpace:'nowrap'}},'+ Novo Cliente');
  novoBtn.onclick=function(){setState({cxFidCadastroModal:{}});};
  topRow.appendChild(buscaInp);topRow.appendChild(novoBtn);
  wrap.appendChild(topRow);

  var pf=state.profile;
  var buscaLow=(state.cxFidBusca||'').toLowerCase().trim();
  var buscaDig=buscaLow.replace(/\D/g,'');
  var todos=(state.clientes||[]).filter(function(c){return c.profile===pf&&c.ativo!==false;});
  var filtrados=!buscaLow?todos:todos.filter(function(c){
    var nomeM=(c.nome||'').toLowerCase().indexOf(buscaLow)>=0;
    var cpfM=buscaDig&&(c.cpf||'').replace(/\D/g,'').indexOf(buscaDig)>=0;
    var telM=buscaDig&&(c.telefone||'').replace(/\D/g,'').indexOf(buscaDig)>=0;
    return nomeM||cpfM||telM;
  }).sort(function(a,b){return (a.nome||'').localeCompare(b.nome||'');});

  if(filtrados.length===0){
    wrap.appendChild(el('div',{style:{textAlign:'center',color:'#64748b',padding:'40px 20px',fontSize:'14px'}},
      buscaLow?'Nenhum cliente encontrado para "'+state.cxFidBusca+'".':'Nenhum cliente cadastrado ainda. Toque em "+ Novo Cliente" para começar.'));
    return wrap;
  }

  var lista=el('div',{});
  filtrados.slice(0,40).forEach(function(c){
    var row=el('div',{style:{
      display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',
      background:'#1e293b',border:'1px solid #334155',borderRadius:'12px',marginBottom:'8px',cursor:'pointer',
    }});
    row.onmouseenter=function(){row.style.borderColor='#c9a84c';};
    row.onmouseleave=function(){row.style.borderColor='#334155';};
    row.appendChild(el('div',{style:{fontSize:'26px'}},'👤'));
    row.appendChild(el('div',{style:{flex:'1',minWidth:'0'}},[
      el('div',{style:{fontSize:'14px',fontWeight:'700'}},c.nome),
      el('div',{style:{fontSize:'11px',color:'#64748b'}},c.telefone||'—'),
    ]));
    row.appendChild(el('div',{style:{fontSize:'13px',fontWeight:'800',color:(c.cashbackSaldo||0)>0?'#4ade80':'#64748b'}},fmtMoney(c.cashbackSaldo||0)));
    row.appendChild(el('div',{style:{color:'#64748b',fontSize:'18px'}},'›'));
    !function(id){row.onclick=function(){setState({cxFidCliente:id});};}(c.id);
    lista.appendChild(row);
  });
  wrap.appendChild(lista);
  return wrap;
}

function _cxFidClienteCard(c,cfg,session){
  var wrap=el('div',{style:{maxWidth:'480px',margin:'0 auto'}});

  var voltarBtn=el('button',{style:{background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:'13px',fontWeight:'700',marginBottom:'14px',padding:'0'}},'← Voltar à busca');
  voltarBtn.onclick=function(){setState({cxFidCliente:null});};
  wrap.appendChild(voltarBtn);

  var card=el('div',{style:{background:'#1e293b',border:'2px solid #c9a84c',borderRadius:'18px',padding:'22px',marginBottom:'16px',textAlign:'center'}});
  card.appendChild(el('div',{style:{fontSize:'44px',marginBottom:'6px'}},'👤'));
  card.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800'}},c.nome));
  card.appendChild(el('div',{style:{fontSize:'12px',color:'#64748b'}},(c.telefone||'—')+(c.cpf?' · '+c.cpf:'')));

  card.appendChild(el('div',{style:{marginTop:'18px',paddingTop:'16px',borderTop:'1px solid #334155'}},[
    el('div',{style:{fontSize:'11px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'4px'}},'Saldo de cashback'),
    el('div',{style:{fontSize:'32px',fontWeight:'900',color:'#4ade80'}},fmtMoney(c.cashbackSaldo||0)),
    el('div',{style:{fontSize:'11px',color:'#64748b',marginTop:'4px'}},'Total já gerado: '+fmtMoney(c.cashbackTotal||0)),
  ]));
  wrap.appendChild(card);

  var acoes=el('div',{});
  var carimbarBtn=el('button',{style:{width:'100%',background:'#16a34a',color:'#fff',border:'none',borderRadius:'12px',padding:'16px',cursor:'pointer',fontSize:'15px',fontWeight:'800',marginBottom:'10px'}},'💰 Registrar Venda (gerar cashback)');
  carimbarBtn.onclick=function(){setState({cxFidCarimboModal:{clienteId:c.id,valorPedido:'',obs:''}});};
  acoes.appendChild(carimbarBtn);

  if(cfg.cashbackAtivo&&(c.cashbackSaldo||0)>=(cfg.cashbackMinResgate||5)){
    var cashbackBtn=el('button',{style:{width:'100%',background:'#1d4ed8',color:'#fff',border:'none',borderRadius:'12px',padding:'14px',cursor:'pointer',fontSize:'14px',fontWeight:'800',marginBottom:'10px'}},'💰 Resgatar Cashback: '+fmtMoney(c.cashbackSaldo||0));
    cashbackBtn.onclick=function(){
      var saldo=c.cashbackSaldo||0;
      if(!confirm('Confirmar resgate de '+fmtMoney(saldo)+' de cashback para '+c.nome+'?'))return;
      var pf=state.profile;
      var clientes=(state.clientes||[]).slice();
      for(var i=0;i<clientes.length;i++){
        if(clientes[i].id===c.id&&clientes[i].profile===pf){
          clientes[i]=Object.assign({},clientes[i]);
          clientes[i].cashbackResgatado=(clientes[i].cashbackResgatado||0)+saldo;
          clientes[i].cashbackSaldo=0;
          break;
        }
      }
      var logs=(state.fidelidadeLog||[]).concat([{
        id:uid(),clienteId:c.id,clienteNome:c.nome,profile:pf,
        tipo:'cashback-resgate',quantidade:saldo,valorPedido:0,cashbackGerado:0,
        obs:'Resgatado no Caixa Diário por '+(session?session.funcNome:''),
        data:new Date().toISOString(),
      }]);
      lsSet('clientes',clientes);lsSet('fidelidadeLog',logs);
      setState({clientes:clientes,fidelidadeLog:logs});
      scheduleSave();
      showToast('Cashback de '+fmtMoney(saldo)+' resgatado para '+c.nome+'! 💰','success');
    };
    acoes.appendChild(cashbackBtn);
  }

  wrap.appendChild(acoes);
  return wrap;
}

// ── MODAL: cadastro rápido de cliente para a fidelidade ──────────────────────
function _cxRenderFidCadastroModal(){
  var m=state.cxFidCadastroModal;
  if(!m)return null;
  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'400px',maxWidth:'94vw',border:'2px solid #334155',maxHeight:'92vh',overflowY:'auto',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'18px',textAlign:'center',color:'#c9a84c'}},'🎖 Novo Cliente — Fidelidade'));

  function campo(label,inp){
    var w=el('div',{style:{marginBottom:'12px'}});
    w.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'6px'}},label));
    w.appendChild(inp);
    return w;
  }
  var estiloInp={width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'14px'};

  var nomeInp=el('input',{type:'text',placeholder:'Nome completo',value:m.nome||'',style:estiloInp});
  nomeInp.oninput=function(){m.nome=nomeInp.value;};
  box.appendChild(campo('Nome *',nomeInp));

  var cpfInp=el('input',{type:'text',placeholder:'000.000.000-00',value:m.cpf||'',inputmode:'numeric',style:estiloInp});
  cpfInp.oninput=function(){cpfInp.value=_cxMaskCPF(cpfInp.value);m.cpf=cpfInp.value;};
  box.appendChild(campo('CPF *',cpfInp));

  var telInp=el('input',{type:'tel',placeholder:'(00) 00000-0000',value:m.telefone||'',style:estiloInp});
  telInp.oninput=function(){m.telefone=telInp.value;};
  box.appendChild(campo('Telefone *',telInp));

  var nascInp=el('input',{type:'date',value:m.nascimento||'',style:estiloInp});
  nascInp.oninput=function(){m.nascimento=nascInp.value;};
  box.appendChild(campo('Data de nascimento *',nascInp));

  var emailInp=el('input',{type:'email',placeholder:'email@exemplo.com (opcional)',value:m.email||'',style:estiloInp});
  emailInp.oninput=function(){m.email=emailInp.value;};
  box.appendChild(campo('E-mail',emailInp));

  var errEl=el('div',{style:{fontSize:'12px',color:'#f87171',textAlign:'center',minHeight:'18px',marginBottom:'6px',fontWeight:'700'}},m._erro||'');
  box.appendChild(errEl);

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'8px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxFidCadastroModal:null});};
  var salvarBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Cadastrar');
  salvarBtn.onclick=function(){
    var pf=state.profile;
    if(!(m.nome||'').trim()){m._erro='Nome é obrigatório';setState({cxFidCadastroModal:m});return;}
    if(!(m.telefone||'').trim()){m._erro='Telefone é obrigatório';setState({cxFidCadastroModal:m});return;}
    if(!_cxValidaCPF(m.cpf)){m._erro='CPF inválido';setState({cxFidCadastroModal:m});return;}
    if(!(m.nascimento||'').trim()){m._erro='Data de nascimento é obrigatória';setState({cxFidCadastroModal:m});return;}
    var cpfDig=(m.cpf||'').replace(/\D/g,'');
    var dup=(state.clientes||[]).find(function(x){return x.profile===pf&&(x.cpf||'').replace(/\D/g,'')===cpfDig;});
    if(dup){m._erro='CPF já cadastrado: '+dup.nome;setState({cxFidCadastroModal:m});return;}

    var novo={
      id:uid(),profile:pf,nome:(m.nome||'').trim(),apelido:'',cpf:(m.cpf||'').trim(),
      nascimento:m.nascimento||'',sexo:'',
      telefone:(m.telefone||'').trim(),whatsapp:'',email:(m.email||'').trim(),
      cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',estado:'',
      obs:'',ativo:true,
      carimbosTotal:0,carimbosAtuais:0,cartoesResgatados:0,
      cashbackSaldo:0,cashbackTotal:0,cashbackResgatado:0,
      criadoEm:new Date().toISOString(),ultimoCarimbo:null,
    };
    var clientes=(state.clientes||[]).concat([novo]);
    lsSet('clientes',clientes);
    setState({clientes:clientes,cxFidCadastroModal:null,cxFidCliente:novo.id});
    scheduleSave();
    showToast('Cliente cadastrado na fidelidade! 🎖','success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(salvarBtn);
  box.appendChild(actsRow);

  ov.appendChild(box);
  return ov;
}

// ── MODAL: registrar carimbo/venda + cashback ────────────────────────────────
function _cxRenderFidCarimboModal(session){
  var m=state.cxFidCarimboModal;
  if(!m)return null;
  var c=(state.clientes||[]).find(function(x){return x.id===m.clienteId&&x.profile===state.profile;});
  if(!c){setState({cxFidCarimboModal:null});return null;}
  var cfg=_cxFidCfg();

  var ov=el('div',{style:{
    position:'absolute',inset:'0',background:'rgba(0,0,0,.85)',
    display:'flex',alignItems:'center',justifyContent:'center',zIndex:'300',padding:'20px',overflowY:'auto',
  }});
  var box=el('div',{style:{
    background:'#1e293b',borderRadius:'20px',padding:'26px 24px',
    width:'360px',maxWidth:'94vw',border:'2px solid #334155',
  }});
  box.appendChild(el('div',{style:{fontSize:'18px',fontWeight:'800',marginBottom:'4px',textAlign:'center',color:'#4ade80'}},'💰 Registrar Venda'));
  box.appendChild(el('div',{style:{fontSize:'12px',color:'#94a3b8',textAlign:'center',marginBottom:'18px'}},c.nome));

  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'6px'}},'Valor do pedido (R$) *'));
  var valInp=el('input',{type:'number',min:'0',step:'0.01',inputmode:'decimal',placeholder:'0,00',value:m.valorPedido||'',
    style:{width:'100%',boxSizing:'border-box',padding:'14px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'22px',fontWeight:'800',textAlign:'center',marginBottom:'8px'}});
  var cashbackPreview=el('div',{style:{fontSize:'13px',color:'#4ade80',textAlign:'center',fontWeight:'800',marginBottom:'16px',minHeight:'18px'}});
  valInp.oninput=function(){
    m.valorPedido=valInp.value;
    var v=parseFloat(valInp.value)||0;
    cashbackPreview.textContent=v>0?('💰 Cashback ('+(cfg.cashbackPorcentagem||5)+'%): '+fmtMoney(v*(cfg.cashbackPorcentagem||5)/100)):'';
  };
  box.appendChild(valInp);
  box.appendChild(cashbackPreview);

  box.appendChild(el('div',{style:{fontSize:'12px',fontWeight:'700',color:'#94a3b8',marginBottom:'6px'}},'Observação (opcional)'));
  var obsInp=el('input',{type:'text',placeholder:'Ex: Pedido #123...',value:m.obs||'',
    style:{width:'100%',boxSizing:'border-box',padding:'12px',borderRadius:'10px',border:'1px solid #334155',background:'#0f172a',color:'#f1f5f9',fontSize:'13px',marginBottom:'18px'}});
  obsInp.oninput=function(){m.obs=obsInp.value;};
  box.appendChild(obsInp);

  var actsRow=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}});
  var cancelBtn=el('button',{style:{background:'#374151',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'700'}},'Cancelar');
  cancelBtn.onclick=function(){setState({cxFidCarimboModal:null});};
  var confirmBtn=el('button',{style:{background:'#16a34a',color:'#fff',border:'none',borderRadius:'10px',padding:'14px',cursor:'pointer',fontWeight:'800'}},'✓ Confirmar');
  confirmBtn.onclick=function(){
    var valorPedido=parseFloat((m.valorPedido+'').replace(',','.'))||0;
    if(!valorPedido||valorPedido<=0){showToast('Informe o valor do pedido','error');return;}
    var cashbackGerado=Math.round(valorPedido*(cfg.cashbackPorcentagem||5)/100*100)/100;
    var pf=state.profile;
    var clientes=(state.clientes||[]).slice();
    for(var i=0;i<clientes.length;i++){
      if(clientes[i].id===c.id&&clientes[i].profile===pf){
        clientes[i]=Object.assign({},clientes[i]);
        clientes[i].ultimoCarimbo=new Date().toISOString();
        clientes[i].cashbackSaldo=(clientes[i].cashbackSaldo||0)+cashbackGerado;
        clientes[i].cashbackTotal=(clientes[i].cashbackTotal||0)+cashbackGerado;
        break;
      }
    }
    var logs=(state.fidelidadeLog||[]).concat([{
      id:uid(),clienteId:c.id,clienteNome:c.nome,profile:pf,
      tipo:'carimbo',quantidade:0,valorPedido:valorPedido,cashbackGerado:cashbackGerado,
      obs:(m.obs||'')+(session?' — lançado por '+session.funcNome+' (Caixa Diário)':''),
      data:new Date().toISOString(),
    }]);
    lsSet('clientes',clientes);lsSet('fidelidadeLog',logs);
    setState({clientes:clientes,fidelidadeLog:logs,cxFidCarimboModal:null});
    scheduleSave();
    showToast('Cashback de '+fmtMoney(cashbackGerado)+' creditado para '+c.nome+'! 💰','success');
  };
  actsRow.appendChild(cancelBtn);actsRow.appendChild(confirmBtn);
  box.appendChild(actsRow);

  ov.appendChild(box);
  return ov;
}
