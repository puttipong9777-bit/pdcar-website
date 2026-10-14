export const analyticsEventNames = ["page_view", "vehicle_view", "gallery_swipe", "phone_click", "line_click"] as const;
export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export type AnalyticsEventInput = {
  eventId: string;
  sessionId: string;
  eventName: AnalyticsEventName;
  path: string;
  carId?: string;
};

export type DashboardMetrics = {
  today: { visitors: number; pageViews: number; vehicleViews: number; contactClicks: number };
  yesterday: { visitors: number; pageViews: number; vehicleViews: number; contactClicks: number };
  last7Days: { visitors: number; pageViews: number; vehicleViews: number; contactClicks: number };
  daily: { day: string; visitors: number; pageViews: number; vehicleViews: number; contactClicks: number }[];
  topVehicles: { carId: string; views: number; gallerySwipes: number; contactClicks: number }[];
  topPages: { path: string; views: number }[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const carId = /^[A-Za-z0-9_-]{1,80}$/;

export function parseAnalyticsEvent(value: unknown): AnalyticsEventInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (typeof input.eventId !== "string" || !uuid.test(input.eventId)) return null;
  if (typeof input.sessionId !== "string" || !uuid.test(input.sessionId)) return null;
  if (typeof input.eventName !== "string" || !analyticsEventNames.includes(input.eventName as AnalyticsEventName)) return null;
  if (typeof input.path !== "string" || !input.path.startsWith("/") || input.path.length > 240 || input.path.includes("?")) return null;
  if (input.carId !== undefined && (typeof input.carId !== "string" || !carId.test(input.carId))) return null;
  return {
    eventId: input.eventId,
    sessionId: input.sessionId,
    eventName: input.eventName as AnalyticsEventName,
    path: input.path,
    ...(input.carId === undefined ? {} : { carId: input.carId as string })
  };
}
