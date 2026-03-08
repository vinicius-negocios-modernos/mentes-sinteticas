import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { ServiceWorkerProvider } from "@/components/providers/sw-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#c9a55a" },
    { media: "(prefers-color-scheme: light)", color: "#c9a55a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://mentes-sinteticas.vercel.app"
  ),
  title: {
    default: "Mentes Sinteticas — O Atheneum Digital",
    template: "%s | Mentes Sinteticas",
  },
  description:
    "Dialogue com as maiores mentes da humanidade. Uma experiencia imersiva de conversas com mentes sinteticas inspiradas em pensadores historicos.",
  keywords: [
    "mentes sinteticas",
    "inteligencia artificial",
    "IA conversacional",
    "pensadores historicos",
    "dialogos filosoficos",
    "atheneum digital",
    "dark academia",
    "chatbot IA",
  ],
  authors: [{ name: "Mentes Sinteticas" }],
  creator: "Mentes Sinteticas",
  publisher: "Mentes Sinteticas",
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Mentes Sinteticas — O Atheneum Digital",
    description:
      "Dialogue com as maiores mentes da humanidade. Uma experiencia imersiva de conversas com mentes sinteticas inspiradas em pensadores historicos.",
    url: "/",
    siteName: "Mentes Sinteticas",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentes Sinteticas — O Atheneum Digital",
    description:
      "Dialogue com as maiores mentes da humanidade. Uma experiencia imersiva de conversas com mentes sinteticas.",
  },
};

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} safe-area-top safe-area-x`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Mentes Sinteticas",
              alternateName: "O Atheneum Digital",
              description:
                "Dialogue com as maiores mentes da humanidade. Uma experiencia imersiva de conversas com mentes sinteticas inspiradas em pensadores historicos.",
              url: "https://mentes-sinteticas.vercel.app",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "BRL",
              },
              inLanguage: "pt-BR",
            }),
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:text-foreground focus:p-4 focus:rounded-md focus:ring-2 focus:ring-ring"
        >
          Pular para conteudo principal
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {user && (
            <nav aria-label="Conta do usuario" className="fixed top-0 right-0 z-50 p-2 sm:p-4 flex items-center gap-2 sm:gap-4">
              <span className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-[200px] hidden sm:inline">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs px-3 py-2.5 min-h-11 min-w-11 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                >
                  Sair
                </button>
              </form>
            </nav>
          )}
          <ErrorBoundary variant="page">
            {children}
          </ErrorBoundary>
          <Toaster />
          <OfflineIndicator />
          <ServiceWorkerProvider />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
