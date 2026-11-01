export const analyticsEventNames = ["page_view", "vehicle_view", "gallery_swipe", "phone_click", "line_click"] as const;
export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export const analyticsSourceValues = ["facebook", "line"] as const;
export const analyticsMediumValues = ["organic_social", "messaging"] as const;
export const analyticsCampaignValues = ["pd0025_a", "pd0025_b", "pd0028_a", "pd0028_b", "pd0002_a", "pd0002_b"] as const;
export const dashboardWindowValues = [1, 7, 14, 30] as const;

export type AnalyticsSource = (typeof analyticsSourceValues)[number];
export type AnalyticsMedium = (typeof analyticsMediumValues)[number];
export type AnalyticsCampaign = (typeof analyticsCampaignValues)[number];
export type DashboardWindowDays = (typeof dashboardWindowValues)[number];
export type AnalyticsAttribution = {
  utmSource?: AnalyticsSource;
  utmMedium?: AnalyticsMedium;
  utmCampaign?: AnalyticsCampaign;
};

export type AnalyticsEventInput = {
  eventId: string;
  sessionId: string;
  eventName: AnalyticsEventName;
  path: string;
  carId?: string;
} & AnalyticsAttribution;

export type MetricTotals = {
  visitors: number;
  pageViews: number;
  vehicleViews: number;
  phoneClicks: number;
  lineClicks: number;
  contactClicks: number;
};

export type DashboardMetrics = {
  generatedAt: string;
  timezone: "Asia/Bangkok";
  windowDays: DashboardWindowDays;
  windowStart: string;
  windowEnd: string;
  today: MetricTotals;
  yesterday: MetricTotals;
  last7Days: MetricTotals;
  daily: ({ day: string } & MetricTotals)[];
  topVehicles: { carId: string; views: number; gallerySwipes: number; phoneClicks: number; lineClicks: number; contactClicks: number }[];
  topPages: { path: string; views: number }[];
  sources: {
    source: AnalyticsSource | "untagged";
    medium: AnalyticsMedium | "none";
    campaign: AnalyticsCampaign | "none";
    visitors: number;
    pageViews: number;
    vehicleViews: number;
    phoneClicks: number;
    lineClicks: number;
  }[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const carId = /^[A-Za-z0-9_-]{1,80}$/;

function allowlisted<T extends string>(value: unknown, values: readonly T[]): T | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return values.includes(normalized as T) ? normalized as T : null;
}

function allowlistedCampaign(value: unknown): AnalyticsCampaign | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace("-", "_");
  return analyticsCampaignValues.includes(normalized as AnalyticsCampaign) ? normalized as AnalyticsCampaign : null;
}

export function campaignAttributionFromSearch(params: Pick<URLSearchParams, "get">): AnalyticsAttribution {
  const source = allowlisted(params.get("utm_source") ?? undefined, analyticsSourceValues);
  const medium = allowlisted(params.get("utm_medium") ?? undefined, analyticsMediumValues);
  const campaign = allowlistedCampaign(params.get("utm_campaign") ?? undefined);
  return {
    ...(source ? { utmSource: source } : {}),
    ...(medium ? { utmMedium: medium } : {}),
    ...(campaign ? { utmCampaign: campaign } : {})
  };
}

export function parseDashboardWindow(value: unknown): DashboardWindowDays {
  const parsed = typeof value === "number" ? value : Number(value);
  return dashboardWindowValues.includes(parsed as DashboardWindowDays) ? parsed as DashboardWindowDays : 14;
}

export function parseAnalyticsEvent(value: unknown): AnalyticsEventInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.eventId !== "string" || !uuid.test(input.eventId)) return null;
  if (typeof input.sessionId !== "string" || !uuid.test(input.sessionId)) return null;
  if (typeof input.eventName !== "string" || !analyticsEventNames.includes(input.eventName as AnalyticsEventName)) return null;
  if (typeof input.path !== "string" || !input.path.startsWith("/") || input.path.length > 240 || input.path.includes("?")) return null;
  if (input.carId !== undefined && (typeof input.carId !== "string" || !carId.test(input.carId))) return null;
  const utmSource = allowlisted(input.utmSource, analyticsSourceValues);
  const utmMedium = allowlisted(input.utmMedium, analyticsMediumValues);
  const utmCampaign = allowlistedCampaign(input.utmCampaign);
  if (utmSource === null || utmMedium === null || utmCampaign === null) return null;
  return {
    eventId: input.eventId,
    sessionId: input.sessionId,
    eventName: input.eventName as AnalyticsEventName,
    path: input.path,
    ...(input.carId === undefined ? {} : { carId: input.carId as string }),
    ...(utmSource ? { utmSource } : {}),
    ...(utmMedium ? { utmMedium } : {}),
    ...(utmCampaign ? { utmCampaign } : {})
  };
}
