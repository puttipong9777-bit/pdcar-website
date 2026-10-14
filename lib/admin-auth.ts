import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { verifyAdminToken } from "@/lib/article-approval/line";
import { ArticleError, enabled } from "@/lib/article-approval/security";

const cookieName = "pdcar_admin_session";
const sessionSeconds = 12 * 60 * 60;

function equal(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new ArticleError("admin_not_configured", 503);
  return secret;
}
function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}
function cookieValue(request: Request) {
  const header = request.headers.get("cookie") || "";
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
}

export function siteAdminEnabled() {
  return process.env.SITE_ADMIN_ENABLED === "true"
    && Boolean(process.env.ADMIN_PASSWORD_HASH?.trim())
    && Boolean(process.env.ADMIN_SESSION_SECRET?.trim());
}

export function verifyAdminPassword(password: unknown) {
  if (typeof password !== "string" || password.length < 20 || password.length > 200) return false;
  const configured = process.env.ADMIN_PASSWORD_HASH?.trim() || "";
  const [salt, expected, extra] = configured.split(":");
  if (!salt || !expected || extra || !/^[A-Za-z0-9_-]{16,}$/.test(salt) || !/^[A-Za-z0-9_-]{40,}$/.test(expected)) {
    throw new ArticleError("admin_not_configured", 503);
  }
  // The deployed password is randomly generated with high entropy, so a fast hash
  // avoids turning the public login endpoint into a Worker CPU exhaustion vector.
  const actual = createHash("sha256").update(salt).update(password).digest("base64url");
  return equal(actual, expected);
}

export function createAdminSession() {
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const payload = String(expires);
  return `${payload}.${sign(payload)}`;
}

export function hasAdminSession(request: Request) {
  const token = cookieValue(request);
  if (!token) return false;
  const [expires, signature, extra] = token.split(".");
  if (!expires || !signature || extra || !/^\d+$/.test(expires) || Number(expires) <= Date.now() / 1000) return false;
  return equal(sign(expires), signature);
}

export function adminSessionCookie(value: string, maxAge = sessionSeconds) {
  return `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export async function requireAdminRequest(request: Request) {
  if (siteAdminEnabled() && hasAdminSession(request)) return "site-admin";
  if (enabled()) {
    const bearer = request.headers.get("authorization") || "";
    if (bearer.startsWith("Bearer ")) return verifyAdminToken(bearer.slice(7));
  }
  throw new ArticleError("unauthorized", 401);
}
