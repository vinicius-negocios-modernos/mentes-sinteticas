# Database Specialist Review

## Projeto: Mentes Sinteticas

**Phase:** Brownfield Discovery - Phase 5 (Database Specialist Review)
**Author:** @data-engineer (Dara)
**Date:** 2026-03-06
**Status:** Complete
**Input Documents:**
- `docs/prd/technical-debt-DRAFT.md` (Phase 4 - @architect)
- `docs/architecture/system-architecture.md` (Phase 1 - @architect)
- `src/app/actions.ts` (Server Actions)
- `src/lib/gemini.ts` (Gemini integration)
- `data/minds_manifest.json` (Current data structure)

---

## 1. Debitos Validados

Revisao dos debitos identificados pelo @architect que envolvem dados, persistencia e estado.

| ID | Debito | Severidade Original | Severidade Ajustada | Horas | Prioridade | Notas |
|----|--------|---------------------|---------------------|-------|------------|-------|
| SYS-010 | File URIs expiram em 48h sem mecanismo de renovacao | ALTO | **CRITICO** | 6-8 | P0 | Ajustado para CRITICO. O `last_updated` no manifest mostra `2025-12-31` -- esses URIs ja expiraram ha meses. O sistema inteiro esta quebrado silenciosamente AGORA. Nenhuma conversa funciona ate resolver isso. |
| SYS-012 | Context window bloat -- 21 file URIs re-enviados a cada mensagem | ALTO | ALTO | 8-12 | P1 | Confirmado. Analisando `gemini.ts:91-106`, o `chatHistory` prepend acontece em TODA chamada. Com 21 arquivos + historico crescente, o custo de tokens escala linearmente. Solucao: Gemini Cached Content API. |
| SYS-013 | Chat session recriado do zero a cada `sendMessage` | ALTO | ALTO | 6-8 | P1 | Confirmado. `createMindChat()` e chamado em `actions.ts:12` toda vez. Zero reutilizacao de sessao. Precisa de server-side session store. |
| SYS-014 | `readFileSync` em funcoes async | MEDIO | MEDIO | 1-2 | P2 | Confirmado. `gemini.ts:33,39` usa `fs.readFileSync`. Migrar para DB elimina este debito automaticamente. |
| SYS-016 | Manifest re-lido do disco a cada request | MEDIO | MEDIO | 2-3 | P2 | Confirmado. Migrar manifest para DB com caching em memoria resolve. |
| UX-004 | Historico de chat nao persistido | ALTO | **CRITICO** | 6-8 | P0 | Ajustado para CRITICO. Sem persistencia, o produto nao tem proposta de valor real. Cada refresh destroi toda a interacao. Para um produto "legendario", historico e fundamento. |
| CROSS-002 | No auth + no persistence = no user identity | CRITICO | CRITICO | 16-24 | P0 | Confirmado. A ausencia de DB e o bloqueio fundamental. Tudo depende disso. |
| CROSS-003 | Arquitetura stateless impede features core | ALTO | ALTO | 12-16 | P1 | Confirmado. O DB e o alicerce para resolver este debito. |
| CROSS-006 | Knowledge base management gap | ALTO | ALTO | 8-12 | P1 | Confirmado. O manifest JSON e fragil, sem TTL tracking, sem admin UI. |

---

## 2. Debitos Adicionados

Debitos de dados/persistencia nao identificados no DRAFT.

| ID | Debito | Severidade | Horas | Prioridade | Justificativa |
|----|--------|-----------|-------|------------|---------------|
| DB-001 | **Manifest JSON nao tem campo `expires_at` por arquivo.** O campo `last_updated` existe no nivel da mente, nao por arquivo. Impossivel saber qual URI expirou sem consultar a API do Gemini. | CRITICO | 2-3 | P0 | O Gemini File API retorna `expirationTime` no upload. O script `ingest_mind.ts` nao captura esse dado. Sem ele, qualquer logica de renovacao e cega. |
| DB-002 | **Nenhuma estrategia de backup dos dados de conhecimento.** Os arquivos locais em `knowledge_base/` sao a unica copia. Se perdidos, a re-criacao da mente e impossivel (depende de conteudo original). | ALTO | 2-3 | P1 | Precisa de storage duravel (Supabase Storage, S3, ou similar) como backup dos originais. |
| DB-003 | **Manifest JSON e single point of failure.** Um JSON corrompido (escrita parcial, conflito de merge) derruba todo o catalogo de mentes. Nao ha validacao de integridade. | ALTO | 1-2 | P1 | Schema validation (Zod) + migracao para DB resolve. |
| DB-004 | **Sem tracking de token usage por conversa/usuario.** `gemini.ts` recebe `maxOutputTokens: 8192` mas nao registra quantos tokens foram usados. Impossivel calcular custo, detectar abuso, ou otimizar. | MEDIO | 3-4 | P2 | O response do Gemini retorna `usageMetadata`. Precisa capturar e persistir. |
| DB-005 | **Sem controle de concorrencia no manifest.** Se dois processos (ex: ingestion + server) lerem/escreverem simultaneamente, ocorre race condition e perda de dados. | MEDIO | 1-2 | P2 | DB resolve com transacoes ACID. |
| DB-006 | **`localPath` no manifest usa caminhos relativos com caracteres especiais.** Acentos, dois-pontos, aspas e travessoes nos nomes de arquivo. Quebrara em Windows e em algumas configuracoes de filesystem. | MEDIO | 1-2 | P2 | Normalizar nomes na migracao para DB. Usar slugs ou UUIDs como identificadores. |

---

## 3. Recomendacao de Arquitetura de Dados

### 3.1 Tecnologia Recomendada: Supabase (PostgreSQL)

**Concordo com a recomendacao do @architect na Secao 7.2 do DRAFT**, com as seguintes justificativas adicionais e refinamentos:

| Fator | Analise |
|-------|---------|
| **PostgreSQL** | Modelo relacional ideal para conversations/messages (queries complexas, JOINs, full-text search). JSONB para metadata flexivel. |
| **Supabase Auth** | Elimina CROSS-002 (auth + persistence). Social login, magic link, sessoes gerenciadas. Zero infra adicional. |
| **Supabase Realtime** | Habilita streaming de status (typing indicators, presenca online) sem WebSocket custom. Essencial para o feature "Multi-Mind Debates". |
| **Supabase Storage** | Resolve DB-002 (backup de knowledge base). Upload de arquivos com CDN integrado. |
| **Row Level Security (RLS)** | Seguranca no nivel do banco. Usuarios so acessam seus proprios dados. Elimina classe inteira de vulnerabilidades. |
| **Edge Functions** | Cron jobs para renovacao de File URIs (SYS-010). Sem necessidade de infra separada. |
| **Free Tier** | 500MB DB, 1GB Storage, 50K auth users. Mais que suficiente para MVP e early growth. |
| **Migracao futura** | PostgreSQL standard. Se precisar migrar de Supabase, o schema funciona em qualquer Postgres managed (RDS, Cloud SQL, Neon). |

**Alternativas avaliadas e descartadas:**

| Tecnologia | Motivo de Rejeicao |
|------------|-------------------|
| **SQLite** | Sem auth built-in, sem realtime, sem RLS, nao escala para multi-usuario. Bom para prototipo local, insuficiente para a visao do projeto. |
| **Firebase/Firestore** | NoSQL dificulta queries analiticas (mind popularity, conversation stats). Vendor lock-in mais forte. Sem SQL. |
| **PlanetScale** | Excelente para MySQL, mas nao bundla auth/storage/realtime. Mais moving parts para gerenciar. |
| **Prisma + Postgres standalone** | Prisma e excelente como ORM, mas Supabase ja fornece o Postgres + extras. Recomendo Prisma como ORM sobre Supabase Postgres se a equipe preferir type-safe queries sobre o Supabase client JS. |

**ORM Recommendation:** **Drizzle ORM** sobre Supabase Postgres.

| Fator | Drizzle | Prisma |
|-------|---------|--------|
| Bundle size | ~7KB | ~200KB+ |
| Performance | SQL direto, zero overhead | Query engine intermediario |
| Type safety | Excelente (schema-as-code) | Excelente (codegen) |
| Migrations | Push-based ou SQL | Prisma migrate |
| Learning curve | Baixa (SQL-like) | Media |
| Supabase compat | Nativo | Requer connection pooler |

Para um projeto Next.js que roda em serverless (Vercel), Drizzle e a escolha superior pela leveza e performance.

---

### 3.2 Schema Proposto

```sql
-- ============================================================
-- SCHEMA: Mentes Sinteticas
-- Engine: PostgreSQL (Supabase)
-- ORM: Drizzle (type definitions geradas a partir deste schema)
-- ============================================================

-- =====================
-- USERS (Supabase Auth)
-- =====================
-- Tabela `auth.users` e gerenciada pelo Supabase Auth.
-- Criamos uma tabela `profiles` para dados adicionais.

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'pt-BR',
    theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    default_mind_id UUID REFERENCES minds(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- MINDS (Catalogo de Pensadores)
-- =====================

CREATE TABLE minds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,                          -- "Antonio Napole"
    slug TEXT NOT NULL UNIQUE,                          -- "antonio-napole" (URL-safe)
    description TEXT,                                   -- Bio curta para catalogo
    avatar_url TEXT,                                    -- URL do avatar/foto
    system_prompt TEXT NOT NULL,                         -- Prompt de persona completo
    model_config JSONB NOT NULL DEFAULT '{              -- Config do modelo Gemini
        "model": "gemini-2.0-flash",
        "temperature": 0.7,
        "topK": 40,
        "topP": 0.95,
        "maxOutputTokens": 8192
    }'::jsonb,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'ingesting', 'error')),
    tags TEXT[] DEFAULT '{}',                           -- ["estrategista", "negocios"]
    category TEXT,                                      -- "Estrategistas", "Filosofos", etc.
    total_conversations INTEGER NOT NULL DEFAULT 0,     -- Counter cache
    total_messages INTEGER NOT NULL DEFAULT 0,          -- Counter cache
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_minds_slug ON minds(slug);
CREATE INDEX idx_minds_status ON minds(status);
CREATE INDEX idx_minds_category ON minds(category);

-- =====================
-- MIND FILES (Knowledge Base URIs)
-- =====================

CREATE TABLE mind_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mind_id UUID NOT NULL REFERENCES minds(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,                            -- "M1 - Historia de Vida e Formacao"
    display_name TEXT NOT NULL,                         -- Nome legivel para admin UI
    gemini_file_name TEXT,                              -- "files/z3o01p82t6qv" (Gemini API ref)
    file_uri TEXT,                                      -- URI completa do Gemini File API
    mime_type TEXT NOT NULL DEFAULT 'text/plain',
    file_size_bytes BIGINT,                             -- Tamanho para metricas
    storage_path TEXT,                                  -- Path no Supabase Storage (backup)
    local_path TEXT,                                    -- Path original no filesystem
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'uploading', 'active', 'expired', 'error')),
    uploaded_at TIMESTAMPTZ,                            -- Quando foi enviado ao Gemini
    expires_at TIMESTAMPTZ,                             -- TTL do Gemini (48h apos upload)
    last_refreshed_at TIMESTAMPTZ,                      -- Ultimo re-upload bem sucedido
    refresh_count INTEGER NOT NULL DEFAULT 0,           -- Quantas vezes foi renovado
    error_message TEXT,                                 -- Ultimo erro de upload/refresh
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mind_files_mind_id ON mind_files(mind_id);
CREATE INDEX idx_mind_files_status ON mind_files(status);
CREATE INDEX idx_mind_files_expires_at ON mind_files(expires_at)
    WHERE status = 'active';                            -- Partial index: so ativos

-- =====================
-- CONVERSATIONS
-- =====================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mind_id UUID NOT NULL REFERENCES minds(id) ON DELETE CASCADE,
    title TEXT,                                         -- Auto-gerado do primeiro msg ou user-defined
    summary TEXT,                                       -- Resumo para "Mind Memory" feature
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'deleted')),
    message_count INTEGER NOT NULL DEFAULT 0,           -- Counter cache
    total_tokens_used INTEGER NOT NULL DEFAULT 0,       -- Soma de tokens da conversa
    last_message_at TIMESTAMPTZ,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,           -- Para feature "Conversation Sharing"
    share_slug TEXT UNIQUE,                             -- Slug para URL publica
    metadata JSONB DEFAULT '{}',                        -- Extensivel: model version, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_mind_id ON conversations(mind_id);
CREATE INDEX idx_conversations_user_mind ON conversations(user_id, mind_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_share_slug ON conversations(share_slug)
    WHERE share_slug IS NOT NULL;                       -- Partial index

-- =====================
-- MESSAGES
-- =====================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
    content TEXT NOT NULL,
    tokens_input INTEGER,                               -- Tokens de input (do usageMetadata)
    tokens_output INTEGER,                              -- Tokens de output
    model_used TEXT,                                    -- "gemini-2.0-flash" (registra versao exata)
    response_time_ms INTEGER,                           -- Latencia da resposta Gemini
    metadata JSONB DEFAULT '{}',                        -- Extensivel: feedback, rating, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sem updated_at: mensagens sao imutaveis (append-only log)
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(conversation_id, created_at);

-- =====================
-- ANALYTICS (Eventos de Uso)
-- =====================

CREATE TABLE analytics_events (
    id BIGSERIAL PRIMARY KEY,                           -- BIGSERIAL para volume alto
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,                            -- 'conversation_start', 'message_sent',
                                                        -- 'mind_selected', 'conversation_shared', etc.
    mind_id UUID REFERENCES minds(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    properties JSONB DEFAULT '{}',                      -- Dados especificos do evento
    session_id TEXT,                                    -- Para agrupar eventos por sessao
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by time seria ideal em producao, mas para MVP:
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_mind_id ON analytics_events(mind_id);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);

-- =====================
-- FILE REFRESH LOG (Auditoria de renovacao de URIs)
-- =====================

CREATE TABLE file_refresh_log (
    id BIGSERIAL PRIMARY KEY,
    mind_file_id UUID NOT NULL REFERENCES mind_files(id) ON DELETE CASCADE,
    old_uri TEXT,
    new_uri TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    error_message TEXT,
    duration_ms INTEGER,
    triggered_by TEXT NOT NULL DEFAULT 'cron'            -- 'cron', 'manual', 'on_demand'
        CHECK (triggered_by IN ('cron', 'manual', 'on_demand')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_refresh_log_mind_file ON file_refresh_log(mind_file_id);

-- =====================
-- RLS POLICIES
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Profiles: usuario so ve/edita o proprio perfil
CREATE POLICY profiles_own ON profiles
    FOR ALL USING (auth.uid() = id);

-- Conversations: usuario so ve as proprias (+ shared publicas)
CREATE POLICY conversations_own ON conversations
    FOR ALL USING (
        auth.uid() = user_id
        OR (is_shared = TRUE AND current_setting('request.method') = 'GET')
    );

-- Messages: acesso via conversation (RLS cascading)
CREATE POLICY messages_via_conversation ON messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations c
            WHERE c.id = messages.conversation_id
            AND (c.user_id = auth.uid() OR c.is_shared = TRUE)
        )
    );

-- Analytics: usuario ve so os proprios eventos; admin ve todos
CREATE POLICY analytics_own ON analytics_events
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.jwt()->>'role' = 'admin'
    );

-- Minds e mind_files: leitura publica, escrita so admin
ALTER TABLE minds ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY minds_read_public ON minds
    FOR SELECT USING (status = 'active');

CREATE POLICY minds_admin_write ON minds
    FOR ALL USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY mind_files_read_public ON mind_files
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM minds m WHERE m.id = mind_files.mind_id AND m.status = 'active')
    );

CREATE POLICY mind_files_admin_write ON mind_files
    FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- =====================
-- FUNCTIONS & TRIGGERS
-- =====================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_minds_updated_at
    BEFORE UPDATE ON minds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_mind_files_updated_at
    BEFORE UPDATE ON mind_files FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_conversations_updated_at
    BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Counter cache: incrementa message_count e total_tokens na conversation
CREATE OR REPLACE FUNCTION update_conversation_counters()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations SET
        message_count = message_count + 1,
        total_tokens_used = total_tokens_used + COALESCE(NEW.tokens_input, 0) + COALESCE(NEW.tokens_output, 0),
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;

    -- Tambem atualiza counters da mind
    UPDATE minds SET
        total_messages = total_messages + 1
    WHERE id = (SELECT mind_id FROM conversations WHERE id = NEW.conversation_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_messages_counter
    AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_counters();

-- Counter cache: incrementa total_conversations na mind
CREATE OR REPLACE FUNCTION update_mind_conversation_counter()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE minds SET
        total_conversations = total_conversations + 1
    WHERE id = NEW.mind_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_conversations_mind_counter
    AFTER INSERT ON conversations FOR EACH ROW EXECUTE FUNCTION update_mind_conversation_counter();
```

### 3.3 Diagrama de Relacionamentos

```
profiles (1) ----< conversations (N) >---- minds (1)
                        |
                        |----< messages (N)

minds (1) ----< mind_files (N) ----< file_refresh_log (N)

analytics_events (standalone, refs: user, mind, conversation)
```

### 3.4 Decisoes de Design Justificadas

| Decisao | Justificativa |
|---------|---------------|
| UUID em vez de SERIAL para PKs | Permite criacao client-side (offline-first futuro), merge de dados, URLs nao sequenciais (seguranca). |
| `messages` sem `updated_at` | Messages sao um append-only log. Imutabilidade garante integridade do historico. Se precisar "editar", cria-se novo record com referencia ao original. |
| Counter caches (`total_conversations`, `total_messages`) | Evita COUNT(*) em queries frequentes (catalogo de minds, lista de conversas). Triggers mantem consistencia. |
| `metadata JSONB` em messages e conversations | Extensibilidade sem migration. Permite adicionar campos (user_rating, was_regenerated, edit_history) sem ALTER TABLE. |
| `model_config JSONB` em minds | Cada mente pode ter config diferente (temperatura, modelo). A/B testing de configs sem schema changes. |
| Partial indexes | `expires_at WHERE status = 'active'` e `share_slug WHERE NOT NULL` economizam espaco e aceleram queries especificas. |
| `analytics_events` com BIGSERIAL | Alto volume esperado. BIGSERIAL e mais eficiente que UUID para tabela de eventos. |
| Tabela separada `file_refresh_log` | Auditoria de renovacoes. Permite diagnosticar problemas de ingestion e medir confiabilidade do pipeline. |

---

## 4. Estrategia de Migracao

### 4.1 Migracao de `minds_manifest.json` para Database

**Abordagem: Seed Script + Dual-Read Transition**

#### Fase 1: Seed (1-2h)

```typescript
// scripts/seed-minds-from-manifest.ts
// Le minds_manifest.json e insere no Supabase

import manifest from '../data/minds_manifest.json';

for (const [mindName, mindData] of Object.entries(manifest.minds)) {
    // 1. Criar registro na tabela `minds`
    const mind = await db.insert(minds).values({
        name: mindName,
        slug: slugify(mindName),  // "antonio-napole"
        system_prompt: buildSystemPrompt(mindName), // extrair de gemini.ts
        status: 'active',
    }).returning();

    // 2. Criar registros em `mind_files` para cada arquivo
    for (const file of mindData.files) {
        await db.insert(mindFiles).values({
            mind_id: mind.id,
            file_name: file.displayName,
            display_name: file.displayName,
            gemini_file_name: file.name,
            file_uri: file.uri,
            mime_type: file.mimeType,
            local_path: file.localPath,
            status: 'expired',  // IMPORTANTE: marcar como expired (URIs de 2025-12-31)
            uploaded_at: new Date(mindData.last_updated),
            expires_at: new Date(
                new Date(mindData.last_updated).getTime() + 48 * 60 * 60 * 1000
            ),
        });
    }
}
```

**Nota critica:** Os URIs atuais do manifest datam de `2025-12-31`. Eles expiraram ha mais de 2 meses. O seed DEVE marcar todos como `status: 'expired'` e triggerar re-ingestion imediata.

#### Fase 2: Re-ingestion Automatica (4-6h)

```typescript
// Supabase Edge Function: refresh-expired-files
// Executada via cron a cada 12 horas (margem de seguranca sobre 48h TTL)

const expiredFiles = await db
    .select()
    .from(mindFiles)
    .where(
        or(
            eq(mindFiles.status, 'expired'),
            lt(mindFiles.expires_at, new Date(Date.now() + 6 * 60 * 60 * 1000)) // expira em < 6h
        )
    );

for (const file of expiredFiles) {
    try {
        // 1. Re-upload do Supabase Storage (ou filesystem local)
        const result = await fileManager.uploadFile(filePath, { mimeType: file.mime_type });

        // 2. Atualizar registro
        await db.update(mindFiles)
            .set({
                file_uri: result.file.uri,
                gemini_file_name: result.file.name,
                status: 'active',
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
                last_refreshed_at: new Date(),
                refresh_count: sql`refresh_count + 1`,
            })
            .where(eq(mindFiles.id, file.id));

        // 3. Log de auditoria
        await db.insert(fileRefreshLog).values({
            mind_file_id: file.id,
            old_uri: file.file_uri,
            new_uri: result.file.uri,
            status: 'success',
        });
    } catch (error) {
        await db.update(mindFiles)
            .set({ status: 'error', error_message: error.message })
            .where(eq(mindFiles.id, file.id));
    }
}
```

#### Fase 3: Dual-Read Transition (2-3h)

Para evitar downtime durante a migracao:

1. **Semana 1:** `gemini.ts` le do DB, fallback para manifest JSON se DB falhar.
2. **Semana 2:** Confirmar que DB funciona, remover fallback.
3. **Semana 3:** Remover `minds_manifest.json` e codigo de leitura de filesystem.

### 4.2 Upload dos Originais para Supabase Storage

```
knowledge_base/
  Antonio Napole/
    M1 - Historia de Vida...  -->  supabase-storage://minds/antonio-napole/m1-historia.txt
    analysis/...               -->  supabase-storage://minds/antonio-napole/analysis/...
```

- Normalizar nomes de arquivo (remover acentos, caracteres especiais)
- Manter referencia `storage_path` na tabela `mind_files`
- Supabase Storage serve como backup duravel e source-of-truth para re-uploads

### 4.3 Estrategia de Caching

| Camada | O que cachear | TTL | Invalidacao |
|--------|--------------|-----|-------------|
| **In-memory (Node.js)** | Lista de minds ativos | 5 min | On mind status change (Supabase Realtime) |
| **In-memory (Node.js)** | File URIs por mind | 30 min | On file refresh (Supabase Realtime) |
| **Supabase Realtime** | Subscricao em `minds` e `mind_files` changes | Streaming | Automatica |
| **Gemini Cached Content** | Contexto de arquivos pre-processado | 1h (Gemini TTL) | On file refresh |
| **Client-side** | Conversation list, mind catalog | 2 min | On navigation + SWR/React Query |

**Nota sobre Gemini Cached Content API:** Esta API permite criar um cache server-side do contexto de arquivos no Gemini. Em vez de enviar 21 file URIs a cada mensagem, voce cria um `cachedContent` uma vez e referencia ele nas chamadas subsequentes. Isso resolve SYS-012 (context bloat) e SYS-013 (stateless recreation) simultaneamente. O TTL minimo e 5 minutos, entao precisa de refresh periodico, mas e drasticamente mais eficiente.

---

## 5. Respostas ao Architect

Respostas as perguntas da Secao 8 do DRAFT.

### Pergunta 1: `file_refresh_jobs` separada ou query `mind_files` diretamente?

**Recomendacao: Query `mind_files` diretamente + tabela de log separada.**

Nao recomendo uma tabela `file_refresh_jobs` (job queue). Razoes:

- **Simplicidade:** A query `WHERE status = 'expired' OR expires_at < NOW() + INTERVAL '6 hours'` com o partial index `idx_mind_files_expires_at` e eficiente e suficiente.
- **Edge Function como scheduler:** Uma Supabase Edge Function rodando via cron (a cada 12h) faz a query, processa, e atualiza. Sem necessidade de job queue.
- **Auditoria:** A tabela `file_refresh_log` (proposta no schema) registra cada tentativa de refresh. Isso fornece o historico que uma job queue forneceria, sem a complexidade de gerenciar estados de jobs.
- **Escalabilidade futura:** Se o volume de minds crescer para centenas, ai sim considerar pg_cron + pg_task_queue ou um sistema como Inngest/Trigger.dev. Para o MVP com ~5-20 minds, over-engineering.

### Pergunta 2: `content TEXT` com `metadata JSONB` ou totalmente normalizado?

**Recomendacao: `content TEXT` + `metadata JSONB` (abordagem hibrida).**

```sql
-- Abordagem recomendada (ja no schema proposto):
messages (
    content TEXT NOT NULL,       -- Texto puro da mensagem
    tokens_input INTEGER,        -- Extraido de usageMetadata (coluna dedicada)
    tokens_output INTEGER,       -- Extraido de usageMetadata (coluna dedicada)
    model_used TEXT,             -- Coluna dedicada (query frequente)
    response_time_ms INTEGER,    -- Coluna dedicada (metricas)
    metadata JSONB DEFAULT '{}'  -- Tudo mais: feedback, rating, was_regenerated, etc.
)
```

Justificativa:
- **Campos com query frequente** (`tokens_*`, `model_used`, `response_time_ms`) sao colunas dedicadas. Permite indexar, agregar (SUM, AVG), e filtrar eficientemente.
- **Campos extensiveis** (`metadata JSONB`) para dados que variam ou sao adicionados ao longo do tempo. Nao requer ALTER TABLE.
- **Totalmente normalizado** (ex: tabela `message_metadata` separada) adiciona JOINs desnecessarios para dados que sempre sao lidos junto com a mensagem.

### Pergunta 3: RLS no nivel de `conversations` ou tambem em `messages`?

**Recomendacao: RLS em AMBOS, com policy em `messages` cascading via `conversations`.**

Ja implementado no schema proposto. A policy em `messages` faz EXISTS na tabela `conversations`, verificando ownership. Isso garante:

1. **Defense in depth:** Mesmo que alguem consiga bypass da camada de aplicacao, o banco bloqueia acesso a mensagens de outros usuarios.
2. **Shared conversations:** A policy permite leitura de mensagens de conversas marcadas como `is_shared = TRUE`.
3. **Admin access:** Para analytics, usar uma service role key (bypass RLS) em Edge Functions. NUNCA expor service key ao client.

**Sobre admin access para analytics:** Criar uma Edge Function `/api/admin/analytics` que usa `supabase.auth.admin` (service role). Protegida por middleware que verifica `auth.jwt()->>'role' = 'admin'`. A tabela `analytics_events` ja tem RLS policy para admin.

### Pergunta 4: Manter manifest como cache/fallback ou migrar totalmente?

**Recomendacao: Migracao total com periodo de transicao (3 semanas).**

- **Semana 1-2:** Dual-read (DB primary, manifest fallback). Monitora taxa de fallback.
- **Semana 3:** Se fallback rate = 0%, remove manifest read. Arquivo permanece no repo como referencia historica.
- **Nao manter como cache:** O manifest JSON cria um problema de sincronizacao. Duas fontes de verdade levam inevitavelmente a inconsistencia. O DB e a unica source-of-truth apos migracao.
- **Seeding script** deve ser idempotente (pode rodar varias vezes sem duplicar dados). Usar `ON CONFLICT (name) DO UPDATE` no INSERT.

### Pergunta 5: Tabelas de analytics separadas ou materialized views?

**Recomendacao: Abordagem em 2 fases.**

**Fase 1 (MVP):** Tabela `analytics_events` (event sourcing) + queries diretas.
- Suficiente para < 100K eventos.
- Queries como "mind mais popular" ou "media de mensagens por conversa" sao rapidas em tabela pequena.

**Fase 2 (Escala):** Materialized views para dashboards.

```sql
-- Exemplo: View materializada para dashboard de minds
CREATE MATERIALIZED VIEW mv_mind_stats AS
SELECT
    m.id,
    m.name,
    m.total_conversations,
    m.total_messages,
    COUNT(DISTINCT c.user_id) as unique_users,
    AVG(c.message_count) as avg_messages_per_conversation,
    AVG(c.total_tokens_used) as avg_tokens_per_conversation,
    MAX(c.last_message_at) as last_activity
FROM minds m
LEFT JOIN conversations c ON c.mind_id = m.id
GROUP BY m.id, m.name, m.total_conversations, m.total_messages;

-- Refresh via cron (pg_cron ou Edge Function)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mind_stats;
```

**Por que nao materialized views desde o inicio:**
- Adiciona complexidade de manutencao (refresh scheduling).
- Os counter caches em `minds` e `conversations` ja fornecem os dados mais frequentes em tempo real.
- Materialized views so compensam quando as queries base ficam lentas (> 100K events).

---

## 6. Estimativa de Esforco

### 6.1 Implementacao da Arquitetura de Dados

| Tarefa | Horas | Dependencias | Complexidade |
|--------|-------|-------------|-------------|
| Setup Supabase project + connection | 1-2 | Nenhuma | Baixa |
| Schema creation (migrations) | 3-4 | Setup | Media |
| Drizzle ORM setup + schema types | 2-3 | Schema | Media |
| RLS policies + testing | 3-4 | Schema | Alta |
| Seed script (manifest -> DB) | 2-3 | Schema + Drizzle | Media |
| File refresh Edge Function (cron) | 4-6 | Schema + Gemini integration | Alta |
| Upload originais para Supabase Storage | 1-2 | Setup | Baixa |
| Supabase Auth integration (Next.js) | 4-6 | Setup | Media |
| Refactor `gemini.ts` para usar DB | 4-6 | Schema + Drizzle + Auth | Alta |
| Conversation persistence (CRUD) | 4-6 | Schema + Auth | Media |
| Analytics events integration | 2-3 | Schema | Baixa |
| Dual-read transition + manifest removal | 2-3 | Tudo acima | Baixa |
| **TOTAL** | **32-48h** | | |

### 6.2 Complexidade Geral

| Dimensao | Score (1-5) | Justificativa |
|----------|-------------|---------------|
| Scope | 4 | 7 tabelas, RLS, triggers, Edge Functions, migracao de dados |
| Integration | 3 | Supabase SDK + Gemini SDK + Next.js Server Actions |
| Infrastructure | 3 | Supabase project, Edge Functions, cron scheduling |
| Knowledge | 2 | Supabase/Postgres sao bem documentados; equipe familiarizada com Next.js |
| Risk | 3 | Migracao de estado efemero para persistente; File URI refresh e ponto critico |
| **Total** | **15** | **Classe STANDARD** |

### 6.3 Dependencias de Outros Debitos

| Este trabalho depende de | Motivo |
|--------------------------|--------|
| SYS-027 (Middleware) | Auth middleware precisa existir para proteger rotas |
| SYS-021 (Refactor gemini.ts) | Separacao de concerns facilita integracao com DB |
| SYS-007 (Graceful env handling) | DB connection string tambem sera env var |

| Este trabalho DESBLOQUEIA | Motivo |
|---------------------------|--------|
| UX-004 (Chat persistence) | DB fornece storage para conversas |
| SYS-002 (Rate limiting persistente) | DB armazena contadores por usuario |
| SYS-010 (File URI renewal) | `mind_files.expires_at` + Edge Function cron |
| CROSS-002 (Auth + Persistence) | Supabase Auth + DB resolvem conjuntamente |
| CROSS-003 (Stateful architecture) | DB e a base para estado |
| CROSS-006 (KB management) | Admin CRUD sobre tabelas `minds` + `mind_files` |
| Feature: Multi-Mind Debates | Supabase Realtime para comunicacao entre sessoes |
| Feature: Mind Memory | `conversations.summary` para recall cross-session |
| Feature: Conversation Sharing | `conversations.is_shared` + `share_slug` |

---

## 7. Recomendacoes Finais

### Ordem de Implementacao Recomendada

| Sprint | Tarefa | Horas | Entrega |
|--------|--------|-------|---------|
| **Sprint 1** | Setup Supabase + Schema + Drizzle + Auth basico | 10-15 | DB operacional, login funcionando |
| **Sprint 2** | Seed script + File refresh cron + Upload Storage | 8-12 | Minds no DB, URIs renovando automaticamente |
| **Sprint 3** | Refactor gemini.ts + Conversation CRUD + Persistence | 10-14 | Chat persistido, historico sobrevive refresh |
| **Sprint 4** | Analytics + RLS fine-tuning + Dual-read removal | 6-8 | Metricas, seguranca hardened, manifest removido |

### Alertas Criticos

1. **Os File URIs atuais estao EXPIRADOS.** A data `2025-12-31` no manifest significa que os 21 arquivos expiraram em `2026-01-02`. O sistema esta 100% inoperante para chat. A re-ingestion e a tarefa mais urgente, mesmo antes do DB setup. Pode ser feita via script CLI como workaround imediato (`npx tsx scripts/ingest_mind.ts "Antonio Napole"`).

2. **Gemini Cached Content API deve ser avaliada ANTES de decidir a estrategia de context injection.** Se usarmos cached content, o fluxo de `gemini.ts` muda drasticamente (cria cache uma vez, referencia em todas as mensagens). Isso impacta o schema (`mind_cached_content_id`?) e o cron de refresh.

3. **Supabase free tier tem limites de Edge Function invocations.** Se o cron de refresh rodar a cada 12h com 21 arquivos, sao ~42 invocacoes/dia. O free tier permite 500K/mes -- confortavel. Mas monitorar se o numero de minds crescer.

---

*Este documento foi gerado como Phase 5 de Brownfield Discovery por @data-engineer (Dara).*
*Ele valida e expande os debitos de dados do Phase 4 DRAFT e propoe a arquitetura completa de dados para o projeto.*

**Proximo passo:**
- **Phase 6:** @ux-design-expert revisa debitos de UX e responde perguntas de design
- **Phase 7:** @qa revisa debitos de qualidade e estabelece estrategia de testes

*Synkra AIOX v2.0*
