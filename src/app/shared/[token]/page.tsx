import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSharedConversation } from "@/lib/services/sharing";
import SharedConversationView from "@/components/chat/shared-conversation-view";

interface SharedPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Generate dynamic metadata for shared conversation pages.
 * Provides SEO-friendly title, description, and OpenGraph tags.
 */
export async function generateMetadata({
  params,
}: SharedPageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getSharedConversation(token);

  if (!data) {
    return {
      title: "Conversa nao encontrada | Mentes Sinteticas",
    };
  }

  const { conversation, mind, messages } = data;
  const title = `${mind.name}: ${conversation.title || "Conversa"} | Mentes Sinteticas`;

  // Build description from first few messages
  const previewMessages = messages.slice(0, 3);
  const description = previewMessages
    .map((m) => {
      const prefix = m.role === "user" ? "Pergunta" : mind.name;
      const text = m.content.slice(0, 100);
      return `${prefix}: ${text}${m.content.length > 100 ? "..." : ""}`;
    })
    .join(" | ")
    .slice(0, 200);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    title,
    description: description || `Conversa com ${mind.name} no Mentes Sinteticas`,
    openGraph: {
      title,
      description: description || `Conversa com ${mind.name} no Mentes Sinteticas`,
      type: "article",
      url: `${appUrl}/shared/${token}`,
      siteName: "Mentes Sinteticas",
      images: [
        {
          url: `${appUrl}/shared/${token}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || `Conversa com ${mind.name} no Mentes Sinteticas`,
    },
  };
}

/**
 * Public shared conversation page.
 * No authentication required. Read-only view of a shared conversation.
 */
export default async function SharedConversationPage({
  params,
}: SharedPageProps) {
  const { token } = await params;
  const data = await getSharedConversation(token);

  if (!data) {
    notFound();
  }

  return <SharedConversationView data={data} />;
}
