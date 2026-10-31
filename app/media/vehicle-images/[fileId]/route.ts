import { getPublicVehicleImageMembership } from "@/lib/public-vehicle-image";

const FILE_ID = /^FILE-[A-Za-z0-9-]{1,96}$/;
const ERP_ORIGIN = (process.env.NEXT_PUBLIC_ERP_URL || "https://pdcar-erp-history.onrender.com").replace(/\/$/, "");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const dynamic = "force-dynamic";

function timeoutMs() {
  const configured = Number(process.env.VEHICLE_MEDIA_TIMEOUT_MS);
  return Number.isFinite(configured) ? Math.min(10_000, Math.max(250, configured)) : 5_000;
}

function mediaHeaders(outcome: string, durationMs: number, membershipDurationMs: number) {
  return {
    "Cache-Control": "no-store",
    "X-PDCar-Media-Outcome": outcome,
    "Server-Timing": `public-inventory;dur=${membershipDurationMs.toFixed(1)}, erp-image;dur=${durationMs.toFixed(1)}`
  };
}

function isTimeout(error: unknown, signal: AbortSignal) {
  return signal.aborted || (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError"));
}

class ImageBodyTooLargeError extends Error {
  constructor() {
    super("image_body_too_large");
    this.name = "ImageBodyTooLargeError";
  }
}

async function readBoundedImageBody(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) throw new ImageBodyTooLargeError();
      chunks.push(value);
    }
  } catch (error) {
    try { await reader.cancel(); } catch {}
    throw error;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!FILE_ID.test(fileId)) return new Response("Invalid image identifier", { status: 400 });

  const membershipStartedAt = performance.now();
  const membership = await getPublicVehicleImageMembership(fileId);
  const membershipDurationMs = performance.now() - membershipStartedAt;
  if (membership.status === "not_listed") {
    return new Response("Image not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "X-PDCar-Media-Outcome": "not-listed",
        "Server-Timing": `public-inventory;dur=${membershipDurationMs.toFixed(1)}`
      }
    });
  }
  if (membership.status === "unavailable") {
    return new Response("Image membership temporarily unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": "30",
        "X-PDCar-Media-Outcome": "membership-unavailable",
        "Server-Timing": `public-inventory;dur=${membershipDurationMs.toFixed(1)}`
      }
    });
  }

  const startedAt = performance.now();
  const signal = AbortSignal.timeout(timeoutMs());
  let upstream: Response;
  try {
    upstream = await fetch(`${ERP_ORIGIN}/api/public/vehicle-images/${encodeURIComponent(fileId)}`, {
      cache: "no-store",
      headers: { Accept: "image/avif,image/webp,image/*" },
      signal
    });
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    const timedOut = isTimeout(error, signal);
    return new Response("Image source temporarily unavailable", {
      status: timedOut ? 504 : 502,
      headers: { ...mediaHeaders(timedOut ? "timeout" : "network-error", durationMs, membershipDurationMs), "Retry-After": "30" }
    });
  }

  if (upstream.status === 404 || upstream.status === 410 || upstream.status === 401 || upstream.status === 403) {
    return new Response("Image not found", { status: 404, headers: mediaHeaders("not-public", performance.now() - startedAt, membershipDurationMs) });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("Image source temporarily unavailable", {
      status: upstream.status === 429 ? 503 : 502,
      headers: { ...mediaHeaders("upstream-error", performance.now() - startedAt, membershipDurationMs), "Retry-After": "30" }
    });
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    try { await upstream.body.cancel(); } catch {}
    return new Response("Invalid image response", { status: 502, headers: mediaHeaders("invalid-upstream-type", performance.now() - startedAt, membershipDurationMs) });
  }

  const declaredLength = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    try { await upstream.body.cancel(); } catch {}
    return new Response("Image response too large", { status: 502, headers: mediaHeaders("body-too-large", performance.now() - startedAt, membershipDurationMs) });
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readBoundedImageBody(upstream.body);
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    if (error instanceof ImageBodyTooLargeError) {
      return new Response("Image response too large", { status: 502, headers: mediaHeaders("body-too-large", durationMs, membershipDurationMs) });
    }
    const timedOut = isTimeout(error, signal);
    return new Response("Image source temporarily unavailable", {
      status: timedOut ? 504 : 502,
      headers: { ...mediaHeaders(timedOut ? "body-timeout" : "body-stream-error", durationMs, membershipDurationMs), "Retry-After": "30" }
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(bytes.byteLength));
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);
  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) headers.set("Last-Modified", lastModified);
  headers.set("Cache-Control", "public, max-age=60, must-revalidate");
  headers.set("X-PDCar-Image-Source", "erp-authority");
  headers.set("X-PDCar-Media-Outcome", "current");
  headers.set("Server-Timing", `public-inventory;dur=${membershipDurationMs.toFixed(1)}, erp-image;dur=${(performance.now() - startedAt).toFixed(1)}`);
  return new Response(bytes, { headers });
}
