// @vitest-environment jsdom
/**
 * UX-11 / SYS-9 (TD-5.5) — unit tests for useChatScroll.
 *
 * Pins the scroll contract: auto-scroll only when the user is near the bottom
 * (never yank a user reading history), and toggle the floating "scroll to
 * bottom" button based on distance from the bottom of the viewport.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useChatScroll, SCROLL_BOTTOM_THRESHOLD } from "../use-chat-scroll";

let scrollIntoView: ReturnType<typeof vi.fn>;
let viewport: HTMLDivElement;

/**
 * Insert a fake ScrollArea viewport with controllable scroll geometry so the
 * hook's querySelector + distance math runs against real DOM.
 */
function mountViewport(geometry: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}) {
  viewport = document.createElement("div");
  viewport.setAttribute("data-slot", "scroll-area-viewport");
  Object.defineProperty(viewport, "scrollTop", {
    value: geometry.scrollTop,
    configurable: true,
  });
  Object.defineProperty(viewport, "scrollHeight", {
    value: geometry.scrollHeight,
    configurable: true,
  });
  Object.defineProperty(viewport, "clientHeight", {
    value: geometry.clientHeight,
    configurable: true,
  });
  document.body.appendChild(viewport);
}

describe("useChatScroll", () => {
  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("exposes scrollToBottom that calls scrollIntoView on the sentinel ref", () => {
    const { result } = renderHook(() => useChatScroll([0]));
    // Attach the ref to a node so scrollToBottom has a target.
    const node = document.createElement("div");
    (result.current.messagesEndRef as { current: HTMLDivElement | null }).current =
      node;
    act(() => result.current.scrollToBottom("auto"));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto" });
  });

  it("auto-scrolls when there is no viewport yet (initial mount)", () => {
    // scrollToBottom targets messagesEndRef.current, so attach a node and let the
    // mount effect run with the ref already wired (mirrors the real JSX, where
    // the sentinel <div ref={messagesEndRef}/> is mounted alongside the hook).
    const node = document.createElement("div");
    renderHook(() => {
      const r = useChatScroll([1]);
      (r.messagesEndRef as { current: HTMLDivElement | null }).current = node;
      return r;
    });
    // No viewport in the DOM → falls back to scrollToBottom on the sentinel.
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("auto-scrolls on dep change when user is near the bottom", () => {
    mountViewport({ scrollTop: 900, scrollHeight: 1000, clientHeight: 100 }); // distance 0
    const node = document.createElement("div");
    const { rerender } = renderHook(
      ({ d }) => {
        const r = useChatScroll([d]);
        (r.messagesEndRef as { current: HTMLDivElement | null }).current = node;
        return r;
      },
      { initialProps: { d: 0 } }
    );
    scrollIntoView.mockClear();
    act(() => rerender({ d: 1 }));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("does NOT auto-scroll on dep change when user has scrolled up", () => {
    // distance from bottom = 1000 - 0 - 100 = 900 (> threshold) → no auto-scroll
    mountViewport({ scrollTop: 0, scrollHeight: 1000, clientHeight: 100 });
    const node = document.createElement("div");
    const { rerender } = renderHook(
      ({ d }) => {
        const r = useChatScroll([d]);
        (r.messagesEndRef as { current: HTMLDivElement | null }).current = node;
        return r;
      },
      { initialProps: { d: 0 } }
    );
    scrollIntoView.mockClear();
    act(() => rerender({ d: 1 }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("shows the scroll button when the user is far from the bottom on scroll", () => {
    mountViewport({ scrollTop: 0, scrollHeight: 1000, clientHeight: 100 });
    const { result } = renderHook(() => useChatScroll([0]));
    expect(result.current.showScrollButton).toBe(false);
    act(() => {
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.showScrollButton).toBe(true);
  });

  it("hides the scroll button when the user is within the bottom threshold", () => {
    mountViewport({ scrollTop: 950, scrollHeight: 1000, clientHeight: 100 }); // distance -50 (< threshold)
    const { result } = renderHook(() => useChatScroll([0]));
    act(() => {
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.showScrollButton).toBe(false);
  });

  it("exports a 200px bottom threshold (documented contract)", () => {
    expect(SCROLL_BOTTOM_THRESHOLD).toBe(200);
  });
});
