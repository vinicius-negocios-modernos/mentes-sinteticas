/**
 * Soundscape configuration — maps each mind to its ambient audio.
 *
 * Each mind has a unique soundscape inspired by its era and personality.
 * Audio files are served from `public/audio/soundscapes/`.
 *
 * @module soundscape-config
 */

export interface SoundscapeConfig {
  /** Mind slug identifier */
  mindId: string;
  /** Path to WebM (Opus) audio file — primary format */
  audioSrc: string;
  /** Path to MP3 fallback audio file */
  audioSrcFallback: string;
  /** Human-readable name of the soundscape */
  displayName: string;
  /** Brief description of the ambient environment */
  description: string;
}

/**
 * Soundscape configurations keyed by mind slug.
 *
 * Audio rationale:
 * - Aristoteles: Ancient Greece — gentle winds, distant lyre, marble echoes
 * - Da Vinci: Renaissance workshop — crackling fire, quill scratching, distant bells
 * - Tesla: Laboratory — electric hum, coil sparks, rain on windows
 * - Curie: Research lab — bubbling flasks, ticking clock, gentle breeze
 * - Hypatia: Ancient library — turning pages, soft fountain, night insects
 * - Turing: Computing room — mechanical clicks, typewriter, radio static
 */
export const soundscapeConfigs: Record<string, SoundscapeConfig> = {
  aristoteles: {
    mindId: "aristoteles",
    audioSrc: "/audio/soundscapes/aristoteles.webm",
    audioSrcFallback: "/audio/soundscapes/aristoteles.mp3",
    displayName: "Grecia Antiga",
    description: "Ventos suaves, lira distante, ecos em saloes de marmore",
  },
  "da-vinci": {
    mindId: "da-vinci",
    audioSrc: "/audio/soundscapes/da-vinci.webm",
    audioSrcFallback: "/audio/soundscapes/da-vinci.mp3",
    displayName: "Oficina Renascentista",
    description: "Fogo crepitando, pena riscando, sinos de igreja distantes",
  },
  tesla: {
    mindId: "tesla",
    audioSrc: "/audio/soundscapes/tesla.webm",
    audioSrcFallback: "/audio/soundscapes/tesla.mp3",
    displayName: "Laboratorio Eletrico",
    description: "Zumbido eletrico, faiscas de bobina, chuva na janela",
  },
  curie: {
    mindId: "curie",
    audioSrc: "/audio/soundscapes/curie.webm",
    audioSrcFallback: "/audio/soundscapes/curie.mp3",
    displayName: "Laboratorio de Pesquisa",
    description: "Frascos borbulhando, relogio tiquetaqueando, vento suave",
  },
  hypatia: {
    mindId: "hypatia",
    audioSrc: "/audio/soundscapes/hypatia.webm",
    audioSrcFallback: "/audio/soundscapes/hypatia.mp3",
    displayName: "Biblioteca Antiga",
    description: "Paginas virando, fonte suave, insetos noturnos",
  },
  turing: {
    mindId: "turing",
    audioSrc: "/audio/soundscapes/turing.webm",
    audioSrcFallback: "/audio/soundscapes/turing.mp3",
    displayName: "Sala de Computacao",
    description: "Cliques mecanicos, maquina de escrever, estatica de radio",
  },
};

/**
 * Get soundscape config for a mind by slug.
 * Returns `undefined` if the slug has no soundscape configured.
 */
export function getSoundscapeConfig(
  mindSlug: string
): SoundscapeConfig | undefined {
  return soundscapeConfigs[mindSlug];
}

/** All available mind slugs with soundscapes */
export const soundscapeSlugs = Object.keys(soundscapeConfigs);
