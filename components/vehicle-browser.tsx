"use client";

import { CarFront, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { VehicleCard } from "./vehicle-card";
import type { PublicVehicleListing, PublicVehicleStatus } from "@/lib/types";

export function VehicleBrowser({ vehicles, slots }: { vehicles: PublicVehicleListing[]; slots?: { brands: ReactNode; years: ReactNode; results: ReactNode } }) {
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
            {slots ? slots.brands : brands.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>ปีรถ</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">ทุกปี</option>
            {slots ? slots.years : years.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <div className="segments" aria-label="กรองสถานะรถ">
          {([['all', 'ทั้งหมด'], ['available', 'พร้อมขาย'], ['reserved', 'ติดจอง']] as const).map(([value, label]) => (
            <button key={value} type="button" className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}</button>
          ))}
        </div>
      </div>

      {slots ? slots.results : filtered.length ? (
        <div className="vehicle-grid">
          {filtered.map((vehicle) => (
            <VehicleCard vehicle={vehicle} key={vehicle.carId} />
          ))}
        </div>
      ) : (
        <VehicleEmptyState />
      )}
    </div>
  );
}

export function VehicleEmptyState() {
  return <div className="empty-state"><CarFront aria-hidden="true" size={48} /><h3>ยังไม่พบรถตามที่ค้นหา</h3><p>ลองเปลี่ยนคำค้นหาหรือเลือกดูรถทั้งหมด</p></div>;
}
