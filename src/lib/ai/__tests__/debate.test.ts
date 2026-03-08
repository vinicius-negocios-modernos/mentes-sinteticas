import { describe, it, expect } from "vitest";
import {
  buildDebatePromptAddon,
  buildDebateSystemPrompt,
  getNextParticipant,
  isDebateComplete,
  getCurrentRound,
} from "@/lib/ai/debate";
import type { DebateParticipantInfo } from "@/lib/types";

const PARTICIPANTS: DebateParticipantInfo[] = [
  { mindId: "1", mindName: "Socrates", mindSlug: "socrates", turnOrder: 0 },
  { mindId: "2", mindName: "Nietzsche", mindSlug: "nietzsche", turnOrder: 1 },
  { mindId: "3", mindName: "Maquiavel", mindSlug: "maquiavel", turnOrder: 2 },
];

describe("buildDebatePromptAddon", () => {
  it("includes the debate topic", () => {
    const addon = buildDebatePromptAddon(
      "Etica na IA",
      ["Socrates", "Nietzsche"],
      "Socrates"
    );
    expect(addon).toContain("Etica na IA");
  });

  it("lists other participants excluding current mind", () => {
    const addon = buildDebatePromptAddon(
      "Tema",
      ["Socrates", "Nietzsche", "Maquiavel"],
      "Socrates"
    );
    expect(addon).toContain("Nietzsche");
    expect(addon).toContain("Maquiavel");
    expect(addon).not.toContain("Outros participantes: Socrates");
  });

  it("includes the 300-word limit instruction", () => {
    const addon = buildDebatePromptAddon("Tema", ["A", "B"], "A");
    expect(addon).toContain("300 palavras");
  });
});

describe("buildDebateSystemPrompt", () => {
  it("includes the base mind persona", () => {
    const prompt = buildDebateSystemPrompt(
      "Socrates",
      "Etica",
      ["Socrates", "Nietzsche"]
    );
    expect(prompt).toContain("digital clone of Socrates");
  });

  it("appends the debate addon", () => {
    const prompt = buildDebateSystemPrompt(
      "Socrates",
      "Etica",
      ["Socrates", "Nietzsche"]
    );
    expect(prompt).toContain("debate sobre");
    expect(prompt).toContain("Etica");
  });
});

describe("getNextParticipant", () => {
  it("returns first participant on turn 0", () => {
    const next = getNextParticipant(PARTICIPANTS, 0);
    expect(next.mindSlug).toBe("socrates");
  });

  it("returns second participant on turn 1", () => {
    const next = getNextParticipant(PARTICIPANTS, 1);
    expect(next.mindSlug).toBe("nietzsche");
  });

  it("returns third participant on turn 2", () => {
    const next = getNextParticipant(PARTICIPANTS, 2);
    expect(next.mindSlug).toBe("maquiavel");
  });

  it("wraps around to first participant on turn 3 (round 2)", () => {
    const next = getNextParticipant(PARTICIPANTS, 3);
    expect(next.mindSlug).toBe("socrates");
  });

  it("handles 2-participant debates correctly", () => {
    const two = PARTICIPANTS.slice(0, 2);
    expect(getNextParticipant(two, 0).mindSlug).toBe("socrates");
    expect(getNextParticipant(two, 1).mindSlug).toBe("nietzsche");
    expect(getNextParticipant(two, 2).mindSlug).toBe("socrates");
    expect(getNextParticipant(two, 3).mindSlug).toBe("nietzsche");
  });

  it("sorts by turnOrder regardless of input order", () => {
    const shuffled = [PARTICIPANTS[2], PARTICIPANTS[0], PARTICIPANTS[1]];
    expect(getNextParticipant(shuffled, 0).mindSlug).toBe("socrates");
    expect(getNextParticipant(shuffled, 1).mindSlug).toBe("nietzsche");
    expect(getNextParticipant(shuffled, 2).mindSlug).toBe("maquiavel");
  });
});

describe("isDebateComplete", () => {
  it("returns false when turns remaining", () => {
    expect(isDebateComplete(5, 3, 5)).toBe(false);
  });

  it("returns true when all rounds complete", () => {
    // 3 participants x 5 rounds = 15 turns
    expect(isDebateComplete(15, 3, 5)).toBe(true);
  });

  it("returns true when turns exceed max", () => {
    expect(isDebateComplete(16, 3, 5)).toBe(true);
  });

  it("returns false at start", () => {
    expect(isDebateComplete(0, 3, 5)).toBe(false);
  });

  it("returns true at exact boundary for 2 participants", () => {
    // 2 participants x 5 rounds = 10 turns
    expect(isDebateComplete(10, 2, 5)).toBe(true);
    expect(isDebateComplete(9, 2, 5)).toBe(false);
  });
});

describe("getCurrentRound", () => {
  it("returns 0 at the start", () => {
    expect(getCurrentRound(0, 3)).toBe(0);
  });

  it("returns 0 during first round", () => {
    expect(getCurrentRound(2, 3)).toBe(0);
  });

  it("returns 1 after first round completes", () => {
    expect(getCurrentRound(3, 3)).toBe(1);
  });

  it("returns correct round for 2 participants", () => {
    expect(getCurrentRound(0, 2)).toBe(0);
    expect(getCurrentRound(1, 2)).toBe(0);
    expect(getCurrentRound(2, 2)).toBe(1);
    expect(getCurrentRound(4, 2)).toBe(2);
  });
});
