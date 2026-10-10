import { verifyAdminToken } from "@/lib/article-approval/line";
import { ArticleError, enabled, failure, json, readBody, sameOrigin, uuid } from "@/lib/article-approval/security";
import { decide, listAdminArticles, runDaily, sendDeliveries } from "@/lib/article-approval/workflow";
import type { Decision } from "@/lib/article-approval/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    if (!enabled()) throw new ArticleError("disabled", 503);
    sameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ArticleError("invalid_content_type", 415);
    let body;
    try { body = JSON.parse(await readBody(request)); } catch (error) {
      if (error instanceof ArticleError) throw error;
      throw new ArticleError("invalid_json");
    }
    if (!body || typeof body !== "object") throw new ArticleError("invalid_body");
    const bearer = request.headers.get("authorization") || "";
    if (!bearer.startsWith("Bearer ")) throw new ArticleError("unauthorized", 401);
    const actor = await verifyAdminToken(bearer.slice(7));
    // Manual tests/recovery use the same verified admin identity and daily lock.
    // No cron credentials are ever exposed to the browser.
    if (body.operation === "generate") {
      const result = await runDaily();
      return json(result, result.delivery.failed ? 502 : 200);
    }
    if (body.operation === "retry-deliveries") {
      const result = await sendDeliveries();
      return json(result, result.failed ? 502 : 200);
    }
    if (body.operation === "list") {
      const page = body.page ?? 1;
      if (!Number.isInteger(page) || page < 1 || page > 10000) throw new ArticleError("invalid_page");
      return json({ articles: await listAdminArticles(body.articleId ? uuid(body.articleId) : undefined, page) });
    }
    const actions: Decision[] = ["approve", "reject", "unpublish", "republish", "delete"];
    if (body.operation !== "decide" || !actions.includes(body.action) || !Number.isInteger(body.version) || body.version < 1) throw new ArticleError("invalid_decision");
    const id = uuid(body.articleId);
    const result = await decide(id, actor, body.action, body.version, `liff:${uuid(body.requestId)}`);
    return json(result, result.result === "not_found" ? 404 : result.result === "conflict" ? 409 : 200);
  } catch (error) { return failure(error); }
}
