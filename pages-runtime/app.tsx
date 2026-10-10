import Link from "./link";
import { SiteHeader } from "@/components/site-header";
import HomeContent, { type HomeSlots } from "@/components/home-content";
import VehicleContent from "@/components/vehicle-content";
import type { PublicVehicleListing, VehicleDataResult } from "@/lib/types";

export type PageData = {
  kind: "home" | "vehicle" | "not-found" | "unavailable";
  result: VehicleDataResult;
  vehicle?: PublicVehicleListing;
  phone: string;
  lineUrl?: string;
};
export function App({ data, homeSlots }: { data: PageData; homeSlots?: HomeSlots }) {
  return <><SiteHeader phone={data.phone} lineUrl={data.lineUrl} />
    {data.kind === "home" ? <HomeContent result={data.result} phone={data.phone} lineUrl={data.lineUrl} slots={homeSlots} /> :
      data.kind === "vehicle" && data.vehicle ? <VehicleContent vehicle={data.vehicle} phone={data.phone} /> :
      <main className="detail-page"><h1>{data.kind === "unavailable" ? "ไม่สามารถเชื่อมต่อข้อมูลรถได้ชั่วคราว" : "ไม่พบรถ"}</h1><Link href="/#inventory">กลับไปดูรถทั้งหมด</Link></main>}
  </>;
}
