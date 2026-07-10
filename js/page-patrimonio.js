// ── PATRIMÔNIO ────────────────────────────────────────────────────────────────

var PAT_CATS = [
  { id:'equipamento',   label:'Equipamento',            icon:'⚙️',  depTaxa:10, vidaUtil:10,
    subs:['Equipamento de cozinha','Refrigeração','Cocção','Preparo de alimentos','Ventilação / Climatização','Segurança / Câmeras','Balança / Medição','Lavagem / Higiene','Outros equipamentos'] },
  { id:'veiculo',       label:'Veículo',                icon:'🚗',  depTaxa:20, vidaUtil:5,
    subs:['Automóvel','Motocicleta','Caminhão','Van / Utilitário','Bicicleta / Patinete','Outros veículos'] },
  { id:'imovel',        label:'Imóvel',                 icon:'🏢',  depTaxa:4,  vidaUtil:25,
    subs:['Sala comercial','Loja / Ponto comercial','Galpão / Depósito','Terreno','Apartamento','Casa','Outros imóveis'] },
  { id:'movel',         label:'Móvel / Utensílio',      icon:'🪑',  depTaxa:10, vidaUtil:10,
    subs:['Mesa / Bancada','Cadeira / Banqueta','Balcão / Vitrine','Armário / Prateleira','Utensílio de cozinha','Decoração / Arte','Uniforme / EPI','Outros móveis'] },
  { id:'tecnologia',    label:'Tecnologia / TI',        icon:'💻',  depTaxa:20, vidaUtil:5,
    subs:['Computador / Notebook','Tablet / iPad','Celular / Smartphone','Impressora / Scanner','Monitor / TV','Sistema / Software','Leitor de cartão / PDV','Câmera / CFTV','Outros TI'] },
  { id:'investimento',  label:'Investimento Financeiro', icon:'📈',  depTaxa:0,  vidaUtil:0,
    subs:['CDB','LCI / LCA','Poupança','Tesouro Direto','Ações','FII — Fundo Imobiliário','Debêntures','Fundo de investimento','Outros investimentos'] },
  { id:'intangivel',    label:'Ativo Intangível',       icon:'💡',  depTaxa:10, vidaUtil:10,
    subs:['Marca / Logo / Patente','Licença de software','Ponto comercial (luvas)','Franquia','Site / Domínio','Outros intangíveis'] },
  { id:'outro',         label:'Outro',                  icon:'📦',  depTaxa:10, vidaUtil:10, subs:['Outro'] },
];

var PAT_STATUS   = ['Ativo','Em manutenção','Emprestado','Baixado','Vendido','Sinistrado'];
var PAT_COND     = ['Novo','Ótimo','Bom','Regular','Ruim','Obsoleto'];
var PAT_FORMAS   = ['À vista','Parcelado','Financiado / Leasing','Doação','Permuta / Troca','Outra'];
var PAT_DEP_MET  = ['Linear (quotas fixas)','Acelerado (Soma dos dígitos)','Unidades produzidas'];
var PAT_INDEXAD  = ['CDI','IPCA','SELIC','IGP-M','Prefixado','Poupança','Outro'];
var PAT_LIQUIDEZ = ['D+0 (imediato)','D+1','D+30','D+90','No vencimento','Ilíquido'];

// ── helpers ───────────────────────────────────────────────────────────────────

function _patCat(id){ return PAT_CATS.find(function(c){return c.id===id;})||PAT_CATS[PAT_CATS.length-1]; }

function _patProxCodigo(){
  var bens=state.patrimonios||[];
  if(!bens.length) return 'PAT-0001';
  var nums=bens.map(function(b){
    var m=(b.codigo||'').match(/(\d+)$/);
    return m?parseInt(m[1]):0;
  });
  var next=Math.max.apply(null,nums)+1;
  return 'PAT-'+String(next).padStart(4,'0');
}

function _patDepreciacao(bem){
  if(!bem.dataAquisicao||!bem.valorAquisicao||!bem.taxaDepreciacao) return null;
  var dtAq=new Date(bem.dataAquisicao+'T12:00:00');
  var hoje=new Date();
  var anosDecorridos=(hoje-dtAq)/(1000*60*60*24*365.25);
  if(anosDecorridos<0) return null;
  var taxa=(parseFloat(bem.taxaDepreciacao)||0)/100;
  var vAq=parseFloat(bem.valorAquisicao)||0;
  var vRes=parseFloat(bem.valorResidual)||0;
  var depBase=vAq-vRes;
  var depAcum=Math.min(depBase, depBase*taxa*anosDecorridos);
  var vAtual=Math.max(vRes, vAq-depAcum);
  return { depAcum: depAcum, valorAtual: vAtual, anosDecorridos: anosDecorridos };
}

// ── modal ─────────────────────────────────────────────────────────────────────

function renderPatrimonioModal(){
  var m=state.patrimonioModal;
  if(!m) return null;
  var isEdit=!!m.id;
  var catObj=_patCat(m.categoria||'equipamento');
  var isInv=m.categoria==='investimento';

  function gv(id){ var e=document.getElementById('pat-'+id); return e?e.value.trim():''; }
  function gvn(id){ return parseFloat(gv(id))||0; }

  function snapFields(){
    var r={};
    ['nome','codigo','categoria','subcategoria','marca','modelo','serie','cor','descricao',
     'dataAquisicao','valorAquisicao','fornecedor','notaFiscal','chaveNFe','formaPagamento',
     'garantiaMeses','garantiaVencimento','seguro','apolice','seguradora','valorSegurado','seguroVencimento',
     'local','responsavel','centroCusto','endereco',
     'vidaUtil','taxaDepreciacao','valorResidual','metodoDepreciacao',
     'status','condicao','dataBaixa','motivoBaixa','valorVenda',
     'ultimaManutencao','proximaManutencao','respManutencao','obsManutencao',
     'tipoInvest','instituicao','taxaInvest','indexador','vencimentoInvest','valorAtualInvest','liquidez',
     'obs'
    ].forEach(function(f){ r[f]=gv(f); });
    // checkboxes
    var seg=document.getElementById('pat-seguro');
    r.seguro=seg?seg.checked:false;
    return r;
  }

  function salvar(){
    var snap=snapFields();
    if(!snap.nome){showToast('Informe o nome do bem','error');return;}
    var item=Object.assign({},m,snap,{
      id: m.id||('pat_'+Date.now()),
      profile: state.profile,
      _salvoEm: new Date().toISOString(),
    });
    var lista=isEdit
      ?(state.patrimonios||[]).map(function(x){return x.id===item.id?item:x;})
      :(state.patrimonios||[]).concat([item]);
    lsSet('patrimonios',lista);
    setState({patrimonios:lista, patrimonioModal:null});
    scheduleSave();
    if(typeof logAudit==='function') logAudit(isEdit?'editou patrimônio':'cadastrou patrimônio', item.nome+(item.codigo?' ('+item.codigo+')':''));
    showToast(isEdit?'Bem atualizado!':'Bem cadastrado!','success');
  }

  // Calcula depreciação em tempo real ao digitar
  function atualizarDep(){
    var snap=snapFields();
    var dep=_patDepreciacao(snap);
    var elD=document.getElementById('pat-dep-calc');
    if(!elD) return;
    if(!dep){ elD.textContent='—'; return; }
    elD.textContent='Valor atual: '+fmtMoney(dep.valorAtual)+' · Dep. acumulada: '+fmtMoney(dep.depAcum)+' · '+dep.anosDecorridos.toFixed(1)+' anos de uso';
  }

  // helpers de campo
  function inp(id, type, ph, val, opts){
    var i=el('input',Object.assign({class:'form-input',type:type||'text',id:'pat-'+id,placeholder:ph||''},opts||{}));
    i.value=val!==undefined&&val!==null?String(val):'';
    if(id==='taxaDepreciacao'||id==='valorAquisicao'||id==='valorResidual'||id==='dataAquisicao') i.oninput=atualizarDep;
    return i;
  }
  function sel(id, opts, val){
    var s=el('select',{class:'form-input',id:'pat-'+id});
    opts.forEach(function(o){
      var opt=el('option',{value:o},o);
      if(o===(val||'')) opt.selected=true;
      s.appendChild(opt);
    });
    return s;
  }
  function ta(id, ph, val){
    var t=el('textarea',{class:'form-input',id:'pat-'+id,placeholder:ph||'',rows:'2',style:'resize:vertical;min-height:60px;'});
    t.value=val||'';
    return t;
  }
  function fg(lbl,inp2,hint){ return div('form-group',[el('label',{class:'form-label'},lbl),inp2,hint?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}},hint):null].filter(Boolean)); }
  function g2(a,b){ var g=el('div',{},[a,b]); g.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;'; return g; }
  function g3(a,b,c){ var g=el('div',{},[a,b,c]); g.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;'; return g; }
  function sec(titulo){ var d2=el('div',{}); d2.style.cssText='font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:20px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border);'; d2.textContent=titulo; return d2; }

  // Dep calc display
  var depCalc=el('div',{id:'pat-dep-calc',style:{fontSize:'12px',color:'var(--green)',marginTop:'6px',fontWeight:'500'}});
  depCalc.textContent='—';

  // Seletor de categoria
  var catSel=el('select',{class:'form-input',id:'pat-categoria'});
  PAT_CATS.forEach(function(c){
    var opt=el('option',{value:c.id},c.icon+' '+c.label);
    if(c.id===(m.categoria||'equipamento')) opt.selected=true;
    catSel.appendChild(opt);
  });
  catSel.onchange=function(){
    var nCat=_patCat(this.value);
    // atualiza subcategorias
    var subEl=document.getElementById('pat-subcategoria');
    if(subEl){ subEl.innerHTML=''; nCat.subs.forEach(function(s){var o=document.createElement('option');o.value=o.textContent=s;subEl.appendChild(o);});}
    // atualiza taxa e vida útil padrão
    var txEl=document.getElementById('pat-taxaDepreciacao');
    var vuEl=document.getElementById('pat-vidaUtil');
    if(txEl&&!txEl.value) txEl.value=nCat.depTaxa||'';
    if(vuEl&&!vuEl.value) vuEl.value=nCat.vidaUtil||'';
    atualizarDep();
  };

  var subSel=el('select',{class:'form-input',id:'pat-subcategoria'});
  catObj.subs.forEach(function(s){
    var opt=el('option',{value:s},s);
    if(s===(m.subcategoria||'')) opt.selected=true;
    subSel.appendChild(opt);
  });

  // Seção de seguro (toggle)
  var segChk=el('input',{type:'checkbox',id:'pat-seguro',style:'width:18px;height:18px;cursor:pointer;'});
  if(m.seguro) segChk.checked=true;
  var segFields=el('div',{id:'pat-seg-fields',style:{display:m.seguro?'block':'none'}});
  segFields.appendChild(g2(fg('Número da apólice',inp('apolice','text','Nº apólice',m.apolice||'')),fg('Seguradora',inp('seguradora','text','Nome da seguradora',m.seguradora||''))));
  segFields.appendChild(g2(fg('Valor segurado',inp('valorSegurado','number','R$ 0,00',m.valorSegurado||'')),fg('Vencimento do seguro',inp('seguroVencimento','date','',m.seguroVencimento||''))));
  segChk.onchange=function(){segFields.style.display=this.checked?'block':'none';};

  // Seção específica para investimentos
  var invSection=el('div',{id:'pat-inv-section',style:{display:isInv?'block':'none'}});
  invSection.appendChild(sec('Detalhes do Investimento'));
  invSection.appendChild(g2(
    fg('Tipo de investimento',sel('tipoInvest',['','CDB','LCI','LCA','Poupança','Tesouro Direto','Ações','FII','Debêntures','Fundo','Outro'],m.tipoInvest||'')),
    fg('Instituição financeira',inp('instituicao','text','Banco / Corretora',m.instituicao||''))
  ));
  invSection.appendChild(g3(
    fg('Taxa (% a.a.)',inp('taxaInvest','number','Ex: 12,5',m.taxaInvest||''),'% ao ano'),
    fg('Indexador',sel('indexador',[''].concat(PAT_INDEXAD),m.indexador||'')),
    fg('Liquidez',sel('liquidez',[''].concat(PAT_LIQUIDEZ),m.liquidez||''))
  ));
  invSection.appendChild(g2(
    fg('Vencimento',inp('vencimentoInvest','date','',m.vencimentoInvest||'')),
    fg('Valor atual estimado',inp('valorAtualInvest','number','R$ 0,00',m.valorAtualInvest||''))
  ));

  // Seção de depreciação (oculta para investimentos)
  var depSection=el('div',{id:'pat-dep-section',style:{display:isInv?'none':'block'}});
  depSection.appendChild(sec('Depreciação Contábil'));
  depSection.appendChild(el('div',{style:{background:'var(--gold-dim)',border:'1px solid var(--gold)',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',fontSize:'12px',color:'var(--gold)'}},
    '💡 Depreciação calculada automaticamente pela lei fiscal brasileira (RIR/2018). Confirme com seu contador.'
  ));
  depSection.appendChild(g3(
    fg('Vida útil (anos)',inp('vidaUtil','number','Anos',m.vidaUtil||String(catObj.vidaUtil||10))),
    fg('Taxa de dep. (% a.a.)',inp('taxaDepreciacao','number','%',m.taxaDepreciacao||String(catObj.depTaxa||10))),
    fg('Valor residual (R$)',inp('valorResidual','number','0,00',m.valorResidual||'0'))
  ));
  depSection.appendChild(fg('Método de depreciação',sel('metodoDepreciacao',[''].concat(PAT_DEP_MET),m.metodoDepreciacao||'Linear (quotas fixas)')));
  depSection.appendChild(el('div',{style:{marginTop:'6px'}},depCalc));

  // Atualiza seções ao mudar categoria
  catSel.onchange=(function(origOnchange){return function(){
    origOnchange.call(this);
    var inv2=this.value==='investimento';
    var invS=document.getElementById('pat-inv-section');
    var depS=document.getElementById('pat-dep-section');
    if(invS) invS.style.display=inv2?'block':'none';
    if(depS) depS.style.display=inv2?'none':'block';
  };})(catSel.onchange);

  var conteudo=el('div',{style:{padding:'0 4px'}});

  conteudo.appendChild(sec('Identificação'));
  conteudo.appendChild(g2(fg('Nome do bem *',inp('nome','text','Ex: Fogão industrial 6 bocas',m.nome||'')),fg('Código patrimonial',inp('codigo','text','PAT-0001',m.codigo||(!isEdit?_patProxCodigo():'')),'Gerado automaticamente — você pode personalizar')));
  conteudo.appendChild(g2(fg('Categoria',catSel),fg('Subcategoria',subSel)));
  conteudo.appendChild(g3(fg('Marca',inp('marca','text','Ex: Tramontina',m.marca||'')),fg('Modelo',inp('modelo','text','Ex: 030401/212',m.modelo||'')),fg('Número de série',inp('serie','text','S/N',m.serie||''))));
  conteudo.appendChild(g2(fg('Cor / Característica física',inp('cor','text','Ex: Aço inox',m.cor||'')),fg('Condição atual',sel('condicao',[''].concat(PAT_COND),m.condicao||''))));
  conteudo.appendChild(fg('Descrição detalhada',ta('descricao','Características, observações sobre o bem...',m.descricao||'')));

  conteudo.appendChild(sec('Aquisição'));
  conteudo.appendChild(g3(fg('Data de aquisição',inp('dataAquisicao','date','',m.dataAquisicao||'')),fg('Valor de aquisição (R$)',inp('valorAquisicao','number','0,00',m.valorAquisicao||'')),fg('Forma de pagamento',sel('formaPagamento',[''].concat(PAT_FORMAS),m.formaPagamento||''))));
  conteudo.appendChild(g2(fg('Fornecedor / Vendedor',inp('fornecedor','text','Nome do fornecedor',m.fornecedor||'')),fg('Número da nota fiscal',inp('notaFiscal','text','NF-e',m.notaFiscal||''))));
  conteudo.appendChild(fg('Chave NF-e (44 dígitos)',inp('chaveNFe','text','0000 0000 0000...',m.chaveNFe||'')));

  conteudo.appendChild(sec('Garantia'));
  conteudo.appendChild(g2(fg('Prazo de garantia (meses)',inp('garantiaMeses','number','Ex: 12',m.garantiaMeses||'')),fg('Vencimento da garantia',inp('garantiaVencimento','date','',m.garantiaVencimento||''))));

  conteudo.appendChild(sec('Seguro'));
  conteudo.appendChild(el('div',{style:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}},[
    segChk,
    el('label',{for:'pat-seguro',style:{fontSize:'13px',color:'var(--text)',cursor:'pointer',fontWeight:'500'}},'Este bem possui seguro'),
  ]));
  conteudo.appendChild(segFields);

  conteudo.appendChild(sec('Localização e Responsável'));
  conteudo.appendChild(g2(fg('Local / Setor',inp('local','text','Ex: Cozinha, Escritório, Depósito',m.local||'')),fg('Responsável pelo bem',inp('responsavel','text','Nome do responsável',m.responsavel||''))));
  conteudo.appendChild(g2(fg('Centro de custo',inp('centroCusto','text','Ex: Produção, Administrativo',m.centroCusto||'')),fg('Endereço (para imóveis)',inp('endereco','text','Rua, nº, cidade...',m.endereco||''))));

  conteudo.appendChild(invSection);
  conteudo.appendChild(depSection);

  conteudo.appendChild(sec('Status'));
  conteudo.appendChild(g2(fg('Status do bem',sel('status',[''].concat(PAT_STATUS),m.status||'Ativo')),fg('Data de baixa / saída',inp('dataBaixa','date','',m.dataBaixa||''))));
  conteudo.appendChild(g2(fg('Motivo de baixa / saída',inp('motivoBaixa','text','Ex: Venda, descarte, sinistro',m.motivoBaixa||'')),fg('Valor de venda (se vendido)',inp('valorVenda','number','R$ 0,00',m.valorVenda||''))));

  conteudo.appendChild(sec('Manutenção'));
  conteudo.appendChild(g2(fg('Última manutenção',inp('ultimaManutencao','date','',m.ultimaManutencao||'')),fg('Próxima manutenção',inp('proximaManutencao','date','',m.proximaManutencao||''))));
  conteudo.appendChild(fg('Responsável pela manutenção',inp('respManutencao','text','Técnico / empresa',m.respManutencao||'')));
  conteudo.appendChild(fg('Histórico de manutenções',ta('obsManutencao','Datas, serviços realizados, valores pagos...',m.obsManutencao||'')));

  conteudo.appendChild(sec('Observações Gerais'));
  conteudo.appendChild(fg('Observações',ta('obs','Qualquer informação adicional relevante...',m.obs||'')));

  // Calcula dep inicial
  setTimeout(atualizarDep, 50);

  var ov=el('div',{class:'modal-overlay',onclick:function(e){if(e.target===ov)setState({patrimonioModal:null});}});
  var modal=el('div',{class:'modal',style:{maxWidth:'700px',width:'100%',maxHeight:'90vh',overflowY:'auto'}});
  var header=el('div',{class:'modal-header'},[
    el('h3',{class:'modal-title'},(isEdit?'Editar':'Cadastrar')+' bem patrimonial'),
    el('button',{class:'modal-close',onclick:function(){setState({patrimonioModal:null});}}, '✕'),
  ]);
  var footer=el('div',{class:'modal-actions'},[
    el('button',{class:'btn-ghost',onclick:function(){setState({patrimonioModal:null});}}, 'Cancelar'),
    el('button',{class:'btn-primary',onclick:salvar}, isEdit?'💾 Salvar alterações':'➕ Cadastrar bem'),
  ]);
  modal.appendChild(header);modal.appendChild(conteudo);modal.appendChild(footer);
  ov.appendChild(modal);
  return ov;
}

// ── confirmação de exclusão ────────────────────────────────────────────────────

function renderPatrimonioDelModal(){
  var m=state.patrimonioDelModal;
  if(!m) return null;
  var ov=el('div',{class:'modal-overlay',onclick:function(e){if(e.target===ov)setState({patrimonioDelModal:null});}});
  var modal=el('div',{class:'modal',style:{maxWidth:'400px'}});
  modal.appendChild(el('div',{class:'modal-header'},[el('h3',{class:'modal-title'},'Excluir bem'),el('button',{class:'modal-close',onclick:function(){setState({patrimonioDelModal:null});}},'✕')]));
  var body=el('div',{style:{padding:'16px 0'}});
  body.appendChild(el('p',{style:{color:'var(--text)',marginBottom:'8px'}},'Excluir o bem patrimonial abaixo?'));
  body.appendChild(el('p',{style:{fontWeight:'700',color:'var(--red)',marginBottom:'4px'}},m.nome));
  body.appendChild(el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Código: '+(m.codigo||'—')));
  modal.appendChild(body);
  modal.appendChild(el('div',{class:'modal-actions'},[
    el('button',{class:'btn-ghost',onclick:function(){setState({patrimonioDelModal:null});}},'Cancelar'),
    el('button',{class:'btn-primary',style:{background:'var(--red)',borderColor:'var(--red)'},onclick:function(){
      var lista=(state.patrimonios||[]).filter(function(x){return x.id!==m.id;});
      lsSet('patrimonios',lista);setState({patrimonios:lista,patrimonioDelModal:null});
      scheduleSave();showToast('Bem excluído','error');
      if(typeof logAudit==='function') logAudit('excluiu patrimônio',m.nome);
    }},'🗑 Excluir'),
  ]));
  ov.appendChild(modal);
  return ov;
}

// ── render principal ───────────────────────────────────────────────────────────

function renderPatrimonio(){
  var pf=state.profile;
  var todos=(state.patrimonios||[]).filter(function(b){return b.profile===pf;});
  var filtCat=state.patFiltCat||'';
  var filtStatus=state.patFiltStatus||'';
  var busca=(state.patBusca||'').toLowerCase();

  var lista=todos.filter(function(b){
    if(filtCat&&b.categoria!==filtCat) return false;
    if(filtStatus&&b.status!==filtStatus) return false;
    if(busca){
      var txt=(b.nome+' '+(b.codigo||'')+' '+(b.marca||'')+' '+(b.modelo||'')+' '+(b.local||'')).toLowerCase();
      if(txt.indexOf(busca)===-1) return false;
    }
    return true;
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  var ativos=todos.filter(function(b){return b.status==='Ativo'||!b.status;});
  var valorTotal=ativos.reduce(function(s,b){return s+(parseFloat(b.valorAquisicao)||0);},0);
  var valorAtualTotal=ativos.reduce(function(s,b){
    if(b.categoria==='investimento') return s+(parseFloat(b.valorAtualInvest)||parseFloat(b.valorAquisicao)||0);
    var dep=_patDepreciacao(b);
    return s+(dep?dep.valorAtual:(parseFloat(b.valorAquisicao)||0));
  },0);
  var depTotal=valorTotal-valorAtualTotal;
  var qtdManutencao=todos.filter(function(b){return b.status==='Em manutenção';}).length;
  var vencendoGarantia=todos.filter(function(b){
    if(!b.garantiaVencimento) return false;
    var d=new Date(b.garantiaVencimento+'T12:00:00');
    var diff=(d-new Date())/(1000*60*60*24);
    return diff>=0&&diff<=30;
  }).length;

  var kpis=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'14px',marginBottom:'24px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Bens ativos'),el('div',{class:'kpi-value'},String(ativos.length)),el('div',{class:'kpi-sub'},'Total cadastrado: '+todos.length)]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Valor de aquisição'),el('div',{class:'kpi-value gold'},fmtMoney(valorTotal)),el('div',{class:'kpi-sub'},'Custo histórico')]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Valor atual contábil'),el('div',{class:'kpi-value green'},fmtMoney(valorAtualTotal)),el('div',{class:'kpi-sub'},'Após depreciação')]),
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Depreciação acumulada'),el('div',{class:'kpi-value red'},fmtMoney(depTotal)),el('div',{class:'kpi-sub'},'Bens ativos')]),
    ...(qtdManutencao>0?[el('div',{class:'kpi-card gold'},[el('div',{class:'kpi-label'},'Em manutenção'),el('div',{class:'kpi-value gold'},String(qtdManutencao)),el('div',{class:'kpi-sub'},'Aguardando retorno')])]:[] ),
    ...(vencendoGarantia>0?[el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Garantia vencendo'),el('div',{class:'kpi-value red'},String(vencendoGarantia)),el('div',{class:'kpi-sub'},'Em até 30 dias')])]:[] ),
  ]);

  // ── filtros ───────────────────────────────────────────────────────────────────
  var buscaInp=el('input',{class:'form-input',type:'search',placeholder:'Buscar por nome, código, marca...',style:'max-width:280px;'});
  buscaInp.value=state.patBusca||'';
  buscaInp.oninput=function(){setState({patBusca:this.value});};

  var catFiltSel=el('select',{class:'form-input',style:'max-width:200px;'});
  el('option',{value:''},'Todas as categorias').selected=!filtCat;
  catFiltSel.appendChild(el('option',{value:''},'Todas as categorias'));
  PAT_CATS.forEach(function(c){
    var o=el('option',{value:c.id},c.icon+' '+c.label);
    if(c.id===filtCat) o.selected=true;
    catFiltSel.appendChild(o);
  });
  catFiltSel.onchange=function(){setState({patFiltCat:this.value});};

  var statusFiltSel=el('select',{class:'form-input',style:'max-width:160px;'});
  statusFiltSel.appendChild(el('option',{value:''},'Todos os status'));
  PAT_STATUS.forEach(function(s){
    var o=el('option',{value:s},s);
    if(s===filtStatus) o.selected=true;
    statusFiltSel.appendChild(o);
  });
  statusFiltSel.onchange=function(){setState({patFiltStatus:this.value});};

  var filtBar=el('div',{style:{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center',marginBottom:'16px'}},[
    buscaInp,catFiltSel,statusFiltSel,
    lista.length!==todos.length?el('span',{style:{fontSize:'12px',color:'var(--text3)',alignSelf:'center'}},lista.length+' de '+todos.length+' bens'):null,
  ].filter(Boolean));

  // ── tabela ────────────────────────────────────────────────────────────────────
  var STATUS_COR={'Ativo':'var(--green)','Em manutenção':'var(--gold)','Emprestado':'var(--blue)','Baixado':'var(--text3)','Vendido':'var(--text3)','Sinistrado':'var(--red)'};

  var tHead=el('thead',{},[el('tr',{},[
    'Código','Nome do bem','Categoria','Aquisição','Valor hist.','Valor atual','Status','Condição','Ações'
  ].map(function(h,i){
    var th=el('th',{style:'padding:10px 12px;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);text-align:'+(i>=4&&i<=6?'right':'left')+';white-space:nowrap;border-bottom:1px solid var(--border);'});
    th.textContent=h;return th;
  }))]);

  var tBody=el('tbody',{});
  if(lista.length===0){
    var emptyRow=el('tr',{});
    var emptyTd=el('td',{colspan:'9',style:'padding:40px;text-align:center;color:var(--text3);font-size:13px;'});
    emptyTd.textContent=todos.length===0?'Nenhum bem cadastrado. Clique em "+ Cadastrar bem" para começar.':'Nenhum bem encontrado com os filtros aplicados.';
    emptyRow.appendChild(emptyTd);tBody.appendChild(emptyRow);
  } else {
    lista.forEach(function(b){
      var catO=_patCat(b.categoria||'outro');
      var dep=b.categoria==='investimento'?null:_patDepreciacao(b);
      var vAtual=b.categoria==='investimento'
        ?(parseFloat(b.valorAtualInvest)||parseFloat(b.valorAquisicao)||0)
        :(dep?dep.valorAtual:(parseFloat(b.valorAquisicao)||0));
      var vAq=parseFloat(b.valorAquisicao)||0;
      var cor=STATUS_COR[b.status]||'var(--text3)';

      var tr=el('tr',{style:'border-bottom:1px solid var(--border);transition:background .1s;'});
      tr.onmouseenter=function(){this.style.background='var(--bg3)';};
      tr.onmouseleave=function(){this.style.background='';};

      function td(txt,align,extraStyle){
        var d=el('td',{style:'padding:10px 12px;font-size:13px;'+(align?'text-align:'+align+';':'')+(extraStyle||'')});
        d.textContent=txt;return d;
      }

      var codTd=td(b.codigo||'—','left','color:var(--text3);font-size:11px;font-family:monospace;');
      var nomeTd=td('','left');
      var nomeDiv=el('div',{style:'font-weight:600;color:var(--text);'});nomeDiv.textContent=b.nome;
      var subDiv=el('div',{style:'font-size:11px;color:var(--text3);margin-top:1px;'});
      subDiv.textContent=(b.marca?b.marca+' ':'')+(b.modelo||'')+(b.local?' · '+b.local:'');
      nomeTd.appendChild(nomeDiv);if(subDiv.textContent)nomeTd.appendChild(subDiv);

      var catTd=td('','left');
      var catSpan=el('span',{style:'font-size:12px;'});catSpan.textContent=catO.icon+' '+catO.label;
      catTd.appendChild(catSpan);

      var dtTd=td(b.dataAquisicao?fmtDate(b.dataAquisicao):'—','left','font-size:12px;color:var(--text3);');
      var vAqTd=td(vAq>0?fmtMoney(vAq):'—','right','font-variant-numeric:tabular-nums;color:var(--text2);');
      var vAtTd=td('','right');
      var vAtSpan=el('span',{style:'font-weight:700;font-variant-numeric:tabular-nums;color:'+(vAtual<vAq*0.3?'var(--red)':vAtual<vAq*0.7?'var(--gold)':'var(--green)')+';'});
      vAtSpan.textContent=vAtual>0?fmtMoney(vAtual):'—';
      vAtTd.appendChild(vAtSpan);

      var stTd=td('','left');
      var stBadge=el('span',{style:'font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:'+cor+'18;color:'+cor+';'});
      stBadge.textContent=b.status||'Ativo';stTd.appendChild(stBadge);

      var condTd=td(b.condicao||'—','left','font-size:12px;color:var(--text3);');

      var acTd=el('td',{style:'padding:8px 12px;white-space:nowrap;'});
      var editBtn=el('button',{class:'btn-icon edit',title:'Editar',onclick:(function(bem){return function(){setState({patrimonioModal:Object.assign({},bem)});};})(b)},'✏️');
      var delBtn=el('button',{class:'btn-icon',title:'Excluir',style:'color:var(--red);',onclick:(function(bem){return function(){setState({patrimonioDelModal:bem});};})(b)},'🗑');
      acTd.appendChild(editBtn);acTd.appendChild(delBtn);

      [codTd,nomeTd,catTd,dtTd,vAqTd,vAtTd,stTd,condTd,acTd].forEach(function(c){tr.appendChild(c);});
      tBody.appendChild(tr);
    });
  }

  var tabela=el('div',{style:'overflow-x:auto;'},[el('table',{style:'width:100%;border-collapse:collapse;'},[tHead,tBody])]);

  // ── exportar PDF ─────────────────────────────────────────────────────────────
  function exportarPDF(){
    var emp=((state.empresaData||{})[pf])||{};
    var nomeEmp=emp.nomeFantasia||emp.razaoSocial||'Financial Routine';
    var M=function(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};
    var rows=lista.map(function(b){
      var dep=b.categoria==='investimento'?null:_patDepreciacao(b);
      var vAt=b.categoria==='investimento'?(parseFloat(b.valorAtualInvest)||parseFloat(b.valorAquisicao)||0):(dep?dep.valorAtual:(parseFloat(b.valorAquisicao)||0));
      return '<tr>'+
        '<td>'+(b.codigo||'—')+'</td>'+
        '<td><strong>'+b.nome+'</strong>'+(b.marca?' — '+b.marca:'')+'</td>'+
        '<td>'+_patCat(b.categoria||'outro').label+'</td>'+
        '<td>'+(b.dataAquisicao?fmtDate(b.dataAquisicao):'—')+'</td>'+
        '<td class="num">'+M(b.valorAquisicao||0)+'</td>'+
        '<td class="num"><strong>'+M(vAt)+'</strong></td>'+
        '<td>'+(b.status||'Ativo')+'</td>'+
        '<td>'+(b.local||'—')+'</td>'+
      '</tr>';
    }).join('');
    var w=window.open('','_blank','width=900,height=700');
    w.document.write(
      '<html><head><meta charset="UTF-8"><title>Relatório de Patrimônio</title><style>'+
      'body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:900px;margin:0 auto;font-size:12px}'+
      'h1{font-size:20px;font-weight:900;margin:0}'+
      '.sub{font-size:11px;color:#666;margin-bottom:4px}'+
      '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0;padding:12px;background:#f9f9f9;border-radius:8px;border:1px solid #e5e7eb}'+
      '.kpi{text-align:center}.kpi .lbl{font-size:9px;text-transform:uppercase;color:#888;letter-spacing:.5px}.kpi .val{font-size:16px;font-weight:800}'+
      'table{width:100%;border-collapse:collapse;margin-top:12px}'+
      'th{background:#1a1a1a;color:#fff;padding:8px 10px;font-size:10px;text-align:left;letter-spacing:.5px}'+
      'td{padding:7px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;vertical-align:top}'+
      'tr:nth-child(even)td{background:#f9f9f9}'+
      '.num{text-align:right;font-variant-numeric:tabular-nums}'+
      '.rodape{margin-top:16px;font-size:10px;color:#999;text-align:center;border-top:1px dashed #ccc;padding-top:8px}'+
      '@media print{button{display:none}}'+
      '</style></head><body>'+
      '<h1>'+nomeEmp+'</h1>'+
      (emp.cnpj?'<div class="sub">CNPJ: '+emp.cnpj+'</div>':'')+
      '<div class="sub">Relatório de Patrimônio · '+new Date().toLocaleDateString('pt-BR')+'</div>'+
      '<div class="kpis">'+
        '<div class="kpi"><div class="lbl">Bens ativos</div><div class="val">'+ativos.length+'</div></div>'+
        '<div class="kpi"><div class="lbl">Valor histórico</div><div class="val">'+M(valorTotal)+'</div></div>'+
        '<div class="kpi"><div class="lbl">Valor atual</div><div class="val">'+M(valorAtualTotal)+'</div></div>'+
        '<div class="kpi"><div class="lbl">Depreciação</div><div class="val">'+M(depTotal)+'</div></div>'+
      '</div>'+
      '<table><thead><tr><th>Código</th><th>Nome / Marca</th><th>Categoria</th><th>Aquisição</th><th>Vlr. Histórico</th><th>Vlr. Atual</th><th>Status</th><th>Local</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table>'+
      '<div class="rodape">Emitido em '+new Date().toLocaleString('pt-BR')+' · Financial Routine · DJ Development</div>'+
      '<br><button onclick="window.print()" style="padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">🖨 Imprimir / PDF</button>'+
      '</body></html>'
    );
    w.document.close();
  }

  return el('div',{},[
    el('div',{class:'page-header'},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'12px'}},[
        el('div',{},[
          el('h1',{},'🏛️ Patrimônio'),
          el('p',{},'Controle de bens, equipamentos, investimentos e ativos da empresa'),
        ]),
        el('div',{style:{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}},[
          el('button',{class:'btn-ghost',style:{fontSize:'13px'},onclick:exportarPDF},'📄 Exportar PDF'),
          el('button',{class:'btn-primary',style:{display:'flex',alignItems:'center',gap:'6px'},onclick:function(){
            setState({patrimonioModal:{categoria:'equipamento',status:'Ativo',condicao:'Novo',metodoDepreciacao:'Linear (quotas fixas)'}});
          }},'➕ Cadastrar bem'),
        ]),
      ]),
    ]),
    el('div',{class:'card'},[kpis,filtBar,tabela]),
  ]);
}
