import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { knowledgeDocuments } from "./knowledge-documents";

export const fileUriCache = pgTable("file_uri_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  knowledgeDocumentId: uuid("knowledge_document_id")
    .notNull()
    .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  fileUri: text("file_uri").notNull(),
  mimeType: text("mime_type"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type FileUriCacheEntry = typeof fileUriCache.$inferSelect;
export type NewFileUriCacheEntry = typeof fileUriCache.$inferInsert;
