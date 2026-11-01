import { ArrowLeft, CalendarDays, Fuel, Gauge, MessageCircle, Palette, Phone, Settings2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessVisitInfo } from "@/components/business-visit-info";
import { MetaViewContent } from "@/components/meta-view-content";
import { VehicleDetailGallery } from "@/components/vehicle-detail-gallery";
import { getPublicLineUrl, publicLineOaId } from "@/lib/contact-info";
import { getPublicVehicle, VehicleDataUnavailableError } from "@/lib/vehicle-data";
import { relatedVehicles, vehicleMetaDescription } from "@/lib/vehicle-presentation";

export const dynamic = "force-dynamic";

const price = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("th-TH");

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params;
  const lookup = await getPublicVehicle(decodeURIComponent(identifier));
  if (lookup.status === "unavailable") {
    return { title: "ข้อมูลรถไม่พร้อมใช้งานชั่วคราว", robots: { index: false, follow: false } };
  }
  if (lookup.status === "not_found") return { title: "ไม่พบรถ" };

  const { vehicle } = lookup;
  const description = vehicleMetaDescription(vehicle);
  return {
    title: vehicle.title,
    description,
    alternates: { canonical: `/cars/${encodeURIComponent(vehicle.slug)}` },
    openGraph: {
      title: vehicle.title,
      description,
      url: `/cars/${encodeURIComponent(vehicle.slug)}`,
      images: vehicle.coverImageUrl ? [{ url: vehicle.coverImageUrl, alt: vehicle.title }] : undefined
    },
    other: {
      "product:retailer_item_id": vehicle.carId,
      "product:condition": "used",
      "product:availability": vehicle.status === "available" ? "in stock" : "out of stock",
      ...(vehicle.salePrice !== undefined ? {
        "product:price:amount": String(vehicle.salePrice),
        "product:price:currency": "THB"
      } : {})
    }
  };
}

export default async function VehiclePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const lookup = await getPublicVehicle(decodeURIComponent(identifier));
  if (lookup.status === "unavailable") throw new VehicleDataUnavailableError(lookup.message);
  if (lookup.status === "not_found") notFound();

  const { vehicle, vehicles } = lookup;
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const lineUrl = getPublicLineUrl();
  const gallery = vehicle.photos.length
    ? vehicle.photos
    : vehicle.coverImageUrl
      ? [{ fileId: "cover", url: vehicle.coverImageUrl, isPrimary: true, sortOrder: 0 }]
      : [];
  const suggestions = relatedVehicles(vehicle, vehicles);
  const hasFinance = [vehicle.downPayment, vehicle.financeAmount, vehicle.installment, vehicle.monthlyPayment].some((value) => value !== undefined);
  const description = vehicleMetaDescription(vehicle);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Product", "Vehicle"],
    "@id": `https://www.pdcarcenter.com/cars/${encodeURIComponent(vehicle.slug)}#vehicle`,
    name: vehicle.title,
    description,
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
      availability: vehicle.status === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
        <section className="gallery" aria-label={`รูปภาพ ${vehicle.title}`}>
          <VehicleDetailGallery title={vehicle.title} photos={gallery} />
        </section>

        <aside className="vehicle-summary">
          <span className={`status-badge ${vehicle.status}`}>{vehicle.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span>
          <p className="car-id">{vehicle.carId}</p>
          <h1>{vehicle.title}</h1>
          <strong className="detail-price">{vehicle.salePrice !== undefined ? price.format(vehicle.salePrice) : "สอบถามราคา"}</strong>
          <div className="spec-list">
            {vehicle.year > 0 ? <span><CalendarDays size={20} /><small>ปีรุ่น</small><b>{vehicle.year}</b></span> : null}
            {vehicle.mileage !== undefined ? <span><Gauge size={20} /><small>เลขไมล์</small><b>{number.format(vehicle.mileage)} กม.</b></span> : null}
            {vehicle.fuelType ? <span><Fuel size={20} /><small>เชื้อเพลิง</small><b>{vehicle.fuelType}</b></span> : null}
            {vehicle.transmission ? <span><Settings2 size={20} /><small>เกียร์</small><b>{vehicle.transmission}</b></span> : null}
            {vehicle.color ? <span><Palette size={20} /><small>สี</small><b>{vehicle.color}</b></span> : null}
          </div>
          {vehicle.conditionSummary ? <p className="condition-summary"><strong>สภาพรถโดยสรุป</strong>{vehicle.conditionSummary}</p> : null}
          {hasFinance ? <div className="finance-box">
            <span>ข้อมูลไฟแนนซ์จากประกาศ</span>
            {vehicle.monthlyPayment !== undefined ? <strong>{price.format(vehicle.monthlyPayment)}/เดือน</strong> : null}
            <dl>
              {vehicle.downPayment !== undefined ? <><dt>เงินดาวน์</dt><dd>{price.format(vehicle.downPayment)}</dd></> : null}
              {vehicle.financeAmount !== undefined ? <><dt>ยอดจัด</dt><dd>{price.format(vehicle.financeAmount)}</dd></> : null}
              {vehicle.installment !== undefined ? <><dt>ระยะผ่อน</dt><dd>{number.format(vehicle.installment)} งวด</dd></> : null}
            </dl>
            <small>เป็นข้อมูลประมาณการจากรายการรถ ไม่ใช่คำรับรองผลอนุมัติ โปรดสอบถามเงื่อนไขล่าสุดกับร้าน</small>
          </div> : null}
          <p className="contact-context">{vehicle.status === "reserved"
            ? <>รถคันนี้ติดจอง กรุณาแจ้งรหัส <strong>{vehicle.carId}</strong> เพื่อตรวจสถานะล่าสุดหรือฝากความสนใจ</>
            : <>โทรหรือเปิด LINE แล้วแจ้งรหัส <strong>{vehicle.carId}</strong> เพื่อสอบถามข้อมูลและนัดดูรถ</>}
            <small>ปุ่ม LINE เปิดโปรไฟล์ร้านและไม่ส่งข้อความอัตโนมัติ</small>
          </p>
          <div className="detail-actions">
            <a className="primary-action full" href={`tel:${phone}`} data-analytics="phone_click" data-analytics-car={vehicle.carId}><Phone size={19} />สอบถามรถคันนี้ {phone}</a>
            <a className="line-action full" href={lineUrl} target="_blank" rel="noopener noreferrer" data-analytics="line_click" data-analytics-car={vehicle.carId}><MessageCircle size={19} />เปิด LINE {publicLineOaId}</a>
          </div>
          <BusinessVisitInfo compact />
        </aside>
      </div>

      {vehicle.youtubeVideoId ? <section className="vehicle-video-section" aria-label={`วิดีโอ ${vehicle.title}`}>
        <h2>ชมรถคันนี้ผ่านวิดีโอ</h2>
        <div className="vehicle-video"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(vehicle.youtubeVideoId)}?playsinline=1&rel=0`} title={`วิดีโอ ${vehicle.title}`} loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
      </section> : null}

      <section className="vehicle-detail-notes" aria-label="รายละเอียดและเงื่อนไขรถ">
        {vehicle.description ? <details className="vehicle-description">
          <summary>อ่านรายละเอียดจากประกาศ</summary>
          <p>{vehicle.description}</p>
        </details> : null}
        <div className="warranty-note"><ShieldCheck size={24} /><div><strong>เงื่อนไขและการรับประกัน</strong><p>รายละเอียดอาจต่างกันในรถแต่ละคัน กรุณาสอบถามและขอเงื่อนไขเป็นลายลักษณ์อักษรก่อนวางเงินจอง</p></div></div>
      </section>

      {suggestions.length ? <section className="related-vehicles" aria-labelledby="related-title">
        <div><p className="eyebrow">MORE CARS</p><h2 id="related-title">รถคันอื่นที่น่าสนใจ</h2></div>
        <div className="related-vehicle-grid">{suggestions.map((candidate) => (
          <article key={candidate.carId}>
            <Link href={`/cars/${encodeURIComponent(candidate.slug)}`} className="related-vehicle-image">
              {candidate.coverImageUrl ? <Image src={candidate.coverImageUrl} alt={candidate.title} fill loading="lazy" sizes="(max-width: 700px) 100vw, 33vw" /> : <span>กำลังเพิ่มรูปภาพ</span>}
            </Link>
            <div><span className={`status-badge ${candidate.status}`}>{candidate.status === "reserved" ? "ติดจอง" : "พร้อมขาย"}</span><small>{candidate.carId}</small><h3><Link href={`/cars/${encodeURIComponent(candidate.slug)}`}>{candidate.title}</Link></h3><strong>{candidate.salePrice !== undefined ? price.format(candidate.salePrice) : "สอบถามราคา"}</strong></div>
          </article>
        ))}</div>
      </section> : null}

      <div className="mobile-sticky-actions" aria-label="ติดต่อสอบถามรถคันนี้">
        <a href={`tel:${phone}`} data-analytics="phone_click" data-analytics-car={vehicle.carId}><Phone size={18} />โทร · {vehicle.carId}</a>
        <a href={lineUrl} target="_blank" rel="noopener noreferrer" data-analytics="line_click" data-analytics-car={vehicle.carId}><MessageCircle size={18} />LINE · {vehicle.carId}</a>
      </div>
    </main>
  );
}
