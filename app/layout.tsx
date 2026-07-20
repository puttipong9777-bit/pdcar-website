import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pdcar-website.vercel.app"),
  title: { default: "PD Car Center | รถมือสองนครปฐม", template: "%s | PD Car Center" },
  description: "รถมือสองคัดคุณภาพ พร้อมบริการจัดไฟแนนซ์ โดย PD Car Center นครปฐม",
  openGraph: {
    title: "PD Car Center | รถสวย คุณภาพดี คัดพิเศษทุกคัน",
    description: "เลือกดูรถมือสองจากสต็อกหน้าร้านจริง พร้อมราคา รายละเอียด และวิดีโอแนวตั้ง 9:16",
    images: [{ url: "/og.png", width: 1732, height: 908, alt: "PD Car Center รถมือสองนครปฐม" }],
    locale: "th_TH",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "PD Car Center | รถมือสองนครปฐม",
    description: "รถสวย คุณภาพดี คัดพิเศษทุกคัน",
    images: ["/og.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body><SiteHeader />{children}</body>
    </html>
  );
}
