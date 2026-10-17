import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Camera,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "รับซื้อรถมือสองนครปฐม | ขายรถให้เรา",
  description: "อยากขายรถมือสองในนครปฐม ส่งยี่ห้อ รุ่น ปี เลขไมล์ และรูปถ่ายให้ PD Car Center ประเมินเบื้องต้นก่อนนัดดูรถจริง ติดต่อร้านโดยตรงผ่านช่องทางที่แสดงบนเว็บไซต์",
  alternates: { canonical: "/sell-car" },
  openGraph: {
    title: "ขายรถมือสองให้ PD Car Center นครปฐม",
    description: "เริ่มประเมินรถง่าย ส่งข้อมูลเบื้องต้น คุยกับร้านโดยตรง และนัดตรวจรถเมื่อพร้อม",
    url: "/sell-car",
    images: [{ url: "/og-sell-car.png", width: 1732, height: 908, alt: "ขายรถมือสองให้ PD Car Center นครปฐม" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "รับซื้อรถมือสองนครปฐม | PD Car Center",
    description: "มีรถอยากขาย ส่งข้อมูลเบื้องต้นและคุยกับร้านได้โดยตรง",
    images: ["/og-sell-car.png"]
  }
};

const faqs = [
  ["ต้องเตรียมข้อมูลอะไรเพื่อประเมินรถเบื้องต้น?", "ส่งยี่ห้อ รุ่น ปีจดทะเบียน เลขไมล์ จังหวัดที่รถอยู่ รูปภายนอก ภายใน และหน้าปัดเลขไมล์ ข้อมูลที่ครบช่วยให้คุยรายละเอียดได้เร็วขึ้น"],
  ["รถที่ยังผ่อนไม่หมดสอบถามได้ไหม?", "สอบถามได้ กรุณาแจ้งยอดคงเหลือโดยประมาณและชื่อไฟแนนซ์ เพื่อให้ร้านเข้าใจสถานะของรถก่อนแนะนำขั้นตอนที่เหมาะสม"],
  ["ประเมินผ่านรูปแล้วเป็นราคาสุดท้ายหรือไม่?", "การประเมินจากข้อมูลและรูปเป็นเพียงข้อมูลเบื้องต้น ราคาซื้อขายจริงต้องพิจารณาสภาพรถ เอกสาร และรายละเอียดอื่นหลังตรวจรถ"],
  ["ต้องนำรถมาที่ร้านทันทีหรือไม่?", "เริ่มจากส่งข้อมูลและคุยกับร้านก่อนได้ เมื่อต้องตรวจรถจริงจึงค่อยตกลงสถานที่และเวลานัดหมายกับผู้ดูแล"],
  ["ส่งรูปและข้อมูลรถทางไหน?", "ส่งรูปและข้อมูลรถทาง LINE @pdcar ผ่านปุ่มในหน้านี้ หรือโทรหาร้านเพื่อนัดหมายก่อนตรวจรถ"],
] as const;

export default function SellCarPage() {
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL || "https://line.me/R/ti/p/%40pdcar";
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": "https://www.pdcarcenter.com/sell-car#service",
        name: "บริการรับซื้อรถมือสอง PD Car Center",
        serviceType: "รับซื้อรถมือสองและประเมินรถเบื้องต้น",
        provider: { "@id": "https://www.pdcarcenter.com/#business" },
        areaServed: { "@type": "AdministrativeArea", name: "นครปฐมและพื้นที่ใกล้เคียง" },
        url: "https://www.pdcarcenter.com/sell-car",
        description: "ติดต่อ PD Car Center เพื่อส่งข้อมูลรถ ประเมินเบื้องต้น และนัดตรวจรถก่อนตกลงซื้อขาย"
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "หน้าแรก", item: "https://www.pdcarcenter.com/" },
          { "@type": "ListItem", position: 2, name: "ขายรถให้เรา", item: "https://www.pdcarcenter.com/sell-car" }
        ]
      }
    ]
  };

  return (
    <main className="sell-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd).replace(/</g, "\\u003c") }} />

      <section className="sell-page-hero">
        <Image src="/media/site/storefront" alt="PD Car Center รับซื้อรถมือสองนครปฐม" fill priority sizes="100vw" />
        <div className="sell-page-hero-shade" aria-hidden="true" />
        <div className="sell-page-hero-inner">
          <Link className="sell-back-link" href="/"><ArrowLeft size={18} />กลับหน้าแรก</Link>
          <div className="sell-page-hero-grid">
            <div>
              <p className="hero-kicker"><span />SELL YOUR CAR · PD CAR CENTER</p>
              <h1>รับซื้อรถมือสองนครปฐม<br /><em>เริ่มประเมินกับเรา</em></h1>
              <p>สำหรับเจ้าของรถที่กำลังค้นหาที่รับซื้อรถมือสองในนครปฐม ส่งข้อมูลเบื้องต้นและคุยกับผู้ดูแลร้านโดยตรง ก่อนนัดตรวจรถจริงเมื่อคุณพร้อม</p>
              <div className="sell-hero-actions">
                {lineUrl ? <a className="line-action" href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click"><MessageCircle size={19} />ส่งข้อมูลรถทาง LINE</a> : null}
                <a className="outline-action" href={`tel:${phone}`} data-analytics="phone_click"><Phone size={19} />โทร {phone}</a>
              </div>
            </div>
            <aside className="sell-quick-card">
              <span>ข้อมูลที่ควรส่ง</span>
              <ul>
                <li><CarFront />ยี่ห้อ รุ่น รุ่นย่อย และปีรถ</li>
                <li><Gauge />เลขไมล์และจังหวัดที่รถอยู่</li>
                <li><Camera />รูปภายนอก ภายใน และหน้าปัด</li>
                <li><FileText />สถานะเล่มทะเบียนและไฟแนนซ์</li>
              </ul>
              <small>ไม่ต้องส่งข้อมูลส่วนตัวสำคัญหรือภาพบัตรประชาชนในขั้นตอนแรก</small>
            </aside>
          </div>
        </div>
      </section>

      <section className="sell-trust-strip" aria-label="จุดเด่นของการติดต่อขายรถ">
        <div><BadgeCheck /><p><strong>คุยกับร้านโดยตรง</strong><span>ไม่ผ่านแบบฟอร์มที่เก็บข้อมูล</span></p></div>
        <div><Banknote /><p><strong>ประเมินจากข้อมูลจริง</strong><span>ราคาเบื้องต้นขึ้นกับรายละเอียดรถ</span></p></div>
        <div><ShieldCheck /><p><strong>ชัดเจนก่อนนัด</strong><span>ตรวจสภาพและเอกสารก่อนซื้อขาย</span></p></div>
      </section>

      <section className="sell-process-section">
        <div className="sell-section-heading">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>4 ขั้นตอนขายรถ<br />ที่เข้าใจง่าย</h2>
          <p>เริ่มต้นจากข้อมูลที่คุณมี แล้วค่อยนัดตรวจรถเมื่อรายละเอียดเบื้องต้นตรงกัน</p>
        </div>
        <div className="sell-process-grid">
          <article><span>01</span><Camera /><h3>ส่งข้อมูลรถ</h3><p>แจ้งยี่ห้อ รุ่น ปี เลขไมล์ จังหวัด และรูปถ่ายเบื้องต้นผ่านช่องทางติดต่อของร้าน</p></article>
          <article><span>02</span><Banknote /><h3>ประเมินเบื้องต้น</h3><p>ผู้ดูแลร้านสอบถามรายละเอียดและแจ้งแนวทางประเมินจากข้อมูลที่ได้รับ</p></article>
          <article><span>03</span><ClipboardCheck /><h3>นัดตรวจรถจริง</h3><p>ตรวจสภาพรถ เลขตัวถัง เล่มทะเบียน และข้อมูลที่เกี่ยวข้องก่อนตกลงราคา</p></article>
          <article><span>04</span><FileText /><h3>ตกลงและทำเอกสาร</h3><p>เมื่อทั้งสองฝ่ายตกลงกัน จึงดำเนินเอกสารและขั้นตอนซื้อขายตามรายละเอียดจริง</p></article>
        </div>
      </section>

      <section className="sell-prepare-section">
        <div className="sell-prepare-card">
          <p className="eyebrow light">PREPARE YOUR CAR</p>
          <h2>เตรียมข้อมูลให้ครบ<br />ช่วยประเมินได้เร็วขึ้น</h2>
          <div className="sell-checklist">
            <span><CheckCircle2 />ยี่ห้อ รุ่น รุ่นย่อย ปีจดทะเบียน</span>
            <span><CheckCircle2 />เลขไมล์ สี และจังหวัดที่รถอยู่</span>
            <span><CheckCircle2 />รูปด้านหน้า หลัง ซ้าย ขวา และภายใน</span>
            <span><CheckCircle2 />รูปหน้าปัดเลขไมล์และตำหนิที่เห็นชัด</span>
            <span><CheckCircle2 />สถานะเล่มทะเบียนและยอดไฟแนนซ์โดยประมาณ</span>
          </div>
        </div>
        <div className="sell-privacy-card">
          <ShieldCheck size={34} />
          <h3>เริ่มต้นโดยไม่ส่งข้อมูลส่วนตัวสำคัญ</h3>
          <p>ขั้นตอนประเมินเบื้องต้นไม่จำเป็นต้องส่งภาพบัตรประชาชน สำเนาทะเบียนบ้าน รหัสผ่าน หรือรหัส OTP หากต้องใช้เอกสารภายหลัง ควรยืนยันกับผู้ดูแลร้านก่อนทุกครั้ง</p>
          <div><MapPin size={20} /><span>PD Car Center<br />23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000</span></div>
        </div>
      </section>

      <section className="sell-faq-section">
        <div className="sell-section-heading">
          <p className="eyebrow">QUESTIONS BEFORE SELLING</p>
          <h2>คำถามก่อนขายรถ</h2>
        </div>
        <div className="sell-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ArrowRight size={18} /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="sell-final-cta">
        <div>
          <p>มีข้อมูลรถพร้อมแล้ว?</p>
          <h2>เริ่มคุยกับร้านได้เลย</h2>
          <span>ส่งข้อมูลเบื้องต้น หรือโทรสอบถามก่อนนัดตรวจรถจริง</span>
        </div>
        <div>
          {lineUrl ? <a className="line-action" href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click"><MessageCircle size={19} />ส่งข้อมูลทาง LINE</a> : null}
          <a className="phone-action" href={`tel:${phone}`} data-analytics="phone_click"><Phone size={19} />{phone}</a>
        </div>
      </section>

      <div className="mobile-sticky-actions" aria-label="ติดต่อขายรถ">
        <a href={`tel:${phone}`} data-analytics="phone_click"><Phone size={18} />โทรหาร้าน</a>
        {lineUrl ? <a href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click"><MessageCircle size={18} />ส่งข้อมูลทาง LINE</a> : null}
      </div>
    </main>
  );
}
