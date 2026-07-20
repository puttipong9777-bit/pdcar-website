"use client";

import { CarFront, Gauge, Search, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { PublicVehicleListing, PublicVehicleStatus } from "@/lib/types";

const price = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("th-TH");

export function VehicleBrowser({ vehicles }: { vehicles: PublicVehicleListing[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | PublicVehicleStatus>("all");
  const [brand, setBrand] = useState("all");
  const [year, setYear] = useState("all");
  const brands = useMemo(() => Array.from(new Set(vehicles.map((vehicle) => vehicle.brand).filter(Boolean))).sort(), [vehicles]);
  const years = useMemo(() => Array.from(new Set(vehicles.map((vehicle) => vehicle.year))).sort((a, b) => b - a), [vehicles]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th-TH");
    return vehicles.filter((vehicle) => {
      const matchesStatus = status === "all" || vehicle.status === status;
      const matchesBrand = brand === "all" || vehicle.brand === brand;
      const matchesYear = year === "all" || String(vehicle.year) === year;
      const haystack = [vehicle.carId, vehicle.brand, vehicle.model, vehicle.variant, vehicle.year].filter(Boolean).join(" ").toLocaleLowerCase("th-TH");
      return matchesStatus && matchesBrand && matchesYear && (!needle || haystack.includes(needle));
    });
  }, [brand, query, status, vehicles, year]);

  return (
    <div>
      <div className="vehicle-tools">
        <label className="search-box">
          <Search aria-hidden="true" size={20} />
          <span className="sr-only">ค้นหารถ</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหายี่ห้อ รุ่น ปี หรือ Car ID" />
        </label>
        <label className="filter-field">
          <span>ยี่ห้อ</span>
          <select value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value="all">ทุกยี่ห้อ</option>
            {brands.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>ปีรถ</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">ทุกปี</option>
            {years.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <div className="segments" aria-label="กรองสถานะรถ">
          {([['all', 'ทั้งหมด'], ['available', 'พร้อมขาย'], ['reserved', 'ติดจอง']] as const).map(([value, label]) => (
            <button key={value} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="vehicle-grid">
          {filtered.map((vehicle) => (
            <article className="vehicle-card" key={vehicle.carId}>
              <Link className="vehicle-image" href={`/cars/${encodeURIComponent(vehicle.slug)}`}>
                {vehicle.coverImageUrl ? (
                  <Image src={vehicle.coverImageUrl} alt={vehicle.title} fill sizes="(max-width: 720px) 100vw, 33vw" />
                ) : (
                  <div className="image-placeholder"><CarFront aria-hidden="true" size={44} /><span>กำลังเพิ่มรูป</span></div>
                )}
                <span className={`status-badge ${vehicle.status}`}>{vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span>
              </Link>
              <div className="vehicle-card-body">
                <div className="car-id">{vehicle.carId}</div>
                <h3><Link href={`/cars/${encodeURIComponent(vehicle.slug)}`}>{vehicle.title}</Link></h3>
                <div className="vehicle-meta">
                  {vehicle.mileage !== undefined ? <span><Gauge size={17} />{number.format(vehicle.mileage)} กม.</span> : null}
                  {vehicle.fuelType ? <span>{vehicle.fuelType}</span> : null}
                  {vehicle.transmission ? <span>{vehicle.transmission}</span> : null}
                </div>
                <div className="price-row">
                  <div><small>ราคาขาย</small><strong>{vehicle.salePrice !== undefined ? price.format(vehicle.salePrice) : "สอบถามราคา"}</strong></div>
                  {vehicle.monthlyPayment !== undefined ? <div className="monthly"><WalletCards size={18} /><span>ผ่อน {price.format(vehicle.monthlyPayment)}/เดือน</span></div> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><CarFront aria-hidden="true" size={48} /><h3>ยังไม่พบรถตามที่ค้นหา</h3><p>ลองเปลี่ยนคำค้นหาหรือเลือกดูรถทั้งหมด</p></div>
      )}
    </div>
  );
}
