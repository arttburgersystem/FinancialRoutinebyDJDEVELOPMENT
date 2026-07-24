// ── IMPORTADOR YOOGA — Venda por Forma de Pagamento ──────────────────────────

function _loadSheetJS(cb){
  if(window.XLSX)return cb(null);
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  s.onload=function(){cb(null);};
  s.onerror=function(){cb(new Error('Falha ao carregar leitor de Excel. Verifique sua conexão.'));};
  document.head.appendChild(s);
}

function _parseYoogaFile(file,onDone){
  _loadSheetJS(function(err){
    if(err){showToast(err.message,'error');return;}
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        onDone(null,raw);
      }catch(ex){onDone(ex);}
    };
    reader.readAsArrayBuffer(file);
  });
}

function _parseYoogaRows(raw){
  // Localiza linha de cabeçalho (contém NOME e FATURADO)
  var hIdx=-1;
  for(var i=0;i<Math.min(raw.length,15);i++){
    var joined=raw[i].map(function(c){return(c+'').toUpperCase();}).join('|');
    if(joined.indexOf('NOME')>=0&&joined.indexOf('FATURADO')>=0){hIdx=i;break;}
  }
  if(hIdx<0)throw new Error('Formato não reconhecido. Certifique-se de exportar o relatório "Venda por Forma de Pagamento" do Yooga.');

  var hdrs=raw[hIdx].map(function(h){return(h+'').trim().toUpperCase();});
  function col(txt){
    for(var i=0;i<hdrs.length;i++)if(hdrs[i].indexOf(txt)>=0)return i;
    return -1;
  }
  var cNome=col('NOME'), cQtde=col('QUANTIDADE'), cPago=col('VALOR PAGO'), cTaxa=col('TAXA'), cFat=col('FATURADO');

  function parseBRL(v){
    if(typeof v==='number')return Math.round(v*100)/100;
    return parseFloat((v+'').replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.'))||0;
  }

  var rows=[];
  for(var j=hIdx+1;j<raw.length;j++){
    var r=raw[j];
    var nome=(r[cNome]||'').toString().trim();
    if(!nome)continue;
    if(nome.toLowerCase()==='total')continue;
    var faturado=parseBRL(r[cFat]);
    var valorPago=parseBRL(r[cPago]);
    var taxa=parseBRL(r[cTaxa]);
    var qtde=parseInt(r[cQtde])||0;
    var isSubsidio=nome.toLowerCase().indexOf('subsídio')>=0||nome.toLowerCase().indexOf('subsidio')>=0;
    rows.push({nome:nome,qtde:qtde,valorPago:valorPago,taxa:taxa,faturado:faturado,isSubsidio:isSubsidio,incluir:faturado>0&&!isSubsidio});
  }
  if(!rows.length)throw new Error('Nenhuma linha de dados encontrada no arquivo.');

  // Yooga exporta valores em centavos (inteiros) — dividir por 100 para obter reais
  rows.forEach(function(r){
    r.valorPago=Math.round(r.valorPago)/100;
    r.taxa=Math.round(r.taxa)/100;
    r.faturado=Math.round(r.faturado)/100;
  });

  // Extrai data do título (linha 0): "...Período 01/07/2026 à 01/07/2026"
  var tituloTexto=(raw[0]||[]).concat(raw[1]||[]).map(function(c){return c+'';}).join(' ');
  var dm=tituloTexto.match(/(\d{2}\/\d{2}\/\d{4})/g);
  var dataImport=dm?dm[0].split('/').reverse().join('-'):today();

  return {rows:rows,data:dataImport};
}

// ── Relatório detalhado por pedido (ex: "Histórico de vendas") ──────────────
function _parseYoogaDetalhadoRows(raw){
  // Localiza linha de cabeçalho (contém CLIENTE e CANAL)
  var hIdx=-1;
  for(var i=0;i<Math.min(raw.length,15);i++){
    var joined=raw[i].map(function(c){return(c+'').toUpperCase();}).join('|');
    if(joined.indexOf('CLIENTE')>=0&&joined.indexOf('CANAL')>=0){hIdx=i;break;}
  }
  if(hIdx<0)throw new Error('Formato não reconhecido. Certifique-se de exportar o relatório detalhado de vendas por pedido do Yooga.');

  var hdrs=raw[hIdx].map(function(h){return(h+'').trim().toUpperCase();});
  function col(){
    var candidatos=Array.prototype.slice.call(arguments);
    for(var i=0;i<hdrs.length;i++){
      for(var c=0;c<candidatos.length;c++){if(hdrs[i].indexOf(candidatos[c])>=0)return i;}
    }
    return -1;
  }
  var cCodigo=col('CÓDIGO','CODIGO'), cCliente=col('CLIENTE'), cTotal=col('VALOR TOTAL'),
      cAcresc=col('ACRÉSCIMO','ACRESCIMO'), cTaxa=col('TAXA'), cDesc=col('DESCONTO'),
      cReceb=col('VALOR RECEBIDO','RECEBIDO'), cForma=col('FORMA DE PAGAMENTO'),
      cCanal=col('CANAL'), cData=col('DATA');

  function parseBRL(v){
    if(typeof v==='number')return Math.round(v*100)/100;
    return parseFloat((v+'').replace(/[R$\s]/g,'').replace(/\./g,'').replace(',','.'))||0;
  }

  var rows=[];
  for(var j=hIdx+1;j<raw.length;j++){
    var r=raw[j];
    var cliente=(r[cCliente]||'').toString().trim();
    var codigo=(r[cCodigo]||'').toString().trim();
    if(!codigo&&!cliente)continue;
    if(cliente.toLowerCase()==='total'||codigo.toLowerCase()==='total')continue;
    var dataRaw=(r[cData]||'').toString().trim();
    var dm=dataRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if(!dm)continue; // linha sem data válida = rodapé/total da planilha, não é um pedido
    var dataISO=dm[3]+'-'+dm[2]+'-'+dm[1];
    var horaMatch=dataRaw.match(/(\d{2}:\d{2})/);
    rows.push({
      codigo:codigo,
      cliente:cliente||'Não identificado',
      valorTotal:parseBRL(r[cTotal]),
      acrescimo:parseBRL(r[cAcresc]),
      taxa:parseBRL(r[cTaxa]),
      desconto:parseBRL(r[cDesc]),
      valorRecebido:parseBRL(r[cReceb]),
      formaPagamento:(r[cForma]||'').toString().trim(),
      canal:(r[cCanal]||'').toString().trim(),
      data:dataISO,
      hora:horaMatch?horaMatch[1]:'',
      incluir:parseBRL(r[cReceb])>0,
    });
  }
  if(!rows.length)throw new Error('Nenhuma linha de dados encontrada no arquivo.');

  // Yooga exporta valores em centavos (inteiros) — dividir por 100 para obter reais
  rows.forEach(function(r){
    r.valorTotal=Math.round(r.valorTotal)/100;
    r.acrescimo=Math.round(r.acrescimo)/100;
    r.taxa=Math.round(r.taxa)/100;
    r.desconto=Math.round(r.desconto)/100;
    r.valorRecebido=Math.round(r.valorRecebido)/100;
  });

  return {rows:rows};
}

// Detecta automaticamente qual dos dois formatos foi exportado
function _parseYoogaAny(raw){
  var joined0=(raw.slice(0,15)||[]).map(function(row){
    return row.map(function(c){return(c+'').toUpperCase();}).join('|');
  }).join('|');
  var isDetalhado=joined0.indexOf('CLIENTE')>=0&&joined0.indexOf('CANAL')>=0;
  var isAgregado=joined0.indexOf('NOME')>=0&&joined0.indexOf('FATURADO')>=0;
  if(isDetalhado){
    var d=_parseYoogaDetalhadoRows(raw);
    return {tipo:'detalhado',rows:d.rows};
  }
  if(isAgregado){
    var a=_parseYoogaRows(raw);
    return {tipo:'agregado',rows:a.rows,data:a.data};
  }
  throw new Error('Formato não reconhecido. Exporte "Venda por Forma de Pagamento" (resumo) ou o relatório detalhado de vendas por pedido do Yooga.');
}

function _yoogaConfirmar(){
  var m=state.yoogaImportModal;
  if(!m||!m.rows)return;
  var dataImport=m.data||today();
  var toImport=m.rows.filter(function(r){return r.incluir&&r.faturado>0;});
  if(!toImport.length){showToast('Selecione ao menos um item para importar','error');return;}

  var jaExiste=(state.contas||[]).some(function(c){
    return c.notas&&c.notas.indexOf('[Yooga]')>=0&&c.vencimento===dataImport&&c.profile===state.profile;
  });
  if(jaExiste&&!confirm('Já existem lançamentos Yooga importados para '+dataImport+'. Importar mesmo assim?'))return;

  var novas=toImport.map(function(r){
    var isDesc=r.isSubsidio;
    return {
      id:uid(),
      tipo:isDesc?'pagar':'receber',
      descricao:'Yooga — '+r.nome,
      valor:r.faturado,
      vencimento:dataImport,
      status:isDesc?'pago':'recebido',
      categoria:isDesc?'Descontos / Promoções':'Vendas PDV',
      profile:state.profile,
      banco:'',
      notas:'[Yooga] Qtde: '+r.qtde+' | Bruto: '+fmtMoney(r.valorPago)+(r.taxa>0?' | Taxa: -'+fmtMoney(r.taxa):''),
    };
  });

  setState({contas:(state.contas||[]).concat(novas),yoogaImportModal:null});
  scheduleSave();
  showToast(novas.length+' lançamentos Yooga importados!','success');
}

function _yoogaConfirmarDetalhado(){
  var m=state.yoogaImportModal;
  if(!m||!m.rows)return;
  var toImport=m.rows.filter(function(r){return r.incluir&&r.valorRecebido>0;});
  if(!toImport.length){showToast('Selecione ao menos um pedido para importar','error');return;}

  // Evita duplicar pedidos já importados antes (por código do pedido, não por data)
  var jaImportados={};
  (state.contas||[]).forEach(function(c){
    if(!c.notas||c.notas.indexOf('[Yooga-Pedido]')<0||c.profile!==state.profile)return;
    var mch=c.notas.match(/Pedido #(\S+)/);
    if(mch)jaImportados[mch[1]]=true;
  });

  var novas=[];
  var duplicados=0;
  toImport.forEach(function(r){
    if(r.codigo&&jaImportados[r.codigo]){duplicados++;return;}
    var notasParts=['[Yooga-Pedido]','Pedido #'+(r.codigo||'—'),r.canal||'',r.formaPagamento||''];
    if(r.acrescimo>0)notasParts.push('Acréscimo: '+fmtMoney(r.acrescimo));
    if(r.taxa>0)notasParts.push('Taxa marketplace: -'+fmtMoney(r.taxa));
    if(r.desconto>0)notasParts.push('Desconto: -'+fmtMoney(r.desconto));
    novas.push({
      id:uid(),
      tipo:'receber',
      descricao:'Yooga — '+r.cliente+(r.codigo?' (#'+r.codigo+')':''),
      valor:r.valorRecebido,
      vencimento:r.data,
      status:'recebido',
      categoria:'Vendas PDV',
      profile:state.profile,
      banco:'',
      notas:notasParts.filter(Boolean).join(' | '),
    });
  });

  if(!novas.length){
    showToast(duplicados>0?('Todos os '+duplicados+' pedidos selecionados já haviam sido importados antes.'):'Nenhum pedido novo para importar.','error');
    return;
  }

  setState({contas:(state.contas||[]).concat(novas),yoogaImportModal:null});
  scheduleSave();
  showToast(novas.length+' pedido(s) importado(s)!'+(duplicados>0?' ('+duplicados+' já existiam e foram ignorados)':''),'success');
}

function renderImportYoogaModal(){
  if(!state.yoogaImportModal)return null;
  var m=state.yoogaImportModal;

  var expandido=!!m.expandido;
  var titleBarBtns=[];
  if(m.rows){
    titleBarBtns.push(el('button',{class:'modal-close',title:expandido?'Reduzir':'Expandir',
      style:{fontSize:'16px'},
      onclick:function(){setState({yoogaImportModal:Object.assign({},m,{expandido:!expandido})});}
    }, expandido?'🗗':'🗖'));
  }
  titleBarBtns.push(el('button',{class:'modal-close',onclick:function(){setState({yoogaImportModal:null});}}, '×'));
  var titleBar=div('modal-title',[
    el('span',{style:{flex:'1'}},'📊 Importar Vendas Yooga'),
  ].concat(titleBarBtns));

  var body,footer;

  if(!m.rows){
    // ── Passo 1: selecionar arquivo ───────────────────────────────────────
    var fileInp=el('input',{type:'file',accept:'.xlsx,.xls',style:{display:'none'}});

    function handleFile(f){
      if(!f)return;
      showToast('Lendo arquivo…','info');
      _parseYoogaFile(f,function(err,raw){
        if(err){showToast('Erro: '+err.message,'error');return;}
        try{
          var parsed=_parseYoogaAny(raw);
          setState({yoogaImportModal:{tipo:parsed.tipo,rows:parsed.rows,data:parsed.data}});
        }catch(ex){showToast(ex.message,'error');}
      });
    }

    fileInp.onchange=function(){handleFile(fileInp.files[0]);};

    var dropZone=el('div',{style:{
      border:'2px dashed var(--border)',borderRadius:'12px',padding:'36px 20px',
      textAlign:'center',cursor:'pointer',transition:'border-color .2s,background .2s',
      background:'var(--bg3)',marginBottom:'16px',
    }});
    dropZone.innerHTML='<div style="font-size:40px;margin-bottom:12px">📂</div>'
      +'<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px">Clique para selecionar o arquivo Excel</div>'
      +'<div style="font-size:12px;color:var(--text3)">Ou arraste e solte o .xlsx exportado do Yooga</div>';
    dropZone.onclick=function(){fileInp.click();};
    dropZone.ondragover=function(e){e.preventDefault();dropZone.style.borderColor='var(--primary)';dropZone.style.background='var(--bg4)';};
    dropZone.ondragleave=function(){dropZone.style.borderColor='var(--border)';dropZone.style.background='var(--bg3)';};
    dropZone.ondrop=function(e){
      e.preventDefault();
      dropZone.style.borderColor='var(--border)';dropZone.style.background='var(--bg3)';
      handleFile(e.dataTransfer.files[0]);
    };

    body=el('div',{},[
      el('div',{style:{
        background:'var(--bg3)',borderRadius:'8px',padding:'12px 14px',
        fontSize:'12px',color:'var(--text3)',lineHeight:'1.7',marginBottom:'16px',
        borderLeft:'3px solid var(--primary)',
      }},[
        el('strong',{style:{color:'var(--text)',display:'block',marginBottom:'4px'}},'Como exportar:'),
        'No Yooga, exporte em Excel um destes relatórios (o sistema detecta automaticamente qual foi enviado):',el('br',{}),
        '• Venda por Forma de Pagamento — lançamento resumido por forma de pagamento',el('br',{}),
        '• Histórico de vendas (detalhado por pedido) — um lançamento por pedido, com cliente e código',
      ]),
      dropZone,
      fileInp,
    ]);
    footer=div('modal-actions',[btn('btn-ghost','Cancelar',function(){setState({yoogaImportModal:null});})]);

  } else if(m.tipo==='detalhado'){
    // ── Passo 2 (detalhado): prévia por pedido ────────────────────────────
    var totalValD=m.rows.reduce(function(s,r){return s+(r.incluir?r.valorRecebido:0);},0);
    var totalElD=el('span',{style:{fontWeight:'700',color:'var(--green)',fontVariantNumeric:'tabular-nums'}},fmtMoney(totalValD));
    var countElD=el('span',{style:{fontWeight:'700',color:'var(--text)'}},String(m.rows.filter(function(r){return r.incluir;}).length));

    var tbodyD=el('tbody',{});
    m.rows.forEach(function(r,i){
      var chk=el('input',{type:'checkbox',style:{cursor:'pointer',accentColor:'var(--primary)',marginTop:'1px'}});
      chk.checked=r.incluir;
      chk.onchange=function(){
        m.rows[i].incluir=chk.checked;
        var t=m.rows.reduce(function(s,rx){return s+(rx.incluir?rx.valorRecebido:0);},0);
        totalElD.textContent=fmtMoney(t);
        countElD.textContent=String(m.rows.filter(function(rx){return rx.incluir;}).length);
      };
      var dim=r.valorRecebido===0?'0.35':'1';
      tbodyD.appendChild(el('tr',{style:{opacity:dim,borderBottom:'1px solid var(--border)'}},[
        el('td',{style:{padding:'6px 8px',verticalAlign:'middle'}},[chk]),
        el('td',{style:{padding:'6px 8px',fontSize:'11px',color:'var(--text3)',fontVariantNumeric:'tabular-nums'}},r.codigo||'—'),
        el('td',{style:{padding:'6px 8px',fontSize:'12px',fontWeight:'600'}},r.cliente),
        el('td',{style:{padding:'6px 8px',fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap'}},r.formaPagamento+(r.canal?' · '+r.canal:'')),
        el('td',{style:{padding:'6px 8px',fontSize:'13px',fontWeight:'700',textAlign:'right',fontVariantNumeric:'tabular-nums',color:r.valorRecebido>0?'var(--green)':'var(--text3)'}},fmtMoney(r.valorRecebido)),
        el('td',{style:{padding:'6px 8px',fontSize:'11px',color:'var(--text3)',textAlign:'right',whiteSpace:'nowrap'}},(r.data?r.data.split('-').reverse().join('/'):'')+(r.hora?' '+r.hora:'')),
      ]));
    });

    var thD=function(txt,align){return el('th',{style:{padding:'6px 8px',textAlign:align||'left',fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}},txt);};

    body=el('div',{},[
      el('div',{style:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px',flexWrap:'wrap'}},[
        el('span',{style:{fontSize:'12px',color:'var(--text3)'}},[countElD,' pedido(s) selecionado(s)']),
        el('button',{type:'button',class:'btn-ghost',style:{fontSize:'11px',padding:'5px 10px',marginLeft:'auto'},
          onclick:function(){setState({yoogaImportModal:{}});}
        },'← Trocar arquivo'),
      ]),
      el('div',{style:{overflowX:'auto',maxHeight:expandido?'calc(100vh - 260px)':'340px',overflowY:'auto',border:'1px solid var(--border)',borderRadius:'8px'}},[
        el('table',{style:{width:'100%',borderCollapse:'collapse',minWidth:'620px'}},[
          el('thead',{style:{position:'sticky',top:'0',background:'var(--bg2)',zIndex:'1'}},[
            el('tr',{},[thD(''),thD('Código'),thD('Cliente'),thD('Pagamento'),thD('Recebido','right'),thD('Data','right')]),
          ]),
          tbodyD,
          el('tfoot',{},[
            el('tr',{style:{borderTop:'2px solid var(--border)',background:'var(--bg3)'}},[
              el('td',{colspan:'4',style:{padding:'8px',fontSize:'12px',fontWeight:'700',color:'var(--text3)'}},'Total a importar'),
              el('td',{colspan:'2',style:{padding:'8px',textAlign:'right'}},[totalElD]),
            ]),
          ]),
        ]),
      ]),
    ]);

    footer=div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({yoogaImportModal:null});}),
      btn('btn-primary','✅ Importar pedidos',_yoogaConfirmarDetalhado),
    ]);

  } else {
    // ── Passo 2: prévia dos dados ─────────────────────────────────────────
    var dataInp=el('input',{type:'date',class:'form-input',value:m.data||today(),style:{width:'auto',flex:'1'}});
    dataInp.onchange=function(){m.data=dataInp.value;};

    var totalVal=m.rows.reduce(function(s,r){return s+(r.incluir?r.faturado:0);},0);
    var totalEl=el('span',{style:{fontWeight:'700',color:'var(--green)',fontVariantNumeric:'tabular-nums'}},fmtMoney(totalVal));

    var tbody=el('tbody',{});
    m.rows.forEach(function(r,i){
      var chk=el('input',{type:'checkbox',style:{cursor:'pointer',accentColor:'var(--primary)',marginTop:'1px'}});
      chk.checked=r.incluir;
      chk.onchange=function(){
        m.rows[i].incluir=chk.checked;
        var t=m.rows.reduce(function(s,rx){return s+(rx.incluir?rx.faturado:0);},0);
        totalEl.textContent=fmtMoney(t);
      };
      var dim=r.faturado===0?'0.35':'1';
      var nomeEl=el('td',{style:{padding:'7px 8px',fontSize:'13px',fontWeight:'500'}});
      nomeEl.appendChild(document.createTextNode(r.nome));
      if(r.isSubsidio){
        nomeEl.appendChild(el('span',{style:{fontSize:'10px',marginLeft:'6px',color:'var(--danger)',fontWeight:'700',background:'var(--danger)22',padding:'1px 5px',borderRadius:'4px'}},'desconto'));
      }
      tbody.appendChild(el('tr',{style:{opacity:dim,borderBottom:'1px solid var(--border)'}}, [
        el('td',{style:{padding:'7px 8px',verticalAlign:'middle'}},[chk]),
        nomeEl,
        el('td',{style:{padding:'7px 8px',fontSize:'12px',color:'var(--text3)',textAlign:'right',fontVariantNumeric:'tabular-nums'}},r.qtde+'x'),
        el('td',{style:{padding:'7px 8px',fontSize:'12px',color:'var(--text2)',textAlign:'right',fontVariantNumeric:'tabular-nums'}},fmtMoney(r.valorPago)),
        el('td',{style:{padding:'7px 8px',fontSize:'12px',color:'var(--danger)',textAlign:'right',fontVariantNumeric:'tabular-nums'}},r.taxa>0?'-'+fmtMoney(r.taxa):'—'),
        el('td',{style:{padding:'7px 8px',fontSize:'13px',fontWeight:'700',textAlign:'right',fontVariantNumeric:'tabular-nums',color:r.faturado>0?'var(--green)':'var(--text3)'}},fmtMoney(r.faturado)),
      ]));
    });

    var th=function(txt,align){return el('th',{style:{padding:'6px 8px',textAlign:align||'left',fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}},txt);};

    body=el('div',{},[
      el('div',{style:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px',flexWrap:'wrap'}},[
        el('label',{class:'form-label',style:{margin:'0',whiteSpace:'nowrap'}},'📅 Data:'),
        dataInp,
        el('button',{type:'button',class:'btn-ghost',style:{fontSize:'11px',padding:'5px 10px',marginLeft:'auto'},
          onclick:function(){setState({yoogaImportModal:{}});}
        },'← Trocar arquivo'),
      ]),
      el('div',{style:{overflowX:'auto',maxHeight:'340px',overflowY:'auto',border:'1px solid var(--border)',borderRadius:'8px'}},[
        el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
          el('thead',{style:{position:'sticky',top:'0',background:'var(--bg2)',zIndex:'1'}},[
            el('tr',{},[th(''),th('Forma de Pgto.'),th('Qtde','right'),th('Bruto','right'),th('Taxa','right'),th('Líquido','right')]),
          ]),
          tbody,
          el('tfoot',{},[
            el('tr',{style:{borderTop:'2px solid var(--border)',background:'var(--bg3)'}},[
              el('td',{colspan:'5',style:{padding:'8px',fontSize:'12px',fontWeight:'700',color:'var(--text3)'}},'Total a importar'),
              el('td',{style:{padding:'8px',textAlign:'right'}},[totalEl]),
            ]),
          ]),
        ]),
      ]),
    ]);

    footer=div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({yoogaImportModal:null});}),
      btn('btn-primary','✅ Importar lançamentos',_yoogaConfirmar),
    ]);
  }

  var modal=div('modal',[titleBar,body,footer]);
  modal.style.maxWidth=expandido?'96vw':'600px';
  if(expandido)modal.style.width='96vw';
  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({yoogaImportModal:null});};
  return ov;
}
