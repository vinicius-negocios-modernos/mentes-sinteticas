import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; success?: string }>;
}) {
    const { error, success } = await searchParams;

    async function signUp(formData: FormData) {
        "use server";

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const supabase = await createClient();
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            redirect(`/signup?error=${encodeURIComponent(error.message)}`);
        }

        redirect("/signup?success=true");
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            <div className="glass-panel rounded-2xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold mb-2 text-center text-gradient">
                    Criar Conta
                </h1>
                <p className="text-gray-400 text-center mb-8 text-sm">
                    Junte-se as Mentes Sinteticas
                </p>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                        Conta criada! Verifique seu email para confirmar o cadastro.
                    </div>
                )}

                {!success && (
                    <form action={signUp} className="flex flex-col gap-4">
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
                                minLength={6}
                                autoComplete="new-password"
                                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-colors"
                                placeholder="Minimo 6 caracteres"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors mt-2"
                        >
                            Criar Conta
                        </button>
                    </form>
                )}

                <p className="text-center text-gray-500 text-sm mt-6">
                    Ja tem conta?{" "}
                    <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
                        Entrar
                    </Link>
                </p>
            </div>
        </div>
    );
}
