// ── FECHAMENTO DE CAIXA ───────────────────────────────────────────────────────

function renderCaixa() {
  var pf = state.profile;
  var hj = today();
  var caixaData = state.caixaData || {};

  // ── Selecionar data ───────────────────────────────────────────────────────
  var dataSel = state.caixaDataSel || hj;
  var fechamentos = state.fechamentosCaixa || [];
  var fechamentoHoje = fechamentos.find(function(f){ return f.data===dataSel && f.profile===pf; });

  // ── Calcular movimentos do dia ────────────────────────────────────────────
  var receitasDia = (state.receitas||[]).filter(function(r){
    return r.profile===pf && r.data===dataSel;
  });
  var despesasDia = (state.contas||[]).filter(function(c){
    return c.profile===pf && c.tipo==='pagar' && c.status==='pago' && c.vencimento===dataSel;
  });
  var receitasDiaAgrupadas = {};
  receitasDia.forEach(function(r){
    var k = r.formaPagamento||r.categoria||'Outros';
    receitasDiaAgrupadas[k] = (receitasDiaAgrupadas[k]||0) + (r.valor||0);
  });
  var totalEntradas = receitasDia.reduce(function(s,r){return s+(r.valor||0);},0);
  var totalSaidas   = despesasDia.reduce(function(s,c){return s+(c.valorPago||c.valor||0);},0);
  var saldoDia      = totalEntradas - totalSaidas;

  // ── Caixa físico (valores informados manualmente) ─────────────────────────
  var FORMAS = ['Dinheiro','Débito','Crédito','Pix','Vale Refeição','Outros'];
  var caixaVals = state.caixaVals || {};

  function getCaixaVal(k){ return caixaVals[dataSel] ? (caixaVals[dataSel][k]||0) : 0; }
  function setCaixaVal(k, v){
    var cv = Object.assign({}, caixaVals);
    cv[dataSel] = Object.assign({}, cv[dataSel]||{});
    cv[dataSel][k] = v;
    setState({caixaVals: cv});
  }

  var totalCaixaFisico = FORMAS.reduce(function(s,k){return s+getCaixaVal(k);},0);
  var diferenca = totalCaixaFisico - totalEntradas;

  // ── Estado do fechamento ──────────────────────────────────────────────────
  var jaFechado = !!fechamentoHoje;

  // ── Função salvar fechamento ──────────────────────────────────────────────
  function salvarFechamento() {
    var obs = document.getElementById('caixa-obs');
    var item = {
      id: jaFechado ? fechamentoHoje.id : ('cx_'+Date.now()),
      profile: pf,
      data: dataSel,
      totalEntradas: totalEntradas,
      totalSaidas: totalSaidas,
      saldoDia: saldoDia,
      totalCaixaFisico: totalCaixaFisico,
      diferenca: diferenca,
      formas: Object.assign({}, caixaVals[dataSel]||{}),
      obs: obs ? obs.value.trim() : (fechamentoHoje?fechamentoHoje.obs:''),
      fechadoEm: new Date().toISOString(),
    };
    var lista = jaFechado
      ? fechamentos.map(function(f){return f.id===item.id?item:f;})
      : fechamentos.concat([item]);
    lsSet('fechamentosCaixa', lista);
    setState({fechamentosCaixa: lista});
    scheduleSave();
    if(typeof logAudit==='function') logAudit('fechamento de caixa', fmtDate(dataSel)+' · resultado: '+fmtMoney(saldoDia));
    showToast(jaFechado?'Fechamento atualizado!':'Caixa fechado com sucesso!','success');
  }

  // ── Função exportar PDF ───────────────────────────────────────────────────
  function exportarPdfCaixa() {
    var emp = ((state.empresaData||{})[pf])||{};
    var nomeEmp = emp.nomeFantasia||emp.razaoSocial||'Financial Routine';
    var M = function(v){return'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});};
    var formasRows = FORMAS.map(function(k){
      var sistV = receitasDiaAgrupadas[k]||0;
      var fisV  = getCaixaVal(k);
      var dif   = fisV - sistV;
      return '<tr>'+
        '<td>'+k+'</td>'+
        '<td class="num">'+M(sistV)+'</td>'+
        '<td class="num">'+M(fisV)+'</td>'+
        '<td class="num '+(Math.abs(dif)<0.01?'ok':dif>0?'pos':'neg')+'">'+
          (Math.abs(dif)<0.01?'✓':dif>0?'+'+M(dif):M(dif))+
        '</td>'+
      '</tr>';
    }).join('');

    var w=window.open('','_blank','width=700,height=900');
    w.document.write(
      '<html><head><meta charset="UTF-8"><title>Fechamento '+fmtDate(dataSel)+'</title><style>'+
      'body{font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:700px;margin:0 auto}'+
      'h1{font-size:20px;font-weight:900;margin:0}'+
      '.sub{font-size:12px;color:#666;margin-bottom:4px}'+
      '.data{font-size:16px;font-weight:700;margin:16px 0;padding:10px 16px;background:#f9f9f9;border-radius:8px;border:1px solid #e5e7eb}'+
      '.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}'+
      '.kpi{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}'+
      '.kpi .label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}'+
      '.kpi .value{font-size:18px;font-weight:800}'+
      '.green{color:#16a34a}.red{color:#dc2626}.gold{color:#b45309}'+
      'table{width:100%;border-collapse:collapse;margin-bottom:20px}'+
      'th{padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e5e7eb}'+
      'td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px}'+
      '.num{text-align:right}.ok{color:#16a34a;text-align:right}.pos{color:#b45309;text-align:right}.neg{color:#dc2626;text-align:right}'+
      '.resultado{margin-top:8px;padding:16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;'+
        (Math.abs(diferenca)<0.01?'background:#f0fdf4;border:1px solid #bbf7d0;':diferenca>0?'background:#fffbeb;border:1px solid #fef08a;':'background:#fef2f2;border:1px solid #fecaca;')+'}'+
      '.rodape{margin-top:16px;font-size:10px;color:#999;text-align:center;border-top:1px dashed #ccc;padding-top:10px}'+
      '@media print{button{display:none}}'+
      '</style></head><body>'+
      '<h1>'+nomeEmp+'</h1>'+
      (emp.cnpj?'<div class="sub">CNPJ: '+emp.cnpj+'</div>':'')+
      '<div class="data">📋 Fechamento de Caixa — '+fmtDate(dataSel)+'</div>'+
      '<div class="kpis">'+
        '<div class="kpi"><div class="label">Entradas</div><div class="value green">'+M(totalEntradas)+'</div></div>'+
        '<div class="kpi"><div class="label">Saídas</div><div class="value red">'+M(totalSaidas)+'</div></div>'+
        '<div class="kpi"><div class="label">Resultado</div><div class="value '+(saldoDia>=0?'green':'red')+'">'+M(saldoDia)+'</div></div>'+
      '</div>'+
      '<h3 style="font-size:14px;margin-bottom:8px">Conferência por forma de pagamento</h3>'+
      '<table>'+
      '<thead><tr><th>Forma</th><th class="num">Sistema</th><th class="num">Caixa Físico</th><th class="num">Diferença</th></tr></thead>'+
      '<tbody>'+formasRows+'</tbody>'+
      '<tfoot><tr style="font-weight:700;border-top:2px solid #111">'+
        '<td>TOTAL</td>'+
        '<td class="num">'+M(totalEntradas)+'</td>'+
        '<td class="num">'+M(totalCaixaFisico)+'</td>'+
        '<td class="num '+(Math.abs(diferenca)<0.01?'ok':diferenca>0?'pos':'neg')+'">'+
          (Math.abs(diferenca)<0.01?'✓':diferenca>0?'+'+M(diferenca):M(diferenca))+
        '</td>'+
      '</tr></tfoot>'+
      '</table>'+
      '<div class="resultado">'+
        '<span style="font-size:14px;font-weight:700">'+
          (Math.abs(diferenca)<0.01?'✅ Caixa fechado corretamente':diferenca>0?'⬆ Sobra no caixa':'⬇ Falta no caixa')+
        '</span>'+
        '<span style="font-size:20px;font-weight:900">'+
          (Math.abs(diferenca)<0.01?'Conferido!':M(Math.abs(diferenca)))+
        '</span>'+
      '</div>'+
      (fechamentoHoje&&fechamentoHoje.obs?'<p style="margin-top:16px;font-size:13px;color:#444"><strong>Observações:</strong> '+fechamentoHoje.obs+'</p>':'')+
      '<div class="rodape">Emitido em '+new Date().toLocaleString('pt-BR')+' · Financial Routine</div>'+
      '<br><button onclick="window.print()" style="padding:10px 24px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">🖨 Imprimir / Salvar PDF</button>'+
      '</body></html>'
    );
    w.document.close();
  }

  // ── Histórico de fechamentos ──────────────────────────────────────────────
  var historico = fechamentos
    .filter(function(f){return f.profile===pf;})
    .sort(function(a,b){return b.data.localeCompare(a.data);})
    .slice(0,30);

  // ── RENDER ────────────────────────────────────────────────────────────────
  var datNav = el('div',{style:{display:'flex',alignItems:'center',gap:'8px'}});
  function navDat(delta){
    var d=new Date(dataSel+'T12:00:00');
    d.setDate(d.getDate()+delta);
    setState({caixaDataSel:d.toISOString().slice(0,10)});
  }
  var prevD=el('button',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text2)',cursor:'pointer',padding:'5px 12px',fontSize:'14px'}},'‹');
  prevD.onclick=function(){navDat(-1);};
  var datInp=el('input',{class:'form-input',type:'date',style:{width:'160px',textAlign:'center',fontWeight:'700',fontSize:'15px'},value:dataSel});
  datInp.onchange=function(){if(this.value)setState({caixaDataSel:this.value});};
  var nextD=el('button',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text2)',cursor:'pointer',padding:'5px 12px',fontSize:'14px'}},'›');
  nextD.onclick=function(){if(dataSel<hj)navDat(1);};
  var hojeBtnD=el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'5px 12px'}},'Hoje');
  hojeBtnD.onclick=function(){setState({caixaDataSel:hj});};
  datNav.appendChild(prevD);datNav.appendChild(datInp);datNav.appendChild(nextD);datNav.appendChild(hojeBtnD);

  // KPIs do dia
  var corRes=saldoDia>=0?'green':'red';
  var kpis=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'14px',marginBottom:'20px'}},[
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Total entradas'),el('div',{class:'kpi-value green'},fmtMoney(totalEntradas)),el('div',{class:'kpi-sub'},receitasDia.length+' registros')]),
    el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Total saídas'),el('div',{class:'kpi-value red'},fmtMoney(totalSaidas)),el('div',{class:'kpi-sub'},despesasDia.length+' pagamentos')]),
    el('div',{class:'kpi-card '+corRes},[el('div',{class:'kpi-label'},'Resultado do dia'),el('div',{class:'kpi-value '+corRes},fmtMoney(saldoDia)),el('div',{class:'kpi-sub'},'Entradas − Saídas')]),
    el('div',{class:'kpi-card '+(Math.abs(diferenca)<0.01?'green':diferenca>0?'gold':'red')},[
      el('div',{class:'kpi-label'},'Diferença caixa'),
      el('div',{class:'kpi-value '+(Math.abs(diferenca)<0.01?'green':diferenca>0?'gold':'red')},
        Math.abs(diferenca)<0.01?'✓ Zero':(diferenca>0?'+':'')+fmtMoney(diferenca)),
      el('div',{class:'kpi-sub'},Math.abs(diferenca)<0.01?'Conferido!':diferenca>0?'Sobra':'Falta'),
    ]),
  ]);

  // Conferência por forma de pagamento
  var confRows = FORMAS.map(function(k){
    var sistV = receitasDiaAgrupadas[k]||0;
    var fisV  = getCaixaVal(k);
    var dif   = fisV - sistV;
    var cor=Math.abs(dif)<0.01?'var(--green)':dif>0?'var(--gold)':'var(--red)';

    var fInp=el('input',{type:'number',min:'0',step:'0.01'});
    fInp.style.cssText='width:130px;padding:7px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:13px;font-family:inherit;text-align:right;';
    fInp.value=fisV>0?fisV.toFixed(2):'';
    fInp.placeholder='0,00';
    fInp.onchange=function(){setCaixaVal(k,parseFloat(this.value)||0);};
    if(jaFechado)fInp.readOnly=true;

    var row=el('tr',{style:{borderBottom:'1px solid var(--border)'}});
    var tdNome=el('td',{style:{padding:'10px 16px',fontSize:'13px',fontWeight:'600',color:'var(--text)'}});tdNome.textContent=k;
    var tdSist=el('td',{style:{padding:'10px 16px',fontSize:'13px',textAlign:'right',color:sistV>0?'var(--green)':'var(--text3)'}});
    tdSist.textContent=sistV>0?fmtMoney(sistV):'—';
    var tdFis=el('td',{style:{padding:'10px 16px',textAlign:'right'}});tdFis.appendChild(fInp);
    var tdDif=el('td',{style:{padding:'10px 16px',fontSize:'13px',fontWeight:'700',textAlign:'right',color:cor}});
    tdDif.textContent=Math.abs(dif)<0.01?'✓':(dif>0?'+':'')+fmtMoney(dif);
    row.appendChild(tdNome);row.appendChild(tdSist);row.appendChild(tdFis);row.appendChild(tdDif);
    return row;
  });

  var confTable=el('div',{style:{overflowX:'auto'}},[
    el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
      el('thead',{},[el('tr',{style:{background:'var(--bg3)'}},
        ['Forma de Pagamento','Sistema (lançamentos)','Caixa Físico (informar)','Diferença'].map(function(h){
          return el('th',{style:{padding:'10px 16px',fontSize:'11px',fontWeight:'700',textTransform:'uppercase',color:'var(--text3)',textAlign:h==='Forma de Pagamento'?'left':'right',whiteSpace:'nowrap'}},h);
        })
      )]),
      el('tbody',{},confRows),
      el('tfoot',{},[
        el('tr',{style:{borderTop:'2px solid var(--border)',fontWeight:'700',background:'var(--bg3)'}},[
          el('td',{style:{padding:'10px 16px',fontWeight:'700'}},'TOTAL'),
          el('td',{style:{padding:'10px 16px',fontWeight:'700',textAlign:'right',color:'var(--green)'}},fmtMoney(totalEntradas)),
          el('td',{style:{padding:'10px 16px',fontWeight:'700',textAlign:'right',color:'var(--text)'}},fmtMoney(totalCaixaFisico)),
          el('td',{style:{
            padding:'10px 16px',fontWeight:'800',textAlign:'right',
            color:Math.abs(diferenca)<0.01?'var(--green)':diferenca>0?'var(--gold)':'var(--red)',
          }},Math.abs(diferenca)<0.01?'✓ Conferido!':(diferenca>0?'+'  :'')+fmtMoney(diferenca)),
        ]),
      ]),
    ]),
  ]);

  // Entradas do dia
  var entradasCard=el('div',{class:'card',style:{marginTop:'14px'}});
  entradasCard.appendChild(el('div',{class:'card-title'},'Entradas do dia'));
  if(receitasDia.length===0){
    entradasCard.appendChild(el('div',{style:{padding:'20px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}},'Nenhuma receita registrada para este dia.'));
  } else {
    receitasDia.slice(0,10).forEach(function(r){
      var row=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}});
      var left=el('div',{});
      var desc=el('div',{style:{fontSize:'13px',fontWeight:'500',color:'var(--text)'}});desc.textContent=r.descricao||r.categoria||'—';
      var sub=el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'1px'}});sub.textContent=(r.categoria||'')+(r.formaPagamento?' · '+r.formaPagamento:'');
      left.appendChild(desc);left.appendChild(sub);
      var val=el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--green)'}});val.textContent=fmtMoney(r.valor);
      row.appendChild(left);row.appendChild(val);
      entradasCard.appendChild(row);
    });
    if(receitasDia.length>10){
      var moreEl=el('div',{style:{fontSize:'12px',color:'var(--text3)',paddingTop:'8px',textAlign:'center'}});
      moreEl.textContent='+ '+(receitasDia.length-10)+' outras entradas';
      entradasCard.appendChild(moreEl);
    }
  }

  // Observações e ação de fechar
  var obsArea=el('div',{class:'card',style:{marginTop:'14px'}});
  obsArea.appendChild(el('div',{class:'card-title'},'Observações e Fechamento'));
  var obsInp=el('textarea',{class:'form-input',id:'caixa-obs',placeholder:'Ocorrências do dia, sangrias, reforços...',rows:'3',style:{resize:'vertical'}});
  obsInp.value=fechamentoHoje?fechamentoHoje.obs||'':'';
  if(jaFechado)obsInp.readOnly=true;
  obsArea.appendChild(el('div',{class:'form-group'},[el('label',{class:'form-label'},'Observações do operador'),obsInp]));

  var statusBadge=el('div',{style:{display:'flex',alignItems:'center',gap:'12px',marginTop:'12px',flexWrap:'wrap'}});
  if(jaFechado){
    var badge=el('span',{style:{padding:'6px 14px',borderRadius:'20px',background:'var(--green-dim)',color:'var(--green)',fontSize:'12px',fontWeight:'700'}});
    badge.textContent='✅ Caixa fechado em '+new Date(fechamentoHoje.fechadoEm).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    statusBadge.appendChild(badge);
    var reabrirBtn=btn('btn-ghost','✏️ Reabrir e corrigir',function(){
      var lista=fechamentos.filter(function(f){return !(f.data===dataSel&&f.profile===pf);});
      lsSet('fechamentosCaixa',lista);
      setState({fechamentosCaixa:lista});
      showToast('Fechamento reaberto para correção','error');
    });
    reabrirBtn.style.fontSize='12px';
    statusBadge.appendChild(reabrirBtn);
  } else {
    var fecharBtn=btn('btn-primary','🔒 Fechar Caixa do Dia',salvarFechamento);
    fecharBtn.style.cssText+='font-size:15px;padding:12px 28px;';
    statusBadge.appendChild(fecharBtn);
    if(totalEntradas===0&&totalCaixaFisico===0){
      var semMovEl=el('span',{style:{fontSize:'12px',color:'var(--text3)'}});
      semMovEl.textContent='⚠ Nenhum movimento registrado para este dia.';
      statusBadge.appendChild(semMovEl);
    }
  }
  obsArea.appendChild(statusBadge);

  // Histórico
  var histCard=el('div',{class:'card',style:{marginTop:'14px'}});
  histCard.appendChild(el('div',{class:'card-title'},'Histórico de Fechamentos'));
  if(historico.length===0){
    histCard.appendChild(el('div',{style:{padding:'20px',textAlign:'center',color:'var(--text3)',fontSize:'13px'}},'Nenhum fechamento registrado ainda.'));
  } else {
    historico.forEach(function(f){
      var hRow=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)',gap:'8px',flexWrap:'wrap'}});
      var hLeft=el('div',{});
      var hData=el('div',{style:{fontSize:'14px',fontWeight:'700',color:'var(--text)'}});hData.textContent=fmtDate(f.data);
      var hSub=el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}});
      hSub.textContent='Entradas: '+fmtMoney(f.totalEntradas)+' · Saídas: '+fmtMoney(f.totalSaidas);
      hLeft.appendChild(hData);hLeft.appendChild(hSub);
      var hRight=el('div',{style:{display:'flex',alignItems:'center',gap:'12px'}});
      var hRes=el('div',{style:{fontSize:'14px',fontWeight:'700',color:f.saldoDia>=0?'var(--green)':'var(--red)'}});
      hRes.textContent=(f.saldoDia>=0?'+':'')+fmtMoney(f.saldoDia);
      var hDif=el('span',{style:{fontSize:'11px',padding:'3px 8px',borderRadius:'8px',
        background:Math.abs(f.diferenca||0)<0.01?'var(--green-dim)':'var(--red-dim)',
        color:Math.abs(f.diferenca||0)<0.01?'var(--green)':'var(--red)',fontWeight:'600'
      }});
      hDif.textContent=Math.abs(f.diferenca||0)<0.01?'✓ Conferido':(f.diferenca>0?'Sobra ':'Falta ')+fmtMoney(Math.abs(f.diferenca||0));
      var hVerBtn=el('button',{style:{background:'none',border:'none',color:'var(--gold)',fontSize:'12px',cursor:'pointer',padding:'4px 8px',fontFamily:'inherit',fontWeight:'600'}});
      hVerBtn.textContent='Ver';
      hVerBtn.onclick=(function(dt){return function(){setState({caixaDataSel:dt});};})(f.data);
      hRight.appendChild(hRes);hRight.appendChild(hDif);hRight.appendChild(hVerBtn);
      hRow.appendChild(hLeft);hRow.appendChild(hRight);
      histCard.appendChild(hRow);
    });
  }

  return el('div',{},[
    el('div',{class:'page-header'},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'12px'}},[
        el('div',{},[el('h1',{},'💰 Fechamento de Caixa'),el('p',{},'Conciliação diária — confronta sistema com caixa físico')]),
        el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[
          el('button',{class:'btn-ghost',style:{fontSize:'13px',display:'flex',alignItems:'center',gap:'6px'},onclick:exportarPdfCaixa},'📄 Exportar PDF'),
        ]),
      ]),
    ]),
    el('div',{class:'card'},[
      el('div',{style:{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}},[
        datNav,
        jaFechado?el('span',{style:{padding:'4px 12px',borderRadius:'12px',background:'var(--green-dim)',color:'var(--green)',fontSize:'12px',fontWeight:'700'}},'✅ Fechado'):
                  el('span',{style:{padding:'4px 12px',borderRadius:'12px',background:'var(--gold-dim)',color:'var(--gold)',fontSize:'12px',fontWeight:'700'}},'⏳ Em aberto'),
      ]),
      kpis,
      el('div',{class:'card-title'},'Conferência por forma de pagamento'),
      confTable,
    ]),
    entradasCard,
    obsArea,
    histCard,
  ]);
}
