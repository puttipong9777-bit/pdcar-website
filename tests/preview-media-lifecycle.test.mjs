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
    "ARTICLE_LINE_POSTBACK_ENABLED"
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

test("manifest freshness rejects malformed, stale and future timestamps outside bounded clock skew", () => {
  const entry = lifecycle.publicVehicleMediaManifestEntry(publication());
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-31T00:04:59Z")), "current");
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-31T00:05:01Z")), "expired");
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-30T23:59:30Z")), "current", "30-second clock skew is bounded and documented");
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-30T23:59:29.999Z")), "unavailable", "an arbitrarily future authorization is rejected");
  assert.equal(lifecycle.publicMediaManifestState({ ...entry, authorizedAt: "not-a-time" }), "unavailable");
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-31T00:00:01Z"), 0), "unavailable");
  assert.equal(lifecycle.publicMediaManifestState(entry, Date.parse("2026-10-31T00:00:01Z"), 300_000, -1), "unavailable");
  assert.equal(lifecycle.publicMediaManifestState(null), "not_found");
  assert.throws(() => lifecycle.publicVehicleMediaManifestEntry(publication({ authorizedAt: "not-a-time" })), /invalid_public_media_manifest/);
});

function imageMembershipHarness(initialResponse) {
  const calls = [];
  const state = { response: initialResponse };
  const query = {
    select(columns) { calls.push(["select", columns]); return this; },
    contains(column, value) { calls.push(["contains", column, value]); return this; },
    limit(value) { calls.push(["limit", value]); return this; },
    then(resolve, reject) {
      const response = state.response;
      return response instanceof Error
        ? Promise.reject(response).then(resolve, reject)
        : Promise.resolve(response).then(resolve, reject);
    }
  };
  const membership = loadTs("lib/public-vehicle-image.ts", {
    "@supabase/supabase-js": {
      createClient: (url, key) => {
        calls.push(["client", url, key]);
        return { from: (view) => { calls.push(["from", view]); return query; } };
      }
    }
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://public.example", NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon" } } });
  return { calls, membership, state };
}

test("image membership uses one narrow uncached public-view lookup instead of full inventory", async () => {
  const harness = imageMembershipHarness({ data: [{ car_id: "PDTEST" }], error: null });
  assert.equal((await harness.membership.getPublicVehicleImageMembership("FILE-main-gallery")).status, "allowed");
  assert.deepEqual(harness.calls.slice(1), [
    ["from", "public_vehicle_listings"],
    ["select", "car_id"],
    ["contains", "photos", '[{"fileId":"FILE-main-gallery"}]'],
    ["limit", 1]
  ]);

  harness.calls.length = 0;
  harness.state.response = { data: [], error: null };
  assert.equal((await harness.membership.getPublicVehicleImageMembership("FILE-repair-photo")).status, "not_listed");
  assert.equal(harness.calls.some(([operation]) => operation === "client"), true, "each request rechecks the public view without a stale membership cache");

  harness.state.response = { data: null, error: { message: "synthetic public view outage" } };
  assert.equal((await harness.membership.getPublicVehicleImageMembership("FILE-main-gallery")).status, "unavailable");
  harness.state.response = new Error("synthetic network outage");
  assert.equal((await harness.membership.getPublicVehicleImageMembership("FILE-main-gallery")).status, "unavailable");
});

test("image membership fails closed when public-view configuration is unavailable", async () => {
  const membership = loadTs("lib/public-vehicle-image.ts", {
    "@supabase/supabase-js": { createClient: () => { throw new Error("client must not be created"); } }
  }, { process: { env: {} } });
  assert.equal((await membership.getPublicVehicleImageMembership("FILE-main-gallery")).status, "unavailable");
  assert.equal((await membership.getPublicVehicleImageMembership("bad-id")).status, "not_listed");
});

test("image membership converts malformed public client configuration into controlled unavailability", async () => {
  const membership = loadTs("lib/public-vehicle-image.ts", {
    "@supabase/supabase-js": { createClient: () => { throw new Error("synthetic malformed public configuration"); } }
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url", NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic-anon" } } });
  assert.equal((await membership.getPublicVehicleImageMembership("FILE-main-gallery")).status, "unavailable");
});

function vehicleRoute({ env = {}, fetchImpl, membership = { status: "allowed" } }) {
  const route = loadTs("app/media/vehicle-images/[fileId]/route.ts", {
    "@/lib/public-vehicle-image": { getPublicVehicleImageMembership: async () => membership }
  }, { process: { env }, fetch: fetchImpl });
  return {
    get: (fileId = "FILE-test-1") => route.GET(new Request(`https://review.example/media/vehicle-images/${fileId}`), { params: Promise.resolve({ fileId }) })
  };
}

test("ERP is the only vehicle image authority and successful bodies are bounded before response", async () => {
  const current = vehicleRoute({ fetchImpl: async () => new Response("fresh-image", { headers: { "Content-Type": "image/jpeg", ETag: '"source-v2"' } }) });
  const response = await current.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-pdcar-image-source"), "erp-authority");
  assert.equal(response.headers.get("x-pdcar-media-outcome"), "current");
  assert.equal(response.headers.get("cache-control"), "public, max-age=60, must-revalidate");
  assert.equal(response.headers.get("content-length"), String("fresh-image".length));
  assert.equal(await response.text(), "fresh-image");
});

test("ERP status matrix fails closed without any legacy object bypass", async () => {
  const source = readFileSync(new URL("../app/media/vehicle-images/[fileId]/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /vehicleImagesBucket|VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED|legacy-r2-fallback/);
  for (const [upstreamStatus, publicStatus] of [[401, 404], [403, 404], [404, 404], [410, 404], [429, 503], [500, 502], [503, 502], [599, 502]]) {
    const route = vehicleRoute({
      fetchImpl: async () => new Response("synthetic upstream status", { status: upstreamStatus })
    });
    const response = await route.get();
    assert.equal(response.status, publicStatus, `upstream ${upstreamStatus}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("vehicle image route allows listed gallery refs and blocks linked but unlisted files before ERP", async () => {
  let erpFetches = 0;
  const fetchImpl = async () => {
    erpFetches++;
    return new Response("allowed main image", { headers: { "Content-Type": "image/jpeg" } });
  };
  const allowed = vehicleRoute({ fetchImpl, membership: { status: "allowed" } });
  assert.equal((await allowed.get("FILE-main-gallery")).status, 200);
  assert.equal(erpFetches, 1);

  for (const fileId of ["FILE-repair-photo", "FILE-damage-photo", "FILE-document-image"]) {
    const unlisted = vehicleRoute({ fetchImpl, membership: { status: "not_listed" } });
    const response = await unlisted.get(fileId);
    assert.equal(response.status, 404, fileId);
    assert.equal(response.headers.get("x-pdcar-media-outcome"), "not-listed");
  }
  assert.equal(erpFetches, 1, "unlisted files never reach ERP");

  const unavailable = vehicleRoute({ fetchImpl, membership: { status: "unavailable" } });
  const unavailableResponse = await unavailable.get("FILE-main-gallery");
  assert.equal(unavailableResponse.status, 503);
  assert.equal(unavailableResponse.headers.get("retry-after"), "30");
  assert.equal(unavailableResponse.headers.get("x-pdcar-media-outcome"), "membership-unavailable");
  assert.equal(erpFetches, 1, "an inventory outage fails before ERP");
});

test("media proxy distinguishes header timeout, network and invalid content without leaking provider details", async () => {
  const timeout = vehicleRoute({ fetchImpl: async () => { throw new DOMException("synthetic timeout", "TimeoutError"); } });
  assert.equal((await timeout.get()).status, 504);
  const network = vehicleRoute({ fetchImpl: async () => { throw new Error("synthetic provider details"); } });
  const networkResponse = await network.get();
  assert.equal(networkResponse.status, 502);
  assert.doesNotMatch(await networkResponse.text(), /synthetic provider details/);
  const invalid = vehicleRoute({ fetchImpl: async () => new Response("<html>provider error</html>", { headers: { "Content-Type": "text/html" } }) });
  assert.equal((await invalid.get()).status, 502);
});

test("media proxy bounds stalled, failed and oversized response bodies", async () => {
  const stalled = vehicleRoute({
    env: { VEHICLE_MEDIA_TIMEOUT_MS: "250" },
    fetchImpl: async (_input, init) => new Response(new ReadableStream({
      start(controller) {
        init.signal.addEventListener("abort", () => controller.error(init.signal.reason), { once: true });
      }
    }), { headers: { "Content-Type": "image/jpeg" } })
  });
  const stalledResponse = await stalled.get();
  assert.equal(stalledResponse.status, 504);
  assert.equal(stalledResponse.headers.get("x-pdcar-media-outcome"), "body-timeout");

  const failed = vehicleRoute({
    fetchImpl: async () => new Response(new ReadableStream({ start(controller) { controller.error(new Error("private stream failure")); } }), { headers: { "Content-Type": "image/jpeg" } })
  });
  const failedResponse = await failed.get();
  assert.equal(failedResponse.status, 502);
  assert.equal(failedResponse.headers.get("x-pdcar-media-outcome"), "body-stream-error");
  assert.doesNotMatch(await failedResponse.text(), /private stream failure/);

  const declaredOversize = vehicleRoute({
    fetchImpl: async () => new Response("small", { headers: { "Content-Type": "image/jpeg", "Content-Length": String(9 * 1024 * 1024) } })
  });
  const declaredResponse = await declaredOversize.get();
  assert.equal(declaredResponse.status, 502);
  assert.equal(declaredResponse.headers.get("x-pdcar-media-outcome"), "body-too-large");

  const streamedOversize = vehicleRoute({
    fetchImpl: async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { "Content-Type": "image/jpeg" } })
  });
  const streamedResponse = await streamedOversize.get();
  assert.equal(streamedResponse.status, 502);
  assert.equal(streamedResponse.headers.get("x-pdcar-media-outcome"), "body-too-large");
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

test("vehicle media target returns 409 before a missing storage binding is resolved", async () => {
  let bucketLookups = 0;
  const route = loadTs("app/api/admin/media/route.ts", {
    "@/lib/admin-auth": { siteAdminEnabled: () => true, requireAdminRequest: async () => "admin" },
    "@/lib/cloudflare-media": { vehicleImagesBucket: async () => { bucketLookups++; return undefined; } }
  }, { process: { env: { ADMIN_SITE_URL: "https://www.pdcarcenter.com" } }, console: { error() {} } });
  const vehicle = await route.POST(mediaRequest("vehicle:FILE-test-1"));
  assert.equal(vehicle.status, 409);
  assert.equal(bucketLookups, 0);
  const logo = await route.POST(mediaRequest("site:logo"));
  assert.equal(logo.status, 503);
  assert.equal(bucketLookups, 1);
});

test("admin UI presents ERP vehicle photos read-only while keeping site asset uploads", () => {
  const source = readFileSync(new URL("../app/admin/dashboard-client.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /target=\{`vehicle:/);
  assert.match(source, /จัดการรูปรถในระบบ ERP/);
  assert.match(source, /จัดการใน ERP/);
  assert.match(source, /target="site:logo"/);
  assert.match(source, /target="site:storefront"/);
});

test("disabled Preview admin fails before authentication or storage access", async () => {
  const unexpected = () => { throw new Error("Preview attempted privileged access"); };
  const route = loadTs("app/api/admin/media/route.ts", {
    "@/lib/admin-auth": { siteAdminEnabled: () => false, requireAdminRequest: unexpected },
    "@/lib/cloudflare-media": { vehicleImagesBucket: unexpected }
  }, { process: { env: preview.vars }, console: { error() {} } });
  assert.equal((await route.POST(new Request("https://preview.example/api/admin/media", { method: "POST" }))).status, 503);
});
