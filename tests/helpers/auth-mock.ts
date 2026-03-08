/**
 * NextAuth Mock Helpers
 *
 * Provides mock factories for NextAuth used in:
 * - API routes (auth() from @/lib/auth)
 * - Server actions (auth() from @/lib/auth)
 * - Server components (auth() from @/lib/auth)
 *
 * Usage:
 *   vi.mock("@/lib/auth", () => authMockModule());
 *   // then in each test:
 *   mockAuthenticatedUser("user-123", "user@test.com");
 *   mockUnauthenticatedUser();
 */
import { vi } from "vitest";

// ── Types ────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface MockSession {
  user: MockUser;
  expires: string;
}

// ── Internal state ───────────────────────────────────────────────────

const authState: {
  session: MockSession | null;
} = {
  session: null,
};

// ── Mock auth function ──────────────────────────────────────────────

export const mockAuth = vi.fn(async () => authState.session);

export const mockSignOut = vi.fn(async () => {
  authState.session = null;
});

// ── Module factories (use with vi.mock) ──────────────────────────────

/**
 * Mock module for `@/lib/auth`.
 * Used by API routes, server actions, and server components.
 *
 * Usage:
 *   vi.mock("@/lib/auth", () => authMockModule());
 */
export function authMockModule() {
  return {
    auth: mockAuth,
    signOut: mockSignOut,
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
  authState.session = {
    user: {
      id: userId,
      email,
      ...extras,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Configure auth to return no user (unauthenticated).
 */
export function mockUnauthenticatedUser() {
  authState.session = null;
}

/**
 * Configure auth to return an error.
 * With NextAuth, this is equivalent to returning null session.
 *
 * @param _message - Error message (kept for backward compatibility)
 * @param _status - HTTP-like status code (kept for backward compatibility)
 */
export function mockAuthError(_message: string, _status = 401) {
  authState.session = null;
}

/**
 * Reset all auth mocks and state.
 * Call this in `beforeEach` or `afterEach`.
 */
export function resetAuthMocks() {
  authState.session = null;
  mockAuth.mockClear();
  mockSignOut.mockClear();
}
