import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { minds } from "./minds";
import { conversations } from "./conversations";

export const mindMemories = pgTable(
  "mind_memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
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
  ]
);

export type MindMemory = typeof mindMemories.$inferSelect;
export type NewMindMemory = typeof mindMemories.$inferInsert;
