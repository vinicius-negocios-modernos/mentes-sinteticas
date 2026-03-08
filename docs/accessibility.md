# Acessibilidade — Mentes Sinteticas

Este documento descreve as praticas de acessibilidade implementadas no Mentes Sinteticas, seguindo as diretrizes WCAG 2.1 Level AA.

---

## Conformidade

O Mentes Sinteticas busca conformidade com o **WCAG 2.1 Level AA**. Os seguintes criterios sao atendidos:

| Criterio | Descricao | Status |
|----------|-----------|--------|
| 1.1.1 | Conteudo nao-textual (alt text, aria-hidden em icones decorativos) | Implementado |
| 1.3.1 | Informacao e relacoes (landmarks, headings, roles semanticos) | Implementado |
| 1.3.2 | Sequencia significativa (ordem DOM logica) | Implementado |
| 1.4.1 | Uso de cor (informacoes nao dependem apenas de cor) | Implementado |
| 1.4.3 | Contraste minimo (4.5:1 texto, 3:1 texto grande) | Implementado |
| 1.4.11 | Contraste de componentes nao-textuais (3:1 bordas/icones) | Implementado |
| 2.1.1 | Teclado (todas funcoes acessiveis via teclado) | Implementado |
| 2.4.1 | Ignorar blocos (estrutura de landmarks) | Implementado |
| 2.4.3 | Ordem de foco (sequencia logica de tabulacao) | Implementado |
| 2.4.7 | Foco visivel (focus-visible em todos elementos interativos) | Implementado |
| 2.5.5 | Tamanho do alvo (minimo 44x44px em controles touch) | Implementado |
| 3.1.1 | Idioma da pagina (lang="pt-BR" no html) | Implementado |
| 4.1.2 | Nome, funcao, valor (aria-label, roles, estados) | Implementado |

---

## Navegacao por Teclado

### Geral

| Tecla | Acao |
|-------|------|
| `Tab` / `Shift+Tab` | Navegar entre elementos interativos |
| `Enter` / `Space` | Ativar botoes e links |
| `Escape` | Fechar modais, dialogs, popovers e drawers |

### Chat

| Tecla | Acao |
|-------|------|
| `Enter` | Enviar mensagem (campo de texto) |
| `Shift+Enter` | Nova linha no campo de texto |
| `Tab` | Navegar entre botoes do header, campo de input e controles |
| `Escape` | Fechar drawer de conversas, popover de compartilhamento |

### Debates

| Tecla | Acao |
|-------|------|
| `Tab` | Navegar entre campo de topico, selecao de mentes e botoes |
| `Enter` | Iniciar debate, enviar interjeccao |
| `Escape` | Cancelar interjeccao |
| Setas (`Arrow`) | Navegar dentro de grupos de selecao de mentes |

### Soundscapes (Audio Ambiente)

| Tecla | Acao |
|-------|------|
| `Tab` | Navegar entre controles de volume (sliders) |
| Setas (`Left`/`Right`) | Ajustar volume dos sliders |

### Compartilhamento

| Tecla | Acao |
|-------|------|
| `Enter` | Abrir popover de compartilhamento |
| `Tab` | Navegar entre opcoes dentro do popover |
| `Escape` | Fechar popover |

### Blocos de Codigo

| Tecla | Acao |
|-------|------|
| `Tab` | Acessar botao "Copiar codigo" |
| `Enter` | Copiar codigo para clipboard |

### Onboarding

| Tecla | Acao |
|-------|------|
| `Tab` | Navegar entre indicadores de passo e botoes |
| `Enter` | Avancar passo ou fechar dialog |
| `Escape` | Fechar dialog de onboarding |

---

## Tecnologias Assistivas

### Screen Readers Testados

| Leitor de Tela | Navegador | Plataforma |
|----------------|-----------|------------|
| VoiceOver | Safari | macOS |
| VoiceOver | Chrome | macOS |

### Recursos para Screen Readers

- **Icones decorativos** marcados com `aria-hidden="true"` para nao poluir leitura
- **Regioes dinamicas** com `aria-live="polite"` para anunciar novas mensagens e mudancas de estado
- **Labels descritivos** via `aria-label` em todos botoes de icone (sem texto visivel)
- **Grupos semanticos** com `role="group"` e `aria-labelledby` para agrupamentos logicos
- **Estados interativos** com `aria-expanded`, `aria-busy`, `aria-describedby`
- **Landmarks** semanticos: `<main>`, `<nav>`, `<aside>`, `<header>`
- **Painel de memorias**: secoes com `aria-labelledby`, botoes de exclusao com label contextual
- **Debate**: anuncio de rounds via `aria-label` descritivo, status de streaming via `aria-label` dinamico

---

## Features de Acessibilidade por Funcionalidade

### Temas de Sessao (Story 6.1)

- Temas usam variaveis CSS customizadas que mantem ratios de contraste AA
- Cores de texto e fundo validadas para contraste minimo 4.5:1
- Tema escuro como padrao (melhor legibilidade em ambientes de baixa luz)

### Debates Multi-Mente (Story 6.2)

- Formulario de setup com labels semanticos e `aria-describedby` para contagem de caracteres
- Selecao de mentes como `role="group"` com `aria-label` por mente
- Estado de carregamento anunciado via `aria-busy="true"`
- Mensagens do debate em regiao `aria-live="polite"`
- Controles de debate com `aria-label` contextual (proximo turno, pausar, interjeccao)
- `aria-expanded` no botao de interjeccao

### Memoria de Mentes (Story 6.3)

- Painel de memorias com `aria-label` no botao de toggle
- Categorias organizadas como `<section>` com `aria-labelledby`
- Botoes de exclusao com `aria-label` descritivo incluindo trecho do conteudo
- Estados de carregamento e vazio comunicados em regiao `aria-live`

### Formatacao Rica (Story 6.4)

- Blocos de codigo com botao "Copiar" acessivel por teclado
- Mensagens collapsiveis com `aria-expanded` e `role="button"`
- Conteudo matematico (KaTeX) renderizado como elementos inline acessiveis

### Perfis de Mentes (Story 6.5)

- Estrutura semantica com headings hierarquicos
- Breadcrumb navigation com `aria-current="page"`
- Conversation starters como lista com `aria-label` descritivo por item
- Knowledge sources organizados como secoes com heading

### Compartilhamento (Story 6.6)

- Popover de compartilhamento acessivel via teclado
- Botoes com labels descritivos (copiar link, revogar acesso)
- Confirmacoes de acao anunciadas para screen readers

### Modo de Voz (Story 6.7)

- Botoes de gravacao e reproducao com `aria-label`
- Status de gravacao/reproducao comunicado para screen readers
- Fallback textual quando Web Speech API nao esta disponivel

### Soundscapes (Story 6.8)

- Sliders de volume com `aria-label` e `aria-valuetext`
- Respeita `prefers-reduced-motion`: audio automaticamente silenciado quando ativo
- Mensagem informativa exibida ao usuario sobre silenciamento por acessibilidade
- Botao de unmute manual disponivel

### PWA / Offline (Story 6.10)

- Indicador de status offline com `role` e `aria-label` semanticos
- Pagina offline com estrutura acessivel e botao de retry
- Icones decorativos marcados com `aria-hidden`

---

## Preferencias do Sistema

### `prefers-reduced-motion`

Todas as animacoes e transicoes respeitam esta preferencia:

- **Animacoes CSS** desativadas via `@media (prefers-reduced-motion: reduce)` — transicoes reduzidas a `0.01ms`
- **Animacao de digitacao** (typing dots) desativada
- **Animacoes de pulso e onda** desativadas
- **Haptic feedback** desativado quando preferencia ativa
- **Soundscapes** iniciam silenciados com mensagem explicativa

### `prefers-color-scheme`

- Tema escuro como padrao da aplicacao
- Meta tags de `theme-color` configuradas para ambos esquemas (dark e light)
- Cores adaptadas via next-themes para transicao entre temas

---

## Limitacoes Conhecidas

| Limitacao | Descricao | Impacto |
|-----------|-----------|---------|
| Skip-to-content | Nao ha link de "pular para conteudo principal" | Usuarios de teclado precisam tabular pelo header |
| Modo de Voz — feedback visual | O modo de voz depende da Web Speech API nativa, que nao oferece feedback textual em tempo real durante reconhecimento | Usuarios de screen reader podem preferir digitacao |
| Soundscapes — controle fino | Controles de volume individuais por camada de audio podem ser complexos para navegacao por teclado | Muitos Tab stops quando multiplos sliders ativos |
| Testes com NVDA/JAWS | Apenas VoiceOver (macOS) foi testado | Comportamento pode variar em Windows |
| Testes mobile | VoiceOver iOS e TalkBack Android nao foram testados sistematicamente | Experiencia mobile com screen reader pode ter lacunas |
| Conteudo matematico | Formulas KaTeX podem nao ser totalmente legiveis por screen readers | Representacao textual alternativa limitada |
| Drag and drop | Nenhuma funcionalidade usa drag and drop | Nenhum impacto |

---

## Reportar Problemas de Acessibilidade

Se voce encontrar barreiras de acessibilidade no Mentes Sinteticas, por favor reporte:

1. **GitHub Issues**: Abra uma issue no repositorio com a label `accessibility`
   - URL: https://github.com/vinicius-negocios-modernos/mentes-sinteticas/issues
   - Use o titulo: `[A11y] Descricao breve do problema`

2. **Informacoes uteis no reporte**:
   - Descricao do problema encontrado
   - Pagina ou funcionalidade afetada
   - Tecnologia assistiva utilizada (ex: VoiceOver, leitor de tela, navegacao por teclado)
   - Navegador e versao
   - Sistema operacional
   - Passos para reproduzir o problema

3. **Prazo de resposta**: Issues de acessibilidade sao tratadas com prioridade alta e triadas em ate 5 dias uteis.

---

*Ultima atualizacao: Marco 2026 — Fase 6 (Story 6.9 A11y Pass 2)*
