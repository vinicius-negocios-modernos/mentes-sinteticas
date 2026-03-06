
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
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

export async function createMindChat(mindName: string, history: GeminiHistoryEntry[] = []) {
    const mindData = await getMindManifest(mindName);

    if (!mindData) {
        throw new Error(`Mind '${mindName}' not found in manifest.`);
    }

    const config = getConfig();

    // Create the model with the system instruction and tools/files
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

    // Content for the first message (or system initialization)
    // We need to attach the files to the history or the model initialization?
    // In the new API, we can't just pass file URIs to 'getGenerativeModel' directly in all SDK versions efficiently as 'tools', 
    // but we can pass them in the 'generateContent' or 'startChat' history.
    // The persistent way is using 'cachedContent' but let's stick to passing URIs in history for now as it's simpler for distinct sessions.
    // Actually, for a chat, we put the file parts in the 'history' of the chat.

    const fileParts = mindData.files.map(f => ({
        fileData: {
            mimeType: f.mimeType,
            fileUri: f.uri
        }
    }));

    // We add the files to the first history turn if it's empty, or assume they are "context".
    // A better pattern for long context chat is to have a "system" turn with files, but Gemini usually treats files as User parts.

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
