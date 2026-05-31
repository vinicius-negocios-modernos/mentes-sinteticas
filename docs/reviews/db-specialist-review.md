# Database Specialist Review

**Projeto:** Mentes Sintéticas | **Revisor:** Dara (@data-engineer) | **Fase:** 5 (Brownfield Discovery) | **Data:** 2026-05-30
**Insumo:** `docs/prd/technical-debt-DRAFT.md` (Seção 2, Temas C/D/E/G, Seção 6) · `docs/database/DB-AUDIT.md` · `docs/database/SCHEMA.md`
**Verificação:** schema real em `src/db/schema/*.ts`, migrations `drizzle/0000..0002`, scripts `scripts/*.sql`, e serviços `src/lib/services/*` + `src/lib/ai/knowledge.ts`.
**Postura:** review-only. Nenhuma migração/DDL aplicada. Estimativas sob a ótica de **prod viva (VPS Docker Swarm, migrations manuais via SSH)**.

> **Escala:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low. Esforço em horas-dev (inclui escrita da migration, dry-run, aplicação manual em prod, verificação).

---

## 1. Débitos Validados

| ID | Débito | Severidade (confirma/ajusta) | Horas est. | Complexidade | Prioridade | Notas |
|----|--------|------------------------------|-----------|--------------|-----------|-------|
| **DB-4** | `fix-m1-local-path.sql` escreve `updated_at` em `knowledge_documents` (coluna inexistente) | 🔴→🟠 **AJUSTA p/ High** | 0.25h | simples | **P1** | **CONFIRMADO** que a coluna não existe (migration 0000 + schema TS: `knowledge_documents` só tem `created_at`). PORÉM o script é one-shot já superado pelo `update-file-uris-2026-03-16.sql` (LIKE/NFD-safe). O `BEGIN/COMMIT` garante que, se rodou e abortou, **nada foi commitado** — sem corrupção. Rebaixo de Critical: é um script morto/quebrado, não um caminho de runtime ativo. Fix = deletar o `, updated_at = NOW()` ou arquivar o script. |
| **DB-5** | `file_uri_cache` sem UNIQUE em `knowledge_document_id`, mas scripts usam `ON CONFLICT (knowledge_document_id)` | 🔴 **CONFIRMA Critical** | 1.5h | médio | **P1** | **CONFIRMADO**: migration 0000 cria `file_uri_cache` sem UNIQUE nem índice em `knowledge_document_id`; `fix-m1-local-path.sql` usa `ON CONFLICT (knowledge_document_id) DO UPDATE`. Sem o índice único, o `ON CONFLICT` **lança erro** (`there is no unique or exclusion constraint matching the ON CONFLICT specification`) e aborta a transação. É a raiz real do cache-miss não-recuperável (ver §3). Requer dedupe ANTES do UNIQUE (§5). |
| **DB-2** | `user_id` em 5 tabelas sem FK p/ `users` | 🔴→🟠 **AJUSTA p/ High** | 4h | médio | **P1** | **CONFIRMADO**: `conversations.user_id`, `debates.user_id`, `mind_memories.user_id`, `rate_limits.user_id`, `token_usage.user_id` — todos `uuid NOT NULL` SEM `references()`. Ajuste de severidade: é integridade ausente, não data-loss/runtime-failure ativo (app já filtra por `userId`). Continua P1 dentro do track DB por ser pré-requisito do Tema D. **ON DELETE não deve ser CASCADE cego** (ver §3 e §5). |
| **DB-3** | `local_path` em NFD (macOS) → mismatch em JOIN/`=` | 🟠 **CONFIRMA High** | 3h | médio | **P1** | **CONFIRMADO**: `update-file-uris.sql` faz `JOIN ... ON kd.local_path = v.local_path` (igualdade exata) — falha sob NFD. Já contornado no `update-file-uris-2026-03-16.sql` via `LIKE '%pattern%'`. Mas é gatilho do **write-side**, NÃO do read-side (ver §3 — distinção crítica). Fix permanente = normalizar p/ NFC no ingest + backfill. |
| **DB-6** | Índices ausentes em FK/filtros quentes | 🟠 **CONFIRMA High (escopo corrigido)** | 1.5h | simples | **P2** | **PARCIALMENTE confirmado — escopo da Fase 2 desatualizado.** `mind_memories`, `token_usage`, `rate_limits` JÁ têm índices (migration 0002). Os que **realmente faltam**: `messages.conversation_id` (read mais quente — confirmado em `conversations.ts`/fetch de mensagens), `conversations.user_id`, `conversations.mind_id`, `debates.user_id`, `knowledge_documents.mind_id`, `file_uri_cache.knowledge_document_id`. Postgres **não** auto-indexa colunas de FK — mesmo as FK'd precisam de índice explícito. |
| **DB-7** | `conversations.share_token` sem índice e sem UNIQUE | 🟠→🟡 **AJUSTA p/ Medium** | 0.5h | simples | **P2** | **CONFIRMADO o índice ausente** (`sharing.ts:147` faz `WHERE shareToken = token` → seq-scan em cada page-load de share). **Risco de colisão DESCARTADO**: `generateShareToken()` usa `crypto.randomBytes(32)` = 256 bits → colisão é estatisticamente impossível. Logo o problema é só **performance** (índice), não correção. Adicionar índice (e UNIQUE como belt-and-suspenders, custo ~0). Rebaixo p/ Medium: share não é caminho quente nem crítico de prod. |
| **DB-13** | `rate_limits` sem UNIQUE em (user_id, action, window_start) — race duplica janela | 🟠→🟢 **REJEITA premissa / AJUSTA p/ Low** | 0.25h (só doc) | simples | **P4** | **PREMISSA INCORRETA.** `incrementRateLimit()` (`rate-limiter.ts:128`) faz **INSERT puro, uma linha por request** — design append-only intencional; `checkRateLimit()` faz `SUM(request_count)` sobre as linhas da janela. Múltiplas linhas por janela é o comportamento **projetado**, não um bug de race. Um UNIQUE em (user_id, action, window_start) **QUEBRARIA** o design (segundo request da janela falharia no INSERT). Não há race de contagem — o SUM é correto sob concorrência. O custo real é **crescimento ilimitado** = é o **DB-12**, não um débito separado. Recomendo **rejeitar DB-13 como débito de integridade** e fundir no DB-12. |
| **DB-1** | Sem RLS/authz no DB pós-Supabase | 🟠 **CONFIRMA High (analysis-only)** | 3h (doc/ADR) | médio | **P2** | **CONFIRMADO** como gap de contrato, não bug. Sem Supabase/RLS, authz vive 100% em `src/lib/services/*`. Defensável SE (a) app é único gatekeeper e (b) DB garante integridade referencial — hoje (b) não existe (DB-2). Entregável = ADR documentando o contrato "app-is-the-only-gatekeeper" + dependência de DB-2 e SYS-14. Sem DDL nesta fase. |
| **DB-9** | Enums (`messages.role`, `mind_memories.memory_type`, `debates.status`) só na ORM, sem CHECK/pg enum | 🟡 **CONFIRMA Medium** | 1.5h | simples | **P3** | **CONFIRMADO**: schema TS usa `text({enum:[...]})`/`$type<>` (validação só na ORM); migrations criam `text` puro sem CHECK. DB aceita qualquer string via SQL raw/script — exatamente o vetor que mordeu em DB-4/DB-8. Preferir `CHECK (... IN (...))` a `pg enum` (enums Postgres são caros de alterar). |
| **DB-10** | Sem auto-update de `updated_at` (sem triggers) | 🟡 **CONFIRMA Medium** | 1.5h | simples | **P3** | **CONFIRMADO**: nenhuma migration cria trigger; `updated_at` é app-mantido (Drizzle `.set({updatedAt})`). Writes raw/script pulam. Fix = trigger `BEFORE UPDATE` genérico nas 7 tabelas com `updated_at`. Liga ao DB-8 (scripts ad-hoc não atualizam). |
| **DB-12** | `rate_limits`/`token_usage` crescem ilimitadamente | 🟡 **CONFIRMA Medium (absorve DB-13)** | 2.5h | médio | **P3** | **CONFIRMADO**: existe `cleanupExpiredLimits()` (`rate-limiter.ts:140`, cutoff 24h) MAS é "lazy/best-effort" e **não há chamada agendada** verificável (fire-and-forget, ver SYS-12). `token_usage` não tem retenção nenhuma (é dado de billing — provavelmente deve ser **arquivado**, não deletado). Fix = job de retenção agendado + política distinta por tabela. Absorve o crescimento que DB-13 erroneamente atribuiu a race. |
| **DB-8** | Scripts `*.sql` ad-hoc mutam prod fora das migrations | 🟡 **CONFIRMA Medium** | 4h | médio | **P3** | **CONFIRMADO**: 3 scripts `*.sql` hand-edited (`fix-m1-local-path`, `update-file-uris`, `update-file-uris-2026-03-16`) rodam direto em prod via psql. DB-4 e DB-5 são sintomas materiais. Fix = mover refresh de URI p/ script Drizzle parametrizado/versionado (Tema E). **Bloqueado por SYS-10** (sem runner, não há "lugar certo" pra colocá-los). |
| **DB-11** | `token_usage.total_tokens` denormalizado sem CHECK | 🟢 **CONFIRMA Low** | 0.5h | simples | **P4** | **CONFIRMADO**: `total_tokens` é coluna separada de `input+output` sem `CHECK (total_tokens = input_tokens + output_tokens)`. Pode driftar via insert raw. Quick-win agrupável com DB-9 (mesmo PR de CHECKs). |
| **DB-14** | `knowledge_documents` tem `local_path` E `storage_path` (pós-Supabase) | 🟢 **CONFIRMA Low — drop APROVÁVEL** | 1h | simples | **P4** | **CONFIRMADO + resposta à Q5 do architect:** `storage_path` é **ESCRITO** só por `scripts/seed-db.ts:118-129` (derivado de localPath) e tem **ZERO reads em `src/`** (grep confirma: nenhum `.storagePath`/`storage_path` fora de schema/seed). Coluna morta da era Supabase. **Drop é seguro** após (a) remover a escrita no seed e (b) confirmar zero reads — feito. Requer aprovação explícita de drop (governança). |

**Resumo da validação:** 14 débitos DB revisados → **8 confirmados** (DB-3, DB-5, DB-6, DB-8, DB-9, DB-10, DB-11, DB-14; DB-1/DB-12 confirmados c/ nota) · **5 ajustados** (DB-2 🔴→🟠, DB-4 🔴→🟠, DB-7 🟠→🟡, DB-12 absorve DB-13, DB-1 escopo) · **1 rejeitado na premissa** (DB-13 — vira Low/funde em DB-12).

---

## 2. Débitos Adicionados

Itens de camada de dados que o DRAFT não capturou, encontrados na re-checagem:

| ID | Débito | Severidade | Horas | Notas |
|----|--------|-----------|-------|-------|
| **DB-15** | `debate_participants.mind_id` FK com `ON DELETE no action` (default), enquanto `debate_id` é CASCADE | 🟡 Medium | 0.5h | Migration 0002:71. Deletar um `mind` com participações deixa o DELETE **bloqueado** (no action = RESTRICT). Inconsistente com o resto do schema (minds→knowledge/conversations são CASCADE). Decisão consciente necessária: bloquear delete de mind ativo é provavelmente o correto, mas deve ser explícito/documentado. |
| **DB-16** | `seed-db.ts` ainda popula `storage_path` (coluna morta DB-14) | 🟢 Low | 0.25h | Co-requisito de DB-14: o drop da coluna falha/regride se o seed continuar escrevendo. Remover linhas 118-129 ANTES do drop. |
| **DB-17** | `messages.mind_slug` é `varchar` solto, sem FK p/ `minds.slug` nem índice | 🟢 Low | 0.5h | Adicionado na 0002 p/ debates. `minds.slug` é UNIQUE (indexável), mas `mind_slug` não referencia nada — slug órfão possível se um mind for renomeado. Baixo risco (debates only), mas é um `user_id`-sem-FK em miniatura. |
| **DB-18** | Nenhum índice em `created_at` de `messages`/`conversations` p/ ordenação cronológica | 🟢 Low | 0.5h | Listas de conversa/mensagem ordenam por `created_at DESC`. Em baixo volume (1 mind, uso inicial) é irrelevante; agrupar com DB-6 se/quando o volume crescer. Flag, não urgência. |

**Total adicionado:** 4 débitos (0 🔴 · 0 🟠 · 1 🟡 · 3 🟢). Nenhum altera a foto de risco crítico.

---

## 3. Respostas ao Architect (CRITICAL)

### Q1 — DB-5 vs DB-3: qual é a causa-raiz REAL do cache-miss do Gemini File URI?

**Resposta definitiva: são causas-raiz de DOIS estágios diferentes do pipeline, e a confusão da Fase 2 foi tratá-las como o mesmo bug. Para destravar o cache, DB-5 é o que precisa ser corrigido primeiro — DB-3 sozinho não recupera.**

Evidência decisiva (`src/lib/ai/knowledge.ts:117-128`): o **caminho de leitura do app** (`getFileUrisFromDb`) faz:
```
innerJoin(fileUriCache, eq(fileUriCache.knowledgeDocumentId, knowledgeDocuments.id))
  .where(eq(knowledgeDocuments.mindId, mind.id))
```
**O app NÃO usa `local_path` para nada.** O JOIN é por `knowledge_document_id` (UUID). Logo o encoding NFD (DB-3) **não pode causar cache-miss no read-side** — ele só quebra os **scripts de WRITE** (`update-file-uris.sql` com `JOIN ON local_path = ...`).

Encadeamento real do incidente M1 (20/21):
1. **DB-3 (gatilho de escrita):** o JOIN por `local_path =` no script de ingest/refresh falhou para o doc M1 (NFD + extensão `.md` faltante) → a linha de cache de M1 **nunca foi inserida**. Resultado: 20/21.
2. **DB-5 (impede a recuperação):** o `fix-m1-local-path.sql` tentou consertar via `INSERT ... ON CONFLICT (knowledge_document_id) DO UPDATE`. Mas **não existe UNIQUE em `knowledge_document_id`** → o `ON CONFLICT` lança erro e **aborta a transação inteira (BEGIN/COMMIT)**. A recuperação falha silenciosamente; o doc continua sem cache.
3. **Read-side:** com a linha ausente, `getFileUrisFromDb` simplesmente retorna menos entradas (ou cai no manifest fallback) — não é "mismatch", é "linha não existe".

**Veredito:** DB-3 é o **gatilho histórico** do write-side (já mitigado pelo script LIKE de 16/03). **DB-5 é o bloqueador estrutural** que torna qualquer upsert de recuperação impossível — e continuará mordendo todo refresh futuro que dependa de `ON CONFLICT`. **Ordem de correção: DB-5 primeiro (destrava o upsert), DB-3 em seguida (elimina o gatilho na origem via NFC no ingest).** Corrigir DB-3 sem DB-5 deixa o pipeline frágil; corrigir DB-5 sem DB-3 faz o upsert funcionar mas o write-side ainda pode errar o alvo por encoding. Ambos são necessários, mas **DB-5 é o que "destrava o cache"** que o architect perguntou.

### Q2 — DB-2: ordem segura para adicionar FKs numa prod viva. Há órfãos? CASCADE é seguro?

**Há órfãos prováveis? SIM, baixo-mas-não-zero.** Dois vetores: (a) `users` foi migrado de Supabase p/ NextAuth — usuários antigos podem ter `user_id` que não existe mais na nova tabela `users`; (b) DB-1/sem-FK significa que **nada nunca garantiu** que esses `user_id` fossem válidos. Em prod com 1 user real o volume é baixo, mas a migração **DEVE** checar antes de assumir zero.

**`ON DELETE CASCADE` é seguro aqui? NÃO universalmente — diferenciar por tabela:**
- `conversations.user_id`, `mind_memories.user_id`, `debates.user_id` → **CASCADE faz sentido** (deletar user apaga seus dados pessoais; LGPD-friendly). Mas note que `conversations`→`messages`/`token_usage` já é CASCADE, então um delete de user vira um cascade profundo — **intencional, mas precisa ser conhecido** (não "cascade-delete não intencional", e sim cascade-delete esperado e desejado).
- `token_usage.user_id` → **CASCADE é PERIGOSO**: é dado de **billing/auditoria**. Recomendo **`ON DELETE SET NULL`** (manter o registro de custo após o user sair) ou, melhor, **`ON DELETE RESTRICT`** + arquivamento explícito. Apagar histórico de custo por delete de user é perda de dado financeiro.
- `rate_limits.user_id` → **CASCADE ok** (efêmero, tem TTL via DB-12 de qualquer forma).

**Estratégia concreta de migração (nullable → backfill/clean → validate → enforce), por tabela:**
1. **Auditar órfãos primeiro** (read-only): `SELECT count(*) FROM <t> LEFT JOIN users ON <t>.user_id = users.id WHERE users.id IS NULL` para as 5 tabelas. NÃO prosseguir sem este número.
2. **Resolver órfãos** conforme política: deletar (rate_limits), ou reatribuir/anular (token_usage → considerar SET NULL e tornar a coluna nullable só nessa tabela), ou bloquear a migração se órfão em conversations/debates indicar bug a investigar.
3. **Adicionar FK como `NOT VALID`** (Postgres): `ALTER TABLE <t> ADD CONSTRAINT <fk> FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE <policy> NOT VALID;` — isso **não trava a tabela** para escritas existentes e não re-valida linhas legadas no ato.
4. **`VALIDATE CONSTRAINT`** num passo separado: `ALTER TABLE <t> VALIDATE CONSTRAINT <fk>;` — toma `SHARE UPDATE EXCLUSIVE` (não bloqueia reads/writes normais). Se falhar, há órfão que escapou do passo 2 → voltar.

Drizzle não expressa `NOT VALID`/`VALIDATE` nativamente — esta migração deve ser **SQL manual versionado** rodando pelo runner do SYS-10, não `drizzle-kit push`.

### Q3 — DB-4: já causou incidente em prod, ou o caminho nunca rodou?

**Veredito: NÃO causou corrupção de dados em prod, e muito provavelmente o caminho `updated_at` nunca foi efetivamente persistido. Raciocínio pela evidência:**
1. O `fix-m1-local-path.sql` está envolto em `BEGIN; ... COMMIT;`. Se o `UPDATE ... SET updated_at = NOW()` (linha 10) tivesse executado, o Postgres abortaria com `column "updated_at" of relation "knowledge_documents" does not exist` **antes do COMMIT** → rollback total → **zero efeito**. Atomicidade garante "tudo ou nada".
2. A MEMORY do projeto registra "M1 fix" como **resolvido** e o estado atual é **21/21 URIs renovadas**. Isso só é consistente se o conserto efetivo veio por **outro** caminho — e veio: `update-file-uris-2026-03-16.sql` usa `UPDATE file_uri_cache ... LIKE pattern` (NFD-safe) e **não toca `knowledge_documents.updated_at`**. Esse é o script que de fato funcionou.
3. Conclusão: `fix-m1-local-path.sql` é um **artefato morto** — ou nunca rodou em prod, ou rodou, abortou no `UPDATE`, e foi abandonado em favor do script de 16/03. Em nenhum cenário houve dado corrompido (graças ao BEGIN/COMMIT). **O "incidente" foi um script que não pôde completar, não um dano persistido.** Risco residual = **trap futura**: se alguém reusar o script como template, vai bater no mesmo erro. Fix de 15 min: remover a linha do `updated_at` e arquivar o script. **Não é Critical** — daí o rebaixo p/ High em §1.

### Q4 — DB-13 (race de rate_limit): observado em prod ou teórico?

**Nem observado nem teórico — a premissa está incorreta** (ver §1, DB-13). O design é INSERT-append + SUM, não upsert-increment. Não há race de contagem: dois requests concorrentes inserem duas linhas, e o `SUM(request_count)` as soma corretamente. Um UNIQUE em (user_id, action, window_start) **quebraria** o limiter. O problema real associado é crescimento ilimitado, já coberto por **DB-12**. **Recomendo NÃO tratar DB-13 como débito de integridade** — não altera prioridade de nada porque o "risco" não existe.

### Q5 — DB-14: confirmar zero reads de `storage_path` antes de aprovar o drop.

**CONFIRMADO: zero reads em `src/`.** `grep -rn '\.storagePath|storage_path' src/` retorna **nada** fora de `schema/` (declaração) e `scripts/seed-db.ts` (escrita). A coluna é só populada no seed, nunca lida pelo runtime. **Drop aprovável** após remover a escrita no seed (DB-16). Como é DROP de coluna, exige aprovação explícita de governança no PR de cleanup (Tema A).

---

## 4. Recomendações (ordem de resolução — ótica de dados)

**Concordo com a tese do architect ("SYS-10 antes do Tema C"), com um ajuste cirúrgico.**

**Confirmo a ordem não-negociável: SYS-10 (runner de migração automatizado) DEVE preceder o hardening de schema (Tema C).** Razão de dados: as migrações de hardening (FKs com `NOT VALID/VALIDATE`, dedupe + UNIQUE, índices `CONCURRENTLY`) são **multi-step, ordem-sensíveis e precisam de rollback determinístico** numa prod viva. Aplicá-las via psql manual por SSH (estado atual) é exatamente o anti-padrão que gerou DB-4/DB-5/DB-8. Sem runner versionado, todo hardening reintroduz o risco que está tentando eliminar.

**Ajuste:** há **3 quick-wins críticos que NÃO precisam esperar SYS-10** porque são correções de **código/script**, não DDL em prod:
- **DB-5 fix de script** + **DB-4** (remover `updated_at`): são edições nos `*.sql`/serviço, não migração de schema. Podem ir já.
- O **UNIQUE em `file_uri_cache`** (a parte DDL de DB-5) **espera o runner** — mas o dedupe + a remoção do `ON CONFLICT` quebrado pode ser preparado antes.

**Ordem recomendada do track DB:**
1. **(agora, sem runner)** DB-4 (deletar `updated_at` do script) + DB-3 (NFC no ingest + backfill via script LIKE já existente) + auditoria read-only de órfãos (DB-2) e de duplicatas (DB-5). Zero DDL, alto sinal, destrava diagnóstico.
2. **(habilitador) SYS-10 + SYS-11** — runner de migração gated no deploy + smoke `/api/chat`. **Pré-requisito de tudo que é DDL.**
3. **(Tema C, via runner)** dedupe → **UNIQUE `file_uri_cache`** (DB-5 DDL, destrava upsert) → **índices** (DB-6, via `CREATE INDEX CONCURRENTLY`) → **FKs** `NOT VALID`+`VALIDATE` com política por tabela (DB-2 + DB-15) → **CHECKs** (DB-9 + DB-11) → **triggers `updated_at`** (DB-10).
4. **(Tema E)** pipeline Gemini auto-cura: re-upload sob expiração (SYS-1) + mover refresh p/ script Drizzle versionado (DB-8).
5. **(Tema A, PR único)** drop `storage_path` (DB-14) + remover escrita no seed (DB-16) + limpeza Supabase/Vercel.
6. **(retenção)** DB-12 (job agendado; absorve DB-13) — não bloqueante.

---

## 5. Migration Safety Notes (prod viva, dados existentes)

Para as duas correções críticas, o passo obrigatório é **resolver duplicatas/órfãos ANTES de adicionar a constraint** — uma constraint adicionada sobre dados sujos falha e aborta.

### DB-5 — UNIQUE em `file_uri_cache(knowledge_document_id)`
1. **Detectar duplicatas** (read-only):
   `SELECT knowledge_document_id, count(*) FROM file_uri_cache GROUP BY 1 HAVING count(*) > 1;`
2. **Dedupe mantendo a entrada mais fresca** (a com maior `updated_at`/`expires_at`):
   deletar todas menos a `row_number() OVER (PARTITION BY knowledge_document_id ORDER BY updated_at DESC) = 1`. Fazer dentro de transação, com `SELECT` de verificação antes do COMMIT.
3. **Criar o índice único sem travar a tabela:**
   `CREATE UNIQUE INDEX CONCURRENTLY file_uri_cache_kdid_uniq ON file_uri_cache(knowledge_document_id);`
   (`CONCURRENTLY` não pode rodar dentro de transação — o runner do SYS-10 deve suportar statements fora de tx.)
4. **Promover a constraint** (opcional, para o `ON CONFLICT` aceitar): com o índice único já existente, `ON CONFLICT (knowledge_document_id)` passa a funcionar sem `ADD CONSTRAINT`. Se quiser a constraint nomeada: `ALTER TABLE file_uri_cache ADD CONSTRAINT ... UNIQUE USING INDEX file_uri_cache_kdid_uniq;`
5. **Rollback:** `DROP INDEX CONCURRENTLY file_uri_cache_kdid_uniq;` — seguro, não afeta dados.

### DB-2 — FKs `user_id` → `users(id)`
1. **Auditar órfãos por tabela** (read-only, ver §3-Q2 passo 1). **Gate:** não prosseguir com órfão > 0 sem decisão explícita.
2. **Limpar/reatribuir órfãos** conforme política por tabela (rate_limits: delete · token_usage: SET NULL + tornar coluna nullable · conversations/debates: investigar antes de deletar).
3. **Adicionar FK `NOT VALID`** (não trava, não re-valida legado no ato), com `ON DELETE` correto por tabela:
   - conversations/mind_memories/debates → `ON DELETE CASCADE`
   - token_usage → `ON DELETE SET NULL` (preservar billing)
   - rate_limits → `ON DELETE CASCADE`
4. **`VALIDATE CONSTRAINT`** num passo separado (lock leve `SHARE UPDATE EXCLUSIVE`). Falha aqui = órfão escapou → rollback do passo e voltar ao 2.
5. **Rollback:** `ALTER TABLE <t> DROP CONSTRAINT <fk>;` por tabela — instantâneo, sem efeito em dados.

**Regra de ouro para ambas:** todo esse fluxo roda pelo **runner versionado do SYS-10** (statements `CONCURRENTLY`/`NOT VALID` exigem suporte a múltiplos statements fora de transação única), **nunca** por psql manual ad-hoc. Snapshot `pg_dump` antes de qualquer passo destrutivo (dedupe/clean) — sem tabelas de backup no DB (regra do projeto).

---

## 6. Recálculo de Esforço do Track DB

| Faixa | Débitos | Horas |
|-------|---------|-------|
| Quick-wins (sem runner) | DB-4, DB-3 (parte código), audit órfãos/dupes | ~3.5h |
| DDL via runner (Tema C) | DB-5, DB-6, DB-2, DB-9, DB-10, DB-11, DB-15 | ~11h |
| Análise/ADR | DB-1 | ~3h |
| Pipeline/scripts (Tema E) | DB-8 | ~4h |
| Cleanup | DB-14, DB-16 | ~1.25h |
| Retenção | DB-12 (absorve DB-13) | ~2.5h |
| Low/flag | DB-7, DB-17, DB-18 | ~1.5h |
| **Total track DB** | 14 originais + 4 novos | **~26.75h** |

> Exclui SYS-10/SYS-11 (track Sistema, pré-requisito), contados pelo @architect.

---

*Revisão Fase 5 concluída. Os 3 🔴 Critical originais foram reavaliados: apenas DB-5 permanece Critical; DB-2 e DB-4 rebaixados para High com justificativa. O gargalo de fechamento do assessment (Seção 2) está resolvido. Aguarda Fase 6 (UX) e Fase 8 (finalização por @architect).*
