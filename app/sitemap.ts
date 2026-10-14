import type { MetadataRoute } from "next";
import { getPublicVehicles } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

function validDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.pdcarcenter.com";
  const result = await getPublicVehicles();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/sell-car`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/articles`, changeFrequency: "daily", priority: 0.8 }
  ];
  const vehiclePages: MetadataRoute.Sitemap = result.vehicles.map((vehicle) => ({
    url: `${baseUrl}/cars/${encodeURIComponent(vehicle.slug)}`,
    lastModified: validDate(vehicle.updatedAt),
    changeFrequency: "weekly",
    priority: vehicle.featured ? 0.8 : 0.7,
    images: vehicle.coverImageUrl ? [vehicle.coverImageUrl] : undefined
  }));

  return [...staticPages, ...vehiclePages];
}
