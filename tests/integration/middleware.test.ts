/**
 * Integration tests for middleware.ts
 * Story 4.2 — Task 9 (AC7)
 *
 * Tests public/protected route handling, auth redirects,
 * and callbackUrl query param preservation.
 *
 * Updated for NextAuth middleware (auth() wrapper pattern).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted state (available inside vi.mock factory) ─────────────────

const { sessionState } = vi.hoisted(() => {
  const sessionState: {
    session: {
      user: { id: string; email: string };
      expires: string;
    } | null;
  } = { session: null };
  return { sessionState };
});

// Mock @/lib/auth with NextAuth middleware wrapper pattern:
// auth(callback) returns an async function that sets req.auth and calls callback
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(
    (callback: (req: NextRequest & { auth: unknown }) => Response | void) => {
      return async (req: NextRequest) => {
        // Augment request with .auth (session or null)
        const augmentedReq = req as NextRequest & {
          auth: typeof sessionState.session;
        };
        augmentedReq.auth = sessionState.session;

        const result = callback(augmentedReq);
        if (result instanceof Response) {
          return result;
        }
        // If callback returns nothing, it means "allow"
        return new Response(null, { status: 200 });
      };
    }
  ),
  signOut: vi.fn(async () => {}),
}));

// Import middleware AFTER mocks are set up
// The default export is the result of auth(callback), i.e., an async function
const middlewareModule = await import("../../middleware");
const middleware = middlewareModule.default as (
  req: NextRequest
) => Promise<Response>;

// ── Helpers ──────────────────────────────────────────────────────────

function createRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function setAuthenticated(userId: string, email: string) {
  sessionState.session = {
    user: { id: userId, email },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function setUnauthenticated() {
  sessionState.session = null;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("middleware", () => {
  beforeEach(() => {
    sessionState.session = null;
  });

  // ── Public routes ────────────────────────────────────────────────

  describe("public routes", () => {
    const publicPaths = [
      "/",
      "/login",
      "/signup",
      "/api/auth/signin",
      "/api/auth/callback/credentials",
      "/api/health",
      "/shared/some-page",
      "/mind/test-mind",
      "/offline",
    ];

    it.each(publicPaths)(
      "allows unauthenticated access to %s",
      async (path) => {
        setUnauthenticated();
        const response = await middleware(createRequest(path));

        // Should NOT redirect — status 200
        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    );

    it.each(publicPaths)(
      "allows authenticated access to %s",
      async (path) => {
        setAuthenticated("user-1", "user@test.com");
        const response = await middleware(createRequest(path));

        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    );
  });

  // ── Protected routes ─────────────────────────────────────────────

  describe("protected routes", () => {
    it("redirects unauthenticated user from /chat/test-mind to /login", async () => {
      setUnauthenticated();
      const response = await middleware(createRequest("/chat/test-mind"));

      expect([301, 302, 307, 308]).toContain(response.status);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
    });

    it("preserves callbackUrl query param on redirect", async () => {
      setUnauthenticated();
      const response = await middleware(createRequest("/chat/test-mind"));

      const location = new URL(response.headers.get("location")!);
      expect(location.searchParams.get("callbackUrl")).toBe("/chat/test-mind");
    });

    it("preserves callbackUrl for nested protected routes", async () => {
      setUnauthenticated();
      const response = await middleware(
        createRequest("/dashboard/settings")
      );

      expect([301, 302, 307, 308]).toContain(response.status);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe(
        "/dashboard/settings"
      );
    });

    it("allows authenticated user to access /chat/test-mind", async () => {
      setAuthenticated("user-1", "user@test.com");
      const response = await middleware(createRequest("/chat/test-mind"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows authenticated user to access /chat/another-mind", async () => {
      setAuthenticated("user-2", "another@test.com");
      const response = await middleware(createRequest("/chat/another-mind"));

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("redirects unauthenticated user from /profile to /login", async () => {
      setUnauthenticated();
      const response = await middleware(createRequest("/profile"));

      expect([301, 302, 307, 308]).toContain(response.status);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe("/profile");
    });
  });
});
