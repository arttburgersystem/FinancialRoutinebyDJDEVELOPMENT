// ── MODAL BANCO ───────────────────────────────────────────────────────────────
function renderBancoModal(){
  var m=state.bancoModal; if(!m)return null;
  var edit=m.editItem||{};
  var isEdit=!!edit.id;
  var vals={nome:edit.nome||'',saldo:edit.saldo||0,cor:edit.cor||'#5b9bd5'};

  var cores=[
    {cor:'#00a86b',label:'Verde Stone'},
    {cor:'#00b1ea',label:'Azul MP'},
    {cor:'#c9a84c',label:'Dourado'},
    {cor:'#f5a623',label:'Laranja Caixa'},
    {cor:'#2d8a4e',label:'Verde Sicredi'},
    {cor:'#5b9bd5',label:'Azul'},
    {cor:'#9b7fe8',label:'Roxo'},
    {cor:'#e05252',label:'Vermelho'},
  ];

  function g(id){var e=document.getElementById('bm-'+id);return e?e.value:String(vals[id]||'');}
  function getCorSel(){var e=document.getElementById('bm-cor-val');return e?e.value:vals.cor;}

  function save(){
    var d={
      id: edit.id||'banco_'+Date.now(),
      nome: g('nome'),
      saldo: parseFloat(g('saldo'))||0,
      cor: getCorSel(),
      profile: state.profile,
    };
    if(!d.nome)return;
    isEdit?updateBanco(d):addBanco(d);
  }

  var corHidden=el('input',{type:'hidden',id:'bm-cor-val',value:vals.cor});
  var corBtns=cores.map(function(c){
    var isActive=vals.cor===c.cor;
    var b=el('button',{type:'button',style:{
      width:'28px',height:'28px',borderRadius:'50%',background:c.cor,border:isActive?'3px solid var(--text)':'3px solid transparent',cursor:'pointer',transition:'border .15s',flexShrink:'0',
    }});
    b.title=c.label;
    b.onclick=function(){
      cores.forEach(function(cx){
        var bx=document.querySelector('[data-bm-cor="'+cx.cor+'"]');
        if(bx)bx.style.border='3px solid transparent';
      });
      b.style.border='3px solid var(--text)';
      corHidden.value=c.cor;
    };
    b.setAttribute('data-bm-cor',c.cor);
    return b;
  });

  function inp(id,type,ph,val){
    var i=el('input',{class:'form-input',type:type||'text',id:'bm-'+id,placeholder:ph||''});
    i.value=val!==undefined?String(val):'';
    return i;
  }

  var modal=div('modal',[
    div('modal-title',[
      el('span',{},(isEdit?'Editar':'Novo')+' banco'),
      el('button',{class:'modal-close',onclick:function(){setState({bancoModal:null});}}, '×'),
    ]),
    div('form-group',[el('label',{class:'form-label'},'Nome do banco / conta'),inp('nome','text','Ex: Stone, Cofre...', vals.nome)]),
    div('form-group',[el('label',{class:'form-label'},'Saldo atual (R$)'),inp('saldo','number','0,00',vals.saldo)]),
    div('form-group',[
      el('label',{class:'form-label'},'Cor'),
      el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'6px'}},[...corBtns,corHidden]),
    ]),
    div('modal-actions',[
      btn('btn-ghost','Cancelar',function(){setState({bancoModal:null});}),
      btn('btn-primary',isEdit?'Salvar':'Adicionar',save),
    ]),
  ]);
  modal.style.maxWidth='400px';

  var ov=div('modal-overlay',[modal]);
  ov.onclick=function(e){if(e.target===ov)setState({bancoModal:null});};
  return ov;
}
