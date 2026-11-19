import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const content = loadTs("lib/discovery-content.ts");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const sell = readFileSync(new URL("../app/sell-car/page.tsx", import.meta.url), "utf8");

test("home answers cover local buying and selling journeys with internal links", () => {
  assert.equal(content.homeBuyingAnswers.length, 3);
  assert.deepEqual(content.homeBuyingAnswers.map((item) => item.href), ["/#inventory", "/#articles", "/sell-car"]);
  assert(content.homeBuyingAnswers.every((item) => /รถ/.test(item.question) && item.answer.length > 60));
  assert(home.includes("homeBuyingAnswers.map"));
});

test("sell-car FAQ structured data comes from the same visible answers", () => {
  const schema = content.sellCarFaqPageSchema();
  assert.equal(schema["@type"], "FAQPage");
  assert.equal(schema.mainEntity.length, content.sellCarFaqs.length);
  assert.deepEqual(
    schema.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]),
    content.sellCarFaqs.map((item) => [item.question, item.answer])
  );
  assert(sell.includes("sellCarFaqs.map"));
  assert(sell.includes('href="/#inventory"'));
  assert(sell.includes('href="/#articles"'));
  assert(sell.includes('href="/#contact"'));
});

test("robots keeps public discovery open while excluding admin and API routes", () => {
  const robots = loadTs("app/robots.ts").default();
  assert.equal(robots.rules.userAgent, "*");
  assert.equal(robots.rules.allow, "/");
  assert.deepEqual(robots.rules.disallow, ["/admin", "/article-admin", "/api/"]);
  assert.equal(robots.host, "https://www.pdcarcenter.com");
});
