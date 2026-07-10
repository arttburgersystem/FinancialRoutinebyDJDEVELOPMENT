// ── DADOS DA EMPRESA ─────────────────────────────────────────────────────────

function renderEmpresa() {
  var pf   = PROFILES.find(function(p){ return p.id === state.profile; }) || {label:'Empresa', color:'var(--gold)', icon:'🏢'};
  var d    = ((state.empresaData || {})[state.profile]) || {};
  var pfColor = pf.color || 'var(--gold)';

  var EMP_FIELDS = [
    'nomeFantasia','razaoSocial','cnpj','inscricaoEstadual','inscricaoMunicipal',
    'responsavel','telefone','celular','email','site','instagram','facebook',
    'cep','rua','numero','complemento','bairro','cidade','estado',
    'pix','tipoPix','banco','agencia','conta','horario','obs',
  ];

  function gf(id){ var e=document.getElementById('emp-'+id); return e?e.value:''; }

  function snapEmpresa(){
    var r={};
    EMP_FIELDS.forEach(function(f){ var e=document.getElementById('emp-'+f); if(e) r[f]=e.value; });
    return r;
  }

  function mergeAndSet(extra){
    var snap   = snapEmpresa();
    var merged = Object.assign({}, d, snap, extra);
    var empData= Object.assign({}, state.empresaData||{});
    empData[state.profile] = merged;
    setState({empresaData: empData});
  }

  function salvarEmpresa(){
    var snap   = snapEmpresa();
    var merged = Object.assign({}, d, snap, {_salvoEm: new Date().toISOString()});
    var empData= Object.assign({}, state.empresaData||{});
    empData[state.profile] = merged;
    lsSet('empresaData', empData);
    setState({empresaData: empData});
    try{ fbPut('/empresaData', empData); }catch(e){}
    logAudit('atualizou dados da empresa', pf.label);
    showToast('Dados da empresa salvos!','success');
  }

  function buscarCnpj(){
    var cnpj=(gf('cnpj')||'').replace(/\D/g,'');
    if(cnpj.length!==14){showToast('CNPJ deve ter 14 dígitos','error');return;}
    var b=document.getElementById('emp-cnpj-btn');
    if(b){b.textContent='⏳';b.disabled=true;}
    fetch('https://brasilapi.com.br/api/cnpj/v1/'+cnpj)
      .then(function(r){ if(!r.ok)throw new Error(); return r.json(); })
      .then(function(data){
        var cnpjFmt=cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5');
        var tel=(data.telefone||'').replace(/\D/g,'');
        var telFmt=tel.length===10?tel.replace(/^(\d{2})(\d{4})(\d{4})$/,'($1) $2-$3'):
                   tel.length===11?tel.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3'):(data.telefone||'');
        var cepNum=(data.cep||'').replace(/\D/g,'');
        var cepFmt=cepNum.length===8?cepNum.replace(/^(\d{5})(\d{3})$/,'$1-$2'):(data.cep||'');
        function tc(s){if(!s)return'';return s.toUpperCase()===s?s.replace(/\b\w/g,function(c){return c.toUpperCase();}):s;}
        mergeAndSet({
          cnpj: cnpjFmt,
          razaoSocial: data.razao_social||'',
          nomeFantasia: (data.nome_fantasia&&data.nome_fantasia.trim())?data.nome_fantasia.trim():(gf('nomeFantasia')||''),
          telefone: telFmt||(gf('telefone')||''),
          email: data.email||(gf('email')||''),
          cep: cepFmt||(gf('cep')||''),
          rua: tc(data.logradouro)||(gf('rua')||''),
          numero: data.numero||(gf('numero')||''),
          complemento: data.complemento||(gf('complemento')||''),
          bairro: tc(data.bairro)||(gf('bairro')||''),
          cidade: tc(data.municipio)||(gf('cidade')||''),
          estado: data.uf||(gf('estado')||''),
        });
        showToast('Dados do CNPJ carregados! Confira e salve.');
      })
      .catch(function(){
        var b2=document.getElementById('emp-cnpj-btn');
        if(b2){b2.textContent='🔍 Consultar';b2.disabled=false;}
        showToast('CNPJ não encontrado ou serviço indisponível','error');
      });
  }

  function buscarCep(){
    var cep=(gf('cep')||'').replace(/\D/g,'');
    if(cep.length!==8){showToast('CEP inválido','error');return;}
    var b=document.getElementById('emp-cep-btn');
    if(b){b.textContent='⏳';b.disabled=true;}
    fetch('https://viacep.com.br/ws/'+cep+'/json/')
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.erro){showToast('CEP não encontrado','error');return;}
        mergeAndSet({
          rua: data.logradouro||(gf('rua')||''),
          bairro: data.bairro||(gf('bairro')||''),
          cidade: data.localidade||(gf('cidade')||''),
          estado: data.uf||(gf('estado')||''),
        });
        showToast('Endereço encontrado!');
        setTimeout(function(){var n=document.getElementById('emp-numero');if(n)n.focus();},80);
      })
      .catch(function(){
        var b2=document.getElementById('emp-cep-btn');
        if(b2){b2.textContent='Buscar';b2.disabled=false;}
        showToast('Erro ao buscar CEP','error');
      });
  }

  // ── UI helpers ───────────────────────────────────────────────────────────────

  function inp(id,type,ph,val){
    var i=el('input',{class:'form-input',type:type||'text',id:'emp-'+id,placeholder:ph||''});
    i.value=val!==undefined?String(val):'';
    return i;
  }
  function fg(label,input){ return div('form-group',[el('label',{class:'form-label'},label),input]); }
  function grid2(a,b){ var g=el('div',{},[a,b]); g.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:12px;'; return g; }

  function card(title, icon, children){
    var hd=el('div',{});
    hd.style.cssText='display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid var(--border);';
    hd.textContent=icon+' '+title;
    var wrap=el('div',{class:'card'},[hd].concat(children));
    wrap.style.marginBottom='16px';
    return wrap;
  }

  // ── Campos ──────────────────────────────────────────────────────────────────

  var PIX_TIPOS=[{v:'cnpj',l:'CNPJ'},{v:'cpf',l:'CPF'},{v:'telefone',l:'Telefone'},{v:'email',l:'E-mail'},{v:'aleatorio',l:'Chave aleatória'}];
  var pixTipoSel=el('select',{class:'form-input',id:'emp-tipoPix'},
    PIX_TIPOS.map(function(t){var o=el('option',{value:t.v},t.l);if(t.v===(d.tipoPix||'cnpj'))o.selected=true;return o;}));

  var dica=el('div',{style:{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.25)',borderRadius:'6px',padding:'8px 12px',marginBottom:'14px',fontSize:'12px',color:'var(--blue)'}},[
    el('strong',{},'💡 Dica: '),
    el('span',{},'Digite o CNPJ e clique em "🔍 Consultar" para preencher os dados automaticamente.'),
  ]);

  var cnpjRow=el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'14px'}},[
    el('div',{style:{flex:'1'}},[el('label',{class:'form-label'},'CNPJ'),inp('cnpj','text','00.000.000/0000-00',d.cnpj||'')]),
    el('button',{id:'emp-cnpj-btn',class:'btn-primary',style:{whiteSpace:'nowrap',padding:'8px 14px',fontSize:'12px',flexShrink:'0'},onclick:buscarCnpj},'🔍 Consultar'),
  ]);

  var cepRow=el('div',{style:{display:'flex',gap:'8px',alignItems:'flex-end',marginBottom:'14px'}},[
    el('div',{style:{flex:'1'}},[el('label',{class:'form-label'},'CEP'),inp('cep','text','00000-000',d.cep||'')]),
    el('button',{id:'emp-cep-btn',class:'btn-ghost',style:{whiteSpace:'nowrap',padding:'8px 14px'},onclick:buscarCep},'Buscar'),
  ]);

  // ── Cabeçalho visual ────────────────────────────────────────────────────────

  function _abrirLogoUpload(){
    var fi=document.createElement('input');fi.type='file';fi.accept='image/*';
    fi.onchange=function(e){
      var f=e.target.files[0];if(!f)return;
      if(f.size>2*1024*1024){showToast('Imagem muito grande — máx. 2 MB','error');return;}
      var reader=new FileReader();
      reader.onload=function(ev){
        var empData=Object.assign({},state.empresaData||{});
        empData[state.profile]=Object.assign({},d,{logoBase64:ev.target.result});
        lsSet('empresaData',empData);
        setState({empresaData:empData});
        try{fbPut('/empresaData',empData);}catch(e2){}
        showToast('Logo salva!','success');
      };
      reader.readAsDataURL(f);
    };
    fi.click();
  }

  var headerCard=el('div',{});
  headerCard.style.cssText='display:flex;align-items:center;gap:16px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px;';

  var avt=el('div',{});
  avt.title='Clique para adicionar / trocar a logo';
  avt.style.cssText='width:72px;height:72px;border-radius:16px;flex-shrink:0;cursor:pointer;position:relative;overflow:hidden;transition:opacity .15s;';
  if(d.logoBase64){
    var logoImg=document.createElement('img');
    logoImg.src=d.logoBase64;
    logoImg.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:16px;display:block;';
    var logoOv=el('div',{});
    logoOv.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;border-radius:16px;font-size:11px;font-weight:700;color:#fff;letter-spacing:.03em;';
    logoOv.textContent='Trocar logo';
    avt.onmouseenter=function(){logoOv.style.opacity='1';};
    avt.onmouseleave=function(){logoOv.style.opacity='0';};
    avt.appendChild(logoImg);avt.appendChild(logoOv);
  } else {
    avt.style.cssText+='background:'+pfColor+'15;border:2px dashed '+pfColor+'55;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;';
    var avtIco=el('div',{style:{fontSize:'24px',lineHeight:'1'}});avtIco.textContent='📷';
    var avtTxt=el('div',{style:{fontSize:'9px',fontWeight:'700',color:pfColor,letterSpacing:'.05em',textTransform:'uppercase',opacity:'.7'}});avtTxt.textContent='Logo';
    avt.appendChild(avtIco);avt.appendChild(avtTxt);
  }
  avt.onclick=_abrirLogoUpload;

  var headRight=el('div',{style:{display:'flex',flexDirection:'column',gap:'4px'}});
  if(d.logoBase64){
    var remBtn=el('button',{style:{background:'none',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text3)',fontSize:'11px',padding:'3px 8px',cursor:'pointer',fontFamily:'inherit',marginTop:'4px'}});
    remBtn.textContent='✕ Remover logo';
    remBtn.onclick=function(e){
      e.stopPropagation();
      var empData=Object.assign({},state.empresaData||{});
      empData[state.profile]=Object.assign({},d);
      delete empData[state.profile].logoBase64;
      lsSet('empresaData',empData);
      setState({empresaData:empData});
      try{fbPut('/empresaData',empData);}catch(e2){}
      showToast('Logo removida','error');
    };
    headRight.appendChild(remBtn);
  }

  var headInfo=el('div',{style:{flex:'1'}},[
    el('div',{style:{fontWeight:'700',fontSize:'18px',marginBottom:'2px'}},d.nomeFantasia||pf.label),
    d.razaoSocial?el('div',{style:{fontSize:'12px',color:'var(--text3)',marginBottom:'2px'}},d.razaoSocial):null,
    el('div',{style:{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'4px'}},
      [d.cnpj?el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'CNPJ: '+d.cnpj):null,
       d.cidade?el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'📍 '+d.cidade+(d.estado?' / '+d.estado:'')):null,
       d.celular?el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'📱 '+d.celular):null,
      ].filter(Boolean)),
    headRight,
  ].filter(Boolean));
  headerCard.appendChild(avt);
  headerCard.appendChild(headInfo);

  // ── Rodapé com data do último save ──────────────────────────────────────────

  var salvoInfo=d._salvoEm
    ?el('span',{style:{fontSize:'11px',color:'var(--text3)'}},'✓ Salvo em '+new Date(d._salvoEm).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}))
    :el('span',{});

  var saveFooter=el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',marginTop:'8px',padding:'16px 0 4px'}},[
    salvoInfo,
    el('button',{class:'btn-primary',style:{padding:'12px 32px',fontSize:'14px',fontWeight:'700'},onclick:salvarEmpresa},'💾 Salvar dados da empresa'),
  ]);

  // ── Render final ────────────────────────────────────────────────────────────

  return el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},pf.icon+' Dados da Empresa'),
        el('p',{class:'page-sub'},'Informações cadastrais, contatos, endereço e dados bancários do perfil '+pf.label),
      ]),
    ]),

    headerCard,

    card('Identificação','🏢',[
      dica,
      cnpjRow,
      fg('Nome Fantasia / Apelido', inp('nomeFantasia','text','Como a empresa é conhecida',d.nomeFantasia||'')),
      fg('Razão Social', inp('razaoSocial','text','Nome jurídico completo',d.razaoSocial||'')),
      grid2(
        fg('Inscrição Estadual', inp('inscricaoEstadual','text','IE',d.inscricaoEstadual||'')),
        fg('Inscrição Municipal', inp('inscricaoMunicipal','text','IM / ISS',d.inscricaoMunicipal||''))
      ),
    ]),

    card('Contato','📞',[
      fg('Responsável / Proprietário', inp('responsavel','text','Nome do responsável',d.responsavel||'')),
      grid2(
        fg('Telefone fixo', inp('telefone','tel','(00) 0000-0000',d.telefone||'')),
        fg('Celular / WhatsApp', inp('celular','tel','(00) 00000-0000',d.celular||''))
      ),
      fg('E-mail', inp('email','email','contato@empresa.com.br',d.email||'')),
      fg('Site', inp('site','url','https://www.site.com.br',d.site||'')),
      grid2(
        fg('Instagram', inp('instagram','text','@perfil',d.instagram||'')),
        fg('Facebook', inp('facebook','text','facebook.com/pagina',d.facebook||''))
      ),
    ]),

    card('Endereço','📍',[
      cepRow,
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 90px',gap:'12px',marginBottom:'12px'}},[
        fg('Rua / Avenida', inp('rua','text','Logradouro',d.rua||'')),
        fg('Número', inp('numero','text','Nº',d.numero||'')),
      ]),
      grid2(
        fg('Complemento', inp('complemento','text','Sala, Loja, Andar...',d.complemento||'')),
        fg('Bairro', inp('bairro','text','Bairro',d.bairro||''))
      ),
      el('div',{style:{display:'grid',gridTemplateColumns:'1fr 70px',gap:'12px'}},[
        fg('Cidade', inp('cidade','text','Cidade',d.cidade||'')),
        fg('UF', inp('estado','text','UF',d.estado||'')),
      ]),
    ]),

    card('Bancário & PIX','💳',[
      grid2(fg('Tipo da chave PIX', pixTipoSel), fg('Chave PIX', inp('pix','text','Chave PIX',d.pix||''))),
      fg('Banco', inp('banco','text','Nome do banco',d.banco||'')),
      grid2(
        fg('Agência', inp('agencia','text','0000',d.agencia||'')),
        fg('Conta corrente', inp('conta','text','00000-0',d.conta||''))
      ),
    ]),

    card('Funcionamento','🕐',[
      div('form-group',[
        el('label',{class:'form-label'},'Horário de funcionamento'),
        el('textarea',{class:'form-input',id:'emp-horario',rows:'3',
          placeholder:'Ex: Seg–Sex: 11h às 22h\nSáb: 11h às 23h\nDom: 12h às 21h',
          style:{resize:'vertical'}},d.horario||''),
      ]),
      div('form-group',[
        el('label',{class:'form-label'},'Observações gerais'),
        el('textarea',{class:'form-input',id:'emp-obs',rows:'2',
          placeholder:'Informações adicionais, acordos, notas...',
          style:{resize:'vertical'}},d.obs||''),
      ]),
    ]),

    card('Backup & Segurança','🔒',[
      el('p',{style:{fontSize:'13px',color:'var(--text2)',marginBottom:'16px',lineHeight:'1.6'}},
        'Exporte todos os dados do sistema em JSON para guardar uma cópia de segurança. '+
        'Use a importação para restaurar em caso de perda ou migrar para outro dispositivo.'
      ),
      el('div',{style:{display:'flex',gap:'12px',flexWrap:'wrap'}},[
        el('button',{class:'btn-primary',style:{gap:'6px',display:'flex',alignItems:'center'},onclick:function(){
          _backupExportar();
        }},['💾 Exportar backup JSON']),
        el('button',{class:'btn-ghost',style:{gap:'6px',display:'flex',alignItems:'center'},onclick:function(){
          _backupImportar();
        }},['📂 Importar backup JSON']),
      ]),
      el('div',{style:{marginTop:'12px',padding:'10px 14px',background:'var(--bg3)',borderRadius:'8px',fontSize:'12px',color:'var(--text3)',lineHeight:'1.5'}},[
        el('strong',{},'O backup inclui: '),
        'contas a pagar/receber, receitas, bancos, tarefas, metas, funcionários, freelancers, produtos, estoque, orçamentos, dados da empresa e configurações.'
      ]),
    ]),

    saveFooter,
  ]);
}

// ── BACKUP EXPORTAR / IMPORTAR ────────────────────────────────────────────────

function _backupExportar() {
  var CHAVES = [
    'contas','receitas','bancos','tarefas','metas','orcamentos',
    'funcionarios','ferias','exames','freelancers','servicosFreelancer','especialidades',
    'produtos','complementos','estCategorias','movEstoque','estoqueItens',
    'empresaData','setoresImpressao','administradores','notas',
    'fechamentosCaixa','caixaVals',
  ];
  var backup = {
    _versao: '1.0',
    _exportadoEm: new Date().toISOString(),
    _perfil: state.profile,
    dados: {},
  };
  CHAVES.forEach(function(k) {
    backup.dados[k] = lsGet(k, null);
  });
  var json = JSON.stringify(backup, null, 2);
  var blob = new Blob([json], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var data = new Date().toLocaleDateString('sv-SE');
  a.href = url;
  a.download = 'backup-djfinance-' + data + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  showToast('Backup exportado com sucesso!', 'success');
}

function _backupImportar() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var backup = JSON.parse(ev.target.result);
        if (!backup || !backup.dados) throw new Error('Formato inválido');
        if (!confirm(
          'Importar backup de ' + (backup._exportadoEm ? new Date(backup._exportadoEm).toLocaleString('pt-BR') : 'data desconhecida') + '?\n\n' +
          'ATENÇÃO: os dados atuais serão substituídos pelos dados do backup.\n\n' +
          'Clique em OK para confirmar.'
        )) return;
        Object.keys(backup.dados).forEach(function(k) {
          if (backup.dados[k] !== null && backup.dados[k] !== undefined) {
            lsSet(k, backup.dados[k]);
          }
        });
        // Recarrega o estado principal
        setState({
          contas:          lsGet('contas',[]),
          receitas:        lsGet('receitas',[]),
          bancos:          lsGet('bancos',[]),
          tarefas:         lsGet('tarefas',[]),
          metas:           lsGet('metas',[]),
          orcamentos:      lsGet('orcamentos',[]),
          produtos:        lsGet('produtos',[]),
          complementos:    lsGet('complementos',[]),
          estCategorias:   lsGet('estCategorias',[]),
          movEstoque:      lsGet('movEstoque',[]),
          administradores: lsGet('administradores',[]),
          empresaData:     lsGet('empresaData',{}),
          notas:           lsGet('notas',[]),
        });
        showToast('Backup importado com sucesso! Sincronizando...', 'success', 3000);
        scheduleSave();
      } catch(err) {
        showToast('Arquivo inválido ou corrompido.', 'error');
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  setTimeout(function(){ document.body.removeChild(input); }, 2000);
}
