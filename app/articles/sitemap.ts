import type { MetadataRoute } from "next";
import { articleSitemapRows } from "@/lib/article-approval/public";

// Separate from the existing vehicle sitemap/cache. Removed articles disappear on the next request.
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await articleSitemapRows();
  return articles.map((article) => ({
    url: `https://www.pdcarcenter.com/articles/${article.slug}`,
    lastModified: new Date(article.updated_at), changeFrequency: "monthly", priority: 0.7,
  }));
}
