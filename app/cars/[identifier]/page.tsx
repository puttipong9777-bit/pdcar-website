import { ArrowLeft, Fuel, Gauge, Phone, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicVehicle } from "@/lib/vehicle-data";

const price = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("th-TH");

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params;
  const vehicle = await getPublicVehicle(decodeURIComponent(identifier));
  return vehicle ? { title: vehicle.title, description: vehicle.description } : { title: "ไม่พบรถ" };
}

export default async function VehiclePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const vehicle = await getPublicVehicle(decodeURIComponent(identifier));
  if (!vehicle) notFound();
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const gallery = vehicle.photos.length ? vehicle.photos : vehicle.coverImageUrl ? [{ fileId: "cover", url: vehicle.coverImageUrl, isPrimary: true, sortOrder: 0 }] : [];
  return (
    <main className="detail-page">
      <Link className="back-link" href="/#inventory"><ArrowLeft size={18} />กลับไปดูรถทั้งหมด</Link>
      <div className="detail-layout">
        <section className="gallery">
          {gallery.length ? gallery.map((photo) => <div className="gallery-image" key={photo.fileId}><Image src={photo.url} alt={vehicle.title} fill sizes="(max-width: 900px) 100vw, 60vw" /></div>) : <div className="gallery-empty">กำลังเพิ่มรูปรถ</div>}
        </section>
        <aside className="vehicle-summary">
          <span className={`status-badge ${vehicle.status}`}>{vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span>
          <p className="car-id">{vehicle.carId}</p><h1>{vehicle.title}</h1>
          <strong className="detail-price">{vehicle.salePrice !== undefined ? price.format(vehicle.salePrice) : "สอบถามราคา"}</strong>
          <div className="spec-list">
            {vehicle.mileage !== undefined ? <span><Gauge size={20} /><small>เลขไมล์</small><b>{number.format(vehicle.mileage)} กม.</b></span> : null}
            {vehicle.fuelType ? <span><Fuel size={20} /><small>เชื้อเพลิง</small><b>{vehicle.fuelType}</b></span> : null}
            {vehicle.transmission ? <span><Settings2 size={20} /><small>เกียร์</small><b>{vehicle.transmission}</b></span> : null}
          </div>
          {vehicle.description ? <p className="description">{vehicle.description}</p> : null}
          {vehicle.monthlyPayment !== undefined ? <div className="finance-box"><span>ผ่อนประมาณ</span><strong>{price.format(vehicle.monthlyPayment)}/เดือน</strong>{vehicle.installment ? <small>{vehicle.installment} งวด</small> : null}</div> : null}
          <a className="primary-action full" href={`tel:${phone}`}><Phone size={19} />สอบถามรถคันนี้ {phone}</a>
        </aside>
      </div>
    </main>
  );
}
