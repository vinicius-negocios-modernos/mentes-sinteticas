import { auth } from "@/lib/auth";
import { CreateDebateSchema } from "@/lib/validations/debate";
import { createDebate } from "@/lib/services/debates";
import {
  checkRateLimit,
  incrementRateLimit,
  DEFAULT_LIMITS,
} from "@/lib/services/rate-limiter";
import { logger } from "@/lib/logger";
import { t } from "@/lib/i18n";

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
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        { error: t("api.sessionExpired") },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ── Rate limit ────────────────────────────────────────────────────
    const rateLimitResult = await checkRateLimit(userId, "createDebate", [
      { name: "per-hour", config: DEBATE_CREATE_LIMIT },
    ]);

    if (!rateLimitResult.allowed) {
      return Response.json(
        {
          error: t("api.debateRateLimited", {
            maxAllowed: String(rateLimitResult.maxAllowed),
            retryAfter: String(rateLimitResult.retryAfterSeconds),
          }),
        },
        { status: 429 }
      );
    }

    // ── Create debate ─────────────────────────────────────────────────
    const { debate, participants } = await createDebate(
      userId,
      topic,
      participantSlugs
    );

    await incrementRateLimit(userId, "createDebate");

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
      { error: t("api.debateCreateError") },
      { status: 500 }
    );
  }
}
