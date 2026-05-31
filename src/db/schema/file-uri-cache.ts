import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { knowledgeDocuments } from "./knowledge-documents";

// TD-3.1 target state. DB-5 (🔴): the UNIQUE on knowledge_document_id is what
// makes `INSERT ... ON CONFLICT (knowledge_document_id)` work and unblocks the
// Gemini cache. Applied to PROD via scripts/db-migrate/td-3.1-03-unique-file-uri.sql
// (CREATE UNIQUE INDEX CONCURRENTLY, after dedupe), NOT via drizzle-kit migrate.
export const fileUriCache = pgTable(
  "file_uri_cache",
  {
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
  },
  (table) => [
    // DB-5: one cache row per knowledge document — enables the ON CONFLICT upsert.
    uniqueIndex("file_uri_cache_kdid_uniq").on(table.knowledgeDocumentId),
  ]
);

export type FileUriCacheEntry = typeof fileUriCache.$inferSelect;
export type NewFileUriCacheEntry = typeof fileUriCache.$inferInsert;
