import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";

export const debates = pgTable("debates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  topic: text("topic").notNull(),
  maxRounds: integer("max_rounds").notNull().default(5),
  currentRound: integer("current_round").notNull().default(0),
  currentTurn: integer("current_turn").notNull().default(0),
  status: text("status", {
    enum: ["setup", "active", "paused", "completed"],
  })
    .notNull()
    .default("setup"),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Debate = typeof debates.$inferSelect;
export type NewDebate = typeof debates.$inferInsert;
