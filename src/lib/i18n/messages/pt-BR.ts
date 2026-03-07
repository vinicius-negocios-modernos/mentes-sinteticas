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
    userLabel: "EU",
    defaultMindInitials: "MS",
    errorTitle: "Erro no chat",
    errorDescription:
      "Ocorreu um erro na interface de chat. Tente reconectar.",
    errorRetry: "Tentar novamente",
    helperMemory: "arquivos de memoria",
    helperKnowledge: "conhecimentos",
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
  },

  footer: {
    builtWith: "Construido com Google Gemini 2.0 Flash & File API",
  },

  errors: {
    generic: "Erro ao processar mensagem.",
    streamUnavailable: "Stream not available",
  },
} as const;

export type Messages = typeof messages;
