"use client";

import { ArrowDown, ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

export function ShowroomHero({ count }: { count: React.ReactNode }) {
  const photo = useRef<HTMLDivElement>(null);

  return (
    <section className="discovery-hero" id="showroom" aria-labelledby="showroom-title">
      <div className="discovery-copy">
        <p className="discovery-kicker"><span /> PD CAR CENTER / NAKHON PATHOM</p>
        <h1 id="showroom-title">คันที่ใช่<br /><span>ในจังหวะของคุณ</span></h1>
        <p className="discovery-description">รถมือสองที่คุณเลือกได้อย่างมั่นใจ<br />ดูภาพจริง ราคา และรายละเอียดจากหน้าร้าน</p>
        <div className="discovery-actions">
          <a className="primary-action" href="#inventory">เลือกรถในร้าน <ArrowDown size={19} /></a>
          <Link className="discovery-sell" href="/sell-car">มีรถอยากขาย <ArrowUpRight size={18} /></Link>
        </div>
        <div className="discovery-proof"><ShieldCheck size={18} /><span>ข้อมูลชัดเจน · คุยกับร้านได้โดยตรง</span></div>
      </div>
      <div
        ref={photo}
        className="discovery-photo"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          photo.current?.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
          photo.current?.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
        }}
      >
        <Image className="discovery-photo-base" src="/images/storefront.jpg" alt="รถที่หน้าร้าน PD Car Center นครปฐม" fill priority sizes="(max-width: 760px) 100vw, 56vw" />
        <div className="discovery-spotlight" aria-hidden="true" />
        <div className="discovery-photo-shade" aria-hidden="true" />
        <span className="discovery-location"><MapPin size={15} /> นครปฐม</span>
        <div className="discovery-photo-caption"><span>YOUR NEXT CHAPTER STARTS HERE</span><p>มาดูคันจริง<br />แล้วค่อยตัดสินใจ</p></div>
        <a className="discovery-stock" href="#inventory"><span><strong>{typeof count === "number" ? count.toLocaleString("th-TH") : count}</strong> คันในเว็บไซต์</span><ArrowUpRight size={26} /><span className="sr-only">ดูแคตาล็อกรถทั้งหมด</span></a>
      </div>
    </section>
  );
}
