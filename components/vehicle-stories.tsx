import { CarFront, Play, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PublicVehicleListing } from "@/lib/types";

export function VehicleStories({ vehicles }: { vehicles: PublicVehicleListing[] }) {
  return (
    <div className={`story-rail${vehicles.length ? "" : " is-empty"}`}>
      {vehicles.length ? vehicles.map((vehicle, index) => (
        <article className="story-card" key={vehicle.carId}>
          {vehicle.youtubeVideoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(vehicle.youtubeVideoId)}?playsinline=1&rel=0`}
              title={`วิดีโอ ${vehicle.title}`}
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : vehicle.coverImageUrl ? (
            <Image src={vehicle.coverImageUrl} alt={vehicle.title} fill sizes="(max-width: 720px) 72vw, 290px" />
          ) : (
            <div className="story-placeholder"><CarFront size={46} /><span>กำลังเพิ่มสื่อ</span></div>
          )}
          <div className="story-shade" />
          <div className="story-card-top">
            <span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
            <span className={vehicle.youtubeVideoId ? "has-video" : ""}>{vehicle.youtubeVideoId ? <Play size={14} fill="currentColor" /> : <Video size={14} />}{vehicle.youtubeVideoId ? "เล่นคลิป" : "คลิปกำลังมา"}</span>
          </div>
          <div className="story-card-copy">
            <small>{vehicle.carId}</small>
            <h3>{vehicle.title}</h3>
            <Link href={`/cars/${encodeURIComponent(vehicle.slug)}`}>ดูรถคันนี้</Link>
          </div>
        </article>
      )) : (
        <div className="story-empty-card">
          <Video size={38} />
          <div><strong>พื้นที่วิดีโอรถหน้าร้าน</strong><span>เมื่อเพิ่มคลิปให้รถแต่ละคัน ระบบจะเรียงคลิปแนวตั้งให้ลูกค้าปัดชมได้ทันที</span></div>
        </div>
      )}
    </div>
  );
}
