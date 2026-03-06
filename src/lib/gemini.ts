
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { eq } from "drizzle-orm";
import { promises as fsp } from "fs";
import path from "path";
import type { MindData, Manifest, GeminiHistoryEntry } from "@/lib/types";
import { getConfig } from "@/lib/config";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
        const config = getConfig();
        genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
    return genAI;
}

const MANIFEST_PATH = path.join(process.cwd(), "data", "minds_manifest.json");

// ── Manifest-based file URI reading (legacy fallback) ───────────────
async function readManifest(): Promise<Manifest | null> {
    try {
        const data = await fsp.readFile(MANIFEST_PATH, "utf-8");
        return JSON.parse(data) as Manifest;
    } catch {
        return null;
    }
}

export async function getMindManifest(mindName: string): Promise<MindData | null> {
    const manifest = await readManifest();
    if (!manifest) return null;
    return manifest.minds[mindName] || null;
}

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
async function getMindFromDb(mindName: string): Promise<DbMindInfo | null> {
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
 * Returns null if DB is unavailable or mind not found — caller should
 * fall back to manifest.
 */
async function getFileUrisFromDb(mindName: string): Promise<FileUriEntry[] | null> {
    try {
        // Dynamic import to avoid breaking build when DATABASE_URL is not set
        const { getDb } = await import("@/db");
        const { minds } = await import("@/db/schema/minds");
        const { knowledgeDocuments } = await import("@/db/schema/knowledge-documents");
        const { fileUriCache } = await import("@/db/schema/file-uri-cache");

        const db = getDb();

        // Find mind by name
        const [mind] = await db
            .select({ id: minds.id })
            .from(minds)
            .where(eq(minds.name, mindName))
            .limit(1);

        if (!mind) return null;

        // Get file URIs via knowledge_documents join
        const entries = await db
            .select({
                fileUri: fileUriCache.fileUri,
                mimeType: fileUriCache.mimeType,
            })
            .from(fileUriCache)
            .innerJoin(
                knowledgeDocuments,
                eq(fileUriCache.knowledgeDocumentId, knowledgeDocuments.id)
            )
            .where(eq(knowledgeDocuments.mindId, mind.id));

        if (entries.length === 0) return null;

        return entries;
    } catch {
        // DB unavailable — graceful degradation
        return null;
    }
}

/**
 * Get file parts (URI + mimeType) for a mind, trying DB first then manifest.
 */
async function getFileParts(
    mindName: string
): Promise<{ fileData: { mimeType: string; fileUri: string } }[]> {
    // Try DB first
    const dbEntries = await getFileUrisFromDb(mindName);
    if (dbEntries && dbEntries.length > 0) {
        return dbEntries.map((e) => ({
            fileData: {
                mimeType: e.mimeType || "text/plain",
                fileUri: e.fileUri,
            },
        }));
    }

    // Fall back to manifest
    const mindData = await getMindManifest(mindName);
    if (!mindData) return [];

    return mindData.files.map((f) => ({
        fileData: {
            mimeType: f.mimeType,
            fileUri: f.uri,
        },
    }));
}

export async function createMindChat(mindName: string, history: GeminiHistoryEntry[] = []) {
    // Verify mind exists (DB primary, manifest fallback)
    const fileParts = await getFileParts(mindName);

    if (fileParts.length === 0) {
        // Check DB first, then manifest
        const dbMind = await getMindFromDb(mindName);
        if (!dbMind) {
            const mindData = await getMindManifest(mindName);
            if (!mindData) {
                throw new Error(`Mind '${mindName}' not found.`);
            }
        }
    }

    const config = getConfig();

    // Create the model with the system instruction
    const model = getGenAI().getGenerativeModel({
        model: config.GEMINI_MODEL,
        systemInstruction: `You are the digital clone of ${mindName}.
    You have access to your complete body of work and knowledge base via the attached files.
    Always answer based on your specific philosophy, tone, and writings.
    If the user asks something outside your domain, relate it back to your principles.
    Maintain the persona at all costs. Be ${mindName}.`
    });

    const generationConfig = {
        temperature: config.GEMINI_TEMPERATURE,
        topK: config.GEMINI_TOP_K,
        topP: config.GEMINI_TOP_P,
        maxOutputTokens: config.GEMINI_MAX_OUTPUT_TOKENS,
    };

    let chatHistory: Content[] = history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => {
            if (p.fileData) return { fileData: p.fileData };
            return { text: p.text ?? "" };
        }),
    }));

    if (fileParts.length > 0) {
        chatHistory = [
            {
                role: "user",
                parts: [
                    ...fileParts,
                    { text: "Estude estes arquivos. Eles são a sua memória e conhecimento. Encarnar a persona descrita." }
                ]
            },
            {
                role: "model",
                parts: [{ text: `Entendido. Eu sou ${mindName}. Estou pronto.` }]
            },
            ...chatHistory
        ];
    }

    const chat = model.startChat({
        generationConfig,
        history: chatHistory,
    });

    return chat;
}
