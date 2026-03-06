/**
 * Upload Knowledge Base documents to Supabase Storage.
 *
 * PLACEHOLDER SCRIPT — Supabase Storage requires a live project with
 * the "knowledge-base" bucket created. This script documents the
 * process and provides the implementation to run once the bucket exists.
 *
 * Prerequisites:
 *   1. Create bucket "knowledge-base" in Supabase Dashboard > Storage
 *   2. Set bucket to private (no public access)
 *   3. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local
 *
 * Usage: npx tsx scripts/upload-to-storage.ts
 *
 * Idempotent — skips files that already exist in the bucket.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

import { minds } from "../src/db/schema/minds";
import { knowledgeDocuments } from "../src/db/schema/knowledge-documents";

const BUCKET_NAME = "knowledge-base";
const KB_BASE_DIR = path.resolve(__dirname, "../knowledge_base");

async function upload() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const connectionString = process.env.DATABASE_URL;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    console.log("\nTo set up Supabase Storage:");
    console.log("  1. Go to Supabase Dashboard > Storage");
    console.log(`  2. Create a private bucket named "${BUCKET_NAME}"`);
    console.log("  3. Add SUPABASE_SERVICE_ROLE_KEY to .env.local");
    console.log("  4. Re-run this script");
    process.exit(1);
  }

  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  // Get all minds from DB
  const allMinds = await db.select().from(minds);
  console.log(`Found ${allMinds.length} mind(s) in DB.\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const mind of allMinds) {
    console.log(`Processing mind: "${mind.name}" (slug: ${mind.slug})`);

    // Get knowledge documents for this mind
    const docs = await db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.mindId, mind.id));

    for (const doc of docs) {
      if (!doc.localPath) {
        console.log(`  Skipping "${doc.displayName}" — no localPath.`);
        skipped++;
        continue;
      }

      const localFile = path.join(KB_BASE_DIR, doc.localPath);
      const storagePath = `${mind.slug}/${doc.localPath}`;

      // Check if file exists locally
      if (!fs.existsSync(localFile)) {
        console.log(`  WARNING: Local file not found: ${localFile}`);
        errors++;
        continue;
      }

      // Check if already uploaded (storage_path set)
      if (doc.storagePath) {
        console.log(`  Already uploaded: "${doc.displayName}"`);
        skipped++;
        continue;
      }

      // Upload to Supabase Storage
      const fileBuffer = fs.readFileSync(localFile);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: "text/plain",
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message?.includes("already exists")) {
          console.log(`  Already in bucket: "${doc.displayName}"`);
          skipped++;
        } else {
          console.error(
            `  Upload failed for "${doc.displayName}":`,
            uploadError.message
          );
          errors++;
          continue;
        }
      } else {
        console.log(`  Uploaded: "${doc.displayName}" -> ${storagePath}`);
        uploaded++;
      }

      // Update storage_path in DB
      await db
        .update(knowledgeDocuments)
        .set({ storagePath: `${BUCKET_NAME}/${storagePath}` })
        .where(eq(knowledgeDocuments.id, doc.id));
    }
  }

  console.log(`\nDone. Uploaded: ${uploaded}, Skipped: ${skipped}, Errors: ${errors}`);
  await client.end();
  process.exit(errors > 0 ? 1 : 0);
}

upload().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
