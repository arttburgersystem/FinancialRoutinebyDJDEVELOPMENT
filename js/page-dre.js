// ── DRE — DEMONSTRAÇÃO DE RESULTADO ──────────────────────────────────────────
function renderDRE(){
  var pf=state.profile;
  var now=new Date();
  var flt=state.dreFiltro||{mes:now.getMonth(),ano:now.getFullYear()};
  var ano=flt.ano,mes=flt.mes;
  var mesMes=ano+'-'+String(mes+1).padStart(2,'0');
  var isPessoal=pf==='pessoal';
  var cmvPct=(!isPessoal&&state.cmv)?( state.cmv[pf]||0):0;

  function getMes(d){return d?parseInt(d.slice(5,7))-1:-1;}

  // Dados do mês selecionado
  var receitasMes=(state.receitas||[]).filter(function(r){return r.profile===pf&&r.data&&r.data.startsWith(mesMes);});
  // Para pessoal, incluir também contas recebidas
  var contasRecebidas=(state.contas||[]).filter(function(c){return c.profile===pf&&c.tipo==='receber'&&c.status==='recebido'&&c.vencimento&&c.vencimento.startsWith(mesMes);});
  var despesasPagas=(state.contas||[]).filter(function(c){return c.profile===pf&&c.tipo==='pagar'&&c.status==='pago'&&c.vencimento&&c.vencimento.startsWith(mesMes);});

  var totalReceitas=receitasMes.reduce(function(a,r){return a+r.valor;},0);
  var totalContasRec=contasRecebidas.reduce(function(a,c){return a+c.valor;},0);
  var receitaTotal=totalReceitas+(isPessoal?totalContasRec:0);
  var cmvValor=receitaTotal*(cmvPct/100);
  var lucroBruto=receitaTotal-cmvValor;
  var totalDespesas=despesasPagas.reduce(function(a,c){return a+c.valor;},0);
  var resultado=lucroBruto-totalDespesas;
  var margem=receitaTotal>0?(resultado/receitaTotal)*100:0;

  // Agrupamento por categoria
  var recByCat={};
  receitasMes.forEach(function(r){recByCat[r.categoria]=(recByCat[r.categoria]||0)+r.valor;});
  if(isPessoal){contasRecebidas.forEach(function(c){recByCat[c.categoria]=(recByCat[c.categoria]||0)+c.valor;});}
  var desByCat={};
  despesasPagas.forEach(function(c){desByCat[c.categoria]=(desByCat[c.categoria]||0)+c.valor;});

  // Dados anuais para o gráfico
  var dadosAno=MESES.map(function(m,i){
    var mm=ano+'-'+String(i+1).padStart(2,'0');
    var rec=(state.receitas||[]).filter(function(r){return r.profile===pf&&r.data&&r.data.startsWith(mm);}).reduce(function(a,r){return a+r.valor;},0);
    var recC=isPessoal?(state.contas||[]).filter(function(c){return c.profile===pf&&c.tipo==='receber'&&c.status==='recebido'&&c.vencimento&&c.vencimento.startsWith(mm);}).reduce(function(a,c){return a+c.valor;},0):0;
    var des=(state.contas||[]).filter(function(c){return c.profile===pf&&c.tipo==='pagar'&&c.status==='pago'&&c.vencimento&&c.vencimento.startsWith(mm);}).reduce(function(a,c){return a+c.valor;},0);
    return{mes:m,rec:rec+recC,des:des,res:(rec+recC)*(1-cmvPct/100)-des};
  });

  // Selectores
  var selAno=el('select',{class:'form-input',style:{fontSize:'13px',padding:'6px 10px',width:'88px'},onchange:function(e){setState({dreFiltro:{mes:mes,ano:parseInt(e.target.value)}});}});
  [now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].forEach(function(y){var op=el('option',{value:y},String(y));if(y===ano)op.selected=true;selAno.appendChild(op);});

  var selMes=el('select',{class:'form-input',style:{fontSize:'13px',padding:'6px 10px',minWidth:'110px'},onchange:function(e){setState({dreFiltro:{mes:parseInt(e.target.value),ano:ano}});}});
  MESES.forEach(function(m,i){var op=el('option',{value:i},m);if(i===mes)op.selected=true;selMes.appendChild(op);});

  // CMV config (só para negócio)
  var cmvArea=null;
  if(!isPessoal){
    var cmvInp=el('input',{type:'number',class:'form-input',min:'0',max:'100',style:{width:'72px',padding:'6px 10px',fontSize:'13px'},placeholder:'%'});
    cmvInp.value=String(cmvPct);
    var cmvBtn=btn('btn-ghost','Salvar',function(){
      var pct=parseFloat(cmvInp.value)||0;
      var c=Object.assign({},state.cmv||{});c[pf]=pct;
      lsSet('cmv',c);setState({cmv:c});showToast('CMV% atualizado!');
    });
    cmvBtn.style.fontSize='12px';
    cmvArea=el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
      el('label',{style:{fontSize:'12px',color:'var(--text3)'}},'CMV%:'),cmvInp,cmvBtn,
      el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'(% custo sobre receita)'),
    ]);
  }

  // KPIs
  var corRes=resultado>=0?'green':'red';
  function kpi(cls,label,val,vCls,sub){
    return el('div',{class:'kpi-card '+cls},[
      el('div',{class:'kpi-label'},label),
      el('div',{class:'kpi-value '+(vCls||'')},val),
      el('div',{class:'kpi-sub'},sub),
    ]);
  }
  var kpis=el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',marginBottom:'14px'}},[
    kpi('green','Receita bruta',fmtMoney(receitaTotal),'green',receitasMes.length+(isPessoal?'+'+contasRecebidas.length:'')+' lançamentos'),
    kpi('','Lucro bruto',fmtMoney(lucroBruto),lucroBruto>=0?'green':'red',!isPessoal?('Após CMV '+cmvPct+'%'):'Receitas'),
    kpi('red','Despesas pagas',fmtMoney(totalDespesas),'red',despesasPagas.length+' contas'),
    kpi(corRes,'Resultado líquido',fmtMoney(resultado),corRes,'Margem: '+margem.toFixed(1)+'%'),
  ]);

  // Gráfico anual
  var chartData=dadosAno.map(function(d,i){
    return{label:d.mes,values:[
      {value:d.rec,color:i===mes?'var(--green)':'rgba(76,175,130,0.3)'},
      {value:d.des,color:i===mes?'var(--red)':'rgba(224,82,82,0.3)'},
    ]};
  });
  var grafico=div('card',[
    div('card-title','Receitas × Despesas — '+ano),
    el('div',{style:{display:'flex',gap:'16px',marginBottom:'10px',flexWrap:'wrap'}},[
      el('div',{style:{display:'flex',alignItems:'center',gap:'5px'}},[el('div',{style:{width:'10px',height:'10px',borderRadius:'2px',background:'var(--green)'}}),el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Receitas')]),
      el('div',{style:{display:'flex',alignItems:'center',gap:'5px'}},[el('div',{style:{width:'10px',height:'10px',borderRadius:'2px',background:'var(--red)'}}),el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'Despesas pagas')]),
      el('div',{style:{display:'flex',alignItems:'center',gap:'5px'}},[el('div',{style:{width:'10px',height:'10px',borderRadius:'2px',background:'var(--gold)'}}),el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'(mês selecionado = cores cheias)')]),
    ]),
    renderGroupedBarChart(chartData,{height:130}),
  ]);

  // Linha de resultado por mês
  var lineCard=div('card',[
    div('card-title','Tendência do resultado — '+ano),
    renderLineChart([{label:'Resultado',data:dadosAno.map(function(d,i){return{x:d.mes,y:d.res};}),color:'var(--gold)'}],{height:100}),
  ]);

  // Função de linha DRE
  function dreRow(label,valor,pct,bold,indent,color){
    var row=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:(bold?'10px':'8px')+' 0 '+(bold?'10px':'8px')+' '+(indent?'20px':'0'),borderBottom:'1px solid var(--border)'}},[
      el('span',{style:{fontSize:bold?'13px':'12px',fontWeight:bold?'700':'400',color:color||(bold?'var(--text)':'var(--text2)')}},label),
      el('div',{style:{display:'flex',gap:'14px',alignItems:'center'}},[
        pct!==null?el('span',{style:{fontSize:'11px',color:'var(--text3)',minWidth:'38px',textAlign:'right'}},pct.toFixed(1)+'%'):null,
        el('span',{style:{fontSize:bold?'14px':'13px',fontWeight:bold?'700':'500',color:color||(bold?'var(--text)':'var(--text2)'),minWidth:'115px',textAlign:'right'}},fmtMoney(valor)),
      ].filter(Boolean)),
    ]);
    return row;
  }
  function secTitle(t){
    return el('div',{style:{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',padding:'14px 0 6px',borderBottom:'1px solid var(--border)',marginBottom:'2px'}},t);
  }

  var recCatRows=Object.keys(recByCat).sort(function(a,b){return recByCat[b]-recByCat[a];}).map(function(c){
    return dreRow(c,recByCat[c],receitaTotal>0?(recByCat[c]/receitaTotal)*100:0,false,true,'var(--text2)');
  });
  var desCatRows=Object.keys(desByCat).sort(function(a,b){return desByCat[b]-desByCat[a];}).map(function(c){
    return dreRow(c,desByCat[c],receitaTotal>0?(desByCat[c]/receitaTotal)*100:0,false,true,'var(--text2)');
  });

  var resColor=resultado>=0?'var(--green)':'var(--red)';
  var demonstrativo=div('card',[
    div('card-title',MESES[mes]+' '+ano+' — Demonstrativo completo'),

    secTitle('(+) Receitas'),
    ...recCatRows,
    recCatRows.length===0?el('p',{style:{fontSize:'12px',color:'var(--text3)',padding:'8px 0'}},'Sem receitas no período'):null,
    dreRow('Total Receitas',receitaTotal,100,true,false,'var(--green)'),

    !isPessoal?secTitle('(-) CMV — Custo de Mercadoria Vendida'):null,
    !isPessoal?dreRow('CMV ('+cmvPct+'% da Receita Bruta)',cmvValor,cmvPct,false,true,'var(--red)'):null,
    dreRow('= Lucro Bruto',lucroBruto,receitaTotal>0?(lucroBruto/receitaTotal)*100:0,true,false,lucroBruto>=0?'var(--green)':'var(--red)'),

    secTitle('(-) Despesas Operacionais'),
    ...desCatRows,
    desCatRows.length===0?el('p',{style:{fontSize:'12px',color:'var(--text3)',padding:'8px 0'}},'Nenhuma despesa paga no período'):null,
    dreRow('Total Despesas',totalDespesas,receitaTotal>0?(totalDespesas/receitaTotal)*100:0,true,false,'var(--red)'),

    el('div',{style:{marginTop:'14px',padding:'16px',background:resultado>=0?'var(--green-dim)':'var(--red-dim)',borderRadius:'var(--radius-sm)',border:'1px solid '+(resultado>=0?'rgba(76,175,130,.3)':'rgba(224,82,82,.3)')}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},[
        el('span',{style:{fontSize:'14px',fontWeight:'700',color:resColor}},'RESULTADO LÍQUIDO'),
        el('div',{style:{textAlign:'right'}},[
          el('div',{style:{fontSize:'20px',fontWeight:'800',color:resColor}},fmtMoney(resultado)),
          el('div',{style:{fontSize:'12px',color:resColor,marginTop:'2px'}},resultado>=0?'✓ Margem positiva de '+margem.toFixed(1)+'%':'✕ Prejuízo — Margem '+margem.toFixed(1)+'%'),
        ]),
      ]),
    ]),
  ].filter(Boolean));

  return div('',[
    div('page-header',[
      el('h1',{},'DRE — Demonstração de Resultado'),
      el('p',{},pf==='artt'?'Artt Burger — resultado operacional por período':'Resultado financeiro pessoal'),
    ]),
    div('action-row',[
      el('div',{style:{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}},[selMes,selAno,cmvArea||null].filter(Boolean)),
      el('button',{class:'btn-ghost',style:{display:'flex',alignItems:'center',gap:'6px',fontSize:'13px'},onclick:function(){_printDRE(MESES[mes]+' '+ano,receitaTotal,cmvValor,lucroBruto,totalDespesas,resultado,margem,recByCat,desByCat,cmvPct,isPessoal);}},['📄 Exportar PDF']),
    ]),
    kpis,
    el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}},[grafico,lineCard]),
    demonstrativo,
  ]);
}

function _printDRE(periodo,receitaTotal,cmvValor,lucroBruto,totalDespesas,resultado,margem,recByCat,desByCat,cmvPct,isPessoal){
  var emp=((state.empresaData||{})[state.profile])||{};
  var nomeEmp=emp.nomeFantasia||emp.razaoSocial||'Financial Routine';
  var M=function(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};
  var linhas='';
  function addRow(label,valor,bold,indent,color){
    linhas+='<div class="row'+(bold?' bold':'')+(indent?' indent':'')+'">'+
      '<span style="'+(color?'color:'+color:'')+'">'+label+'</span>'+
      '<span style="'+(color?'color:'+color:'')+'">'+M(valor)+'</span></div>';
  }
  function addSec(t){linhas+='<div class="sec">'+t+'</div>';}

  addSec('(+) RECEITAS');
  Object.keys(recByCat).sort(function(a,b){return recByCat[b]-recByCat[a];}).forEach(function(c){addRow(c,recByCat[c],false,true);});
  addRow('Total Receitas',receitaTotal,true,false,'#16a34a');
  if(!isPessoal){
    addSec('(-) CMV — Custo de Mercadoria Vendida');
    addRow('CMV ('+cmvPct+'% da Receita)',cmvValor,false,true,'#dc2626');
    addRow('= Lucro Bruto',lucroBruto,true,false,lucroBruto>=0?'#16a34a':'#dc2626');
  }
  addSec('(-) DESPESAS OPERACIONAIS');
  Object.keys(desByCat).sort(function(a,b){return desByCat[b]-desByCat[a];}).forEach(function(c){addRow(c,desByCat[c],false,true);});
  addRow('Total Despesas',totalDespesas,true,false,'#dc2626');

  var w=window.open('','_blank','width=700,height=900');
  w.document.write(
    '<html><head><title>DRE '+periodo+'</title><style>'+
    'body{font-family:system-ui,sans-serif;padding:40px;color:#111;max-width:600px;margin:0 auto}'+
    'h1{font-size:20px;font-weight:900;margin:0}'+
    '.sub{font-size:12px;color:#666;margin-bottom:4px}'+
    '.periodo{font-size:14px;font-weight:700;margin:16px 0 6px;color:#333}'+
    '.kpis{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}'+
    '.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}'+
    '.kpi .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}'+
    '.kpi .value{font-size:18px;font-weight:800}'+
    '.sec{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#666;padding:14px 0 5px;border-bottom:1px solid #e5e7eb;margin-bottom:2px}'+
    '.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px}'+
    '.row.bold{font-weight:700;font-size:14px;padding:10px 0;border-bottom:2px solid #e5e7eb}'+
    '.row.indent{padding-left:16px;color:#555}'+
    '.resultado{margin-top:16px;padding:16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;'+
      (resultado>=0?'background:#f0fdf4;border:1px solid #bbf7d0;':'background:#fef2f2;border:1px solid #fecaca;')+'}'+
    '.res-label{font-size:14px;font-weight:700;color:'+(resultado>=0?'#15803d':'#dc2626')+'}'+
    '.res-value{font-size:24px;font-weight:900;color:'+(resultado>=0?'#15803d':'#dc2626')+'}'+
    '.rodape{margin-top:20px;font-size:10px;color:#999;text-align:center;border-top:1px dashed #ccc;padding-top:10px}'+
    '@media print{button{display:none}body{padding:20px}}'+
    '</style></head><body>'+
    '<h1>'+nomeEmp+'</h1>'+
    (emp.cnpj?'<div class="sub">CNPJ: '+emp.cnpj+'</div>':'')+
    '<div class="sub">DRE — Demonstração de Resultado do Exercício</div>'+
    '<div class="periodo">Período: '+periodo+'</div>'+
    '<div class="kpis">'+
      '<div class="kpi"><div class="label">Receita Bruta</div><div class="value" style="color:#16a34a">'+M(receitaTotal)+'</div></div>'+
      '<div class="kpi"><div class="label">Total Despesas</div><div class="value" style="color:#dc2626">'+M(totalDespesas)+'</div></div>'+
      '<div class="kpi"><div class="label">Lucro Bruto</div><div class="value" style="color:'+(lucroBruto>=0?'#16a34a':'#dc2626')+'">'+M(lucroBruto)+'</div></div>'+
      '<div class="kpi"><div class="label">Margem Líquida</div><div class="value" style="color:'+(resultado>=0?'#16a34a':'#dc2626')+'">'+margem.toFixed(1)+'%</div></div>'+
    '</div>'+
    linhas+
    '<div class="resultado">'+
      '<span class="res-label">RESULTADO LÍQUIDO</span>'+
      '<span class="res-value">'+M(resultado)+'</span>'+
    '</div>'+
    '<div class="rodape">Emitido em '+new Date().toLocaleString('pt-BR')+' · Financial Routine</div>'+
    '<br><button onclick="window.print()" style="padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">🖨 Imprimir / Salvar PDF</button>'+
    '</body></html>'
  );
  w.document.close();
}
