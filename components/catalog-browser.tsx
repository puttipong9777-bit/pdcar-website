"use client";

import { ArrowDownUp, ArrowUpRight, CarFront, ChevronLeft, ChevronRight, Gauge, Images, MoveHorizontal, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { defaultCatalogFilters, filterCatalog, getCatalogPhotos, type CatalogFilters, type CatalogSort } from "@/lib/vehicle-catalog";
import type { PublicVehicleListing } from "@/lib/types";

const number = new Intl.NumberFormat("th-TH");

function VehicleCard({ vehicle }: { vehicle: PublicVehicleListing }) {
  const photos = useMemo(() => getCatalogPhotos(vehicle), [vehicle]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryUsed, setGalleryUsed] = useState(false);
  const [shouldPreloadNeighbors, setShouldPreloadNeighbors] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressPhotoLink = useRef(false);
  const activeIndex = photoIndex < photos.length ? photoIndex : 0;
  const href = `/cars/${encodeURIComponent(vehicle.slug)}`;

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) {
      setShouldPreloadNeighbors(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldPreloadNeighbors(true);
      observer.disconnect();
    }, { rootMargin: "240px 0px" });

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldPreloadNeighbors || photos.length < 2) return;

    const neighborIndexes = new Set([
      (activeIndex + 1) % photos.length,
      (activeIndex - 1 + photos.length) % photos.length
    ]);

    neighborIndexes.forEach((index) => {
      const preload = new window.Image();
      preload.decoding = "async";
      preload.fetchPriority = "low";
      preload.src = photos[index];
    });
  }, [activeIndex, photos, shouldPreloadNeighbors]);

  const changePhoto = (direction: number) => {
    setGalleryUsed(true);
    setPhotoIndex((current) => {
      const safeIndex = current < photos.length ? current : 0;
      return (safeIndex + direction + photos.length) % photos.length;
    });
  };
  const handlePointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId || photos.length < 2) return;

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    const isHorizontalSwipe = Math.abs(horizontalDistance) >= 42 && Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.2;
    if (!isHorizontalSwipe) return;

    event.preventDefault();
    suppressPhotoLink.current = true;
    changePhoto(horizontalDistance < 0 ? 1 : -1);
    window.setTimeout(() => { suppressPhotoLink.current = false; }, 400);
  };

  return (
    <article ref={cardRef} className="catalog-card" aria-label={vehicle.title}>
      <div className="catalog-photo">
        <Link href={href} className="catalog-photo-link" aria-label={`ดูรายละเอียด ${vehicle.title}`} draggable={false} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={() => { pointerStart.current = null; }} onClick={(event) => {
          if (!suppressPhotoLink.current) return;
          event.preventDefault();
          suppressPhotoLink.current = false;
        }}>
          {photos[activeIndex] ? <Image key={photos[activeIndex]} src={photos[activeIndex]} alt={`${vehicle.title} ภาพที่ ${activeIndex + 1}`} fill sizes="(max-width: 620px) 100vw, (max-width: 1100px) 46vw, 410px" draggable={false} /> : <div className="image-placeholder"><CarFront size={46} /><span>กำลังเพิ่มรูปภาพ</span></div>}
        </Link>
        {photos.length > 1 && !galleryUsed ? <span className="catalog-swipe-hint" aria-hidden="true"><MoveHorizontal size={16} />ปัดซ้าย–ขวาดูรูป</span> : null}
        <span className={`catalog-status ${vehicle.status}`}><span />{vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span>
        {photos.length > 1 ? <div className="catalog-photo-controls" role="group" aria-label={`รูปภาพ ${vehicle.title}`}>
          <button type="button" onClick={() => changePhoto(-1)} aria-label={`ภาพก่อนหน้าของ ${vehicle.title}`}><ChevronLeft size={18} /></button>
          <span aria-live="polite" aria-atomic="true"><Images size={14} />{activeIndex + 1} / {photos.length}</span>
          <button type="button" onClick={() => changePhoto(1)} aria-label={`ภาพถัดไปของ ${vehicle.title}`}><ChevronRight size={18} /></button>
        </div> : null}
      </div>
      <div className="catalog-card-body">
        <div className="catalog-card-topline"><span>{vehicle.carId}</span>{vehicle.featured ? <span className="catalog-featured">ร้านแนะนำ</span> : null}</div>
        <h3><Link href={href}>{vehicle.title}</Link></h3>
        <div className="catalog-specs">
          <span className="catalog-spec-year">ปี {vehicle.year}</span>
          {vehicle.mileage !== undefined ? <span className="catalog-spec-mileage"><Gauge size={15} />{number.format(vehicle.mileage)} กม.</span> : null}
          {vehicle.transmission ? <span className="catalog-spec-secondary">{vehicle.transmission}</span> : null}
          {vehicle.fuelType ? <span className="catalog-spec-secondary">{vehicle.fuelType}</span> : null}
        </div>
        <div className="catalog-price">
          <div><small>ราคาขาย</small><strong>{vehicle.salePrice !== undefined ? <>{number.format(vehicle.salePrice)} <span>บาท</span></> : "สอบถามราคา"}</strong></div>
          <Link href={href} className="catalog-open" aria-label={`ดูรายละเอียด ${vehicle.title}`}><ArrowUpRight size={23} /></Link>
        </div>
        <p className="catalog-installment">{vehicle.monthlyPayment !== undefined ? `ผ่อน ${number.format(vehicle.monthlyPayment)} บ./เดือน` : "สอบถามเงื่อนไขผ่อนกับร้าน"}</p>
      </div>
    </article>
  );
}

export function CatalogBrowser({ vehicles }: { vehicles: PublicVehicleListing[] }) {
  const [filters, setFilters] = useState<CatalogFilters>(defaultCatalogFilters);
  const brands = useMemo(() => Array.from(new Set(vehicles.map((vehicle) => vehicle.brand).filter(Boolean))).sort(), [vehicles]);
  const years = useMemo(() => Array.from(new Set(vehicles.map((vehicle) => vehicle.year))).sort((a, b) => b - a), [vehicles]);
  const filtered = useMemo(() => filterCatalog(vehicles, filters), [vehicles, filters]);
  const hasFilters = filters.query !== "" || filters.brand !== "all" || filters.year !== "all" || filters.maxPrice !== "all" || filters.status !== "all";
  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="catalog-browser">
      <div className="catalog-brands" role="group" aria-label="เลือกยี่ห้อรถ">
        <button type="button" aria-pressed={filters.brand === "all"} onClick={() => update("brand", "all")}><CarFront size={19} />ทุกยี่ห้อ <span>{vehicles.length}</span></button>
        {brands.map((brand) => <button type="button" key={brand} aria-pressed={filters.brand === brand} onClick={() => update("brand", brand)}>{brand}<span>{vehicles.filter((vehicle) => vehicle.brand === brand).length}</span></button>)}
      </div>
      <div className="catalog-filters">
        <label className="catalog-search"><Search size={20} aria-hidden="true" /><span className="sr-only">ค้นหารถ</span><input value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder="ค้นหารุ่น ปี หรือรหัสรถ" type="search" /></label>
        <label className="catalog-select"><span>งบประมาณ</span><select value={filters.maxPrice} onChange={(event) => update("maxPrice", event.target.value)}><option value="all">ทุกราคา</option>{[300000, 500000, 800000, 1000000, 1500000].map((value) => <option key={value} value={String(value)}>ไม่เกิน {number.format(value)} บาท</option>)}</select></label>
        <label className="catalog-select"><span>ปีรถ</span><select value={filters.year} onChange={(event) => update("year", event.target.value)}><option value="all">ทุกปี</option>{years.map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></label>
        <label className="catalog-select"><span>สถานะรถ</span><select value={filters.status} onChange={(event) => update("status", event.target.value as CatalogFilters["status"])}><option value="all">ทุกสถานะ</option><option value="available">พร้อมขาย</option><option value="reserved">ติดจอง</option></select></label>
      </div>
      <div className="catalog-toolbar">
        <div className="catalog-result" aria-live="polite" aria-atomic="true"><SlidersHorizontal size={16} /><span>พบรถ <strong>{number.format(filtered.length)}</strong> คัน</span>{hasFilters ? <button type="button" onClick={() => setFilters(defaultCatalogFilters)}><X size={15} />ล้างตัวกรอง</button> : null}</div>
        <label className="catalog-sort"><ArrowDownUp size={15} /><span className="sr-only">เรียงลำดับรถ</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value as CatalogSort)}><option value="recommended">แนะนำสำหรับคุณ</option><option value="price-asc">ราคา: น้อยไปมาก</option><option value="price-desc">ราคา: มากไปน้อย</option><option value="year-desc">ปีรถใหม่ไปเก่า</option></select></label>
      </div>
      {filtered.length ? <div className="catalog-grid">{filtered.map((vehicle) => <VehicleCard vehicle={vehicle} key={vehicle.carId} />)}</div> : <div className="catalog-empty"><CarFront size={44} aria-hidden="true" /><h3>{vehicles.length ? "ยังไม่เจอคันที่ตรงใจ?" : "กำลังเตรียมรถให้คุณเลือกชม"}</h3><p>{vehicles.length ? "ลองปรับงบประมาณ หรือเลือกดูรถยี่ห้ออื่นเพิ่มเติม" : "ติดต่อร้านเพื่อสอบถามรถที่พร้อมขายได้โดยตรง"}</p>{hasFilters ? <button type="button" onClick={() => setFilters(defaultCatalogFilters)}><RotateCcw size={17} />ดูรถทั้งหมด</button> : <a href="#contact">ติดต่อ PD Car Center <ArrowUpRight size={17} /></a>}</div>}
    </div>
  );
}
