# UX Specialist Review

## Projeto: Mentes Sinteticas

**Phase:** Brownfield Discovery - Phase 6 (UX Specialist Review)
**Agent:** @ux-design-expert (Uma)
**Date:** 2026-03-06
**Input:** `docs/prd/technical-debt-DRAFT.md` (Phase 4), `docs/frontend/frontend-spec.md` (Phase 3)
**Status:** COMPLETE

---

## 1. Debitos Validados

Revisao de cada debito UX identificado na Secao 3 do DRAFT, com ajuste de severidade e esforco onde necessario.

### P1-HIGH

| ID | Debito | Severidade Original | Severidade Ajustada | Horas Ajustadas | Prioridade | Impacto UX | Notas |
|----|--------|---------------------|---------------------|-----------------|------------|------------|-------|
| UX-001 | No Design System / Token Architecture | ALTO | **CRITICO** | 10-14 | P0 | Sem sistema de tokens, TODA mudanca visual e um risco. Bloqueia theming, dark/light mode, e temas por mente. Para um produto "legendario", o design system e a fundacao de tudo. | Elevado para CRITICO: sem tokens, nao ha como implementar temas por mente (Feature #10 do DRAFT) nem consistencia visual em escala. Esforco aumentado pois inclui tailwind.config.ts + semantic tokens + documentacao. |
| UX-002 | Zero reusable components | ALTO | ALTO | 12-16 | P1 | Duplicacao de codigo em cada nova pagina. Impossivel testar UI. Impossivel manter consistencia. | Esforco aumentado: alem da extracao basica, cada componente precisa de variantes, tipos, e testes. Minimo: Button, GlassCard, ChatBubble, MessageList, TextArea, Badge, Avatar, PageLayout, MindCard, Header. |
| UX-003 | No streaming for chat responses | ALTO | **CRITICO** | 8-12 | P0 | O debito mais impactante para percepcao do usuario. 5-15 segundos de silencio e inaceitavel para chat. Usuarios assumem que o app quebrou. Para um produto que quer ser "legendario", streaming nao e feature -- e pre-requisito. | Elevado para CRITICO: nenhuma outra melhoria de UX importa se o usuario abandona durante o loading. Streaming e a diferenca entre "prototipo" e "produto". |
| UX-004 | Chat history not persisted | ALTO | ALTO | 6-8 | P1 | Perder conversa com Aristoteles sobre etica e frustrante. Usuarios nao voltam a um produto que descarta suas interacoes. | Esforco aumentado: localStorage e quick fix, mas a solucao real requer database (depende de CROSS-002). Estimativa inclui localStorage como bridge + preparacao para persistencia server-side. |
| UX-005 | Accessibility failures | ALTO | ALTO | 10-14 | P1 | App inacessivel para ~15% da populacao. Risco legal (WCAG). Screen readers leem portugues com pronucia inglesa (lang="en"). | Esforco aumentado: a11y nao e "adicionar ARIA". Requer audit completo, focus management no chat, live regions, contrast fixes em todos os componentes, e testes com screen reader. |

### P2-MEDIUM

| ID | Debito | Severidade Original | Severidade Ajustada | Horas Ajustadas | Prioridade | Impacto UX | Notas |
|----|--------|---------------------|---------------------|-----------------|------------|------------|-------|
| UX-006 | "Base de Conhecimento" card non-functional | MEDIO | MEDIO | 2-3 | P2 | UI enganosa. Cursor pointer sem acao = quebra de confianca. | Concordo com severidade. Remover interatividade visual ou implementar funcionalidade minima. |
| UX-007 | No next/link usage | MEDIO | **ALTO** | 1-2 | P1 | Full page reload em cada navegacao = flash branco, perda de estado, latencia. Em dark mode, o flash branco e especialmente agressivo. | Elevado: o impacto visual do flash branco contra o background #030014 e severo. Quick win com alto retorno. |
| UX-008 | Missing error boundaries | MEDIO | MEDIO | (ver SYS-008) | P1 | White screen of death. Ja contabilizado em System. | Cross-reference mantido. |
| UX-009 | No loading/Suspense boundaries | MEDIO | MEDIO | (ver SYS-009) | P2 | Tela branca durante fetch. | Cross-reference mantido. |
| UX-010 | Unused CSS module file | BAIXO | BAIXO | 0.25 | P0 (quick fix) | Dead code. | Concordo. Deletar imediatamente. |
| UX-011 | Competing font declarations | BAIXO | BAIXO | 0.5 | P3 | Confusao, download desnecessario. | Concordo. |
| UX-012 | Mobile viewport issues | MEDIO | **ALTO** | 6-8 | P1 | Chat apps sao usados primariamente em mobile. h-[calc(100vh-140px)] ignora browser chrome. Touch targets < 44px. Sem mobile nav. | Elevado: mobile e o canal primario para chat. Esforco aumentado pois inclui dvh migration, touch targets, e mobile-specific layout. |
| UX-013 | Missing empty states | MEDIO | MEDIO | 3-4 | P2 | Dead-end para novos usuarios. | Esforco aumentado: empty states precisam de ilustracoes, copy, e CTAs contextuais. |
| UX-014 | Missing meta tags / SEO | MEDIO | MEDIO | 2-3 | P2 | Social sharing pobre. | Concordo. |
| UX-015 | Missing favicon / app icons | MEDIO | MEDIO | 2-3 | P2 | Tab generica. Sem branding. | Esforco ligeiramente aumentado: inclui design do icone alinhado com identidade visual. |
| UX-016 | No chat action feedback | MEDIO | **ALTO** | 8-10 | P1 | Sem copy, timestamps, regenerate, ou edit = chat primitivo. Para um produto "legendario", a interacao com mensagens e fundamental. | Elevado: estas features sao standard em qualquer chat AI (ChatGPT, Claude, Gemini). Esforco aumentado para incluir todas as interacoes basicas. |
| UX-017 | lang="en" should be lang="pt-BR" | MEDIO | MEDIO | 0.25 | P0 (quick fix) | Acessibilidade e SEO. | Concordo. Fix imediato. |
| UX-018 | No chat textarea | MEDIO | **ALTO** | 3-4 | P1 | Input single-line e inaceitavel para prompts complexos. Todos os competidores (ChatGPT, Claude, Gemini) usam textarea auto-resize. | Elevado: e uma das primeiras coisas que um usuario nota ao comparar com outros chat AIs. Esforco aumentado para auto-resize + Shift+Enter. |

### P3-LOW

| ID | Debito | Severidade Original | Severidade Ajustada | Horas Ajustadas | Prioridade | Impacto UX | Notas |
|----|--------|---------------------|---------------------|-----------------|------------|------------|-------|
| UX-019 | Console.log in production | BAIXO | BAIXO | (ver SYS-019) | P3 | Info leak. | Cross-reference. |
| UX-020 | any TypeScript usage | BAIXO | BAIXO | (ver SYS-018) | P3 | Type safety. | Cross-reference. |
| UX-021 | No PWA / offline support | BAIXO | BAIXO | 6-8 | P4 | Sem instalacao. | Concordo. Baixa prioridade para MVP. |

---

## 2. Debitos Adicionados

Debitos UX nao identificados no DRAFT que emergiram da analise detalhada do codigo-fonte.

| ID | Debito | Severidade | Horas | Prioridade | Impacto UX |
|----|--------|-----------|-------|------------|------------|
| UX-NEW-001 | **Sem avatares para mentes.** Mensagens do modelo nao tem identidade visual. Sem foto, icone, ou iniciais. O usuario nao "ve" com quem esta falando. Em um produto sobre conversar com pensadores historicos, a identidade visual e essencial. | ALTO | 4-6 | P1 | Sem avatar, a conversa parece generica. Avatares criam conexao emocional e reforcar a "persona" do pensador. |
| UX-NEW-002 | **Sem indicacao de "quem esta falando" no header do chat.** O header mostra o nome da mente mas sem contexto: sem subtitulo (ex: "Filosofo grego, 384-322 a.C."), sem area de expertise, sem bio curta. | ALTO | 3-4 | P1 | O usuario entra no chat sem saber quem e a mente. Para mentes menos conhecidas, isso e uma barreira. |
| UX-NEW-003 | **Greeting message hardcoded e generica.** Toda mente recebe a mesma saudacao: "Eu sou a consciencia digital de {name}. Em que posso contribuir para sua estrategia hoje?" Nao reflete a personalidade unica de cada pensador. | MEDIO | 2-3 | P2 | Oportunidade perdida de imersao. Socrates deveria perguntar algo provocativo. Sun Tzu deveria falar sobre batalhas. Marcus Aurelius sobre virtude. |
| UX-NEW-004 | **Sem transicao ou animacao de entrada para mensagens.** Mensagens aparecem instantaneamente no DOM sem fade-in ou slide. Competidores (ChatGPT, Claude) usam animacoes sutis. | MEDIO | 2-3 | P2 | Falta de polimento perceptivel. Animacoes sutis dao sensacao de fluidez e qualidade. |
| UX-NEW-005 | **Sem indicador de "typing" contextualizado.** O loading usa 3 bolinhas genericas. Para um produto sobre pensadores historicos, o indicador poderia dizer "{MindName} esta refletindo..." ou "{MindName} esta compondo sua resposta..." | BAIXO | 1-2 | P2 | Small touch que eleva a percepcao de qualidade e imersao. |
| UX-NEW-006 | **Sem onboarding ou tutorial.** Um usuario novo chega na home e precisa descobrir sozinho o que o produto faz. Nao ha tutorial, tooltips, ou fluxo guiado. | MEDIO | 4-6 | P2 | Para um conceito inovador como "conversar com mentes sinteticas", algum onboarding e necessario para explicar a proposta de valor. |
| UX-NEW-007 | **Sem feedback haptico/sonoro ao enviar mensagem.** Nenhum feedback alem da mensagem aparecendo na lista. Sem som sutil, sem vibracao (mobile), sem microanimacao no botao. | BAIXO | 1-2 | P3 | Nice-to-have que adiciona sensacao de responsividade. |
| UX-NEW-008 | **Scroll automatico pode ser intrusivo.** `scrollIntoView({ behavior: "smooth" })` executa em todo update de mensagens, mesmo se o usuario scrollou para cima para reler mensagens anteriores. | MEDIO | 1-2 | P2 | Usuario perde o lugar na conversa ao receber nova mensagem. Pattern correto: auto-scroll apenas se usuario esta proximo do final. |

---

## 3. Visao de Design -- "Legendary Product"

### 3.1 Conceito Central: "O Atheneum Digital"

O Mentes Sinteticas nao e apenas um chat com AI. E um **portal para dialogar com as maiores mentes da humanidade**. A experiencia visual deve evocar a sensacao de entrar em um espaco sagrado de conhecimento -- uma mistura de biblioteca antiga com tecnologia de fronteira.

**Palavras-chave de design:** Gravitas. Imersao. Reverencia intelectual. Futurismo sutil.

### 3.2 Identidade Visual Proposta

**Direcao 1: "Dark Academia meets Sci-Fi"**

A estetica glassmorphism existente e um bom ponto de partida, mas precisa de profundidade e personalidade. Proposta:

- **Paleta base:** Manter o dark mode (#030014) como fundacao. E elegante e apropriado para o tom intelectual.
- **Paleta de acento:** Evoluir de "purple/cyan generico" para uma paleta mais sofisticada:
  - **Gold antigo** (`#C9A961`) para elementos de destaque -- evoca sabedoria, manuscritos, ouro de bibliotecas classicas
  - **Purple profundo** (`#7C3AED`) mantido para interacoes do usuario
  - **Teal escuro** (`#0D9488`) para respostas das mentes -- evoca profundidade intelectual
  - **Amber quente** (`#F59E0B`) para notificacoes e status
  - **Off-white pergaminho** (`#F5F0E8`) para textos em contexts especiais

- **Tipografia:**
  - **Headings:** Uma serif com carater -- **Playfair Display** ou **Cormorant Garamond** -- para evocar a tradicao intelectual
  - **Body text:** Manter **Geist** ou migrar para **Inter** -- clean, legivel, moderno
  - **Chat messages (mentes):** Considerar uma serif leve para as respostas das mentes, diferenciando visualmente de mensagens do usuario (sans-serif)
  - **Monospace:** **JetBrains Mono** para code blocks

- **Texturas e efeitos:**
  - Noise texture sutil no background (2-3% opacity) para dar materialidade
  - Gradientes mais sofisticados: radial gradients que evocam luz de vela ou aurora
  - Border effects que lembram molduras de livros antigos (1px solid com corner ornaments em hover)
  - Glassmorphism mais refinado: blur maior (20px), opacidade mais baixa, borders mais sutis

### 3.3 Temas Ambientais por Mente (Session Themes)

O maior diferenciador visual: cada mente transforma o ambiente do chat.

| Categoria | Mentes | Paleta | Textura/Ambiente | Som Opcional |
|-----------|--------|--------|------------------|-------------|
| **Filosofia Grega** | Socrates, Platao, Aristoteles | Marble white + gold + olive | Colunas de marmore sutis no background. Padrao grego (meander) nos borders. | Lyra grega suave |
| **Filosofia Oriental** | Sun Tzu, Confucio, Lao Tzu | Bamboo green + ink black + red accent | Textura de papel de arroz. Brushstroke elements. | Flauta chinesa ambient |
| **Estoicismo Romano** | Marcus Aurelius, Seneca, Epicteto | Roman red + bronze + stone gray | Textura de pedra. Elementos de arco romano. | Ambient mediterraneo |
| **Renascimento** | Da Vinci, Machiavelli | Sepia + gold leaf + burgundy | Textura de canvas. Sketch lines sutis. | Liuto renascentista |
| **Iluminismo** | Voltaire, Kant, Rousseau | Navy + cream + brass | Textura de papel envelhecido. Tipo de impressao. | Cravo barroco |
| **Ciencia Moderna** | Einstein, Tesla, Feynman | Neon blue + dark + white | Grid de equacoes semi-transparente. Particulas. | White noise suave |
| **Estrategia Militar** | Sun Tzu, Clausewitz, Napoleao | Dark green + gold + iron gray | Mapa topografico sutil. Linhas de batalha. | Tambores distantes |

**Implementacao tecnica:** CSS custom properties por tema, carregados via data attribute no `<main>` do chat. Transicao suave (500ms) ao entrar no chat.

### 3.4 Benchmarks de Referencia

| Produto | O que Copiar | O que Evitar |
|---------|-------------|-------------|
| **ChatGPT** | Streaming fluido. Textarea auto-resize. Copy/regenerate buttons. Sidebar com historico. | UI muito minimalista para o conceito de "mentes historicas". Falta identidade. |
| **Claude** | Typography excelente. Rendering de markdown impecavel. Artifacts. Feedback sutil de streaming. | Tambem minimalista demais para este conceito. |
| **Character.ai** | Conceito mais proximo: chat com personagens. Avatares. Multiplas personalidades. Galeria de personagens. | UI infantil, sem gravitas. Mentes Sinteticas precisa de mais seriedade intelectual. |
| **Perplexity** | Citations e sources inline. Layout limpo. Search-like experience. | Foco em search, nao em conversa. |
| **Poe (Quora)** | Multi-model selection. Chat history persistente. Sidebar eficiente. | Design generico. |

**Posicionamento visual:** Entre a seriedade intelectual do Claude e a personalidade imersiva do Character.ai, com a qualidade de streaming do ChatGPT. Nenhum competidor oferece **temas ambientais por pensador** -- este e o diferenciador visual.

---

## 4. Melhorias Criticas de UX (Priorizadas)

Ordenadas por impacto no usuario, considerando dependencias e esforco.

### Sprint 0: Quick Wins (2-3 horas total)

| # | Melhoria | Horas | Dependencias | Impacto |
|---|----------|-------|-------------|---------|
| 1 | Fix `lang="pt-BR"` no layout.tsx | 0.25 | Nenhuma | A11y + SEO imediato |
| 2 | Deletar `page.module.css` (dead code) | 0.25 | Nenhuma | Limpeza |
| 3 | Substituir `<a>` por `next/link` em todas as paginas | 1-2 | Nenhuma | Elimina flash branco na navegacao |
| 4 | Remover console.log do ChatInterface | 0.25 | Nenhuma | Limpeza |

### Sprint 1: Fundacao de Design System (16-22 horas)

| # | Melhoria | Horas | Dependencias | Impacto |
|---|----------|-------|-------------|---------|
| 5 | Criar design tokens em `tailwind.config.ts` (cores, tipografia, espacamento, radii, shadows) | 4-6 | Quick wins concluidos | Fundacao para tudo |
| 6 | Instalar e configurar shadcn/ui como base de componentes | 2-3 | Design tokens definidos | Componentes acessiveis prontos |
| 7 | Extrair componentes base: Button, GlassCard, PageLayout, Header | 4-6 | shadcn/ui configurado | Reusabilidade |
| 8 | Extrair componentes de chat: ChatBubble, MessageList, ChatInput (textarea auto-resize com Shift+Enter) | 6-8 | Componentes base prontos | Chat usavel |

### Sprint 2: Chat Experience (20-28 horas)

| # | Melhoria | Horas | Dependencias | Impacto |
|---|----------|-------|-------------|---------|
| 9 | **Implementar streaming de respostas** (Vercel AI SDK + ReadableStream) | 8-12 | SYS-021 (refactor gemini.ts) | MAIOR impacto singular em UX |
| 10 | Adicionar avatares para mentes (placeholder com iniciais ate ter imagens reais) | 3-4 | ChatBubble componente | Identidade visual |
| 11 | Adicionar timestamps em mensagens | 1-2 | ChatBubble componente | Contexto temporal |
| 12 | Adicionar botoes: copy, regenerate | 3-4 | ChatBubble componente | Interatividade |
| 13 | Fix auto-scroll (apenas quando proximo do fim) | 1-2 | MessageList componente | Nao perder lugar |
| 14 | Animacao de entrada para mensagens (fade-in + slide-up) | 2-3 | Framer Motion instalado | Polimento |
| 15 | Typing indicator contextualizado ("{Mind} esta refletindo...") | 1 | Nenhuma | Imersao |

### Sprint 3: Identidade e Imersao (18-26 horas)

| # | Melhoria | Horas | Dependencias | Impacto |
|---|----------|-------|-------------|---------|
| 16 | Mind Profile Cards na home (bio, periodo, areas de expertise, retrato) | 6-8 | MindCard componente + dados no manifest | Discoverability |
| 17 | Header do chat com contexto (subtitulo, periodo, expertise) | 2-3 | Dados de mente expandidos | Contexto |
| 18 | Greetings personalizados por mente (config no manifest) | 2-3 | Dados de mente expandidos | Imersao |
| 19 | Sistema de temas por mente (CSS custom properties + data attributes) | 8-12 | Design tokens completos | Diferenciador visual unico |

### Sprint 4: Mobile e Acessibilidade (16-22 horas)

| # | Melhoria | Horas | Dependencias | Impacto |
|---|----------|-------|-------------|---------|
| 20 | Mobile-first redesign: dvh, touch targets 44px+, bottom-safe-area | 6-8 | Componentes extraidos | Usabilidade mobile |
| 21 | Accessibility pass: ARIA, live regions, focus management, contrast fixes | 8-12 | Componentes extraidos | Inclusao + compliance |
| 22 | Skeleton screens (loading.tsx) para home e chat | 2-3 | Layout components | Perceived performance |

### Sprint 5: Polimento e Meta (8-12 horas)

| # | Melhoria | Horas | Dependencias | Impacto |
|---|----------|-------|-------------|---------|
| 23 | Favicon e app icons customizados | 2-3 | Identidade visual definida | Branding |
| 24 | Meta tags completos (OG, Twitter Cards, structured data) | 2-3 | Favicon pronto | Social sharing |
| 25 | Empty states com ilustracoes e CTAs | 2-3 | Componentes base | Onboarding |
| 26 | Error pages (error.tsx, not-found.tsx) com design consistente | 2-3 | Design tokens + componentes | Recovery |

**Total estimado: ~80-113 horas** (todas as melhorias de UX incluindo debitos originais + novos).

---

## 5. Arquitetura de Componentes Proposta

### 5.1 Recomendacao: shadcn/ui + Customizacao

**Pergunta do Architect (Secao 8, Q1):** Custom design system from scratch ou shadcn/ui?

**Resposta definitiva: shadcn/ui customizado.** Razoes:

| Fator | Custom from Scratch | shadcn/ui Customizado |
|-------|--------------------|-----------------------|
| Tempo ate primeiro componente | 20-30h | 2-3h |
| Acessibilidade built-in | Manual (40+ horas) | Incluida (Radix UI primitives) |
| Consistencia | Depende da disciplina | Garantida pela base |
| Customizacao visual | Total | Total (copy-paste, nao npm) |
| Theming | Manual | Suporte nativo via CSS variables |
| Dark mode | Manual | Built-in |
| Estetica glassmorphism | Manual | Customizar theme + variantes |
| Manutencao a longo prazo | 100% do time | Comunidade + time |

shadcn/ui usa Radix UI + Tailwind CSS -- exatamente o stack do projeto. Os componentes sao copiados para o projeto (nao sao dependencia npm), permitindo customizacao total. A estetica glassmorphism pode ser aplicada como variante.

### 5.2 Estrutura de Componentes Proposta

```
src/
  components/
    ui/                          # shadcn/ui base (auto-generated)
      button.tsx
      card.tsx
      input.tsx
      textarea.tsx
      badge.tsx
      avatar.tsx
      dialog.tsx
      dropdown-menu.tsx
      tooltip.tsx
      skeleton.tsx
      separator.tsx
      scroll-area.tsx

    layout/                      # Layout components
      page-layout.tsx            # Wrapper com max-width, padding, font
      header.tsx                 # Shared header com nav
      footer.tsx                 # Shared footer
      glass-panel.tsx            # Glassmorphism container reutilizavel

    chat/                        # Chat-specific components
      chat-interface.tsx         # Orchestrator (slim: state + layout)
      message-list.tsx           # Scrollable message container com auto-scroll inteligente
      chat-bubble.tsx            # Mensagem individual (user/model variantes)
      chat-input.tsx             # Textarea auto-resize + send button
      typing-indicator.tsx       # "{Mind} esta refletindo..." com dots
      message-actions.tsx        # Copy, regenerate, timestamp
      chat-header.tsx            # Nome da mente + contexto + "Encerrar"

    mind/                        # Mind-specific components
      mind-card.tsx              # Card de selecao com avatar, bio, tags
      mind-avatar.tsx            # Avatar com fallback de iniciais
      mind-badge.tsx             # Tags de categoria (Filosofo, Cientista)
      mind-grid.tsx              # Grid responsivo de minds

    shared/                      # Shared components
      empty-state.tsx            # Ilustracao + texto + CTA
      error-display.tsx          # Error com recovery actions
      loading-skeleton.tsx       # Skeleton variants
      gradient-text.tsx          # Text com gradient reutilizavel
```

### 5.3 Design Tokens (tailwind.config.ts)

```typescript
// Proposta de design tokens para tailwind.config.ts
const tokens = {
  colors: {
    // Semantic tokens
    background: {
      DEFAULT: '#030014',
      subtle: '#0A0720',
      muted: '#1e1b4b',
    },
    foreground: {
      DEFAULT: '#ffffff',
      muted: '#9ca3af',    // gray-400
      subtle: '#6b7280',   // gray-500
    },
    primary: {
      DEFAULT: '#7C3AED',  // purple profundo
      light: '#a855f7',
      dark: '#5B21B6',
      ghost: 'rgba(124, 58, 237, 0.2)',
    },
    accent: {
      gold: '#C9A961',     // sabedoria, destaque
      teal: '#0D9488',     // respostas das mentes
      amber: '#F59E0B',    // status, notificacoes
      cyan: '#00f0ff',     // mantido para compat
    },
    surface: {
      glass: 'rgba(255, 255, 255, 0.03)',
      'glass-hover': 'rgba(255, 255, 255, 0.06)',
      'glass-border': 'rgba(255, 255, 255, 0.1)',
      input: 'rgba(0, 0, 0, 0.3)',
    },
    chat: {
      user: 'rgba(124, 58, 237, 0.2)',
      'user-border': 'rgba(124, 58, 237, 0.3)',
      model: 'rgba(31, 41, 55, 0.4)',
      'model-border': 'rgba(55, 65, 81, 0.5)',
    },
    status: {
      success: '#22c55e',
      warning: '#F59E0B',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
  fontFamily: {
    display: ['Playfair Display', 'Georgia', 'serif'],
    sans: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Geist Mono', 'monospace'],
  },
  fontSize: {
    // Type scale
    'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
    'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
    'heading-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
    'heading-md': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
    'body-lg': ['1rem', { lineHeight: '1.6' }],
    'body-md': ['0.875rem', { lineHeight: '1.5' }],
    'body-sm': ['0.75rem', { lineHeight: '1.4' }],
  },
  borderRadius: {
    glass: '1rem',      // 16px - cards, panels
    input: '0.75rem',   // 12px - inputs, buttons
    bubble: '1rem',     // 16px - chat bubbles
    pill: '9999px',     // full - tags, badges
  },
  boxShadow: {
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
    'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.4)',
    glow: '0 0 20px rgba(124, 58, 237, 0.3)',
  },
  backdropBlur: {
    glass: '12px',
    'glass-heavy': '20px',
  },
  spacing: {
    // Semantic spacing
    'page-x': '2rem',        // 32px mobile
    'page-x-lg': '5rem',     // 80px desktop
    'section-gap': '3rem',   // 48px
    'card-padding': '2rem',  // 32px
    'message-gap': '1.5rem', // 24px
  },
}
```

### 5.4 Theme System para Mentes

```typescript
// Cada mente carrega um tema via data attribute
// <main data-mind-theme="greek-philosophy">

const mindThemes = {
  'greek-philosophy': {
    '--mind-primary': '#C9A961',     // gold
    '--mind-accent': '#8B7355',      // bronze
    '--mind-bg-tint': 'rgba(201, 169, 97, 0.03)',
    '--mind-border-tint': 'rgba(201, 169, 97, 0.1)',
    '--mind-gradient': 'linear-gradient(135deg, #C9A961, #8B7355)',
  },
  'eastern-philosophy': {
    '--mind-primary': '#22c55e',     // bamboo green
    '--mind-accent': '#dc2626',      // red seal
    '--mind-bg-tint': 'rgba(34, 197, 94, 0.03)',
    '--mind-border-tint': 'rgba(34, 197, 94, 0.1)',
    '--mind-gradient': 'linear-gradient(135deg, #22c55e, #15803d)',
  },
  'roman-stoicism': {
    '--mind-primary': '#dc2626',     // roman red
    '--mind-accent': '#B8860B',      // bronze
    '--mind-bg-tint': 'rgba(220, 38, 38, 0.03)',
    '--mind-border-tint': 'rgba(220, 38, 38, 0.1)',
    '--mind-gradient': 'linear-gradient(135deg, #dc2626, #B8860B)',
  },
  'modern-science': {
    '--mind-primary': '#3b82f6',     // electric blue
    '--mind-accent': '#00f0ff',      // cyan
    '--mind-bg-tint': 'rgba(59, 130, 246, 0.03)',
    '--mind-border-tint': 'rgba(59, 130, 246, 0.1)',
    '--mind-gradient': 'linear-gradient(135deg, #3b82f6, #00f0ff)',
  },
}
```

---

## 6. Respostas ao Architect (Secao 8)

### Q1: Design System Foundation -- Custom vs shadcn/ui?

**Resposta: shadcn/ui customizado.** (Detalhado na Secao 5.1 acima.)

A estetica glassmorphism existente pode ser preservada e elevada como uma "variante" dos componentes shadcn/ui. O processo:

1. `npx shadcn@latest init` -- configura com Tailwind CSS + dark mode
2. Customizar `globals.css` com os design tokens propostos
3. Adicionar componentes conforme necessidade (`npx shadcn@latest add button card input`)
4. Criar variante `glass` para Card e outros containers
5. Override das cores default com a paleta proposta

**Tradeoff principal:** shadcn/ui usa CSS variables nativas, que se alinham perfeitamente com o sistema de temas por mente. Cada tema pode overridar as variables sem necessidade de class switching complexo.

### Q2: Multi-Mind Debates UI -- Layout?

**Resposta: Layout hibrido "Mesa Redonda" com chat unificado.**

Proposta em 3 niveis de complexidade:

**V1 (MVP - 16h):** Chat unificado com mensagens color-coded por mente. Cada mente tem avatar, cor de borda, e prefixo de nome. O usuario faz a pergunta e cada mente responde em sequencia (round-robin).

```
[Usuario] O que e justica?
[Socrates - gold border] A justica comeca com o autoconhecimento...
[Sun Tzu - green border] Justica no campo de batalha e...
[Marcus Aurelius - red border] A justica e uma das quatro virtudes...
```

**V2 (Enhanced - 24h):** Adicionar "reaction" entre mentes. Apos todas responderem, cada mente pode reagir a pontos especificos das outras. Indicador visual de "concordancia/discordancia" entre mentes.

**V3 (Full Vision - 40h):** Layout de mesa redonda visual. Avatares posicionados em circulo. Linhas de conexao entre mentes que concordam. Timeline de debate navegavel. Export do debate completo.

**Recomendacao:** Comecar com V1. E suficientemente impactante e diferenciador. V2 e V3 podem vir em sprints futuros.

### Q3: Mobile-First Redesign?

**Resposta: Sim, inverter para mobile-first na Phase 2.**

| Aspecto | Decisao | Justificativa |
|---------|---------|---------------|
| Abordagem | Mobile-first | Chat e primariamente mobile. 65%+ do uso sera mobile. |
| Visual preservado | ~70% | A paleta, glassmorphism, e tipografia funcionam em mobile. Layout precisa mudar. |
| Layout mobile | Stack vertical | Header compacto + mensagens full-width + input fixo no bottom com safe-area |
| Navegacao mobile | Bottom sheet para mind selection | Mais natural em mobile que grid de cards |
| Breakpoints | 3 tiers: mobile (<640), tablet (640-1024), desktop (1024+) | Atualmente so usa 2 |
| Chat input mobile | Fixo no bottom com `env(safe-area-inset-bottom)` | Evitar overlap com barra do browser |
| Touch targets | Minimo 44x44px em TODOS os elementos interativos | WCAG requirement |

**O que NAO pode ser preservado:**
- `h-[calc(100vh-140px)]` -- deve usar `dvh` (dynamic viewport height)
- Grid 2-col na home -- stack vertical em mobile, grid em tablet+
- Footer fixo -- deve ser inline no final do conteudo em mobile
- "Encerrar Sessao" como texto pequeno -- deve ser icone ou botao com tap target adequado

### Q4: Mind Profile Pages -- Nivel de riqueza visual?

**Resposta: Experiencia imersiva full-page, mas implementada incrementalmente.**

**Fase 1 (6-8h):** Card expandido na home. Ao clicar, expande inline (ou modal) com:
- Avatar/retrato (placeholder com iniciais + gradiente tematico)
- Nome, periodo historico, nacionalidade
- 3-5 tags de areas de expertise
- Bio curta (2-3 frases)
- Botao "Iniciar Conversa"
- Numero de conversas (quando DB existir)

**Fase 2 (12-16h):** Pagina dedicada `/mind/{slug}` com:
- Hero section full-width com tema ambiental da mente
- Biografia expandida
- "Sample conversations" (3 exemplos pre-definidos)
- Areas de expertise detalhadas com profundidade
- Timeline historica interativa
- Botao CTA proeminente

**Fase 3 (8-12h):** Elementos imersivos:
- Background animado tematico (particulas para cientistas, ondas para filosofos)
- Citacao famosa da mente como hero text
- Indicador de "online/disponivel" (a mente "nunca dorme")
- Sugestoes de topicos para discussao

### Q5: Accessibility Priority -- Minimo viavel?

**Resposta: Implementar em 2 passes.**

**Pass 1 -- Minimo Viavel (6-8h, Sprint 4):**

| Item | Acao | Horas |
|------|------|-------|
| `lang="pt-BR"` | Fix no layout.tsx | 0.25 |
| ARIA live region | `aria-live="polite"` no container de mensagens | 0.5 |
| Role status | `role="status"` no loading indicator | 0.25 |
| Form labels | `aria-label` no input de chat e botao send | 0.5 |
| Error roles | `role="alert"` em mensagens de erro | 0.25 |
| Color contrast | Fix gray-500/600 para gray-400 nos textos com low contrast | 1 |
| Focus indicators | Custom focus-visible styles com anel colorido | 1-2 |
| Skip navigation | Link "Pular para conteudo" | 0.5 |
| Heading hierarchy | h1 > h2 > h3 estruturado em cada pagina | 0.5 |
| Keyboard nav | Tab order logico, Enter/Space em todos interativos | 1-2 |

**Pass 2 -- Dedicado (8-12h, Sprint futuro):**

- Teste com NVDA/VoiceOver
- High contrast mode
- Reduced motion (`prefers-reduced-motion`)
- Screen reader announcements para cada mensagem nova
- Focus trap no chat input durante loading
- Roving tabindex para acoes de mensagem
- Testes automatizados de a11y (axe-core)

---

## 7. Recomendacoes de Design

### 7.1 Quick Wins (Alto impacto, Baixo esforco)

| # | Acao | Horas | Impacto |
|---|------|-------|---------|
| 1 | Fix lang="pt-BR" | 0.25 | A11y + SEO |
| 2 | Substituir `<a>` por `next/link` | 1 | Elimina flash branco |
| 3 | Substituir `<input>` por `<textarea>` auto-resize | 2-3 | Prompts complexos |
| 4 | Typing indicator: "{Mind} esta refletindo..." | 0.5 | Imersao |
| 5 | Deletar page.module.css + console.logs | 0.5 | Limpeza |
| **Total** | | **~5h** | **Transformativo** |

### 7.2 Ordem de Implementacao Recomendada

```
FASE 0: Quick Wins (5h)
  |
  v
FASE 1: Design System + Componentes Base (16-22h)
  |     [UNLOCK: componentes reusaveis, tokens, theming]
  |
  v
FASE 2: Streaming + Chat Improvements (20-28h)
  |     [UNLOCK: experiencia de chat moderna]
  |     [DEPENDE DE: SYS-021 refactor gemini.ts]
  |
  v
FASE 3: Identidade Visual + Temas por Mente (18-26h)
  |     [UNLOCK: diferenciador visual unico]
  |     [DEPENDE DE: design tokens completos]
  |
  v
FASE 4: Mobile + Acessibilidade (16-22h)
  |     [UNLOCK: usabilidade mobile + compliance]
  |     [DEPENDE DE: componentes extraidos]
  |
  v
FASE 5: Polimento + Meta (8-12h)
  |     [UNLOCK: production readiness visual]
  |
  v
FASE 6 (Futuro): Multi-Mind Debates, Voice Mode, Soundscapes
```

### 7.3 Metricas de Sucesso UX

| Metrica | Estado Atual | Target Phase 1 | Target Final |
|---------|-------------|----------------|--------------|
| Time-to-first-token (streaming) | 5-15s (full wait) | < 500ms | < 300ms |
| Lighthouse Accessibility | ~30 (estimado) | > 70 | > 95 |
| Lighthouse Performance | ~60 (estimado) | > 80 | > 90 |
| Component reuse ratio | 0% | > 60% | > 85% |
| WCAG AA compliance | 0 items | Core items | Full compliance |
| Mobile usability | Broken | Functional | Optimized |
| Design token coverage | ~5% (glass-panel, text-gradient) | > 70% | > 95% |

### 7.4 Nota Final sobre a Visao "Legendaria"

O conceito de Mentes Sinteticas e intrinsecamente poderoso. A ideia de conversar com Aristoteles, debater estrategia com Sun Tzu, ou discutir virtude com Marcus Aurelius e fascinante. O que separa um prototipo de um produto "legendario" e:

1. **Imersao sensorial** -- Temas visuais por mente, tipografia que respeita o tom intelectual, e eventualmente audio/voz.
2. **Streaming que parece "pensamento"** -- Nao so mostrar tokens, mas simular o ritmo de pensamento. Pausas sutis em virgulas. Velocidade variavel.
3. **Identidade memoravel** -- Um produto que voce mostra para amigos. "Olha, eu estava debatendo etica com Socrates." O design precisa ser digno de screenshot e compartilhamento.
4. **Gravitas intelectual** -- A tipografia, as cores, os micro-textos. Cada detalhe deve comunicar: "isto e serio, isto e conhecimento, isto e reverencia pelas maiores mentes da humanidade."

A base tecnica existe. O que falta e a camada de experiencia que transforma utilidade em emocao.

---

*Documento gerado por @ux-design-expert (Uma) -- Brownfield Discovery Phase 6*
*Synkra AIOX v2.0*
