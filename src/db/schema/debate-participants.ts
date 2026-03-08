import {
  pgTable,
  uuid,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { debates } from "./debates";
import { minds } from "./minds";

export const debateParticipants = pgTable(
  "debate_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    debateId: uuid("debate_id")
      .notNull()
      .references(() => debates.id, { onDelete: "cascade" }),
    mindId: uuid("mind_id")
      .notNull()
      .references(() => minds.id),
    turnOrder: integer("turn_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("debate_participants_debate_mind_unique").on(
      table.debateId,
      table.mindId
    ),
    unique("debate_participants_debate_order_unique").on(
      table.debateId,
      table.turnOrder
    ),
  ]
);

export type DebateParticipant = typeof debateParticipants.$inferSelect;
export type NewDebateParticipant = typeof debateParticipants.$inferInsert;
