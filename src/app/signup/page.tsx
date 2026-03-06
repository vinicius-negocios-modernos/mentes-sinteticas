import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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
            <Card className="glass-panel rounded-2xl border-0 w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold text-gradient">
                        Criar Conta
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                        Junte-se as Mentes Sinteticas
                    </CardDescription>
                </CardHeader>

                <CardContent>
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
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
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
                                    className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
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
                    <p className="text-gray-500 text-sm">
                        Ja tem conta?{" "}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
                            Entrar
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
