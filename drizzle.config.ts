// ⚠️ Before running `drizzle-kit generate` / `push`: read drizzle/README.md —
// the schema is AHEAD of the journal (TD-3.1 applied to prod via standalone scripts).
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
