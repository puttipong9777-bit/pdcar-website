import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { loadTs } from "./helpers/load-ts.mjs";

function serverWithSql(sql) {
  return loadTs("lib/site-analytics/server.ts", {
    "@/lib/article-approval/db": { articleDb: async () => sql }
  }, { process: { env: { SITE_ANALYTICS_ENABLED: "true", ARTICLE_DATABASE_URL: "postgres://fixture" } } });
}

test("server records only the parsed compact event and its three attribution fields", async () => {
  let captured;
  const server = serverWithSql(async (strings, ...values) => {
    captured = { query: strings.join("?"), values };
    return [{ accepted: true }];
  });
  const event = {
    eventId: randomUUID(), sessionId: randomUUID(), eventName: "line_click", path: "/cars/pd0002", carId: "PD0002",
    utmSource: "line", utmMedium: "messaging", utmCampaign: "pd0002_b"
  };
  assert.equal(await server.recordAnalyticsEvent(event), true);
  assert.deepEqual(captured.values, [event.eventId, event.sessionId, event.eventName, event.path, event.carId, event.utmSource, event.utmMedium, event.utmCampaign]);
  assert(captured.query.includes("site_admin.record_event"));
});

test("dashboard keeps its time window explicit and separates phone from LINE", async () => {
  const seenValues = [];
  const sql = async (strings, ...values) => {
    const query = strings.join(" "); seenValues.push(...values);
    if (query.includes("today_visitors")) return [{
      window_start: "2026-10-03", window_end: "2026-11-01",
      today_visitors: 5, today_page_views: 8, today_vehicle_views: 4, today_phone_clicks: 1, today_line_clicks: 2, today_contact_clicks: 3,
      yesterday_visitors: 3, yesterday_page_views: 6, yesterday_vehicle_views: 2, yesterday_phone_clicks: 1, yesterday_line_clicks: 0, yesterday_contact_clicks: 1,
      week_visitors: 20, week_page_views: 40, week_vehicle_views: 18, week_phone_clicks: 4, week_line_clicks: 7, week_contact_clicks: 11
    }];
    if (query.includes("with days as")) return [{ day: "2026-11-01", visitors: 5, page_views: 8, vehicle_views: 4, phone_clicks: 1, line_clicks: 2, contact_clicks: 3 }];
    if (query.includes("select car_id")) return [{ car_id: "PD0028", views: 12, gallery_swipes: 6, phone_clicks: 2, line_clicks: 5, contact_clicks: 7 }];
    if (query.includes("select path")) return [{ path: "/cars/pd0028", views: 9 }];
    if (query.includes("coalesce(utm_source")) return [{ source: "facebook", medium: "organic_social", campaign: "pd0028_a", visitors: 4, page_views: 8, vehicle_views: 6, phone_clicks: 1, line_clicks: 3 }];
    throw new Error(`unexpected query: ${query}`);
  };
  const metrics = await serverWithSql(sql).getDashboardMetrics(30);
  assert.equal(metrics.timezone, "Asia/Bangkok");
  assert.equal(metrics.windowDays, 30);
  assert.equal(metrics.windowStart, "2026-10-03");
  assert.equal(metrics.today.phoneClicks, 1);
  assert.equal(metrics.today.lineClicks, 2);
  assert.deepEqual(metrics.topVehicles[0], { carId: "PD0028", views: 12, gallerySwipes: 6, phoneClicks: 2, lineClicks: 5, contactClicks: 7 });
  assert.deepEqual(metrics.sources[0], { source: "facebook", medium: "organic_social", campaign: "pd0028_a", visitors: 4, pageViews: 8, vehicleViews: 6, phoneClicks: 1, lineClicks: 3 });
  assert(seenValues.length >= 5 && seenValues.every((value) => value === 30));
});

test("dashboard SQL runs against the migrated private schema, including an empty or attributed window", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated;");
    await db.exec(readFileSync(new URL("../supabase/migrations/0002_article_approval.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/20261014104736_admin_dashboard.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/20261101162830_campaign_attribution.sql", import.meta.url), "utf8"));
    await db.exec("set role pdcar_article_worker");
    const tag = async (strings, ...values) => {
      const query = strings.reduce((text, part, index) => `${text}${part}${index < values.length ? `$${index + 1}` : ""}`, "");
      return (await db.query(query, values)).rows;
    };
    const server = serverWithSql(tag);
    const empty = await server.getDashboardMetrics(1);
    assert.equal(empty.windowDays, 1);
    assert.match(empty.windowStart, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(empty.today.visitors, 0);
    assert.deepEqual(empty.sources, []);

    await tag`select site_admin.record_event(
      ${randomUUID()}::uuid, ${randomUUID()}::uuid, ${"phone_click"}, ${"/cars/pd0025"}, ${"PD0025"},
      ${"facebook"}, ${"organic_social"}, ${"pd0025_a"}
    )`;
    const measured = await server.getDashboardMetrics(7);
    assert.equal(measured.today.phoneClicks, 1);
    assert.equal(measured.today.lineClicks, 0);
    assert.deepEqual(measured.sources.map(({ source, medium, campaign, phoneClicks }) => ({ source, medium, campaign, phoneClicks })), [
      { source: "facebook", medium: "organic_social", campaign: "pd0025_a", phoneClicks: 1 }
    ]);
  } finally {
    await db.exec("reset role").catch(() => undefined);
    await db.close();
  }
});
