// ── EMPRÉSTIMOS ───────────────────────────────────────────────────────────────

var FORMAS_ABATE=[
  {key:'stone',  label:'Stone — Retenção automática'},
  {key:'pix',    label:'Pix'},
  {key:'ted',    label:'TED / DOC'},
  {key:'boleto', label:'Boleto'},
  {key:'debito', label:'Débito em conta'},
  {key:'outros', label:'Outros'},
];

function empSaude(valorContratado,valorTotalFinal,numParcelas){
  if(!valorTotalFinal||!valorContratado||!numParcelas||valorTotalFinal<=valorContratado)return null;
  var taxaMes=(Math.pow(valorTotalFinal/valorContratado,1/numParcelas)-1)*100;
  var taxaTotal=((valorTotalFinal-valorContratado)/valorContratado)*100;
  var label,color,icon;
  if(taxaMes<1.5){label='Saudável';color='var(--green)';icon='✅';}
  else if(taxaMes<3){label='Moderado';color='var(--gold)';icon='⚠️';}
  else if(taxaMes<5){label='Alto custo';color='#e07832';icon='🔶';}
  else{label='Abusivo';color='var(--red)';icon='🚨';}
  return{taxaMes:Math.round(taxaMes*100)/100,taxaTotal:Math.round(taxaTotal*10)/10,label:label,color:color,icon:icon};
}

// Calcula parcelasPagas a partir do array de pagamentos registrados
function calcParcelasPagas(emp){
  var pagamentos=emp.pagamentos||[];
  if(pagamentos.length===0)return emp.parcelasPagas||0;
  var total=pagamentos.reduce(function(s,p){return s+(p.valor||0);},0);
  var vp=emp.valorParcela||1;
  return Math.min(emp.numParcelas||0,Math.floor(total/vp));
}

// Total abatido somando pagamentos registrados
function totalAbatido(emp){
  return (emp.pagamentos||[]).reduce(function(s,p){return s+(p.valor||0);},0);
}

function renderEmprestimos(){
  var todosEmprestimos=state.emprestimos||[];
  var emprestimos=todosEmprestimos.filter(function(e){return !e.profile||e.profile===state.profile;});

  // ── MODAL ABATER PAGAMENTO ────────────────────────────────────────────────
  if(state.abaterModal){
    var abm=state.abaterModal;
    var ativos=emprestimos.filter(function(e){return (calcParcelasPagas(e))<(e.numParcelas||1);});

    function gab(id){var e=document.getElementById('ab-'+id);return e?e.value:'';}

    function refreshAbatePreview(){
      var empId=gab('emprestimo');
      var valor=parseFloat(gab('valor'))||0;
      var bancoId=gab('banco');
      var previewEl=document.getElementById('ab-preview');
      var saldoEl=document.getElementById('ab-saldo-preview');
      if(!previewEl)return;

      var emp=todosEmprestimos.find(function(x){return x.id===empId;});
      var banco=(state.bancos||[]).find(function(b){return b.id===bancoId;});

      // Preview saldo banco
      if(saldoEl){
        if(banco&&valor>0){
          var novoSaldo=(banco.saldo||0)-valor;
          saldoEl.style.display='flex';
          saldoEl.innerHTML='';
          saldoEl.appendChild(el('div',{style:{display:'flex',gap:'12px',fontSize:'12px',alignItems:'center',flexWrap:'wrap'}},[
            el('span',{style:{color:'var(--text3)'}},'Saldo atual: '),
            el('span',{style:{fontWeight:'700'}},fmtMoney(banco.saldo||0)),
            el('span',{style:{color:'var(--text3)'}},'→ Após débito: '),
            el('span',{style:{fontWeight:'700',color:novoSaldo<0?'var(--red)':'var(--green)'}},fmtMoney(novoSaldo)),
            novoSaldo<0?el('span',{style:{color:'var(--red)',fontSize:'11px'}},'⚠️ Saldo ficará negativo'):null,
          ].filter(Boolean)));
        } else {
          saldoEl.style.display='none';
        }
      }

      // Preview parcelas
      if(emp&&valor>0){
        previewEl.style.display='block';
        var jaAbatido=totalAbatido(emp);
        var novoTotal=jaAbatido+valor;
        var vp=emp.valorParcela||1;
        var novasPagas=Math.min(emp.numParcelas,Math.floor(novoTotal/vp));
        var atualPagas=calcParcelasPagas(emp);
        var saldoParcial=novoTotal-(novasPagas*vp);
        previewEl.innerHTML='';
        previewEl.appendChild(el('div',{style:{fontSize:'12px',color:'var(--text2)',lineHeight:'1.8'}},[
          el('div',{},[
            el('span',{style:{color:'var(--text3)'}},'Parcelas pagas após abate: '),
            el('strong',{style:{color:'var(--green)'}},novasPagas+' de '+emp.numParcelas),
            novasPagas>atualPagas?el('span',{style:{color:'var(--green)',marginLeft:'6px'}},'+'+( novasPagas-atualPagas)+' parcela'+(novasPagas-atualPagas!==1?'s':'')+' quitada'+(novasPagas-atualPagas!==1?'s':'')):null,
          ].filter(Boolean)),
          saldoParcial>0?el('div',{},[
            el('span',{style:{color:'var(--text3)'}},'Saldo parcial acumulado: '),
            el('strong',{style:{color:'var(--gold)'}},fmtMoney(saldoParcial)+' para próxima parcela'),
          ]):null,
        ].filter(Boolean)));
      } else {
        previewEl.style.display='none';
      }
    }

    function confirmarAbate(){
      var empId=gab('emprestimo');
      var valor=parseFloat(gab('valor'))||0;
      var formaPgto=gab('formaPgto')||'stone';
      var bancoId=gab('banco');
      var data=gab('data')||today();
      var notas=(gab('notas')||'').trim();

      if(!empId){showToast('Selecione um empréstimo','error');return;}
      if(valor<=0){showToast('Informe o valor a abater','error');return;}
      if(!bancoId){showToast('Selecione o banco de origem','error');return;}

      var emp=todosEmprestimos.find(function(x){return x.id===empId;});
      if(!emp){showToast('Empréstimo não encontrado','error');return;}

      var banco=(state.bancos||[]).find(function(b){return b.id===bancoId;});
      var formaLabel=(FORMAS_ABATE.find(function(f){return f.key===formaPgto;})||{}).label||formaPgto;
      var bancoNome=banco?banco.nome:'';

      // 1. Atualiza empréstimo — adiciona ao array de pagamentos
      var novoPgto={
        id:'abate_'+Date.now(),
        data:data,
        valor:valor,
        formaPgto:formaPgto,
        formaLabel:formaLabel,
        banco:bancoId,
        bancoNome:bancoNome,
        notas:notas,
      };
      var novoEmp=Object.assign({},emp,{
        pagamentos:(emp.pagamentos||[]).concat([novoPgto]),
      });
      // Recalcula parcelasPagas com base no total acumulado
      novoEmp.parcelasPagas=calcParcelasPagas(novoEmp);

      var novasEmprestimos=todosEmprestimos.map(function(x){return x.id===novoEmp.id?novoEmp:x;});

      // 2. Cria despesa paga em contas (integração com DRE e fluxo de caixa)
      var novaConta={
        id:'pgto_emp_'+Date.now(),
        descricao:'Pgto. Empréstimo — '+emp.descricao,
        valor:valor,
        vencimento:data,
        categoria:'Empréstimos',
        status:'pago',
        tipo:'pagar',
        profile:state.profile,
        recorrente:false,
        banco:bancoId,
        notas:(notas||formaLabel+' — '+emp.descricao),
        prioridade:'normal',
        emprestimo_id:emp.id,
      };
      var novasContas=(state.contas||[]).concat([novaConta]);

      // 3. Débita do banco
      var novosBancos=state.bancos.map(function(b){
        return b.id===bancoId?Object.assign({},b,{saldo:(b.saldo||0)-valor}):b;
      });

      // 4. Salva tudo de uma vez
      lsSet('emprestimos',novasEmprestimos);
      lsSet('contas',novasContas);
      lsSet('bancos',novosBancos);
      setState({
        emprestimos:novasEmprestimos,
        contas:novasContas,
        bancos:novosBancos,
        abaterModal:null,
      });
      scheduleSave();
      showToast('Pagamento de '+fmtMoney(valor)+' registrado!');
    }

    // Opções de empréstimos ativos
    var empOptions=[el('option',{value:''},'— Selecione o empréstimo —')];
    ativos.forEach(function(e){
      var pagas=calcParcelasPagas(e);
      var opt=el('option',{value:e.id},e.descricao+' ('+pagas+'/'+e.numParcelas+' pagas · '+fmtMoney(e.valorParcela)+'/mês)');
      if(abm.emprestimoId===e.id)opt.selected=true;
      empOptions.push(opt);
    });
    var empSel=el('select',{class:'form-input',id:'ab-emprestimo',onchange:refreshAbatePreview},empOptions);

    // Opções de banco
    var bancoOptions=[el('option',{value:''},'— Selecione o banco —')];
    (state.bancos||[]).forEach(function(b){
      var opt=el('option',{value:b.id},b.nome+' ('+fmtMoney(b.saldo||0)+')');
      bancoOptions.push(opt);
    });
    var bancoSel=el('select',{class:'form-input',id:'ab-banco',onchange:refreshAbatePreview},bancoOptions);

    // Forma de pagamento
    var formaOptions=FORMAS_ABATE.map(function(f){return el('option',{value:f.key},f.label);});
    var formaSel=el('select',{class:'form-input',id:'ab-formaPgto'},formaOptions);

    var valorInp=el('input',{class:'form-input',id:'ab-valor',type:'number',min:'0.01',step:'0.01',placeholder:'0,00',oninput:refreshAbatePreview});
    var dataInp=el('input',{class:'form-input',id:'ab-data',type:'date'});
    dataInp.value=today();
    var notasInp=el('input',{class:'form-input',id:'ab-notas',type:'text',placeholder:'Ex: Retenção Stone dia 15, Pix manual...',maxlength:'80'});

    var saldoPreview=el('div',{id:'ab-saldo-preview',style:{display:'none',padding:'8px 12px',background:'var(--bg3)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',marginTop:'6px'}});
    var abatePreview=el('div',{id:'ab-preview',style:{display:'none',padding:'10px 14px',background:'rgba(76,175,130,.07)',borderRadius:'var(--radius-sm)',border:'1px solid rgba(76,175,130,.2)',marginTop:'10px'}});

    var mEl=div('modal',[
      div('modal-title',[
        el('span',{},'💰 Abater pagamento'),
        el('button',{class:'modal-close',onclick:function(){setState({abaterModal:null});}},'×'),
      ]),
      el('p',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'16px',lineHeight:'1.6'}},'Registre um pagamento ou retenção automática. O saldo do banco será debitado e a despesa lançada no sistema.'),

      div('form-group',[
        el('label',{class:'form-label'},'Empréstimo'),
        empSel,
        ativos.length===0?el('p',{style:{fontSize:'11px',color:'var(--gold)',marginTop:'4px'}},'⚠ Nenhum empréstimo ativo no perfil atual.'):null,
      ].filter(Boolean)),

      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Valor abatido (R$)'),valorInp]),
        div('form-group',[el('label',{class:'form-label'},'Data do pagamento'),dataInp]),
      ]),

      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
        div('form-group',[el('label',{class:'form-label'},'Forma de pagamento'),formaSel]),
        div('form-group',[
          el('label',{class:'form-label'},'Banco de origem'),
          bancoSel,
          saldoPreview,
        ]),
      ]),

      div('form-group',[el('label',{class:'form-label'},'Observações (opcional)'),notasInp]),

      abatePreview,

      div('modal-actions',[
        btn('btn-ghost','Cancelar',function(){setState({abaterModal:null});}),
        btn('btn-primary','💰 Confirmar abate',confirmarAbate),
      ]),
    ]);
    mEl.style.maxWidth='540px';
    var ov=div('modal-overlay',[mEl]);
    ov.onclick=function(e){if(e.target===ov)setState({abaterModal:null});};
    setTimeout(function(){
      if(abm.emprestimoId){var s=document.getElementById('ab-emprestimo');if(s)s.value=abm.emprestimoId;}
      refreshAbatePreview();
    },50);
    return ov;
  }

  // ── MODAL CRIAR / EDITAR ─────────────────────────────────────────────────
  if(state.emprestimoModal){
    var modal=state.emprestimoModal;
    var isEdit=!!modal.editItem;
    var ed=modal.editItem||{};

    function gv(id){var e=document.getElementById('emp-'+id);return e?e.value:'';}

    function recalcular(){
      var vc=parseFloat(document.getElementById('emp-valorContratado').value)||0;
      var np=parseInt(document.getElementById('emp-numParcelas').value)||0;
      var vtf=parseFloat(document.getElementById('emp-valorTotalFinal').value)||0;
      var vpEl=document.getElementById('emp-valorParcela');
      var previewEl=document.getElementById('emp-juros-preview');
      if(vtf>0&&np>0){if(vpEl)vpEl.value=(vtf/np).toFixed(2);}
      else if(vc>0&&np>0){if(vpEl&&!vpEl.dataset.manual)vpEl.value=(vc/np).toFixed(2);}
      if(previewEl){
        if(vtf>vc&&vc>0&&np>0){
          var s=empSaude(vc,vtf,np);
          var juros=vtf-vc;
          previewEl.innerHTML='';previewEl.style.display='flex';
          previewEl.appendChild(el('div',{style:{display:'flex',gap:'16px',flexWrap:'wrap',alignItems:'center',fontSize:'12px'}},[
            el('span',{style:{color:'var(--text3)'}},'Juros: '),
            el('span',{style:{fontWeight:'700',color:'var(--red)'}},fmtMoney(juros)+' ('+s.taxaTotal+'% total)'),
            el('span',{style:{color:'var(--text3)'}},'Taxa mensal ≈ '),
            el('span',{style:{fontWeight:'700',color:s.color}},s.taxaMes+'%/mês'),
            el('span',{style:{fontWeight:'700',padding:'2px 10px',borderRadius:'10px',background:'var(--bg4)',color:s.color}},s.icon+' '+s.label),
          ]));
        } else {previewEl.style.display='none';}
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
      if(!valorParcela)valorParcela=valorTotalFinal>0?(valorTotalFinal/numParcelas):(valorContratado/numParcelas);
      var parcelasPagas=Math.min(parseInt(gv('parcelasPagas'))||0,numParcelas);
      var dataInicio=gv('dataInicio')||today();
      var banco=(gv('banco')||'').trim();
      var notas=(gv('notas')||'').trim();
      var item={
        id:isEdit?ed.id:('emp_'+Date.now()),
        descricao:descricao,valorContratado:valorContratado,
        valorTotalFinal:valorTotalFinal||0,numParcelas:numParcelas,
        valorParcela:valorParcela,parcelasPagas:parcelasPagas,
        pagamentos:isEdit?(ed.pagamentos||[]):[],
        dataInicio:dataInicio,banco:banco,notas:notas,profile:state.profile,
      };
      var arr=isEdit
        ?(state.emprestimos||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.emprestimos||[]).concat([item]);
      lsSet('emprestimos',arr);setState({emprestimos:arr,emprestimoModal:null});
      scheduleSave();showToast(isEdit?'Empréstimo atualizado!':'Empréstimo cadastrado!');
    }

    function fld(labelTxt,inputEl,hint){
      return div('form-group',[el('label',{class:'form-label'},labelTxt),inputEl,
        hint?el('p',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},hint):null].filter(Boolean));
    }

    var vcInp=el('input',{class:'form-input',id:'emp-valorContratado',type:'number',min:'0',step:'0.01',placeholder:'0,00',oninput:recalcular});vcInp.value=ed.valorContratado?String(ed.valorContratado):'';
    var npInp=el('input',{class:'form-input',id:'emp-numParcelas',type:'number',min:'1',step:'1',placeholder:'12',oninput:recalcular});npInp.value=ed.numParcelas?String(ed.numParcelas):'';
    var vtfInp=el('input',{class:'form-input',id:'emp-valorTotalFinal',type:'number',min:'0',step:'0.01',placeholder:'0,00 (opcional)',oninput:recalcular});vtfInp.value=ed.valorTotalFinal?String(ed.valorTotalFinal):'';
    var jurosPreview=el('div',{id:'emp-juros-preview',style:{display:'none',padding:'8px 12px',background:'var(--bg3)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',marginTop:'4px',gap:'8px',flexWrap:'wrap'}});
    var vpInp=el('input',{class:'form-input',id:'emp-valorParcela',type:'number',min:'0',step:'0.01',placeholder:'0,00',oninput:function(){this.dataset.manual='1';}});vpInp.value=ed.valorParcela?String(ed.valorParcela):'';
    var ppInp=el('input',{class:'form-input',id:'emp-parcelasPagas',type:'number',min:'0',step:'1',placeholder:'0'});ppInp.value=ed.parcelasPagas?String(ed.parcelasPagas):'0';
    var descInp=el('input',{class:'form-input',id:'emp-descricao',type:'text',placeholder:'Ex: Empréstimo Itaú, Financiamento Carro...',maxlength:'60'});descInp.value=ed.descricao||'';
    var bancoInp=el('input',{class:'form-input',id:'emp-banco',type:'text',placeholder:'Ex: Itaú, Nubank, Bradesco...',maxlength:'40'});bancoInp.value=ed.banco||'';
    var dtInp=el('input',{class:'form-input',id:'emp-dataInicio',type:'date'});dtInp.value=ed.dataInicio||today();
    var notasInp=el('textarea',{class:'form-input',id:'emp-notas',rows:'2',placeholder:'Observações, condições, taxas...',style:{resize:'vertical'}});notasInp.value=ed.notas||'';

    var mEl2=div('modal',[
      div('modal-title',[el('span',{},(isEdit?'Editar':'Novo')+' empréstimo'),el('button',{class:'modal-close',onclick:function(){setState({emprestimoModal:null});}},'×')]),
      fld('Descrição / Nome',descInp),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[fld('Valor contratado (R$)',vcInp,'Valor liberado pelo banco'),fld('Número de parcelas',npInp)]),
      div('form-group',[el('label',{class:'form-label'},'Valor total a pagar — com juros (R$)'),vtfInp,jurosPreview,el('p',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},'Total pago ao final do contrato. Avalia a saúde do empréstimo.')]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[fld('Valor da parcela (R$)',vpInp,'Recalculado automaticamente'),fld('Parcelas já pagas',ppInp)]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[fld('Data de início',dtInp),fld('Banco / Credor',bancoInp)]),
      fld('Observações',notasInp),
      div('modal-actions',[btn('btn-ghost','Cancelar',function(){setState({emprestimoModal:null});}),btn('btn-primary',isEdit?'💾 Salvar':'➕ Cadastrar',save)]),
    ]);
    mEl2.style.maxWidth='520px';
    var ov2=div('modal-overlay',[mEl2]);
    ov2.onclick=function(e){if(e.target===ov2)setState({emprestimoModal:null});};
    setTimeout(function(){var i=document.getElementById('emp-descricao');if(i)i.focus();recalcular();},50);
    return ov2;
  }

  // ── CÁLCULOS TOTAIS ─────────────────────────────────────────────────────
  var totContratado=0,totPago=0,totRestante=0,totJuros=0,qtdAtivos=0,qtdQuitados=0;
  emprestimos.forEach(function(e){
    var pagas=calcParcelasPagas(e);
    var pago=pagas*(e.valorParcela||0);
    var restante=((e.numParcelas||0)-pagas)*(e.valorParcela||0);
    totContratado+=e.valorContratado||0;
    totPago+=pago;
    totRestante+=restante;
    if(e.valorTotalFinal&&e.valorTotalFinal>e.valorContratado)totJuros+=(e.valorTotalFinal-e.valorContratado);
    if(pagas>=(e.numParcelas||1))qtdQuitados++;else qtdAtivos++;
  });

  // ── KPIS ────────────────────────────────────────────────────────────────
  var kpiCols=totJuros>0?5:4;
  var kpis=el('div',{style:{display:'grid',gridTemplateColumns:'repeat('+kpiCols+',1fr)',gap:'12px',marginBottom:'20px'}},[
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Total contratado'),el('div',{class:'kpi-value'},fmtMoney(totContratado)),el('div',{class:'kpi-sub'},emprestimos.length+' empréstimo'+(emprestimos.length!==1?'s':''))]),
    el('div',{class:'kpi-card green'},[el('div',{class:'kpi-label'},'Total pago'),el('div',{class:'kpi-value green'},fmtMoney(totPago)),el('div',{class:'kpi-sub'},'Amortizado')]),
    el('div',{class:'kpi-card red'},[el('div',{class:'kpi-label'},'Saldo devedor'),el('div',{class:'kpi-value red'},fmtMoney(totRestante)),el('div',{class:'kpi-sub'},'Parcelas restantes')]),
    totJuros>0?el('div',{class:'kpi-card',style:{borderColor:'rgba(224,82,82,.3)'}},[el('div',{class:'kpi-label'},'Total em juros'),el('div',{class:'kpi-value',style:{color:'#e07832'}},fmtMoney(totJuros)),el('div',{class:'kpi-sub'},'Custo do crédito')]):null,
    el('div',{class:'kpi-card'},[el('div',{class:'kpi-label'},'Situação'),el('div',{class:'kpi-value',style:{fontSize:'18px'}},qtdAtivos+' ativo'+(qtdAtivos!==1?'s':'')),el('div',{class:'kpi-sub'},qtdQuitados+' quitado'+(qtdQuitados!==1?'s':''))]),
  ].filter(Boolean));

  // ── CARTÃO DE EMPRÉSTIMO ─────────────────────────────────────────────────
  function empCard(e){
    var pagas=calcParcelasPagas(e);
    var total=e.numParcelas||1;
    var restantes=total-pagas;
    var pctPago=Math.min(100,Math.round((pagas/total)*100));
    var pctRest=100-pctPago;
    var vlPago=pagas*(e.valorParcela||0);
    var vlRest=restantes*(e.valorParcela||0);
    var quitado=pagas>=total;
    var saude=e.valorTotalFinal&&e.valorTotalFinal>e.valorContratado?empSaude(e.valorContratado,e.valorTotalFinal,total):null;
    var juros=e.valorTotalFinal&&e.valorTotalFinal>e.valorContratado?(e.valorTotalFinal-e.valorContratado):0;
    var pagamentos=e.pagamentos||[];
    var saldoParcial=totalAbatido(e)-(pagas*(e.valorParcela||0));

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

    // Saldo parcial acumulado (retenções parciais que ainda não quitaram uma parcela inteira)
    var saldoParcialBanner=saldoParcial>0&&!quitado?el('div',{style:{
      fontSize:'11px',color:'var(--gold)',background:'var(--gold-dim)',border:'1px solid var(--gold)',
      borderRadius:'var(--radius-sm)',padding:'5px 10px',marginBottom:'10px',
    }},'💛 Saldo parcial acumulado: '+fmtMoney(saldoParcial)+' — faltam '+fmtMoney((e.valorParcela||0)-saldoParcial)+' para quitar mais uma parcela'):null;

    // Previsão de término
    var dtPrev='';
    if(!quitado&&e.dataInicio&&restantes>0){
      var dt=new Date(e.dataInicio+'T12:00:00');dt.setMonth(dt.getMonth()+total);
      var MF=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      dtPrev=MF[dt.getMonth()]+'/'+dt.getFullYear();
    }

    var badgeColor=quitado?'var(--green)':pctPago>=75?'#e07832':pctPago>=50?'var(--gold)':'var(--red)';
    var badgeLabel=quitado?'✅ Quitado':pctPago>=75?'⚡ Quase lá':pctPago>=50?'📈 Metade':'🔴 Início';

    // Bloco saúde do empréstimo
    var saudeBlock=saude&&!quitado?el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'12px',padding:'12px',background:'var(--bg3)',borderRadius:'var(--radius-sm)',border:'1px solid var(--border)'}},[
      el('div',{},[el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'}},'Juros totais'),el('div',{style:{fontSize:'14px',fontWeight:'700',color:'#e07832'}},fmtMoney(juros)),el('div',{style:{fontSize:'11px',color:'var(--text3)'}},saude.taxaTotal+'% sobre o capital')]),
      el('div',{},[el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'}},'Taxa mensal ≈'),el('div',{style:{fontSize:'14px',fontWeight:'700',color:saude.color}},saude.taxaMes+'% a.m.'),el('div',{style:{fontSize:'11px',color:'var(--text3)'}},'Custo efetivo')]),
      el('div',{},[el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'3px'}},'Saúde financeira'),el('div',{style:{fontSize:'14px',fontWeight:'700',color:saude.color}},saude.icon+' '+saude.label),el('div',{style:{fontSize:'11px',color:'var(--text3)'}},saude.taxaMes<1.5?'Taxa competitiva':saude.taxaMes<3?'Dentro da média':saude.taxaMes<5?'Acima da média':'Rever condições')]),
    ]):null;

    // Valores
    var valoresGrid=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'12px'}},[
      el('div',{style:{background:'var(--bg3)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}},[el('div',{style:{fontSize:'10px',color:'var(--text3)',fontWeight:'700',textTransform:'uppercase',marginBottom:'4px'}},'Contratado'),el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--text)'}},fmtMoney(e.valorContratado||0)),el('div',{style:{fontSize:'11px',color:'var(--text3)'}},fmtMoney(e.valorParcela||0)+'/mês')]),
      el('div',{style:{background:'rgba(76,175,130,.08)',border:'1px solid rgba(76,175,130,.2)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}},[el('div',{style:{fontSize:'10px',color:'var(--green)',fontWeight:'700',textTransform:'uppercase',marginBottom:'4px'}},'Total pago'),el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--green)'}},fmtMoney(vlPago)),el('div',{style:{fontSize:'11px',color:'var(--text3)'}},pagas+' parcela'+(pagas!==1?'s':'')+' pagas')]),
      el('div',{style:{background:'rgba(224,82,82,.08)',border:'1px solid rgba(224,82,82,.2)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}},[el('div',{style:{fontSize:'10px',color:'var(--red)',fontWeight:'700',textTransform:'uppercase',marginBottom:'4px'}},'Saldo devedor'),el('div',{style:{fontSize:'15px',fontWeight:'700',color:'var(--red)'}},fmtMoney(vlRest)),el('div',{style:{fontSize:'11px',color:'var(--text3)'}},restantes+' parcela'+(restantes!==1?'s':'')+' restantes')]),
    ]);

    // Últimos pagamentos registrados
    var ultimosPgtos=pagamentos.length>0?el('div',{style:{borderTop:'1px solid var(--border)',paddingTop:'10px',marginTop:'0'}},[
      el('div',{style:{fontSize:'11px',fontWeight:'700',color:'var(--text3)',textTransform:'uppercase',marginBottom:'6px'}},'Pagamentos registrados ('+pagamentos.length+')'),
      ...pagamentos.slice(-3).reverse().map(function(p){
        return el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'12px',padding:'4px 0',borderBottom:'1px solid var(--border)'}},[
          el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[
            el('span',{style:{color:'var(--text3)'}},(p.formaLabel||p.formaPgto||'—')),
            p.bancoNome?el('span',{style:{color:'var(--text3)','font-size':'10px'}},'· '+p.bancoNome):null,
            p.notas?el('span',{style:{color:'var(--text3)',fontSize:'10px',fontStyle:'italic'}},'· '+p.notas):null,
          ].filter(Boolean)),
          el('div',{style:{display:'flex',gap:'12px',alignItems:'center'}},[
            el('span',{style:{color:'var(--text3)',fontSize:'11px'}},fmtDate(p.data||'')),
            el('span',{style:{fontWeight:'700',color:'var(--green)'}},'-'+fmtMoney(p.valor||0)),
          ]),
        ]);
      }),
      pagamentos.length>3?el('div',{style:{fontSize:'11px',color:'var(--text3)',textAlign:'center',paddingTop:'4px'}},'+' +(pagamentos.length-3)+' pagamentos anteriores'):null,
    ].filter(Boolean)):null;

    var card=div('card',[
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
        el('div',{style:{display:'flex',gap:'6px',flexShrink:'0',flexWrap:'wrap',justifyContent:'flex-end'}},[
          !quitado?el('button',{class:'btn-primary',style:{fontSize:'11px',padding:'5px 12px'},title:'Registrar pagamento / retenção Stone',onclick:function(){setState({abaterModal:{emprestimoId:e.id}});}}, '💰 Abater'):null,
          el('button',{class:'btn-icon edit',title:'Editar',onclick:function(){setState({emprestimoModal:{editItem:e}});}},'✏️'),
          el('button',{class:'btn-icon delete',title:'Excluir',onclick:function(){
            if(window.confirm('Excluir "'+e.descricao+'"?\nIsto também removerá todo o histórico de pagamentos.')){
              var arr=(state.emprestimos||[]).filter(function(x){return x.id!==e.id;});
              lsSet('emprestimos',arr);setState({emprestimos:arr});scheduleSave();showToast('Empréstimo removido','error');
            }
          }},'🗑'),
        ].filter(Boolean)),
      ]),
      barWrap,barLabels,
      saldoParcialBanner,
      saudeBlock,
      valoresGrid,
      ultimosPgtos,
      e.notas&&!ultimosPgtos?el('div',{style:{fontSize:'12px',color:'var(--text3)',fontStyle:'italic',borderTop:'1px solid var(--border)',paddingTop:'10px'}},'📝 '+e.notas):null,
    ].filter(Boolean));

    if(quitado)card.style.opacity='0.75';
    return card;
  }

  var ativosCards=emprestimos.filter(function(e){return calcParcelasPagas(e)<(e.numParcelas||1);});
  var quitadosCards=emprestimos.filter(function(e){return calcParcelasPagas(e)>=(e.numParcelas||1);});

  var emptyState=div('card',[
    div('empty',[
      div('empty-icon','💳'),
      div('empty-title','Nenhum empréstimo cadastrado'),
      el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Cadastre seus empréstimos para acompanhar o progresso e a saúde financeira.'),
      btn('btn-primary','➕ Cadastrar empréstimo',function(){setState({emprestimoModal:{}});}),
    ]),
  ]);

  return div('',[
    div('page-header',[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},[
        el('div',{},[el('h1',{},'💳 Empréstimos'),el('p',{},'Acompanhe seus empréstimos e avalie a saúde financeira')]),
        emprestimos.length>0?el('div',{style:{display:'flex',gap:'10px'}},[
          btn('btn-primary','💰 Abater pagamento',function(){setState({abaterModal:{}});}),
          btn('btn-ghost','➕ Novo empréstimo',function(){setState({emprestimoModal:{}});}),
        ]):null,
      ].filter(Boolean)),
    ]),
    emprestimos.length>0?kpis:null,
    emprestimos.length===0?emptyState
      :el('div',{style:{display:'flex',flexDirection:'column',gap:'16px'}},[
          ativosCards.length>0?el('div',{},[
            el('div',{style:{fontSize:'12px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'10px',paddingLeft:'2px'}},'Em aberto ('+ativosCards.length+')'),
            ...ativosCards.map(empCard),
          ]):null,
          quitadosCards.length>0?el('div',{},[
            el('div',{style:{fontSize:'12px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.5px',color:'var(--text3)',marginBottom:'10px',paddingLeft:'2px',marginTop:ativosCards.length?'8px':'0'}},'Quitados ('+quitadosCards.length+')'),
            ...quitadosCards.map(empCard),
          ]):null,
        ].filter(Boolean)),
  ].filter(Boolean));
}
