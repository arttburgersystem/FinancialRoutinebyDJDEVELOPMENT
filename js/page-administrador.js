// ── ADMINISTRADOR & SÓCIOS ───────────────────────────────────────────────────

var _admTab          = 'socios';
var _admFiltroSocio  = '';
var _admFiltroMes    = '';

// ── MAPA DE CORES ────────────────────────────────────────────────────────────
var _admCorMap = {
  'Sócio':'var(--gold)','Sócio-Administrador':'var(--gold)',
  'Administrador':'#5b9bd5','Diretor':'#9b7fe8',
  'Representante Legal':'#4caf7d',
};
var _admRgbMap = {
  'var(--gold)':'201,168,76','#5b9bd5':'91,155,213',
  '#9b7fe8':'155,127,232','#4caf7d':'76,175,130',
};

function _admInitials(nome){
  return (nome||'?').split(' ').filter(Boolean).map(function(n){return n[0];}).slice(0,2).join('').toUpperCase();
}

// ── MODAL CADASTRO ────────────────────────────────────────────────────────────
function renderAdminModal() {
  var modal = state.adminModal;
  if (!modal) return null;
  var isEdit = !!modal.id;

  var CARGOS = ['Sócio','Sócio-Administrador','Administrador','Diretor','Representante Legal','Outro'];

  function g(id) { var e = document.getElementById('adm-'+id); return e ? e.value : ''; }

  function salvar() {
    var nome = g('nome').trim();
    if (!nome) { var _ni=document.getElementById('adm-nome');if(_ni){_ni.style.border='2px solid var(--red)';_ni.addEventListener('input',function(){_ni.style.border='';},{once:true});}showToast('Nome completo é obrigatório','error'); return; }
    var pf = state.profile;
    var novo = {
      id:           modal.id || uid(),
      profile:      pf,
      nome:         nome,
      cpf:          g('cpf').trim(),
      email:        g('email').trim(),
      telefone:     g('tel').trim(),
      cargo:        g('cargo') || 'Sócio',
      participacao: parseFloat(g('part'))||0,
      obs:          g('obs').trim(),
      criadoEm:     modal.criadoEm || new Date().toISOString(),
    };
    var arr = isEdit
      ? (state.administradores||[]).map(function(a){ return a.id===novo.id ? novo : a; })
      : (state.administradores||[]).concat([novo]);
    lsSet('administradores', arr);
    setState({administradores: arr, adminModal: null});
    scheduleSave();
    if(typeof logAudit==='function') logAudit((isEdit?'editou':'cadastrou')+' administrador', novo.nome+' — '+novo.cargo);
    showToast(isEdit ? 'Administrador atualizado!' : 'Administrador cadastrado!');
  }

  function inp(id, type, ph, val) {
    var i = el('input',{class:'form-input',type:type||'text',id:'adm-'+id,placeholder:ph||''});
    i.value = val !== undefined ? String(val) : '';
    return i;
  }

  var cargoOpts = CARGOS.map(function(c){
    var op = el('option',{value:c},c);
    if(c===(modal.cargo||'Sócio')) op.selected = true;
    return op;
  });
  var cargoSel = el('select',{class:'form-input',id:'adm-cargo'}, cargoOpts);

  var obsEl = el('textarea',{class:'form-input',id:'adm-obs',rows:'2',placeholder:'Observações...'});
  obsEl.value = modal.obs||'';

  var mdl = div('modal',[
    div('modal-title',[
      el('span',{},(isEdit?'✏️ Editar':'➕ Cadastrar')+' Administrador / Sócio'),
      el('button',{class:'modal-close',onclick:function(){setState({adminModal:null});}},'✕'),
    ]),
    el('div',{class:'form-row'},[
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'Nome completo *'), inp('nome','text','Nome completo',modal.nome||'')]),
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'CPF / CNPJ'), inp('cpf','text','000.000.000-00',modal.cpf||'')]),
    ]),
    el('div',{class:'form-row'},[
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'E-mail'), inp('email','email','email@empresa.com',modal.email||'')]),
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'Telefone'), inp('tel','text','(00) 00000-0000',modal.telefone||'')]),
    ]),
    el('div',{class:'form-row'},[
      el('div',{class:'form-group'},[el('label',{class:'form-label'},'Cargo / Função'), cargoSel]),
      el('div',{class:'form-group'},[
        el('label',{class:'form-label'},'Participação societária (%)'),
        el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
          inp('part','number','Ex: 50', modal.participacao!=null&&modal.participacao!==0?String(modal.participacao):''),
          el('span',{style:{fontSize:'12px',color:'var(--text3)',flexShrink:'0'}},'%'),
        ]),
      ]),
    ]),
    el('div',{class:'form-group'},[el('label',{class:'form-label'},'Observações'), obsEl]),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({adminModal:null});}),
      btn('btn-primary', isEdit ? '💾 Salvar' : '✅ Cadastrar', salvar),
    ]),
  ]);
  mdl.style.maxWidth = '500px';
  var ov = div('modal-overlay',[mdl]);
  ov.onclick = function(e){if(e.target===ov)setState({adminModal:null});};
  return ov;
}

// ── EXTRAI RETIRADAS DOS LANÇAMENTOS ─────────────────────────────────────────
function _admGetRetiradas(pf, admins) {
  var adminIds = (admins||[]).map(function(a){return a.id;});
  return (state.contas||[]).filter(function(c){
    if(c.profile !== pf || c.tipo !== 'pagar') return false;
    var ehCategoria = !!(c.categoria||'').toLowerCase().match(/retir|adiant|prolabore/);
    var ehAdmin = !!(c.fornecedorId && adminIds.indexOf(c.fornecedorId) !== -1);
    return ehCategoria || ehAdmin;
  }).sort(function(a,b){
    return (b.vencimento||'').localeCompare(a.vencimento||'');
  });
}

// ── ABA: HISTÓRICO DE RETIRADAS ───────────────────────────────────────────────
function renderAdmHistorico(pf, admins) {
  var todasRetiradas = _admGetRetiradas(pf, admins);

  // filtros
  var filtradas = todasRetiradas;
  if(_admFiltroSocio) {
    filtradas = filtradas.filter(function(c){return c.fornecedorId === _admFiltroSocio;});
  }
  if(_admFiltroMes) {
    filtradas = filtradas.filter(function(c){return (c.vencimento||'').startsWith(_admFiltroMes);});
  }

  // KPIs (sem filtro = totais gerais)
  var totalGeral    = todasRetiradas.reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);
  var totalPago     = todasRetiradas.filter(function(c){return c.pago;}).reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);
  var totalPendente = todasRetiradas.filter(function(c){return !c.pago;}).reduce(function(s,c){return s+(c.valor||0);},0);
  var mesAtual      = new Date().toISOString().slice(0,7);
  var totalMes      = todasRetiradas.filter(function(c){return (c.vencimento||'').startsWith(mesAtual);})
                        .reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);

  // meses disponíveis para filtro
  var seenMes = {};
  var meses = [];
  todasRetiradas.forEach(function(c){
    var m = (c.vencimento||'').slice(0,7);
    if(m && !seenMes[m]){seenMes[m]=true;meses.push(m);}
  });
  meses.sort(function(a,b){return b.localeCompare(a);});

  var MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function labelMes(m){ var p=m.split('-'); return MESES_LABEL[parseInt(p[1])-1]+'/'+p[0]; }

  // selects de filtro
  var admFiltroOpts = [el('option',{value:''},'Todos os sócios')].concat(
    admins.map(function(a){
      var op = el('option',{value:a.id},a.nome);
      if(a.id === _admFiltroSocio) op.selected = true;
      return op;
    })
  );
  var selSocio = el('select',{class:'form-input',style:{fontSize:'13px',height:'36px',flex:'1',minWidth:'130px'}}, admFiltroOpts);
  selSocio.onchange = function(){_admFiltroSocio = this.value; setState({});};

  var mesFiltroOpts = [el('option',{value:''},'Todos os meses')].concat(
    meses.map(function(m){
      var op = el('option',{value:m},labelMes(m));
      if(m === _admFiltroMes) op.selected = true;
      return op;
    })
  );
  var selMes = el('select',{class:'form-input',style:{fontSize:'13px',height:'36px',flex:'1',minWidth:'120px'}}, mesFiltroOpts);
  selMes.onchange = function(){_admFiltroMes = this.value; setState({});};

  // mapa de admins para lookup rápido
  var admMap = {};
  admins.forEach(function(a){admMap[a.id]=a;});

  // resumo por sócio (sidebar direita)
  var porSocio = admins.map(function(a){
    var ret = todasRetiradas.filter(function(c){return c.fornecedorId===a.id;});
    return {adm:a, total:ret.reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0), count:ret.length};
  }).filter(function(x){return x.count>0;}).sort(function(a,b){return b.total-a.total;});

  // mensal acumulado para breakdown
  var porMes = {};
  todasRetiradas.forEach(function(c){
    var m = (c.vencimento||'').slice(0,7);
    if(!m) return;
    if(!porMes[m]) porMes[m] = 0;
    porMes[m] += (c.valorPago||c.valor||0);
  });
  var mesesOrdenados = Object.keys(porMes).sort(function(a,b){return b.localeCompare(a);}).slice(0,6);
  var maxMes = mesesOrdenados.reduce(function(mx,m){return Math.max(mx,porMes[m]);},0);

  function linhaRetirada(c) {
    var adm  = admMap[c.fornecedorId];
    var cor  = adm ? (_admCorMap[adm.cargo]||'var(--text3)') : 'var(--text3)';
    var ini  = adm ? _admInitials(adm.nome) : '?';
    var dias = diasRestantes(c.vencimento);
    var valor = c.valorPago||c.valor||0;

    var statusEl;
    if(c.pago){
      statusEl = el('span',{style:{
        fontSize:'10px',fontWeight:'700',borderRadius:'10px',padding:'2px 7px',
        background:'rgba(76,175,130,0.12)',color:'var(--green)',whiteSpace:'nowrap',
      }},'✓ Pago');
    } else if(dias !== null && dias < 0){
      statusEl = el('span',{style:{
        fontSize:'10px',fontWeight:'700',borderRadius:'10px',padding:'2px 7px',
        background:'rgba(224,82,82,0.12)',color:'var(--red)',whiteSpace:'nowrap',
      }},Math.abs(dias)+'d atraso');
    } else {
      statusEl = el('span',{style:{
        fontSize:'10px',fontWeight:'700',borderRadius:'10px',padding:'2px 7px',
        background:'rgba(255,183,77,0.10)',color:'#f59e0b',whiteSpace:'nowrap',
      }},'⏳ Pendente');
    }

    return el('div',{style:{
      display:'flex',alignItems:'center',gap:'12px',
      padding:'11px 16px',borderBottom:'1px solid var(--border)',
    }},[
      el('div',{style:{
        width:'34px',height:'34px',borderRadius:'10px',flexShrink:'0',
        background:'rgba('+(_admRgbMap[cor]||'107,104,102')+',0.10)',
        border:'1.5px solid '+cor,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontWeight:'800',fontSize:'11px',color:cor,
      }},ini),
      el('div',{style:{flex:'1',minWidth:'0'}},[
        el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)',
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
        }},c.descricao||c.categoria||'Retirada'),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px',display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}},[
          adm ? el('span',{style:{color:'var(--text2)'}},adm.nome) : null,
          el('span',{},fmtDate(c.vencimento)),
          c.pago && c.dataPagamento ? el('span',{style:{color:'var(--green)'}},'pago em '+fmtDate(c.dataPagamento)) : null,
        ].filter(Boolean)),
      ]),
      el('div',{style:{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:'0'}},[
        el('div',{style:{fontWeight:'800',fontSize:'14px',color:'var(--red)'}},fmtMoney(valor)),
        statusEl,
      ]),
    ]);
  }

  var temFiltro = !!(_admFiltroSocio || _admFiltroMes);
  var totalFiltrado = filtradas.reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);

  return el('div',{style:{display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'flex-start'}},[

    // ── coluna principal ──────────────────────────────────────────────────────
    el('div',{style:{flex:'1',minWidth:'0'}},[

      // KPIs gerais
      el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:'10px',marginBottom:'16px'}},[
        el('div',{class:'kpi-card red'},[
          el('div',{class:'kpi-label'},'Total retirado'),
          el('div',{class:'kpi-value red'},fmtMoney(totalGeral)),
          el('div',{class:'kpi-sub'},todasRetiradas.length+' lançamento'+(todasRetiradas.length!==1?'s':'')),
        ]),
        el('div',{class:'kpi-card green'},[
          el('div',{class:'kpi-label'},'Confirmado'),
          el('div',{class:'kpi-value green'},fmtMoney(totalPago)),
          el('div',{class:'kpi-sub'},todasRetiradas.filter(function(c){return c.pago;}).length+' pago'+(todasRetiradas.filter(function(c){return c.pago;}).length!==1?'s':'')),
        ]),
        totalPendente > 0 ? el('div',{class:'kpi-card gold'},[
          el('div',{class:'kpi-label'},'Pendente'),
          el('div',{class:'kpi-value gold'},fmtMoney(totalPendente)),
          el('div',{class:'kpi-sub'},todasRetiradas.filter(function(c){return !c.pago;}).length+' a pagar'),
        ]) : null,
        el('div',{class:'kpi-card blue'},[
          el('div',{class:'kpi-label'},'Este mês'),
          el('div',{class:'kpi-value'},fmtMoney(totalMes)),
          el('div',{class:'kpi-sub'},labelMes(mesAtual)),
        ]),
      ].filter(Boolean)),

      // Barra de filtros
      el('div',{class:'card',style:{padding:'10px 14px',marginBottom:'12px'}},[
        el('div',{style:{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}},[
          el('span',{style:{fontSize:'12px',color:'var(--text3)',fontWeight:'600',flexShrink:'0'}},'Filtrar:'),
          selSocio,
          selMes,
          temFiltro ? btn('btn-ghost','✕ Limpar', function(){_admFiltroSocio='';_admFiltroMes='';setState({});}) : null,
        ].filter(Boolean)),
      ]),

      // Lista de retiradas
      filtradas.length === 0
        ? el('div',{class:'card',style:{textAlign:'center',padding:'44px 20px'}},[
            el('div',{style:{fontSize:'40px',marginBottom:'10px'}},'📋'),
            el('p',{style:{color:'var(--text3)',fontSize:'13px'}},
              todasRetiradas.length === 0
                ? 'Nenhuma retirada lançada ainda. Use "💸 Retirada" no card do sócio na aba Sócios.'
                : 'Nenhuma retirada para os filtros selecionados.'
            ),
          ])
        : el('div',{class:'card',style:{padding:'0',overflow:'hidden'}},[
            el('div',{style:{
              padding:'11px 16px',borderBottom:'1px solid var(--border)',
              display:'flex',justifyContent:'space-between',alignItems:'center',
            }},[
              el('span',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)'}},
                filtradas.length+' lançamento'+(filtradas.length!==1?'s':'')+(temFiltro?' (filtrado)':'')),
              el('span',{style:{fontWeight:'700',fontSize:'13px',color:'var(--red)'}},fmtMoney(totalFiltrado)),
            ]),
            el('div',{},filtradas.map(linhaRetirada)),
          ]),

      // Breakdown mensal
      mesesOrdenados.length > 1 ? el('div',{class:'card',style:{padding:'14px 16px',marginTop:'14px'}},[
        el('div',{style:{fontWeight:'700',fontSize:'13px',marginBottom:'12px',color:'var(--text)'}},'📅 Por mês'),
        el('div',{style:{display:'flex',flexDirection:'column',gap:'8px'}},
          mesesOrdenados.map(function(m){
            var pct = maxMes > 0 ? Math.round((porMes[m]/maxMes)*100) : 0;
            var isActive = _admFiltroMes === m;
            return el('div',{
              style:{cursor:'pointer'},
              onclick:function(){_admFiltroMes = isActive ? '' : m; setState({});},
            },[
              el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}},[
                el('span',{style:{color:isActive?'var(--gold)':'var(--text2)',fontWeight:isActive?'700':'500'}},labelMes(m)),
                el('span',{style:{color:'var(--red)',fontWeight:'600'}},fmtMoney(porMes[m])),
              ]),
              el('div',{style:{height:'6px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}},[
                el('div',{style:{
                  height:'100%',width:pct+'%',
                  background:isActive?'var(--gold)':'var(--red)',
                  borderRadius:'3px',transition:'width .3s',
                }}),
              ]),
            ]);
          })
        ),
      ]) : null,
    ]),

    // ── sidebar: resumo por sócio ─────────────────────────────────────────────
    porSocio.length > 0 ? el('div',{style:{width:'210px',flexShrink:'0'}},[
      el('div',{class:'card',style:{padding:'0',overflow:'hidden'}},[
        el('div',{style:{padding:'12px 14px',borderBottom:'1px solid var(--border)'}},[
          el('span',{style:{fontWeight:'700',fontSize:'12px',color:'var(--text)'}},'Por sócio'),
        ]),
        el('div',{},porSocio.map(function(x){
          var cor = _admCorMap[x.adm.cargo]||'var(--text3)';
          var rgb = _admRgbMap[cor]||'107,104,102';
          var isActive = _admFiltroSocio === x.adm.id;
          return el('div',{
            style:{
              padding:'10px 14px',borderBottom:'1px solid var(--border)',
              cursor:'pointer',
              background:isActive?'rgba('+rgb+',0.07)':'',
            },
            onclick:function(){
              _admFiltroSocio = isActive ? '' : x.adm.id;
              setState({});
            },
          },[
            el('div',{style:{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}},[
              el('div',{style:{
                width:'22px',height:'22px',borderRadius:'6px',flexShrink:'0',
                background:'rgba('+rgb+',0.12)',border:'1.5px solid '+cor,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'9px',fontWeight:'800',color:cor,
              }},_admInitials(x.adm.nome)),
              el('span',{style:{
                fontWeight:'600',fontSize:'12px',color:isActive?cor:'var(--text)',
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              }},x.adm.nome),
            ]),
            el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'11px',paddingLeft:'30px'}},[
              el('span',{style:{color:'var(--text3)'}},x.count+' retir.'),
              el('span',{style:{color:'var(--red)',fontWeight:'700'}},fmtMoney(x.total)),
            ]),
          ]);
        })),
        el('div',{style:{padding:'10px 14px',background:'rgba(224,82,82,0.05)',borderTop:'1px solid var(--border)'}},[
          el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'12px'}},[
            el('span',{style:{color:'var(--text3)',fontWeight:'600'}},'TOTAL GERAL'),
            el('span',{style:{color:'var(--red)',fontWeight:'800'}},fmtMoney(totalGeral)),
          ]),
        ]),
      ]),
    ]) : null,

  ].filter(Boolean));
}

// ── ABA: CARDS DOS SÓCIOS ─────────────────────────────────────────────────────
function renderAdmSocios(pf, admins) {
  var mesAtual = new Date().toISOString().slice(0,7);
  var totalParticipacao = admins.reduce(function(s,a){return s+(a.participacao||0);},0);

  var retiradaMes = (state.contas||[]).filter(function(c){
    return c.profile===pf && c.tipo==='pagar'
      && c.vencimento && c.vencimento.startsWith(mesAtual)
      && (c.categoria||'').toLowerCase().match(/retir|adiant|prolabore/);
  }).reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);

  var totalGeral = _admGetRetiradas(pf, admins).reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);

  function adminCard(a) {
    var initials = _admInitials(a.nome);
    var cor = _admCorMap[a.cargo] || 'var(--text3)';
    var rgb = _admRgbMap[cor] || '107,104,102';

    var retiradas = (state.contas||[]).filter(function(c){
      return c.profile===pf && c.fornecedorId===a.id
        && (c.categoria||'').toLowerCase().match(/retir|adiant|prolabore/);
    });
    var totalRetirado = retiradas.reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);
    var ultimaRetirada = retiradas.sort(function(a,b){return (b.vencimento||'').localeCompare(a.vencimento||'');})[0];

    var contatos = [
      a.cpf     ? el('div',{style:{fontSize:'12px',color:'var(--text2)',display:'flex',gap:'6px'}},[el('span',{style:{color:'var(--text3)',width:'80px',flexShrink:'0'}},'CPF/CNPJ:'), el('span',{},a.cpf)]) : null,
      a.email   ? el('div',{style:{fontSize:'12px',color:'var(--text2)',display:'flex',gap:'6px'}},[el('span',{style:{color:'var(--text3)',width:'80px',flexShrink:'0'}},'E-mail:'), el('span',{style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},a.email)]) : null,
      a.telefone? el('div',{style:{fontSize:'12px',color:'var(--text2)',display:'flex',gap:'6px'}},[el('span',{style:{color:'var(--text3)',width:'80px',flexShrink:'0'}},'Telefone:'), el('span',{},a.telefone)]) : null,
    ].filter(Boolean);

    return el('div',{class:'card',style:{padding:'16px 18px'}},[
      el('div',{style:{display:'flex',gap:'14px',alignItems:'flex-start',marginBottom:'14px'}},[
        el('div',{style:{
          width:'52px',height:'52px',borderRadius:'14px',flexShrink:'0',
          background:'rgba('+rgb+',0.12)',border:'2px solid '+cor,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontWeight:'800',fontSize:'18px',color:cor,
        }},initials),
        el('div',{style:{flex:'1',minWidth:'0'}},[
          el('div',{style:{fontWeight:'800',fontSize:'15px',color:'var(--text)',marginBottom:'4px'}},a.nome),
          el('span',{style:{
            display:'inline-block',fontSize:'10px',fontWeight:'700',
            background:'rgba('+rgb+',0.12)',color:cor,
            borderRadius:'20px',padding:'2px 8px',
          }},a.cargo||'Sócio'),
          a.participacao ? el('span',{style:{fontSize:'11px',color:'var(--text3)',marginLeft:'8px'}},a.participacao+'% da sociedade') : null,
        ].filter(Boolean)),
      ]),

      contatos.length ? el('div',{style:{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'12px',paddingLeft:'2px'}},contatos) : null,

      // Resumo financeiro
      el('div',{style:{
        display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',
        marginBottom:'14px',
      }},[
        el('div',{style:{
          background:'rgba(224,82,82,0.06)',border:'1px solid rgba(224,82,82,0.2)',
          borderRadius:'8px',padding:'8px 10px',
        }},[
          el('div',{style:{fontSize:'10px',color:'var(--text3)',marginBottom:'3px'}},'TOTAL RETIRADO'),
          el('div',{style:{fontWeight:'800',fontSize:'14px',color:'var(--red)'}},totalRetirado>0?fmtMoney(totalRetirado):'—'),
        ]),
        el('div',{style:{
          background:'rgba(91,155,213,0.06)',border:'1px solid rgba(91,155,213,0.2)',
          borderRadius:'8px',padding:'8px 10px',
        }},[
          el('div',{style:{fontSize:'10px',color:'var(--text3)',marginBottom:'3px'}},'ÚLTIMA RETIRADA'),
          el('div',{style:{fontWeight:'700',fontSize:'12px',color:'var(--text2)'}},
            ultimaRetirada ? fmtDate(ultimaRetirada.vencimento) : '—'),
        ]),
      ]),

      el('div',{style:{display:'flex',gap:'6px',paddingTop:'12px',borderTop:'1px solid var(--border)'}},[
        btn('btn-primary','💸 Retirada',function(){
          setState({modal:{tipo:'pagar',editItem:{
            descricao:'Retirada de Sócio — '+a.nome,
            categoria:'Retirada de Sócio',
            fornecedor:a.nome,
            fornecedorId:a.id,
          }}});
        }),
        retiradas.length > 0 ? btn('btn-ghost','📋 Histórico',function(){
          _admFiltroSocio = a.id;
          _admFiltroMes   = '';
          _admTab = 'historico';
          setState({});
        }) : null,
        btn('btn-ghost','✏️',function(){setState({adminModal:Object.assign({},a)});}),
        btn('btn-ghost','🗑️',function(){
          if(!confirm('Excluir "'+a.nome+'"?'))return;
          var arr=(state.administradores||[]).filter(function(x){return x.id!==a.id;});
          lsSet('administradores',arr);
          setState({administradores:arr});
          scheduleSave();
          showToast(a.nome+' removido','error');
        }),
      ].filter(Boolean)),
    ].filter(Boolean));
  }

  return el('div',{},[
    // KPIs
    el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',marginBottom:'16px'}},[
      el('div',{class:'kpi-card gold'},[
        el('div',{class:'kpi-label'},'Cadastrados'),
        el('div',{class:'kpi-value gold'},String(admins.length)),
        el('div',{class:'kpi-sub'},admins.length===1?'sócio':'sócios'),
      ]),
      totalParticipacao > 0 ? el('div',{class:'kpi-card blue'},[
        el('div',{class:'kpi-label'},'Participação total'),
        el('div',{class:'kpi-value'},totalParticipacao.toFixed(1)+'%'),
        el('div',{class:'kpi-sub'},totalParticipacao===100?'100% mapeado':'de 100%'),
      ]) : null,
      retiradaMes > 0 ? el('div',{class:'kpi-card red'},[
        el('div',{class:'kpi-label'},'Retiradas este mês'),
        el('div',{class:'kpi-value red'},fmtMoney(retiradaMes)),
        el('div',{class:'kpi-sub'},'mês atual'),
      ]) : null,
      totalGeral > 0 ? el('div',{class:'kpi-card red'},[
        el('div',{class:'kpi-label'},'Total histórico'),
        el('div',{class:'kpi-value red'},fmtMoney(totalGeral)),
        el('div',{class:'kpi-sub'},'todas as retiradas'),
      ]) : null,
    ].filter(Boolean)),

    // Dica
    el('div',{style:{
      background:'rgba(201,168,76,0.08)',border:'1px solid var(--gold)',
      borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',
      fontSize:'12px',color:'var(--text2)',display:'flex',gap:'10px',alignItems:'flex-start',
    }},[
      el('span',{style:{fontSize:'16px',flexShrink:'0'}},'💡'),
      el('p',{},[
        el('b',{},'Como usar: '),
        el('span',{},'clique em "💸 Retirada" para registrar o lançamento preenchido automaticamente. Use "📋 Histórico" para ver todas as retiradas do sócio.'),
      ]),
    ]),

    // Cards
    admins.length === 0
      ? el('div',{class:'card',style:{textAlign:'center',padding:'50px 20px'}},[
          el('div',{style:{fontSize:'54px',marginBottom:'14px'}},'👤'),
          el('h3',{style:{marginBottom:'8px',color:'var(--text)',fontWeight:'700'}},'Nenhum administrador cadastrado'),
          el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'20px'}},'Cadastre sócios e administradores para usar como destinatários em retiradas.'),
          btn('btn-primary','+ Cadastrar agora',function(){setState({adminModal:{cargo:'Sócio'}});}),
        ])
      : el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(310px,1fr))',gap:'14px'}},
          admins.map(adminCard)),
  ].filter(Boolean));
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
function renderAdministrador() {
  var pf     = state.profile;
  var admins = (state.administradores||[]).filter(function(a){return a.profile===pf;});

  var tabs = [
    {id:'socios',   label:'👤 Sócios'},
    {id:'historico',label:'📊 Histórico de Retiradas'},
  ];

  var tabBar = el('div',{style:{
    display:'flex',gap:'4px',
    borderBottom:'2px solid var(--border)',
    marginBottom:'18px',
  }}, tabs.map(function(t){
    var ativo = _admTab === t.id;
    var tabEl = el('button',{style:{
      background:'none',border:'none',cursor:'pointer',
      padding:'8px 16px',fontSize:'13px',fontWeight:ativo?'700':'500',
      color:ativo?'var(--gold)':'var(--text3)',
      borderBottom: ativo?'2px solid var(--gold)':'2px solid transparent',
      marginBottom:'-2px',borderRadius:'0',transition:'color .2s',
    }},t.label);
    tabEl.onclick = function(){_admTab = t.id; setState({});};
    return tabEl;
  }));

  var conteudo = _admTab === 'historico'
    ? renderAdmHistorico(pf, admins)
    : renderAdmSocios(pf, admins);

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'👤 Administrador & Sócios'),
        el('p',{class:'page-sub'},'Cadastro de sócios, retiradas, adiantamentos e pró-labore'),
      ]),
      _admTab === 'socios' ? btn('btn-primary','+ Cadastrar',function(){setState({adminModal:{cargo:'Sócio'}});}) : null,
    ].filter(Boolean)),
    tabBar,
    conteudo,
  ]);
}
