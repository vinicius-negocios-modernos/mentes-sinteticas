import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { minds } from "./minds";
import { users } from "./users";

// TD-3.1 target state. The indexes / FK / unique below are applied to PROD via
// the standalone scripts in scripts/db-migrate/td-3.1-*.sql (CONCURRENTLY /
// NOT VALID), NOT via drizzle-kit migrate. This definition exists for
// type-consistency and so future drizzle-generated migrations baseline correctly.
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // DB-2: FK to users (ON DELETE CASCADE), applied NOT VALID + VALIDATE in prod.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mindId: uuid("mind_id")
      .notNull()
      .references(() => minds.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }),
    shareToken: varchar("share_token", { length: 64 }),
    sharedAt: timestamp("shared_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // DB-6: conversations list per user, newest first.
    index("idx_conversations_user_updated").on(
      table.userId,
      table.updatedAt.desc()
    ),
    // DB-6: conversations filtered by mind.
    index("idx_conversations_mind").on(table.mindId),
    // DB-7: partial UNIQUE on share_token (only non-null shared rows).
    uniqueIndex("conversations_share_token_uniq")
      .on(table.shareToken)
      .where(sql`${table.shareToken} IS NOT NULL`),
  ]
);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
