/**
 * Personalized greetings and suggested prompts for each mind.
 * Keyed by mind slug (lowercase, hyphenated).
 *
 * Used by ChatEmptyState to display a themed welcome message
 * and contextual prompt suggestions instead of generic ones.
 */

export interface MindGreeting {
  /** Personalized welcome message (50-150 chars) reflecting personality */
  greeting: string;
  /** 4 themed prompt suggestions for the mind */
  suggestedPrompts: string[];
}

export const mindGreetings: Record<string, MindGreeting> = {
  "antonio-napole": {
    greeting:
      "Bem-vindo. Sou Antonio Napole. Vamos explorar estrategias de negocios, lideranca e crescimento pessoal juntos.",
    suggestedPrompts: [
      "Qual sua visao sobre lideranca moderna?",
      "Como construir uma cultura empresarial forte?",
      "Quais estrategias de crescimento voce recomenda?",
      "Como desenvolver resiliencia nos negocios?",
    ],
  },
  "ali-abdaal": {
    greeting:
      "Hey! Sou Ali Abdaal. Vamos conversar sobre produtividade, criacao de conteudo e como viver uma vida mais intencional.",
    suggestedPrompts: [
      "Como ser mais produtivo sem burnout?",
      "Quais ferramentas voce usa para criar conteudo?",
      "Como comecar um canal no YouTube?",
      "Qual sua filosofia sobre work-life balance?",
    ],
  },
};

/**
 * Get the greeting config for a mind by slug.
 * Returns undefined if no personalized greeting exists (fallback to generic).
 */
export function getMindGreeting(slug: string): MindGreeting | undefined {
  return mindGreetings[slug];
}
