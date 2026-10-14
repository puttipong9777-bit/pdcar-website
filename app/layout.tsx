import type { Metadata } from "next";
import { MetaPixel } from "@/components/meta-pixel";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Runtime configuration and preview tracking controls must apply to every page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pdcarcenter.com"),
  title: { default: "PD Car Center | รถมือสองและรับซื้อรถนครปฐม", template: "%s | PD Car Center" },
  description: "PD Car Center รถมือสองคัดคุณภาพในนครปฐม พร้อมบริการรับซื้อรถมือสอง ติดต่อดูรถหรือส่งข้อมูลรถเพื่อประเมินเบื้องต้นกับร้านได้โดยตรง",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "PD Car Center | ซื้อรถดี ขายรถง่าย คุยกับร้านโดยตรง",
    description: "ดูรถมือสองจากสต็อกจริง หรือส่งข้อมูลรถเพื่อประเมินเบื้องต้นกับ PD Car Center นครปฐม",
    url: "/",
    images: [{ url: "/og-sell-car.png", width: 1732, height: 908, alt: "PD Car Center รับซื้อรถมือสองนครปฐม" }],
    locale: "th_TH",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "PD Car Center | รถมือสองและรับซื้อรถนครปฐม",
    description: "ดูรถในร้านหรือขายรถให้เรา ติดต่อ PD Car Center ได้โดยตรง",
    images: ["/og-sell-car.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || "0840079122";
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "690571535487780";
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AutoDealer",
        "@id": "https://www.pdcarcenter.com/#business",
        name: "PD Car Center",
        alternateName: "พีดี คาร์เซ็นเตอร์",
        url: "https://www.pdcarcenter.com/",
        logo: "https://www.pdcarcenter.com/images/pd-logo.jpg",
        image: "https://www.pdcarcenter.com/images/storefront.jpg",
        telephone: phone,
        description: "ร้านรถมือสองและรับซื้อรถมือสองในจังหวัดนครปฐม",
        address: {
          "@type": "PostalAddress",
          streetAddress: "23/2 หมู่ 13 ตำบลโพรงมะเดื่อ",
          addressLocality: "เมืองนครปฐม",
          addressRegion: "นครปฐม",
          postalCode: "73000",
          addressCountry: "TH"
        },
        areaServed: { "@type": "AdministrativeArea", name: "นครปฐมและพื้นที่ใกล้เคียง" }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.pdcarcenter.com/#website",
        url: "https://www.pdcarcenter.com/",
        name: "PD Car Center",
        alternateName: "พีดี คาร์เซ็นเตอร์",
        inLanguage: "th-TH",
        publisher: { "@id": "https://www.pdcarcenter.com/#business" }
      }
    ]
  };

  return (
    <html lang="th">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd).replace(/</g, "\\u003c") }} />
        {process.env.SITE_ENV !== "preview" ? <MetaPixel pixelId={metaPixelId} /> : null}
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
