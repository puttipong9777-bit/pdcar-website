import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import HomeContent from "@/components/home-content";
import VehicleContent from "@/components/vehicle-content";
import SellCarContent from "@/components/sell-car-content";
import ArticlesContent from "@/components/articles-content";
import ArticleContent from "@/components/article-page-content";
import { BusinessJsonLd } from "./business";
import type { PublicVehicleListing, VehicleDataResult } from "@/lib/types";
import type { PublishedArticle } from "@/lib/article-approval/public";
import type { ReactNode } from "react";
export type PageData = {
  kind: "home" | "vehicle" | "sell-car" | "articles" | "article" | "admin-disabled" | "not-found" | "unavailable";
  result: VehicleDataResult; vehicle?: PublicVehicleListing;
  articles?: PublishedArticle[]; article?: PublishedArticle; page?: number;
  phone: string; lineUrl?: string; tracking?: boolean;
};
export type HomeSlots = {count: ReactNode; inventory: ReactNode; stories: ReactNode};
export function App({data, homeSlots}: {data: PageData; homeSlots?: HomeSlots}) {
  return <><BusinessJsonLd phone={data.phone}/><SiteHeader phone={data.phone} lineUrl={data.lineUrl}/>
    {data.kind === "home" ? <HomeContent result={data.result} phone={data.phone} lineUrl={data.lineUrl} slots={homeSlots}/> :
    data.kind === "vehicle" && data.vehicle ? <VehicleContent vehicle={data.vehicle} phone={data.phone} lineUrl={data.lineUrl} tracking={data.tracking}/> :
    data.kind === "sell-car" ? <SellCarContent phone={data.phone} lineUrl={data.lineUrl}/> :
    data.kind === "articles" ? <ArticlesContent articles={data.articles || []} page={data.page || 1}/> :
    data.kind === "article" && data.article?.content ? <ArticleContent article={data.article as PublishedArticle & {content: NonNullable<PublishedArticle["content"]>}}/> :
    data.kind === "admin-disabled" ? <main className="pd-articles"><h1>ระบบอนุมัติบทความยังไม่เปิดใช้งาน</h1></main> :
    <main className="detail-page"><h1>{data.kind === "unavailable" ? "ไม่สามารถเชื่อมต่อข้อมูลได้ชั่วคราว" : "ไม่พบหน้า"}</h1><Link href="/#inventory">กลับไปดูรถทั้งหมด</Link></main>}
  </>;
}
