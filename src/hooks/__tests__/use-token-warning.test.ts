// @vitest-environment jsdom
/**
 * UX-11 / SYS-9 (TD-5.5) — unit tests for useTokenWarning.
 *
 * Covers the header-interpretation contract that drives the daily-limit banner:
 * latch-on only on the exact `approaching-limit` value, stay off otherwise, and
 * dismiss. These pin the same behavior the characterization tests exercise at
 * the component level, but at the seam (so it's cheap and exhaustive).
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTokenWarning,
  TOKEN_USAGE_WARNING_HEADER,
} from "../use-token-warning";

function responseWith(headerValue?: string): Response {
  const headers = new Headers();
  if (headerValue !== undefined) {
    headers.set(TOKEN_USAGE_WARNING_HEADER, headerValue);
  }
  return new Response(null, { headers });
}

describe("useTokenWarning", () => {
  it("starts with the banner hidden", () => {
    const { result } = renderHook(() => useTokenWarning());
    expect(result.current.tokenWarning).toBe(false);
  });

  it("latches the banner on when header equals 'approaching-limit'", () => {
    const { result } = renderHook(() => useTokenWarning());
    act(() => result.current.checkResponse(responseWith("approaching-limit")));
    expect(result.current.tokenWarning).toBe(true);
  });

  it("ignores a response without the header", () => {
    const { result } = renderHook(() => useTokenWarning());
    act(() => result.current.checkResponse(responseWith(undefined)));
    expect(result.current.tokenWarning).toBe(false);
  });

  it("ignores an unrelated header value", () => {
    const { result } = renderHook(() => useTokenWarning());
    act(() => result.current.checkResponse(responseWith("ok")));
    expect(result.current.tokenWarning).toBe(false);
  });

  it("dismiss() turns the banner back off", () => {
    const { result } = renderHook(() => useTokenWarning());
    act(() => result.current.checkResponse(responseWith("approaching-limit")));
    expect(result.current.tokenWarning).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.tokenWarning).toBe(false);
  });
});
