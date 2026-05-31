# QA Review - Technical Debt Assessment

> **Fase 7 do Brownfield Discovery** — autor: Quinn (@qa), Test Architect & Quality Advisor
> **Data:** 2026-05-30
> **Insumos:** `docs/prd/technical-debt-DRAFT.md` (Fase 4, 42 débitos) · `docs/reviews/db-specialist-review.md` (Fase 5, +4 DB) · `docs/reviews/ux-specialist-review.md` (Fase 6, +2 UX)
> **Método:** todas as alegações de cobertura/segurança re-verificadas contra `src/`, `package.json`, `npm audit`, `playwright.config.ts`, `tests/`. Nada aceito apenas pelo draft.
> **Postura:** review-only. Nenhum código alterado, nenhum teste executado (doc de planejamento). Audit de um sistema de produção em operação — rigoroso, mas pragmático.
> **Substitui:** versão de 2026-03-06 (predatava este assessment).

---

## Gate Status: **NEEDS WORK**

**Motivo (resumo):** A análise dos 3 documentos é sólida, bem-fundamentada e na maior parte verificável — a validação DB da Fase 5 e a UX da Fase 6 são exemplares. **Porém o assessment tem uma lacuna de cobertura inteira: SEGURANÇA DE DEPENDÊNCIAS / SUPPLY-CHAIN e OBSERVABILIDADE não foram avaliadas**, e duas dessas omissões são **HIGH com CVE confirmado tocando exatamente os tracks já priorizados** (drizzle-orm SQL-injection no Tema C; Next.js multi-CVE no caminho crítico). Não é um bloqueio de release — é um bloqueio de **completude do assessment**: a foto de risco está incompleta em uma dimensão de severidade alta. Lista exata de correções na Seção 5.

**O que está VALIDADO e pode prosseguir:** os 14 SYS + 14 DB (re-priorizados pela Fase 5) + 14 UX (re-priorizados pela Fase 6) + 6 novos (DB-15..18, UX-15..16) = **48 débitos**. As dependências de ordem (SYS-10→Tema C, DB-5→DB-3) estão corretas (Seção 3). O gate é NEEDS WORK por **adição obrigatória de débitos faltantes ao DRAFT**, não por rejeição do que já existe.

---

## 1. Gaps Identificados

### 1.1 🔴 GAP CRÍTICO — Segurança de dependências / CVEs (área inteira ausente)

O assessment cobre 48 débitos e **nenhum** trata de vulnerabilidades de dependência. `npm audit --omit=dev` retorna **8 vulnerabilidades (4 high, 4 moderate)**, duas das quais tocam tracks já priorizados:

| CVE (verificado) | Pacote | Severidade | Por que importa AQUI |
|------------------|--------|-----------|----------------------|
| **SQL injection via identificadores SQL mal-escapados** | `drizzle-orm` < 0.45.2 (projeto em **0.45.1**) | 🔴 **HIGH** | O Tema C inteiro é hardening do schema via Drizzle. Subir o ORM é **pré-requisito de segurança** do mesmo track — e ninguém viu. Fix trivial: `^0.45.2`. |
| **Middleware/Proxy bypass, CSRF via null origin, XSS com CSP nonces, múltiplos DoS** | `next` (projeto em **16.1.1**) | 🔴 **HIGH** | Caminho crítico. O middleware NextAuth (runtime nodejs) e a CSP são componentes de segurança ativos; o CVE de "Middleware/Proxy bypass" e o de "XSS em apps usando CSP nonces" são diretamente relevantes. |
| postcss XSS, uuid bounds, fast-uri path-traversal, picomatch ReDoS | transitivos | 🟠 Moderate/High | Higiene; agrupáveis num débito de supply-chain. |

**Recomendação:** adicionar **SYS-15 (🟠 High) — "Dependências com CVEs HIGH não monitoradas; sem `npm audit` gate no CI"**. Isto é distinto de SYS-2 (NextAuth beta), que é sobre estabilidade de API, não CVE. SYS-2 fala de *beta breakage*; SYS-15 fala de *vulnerabilidade conhecida não corrigida*. São débitos diferentes.

### 1.2 🟠 GAP — Observabilidade / incident response sub-avaliada (e uma alegação implícita incorreta)

`@sentry/nextjs ^10.42.0` está **totalmente conectado**: `instrumentation.ts` + `sentry.client/server/edge.config.ts` + integração em `src/lib/logger.ts` (`sentryCaptureError`, com degradação graceful via dynamic require). Isso é **bom** — mas o assessment **não o menciona em lugar nenhum**, e isso distorce dois débitos:

- **SYS-1** descreve o cron de URI como falha "silenciosa". Com Sentry wired, a questão real não é "não há observabilidade", é **"o cron externo na VPS reporta para o Sentry quando falha? Há alerta?"** — o assessment não responde, e essa é a pergunta de incident-response que falta. O SYS-1 deveria ter um sub-item de **alerting** (o cron é single-point-of-failure SEM alarme verificável).
- **SYS-11** (smoke test) está correto, mas a cobertura de observabilidade fica órfã de área: não há débito sobre **se o Sentry está realmente recebendo eventos em prod**, sobre cobertura de breadcrumbs, ou sobre alerting/on-call.

**Recomendação:** adicionar **SYS-16 (🟡 Medium) — "Sentry instrumentado mas cobertura de alerting/incident-response não validada; cron SYS-1 sem alarme verificável de falha"**. Liga a SYS-1 e SYS-11.

### 1.3 SYS-9 — alegação "quase-zero testes de componente" parcialmente IMPRECISA (corrigir, não remover)

Verificação de campo:
- **56 componentes** `.tsx` (confirma o número do draft).
- **30 arquivos de teste** no total (não "25" — o draft subestima).
- **5 testes de COMPONENTE** existem: `chat-message-a11y`, `share-popover-a11y`, `soundscape-controls`, `debate-a11y`, `debate-interface-a11y`.

A alegação "quase-zero" é **diretamente correta em espírito** (5/56 ≈ 9% de cobertura de componente, e 4 dos 5 são **a11y-only** — não testam lógica de renderização/interação/estado), mas o número "25, quase todos em lib/" está desatualizado. O gap real é: **testes de componente existem mas são quase todos a11y; a lógica de UI (estado do chat, streaming, token-warning, scroll) não tem rede de segurança.** SYS-9 deve ser **reformulado** com este número correto, não removido — segue 🟠 High válido.

### 1.4 Testing — e2e existe, mas a cobertura de fluxo crítico tem furos (não capturado)

`playwright.config.ts` existe + 4 specs e2e (`home`, `login`, `chat`, `protected-routes`) + `auth.setup.ts` + 1 teste de integração de middleware. **Isto NÃO é "zero e2e"** — o assessment não menciona e2e e implicitamente dá a entender que não há. Porém **o fluxo de DEBATE não tem e2e**, e o **chat.spec** não exercita resposta real do Gemini (mesma limitação registrada na MEMORY do projeto: "Chat resposta NAO VERIFICADO"). O gap real de teste é **e2e do debate + smoke de resposta Gemini end-to-end**, que se conecta a SYS-11. Vale uma nota em SYS-9/SYS-11, não um débito novo.

### 1.5 🟠 GAP — Input validation inconsistente em API routes (parcialmente em SYS-14, mas mais amplo)

Verificação: **só 3 de 11 rotas** usam Zod (`chat`, `debate`, `debate/turn`). Crítico:
- **`api/auth/signup/route.ts` NÃO tem validação Zod** — faz `const { email, password } = await request.json()` e valida com `if (!email || !password || password.length < 6)`. **Sem validação de formato de e-mail, sem schema, sem normalização.** Isto é mais grave que o SYS-14 sugere: SYS-14 fala só do *boundary leak* (`@/db` direto), mas o **input do endpoint de criação de usuário é validado à mão** — é superfície de ataque (signup é rota pública não-autenticada).

**Recomendação:** elevar/expandir SYS-14 para incluir **"+ ausência de validação Zod no signup (rota pública)"** OU adicionar débito separado. Mínimo: registrar explicitamente que signup carece de schema validation. Mapear todas as 11 rotas → quais validam input.

### 1.6 Rate-limiting — efetividade OK, retenção tem nuance (DB review já corrigiu bem)

Verifiquei `cleanupExpiredLimits()`: **é chamado** (fire-and-forget em `api/chat/route.ts:154` e `actions.ts:217`), portanto o DB-12 "não há chamada agendada verificável" é tecnicamente impreciso — existe chamada, mas é *fire-and-forget lazy* (depende de tráfego de chat, sem garantia, falha só logada → SYS-12). A correção da Fase 5 (fundir DB-13 em DB-12, rejeitar a premissa de race) está **CORRETA e bem-argumentada** — o design INSERT-append + SUM não tem race de contagem. Endosso a rejeição de DB-13. Nota menor: DB-12 deve dizer "cleanup é fire-and-forget acoplado ao tráfego de chat, não agendado", não "sem chamada".

### 1.7 Secrets / CSP — sem gap material novo

- Secrets: `AUTH_SECRET`/`DATABASE_URL` lidos raw (já capturado em SYS-5). Nenhum secret commitado no repo (verificado). OK.
- CSP: definida em `next.config.ts`. O CVE Next.js "XSS em apps usando CSP nonces" (§1.1) é o ângulo de risco — coberto por SYS-15 (upgrade Next). Sem débito CSP separado necessário.

### 1.8 Performance — sem NFR descoberto não-coberto

DB-6 (índices), DB-7 (share scan), DB-18 (created_at ordering) cobrem o lado de dados. UX-13 cobre desktop-wide. Nenhum NFR de performance órfão identificado. OK.

### 1.9 Cobertura de owner/área — todos os 48 têm área

Varri os 48 débitos (14 SYS + 18 DB + 16 UX): todos têm área atribuída. Os 4 novos do DB (DB-15..18) e 2 do UX (UX-15..16) estão bem ancorados. **Os únicos sem área são os gaps que estou adicionando** (SYS-15 supply-chain, SYS-16 observabilidade) — daí o NEEDS WORK.

---

## 2. Riscos Cruzados

| Risco | Áreas/IDs Afetados | Mitigação |
|-------|--------------------|-----------|
| **Adicionar FKs/UNIQUEs/índices numa prod viva via psql manual** — o anti-padrão que gerou DB-4/5/8 reaparece se o hardening rodar antes do runner | DB-2, DB-5, DB-6, DB-9 (Tema C) × **SYS-10** | **Bloqueio de ordem (não-negociável):** SYS-10 + SYS-11 ANTES de qualquer DDL do Tema C. Usar `NOT VALID`/`VALIDATE` (FK) e `CREATE INDEX CONCURRENTLY` via runner versionado. `pg_dump` antes de dedupe/clean. (Confirma §3.) |
| **Upgrade do drizzle-orm (CVE SQL-injection) coincide com migrações de hardening** — subir o ORM no meio do Tema C pode mudar geração de SQL/migration | **SYS-15 (novo)** × DB-5/DB-2/DB-6 (Tema C) | Subir `drizzle-orm ^0.45.2` **antes** de escrever as migrations do Tema C (não no meio). Re-gerar/revisar migrations sob a versão patched. Patch é minor (0.45.1→0.45.2), risco baixo, mas deve preceder o track. |
| **Pipeline Gemini (SYS-1 cron + DB-5 upsert quebrado + DB-3 NFD) = single point of knowledge loss silencioso** — três falhas compostas: URI expira → cron único renova → upsert não recupera → sem alerta | **SYS-1 + DB-5 + DB-3 + SYS-16 (novo)** | Tema E (auto-cura: re-upload sob expiração elimina dependência do cron) + DB-5 UNIQUE (destrava upsert) + DB-3 NFC no ingest + **alerting Sentry no cron** (SYS-16). Os quatro juntos removem o risco; isolados, cada um deixa um furo. |
| **Signup público sem validação Zod + sem FK em user_id** — rota não-autenticada cria users; user_id criado nunca é garantido válido pelas tabelas que o referenciam | **SYS-14 (+ §1.5) × DB-2 × DB-1** | Canalizar signup por `users` service único + Zod schema (SYS-14 expandido), DEPOIS FKs (DB-2) para que o contrato app-only (DB-1) seja blindado nas duas pontas (escrita validada + integridade referencial). |
| **Rebaixar claim WCAG AA (UX-4) é independente, mas a validação real (UX-3) depende de UX-2** — risco de claim público não-comprovado enquanto QG2/QG3 pendentes | UX-4, UX-15, UX-3, UX-2 | Rebaixar o claim AGORA (~1h, UX-4+UX-15 reconciliação do doc), spot-check tático de contraste, DEPOIS UX-2 (tokens) → UX-3 completo automatizado. (Sequência da Fase 6 endossada.) |
| **CVE Next.js no caminho crítico (middleware/CSP/DoS) × NextAuth beta no mesmo runtime** | **SYS-15 (novo) × SYS-2** | Tratar upgrade Next + reavaliação NextAuth como passada coordenada de "atualização do caminho de auth". Testar middleware (runtime nodejs) após ambos — o teste de integração de middleware existente é a rede de segurança mínima. |

---

## 3. Dependências Validadas

### ✅ CONFIRMO: SYS-10 (automatizar migrations) ANTES do Tema C (hardening de schema)

**Ordem não-negociável — endosso total.** Ambos especialistas (architect na Seção 5/6 do DRAFT, Dara na §4 do DB review) convergem, e a fundamentação de dados é correta: as migrações de hardening são **multi-step, ordem-sensíveis, exigem `NOT VALID`/`VALIDATE` e `CREATE INDEX CONCURRENTLY`** (statements que não rodam em transação única) e **rollback determinístico**. Aplicá-las via psql manual (estado atual) reintroduz exatamente o risco que DB-4/DB-5/DB-8 materializaram. **Confirmado: nenhum DDL do Tema C antes de SYS-10 + SYS-11.** Adendo QA: o runner do SYS-10 deve suportar (a) statements fora de transação (`CONCURRENTLY`), (b) `pg_dump` pré-migração, (c) rollback step-by-step. Isso é critério de aceite de SYS-10, não detalhe de implementação.

### ✅ CONFIRMO: DB-5 ANTES de DB-3 para recuperação de cache

**Endosso a análise da Fase 5 (§3-Q1 do DB review) — é o ponto mais forte do review.** A evidência de `knowledge.ts:117-128` é decisiva: o read-side faz JOIN por `knowledge_document_id` (UUID), **não** por `local_path` — logo NFD (DB-3) não pode causar cache-miss no read; só quebra os scripts de write. DB-5 (UNIQUE ausente → `ON CONFLICT` aborta) é o **bloqueador estrutural** que impede qualquer upsert de recuperação. **Confirmado: DB-5 primeiro (destrava o upsert), DB-3 em seguida (elimina o gatilho na origem via NFC).** Ambos necessários; DB-5 é o que "destrava o cache".

### ✅ CONFIRMO outras ordens / blockers

- **DB-8 bloqueado por SYS-10** — correto; sem runner não há "lugar certo" para os scripts versionados.
- **UX-2 antes de UX-3 completo** — correto (tokens habilitam validação de contraste estável); com a ressalva certa da Fase 6 (rebaixar claim via UX-4 agora resolve a urgência de compliance sem inverter a ordem).
- **DB-16 (remover escrita no seed) antes de DB-14 (drop storage_path)** — correto; co-requisito.
- **Dedupe/audit de órfãos ANTES de UNIQUE/FK** (DB review §5) — correto e crítico; constraint sobre dados sujos aborta.

### ⚠️ NOVO blocker que ADICIONO à ordem

- **SYS-15 (upgrade drizzle-orm ^0.45.2) ANTES de escrever as migrations do Tema C.** Não bloqueia SYS-10, mas deve preceder a redação das migrations de hardening para não re-gerar SQL sob versão vulnerável. Coloca-se entre o passo 1 (quick-wins) e o passo 2 (runner) da ordem de Dara.

---

## 4. Testes Requeridos (pós-resolução)

Critérios de aceite que alimentam as stories do @pm (Fase 10). Por cluster de débito de alta prioridade:

### Cluster DB / Tema C (DB-2, DB-5, DB-6, DB-9)
- **Migration-rollback test:** cada migration de hardening tem rollback verificado num DB de staging com dump de prod. AC: `migrate up` → `migrate down` → schema idêntico ao baseline.
- **Constraint integration test:** após UNIQUE em `file_uri_cache`, um `INSERT ... ON CONFLICT (knowledge_document_id)` faz upsert (não aborta). Teste com 2 inserts concorrentes do mesmo doc → 1 linha final.
- **FK CASCADE/SET NULL test:** deletar um user → `conversations/mind_memories/debates` cascateiam; **`token_usage` preserva** (SET NULL/RESTRICT). AC explícito por tabela (billing não some).
- **Orphan-audit test (pré-migração):** query read-only de órfãos retorna 0 antes do `VALIDATE CONSTRAINT`. Gate, não teste de regressão.
- **CHECK test:** insert raw com `messages.role='invalid'` é rejeitado pós-DB-9.

### Cluster Pipeline Gemini / Tema E (SYS-1, DB-3, DB-5, SYS-16)
- **Self-healing integration test:** simular URI expirado → app re-faz upload sob demanda → cache repopula sem cron. AC: response do chat usa knowledge mesmo com cache stale.
- **NFC normalization test:** ingest de doc com nome NFD (macOS) → `local_path` persiste em NFC → JOIN por igualdade casa. Backfill verificado.
- **Alerting test (SYS-16):** falha do cron de renovação dispara evento Sentry verificável (mock de captureException). AC: cron failure ≠ silencioso.

### Cluster Deploy / Tema B (SYS-9, SYS-10, SYS-11)
- **Smoke pós-deploy (SYS-11):** CI/cron pós-deploy faz `GET /api/health` (200, DB+auth) **E** smoke de `/api/chat` com resposta Gemini real (não só page-load). AC: falha de Gemini auth derruba o smoke (hoje passa o healthcheck).
- **Component tests (SYS-9):** cobertura de lógica (não só a11y) para `chat-interface` (streaming, token-warning, scroll), `debate-interface`, `conversation-drawer`. AC: ≥ os 3 componentes de maior risco com testes de estado/interação.
- **e2e debate (gap §1.4):** spec Playwright para o fluxo de debate (hoje só chat/home/login/protected têm e2e).

### Cluster Segurança / SYS-15, SYS-14 (+§1.5)
- **`npm audit` gate no CI (SYS-15):** build falha em vuln HIGH não-waived. AC: drizzle ≥0.45.2, next patched; audit limpo em HIGH.
- **Signup validation test (SYS-14+§1.5):** Zod schema rejeita e-mail malformado, senha curta, payload extra. AC: rota pública de signup tem schema validation com casos de borda (injection, e-mail inválido, missing fields).
- **Boundary test (SYS-14):** signup passa por `users` service; nenhum import `@/db` direto na rota.

### Cluster UX / Tema F (UX-2, UX-3, UX-4)
- **Contrast CI test (UX-3, pós-UX-2):** script percorre 7 paletas mind-theme × estados, valida 4.5:1 / 3:1. AC: build falha se paleta regredir.
- **Token-regression guard (UX-2):** ESLint/grep no CI falha em `text-gray-`/`bg-purple-`/`text-white` fora da whitelist. AC: base não re-acumula cores cruas.
- **a11y doc reconciliation (UX-4+UX-15):** claim AA rebaixado para "AA-targeted, validation pending"; contradição do skip-link removida. AC verificável por revisão do doc.

---

## 5. Parecer Final

**Veredito: NEEDS WORK — por completude, não por qualidade.**

A qualidade analítica dos 3 documentos é alta. A Fase 5 (DB) é exemplar: re-priorizou os 3 🔴 Critical com evidência de código (só DB-5 permanece Critical), rejeitou corretamente DB-13, e a análise DB-5-vs-DB-3 é decisiva. A Fase 6 (UX) é igualmente rigorosa (verificação de campo, 2 débitos novos bem-fundamentados, sequência UX-2→UX-3 correta). As **duas dependências de ordem centrais (SYS-10→Tema C, DB-5→DB-3) estão CONFIRMADAS**. O sequenciamento geral é defensável.

**Mas o assessment NÃO está completo o suficiente para ir à Fase 8 como está**, porque uma dimensão de severidade alta — **segurança de dependências/supply-chain** — não foi avaliada, e dois dos seus itens são HIGH com CVE confirmado tocando tracks já priorizados. Um assessment de débito técnico que omite "o ORM que você vai usar para o hardening tem um CVE de SQL-injection" tem um furo material. Igualmente, a observabilidade (Sentry está wired e ignorado) precisa de pelo menos um débito de alerting/incident-response.

### O que DEVE ser corrigido no DRAFT antes da Fase 8 (lista exata):

1. **ADICIONAR SYS-15 (🟠 High) — Supply-chain/CVE:** `drizzle-orm <0.45.2` (SQL-injection, HIGH) + `next 16.1.1` (middleware bypass/CSRF/XSS/DoS, HIGH) + 6 vulns transitivas. Sem `npm audit` gate no CI. **Distinto de SYS-2** (beta breakage ≠ CVE).
2. **ADICIONAR SYS-16 (🟡 Medium) — Observabilidade/alerting:** Sentry instrumentado (`instrumentation.ts` + 3 configs + logger) mas cobertura de alerting não validada; cron SYS-1 sem alarme verificável de falha. Liga SYS-1↔SYS-11.
3. **CORRIGIR SYS-9:** número real é 30 test files / 5 testes de componente (4 a11y-only) / 56 componentes — não "25 test files, quase-zero". Reformular como "5/56 componentes testados, quase todos a11y; lógica de UI sem rede de segurança". Severidade 🟠 High mantida.
4. **EXPANDIR SYS-14 (ou adicionar nota):** signup é rota pública SEM validação Zod (valida `password.length < 6` à mão, sem formato de e-mail/schema). Só 3/11 rotas usam Zod. Registrar o gap de input-validation, não só o boundary leak.
5. **AJUSTAR redação de DB-12:** `cleanupExpiredLimits()` É chamado (fire-and-forget em chat/actions), não "sem chamada agendada". É lazy/acoplado ao tráfego (SYS-12), não inexistente. Nuance, não mudança de severidade.
6. **NOTA em SYS-11:** e2e existe (4 specs Playwright + middleware integration) mas falta e2e do **debate** e smoke de **resposta Gemini real** — não é "zero e2e".

**Itens 1 e 2 são os bloqueadores reais** (áreas inteiras ausentes). Itens 3–6 são correções de precisão de débitos existentes. Aplicadas estas 6, o assessment vai a **~50 débitos** com cobertura completa de área, e passa a APPROVED para consolidação (Fase 8) e planejamento (Fase 10).

> **Caminho rápido:** os itens 3–6 são edições de texto no DRAFT (~30 min para @architect na Fase 8). Os itens 1–2 são adição de 2 débitos com a evidência já levantada acima — todo o material está nesta review, pronto para incorporar. O re-gate é trivial uma vez incorporados.

---

*Documento gerado na Fase 7 (QA-gate) do Brownfield Discovery. Veredito NEEDS WORK com correções enumeradas. Após incorporação dos 6 itens no DRAFT, alimenta o `technical-debt-assessment.md` final (@architect, Fase 8) e as stories (@pm, Fase 10).*
