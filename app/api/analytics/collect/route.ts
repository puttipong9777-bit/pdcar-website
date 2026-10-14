import { analyticsEnabled, recordAnalyticsEvent } from "@/lib/site-analytics/server";
import { parseAnalyticsEvent } from "@/lib/site-analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin
    || (requestUrl.hostname === "pdcarcenter.com" && origin === "https://www.pdcarcenter.com")
    || (requestUrl.hostname === "www.pdcarcenter.com" && origin === "https://pdcarcenter.com");
}

export async function POST(request: Request) {
  if (!analyticsEnabled()) return new Response(null, { status: 204 });
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  if (Number(request.headers.get("content-length")) > 2_048) return new Response(null, { status: 413 });
  try {
    const event = parseAnalyticsEvent(await request.json());
    if (!event) return new Response(null, { status: 400 });
    await recordAnalyticsEvent(event);
  } catch {
    // Analytics must never interrupt a visitor's browsing session.
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
