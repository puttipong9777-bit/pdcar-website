import { CarFront, Gauge, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicVehicleListing } from "@/lib/types";
import { price, number } from "@/lib/format";

export function CardImage({ vehicle }: { vehicle: PublicVehicleListing }) {
  return vehicle.coverImageUrl ? <Image src={vehicle.coverImageUrl} alt={vehicle.title} fill sizes="(max-width: 720px) 100vw, 33vw" /> : <div className="image-placeholder"><CarFront aria-hidden="true" size={44} /><span>กำลังเพิ่มรูป</span></div>;
}
export function CardMileage({ value }: { value: string }) {
  return <span><Gauge size={17} />{value} กม.</span>;
}
export function CardMonthly({ value }: { value: string }) {
  return <div className="monthly"><WalletCards size={18} /><span>ผ่อน {value}/เดือน</span></div>;
}
export type CardSlots = { image: ReactNode; mileage: ReactNode; fuel: ReactNode; transmission: ReactNode; price: ReactNode; monthly: ReactNode; status: ReactNode; statusClass: string };
export function VehicleCard({ vehicle, slots }: { vehicle: PublicVehicleListing; slots?: CardSlots }) {
  return (
    <article className="vehicle-card">
      <Link className="vehicle-image" href={`/cars/${encodeURIComponent(vehicle.slug)}`}>
        {slots ? slots.image : <CardImage vehicle={vehicle} />}
        <span className={`status-badge ${slots ? slots.statusClass : vehicle.status}`}>{slots ? slots.status : vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span>
      </Link>
      <div className="vehicle-card-body">
        <div className="car-id">{vehicle.carId}</div>
        <h3><Link href={`/cars/${encodeURIComponent(vehicle.slug)}`}>{vehicle.title}</Link></h3>
        <div className="vehicle-meta">
          {slots ? slots.mileage : vehicle.mileage !== undefined ? <CardMileage value={number.format(vehicle.mileage)} /> : null}
          {slots ? slots.fuel : vehicle.fuelType ? <span>{vehicle.fuelType}</span> : null}
          {slots ? slots.transmission : vehicle.transmission ? <span>{vehicle.transmission}</span> : null}
        </div>
        <div className="price-row">
          <div><small>ราคาขาย</small><strong>{slots ? slots.price : vehicle.salePrice !== undefined ? price.format(vehicle.salePrice) : "สอบถามราคา"}</strong></div>
          {slots ? slots.monthly : vehicle.monthlyPayment !== undefined ? <CardMonthly value={price.format(vehicle.monthlyPayment)} /> : null}
        </div>
      </div>
    </article>
  );
}
