import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  minds,
  knowledgeDocuments,
  type Mind,
  type KnowledgeDocument,
} from "@/db/schema";

/**
 * Get a mind by its URL slug (e.g. "antonio-napole").
 */
export async function getMindBySlug(slug: string): Promise<Mind | null> {
  const [mind] = await db
    .select()
    .from(minds)
    .where(eq(minds.slug, slug))
    .limit(1);

  return mind ?? null;
}

/**
 * Get a mind by its display name (e.g. "Antonio Napole").
 * Used for backward compatibility with manifest-based code.
 */
export async function getMindByName(name: string): Promise<Mind | null> {
  const [mind] = await db
    .select()
    .from(minds)
    .where(eq(minds.name, name))
    .limit(1);

  return mind ?? null;
}

/**
 * List all active minds. Returns display names for backward compat.
 */
export async function listActiveMinds(): Promise<Mind[]> {
  return db
    .select()
    .from(minds)
    .where(eq(minds.isActive, true))
    .orderBy(minds.name);
}

/**
 * List active mind names (string[]). Drop-in replacement for getAvailableMinds().
 */
export async function listActiveMindNames(): Promise<string[]> {
  const activeMindRows = await listActiveMinds();
  return activeMindRows.map((m) => m.name);
}

/**
 * Get a mind with its knowledge documents.
 */
export async function getMindWithDocuments(
  mindId: string
): Promise<{ mind: Mind; documents: KnowledgeDocument[] } | null> {
  const [mind] = await db
    .select()
    .from(minds)
    .where(eq(minds.id, mindId))
    .limit(1);

  if (!mind) return null;

  const documents = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.mindId, mindId));

  return { mind, documents };
}
