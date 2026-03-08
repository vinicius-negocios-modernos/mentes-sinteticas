import { auth } from "@/lib/auth";
import {
  getUserDailyUsage,
  getUserMonthlyUsage,
} from "@/lib/services/token-usage";
import { TOKEN_LIMITS } from "@/lib/ai/config";

export async function GET() {
  try {
    // ── Authenticate ──────────────────────────────────────────────────
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        { error: "Sessao expirada. Faca login novamente." },
        { status: 401 }
      );
    }

    // ── Fetch usage data ──────────────────────────────────────────────
    const [daily, monthly] = await Promise.all([
      getUserDailyUsage(session.user.id),
      getUserMonthlyUsage(session.user.id),
    ]);

    const dailyPercentage =
      TOKEN_LIMITS.daily > 0
        ? Math.round((daily.totalTokens / TOKEN_LIMITS.daily) * 100)
        : 0;

    const monthlyPercentage =
      TOKEN_LIMITS.monthly > 0
        ? Math.round((monthly.totalTokens / TOKEN_LIMITS.monthly) * 100)
        : 0;

    return Response.json({
      daily: {
        tokens: daily.totalTokens,
        cost: daily.totalCost,
        limit: TOKEN_LIMITS.daily,
        percentage: dailyPercentage,
      },
      monthly: {
        tokens: monthly.totalTokens,
        cost: monthly.totalCost,
        limit: TOKEN_LIMITS.monthly,
        percentage: monthlyPercentage,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Erro ao buscar dados de uso: ${msg}` },
      { status: 500 }
    );
  }
}
