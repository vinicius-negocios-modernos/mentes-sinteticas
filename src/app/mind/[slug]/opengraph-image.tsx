import { ImageResponse } from "next/og";
import { getMindBySlug } from "@/lib/services/minds";

export const runtime = "edge";

export const alt = "Mentes Sinteticas — Perfil da Mente";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mind = await getMindBySlug(slug);

  const name = mind?.name ?? "Mente Sintetica";
  const title = mind?.title ?? "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Decorative border */}
        <div
          style={{
            position: "absolute",
            inset: 20,
            border: "1px solid rgba(201, 165, 90, 0.3)",
            borderRadius: 16,
            display: "flex",
          }}
        />

        {/* Avatar circle with initials */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(88, 28, 135, 0.6), rgba(120, 53, 15, 0.4))",
            border: "2px solid rgba(201, 165, 90, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 700,
            color: "#c9a55a",
          }}
        >
          {initials}
        </div>

        {/* Mind name */}
        <div
          style={{
            marginTop: 28,
            fontSize: 52,
            fontWeight: 700,
            color: "#c9a55a",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          {name}
        </div>

        {/* Title / occupation */}
        {title && (
          <div
            style={{
              marginTop: 12,
              fontSize: 24,
              color: "rgba(255, 255, 255, 0.6)",
              display: "flex",
            }}
          >
            {title}
          </div>
        )}

        {/* Branding */}
        <div
          style={{
            marginTop: 32,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.3)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            display: "flex",
          }}
        >
          Mentes Sinteticas
        </div>
      </div>
    ),
    { ...size }
  );
}
