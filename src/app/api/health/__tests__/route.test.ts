import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDb, dbMockModule, mockDbExecute, resetDbMocks } from "../../../../../tests/helpers/db-mock";

// ── Mocks ────────────────────────────────────────────────────────────

vi.mock("@/db", () => dbMockModule());

// ── Env setup ────────────────────────────────────────────────────────

beforeEach(() => {
  resetDbMocks();
  process.env.AUTH_SECRET = "test-secret";
});

// ── Tests ────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns 200 with status 'healthy' when DB and Auth are OK", async () => {
    mockDbExecute({ rows: [{ "?column?": 1 }] });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.components.app.status).toBe("ok");
    expect(body.components.database.status).toBe("ok");
    expect(body.components.auth.status).toBe("ok");
  });

  it("returns 503 with status 'degraded' when DB fails", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("Connection refused"));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.components.database.status).toBe("error");
    expect(body.components.database.message).toBe("Connection refused");
    expect(body.components.auth.status).toBe("ok");
  });

  it("returns 503 with status 'degraded' when Auth fails", async () => {
    mockDbExecute({ rows: [{ "?column?": 1 }] });
    delete process.env.AUTH_SECRET;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.components.auth.status).toBe("error");
    expect(body.components.auth.message).toContain("AUTH_SECRET not configured");
    expect(body.components.database.status).toBe("ok");
  });

  it("returns HealthResponse structure with required fields", async () => {
    mockDbExecute({ rows: [{ "?column?": 1 }] });

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({
      status: expect.stringMatching(/^(healthy|degraded)$/),
      version: expect.any(String),
      timestamp: expect.any(String),
      components: {
        app: expect.objectContaining({ status: expect.any(String) }),
        database: expect.objectContaining({ status: expect.any(String) }),
        auth: expect.objectContaining({ status: expect.any(String) }),
      },
    });

    // Validate timestamp is valid ISO string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it("returns 503 with status 'degraded' when AUTH_SECRET is missing", async () => {
    mockDbExecute({ rows: [{ "?column?": 1 }] });
    delete process.env.AUTH_SECRET;

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.components.auth.status).toBe("error");
    expect(body.components.auth.message).toContain("AUTH_SECRET not configured");
  });
});
