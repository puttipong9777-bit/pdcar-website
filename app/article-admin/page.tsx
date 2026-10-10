import type { Metadata } from "next";
import { enabled } from "@/lib/article-approval/security";
import { ArticleAdmin } from "./review-client";
import "../articles/articles.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "จัดการบทความ", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function AdminPage() {
  const liffId = process.env.ARTICLE_LIFF_ID;
  if (!enabled() || !liffId) return <main className="pd-articles"><h1>ระบบอนุมัติบทความยังไม่เปิดใช้งาน</h1></main>;
  // Only the public LIFF identifier reaches the browser; credentials stay server-side.
  return <ArticleAdmin liffId={liffId} />;
}
