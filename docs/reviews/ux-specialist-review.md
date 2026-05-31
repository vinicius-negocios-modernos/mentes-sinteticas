# UX Specialist Review

> **Fase 6 do Brownfield Discovery** — autor: Uma (@ux-design-expert)
> **Revisa:** Seção 3 (Débitos de Frontend/UX, UX-1..14) e Tema F de `docs/prd/technical-debt-DRAFT.md`
> **Insumo de origem:** `docs/frontend/frontend-spec.md` (minha Fase 3)
> **Data:** 2026-05-30
> **Substitui:** versão de 2026-03-06 (predatava o `technical-debt-DRAFT` da Fase 4 — desalinhada com a numeração UX-1..14 atual).
> **Método:** todas as alegações re-verificadas contra `src/`, `public/`, `globals.css` e `docs/accessibility.md`. Nada aceito apenas pelo draft.
> **Veredito QA-gate (input p/ Fase 7):** Seção UX **APPROVED com ajustes** — 14 confirmados (1 com severidade ajustada), 0 rejeitados, +2 débitos novos.

---

## 0. Verificação de campo (evidência)

| Alegação do draft | Comando/arquivo | Resultado |
|-------------------|-----------------|-----------|
| Soundscapes = placeholders 43–75 B | `ls public/audio/soundscapes/` | ✅ 6 `.mp3` (75 B) + 6 `.webm` (43 B) — stubs confirmados |
| Cores cruas em 45 arquivos | `grep -rEl` em `src/` | ✅ exatamente 45 |
| `text-gray-400` 27× · `text-white` 28 arquivos | `grep -rE` | ✅ 27 / 28 |
| `chat-message` 556 / `chat-interface` 515 LOC | `wc -l` | ✅ 556 / 515 |
| `themeColor #c9a55a` + vercel.app | `src/app/layout.tsx:28,35,106` | ✅ dourado + 2× vercel.app hardcoded |
| SVGs órfãos do template | `ls public/*.svg` | ✅ file/globe/next/vercel/window |
| `mind-card` `role="article"` clicável | `src/components/minds/mind-card.tsx:25-28` | ✅ `role="article"` + `cursor-pointer group` sem `onClick`/`href`/`tabIndex` próprio |
| `isAvailable()` não detecta áudio falso | `src/lib/audio/soundscapes.ts:51` | ✅ checa só Web Audio API; placeholders passam o guard → toca nada |
| `use-soundscape` tem master toggle | `src/hooks/use-soundscape.ts:27,300` | ✅ `enabled` já existe, default `true`, persistido em localStorage |

---

## 1. Débitos Validados

> Severidade na escala unificada do draft (🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low). "Tipo" indica se o débito precisa de **design review** (decisão visual/UX) ou é **implementação pura** (mecânico, sem decisão de design).

| ID | Débito | Severidade (confirma/ajusta) | Horas est. | Impacto | Prioridade UX | Tipo | Notas |
|----|--------|------------------------------|-----------|---------|---------------|------|-------|
| **UX-1** | Soundscapes placeholder (43–75 B) expostos na UI | 🟠 High — **ajusto ↓ para 🟡 Medium SE feature-flagged** | 1h (flag off) **ou** 6–10h+ (produzir 6 trilhas reais, fora do código) | Funcional: promessa quebrada | **P4 (flagged) / P2 (must-fix)** | Decisão de produto, depois impl. trivial | `enabled` toggle já existe; default `false` resolve a exposição em ~1h. Áudio real é entrega de conteúdo, não de eng. Ver §3.1 |
| **UX-2** | Tokens contornados por cores cruas em 45 arquivos | 🟠 High — **confirmo** | 20–28h (3–4d) | Visual + funcional (light/mind-themes quebram) | **P2** | **Design review** (mapear cor→token semântico) | Habilitador de UX-3. Maior esforço do track UX. Ver §4 |
| **UX-3** | Contraste WCAG AA não validado (cores cruas + 7 themes) | 🟠 High — **confirmo** | 8–14h (1–2d) | Funcional (compliance/legibilidade) | **P2** (faseado, ver §3.3) | Design review + impl. | `text-gray-500` sobre `card` escuro = candidato real a falha 4.5:1. Validar 7 paletas × estados |
| **UX-4** | Claim VoiceOver/Lighthouse no doc ≠ estado (QG2/QG3 pendentes) | 🟡 Medium — **confirmo** (e ver UX-15) | 1h (rebaixar claim) + 6–10h (QG2/QG3 reais depois) | Risco de compliance/credibilidade | **P3 — mas correção do texto é P1 quick-win** | Impl. pura (doc) | Rebaixar o claim **agora** (~1h) é independente da validação real. Ver §3.2 |
| **UX-5** | i18n hardcoded pt-BR + strings inline fora do `t()` | 🟡 Medium — **confirmo** | 16–24h (2–3d) | Funcional (i18n bloqueado) | **P3** | Impl. pura | Espelho de SYS-13 (Tema G). Sem urgência de prod hoje (locale único) |
| **UX-6** | `themeColor` dourado #c9a55a ≠ primária roxa | 🟢 Low — **confirmo** | 0.5h | Visual (barra do browser) | **P4** | Impl. pura | Quick win. Trocar por `hsl(271 81% 56%)`/equivalente |
| **UX-7** | `metadataBase`/JSON-LD apontam vercel.app | 🟡 Medium — **confirmo** | 1–2h | Funcional (OG/SEO/share cards errados) | **P3 — quick win** | Impl. pura | 2 ocorrências hardcoded (`layout.tsx:35,106`). Entra no PR Tema A |
| **UX-8** | Vercel Analytics/SpeedInsights falham fora da Vercel | 🟡 Medium — **confirmo** | 1–2h | Funcional (erros de console) | **P3 — quick win** | Impl. pura | Espelho de SYS-4. Remover deps + tags. PR Tema A |
| **UX-9** | Gradiente do título triplicado (CSS + inline + Tailwind) | 🟢 Low — **confirmo** | 3–4h | Visual (divergência) | **P4** | Impl. pura | Resolvido "de graça" dentro de UX-2 (consolidar em `.text-gradient`) |
| **UX-10** | Ícones inline (onboarding) vs lucide-react no resto | 🟢 Low — **confirmo** | 2–4h | Visual/manutenção | **P4** | Impl. pura | Migrar SVGs inline do onboarding p/ lucide. Checar icon-map antes |
| **UX-11** | `chat-message` (556) / `chat-interface` (515) sobrecarregados | 🟡 Medium — **confirmo** | 12–16h (2d) | Funcional (risco de regressão) | **P3** | **Design review leve** + refactor | Pré-requisito natural de SYS-9 (testabilidade). Extrair TTS auto-play, scroll, token-warning em hooks |
| **UX-12** | SVGs órfãos do template em `public/` | 🟢 Low — **confirmo** | 0.5h | Lixo de bundle | **P4 — quick win** | Impl. pura | Confirmar zero referências antes de deletar (`grep`). PR Tema A |
| **UX-13** | Baixa otimização desktop-wide (4× `lg:`) | 🟢 Low — **confirmo** (com ressalva) | 6–8h (1d) | Visual (telas grandes) | **P4** | **Design review** (precisa decisão de layout) | Não é "débito" puro — é melhoria. Requer decisão de design wide antes de codar |
| **UX-14** | `mind-card` `role="article"` clicável sem role de botão/link | 🟢 Low — **confirmo** | 3–4h | Funcional (semântica/teclado p/ SR) | **P4** | Impl. pura | A clicabilidade vem do `<Link>` pai do consumidor; `role="article"` no card interno é redundante/confuso. Remover role ou alinhar ao padrão de card-link |

**Subtotal: 14 confirmados · 1 ajustado em severidade (UX-1, condicional ao flag) · 0 rejeitados.**

---

## 2. Débitos Adicionados

Re-checando componentes e o doc de a11y, encontrei 2 débitos que o draft não capturou:

| ID | Débito | Severidade | Horas est. | Impacto | Prioridade | Notas |
|----|--------|-----------|-----------|---------|-----------|-------|
| **UX-15** (novo) | `docs/accessibility.md` **se autocontradiz**: linha 199 lista "Não há skip-link / usuários de teclado precisam tabular pelo header" como *limitação conhecida*, mas o skip-link **existe e funciona** (verificado na Fase 3 e no root layout). O doc mistura claims superestimados (VoiceOver "testado") com claims **subestimados** (skip-link negado). | 🟡 Medium | 1–2h | Doc de a11y não confiável nos dois sentidos — perde valor como fonte de verdade | **P3 — quick win, junto de UX-4** | Mesma raiz de UX-4 (doc desalinhado da realidade). Tratar UX-4+UX-15 como uma única "reconciliação do doc de a11y" |
| **UX-16** (novo) | `SoundscapeEngine.isAvailable()` (`soundscapes.ts:51`) detecta só suporte a Web Audio API, **não** se o asset é real. Placeholders de 75 B passam o guard, `engine.play()` "tem sucesso" e nada toca — **falha silenciosa sem fallback de UI**. Mesmo com áudio real (UX-1), não há tratamento de erro de carga/decode visível ao usuário. | 🟢 Low | 2–3h | Funcional: sem sinal de "áudio indisponível" quando decode falha | **P4** | Reforça por que UX-1 deve ser flag-off: o engine não se defende sozinho. Adicionar guard de byteLength mínimo / catch de decode → estado de UI "indisponível" |

**Subtotal adicionados: 2 (UX-15 🟡, UX-16 🟢).**

---

## 3. Respostas ao Architect

### 3.1 — UX-1: shippable-hidden ou must-fix?

**Recomendação: SHIPPABLE-HIDDEN (P4), não must-fix.** Caminho pragmático.

- **Por quê:** o áudio real é **entrega de conteúdo** (produzir/licenciar 6 trilhas), não trabalho de engenharia — não deve bloquear nenhum release de código. Segurar o release esperando 6 assets de áudio acopla a cadência de eng a uma dependência criativa externa. Errado.
- **Como:** o hook `use-soundscape` **já tem** o master toggle `enabled` (`use-soundscape.ts:27`, default `true`, persistido). Trocar o default para `false` e ocultar `chat-soundscape-bar`/`soundscape-controls` quando não houver assets reais é **~1h**. Melhor ainda: gate por env (`NEXT_PUBLIC_SOUNDSCAPES_ENABLED`, default off) para reativar sem rebuild quando o áudio chegar.
- **Reforço:** UX-16 mostra que o engine **não** se defende de assets falsos (passa o guard e toca silêncio). Flag-off é a única forma honesta de shippar hoje.
- **Veredito de prioridade:** **P4** enquanto flagged. **Sobe para P2** apenas se o produto decidir que soundscape é feature de lançamento — aí vira entrega de conteúdo (6–10h+ de produção de áudio), não débito de código.

### 3.2 — UX-4: rebaixar o claim WCAG AA?

**Recomendação: SIM, rebaixar AGORA.** É um quick-win de ~1h, independente da validação real, e elimina o risco de claim não-comprovado.

Substituir o texto da seção "Conformidade" de `docs/accessibility.md` (linha 9 e tabela 11–25) por:

> **Wording exato recomendado (linha 9):**
> "O Mentes Sintéticas tem como **alvo** conformidade com o **WCAG 2.1 Level AA**. A maioria dos critérios está implementada no código; a **validação final está pendente** (Lighthouse/QG2 e walkthrough VoiceOver/QG3 não concluídos). Esta página descreve o estado *AA-targeted, validation pending* — não uma certificação."

E na coluna **Status** da tabela de critérios: trocar "Implementado" por **"Implementado (validação pendente)"** nos critérios não verificáveis por inspeção de código — em especial **1.4.3 (contraste)**, **2.1.1** e **4.1.2** dependentes de teste de SR; e remover/qualificar a tabela "Screen Readers Testados" (linhas 91–96), que afirma VoiceOver testado.

Adicionalmente (UX-15): **corrigir a contradição do skip-link** — remover a linha 199 da tabela "Limitações Conhecidas" (o skip-link existe). Tratar UX-4 + UX-15 como uma única passada de reconciliação do doc.

### 3.3 — UX-2 (tokens) vs UX-3 (contraste): qual primeiro?

**Recomendação: UX-2 primeiro, MAS com uma validação de contraste tática antecipada.** Não é binário — é faseado.

- **Dependência técnica:** UX-2 **habilita** UX-3. Validar contraste de `text-gray-400/500` cru (UX-3) sobre uma base que ainda usa cores cruas é gastar esforço em alvos que vão **deixar de existir** após a migração para tokens. Validar tokens semânticos (pós-UX-2) é estável e automatizável.
- **Ressalva de compliance (o ponto do architect):** se houver claim AA **público** ativo, há urgência. Mas a resposta certa para essa urgência **não é** validar contraste antes de UX-2 — é **rebaixar o claim agora** (UX-4, §3.2, ~1h). Isso remove a exposição de compliance imediatamente e desacopla da migração de tokens.
- **Sequência recomendada:**
  1. **UX-4** (rebaixar claim) — agora, ~1h, remove o risco público.
  2. **Spot-check tático de UX-3** — auditar só os piores ofensores conhecidos (`text-gray-500` sobre `card`, e as 7 paletas mind-theme) com ferramenta de ratio, ~2–4h, para saber se há falha **real** hoje.
  3. **UX-2** (adoção de tokens) — 3–4d, migra as 45 ocorrências para classes semânticas.
  4. **UX-3 completo** — validação automatizada de contraste das 7 paletas × estados, **sobre a base já tokenizada**.

**TL;DR:** UX-2 antes de UX-3 completo (sim). Mas o claim AA cai imediatamente via UX-4, e um spot-check de contraste roda antes de UX-2 só para medir urgência real.

---

## 4. Recomendações de Design

### 4.1 — Adoção de tokens (UX-2): a base já é boa, o problema é o bypass

`globals.css` (368 linhas) já tem um design system sólido: tokens HSL shadcn em `:root`/`.dark`, 7 mind-themes via `data-mind-theme`, focus-visible global, `prefers-reduced-motion`, safe-area. **Não tocar nos tokens** — o débito é o código contorná-los. Plano:

1. **Mapa cor-crua → token semântico** (design review, ~half-day): definir a tabela canônica antes de migrar.
   - `text-gray-400` → `text-muted-foreground`
   - `text-gray-300/500` → `text-muted-foreground` (com check de contraste por contexto)
   - `text-white` → `text-foreground` (ou `text-primary-foreground` em fundos primários)
   - `bg-purple-*` / `from-purple-400` → `bg-primary` / `from-primary` (deixa o mind-theme fluir)
   - `text-cyan-*` → `text-accent`
2. **Migração mecânica guiada pelo mapa** — arquivo a arquivo, começando pelos de maior visibilidade (`mind-card`, `app-header`, chat). `mind-card.tsx` é o exemplo-tese: `text-gray-400` (linha 41) e `group-hover:text-purple-400` (linha 22) devem virar `text-muted-foreground` e `group-hover:text-primary` — assim o card passa a respeitar light-mode e os 7 mind-themes automaticamente.
3. **Consolidar o gradiente triplicado (UX-9) na mesma passada:** matar o inline `linear-gradient(...)` de `app-header.tsx` e a classe `from-indigo-400...` em favor da única utility `.text-gradient` (que então puxa das variáveis de gradiente do mind-theme).
4. **Guard rail anti-regressão:** após migrar, adicionar ESLint custom rule / grep no CI que falhe em `text-gray-`, `bg-purple-`, `text-white` em `src/components` e `src/app` (whitelist explícita para os poucos casos legítimos). **Sem o guard, a base re-acumula cores cruas.** Este é o item que torna UX-2 permanente em vez de um cleanup que apodrece.

### 4.2 — Plano de validação de a11y (UX-3 + UX-4 + QG2/QG3)

1. **Imediato (~1h):** rebaixar o claim (§3.2) + corrigir contradição do skip-link (UX-15).
2. **Spot-check de contraste (~2–4h):** rodar `text-gray-500/400` sobre `card`/`background` e as 7 paletas mind-theme num verificador de ratio (axe DevTools ou script com `wcag-contrast`). Documentar falhas reais.
3. **Pós-UX-2 (automatizado):** script no CI que percorre os tokens das 7 paletas e valida 4.5:1 (texto) / 3:1 (texto grande, não-textual). Falha o build se uma paleta regredir. Transforma o claim AA em algo **comprovável e contínuo**.
4. **QG2 (Lighthouse):** rodar `lighthouse --only-categories=accessibility` no CI (target ≥ 95). **QG3 (VoiceOver):** walkthrough manual dos 3 fluxos críticos (descoberta→chat, debate, share), documentado com evidência antes de re-afirmar "VoiceOver testado".

### 4.3 — Quick wins (alto sinal de higiene, baixo esforço)

Agrupar num único "PR de higiene UX" (alinha com Tema A do draft), **~1 dia somado**:
- UX-4 + UX-15 (reconciliar doc de a11y) — 1–2h
- UX-7 (metadataBase/JSON-LD → domínio prod) — 1–2h
- UX-8 (remover Vercel Analytics/SpeedInsights) — 1–2h
- UX-12 (deletar SVGs órfãos) — 0.5h
- UX-6 (themeColor roxo) — 0.5h
- UX-1 flag-off (default `enabled=false` + gate de env) — 1h

---

## 5. Priorização UX (user-impact-per-effort)

Ordem recomendada do track UX, por impacto-no-usuário ÷ esforço:

### Tier 0 — Quick wins (fazer já, ~1 dia somado, "PR de higiene UX")
| # | ID | Esforço | Razão |
|---|----|---------|-------|
| 1 | **UX-4 + UX-15** | 1–2h | Remove risco de claim AA não-comprovado + reconcilia doc. Quase grátis. |
| 2 | **UX-1 (flag-off)** | 1h | Elimina a promessa quebrada do soundscape sem esperar áudio. |
| 3 | **UX-7** | 1–2h | OG/SEO/share cards corretos — afeta toda partilha pública. |
| 4 | **UX-8** | 1–2h | Limpa erros de console em prod. |
| 5 | **UX-6** | 0.5h | Barra do browser na identidade. |
| 6 | **UX-12** | 0.5h | Lixo de bundle. |

### Tier 1 — Estrutural de design (alto impacto, maior esforço)
| # | ID | Esforço | Razão |
|---|----|---------|-------|
| 7 | **UX-2** | 3–4d | Destrava light-mode + mind-themes consistentes; habilita UX-3; mata UX-9. Maior ROI estrutural. |
| 8 | **UX-3** | 1–2d | Compliance real de contraste — rodar **após/durante** UX-2. |
| 9 | **UX-11** | 2d | Reduz risco de regressão no fluxo central; habilita testes de componente (liga a SYS-9). |

### Tier 2 — Médio prazo
| # | ID | Esforço | Razão |
|---|----|---------|-------|
| 10 | **UX-5** | 2–3d | i18n — sem urgência (locale único hoje); fazer junto de SYS-13 (Tema G). |
| 11 | **UX-10** | 2–4h | Consistência de ícones. |
| 12 | **UX-14 + UX-16** | 5–7h | Semântica do mind-card + guard de áudio indisponível. |
| 13 | **UX-13** | 1d | Otimização desktop-wide — precisa decisão de design antes; é melhoria, não débito. |

**Quick wins identificados (Tier 0):** UX-4, UX-15, UX-1(flag), UX-6, UX-7, UX-8, UX-12 — todos ≤2h, somam ~1 dia e removem 90% da "vergonha visível" (promessa quebrada, claim falso, URLs erradas, erros de console) com esforço mínimo.

---

## 6. Resumo executivo (para Fase 7/8)

- **14 débitos UX confirmados**, 1 ajustado em severidade (UX-1, condicional a feature-flag), 0 rejeitados.
- **2 débitos novos:** UX-15 (doc de a11y autocontraditório) e UX-16 (engine de áudio sem guard de asset falso/decode).
- **Esforço total do track UX:** ~**11–16 dias-dev** (Tier 0 ~1d · UX-2 3–4d · UX-3 1–2d · UX-11 2d · UX-5 2–3d · resto ~1–1.5d). Se UX-1 for must-fix, somar 6–10h+ de produção de áudio (conteúdo, não eng).
- **A base de design system é forte** (`globals.css`); o débito-mãe (Tema F) é o **bypass**, não a ausência. A remediação central é adoção de tokens + um guard de CI anti-regressão.
- **Caminho mais pragmático:** rodar o "PR de higiene UX" (Tier 0) imediatamente — ~1 dia, alto sinal — e agendar UX-2/UX-3 como o épico estrutural de design.

---

*Documento gerado na Fase 6 (UX sign-off) do Brownfield Discovery. Alimenta o `technical-debt-assessment.md` final (@architect, Fase 8) e o QA-gate (@qa, Fase 7).*
