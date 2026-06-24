// ── BLOCO DE NOTAS ────────────────────────────────────────────────────────────

function _notasDoPerfil() {
  return (state.notas||[])
    .filter(function(n){return n.profile===state.profile;})
    .sort(function(a,b){return new Date(b.atualizadoEm)-new Date(a.atualizadoEm);});
}

// Salva uma nota com um único setState (1 re-render)
function _salvarNotaComPatch(nota, extraPatch) {
  var arr = (state.notas||[]);
  var idx = arr.findIndex(function(n){return n.id===nota.id;});
  var novas = idx>=0 ? arr.map(function(n){return n.id===nota.id?nota:n;}) : arr.concat([nota]);
  lsSet('notas', novas);
  scheduleSave();
  setState(Object.assign({notas:novas}, extraPatch||{}));
}

var _notaAutoSave = null;
function _autoSaveNota(id, conteudo) {
  clearTimeout(_notaAutoSave);
  _notaAutoSave = setTimeout(function(){
    var arr = (state.notas||[]);
    var idx = arr.findIndex(function(n){return n.id===id;});
    if (idx >= 0) {
      // Mutação direta — sem setState, sem re-render, sem destruir o textarea
      arr[idx] = Object.assign({}, arr[idx], {conteudo:conteudo, atualizadoEm:new Date().toISOString()});
      state.notas = arr.slice();
      lsSet('notas', state.notas);
      // Salva direto no Firebase sem passar pelo scheduleSave (evita re-render do badge)
      if(typeof fbPut==='function'&&typeof arrToObj==='function')
        fbPut('/notas', arrToObj(state.notas)).catch(function(){});
    }
  }, 800);
}

function _autoSaveTituloNota(id, titulo) {
  var arr = (state.notas||[]);
  var idx = arr.findIndex(function(n){return n.id===id;});
  if (idx >= 0) {
    arr[idx] = Object.assign({}, arr[idx], {titulo:titulo, atualizadoEm:new Date().toISOString()});
    state.notas = arr.slice();
    lsSet('notas', state.notas);
    scheduleSave();
    // Atualiza apenas o título na sidebar sem re-render completo
    var sidItems = document.querySelectorAll('._nota-sid-titulo[data-id="'+id+'"]');
    sidItems.forEach(function(el){el.textContent=titulo||'Sem título';});
  }
}

var NOTA_CORES = ['#c9a84c','#3b82f6','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#be185d'];

// ── PAINEL FLUTUANTE (touch bar) ──────────────────────────────────────────────
function renderNotaPanel() {
  var notas = _notasDoPerfil();
  var atualId = state.notaAtualId || (notas[0]&&notas[0].id) || null;
  var nota = atualId ? notas.find(function(n){return n.id===atualId;}) : null;

  var panel = el('div',{class:'float-panel nota-panel'});
  panel.style.cssText = 'position:fixed;top:52px;right:8px;width:420px;max-height:520px;'
    +'background:var(--bg2);border:1px solid var(--border);border-radius:12px;'
    +'box-shadow:0 8px 32px rgba(0,0,0,.28);z-index:500;display:flex;flex-direction:column;overflow:hidden;';

  // Header
  var hd = el('div',{style:{display:'flex',alignItems:'center',padding:'10px 14px',borderBottom:'1px solid var(--border)',gap:'8px',flexShrink:'0'}});
  hd.appendChild(el('span',{style:{fontSize:'16px'}},'📝'));
  hd.appendChild(el('span',{style:{fontWeight:'700',fontSize:'13px',flex:'1'}},'Bloco de Notas'));
  var newBtn = el('button',{class:'btn-primary',style:{fontSize:'11px',padding:'4px 10px'}});
  newBtn.textContent='+ Nova';
  newBtn.onclick = function(){
    var n={id:uid(),profile:state.profile,titulo:'Nova nota',conteudo:'',cor:NOTA_CORES[0],criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};
    var arr=(state.notas||[]).concat([n]);
    lsSet('notas',arr);
    scheduleSave();
    setState({notas:arr, notaAtualId:n.id});
  };
  hd.appendChild(newBtn);
  panel.appendChild(hd);

  if (notas.length === 0) {
    var empty = el('div',{style:{padding:'32px 20px',textAlign:'center',color:'var(--text3)',flex:'1'}});
    empty.innerHTML='<div style="font-size:32px;margin-bottom:8px">📝</div><div style="font-size:13px">Nenhuma nota ainda.<br>Clique em "+ Nova" para começar.</div>';
    panel.appendChild(empty);
    return panel;
  }

  // Body: lista + editor
  var body = el('div',{style:{display:'flex',flex:'1',overflow:'hidden',minHeight:'0'}});

  // Lista de notas
  var lista = el('div',{style:{width:'130px',flexShrink:'0',borderRight:'1px solid var(--border)',overflowY:'auto',padding:'6px 0'}});
  notas.forEach(function(n){
    var isAt = n.id===atualId;
    var item = el('div',{});
    item.style.cssText='padding:8px 10px;cursor:pointer;border-left:3px solid '+(isAt?(n.cor||'var(--gold)'):'transparent')+';'
      +'background:'+(isAt?'var(--bg3)':'transparent')+';transition:background .1s;';
    item.onmouseenter=function(){if(!isAt)this.style.background='var(--bg3)';};
    item.onmouseleave=function(){if(!isAt)this.style.background='transparent';};
    var dot=el('div',{style:{width:'8px',height:'8px',borderRadius:'50%',background:n.cor||'var(--gold)',marginBottom:'4px'}});
    var tituloEl=el('div',{'data-id':n.id,class:'_nota-sid-titulo',style:{fontSize:'11px',fontWeight:isAt?'700':'500',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},n.titulo||'Sem título');
    var data=el('div',{style:{fontSize:'9px',color:'var(--text3)',marginTop:'2px'}},new Date(n.atualizadoEm).toLocaleDateString('pt-BR'));
    item.appendChild(dot);item.appendChild(tituloEl);item.appendChild(data);
    item.onclick=function(){setState({notaAtualId:n.id});};
    lista.appendChild(item);
  });
  body.appendChild(lista);

  // Editor
  var editor = el('div',{style:{flex:'1',display:'flex',flexDirection:'column',overflow:'hidden'}});

  if (nota) {
    // Título
    var tituloRow = el('div',{style:{display:'flex',alignItems:'center',gap:'6px',padding:'8px 10px',borderBottom:'1px solid var(--border)',flexShrink:'0'}});
    var tituloInp = el('input',{style:{flex:'1',background:'none',border:'none',fontWeight:'700',fontSize:'13px',color:'var(--text)',fontFamily:'inherit',outline:'none'}});
    tituloInp.value = nota.titulo||'';
    tituloInp.onchange = function(){_autoSaveTituloNota(nota.id,this.value);};

    // Seletor de cor
    var corBtn = el('button',{style:{width:'16px',height:'16px',borderRadius:'50%',background:nota.cor||'var(--gold)',border:'2px solid var(--border)',cursor:'pointer',flexShrink:'0',position:'relative'}});
    corBtn.onclick = function(e){e.stopPropagation();setState({_notaCorPicker:state._notaCorPicker===nota.id?null:nota.id});};
    tituloRow.appendChild(tituloInp);
    tituloRow.appendChild(corBtn);

    if (state._notaCorPicker===nota.id) {
      var picker=el('div',{style:{position:'fixed',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'8px',display:'flex',gap:'6px',flexWrap:'wrap',zIndex:'601',boxShadow:'0 4px 12px rgba(0,0,0,.3)',width:'120px'}});
      NOTA_CORES.forEach(function(c){
        var cb=el('button',{style:{width:'22px',height:'22px',borderRadius:'50%',background:c,border:'2px solid '+(c===nota.cor?'var(--text)':'transparent'),cursor:'pointer'}});
        cb.onclick=function(e){
          e.stopPropagation();
          var newNota=Object.assign({},nota,{cor:c});
          var arr=(state.notas||[]).map(function(n){return n.id===nota.id?newNota:n;});
          lsSet('notas',arr);scheduleSave();
          setState({notas:arr,_notaCorPicker:null});
        };
        picker.appendChild(cb);
      });
      // Posiciona o picker próximo ao botão de cor
      setTimeout(function(){
        var rect=corBtn.getBoundingClientRect();
        picker.style.top=(rect.bottom+4)+'px';
        picker.style.left=Math.max(4,rect.left-60)+'px';
      },0);
      document.body.appendChild(picker);
    }

    var delBtn=el('button',{style:{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:'13px',flexShrink:'0'}});
    delBtn.textContent='🗑';
    delBtn.onclick=function(){
      if(!window.confirm('Excluir nota "'+nota.titulo+'"?'))return;
      var arr=(state.notas||[]).filter(function(n){return n.id!==nota.id;});
      lsSet('notas',arr);
      var novoPrimeiro=(arr.filter(function(n){return n.profile===state.profile;})[0]||{}).id||null;
      scheduleSave();
      setState({notas:arr,notaAtualId:novoPrimeiro});
    };
    tituloRow.appendChild(delBtn);
    editor.appendChild(tituloRow);

    // Textarea
    var ta = el('textarea',{});
    ta.style.cssText='flex:1;resize:none;background:transparent;border:none;padding:12px;font-size:13px;color:var(--text);font-family:inherit;outline:none;line-height:1.6;';
    ta.placeholder='Escreva sua nota aqui...';
    ta.value = nota.conteudo||'';
    ta.oninput=function(){_autoSaveNota(nota.id,this.value);};
    editor.appendChild(ta);
  }

  body.appendChild(editor);
  panel.appendChild(body);
  return panel;
}

// ── PÁGINA COMPLETA ───────────────────────────────────────────────────────────
function renderNotas() {
  var notas = _notasDoPerfil();
  var atualId = state.notaAtualId || (notas[0]&&notas[0].id) || null;
  var nota = atualId ? notas.find(function(n){return n.id===atualId;}) : null;

  function novaNotaFn(){
    var n={id:uid(),profile:state.profile,titulo:'Nova nota',conteudo:'',cor:NOTA_CORES[0],criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};
    var arr=(state.notas||[]).concat([n]);
    lsSet('notas',arr);
    scheduleSave();
    setState({notas:arr, notaAtualId:n.id});
    // Foca o textarea após re-render
    setTimeout(function(){
      var ta=document.querySelector('._nota-editor-ta');
      if(ta)ta.focus();
    },50);
  }

  var sidebar = el('div',{style:{width:'240px',flexShrink:'0',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',background:'var(--bg2)',borderRadius:'10px 0 0 10px'}});
  var sidHead = el('div',{style:{padding:'14px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'8px'}});
  sidHead.appendChild(el('span',{style:{fontWeight:'700',fontSize:'13px',flex:'1'}},'📝 Minhas notas'));
  sidHead.appendChild(btn('btn-primary','+',novaNotaFn));
  sidebar.appendChild(sidHead);

  var lista = el('div',{style:{flex:'1',overflowY:'auto',padding:'8px 0'}});
  notas.forEach(function(n){
    var isAt = n.id===atualId;
    var item = el('div',{});
    item.style.cssText='padding:10px 16px;cursor:pointer;border-left:4px solid '+(isAt?(n.cor||'var(--gold)'):'transparent')+';'
      +'background:'+(isAt?'var(--bg3)':'transparent')+';transition:background .1s;';
    item.onmouseenter=function(){if(!isAt)this.style.background='var(--bg3)';};
    item.onmouseleave=function(){if(!isAt)this.style.background='transparent';};
    var dot=el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:n.cor||'var(--gold)',marginBottom:'4px',display:'inline-block',marginRight:'6px'}});
    var tituloEl=el('span',{'data-id':n.id,class:'_nota-sid-titulo',style:{fontSize:'13px',fontWeight:isAt?'700':'500',color:'var(--text)'}},n.titulo||'Sem título');
    var data=el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'3px',paddingLeft:'16px'}},new Date(n.atualizadoEm).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}));
    var row=el('div',{style:{display:'flex',alignItems:'center'}});
    row.appendChild(dot);row.appendChild(tituloEl);
    item.appendChild(row);item.appendChild(data);
    item.onclick=function(){setState({notaAtualId:n.id});};
    lista.appendChild(item);
  });

  if(notas.length===0){
    var noEmp=el('div',{style:{padding:'40px 16px',textAlign:'center',color:'var(--text3)'}});
    noEmp.innerHTML='<div style="font-size:40px;margin-bottom:10px">📝</div><div style="font-size:13px">Nenhuma nota ainda</div>';
    lista.appendChild(noEmp);
  }
  sidebar.appendChild(lista);

  // Editor
  var editorArea = el('div',{style:{flex:'1',display:'flex',flexDirection:'column',background:'var(--bg2)',borderRadius:'0 10px 10px 0',overflow:'hidden'}});

  if(!nota){
    var noSel=el('div',{style:{flex:'1',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'14px',color:'var(--text3)'}});
    noSel.innerHTML='<div style="font-size:48px">📝</div><div style="font-size:14px">Selecione ou crie uma nota</div>';
    noSel.appendChild(btn('btn-primary','+ Nova nota',novaNotaFn));
    editorArea.appendChild(noSel);
  } else {
    // Toolbar
    var toolbar=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderBottom:'1px solid var(--border)',flexShrink:'0',background:'var(--bg3)'}});
    var tituloInp2=el('input',{style:{flex:'1',background:'none',border:'none',fontWeight:'700',fontSize:'16px',color:'var(--text)',fontFamily:'inherit',outline:'none'}});
    tituloInp2.value=nota.titulo||'';
    tituloInp2.onchange=function(){_autoSaveTituloNota(nota.id,this.value);};
    toolbar.appendChild(tituloInp2);

    // Cores
    var corRow=el('div',{style:{display:'flex',gap:'5px'}});
    NOTA_CORES.forEach(function(c){
      var cb=el('button',{style:{width:'18px',height:'18px',borderRadius:'50%',background:c,border:'2px solid '+(c===nota.cor?'var(--text)':'transparent'),cursor:'pointer',flexShrink:'0'}});
      cb.onclick=function(){
        var newNota=Object.assign({},nota,{cor:c});
        var arr=(state.notas||[]).map(function(n){return n.id===nota.id?newNota:n;});
        lsSet('notas',arr);scheduleSave();
        setState({notas:arr});
      };
      corRow.appendChild(cb);
    });
    toolbar.appendChild(corRow);

    var delBtn2=btn('btn-ghost','🗑 Excluir',function(){
      if(!window.confirm('Excluir nota "'+nota.titulo+'"?'))return;
      var arr=(state.notas||[]).filter(function(n){return n.id!==nota.id;});
      lsSet('notas',arr);scheduleSave();
      var lista2=arr.filter(function(n){return n.profile===state.profile;});
      var novoPrimeiro=(lista2[0]||{}).id||null;
      setState({notas:arr,notaAtualId:novoPrimeiro});
    });
    toolbar.appendChild(delBtn2);
    editorArea.appendChild(toolbar);

    // Editor text
    var ta2=el('textarea',{class:'_nota-editor-ta'});
    ta2.style.cssText='flex:1;resize:none;background:var(--bg2);border:none;padding:20px;font-size:14px;color:var(--text);font-family:inherit;outline:none;line-height:1.7;';
    ta2.placeholder='Escreva aqui...';
    ta2.value=nota.conteudo||'';
    ta2.oninput=function(){_autoSaveNota(nota.id,this.value);};
    editorArea.appendChild(ta2);

    // Status bar
    var statusBar=el('div',{style:{padding:'6px 16px',borderTop:'1px solid var(--border)',fontSize:'10px',color:'var(--text3)',display:'flex',gap:'16px',flexShrink:'0'}});
    var wc=(nota.conteudo||'').trim().split(/\s+/).filter(Boolean).length;
    statusBar.textContent=wc+' palavras · '+((nota.conteudo||'').length)+' caracteres · Salvo automaticamente';
    editorArea.appendChild(statusBar);
  }

  var container=el('div',{style:{display:'flex',height:'calc(100vh - 160px)',minHeight:'400px',border:'1px solid var(--border)',borderRadius:'10px',overflow:'hidden'}});
  container.appendChild(sidebar);
  container.appendChild(editorArea);

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'📝 Bloco de Notas'),
        el('p',{class:'page-sub'},'Anotações rápidas, lembretes e textos importantes'),
      ]),
      btn('btn-primary','+ Nova nota',novaNotaFn),
    ]),
    container,
  ]);
}
