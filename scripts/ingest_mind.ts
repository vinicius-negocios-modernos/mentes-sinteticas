
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { eq, and } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

// Lazy DB imports — only used if DATABASE_URL is available
let dbModule: typeof import("../src/db/index") | null = null;
let schemaModule: typeof import("../src/db/schema/index") | null = null;

async function getDbModules() {
    if (!dbModule) {
        dbModule = await import("../src/db/index");
        schemaModule = await import("../src/db/schema/index");
    }
    return { db: dbModule.db, schema: schemaModule! };
}

const DB_ENABLED = !!process.env.DATABASE_URL;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in .env.local");
}

const fileManager = new GoogleAIFileManager(apiKey);

const MANIFEST_PATH = path.join(process.cwd(), "data", "minds_manifest.json");
const KNOWLEDGE_BASE_ROOT = path.join(process.cwd(), "knowledge_base");

// Valid MIMETYPES for Gemini
const MIME_TYPES: Record<string, string> = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".js": "text/plain",
    ".py": "text/plain",
    // Files without extension or unknown will be treated as text/plain
};

async function getManifest() {
    if (!fs.existsSync(MANIFEST_PATH)) {
        return { minds: {} };
    }
    const data = fs.readFileSync(MANIFEST_PATH, "utf-8");
    return JSON.parse(data);
}

async function saveManifest(data: any) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(data, null, 2));
}

async function uploadFile(filePath: string, displayName: string, mimeType: string) {
    console.log(`Uploading: ${displayName} (${mimeType})...`);

    try {
        const uploadResponse = await fileManager.uploadFile(filePath, {
            mimeType,
            displayName,
        });

        console.log(`Uploaded ${displayName}. URI: ${uploadResponse.file.uri}`);

        // Wait for processing
        let file = await fileManager.getFile(uploadResponse.file.name);
        process.stdout.write(`Processing ${displayName}`);

        while (file.state === FileState.PROCESSING) {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResponse.file.name);
        }
        console.log(`\nState: ${file.state}`);

        if (file.state === FileState.FAILED) {
            throw new Error(`Gemini file processing failed for "${displayName}" (state: ${file.state}).`);
        }

        return file;

    } catch (error) {
        console.error(`Error uploading ${displayName}:`, error);
        return null;
    }
}

async function upsertFileUriCache(
    relativePath: string,
    mindName: string,
    fileUri: string,
    mimeType: string,
    expiresAt: string | null,
) {
    if (!DB_ENABLED) return;

    try {
        const { db, schema } = await getDbModules();

        // Find the mind by name
        const mind = await db.query.minds.findFirst({
            where: eq(schema.minds.name, mindName),
        });
        if (!mind) {
            console.warn(`[DB] Mind "${mindName}" not found in database, skipping cache upsert.`);
            return;
        }

        // Find the knowledge document by localPath and mindId
        const doc = await db.query.knowledgeDocuments.findFirst({
            where: and(
                eq(schema.knowledgeDocuments.localPath, relativePath),
                eq(schema.knowledgeDocuments.mindId, mind.id),
            ),
        });
        if (!doc) {
            console.warn(`[DB] Knowledge document not found for "${relativePath}", skipping cache upsert.`);
            return;
        }

        // Check if a cache entry already exists for this document
        const existing = await db.query.fileUriCache.findFirst({
            where: eq(schema.fileUriCache.knowledgeDocumentId, doc.id),
        });

        if (existing) {
            // Update existing entry
            await db
                .update(schema.fileUriCache)
                .set({
                    fileUri,
                    mimeType,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.fileUriCache.id, existing.id));
        } else {
            // Insert new entry
            await db
                .insert(schema.fileUriCache)
                .values({
                    knowledgeDocumentId: doc.id,
                    fileUri,
                    mimeType,
                    expiresAt: expiresAt ? new Date(expiresAt) : null,
                });
        }

        console.log(`[DB] Cached file URI for "${relativePath}" (expires: ${expiresAt || "unknown"})`);
    } catch (error) {
        console.warn(`[DB] Failed to cache file URI for "${relativePath}":`, error);
        // Don't stop the script — manifest JSON is the backup
    }
}

async function main() {

    // Get mind name from command line
    const mindName = process.argv[2];
    if (!mindName) {
        console.error("Please provide the Mind Name as an argument. Example: npx tsx scripts/ingest_mind.ts \"Antonio Napole\"");
        process.exit(1);
    }

    const mindPath = path.join(KNOWLEDGE_BASE_ROOT, mindName);
    if (!fs.existsSync(mindPath)) {
        console.error(`Directory not found: ${mindPath}`);
        process.exit(1);
    }

    const manifest = await getManifest();
    if (!manifest.minds[mindName]) {
        manifest.minds[mindName] = { files: [], last_updated: null };
    }

    const existingUris = new Set(manifest.minds[mindName].files.map((f: any) => f.uri));
    const processedFiles: any[] = [...manifest.minds[mindName].files];

    // Recursive function to walk directories
    async function walkAndUpload(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walkAndUpload(fullPath);
            } else if (entry.isFile()) {
                // Determine mime type
                const ext = path.extname(entry.name).toLowerCase();
                // Default to text/plain if extension is missing or not explicitly mapped but arguably text
                let mimeType = MIME_TYPES[ext] || "text/plain";

                // Skip hidden files (like .DS_Store)
                if (entry.name.startsWith(".")) continue;

                const relativePath = path.relative(KNOWLEDGE_BASE_ROOT, fullPath);

                // Check if already uploaded (simple check by name/path not hash for now, but good enough)
                const alreadyExists = processedFiles.some(f => f.localPath === relativePath && existingUris.has(f.uri));

                if (alreadyExists) {
                    console.log(`Skipping existing: ${relativePath}`);
                    continue;
                }

                const fileData = await uploadFile(fullPath, entry.name, mimeType);
                if (fileData) {
                    processedFiles.push({
                        name: fileData.name, // unique ID from Google
                        displayName: fileData.displayName,
                        uri: fileData.uri,
                        mimeType: fileData.mimeType,
                        localPath: relativePath,
                        expires_at: fileData.expirationTime || null
                    });
                    // Save incrementally just in case
                    manifest.minds[mindName].files = processedFiles;
                    manifest.minds[mindName].last_updated = new Date().toISOString();
                    await saveManifest(manifest);

                    // Persist to database file_uri_cache table
                    await upsertFileUriCache(
                        relativePath,
                        mindName,
                        fileData.uri,
                        fileData.mimeType || mimeType,
                        fileData.expirationTime || null,
                    );
                }
            }
        }
    }

    console.log(`Starting ingestion for: ${mindName}`);
    console.log(`Database caching: ${DB_ENABLED ? "ENABLED" : "DISABLED (set DATABASE_URL to enable)"}`);
    await walkAndUpload(mindPath);
    console.log("Ingestion complete!");
}

main();
