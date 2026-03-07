import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mentes Sinteticas — O Atheneum Digital",
    short_name: "Mentes Sinteticas",
    description:
      "Dialogue com as maiores mentes da humanidade. Uma experiencia imersiva de conversas com mentes sinteticas inspiradas em pensadores historicos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#c9a55a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
