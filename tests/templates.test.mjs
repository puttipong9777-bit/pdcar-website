import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { handleRequest } from "../out/_worker.js";
import { car, env } from "./fixtures.mjs";
const { renderReference } = createRequire(import.meta.url)("../.pages-build/prerender.cjs");

const normalize = (html) => html.replace(/<!-- -->/g, "");
async function compare(rows, settings = env) {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    const offset = Number(url.searchParams.get("offset"));
    return Response.json(rows.slice(offset, offset + 100));
  };
  try {
    const response = await handleRequest(new Request("https://www.pdcarcenter.com/"), settings);
    const html = await response.text();
    const data = JSON.parse(html.match(/<script id="page-data" type="application\/json">(.*?)<\/script>/s)[1]);
    const markup = html.slice(html.indexOf('<div id="app">') + 14, html.indexOf('</div><script id="page-data"'));
    assert.equal(normalize(markup), normalize(renderReference(data)));
    return html;
  } finally { globalThis.fetch = original; }
}

test("compiled homepage matches React output across all optional card fields", async () => {
  const rows = Array.from({ length: 128 }, (_, mask) => car({
    car_id: `PD${mask}`, website_slug: `car-${mask}`, status: mask & 64 ? "reserved" : "available",
    photos: mask & 1 ? car().photos : [], mileage: mask & 2 ? 0 : null,
    fuel_type: mask & 4 ? "เบนซิน" : null, transmission: mask & 8 ? "อัตโนมัติ" : null,
    sale_price: mask & 16 ? 0 : null, listing_monthly_payment: mask & 32 ? 0 : null,
    vertical_video: mask % 3 === 0 ? car().vertical_video : null
  }));
  await compare(rows);
});
test("empty inventory and LINE absent/present retain identical React markup", async () => {
  await compare([]);
  await compare([car()], { ...env, NEXT_PUBLIC_LINE_URL: "" });
});
test("template markers, HTML/URL delimiters and Thai text cannot inject markup", async () => {
  const text = '__PDCAR_DYNAMIC_TITLE__ __PDCAR_STATIC_PHONE__ </script><img onerror="x"> & \' รถ';
  const html = await compare([car({
    website_title: text, brand: text, website_slug: 'รถ " & /', public_description: text,
    fuel_type: text, transmission: text, photos: [{ fileId: 'quote"&/', isPrimary: true, sortOrder: 0 }]
  })], { ...env, NEXT_PUBLIC_SHOP_PHONE: '084"<&\'', NEXT_PUBLIC_LINE_URL: 'https://line.me/?a="<&\'' });
  assert.ok(!html.includes('<img onerror="x">'));
  assert.ok(html.includes("__PDCAR_STATIC_PHONE__"));
});
test("compiled contact attributes retain React javascript URL protection", async () => {
  await compare([car()], { ...env, NEXT_PUBLIC_LINE_URL: " javascript:alert(1)" });
});
