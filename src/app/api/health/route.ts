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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { status: "error", message: "Supabase credentials not configured" };
    }

    const response = await withTimeout(
      fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseKey },
      }),
      COMPONENT_TIMEOUT_MS
    );

    if (response.ok) {
      return { status: "ok", latencyMs: Date.now() - start };
    }
    return {
      status: "error",
      message: `Auth service returned ${response.status}`,
      latencyMs: Date.now() - start,
    };
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
