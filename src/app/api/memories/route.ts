/**
 * Memory Management API — List & Bulk Delete
 *
 * GET  /api/memories?mindId={id} — List memories for authenticated user
 * DELETE /api/memories?mindId={id} — Delete all memories for a mind (requires { confirm: true })
 */

import { createClient } from "@/lib/supabase/server";
import {
  getUserMemories,
  deleteAllMemoriesForMind,
} from "@/lib/services/mind-memories";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Autenticacao necessaria." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const mindId = url.searchParams.get("mindId") ?? undefined;

    const memories = await getUserMemories(user.id, mindId);

    return Response.json({ memories });
  } catch (error) {
    logger.error(
      "Error listing memories:",
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: "Erro ao buscar memorias." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Autenticacao necessaria." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const mindId = url.searchParams.get("mindId");

    if (!mindId) {
      return Response.json(
        { error: "mindId e obrigatorio para exclusao em massa." },
        { status: 400 }
      );
    }

    // Require confirmation
    const body = await request.json().catch(() => ({}));
    if (!(body as { confirm?: boolean }).confirm) {
      return Response.json(
        { error: "Confirmacao necessaria. Envie { confirm: true } no body." },
        { status: 400 }
      );
    }

    const deletedCount = await deleteAllMemoriesForMind(user.id, mindId);

    return Response.json({ deleted: deletedCount });
  } catch (error) {
    logger.error(
      "Error bulk deleting memories:",
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: "Erro ao excluir memorias." },
      { status: 500 }
    );
  }
}
