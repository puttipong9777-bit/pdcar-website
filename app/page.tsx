import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Calculator,
  CarFront,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Headphones,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards
} from "lucide-react";
import Image from "next/image";
import { VehicleBrowser } from "@/components/vehicle-browser";
import { VehicleStories } from "@/components/vehicle-stories";
import { getPublicVehicles } from "@/lib/vehicle-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getPublicVehicles();
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL;

  return (
    <main>
      <section className="dealership-hero" id="showroom">
        <Image className="dealership-hero-image" src="/images/storefront.jpg" alt="หน้าร้าน PD Car Center นครปฐม" fill priority sizes="100vw" />
        <div className="dealership-hero-shade" aria-hidden="true" />
        <div className="dealership-hero-inner">
          <p className="hero-kicker"><span />PD CAR CENTER · NAKHON PATHOM</p>
          <h1>รถสวย คุณภาพดี<br /><em>คัดพิเศษทุกคัน</em></h1>
          <p className="hero-lead">เลือกรถมือสองจากสต็อกหน้าร้านจริง ดูราคาและรายละเอียดได้ชัดเจน พร้อมปรึกษาเรื่องรถและไฟแนนซ์กับทางร้านโดยตรง</p>
          <div className="hero-actions">
            <a className="primary-action" href="#inventory">ค้นหารถที่ใช่ <ArrowDown size={18} /></a>
            <a className="outline-action" href={`tel:${phone}`}><Phone size={18} />โทรปรึกษาฟรี</a>
          </div>
          <div className="hero-assurances" aria-label="จุดเด่นของร้าน">
            <div><BadgeCheck /><p><strong>รถคัดคุณภาพ</strong><span>ข้อมูลจากสต็อกจริง</span></p></div>
            <div><ShieldCheck /><p><strong>ข้อมูลชัดเจน</strong><span>ดูราคาและรายละเอียดได้ทันที</span></p></div>
            <div><Headphones /><p><strong>ดูแลทุกขั้นตอน</strong><span>ตั้งแต่เลือกรถจนถึงวันรับรถ</span></p></div>
          </div>
        </div>
      </section>

      <section className="stock-highlights" aria-label="ข้อมูลเด่นของ PD Car Center">
        <div><CarFront /><p><strong>{result.vehicles.length}</strong><span>คันพร้อมเลือกบนเว็บไซต์</span></p></div>
        <div><Clock3 /><p><strong>อัปเดตจริง</strong><span>สถานะพร้อมขายและติดจอง</span></p></div>
        <div><Smartphone /><p><strong>ดูง่ายทุกจอ</strong><span>คอมพิวเตอร์ ไอแพด และมือถือ</span></p></div>
        <div><WalletCards /><p><strong>ช่วยจัดไฟแนนซ์</strong><span>สอบถามแผนที่เหมาะกับคุณ</span></p></div>
      </section>

      <section className="inventory-section" id="inventory">
        <div className="section-heading wide-heading">
          <div>
            <p className="eyebrow">SELECTED CARS</p>
            <h2>รถสวยแนะนำจากหน้าร้าน</h2>
            <p>ค้นหาตามยี่ห้อ ปี และสถานะ แล้วกดดูภาพและรายละเอียดของรถแต่ละคันได้เลย</p>
          </div>
          <span>{result.vehicles.length} คันในเว็บไซต์</span>
        </div>
        {result.source !== "supabase" ? <div className="setup-notice"><strong>{result.message}</strong><span>หน้าเว็บไซต์ยังใช้งานได้ตามปกติ และจะดึงข้อมูลกลับมาอัตโนมัติเมื่อการเชื่อมต่อพร้อม</span></div> : null}
        <VehicleBrowser vehicles={result.vehicles} />
      </section>

      <section className="about-showcase" id="about">
        <div className="about-showcase-image">
          <Image src="/images/storefront.jpg" alt="รถภายในร้าน PD Car Center" fill sizes="(max-width: 820px) 100vw, 52vw" />
        </div>
        <div className="about-showcase-copy">
          <p className="eyebrow light">WELCOME TO PD CAR CENTER</p>
          <h2>ยินดีต้อนรับสู่<br /><em>PD Car Center</em></h2>
          <p>เราอยากให้การเลือกรถมือสองเป็นเรื่องง่าย คุณจึงดูสต็อก ราคา ภาพจริง และข้อมูลสำคัญได้ก่อนเดินทางมาที่ร้าน แล้วค่อยนัดชมรถคันที่สนใจแบบสบายใจ</p>
          <div className="about-points">
            <span><CheckCircle2 />เลือกรถจากหน้าร้านจริง</span>
            <span><CheckCircle2 />สอบถามรายละเอียดกับผู้ดูแลโดยตรง</span>
          </div>
          <a className="secondary-action" href="#contact">ดูข้อมูลติดต่อ <ArrowRight size={17} /></a>
        </div>
      </section>

      <section className="stories-section" id="videos">
        <div className="stories-heading">
          <div>
            <p className="eyebrow light">VERTICAL CAR VIDEOS · 9:16</p>
            <h2>ชมรถจริงให้ใกล้ขึ้น<br />ผ่านวิดีโอแนวตั้ง</h2>
          </div>
          <p>วิดีโอของรถแต่ละคันแสดงในสัดส่วน 9:16 เหมาะกับการรับชมบนโทรศัพท์ และเลื่อนชมคันถัดไปได้อย่างเป็นธรรมชาติ</p>
        </div>
        <VehicleStories vehicles={result.vehicles} />
      </section>

      <section className="knowledge-section" id="articles">
        <div className="section-heading knowledge-heading">
          <div>
            <p className="eyebrow">PDCAR KNOWLEDGE</p>
            <h2>บทความน่ารู้ก่อนซื้อรถ</h2>
          </div>
          <p>คำแนะนำสั้น กระชับ และนำไปใช้ตัดสินใจเลือกรถได้จริง</p>
        </div>

        <div className="article-grid">
          <article className="article-card featured-article">
            <div className="article-icon"><ShieldCheck /></div>
            <div className="article-meta"><span>คู่มือเลือกรถ</span><span>อ่าน 4 นาที</span></div>
            <h3>7 จุดสำคัญที่ควรตรวจ ก่อนตัดสินใจซื้อรถมือสอง</h3>
            <p>เริ่มจากประวัติรถ สภาพตัวถัง ห้องเครื่อง ช่วงล่าง ไปจนถึงเอกสาร เพื่อให้คุณเห็นภาพรวมก่อนทดลองขับและวางเงินจอง</p>
            <details>
              <summary>อ่านคำแนะนำ <ArrowRight size={17} /></summary>
              <ul>
                <li>เทียบเลขตัวถังและเลขเครื่องกับเล่มทะเบียนทุกครั้ง</li>
                <li>ทดลองขับทั้งความเร็วต่ำและถนนโล่ง ฟังเสียงช่วงล่างและเกียร์</li>
                <li>ขอรายละเอียดเงื่อนไขรับประกันและค่าใช้จ่ายทั้งหมดเป็นลายลักษณ์อักษร</li>
              </ul>
            </details>
          </article>

          <article className="article-card">
            <div className="article-icon"><Calculator /></div>
            <div className="article-meta"><span>วางแผนการเงิน</span><span>อ่าน 3 นาที</span></div>
            <h3>ค่างวดรถควรอยู่ที่เท่าไร จึงผ่อนได้สบายทุกเดือน</h3>
            <p>อย่าดูเฉพาะค่างวด ควรรวมค่าน้ำมัน ประกัน ภาษี และค่าบำรุงรักษา เพื่อให้ค่าใช้รถไม่กระทบเงินสำรอง</p>
            <details>
              <summary>อ่านคำแนะนำ <ArrowRight size={17} /></summary>
              <ul>
                <li>ตั้งงบค่าใช้รถทั้งหมดให้เหมาะกับรายรับสุทธิของครอบครัว</li>
                <li>เตรียมเงินสำรองอย่างน้อย 3–6 เดือนก่อนรับภาระระยะยาว</li>
                <li>เปรียบเทียบยอดจัด ระยะเวลา และดอกเบี้ย ไม่ดูเพียงตัวเลขค่างวด</li>
              </ul>
            </details>
          </article>

          <article className="article-card">
            <div className="article-icon"><FileCheck2 /></div>
            <div className="article-meta"><span>เตรียมไฟแนนซ์</span><span>อ่าน 2 นาที</span></div>
            <h3>เตรียมเอกสารอย่างไร ให้ยื่นไฟแนนซ์ได้คล่องขึ้น</h3>
            <p>เอกสารที่ครบและข้อมูลที่ตรงกันช่วยลดเวลาตรวจสอบ ทั้งผู้มีรายได้ประจำ เจ้าของกิจการ และอาชีพอิสระ</p>
            <details>
              <summary>อ่านคำแนะนำ <ArrowRight size={17} /></summary>
              <ul>
                <li>เตรียมบัตรประชาชน ทะเบียนบ้าน และเอกสารแสดงรายได้ฉบับล่าสุด</li>
                <li>ตรวจชื่อ ที่อยู่ และเบอร์โทรในเอกสารให้เป็นปัจจุบัน</li>
                <li>แจ้งรายได้และภาระผ่อนตามจริง เพื่อประเมินแผนที่เหมาะกับคุณ</li>
              </ul>
            </details>
          </article>
        </div>
      </section>

      <section className="confidence-section">
        <div className="confidence-copy">
          <p className="eyebrow">WHY PD CAR CENTER</p>
          <h2>เลือกรถง่าย<br />คุยกับร้านได้ตรง ๆ</h2>
          <p>เว็บไซต์นี้ช่วยให้คุณเตรียมข้อมูลให้พร้อม ก่อนนัดเข้ามาดูและทดลองขับรถจริงที่ร้านนครปฐม</p>
        </div>
        <div className="confidence-list">
          <div><CheckCircle2 /><p><strong>ข้อมูลตรงกับหน้าร้าน</strong><span>แสดงเฉพาะรถที่ร้านอนุญาตให้เผยแพร่</span></p></div>
          <div><CheckCircle2 /><p><strong>ราคาและค่างวดอ่านง่าย</strong><span>ดูข้อมูลสำคัญก่อนติดต่อสอบถามเพิ่มเติม</span></p></div>
          <div><CheckCircle2 /><p><strong>ติดต่อผู้ดูแลได้ทันที</strong><span>โทรหรือคุยผ่าน LINE เพื่อนัดดูรถ</span></p></div>
          <div><CheckCircle2 /><p><strong>ใช้งานได้ทุกอุปกรณ์</strong><span>จัดวางเหมาะกับคอมพิวเตอร์ ไอแพด และโทรศัพท์</span></p></div>
        </div>
      </section>

      <section className="contact-band" id="contact">
        <Image src="/images/storefront.jpg" alt="" fill sizes="100vw" aria-hidden="true" />
        <div className="contact-band-shade" aria-hidden="true" />
        <div className="contact-band-copy">
          <p>สนใจรถสวย คุยง่าย ออกรถได้จริง</p>
          <h2>ปรึกษาฟรี ไม่มีค่าใช้จ่าย</h2>
          <div className="contact-actions">
            <a className="phone-action" href={`tel:${phone}`}><Phone size={19} />{phone}</a>
            {lineUrl ? <a className="line-action" href={lineUrl} target="_blank" rel="noreferrer">คุยกับเราทาง LINE <ArrowRight size={18} /></a> : null}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <div><Sparkles size={18} /><strong>PD Car Center</strong></div>
          <p>รถมือสองคัดคุณภาพ ดูข้อมูลง่าย และติดต่อร้านได้โดยตรง</p>
        </div>
        <div className="footer-links">
          <strong>เมนูหลัก</strong>
          <a href="#inventory">รถในร้าน</a>
          <a href="#videos">วิดีโอ 9:16</a>
          <a href="#articles">บทความ</a>
        </div>
        <div className="footer-contact">
          <strong>ติดต่อเรา</strong>
          <a href={`tel:${phone}`}><Phone size={16} />{phone}</a>
          <p><MapPin size={16} />23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000</p>
        </div>
      </footer>
    </main>
  );
}
