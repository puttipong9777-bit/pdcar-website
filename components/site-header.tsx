import { Menu, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <Image src="/images/pd-logo.jpg" alt="PD Car Center" width={68} height={52} priority />
        <span><strong>PD Car Center</strong><small>รถมือสองคัดคุณภาพ นครปฐม</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="เมนูหลัก">
        <a href="#inventory">รถในร้าน</a>
        <a href="#contact">ติดต่อร้าน</a>
        <a className="call-button" href={`tel:${phone}`}><Phone size={18} />{phone}</a>
      </nav>
      <a className="mobile-call" href={`tel:${phone}`} aria-label={`โทร ${phone}`}><Phone size={20} /></a>
      <button className="menu-placeholder" type="button" aria-label="เมนู"><Menu size={21} /></button>
    </header>
  );
}
