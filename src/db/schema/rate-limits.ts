import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// TD-3.1 target state — FK applied to PROD via scripts/db-migrate/td-3.1-*.sql
// (NOT VALID + VALIDATE), not via drizzle-kit migrate.
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // DB-2: FK to users (ON DELETE CASCADE — ephemeral data).
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    requestCount: integer("request_count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("rate_limits_user_action_window_idx").on(
      table.userId,
      table.action,
      table.windowStart
    ),
  ]
);

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
