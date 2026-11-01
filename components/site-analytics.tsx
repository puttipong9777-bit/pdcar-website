"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { campaignAttributionFromSearch, type AnalyticsAttribution, type AnalyticsEventName } from "@/lib/site-analytics/types";

const sessionKey = "pdcar.analytics.session.v1";
const attributionKey = "pdcar.analytics.attribution.v1";

function sessionId() {
  try {
    const existing = window.sessionStorage.getItem(sessionKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(sessionKey, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function sessionAttribution(): AnalyticsAttribution {
  try {
    const existing = window.sessionStorage.getItem(attributionKey);
    if (existing) return JSON.parse(existing) as AnalyticsAttribution;
    const attribution = campaignAttributionFromSearch(new URLSearchParams(window.location.search));
    if (Object.keys(attribution).length) window.sessionStorage.setItem(attributionKey, JSON.stringify(attribution));
    return attribution;
  } catch {
    return {};
  }
}

export function trackSiteEvent(eventName: AnalyticsEventName, carId?: string, explicitPath?: string) {
  if (typeof window === "undefined" || document.documentElement.dataset.siteAnalytics !== "enabled") return;
  const payload = {
    eventId: crypto.randomUUID(),
    sessionId: sessionId(),
    eventName,
    path: explicitPath || window.location.pathname,
    ...(carId ? { carId } : {}),
    ...sessionAttribution()
  };
  void fetch("/api/analytics/collect", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => undefined);
}

export function SiteAnalytics({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const lastPath = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled || lastPath.current === pathname || pathname.startsWith("/admin") || pathname.startsWith("/article-admin")) return;
    lastPath.current = pathname;
    trackSiteEvent("page_view", undefined, pathname);
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-analytics]") : null;
      const eventName = target?.dataset.analytics as AnalyticsEventName | undefined;
      if (!eventName || !target) return;
      trackSiteEvent(eventName, target.dataset.analyticsCar);
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [enabled]);

  return null;
}
