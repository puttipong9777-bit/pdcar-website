import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

const parsed = ts.parseConfigFileTextToJson("wrangler.jsonc", readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
assert.equal(parsed.error, undefined);
const preview = parsed.config.previews;
const globals = { process: { env: preview.vars } };
const unexpected = () => { throw new Error("Preview attempted privileged access"); };

test("review preview has no production routes, bindings, credentials or enabled privileged features", () => {
  assert.deepEqual(Object.keys(preview), ["vars"]);
  assert.equal(preview.vars.SITE_ENV, "preview");
  const gates = ["SITE_ADMIN_ENABLED", "SITE_ANALYTICS_ENABLED", "ARTICLE_APPROVAL_ENABLED", "ARTICLE_DAILY_CRON_ENABLED", "ARTICLE_LINE_POSTBACK_ENABLED"];
  for (const gate of gates) assert.equal(preview.vars[gate], "false");
  assert.deepEqual(Object.keys(preview.vars).sort(), ["SITE_ENV", ...gates].sort());
});

test("preview media upload is disabled before authentication or bucket access", async () => {
  const route = loadTs("app/api/admin/media/route.ts", {
    "@/lib/article-approval/line": { verifyAdminToken: unexpected },
    "@/lib/cloudflare-media": { vehicleImagesBucket: unexpected },
  }, globals);
  const response = await route.POST(new Request("https://review.workers.dev/api/admin/media", { method: "POST" }));
  assert.equal(response.status, 503);
  assert((await response.text()).includes("disabled"));
});

test("preview analytics requests do not open a database or record events", async () => {
  const route = loadTs("app/api/analytics/collect/route.ts", {
    "@/lib/article-approval/db": { articleDb: unexpected },
  }, globals);
  const response = await route.POST(new Request("https://review.workers.dev/api/analytics/collect", {
    method: "POST", headers: { origin: "https://review.workers.dev", "content-type": "application/json" }, body: "{}",
  }));
  assert.equal(response.status, 204);
});

test("unconfigured preview inventory fails closed without accessing Supabase", async () => {
  const reader = loadTs("lib/vehicle-data.ts", { "@supabase/supabase-js": { createClient: unexpected } }, globals);
  assert.deepEqual((await reader.getPublicVehicles()).vehicles, []);
  assert.equal((await reader.getPublicVehicles()).source, "not_configured");
  await assert.rejects(() => reader.getPublicVehicle("TEST"), /temporarily unavailable/);
});
