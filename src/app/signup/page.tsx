import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SignupPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; success?: string }>;
}) {
    const { error, success } = await searchParams;

    async function signUp(formData: FormData) {
        "use server";

        const email = formData.get("email");
        const password = formData.get("password");
        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
            redirect(`/signup?error=${encodeURIComponent("Email e senha sao obrigatorios.")}`);
        }

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
        <main id="main-content" className="min-h-[100dvh] flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            <Card className="glass-panel rounded-2xl border-0 w-full max-w-md">
                <CardHeader className="text-center">
                    <h1 className="text-3xl font-bold text-gradient leading-none">
                        Criar Conta
                    </h1>
                    <CardDescription className="text-gray-400 text-sm">
                        Junte-se as Mentes Sinteticas
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div id="form-error" role="alert" className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div role="status" className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                            Conta criada! Verifique seu email para confirmar o cadastro.
                        </div>
                    )}

                    {!success && (
                        <form action={signUp} className="flex flex-col gap-4">
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
                                    aria-describedby={error ? "form-error" : undefined}
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
                                    minLength={6}
                                    autoComplete="new-password"
                                    aria-describedby={error ? "form-error" : undefined}
                                    className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-base text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
                                    placeholder="Minimo 6 caracteres"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full py-3 h-auto rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium mt-2"
                            >
                                Criar Conta
                            </Button>
                        </form>
                    )}
                </CardContent>

                <CardFooter className="justify-center">
                    <p className="text-muted-foreground text-sm">
                        Ja tem conta?{" "}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
                            Entrar
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
