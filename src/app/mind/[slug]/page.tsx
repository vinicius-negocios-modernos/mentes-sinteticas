import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import Breadcrumb from "@/components/ui/breadcrumb";
import MindProfileHero from "@/components/minds/mind-profile-hero";
import MindProfileDetails from "@/components/minds/mind-profile-details";
import MindKnowledgeSources from "@/components/minds/mind-knowledge-sources";
import MindConversationStarters from "@/components/minds/mind-conversation-starters";
import { getMindBySlug, getMindWithDocuments, listActiveMinds } from "@/lib/services/minds";
import { getConversationStarters } from "@/data/conversation-starters";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://mentes-sinteticas.vercel.app";

// ---------------------------------------------------------------------------
// Static Generation
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const minds = await listActiveMinds();
    return minds.map((mind) => ({ slug: mind.slug }));
  } catch {
    // DB may not be available at build time; fall back to on-demand generation
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dynamic Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mind = await getMindBySlug(slug);

  if (!mind) {
    return { title: "Mente nao encontrada" };
  }

  const traits = mind.personalityTraits ?? [];
  const description = mind.title
    ? `${mind.name} — ${mind.title}. ${traits.slice(0, 3).join(", ")}.`
    : `Converse com ${mind.name} no Mentes Sinteticas.`;

  return {
    title: mind.name,
    description,
    openGraph: {
      title: `${mind.name} | Mentes Sinteticas`,
      description,
      url: `/mind/${mind.slug}`,
      siteName: "Mentes Sinteticas",
      type: "profile",
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: `${mind.name} | Mentes Sinteticas`,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/mind/${mind.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function MindProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mind = await getMindBySlug(slug);

  if (!mind) {
    notFound();
  }

  // Fetch knowledge documents
  const mindWithDocs = await getMindWithDocuments(mind.id);
  const documents = mindWithDocs?.documents ?? [];

  // Get conversation starters for this mind
  const starters = getConversationStarters(mind.slug);

  // JSON-LD structured data (Person)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: mind.name,
    jobTitle: mind.title ?? undefined,
    description: mind.title
      ? `${mind.name} — ${mind.title}`
      : `Mente sintetica no Mentes Sinteticas`,
    url: `${BASE_URL}/mind/${mind.slug}`,
  };

  return (
    <div className="min-h-[100dvh] p-4 pb-28 sm:p-8 sm:pb-28 md:p-20 md:pb-20 font-[family-name:var(--font-geist-sans)]">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main
        id="main-content"
        className="flex flex-col gap-6 max-w-3xl mx-auto"
      >
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: t("mindProfile.breadcrumbHome"), href: "/" },
            { label: mind.name },
          ]}
        />

        {/* Hero */}
        <MindProfileHero mind={mind} />

        {/* Details (About + Traits) */}
        <MindProfileDetails mind={mind} />

        {/* Knowledge Sources */}
        <MindKnowledgeSources documents={documents} />

        {/* Conversation Starters */}
        <MindConversationStarters mindName={mind.name} starters={starters} />
      </main>

      {/* Sticky CTA — mobile only */}
      <div
        role="complementary"
        aria-label={t("mindProfile.startConversation")}
        className="fixed bottom-0 inset-x-0 p-4 pb-[max(env(safe-area-inset-bottom,16px),16px)] bg-gradient-to-t from-background via-background/95 to-transparent md:hidden z-40"
      >
        <Button asChild size="lg" className="w-full">
          <Link
            href={`/chat/${encodeURIComponent(mind.name)}`}
            aria-label={`${t("mindProfile.startConversationWith")} ${mind.name}`}
          >
            {t("mindProfile.startConversation")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
