"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PublicVehiclePhoto } from "@/lib/types";

export function VehicleImageGallery({ photos, title }: { photos: PublicVehiclePhoto[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | undefined>(undefined);
  const active = photos[activeIndex];
  const next = photos[activeIndex + 1];

  useEffect(() => {
    if (!next) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = next.fullUrl;
    document.head.appendChild(link);
    return () => link.remove();
  }, [next]);

  if (!active) return <div className="gallery-empty">กำลังเพิ่มรูปรถ</div>;

  function show(index: number) {
    setActiveIndex(Math.max(0, Math.min(photos.length - 1, index)));
  }

  return (
    <div className="vehicle-gallery-viewer">
      <div
        className="gallery-main-image"
        onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX; }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          const end = event.changedTouches[0]?.clientX;
          if (start === undefined || end === undefined) return;
          if (start - end > 45) show(activeIndex + 1);
          if (end - start > 45) show(activeIndex - 1);
          touchStartX.current = undefined;
        }}
      >
        <Image
          key={active.fileId}
          src={active.fullUrl}
          alt={`${title} รูปที่ ${activeIndex + 1}`}
          fill
          priority={activeIndex === 0}
          loading={activeIndex === 0 ? "eager" : "lazy"}
          sizes="(max-width: 900px) 100vw, 60vw"
        />
        {photos.length > 1 ? (
          <>
            <button type="button" className="gallery-arrow previous" onClick={() => show(activeIndex - 1)} disabled={activeIndex === 0} aria-label="รูปก่อนหน้า"><ChevronLeft /></button>
            <button type="button" className="gallery-arrow next" onClick={() => show(activeIndex + 1)} disabled={activeIndex === photos.length - 1} aria-label="รูปถัดไป"><ChevronRight /></button>
            <span className="gallery-counter">{activeIndex + 1}/{photos.length}</span>
          </>
        ) : null}
      </div>
      {photos.length > 1 ? (
        <div className="gallery-thumbnails" aria-label="เลือกรูปรถ">
          {photos.map((photo, index) => (
            <button type="button" key={photo.fileId} onClick={() => show(index)} className={index === activeIndex ? "active" : ""} aria-label={`แสดงรูปที่ ${index + 1}`}>
              <Image src={photo.thumbnailUrl || photo.fullUrl} alt="" fill loading={index < 2 ? "eager" : "lazy"} sizes="96px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
