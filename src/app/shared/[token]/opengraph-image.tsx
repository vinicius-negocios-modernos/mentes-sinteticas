import { ImageResponse } from "next/og";
import { getSharedConversation } from "@/lib/services/sharing";

export const runtime = "nodejs";

export const alt = "Mentes Sinteticas — Conversa Compartilhada";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Try to load conversation data; fall back to generic OG image
  let mindName = "Mentes Sinteticas";
  let conversationTitle = "Conversa Compartilhada";
  let messagePreview = "";

  try {
    const data = await getSharedConversation(token);
    if (data) {
      mindName = data.mind.name;
      conversationTitle = data.conversation.title || "Conversa";
      // Get a snippet from the first assistant message
      const firstAssistant = data.messages.find((m) => m.role === "assistant");
      if (firstAssistant) {
        messagePreview =
          firstAssistant.content.slice(0, 120) +
          (firstAssistant.content.length > 120 ? "..." : "");
      }
    }
  } catch {
    // Use defaults on error
  }

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

        {/* Mind name */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(201, 165, 90, 0.8)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            display: "flex",
            marginBottom: 16,
          }}
        >
          Conversa com
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#c9a55a",
            letterSpacing: "-0.02em",
            display: "flex",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {mindName}
        </div>

        {/* Conversation title */}
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.6)",
            display: "flex",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          {conversationTitle}
        </div>

        {/* Message preview */}
        {messagePreview && (
          <div
            style={{
              marginTop: 24,
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.35)",
              maxWidth: 700,
              textAlign: "center",
              display: "flex",
              fontStyle: "italic",
            }}
          >
            &quot;{messagePreview}&quot;
          </div>
        )}

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 16,
            color: "rgba(201, 165, 90, 0.5)",
            letterSpacing: "0.1em",
            display: "flex",
          }}
        >
          MENTES SINTETICAS - O ATHENEUM DIGITAL
        </div>
      </div>
    ),
    { ...size }
  );
}
