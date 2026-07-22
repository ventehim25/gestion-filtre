// Robots : seul le catalogue public /c/ est indexable — la gestion reste hors Google.
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/c/", "/c", "/catalogue"], disallow: "/" }],
    sitemap: "https://gestion-filtre.vercel.app/sitemap.xml",
  };
}
