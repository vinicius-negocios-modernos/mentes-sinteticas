
import Link from "next/link";
import { getMinds } from "@/app/actions";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage({ params }: { params: Promise<{ mindId: string }> }) {
    const { mindId } = await params;
    const decodedName = decodeURIComponent(mindId);
    const minds = await getMinds();

    const isValidMind = minds.includes(decodedName);

    if (!isValidMind) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8 font-[family-name:var(--font-geist-sans)]">
                <h1 className="text-2xl text-red-500">Mente não encontrada: {decodedName}</h1>
                <Link href="/" className="ml-4 underline text-gray-400">Voltar</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 sm:p-8 font-[family-name:var(--font-geist-sans)] flex flex-col">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                    {decodedName}
                </h1>
                <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">Encerrar Sessão</Link>
            </header>

            <main className="flex-1 w-full">
                <ChatInterface mindName={decodedName} />
            </main>
        </div>
    );
}
