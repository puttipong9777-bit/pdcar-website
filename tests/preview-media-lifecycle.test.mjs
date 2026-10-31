import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { loadTs } from "./helpers/load-ts.mjs";

const parsed = ts.parseConfigFileTextToJson("wrangler.jsonc", readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
assert.equal(parsed.error, undefined);
const wrangler = parsed.config;
const preview = wrangler.previews;

test("Worker Preview has only read-only flags and no production data bindings", () => {
  assert.deepEqual(Object.keys(preview), ["vars"]);
  assert.equal(preview.vars.SITE_ENV, "preview");
  for (const name of [
    "SITE_ANALYTICS_ENABLED",
    "SITE_ADMIN_ENABLED",
    "ARTICLE_APPROVAL_ENABLED",
    "ARTICLE_DAILY_CRON_ENABLED",
    "ARTICLE_LINE_POSTBACK_ENABLED",
    "VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED"
  ]) assert.equal(preview.vars[name], "false", name);
  for (const forbidden of ["r2_buckets", "hyperdrive", "routes", "route", "triggers", "services", "queues", "d1_databases", "kv_namespaces"]) {
    assert.equal(Object.hasOwn(preview, forbidden), false, forbidden);
  }
  assert.deepEqual(Object.keys(preview.vars).filter((name) => /secret|token|password|database|supabase/i.test(name)), []);
  assert.equal(wrangler.r2_buckets[0].binding, "VEHICLE_IMAGES", "production binding stays top-level");
  assert.equal(wrangler.hyperdrive[0].binding, "ARTICLE_DATABASE_HYPERDRIVE", "production binding stays top-level");
  assert.equal(wrangler.assets.binding, "ASSETS", "branch assets stay top-level as Wrangler requires");
});

const lifecycle = loadTs("lib/vehicle-media-lifecycle.ts");
const publication = (override = {}) => ({
  fileId: "FILE-test-1",
  websitePublished: true,
  vehicleStatus: "available",
  sourceVersion: "source-a1",
  derivativeVersion: "webp-v1",
  authorizedAt: "2026-10-31T00:00:00.000Z",
  ...override
});

test("manifest admits only published available and reserved vehicle media", () => {
  assert.equal(lifecycle.publicVehicleMediaManifestEntry(publication())?.fileId, "FILE-test-1");
  assert.equal(lifecycle.publicVehicleMediaManifestEntry(publication({ vehicleStatus: "reserved" }))?.fileId, "FILE-test-1");
  assert.equal(lifecycle.publicVehicleMediaManifestEntry(publication({ vehicleStatus: "sold" })), null);
  assert.equal(lifecycle.publicVehicleMediaManifestEntry(publication({ websitePublished: false })), null);
  assert.throws(() => lifecycle.publicVehicleMediaManifestEntry(publication({ sourceVersion: "private/path" })), /invalid_public_media_manifest/);
});

test("immutable refresh planning is idempotent and never overwrites an old revision", () => {
  const first = lifecycle.publicVehicleMediaManifestEntry(publication());
  const second = lifecycle.publicVehicleMediaManifestEntry(publication({ sourceVersion: "source-b2" }));
  const firstPlan = lifecycle.planVehicleDerivativeRefresh(first, null);
  assert.deepEqual(firstPlan, { action: "write_immutable", key: "vehicles/FILE-test-1/source-a1/webp-v1.webp" });
  assert.deepEqual(lifecycle.planVehicleDerivativeRefresh(first, { key: firstPlan.key }), { action: "skip", key: firstPlan.key });
  const secondPlan = lifecycle.planVehicleDerivativeRefresh(second, { key: firstPlan.key });
  assert.equal(secondPlan.action, "write_immutable");
  assert.equal(secondPlan.key, "vehicles/FILE-test-1/source-b2/webp-v1.webp");
  assert.notEqual(secondPlan.key, firstPlan.key);
});

test("expired manifest eligibility fails closed instead of silently serving stale media", () => {
  const entry = lifecycle.publicVehicleMediaManifestEntry(publication());
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-31T00:04:59Z")), "current");
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-31T00:05:01Z")), "expired");
  assert.equal(lifecycle.publicMediaManifestState(null), "not_found");
});

function imageObject(body = "legacy") {
  return {
    body: new Response(body).body,
    httpEtag: '"legacy"',
    size: body.length,
    writeHttpMetadata(headers) { headers.set("Content-Type", "image/webp"); }
  };
}

function vehicleRoute({ env = {}, fetchImpl, object = imageObject() }) {
  let bucketReads = 0;
  const route = loadTs("app/media/vehicle-images/[fileId]/route.ts", {
    "@/lib/cloudflare-media": {
      vehicleImagesBucket: async () => ({ get: async () => { bucketReads++; return object; } }),
      imageResponse: (stored) => new Response(stored.body, { headers: { "Content-Type": "image/webp", ETag: stored.httpEtag } })
    }
  }, { process: { env }, fetch: fetchImpl });
  return {
    get: (fileId = "FILE-test-1") => route.GET(new Request(`https://review.example/media/vehicle-images/${fileId}`), { params: Promise.resolve({ fileId }) }),
    bucketReads: () => bucketReads
  };
}

test("ERP remains authoritative even when a legacy R2 object exists", async () => {
  const current = vehicleRoute({ fetchImpl: async () => new Response("fresh-image", { headers: { "Content-Type": "image/jpeg", ETag: '"source-v2"' } }) });
  const response = await current.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-pdcar-image-source"), "erp-authority");
  assert.equal(response.headers.get("x-pdcar-media-outcome"), "current");
  assert.equal(response.headers.get("cache-control"), "public, max-age=60, must-revalidate");
  assert.equal(current.bucketReads(), 0);

  const removed = vehicleRoute({ env: { VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED: "true" }, fetchImpl: async () => new Response("missing", { status: 404 }) });
  const missing = await removed.get();
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("cache-control"), "no-store");
  assert.equal(removed.bucketReads(), 0, "an ERP ineligibility result can never fall back to R2");
});

test("retryable ERP failures fail closed unless the explicit rollback flag is enabled", async () => {
  const closed = vehicleRoute({ fetchImpl: async () => new Response("unavailable", { status: 503 }) });
  const failed = await closed.get();
  assert.equal(failed.status, 502);
  assert.equal(failed.headers.get("retry-after"), "30");
  assert.equal(closed.bucketReads(), 0);

  const rollback = vehicleRoute({ env: { VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED: "true" }, fetchImpl: async () => new Response("unavailable", { status: 503 }) });
  const stale = await rollback.get();
  assert.equal(stale.status, 200);
  assert.equal(stale.headers.get("x-pdcar-image-source"), "legacy-r2-fallback");
  assert.equal(stale.headers.get("x-pdcar-media-outcome"), "stale-fallback");
  assert.equal(stale.headers.get("cache-control"), "no-store");
  assert.equal(rollback.bucketReads(), 1);
});

test("media proxy distinguishes timeout, network and invalid upstream content without leaking a body", async () => {
  const timeout = vehicleRoute({ fetchImpl: async () => { throw new DOMException("synthetic timeout", "TimeoutError"); } });
  assert.equal((await timeout.get()).status, 504);
  const network = vehicleRoute({ fetchImpl: async () => { throw new Error("synthetic provider details"); } });
  const networkResponse = await network.get();
  assert.equal(networkResponse.status, 502);
  assert.doesNotMatch(await networkResponse.text(), /synthetic provider details/);
  const invalid = vehicleRoute({ fetchImpl: async () => new Response("<html>provider error</html>", { headers: { "Content-Type": "text/html" } }) });
  assert.equal((await invalid.get()).status, 502);
});

function webpFile() {
  const bytes = new Uint8Array(100);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBP"), 8);
  return new File([bytes], "test.webp", { type: "image/webp" });
}

function mediaRequest(target) {
  const form = new FormData();
  form.set("target", target);
  form.set("image", webpFile());
  return new Request("https://www.pdcarcenter.com/api/admin/media", { method: "POST", headers: { origin: "https://www.pdcarcenter.com" }, body: form });
}

test("admin media keeps site assets compatible but cannot overwrite ERP vehicle media", async () => {
  let writes = 0;
  const route = loadTs("app/api/admin/media/route.ts", {
    "@/lib/admin-auth": { siteAdminEnabled: () => true, requireAdminRequest: async () => "admin" },
    "@/lib/cloudflare-media": { vehicleImagesBucket: async () => ({ put: async () => { writes++; } }) }
  }, { process: { env: { ADMIN_SITE_URL: "https://www.pdcarcenter.com" } }, console: { error() {} } });
  const vehicle = await route.POST(mediaRequest("vehicle:FILE-test-1"));
  assert.equal(vehicle.status, 409);
  assert.equal((await vehicle.json()).error, "vehicle_media_managed_by_erp");
  assert.equal(writes, 0);
  const logo = await route.POST(mediaRequest("site:logo"));
  assert.equal(logo.status, 200);
  assert.equal((await logo.json()).path.startsWith("/media/site/logo?v="), true);
  assert.equal(writes, 1);
});

test("disabled Preview admin fails before authentication or storage access", async () => {
  const unexpected = () => { throw new Error("Preview attempted privileged access"); };
  const route = loadTs("app/api/admin/media/route.ts", {
    "@/lib/admin-auth": { siteAdminEnabled: () => false, requireAdminRequest: unexpected },
    "@/lib/cloudflare-media": { vehicleImagesBucket: unexpected }
  }, { process: { env: preview.vars }, console: { error() {} } });
  assert.equal((await route.POST(new Request("https://preview.example/api/admin/media", { method: "POST" }))).status, 503);
});
