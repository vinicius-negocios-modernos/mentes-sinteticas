import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { minds } from "./minds";
import { conversations } from "./conversations";
import { users } from "./users";

// TD-3.1 target state — applied to PROD via scripts/db-migrate/td-3.1-*.sql
// (NOT VALID + VALIDATE), not via drizzle-kit migrate.
export const mindMemories = pgTable(
  "mind_memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // DB-2: FK to users (ON DELETE CASCADE).
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mindId: uuid("mind_id")
      .notNull()
      .references(() => minds.id, { onDelete: "cascade" }),
    memoryType: text("memory_type").notNull().$type<
      "fact" | "preference" | "topic" | "insight"
    >(),
    content: text("content").notNull(),
    sourceConversationId: uuid("source_conversation_id").references(
      () => conversations.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_mind_memories_user_mind").on(table.userId, table.mindId),
    index("idx_mind_memories_created_at").on(table.createdAt),
    // DB-9: enforce memory_type enum at the DB level.
    check(
      "mind_memories_memory_type_check",
      sql`${table.memoryType} IN ('fact', 'preference', 'topic', 'insight')`
    ),
  ]
);

export type MindMemory = typeof mindMemories.$inferSelect;
export type NewMindMemory = typeof mindMemories.$inferInsert;
