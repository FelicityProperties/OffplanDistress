import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";

/** The web app manifest: the name, colours and icon a phone uses when the site is added to its home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    // The site's light background (--background) and the header ink, as in the viewport's theme colour.
    background_color: "#fbf9f4",
    theme_color: "#141c33",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
