import { eq, and, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  debates,
  debateParticipants,
  minds,
  conversations,
  type Debate,
  type NewDebate,
} from "@/db/schema";
import type { DebateParticipantInfo, DebateStatus } from "@/lib/types";

/**
 * Create a new debate with participants.
 * Also creates a backing conversation for message storage.
 */
export async function createDebate(
  userId: string,
  topic: string,
  mindSlugs: string[]
): Promise<{
  debate: Debate;
  participants: DebateParticipantInfo[];
}> {
  // Resolve mind slugs to full records
  const mindRecords = [];
  for (const slug of mindSlugs) {
    const [mind] = await db
      .select()
      .from(minds)
      .where(eq(minds.slug, slug))
      .limit(1);
    if (!mind) {
      throw new Error(`Mente '${slug}' nao encontrada.`);
    }
    mindRecords.push(mind);
  }

  // Create a backing conversation (use first mind as "host")
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      mindId: mindRecords[0].id,
      title: `Debate: ${topic.slice(0, 50)}`,
    })
    .returning();

  // Create debate record
  const [debate] = await db
    .insert(debates)
    .values({
      userId,
      topic,
      maxRounds: 5,
      currentRound: 0,
      currentTurn: 0,
      status: "setup",
      conversationId: conversation.id,
    } satisfies NewDebate)
    .returning();

  // Create participants with turn order
  const participantInfos: DebateParticipantInfo[] = [];
  for (let i = 0; i < mindRecords.length; i++) {
    await db.insert(debateParticipants).values({
      debateId: debate.id,
      mindId: mindRecords[i].id,
      turnOrder: i,
    });
    participantInfos.push({
      mindId: mindRecords[i].id,
      mindName: mindRecords[i].name,
      mindSlug: mindRecords[i].slug,
      turnOrder: i,
    });
  }

  return { debate, participants: participantInfos };
}

/**
 * Get a debate by ID with ownership check.
 */
export async function getDebateById(
  debateId: string,
  userId: string
): Promise<Debate | null> {
  const [debate] = await db
    .select()
    .from(debates)
    .where(and(eq(debates.id, debateId), eq(debates.userId, userId)))
    .limit(1);

  return debate ?? null;
}

/**
 * Get debate participants with mind info, ordered by turn_order.
 */
export async function getDebateParticipants(
  debateId: string
): Promise<DebateParticipantInfo[]> {
  const rows = await db
    .select({
      mindId: debateParticipants.mindId,
      mindName: minds.name,
      mindSlug: minds.slug,
      turnOrder: debateParticipants.turnOrder,
    })
    .from(debateParticipants)
    .innerJoin(minds, eq(debateParticipants.mindId, minds.id))
    .where(eq(debateParticipants.debateId, debateId))
    .orderBy(asc(debateParticipants.turnOrder));

  return rows;
}

/**
 * Update debate status.
 */
export async function updateDebateStatus(
  debateId: string,
  status: DebateStatus
): Promise<void> {
  await db
    .update(debates)
    .set({ status, updatedAt: new Date() })
    .where(eq(debates.id, debateId));
}

/**
 * Increment the current turn counter and update round if needed.
 */
export async function advanceTurn(
  debateId: string,
  participantCount: number
): Promise<{ newTurn: number; newRound: number }> {
  const [debate] = await db
    .select()
    .from(debates)
    .where(eq(debates.id, debateId))
    .limit(1);

  const newTurn = (debate?.currentTurn ?? 0) + 1;
  const newRound = Math.floor(newTurn / participantCount);

  await db
    .update(debates)
    .set({
      currentTurn: newTurn,
      currentRound: newRound,
      updatedAt: new Date(),
    })
    .where(eq(debates.id, debateId));

  return { newTurn, newRound };
}
