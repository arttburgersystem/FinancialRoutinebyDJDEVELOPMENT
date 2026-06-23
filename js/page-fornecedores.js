// ── AUTOCOMPLETE DE FORNECEDOR/DESTINATÁRIO ───────────────────────────────────
function buildFornecedorInput(currentValue, currentId){
  var selectedIndex=-1;
  var filtered=[];
  var inputEl,dropEl,hiddenEl;

  function getFornecedores(){
    return (state.fornecedores||[])
      .filter(function(f){return !f.profile||f.profile===state.profile;})
      .sort(function(a,b){return a.nome.localeCompare(b.nome);});
  }

  function doFilter(query){
    var q=(query||'').toLowerCase().trim();
    var all=getFornecedores();
    if(!q)return all.slice(0,10);
    return all.filter(function(f){
      return f.nome.toLowerCase().indexOf(q)!==-1||
        (f.documento&&f.documento.indexOf(q)!==-1);
    }).slice(0,10);
  }

  function closeDropdown(){
    if(dropEl)dropEl.style.display='none';
    selectedIndex=-1;
  }

  function selectItem(f){
    inputEl.value=f.nome;
    hiddenEl.value=f.id;
    closeDropdown();
  }

  function updateHighlight(){
    var items=dropEl.querySelectorAll('[data-forn-idx]');
    items.forEach(function(item,i){
      item.style.background=i===selectedIndex?'var(--gold-dim)':'';
    });
    if(selectedIndex>=0&&items[selectedIndex]){
      items[selectedIndex].scrollIntoView({block:'nearest'});
    }
  }

  function buildHighlight(nome,query){
    var frag=document.createDocumentFragment();
    if(!query){frag.appendChild(document.createTextNode(nome));return frag;}
    var idx=nome.toLowerCase().indexOf(query.toLowerCase());
    if(idx===-1){frag.appendChild(document.createTextNode(nome));return frag;}
    frag.appendChild(document.createTextNode(nome.slice(0,idx)));
    var mark=document.createElement('mark');
    mark.style.cssText='background:var(--gold);color:#000;border-radius:2px;padding:0 2px;';
    mark.textContent=nome.slice(idx,idx+query.length);
    frag.appendChild(mark);
    frag.appendChild(document.createTextNode(nome.slice(idx+query.length)));
    return frag;
  }

  function openDropdown(query){
    filtered=doFilter(query);
    dropEl.innerHTML='';

    if(filtered.length>0){
      filtered.forEach(function(f,i){
        var row=el('div',{
          'data-forn-idx':String(i),
          style:{padding:'9px 14px',cursor:'pointer',display:'flex',
            justifyContent:'space-between',alignItems:'center',
            borderBottom:'1px solid var(--border)',fontSize:'13px',transition:'background .08s'},
          onmousedown:function(e){e.preventDefault();selectItem(f);},
          onmouseenter:function(){selectedIndex=i;updateHighlight();},
        });
        var nomeSpan=el('span',{style:{fontWeight:'500'}});
        nomeSpan.appendChild(buildHighlight(f.nome,query));
        row.appendChild(nomeSpan);
        if(f.documento||f.tipo){
          row.appendChild(el('span',{style:{fontSize:'10px',color:'var(--text3)'}},
            [f.tipo||'',f.documento].filter(Boolean).join(' · ')));
        }
        dropEl.appendChild(row);
      });
    } else if(query.trim()){
      dropEl.appendChild(el('div',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},
        '↵ Enter para cadastrar "'+query.trim()+'" como novo'));
    } else {
      dropEl.appendChild(el('div',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},
        'Nenhum fornecedor cadastrado. Digite para criar.'));
    }

    var footer=el('div',{
      style:{padding:'7px 14px',fontSize:'11px',color:'var(--gold)',cursor:'pointer',
        borderTop:'1px solid var(--border)',background:'var(--bg3)',display:'flex',
        alignItems:'center',gap:'6px'},
      onmousedown:function(e){e.preventDefault();setState({modal:null});setTimeout(function(){setState({page:'fornecedores'});},50);},
    },[el('span',{},'⚙'),el('span',{},'Gerenciar fornecedores')]);
    dropEl.appendChild(footer);
    dropEl.style.display='block';
  }

  inputEl=el('input',{
    class:'form-input',
    id:'mf-fornecedor-input',
    type:'text',
    placeholder:'Digite para buscar ou criar...',
    autocomplete:'off',
    oninput:function(e){openDropdown(e.target.value);hiddenEl.value='';},
    onfocus:function(e){openDropdown(e.target.value);},
    onblur:function(){setTimeout(closeDropdown,200);},
    onkeydown:function(e){
      var items=dropEl.querySelectorAll('[data-forn-idx]');
      if(e.key==='ArrowDown'){
        e.preventDefault();
        selectedIndex=Math.min(selectedIndex+1,items.length-1);
        updateHighlight();
      } else if(e.key==='ArrowUp'){
        e.preventDefault();
        selectedIndex=Math.max(selectedIndex-1,0);
        updateHighlight();
      } else if(e.key==='Tab'){
        if(dropEl.style.display!=='none'){
          e.preventDefault();
          if(selectedIndex>=0&&filtered[selectedIndex]){
            selectItem(filtered[selectedIndex]);
          } else if(filtered.length>0){
            selectItem(filtered[0]);
          }
        }
      } else if(e.key==='Enter'){
        e.preventDefault();
        if(selectedIndex>=0&&filtered[selectedIndex]){
          selectItem(filtered[selectedIndex]);
        } else if(filtered.length===0&&inputEl.value.trim()){
          // Cria novo sem re-render (para não fechar o modal)
          var nome=inputEl.value.trim();
          var novo={id:'forn_'+Date.now(),nome:nome,profile:state.profile,
            tipo:'fornecedor',documento:'',telefone:'',email:'',notas:''};
          state.fornecedores=(state.fornecedores||[]).concat([novo]);
          lsSet('fornecedores',state.fornecedores);
          scheduleSave();
          hiddenEl.value=novo.id;
          closeDropdown();
          showToast('"'+nome+'" cadastrado como fornecedor!');
        }
      } else if(e.key==='Escape'){
        closeDropdown();
      }
    },
  });
  inputEl.value=currentValue||'';

  hiddenEl=el('input',{type:'hidden',id:'mf-fornecedor-id'});
  hiddenEl.value=currentId||'';

  dropEl=el('div',{id:'mf-forn-drop',style:{
    position:'absolute',zIndex:'3000',left:'0',right:'0',top:'100%',
    background:'var(--bg2)',border:'1px solid var(--border2)',
    borderRadius:'0 0 var(--radius-sm) var(--radius-sm)',
    boxShadow:'0 8px 32px rgba(0,0,0,.4)',
    maxHeight:'240px',overflowY:'auto',display:'none',
  }});

  return el('div',{style:{position:'relative'}},[inputEl,hiddenEl,dropEl]);
}

// ── PÁGINA FORNECEDORES ───────────────────────────────────────────────────────
function renderFornecedores(){
  var fornecedores=(state.fornecedores||[])
    .filter(function(f){return !f.profile||f.profile===state.profile;});

  // ── MODAL ADD/EDIT ─────────────────────────────────────────────────────────
  if(state.fornecedorModal){
    var m=state.fornecedorModal;
    var ed=m.editItem||{};
    var isEdit=!!ed.id;

    function gf(id){var e=document.getElementById('forn-'+id);return e?e.value:'';}

    function saveForn(){
      var nome=(gf('nome')||'').trim();
      if(!nome){showToast('Informe o nome','error');return;}
      var item={
        id:isEdit?ed.id:('forn_'+Date.now()),
        nome:nome,
        tipo:gf('tipo')||'fornecedor',
        documento:(gf('documento')||'').trim(),
        telefone:(gf('telefone')||'').trim(),
        email:(gf('email')||'').trim(),
        notas:(gf('notas')||'').trim(),
        profile:state.profile,
      };
      var arr=isEdit
        ?(state.fornecedores||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.fornecedores||[]).concat([item]);
      lsSet('fornecedores',arr);
      setState({fornecedores:arr,fornecedorModal:null});
      scheduleSave();
      showToast(isEdit?'Fornecedor atualizado!':'Fornecedor cadastrado!');
    }

    function inp2(id,type,ph,val){
      var i=el('input',{class:'form-input',type:type||'text',id:'forn-'+id,placeholder:ph||''});
      i.value=val!==undefined?String(val):'';
      return i;
    }

    var tipoOpts=[
      {v:'fornecedor',l:'Fornecedor'},
      {v:'cliente',l:'Cliente / Destinatário'},
      {v:'ambos',l:'Fornec. / Cliente (ambos)'},
      {v:'outro',l:'Outro'},
    ];
    var tipoSel=el('select',{class:'form-input',id:'forn-tipo'},
      tipoOpts.map(function(t){
        var op=el('option',{value:t.v},t.l);
        if(t.v===(ed.tipo||'fornecedor'))op.selected=true;
        return op;
      }));

    var mEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEdit?'Editar':'Novo')+' fornecedor / destinatário'),
        el('button',{class:'modal-close',onclick:function(){setState({fornecedorModal:null});}},'×'),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Nome *'),inp2('nome','text','Nome do fornecedor, empresa ou pessoa...',ed.nome||'')]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Tipo'),tipoSel]),
        div('form-group',[el('label',{class:'form-label'},'CPF / CNPJ'),inp2('documento','text','000.000.000-00',ed.documento||'')]),
      ]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Telefone'),inp2('telefone','tel','(00) 00000-0000',ed.telefone||'')]),
        div('form-group',[el('label',{class:'form-label'},'E-mail'),inp2('email','email','contato@email.com',ed.email||'')]),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Observações'),
        el('textarea',{class:'form-input',id:'forn-notas',rows:'2',
          placeholder:'Endereço, condições comerciais, contato adicional...',
          style:{resize:'vertical'}},ed.notas||''),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({fornecedorModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'➕ Cadastrar',saveForn),
      ]),
    ]);
    mEl.style.maxWidth='480px';
    var ov=div('modal-overlay',[mEl]);
    ov.onclick=function(e){if(e.target===ov)setState({fornecedorModal:null});};
    setTimeout(function(){var i=document.getElementById('forn-nome');if(i)i.focus();},50);
    return ov;
  }

  // ── LISTA ──────────────────────────────────────────────────────────────────
  var TIPO_LABEL={fornecedor:'Fornecedor',cliente:'Cliente',ambos:'Ambos',outro:'Outro'};
  var TIPO_COLOR={fornecedor:'var(--blue)',cliente:'var(--green)',ambos:'var(--gold)',outro:'var(--text3)'};

  var sorted=fornecedores.slice().sort(function(a,b){return a.nome.localeCompare(b.nome);});

  var rows=sorted.map(function(f){
    return el('tr',{
      style:{borderBottom:'1px solid var(--border)'},
      onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){e.currentTarget.style.background='';},
    },[
      el('td',{style:{padding:'10px 14px',fontWeight:'600',fontSize:'13px'}},f.nome),
      el('td',{style:{padding:'10px 14px'}},[
        el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'2px 9px',borderRadius:'10px',
          background:'var(--bg3)',color:TIPO_COLOR[f.tipo]||'var(--text3)'}},
          TIPO_LABEL[f.tipo]||f.tipo||'—'),
      ]),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},f.documento||'—'),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},f.telefone||'—'),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},f.email||'—'),
      el('td',{style:{padding:'8px 10px',textAlign:'right'}},[
        el('div',{style:{display:'flex',gap:'6px',justifyContent:'flex-end'}},[
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({fornecedorModal:{editItem:f}});}},'✏️'),
          el('button',{class:'btn-icon delete',title:'Excluir',onclick:function(){
            if(window.confirm('Excluir "'+f.nome+'"?')){
              var arr=(state.fornecedores||[]).filter(function(x){return x.id!==f.id;});
              lsSet('fornecedores',arr);setState({fornecedores:arr});scheduleSave();
              showToast('Fornecedor removido','error');
            }
          }},'🗑'),
        ]),
      ]),
    ]);
  });

  return div('',[
    div('page-header',[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},[
        el('div',{},[
          el('h1',{},'🏪 Fornecedores & Destinatários'),
          el('p',{},'Cadastre quem recebe ou envia valores para uso nos lançamentos'),
        ]),
        btn('btn-primary','➕ Novo fornecedor',function(){setState({fornecedorModal:{}});}),
      ]),
    ]),
    div('card',[
      fornecedores.length===0
        ?div('empty',[
            div('empty-icon','🏪'),
            div('empty-title','Nenhum fornecedor cadastrado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},
              'Cadastre fornecedores para usar o autocomplete nos lançamentos de despesas.'),
            btn('btn-primary','➕ Cadastrar primeiro fornecedor',function(){setState({fornecedorModal:{}});}),
          ])
        :el('div',{style:{overflowX:'auto'}},[
            el('div',{style:{marginBottom:'10px',fontSize:'12px',color:'var(--text3)'}},[
              el('span',{},fornecedores.length+' cadastro'+(fornecedores.length!==1?'s':'')+' neste perfil'),
            ]),
            el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
              el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Nome'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Tipo'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Documento'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'Telefone'),
                el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},'E-mail'),
                el('th',{}),
              ])]),
              el('tbody',{},rows),
            ]),
          ]),
    ]),
  ]);
}
