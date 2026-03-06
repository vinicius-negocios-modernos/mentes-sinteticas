import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const minds = pgTable("minds", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 500 }),
  era: varchar("era", { length: 255 }),
  nationality: varchar("nationality", { length: 255 }),
  systemPrompt: text("system_prompt"),
  personalityTraits: jsonb("personality_traits").$type<string[]>(),
  greeting: text("greeting"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Mind = typeof minds.$inferSelect;
export type NewMind = typeof minds.$inferInsert;
