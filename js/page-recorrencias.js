// ── RECORRÊNCIAS ─────────────────────────────────────────────────────────────

var RECORR_TIPOS=[
  {id:'mensal',   label:'Mensal'},
  {id:'semanal',  label:'Semanal'},
  {id:'quinzenal',label:'Quinzenal'},
  {id:'bimestral',label:'Bimestral'},
  {id:'trimestral',label:'Trimestral'},
  {id:'anual',    label:'Anual'},
];

function renderRecorrencias(){
  var pf=state.profile;
  // Recorrências são contas com recorrente:true e sem gerado_de (são os templates)
  var templates=state.contas.filter(function(c){return c.profile===pf&&c.recorrente&&!c.gerado_de;});
  var pagar=templates.filter(function(c){return c.tipo==='pagar';});
  var receber=templates.filter(function(c){return c.tipo==='receber';});
  var mMensal=templates.filter(function(c){return c.recorrencia_tipo==='mensal';})
    .reduce(function(a,c){return a+(c.tipo==='pagar'?-c.valor:c.valor);},0);

  // KPIs
  var kpis=el('div',{class:'kpi-grid',style:{gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))'}},[
    kpiCard('red','Despesas fixas',fmtMoney(pagar.reduce(function(a,c){return a+c.valor;},0)),'red',pagar.length+' ativas'),
    kpiCard('green','Receitas fixas',fmtMoney(receber.reduce(function(a,c){return a+c.valor;},0)),'green',receber.length+' ativas'),
    kpiCard(mMensal>=0?'gold':'red','Impacto mensal',fmtMoney(Math.abs(mMensal)),mMensal>=0?'green':'red',mMensal>=0?'Saldo positivo':'Saldo negativo'),
  ]);

  function kpiCard(cls,label,value,valueCls,sub){
    return el('div',{class:'kpi-card '+cls},[
      el('div',{class:'kpi-label'},label),
      el('div',{class:'kpi-value '+(valueCls||'')},value),
      el('div',{class:'kpi-sub'},sub),
    ]);
  }

  function tipoLabel(t){
    var found=RECORR_TIPOS.find(function(x){return x.id===t;});
    return found?found.label:t||'Mensal';
  }

  function recorrCard(c){
    var geradas=state.contas.filter(function(x){return x.gerado_de===c.id;});
    var pendentes=geradas.filter(function(x){return x.status==='pendente';}).length;
    var pagas=geradas.filter(function(x){return x.status==='pago'||x.status==='recebido';}).length;
    var corTipo=c.tipo==='pagar'?'var(--red)':'var(--green)';
    var iconeTipo=c.tipo==='pagar'?'💸':'💵';
    return el('div',{class:'card',style:{padding:'14px',display:'flex',flexDirection:'column',gap:'10px'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}},[
        el('div',{style:{display:'flex',alignItems:'center',gap:'10px'}},[
          el('div',{style:{width:'40px',height:'40px',borderRadius:'10px',background:corTipo.replace(')',',0.12)').replace('var(--','rgba(var(--'),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:'0'}},iconeTipo),
          el('div',{},[
            el('div',{style:{fontWeight:'700',fontSize:'14px',color:'var(--text)'}},c.descricao),
            el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},c.categoria+' · '+tipoLabel(c.recorrencia_tipo)),
          ]),
        ]),
        el('div',{style:{textAlign:'right'}},[
          el('div',{style:{fontSize:'16px',fontWeight:'800',color:corTipo}},(c.tipo==='pagar'?'- ':'')+fmtMoney(c.valor)),
          el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}},'Venc. dia '+new Date(c.vencimento+'T12:00:00').getDate()),
        ]),
      ]),
      el('div',{style:{display:'flex',gap:'8px'}},[
        el('span',{style:{fontSize:'11px',color:'var(--text3)',background:'var(--bg3)',padding:'3px 8px',borderRadius:'20px'}},
          '🔄 '+tipoLabel(c.recorrencia_tipo)),
        el('span',{style:{fontSize:'11px',color:'var(--text3)',background:'var(--bg3)',padding:'3px 8px',borderRadius:'20px'}},
          '✅ '+pagas+' pagas · ⏳ '+pendentes+' pendentes'),
      ]),
      el('div',{style:{display:'flex',gap:'6px'}},[
        el('button',{class:'btn-ghost',style:{flex:'1',fontSize:'12px',padding:'6px'},onclick:function(){
          setState({recorrModal:JSON.parse(JSON.stringify(c))});
        }},'✏️ Editar'),
        el('button',{class:'btn-ghost',style:{fontSize:'12px',padding:'6px',color:'var(--danger)'},onclick:function(){
          if(!confirm('Excluir "'+c.descricao+'"?\nIsto removerá o template. Parcelas já geradas são mantidas.'))return;
          logAudit('excluiu recorrência',c.descricao+' ('+fmtMoney(c.valor)+')');
          var nc=state.contas.filter(function(x){return x.id!==c.id;});
          setState({contas:nc});scheduleSave();showToast('Recorrência removida','error');
        }},'🗑️'),
      ]),
    ]);
  }

  // Modal criar / editar
  function renderRecorrModal(){
    var r=state.recorrModal||{};
    var isEdit=!!r.id;

    function field(label,el2){return el('div',{class:'form-group'},[el('label',{class:'form-label'},label),el2]);}

    var descInp=el('input',{class:'form-input',value:r.descricao||'',placeholder:'Ex: Aluguel, Netflix...',oninput:function(){r.descricao=this.value;}});
    var valorInp=el('input',{class:'form-input',value:r.valor||'',type:'number',min:'0',step:'0.01',placeholder:'0,00',oninput:function(){r.valor=parseFloat(this.value)||0;}});
    var catInp=el('input',{class:'form-input',value:r.categoria||'',placeholder:'Ex: Moradia, Assinatura...',oninput:function(){r.categoria=this.value;}});
    var tipoSel=el('select',{class:'form-input',onchange:function(){r.tipo=this.value;}},
      [{v:'pagar',l:'💸 Despesa (a pagar)'},{v:'receber',l:'💵 Receita (a receber)'}]
      .map(function(x){return el('option',{value:x.v,selected:r.tipo===x.v},x.l);}));
    var recTipoSel=el('select',{class:'form-input',onchange:function(){r.recorrencia_tipo=this.value;}},
      RECORR_TIPOS.map(function(x){return el('option',{value:x.id,selected:(r.recorrencia_tipo||'mensal')===x.id},x.label);}));
    var diaInp=el('input',{class:'form-input',type:'date',value:r.vencimento||today(),oninput:function(){r.vencimento=this.value;}});
    var errEl=el('div',{style:{color:'var(--danger)',fontSize:'12px',minHeight:'16px'}});

    function salvar(){
      if(!(r.descricao||'').trim()){_fldErr(descInp,'Descrição é obrigatória');showToast('Preencha os campos em vermelho','error');return;}
      if(!r.valor||r.valor<=0){_fldErr(valorInp,'Informe um valor válido');showToast('Preencha os campos em vermelho','error');return;}
      logAudit((isEdit?'editou':'criou')+' recorrência',r.descricao+' '+fmtMoney(r.valor));
      var novaRec=Object.assign({},r,{
        id:r.id||uid(),
        recorrente:true,
        profile:pf,
        status:r.tipo==='pagar'?'pendente':'previsto',
        recorrencia_tipo:r.recorrencia_tipo||'mensal',
        recorrencia_intervalo:1,
      });
      var nc=isEdit?state.contas.map(function(x){return x.id===r.id?novaRec:x;}):state.contas.concat([novaRec]);
      setState({contas:nc,recorrModal:null});
      scheduleSave();
      showToast(isEdit?'Recorrência atualizada!':'Recorrência criada!','success');
      setTimeout(runRecorrencia,500);
    }

    return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({recorrModal:null});}},
      el('div',{class:'modal',style:{maxWidth:'440px'}},[
        el('div',{class:'modal-header'},[
          el('h3',{class:'modal-title'},(isEdit?'✏️ Editar':'➕ Nova')+' Recorrência'),
          el('button',{class:'modal-close',onclick:function(){setState({recorrModal:null});}}, '✕'),
        ]),
        el('div',{class:'modal-body'},[
          el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
            field('Descrição',descInp),
            field('Valor (R$)',valorInp),
            field('Tipo',tipoSel),
            field('Frequência',recTipoSel),
            field('Categoria',catInp),
            field('Primeiro vencimento',diaInp),
          ]),
          errEl,
        ]),
        el('div',{class:'modal-footer'},[
          btn('btn-secondary','Cancelar',function(){setState({recorrModal:null});}),
          btn('btn-primary',isEdit?'💾 Salvar':'✅ Criar',salvar),
        ]),
      ])
    );
  }

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'🔄 Recorrências'),
        el('p',{class:'page-sub'},'Gerencie despesas e receitas fixas — são geradas automaticamente todo mês'),
      ]),
      el('div',{style:{display:'flex',gap:'8px'}},[
        btn('btn-secondary','▶ Gerar agora',function(){runRecorrencia();showToast('Verificando recorrências...','info');}),
        btn('btn-primary','+ Nova Recorrência',function(){setState({recorrModal:{tipo:'pagar',recorrencia_tipo:'mensal'}});}),
      ]),
    ]),
    kpis,
    templates.length===0
      ?el('div',{class:'card'},[
          el('div',{class:'empty'},[
            el('div',{class:'empty-icon'},'🔄'),
            el('div',{class:'empty-title'},'Nenhuma recorrência'),
            el('p',{style:{fontSize:'12px',color:'var(--text3)'}},'Crie recorrências para gerar lançamentos automáticos todo mês'),
          ]),
        ])
      :el('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'14px'}},templates.map(recorrCard)),
    state.recorrModal?renderRecorrModal():null,
  ].filter(Boolean));
}
