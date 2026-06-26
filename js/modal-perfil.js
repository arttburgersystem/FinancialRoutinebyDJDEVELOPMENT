// ── MODAL PERFIL ──────────────────────────────────────────────────────────────
function renderPerfilModal(){
  if(!state.perfilModal)return null;
  var m=state.perfilModal;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;

  var CORES=['#9b7fe8','#c9a84c','#4caf82','#e05252','#3a8fd4','#e07832','#2bb5a0','#d44c8a','#607d8b','#8bc34a','#ff9f43','#ee5a24'];
  var corAtual=edit.color||CORES[0];

  function g(id){var e=document.getElementById('pf-'+id);return e?e.value:'';}

  function save(){
    var label=(g('label')||'').trim();
    if(!label){_fldErr('pf-label','Nome do perfil é obrigatório');showToast('Preencha os campos em vermelho','error');return;}
    if(!isEdit){
      var dup=PROFILES.find(function(p){return p.label.toLowerCase()===label.toLowerCase();});
      if(dup){showToast('Já existe um perfil com este nome','error');return;}
    }
    var cor=g('color')||corAtual;
    if(isEdit){
      updateProfile({id:edit.id,label:label,color:cor,icon:edit.icon||'👤'});
    } else {
      addProfile({id:'pf_'+Date.now(),label:label,color:cor,icon:'👤'});
    }
  }

  // Palette de cores
  var colorBtns=[];
  CORES.forEach(function(c){
    var b=el('button',{type:'button',title:c,style:{
      width:'28px',height:'28px',borderRadius:'50%',background:c,border:'3px solid '+(corAtual===c?'var(--text)':'transparent'),
      cursor:'pointer',flexShrink:'0',transition:'border-color .15s',outline:'none',
    },onclick:function(){
      corAtual=c;
      var inp=document.getElementById('pf-color');if(inp)inp.value=c;
      // Atualiza borda de todos os botões
      colorBtns.forEach(function(x){x.style.border='3px solid '+(x===b?'var(--text)':'transparent');});
    }});
    colorBtns.push(b);
  });
  var paletteRow=el('div',{style:{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'10px'}},colorBtns);

  var colorCustom=el('input',{id:'pf-color',type:'color',style:{height:'32px',width:'44px',padding:'2px 4px',cursor:'pointer',border:'1px solid var(--border)',borderRadius:'6px',background:'none'},
    onchange:function(e){
      corAtual=e.target.value;
      colorBtns.forEach(function(b){b.style.border='3px solid transparent';});
    }
  });
  colorCustom.value=corAtual;

  var nameInp=el('input',{class:'form-input',id:'pf-label',type:'text',placeholder:'Ex: Empresa, Investimentos, Familiar...',maxlength:'30'});
  nameInp.value=edit.label||'';

  // Preview dinâmico
  var previewDot=el('div',{style:{width:'12px',height:'12px',borderRadius:'50%',background:corAtual,display:'inline-block',marginRight:'6px'}});
  var previewLabel=el('span',{style:{fontSize:'13px',fontWeight:'600'}},edit.label||'Novo perfil');
  var previewBox=el('div',{style:{display:'flex',alignItems:'center',padding:'8px 12px',background:'var(--bg3)',borderRadius:'6px',marginBottom:'4px',border:'1px solid var(--border)'}},
    [previewDot,previewLabel]
  );
  nameInp.oninput=function(e){
    previewLabel.textContent=e.target.value||'Novo perfil';
  };

  // Sincroniza cor no preview
  colorBtns.forEach(function(b,i){
    var origClick=b.onclick;
    b.onclick=function(e){
      origClick.call(b,e);
      previewDot.style.background=CORES[i];
    };
  });
  colorCustom.onchange=function(e){
    corAtual=e.target.value;
    colorBtns.forEach(function(b){b.style.border='3px solid transparent';});
    previewDot.style.background=corAtual;
  };

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(isEdit?'Editar':'Novo')+' perfil'),
      el('button',{class:'modal-close',onclick:function(){setState({perfilModal:null});}}, '×'),
    ]),
    div('form-group',[
      el('label',{class:'form-label'},'Nome do perfil'),
      nameInp,
    ]),
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
    isEdit?el('p',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'12px'}},'⚠ Renomear o perfil não afeta dados já cadastrados.'):null,
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({perfilModal:null});}),
      btn('btn-primary',isEdit?'Salvar':'Criar perfil',save),
    ]),
  ].filter(Boolean));

  modal.style.maxWidth='400px';
  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({perfilModal:null});};
  setTimeout(function(){var i=document.getElementById('pf-label');if(i){i.focus();i.select();}},50);
  return ov;
}
