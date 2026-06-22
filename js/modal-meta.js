// ── MODAL META ────────────────────────────────────────────────────────────────
function renderMetaModal(){
  var m=state.metaModal;if(!m)return null;
  var edit=m.editItem||{};
  var vals={descricao:edit.descricao||'',meta:edit.meta||'',atual:edit.atual||'',categoria:edit.categoria||'Economia',prazo:edit.prazo||''};
  function g(id){return document.getElementById('mm-'+id)?document.getElementById('mm-'+id).value:vals[id];}
  function save(){
    var d={id:edit.id||Date.now(),descricao:g('descricao'),meta:parseFloat(g('meta'))||0,atual:parseFloat(g('atual'))||0,categoria:g('categoria'),prazo:g('prazo'),profile:state.profile};
    if(!d.descricao||!d.meta)return;
    edit.id?updateMeta(d):addMeta(d);
  }
  function inp(id,type,val){var i=el('input',{class:'form-input',type:type||'text',id:'mm-'+id});i.value=val!==undefined?String(val):'';return i;}
  function sel(id,opts,val){var s=el('select',{class:'form-input',id:'mm-'+id});opts.forEach(function(o){var op=el('option',{value:o},o);if(o===val)op.selected=true;s.appendChild(op);});return s;}

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(edit.id?'Editar':'Nova')+' meta'),
      el('button',{class:'modal-close',onclick:function(){setState({metaModal:null});}}, '×'),
    ]),
    div('form-group',[el('label',{class:'form-label',for:'mm-descricao'},'Descrição'),inp('descricao','text',vals.descricao)]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label',for:'mm-meta'},'Valor meta (R$)'),inp('meta','number',vals.meta)]),
      div('form-group',[el('label',{class:'form-label',for:'mm-atual'},'Valor atual (R$)'),inp('atual','number',vals.atual)]),
    ]),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label',for:'mm-categoria'},'Categoria'),
        sel('categoria',['Economia','Investimento','Compra','Expansão','Outros'],vals.categoria),
      ]),
      div('form-group',[el('label',{class:'form-label',for:'mm-prazo'},'Prazo'),inp('prazo','date',vals.prazo)]),
    ]),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({metaModal:null});}),
      btn('btn-primary',edit.id?'Salvar':'Criar meta',save),
    ]),
  ]);
  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({metaModal:null});};
  return ov;
}
