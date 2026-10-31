import { ArrowRight, Play, Video } from "lucide-react";
import Link from "next/link";
import type { PublicVehicleListing } from "@/lib/types";

export function VehicleStories({ vehicles }: { vehicles: PublicVehicleListing[] }) {
  const videos = vehicles.filter((vehicle) => vehicle.youtubeVideoId);
  return (
    <>
      {videos.length > 1 ? <p className="story-swipe-hint">ปัดหรือเลื่อนเพื่อชมคันถัดไป <ArrowRight size={16} /></p> : null}
      <div className={`story-rail${videos.length ? "" : " is-empty"}`}>
      {videos.length ? videos.map((vehicle, index) => (
        <article className="story-card" key={vehicle.carId}>
          {vehicle.youtubeVideoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(vehicle.youtubeVideoId)}?playsinline=1&rel=0`}
              title={`วิดีโอ ${vehicle.title}`}
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
          <div className="story-shade" />
          <div className="story-card-top">
            <span>{index + 1 < 10 ? `0${index + 1}` : index + 1}</span>
            <span className="has-video"><Play size={14} fill="currentColor" />เล่นคลิป</span>
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
          <div><strong>ยังไม่มีวิดีโอที่เผยแพร่</strong><span>ดูรูปจริงของรถแต่ละคันได้จากรายการรถและหน้ารายละเอียด</span></div>
        </div>
      )}
      </div>
    </>
  );
}
