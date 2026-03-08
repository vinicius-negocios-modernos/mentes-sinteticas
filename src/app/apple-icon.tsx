import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)",
          borderRadius: 36,
        }}
      >
        <svg
          width="120"
          height="120"
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
      </div>
    ),
    { ...size }
  );
}
