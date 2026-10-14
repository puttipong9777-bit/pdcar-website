import { requireAdminRequest, siteAdminEnabled } from "@/lib/admin-auth";
import { ArticleError, failure, json, sameOrigin } from "@/lib/article-approval/security";
import { vehicleImagesBucket } from "@/lib/cloudflare-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fileId = /^FILE-[A-Za-z0-9-]{1,96}$/;
const maxUploadBytes = 3 * 1024 * 1024;

function webp(bytes: Uint8Array) {
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function objectKey(target: string) {
  if (target === "site:logo") return "site/logo.webp";
  if (target === "site:storefront") return "site/storefront.webp";
  if (target.startsWith("vehicle:") && fileId.test(target.slice(8))) return `${target.slice(8)}.webp`;
  throw new ArticleError("invalid_media_target");
}

export async function POST(request: Request) {
  try {
    if (!siteAdminEnabled()) throw new ArticleError("disabled", 503);
    sameOrigin(request);
    await requireAdminRequest(request);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new ArticleError("invalid_content_type", 415);
    if (Number(request.headers.get("content-length")) > maxUploadBytes + 16_384) throw new ArticleError("body_too_large", 413);
    const form = await request.formData();
    const target = form.get("target");
    const upload = form.get("image");
    if (typeof target !== "string" || !(upload instanceof File)) throw new ArticleError("invalid_upload");
    if (upload.size < 100 || upload.size > maxUploadBytes || upload.type !== "image/webp") throw new ArticleError("invalid_image");
    const bytes = new Uint8Array(await upload.arrayBuffer());
    if (!webp(bytes)) throw new ArticleError("invalid_image");
    const bucket = await vehicleImagesBucket();
    if (!bucket) throw new ArticleError("media_storage_unavailable", 503);
    const key = objectKey(target);
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=60, must-revalidate" },
      customMetadata: { updatedAt: new Date().toISOString() }
    });
    const publicPath = key.startsWith("site/") ? `/media/site/${key.slice(5, -5)}` : `/media/vehicle-images/${key.slice(0, -5)}`;
    return json({ ok: true, path: `${publicPath}?v=${Date.now()}` });
  } catch (error) {
    return failure(error);
  }
}
