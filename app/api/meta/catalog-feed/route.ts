import { createMetaCatalogCsv } from "@/lib/meta-catalog";
import { getPublicVehicles } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPublicVehicles();
  if (result.source !== "supabase") {
    return Response.json(
      { message: result.message || "ไม่สามารถอ่านข้อมูลรถได้" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return new Response(createMetaCatalogCsv(result.vehicles), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'inline; filename="pdcar-meta-catalog.csv"',
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
