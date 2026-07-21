// ── MODAL PERFIL ──────────────────────────────────────────────────────────────
function renderPerfilModal(){
  if(!state.perfilModal)return null;
  var m=state.perfilModal;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;

  var CORES=['#9b7fe8','#c9a84c','#4caf82','#e05252','#3a8fd4','#e07832','#2bb5a0','#d44c8a','#607d8b','#8bc34a','#ff9f43','#ee5a24'];
  var corAtual=edit.color||CORES[0];

  function g(id){var e=document.getElementById('pf-'+id);return e?e.value:'';}

  // ── Derivar ferramentas do nav global (index.html) ────────────────────────
  // Qualquer nova ferramenta adicionada ao nav aparece automaticamente aqui.
  var SEC_LABELS={principal:'Principal',financeiro:'Financeiro',planejamento:'Planejamento',sistema:'Sistema'};
  var SEC_ORDER=['principal','financeiro','planejamento','sistema'];

  // Filtra: exclui hidden, onlyAE e dashboard (sempre habilitado)
  var navTools=(typeof nav!=='undefined'?nav:[]).filter(function(n){
    return !n.hidden&&!n.onlyAE&&n.id!=='dashboard';
  });

  // Agrupa por seção; 'integração' entra em 'planejamento'
  var secMap={};
  navTools.forEach(function(n){
    var sec=n.section==='integração'?'planejamento':n.section;
    if(!SEC_LABELS[sec])return;
    if(!secMap[sec])secMap[sec]=[];
    secMap[sec].push({id:n.id,icon:n.icon,label:n.label});
  });

  var TOOLS_SECTIONS=SEC_ORDER.filter(function(s){return secMap[s]&&secMap[s].length;}).map(function(s){
    return {sec:s,label:SEC_LABELS[s],items:secMap[s]};
  });

  // IDs de todas as ferramentas visíveis
  var ALL_TOOL_IDS=navTools.map(function(n){return n.id;});

  // Ferramentas empresariais excluídas do preset Pessoa Física.
  // Quando uma nova ferramenta empresarial for criada, basta adicionar seu id aqui.
  var PF_EXCLUDES=[
    'daily','vendas','caixa','compras','lista-compras','estoque-insumos',
    'fornecedores','funcionarios','freelancers','administrador','cardapio','dre',
  ];
  var PRESET_PF=ALL_TOOL_IDS.filter(function(id){return PF_EXCLUDES.indexOf(id)===-1;});
  var PRESET_EMPRESA=ALL_TOOL_IDS.slice();

  // Estado mutável dos checkboxes (closure, sem setState)
  var selectedPages={};
  ALL_TOOL_IDS.forEach(function(id){selectedPages[id]=true;});

  function applyPreset(ids){
    ALL_TOOL_IDS.forEach(function(id){
      selectedPages[id]=ids.indexOf(id)>=0;
      var chk=document.getElementById('pfchk-'+id);
      if(chk)chk.checked=selectedPages[id];
    });
    updateSecHeaders();
  }

  function updateSecHeaders(){
    TOOLS_SECTIONS.forEach(function(sec){
      var all=sec.items.every(function(t){return selectedPages[t.id];});
      var none=sec.items.every(function(t){return !selectedPages[t.id];});
      var chkAll=document.getElementById('pfchk-all-'+sec.sec);
      if(chkAll){chkAll.checked=all;chkAll.indeterminate=!all&&!none;}
    });
  }

  function save(){
    var label=(g('label')||'').trim();
    if(!label){_fldErr('pf-label','Nome do perfil é obrigatório');showToast('Preencha os campos em vermelho','error');return;}
    if(!isEdit){
      var dup=PROFILES.find(function(p){return p.label.toLowerCase()===label.toLowerCase();});
      if(dup){showToast('Já existe um perfil com este nome','error');return;}
    }
    var cor=g('color')||corAtual;
    var pages=null;
    if(!isEdit){
      pages=ALL_TOOL_IDS.filter(function(id){return selectedPages[id];});
      if(pages.indexOf('dashboard')===-1)pages.unshift('dashboard');
    }
    if(isEdit){
      updateProfile({id:edit.id,label:label,color:cor,icon:edit.icon||'👤'});
    } else {
      var newPf={id:'pf_'+Date.now(),label:label,color:cor,icon:'👤'};
      if(pages)newPf.pages=pages;
      addProfile(newPf);
    }
  }

  // ── Palette de cores ──────────────────────────────────────────────────────
  var colorBtns=[];
  CORES.forEach(function(c){
    var b=el('button',{type:'button',title:c,style:{
      width:'28px',height:'28px',borderRadius:'50%',background:c,
      border:'3px solid '+(corAtual===c?'var(--text)':'transparent'),
      cursor:'pointer',flexShrink:'0',transition:'border-color .15s',outline:'none',
    },onclick:function(){
      corAtual=c;
      var inp=document.getElementById('pf-color');if(inp)inp.value=c;
      colorBtns.forEach(function(x){x.style.border='3px solid '+(x===b?'var(--text)':'transparent');});
      previewDot.style.background=c;
    }});
    colorBtns.push(b);
  });
  var paletteRow=el('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}},colorBtns);
  var colorCustom=el('input',{id:'pf-color',type:'color',style:{height:'32px',width:'44px',padding:'2px 4px',cursor:'pointer',border:'1px solid var(--border)',borderRadius:'6px',background:'none'}});
  colorCustom.value=corAtual;
  colorCustom.onchange=function(e){
    corAtual=e.target.value;
    colorBtns.forEach(function(b){b.style.border='3px solid transparent';});
    previewDot.style.background=corAtual;
  };

  var nameInp=el('input',{class:'form-input',id:'pf-label',type:'text',placeholder:'Ex: Empresa, Investimentos, Pessoal...',maxlength:'30'});
  nameInp.value=edit.label||'';

  var previewDot=el('div',{style:{width:'12px',height:'12px',borderRadius:'50%',background:corAtual,display:'inline-block',marginRight:'6px'}});
  var previewLabel=el('span',{style:{fontSize:'13px',fontWeight:'600'}},edit.label||'Novo perfil');
  var previewBox=el('div',{style:{display:'flex',alignItems:'center',padding:'8px 12px',background:'var(--bg3)',borderRadius:'6px',marginBottom:'4px',border:'1px solid var(--border)'}},[previewDot,previewLabel]);
  nameInp.oninput=function(e){previewLabel.textContent=e.target.value||'Novo perfil';};

  // ── Seção de ferramentas (só no modo CRIAR) ──────────────────────────────
  var toolsSection=null;
  if(!isEdit){
    var presetsRow=el('div',{style:{display:'flex',gap:'8px',marginBottom:'14px'}});

    var btnPF=el('button',{type:'button',style:{
      flex:'1',padding:'9px 12px',borderRadius:'8px',cursor:'pointer',
      border:'2px solid #3a8fd4',background:'#3a8fd411',
      color:'#3a8fd4',fontWeight:'700',fontSize:'12px',
    }},'👤 Pessoa Física');
    btnPF.onclick=function(){applyPreset(PRESET_PF);};

    var btnEmp=el('button',{type:'button',style:{
      flex:'1',padding:'9px 12px',borderRadius:'8px',cursor:'pointer',
      border:'2px solid var(--gold)',background:'var(--gold-dim)',
      color:'var(--gold)',fontWeight:'700',fontSize:'12px',
    }},'🏢 Empresa Completa');
    btnEmp.onclick=function(){applyPreset(PRESET_EMPRESA);};

    presetsRow.appendChild(btnPF);
    presetsRow.appendChild(btnEmp);

    var secBoxes=TOOLS_SECTIONS.map(function(sec){
      var sWrap=el('div',{style:{marginBottom:'14px'}});

      var sHd=el('div',{style:{
        display:'flex',alignItems:'center',gap:'8px',
        padding:'5px 8px',background:'var(--bg3)',borderRadius:'6px',
        marginBottom:'7px',cursor:'pointer',
      }});
      var chkAll=el('input',{type:'checkbox',id:'pfchk-all-'+sec.sec,style:{cursor:'pointer',accentColor:'var(--primary)'}});
      chkAll.checked=true;
      chkAll.onchange=function(){
        var val=chkAll.checked;
        sec.items.forEach(function(t){
          selectedPages[t.id]=val;
          var c=document.getElementById('pfchk-'+t.id);if(c)c.checked=val;
        });
      };
      sHd.appendChild(chkAll);
      sHd.appendChild(el('span',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text3)',flex:'1'}},sec.label));
      sHd.onclick=function(e){if(e.target!==chkAll){chkAll.click();}};
      sWrap.appendChild(sHd);

      var grid=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 8px',paddingLeft:'4px'}});
      sec.items.forEach(function(t){
        var row=el('label',{style:{
          display:'flex',alignItems:'center',gap:'7px',
          padding:'5px 8px',borderRadius:'6px',cursor:'pointer',
          fontSize:'12px',color:'var(--text2)',transition:'background .1s',
        }});
        row.onmouseenter=function(){row.style.background='var(--bg3)';};
        row.onmouseleave=function(){row.style.background='';};
        var chk=el('input',{type:'checkbox',id:'pfchk-'+t.id,style:{cursor:'pointer',accentColor:'var(--primary)',flexShrink:'0'}});
        chk.checked=selectedPages[t.id]!==false;
        chk.onchange=function(){
          selectedPages[t.id]=chk.checked;
          updateSecHeaders();
        };
        row.appendChild(chk);
        row.appendChild(el('span',{style:{fontSize:'13px',lineHeight:'1'}},t.icon));
        row.appendChild(el('span',{style:{flex:'1'}},t.label));
        grid.appendChild(row);
      });
      sWrap.appendChild(grid);
      return sWrap;
    });

    toolsSection=el('div',{style:{marginBottom:'16px'}},[
      el('label',{class:'form-label',style:{marginBottom:'8px'}},'Ferramentas habilitadas neste perfil'),
      el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'10px',lineHeight:'1.5',}},'Escolha um preset ou marque manualmente. Dashboard e Visão Geral estão sempre disponíveis.'),
      presetsRow,
      el('div',{style:{
        background:'var(--bg3)',borderRadius:'8px',padding:'12px',
        border:'1px solid var(--border)',maxHeight:'280px',overflowY:'auto',
      }},secBoxes),
    ]);

    applyPreset(PRESET_EMPRESA);
  }

  var children=[
    div('modal-title',[
      el('span',{},(isEdit?'Editar':'Novo')+' perfil'),
      el('button',{class:'modal-close',onclick:function(){setState({perfilModal:null});}}, '×'),
    ]),
    div('form-group',[el('label',{class:'form-label'},'Nome do perfil'),nameInp]),
    div('form-group',[
      el('label',{class:'form-label'},'Cor de identificação'),
      paletteRow,
      el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}},[
        el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Cor personalizada:'),
        colorCustom,
      ]),
    ]),
    el('div',{style:{marginBottom:'16px'}},[
      el('label',{class:'form-label',style:{marginBottom:'6px'}},'Pré-visualização'),
      previewBox,
    ]),
    toolsSection,
    isEdit?el('p',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'12px'}},'⚠ Renomear o perfil não afeta dados já cadastrados.'):null,
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({perfilModal:null});}),
      btn('btn-primary',isEdit?'Salvar':'Criar perfil',save),
    ]),
  ].filter(Boolean);

  var modal=div('modal',children);
  modal.style.maxWidth='460px';
  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({perfilModal:null});};
  setTimeout(function(){var i=document.getElementById('pf-label');if(i){i.focus();i.select();}},50);
  return ov;
}
