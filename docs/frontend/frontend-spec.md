# Frontend Specification — Mentes Sintéticas (AS-IS Audit)

> **Fase 3 do Brownfield Discovery** — autor: Uma (@ux-design-expert)
> **Tipo:** Auditoria UX/Frontend de produção (documenta o frontend COMO ESTÁ)
> **Data:** 2026-05-30
> **Substitui:** versão anterior de 2026-03-06 (desatualizada — descrevia componentes já refatorados, ex. `components/ChatInterface.tsx` que hoje é `components/chat/chat-interface.tsx`).
> **Escopo:** UI/UX, design system, acessibilidade, fluxos, estados. Arquitetura de sistema → @architect (Fase 1); banco → @data-engineer (Fase 2).

---

## 1. Visão Geral do Frontend

Aplicação Next.js 16 (App Router, RSC) que oferece conversas com "mentes sintéticas" (personas históricas) alimentadas por Gemini. Tema visual declarado: **"Dark Academia meets Sci-Fi"** — base indigo profundo, primária roxa, accent ciano. Dark mode é o padrão (`defaultTheme="dark"`), com light/system via `next-themes`.

| Item | Estado verificado |
|------|-------------------|
| Framework | Next.js 16 App Router + React 19 (RSC habilitado) |
| Styling | Tailwind v4 (`@import "tailwindcss"`, `@theme inline`) |
| Componentes base | shadcn/ui (style: `new-york`, baseColor: `zinc`, CSS variables) |
| Ícones | lucide-react (declarado em `components.json`) — **mas há SVGs inline fora do padrão** |
| Tema | `next-themes`, dark default + 7 "mind themes" por `data-mind-theme` |
| i18n | **Custom mínimo, hardcoded pt-BR** (`src/lib/i18n`) — NÃO é next-intl |
| PWA | manifest + service worker (`public/sw.js`, `sw-provider.tsx`, página `/offline`) |
| Erros | `ErrorBoundary` (class) + Sentry + `error.tsx` por rota |
| Telemetria | `@vercel/analytics` + `@vercel/speed-insights` (falham fora da Vercel) |

---

## 2. Inventário de Componentes

### 2.1 Primitivos shadcn/ui (`src/components/ui/`)
`avatar`, `breadcrumb`, `button`, `card`, `dialog`, `input`, `scroll-area`, `sheet`, `skeleton`, `slider`, `sonner` (toaster), `textarea`. Extensões locais sobre shadcn: `empty-state`, `search-empty-state`, `offline-indicator`.

### 2.2 Componentes de domínio
| Domínio | Componentes |
|---------|-------------|
| `minds/` | mind-avatar, mind-card, mind-conversation-starters, mind-knowledge-sources, mind-profile-details, mind-profile-hero, mind-tag |
| `chat/` | chat-interface (515 LOC), chat-message (556 LOC), chat-input, chat-header (284), chat-empty-state, chat-soundscape-bar, chat-voice-wrapper (228), code-block, collapsible-message, conversation-drawer, conversation-list, share-popover (326), shared-conversation-view, soundscape-controls (224) |
| `debate/` | debate-interface (412), debate-message (221), debate-setup (185) |
| `memory/` | memory-panel (267) |
| `layout/` | app-header, app-footer |
| `onboarding/` | onboarding-dialog (175), onboarding-wrapper |
| `providers/` | theme-provider, sw-provider |
| `skeletons/` | chat-messages-skeleton, conversation-list-skeleton, mind-card-skeleton (+ barrel `index.ts`) |
| top-level | error-boundary, home-empty-state |

### 2.3 Hooks (`src/hooks/`)
`use-mind-theme`, `use-offline-conversations`, `use-onboarding`, `use-soundscape`, `use-voice-mode`.

**Observação:** boa modularidade e nomenclatura kebab-case consistente. Pontos de atenção: `chat-message.tsx` (556 LOC) e `chat-interface.tsx` (515 LOC) concentram muita responsabilidade (render, TTS auto-play, scroll, token warning, toasts) — candidatos a decomposição.

---

## 3. Design System / Tokens

### 3.1 Tokens definidos (`globals.css`, 368 linhas)
Tokens HSL no padrão shadcn em `:root` e `.dark`: `background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring`, `--radius: 0.75rem`, fontes Geist (sans/mono). Mapeados via `@theme inline` para utilities Tailwind v4. **7 mind themes** (aristoteles, da-vinci, tesla, curie, hypatia, turing + default) sobrescrevem `primary/accent/ring` + variáveis de gradiente/glow por `data-mind-theme`. Focus-visible global (WCAG 2.4.7), `prefers-reduced-motion` respeitado em múltiplos blocos, safe-area insets para notch, utilitários `.glass-panel` / `.text-gradient`.

### 3.2 GAP CRÍTICO — tokens existem mas são contornados
Apesar do design system de tokens, o código usa **massivamente utilities de cor cruas** em vez de classes semânticas:
- **45 arquivos** usam cores hardcoded (`text-gray-*`, `bg-purple-*`, `text-cyan-*`, `from-purple-400`, `text-white`, `bg-white/N`).
- `text-gray-400` aparece **27×**, `text-gray-300` 11×, `text-gray-500` 3×; `text-white` em **28 arquivos**.
- Gradiente do título duplicado: existe `.text-gradient` em CSS **e** estilo inline `linear-gradient(135deg,#c084fc,#60a5fa)` em `app-header.tsx`, **e** classe `from-indigo-400 via-purple-400 to-cyan-400` — três formas para o mesmo efeito.
- `mind-card.tsx` usa `text-gray-400` e `group-hover:text-purple-400` em vez de `text-muted-foreground` / token primário.

Consequência: light mode e mind-themes não se aplicam de forma consistente (cores cruas ignoram os tokens), e mudanças de marca exigem caça-e-substitui em dezenas de arquivos.

### 3.3 Inconsistências menores de token
- `viewport.themeColor` está hardcoded em **dourado `#c9a55a`** no `layout.tsx`, mas a primária real é roxa (`271 81% 56%`). Barra de status do navegador destoa do tema.
- `metadataBase` cai para `https://mentes-sinteticas.vercel.app` se env ausente — domínio de produção real é `mentes.negociosmodernos.cloud`. JSON-LD do layout tem a URL vercel.app **hardcoded**.

---

## 4. Layout & Navegação

- **Root layout** injeta: skip-link ("Pular para conteúdo principal"), nav fixo de conta (email + Sair) quando logado, ThemeProvider, ErrorBoundary, Toaster (sonner), OfflineIndicator, ServiceWorkerProvider, JSON-LD.
- **Home** (`page.tsx`): hero + grid responsivo de cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) com Suspense + skeletons.
- **Navegação:** baseada em `<Link>` (mind tags → `/mind/[slug]`, header → `/debate`). Há um `breadcrumb` shadcn disponível. Header tem variante com `mindName` (página de chat) e variante hero (home).
- **Sem navbar global persistente** além do botão Sair fixo — navegação é contextual por página.

---

## 5. Fluxos de Usuário (principais)

1. **Onboarding** — `onboarding-dialog` (3 passos, `use-onboarding` controla "visto"), disparado via `onboarding-wrapper` na home.
2. **Descoberta → Chat** — Home (grid de minds) → `/mind/[slug]` (perfil hero, starters, fontes de conhecimento) → `/chat/[mindId]` (chat-interface com greeting personalizado + prompts sugeridos).
3. **Chat** — input (Enter envia, Shift+Enter quebra linha), streaming de resposta, scroll-to-bottom, token warning, voz opcional (STT/TTS via `chat-voice-wrapper`), soundscape ambiente, painel de memórias, drawer de conversas.
4. **Debate** — `/debate` (debate-setup: tópico + seleção de até 4 mentes) → `/debate/[debateId]` (debate-interface, rounds, interjeições).
5. **Compartilhar** — `share-popover` gera link → `/shared/[token]` (view read-only com OG image).
6. **Auth** — `/login`, `/signup` (NextAuth credentials).
7. **Offline** — `/offline` (PWA fallback) + `retry-button` + `offline-indicator` global.

---

## 6. Responsividade

Abordagem mobile-first com breakpoints Tailwind: **53× `sm:`, 31× `md:`, 4× `lg:`**. Targets touch ≥44px declarados (`min-h-11 min-w-11`), safe-area insets para dispositivos com notch, `100dvh` em vez de `100vh`. Cobertura sólida no geral. Risco: o uso baixo de `lg:` sugere que telas grandes (desktop wide) recebem pouca otimização específica além do grid da home.

---

## 7. Estados de Loading / Error / Empty

- **Loading:** excelente cobertura — `loading.tsx` em 8 rotas (root, chat, debate, mind, shared, login, signup) + 3 skeletons dedicados (chat-messages, conversation-list, mind-card).
- **Error:** `error.tsx` em root, chat e debate; `ErrorBoundary` (class) com variantes page/inline + integração Sentry; `global-error.tsx` e `not-found.tsx` presentes.
- **Empty:** componentes dedicados — `empty-state`, `search-empty-state`, `chat-empty-state`, `home-empty-state`.
- **Feedback:** toasts via `sonner` com erros classificados (`classifyError`/`AppError`), severidade (warning/error), duração e ação de retry. Bom padrão.

Este é o ponto mais forte do frontend — cobertura de estados acima da média.

---

## 8. Acessibilidade (validação vs. claim WCAG 2.1 AA)

`docs/accessibility.md` declara conformidade **WCAG 2.1 AA completa** (13 critérios "Implementado"). Evidência no código corrobora boa parte:
- Skip-link funcional, `lang="pt-BR"`, focus-visible global, 39 arquivos com ARIA (`aria-label/role/aria-live/aria-hidden`), 12 arquivos com `sr-only`, targets 44px, `prefers-reduced-motion` tratado de forma abrangente.

**Lacunas / claims não verificados:**
- O doc lista VoiceOver como "testado", **porém a memória do projeto registra que o walkthrough VoiceOver (QG3) e o Lighthouse score (QG2) seguem pendentes** — claim de teste não validado por evidência.
- Contraste (1.4.3) marcado "Implementado", mas o uso pesado de cores cruas (`text-gray-400/500` sobre fundos variados) e dos mind-themes (7 paletas) **não tem validação de contraste automatizada** no repositório. `text-gray-500` sobre `card` escuro é candidato a falha 4.5:1.
- Mind-themes alteram primary/accent dinamicamente; nenhum teste garante que cada uma das 7 paletas mantém ratio AA (o doc afirma manter, sem prova).

---

## 9. Internacionalização

`src/lib/i18n` é uma implementação **custom mínima** com `t()` (dot-notation, interpolação `{param}`, fallback = chave). **Apenas um locale: `pt-BR`** (`messages/pt-BR.ts`), `activeLocale` fixo, sem detecção/troca. O brief mencionava next-intl — **não existe**. Além disso, há **muitas strings pt-BR hardcoded** diretamente em JSX (ex.: greeting do chat-interface `"Ola. Eu sou a consciencia digital de..."`, toasts "Erro ao carregar mentes.", "Maximo de 4 mentes por debate."), contornando o sistema `t()`. Trocar de idioma hoje exigiria refatorar dezenas de strings inline.

---

## 10. Assets / PWA

- **Áudio soundscape é PLACEHOLDER:** `public/audio/soundscapes/*.mp3` e `*.webm` têm **43–75 bytes cada** (stubs, não áudio real). O recurso de soundscape ambiente (controles, `use-soundscape`, `soundscape-controls`) está exposto na UI mas **não-funcional em produção**.
- SVGs genéricos do template Next.js ainda presentes em `public/` (`vercel.svg`, `next.svg`, `window.svg`, `globe.svg`, `file.svg`) — provavelmente órfãos.
- PWA: manifest + `sw.js` + ícones 192/512 presentes; página offline implementada.

---

## 11. UX/Frontend Technical Debts

> Severidade: 🔴 Alta · 🟡 Média · 🟢 Baixa. Esforço rough em dias-dev.

| ID | Débito | Severidade | Esforço (rough) | Impacto UX |
|----|--------|-----------|-----------------|------------|
| UX-1 | Áudio soundscape são placeholders de 43–75 bytes — recurso exposto na UI mas não-funcional | 🔴 Alta | 1d (produzir/licenciar 6 trilhas) | Promessa quebrada: usuário ativa ambiente e nada toca |
| UX-2 | Tokens de design contornados por cores cruas (`text-gray-*`, `bg-purple-*`, `text-white`) em 45 arquivos | 🔴 Alta | 3–4d | Light mode e mind-themes inconsistentes; rebrand custoso |
| UX-3 | Contraste WCAG não validado: `text-gray-400/500` e 7 mind-themes sem teste de ratio AA | 🔴 Alta | 1–2d (auditar + ajustar) | Risco real de falha 1.4.3; claim AA não comprovado |
| UX-4 | Claim de teste VoiceOver/Lighthouse no doc não corresponde ao estado (QG2/QG3 pendentes) | 🟡 Média | 1d (walkthrough + correções) | Doc de a11y superestima conformidade |
| UX-5 | i18n hardcoded pt-BR + strings inline fora do `t()` (greetings, toasts, labels) | 🟡 Média | 2–3d | Internacionalização efetivamente bloqueada |
| UX-6 | `themeColor` dourado (#c9a55a) destoa da primária roxa real | 🟢 Baixa | 0.25d | Barra de status do navegador fora da identidade |
| UX-7 | `metadataBase`/JSON-LD apontam para vercel.app, não para domínio de produção | 🟡 Média | 0.25d | OG/SEO e share cards com URL errada |
| UX-8 | Vercel Analytics + SpeedInsights carregam e falham fora da Vercel | 🟡 Média | 0.25d | Erros de console em prod, sem ganho de telemetria |
| UX-9 | Gradiente do título triplicado (CSS `.text-gradient` + inline + classes Tailwind) | 🟢 Baixa | 0.5d | Manutenção; divergência visual entre usos |
| UX-10 | Ícones inconsistentes: onboarding usa SVG inline; resto usa lucide-react | 🟢 Baixa | 0.5d | Inconsistência visual e de manutenção |
| UX-11 | `chat-message.tsx` (556 LOC) e `chat-interface.tsx` (515 LOC) sobrecarregados | 🟡 Média | 2d | Risco de regressão; difícil evoluir o fluxo central |
| UX-12 | SVGs órfãos do template Next.js em `public/` (vercel/next/window/globe/file) | 🟢 Baixa | 0.1d | Lixo de bundle/repo |
| UX-13 | Baixa otimização desktop-wide (apenas 4× `lg:`, fora o grid da home) | 🟢 Baixa | 1d | Telas grandes subaproveitadas |
| UX-14 | `mind-card` usa `role="article"` em elemento clicável sem link/role de botão claro | 🟢 Baixa | 0.5d | Semântica/teclado ambígua para leitor de tela |

**Total: 14 débitos** (3 Alta · 6 Média · 5 Baixa).

---

## 12. Pontos Fortes (a preservar)

- Cobertura de estados loading/error/empty acima da média (skeletons, error boundaries, Sentry, toasts classificados).
- Infraestrutura de a11y real e abrangente (skip-link, ARIA, focus-visible, reduced-motion, targets 44px, safe-area).
- Sistema de tokens bem estruturado em `globals.css` (a base existe — o débito é não usá-la consistentemente).
- Modularidade de componentes e hooks por domínio, nomenclatura consistente.
- Mind-themes como diferencial de identidade visual por persona.

---

*Documento gerado na Fase 3 (UX) do Brownfield Discovery. Os débitos UX-N alimentam o `technical-debt-DRAFT` (@architect, Fase 4) e o `ux-specialist-review` (Fase 6).*
