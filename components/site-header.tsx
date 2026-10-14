"use client";

import { Menu, MessageCircle, Phone, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  ["หน้าแรก", "/#showroom"],
  ["รถในร้าน", "/#inventory"],
  ["วิดีโอ", "/#videos"],
  ["บทความ", "/articles"],
  ["เกี่ยวกับเรา", "/#about"]
] as const;

export function SiteHeader() {
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
        <Image src="/media/site/logo" alt="PD Car Center" width={68} height={52} priority />
        <span><strong>PD Car Center</strong><small>PREMIUM USED CAR · NAKHON PATHOM</small></span>
      </Link>

      <nav className="desktop-nav" aria-label="เมนูหลัก">
        {navigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        <Link className="sell-nav-link" href="/sell-car">ขายรถให้เรา</Link>
        <a className="call-button" href={`tel:${phone}`} data-analytics="phone_click"><Phone size={17} />{phone}</a>
        {lineUrl ? <a className="header-line-button" href={lineUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} />แชทไลน์</a> : null}
      </nav>

      <div className="mobile-header-actions">
        <a className="mobile-call" href={`tel:${phone}`} aria-label={`โทร ${phone}`} data-analytics="phone_click"><Phone size={19} /></a>
        {lineUrl ? <a className="mobile-line" href={lineUrl} target="_blank" rel="noreferrer" aria-label="คุยกับร้านทาง LINE"><MessageCircle size={19} /></a> : null}
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      <nav id="mobile-navigation" className={`mobile-navigation${menuOpen ? " is-open" : ""}`} aria-label="เมนูมือถือ">
        {navigation.map(([label, href]) => <Link href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
        <Link className="mobile-menu-sell" href="/sell-car" onClick={() => setMenuOpen(false)}>ขายรถให้ PD Car Center</Link>
        <Link className="mobile-menu-admin" href="/admin" onClick={() => setMenuOpen(false)}>ผู้ดูแลเว็บไซต์</Link>
        <a className="mobile-menu-call" href={`tel:${phone}`} onClick={() => setMenuOpen(false)} data-analytics="phone_click"><Phone size={18} />โทร {phone}</a>
      </nav>
    </header>
  );
}
