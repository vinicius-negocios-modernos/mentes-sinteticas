# Story TD-5.3 — Design system enforcement (Tema F)

**Status:** Draft
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W5
**Prioridade:** P2 · **Estimativa:** ~52.5–73h
**Parent (superseded):** [TD-5.1](story-TD-5.1-cleanup-design-tests.md)

> Sub-story do split de TD-5.1 (umbrella). Cobre o Tema F — adoção de tokens do design system com guard de CI, validação de contraste WCAG nas 7 paletas, e todos os débitos de consistência visual que se resolvem "de graça" dentro da campanha de tokens. Maior esforço da Wave 5 (3–4 dias-dev só para UX-2). Inclui UX-13 (standalone: otimização desktop-wide) que compartilha a assinatura de decisão de design visual.

## Story

**As a** equipe de engenharia e produto do Mentes Sintéticas,
**I want** migrar as 45 ocorrências de cores cruas para tokens semânticos do design system, adicionar guards de CI que impeçam regressão, validar contraste WCAG AA automaticamente nas 7 paletas mind-theme, e resolver a inconsistência de ícones/gradiente/role-semântico que emergem do mesmo bypass,
**So that** light-mode e os 7 mind-themes se comportem consistentemente, a conformidade WCAG AA seja comprovável e contínua (não uma afirmação), e o custo de mudança visual caia — a base não re-acumula cores cruas porque há um guard automatizado.

## Débitos cobertos

### Tema F — design system

- **UX-2** (🟠) — Tokens contornados por cores cruas (`text-gray-*`, `bg-purple-*`, `text-white`) em 45 arquivos. Habilitador de UX-3. Maior esforço do track.
- **UX-3** (🟠) — Contraste WCAG AA não validado: `text-gray-400/500` + 7 mind-themes sem teste de ratio. Depende de UX-2 para automação estável.
- **UX-9** (🟢) — Gradiente do título triplicado (CSS `.text-gradient` + inline + Tailwind). Resolvido "de graça" dentro de UX-2.
- **UX-10** (🟢) — Ícones inconsistentes: onboarding usa SVG inline; resto usa lucide-react.
- **UX-14** (🟢) — `mind-card` `role="article"` em elemento clicável sem role de botão/link claro.
- **UX-16** (🟢) — `SoundscapeEngine.isAvailable()` detecta só suporte a Web Audio API, não se o asset é real; placeholders passam o guard, falha silenciosa sem fallback de UI.

### Standalone (oportunístico)

- **UX-13** (🟢) — Baixa otimização desktop-wide (apenas 4× `lg:`). Requer decisão de design wide antes de codar.

**Total: 7 débitos.**

## Acceptance Criteria

1. **Token-regression guard (UX-2)** *(test: qa-review §4 Cluster UX)*
   - **Given** as 45 ocorrências de cores cruas são mapeadas para tokens semânticos (mapa cor→token: `text-gray-400` → `text-muted-foreground`, `text-white` → `text-foreground`/`text-primary-foreground`, `bg-purple-*` → `bg-primary`, etc.)
   - **When** a migração mecânica é aplicada nos 45 arquivos e um guard ESLint/grep é adicionado ao CI
   - **Then** o build **falha** em `text-gray-`/`bg-purple-`/`text-white` fora da whitelist explícita; light-mode e os 7 mind-themes respondem aos tokens corretamente; base não re-acumula cores cruas

2. **Gradiente consolidado (UX-9, dentro de UX-2)**
   - **Given** o gradiente do título está triplicado (inline `linear-gradient` em `app-header.tsx` + classe `from-indigo-400...` + utility `.text-gradient`)
   - **When** o inline e a classe separada são eliminados, consolidando em `.text-gradient` que puxa das variáveis de gradiente do mind-theme
   - **Then** zero gradientes duplicados; o título responde ao mind-theme ativo

3. **Contrast CI (UX-3, pós-UX-2)** *(test: qa-review §4 Cluster UX)*
   - **Given** a base está tokenizada (pós-UX-2) e as 7 paletas mind-theme existem em `globals.css`
   - **When** um script percorre as 7 paletas × estados (normal, hover, disabled) e valida os ratios
   - **Then** todos os pares texto/fundo validam 4.5:1 (texto normal) / 3:1 (texto grande/não-textual); o build **falha** se uma paleta regredir; spot-check dos piores ofensores conhecidos (`text-gray-500` sobre `card` escuro) documentado como gate pré-UX-2

4. **Consistência de ícones (UX-10)**
   - **Given** o onboarding usa SVGs inline enquanto o resto do app usa lucide-react
   - **When** os SVGs inline do onboarding são migrados para equivalentes lucide-react (com verificação do icon-map antes)
   - **Then** todos os ícones do app usam lucide-react; zero SVGs inline de ícones em `src/components`

5. **`mind-card` role semântico (UX-14)**
   - **Given** `mind-card.tsx` usa `role="article"` em elemento clicável sem role próprio (clicabilidade vem do `<Link>` pai)
   - **When** o `role="article"` interno é removido ou alinhado ao padrão de card-link
   - **Then** screen readers interpretam o card corretamente; nenhum role redundante ou ambíguo

6. **Audio engine guard (UX-16)**
   - **Given** `SoundscapeEngine.isAvailable()` não detecta assets falsos; placeholders de 75 B passam o guard e `play()` "tem sucesso" com silêncio
   - **When** um guard de `byteLength` mínimo e/ou catch de decode é adicionado ao engine
   - **Then** assets abaixo do threshold são tratados como "indisponível"; a UI exibe estado "áudio indisponível" quando o decode falha; falha não é silenciosa

7. **Otimização desktop-wide (UX-13, oportunístico)**
   - **Given** apenas 4× `lg:` breakpoints estão em uso em todo o app
   - **When** a equipe toma decisão de layout wide e implementa responsive improvements prioritárias nas telas de maior valor (chat, debate, mind-list)
   - **Then** as telas priorizadas têm layout desktop adequado com ≥ os responsiveness gaps mapeados cobertos. **Bloqueado por decisão de design — executar somente após aprovação do layout wide.**

## Tasks / Subtasks

- [ ] Definir mapa canônico cor-crua → token semântico (design review, ~half-day) — pré-requisito para migração mecânica (UX-2)
- [ ] Spot-check tático de contraste dos piores ofensores (`text-gray-500` sobre `card`, 7 paletas) antes da migração (UX-3 gate pré-UX-2)
- [ ] Migrar as 45 ocorrências de cores cruas para tokens semânticos, arquivo a arquivo (UX-2)
- [ ] Consolidar gradiente triplicado em `.text-gradient` na mesma passada de UX-2 (UX-9)
- [ ] Adicionar guard ESLint/grep de cores cruas ao CI com whitelist explícita (UX-2)
- [ ] Implementar script de contraste automatizado das 7 paletas × estados + gate CI (UX-3, pós-UX-2)
- [ ] Migrar SVGs inline do onboarding para equivalentes lucide-react (UX-10)
- [ ] Remover/alinhar `role="article"` em `mind-card.tsx` (UX-14)
- [ ] Adicionar guard de `byteLength` e catch de decode no `SoundscapeEngine` com estado de UI (UX-16)
- [ ] (Bloqueado por decisão de design) Implementar responsive desktop improvements nas telas priorizadas (UX-13)
- [ ] Confirmar `npm test` + `npm run lint` passam após todas as mudanças

## Estimativa

| Débito | Horas |
|--------|-------|
| UX-2 (mapa + migração 45 arquivos + guard CI) | 20–28h |
| UX-3 (spot-check + script contraste + gate CI, pós-UX-2) | 8–14h |
| UX-9 (gradiente, dentro de UX-2) | 0h (absorvido) |
| UX-10 | 2–4h |
| UX-14 | 3–4h |
| UX-16 | 2–3h |
| UX-13 (condicional, requer decisão de design) | 6–8h |
| Spot-check tático pré-UX-2 | ~2–4h (dentro de UX-3) |
| **Total** | **~43–61h** (sem UX-13) / **~52.5–73h** (com UX-13) |

## Dependencies

- **TD-4.1 (estabilização operacional):** recomendado aguardar estabilização antes de grandes refactors visuais.
- **UX-2 antes de UX-3 completo:** migração de tokens habilita validação de contraste estável. Spot-check tático de contraste pode preceder UX-2 para medir urgência real.
- **Ordem interna:** UX-9 absorvido dentro de UX-2 (mesma passada). UX-13 bloqueado por decisão de design e pode ser executado em paralelo ou após os outros itens.
- **TD-5.x inter-independência:** TD-5.3 é independente de TD-5.2, TD-5.4, TD-5.5.

## Definition of Done

- [ ] Guard de CI anti-cores-cruas ativo; build falha em `text-gray-`/`bg-purple-`/`text-white` fora da whitelist (UX-2)
- [ ] Script de contraste das 7 paletas integrado ao CI; build falha em regressão de ratio (UX-3)
- [ ] Zero gradientes duplicados; título responde ao mind-theme (UX-9)
- [ ] Ícones do onboarding migrados para lucide-react (UX-10)
- [ ] `mind-card` sem role ambíguo (UX-14)
- [ ] `SoundscapeEngine` com guard de byteLength + estado de UI de "indisponível" (UX-16)
- [ ] `npm test` + `npm run lint` verdes; zero regressões nos 7 mind-themes e light-mode

## Priority

**P2** — maior impacto estrutural de design na Wave 5. UX-2 é habilitador de UX-3 e mata UX-9/UX-10/UX-14 parcialmente na mesma passada. Guard de CI é o item que torna o cleanup permanente (sem guard, a base re-acumula). UX-13 condicional ao P2 se aprovado pela liderança de produto — caso contrário, desce para P4.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0.0 | Split de TD-5.1 umbrella → sub-story TD-5.3 (Tema F). Status: Draft. | @sm |
