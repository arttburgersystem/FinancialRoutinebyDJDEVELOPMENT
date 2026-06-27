// ── AUTOCOMPLETE DE FORNECEDOR/DESTINATÁRIO ───────────────────────────────────
function buildFornecedorInput(currentValue, currentId){
  var selectedIndex=-1;
  var filtered=[];
  var inputEl,dropEl,hiddenEl;

  function getFornecedores(){
    var forn=(state.fornecedores||[])
      .filter(function(f){return !f.profile||f.profile===state.profile;})
      .map(function(f){return Object.assign({},f,{_tipo:'fornecedor'});});
    var adm=(state.administradores||[])
      .filter(function(a){return a.profile===state.profile;})
      .map(function(a){return Object.assign({},a,{_tipo:'admin',tipo:a.cargo||'Sócio',documento:a.cpf||''});});
    return forn.concat(adm).sort(function(a,b){return a.nome.localeCompare(b.nome);});
  }

  function doFilter(query){
    var q=(query||'').toLowerCase().trim();
    var all=getFornecedores();
    if(!q)return all.slice(0,12);
    return all.filter(function(f){
      return f.nome.toLowerCase().indexOf(q)!==-1||
        (f.documento&&f.documento.indexOf(q)!==-1)||
        (f.tipo&&f.tipo.toLowerCase().indexOf(q)!==-1);
    }).slice(0,12);
  }

  function closeDropdown(){if(dropEl)dropEl.style.display='none';selectedIndex=-1;}

  function selectItem(f){inputEl.value=f.nome;hiddenEl.value=f.id;closeDropdown();}

  function updateHighlight(){
    var items=dropEl.querySelectorAll('[data-forn-idx]');
    items.forEach(function(item,i){item.style.background=i===selectedIndex?'var(--gold-dim)':'';});
    if(selectedIndex>=0&&items[selectedIndex])items[selectedIndex].scrollIntoView({block:'nearest'});
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
          style:{padding:'9px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',
            alignItems:'center',borderBottom:'1px solid var(--border)',fontSize:'13px',transition:'background .08s'},
          onmousedown:function(e){e.preventDefault();selectItem(f);},
          onmouseenter:function(){selectedIndex=i;updateHighlight();},
        });
        var nomeSpan=el('span',{style:{fontWeight:'500',display:'flex',alignItems:'center',gap:'6px'}});
        if(f._tipo==='admin'){
          var badge=el('span',{style:{fontSize:'9px',fontWeight:'700',background:'rgba(201,168,76,0.15)',color:'var(--gold)',border:'1px solid var(--gold)',borderRadius:'3px',padding:'0 4px',flexShrink:'0'}},'👤 Sócio');
          nomeSpan.appendChild(badge);
        }
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
        borderTop:'1px solid var(--border)',background:'var(--bg3)',display:'flex',alignItems:'center',gap:'6px'},
      onmousedown:function(e){e.preventDefault();setState({modal:null});setTimeout(function(){setState({page:'fornecedores'});},50);},
    },[el('span',{},'⚙'),el('span',{},'Gerenciar fornecedores')]);
    dropEl.appendChild(footer);
    dropEl.style.display='block';
  }

  inputEl=el('input',{
    class:'form-input',id:'mf-fornecedor-input',type:'text',
    placeholder:'Digite para buscar ou criar...',autocomplete:'off',
    oninput:function(e){openDropdown(e.target.value);hiddenEl.value='';},
    onfocus:function(e){openDropdown(e.target.value);},
    onblur:function(){setTimeout(closeDropdown,200);},
    onkeydown:function(e){
      var items=dropEl.querySelectorAll('[data-forn-idx]');
      if(e.key==='ArrowDown'){e.preventDefault();selectedIndex=Math.min(selectedIndex+1,items.length-1);updateHighlight();}
      else if(e.key==='ArrowUp'){e.preventDefault();selectedIndex=Math.max(selectedIndex-1,0);updateHighlight();}
      else if(e.key==='Tab'){
        if(dropEl.style.display!=='none'){
          e.preventDefault();
          if(selectedIndex>=0&&filtered[selectedIndex])selectItem(filtered[selectedIndex]);
          else if(filtered.length>0)selectItem(filtered[0]);
        }
      } else if(e.key==='Enter'){
        e.preventDefault();
        if(selectedIndex>=0&&filtered[selectedIndex])selectItem(filtered[selectedIndex]);
        else if(filtered.length===0&&inputEl.value.trim()){
          var nome=inputEl.value.trim();
          var novo={id:'forn_'+Date.now(),nome:nome,profile:state.profile,tipo:'fornecedor',documento:'',telefone:'',email:'',notas:''};
          state.fornecedores=(state.fornecedores||[]).concat([novo]);
          lsSet('fornecedores',state.fornecedores);
          scheduleSave();
          hiddenEl.value=novo.id;
          closeDropdown();
          showToast('"'+nome+'" cadastrado como fornecedor!');
        }
      } else if(e.key==='Escape'){closeDropdown();}
    },
  });
  inputEl.value=currentValue||'';
  hiddenEl=el('input',{type:'hidden',id:'mf-fornecedor-id'});
  hiddenEl.value=currentId||'';
  dropEl=el('div',{id:'mf-forn-drop',style:{
    position:'absolute',zIndex:'3000',left:'0',right:'0',top:'100%',
    background:'var(--bg2)',border:'1px solid var(--border2)',
    borderRadius:'0 0 var(--radius-sm) var(--radius-sm)',
    boxShadow:'0 8px 32px rgba(0,0,0,.4)',maxHeight:'240px',overflowY:'auto',display:'none',
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
    var isEdit=!!(ed.id);

    function gf(id){var e=document.getElementById('forn-'+id);return e?e.value:'';}

    // Captura todos os valores digitados no DOM antes de qualquer re-render
    function snapForm(){
      var flds=['nome','nomeFantasia','tipo','documento','inscricao','site',
                'telefone','celular','email','contato','cep','rua','numero',
                'complemento','bairro','cidade','estado','prazo','limite','notas'];
      var r={};
      flds.forEach(function(f){var e=document.getElementById('forn-'+f);if(e)r[f]=e.value;});
      return r;
    }

    function buscarCep(){
      var cep=(gf('cep')||'').replace(/\D/g,'');
      if(cep.length!==8){showToast('CEP inválido','error');return;}
      var b=document.getElementById('forn-cep-btn');
      if(b){b.textContent='⏳';b.disabled=true;}
      fetch('https://viacep.com.br/ws/'+cep+'/json/')
        .then(function(r){return r.json();})
        .then(function(d){
          if(d.erro){
            var b2=document.getElementById('forn-cep-btn');
            if(b2){b2.textContent='Buscar';b2.disabled=false;}
            showToast('CEP não encontrado','error');
            return;
          }
          // Captura o que o usuário já digitou, mescla com o retorno e salva no state
          var snap=snapForm();
          var merged=Object.assign({},ed,snap,{
            rua:d.logradouro||snap.rua||'',
            bairro:d.bairro||snap.bairro||'',
            cidade:d.localidade||snap.cidade||'',
            estado:d.uf||snap.estado||'',
          });
          setState({fornecedorModal:{editItem:merged}});
          showToast('Endereço encontrado!');
          setTimeout(function(){var n=document.getElementById('forn-numero');if(n)n.focus();},80);
        })
        .catch(function(){
          var b2=document.getElementById('forn-cep-btn');
          if(b2){b2.textContent='Buscar';b2.disabled=false;}
          showToast('Erro ao buscar CEP','error');
        });
    }

    function buscarCnpj(){
      var cnpj=(gf('documento')||'').replace(/\D/g,'');
      if(cnpj.length!==14){showToast('CNPJ deve ter 14 dígitos','error');return;}
      var b=document.getElementById('forn-cnpj-btn');
      if(b){b.textContent='⏳';b.disabled=true;}
      fetch('https://brasilapi.com.br/api/cnpj/v1/'+cnpj)
        .then(function(r){
          if(!r.ok)throw new Error('status '+r.status);
          return r.json();
        })
        .then(function(d){
          var snap=snapForm();
          var cnpjFmt=cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
          var tel=(d.telefone||'').replace(/\D/g,'');
          var telFmt=tel.length===10?tel.replace(/^(\d{2})(\d{4})(\d{4})$/,'($1) $2-$3'):
                     tel.length===11?tel.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3'):(d.telefone||'');
          var cepNum=(d.cep||'').replace(/\D/g,'');
          var cepFmt=cepNum.length===8?cepNum.replace(/^(\d{5})(\d{3})$/,'$1-$2'):(d.cep||'');
          function tc(s){if(!s)return'';return s.toUpperCase()===s?s.replace(/\b\w/g,function(c){return c.toUpperCase();}):s;}
          var notas=[
            d.descricao_situacao_cadastral||d.situacao_cadastral||'',
            d.descricao_natureza_juridica||'',
            d.descricao_porte||d.porte||'',
          ].filter(Boolean).join(' · ');
          // Mescla: state do item editado < valores digitados < dados da API
          var merged=Object.assign({},ed,snap,{
            documento:cnpjFmt,
            nome:d.razao_social||snap.nome||'',
            nomeFantasia:(d.nome_fantasia&&d.nome_fantasia.trim())?d.nome_fantasia.trim():(snap.nomeFantasia||''),
            telefone:telFmt||snap.telefone||'',
            email:d.email||snap.email||'',
            cep:cepFmt||snap.cep||'',
            rua:tc(d.logradouro)||snap.rua||'',
            numero:d.numero||snap.numero||'',
            complemento:d.complemento||snap.complemento||'',
            bairro:tc(d.bairro)||snap.bairro||'',
            cidade:tc(d.municipio)||snap.cidade||'',
            estado:d.uf||snap.estado||'',
            notas:notas||snap.notas||'',
          });
          setState({fornecedorModal:{editItem:merged}});
          showToast('Dados do CNPJ carregados! Confirme e salve.');
        })
        .catch(function(){
          var b2=document.getElementById('forn-cnpj-btn');
          if(b2){b2.textContent='🔍 Consultar';b2.disabled=false;}
          showToast('CNPJ não encontrado ou serviço indisponível','error');
        });
    }

    function saveForn(){
      var nome=(gf('nome')||'').trim();
      if(!nome){showToast('Informe o nome','error');return;}
      var item={
        id:isEdit?ed.id:('forn_'+Date.now()),
        nome:nome,
        nomeFantasia:(gf('nomeFantasia')||'').trim(),
        tipo:gf('tipo')||'fornecedor',
        documento:(gf('documento')||'').trim(),
        inscricao:(gf('inscricao')||'').trim(),
        site:(gf('site')||'').trim(),
        telefone:(gf('telefone')||'').trim(),
        celular:(gf('celular')||'').trim(),
        email:(gf('email')||'').trim(),
        contato:(gf('contato')||'').trim(),
        cep:(gf('cep')||'').trim(),
        rua:(gf('rua')||'').trim(),
        numero:(gf('numero')||'').trim(),
        complemento:(gf('complemento')||'').trim(),
        bairro:(gf('bairro')||'').trim(),
        cidade:(gf('cidade')||'').trim(),
        estado:(gf('estado')||'').trim(),
        prazo:(gf('prazo')||'').trim(),
        limite:parseFloat(gf('limite'))||0,
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
      tipoOpts.map(function(t){var op=el('option',{value:t.v},t.l);if(t.v===(ed.tipo||'fornecedor'))op.selected=true;return op;}));

    function fg(label,inp){return div('form-group',[el('label',{class:'form-label'},label),inp]);}
    function grid2(a,b){var g=el('div',{},[a,b]);g.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;';return g;}
    function secTitle(icon,label){
      var d2=el('div',{},icon+' '+label);
      d2.style.cssText='font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:10px;';
      return d2;
    }
    function secBox(children){
      var b=el('div',{},children);
      b.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;';
      return b;
    }

    var cepRow=el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'12px'}},[
      el('div',{style:{flex:'1'}},[el('label',{class:'form-label'},'CEP'),inp2('cep','text','00000-000',ed.cep||'')]),
      el('button',{id:'forn-cep-btn',class:'btn-ghost',style:{whiteSpace:'nowrap',padding:'8px 14px'},onclick:buscarCep},'Buscar'),
    ]);

    var mEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEdit?'Editar':'Novo')+' fornecedor / destinatário'),
        el('button',{class:'modal-close',onclick:function(){setState({fornecedorModal:null});}},'×'),
      ]),

      secBox([
        secTitle('🏢','Identificação'),
        el('div',{style:{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.25)',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',fontSize:'12px',color:'var(--blue)'}},[
          el('strong',{},'💡 Dica: '),
          el('span',{},'Digite o CNPJ no campo abaixo e clique em "🔍 Consultar" para preencher os dados automaticamente.'),
        ]),
        el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'12px'}},[
          el('div',{style:{flex:'1'}},[
            el('label',{class:'form-label'},'CPF / CNPJ'),
            inp2('documento','text','00.000.000/0000-00 ou 000.000.000-00',ed.documento||''),
          ]),
          el('button',{id:'forn-cnpj-btn',class:'btn-primary',
            style:{whiteSpace:'nowrap',padding:'8px 14px',fontSize:'12px',flexShrink:'0'},
            onclick:buscarCnpj},'🔍 Consultar'),
        ]),
        div('form-group',[el('label',{class:'form-label'},'Nome / Razão Social *'),inp2('nome','text','Nome da empresa ou pessoa física...',ed.nome||'')]),
        div('form-group',[el('label',{class:'form-label'},'Nome Fantasia / Apelido'),inp2('nomeFantasia','text','Como é conhecido no dia a dia...',ed.nomeFantasia||'')]),
        grid2(fg('Tipo',tipoSel),fg('Inscrição Estadual / Municipal',inp2('inscricao','text','IE ou IM',ed.inscricao||''))),
        fg('Site',inp2('site','url','https://site.com.br',ed.site||'')),
      ]),

      secBox([
        secTitle('📞','Contato'),
        fg('Responsável / Contato',inp2('contato','text','Nome do contato principal',ed.contato||'')),
        grid2(fg('Telefone fixo',inp2('telefone','tel','(00) 0000-0000',ed.telefone||'')),fg('Celular / WhatsApp',inp2('celular','tel','(00) 00000-0000',ed.celular||''))),
        fg('E-mail',inp2('email','email','contato@empresa.com.br',ed.email||'')),
      ]),

      secBox([
        secTitle('📍','Endereço'),
        cepRow,
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 90px',gap:'12px',marginBottom:'12px'}},[
          fg('Rua / Avenida',inp2('rua','text','Logradouro',ed.rua||'')),
          fg('Número',inp2('numero','text','Nº',ed.numero||'')),
        ]),
        grid2(fg('Complemento',inp2('complemento','text','Sala, Andar, Bloco...',ed.complemento||'')),fg('Bairro',inp2('bairro','text','Bairro',ed.bairro||''))),
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 70px',gap:'12px'}},[
          fg('Cidade',inp2('cidade','text','Cidade',ed.cidade||'')),
          fg('UF',inp2('estado','text','UF',ed.estado||'')),
        ]),
      ]),

      secBox([
        secTitle('💰','Condições comerciais'),
        grid2(fg('Prazo de pagamento',inp2('prazo','text','Ex: 30/60/90 dias, à vista...',ed.prazo||'')),
          fg('Limite de crédito (R$)',inp2('limite','number','0,00',ed.limite||''))),
      ]),

      div('form-group',[
        el('label',{class:'form-label'},'Observações'),
        el('textarea',{class:'form-input',id:'forn-notas',rows:'2',
          placeholder:'Observações gerais, acordos especiais, histórico...',
          style:{resize:'vertical'}},ed.notas||''),
      ]),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({fornecedorModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'➕ Cadastrar',saveForn),
      ]),
    ]);
    mEl.style.maxWidth='560px';
    var ov=div('modal-overlay',[mEl]);
    ov.onclick=function(e){if(e.target===ov)setState({fornecedorModal:null});};
    setTimeout(function(){var i=document.getElementById('forn-nome');if(i)i.focus();},50);
    return ov;
  }

  // ── LISTA ──────────────────────────────────────────────────────────────────
  var TIPO_LABEL={fornecedor:'Fornecedor',cliente:'Cliente',ambos:'Ambos',outro:'Outro'};
  var TIPO_COLOR={fornecedor:'var(--blue)',cliente:'var(--green)',ambos:'var(--gold)',outro:'var(--text3)'};

  var busca = (state.fornBusca||'').toLowerCase().trim();
  var sorted = fornecedores.slice().sort(function(a,b){return a.nome.localeCompare(b.nome);}).filter(function(f){
    if(!busca) return true;
    return (f.nome||'').toLowerCase().includes(busca)
      || (f.nomeFantasia||'').toLowerCase().includes(busca)
      || (f.documento||'').toLowerCase().includes(busca)
      || (f.email||'').toLowerCase().includes(busca)
      || (f.telefone||'').toLowerCase().includes(busca)
      || (f.celular||'').toLowerCase().includes(busca)
      || (f.cidade||'').toLowerCase().includes(busca)
      || (f.contato||'').toLowerCase().includes(busca);
  });

  var rows=sorted.map(function(f){
    var endStr=[f.cidade,f.estado].filter(Boolean).join('/');
    return el('tr',{
      style:{borderBottom:'1px solid var(--border)'},
      onmouseenter:function(e){e.currentTarget.style.background='var(--bg3)';},
      onmouseleave:function(e){e.currentTarget.style.background='';},
    },[
      el('td',{style:{padding:'10px 14px'}},[
        el('div',{style:{fontWeight:'600',fontSize:'13px'}},f.nome),
        f.nomeFantasia?el('div',{style:{fontSize:'11px',color:'var(--gold)',marginTop:'1px',fontWeight:'500'}},'🏷 '+f.nomeFantasia):null,
        endStr?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'📍 '+endStr):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'10px 14px'}},[
        el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'2px 9px',borderRadius:'10px',
          background:'var(--bg3)',color:TIPO_COLOR[f.tipo]||'var(--text3)'}},
          TIPO_LABEL[f.tipo]||f.tipo||'—'),
      ]),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},[
        f.documento?el('div',{},f.documento):null,
        f.inscricao?el('div',{style:{fontSize:'11px'}},f.inscricao):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},[
        f.contato?el('div',{style:{fontWeight:'500',color:'var(--text)'}},f.contato):null,
        f.celular?el('div',{},f.celular):f.telefone?el('div',{},f.telefone):null,
        f.email?el('div',{style:{fontSize:'11px'}},f.email):null,
      ].filter(Boolean)),
      el('td',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},[
        f.prazo?el('div',{},'Prazo: '+f.prazo):null,
        f.limite?el('div',{style:{fontSize:'11px'}},'Limite: '+fmtMoney(f.limite)):null,
      ].filter(Boolean)),
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

  var searchInp = el('input',{
    type:'text', placeholder:'🔍  Buscar por nome, CNPJ, cidade, e-mail, telefone...',
    class:'form-input',
    value: state.fornBusca||'',
    style:{maxWidth:'420px',fontSize:'13px'},
    oninput: function(){ setState({fornBusca: this.value}); },
  });

  return div('',[
    div('page-header',[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px'}},[
        el('div',{},[
          el('h1',{},'🏪 Fornecedores & Destinatários'),
          el('p',{},'Cadastre com dados completos para uso nos lançamentos'),
        ]),
        el('div',{style:{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}},[
          searchInp,
          btn('btn-primary','➕ Novo fornecedor',function(){setState({fornecedorModal:{}});}),
        ]),
      ]),
    ]),
    div('card',[
      fornecedores.length===0
        ?div('empty',[
            div('empty-icon','🏪'),
            div('empty-title','Nenhum fornecedor cadastrado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},
              'Cadastre fornecedores e clientes para usar o autocomplete nos lançamentos.'),
            btn('btn-primary','➕ Cadastrar primeiro fornecedor',function(){setState({fornecedorModal:{}});}),
          ])
        :el('div',{style:{overflowX:'auto'}},[
            el('div',{style:{marginBottom:'10px',fontSize:'12px',color:'var(--text3)',display:'flex',gap:'12px',alignItems:'center'}},[
              el('span',{},sorted.length+' de '+fornecedores.length+' cadastro'+(fornecedores.length!==1?'s':'')+' neste perfil'),
              (busca && sorted.length===0) ? el('span',{style:{color:'var(--danger)',fontWeight:'600'}},'Nenhum resultado para "'+state.fornBusca+'"') : null,
              busca ? el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'2px 8px'},onclick:function(){setState({fornBusca:''});}}, '✕ Limpar busca') : null,
            ].filter(Boolean)),
            el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
              el('thead',{},[el('tr',{style:{borderBottom:'2px solid var(--border)'}},[
                'Nome / Cidade','Tipo','Documentos','Contato','Comercial','',
              ].map(function(h){return el('th',{style:{padding:'8px 14px',textAlign:'left',fontSize:'11px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase'}},h);}))]),
              el('tbody',{},rows),
            ]),
          ]),
    ]),
  ]);
}
