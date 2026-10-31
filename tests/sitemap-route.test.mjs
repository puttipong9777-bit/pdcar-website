import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

let result;
const route = loadTs("app/sitemap.xml/route.ts", {
  "@/lib/vehicle-data": { getPublicVehicles: async () => result }
});

test("sitemap returns explicit retryable 503 rather than a false empty sitemap", async () => {
  result = { source: "view_not_ready", vehicles: [], message: "temporary" };
  const response = await route.GET();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /temporarily unavailable/i);
});

test("sitemap escapes content and includes available and reserved public vehicles", async () => {
  result = { source: "supabase", vehicles: [
    { slug: "reserved & special", featured: true, updatedAt: "2026-10-30T12:00:00Z", coverImageUrl: "https://example.com/photo?a=1&b=2" },
    { slug: "available", featured: false, updatedAt: "invalid" }
  ] };
  const response = await route.GET();
  const body = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/xml/);
  assert.match(body, /reserved%20%26%20special/);
  assert.match(body, /photo\?a=1&amp;b=2/);
  assert.match(body, /2026-10-30T12:00:00.000Z/);
  assert.equal((body.match(/<url>/g) || []).length, 5);
});
