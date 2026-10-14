import { imageResponse, vehicleImagesBucket } from "@/lib/cloudflare-media";

const FILE_ID = /^FILE-[A-Za-z0-9-]{1,96}$/;
const ERP_ORIGIN = (process.env.NEXT_PUBLIC_ERP_URL || "https://pdcar-erp-history.onrender.com").replace(/\/$/, "");

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!FILE_ID.test(fileId)) return new Response("Invalid image identifier", { status: 400 });

  const bucket = await vehicleImagesBucket();
  const object = await bucket?.get(`${fileId}.webp`);
  if (object) return imageResponse(object);

  const upstream = await fetch(`${ERP_ORIGIN}/api/public/vehicle-images/${encodeURIComponent(fileId)}`, {
    headers: { Accept: "image/avif,image/webp,image/*" }
  });
  if (!upstream.ok || !upstream.body) return new Response("Image not found", { status: upstream.status === 404 ? 404 : 502 });

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "image/jpeg");
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  headers.set("X-PDCar-Image-Source", "render-fallback");
  return new Response(upstream.body, { headers });
}
