"use client";

/**
 * useChatScroll — scroll behavior for the chat message list (UX-11).
 *
 * Extracted verbatim from ChatInterface to make the scroll concern independently
 * testable and keep the component a thin orchestrator. Behavior is identical:
 *  - auto-scrolls to the bottom when new content arrives, BUT only when the user
 *    is already near the bottom (< 200px from the end), so it never yanks a user
 *    who has scrolled up to read history;
 *  - exposes a `showScrollButton` flag that turns true when the user is > 200px
 *    from the bottom (drives the floating "scroll to bottom" control);
 *  - locates the Radix ScrollArea viewport (data-slot="scroll-area-viewport")
 *    and attaches the scroll listener to it.
 *
 * @module hooks/use-chat-scroll
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** Distance (px) from the bottom under which we consider the user "at bottom". */
export const SCROLL_BOTTOM_THRESHOLD = 200;

export interface UseChatScrollResult {
  /** Ref to attach to the sentinel element at the end of the message list. */
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the floating "scroll to bottom" button should be visible. */
  showScrollButton: boolean;
  /** Imperatively scroll the list to the bottom. */
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

/**
 * @param deps Values that, when changed, should trigger a (conditional) auto-scroll —
 *   typically the messages array and the in-flight streaming text. Same dependency
 *   set the original effect used.
 */
export function useChatScroll(deps: readonly unknown[]): UseChatScrollResult {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    },
    []
  );

  // Auto-scroll when new content arrives, but only if user is near the bottom.
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      if (distanceFromBottom < SCROLL_BOTTOM_THRESHOLD) {
        scrollToBottom();
      }
    } else {
      scrollToBottom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, scrollToBottom]);

  // Scroll detection for the "scroll to bottom" button.
  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > SCROLL_BOTTOM_THRESHOLD);
  }, []);

  // Attach scroll listener to the ScrollArea viewport.
  useEffect(() => {
    const scrollAreaEl = document.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLDivElement | null;
    if (scrollAreaEl) {
      scrollViewportRef.current = scrollAreaEl;
      scrollAreaEl.addEventListener("scroll", handleScroll);
      return () => scrollAreaEl.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return { messagesEndRef, showScrollButton, scrollToBottom };
}
