// ── CARDÁPIO ──────────────────────────────────────────────────────────────────

var _crdTab      = 'produtos';
var _crdBusca    = '';
var _crdCatFlt   = '';
var _crdSetFlt   = '';
var _crdStsFlt   = '';
var _crdSel      = {};
var _crdCatModal = null; // {id?,nome,imagem} — categoria sendo criada/editada
var _crdImport   = null; // null | {rows:[],loading:false}

// ── SINCRONIZAÇÃO DE CATEGORIAS ───────────────────────────────────────────────
// Lê todas as strings de categoria nos produtos do perfil atual e cria
// entradas faltantes em state.estCategorias. Retorna o nº de entradas criadas.
function _syncCategoriasProdutos() {
  var perfil = state.profile;
  var prods  = (state.produtos    || []).filter(function(p){ return p.profile === perfil; });
  var comps  = (state.complementos|| []).filter(function(c){ return c.profile === perfil; });
  var cats   = (state.estCategorias || []);
  var existentes = {};
  cats.forEach(function(c){
    var nm = typeof c === 'string' ? c : (c && c.nome ? c.nome : '');
    if(nm) existentes[nm.toLowerCase()] = true;
  });

  var novas = [];
  var vistas = {};
  prods.concat(comps).forEach(function(p) {
    var nome = (p.categoria || '').trim();
    if (!nome) return;
    var key = nome.toLowerCase();
    if (!existentes[key] && !vistas[key]) {
      vistas[key] = true;
      novas.push({ id: 'cat_' + Date.now() + '_' + Math.floor(Math.random()*9999), nome: nome, imagem: '' });
    }
  });

  if (!novas.length) return 0;
  var todas = cats.concat(novas);
  lsSet('estCategorias', todas);
  setState({ estCategorias: todas });
  scheduleSave();
  return novas.length;
}

// ── IMPORTAÇÃO VIA EXCEL/CSV ──────────────────────────────────────────────────

function _parseCsvSimples(text) {
  var lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  return lines.map(function(line) {
    var row=[]; var cell=''; var inQ=false;
    for (var i=0;i<line.length;i++) {
      var c=line[i];
      if (c==='"') { if (inQ && line[i+1]==='"'){cell+='"';i++;}else inQ=!inQ; }
      else if (c===','&&!inQ){row.push(cell);cell='';}
      else cell+=c;
    }
    row.push(cell);
    return row.map(function(v){return v.trim();});
  }).filter(function(r){return r.some(function(c){return c;});});
}

function _xlsxToRows(file, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, {type:'binary'});
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:''});
      cb(null, rows);
    } catch(ex) { cb(ex); }
  };
  reader.onerror = function(){ cb(new Error('Falha ao ler arquivo')); };
  reader.readAsBinaryString(file);
}

function _csvToRows(file, cb) {
  var reader = new FileReader();
  reader.onload = function(e) { cb(null, _parseCsvSimples(e.target.result)); };
  reader.onerror = function(){ cb(new Error('Falha ao ler arquivo')); };
  reader.readAsText(file, 'UTF-8');
}

// Detecta colunas pelo header da planilha (linha 0)
function _mapColunas(header) {
  var m = {};
  header.forEach(function(h, i) {
    var raw = (h||'').toString().trim();
    var hh  = raw.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,''); // remove acentos
    // Código do produto: palavra única (sem espaço), ex: "Código", "Codigo", "Cod"
    // Evita "Código Da Nota", "Código de Barras" etc.
    if (!/ /.test(hh) && /^c[ao]?digo$|^cod\.?$/.test(hh)) m.codigo = i;
    if (/^nome/.test(hh))                          m.nome      = i;
    if (/categoria/.test(hh))                      m.categoria = i;
    if (/valor.{0,6}venda|pre.{0,4}venda/.test(hh)) m.precoVenda = i;
    if (/valor.{0,6}custo|^custo$/.test(hh))       m.custoMedio = i;
    if (/^ncm$/.test(hh))                          m.ncm       = i;
    if (/^cfop$/.test(hh))                         m.cfop      = i;
    if (/^cst$/.test(hh))                          m.cst       = i;
    if (/^cest$|^gest$/.test(hh))                  m.cest      = i;
    if (/c.{0,4}d.{0,4}barra|barra/.test(hh))     m.codBarra  = i;
    if (/^estoque$/.test(hh))                      m.estoque   = i;
    if (/descri/.test(hh))                         m.descricao = i;
    if (/^tipo$/.test(hh))                         m.tipo      = i;
  });
  return m;
}

// Detecta se os preços da planilha estão em centavos (inteiros ≥ 100)
function _detectaCentavos(rows, map) {
  if (map.precoVenda === undefined) return false;
  var amostras = rows.slice(0,30).map(function(r){
    return parseFloat((r[map.precoVenda]||'0').toString().replace(',','.'));
  }).filter(function(v){ return v > 0; });
  if (!amostras.length) return false;
  // É centavos se: todos são inteiros E média > 200 (R$2 em reais seria improvável ser 200 centavos para cardápio)
  var todosInteiros = amostras.every(function(v){ return Math.floor(v) === v; });
  var media = amostras.reduce(function(a,b){return a+b;},0) / amostras.length;
  return todosInteiros && media >= 100;
}

function _rowToProduto(row, map, centavos) {
  function g(k) { return map[k]!==undefined ? (row[map[k]]||'').toString().trim() : ''; }
  function gn(k){
    var v=parseFloat((g(k)||'0').replace(',','.'));
    if (isNaN(v)) return 0;
    return centavos ? Math.round(v) / 100 : v;
  }
  var nome = g('nome');
  if (!nome) return null;
  var now = new Date().toISOString();
  return {
    id:          uid(),
    profile:     state.profile,
    tipo:        'produto',
    nome:        nome,
    categoria:   g('categoria'),
    unidade:     'un',
    sku:         g('codigo'),
    precoVenda:  gn('precoVenda'),
    custoMedio:  gn('custoMedio'),
    estoqueAtual: (function(){ var v=parseFloat(g('estoque')||'0'); return isNaN(v)?0:v; })(),
    estoqueMinimo: 0,
    disponivel:  true,
    ativo:       true,
    descricaoCard: g('descricao'),
    ncm:         g('ncm'),
    cfop:        g('cfop'),
    cst:         g('cst'),
    cest:        g('cest'),
    obs:         g('codBarra') ? 'Cód.Barra: '+g('codBarra') : '',
    criadoEm:   now,
    atualizadoEm: now,
  };
}

function renderCrdImportModal() {
  var imp      = _crdImport;
  var rows     = (imp && imp.rows)     || [];
  var map      = (imp && imp.map)      || {};
  var centavos = !!(imp && imp.centavos);

  function fechar(){ _crdImport=null; setState({}); }

  // Cabeçalho da preview
  var COLS = [
    {k:'nome',      l:'Nome'},
    {k:'categoria', l:'Categoria'},
    {k:'precoVenda',l:'Preço Venda'},
    {k:'custoMedio',l:'Custo'},
    {k:'codigo',    l:'Código'},
    {k:'ncm',       l:'NCM'},
  ];

  function fmtPreview(raw, isMoney) {
    if (!raw) return '—';
    if (!isMoney) return raw;
    var v = parseFloat(raw.replace(',','.'));
    if (isNaN(v)) return raw;
    if (centavos) v = Math.round(v) / 100;
    return 'R$ '+v.toFixed(2).replace('.',',');
  }

  function mkTh(txt){ var t=el('th',{});t.style.cssText='padding:7px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);white-space:nowrap;';t.textContent=txt;return t; }
  function mkTd(txt,warn){ var t=el('td',{});t.style.cssText='padding:6px 10px;font-size:12px;color:'+(warn?'var(--danger)':'var(--text2)')+';border-bottom:1px solid var(--border);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';t.textContent=txt||'—';return t; }

  var previewRows = rows.slice(0, 20).map(function(p) {
    var tr=el('tr',{});
    COLS.forEach(function(c){
      var raw = map[c.k]!==undefined ? (p[map[c.k]]||'').toString().trim() : '';
      var isMoney = c.k==='precoVenda' || c.k==='custoMedio';
      tr.appendChild(mkTd(fmtPreview(raw, isMoney), c.k==='nome'&&!raw));
    });
    return tr;
  });

  var thead = el('thead',{},COLS.map(function(c){return mkTh(c.l);}));
  var tbody = el('tbody',{}, previewRows.length
    ? previewRows
    : [el('tr',{},[el('td',{colspan:'6',style:{padding:'20px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}},'Nenhum dado encontrado')])]
  );
  var table = el('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:'13px'}});
  table.appendChild(thead); table.appendChild(tbody);

  var validCount = rows.filter(function(r){ return map.nome!==undefined && (r[map.nome]||'').toString().trim(); }).length;

  function confirmarImport() {
    var prods = rows.map(function(r){ return _rowToProduto(r, map, centavos); }).filter(Boolean);
    if (!prods.length) { showToast('Nenhum produto válido para importar','error'); return; }
    // Remove duplicatas por nome+perfil
    var existentes = (state.produtos||[]);
    var nomeSet = {};
    existentes.forEach(function(p){ if(p.profile===state.profile) nomeSet[p.nome.toLowerCase()]=true; });
    var novos = prods.filter(function(p){ return !nomeSet[p.nome.toLowerCase()]; });
    var atualizados = prods.filter(function(p){ return nomeSet[p.nome.toLowerCase()]; });
    var merged = existentes.slice();
    // Atualiza preços dos existentes
    atualizados.forEach(function(p){
      var idx = merged.findIndex(function(x){ return x.profile===state.profile && x.nome.toLowerCase()===p.nome.toLowerCase(); });
      if (idx>=0) merged[idx] = Object.assign({}, merged[idx], {precoVenda:p.precoVenda,custoMedio:p.custoMedio,categoria:p.categoria,sku:p.sku,ncm:p.ncm,cfop:p.cfop,cst:p.cst,cest:p.cest});
    });
    merged = merged.concat(novos);
    lsSet('produtos', merged);
    setState({ produtos: merged });
    scheduleSave();
    _crdImport = null;
    // Cria automaticamente categorias em estCategorias para as strings importadas
    var catsCriadas = _syncCategoriasProdutos();
    showToast('✅ '+novos.length+' produto(s) importado(s)'
      +(atualizados.length?' | '+atualizados.length+' atualizado(s)':'')
      +(catsCriadas?' | '+catsCriadas+' categoria(s) criada(s)':''), 'success');
  }

  var body = el('div',{style:{padding:'16px',maxHeight:'55vh',overflowY:'auto'}});

  if (!imp || !imp.rows) {
    // Estado inicial: escolher arquivo
    var fileInp = el('input',{type:'file',accept:'.xlsx,.xls,.csv',id:'_crd-file-inp',style:{display:'none'}});
    fileInp.onchange = function() {
      var f = this.files[0];
      if (!f) return;
      var isCsv = /\.csv$/i.test(f.name);
      var loader = isCsv ? _csvToRows : _xlsxToRows;
      loader(f, function(err, allRows) {
        if (err || !allRows || !allRows.length) { showToast('Erro ao ler arquivo: '+(err&&err.message||'formato inválido'),'error'); return; }
        var header   = allRows[0];
        var dataRows = allRows.slice(1);
        var m        = _mapColunas(header);
        var cents    = _detectaCentavos(dataRows, m);
        _crdImport = { rows: dataRows, map: m, header: header, centavos: cents };
        setState({});
      });
    };
    var pickBtn = el('label',{for:'_crd-file-inp'});
    pickBtn.style.cssText='display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:8px;background:var(--gold);color:#000;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;border:none;';
    pickBtn.textContent='📂 Escolher arquivo (.xlsx ou .csv)';
    body.appendChild(fileInp);
    body.appendChild(el('div',{style:{textAlign:'center',padding:'30px 0'}},[
      el('div',{style:{fontSize:'48px',marginBottom:'12px'}},'📊'),
      el('div',{style:{fontSize:'14px',fontWeight:'700',marginBottom:'6px',color:'var(--text)'}},'Importar planilha de produtos'),
      el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'20px',lineHeight:'1.5'}},'Selecione sua planilha Excel (.xlsx) ou CSV.<br>O sistema detecta automaticamente as colunas: Nome, Categoria, Valor de Venda, Custo, Código, NCM, CFOP, CST.'),
      pickBtn,
    ]));
  } else {
    // Preview dos dados
    var infoBanner = el('div',{style:{padding:'10px 14px',borderRadius:'8px',background:'var(--bg3)',border:'1px solid var(--border)',marginBottom:'10px',fontSize:'12px',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}});
    var infoLeft = el('span',{},'📋 '+validCount+' linha(s) encontrada(s). Exibindo até 20 na prévia.');
    // Toggle centavos
    var centRow = el('label',{style:{display:'flex',alignItems:'center',gap:'6px',cursor:'pointer',fontSize:'12px',color:'var(--text2)',whiteSpace:'nowrap'}});
    var centChk = el('input',{type:'checkbox',style:{cursor:'pointer',width:'14px',height:'14px'}});
    if (centavos) centChk.checked = true;
    centChk.onchange = function(){ _crdImport.centavos = this.checked; setState({}); };
    centRow.appendChild(centChk);
    centRow.appendChild(el('span',{},'Preços em centavos (÷100)'));
    infoBanner.appendChild(infoLeft);
    infoBanner.appendChild(centRow);
    body.appendChild(infoBanner);

    var tableWrap=el('div',{style:{overflowX:'auto',border:'1px solid var(--border)',borderRadius:'8px'}});
    tableWrap.appendChild(table);
    body.appendChild(tableWrap);

    if (rows.length > 20) {
      var more=el('div',{style:{textAlign:'center',padding:'8px',fontSize:'11px',color:'var(--text3)'}});
      more.textContent='... e mais '+(rows.length-20)+' linha(s) não exibidas';
      body.appendChild(more);
    }

    // Mostra mapeamento de colunas detectado
    var mapInfo = el('div',{style:{marginTop:'12px',padding:'10px 14px',borderRadius:'8px',background:'var(--bg3)',fontSize:'11px',color:'var(--text3)'}});
    mapInfo.innerHTML='<strong style="color:var(--text2)">Colunas detectadas:</strong> '
      + Object.keys(map).map(function(k){return '<span style="color:var(--gold)">'+k+'</span>=col '+(map[k]+1);}).join(', ');
    body.appendChild(mapInfo);
  }

  var footer = el('div',{style:{display:'flex',gap:'8px',justifyContent:'flex-end',padding:'14px 16px',borderTop:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'0 0 12px 12px'}});
  if (imp && imp.rows) {
    footer.appendChild(btn('btn-ghost','← Escolher outro',function(){ _crdImport={};setState({}); }));
  }
  footer.appendChild(btn('btn-ghost','Cancelar',fechar));
  if (imp && imp.rows && validCount > 0) {
    footer.appendChild(btn('btn-primary','✅ Importar '+validCount+' produto(s)',confirmarImport));
  }

  var modal = el('div',{});
  modal.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;width:min(700px,96vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;';

  var header2 = el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid var(--border)'}});
  header2.appendChild(el('span',{style:{fontWeight:'800',fontSize:'16px'}},'📥 Importar Produtos via Planilha'));
  var closeBtn=el('button',{onclick:fechar});
  closeBtn.style.cssText='background:none;border:none;font-size:20px;cursor:pointer;color:var(--text3);padding:2px 6px;line-height:1;';
  closeBtn.textContent='×';
  header2.appendChild(closeBtn);
  modal.appendChild(header2);
  modal.appendChild(body);
  modal.appendChild(footer);

  var ov = el('div',{onclick:function(e){if(e.target===this)fechar();}});
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9900;display:flex;align-items:center;justify-content:center;';
  ov.appendChild(modal);
  return ov;
}

function renderCardapio() {
  var perfil  = state.profile;
  var cats    = estCats();
  var setores = (state.setoresImpressao||[]).filter(function(s){return s.profile===perfil;});
  var isComp   = _crdTab === 'complementos';
  var isCats   = _crdTab === 'categorias';
  var isEmb    = _crdTab === 'embalagens';
  var isGrupos = _crdTab === 'grupos';

  var todosProd = (state.produtos||[]).filter(function(p){
    return p.profile===perfil && p.tipo==='produto';
  });
  var todosComp = (state.complementos||[]).filter(function(c){
    return c.profile===perfil;
  });
  var todos = (isCats||isEmb) ? [] : isComp ? todosComp : todosProd;

  var visivel = todos.filter(function(p){
    var q = _crdBusca.toLowerCase();
    if (q && !(p.nome||'').toLowerCase().includes(q) && !(p.codigo||'').toLowerCase().includes(q)) return false;
    if (!isComp && !isCats && !isEmb && _crdCatFlt && p.categoria !== _crdCatFlt) return false;
    if (!isComp && !isCats && !isEmb && _crdSetFlt && p.setorImpressao !== _crdSetFlt) return false;
    if (_crdStsFlt==='ativo'   && p.disponivel===false) return false;
    if (_crdStsFlt==='inativo' && p.disponivel!==false) return false;
    return true;
  });

  // ── Modal de categoria ───────────────────────────────────────────────────────
  var catModal = null;
  if (_crdCatModal !== null) {
    var cm = _crdCatModal;
    var isEditCat = !!cm.id;
    var previewUrl = cm.imagem || '';

    var nomeInpCat = el('input',{class:'form-input',placeholder:'Ex: Artesanais Clássicos, Bebidas, Porções...',value:cm.nome||'',
      oninput:function(){cm.nome=this.value;}});
    var imgInpCat  = el('input',{class:'form-input',type:'url',placeholder:'https://...',value:cm.imagem||'',
      oninput:function(){
        cm.imagem=this.value;
        previewEl.style.backgroundImage=this.value?'url("'+this.value+'")':"url('')";
        previewEl.innerHTML=this.value?'':'<div style="color:#9ca3af;font-size:28px">🏷️</div>';
      }});

    var previewEl = el('div',{style:{
      width:'100%',height:'120px',borderRadius:'8px',backgroundSize:'cover',backgroundPosition:'center',
      background:'#f3f4f6',display:'flex',alignItems:'center',justifyContent:'center',
      border:'1px solid var(--border)',marginTop:'4px',overflow:'hidden'
    }});
    if (previewUrl) {
      previewEl.style.backgroundImage='url("'+previewUrl+'")';
    } else {
      previewEl.innerHTML='<div style="color:#9ca3af;font-size:28px">🏷️</div>';
    }

    function salvarCat() {
      var nome=((nomeInpCat&&nomeInpCat.value)||cm.nome||'').trim();
      cm.nome=nome;
      if(!nome){_fldErr(nomeInpCat,'Nome da categoria é obrigatório');showToast('Preencha os campos em vermelho','error');return;}
      var arr=(state.estCategorias||[]).filter(function(c){return typeof c!=='string'&&c&&c.nome;});
      var dup=arr.find(function(c){return c.nome.toLowerCase()===nome.toLowerCase()&&c.id!==cm.id;});
      if(dup){showToast('Já existe uma categoria com este nome','error');return;}
      var item={id:isEditCat?cm.id:('cat_'+Date.now()),nome:nome,imagem:cm.imagem||''};
      var novas=isEditCat
        ?arr.map(function(c){return c.id===item.id?item:c;})
        :arr.concat([item]);
      if(isEditCat){
        // Renomeia nos produtos e montagens
        var novosProds=(state.produtos||[]).map(function(p){return p.categoria===cm._nomeOriginal?Object.assign({},p,{categoria:nome}):p;});
        var novosComps=(state.complementos||[]).map(function(c){return c.categoria===cm._nomeOriginal?Object.assign({},c,{categoria:nome}):c;});
        lsSet('estCategorias',novas);lsSet('produtos',novosProds);lsSet('complementos',novosComps);
        _crdCatModal=null;
        setState({estCategorias:novas,produtos:novosProds,complementos:novosComps});
      } else {
        lsSet('estCategorias',novas);
        _crdCatModal=null;
        setState({estCategorias:novas});
      }
      scheduleSave();
      showToast(isEditCat?'Categoria atualizada!':'Categoria criada!');
    }

    var mEl=el('div',{class:'modal',style:{maxWidth:'480px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEditCat?'✏️ Editar':'➕ Nova')+' categoria'),
        el('button',{class:'modal-close',onclick:function(){_crdCatModal=null;setState({});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        div('form-group',[el('label',{class:'form-label'},'Nome *'),nomeInpCat]),
        div('form-group',[
          el('label',{class:'form-label'},'Imagem de capa (URL)'),
          imgInpCat,
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Cole a URL de uma imagem. Ex: link do Google Fotos, ImgBB, Unsplash...'),
          previewEl,
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){_crdCatModal=null;setState({});}),
        btn('btn-primary',isEditCat?'💾 Salvar':'➕ Criar',salvarCat),
      ]),
    ]);
    var mOv=div('modal-overlay',[mEl]);
    catModal=mOv;
  }

  // ── Modal complemento ────────────────────────────────────────────────────────
  var compModal = null;
  if (state.complementoModal !== null && state.complementoModal !== undefined) {
    var cmr   = state.complementoModal;
    var isEc  = !!cmr.id;
    function ci(field,type,ph,val){
      return el('input',{class:'form-input',type:type||'text',value:String(val||''),placeholder:ph||'',
        oninput:function(){cmr[field]=type==='number'?parseFloat(this.value)||0:this.value;}});
    }
    var catsSel=el('select',{class:'form-input',onchange:function(){cmr.categoria=this.value;}},
      cats.map(function(c){var o=el('option',{value:c},c);if(c===(cmr.categoria||cats[0]))o.selected=true;return o;}));

    function salvarComp(){
      if(!(cmr.nome||'').trim()){showToast('Informe o nome','error');return;}
      var item={id:isEc?cmr.id:uid(),profile:state.profile,nome:(cmr.nome||'').trim(),
        codigo:cmr.codigo||'',categoria:cmr.categoria||cats[0]||'',
        preco:cmr.preco||0,custo:cmr.custo||0,estoque:cmr.estoque||0,
        disponivel:cmr.disponivel!==false,criadoEm:cmr.criadoEm||today()};
      var arr=isEc
        ?(state.complementos||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.complementos||[]).concat([item]);
      lsSet('complementos',arr);
      logAudit((isEc?'editou':'cadastrou')+' montagem',item.nome);
      setState({complementos:arr,complementoModal:null});
      scheduleSave();
      showToast(isEc?'Montagem atualizada!':'Montagem cadastrada!');
    }

    var mEl2=el('div',{class:'modal',style:{maxWidth:'480px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEc?'✏️ Editar':'➕ Nova')+' Montagem'),
        el('button',{class:'modal-close',onclick:function(){setState({complementoModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
          el('div',{style:{gridColumn:'1/-1'}},
            div('form-group',[el('label',{class:'form-label'},'Nome *'),ci('nome','text','Ex: Bacon extra, Queijo, Molho especial...',cmr.nome||'')])),
          div('form-group',[el('label',{class:'form-label'},'Código'),ci('codigo','text','EX-001',cmr.codigo||'')]),
          div('form-group',[el('label',{class:'form-label'},'Categoria'),catsSel]),
          div('form-group',[el('label',{class:'form-label'},'Preço de venda (R$)'),ci('preco','number','0,00',cmr.preco||'')]),
          div('form-group',[el('label',{class:'form-label'},'Custo (R$)'),ci('custo','number','0,00',cmr.custo||'')]),
          div('form-group',[el('label',{class:'form-label'},'Estoque'),ci('estoque','number','0',cmr.estoque||'')]),
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({complementoModal:null});}),
        btn('btn-primary',isEc?'💾 Salvar':'➕ Criar',salvarComp),
      ]),
    ]);
    var mOv2=div('modal-overlay',[mEl2]);
    compModal=mOv2;
  }

  // ── Modal GRUPO DE MONTAGEM ──────────────────────────────────────────────────
  var grupoCompModal = null;
  if (state.grupoCompModal !== null && state.grupoCompModal !== undefined) {
    var gcm = state.grupoCompModal;
    var isEditGrp = !!gcm.id;
    if (!gcm.opcoes) gcm.opcoes = [];
    var todosInsGcm = (state.estoqueItens||[]).filter(function(x){return x.profile===perfil;})
      .concat((state.produtos||[]).filter(function(x){return x.tipo==='insumo'&&x.profile===perfil;}));

    var gcmNomeInp = el('input',{class:'form-input',type:'text',placeholder:'Ex: Tipo de Pão, Ponto da Carne, Molhos...',value:gcm.nome||''});
    gcmNomeInp.oninput = function(){gcm.nome=this.value;};

    function mkGcmToggle(label, getVal, setVal) {
      var t=el('div',{style:{display:'inline-flex',alignItems:'center',width:'32px',height:'18px',borderRadius:'9px',background:getVal()?'var(--green)':'var(--border)',padding:'2px',cursor:'pointer',transition:'background .2s',flexShrink:'0'}});
      var th=el('div',{style:{width:'14px',height:'14px',borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.3)',transition:'transform .2s',transform:'translateX('+(getVal()?'14px':'0px')+')'}});
      t.appendChild(th);
      t.onclick=function(){setVal(!getVal());t.style.background=getVal()?'var(--green)':'var(--border)';th.style.transform='translateX('+(getVal()?'14px':'0px')+')';};
      return el('div',{style:{display:'flex',alignItems:'center',gap:'8px',userSelect:'none'}},[t,el('span',{style:{fontSize:'13px',color:'var(--text2)'}},label)]);
    }

    var optsContainer = el('div',{});

    function renderGcmOpts() {
      while(optsContainer.firstChild) optsContainer.removeChild(optsContainer.firstChild);
      if(!gcm.opcoes.length){
        optsContainer.appendChild(el('div',{style:{textAlign:'center',color:'var(--text3)',fontSize:'12px',padding:'12px 0'}},'Nenhuma opção adicionada.'));
        return;
      }
      optsContainer.appendChild(el('div',{style:{display:'grid',gridTemplateColumns:'1fr 80px 1fr 64px 24px',gap:'6px',fontSize:'10px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',marginBottom:'6px'}},
        [el('span',{},'Opção'),el('span',{style:{textAlign:'center'}},'+Preço'),el('span',{},'Insumo (baixa estoque)'),el('span',{style:{textAlign:'center'}},'Qtd'),el('span',{},'')]));
      gcm.opcoes.forEach(function(opt,idx){
        var nInp=el('input',{class:'form-input',type:'text',placeholder:'Nome da opção',style:{fontSize:'12px'}});
        nInp.value=opt.nome||'';
        nInp.oninput=function(){opt.nome=this.value;};
        var pInp=el('input',{class:'form-input',type:'number',min:'0',step:'0.01',placeholder:'0,00',style:{fontSize:'12px',textAlign:'center'}});
        pInp.value=opt.preco!=null?String(opt.preco):'0';
        pInp.oninput=function(){opt.preco=parseFloat(this.value)||0;};
        var insInp=el('input',{class:'form-input',type:'text',placeholder:'Buscar insumo...',style:{fontSize:'12px'},autocomplete:'off'});
        var insM=opt.insumoId?todosInsGcm.find(function(x){return x.id===opt.insumoId;}):null;
        insInp.value=insM?insM.nome:(opt.insumoNome||'');
        insInp.oninput=function(){
          opt.insumoId=null; opt.insumoNome=this.value;
          var q=this.value.trim().toLowerCase();
          var olds=document.querySelectorAll('.gcm-sug');
          for(var _i=0;_i<olds.length;_i++){if(olds[_i].parentNode)olds[_i].parentNode.removeChild(olds[_i]);}
          if(!q) return;
          var matches=todosInsGcm.filter(function(x){return x.nome&&x.nome.toLowerCase().includes(q);}).slice(0,8);
          if(!matches.length) return;
          var sugDiv=document.createElement('div');
          sugDiv.className='gcm-sug';
          var rect=insInp.getBoundingClientRect();
          sugDiv.style.cssText='position:fixed;z-index:9999;background:var(--bg2);border:1px solid var(--border);border-radius:8px;overflow:hidden;max-height:160px;overflow-y:auto;box-shadow:0 4px 24px rgba(0,0,0,.18);';
          sugDiv.style.left=rect.left+'px';sugDiv.style.top=(rect.bottom+2)+'px';sugDiv.style.width=Math.max(rect.width,200)+'px';
          matches.forEach(function(ins){
            var it=document.createElement('div');
            it.style.cssText='padding:7px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;';
            it.innerHTML='<span>'+ins.nome+'</span><span style="font-size:10px;color:var(--text3)">'+(ins.unidade||'un')+'</span>';
            it.onmouseover=function(){this.style.background='var(--bg3)';};
            it.onmouseout=function(){this.style.background='';};
            it.onmousedown=function(e){
              e.preventDefault();
              opt.insumoId=ins.id;opt.insumoNome=ins.nome;insInp.value=ins.nome;
              var drops=document.querySelectorAll('.gcm-sug');
              for(var _d=0;_d<drops.length;_d++){if(drops[_d].parentNode)drops[_d].parentNode.removeChild(drops[_d]);}
            };
            sugDiv.appendChild(it);
          });
          document.body.appendChild(sugDiv);
          insInp.onblur=function(){setTimeout(function(){var drops=document.querySelectorAll('.gcm-sug');for(var _d=0;_d<drops.length;_d++){if(drops[_d].parentNode)drops[_d].parentNode.removeChild(drops[_d]);}},150);};
        };
        var qInp=el('input',{class:'form-input',type:'number',min:'0.001',step:'0.001',placeholder:'1',style:{fontSize:'12px',textAlign:'center'}});
        qInp.value=opt.quantidade!=null?String(opt.quantidade):'1';
        qInp.oninput=function(){opt.quantidade=parseFloat(this.value)||1;};
        var rmOpt=el('button',{class:'btn-ghost',style:{padding:'2px 6px',fontSize:'14px',color:'var(--danger)'}});
        rmOpt.textContent='×';
        rmOpt.onclick=function(e){e.preventDefault();gcm.opcoes.splice(idx,1);renderGcmOpts();};
        optsContainer.appendChild(el('div',{style:{display:'grid',gridTemplateColumns:'1fr 80px 1fr 64px 24px',gap:'6px',alignItems:'center',marginBottom:'4px'}},[nInp,pInp,insInp,qInp,rmOpt]));
      });
    }
    renderGcmOpts();

    var addOptBtn=btn('btn-ghost','+ Adicionar opção',function(e){
      e.preventDefault();
      gcm.opcoes.push({id:uid(),nome:'',preco:0,insumoId:null,insumoNome:'',quantidade:1});
      renderGcmOpts();
    });
    addOptBtn.style.fontSize='12px';addOptBtn.style.marginTop='6px';

    function salvarGrupo(){
      if(!(gcm.nome||'').trim()){showToast('Informe o nome do grupo','error');return;}
      var grp={
        id:gcm.id||uid(), profile:state.profile,
        nome:(gcm.nome||'').trim(),
        obrigatorio:!!gcm.obrigatorio, multiplo:!!gcm.multiplo,
        opcoes:(gcm.opcoes||[]).filter(function(o){return !!(o.nome||'').trim();}).map(function(o){
          return {id:o.id||uid(),nome:o.nome.trim(),preco:o.preco||0,insumoId:o.insumoId||null,insumoNome:o.insumoNome||'',quantidade:o.quantidade||1};
        }),
      };
      var arr=isEditGrp
        ?(state.gruposComp||[]).map(function(g){return g.id===grp.id?grp:g;})
        :(state.gruposComp||[]).concat([grp]);
      lsSet('gruposComp',arr);
      setState({gruposComp:arr,grupoCompModal:null});
      scheduleSave();
      showToast(isEditGrp?'Grupo atualizado!':'Grupo criado!');
    }

    var gcmBody=el('div',{class:'modal-body'});
    gcmBody.appendChild(div('form-group',[el('label',{class:'form-label'},'Nome do grupo *'),gcmNomeInp]));
    gcmBody.appendChild(el('div',{style:{display:'flex',gap:'20px',marginBottom:'14px',flexWrap:'wrap'}},[
      mkGcmToggle('Obrigatório (operador deve escolher)',function(){return !!gcm.obrigatorio;},function(v){gcm.obrigatorio=v;}),
      mkGcmToggle('Seleção múltipla',function(){return !!gcm.multiplo;},function(v){gcm.multiplo=v;}),
    ]));
    gcmBody.appendChild(el('div',{style:{fontSize:'11px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',marginBottom:'8px'}},'📋 Opções do grupo'));
    gcmBody.appendChild(optsContainer);
    gcmBody.appendChild(addOptBtn);

    var gcmMod=el('div',{class:'modal',style:{maxWidth:'660px'}});
    gcmMod.appendChild(el('div',{class:'modal-header'},[
      el('h3',{class:'modal-title'},(isEditGrp?'✏️ Editar':'➕ Novo')+' Grupo de Montagem'),
      el('button',{class:'modal-close',onclick:function(){setState({grupoCompModal:null});}}, '✕'),
    ]));
    gcmMod.appendChild(gcmBody);
    gcmMod.appendChild(el('div',{class:'modal-footer'},[
      btn('btn-secondary','Cancelar',function(){setState({grupoCompModal:null});}),
      btn('btn-primary',isEditGrp?'💾 Salvar':'➕ Criar',salvarGrupo),
    ]));
    grupoCompModal = div('modal-overlay',[gcmMod]);
  }

  // ── Helpers de dropdown ──────────────────────────────────────────────────────
  function filterDrop(id, label, value, options, onSelect, onClear) {
    var isOpen = state.crdDropOpen === id;
    var hasVal = !!value;
    var selLabel = hasVal ? (options.find(function(o){return o.v===value;})||{}).l : null;
    var wrap = el('div',{style:{position:'relative',display:'inline-block'}});
    var btnEl = el('button',{});
    btnEl.style.cssText='display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:6px;border:1px solid '
      +(hasVal?'var(--gold)':'var(--border)')+';background:'+(hasVal?'var(--gold-dim)':'var(--bg2)')+';color:'
      +(hasVal?'var(--gold)':'var(--text2)')+';font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:all .15s;';
    btnEl.appendChild(el('span',{style:{opacity:'.55',fontSize:'11px'}},'⊿'));
    if(hasVal){
      btnEl.appendChild(el('span',{style:{fontWeight:'600'}},selLabel));
      var clrBtn=el('button',{});
      clrBtn.style.cssText='margin-left:2px;padding:0 3px;background:none;border:none;cursor:pointer;color:var(--text3);font-size:15px;line-height:1;';
      clrBtn.textContent='×';
      clrBtn.onclick=function(e){e.stopPropagation();onClear();setState({crdDropOpen:null});};
      btnEl.appendChild(clrBtn);
    } else {
      var lbl=el('span',{});
      lbl.innerHTML='Filtrar: <em style="font-style:normal;opacity:.7">'+label+'</em>';
      btnEl.appendChild(lbl);
      btnEl.appendChild(el('span',{style:{fontSize:'10px',opacity:'.55'}},'▼'));
    }
    btnEl.onclick=function(e){e.stopPropagation();setState({crdDropOpen:isOpen?null:id});};
    wrap.appendChild(btnEl);
    if (isOpen) {
      var panel=el('div',{});
      panel.style.cssText='position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;min-width:200px;z-index:9500;box-shadow:0 4px 16px rgba(0,0,0,.25);overflow:hidden;';
      options.forEach(function(o){
        var row=el('div',{});
        var isAct=value===o.v;
        row.style.cssText='padding:9px 14px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;color:'+(isAct?'var(--gold)':'var(--text)')+';background:'+(isAct?'var(--gold-dim)':'transparent')+';';
        row.onmouseenter=function(){if(!isAct)this.style.background='var(--bg3)';};
        row.onmouseleave=function(){if(!isAct)this.style.background='transparent';};
        if(isAct){row.appendChild(el('span',{style:{fontSize:'10px'}},'✓'));}
        row.appendChild(document.createTextNode(o.l));
        row.onclick=function(e){e.stopPropagation();onSelect(o.v);setState({crdDropOpen:null});};
        panel.appendChild(row);
      });
      wrap.appendChild(panel);
    }
    return wrap;
  }

  if (state.crdDropOpen) {
    setTimeout(function(){
      document.addEventListener('click',function handler(){
        setState({crdDropOpen:null});
        document.removeEventListener('click',handler);
      },{once:true});
    },10);
  }

  // ── Ações em massa ────────────────────────────────────────────────────────────
  function acoesBtn() {
    var isOpen = state.crdDropOpen === 'acoes';
    var selIds = Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    var wrap = el('div',{style:{position:'relative',display:'inline-block'}});
    var b = el('button',{});
    b.style.cssText='display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:6px;border:1px solid '
      +(selIds.length?'var(--gold)':'var(--border)')+';background:var(--bg2);color:var(--text2);font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;';
    b.innerHTML='<span style="font-size:12px">✎</span> Ações <span style="font-size:10px;opacity:.6">▼</span>';
    b.onclick=function(e){e.stopPropagation();setState({crdDropOpen:isOpen?null:'acoes'});};
    wrap.appendChild(b);
    if(isOpen){
      var panel=el('div',{});
      panel.style.cssText='position:absolute;top:calc(100% + 4px);left:0;background:var(--bg2);border:1px solid var(--border);border-radius:8px;min-width:220px;z-index:9500;box-shadow:0 4px 16px rgba(0,0,0,.25);overflow:hidden;';
      if(!selIds.length){
        panel.appendChild(el('div',{style:{padding:'10px 14px',fontSize:'12px',color:'var(--text3)'}},'Selecione itens na tabela primeiro.'));
      } else {
        [{l:'✅ Ativar selecionados',fn:function(){ativarSel(true);}},
         {l:'🚫 Desativar selecionados',fn:function(){ativarSel(false);}},
         {l:'🗑 Excluir selecionados',fn:function(){excluirSel();},danger:true}].forEach(function(a){
          var row=el('div',{});
          row.style.cssText='padding:9px 14px;cursor:pointer;font-size:13px;color:'+(a.danger?'var(--danger)':'var(--text)')+';';
          row.onmouseenter=function(){this.style.background='var(--bg3)';};
          row.onmouseleave=function(){this.style.background='';};
          row.textContent=a.l;
          row.onclick=function(e){e.stopPropagation();setState({crdDropOpen:null});a.fn();};
          panel.appendChild(row);
        });
      }
      wrap.appendChild(panel);
    }
    return wrap;
  }

  function ativarSel(val){
    var ids=Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    if(!ids.length)return;
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).map(function(p){return ids.indexOf(p.id)>=0?Object.assign({},p,{disponivel:val}):p;});
    _crdSel={};lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
    showToast((val?'Ativado(s)':'Desativado(s)')+': '+ids.length+' item(s)');
  }
  function excluirSel(){
    var ids=Object.keys(_crdSel).filter(function(k){return _crdSel[k];});
    if(!ids.length)return;
    if(!window.confirm('Excluir '+ids.length+' item(s)?'))return;
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).filter(function(p){return ids.indexOf(p.id)<0;});
    _crdSel={};lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
    showToast('Excluído(s): '+ids.length+' item(s)','error');
  }
  function toggleDisponivel(p){
    var key=isComp?'complementos':'produtos';
    var arr=(state[key]||[]).map(function(x){return x.id===p.id?Object.assign({},x,{disponivel:p.disponivel===false}):x;});
    lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
  }

  // ── TAB bar ──────────────────────────────────────────────────────────────────
  function tabBtn(id,label){
    var b=el('button',{});
    b.style.cssText='padding:14px 22px;font-size:14px;font-weight:'+(_crdTab===id?'700':'500')+';'
      +'background:none;border:none;border-bottom:3px solid '+(_crdTab===id?'var(--gold)':'transparent')+';'
      +'color:'+(_crdTab===id?'var(--text)':'var(--text3)')+';cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;';
    b.textContent=label;
    b.onclick=function(){_crdTab=id;_crdSel={};setState({});};
    return b;
  }

  var tabBarRight;
  if (isCats) {
    tabBarRight = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}});
    var ncBtn=el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'}});
    ncBtn.textContent='+ Nova categoria';
    ncBtn.onclick=function(){_crdCatModal={nome:'',imagem:''};setState({});};
    tabBarRight.appendChild(ncBtn);
  } else if (isEmb) {
    tabBarRight = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}});
    var embInfoEl=el('span',{style:{fontSize:'11px',color:'var(--text3)'}});
    var embCount=todosProd.filter(function(p){return p.embalagens&&p.embalagens.ativo;}).length;
    embInfoEl.textContent=embCount+' produto(s) configurado(s)';
    tabBarRight.appendChild(embInfoEl);
  } else {
    tabBarRight = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px'}});
    if (!isComp) {
      var importBtn=el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'7px 12px',whiteSpace:'nowrap',borderColor:'var(--border)'}});
      importBtn.textContent='📥 Importar planilha';
      importBtn.onclick=function(){ _crdImport={}; setState({}); };
      tabBarRight.appendChild(importBtn);
    }
    var addBtn=el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',whiteSpace:'nowrap'}});
    addBtn.textContent = isComp ? '+ Nova montagem' : '+ Novo produto';
    addBtn.onclick = function(){
      if(isComp) setState({complementoModal:{}});
      else setState({produtoModal:{tipo:'produto'}});
    };
    tabBarRight.appendChild(addBtn);
  }

  var tabBar=el('div',{style:{display:'flex',alignItems:'stretch',borderBottom:'1px solid var(--border)',background:'var(--bg2)',borderRadius:'10px 10px 0 0',padding:'0 4px',justifyContent:'space-between'}},[
    el('div',{style:{display:'flex'}},[
      tabBtn('produtos','Produtos'),
      tabBtn('complementos','Montagens'),
      tabBtn('grupos','🎛️ Grupos'),
      tabBtn('categorias','🏷️ Categorias'),
      tabBtn('embalagens','📦 Embalagens'),
    ]),
    tabBarRight,
  ]);

  // ── ABA GRUPOS DE MONTAGEM ───────────────────────────────────────────────────
  function renderGruposTab() {
    var todosInsGT = (state.estoqueItens||[]).filter(function(x){return x.profile===perfil;})
      .concat((state.produtos||[]).filter(function(x){return x.tipo==='insumo'&&x.profile===perfil;}));
    var grupos = (state.gruposComp||[]).filter(function(g){return g.profile===perfil;});

    var wrap = el('div',{style:{padding:'16px'}});
    var hdrRow = el('div',{style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'16px',gap:'12px'}});
    hdrRow.appendChild(el('div',{},[
      el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--text)'}},'🎛️ Grupos de Montagem / Complementos'),
      el('div',{style:{fontSize:'12px',color:'var(--text3)',marginTop:'4px'}},'Configure grupos de opções para os produtos (ex: "Tipo de Pão", "Ponto da Carne", "Molhos"). No PDV o operador seleciona antes de finalizar.'),
    ]));
    var addGrpBtn = el('button',{class:'btn-primary',style:{fontSize:'12px',padding:'7px 14px',flexShrink:'0'}});
    addGrpBtn.textContent = '+ Novo Grupo';
    addGrpBtn.onclick = function(){setState({grupoCompModal:{opcoes:[]}});};
    hdrRow.appendChild(addGrpBtn);
    wrap.appendChild(hdrRow);

    if(!grupos.length){
      wrap.appendChild(el('div',{style:{textAlign:'center',padding:'60px 20px',color:'var(--text3)'}}, [
        el('div',{style:{fontSize:'36px',marginBottom:'12px'}},'🎛️'),
        el('div',{style:{fontWeight:'700',fontSize:'14px',marginBottom:'6px'}},'Nenhum grupo criado'),
        el('div',{style:{fontSize:'13px'}},'Clique em "+ Novo Grupo" para criar grupos de complementos (ex: "Tipo de Pão") com suas opções e vincular a insumos de estoque.'),
      ]));
      return wrap;
    }

    var grid = el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'14px'}});
    grupos.forEach(function(grp){
      var card = el('div',{style:{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'10px',overflow:'hidden'}});
      var cardHdr = el('div',{style:{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'8px'}});
      var info = el('div',{style:{flex:'1'}});
      var nameRow = el('div',{style:{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap'}});
      nameRow.appendChild(el('span',{style:{fontWeight:'700',fontSize:'14px',color:'var(--text)'}},grp.nome));
      if(grp.obrigatorio) nameRow.appendChild(el('span',{style:{fontSize:'10px',padding:'2px 7px',borderRadius:'10px',background:'rgba(239,68,68,.1)',color:'#ef4444',fontWeight:'700'}},'Obrigatório'));
      if(grp.multiplo)    nameRow.appendChild(el('span',{style:{fontSize:'10px',padding:'2px 7px',borderRadius:'10px',background:'var(--bg3)',color:'var(--text3)',fontWeight:'600'}},'Múltiplo'));
      info.appendChild(nameRow);
      info.appendChild(el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}},(grp.opcoes||[]).length+' opção(ões)'));
      cardHdr.appendChild(info);
      var editBtn=el('button',{style:{background:'none',border:'1px solid var(--border)',cursor:'pointer',borderRadius:'5px',padding:'3px 8px',fontSize:'12px',color:'var(--text3)',flexShrink:'0'}});
      editBtn.textContent='✏️';
      editBtn.onclick=function(){setState({grupoCompModal:Object.assign({},grp,{opcoes:(grp.opcoes||[]).map(function(o){return Object.assign({},o);})})});};
      var delGBtn=el('button',{style:{background:'none',border:'1px solid var(--border)',cursor:'pointer',borderRadius:'5px',padding:'3px 8px',fontSize:'12px',color:'var(--danger)',flexShrink:'0'}});
      delGBtn.textContent='🗑';
      delGBtn.onclick=function(){
        if(!confirm('Excluir grupo "'+grp.nome+'"?')) return;
        var arr=(state.gruposComp||[]).filter(function(g){return g.id!==grp.id;});
        lsSet('gruposComp',arr); setState({gruposComp:arr}); scheduleSave();
        showToast('Grupo excluído','error');
      };
      cardHdr.appendChild(editBtn); cardHdr.appendChild(delGBtn);
      card.appendChild(cardHdr);

      var optList = el('div',{style:{padding:'8px 14px'}});
      if(!(grp.opcoes||[]).length){
        optList.appendChild(el('div',{style:{fontSize:'12px',color:'var(--text3)',padding:'4px 0'}},'Nenhuma opção. Clique em ✏️ para adicionar.'));
      } else {
        (grp.opcoes||[]).forEach(function(opt){
          var ins = todosInsGT.find(function(x){return x.id===opt.insumoId;});
          var row=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'4px 0',borderBottom:'1px solid var(--border)',fontSize:'12px'}});
          row.appendChild(el('span',{style:{flex:'1',color:'var(--text)'}},opt.nome));
          if(opt.preco>0) row.appendChild(el('span',{style:{color:'var(--gold)',fontWeight:'600',flexShrink:'0'}},'+'+fmtMoney(opt.preco)));
          if(ins) row.appendChild(el('span',{style:{fontSize:'10px',color:'var(--text3)',flexShrink:'0'}},'📦 '+ins.nome+' ×'+(opt.quantidade||1)));
          else if(opt.insumoNome) row.appendChild(el('span',{style:{fontSize:'10px',color:'var(--danger)',flexShrink:'0'}},'⚠️ '+opt.insumoNome));
          optList.appendChild(row);
        });
      }
      card.appendChild(optList);

      var prodUsing=(state.produtos||[]).filter(function(p){return p.profile===perfil&&(p.gruposComp||[]).indexOf(grp.id)>=0;});
      var foot=el('div',{style:{padding:'7px 14px',background:'var(--bg3)',borderTop:'1px solid var(--border)',fontSize:'11px',color:'var(--text3)'}});
      foot.textContent=prodUsing.length
        ?'📋 '+prodUsing.length+' produto(s): '+prodUsing.slice(0,3).map(function(p){return p.nome;}).join(', ')+(prodUsing.length>3?' e mais...':'')
        :'Não atribuído a nenhum produto ainda';
      card.appendChild(foot);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  // ── ABA EMBALAGENS ───────────────────────────────────────────────────────────
  function renderEmbalagemTab() {
    var embConf = state.embConfig || {};
    if (!embConf.delivery) embConf.delivery = {itens:[]};
    if (!embConf.salao)    embConf.salao    = {itens:[]};
    state.embConfig = embConf;

    var prods = todosProd.filter(function(p){
      if(_crdBusca) return (p.nome||'').toLowerCase().includes(_crdBusca.toLowerCase());
      return true;
    });
    var todosIns = (state.estoqueItens||[]).filter(function(x){return x.profile===perfil;})
      .concat((state.produtos||[]).filter(function(x){return x.tipo==='insumo'&&x.profile===perfil;}));

    function saveConf(){ lsSet('embConfig',embConf); scheduleSave(); }
    function saveProds(lista){ lsSet('produtos',lista); setState({produtos:lista}); scheduleSave(); }

    function renderChannelColumn(ch, label, icon, cor) {
      var defaults = embConf[ch];
      var ativoCount = prods.filter(function(p){
        return p.embalagens && p.embalagens.ativo && p.embalagens[ch] && p.embalagens[ch].ativo;
      }).length;

      var col = el('div',{style:{flex:'1',minWidth:'260px'}});

      var hdr = el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'12px 16px',background:cor,borderRadius:'8px 8px 0 0'}});
      hdr.appendChild(el('span',{style:{fontSize:'18px'}},icon));
      hdr.appendChild(el('span',{style:{fontWeight:'700',fontSize:'14px',color:'#fff'}},label));
      hdr.appendChild(el('span',{style:{fontSize:'11px',color:'rgba(255,255,255,.8)',marginLeft:'auto'}},ativoCount+' ativo(s)'));
      var padraoBtn = el('button',{style:{fontSize:'11px',padding:'3px 9px',background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.5)',borderRadius:'5px',cursor:'pointer',color:'#fff',flexShrink:'0'}});
      padraoBtn.textContent = defaults.itens.length ? '✏️ Padrão' : '+ Padrão';
      hdr.appendChild(padraoBtn);
      col.appendChild(hdr);

      var body = el('div',{style:{border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden'}});

      // Summary bar — sempre visível, mostra embalagem padrão atual
      var defSummary = el('div',{style:{padding:'8px 14px',background:'var(--bg3)',borderBottom:'1px solid var(--border)',fontSize:'11px',color:'var(--text3)'}});
      function refreshSummary(){
        while(defSummary.firstChild) defSummary.removeChild(defSummary.firstChild);
        if(!defaults.itens.length){
          defSummary.appendChild(document.createTextNode('📦 Padrão: não configurado — clique em "+ Padrão"'));
        } else {
          var txt=defaults.itens.map(function(i){
            var ins=todosIns.find(function(x){return x.id===i.estoqueId;});
            return (ins?ins.nome:(i.nome||'?'))+' ×'+i.qtd;
          }).join(' + ');
          defSummary.appendChild(document.createTextNode('📦 Padrão: '+txt));
        }
      }
      refreshSummary();
      body.appendChild(defSummary);

      // Painel expansível para editar a embalagem padrão do canal
      var defPanel = el('div',{style:{display:'none',padding:'12px 14px',background:'var(--bg3)',borderBottom:'2px solid '+cor}});

      function renderEditorRows(){
        while(defPanel.firstChild) defPanel.removeChild(defPanel.firstChild);
        var title=el('div',{style:{fontSize:'11px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:'8px'}});
        title.textContent='📦 Embalagem padrão — '+label;
        defPanel.appendChild(title);

        defaults.itens.forEach(function(item,i){
          !function(item,idx){
            var wrapper=el('div',{style:{position:'relative',flex:'1'}});
            var srch=el('input',{type:'text',autocomplete:'off',placeholder:'Buscar insumo...',
              style:{width:'100%',boxSizing:'border-box',padding:'5px 8px',fontSize:'12px',
                border:'1px solid var(--border)',borderRadius:'5px',background:'var(--bg)',color:'var(--text)'}});
            var ins=todosIns.find(function(x){return x.id===item.estoqueId;});
            srch.value=ins?ins.nome:(item.nome||'');
            var drop=el('div',{style:{display:'none',position:'absolute',top:'100%',left:'0',right:'0',
              background:'var(--bg)',border:'1px solid var(--border)',borderRadius:'6px',
              zIndex:'9999',maxHeight:'150px',overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,.25)'}});
            var hiIdx=-1,filtered=[];
            function renderDrop(q){
              while(drop.firstChild) drop.removeChild(drop.firstChild);
              q=(q||'').toLowerCase();
              filtered=q?todosIns.filter(function(x){return x.nome.toLowerCase().indexOf(q)>=0;}):todosIns.slice(0,30);
              hiIdx=-1;
              if(!filtered.length){drop.style.display='none';return;}
              filtered.forEach(function(x,fi){
                var itm=el('div',{style:{padding:'6px 10px',cursor:'pointer',fontSize:'12px',borderBottom:'1px solid var(--border)'}});
                itm.textContent=x.nome+' ('+(x.unidade||'un')+')';
                itm.onmouseenter=function(){hiIdx=fi;upHi();};
                itm.onmousedown=function(e){e.preventDefault();pick(x);};
                drop.appendChild(itm);
              });
              drop.style.display='block';
            }
            function upHi(){var k=drop.children;for(var j=0;j<k.length;j++){k[j].style.background=j===hiIdx?'var(--primary)':'';k[j].style.color=j===hiIdx?'#fff':'';}}
            function pick(x){item.estoqueId=x.id;item.nome=x.nome;item.unidade=x.unidade||'un';srch.value=x.nome;drop.style.display='none';saveConf();refreshSummary();}
            srch.oninput=function(){renderDrop(srch.value);};
            srch.onfocus=function(){renderDrop(srch.value);};
            srch.onblur=function(){setTimeout(function(){drop.style.display='none';},160);};
            srch.onkeydown=function(e){
              if(e.key==='ArrowDown'){e.preventDefault();hiIdx=Math.min(hiIdx+1,filtered.length-1);upHi();}
              else if(e.key==='ArrowUp'){e.preventDefault();hiIdx=Math.max(hiIdx-1,0);upHi();}
              else if((e.key==='Tab'||e.key==='Enter')&&drop.style.display!=='none'&&filtered.length){e.preventDefault();pick(filtered[hiIdx>=0?hiIdx:0]);}
              else if(e.key==='Escape'){drop.style.display='none';}
            };
            wrapper.appendChild(srch);wrapper.appendChild(drop);

            var qtdInp=el('input',{type:'number',placeholder:'Qtd',
              style:{width:'64px',padding:'5px 6px',fontSize:'12px',border:'1px solid var(--border)',borderRadius:'5px',background:'var(--bg)',color:'var(--text)'}});
            qtdInp.value=String(item.qtd||1);
            qtdInp.setAttribute('min','0.001');qtdInp.setAttribute('step','0.001');
            qtdInp.oninput=function(){item.qtd=parseFloat(qtdInp.value)||1;saveConf();};

            var rmBtn=el('button',{},'×');
            rmBtn.style.cssText='background:none;border:1px solid var(--border);border-radius:4px;color:#e05252;cursor:pointer;font-size:16px;padding:1px 5px;width:28px;flex-shrink:0;line-height:1;';
            rmBtn.onclick=function(){defaults.itens.splice(idx,1);saveConf();refreshSummary();renderEditorRows();};

            var row=el('div',{style:{display:'flex',gap:'4px',alignItems:'center',marginBottom:'6px'}});
            row.appendChild(wrapper);row.appendChild(qtdInp);row.appendChild(rmBtn);
            defPanel.appendChild(row);
          }(item,i);
        });

        var addBtn=el('button',{style:{background:'none',border:'1px dashed var(--primary)',color:'var(--primary)',
          borderRadius:'6px',cursor:'pointer',padding:'5px 10px',fontSize:'11px',width:'100%',marginTop:'2px'}});
        addBtn.textContent='+ Adicionar item à embalagem padrão';
        addBtn.onclick=function(){defaults.itens.push({estoqueId:'',nome:'',qtd:1,unidade:'un'});saveConf();renderEditorRows();};
        defPanel.appendChild(addBtn);
      }

      padraoBtn.onclick=function(){
        var open=defPanel.style.display!=='none';
        defPanel.style.display=open?'none':'block';
        padraoBtn.textContent=open?(defaults.itens.length?'✏️ Padrão':'+ Padrão'):'✕ Fechar';
        if(!open) renderEditorRows();
      };
      body.appendChild(defPanel);

      // Lista de produtos com toggle por produto
      if(!prods.length){
        body.appendChild(el('div',{style:{padding:'40px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}},'Nenhum produto cadastrado.'));
      } else {
        prods.forEach(function(p){
          if(!p.embalagens) p.embalagens={ativo:false,delivery:{ativo:false,itens:[]},salao:{ativo:false,itens:[]}};
          if(!p.embalagens[ch]) p.embalagens[ch]={ativo:false,itens:[]};
          var chData=p.embalagens[ch];
          var isAtivo=!!(p.embalagens.ativo&&chData.ativo);

          var row=el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'8px 14px',
            borderBottom:'1px solid var(--border)',background:isAtivo?'rgba(34,197,94,.05)':''}});

          var tog=el('div',{style:{display:'inline-flex',alignItems:'center',width:'36px',height:'20px',
            borderRadius:'10px',background:isAtivo?'#22c55e':'var(--border)',
            padding:'2px',cursor:'pointer',transition:'background .2s',flexShrink:'0'}});
          tog.appendChild(el('div',{style:{width:'16px',height:'16px',borderRadius:'50%',
            background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,.3)',transition:'transform .2s',
            transform:'translateX('+(isAtivo?'16px':'0px')+')'}}));
          (function(prod,channel,chd){
            tog.onclick=function(){
              var nowAtivo=!!(prod.embalagens.ativo&&chd.ativo);
              prod.embalagens.ativo=true;
              chd.ativo=!nowAtivo;
              // Ao ativar sem itens customizados, copia o padrão do canal
              if(!nowAtivo&&(!chd.itens||!chd.itens.length)&&embConf[channel].itens.length){
                chd.itens=embConf[channel].itens.map(function(x){return Object.assign({},x);});
              }
              var lista=state.produtos.map(function(x){return x.id===prod.id?prod:x;});
              saveProds(lista);
            };
          })(p,ch,chData);
          row.appendChild(tog);

          row.appendChild(el('div',{style:{flex:'1',fontSize:'13px',fontWeight:isAtivo?'600':'400',
            color:isAtivo?'var(--text)':'var(--text3)'}},p.nome));

          if(isAtivo){
            var itensAtivos=(chData.itens&&chData.itens.length)?chData.itens:defaults.itens;
            var badgeText=itensAtivos.map(function(i){
              var ins=todosIns.find(function(x){return x.id===i.estoqueId;});
              return (ins?ins.nome:(i.nome||'?'))+' ×'+i.qtd;
            }).join(' + ');
            if(badgeText) row.appendChild(el('span',{style:{fontSize:'10px',color:cor,
              background:'rgba(0,0,0,.06)',padding:'2px 8px',borderRadius:'10px',
              maxWidth:'130px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flexShrink:'0'}},badgeText));
          }

          var editBtn=el('button',{style:{fontSize:'11px',padding:'2px 7px',background:'none',
            border:'1px solid var(--border)',borderRadius:'4px',cursor:'pointer',color:'var(--text3)',flexShrink:'0'}});
          editBtn.title='Personalizar embalagem deste produto';
          editBtn.textContent='✏️';
          editBtn.onclick=function(){setState({produtoModal:Object.assign({},p)});};
          row.appendChild(editBtn);

          body.appendChild(row);
        });
      }

      col.appendChild(body);
      return col;
    }

    var infoBar=el('div',{style:{padding:'10px 16px',borderBottom:'1px solid var(--border)',background:'var(--bg3)',fontSize:'12px',color:'var(--text3)'}});
    infoBar.textContent='Configure a embalagem padrão de cada canal (+ Padrão) e ative por produto com o toggle. Use ✏️ para personalizar individualmente.';

    var cols=el('div',{style:{display:'flex',gap:'16px',padding:'16px',flexWrap:'wrap'}});
    cols.appendChild(renderChannelColumn('delivery','DELIVERY','🛵','#ea580c'));
    cols.appendChild(renderChannelColumn('salao','SALÃO','🍽️','#0284c7'));

    return el('div',{},[infoBar,cols]);
  }

  // ── ABA CATEGORIAS ────────────────────────────────────────────────────────────
  function renderCategoriasTab() {
    // Migração: converte strings legadas para objetos {id,nome,imagem}
    var _rawCats = state.estCategorias || [];
    if (_rawCats.some(function(c){ return typeof c === 'string'; })) {
      var _migrated = _rawCats.map(function(c, i){
        return typeof c === 'string' ? {id:'cat_mig_'+Date.now()+'_'+i, nome:c, imagem:''} : c;
      }).filter(function(c){ return c && c.nome; });
      state.estCategorias = _migrated;
      lsSet('estCategorias', _migrated);
      scheduleSave();
    }
    var catsData = state.estCategorias || [];
    var todosProdAll = (state.produtos||[]).filter(function(p){return p.profile===perfil;});
    var todosCompAll = (state.complementos||[]).filter(function(c){return c.profile===perfil;});

    // Filtra por busca
    var catsFiltradas = _crdBusca
      ? catsData.filter(function(c){return (c.nome||'').toLowerCase().includes(_crdBusca.toLowerCase());})
      : catsData;

    function moverCat(i, direcao) {
      var novas=catsData.slice();
      var j=i+direcao;
      if(j<0||j>=novas.length)return;
      var tmp=novas[i];novas[i]=novas[j];novas[j]=tmp;
      lsSet('estCategorias',novas);setState({estCategorias:novas});scheduleSave();
    }

    function excluirCat(cat) {
      var nprod=todosProdAll.filter(function(p){return p.categoria===cat.nome;}).length;
      var ncomp=todosCompAll.filter(function(c){return c.categoria===cat.nome;}).length;
      var total=nprod+ncomp;
      if(total>0&&!window.confirm('A categoria "'+cat.nome+'" está em uso por '+total+' item(s). Excluir mesmo assim?'))return;
      var novas=catsData.filter(function(c){return c.id!==cat.id;});
      lsSet('estCategorias',novas);setState({estCategorias:novas});scheduleSave();
      showToast('Categoria removida','error');
    }

    // Grid de cards
    var cards=catsFiltradas.map(function(cat,i){
      var nprod=todosProdAll.filter(function(p){return p.categoria===cat.nome;}).length;
      var ncomp=todosCompAll.filter(function(c){return c.categoria===cat.nome;}).length;
      var total=nprod+ncomp;
      var idxReal=catsData.indexOf(cat); // índice real para reordenação

      var imgEl=el('div',{style:{
        width:'100%',paddingBottom:'56.25%', // 16:9
        position:'relative',overflow:'hidden',
        background:cat.imagem?'#111':'#f3f4f6',
        borderRadius:'8px 8px 0 0',
      }});
      if(cat.imagem){
        imgEl.style.backgroundImage='url("'+cat.imagem+'")';
        imgEl.style.backgroundSize='cover';
        imgEl.style.backgroundPosition='center';
      } else {
        var icon=el('div',{style:{position:'absolute',inset:'0',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:'6px'}});
        icon.innerHTML='<div style="font-size:28px;color:#d1d5db">🏷️</div>';
        imgEl.appendChild(icon);
      }

      // Overlay de ações (aparece no hover)
      var overlay=el('div',{style:{
        position:'absolute',inset:'0',background:'rgba(0,0,0,.55)',
        display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
        opacity:'0',transition:'opacity .15s',borderRadius:'8px 8px 0 0',
      }});

      var upBtn=el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px',opacity:idxReal===0?'0.3':'1'}});
      upBtn.textContent='↑';upBtn.title='Mover para cima';
      upBtn.onclick=function(e){e.stopPropagation();moverCat(idxReal,-1);};
      var downBtn=el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px',opacity:idxReal===catsData.length-1?'0.3':'1'}});
      downBtn.textContent='↓';downBtn.title='Mover para baixo';
      downBtn.onclick=function(e){e.stopPropagation();moverCat(idxReal,1);};
      var editBtn=el('button',{style:{background:'rgba(255,255,255,.2)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px'}});
      editBtn.textContent='✏️';editBtn.title='Editar';
      editBtn.onclick=function(e){e.stopPropagation();_crdCatModal={id:cat.id,nome:cat.nome,imagem:cat.imagem||'',_nomeOriginal:cat.nome};setState({});};
      var delBtn=el('button',{style:{background:'rgba(220,38,38,.5)',border:'none',cursor:'pointer',borderRadius:'5px',padding:'5px 8px',color:'#fff',fontSize:'14px'}});
      delBtn.textContent='🗑';delBtn.title='Excluir';
      delBtn.onclick=function(e){e.stopPropagation();excluirCat(cat);};

      overlay.appendChild(upBtn);overlay.appendChild(downBtn);overlay.appendChild(editBtn);overlay.appendChild(delBtn);
      imgEl.appendChild(overlay);

      var card=el('div',{style:{
        background:'var(--bg2)',borderRadius:'8px',
        border:'1px solid var(--border)',
        boxShadow:'0 1px 4px rgba(0,0,0,.06)',
        cursor:'pointer',transition:'box-shadow .15s, transform .1s',
        userSelect:'none',overflow:'hidden',
      }});
      card.onmouseenter=function(){
        this.style.boxShadow='0 4px 16px rgba(0,0,0,.14)';
        this.style.transform='translateY(-2px)';
        overlay.style.opacity='1';
      };
      card.onmouseleave=function(){
        this.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';
        this.style.transform='';
        overlay.style.opacity='0';
      };
      card.ondblclick=function(){
        _crdCatModal={id:cat.id,nome:cat.nome,imagem:cat.imagem||'',_nomeOriginal:cat.nome};setState({});
      };

      var info=el('div',{style:{padding:'10px 12px',textAlign:'center',background:'var(--bg2)'}});
      var nomeTxt=el('div',{style:{fontWeight:'600',fontSize:'12px',color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},cat.nome);
      var countTxt=el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},
        total>0?(nprod+' prod.'+(ncomp?' · '+ncomp+' mont.':'')):'Sem itens');
      info.appendChild(nomeTxt);
      info.appendChild(countTxt);

      card.appendChild(imgEl);
      card.appendChild(info);
      return card;
    });

    // Card "adicionar"
    var addCard=el('div',{style:{
      background:'var(--bg3)',borderRadius:'8px',
      border:'2px dashed var(--border)',
      display:'flex',alignItems:'center',justifyContent:'center',
      flexDirection:'column',gap:'8px',cursor:'pointer',
      minHeight:'150px',transition:'border-color .15s',color:'var(--text3)',
    }});
    addCard.onmouseenter=function(){this.style.borderColor='var(--gold)';this.style.color='var(--gold)';};
    addCard.onmouseleave=function(){this.style.borderColor='var(--border)';this.style.color='var(--text3)';};
    addCard.onclick=function(){_crdCatModal={nome:'',imagem:''};setState({});};
    addCard.innerHTML='<div style="font-size:28px">＋</div><div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Nova categoria</div>';

    var grid=el('div',{style:{
      display:'grid',
      gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',
      gap:'14px',padding:'20px',
    }});
    cards.forEach(function(c){grid.appendChild(c);});
    grid.appendChild(addCard);

    // Detecta categorias nos produtos que ainda não existem em estCategorias
    var catsNomesSet = {};
    catsData.forEach(function(c){ catsNomesSet[c.nome.toLowerCase()] = true; });
    var catsSemEntrada = [];
    var _vistasOrfas = {};
    todosProdAll.concat(todosCompAll).forEach(function(p) {
      var nm = (p.categoria || '').trim();
      if (nm && !catsNomesSet[nm.toLowerCase()] && !_vistasOrfas[nm.toLowerCase()]) {
        _vistasOrfas[nm.toLowerCase()] = true;
        catsSemEntrada.push(nm);
      }
    });

    var alertaOrfas = null;
    if (catsSemEntrada.length > 0) {
      alertaOrfas = el('div',{style:{
        margin:'16px 20px 0',padding:'12px 16px',borderRadius:'8px',
        background:'var(--gold-dim)',border:'1px solid var(--gold)',
        display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',
      }});
      var alertaTxt = el('span',{style:{flex:'1',fontSize:'12px',color:'var(--text)'}});
      alertaTxt.innerHTML='<strong>'+catsSemEntrada.length+' categoria(s) nos produtos sem entrada aqui:</strong> '
        +catsSemEntrada.map(function(n){return '<em>'+n+'</em>';}).join(', ');
      var sincBtn = el('button',{class:'btn-primary',style:{fontSize:'11px',padding:'5px 12px',whiteSpace:'nowrap'}});
      sincBtn.textContent='🔄 Criar automaticamente';
      sincBtn.onclick = function() {
        var n = _syncCategoriasProdutos();
        showToast(n > 0 ? '✅ '+n+' categoria(s) criada(s)!' : 'Nada a sincronizar', n>0?'success':'info');
      };
      alertaOrfas.appendChild(alertaTxt);
      alertaOrfas.appendChild(sincBtn);
    }

    if(catsData.length===0 && !_crdBusca){
      return el('div',{style:{padding:'60px 20px',textAlign:'center',color:'var(--text3)'}},[
        el('div',{style:{fontSize:'48px',marginBottom:'12px'}},'🏷️'),
        el('div',{style:{fontWeight:'700',fontSize:'16px',marginBottom:'6px'}},'Nenhuma categoria ainda'),
        el('div',{style:{fontSize:'13px',marginBottom:'20px'}},'Crie categorias para organizar Produtos e Montagens do cardápio'),
        alertaOrfas,
        btn('btn-primary','+ Criar primeira categoria',function(){_crdCatModal={nome:'',imagem:''};setState({});}),
      ].filter(Boolean));
    }

    var infoBar=el('div',{style:{
      padding:'10px 20px',borderBottom:'1px solid var(--border)',
      display:'flex',alignItems:'center',justifyContent:'space-between',
      fontSize:'12px',color:'var(--text3)',background:'var(--bg2)',gap:'12px',flexWrap:'wrap',
    }});
    infoBar.appendChild(el('span',{},catsData.length+' categoria(s) — duplo-clique para editar'));
    var infoRight = el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}});
    if (catsSemEntrada.length > 0) {
      var sincInlineBtn = el('button',{class:'btn-ghost',style:{fontSize:'11px',padding:'4px 10px',whiteSpace:'nowrap',color:'var(--gold)',borderColor:'var(--gold)'}});
      sincInlineBtn.textContent='🔄 Sincronizar ('+catsSemEntrada.length+' faltando)';
      sincInlineBtn.onclick = function() {
        var n = _syncCategoriasProdutos();
        showToast(n > 0 ? '✅ '+n+' categoria(s) criada(s)!' : 'Tudo já sincronizado', n>0?'success':'info');
      };
      infoRight.appendChild(sincInlineBtn);
    }
    infoRight.appendChild(el('span',{style:{color:'var(--gold)',fontWeight:'600',cursor:'pointer'},
      onclick:function(){_crdCatModal={nome:'',imagem:''};setState({});}}, '+ Nova'));
    infoBar.appendChild(infoRight);

    return el('div',{},[infoBar, alertaOrfas, grid].filter(Boolean));
  }

  // ── Toolbar (para Produtos e Montagens) ───────────────────────────────────────
  var searchWrap=el('div',{style:{position:'relative',flex:'1',maxWidth:'380px',minWidth:'180px'}});
  var searchIcon=el('span',{});
  searchIcon.style.cssText='position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:14px;pointer-events:none;';
  searchIcon.textContent='🔍';
  var searchInp=el('input',{class:'form-input',placeholder:isCats?'Pesquisar categorias...':'Pesquisar',value:_crdBusca,
    oninput:function(){_crdBusca=this.value;setState({});},
    style:{paddingLeft:'34px',marginBottom:'0'}});
  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInp);

  var catOpts=cats.map(function(c){return {v:c,l:c};});
  var setOpts=setores.map(function(s){return {v:s.id,l:s.nome};});
  var stsOpts=[{v:'ativo',l:'✅ Ativo'},{v:'inativo',l:'❌ Inativo'}];

  var toolbarChildren=[searchWrap];
  if(!isComp&&!isCats&&!isEmb){
    toolbarChildren.push(filterDrop('cat','por categoria',_crdCatFlt,catOpts,function(v){_crdCatFlt=v;},function(){_crdCatFlt='';}));
    toolbarChildren.push(filterDrop('set','por setor de impressão',_crdSetFlt,setOpts,function(v){_crdSetFlt=v;},function(){_crdSetFlt='';}));
  }
  if(!isCats&&!isEmb){
    toolbarChildren.push(filterDrop('sts','por status',_crdStsFlt,stsOpts,function(v){_crdStsFlt=v;},function(){_crdStsFlt='';}));
    toolbarChildren.push(acoesBtn());
  }
  toolbarChildren.push(el('div',{style:{flex:'1'}}));
  if(!isCats&&!isEmb){
    var menuBtn=el('button',{title:'Ir para Setores de Impressão'});
    menuBtn.style.cssText='padding:7px 11px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--text2);font-size:16px;cursor:pointer;line-height:1;';
    menuBtn.textContent='≡';
    menuBtn.onclick=function(){setState({page:'impressoes'});};
    toolbarChildren.push(menuBtn);
  }

  var toolbar=el('div',{style:{display:'flex',alignItems:'center',gap:'8px',padding:'10px 16px',flexWrap:'wrap',borderBottom:'1px solid var(--border)',background:'var(--bg2)'}},
    toolbarChildren);

  // ── Tabela (Produtos e Montagens) ─────────────────────────────────────────────
  function renderTabela() {
    var allIds=visivel.map(function(p){return p.id;});
    var allChecked=allIds.length>0&&allIds.every(function(id){return _crdSel[id];});
    var chkAll=el('input',{type:'checkbox'});
    chkAll.checked=allChecked;
    chkAll.style.cssText='cursor:pointer;width:15px;height:15px;accent-color:var(--gold);';
    chkAll.onchange=function(){var v=this.checked;allIds.forEach(function(id){_crdSel[id]=v;});setState({});};

    function thCell(txt,w,align){
      var th=el('th',{});
      th.style.cssText='padding:10px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);white-space:nowrap;text-align:'+(align||'left')+';'+(w?'width:'+w+';':'');
      th.textContent=txt;return th;
    }

    var headCells=[
      el('th',{style:{padding:'10px 12px',width:'36px'}},[chkAll]),
      thCell('Nome',''),
      thCell('COD','90px'),
      thCell('Categoria','110px'),
      thCell('Estoque','90px','right'),
      thCell('Custo','110px','right'),
      thCell('Venda','110px','right'),
      thCell('CMV%','80px','right'),
      thCell('Ativo','70px','center'),
      el('th',{style:{width:'70px'}}),
    ];

    var thead=el('thead',{},[el('tr',{style:{background:'var(--bg3)'}},headCells)]);
    var colCount=headCells.length;

    var EMPTY_ROW=el('tr',{},[
      el('td',{colspan:String(colCount),style:{padding:'48px 20px',textAlign:'center',color:'var(--text3)',fontSize:'14px'}},
        visivel.length===0&&!_crdBusca&&!_crdCatFlt&&!_crdSetFlt&&!_crdStsFlt
          ?(isComp?'Nenhuma montagem cadastrada.':'Nenhum produto cadastrado.')
          :'Nenhum item corresponde aos filtros.'),
    ]);

    var _fichaIds = {};
    (state.fichaTecnicas || []).forEach(function(ft) { if (ft.produtoId) _fichaIds[ft.produtoId] = true; });

    var rows=visivel.map(function(p){
      var isChecked=!!_crdSel[p.id];
      var isDisp=p.disponivel!==false;
      var setor=setores.find(function(s){return s.id===p.setorImpressao;});
      var codTxt=p.codigo||(p.id?'#'+p.id.slice(-4).toUpperCase():'—');

      var chk=el('input',{type:'checkbox'});
      chk.checked=isChecked;chk.style.cssText='cursor:pointer;width:15px;height:15px;accent-color:var(--gold);';
      chk.onchange=function(){_crdSel[p.id]=this.checked;setState({});};

      var track=el('span',{});
      track.style.cssText='display:inline-flex;align-items:center;width:36px;height:20px;border-radius:10px;background:'+(isDisp?'var(--green)':'var(--border)')+';padding:2px;cursor:pointer;transition:background .2s;flex-shrink:0;';
      var thumb=el('span',{});
      thumb.style.cssText='width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s;transform:translateX('+(isDisp?'16px':'0px')+');';
      track.appendChild(thumb);
      track.onclick=function(e){e.stopPropagation();toggleDisponivel(p);};

      var editB=el('button',{class:'btn-icon edit',title:'Editar',style:{opacity:'.7'}});
      editB.textContent='✏️';
      editB.onclick=function(e){e.stopPropagation();
        if(isComp) setState({complementoModal:Object.assign({},p)});
        else setState({produtoModal:Object.assign({},p)});
      };
      var delB=el('button',{class:'btn-icon',title:'Excluir',style:{opacity:'.7',color:'var(--danger)'}});
      delB.textContent='🗑';
      delB.onclick=function(e){e.stopPropagation();
        if(!window.confirm('Excluir "'+p.nome+'"?'))return;
        var key=isComp?'complementos':'produtos';
        var arr=(state[key]||[]).filter(function(x){return x.id!==p.id;});
        lsSet(key,arr);var patch={};patch[key]=arr;setState(patch);scheduleSave();
        showToast('Item excluído','error');
      };

      var tr=el('tr',{});
      tr.style.cssText='border-bottom:1px solid var(--border);transition:background .1s;';
      tr.onmouseenter=function(){this.style.background='var(--bg3)';};
      tr.onmouseleave=function(){this.style.background='';};

      function tdCell(style){var c=el('td',{});c.style.cssText='padding:10px 12px;font-size:13px;vertical-align:middle;'+(style||'');return c;}

      var td0=tdCell('width:36px;');td0.appendChild(chk);tr.appendChild(td0);
      var td1=tdCell('max-width:240px;');
      var _td1Row=el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
      var _thumb=el('div',{});
      _thumb.style.cssText='width:38px;height:38px;border-radius:6px;flex-shrink:0;background:var(--bg3);border:1px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:16px;';
      if(p.imagemUrl){
        var _tImg=el('img',{});
        _tImg.src=p.imagemUrl;
        _tImg.style.cssText='width:100%;height:100%;object-fit:cover;display:block;';
        _thumb.appendChild(_tImg);
      } else {
        _thumb.textContent='🍽️';
        _thumb.style.opacity='.35';
      }
      _td1Row.appendChild(_thumb);
      var _nomeCol=el('div',{style:{minWidth:0,flex:'1'}});
      var _nomeDiv=el('div',{style:{fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'4px'}});
      _nomeDiv.appendChild(document.createTextNode(p.nome||''));
      if(_fichaIds[p.id]) _nomeDiv.appendChild(el('span',{title:'Ficha Técnica cadastrada',style:{fontSize:'11px',opacity:'.8',flexShrink:'0'}},'📋'));
      _nomeCol.appendChild(_nomeDiv);
      _td1Row.appendChild(_nomeCol);
      td1.appendChild(_td1Row);
      if(!isComp&&setor){
        var setBadge=el('span',{style:{fontSize:'10px',color:setor.cor||'var(--blue)',marginTop:'2px',display:'block'}});
        setBadge.textContent='🖨️ '+setor.nome;
        _nomeCol.appendChild(setBadge);
      }
      tr.appendChild(td1);
      var td2=tdCell('color:var(--text3);font-size:12px;font-family:monospace;width:90px;');
      td2.textContent=codTxt;tr.appendChild(td2);
      var td3=tdCell('width:110px;');
      var catBadge=el('span',{style:{fontSize:'11px',padding:'2px 8px',borderRadius:'8px',background:'var(--bg3)',color:'var(--text2)',display:'inline-block',whiteSpace:'nowrap'}});
      catBadge.textContent=p.categoria||'—';
      td3.appendChild(catBadge);tr.appendChild(td3);
      var td4=tdCell('text-align:right;width:90px;color:var(--text2);');
      td4.textContent=(p.estoqueAtual!==undefined?p.estoqueAtual:(p.estoque||0))+' '+(p.unidade||'un');tr.appendChild(td4);
      var td5=tdCell('text-align:right;width:110px;color:var(--text2);');
      td5.textContent=fmtMoney(p.custoMedio||p.custo||0);tr.appendChild(td5);
      var td6=tdCell('text-align:right;width:110px;font-weight:600;color:var(--gold);');
      td6.textContent=fmtMoney(p.precoVenda||p.preco||0);tr.appendChild(td6);
      // CMV%
      var custo6=p.custoMedio||p.custo||0;
      var venda6=p.precoVenda||p.preco||0;
      var cmvPct6=venda6>0?Math.round((custo6/venda6)*1000)/10:null;
      var cmvColor=cmvPct6===null?'var(--text3)':cmvPct6>60?'var(--red)':cmvPct6>40?'var(--gold)':'var(--green)';
      var tdCmv=tdCell('text-align:right;width:80px;font-weight:700;');
      tdCmv.style.color=cmvColor;
      tdCmv.textContent=cmvPct6!==null?cmvPct6.toFixed(1)+'%':'—';
      if(cmvPct6!==null){tdCmv.title='Custo representa '+cmvPct6.toFixed(1)+'% do preço de venda';}
      tr.appendChild(tdCmv);
      var td7=tdCell('width:70px;text-align:center;');td7.appendChild(track);tr.appendChild(td7);
      var td8=tdCell('width:70px;text-align:right;white-space:nowrap;');
      td8.appendChild(editB);td8.appendChild(delB);tr.appendChild(td8);
      return tr;
    });

    var tbody=el('tbody',{},rows.length?rows:[EMPTY_ROW]);
    var table=el('table',{style:{width:'100%',borderCollapse:'collapse'}});
    table.appendChild(thead);table.appendChild(tbody);
    var tableWrap=el('div',{style:{overflowX:'auto'}});
    tableWrap.appendChild(table);

    var selCount=Object.keys(_crdSel).filter(function(k){return _crdSel[k];}).length;
    var footer=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',background:'var(--bg2)',borderTop:'1px solid var(--border)',fontSize:'12px',color:'var(--text3)',borderRadius:'0 0 10px 10px'}},[
      el('span',{},selCount>0?selCount+' selecionado(s) — '+visivel.length+' itens':visivel.length+' de '+todos.length+' item(s)'),
      (visivel.length<todos.length)?el('span',{style:{color:'var(--gold)',fontWeight:'600'}},'⚠ Filtro ativo'):el('span',{},''),
    ]);
    return el('div',{},[tableWrap,footer]);
  }

  // ── Modais adicionais ────────────────────────────────────────────────────────
  var prodModal   = (state.produtoModal!==null&&state.produtoModal!==undefined&&typeof renderProdutoModal==='function') ? renderProdutoModal() : null;
  var catMgrMod   = state.estCatManager ? renderEstCatManager() : null;
  var unidMgrMod  = state.estUnidManager ? renderEstUnidManager() : null;
  var importModal = (_crdImport!==null) ? renderCrdImportModal() : null;

  var page=el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('h2',{class:'page-title'},'🍽️ Cardápio'),
      el('p',{class:'page-sub'},
        isCats
          ?((state.estCategorias||[]).length+' categorias — organizam Produtos e Montagens')
          :isEmb
          ?'Configure quais insumos são baixados no estoque conforme canal de venda (Delivery / Salão)'
          :'Gerencie produtos e montagens — '+todos.length+' item(s) cadastrado(s)'),
    ]),
    el('div',{style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'10px',overflow:'visible'}},[
      tabBar,
      toolbar,
      isCats ? renderCategoriasTab() : isEmb ? renderEmbalagemTab() : isGrupos ? renderGruposTab() : renderTabela(),
    ]),
  ]);

  var root=el('div',{});
  root.appendChild(page);
  if(catModal)    root.appendChild(catModal);
  if(compModal)      root.appendChild(compModal);
  if(grupoCompModal) root.appendChild(grupoCompModal);
  if(prodModal)      root.appendChild(prodModal);
  if(catMgrMod)   root.appendChild(catMgrMod);
  if(unidMgrMod)  root.appendChild(unidMgrMod);
  if(importModal) root.appendChild(importModal);
  return root;
}
