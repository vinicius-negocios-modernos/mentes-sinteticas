// @vitest-environment jsdom
/**
 * MNT-001 (TD-5.5 / AC3) — behavior-equivalence tests for useOfflineConversations.
 *
 * Two setState-in-effect cases under test:
 *  1. navigator.onLine sync → refactored to useSyncExternalStore (external store).
 *  2. IndexedDB async loading flag → KEPT as useEffect (genuine async data fetch,
 *     not an external store; useSyncExternalStore would be the wrong tool).
 *
 * Assertions below are the spec captured BEFORE the refactor and must remain
 * green UNCHANGED afterwards (proof of no behavior change).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock the conversation-cache so we control IndexedDB read timing/results.
const getCachedConversationsByMind = vi.fn();
vi.mock("@/lib/conversation-cache", () => ({
  cacheConversation: vi.fn(),
  getCachedConversation: vi.fn(),
  getCachedConversationsByMind: (...args: unknown[]) =>
    getCachedConversationsByMind(...args),
}));

import { useOfflineConversations } from "../use-offline-conversations";

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

describe("useOfflineConversations — behavior equivalence (MNT-001)", () => {
  beforeEach(() => {
    setOnLine(true);
    getCachedConversationsByMind.mockReset();
    getCachedConversationsByMind.mockResolvedValue([]);
  });

  afterEach(() => {
    setOnLine(true);
    vi.restoreAllMocks();
  });

  // --- Case 1: navigator.onLine external store ---

  it("isOffline is false when initially online", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOfflineConversations("mind-1"));
    expect(result.current.isOffline).toBe(false);
  });

  it("isOffline is true when initially offline (reads navigator.onLine post-mount)", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOfflineConversations("mind-1"));
    expect(result.current.isOffline).toBe(true);
  });

  it("reacts to 'offline' then 'online' window events", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOfflineConversations("mind-1"));
    expect(result.current.isOffline).toBe(false);

    setOnLine(false);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current.isOffline).toBe(true);

    setOnLine(true);
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current.isOffline).toBe(false);
  });

  // --- Case 2: IndexedDB async loading flag (kept as effect) ---

  it("does NOT load cached conversations while online", () => {
    setOnLine(true);
    renderHook(() => useOfflineConversations("mind-1"));
    expect(getCachedConversationsByMind).not.toHaveBeenCalled();
  });

  it("loads cached conversations when offline and transitions isLoading true→false", async () => {
    setOnLine(false);
    let resolveFetch: (v: unknown[]) => void = () => {};
    getCachedConversationsByMind.mockReturnValue(
      new Promise((res) => {
        resolveFetch = res;
      })
    );

    const { result } = renderHook(() => useOfflineConversations("mind-1"));

    // Effect kicks off the IndexedDB read and sets the loading flag.
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(getCachedConversationsByMind).toHaveBeenCalledWith("mind-1");

    const rows = [
      {
        conversationId: "c1",
        mindId: "mind-1",
        title: "Hello",
        messages: [],
        cachedAt: 1,
      },
    ];
    await act(async () => {
      resolveFetch(rows);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cachedConversations).toEqual(rows);
  });

  it("does not fetch when mindId is empty even if offline", () => {
    setOnLine(false);
    renderHook(() => useOfflineConversations(""));
    expect(getCachedConversationsByMind).not.toHaveBeenCalled();
  });
});
