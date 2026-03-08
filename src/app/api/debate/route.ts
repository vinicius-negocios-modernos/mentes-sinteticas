import { createClient } from "@/lib/supabase/server";
import { CreateDebateSchema } from "@/lib/validations/debate";
import { createDebate } from "@/lib/services/debates";
import {
  checkRateLimit,
  incrementRateLimit,
  DEFAULT_LIMITS,
} from "@/lib/services/rate-limiter";
import { logger } from "@/lib/logger";

/** Rate limit config for debate creation: max 5 per hour. */
const DEBATE_CREATE_LIMIT = {
  maxRequests: 5,
  windowSeconds: 3600,
};

export async function POST(request: Request) {
  try {
    // ── Parse & validate ──────────────────────────────────────────────
    const body = await request.json();
    const validation = CreateDebateSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((i) => i.message).join(" ");
      return Response.json({ error: errors }, { status: 400 });
    }

    const { topic, participantSlugs } = validation.data;

    // ── Authenticate ──────────────────────────────────────────────────
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

    // ── Rate limit ────────────────────────────────────────────────────
    const rateLimitResult = await checkRateLimit(user.id, "createDebate", [
      { name: "per-hour", config: DEBATE_CREATE_LIMIT },
    ]);

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: `Limite de ${rateLimitResult.maxAllowed} debates por hora atingido. Tente novamente em ${rateLimitResult.retryAfterSeconds} segundos.`,
        },
        { status: 429 }
      );
    }

    // ── Create debate ─────────────────────────────────────────────────
    const { debate, participants } = await createDebate(
      user.id,
      topic,
      participantSlugs
    );

    await incrementRateLimit(user.id, "createDebate");

    logger.info(`[debate] Created debate ${debate.id} with ${participants.length} participants`);

    return Response.json(
      {
        debateId: debate.id,
        topic: debate.topic,
        participants,
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("nao encontrada")) {
      return Response.json({ error: msg }, { status: 404 });
    }

    logger.error(
      "Error creating debate:",
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json(
      { error: "Erro ao criar debate. Tente novamente." },
      { status: 500 }
    );
  }
}
