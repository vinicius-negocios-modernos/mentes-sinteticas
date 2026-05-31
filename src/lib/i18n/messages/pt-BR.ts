/**
 * Portuguese (Brazil) — default locale.
 *
 * All user-facing strings are centralised here so that adding a new language
 * only requires creating a sibling file (e.g. `en-US.ts`) with the same shape.
 */
export const messages = {
  common: {
    appName: "Mentes Sinteticas",
    tagline: "O Atheneum Digital",
    loading: "Carregando...",
    skipToContent: "Pular para conteudo principal",
    accountNav: "Conta do usuario",
    signOut: "Sair",
    breadcrumbNav: "Breadcrumb",
    searchEmptyTitle: "Nenhum resultado encontrado",
    searchEmptyWithQuery:
      'Nao encontramos resultados para "{query}". Tente ajustar os termos de busca.',
    searchEmptyNoQuery:
      "Nao encontramos resultados. Tente ajustar os termos de busca.",
  },

  home: {
    heroTitle: "Mentes Sinteticas",
    heroSubtitle:
      "Acesse a sabedoria acumulada da humanidade. Converse com clones digitais gerados via arquitetura cognitiva avancada.",
    selectMindTitle: "Selecionar Mente",
    selectMindDescription:
      "Escolha com quem voce quer debater hoje. De filosofos antigos a estrategistas modernos.",
    knowledgeBaseTitle: "Base de Conhecimento",
    knowledgeBaseDescription:
      "Gerencie os textos sagrados e obras completas que alimentam as Mentes Sinteticas via vetorizacao.",
    knowledgeBaseStatus: "Google Gemini File Search Ativo",
    noMindsFound: "Nenhuma mente encontrada",
    emptyStateTitle: "Comece sua jornada intelectual",
    emptyStateDescription:
      "Escolha uma mente sintetica acima para iniciar sua primeira conversa. Cada mente oferece uma perspectiva unica de um grande pensador.",
    emptyStateAction: "Iniciar sua primeira conversa",
    selectMindCardTitle: "Selecionar Mente",
    selectMindCardDescription:
      "Escolha com quem voce quer debater hoje. De filosofos antigos a estrategistas modernos.",
    knowledgeBaseCardTitle: "Base de Conhecimento",
    knowledgeBaseCardDescription:
      "Gerencie os textos sagrados e obras completas que alimentam as Mentes Sinteticas via vetorizacao.",
    fileSearchActive: "Google Gemini File Search Ativo",
  },

  chat: {
    inputPlaceholder: "Digite sua questao estrategica...",
    inputAriaLabel: "Digite sua mensagem",
    send: "Enviar",
    sendAriaLabel: "Enviar mensagem",
    endSession: "Encerrar Sessao",
    onlineStatus: "Online",
    talkTo: "Converse com",
    defaultGreeting:
      "Explore ideias, questione estrategias, aprofunde conhecimentos",
    suggestedPrompts: [
      "Qual sua visao sobre lideranca?",
      "Resuma seus principais ensinamentos",
      "Como aplicar suas ideias no mundo atual?",
      "Conte sobre uma experiencia transformadora",
    ],
    newConversation: "+ Nova Conversa",
    noConversations: "Nenhuma conversa ainda",
    noConversationsDescription:
      "Inicie um dialogo com esta mente para explorar novas ideias.",
    noTitle: "Sem titulo",
    deleteConversation: "Excluir conversa",
    deleteConfirm: "Excluir esta conversa?",
    today: "Hoje",
    yesterday: "Ontem",
    daysAgo: "d atras",
    copied: "Copiado!",
    copyFailed: "Falha ao copiar texto.",
    copyAriaLabel: "Copiar mensagem",
    userAvatar: "Avatar do usuario",
    mindAvatar: "Avatar de",
    mindAvatarGeneric: "Avatar da mente",
    mindResponding: "A mente esta respondendo",
    mindRespondingLive: "A mente esta respondendo...",
    scrollToBottom: "Ir para o final",
    tokenWarning:
      "Voce usou mais de 80% do seu limite diario de tokens.",
    tokenWarningClose: "Fechar aviso",
    copyCode: "Copiar codigo",
    copyCodeShort: "Copiar",
    codeCopied: "Copiado!",
    codeBlockAria: "Bloco de codigo {lang}",
    collapseMore: "Mostrar mais",
    collapseLess: "Mostrar menos",
    userLabel: "EU",
    defaultMindInitials: "MS",
    messageFromUser: "Mensagem do usuario",
    messageFrom: "Mensagem de {mindName}",
    messageFromMind: "Mensagem da mente",
    avatarOf: "Avatar de {mindName}",
    openConversations: "Abrir conversas",
    conversationsTitle: "Conversas",
    talkToMind: "Converse com {mindName}",
    conversationMessagesLabel: "Mensagens da conversa com {mindName}",
    initialGreeting:
      "Ola. Eu sou a consciencia digital de **{mindName}**. Em que posso contribuir para sua estrategia hoje?",
    helperText:
      "{mindName} acessara seus {context} para responder.",
    fallbackError: "Erro ao processar mensagem.",
    errorTitle: "Erro no chat",
    errorDescription:
      "Ocorreu um erro na interface de chat. Tente reconectar.",
    errorRetry: "Tentar novamente",
    helperMemory: "arquivos de memoria",
    helperKnowledge: "conhecimentos",
    usageTooltip: "Uso diario: {percentage}% | ${cost}",
  },

  auth: {
    loginTitle: "Entrar",
    loginDescription: "Entre para acessar suas conversas",
    loginButton: "Entrar",
    signupTitle: "Criar Conta",
    signupDescription: "Junte-se as Mentes Sinteticas",
    signupButton: "Criar Conta",
    email: "Email",
    emailPlaceholder: "seu@email.com",
    password: "Senha",
    passwordPlaceholder: "Sua senha",
    passwordMinLength: "Minimo 6 caracteres",
    noAccount: "Nao tem conta?",
    createAccount: "Criar conta",
    hasAccount: "Ja tem conta?",
    goToLogin: "Entrar",
    signupSuccess:
      "Conta criada! Verifique seu email para confirmar o cadastro.",
    requiredFields: "Email e senha sao obrigatorios.",
    invalidCredentials: "Credenciais invalidas.",
    createAccountError: "Erro ao criar conta.",
    accountCreatedLogin: "Conta criada. Faca login.",
  },

  onboarding: {
    dialogLabel: "Onboarding - conheca o Mentes Sinteticas",
    step1Title: "Bem-vindo ao Atheneum",
    step1Description:
      "As Mentes Sinteticas sao consciencias digitais inspiradas em grandes pensadores da humanidade. Cada mente possui conhecimentos, personalidade e estilo unicos -- como ter um mentor pessoal de outra era.",
    step2Title: "Escolha uma Mente",
    step2Description:
      "Na pagina inicial, voce encontrara as mentes disponiveis. Cada uma representa um pensador diferente. Clique em qualquer nome para iniciar uma conversa com essa mente.",
    step3Title: "Inicie uma Conversa",
    step3Description:
      "Digite sua pergunta ou escolha uma sugestao para comecar. A mente respondera com base em seus conhecimentos originais. Suas conversas ficam salvas para voce retomar quando quiser.",
    stepProgress: "Passo {current} de {total}",
    skip: "Pular",
    previous: "Anterior",
    start: "Comecar",
    next: "Proximo",
  },

  footer: {
    builtWith: "Construido com Google Gemini 2.0 Flash & File API",
  },

  mindProfile: {
    about: "Sobre",
    personalityTraits: "Tracos de Personalidade",
    expertise: "Areas de Expertise",
    knowledgeSources: "Fontes de Conhecimento",
    noKnowledgeSources: "Nenhuma fonte de conhecimento disponivel",
    noKnowledgeSourcesDescription:
      "Esta mente ainda nao possui documentos de conhecimento associados.",
    conversationStarters: "Sugestoes de Conversa",
    startConversation: "Iniciar Conversa",
    startConversationWith: "Iniciar conversa com",
    era: "Era",
    nationality: "Nacionalidade",
    breadcrumbHome: "Home",
  },

  offline: {
    indicator:
      "Voce esta offline. Alguns recursos podem nao estar disponiveis.",
    pageTitle: "Voce esta offline",
    pageDescription:
      "Reconecte-se a internet para continuar usando o Mentes Sinteticas.",
    retry: "Tentar Novamente",
    offlineTag: "(offline)",
    chatDisabled: "Conecte-se para enviar mensagens",
    pageDescriptionFull:
      "Reconecte-se a internet para continuar usando o Mentes Sinteticas. Suas conversas recentes podem estar disponiveis no cache local.",
  },

  sharing: {
    shareButton: "Compartilhar",
    shareAriaLabel: "Compartilhar conversa",
    sharedBadge: "Compartilhada",
    sharedIndicator: "Conversa compartilhada",
    linkCopied: "Link copiado para area de transferencia",
    copyLink: "Copiar link",
    copyFallback: "Copie o link",
    revokeSharing: "Revogar compartilhamento",
    revokeTitle: "Revogar compartilhamento",
    revokeDescription:
      "Ao revogar, o link atual deixara de funcionar. Quem acessar o link vera uma pagina de erro. Deseja continuar?",
    revokeConfirm: "Revogar",
    shareRevoked: "Compartilhamento revogado",
    cancel: "Cancelar",
    createAccountCta: "Crie sua conta para conversar",
    exploreMindsCta: "Conhecer mais mentes",
    sharedConversationHeader: "Cabecalho da conversa compartilhada",
    sharedConversationLog: "Conversa compartilhada com {mindName}",
    shareError: "Erro ao compartilhar",
    revokeError: "Erro ao revogar compartilhamento",
    footerLabel: "Rodape do Mentes Sinteticas",
    footerNavLabel: "Navegacao do rodape",
  },

  memory: {
    panelTitle: "Memorias",
    buttonLabel: "Memorias",
    panelDescription: "O que {mindName} lembra sobre voce",
    emptyState:
      "Esta mente ainda nao tem memorias sobre voce. Converse mais para que ela aprenda!",
    typeFact: "Fatos",
    typePreference: "Preferencias",
    typeTopic: "Topicos de Interesse",
    typeInsight: "Insights",
    deleteOne: "Excluir memoria",
    deleteAll: "Apagar todas as memorias desta mente",
    deleteAllConfirmTitle: "Apagar todas as memorias?",
    deleteAllConfirmDescription:
      "Todas as memorias que {mindName} tem sobre voce serao permanentemente excluidas. Esta acao nao pode ser desfeita.",
    cancel: "Cancelar",
    confirmDelete: "Apagar tudo",
  },

  voice: {
    // Labels
    startRecording: "Iniciar gravacao de voz",
    stopRecording: "Parar gravacao de voz",
    listenMessage: "Ouvir mensagem em voz alta",
    stopListening: "Parar leitura",
    voiceModeOn: "Desativar modo voz",
    voiceModeOff: "Ativar modo voz",
    autoPlayOn: "Desativar leitura automatica",
    autoPlayOff: "Ativar leitura automatica",
    // Status
    recordingStarted: "Gravacao iniciada",
    recordingStopped: "Gravacao encerrada",
    transcriptReady: "Texto transcrito",
    ttsStarted: "Leitura em voz alta iniciada",
    ttsStopped: "Leitura em voz alta encerrada",
    voiceModeEnabled: "Modo voz ativado",
    voiceModeDisabled: "Modo voz desativado",
    // Errors
    errorPermission:
      "Permissao de microfone negada. Habilite o microfone nas configuracoes do navegador.",
    errorNoSpeech:
      "Nenhuma fala detectada. Tente novamente mais perto do microfone.",
    errorNetwork:
      "Erro de rede no reconhecimento de voz. Verifique sua conexao.",
    errorAborted: "Gravacao interrompida.",
    errorAudioCapture:
      "Nao foi possivel acessar o microfone. Verifique se outro app esta usando.",
    errorGeneric: "Erro no reconhecimento de voz. Tente novamente.",
    // Tooltips
    voiceModeTooltip: "Modo voz",
    autoPlayTooltip: "Leitura automatica de respostas",
    // A11y live announcements
    a11yRecording: "Gravando",
    a11yProcessing: "Processando",
    a11yPlaying: "Reproduzindo resposta",
  },

  soundscape: {
    controlsLabel: "Controles de audio ambiente",
    ambientSound: "Som Ambiente",
    on: "Ligado",
    ambientOff: "Som ambiente desligado",
    enableAmbient: "Ativar som ambiente",
    disableAmbient: "Desativar som ambiente",
    mute: "Silenciar audio",
    unmute: "Ativar audio",
    volumeLabel: "Volume do som ambiente",
    activateAudio: "Ativar Audio Ambiente",
    reducedMotionHint:
      "Audio silenciado por preferencia de acessibilidade (prefers-reduced-motion). Clique em unmute para ativar.",
    a11yMuted: "a11y",
    // A11y live announcements
    a11yEnabled: "Som ambiente ativado",
    a11yDisabled: "Som ambiente desativado",
  },

  debate: {
    navLabel: "Debates",
    pageTitle: "Debates",
    setupTitle: "Novo Debate",
    topicLabel: "Topico do Debate",
    topicPlaceholder:
      "Ex: Qual e o papel da tecnologia no futuro da educacao?",
    selectMinds: "Selecione as Mentes",
    startDebate: "Iniciar Debate",
    creating: "Criando Debate...",
    nextTurn: "Proximo Turno",
    interject: "Intervir",
    pause: "Pausar",
    resume: "Retomar",
    end: "Encerrar",
    newDebate: "Novo Debate",
    completed: "Debate concluido",
    paused: "Debate pausado",
    processing: "Processando...",
    back: "Voltar",
    loadingDebate: "Carregando debate...",
    errorTitle: "Erro no debate",
    errorDescription:
      "Ocorreu um erro ao carregar o debate. Tente novamente.",
    errorRetry: "Tentar novamente",
    startInstruction:
      'Clique em "Proximo Turno" para iniciar o debate.',
    mindResponding: "{mindName} esta respondendo",
    interjectPlaceholder: "Sua mensagem para o debate...",
    maxMinds: "Maximo de 4 mentes por debate.",
    minTopic: "O topico deve ter pelo menos 3 caracteres.",
    minMinds: "Selecione pelo menos 2 mentes para o debate.",
    youLabel: "Voce",
    roundLabel: "Round",
    turnLabel: "Turno",
    // Interface — toasts & status
    debateCompletedToast: "Debate concluido!",
    errorNextTurn: "Erro ao avancar turno.",
    turnOf: "Vez de {mindName}",
    debateFinished: "Debate finalizado",
    debateResumed: "Debate retomado",
    debateCompletedAllRounds:
      "Debate concluido — todos os rounds foram completados.",
    errorProcessTurn: "Erro ao processar turno. Tente novamente.",
    errorInterject: "Erro ao intervir.",
    errorSendInterject: "Erro ao enviar interjeccao.",
    statusPaused: "pausado",
    statusResumed: "retomado",
    statusEnded: "encerrado",
    debateActionToast: "Debate {action}.",
    errorControl: "Erro ao controlar debate.",
    // Interface — labels & a11y
    participantsAside: "Participantes do debate",
    participantsHeading: "Participantes",
    roundTurnLabel:
      "Round {round} de {maxRounds}, Turno {turn} de {totalTurns}{endedSuffix}{pausedSuffix}",
    ariaEndedSuffix: ", Debate encerrado",
    ariaPausedSuffix: ", Debate pausado",
    roundEndedSuffix: " · Debate encerrado",
    roundPausedSuffix: " · Debate pausado",
    debateLog: "Debate entre mentes",
    interjectFormLabel: "Intervir no debate",
    interjectSrLabel: "Sua mensagem para o debate",
    sendInterject: "Enviar interjeccao",
    sendInterjectButton: "Enviar",
    cancelInterject: "Cancelar interjeccao",
    cancel: "Cancelar",
    processingResponseOf: "Processando resposta de {mindName}",
    nextTurnAria: "Proximo turno — vez de {mindName}",
    mindFallback: "mente",
    resumeAria: "Retomar debate",
    pauseAria: "Pausar debate",
    endAria: "Encerrar debate",
    newDebateAria: "Criar novo debate",
    controlsLabel: "Controles do debate",
    // Message component
    youSaid: "Voce disse",
    youSr: "Voce:",
    mindSaid: "{mindName} disse",
    mindFallbackCap: "Mente",
    turnNumberLabel: "Turno {turn}",
    mindSr: "{mindName}:",
    mindThinking: "{mindName} esta pensando...",
    thinking: "Pensando...",
    // Setup component
    errorLoadMinds: "Erro ao carregar mentes.",
    errorCreate: "Erro ao criar debate.",
    errorCreateRetry: "Erro ao criar debate. Tente novamente.",
    setupFormLabel: "Configurar debate",
    topicLegend: "Topico do debate",
    charCount: "{count}/500 caracteres",
    mindsLegend: "Selecione as mentes participantes",
    selectMindsCount: "Selecione as Mentes ({count}/4)",
    loadingMinds: "Carregando mentes",
    availableMinds: "Mentes disponiveis",
    mindOptionTitleSep: " — ",
    mindOptionSelected: " (selecionada)",
    creatingAria: "Criando debate, aguarde",
    startDebateAria: "Iniciar debate",
    // Page-level (debate/page.tsx + debate/[debateId]/page.tsx)
    setupPageLabel: "Configuracao de debate",
    pageNavLabel: "Navegacao",
    backToHomeAria: "Voltar para pagina inicial",
    pageIntro:
      "Selecione 2 a 4 mentes e defina um topico. Elas debaterao entre si em turnos — e voce controla o ritmo.",
    viewPageLabel: "Debate em andamento",
  },

  errors: {
    generic: "Erro ao processar mensagem.",
    streamUnavailable: "Stream not available",
    // Global error page (app/error.tsx) + ErrorBoundary fallback
    somethingWentWrong: "Algo deu errado",
    unexpectedRetry: "Ocorreu um erro inesperado. Tente novamente.",
    unexpected: "Ocorreu um erro inesperado.",
    tryAgain: "Tentar novamente",
    backToHome: "Voltar ao inicio",
    persistHint: "Se o problema persistir, tente recarregar a pagina.",
    reloadPage: "Recarregar pagina",
    // Chat error boundary (app/chat/[mindId]/error.tsx)
    connectionInterrupted: "Conexao interrompida",
    chatConnectFailed:
      "Nao foi possivel conectar com esta mente. Tente novamente em alguns instantes.",
  },

  // Server-returned messages (backend API routes / services — SYS-13).
  api: {
    sessionExpired: "Sessao expirada. Faca login novamente.",
    rateLimited:
      "Limite de {maxAllowed} mensagens por {window} atingido. Tente novamente em {retryAfter} segundos.",
    perMinute: "minuto",
    perHour: "hora",
    tokenDailyLimit:
      "Voce atingiu o limite de uso diario de tokens. Tente novamente amanha.",
    tokenMonthlyLimit:
      "Voce atingiu o limite de uso mensal de tokens. Tente novamente no proximo mes.",
    conversationNotFound: "Conversa nao encontrada ou acesso negado.",
    mindNotFound: "Mente nao encontrada.",
    apiKeyMissing: "Chave da API nao configurada.",
    chatProcessing: "Erro ao processar sua mensagem. Tente novamente.",
    // Debate routes (api/debate/route.ts, api/debate/[debateId]/turn/route.ts)
    debateRateLimited:
      "Limite de {maxAllowed} debates por hora atingido. Tente novamente em {retryAfter} segundos.",
    debateCreateError: "Erro ao criar debate. Tente novamente.",
    debateNotFound: "Debate nao encontrado.",
    debateAlreadyEnded: "Este debate ja foi encerrado.",
    debatePaused: "Este debate esta pausado. Retome antes de continuar.",
    debateNeedsParticipants: "Debate precisa de pelo menos 2 participantes.",
    debateInterjectionRequired: "Mensagem de interjeccao obrigatoria.",
    debateCompleted: "Debate concluido — todos os rounds foram completados.",
    debateConversationNotFound: "Conversa do debate nao encontrada.",
    debateTurnError: "Erro ao processar turno do debate. Tente novamente.",
    // Share routes (api/conversations/[id]/share/route.ts)
    shareRateLimited:
      "Limite de compartilhamento atingido. Tente novamente em {retryAfter} segundos.",
    shareError: "Erro ao compartilhar conversa.",
    unshareError: "Erro ao revogar compartilhamento.",
    // Memory routes (api/memories/route.ts, api/memories/[id]/route.ts)
    authRequired: "Autenticacao necessaria.",
    memoryMindIdRequired: "mindId e obrigatorio para exclusao em massa.",
    memoryConfirmRequired:
      "Confirmacao necessaria. Envie { confirm: true } no body.",
    memoryListError: "Erro ao buscar memorias.",
    memoryBulkDeleteError: "Erro ao excluir memorias.",
    memoryIdRequired: "ID da memoria e obrigatorio.",
    memoryNotFound: "Memoria nao encontrada.",
    memoryDeleteError: "Erro ao excluir memoria.",
  },
} as const;

export type Messages = typeof messages;
