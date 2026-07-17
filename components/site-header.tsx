"use client";

import { Menu, Phone, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  ["โชว์รูม", "/#showroom"],
  ["รถในร้าน", "/#inventory"],
  ["วิดีโอ", "/#videos"],
  ["บทความ", "/#articles"],
  ["ติดต่อ", "/#contact"]
] as const;

export function SiteHeader() {
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
        <Image src="/images/pd-logo.jpg" alt="PD Car Center" width={68} height={52} priority />
        <span><strong>PD Car Center</strong><small>PREMIUM USED CAR · NAKHON PATHOM</small></span>
      </Link>

      <nav className="desktop-nav" aria-label="เมนูหลัก">
        {navigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        <a className="call-button" href={`tel:${phone}`}><Phone size={17} />{phone}</a>
      </nav>

      <div className="mobile-header-actions">
        <a className="mobile-call" href={`tel:${phone}`} aria-label={`โทร ${phone}`}><Phone size={19} /></a>
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
        <a className="mobile-menu-call" href={`tel:${phone}`} onClick={() => setMenuOpen(false)}><Phone size={18} />โทร {phone}</a>
      </nav>
    </header>
  );
}
