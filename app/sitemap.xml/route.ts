import { sitemapXml } from "@/lib/sitemap-xml";
import { getPublicVehicles } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPublicVehicles();
  if (result.source !== "supabase") {
    return new Response("Public inventory is temporarily unavailable.\n", {
      status: 503,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8", "Retry-After": "60" }
    });
  }
  return new Response(sitemapXml(result.vehicles), {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=300", "Content-Type": "application/xml; charset=utf-8" }
  });
}
