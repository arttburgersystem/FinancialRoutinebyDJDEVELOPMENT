// ── AJUDA — CENTRAL DE AJUDA v2.2.0 ─────────────────────────────────────────

var _ajudaSecao = null; // seção expandida atual

var AJUDA_SECOES = [
  {
    id: 'acesso',
    icon: '🔐',
    titulo: 'Acesso ao Sistema',
    subtitulo: 'PIN, biometria e perfis de usuário',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O sistema é protegido por um PIN de 8 dígitos. Após entrar, você pode identificar qual usuário está operando pelo rodapé da barra lateral.',
      },
      {
        tipo: 'steps',
        titulo: 'Entrar com PIN',
        items: [
          'Acesse o sistema pelo navegador (Chrome recomendado)',
          'Digite seu PIN de 8 dígitos nos círculos exibidos na tela',
          'O sistema abrirá automaticamente após a validação',
          'PIN padrão: 741258 — recomenda-se alterar após o primeiro uso',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Ativar Biometria (Face ID / Digital)',
        items: [
          'Na primeira entrada com PIN correto, o sistema perguntará se deseja ativar biometria',
          'Clique em "Ativar Face ID / Digital" e siga as instruções do dispositivo',
          'Nas próximas entradas um botão biométrico aparecerá automaticamente',
          'Compatível com iPhone (Face ID), Android e computadores com Windows Hello',
          'Dica rápida: pressione Enter na tela de Face ID para dispensar e entrar sem biometria',
        ],
      },
      {
        tipo: 'tip',
        texto: '⌨️ Atalho: após digitar o PIN, pressione Enter na tela de "Ativar Face ID?" para dispensá-la sem usar o mouse — vai direto para o sistema.',
      },
      {
        tipo: 'tip',
        texto: '📱 iPhone: Adicione o sistema à tela inicial (Compartilhar → Adicionar à Tela de Início) para o melhor resultado com Face ID.',
      },
      {
        tipo: 'steps',
        titulo: 'Trocar Usuário Ativo',
        items: [
          'Clique no avatar no rodapé da barra lateral esquerda',
          'O menu de usuários abrirá — selecione o usuário desejado',
          'Útil quando múltiplos colaboradores usam o mesmo dispositivo',
        ],
      },
    ],
  },
  {
    id: 'navegacao',
    icon: '🗺️',
    titulo: 'Navegação',
    subtitulo: 'Sidebar, topbar, mobile e atalhos',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'Todos os módulos ficam na barra lateral esquerda, organizados por categoria. As seções são colapsáveis — clique no título da categoria para recolher ou expandir. A topbar exibe informações em tempo real.',
      },
      {
        tipo: 'tabela',
        titulo: 'Categorias da Barra Lateral',
        cols: ['Seção', 'Módulos'],
        rows: [
          ['📊 Principal', 'Dashboard com visão geral financeira'],
          ['💰 Financeiro', 'Bancos, Receitas, Despesas, DRE, Fluxo, Cartões, Empréstimos, Fornecedores, Funcionários, Estoque'],
          ['🍽️ Negócio', 'Cardápio, KDS, Setores de Impressão'],
          ['🎯 Planejamento', 'Tarefas, Orçamento, Metas, Alertas, Recorrências'],
          ['🛠️ Utilidades', 'Bloco de Notas, Mapa'],
          ['🔗 Integração', 'Relatórios e Exportação'],
          ['🔐 Sistema', 'Usuários & Permissões, Auditoria, Empresa, Ajuda'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Seções Colapsáveis da Sidebar',
        items: [
          'Clique no título de qualquer categoria para recolher ou expandir seus itens',
          'O estado recolhido é salvo — na próxima visita a sidebar mantém a configuração',
          'Clique em "← Recolher" no rodapé para compactar toda a sidebar (modo ícones)',
          'No modo compacto, passe o mouse sobre os ícones para ver o nome do módulo',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Topbar — informações em tempo real',
        items: [
          '📍 Localização: bairro/cidade detectado pelo GPS',
          '🌡️ Temperatura: graus Celsius atualizado a cada 10 minutos',
          '📅 Data e hora: dia da semana, data por extenso e hora com segundos',
          '🧮 Calculadora: clique no ícone para abrir calculadora flutuante com teclado numérico',
          '📅 Calendário: clique no ícone para ver o mês com marcadores de tarefas',
          '📝 Notas: clique no ícone para abrir o painel flutuante do Bloco de Notas',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Uso no Celular',
        items: [
          'Toque em ☰ para abrir a barra lateral',
          'Barra inferior com 5 atalhos rápidos para os módulos mais usados',
          'Botão + dourado no canto inferior direito para criar lançamentos rapidamente',
          'Adicione à tela inicial para usar como app: Compartilhar → Adicionar à Tela de Início',
        ],
      },
      {
        tipo: 'tip',
        texto: 'Clique em "← Recolher" no rodapé da sidebar para compactar e ganhar mais espaço na tela.',
      },
    ],
  },
  {
    id: 'dashboard',
    icon: '📊',
    titulo: 'Dashboard',
    subtitulo: 'Visão geral financeira, KPIs e gráficos',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O Dashboard é a tela inicial e mostra um resumo completo da situação financeira atual, incluindo KPIs, gráficos dos últimos 6 meses e alertas de vencimento.',
      },
      {
        tipo: 'tabela',
        titulo: 'Indicadores (KPIs)',
        cols: ['Indicador', 'Significado'],
        rows: [
          ['🟢 A Receber', 'Total de contas a receber em aberto'],
          ['🔴 A Pagar', 'Total de despesas pendentes de pagamento'],
          ['🟡 Saldo Projetado', 'A Receber menos A Pagar — indica saúde do caixa'],
          ['⚠️ Vencendo em 7 dias', 'Quantidade e valor das contas que vencem em breve'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Seções do Dashboard',
        items: [
          'Gráfico de barras: Receitas vs Despesas dos últimos 6 meses',
          'Gastos por categoria: percentual e barra de progresso',
          'Alertas de vencimento: contas vencidas (vermelho) e urgentes (amarelo)',
          'Metas: resumo com barra de progresso de cada objetivo',
        ],
      },
    ],
  },
  {
    id: 'bancos',
    icon: '🏦',
    titulo: 'Bancos e Contas',
    subtitulo: 'Saldos, cadastro e transferências',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Cadastrar Banco / Conta',
        items: [
          'Clique em "+ Novo banco"',
          'Informe o nome do banco, saldo atual e escolha uma cor identificadora',
          'Clique em "Salvar"',
          'Clique no ícone ✏️ para editar o saldo a qualquer momento',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Transferências entre Contas',
        items: [
          'Clique em "Transferir"',
          'Selecione a conta de origem e a de destino',
          'Informe o valor e a data',
          'Os saldos são atualizados automaticamente',
        ],
      },
      {
        tipo: 'tip',
        texto: 'O saldo total consolidado de todas as contas aparece no topo da página.',
      },
    ],
  },
  {
    id: 'receitas',
    icon: '💵',
    titulo: 'Receitas',
    subtitulo: 'Registrar e categorizar entradas',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Registrar uma Receita',
        items: [
          'Clique em "+ Nova receita"',
          'Preencha: descrição, valor, data, categoria e banco onde foi recebida',
          'Opcionalmente adicione notas',
          'Clique em "Salvar"',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Categorias Comuns',
        cols: ['Categoria', 'Uso'],
        rows: [
          ['Vendas', 'Receita de produtos ou serviços vendidos'],
          ['Prestação de Serviços', 'Honorários, consultorias, freelas'],
          ['Aluguel Recebido', 'Receita de imóveis alugados'],
          ['Investimentos', 'Rendimentos, dividendos, juros'],
          ['Outros', 'Receitas diversas não classificadas'],
        ],
      },
      {
        tipo: 'tip',
        texto: 'Use os chips de mês no topo da tela para visualizar receitas de um período específico.',
      },
    ],
  },
  {
    id: 'despesas',
    icon: '💸',
    titulo: 'Despesas (A Pagar)',
    subtitulo: 'Lançamentos, filtro por mês, cartão e parcelamento',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Lançar uma Despesa',
        items: [
          'Clique em "+ Nova conta" ou use o botão + no celular',
          'Preencha: descrição, valor, data, categoria e prioridade',
          'Selecione a forma de pagamento — se for cartão de crédito, campos extras aparecem',
          'Campos obrigatórios ficam com borda vermelha pulsante se não preenchidos',
          'Os dados digitados nunca são apagados em caso de erro — corrija e salve',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Lançar Compra Parcelada no Cartão de Crédito',
        items: [
          'Clique em "+ Nova conta"',
          'Preencha descrição e valor total da compra',
          'Em Forma de Pagamento, selecione "💳 Cartão de Crédito"',
          'Escolha o cartão, número de parcelas (1x a 24x) e o mês da 1ª cobrança',
          'Clique em "Adicionar" — o sistema cria automaticamente uma parcela por mês',
          'Cada parcela aparece em Despesas E na fatura do cartão no mês correto',
        ],
      },
      {
        tipo: 'warn',
        texto: '⚠️ Não ative "Recorrência" ao parcelar no cartão. O parcelamento já gera todas as parcelas automaticamente. Recorrência é para despesas que nunca terminam (aluguel, assinatura).',
      },
      {
        tipo: 'lista',
        titulo: 'Filtro de Mês com Navegação',
        items: [
          'Clique em Pendente, Pago ou Vencido para ver somente o mês atual',
          'Use as setas ‹ e › ao lado do mês para navegar para meses anteriores ou futuros',
          'Clique no nome do mês (ex: "Junho 2026") para voltar ao mês atual',
          'Ao filtrar por status, 4 KPIs aparecem: Total do mês / Pendente / Vencido / Pago',
          'O filtro "Todos" mostra todos os meses sem restrição',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Status das Despesas',
        cols: ['Status', 'Significado'],
        rows: [
          ['🔴 Vencida', 'Data de vencimento já passou e não foi paga'],
          ['🟡 Urgente', 'Vence em até 3 dias'],
          ['🔵 Pendente', 'Aguardando pagamento'],
          ['🟢 Pago', 'Pagamento confirmado'],
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Parcelamento vs Recorrência — quando usar cada um',
        cols: ['Situação', 'O que usar'],
        rows: [
          ['Comprei algo em 6x no cartão', 'Parcelamento no cartão (tem fim definido)'],
          ['Aluguel todo mês sem prazo', 'Recorrência (sem data de encerramento)'],
          ['Netflix cobrado no cartão todo mês', 'Recorrência'],
          ['Geladeira em 12x no cartão', 'Parcelamento no cartão'],
        ],
      },
    ],
  },
  {
    id: 'recorrencias',
    icon: '🔄',
    titulo: 'Recorrências',
    subtitulo: 'Despesas e receitas fixas automáticas',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'Recorrências são despesas ou receitas que se repetem indefinidamente (aluguel, assinaturas, salários, pro-labore). O sistema gera os lançamentos automaticamente ao abrir o app, cobrindo os próximos 13 meses.',
      },
      {
        tipo: 'steps',
        titulo: 'Criar uma Recorrência',
        items: [
          'Vá em Recorrências no menu lateral',
          'Clique em "+ Nova Recorrência"',
          'Preencha: descrição, valor, tipo (despesa ou receita), frequência e categoria',
          'Informe a data do primeiro vencimento',
          'Clique em "Criar" — os próximos 13 meses são gerados imediatamente',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Frequências Disponíveis',
        cols: ['Frequência', 'Intervalo'],
        rows: [
          ['Semanal', 'A cada 7 dias'],
          ['Quinzenal', 'A cada 15 dias'],
          ['Mensal', 'Todo mês na mesma data'],
          ['Bimestral', 'A cada 2 meses'],
          ['Trimestral', 'A cada 3 meses'],
          ['Anual', 'Uma vez por ano'],
        ],
      },
      {
        tipo: 'warn',
        texto: '⚠️ Recorrência ≠ Parcelamento. Use recorrência para gastos sem prazo de término. Para compras parceladas no cartão (com fim definido), use o parcelamento na aba Despesas.',
      },
      {
        tipo: 'tip',
        texto: 'Para forçar a geração imediata dos lançamentos, clique em "▶ Gerar agora" no topo da página. O sistema sempre gera 13 meses à frente.',
      },
    ],
  },
  {
    id: 'cartoes',
    icon: '💳',
    titulo: 'Cartões de Crédito',
    subtitulo: 'Faturas, limite disponível, pagamento e float',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Cadastrar Cartão',
        items: [
          'Acesse Cartões de Crédito no menu',
          'Clique em "+ Novo Cartão"',
          'Preencha: nome, banco, bandeira, 4 últimos dígitos, limite, dia de fechamento e vencimento',
          'Escolha uma cor identificadora',
          'Com o limite cadastrado, o sistema calcula automaticamente o saldo disponível',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Saldo Disponível',
        items: [
          'Cada card mostra "Disponível: R$ X" — limite menos gastos da fatura atual',
          'Após pagar a fatura, o disponível volta ao limite total automaticamente (em verde)',
          'Se o cartão não tem limite cadastrado, aparece "Limite não definido" — edite o cartão para definir',
          'A barra de uso muda de cor: branca (normal) → vermelha (acima de 80%)',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Pagar Fatura',
        items: [
          'Na aba Cartões, localize o cartão e o mês desejado',
          'Clique em "💳 Pagar fatura — R$ X,XX"',
          'Confirme o valor (pode ajustar), data do pagamento e conta de origem',
          'Marque "Deduzir do banco" para descontar o valor do saldo bancário',
          'O pagamento aparece em Despesas com categoria "Fatura Cartão"',
          'Após pagar, o saldo disponível volta ao limite total',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Inteligência de Float 💡',
        items: [
          'O sistema calcula o melhor dia para comprar em cada cartão',
          'Dias de float: quantos dias até o pagamento da fatura',
          'Janela ótima: logo após o fechamento — máximo prazo para pagar',
          'Verde = janela ótima | Amarelo = atenção | Vermelho = próximo ao fechamento',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Importar Fatura (CSV)',
        items: [
          'Exporte o extrato do seu banco em formato CSV',
          'No cartão desejado, clique em "Importar Fatura"',
          'Selecione o arquivo CSV — o sistema detecta as colunas automaticamente',
          'Revise os lançamentos e confirme a importação',
        ],
      },
      {
        tipo: 'tip',
        texto: 'Para lançar uma compra parcelada no cartão, vá em Despesas → + Nova conta → selecione Cartão de Crédito e informe as parcelas. Os lançamentos aparecem automaticamente na fatura do mês correto.',
      },
      {
        tipo: 'tip',
        texto: 'Compatível com: Nubank, Itaú, C6, Bradesco, Santander e qualquer banco que exporte CSV.',
      },
    ],
  },
  {
    id: 'fluxo',
    icon: '📈',
    titulo: 'Fluxo de Caixa',
    subtitulo: 'Projeção de saldo em 30, 60 e 90 dias',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O Fluxo de Caixa mostra a projeção de saldo futuro com base nos recebimentos e pagamentos previstos.',
      },
      {
        tipo: 'tabela',
        titulo: 'Projeções Automáticas',
        cols: ['Período', 'Como funciona'],
        rows: [
          ['30 dias', 'Saldo atual + recebimentos previstos − pagamentos previstos nos próximos 30 dias'],
          ['60 dias', 'Mesma lógica considerando o período de 60 dias'],
          ['90 dias', 'Projeção trimestral — ideal para planejamento de médio prazo'],
        ],
      },
      {
        tipo: 'warn',
        texto: '⚠️ Atenção: se algum dos valores aparecer em vermelho, você terá saldo negativo naquele período. Tome providências com antecedência.',
      },
      {
        tipo: 'tip',
        texto: 'Use os chips de mês para analisar entradas e saídas de qualquer mês do ano.',
      },
    ],
  },
  {
    id: 'dre',
    icon: '📋',
    titulo: 'DRE — Resultado',
    subtitulo: 'Demonstrativo de Resultado do Exercício',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O DRE consolida o resultado financeiro do período: receitas menos despesas, indicando se o negócio está lucrando ou tendo prejuízo.',
      },
      {
        tipo: 'tabela',
        titulo: 'Como Interpretar o DRE',
        cols: ['Linha', 'Significado'],
        rows: [
          ['Receita Bruta', 'Total de receitas do período'],
          ['(−) Despesas Fixas', 'Custos que não variam com a produção (aluguel, salários)'],
          ['(−) Despesas Variáveis', 'Custos que variam com a operação (matéria-prima, comissões)'],
          ['= Resultado', 'Lucro (positivo) ou Prejuízo (negativo)'],
        ],
      },
      {
        tipo: 'tip',
        texto: 'Analise o DRE mensalmente para identificar onde reduzir custos ou onde aumentar receitas.',
      },
    ],
  },
  {
    id: 'orcamento',
    icon: '🎯',
    titulo: 'Orçamento',
    subtitulo: 'Metas de gasto vs realizado',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Criar Orçamento',
        items: [
          'Clique em "+ Novo orçamento"',
          'Defina a categoria e o valor máximo previsto para o período',
          'O sistema monitora automaticamente os gastos reais naquela categoria',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Leitura do Orçamento',
        cols: ['Cor', 'Significado'],
        rows: [
          ['🟢 Verde', 'Dentro do orçamento'],
          ['🟡 Amarelo', 'Acima de 75% do limite'],
          ['🔴 Vermelho', 'Orçamento estourado'],
        ],
      },
    ],
  },
  {
    id: 'estoque',
    icon: '📦',
    titulo: 'Estoque & CMV',
    subtitulo: 'Produtos, insumos, movimentações, CMV e Curva ABC',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O módulo de Estoque controla entradas e saídas de insumos/produtos, calcula o CMV (Custo das Mercadorias Vendidas) real e classifica os itens por impacto financeiro (Curva ABC). Tudo integrado ao financeiro.',
      },
      {
        tipo: 'tabela',
        titulo: '4 Abas do Módulo',
        cols: ['Aba', 'O que faz'],
        rows: [
          ['📦 Produtos', 'Cadastro de todos os insumos com estoque atual, mínimo, custo médio e preço de venda'],
          ['↕️ Movimentações', 'Histórico completo de entradas, saídas e ajustes com custo total por período'],
          ['📊 CMV', 'CMV% do mês vs meta, gráfico 6 meses, ranking de custo por produto'],
          ['🔢 Curva ABC', 'Classifica produtos por impacto no custo: A (80%), B (15%), C (5%)'],
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Tipos de Item',
        cols: ['Tipo', 'Uso'],
        rows: [
          ['Produto', 'Item vendável — aparece no Cardápio e tem preço de venda'],
          ['Insumo', 'Matéria-prima usada na produção — controle de estoque interno'],
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Cadastrar Produto / Insumo',
        items: [
          'Acesse Estoque & CMV no menu lateral',
          'Clique em "+ Produto"',
          'Preencha: nome, categoria, tipo (produto/insumo), unidade (kg/un/L/etc.), custo médio, estoque atual e mínimo',
          'Informe dados fiscais se necessário: NCM, CFOP, origem',
          'Vincule ao fornecedor principal — opcional mas recomendado',
          'Clique em "Criar"',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Categorias Gerenciáveis',
        items: [
          'As categorias de estoque são editáveis — clique em "Categorias" no topo da página',
          'Crie, renomeie ou exclua categorias conforme a realidade do seu negócio',
          'Exemplos: Carnes, Bebidas, Laticínios, Embalagens, Higiene, Insumos de Cozinha',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Registrar Entrada (Compra)',
        items: [
          'Clique em "📥 Entrada" no produto desejado (ou no botão do header)',
          'Selecione o produto, informe a quantidade e o custo unitário da nota',
          'O sistema recalcula o custo médio ponderado automaticamente',
          'Marque "Gerar conta a pagar" para criar a despesa vinculada no financeiro',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Registrar Saída (Consumo/Venda)',
        items: [
          'Clique em "📤 Saída" no produto',
          'Informe a quantidade consumida ou vendida',
          'O sistema debita do estoque e registra o custo na composição do CMV',
          'Motivos disponíveis: Consumo/Venda, Perda/Vencimento, Devolução a fornecedor',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'CMV — Como calcular',
        items: [
          'CMV Real = soma de (quantidade × custo unitário) de todas as SAÍDAS do mês',
          'CMV% = CMV Real ÷ Receita Bruta × 100',
          'Meta padrão food service: 28% a 35%',
          'Configure sua meta no slider da aba CMV — o sistema mostra se está dentro ou fora',
          'O custo médio ponderado garante precisão mesmo com compras a preços diferentes',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Campos Fiscais (NF-e)',
        items: [
          'NCM: código de 8 dígitos da Nomenclatura Comum do Mercosul',
          'CFOP: código fiscal da operação (ex: 5102 — venda dentro do estado)',
          'Origem: nacional (0) ou importado (1-8)',
          'Esses campos facilitam a emissão de NF-e em sistemas integrados',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 Integração financeira: ao registrar uma entrada com "Gerar conta a pagar", a despesa aparece automaticamente na aba Despesas com a descrição da compra.',
      },
    ],
  },
  {
    id: 'cardapio',
    icon: '🍽️',
    titulo: 'Cardápio',
    subtitulo: 'Tabela de produtos, filtros e complementos',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O módulo de Cardápio gerencia todos os produtos vendáveis e complementos do seu negócio, com filtros por categoria e setor de impressão, além de controle de disponibilidade.',
      },
      {
        tipo: 'tabela',
        titulo: 'Abas do Cardápio',
        cols: ['Aba', 'Conteúdo'],
        rows: [
          ['🍽️ Produtos', 'Todos os itens do cardápio com preço, categoria, setor de impressão e disponibilidade'],
          ['➕ Complementos', 'Adicionais e opções de personalização — acréscimos, remoções, substituições'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Filtros Disponíveis',
        items: [
          'Busca por nome ou código do produto',
          'Filtro por categoria (ex: Lanches, Bebidas, Sobremesas)',
          'Filtro por setor de impressão (ex: Cozinha, Bar, Frituras)',
          'Filtro por status: Ativo, Inativo ou Todos',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Cadastrar Produto no Cardápio',
        items: [
          'Na aba Produtos, clique em "+ Produto"',
          'Preencha: nome, código, categoria, preço de venda e custo',
          'Selecione o setor de impressão (onde o pedido será impresso)',
          'Defina se está disponível ou indisponível (toggle)',
          'Adicione complementos vinculados se necessário',
          'Clique em "Criar"',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Cadastrar Complemento',
        items: [
          'Alterne para a aba "Complementos"',
          'Clique em "+ Complemento"',
          'Preencha: nome, código, categoria, preço e custo',
          'Complementos podem ser gratuitos (preço 0) ou cobrados',
          'Clique em "Criar"',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 O setor de impressão define para qual impressora/KDS o pedido é enviado. Configure os setores em "Setores de Impressão" antes de cadastrar produtos.',
      },
    ],
  },
  {
    id: 'kds',
    icon: '📺',
    titulo: 'KDS — Kitchen Display System',
    subtitulo: 'Tela de pedidos para cozinha, setores e viewer',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O KDS (Kitchen Display System) é uma tela digital para a cozinha ou bar exibir os pedidos em tempo real, substituindo os comandos físicos. Cada setor pode ter seu próprio KDS.',
      },
      {
        tipo: 'tabela',
        titulo: 'Abas do Módulo KDS',
        cols: ['Aba', 'Função'],
        rows: [
          ['📺 KDS', 'Lista e configura as telas KDS disponíveis — abre o viewer em tela cheia'],
          ['📋 Pedidos', 'Gerenciamento de todos os pedidos: criar, editar, avançar status e fechar'],
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Configurar um KDS',
        items: [
          'Clique em "+ Novo KDS"',
          'Dê um nome (ex: Cozinha Principal, Bar)',
          'Selecione os setores de impressão que este KDS deve exibir',
          'Configure a cor de fundo, colunas e auto-refresh',
          'Clique em "Abrir Viewer" para abrir em tela cheia no dispositivo da cozinha',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Criar Pedido',
        items: [
          'Na aba Pedidos, clique em "+ Novo Pedido"',
          'Selecione a mesa ou identifique o cliente',
          'Adicione os itens do cardápio com quantidades',
          'Adicione complementos e observações por item',
          'Clique em "Confirmar" — o pedido aparece no KDS automaticamente',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Status do Pedido',
        cols: ['Status', 'Significado'],
        rows: [
          ['🟡 Aguardando', 'Pedido recebido, ainda não iniciado'],
          ['🔵 Em preparo', 'Cozinha iniciou o preparo'],
          ['🟢 Pronto', 'Pedido pronto para entrega'],
          ['✅ Entregue', 'Pedido entregue ao cliente'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Viewer — Tela da Cozinha',
        items: [
          'Abra o viewer em tela cheia no tablet ou monitor da cozinha',
          'Pedidos são exibidos em cards coloridos por tempo de espera',
          'Verde: até 10 min | Laranja: até 20 min | Vermelho: acima de 20 min',
          'Toque no card para avançar o status do pedido',
          'Auto-refresh configurável: atualiza de 10 em 10 segundos por padrão',
        ],
      },
    ],
  },
  {
    id: 'impressoes',
    icon: '🖨️',
    titulo: 'Setores de Impressão',
    subtitulo: 'Configuração de impressoras, setores e modelo de cupom',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O módulo de Setores de Impressão permite configurar diferentes impressoras para diferentes áreas do negócio (cozinha, bar, caixa) e personalizar o modelo do cupom fiscal/não-fiscal.',
      },
      {
        tipo: 'tabela',
        titulo: 'Abas do Módulo',
        cols: ['Aba', 'Função'],
        rows: [
          ['🏷️ Setores', 'Cadastro dos setores de impressão: nome, impressora, largura do papel e comportamento'],
          ['⚙️ Config', 'Configurações globais da impressora: logo, CNPJ, endereço, observações'],
          ['📄 Modelo', 'Editor visual do cupom — preview em tempo real do que será impresso'],
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Criar Setor de Impressão',
        items: [
          'Na aba Setores, clique em "+ Novo Setor"',
          'Dê um nome ao setor (ex: Cozinha, Bar, Caixa)',
          'Selecione a impressora ou IP da impressora de rede',
          'Defina a largura do papel: 58mm ou 80mm',
          'Configure se imprime automaticamente ao receber pedidos',
          'Clique em "Salvar"',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Configurações do Cupom',
        items: [
          'Logo da empresa: URL da imagem (recomendado: PNG com fundo branco)',
          'Mostrar CNPJ, endereço e telefone no cabeçalho',
          'Mensagem personalizada no rodapé (ex: "Obrigado pela preferência!")',
          'Data e hora de emissão, número do pedido e identificador da mesa',
          'Preview ao vivo: veja exatamente como o cupom será impresso',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 Impressoras térmicas Bluetooth (como a Datecs, Epson TM ou similares) funcionam via WebBluetooth no Chrome. Acesse em HTTPS ou localhost para ativar o recurso.',
      },
    ],
  },
  {
    id: 'empresa',
    icon: '🏢',
    titulo: 'Dados da Empresa',
    subtitulo: 'Cadastro completo por perfil',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O módulo Dados da Empresa armazena todas as informações institucionais do perfil atual, usadas em cupons, relatórios e cabeçalhos de documentos.',
      },
      {
        tipo: 'tabela',
        titulo: 'Informações Cadastradas',
        cols: ['Campo', 'Uso'],
        rows: [
          ['Nome Fantasia / Razão Social', 'Identificação da empresa em todos os documentos'],
          ['CNPJ / IE / IM', 'Dados fiscais para emissão de notas e cupons'],
          ['Endereço completo', 'Exibido no cabeçalho do cupom e no mapa'],
          ['Telefone / Celular / E-mail', 'Contatos exibidos no cupom e em relatórios'],
          ['PIX e dados bancários', 'Dados para cobrança e recebimento'],
          ['Redes sociais', 'Instagram, Facebook, site — exibidos no cupom'],
          ['Horário de funcionamento', 'Informação para o cliente'],
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Atualizar Dados da Empresa',
        items: [
          'Acesse "Empresa" no menu lateral (seção Sistema)',
          'Preencha ou atualize os campos desejados',
          'O logo pode ser definido por URL ou upload de imagem',
          'Clique em "Salvar" — as alterações são aplicadas imediatamente em cupons e relatórios',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 Cada perfil tem seus próprios dados de empresa. Se você gerencia múltiplos negócios, os dados são isolados por perfil.',
      },
    ],
  },
  {
    id: 'notas',
    icon: '📝',
    titulo: 'Bloco de Notas',
    subtitulo: 'Anotações rápidas com editor e cores',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O Bloco de Notas permite criar anotações livres, lembretes e textos importantes. Cada nota tem título editável, conteúdo livre, cor identificadora e salvamento automático.',
      },
      {
        tipo: 'lista',
        titulo: 'Dois modos de acesso',
        items: [
          'Painel flutuante: clique no ícone 📝 na topbar para abrir um painel sem sair da tela atual',
          'Página completa: acesse "Bloco de Notas" no menu lateral para o editor expandido',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Criar uma Nota',
        items: [
          'Clique em "+ Nova nota" ou no botão + na barra lateral do módulo',
          'A nota é criada com título "Nova nota" — clique no título para renomear',
          'Digite o conteúdo na área de texto — salvamento automático após 800ms de inatividade',
          'Escolha uma cor clicando nos círculos coloridos na toolbar',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Funcionalidades',
        cols: ['Recurso', 'Como usar'],
        rows: [
          ['Auto-save', 'Conteúdo salvo automaticamente 0,8s após parar de digitar'],
          ['Cores', '8 cores disponíveis para identificar visualmente as notas'],
          ['Ordenação', 'Notas ordenadas por data de atualização — mais recentes no topo'],
          ['Exclusão', 'Botão 🗑 na toolbar — confirmação antes de excluir'],
          ['Contador', 'Status bar exibe contagem de palavras e caracteres'],
        ],
      },
      {
        tipo: 'tip',
        texto: '📝 As notas são separadas por perfil — cada perfil tem seu próprio conjunto de notas isoladas.',
      },
    ],
  },
  {
    id: 'mapa',
    icon: '🗺️',
    titulo: 'Mapa Interativo',
    subtitulo: 'OpenStreetMap com pesquisa e marcadores',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O Mapa Interativo usa OpenStreetMap para exibir um mapa navegável com sua localização atual, pesquisa por endereços e marcadores personalizados.',
      },
      {
        tipo: 'lista',
        titulo: 'Funcionalidades do Mapa',
        items: [
          '📍 Localização atual: marcador azul mostra onde você está (requer permissão de GPS)',
          '🔍 Pesquisa: digite um endereço, cidade ou ponto de interesse e pressione Enter',
          '📌 Marcadores: clique em qualquer ponto do mapa para adicionar um pin',
          '↕️ Arrastar pins: mova os marcadores para ajustar a posição',
          '🗑 Limpar pins: botão "Limpar pins" remove todos os marcadores da sessão',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Pesquisar um Endereço',
        items: [
          'Digite o endereço, nome do local ou cidade no campo de pesquisa',
          'Pressione Enter ou clique em "Buscar"',
          'O mapa centraliza no resultado e adiciona um marcador de pesquisa',
          'Para pesquisar outro local, basta digitar novamente',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Ir para sua Localização',
        items: [
          'Clique no botão 📍 ao lado da barra de pesquisa',
          'Se já houver localização detectada, o mapa centraliza imediatamente',
          'Se não houver, o sistema solicita permissão de GPS ao dispositivo',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 O mapa centraliza automaticamente na cidade da empresa cadastrada em "Dados da Empresa" ou na sua localização GPS detectada pela topbar.',
      },
    ],
  },
  {
    id: 'tarefas',
    icon: '✅',
    titulo: 'Tarefas & Agenda',
    subtitulo: 'Compromissos, lembretes e calendário',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Criar Tarefa',
        items: [
          'Clique em "+ Nova tarefa"',
          'Preencha: título, data, prioridade e descrição',
          'Defina o status inicial (pendente, em andamento)',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Status das Tarefas',
        cols: ['Status', 'Uso'],
        rows: [
          ['🔵 Pendente', 'Ainda não iniciada'],
          ['🟡 Em andamento', 'Em execução'],
          ['🟢 Concluída', 'Finalizada'],
          ['🔴 Cancelada', 'Não será realizada'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Calendário com pontos de tarefas',
        items: [
          'Clique no ícone 📅 na topbar para abrir o mini-calendário flutuante',
          'Dias com tarefas pendentes exibem um ponto dourado abaixo da data',
          'O dia atual aparece destacado em dourado',
          'Use ‹ e › para navegar entre meses sem sair da tela atual',
          'Clique em um dia com ponto para ir diretamente à lista de tarefas daquele dia',
        ],
      },
      {
        tipo: 'tip',
        texto: 'O ícone 📅 na topbar abre um mini-calendário. Dias com tarefas pendentes aparecem com um ponto dourado.',
      },
    ],
  },
  {
    id: 'relatorios',
    icon: '📤',
    titulo: 'Relatórios e Exportação',
    subtitulo: 'CSV, backup e restauração',
    conteudo: [
      {
        tipo: 'tabela',
        titulo: 'Exportações Disponíveis',
        cols: ['Exportação', 'Conteúdo', 'Formato'],
        rows: [
          ['Despesas e A Receber', 'Todos os lançamentos financeiros', 'CSV'],
          ['Receitas', 'Todas as receitas registradas', 'CSV'],
          ['Completo', 'Tudo em um único arquivo', 'CSV'],
          ['Backup completo', '100% dos dados do sistema', 'JSON'],
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Fazer Backup',
        items: [
          'Clique em "⬇️ Exportar backup completo"',
          'O arquivo JSON será baixado no seu dispositivo',
          'Guarde em local seguro (Google Drive, pendrive, etc.)',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Restaurar Backup',
        items: [
          'Clique em "⬆️ Restaurar backup"',
          'Selecione o arquivo JSON do backup',
          'Confirme a restauração — os dados atuais serão substituídos',
        ],
      },
      {
        tipo: 'warn',
        texto: '⚠️ Sempre faça um backup antes de restaurar. A restauração substitui todos os dados atuais.',
      },
      {
        tipo: 'steps',
        titulo: 'Abrir CSV no Excel',
        items: [
          'Exporte o arquivo CSV desejado',
          'No Excel: Dados → De Texto/CSV → selecione o arquivo',
          'Escolha delimitador vírgula e codificação UTF-8',
        ],
      },
    ],
  },
  {
    id: 'usuarios',
    icon: '🔐',
    titulo: 'Usuários e Permissões',
    subtitulo: 'Controle de acesso e hierarquia',
    conteudo: [
      {
        tipo: 'tabela',
        titulo: 'Hierarquia de Papéis',
        cols: ['Papel', 'Acesso'],
        rows: [
          ['🟠 Desenvolvedor', 'Acesso total, incluindo gerenciar usuários e permissões'],
          ['🟡 Administrador', 'Acesso total, exceto gerenciar usuários'],
          ['🟢 Gerente', 'Operações e relatórios, sem exclusões'],
          ['🔵 Operador', 'Operações básicas do dia a dia'],
          ['⚫ Visualizador', 'Somente leitura em todos os módulos'],
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Criar Usuário',
        items: [
          'Acesse Usuários & Permissões no menu lateral (seção Sistema)',
          'Clique em "+ Novo Usuário" — será solicitada a senha do desenvolvedor',
          'Preencha: nome, e-mail, senha de acesso e papel',
          'Configure as permissões por módulo na matriz abaixo do formulário',
          'Clique em "Criar usuário"',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Ações de Permissão por Módulo',
        items: [
          'Ver — visualizar os dados do módulo',
          'Criar — adicionar novos registros',
          'Editar — modificar registros existentes',
          'Excluir — remover registros',
          'Exportar — baixar relatórios (módulo Relatórios)',
        ],
      },
      {
        tipo: 'tip',
        texto: '⚡ Presets rápidos: clique no nome de um papel para aplicar automaticamente as permissões padrão daquele papel.',
      },
      {
        tipo: 'lista',
        titulo: 'Segurança',
        items: [
          'Qualquer criação ou edição exige a senha do Desenvolvedor',
          'O usuário Desenvolvedor não pode ser excluído',
          'Senhas são armazenadas como hash (nunca em texto puro)',
        ],
      },
    ],
  },
  {
    id: 'auditoria',
    icon: '📋',
    titulo: 'Auditoria',
    subtitulo: 'Histórico de todas as ações',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'A Auditoria registra automaticamente todas as ações realizadas no sistema com data, horário e usuário responsável.',
      },
      {
        tipo: 'lista',
        titulo: 'O que é Registrado',
        items: [
          'Login e logout de usuários',
          'Criação, edição e exclusão de lançamentos',
          'Criação e edição de recorrências',
          'Criação e edição de usuários',
          'Exportação e restauração de backups',
          'Movimentações de estoque (entradas e saídas)',
          'Criação e edição de pedidos e produtos do cardápio',
        ],
      },
      {
        tipo: 'tip',
        texto: 'Use o campo de busca no topo da página de Auditoria para filtrar por usuário, ação ou detalhe. O histórico guarda os últimos 200 eventos.',
      },
    ],
  },
  {
    id: 'atalhos',
    icon: '⚡',
    titulo: 'Atalhos da Topbar',
    subtitulo: 'Calculadora, calendário, notas e FAB',
    conteudo: [
      {
        tipo: 'lista',
        titulo: '🧮 Calculadora',
        items: [
          'Clique no ícone 🧮 na barra superior para abrir a calculadora flutuante estilo iOS',
          'Suporte a teclado físico: digite os números e operadores diretamente pelo teclado',
          'Suporta as 4 operações: +, −, ×, ÷ e encadeia operações em sequência',
          'AC limpa tudo | C limpa o último número | % converte para porcentagem',
          'Clique fora ou no ícone novamente para fechar',
        ],
      },
      {
        tipo: 'lista',
        titulo: '📅 Calendário',
        items: [
          'Clique no ícone 📅 na barra superior para ver o calendário do mês',
          'O dia atual aparece destacado em dourado',
          'Dias com tarefas pendentes têm um ponto dourado abaixo da data',
          'Use ‹ e › para navegar entre meses',
          'Clique em um dia com ponto para filtrar as tarefas daquele dia',
        ],
      },
      {
        tipo: 'lista',
        titulo: '📝 Bloco de Notas (painel)',
        items: [
          'Clique no ícone 📝 na barra superior para abrir o painel flutuante de notas',
          'Crie e edite notas sem sair da tela atual',
          'Clique em "+ Nova" para criar uma nota rapidamente',
          'Feche clicando fora do painel ou no mesmo ícone',
        ],
      },
      {
        tipo: 'lista',
        titulo: '+ Botão FAB (Mobile)',
        items: [
          'Botão dourado + no canto inferior direito — somente no celular',
          '💵 Nova Receita — lançar receita rapidamente',
          '💸 Nova Despesa — lançar despesa rapidamente',
          '📋 Nova Tarefa — criar tarefa rapidamente',
        ],
      },
    ],
  },
  {
    id: 'administrador',
    icon: '👥',
    titulo: 'Administrador & Sócios',
    subtitulo: 'Cadastro, retiradas e histórico de pro-labore',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O módulo Administrador & Sócios permite cadastrar os sócios e administradores do negócio, registrar retiradas e pro-labore, e acompanhar o histórico completo com KPIs.',
      },
      {
        tipo: 'steps',
        titulo: 'Cadastrar Sócio / Administrador',
        items: [
          'Acesse "Administrador & Sócios" no menu lateral',
          'Clique em "+ Novo Administrador"',
          'Preencha: nome completo, CPF, e-mail, telefone, cargo e participação (%)',
          'Clique em "Salvar"',
        ],
      },
      {
        tipo: 'steps',
        titulo: 'Registrar Retirada / Pro-labore',
        items: [
          'Na aba Sócios, clique em "💸 Retirada" no card do sócio desejado',
          'Informe o valor, data, categoria (Pro-labore, Retirada, Adiantamento) e banco de origem',
          'A retirada é registrada em Despesas e deduzida do banco automaticamente',
          'Clique em "📋 Histórico" para ver todas as retiradas daquele sócio',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Aba Histórico — KPIs e Filtros',
        items: [
          '4 KPIs: Total retirado / Total de retiradas / Média por retirada / Último mês',
          'Filtro por sócio: veja as retiradas de um sócio específico',
          'Filtro por mês: navegue pelo histórico mês a mês',
          'Lista cronológica com status de pagamento e badge por categoria',
          'Sidebar direita: total retirado por cada sócio no período filtrado',
          'Breakdown mensal: barras mostrando volume de retiradas por mês',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Cargos Disponíveis',
        cols: ['Cargo', 'Uso'],
        rows: [
          ['Sócio', 'Participante do negócio com quota'],
          ['Sócio-Administrador', 'Sócio que também administra'],
          ['Administrador', 'Gestor sem participação societária'],
          ['Diretor', 'Cargo executivo'],
          ['Representante Legal', 'Responsável legal perante terceiros'],
        ],
      },
    ],
  },
  {
    id: 'formularios',
    icon: '✍️',
    titulo: 'Preenchimento de Formulários',
    subtitulo: 'Validação, corretor ortográfico e preservação de dados',
    conteudo: [
      {
        tipo: 'intro',
        texto: 'O sistema preserva todos os dados digitados mesmo em caso de erro ao salvar. Campos obrigatórios são destacados visualmente para facilitar a correção.',
      },
      {
        tipo: 'lista',
        titulo: 'Validação Visual dos Campos',
        items: [
          'Ao clicar em "Salvar" ou "Adicionar" com campos obrigatórios vazios, o campo sacude e fica com borda vermelha pulsante',
          'Uma mensagem "⚠ Campo obrigatório" aparece abaixo do campo com erro',
          'A borda e a mensagem somem automaticamente ao começar a digitar no campo',
          'Os dados já preenchidos nos outros campos nunca são apagados — corrija só o que falta',
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Corretor Ortográfico em Português',
        items: [
          'Todos os campos de texto têm corretor ortográfico ativado em Português Brasileiro',
          'Palavras com erro aparecem sublinhadas (vermelho ou tracejado, dependendo do navegador)',
          'Clique com o botão direito sobre a palavra sublinhada para ver sugestões de correção',
          'Funciona automaticamente em: Descrição, Fornecedor, Notas, Categoria e todos os outros campos de texto',
          'Requer Chrome, Edge ou Firefox — o corretor usa o dicionário instalado no dispositivo',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 Os dados do formulário são preservados mesmo se a página sincronizar com a nuvem enquanto você está preenchendo. Nada é perdido.',
      },
    ],
  },
  {
    id: 'dicas',
    icon: '💡',
    titulo: 'Boas Práticas',
    subtitulo: 'Rotinas e dicas de uso',
    conteudo: [
      {
        tipo: 'tabela',
        titulo: 'Rotinas Recomendadas',
        cols: ['Frequência', 'Ação'],
        rows: [
          ['Diária', 'Conferir Dashboard: alertas e saldo projetado. Lançar entradas e saídas do dia'],
          ['Semanal', 'Revisar as contas a pagar da semana seguinte. Verificar lançamentos pendentes de baixa'],
          ['Mensal', 'Analisar DRE e Orçamento vs Realizado. Fazer backup completo dos dados. Verificar metas'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Sincronização',
        items: [
          'Dados salvos automaticamente no Firebase (nuvem) e localStorage',
          'A bolinha colorida na sidebar indica: verde = sincronizado, amarelo = sincronizando, vermelho = erro',
          'Em caso de erro, os dados ficam salvos localmente e sincronizam ao reconectar',
        ],
      },
      {
        tipo: 'tip',
        texto: '🔒 Segurança: nunca compartilhe seu PIN. Use senhas diferentes para cada usuário. Faça backup mensal dos dados.',
      },
    ],
  },
];

function renderAjuda() {
  function buildConteudo(blocos) {
    return blocos.map(function(b) {
      if (b.tipo === 'intro') {
        return el('p', {style:{color:'var(--text2)',fontSize:'13px',marginBottom:'14px',lineHeight:'1.7'}}, b.texto);
      }
      if (b.tipo === 'tip') {
        return el('div', {style:{background:'var(--gold-dim)',borderLeft:'3px solid var(--gold)',padding:'10px 14px',borderRadius:'0 8px 8px 0',margin:'12px 0',fontSize:'12px',color:'var(--text2)',lineHeight:'1.6'}}, b.texto);
      }
      if (b.tipo === 'warn') {
        return el('div', {style:{background:'rgba(192,57,43,.08)',borderLeft:'3px solid var(--danger)',padding:'10px 14px',borderRadius:'0 8px 8px 0',margin:'12px 0',fontSize:'12px',color:'var(--text2)',lineHeight:'1.6'}}, b.texto);
      }
      if (b.tipo === 'lista') {
        return el('div', {style:{marginBottom:'14px'}}, [
          b.titulo ? el('div',{style:{fontSize:'12px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}, b.titulo) : null,
          el('ul', {style:{paddingLeft:'18px',color:'var(--text2)',fontSize:'13px'}},
            b.items.map(function(it){ return el('li',{style:{marginBottom:'5px',lineHeight:'1.6'}}, it); })
          ),
        ].filter(Boolean));
      }
      if (b.tipo === 'steps') {
        var counter = 0;
        return el('div', {style:{marginBottom:'16px'}}, [
          b.titulo ? el('div',{style:{fontSize:'12px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}}, b.titulo) : null,
          el('div',{style:{display:'flex',flexDirection:'column',gap:'8px'}},
            b.items.map(function(it){
              counter++;
              var n = counter;
              return el('div',{style:{display:'flex',gap:'10px',alignItems:'flex-start'}}, [
                el('div',{style:{minWidth:'22px',height:'22px',background:'var(--dark)',color:'var(--gold)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:'800',flexShrink:'0',marginTop:'1px'}}, String(n)),
                el('div',{style:{color:'var(--text2)',fontSize:'13px',lineHeight:'1.6',paddingTop:'2px'}}, it),
              ]);
            })
          ),
        ].filter(Boolean));
      }
      if (b.tipo === 'tabela') {
        var thStyle = {padding:'8px 10px',fontSize:'11px',fontWeight:'700',color:'var(--gold)',textAlign:'left',letterSpacing:'.3px'};
        var tdStyle = {padding:'8px 10px',fontSize:'12px',color:'var(--text2)',borderBottom:'1px solid var(--border)'};
        return el('div', {style:{marginBottom:'14px'}}, [
          b.titulo ? el('div',{style:{fontSize:'12px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}}, b.titulo) : null,
          el('div',{style:{overflowX:'auto',borderRadius:'8px',border:'1px solid var(--border)'}},
            el('table',{style:{width:'100%',borderCollapse:'collapse'}}, [
              el('thead',{style:{background:'var(--dark)'}},
                el('tr',{}, b.cols.map(function(c){ return el('th',{style:thStyle},c); }))
              ),
              el('tbody',{},
                b.rows.map(function(row,ri){
                  return el('tr',{style:{background:ri%2===1?'var(--bg3)':'transparent'}},
                    row.map(function(cell){ return el('td',{style:tdStyle},cell); })
                  );
                })
              ),
            ])
          ),
        ].filter(Boolean));
      }
      return null;
    }).filter(Boolean);
  }

  // Cards de seção
  var cards = AJUDA_SECOES.map(function(s) {
    var isOpen = _ajudaSecao === s.id;
    return el('div', {
      id: 'ajuda-sec-'+s.id,
      style:{
        background:'var(--bg2)',
        border:'1px solid '+(isOpen?'var(--gold)':'var(--border)'),
        borderRadius:'12px',
        overflow:'hidden',
        transition:'border-color .2s',
        marginBottom:'10px',
      }
    }, [
      // Header clicável
      el('button', {
        style:{
          width:'100%',display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',
          background:'none',border:'none',cursor:'pointer',textAlign:'left',
          borderBottom: isOpen ? '1px solid var(--border)' : 'none',
          fontFamily:'inherit',
        },
        onclick: function() {
          _ajudaSecao = isOpen ? null : s.id;
          render();
        },
      }, [
        el('div',{style:{width:'38px',height:'38px',background:'var(--dark)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:'0'}}, s.icon),
        el('div',{style:{flex:'1'}}, [
          el('div',{style:{fontSize:'13px',fontWeight:'700',color:'var(--text)',lineHeight:'1.2'}}, s.titulo),
          el('div',{style:{fontSize:'11px',color:'var(--text3)',marginTop:'2px'}}, s.subtitulo),
        ]),
        el('div',{style:{fontSize:'12px',color:'var(--gold)',fontWeight:'700',flexShrink:'0'}}, isOpen ? '▲ Fechar' : '▼ Ver'),
      ]),
      // Conteúdo expansível
      isOpen ? el('div',{style:{padding:'16px 18px'}}, buildConteudo(s.conteudo)) : null,
    ].filter(Boolean));
  });

  // Botão abrir manual completo
  var btnManual = el('a', {
    href:'manual.html',
    target:'_blank',
    style:{
      display:'flex',alignItems:'center',gap:'12px',padding:'14px 18px',
      background:'var(--dark)',color:'#fff',borderRadius:'12px',textDecoration:'none',
      marginBottom:'24px',cursor:'pointer',
    },
  }, [
    el('div',{style:{width:'40px',height:'40px',background:'var(--gold)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:'0'}}, '📄'),
    el('div',{style:{flex:'1'}}, [
      el('div',{style:{fontWeight:'700',fontSize:'14px',color:'#fff'}}, 'Manual Completo em PDF'),
      el('div',{style:{fontSize:'12px',color:'#a09d98',marginTop:'2px'}}, 'Abre o manual completo — use Ctrl+P ou ⌘+P para salvar como PDF'),
    ]),
    el('div',{style:{fontSize:'13px',color:'var(--gold)',fontWeight:'700'}}, '→ Abrir'),
  ]);

  // Busca rápida
  var buscaInp = el('input', {
    class: 'form-input',
    placeholder: '🔍 Buscar no manual... (ex: backup, PIN, cardápio, KDS)',
    value: '',
    style: {marginBottom:'16px'},
    oninput: function() {
      var q = this.value.toLowerCase().trim();
      var resultEl = document.getElementById('_ajuda-resultados');
      if (!resultEl) return;
      if (!q) { resultEl.style.display='none'; return; }
      var matches = [];
      AJUDA_SECOES.forEach(function(s) {
        s.conteudo.forEach(function(b) {
          var campos = [];
          if (b.texto) campos.push(b.texto);
          if (b.titulo) campos.push(b.titulo);
          if (b.items) campos = campos.concat(b.items);
          if (b.rows) b.rows.forEach(function(r){ campos = campos.concat(r); });
          campos.forEach(function(c) {
            if ((c||'').toLowerCase().includes(q)) {
              matches.push({secao: s.titulo, icon: s.icon, id: s.id, trecho: c});
            }
          });
        });
      });
      var uniq = [];
      var vistosId = {};
      matches.forEach(function(m){
        if(!vistosId[m.id]){ vistosId[m.id]=true; uniq.push(m); }
      });
      resultEl.style.display = 'block';
      resultEl.innerHTML = '';
      if (uniq.length === 0) {
        resultEl.textContent = 'Nenhum resultado para "'+q+'"';
        resultEl.style.color = 'var(--text3)';
        resultEl.style.fontSize = '12px';
        resultEl.style.padding = '10px 0';
        return;
      }
      uniq.slice(0,6).forEach(function(m) {
        var item = document.createElement('button');
        item.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;background:var(--bg3);border:none;border-radius:8px;margin-bottom:6px;cursor:pointer;text-align:left;font-family:inherit';
        item.innerHTML = '<span style="font-size:16px">'+m.icon+'</span><div><div style="font-size:12px;font-weight:700;color:var(--text)">'+m.secao+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">'+m.trecho.slice(0,80)+(m.trecho.length>80?'…':'')+'</div></div>';
        item.onclick = function() {
          _ajudaSecao = m.id;
          render();
          setTimeout(function(){ var el2=document.getElementById('ajuda-sec-'+m.id); if(el2)el2.scrollIntoView({behavior:'smooth',block:'start'}); },100);
        };
        resultEl.appendChild(item);
      });
    },
  });

  var buscaResultados = el('div', {id:'_ajuda-resultados', style:{display:'none',marginBottom:'16px'}});

  return el('div', {class:'page-content'}, [
    el('div', {class:'page-header'}, [
      el('div', {}, [
        el('h2', {class:'page-title'}, '❓ Central de Ajuda'),
        el('p', {class:'page-sub'}, 'Guia completo de operação — v2.2.0'),
      ]),
    ]),

    btnManual,
    buscaInp,
    buscaResultados,

    el('div', {}, cards),
  ]);
}
