// ── MODAL TRANSFERÊNCIA ───────────────────────────────────────────────────────
function renderTransfModal(){
  var m=state.transfModal; if(!m)return null;
  var bs=state.bancos.filter(function(b){return b.profile===state.profile;});

  function g(id){var e=document.getElementById('tf-'+id);return e?e.value:'';}

  function save(){
    var deId=g('de');
    var paraId=g('para');
    var valor=parseFloat(g('valor'))||0;
    var desc=g('desc')||'Transferência';
    var data=g('data')||today();

    if(!deId||!paraId||deId===paraId||valor<=0){
      if(valor<=0)_fldErr('tf-valor','Informe o valor da transferência');
      showToast('Preencha os campos corretamente','error');return;
    }

    var bsDe=state.bancos.find(function(b){return b.id===deId;});
    if(bsDe.saldo<valor){
      showToast('Saldo insuficiente em '+bsDe.nome,'error');return;
    }

    var novos=state.bancos.map(function(b){
      if(b.id===deId)  return Object.assign({},b,{saldo:b.saldo-valor});
      if(b.id===paraId)return Object.assign({},b,{saldo:b.saldo+valor});
      return b;
    });

    var transf={
      id:Date.now(),
      de:deId,
      para:paraId,
      valor:valor,
      desc:desc,
      data:data,
      profile:state.profile,
    };
    var hist=(state.transferencias||[]).concat([transf]);
    lsSet('bancos',novos);
    lsSet('transferencias',hist);
    setState({bancos:novos,transferencias:hist,transfModal:null});
    scheduleSave();
    showToast('Transferência realizada!');
  }

  function selBanco(id,excluir){
    var s=el('select',{class:'form-input',id:'tf-'+id});
    bs.forEach(function(b){
      if(b.id===excluir)return;
      var op=el('option',{value:b.id},b.nome);
      s.appendChild(op);
    });
    return s;
  }

  function inp(id,type,ph,val){
    var i=el('input',{class:'form-input',type:type||'text',id:'tf-'+id,placeholder:ph||''});
    i.value=val!==undefined?String(val):'';
    return i;
  }

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},'Transferência entre bancos'),
      el('button',{class:'modal-close',onclick:function(){setState({transfModal:null});}}, '×'),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'De'),selBanco('de','')]),
      div('form-group',[el('label',{class:'form-label'},'Para'),selBanco('para','')]),
    ]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Valor (R$)'),inp('valor','number','0,00')]),
      div('form-group',[el('label',{class:'form-label'},'Data'),inp('data','date','',today())]),
    ]),
    div('form-group',[el('label',{class:'form-label'},'Descrição'),inp('desc','text','Ex: Sangria, Repasse...')]),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({transfModal:null});}),
      btn('btn-primary','Transferir',save),
    ]),
  ]);
  modal.style.maxWidth='440px';

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({transfModal:null});};
  return ov;
}
