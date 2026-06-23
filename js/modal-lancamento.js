// ── MODAL LANÇAMENTO ──────────────────────────────────────────────────────────
function renderModal(){
  var m=state.modal; if(!m)return null;
  var tipo=m.tipo,edit=m.editItem||{};
  var catKey=getCatKey(state.profile,tipo); var cats=getCats(catKey);
  var vals={
    descricao:edit.descricao||'',valor:edit.valor||'',categoria:edit.categoria||cats[0],
    vencimento:edit.vencimento||today(),status:edit.status||(tipo==='pagar'?'pendente':'previsto'),
    prioridade:edit.prioridade||'normal',lembrete_custom:edit.lembrete_custom||'',
    recorrente:edit.recorrente||false,recorrencia_tipo:edit.recorrencia_tipo||'mensal',
    recorrencia_intervalo:edit.recorrencia_intervalo||1,recorrencia_fim:edit.recorrencia_fim||'nunca',
    recorrencia_fim_data:edit.recorrencia_fim_data||'',recorrencia_fim_ocorrencias:edit.recorrencia_fim_ocorrencias||12,
    lembrete_antecipado:edit.lembrete_antecipado||0,notas:edit.notas||'',
    formaPgto:edit.formaPgto||'',
    banco:edit.banco||'',
  };

  function g(id){return document.getElementById('mf-'+id)?document.getElementById('mf-'+id).value:vals[id];}
  function getCk(){return document.getElementById('mf-rec')?document.getElementById('mf-rec').checked:vals.recorrente;}
  function getRec(){return{tipo:g('rec-tipo'),intervalo:parseInt(g('rec-intervalo'))||1,fim:g('rec-fim'),fim_data:g('rec-fim-data'),fim_ocorrencias:parseInt(g('rec-fim-oc'))||12,lembrete:parseInt(g('rec-lembrete'))||0};}

  function save(){
    var rec=getCk();
    var d={
      id:edit.id||('conta_'+Date.now()),
      descricao:g('descricao'),valor:parseFloat(g('valor'))||0,
      categoria:g('categoria'),vencimento:g('vencimento'),
      status:g('status'),recorrente:rec,notas:g('notas'),
      tipo:tipo,profile:state.profile,
      formaPgto:g('formaPgto'),
      banco:g('banco'),
    };
    var r=getRec();
    d.recorrencia_tipo=r.tipo;d.recorrencia_intervalo=r.intervalo;d.recorrencia_fim=r.fim;
    d.recorrencia_fim_data=r.fim_data;d.recorrencia_fim_ocorrencias=r.fim_ocorrencias;
    d.lembrete_antecipado=r.lembrete;
    d.lembrete_custom=document.getElementById('mf-lembrete-custom')?document.getElementById('mf-lembrete-custom').value:'';
    d.prioridade=document.getElementById('mf-prior-val')?document.getElementById('mf-prior-val').value:'normal';
    if(!d.descricao||!d.valor){showToast('Preencha descrição e valor','error');return;}

    var novasContas;
    var novosBancos=state.bancos;
    var statusPago=d.status==='pago'||d.status==='recebido';

    if(edit.id){
      // Se estava pago+banco antes, reverte o saldo antigo
      var old=state.contas.find(function(x){return x.id===edit.id;});
      if(old&&(old.status==='pago'||old.status==='recebido')&&old.banco){
        novosBancos=novosBancos.map(function(b){
          return b.id===old.banco
            ?Object.assign({},b,{saldo:Math.round(((b.saldo||0)+(old.valor||0))*100)/100})
            :b;
        });
      }
      novasContas=state.contas.map(function(x){return x.id===d.id?d:x;});
    } else {
      novasContas=(state.contas||[]).concat([d]);
    }

    // Aplica débito/crédito no banco se status pago/recebido e banco informado
    if(statusPago&&d.banco){
      novosBancos=novosBancos.map(function(b){
        if(b.id!==d.banco)return b;
        var delta=tipo==='pagar'?-(d.valor||0):(d.valor||0);
        return Object.assign({},b,{saldo:Math.round(((b.saldo||0)+delta)*100)/100});
      });
    }

    lsSet('contas',novasContas);
    lsSet('bancos',novosBancos);
    setState({contas:novasContas,bancos:novosBancos,modal:null});
    scheduleSave();
    showToast(edit.id?'Atualizado!':'Lançamento adicionado!');
  }

  function inp(id,type,ph,val){var i=el('input',{class:'form-input',type:type||'text',id:'mf-'+id,placeholder:ph||''});i.value=val!==undefined?String(val):'';return i;}
  function sel(id,opts,val){var s=el('select',{class:'form-input',id:'mf-'+id});opts.forEach(function(o){var op=el('option',{value:typeof o==='object'?o.v:o},typeof o==='object'?o.l:o);if((typeof o==='object'?o.v:o)===String(val))op.selected=true;s.appendChild(op);});return s;}

  var ck=el('input',{type:'checkbox',id:'mf-rec',style:{accentColor:'var(--gold)',width:'15px',height:'15px'}});
  ck.checked=vals.recorrente;

  var recFields=el('div',{id:'mf-rec-fields',style:{display:'block',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'14px',marginBottom:'14px'}},[
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Repetição'),sel('rec-tipo',[{v:'diario',l:'Diário'},{v:'semanal',l:'Semanal'},{v:'mensal',l:'Mensal'},{v:'anual',l:'Anual'},{v:'personalizado',l:'Personalizado...'}],vals.recorrencia_tipo)]),
      div('form-group',[el('label',{class:'form-label'},'A cada'),el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[el('input',{class:'form-input',type:'number',id:'mf-rec-intervalo',min:'1',style:{width:'70px'},value:String(vals.recorrencia_intervalo)}),el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'vez(es)')])]),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Terminar repetição'),sel('rec-fim',[{v:'nunca',l:'Nunca'},{v:'data',l:'Em data específica'},{v:'ocorrencias',l:'Após X ocorrências'}],vals.recorrencia_fim)]),
      div('form-group',[el('label',{class:'form-label'},'Data fim / Ocorrências'),el('div',{style:{display:'flex',gap:'6px'}},[el('input',{class:'form-input',type:'date',id:'mf-rec-fim-data',value:vals.recorrencia_fim_data,style:{flex:'1'}}),el('input',{class:'form-input',type:'number',id:'mf-rec-fim-oc',min:'1',value:String(vals.recorrencia_fim_ocorrencias),placeholder:'Qtd',style:{width:'70px'}})])]),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'🔔 Lembrete antecipado'),sel('rec-lembrete',[{v:'0',l:'Nenhum'},{v:'1',l:'1 dia antes'},{v:'3',l:'3 dias antes'},{v:'5',l:'5 dias antes'},{v:'7',l:'7 dias antes'},{v:'15',l:'15 dias antes'},{v:'30',l:'30 dias antes'},{v:'custom',l:'Personalizado...'}],vals.lembrete_antecipado)]),
      div('form-group',[el('label',{class:'form-label'},'Dias personalizados'),el('div',{style:{display:'flex',gap:'6px',alignItems:'center'}},[el('input',{class:'form-input',type:'number',id:'mf-lembrete-custom',min:'1',placeholder:'Ex: 10',style:{flex:'1'},value:vals.lembrete_custom||''}),el('span',{style:{fontSize:'12px',color:'var(--text3)'}},'dias antes')])]),
    ]),
  ]);

  var prioridades=[{v:'baixa',l:'⬇ Baixa',cor:'var(--blue)'},{v:'normal',l:'➡ Normal',cor:'var(--text2)'},{v:'alta',l:'⬆ Alta',cor:'var(--gold)'},{v:'urgente',l:'🔴 Urgente',cor:'var(--red)'}];
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

  // ── Formas de pagamento ───────────────────────────────────────────────────
  var FORMAS_PGTO=[
    {v:'',       l:'— Selecione a forma —'},
    {v:'dinheiro',l:'💵 Dinheiro'},
    {v:'pix',    l:'⚡ Pix'},
    {v:'credito',l:'💳 Cartão de Crédito'},
    {v:'debito', l:'💳 Cartão de Débito'},
    {v:'stone',  l:'🟢 Stone'},
    {v:'boleto', l:'📄 Boleto'},
    {v:'ted',    l:'🏦 TED / DOC'},
    {v:'debito_auto',l:'🔄 Débito Automático'},
    {v:'outros', l:'• Outros'},
  ];

  // ── Bancos disponíveis ───────────────────────────────────────────────────
  var bancoOpts=[{v:'',l:'— Nenhuma conta —'}].concat(
    (state.bancos||[]).map(function(b){
      return{v:b.id,l:b.nome+(b.saldo!=null?' ('+fmtMoney(b.saldo||0)+')':'')};
    })
  );

  // Preview de saldo após débito
  var saldoPreview=el('div',{id:'mf-saldo-preview',style:{fontSize:'11px',marginTop:'5px',display:'none'}});

  function atualizarSaldoPreview(){
    var bancoId=document.getElementById('mf-banco')?document.getElementById('mf-banco').value:'';
    var valor=parseFloat(document.getElementById('mf-valor')?document.getElementById('mf-valor').value:0)||0;
    var status=document.getElementById('mf-status')?document.getElementById('mf-status').value:'';
    var el2=document.getElementById('mf-saldo-preview');
    if(!el2)return;
    var statusPago=status==='pago'||status==='recebido';
    if(bancoId&&valor>0&&statusPago){
      var banco=(state.bancos||[]).find(function(b){return b.id===bancoId;});
      if(banco){
        var delta=tipo==='pagar'?-valor:valor;
        var novo=Math.round(((banco.saldo||0)+delta)*100)/100;
        el2.style.display='block';
        el2.innerHTML='';
        el2.appendChild(el('span',{style:{color:'var(--text3)'}},'Saldo após: '));
        el2.appendChild(el('strong',{style:{color:novo<0?'var(--red)':'var(--green)'}},fmtMoney(novo)));
        if(novo<0)el2.appendChild(el('span',{style:{color:'var(--red)',marginLeft:'6px'}},'⚠️ Ficará negativo'));
      }
    } else {
      el2.style.display='none';
    }
  }

  var bancoSel=el('select',{class:'form-input',id:'mf-banco',onchange:atualizarSaldoPreview});
  bancoOpts.forEach(function(o){
    var op=el('option',{value:o.v},o.l);
    if(o.v===String(vals.banco))op.selected=true;
    bancoSel.appendChild(op);
  });

  var statusSel=sel('status',tipo==='pagar'?['pendente','pago','vencido']:['previsto','recebido'],vals.status);
  statusSel.addEventListener('change',atualizarSaldoPreview);

  var valorInp=inp('valor','number','0,00',vals.valor);
  valorInp.addEventListener('input',atualizarSaldoPreview);

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(edit.id?'Editar':'Novo')+(tipo==='pagar'?' lançamento — Despesas':' lançamento — A receber')),
      el('button',{class:'modal-close',onclick:function(){setState({modal:null});}},'×'),
    ]),
    div('form-group',[el('label',{class:'form-label',for:'mf-descricao'},'Descrição'),inp('descricao','text','Ex: Fornecedor de carnes',vals.descricao)]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label',for:'mf-valor'},'Valor (R$)'),valorInp]),
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
      div('form-group',[el('label',{class:'form-label',for:'mf-status'},'Status'),statusSel]),
    ]),

    // ── Forma de pagamento + Banco ────────────────────────────────────────
    el('div',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'12px 14px',marginBottom:'14px'}},[
      el('div',{style:{fontSize:'11px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'10px'}},tipo==='pagar'?'💳 Pagamento':'🏦 Recebimento'),
      div('form-row',[
        div('form-group',[
          el('label',{class:'form-label'},tipo==='pagar'?'Forma de pagamento':'Forma de recebimento'),
          sel('formaPgto',FORMAS_PGTO,vals.formaPgto),
        ]),
        div('form-group',[
          el('label',{class:'form-label'},tipo==='pagar'?'Conta de origem (banco)':'Conta de destino (banco)'),
          bancoSel,
          saldoPreview,
        ]),
      ]),
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

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({modal:null});};
  setTimeout(atualizarSaldoPreview,50);
  return ov;
}
