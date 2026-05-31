# Story TD-5.1 — Cleanup, design system, config/i18n & testes de componente

**Status:** Ready
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W5
**Prioridade:** P2 · **Estimativa:** ~78–116h (paralelizável, sem urgência de prod)

> 📦 **Story guarda-chuva da Wave 5.** Agrupa Temas A (cleanup) + F (design system) + G (config/i18n) + SYS-9 (testes) + standalone (SYS-8/SYS-12/UX-13). Maior esforço do épico, sem urgência de produção — paralelizável. **Recomenda-se quebrar em sub-stories no início da execução** (uma por tema) se a equipe quiser paralelizar com owners distintos.

## Story

**As a** equipe de engenharia do Mentes Sintéticas,
**I want** completar a higiene pós-migração, adotar o design system com guards de CI, centralizar config/i18n e cobrir a lógica de componentes com testes,
**So that** a base pare de re-acumular débito, a acessibilidade seja validável de verdade, e o custo de cada mudança futura caia — investimento de longo prazo em velocidade, sem risco de prod.

## Débitos cobertos

### Tema A — cleanup pós-migração (DDL final)
- **DB-14** (🟢) drop `storage_path` morto · **DB-16** (🟢) remover escrita de `storage_path` no seed (co-req, antes do drop)
- **UX-6** (🟢) `themeColor` roxo · **UX-7** (🟡) `metadataBase`/JSON-LD → domínio prod · **UX-8** (🟡) remover Vercel Analytics (espelho UX de SYS-4) · **UX-12** (🟢) SVGs órfãos do template

### Tema F — design system
- **UX-2** (🟠) token adoption em 45 arquivos + guard de CI · **UX-3** (🟠) contraste WCAG AA automatizado nas 7 paletas
- **UX-9** (🟢) gradiente triplicado · **UX-10** (🟢) ícones inline → lucide · **UX-14** (🟢) `mind-card` role ambíguo · **UX-16** (🟢) guard de byteLength no engine de áudio · **UX-11** (🟡) refactor `chat-message`/`chat-interface` (habilita SYS-9)

### Tema B — testes
- **SYS-9** (🟠) testes de lógica de componente (não só a11y)

### Tema G — config/i18n
- **SYS-5** (🟡) Zod único cobrindo todo env · **SYS-6** (🟢) externalizar magic constants · **SYS-13** (🟢) strings PT-BR via `t()` · **UX-5** (🟡) i18n frontend via `t()`

### Standalone (oportunístico)
- **SYS-8** (🟡) taxonomia `AppError` no chat · **SYS-12** (🟢) retry/DLQ de side-effects · **UX-13** (🟢) otimização desktop-wide

## Acceptance Criteria

1. **Token-regression guard (UX-2)** *(test: qa-review §4 Cluster UX)*
   - **When** as 45 ocorrências de cores cruas são migradas para tokens semânticos e um guard ESLint/grep é adicionado ao CI
   - **Then** o build **falha** em `text-gray-`/`bg-purple-`/`text-white` fora da whitelist; a base não re-acumula cores cruas

2. **Contrast CI (UX-3, pós-UX-2)** *(test: qa-review §4 Cluster UX)*
   - **When** um script percorre as 7 paletas mind-theme × estados
   - **Then** valida 4.5:1 / 3:1; o build falha se uma paleta regredir

3. **Component tests (SYS-9)** *(test: qa-review §4 Cluster Deploy — Component tests)*
   - **Given** UX-11 refatorou `chat-message`/`chat-interface` para testabilidade
   - **When** testes de lógica (não só a11y) são escritos para `chat-interface` (streaming, token-warning, scroll), `debate-interface`, `conversation-drawer`
   - **Then** ≥ os 3 componentes de maior risco têm testes de estado/interação

4. **Cleanup Tema A (DB-14/DB-16 + UX-6/7/8/12)**
   - **Given** DB-16 (seed) corrigido **antes** do drop
   - **When** `storage_path` é dropado via runner, metadados apontam para o domínio de prod, Vercel Analytics e SVGs órfãos removidos
   - **Then** zero referência morta a Supabase/Vercel; drop não falha por seed escrevendo coluna

5. **Config/i18n centralizado (SYS-5/6/13 + UX-5)**
   - **When** um Zod schema único cobre todo env (fail-fast no boot), magic constants são externalizadas e strings roteadas pelo `t()`
   - **Then** boot falha em env faltante; nenhuma URL/constante hardcoded; strings PT-BR via i18n

## Tasks / Subtasks

- [ ] Remover escrita de `storage_path` no seed (DB-16) **antes** do drop
- [ ] Migration: drop `storage_path` via runner com aprovação (DB-14)
- [ ] PR de higiene: `themeColor` (UX-6), metadataBase/JSON-LD (UX-7), Vercel Analytics (UX-8), SVGs órfãos (UX-12)
- [ ] Mapear cor-crua→token semântico + migrar 45 arquivos (UX-2)
- [ ] Adicionar guard ESLint/grep de cores cruas no CI (UX-2)
- [ ] Script de contraste automatizado das 7 paletas + gate CI (UX-3)
- [ ] Resolver UX-9/UX-10/UX-14/UX-16 dentro da campanha de tokens
- [ ] Refatorar `chat-message`/`chat-interface` (UX-11)
- [ ] Testes de lógica de componente: chat-interface, debate-interface, conversation-drawer (SYS-9)
- [ ] Zod único de env com fail-fast (SYS-5); externalizar magic constants (SYS-6)
- [ ] Rotear strings via `t()` backend (SYS-13) + frontend (UX-5)
- [ ] Oportunístico: AppError no chat (SYS-8), retry/DLQ side-effects (SYS-12), desktop-wide (UX-13)

## Dependencies

**Depende de TD-4.1** (estabilização operacional completa antes do polimento). Ordem interna: **DB-16 antes de DB-14**; **UX-2 antes de UX-3**; **UX-11 antes de SYS-9** (refactor habilita testabilidade). Tema A drop (`storage_path`) usa o runner de TD-2.1.

## Definition of Done

- [ ] Guard de cores cruas + contraste no CI (build falha em regressão)
- [ ] 3 componentes de maior risco com testes de lógica
- [ ] Zero referência morta Supabase/Vercel; `storage_path` dropado
- [ ] Env via Zod fail-fast; strings via i18n
- [ ] `npm test` + `npm run lint` verdes

## Priority

**P2** — investimento de longo prazo em manutenibilidade/velocidade, sem urgência de prod. Fase 3 de negócio, paralelizável. ROI ~2:1 (longo prazo).

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-30 | 1.1.0 | Validated GO (8/10) — Status: Draft → Ready. Observação @po (não-bloqueante): umbrella de 78–116h/21 débitos — recomenda quebrar em sub-stories por tema (A/F/G/B) antes do dev, conforme já sinalizado na própria story. | @po |
