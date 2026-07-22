// ── PAGE FISCAL — Planejamento Tributário ─────────────────────────────────────

var _fiscalTab = 'config';

function renderFiscal() {
  var fc = Object.assign({
    regimeTributario: '',
    aliquotaEfetiva: '',
    faturamentoMensalMedio: '',
    faturamentoMensalMeta: '',
    cnae: '',
    atividade: '',
    numFuncionarios: '',
    proLabore: '',
    percSalao: '',
    percDelivery: '',
    percIfood: '',
    temNF: false,
    yoogaNFConfigurado: false,
    obsContador: '',
  }, state.fiscalConfig || lsGet('fiscalConfig', {}));

  function tabBtn(id, label) {
    return btn('tab-btn' + (_fiscalTab === id ? ' active' : ''), label, function() {
      _fiscalTab = id;
      setState({});
    });
  }

  var tabs = div('tabs-row', [
    tabBtn('config',     '⚙️ Configuração'),
    tabBtn('diagnostico','📊 Diagnóstico'),
    tabBtn('guia-nf',   '🧾 Guia NF Yooga'),
    tabBtn('perguntas', '❓ Para o Contador'),
    tabBtn('ia',        '🤖 Consultar IA'),
  ]);

  var content;
  if      (_fiscalTab === 'config')      content = _fiscalConfig(fc);
  else if (_fiscalTab === 'diagnostico') content = _fiscalDiagnostico(fc);
  else if (_fiscalTab === 'guia-nf')     content = _fiscalGuiaNF(fc);
  else if (_fiscalTab === 'perguntas')   content = _fiscalPerguntas(fc);
  else                                   content = _fiscalIA(fc);

  var wrap = div('page-section', []);
  var hdr = el('div', { style: { marginBottom: '16px' } }, [
    el('h2', { style: { margin: '0 0 4px', fontSize: '1.3rem', fontWeight: '700' } }, '📋 Planejamento Fiscal'),
    el('p', { style: { margin: '0', color: 'var(--text-muted)', fontSize: '0.88rem' } },
      'Configure os dados tributários para receber diagnóstico, guias e sugestões personalizadas.'),
  ]);
  wrap.appendChild(hdr);
  wrap.appendChild(tabs);
  wrap.appendChild(content);
  return wrap;
}

// ── ABA: CONFIGURAÇÃO ─────────────────────────────────────────────────────────

function _fiscalConfig(fc) {
  var wrap = el('div', { style: { paddingTop: '16px' } }, []);

  function row(label, inputEl, hint) {
    var children = [
      el('label', { style: { fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' } }, label),
      inputEl,
    ];
    if (hint) children.push(el('small', { style: { color: 'var(--text-muted)', fontSize: '0.75rem' } }, hint));
    return el('div', { style: { marginBottom: '14px' } }, children);
  }

  function inp(id, val, type, placeholder) {
    return el('input', {
      id: 'fiscal-' + id,
      type: type || 'text',
      value: val || '',
      placeholder: placeholder || '',
      style: { width: '100%', boxSizing: 'border-box' },
    }, []);
  }

  function numInp(id, val, placeholder) {
    return el('input', {
      id: 'fiscal-' + id,
      type: 'number',
      value: val || '',
      placeholder: placeholder || '',
      min: '0',
      step: '0.01',
      style: { width: '100%', boxSizing: 'border-box' },
    }, []);
  }

  // Regime tributário select
  var regimeOpts = [
    el('option', { value: '' }, '— Selecione —'),
    el('option', { value: 'simples_nacional' }, 'Simples Nacional'),
    el('option', { value: 'lucro_presumido' }, 'Lucro Presumido'),
    el('option', { value: 'lucro_real' }, 'Lucro Real'),
    el('option', { value: 'mei' }, 'MEI'),
    el('option', { value: 'nao_sei' }, 'Não sei / A confirmar'),
  ];
  var regimeSel = el('select', { id: 'fiscal-regimeTributario', style: { width: '100%', boxSizing: 'border-box' } }, regimeOpts);
  regimeSel.value = fc.regimeTributario || '';

  // Checkboxes
  var chkNF = el('input', { type: 'checkbox', id: 'fiscal-temNF' }, []);
  if (fc.temNF) chkNF.checked = true;
  var lblNF = el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' } },
    [chkNF, el('span', {}, 'Emite Nota Fiscal (NF-e / NFS-e)')]);

  var chkYooga = el('input', { type: 'checkbox', id: 'fiscal-yoogaNFConfigurado' }, []);
  if (fc.yoogaNFConfigurado) chkYooga.checked = true;
  var lblYooga = el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' } },
    [chkYooga, el('span', {}, 'Usa o sistema Yooga para emissão de NF')]);

  // Textarea obs
  var txtObs = el('textarea', {
    id: 'fiscal-obsContador',
    rows: 3,
    placeholder: 'Ex: Sócio com retirada de R$5.000/mês. Empresa iniciou em 2022. Regime pode mudar em jan/2025...',
    style: { width: '100%', boxSizing: 'border-box', resize: 'vertical' },
  }, []);
  txtObs.value = fc.obsContador || '';

  function grid2(a, b) {
    return el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' } }, [a, b]);
  }

  function sectionTitle(t) {
    return el('h3', { style: { fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px', marginTop: '20px' } }, t);
  }

  function salvar() {
    var novo = {
      regimeTributario:   (document.getElementById('fiscal-regimeTributario') || {}).value || '',
      cnae:               (document.getElementById('fiscal-cnae') || {}).value || '',
      atividade:          (document.getElementById('fiscal-atividade') || {}).value || '',
      obsContador:        (document.getElementById('fiscal-obsContador') || {}).value || '',
      aliquotaEfetiva:    parseFloat((document.getElementById('fiscal-aliquotaEfetiva') || {}).value) || 0,
      faturamentoMensalMedio: parseFloat((document.getElementById('fiscal-faturamentoMensalMedio') || {}).value) || 0,
      faturamentoMensalMeta:  parseFloat((document.getElementById('fiscal-faturamentoMensalMeta') || {}).value) || 0,
      numFuncionarios:    parseFloat((document.getElementById('fiscal-numFuncionarios') || {}).value) || 0,
      proLabore:          parseFloat((document.getElementById('fiscal-proLabore') || {}).value) || 0,
      percSalao:          parseFloat((document.getElementById('fiscal-percSalao') || {}).value) || 0,
      percDelivery:       parseFloat((document.getElementById('fiscal-percDelivery') || {}).value) || 0,
      percIfood:          parseFloat((document.getElementById('fiscal-percIfood') || {}).value) || 0,
      temNF:              !!(document.getElementById('fiscal-temNF') || {}).checked,
      yoogaNFConfigurado: !!(document.getElementById('fiscal-yoogaNFConfigurado') || {}).checked,
    };
    lsSet('fiscalConfig', novo);
    setState({ fiscalConfig: novo });
    showToast('Configurações fiscais salvas!', 'success');
  }

  wrap.appendChild(sectionTitle('Situação Tributária Atual'));
  wrap.appendChild(grid2(
    row('Regime Tributário', regimeSel),
    row('Alíquota Efetiva Atual (%)', numInp('aliquotaEfetiva', fc.aliquotaEfetiva, 'Ex: 12.5'), 'Percentual real pago sobre o faturamento')
  ));
  wrap.appendChild(grid2(
    row('CNAE Principal', inp('cnae', fc.cnae, 'text', 'Ex: 5611-2/01'), 'Código de atividade econômica'),
    row('Atividade Descritiva', inp('atividade', fc.atividade, 'text', 'Ex: Restaurante e similares'))
  ));

  wrap.appendChild(sectionTitle('Faturamento'));
  wrap.appendChild(grid2(
    row('Faturamento Mensal Médio Atual (R$)', numInp('faturamentoMensalMedio', fc.faturamentoMensalMedio, 'Ex: 150000'), 'Média dos últimos 12 meses'),
    row('Faturamento Mensal Meta (R$)', numInp('faturamentoMensalMeta', fc.faturamentoMensalMeta, 'Ex: 200000'), 'Objetivo mensal desejado')
  ));
  wrap.appendChild(el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' } }, [
    row('% Vendas Salão', numInp('percSalao', fc.percSalao, '0'), 'Percentual da receita'),
    row('% Delivery Próprio', numInp('percDelivery', fc.percDelivery, '0')),
    row('% iFood / App', numInp('percIfood', fc.percIfood, '0')),
  ]));

  wrap.appendChild(sectionTitle('Estrutura da Empresa'));
  wrap.appendChild(grid2(
    row('Nº de Funcionários CLT', numInp('numFuncionarios', fc.numFuncionarios, 'Ex: 8')),
    row('Pró-labore dos Sócios (R$/mês)', numInp('proLabore', fc.proLabore, 'Ex: 10000'), 'Total mensal de todos os sócios')
  ));

  wrap.appendChild(sectionTitle('Notas Fiscais'));
  wrap.appendChild(el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' } }, [lblNF, lblYooga]));

  wrap.appendChild(sectionTitle('Observações para o Contador'));
  wrap.appendChild(row('', txtObs, 'Informações adicionais que podem ser relevantes para o planejamento fiscal'));

  wrap.appendChild(el('div', { style: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' } }, [
    btn('btn-primary', '💾 Salvar Configurações', salvar),
  ]));

  return wrap;
}

// ── ABA: DIAGNÓSTICO ──────────────────────────────────────────────────────────

function _fiscalDiagnostico(fc) {
  var wrap = el('div', { style: { paddingTop: '16px' } }, []);

  var fatMensal = parseFloat(fc.faturamentoMensalMedio) || 0;
  var fatAnual  = fatMensal * 12;
  var aliq      = parseFloat(fc.aliquotaEfetiva) || 0;
  var regime    = fc.regimeTributario || '';

  if (!fatMensal || !regime || regime === 'nao_sei') {
    wrap.appendChild(el('div', { class: 'card', style: { padding: '24px', textAlign: 'center', color: 'var(--text-muted)' } }, [
      el('div', { style: { fontSize: '2rem', marginBottom: '8px' } }, '📊'),
      el('p', { style: { margin: '0' } }, 'Preencha as configurações (Regime Tributário e Faturamento Mensal) para ver o diagnóstico.'),
    ]));
    return wrap;
  }

  // Estimativas simplificadas (fins ilustrativos)
  var impostoAtualMensal = fatMensal * (aliq / 100);

  // Simples Nacional — estimativa baseada em faixas do Anexo I (comércio/restaurante)
  var aliqSN = _estimarSimplesNacional(fatAnual);
  var impostoSNMensal = fatMensal * (aliqSN / 100);

  // Lucro Presumido — cálculo estimado para restaurantes
  // IRPJ: 15% sobre 8% do faturamento = 1.2%
  // CSLL: 9% sobre 12% do faturamento = 1.08%
  // PIS: 0.65%, COFINS: 3%, ISS: ~3% (média)
  var aliqLP = 1.2 + 1.08 + 0.65 + 3.0 + 3.0; // ~8.93%
  var impostoLPMensal = fatMensal * (aliqLP / 100);

  function card(titulo, regime2, aliqCalc, impostoMensal, descricao, destaque) {
    var impostoAnual = impostoMensal * 12;
    var cor = destaque ? 'var(--primary)' : 'var(--border)';
    return el('div', { class: 'card', style: { padding: '18px', borderTop: '3px solid ' + cor, marginBottom: '16px' } }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' } }, [
        el('div', {}, [
          el('strong', { style: { fontSize: '1rem' } }, titulo),
          el('p', { style: { margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' } }, descricao),
        ]),
        el('div', { style: { textAlign: 'right' } }, [
          el('div', { style: { fontSize: '1.4rem', fontWeight: '700', color: destaque ? 'var(--primary)' : 'inherit' } }, aliqCalc.toFixed(2) + '%'),
          el('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } }, 'alíquota estimada'),
        ]),
      ]),
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' } }, [
        el('div', {}, [
          el('div', { style: { fontSize: '1.1rem', fontWeight: '600' } }, fmtMoney(impostoMensal)),
          el('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } }, 'por mês estimado'),
        ]),
        el('div', {}, [
          el('div', { style: { fontSize: '1.1rem', fontWeight: '600' } }, fmtMoney(impostoAnual)),
          el('div', { style: { fontSize: '0.75rem', color: 'var(--text-muted)' } }, 'por ano estimado'),
        ]),
      ]),
    ]);
  }

  // Situação atual
  var tituloAtual = { simples_nacional: 'Simples Nacional', lucro_presumido: 'Lucro Presumido', lucro_real: 'Lucro Real', mei: 'MEI' }[regime] || regime;

  var cardAtual = card(
    '📍 Situação Atual — ' + tituloAtual,
    regime, aliq, impostoAtualMensal,
    aliq ? 'Com base na alíquota efetiva informada de ' + aliq + '%' : 'Informe a alíquota efetiva para calcular',
    false
  );

  wrap.appendChild(el('h3', { style: { fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' } }, 'Situação Atual'));
  wrap.appendChild(cardAtual);

  if (regime !== 'simples_nacional' || aliq !== aliqSN) {
    wrap.appendChild(el('h3', { style: { fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '20px' } }, 'Comparativo de Regimes'));
    if (fatAnual <= 4800000) {
      wrap.appendChild(card(
        '📘 Simples Nacional',
        'simples_nacional', aliqSN, impostoSNMensal,
        'Estimativa para faturamento anual de ' + fmtMoney(fatAnual) + ' (Anexo I – Comércio)',
        regime !== 'simples_nacional'
      ));
    }
    wrap.appendChild(card(
      '📗 Lucro Presumido',
      'lucro_presumido', aliqLP, impostoLPMensal,
      'IRPJ + CSLL + PIS/COFINS + ISS estimado (~8.93% sobre faturamento)',
      regime !== 'lucro_presumido'
    ));
  }

  // Comparativo de economia
  var melhorImpostoMensal = Math.min(
    aliq ? impostoAtualMensal : Infinity,
    fatAnual <= 4800000 ? impostoSNMensal : Infinity,
    impostoLPMensal
  );
  var atualParaComparar = aliq ? impostoAtualMensal : null;
  if (atualParaComparar && (atualParaComparar - melhorImpostoMensal) > 100) {
    var economia = atualParaComparar - melhorImpostoMensal;
    wrap.appendChild(el('div', { class: 'card', style: { padding: '16px', background: 'rgba(var(--primary-rgb,0,120,255),0.08)', borderLeft: '4px solid var(--primary)', marginTop: '16px' } }, [
      el('strong', {}, '💡 Potencial de Economia'),
      el('p', { style: { margin: '8px 0 0' } }, 'Migrando para o regime mais vantajoso, a economia estimada pode ser de'),
      el('div', { style: { fontSize: '1.4rem', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' } }, fmtMoney(economia) + '/mês — ' + fmtMoney(economia * 12) + '/ano'),
      el('p', { style: { fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0' } }, '⚠️ Estimativas ilustrativas. Consulte seu contador para validação.'),
    ]));
  }

  wrap.appendChild(el('p', { style: { fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '20px', padding: '12px', background: 'var(--surface)', borderRadius: '8px' } },
    '⚠️ Aviso: Os valores acima são estimativas simplificadas para fins de planejamento. O cálculo real depende de deduções, folha de pagamento, ISS municipal, e outras variáveis. Utilize as informações para orientar a conversa com seu contador, não como base definitiva para decisões fiscais.'));

  return wrap;
}

function _estimarSimplesNacional(fatAnual) {
  // Tabela Anexo I (Comércio) — alíquota nominal; valores de 2024
  if (fatAnual <= 180000)    return 4.0;
  if (fatAnual <= 360000)    return 7.3;
  if (fatAnual <= 720000)    return 9.5;
  if (fatAnual <= 1800000)   return 10.7;
  if (fatAnual <= 3600000)   return 14.3;
  if (fatAnual <= 4800000)   return 19.0;
  return 0; // acima do teto
}

// ── ABA: GUIA NF YOOGA ───────────────────────────────────────────────────────

function _fiscalGuiaNF(fc) {
  var wrap = el('div', { style: { paddingTop: '16px' } }, []);

  function stepCard(num, titulo, conteudo) {
    return el('div', { class: 'card', style: { padding: '16px', marginBottom: '12px', display: 'flex', gap: '14px' } }, [
      el('div', { style: { minWidth: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1rem', flexShrink: '0' } }, String(num)),
      el('div', {}, [
        el('strong', { style: { display: 'block', marginBottom: '6px' } }, titulo),
        typeof conteudo === 'string'
          ? el('p', { style: { margin: '0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' } }, conteudo)
          : conteudo,
      ]),
    ]);
  }

  function infoBox(texto) {
    return el('div', { style: { padding: '12px 14px', background: 'rgba(var(--primary-rgb,0,120,255),0.08)', borderLeft: '4px solid var(--primary)', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.5' } }, texto);
  }

  wrap.appendChild(el('h3', { style: { fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px' } }, 'Sobre o Sistema Yooga'));
  wrap.appendChild(infoBox([
    el('strong', {}, '🧾 Yooga Emissor de NF'),
    el('p', { style: { margin: '6px 0 0' } }, 'O sistema Yooga é integrado à Prefeitura e à Sefaz para emissão de NF-e (produtos) e NFS-e (serviços). Para restaurantes no Simples Nacional, o correto é emitir NF-e com CFOP adequado e alíquota conforme regime. Abaixo, o passo a passo para emitir corretamente minimizando a carga tributária.'),
  ]));

  wrap.appendChild(el('h3', { style: { fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '20px' } }, 'Passo a Passo — Emissão Correta de NF no Yooga'));

  wrap.appendChild(stepCard(1, 'Configurar o Regime Tributário no Yooga',
    'Acesse Configurações → Dados Fiscais no painel do Yooga. Informe o regime tributário correto (Simples Nacional, Lucro Presumido etc.) e o CNAE da empresa. Isso determina quais impostos serão calculados automaticamente em cada NF emitida.'));

  wrap.appendChild(stepCard(2, 'Verificar os Dados do Certificado Digital',
    'Em Configurações → Certificado Digital, confirme que o certificado A1 ou A3 está válido e não expirado. Sem certificado válido, as notas são rejeitadas pela Sefaz. Renove com antecedência mínima de 30 dias antes do vencimento.'));

  wrap.appendChild(stepCard(3, 'Configurar CFOP Correto por Tipo de Venda',
    el('div', { style: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' } }, [
      el('p', { style: { margin: '0 0 8px' } }, 'Use o CFOP adequado para cada operação:'),
      el('ul', { style: { margin: '0', paddingLeft: '18px' } }, [
        el('li', {}, el('span', {}, [el('strong', {}, '5.102'), ' — Venda de mercadoria (consumo local/salão)'])),
        el('li', {}, el('span', {}, [el('strong', {}, '5.405'), ' — Venda ao consumidor final com ST (quando aplicável)'])),
        el('li', {}, el('span', {}, [el('strong', {}, '6.102'), ' — Venda para outro Estado (delivery interestadual)'])),
      ]),
      el('p', { style: { margin: '8px 0 0' } }, 'No Yooga: Configurações → Produtos → CFOP padrão.'),
    ])
  ));

  wrap.appendChild(stepCard(4, 'Configurar Alíquotas e CST Corretos no Simples Nacional',
    el('div', { style: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' } }, [
      el('p', { style: { margin: '0 0 8px' } }, 'Para empresas no Simples Nacional, utilize:'),
      el('ul', { style: { margin: '0', paddingLeft: '18px' } }, [
        el('li', {}, 'CST do PIS/COFINS: 07 (isento, pois o Simples já inclui)'),
        el('li', {}, 'ICMS: CST 500 (Simples Nacional – sem destaque de ICMS na nota)'),
        el('li', {}, 'IPI: CST 99 (outras saídas) ou isento conforme o produto'),
        el('li', {}, 'ISS: não destacado na NF-e de produtos físicos (restaurante emite NF-e, não NFS-e)'),
      ]),
      el('p', { style: { margin: '8px 0 0' } }, 'No Yooga: Configurações → Tributação → Simples Nacional. Confirme que está marcado como "optante".'),
    ])
  ));

  wrap.appendChild(stepCard(5, 'Emitir a NF no Fechamento de cada Venda',
    el('div', { style: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' } }, [
      el('p', { style: { margin: '0 0 8px' } }, 'No fluxo de venda do Yooga PDV:'),
      el('ol', { style: { margin: '0', paddingLeft: '18px' } }, [
        el('li', {}, 'Finalize o pedido normalmente'),
        el('li', {}, 'Na tela de pagamento, selecione "Emitir NF-e"'),
        el('li', {}, 'Informe CPF/CNPJ do cliente quando solicitado (consumidor final: campo pode ficar em branco)'),
        el('li', {}, 'Clique em "Transmitir" — o Yooga envia à Sefaz em tempo real'),
        el('li', {}, 'Aguarde a autorização (chave de acesso gerada) — isso é prova fiscal'),
      ]),
    ])
  ));

  wrap.appendChild(stepCard(6, 'Emissão em Lote para Delivery (iFood / App próprio)',
    'Para pedidos de delivery recebidos por apps, emita NF-e em lote ao final do dia. No Yooga: Relatórios → Pedidos Delivery → Emitir NF em lote. Use o CPF do estabelecimento como tomador quando o cliente não informar dados. Guarde os XMLs autorizados — são exigidos em caso de fiscalização.'));

  wrap.appendChild(stepCard(7, 'Escrituração e Entrega das Obrigações Mensais',
    el('div', { style: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' } }, [
      el('p', { style: { margin: '0 0 8px' } }, 'Envie mensalmente ao contador:'),
      el('ul', { style: { margin: '0', paddingLeft: '18px' } }, [
        el('li', {}, 'Arquivo XML de todas as NF-e autorizadas (Yooga: Relatórios → Exportar XMLs)'),
        el('li', {}, 'Relatório de faturamento por período'),
        el('li', {}, 'Extrato bancário e conciliação de cartões (para conferir com faturamento NF)'),
      ]),
      el('p', { style: { margin: '8px 0 0' } }, 'O contador realiza o PGDAS-D (Simples Nacional) ou SPED/ECF (Lucro Presumido/Real) com base nesses dados.'),
    ])
  ));

  wrap.appendChild(stepCard(8, 'Boas Práticas para Reduzir a Carga Fiscal Legalmente',
    el('div', { style: { fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' } }, [
      el('ul', { style: { margin: '0', paddingLeft: '18px' } }, [
        el('li', {}, 'Registrar todas as compras de insumos com NF de entrada — reduz base de cálculo no Lucro Real e serve como crédito de ICMS/PIS/COFINS no Lucro Presumido'),
        el('li', {}, 'Separar claramente faturamento de serviço e produto — alíquotas distintas'),
        el('li', {}, 'Revisar o CNAE — enquadramento correto pode reduzir alíquota no Simples'),
        el('li', {}, 'Verificar isenções municipais de ISS para alimentação — algumas prefeituras isentam'),
        el('li', {}, 'Pró-labore adequado reduz base do INSS sem prejudicar benefícios dos sócios'),
      ]),
    ])
  ));

  return wrap;
}

// ── ABA: PERGUNTAS PARA O CONTADOR ───────────────────────────────────────────

function _fiscalPerguntas(fc) {
  var wrap = el('div', { style: { paddingTop: '16px' } }, []);

  var fatMensal = parseFloat(fc.faturamentoMensalMedio) || 0;
  var fatAnual  = fatMensal * 12;
  var regime    = fc.regimeTributario || '';
  var regimeLabel = { simples_nacional: 'Simples Nacional', lucro_presumido: 'Lucro Presumido', lucro_real: 'Lucro Real', mei: 'MEI', nao_sei: 'A confirmar', '': 'não informado' }[regime] || regime;

  var perguntas = [];

  perguntas.push('1. Com base no nosso CNAE (' + (fc.cnae || 'a confirmar') + ') e faturamento médio de ' + fmtMoney(fatMensal) + '/mês (' + fmtMoney(fatAnual) + '/ano), qual regime tributário é mais vantajoso para nós atualmente: ' + (regime !== 'nao_sei' && regime ? regimeLabel + ' (atual) ou outra opção?' : 'Simples Nacional, Lucro Presumido ou Lucro Real?') + ' Por favor, simule os dois cenários com valores.');

  perguntas.push('2. Estamos ' + (fc.temNF ? '' : 'NÃO ') + 'emitindo Nota Fiscal atualmente' + (fc.yoogaNFConfigurado ? ' pelo sistema Yooga' : '') + '. Qual o risco tributário de ' + (fc.temNF ? 'emitir NF incorretamente?' : 'não emitir NF sobre as vendas?') + ' Como devemos proceder para ficar em conformidade sem aumentar demais a carga?');

  perguntas.push('3. Nosso pró-labore atual é de ' + (fc.proLabore ? fmtMoney(parseFloat(fc.proLabore)) : 'não definido') + '/mês. Qual o pró-labore ideal para equilibrar contribuição previdenciária e remuneração dos sócios? Existe alguma estratégia com distribuição de lucros que seja mais vantajosa?');

  if (fc.numFuncionarios) {
    perguntas.push('4. Temos ' + fc.numFuncionarios + ' funcionários CLT. Existe alguma forma de otimizar a folha de pagamento e os encargos? Devemos considerar o eSocial e possíveis benefícios para redução de base de INSS?');
  }

  perguntas.push((fc.numFuncionarios ? '5' : '4') + '. Qual a frequência ideal para fazer o planejamento tributário e revisão do enquadramento? Em quais situações devemos reavaliar o regime?');

  perguntas.push((fc.numFuncionarios ? '6' : '5') + '. Quais documentos fiscais precisamos guardar (e por quanto tempo) para evitar problemas em eventual fiscalização da Receita Federal ou SEFAZ?');

  if (parseFloat(fc.percIfood) > 20) {
    perguntas.push('Extra: Temos ' + fc.percIfood + '% do faturamento pelo iFood. Como funciona a tributação sobre as vendas por marketplace? O iFood retém algum imposto? Há algum impacto na apuração do Simples Nacional?');
  }

  var texto = 'Olá, [Nome do Contador]!\n\nSegue um resumo dos dados do nosso negócio e minhas dúvidas para que possamos conversar sobre o melhor planejamento fiscal:\n\n' +
    '📊 DADOS DA EMPRESA:\n' +
    '• Regime atual: ' + regimeLabel + '\n' +
    '• Faturamento médio mensal: ' + fmtMoney(fatMensal) + '\n' +
    '• Faturamento anual estimado: ' + fmtMoney(fatAnual) + '\n' +
    (fc.aliquotaEfetiva ? '• Alíquota efetiva informada: ' + fc.aliquotaEfetiva + '%\n' : '') +
    (fc.cnae ? '• CNAE: ' + fc.cnae + '\n' : '') +
    (fc.atividade ? '• Atividade: ' + fc.atividade + '\n' : '') +
    (fc.numFuncionarios ? '• Funcionários CLT: ' + fc.numFuncionarios + '\n' : '') +
    (fc.proLabore ? '• Pró-labore: ' + fmtMoney(parseFloat(fc.proLabore)) + '/mês\n' : '') +
    (fc.percSalao ? '• Canais: ' + fc.percSalao + '% salão / ' + (fc.percDelivery || 0) + '% delivery / ' + (fc.percIfood || 0) + '% iFood\n' : '') +
    '\n❓ DÚVIDAS:\n\n' +
    perguntas.join('\n\n') +
    '\n\n' + (fc.obsContador ? 'Observações adicionais: ' + fc.obsContador + '\n\n' : '') +
    'Aguardo retorno para agendar uma reunião.\n\nObrigado!';

  var txtArea = el('textarea', {
    id: 'fiscal-perguntas-txt',
    rows: 20,
    readonly: true,
    style: { width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.87rem', lineHeight: '1.6', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', resize: 'vertical', color: 'inherit' },
  }, []);
  txtArea.value = texto;

  var btnCopy = btn('btn-primary', '📋 Copiar Mensagem', function() {
    txtArea.select();
    document.execCommand('copy');
    showToast('Mensagem copiada!', 'success');
  });

  if (!fatMensal || !regime || regime === 'nao_sei') {
    wrap.appendChild(el('div', { class: 'card', style: { padding: '24px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '16px' } }, [
      el('p', { style: { margin: '0' } }, '⚠️ Preencha a Configuração com Regime Tributário e Faturamento para gerar perguntas personalizadas.'),
    ]));
  }

  wrap.appendChild(el('p', { style: { margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-muted)' } }, 'Mensagem gerada com base nas suas configurações. Copie e envie ao seu contador:'));
  wrap.appendChild(txtArea);
  wrap.appendChild(el('div', { style: { marginTop: '10px', display: 'flex', justifyContent: 'flex-end' } }, [btnCopy]));

  return wrap;
}

// ── ABA: CONSULTAR IA ─────────────────────────────────────────────────────────

function _fiscalIA(fc) {
  var wrap = el('div', { style: { paddingTop: '16px' } }, []);

  var fatMensal = parseFloat(fc.faturamentoMensalMedio) || 0;
  var fatAnual  = fatMensal * 12;
  var regime    = fc.regimeTributario || '';
  var regimeLabel = { simples_nacional: 'Simples Nacional', lucro_presumido: 'Lucro Presumido', lucro_real: 'Lucro Real', mei: 'MEI', nao_sei: 'A confirmar' }[regime] || (regime || 'não informado');

  var prompt = 'Você é um especialista em planejamento tributário para pequenas e médias empresas brasileiras do setor de alimentação (restaurantes, hamburguerias, lanchonetes). Analise os dados da empresa abaixo e forneça:\n\n' +
    '1. Diagnóstico do regime tributário atual e se é o mais adequado\n' +
    '2. Comparativo entre Simples Nacional, Lucro Presumido e Lucro Real com valores estimados\n' +
    '3. Recomendações práticas para reduzir a carga tributária de forma lícita\n' +
    '4. Alerta sobre riscos ou oportunidades identificadas nos dados\n' +
    '5. Sugestões específicas para emissão de NF via sistema Yooga\n' +
    '6. Próximos passos concretos a tomar\n\n' +
    '━━ DADOS DA EMPRESA ━━\n' +
    '• Tipo de negócio: Restaurante / Hamburgueria\n' +
    '• Regime tributário atual: ' + regimeLabel + '\n' +
    '• Alíquota efetiva informada: ' + (fc.aliquotaEfetiva ? fc.aliquotaEfetiva + '%' : 'não informada') + '\n' +
    '• Faturamento mensal médio: ' + (fatMensal ? fmtMoney(fatMensal) : 'não informado') + '\n' +
    '• Faturamento anual estimado: ' + (fatAnual ? fmtMoney(fatAnual) : 'não informado') + '\n' +
    '• Faturamento mensal meta: ' + (fc.faturamentoMensalMeta ? fmtMoney(parseFloat(fc.faturamentoMensalMeta)) : 'não informado') + '\n' +
    '• CNAE / atividade: ' + (fc.cnae || 'não informado') + (fc.atividade ? ' — ' + fc.atividade : '') + '\n' +
    '• Número de funcionários CLT: ' + (fc.numFuncionarios || 'não informado') + '\n' +
    '• Pró-labore dos sócios: ' + (fc.proLabore ? fmtMoney(parseFloat(fc.proLabore)) + '/mês' : 'não informado') + '\n' +
    '• Distribuição do faturamento: ' + (fc.percSalao ? fc.percSalao + '% salão' : '') + (fc.percDelivery ? ', ' + fc.percDelivery + '% delivery próprio' : '') + (fc.percIfood ? ', ' + fc.percIfood + '% iFood/apps' : '') + '\n' +
    '• Emite NF atualmente: ' + (fc.temNF ? 'Sim' : 'Não') + '\n' +
    '• Usa sistema Yooga para NF: ' + (fc.yoogaNFConfigurado ? 'Sim' : 'Não') + '\n' +
    (fc.obsContador ? '• Observações adicionais: ' + fc.obsContador + '\n' : '') +
    '\n━━ CONTEXTO ADICIONAL ━━\n' +
    'A empresa usa o sistema Yooga como PDV e emissor de notas fiscais. O faturamento inclui vendas presenciais e delivery (próprio e via iFood). Os sócios desejam otimizar a tributação reduzindo impostos pagos de forma legal, entender se o regime atual é o mais adequado, e receber orientações claras para emissão correta de NF minimizando a carga fiscal.\n\n' +
    'Por favor, seja específico nos valores e cálculos, e use exemplos práticos baseados nos dados fornecidos.';

  var txtArea = el('textarea', {
    id: 'fiscal-ia-prompt',
    rows: 22,
    readonly: true,
    style: { width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: '1.6', padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', resize: 'vertical', color: 'inherit' },
  }, []);
  txtArea.value = prompt;

  var btnCopy = btn('btn-primary', '📋 Copiar Prompt', function() {
    txtArea.select();
    document.execCommand('copy');
    showToast('Prompt copiado! Cole no Claude, ChatGPT ou outro assistente de IA.', 'success');
  });

  wrap.appendChild(el('div', { class: 'card', style: { padding: '14px 16px', marginBottom: '16px', background: 'rgba(var(--primary-rgb,0,120,255),0.08)', borderLeft: '4px solid var(--primary)' } }, [
    el('strong', {}, '🤖 Como usar'),
    el('p', { style: { margin: '6px 0 0', fontSize: '0.87rem', lineHeight: '1.5' } }, '1. Clique em "Copiar Prompt" abaixo\n2. Abra o Claude (claude.ai), ChatGPT ou outro assistente de IA\n3. Cole o prompt e envie\n4. A IA analisará os dados da sua empresa e fornecerá um diagnóstico fiscal detalhado\n\nQuanto mais campos você preencher na aba Configuração, mais precisa e personalizada será a análise.'),
  ]));

  wrap.appendChild(el('p', { style: { margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-muted)' } }, 'Prompt gerado com os dados da sua empresa. Copie e cole em um assistente de IA:'));
  wrap.appendChild(txtArea);
  wrap.appendChild(el('div', { style: { marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'flex-end' } }, [
    btnCopy,
  ]));

  return wrap;
}
