import Link from "next/link";
import { getMinds, getConversations, getConversationMessages } from "@/app/actions";
import ChatInterface from "@/components/ChatInterface";
import ConversationList from "@/components/ConversationList";
import type { ChatMessage } from "@/lib/types";

interface ChatPageProps {
  params: Promise<{ mindId: string }>;
  searchParams: Promise<{ conversation?: string }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { mindId } = await params;
  const { conversation: conversationId } = await searchParams;
  const decodedName = decodeURIComponent(mindId);
  const minds = await getMinds();

  const isValidMind = minds.includes(decodedName);

  if (!isValidMind) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
        <h1 className="text-2xl text-red-500">
          Mente nao encontrada: {decodedName}
        </h1>
        <Link href="/" className="ml-4 underline text-gray-400">
          Voltar
        </Link>
      </div>
    );
  }

  // Load conversation list for sidebar
  const conversations = await getConversations(decodedName);

  // Load existing conversation messages if resuming
  let initialMessages: ChatMessage[] | undefined;
  let activeConversationId: string | undefined;

  if (conversationId) {
    const dbMessages = await getConversationMessages(conversationId);
    if (dbMessages.length > 0) {
      activeConversationId = conversationId;
      initialMessages = dbMessages.map((m) => ({
        // DB uses "assistant", Gemini/UI uses "model"
        role: m.role === "assistant" ? "model" : "user",
        text: m.content,
      }));
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 font-[family-name:var(--font-geist-sans)] flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
          {decodedName}
        </h1>
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-white transition-colors"
        >
          Encerrar Sessao
        </Link>
      </header>

      <main className="flex-1 w-full flex gap-4">
        {/* Conversation Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0">
          <h2 className="text-sm font-semibold text-gray-400 mb-3 px-1">
            Conversas
          </h2>
          <ConversationList
            conversations={conversations}
            mindId={decodedName}
            activeConversationId={activeConversationId}
          />
        </aside>

        {/* Chat Area */}
        <div className="flex-1 min-w-0">
          <ChatInterface
            mindName={decodedName}
            initialMessages={initialMessages}
            initialConversationId={activeConversationId}
          />
        </div>
      </main>
    </div>
  );
}
