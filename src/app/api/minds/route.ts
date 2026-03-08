import { listActiveMinds } from "@/lib/services/minds";

/**
 * GET /api/minds — List all active minds.
 * Used by the debate setup form to show available minds.
 */
export async function GET() {
  try {
    const minds = await listActiveMinds();
    return Response.json({
      minds: minds.map((m) => ({
        slug: m.slug,
        name: m.name,
        title: m.title,
      })),
    });
  } catch {
    return Response.json({ error: "Erro ao buscar mentes." }, { status: 500 });
  }
}
