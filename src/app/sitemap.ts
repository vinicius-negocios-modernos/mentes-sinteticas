import type { MetadataRoute } from "next";
import { listActiveMinds } from "@/lib/services/minds";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://mentes-sinteticas.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic mind profile pages
  let mindPages: MetadataRoute.Sitemap = [];
  try {
    const minds = await listActiveMinds();
    mindPages = minds.map((mind) => ({
      url: `${BASE_URL}/mind/${mind.slug}`,
      lastModified: mind.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — return static pages only
  }

  return [...staticPages, ...mindPages];
}
