// ── PDV — FRENTE DE CAIXA ────────────────────────────────────────────────────

var _pdvCatFlt = '';
var _pdvBusca  = '';

function _pdvTotais() {
  var itens = state.pdvCarrinho || [];
  var sub   = itens.reduce(function(s,i){ return s+(i.precoUnit||0)*(i.qtd||1); }, 0);
  var dsc   = state.pdvDesconto || {tipo:'valor',val:0};
  var dscVal= dsc.tipo==='pct' ? sub*(dsc.val||0)/100 : (dsc.val||0);
  dscVal    = Math.min(Math.max(dscVal,0), sub);
  return {subtotal:sub, desconto:dscVal, total:Math.max(0,sub-dscVal)};
}

function _pdvAddItem(prod) {
  var carr = (state.pdvCarrinho||[]).slice();
  var idx  = carr.findIndex(function(i){ return i.prodId===prod.id && !i.obs; });
  if(idx>=0){
    carr[idx] = Object.assign({},carr[idx],{qtd:carr[idx].qtd+1});
  } else {
    carr.push({
      id:uid(), prodId:prod.id, nome:prod.nome,
      precoUnit:prod.precoVenda||prod.preco||0,
      qtd:1, obs:'',
      categoria:prod.categoria||'',
      setorImpressao:prod.setorImpressao||'',
    });
  }
  setState({pdvCarrinho:carr});
}

function _pdvRemItem(id) {
  setState({pdvCarrinho:(state.pdvCarrinho||[]).filter(function(i){return i.id!==id;})});
}

function _pdvQtd(id, delta) {
  var arr=(state.pdvCarrinho||[]).map(function(i){
    if(i.id!==id) return i;
    var q=Math.max(0,i.qtd+delta);
    return q===0?null:Object.assign({},i,{qtd:q});
  }).filter(Boolean);
  setState({pdvCarrinho:arr});
}

function _pdvSalvarPedido() {
  var carr=state.pdvCarrinho||[];
  if(!carr.length){showToast('Carrinho vazio','error');return;}
  var tots=_pdvTotais();
  var tipo=state.pdvTipo||'balcao';
  var ped={
    id:uid(), sesId:(state.pdvCaixaSes||{}).id||'',
    profile:state.profile, tipo:tipo,
    mesa:state.pdvMesa||'', cliente:state.pdvCliente||'',
    itens:carr.slice(), subtotal:tots.subtotal, desconto:tots.desconto,
    total:tots.total, pagamentos:[], troco:0,
    status:'aberto', criadoEm:new Date().toISOString(),
  };
  if(typeof _salvarPedido==='function'){
    _salvarPedido({
      id:uid(), profile:state.profile,
      mesa:ped.mesa,
      cliente:ped.cliente||(tipo==='balcao'?'Balcão':tipo==='salao'?'Mesa '+(ped.mesa||'?'):'Delivery'),
      itens:carr.map(function(i){return{nome:i.nome,quantidade:i.qtd,obs:i.obs||'',categoria:i.categoria||'',setorImpressao:i.setorImpressao||''};})
      ,total:tots.total,status:'novo',origem:tipo,
      criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString(),itensFinaliz:[],
    });
  }
  var novos=(state.pdvPedidos||[]).concat([ped]);
  lsSet('pdvPedidos',novos);
  setState({pdvPedidos:novos,pdvCarrinho:[],pdvTipo:'balcao',pdvMesa:'',pdvCliente:'',pdvDesconto:{tipo:'valor',val:0}});
  scheduleSave();
  showToast('✅ Pedido enviado para produção!','success');
}

// ── ABERTURA DE CAIXA ────────────────────────────────────────────────────────
function renderPDVAbertura() {
  var valInp=el('input',{class:'form-input',type:'number',min:'0',step:'0.01',
    placeholder:'200,00',
    style:{fontSize:'24px',textAlign:'center',fontWeight:'700',letterSpacing:'1px'}});

  function abrir(){
    var val=parseFloat(valInp.value)||0;
    var ses={id:'ses_'+Date.now(), profile:state.profile,
      abertura:val, abertoEm:new Date().toISOString(),
      fechamento:null, fechadoEm:null};
    lsSet('pdvCaixaSes',ses);
    setState({pdvCaixaSes:ses, pdvCarrinho:[], pdvTipo:'balcao',
      pdvMesa:'', pdvCliente:'', pdvDesconto:{tipo:'valor',val:0}});
    showToast('Caixa aberto com fundo de '+fmtMoney(val));
  }

  var page=el('div',{style:{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',flexDirection:'column',gap:'0'}});
  var modal=el('div',{class:'modal',style:{maxWidth:'380px',textAlign:'center',width:'100%',margin:'0 20px'}});
  modal.appendChild(el('div',{class:'modal-header'},[
    el('h3',{class:'modal-title'},'💰 Abertura de Caixa'),
    el('button',{class:'modal-close',onclick:function(){setState({page:'dashboard'});}}, '✕'),
  ]));
  modal.appendChild(el('div',{class:'modal-body'},[
    el('div',{style:{fontSize:'60px',marginBottom:'8px'}},'🏪'),
    el('p',{style:{color:'var(--text3)',marginBottom:'20px',fontSize:'13px'}},'Informe o fundo inicial para abrir o turno do caixa'),
    el('div',{class:'form-group'},[
      el('label',{class:'form-label'},'Fundo de caixa (R$)'),
      valInp,
    ]),
  ]));
  modal.appendChild(el('div',{class:'modal-footer',style:{justifyContent:'center',gap:'10px'}},[
    btn('btn-secondary','← Voltar',function(){setState({page:'dashboard'});}),
    btn('btn-primary','🏪 Abrir Caixa',abrir),
  ]));
  setTimeout(function(){valInp.focus();},60);
  page.appendChild(modal);
  return page;
}

// ── FECHAMENTO DE CAIXA ──────────────────────────────────────────────────────
function renderPDVFechamento() {
  var ses=state.pdvCaixaSes;
  if(!ses)return null;
  var peds=(state.pdvPedidos||[]).filter(function(p){return p.sesId===ses.id&&p.status==='pago';});
  var totalVend=peds.reduce(function(s,p){return s+p.total;},0);
  var porMet={};
  peds.forEach(function(p){(p.pagamentos||[]).forEach(function(pg){porMet[pg.metodo]=(porMet[pg.metodo]||0)+pg.valor;});});
  var dinEsp=ses.abertura+(porMet['dinheiro']||0);
  var MET_NOME={dinheiro:'💵 Dinheiro',credito:'💳 Crédito',debito:'💳 Débito',pix:'📱 PIX',cortesia:'🎁 Cortesia'};

  var contInp=el('input',{class:'form-input',type:'number',min:'0',step:'0.01',
    placeholder:'0,00',style:{textAlign:'center',fontWeight:'700',fontSize:'18px'}});

  function fechar(){
    var cont=parseFloat(contInp.value)||0;
    var dif=cont-dinEsp;
    var sesFinal=Object.assign({},ses,{fechamento:cont,fechadoEm:new Date().toISOString(),
      totalVendas:totalVend,diferenca:dif});
    var hist=(state.pdvSessoes||[]).concat([sesFinal]);
    lsSet('pdvSessoes',hist);
    lsSet('pdvCaixaSes',null);
    logAudit('fechou caixa PDV',fmtMoney(totalVend)+' em vendas');
    setState({pdvCaixaSes:null,pdvSessoes:hist,pdvFechModal:false,
      pdvCarrinho:[],pdvDesconto:{tipo:'valor',val:0},page:'dashboard'});
    scheduleSave();
    showToast('Caixa fechado! Vendas: '+fmtMoney(totalVend));
  }

  var metRows=Object.keys(porMet).map(function(m){
    var r=el('div',{style:{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'13px'}});
    r.appendChild(el('span',{},(MET_NOME[m]||m)));
    r.appendChild(el('span',{style:{fontWeight:'700'}},fmtMoney(porMet[m])));
    return r;
  });

  var ov=div('modal-overlay',[
    el('div',{class:'modal',style:{maxWidth:'440px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},'🔒 Fechamento de Caixa'),
        el('button',{class:'modal-close',onclick:function(){setState({pdvFechModal:false});}}, '✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'14px',marginBottom:'14px'}},[
          el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}},[
            el('div',{},[
              el('div',{style:{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}},'Total Vendas'),
              el('div',{style:{fontSize:'22px',fontWeight:'900',color:'var(--green)'}},fmtMoney(totalVend)),
            ]),
            el('div',{style:{textAlign:'right'}},[
              el('div',{style:{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}},'Pedidos'),
              el('div',{style:{fontSize:'22px',fontWeight:'900'}},String(peds.length)),
            ]),
          ]),
          el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Fundo inicial: '+fmtMoney(ses.abertura)+' — Abertura: '+new Date(ses.abertoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})),
        ]),
        metRows.length?el('div',{style:{marginBottom:'14px'}},metRows):null,
        el('div',{class:'form-group'},[
          el('label',{class:'form-label'},'Contagem em dinheiro no caixa (R$)'),
          contInp,
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Valor esperado: '+fmtMoney(dinEsp)+' (fundo + vendas em dinheiro)'),
        ]),
      ].filter(Boolean)),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({pdvFechModal:false});}),
        btn('btn-primary','🔒 Fechar Caixa',fechar),
      ]),
    ]),
  ]);
  ov.onclick=function(e){if(e.target===ov)setState({pdvFechModal:false});};
  return ov;
}

// ── MODAL DE PAGAMENTO ───────────────────────────────────────────────────────
function renderPDVPagamento() {
  var tots=_pdvTotais();
  var total=tots.total;
  var pags=state.pdvPagsTemp||[];
  var totalPago=pags.reduce(function(s,p){return s+p.valor;},0);
  var restante=Math.max(0,total-totalPago);
  var troco=Math.max(0,totalPago-total);

  var MET=[
    {id:'dinheiro',label:'💵 Dinheiro'},
    {id:'credito', label:'💳 Crédito'},
    {id:'debito',  label:'💳 Débito'},
    {id:'pix',     label:'📱 PIX'},
    {id:'cortesia',label:'🎁 Cortesia'},
  ];
  var MET_NOME={dinheiro:'💵 Dinheiro',credito:'💳 Crédito',debito:'💳 Débito',pix:'📱 PIX',cortesia:'🎁 Cortesia'};

  function addPag(met){
    var val=restante>0?Math.round(restante*100)/100:0;
    setState({pdvPagsTemp:(state.pdvPagsTemp||[]).concat([{metodo:met,valor:val}])});
  }
  function remPag(i){
    setState({pdvPagsTemp:(state.pdvPagsTemp||[]).filter(function(_,j){return j!==i;})});
  }

  var restaEl=el('span',{style:{fontWeight:'900',fontSize:'22px',color:restante>0?'var(--danger)':'var(--green)'}},fmtMoney(restante));
  var trocoEl=el('span',{style:{fontWeight:'900',fontSize:'22px',color:'var(--green)'}},fmtMoney(troco));

  var pagRows=pags.map(function(pg,i){
    var valInp=el('input',{type:'number',min:'0',step:'0.01',value:String(pg.valor||''),placeholder:'0,00',
      style:{width:'100px',padding:'6px 10px',border:'1px solid var(--border)',borderRadius:'6px',
        background:'var(--bg3)',color:'var(--text)',fontSize:'15px',fontWeight:'700',textAlign:'right',fontFamily:'inherit'}});
    valInp.oninput=function(){
      var novos=(state.pdvPagsTemp||[]).slice();
      novos[i]=Object.assign({},novos[i],{valor:parseFloat(this.value)||0});
      state.pdvPagsTemp=novos;
      var tp2=novos.reduce(function(s,p){return s+p.valor;},0);
      restaEl.textContent=fmtMoney(Math.max(0,total-tp2));
      restaEl.style.color=tp2>=total-0.01?'var(--green)':'var(--danger)';
      trocoEl.textContent=fmtMoney(Math.max(0,tp2-total));
    };
    var row=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 0',borderBottom:'1px solid var(--border)'}});
    row.appendChild(el('span',{style:{flex:'1',fontSize:'13px',fontWeight:'600'}},(MET_NOME[pg.metodo]||pg.metodo)));
    row.appendChild(valInp);
    var db=el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'18px',padding:'0 4px',lineHeight:'1'}});
    db.textContent='×';db.onclick=function(){remPag(i);};
    row.appendChild(db);
    return row;
  });

  function finalizar(){
    if(!pags.length){showToast('Selecione uma forma de pagamento','error');return;}
    var tp=pags.reduce(function(s,p){return s+p.valor;},0);
    if(tp<total-0.01){showToast('Valor insuficiente. Falta '+fmtMoney(total-tp),'error');return;}
    var carr=state.pdvCarrinho||[];
    var tipo=state.pdvTipo||'balcao';
    var troco2=Math.max(0,tp-total);
    var ped={
      id:uid(), sesId:(state.pdvCaixaSes||{}).id||'',
      profile:state.profile, tipo:tipo,
      mesa:state.pdvMesa||'', cliente:state.pdvCliente||'',
      itens:carr.slice(), subtotal:tots.subtotal, desconto:tots.desconto,
      total:total, pagamentos:pags.slice(), troco:troco2,
      status:'pago', criadoEm:new Date().toISOString(),
    };

    // Envia ao KDS
    if(typeof _salvarPedido==='function'){
      _salvarPedido({
        id:uid(), profile:state.profile,
        mesa:ped.mesa,
        cliente:ped.cliente||(tipo==='balcao'?'Balcão':tipo==='salao'?'Mesa '+(ped.mesa||'?'):'Delivery'),
        itens:carr.map(function(i){return {
          nome:i.nome, quantidade:i.qtd, obs:i.obs||'',
          categoria:i.categoria||'', setorImpressao:i.setorImpressao||'',
        };}),
        total:total, status:'novo', origem:tipo,
        criadoEm:new Date().toISOString(),
        atualizadoEm:new Date().toISOString(),
        itensFinaliz:[],
      });
    }

    // Receita financeira
    var desc='PDV '+(tipo==='salao'?'Salão (Mesa '+(ped.mesa||'?')+')':tipo==='delivery'?'Delivery — '+(ped.cliente||'?'):'Balcão');
    var recItem={
      id:uid(), profile:state.profile, tipo:'receita',
      descricao:desc, valor:total, categoria:'Vendas PDV',
      data:today(),
      formaPag:pags.map(function(p){return MET_NOME[p.metodo]||p.metodo;}).join(' + '),
      pago:true, criadoEm:new Date().toISOString(),
    };
    var novasRec=(state.receitas||[]).concat([recItem]);
    lsSet('receitas',novasRec);
    var novosP=(state.pdvPedidos||[]).concat([ped]);
    lsSet('pdvPedidos',novosP);
    logAudit('venda PDV',fmtMoney(total)+' via '+tipo);
    setState({
      receitas:novasRec, pdvPedidos:novosP,
      pdvCarrinho:[], pdvTipo:'balcao', pdvMesa:'', pdvCliente:'',
      pdvDesconto:{tipo:'valor',val:0}, pdvPagsTemp:null, pdvPagModal:false,
    });
    scheduleSave();
    showToast('✅ Pedido finalizado! '+fmtMoney(total),'success');
  }

  var ov=div('modal-overlay',[
    el('div',{class:'modal',style:{maxWidth:'460px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},'💳 Pagamento'),
        el('button',{class:'modal-close',onclick:function(){setState({pdvPagModal:false,pdvPagsTemp:null});}}, '✕'),
      ]),
      el('div',{class:'modal-body'},[
        // Total destaque
        el('div',{style:{background:'var(--gold-dim)',border:'1px solid var(--gold)',borderRadius:'10px',padding:'16px',marginBottom:'16px',textAlign:'center'}},[
          el('div',{style:{fontSize:'11px',fontWeight:'700',color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'4px'}},'Total a pagar'),
          el('div',{style:{fontSize:'36px',fontWeight:'900',color:'var(--gold)',letterSpacing:'-1px'}},fmtMoney(total)),
          tots.desconto>0?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Subtotal '+fmtMoney(tots.subtotal)+' — Desconto '+fmtMoney(tots.desconto)):null,
        ].filter(Boolean)),
        // Botões de método
        el('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'14px'}},
          MET.map(function(m){
            var b=el('button',{});
            b.style.cssText='padding:10px 14px;font-size:13px;font-weight:700;border-radius:8px;border:2px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;';
            b.textContent=m.label;
            b.onmouseenter=function(){this.style.borderColor='var(--gold)';this.style.color='var(--gold)';this.style.background='var(--gold-dim)';};
            b.onmouseleave=function(){this.style.borderColor='var(--border)';this.style.color='var(--text2)';this.style.background='var(--bg3)';};
            b.onclick=function(){addPag(m.id);};
            return b;
          })
        ),
        // Linhas de pagamento
        pagRows.length
          ? el('div',{style:{marginBottom:'12px'}},pagRows)
          : el('div',{style:{textAlign:'center',color:'var(--text3)',fontSize:'12px',padding:'12px',background:'var(--bg3)',borderRadius:'6px',marginBottom:'12px'}},'👆 Selecione uma forma de pagamento acima'),
        // Restante / Troco
        el('div',{style:{display:'flex',gap:'24px',justifyContent:'center',paddingTop:'12px',borderTop:'1px solid var(--border)'}},[
          el('div',{style:{textAlign:'center'}},[
            el('div',{style:{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'3px'}},'Restante'),
            restaEl,
          ]),
          el('div',{style:{textAlign:'center'}},[
            el('div',{style:{fontSize:'10px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'3px'}},'Troco'),
            trocoEl,
          ]),
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({pdvPagModal:false,pdvPagsTemp:null});}),
        btn('btn-primary','✅ Finalizar Pedido',finalizar),
      ]),
    ]),
  ]);
  ov.onclick=function(e){if(e.target===ov)setState({pdvPagModal:false,pdvPagsTemp:null});};
  return ov;
}

// ── PDV PRINCIPAL ────────────────────────────────────────────────────────────
function renderPDV() {
  var perfil=state.profile;
  var ses=state.pdvCaixaSes;
  if(!ses) return renderPDVAbertura();

  var carr=state.pdvCarrinho||[];
  var tipo=state.pdvTipo||'balcao';
  var tots=_pdvTotais();
  var peds=(state.pdvPedidos||[]).filter(function(p){return p.sesId===ses.id;});
  var pagosPed=peds.filter(function(p){return p.status==='pago';});
  var abertosPed=peds.filter(function(p){return p.status==='aberto';});
  var vendHoje=pagosPed.reduce(function(s,p){return s+p.total;},0);
  var abertoHaMin=Math.floor((Date.now()-new Date(ses.abertoEm).getTime())/60000);
  var abertoHaStr=abertoHaMin<60?abertoHaMin+'min':(Math.floor(abertoHaMin/60)+'h'+String(abertoHaMin%60).padStart(2,'0')+'m');

  // Produtos e montagens
  var todosProd=(state.produtos||[]).filter(function(p){return p.profile===perfil&&p.disponivel!==false&&p.tipo==='produto';});
  var todosComp=(state.complementos||[]).filter(function(c){return c.profile===perfil&&c.disponivel!==false;});
  var catsArr=state.estCategorias&&state.estCategorias.length
    ?state.estCategorias.map(function(c){return c.nome;})
    :[...new Set(todosProd.map(function(p){return p.categoria||'';}))].filter(Boolean);

  var isCompTab=_pdvCatFlt==='__mont__';
  var visProd=isCompTab?[]:todosProd.filter(function(p){
    if(_pdvCatFlt&&p.categoria!==_pdvCatFlt) return false;
    if(_pdvBusca&&!(p.nome||'').toLowerCase().includes(_pdvBusca.toLowerCase())) return false;
    return true;
  });
  var visComp=(isCompTab||_pdvBusca)?todosComp.filter(function(c){
    if(!isCompTab&&_pdvBusca&&!(c.nome||'').toLowerCase().includes(_pdvBusca.toLowerCase())) return false;
    return true;
  }):[];
  var visItems=isCompTab?visComp:visProd.concat(_pdvBusca?visComp:[]);

  // ── HEADER ───────────────────────────────────────────────────────────────────
  var header=el('div',{style:{
    display:'flex',alignItems:'center',gap:'12px',padding:'0 14px',
    height:'54px',background:'var(--bg2)',borderBottom:'2px solid var(--border)',flexShrink:'0',
  }});
  var logoEl=el('div',{style:{fontWeight:'900',fontSize:'14px',color:'var(--gold)',whiteSpace:'nowrap',minWidth:'80px'}});
  logoEl.innerHTML='🏪 PDV';
  var kpis=el('div',{style:{display:'flex',gap:'18px',flex:'1',justifyContent:'center',flexWrap:'nowrap'}});
  [{l:'Vendas hoje',v:fmtMoney(vendHoje),c:'var(--green)'},
   {l:'Pedidos',v:String(pagosPed.length),c:'var(--gold)'},
   {l:'Turno',v:abertoHaStr,c:'var(--text3)'},
   {l:'Fundo',v:fmtMoney(ses.abertura),c:'var(--text3)'},
  ].forEach(function(k){
    var d=el('div',{style:{textAlign:'center'}});
    d.appendChild(el('div',{style:{fontSize:'14px',fontWeight:'900',color:k.c}},k.v));
    d.appendChild(el('div',{style:{fontSize:'9px',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)'}},k.l));
    kpis.appendChild(d);
  });
  var bs='padding:5px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap;';
  var histB=el('button',{style:bs+(abertosPed.length?'border-color:var(--gold);color:var(--gold);':'')});
  histB.textContent='📋 Hist.'+(abertosPed.length?' ('+abertosPed.length+')':'');
  histB.onclick=function(){setState({pdvHistModal:true});};
  var fechB=el('button',{style:bs+'margin-left:4px;color:var(--danger);border-color:var(--danger);'});fechB.textContent='🔒 Fechar Caixa';fechB.onclick=function(){setState({pdvFechModal:true});};
  var sairB=el('button',{style:bs+'margin-left:4px;'});sairB.textContent='← Sair';sairB.onclick=function(){setState({page:'dashboard'});};
  var acoes=el('div',{style:{display:'flex',alignItems:'center',whiteSpace:'nowrap'}});
  acoes.appendChild(histB);acoes.appendChild(fechB);acoes.appendChild(sairB);
  header.appendChild(logoEl);header.appendChild(kpis);header.appendChild(acoes);

  // ── PAINEL ESQUERDO — CATÁLOGO ────────────────────────────────────────────
  var buscaInp=el('input',{class:'form-input',placeholder:'🔍 Buscar produto...',value:_pdvBusca,
    style:{marginBottom:'0',fontSize:'13px'},
    oninput:function(){_pdvBusca=this.value;setState({});}});

  var pillsWrap=el('div',{style:{display:'flex',gap:'5px',overflowX:'auto',flexWrap:'nowrap',paddingBottom:'2px'}});
  pillsWrap.style.scrollbarWidth='none';
  function pill(id,label,ativo){
    var b=el('button',{});
    b.style.cssText='padding:4px 11px;border-radius:16px;border:1px solid '+(ativo?'var(--gold)':'var(--border)')+';background:'+(ativo?'var(--gold)':'transparent')+';color:'+(ativo?'#000':'var(--text3)')+';font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;transition:all .15s;';
    b.textContent=label;
    b.onclick=function(){_pdvCatFlt=ativo?'':id;setState({});};
    return b;
  }
  pillsWrap.appendChild(pill('','Todos',!_pdvCatFlt));
  catsArr.forEach(function(c){pillsWrap.appendChild(pill(c,c,_pdvCatFlt===c));});
  if(todosComp.length) pillsWrap.appendChild(pill('__mont__','🔧 Montagens',isCompTab));

  // Grid de produtos
  var gridEl=el('div',{style:{
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',
    gap:'8px',
  }});
  if(!visItems.length){
    var empEl=el('div',{style:{gridColumn:'1/-1',textAlign:'center',color:'var(--text3)',padding:'40px'}});
    empEl.innerHTML='<div style="font-size:36px;margin-bottom:8px">🔍</div>Nenhum produto encontrado';
    gridEl.appendChild(empEl);
  } else {
    visItems.forEach(function(prod){
      var card=el('div',{style:{
        background:'var(--bg2)',border:'2px solid var(--border)',borderRadius:'10px',
        cursor:'pointer',overflow:'hidden',display:'flex',flexDirection:'column',
        userSelect:'none',transition:'all .12s',
      }});
      card.onmouseenter=function(){this.style.borderColor='var(--gold)';this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 14px rgba(0,0,0,.15)';};
      card.onmouseleave=function(){this.style.borderColor='var(--border)';this.style.transform='';this.style.boxShadow='';};
      card.onclick=function(){_pdvAddItem(prod);};

      var imgWrap=el('div',{style:{position:'relative',paddingBottom:'58%',overflow:'hidden',background:'var(--bg3)',borderRadius:'8px 8px 0 0'}});
      if(prod.imagemUrl){
        imgWrap.style.backgroundImage='url("'+prod.imagemUrl+'")';
        imgWrap.style.backgroundSize='cover';
        imgWrap.style.backgroundPosition='center';
      } else {
        imgWrap.innerHTML='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;color:var(--text3)">'+(prod.tipo==='insumo'?'🔧':'🍔')+'</div>';
      }
      var priceBadge=el('div',{style:{position:'absolute',bottom:'4px',right:'4px',background:'rgba(0,0,0,.75)',color:'#fff',fontSize:'11px',fontWeight:'900',padding:'2px 7px',borderRadius:'10px'}});
      priceBadge.textContent=fmtMoney(prod.precoVenda||prod.preco||0);
      imgWrap.appendChild(priceBadge);

      // Badge de qtd no carrinho
      var qtdNoCarr=carr.filter(function(i){return i.prodId===prod.id;}).reduce(function(s,i){return s+i.qtd;},0);
      if(qtdNoCarr>0){
        var qBadge=el('div',{style:{position:'absolute',top:'4px',left:'4px',background:'var(--gold)',color:'#000',fontSize:'11px',fontWeight:'900',padding:'2px 7px',borderRadius:'10px'}});
        qBadge.textContent=String(qtdNoCarr)+'×';
        imgWrap.appendChild(qBadge);
      }

      var infoEl=el('div',{style:{padding:'6px 8px'}});
      infoEl.appendChild(el('div',{style:{fontWeight:'700',fontSize:'11px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},prod.nome));
      if(prod.categoria) infoEl.appendChild(el('div',{style:{fontSize:'10px',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},prod.categoria));
      card.appendChild(imgWrap);card.appendChild(infoEl);
      gridEl.appendChild(card);
    });
  }

  var leftTop=el('div',{style:{padding:'8px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:'0'}});
  leftTop.appendChild(buscaInp);
  leftTop.appendChild(el('div',{style:{marginTop:'6px'}},pillsWrap));
  var leftScroll=el('div',{style:{flex:'1',overflowY:'auto',padding:'10px',scrollbarWidth:'thin'}});
  leftScroll.appendChild(gridEl);
  var leftPanel=el('div',{style:{flex:'1',minWidth:'0',display:'flex',flexDirection:'column',overflow:'hidden',background:'var(--bg)'}});
  leftPanel.appendChild(leftTop);leftPanel.appendChild(leftScroll);

  // ── PAINEL DIREITO — PEDIDO ───────────────────────────────────────────────
  function tipoBtn(id,icon,label){
    var ativo=tipo===id;
    var b=el('button',{});
    b.style.cssText='flex:1;padding:7px 2px;border-radius:7px;border:2px solid '+(ativo?'var(--gold)':'var(--border)')+';background:'+(ativo?'var(--gold-dim)':'transparent')+';color:'+(ativo?'var(--gold)':'var(--text3)')+';font-family:inherit;cursor:pointer;font-size:10px;font-weight:700;transition:all .15s;line-height:1.4;';
    b.innerHTML='<span style="font-size:16px">'+icon+'</span><br>'+label;
    b.onclick=function(){setState({pdvTipo:id});};
    return b;
  }
  var tipoRow=el('div',{style:{display:'flex',gap:'5px',marginBottom:'8px'}});
  tipoRow.appendChild(tipoBtn('balcao','🏃','Balcão'));
  tipoRow.appendChild(tipoBtn('salao','🍽️','Salão'));
  tipoRow.appendChild(tipoBtn('delivery','🛵','Delivery'));

  var rightHeader=el('div',{style:{padding:'10px',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:'0'}});
  rightHeader.appendChild(tipoRow);
  if(tipo==='salao'){
    var mesaRow=el('div',{style:{display:'flex',gap:'6px',alignItems:'center',marginBottom:'6px'}});
    var mesaInp=el('input',{class:'form-input',placeholder:'Mesa nº...',value:state.pdvMesa||'',
      style:{marginBottom:'0',fontSize:'13px',textAlign:'center',fontWeight:'700'},
      oninput:function(){state.pdvMesa=this.value;}});
    mesaRow.appendChild(el('span',{style:{fontSize:'12px',color:'var(--text3)',whiteSpace:'nowrap'}},'🍽️ Mesa:'));
    mesaRow.appendChild(mesaInp);
    rightHeader.appendChild(mesaRow);
  }
  // Seletor de cliente cadastrado (todos os modos)
  if(typeof cliPickerWidget==='function'){
    var cliLabel=el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'3px'}});
    var cliSel=state.pdvClienteSel;
    if(cliSel){
      // mostra cliente selecionado com info de endereço/cashback
      var cliSelRow=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg3)',borderRadius:'8px',padding:'7px 10px'}});
      var tier=(typeof _cliTierCor==='function')?_cliTierCor(cliSel.carimbosTotal||0):{cor:'#b87333'};
      var av2=el('div',{style:{width:'28px',height:'28px',borderRadius:'50%',background:tier.cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:'800',color:'#fff',flexShrink:'0'}});
      av2.textContent=(cliSel.nome||'?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
      cliSelRow.appendChild(av2);
      var cliInfo2=el('div',{style:{flex:'1',minWidth:0}});
      var cliNm=el('div',{style:{fontSize:'12px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}});
      cliNm.textContent=cliSel.nome; cliInfo2.appendChild(cliNm);
      var cliSub2=[];
      if(cliSel.telefone) cliSub2.push(cliSel.telefone);
      var endParts=[cliSel.logradouro,cliSel.numero,cliSel.complemento,cliSel.bairro].filter(Boolean);
      if(endParts.length) cliSub2.push(endParts.join(', '));
      if((state.fidelidadeConfig||{}).cashbackAtivo&&(cliSel.cashbackSaldo||0)>0) cliSub2.push('💰 Cashback: R$ '+(cliSel.cashbackSaldo||0).toFixed(2).replace('.',','));
      if(cliSub2.length){var cliSubEl=el('div',{style:{fontSize:'10px',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}});cliSubEl.textContent=cliSub2.join('  •  ');cliInfo2.appendChild(cliSubEl);}
      cliSelRow.appendChild(cliInfo2);
      var cliXBtn=el('button',{style:{background:'none',border:'none',cursor:'pointer',fontSize:'14px',opacity:'.6',padding:'2px'}});
      cliXBtn.textContent='✕';
      cliXBtn.onclick=function(){setState({pdvClienteSel:null,pdvCliente:''});};
      cliSelRow.appendChild(cliXBtn);
      cliLabel.textContent='👤 Cliente vinculado:';
      rightHeader.appendChild(cliLabel);
      rightHeader.appendChild(cliSelRow);
    } else {
      cliLabel.textContent='👤 Vincular cliente (opcional):';
      rightHeader.appendChild(cliLabel);
      var picker=cliPickerWidget(state.pdvCliente||'',function(cliente){
        if(cliente) setState({pdvClienteSel:cliente,pdvCliente:cliente.nome});
        else setState({pdvCliente:'',pdvClienteSel:null});
      });
      rightHeader.appendChild(picker);
    }
  } else if(tipo==='delivery'){
    var cliRow=el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}});
    var cliInp=el('input',{class:'form-input',placeholder:'Nome do cliente...',value:state.pdvCliente||'',
      style:{marginBottom:'0',fontSize:'13px'},
      oninput:function(){state.pdvCliente=this.value;}});
    cliRow.appendChild(el('span',{style:{fontSize:'12px',color:'var(--text3)',whiteSpace:'nowrap'}},'🛵 Cliente:'));
    cliRow.appendChild(cliInp);
    rightHeader.appendChild(cliRow);
  }

  // Lista de itens
  var itemsArea=el('div',{style:{flex:'1',overflowY:'auto',scrollbarWidth:'thin'}});
  if(!carr.length){
    var emptyCart=el('div',{style:{textAlign:'center',color:'var(--text3)',padding:'32px 12px'}});
    emptyCart.innerHTML='<div style="font-size:42px;margin-bottom:8px">🛒</div><div style="font-size:13px;font-weight:600">Carrinho vazio</div><div style="font-size:11px;margin-top:4px;opacity:.7">Clique em um produto para adicionar</div>';
    itemsArea.appendChild(emptyCart);
  } else {
    carr.forEach(function(item){
      var row=el('div',{style:{borderBottom:'1px solid var(--border)',padding:'8px 10px'}});

      var topRow=el('div',{style:{display:'flex',gap:'6px',alignItems:'flex-start',marginBottom:'5px'}});
      var nEl=el('div',{style:{flex:'1',fontWeight:'700',fontSize:'12px',lineHeight:'1.3'}},item.nome);
      var pvEl=el('div',{style:{fontWeight:'900',fontSize:'13px',color:'var(--gold)',whiteSpace:'nowrap'}},fmtMoney(item.precoUnit*item.qtd));
      topRow.appendChild(nEl);topRow.appendChild(pvEl);

      var ctrl=el('div',{style:{display:'flex',alignItems:'center',gap:'4px',marginBottom:'4px'}});
      var mBtn=el('button',{style:'width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--bg3);cursor:pointer;font-weight:900;font-size:13px;line-height:1;color:var(--text2);'});
      mBtn.textContent='−';mBtn.onclick=function(){_pdvQtd(item.id,-1);};
      var qtdEl=el('span',{style:{minWidth:'20px',textAlign:'center',fontWeight:'900',fontSize:'13px'}},String(item.qtd));
      var pBtn=el('button',{style:'width:22px;height:22px;border-radius:50%;border:1px solid var(--gold);background:var(--gold-dim);cursor:pointer;font-weight:900;font-size:13px;line-height:1;color:var(--gold);'});
      pBtn.textContent='+';pBtn.onclick=function(){_pdvQtd(item.id,1);};
      var unitEl=el('span',{style:{fontSize:'10px',color:'var(--text3)',marginLeft:'2px'}});
      unitEl.textContent='× '+fmtMoney(item.precoUnit);
      var delB=el('button',{style:'margin-left:auto;background:none;border:none;cursor:pointer;color:var(--danger);font-size:14px;line-height:1;padding:0 2px;'});
      delB.textContent='🗑';delB.onclick=function(){_pdvRemItem(item.id);};
      ctrl.appendChild(mBtn);ctrl.appendChild(qtdEl);ctrl.appendChild(pBtn);ctrl.appendChild(unitEl);ctrl.appendChild(delB);

      var obsInp=el('input',{placeholder:'Obs: sem cebola, bem passado...',value:item.obs||'',
        style:{width:'100%',border:'none',borderBottom:'1px dashed var(--border)',background:'transparent',color:'var(--text3)',fontSize:'11px',outline:'none',fontFamily:'inherit',padding:'2px 0'},
        oninput:function(){item.obs=this.value;}});

      row.appendChild(topRow);row.appendChild(ctrl);row.appendChild(obsInp);
      itemsArea.appendChild(row);
    });
  }

  // Desconto
  var dsc=state.pdvDesconto||{tipo:'valor',val:0};
  var dscRow=el('div',{style:{padding:'7px 10px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'5px',background:'var(--bg3)',flexShrink:'0'}});
  dscRow.appendChild(el('span',{style:{fontSize:'11px',color:'var(--text3)',flex:'1'}},'Desconto:'));
  var dscTSel=el('select',{style:'padding:3px 5px;border:1px solid var(--border);borderRadius:5px;background:var(--bg2);color:var(--text3);font-size:11px;font-family:inherit;cursor:pointer;',
    onchange:function(){state.pdvDesconto={tipo:this.value,val:dsc.val};setState({});}},
    [el('option',{value:'valor',selected:dsc.tipo==='valor'},'R$'),
     el('option',{value:'pct',  selected:dsc.tipo==='pct'},'%')]);
  var dscVInp=el('input',{type:'number',min:'0',step:'0.01',value:String(dsc.val||''),placeholder:'0',
    style:'width:65px;padding:4px 7px;border:1px solid var(--border);border-radius:5px;background:var(--bg2);color:var(--text);font-size:13px;font-weight:700;text-align:right;font-family:inherit;',
    oninput:function(){state.pdvDesconto={tipo:dsc.tipo,val:parseFloat(this.value)||0};setState({});}});
  dscRow.appendChild(dscTSel);dscRow.appendChild(dscVInp);

  // Totais
  var totArea=el('div',{style:{padding:'10px',background:'var(--bg2)',borderTop:'1px solid var(--border)',flexShrink:'0'}});
  [{l:'Subtotal',v:fmtMoney(tots.subtotal),s:'12px',c:'var(--text3)',w:'500'},
   tots.desconto>0?{l:'Desconto',v:'− '+fmtMoney(tots.desconto),s:'12px',c:'var(--danger)',w:'700'}:null,
   {l:'TOTAL',v:fmtMoney(tots.total),s:'20px',c:'var(--gold)',w:'900'},
  ].filter(Boolean).forEach(function(r){
    var row=el('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:'3px'}});
    row.appendChild(el('span',{style:{fontSize:r.s,color:r.c,fontWeight:r.w}},r.l));
    row.appendChild(el('span',{style:{fontSize:r.s,color:r.c,fontWeight:'700'}},r.v));
    totArea.appendChild(row);
  });

  // Botão pagar
  var canPay=carr.length>0&&tots.total>0;
  var pagarB=el('button',{});
  pagarB.style.cssText='width:100%;padding:14px;background:'+(canPay?'#16a34a':'var(--border)')+';color:'+(canPay?'#fff':'var(--text3)')+';border:none;border-radius:8px;font-family:inherit;font-size:15px;font-weight:900;cursor:'+(canPay?'pointer':'default')+';letter-spacing:.3px;transition:all .15s;';
  pagarB.textContent='💳 PAGAR — '+fmtMoney(tots.total);
  if(canPay){
    pagarB.onmouseenter=function(){this.style.background='#15803d';};
    pagarB.onmouseleave=function(){this.style.background='#16a34a';};
    pagarB.onclick=function(){setState({pdvPagModal:true,pdvPagsTemp:[]});};
  }
  var limB=el('button',{});
  limB.style.cssText='width:100%;padding:6px;background:none;color:var(--danger);border:1px solid transparent;border-radius:6px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;margin-top:4px;transition:border-color .15s;';
  limB.textContent='🗑 Limpar carrinho';
  limB.onmouseenter=function(){this.style.borderColor='var(--danger)';};
  limB.onmouseleave=function(){this.style.borderColor='transparent';};
  limB.onclick=function(){
    if(!carr.length)return;
    if(!window.confirm('Limpar carrinho?'))return;
    setState({pdvCarrinho:[],pdvDesconto:{tipo:'valor',val:0}});
  };

  var salvarB=el('button',{});
  salvarB.style.cssText='width:100%;padding:10px;background:transparent;color:'+(carr.length>0?'var(--gold)':'var(--text3)')+';border:1.5px solid '+(carr.length>0?'var(--gold)':'var(--border)')+';border-radius:8px;font-family:inherit;font-size:13px;font-weight:700;cursor:'+(carr.length>0?'pointer':'default')+';margin-bottom:5px;transition:all .15s;';
  salvarB.textContent='📤 Salvar Pedido — enviar para produção';
  if(carr.length>0){
    salvarB.onmouseenter=function(){this.style.background='var(--gold-dim)';};
    salvarB.onmouseleave=function(){this.style.background='transparent';};
    salvarB.onclick=function(){_pdvSalvarPedido();};
  }
  var actArea=el('div',{style:{padding:'10px',background:'var(--bg2)',borderTop:'1px solid var(--border)',flexShrink:'0'}});
  actArea.appendChild(pagarB);actArea.appendChild(salvarB);actArea.appendChild(limB);

  var rightPanel=el('div',{style:{width:'296px',flexShrink:'0',display:'flex',flexDirection:'column',background:'var(--bg2)',borderLeft:'2px solid var(--border)',overflow:'hidden'}});
  rightPanel.appendChild(rightHeader);
  rightPanel.appendChild(itemsArea);
  rightPanel.appendChild(dscRow);
  rightPanel.appendChild(totArea);
  rightPanel.appendChild(actArea);

  // ── HISTÓRICO MODAL ──────────────────────────────────────────────────────────
  var histMod=null;
  if(state.pdvHistModal){
    var hTotal=pagosPed.reduce(function(s,p){return s+p.total;},0);
    var buildAbertoRow=function(p){
      var tLbl={balcao:'🏃 Balcão',salao:'🍽️ Mesa '+(p.mesa||'?'),delivery:'🛵 '+(p.cliente||'?')}[p.tipo]||p.tipo;
      var r=el('div',{style:{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',borderBottom:'1px solid var(--border)',fontSize:'12px',background:'var(--gold-dim)'}});
      r.appendChild(el('span',{style:{color:'var(--text3)',width:'34px',flexShrink:'0',fontSize:'11px'}},new Date(p.criadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})));
      r.appendChild(el('span',{style:{flex:'1',fontWeight:'600'}},tLbl));
      r.appendChild(el('span',{style:{fontSize:'11px',color:'var(--text3)'}},(p.itens||[]).length+' it.'));
      r.appendChild(el('span',{style:{fontWeight:'700',color:'var(--gold)',whiteSpace:'nowrap',marginRight:'4px'}},fmtMoney(p.total)));
      var pBtn=el('button',{});
      pBtn.style.cssText='padding:3px 10px;font-size:11px;font-weight:700;border-radius:5px;border:none;background:var(--gold);color:#000;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;';
      pBtn.textContent='💳 Pagar';
      pBtn.onclick=function(){
        var novos=(state.pdvPedidos||[]).filter(function(x){return x.id!==p.id;});
        lsSet('pdvPedidos',novos);
        setState({pdvPedidos:novos,pdvCarrinho:(p.itens||[]).map(function(i){return Object.assign({},i,{id:i.id||uid()});}),
          pdvTipo:p.tipo||'balcao',pdvMesa:p.mesa||'',pdvCliente:p.cliente||'',
          pdvDesconto:{tipo:'valor',val:p.desconto||0},
          pdvHistModal:false,pdvPagModal:true,pdvPagsTemp:[]});
      };
      r.appendChild(pBtn);
      return r;
    };
    var buildPagoRow=function(p){
      var tLbl={balcao:'🏃 Balcão',salao:'🍽️ Mesa '+(p.mesa||'?'),delivery:'🛵 '+(p.cliente||'?')}[p.tipo]||p.tipo;
      var r=el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'8px 14px',borderBottom:'1px solid var(--border)',fontSize:'12px',cursor:'default'}});
      r.onmouseenter=function(){this.style.background='var(--bg3)';};
      r.onmouseleave=function(){this.style.background='';};
      r.appendChild(el('span',{style:{color:'var(--text3)',width:'34px',flexShrink:'0',fontSize:'11px'}},new Date(p.criadoEm).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})));
      r.appendChild(el('span',{style:{flex:'1'}},tLbl));
      r.appendChild(el('span',{style:{fontSize:'11px',color:'var(--text3)'}},(p.itens||[]).length+' it.'));
      r.appendChild(el('span',{style:{fontWeight:'700',color:'var(--green)',whiteSpace:'nowrap'}},fmtMoney(p.total)));
      return r;
    };
    var abertoRowsEl=abertosPed.length
      ?[el('div',{style:{padding:'6px 14px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--gold)',background:'var(--gold-dim)',borderBottom:'1px solid var(--gold)'}},'⏳ Em produção — aguardando pagamento ('+abertosPed.length+')')].concat(abertosPed.slice().reverse().map(buildAbertoRow))
      :[];
    var pagosRowsEl=pagosPed.length
      ?[el('div',{style:{padding:'6px 14px',fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',borderBottom:'1px solid var(--border)'}},'✅ Finalizados ('+pagosPed.length+')')].concat(pagosPed.slice().reverse().map(buildPagoRow))
      :[el('div',{style:{textAlign:'center',color:'var(--text3)',padding:'20px 14px'}},'Nenhum pedido finalizado neste turno.')];
    histMod=div('modal-overlay',[
      el('div',{class:'modal',style:{maxWidth:'520px'}},[
        el('div',{class:'modal-header'},[
          el('h3',{class:'modal-title'},'📋 Pedidos do Turno'+(abertosPed.length?' · '+abertosPed.length+' em produção':'')),
          el('button',{class:'modal-close',onclick:function(){setState({pdvHistModal:false});}}, '✕'),
        ]),
        el('div',{style:{maxHeight:'440px',overflowY:'auto'}},abertoRowsEl.concat(pagosRowsEl)),
        el('div',{style:{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontWeight:'700',fontSize:'14px'}},[
          el('span',{},'Total finalizados'),
          el('span',{style:{color:'var(--green)'}},fmtMoney(hTotal)),
        ]),
      ]),
    ]);
    histMod.onclick=function(e){if(e.target===histMod)setState({pdvHistModal:false});};
  }

  // ── MONTAR ───────────────────────────────────────────────────────────────────
  var body=el('div',{style:{display:'flex',flex:'1',overflow:'hidden'}});
  body.appendChild(leftPanel);body.appendChild(rightPanel);

  var page=el('div',{style:{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'var(--bg)'}});
  page.appendChild(header);page.appendChild(body);

  var root=el('div',{});
  root.appendChild(page);
  if(state.pdvFechModal)root.appendChild(renderPDVFechamento());
  if(state.pdvPagModal) root.appendChild(renderPDVPagamento());
  if(histMod)           root.appendChild(histMod);
  return root;
}
