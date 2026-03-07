/**
 * Test Helpers — barrel export
 *
 * Usage:
 *   import { mockDb, mockDbInsert, mockAuthenticatedUser } from "tests/helpers";
 */
export {
  mockDb,
  dbMockModule,
  mockDbInsert,
  mockDbSelect,
  mockDbUpdate,
  mockDbDelete,
  mockDbExecute,
  mockDbError,
  resetDbMocks,
} from "./db-mock";

export {
  mockSupabaseClient,
  mockGetUser,
  authServerMockModule,
  authSsrMockModule,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockAuthError,
  resetAuthMocks,
  type MockUser,
} from "./auth-mock";
