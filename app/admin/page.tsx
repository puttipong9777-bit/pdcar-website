import type { Metadata } from "next";
import { siteAdminEnabled } from "@/lib/admin-auth";
import { getPublicVehicles } from "@/lib/vehicle-data";
import { AdminDashboard } from "./dashboard-client";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ศูนย์จัดการเว็บไซต์", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function AdminPage() {
  if (!siteAdminEnabled()) {
    return <main className="admin-shell admin-unavailable"><h1>ศูนย์จัดการเว็บไซต์</h1><p>ระบบแอดมินยังไม่ได้เปิดใช้ในสภาพแวดล้อมนี้</p></main>;
  }
  const { vehicles } = await getPublicVehicles();
  return <AdminDashboard vehicles={vehicles.map((vehicle) => ({
    carId: vehicle.carId,
    title: vehicle.title,
    photos: vehicle.photos.map((photo) => ({ fileId: photo.fileId, url: photo.url }))
  }))} />;
}
