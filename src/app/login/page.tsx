import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { t } from "@/lib/i18n";
import { Card, CardHeader, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string; redirectTo?: string; error?: string }>;
}) {
    const { callbackUrl, redirectTo, error } = await searchParams;
    const returnTo = callbackUrl || redirectTo || "/";

    async function handleSignIn(formData: FormData) {
        "use server";

        const email = formData.get("email");
        const password = formData.get("password");
        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
            redirect(`/login?error=${encodeURIComponent("Email e senha sao obrigatorios.")}&callbackUrl=${encodeURIComponent(returnTo)}`);
        }

        try {
            await signIn("credentials", {
                email,
                password,
                redirectTo: returnTo,
            });
        } catch (err) {
            if (err instanceof AuthError) {
                redirect(`/login?error=${encodeURIComponent("Credenciais invalidas.")}&callbackUrl=${encodeURIComponent(returnTo)}`);
            }
            throw err;
        }
    }

    return (
        <main id="main-content" className="min-h-[100dvh] flex items-center justify-center p-4 font-[family-name:var(--font-geist-sans)]">
            <Card className="glass-panel rounded-2xl border-0 w-full max-w-md">
                <CardHeader className="text-center">
                    <h1 className="text-3xl font-bold text-gradient leading-none">
                        {t("auth.loginTitle")}
                    </h1>
                    <CardDescription className="text-gray-400 text-sm">
                        {t("auth.loginDescription")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {error && (
                        <div id="form-error" role="alert" className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <form action={handleSignIn} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="email" className="block text-sm text-gray-400 mb-1">
                                {t("auth.email")}
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                autoComplete="email"
                                aria-describedby={error ? "form-error" : undefined}
                                className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-base text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
                                placeholder={t("auth.emailPlaceholder")}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
                                {t("auth.password")}
                            </label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                aria-describedby={error ? "form-error" : undefined}
                                className="w-full px-4 py-3 h-auto rounded-lg bg-white/5 border-white/10 text-base text-white placeholder-gray-500 focus-visible:border-purple-500/50 focus-visible:ring-purple-500/50"
                                placeholder={t("auth.passwordPlaceholder")}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 h-auto rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium mt-2"
                        >
                            {t("auth.loginButton")}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="justify-center">
                    <p className="text-muted-foreground text-sm">
                        {t("auth.noAccount")}{" "}
                        <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors">
                            {t("auth.createAccount")}
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </main>
    );
}
