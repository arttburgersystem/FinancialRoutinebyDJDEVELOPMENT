// ── CLIENTES ─────────────────────────────────────────────────────────────────

var _cliTab   = 'todos';  // todos | vip | inativos
var _cliBusca = '';
var _cliModal = null;     // null | objeto cliente
var _cliView  = 'grid';   // grid | table

// ── Migração única: fidelidadeClientes → clientes ────────────────────────────
(function _migrateClientes() {
  var fid = lsGet('fidelidadeClientes', []);
  if (!fid.length) return;
  var cur = lsGet('clientes', []);
  var ids = {};
  cur.forEach(function(c) { ids[c.id] = true; });
  var added = false;
  fid.forEach(function(c) {
    if (!ids[c.id]) { cur.push(c); added = true; }
  });
  if (added) lsSet('clientes', cur);
})();

// ── Campos do formulário ─────────────────────────────────────────────────────
var CLI_SEXOS = ['','Masculino','Feminino','Outro'];
var CLI_ESTADOS = ['','AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function _cliSave(patch) {
  setState(patch);
  if (patch.clientes !== undefined) lsSet('clientes', patch.clientes);
  scheduleSave();
}

function _validarCPF_cli(cpf) {
  var n = (cpf||'').replace(/\D/g,'');
  if (n.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(n)) return false;
  var s=0; for(var i=0;i<9;i++) s+=parseInt(n[i])*(10-i);
  var r=(s*10)%11; if(r===10||r===11) r=0;
  if(r!==parseInt(n[9])) return false;
  s=0; for(var j=0;j<10;j++) s+=parseInt(n[j])*(11-j);
  r=(s*10)%11; if(r===10||r===11) r=0;
  return r===parseInt(n[10]);
}

function renderClientes() {
  // ── CSS ──
  if (!document.getElementById('cli-styles')) {
    var s = document.createElement('style'); s.id='cli-styles';
    s.textContent = [
      '.cli-wrap{padding:24px;max-width:1100px;margin:0 auto;}',
      '.cli-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;}',
      '.cli-title{font-size:20px;font-weight:800;flex:1;}',
      '.cli-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;}',
      '.cli-stat{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 18px;text-align:center;min-width:80px;}',
      '.cli-stat-n{font-size:20px;font-weight:800;color:var(--gold);}',
      '.cli-stat-l{font-size:10px;color:var(--text3);margin-top:2px;text-transform:uppercase;letter-spacing:.4px;}',
      '.cli-tabs{display:flex;gap:4px;border-bottom:2px solid var(--border);margin-bottom:18px;}',
      '.cli-tab{padding:8px 16px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;color:var(--text3);border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s;}',
      '.cli-tab.active{color:var(--gold);border-bottom-color:var(--gold);}',
      '.cli-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap;}',
      '.cli-search{flex:1;min-width:200px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;}',
      '.cli-search:focus{outline:none;border-color:var(--gold);}',
      '.cli-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}',
      '.cli-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px;transition:box-shadow .2s,border-color .2s;position:relative;overflow:hidden;cursor:pointer;}',
      '.cli-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.12);border-color:var(--gold);}',
      '.cli-card-stripe{position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0;}',
      '.cli-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#fff;flex-shrink:0;}',
      '.cli-card-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;}',
      '.cli-info{flex:1;min-width:0;}',
      '.cli-nome{font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.cli-sub{font-size:11px;color:var(--text3);margin-top:2px;}',
      '.cli-badges{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;}',
      '.cli-badge{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;}',
      '.cli-card-meta{display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);}',
      '.cli-meta-item{text-align:center;flex:1;}',
      '.cli-meta-n{font-size:14px;font-weight:700;}',
      '.cli-meta-l{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;}',
      '.cli-inativo{opacity:.5;}',
      // table
      '.cli-table-wrap{background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;}',
      '.cli-table{width:100%;border-collapse:collapse;}',
      '.cli-table th{padding:10px 14px;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;text-align:left;border-bottom:2px solid var(--border);background:var(--bg3);}',
      '.cli-table td{padding:10px 14px;font-size:12px;border-bottom:1px solid var(--border);vertical-align:middle;}',
      '.cli-table tr:last-child td{border-bottom:none;}',
      '.cli-table tr:hover td{background:var(--bg3);}',
      // modal
      '.cli-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:12px;}',
      '.cli-modal{background:var(--bg);border:1px solid var(--border);border-radius:14px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}',
      '.cli-modal-head{padding:20px 24px 0;position:sticky;top:0;background:var(--bg);z-index:1;border-bottom:1px solid var(--border);padding-bottom:14px;}',
      '.cli-modal-head h3{font-size:16px;font-weight:800;color:var(--gold);}',
      '.cli-modal-body{padding:20px 24px;}',
      '.cli-section{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin:18px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--border);}',
      '.cli-section:first-child{margin-top:0;}',
      '.cli-field{margin-bottom:12px;}',
      '.cli-field label{display:block;font-size:11px;font-weight:600;color:var(--text2);margin-bottom:4px;text-transform:uppercase;letter-spacing:.4px;}',
      '.cli-input{width:100%;padding:8px 11px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;box-sizing:border-box;transition:border-color .15s;}',
      '.cli-input:focus{outline:none;border-color:var(--gold);}',
      '.cli-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
      '.cli-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}',
      '.cli-modal-foot{padding:14px 24px;border-top:1px solid var(--border);display:flex;gap:8px;position:sticky;bottom:0;background:var(--bg);}',
      '.cli-req{color:var(--danger);}',
      '.cli-empty{text-align:center;padding:48px 20px;color:var(--text3);font-size:14px;}',
      '@media(max-width:540px){.cli-row2,.cli-row3{grid-template-columns:1fr;}.cli-grid{grid-template-columns:1fr;}}',
    ].join('');
    document.head.appendChild(s);
  }

  var perfil   = state.profile;
  var todos    = (state.clientes||[]).filter(function(c){ return c.profile===perfil; });
  var ativos   = todos.filter(function(c){ return c.ativo!==false; });
  var inativos = todos.filter(function(c){ return c.ativo===false; });
  var vip      = ativos.filter(function(c){ return (c.carimbosTotal||0)>=60; });

  var totalCash= ativos.reduce(function(s,c){return s+(c.cashbackSaldo||0);},0);

  var wrap = el('div',{class:'cli-wrap'});

  // header
  var hd = el('div',{class:'cli-header'});
  hd.appendChild(el('div',{class:'cli-title'},'👥 Clientes'));
  var novoBtn=el('button',{class:'btn-primary',style:{padding:'8px 16px',fontSize:'13px'}});
  novoBtn.textContent='+ Novo cliente';
  novoBtn.onclick=function(){ _cliModal=_cliNovoObj(); setState({}); };
  hd.appendChild(novoBtn);
  wrap.appendChild(hd);

  // stats
  var stats=el('div',{class:'cli-stats'});
  function _st(n,l){ var d=el('div',{class:'cli-stat'}); d.appendChild(el('div',{class:'cli-stat-n'},String(n))); d.appendChild(el('div',{class:'cli-stat-l'},l)); return d; }
  stats.appendChild(_st(ativos.length,'Ativos'));
  stats.appendChild(_st(vip.length,'VIP+'));
  stats.appendChild(_st(inativos.length,'Inativos'));
  if ((state.fidelidadeConfig||{}).cashbackAtivo) {
    stats.appendChild(_st('R$ '+totalCash.toFixed(2).replace('.',','),'Cashback disponível'));
  }
  wrap.appendChild(stats);

  // tabs
  var tabBar=el('div',{class:'cli-tabs'});
  [['todos','Todos ('+ativos.length+')'],['vip','🥇 VIP+ ('+vip.length+')'],['inativos','Inativos ('+inativos.length+')']].forEach(function(t){
    var b=el('button',{class:'cli-tab'+(_cliTab===t[0]?' active':'')});
    b.textContent=t[1]; b.onclick=function(){_cliTab=t[0];setState({});};
    tabBar.appendChild(b);
  });
  wrap.appendChild(tabBar);

  // toolbar
  var tb=el('div',{class:'cli-toolbar'});
  var inp=el('input',{class:'cli-search',type:'text',placeholder:'🔍 Buscar por nome, telefone, CPF ou e-mail...',value:_cliBusca});
  inp.oninput=function(){_cliBusca=this.value;setState({});};
  tb.appendChild(inp);
  var viewBtn=el('button',{class:'btn-secondary',style:{padding:'8px 12px',fontSize:'12px'}});
  viewBtn.textContent=_cliView==='grid'?'☰ Tabela':'⊞ Cards';
  viewBtn.onclick=function(){_cliView=_cliView==='grid'?'table':'grid';setState({});};
  tb.appendChild(viewBtn);
  wrap.appendChild(tb);

  // filtrar
  var base=_cliTab==='vip'?vip:_cliTab==='inativos'?inativos:ativos;
  var visivel=base.slice().sort(function(a,b){return (a.nome||'').localeCompare(b.nome||'');});
  if (_cliBusca.trim()) {
    var q=_cliBusca.toLowerCase().replace(/\D/g,'');
    var qt=_cliBusca.toLowerCase();
    visivel=visivel.filter(function(c){
      return (c.nome||'').toLowerCase().includes(qt)
        ||(c.email||'').toLowerCase().includes(qt)
        ||(c.telefone||'').replace(/\D/g,'').includes(q)
        ||(c.cpf||'').replace(/\D/g,'').includes(q);
    });
  }

  if (!visivel.length) {
    var emp=el('div',{class:'cli-empty'});
    emp.textContent=todos.length?'Nenhum cliente encontrado.':'Nenhum cliente cadastrado ainda. Clique em "+ Novo cliente" para começar!';
    wrap.appendChild(emp);
  } else if (_cliView==='grid') {
    var grid=el('div',{class:'cli-grid'});
    visivel.forEach(function(c){ grid.appendChild(_cliCard(c)); });
    wrap.appendChild(grid);
  } else {
    wrap.appendChild(_cliTable(visivel));
  }

  if (_cliModal!==null) wrap.appendChild(_cliModalForm(_cliModal));
  return wrap;
}

function _cliNovoObj() {
  return {id:null,nome:'',apelido:'',cpf:'',nascimento:'',sexo:'',
    telefone:'',whatsapp:'',email:'',
    cep:'',logradouro:'',numero:'',complemento:'',bairro:'',cidade:'',estado:'',
    obs:'',ativo:true,
    carimbosTotal:0,carimbosAtuais:0,cartoesResgatados:0,
    cashbackSaldo:0,cashbackTotal:0,cashbackResgatado:0};
}

function _cliTierCor(total) {
  if (total>=100) return {cor:'#00bcd4',label:'💎 Diamante'};
  if (total>=60)  return {cor:'#e6b800',label:'🥇 Ouro'};
  if (total>=30)  return {cor:'#8a9ba8',label:'🥈 Prata'};
  return {cor:'#b87333',label:'🥉 Bronze'};
}

function _cliCard(c) {
  var tier=_cliTierCor(c.carimbosTotal||0);
  var initials=(c.nome||'?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
  var inativo=c.ativo===false;
  var card=el('div',{class:'cli-card'+(inativo?' cli-inativo':'')});
  card.onclick=function(){ _cliModal=Object.assign({},c); setState({}); };

  var stripe=el('div',{class:'cli-card-stripe'});
  stripe.style.background=tier.cor;
  card.appendChild(stripe);

  var top=el('div',{class:'cli-card-top'});
  var av=el('div',{class:'cli-avatar',style:{background:tier.cor}});
  av.textContent=initials;
  top.appendChild(av);

  var info=el('div',{class:'cli-info'});
  var nomeEl=el('div',{class:'cli-nome'});
  nomeEl.textContent=c.nome+(c.apelido?' ('+c.apelido+')':'');
  info.appendChild(nomeEl);
  var sub=[];
  if(c.telefone) sub.push('📱 '+c.telefone);
  if(c.email) sub.push('✉️ '+c.email);
  if(sub.length){var subEl=el('div',{class:'cli-sub'}); subEl.textContent=sub.join('  •  '); info.appendChild(subEl);}
  if(c.cpf){var cpfEl=el('div',{class:'cli-sub'}); cpfEl.textContent='🪪 '+c.cpf; info.appendChild(cpfEl);}
  var badges=el('div',{class:'cli-badges'});
  var b1=el('span',{class:'cli-badge',style:{background:tier.cor+'22',color:tier.cor}});
  b1.textContent=tier.label; badges.appendChild(b1);
  if(inativo){var b2=el('span',{class:'cli-badge',style:{background:'var(--bg3)',color:'var(--text3)'}}); b2.textContent='Inativo'; badges.appendChild(b2);}
  if((state.fidelidadeConfig||{}).cashbackAtivo&&(c.cashbackSaldo||0)>0){
    var b3=el('span',{class:'cli-badge',style:{background:'rgba(0,200,83,.12)',color:'#00c853'}});
    b3.textContent='💰 R$ '+(c.cashbackSaldo||0).toFixed(2).replace('.',','); badges.appendChild(b3);
  }
  info.appendChild(badges);
  top.appendChild(info);
  card.appendChild(top);

  if ((c.carimbosTotal||0)>0||(c.cashbackTotal||0)>0) {
    var meta=el('div',{class:'cli-card-meta'});
    function _mi(v,l,clr){var d=el('div',{class:'cli-meta-item'});d.appendChild(el('div',{class:'cli-meta-n',style:{color:clr||tier.cor}},String(v)));d.appendChild(el('div',{class:'cli-meta-l'},l));return d;}
    meta.appendChild(_mi(c.carimbosTotal||0,'Carimbos'));
    meta.appendChild(_mi(c.cartoesResgatados||0,'Resgates'));
    if((state.fidelidadeConfig||{}).cashbackAtivo) meta.appendChild(_mi('R$ '+(c.cashbackTotal||0).toFixed(2).replace('.',','),'Cashback total','#00c853'));
    card.appendChild(meta);
  }
  return card;
}

function _cliTable(lista) {
  var wrap=el('div',{class:'cli-table-wrap',style:{overflowX:'auto'}});
  var tbl=el('table',{class:'cli-table'});
  var thead=el('thead',{});
  var hrow=el('tr',{});
  ['Nome','CPF','Telefone','E-mail','Cidade','Nível','Carimbos','Cashback',''].forEach(function(h){
    hrow.appendChild(el('th',{},h));
  });
  thead.appendChild(hrow); tbl.appendChild(thead);
  var tbody=el('tbody',{});
  lista.forEach(function(c){
    var tier=_cliTierCor(c.carimbosTotal||0);
    var inativo=c.ativo===false;
    var tr=el('tr',{style:{opacity:inativo?'.5':'1',cursor:'pointer'}});
    tr.onclick=function(){_cliModal=Object.assign({},c);setState({});};
    function td(txt,sty){var d=el('td',{style:sty||{}});d.textContent=txt||'—';return d;}
    tr.appendChild(td(c.nome+(c.apelido?' ('+c.apelido+')':'')));
    tr.appendChild(td(c.cpf));
    tr.appendChild(td(c.telefone));
    tr.appendChild(td(c.email));
    tr.appendChild(td([c.bairro,c.cidade].filter(Boolean).join(', ')));
    var tdTier=el('td',{});
    var sp=el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'2px 7px',borderRadius:'10px',background:tier.cor+'22',color:tier.cor}});
    sp.textContent=tier.label; tdTier.appendChild(sp); tr.appendChild(tdTier);
    tr.appendChild(td(String(c.carimbosTotal||0)));
    tr.appendChild(td((state.fidelidadeConfig||{}).cashbackAtivo?'R$ '+(c.cashbackSaldo||0).toFixed(2).replace('.',','):'—'));
    var tdAct=el('td',{});
    var editB=el('button',{style:{background:'none',border:'none',cursor:'pointer',fontSize:'14px',opacity:'.6',padding:'2px 5px'}});
    editB.textContent='✏️';
    editB.onclick=function(e){e.stopPropagation();_cliModal=Object.assign({},c);setState({});};
    tdAct.appendChild(editB); tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  tbl.appendChild(tbody); wrap.appendChild(tbl);
  return wrap;
}

// ── MODAL CADASTRO / EDIÇÃO ───────────────────────────────────────────────────
function _cliModalForm(c) {
  var isNew=!c.id;
  var overlay=el('div',{class:'cli-modal-overlay'});
  overlay.onclick=function(e){if(e.target===overlay){_cliModal=null;setState({});}};
  var modal=el('div',{class:'cli-modal'});
  overlay.appendChild(modal);

  // head
  var head=el('div',{class:'cli-modal-head'});
  head.appendChild(el('h3',{},isNew?'👤 Novo cliente':'✏️ Editar cliente'));
  modal.appendChild(head);

  var body=el('div',{class:'cli-modal-body'});

  function fld(lbl,inp,req){
    var f=el('div',{class:'cli-field'});
    var lb=el('label',{});
    lb.innerHTML=lbl+(req?'  <span class="cli-req">*</span>':'');
    f.appendChild(lb); f.appendChild(inp); return f;
  }
  function inp(type,val,ph,extra){
    var i=el('input',Object.assign({class:'cli-input',type:type||'text',placeholder:ph||'',value:val||''},extra||{}));
    return i;
  }

  // ── IDENTIFICAÇÃO
  body.appendChild(el('div',{class:'cli-section'},'Identificação'));
  var inpNome=inp('text',c.nome,'Nome completo');
  inpNome.oninput=function(){c.nome=this.value;};
  body.appendChild(fld('Nome',inpNome,true));

  var r2a=el('div',{class:'cli-row2'});
  var inpApelido=inp('text',c.apelido,'Como prefere ser chamado');
  inpApelido.oninput=function(){c.apelido=this.value;};
  var inpSexo=el('select',{class:'cli-input'});
  CLI_SEXOS.forEach(function(s){var o=el('option',{value:s},s||'Sexo');if(c.sexo===s)o.selected=true;inpSexo.appendChild(o);});
  inpSexo.onchange=function(){c.sexo=this.value;};
  r2a.appendChild(fld('Apelido',inpApelido));
  r2a.appendChild(fld('Sexo',inpSexo));
  body.appendChild(r2a);

  var r2b=el('div',{class:'cli-row2'});
  var inpCpf=inp('text',c.cpf,'000.000.000-00',{maxlength:'14'});
  inpCpf.oninput=function(){
    var v=this.value.replace(/\D/g,'').slice(0,11);
    if(v.length>9) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
    else if(v.length>6) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
    else if(v.length>3) v=v.slice(0,3)+'.'+v.slice(3);
    this.value=v; c.cpf=v;
  };
  var inpNasc=inp('date',c.nascimento);
  inpNasc.oninput=function(){c.nascimento=this.value;};
  r2b.appendChild(fld('CPF',inpCpf,true));
  r2b.appendChild(fld('Data de nascimento',inpNasc,true));
  body.appendChild(r2b);

  // ── CONTATO
  body.appendChild(el('div',{class:'cli-section'},'Contato'));
  var r2c=el('div',{class:'cli-row2'});
  var inpTel=inp('tel',c.telefone,'(00) 00000-0000');
  inpTel.oninput=function(){c.telefone=this.value;};
  var inpWpp=inp('tel',c.whatsapp,'(00) 00000-0000 (se diferente)');
  inpWpp.oninput=function(){c.whatsapp=this.value;};
  r2c.appendChild(fld('Telefone',inpTel,true));
  r2c.appendChild(fld('WhatsApp',inpWpp));
  body.appendChild(r2c);
  var inpEmail=inp('email',c.email,'email@exemplo.com');
  inpEmail.oninput=function(){c.email=this.value;};
  body.appendChild(fld('E-mail',inpEmail));

  // ── ENDEREÇO
  body.appendChild(el('div',{class:'cli-section'},'Endereço (para delivery)'));
  var r2d=el('div',{class:'cli-row2'});
  var inpCep=inp('text',c.cep,'00000-000',{maxlength:'9'});
  inpCep.oninput=function(){
    var v=this.value.replace(/\D/g,'').slice(0,8);
    if(v.length>5) v=v.slice(0,5)+'-'+v.slice(5);
    this.value=v; c.cep=v;
  };
  var inpBairro=inp('text',c.bairro,'Bairro');
  inpBairro.oninput=function(){c.bairro=this.value;};
  r2d.appendChild(fld('CEP',inpCep));
  r2d.appendChild(fld('Bairro',inpBairro));
  body.appendChild(r2d);

  var inpLogr=inp('text',c.logradouro,'Rua / Av.');
  inpLogr.oninput=function(){c.logradouro=this.value;};
  body.appendChild(fld('Logradouro',inpLogr));

  var r3=el('div',{class:'cli-row3'});
  var inpNum=inp('text',c.numero,'Nº');
  inpNum.oninput=function(){c.numero=this.value;};
  var inpComp=inp('text',c.complemento,'Apto, bloco...');
  inpComp.oninput=function(){c.complemento=this.value;};
  var inpCidade=inp('text',c.cidade,'Cidade');
  inpCidade.oninput=function(){c.cidade=this.value;};
  r3.appendChild(fld('Número',inpNum));
  r3.appendChild(fld('Complemento',inpComp));
  r3.appendChild(fld('Cidade',inpCidade));
  body.appendChild(r3);

  var inpEst=el('select',{class:'cli-input'});
  CLI_ESTADOS.forEach(function(s){var o=el('option',{value:s},s||'— Estado —');if(c.estado===s)o.selected=true;inpEst.appendChild(o);});
  inpEst.onchange=function(){c.estado=this.value;};
  body.appendChild(fld('Estado',inpEst));

  // ── EXTRAS
  body.appendChild(el('div',{class:'cli-section'},'Observações'));
  var inpObs=el('textarea',{class:'cli-input',placeholder:'Preferências, alergias, restrições...',rows:'3',style:'resize:vertical;'});
  inpObs.value=c.obs||'';
  inpObs.oninput=function(){c.obs=this.value;};
  body.appendChild(fld('Observações',inpObs));

  if (!isNew) {
    body.appendChild(el('div',{class:'cli-section'},'Status'));
    var ativoRow=el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
    var ativoCk=el('input',{type:'checkbox'});
    ativoCk.checked=c.ativo!==false;
    ativoCk.style.cssText='width:16px;height:16px;accent-color:var(--gold);cursor:pointer;';
    ativoCk.onchange=function(){c.ativo=this.checked;};
    var ativoLbl=el('label',{style:{fontSize:'13px',cursor:'pointer'}});
    ativoLbl.textContent='Cliente ativo';
    ativoLbl.onclick=function(){ativoCk.click();};
    ativoRow.appendChild(ativoCk); ativoRow.appendChild(ativoLbl);
    body.appendChild(ativoRow);
  }

  modal.appendChild(body);

  // foot
  var foot=el('div',{class:'cli-modal-foot'});
  if (!isNew) {
    var delBtn=el('button',{class:'btn-secondary',style:{color:'var(--danger)',borderColor:'var(--danger)',padding:'9px 14px',fontSize:'12px'}});
    delBtn.textContent='🗑 Excluir';
    delBtn.onclick=function(){
      if (!window.confirm('Excluir cliente "'+c.nome+'"? O histórico de fidelidade também será removido.')) return;
      var perfil=state.profile;
      var lista=(state.clientes||[]).filter(function(x){return !(x.id===c.id&&x.profile===perfil);});
      var logs=(state.fidelidadeLog||[]).filter(function(x){return !(x.clienteId===c.id&&x.profile===perfil);});
      _cliModal=null;
      lsSet('fidelidadeLog',logs);
      _cliSave({clientes:lista,fidelidadeLog:logs});
      showToast('Cliente excluído','error');
    };
    foot.appendChild(delBtn);
  }
  var cancelBtn=el('button',{class:'btn-secondary',style:{flex:'1',padding:'9px',fontSize:'13px'}});
  cancelBtn.textContent='Cancelar';
  cancelBtn.onclick=function(){_cliModal=null;setState({});};
  foot.appendChild(cancelBtn);

  var saveBtn=el('button',{class:'btn-primary',style:{flex:'2',padding:'9px',fontSize:'13px'}});
  saveBtn.textContent=isNew?'✅ Cadastrar':'💾 Salvar';
  saveBtn.onclick=function(){
    if(!(c.nome||'').trim()){showToast('Nome é obrigatório','error');return;}
    if(!(c.telefone||'').trim()){showToast('Telefone é obrigatório','error');return;}
    if(!_validarCPF_cli(c.cpf)){showToast('CPF inválido','error');return;}
    if(!(c.nascimento||'').trim()){showToast('Data de nascimento é obrigatória','error');return;}
    var perfil=state.profile;
    var lista=(state.clientes||[]).slice();
    if (isNew) {
      var cpfLimpo=(c.cpf||'').replace(/\D/g,'');
      var dup=lista.find(function(x){return x.profile===perfil&&(x.cpf||'').replace(/\D/g,'')===cpfLimpo;});
      if(dup){showToast('CPF já cadastrado: '+dup.nome,'error');return;}
      lista.push(Object.assign({},c,{
        id:uid(),profile:perfil,ativo:true,
        criadoEm:new Date().toISOString()
      }));
    } else {
      for(var i=0;i<lista.length;i++){
        if(lista[i].id===c.id&&lista[i].profile===perfil){
          lista[i]=Object.assign({},lista[i],c);
          break;
        }
      }
    }
    _cliModal=null;
    _cliSave({clientes:lista});
    showToast(isNew?'Cliente cadastrado!':'Cliente atualizado!');
  };
  foot.appendChild(saveBtn);
  modal.appendChild(foot);
  return overlay;
}

// ── Picker público: usado no PDV ──────────────────────────────────────────────
// Retorna um container com busca + dropdown e chama cb(cliente) ao selecionar
function cliPickerWidget(valorInicial, cb) {
  var perfil=state.profile;
  var clientes=(state.clientes||[]).filter(function(c){return c.profile===perfil&&c.ativo!==false;});
  var wrap=el('div',{style:{position:'relative',flex:'1'}});
  var inpEl=el('input',{class:'form-input',type:'text',
    placeholder:'🔍 Buscar cliente por nome, telefone ou CPF...',
    value:valorInicial||'',
    style:{marginBottom:'0',fontSize:'12px',paddingRight:'28px'}});
  wrap.appendChild(inpEl);

  var dropdown=null;
  function closeDD(){if(dropdown&&dropdown.parentNode){dropdown.parentNode.removeChild(dropdown);}dropdown=null;}

  inpEl.oninput=function(){
    closeDD();
    var q=this.value.trim().toLowerCase();
    if(!q){if(cb)cb(null);return;}
    var found=clientes.filter(function(c){
      return (c.nome||'').toLowerCase().includes(q)
        ||(c.telefone||'').replace(/\D/g,'').includes(q.replace(/\D/g,''))
        ||(c.cpf||'').replace(/\D/g,'').includes(q.replace(/\D/g,''));
    }).slice(0,8);
    if(!found.length) return;
    dropdown=document.createElement('div');
    dropdown.style.cssText='position:fixed;z-index:9000;background:var(--bg);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.2);overflow:hidden;min-width:260px;';
    var rect=inpEl.getBoundingClientRect();
    dropdown.style.top=(rect.bottom+4)+'px';
    dropdown.style.left=rect.left+'px';
    dropdown.style.width=rect.width+'px';
    found.forEach(function(c){
      var tier=_cliTierCor(c.carimbosTotal||0);
      var initials=(c.nome||'?').split(' ').slice(0,2).map(function(w){return w[0];}).join('').toUpperCase();
      var row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background .1s;border-bottom:1px solid var(--border);';
      row.onmouseenter=function(){this.style.background='var(--bg3)';};
      row.onmouseleave=function(){this.style.background='';};
      var av=document.createElement('div');
      av.style.cssText='width:30px;height:30px;border-radius:50%;background:'+tier.cor+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;';
      av.textContent=initials; row.appendChild(av);
      var info=document.createElement('div');
      info.style.cssText='flex:1;min-width:0;';
      var nm=document.createElement('div');
      nm.style.cssText='font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      nm.textContent=c.nome; info.appendChild(nm);
      var sub=document.createElement('div');
      sub.style.cssText='font-size:10px;color:var(--text3);';
      var parts=[];
      if(c.telefone) parts.push(c.telefone);
      if(c.cpf) parts.push(c.cpf);
      sub.textContent=parts.join(' • '); info.appendChild(sub);
      row.appendChild(info);
      if((state.fidelidadeConfig||{}).cashbackAtivo&&(c.cashbackSaldo||0)>0){
        var cb2=document.createElement('div');
        cb2.style.cssText='font-size:10px;font-weight:700;color:#00c853;white-space:nowrap;';
        cb2.textContent='💰 R$ '+(c.cashbackSaldo||0).toFixed(2).replace('.',',');
        row.appendChild(cb2);
      }
      row.onclick=function(){
        inpEl.value=c.nome;
        closeDD();
        if(cb) cb(c);
      };
      dropdown.appendChild(row);
    });
    document.body.appendChild(dropdown);
  };

  inpEl.onblur=function(){ setTimeout(closeDD,180); };

  return wrap;
}
