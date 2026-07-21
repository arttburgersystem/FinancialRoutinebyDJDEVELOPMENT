// ── MODAL PERFIL ──────────────────────────────────────────────────────────────
function renderPerfilModal(){
  if(!state.perfilModal)return null;
  var m=state.perfilModal;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;

  var CORES=['#9b7fe8','#c9a84c','#4caf82','#e05252','#3a8fd4','#e07832','#2bb5a0','#d44c8a','#607d8b','#8bc34a','#ff9f43','#ee5a24'];
  var corAtual=edit.color||CORES[0];

  function g(id){var e=document.getElementById('pf-'+id);return e?e.value:'';}

  // ── Ferramentas disponíveis para seleção ──────────────────────────────────
  var TOOLS_SECTIONS=[
    {
      sec:'principal',label:'Principal',
      items:[
        {id:'daily',icon:'📋',label:'Daily Operation'},
      ]
    },
    {
      sec:'financeiro',label:'Financeiro',
      items:[
        {id:'bancos',     icon:'🏦',label:'Bancos'},
        {id:'receber',    icon:'💰',label:'Contas a Receber'},
        {id:'pagar',      icon:'💸',label:'Despesas'},
        {id:'dre',        icon:'📋',label:'DRE'},
        {id:'receitas',   icon:'💵',label:'Receitas'},
        {id:'emprestimos',icon:'🏧',label:'Empréstimos'},
        {id:'cartoes',    icon:'💳',label:'Cartões de Crédito'},
        {id:'fluxo',      icon:'📈',label:'Fluxo de Caixa'},
        {id:'caixa',      icon:'🏧',label:'Fechamento de Caixa'},
        {id:'compras',    icon:'🛒',label:'Compras'},
        {id:'lista-compras',icon:'🛍️',label:'Lista de Compras'},
        {id:'estoque-insumos',icon:'📦',label:'Estoque'},
        {id:'fornecedores',icon:'🏪',label:'Fornecedores'},
        {id:'funcionarios',icon:'👥',label:'Funcionários'},
        {id:'freelancers', icon:'🎨',label:'Freelancers'},
        {id:'administrador',icon:'👤',label:'Administrador'},
        {id:'cardapio',   icon:'🍽️',label:'Cardápio'},
      ]
    },
    {
      sec:'planejamento',label:'Planejamento',
      items:[
        {id:'tarefas',    icon:'✅',label:'Tarefas & Agenda'},
        {id:'orcamento',  icon:'💰',label:'Orçamento'},
        {id:'planejamento',icon:'🎯',label:'Metas'},
        {id:'alertas',    icon:'🔔',label:'Alertas'},
        {id:'exportar',   icon:'📊',label:'Relatórios'},
        {id:'recorrencias',icon:'🔄',label:'Recorrências'},
        {id:'notas',      icon:'📝',label:'Bloco de Notas'},
      ]
    },
    {
      sec:'sistema',label:'Sistema',
      items:[
        {id:'empresa',    icon:'🏢',label:'Dados da Empresa'},
        {id:'usuarios',   icon:'🔐',label:'Usuários & Permissões'},
        {id:'patrimonio', icon:'🏛️',label:'Patrimônio'},
        {id:'auditoria',  icon:'🕐',label:'Histórico / Auditoria'},
        {id:'ajuda',      icon:'❓',label:'Central de Ajuda'},
      ]
    },
  ];

  // Presets
  var PRESET_PF=[
    'bancos','receber','pagar','dre','receitas','emprestimos','cartoes',
    'fluxo','tarefas','orcamento','planejamento','alertas','exportar',
    'recorrencias','notas','empresa','usuarios','patrimonio','auditoria','ajuda',
  ];
  var PRESET_EMPRESA=[
    'daily','bancos','receber','pagar','dre','receitas','emprestimos','cartoes',
    'fluxo','caixa','compras','lista-compras','estoque-insumos','fornecedores',
    'funcionarios','freelancers','administrador','cardapio',
    'tarefas','orcamento','planejamento','alertas','exportar','recorrencias','notas',
    'empresa','usuarios','patrimonio','auditoria','ajuda',
  ];

  // Estado mutável dos checkboxes (closure, sem setState)
  var selectedPages={};
  // Inicializa com todas habilitadas (padrão empresa)
  TOOLS_SECTIONS.forEach(function(sec){
    sec.items.forEach(function(t){selectedPages[t.id]=true;});
  });

  function applyPreset(ids){
    TOOLS_SECTIONS.forEach(function(sec){
      sec.items.forEach(function(t){
        selectedPages[t.id]=ids.indexOf(t.id)>=0;
        var chk=document.getElementById('pfchk-'+t.id);
        if(chk)chk.checked=selectedPages[t.id];
      });
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
    // Monta array de pages habilitadas (apenas para criação)
    var pages=null;
    if(!isEdit){
      pages=TOOLS_SECTIONS.reduce(function(arr,sec){
        sec.items.forEach(function(t){if(selectedPages[t.id])arr.push(t.id);});
        return arr;
      },[]);
      // dashboard sempre incluído
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

  // Palette de cores
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

      // Header da seção com "selecionar todos"
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

      // Grid de checkboxes 2 colunas
      var grid=el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 8px',paddingLeft:'4px'}});
      sec.items.forEach(function(t){
        var row=el('label',{style:{
          display:'flex',alignItems:'center',gap:'7px',
          padding:'5px 8px',borderRadius:'6px',cursor:'pointer',
          fontSize:'12px',color:'var(--text2)',
          transition:'background .1s',
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
      el('div',{style:{
        fontSize:'11px',color:'var(--text3)',marginBottom:'10px',lineHeight:'1.5',
      }},'Escolha um preset abaixo ou marque manualmente. Visão Geral e Dashboard estão sempre disponíveis.'),
      presetsRow,
      el('div',{style:{
        background:'var(--bg3)',borderRadius:'8px',padding:'12px',
        border:'1px solid var(--border)',maxHeight:'280px',overflowY:'auto',
      }},secBoxes),
    ]);

    // Aplica preset empresa por padrão
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
