// ── SETORES DE IMPRESSÃO & CONFIGURAÇÃO DE IMPRESSORAS ───────────────────────

var _impTab = 'setores'; // 'setores' | 'config' | 'modelo' | 'impressoras'

// ── Gera HTML do cupom para impressão ────────────────────────────────────────
function gerarHtmlCupom(empresa, cfg, setor, itens, opcoes) {
  var largura = (setor && setor.largura) || cfg.largura || '80mm';
  var mm = parseInt(largura) || 80;
  var iens = itens || [];
  opcoes = opcoes || {};

  var logoHtml = '';
  if (cfg.mostrarLogo && cfg.logoUrl) {
    logoHtml = '<div style="text-align:center;margin-bottom:6px;">'
      + '<img src="'+cfg.logoUrl+'" style="max-width:'+(mm==='58'?'42mm':'55mm')+';max-height:30mm;object-fit:contain;" />'
      + '</div>';
  }

  var cnpjFmt = (empresa.cnpj||'').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || empresa.cnpj || '';

  var endParts = [empresa.rua,empresa.numero,empresa.bairro,empresa.cidade,empresa.estado].filter(Boolean);
  var enderecoHtml = '';
  if (cfg.mostrarEndereco && endParts.length) {
    enderecoHtml = '<div>'+endParts.join(', ')+'</div>';
  }

  var contatoHtml = '';
  if ((empresa.telefone||empresa.celular)) {
    contatoHtml = '<div>'+(empresa.celular||empresa.telefone||'')+'</div>';
  }

  var cnpjHtml = '';
  if (cfg.mostrarCnpj && (cnpjFmt||empresa.cnpj)) {
    cnpjHtml = '<div>CNPJ: '+(cnpjFmt||empresa.cnpj)+'</div>';
  }

  var setorHtml = '';
  if (setor && setor.nome) {
    setorHtml = '<div class="destaque">— '+setor.nome.toUpperCase()+' —</div>';
  }

  var itensHtml = '';
  if (iens.length) {
    itensHtml = iens.map(function(i){
      var nome = i.nome||i.produto||'Item';
      var qtd  = (i.qtd||i.quantidade||1).toString().padEnd(3,' ');
      var preco = 'R$ '+parseFloat(i.precoVenda||i.preco||0).toFixed(2).replace('.',',');
      var total = 'R$ '+( parseFloat(i.precoVenda||i.preco||0) * parseFloat(i.qtd||i.quantidade||1) ).toFixed(2).replace('.',',');
      return '<tr>'
        +'<td style="padding:1px 0;width:60%">'+nome+'</td>'
        +'<td style="text-align:center;width:10%">'+qtd+'</td>'
        +'<td style="text-align:right;width:15%">'+preco+'</td>'
        +'<td style="text-align:right;width:15%">'+total+'</td>'
        +'</tr>';
    }).join('');
  } else {
    itensHtml = '<tr><td colspan="4" style="text-align:center;padding:4px 0;color:#666">— Impressão de teste —</td></tr>';
  }

  var totalGeral = iens.reduce(function(acc,i){
    return acc + parseFloat(i.precoVenda||i.preco||0) * parseFloat(i.qtd||i.quantidade||1);
  }, 0);
  var totalHtml = iens.length ? ('<tr><td colspan="3" style="text-align:right;font-weight:bold;padding-top:3px">TOTAL</td>'
    +'<td style="text-align:right;font-weight:bold;padding-top:3px">R$ '+totalGeral.toFixed(2).replace('.',',')+'</td></tr>') : '';

  var dataHora = new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',
    day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

  var rodapeMsgs = cfg.rodape || 'Obrigado pela preferência!';
  var rodapeHtml = rodapeMsgs.split('\n').map(function(l){return '<div>'+l+'</div>';}).join('');

  return '<!DOCTYPE html>'
+ '<html><head><meta charset="UTF-8">'
+ '<style>'
+ '* { margin:0; padding:0; box-sizing:border-box; }'
+ 'body { font-family:"Courier New",Courier,monospace; font-size:11px; '
  + 'width:'+largura+'; color:#000; background:#fff; }'
+ '@page { size:'+largura+' auto; margin:4mm 3mm 6mm; }'
+ '@media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }'
+ 'h1 { font-size:14px; font-weight:bold; text-align:center; margin:2px 0; }'
+ '.center { text-align:center; }'
+ '.bold { font-weight:bold; }'
+ '.destaque { text-align:center; font-weight:bold; font-size:12px; margin:3px 0; letter-spacing:1px; }'
+ '.dash { border-top:1px dashed #000; margin:5px 0; }'
+ '.corte { border-top:1px dashed #000; margin-top:10px; text-align:center; font-size:9px; color:#666; padding-top:2px; }'
+ 'table { width:100%; border-collapse:collapse; }'
+ 'th { font-size:9px; font-weight:bold; border-bottom:1px solid #000; padding:1px 0; text-align:left; }'
+ 'th:nth-child(2){ text-align:center; }'
+ 'th:nth-child(3),th:nth-child(4){ text-align:right; }'
+ 'td { font-size:11px; vertical-align:top; }'
+ '.footer { text-align:center; margin-top:8px; font-size:10px; }'
+ '.data { text-align:center; font-size:9px; color:#444; margin:2px 0; }'
+ '</style>'
+ '</head><body>'
+ logoHtml
+ '<div class="center"><h1>'+(empresa.nomeFantasia||empresa.razaoSocial||'Estabelecimento')+'</h1>'
+ enderecoHtml
+ contatoHtml
+ cnpjHtml
+ '</div>'
+ '<div class="data">'+dataHora+'</div>'
+ (opcoes.pedidoNum ? '<div class="destaque">PEDIDO #'+opcoes.pedidoNum+'</div>' : '')
+ setorHtml
+ '<div class="dash"></div>'
+ '<table>'
+ '<thead><tr>'
+ '<th>ITEM</th><th style="text-align:center">QTD</th><th style="text-align:right">UNIT.</th><th style="text-align:right">TOTAL</th>'
+ '</tr></thead>'
+ '<tbody>'+itensHtml+'</tbody>'
+ (totalHtml ? '<tfoot>'+totalHtml+'</tfoot>' : '')
+ '</table>'
+ '<div class="dash"></div>'
+ '<div class="footer">'+rodapeHtml+'</div>'
+ '<div class="corte">✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</div>'
+ '</body></html>';
}

// ── Abre janela de impressão ──────────────────────────────────────────────────
function imprimirCupom(setor, itens, opcoes) {
  var cfg     = state.configImpressao || {};
  var empresa = ((state.empresaData||{})[state.profile]) || {};
  var html    = gerarHtmlCupom(empresa, cfg, setor, itens, opcoes);

  var win = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
  if (!win) { showToast('Popup bloqueado — libere pop-ups para este site','error'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(function(){ win.print(); }, 600);
}

// ── Tab Impressoras ───────────────────────────────────────────────────────────
function renderTabImpressoras() {
  var aviso = el('div',{});
  aviso.style.cssText = 'background:var(--gold-dim);border:1px solid var(--gold);border-radius:10px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:var(--text);';
  aviso.innerHTML = '<b>ℹ️ Como funciona a detecção de impressoras</b><br>'
    +'Aplicações web não conseguem listar impressoras diretamente por segurança do navegador. '
    +'Ao clicar em "Buscar Impressoras", o diálogo de impressão do sistema será aberto — '
    +'ali você verá todas as impressoras instaladas (USB, rede/WiFi, compartilhadas). '
    +'Selecione a padrão e feche o diálogo. Em seguida, adicione-a manualmente abaixo.';

  var buscarBtn = el('button',{class:'btn-primary',style:{marginBottom:'16px'}});
  buscarBtn.textContent = '🔍 Buscar Impressoras (abre diálogo do sistema)';
  buscarBtn.onclick = function(){
    // Abre print dialog para o usuário ver as impressoras disponíveis
    var w = window.open('','_djfPrintDisc','width=1,height=1,top=-100');
    if(w){
      w.document.write('<html><body><script>window.onload=function(){window.print();window.close()}<\/script></body></html>');
      w.document.close();
    } else {
      window.print();
    }
  };

  // Lista de impressoras cadastradas manualmente
  var imps = state.impressorasCadastradas || [];

  var addBtn = btn('btn-secondary','+ Adicionar impressora manualmente', function(){
    setState({impModal:{nome:'',tipo:'usb',ip:'',porta:'9100',padrao:false}});
  });

  var impModal = null;
  if(state.impModal) {
    var im = state.impModal;
    var nomeI = el('input',{class:'form-input',value:im.nome||'',placeholder:'Ex: Bematech MP-4200 TH',oninput:function(){im.nome=this.value;}});
    var tipoI = el('select',{class:'form-input',onchange:function(){im.tipo=this.value;setState({impModal:Object.assign({},state.impModal,{tipo:this.value})});}},
      [
        el('option',{value:'usb',selected:im.tipo==='usb'},'USB'),
        el('option',{value:'rede',selected:im.tipo==='rede'},'Rede / WiFi / TCP-IP'),
        el('option',{value:'compartilhada',selected:im.tipo==='compartilhada'},'Compartilhada (Windows)'),
        el('option',{value:'bluetooth',selected:im.tipo==='bluetooth'},'Bluetooth'),
      ]);
    var ipI = el('input',{class:'form-input',value:im.ip||'',placeholder:im.tipo==='compartilhada'?'\\\\SERVIDOR\\IMPRESSORA':'192.168.1.100',oninput:function(){im.ip=this.value;}});
    var portaI = el('input',{class:'form-input',value:im.porta||'9100',placeholder:'9100',oninput:function(){im.porta=this.value;}});
    var padraoI = el('input',{type:'checkbox',id:'_imppadrao'});
    if(im.padrao) padraoI.checked=true;
    padraoI.onchange=function(){im.padrao=this.checked;};

    function salvarImp() {
      if(!(im.nome||'').trim()){showToast('Informe o nome da impressora','error');return;}
      var nova = {id:im.id||uid(),nome:im.nome.trim(),tipo:im.tipo||'usb',ip:im.ip||'',porta:im.porta||'9100',padrao:im.padrao||false,profile:state.profile};
      var arr = (state.impressorasCadastradas||[]);
      if(im.id) {
        arr = arr.map(function(x){return x.id===im.id?Object.assign({},x,nova):x;});
      } else {
        if(nova.padrao) arr=arr.map(function(x){return Object.assign({},x,{padrao:false});});
        arr = arr.concat([nova]);
      }
      lsSet('impressorasCadastradas',arr);
      setState({impressorasCadastradas:arr,impModal:null});
      scheduleSave();
      showToast('Impressora salva!','success');
    }

    impModal = el('div',{class:'modal-overlay',onclick:function(e){if(e.target===this)setState({impModal:null});}},
      el('div',{class:'modal',style:{maxWidth:'480px'}},[
        el('div',{class:'modal-header'},[
          el('h3',{class:'modal-title'},'🖨️ '+(im.id?'Editar':'Adicionar')+' Impressora'),
          el('button',{class:'modal-close',onclick:function(){setState({impModal:null});}}, '✕'),
        ]),
        el('div',{class:'modal-body'},[
          el('div',{style:{display:'grid',gridTemplateColumns:'1fr',gap:'12px'}},[
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Nome / Modelo *'),nomeI]),
            el('div',{class:'form-group'},[el('label',{class:'form-label'},'Tipo de conexão'),tipoI]),
            im.tipo!=='usb' ? el('div',{class:'form-group'},[el('label',{class:'form-label'},im.tipo==='compartilhada'?'Caminho de rede (\\\\Servidor\\Impres.)':'Endereço IP ou Hostname'),ipI]) : null,
            im.tipo==='rede' ? el('div',{class:'form-group'},[el('label',{class:'form-label'},'Porta TCP (padrão 9100)'),portaI]) : null,
            el('div',{style:{display:'flex',gap:'8px',alignItems:'center',padding:'4px 0'}},[padraoI,el('label',{for:'_imppadrao',style:{cursor:'pointer',fontSize:'12px'}},'Definir como impressora padrão')]),
          ].filter(Boolean)),
        ]),
        el('div',{class:'modal-footer'},[
          btn('btn-secondary','Cancelar',function(){setState({impModal:null});}),
          btn('btn-primary','💾 Salvar',salvarImp),
        ]),
      ])
    );
  }

  var lista = imps.filter(function(i){return i.profile===state.profile;});
  var listaEl = lista.length === 0
    ? el('div',{style:{padding:'32px',textAlign:'center',color:'var(--text3)',background:'var(--bg3)',borderRadius:'10px',border:'1px dashed var(--border)'}},'Nenhuma impressora cadastrada. Clique em "+ Adicionar" para registrar.')
    : el('div',{style:{display:'flex',flexDirection:'column',gap:'8px'}},
        lista.map(function(imp){
          var TIPO_ICON = {usb:'🔌',rede:'🌐',compartilhada:'🖧',bluetooth:'📡'};
          var card = el('div',{style:{background:'var(--bg2)',border:'1px solid '+(imp.padrao?'var(--gold)':'var(--border)'),borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'12px'}});
          var info = el('div',{style:{flex:'1'}});
          var nomeEl = el('div',{style:{fontWeight:'700',fontSize:'13px',color:'var(--text)',display:'flex',alignItems:'center',gap:'6px'}});
          nomeEl.innerHTML=(TIPO_ICON[imp.tipo]||'🖨️')+' '+imp.nome+(imp.padrao?' <span style="background:var(--gold);color:#000;font-size:9px;padding:2px 6px;border-radius:4px;font-weight:700;">PADRÃO</span>':'');
          var subEl = el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}});
          subEl.textContent = imp.tipo.charAt(0).toUpperCase()+imp.tipo.slice(1)+(imp.ip?' — '+imp.ip+(imp.porta?':'+imp.porta:''):'');
          info.appendChild(nomeEl); info.appendChild(subEl);
          card.appendChild(info);
          var editBtn = el('button',{class:'btn-ghost',style:{padding:'6px 10px',fontSize:'12px'}});
          editBtn.textContent='✏️';
          editBtn.onclick=function(){setState({impModal:Object.assign({},imp)});};
          var delBtn = el('button',{class:'btn-ghost',style:{padding:'6px 10px',fontSize:'12px',color:'var(--danger)'}});
          delBtn.textContent='🗑';
          delBtn.onclick=function(){
            if(!confirm('Excluir impressora "'+imp.nome+'"?'))return;
            var arr=(state.impressorasCadastradas||[]).filter(function(x){return x.id!==imp.id;});
            lsSet('impressorasCadastradas',arr);setState({impressorasCadastradas:arr});scheduleSave();
          };
          card.appendChild(editBtn); card.appendChild(delBtn);
          return card;
        }));

  var wrap = el('div',{});
  wrap.appendChild(aviso);
  wrap.appendChild(buscarBtn);
  wrap.appendChild(addBtn);
  wrap.appendChild(el('div',{style:{height:'16px'}}));
  wrap.appendChild(listaEl);
  if(impModal) wrap.appendChild(impModal);
  return wrap;
}

// ── Renderiza a página ────────────────────────────────────────────────────────
function renderImpressoes() {
  var perfil  = state.profile;
  var setores = (state.setoresImpressao||[]).filter(function(s){ return s.profile===perfil; });
  var cfg     = state.configImpressao || {};
  var empresa = ((state.empresaData||{})[perfil]) || {};

  var COR_OPCOES = ['#c9a84c','#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d'];
  var LARGURAS   = [{v:'58mm',l:'58 mm (estreita)'},{v:'80mm',l:'80 mm (padrão)'}];
  var MODELOS    = [
    'Bematech MP-4200 TH','Bematech MP-100S TH','Bematech MP-2800 TH',
    'Elgin i9','Elgin i7','Elgin i8',
    'Epson TM-T20','Epson TM-T88',
    'Daruma DR700','Daruma DR800',
    'Generic / Outra',
  ];

  // ── Modal setor ─────────────────────────────────────────────────────────────
  var setorModal = null;
  if (state.setorModal !== null && state.setorModal !== undefined) {
    var sm   = state.setorModal;
    var isEd = !!(sm.id);

    var nomeInp = el('input',{class:'form-input',value:sm.nome||'',placeholder:'Ex: Cozinha, Bar, Balcão...',oninput:function(){sm.nome=this.value;}});

    var corSel = el('div',{style:{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'4px'}},
      COR_OPCOES.map(function(cor) {
        var b = el('button',{});
        b.style.cssText='width:28px;height:28px;border-radius:50%;background:'+cor+';border:3px solid '
          +((sm.cor||COR_OPCOES[0])===cor?'var(--text)':'transparent')+';cursor:pointer;transition:border .1s;';
        b.onclick=function(e){e.preventDefault();sm.cor=cor;setState({setorModal:Object.assign({},state.setorModal,{cor:cor})});};
        return b;
      }));

    // Modelos de impressora
    var modeloDatalist = el('datalist',{id:'imp-modelos-list'},
      MODELOS.map(function(m){return el('option',{value:m});}));
    var modeloInp = el('input',{class:'form-input',value:sm.impressora||'',
      placeholder:'Ex: Bematech MP-4200 TH, Elgin i9...',
      list:'imp-modelos-list',
      oninput:function(){sm.impressora=this.value;}});

    var larguraSel = el('select',{class:'form-input',onchange:function(){sm.largura=this.value;}},
      LARGURAS.map(function(l){var o=el('option',{value:l.v},l.l);if((sm.largura||'80mm')===l.v)o.selected=true;return o;}));

    var copiasInp = el('input',{class:'form-input',type:'number',min:'1',max:'5',value:sm.copias||1,
      oninput:function(){sm.copias=parseInt(this.value)||1;}});

    function salvarSetor() {
      var nome=(sm.nome||'').trim();
      if(!nome){showToast('Informe o nome do setor','error');return;}
      var item={
        id:isEd?sm.id:('set_'+Date.now()),
        nome:nome, cor:sm.cor||COR_OPCOES[0], profile:perfil, ativo:true,
        impressora:sm.impressora||'', largura:sm.largura||'80mm', copias:sm.copias||1,
      };
      var arr=isEd
        ?(state.setoresImpressao||[]).map(function(x){return x.id===item.id?item:x;})
        :(state.setoresImpressao||[]).concat([item]);
      lsSet('setoresImpressao',arr);
      setState({setoresImpressao:arr,setorModal:null});
      scheduleSave();
      logAudit((isEd?'editou':'criou')+' setor impressão',nome);
      showToast(isEd?'Setor atualizado!':'Setor cadastrado!');
    }

    function fg(label,input){return div('form-group',[el('label',{class:'form-label'},label),input]);}

    var modal=el('div',{class:'modal',style:{maxWidth:'460px'}},[
      el('div',{class:'modal-header'},[
        el('h3',{class:'modal-title'},(isEd?'✏️ Editar':'➕ Novo')+' Setor de Impressão'),
        el('button',{class:'modal-close',onclick:function(){setState({setorModal:null});}},'✕'),
      ]),
      el('div',{class:'modal-body'},[
        modeloDatalist,
        fg('Nome do setor *',nomeInp),
        fg('Cor identificadora',corSel),
        el('div',{style:{marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)'}},[
          el('div',{style:{fontSize:'10px',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'12px'}},'🖨️ Impressora deste setor'),
          fg('Modelo da impressora',modeloInp),
          el('div',{style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}},[
            fg('Largura do papel',larguraSel),
            fg('Número de cópias',copiasInp),
          ]),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'8px',lineHeight:'1.5',background:'var(--bg3)',padding:'8px 10px',borderRadius:'6px'}},[
            el('strong',{},'ℹ️ Como funciona: '),
            el('span',{},'O sistema usa o driver já instalado no Windows. Após cadastrar, clique em "🖨️ Testar" — o sistema abrirá o diálogo de impressão e você seleciona a impressora. Para impressão automática, configure a impressora como padrão do Windows.'),
          ]),
        ]),
      ]),
      el('div',{class:'modal-footer'},[
        btn('btn-secondary','Cancelar',function(){setState({setorModal:null});}),
        isEd ? btn('btn-ghost','🖨️ Testar',function(){imprimirCupom(sm,[],{});}) : null,
        btn('btn-primary',isEd?'💾 Salvar':'➕ Criar',salvarSetor),
      ].filter(Boolean)),
    ]);
    var ov=div('modal-overlay',[modal]);
    ov.onclick=function(e){if(e.target===ov)setState({setorModal:null});};
    setorModal=ov;
  }

  // ── Tab: Setores ─────────────────────────────────────────────────────────────
  function renderSetores() {
    var rows = setores.map(function(s) {
      var qtdProds = (state.produtos||[]).filter(function(p){return p.setorImpressao===s.id&&p.profile===perfil;}).length;
      var larguraBadge = el('span',{});
      larguraBadge.style.cssText='font-size:10px;padding:1px 6px;border-radius:8px;background:var(--bg3);color:var(--text3);margin-left:4px;';
      larguraBadge.textContent=s.largura||'80mm';

      return el('div',{style:{display:'flex',alignItems:'center',gap:'12px',padding:'14px 0',borderBottom:'1px solid var(--border)'}},[
        el('div',{style:{width:'16px',height:'16px',borderRadius:'50%',background:s.cor||'var(--gold)',flexShrink:'0',boxShadow:'0 0 0 3px '+(s.cor||'var(--gold)')+'33'}}),
        el('div',{style:{flex:'1'}},[
          el('div',{style:{fontWeight:'700',fontSize:'14px',display:'flex',alignItems:'center',gap:'4px'}},[
            el('span',{},s.nome),
            larguraBadge,
          ]),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'3px',display:'flex',gap:'12px',flexWrap:'wrap'}},[
            el('span',{},'🖨️ '+(s.impressora||'Impressora não definida')),
            el('span',{},'📦 '+qtdProds+' produto(s)'),
            s.copias>1?el('span',{},'📄 '+s.copias+'x cópias'):null,
          ].filter(Boolean)),
        ]),
        el('div',{style:{display:'flex',gap:'6px'}},[
          el('button',{class:'btn-icon',title:'Testar impressão',style:{opacity:'.8'},
            onclick:function(){imprimirCupom(s,[],{});}},'🖨️'),
          el('button',{class:'btn-icon edit',title:'Editar',
            onclick:function(){setState({setorModal:Object.assign({},s)});}},'✏️'),
          el('button',{class:'btn-icon',title:'Excluir',style:{color:'var(--danger)'},
            onclick:function(){
              if(!window.confirm('Excluir setor "'+s.nome+'"?'))return;
              var arr=(state.setoresImpressao||[]).filter(function(x){return x.id!==s.id;});
              lsSet('setoresImpressao',arr);
              setState({setoresImpressao:arr});
              scheduleSave();
              showToast('Setor removido','error');
            }},'🗑'),
        ]),
      ]);
    });

    return el('div',{class:'card'},[
      setores.length===0
        ? div('empty',[
            div('empty-icon','🖨️'),
            div('empty-title','Nenhum setor configurado'),
            el('p',{style:{fontSize:'13px',color:'var(--text3)',marginBottom:'16px'}},'Crie setores como "Cozinha", "Bar" e "Balcão" para organizar a impressão dos pedidos.'),
            btn('btn-primary','➕ Criar primeiro setor',function(){setState({setorModal:{}});}),
          ])
        : el('div',{style:{padding:'0 6px'}},rows),
    ]);
  }

  // ── Tab: Configurações ───────────────────────────────────────────────────────
  function renderConfig() {
    var cfgLocal = Object.assign({
      logoUrl:'', mostrarLogo:true, mostrarCnpj:true, mostrarEndereco:true,
      largura:'80mm', rodape:'Obrigado pela preferência!\nVolte sempre!',
    }, cfg);

    function saveCfg(extra){
      var updated=Object.assign({},cfgLocal,extra);
      lsSet('configImpressao',updated);
      setState({configImpressao:updated});
      showToast('Configurações salvas!');
    }

    function cfgInp(field,type,ph,val){
      var i=el('input',{class:'form-input',type:type||'text',value:String(val!==undefined?val:''),placeholder:ph||'',
        oninput:function(){cfgLocal[field]=type==='checkbox'?this.checked:(type==='number'?parseFloat(this.value)||0:this.value);}});
      return i;
    }

    function cfgCheck(field,label,checked){
      var id='cfg-'+field+'-'+Date.now();
      var inp=el('input',{type:'checkbox',id:id,style:{accentColor:'var(--gold)'}});
      inp.checked=!!checked;
      inp.onchange=function(){cfgLocal[field]=this.checked;};
      var lbl=el('label',{for:id,style:{fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}});
      lbl.appendChild(inp);
      lbl.appendChild(document.createTextNode(label));
      return lbl;
    }

    var logoInp=cfgInp('logoUrl','url','https://... cole a URL da logo da empresa',cfgLocal.logoUrl);
    var larguraSel=el('select',{class:'form-input',onchange:function(){cfgLocal.largura=this.value;}},
      LARGURAS.map(function(l){var o=el('option',{value:l.v},l.l);if(cfgLocal.largura===l.v)o.selected=true;return o;}));
    var rodapeInp=el('textarea',{class:'form-input',rows:'3',style:{resize:'vertical'},
      placeholder:'Mensagem de rodapé do cupom (1 linha por vez)',
      oninput:function(){cfgLocal.rodape=this.value;}},cfgLocal.rodape||'');

    // Preview da logo
    var logoPreview=cfgLocal.logoUrl
      ? el('div',{style:{textAlign:'center',marginTop:'10px'}},[
          el('img',{src:cfgLocal.logoUrl,style:{maxWidth:'100px',maxHeight:'80px',objectFit:'contain',border:'1px solid var(--border)',borderRadius:'8px',padding:'4px',background:'#fff'}}),
          el('div',{style:{fontSize:'10px',color:'var(--text3)',marginTop:'4px'}},'Logo atual'),
        ])
      : null;

    function fg2(label,inp,hint){
      return div('form-group',[
        el('label',{class:'form-label'},label),
        inp,
        hint?el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'4px'}},hint):null,
      ].filter(Boolean));
    }

    var infoBox=el('div',{});
    infoBox.style.cssText='background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.22);border-radius:8px;padding:12px 14px;margin-bottom:18px;font-size:12px;color:var(--blue);line-height:1.6;';
    infoBox.innerHTML='<strong>💡 Como configurar sua impressora Bematech / Elgin:</strong><br>'
      +'1. Instale o driver da impressora no Windows<br>'
      +'2. Certifique-se de que ela aparece em <em>Painel de Controle → Dispositivos e Impressoras</em><br>'
      +'3. Para impressão automática, defina-a como <strong>impressora padrão</strong><br>'
      +'4. Clique em "🖨️ Testar" em cada setor para verificar o alinhamento<br>'
      +'5. Para papel 80mm: configure a impressora no Windows com largura de página 80mm';

    var warnBox=el('div',{});
    warnBox.style.cssText='background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);border-radius:8px;padding:10px 14px;margin-top:12px;font-size:11px;color:var(--gold);';
    warnBox.innerHTML='⚠️ <strong>Popup necessário:</strong> A impressão abre numa janela separada. Libere pop-ups para este site no seu navegador.';

    return el('div',{},[
      el('div',{class:'card',style:{marginBottom:'16px'}},[
        el('div',{style:{fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'14px'}},'🖨️ Configuração Geral'),
        infoBox,
        warnBox,
        el('div',{style:{marginTop:'16px'}},[
          fg2('Largura de papel padrão',larguraSel,'Pode ser substituída por setor'),
        ]),
      ]),
      el('div',{class:'card',style:{marginBottom:'16px'}},[
        el('div',{style:{fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'14px'}},'🏢 Cabeçalho do Cupom'),
        el('div',{style:{marginBottom:'12px'}},[
          cfgCheck('mostrarLogo','Exibir logotipo',cfgLocal.mostrarLogo),
          cfgCheck('mostrarCnpj','Exibir CNPJ',cfgLocal.mostrarCnpj),
          cfgCheck('mostrarEndereco','Exibir endereço',cfgLocal.mostrarEndereco),
        ]),
        fg2('URL da logotipo',logoInp,
          'Cole o link direto de uma imagem (ex: de Google Drive, Dropbox, ImgBB...). A imagem será impressa no topo do cupom.'),
        logoPreview,
        el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'8px',lineHeight:'1.5'}},[
          el('span',{},'Os demais dados (nome, endereço, telefone, CNPJ) vêm de '),
          el('span',{style:{color:'var(--gold)',cursor:'pointer',fontWeight:'600'},
            onclick:function(){setState({page:'empresa'});}},'Dados da Empresa'),
          el('span',{},'.'),
        ]),
      ]),
      el('div',{class:'card',style:{marginBottom:'16px'}},[
        el('div',{style:{fontWeight:'700',fontSize:'12px',textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text3)',marginBottom:'14px'}},'📝 Rodapé do Cupom'),
        fg2('Mensagem de rodapé',rodapeInp,'Uma linha por mensagem. Ex: "Obrigado pela preferência!"'),
      ]),
      el('div',{style:{display:'flex',gap:'10px',justifyContent:'flex-end'}},[
        btn('btn-ghost','👁️ Visualizar cupom',function(){
          var seTeste=setores[0]||{nome:'Cozinha',largura:'80mm'};
          imprimirCupom(seTeste,[
            {nome:'X-Burguer Especial',qtd:1,precoVenda:32.90},
            {nome:'Fritas Grandes',qtd:1,precoVenda:16.00},
            {nome:'Refrigerante Lata',qtd:2,precoVenda:7.00},
          ],{pedidoNum:'001'});
        }),
        btn('btn-primary','💾 Salvar configurações',function(){saveCfg(cfgLocal);}),
      ]),
    ]);
  }

  // ── Tab: Modelo (preview visual) ─────────────────────────────────────────────
  function renderModelo() {
    var cfgLocal = Object.assign({
      logoUrl:'', mostrarLogo:true, mostrarCnpj:true, mostrarEndereco:true,
      largura:'80mm', rodape:'Obrigado pela preferência!\nVolte sempre!',
    }, cfg);

    var emp = Object.assign({
      nomeFantasia:'Artt Burger',
      cnpj:'00.000.000/0001-00',
      rua:'Rua Exemplo',numero:'100',bairro:'Centro',cidade:'São Paulo',estado:'SP',
      celular:'(11) 99999-9999',
    }, empresa);

    var mm = parseInt(cfgLocal.largura)||80;
    var wPx = mm===58 ? 220 : 302;

    function mockRow(nome,qtd,unit,total){
      return el('tr',{},[
        el('td',{style:{fontSize:'11px',fontFamily:'monospace',padding:'1px 0',verticalAlign:'top'}},nome),
        el('td',{style:{fontSize:'11px',fontFamily:'monospace',textAlign:'center'}},qtd),
        el('td',{style:{fontSize:'11px',fontFamily:'monospace',textAlign:'right'}},unit),
        el('td',{style:{fontSize:'11px',fontFamily:'monospace',textAlign:'right',fontWeight:'600'}},total),
      ]);
    }

    var logoEl=cfgLocal.mostrarLogo&&cfgLocal.logoUrl
      ? el('div',{style:{textAlign:'center',marginBottom:'6px'}},[
          el('img',{src:cfgLocal.logoUrl,style:{maxWidth:'55%',maxHeight:'28mm',objectFit:'contain'}}),
        ])
      : el('div',{style:{textAlign:'center',fontSize:'28px',marginBottom:'4px'}},'🍔');

    var dashedBorder='1px dashed #999';

    var preview=el('div',{});
    preview.style.cssText='background:#fff;color:#000;font-family:"Courier New",monospace;font-size:11px;'
      +'width:'+wPx+'px;padding:10px;border:1px solid var(--border);border-radius:4px;margin:0 auto;'
      +'box-shadow:2px 2px 8px rgba(0,0,0,.18);';

    var header=el('div',{style:{textAlign:'center',marginBottom:'6px'}},[
      logoEl,
      el('div',{style:{fontWeight:'700',fontSize:'14px'}},emp.nomeFantasia||'Estabelecimento'),
      cfgLocal.mostrarEndereco&&emp.rua?el('div',{style:{fontSize:'10px'}},emp.rua+', '+emp.numero+' — '+emp.cidade+'/'+emp.estado):null,
      emp.celular?el('div',{style:{fontSize:'10px'}},emp.celular):null,
      cfgLocal.mostrarCnpj&&emp.cnpj?el('div',{style:{fontSize:'10px'}},'CNPJ: '+emp.cnpj):null,
      el('div',{style:{fontSize:'9px',color:'#555',marginTop:'2px'}},new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})),
    ].filter(Boolean));

    var setor1=setores[0]||{nome:'Cozinha',cor:'#dc2626'};
    var setorBadge=el('div',{style:{textAlign:'center',fontWeight:'700',fontSize:'12px',letterSpacing:'1px',marginBottom:'4px'}},
      '— '+setor1.nome.toUpperCase()+' —');

    var dash1=el('div',{style:{borderTop:dashedBorder,margin:'5px 0'}});
    var dash2=el('div',{style:{borderTop:dashedBorder,margin:'5px 0'}});
    var dash3=el('div',{style:{borderTop:dashedBorder,margin:'5px 0'}});

    var itensTable=el('table',{style:{width:'100%',borderCollapse:'collapse'}},[
      el('thead',{},[el('tr',{},[
        el('th',{style:{fontSize:'9px',fontWeight:'bold',borderBottom:'1px solid #000',padding:'1px 0',textAlign:'left'}},'ITEM'),
        el('th',{style:{fontSize:'9px',fontWeight:'bold',borderBottom:'1px solid #000',textAlign:'center'}},'QTD'),
        el('th',{style:{fontSize:'9px',fontWeight:'bold',borderBottom:'1px solid #000',textAlign:'right'}},'UNIT.'),
        el('th',{style:{fontSize:'9px',fontWeight:'bold',borderBottom:'1px solid #000',textAlign:'right'}},'TOTAL'),
      ])]),
      el('tbody',{},[
        mockRow('X-Burguer Especial','1','32,90','32,90'),
        mockRow('Fritas Grandes','1','16,00','16,00'),
        mockRow('Refrig. Lata','2','7,00','14,00'),
      ]),
      el('tfoot',{},[el('tr',{},[
        el('td',{colspan:'3',style:{textAlign:'right',fontWeight:'700',paddingTop:'4px',fontSize:'12px'}},'TOTAL'),
        el('td',{style:{textAlign:'right',fontWeight:'700',paddingTop:'4px',fontSize:'12px'}},'62,90'),
      ])]),
    ]);

    var rodapeEl=el('div',{style:{textAlign:'center',marginTop:'8px',fontSize:'10px',lineHeight:'1.5'}});
    (cfgLocal.rodape||'').split('\n').forEach(function(l){
      var d=el('div',{},l);
      rodapeEl.appendChild(d);
    });

    var corteEl=el('div',{style:{borderTop:dashedBorder,marginTop:'10px',textAlign:'center',fontSize:'9px',color:'#888',paddingTop:'2px'}});
    corteEl.textContent='✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─';

    preview.appendChild(header);
    preview.appendChild(dash1);
    preview.appendChild(setorBadge);
    preview.appendChild(dash2);
    preview.appendChild(itensTable);
    preview.appendChild(dash3);
    preview.appendChild(rodapeEl);
    preview.appendChild(corteEl);

    return el('div',{},[
      el('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}},[
        el('div',{},[
          el('div',{style:{fontWeight:'700',fontSize:'13px'}},'Prévia do modelo de cupom'),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}},'Formato '+cfgLocal.largura+' — dados da empresa de '),
          el('span',{style:{fontSize:'11px',color:'var(--gold)',cursor:'pointer',fontWeight:'600'},
            onclick:function(){setState({page:'empresa'});}},'Dados da Empresa'),
        ]),
        btn('btn-primary','🖨️ Imprimir esta prévia',function(){
          var seTeste=setores[0]||{nome:'Cozinha',largura:'80mm'};
          imprimirCupom(seTeste,[
            {nome:'X-Burguer Especial',qtd:1,precoVenda:32.90},
            {nome:'Fritas Grandes',qtd:1,precoVenda:16.00},
            {nome:'Refrigerante Lata',qtd:2,precoVenda:7.00},
          ],{pedidoNum:'001'});
        }),
      ]),
      el('div',{style:{overflowX:'auto',padding:'12px 0'}},[preview]),
      el('div',{style:{marginTop:'14px',fontSize:'11px',color:'var(--text3)',textAlign:'center'}},[
        el('span',{},'Para alterar logo, dados e mensagem → '),
        el('span',{style:{color:'var(--gold)',cursor:'pointer',fontWeight:'600'},
          onclick:function(){_impTab='config';setState({});}},'Configurações de Impressão'),
      ]),
    ]);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────────
  function tabBtn(id,label){
    var b=el('button',{});
    b.style.cssText='padding:11px 18px;font-size:13px;font-weight:'+(_impTab===id?'700':'500')+';'
      +'background:none;border:none;border-bottom:3px solid '+(_impTab===id?'var(--gold)':'transparent')+';'
      +'color:'+(_impTab===id?'var(--text)':'var(--text3)')+';cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;';
    b.textContent=label;
    b.onclick=function(){_impTab=id;setState({});};
    return b;
  }

  var tabBar=el('div',{style:{display:'flex',alignItems:'stretch',borderBottom:'1px solid var(--border)',marginBottom:'20px'}},[
    tabBtn('setores','🖨️ Setores'),
    tabBtn('config','⚙️ Configurações'),
    tabBtn('modelo','👁️ Modelo do Cupom'),
    tabBtn('impressoras','🖨️ Impressoras'),
  ]);

  var headerBtns=_impTab==='setores'
    ? [btn('btn-primary','➕ Novo setor',function(){setState({setorModal:{}});})]
    : _impTab==='config'
    ? []
    : [];

  var page=el('div',{class:'page-content'},[
    el('div',{class:'page-header'},[
      el('div',{},[
        el('h2',{class:'page-title'},'🖨️ Setores de Impressão'),
        el('p',{class:'page-sub'},'Configure impressoras, setores e o modelo de cupom'),
      ]),
      el('div',{style:{display:'flex',gap:'8px'}},headerBtns),
    ]),
    tabBar,
    _impTab==='setores'      ? renderSetores()         : null,
    _impTab==='config'       ? renderConfig()          : null,
    _impTab==='modelo'       ? renderModelo()          : null,
    _impTab==='impressoras'  ? renderTabImpressoras()  : null,
  ].filter(Boolean));

  var root=el('div',{});
  root.appendChild(page);
  if(setorModal) root.appendChild(setorModal);
  return root;
}
