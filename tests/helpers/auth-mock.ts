/**
 * Supabase Auth Mock Helpers
 *
 * Provides mock factories for Supabase Auth used in:
 * - middleware.ts (createServerClient from @supabase/ssr)
 * - API routes (createClient from @/lib/supabase/server)
 *
 * Usage:
 *   vi.mock("@/lib/supabase/server", () => authServerMockModule());
 *   // then in each test:
 *   mockAuthenticatedUser("user-123", "user@test.com");
 *   mockUnauthenticatedUser();
 */
import { vi } from "vitest";

// ── Types ────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  created_at: string;
}

// ── Internal state ───────────────────────────────────────────────────

const authState: {
  user: MockUser | null;
  error: Error | null;
} = {
  user: null,
  error: null,
};

// ── Mock Supabase client ─────────────────────────────────────────────

export const mockGetUser = vi.fn(async () => ({
  data: { user: authState.user },
  error: authState.error,
}));

export const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
};

// ── Module factories (use with vi.mock) ──────────────────────────────

/**
 * Mock module for `@/lib/supabase/server`.
 * Used by API routes (e.g., /api/chat/route.ts).
 *
 * Usage:
 *   vi.mock("@/lib/supabase/server", () => authServerMockModule());
 */
export function authServerMockModule() {
  return {
    createClient: vi.fn(async () => mockSupabaseClient),
  };
}

/**
 * Mock module for `@supabase/ssr`.
 * Used by middleware.ts.
 *
 * Usage:
 *   vi.mock("@supabase/ssr", () => authSsrMockModule());
 */
export function authSsrMockModule() {
  return {
    createServerClient: vi.fn(() => mockSupabaseClient),
  };
}

// ── Convenience setters ──────────────────────────────────────────────

/**
 * Configure auth to return an authenticated user.
 *
 * @param userId - UUID for the user
 * @param email - Email address
 * @param extras - Optional additional user properties
 */
export function mockAuthenticatedUser(
  userId: string,
  email: string,
  extras?: Partial<MockUser>
) {
  authState.user = {
    id: userId,
    email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
    ...extras,
  };
  authState.error = null;
}

/**
 * Configure auth to return no user (unauthenticated).
 */
export function mockUnauthenticatedUser() {
  authState.user = null;
  authState.error = null;
}

/**
 * Configure auth to return an error.
 *
 * @param message - Error message
 * @param status - HTTP-like status code (default: 401)
 */
export function mockAuthError(message: string, status = 401) {
  authState.user = null;
  authState.error = Object.assign(new Error(message), {
    status,
    code: "auth_error",
  });
}

/**
 * Reset all auth mocks and state.
 * Call this in `beforeEach` or `afterEach`.
 */
export function resetAuthMocks() {
  authState.user = null;
  authState.error = null;
  mockGetUser.mockClear();
}
