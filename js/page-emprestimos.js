// ── EMPRÉSTIMOS ───────────────────────────────────────────────────────────────

// Retorna saúde do empréstimo baseada na taxa mensal aproximada
function empSaude(valorContratado, valorTotalFinal, numParcelas){
  if(!valorTotalFinal||!valorContratado||!numParcelas||valorTotalFinal<=valorContratado)
    return null;
  // Taxa mensal pelo método Price aproximado: i ≈ (VF/VP)^(1/n) - 1
  var taxaMes=(Math.pow(valorTotalFinal/valorContratado,1/numParcelas)-1)*100;
  var taxaTotal=((valorTotalFinal-valorContratado)/valorContratado)*100;
  var label,color,icon;
  if(taxaMes<1.5){label='Saudável';color='var(--green)';icon='✅';}
  else if(taxaMes<3){label='Moderado';color='var(--gold)';icon='⚠️';}
  else if(taxaMes<5){label='Alto custo';color='#e07832';icon='🔶';}
  else{label='Abusivo';color:'var(--red)';icon='🚨';color='var(--red)';}
  return {taxaMes:Math.round(taxaMes*100)/100,taxaTotal:Math.round(taxaTotal*10)/10,label:label,color:color,icon:icon};
}

function renderEmprestimos(){
  var emprestimos=(state.emprestimos||[]).filter(function(e){return !e.profile||e.profile===state.profile;});
  var modal=state.emprestimoModal;

  // ── MODAL CRIAR / EDITAR ────────────────────────────────────────────────────
  if(modal){
    var isEdit=!!modal.editItem;
    var ed=modal.editItem||{};

    function gv(id){var e=document.getElementById('emp-'+id);return e?e.value:'';}

    function recalcular(){
      var vc=parseFloat(document.getElementById('emp-valorContratado').value)||0;
      var np=parseInt(document.getElementById('emp-numParcelas').value)||0;
      var vtf=parseFloat(document.getElementById('emp-valorTotalFinal').value)||0;
      var vpEl=document.getElementById('emp-valorParcela');
      var previewEl=document.getElementById('emp-juros-preview');

      // Calcula parcela
      if(vtf>0&&np>0){
        if(vpEl)vpEl.value=(vtf/np).toFixed(2);
      } else if(vc>0&&np>0){
        if(vpEl&&!vpEl.dataset.manual)vpEl.value=(vc/np).toFixed(2);
      }

      // Preview de juros
      if(previewEl){
        if(vtf>vc&&vc>0&&np>0){
          var s=empSaude(vc,vtf,np);
          var juros=vtf-vc;
          previewEl.innerHTML='';
          previewEl.style.display='flex';
          previewEl.appendChild(el('div',{style:{display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'center',fontSize:'12px'}},[
            el('span',{style:{color:'var(--text3)'}},'Juros: '),
            el('span',{style:{fontWeight:'700',color:'var(--red)'}},fmtMoney(juros)+' ('+s.taxaTotal+'% total)'),
            el('span',{style:{color:'var(--text3)'}},'Taxa mensal ≈ '),
            el('span',{style:{fontWeight:'700',color:s.color}},s.taxaMes+'%/mês'),
            el('span',{style:{fontWeight:'700',padding:'2px 10px',borderRadius:'10px',background:'var(--bg4)',color:s.color}},s.icon+' '+s.label),
          ]));
        } else {
          previewEl.style.display='none';
        }
      }
    }

    function save(){
      var descricao=(gv('descricao')||'').trim();
      if(!descricao){showToast('Informe uma descrição','error');return;}
      var valorContratado=parseFloat(gv('valorContratado'))||0;
      if(valorContratado<=0){showToast('Informe o valor contratado','error');return;}
      var numParcelas=parseInt(gv('numParcelas'))||0;
      if(numParcelas<=0){showToast('Informe o número de parcelas','error');return;}
      var valorTotalFinal=parseFloat(gv('valorTotalFinal'))||0;
      var valorParcela=parseFloat(gv('valorParcela'))||0;
      if(!valorParcela){
        valorParcela=valorTotalFinal>0?(valorTotalFinal/numParcelas):(valorContratado/numParcelas);
      }
      var parcelasPagas=Math.min(parseInt(gv('parcelasPagas'))||0,numParcelas);
      var dataInicio=gv('dataInicio')||today();
      var banco=(gv('banco')||'').trim();
      var notas=(gv('notas')||'').trim();
      var item={
        id: isEdit?ed.id:('emp_'+Date.now()),
        descricao:descricao,valorContratado:valorContratado,
        valorTotalFinal:valorTotalFinal||0,
        numParcelas:numParcelas,valorParcela:valorParcela,
        parcelasPagas:parcelasPagas,dataInicio:dataInicio,
        banco:banco,notas:notas,profile:state.profile,
      };
      if(isEdit){
        var arr=state.emprestimos.map(function(x){return x.id===item.id?item:x;});
        lsSet('emprestimos',arr);setState({emprestimos:arr,emprestimoModal:null});
      } else {
        var arr2=(state.emprestimos||[]).concat([item]);
        lsSet('emprestimos',arr2);setState({emprestimos:arr2,emprestimoModal:null});
      }
      scheduleSave();showToast(isEdit?'Empréstimo atualizado!':'Empréstimo cadastrado!');
    }

    function fld(labelTxt,inputEl,hint){
      return div('form-group',[
        el('label',{class:'form-label'},labelTxt),
        inputEl,
        hint?el('p',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},hint):null,
      ].filter(Boolean));
    }

    var vcInp=el('input',{class:'form-input',id:'emp-valorContratado',type:'number',min:'0',step:'0.01',placeholder:'0,00',oninput:recalcular});
    vcInp.value=ed.valorContratado?String(ed.valorContratado):'';

    var npInp=el('input',{class:'form-input',id:'emp-numParcelas',type:'number',min:'1',step:'1',placeholder:'12',oninput:recalcular});
    npInp.value=ed.numParcelas?String(ed.numParcelas):'';

    // Campo valor total final (com juros)
    var vtfInp=el('input',{class:'form-input',id:'emp-valorTotalFinal',type:'number',min:'0',step:'0.01',placeholder:'0,00 (opcional)',oninput:recalcular});
    vtfInp.value=ed.valorTotalFinal?String(ed.valorTotalFinal):'';

    // Preview de juros (gerado pelo recalcular)
    var jurosPreview=el('div',{id:'emp-juros-preview',style:{
      display:'none',padding:'8px 12px',background:'var(--bg3)',
      borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',
      marginTop:'4px',gap:'8px',flexWrap:'wrap',
    }});

    var vpInp=el('input',{class:'form-input',id:'emp-valorParcela',type:'number',min:'0',step:'0.01',placeholder:'0,00',oninput:function(){this.dataset.manual='1';}});
    vpInp.value=ed.valorParcela?String(ed.valorParcela):'';

    var ppInp=el('input',{class:'form-input',id:'emp-parcelasPagas',type:'number',min:'0',step:'1',placeholder:'0'});
    ppInp.value=ed.parcelasPagas?String(ed.parcelasPagas):'0';

    var descInp=el('input',{class:'form-input',id:'emp-descricao',type:'text',placeholder:'Ex: Empréstimo Itaú, Financiamento Carro...',maxlength:'60'});
    descInp.value=ed.descricao||'';

    var bancoInp=el('input',{class:'form-input',id:'emp-banco',type:'text',placeholder:'Ex: Itaú, Nubank, Bradesco...',maxlength:'40'});
    bancoInp.value=ed.banco||'';

    var dtInp=el('input',{class:'form-input',id:'emp-dataInicio',type:'date'});
    dtInp.value=ed.dataInicio||today();

    var notasInp=el('textarea',{class:'form-input',id:'emp-notas',rows:'2',placeholder:'Observações, condições, taxas...',style:{resize:'vertical'}});
    notasInp.value=ed.notas||'';

    var mEl=div('modal',[
      div('modal-title',[
        el('span',{},(isEdit?'Editar':'Novo')+' empréstimo'),
        el('button',{class:'modal-close',onclick:function(){setState({emprestimoModal:null});}},'×'),
      ]),
      fld('Descrição / Nome',descInp),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        fld('Valor contratado (R$)',vcInp,'Valor liberado pelo banco'),
        fld('Número de parcelas',npInp),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Valor total a pagar — com juros (R$)'),
        vtfInp,
        jurosPreview,
        el('p',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Informe o total que será pago ao final do contrato. O sistema calcula os juros e avalia a saúde do empréstimo.'),
      ]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        fld('Valor da parcela (R$)',vpInp,'Recalculado automaticamente'),
        fld('Parcelas já pagas',ppInp),
      ]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        fld('Data de início',dtInp),
        fld('Banco / Credor',bancoInp),
      ]),
      fld('Observações',notasInp),
      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({emprestimoModal:null});}),
        btn('btn-primary',isEdit?'💾 Salvar':'➕ Cadastrar',save),
      ]),
    ]);
    mEl.style.maxWidth='520px';
    var ov=div('modal-overlay',[mEl]);
    ov.onclick=function(e){if(e.target===ov)setState({emprestimoModal:null});};
    setTimeout(function(){
      var i=document.getElementById('emp-descricao');if(i)i.focus();
      recalcular(); // inicializa preview se editando
    },50);
    return ov;
  }

  // ── CÁLCULOS TOTAIS ─────────────────────────────────────────────────────────
  var totContratado=0,totPago=0,totRestante=0,totJuros=0,qtdAtivos=0,qtdQuitados=0;
  emprestimos.forEach(function(e){
    var pago=(e.parcelasPagas||0)*(e.valorParcela||0);
    var restante=((e.numParcelas||0)-(e.parcelasPagas||0))*(e.valorParcela||0);
    totContratado+=e.valorContratado||0;
    totPago+=pago;
    totRestante+=restante;
    if(e.valorTotalFinal&&e.valorTotalFinal>e.valorContratado)totJuros+=(e.valorTotalFinal-e.valorContratado);
    if((e.parcelasPagas||0)>=(e.numParcelas||1))qtdQuitados++;else qtdAtivos++;
  });

  // ── KPIS ────────────────────────────────────────────────────────────────────
  var kpiCols=totJuros>0?5:4;
  var kpis=el('div',{style:{display:'grid',gridTemplateColumns:'repeat('+kpiCols+',1fr)',gap:'12px',marginBottom:'20px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total contratado'),el('div',{class:'kpi-value'},fmtMoney(totContratado)),el('div',{class:'kpi-sub'},emprestimos.length+' empréstimo'+(emprestimos.length!==1?'s':''))]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Total pago'),el('div',{class:'kpi-value green'},fmtMoney(totPago)),el('div',{class:'kpi-sub'},'Amortizado')]),
    el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Saldo devedor'),el('div',{class:'kpi-value red'},fmtMoney(totRestante)),el('div',{class:'kpi-sub'},'Parcelas restantes')]),
    totJuros>0?el('div',{class:'kpi-card',style:{borderColor:'rgba(224,82,82,.3)'}},[
      el('div',{class:'kpi-label'},'Total em juros'),
      el('div',{class:'kpi-value',style:{color:'#e07832'}},fmtMoney(totJuros)),
      el('div',{class:'kpi-sub'},'Custo do crédito'),
    ]):null,
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Situação'),el('div',{class:'kpi-value',style:{fontSize:'18px'}},qtdAtivos+' ativo'+(qtdAtivos!==1?'s':'')),el('div',{class:'kpi-sub'},qtdQuitados+' quitado'+(qtdQuitados!==1?'s':''))]),
  ].filter(Boolean));

  // ── CARTÕES DE EMPRÉSTIMO ───────────────────────────────────────────────────
  function empCard(e){
    var pagas=e.parcelasPagas||0;
    var total=e.numParcelas||1;
    var restantes=total-pagas;
    var pctPago=Math.min(100,Math.round((pagas/total)*100));
    var pctRest=100-pctPago;
    var vlPago=pagas*(e.valorParcela||0);
    var vlRest=restantes*(e.valorParcela||0);
    var quitado=pagas>=total;
    var saude=e.valorTotalFinal&&e.valorTotalFinal>e.valorContratado
      ?empSaude(e.valorContratado,e.valorTotalFinal,total):null;
    var juros=e.valorTotalFinal&&e.valorTotalFinal>e.valorContratado
      ?(e.valorTotalFinal-e.valorContratado):0;

    // Barra de progresso
    var barWrap=el('div',{style:{position:'relative',height:'14px',borderRadius:'7px',background:'var(--bg4)',overflow:'hidden',marginBottom:'8px'}},[
      el('div',{style:{height:'100%',width:pctPago+'%',background:quitado?'var(--green)':'linear-gradient(90deg,var(--green),#2ecc71)',borderRadius:pctPago===100?'6px':'6px 0 0 6px',transition:'width .6s ease'}}),
      el('div',{style:{height:'100%',width:pctRest+'%',background:'linear-gradient(90deg,#e05252,#c0392b)',borderRadius:pctPago===0?'6px':'0 6px 6px 0',transition:'width .6s ease'}}),
    ]);
    var barLabels=el('div',{style:{display:'flex',justifyContent:'space-between',fontSize:'11px',marginBottom:'14px'}},[
      el('div',{style:{display:'flex',alignItems:'center',gap:'5px'}},[
        el('div',{style:{width:'8px',height:'8px',borderRadius:'50%',background:'var(--green)',flexShrink:'0'}}),
        el('span',{style:{color:'var(--green)',fontWeight:'700'}},pctPago+'% pago'),
        el('span',{style:{color:'var(--text3)'}},'('+pagas+'/'+total+')'),
      ]),
      el('div',{style:{display:'flex',alignItems:'center',gap:'5px'}},[
        el('span',{style:{color:'var(--text3)'}},restantes+' restantes'),
        el('div',{style:{width:'8px',height:'8px',borderRadius:'50%',background:'var(--red)',flexShrink:'0'}}),
        el('span',{style:{color:'var(--red)',fontWeight:'700'}},pctRest+'% a pagar'),
      ]),
    ]);

    // Previsão de término
    var dtPrev='';
    if(!quitado&&e.dataInicio&&restantes>0){
      var dt=new Date(e.dataInicio+'T12:00:00');
      dt.setMonth(dt.getMonth()+total);
      var MF=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      dtPrev=MF[dt.getMonth()]+'/'+dt.getFullYear();
    }

    // Badge status progresso
    var badgeColor=quitado?'var(--green)':pctPago>=75?'#e07832':pctPago>=50?'var(--gold)':'var(--red)';
    var badgeLabel=quitado?'✅ Quitado':pctPago>=75?'⚡ Quase lá':pctPago>=50?'📈 Metade':'🔴 Início';

    // Bloco de saúde
    var saudeBlock=saude&&!quitado?el('div',{style:{
      display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',
      marginBottom:'12px',padding:'12px',
      background:'var(--bg3)',borderRadius:'var(--radius-sm)',
      border:'1px solid var(--border)',
    }},[
      el('div',{},[
        el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'}},'Juros totais'),
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:'#e07832'}},fmtMoney(juros)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},saude.taxaTotal+'% sobre o capital'),
      ]),
      el('div',{},[
        el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'}},'Taxa mensal ≈'),
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:saude.color}},saude.taxaMes+'% a.m.'),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Custo efetivo'),
      ]),
      el('div',{},[
        el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'}},'Saúde financeira'),
        el('div',{style:{fontSize:'14px',fontWeight:'700',color:saude.color}},saude.icon+' '+saude.label),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},
          saude.taxaMes<1.5?'Taxa competitiva':
          saude.taxaMes<3?'Dentro da média':
          saude.taxaMes<5?'Acima da média':'Rever condições'),
      ]),
    ]):null;

    // Valores principais
    var valoresGrid=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:e.notas||saudeBlock?'12px':'0'}},[
      el('div',{style:{background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}},[
        el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'4px'}},'Contratado'),
        el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--text)'}},fmtMoney(e.valorContratado||0)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},fmtMoney(e.valorParcela||0)+'/mês'),
      ]),
      el('div',{style:{background:'rgba(76,175,130,.08)',border:'1px solid rgba(76,175,130,.2)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}},[
        el('div',{style:{fontSize:'10px',color:'var(--green)',fontWeight:'700',textTransform:'uppercase',marginBottom:'4px'}},'Total pago'),
        el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--green)'}},fmtMoney(vlPago)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},pagas+' parcela'+(pagas!==1?'s':'')+' pagas'),
      ]),
      el('div',{style:{background:'rgba(224,82,82,.08)',border:'1px solid rgba(224,82,82,.2)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}},[
        el('div',{style:{fontSize:'10px',color:'var(--red)',fontWeight:'700',textTransform:'uppercase',marginBottom:'4px'}},'Saldo devedor'),
        el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--red)'}},fmtMoney(vlRest)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)'}},restantes+' parcela'+(restantes!==1?'s':'')+' restantes'),
      ]),
    ]);

    var card=div('card',[
      // Cabeçalho
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}},[
        el('div',{},[
          el('div',{style:{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px',flexWrap:'wrap'}},[
            el('span',{style:{fontSize:'18px'}},'💳'),
            el('h3',{style:{fontSize:'15px',fontWeight:'700',color:'var(--text)',margin:'0'}},e.descricao),
            el('span',{style:{fontSize:'10px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',background:quitado?'rgba(76,175,130,.15)':'var(--bg3)',color:badgeColor}},badgeLabel),
            saude&&!quitado?el('span',{style:{fontSize:'10px',fontWeight:'700',padding:'2px 8px',borderRadius:'10px',background:'var(--bg3)',color:saude.color}},saude.icon+' '+saude.label):null,
          ].filter(Boolean)),
          el('div',{style:{display:'flex',gap:'16px',fontSize:'11px',color:'var(--text3)',flexWrap:'wrap'}},[
            e.banco?el('span',{},'🏦 '+e.banco):null,
            e.dataInicio?el('span',{},'📅 Início: '+fmtDate(e.dataInicio)):null,
            dtPrev&&!quitado?el('span',{},'🏁 Previsão: '+dtPrev):null,
            e.valorTotalFinal?el('span',{},'📋 Total contrato: '+fmtMoney(e.valorTotalFinal)):null,
          ].filter(Boolean)),
        ]),
        el('div',{style:{display:'flex',gap:'8px',flexShrink:'0'}},[
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({emprestimoModal:{editItem:e}});}},'✏️'),
          el('button',{class:'btn-icon delete',title:'Excluir',onclick:function(){
            if(window.confirm('Excluir empréstimo "'+e.descricao+'"?')){
              var arr=(state.emprestimos||[]).filter(function(x){return x.id!==e.id;});
              lsSet('emprestimos',arr);setState({emprestimos:arr});scheduleSave();showToast('Empréstimo removido','error');
            }
          }},'🗑'),
        ]),
      ]),
      barWrap,
      barLabels,
      saudeBlock,
      valoresGrid,
      e.notas?el('div',{style:{fontSize:'12px',color:'var(--text3)',fontStyle:'italic',borderTop:'1px solid var(--border)',paddingTop:'10px'}},'📝 '+e.notas):null,
    ].filter(Boolean));

    if(quitado)card.style.opacity='0.75';
    return card;
  }

  var ativos=emprestimos.filter(function(e){return (e.parcelasPagas||0)<(e.numParcelas||1);});
  var quitados=emprestimos.filter(function(e){return (e.parcelasPagas||0)>=(e.numParcelas||1);});

  var emptyState=div('card',[
    div('empty',[
      div('empty-icon','💳'),
      div('empty-title','Nenhum empréstimo cadastrado'),
      el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Cadastre seus empréstimos para acompanhar o progresso e avaliar a saúde financeira.'),
      btn('btn-primary','➕ Cadastrar empréstimo',function(){setState({emprestimoModal:{}});}),
    ]),
  ]);

  return div('',[
    div('page-header',[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},[
        el('div',{},[
          el('h1',{},'💳 Empréstimos'),
          el('p',{},'Acompanhe seus empréstimos e avalie a saúde financeira'),
        ]),
        emprestimos.length>0?btn('btn-primary','➕ Novo empréstimo',function(){setState({emprestimoModal:{}});}):null,
      ].filter(Boolean)),
    ]),
    emprestimos.length>0?kpis:null,
    emprestimos.length===0
      ?emptyState
      :el('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}},[
          ativos.length>0?el('div',{},[
            el('div',{style:{fontSize:'12px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'10px',paddingLeft:'2px'}},'Em aberto ('+ativos.length+')'),
            ...ativos.map(empCard),
          ]):null,
          quitados.length>0?el('div',{},[
            el('div',{style:{fontSize:'12px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'10px',paddingLeft:'2px',marginTop:ativos.length?'8px':'0'}},'Quitados ('+quitados.length+')'),
            ...quitados.map(empCard),
          ]):null,
        ].filter(Boolean)),
  ].filter(Boolean));
}
