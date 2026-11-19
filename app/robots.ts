import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/article-admin", "/api/"]
    },
    sitemap: ["https://www.pdcarcenter.com/sitemap.xml", "https://www.pdcarcenter.com/articles/sitemap.xml"],
    host: "https://www.pdcarcenter.com"
  };
}
