/**
 * Seed script: migrates minds_manifest.json into Supabase via Drizzle ORM.
 *
 * Usage: npx tsx scripts/seed-db.ts
 *
 * Idempotent — uses ON CONFLICT DO NOTHING for minds (by slug)
 * and skips existing knowledge_documents (by mind_id + display_name).
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
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

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Configure it in .env.local");
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  const manifestPath = path.resolve(__dirname, "../data/minds_manifest.json");
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest: Manifest = JSON.parse(raw);

  console.log(
    `Found ${Object.keys(manifest.minds).length} mind(s) in manifest.`
  );

  for (const [mindName, mindData] of Object.entries(manifest.minds)) {
    const slug = mindName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    console.log(`\nProcessing mind: "${mindName}" (slug: ${slug})`);

    // Upsert mind — insert if not exists
    const existingMinds = await db
      .select()
      .from(minds)
      .where(eq(minds.slug, slug))
      .limit(1);

    let mindId: string;

    if (existingMinds.length > 0) {
      mindId = existingMinds[0].id;
      console.log(`  Mind already exists (id: ${mindId}). Skipping insert.`);
    } else {
      const [inserted] = await db
        .insert(minds)
        .values({
          slug,
          name: mindName,
          title: null,
          era: null,
          nationality: null,
          systemPrompt: null,
          personalityTraits: null,
          greeting: null,
          avatarUrl: null,
          isActive: true,
        })
        .returning({ id: minds.id });

      mindId = inserted.id;
      console.log(`  Inserted mind (id: ${mindId}).`);
    }

    // Insert knowledge documents + file URI cache
    for (const file of mindData.files) {
      // Check if document already exists for this mind
      const existingDocs = await db
        .select()
        .from(knowledgeDocuments)
        .where(
          and(
            eq(knowledgeDocuments.mindId, mindId),
            eq(knowledgeDocuments.displayName, file.displayName)
          )
        )
        .limit(1);

      if (existingDocs.length > 0) {
        console.log(`  Doc "${file.displayName}" already exists. Skipping.`);
        continue;
      }

      const [doc] = await db
        .insert(knowledgeDocuments)
        .values({
          mindId,
          displayName: file.displayName,
          localPath: file.localPath,
          description: null,
        })
        .returning({ id: knowledgeDocuments.id });

      // Insert file URI cache entry
      await db.insert(fileUriCache).values({
        knowledgeDocumentId: doc.id,
        fileUri: file.uri,
        mimeType: file.mimeType,
        expiresAt: file.expires_at ? new Date(file.expires_at) : null,
      });

      console.log(`  Inserted doc "${file.displayName}" + URI cache.`);
    }
  }

  console.log("\nSeed completed successfully.");
  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
