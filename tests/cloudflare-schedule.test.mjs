import assert from "node:assert/strict";
import { test } from "node:test";
import { runArticleSchedule } from "../cloudflare/scheduled.mjs";

const production = { SITE_ENV: "production", ARTICLE_APPROVAL_ENABLED: "true", ARTICLE_DAILY_CRON_ENABLED: "true", ARTICLE_SITE_URL: "https://www.pdcarcenter.com", CRON_SECRET: "s".repeat(32) };

test("Cloudflare schedules never run in previews or while either article flag is disabled", async () => {
  for (const override of [{ SITE_ENV: "preview" }, { ARTICLE_APPROVAL_ENABLED: "false" }, { ARTICLE_DAILY_CRON_ENABLED: "false" }]) {
    assert.deepEqual(await runArticleSchedule({ ...production, ...override }, () => assert.fail("must not invoke")), { status: "disabled" });
  }
});

test("Cloudflare schedules call the existing GET route with server-only authorization", async () => {
  let calls = 0;
  const result = await runArticleSchedule(production, async (request) => {
    calls++;
    assert.equal(request.url, "https://www.pdcarcenter.com/api/cron/article-drafts");
    assert.equal(request.method, "GET");
    assert.equal(request.headers.get("authorization"), `Bearer ${production.CRON_SECRET}`);
    return Response.json({ status: "ok" });
  });
  assert.equal(calls, 1);
  assert.equal(result.status, "completed");
});

test("scheduler fails closed for bad configuration and records upstream failures", async () => {
  await assert.rejects(runArticleSchedule({ ...production, CRON_SECRET: "short" }, () => assert.fail()), /missing_secret/);
  await assert.rejects(runArticleSchedule({ ...production, ARTICLE_SITE_URL: "http://example.com" }, () => assert.fail()), /invalid_origin/);
  await assert.rejects(runArticleSchedule(production, async () => Response.json({ error: "failed" }, { status: 502 })), /failed_502/);
});
