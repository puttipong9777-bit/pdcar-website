import "server-only";
import { articleDb } from "@/lib/article-approval/db";
import type { AnalyticsCampaign, AnalyticsEventInput, AnalyticsMedium, AnalyticsSource, DashboardMetrics, DashboardWindowDays } from "./types";

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function analyticsEnabled() {
  return process.env.SITE_ANALYTICS_ENABLED === "true" && Boolean(process.env.ARTICLE_DATABASE_URL?.trim());
}

export async function recordAnalyticsEvent(event: AnalyticsEventInput) {
  const sql = await articleDb();
  const [row] = await sql`select site_admin.record_event(
    ${event.eventId}::uuid,
    ${event.sessionId}::uuid,
    ${event.eventName},
    ${event.path},
    ${event.carId ?? null},
    ${event.utmSource ?? null},
    ${event.utmMedium ?? null},
    ${event.utmCampaign ?? null}
  ) as accepted`;
  return Boolean(row?.accepted);
}

export async function getDashboardMetrics(windowDays: DashboardWindowDays = 14): Promise<DashboardMetrics> {
  const sql = await articleDb();
  const [summary, dailyRows, vehicleRows, pageRows, sourceRows] = await Promise.all([
    sql`with boundaries as (
      select (now() at time zone 'Asia/Bangkok')::date as today
    ) select
      today::text as window_end,
      (today - (${windowDays}::integer - 1))::text as window_start,
      count(distinct session_id) filter (where event_day = today) as today_visitors,
      count(*) filter (where event_day = today and event_name = 'page_view') as today_page_views,
      count(*) filter (where event_day = today and event_name = 'vehicle_view') as today_vehicle_views,
      count(*) filter (where event_day = today and event_name = 'phone_click') as today_phone_clicks,
      count(*) filter (where event_day = today and event_name = 'line_click') as today_line_clicks,
      count(*) filter (where event_day = today and event_name in ('phone_click','line_click')) as today_contact_clicks,
      count(distinct session_id) filter (where event_day = today - 1) as yesterday_visitors,
      count(*) filter (where event_day = today - 1 and event_name = 'page_view') as yesterday_page_views,
      count(*) filter (where event_day = today - 1 and event_name = 'vehicle_view') as yesterday_vehicle_views,
      count(*) filter (where event_day = today - 1 and event_name = 'phone_click') as yesterday_phone_clicks,
      count(*) filter (where event_day = today - 1 and event_name = 'line_click') as yesterday_line_clicks,
      count(*) filter (where event_day = today - 1 and event_name in ('phone_click','line_click')) as yesterday_contact_clicks,
      count(distinct session_id) filter (where event_day between today - 6 and today) as week_visitors,
      count(*) filter (where event_day between today - 6 and today and event_name = 'page_view') as week_page_views,
      count(*) filter (where event_day between today - 6 and today and event_name = 'vehicle_view') as week_vehicle_views,
      count(*) filter (where event_day between today - 6 and today and event_name = 'phone_click') as week_phone_clicks,
      count(*) filter (where event_day between today - 6 and today and event_name = 'line_click') as week_line_clicks,
      count(*) filter (where event_day between today - 6 and today and event_name in ('phone_click','line_click')) as week_contact_clicks
    from boundaries left join site_admin.analytics_events
      on event_day >= least(today - 6, today - (${windowDays}::integer - 1))
    group by today`,
    sql`with days as (
      select generate_series(
        (now() at time zone 'Asia/Bangkok')::date - (${windowDays}::integer - 1),
        (now() at time zone 'Asia/Bangkok')::date,
        interval '1 day'
      )::date as day
    ) select days.day::text,
      count(distinct e.session_id) as visitors,
      count(*) filter (where e.event_name = 'page_view') as page_views,
      count(*) filter (where e.event_name = 'vehicle_view') as vehicle_views,
      count(*) filter (where e.event_name = 'phone_click') as phone_clicks,
      count(*) filter (where e.event_name = 'line_click') as line_clicks,
      count(*) filter (where e.event_name in ('phone_click','line_click')) as contact_clicks
    from days left join site_admin.analytics_events e on e.event_day = days.day
    group by days.day order by days.day`,
    sql`select car_id,
      count(*) filter (where event_name = 'vehicle_view') as views,
      count(*) filter (where event_name = 'gallery_swipe') as gallery_swipes,
      count(*) filter (where event_name = 'phone_click') as phone_clicks,
      count(*) filter (where event_name = 'line_click') as line_clicks,
      count(*) filter (where event_name in ('phone_click','line_click')) as contact_clicks
    from site_admin.analytics_events
    where event_day >= (now() at time zone 'Asia/Bangkok')::date - (${windowDays}::integer - 1) and car_id is not null
    group by car_id
    order by (count(*) filter (where event_name = 'vehicle_view')) desc,
      (count(*) filter (where event_name in ('phone_click','line_click'))) desc
    limit 12`,
    sql`select path, count(*) as views from site_admin.analytics_events
      where event_day >= (now() at time zone 'Asia/Bangkok')::date - (${windowDays}::integer - 1) and event_name = 'page_view'
      group by path order by count(*) desc limit 10`,
    sql`select
      coalesce(utm_source, 'untagged') as source,
      coalesce(utm_medium, 'none') as medium,
      coalesce(utm_campaign, 'none') as campaign,
      count(distinct session_id) as visitors,
      count(*) filter (where event_name = 'page_view') as page_views,
      count(*) filter (where event_name = 'vehicle_view') as vehicle_views,
      count(*) filter (where event_name = 'phone_click') as phone_clicks,
      count(*) filter (where event_name = 'line_click') as line_clicks
    from site_admin.analytics_events
    where event_day >= (now() at time zone 'Asia/Bangkok')::date - (${windowDays}::integer - 1)
    group by utm_source, utm_medium, utm_campaign
    order by count(distinct session_id) desc, count(*) desc
    limit 20`
  ]);
  const row = summary[0] ?? {};
  return {
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Bangkok",
    windowDays,
    windowStart: String(row.window_start),
    windowEnd: String(row.window_end),
    today: { visitors: number(row.today_visitors), pageViews: number(row.today_page_views), vehicleViews: number(row.today_vehicle_views), phoneClicks: number(row.today_phone_clicks), lineClicks: number(row.today_line_clicks), contactClicks: number(row.today_contact_clicks) },
    yesterday: { visitors: number(row.yesterday_visitors), pageViews: number(row.yesterday_page_views), vehicleViews: number(row.yesterday_vehicle_views), phoneClicks: number(row.yesterday_phone_clicks), lineClicks: number(row.yesterday_line_clicks), contactClicks: number(row.yesterday_contact_clicks) },
    last7Days: { visitors: number(row.week_visitors), pageViews: number(row.week_page_views), vehicleViews: number(row.week_vehicle_views), phoneClicks: number(row.week_phone_clicks), lineClicks: number(row.week_line_clicks), contactClicks: number(row.week_contact_clicks) },
    daily: dailyRows.map((item) => ({ day: String(item.day), visitors: number(item.visitors), pageViews: number(item.page_views), vehicleViews: number(item.vehicle_views), phoneClicks: number(item.phone_clicks), lineClicks: number(item.line_clicks), contactClicks: number(item.contact_clicks) })),
    topVehicles: vehicleRows.map((item) => ({ carId: String(item.car_id), views: number(item.views), gallerySwipes: number(item.gallery_swipes), phoneClicks: number(item.phone_clicks), lineClicks: number(item.line_clicks), contactClicks: number(item.contact_clicks) })),
    topPages: pageRows.map((item) => ({ path: String(item.path), views: number(item.views) })),
    sources: sourceRows.map((item) => ({
      source: String(item.source) as AnalyticsSource | "untagged",
      medium: String(item.medium) as AnalyticsMedium | "none",
      campaign: String(item.campaign) as AnalyticsCampaign | "none",
      visitors: number(item.visitors),
      pageViews: number(item.page_views),
      vehicleViews: number(item.vehicle_views),
      phoneClicks: number(item.phone_clicks),
      lineClicks: number(item.line_clicks)
    }))
  };
}
