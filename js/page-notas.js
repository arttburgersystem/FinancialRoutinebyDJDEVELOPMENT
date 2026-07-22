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

// Converte plain text para HTML ao carregar notas antigas (preserva quebras de linha)
function _notaParaHtml(c) {
  if (!c) return '';
  if (/<[a-z][^>]*>/i.test(c)) return c; // já é HTML
  return c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

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
    tituloInp.oninput = function(){_autoSaveTituloNota(nota.id,this.value);};

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

    // Mini barra de formatação no painel
    var pFmtBar=el('div',{style:{display:'flex',gap:'2px',padding:'4px 8px',borderBottom:'1px solid var(--border)',flexShrink:'0',flexWrap:'wrap',background:'var(--bg2)'}});
    var _pEdRef=null;
    function _pfc(cmd,arg){document.execCommand(cmd,false,arg||null);if(_pEdRef)_pEdRef.focus();}
    function _pfb(html,title,fn){
      var b=document.createElement('button');b.title=title;b.innerHTML=html;
      b.style.cssText='background:none;border:1px solid var(--border);border-radius:3px;cursor:pointer;color:var(--text);padding:1px 6px;line-height:1.5;font-family:inherit;transition:background .1s;flex-shrink:0;';
      b.onmouseenter=function(){this.style.background='var(--bg3)';};
      b.onmouseleave=function(){this.style.background='none';};
      b.onmousedown=function(e){e.preventDefault();fn();};
      return b;
    }
    pFmtBar.appendChild(_pfb('<b>N</b>','Negrito',function(){_pfc('bold');}));
    pFmtBar.appendChild(_pfb('<i>I</i>','Itálico',function(){_pfc('italic');}));
    pFmtBar.appendChild(_pfb('<u>S</u>','Sublinhado',function(){_pfc('underline');}));
    pFmtBar.appendChild(_pfb('<s>T</s>','Tachado',function(){_pfc('strikeThrough');}));
    pFmtBar.appendChild(_pfb('<span style="font-size:10px">• Lista</span>','Lista',function(){_pfc('insertUnorderedList');}));
    pFmtBar.appendChild(_pfb('<span style="font-size:10px">1.</span>','Lista numerada',function(){_pfc('insertOrderedList');}));
    editor.appendChild(pFmtBar);

    // Editor contenteditable no painel
    var pEd=document.createElement('div');
    pEd.contentEditable='true';
    pEd.style.cssText='flex:1;overflow-y:auto;background:transparent;padding:10px 12px;font-size:13px;color:var(--text);font-family:inherit;outline:none;line-height:1.6;word-break:break-word;';
    pEd.innerHTML=_notaParaHtml(nota.conteudo||'');
    _pEdRef=pEd;
    pEd.oninput=function(){_autoSaveNota(nota.id,this.innerHTML);};
    editor.appendChild(pEd);
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
    // ── Toolbar: título + cores + excluir ────────────────────────────────────
    var toolbar=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',borderBottom:'1px solid var(--border)',flexShrink:'0',background:'var(--bg3)'}});
    toolbar.appendChild(el('span',{style:{fontSize:'13px',color:'var(--text3)',flexShrink:'0'}},'✏️'));
    var tituloInp2=el('input',{style:{flex:'1',background:'none',border:'none',fontWeight:'700',fontSize:'16px',color:'var(--text)',fontFamily:'inherit',outline:'none'},placeholder:'Título da nota...'});
    tituloInp2.value=nota.titulo||'';
    tituloInp2.oninput=function(){_autoSaveTituloNota(nota.id,this.value);};
    toolbar.appendChild(tituloInp2);

    var corRow=el('div',{style:{display:'flex',gap:'5px'}});
    NOTA_CORES.forEach(function(c){
      var cb=el('button',{style:{width:'18px',height:'18px',borderRadius:'50%',background:c,border:'2px solid '+(c===nota.cor?'var(--text)':'transparent'),cursor:'pointer',flexShrink:'0'}});
      cb.onclick=function(){
        var newNota=Object.assign({},nota,{cor:c});
        var arr=(state.notas||[]).map(function(n){return n.id===nota.id?newNota:n;});
        lsSet('notas',arr);scheduleSave();setState({notas:arr});
      };
      corRow.appendChild(cb);
    });
    toolbar.appendChild(corRow);
    var delBtn2=btn('btn-ghost','🗑 Excluir',function(){
      if(!window.confirm('Excluir nota "'+nota.titulo+'"?'))return;
      var arr=(state.notas||[]).filter(function(n){return n.id!==nota.id;});
      lsSet('notas',arr);scheduleSave();
      var lista2=arr.filter(function(n){return n.profile===state.profile;});
      setState({notas:arr,notaAtualId:(lista2[0]||{}).id||null});
    });
    toolbar.appendChild(delBtn2);
    editorArea.appendChild(toolbar);

    // ── Barra de formatação ───────────────────────────────────────────────────
    var fmtBar=el('div',{style:{display:'flex',alignItems:'center',gap:'2px',padding:'5px 14px',borderBottom:'1px solid var(--border)',flexShrink:'0',flexWrap:'wrap',background:'var(--bg2)'}});
    var _edRef=null; // referência ao div editor — atribuída abaixo

    function _fc(cmd,arg){document.execCommand(cmd,false,arg||null);if(_edRef)_edRef.focus();}
    function _fb(html,title,fn){
      var b=document.createElement('button');
      b.title=title;
      b.innerHTML=html;
      b.style.cssText='background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--text);padding:2px 8px;line-height:1.6;font-family:inherit;transition:background .12s;white-space:nowrap;flex-shrink:0;min-width:28px;';
      b.onmouseenter=function(){this.style.background='var(--bg3)';};
      b.onmouseleave=function(){this.style.background='none';};
      b.onmousedown=function(e){e.preventDefault();fn();};
      return b;
    }
    function _fsep(){var s=document.createElement('span');s.style.cssText='width:1px;height:16px;background:var(--border);margin:0 4px;flex-shrink:0;align-self:center;';return s;}

    fmtBar.appendChild(_fb('<b style="font-size:13px">N</b>','Negrito (Ctrl+B)',function(){_fc('bold');}));
    fmtBar.appendChild(_fb('<i style="font-size:13px">I</i>','Itálico (Ctrl+I)',function(){_fc('italic');}));
    fmtBar.appendChild(_fb('<u style="font-size:13px">S</u>','Sublinhado (Ctrl+U)',function(){_fc('underline');}));
    fmtBar.appendChild(_fb('<s style="font-size:13px">T</s>','Tachado',function(){_fc('strikeThrough');}));
    fmtBar.appendChild(_fsep());
    fmtBar.appendChild(_fb('<span style="font-size:11px;font-weight:700">T1</span>','Título grande',function(){_fc('formatBlock','h1');}));
    fmtBar.appendChild(_fb('<span style="font-size:11px;font-weight:700">T2</span>','Título médio',function(){_fc('formatBlock','h2');}));
    fmtBar.appendChild(_fb('<span style="font-size:11px;font-weight:600">T3</span>','Subtítulo',function(){_fc('formatBlock','h3');}));
    fmtBar.appendChild(_fb('<span style="font-size:11px">¶</span>','Parágrafo normal',function(){_fc('formatBlock','p');}));
    fmtBar.appendChild(_fsep());
    fmtBar.appendChild(_fb('<span style="font-size:11px">• Lista</span>','Lista com marcadores',function(){_fc('insertUnorderedList');}));
    fmtBar.appendChild(_fb('<span style="font-size:11px">1. Lista</span>','Lista numerada',function(){_fc('insertOrderedList');}));
    fmtBar.appendChild(_fsep());
    fmtBar.appendChild(_fb('<span style="font-size:12px">⬅</span>','Alinhar à esquerda',function(){_fc('justifyLeft');}));
    fmtBar.appendChild(_fb('<span style="font-size:12px">↔</span>','Centralizar',function(){_fc('justifyCenter');}));
    fmtBar.appendChild(_fb('<span style="font-size:12px">➡</span>','Alinhar à direita',function(){_fc('justifyRight');}));
    editorArea.appendChild(fmtBar);

    // ── Editor contenteditable ────────────────────────────────────────────────
    var statusBar=el('div',{style:{padding:'6px 16px',borderTop:'1px solid var(--border)',fontSize:'10px',color:'var(--text3)',display:'flex',gap:'16px',flexShrink:'0'}});
    function _updateStatus(txt){
      var wc2=txt.trim()?txt.trim().split(/\s+/).filter(Boolean).length:0;
      statusBar.textContent=wc2+' palavras · '+txt.replace(/\s+/g,' ').length+' caracteres · Salvo automaticamente';
    }
    var _txtInit=(nota.conteudo||'').replace(/<[^>]*>/g,' ');
    _updateStatus(_txtInit);

    var ed=document.createElement('div');
    ed.className='_nota-editor-ta';
    ed.contentEditable='true';
    ed.style.cssText='flex:1;overflow-y:auto;background:var(--bg2);padding:20px;font-size:14px;color:var(--text);font-family:inherit;outline:none;line-height:1.75;word-break:break-word;';
    ed.innerHTML=_notaParaHtml(nota.conteudo||'');
    _edRef=ed;

    ed.oninput=function(){
      var html=this.innerHTML;
      _autoSaveNota(nota.id,html);
      _updateStatus(this.innerText||'');
    };
    editorArea.appendChild(ed);
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
