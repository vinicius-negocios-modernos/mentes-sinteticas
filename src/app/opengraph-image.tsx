import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Mentes Sinteticas — O Atheneum Digital";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OGImage() {
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
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)",
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

        {/* Brain icon */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            stroke="#c9a55a"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 16 C8 10, 12 7, 16 7" />
            <path d="M24 16 C24 10, 20 7, 16 7" />
            <path d="M8 16 C8 22, 12 25, 16 25" />
            <path d="M24 16 C24 22, 20 25, 16 25" />
            <line x1="11" y1="12" x2="16" y2="14" />
            <line x1="21" y1="12" x2="16" y2="14" />
            <line x1="12" y1="20" x2="16" y2="18" />
            <line x1="20" y1="20" x2="16" y2="18" />
            <line x1="16" y1="14" x2="16" y2="18" />
          </g>
          <g fill="#c9a55a">
            <circle cx="8" cy="16" r="1.5" />
            <circle cx="24" cy="16" r="1.5" />
            <circle cx="16" cy="7" r="1.5" />
            <circle cx="16" cy="25" r="1.5" />
            <circle cx="11" cy="12" r="1.2" />
            <circle cx="21" cy="12" r="1.2" />
            <circle cx="12" cy="20" r="1.2" />
            <circle cx="20" cy="20" r="1.2" />
            <circle cx="16" cy="14" r="1.4" />
            <circle cx="16" cy="18" r="1.4" />
          </g>
        </svg>

        {/* Title */}
        <div
          style={{
            marginTop: 32,
            fontSize: 56,
            fontWeight: 700,
            color: "#c9a55a",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          Mentes Sinteticas
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 12,
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.6)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            display: "flex",
          }}
        >
          O Atheneum Digital
        </div>

        {/* Description */}
        <div
          style={{
            marginTop: 24,
            fontSize: 20,
            color: "rgba(255, 255, 255, 0.4)",
            maxWidth: 600,
            textAlign: "center",
            display: "flex",
          }}
        >
          Dialogue com as maiores mentes da humanidade
        </div>
      </div>
    ),
    { ...size }
  );
}
