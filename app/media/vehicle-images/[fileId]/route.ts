import { imageResponse, vehicleImagesBucket } from "@/lib/cloudflare-media";

const FILE_ID = /^FILE-[A-Za-z0-9-]{1,96}$/;
const ERP_ORIGIN = (process.env.NEXT_PUBLIC_ERP_URL || "https://pdcar-erp-history.onrender.com").replace(/\/$/, "");

export const dynamic = "force-dynamic";

function timeoutMs() {
  const configured = Number(process.env.VEHICLE_MEDIA_TIMEOUT_MS);
  return Number.isFinite(configured) ? Math.min(10_000, Math.max(250, configured)) : 5_000;
}

function mediaHeaders(outcome: string, durationMs: number) {
  return {
    "Cache-Control": "no-store",
    "X-PDCar-Media-Outcome": outcome,
    "Server-Timing": `erp-image;dur=${durationMs.toFixed(1)}`
  };
}

async function legacyFallback(fileId: string, durationMs: number) {
  if (process.env.VEHICLE_MEDIA_LEGACY_R2_FALLBACK_ENABLED !== "true") return null;
  try {
    const object = await (await vehicleImagesBucket())?.get(`${fileId}.webp`);
    if (!object) return null;
    const cached = imageResponse(object);
    const headers = new Headers(cached.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("Warning", '110 - "Response is stale"');
    headers.set("X-PDCar-Image-Source", "legacy-r2-fallback");
    headers.set("X-PDCar-Media-Outcome", "stale-fallback");
    headers.set("Server-Timing", `erp-image;dur=${durationMs.toFixed(1)}`);
    return new Response(cached.body, { headers });
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!FILE_ID.test(fileId)) return new Response("Invalid image identifier", { status: 400 });

  const startedAt = performance.now();
  let upstream: Response;
  try {
    upstream = await fetch(`${ERP_ORIGIN}/api/public/vehicle-images/${encodeURIComponent(fileId)}`, {
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/*" },
      signal: AbortSignal.timeout(timeoutMs())
    });
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    const fallback = await legacyFallback(fileId, durationMs);
    if (fallback) return fallback;
    const timedOut = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    return new Response("Image source temporarily unavailable", {
      status: timedOut ? 504 : 502,
      headers: { ...mediaHeaders(timedOut ? "timeout" : "network-error", durationMs), "Retry-After": "30" }
    });
  }

  const durationMs = performance.now() - startedAt;
  if (upstream.status === 404 || upstream.status === 410 || upstream.status === 401 || upstream.status === 403) {
    return new Response("Image not found", { status: 404, headers: mediaHeaders("not-public", durationMs) });
  }
  if (!upstream.ok || !upstream.body) {
    const fallback = upstream.status === 429 || upstream.status >= 500 ? await legacyFallback(fileId, durationMs) : null;
    if (fallback) return fallback;
    return new Response("Image source temporarily unavailable", {
      status: upstream.status === 429 ? 503 : 502,
      headers: { ...mediaHeaders("upstream-error", durationMs), "Retry-After": "30" }
    });
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return new Response("Invalid image response", { status: 502, headers: mediaHeaders("invalid-upstream-type", durationMs) });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);
  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) headers.set("Last-Modified", lastModified);
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  headers.set("X-PDCar-Image-Source", "erp-authority");
  headers.set("X-PDCar-Media-Outcome", "current");
  headers.set("Server-Timing", `erp-image;dur=${durationMs.toFixed(1)}`);
  return new Response(upstream.body, { headers });
}
