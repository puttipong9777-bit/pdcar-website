"use client";

import { ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PublicVehiclePhoto } from "@/lib/types";

export function VehicleDetailGallery({ title, photos }: { title: string; photos: PublicVehiclePhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const pointerStart = useRef<number | null>(null);
  const count = photos.length;
  const isOpen = activeIndex !== null;

  const close = () => setActiveIndex(null);
  const move = (direction: number) => setActiveIndex((current) => current === null ? null : (current + direction + count) % count);
  const open = (index: number, button: HTMLButtonElement) => {
    opener.current = button;
    setActiveIndex(index);
  };

  useEffect(() => {
    if (!isOpen) return;
    const dialogElement = dialog.current;
    if (!dialogElement) return;
    const previousOverflow = document.body.style.overflow;
    const background: Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];
    let activeBranch: HTMLElement = dialogElement;
    while (activeBranch.parentElement) {
      const parent = activeBranch.parentElement;
      for (const child of parent.children) {
        if (child === activeBranch || !(child instanceof HTMLElement)) continue;
        background.push({ element: child, inert: child.inert, ariaHidden: child.getAttribute("aria-hidden") });
        child.inert = true;
        child.setAttribute("aria-hidden", "true");
      }
      if (parent === document.body) break;
      activeBranch = parent;
    }
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((current) => current === null ? null : (current - 1 + count) % count);
      if (event.key === "ArrowRight") setActiveIndex((current) => current === null ? null : (current + 1) % count);
      if (event.key === "Tab") {
        const focusable = Array.from(dialogElement.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"))
          .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && (document.activeElement === first || !dialogElement.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialogElement.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      for (const item of background) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute("aria-hidden");
        else item.element.setAttribute("aria-hidden", item.ariaHidden);
      }
      opener.current?.focus();
    };
  }, [isOpen, count]);

  if (!count) return <div className="gallery-empty">กำลังเพิ่มรูปรถ</div>;

  return <>
    <div className="gallery-image gallery-image-primary">
      <button type="button" className="gallery-open" onClick={(event) => open(0, event.currentTarget)} aria-label={`เปิดภาพหลักของ ${title} แบบเต็มจอ`}>
        <Image src={photos[0].url} alt={`${title} ภาพหลัก`} fill priority sizes="(max-width: 900px) 100vw, 60vw" />
        <span><Expand size={17} />เปิดรูปเต็มจอ</span>
      </button>
    </div>
    {count > 1 ? <div className="gallery-thumbnails" aria-label={`รูปเพิ่มเติมของ ${title}`}>
      {photos.slice(1, 5).map((photo, offset) => <button type="button" className="gallery-image" key={photo.fileId} onClick={(event) => open(offset + 1, event.currentTarget)} aria-label={`เปิดภาพที่ ${offset + 2} จาก ${count}`}>
        <Image src={photo.url} alt={`${title} ภาพที่ ${offset + 2}`} fill loading="lazy" sizes="(max-width: 900px) 50vw, 30vw" />
        {offset === 3 && count > 5 ? <span className="gallery-remainder">+{count - 5}</span> : null}
      </button>)}
    </div> : null}
    {count > 1 ? <button type="button" className="gallery-mobile-open" onClick={(event) => open(0, event.currentTarget)}><Images size={18} />ดูรูปทั้งหมด {count} ภาพ</button> : null}

    {activeIndex !== null ? <div ref={dialog} className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={`รูปภาพ ${title}`} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="gallery-lightbox-toolbar"><span>{activeIndex + 1} / {count}</span><button ref={closeButton} type="button" onClick={close} aria-label="ปิดรูปเต็มจอ"><X size={25} /></button></div>
      {count > 1 ? <button type="button" className="gallery-lightbox-nav previous" onClick={() => move(-1)} aria-label="รูปก่อนหน้า"><ChevronLeft size={31} /></button> : null}
      <div
        className="gallery-lightbox-image"
        onPointerDown={(event) => { pointerStart.current = event.clientX; }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const distance = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1);
        }}
      ><Image src={photos[activeIndex].url} alt={`${title} ภาพที่ ${activeIndex + 1}`} fill priority sizes="100vw" /></div>
      {count > 1 ? <button type="button" className="gallery-lightbox-nav next" onClick={() => move(1)} aria-label="รูปถัดไป"><ChevronRight size={31} /></button> : null}
    </div> : null}
  </>;
}
