import type { PublicVehicleListing } from "@/lib/types";

const baseUrl = "https://www.pdcarcenter.com";

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function validDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function sitemapXml(vehicles: PublicVehicleListing[]) {
  const pages: Array<{ url: string; changeFrequency: string; priority: string; lastModified?: string; image?: string }> = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: "1.0" },
    { url: `${baseUrl}/sell-car`, changeFrequency: "weekly", priority: "0.9" },
    { url: `${baseUrl}/articles`, changeFrequency: "daily", priority: "0.8" },
    ...vehicles.map((vehicle) => ({
      url: `${baseUrl}/cars/${encodeURIComponent(vehicle.slug)}`,
      changeFrequency: "weekly",
      priority: vehicle.featured ? "0.8" : "0.7",
      lastModified: validDate(vehicle.updatedAt),
      image: vehicle.coverImageUrl
    }))
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages.map((page) => `  <url>\n    <loc>${xml(page.url)}</loc>${page.lastModified ? `\n    <lastmod>${page.lastModified}</lastmod>` : ""}\n    <changefreq>${page.changeFrequency}</changefreq>\n    <priority>${page.priority}</priority>${page.image ? `\n    <image:image><image:loc>${xml(page.image)}</image:loc></image:image>` : ""}\n  </url>`).join("\n")}\n</urlset>\n`;
}
