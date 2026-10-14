import { createHmac, timingSafeEqual } from "node:crypto";

export class ArticleError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new ArticleError(`missing_${name}`, 503);
  return value;
}
export function enabled() { return process.env.ARTICLE_APPROVAL_ENABLED === "true"; }
export function constantEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function verifyLineSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  return constantEqual(createHmac("sha256", secret).update(rawBody, "utf8").digest("base64"), signature);
}
export function requireCron(request: Request) {
  const secret = required("CRON_SECRET");
  if (secret.length < 32 || !constantEqual(request.headers.get("authorization") || "", `Bearer ${secret}`)) {
    throw new ArticleError("unauthorized", 401);
  }
}
export function adminIds() {
  const ids = [...new Set(required("ARTICLE_LINE_ADMIN_IDS").split(",").map((id) => id.trim()).filter(Boolean))];
  if (!ids.length || ids.length > 10 || ids.some((id) => !/^U[0-9a-f]{32}$/i.test(id))) throw new ArticleError("invalid_admin_ids", 503);
  return ids;
}
export function requireAdmin(id: string) {
  if (!adminIds().includes(id)) throw new ArticleError("forbidden", 403);
  return id;
}
export function bangkokDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ArticleError("invalid_id");
  return value;
}
export function articleOrigin() {
  const configured = process.env.ARTICLE_SITE_URL?.trim() || process.env.ADMIN_SITE_URL?.trim();
  if (!configured) throw new ArticleError("missing_site_url", 503);
  const url = new URL(configured);
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.hostname === "localhost"))) {
    throw new ArticleError("invalid_site_url", 503);
  }
  return url.origin;
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== articleOrigin()) throw new ArticleError("invalid_origin", 403);
}
export async function readBody(request: Request, limit = 16_384) {
  if (Number(request.headers.get("content-length")) > limit) throw new ArticleError("body_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ArticleError("body_too_large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
export function failure(error: unknown) {
  // Never log provider responses, credentials, ID tokens, LINE IDs, or draft text.
  const known = error instanceof ArticleError;
  console.error("article_approval", known ? error.code : "internal_error");
  return json({ error: known ? error.code : "internal_error" }, known ? error.status : 500);
}
