/**
 * Integration tests for middleware.ts
 * Story 4.2 — Task 9 (AC7)
 *
 * Tests public/protected route handling, auth redirects,
 * and redirectTo query param preservation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  authSsrMockModule,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAuthMocks,
} from "../helpers/auth-mock";

// Mock @supabase/ssr before importing middleware
vi.mock("@supabase/ssr", () => authSsrMockModule());

// Set required env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// Import middleware AFTER mocks are set up
const { middleware } = await import("../../middleware");

// ── Helpers ──────────────────────────────────────────────────────────

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

// ── Tests ────────────────────────────────────────────────────────────

describe("middleware", () => {
  beforeEach(() => {
    resetAuthMocks();
  });

  // ── Public routes ────────────────────────────────────────────────

  describe("public routes", () => {
    const publicPaths = ["/", "/login", "/signup", "/api/health"];

    it.each(publicPaths)(
      "allows unauthenticated access to %s",
      async (path) => {
        mockUnauthenticatedUser();
        const response = await middleware(createRequest(path));

        // Should NOT redirect — status 200 (NextResponse.next())
        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    );

    it.each(publicPaths)(
      "allows authenticated access to %s",
      async (path) => {
        mockAuthenticatedUser("user-1", "user@test.com");
        const response = await middleware(createRequest(path));

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    );

    it("allows unauthenticated access to /auth/callback", async () => {
      mockUnauthenticatedUser();
      const response = await middleware(createRequest("/auth/callback"));

      expect(response.status).toBe(200);
    });

    it("allows unauthenticated access to /auth/confirm", async () => {
      mockUnauthenticatedUser();
      const response = await middleware(createRequest("/auth/confirm"));

      expect(response.status).toBe(200);
    });
  });

  // ── Protected routes ─────────────────────────────────────────────

  describe("protected routes", () => {
    it("redirects unauthenticated user from /chat/test-mind to /login", async () => {
      mockUnauthenticatedUser();
      const response = await middleware(createRequest("/chat/test-mind"));

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
    });

    it("preserves redirectTo query param on redirect", async () => {
      mockUnauthenticatedUser();
      const response = await middleware(createRequest("/chat/test-mind"));

      const location = new URL(response.headers.get("location")!);
      expect(location.searchParams.get("redirectTo")).toBe("/chat/test-mind");
    });

    it("preserves redirectTo for nested protected routes", async () => {
      mockUnauthenticatedUser();
      const response = await middleware(
        createRequest("/dashboard/settings")
      );

      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("redirectTo")).toBe(
        "/dashboard/settings"
      );
    });

    it("allows authenticated user to access /chat/test-mind", async () => {
      mockAuthenticatedUser("user-1", "user@test.com");
      const response = await middleware(createRequest("/chat/test-mind"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows authenticated user to access /chat/another-mind", async () => {
      mockAuthenticatedUser("user-2", "another@test.com");
      const response = await middleware(createRequest("/chat/another-mind"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });
});
