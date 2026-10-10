import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/article-approval/public";
import { thaiDate } from "@/lib/article-approval/types";
import "./articles.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "บทความความรู้รถยนต์และรถมือสอง", description: "ความรู้ในการดูแลรถและเตรียมตัวใช้รถมือสอง จากบทความที่ผ่านการตรวจโดยผู้ดูแล PD Car Center",
  alternates: { canonical: "/articles" }, openGraph: { title: "บทความความรู้รถยนต์ | PD Car Center", url: "/articles", type: "website" },
};
export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page || "1", 10) || 1));
  const articles = await getArticles(page);
  return <main className="pd-articles">
    <Link href="/">← กลับหน้าแรก</Link>
    <h1>เรื่องรถที่อ่านแล้วนำไปใช้ได้</h1>
    <p className="pd-article-lead">ความรู้รถยนต์และการดูแลรถมือสอง ผ่านการตรวจและอนุมัติโดยผู้ดูแลร้าน</p>
    <div className="pd-article-grid">{articles.map((article) => <article className="pd-article-card" key={article.id}>
      <time className="pd-article-date" dateTime={article.published_at!}>{thaiDate(article.published_at!)}</time>
      <h2><Link href={`/articles/${article.slug}`}>{article.content?.title}</Link></h2>
      <p>{article.content?.description}</p><Link href={`/articles/${article.slug}`}>อ่านบทความ →</Link>
    </article>)}</div>
    {!articles.length && <p>ยังไม่มีบทความที่เผยแพร่ในหน้านี้</p>}
    <nav className="pd-article-nav" aria-label="หน้าบทความ">
      {page > 1 && <Link href={`/articles?page=${page - 1}`}>← หน้าก่อนหน้า</Link>}
      {articles.length === 12 && <Link href={`/articles?page=${page + 1}`}>หน้าถัดไป →</Link>}
    </nav>
  </main>;
}
