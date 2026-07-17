import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards
} from "lucide-react";
import { ShowroomCarousel } from "@/components/showroom-carousel";
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
      <section className="premium-hero" id="showroom">
        <div className="hero-glow glow-one" aria-hidden="true" />
        <div className="hero-glow glow-two" aria-hidden="true" />
        <div className="premium-hero-grid">
          <div className="premium-hero-copy">
            <p className="hero-kicker"><span />PD CAR CENTER · NAKHON PATHOM</p>
            <h1>เลือกรถที่ใช่<br /><em>ขับมั่นใจ</em> ทุกเส้นทาง</h1>
            <p className="hero-lead">สำรวจรถมือสองคัดคุณภาพจากหน้าร้านจริง ปัดเพื่อเลือกรถ ดูราคา และรายละเอียดได้อย่างลื่นไหลบนทุกหน้าจอ</p>
            <div className="hero-actions">
              <a className="primary-action gold" href="#inventory">ดูรถทั้งหมด <ArrowDown size={18} /></a>
              <a className="text-action" href={`tel:${phone}`}><Phone size={18} />ปรึกษาเรื่องรถ</a>
            </div>
          </div>
          <ShowroomCarousel vehicles={result.vehicles} />
        </div>

        <div className="hero-proof" aria-label="จุดเด่นของเว็บไซต์">
          <div><BadgeCheck /><p><strong>รถคัดคุณภาพ</strong><span>ข้อมูลจากสต็อกจริง</span></p></div>
          <div><Clock3 /><p><strong>อัปเดตตลอด</strong><span>พร้อมขายและติดจอง</span></p></div>
          <div><Smartphone /><p><strong>ดูได้ทุกหน้าจอ</strong><span>ปัดเลือกได้ด้วยนิ้ว</span></p></div>
          <div><WalletCards /><p><strong>ช่วยจัดไฟแนนซ์</strong><span>ปรึกษาได้กับทางร้าน</span></p></div>
        </div>
      </section>

      <section className="inventory-section" id="inventory">
        <div className="section-heading wide-heading">
          <div>
            <p className="eyebrow gold-text">ONLINE INVENTORY</p>
            <h2>รถพร้อมให้คุณเลือก</h2>
            <p>ค้นหาและเปรียบเทียบรถจากสต็อกหน้าร้านได้ในที่เดียว</p>
          </div>
          <span>{result.vehicles.length} คันในโชว์รูม</span>
        </div>
        {result.source !== "supabase" ? <div className="setup-notice"><strong>{result.message}</strong><span>หน้าเว็บไซต์ยังใช้งานได้ตามปกติ และจะดึงข้อมูลกลับมาอัตโนมัติเมื่อการเชื่อมต่อพร้อม</span></div> : null}
        <VehicleBrowser vehicles={result.vehicles} />
      </section>

      <section className="stories-section" id="videos">
        <div className="stories-heading">
          <div>
            <p className="eyebrow gold-text">VERTICAL CAR STORIES</p>
            <h2>ดูรถจริงให้ใกล้ขึ้น<br />ผ่านคลิปแนวตั้ง</h2>
          </div>
          <p>คลิปของรถแต่ละคันจะเรียงตามสต็อกหน้าร้าน ปัดซ้าย–ขวาเพื่อชมต่อได้เหมือนดูวิดีโอบนโทรศัพท์</p>
        </div>
        <VehicleStories vehicles={result.vehicles} />
      </section>

      <section className="knowledge-section" id="articles">
        <div className="section-heading knowledge-heading">
          <div>
            <p className="eyebrow gold-text">PDCAR KNOWLEDGE</p>
            <h2>รู้ก่อนซื้อ เลือกได้มั่นใจกว่า</h2>
          </div>
          <p>บทความสั้น อ่านง่าย และนำไปใช้ตัดสินใจเลือกรถได้จริง</p>
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
          <p className="eyebrow gold-text">WHY PD CAR CENTER</p>
          <h2>ดูรถง่าย<br />คุยกับร้านได้ตรง ๆ</h2>
          <p>เว็บไซต์ออกแบบมาให้คุณเริ่มต้นค้นหารถได้สะดวก ก่อนนัดเข้ามาดูรถจริงที่ร้านนครปฐม</p>
        </div>
        <div className="confidence-list">
          <div><CheckCircle2 /><p><strong>ข้อมูลตรงกับหน้าร้าน</strong><span>แสดงเฉพาะรถที่ร้านอนุญาตให้เผยแพร่</span></p></div>
          <div><CheckCircle2 /><p><strong>ราคาและค่างวดอ่านง่าย</strong><span>ดูข้อมูลสำคัญก่อนติดต่อสอบถามเพิ่มเติม</span></p></div>
          <div><CheckCircle2 /><p><strong>ติดต่อคนดูแลได้ทันที</strong><span>โทรหรือคุยผ่าน LINE เพื่อขอนัดดูรถ</span></p></div>
        </div>
      </section>

      <section className="contact-band" id="contact">
        <div className="contact-location">
          <MapPin size={26} />
          <p><strong>PD Car Center</strong><span>23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000</span></p>
        </div>
        <div className="contact-actions">
          {lineUrl ? <a className="line-action" href={lineUrl} target="_blank" rel="noreferrer">คุยกับเราทาง LINE <ArrowRight size={18} /></a> : null}
          <a className="phone-action" href={`tel:${phone}`}><Phone size={19} />{phone}</a>
        </div>
      </section>

      <footer className="site-footer">
        <div><Sparkles size={18} /><strong>PD Car Center</strong></div>
        <p>รถมือสองคัดคุณภาพ นครปฐม</p>
      </footer>
    </main>
  );
}
