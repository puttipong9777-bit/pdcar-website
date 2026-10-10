import { ArticleError, requireAdmin, required, uuid, verifyLineSignature } from "./security";
import type { Decision } from "./types";

export type PostbackDecision = { id: string; actor: string; action: Decision; version: number; eventId: string };
export function verifiedPostbacks(raw: string, signature: string | null): PostbackDecision[] {
  // Verify exact original bytes BEFORE JSON parsing. Never reserialize upstream.
  if (!verifyLineSignature(raw, signature, required("ARTICLE_LINE_CHANNEL_SECRET"))) throw new ArticleError("invalid_line_signature", 401);
  let body;
  try { body = JSON.parse(raw); } catch { throw new ArticleError("invalid_json"); }
  if (!body || body.destination !== required("ARTICLE_LINE_BOT_USER_ID") || !Array.isArray(body.events) || body.events.length > 100) throw new ArticleError("invalid_line_events");
  const result: PostbackDecision[] = [];
  for (const event of body.events) {
    if (event?.type !== "postback" || typeof event.postback?.data !== "string" || !event.postback.data.startsWith("pdarticle:")) continue;
    // No replies or processing for customer chats, groups, or other bot features.
    if (event.source?.type !== "user" || typeof event.source.userId !== "string") continue;
    try { requireAdmin(event.source.userId); } catch (error) {
      if (error instanceof ArticleError && error.status === 403) continue;
      throw error;
    }
    const match = /^pdarticle:([0-9a-f-]{36}):([1-9]\d{0,8}):(approve|reject)$/.exec(event.postback.data);
    if (!match || typeof event.webhookEventId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(event.webhookEventId)) continue;
    result.push({ id: uuid(match[1]), actor: event.source.userId, version: Number(match[2]), action: match[3] as Decision, eventId: `line:${event.webhookEventId}` });
  }
  return result;
}
