import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  dbMockModule,
  mockDb,
  mockDbInsert,
  mockDbSelect,
  mockDbUpdate,
  mockDbDelete,
  resetDbMocks,
} from "../../../../tests/helpers";

vi.mock("@/db", () => dbMockModule());

// Must import AFTER vi.mock so the mock is active
import {
  createConversation,
  getConversationById,
  listByUser,
  touchConversation,
  deleteConversation,
  updateTitle,
} from "@/lib/services/conversations";

// ── Fixtures ─────────────────────────────────────────────────────────

const USER_ID = "user-aaa-111";
const OTHER_USER_ID = "user-bbb-222";
const MIND_ID = "mind-ccc-333";
const CONV_ID = "conv-ddd-444";

const now = new Date("2026-03-07T12:00:00Z");

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: CONV_ID,
    userId: USER_ID,
    mindId: MIND_ID,
    title: "Test Conversation",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("conversations service", () => {
  beforeEach(() => {
    resetDbMocks();
  });

  // ── createConversation ───────────────────────────────────────────

  describe("createConversation", () => {
    it("inserts and returns the new conversation", async () => {
      const expected = makeConversation();
      mockDbInsert([expected]);

      const result = await createConversation(USER_ID, MIND_ID, "Test Conversation");

      expect(result).toEqual(expected);
      expect(mockDb.insert).toHaveBeenCalledOnce();
    });

    it("truncates title to 60 characters", async () => {
      const longTitle = "A".repeat(100);
      const expected = makeConversation({ title: longTitle.slice(0, 60) });
      mockDbInsert([expected]);

      const result = await createConversation(USER_ID, MIND_ID, longTitle);

      expect(result.title).toHaveLength(60);
    });
  });

  // ── getConversationById ──────────────────────────────────────────

  describe("getConversationById", () => {
    it("returns conversation for the owning user", async () => {
      const conv = makeConversation();
      mockDbSelect([conv]);

      const result = await getConversationById(CONV_ID, USER_ID);

      expect(result).toEqual(conv);
      expect(mockDb.select).toHaveBeenCalledOnce();
    });

    it("returns null when no conversation matches (simulates RLS)", async () => {
      mockDbSelect([]);

      const result = await getConversationById(CONV_ID, OTHER_USER_ID);

      expect(result).toBeNull();
    });
  });

  // ── listByUser ───────────────────────────────────────────────────

  describe("listByUser", () => {
    it("returns conversations ordered by updatedAt desc", async () => {
      const older = makeConversation({
        id: "conv-1",
        updatedAt: new Date("2026-03-06T10:00:00Z"),
      });
      const newer = makeConversation({
        id: "conv-2",
        updatedAt: new Date("2026-03-07T10:00:00Z"),
      });
      mockDbSelect([newer, older]);

      const result = await listByUser(USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("conv-2");
      expect(result[1].id).toBe("conv-1");
    });

    it("returns empty array when user has no conversations", async () => {
      mockDbSelect([]);

      const result = await listByUser(USER_ID);

      expect(result).toEqual([]);
    });

    it("accepts optional mindId filter", async () => {
      const conv = makeConversation();
      mockDbSelect([conv]);

      const result = await listByUser(USER_ID, MIND_ID);

      expect(result).toHaveLength(1);
    });
  });

  // ── touchConversation ────────────────────────────────────────────

  describe("touchConversation", () => {
    it("calls update on the conversation", async () => {
      mockDbUpdate([]);

      await touchConversation(CONV_ID);

      expect(mockDb.update).toHaveBeenCalledOnce();
    });
  });

  // ── deleteConversation ───────────────────────────────────────────

  describe("deleteConversation", () => {
    it("returns true when conversation is deleted", async () => {
      mockDbDelete([{ id: CONV_ID }]);

      const result = await deleteConversation(CONV_ID, USER_ID);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledOnce();
    });

    it("returns false when no conversation was found to delete", async () => {
      mockDbDelete([]);

      const result = await deleteConversation(CONV_ID, OTHER_USER_ID);

      expect(result).toBe(false);
    });
  });

  // ── updateTitle ──────────────────────────────────────────────────

  describe("updateTitle", () => {
    it("returns updated conversation on success", async () => {
      const updated = makeConversation({ title: "New Title" });
      mockDbUpdate([updated]);

      const result = await updateTitle(CONV_ID, USER_ID, "New Title");

      expect(result).toEqual(updated);
      expect(mockDb.update).toHaveBeenCalledOnce();
    });

    it("returns null when conversation not found", async () => {
      mockDbUpdate([]);

      const result = await updateTitle(CONV_ID, OTHER_USER_ID, "Nope");

      expect(result).toBeNull();
    });

    it("truncates title to 60 characters", async () => {
      const longTitle = "B".repeat(100);
      const updated = makeConversation({ title: longTitle.slice(0, 60) });
      mockDbUpdate([updated]);

      const result = await updateTitle(CONV_ID, USER_ID, longTitle);

      expect(result?.title).toHaveLength(60);
    });
  });
});
