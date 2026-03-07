
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
                }
            }
        }
    }

    console.log(`Starting ingestion for: ${mindName}`);
    await walkAndUpload(mindPath);
    console.log("Ingestion complete!");
}

main();
