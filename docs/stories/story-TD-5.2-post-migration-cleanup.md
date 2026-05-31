# Story TD-5.2 — Cleanup pós-migração restante (Tema A)

**Status:** Draft
**Epic:** [Resolução de Débitos Técnicos](epic-technical-debt.md) · **Wave:** W5
**Prioridade:** P3 · **Estimativa:** ~4.25–6.25h
**Parent (superseded):** [TD-5.1](story-TD-5.1-cleanup-design-tests.md)

> Sub-story do split de TD-5.1 (umbrella). Cobre o Tema A — limpeza das referências mortas pós-migração Supabase/Vercel que ainda restam após TD-0.1. Todos os itens são S/XS, baixo risco, alto sinal de higiene. Nenhum toca o schema de produção: o drop de `storage_path` (DB-14) usa o migration runner instalado em TD-2.1.

## Story

**As a** equipe de engenharia do Mentes Sintéticas,
**I want** remover as últimas referências mortas da migração Supabase/Vercel (coluna `storage_path`, escrita no seed, metadados apontando para vercel.app, `themeColor` desalinhado, Vercel Analytics, SVGs órfãos),
**So that** o repositório não tenha nenhum vestígio ativo da plataforma anterior, o seed não falhe ao dropar a coluna, e a presença pública (OG/SEO, barra do browser) reflita o domínio de produção real.

## Débitos cobertos

### Tema A — cleanup pós-migração

- **DB-16** (🟢) — `seed-db.ts:118-129` ainda popula `storage_path` (coluna morta pós-Supabase). Co-requisito de DB-14: o drop falha se o seed continuar escrevendo.
- **DB-14** (🟢) — `knowledge_documents.storage_path` sem reads confirmados. Drop aprovável via runner **após** DB-16 estar no código e com aprovação de governança (janela de manutenção do TD-2.1).
- **UX-6** (🟢) — `themeColor #c9a55a` (dourado) destoa da primária roxa real do produto.
- **UX-7** (🟡) — `metadataBase`/JSON-LD apontam para `vercel.app` (2× hardcoded em `layout.tsx:35,106`).
- **UX-8** (🟡) — Vercel Analytics + SpeedInsights carregam e falham fora da Vercel. Espelho de SYS-4 (já removido no runtime; verificar se restaram referências).
- **UX-12** (🟢) — SVGs órfãos do template Next.js em `public/` (vercel/next/window/globe/file).

**Total: 6 débitos (5 🟢 + 1 🟡 no core; UX-7 requer update de URL de prod).**

## Acceptance Criteria

1. **DB-16 — seed sem escrita em `storage_path`**
   - **Given** `seed-db.ts:118-129` popula `storage_path` (coluna morta)
   - **When** as linhas de escrita são removidas do seed
   - **Then** `npm run seed` executa sem referenciar `storage_path`; a coluna pode ser dropada sem conflito

2. **DB-14 — `storage_path` dropada via runner (janela TD-2.1)**
   - **Given** DB-16 está corrigido no código e o runner de TD-2.1 está ativo
   - **When** a migration de drop é criada e aplicada via runner com aprovação de governança
   - **Then** `knowledge_documents` não tem a coluna `storage_path`; zero referências ativas à coluna no codebase

3. **UX-6 — `themeColor` atualizado para cor primária roxa**
   - **Given** `layout.tsx` define `themeColor: '#c9a55a'` (dourado)
   - **When** o valor é atualizado para a cor primária roxa do design system (`hsl(271 81% 56%)` ou equivalente)
   - **Then** a barra do browser/mobile reflete a identidade visual do produto

4. **UX-7 — `metadataBase` e JSON-LD apontam para domínio de prod**
   - **Given** `layout.tsx:35,106` contém URLs `vercel.app` hardcoded no `metadataBase` e no JSON-LD
   - **When** as URLs são substituídas pelo domínio de produção (`https://mentes.negociosmodernos.cloud`)
   - **Then** OG tags, share cards e JSON-LD apontam para o domínio correto; zero ocorrências de `vercel.app` em metadados de produção

5. **UX-8 — Vercel Analytics/SpeedInsights removidos do runtime**
   - **Given** possíveis referências remanescentes a `@vercel/analytics` ou `@vercel/speed-insights` no runtime (SYS-4 já removido em TD-0.1; verificar se restou algo)
   - **When** `src/` e `package.json` são inspecionados e qualquer referência remanescente é removida
   - **Then** nenhum script Vercel Analytics é carregado em produção; zero erros de console relacionados

6. **UX-12 — SVGs órfãos removidos de `public/`**
   - **Given** `public/` contém `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` do template
   - **When** zero referências no código são confirmadas (via grep) e os arquivos são deletados
   - **Then** `public/` não contém assets do template; bundle não inclui arquivos não-referenciados

## Tasks / Subtasks

- [ ] Remover linhas de escrita de `storage_path` em `seed-db.ts:118-129` (DB-16)
- [ ] Confirmar zero reads de `storage_path` no codebase (grep antes do drop)
- [ ] Criar migration de drop de `storage_path` via runner (DB-14) — requer janela de manutenção TD-2.1
- [ ] Atualizar `themeColor` em `layout.tsx` para a cor primária roxa (UX-6)
- [ ] Substituir URLs `vercel.app` em `layout.tsx:35,106` pelo domínio de prod (UX-7)
- [ ] Verificar referências remanescentes de Vercel Analytics/SpeedInsights em `src/` e `package.json` (UX-8)
- [ ] Confirmar zero referências a SVGs do template via grep e deletar os 5 arquivos de `public/` (UX-12)
- [ ] Confirmar `npm test` + `npm run lint` passam após as mudanças

## Estimativa

| Débito | Horas |
|--------|-------|
| DB-16 | 0.25h |
| DB-14 | 1h (incl. criação da migration + aprovação) |
| UX-6 | 0.5h |
| UX-7 | 1–2h |
| UX-8 | 1–2h (verificação + remoção se necessário) |
| UX-12 | 0.5h |
| **Total** | **~4.25–6.25h** |

## Dependencies

- **TD-2.1 (runner + janela de manutenção):** o drop de `storage_path` (DB-14) deve usar o runner instalado em TD-2.1. A escrita no seed (DB-16) pode ser corrigida antes; o drop aguarda a janela. **TD-2.1 precede o DB-14.**
- **TD-0.1 (Done):** SYS-3 e SYS-4 (parte não-DDL) já foram resolvidos em TD-0.1; UX-8 é uma verificação de completude.
- **TD-5.x inter-independência:** TD-5.2, TD-5.3, TD-5.4, TD-5.5 são independentes entre si; paralelizáveis exceto pelo bloqueio TD-2.1 para DB-14.

## Definition of Done

- [ ] `seed-db.ts` não referencia `storage_path`
- [ ] `knowledge_documents.storage_path` dropada via migration versionada no runner
- [ ] `themeColor` atualizado para cor primária do produto
- [ ] `metadataBase` e JSON-LD apontam para `https://mentes.negociosmodernos.cloud`
- [ ] Zero scripts Vercel em produção; zero erros de console relacionados
- [ ] 5 SVGs do template removidos de `public/`
- [ ] `npm test` + `npm run lint` verdes; zero regressões

## Priority

**P3** — baixo risco, alto sinal de higiene. Nenhuma urgência de produção (nenhum bug ativo); itens oportunísticos que podem ser agrupados em um único "PR de higiene". Recomendado fazer após TD-2.1 estar disponível (para o drop de DB-14).

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-05-31 | 1.0.0 | Split de TD-5.1 umbrella → sub-story TD-5.2 (Tema A). Status: Draft. | @sm |
