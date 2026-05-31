import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { conversations } from "./conversations";
import { users } from "./users";

// TD-3.1 target state — applied to PROD via scripts/db-migrate/td-3.1-*.sql
// (NOT VALID + VALIDATE), not via drizzle-kit migrate.
export const debates = pgTable(
  "debates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // DB-2: FK to users (ON DELETE CASCADE).
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    maxRounds: integer("max_rounds").notNull().default(5),
    currentRound: integer("current_round").notNull().default(0),
    currentTurn: integer("current_turn").notNull().default(0),
    status: text("status", {
      enum: ["setup", "active", "paused", "completed"],
    })
      .notNull()
      .default("setup"),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // DB-6: debates listed per user.
    index("idx_debates_user").on(table.userId),
    // DB-9: enforce status enum at the DB level.
    check(
      "debates_status_check",
      sql`${table.status} IN ('setup', 'active', 'paused', 'completed')`
    ),
  ]
);

export type Debate = typeof debates.$inferSelect;
export type NewDebate = typeof debates.$inferInsert;
