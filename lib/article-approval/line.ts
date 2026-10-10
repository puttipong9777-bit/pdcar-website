import "server-only";
import { ArticleError, adminIds, articleOrigin, required, requireAdmin } from "./security";
import type { Article, Decision } from "./types";

export async function verifyAdminToken(idToken: string) {
  if (!idToken || idToken.length > 8192) throw new ArticleError("unauthorized", 401);
  const channelId = required("ARTICLE_LINE_LOGIN_CHANNEL_ID");
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!response.ok) throw new ArticleError("invalid_line_identity", 401);
  const identity = await response.json();
  if (identity.iss !== "https://access.line.me" || identity.aud !== channelId || typeof identity.exp !== "number" || identity.exp <= Date.now() / 1000 || typeof identity.sub !== "string") throw new ArticleError("invalid_line_identity", 401);
  return requireAdmin(identity.sub);
}
export function liffId() {
  const id = required("ARTICLE_LIFF_ID");
  if (!/^\d+-[A-Za-z0-9]+$/.test(id)) throw new ArticleError("invalid_liff_id", 503);
  return id;
}
export function lineDraftPayload(article: Article, recipient: string) {
  if (!article.content) throw new ArticleError("missing_content");
  const c = article.content;
  const makeAction = (action: Decision, label: string) => {
    if (process.env.ARTICLE_LINE_POSTBACK_ENABLED === "true") {
      return { type: "postback", label, data: `pdarticle:${article.id}:${article.version}:${action}` };
    }
    return { type: "uri", label, uri: `https://liff.line.me/${liffId()}?article=${article.id}&action=${action}` };
  };
  const text = ["ร่างบทความ • รอผู้ดูแลตรวจ", c.title, c.description,
    ...c.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    "แหล่งข้อมูล", ...article.sources.map((s) => `${s.title}\n${s.url}`),
    "โปรดอ่านเนื้อหาและตรวจแหล่งข้อมูลก่อนอนุมัติ"].join("\n\n");
  // Full draft, not only an excerpt. LINE allows up to 5 messages per push.
  const chunks: string[] = [];
  for (let i = 0; i < text.length;) {
    let end = Math.min(i + 4500, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    chunks.push(text.slice(i, end)); i = end;
  }
  if (chunks.length > 4) throw new ArticleError("draft_too_long");
  return { to: recipient, messages: [
    ...chunks.map((chunk) => ({ type: "text", text: chunk })),
    { type: "template", altText: "ตรวจและอนุมัติบทความ PD Car Center", template: {
      type: "buttons", text: "ตรวจร่างแล้วเลือกผลการอนุมัติ", actions: [
        makeAction("approve", "อนุมัติโพสต์"), makeAction("reject", "ไม่อนุมัติ"),
        { type: "uri", label: "จัดการบทความ", uri: `https://liff.line.me/${liffId()}?article=${article.id}` },
      ],
    } },
  ] };
}
export function generationConfig() {
  required("OPENAI_API_KEY"); required("ARTICLE_OPENAI_MODEL"); required("ARTICLE_DATABASE_URL");
  required("ARTICLE_LINE_CHANNEL_ACCESS_TOKEN"); required("ARTICLE_LINE_LOGIN_CHANNEL_ID");
  articleOrigin(); liffId();
  if (process.env.ARTICLE_LINE_POSTBACK_ENABLED === "true") { required("ARTICLE_LINE_CHANNEL_SECRET"); required("ARTICLE_LINE_BOT_USER_ID"); }
  return adminIds();
}
export async function pushDraft(payload: unknown, retryKey: string) {
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${required("ARTICLE_LINE_CHANNEL_ACCESS_TOKEN")}`, "Content-Type": "application/json", "X-Line-Retry-Key": retryKey },
    body: JSON.stringify(payload),
  });
  // 409 means success only if LINE identifies an already accepted request.
  if (response.ok || (response.status === 409 && response.headers.get("x-line-accepted-request-id"))) return;
  throw new ArticleError("line_push_failed", 502);
}
