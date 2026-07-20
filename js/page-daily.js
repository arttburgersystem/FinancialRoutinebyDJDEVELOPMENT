// ── DAILY OPERATION ─────────────────────────────────────────────────────────
(function(){
  if(document.getElementById('do-style'))return;
  var s=document.createElement('style');s.id='do-style';
  s.textContent=
    '@keyframes doPulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 8px rgba(229,172,0,.30)}}'+
    '@keyframes doRedPulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 8px rgba(224,82,82,.30)}}';
  document.head.appendChild(s);
})();

var _doTimerRef=null;

// ── helpers ──────────────────────────────────────────────────────────────────
function _doHora(){
  var d=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Sao_Paulo'}));
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function _doDeveAlertar(op){
  if(!op.horario||op.status!=='hoje')return false;
  var h=op.horario.split(':'),taMin=parseInt(h[0])*60+parseInt(h[1]);
  var n=_doHora().split(':'),nowMin=parseInt(n[0])*60+parseInt(n[1]);
  var alMin=op.alertaMinutos!=null?parseInt(op.alertaMinutos):15;
  return nowMin>=(taMin-alMin)&&nowMin<=(taMin+30);
}
function _doFmtData(s){
  if(!s)return '';var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];
}
function _doFmtHoraISO(iso){
  if(!iso)return '';
  try{var d=new Date(iso);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
  catch(e){return '';}
}
function _doAtrasoLabel(op){
  var hj=today();if(!op.data||op.data>=hj)return '';
  var diff=Math.round((new Date(hj+'T12:00:00')-new Date(op.data+'T12:00:00'))/86400000);
  return diff===1?'há 1 dia':'há '+diff+' dias';
}

// ── inicialização diária ──────────────────────────────────────────────────────
// Fluxo: Programação → (06:00) → Tarefa do Dia → Concluída → (meia-noite) → Programação
// Não concluída = fica em Tarefa do Dia como 'pendente' (atrasada, piscando vermelho)
// Só volta para Programação se estiver em Concluída
function _doInit(){
  var hora06=_doHora()>='06:00';
  var hj=today(),dow=new Date(hj+'T12:00:00').getDay(),pf=state.profile;
  var defs=(state.dailyTaskDefs||[]).filter(function(d){return d.profile===pf&&d.ativo;});
  var ops=(state.dailyOps||[]).slice();var changed=false;

  // 0. Deduplicar instâncias ativas por defId (limpa dados gerados pelo código antigo)
  var _seen={},_drop={};
  ops.forEach(function(op){
    if(!op.defId||op.profile!==pf)return;
    if(['programacao','hoje','pendente','adiada'].indexOf(op.status)<0)return;
    var k=op.defId;
    if(!_seen[k]){_seen[k]=op;}
    else{
      var prev=_seen[k];
      var newer=(op.data||'')>(prev.data||'')||((op.data===prev.data)&&(op.criadaEm||'')>(prev.criadaEm||''));
      if(newer){_drop[prev.id]=true;_seen[k]=op;}else{_drop[op.id]=true;}
    }
  });
  if(Object.keys(_drop).length){ops=ops.filter(function(op){return !_drop[op.id];});changed=true;}

  // 1. 'hoje' de dias anteriores → 'pendente' (fica em Tarefa do Dia como atrasada)
  ops=ops.map(function(op){
    if(op.profile===pf&&op.status==='hoje'&&op.data<hj){changed=true;return Object.assign({},op,{status:'pendente'});}
    return op;
  });

  // 2. 'concluida' de ciclos anteriores (com defId) → descarta (template gera nova instância no ciclo seguinte)
  ops=ops.filter(function(op){
    if(op.profile===pf&&op.status==='concluida'&&op.data<hj&&op.defId){changed=true;return false;}
    return true;
  });

  // 3. Garantir que cada template ativo tenha instância para o ciclo atual (se não houver ativa ou cancelada hoje)
  defs.forEach(function(def){
    var temAtiva=ops.some(function(op){
      return op.defId===def.id&&op.profile===pf&&
        (op.status==='programacao'||op.status==='hoje'||op.status==='pendente'||op.status==='adiada');
    });
    var temCanceladaHoje=ops.some(function(op){
      return op.defId===def.id&&op.profile===pf&&op.status==='cancelada'&&op.data===hj;
    });
    var temConcluidaHoje=ops.some(function(op){
      return op.defId===def.id&&op.profile===pf&&op.status==='concluida'&&op.data===hj;
    });
    if(!temAtiva&&!temCanceladaHoje&&!temConcluidaHoje){
      var dias=def.dias||[];
      var status=(hora06&&(!dias.length||dias.indexOf(dow)>=0))?'hoje':'programacao';
      ops.push({
        id:uid(),defId:def.id,profile:pf,
        nome:def.nome,descricao:def.descricao||'',horario:def.horario||'',
        cor:def.cor||'gold',prioridade:def.prioridade||'media',
        alertaMinutos:def.alertaMinutos!=null?def.alertaMinutos:15,
        data:hj,status:status,criadaEm:new Date().toISOString(),
        concluidaEm:null,canceladaEm:null,adiada:null,motivoCancelamento:'',
      });
      changed=true;
    }
  });

  // 4. Às 06:00: mover instâncias 'programacao' de hoje para Tarefa do Dia
  if(hora06){
    ops=ops.map(function(op){
      if(op.profile===pf&&op.status==='programacao'){
        var def=(state.dailyTaskDefs||[]).find(function(d){return d.id===op.defId;});
        var dias=def?(def.dias||[]):[];
        if(!dias.length||dias.indexOf(dow)>=0){
          changed=true;return Object.assign({},op,{status:'hoje',data:hj});
        }
      }
      return op;
    });
  }

  // 5. Tarefas adiadas cujo dia chegou → ativa (se já 06:00) ou programacao
  ops=ops.map(function(op){
    if(op.profile===pf&&op.status==='adiada'&&op.adiada&&op.adiada.para<=hj){
      changed=true;
      var patch={status:hora06?'hoje':'programacao',data:hj,adiada:null};
      if(op.adiada.hora)patch.horario=op.adiada.hora;
      return Object.assign({},op,patch);
    }
    return op;
  });

  // 6. Tarefas futuras cujo dia chegou → ativa
  ops=ops.map(function(op){
    if(op.profile===pf&&op.status==='futura'&&op.data&&op.data<=hj){
      changed=true;
      return Object.assign({},op,{status:hora06?'hoje':'programacao'});
    }
    return op;
  });

  if(changed){lsSet('dailyOps',ops);state.dailyOps=ops;scheduleSave();}
}

// ── ações ─────────────────────────────────────────────────────────────────────
function _doConcluir(id){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'concluida',concluidaEm:new Date().toISOString()}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops});scheduleSave();showToast('Tarefa concluída!','success');
}
function _doCancelar(id,motivo){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'cancelada',canceladaEm:new Date().toISOString(),motivoCancelamento:motivo||''}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops,dailyAdiModal:null});scheduleSave();showToast('Tarefa cancelada','error');
}
function _doAdiar(id,para,hora,motivo){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'adiada',adiada:{para:para,hora:hora||'',motivo:motivo||''}}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops,dailyAdiModal:null});scheduleSave();
  showToast('Adiada para '+_doFmtData(para)+(hora?' às '+hora:''));
}
function _doCancelarEProximas(id,motivo){
  var op=(state.dailyOps||[]).find(function(x){return x.id===id;});if(!op)return;
  var defId=op.defId;
  var now=new Date().toISOString();
  var ops=(state.dailyOps||[]).map(function(o){
    if(o.id===id||(defId&&o.defId===defId&&o.status==='programacao')){
      return Object.assign({},o,{status:'cancelada',canceladaEm:now,motivoCancelamento:motivo||''});
    }
    return o;
  });
  var defs=defId
    ?(state.dailyTaskDefs||[]).map(function(d){return d.id===defId?Object.assign({},d,{ativo:false}):d;})
    :(state.dailyTaskDefs||[]);
  lsSet('dailyOps',ops);lsSet('dailyTaskDefs',defs);
  setState({dailyOps:ops,dailyTaskDefs:defs,dailyAdiModal:null});scheduleSave();
  showToast('Tarefa e rotina canceladas','error');
}
function _doPularHoje(id){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'cancelada',canceladaEm:new Date().toISOString(),motivoCancelamento:'Pulada'}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops});scheduleSave();showToast('Tarefa pulada hoje','info');
}
function _doAtivarAgora(id){
  var ops=(state.dailyOps||[]).map(function(op){
    return op.id===id?Object.assign({},op,{status:'hoje',data:today()}):op;
  });
  lsSet('dailyOps',ops);setState({dailyOps:ops});scheduleSave();showToast('Tarefa ativada!','success');
}
function _doExcluir(id){
  if(!confirm('Remover esta tarefa?'))return;
  var ops=(state.dailyOps||[]).filter(function(op){return op.id!==id;});
  lsSet('dailyOps',ops);setState({dailyOps:ops});scheduleSave();
}

// ── modal adiar/cancelar ──────────────────────────────────────────────────────
function renderDailyAdiModal(){
  var id=state.dailyAdiModal;if(!id)return null;
  var op=(state.dailyOps||[]).find(function(x){return x.id===id;});if(!op)return null;
  var temDef=!!(op.defId&&(state.dailyTaskDefs||[]).find(function(d){return d.id===op.defId;}));
  var motiEl=el('textarea',{class:'form-input',rows:'2',placeholder:'Motivo (opcional)',style:{resize:'vertical',minHeight:'52px'}});
  var dtEl=el('input',{class:'form-input',type:'date',style:{flex:'1'}});
  var _amanha=new Date(today()+'T12:00:00');_amanha.setDate(_amanha.getDate()+1);
  dtEl.value=_amanha.toISOString().substring(0,10);
  var hrEl=el('input',{class:'form-input',type:'time',style:{width:'110px'}});
  hrEl.value=op.horario||'';
  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({dailyAdiModal:null});}},[
    el('div',{class:'modal-box',style:{maxWidth:'400px',width:'95vw'}},[
      el('h3',{style:{margin:'0 0 4px',fontSize:'16px',color:'var(--text)'}},'↻ Adiar tarefa'),
      el('p',{style:{fontSize:'13px',color:'var(--gold)',marginBottom:'16px',fontWeight:'600'}},op.nome),

      // Adiar section
      div('form-group',[
        el('label',{class:'form-label'},'Adiar para: (data e horário)'),
        el('div',{style:{display:'flex',gap:'8px',alignItems:'center'}},[dtEl,hrEl]),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Motivo (opcional):'),motiEl]),
      el('div',{style:{display:'flex',gap:'8px',marginBottom:'20px'}},[
        btn('btn-primary','↻ Adiar',function(){_doAdiar(id,dtEl.value||today(),hrEl.value,motiEl.value.trim());}),
        btn('btn-ghost','Fechar',function(){setState({dailyAdiModal:null});}),
      ]),

      // Cancelar section
      el('div',{style:{borderTop:'1px solid var(--border)',paddingTop:'16px'}},[
        el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'10px',fontWeight:'600'}},'✕ CANCELAR TAREFA'),
        el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap'}},[
          el('button',{style:{
            padding:'8px 14px',borderRadius:'8px',border:'1px solid var(--red)',
            background:'none',color:'var(--red)',cursor:'pointer',fontSize:'12px',fontWeight:'600',
          },onclick:function(){_doCancelar(id,motiEl.value.trim());}},'✕ Só esta'),
          temDef?el('button',{style:{
            padding:'8px 14px',borderRadius:'8px',border:'none',
            background:'var(--red)',color:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:'600',
          },onclick:function(){
            if(!confirm('Cancelar esta tarefa e desativar a rotina recorrente?'))return;
            _doCancelarEProximas(id,motiEl.value.trim());
          }},'✕ Esta e as próximas'):null,
        ].filter(Boolean)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'6px'}},
          temDef?'« Só esta »: cancela apenas este ciclo. « Esta e as próximas »: cancela e desativa a rotina.':
                 '« Só esta »: cancela esta tarefa.'),
      ]),
    ])
  ]);
}

// ── modal nova tarefa / template ──────────────────────────────────────────────
function renderDailyModal(){
  var m=state.dailyModal;if(!m)return null;
  var edit=m.editItem||{};var isEdit=!!edit.id;var isOneOff=!!m.oneOff;
  function g(id){var e=document.getElementById('do-'+id);return e?e.value:'';}
  var diasSel=(m._diasSel!==undefined?m._diasSel:(edit.dias||[1,2,3,4,5])).slice();
  var diasLabels=['D','S','T','Q','Q','S','S'];
  var corSel=m._corSel||edit.cor||'gold';
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};

  var diasBtns=[0,1,2,3,4,5,6].map(function(i){
    var at=diasSel.indexOf(i)>=0;
    var b2=el('button',{type:'button',style:{
      width:'30px',height:'30px',borderRadius:'50%',border:'1px solid var(--border)',
      background:at?'var(--gold)':'var(--bg3)',color:at?'#000':'var(--text)',
      cursor:'pointer',fontSize:'12px',fontWeight:'700',transition:'all .15s',
    },onclick:function(){
      var idx=diasSel.indexOf(i);if(idx>=0)diasSel.splice(idx,1);else diasSel.push(i);
      if(state.dailyModal)state.dailyModal._diasSel=diasSel.slice();
      var now=diasSel.indexOf(i)>=0;
      this.style.background=now?'var(--gold)':'var(--bg3)';this.style.color=now?'#000':'var(--text)';
    }},diasLabels[i]);
    return b2;
  });

  var corBtns=Object.keys(corMap).map(function(c){
    var cb=el('button',{type:'button',title:c,style:{
      width:'24px',height:'24px',borderRadius:'50%',cursor:'pointer',
      background:corMap[c],border:corSel===c?'2px solid var(--text)':'2px solid transparent',transition:'border .15s',
    },onclick:function(){
      corSel=c;
      if(state.dailyModal)state.dailyModal._corSel=c;
      var all=this.parentElement.querySelectorAll('button');
      all.forEach(function(b){b.style.border='2px solid transparent';});
      this.style.border='2px solid var(--text)';
    }});
    return cb;
  });

  function inp(id,type,ph,val,extra){
    var i=el('input',Object.assign({class:'form-input',type:type||'text',id:'do-'+id,placeholder:ph||''},extra||{}));
    i.value=val!==undefined?String(val):'';return i;
  }
  function selEl(id,opts,val){
    var s=el('select',{class:'form-input',id:'do-'+id});
    opts.forEach(function(o){var op2=el('option',{value:o.v},o.l);if(o.v===val)op2.selected=true;s.appendChild(op2);});
    return s;
  }

  function salvar(){
    var nome=g('nome').trim();
    if(!nome){var ni=document.getElementById('do-nome');if(ni){ni.style.border='2px solid var(--red)';}showToast('Informe o nome da tarefa','error');return;}
    if(isOneOff){
      var dataAlvo=m._dataFutura||today();
      var ehFutura=dataAlvo>today();
      var inst={
        id:uid(),defId:null,profile:state.profile,
        nome:nome,descricao:g('descricao'),horario:g('horario'),
        cor:corSel,prioridade:g('prioridade')||'media',alertaMinutos:15,
        data:dataAlvo,status:ehFutura?'futura':'hoje',criadaEm:new Date().toISOString(),
        concluidaEm:null,canceladaEm:null,adiada:null,motivoCancelamento:'',
      };
      var ops2=(state.dailyOps||[]).concat([inst]);
      lsSet('dailyOps',ops2);setState({dailyOps:ops2,dailyModal:null});scheduleSave();
      showToast(ehFutura?'Tarefa futura agendada para '+_doFmtData(dataAlvo)+'!':'Tarefa adicionada ao dia!','success');
    } else {
      var def={
        id:edit.id||uid(),profile:state.profile,
        nome:nome,descricao:g('descricao'),horario:g('horario'),
        dias:diasSel.slice().sort(),alertaMinutos:(function(){var s=g('alerta');return s!==''?(parseInt(s)||0):15;})(),
        cor:corSel,prioridade:g('prioridade')||'media',ativo:true,
      };
      var defs2=isEdit
        ?(state.dailyTaskDefs||[]).map(function(d){return d.id===def.id?def:d;})
        :(state.dailyTaskDefs||[]).concat([def]);
      // Atualizar instâncias 'programacao' existentes com dados do template editado
      var ops4=(state.dailyOps||[]).map(function(op){
        if(op.defId===def.id&&op.profile===state.profile&&op.status==='programacao'){
          return Object.assign({},op,{nome:def.nome,descricao:def.descricao,horario:def.horario,
            cor:def.cor,prioridade:def.prioridade,alertaMinutos:def.alertaMinutos});
        }
        return op;
      });
      lsSet('dailyTaskDefs',defs2);lsSet('dailyOps',ops4);
      setState({dailyTaskDefs:defs2,dailyOps:ops4,dailyModal:null});scheduleSave();
      showToast(isEdit?'Rotina atualizada!':'Rotina criada!','success');
    }
  }

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({dailyModal:null});}},[
    el('div',{class:'modal-box',style:{maxWidth:'440px',width:'96vw'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}},[
        el('h3',{style:{margin:'0',fontSize:'16px',color:'var(--text)'}},
          isOneOff?(m._dataFutura&&m._dataFutura>today()?'📅 Tarefa Futura — '+_doFmtData(m._dataFutura):'+ Tarefa Rápida (hoje)'):isEdit?'Editar Rotina':'+ Nova Rotina Diária'),
        el('button',{class:'btn-ghost',style:{padding:'4px 10px'},onclick:function(){setState({dailyModal:null});}},'✕'),
      ]),
      div('form-group',[el('label',{class:'form-label'},'Nome da tarefa *'),inp('nome','text','Ex: Conferir caixa',edit.nome)]),
      div('form-group',[el('label',{class:'form-label'},'Descrição'),
        (function(){var t=el('textarea',{class:'form-input',id:'do-descricao',rows:'2',placeholder:'Detalhes opcionais...',style:{resize:'vertical'}});t.value=edit.descricao||'';return t;})()]),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}},[
        div('form-group',[el('label',{class:'form-label'},'Horário'),inp('horario','time','',edit.horario||'')]),
        div('form-group',[el('label',{class:'form-label'},'Prioridade'),
          selEl('prioridade',[{v:'alta',l:'🔴 Alta'},{v:'media',l:'🟡 Média'},{v:'baixa',l:'🟢 Baixa'}],edit.prioridade||'media')]),
      ]),
      !isOneOff?div('form-group',[
        el('label',{class:'form-label'},'Repetir nos dias:'),
        el('div',{style:{display:'flex',gap:'6px',marginTop:'6px'}},diasBtns),
      ]):null,
      !isOneOff?div('form-group',[
        el('label',{class:'form-label'},'Alertar (min antes):'),
        inp('alerta','number','15',edit.alertaMinutos!=null?edit.alertaMinutos:15,{min:'0',max:'120',style:{width:'100px'}}),
      ]):null,
      div('form-group',[
        el('label',{class:'form-label'},'Cor:'),
        el('div',{style:{display:'flex',gap:'8px',marginTop:'6px'}},corBtns),
      ]),
      el('div',{style:{display:'flex',gap:'8px',marginTop:'20px'}},[
        btn('btn-primary',isEdit?'Salvar':'Criar',salvar),
        btn('btn-ghost','Cancelar',function(){setState({dailyModal:null});}),
      ]),
    ].filter(Boolean))
  ]);
}

// ── modal gerenciar rotinas ───────────────────────────────────────────────────
function renderDailyTemplatesModal(){
  if(!state.dailyTemplatesOpen)return null;
  var pf=state.profile;
  var defs=(state.dailyTaskDefs||[]).filter(function(d){return d.profile===pf;});
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};
  var diasN=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  var lista=defs.length===0
    ?[el('div',{style:{color:'var(--text3)',fontSize:'13px',padding:'20px',textAlign:'center'}},'Nenhuma rotina ainda. Crie a primeira!')]
    :defs.map(function(d){
      return el('div',{style:{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid var(--border)'}},[
        el('div',{style:{width:'10px',height:'10px',borderRadius:'50%',background:corMap[d.cor]||'var(--gold)',flexShrink:'0'}}),
        el('div',{style:{flex:'1'}},[
          el('div',{style:{fontWeight:'600',fontSize:'13px',color:d.ativo?'var(--text)':'var(--text3)'}},(d.ativo?'':'⏸ ')+d.nome),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},
            (d.horario?d.horario+' · ':'')+(d.dias&&d.dias.length?d.dias.map(function(i){return diasN[i];}).join(', '):'Todos os dias')+
            (d.prioridade?' · '+(d.prioridade==='alta'?'🔴':d.prioridade==='media'?'🟡':'🟢'):'')),
        ]),
        el('div',{style:{display:'flex',gap:'4px'}},[
          btn('btn-ghost',d.ativo?'⏸':'▶',function(){
            var nd=(state.dailyTaskDefs||[]).map(function(x){return x.id===d.id?Object.assign({},x,{ativo:!x.ativo}):x;});
            lsSet('dailyTaskDefs',nd);setState({dailyTaskDefs:nd});scheduleSave();
          }),
          btn('btn-ghost','✏️',function(){setState({dailyModal:{editItem:d},dailyTemplatesOpen:false});}),
          btn('btn-ghost','🗑️',function(){
            if(!confirm('Excluir rotina "'+d.nome+'"?'))return;
            var nd=(state.dailyTaskDefs||[]).filter(function(x){return x.id!==d.id;});
            lsSet('dailyTaskDefs',nd);setState({dailyTaskDefs:nd});scheduleSave();showToast('Rotina excluída','error');
          }),
        ]),
      ]);
    });

  return el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({dailyTemplatesOpen:false});}},[
    el('div',{class:'modal-box',style:{maxWidth:'500px',width:'96vw',maxHeight:'80vh',display:'flex',flexDirection:'column'}},[
      el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}},[
        el('h3',{style:{margin:'0',fontSize:'16px',color:'var(--text)'}},'⚙️ Gerenciar Rotinas'),
        el('button',{class:'btn-ghost',style:{padding:'4px 10px'},onclick:function(){setState({dailyTemplatesOpen:false});}},'✕'),
      ]),
      btn('btn-primary','+ Nova Rotina',function(){setState({dailyModal:{},dailyTemplatesOpen:false});}),
      el('div',{style:{marginTop:'14px',overflowY:'auto',flex:'1'}},lista),
    ])
  ]);
}

// ── card de template (coluna Programação — painel permanente de rotinas) ───────
function _doDefCard(def){
  var pf=state.profile,hj=today(),dow=new Date(hj+'T12:00:00').getDay();
  var diasN=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var dias=def.dias||[];
  var diasTxt=dias.length?dias.map(function(i){return diasN[i];}).join(', '):'Todos os dias';
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};
  var cor=corMap[def.cor||'gold']||'var(--gold)';
  var ehHojeDow=!dias.length||dias.indexOf(dow)>=0;
  // instância mais recente desta rotina
  var inst=(state.dailyOps||[]).filter(function(op){
    return op.defId===def.id&&op.profile===pf;
  }).sort(function(a,b){return(b.data||'')>(a.data||'')?1:-1;})[0];
  var status=inst?inst.status:'none';
  var sm={
    'hoje':     {l:'📋 Em Tarefa do Dia', c:'var(--gold)',  b:'rgba(229,172,0,.12)'},
    'pendente': {l:'⚠️ Atrasada',          c:'var(--red)',   b:'rgba(224,82,82,.1)'},
    'concluida':{l:'✅ Concluída hoje',    c:'var(--green)', b:'rgba(39,174,96,.1)'},
    'programacao':{l:'⏸ Aguardando',      c:'var(--text3)', b:'rgba(255,255,255,.05)'},
    'adiada':   {l:'↻ Adiada',             c:'var(--blue)',  b:'rgba(52,152,219,.1)'},
    'cancelada':{l:'✕ Cancelada',          c:'var(--text3)', b:'rgba(255,255,255,.05)'},
    'none':     {l:'📅 Agendada',          c:'var(--text3)', b:'rgba(255,255,255,.05)'},
  };
  var si=sm[status]||sm['none'];
  return el('div',{style:{
    background:'var(--bg3)',borderRadius:'8px',padding:'12px',marginBottom:'8px',
    border:'1px solid var(--border)',borderLeft:'3px solid '+cor,
  }},[
    el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}},[
      el('div',{style:{fontWeight:'600',fontSize:'13px',color:'var(--text)',flex:'1',marginRight:'6px',lineHeight:'1.3'}},def.nome),
      def.horario?el('span',{style:{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap',fontWeight:'700',fontFamily:'monospace'}},def.horario):null,
    ].filter(Boolean)),
    el('div',{style:{fontSize:'11px',color:ehHojeDow?'var(--gold)':'var(--text3)',marginBottom:'6px'}},
      (ehHojeDow?'● ':'○ ')+diasTxt),
    el('div',{style:{fontSize:'11px',fontWeight:'700',color:si.c,padding:'3px 8px',borderRadius:'4px',background:si.b,display:'inline-block'}},si.l),
  ]);
}

// ── card de tarefa ────────────────────────────────────────────────────────────
function _doCard(op){
  var alerta=_doDeveAlertar(op);
  var ehPendente=op.status==='pendente';
  var ehProg=op.status==='programacao';
  var hj=today();
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};
  var cor=corMap[op.cor||'gold']||'var(--gold)';
  var priIcon={alta:'🔴',media:'🟡',baixa:'🟢'}[op.prioridade||'media']||'🟡';

  var brdCor=ehPendente?'var(--red)':cor;
  var cardStyle={
    background:'var(--bg3)',borderRadius:'8px',padding:'12px',marginBottom:'8px',
    border:'1px solid '+(ehPendente?'var(--red)':alerta?cor:'var(--border)'),
    borderLeft:'3px solid '+brdCor,
    transition:'border-color .3s',
    opacity:ehProg?'.9':'1',
  };
  if(alerta)cardStyle.animation='doPulse 1.4s ease-in-out infinite';
  if(ehPendente)cardStyle.animation='doRedPulse 1.4s ease-in-out infinite';

  var hdrTxt=ehProg?'📅 ':ehPendente?'🔴 ':(alerta?'⚠️ ':priIcon+' ');
  var hdrColor=ehPendente?'var(--red)':'var(--text)';

  var hdr=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}},[
    el('div',{style:{fontWeight:'600',fontSize:'13px',color:hdrColor,flex:'1',marginRight:'6px',lineHeight:'1.3'}},
      hdrTxt+op.nome),
    op.horario?el('span',{style:{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap',fontWeight:'700',fontFamily:'monospace'}},op.horario):null,
  ].filter(Boolean));

  var desc=op.descricao?el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'8px',lineHeight:'1.4'}},op.descricao):null;

  var alertTag=alerta?el('div',{style:{
    fontSize:'11px',fontWeight:'700',color:'var(--gold)',marginBottom:'8px',textAlign:'center',letterSpacing:'.5px',
    padding:'4px 8px',background:'rgba(229,172,0,.12)',borderRadius:'4px',
  }},'⏰ HORA DA TAREFA!'):null;

  var pendInfo=ehPendente?el('div',{style:{
    fontSize:'11px',color:'var(--red)',marginBottom:'8px',padding:'4px 8px',
    background:'rgba(224,82,82,.1)',borderRadius:'4px',fontWeight:'600',
  }},'⚠️ ATRASADA · Era: '+_doFmtData(op.data)+(_doAtrasoLabel(op)?' · '+_doAtrasoLabel(op):'')):null;

  // Para 'programacao': mostra quando ativa (hoje às 06:00 ou dias futuros)
  var progInfo=null;
  if(ehProg){
    var def2=(state.dailyTaskDefs||[]).find(function(d){return d.id===op.defId;});
    var diasN2=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var dias2=def2?(def2.dias||[]):[];
    var diasTxt=dias2.length?dias2.map(function(i){return diasN2[i];}).join(', '):'Todos os dias';
    var dow2=new Date(hj+'T12:00:00').getDay();
    var ehHojeDow=!dias2.length||dias2.indexOf(dow2)>=0;
    var anteDas6=_doHora()<'06:00';
    progInfo=el('div',{style:{
      fontSize:'11px',marginBottom:'8px',padding:'4px 8px',borderRadius:'4px',
      background:ehHojeDow?'rgba(229,172,0,.1)':'rgba(255,255,255,.04)',
      color:ehHojeDow?'var(--gold)':'var(--text3)',
      fontWeight:ehHojeDow?'700':'400',
    }},ehHojeDow&&anteDas6?'⏰ Ativa hoje às 06:00':ehHojeDow?'▶ Ativa hoje':'📅 '+diasTxt);
  }

  var adiInfo=(op.status==='adiada'&&op.adiada)?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'6px'}},
    '↻ Para: '+_doFmtData(op.adiada.para)+(op.adiada.motivo?' — "'+op.adiada.motivo+'"':'')):null;

  var doneInfo=op.status==='concluida'?el('div',{style:{fontSize:'11px',color:'var(--green)',marginBottom:'4px',fontWeight:'600'}},
    '✓ Concluída às '+_doFmtHoraISO(op.concluidaEm)):null;

  var cancInfo=op.status==='cancelada'?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginBottom:'4px'}},
    (op.motivoCancelamento&&op.motivoCancelamento!=='Pulada'?'✕ Cancelada — "'+op.motivoCancelamento+'"':'✕ Cancelada')):null;

  var btns=[];
  if(ehProg){
    btns.push(el('button',{style:{
      padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--blue)',
      color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',
    },onclick:function(){_doAtivarAgora(op.id);}},'▶ Ativar agora'));
    btns.push(el('button',{style:{
      padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',
      background:'none',color:'var(--text3)',fontSize:'12px',cursor:'pointer',
    },onclick:function(){_doPularHoje(op.id);}},'⏭ Pular hoje'));
  } else if(op.status==='hoje'||op.status==='pendente'||op.status==='adiada'){
    btns.push(el('button',{style:{
      padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--green)',
      color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',
    },onclick:function(){_doConcluir(op.id);}},'✓ Concluir'));
    btns.push(el('button',{style:{
      padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',
      background:'var(--bg2)',color:'var(--text)',fontSize:'12px',cursor:'pointer',
    },onclick:function(){setState({dailyAdiModal:op.id});}},'↻ Adiar'));
    btns.push(el('button',{style:{
      padding:'5px 8px',borderRadius:'6px',border:'1px solid var(--border)',
      background:'none',color:'var(--text3)',fontSize:'12px',cursor:'pointer',
    },title:'Remover',onclick:function(){_doExcluir(op.id);}},'🗑'));
  }

  var actions=btns.length?el('div',{style:{display:'flex',gap:'5px',marginTop:'8px',flexWrap:'wrap'}},btns):null;
  return el('div',{style:cardStyle},[hdr,desc,alertTag,pendInfo,progInfo,adiInfo,doneInfo,cancInfo,actions].filter(Boolean));
}

// ── coluna kanban ─────────────────────────────────────────────────────────────
function _doColuna(titulo,icone,cor,cards){
  return el('div',{style:{
    background:'var(--bg2)',borderRadius:'10px',padding:'12px',
    border:'1px solid var(--border)',display:'flex',flexDirection:'column',minWidth:'200px',
  }},[
    el('div',{style:{display:'flex',alignItems:'center',gap:'7px',marginBottom:'12px',paddingBottom:'10px',borderBottom:'1px solid var(--border)'}},[
      el('span',{style:{fontSize:'16px'}},icone),
      el('span',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)',flex:'1'}},titulo),
      el('span',{style:{fontSize:'11px',fontWeight:'700',padding:'2px 7px',borderRadius:'10px',background:cor+'22',color:cor}},String(cards.length)),
    ]),
    cards.length===0
      ?el('div',{style:{color:'var(--text3)',fontSize:'12px',textAlign:'center',padding:'24px 0',opacity:'.5'}},'Nenhuma tarefa')
      :el('div',{style:{maxHeight:'60vh',overflowY:'auto'}},cards),
  ]);
}

// ── modal calendário de tarefas ───────────────────────────────────────────────
function renderDailyCalModal(){
  if(!state.dailyCalModal)return null;
  var pf=state.profile,hj=today();
  var calMes=state.dailyCalModal.mes||hj.slice(0,7);
  var calYear=parseInt(calMes.split('-')[0]);
  var calMonth=parseInt(calMes.split('-')[1])-1;

  function navM(d){
    var y=calYear,mo=calMonth+d;
    y+=Math.floor(mo/12);mo=((mo%12)+12)%12;
    setState({dailyCalModal:{mes:y+'-'+String(mo+1).padStart(2,'0')}});
  }

  var DIAS_SEM=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var MESES_NM=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var diasNoMes=new Date(calYear,calMonth+1,0).getDate();
  var primeiroDia=new Date(calYear,calMonth,1).getDay();
  var corMap={gold:'var(--gold)',blue:'var(--blue)',green:'var(--green)',red:'var(--red)',purple:'#9c59b6'};

  var defs=(state.dailyTaskDefs||[]).filter(function(d){return d.profile===pf&&d.ativo;});
  var ops=(state.dailyOps||[]).filter(function(op){return op.profile===pf;});

  // Agrupa tarefas futuras e adiadas por data no mês
  function opsDia(dateStr){
    return ops.filter(function(op){
      if(op.status==='futura')return op.data===dateStr;
      if(op.status==='adiada')return op.adiada&&op.adiada.para===dateStr;
      if(op.status==='hoje'||op.status==='pendente'||op.status==='concluida'||op.status==='cancelada')return op.data===dateStr;
      return false;
    });
  }
  // Rotinas ativas no weekday
  function defsNoDia(dow){
    return defs.filter(function(d){return !d.dias||!d.dias.length||d.dias.indexOf(dow)>=0;});
  }

  // Grid
  var cells=[];
  for(var ci=0;ci<primeiroDia;ci++)cells.push(null);
  for(var cd=1;cd<=diasNoMes;cd++)cells.push(cd);

  var grid=el('div',{style:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px',marginTop:'6px'}});

  DIAS_SEM.forEach(function(d,i){
    grid.appendChild(el('div',{style:{textAlign:'center',fontSize:'10px',fontWeight:'700',
      color:(i===0||i===6)?'var(--red)':'var(--text3)',padding:'4px 0',textTransform:'uppercase'}},d));
  });

  cells.forEach(function(dia){
    if(dia===null){grid.appendChild(el('div',{}));return;}
    var dateStr=calMes+'-'+String(dia).padStart(2,'0');
    var dow=new Date(dateStr+'T12:00:00').getDay();
    var ehHj=dateStr===hj;
    var ehPassado=dateStr<hj;
    var ehFuturo=dateStr>hj;
    var rotsHoje=defsNoDia(dow);
    var tasksDia=opsDia(dateStr);
    var futuras=tasksDia.filter(function(op){return op.status==='futura';});
    var conc=tasksDia.filter(function(op){return op.status==='concluida';});
    var atrasadas=tasksDia.filter(function(op){return op.status==='pendente';});

    var cell=el('div',{style:{
      minHeight:'52px',borderRadius:'7px',padding:'4px',cursor:'pointer',
      border:ehHj?'2px solid var(--primary)':'1px solid var(--border)',
      background:ehPassado?'var(--bg3)':ehHj?'rgba(96,165,250,.06)':'var(--bg)',
      display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',
      position:'relative',transition:'background .12s',
    }});
    cell.onmouseenter=function(){cell.style.background=ehHj?'rgba(96,165,250,.14)':'var(--bg3)';};
    cell.onmouseleave=function(){cell.style.background=ehPassado?'var(--bg3)':ehHj?'rgba(96,165,250,.06)':'var(--bg)';};

    cell.appendChild(el('div',{style:{
      fontSize:'13px',fontWeight:ehHj?'800':'500',
      color:ehHj?'var(--primary)':ehPassado?'var(--text3)':'var(--text)',
    }},String(dia)));

    // Dots: rotinas (cinza/dourado), tarefas futuras (azul), concluídas (verde), atrasadas (vermelho)
    var dotRow=el('div',{style:{display:'flex',gap:'2px',flexWrap:'wrap',justifyContent:'center'}});
    rotsHoje.slice(0,4).forEach(function(d){
      dotRow.appendChild(el('div',{title:d.nome,style:{
        width:'6px',height:'6px',borderRadius:'50%',
        background:ehPassado?(conc.length?'var(--green)':'var(--text3)'):(corMap[d.cor]||'var(--gold)'),
      }}));
    });
    futuras.forEach(function(op){
      dotRow.appendChild(el('div',{title:op.nome,style:{width:'6px',height:'6px',borderRadius:'50%',background:'var(--blue)'}}));
    });
    atrasadas.forEach(function(){
      dotRow.appendChild(el('div',{style:{width:'6px',height:'6px',borderRadius:'50%',background:'var(--red)'}}));
    });
    if(dotRow.childNodes.length)cell.appendChild(dotRow);

    if(futuras.length){
      cell.appendChild(el('div',{style:{fontSize:'8px',fontWeight:'700',color:'var(--blue)',lineHeight:'1'}},futuras.length+'fut'));
    }

    cell.onclick=function(){
      if(ehFuturo){
        // Cria tarefa futura para esse dia
        setState({dailyCalModal:null,dailyModal:{oneOff:true,_dataFutura:dateStr}});
      } else {
        setState({dailyCalModal:null,dailyModal:{oneOff:true}});
      }
    };
    grid.appendChild(cell);
  });

  var legenda=el('div',{style:{display:'flex',gap:'14px',flexWrap:'wrap',marginTop:'10px',fontSize:'11px',color:'var(--text3)'}},[
    el('span',{},[el('span',{style:{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:'var(--gold)',marginRight:'4px'}},''),'Rotina ativa']),
    el('span',{},[el('span',{style:{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:'var(--blue)',marginRight:'4px'}},''),'Tarefa futura']),
    el('span',{},[el('span',{style:{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:'var(--green)',marginRight:'4px'}},''),'Concluída']),
    el('span',{},[el('span',{style:{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:'var(--red)',marginRight:'4px'}},''),'Atrasada']),
  ]);

  var modal=el('div',{class:'modal-box',style:{maxWidth:'520px',width:'96vw'}});
  modal.appendChild(el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}},[
    el('h3',{style:{margin:'0',fontSize:'16px',color:'var(--text)'}},'📅 Calendário de Tarefas'),
    el('button',{class:'btn-ghost',style:{padding:'4px 10px'},onclick:function(){setState({dailyCalModal:null});}},'✕'),
  ]));
  modal.appendChild(el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}},[
    el('button',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text2)',cursor:'pointer',padding:'4px 12px',fontSize:'16px',lineHeight:'1'},onclick:function(){navM(-1);}},'‹'),
    el('span',{style:{fontWeight:'700',fontSize:'15px',color:'var(--text)'}},MESES_NM[calMonth]+' '+calYear),
    el('button',{style:{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text2)',cursor:'pointer',padding:'4px 12px',fontSize:'16px',lineHeight:'1'},onclick:function(){navM(1);}},'›'),
  ]));
  modal.appendChild(grid);
  modal.appendChild(legenda);
  modal.appendChild(el('div',{style:{marginTop:'12px',fontSize:'11px',color:'var(--text3)'}},'Clique em um dia futuro para agendar uma tarefa · Clique em hoje para adicionar ao dia'));

  var ov=el('div',{class:'modal-overlay',onclick:function(e){if(e.target===ov)setState({dailyCalModal:null});}});
  ov.appendChild(modal);
  return ov;
}

// ── render principal ──────────────────────────────────────────────────────────
function renderDailyOperation(){
  if(!_doTimerRef){
    _doTimerRef=setInterval(function(){
      if(state.page==='daily'){
        if(!state.dailyModal&&!state.dailyAdiModal&&!state.dailyTemplatesOpen)
          setState({_doTick:Date.now()});
      } else {clearInterval(_doTimerRef);_doTimerRef=null;}
    },60000);
  }

  _doInit();

  var pf=state.profile,hj=today();
  var ops=(state.dailyOps||[]).filter(function(op){return op.profile===pf;});

  // Programação: painel permanente de rotinas (mostra defs, não instâncias)
  var dow0=new Date(hj+'T12:00:00').getDay();
  var defs=(state.dailyTaskDefs||[]).filter(function(d){return d.profile===pf&&d.ativo;}).sort(function(a,b){
    var aH=!a.dias||!a.dias.length||a.dias.indexOf(dow0)>=0;
    var bH=!b.dias||!b.dias.length||b.dias.indexOf(dow0)>=0;
    if(aH&&!bH)return -1;if(!aH&&bH)return 1;
    if(!a.horario&&!b.horario)return 0;if(!a.horario)return 1;if(!b.horario)return -1;
    return a.horario<b.horario?-1:1;
  });

  // Tarefa do Dia: ativas de hoje + atrasadas (pendentes)
  var opHoje=ops.filter(function(op){return op.status==='hoje'||op.status==='pendente';}).sort(function(a,b){
    if(a.status==='pendente'&&b.status!=='pendente')return -1;
    if(b.status==='pendente'&&a.status!=='pendente')return 1;
    if(!a.horario&&!b.horario)return 0;if(!a.horario)return 1;if(!b.horario)return -1;
    return a.horario<b.horario?-1:1;
  });

  var opConc=ops.filter(function(op){return op.status==='concluida'&&op.data===hj;}).sort(function(a,b){
    var ba=b.concluidaEm||'',aa=a.concluidaEm||'';
    return ba>aa?1:aa>ba?-1:0;
  });
  var opAdiada=ops.filter(function(op){return op.status==='adiada';});
  var opCanc=ops.filter(function(op){return op.status==='cancelada';});
  var opFutura=ops.filter(function(op){return op.status==='futura';}).sort(function(a,b){return(a.data||'').localeCompare(b.data||'');});

  // Data display
  var dObj=new Date(hj+'T12:00:00');
  var DIAS_SEM=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  var MESES_NM=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var dataDisplay=DIAS_SEM[dObj.getDay()]+', '+dObj.getDate()+' de '+MESES_NM[dObj.getMonth()]+' de '+dObj.getFullYear();

  var hora=_doHora();
  var dentroHorario=hora>='06:00'&&hora<='18:00';
  var opAFazer=opHoje.filter(function(op){return op.status==='hoje';});
  var opAtrasadas=opHoje.filter(function(op){return op.status==='pendente';});
  var total=opAFazer.length+opConc.length;
  var pct=total>0?Math.round((opConc.length/total)*100):0;

  // Header stats
  var headerStats=el('div',{style:{
    display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap',
    background:'var(--bg2)',borderRadius:'10px',padding:'14px 18px',
    border:'1px solid var(--border)',marginBottom:'12px',
  }},[
    el('div',{style:{flex:'1',minWidth:'180px'}},[
      el('div',{style:{fontWeight:'700',fontSize:'15px',color:'var(--text)'}},dataDisplay),
      el('div',{style:{fontSize:'12px',color:dentroHorario?'var(--green)':'var(--text3)',marginTop:'3px'}},
        dentroHorario?('⏰ '+hora+' · Horário comercial ativo'):('⏰ '+hora+' · Fora do horário comercial (06:00–18:00)')),
    ]),
    el('div',{style:{display:'flex',gap:'14px',alignItems:'center',flexWrap:'wrap'}},[
      defs.length>0?el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'22px',fontWeight:'800',color:'var(--text2)',lineHeight:'1'}},String(defs.length)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Rotinas'),
      ]):null,
      el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'22px',fontWeight:'800',color:'var(--gold)',lineHeight:'1'}},String(opAFazer.length)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'A fazer'),
      ]),
      el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'22px',fontWeight:'800',color:'var(--green)',lineHeight:'1'}},String(opConc.length)),
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Concluídas'),
      ]),
      opAtrasadas.length>0?el('div',{style:{textAlign:'center'}},[
        el('div',{style:{fontSize:'22px',fontWeight:'800',color:'var(--red)',lineHeight:'1'}},String(opAtrasadas.length)),
        el('div',{style:{fontSize:'11px',color:'var(--red)',marginTop:'2px'}},'Atrasadas'),
      ]):null,
      total>0?el('div',{style:{
        background:pct===100?'var(--green)':pct>=50?'var(--gold)':'var(--bg3)',
        color:pct===100||pct<50?'var(--text)':'#000',
        borderRadius:'20px',padding:'6px 16px',fontWeight:'800',fontSize:'15px',
      }},pct+'%'):null,
    ].filter(Boolean)),
  ]);

  // Barra de progresso
  var progBar=total>0?el('div',{style:{height:'5px',borderRadius:'3px',background:'var(--bg3)',marginBottom:'12px',overflow:'hidden'}},[
    el('div',{style:{width:pct+'%',height:'100%',borderRadius:'3px',background:pct===100?'var(--green)':'var(--gold)',transition:'width .5s ease'}}),
  ]):null;

  // Action bar
  var actionBar=el('div',{style:{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}},[
    btn('btn-primary','+ Tarefa Rápida',function(){setState({dailyModal:{oneOff:true}});}),
    btn('btn-ghost','📅 Calendário',function(){setState({dailyCalModal:{mes:hj.slice(0,7)}});}),
    btn('btn-ghost','+ Nova Rotina Diária',function(){setState({dailyModal:{}});}),
    btn('btn-ghost','⚙️ Rotinas',function(){setState({dailyTemplatesOpen:true});}),
  ]);

  // Kanban: Tarefa Futura → Programação → Tarefa do Dia → Concluídas → Adiadas → Canceladas
  var board=el('div',{style:{
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',
    gap:'12px',alignItems:'start',
  }},[
    _doColuna('Tarefa Futura','🔮','var(--blue)',opFutura.map(_doCard)),
    _doColuna('Programação','📅','var(--text2)',defs.map(_doDefCard)),
    _doColuna('Tarefa do Dia','📋','var(--gold)',opHoje.map(_doCard)),
    _doColuna('Concluídas','✅','var(--green)',opConc.map(_doCard)),
    _doColuna('Adiadas','↻','var(--blue)',opAdiada.map(_doCard)),
    _doColuna('Canceladas','🚫','var(--text3)',opCanc.map(_doCard)),
  ]);

  return div('',[
    div('page-header',[
      el('h1',{},'Daily Operation'),
      el('p',{},'Central de operações · Programação → Tarefa do Dia · 06:00–18:00'),
    ]),
    headerStats,
    progBar,
    actionBar,
    board,
  ].filter(Boolean));
}

// ── faixa de notificação global ───────────────────────────────────────────────
function _doCheckBanner(){
  var pf=state.profile;
  var alertas=(state.dailyOps||[]).filter(function(op){
    return op.profile===pf&&_doDeveAlertar(op);
  }).sort(function(a,b){
    if(!a.horario)return 1;if(!b.horario)return -1;
    return a.horario<b.horario?-1:1;
  });

  var existente=document.getElementById('do-global-banner');

  if(!alertas.length){
    if(existente)existente.remove();
    return;
  }

  var op=alertas[0];
  var hora=_doHora();
  var h=op.horario.split(':'),taMin=parseInt(h[0])*60+parseInt(h[1]);
  var n=hora.split(':'),nowMin=parseInt(n[0])*60+parseInt(n[1]);
  var diff=taMin-nowMin;
  var msg=diff>0
    ?'⏰  Daily Operation · Tarefa em '+diff+' min: '+op.nome+' · '+op.horario
    :'🔔  Daily Operation · HORA DA TAREFA: '+op.nome+' · '+op.horario;

  if(alertas.length>1)msg+='  (+'+( alertas.length-1)+' tarefa'+(alertas.length>2?'s':'')+')';

  if(!existente){
    var banner=document.createElement('div');
    banner.id='do-global-banner';
    Object.assign(banner.style,{
      position:'fixed',top:'0',left:'0',right:'0',zIndex:'99999',
      background:'linear-gradient(90deg,#b8860b,var(--gold,#e5ac00),#b8860b)',
      color:'#000',padding:'7px 16px',
      fontSize:'13px',fontWeight:'700',letterSpacing:'.3px',
      textAlign:'center',cursor:'pointer',
      boxShadow:'0 2px 8px rgba(0,0,0,.35)',
      animation:'doPulse 2s ease-in-out infinite',
    });
    banner.onclick=function(){if(typeof setState==='function')setState({page:'daily'});};
    document.body.appendChild(banner);
    existente=banner;
  }
  existente.textContent=msg;
}
