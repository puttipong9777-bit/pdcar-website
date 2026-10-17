import {
  ArrowRight,
  Banknote,
  Calculator,
  Camera,
  CarFront,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BusinessVisitInfo } from "@/components/business-visit-info";
import { CatalogBrowser } from "@/components/catalog-browser";
import { VehicleStories } from "@/components/vehicle-stories";
import { ShowroomHero } from "@/components/showroom-hero";
import { getPublicVehicles } from "@/lib/vehicle-data";
import "./showroom.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getPublicVehicles();
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL || "https://line.me/R/ti/p/%40pdcar";

  return (
    <main className="showroom-page">
      <ShowroomHero count={result.vehicles.length} />

      <section className="stock-highlights" aria-label="ข้อมูลเด่นของ PD Car Center">
        <div><CarFront /><p><strong>{result.vehicles.length}</strong><span>คันพร้อมเลือกบนเว็บไซต์</span></p></div>
        <div><Clock3 /><p><strong>อัปเดตจริง</strong><span>สถานะพร้อมขายและติดจอง</span></p></div>
        <div><Smartphone /><p><strong>ดูง่ายทุกจอ</strong><span>คอมพิวเตอร์ ไอแพด และมือถือ</span></p></div>
        <div><WalletCards /><p><strong>ซื้อและรับซื้อรถ</strong><span>คุยกับผู้ดูแลร้านได้โดยตรง</span></p></div>
      </section>

      <section className="inventory-section" id="inventory">
        <div className="section-heading wide-heading">
          <div>
            <p className="eyebrow">FIND YOUR NEXT DRIVE</p>
            <h2>รถมือสองในร้าน PD Car Center</h2>
            <p>เลือกยี่ห้อ ตั้งงบ แล้วทำความรู้จักคันที่ถูกใจ</p>
          </div>
          <span>{result.vehicles.length} คันในเว็บไซต์</span>
        </div>
        {result.source !== "supabase" ? <div className="setup-notice"><strong>{result.message}</strong><span>หน้าเว็บไซต์ยังใช้งานได้ตามปกติ และจะดึงข้อมูลกลับมาอัตโนมัติเมื่อการเชื่อมต่อพร้อม</span></div> : null}
        <CatalogBrowser vehicles={result.vehicles} />
      </section>

      <section className="sell-faq-section" aria-labelledby="buying-questions">
        <div className="sell-section-heading"><h2 id="buying-questions">คำถามก่อนซื้อรถมือสองในนครปฐม</h2></div>
        <div className="sell-faq-list">
          <details><summary>ดูรถที่พร้อมขายได้ที่ไหน?<ArrowRight size={18} /></summary><p>ดู<a href="#inventory">รายการรถในร้าน</a> พร้อมราคา รูป และสถานะรายคัน รถที่มีป้าย “ติดจอง” ยังไม่พร้อมขาย ควรสอบถามสถานะล่าสุดและนัดหมายก่อนเดินทาง</p></details>
          <details><summary>PD Car Center อยู่ที่ไหน และนัดชมรถอย่างไร?<ArrowRight size={18} /></summary><p>ร้านอยู่ที่ 23/2 หมู่ 13 ตำบลโพรงมะเดื่อ อำเภอเมืองนครปฐม จังหวัดนครปฐม 73000 โทร <a href={`tel:${phone}`} data-analytics="phone_click">{phone}</a> หรือ <a href={lineUrl} data-analytics="line_click">LINE @pdcar</a> เพื่อยืนยันเวลานัดชมรถ</p><BusinessVisitInfo /></details>
          <details><summary>อยากขายรถให้ร้าน ต้องเริ่มอย่างไร?<ArrowRight size={18} /></summary><p>เตรียมยี่ห้อ รุ่น ปีจดทะเบียน เลขไมล์ และรูปถ่าย แล้วติดต่อร้านเพื่อประเมินเบื้องต้น ราคาสุดท้ายขึ้นอยู่กับการตรวจรถและเอกสาร <Link href="/sell-car">ดูขั้นตอนขายรถและข้อมูลที่ควรเตรียม</Link></p></details>
        </div>
      </section>

      <section className="sell-acquisition-section" id="sell-car">
        <div className="sell-acquisition-copy">
          <p className="eyebrow">SELL YOUR CAR · NAKHON PATHOM</p>
          <h2>อยากขายรถมือสอง<br />เริ่มคุยกับ PD Car Center</h2>
          <p>หากคุณกำลังค้นหาที่รับซื้อรถมือสองในนครปฐม ส่งข้อมูลรถมาให้เราประเมินเบื้องต้นก่อนนัดดูรถจริงได้ ไม่ต้องกรอกข้อมูลลงเว็บไซต์</p>
          <div className="sell-acquisition-actions">
            <Link className="primary-action" href="/sell-car">ประเมินรถของคุณ <ArrowRight size={18} /></Link>
            {lineUrl ? <a className="line-action" href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click"><MessageCircle size={18} />ส่งรูปรถทาง LINE</a> : null}
          </div>
        </div>
        <div className="sell-acquisition-steps" aria-label="ขั้นตอนเริ่มขายรถ">
          <div><Camera /><p><strong>1. ส่งข้อมูลรถ</strong><span>ยี่ห้อ รุ่น ปี เลขไมล์ และรูปถ่าย</span></p></div>
          <div><Banknote /><p><strong>2. ประเมินเบื้องต้น</strong><span>คุยรายละเอียดและช่วงราคากับร้าน</span></p></div>
          <div><FileText /><p><strong>3. นัดดูรถและเอกสาร</strong><span>ตรวจสภาพจริงก่อนตกลงซื้อขาย</span></p></div>
        </div>
      </section>

      <section className="about-showcase" id="about">
        <div className="about-showcase-image">
          <Image src="/media/site/storefront" alt="รถภายในร้าน PD Car Center" fill sizes="(max-width: 820px) 100vw, 52vw" />
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
          <div><p>คำแนะนำสั้น กระชับ และนำไปใช้ตัดสินใจเลือกรถได้จริง</p><Link href="/articles">อ่านบทความทั้งหมด →</Link></div>
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
          <div><CheckCircle2 /><p><strong>ติดต่อผู้ดูแลได้ทันที</strong><span>โทรหรือใช้ช่องทางติดต่อที่ร้านแสดง</span></p></div>
          <div><CheckCircle2 /><p><strong>ใช้งานได้ทุกอุปกรณ์</strong><span>จัดวางเหมาะกับคอมพิวเตอร์ ไอแพด และโทรศัพท์</span></p></div>
        </div>
      </section>

      <section className="contact-band" id="contact">
        <Image src="/media/site/storefront" alt="" fill sizes="100vw" aria-hidden="true" />
        <div className="contact-band-shade" aria-hidden="true" />
        <div className="contact-band-copy">
          <p>กำลังหารถ หรือมีรถที่อยากขาย</p>
          <h2>คุยกับ PD Car Center ได้โดยตรง</h2>
          <div className="contact-actions">
            <a className="phone-action" href={`tel:${phone}`} data-analytics="phone_click"><Phone size={19} />{phone}</a>
            {lineUrl ? <a className="line-action" href={lineUrl} target="_blank" rel="noreferrer" data-analytics="line_click">คุยกับเราทาง LINE <ArrowRight size={18} /></a> : null}
            <Link className="outline-action" href="/sell-car">ดูขั้นตอนขายรถ</Link>
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
          <Link href="/sell-car">ขายรถให้เรา</Link>
          <a href="#videos">วิดีโอ 9:16</a>
          <a href="#articles">บทความ</a>
          <Link href="/admin">ผู้ดูแลเว็บไซต์</Link>
        </div>
        <div className="footer-contact">
          <strong>ติดต่อเรา</strong>
          <BusinessVisitInfo />
          <a href={`tel:${phone}`} data-analytics="phone_click"><Phone size={16} />{phone}</a>
          <p><MapPin size={16} />23/2 หมู่ 13 ต.โพรงมะเดื่อ อ.เมืองนครปฐม จ.นครปฐม 73000</p>
        </div>
      </footer>
    </main>
  );
}
