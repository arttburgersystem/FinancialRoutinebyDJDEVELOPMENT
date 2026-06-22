// ── MODAL LANÇAMENTO ──────────────────────────────────────────────────────────
function renderModal(){
  var m=state.modal; if(!m)return null;
  var tipo=m.tipo,edit=m.editItem||{};
  var catKey=getCatKey(state.profile,tipo); var cats=getCats(catKey);
  var vals={descricao:edit.descricao||'',valor:edit.valor||'',categoria:edit.categoria||cats[0],vencimento:edit.vencimento||today(),status:edit.status||(tipo==='pagar'?'pendente':'previsto'),prioridade:edit.prioridade||'normal',lembrete_custom:edit.lembrete_custom||'',recorrente:edit.recorrente||false,recorrencia_tipo:edit.recorrencia_tipo||'mensal',recorrencia_intervalo:edit.recorrencia_intervalo||1,recorrencia_fim:edit.recorrencia_fim||'nunca',recorrencia_fim_data:edit.recorrencia_fim_data||'',recorrencia_fim_ocorrencias:edit.recorrencia_fim_ocorrencias||12,lembrete_antecipado:edit.lembrete_antecipado||0,notas:edit.notas||''};
  function g(id){return document.getElementById('mf-'+id)?document.getElementById('mf-'+id).value:vals[id];}
  function getCk(){return document.getElementById('mf-rec')?document.getElementById('mf-rec').checked:vals.recorrente;}
  function getRec(){return{tipo:g('rec-tipo'),intervalo:parseInt(g('rec-intervalo'))||1,fim:g('rec-fim'),fim_data:g('rec-fim-data'),fim_ocorrencias:parseInt(g('rec-fim-oc'))||12,lembrete:parseInt(g('rec-lembrete'))||0};}

  function save(){
    var rec=getCk();
    var d={id:edit.id||Date.now(),descricao:g('descricao'),valor:parseFloat(g('valor'))||0,categoria:g('categoria'),vencimento:g('vencimento'),status:g('status'),recorrente:rec,notas:g('notas'),tipo:tipo,profile:state.profile};
    var r=getRec();d.recorrencia_tipo=r.tipo;d.recorrencia_intervalo=r.intervalo;d.recorrencia_fim=r.fim;d.recorrencia_fim_data=r.fim_data;d.recorrencia_fim_ocorrencias=r.fim_ocorrencias;d.lembrete_antecipado=r.lembrete;d.lembrete_custom=document.getElementById('mf-lembrete-custom')?document.getElementById('mf-lembrete-custom').value:'';d.prioridade=document.getElementById('mf-prior-val')?document.getElementById('mf-prior-val').value:'normal';
    if(!d.descricao||!d.valor)return;
    edit.id?updateConta(d):addConta(d);
  }
  function inp(id,type,ph,val){var i=el('input',{class:'form-input',type:type||'text',id:'mf-'+id,placeholder:ph||''});i.value=val!==undefined?String(val):'';return i;}
  function sel(id,opts,val){var s=el('select',{class:'form-input',id:'mf-'+id});opts.forEach(function(o){var op=el('option',{value:typeof o==='object'?o.v:o},typeof o==='object'?o.l:o);if((typeof o==='object'?o.v:o)===String(val))op.selected=true;s.appendChild(op);});return s;}

  var ck=el('input',{type:'checkbox',id:'mf-rec',style:{accentColor:'var(--gold)',width:'15px',height:'15px'}});
  ck.checked=vals.recorrente;

  var recFields=el('div',{id:'mf-rec-fields',style:{display:'block',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'14px',marginBottom:'14px'}},[
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'Repetição'),
        sel('rec-tipo',[{v:'diario',l:'Diário'},{v:'semanal',l:'Semanal'},{v:'mensal',l:'Mensal'},{v:'anual',l:'Anual'},{v:'personalizado',l:'Personalizado...'}],vals.recorrencia_tipo),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'A cada'),
        el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
          el('input',{class:'form-input',type:'number',id:'mf-rec-intervalo',min:'1',style:{width:'70px'},value:String(vals.recorrencia_intervalo)}),
          el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'vez(es)'),
        ]),
      ]),
    ]),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'Terminar repetição'),
        sel('rec-fim',[{v:'nunca',l:'Nunca'},{v:'data',l:'Em data específica'},{v:'ocorrencias',l:'Após X ocorrências'}],vals.recorrencia_fim),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Data fim / Ocorrências'),
        el('div',{style:{display:'flex',gap:'6px'}},[
          el('input',{class:'form-input',type:'date',id:'mf-rec-fim-data',value:vals.recorrencia_fim_data,style:{flex:'1'}}),
          el('input',{class:'form-input',type:'number',id:'mf-rec-fim-oc',min:'1',value:String(vals.recorrencia_fim_ocorrencias),placeholder:'Qtd',style:{width:'70px'}}),
        ]),
      ]),
    ]),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'🔔 Lembrete antecipado'),
        sel('rec-lembrete',[{v:'0',l:'Nenhum'},{v:'1',l:'1 dia antes'},{v:'3',l:'3 dias antes'},{v:'5',l:'5 dias antes'},{v:'7',l:'7 dias antes'},{v:'15',l:'15 dias antes'},{v:'30',l:'30 dias antes'},{v:'custom',l:'Personalizado...'}],vals.lembrete_antecipado),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Dias personalizados'),
        el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
          el('input',{class:'form-input',type:'number',id:'mf-lembrete-custom',min:'1',placeholder:'Ex: 10',style:{flex:'1'},value:vals.lembrete_custom||''}),
          el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'dias antes'),
        ]),
      ]),
    ]),
  ]);

  var prioridades=[
    {v:'baixa',  l:'⬇ Baixa',   cor:'var(--blue)'},
    {v:'normal', l:'➡ Normal',  cor:'var(--text2)'},
    {v:'alta',   l:'⬆ Alta',    cor:'var(--gold)'},
    {v:'urgente',l:'🔴 Urgente', cor:'var(--red)'},
  ];
  var priorHidden=el('input',{type:'hidden',id:'mf-prior-val',value:vals.prioridade||'normal'});
  var priorBtns=prioridades.map(function(p){
    var isActive=(vals.prioridade||'normal')===p.v;
    var b=el('button',{type:'button',id:'mf-prior-'+p.v,style:{padding:'6px 14px',borderRadius:'20px',border:'1px solid '+(isActive?p.cor:'var(--border)'),background:isActive?p.cor+'22':'transparent',color:isActive?p.cor:'var(--text3)',fontSize:'12px',fontWeight:isActive?'700':'500',cursor:'pointer',transition:'all .15s'}},p.l);
    b.onclick=function(){
      prioridades.forEach(function(px){var b2=document.getElementById('mf-prior-'+px.v);if(b2){b2.style.border='1px solid var(--border)';b2.style.background='transparent';b2.style.color='var(--text3)';b2.style.fontWeight='500';}});
      b.style.border='1px solid '+p.cor;b.style.background=p.cor+'22';b.style.color=p.cor;b.style.fontWeight='700';
      document.getElementById('mf-prior-val').value=p.v;
    };
    return b;
  });

  var modal=div('modal',[
    div('modal-title',[el('span',{},(edit.id?'Editar':'Novo')+(tipo==='pagar'?' lançamento a pagar':' lançamento a receber')),el('button',{class:'modal-close',onclick:function(){setState({modal:null});}}, '×')]),
    div('form-group',[el('label',{class:'form-label',for:'mf-descricao'},'Descrição'),inp('descricao','text','Ex: Fornecedor de carnes',vals.descricao)]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label',for:'mf-valor'},'Valor (R$)'),inp('valor','number','0,00',vals.valor)]),
      div('form-group',[el('label',{class:'form-label',for:'mf-vencimento'},tipo==='pagar'?'Vencimento':'Previsão'),inp('vencimento','date','',vals.vencimento)]),
    ]),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'Categoria'),
        el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[
          sel('categoria',cats,vals.categoria),
          el('button',{type:'button',title:'Gerenciar categorias',style:{padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text3)',cursor:'pointer',flexShrink:'0',fontSize:'14px'},onclick:function(){setState({catManager:{key:catKey,tipo:tipo}});}}, '✏️'),
        ]),
      ]),
      div('form-group',[el('label',{class:'form-label',for:'mf-status'},'Status'),sel('status',tipo==='pagar'?['pendente','pago','vencido']:['previsto','recebido'],vals.status)]),
    ]),
    div('form-group',[
      el('label',{class:'form-label'},'🎯 Prioridade'),
      el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'6px'}},[...priorBtns,priorHidden]),
    ]),
    el('div',{style:{fontSize:'11px',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',margin:'14px 0 10px'}},'🔁 Recorrência'),
    recFields,
    div('form-group',[el('label',{class:'form-label',for:'mf-notas'},'Notas'),el('textarea',{class:'form-input',id:'mf-notas',rows:'2',placeholder:'Observações...',style:{resize:'vertical'}},vals.notas)]),
    div('modal-actions',[btn('btn-ghost','Cancelar',function(){setState({modal:null});}),btn('btn-primary',edit.id?'Salvar':'Adicionar',save)]),
  ]);
  var ov=div('modal-overlay',[modal]);ov.onclick=function(e){if(e.target===ov)setState({modal:null});};return ov;
}
