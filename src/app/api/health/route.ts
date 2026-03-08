import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

interface ComponentStatus {
  status: "ok" | "error";
  message?: string;
  latencyMs?: number;
}

interface HealthResponse {
  status: "healthy" | "degraded";
  version: string;
  timestamp: string;
  components: {
    app: ComponentStatus;
    database: ComponentStatus;
    auth: ComponentStatus;
  };
}

const COMPONENT_TIMEOUT_MS = 5000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    ),
  ]);
}

async function checkDatabase(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    const { getDb } = await import("@/db");
    const db = getDb();
    await withTimeout(db.execute(sql`SELECT 1`), COMPONENT_TIMEOUT_MS);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

async function checkAuth(): Promise<ComponentStatus> {
  const start = Date.now();
  try {
    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
      return { status: "error", message: "AUTH_SECRET not configured" };
    }

    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

export async function GET() {
  const [database, auth] = await Promise.all([checkDatabase(), checkAuth()]);

  const app: ComponentStatus = { status: "ok" };

  const allHealthy =
    app.status === "ok" &&
    database.status === "ok" &&
    auth.status === "ok";

  const body: HealthResponse = {
    status: allHealthy ? "healthy" : "degraded",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    components: { app, database, auth },
  };

  return NextResponse.json(body, {
    status: allHealthy ? 200 : 503,
  });
}
