import { Suspense } from "react";
import { getMinds, getConversations, getConversationMessages } from "@/app/actions";
import { getMindByName } from "@/lib/services/minds";
import { mindGreetings } from "@/lib/ai/greetings";
import ChatHeader from "@/components/chat/chat-header";
import ChatInterface from "@/components/chat/chat-interface";
import ChatSoundscapeBar from "@/components/chat/chat-soundscape-bar";
import { VoiceProvider } from "@/components/chat/chat-voice-wrapper";
import ConversationList from "@/components/chat/conversation-list";
import ConversationDrawer from "@/components/chat/conversation-drawer";
import { ConversationListSkeleton } from "@/components/skeletons/conversation-list-skeleton";
import { ErrorBoundary } from "@/components/error-boundary";
import type { ChatMessage } from "@/lib/types";
import Link from "next/link";

interface ChatPageProps {
  params: Promise<{ mindId: string }>;
  searchParams: Promise<{ conversation?: string }>;
}

/**
 * Async Server Component for the conversation sidebar.
 * Extracted to enable Suspense boundary around conversation loading.
 */
async function ConversationSidebar({
  mindName,
  activeConversationId,
}: {
  mindName: string;
  activeConversationId?: string;
}) {
  const conversations = await getConversations(mindName);

  return (
    <ErrorBoundary
      variant="inline"
      fallback={({ reset }) => (
        <div className="text-center p-4">
          <p className="text-sm text-red-400 mb-2">Erro ao carregar conversas</p>
          <button
            onClick={reset}
            className="text-xs text-purple-400 hover:underline"
          >
            Recarregar
          </button>
        </div>
      )}
    >
      <ConversationList
        conversations={conversations}
        mindId={mindName}
        activeConversationId={activeConversationId}
      />
    </ErrorBoundary>
  );
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { mindId } = await params;
  const { conversation: conversationId } = await searchParams;
  const decodedName = decodeURIComponent(mindId);
  const minds = await getMinds();

  const isValidMind = minds.includes(decodedName);

  if (!isValidMind) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
        <h1 className="text-2xl text-red-500">
          Mente nao encontrada: {decodedName}
        </h1>
        <Link href="/" className="ml-4 underline text-gray-400">
          Voltar
        </Link>
      </div>
    );
  }

  // Load mind details for description
  const mindData = await getMindByName(decodedName).catch(() => null);
  const mindDescription = mindData?.title ?? undefined;
  const mindSlug = mindData?.slug ?? decodedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Load conversation list for drawer (needs to be available immediately)
  const conversations = await getConversations(decodedName);

  // Load existing conversation messages if resuming
  let initialMessages: ChatMessage[] | undefined;
  let activeConversationId: string | undefined;
  let activeShareToken: string | null = null;

  if (conversationId) {
    const dbMessages = await getConversationMessages(conversationId);
    if (dbMessages.length > 0) {
      activeConversationId = conversationId;
      initialMessages = dbMessages.map((m) => ({
        // DB uses "assistant", Gemini/UI uses "model"
        role: m.role === "assistant" ? "model" : "user",
        text: m.content,
      }));
      // Check if conversation is shared (for share button state)
      const convData = conversations.find((c) => c.id === conversationId);
      if (convData?.shareToken) {
        activeShareToken = convData.shareToken;
      }
    }
  }

  // Resolve personalized greeting and prompts for this mind
  const greetingConfig = mindGreetings[mindSlug];

  return (
    <VoiceProvider mindSlug={mindSlug}>
      <div data-mind-theme={mindSlug} className="min-h-[100dvh] p-2 sm:p-4 md:p-8 font-[family-name:var(--font-geist-sans)] flex flex-col relative">
        {/* Mind theme background gradient overlay */}
        <div className="mind-theme-bg" aria-hidden="true" />
        <div className="flex items-center gap-2 relative z-10">
          <ConversationDrawer
            conversations={conversations}
            mindId={decodedName}
            activeConversationId={activeConversationId}
          />
          <ChatHeader mindName={decodedName} mindDescription={mindDescription} mindDbId={mindData?.id} backHref="/" className="flex-1" conversationId={activeConversationId} initialShareToken={activeShareToken} />
        </div>

        {/* Ambient soundscape controls — per-mind audio */}
        <ChatSoundscapeBar mindSlug={mindSlug} />

        <main id="main-content" className="flex-1 w-full flex gap-4 relative z-10">
          {/* Conversation Sidebar */}
          <aside className="hidden md:flex flex-col w-64 shrink-0">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 px-1">
              Conversas
            </h2>
            <Suspense fallback={<ConversationListSkeleton />}>
              <ConversationSidebar
                mindName={decodedName}
                activeConversationId={activeConversationId}
              />
            </Suspense>
          </aside>

          {/* Chat Area */}
          <div className="flex-1 min-w-0">
            <ChatInterface
              mindName={decodedName}
              mindDescription={mindDescription}
              initialMessages={initialMessages}
              initialConversationId={activeConversationId}
              greeting={greetingConfig?.greeting}
              suggestedPrompts={greetingConfig?.suggestedPrompts}
              mindSlug={mindSlug}
            />
          </div>
        </main>
      </div>
    </VoiceProvider>
  );
}
