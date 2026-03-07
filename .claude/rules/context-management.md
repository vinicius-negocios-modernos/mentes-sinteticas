# Context Management — Gestao de Contexto & Subagentes

> Regras para otimizar uso da janela de contexto e subagentes. Origem: ~360 sessoes no Central MKT.

## 1. Orion = Coordenacao SOMENTE

O contexto principal (Orion / AIOX Master) e SOMENTE para:
- Greeting e status updates
- Receber comandos do usuario
- Delegar a agentes AIOX via `Task` tool
- Resumos breves de resultados (max 10 linhas por subagente)
- Coordenar entre outputs de subagentes

Orion NUNCA: edita codigo de aplicacao, roda implementacoes, faz git commit/push.

## 2. Micro-Task Decomposition

**NUNCA atribuir tasks grandes a um unico subagente. Sempre decompor em micro-tasks atomicas.**

- 1 subagente = 1 arquivo ou 1 concern
- Target: uso de contexto do subagente abaixo de 50% do limite
- Output maximo: 40 linhas por subagente
- Max 5 subagentes por batch paralelo

**Sinais de que a task e grande demais para 1 subagente:**
- Envolve mais de 3-4 arquivos
- Requer ler mais de ~500 linhas de codigo
- Tem multiplas subtasks independentes
- Precisaria de mais de 10-15 tool calls

## 3. Consolidation Rule

Quando 4+ subagentes retornam resultados que precisam de merge/analise:
- Delegar consolidacao a um **subagente consolidador** (model haiku)
- O subagente recebe todos os outputs raw e retorna resumo compacto (max 30 linhas)
- NUNCA construir tabelas ou merge de findings de 4+ subagentes diretamente no contexto principal
- Para 1-3 resultados: resumo inline breve e permitido (max 10 linhas cada)

## 4. Model Selection

**SOMENTE usar `opus` ou `haiku`. NUNCA usar `sonnet`.**

`opus` e `haiku` sao valores para o parametro **`model`** do Task tool, NAO para `subagent_type`.

```javascript
// CORRETO:
Task(subagent_type="general-purpose", model="opus", prompt="You are Dex (@dev)...")

// ERRADO — vai dar erro:
Task(subagent_type="opus", prompt="...")
```

| Tipo de Task | Model | Razao |
|-------------|-------|-------|
| Decisoes de arquitetura | opus | Requer raciocinio profundo |
| Implementacao de codigo | opus | Qualidade critica |
| Code review | opus | Analise aprofundada |
| Story/doc creation | opus | Criativo + estruturado |
| Scope research / planejamento | opus | Requer julgamento |
| File existence checks | haiku | Check binario simples |
| Pattern searching | haiku | Matching simples |
| Status reporting | haiku | Agregacao apenas |
| Consolidacao de resultados | haiku | Merge + formato apenas |
| MEMORY.md updates | haiku | Merge estruturado |

**Heuristica:** Se requer julgamento, criatividade ou raciocinio complexo -> opus. Se e mecanico, repetitivo ou simples -> haiku.

## 5. Context Counter Protocol

O agente DEVE manter um contador explicito chamado `context_rounds` que comeca em 0.

**Regras de contagem:**
- +1 para cada mensagem do usuario processada
- +1 para cada subagente LANCADO (contado individualmente, nao por batch)
- +2 para cada resultado de subagente grande (100+ linhas)
- +1 para cada arquivo lido diretamente no contexto principal
- +1 para cada tool call direta no contexto principal (exceto trivial git status/log)

**MEMORY.md save policy:** MEMORY.md e atualizado SOMENTE no threshold RED ou evento /compact. NUNCA antes.

## 6. /compact ou System Compression

Se /compact e acionado ou o sistema comprime mensagens automaticamente:
1. Este e um SINAL CRITICO — contexto genuinamente proximo do esgotamento
2. Completar 1 subagente em andamento (NAO lancar novos)
3. Lancar UM subagente haiku para salvar MEMORY.md
4. Apresentar status claro ao usuario: o que foi feito, o que resta
5. Criar plano para proxima sessao
6. Continuar SOMENTE se usuario pedir explicitamente (1 subagente por vez)

## 7. Subagent Prompt Quality

Todo prompt de subagente DEVE incluir:
1. **Identidade do agente AIOX** — "You are Dex (@dev), the AIOX Development Agent."
2. **Boundary constraints** — O que o agente PODE e NAO PODE fazer
3. **Objetivo claro** — O que exatamente realizar
4. **Contexto completo** — Toda info relevante (nao referenciar "a conversa acima")
5. **Arquivos especificos** — Paths exatos para ler/escrever
6. **Output esperado** — O que retornar ao contexto principal
7. **Constraints** — O que NAO fazer
8. **Limite de output** — "Return max N lines" (default: 40 linhas)

## 8. Skill Tool vs Task Tool

| Cenario | Mecanismo |
|---------|-----------|
| Usuario digita `@dev` | Skill tool (carrega persona completa) |
| Orion delega implementacao ao @dev | Task tool (com identidade Dex no prompt) |
| Orion precisa consolidar resultados | Task tool (haiku, sem identidade especifica) |

**NUNCA usar Skill tool para delegar trabalho a partir de Orion.** Skill substitui a persona atual — Orion perderia controle da orquestracao.

## 9. Memory Protection

### Max 1 Subagente Node.js Pesado por Vez

**Comandos Node.js pesados:**
- `npm test` / `jest` / `vitest`
- `npm run build` / `next build`
- `npm run lint` / `eslint`
- `npm run typecheck` / `tsc`

**Regra:** No maximo 1 subagente executando qualquer comando da lista acima em qualquer momento.

**Permitido em paralelo:** Subagentes que fazem APENAS leitura de arquivos (Read, Glob, Grep), git status/log/diff, ou analise textual.

### QA Gates SEMPRE Serializados

NUNCA rodar quality gates de 2+ stories em paralelo.

### Verificacao Pre-Lancamento

Antes de lancar QUALQUER subagente que executa comandos Node.js:

```
[memory_check: heavy_node_running = YES/NO · safe_to_launch = YES/NO]
```
