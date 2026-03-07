import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { tokenUsage, type NewTokenUsage } from "@/db/schema/token-usage";

// ── Types ─────────────────────────────────────────────────────────────

export interface RecordUsageInput {
  userId: string;
  conversationId: string;
  messageId?: string | null;
  inputTokens: number;
  outputTokens: number;
  model: string;
  costUsd: number;
}

export interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
}

// ── Core functions ────────────────────────────────────────────────────

/**
 * Record a token usage entry after a completed AI response.
 *
 * @param data - Usage data including user, conversation, token counts, model, and cost
 */
export async function recordUsage(data: RecordUsageInput): Promise<void> {
  const values: NewTokenUsage = {
    userId: data.userId,
    conversationId: data.conversationId,
    messageId: data.messageId ?? null,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens: data.inputTokens + data.outputTokens,
    model: data.model,
    costUsd: data.costUsd.toFixed(6),
  };

  await db.insert(tokenUsage).values(values);
}

/**
 * Get aggregated token usage for a user within a date range.
 *
 * @param userId - The authenticated user's UUID
 * @param startDate - Start of the period (inclusive)
 * @param endDate - Optional end of the period (exclusive)
 * @returns Aggregated usage summary (tokens, cost)
 */
export async function getUserUsageByPeriod(
  userId: string,
  startDate: Date,
  endDate?: Date
): Promise<UsageSummary> {
  const conditions = [
    eq(tokenUsage.userId, userId),
    gte(tokenUsage.createdAt, startDate),
  ];

  if (endDate) {
    const { lt } = await import("drizzle-orm");
    conditions.push(lt(tokenUsage.createdAt, endDate));
  }

  const result = await db
    .select({
      totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${tokenUsage.costUsd}::numeric), 0)`,
      inputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
      outputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
    })
    .from(tokenUsage)
    .where(and(...conditions));

  const row = result[0];
  return {
    totalTokens: Number(row?.totalTokens ?? 0),
    totalCost: Number(row?.totalCost ?? 0),
    inputTokens: Number(row?.inputTokens ?? 0),
    outputTokens: Number(row?.outputTokens ?? 0),
  };
}

/**
 * Get token usage for the current day (UTC).
 *
 * @param userId - The authenticated user's UUID
 * @returns Today's aggregated usage summary
 */
export async function getUserDailyUsage(
  userId: string
): Promise<UsageSummary> {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return getUserUsageByPeriod(userId, startOfDay);
}

/**
 * Get token usage for the current month (UTC).
 *
 * @param userId - The authenticated user's UUID
 * @returns This month's aggregated usage summary
 */
export async function getUserMonthlyUsage(
  userId: string
): Promise<UsageSummary> {
  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  return getUserUsageByPeriod(userId, startOfMonth);
}

/**
 * Get token usage for a specific conversation.
 *
 * @param conversationId - The conversation UUID
 * @returns Aggregated usage summary for the conversation
 */
export async function getConversationUsage(
  conversationId: string
): Promise<UsageSummary> {
  const result = await db
    .select({
      totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${tokenUsage.costUsd}::numeric), 0)`,
      inputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
      outputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
    })
    .from(tokenUsage)
    .where(eq(tokenUsage.conversationId, conversationId));

  const row = result[0];
  return {
    totalTokens: Number(row?.totalTokens ?? 0),
    totalCost: Number(row?.totalCost ?? 0),
    inputTokens: Number(row?.inputTokens ?? 0),
    outputTokens: Number(row?.outputTokens ?? 0),
  };
}
