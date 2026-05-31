# 📊 Relatório de Débito Técnico — Mentes Sintéticas
**Data:** 2026-05-30 | **Versão:** 1.0

> Relatório executivo para stakeholders. Traduz o assessment técnico (49 débitos) em custo, risco e impacto de negócio. Linguagem de negócio, sem jargão técnico.
> **Fonte técnica:** `docs/prd/technical-debt-assessment.md` (Fase 8, gate APPROVED).
> **Substitui:** a versão de 2026-03-06 deste relatório (predatava o assessment final — inputs desalinhados).

---

## 🎯 Executive Summary

O **Mentes Sintéticas está no ar e funcionando em produção** (https://mentes.negociosmodernos.cloud). O diagnóstico técnico completo confirma a boa notícia primeiro: a fundação do produto é **sólida e bem-arquitetada** — a organização do código e o tratamento de erros são pontos fortes que devem ser preservados, não reescritos. Não estamos diante de um produto quebrado nem de uma reescrita. Estamos diante de um produto saudável com uma **lista de pendências técnicas mapeada, priorizada e gerenciável**.

O diagnóstico identificou **49 pendências técnicas**. A grande maioria é de baixa ou média prioridade — itens de higiene, melhorias de manutenção e polimento. Mas há **quatro pontos de atenção reais que merecem ação no curto prazo**: (1) há **falhas de segurança conhecidas e já publicadas** em duas peças centrais do sistema (o componente que conversa com o banco de dados e o framework do site), com correção barata e disponível; (2) o **mecanismo que alimenta a inteligência das mentes com conhecimento** (o pipeline Gemini) é hoje frágil e pode falhar silenciosamente, sem avisar ninguém; (3) **uma única falha crítica no banco de dados** é a causa-raiz de problemas de cache que já foram observados em produção; e (4) a rota de cadastro de novos usuários não valida o que recebe — uma porta de entrada pública sem porteiro.

O ponto mais importante: **a falha crítica única já está se manifestando em produção** (perda de cache de conhecimento do Gemini), e as falhas de segurança são de correção barata mas de consequência alta caso exploradas. Nada disso é uma emergência de "tirar o site do ar", mas são itens que ficam **mais caros e mais arriscados quanto mais tempo permanecem abertos**. A boa notícia é que os itens mais consequentes também estão entre os **mais baratos de resolver**.

### Números-chave

| Métrica | Valor |
|---------|-------|
| Total de pendências técnicas | **49** |
| Críticas (🔴) | **1** (já se manifestando em produção) |
| Altas (🟠) | **11** |
| Médias (🟡) | **22** |
| Baixas (🟢) | **15** |
| Esforço total estimado | **~135 a 165 horas** de engenharia |
| Custo total para resolver tudo | **R$ 20.250 a R$ 24.750** (a R$150/h) |
| Custo da **Fase 1** (segurança + quick wins) | **~R$ 1.950 a R$ 2.700** |

### Recomendação

**Aprovar a resolução em 3 fases**, começando imediatamente pela **Fase 1 (Quick Wins de segurança)** — o investimento mais barato e de maior retorno do projeto inteiro: por menos de **R$ 3.000** elimina-se as falhas de segurança publicadas e os "constrangimentos visíveis" (promessas de funcionalidade quebradas). As Fases 2 e 3 podem ser agendadas em sprints subsequentes conforme a capacidade da equipe, sem pressa de produção. Não recomendamos resolver tudo de uma vez — recomendamos resolver na **ordem certa**, que protege o produto vivo a cada passo.

---

## 💰 Análise de Custos

### Custo de RESOLVER (a R$150/hora)

| Categoria | Horas | Custo (R$150/h) |
|-----------|-------|-----------------|
| **Sistema** (deploy, segurança, observabilidade, testes) | 42–43h | R$ 6.300 – R$ 6.450 |
| **Database** (integridade de dados, cache, índices) | ~26,75h | R$ 4.012 |
| **Frontend / Experiência** (design system, acessibilidade, i18n) | 66–96h | R$ 9.900 – R$ 14.400 |
| **TOTAL** | **~135–165h** | **R$ 20.250 – R$ 24.750** |

> A maior fatia de custo (Frontend) **não tem urgência de produção** — é melhoria de consistência visual e acessibilidade, totalmente adiável. Os itens urgentes (segurança + cache + banco) somam uma fração pequena do total.

### Custo de NÃO RESOLVER (risco acumulado)

| Risco | Probabilidade | Impacto | Custo Potencial |
|-------|---------------|---------|-----------------|
| **Invasão por SQL-injection** (falha publicada no componente de banco `drizzle-orm`, com exploit conhecido) | Média — é uma falha pública, em rota de entrada sem validação | Vazamento/corrupção de dados de usuários, perda de confiança, possível obrigação legal (LGPD) | **R$ 50.000+** (resposta a incidente, notificação, reputação) |
| **Perda silenciosa de conhecimento do Gemini** (pipeline de URIs depende de cron sem alarme; já observado falhando) | **Alta** — já se manifestou; é o único item 🔴 Crítico | Mentes respondem sem o conhecimento que as torna úteis; degradação invisível do produto-core, sem ninguém perceber | **R$ 15.000–30.000** (churn de usuários + retrabalho de diagnóstico) |
| **Corrupção de integridade de dados** (5 tabelas sem "trava" de relacionamento no banco; cadastro sem validação) | Média — depende 100% da aplicação acertar sempre | Registros órfãos, dados inconsistentes, billing potencialmente afetado | **R$ 10.000–20.000** (limpeza de dados + perda de confiança em relatórios) |
| **Churn por funcionalidade quebrada** (soundscapes expostos na UI mas não funcionam; claim de acessibilidade não comprovado) | Alta — visível ao usuário hoje | Erosão de confiança no produto; promessa quebrada percebida | **R$ 5.000–10.000** (impacto de imagem, difícil de mensurar) |

> **Leitura honesta:** nenhum desses riscos é certeza de catástrofe — são probabilidades. Mas a **falha do Gemini já aconteceu** e as falhas de segurança são **públicas** (qualquer atacante pode pesquisá-las). O custo de prevenção (< R$ 3.000) é uma fração ínfima do custo de qualquer um desses incidentes se materializar.

---

## 📈 Impacto no Negócio

Este é um produto **funcionando com débito real, porém gerenciável** — não um desastre. Cada eixo abaixo está ancorado em pendências concretas do diagnóstico.

**🚀 Performance.** Impacto baixo hoje, preventivo. Faltam índices em consultas quentes do banco (mensagens, conversas, compartilhamento). Em volume baixo, o usuário não percebe; conforme a base crescer, telas ficarão lentas. Correção barata (~R$ 600) e indolor se feita antes do crescimento.

**🔒 Segurança.** É o eixo de maior atenção. Duas peças centrais têm **falhas de segurança publicadas** (`drizzle-orm` com SQL-injection; `Next.js` com bypass de middleware/CSRF/XSS/DoS). A rota de cadastro — **pública e sem autenticação** — não valida o que recebe. A correção é das mais baratas do projeto (atualizar versões + adicionar validação ≈ R$ 1.000), o que torna **não corrigir** uma decisão difícil de justificar.

**👤 Experiência do Usuário.** Há "constrangimentos visíveis": a funcionalidade de **soundscapes está exposta na interface mas não funciona** (arquivos placeholder), e a documentação afirma um nível de acessibilidade (WCAG AA) que ainda não foi comprovado. Ambos corrigíveis em ~1h cada (desligar a feature + ajustar o texto), removendo promessas quebradas imediatamente.

**🔧 Manutenibilidade.** A maior fatia de horas, sem urgência. O código contorna o sistema de design em 45 arquivos (cores cruas em vez de tokens), tem baixa cobertura de testes de interface (9%) e migrações de banco aplicadas manualmente. Nada disso quebra o produto hoje — mas aumenta o custo e o risco de cada mudança futura. É investimento em velocidade de longo prazo, agendável conforme capacidade.

---

## ⏱️ Timeline Recomendado

As 6 ondas técnicas (W0–W5) consolidam-se em **3 fases de negócio**. A ordem é **não-negociável**: cada fase protege a produção viva e destrava a seguinte.

### Fase 1 — Quick Wins (segurança + correções rápidas) · Ondas W0 + W1
**Duração:** ~1 sprint (1–2 semanas) · **Esforço:** 13–18h · **Custo:** **R$ 1.950 – R$ 2.700**
- Corrige as falhas de segurança publicadas (atualizar `drizzle-orm` e `Next.js`, adicionar verificação automática no CI).
- Desliga a funcionalidade quebrada (soundscapes) e corrige a documentação de acessibilidade.
- Remove configuração morta (resíduos de Supabase/Vercel) e prepara o diagnóstico do banco.
- **ROI imediato:** elimina o risco de segurança e os constrangimentos visíveis pelo menor custo do projeto.

### Fase 2 — Fundação (automação de deploy + blindagem do banco) · Ondas W2 + W3
**Duração:** ~2 sprints (3–4 semanas) · **Esforço:** 25–31h · **Custo:** **R$ 3.750 – R$ 4.650**
- Cria o mecanismo automatizado e seguro para alterar o banco de dados (com backup e rollback) — hoje feito à mão, via acesso manual.
- **Resolve a falha crítica 🔴** que destrava o cache de conhecimento do Gemini.
- Adiciona as "travas" de integridade no banco (relacionamentos, índices, validações) e o teste de fumaça pós-deploy.
- **Esta fase elimina a causa-raiz dos problemas de cache já vistos em produção.**

### Fase 3 — Otimização (resiliência + design system + testes) · Ondas W4 + W5
**Duração:** 3–5 sprints (paralelizável) · **Esforço:** ~78–116h · **Custo:** **R$ 11.700 – R$ 17.400**
- Torna o pipeline de conhecimento do Gemini **auto-curável** (elimina a dependência do cron frágil).
- Formaliza o contrato de segurança (cadastro validado, integridade garantida nas duas pontas).
- Campanha de adoção do design system, validação de acessibilidade, cobertura de testes, centralização de configuração.
- **Sem urgência de produção** — agendável conforme capacidade, em paralelo.

---

## 📊 ROI da Resolução

| Fase | Investimento | Retorno (risco evitado / valor gerado) | ROI estimado |
|------|--------------|----------------------------------------|--------------|
| **Fase 1** (segurança) | ~R$ 2.300 | Evita incidente de segurança (R$ 50k+) + remove churn de imagem | **~20:1** |
| **Fase 2** (fundação) | ~R$ 4.200 | Resolve falha 🔴 já ativa + previne corrupção de dados (R$ 25k+) | **~6:1** |
| **Fase 3** (otimização) | ~R$ 14.500 | Velocidade de entrega futura + resiliência + acessibilidade real | **~2:1** (longo prazo) |
| **TOTAL** | **~R$ 22.500** | **~R$ 100k+ em risco evitado + ganho de velocidade** | **~4:1 a 5:1** |

> **Leitura honesta do ROI:** a Fase 1 tem ROI excepcional (~20:1) porque corrige falhas públicas e ativas por custo mínimo. A Fase 3 tem ROI mais modesto (~2:1) porque é investimento de longo prazo em manutenibilidade, não em risco imediato — e por isso pode esperar. O **ROI consolidado de ~4:1 a 5:1** assume que pelo menos um dos riscos de alto custo (segurança ou perda de conhecimento) seria de outra forma materializado ao longo de 12 meses — premissa conservadora, dado que a falha do Gemini **já ocorreu**.

---

## ✅ Próximos Passos

Checklist para stakeholders:

- [ ] **Aprovar o orçamento da Fase 1** (~R$ 2.300) — decisão de menor risco e maior retorno; recomenda-se aprovação imediata.
- [ ] **Agendar a Fase 1 no próximo sprint** — prioridade sobre features novas, dado o risco de segurança ativo.
- [ ] **Aprovar (em princípio) o orçamento das Fases 2 e 3** (~R$ 18.700) — com agendamento flexível conforme capacidade da equipe.
- [ ] **Validar a ordem não-negociável** com a liderança técnica: segurança → automação de deploy → blindagem do banco → resiliência → polimento. A ordem protege a produção a cada passo.
- [ ] **Definir o épico de execução** com o @pm (Fase 10 do discovery) — converter as 49 pendências em stories acionáveis.
- [ ] **Monitorar o cron do Gemini** enquanto a Fase 3 não chega — é o SPOF que pode falhar silenciosamente; checagem manual periódica do log até a auto-cura.

---

## 📎 Anexos

- **Assessment técnico completo (49 débitos, 6 ondas, gate APPROVED):** [`docs/prd/technical-debt-assessment.md`](../prd/technical-debt-assessment.md)
- **QA review (riscos cruzados: CVEs, SPOF Gemini, validação de signup):** [`docs/reviews/qa-review.md`](../reviews/qa-review.md)
- **Épico de execução (Fase 10 — @pm):** _a ser criado_ → `docs/stories/epics/`
- **Stories acionáveis (derivadas do épico):** _a ser criado_ → `docs/stories/`

---

*Relatório executivo gerado na Fase 9 (Awareness) do Brownfield Discovery por Alex (@analyst). Traduz o assessment técnico finalizado na Fase 8 para linguagem de negócio. Alimenta a decisão de orçamento e priorização dos stakeholders.*
