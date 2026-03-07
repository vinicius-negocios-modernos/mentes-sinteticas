import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
    const { redirectTo, error } = await searchParams;

    async function signIn(formData: FormData) {
        "use server";

        const email = formData.get("email");
        const password = formData.get("password");
        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
            redirect(`/login?error=${encodeURIComponent("Email e senha sao obrigatorios.")}&redirectTo=${encodeURIComponent(redirectTo || "/")}`);
        }

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
        <div className="min-h-[100dvh] flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            <Card className="glass-panel rounded-2xl border-0 w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-gradient">
                        Mentes Sinteticas
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Entre para acessar suas conversas
                    </CardDescription>
                </CardHeader>

                <CardContent>
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
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-base text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
                                Senha
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-base text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
                                placeholder="Sua senha"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 h-auto rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium mt-2"
                        >
                            Entrar
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center">
                    <p className="text-gray-500 text-sm">
                        Nao tem conta?{" "}
                        <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors">
                            Criar conta
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
