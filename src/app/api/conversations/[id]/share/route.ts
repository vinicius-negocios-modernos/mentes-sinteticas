import { createClient } from "@/lib/supabase/server";
import { shareConversation, unshareConversation } from "@/lib/services/sharing";
import {
  checkRateLimit,
  incrementRateLimit,
} from "@/lib/services/rate-limiter";

/**
 * POST /api/conversations/[id]/share
 * Share a conversation — generates a unique token and returns the public URL.
 * Only the conversation owner can share. Rate limited to 10/hour.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Sessao expirada. Faca login novamente." },
        { status: 401 }
      );
    }

    // Rate limit: max 10 shares per hour
    const rateLimitResult = await checkRateLimit(user.id, "shareConversation", [
      {
        name: "per-hour",
        config: { maxRequests: 10, windowSeconds: 3600 },
      },
    ]);

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: `Limite de compartilhamento atingido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    // Share the conversation
    const result = await shareConversation(conversationId, user.id);

    if (!result) {
      return Response.json(
        { error: "Conversa nao encontrada ou acesso negado." },
        { status: 404 }
      );
    }

    // Increment rate limit counter
    await incrementRateLimit(user.id, "shareConversation");

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${appUrl}/shared/${result.token}`;

    return Response.json({
      token: result.token,
      url,
      sharedAt: result.sharedAt.toISOString(),
    });
  } catch (error) {
    console.error("Share conversation error:", error);
    return Response.json(
      { error: "Erro ao compartilhar conversa." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]/share
 * Revoke sharing — removes the share token.
 * Only the conversation owner can unshare.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Sessao expirada. Faca login novamente." },
        { status: 401 }
      );
    }

    const success = await unshareConversation(conversationId, user.id);

    if (!success) {
      return Response.json(
        { error: "Conversa nao encontrada ou acesso negado." },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Unshare conversation error:", error);
    return Response.json(
      { error: "Erro ao revogar compartilhamento." },
      { status: 500 }
    );
  }
}
