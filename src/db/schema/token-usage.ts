import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { conversations } from "./conversations";
import { messages } from "./messages";
import { users } from "./users";

// TD-3.1 target state — applied to PROD via scripts/db-migrate/td-3.1-*.sql
// (NOT VALID + VALIDATE), not via drizzle-kit migrate.
export const tokenUsage = pgTable(
  "token_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // DB-2: FK to users with ON DELETE SET NULL — PRESERVE billing/audit history.
    // user_id is NULLABLE here (only table where it is) so SET NULL is legal.
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    model: text("model").notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_token_usage_user_date").on(table.userId, table.createdAt),
    index("idx_token_usage_conversation").on(table.conversationId),
    // DB-11: total_tokens must equal input + output.
    check(
      "token_usage_total_tokens_check",
      sql`${table.totalTokens} = ${table.inputTokens} + ${table.outputTokens}`
    ),
  ]
);

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
