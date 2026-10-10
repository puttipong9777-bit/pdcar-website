import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/article-approval/public";
import { ArticleBody } from "@/components/article-content";
import { thaiDate } from "@/lib/article-approval/types";
import "../articles.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article?.content) return { title: "ไม่พบบทความ", robots: { index: false, follow: false } };
  return {
    title: article.content.title, description: article.content.description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: { title: article.content.title, description: article.content.description, type: "article",
      url: `/articles/${article.slug}`, publishedTime: article.published_at!, modifiedTime: article.updated_at },
    twitter: { card: "summary", title: article.content.title, description: article.content.description },
  };
}
export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).slug);
  if (!article?.content) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: article.content.title,
    description: article.content.description, datePublished: article.published_at, dateModified: article.updated_at,
    inLanguage: "th-TH", mainEntityOfPage: `https://www.pdcarcenter.com/articles/${article.slug}`,
    author: { "@type": "Organization", name: "PD Car Center", url: "https://www.pdcarcenter.com" },
    publisher: { "@id": "https://www.pdcarcenter.com/#business" } };
  return <main className="pd-articles pd-article-detail"><article>
    <Link href="/articles">← บทความทั้งหมด</Link>
    <h1>{article.content.title}</h1>
    <time className="pd-article-date" dateTime={article.published_at!}>เผยแพร่ {thaiDate(article.published_at!)}</time>
    <p className="pd-article-lead">{article.content.description}</p>
    <ArticleBody content={article.content} sources={article.sources} />
    <p className="pd-article-date">จัดทำร่างด้วย AI และตรวจอนุมัติโดยผู้ดูแล PD Car Center</p>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
  </article></main>;
}
