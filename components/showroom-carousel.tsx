"use client";

import { ArrowLeft, ArrowRight, CarFront, Fuel, Gauge, MoveHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import type { PublicVehicleListing } from "@/lib/types";

const price = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0
});

const number = new Intl.NumberFormat("th-TH");

function circularOffset(index: number, activeIndex: number, length: number) {
  let offset = index - activeIndex;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

export function ShowroomCarousel({ vehicles }: { vehicles: PublicVehicleListing[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);

  useEffect(() => {
    if (activeIndex >= vehicles.length) setActiveIndex(0);
  }, [activeIndex, vehicles.length]);

  const activeVehicle = vehicles[activeIndex];
  const canRotate = vehicles.length > 1;

  function selectPrevious() {
    if (!canRotate) return;
    setActiveIndex((current) => (current - 1 + vehicles.length) % vehicles.length);
  }

  function selectNext() {
    if (!canRotate) return;
    setActiveIndex((current) => (current + 1) % vehicles.length);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canRotate) return;
    pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointerStart.current || pointerStart.current.id !== event.pointerId) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setDragX(Math.max(-120, Math.min(120, deltaX)));
    }
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (!pointerStart.current || pointerStart.current.id !== event.pointerId) return;
    const deltaX = event.clientX - pointerStart.current.x;
    const deltaY = event.clientY - pointerStart.current.y;
    if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) selectNext();
      else selectPrevious();
    }
    pointerStart.current = null;
    setDragX(0);
    setDragging(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectPrevious();
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectNext();
    }
  }

  return (
    <div className="showroom-shell">
      <div
        className={`showroom-stage${dragging ? " is-dragging" : ""}`}
        role="region"
        aria-roledescription="carousel"
        aria-label="โชว์รูมรถ เลื่อนซ้ายหรือขวาเพื่อเลือกรถ"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
      >
        <div className="showroom-orbit orbit-one" aria-hidden="true" />
        <div className="showroom-orbit orbit-two" aria-hidden="true" />

        {vehicles.length ? (
          vehicles.map((vehicle, index) => {
            const offset = circularOffset(index, activeIndex, vehicles.length);
            const distance = Math.abs(offset);
            const isVisible = distance <= 2;
            const position = offset === 0
              ? "center"
              : offset === -1
                ? "left-one"
                : offset === 1
                  ? "right-one"
                  : offset === -2
                    ? "left-two"
                    : "right-two";
            const style = {
              "--carousel-drag": `${dragX}px`
            } as CSSProperties;

            return (
              <button
                className={`showroom-car ${position}${index === activeIndex ? " is-active" : ""}${isVisible ? "" : " is-hidden"}`}
                style={style}
                type="button"
                key={vehicle.carId}
                onClick={() => setActiveIndex(index)}
                aria-label={`เลือกรถ ${vehicle.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
                tabIndex={isVisible ? 0 : -1}
              >
                <span className="showroom-car-media">
                  {vehicle.coverImageUrl ? (
                    <Image
                      src={vehicle.coverImageUrl}
                      alt=""
                      fill
                      priority={index === 0}
                      sizes="(max-width: 720px) 72vw, (max-width: 1100px) 44vw, 32vw"
                    />
                  ) : (
                    <span className="showroom-car-placeholder"><CarFront size={68} /><small>กำลังเพิ่มรูป</small></span>
                  )}
                </span>
                <span className="showroom-car-label">{vehicle.brand || "PD Car"}</span>
              </button>
            );
          })
        ) : (
          <div className="showroom-empty">
            <div className="showroom-empty-photo">
              <Image src="/images/storefront.jpg" alt="รถที่หน้าร้าน PD Car Center" fill priority sizes="(max-width: 720px) 78vw, 40vw" />
            </div>
            <span>กำลังอัปเดตรถเข้าโชว์รูมออนไลน์</span>
          </div>
        )}

        {canRotate ? (
          <>
            <button className="showroom-arrow previous" type="button" onClick={selectPrevious} aria-label="เลือกรถคันก่อนหน้า"><ArrowLeft /></button>
            <button className="showroom-arrow next" type="button" onClick={selectNext} aria-label="เลือกรถคันถัดไป"><ArrowRight /></button>
          </>
        ) : null}
      </div>

      <div className="showroom-selection" aria-live="polite">
        {activeVehicle ? (
          <>
            <div className="showroom-selection-title">
              <span>{activeVehicle.carId}</span>
              <strong>{activeVehicle.title}</strong>
            </div>
            <div className="showroom-selection-specs">
              {activeVehicle.mileage !== undefined ? <span><Gauge size={15} />{number.format(activeVehicle.mileage)} กม.</span> : null}
              {activeVehicle.fuelType ? <span><Fuel size={15} />{activeVehicle.fuelType}</span> : null}
            </div>
            <div className="showroom-selection-action">
              <strong>{activeVehicle.salePrice !== undefined ? price.format(activeVehicle.salePrice) : "สอบถามราคา"}</strong>
              <Link href={`/cars/${encodeURIComponent(activeVehicle.slug)}`}>ดูรายละเอียด <ArrowRight size={16} /></Link>
            </div>
          </>
        ) : (
          <>
            <div className="showroom-selection-title">
              <span>PD CAR CENTER</span>
              <strong>รถจริงจากสต็อกหน้าร้าน</strong>
            </div>
            <p>เมื่อเปิดเผยแพร่รถ รถจะปรากฏในวงแหวนนี้ทันที</p>
          </>
        )}
      </div>

      {canRotate ? <p className="swipe-hint"><MoveHorizontal size={18} />ปัด เลื่อน หรือกดลูกศรเพื่อเลือกรถ</p> : null}
    </div>
  );
}
