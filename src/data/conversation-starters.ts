/**
 * Hardcoded conversation starters per mind slug.
 *
 * Each mind has 3-5 contextual prompt suggestions displayed
 * on the mind profile page. Clicking a starter redirects
 * to `/chat/{slug}?prompt={encodedPrompt}`.
 *
 * Future: migrate to a DB field `suggestedPrompts` on the minds table.
 */

export interface ConversationStarter {
  /** The prompt text displayed as a clickable card */
  text: string;
}

export const conversationStarters: Record<string, ConversationStarter[]> = {
  "antonio-napole": [
    { text: "Qual sua visao sobre lideranca moderna?" },
    { text: "Como construir uma cultura empresarial forte?" },
    { text: "Quais estrategias de crescimento voce recomenda?" },
    { text: "Como desenvolver resiliencia nos negocios?" },
    { text: "O que diferencia um lider de um gestor?" },
  ],
  "ali-abdaal": [
    { text: "Como ser mais produtivo sem burnout?" },
    { text: "Quais ferramentas voce usa para criar conteudo?" },
    { text: "Como comecar um canal no YouTube?" },
    { text: "Qual sua filosofia sobre work-life balance?" },
    { text: "Como construir um segundo cerebro digital?" },
  ],
};

/**
 * Get conversation starters for a mind by slug.
 * Returns an empty array if no starters are configured.
 */
export function getConversationStarters(
  slug: string
): ConversationStarter[] {
  return conversationStarters[slug] ?? [];
}
