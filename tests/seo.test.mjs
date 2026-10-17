import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./helpers/load-ts.mjs";

const vehicle = { carId: "TEST", slug: "test-car", status: "available", brand: "Honda", model: "City", title: "Honda City 2020", year: 2020, photos: [], featured: false, updatedAt: "2026-10-01T00:00:00Z", salePrice: 300000 };
const link = { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
const props = () => ({ params: Promise.resolve({ identifier: "TEST" }) });
function detail(row) {
  return loadTs("app/cars/[identifier]/page.tsx", {
    "@/lib/vehicle-data": { getPublicVehicle: async () => row },
    "@/components/meta-view-content": { MetaViewContent: () => null },
    "next/link": link,
    "next/navigation": { notFound() { throw new Error("not_found"); } },
  });
}
function schema(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((match) => JSON.parse(match[1]));
}
test("vehicle metadata and server HTML agree for available and reserved cars", async () => {
  for (const status of ["available", "reserved"]) {
    const page = detail({ ...vehicle, status });
    const meta = await page.generateMetadata(props());
    const html = renderToStaticMarkup(await page.default(props()));
    const [product] = schema(html);
    assert.equal(schema(html).length, 1);
    assert.equal(product.offers.availability, `https://schema.org/${status === "available" ? "InStock" : "OutOfStock"}`);
    assert.equal(meta.other["product:availability"], status === "available" ? "in stock" : "out of stock");
    assert(html.includes(status === "available" ? "พร้อมขาย" : "ติดจอง"));
    assert.equal(meta.alternates.canonical, "/cars/test-car");
    assert.equal(meta.twitter.title, vehicle.title);
    assert.equal(product.name, vehicle.title);
    assert(html.includes('href="https://line.me/R/ti/p/%40pdcar"'));
  }
});
test("unknown price is neither a free offer nor zero-valued product metadata", async () => {
  const page = detail({ ...vehicle, salePrice: undefined });
  const meta = await page.generateMetadata(props());
  const html = renderToStaticMarkup(await page.default(props()));
  assert.equal(meta.other["product:price:amount"], undefined);
  assert.equal(schema(html)[0].offers, undefined);
  assert(html.includes("สอบถามราคา"));
});
test("unpublished or sold detail is noindex and not found", async () => {
  const page = detail(null);
  assert.equal((await page.generateMetadata(props())).robots.index, false);
  await assert.rejects(() => page.default(props()), /not_found/);
});
test("public reader rejects nonpublic statuses without deriving model from free text", async () => {
  const rows = ["available", "reserved", "sold", "new_arrival", "waiting_repair", "unknown"].map((status) => ({ car_id: status, status, brand: "Honda", model: "1.8EL", public_description: "Honda Civic", website_title: "HONDA 1.8EL 2017" }));
  const query = { select() { return this; }, order() { return this; }, then(resolve) { return Promise.resolve({ data: rows, error: null }).then(resolve); } };
  const reader = loadTs("lib/vehicle-data.ts", { "@supabase/supabase-js": { createClient() { return { from(name) { assert.equal(name, "public_vehicle_listings"); return query; } }; } } }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test" } } });
  const result = await reader.getPublicVehicles();
  assert.deepEqual(result.vehicles.map((v) => v.carId), ["available", "reserved"]);
  assert.equal(result.vehicles[0].model, "1.8EL");
  assert.equal(await reader.getPublicVehicle("sold"), null);
});
test("data outage does not masquerade as a permanently missing vehicle", async () => {
  const reader = loadTs("lib/vehicle-data.ts", {}, { process: { env: {} } });
  await assert.rejects(() => reader.getPublicVehicle("TEST"), /temporarily unavailable/);
});
test("sitemap contains canonical public URLs, real modification dates, and fails on outage", async () => {
  const page = (result) => loadTs("app/sitemap.ts", { "@/lib/vehicle-data": { getPublicVehicles: async () => result } });
  const urls = await page({ source: "supabase", vehicles: [vehicle, { ...vehicle, slug: "invalid-date", updatedAt: "invalid" }] }).default();
  assert(urls.every((row) => row.url.startsWith("https://www.pdcarcenter.com/")));
  assert.equal(urls.find((row) => row.url.endsWith("test-car")).lastModified.toISOString(), vehicle.updatedAt.replace("Z", ".000Z"));
  assert.equal(urls.find((row) => row.url.endsWith("invalid-date")).lastModified, undefined);
  await assert.rejects(() => page({ source: "view_not_ready", vehicles: [] }).default(), /temporarily unavailable/);
});
test("homepage renders local answers and crawlable car links without browser JavaScript", async () => {
  const home = loadTs("app/page.tsx", { "@/lib/vehicle-data": { getPublicVehicles: async () => ({ source: "supabase", vehicles: [vehicle] }) }, "next/link": link });
  const html = renderToStaticMarkup(await home.default());
  assert(html.includes('href="/cars/test-car"'));
  assert(html.includes('id="buying-questions"'));
  assert(html.includes("รถมือสอง<br/><span>นครปฐม"));
  assert(html.includes("LINE @pdcar"));
  assert(html.includes("เปิดทุกวัน 08:00–17:00"));
  assert(html.includes("นัดชมรถล่วงหน้าได้ถึง 19:00"));
});
test("structured data safely escapes text containing HTML", async () => {
  const page = detail({ ...vehicle, description: '</script><script>alert("x")</script>' });
  const html = renderToStaticMarkup(await page.default(props()));
  assert.equal(schema(html)[0].description, '</script><script>alert("x")</script>');
});

test("owner-confirmed regular hours cover every day and exclude appointment-only time", async () => {
  const layout = loadTs("app/layout.tsx", {
    "next/headers": { headers: async () => new Headers({ host: "localhost" }) },
    "@/components/site-header": { SiteHeader: () => null },
    "@/components/site-analytics": { SiteAnalytics: () => null },
    "@/components/meta-pixel": { MetaPixel: () => null },
  });
  const html = renderToStaticMarkup(await layout.default({ children: "test" }));
  const dealer = schema(html)[0]["@graph"].find((item) => item["@type"] === "AutoDealer");
  const [hours] = dealer.openingHoursSpecification;
  assert.deepEqual(hours.dayOfWeek, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => `https://schema.org/${day}`));
  assert.equal(hours.opens, "08:00");
  assert.equal(hours.closes, "17:00");
  assert.equal(dealer.hasMap, "https://maps.app.goo.gl/nzqpjnq3GD5LNs5W6?g_st=ic");
  assert.equal(dealer.aggregateRating, undefined);
  assert(!JSON.stringify(dealer).includes("19:00"));
});
test("visible visit information distinguishes appointments and labels the owner map link", async () => {
  const { BusinessVisitInfo } = loadTs("components/business-visit-info.tsx");
  const html = renderToStaticMarkup(React.createElement(BusinessVisitInfo));
  assert(html.includes("เปิดทุกวัน 08:00–17:00"));
  assert(html.includes("เวลาประเทศไทย"));
  assert(html.includes("นัดชมรถล่วงหน้าได้ถึง 19:00"));
  assert(html.includes("เฉพาะเมื่อนัดหมายกับร้านแล้ว"));
  assert(html.includes("ดูแผนที่ PD Car Center บน Google Maps (เปิดแท็บใหม่)"));
  assert(html.includes('rel="noopener noreferrer"'));
  const page = detail(vehicle);
  assert(renderToStaticMarkup(await page.default(props())).includes(html));
  const sell = loadTs("app/sell-car/page.tsx", { "next/link": link });
  assert(renderToStaticMarkup(sell.default()).includes(html));
});
