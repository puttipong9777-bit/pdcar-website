import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VehicleContent from "@/components/vehicle-content";
import { getPublicVehicle } from "@/lib/vehicle-data";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params;
  const vehicle = await getPublicVehicle(decodeURIComponent(identifier));
  return vehicle ? { title: vehicle.title, description: vehicle.description } : { title: "ไม่พบรถ" };
}
export default async function VehiclePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const vehicle = await getPublicVehicle(decodeURIComponent(identifier));
  if (!vehicle) notFound();
  return <VehicleContent vehicle={vehicle} phone={process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122"} />;
}
