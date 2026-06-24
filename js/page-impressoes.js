// ── SETORES DE IMPRESSÃO ──────────────────────────────────────────────────────

function renderImpressoes() {
  var setores = (state.setoresImpressao || []).filter(function(s){ return s.profile === state.profile; });

  var COR_OPCOES = ['#c9a84c','#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d'];

  if (state.setorModal !== null && state.setorModal !== undefined) {
    var sm = state.setorModal;
    var isEd = !!(sm.id);

    var nomeInp = el('input',{class:'form-input',value:sm.nome||'',placeholder:'Ex: Cozinha, Bar, Balcão...',oninput:function(){sm.nome=this.value;}});

    var corSel = el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}},
      COR_OPCOES.map(function(cor) {
        var b = el('button',{});
        b.style.cssText='width:28px;height:28px;border-radius:50%;background:'+cor+';border:3px solid '
          +((sm.cor||COR_OPCOES[0])===cor?'var(--text)':'transparent')+';cursor:pointer;transition:border .1s;';
        b.onclick=function(e){e.preventDefault();sm.cor=cor;setState({setorModal:Object.assign({},state.setorModal,{cor:cor})});};
        return b;
      }));

    function salvarSetor() {
      var nome=(sm.nome||'').trim();
      if(!nome){showToast('Informe o nome do setor','error');return;}
      var item={id:isEd?sm.id:('set_'+Date.now()),nome:nome,cor:sm.cor||COR_OPCOES[0],profile:state.profile,ativo:true};
      var arr=isEd
        ?(state.setoresImpressao||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.setoresImpressao||[]).concat([item]);
      lsSet('setoresImpressao',arr);
      setState({setoresImpressao:arr,setorModal:null});
      scheduleSave();
      logAudit((isEd?'editou':'criou')+' setor impressão',nome);
      showToast(isEd?'Setor atualizado!':'Setor cadastrado!');
    }

    var modal=el('div',{class:'modal',style:{maxWidth:'400px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEd?'✏️ Editar':'➕ Novo')+' Setor de Impressão'),
        el('button',{class:'modal-close',onclick:function(){setState({setorModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        div('form-group',[el('label',{class:'form-label'},'Nome do setor *'),nomeInp]),
        div('form-group',[el('label',{class:'form-label'},'Cor identificadora'),corSel]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({setorModal:null});}),
        btn('btn-primary',isEd?'💾 Salvar':'➕ Criar',salvarSetor),
      ]),
    ]);
    var ov=div('modal-overlay',[modal]);
    ov.onclick=function(e){if(e.target===ov)setState({setorModal:null});};
    return el('div',{class:'page-content'},[
      el('div',{class:'page-header'},[
        el('h2',{class:'page-title'},'🖨️ Setores de Impressão'),
        el('p',{class:'page-sub'},'Gerencie os setores onde os pedidos são impressos'),
      ]),
      ov,
    ]);
  }

  var rows = setores.map(function(s) {
    var qtdProds = (state.produtos||[]).filter(function(p){return p.setorImpressao===s.id&&p.profile===state.profile;}).length;
    return el('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:'1px solid var(--border)'}},[
      el('div',{style:{width:'14px',height:'14px',borderRadius:'50%',background:s.cor||'var(--gold)',flexShrink:'0'}}),
      el('div',{style:{flex:'1'}},[
        el('div',{style:{fontWeight:'600',fontSize:'14px'}},s.nome),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},qtdProds+' produto(s) vinculado(s)'),
      ]),
      el('div',{style:{display:'flex',gap:'6px'}},[
        el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({setorModal:Object.assign({},s)});}}, '✏️'),
        el('button',{class:'btn-icon',title:'Excluir',style:{color:'var(--danger)'},onclick:function(){
          if(!window.confirm('Excluir setor "'+s.nome+'"?'))return;
          var arr=(state.setoresImpressao||[]).filter(function(x){return x.id!==s.id;});
          lsSet('setoresImpressao',arr);
          setState({setoresImpressao:arr});
          scheduleSave();
          showToast('Setor removido','error');
        }}, '🗑'),
      ]),
    ]);
  });

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'🖨️ Setores de Impressão'),
        el('p',{class:'page-sub'},'Configure onde cada item do pedido é impresso — Cozinha, Bar, Balcão...'),
      ]),
      btn('btn-primary','➕ Novo setor',function(){setState({setorModal:{}});}),
    ]),
    el('div',{class:'card'},[
      setores.length===0
        ? div('empty',[
            div('empty-icon','🖨️'),
            div('empty-title','Nenhum setor configurado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Crie setores como "Cozinha", "Bar" e "Balcão" para organizar a impressão dos pedidos.'),
            btn('btn-primary','➕ Criar primeiro setor',function(){setState({setorModal:{}});}),
          ])
        : el('div',{style:{padding:'0 4px'}},rows),
    ]),
  ]);
}
