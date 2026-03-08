/**
 * Memory Management API — Delete Single Memory
 *
 * DELETE /api/memories/{id} — Delete a specific memory
 */

import { createClient } from "@/lib/supabase/server";
import { deleteMemory } from "@/lib/services/mind-memories";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
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

    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: "ID da memoria e obrigatorio." },
        { status: 400 }
      );
    }

    const deleted = await deleteMemory(id, user.id);

    if (!deleted) {
      return Response.json(
        { error: "Memoria nao encontrada." },
        { status: 404 }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error(
      "Error deleting memory:",
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: "Erro ao excluir memoria." },
      { status: 500 }
    );
  }
}
