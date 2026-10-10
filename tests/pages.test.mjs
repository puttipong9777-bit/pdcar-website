import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../out/_worker.js";
import { car, env } from "./fixtures.mjs";

const request = (path, host = "www.pdcarcenter.com", method = "GET") => new Request(`https://${host}${path}`, { method });
async function withRows(rows, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return Response.json(typeof rows === "function" ? rows(calls) : rows);
  };
  try { await run(calls); } finally { globalThis.fetch = original; }
}

test("only explicit public columns and GET; credentials never serialized", async () => {
  await withRows([car({ internal_cost: "PRIVATE_SENTINEL" })], async (calls) => {
    const response = await handleRequest(request("/"), env);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.equal(calls[0].url.pathname, "/rest/v1/public_vehicle_listings");
    assert.ok(!calls[0].url.searchParams.get("select").includes("*"));
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.cache, "no-store");
    assert.ok(!html.includes("PRIVATE_SENTINEL"));
    assert.ok(!html.includes(env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
    assert.match(html, /399,000/);
    assert.match(html, /6,900/);
  });
});
test("service role is refused before any network call", async () => {
  await withRows([], async (calls) => {
    const key = `e30.${Buffer.from('{"role":"service_role"}').toString("base64url")}.mock`;
    assert.equal((await handleRequest(request("/"), { ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: key })).status, 503);
    assert.equal(calls.length, 0);
  });
});
test("new slug, direct Car ID, updates and unpublish take effect on next request", async () => {
  let rows = [car()];
  await withRows(() => rows, async () => {
    assert.equal((await handleRequest(request("/cars/PD0001"), env)).status, 200);
    rows = [car({ website_slug: "new-slug", sale_price: 299000, status: "reserved" })];
    const response = await handleRequest(request("/cars/new-slug"), env);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /299,000/);
    assert.match(html, /ติดจอง/);
    assert.match(html, /rel="canonical" href="https:\/\/www.pdcarcenter.com\/cars\/new-slug"/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    rows = [];
    assert.equal((await handleRequest(request("/cars/new-slug"), env)).status, 404);
    assert.ok(!(await (await handleRequest(request("/"), env)).text()).includes("PD0001"));
  });
});
test("sold or non-public statuses are discarded defensively", async () => {
  await withRows([car({ status: "sold" })], async () => {
    assert.equal((await handleRequest(request("/cars/PD0001"), env)).status, 404);
  });
});
test("social previews, photos/order, videos and safe JSON appear in initial HTML", async () => {
  await withRows([car({ website_title: '</script><script>alert("X")</script>' })], async () => {
    const html = await (await handleRequest(request("/cars/PD0001"), env)).text();
    assert.match(html, /og:image" content="https:\/\/media.example.test\/api\/public\/vehicle-images\/mock-front/);
    assert.match(html, /youtube-nocookie.com\/embed\/mockvideo01/);
    assert.ok(html.indexOf('src="https://media.example.test/api/public/vehicle-images/mock-front') < html.indexOf('src="https://media.example.test/api/public/vehicle-images/mock-side'));
    assert.ok(!html.includes('</script><script>alert("X")</script>'));
    assert.ok(!html.includes("/_next/image"));
    assert.match(html, /loading="lazy"/);
  });
});
test("sitemap, preview noindex, robots, health, HEAD and method boundaries", async () => {
  await withRows([car()], async (calls) => {
    const sitemap = await handleRequest(request("/sitemap.xml"), env);
    assert.match(await sitemap.text(), /https:\/\/www.pdcarcenter.com\/cars\/toyota-yaris-2022/);
    assert.match(await (await handleRequest(request("/robots.txt", "preview.pages.dev"), env)).text(), /Disallow: \//);
    assert.match(await (await handleRequest(request("/robots.txt"), env)).text(), /Sitemap:/);
    const preview = await handleRequest(request("/", "preview.pages.dev"), env);
    assert.equal(preview.headers.get("x-robots-tag"), "noindex, nofollow");
    const health = await handleRequest(request("/api/health"), {});
    assert.equal((await health.json()).status, "ok");
    assert.equal(await (await handleRequest(request("/cars/PD0001", "www.pdcarcenter.com", "HEAD"), env)).text(), "");
    const count = calls.length;
    assert.equal((await handleRequest(request("/", "www.pdcarcenter.com", "POST"), env)).status, 405);
    assert.equal(calls.length, count);
    assert.equal((await handleRequest(request("/cars/%E0%A4%A"), env)).status, 400);
  });
});
test("unconfigured data returns 503, never a false not-found", async () => {
  for (const path of ["/", "/cars/PD0001", "/sitemap.xml"]) assert.equal((await handleRequest(request(path), {})).status, 503);
});
test("pagination retrieves stock beyond a page", async () => {
  await withRows((calls) => calls.length === 1 ? Array.from({ length: 100 }, (_, i) => car({ car_id: `PD${i}`, website_slug: `car-${i}` })) : [car({ car_id: "PD9999", website_slug: "last-car" })], async (calls) => {
    assert.equal((await handleRequest(request("/cars/last-car"), env)).status, 200);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url.searchParams.get("offset"), "100");
  });
});
test("older public view without optional vertical_video keeps listings available", async () => {
  const original = globalThis.fetch;
  const selects = [];
  globalThis.fetch = async (url) => {
    const select = new URL(url).searchParams.get("select");
    selects.push(select);
    if (select.includes("vertical_video")) return Response.json({ code: "42703", message: "column public_vehicle_listings.vertical_video does not exist" }, { status: 400 });
    return Response.json([car({ vertical_video: undefined })]);
  };
  try {
    const response = await handleRequest(request("/cars/PD0001"), env);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /399,000/);
    assert.equal(selects.length, 2);
    assert.ok(!selects[1].includes("vertical_video"));
    assert.ok(!selects[1].includes("*"));
  } finally { globalThis.fetch = original; }
});
test("missing required columns and permission failures do not trigger schema fallback", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ code: "42703", message: "column sale_price does not exist" }, { status: 400 }); };
  try {
    assert.equal((await handleRequest(request("/"), env)).status, 503);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
test("detail queries narrow the public view with escaped exact identifier literals", async () => {
  await withRows([car()], async (calls) => {
    await handleRequest(request('/cars/a%22%2Cb'), env);
    assert.equal(calls[0].url.searchParams.get("or"), '(car_id.eq."a\\",b",website_slug.eq."a\\",b")');
    assert.equal(calls[0].url.searchParams.get("status"), "in.(available,reserved)");
  });
});
