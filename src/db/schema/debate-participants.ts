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
    // DB-15: explicit RESTRICT — block deleting a mind that participates in a
    // debate. Re-stated from the implicit "no action" of migration 0002 via
    // scripts/db-migrate/td-3.1-04-fks-add-notvalid.sql.
    mindId: uuid("mind_id")
      .notNull()
      .references(() => minds.id, { onDelete: "restrict" }),
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
