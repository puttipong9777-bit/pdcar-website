import type { Metadata } from "next";
import Link from "next/link";
import { getArticles } from "@/lib/article-approval/public";
import { thaiDate } from "@/lib/article-approval/types";
import "./articles.css";

export const dynamic = "force-dynamic";
function articlePageNumber(value?: string) {
  return Math.max(1, Math.min(10000, Number.parseInt(value || "1", 10) || 1));
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string }> }): Promise<Metadata> {
  const page = articlePageNumber((await searchParams).page);
  const canonical = page === 1 ? "/articles" : `/articles?page=${page}`;
  return {
    title: page === 1 ? "บทความความรู้รถยนต์และรถมือสอง" : `บทความความรู้รถยนต์ หน้า ${page}`,
    description: "ความรู้ในการดูแลรถและเตรียมตัวใช้รถมือสอง จากบทความที่ผ่านการตรวจโดยผู้ดูแล PD Car Center",
    alternates: { canonical },
    openGraph: { title: page === 1 ? "บทความความรู้รถยนต์ | PD Car Center" : `บทความความรู้รถยนต์ หน้า ${page} | PD Car Center`, url: canonical, type: "website" }
  };
}

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const query = await searchParams;
  const page = articlePageNumber(query.page);
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
    {!articles.length && <section className="pd-article-empty" aria-labelledby="article-empty-title">
      <h2 id="article-empty-title">ยังไม่มีบทความฉบับเต็มที่เผยแพร่</h2>
      <p>อ่านคู่มือสั้นที่ตรวจทานแล้วบนหน้าแรก หรือเลือกดูรถและขั้นตอนขายรถให้เราได้ทันที</p>
      <div><Link href="/#articles">อ่านคู่มือสั้นบนหน้าแรก</Link><Link href="/#inventory">ดูรถในร้าน</Link><Link href="/sell-car">ขายรถให้เรา</Link></div>
    </section>}
    <nav className="pd-article-nav" aria-label="หน้าบทความ">
      {page > 1 && <Link href={`/articles?page=${page - 1}`}>← หน้าก่อนหน้า</Link>}
      {articles.length === 12 && <Link href={`/articles?page=${page + 1}`}>หน้าถัดไป →</Link>}
    </nav>
  </main>;
}
