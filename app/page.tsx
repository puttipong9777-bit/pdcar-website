import HomeContent from "@/components/home-content";
import { getPublicVehicles } from "@/lib/vehicle-data";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  return <HomeContent result={await getPublicVehicles()} phone={process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122"} lineUrl={process.env.NEXT_PUBLIC_LINE_URL} />;
}
