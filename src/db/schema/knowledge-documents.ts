import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { minds } from "./minds";

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  mindId: uuid("mind_id")
    .notNull()
    .references(() => minds.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 500 }).notNull(),
  localPath: text("local_path"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
