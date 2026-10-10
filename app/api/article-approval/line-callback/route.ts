import { enabled, failure, json, readBody } from "@/lib/article-approval/security";
import { verifiedPostbacks } from "@/lib/article-approval/webhook";
import { decide } from "@/lib/article-approval/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  // Reserved integration point, disabled unless a pre-existing raw-body relay is verified.
  // Do NOT point the shop's Messaging API webhook URL at this route.
  if (!enabled() || process.env.ARTICLE_LINE_POSTBACK_ENABLED !== "true") return json({ error: "disabled" }, 404);
  try {
    const decisions = verifiedPostbacks(await readBody(request, 256_000), request.headers.get("x-line-signature"));
    for (const event of decisions) await decide(event.id, event.actor, event.action, event.version, event.eventId);
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
