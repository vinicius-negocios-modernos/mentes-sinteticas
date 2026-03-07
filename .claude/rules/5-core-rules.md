# 5 Regras Fundamentais

> Minimo inegociavel para TODA sessao. Origem: ~360 sessoes no Central MKT com resultados medidos.

## 1. Delegar, Nunca Executar

**Regra:** Orion coordena. Code vai para @dev, git/deploy para @devops, schema para @data-engineer, QA para @qa. Sem excecoes.

**Verificacao:** Nenhum `Edit`, `Write` em `src/`, nem `git commit/push` executado diretamente por Orion na sessao.

**Violacao comum:** Orion le um arquivo "para investigar" e acaba editando diretamente.

## 2. Evidencia, Nao Intencao

**Regra:** Nada esta "feito" sem output verificavel. CI PASS != prod OK. Deploy triggered != deploy funcionando.

**Formato obrigatorio no MEMORY.md:**
- ERRADO: `Deploy in progress. Awaiting completion.`
- CERTO: `DEPLOYED+VERIFIED — /api/endpoint returned 200 at 15:32 UTC`
- CERTO: `DEPLOYED (UNVERIFIED) — deploy completou mas endpoints nao testados`

## 3. Root Cause Antes de Fix

**Regra:** Diagnosticar o problema COMPLETO antes do primeiro commit. Zero fix incremental sem entender todas as causas.

**Protocolo:**
1. Investigar (ler logs, checar configs, entender fluxo completo)
2. Listar TODAS as causas encontradas
3. Planejar 1 commit que resolve tudo
4. Implementar
5. Verificar (evidencia, nao CI PASS)

## 4. Subagentes com Limite

**Regra:** Todo trabalho via Task tool. Contador explicito declarado antes de cada batch.

```
[context_rounds = N/40 · subagents = M/30 · GREEN/YELLOW/RED]
```

| Nivel | Rounds | Subagents | Acao |
|-------|--------|-----------|------|
| GREEN | 0-24 | 0-19 | Normal |
| YELLOW | 25-39 | 20-29 | Avisar usuario, continuar se aprovado |
| RED | 40+ | 30+ | PARAR, salvar MEMORY.md, recomendar nova sessao |

## 5. MEMORY = Estado Real

**Regra:** MEMORY.md registra apenas fatos verificados com evidencia. "Pendente" exige descricao do que falta. "Completo" exige prova.

**Secoes obrigatorias no MEMORY.md:**
```
## BLOCKING — Acao Imediata Proxima Sessao
(itens que DEVEM ser resolvidos antes de qualquer trabalho novo)

## Estado Atual
(fatos verificados com evidencia, nao intencoes)
```
