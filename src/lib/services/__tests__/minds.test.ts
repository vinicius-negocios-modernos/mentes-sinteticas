import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dbMockModule,
  mockDbSelect,
  resetDbMocks,
} from "../../../../tests/helpers/db-mock";
import type { Mind } from "@/db/schema";

vi.mock("@/db", () => dbMockModule());

// Must import AFTER vi.mock
const { getMindByName, getMindBySlug, listActiveMinds, listActiveMindNames, getMindWithDocuments } =
  await import("@/lib/services/minds");

// ── Fixtures ──────────────────────────────────────────────────────────

const baseMind: Mind = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  slug: "antonio-napole",
  name: "Antonio Napole",
  title: "Renaissance Philosopher",
  era: "15th Century",
  nationality: "Italian",
  systemPrompt: "You are Antonio Napole...",
  personalityTraits: ["curious", "wise"],
  greeting: "Salve, traveler!",
  avatarUrl: "/avatars/antonio.png",
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const secondMind: Mind = {
  ...baseMind,
  id: "660e8400-e29b-41d4-a716-446655440001",
  slug: "ada-lovelace",
  name: "Ada Lovelace",
  title: "Mathematician",
  era: "19th Century",
  nationality: "British",
};

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDbMocks();
});

describe("getMindByName", () => {
  it("returns mind when found", async () => {
    mockDbSelect([baseMind]);

    const result = await getMindByName("Antonio Napole");

    expect(result).toEqual(baseMind);
  });

  it("returns null when mind does not exist", async () => {
    mockDbSelect([]);

    const result = await getMindByName("Nonexistent Mind");

    expect(result).toBeNull();
  });
});

describe("getMindBySlug", () => {
  it("returns mind when slug matches", async () => {
    mockDbSelect([baseMind]);

    const result = await getMindBySlug("antonio-napole");

    expect(result).toEqual(baseMind);
  });

  it("returns null for unknown slug", async () => {
    mockDbSelect([]);

    const result = await getMindBySlug("unknown-slug");

    expect(result).toBeNull();
  });
});

describe("listActiveMinds", () => {
  it("returns list of active minds", async () => {
    mockDbSelect([baseMind, secondMind]);

    const result = await listActiveMinds();

    expect(result).toEqual([baseMind, secondMind]);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no active minds", async () => {
    mockDbSelect([]);

    const result = await listActiveMinds();

    expect(result).toEqual([]);
  });
});

describe("listActiveMindNames", () => {
  it("returns array of mind name strings", async () => {
    mockDbSelect([baseMind, secondMind]);

    const result = await listActiveMindNames();

    expect(result).toEqual(["Antonio Napole", "Ada Lovelace"]);
  });
});

describe("getMindWithDocuments", () => {
  it("returns null when mind not found", async () => {
    mockDbSelect([]);

    const result = await getMindWithDocuments("nonexistent-id");

    expect(result).toBeNull();
  });

  it("returns mind with documents when found", async () => {
    // First select returns mind, second returns documents
    mockDbSelect([baseMind]);

    const result = await getMindWithDocuments(baseMind.id);

    // After first await resolves the mind, the second select uses
    // the same mock — which still returns [baseMind]. This tests
    // the structural flow (mind found → documents fetched).
    expect(result).not.toBeNull();
    expect(result!.mind).toEqual(baseMind);
  });
});
