/**
 * Validation script: compares minds and knowledge documents in DB vs manifest.
 *
 * Usage: npx tsx scripts/validate-db-manifest.ts
 *
 * Exit codes:
 *   0 — DB matches manifest (100% parity)
 *   1 — Mismatches found
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

import { minds } from "../src/db/schema/minds";
import { knowledgeDocuments } from "../src/db/schema/knowledge-documents";
import { fileUriCache } from "../src/db/schema/file-uri-cache";

interface ManifestFile {
  name: string;
  displayName: string;
  uri: string;
  mimeType: string;
  localPath: string;
  expires_at?: string;
}

interface ManifestMind {
  files: ManifestFile[];
  last_updated: string | null;
}

interface Manifest {
  minds: Record<string, ManifestMind>;
}

async function validate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const manifestPath = path.resolve(__dirname, "../data/minds_manifest.json");
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest: Manifest = JSON.parse(raw);

  const manifestMindNames = Object.keys(manifest.minds);
  let mismatches = 0;

  console.log("=== DB vs Manifest Validation ===\n");

  // 1. Check mind count
  const dbMinds = await db.select().from(minds);
  console.log(`Manifest minds: ${manifestMindNames.length}`);
  console.log(`DB minds:       ${dbMinds.length}`);

  if (manifestMindNames.length !== dbMinds.length) {
    console.log("  MISMATCH: mind count differs.\n");
    mismatches++;
  } else {
    console.log("  OK: mind count matches.\n");
  }

  // 2. Check each manifest mind exists in DB with matching data
  for (const [mindName, mindData] of Object.entries(manifest.minds)) {
    console.log(`--- Mind: "${mindName}" ---`);

    const dbMind = dbMinds.find((m) => m.name === mindName);
    if (!dbMind) {
      console.log("  MISMATCH: mind not found in DB.");
      mismatches++;
      continue;
    }

    console.log(`  DB id: ${dbMind.id}, slug: ${dbMind.slug}`);

    // Compare knowledge documents count
    const dbDocs = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.mindId, dbMind.id));

    console.log(`  Manifest docs: ${mindData.files.length}`);
    console.log(`  DB docs:       ${dbDocs.length}`);

    if (mindData.files.length !== dbDocs.length) {
      console.log("  MISMATCH: document count differs.");
      mismatches++;
    } else {
      console.log("  OK: document count matches.");
    }

    // Compare individual documents by displayName
    for (const file of mindData.files) {
      const dbDoc = dbDocs.find((d) => d.displayName === file.displayName);
      if (!dbDoc) {
        console.log(`  MISMATCH: doc "${file.displayName}" not in DB.`);
        mismatches++;
        continue;
      }

      // Check file URI cache entry exists
      const [cacheEntry] = await db
        .select()
        .from(fileUriCache)
        .where(eq(fileUriCache.knowledgeDocumentId, dbDoc.id))
        .limit(1);

      if (!cacheEntry) {
        console.log(
          `  MISMATCH: no URI cache for "${file.displayName}".`
        );
        mismatches++;
      }
    }

    // Check for DB docs not in manifest
    for (const dbDoc of dbDocs) {
      const manifestDoc = mindData.files.find(
        (f) => f.displayName === dbDoc.displayName
      );
      if (!manifestDoc) {
        console.log(
          `  MISMATCH: DB doc "${dbDoc.displayName}" not in manifest.`
        );
        mismatches++;
      }
    }

    console.log();
  }

  // 3. Check for DB minds not in manifest
  for (const dbMind of dbMinds) {
    if (!manifestMindNames.includes(dbMind.name)) {
      console.log(
        `MISMATCH: DB mind "${dbMind.name}" not in manifest.\n`
      );
      mismatches++;
    }
  }

  // Summary
  console.log("=== Summary ===");
  if (mismatches === 0) {
    console.log("PASS: DB matches manifest 100%.");
  } else {
    console.log(`FAIL: ${mismatches} mismatch(es) found.`);
  }

  await client.end();
  process.exit(mismatches > 0 ? 1 : 0);
}

validate().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
