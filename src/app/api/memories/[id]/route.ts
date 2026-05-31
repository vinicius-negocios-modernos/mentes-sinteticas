/**
 * Memory Management API — Delete Single Memory
 *
 * DELETE /api/memories/{id} — Delete a specific memory
 */

import { auth } from "@/lib/auth";
import { deleteMemory } from "@/lib/services/mind-memories";
import { logger } from "@/lib/logger";
import { t } from "@/lib/i18n";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        { error: t("api.authRequired") },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return Response.json(
        { error: t("api.memoryIdRequired") },
        { status: 400 }
      );
    }

    const deleted = await deleteMemory(id, session.user.id);

    if (!deleted) {
      return Response.json(
        { error: t("api.memoryNotFound") },
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
      { error: t("api.memoryDeleteError") },
      { status: 500 }
    );
  }
}
