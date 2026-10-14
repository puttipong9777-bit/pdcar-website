import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const password = "test-admin-password-123";
const salt = randomBytes(18).toString("base64url");
const hash = createHash("sha256").update(salt).update(password).digest("base64url");
const env = { SITE_ADMIN_ENABLED: "true", ADMIN_PASSWORD_HASH: `${salt}:${hash}`, ADMIN_SESSION_SECRET: "s".repeat(48), ARTICLE_APPROVAL_ENABLED: "false" };
const auth = loadTs("lib/admin-auth.ts", { "@/lib/article-approval/line": { verifyAdminToken: async () => { throw new Error("unused"); } } }, { process: { env } });

test("admin password is verified from a derived hash, never a browser-visible value", () => {
  assert.equal(auth.siteAdminEnabled(), true);
  assert.equal(auth.verifyAdminPassword(password), true);
  assert.equal(auth.verifyAdminPassword("wrong-password-123456"), false);
  assert.equal(auth.verifyAdminPassword("short"), false);
});

test("admin session cookies are signed, expiring, HttpOnly, Secure and SameSite strict", () => {
  const token = auth.createAdminSession();
  const cookie = auth.adminSessionCookie(token);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/);
  assert.equal(auth.hasAdminSession(new Request("https://www.pdcarcenter.com/admin", { headers: { cookie } })), true);
  const tampered = `${token.slice(0, -1)}${token.endsWith("x") ? "y" : "x"}`;
  assert.equal(auth.hasAdminSession(new Request("https://www.pdcarcenter.com/admin", { headers: { cookie: auth.adminSessionCookie(tampered) } })), false);
});
