// ── MODAL GERENCIADOR DE CATEGORIAS ──────────────────────────────────────────
function renderCatManager(){
  var m=state.catManager; if(!m)return null;
  var key=m.key;
  var nomes={artt_pagar:'Categorias — Contas a Pagar (Artt Burger)',artt_receber:'Categorias — Contas a Receber (Artt Burger)',pes_pagar:'Categorias — Contas a Pagar (Pessoal)',pes_receber:'Categorias — Contas a Receber (Pessoal)'};
  var cats=getCats(key);
  var mode=m.mode||'view';
  var selected=m.selected||[];

  function refresh(newMode,newSelected){setState({catManager:{key:key,mode:newMode||mode,selected:newSelected||[]}});}

  function addCat(){
    var inp=document.getElementById('cm-new-inp');
    if(!inp||!inp.value.trim())return;
    var val=inp.value.trim();
    if(cats.indexOf(val)>=0){showToast('Categoria já existe','error');return;}
    saveCats(key,cats.concat([val]));
    showToast('Categoria adicionada!');
    setState({catManager:{key:key,mode:'view',selected:[]}});
  }

  function deleteSelected(){
    if(selected.length===0)return;
    saveCats(key,cats.filter(function(c){return selected.indexOf(c)<0;}));
    showToast(selected.length+' categoria(s) removida(s)','error');
    setState({catManager:{key:key,mode:'view',selected:[]}});
  }

  function toggleSel(cat){
    var idx=selected.indexOf(cat);
    setState({catManager:{key:key,mode:mode,selected:idx>=0?selected.filter(function(c){return c!==cat;}):selected.concat([cat])}});
  }

  var items=cats.map(function(cat){
    var isSel=selected.indexOf(cat)>=0;
    return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderBottom:'1px solid var(--border)',background:isSel?'var(--red-dim)':'transparent',borderRadius:'4px',transition:'background .15s'}},[
      mode==='delete'?el('input',{type:'checkbox',checked:isSel?'checked':'',style:{accentColor:'var(--red)',width:'15px',height:'15px',cursor:'pointer'},onchange:function(){toggleSel(cat);}}):null,
      el('span',{style:{flex:'1',fontSize:'13px',color:'var(--text)'}},cat),
    ].filter(Boolean));
  });

  var modal=div('modal',[
    div('modal-title',[
      el('span',{style:{fontSize:'14px'}},nomes[key]||'Categorias'),
      el('button',{class:'modal-close',onclick:function(){setState({catManager:null});}}, '×'),
    ]),
    el('div',{style:{display:'flex',gap:'8px',marginBottom:'14px'}},[
      el('button',{style:{padding:'6px 12px',borderRadius:'20px',border:'1px solid '+(mode==='view'?'var(--gold)':'var(--border)'),background:mode==='view'?'var(--gold-dim)':'transparent',color:mode==='view'?'var(--gold)':'var(--text3)',fontSize:'12px',fontWeight:'600',cursor:'pointer'},onclick:function(){refresh('view',[]);}}, '📋 Ver todas'),
      el('button',{style:{padding:'6px 12px',borderRadius:'20px',border:'1px solid '+(mode==='delete'?'var(--red)':'var(--border)'),background:mode==='delete'?'var(--red-dim)':'transparent',color:mode==='delete'?'var(--red)':'var(--text3)',fontSize:'12px',fontWeight:'600',cursor:'pointer'},onclick:function(){refresh('delete',[]);}}, '🗑️ Excluir'),
    ]),
    mode==='delete'&&selected.length>0?el('div',{style:{background:'var(--red-dim)',border:'1px solid var(--red)',borderRadius:'6px',padding:'8px 12px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}},[
      el('span',{style:{fontSize:'12px',color:'var(--red)',fontWeight:'600'}},selected.length+' selecionada(s)'),
      el('button',{style:{padding:'5px 12px',background:'var(--red)',color:'#fff',border:'none',borderRadius:'4px',fontSize:'12px',fontWeight:'700',cursor:'pointer'},onclick:deleteSelected},'Excluir selecionadas'),
    ]):null,
    el('div',{style:{maxHeight:'280px',overflowY:'auto'}},items),
    el('div',{style:{display:'flex',gap:'8px',marginTop:'14px'}},[
      el('input',{class:'form-input',id:'cm-new-inp',placeholder:'Nova categoria...',style:{flex:'1'},onkeydown:function(e){if(e.key==='Enter')addCat();}}),
      el('button',{class:'btn-primary',onclick:addCat},'+  Adicionar'),
    ]),
    mode==='delete'?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'8px',textAlign:'center'}},'Selecione as categorias que deseja remover'):null,
  ].filter(Boolean));
  modal.style.maxWidth='420px';

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({catManager:null});};
  return ov;
}
