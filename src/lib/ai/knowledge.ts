import { eq } from "drizzle-orm";
import { promises as fsp } from "fs";
import path from "path";
import type { MindData, Manifest } from "@/lib/types";
import { ManifestSchema } from "@/lib/validations/manifest";
import { logger } from "@/lib/logger";

const MANIFEST_PATH = path.join(process.cwd(), "data", "minds_manifest.json");

/**
 * Maximum number of file URIs to send per Gemini request.
 * Gemini free tier has aggressive rate limits on input tokens per minute.
 * Core knowledge modules (M1-M8) are prioritized over analysis documents.
 */
const MAX_FILE_URIS_PER_REQUEST = 8;

// ── Manifest-based file URI reading (legacy fallback) ───────────────

async function readManifest(): Promise<Manifest | null> {
  try {
    const data = await fsp.readFile(MANIFEST_PATH, "utf-8");
    const parsed: unknown = JSON.parse(data);
    const result = ManifestSchema.safeParse(parsed);
    if (!result.success) {
      logger.warn("Manifest validation failed:", { issues: result.error.issues });
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Get mind data from the local manifest file (legacy fallback).
 *
 * @param mindName - The display name of the mind
 * @returns Mind data with files array, or null if not found
 */
export async function getMindManifest(mindName: string): Promise<MindData | null> {
  const manifest = await readManifest();
  if (!manifest) return null;
  return manifest.minds[mindName] || null;
}

/**
 * Get all available mind names from the local manifest (legacy fallback).
 *
 * @returns Array of mind names, or empty array if manifest unavailable
 */
export async function getAvailableMinds(): Promise<string[]> {
  const manifest = await readManifest();
  if (!manifest) return [];
  return Object.keys(manifest.minds);
}

// ── DB-based mind lookup (primary) ───────────────────────────────────

interface DbMindInfo {
  id: string;
  name: string;
}

/**
 * Look up a mind by name in the database.
 * Returns null if DB unavailable or mind not found.
 */
export async function getMindFromDb(mindName: string): Promise<DbMindInfo | null> {
  try {
    const { getDb } = await import("@/db");
    const { minds } = await import("@/db/schema/minds");

    const db = getDb();
    const [mind] = await db
      .select({ id: minds.id, name: minds.name })
      .from(minds)
      .where(eq(minds.name, mindName))
      .limit(1);

    return mind ?? null;
  } catch {
    return null;
  }
}

// ── DB-based file URI reading (primary) ─────────────────────────────

interface FileUriEntry {
  fileUri: string;
  mimeType: string | null;
}

/**
 * Retrieve file URIs for a mind from the database (file_uri_cache).
 * Returns null if DB is unavailable or mind not found -- caller should
 * fall back to manifest.
 */
export async function getFileUrisFromDb(mindName: string): Promise<FileUriEntry[] | null> {
  try {
    const { getDb } = await import("@/db");
    const { minds } = await import("@/db/schema/minds");
    const { knowledgeDocuments } = await import("@/db/schema/knowledge-documents");
    const { fileUriCache } = await import("@/db/schema/file-uri-cache");

    const db = getDb();

    const [mind] = await db
      .select({ id: minds.id })
      .from(minds)
      .where(eq(minds.name, mindName))
      .limit(1);

    if (!mind) return null;

    const now = new Date();

    const allEntries = await db
      .select({
        fileUri: fileUriCache.fileUri,
        mimeType: fileUriCache.mimeType,
        expiresAt: fileUriCache.expiresAt,
      })
      .from(fileUriCache)
      .innerJoin(
        knowledgeDocuments,
        eq(fileUriCache.knowledgeDocumentId, knowledgeDocuments.id)
      )
      .where(eq(knowledgeDocuments.mindId, mind.id));

    if (allEntries.length === 0) return null;

    // Filter out expired URIs
    const validEntries = allEntries.filter((e) => {
      if (!e.expiresAt) return true; // No expiration = always valid
      return e.expiresAt > now;
    });

    const expiredCount = allEntries.length - validEntries.length;
    if (expiredCount > 0) {
      logger.warn(
        `Filtered out ${expiredCount}/${allEntries.length} expired file URIs for mind "${mindName}"`
      );
    }

    if (validEntries.length === 0) {
      logger.error(
        `All ${allEntries.length} file URIs for mind "${mindName}" are expired. ` +
          `Re-run scripts/ingest_mind.ts to generate fresh URIs.`
      );
      return null;
    }

    return validEntries.map(({ fileUri, mimeType }) => ({ fileUri, mimeType }));
  } catch {
    return null;
  }
}

/**
 * Get file parts (URI + mimeType) for a mind, trying DB first then manifest.
 */
export async function getFileParts(
  mindName: string
): Promise<{ fileData: { mimeType: string; fileUri: string } }[]> {
  // Try DB first
  const dbEntries = await getFileUrisFromDb(mindName);
  if (dbEntries && dbEntries.length > 0) {
    const cappedEntries = dbEntries.slice(0, MAX_FILE_URIS_PER_REQUEST);
    if (dbEntries.length > MAX_FILE_URIS_PER_REQUEST) {
      logger.info(
        `Capped file URIs from ${dbEntries.length} to ${MAX_FILE_URIS_PER_REQUEST} for mind "${mindName}"`
      );
    }
    return cappedEntries.map((e) => ({
      fileData: {
        mimeType: e.mimeType || "text/plain",
        fileUri: e.fileUri,
      },
    }));
  }

  // Fall back to manifest
  const mindData = await getMindManifest(mindName);
  if (!mindData) return [];

  const cappedFiles = mindData.files.slice(0, MAX_FILE_URIS_PER_REQUEST);
  return cappedFiles.map((f) => ({
    fileData: {
      mimeType: f.mimeType,
      fileUri: f.uri,
    },
  }));
}
