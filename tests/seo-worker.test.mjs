import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8")
  .replace('import handler from "../.open-next/worker.js";', 'const handler = { fetch: async () => new Response("fixture", { headers: { "Content-Type": "text/html" } }) };')
  .replace('import { runArticleSchedule } from "./scheduled.mjs";', 'const runArticleSchedule = async () => {};');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
test("production apex redirects preserve path and query on canonical HTTPS host", async () => {
  const result = await worker.fetch(new Request("http://pdcarcenter.com/cars/test?source=test"), { SITE_ENV: "production" }, {});
  assert.equal(result.status, 301);
  assert.equal(result.headers.get("Location"), "https://www.pdcarcenter.com/cars/test?source=test");
});
test("preview responses are noindex and preview robots disallow crawling", async () => {
  for (const [host, env] of [["example.workers.dev", "production"], ["www.pdcarcenter.com", "preview"]]) {
    const page = await worker.fetch(new Request(`https://${host}/`), { SITE_ENV: env }, {});
    assert.equal(page.headers.get("X-Robots-Tag"), "noindex, nofollow");
    const robots = await worker.fetch(new Request(`https://${host}/robots.txt`), { SITE_ENV: env }, {});
    assert((await robots.text()).includes("Disallow: /"));
  }
});
test("production host has no preview noindex override", async () => {
  const page = await worker.fetch(new Request("https://www.pdcarcenter.com/"), { SITE_ENV: "production" }, {});
  assert.equal(page.headers.get("X-Robots-Tag"), null);
});
