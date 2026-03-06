export interface MindFile {
    name: string;
    displayName: string;
    uri: string;
    mimeType: string;
    localPath: string;
    expires_at?: string;
}

export interface MindData {
    files: MindFile[];
    last_updated: string | null;
}

export interface Manifest {
    minds: Record<string, MindData>;
}

export interface ChatMessage {
    role: "user" | "model";
    text: string;
    timestamp?: Date;
}

export interface GeminiHistoryEntry {
    role: "user" | "model";
    parts: { text?: string; fileData?: { mimeType: string; fileUri: string } }[];
}

export type ErrorType = "API_KEY_MISSING" | "MIND_NOT_FOUND" | "API_ERROR" | "RATE_LIMITED" | "UNKNOWN";

export interface SendMessageResponse {
    success: boolean;
    text?: string;
    error?: string;
    errorType?: ErrorType;
    conversationId?: string;
}
