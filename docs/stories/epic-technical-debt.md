# Epic: Resolução de Débitos Técnicos — Mentes Sintéticas

**Status:** Draft
**Autor:** Morgan (@pm) · **Fase 10** (Planning) do Brownfield Discovery
**Data:** 2026-05-30
**Tipo:** Brownfield — produto vivo em produção (https://mentes.negociosmodernos.cloud)

> **Fonte de verdade:** `docs/prd/technical-debt-assessment.md` (Fase 8, gate **APPROVED**, 49 débitos, 6 waves)
> **Relatório executivo:** `docs/reports/TECHNICAL-DEBT-REPORT.md` (Fase 9, R$20.250–24.750, 3 fases de negócio, ROI 4–5:1)
> **QA review (testes requeridos + ordens não-negociáveis):** `docs/reviews/qa-review.md` (Fase 7)

---

## 1. Objetivo

### Business
Proteger e profissionalizar um produto vivo e funcional, eliminando **risco de segurança ativo e barato de corrigir**, restaurando a **inteligência das mentes** (cache de conhecimento Gemini, único 🔴 Critical já manifestado em produção) e removendo **constrangimentos visíveis** (features quebradas, claims de acessibilidade não comprovados) — pelo menor custo e na ordem que protege a produção a cada passo. Investimento total ~R$22.500 com ROI consolidado **4:1 a 5:1**; a Fase 1 isolada tem ROI **~20:1**.

### Technical
Resolver os **49 débitos técnicos** mapeados no assessment APPROVED, agrupados em **6 waves ordenadas (W0–W5)** com **3 dependências não-negociáveis**, **preservando** a arquitetura `route → service → db` e a taxonomia de erros (pontos fortes, não reescrever). Foco: integridade de dados blindada no DB, pipeline de deploy/knowledge com rede de segurança automatizada, dependências sem CVE HIGH, e observabilidade com alerting validado.

---

## 2. Escopo — 49 débitos em 6 waves

| Wave | Tema | Débitos | Esforço | Story |
|------|------|---------|---------|-------|
| **W0** | Quick-wins não-DDL (código/script/doc) | DB-4, DB-3 (parte código + audit), UX-1, UX-4, UX-15, SYS-3, SYS-4 (parte não-DDL) | ~6–8h | TD-0.1 |
| **W1** | Segurança de dependências (SECURITY) | SYS-15, SYS-2, SYS-14 | ~9–13h | TD-1.1 |
| **W2** | Infra de migração + smoke + alerting | SYS-10, SYS-11, SYS-16 | ~15–20h | TD-2.1 |
| **W3** | Hardening de schema (Tema C, via runner) | DB-5, DB-6, DB-18, DB-2, DB-15, DB-17, DB-9, DB-11, DB-10, DB-7, DB-12 | ~13–15h | TD-3.1 |
| **W4** | Pipeline Gemini auto-cura (E) + contrato app-only (D) | SYS-1, SYS-7, DB-8, DB-1, SYS-14(boundary), DB-3 (fechamento) | ~12–15h | TD-4.1 |
| **W5** | Cleanup (A) + design system (F) + config/i18n (G) + testes (SYS-9) | DB-14, DB-16, UX-6, UX-7, UX-8, UX-12, UX-2, UX-3, UX-9, UX-10, UX-14, UX-16, UX-11, SYS-9, SYS-5, SYS-6, SYS-13, UX-5, SYS-8, SYS-12, UX-13 | ~78–116h | TD-5.1 |

**Cobertura:** 49/49 débitos mapeados. Standalone (SYS-8, SYS-12, UX-13) absorvidos oportunisticamente na W5.

---

## 3. Critérios de Sucesso (mensuráveis)

1. **Cache Gemini restaurado** — após UNIQUE em `file_uri_cache` (DB-5), `INSERT ... ON CONFLICT (knowledge_document_id)` faz upsert sem abortar; 2 inserts concorrentes do mesmo doc → 1 linha. 🔴 Critical resolvido.
2. **`npm audit` limpo em HIGH** — `drizzle-orm ≥0.45.2`, `next` patched; CI falha em vuln HIGH não-waived (SYS-15).
3. **FKs enforced** — delete de user cascateia `conversations/mind_memories/debates`; `token_usage` preservado (SET NULL/RESTRICT). Órfãos = 0 antes de `VALIDATE` (DB-2).
4. **Signup validado** — Zod schema rejeita e-mail malformado/senha curta/payload extra; signup passa por `users` service, zero import `@/db` direto na rota (SYS-14).
5. **Claim AA preciso** — `docs/accessibility.md` rebaixado para "AA-targeted, validation pending"; contradição do skip-link removida (UX-4 + UX-15). Pós-UX-2: contraste 4.5:1/3:1 das 7 paletas validado em CI (UX-3).
6. **Self-healing Gemini** — URI expirado → re-upload sob demanda → cache repopula **sem cron**; chat usa knowledge mesmo com cache stale (SYS-1).
7. **Deploy com rede de segurança** — runner de migração gated (CONCURRENTLY, NOT VALID/VALIDATE, pg_dump, rollback); smoke pós-deploy testa `/api/chat` com resposta Gemini real, não só `GET /` (SYS-10 + SYS-11).
8. **Alerting verificável** — falha do cron de URI dispara evento Sentry (mock `captureException`); cron failure ≠ silencioso (SYS-16).

---

## 4. Timeline & Budget

| Fase de Negócio | Waves | Esforço | Custo (R$150/h) | ROI |
|-----------------|-------|---------|-----------------|-----|
| **Fase 1 — Quick Wins (segurança)** | W0 + W1 | 13–18h | R$ 1.950 – 2.700 | ~20:1 |
| **Fase 2 — Fundação (deploy + DB)** | W2 + W3 | 25–31h | R$ 3.750 – 4.650 | ~6:1 |
| **Fase 3 — Otimização (resiliência + design + testes)** | W4 + W5 | ~78–116h | R$ 11.700 – 17.400 | ~2:1 |
| **TOTAL** | W0–W5 | **~135–165h** | **R$ 20.250 – 24.750** | **~4:1 a 5:1** |

Fase 1 = aprovação imediata recomendada (risco ativo, custo mínimo). Fases 2–3 agendáveis por sprint conforme capacidade. W5 é paralelizável e sem urgência de prod.

---

## 5. Dependências Não-Negociáveis (confirmadas pelo QA-gate Fase 7)

1. **SYS-15 (bump `drizzle-orm ^0.45.2`) ANTES de escrever as migrations do Tema C** — não re-gerar SQL sob versão com CVE de SQL-injection. → **TD-1 precede TD-3.**
2. **SYS-10 + SYS-11 (runner + smoke) ANTES de qualquer DDL do Tema C** — não aplicar FK/UNIQUE/índice em prod viva via psql manual. → **TD-2 precede TD-3.**
3. **DB-5 ANTES de DB-3 (write-side)** — DB-5 destrava o upsert de recuperação; o read-side usa UUID, não `local_path`. → ordem interna em TD-3 (DB-5) antes do fechamento de DB-3 em TD-4.

Adicionais internos: dedupe/audit de órfãos (W0) é **gate** antes de qualquer UNIQUE/FK; DB-16 (remover escrita no seed) antes de DB-14 (drop `storage_path`); UX-2 (tokens) antes de UX-3 (contraste).

### Cadeia de execução
```
TD-0 (W0, sem deps)
  └─> TD-1 (W1, security) ──┐
        └─> TD-2 (W2, infra)─┴─> TD-3 (W3, hardening DDL)
                                    └─> TD-4 (W4, Gemini+app-only)
                                          └─> TD-5 (W5, cleanup+design+tests)
```

---

## 6. Lista de Stories

| Story | Título | Prioridade | Horas | Débitos |
|-------|--------|-----------|-------|---------|
| [TD-0.1](story-TD-0.1-quick-wins-non-ddl.md) | Quick-wins não-DDL: higiene de código, script e doc | P1 | ~6–8h | 7 |
| [TD-1.1](story-TD-1.1-security-dependencies.md) | Segurança de dependências + signup validation | **P0** | ~9–13h | 3 |
| [TD-2.1](story-TD-2.1-migration-infra.md) | Infra de migração: runner + smoke + alerting | P1 | ~15–20h | 3 |
| [TD-3.1](story-TD-3.1-schema-hardening.md) | Hardening de schema (Tema C) — **destrava cache Gemini** | **P0** | ~13–15h | 11 |
| [TD-4.1](story-TD-4.1-gemini-resilience-app-security.md) | Resiliência Gemini (auto-cura) + contrato de segurança app-only | P1 | ~12–15h | 6 |
| [TD-5.1](story-TD-5.1-cleanup-design-tests.md) | Cleanup, design system, config/i18n & testes de componente | P2 | ~78–116h | 21 |

**Total: 6 stories · 49 débitos · ~135–165h.**

> **P0 críticos marcados:** TD-1.1 carrega os CVEs HIGH (segurança ativa). TD-3.1 contém DB-5 (🔴 Critical já manifestado em produção — restauração do cache Gemini).
