import "server-only";
import { articleDb } from "@/lib/article-approval/db";
import type { AnalyticsEventInput, DashboardMetrics } from "./types";

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function analyticsEnabled() {
  return process.env.SITE_ANALYTICS_ENABLED === "true" && Boolean(process.env.ARTICLE_DATABASE_URL?.trim());
}

export async function recordAnalyticsEvent(event: AnalyticsEventInput) {
  const sql = articleDb();
  const [row] = await sql`select site_admin.record_event(
    ${event.eventId}::uuid,
    ${event.sessionId}::uuid,
    ${event.eventName},
    ${event.path},
    ${event.carId ?? null}
  ) as accepted`;
  return Boolean(row?.accepted);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const sql = articleDb();
  const [summary, dailyRows, vehicleRows, pageRows] = await Promise.all([
    sql`with boundaries as (
      select (now() at time zone 'Asia/Bangkok')::date as today
    ) select
      count(distinct session_id) filter (where event_day = today) as today_visitors,
      count(*) filter (where event_day = today and event_name = 'page_view') as today_page_views,
      count(*) filter (where event_day = today and event_name = 'vehicle_view') as today_vehicle_views,
      count(*) filter (where event_day = today and event_name in ('phone_click','line_click')) as today_contact_clicks,
      count(distinct session_id) filter (where event_day = today - 1) as yesterday_visitors,
      count(*) filter (where event_day = today - 1 and event_name = 'page_view') as yesterday_page_views,
      count(*) filter (where event_day = today - 1 and event_name = 'vehicle_view') as yesterday_vehicle_views,
      count(*) filter (where event_day = today - 1 and event_name in ('phone_click','line_click')) as yesterday_contact_clicks,
      count(distinct session_id) filter (where event_day between today - 6 and today) as week_visitors,
      count(*) filter (where event_day between today - 6 and today and event_name = 'page_view') as week_page_views,
      count(*) filter (where event_day between today - 6 and today and event_name = 'vehicle_view') as week_vehicle_views,
      count(*) filter (where event_day between today - 6 and today and event_name in ('phone_click','line_click')) as week_contact_clicks
    from site_admin.analytics_events, boundaries
    where event_day >= today - 6`,
    sql`with days as (
      select generate_series(
        (now() at time zone 'Asia/Bangkok')::date - 13,
        (now() at time zone 'Asia/Bangkok')::date,
        interval '1 day'
      )::date as day
    ) select days.day::text,
      count(distinct e.session_id) as visitors,
      count(*) filter (where e.event_name = 'page_view') as page_views,
      count(*) filter (where e.event_name = 'vehicle_view') as vehicle_views,
      count(*) filter (where e.event_name in ('phone_click','line_click')) as contact_clicks
    from days left join site_admin.analytics_events e on e.event_day = days.day
    group by days.day order by days.day`,
    sql`select car_id,
      count(*) filter (where event_name = 'vehicle_view') as views,
      count(*) filter (where event_name = 'gallery_swipe') as gallery_swipes,
      count(*) filter (where event_name in ('phone_click','line_click')) as contact_clicks
    from site_admin.analytics_events
    where event_day >= (now() at time zone 'Asia/Bangkok')::date - 29 and car_id is not null
    group by car_id
    order by (count(*) filter (where event_name = 'vehicle_view')) desc,
      (count(*) filter (where event_name in ('phone_click','line_click'))) desc
    limit 12`,
    sql`select path, count(*) as views from site_admin.analytics_events
      where event_day >= (now() at time zone 'Asia/Bangkok')::date - 29 and event_name = 'page_view'
      group by path order by count(*) desc limit 10`
  ]);
  const row = summary[0] ?? {};
  return {
    today: { visitors: number(row.today_visitors), pageViews: number(row.today_page_views), vehicleViews: number(row.today_vehicle_views), contactClicks: number(row.today_contact_clicks) },
    yesterday: { visitors: number(row.yesterday_visitors), pageViews: number(row.yesterday_page_views), vehicleViews: number(row.yesterday_vehicle_views), contactClicks: number(row.yesterday_contact_clicks) },
    last7Days: { visitors: number(row.week_visitors), pageViews: number(row.week_page_views), vehicleViews: number(row.week_vehicle_views), contactClicks: number(row.week_contact_clicks) },
    daily: dailyRows.map((item) => ({ day: String(item.day), visitors: number(item.visitors), pageViews: number(item.page_views), vehicleViews: number(item.vehicle_views), contactClicks: number(item.contact_clicks) })),
    topVehicles: vehicleRows.map((item) => ({ carId: String(item.car_id), views: number(item.views), gallerySwipes: number(item.gallery_swipes), contactClicks: number(item.contact_clicks) })),
    topPages: pageRows.map((item) => ({ path: String(item.path), views: number(item.views) }))
  };
}
