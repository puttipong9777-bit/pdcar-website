import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-ts.mjs";

const article = { id: "a", slug: "car-knowledge-2026-09-08", published_at: "2026-09-08T12:01:00Z", updated_at: "2026-09-08T12:01:00Z",
  content: { title: "ตรวจความพร้อมรถก่อนเดินทาง", description: "ดูแลรถตามคำแนะนำผู้ผลิต", sections: [{ heading: "ตรวจไฟ", paragraphs: ["ตรวจไฟหน้าและไฟเบรกก่อนใช้รถ"], factIds: ["lights"] }] },
  sources: [{ id: "trip", title: "NHTSA — Summer driving tips", url: "https://www.nhtsa.gov/summer-driving-tips", facts: [] }],
};
function publicMock(rows = [article]) {
  return { getArticle: async () => rows[0] ?? null, getArticles: async () => rows, articleSitemapRows: async () => rows };
}
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
test("approved detail renders complete text, Thai date, canonical, description and safe Article JSON-LD", async () => {
  const page = loadTs("app/articles/[slug]/page.tsx", { "@/lib/article-approval/public": publicMock(), "next/link": link });
  const props = { params: Promise.resolve({ slug: article.slug }) };
  const metadata = await page.generateMetadata(props);
  assert.equal(metadata.title, article.content.title); assert.equal(metadata.description, article.content.description);
  assert.equal(metadata.alternates.canonical, `/articles/${article.slug}`);
  const markup = renderToStaticMarkup(await page.default(props));
  assert(markup.includes("ตรวจไฟหน้าและไฟเบรกก่อนใช้รถ")); assert(markup.includes("8 กันยายน 2569"));
  assert(markup.includes('"@type":"Article"')); assert(markup.includes('dateTime="2026-09-08T12:01:00Z"'));
  assert(markup.includes("NHTSA"));
});
test("missing/unpublished detail is noindex and 404, not an empty published page", async () => {
  const page = loadTs("app/articles/[slug]/page.tsx", {
    "@/lib/article-approval/public": publicMock([]), "next/link": link,
    "next/navigation": { notFound() { throw new Error("not_found"); } },
  });
  const props = { params: Promise.resolve({ slug: article.slug }) };
  assert.equal((await page.generateMetadata(props)).robots.index, false);
  await assert.rejects(() => page.default(props), /not_found/);
});
test("article sitemap is isolated from vehicles and robots advertises both", async () => {
  const map = loadTs("app/articles/sitemap.ts", { "@/lib/article-approval/public": publicMock() });
  const urls = await map.default();
  assert.equal(urls[0].url, `https://www.pdcarcenter.com/articles/${article.slug}`);
  const robots = loadTs("app/robots.ts").default();
  assert.deepEqual(robots.sitemap, ["https://www.pdcarcenter.com/sitemap.xml", "https://www.pdcarcenter.com/articles/sitemap.xml"]);
});
test("public reader uses anon key and only approved view; sitemap walks past 1,000 rows", async () => {
  const ranges = []; const views = [];
  const publicReader = loadTs("lib/article-approval/public.ts", {
    "@supabase/supabase-js": { createClient: (url, key) => {
      assert.equal(url, "https://test.supabase.co"); assert.equal(key, "anon-fixture");
      const builder = {
        from(name) { views.push(name); return builder; }, select() { return builder; }, order() { return builder; },
        range(from, to) { ranges.push([from, to]); return Promise.resolve({ data: Array.from({ length: from < 1000 ? 500 : 1 }, (_v, i) => ({ slug: `article-${from + i}`, updated_at: article.updated_at })), error: null }); },
      };
      return builder;
    } },
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-fixture" } } });
  assert.equal((await publicReader.articleSitemapRows()).length, 1001);
  assert.deepEqual(ranges, [[0,499],[500,999],[1000,1499]]);
  assert(views.every((view) => view === "public_approved_articles"));
});
