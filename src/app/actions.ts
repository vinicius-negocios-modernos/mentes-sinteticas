"use server";

import { createMindChat, getAvailableMinds } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { GeminiHistoryEntry, SendMessageResponse, ErrorType } from "@/lib/types";

export async function getMinds() {
    return await getAvailableMinds();
}

function classifyError(error: unknown): { message: string; type: ErrorType } {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("GEMINI_API_KEY")) {
        return { message: "Chave da API nao configurada. Contate o administrador.", type: "API_KEY_MISSING" };
    }
    if (msg.includes("not found in manifest")) {
        return { message: "Esta mente nao foi encontrada no sistema.", type: "MIND_NOT_FOUND" };
    }
    if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
        return { message: "Limite de requisicoes atingido. Aguarde um momento e tente novamente.", type: "RATE_LIMITED" };
    }
    return { message: "Erro ao processar sua mensagem. Tente novamente.", type: "API_ERROR" };
}

export async function sendMessage(mindName: string, message: string, history: GeminiHistoryEntry[]): Promise<SendMessageResponse> {
    try {
        // Verify authenticated session before allowing chat
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return {
                success: false,
                error: "Sessao expirada. Faca login novamente.",
                errorType: "API_ERROR",
            };
        }

        // user.id available for future use (Story 2.3 — conversation persistence)
        const _userId = user.id;
        void _userId;

        const chat = await createMindChat(mindName, history);
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return { success: true, text };
    } catch (error) {
        const classified = classifyError(error);
        return { success: false, error: classified.message, errorType: classified.type };
    }
}
