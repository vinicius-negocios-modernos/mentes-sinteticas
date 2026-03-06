import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy-initialized DB connection — avoids throwing during Next.js build
// when DATABASE_URL is not available.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Configure it in .env.local. " +
        "See .env.example for the expected format."
    );
  }
  return connectionString;
}

export function getDb() {
  if (!_db) {
    const client = postgres(getConnectionString(), {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

/**
 * Default export for convenience. Uses lazy initialization.
 * Access via `db` — the connection is established on first query, not at import.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export type Database = ReturnType<typeof getDb>;
