/**
 * File URI Auto-Renewal Script
 *
 * Refreshes Gemini File URIs that are expiring within 6 hours.
 * Connects to the database via Drizzle ORM, re-uploads files to Gemini,
 * and updates the file_uri_cache table.
 *
 * Usage: npx tsx scripts/refresh-file-uris.ts
 *
 * Environment: requires DATABASE_URL and GEMINI_API_KEY in .env.local
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, lt, sql } from "drizzle-orm";
import * as path from "node:path";

import {
  GoogleAIFileManager,
  FileState,
} from "@google/generative-ai/server";

import { fileUriCache } from "../src/db/schema/file-uri-cache";
import { knowledgeDocuments } from "../src/db/schema/knowledge-documents";

// ── Config ──────────────────────────────────────────────────────────
const KNOWLEDGE_BASE_ROOT = path.join(process.cwd(), "knowledge_base");
const EXPIRY_BUFFER_HOURS = 6;

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".js": "text/plain",
  ".py": "text/plain",
};

// ── Result tracking ─────────────────────────────────────────────────
interface RefreshResult {
  documents_checked: number;
  documents_refreshed: number;
  documents_failed: number;
  failures: { document_name: string; error: string }[];
}

// ── Helpers ─────────────────────────────────────────────────────────
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "text/plain";
}

async function uploadFileToGemini(
  fileManager: GoogleAIFileManager,
  filePath: string,
  displayName: string,
  mimeType: string
): Promise<{ uri: string; expirationTime: string | undefined }> {
  const uploadResponse = await fileManager.uploadFile(filePath, {
    mimeType,
    displayName,
  });

  // Wait for processing to complete
  let file = await fileManager.getFile(uploadResponse.file.name);
  while (file.state === FileState.PROCESSING) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    file = await fileManager.getFile(uploadResponse.file.name);
  }

  if (file.state === FileState.FAILED) {
    throw new Error(`Gemini file processing failed for "${displayName}"`);
  }

  return {
    uri: file.uri,
    expirationTime: file.expirationTime,
  };
}

// ── Main ────────────────────────────────────────────────────────────
async function refreshFileUris(): Promise<RefreshResult> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Configure it in .env.local");
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set. Configure it in .env.local");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  const fileManager = new GoogleAIFileManager(apiKey);

  const result: RefreshResult = {
    documents_checked: 0,
    documents_refreshed: 0,
    documents_failed: 0,
    failures: [],
  };

  try {
    // Query file_uri_cache entries expiring within the buffer window
    // Also include entries with NULL expires_at (never set)
    const expiringEntries = await db
      .select({
        cacheId: fileUriCache.id,
        fileUri: fileUriCache.fileUri,
        mimeType: fileUriCache.mimeType,
        expiresAt: fileUriCache.expiresAt,
        docId: knowledgeDocuments.id,
        displayName: knowledgeDocuments.displayName,
        localPath: knowledgeDocuments.localPath,
      })
      .from(fileUriCache)
      .innerJoin(
        knowledgeDocuments,
        eq(fileUriCache.knowledgeDocumentId, knowledgeDocuments.id)
      )
      .where(
        lt(
          fileUriCache.expiresAt,
          sql`NOW() + INTERVAL '${sql.raw(String(EXPIRY_BUFFER_HOURS))} hours'`
        )
      );

    // Also get entries with NULL expiresAt (should always be refreshed)
    const nullExpiryEntries = await db
      .select({
        cacheId: fileUriCache.id,
        fileUri: fileUriCache.fileUri,
        mimeType: fileUriCache.mimeType,
        expiresAt: fileUriCache.expiresAt,
        docId: knowledgeDocuments.id,
        displayName: knowledgeDocuments.displayName,
        localPath: knowledgeDocuments.localPath,
      })
      .from(fileUriCache)
      .innerJoin(
        knowledgeDocuments,
        eq(fileUriCache.knowledgeDocumentId, knowledgeDocuments.id)
      )
      .where(sql`${fileUriCache.expiresAt} IS NULL`);

    const allEntries = [...expiringEntries, ...nullExpiryEntries];
    result.documents_checked = allEntries.length;

    console.log(
      `Found ${allEntries.length} document(s) needing URI refresh.`
    );

    for (const entry of allEntries) {
      const docName = entry.displayName;
      try {
        if (!entry.localPath) {
          throw new Error(`No local_path set for document "${docName}"`);
        }

        const fullPath = path.join(KNOWLEDGE_BASE_ROOT, entry.localPath);
        const mimeType = entry.mimeType || getMimeType(fullPath);

        console.log(`Refreshing: "${docName}" ...`);

        const uploaded = await uploadFileToGemini(
          fileManager,
          fullPath,
          docName,
          mimeType
        );

        // Update the cache entry
        const newExpiresAt = uploaded.expirationTime
          ? new Date(uploaded.expirationTime)
          : null;

        await db
          .update(fileUriCache)
          .set({
            fileUri: uploaded.uri,
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(fileUriCache.id, entry.cacheId));

        console.log(`  Refreshed. New URI: ${uploaded.uri}`);
        if (newExpiresAt) {
          console.log(`  Expires at: ${newExpiresAt.toISOString()}`);
        }

        result.documents_refreshed++;
      } catch (error) {
        const errMsg =
          error instanceof Error ? error.message : String(error);
        console.error(`  FAILED: ${docName} — ${errMsg}`);
        result.documents_failed++;
        result.failures.push({
          document_name: docName,
          error: errMsg,
        });
      }
    }
  } finally {
    await client.end();
  }

  return result;
}

// ── Entry point ─────────────────────────────────────────────────────
refreshFileUris()
  .then((result) => {
    // Output structured JSON log
    console.log("\n--- Refresh Summary (JSON) ---");
    console.log(JSON.stringify(result, null, 2));

    if (result.documents_failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Refresh script failed:", err);
    process.exit(1);
  });
