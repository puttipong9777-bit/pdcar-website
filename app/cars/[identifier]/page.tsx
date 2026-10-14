import { ArrowLeft, Fuel, Gauge, Images, MessageCircle, Phone, Settings2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetaViewContent } from "@/components/meta-view-content";
import { getPublicVehicle } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

const price = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("th-TH");

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params;
  const vehicle = await getPublicVehicle(decodeURIComponent(identifier));
  return vehicle ? {
    title: vehicle.title,
    description: vehicle.description || `${vehicle.title} ดูราคา รูปจริง เลขไมล์ และรายละเอียดรถจาก PD Car Center นครปฐม`,
    alternates: { canonical: `/cars/${encodeURIComponent(vehicle.slug)}` },
    openGraph: {
      title: vehicle.title,
      description: vehicle.description || `ดูรายละเอียด ${vehicle.title} ที่ PD Car Center`,
      url: `/cars/${encodeURIComponent(vehicle.slug)}`,
      images: vehicle.coverImageUrl ? [{ url: vehicle.coverImageUrl, alt: vehicle.title }] : undefined
    },
    other: {
      "product:retailer_item_id": vehicle.carId,
      "product:condition": "used",
      "product:availability": vehicle.status === "available" ? "in stock" : "out of stock",
      "product:price:amount": String(vehicle.salePrice ?? 0),
      "product:price:currency": "THB"
    }
  } : { title: "ไม่พบรถ" };
}

export default async function VehiclePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const vehicle = await getPublicVehicle(decodeURIComponent(identifier));
  if (!vehicle) notFound();
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL;
  const gallery = vehicle.photos.length ? vehicle.photos : vehicle.coverImageUrl ? [{ fileId: "cover", url: vehicle.coverImageUrl, isPrimary: true, sortOrder: 0 }] : [];
  const [primaryPhoto, ...extraPhotos] = gallery;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Product", "Vehicle"],
    "@id": `https://www.pdcarcenter.com/cars/${encodeURIComponent(vehicle.slug)}#vehicle`,
    name: vehicle.title,
    description: vehicle.description || `${vehicle.title} รถมือสองจาก PD Car Center นครปฐม`,
    image: gallery.map((photo) => photo.url),
    sku: vehicle.carId,
    brand: vehicle.brand ? { "@type": "Brand", name: vehicle.brand } : undefined,
    model: vehicle.model,
    vehicleModelDate: vehicle.year ? String(vehicle.year) : undefined,
    color: vehicle.color,
    mileageFromOdometer: vehicle.mileage !== undefined ? { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: "KMT" } : undefined,
    itemCondition: "https://schema.org/UsedCondition",
    offers: vehicle.salePrice !== undefined ? {
      "@type": "Offer",
      price: vehicle.salePrice,
      priceCurrency: "THB",
      availability: vehicle.status === "available" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability",
      url: `https://www.pdcarcenter.com/cars/${encodeURIComponent(vehicle.slug)}`,
      seller: { "@id": "https://www.pdcarcenter.com/#business" }
    } : undefined
  };
  return (
    <main className="detail-page">
      <MetaViewContent carId={vehicle.carId} title={vehicle.title} value={vehicle.salePrice} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }} />
      <Link className="back-link" href="/#inventory"><ArrowLeft size={18} />กลับไปดูรถทั้งหมด</Link>
      <div className="detail-layout">
        <section className="gallery">
          {primaryPhoto ? <div className="gallery-image gallery-image-primary"><Image src={primaryPhoto.url} alt={`${vehicle.title} ภาพหลัก`} fill priority sizes="(max-width: 900px) 100vw, 60vw" /></div> : null}
          {vehicle.youtubeVideoId ? <div className="vehicle-video"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(vehicle.youtubeVideoId)}?playsinline=1&rel=0`} title={`วิดีโอ ${vehicle.title}`} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : null}
          {extraPhotos.length ? <details className="gallery-more">
            <summary><Images size={19} />ดูรูปทั้งหมด {gallery.length} ภาพ</summary>
            <div className="gallery-more-grid">
              {extraPhotos.map((photo, index) => <div className="gallery-image" key={photo.fileId}><Image src={photo.url} alt={`${vehicle.title} ภาพที่ ${index + 2}`} fill sizes="(max-width: 900px) 100vw, 30vw" /></div>)}
            </div>
          </details> : null}
          {!primaryPhoto && !vehicle.youtubeVideoId ? <div className="gallery-empty">กำลังเพิ่มรูปรถ</div> : null}
        </section>
        <aside className="vehicle-summary">
          <span className={`status-badge ${vehicle.status}`}>{vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span>
          <p className="car-id">{vehicle.carId}</p><h1>{vehicle.title}</h1>
          <strong className="detail-price">{vehicle.salePrice !== undefined ? price.format(vehicle.salePrice) : "สอบถามราคา"}</strong>
          <div className="spec-list">
            {vehicle.mileage !== undefined ? <span><Gauge size={20} /><small>เลขไมล์</small><b>{number.format(vehicle.mileage)} กม.</b></span> : null}
            {vehicle.fuelType ? <span><Fuel size={20} /><small>เชื้อเพลิง</small><b>{vehicle.fuelType}</b></span> : null}
            {vehicle.transmission ? <span><Settings2 size={20} /><small>เกียร์</small><b>{vehicle.transmission}</b></span> : null}
          </div>
          {vehicle.description ? <p className="description">{vehicle.description}</p> : null}
          {vehicle.monthlyPayment !== undefined ? <div className="finance-box"><span>ผ่อนประมาณ</span><strong>{price.format(vehicle.monthlyPayment)}/เดือน</strong>{vehicle.installment ? <small>{vehicle.installment} งวด</small> : null}</div> : null}
          <div className="detail-actions">
            <a className="primary-action full" href={`tel:${phone}`} data-analytics="phone_click" data-analytics-car={vehicle.carId}><Phone size={19} />สอบถามรถคันนี้ {phone}</a>
            {lineUrl ? <a className="line-action full" href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click" data-analytics-car={vehicle.carId}><MessageCircle size={19} />สอบถามทาง LINE</a> : null}
          </div>
        </aside>
      </div>
      <div className="mobile-sticky-actions" aria-label="ติดต่อสอบถามรถคันนี้">
        <a href={`tel:${phone}`} data-analytics="phone_click" data-analytics-car={vehicle.carId}><Phone size={18} />โทรหาร้าน</a>
        {lineUrl ? <a href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click" data-analytics-car={vehicle.carId}><MessageCircle size={18} />สอบถามทาง LINE</a> : null}
      </div>
    </main>
  );
}
