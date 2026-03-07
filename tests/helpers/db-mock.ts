/**
 * Drizzle DB Mock Helpers
 *
 * Provides a chainable mock factory for the Drizzle `db` object
 * used across all service files. Supports insert, select, update,
 * delete chains with their respective terminal methods.
 *
 * Usage:
 *   vi.mock("@/db", () => dbMockModule());
 *   // then in each test:
 *   mockDbInsert([{ id: "1", name: "test" }]);
 *   mockDbSelect([{ id: "1", name: "test" }]);
 */
import { vi } from "vitest";

// ── Internal chain state ─────────────────────────────────────────────

/** Stores the next return value for each operation type */
const returnValues: {
  insert: unknown[];
  select: unknown[];
  update: unknown[];
  delete: unknown[];
  execute: unknown;
} = {
  insert: [],
  select: [],
  update: [],
  delete: [],
  execute: undefined,
};

// ── Chainable builders ───────────────────────────────────────────────

function createInsertChain() {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(() => Promise.resolve(returnValues.insert)),
    // For insert without returning (e.g., incrementRateLimit)
    then: undefined as unknown,
  };
  // Make the chain itself thenable for awaits without .returning()
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(returnValues.insert).then(resolve, reject);
  return chain;
}

function createSelectChain() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(returnValues.select).then(resolve, reject);
  return chain;
}

function createUpdateChain() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(() => Promise.resolve(returnValues.update)),
    then: undefined as unknown,
  };
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(returnValues.update).then(resolve, reject);
  return chain;
}

function createDeleteChain() {
  const chain = {
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(() => Promise.resolve(returnValues.delete)),
    then: undefined as unknown,
  };
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(returnValues.delete).then(resolve, reject);
  return chain;
}

// ── Mock DB instance ─────────────────────────────────────────────────

const insertChain = createInsertChain();
const selectChain = createSelectChain();
const updateChain = createUpdateChain();
const deleteChain = createDeleteChain();

export const mockDb = {
  insert: vi.fn(() => insertChain),
  select: vi.fn(() => selectChain),
  update: vi.fn(() => updateChain),
  delete: vi.fn(() => deleteChain),
  execute: vi.fn(() => Promise.resolve(returnValues.execute)),
};

// ── Module factory (use with vi.mock) ────────────────────────────────

/**
 * Returns a mock module shape matching `@/db`.
 *
 * Usage:
 *   vi.mock("@/db", () => dbMockModule());
 */
export function dbMockModule() {
  return {
    db: mockDb,
    getDb: vi.fn(() => mockDb),
  };
}

// ── Convenience setters ──────────────────────────────────────────────

/**
 * Set the return value for the next `db.insert(...).values(...).returning()`.
 * Also used for bare `db.insert(...).values(...)` (thenable).
 */
export function mockDbInsert(rows: unknown[]) {
  returnValues.insert = rows;
}

/**
 * Set the return value for the next `db.select().from(...).where(...)`.
 */
export function mockDbSelect(rows: unknown[]) {
  returnValues.select = rows;
}

/**
 * Set the return value for the next `db.update(...).set(...).where(...).returning()`.
 */
export function mockDbUpdate(rows: unknown[]) {
  returnValues.update = rows;
}

/**
 * Set the return value for the next `db.delete(...).where(...).returning()`.
 */
export function mockDbDelete(rows: unknown[]) {
  returnValues.delete = rows;
}

/**
 * Set the return value for `db.execute(sql`...`)` (used in health check).
 */
export function mockDbExecute(result: unknown) {
  returnValues.execute = result;
}

/**
 * Reset all mock return values and call history.
 * Call this in `beforeEach` or `afterEach`.
 */
export function resetDbMocks() {
  returnValues.insert = [];
  returnValues.select = [];
  returnValues.update = [];
  returnValues.delete = [];
  returnValues.execute = undefined;

  // Reset call history on all mocks
  mockDb.insert.mockClear();
  mockDb.select.mockClear();
  mockDb.update.mockClear();
  mockDb.delete.mockClear();
  mockDb.execute.mockClear();

  insertChain.values.mockClear();
  insertChain.returning.mockClear();

  selectChain.from.mockClear();
  selectChain.where.mockClear();
  selectChain.limit.mockClear();
  selectChain.orderBy.mockClear();

  updateChain.set.mockClear();
  updateChain.where.mockClear();
  updateChain.returning.mockClear();

  deleteChain.where.mockClear();
  deleteChain.returning.mockClear();
}

/**
 * Make any DB operation reject with the given error.
 * Useful for testing error handling paths.
 */
export function mockDbError(operation: "insert" | "select" | "update" | "delete", error: Error) {
  const thenableError = {
    then: (_resolve: unknown, reject: (e: Error) => void) =>
      Promise.reject(error).catch(reject),
  };

  switch (operation) {
    case "insert":
      insertChain.returning.mockReturnValueOnce(Promise.reject(error));
      insertChain.then = thenableError.then;
      break;
    case "select":
      selectChain.then = thenableError.then;
      break;
    case "update":
      updateChain.returning.mockReturnValueOnce(Promise.reject(error));
      updateChain.then = thenableError.then;
      break;
    case "delete":
      deleteChain.returning.mockReturnValueOnce(Promise.reject(error));
      deleteChain.then = thenableError.then;
      break;
  }
}
