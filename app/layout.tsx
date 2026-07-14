import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PD Car Center | รถมือสองนครปฐม", template: "%s | PD Car Center" },
  description: "รถมือสองคัดคุณภาพ พร้อมบริการจัดไฟแนนซ์ โดย PD Car Center นครปฐม"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body><SiteHeader />{children}</body>
    </html>
  );
}
