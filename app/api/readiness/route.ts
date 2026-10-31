import { getPublicVehicles } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPublicVehicles();
  if (result.source !== "supabase") {
    return Response.json(
      { status: "unavailable", dependency: "public_vehicle_listings" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } }
    );
  }

  return Response.json(
    {
      status: "ready",
      inventory: {
        published: result.vehicles.length,
        available: result.vehicles.filter((vehicle) => vehicle.status === "available").length,
        reserved: result.vehicles.filter((vehicle) => vehicle.status === "reserved").length
      }
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
