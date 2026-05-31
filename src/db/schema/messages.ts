import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { conversations } from "./conversations";
import { minds } from "./minds";

// TD-3.1 target state — applied to PROD via scripts/db-migrate/td-3.1-*.sql
// (CONCURRENTLY / NOT VALID), not via drizzle-kit migrate.
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    /** Slug of the mind that authored this message (debates only; null for normal chat). */
    // DB-17: FK to minds.slug (ON DELETE SET NULL, ON UPDATE CASCADE), prod NOT VALID + VALIDATE.
    mindSlug: varchar("mind_slug", { length: 255 }).references(
      () => minds.slug,
      { onDelete: "set null", onUpdate: "cascade" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // DB-6: hottest read — messages by conversation, ordered by time.
    index("idx_messages_conversation_created").on(
      table.conversationId,
      table.createdAt
    ),
    // DB-18: standalone chronological ordering.
    index("idx_messages_created_at").on(table.createdAt),
    // DB-9: enforce role enum at the DB level.
    check("messages_role_check", sql`${table.role} IN ('user', 'assistant')`),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
