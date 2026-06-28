// ── ORÇAMENTO vs REALIZADO ────────────────────────────────────────────────────
function renderOrcamento(){
  var pf=state.profile;
  var now=new Date();
  var mesFiltro=state.orcamentoMes||(now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0'));

  function fmtMes(m){var p=m.split('-');return MESES[parseInt(p[1])-1]+' '+p[0];}
  function getMes(d){return d?d.slice(0,7):'';}

  // Seletores de mês
  var todos=state.receitas.concat(state.contas).filter(function(x){return x.profile===pf;});
  var meses=[...new Set(todos.map(function(x){return getMes(x.data||x.vencimento||'');}))].filter(Boolean).sort().reverse();
  if(meses.indexOf(mesFiltro)<0)meses.unshift(mesFiltro);

  var selMes=el('select',{class:'form-input',style:{fontSize:'13px',padding:'6px 10px',minWidth:'130px'},onchange:function(e){setState({orcamentoMes:e.target.value});}});
  meses.forEach(function(m){var op=el('option',{value:m},fmtMes(m));if(m===mesFiltro)op.selected=true;selMes.appendChild(op);});

  // Orçamentos do perfil
  var orcamentos=(state.orcamentos||[]).filter(function(o){return o.profile===pf;});

  // Receita real do mês
  var recReal=state.receitas.filter(function(r){return r.profile===pf&&r.data&&r.data.startsWith(mesFiltro);}).reduce(function(a,r){return a+r.valor;},0);
  var contasRec=state.contas.filter(function(c){return c.profile===pf&&c.tipo==='receber'&&c.status==='recebido'&&c.vencimento&&c.vencimento.startsWith(mesFiltro);}).reduce(function(a,c){return a+c.valor;},0);
  var receitaRealTotal=recReal+contasRec;

  // Despesas reais = somente pagas (pendentes/vencidas ainda não saíram do caixa)
  var despesas=state.contas.filter(function(c){return c.profile===pf&&c.tipo==='pagar'&&c.status==='pago'&&c.vencimento&&c.vencimento.startsWith(mesFiltro);});
  var realByCat={};
  despesas.forEach(function(c){realByCat[c.categoria]=(realByCat[c.categoria]||0)+c.valor;});

  // Orçamento receita
  var orcRec=orcamentos.find(function(o){return o.tipo==='receita';});

  // Orçamentos despesa
  var orcDes=orcamentos.filter(function(o){return o.tipo==='despesa';});

  // KPIs sumário
  var totalOrcDes=orcDes.reduce(function(a,o){return a+o.valor;},0);
  var totalRealDes=despesas.reduce(function(a,c){return a+c.valor;},0);
  var orcRecVal=orcRec?orcRec.valor:0;
  var saldoOrc=(orcRecVal||receitaRealTotal)-totalOrcDes;
  var saldoReal=receitaRealTotal-totalRealDes;

  function pctBar(real,orc,cor){
    if(!orc||orc===0)return null;
    var pct=Math.min(100,Math.round((real/orc)*100));
    var barCor=pct>100?'var(--red)':pct>80?'var(--gold)':cor||'var(--green)';
    return el('div',{},[
      el('div',{style:{display:'flex',justifyContent:'space-between',marginBottom:'4px'}},[
        el('span',{style:{fontSize:'11px',color:'var(--text3)'}},pct+'% utilizado'),
        el('span',{style:{fontSize:'11px',color:pct>100?'var(--red)':'var(--text3)'}},pct>100?'⚠ Acima do orçamento':''),
      ]),
      el('div',{style:{height:'6px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}},[
        el('div',{style:{width:Math.min(pct,100)+'%',height:'100%',background:barCor,borderRadius:'3px',transition:'width .4s'}}),
      ]),
    ]);
  }

  // Card de receita
  var recCard=div('card',[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}},[
      div('card-title','Meta de receita'),
      el('button',{class:'btn-icon edit',title:'Editar meta',onclick:function(){setState({orcamentoModal:{editItem:orcRec||{tipo:'receita'}}});}}, orcRec?'✏️':'+ Definir'),
    ]),
    el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'10px'}},[
      el('div',{},[el('div',{style:{fontSize:'11px',color:'var(--text3)'}},orcRec?'Meta':'Sem meta'),el('div',{style:{fontSize:'18px',fontWeight:'700',color:'var(--gold)'}},fmtMoney(orcRecVal))]),
      el('div',{},[el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Realizado'),el('div',{style:{fontSize:'18px',fontWeight:'700',color:'var(--green)'}},fmtMoney(receitaRealTotal))]),
    ]),
    orcRec?pctBar(receitaRealTotal,orcRecVal,'var(--green)'):null,
    !orcRec?el('p',{style:{fontSize:'12px',color:'var(--text3)',textAlign:'center',padding:'8px 0'}},'Clique em "+ Definir" para cadastrar uma meta de receita'):null,
  ].filter(Boolean));

  // Categorias de despesa com orçamento
  var catComOrc=orcDes.map(function(o){
    var real=realByCat[o.categoria]||0;
    var pct=o.valor>0?Math.min(100,Math.round((real/o.valor)*100)):0;
    var cor=pct>100?'var(--red)':pct>80?'var(--gold)':'var(--green)';
    return el('div',{style:{padding:'10px 0',borderBottom:'1px solid var(--border)'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}},[
        el('span',{style:{fontSize:'13px',fontWeight:'500',color:'var(--text)'}},o.categoria),
        el('div',{style:{display:'flex',gap:'12px',alignItems:'center'}},[
          el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Orç: '+fmtMoney(o.valor)),
          el('span',{style:{fontSize:'13px',fontWeight:'700',color:cor}},fmtMoney(real)),
          el('div',{style:{display:'flex',gap:'4px'}},[
            el('button',{class:'btn-icon edit',onclick:function(){setState({orcamentoModal:{editItem:o}});}}, '✏️'),
            el('button',{class:'btn-icon',onclick:function(){deleteOrcamento(o.id);}}, '🗑️'),
          ]),
        ]),
      ]),
      el('div',{style:{height:'5px',background:'var(--bg3)',borderRadius:'3px',overflow:'hidden'}},[
        el('div',{style:{width:pct+'%',height:'100%',background:cor,borderRadius:'3px',transition:'width .4s'}}),
      ]),
    ]);
  });

  // Categorias sem orçamento (têm despesa mas sem orçamento)
  var catSemOrc=Object.keys(realByCat).filter(function(c){return!orcDes.find(function(o){return o.categoria===c;});});
  var semOrcRows=catSemOrc.map(function(cat){
    return el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)',opacity:'0.6'}},[
      el('span',{style:{fontSize:'12px',color:'var(--text2)'}},cat),
      el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[
        el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'Sem orçamento'),
        el('span',{style:{fontSize:'13px',fontWeight:'600',color:'var(--text)'}},fmtMoney(realByCat[cat])),
        el('button',{class:'btn-icon edit',style:{fontSize:'11px'},onclick:function(){setState({orcamentoModal:{editItem:{tipo:'despesa',categoria:cat}}});}}, '+ Orç'),
      ]),
    ]);
  });

  // Resumo
  var resumo=el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',marginBottom:'14px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Orç. Despesas'),el('div',{class:'kpi-value'},fmtMoney(totalOrcDes)),el('div',{class:'kpi-sub'},orcDes.length+' categoria(s)')]),
    el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Despesas reais'),el('div',{class:'kpi-value red'},fmtMoney(totalRealDes)),el('div',{class:'kpi-sub'},(totalRealDes>totalOrcDes&&totalOrcDes>0)?'⚠ Acima do orçamento':'Dentro do orçamento')]),
    el('div',{class:'kpi-card '+(saldoReal>=0?'green':'red')},[el('div',{class:'kpi-label'},'Saldo real'),el('div',{class:'kpi-value '+(saldoReal>=0?'green':'red')},fmtMoney(saldoReal)),el('div',{class:'kpi-sub'},'Receita − Despesas')]),
  ]);

  return div('',[
    div('page-header',[
      el('h1',{},'Orçamento vs Realizado'),
      el('p',{},pf==='artt'?'Artt Burger — controle de metas por categoria':'Controle de metas pessoais por categoria'),
    ]),
    div('action-row',[
      el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[selMes]),
      el('button',{class:'btn-primary',onclick:function(){setState({orcamentoModal:{editItem:{tipo:'despesa'}}});}}, '+ Novo orçamento'),
    ]),
    resumo,
    el('div',{style:{display:'grid',gridTemplateColumns:'300px 1fr',gap:'14px',alignItems:'start'}},[
      recCard,
      div('card',[
        div('card-title','Orçamento por categoria de despesa'),
        orcDes.length===0&&catSemOrc.length===0
          ?div('empty',[div('empty-icon','💰'),div('empty-title','Nenhuma despesa registrada'),el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Adicione orçamentos para categorias')])
          :el('div',{},[...catComOrc,...semOrcRows]),
      ]),
    ]),
  ]);
}
