// ── MODAL RECEITA ─────────────────────────────────────────────────────────────
function renderReceitaModal(){
  var m=state.receitaModal; if(!m)return null;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;
  var catKey=getCatKey(state.profile,'receitas');
  var cats=getCats(catKey);
  var vals={
    descricao: edit.descricao||'',
    valor:     edit.valor||'',
    categoria: edit.categoria||cats[0]||'',
    data:      edit.data||today(),
    banco:     edit.banco||'',
    notas:     edit.notas||'',
  };

  function g(id){var e=document.getElementById('rc-'+id);return e?e.value:String(vals[id]||'');}

  function save(){
    var d={
      id:        edit.id||Date.now(),
      descricao: g('descricao'),
      valor:     parseFloat(g('valor'))||0,
      categoria: g('categoria'),
      data:      g('data'),
      banco:     g('banco'),
      notas:     g('notas'),
      profile:   state.profile,
    };
    if(!d.descricao||!d.valor){
      if(!d.descricao)_fldErr('rc-descricao','Descrição é obrigatória');
      if(!d.valor)_fldErr('rc-valor','Informe um valor válido');
      showToast('Preencha os campos em vermelho','error');return;
    }

    // Calcula delta bancário em uma só passagem (evita double-render)
    var bPatch=state.bancos;
    if(d.banco||(isEdit&&edit.banco)){
      bPatch=state.bancos.map(function(b){
        var delta=0;
        // Reverte crédito original ao editar
        if(isEdit&&edit.banco&&edit.banco===b.id) delta-=(edit.valor||0);
        // Aplica novo crédito
        if(d.banco&&d.banco===b.id) delta+=d.valor;
        return delta!==0?Object.assign({},b,{saldo:b.saldo+delta}):b;
      });
    }

    // Atualiza lista de receitas
    var rs=isEdit
      ?state.receitas.map(function(x){return x.id===d.id?d:x;})
      :state.receitas.concat([d]);

    // Um único setState → um único render
    lsSet('receitas',rs);
    lsSet('bancos',bPatch);
    setState({receitas:rs,bancos:bPatch,receitaModal:null});
    scheduleSave();
    showToast(isEdit?'Receita atualizada!':'Receita registrada!');
  }

  function inp(id,type,ph,val){
    var i=el('input',{class:'form-input',type:type||'text',id:'rc-'+id,placeholder:ph||''});
    i.value=val!==undefined?String(val):'';
    return i;
  }
  function sel(id,opts,curVal){
    var s=el('select',{class:'form-input',id:'rc-'+id});
    opts.forEach(function(o){
      var v=typeof o==='object'?o.v:o;
      var l=typeof o==='object'?o.l:o;
      var op=el('option',{value:v},l);
      if(v===String(curVal||''))op.selected=true;
      s.appendChild(op);
    });
    return s;
  }

  var bs=state.bancos.filter(function(b){return b.profile===state.profile;});
  var bancoOpts=[{v:'',l:'— Não creditar em banco —'}].concat(bs.map(function(b){return{v:b.id,l:b.nome};}));

  var notas=el('textarea',{class:'form-input',id:'rc-notas',rows:'2',placeholder:'Observações...'});
  notas.value=vals.notas;

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(isEdit?'Editar':'Nova')+' receita'),
      el('button',{class:'modal-close',onclick:function(){setState({receitaModal:null});}}, '×'),
    ]),
    div('form-group',[el('label',{class:'form-label'},'Descrição'),inp('descricao','text','Ex: Vendas do dia, Salário...',vals.descricao)]),
    div('form-row',[
      div('form-group',[el('label',{class:'form-label'},'Valor (R$)'),inp('valor','number','0,00',vals.valor)]),
      div('form-group',[el('label',{class:'form-label'},'Data'),inp('data','date','',vals.data)]),
    ]),
    div('form-row',[
      div('form-group',[
        el('label',{class:'form-label'},'Categoria'),
        el('div',{style:{display:'flex',gap:'6px'}},[
          sel('categoria',cats,vals.categoria),
          el('button',{type:'button',title:'Gerenciar categorias',style:{padding:'8px 10px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',color:'var(--text3)',cursor:'pointer',flexShrink:'0',fontSize:'14px'},onclick:function(){setState({catManager:{key:catKey,tipo:'receitas'}});}}, '✏️'),
        ]),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Creditar em banco'),sel('banco',bancoOpts,vals.banco)]),
    ]),
    div('form-group',[el('label',{class:'form-label'},'Notas'),notas]),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({receitaModal:null});}),
      btn('btn-primary',isEdit?'Salvar':'Registrar receita',save),
    ]),
  ]);
  modal.style.maxWidth='480px';

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({receitaModal:null});};
  return ov;
}
