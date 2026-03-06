import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
    const { redirectTo, error } = await searchParams;

    async function signIn(formData: FormData) {
        "use server";

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            redirect(`/login?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo || "/")}`);
        }

        redirect(redirectTo || "/");
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            <div className="glass-panel rounded-2xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold mb-2 text-center text-gradient">
                    Mentes Sinteticas
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    Entre para acessar suas conversas
                </p>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                <form action={signIn} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
                            Senha
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors"
                            placeholder="Sua senha"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors mt-2"
                    >
                        Entrar
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Nao tem conta?{" "}
                    <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Criar conta
                    </Link>
                </p>
            </div>
        </div>
    );
}
