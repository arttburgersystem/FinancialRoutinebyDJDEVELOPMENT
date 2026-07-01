// ── IMPORTAR EXTRATO ─────────────────────────────────────────────────────────
// Modo 1 (principal): colar texto copiado do extrato bancário/PDF → parser regex
// Modo 2 (alternativo): imagem OCR via Tesseract.js com pré-processamento

var _importarPasteHandler = null;

function _importarRemovePaste() {
  if (_importarPasteHandler) { document.removeEventListener('paste', _importarPasteHandler); _importarPasteHandler = null; }
}

function _importarAbrir() {
  setState({ importarExtratoModal: { modo: 'texto', texto: '', imagemBase64: null, imagemType: null, step: 'entrada', transacoes: [], erro: null } });
}

// ── Carrega Tesseract.js sob demanda ─────────────────────────────────────────
function _importarCarregarTesseract(cb) {
  if (window.Tesseract) { cb(); return; }
  if (window._tessLoad) { var iv=setInterval(function(){if(window.Tesseract){clearInterval(iv);cb();}},250); return; }
  window._tessLoad=true;
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  s.onload=function(){window._tessLoad=false;cb();};
  s.onerror=function(){window._tessLoad=false;showToast('Erro ao carregar OCR','error');};
  document.head.appendChild(s);
}

// ── Pré-processa imagem para melhorar OCR: escala, P&B, contraste ────────────
function _importarPreprocessar(dataUrl, cb) {
  var img = new Image();
  img.onload = function() {
    var scale = Math.max(2, 2400 / img.width);
    var c = document.createElement('canvas');
    c.width = img.width * scale;
    c.height = img.height * scale;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, c.width, c.height);
    // Grayscale + contraste alto
    var d = ctx.getImageData(0, 0, c.width, c.height);
    var px = d.data;
    for (var i = 0; i < px.length; i += 4) {
      var g = 0.299*px[i] + 0.587*px[i+1] + 0.114*px[i+2];
      // Stretch contrast: texto branco em fundo escuro → inverter
      var bright = g > 128 ? 255 : 0;
      px[i] = px[i+1] = px[i+2] = bright;
    }
    ctx.putImageData(d, 0, 0);
    cb(c.toDataURL('image/png'));
  };
  img.src = dataUrl;
}

// ── Parser universal de texto de extrato ─────────────────────────────────────
function _importarParseTexto(txt) {
  var linhas = txt.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var transacoes = [];

  // Regex para valores monetários no formato BR: -R$ 1.234,56 / R$ 38,54 / -38,54
  var reVal = /([-+])?\s*R?\$?\s*(\d{1,3}(?:[.\s]?\d{3})*)[,](\d{2})\b/;

  function parseVal(linha) {
    var m = linha.match(reVal);
    if (!m) return null;
    var sinal = m[1] === '+' ? false : m[1] === '-' ? true : null; // null = indeterminado
    var inteiro = m[2].replace(/[.\s]/g, '');
    var dec = m[3];
    var v = parseFloat(inteiro + '.' + dec);
    if (!v || v > 999999) return null;
    return { valor: v, negativo: sinal };
  }

  // Heurística: linha que TEM valor → extrair transação
  var i = 0;
  while (i < linhas.length) {
    var linha = linhas[i];
    var pv = parseVal(linha);

    if (pv) {
      // Descrição: texto da mesma linha antes do valor, ou linha anterior
      var nome = linha.replace(reVal, '').replace(/[|•·\-–—]+$/, '').trim();
      if (nome.length < 3) {
        // Busca até 2 linhas atrás para encontrar descrição
        for (var j = i-1; j >= Math.max(0, i-3); j--) {
          if (!parseVal(linhas[j]) && linhas[j].length >= 3) { nome = linhas[j]; break; }
        }
      }
      if (nome.length < 2) nome = 'Transação';

      // Categoria: próxima linha se não tiver valor
      var cat = '';
      if (i+1 < linhas.length && !parseVal(linhas[i+1]) && linhas[i+1].length >= 3 && linhas[i+1].length <= 80) {
        cat = linhas[i+1];
      }

      // Se sinal indeterminado, tenta inferir pela posição/contexto
      var negativo = pv.negativo;
      if (negativo === null) {
        negativo = cat.toLowerCase().indexOf('pag') >= 0 || cat.toLowerCase().indexOf('débito') >= 0
          || nome.toLowerCase().indexOf('pag') >= 0;
      }

      transacoes.push({
        nome: nome.substring(0, 80),
        valor: Math.round(pv.valor * 100) / 100,
        tipo: negativo ? 'debito' : 'credito',
        categoria: cat,
        data: today(),
        incluir: true,
        _idx: transacoes.length,
      });
    }
    i++;
  }

  return transacoes;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function renderImportarExtratoModal() {
  if (!state.importarExtratoModal) { _importarRemovePaste(); return null; }
  var m = state.importarExtratoModal;
  var pf = state.profile;

  function fechar() { _importarRemovePaste(); setState({ importarExtratoModal: null }); }
  function setM(patch) { Object.assign(state.importarExtratoModal, patch); render(); }

  function analisarTexto() {
    var txt = (m.texto || '').trim();
    if (!txt) { setM({ erro: 'Cole o texto do extrato acima.' }); return; }
    var trans = _importarParseTexto(txt);
    if (!trans.length) { setM({ erro: 'Nenhum valor monetário encontrado. Verifique se o texto contém valores como R$ 38,54.' }); return; }
    setM({ step: 'confirmar', transacoes: trans, erro: null });
  }

  function analisarImagem() {
    if (!window.Tesseract) { setM({ erro: 'OCR ainda carregando, aguarde e tente novamente.' }); return; }
    setM({ step: 'ocr', erro: null });
    var dataUrl = 'data:' + m.imagemType + ';base64,' + m.imagemBase64;
    _importarPreprocessar(dataUrl, function(processada) {
      Tesseract.recognize(processada, 'por+eng', {
        logger: function(info) {
          if (info.status === 'recognizing text' && state.importarExtratoModal) {
            state.importarExtratoModal._pct = Math.round((info.progress||0)*100);
          }
        },
      }).then(function(r) {
        var txt = r.data.text;
        var trans = _importarParseTexto(txt);
        if (!trans.length) {
          setM({ step: 'imagem', textoOcr: txt, erro: 'OCR não encontrou valores. Tente o modo Colar Texto: copie o texto do extrato (Ctrl+A → Ctrl+C) e cole lá.' });
        } else {
          setM({ step: 'confirmar', transacoes: trans, textoOcr: txt, erro: null });
        }
      }).catch(function(e) {
        setM({ step: 'imagem', erro: 'Erro OCR: ' + (e.message||'tente imagem com fundo claro') });
      });
    });
  }

  function salvar() {
    var sel = (m.transacoes||[]).filter(function(t){return t.incluir;});
    if (!sel.length) return;
    var novas = sel.map(function(t) {
      return {
        id: uid(), profile: pf,
        tipo: t.tipo === 'credito' ? 'receber' : 'pagar',
        descricao: t.nome, valor: t.valor,
        vencimento: t.data || today(),
        status: 'pendente', categoria: t.categoria||'',
        recorrente: false, recorrencia_id: '',
        obs: 'Importado via extrato · ' + new Date().toLocaleDateString('pt-BR'),
        criadoEm: new Date().toISOString(),
      };
    });
    var contas = (state.contas||[]).concat(novas);
    lsSet('contas', contas);
    _importarRemovePaste();
    setState({ contas: contas, importarExtratoModal: null });
    scheduleSave();
    showToast(novas.length + ' lançamento' + (novas.length>1?'s':'') + ' importado' + (novas.length>1?'s':'') + '!', 'success');
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  var overlay = div('modal-overlay',[]);
  overlay.onclick = function(e){ if(e.target===overlay) fechar(); };
  var modal = el('div',{class:'modal',style:{maxWidth:'620px',maxHeight:'88vh',overflowY:'auto'}});

  modal.appendChild(div('modal-title',[
    el('span',{},'📥 Importar Extrato'),
    btn('modal-close','×',fechar),
  ]));

  var body = el('div',{style:{padding:'0 24px 24px'}});

  // Abas modo
  if (m.step !== 'confirmar' && m.step !== 'ocr') {
    var abas = el('div',{style:{display:'flex',gap:'0',marginBottom:'18px',borderBottom:'2px solid var(--border)'}});
    ['texto','imagem'].forEach(function(modo){
      var labels={texto:'📝 Colar texto',imagem:'📸 Imagem (OCR)'};
      var ativo = m.modo === modo;
      var ab = el('button',{style:{
        padding:'9px 18px',fontSize:'13px',fontWeight:ativo?'700':'400',
        color:ativo?'var(--gold)':'var(--text3)',
        background:'none',border:'none',
        borderBottom: ativo?'2px solid var(--gold)':'2px solid transparent',
        cursor:'pointer',marginBottom:'-2px',
      }},labels[modo]);
      ab.onclick = function(){
        setM({modo:modo, step:'entrada', erro:null});
        if(modo==='imagem') _importarCarregarTesseract(function(){});
      };
      abas.appendChild(ab);
    });
    body.appendChild(abas);
  }

  // Erro
  if (m.erro) {
    body.appendChild(el('div',{style:{
      background:'rgba(224,82,82,.1)',border:'1px solid var(--red)',borderRadius:'8px',
      padding:'10px 14px',marginBottom:'14px',fontSize:'13px',color:'var(--red)',
    }},'✕ '+m.erro));
  }

  // ══ MODO TEXTO ══════════════════════════════════════════════════════════════
  if ((m.modo==='texto' || !m.modo) && m.step !== 'confirmar') {
    // Instruções
    body.appendChild(el('div',{style:{
      background:'var(--bg3)',borderRadius:'8px',padding:'12px 14px',
      marginBottom:'14px',border:'1px solid var(--border)',fontSize:'12px',color:'var(--text3)',
    }},[
      el('div',{style:{fontWeight:'700',color:'var(--text)',marginBottom:'6px'}},'Como fazer:'),
      el('div',{},'1. Abra o extrato no site/app do seu banco'),
      el('div',{},'2. Selecione os lançamentos com o mouse (ou Ctrl+A na página)'),
      el('div',{},'3. Copie com Ctrl+C'),
      el('div',{},'4. Cole abaixo com Ctrl+V'),
    ]));

    var ta = el('textarea',{placeholder:'Cole aqui o texto copiado do extrato bancário...\n\nExemplo:\nSTONE INSTITUIÇÃO DE PAGAMENTO S.A.   -R$ 38,54\nParcela | Empréstimo'});
    ta.style.cssText = 'width:100%;min-height:180px;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;font-family:monospace;resize:vertical;box-sizing:border-box;outline:none;';
    ta.value = m.texto || '';
    ta.oninput = function(){ state.importarExtratoModal.texto = ta.value; };
    body.appendChild(ta);
    body.appendChild(el('div',{style:{display:'flex',gap:'8px',marginTop:'12px'}},[
      btn('btn-primary','🔍 Identificar lançamentos',analisarTexto),
    ]));

  // ══ MODO IMAGEM ══════════════════════════════════════════════════════════════
  } else if (m.modo==='imagem' && m.step !== 'confirmar' && m.step !== 'ocr') {
    body.appendChild(el('div',{style:{
      background:'rgba(229,172,0,.08)',borderRadius:'8px',padding:'10px 14px',
      marginBottom:'14px',fontSize:'12px',color:'var(--text2)',border:'1px solid rgba(229,172,0,.2)',
    }},'⚠️ O OCR por imagem pode errar em extratos com fundo escuro ou colorido. Se não funcionar bem, use a aba "Colar texto" — é mais preciso.'));

    if (m.imagemBase64) {
      var prev=el('img',{});
      prev.src='data:'+m.imagemType+';base64,'+m.imagemBase64;
      prev.style.cssText='width:100%;border-radius:8px;margin-bottom:12px;max-height:200px;object-fit:contain;background:var(--bg3);border:1px solid var(--border);';
      body.appendChild(prev);
      body.appendChild(el('div',{style:{display:'flex',gap:'8px'}},[
        btn('btn-primary','🔍 Ler com OCR',analisarImagem),
        btn('btn-ghost','✕ Trocar',function(){setM({imagemBase64:null,imagemType:null});}),
      ]));
    } else {
      var dz=el('div',{});
      dz.style.cssText='border:2px dashed var(--border2);border-radius:12px;padding:44px 24px;text-align:center;background:var(--bg3);cursor:pointer;transition:border-color .2s;';
      dz.innerHTML='<div style="font-size:40px;margin-bottom:10px">📋</div>'+
        '<div style="font-weight:700;color:var(--text);margin-bottom:5px">Cole o print com Ctrl+V</div>'+
        '<div style="font-size:12px;color:var(--text3)">ou clique para fazer upload</div>';
      dz.onmouseenter=function(){dz.style.borderColor='var(--gold)';};
      dz.onmouseleave=function(){dz.style.borderColor='var(--border2)';};
      var fi=el('input',{type:'file',accept:'image/*'});fi.style.display='none';
      fi.onchange=function(){
        if(!fi.files[0])return;
        var r=new FileReader();
        r.onload=function(e){setM({imagemBase64:e.target.result.split(',')[1],imagemType:fi.files[0].type||'image/png'});};
        r.readAsDataURL(fi.files[0]);
      };
      dz.onclick=function(){fi.click();};
      _importarRemovePaste();
      _importarPasteHandler=function(e){
        if(!state.importarExtratoModal){_importarRemovePaste();return;}
        var items=e.clipboardData&&e.clipboardData.items;
        if(!items)return;
        for(var i=0;i<items.length;i++){
          if(items[i].type.indexOf('image')!==-1){
            var blob=items[i].getAsFile();
            var rd=new FileReader();
            rd.onload=function(ev){setM({imagemBase64:ev.target.result.split(',')[1],imagemType:blob.type||'image/png'});};
            rd.readAsDataURL(blob);
            e.preventDefault();break;
          }
        }
      };
      document.addEventListener('paste',_importarPasteHandler);
      body.appendChild(dz);body.appendChild(fi);
    }

  // ══ OCR EM ANDAMENTO ════════════════════════════════════════════════════════
  } else if (m.step==='ocr') {
    var pct=m._pct||0;
    body.appendChild(el('div',{style:{textAlign:'center',padding:'44px 24px'}},[
      el('div',{style:{fontSize:'38px',marginBottom:'12px'}},'🔍'),
      el('div',{style:{fontWeight:'700',fontSize:'15px',color:'var(--text)',marginBottom:'6px'}},'Lendo imagem com OCR...'),
      el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'16px'}},'Processando localmente — aguarde'),
      el('div',{style:{background:'var(--bg3)',borderRadius:'8px',height:'8px',overflow:'hidden'}},[
        el('div',{style:{width:Math.max(pct,5)+'%',height:'100%',background:'var(--gold)',borderRadius:'8px',transition:'width .4s'}}),
      ]),
      pct?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'5px'}},pct+'%'):null,
    ].filter(Boolean)));

  // ══ CONFIRMAR ════════════════════════════════════════════════════════════════
  } else if (m.step==='confirmar') {
    var trans=m.transacoes||[];
    var nSel=trans.filter(function(t){return t.incluir;}).length;
    var nDeb=trans.filter(function(t){return t.tipo==='debito';}).length;
    var nCred=trans.length-nDeb;
    var totDeb=trans.filter(function(t){return t.tipo==='debito'&&t.incluir;}).reduce(function(a,t){return a+t.valor;},0);

    body.appendChild(el('div',{style:{display:'flex',gap:'10px',marginBottom:'14px',padding:'12px',background:'var(--bg3)',borderRadius:'8px',border:'1px solid var(--border)'}},[
      el('div',{style:{flex:'1',textAlign:'center'}},[
        el('div',{style:{fontWeight:'800',fontSize:'20px',color:'var(--text)'}},String(trans.length)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Detectadas'),
      ]),
      el('div',{style:{flex:'1',textAlign:'center'}},[
        el('div',{style:{fontWeight:'800',fontSize:'20px',color:'var(--red)'}},String(nDeb)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Saídas'),
      ]),
      el('div',{style:{flex:'1',textAlign:'center'}},[
        el('div',{style:{fontWeight:'800',fontSize:'20px',color:'var(--green)'}},String(nCred)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Entradas'),
      ]),
    ]));

    body.appendChild(el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'10px'}},
      'Revise e edite os campos inline. Desmarque os que não quer importar:'));

    trans.forEach(function(t,idx){
      var cor=t.tipo==='credito'?'var(--green)':'var(--red)';
      var vStr=t.valor.toFixed(2).replace('.',',');

      var nomeInp=el('input',{});
      nomeInp.value=t.nome;
      nomeInp.style.cssText='background:transparent;border:none;outline:none;font-weight:600;font-size:13px;color:var(--text);width:100%;';
      nomeInp.oninput=function(){m.transacoes[idx].nome=nomeInp.value;};

      var catInp=el('input',{});
      catInp.value=t.categoria||'';catInp.placeholder='categoria...';
      catInp.style.cssText='background:transparent;border:none;outline:none;font-size:11px;color:var(--text3);width:100%;';
      catInp.oninput=function(){m.transacoes[idx].categoria=catInp.value;};

      var dtInp=el('input',{type:'date'});
      dtInp.value=t.data||today();
      dtInp.style.cssText='background:transparent;border:none;outline:none;font-size:11px;color:var(--text3);cursor:pointer;';
      dtInp.oninput=function(){m.transacoes[idx].data=dtInp.value;};

      var tipoSel=el('select',{});
      tipoSel.style.cssText='background:transparent;border:none;outline:none;font-size:11px;color:'+cor+';font-weight:700;cursor:pointer;margin-left:4px;';
      var oD=el('option',{value:'debito'},'↓ Saída');
      var oC=el('option',{value:'credito'},'↑ Entrada');
      if(t.tipo==='credito')oC.selected=true;else oD.selected=true;
      tipoSel.appendChild(oD);tipoSel.appendChild(oC);
      tipoSel.onchange=function(){m.transacoes[idx].tipo=tipoSel.value;render();};

      var chk=el('input',{type:'checkbox'});
      chk.checked=t.incluir;chk.style.cursor='pointer';chk.style.flexShrink='0';
      chk.onchange=function(){m.transacoes[idx].incluir=chk.checked;render();};

      var row=el('div',{style:{
        display:'flex',alignItems:'center',gap:'10px',
        background:'var(--bg3)',borderRadius:'8px',padding:'10px 12px',marginBottom:'6px',
        border:'1px solid '+(t.incluir?'var(--border2)':'transparent'),
        opacity:t.incluir?'1':'.35',transition:'opacity .2s',
      }});
      row.appendChild(chk);
      row.appendChild(el('div',{style:{flex:'1',minWidth:'0'}},[nomeInp,el('div',{style:{display:'flex',gap:'4px',alignItems:'center'}},[catInp,dtInp,tipoSel])]));
      row.appendChild(el('div',{style:{fontWeight:'700',color:cor,fontSize:'14px',whiteSpace:'nowrap'}},(t.tipo==='credito'?'+':'−')+' R$ '+vStr));
      body.appendChild(row);
    });

    // Texto OCR bruto (debug)
    if (m.textoOcr) {
      var det=el('details',{style:{marginTop:'10px'}});
      det.appendChild(el('summary',{style:{fontSize:'11px',color:'var(--text3)',cursor:'pointer'}},'Ver texto bruto extraído'));
      var pre=el('pre',{style:{fontSize:'10px',color:'var(--text3)',whiteSpace:'pre-wrap',marginTop:'6px',maxHeight:'120px',overflow:'auto',background:'var(--bg3)',padding:'8px',borderRadius:'6px'}});
      pre.textContent=m.textoOcr;
      det.appendChild(pre);
      body.appendChild(det);
    }

    body.appendChild(el('div',{style:{display:'flex',gap:'8px',marginTop:'16px'}},[
      btn('btn-ghost','← Voltar',function(){setM({step:'entrada',transacoes:[],erro:null});}),
      btn('btn-primary','💾 Importar '+nSel+' lançamento'+(nSel!==1?'s':'')+(totDeb>0?' · −R$ '+totDeb.toFixed(2).replace('.',','):''),salvar),
    ]));
  }

  modal.appendChild(body);
  overlay.appendChild(modal);
  return overlay;
}
