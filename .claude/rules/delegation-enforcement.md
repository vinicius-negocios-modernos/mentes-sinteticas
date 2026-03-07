# Delegation Enforcement — Regras de Delegacao Obrigatoria

> Quando delegar vs executar direto, templates de prompt, anti-patterns. Origem: ~360 sessoes no Central MKT.

## 1. Regra: 2+ Tool Calls = Delegar

**Se uma tarefa requer 2 ou mais tool calls, ela DEVE ser delegada a um subagente.**

Orion so executa diretamente:
- 1 Read (arquivo pequeno, para coordenacao)
- 1 `git status` / `git log` / `git branch`
- 1 Grep/Glob (busca rapida para decidir delegacao)

Qualquer coisa alem disso -> Task tool com AIOX agent identity.

## 2. Decision Matrix: Delegar ou Direto?

| Cenario | Tool Calls | Delegar? | Agent | Model |
|---------|-----------|----------|-------|-------|
| Ler 1 story para decidir proximo passo | 1 Read | NAO | — | — |
| Ler story + implementar task | 3+ | SIM | @dev | opus |
| Verificar PR status | 2-3 gh calls | SIM | @devops | haiku |
| Pesquisar padrao no codigo | 3+ Grep/Read | SIM | @dev | haiku |
| Criar story completa | 5+ Read/Write | SIM | @sm | opus |
| Rodar testes + lint | 2+ Bash | SIM | @qa | opus |
| Commit + push + PR | 3+ git/gh | SIM | @devops | opus |
| Ler MEMORY.md | 1 Read | NAO | — | — |
| git status | 1 Bash | NAO | — | — |
| Editar rules file (AIOX framework) | 1-2 Edit | NAO (dominio Orion) | — | — |

## 3. The Read-to-Edit Trap

**Anti-pattern:** Orion le um arquivo "para preparar o edit", depois edita diretamente. Isso burla agent boundaries disfarcando implementacao como "investigacao".

**Regra:** Se ler um arquivo e pre-requisito para edita-lo, a sequencia INTEIRA (read -> analyze -> edit -> verify) pertence ao agente responsavel. Orion NAO participa de nenhuma etapa.

**Teste:** Antes de chamar `Read` em qualquer arquivo, perguntar: "Vou (Orion) precisar editar este arquivo?" Se SIM -> delegar a task inteira ao agente responsavel. Se NAO (info pura de coordenacao) -> prosseguir.

## 4. AIOX Agent -> subagent_type Mapping

| AIOX Agent | subagent_type | model |
|------------|--------------|-------|
| @dev (Dex) | `general-purpose` | `opus` |
| @qa (Quinn) | `general-purpose` | `opus` |
| @architect (Aria) | `general-purpose` | `opus` |
| @devops (Gage) | `general-purpose` | `opus` |
| @data-engineer (Dara) | `general-purpose` | `opus` |
| @pm (Morgan) | `general-purpose` | `opus` |
| @sm (River) | `general-purpose` | `opus` |
| @po (Pax) | `general-purpose` | `opus` |
| @analyst (Alex) | `general-purpose` | `opus` |
| @ux-design-expert (Uma) | `general-purpose` | `opus` |

Para tasks mecanicas/simples dentro de qualquer agente: usar `model="haiku"`.

## 5. Templates de Prompt para Subagentes

### Quick Research (haiku)
```
You are Dex (@dev), the AIOX Development Agent.
BOUNDARIES: Read-only. Do NOT edit any files.
TASK: Find {WHAT} in the codebase.
CONTEXT: {WHY_NEEDED}
OUTPUT: File path(s) + 5-line summary of findings. Max 20 lines.
```

### Implement Task (opus)
```
You are Dex (@dev), the AIOX Development Agent.
BOUNDARIES: Write app code in src/. No git commit/push (-> @devops). No schema changes (-> @data-engineer).
TASK: {TASK_DESCRIPTION}
STORY: {STORY_ID} — Task {TASK_NUMBER}
FILES: {EXACT_PATHS}
CONTEXT: {RELEVANT_CONTEXT}
OUTPUT: Summary of changes made + any issues found. Max 40 lines.
```

### Git Operations (haiku or opus)
```
You are Gage (@devops), the AIOX DevOps Agent.
BOUNDARIES: Git commit/push, gh pr create/merge, CI/CD. No app code changes.
TASK: {GIT_OPERATION}
CONTEXT: {WHAT_CHANGED_AND_WHY}
OUTPUT: Command outputs + confirmation. Max 20 lines.
```

### QA Gate (opus)
```
You are Quinn (@qa), the AIOX QA Agent.
BOUNDARIES: Run tests, lint, typecheck. Make PASS/FAIL decisions. No code changes.
TASK: Run QA gate for Story {STORY_ID}.
CONTEXT: {WHAT_WAS_IMPLEMENTED}
CONSTRAINTS: Run sequentially (memory protection rule). --maxWorkers=2.
OUTPUT: PASS or FAIL + issues list. Max 30 lines.
```

### Story/Doc Creation (opus)
```
You are River (@sm), the AIOX Scrum Master.
BOUNDARIES: Create/edit story files in docs/stories/. No app code.
TASK: Create story {STORY_ID} from epic context.
FILES: {EPIC_FILE}, {TEMPLATE_PATH}
CONTEXT: {EPIC_CONTEXT}
OUTPUT: Story file content. Max 80 lines.
```

### Codebase Exploration (haiku)
```
You are Dex (@dev), the AIOX Development Agent.
BOUNDARIES: Read-only. Do NOT edit any files.
TASK: Explore {MODULE/AREA} and map its structure.
CONTEXT: {WHY_EXPLORING}
OUTPUT: File tree + key patterns + entry points. Max 30 lines.
```

### MEMORY.md Update (haiku)
```
You are a consolidation agent.
TASK: Update MEMORY.md with session progress.
CURRENT_MEMORY: {PASTE_CURRENT_RELEVANT_SECTION}
NEW_FACTS: {LIST_OF_VERIFIED_FACTS}
OUTPUT: Updated MEMORY.md content for the changed sections only. Max 50 lines.
```

## 6. Parallel Batching Patterns

### Story Implementation (tipico)
```
Phase 1 — Research (parallel, haiku):
  Agent A: Explore module structure
  Agent B: Read story + extract tasks
  Agent C: Check current branch/PR status

Phase 2 — Implement (parallel, opus):
  Agent D: Implement task 1 (file A)
  Agent E: Implement task 2 (file B)
  Agent F: Implement task 3 (file C)

Phase 3 — Validate (serial, opus — memory protection):
  Agent G: QA gate (tests + lint + typecheck)

Phase 4 — Ship (serial, opus):
  Agent H: Commit + push + PR
```

### Bug Fix (tipico)
```
Phase 1 — Diagnose (parallel, haiku):
  Agent A: Search for error pattern in codebase
  Agent B: Read relevant logs/config

Phase 2 — Fix (serial, opus):
  Agent C: Implement fix (read + analyze + edit + verify)

Phase 3 — Validate + Ship (serial):
  Agent D: QA gate
  Agent E: Commit + push
```

## 7. Anti-Patterns

### 7.1 Read-to-Edit Trap
```
ERRADO: Orion Read(file) -> Orion Edit(file)
CERTO:  Orion -> Task(@dev, "Read + Edit file")
```

### 7.2 Multi-Grep Investigation
```
ERRADO: Orion Grep(p1) -> Orion Grep(p2) -> Orion Read(result) -> Orion analisa
CERTO:  Orion -> Task(@dev/haiku, "Find pattern and analyze")
```

### 7.3 Sequential Git Commands
```
ERRADO: Orion git add -> Orion git commit -> Orion git push
CERTO:  Orion -> Task(@devops, "Commit and push changes")
```

### 7.4 Story Read + Implementation Plan
```
ERRADO: Orion Read(story) -> analisa -> planeja -> Read(code) -> ...
CERTO:  Orion Read(story) [1 read for coordination] -> Task(@dev, "Implement story tasks")
```

### 7.5 Parallel Node.js Heavy Tasks
```
ERRADO: Agent A (npm test) + Agent B (npm run lint) + Agent C (npm run typecheck) em paralelo
CERTO:  Agent A (npm test) -> completar -> Agent B (lint) -> completar -> Agent C (typecheck)
```

### 7.6 Consolidacao no Contexto Principal
```
ERRADO: Receber 5 resultados de subagentes -> Orion constroi tabela comparativa
CERTO:  Receber 5 resultados -> Task(haiku, "Consolidate these 5 results into max 30 lines")
```
