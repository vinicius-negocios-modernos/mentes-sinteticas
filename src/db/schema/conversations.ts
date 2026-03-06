import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { minds } from "./minds";

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  mindId: uuid("mind_id")
    .notNull()
    .references(() => minds.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
