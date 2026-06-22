// ── MODAL ORÇAMENTO ───────────────────────────────────────────────────────────
function renderOrcamentoModal(){
  var m=state.orcamentoModal; if(!m)return null;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;
  var pf=state.profile;
  var vals={tipo:edit.tipo||'despesa',categoria:edit.categoria||'',valor:edit.valor||''};

  function g(id){var e=document.getElementById('om-'+id);return e?e.value:'';}

  var catsPagar=getCats(getCatKey(pf,'pagar'));
  var catsRec=getCats(getCatKey(pf,'receitas'));

  function getCatList(){return vals.tipo==='receita'?catsRec:catsPagar;}

  function save(){
    var tipo=g('tipo')||vals.tipo;
    var cats=tipo==='receita'?catsRec:catsPagar;
    var d={
      id:edit.id||Date.now(),
      profile:pf,
      tipo:tipo,
      categoria:g('categoria')||cats[0]||'',
      valor:parseFloat(g('valor'))||0,
    };
    if(!d.categoria||!d.valor){showToast('Preencha todos os campos','error');return;}
    // Verificar duplicata (mesmo tipo e categoria, exceto ao editar)
    if(!isEdit){
      var dup=(state.orcamentos||[]).find(function(o){return o.profile===pf&&o.tipo===d.tipo&&o.categoria===d.categoria;});
      if(dup){showToast('Já existe orçamento para esta categoria','error');return;}
    }
    isEdit?updateOrcamento(d):addOrcamento(d);
  }

  function inp(id,type,ph,val){
    var i=el('input',{class:'form-input',type:type||'text',id:'om-'+id,placeholder:ph||''});
    i.value=val!==undefined?String(val):'';return i;
  }

  // Selector de tipo
  var tipoSel=el('select',{class:'form-input',id:'om-tipo',onchange:function(){
    var novo=document.getElementById('om-tipo').value;
    vals.tipo=novo;
    // Rebuild category selector
    var catEl=document.getElementById('om-categoria');
    if(catEl){
      catEl.innerHTML='';
      (novo==='receita'?catsRec:catsPagar).forEach(function(c){catEl.appendChild(el('option',{value:c},c));});
    }
  }});
  [{v:'despesa',l:'Limite de despesa'},{v:'receita',l:'Meta de receita'}].forEach(function(o){
    var op=el('option',{value:o.v},o.l);if(o.v===vals.tipo)op.selected=true;tipoSel.appendChild(op);
  });

  var catSel=el('select',{class:'form-input',id:'om-categoria'});
  getCatList().forEach(function(c){
    var op=el('option',{value:c},c);if(c===vals.categoria)op.selected=true;catSel.appendChild(op);
  });

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(isEdit?'Editar':'Novo')+' orçamento'),
      el('button',{class:'modal-close',onclick:function(){setState({orcamentoModal:null});}}, '×'),
    ]),
    div('form-group',[el('label',{class:'form-label'},'Tipo'),tipoSel]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Categoria'),catSel]),
      div('form-group',[el('label',{class:'form-label'},'Valor mensal (R$)'),inp('valor','number','0,00',vals.valor)]),
    ]),
    el('p',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'14px'}},'Este valor é comparado mês a mês com o realizado.'),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({orcamentoModal:null});}),
      btn('btn-primary',isEdit?'Salvar':'Criar orçamento',save),
    ]),
  ]);
  modal.style.maxWidth='400px';
  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({orcamentoModal:null});};
  return ov;
}
