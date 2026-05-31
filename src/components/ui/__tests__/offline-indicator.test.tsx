// @vitest-environment jsdom
/**
 * MNT-001 (TD-5.5 / AC3) — behavior-equivalence tests for OfflineIndicator.
 *
 * Captures observable behavior as the spec BEFORE the setState-in-effect →
 * useSyncExternalStore refactor, so the same assertions prove equivalence AFTER.
 *
 * Observable contract:
 *  - initial render reflects navigator.onLine (offline ⇒ banner visible)
 *  - reacts to window 'online'/'offline' events
 *  - SSR/hydration safety: server snapshot assumes online (no banner) so the
 *    first client paint does not flash a mismatched banner.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { OfflineIndicator } from "../offline-indicator";

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

function fireConnectivity(event: "online" | "offline") {
  act(() => {
    window.dispatchEvent(new Event(event));
  });
}

describe("OfflineIndicator — behavior equivalence (MNT-001)", () => {
  beforeEach(() => {
    setOnLine(true);
  });

  afterEach(() => {
    cleanup();
    setOnLine(true);
    vi.restoreAllMocks();
  });

  it("renders nothing when initially online", () => {
    setOnLine(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the banner when initially offline (reads navigator.onLine post-mount)", () => {
    setOnLine(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows the banner when an 'offline' event fires", () => {
    setOnLine(true);
    render(<OfflineIndicator />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    setOnLine(false);
    fireConnectivity("offline");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("hides the banner when an 'online' event fires after being offline", () => {
    setOnLine(false);
    render(<OfflineIndicator />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    setOnLine(true);
    fireConnectivity("online");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("SSR/hydration: server render assumes online and emits no banner markup", () => {
    // getServerSnapshot must be a stable 'online' default → empty SSR output.
    // Even if navigator is offline at the moment of SSR, the server snapshot is
    // the safe default; the client reconciles post-hydration via the event store.
    setOnLine(false);
    const html = renderToString(<OfflineIndicator />);
    expect(html).toBe("");
  });
});
