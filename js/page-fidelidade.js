// ── PROGRAMA DE FIDELIDADE — Artt Burger ────────────────────────────────────

var _fidTab          = 'clientes';
var _fidBusca        = '';
var _fidClienteModal = null;
var _fidCarimboModal = null;
var _fidLogModal     = null;

var FID_TIERS = [
  {id:'bronze',   label:'Bronze',   min:0,   max:29,  cor:'#b87333', bg:'rgba(184,115,51,.12)',  emoji:'🥉'},
  {id:'prata',    label:'Prata',    min:30,  max:59,  cor:'#8a9ba8', bg:'rgba(138,155,168,.12)', emoji:'🥈'},
  {id:'ouro',     label:'Ouro',     min:60,  max:99,  cor:'#e6b800', bg:'rgba(230,184,0,.12)',   emoji:'🥇'},
  {id:'diamante', label:'Diamante', min:100, max:1e9, cor:'#00bcd4', bg:'rgba(0,188,212,.12)',   emoji:'💎'},
];

function _fidTier(total) {
  for (var i = FID_TIERS.length - 1; i >= 0; i--) {
    if (total >= FID_TIERS[i].min) return FID_TIERS[i];
  }
  return FID_TIERS[0];
}

function _fidCfg() {
  return Object.assign({
    nomePrograma: 'Artt Fãs',
    carimbosParaRecompensar: 10,
    descricaoRecompensa: 'Hamburguer grátis',
    ativo: true,
    cashbackAtivo: false,
    cashbackPorcentagem: 5,
    cashbackMinResgate: 5
  }, state.fidelidadeConfig || {});
}

function _fidSave(patch) {
  setState(patch);
  if (patch.clientes !== undefined) lsSet('clientes', patch.clientes);
  if (patch.fidelidadeLog      !== undefined) lsSet('fidelidadeLog',      patch.fidelidadeLog);
  if (patch.fidelidadeConfig   !== undefined) lsSet('fidelidadeConfig',   patch.fidelidadeConfig);
  scheduleSave();
}

function _fidFmt(v) { return 'R$ ' + (v||0).toFixed(2).replace('.',','); }

function _validarCPF(cpf) {
  var n = (cpf||'').replace(/\D/g,'');
  if (n.length !== 11) return false;
  // Rejeita sequências repetidas (000...000, 111...111, etc.)
  if (/^(\d)\1{10}$/.test(n)) return false;
  // Primeiro dígito verificador
  var s = 0;
  for (var i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i);
  var r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(n[9])) return false;
  // Segundo dígito verificador
  s = 0;
  for (var j = 0; j < 10; j++) s += parseInt(n[j]) * (11 - j);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(n[10]);
}

function renderFidelidade() {
  if (!document.getElementById('fid-styles')) {
    var s = document.createElement('style');
    s.id = 'fid-styles';
    s.textContent = [
      '.fid-wrap{padding:24px;max-width:1100px;margin:0 auto;}',
      '.fid-hero{border-radius:16px;padding:28px 32px;margin-bottom:24px;',
        'background:linear-gradient(135deg,#1a1006 0%,#2d1f00 50%,#1a1006 100%);',
        'border:1px solid #e6b80033;position:relative;overflow:hidden;}',
      '.fid-hero::before{content:"";position:absolute;inset:0;',
        'background:radial-gradient(ellipse at 70% 50%,rgba(230,184,0,.08) 0%,transparent 60%);pointer-events:none;}',
      '.fid-hero-title{font-size:22px;font-weight:700;color:#e6b800;letter-spacing:.5px;}',
      '.fid-hero-sub{font-size:13px;color:rgba(255,255,255,.5);margin-top:3px;}',
      '.fid-hero-stats{display:flex;gap:16px;flex-wrap:wrap;margin-top:20px;}',
      '.fid-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);',
        'border-radius:10px;padding:12px 18px;text-align:center;min-width:80px;}',
      '.fid-stat-n{font-size:22px;font-weight:700;color:#e6b800;}',
      '.fid-stat-n.green{color:#00c853;}',
      '.fid-stat-l{font-size:10px;color:rgba(255,255,255,.45);margin-top:2px;}',
      '.fid-tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--border);}',
      '.fid-tab{padding:9px 18px;border:none;background:none;cursor:pointer;',
        'font-size:13px;font-weight:500;color:var(--text3);border-bottom:2px solid transparent;',
        'margin-bottom:-2px;transition:color .15s,border-color .15s;}',
      '.fid-tab.active{color:var(--gold);border-bottom-color:var(--gold);}',
      '.fid-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:18px;flex-wrap:wrap;}',
      '.fid-search{flex:1;min-width:180px;padding:8px 12px;border-radius:8px;',
        'border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;}',
      '.fid-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;}',
      '.fid-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;',
        'padding:18px;transition:box-shadow .2s,border-color .2s;position:relative;overflow:hidden;}',
      '.fid-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.15);border-color:var(--gold);}',
      '.fid-card-top{display:flex;align-items:center;gap:12px;margin-bottom:12px;}',
      '.fid-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;',
        'justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;}',
      '.fid-tier-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;',
        'display:inline-block;letter-spacing:.3px;margin-top:3px;}',
      '.fid-cashback-pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;',
        'font-weight:700;padding:3px 8px;border-radius:20px;background:rgba(0,200,83,.15);',
        'color:#00c853;margin-top:4px;margin-left:4px;}',
      '.fid-stamps{margin:10px 0;display:flex;flex-direction:column;gap:5px;}',
      '.fid-stamp-row{display:flex;gap:4px;flex-wrap:wrap;}',
      '.fid-stamp{width:24px;height:24px;border-radius:50%;border:2px solid;display:flex;',
        'align-items:center;justify-content:center;font-size:10px;transition:transform .1s;flex-shrink:0;}',
      '.fid-stamp.filled{transform:scale(1.05);}',
      '.fid-stamp-info{font-size:11px;color:var(--text3);}',
      '.fid-card-actions{display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;}',
      '.fid-btn-stamp{flex:1;min-width:120px;padding:7px;border-radius:8px;border:none;cursor:pointer;',
        'font-size:12px;font-weight:600;background:var(--gold);color:#1a1006;transition:opacity .15s;}',
      '.fid-btn-stamp:hover{opacity:.85;}',
      '.fid-btn-resgate{flex:1;min-width:120px;padding:7px;border-radius:8px;border:none;cursor:pointer;',
        'font-size:12px;font-weight:600;background:var(--green);color:#fff;transition:opacity .15s;}',
      '.fid-btn-resgate:hover{opacity:.85;}',
      '.fid-btn-cashback{padding:7px 10px;border-radius:8px;border:1.5px solid #00c853;',
        'cursor:pointer;font-size:12px;font-weight:600;background:rgba(0,200,83,.1);color:#00c853;transition:background .15s;}',
      '.fid-btn-cashback:hover{background:rgba(0,200,83,.2);}',
      '.fid-btn-hist{padding:7px 10px;border-radius:8px;border:1px solid var(--border);',
        'cursor:pointer;font-size:12px;background:var(--bg3);color:var(--text2);transition:background .15s;}',
      '.fid-btn-hist:hover{background:var(--border);}',
      '.fid-complete-banner{background:linear-gradient(90deg,var(--green),#00c853);',
        'border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;color:#fff;',
        'margin-bottom:8px;text-align:center;animation:fid-pulse 1.5s ease-in-out infinite;}',
      '.fid-cashback-banner{background:linear-gradient(90deg,#00796b,#00bfa5);',
        'border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;color:#fff;',
        'margin-bottom:8px;text-align:center;cursor:pointer;}',
      '.fid-cashback-banner:hover{opacity:.9;}',
      '@keyframes fid-pulse{0%,100%{opacity:1;}50%{opacity:.75;}}',
      '.fid-rank-podium{display:flex;align-items:flex-end;justify-content:center;gap:12px;margin-bottom:28px;padding:24px 0 0;}',
      '.fid-podium-col{display:flex;flex-direction:column;align-items:center;gap:8px;}',
      '.fid-podium-avatar{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;}',
      '.fid-podium-block{border-radius:8px 8px 0 0;width:90px;display:flex;align-items:center;justify-content:center;font-size:22px;}',
      '.fid-rank-list{background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;}',
      '.fid-rank-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .1s;}',
      '.fid-rank-row:last-child{border-bottom:none;}',
      '.fid-rank-row:hover{background:var(--bg3);}',
      '.fid-rank-pos{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}',
      '.fid-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;}',
      '.fid-modal{background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:24px;width:100%;max-width:440px;max-height:88vh;overflow-y:auto;}',
      '.fid-modal h3{font-size:16px;font-weight:700;margin-bottom:18px;color:var(--gold);}',
      '.fid-field{margin-bottom:14px;}',
      '.fid-field label{display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px;}',
      '.fid-input{width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;box-sizing:border-box;}',
      '.fid-input:focus{outline:none;border-color:var(--gold);}',
      '.fid-cashback-preview{border-radius:10px;padding:12px 16px;margin:4px 0 10px;',
        'background:rgba(0,200,83,.1);border:1px solid rgba(0,200,83,.3);',
        'font-size:14px;font-weight:700;color:#00c853;text-align:center;}',
      '.fid-modal-btns{display:flex;gap:10px;margin-top:20px;}',
      '.fid-log-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);}',
      '.fid-log-item:last-child{border-bottom:none;}',
      '.fid-log-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}',
      '.fid-empty{text-align:center;padding:48px 20px;color:var(--text3);font-size:14px;}',
      '.fid-prog-bar{height:5px;background:var(--border);border-radius:3px;margin-top:5px;overflow:hidden;}',
      '.fid-prog-fill{height:100%;border-radius:3px;transition:width .3s;}',
      '.fid-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;',
        'color:var(--text3);margin:20px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border);}',
      '.fid-toggle-row{display:flex;align-items:center;gap:10px;padding:10px 0;}',
    ].join('');
    document.head.appendChild(s);
  }

  var cfg    = _fidCfg();
  var perfil = state.profile;
  var todos  = (state.clientes||[]).filter(function(c){ return c.profile===perfil; });
  var log    = (state.fidelidadeLog||[]).filter(function(l){ return l.profile===perfil; });

  var stampsTotal  = todos.reduce(function(s,c){ return s+(c.carimbosTotal||0); }, 0);
  var cartoesTotal = todos.reduce(function(s,c){ return s+(c.cartoesResgatados||0); }, 0);
  var prontos      = todos.filter(function(c){ return (c.carimbosAtuais||0)>=cfg.carimbosParaRecompensar; }).length;
  var cashbackTotal= todos.reduce(function(s,c){ return s+(c.cashbackTotal||0); }, 0);
  var cashbackDisp = todos.reduce(function(s,c){ return s+(c.cashbackSaldo||0); }, 0);

  var wrap = el('div',{class:'fid-wrap'});

  // ── HERO ──
  var hero = el('div',{class:'fid-hero'});
  var heroLeft = el('div',{});
  heroLeft.appendChild(el('div',{class:'fid-hero-title'},'⭐ '+cfg.nomePrograma));
  var subParts = [cfg.ativo?'🟢 Programa ativo':'🔴 Programa inativo'];
  if (cfg.cashbackAtivo) subParts.push('💰 Cashback '+cfg.cashbackPorcentagem+'% ativo');
  heroLeft.appendChild(el('div',{class:'fid-hero-sub'},subParts.join('  •  ')));
  var stats = el('div',{class:'fid-hero-stats'});
  function _stat(n,l,green){
    var d=el('div',{class:'fid-stat'});
    var nEl=el('div',{class:'fid-stat-n'+(green?' green':'')},String(n));
    d.appendChild(nEl);
    d.appendChild(el('div',{class:'fid-stat-l'},l));
    return d;
  }
  stats.appendChild(_stat(todos.length,'Clientes'));
  stats.appendChild(_stat(stampsTotal,'Carimbos dados'));
  stats.appendChild(_stat(cartoesTotal,'Recompensas resgatadas'));
  stats.appendChild(_stat(prontos,'Prontos p/ resgatar'));
  if (cfg.cashbackAtivo) {
    stats.appendChild(_stat(_fidFmt(cashbackTotal),'Cashback distribuído',true));
    stats.appendChild(_stat(_fidFmt(cashbackDisp),'Saldo disponível',true));
  }
  heroLeft.appendChild(stats);
  hero.appendChild(heroLeft);
  wrap.appendChild(hero);

  // ── TABS ──
  var tabBar = el('div',{class:'fid-tabs'});
  [['clientes','👥 Clientes'],['ranking','🏆 Ranking'],['config','⚙️ Configurações']].forEach(function(t){
    var b=el('button',{class:'fid-tab'+(_fidTab===t[0]?' active':'')});
    b.textContent=t[1];
    b.onclick=function(){ _fidTab=t[0]; setState({}); };
    tabBar.appendChild(b);
  });
  wrap.appendChild(tabBar);

  if (_fidTab==='clientes') wrap.appendChild(_fidTabClientes(todos,cfg,log));
  if (_fidTab==='ranking')  wrap.appendChild(_fidTabRanking(todos,cfg));
  if (_fidTab==='config')   wrap.appendChild(_fidTabConfig(cfg));

  if (_fidClienteModal!==null) wrap.appendChild(_fidModalCliente(_fidClienteModal));
  if (_fidCarimboModal!==null) wrap.appendChild(_fidModalCarimbo(_fidCarimboModal,todos,cfg));
  if (_fidLogModal!==null)     wrap.appendChild(_fidModalLog(_fidLogModal,todos,log,cfg));

  return wrap;
}

// ── TAB: CLIENTES ─────────────────────────────────────────────────────────────
function _fidTabClientes(todos,cfg,log) {
  var frag=document.createDocumentFragment();
  var tb=el('div',{class:'fid-toolbar'});
  var inp=el('input',{class:'fid-search',type:'text',placeholder:'🔍 Buscar cliente...',value:_fidBusca});
  inp.oninput=function(){ _fidBusca=this.value; setState({}); };
  tb.appendChild(inp);
  var novoBtn=el('button',{class:'btn-primary',style:{fontSize:'13px',padding:'8px 16px'}});
  novoBtn.textContent='+ Novo cliente';
  novoBtn.onclick=function(){ _fidClienteModal={id:null,nome:'',telefone:'',cpf:'',nascimento:'',obs:''}; setState({}); };
  tb.appendChild(novoBtn);
  frag.appendChild(tb);

  var visivel=todos.slice().sort(function(a,b){ return (b.carimbosTotal||0)-(a.carimbosTotal||0); });
  if (_fidBusca.trim()) {
    var q=_fidBusca.toLowerCase();
    visivel=visivel.filter(function(c){ return (c.nome||'').toLowerCase().includes(q)||(c.telefone||'').includes(q)||(c.cpf||'').replace(/\D/g,'').includes(q.replace(/\D/g,'')); });
  }
  if (!visivel.length) {
    var emp=el('div',{class:'fid-empty'});
    emp.textContent=todos.length?'Nenhum cliente encontrado.':'Nenhum cliente cadastrado ainda.\nAdicione o primeiro! 🎉';
    frag.appendChild(emp);
    return frag;
  }
  var grid=el('div',{class:'fid-grid'});
  visivel.forEach(function(c){ grid.appendChild(_fidCard(c,cfg)); });
  frag.appendChild(grid);
  return frag;
}

function _fidCard(c,cfg) {
  var tier   =_fidTier(c.carimbosTotal||0);
  var atual  =c.carimbosAtuais||0;
  var total  =cfg.carimbosParaRecompensar;
  var pronto =atual>=total;
  var saldo  =c.cashbackSaldo||0;
  var temCash=cfg.cashbackAtivo&&saldo>=cfg.cashbackMinResgate;
  var initials=(c.nome||'?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();

  var card=el('div',{class:'fid-card'});
  var stripe=el('div',{});
  stripe.style.cssText='position:absolute;top:0;left:0;right:0;height:3px;background:'+tier.cor+';border-radius:12px 12px 0 0;';
  card.appendChild(stripe);

  if (pronto) {
    var banner=el('div',{class:'fid-complete-banner'});
    banner.textContent='🎉 Cartão completo! Resgatar recompensa';
    card.appendChild(banner);
  }
  if (temCash) {
    var cBanner=el('div',{class:'fid-cashback-banner'});
    cBanner.textContent='💰 Cashback disponível: '+_fidFmt(saldo)+' — clique para usar';
    cBanner.onclick=function(){ _fidLogModal=c.id; setState({}); };
    card.appendChild(cBanner);
  }

  var top=el('div',{class:'fid-card-top'});
  var av=el('div',{class:'fid-avatar'});
  av.style.background=tier.cor;
  av.textContent=initials;
  top.appendChild(av);

  var info=el('div',{style:{flex:'1',minWidth:0}});
  var nomeEl=el('div',{style:{fontWeight:'700',fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}});
  nomeEl.textContent=c.nome;
  info.appendChild(nomeEl);
  if (c.telefone) {
    var telEl=el('div',{style:{fontSize:'12px',color:'var(--text3)',marginTop:'2px'}});
    telEl.textContent='📱 '+c.telefone;
    info.appendChild(telEl);
  }
  if (c.cpf) {
    var cpfEl=el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'1px'}});
    cpfEl.textContent='🪪 CPF: '+c.cpf;
    info.appendChild(cpfEl);
  }
  var badgeRow=el('div',{style:{display:'flex',alignItems:'center',flexWrap:'wrap',gap:'2px',marginTop:'3px'}});
  var badge=el('span',{class:'fid-tier-badge'});
  badge.textContent=tier.emoji+' '+tier.label;
  badge.style.cssText+='background:'+tier.bg+';color:'+tier.cor+';';
  badgeRow.appendChild(badge);
  if (cfg.cashbackAtivo&&saldo>0) {
    var pill=el('span',{class:'fid-cashback-pill'});
    pill.textContent='💰 '+_fidFmt(saldo);
    badgeRow.appendChild(pill);
  }
  info.appendChild(badgeRow);
  top.appendChild(info);

  var editB=el('button',{style:{background:'none',border:'none',cursor:'pointer',fontSize:'16px',opacity:'.5',padding:'4px',flexShrink:'0'}});
  editB.textContent='✏️';
  editB.onclick=function(){ _fidClienteModal=Object.assign({},c); setState({}); };
  top.appendChild(editB);
  card.appendChild(top);

  // stamps
  var stampsWrap=el('div',{class:'fid-stamps'});
  var row=el('div',{class:'fid-stamp-row'});
  for (var i=0;i<total;i++) {
    var filled=i<atual;
    var stamp=el('div',{class:'fid-stamp'+(filled?' filled':'')});
    stamp.style.borderColor=filled?tier.cor:'var(--border)';
    stamp.style.background=filled?tier.bg:'transparent';
    stamp.textContent=filled?'⭐':'';
    row.appendChild(stamp);
  }
  stampsWrap.appendChild(row);
  var pct=Math.min(100,Math.round(atual/total*100));
  var progInfo=el('div',{class:'fid-stamp-info'});
  progInfo.textContent=atual+' / '+total+' carimbos ('+pct+'%)  •  Total: '+(c.carimbosTotal||0)+'  •  Resgates: '+(c.cartoesResgatados||0);
  stampsWrap.appendChild(progInfo);
  var bar=el('div',{class:'fid-prog-bar'});
  var fill=el('div',{class:'fid-prog-fill'});
  fill.style.width=pct+'%';
  fill.style.background=tier.cor;
  bar.appendChild(fill);
  stampsWrap.appendChild(bar);
  card.appendChild(stampsWrap);

  // actions
  var actions=el('div',{class:'fid-card-actions'});
  if (pronto) {
    var rBtn=el('button',{class:'fid-btn-resgate'});
    rBtn.textContent='🎁 Resgatar recompensa';
    rBtn.onclick=function(){ _fidLogModal=c.id; setState({}); };
    actions.appendChild(rBtn);
  } else {
    var sBtn=el('button',{class:'fid-btn-stamp'});
    sBtn.textContent='⭐ Adicionar carimbo';
    sBtn.onclick=function(){ _fidCarimboModal=c.id; setState({}); };
    actions.appendChild(sBtn);
  }
  if (cfg.cashbackAtivo&&saldo>=cfg.cashbackMinResgate) {
    var cbBtn=el('button',{class:'fid-btn-cashback'});
    cbBtn.textContent='💰 Cashback';
    cbBtn.onclick=function(){ _fidLogModal=c.id; setState({}); };
    actions.appendChild(cbBtn);
  }
  var hBtn=el('button',{class:'fid-btn-hist'});
  hBtn.textContent='📋';
  hBtn.title='Histórico';
  hBtn.onclick=function(){ _fidLogModal=c.id; setState({}); };
  actions.appendChild(hBtn);
  card.appendChild(actions);
  return card;
}

// ── TAB: RANKING ──────────────────────────────────────────────────────────────
function _fidTabRanking(todos,cfg) {
  var wrap=document.createDocumentFragment();
  var sorted=todos.slice().sort(function(a,b){ return (b.carimbosTotal||0)-(a.carimbosTotal||0); });
  if (!sorted.length) {
    var emp=el('div',{class:'fid-empty'}); emp.textContent='Nenhum cliente ainda.';
    wrap.appendChild(emp); return wrap;
  }
  var podiumData=sorted.slice(0,3);
  var ORDER=[1,0,2],HEIGHTS=['90px','120px','70px'],SIZES=['40px','52px','36px'],NUMS=['🥈','🥇','🥉'];
  var podium=el('div',{class:'fid-rank-podium'});
  ORDER.forEach(function(idx){
    if (!podiumData[idx]) return;
    var c=podiumData[idx];
    var tier=_fidTier(c.carimbosTotal||0);
    var initials=(c.nome||'?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
    var col=el('div',{class:'fid-podium-col'});
    col.appendChild(el('div',{style:{fontSize:'20px',textAlign:'center'}},NUMS[idx]));
    var av=el('div',{class:'fid-podium-avatar',style:{width:SIZES[idx],height:SIZES[idx],fontSize:idx===0?'18px':'14px',background:tier.cor}});
    av.textContent=initials; col.appendChild(av);
    var nm=el('div',{style:{fontSize:'12px',fontWeight:'600',textAlign:'center',maxWidth:'90px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}});
    nm.textContent=c.nome; col.appendChild(nm);
    var pts=el('div',{style:{fontSize:'11px',color:tier.cor,fontWeight:'700',textAlign:'center'}});
    pts.textContent=(c.carimbosTotal||0)+' carimbos'; col.appendChild(pts);
    if (cfg.cashbackAtivo&&(c.cashbackTotal||0)>0) {
      var cb=el('div',{style:{fontSize:'10px',color:'#00c853',textAlign:'center'}});
      cb.textContent='💰 '+_fidFmt(c.cashbackTotal||0); col.appendChild(cb);
    }
    var block=el('div',{class:'fid-podium-block',style:{height:HEIGHTS[idx],background:tier.cor+'33',border:'2px solid '+tier.cor}});
    block.textContent='#'+(idx+1); col.appendChild(block);
    podium.appendChild(col);
  });
  wrap.appendChild(podium);
  var list=el('div',{class:'fid-rank-list'});
  sorted.forEach(function(c,i){
    var tier=_fidTier(c.carimbosTotal||0);
    var initials=(c.nome||'?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
    var row=el('div',{class:'fid-rank-row'});
    var pos=el('div',{class:'fid-rank-pos'});
    pos.style.background=i<3?tier.cor:'var(--bg3)';
    pos.style.color=i<3?'#fff':'var(--text2)';
    pos.textContent=String(i+1); row.appendChild(pos);
    var av=el('div',{style:{width:'34px',height:'34px',borderRadius:'50%',background:tier.cor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',color:'#fff',flexShrink:'0'}});
    av.textContent=initials; row.appendChild(av);
    var inf=el('div',{style:{flex:'1',minWidth:0}});
    var nm=el('div',{style:{fontWeight:'600',fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}});
    nm.textContent=c.nome; inf.appendChild(nm);
    var sub=el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}});
    var subTxt=tier.emoji+' '+tier.label+'  •  '+(c.cartoesResgatados||0)+' resgates';
    if (cfg.cashbackAtivo) subTxt+='  •  💰 '+_fidFmt(c.cashbackTotal||0);
    sub.textContent=subTxt; inf.appendChild(sub);
    row.appendChild(inf);
    var pts=el('div',{style:{textAlign:'right',flexShrink:'0'}});
    var ptsN=el('div',{style:{fontWeight:'700',fontSize:'15px',color:tier.cor}});
    ptsN.textContent=(c.carimbosTotal||0); pts.appendChild(ptsN);
    pts.appendChild(el('div',{style:{fontSize:'10px',color:'var(--text3)'}},'carimbos'));
    if (cfg.cashbackAtivo&&(c.cashbackSaldo||0)>0) {
      var sldEl=el('div',{style:{fontSize:'10px',color:'#00c853',fontWeight:'600'}});
      sldEl.textContent='saldo '+_fidFmt(c.cashbackSaldo||0); pts.appendChild(sldEl);
    }
    row.appendChild(pts);
    list.appendChild(row);
  });
  wrap.appendChild(list);
  return wrap;
}

// ── TAB: CONFIG ───────────────────────────────────────────────────────────────
function _fidTabConfig(cfg) {
  var wrap=el('div',{style:{maxWidth:'520px'}});
  var card=el('div',{style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px'}});
  var tmpCfg=Object.assign({},cfg);

  function _field(label,inputEl){
    var f=el('div',{class:'fid-field'});
    f.appendChild(el('label',{},label));
    f.appendChild(inputEl);
    return f;
  }
  function _ck(checked,label,onChange){
    var row=el('div',{class:'fid-toggle-row'});
    var ck=el('input',{type:'checkbox'});
    ck.checked=!!checked;
    ck.style.cssText='width:16px;height:16px;accent-color:var(--gold);cursor:pointer;';
    ck.onchange=onChange;
    var lbl=el('label',{style:{fontSize:'13px',fontWeight:'500',cursor:'pointer'}});
    lbl.textContent=label;
    lbl.onclick=function(){ck.click();};
    row.appendChild(ck); row.appendChild(lbl);
    return row;
  }

  // ── Programa
  card.appendChild(el('div',{class:'fid-section-title'},'Programa'));
  var inpNome=el('input',{class:'fid-input',type:'text',value:tmpCfg.nomePrograma||''});
  inpNome.oninput=function(){tmpCfg.nomePrograma=this.value;};
  card.appendChild(_field('Nome do programa',inpNome));
  var inpQtd=el('input',{class:'fid-input',type:'number',min:'1',max:'50',value:String(tmpCfg.carimbosParaRecompensar||10)});
  inpQtd.oninput=function(){tmpCfg.carimbosParaRecompensar=parseInt(this.value)||10;};
  card.appendChild(_field('Carimbos para ganhar recompensa',inpQtd));
  var inpRecomp=el('input',{class:'fid-input',type:'text',value:tmpCfg.descricaoRecompensa||''});
  inpRecomp.oninput=function(){tmpCfg.descricaoRecompensa=this.value;};
  card.appendChild(_field('Recompensa (ex: Hamburguer grátis)',inpRecomp));
  card.appendChild(_ck(tmpCfg.ativo,'Programa ativo',function(){tmpCfg.ativo=this.checked;}));

  // ── Cashback
  card.appendChild(el('div',{class:'fid-section-title'},'💰 Cashback'));

  var cashbackDesc=el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'12px',lineHeight:'1.5'}});
  cashbackDesc.textContent='Ao registrar uma compra com valor informado, o sistema calcula automaticamente o cashback e adiciona ao saldo do cliente para uso em compras futuras.';
  card.appendChild(cashbackDesc);

  card.appendChild(_ck(tmpCfg.cashbackAtivo,'Cashback ativo',function(){tmpCfg.cashbackAtivo=this.checked;}));

  var inpPct=el('input',{class:'fid-input',type:'number',min:'1',max:'50',value:String(tmpCfg.cashbackPorcentagem||5)});
  inpPct.oninput=function(){tmpCfg.cashbackPorcentagem=parseFloat(this.value)||5;};
  card.appendChild(_field('Porcentagem de cashback (%)',inpPct));

  var inpMin=el('input',{class:'fid-input',type:'number',min:'0',step:'0.50',value:String(tmpCfg.cashbackMinResgate||5)});
  inpMin.oninput=function(){tmpCfg.cashbackMinResgate=parseFloat(this.value)||5;};
  card.appendChild(_field('Valor mínimo para resgate (R$)',inpMin));

  // exemplo
  var ex=el('div',{style:{padding:'10px 14px',background:'rgba(0,200,83,.08)',border:'1px solid rgba(0,200,83,.2)',borderRadius:'8px',fontSize:'12px',color:'var(--text2)',marginBottom:'4px'}});
  ex.textContent='Exemplo: pedido de R$ 50,00 → cashback de R$ '+(50*(tmpCfg.cashbackPorcentagem||5)/100).toFixed(2).replace('.',',');
  card.appendChild(ex);

  // tiers info
  card.appendChild(el('div',{class:'fid-section-title'},'Níveis de fidelidade'));
  FID_TIERS.forEach(function(t){
    var row=el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'6px 0',borderBottom:'1px solid var(--border)'}});
    var dot=el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:t.cor,flexShrink:'0'}});
    var lbl=el('div',{style:{flex:'1',fontSize:'13px',fontWeight:'600',color:t.cor}});
    lbl.textContent=t.emoji+' '+t.label;
    var range=el('div',{style:{fontSize:'11px',color:'var(--text3)'}});
    range.textContent=t.max>=1e9?t.min+' carimbos +':t.min+' – '+t.max+' carimbos';
    row.appendChild(dot); row.appendChild(lbl); row.appendChild(range);
    card.appendChild(row);
  });

  var saveBtn=el('button',{class:'btn-primary',style:{marginTop:'24px',padding:'10px 24px',fontSize:'13px'}});
  saveBtn.textContent='💾 Salvar configurações';
  saveBtn.onclick=function(){
    _fidSave({fidelidadeConfig:tmpCfg});
    showToast('Configurações salvas!');
  };
  card.appendChild(saveBtn);
  wrap.appendChild(card);
  return wrap;
}

// ── MODAL: NOVO/EDITAR CLIENTE ────────────────────────────────────────────────
function _fidModalCliente(c) {
  var isNew=!c.id;
  var overlay=el('div',{class:'fid-modal-overlay'});
  overlay.onclick=function(e){if(e.target===overlay){_fidClienteModal=null;setState({});}};
  var modal=el('div',{class:'fid-modal'});
  overlay.appendChild(modal);
  modal.appendChild(el('h3',{},isNew?'+ Novo cliente':'✏️ Editar cliente'));

  function field(lbl,inp){
    var f=el('div',{class:'fid-field'});
    f.appendChild(el('label',{},lbl));
    f.appendChild(inp);
    return f;
  }
  var inpNome=el('input',{class:'fid-input',type:'text',placeholder:'Nome completo',value:c.nome||''});
  inpNome.oninput=function(){c.nome=this.value;};
  modal.appendChild(field('Nome *',inpNome));

  var inpTel=el('input',{class:'fid-input',type:'tel',placeholder:'(00) 00000-0000',value:c.telefone||''});
  inpTel.oninput=function(){c.telefone=this.value;};
  modal.appendChild(field('Telefone / WhatsApp *',inpTel));

  var inpCpf=el('input',{class:'fid-input',type:'text',placeholder:'000.000.000-00',maxlength:'14',value:c.cpf||''});
  inpCpf.oninput=function(){
    var v=this.value.replace(/\D/g,'').slice(0,11);
    if(v.length>9) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
    else if(v.length>6) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
    else if(v.length>3) v=v.slice(0,3)+'.'+v.slice(3);
    this.value=v; c.cpf=v;
  };
  modal.appendChild(field('CPF *',inpCpf));

  var inpNasc=el('input',{class:'fid-input',type:'date',value:c.nascimento||''});
  inpNasc.oninput=function(){c.nascimento=this.value;};
  modal.appendChild(field('Data de nascimento *',inpNasc));

  var inpObs=el('textarea',{class:'fid-input',placeholder:'Observações...',rows:'2',style:'resize:vertical;'});
  inpObs.value=c.obs||'';
  inpObs.oninput=function(){c.obs=this.value;};
  modal.appendChild(field('Observações',inpObs));

  var btns=el('div',{class:'fid-modal-btns'});
  if (!isNew) {
    var delBtn=el('button',{class:'btn-secondary',style:{color:'var(--danger)',borderColor:'var(--danger)',padding:'9px 14px',fontSize:'13px'}});
    delBtn.textContent='🗑 Excluir';
    delBtn.onclick=function(){
      if (!window.confirm('Excluir cliente "'+c.nome+'" e todo o histórico?')) return;
      var perfil=state.profile;
      var clientes=(state.clientes||[]).filter(function(x){return !(x.id===c.id&&x.profile===perfil);});
      var logs=(state.fidelidadeLog||[]).filter(function(x){return !(x.clienteId===c.id&&x.profile===perfil);});
      _fidClienteModal=null;
      _fidSave({fidelidadeClientes:clientes,fidelidadeLog:logs});
      showToast('Cliente excluído','error');
    };
    btns.appendChild(delBtn);
  }
  var cancelBtn=el('button',{class:'btn-secondary',style:{flex:'1',padding:'9px',fontSize:'13px'}});
  cancelBtn.textContent='Cancelar';
  cancelBtn.onclick=function(){_fidClienteModal=null;setState({});};
  btns.appendChild(cancelBtn);
  var saveBtn=el('button',{class:'btn-primary',style:{flex:'1',padding:'9px',fontSize:'13px'}});
  saveBtn.textContent=isNew?'✅ Cadastrar':'💾 Salvar';
  saveBtn.onclick=function(){
    if (!(c.nome||'').trim()){showToast('Nome é obrigatório','error');return;}
    if (!(c.telefone||'').trim()){showToast('Telefone é obrigatório','error');return;}
    if (!_validarCPF(c.cpf)){showToast('CPF inválido — verifique os dígitos','error');return;}
    if (!(c.nascimento||'').trim()){showToast('Data de nascimento é obrigatória','error');return;}
    var perfil=state.profile;
    var clientes=(state.clientes||[]).slice();
    if (isNew) {
      // CPF duplicado?
      var cpfLimpo=(c.cpf||'').replace(/\D/g,'');
      var jaExiste=clientes.find(function(x){return x.profile===perfil&&(x.cpf||'').replace(/\D/g,'')===cpfLimpo;});
      if(jaExiste){showToast('CPF já cadastrado: '+jaExiste.nome,'error');return;}
      clientes.push({
        id:uid(),profile:perfil,
        nome:c.nome.trim(),telefone:c.telefone||'',cpf:c.cpf||'',nascimento:c.nascimento||'',obs:c.obs||'',
        carimbosTotal:0,carimbosAtuais:0,cartoesResgatados:0,
        cashbackSaldo:0,cashbackTotal:0,cashbackResgatado:0,
        criadoEm:new Date().toISOString()
      });
    } else {
      for (var i=0;i<clientes.length;i++){
        if (clientes[i].id===c.id&&clientes[i].profile===perfil){
          clientes[i]=Object.assign({},clientes[i],{nome:c.nome.trim(),telefone:c.telefone||'',cpf:c.cpf||'',nascimento:c.nascimento||'',obs:c.obs||''});
          break;
        }
      }
    }
    _fidClienteModal=null;
    _fidSave({fidelidadeClientes:clientes});
    showToast(isNew?'Cliente cadastrado!':'Cliente atualizado!');
  };
  btns.appendChild(saveBtn);
  modal.appendChild(btns);
  return overlay;
}

// ── MODAL: ADICIONAR CARIMBO ──────────────────────────────────────────────────
function _fidModalCarimbo(clienteId,todos,cfg) {
  var c=todos.find(function(x){return x.id===clienteId;});
  if (!c){_fidCarimboModal=null;return el('span');}

  var overlay=el('div',{class:'fid-modal-overlay'});
  overlay.onclick=function(e){if(e.target===overlay){_fidCarimboModal=null;setState({});}};
  var modal=el('div',{class:'fid-modal'});
  overlay.appendChild(modal);

  var tier=_fidTier(c.carimbosTotal||0);
  modal.appendChild(el('h3',{},'⭐ Adicionar carimbo — '+c.nome));

  var prevTxt=el('div',{style:{fontSize:'13px',color:'var(--text2)',marginBottom:'12px',textAlign:'center'}});
  prevTxt.textContent='Situação atual: '+(c.carimbosAtuais||0)+' / '+cfg.carimbosParaRecompensar+' carimbos';
  modal.appendChild(prevTxt);

  var tmp={qtd:1,valorPedido:'',obs:''};

  var inpQtd=el('input',{class:'fid-input',type:'number',min:'1',max:'20',value:'1',style:'text-align:center;font-size:20px;font-weight:700;'});
  inpQtd.oninput=function(){tmp.qtd=Math.max(1,parseInt(this.value)||1); _updatePreview();};
  var fQtd=el('div',{class:'fid-field'});
  fQtd.appendChild(el('label',{},'Quantidade de carimbos'));
  fQtd.appendChild(inpQtd);
  modal.appendChild(fQtd);

  // valor do pedido (para cashback)
  var cashbackPreviewEl=null;
  if (cfg.cashbackAtivo) {
    var inpValor=el('input',{class:'fid-input',type:'number',min:'0',step:'0.01',placeholder:'0,00'});
    inpValor.oninput=function(){tmp.valorPedido=parseFloat(this.value)||0; _updatePreview();};
    var fValor=el('div',{class:'fid-field'});
    fValor.appendChild(el('label',{},'Valor do pedido (R$) — para calcular cashback'));
    fValor.appendChild(inpValor);
    modal.appendChild(fValor);

    cashbackPreviewEl=el('div',{class:'fid-cashback-preview',style:{display:'none'}});
    modal.appendChild(cashbackPreviewEl);
  }

  function _updatePreview(){
    if (!cashbackPreviewEl) return;
    var v=parseFloat(tmp.valorPedido)||0;
    if (v>0) {
      var cb=v*(cfg.cashbackPorcentagem||5)/100;
      cashbackPreviewEl.textContent='💰 Cashback gerado: '+_fidFmt(cb);
      cashbackPreviewEl.style.display='';
    } else {
      cashbackPreviewEl.style.display='none';
    }
  }

  var inpObs=el('input',{class:'fid-input',type:'text',placeholder:'Observação (ex: Pedido #123 — opcional)'});
  inpObs.oninput=function(){tmp.obs=this.value;};
  var fObs=el('div',{class:'fid-field'});
  fObs.appendChild(el('label',{},'Observação'));
  fObs.appendChild(inpObs);
  modal.appendChild(fObs);

  var btns=el('div',{class:'fid-modal-btns'});
  var cancelBtn=el('button',{class:'btn-secondary',style:{flex:'1',padding:'9px',fontSize:'13px'}});
  cancelBtn.textContent='Cancelar';
  cancelBtn.onclick=function(){_fidCarimboModal=null;setState({});};
  btns.appendChild(cancelBtn);

  var addBtn=el('button',{class:'btn-primary',style:{flex:'2',padding:'9px',fontSize:'13px'}});
  addBtn.textContent='⭐ Carimbar!';
  addBtn.onclick=function(){
    var qtd=Math.max(1,parseInt(inpQtd.value)||1);
    var valorPedido=parseFloat(tmp.valorPedido)||0;
    var cashbackGerado=cfg.cashbackAtivo&&valorPedido>0?Math.round(valorPedido*(cfg.cashbackPorcentagem||5)/100*100)/100:0;
    var perfil=state.profile;
    var clientes=(state.clientes||[]).slice();
    var logs=(state.fidelidadeLog||[]).slice();
    for (var i=0;i<clientes.length;i++){
      if (clientes[i].id===c.id&&clientes[i].profile===perfil){
        clientes[i]=Object.assign({},clientes[i]);
        clientes[i].carimbosTotal =(clientes[i].carimbosTotal||0)+qtd;
        clientes[i].carimbosAtuais=(clientes[i].carimbosAtuais||0)+qtd;
        clientes[i].ultimoCarimbo =new Date().toISOString();
        if (cashbackGerado>0){
          clientes[i].cashbackSaldo =(clientes[i].cashbackSaldo||0)+cashbackGerado;
          clientes[i].cashbackTotal =(clientes[i].cashbackTotal||0)+cashbackGerado;
        }
        break;
      }
    }
    logs.push({
      id:uid(),clienteId:c.id,clienteNome:c.nome,profile:perfil,
      tipo:'carimbo',quantidade:qtd,
      valorPedido:valorPedido,cashbackGerado:cashbackGerado,
      obs:tmp.obs||'',data:new Date().toISOString()
    });
    _fidCarimboModal=null;
    _fidSave({fidelidadeClientes:clientes,fidelidadeLog:logs});
    var msg=qtd+' carimbo(s) adicionado(s) para '+c.nome+' ⭐';
    if (cashbackGerado>0) msg+=' | Cashback: '+_fidFmt(cashbackGerado);
    showToast(msg);
  };
  btns.appendChild(addBtn);
  modal.appendChild(btns);
  return overlay;
}

// ── MODAL: HISTÓRICO + RESGATE ────────────────────────────────────────────────
function _fidModalLog(clienteId,todos,log,cfg) {
  var c=todos.find(function(x){return x.id===clienteId;});
  if (!c){_fidLogModal=null;return el('span');}

  var overlay=el('div',{class:'fid-modal-overlay'});
  overlay.onclick=function(e){if(e.target===overlay){_fidLogModal=null;setState({});}};
  var modal=el('div',{class:'fid-modal'});
  overlay.appendChild(modal);

  var tier=_fidTier(c.carimbosTotal||0);
  var pronto=(c.carimbosAtuais||0)>=cfg.carimbosParaRecompensar;
  var saldo=c.cashbackSaldo||0;
  var temCash=cfg.cashbackAtivo&&saldo>=cfg.cashbackMinResgate;

  modal.appendChild(el('h3',{},'📋 Histórico — '+c.nome));

  // resumo
  var resumo=el('div',{style:{background:'var(--bg3)',borderRadius:'10px',padding:'12px 16px',marginBottom:'14px',display:'flex',gap:'16px',flexWrap:'wrap',justifyContent:'center'}});
  function _rs(v,l,clr){
    var d=el('div',{style:{textAlign:'center'}});
    d.appendChild(el('div',{style:{fontWeight:'700',fontSize:'18px',color:clr||tier.cor}},String(v)));
    d.appendChild(el('div',{style:{fontSize:'11px',color:'var(--text3)'}},l));
    return d;
  }
  resumo.appendChild(_rs(c.carimbosTotal||0,'Total carimbos'));
  resumo.appendChild(_rs(c.carimbosAtuais||0,'No cartão atual'));
  resumo.appendChild(_rs(c.cartoesResgatados||0,'Resgates'));
  if (cfg.cashbackAtivo){
    resumo.appendChild(_rs(_fidFmt(saldo),'Saldo cashback','#00c853'));
    resumo.appendChild(_rs(_fidFmt(c.cashbackTotal||0),'Total ganho cashback','#00c853'));
  }
  modal.appendChild(resumo);

  // banner resgate carimbo
  if (pronto) {
    var rBanner=el('div',{class:'fid-complete-banner',style:{cursor:'pointer',borderRadius:'8px',padding:'10px',marginBottom:'8px'}});
    rBanner.textContent='🎁 Cartão completo! Clique para resgatar: '+cfg.descricaoRecompensa;
    rBanner.onclick=function(){
      if (!window.confirm('Confirmar resgate de "'+cfg.descricaoRecompensa+'" para '+c.nome+'?')) return;
      var perfil=state.profile;
      var clientes=(state.clientes||[]).slice();
      var logs2=(state.fidelidadeLog||[]).slice();
      for (var i=0;i<clientes.length;i++){
        if (clientes[i].id===c.id&&clientes[i].profile===perfil){
          clientes[i]=Object.assign({},clientes[i]);
          clientes[i].carimbosAtuais=Math.max(0,(clientes[i].carimbosAtuais||0)-cfg.carimbosParaRecompensar);
          clientes[i].cartoesResgatados=(clientes[i].cartoesResgatados||0)+1;
          break;
        }
      }
      logs2.push({id:uid(),clienteId:c.id,clienteNome:c.nome,profile:perfil,
        tipo:'resgate',quantidade:cfg.carimbosParaRecompensar,
        obs:'Resgate: '+cfg.descricaoRecompensa,data:new Date().toISOString()});
      _fidLogModal=null;
      _fidSave({fidelidadeClientes:clientes,fidelidadeLog:logs2});
      showToast('🎉 Recompensa resgatada para '+c.nome+'!');
    };
    modal.appendChild(rBanner);
  }

  // banner resgate cashback
  if (temCash) {
    var cbBanner=el('div',{class:'fid-cashback-banner',style:{borderRadius:'8px',padding:'10px',marginBottom:'8px'}});
    cbBanner.textContent='💰 Cashback disponível: '+_fidFmt(saldo)+' — Clique para usar como desconto';
    cbBanner.onclick=function(){
      var valorUso=parseFloat(window.prompt('Quanto usar do cashback disponível ('+_fidFmt(saldo)+')?',saldo.toFixed(2)));
      if (isNaN(valorUso)||valorUso<=0) return;
      valorUso=Math.min(valorUso,saldo);
      var perfil=state.profile;
      var clientes=(state.clientes||[]).slice();
      var logs2=(state.fidelidadeLog||[]).slice();
      for (var i=0;i<clientes.length;i++){
        if (clientes[i].id===c.id&&clientes[i].profile===perfil){
          clientes[i]=Object.assign({},clientes[i]);
          clientes[i].cashbackSaldo=Math.max(0,(clientes[i].cashbackSaldo||0)-valorUso);
          clientes[i].cashbackResgatado=(clientes[i].cashbackResgatado||0)+valorUso;
          break;
        }
      }
      logs2.push({id:uid(),clienteId:c.id,clienteNome:c.nome,profile:perfil,
        tipo:'cashback-resgate',quantidade:valorUso,valorPedido:0,cashbackGerado:0,
        obs:'Desconto cashback utilizado',data:new Date().toISOString()});
      _fidLogModal=null;
      _fidSave({fidelidadeClientes:clientes,fidelidadeLog:logs2});
      showToast('💰 '+_fidFmt(valorUso)+' de cashback utilizado para '+c.nome+'!');
    };
    modal.appendChild(cbBanner);
  }

  // lista de log
  var cLog=log.filter(function(l){return l.clienteId===c.id;})
              .sort(function(a,b){return b.data.localeCompare(a.data);});
  if (!cLog.length) {
    modal.appendChild(el('div',{style:{textAlign:'center',padding:'24px',color:'var(--text3)',fontSize:'13px'}},'Nenhuma movimentação ainda.'));
  } else {
    var list=el('div',{style:{maxHeight:'260px',overflowY:'auto'}});
    cLog.forEach(function(entry){
      var isStamp  =entry.tipo==='carimbo';
      var isResgate=entry.tipo==='resgate';
      var isCb     =entry.tipo==='cashback-resgate';
      var row=el('div',{class:'fid-log-item'});
      var icon=el('div',{class:'fid-log-icon'});
      icon.style.background=isStamp?'rgba(230,184,0,.15)':isCb?'rgba(0,188,212,.15)':'rgba(0,200,83,.15)';
      icon.textContent=isStamp?'⭐':isCb?'💰':'🎁';
      row.appendChild(icon);
      var info=el('div',{style:{flex:'1',minWidth:0}});
      var desc=el('div',{style:{fontSize:'13px',fontWeight:'600'}});
      if (isStamp) {
        var dTxt='+'+entry.quantidade+' carimbo(s)';
        if (entry.valorPedido>0) dTxt+=' | Pedido: '+_fidFmt(entry.valorPedido);
        if ((entry.cashbackGerado||0)>0) dTxt+=' | 💰 '+_fidFmt(entry.cashbackGerado);
        desc.textContent=dTxt;
      } else if (isCb) {
        desc.textContent='💰 Cashback usado: '+_fidFmt(entry.quantidade);
      } else {
        desc.textContent='🎁 Resgate: '+cfg.descricaoRecompensa;
      }
      info.appendChild(desc);
      if (entry.obs){
        var obs=el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}});
        obs.textContent=entry.obs; info.appendChild(obs);
      }
      var dt=el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}});
      var d=new Date(entry.data);
      dt.textContent=d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      info.appendChild(dt);
      row.appendChild(info);
      list.appendChild(row);
    });
    modal.appendChild(list);
  }

  var closeBtn=el('button',{class:'btn-secondary',style:{width:'100%',marginTop:'16px',padding:'9px',fontSize:'13px'}});
  closeBtn.textContent='Fechar';
  closeBtn.onclick=function(){_fidLogModal=null;setState({});};
  modal.appendChild(closeBtn);
  return overlay;
}
