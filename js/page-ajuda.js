// ── AJUDA — CENTRAL DE AJUDA v1.1.1 ─────────────────────────────────────────

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
        ],
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
        texto: 'Todos os módulos ficam na barra lateral esquerda, organizados por categoria. A topbar exibe informações em tempo real.',
      },
      {
        tipo: 'tabela',
        titulo: 'Categorias da Barra Lateral',
        cols: ['Seção', 'Módulos'],
        rows: [
          ['📊 Principal', 'Dashboard com visão geral'],
          ['💰 Financeiro', 'Bancos, Receitas, Despesas, DRE, Fluxo, Cartões, Empréstimos, Fornecedores, Funcionários'],
          ['🎯 Planejamento', 'Tarefas, Orçamento, Metas, Alertas, Recorrências'],
          ['🔗 Integração', 'Relatórios e Exportação'],
          ['🔐 Sistema', 'Usuários & Permissões, Auditoria, Ajuda'],
        ],
      },
      {
        tipo: 'lista',
        titulo: 'Topbar — informações em tempo real',
        items: [
          '📍 Localização: bairro/cidade detectado pelo GPS',
          '🌡️ Temperatura: graus Celsius atualizado a cada 10 minutos',
          '📅 Data e hora: dia da semana, data por extenso e hora com segundos',
          '🧮 Calculadora: clique no ícone para abrir calculadora flutuante',
          '📅 Calendário: clique no ícone para ver o mês com marcadores de tarefas',
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
    subtitulo: 'Lançamentos, status e vencimentos',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Lançar uma Despesa',
        items: [
          'Clique em "+ Nova despesa" ou use o botão + no celular',
          'Preencha: descrição, valor, vencimento, categoria e prioridade',
          'Se a despesa se repete todo mês, marque "Recorrente"',
          'Clique em "Salvar"',
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
        tipo: 'lista',
        titulo: 'Prioridades',
        items: [
          'Alta: pagamentos críticos (impostos, folha, aluguel)',
          'Normal: despesas regulares do negócio',
          'Baixa: gastos não urgentes',
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
        texto: 'Recorrências são despesas ou receitas que se repetem automaticamente (aluguel, assinaturas, salários). O sistema gera os lançamentos automaticamente ao abrir o app.',
      },
      {
        tipo: 'steps',
        titulo: 'Criar uma Recorrência',
        items: [
          'Vá em Recorrências no menu lateral',
          'Clique em "+ Nova Recorrência"',
          'Preencha: descrição, valor, tipo (despesa ou receita), frequência e categoria',
          'Informe a data do primeiro vencimento',
          'Clique em "Criar"',
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
        tipo: 'tip',
        texto: 'Para forçar a geração imediata dos lançamentos, clique em "▶ Gerar agora" no topo da página.',
      },
    ],
  },
  {
    id: 'cartoes',
    icon: '💳',
    titulo: 'Cartões de Crédito',
    subtitulo: 'Faturas, float e importação CSV',
    conteudo: [
      {
        tipo: 'steps',
        titulo: 'Cadastrar Cartão',
        items: [
          'Acesse Cartões de Crédito no menu',
          'Clique em "+ Novo Cartão"',
          'Preencha: banco, bandeira, 4 últimos dígitos, limite, dia de fechamento e vencimento',
          'Escolha uma cor identificadora',
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
    id: 'tarefas',
    icon: '✅',
    titulo: 'Tarefas & Agenda',
    subtitulo: 'Compromissos e lembretes',
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
        tipo: 'tip',
        texto: 'O ícone 📅 na topbar abre um mini-calendário. Dias com tarefas pendentes aparecem com um ponto dourado.',
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
        ],
      },
      {
        tipo: 'tip',
        texto: 'Use o campo de busca no topo da página de Auditoria para filtrar por usuário, ação ou detalhe. O histórico guarda os últimos 200 eventos.',
      },
    ],
  },
  {
    id: 'estoque',
    icon: '📦',
    titulo: 'Estoque & CMV',
    subtitulo: 'Produtos, movimentações, CMV e Curva ABC',
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
        tipo: 'steps',
        titulo: 'Cadastrar Produto / Insumo',
        items: [
          'Acesse Estoque & CMV no menu lateral (seção Financeiro)',
          'Clique em "+ Produto"',
          'Preencha: nome, categoria, unidade (kg/un/L/etc.), custo médio, estoque atual e mínimo',
          'Vincule ao fornecedor principal — opcional mas recomendado',
          'Clique em "Criar"',
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
        titulo: 'Curva ABC — Como usar',
        items: [
          'Classe A: ~20% dos produtos mas 80% do custo — controle rigoroso e negociação com fornecedores',
          'Classe B: 15% do custo — revisão semanal suficiente',
          'Classe C: 5% do custo — compra em volume, controle simplificado',
          'Selecione o período de análise: 1, 3, 6 ou 12 meses',
        ],
      },
      {
        tipo: 'tip',
        texto: '💡 Integração financeira: ao registrar uma entrada com "Gerar conta a pagar", a despesa aparece automaticamente na aba Despesas com a descrição da compra.',
      },
    ],
  },
  {
    id: 'atalhos',
    icon: '⚡',
    titulo: 'Atalhos da Topbar',
    subtitulo: 'Calculadora, calendário e FAB',
    conteudo: [
      {
        tipo: 'lista',
        titulo: '🧮 Calculadora',
        items: [
          'Clique no ícone 🧮 na barra superior para abrir a calculadora flutuante estilo iOS',
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
    placeholder: '🔍 Buscar no manual... (ex: backup, PIN, cartão)',
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
        el('p', {class:'page-sub'}, 'Guia completo de operação — v1.1.1'),
      ]),
    ]),

    btnManual,
    buscaInp,
    buscaResultados,

    el('div', {}, cards),
  ]);
}
