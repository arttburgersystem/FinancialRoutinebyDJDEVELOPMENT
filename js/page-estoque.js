// ── ESTOQUE & CMV ─────────────────────────────────────────────────────────────
// v1.1.1 — Controle de estoque com CMV, Curva ABC e integração financeira

var EST_CATS  = ['Proteínas','Pães','Vegetais/Saladas','Laticínios','Bebidas','Embalagens','Temperos/Molhos','Outros'];
var EST_UNIDS = ['kg','g','un','L','ml','cx','pct','sc'];

// ── HELPERS ──────────────────────────────────────────────────────────────────

function estProdutos() {
  return (state.produtos || []).filter(function(p){ return p.profile === state.profile && p.ativo !== false; });
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

// ── MODAL PRODUTO ─────────────────────────────────────────────────────────────

function renderProdutoModal() {
  var p = state.produtoModal || {};
  var isEdit = !!p.id;
  function fld(lbl, inp) { return el('div',{class:'form-group'},[el('label',{class:'form-label'},lbl),inp]); }

  var nomeInp  = el('input',{class:'form-input',value:p.nome||'',placeholder:'Ex: Carne 150g, Pão brioche...',oninput:function(){p.nome=this.value;}});
  var catSel   = el('select',{class:'form-input',onchange:function(){p.categoria=this.value;}},
    EST_CATS.map(function(c){return el('option',{value:c,selected:p.categoria===c},c);}));
  var unidSel  = el('select',{class:'form-input',onchange:function(){p.unidade=this.value;}},
    EST_UNIDS.map(function(u){return el('option',{value:u,selected:p.unidade===u},u);}));
  var custoInp = el('input',{class:'form-input',type:'number',min:'0',step:'0.01',value:p.custoMedio||'',placeholder:'0,00',oninput:function(){p.custoMedio=parseFloat(this.value)||0;}});
  var vendaInp = el('input',{class:'form-input',type:'number',min:'0',step:'0.01',value:p.precoVenda||'',placeholder:'0,00 (opcional)',oninput:function(){p.precoVenda=parseFloat(this.value)||0;}});
  var estAInp  = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:p.estoqueAtual||'',placeholder:'0',oninput:function(){p.estoqueAtual=parseFloat(this.value)||0;}});
  var estMInp  = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:p.estoqueMinimo||'',placeholder:'0',oninput:function(){p.estoqueMinimo=parseFloat(this.value)||0;}});
  var fornSel  = el('select',{class:'form-input',onchange:function(){p.fornecedor_id=this.value;}},
    [el('option',{value:''},'— Nenhum —')].concat(
      (state.fornecedores||[]).filter(function(f){return f.profile===state.profile;})
        .map(function(f){return el('option',{value:f.id,selected:p.fornecedor_id===f.id},f.nome);})));
  var obsInp = el('input',{class:'form-input',value:p.obs||'',placeholder:'Observações...',oninput:function(){p.obs=this.value;}});
  var errEl  = el('div',{style:{color:'var(--danger)',fontSize:'12px',minHeight:'16px'}});

  function salvar() {
    if (!(p.nome||'').trim()) { errEl.textContent='Informe o nome do produto.'; return; }
    var prod = {
      id:p.id||uid(), profile:state.profile, nome:(p.nome||'').trim(),
      categoria:p.categoria||EST_CATS[0], unidade:p.unidade||'un',
      custoMedio:p.custoMedio||0, precoVenda:p.precoVenda||0,
      estoqueAtual:p.estoqueAtual||0, estoqueMinimo:p.estoqueMinimo||0,
      fornecedor_id:p.fornecedor_id||'', obs:p.obs||'',
      ativo:true, criadoEm:p.criadoEm||today(),
    };
    var novos = isEdit
      ? state.produtos.map(function(x){return x.id===prod.id?prod:x;})
      : (state.produtos||[]).concat([prod]);
    logAudit((isEdit?'editou':'cadastrou')+' produto', prod.nome);
    setState({produtos:novos, produtoModal:null});
    scheduleSave();
    showToast(isEdit?'Produto atualizado!':'Produto cadastrado!','success');
  }

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({produtoModal:null});}},
    el('div',{class:'modal',style:{maxWidth:'520px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEdit?'✏️ Editar':'➕ Novo')+' Produto / Insumo'),
        el('button',{class:'modal-close',onclick:function(){setState({produtoModal:null});}}, '✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},fld('Nome do produto / insumo',nomeInp)),
          fld('Categoria',catSel),
          fld('Unidade de medida',unidSel),
          fld('Custo médio (R$)',custoInp),
          fld('Preço de venda (R$)',vendaInp),
          fld('Estoque atual',estAInp),
          fld('Estoque mínimo (alerta)',estMInp),
          fld('Fornecedor principal',fornSel),
          el('div',{style:{gridColumn:'1/-1'}},fld('Observações',obsInp)),
        ]),
        errEl,
      ]),
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
    ].map(function(x){return el('option',{value:x.v,selected:tipo===x.v},x.l);}));

  var prodAtual = prods.find(function(p){return p.id===m.produto_id;});

  var prodSel = el('select',{class:'form-input',onchange:function(){
    var prd = prods.find(function(p){return p.id===this.value;},this);
    var novoCusto = (prd && tipo!=='saida') ? (prd.custoMedio||0) : m.custoUnitario;
    setState({movModal:Object.assign({},m,{produto_id:this.value,custoUnitario:novoCusto})});
  }},
    [el('option',{value:''},'— Selecione o produto —')].concat(
      prods.map(function(p){
        return el('option',{value:p.id,selected:m.produto_id===p.id},
          p.nome+' ('+formatQtd(p.estoqueAtual,p.unidade)+')');
      })));

  var qtdInp    = el('input',{class:'form-input',type:'number',min:'0',step:'0.001',value:m.quantidade||'',
    placeholder:tipo==='ajuste'?'Novo estoque total':'Quantidade',oninput:function(){m.quantidade=parseFloat(this.value)||0;}});
  var custoInp  = el('input',{class:'form-input',type:'number',min:'0',step:'0.01',value:m.custoUnitario||'',
    placeholder:'0,00',oninput:function(){m.custoUnitario=parseFloat(this.value)||0;}});
  var dataInp   = el('input',{class:'form-input',type:'date',value:m.data||today(),oninput:function(){m.data=this.value;}});
  var motivoSel = el('select',{class:'form-input',onchange:function(){m.motivo=this.value;}},
    motivos.map(function(mt){return el('option',{value:mt,selected:m.motivo===mt},mt);}));
  var obsInp    = el('input',{class:'form-input',value:m.obs||'',placeholder:'Observação (opcional)',oninput:function(){m.obs=this.value;}});

  var prodInfoEl = prodAtual ? el('div',{style:{background:'var(--bg3)',borderRadius:'8px',padding:'8px 12px',fontSize:'12px',color:'var(--text3)',display:'flex',gap:'16px',flexWrap:'wrap',marginBottom:'4px'}},[
    el('span',{},'📦 Estoque: '+formatQtd(prodAtual.estoqueAtual,prodAtual.unidade)),
    el('span',{},'💰 Custo médio: '+fmtMoney(prodAtual.custoMedio||0)),
    prodAtual.estoqueMinimo>0 ? el('span',{style:{color:prodAtual.estoqueAtual<=prodAtual.estoqueMinimo?'var(--danger)':'var(--text3)'}},'⚠️ Mín: '+formatQtd(prodAtual.estoqueMinimo,prodAtual.unidade)) : null,
  ].filter(Boolean)) : null;

  var cbGerarDesp = el('input',{type:'checkbox',id:'_gerardesp',onchange:function(){m.gerarDespesa=this.checked;}});
  if (m.gerarDespesa) cbGerarDesp.checked = true;
  var gerarDespEl = tipo==='entrada' ? el('div',{style:{display:'flex',gap:'8px',alignItems:'center',padding:'8px 0',borderTop:'1px solid var(--border)',marginTop:'8px'}},[
    cbGerarDesp,
    el('label',{for:'_gerardesp',style:{fontSize:'12px',color:'var(--text2)',cursor:'pointer'}},'💸 Gerar conta a pagar vinculada a esta compra'),
  ]) : null;

  function salvar() {
    if (!m.produto_id)              { errEl.textContent='Selecione o produto.'; return; }
    if (!m.quantidade || m.quantidade<=0) { errEl.textContent='Informe a quantidade.'; return; }
    var prod = prods.find(function(p){return p.id===m.produto_id;});
    if (!prod) return;

    var qtd    = m.quantidade;
    var custo  = m.custoUnitario || prod.custoMedio || 0;
    var estAnt = prod.estoqueAtual || 0;
    var novoProd;

    if (tipo === 'entrada') {
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
    };

    var novosProd = state.produtos.map(function(x){return x.id===novoProd.id?novoProd:x;});
    var novosMovs = (state.movEstoque||[]).concat([mov]);
    var novasContas = state.contas;

    if (tipo==='entrada' && m.gerarDespesa && custo>0) {
      var fornObj = (state.fornecedores||[]).find(function(f){return f.id===prod.fornecedor_id;});
      var desp = {
        id:uid(), profile:state.profile,
        descricao:'Compra: '+prod.nome+' ('+formatQtd(qtd,prod.unidade)+')',
        valor:custo*qtd, vencimento:m.data||today(),
        tipo:'pagar', status:'pendente', categoria:'Estoque/Insumos',
        prioridade:'normal', fornecedor:fornObj?fornObj.nome:'',
        mov_estoque_id:mov.id, criadoEm:today(),
      };
      novasContas = state.contas.concat([desp]);
      logAudit('gerou despesa por compra de estoque', prod.nome+' — '+fmtMoney(desp.valor));
    }

    var tipoLabel = tipo==='entrada'?'entrada':tipo==='saida'?'saída':'ajuste';
    logAudit(tipoLabel+' de estoque', prod.nome+' '+formatQtd(qtd,prod.unidade));
    setState({produtos:novosProd, movEstoque:novosMovs, contas:novasContas, movModal:null});
    scheduleSave();
    showToast(tipo==='entrada'?'Entrada registrada!':tipo==='saida'?'Saída registrada!':'Estoque ajustado!','success');
    if (novoProd.estoqueMinimo>0 && novoProd.estoqueAtual<=novoProd.estoqueMinimo) {
      setTimeout(function(){showToast('⚠️ '+prod.nome+': estoque abaixo do mínimo!','error',4000);},600);
    }
  }

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({movModal:null});}},
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
          tipo!=='saida' ? el('div',{class:'form-group'},[el('label',{class:'form-label'},'Custo unitário (R$)'),custoInp]) : null,
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Data'),dataInp]),
          el('div',{class:'form-group'},[el('label',{class:'form-label'},'Motivo'),motivoSel]),
          el('div',{style:{gridColumn:'1/-1'}},
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Observação'),obsInp])),
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
    el('div',{class:'kpi-card gold' },[el('div',{class:'kpi-label'},'Produtos ativos'),   el('div',{class:'kpi-value gold'},  String(prods.length)),      el('div',{class:'kpi-sub'},cats+' categorias')]),
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

    return el('div',{class:'card',style:{padding:'14px'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}},[
        el('div',{},[
          el('div',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)'}},p.nome),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},p.categoria+' · '+p.unidade),
        ]),
        el('div',{style:{textAlign:'right'}},[
          el('div',{style:{fontSize:'11px',fontWeight:'700',color:cor}},lbl),
          margem ? el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},'Margem: '+margem) : null,
        ].filter(Boolean)),
      ]),
      el('div',{style:{marginBottom:'10px'}},[
        el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--text3)',marginBottom:'3px'}},[
          el('span',{},'Estoque atual'),
          el('span',{style:{fontWeight:'700',color:cor}},formatQtd(p.estoqueAtual,p.unidade)),
        ]),
        p.estoqueMinimo>0 ? el('div',{style:{height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}},[
          el('div',{style:{height:'100%',width:pct+'%',background:cor,borderRadius:'3px'}}),
        ]) : null,
        p.estoqueMinimo>0 ? el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},'Mínimo: '+formatQtd(p.estoqueMinimo,p.unidade)) : null,
      ].filter(Boolean)),
      el('div',{style:{display:'flex',gap:'12px',fontSize:'12px',color:'var(--text3)',marginBottom:'10px',flexWrap:'wrap'}},[
        el('span',{},'Custo médio: '),el('strong',{style:{color:'var(--text)'}},fmtMoney(p.custoMedio||0)),
        p.precoVenda>0 ? el('span',{},'  Venda: ') : null,
        p.precoVenda>0 ? el('strong',{style:{color:'var(--green)'}},fmtMoney(p.precoVenda)) : null,
        el('span',{},'  Total: '),el('strong',{style:{color:'var(--gold)'}},fmtMoney(vlTotal)),
      ].filter(Boolean)),
      el('div',{style:{display:'flex',gap:'6px'}},[
        el('button',{class:'btn-secondary',style:{flex:'1',fontSize:'12px',padding:'6px'},onclick:function(){
          setState({movModal:{tipo:'entrada',produto_id:p.id,custoUnitario:p.custoMedio||0,data:today()}});
        }},'📥 Entrada'),
        el('button',{class:'btn-ghost',style:{flex:'1',fontSize:'12px',padding:'6px',color:'var(--danger)'},onclick:function(){
          setState({movModal:{tipo:'saida',produto_id:p.id,data:today()}});
        }},'📤 Saída'),
        el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'6px'},onclick:function(){
          setState({produtoModal:JSON.parse(JSON.stringify(p))});
        }},'✏️'),
        el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'6px',color:'var(--danger)'},onclick:function(){
          if(!confirm('Inativar "'+p.nome+'"? Movimentações são mantidas.'))return;
          var np=state.produtos.map(function(x){return x.id===p.id?Object.assign({},x,{ativo:false}):x;});
          logAudit('inativou produto',p.nome);
          setState({produtos:np});scheduleSave();showToast('Produto inativado','info');
        }},'🗑️'),
      ]),
    ].filter(Boolean));
  }

  var content = prods.length===0
    ? el('div',{class:'card'},[el('div',{class:'empty'},[
        el('div',{class:'empty-icon'},'📦'),
        el('div',{class:'empty-title'},'Nenhum produto cadastrado'),
        el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Cadastre produtos e insumos para controlar o estoque e calcular o CMV'),
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
    ? [el('tr',{},[el('td',{colspan:'7',style:{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:'12px'}},'Nenhuma movimentação neste mês')])]
    : movsMes.map(function(m){
        var ts = tsMap[m.tipo]||tsMap.ajuste;
        return el('tr',{style:{borderBottom:'1px solid var(--border)'}},[
          el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text3)',whiteSpace:'nowrap'}},m.data||'—'),
          el('td',{style:{padding:'8px 10px',fontSize:'12px',fontWeight:'600',color:'var(--text)'}},m.produtoNome||'—'),
          el('td',{style:{padding:'8px 10px'}},[
            el('span',{style:{background:ts.bg,color:ts.cor,padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:'700'}},ts.lbl),
          ]),
          el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text2)',textAlign:'right'}},String(m.quantidade||0)),
          el('td',{style:{padding:'8px 10px',fontSize:'12px',color:'var(--text2)',textAlign:'right'}},fmtMoney(m.custoUnitario||0)),
          el('td',{style:{padding:'8px 10px',fontSize:'13px',fontWeight:'700',color:ts.cor,textAlign:'right'}},fmtMoney((m.custoUnitario||0)*(m.quantidade||0))),
          el('td',{style:{padding:'8px 10px',fontSize:'11px',color:'var(--text3)'}},m.motivo||'—'),
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
  var saidasMes = estMovs().filter(function(m){return m.tipo==='saida'&&m.data&&m.data.startsWith(anoMes);});
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
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Receita bruta'),   el('div',{class:'kpi-value green'},fmtMoney(recBruta)),     el('div',{class:'kpi-sub'},'do período')]),
    el('div',{class:'kpi-card red'  },[el('div',{class:'kpi-label'},'CMV (custo)'),     el('div',{class:'kpi-value',style:{color:cmvCor}},fmtMoney(cmvReal)),el('div',{class:'kpi-sub'},cmvPct.toFixed(1)+'% da receita')]),
    el('div',{class:'kpi-card gold' },[el('div',{class:'kpi-label'},'Margem bruta'),    el('div',{class:'kpi-value',style:{color:margemBruta>=0?'var(--green)':'var(--danger)'}},fmtMoney(margemBruta)),el('div',{class:'kpi-sub'},margemPct.toFixed(1)+'%')]),
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
  var rankEl = rankCMV.length===0
    ? el('div',{class:'card',style:{padding:'24px',textAlign:'center',color:'var(--text3)',fontSize:'12px'}},'Registre saídas de estoque para ver o CMV por produto.')
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
    kpis, gauge, histEl, rankEl,
  ]);
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
    ? el('div',{class:'card',style:{padding:'24px',textAlign:'center',color:'var(--text3)',fontSize:'12px'}},'Registre saídas de estoque para gerar a Curva ABC.')
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

// ── RENDER PRINCIPAL ──────────────────────────────────────────────────────────

function renderEstoque() {
  var tab      = state.estTab || 'produtos';
  var prods    = estProdutos();
  var criticos = prods.filter(function(p){return p.estoqueMinimo>0&&p.estoqueAtual>0&&p.estoqueAtual<=p.estoqueMinimo;}).length;
  var zerados  = prods.filter(function(p){return p.estoqueAtual<=0&&p.estoqueMinimo>0;}).length;
  var badge    = criticos+zerados;

  var TABS = [
    {id:'produtos',label:'📦 Produtos',    badge:badge>0?String(badge):null},
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

  var acoes = [];
  if (tab==='produtos') {
    acoes.push(btn('btn-ghost','🔧 Ajuste',function(){setState({movModal:{tipo:'ajuste',data:today()}});}));
    acoes.push(btn('btn-secondary','📥 Entrada',function(){setState({movModal:{tipo:'entrada',data:today()}});}));
    acoes.push(btn('btn-primary','+ Produto',function(){setState({produtoModal:{}});}));
  }
  if (tab==='movs') {
    acoes.push(btn('btn-secondary','📥 Entrada',function(){setState({movModal:{tipo:'entrada',data:today()}});}));
    acoes.push(btn('btn-ghost','📤 Saída',function(){setState({movModal:{tipo:'saida',data:today()}});}));
  }

  var content =
    tab==='produtos' ? renderEstProdutos() :
    tab==='movs'     ? renderEstMovs()     :
    tab==='cmv'      ? renderEstCMV()      :
                       renderEstABC();

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'📦 Estoque & CMV'),
        el('p',{class:'page-sub'},prods.length+' produtos ativos · Valor: '+fmtMoney(calcValorEstoque())),
      ]),
      acoes.length ? el('div',{style:{display:'flex',gap:'6px',flexWrap:'wrap'}},acoes) : null,
    ].filter(Boolean)),
    tabNav,
    content,
    state.produtoModal!==null ? renderProdutoModal() : null,
    state.movModal!==null     ? renderMovModal()     : null,
  ].filter(Boolean));
}
