import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const analytics = loadTs("lib/site-analytics/types.ts");

test("analytics accepts only the small first-party event contract", () => {
  const valid = {
    eventId: randomUUID(),
    sessionId: randomUUID(),
    eventName: "vehicle_view",
    path: "/cars/mazda-2",
    carId: "PD0002"
  };
  assert.deepEqual(analytics.parseAnalyticsEvent(valid), valid);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, eventName: "customer_phone" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, path: "https://evil.example/" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, path: "/cars/x?email=private@example.com" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, carId: "PD0002<script>" }), null);
});

test("analytics accepts only the bounded PD0025, PD0028, and PD0002 campaign contract", () => {
  const valid = {
    eventId: randomUUID(), sessionId: randomUUID(), eventName: "phone_click", path: "/cars/test", carId: "PD0025",
    utmSource: "facebook", utmMedium: "organic_social", utmCampaign: "pd0025_a"
  };
  assert.deepEqual(analytics.parseAnalyticsEvent(valid), valid);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, utmSource: "newsletter" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, utmMedium: "customer_email" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, utmCampaign: "pd9999_a" }), null);
  assert.equal(analytics.parseAnalyticsEvent({ ...valid, utmCampaign: "pd0025_a?email=person@example.com" }), null);
});

test("campaign query parsing discards arbitrary values and normalizes a bounded creative label", () => {
  assert.deepEqual(analytics.campaignAttributionFromSearch(new URLSearchParams(
    "utm_source=Facebook&utm_medium=organic_social&utm_campaign=PD0028-B&email=person@example.com&token=secret"
  )), { utmSource: "facebook", utmMedium: "organic_social", utmCampaign: "pd0028_b" });
  assert.deepEqual(analytics.campaignAttributionFromSearch(new URLSearchParams(
    "utm_source=unknown&utm_medium=anything&utm_campaign=launch-customer-name"
  )), {});
});

test("all nine prepared Facebook and LINE campaign URLs match the bounded parser contract", () => {
  const prepared = [
    ...["pd0025_a", "pd0025_b", "pd0028_a", "pd0028_b", "pd0002_a", "pd0002_b"].map((utmCampaign) => ({
      utmSource: "facebook", utmMedium: "organic_social", utmCampaign
    })),
    ...["pd0025_a", "pd0028_a", "pd0002_a"].map((utmCampaign) => ({
      utmSource: "line", utmMedium: "messaging", utmCampaign
    }))
  ];
  for (const expected of prepared) {
    const params = new URLSearchParams({
      utm_source: expected.utmSource,
      utm_medium: expected.utmMedium,
      utm_campaign: expected.utmCampaign
    });
    assert.deepEqual(analytics.campaignAttributionFromSearch(params), expected);
  }
});

test("dashboard windows are restricted to supported day ranges", () => {
  assert.equal(analytics.parseDashboardWindow(1), 1);
  assert.equal(analytics.parseDashboardWindow("30"), 30);
  assert.equal(analytics.parseDashboardWindow(2), 14);
  assert.equal(analytics.parseDashboardWindow("all"), 14);
});

test("browser tracking keeps a bounded first-touch campaign only for the current session", () => {
  const values = new Map(); const requests = [];
  const sessionStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const fakeWindow = {
    sessionStorage,
    localStorage: { getItem() { throw new Error("persistent storage must not be read"); }, setItem() { throw new Error("persistent storage must not be written"); } },
    location: { pathname: "/cars/PD0028", search: "?utm_source=facebook&utm_medium=organic_social&utm_campaign=pd0028_a&email=private@example.com" }
  };
  const client = loadTs("components/site-analytics.tsx", {
    "next/navigation": { usePathname: () => fakeWindow.location.pathname }
  }, {
    window: fakeWindow,
    document: { documentElement: { dataset: { siteAnalytics: "enabled" } } },
    crypto: { randomUUID }, URLSearchParams,
    fetch: (url, options) => { requests.push({ url, options }); return Promise.resolve({ ok: true }); }
  });
  client.trackSiteEvent("vehicle_view", "PD0028");
  fakeWindow.location.search = "?utm_source=line&utm_medium=messaging&utm_campaign=pd0002_a&token=secret";
  client.trackSiteEvent("line_click", "PD0028");
  assert.equal(requests.length, 2);
  const first = JSON.parse(requests[0].options.body); const second = JSON.parse(requests[1].options.body);
  assert.deepEqual({ source: first.utmSource, medium: first.utmMedium, campaign: first.utmCampaign }, { source: "facebook", medium: "organic_social", campaign: "pd0028_a" });
  assert.deepEqual({ source: second.utmSource, medium: second.utmMedium, campaign: second.utmCampaign }, { source: "facebook", medium: "organic_social", campaign: "pd0028_a" });
  assert(!requests[0].options.body.includes("private@example.com"));
  assert(!requests[1].options.body.includes("secret"));
  assert(values.has("pdcar.analytics.session.v1"));
  assert(values.has("pdcar.analytics.attribution.v1"));
});

test("analytics requires fresh UUID identifiers and does not accept extra identity fields", () => {
  const input = {
    eventId: randomUUID(), sessionId: "not-a-uuid", eventName: "page_view", path: "/", email: "person@example.com"
  };
  assert.equal(analytics.parseAnalyticsEvent(input), null);
  const accepted = analytics.parseAnalyticsEvent({ ...input, sessionId: randomUUID() });
  assert.deepEqual(Object.keys(accepted).sort(), ["eventId", "eventName", "path", "sessionId"].sort());
});
