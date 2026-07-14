import { ArrowDown, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { VehicleBrowser } from "@/components/vehicle-browser";
import { getPublicVehicles } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getPublicVehicles();
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  return (
    <main>
      <section className="hero">
        <Image src="/images/storefront.jpg" alt="หน้าร้าน PD Car Center" fill sizes="100vw" priority />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">รถมือสองคัดคุณภาพ นครปฐม</p>
          <h1>PD Car Center</h1>
          <p>เลือกรถที่ใช่ ดูราคาและรายละเอียดจริงจากสต็อกรถของร้าน</p>
          <div className="hero-actions">
            <a className="primary-action" href="#inventory">ดูรถในร้าน <ArrowDown size={18} /></a>
            <a className="secondary-action" href={`tel:${phone}`}><Phone size={18} />โทรหาร้าน</a>
          </div>
        </div>
      </section>

      <section className="inventory-section" id="inventory">
        <div className="section-heading">
          <div><p className="eyebrow red">อัปเดตจากสต็อกร้าน</p><h2>รถที่น่าสนใจ</h2></div>
          <span>{result.vehicles.length} คัน</span>
        </div>
        {result.source !== "supabase" ? <div className="setup-notice"><strong>{result.message}</strong><span>โครงสร้างเว็บไซต์และขอบเขตข้อมูลปลอดภัยถูกเตรียมไว้แล้ว</span></div> : null}
        <VehicleBrowser vehicles={result.vehicles} />
      </section>

      <section className="contact-band" id="contact">
        <div><MapPin size={24} /><p><strong>PD Car Center</strong><span>23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000</span></p></div>
        <a href={`tel:${phone}`}><Phone size={20} />{phone}</a>
      </section>
    </main>
  );
}
