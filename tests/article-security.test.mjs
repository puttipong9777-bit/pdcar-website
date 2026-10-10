import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import { loadTs } from "./helpers/load-ts.mjs";

const admin = `U${"a".repeat(32)}`;
const env = { CRON_SECRET: "x".repeat(32), ARTICLE_LINE_ADMIN_IDS: admin, ARTICLE_LINE_CHANNEL_SECRET: "test-channel-secret",
  ARTICLE_LINE_BOT_USER_ID: "bot-id", ARTICLE_SITE_URL: "https://www.pdcarcenter.com", ARTICLE_LINE_LOGIN_CHANNEL_ID: "123",
  ARTICLE_LIFF_ID: "123-abc", ARTICLE_APPROVAL_ENABLED: "true" };
const globals = { process: { env }, console: { error() {} } };
const security = loadTs("lib/article-approval/security.ts", {}, globals);
const webhook = loadTs("lib/article-approval/webhook.ts", {}, globals);
const sign = (text) => createHmac("sha256", env.ARTICLE_LINE_CHANNEL_SECRET).update(text).digest("base64");
const id = randomUUID();
const event = { type: "postback", webhookEventId: "01EVENT", source: { type: "user", userId: admin }, postback: { data: `pdarticle:${id}:1:approve` } };

test("Bangkok date changes at 17:00 UTC, not midnight UTC", () => {
  assert.equal(security.bangkokDay(new Date("2026-09-08T16:59:59Z")), "2026-09-08");
  assert.equal(security.bangkokDay(new Date("2026-09-08T17:00:00Z")), "2026-09-09");
  assert.equal(security.bangkokDay(new Date("2026-09-08T12:00:00Z")), "2026-09-08");
});
test("cron fails closed for missing, short and wrong secrets", () => {
  assert.throws(() => security.requireCron(new Request("https://example.org")));
  assert.throws(() => security.requireCron(new Request("https://example.org", { headers: { authorization: "Bearer wrong" } })));
  security.requireCron(new Request("https://example.org", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } }));
  const unconfigured = loadTs("lib/article-approval/security.ts", {}, { process: { env: {} } });
  assert.throws(() => unconfigured.requireCron(new Request("https://example.org")));
});
test("LINE HMAC requires exact raw bytes and verifies before parsing", () => {
  const raw = JSON.stringify({ destination: "bot-id", events: [event], thai: "ทดสอบ" });
  assert.equal(webhook.verifiedPostbacks(raw, sign(raw))[0].actor, admin);
  assert.throws(() => webhook.verifiedPostbacks(`${raw} `, sign(raw)), /invalid_line_signature/);
  assert.throws(() => webhook.verifiedPostbacks("not json", null), /invalid_line_signature/);
  assert.throws(() => webhook.verifiedPostbacks(raw, "x"), /invalid_line_signature/);
});
test("customer messages, other postbacks, groups and non-admin users produce no decision", () => {
  const raw = JSON.stringify({ destination: "bot-id", events: [
    { type: "message", message: { text: "อนุมัติ" } },
    { ...event, source: { type: "user", userId: `U${"b".repeat(32)}` } },
    { ...event, source: { type: "group", userId: admin } },
    { ...event, postback: { data: "other-bot-action" } },
  ] });
  assert.deepEqual(webhook.verifiedPostbacks(raw, sign(raw)), []);
});
test("signed callbacks for another OA are rejected; LINE verify event is accepted", () => {
  const wrong = JSON.stringify({ destination: "other-bot", events: [event] });
  assert.throws(() => webhook.verifiedPostbacks(wrong, sign(wrong)), /invalid_line_events/);
  const empty = JSON.stringify({ destination: "bot-id", events: [] });
  assert.deepEqual(webhook.verifiedPostbacks(empty, sign(empty)), []);
});
test("stream size limits also work without Content-Length", async () => {
  await assert.rejects(() => security.readBody(new Request("https://example.org", { method: "POST", body: "x".repeat(40) }), 30), /body_too_large/);
});
test("LIFF server verifies token with LINE and rejects spoofed, expired or non-admin identities", async () => {
  let identity = { iss: "https://access.line.me", aud: "123", exp: Date.now() / 1000 + 300, sub: admin };
  let calls = 0;
  const line = loadTs("lib/article-approval/line.ts", {}, { ...globals, fetch: async (url, init) => {
    calls++; assert.equal(url, "https://api.line.me/oauth2/v2.1/verify");
    assert.equal(init.body.get("client_id"), "123");
    return Response.json(identity);
  } });
  assert.equal(await line.verifyAdminToken("signed-token"), admin);
  identity = { ...identity, sub: `U${"b".repeat(32)}` };
  await assert.rejects(() => line.verifyAdminToken("signed-token"), /forbidden/);
  identity = { ...identity, sub: admin, aud: "wrong" };
  await assert.rejects(() => line.verifyAdminToken("signed-token"), /invalid_line_identity/);
  identity = { ...identity, aud: "123", exp: 1 };
  await assert.rejects(() => line.verifyAdminToken("signed-token"), /invalid_line_identity/);
  assert.equal(calls, 4);
});
test("LINE draft buttons use LIFF by default, include the complete body and never send chat messages", () => {
  const line = loadTs("lib/article-approval/line.ts", {}, globals);
  const article = { id, version: 1, content: { title: "ชื่อบทความ", description: "รายละเอียด", sections: [{ heading: "หัวข้อ", paragraphs: ["ก".repeat(4500)], factIds: [] }] }, sources: [] };
  const payload = line.lineDraftPayload(article, admin);
  assert.equal(payload.to, admin);
  assert(payload.messages.length <= 5);
  assert(payload.messages.filter((m) => m.type === "text").map((m) => m.text).join("").includes("ก".repeat(4500)));
  const actions = payload.messages.at(-1).template.actions;
  assert.equal(actions[0].type, "uri"); assert(actions[0].uri.startsWith("https://liff.line.me/123-abc?"));
  assert.equal(actions[0].label, "อนุมัติโพสต์"); assert.equal(actions[1].label, "ไม่อนุมัติ");
});
test("LINE 409 is successful only with accepted request ID, reuses the persisted retry key", async () => {
  let accepted = true;
  const line = loadTs("lib/article-approval/line.ts", {}, { ...globals,
    process: { env: { ...env, ARTICLE_LINE_CHANNEL_ACCESS_TOKEN: "test-token" } },
    fetch: async (_url, init) => { assert.equal(init.headers["X-Line-Retry-Key"], id); return new Response(null, { status: 409, headers: accepted ? { "x-line-accepted-request-id": "accepted" } : {} }); },
  });
  await line.pushDraft({}, id); accepted = false;
  await assert.rejects(() => line.pushDraft({}, id), /line_push_failed/);
});
test("admin route verifies origin and LINE identity before touching the database", async () => {
  let writes = 0; let verified = 0;
  const route = loadTs("app/api/article-approval/admin/route.ts", {
    "@/lib/article-approval/line": { verifyAdminToken: async () => { verified++; return admin; } },
    "@/lib/article-approval/workflow": { decide: async (_id, actor) => { assert.equal(actor, admin); writes++; return { result: "applied" }; } },
  }, globals);
  const call = (origin, auth = "Bearer real-token", override = {}) => route.POST(new Request("https://www.pdcarcenter.com/api/article-approval/admin", {
    method: "POST", headers: { origin, authorization: auth, "content-type": "application/json" },
    body: JSON.stringify({ operation: "decide", articleId: id, version: 1, action: "approve", requestId: randomUUID(), actor: "forged", ...override }),
  }));
  assert.equal((await call("https://evil.example")).status, 403); assert.equal(writes, 0); assert.equal(verified, 0);
  assert.equal((await call(env.ARTICLE_SITE_URL, "")).status, 401); assert.equal(writes, 0);
  assert.equal((await call(env.ARTICLE_SITE_URL)).status, 200); assert.equal(writes, 1);
  assert.equal((await call(env.ARTICLE_SITE_URL, "Bearer real-token", { action: "anything" })).status, 400); assert.equal(writes, 1);
});
test("new callback route is disabled by default, does not process or reply to existing chats", async () => {
  let calls = 0;
  const route = loadTs("app/api/article-approval/line-callback/route.ts", {
    "@/lib/article-approval/workflow": { decide: async () => { calls++; } },
  }, globals);
  assert.equal((await route.POST(new Request("https://example.org", { method: "POST", body: "{}" }))).status, 404);
  assert.equal(calls, 0);
});

test("scheduled generation is independently disabled while authenticated manual testing works", async () => {
  let calls = 0;
  const cronEnv = { ...env, ARTICLE_DAILY_CRON_ENABLED: "false" };
  const route = loadTs("app/api/cron/article-drafts/route.ts", {
    "@/lib/article-approval/workflow": { runDaily: async () => { calls++; return { delivery: { failed: 0 } }; } },
  }, { ...globals, process: { env: cronEnv } });
  const request = () => new Request("https://example.org", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
  assert.equal((await (await route.GET(request())).json()).status, "schedule_disabled"); assert.equal(calls, 0);
  assert.equal((await route.POST(request())).status, 200); assert.equal(calls, 1);
  cronEnv.ARTICLE_DAILY_CRON_ENABLED = "true";
  assert.equal((await route.GET(request())).status, 200); assert.equal(calls, 2);
  assert.equal((await route.POST(new Request("https://example.org"))).status, 401); assert.equal(calls, 2);
});

test("manual admin generation and delivery retry require LINE identity and same origin", async () => {
  let generated = 0; let retried = 0;
  const route = loadTs("app/api/article-approval/admin/route.ts", {
    "@/lib/article-approval/line": { verifyAdminToken: async (token) => { if (token !== "valid") throw new security.ArticleError("forbidden", 403); return admin; } },
    "@/lib/article-approval/workflow": {
      runDaily: async () => { generated++; return { delivery: { failed: 0 } }; },
      sendDeliveries: async () => { retried++; return { failed: 0 }; },
    },
  }, globals);
  const request = (operation, token = "valid", origin = env.ARTICLE_SITE_URL) => new Request(`${env.ARTICLE_SITE_URL}/api/article-approval/admin`, {
    method: "POST", headers: { origin, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ operation }),
  });
  assert.equal((await route.POST(request("generate", "valid", "https://evil.example"))).status, 403);
  assert.notEqual((await route.POST(request("generate", "invalid"))).status, 200);
  assert.equal(generated, 0);
  assert.equal((await route.POST(request("generate"))).status, 200); assert.equal(generated, 1);
  assert.equal((await route.POST(request("retry-deliveries"))).status, 200); assert.equal(retried, 1);
});
